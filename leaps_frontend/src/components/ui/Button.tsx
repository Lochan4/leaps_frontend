import { cn } from '@/lib/cn';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'primaryInvert' | 'outline';

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: ButtonVariant;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

/**
 * Button — three variants:
 * - primary:       navy background, amber text (for light sections)
 * - primaryInvert: amber background, navy text (for dark sections)
 * - outline:       transparent, themed border (adapts to section via CSS vars)
 */
export function Button({
  children,
  href,
  variant = 'primary',
  className,
  onClick,
  type = 'button',
  disabled,
}: ButtonProps) {
  const cls = cn(styles.btn, styles[variant], className);

  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
