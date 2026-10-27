// Injected with page.addInitScript before any scene code runs. It must stay self-contained:
// Playwright serializes this function and evaluates it inside the page.
//
// It replaces every clock a page could read (performance.now, Date, requestAnimationFrame,
// Math.random) with a virtual one that only moves when the renderer seeks. Wall-clock timers
// are not virtualized on purpose: the linter bans them in scenes, and the purity check catches
// anything that slips through.
export function installClock(cfg) {
  window.__LOOP = cfg;
  let nowMs = 0;
  const EPOCH = Date.UTC(2026, 0, 1);

  performance.now = () => nowMs;
  const RealDate = Date;
  window.Date = class extends RealDate {
    constructor(...args) {
      if (args.length) super(...args);
      else super(EPOCH + nowMs);
    }
    static now() {
      return EPOCH + nowMs;
    }
  };

  // Seeded Math.random: identical across runs. (Still order-dependent, so scenes should use rand(seed).)
  let seed = 0x2f6b9e1d;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };

  const raf = new Map();
  let rafId = 0;
  window.requestAnimationFrame = (cb) => {
    raf.set(++rafId, cb);
    return rafId;
  };
  window.cancelAnimationFrame = (id) => raf.delete(id);

  const beatLen = 60 / cfg.bpm;
  window.__ctx = (t) => ({
    t,
    fps: cfg.fps,
    frame: Math.round(t * cfg.fps),
    duration: cfg.duration,
    progress: cfg.duration ? t / cfg.duration : 0,
    bpm: cfg.bpm,
    beatLen,
    beat: (t - cfg.beatOffset) / beatLen,
    beatAt: (n) => n * beatLen + cfg.beatOffset,
    width: cfg.width,
    height: cfg.height,
  });

  window.__seek = async (t) => {
    nowMs = t * 1000;
    window.__scene.render(t, window.__ctx(t));
    const callbacks = [...raf.values()];
    raf.clear();
    for (const cb of callbacks) cb(nowMs);
    // If render swapped any image sources, wait for them so the frame never captures a half-loaded asset.
    const pending = [...document.images].filter((img) => !img.complete);
    if (pending.length) await Promise.all(pending.map((img) => img.decode().catch(() => {})));
  };
}

// Applied after the runtime audit: freezes any CSS motion so captured frames stay deterministic
// even before the linter's errors are fixed.
export const FREEZE_CSS = `
*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }
::-webkit-scrollbar { display: none; }
`;
