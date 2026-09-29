import { cx } from '../format';

export interface StampProps {
  outcome: 'success' | 'partial';
  /** Overrides the printed word (e.g. "2 of 3" in slice 1). */
  label?: string;
  className?: string;
}

const LABEL = { success: 'Success', partial: 'Partial' } as const;

/** A rotated rubber stamp. */
export function Stamp({ outcome, label, className }: StampProps) {
  const tone = outcome === 'success' ? 'text-success border-success' : 'text-partial border-partial';
  return (
    <span
      data-testid="stamp"
      className={cx(
        'label-caps inline-block -rotate-8 border-4 border-double bg-paper/95 px-4 py-1 text-[28px] font-semibold tracking-[0.16em] whitespace-nowrap',
        'motion-safe:animate-stamp',
        tone,
        className,
      )}
    >
      {label ?? LABEL[outcome]}
    </span>
  );
}
