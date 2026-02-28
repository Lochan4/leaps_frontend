import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import styles from './Section.module.css';

export type SectionTheme = 'light' | 'dark';

interface SectionProps {
  id?: string;
  theme?: SectionTheme;
  className?: string;
  children: React.ReactNode;
}

/**
 * Section wrapper — handles light/dark theme switching via CSS custom property
 * overrides. All child components reference semantic tokens (--fg, --fg-muted,
 * --surface, --rule-mid, etc.) so they adapt automatically to the section theme.
 */
export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ id, theme = 'light', className, children }, ref) => (
    <section
      ref={ref}
      id={id}
      data-theme={theme}
      className={cn(styles.section, styles[theme], className)}
    >
      {children}
    </section>
  )
);

Section.displayName = 'Section';
