import type { Variants } from 'framer-motion';

/**
 * Motion variant system — all animation presets for the landing page.
 * Uses intentional easing curves for a premium, refined feel.
 */

const EASE_STANDARD = [0.25, 0.1, 0.25, 1] as const;
const EASE_EXPRESSIVE = [0.16, 1, 0.3, 1] as const;

/* ── Fade up — primary reveal animation ── */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_STANDARD },
  },
};

/* ── Fade in — pure opacity ── */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: EASE_STANDARD },
  },
};

/* ── Slide from left ── */
export const slideLeft: Variants = {
  hidden: { opacity: 0, x: -36 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.75, ease: EASE_STANDARD },
  },
};

/* ── Slide from right ── */
export const slideRight: Variants = {
  hidden: { opacity: 0, x: 36 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.75, ease: EASE_STANDARD },
  },
};

/* ── Line draw — horizontal rule reveal ── */
export const drawLine: Variants = {
  hidden: { scaleX: 0 },
  visible: {
    scaleX: 1,
    transition: { duration: 0.9, ease: EASE_EXPRESSIVE },
  },
};

/* ── Stagger container — orchestrates child reveals ── */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.05,
    },
  },
};

/* ── Fast stagger — for denser lists ── */
export const staggerFast: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.0,
    },
  },
};

/* ── Scale in — subtle scale entrance ── */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: EASE_STANDARD },
  },
};
