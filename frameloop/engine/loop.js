import fs from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, paths, ensureDir } from './config.js';
import { assertFfmpeg } from './ffmpeg.js';
import { startServer } from './server.js';
import { launchBrowser, renderScene } from './render.js';
import { analyzeScene, contactSheet, pickEvidence, evidenceFrame } from './analyze.js';
import { lintScene, formatFinding } from './lint.js';
import { critiqueWithClaude, critiqueHeuristic, describeMeasurements } from './critic.js';
import { reviseScene } from './fixer.js';
import { grade, CATEGORIES } from './grade.js';
import { synthesize } from './audio.js';
import { encodeScene, encodeFilm } from './encode.js';

async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift());
  }));
}

// Frames worth re-capturing: blank runs and isolated pops. If they come back pixel-identical the
// fault is in the design (deterministic) and goes to the critic; if they change it was a capture glitch.
function suspectFrames(dead, total) {
  const set = new Set();
  for (const f of dead.findings) {
    if (f.kind === 'pop') [f.frames[0] - 1, f.frames[0], f.frames[0] + 1].forEach((n) => n >= 0 && n < total && set.add(n));
    if (f.kind === 'blank') for (let n = f.frames[0]; n <= Math.min(f.frames[1], f.frames[0] + 29); n++) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export async function runLoop(cfg, log = console.log) {
  const tools = assertFfmpeg();
  if (cfg.useAI && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. Export it, or run with --no-ai for the offline (measurement-only) critic.');
  }
  ensureDir(OUT);
  const audio = synthesize(cfg, paths.audio());
  log(`Soundtrack: ${audio.beats} beats at ${cfg.bpm} BPM, ${audio.seconds.toFixed(2)}s -> ${path.relative(ROOT, audio.file)}`);
  log(`Mode: ${cfg.useAI ? `Claude critic + rewrite (${cfg.ai.model}, effort ${cfg.ai.effort})` : 'offline heuristic critic (measures only, no rewrites)'}; ${cfg.width}x${cfg.height}@${cfg.fps}; pass >= ${cfg.threshold}`);

  const server = await startServer();
  const browser = await launchBrowser();
  const state = new Map();
  for (const scene of cfg.active) {
    const src = fs.readFileSync(path.join(ROOT, scene.file), 'utf8');
    ensureDir(paths.history(scene.id));
    fs.writeFileSync(path.join(paths.history(scene.id), 'v0.html'), src);
    state.set(scene.id, { version: 0, current: src, best: null, rounds: [], rejected: [], passed: false, stalled: false, fixFailures: 0, pendingChanges: [], lastRendered: null });
  }

  const runRound = async (scene, iter) => {
    const st = state.get(scene.id);
    const tag = `${scene.id} v${st.version}`;
    const adir = ensureDir(paths.analysis(scene.id));

    // 1. Ban basic CSS (static)
    const lint = lintScene(scene);
    // 2. Render every frame
    const r = await renderScene(browser, server, cfg, scene, { log: (m) => log(`  ${m}`) });
    st.lastRendered = st.version;
    const runtime = r.runtime;
    log(`  ${tag}: rendered ${r.rendered}/${scene.frames} frames in ${(r.ms / 1000).toFixed(1)}s`);

    let analysis = null;
    let sheet = null;
    let evidence = [];
    let critique;
    let measurements;
    if (r.rendered === scene.frames) {
      // 3. ffmpeg checks every frame
      analysis = await analyzeScene(cfg, scene, tools);
      // 4. Hunt dead frames and re-render them
      const suspects = suspectFrames(analysis.dead, scene.frames);
      if (suspects.length) {
        const rr = await renderScene(browser, server, cfg, scene, { frames: suspects });
        const changed = suspects.filter((n) => rr.hashes[n] && rr.hashes[n] !== r.hashes[n]);
        if (changed.length) {
          log(`  ${tag}: ${changed.length}/${suspects.length} suspect frame(s) were capture glitches; re-rendered and re-measured`);
          analysis = await analyzeScene(cfg, scene, tools);
        } else {
          log(`  ${tag}: ${suspects.length} suspect frame(s) re-rendered identically: design fault, sent to the critic`);
        }
        analysis.recaptured = { suspects: suspects.length, changed: changed.length };
      }
      // 5. Watch own frames: contact sheet + evidence frames
      sheet = await contactSheet(cfg, scene, path.join(adir, `r${iter}-v${st.version}-sheet.png`), tools);
      for (const p of pickEvidence(scene, analysis.dead, analysis.sync)) {
        evidence.push({ ...p, file: await evidenceFrame(scene, p.n, path.join(adir, `r${iter}-frame-${String(p.n).padStart(4, '0')}.jpg`)) });
      }
      measurements = describeMeasurements(cfg, scene, analysis, lint, runtime);
      // 6. Critique
      const last = st.rounds.at(-1);
      critique = cfg.useAI
        ? await critiqueWithClaude({ cfg, scene, analysis, lint, runtime, sheet, evidence, previous: last && { overall: last.graded.overall, changes: st.pendingChanges } })
        : critiqueHeuristic({ analysis, lint, runtime });
    } else {
      measurements = `Render failed after ${r.rendered}/${scene.frames} frames.\n${runtime.errors.map((e) => `- ${e.rule}: ${e.message}`).join('\n')}`;
      critique = {
        scores: Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, 0])),
        issues: runtime.errors.map((e) => ({ severity: 'blocker', category: 'polish', frames: [], problem: e.message, fix: 'Make the scene load and render without errors.' })),
        keep: [],
        summary: 'The scene does not render.',
        source: 'render-failure',
      };
    }
    fs.writeFileSync(path.join(adir, `r${iter}-critique.json`), JSON.stringify(critique, null, 2));

    // 7. Grade (taste x hard gates)
    const graded = grade({ scores: critique.scores, issues: critique.issues, lint, dead: analysis?.dead, runtime, threshold: cfg.threshold });
    st.rounds.push({
      iter,
      version: st.version,
      graded,
      scores: critique.scores,
      summary: critique.summary,
      issues: critique.issues,
      changes: st.pendingChanges,
      sheet: sheet?.file,
      lint: lint.findings,
      runtime: [...runtime.errors, ...runtime.warnings],
      dead: analysis?.dead.findings ?? [],
      recaptured: analysis?.recaptured,
    });
    log(`  ${tag}: ${graded.overall}/10 ${graded.pass ? 'PASS' : 'below bar'}${graded.gates.length ? ` | gates: ${graded.gates.join('; ')}` : ''}`);
    for (const f of [...lint.errors, ...runtime.errors].slice(0, 6)) log(`    ${formatFinding(f)}`);
    if (critique.summary) log(`    critic: ${critique.summary}`);

    const better = !st.best || graded.overall > st.best.graded.overall || (graded.overall === st.best.graded.overall && graded.gates.length < st.best.graded.gates.length);
    if (better) {
      st.best = { version: st.version, source: st.current, critique, graded, sheet: sheet?.file, measurements };
    } else {
      st.rejected.push({ overall: graded.overall, changes: st.pendingChanges });
      log(`  ${tag}: below best v${st.best.version} (${st.best.graded.overall}); next revision starts from v${st.best.version}`);
    }
    if (graded.pass) {
      st.passed = true;
      return;
    }

    // 8. Re-render: revise the scene from its best version
    if (!cfg.useAI) { st.stalled = true; return; }
    if (iter >= cfg.maxIterations) return;
    try {
      const base = st.best;
      const fix = await reviseScene({ cfg, scene, source: base.source, critique: base.critique, graded: base.graded, measurements: base.measurements, sheetFile: base.sheet, rejected: st.rejected });
      st.version += 1;
      st.current = fix.html;
      st.pendingChanges = fix.changes;
      fs.writeFileSync(path.join(ROOT, scene.file), fix.html);
      fs.writeFileSync(path.join(paths.history(scene.id), `v${st.version}.html`), fix.html);
      log(`  ${scene.id}: revised to v${st.version}\n${fix.changes.map((c) => `    + ${c}`).join('\n')}`);
    } catch (e) {
      st.fixFailures += 1;
      log(`  ${scene.id}: revision failed (${e.message.split('\n')[0]})`);
      if (st.fixFailures >= 2) st.stalled = true;
    }
  };

  try {
    for (let iter = 1; iter <= cfg.maxIterations; iter++) {
      const pending = cfg.active.filter((s) => !state.get(s.id).passed && !state.get(s.id).stalled);
      if (!pending.length) break;
      log(`\n== Round ${iter}/${cfg.maxIterations}: ${pending.map((s) => s.id).join(', ')}`);
      await pool(pending, cfg.concurrency, async (scene) => {
        try {
          await runRound(scene, iter);
        } catch (e) {
          log(`  ${scene.id}: round failed: ${e.stack || e.message}`);
          state.get(scene.id).stalled = true;
        }
      });
    }

    // Leave every scene on its best version, with frames that match it.
    for (const scene of cfg.active) {
      const st = state.get(scene.id);
      if (!st.best) continue;
      const file = path.join(ROOT, scene.file);
      if (fs.readFileSync(file, 'utf8') !== st.best.source) fs.writeFileSync(file, st.best.source);
      if (st.lastRendered !== st.best.version) {
        log(`\n${scene.id}: restoring best version v${st.best.version} and re-rendering its frames`);
        await renderScene(browser, server, cfg, scene);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  // Encode
  const complete = (s) => fs.existsSync(paths.frames(s.id)) && fs.readdirSync(paths.frames(s.id)).filter((f) => f.endsWith('.png')).length === s.frames;
  for (const scene of cfg.scenes) if (complete(scene)) await encodeScene(cfg, scene, tools);
  let film = null;
  if (cfg.scenes.every(complete)) film = await encodeFilm(cfg, audio.file);
  else log('\nFilm not assembled: some scenes have no complete frame set yet (run without --scene once).');

  const report = writeReport(cfg, state, film);
  printSummary(cfg, state, film, report, log);
  return { state, film, report };
}

function writeReport(cfg, state, film) {
  const cats = Object.keys(CATEGORIES);
  const json = {
    generated: new Date().toISOString(),
    threshold: cfg.threshold,
    mode: cfg.useAI ? 'claude' : 'heuristic',
    model: cfg.useAI ? cfg.ai.model : null,
    resolution: `${cfg.width}x${cfg.height}@${cfg.fps}`,
    film: film && path.relative(ROOT, film),
    scenes: Object.fromEntries([...state.entries()].map(([id, st]) => [id, {
      passed: st.passed,
      bestVersion: st.best?.version,
      bestScore: st.best?.graded.overall,
      rounds: st.rounds.map(({ sheet, ...r }) => ({ ...r, sheet: sheet && path.relative(OUT, sheet) })),
    }])),
  };
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(json, null, 2));

  const md = [];
  md.push('# frameloop report', '');
  md.push(`Mode: ${json.mode}${json.model ? ` (${json.model})` : ''}. Threshold ${cfg.threshold}/10. ${json.resolution}. ${film ? `Film: \`${json.film}\`.` : ''}`, '');
  md.push('| Scene | Status | Best | Rounds |', '|---|---|---|---|');
  for (const [id, st] of state) md.push(`| ${id} | ${st.passed ? 'pass' : 'below bar'} | ${st.best ? `${st.best.graded.overall} (v${st.best.version})` : 'n/a'} | ${st.rounds.length} |`);
  for (const [id, st] of state) {
    md.push('', `## ${id}`, '');
    md.push(`| Round | Version | Score | ${cats.join(' | ')} | Gates |`, `|${'---|'.repeat(cats.length + 4)}`);
    for (const r of st.rounds) md.push(`| ${r.iter} | v${r.version} | ${r.graded.overall} | ${cats.map((c) => r.scores?.[c] ?? '-').join(' | ')} | ${r.graded.gates.join('; ') || ''} |`);
    const last = st.rounds.at(-1);
    if (!last) continue;
    if (last.sheet) md.push('', `![round ${last.iter} contact sheet](${path.relative(OUT, last.sheet)})`);
    if (last.summary) md.push('', `Critic: ${last.summary}`);
    if (last.issues?.length) {
      md.push('', 'Open issues in the last round:', '');
      for (const i of last.issues.slice(0, 8)) md.push(`- **${i.severity}**, ${i.category}, frames ${i.frames.join(', ') || 'n/a'}: ${i.problem} Fix: ${i.fix}`);
    }
  }
  fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n') + '\n');
  return path.join(OUT, 'report.md');
}

function printSummary(cfg, state, film, report, log) {
  log('\n== Result');
  for (const [id, st] of state) {
    const scores = st.best?.critique?.scores ?? {};
    const detail = Object.entries(scores).filter(([, v]) => v !== null).map(([k, v]) => `${k} ${v}`).join(', ');
    log(`  ${st.passed ? 'PASS' : 'FAIL'}  ${id.padEnd(16)} ${st.best ? `${st.best.graded.overall}/10 (v${st.best.version})` : 'n/a'}  ${detail}`);
  }
  const all = [...state.values()].every((s) => s.passed);
  log(all ? `\nEvery scene is at ${cfg.threshold}/10 or above.` : `\nNot every scene reached ${cfg.threshold}/10. ${cfg.useAI ? 'Raise --max-iter or read the report for the open issues.' : 'Offline mode cannot judge taste; run with ANTHROPIC_API_KEY set.'}`);
  if (film) log(`Film: ${path.relative(ROOT, film)}`);
  log(`Report: ${path.relative(ROOT, report)}`);
}
