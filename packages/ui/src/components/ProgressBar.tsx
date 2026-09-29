import { cx } from '../format';

export interface ProgressBarProps {
  /** Accessible name. */
  label: string;
  value: number;
  max: number;
  tone?: 'petrol' | 'collective' | 'xp' | 'energy' | 'ink';
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
export function ProgressBar({ label, value, max, tone = 'petrol', valueText, className }: ProgressBarProps) {
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
        className={cx('h-[5px] transition-[width] duration-300', fills[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
