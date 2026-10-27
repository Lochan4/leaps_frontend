import fs from 'node:fs';
import path from 'node:path';
import { ffmpeg } from './ffmpeg.js';
import { paths, ensureDir } from './config.js';

/**
 * One ffmpeg pass over every frame of a scene.
 *   signalstats  -> YDIF (mean abs luma change vs previous frame), YMIN/YMAX/YAVG, SATAVG
 *   entropy      -> normalized luma entropy (how much is actually in the frame)
 *   freezedetect -> ffmpeg's own verdict on frozen stretches
 */
export async function measureFrames(cfg, scene) {
  const dir = ensureDir(paths.analysis(scene.id));
  const metricsFile = 'metrics.txt'; // relative: avoids filtergraph escaping of absolute paths
  const freezeSec = Math.max(cfg.dead.stillSeconds, 2 / cfg.fps).toFixed(3);
  const vf = [
    'format=yuv444p',
    'signalstats',
    'entropy',
    `freezedetect=n=-60dB:d=${freezeSec}`,
    `metadata=mode=print:file=${metricsFile}`,
  ].join(',');
  await ffmpeg(
    ['-v', 'error', '-y', '-framerate', String(cfg.fps), '-start_number', '0', '-i', path.join(paths.frames(scene.id), 'f_%05d.png'), '-vf', vf, '-f', 'null', '-'],
    { cwd: dir },
  );
  return parseMetadata(fs.readFileSync(path.join(dir, metricsFile), 'utf8'), cfg.fps);
}

function parseMetadata(text, fps) {
  const frames = [];
  const freezes = [];
  let cur = null;
  let open = null;
  for (const line of text.split('\n')) {
    const fm = line.match(/^frame:(\d+)\s+pts:\S+\s+pts_time:(\S+)/);
    if (fm) {
      cur = { n: Number(fm[1]) };
      frames.push(cur);
      continue;
    }
    const kv = line.match(/^lavfi\.([\w.]+)=(.*)$/);
    if (!kv || !cur) continue;
    const [, key, raw] = kv;
    const v = Number(raw);
    if (key === 'signalstats.YDIF') cur.ydif = v;
    else if (key === 'signalstats.YAVG') cur.yavg = v;
    else if (key === 'signalstats.YMIN') cur.ymin = v;
    else if (key === 'signalstats.YMAX') cur.ymax = v;
    else if (key === 'signalstats.SATAVG') cur.sat = v;
    else if (key === 'entropy.normalized_entropy.normal.Y') cur.entropy = v;
    else if (key === 'freezedetect.freeze_start') open = { start: Math.round(v * fps) };
    else if (key === 'freezedetect.freeze_end' && open) {
      open.end = Math.round(v * fps) - 1;
      freezes.push(open);
      open = null;
    }
  }
  if (open) freezes.push({ ...open, end: frames.length - 1 });
  if (frames[0]) frames[0].ydif = 0;
  return { frames, freezes };
}

const quantile = (arr, q) => {
  const s = [...arr].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0;
};

/**
 * Dead-frame hunt. Classifies:
 *   blank  - nothing in the frame (failed fonts/assets, or an empty opening)       -> error
 *   still  - long stretch with no visible motion (frozen or crawling spring tails) -> warn, error if 2x
 *   pop    - isolated one-frame spike: something appeared/vanished with no motion  -> warn
 * Allowed: a final hold of up to dead.endHoldBeats at the end of the scene.
 */
export function huntDeadFrames(cfg, scene, { frames, freezes }) {
  const d = cfg.dead;
  const ydif = frames.map((f) => f.ydif ?? 0);
  const moving = ydif.slice(1).filter((v) => v > d.crawl);
  const p90 = quantile(moving.length ? moving : [0], 0.9);
  const stillThresh = Math.max(d.crawl, p90 * 0.02);
  const nearBeat = (n) => scene.beatFrames.some((b) => Math.abs(b - n) <= 1);
  const findings = [];

  // blank frames, grouped into runs
  let run = null;
  const flushBlank = () => {
    if (!run) return;
    findings.push({ kind: 'blank', level: 'error', frames: [run.a, run.b], message: `Blank frame${run.b > run.a ? 's' : ''} ${run.a}${run.b > run.a ? `-${run.b}` : ''}: nothing visible (entropy ${run.e.toFixed(3)}, contrast ${run.c}).` });
    run = null;
  };
  frames.forEach((f, i) => {
    const contrast = (f.ymax ?? 255) - (f.ymin ?? 0);
    const blank = (f.entropy ?? 1) < d.blankEntropy || contrast < d.blankContrast;
    if (blank) {
      if (!run) run = { a: i, b: i, e: f.entropy ?? 0, c: contrast };
      else run.b = i;
    } else flushBlank();
  });
  flushBlank();

  // still runs
  const minRun = Math.round(d.stillSeconds * cfg.fps);
  const endHold = Math.round(d.endHoldBeats * cfg.beatLen * cfg.fps);
  let s = null;
  const flushStill = (endIdx) => {
    if (!s) return;
    const len = endIdx - s + 1;
    const touchesEnd = endIdx >= frames.length - 1;
    if (len >= minRun && !(touchesEnd && len <= endHold)) {
      const frozen = freezes.some((fz) => fz.start <= s + 1 && fz.end >= endIdx - 1) || ydif.slice(s, endIdx + 1).every((v) => v === 0);
      const secs = len / cfg.fps;
      findings.push({
        kind: frozen ? 'frozen' : 'crawl',
        level: secs >= 2 * d.stillSeconds ? 'error' : 'warn',
        frames: [s, endIdx],
        message: `${frozen ? 'Frozen' : 'Crawling (sub-pixel drift)'} for ${secs.toFixed(2)}s, frames ${s}-${endIdx}${touchesEnd ? ' (end of scene, longer than the allowed hold)' : ''}: dead air.`,
      });
    }
    s = null;
  };
  for (let i = 1; i < ydif.length; i++) {
    if (ydif[i] < stillThresh) { if (s === null) s = i; }
    else flushStill(i - 1);
  }
  flushStill(ydif.length - 1);

  // pops: isolated spikes
  for (let i = 1; i < ydif.length; i++) {
    const prev = ydif[i - 1];
    const next = i + 1 < ydif.length ? ydif[i + 1] : 0;
    if (ydif[i] > d.popMin && ydif[i] > d.popFactor * Math.max(prev, next, 1e-3)) {
      const onBeat = nearBeat(i);
      findings.push({
        kind: 'pop',
        level: 'warn',
        frames: [i, i],
        onBeat,
        message: `Pop at frame ${i}${onBeat ? ' (on a beat)' : ' (off the beat)'}: a one-frame jump (YDIF ${ydif[i].toFixed(2)} vs ~${Math.max(prev, next).toFixed(2)} around it). Something appears/vanishes without motion.`,
      });
    }
  }
  return { findings, stillThresh, errors: findings.filter((f) => f.level === 'error'), warnings: findings.filter((f) => f.level === 'warn') };
}

/** Where motion starts (onsets) vs where the beats are. */
export function beatSync(cfg, scene, { frames }) {
  const y = frames.map((f) => f.ydif ?? 0);
  const peak = Math.max(...y, 1e-6);
  const on = 0.12 * peak;
  const floor = Math.max(cfg.dead.crawl, 0.03 * peak);
  const onsets = [];
  for (let i = 1; i < y.length; i++) {
    if (!(y[i - 1] < on && y[i] >= on)) continue;
    // A spring's motion energy peaks a few frames after it starts: walk back to where the rise began.
    let k = i;
    while (k > 1 && y[k - 1] > floor && y[k - 1] < y[k]) k--;
    if (!onsets.length || k - onsets[onsets.length - 1] > 4) onsets.push(k);
  }
  const tol = 2;
  const hits = onsets.filter((n) => scene.beatFrames.some((b) => Math.abs(b - n) <= tol));
  return { onsets, onBeat: hits.length, total: onsets.length, ratio: onsets.length ? hits.length / onsets.length : 1 };
}

/** Mean motion energy per beat, as numbers the critic can read. */
export function motionProfile(cfg, scene, { frames }) {
  const out = [];
  for (let b = 0; b < scene.beats; b++) {
    const a = scene.beatFrames[b];
    const z = Math.min(scene.beatFrames[b + 1], frames.length);
    const slice = frames.slice(a, z).map((f) => f.ydif ?? 0);
    out.push(slice.length ? +(slice.reduce((p, v) => p + v, 0) / slice.length).toFixed(3) : 0);
  }
  return out;
}

/** 3x4 contact sheet of evenly spaced frames, labelled with frame numbers. */
export async function contactSheet(cfg, scene, outFile, { hasDrawtext } = {}) {
  const step = Math.max(1, Math.ceil(scene.frames / 12));
  const fontsize = Math.max(14, Math.round(cfg.height / 16));
  const label = `drawtext=text='%{n}':x=16:y=12:fontsize=${fontsize}:fontcolor=white:box=1:boxcolor=black@0.65:boxborderw=8`;
  const rest = `select='not(mod(n\\,${step}))',scale=512:-2,tile=3x4:padding=8:margin=8:color=0x1a1a1a`;
  const input = ['-v', 'error', '-y', '-framerate', String(cfg.fps), '-start_number', '0', '-i', path.join(paths.frames(scene.id), 'f_%05d.png')];
  try {
    await ffmpeg([...input, '-vf', hasDrawtext ? `${label},${rest}` : rest, '-frames:v', '1', '-update', '1', outFile]);
  } catch (e) {
    if (!hasDrawtext) throw e;
    await ffmpeg([...input, '-vf', rest, '-frames:v', '1', '-update', '1', outFile]);
  }
  return { file: outFile, step };
}

/** Downscaled JPEG of a single frame, for sending to the critic. */
export async function evidenceFrame(scene, n, outFile) {
  await ffmpeg(['-v', 'error', '-y', '-i', paths.frame(scene.id, n), '-vf', "scale='min(1280,iw)':-2", '-q:v', '3', outFile]);
  return outFile;
}

/** Picks the frames the critic should look at closely: worst dead frames first, then beat accents. */
export function pickEvidence(scene, dead, sync, max = 6) {
  const picks = [];
  const add = (n, why) => {
    if (n < 0 || n >= scene.frames || picks.some((p) => Math.abs(p.n - n) < 3)) return;
    picks.push({ n, why });
  };
  for (const f of [...dead.errors, ...dead.warnings]) add(f.kind === 'pop' ? f.frames[0] : Math.round((f.frames[0] + f.frames[1]) / 2), f.message);
  for (const b of [2, 4, 6, 1, 3, 5, 7]) add(scene.beatFrames[b] + 2, `just after beat ${b}`);
  add(scene.frames - 1, 'last frame (what the cut leaves on)');
  return picks.slice(0, max).sort((a, b) => a.n - b.n);
}

export async function analyzeScene(cfg, scene, tools) {
  const measured = await measureFrames(cfg, scene);
  if (measured.frames.length !== scene.frames) {
    throw new Error(`${scene.id}: expected ${scene.frames} frames, ffmpeg measured ${measured.frames.length}`);
  }
  const dead = huntDeadFrames(cfg, scene, measured);
  const sync = beatSync(cfg, scene, measured);
  const profile = motionProfile(cfg, scene, measured);
  return { measured, dead, sync, profile, tools };
}
