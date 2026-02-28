import { cn } from '@/lib/cn';
import styles from './Label.module.css';

interface LabelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Label — the eyebrow text above headlines.
 * Uppercase, wide letter-spacing, uses section's --fg-muted token.
 */
export function Label({ children, className }: LabelProps) {
  return (
    <div className={cn(styles.label, className)}>
      {children}
    </div>
  );
}
