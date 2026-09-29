import { cx } from '../format';

export interface GaugeProps {
  /** Short label printed beside the bar, e.g. "EN". */
  label: string;
  /** Accessible name, e.g. "Energy". */
  name: string;
  value: number;
  max: number;
  tone?: 'energy' | 'xp';
  /** Text for assistive tech, e.g. "90 of 100, next +5 in 7:05". */
  valueText?: string;
  className?: string;
}

const tones = {
  energy: { text: 'text-energy', fill: 'bg-energy' },
  xp: { text: 'text-xp', fill: 'bg-xp' },
} as const;

/** A thin printed bar (HUD). */
export function Gauge({ label, name, value, max, tone = 'energy', valueText, className }: GaugeProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const t = tones[tone];
  return (
    <div className={cx('flex items-center gap-1.5', className)}>
      <span className={cx('label-caps w-5 text-[9px]', t.text)} aria-hidden="true">
        {label}
      </span>
      <div
        role="meter"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        className="h-[5px] flex-1 bg-ink-2"
      >
        <div className={cx('h-[5px] transition-[width] duration-300', t.fill)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
