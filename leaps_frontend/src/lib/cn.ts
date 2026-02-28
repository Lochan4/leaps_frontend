/**
 * Classname utility — merges conditional class strings cleanly.
 * Lightweight alternative to clsx for this project's needs.
 */
export function cn(...classes: (string | undefined | null | false | 0)[]): string {
  return classes.filter(Boolean).join(' ');
}
