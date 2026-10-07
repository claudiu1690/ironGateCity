import { cx } from '../format';

/** A small padlock: a locked pin's mark on a home city's map and the Places list's (review 4, ADR 0076). */
export function LockMark({ className }: { className?: string }) {
  return (
    <svg
      width="10"
      height="12"
      viewBox="0 0 10 12"
      aria-hidden="true"
      className={cx('shrink-0', className)}
      data-testid="lock-mark"
    >
      <path d="M2.5 5V3.5a2.5 2.5 0 0 1 5 0V5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1" y="5" width="8" height="6.5" fill="currentColor" />
    </svg>
  );
}
