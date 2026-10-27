#!/usr/bin/env node
import path from 'node:path';
import { loadConfig, parseArgs, paths, ROOT } from './config.js';
import { lintScene, formatFinding } from './lint.js';
import { assertFfmpeg } from './ffmpeg.js';
import { startServer } from './server.js';
import { launchBrowser, renderScene } from './render.js';
import { analyzeScene, contactSheet } from './analyze.js';
import { synthesize } from './audio.js';
import { encodeScene, encodeFilm } from './encode.js';
import { runLoop } from './loop.js';

const HELP = `frameloop: headless render loop

  npm run lint                 ban-basic-CSS + asset + contract checks on every scene
  npm run preview              serve scenes for live preview in your browser
  npm run render               render all frames, encode scenes + film (no critique)
  npm run analyze              run the ffmpeg frame analysis on the last render
  npm run loop                 render -> hunt dead frames -> critique -> revise, until all scenes >= threshold

flags:  --scene id[,id]   only these scenes      --draft         half resolution
        --max-iter N      loop rounds            --threshold N   pass mark (default 8)
        --no-ai           offline critic (measurements only, no rewrites)
        --port N          preview port (default 4173)`;

const flags = parseArgs(process.argv.slice(2));
const cmd = flags._[0];

async function main() {
  if (!cmd || cmd === 'help') return console.log(HELP);
  const cfg = await loadConfig(flags);

  if (cmd === 'lint') {
    let errors = 0;
    for (const scene of cfg.active) {
      const r = lintScene(scene);
      errors += r.errors.length;
      console.log(`\n${scene.id}: ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
      for (const f of r.findings) console.log(`  ${formatFinding(f)}`);
    }
    process.exitCode = errors ? 1 : 0;
    return;
  }

  if (cmd === 'preview') {
    const server = await startServer(Number(flags.port || 4173));
    console.log('Live preview (real-time playback, loops):');
    for (const s of cfg.active) {
      console.log(`  ${s.id.padEnd(16)} ${server.url}/${s.file}?bpm=${cfg.bpm}&duration=${s.duration.toFixed(3)}&beatOffset=${s.beatOffset.toFixed(4)}&fps=${cfg.fps}`);
    }
    console.log('Ctrl+C to stop.');
    return;
  }

  if (cmd === 'render') {
    const tools = assertFfmpeg();
    const server = await startServer();
    const browser = await launchBrowser();
    try {
      for (const scene of cfg.active) {
        const r = await renderScene(browser, server, cfg, scene, { log: (m) => console.log(`  ${m}`) });
        console.log(`${scene.id}: ${r.rendered}/${scene.frames} frames in ${(r.ms / 1000).toFixed(1)}s`);
        for (const f of [...r.runtime.errors, ...r.runtime.warnings]) console.log(`  ${formatFinding(f)}`);
        if (r.rendered === scene.frames) await encodeScene(cfg, scene, tools);
      }
    } finally {
      await browser.close();
      await server.close();
    }
    if (!flags.scene) {
      const audio = synthesize(cfg, paths.audio());
      const film = await encodeFilm(cfg, audio.file);
      console.log(`Film: ${path.relative(ROOT, film)}`);
    }
    return;
  }

  if (cmd === 'analyze') {
    const tools = assertFfmpeg();
    for (const scene of cfg.active) {
      const a = await analyzeScene(cfg, scene, tools);
      const sheet = await contactSheet(cfg, scene, path.join(paths.analysis(scene.id), 'sheet.png'), tools);
      console.log(`\n${scene.id}: ${scene.frames} frames`);
      console.log(`  motion per beat: ${a.profile.join(', ')}`);
      console.log(`  onsets on beat: ${a.sync.onBeat}/${a.sync.total} (frames ${a.sync.onsets.join(', ') || 'none'}; beats at ${scene.beatFrames.join(', ')})`);
      if (!a.dead.findings.length) console.log('  dead frames: none');
      for (const f of a.dead.findings) console.log(`  ${f.level === 'error' ? 'ERROR' : 'warn '} ${f.kind}: ${f.message}`);
      console.log(`  contact sheet: ${path.relative(ROOT, sheet.file)}`);
    }
    return;
  }

  if (cmd === 'loop') {
    const { state } = await runLoop(cfg);
    process.exitCode = [...state.values()].every((s) => s.passed) ? 0 : 2;
    return;
  }

  console.log(HELP);
  process.exitCode = 1;
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exitCode = 1;
});
