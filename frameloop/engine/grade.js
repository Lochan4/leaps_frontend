// The rubric. Weights sum to 1.
export const CATEGORIES = {
  motion: { weight: 0.22, ask: 'Spring feel, continuity, choreography and hierarchy of motion. Nothing pops, nothing drifts, one orchestrated move rather than scattered effects.' },
  rhythm: { weight: 0.14, ask: 'Accents and cuts land on beats, pacing breathes, no dead air, holds are deliberate and long enough to read.' },
  typography: { weight: 0.16, ask: 'Deliberate typefaces, clear scale, spacing and weights; type used as an active visual element; line lengths under 80 characters.' },
  composition: { weight: 0.16, ask: 'Hierarchy, alignment, use of space, one memorable element with everything around it quiet.' },
  color: { weight: 0.1, ask: 'Palette derived from the subject, harmony, contrast and legibility in every frame.' },
  originality: { weight: 0.14, ask: 'Does NOT read as AI-generated or templated: none of the known default looks or template chrome.' },
  polish: { weight: 0.08, ask: 'Aliasing, clipping, overflow, text cut off, blurry or broken assets, frames that look unfinished.' },
};

/**
 * overall = weighted mean, capped at (lowest category + 2) so one weak area cannot hide.
 * Hard gates cap the score regardless of taste: banned CSS / missing assets, blank frames or
 * long dead air, runtime errors or an impure render, and any critic "blocker".
 */
export function grade({ scores, issues = [], lint, dead, runtime, threshold }) {
  const cats = Object.entries(CATEGORIES).filter(([k]) => Number.isFinite(scores?.[k]));
  const gates = [];
  let overall = 0;
  if (cats.length) {
    const wsum = cats.reduce((s, [, c]) => s + c.weight, 0);
    const mean = cats.reduce((s, [k, c]) => s + c.weight * scores[k], 0) / wsum;
    const lowest = Math.min(...cats.map(([k]) => scores[k]));
    overall = Math.min(mean, lowest + 2);
  }
  if (lint?.errors?.length) {
    gates.push(`${lint.errors.length} lint error(s): ${[...new Set(lint.errors.map((e) => e.rule))].join(', ')}`);
    overall = Math.min(overall, 6);
  }
  if (dead?.errors?.length) {
    gates.push(`${dead.errors.length} dead-frame error(s): ${[...new Set(dead.errors.map((e) => e.kind))].join(', ')}`);
    overall = Math.min(overall, 6);
  }
  if (runtime?.errors?.length) {
    gates.push(`${runtime.errors.length} runtime error(s): ${[...new Set(runtime.errors.map((e) => e.rule))].join(', ')}`);
    overall = Math.min(overall, 5);
  }
  if (issues.some((i) => i.severity === 'blocker')) {
    gates.push('critic reported a blocker');
    overall = Math.min(overall, 7);
  }
  overall = Math.round(overall * 10) / 10;
  return { overall, gates, pass: overall >= threshold && gates.length === 0 };
}
