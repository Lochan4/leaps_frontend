import fs from 'node:fs';
import path from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { ROOT } from './config.js';
import { extractParts } from './lint.js';

const FIX_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['changes', 'html'],
  properties: {
    changes: { type: 'array', items: { type: 'string' }, description: 'One line per change made, mapped to the issue it fixes.' },
    html: { type: 'string', description: 'The complete revised scene file, from <!doctype html> to </html>.' },
  },
};

const SYSTEM = `You are the designer-engineer in an automated motion-design render loop. You revise one HTML scene so the next render scores at least 8/10 with the critic.

The scene contract (non-negotiable):
- The scene imports from "../engine/motion.js" and calls defineScene({ setup?, render(t, ctx) }).
- render(t, ctx) must be a PURE function of t: every animated property is computed from t on every call. No accumulated state, no reading previous values, no timers. The loop renders frames out of order and re-renders single frames.
- Motion comes from closed-form springs: spring(), springAt(t, start, preset), presets.snappy/gentle/bouncy/heavy, or {stiffness, damping, mass}. Use ctx.beatAt(n) to place accents on beats.
- Banned (the linter fails the scene): CSS transition/animation/@keyframes, element.animate(), setTimeout/setInterval/requestAnimationFrame, Date.now/performance.now, default typefaces as the first font-family (Inter, Roboto, Arial, Helvetica, system-ui...), stock soft shadows like rgba(0,0,0,.1), purple-indigo gradients, external URLs, placeholder copy.
- Assets must be local files that already exist. Do not invent new asset paths.
- The stage is designed at 1920x1080; keep the existing scaling approach so draft renders work.
- You may only change this HTML file. Linked files are shown read-only; override them in this file's <style> if needed.

How to revise:
- Fix issues in order of severity. Make each fix concrete in code: real values, real beats.
- Protect everything in the critic's "keep" list.
- Prefer subtraction: remove the decoration that is not earning its place before adding anything.
- Stay inside the brief. Do not restart the design from scratch unless the critic says the concept itself fails.
- Avoid the generated-design defaults (cream + terracotta, near-black + acid accent, broadsheet rules, SaaS cards, caps eyebrows, middle-dot meta, arrows on links, one accented word, fade-up on everything).
Return the complete file.`;

export async function reviseScene({ cfg, scene, source, critique, graded, measurements, sheetFile, rejected = [] }) {
  const client = new Anthropic({ maxRetries: 4 });
  const htmlPath = path.join(ROOT, scene.file);
  const parts = extractParts(htmlPath, source);
  const linked = parts.css.filter((c) => c.linked).map((c) => `--- ${path.relative(ROOT, c.file)} (read-only) ---\n${fs.readFileSync(c.file, 'utf8')}`);
  const motionSrc = fs.readFileSync(path.join(ROOT, 'engine', 'motion.js'), 'utf8');

  const text = [
    `Brief: ${scene.brief}`,
    `Timing: ${scene.beats} beats at ${cfg.bpm} BPM, ${scene.duration.toFixed(3)}s, ${scene.frames} frames at ${cfg.fps} fps. Beat frames: ${scene.beatFrames.join(', ')}.`,
    `Current graded score: ${graded.overall}/10 (threshold ${cfg.threshold}). Gates: ${graded.gates.join('; ') || 'none'}.`,
    `Critic scores: ${JSON.stringify(critique.scores)}`,
    `Critic summary: ${critique.summary}`,
    `Issues:\n${critique.issues.map((i, k) => `${k + 1}. [${i.severity}/${i.category}] frames ${i.frames.join(',')}: ${i.problem}\n   fix: ${i.fix}`).join('\n')}`,
    `Keep:\n${critique.keep.map((k) => `- ${k}`).join('\n') || '- (nothing listed)'}`,
    `Measurements:\n${measurements}`,
    rejected.length ? `Earlier revisions that scored WORSE and were rolled back (do not repeat them):\n${rejected.map((r) => `- scored ${r.overall}: ${r.changes.join('; ')}`).join('\n')}` : '',
    `--- engine/motion.js (API reference, read-only) ---\n${motionSrc}`,
    ...linked,
    `--- ${scene.file} (the file you are revising) ---\n${source}`,
  ].filter(Boolean).join('\n\n');

  const stream = client.messages.stream({
    model: cfg.ai.model,
    max_tokens: cfg.ai.maxTokens,
    thinking: { type: 'adaptive' },
    output_config: { effort: cfg.ai.effort, format: { type: 'json_schema', schema: FIX_SCHEMA } },
    system: SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Contact sheet of the current render (frame numbers in white):' },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: fs.readFileSync(sheetFile).toString('base64') } },
        { type: 'text', text },
      ],
    }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'max_tokens') throw new Error('Fixer hit max_tokens; raise ai.maxTokens.');
  const out = JSON.parse(msg.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
  if (!/defineScene\s*\(/.test(out.html) || !/<\/html>\s*$/i.test(out.html.trim())) throw new Error('Fixer returned an incomplete scene file.');
  return out;
}
