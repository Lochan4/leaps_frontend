import { spawn, spawnSync } from 'node:child_process';

export function assertFfmpeg() {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-version'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('ffmpeg not found on PATH. Install it (brew install ffmpeg / apt install ffmpeg).');
  const filters = spawnSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' }).stdout || '';
  const missing = ['signalstats', 'entropy', 'freezedetect', 'tile', 'select'].filter((f) => !new RegExp(`\\s${f}\\s`).test(filters));
  if (missing.length) throw new Error(`ffmpeg build is missing filters: ${missing.join(', ')}`);
  const hasDrawtext = /\sdrawtext\s/.test(filters);
  const encoders = spawnSync('ffmpeg', ['-hide_banner', '-encoders'], { encoding: 'utf8' }).stdout || '';
  return { hasDrawtext, hasX264: /libx264/.test(encoders) };
}

export function ffmpeg(args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ['-hide_banner', ...args], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    let stdout = '';
    p.stdout.on('data', (d) => (stdout += d));
    p.stderr.on('data', (d) => (stderr += d));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`ffmpeg exited ${code}\n  args: ${args.join(' ')}\n  ${stderr.trim().split('\n').slice(-6).join('\n  ')}`));
    });
  });
}
