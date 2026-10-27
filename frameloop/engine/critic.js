import fs from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';
import { CATEGORIES } from './grade.js';

const CAT_KEYS = Object.keys(CATEGORIES);

export const CRITIQUE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['scores', 'issues', 'keep', 'summary'],
  properties: {
    scores: {
      type: 'object',
      additionalProperties: false,
      required: CAT_KEYS,
      properties: Object.fromEntries(CAT_KEYS.map((k) => [k, { type: 'integer', description: `0-10. ${CATEGORIES[k].ask}` }])),
    },
    issues: {
      type: 'array',
      description: 'Every concrete problem, worst first.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'category', 'frames', 'problem', 'fix'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          category: { type: 'string', enum: CAT_KEYS },
          frames: { type: 'array', items: { type: 'integer' }, description: 'Frame numbers where it is visible.' },
          problem: { type: 'string', description: 'What is wrong, observed in the frames, specific.' },
          fix: { type: 'string', description: 'A specific, implementable change (values, timings in beats, spring preset, layout).' },
        },
      },
    },
    keep: { type: 'array', items: { type: 'string' }, description: 'What works and must survive the next revision.' },
    summary: { type: 'string', description: 'Two sentences: the verdict and the single most important change.' },
  },
};

const SYSTEM = `You are the critic in an automated motion-design render loop. A senior motion designer and an art director in one: exacting, specific, never flattering.

You judge one scene of a short launch film. Every scene is an HTML page rendered headlessly, frame by frame, and encoded to video. You see a contact sheet of evenly spaced frames (white numbers are frame indices), several full frames picked by the dead-frame hunter, and numeric measurements from ffmpeg.

Score each category 0-10 as an integer:
${CAT_KEYS.map((k) => `- ${k}: ${CATEGORIES[k].ask}`).join('\n')}

Calibration, applied strictly:
- 10: reference-grade work you would put in a studio reel. Rare.
- 8: a senior motion designer would ship this without changes. This is the bar to pass.
- 7: competent but generic, or one clear flaw.
- 5: works, but reads as template or AI-generated, or has visible craft problems.
- 3 or below: broken, empty, illegible.
Never give 8+ to a category with a visible flaw you could name. Do not inflate to be encouraging, and do not deflate to look rigorous: score what is in the frames.

Know the tells of AI-generated design and penalise them under originality unless the brief asks for them: warm cream backgrounds with a high-contrast serif and terracotta accent; near-black with a single acid-green or vermilion accent; broadsheet hairline-rule layouts; the SaaS-card kit (identical rounded cards, one radius everywhere, the same soft grey shadow, gradient washes); template chrome (tracked-out all-caps eyebrows, meta strings joined with middle dots, 'WORD — fragment' labels, monospace data labels, arrows appended to links); purple-indigo gradients; one accented word in a headline; fade-and-slide-up entrances on every element.

Motion craft you expect: springs with intent (snappy for hits, heavy for weight), staggered by meaning not by index, overshoot used rarely, one orchestrated moment per scene, accents locked to beats, deliberate holds long enough to read, nothing appearing without motion (pops), no spring tails crawling for seconds, no frame where nothing is happening unless it is a held beat.

Use the measurements: YDIF per frame is motion energy (mean absolute luma change, 0-255). "Pops" are one-frame spikes. "Still" runs are dead air. Onsets near beats show rhythm. Treat them as evidence, but your eyes on the frames decide.

Every issue needs frame numbers and a fix specific enough to implement directly: name the element, the spring preset or stiffness/damping, the beat, the size or colour value. The 'keep' list protects what already works from being destroyed by the next revision.`;

function imageBlock(file) {
  const data = fs.readFileSync(file).toString('base64');
  const media_type = file.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return { type: 'image', source: { type: 'base64', media_type, data } };
}

export function describeMeasurements(cfg, scene, analysis, lint, runtime) {
  const { dead, sync, profile } = analysis;
  const lines = [];
  lines.push(`Scene "${scene.id}": ${scene.beats} beats at ${cfg.bpm} BPM = ${scene.frames} frames at ${cfg.fps} fps (${scene.duration.toFixed(2)}s), ${cfg.width}x${cfg.height}.`);
  lines.push(`Beat frames: ${scene.beatFrames.join(', ')}.`);
  lines.push(`Mean motion energy per beat (YDIF): ${profile.join(', ')}.`);
  lines.push(`Motion onsets: ${sync.total}, of which ${sync.onBeat} within 2 frames of a beat (onset frames: ${sync.onsets.join(', ') || 'none'}).`);
  lines.push(dead.findings.length ? `Dead-frame hunter:\n${dead.findings.map((f) => `- [${f.level}] ${f.message}`).join('\n')}` : 'Dead-frame hunter: nothing flagged.');
  const l = [...lint.errors, ...lint.warnings, ...runtime.errors, ...runtime.warnings];
  lines.push(l.length ? `Linter/runtime findings:\n${l.map((f) => `- [${f.level}] ${f.rule}: ${f.message}`).join('\n')}` : 'Linter/runtime: clean.');
  if (runtime.fonts?.length) lines.push(`Fonts: ${runtime.fonts.map((f) => `${f.family} (${f.status})`).join(', ')}.`);
  return lines.join('\n');
}

export async function critiqueWithClaude({ cfg, scene, analysis, lint, runtime, sheet, evidence, previous }) {
  const client = new Anthropic({ maxRetries: 4 });
  const content = [];
  content.push({
    type: 'text',
    text: `Brief for this scene:\n${scene.brief}\n\nMeasurements:\n${describeMeasurements(cfg, scene, analysis, lint, runtime)}${
      previous ? `\n\nPrevious round on this scene scored ${previous.overall}. Revision notes from the designer: ${previous.changes?.join('; ') || 'n/a'}. Judge the frames in front of you, not the notes.` : ''
    }`,
  });
  content.push({ type: 'text', text: `Contact sheet: every ${sheet.step}th frame, frame numbers in white.` });
  content.push(imageBlock(sheet.file));
  for (const ev of evidence) {
    content.push({ type: 'text', text: `Frame ${ev.n} (t=${(ev.n / cfg.fps).toFixed(2)}s, beat ${((ev.n / cfg.fps - scene.beatOffset) / cfg.beatLen).toFixed(2)}). Picked because: ${ev.why}` });
    content.push(imageBlock(ev.file));
  }
  content.push({ type: 'text', text: 'Critique this scene. Return the JSON object only.' });

  const stream = client.messages.stream({
    model: cfg.ai.model,
    max_tokens: cfg.ai.maxTokens,
    thinking: { type: 'adaptive' },
    output_config: { effort: cfg.ai.effort, format: { type: 'json_schema', schema: CRITIQUE_SCHEMA } },
    system: SYSTEM,
    messages: [{ role: 'user', content }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'max_tokens') throw new Error('Critic hit max_tokens; raise ai.maxTokens.');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  const parsed = JSON.parse(text);
  return { ...parsed, source: 'claude', usage: msg.usage };
}

/**
 * Offline critic (--no-ai). It can only judge what ffmpeg and the linter can measure, so
 * typography, composition and colour stay unscored. Good for testing the pipeline, not for taste.
 */
export function critiqueHeuristic({ analysis, lint, runtime }) {
  const { dead, sync } = analysis;
  const pops = dead.findings.filter((f) => f.kind === 'pop');
  const offBeatPops = pops.filter((p) => !p.onBeat).length;
  const still = dead.findings.filter((f) => f.kind === 'frozen' || f.kind === 'crawl');
  const blank = dead.findings.filter((f) => f.kind === 'blank');
  const clamp = (x) => Math.max(0, Math.min(10, Math.round(x)));
  const scores = {
    motion: clamp(9 - 1.5 * offBeatPops - 0.5 * (pops.length - offBeatPops) - 0.5 * still.length),
    rhythm: clamp(5 + 4 * sync.ratio - 1.5 * still.filter((s) => s.level === 'error').length - 0.5 * still.filter((s) => s.level === 'warn').length),
    typography: null,
    composition: null,
    color: null,
    originality: clamp(9 - 0.75 * lint.warnings.length - 2 * lint.errors.filter((e) => /default-typeface|ai-gradient|stock-shadow/.test(e.rule)).length),
    polish: clamp(9 - 3 * Math.min(1, blank.length) - 2 * runtime.errors.length - (runtime.warnings.some((w) => w.rule === 'no-webfont') ? 2 : 0)),
  };
  const issues = dead.findings.map((f) => ({
    severity: f.level === 'error' ? 'major' : 'minor',
    category: f.kind === 'blank' ? 'polish' : f.kind === 'pop' ? 'motion' : 'rhythm',
    frames: f.frames,
    problem: f.message,
    fix: f.kind === 'pop' ? 'Give the element an entrance spring instead of switching it on in one frame.' : f.kind === 'blank' ? 'Make sure something meaningful is visible from the first frame.' : 'Fill the stretch with a deliberate secondary move, or shorten it to a held beat.',
  }));
  return { scores, issues, keep: [], summary: 'Heuristic critique (no vision): measures motion, rhythm and lint only.', source: 'heuristic' };
}
