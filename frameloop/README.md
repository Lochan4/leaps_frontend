# frameloop

A headless render loop for motion pieces built as web pages. Playwright renders every frame, ffmpeg measures every frame, and Claude watches the frames, critiques them and rewrites failing scenes. It loops until every scene scores 8/10 or better.

```
1 · Render engine            2 · Reference + assets           3 · Self-critique
Node, ffmpeg, Playwright     real local assets                watch own frames (contact sheet + evidence)
virtual clock, pure render   closed-form springs              critique (Opus 5.5, effort xhigh)
Chrome frames -> PNG -> MP4  ban basic CSS (linter)           hunt dead frames, re-render them
                             synthesized audio                revise the scene, re-render
                             cuts locked to beat              every scene >= 8/10
        ^                                                              |
        +----------------------- loop until every scene passes --------+
```

## Setup

Requires Node 20+ and ffmpeg on your PATH (`brew install ffmpeg` or `apt install ffmpeg`).

```
npm install
npm run setup                      # downloads Playwright's Chromium
export ANTHROPIC_API_KEY=sk-ant-...
```

## Commands

```
npm run lint          ban-basic-CSS, asset and contract checks on every scene
npm run preview       serve scenes for live playback in your own browser
npm run render        render all frames, encode scenes and the film (no critique)
npm run analyze       re-run the ffmpeg frame analysis on the last render
npm run loop          the full loop
npm run loop:draft    the full loop at half resolution (faster, cheaper iterations)
npm run loop:offline  measurements only, no Claude calls (tests the pipeline)
```

Flags work with any command: `--scene id[,id]`, `--draft`, `--max-iter N`, `--threshold N`, `--no-ai`. With npm, put them after `--`, e.g. `npm run loop -- --scene neap-hero --max-iter 6`.

## What one round does, per scene

1. **Lint.** Static checks on the scene and its linked CSS. Hard errors: CSS `transition`/`animation`/`@keyframes`, `element.animate()`, timers, `Date.now()`/`performance.now()`, a default typeface as the first font-family, stock grey shadows, purple-indigo gradients, placeholder content, external or missing assets. Warnings: generated-design tells (caps eyebrows, `·` meta strings, `→` on links, spaced em-dash labels, emoji, one border-radius everywhere, framework palette colours, cream/terracotta/near-black defaults).
2. **Render.** Opens the scene in headless Chromium with a virtual clock, audits it at runtime (broken images, failed fonts, live CSS motion, blocked network requests), runs a purity check, then captures every frame to `out/frames/<scene>/`.
3. **Measure.** One ffmpeg pass over all frames: `signalstats` (YDIF motion energy, luma range), `entropy`, `freezedetect`.
4. **Hunt dead frames.** Flags blank frames, frozen or crawling stretches (dead air, including spring tails creeping by sub-pixels) and one-frame pops. Suspect frames are re-rendered: if the pixels change it was a capture glitch and the new frames are kept; if they come back identical it is a design fault and goes to the critic.
5. **Watch.** Builds a labelled 3x4 contact sheet and picks evidence frames (worst dead frames first, then beat accents).
6. **Critique.** Claude scores 7 categories (motion, rhythm, typography, composition, colour, originality, polish) with frame-numbered issues and fixes, plus a list of what to keep.
7. **Grade.** Weighted mean, capped at the lowest category + 2. Hard gates cap the score whatever the taste verdict: lint errors (6), dead-frame errors (6), runtime errors or an impure render (5), a critic "blocker" (7). Pass = score >= threshold with no gates.
8. **Revise.** A failing scene is rewritten from its best-scoring version. A revision that scores worse is rolled back and listed as "do not repeat" for the next attempt, so the loop never regresses. Passing scenes are frozen.

At the end every scene is left on its best version, frames are re-rendered if needed, and `out/film.mp4` is assembled with the soundtrack.

## Writing a scene

A scene is an HTML file in `scenes/`, listed in `loop.config.js` with its length in beats (cuts land on the beat grid) and a one-paragraph brief the critic judges against.

```html
<script type="module">
import { defineScene, springAt, presets } from '../engine/motion.js';

defineScene({
  setup(ctx) { /* optional, once, after fonts and images load */ },
  render(t, ctx) {
    // PURE function of t: set every animated property from t alone.
    const p = springAt(t, ctx.beatAt(2), presets.snappy); // lands on beat 2
    el.style.transform = `translateY(${(1 - p) * 105}%)`;
  },
});
</script>
```

`ctx` gives `t, frame, fps, duration, progress, bpm, beatLen, beat, beatAt(n), width, height`. `beatAt(n)` is already aligned to the global cut grid.

Rules the loop enforces:

- **No state between frames.** The loop renders frames out of order and re-renders single frames. The purity check renders a frame, seeks away and back, and fails the scene if the pixels differ.
- **Springs, not CSS easing.** `spring()` is the analytic solution of a damped oscillator, so any frame is computable on its own. It snaps to exactly 1 at rest, which removes crawling spring tails. Presets: `snappy`, `gentle`, `bouncy`, `heavy`, or pass `{ stiffness, damping, mass, velocity }`.
- **Real local assets.** Put fonts, images and video in `assets/`. Network requests are blocked during renders.
- **Use `rand(seed)` instead of `Math.random()`** for anything random.
- Design at a fixed stage size and scale it in `setup` (see the demo scenes), so `--draft` renders match full resolution.

## Outputs

```
out/frames/<scene>/f_00000.png   every frame of the current version
out/analysis/<scene>/            metrics, contact sheets, evidence frames, critique JSON per round
out/history/<scene>/vN.html      every version the loop produced (v0 = your original)
out/scenes/<scene>.mp4           per-scene video
out/audio/track.wav              synthesized soundtrack on the beat grid
out/film.mp4                     the assembled film
out/report.md / report.json      scores per round, gates, open issues
```

## Notes

- **Determinism.** Chromium is launched with `--disable-partial-raster` and `--run-all-compositor-stages-before-draw`. Without them Chrome repaints only dirty tiles, so the same DOM can rasterize slightly differently depending on the previous frame. That breaks single-frame re-renders and makes the purity check fire on pure scenes.
- **Cost.** Each round makes up to two Opus calls (critique, then revise) per failing scene, with images. Worst case for 3 scenes over 4 rounds is 24 calls. Use `loop:draft` while iterating.
- **Offline mode** (`--no-ai`) can only score motion, rhythm, originality (from lint) and polish. It cannot judge taste and never rewrites; use it to test the pipeline.
- **Tuning.** Dead-frame thresholds live in `loop.config.js` under `dead`. Beat-sync onsets are evidence for the critic, not a gate; they are approximate when a scene has continuous background motion.
- The demo scenes are for **Neap**, a fictional tide-window app for sea kayakers, so the critic has a concrete brief to judge. Replace them with your own. Fonts are Big Shoulders Display and Newsreader (SIL Open Font License, included in `assets/fonts/`).
