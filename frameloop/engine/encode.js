import fs from 'node:fs';
import path from 'node:path';
import { ffmpeg } from './ffmpeg.js';
import { paths, ensureDir } from './config.js';

// Identical encoder settings for every scene, so the concat step can stream-copy without re-encoding.
const VIDEO = (hasX264) => (hasX264
  ? ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-g', '60']
  : ['-c:v', 'mpeg4', '-q:v', '2', '-pix_fmt', 'yuv420p']);

export async function encodeScene(cfg, scene, tools) {
  const out = paths.sceneVideo(scene.id);
  ensureDir(path.dirname(out));
  await ffmpeg([
    '-v', 'error', '-y', '-framerate', String(cfg.fps), '-start_number', '0',
    '-i', path.join(paths.frames(scene.id), 'f_%05d.png'),
    ...VIDEO(tools.hasX264), '-r', String(cfg.fps), '-movflags', '+faststart', out,
  ]);
  return out;
}

export async function encodeFilm(cfg, audioFile) {
  const listFile = path.join(path.dirname(paths.film()), 'concat.txt');
  fs.writeFileSync(listFile, cfg.scenes.map((s) => `file '${paths.sceneVideo(s.id).replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  await ffmpeg([
    '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-i', audioFile,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
    '-movflags', '+faststart', paths.film(),
  ]);
  return paths.film();
}
