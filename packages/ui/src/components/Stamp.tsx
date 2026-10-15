import { cx } from '../format';

export type StampTone = 'success' | 'partial' | 'failure';

export interface StampProps {
  /** Success, Partial or Failure colour. */
  tone: StampTone;
  /** The printed word: Success, Partial, "2 of 3", Trained. */
  label: string;
  className?: string;
  /** Animate in (default); false shows it settled (the front page reopened, screens §2.2). */
  animate?: boolean;
  /** Slice 6 (design §2.6): a colour of its own (Triumph in the faction's colour), over the tone. */
  color?: string;
}

/** A rotated rubber stamp. */
export function Stamp({ tone, label, className, animate = true, color }: StampProps) {
  const t =
    tone === 'success'
      ? 'text-success border-success'
      : tone === 'failure'
        ? 'text-failure border-failure'
        : 'text-partial border-partial';
  return (
    <span
      data-testid="stamp"
      style={color ? { color, borderColor: color } : undefined}
      className={cx(
        'label-caps inline-block -rotate-8 border-4 border-double bg-paper/95 px-4 py-1 text-[26px] font-semibold tracking-[0.14em] whitespace-nowrap',
        animate && 'motion-safe:animate-stamp',
        // Slice 5: a long stamp (*Taken to the infirmary*) is set smaller, so it stays on the picture.
        label.length > 12 && 'px-3! text-[17px]! tracking-[0.1em]! sm:text-[22px]!',
        t,
        className,
      )}
    >
      {label}
    </span>
  );
}
