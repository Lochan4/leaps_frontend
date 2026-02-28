import { cn } from '@/lib/cn';
import styles from './Container.module.css';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Narrows content to ~860px — for editorial, centered sections */
  narrow?: boolean;
}

/**
 * Container — enforces horizontal rhythm and max-width.
 * All sections use this to align to the same grid.
 */
export function Container({ children, className, narrow }: ContainerProps) {
  return (
    <div className={cn(styles.container, narrow && styles.narrow, className)}>
      {children}
    </div>
  );
}
