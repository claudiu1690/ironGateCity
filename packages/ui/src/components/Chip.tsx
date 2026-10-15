import type { ReactNode } from 'react';
import { cx } from '../format';

export interface ChipProps {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  testId?: string;
  /** A tab in a `tablist` (chat's channels): `aria-selected`; else a toggle (`aria-pressed`). */
  tab?: boolean;
  /** 11 px with less padding (chat's three channels fit a 375 px phone). Still 44 px tall. */
  small?: boolean;
  className?: string;
}

/**
 * The game's paper chip (the scoreboard's *This week · All time*, the city chips; review 7 #1: chat's
 * channels): Oswald caps in a 1.5 px ink box on paper, the current one ink-filled. 44 px tall.
 */
export function Chip({ on, onClick, children, testId, tab = false, small = false, className }: ChipProps) {
  return (
    <button
      type="button"
      role={tab ? 'tab' : undefined}
      aria-selected={tab ? on : undefined}
      aria-pressed={tab ? undefined : on}
      onClick={onClick}
      className={cx(
        'label-caps min-h-11 shrink-0 cursor-pointer border-[1.5px] border-ink whitespace-nowrap',
        small ? 'px-2.5 text-[11px]' : 'px-3 text-[12px]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol',
        on ? 'bg-ink text-paper' : 'bg-transparent text-ink hover:bg-paper-card',
        className,
      )}
      data-testid={testId}
    >
      {children}
    </button>
  );
}
