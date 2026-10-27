import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './config.js';

// A small deterministic synth. The soundtrack is generated from the same beat grid the cuts use,
// so picture and sound cannot drift: kick on every beat, hats on the offbeats, a pad per bar,
// a sub bass ducked by the kick, a riser into each cut and a low impact on each cut.

const SR = 44100;
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

function noise(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return (((x ^ (x >>> 14)) >>> 0) / 4294967296) * 2 - 1;
  };
}

export function synthesize(cfg, outFile) {
  const beat = cfg.beatLen;
  const total = cfg.totalFrames / cfg.fps; // exactly the picture length
  const N = Math.ceil(total * SR);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const add = (i, l, r = l) => {
    if (i >= 0 && i < N) { L[i] += l; R[i] += r; }
  };
  const rnd = noise(7);
  const prog = cfg.audio?.progression ?? [[50, 53, 57, 60]];
  const beats = Math.round(total / beat);

  // kick + sidechain envelope
  const duck = new Float32Array(N).fill(1);
  for (let b = 0; b < beats; b++) {
    const start = Math.round(b * beat * SR);
    let phase = 0;
    for (let k = 0; k < 0.45 * SR; k++) {
      const t = k / SR;
      const f = 42 + 95 * Math.exp(-t * 32);
      phase += (2 * Math.PI * f) / SR;
      add(start + k, Math.sin(phase) * Math.exp(-t * 7) * 0.9);
      if (start + k < N) duck[start + k] = Math.min(duck[start + k], 1 - 0.75 * Math.exp(-t * 9));
    }
  }

  // hats on offbeats: noise through a one-pole high-pass
  for (let b = 0; b < beats; b++) {
    const start = Math.round((b + 0.5) * beat * SR);
    let prev = 0;
    for (let k = 0; k < 0.08 * SR; k++) {
      const x = rnd();
      const hp = x - prev;
      prev = x;
      const env = Math.exp(-(k / SR) * 55) * 0.11;
      add(start + k, hp * env * 0.8, hp * env);
    }
  }

  // pad + bass, one chord per bar
  const bars = Math.ceil(beats / 4);
  for (let bar = 0; bar < bars; bar++) {
    const chord = prog[bar % prog.length];
    const a = Math.round(bar * 4 * beat * SR);
    const z = Math.min(N, Math.round((bar + 1) * 4 * beat * SR));
    for (let i = a; i < z; i++) {
      const t = (i - a) / SR;
      const len = (z - a) / SR;
      const env = Math.min(1, t / 0.35) * Math.min(1, (len - t) / 0.12);
      let l = 0;
      let r = 0;
      chord.forEach((m, j) => {
        const f = midiHz(m + 12);
        l += Math.sin(2 * Math.PI * f * 1.003 * (i / SR) + j) / chord.length;
        r += Math.sin(2 * Math.PI * f * 0.997 * (i / SR) + 2 * j) / chord.length;
      });
      const bass = Math.tanh(1.6 * Math.sin(2 * Math.PI * midiHz(chord[0] - 12) * (i / SR))) * 0.32;
      L[i] += (l * 0.16 * env + bass * env) * duck[i];
      R[i] += (r * 0.16 * env + bass * env) * duck[i];
    }
  }

  // riser into each cut, impact on each cut
  for (const s of cfg.scenes.slice(1)) {
    const cut = Math.round(s.startTime * SR);
    const riseLen = Math.round(beat * SR);
    let lp = 0;
    for (let k = 0; k < riseLen; k++) {
      const p = k / riseLen;
      const coef = 0.02 + 0.5 * p * p;
      lp += coef * (rnd() - lp);
      add(cut - riseLen + k, lp * p * p * 0.5);
    }
    let phase = 0;
    for (let k = 0; k < 0.9 * SR; k++) {
      const t = k / SR;
      phase += (2 * Math.PI * (30 + 40 * Math.exp(-t * 6))) / SR;
      add(cut + k, Math.sin(phase) * Math.exp(-t * 3.2) * 0.6);
    }
  }

  // soft clip, normalize to -1 dBFS, 16-bit stereo WAV
  let peak = 1e-9;
  for (let i = 0; i < N; i++) {
    L[i] = Math.tanh(L[i]);
    R[i] = Math.tanh(R[i]);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const gain = 0.891 / peak;
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    buf.writeInt16LE(Math.round(L[i] * gain * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(R[i] * gain * 32767), 46 + i * 4);
  }
  ensureDir(path.dirname(outFile));
  fs.writeFileSync(outFile, buf);
  return { file: outFile, seconds: total, beats };
}
