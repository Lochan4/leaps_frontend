import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'out');

export const paths = {
  frames: (id) => path.join(OUT, 'frames', id),
  frame: (id, n) => path.join(OUT, 'frames', id, `f_${String(n).padStart(5, '0')}.png`),
  analysis: (id) => path.join(OUT, 'analysis', id),
  history: (id) => path.join(OUT, 'history', id),
  sceneVideo: (id) => path.join(OUT, 'scenes', `${id}.mp4`),
  audio: () => path.join(OUT, 'audio', 'track.wav'),
  film: () => path.join(OUT, 'film.mp4'),
};

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function parseArgs(argv) {
  const flags = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { flags._.push(a); continue; }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { flags[key] = next; i++; } else flags[key] = true;
  }
  return flags;
}

export async function loadConfig(flags = {}) {
  const mod = await import(pathToFileURL(path.join(ROOT, 'loop.config.js')).href + `?t=${Date.now()}`);
  const cfg = JSON.parse(JSON.stringify(mod.default));

  if (flags.draft) {
    cfg.width = Math.round(cfg.width / 2 / 2) * 2;
    cfg.height = Math.round(cfg.height / 2 / 2) * 2;
    cfg.draft = true;
  }
  if (flags['max-iter']) cfg.maxIterations = Number(flags['max-iter']);
  if (flags.threshold) cfg.threshold = Number(flags.threshold);
  cfg.useAI = !flags['no-ai'];

  buildTimeline(cfg);
  if (flags.scene) {
    const wanted = String(flags.scene).split(',');
    cfg.active = cfg.scenes.filter((s) => wanted.includes(s.id));
    if (!cfg.active.length) throw new Error(`No scene matches --scene ${flags.scene}`);
  } else cfg.active = cfg.scenes;
  return cfg;
}

// Cuts are computed from absolute beat times, then rounded to frames once, so rounding never drifts.
export function buildTimeline(cfg) {
  const beatLen = 60 / cfg.bpm;
  let beat = 0;
  for (const s of cfg.scenes) {
    s.startBeat = beat;
    s.endBeat = beat + s.beats;
    s.startTime = s.startBeat * beatLen;
    s.endTime = s.endBeat * beatLen;
    s.startFrame = Math.round(s.startTime * cfg.fps);
    s.endFrame = Math.round(s.endTime * cfg.fps);
    s.frames = s.endFrame - s.startFrame;
    s.duration = s.frames / cfg.fps;
    // Local t=0 is the scene's first frame; beatOffset shifts local beats onto the exact global grid.
    s.beatOffset = s.startTime - s.startFrame / cfg.fps;
    s.beatFrames = [];
    for (let b = 0; b <= s.beats; b++) s.beatFrames.push(Math.round((b * beatLen + s.beatOffset) * cfg.fps));
    beat = s.endBeat;
  }
  cfg.beatLen = beatLen;
  cfg.totalBeats = beat;
  cfg.totalFrames = cfg.scenes.reduce((n, s) => n + s.frames, 0);
  cfg.totalDuration = cfg.totalFrames / cfg.fps;
}

export function pageConfig(cfg, scene) {
  return {
    fps: cfg.fps,
    bpm: cfg.bpm,
    width: cfg.width,
    height: cfg.height,
    duration: scene.duration,
    beatOffset: scene.beatOffset,
    sceneId: scene.id,
  };
}
