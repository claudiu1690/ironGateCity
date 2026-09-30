import { cx } from '../format';

export interface ProgressBarProps {
  /** Accessible name. */
  label: string;
  value: number;
  max: number;
  tone?: 'petrol' | 'collective' | 'xp' | 'energy' | 'ink';
  /** A fill colour in place of the tone (the faction's colour for Faction XP, review 1). */
  color?: string;
  valueText?: string;
  className?: string;
}

const fills = {
  petrol: 'bg-petrol',
  collective: 'bg-collective',
  xp: 'bg-xp',
  energy: 'bg-energy',
  ink: 'bg-ink',
} as const;

/** A thin printed progress bar on paper. */
export function ProgressBar({
  label,
  value,
  max,
  tone = 'petrol',
  color,
  valueText,
  className,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
      aria-valuetext={valueText}
      className={cx('h-[5px] w-full bg-track', className)}
    >
      <div
        className={cx('h-[5px] transition-[width] duration-300', color ? null : fills[tone])}
        style={{ width: `${pct}%`, ...(color ? { backgroundColor: color } : {}) }}
      />
    </div>
  );
}
