import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.js';

// Default typefaces: fine as fallbacks, banned as the first choice.
const DEFAULT_FAMILIES = [
  'inter', 'roboto', 'arial', 'helvetica', 'helvetica neue', 'open sans', 'poppins', 'montserrat', 'lato',
  'system-ui', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'sans-serif', 'serif', 'ui-sans-serif',
  'space grotesk', 'times new roman',
];
// Tailwind 500/600 defaults: a strong "generated" tell when used verbatim.
const TAILWIND = ['#3b82f6', '#2563eb', '#6366f1', '#4f46e5', '#8b5cf6', '#7c3aed', '#a855f7', '#9333ea', '#ec4899', '#db2777', '#10b981', '#059669', '#14b8a6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#64748b'];
const CLICHES = [
  ['#f4f1ea', 'warm cream background (generated-design default)'],
  ['#d97757', 'terracotta/clay accent (generated-design default)'],
  ['#0b0b0b', 'tinted near-black standing in for black'],
  ['#111111', 'tinted near-black standing in for black'],
];
const PLACEHOLDERS = /lorem ipsum|placeholder\.com|placehold\.co|picsum\.photos|source\.unsplash|dummyimage|via\.placeholder|\byour company\b|\bacme\b|\bjohn doe\b|\bjane doe\b|\bproduct name\b/i;

function hexToRgb(h) {
  let x = h.slice(1);
  if (x.length === 3) x = [...x].map((c) => c + c).join('');
  const n = parseInt(x.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;
const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));

/** Pulls the parts of a scene that need linting. Linked local CSS is linted too (attributed to its own file). */
export function extractParts(htmlPath, html) {
  const parts = { css: [], js: [], text: '', refs: [] };
  const dir = path.dirname(htmlPath);
  html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (m, body, idx) => {
    parts.css.push({ file: htmlPath, text: stripCssComments(body), offset: lineOf(html, idx) - 1 });
    return m;
  });
  html.replace(/style="([^"]*)"/gi, (m, body, idx) => {
    parts.css.push({ file: htmlPath, text: body, offset: lineOf(html, idx) - 1 });
    return m;
  });
  html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (m, body, idx) => {
    parts.js.push({ file: htmlPath, text: body, offset: lineOf(html, idx) - 1 });
    return m;
  });
  const bodyHtml = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
  parts.text = bodyHtml.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');

  const addRef = (ref, file, idx, text) => {
    if (!ref || ref.startsWith('#') || ref.startsWith('data:') || ref.startsWith('blob:') || ref.startsWith('mailto:')) return;
    parts.refs.push({ ref, file, line: lineOf(text, idx), base: path.dirname(file) });
  };
  html.replace(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi, (m, ref, idx) => { addRef(ref, htmlPath, idx, html); return m; });
  html.replace(/\bfrom\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g, (m, a, b, idx) => { addRef(a || b, htmlPath, idx, html); return m; });
  html.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (m, ref, idx) => { addRef(ref, htmlPath, idx, html); return m; });

  for (const m of html.matchAll(/<link[^>]+href=["']([^"']+\.css)["'][^>]*>/gi)) {
    const ref = m[1];
    if (/^(https?:)?\/\//.test(ref)) continue;
    const cssPath = path.resolve(dir, ref);
    if (!fs.existsSync(cssPath)) continue;
    const css = fs.readFileSync(cssPath, 'utf8');
    parts.css.push({ file: cssPath, text: stripCssComments(css), offset: 0, linked: true });
    css.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (mm, r, idx) => { addRef(r, cssPath, idx, css); return mm; });
  }
  return parts;
}

export function lintScene(scene, overrideHtml) {
  const htmlPath = path.join(ROOT, scene.file);
  const findings = [];
  if (!fs.existsSync(htmlPath)) {
    findings.push({ level: 'error', rule: 'missing-scene', message: `Scene file not found: ${scene.file}` });
    return summarize(findings);
  }
  const html = overrideHtml ?? fs.readFileSync(htmlPath, 'utf8');
  const parts = extractParts(htmlPath, html);
  const rel = (f) => path.relative(ROOT, f);
  const add = (level, rule, message, file, line) => findings.push({ level, rule, message, file: file && rel(file), line });

  // ---- CSS ----
  const radii = new Map();
  for (const block of parts.css) {
    const t = block.text;
    const at = (idx) => block.offset + lineOf(t, idx);
    for (const m of t.matchAll(/(^|[;{\s])(transition(?:-[a-z-]+)?)\s*:\s*([^;}]*)/gm)) {
      if (/^\s*none\s*$/i.test(m[3])) continue;
      add('error', 'css-transition', `"${m[2]}: ${m[3].trim()}" is wall-clock motion. Animate from render(t) with springs.`, block.file, at(m.index));
    }
    for (const m of t.matchAll(/(^|[;{\s])(animation(?:-[a-z-]+)?)\s*:\s*([^;}]*)/gm)) {
      if (/^\s*none\s*$/i.test(m[3])) continue;
      add('error', 'css-animation', `"${m[2]}" is wall-clock motion. Animate from render(t) with springs.`, block.file, at(m.index));
    }
    for (const m of t.matchAll(/@keyframes\s+([\w-]+)/g)) add('error', 'css-keyframes', `@keyframes ${m[1]}: keyframe animations cannot be seeked frame-accurately.`, block.file, at(m.index));
    for (const m of t.matchAll(/font-family\s*:\s*([^;}]+)/g)) {
      const first = m[1].split(',')[0].trim().replace(/["']/g, '').toLowerCase();
      if (DEFAULT_FAMILIES.includes(first)) add('error', 'default-typeface', `font-family starts with "${first}", a default face. Choose a typeface for this brief and ship it in assets/fonts.`, block.file, at(m.index));
    }
    for (const m of t.matchAll(/box-shadow\s*:\s*([^;}]+)/g)) {
      if (/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0?\.(05|08|1|10|12|15)\s*\)/.test(m[1]) || /\b0\s+(1px\s+3px|1px\s+2px|4px\s+6px|10px\s+15px|20px\s+25px)\b/.test(m[1])) {
        add('error', 'stock-shadow', `Stock soft shadow "${m[1].trim()}". Every card under the same grey blur is the SaaS-kit tell.`, block.file, at(m.index));
      }
    }
    for (const m of t.matchAll(/(linear|radial|conic)-gradient\(([^;]+)/g)) {
      for (const hex of m[2].match(/#[0-9a-f]{3,6}\b/gi) || []) {
        const [h, s, l] = rgbToHsl(hexToRgb(hex));
        if (h >= 235 && h <= 290 && s > 0.35 && l > 0.3 && l < 0.8) {
          add('error', 'ai-gradient', `Purple/indigo gradient stop ${hex}: the most recognisable generated-site gradient.`, block.file, at(m.index));
          break;
        }
      }
    }
    for (const m of t.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)) {
      const hex = m[0].toLowerCase();
      if (TAILWIND.includes(hex)) add('warn', 'framework-palette', `${hex} is a stock framework palette colour. Derive colour from the subject.`, block.file, at(m.index));
      const rgb = hexToRgb(hex);
      for (const [c, why] of CLICHES) if (dist(rgb, hexToRgb(c)) < 20) add('warn', 'cliche-palette', `${hex} reads as ${why}.`, block.file, at(m.index));
    }
    for (const m of t.matchAll(/backdrop-filter\s*:\s*[^;]*blur/g)) add('warn', 'glassmorphism', 'Frosted-glass blur panel: a default decorative move.', block.file, at(m.index));
    for (const m of t.matchAll(/text-transform\s*:\s*uppercase/g)) add('warn', 'caps-label', 'Uppercase text-transform: tracked-out caps labels are template chrome.', block.file, at(m.index));
    for (const m of t.matchAll(/border-radius\s*:\s*([^;}]+)/g)) radii.set(m[1].trim(), (radii.get(m[1].trim()) || 0) + 1);
  }
  const radiusList = [...radii.entries()].sort((a, b) => b[1] - a[1]);
  if (radiusList.length && radiusList[0][1] >= 4 && radiusList.length <= 2) {
    add('warn', 'one-radius', `border-radius ${radiusList[0][0]} used ${radiusList[0][1]}x: one radius on everything ignores hierarchy.`);
  }

  // ---- JS: the scene contract and wall-clock bans ----
  const allJs = parts.js.map((b) => b.text).join('\n');
  if (!/defineScene\s*\(/.test(allJs)) add('error', 'contract', 'Scene must call defineScene({ render(t, ctx) }) from engine/motion.js.', htmlPath);
  for (const block of parts.js) {
    const t = block.text;
    const at = (idx) => block.offset + lineOf(t, idx);
    for (const m of t.matchAll(/\b(setTimeout|setInterval|requestAnimationFrame)\s*\(/g)) add('error', 'wall-clock', `${m[1]}() drives motion from wall-clock time. Compute everything from t in render().`, htmlPath, at(m.index));
    for (const m of t.matchAll(/\b(Date\.now|performance\.now)\s*\(|new Date\(\s*\)/g)) add('error', 'wall-clock', `${m[0]} reads wall-clock time. Use t / ctx.`, htmlPath, at(m.index));
    for (const m of t.matchAll(/\.animate\s*\(/g)) add('error', 'web-animations', 'element.animate() is wall-clock motion. Use springs in render(t).', htmlPath, at(m.index));
    for (const m of t.matchAll(/\.style\.(transition|animation)\b/g)) add('error', 'css-transition', `Setting style.${m[1]} from JS is still wall-clock motion.`, htmlPath, at(m.index));
    for (const m of t.matchAll(/Math\.random\s*\(/g)) add('warn', 'unseeded-random', 'Math.random() is order-dependent across frames. Use rand(seed) from motion.js.', htmlPath, at(m.index));
  }

  // ---- visible copy ----
  const text = parts.text;
  if (PLACEHOLDERS.test(text) || PLACEHOLDERS.test(html.replace(/<script[\s\S]*?<\/script>/gi, ''))) add('error', 'placeholder-content', 'Placeholder content or stock placeholder service. Use real copy and real assets.', htmlPath);
  if (/\s·\s/.test(text)) add('warn', 'middot-meta', 'Meta strings joined with " · " are template chrome.', htmlPath);
  if (/→|->/.test(text)) add('warn', 'arrow-cta', 'Arrow appended to link/button text is a template tell.', htmlPath);
  if (/\s—\s/.test(text)) add('warn', 'spaced-emdash', 'Labels built as "WORD — fragment" are template chrome.', htmlPath);
  if (/\p{Extended_Pictographic}/u.test(text)) add('warn', 'emoji', 'Emoji used as icons/decoration.', htmlPath);

  // ---- assets: real, local, present ----
  for (const r of parts.refs) {
    if (/^(https?:)?\/\//i.test(r.ref)) {
      add('error', 'external-asset', `External asset ${r.ref}. Download it into assets/ (renders must not touch the network).`, r.file, r.line);
      continue;
    }
    const clean = r.ref.split(/[?#]/)[0];
    const abs = clean.startsWith('/') ? path.join(ROOT, clean) : path.resolve(r.base, clean);
    if (!fs.existsSync(abs)) add('error', 'missing-asset', `Referenced file does not exist: ${r.ref}`, r.file, r.line);
  }
  return summarize(findings);
}

function summarize(findings) {
  const seen = new Set();
  const unique = findings.filter((f) => {
    const k = `${f.rule}|${f.file}|${f.line}|${f.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return { findings: unique, errors: unique.filter((f) => f.level === 'error'), warnings: unique.filter((f) => f.level === 'warn') };
}

export function formatFinding(f) {
  const where = f.file ? ` (${f.file}${f.line ? ':' + f.line : ''})` : '';
  return `${f.level === 'error' ? 'ERROR' : 'warn '} ${f.rule}: ${f.message}${where}`;
}
