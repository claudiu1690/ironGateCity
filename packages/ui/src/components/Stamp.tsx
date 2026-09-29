import { cx } from '../format';

export type StampTone = 'success' | 'partial' | 'failure';

export interface StampProps {
  /** Success, Partial or Failure colour. */
  tone: StampTone;
  /** The printed word: Success, Partial, "2 of 3", Shift worked, Trained. */
  label: string;
  className?: string;
}

/** A rotated rubber stamp. */
export function Stamp({ tone, label, className }: StampProps) {
  const t =
    tone === 'success'
      ? 'text-success border-success'
      : tone === 'failure'
        ? 'text-failure border-failure'
        : 'text-partial border-partial';
  return (
    <span
      data-testid="stamp"
      className={cx(
        'label-caps inline-block -rotate-8 border-4 border-double bg-paper/95 px-4 py-1 text-[26px] font-semibold tracking-[0.14em] whitespace-nowrap',
        'motion-safe:animate-stamp',
        t,
        className,
      )}
    >
      {label}
    </span>
  );
}
