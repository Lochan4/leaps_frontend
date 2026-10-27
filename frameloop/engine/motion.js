// motion.js: everything a scene needs to animate as a pure function of time.
// Runs in the browser (imported by scenes) and in Node (tests). No wall-clock anywhere.
//
// Why closed-form: a numerically integrated spring depends on every previous frame, so frame 87
// can only be produced by rendering frames 0..86 first. A closed-form spring is x(t), so any frame
// can be rendered alone, in any order. That is what lets the loop re-render single dead frames.

export const presets = {
  snappy: { stiffness: 400, damping: 28, mass: 1 }, // zeta 0.70, quick with a small overshoot
  gentle: { stiffness: 120, damping: 20, mass: 1 }, // zeta 0.91, soft landing
  bouncy: { stiffness: 300, damping: 14, mass: 1 }, // zeta 0.40, visible wobble; use once, on purpose
  heavy: { stiffness: 90, damping: 19, mass: 1 },   // zeta 1.00, slow and weighty, no overshoot
};

/**
 * Damped harmonic oscillator from 0 to 1, solved analytically.
 * @param {number} t seconds since the spring started (<= 0 returns 0)
 * @param {{stiffness?:number, damping?:number, mass?:number, velocity?:number, restDelta?:number}} opts
 * @returns {number} progress, may overshoot 1 when underdamped. Snaps to exactly 1 at rest, so
 *   spring tails never "crawl" by sub-pixel amounts for seconds (a classic dead-frame source).
 */
export function spring(t, opts = {}) {
  const { stiffness = 170, damping = 26, mass = 1, velocity = 0, restDelta = 0.0005 } = opts;
  if (!(t > 0)) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const e0 = -1; // displacement from target at t=0
  const v0 = velocity;
  let e;
  let v;
  if (zeta < 1 - 1e-6) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const B = (v0 + zeta * w0 * e0) / wd;
    const env = Math.exp(-zeta * w0 * t);
    const c = Math.cos(wd * t);
    const s = Math.sin(wd * t);
    e = env * (e0 * c + B * s);
    v = env * (-zeta * w0 * (e0 * c + B * s) + (-e0 * wd * s + B * wd * c));
    if (env * Math.hypot(e0, B) < restDelta) return 1;
  } else if (zeta <= 1 + 1e-6) {
    const k = v0 + w0 * e0;
    const env = Math.exp(-w0 * t);
    e = (e0 + k * t) * env;
    v = env * (k - w0 * (e0 + k * t));
  } else {
    const r = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - r);
    const r2 = -w0 * (zeta + r);
    const A = (v0 - r2 * e0) / (r1 - r2);
    const B = e0 - A;
    e = A * Math.exp(r1 * t) + B * Math.exp(r2 * t);
    v = A * r1 * Math.exp(r1 * t) + B * r2 * Math.exp(r2 * t);
  }
  if (Math.abs(e) < restDelta && Math.abs(v) < restDelta * w0) return 1;
  return 1 + e;
}

/** Spring that starts at `start` seconds. */
export const springAt = (t, start, opts) => spring(t - start, opts);

/** Seconds until a spring is at rest (exactly 1). Useful for planning holds and beats. */
export function settleTime(opts = {}, limit = 10) {
  for (let t = 0; t < limit; t += 1 / 240) if (spring(t, opts) === 1) return t;
  return limit;
}

export const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
export const lerp = (a, b, p) => a + (b - a) * p;
export const mapRange = (x, a, b, c, d) => c + ((x - a) / (b - a)) * (d - c);
export const smoothstep = (a, b, x) => {
  const u = clamp((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};

/** Deterministic hash noise in [0,1): same seed, same value, on every frame and every re-render. */
export function rand(seed) {
  let x = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

export function mixHex(a, b, p) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (v, s) => (v >> s) & 255;
  const m = (s) => Math.round(lerp(ch(pa, s), ch(pb, s), clamp(p)));
  return `#${((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, '0')}`;
}

/**
 * The scene contract. A scene calls defineScene({ setup?, render }).
 *   setup(ctx)      optional, async, runs once after fonts and images are ready.
 *   render(t, ctx)  required, must be a PURE function of t: set every animated property from t alone.
 * ctx: { t, frame, fps, duration, progress, bpm, beatLen, beat, beatAt(n), width, height }
 *   beatAt(n) is the local time of beat n, already aligned to the global cut grid.
 */
export function defineScene(def) {
  if (typeof window === 'undefined') return def;
  window.__scene = def;
  if (!window.__LOOP) {
    installPreview(def); // opened directly in a browser: live preview
    return def;
  }
  window.__sceneReady = (async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    if (def.setup) await def.setup(window.__ctx(0));
    return true;
  })();
  return def;
}

// Live preview outside the loop: real-time playback using the same ctx shape.
// Query params: ?bpm=112&duration=4.29&fps=30&beatOffset=0
function installPreview(def) {
  const q = new URLSearchParams(location.search);
  const cfg = {
    fps: Number(q.get('fps') || 30),
    bpm: Number(q.get('bpm') || 112),
    duration: Number(q.get('duration') || 4),
    beatOffset: Number(q.get('beatOffset') || 0),
    width: innerWidth,
    height: innerHeight,
  };
  const beatLen = 60 / cfg.bpm;
  window.__ctx = (t) => ({
    t,
    fps: cfg.fps,
    frame: Math.round(t * cfg.fps),
    duration: cfg.duration,
    progress: t / cfg.duration,
    bpm: cfg.bpm,
    beatLen,
    beat: (t - cfg.beatOffset) / beatLen,
    beatAt: (n) => n * beatLen + cfg.beatOffset,
    width: cfg.width,
    height: cfg.height,
  });
  const t0 = performance.now();
  const tick = () => {
    const t = (((performance.now() - t0) / 1000) % (cfg.duration + 0.6));
    const tt = Math.min(t, cfg.duration - 1 / cfg.fps);
    def.render(tt, window.__ctx(tt));
    requestAnimationFrame(tick);
  };
  window.__sceneReadyPreview = (async () => {
    await document.fonts.ready;
    if (def.setup) await def.setup(window.__ctx(0));
    requestAnimationFrame(tick);
  })();
}
