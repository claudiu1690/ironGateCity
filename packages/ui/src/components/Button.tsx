import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../format';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'outline-light';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper hover:bg-ink-2 disabled:bg-faint disabled:text-paper',
  secondary: 'bg-ink-2 text-paper hover:bg-ink disabled:bg-faint disabled:text-paper',
  outline:
    'border-[1.5px] border-ink bg-transparent text-ink hover:bg-ink hover:text-paper disabled:border-faint disabled:text-muted disabled:hover:bg-transparent',
  /** For dark (ink) surfaces. */
  'outline-light':
    'border-[1.5px] border-dim bg-transparent text-dim hover:border-paper hover:text-paper disabled:border-ink-2 disabled:text-ink-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Shows a busy state and blocks repeat taps. */
  pending?: boolean;
}

/** A real button with a 44 px minimum touch target. */
export function Button({
  variant = 'primary',
  pending,
  disabled,
  className,
  children,
  type,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={cx(
        'label-caps inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 px-4 text-[13px] transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol disabled:cursor-not-allowed',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
