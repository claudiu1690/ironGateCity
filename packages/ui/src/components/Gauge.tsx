import type { ReactNode } from 'react';
import { cx } from '../format';
import { helpMark } from './Help';

export interface GaugeProps {
  /** The label printed before the bar, in words (review 1 #3): "Energy", "XP", a rank title. */
  label: ReactNode;
  /** Accessible name, e.g. "Energy". */
  name: string;
  value: number;
  max: number;
  tone?: 'energy' | 'xp' | 'fxp';
  /** The bar's fill for `fxp`: the faction's colour (answers §8). */
  fillColor?: string;
  /** Text for assistive tech, e.g. "90 of 100, next +5 in 7:05". */
  valueText?: string;
  /** The numbers printed after the bar, e.g. "90 / 100". */
  figure?: ReactNode;
  /** A short line after the numbers in small capitals, e.g. "full at 16:21". */
  note?: ReactNode;
  labelTestId?: string;
  figureTestId?: string;
  noteTestId?: string;
  className?: string;
}

const tones = {
  energy: { text: 'text-energy', fill: 'bg-energy' },
  xp: { text: 'text-xp', fill: 'bg-xp' },
  fxp: { text: 'text-dim', fill: 'bg-dim' },
} as const;

/**
 * A thin printed bar on ink (the HUD): the label in words with the dotted mark of a note behind it,
 * the bar, then the numbers and a short note. The label and the numbers columns have fixed widths,
 * so stacked gauges line up.
 */
export function Gauge({
  label,
  name,
  value,
  max,
  tone = 'energy',
  fillColor,
  valueText,
  figure,
  note,
  labelTestId,
  figureTestId,
  noteTestId,
  className,
}: GaugeProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const t = tones[tone];
  return (
    <div
      className={cx(
        'flex min-w-0 items-center gap-2',
        // Review 2 #3: on a phone held sideways the three gauges share one row, each with its label
        // and numbers on one line over its bar.
        'short:grid short:grid-cols-[auto_minmax(0,1fr)] short:gap-x-1.5 short:gap-y-[3px]',
        className,
      )}
    >
      <span
        className={cx(
          'label-caps w-[66px] shrink-0 truncate text-[9px] leading-tight whitespace-nowrap min-[400px]:w-[92px] lg:w-auto lg:max-w-[140px] short:w-auto short:max-w-[96px]',
          helpMark,
          t.text,
        )}
        aria-hidden="true"
        data-testid={labelTestId}
      >
        {label}
      </span>
      <div
        role="meter"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={valueText}
        className="h-[5px] min-w-8 flex-1 bg-ink-2 short:col-span-2 short:row-start-2"
      >
        <div
          className={cx('h-[5px] transition-[width] duration-300', fillColor ? null : t.fill)}
          style={{ width: `${pct}%`, ...(fillColor ? { backgroundColor: fillColor } : {}) }}
        />
      </div>
      <span className="flex w-[138px] shrink-0 items-baseline gap-1.5 overflow-hidden leading-none whitespace-nowrap short:col-start-2 short:row-start-1 short:w-auto">
        {figure !== undefined && (
          <span className="font-label text-[12px] font-medium text-paper" data-testid={figureTestId}>
            {figure}
          </span>
        )}
        {note !== undefined && (
          <span
            className={cx('label-caps truncate text-[9px] short:hidden', t.text)}
            data-testid={noteTestId}
          >
            {note}
          </span>
        )}
      </span>
    </div>
  );
}
