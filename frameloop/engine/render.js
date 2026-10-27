import fs from 'node:fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { installClock, FREEZE_CSS } from './clock.js';
import { paths, ensureDir, pageConfig } from './config.js';

export function launchBrowser() {
  return chromium.launch({
    args: [
      '--font-render-hinting=none', // identical glyph rasterization on every run
      '--disable-lcd-text',         // no subpixel colour fringes in frames
      '--force-color-profile=srgb',
      '--hide-scrollbars',
      // Without these, Chrome re-rasterizes only dirty tiles, so the same DOM can paint slightly
      // different anti-aliasing depending on which frame came before. That breaks single-frame
      // re-renders and makes the purity check fire on scenes that are actually pure.
      '--disable-partial-raster',
      '--run-all-compositor-stages-before-draw',
    ],
  });
}

const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');

/**
 * Opens a scene with the virtual clock installed and audits it before any frame is captured.
 * Returns { page, context, runtime } where runtime = { errors[], warnings[], fonts[], pure }.
 */
export async function openScene(browser, server, cfg, scene) {
  const context = await browser.newContext({
    viewport: { width: cfg.width, height: cfg.height },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const runtime = { errors: [], warnings: [], fonts: [], pure: null };
  const err = (rule, message) => runtime.errors.push({ level: 'error', rule, message });
  const warn = (rule, message) => runtime.warnings.push({ level: 'warn', rule, message });

  page.on('pageerror', (e) => err('runtime-error', e.message));
  page.on('console', (m) => { if (m.type() === 'error') warn('console-error', m.text().slice(0, 300)); });
  page.on('response', (r) => { if (r.status() >= 400) err('missing-asset', `${r.status()} ${r.url().replace(server.url, '')}`); });
  await context.route('**/*', (route) => {
    const u = route.request().url();
    if (u.startsWith(server.url) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
    err('external-request', `Blocked ${u}. Ship real assets locally in assets/; renders must not depend on the network.`);
    return route.abort();
  });

  await page.addInitScript(installClock, pageConfig(cfg, scene));
  await page.goto(`${server.url}/${scene.file}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__sceneReady !== undefined, null, { timeout: 15000 });
    await page.evaluate(() => window.__sceneReady);
  } catch (e) {
    err('contract', `Scene never became ready (did it call defineScene()?): ${e.message.split('\n')[0]}`);
    return { page, context, runtime };
  }

  // Runtime audit (before freezing CSS, so real transitions/animations are visible).
  const audit = await page.evaluate(() => {
    const out = { brokenImages: [], cssMotion: [], webAnimations: 0, fonts: [] };
    for (const img of document.images) if (!img.complete || img.naturalWidth === 0) out.brokenImages.push(img.currentSrc || img.src);
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      const tr = cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0);
      const an = cs.animationName !== 'none';
      if (tr || an) out.cssMotion.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.length ? '.' + [...el.classList].join('.') : ''}: ${tr ? 'transition' : 'animation'}`);
    }
    out.webAnimations = document.getAnimations ? document.getAnimations().length : 0;
    out.fonts = [...document.fonts].map((f) => ({ family: f.family.replace(/["']/g, ''), status: f.status, weight: f.weight }));
    return out;
  });
  for (const src of audit.brokenImages) err('broken-image', `Image failed to load: ${src}`);
  for (const m of audit.cssMotion.slice(0, 8)) err('css-motion-runtime', `Wall-clock CSS motion on ${m}. Drive it from render(t) instead.`);
  if (audit.webAnimations) err('css-motion-runtime', `${audit.webAnimations} running Web Animation(s). Drive motion from render(t).`);
  runtime.fonts = audit.fonts;
  if (audit.fonts.some((f) => f.status === 'error')) err('font-failed', `Font failed to load: ${audit.fonts.filter((f) => f.status === 'error').map((f) => f.family).join(', ')}`);
  if (!audit.fonts.some((f) => f.status === 'loaded')) warn('no-webfont', 'No web font loaded: text renders in the system default face.');

  await page.addStyleTag({ content: FREEZE_CSS });

  // Purity check: render a frame, jump elsewhere, come back. Pixels must be identical, otherwise
  // render(t) depends on history and single frames cannot be re-rendered.
  const tA = Math.min(scene.duration * 0.37, scene.duration - 1 / cfg.fps);
  const tB = Math.min(scene.duration * 0.83, scene.duration - 1 / cfg.fps);
  try {
    await seek(page, tA);
    const a1 = sha1(await page.screenshot({ type: 'png' }));
    await seek(page, tB);
    await seek(page, 0);
    await seek(page, tA);
    const a2 = sha1(await page.screenshot({ type: 'png' }));
    runtime.pure = a1 === a2;
    if (!runtime.pure) err('impure-render', `render(t) is not a pure function of t: frame at ${tA.toFixed(2)}s differs after seeking away and back. Remove accumulated state.`);
  } catch (e) {
    err('runtime-error', `render(t) threw: ${e.message.split('\n')[0]}`);
  }
  return { page, context, runtime };
}

export const seek = (page, t) => page.evaluate((tt) => window.__seek(tt), t);

/**
 * Renders frames of one scene into out/frames/<id>/f_NNNNN.png.
 * opts.frames: optional list of frame indices (re-render only those).
 */
export async function renderScene(browser, server, cfg, scene, opts = {}) {
  const started = Date.now();
  const dir = ensureDir(paths.frames(scene.id));
  if (!opts.frames) for (const f of fs.readdirSync(dir)) if (f.endsWith('.png')) fs.unlinkSync(`${dir}/${f}`);
  const { page, context, runtime } = await openScene(browser, server, cfg, scene);
  const list = opts.frames ?? Array.from({ length: scene.frames }, (_, i) => i);
  const hashes = {};
  let rendered = 0;
  if (!runtime.errors.some((e) => e.rule === 'contract')) {
    for (const n of list) {
      try {
        await seek(page, n / cfg.fps);
      } catch (e) {
        runtime.errors.push({ level: 'error', rule: 'runtime-error', message: `render(${(n / cfg.fps).toFixed(3)}) threw: ${e.message.split('\n')[0]}` });
        break;
      }
      const buf = await page.screenshot({ type: 'png', animations: 'disabled', caret: 'hide' });
      fs.writeFileSync(paths.frame(scene.id, n), buf);
      hashes[n] = sha1(buf);
      rendered++;
      if (opts.log && rendered % 30 === 0) opts.log(`${scene.id}: ${rendered}/${list.length} frames`);
    }
  }
  await context.close();
  return { runtime, rendered, hashes, ms: Date.now() - started };
}
