import { copy } from '@irongate/content/copy';
import { cx } from '../format';

export type FactionTab = 'orders' | 'events' | 'members' | 'scoreboard' | 'chat';
export const FACTION_TABS: readonly FactionTab[] = ['orders', 'events', 'members', 'scoreboard', 'chat'];

export interface FactionTabsProps {
  current: FactionTab;
  onGo: (tab: FactionTab) => void;
  /** A dot on a part (the Events tab while a result waits; Chat while a line is for you). */
  dots?: Partial<Record<FactionTab, boolean>>;
  /**
   * The parts shown (default all five). Desktop: four, Chat is the column at the right; chat hidden
   * from Me: no Chat chip (screens §2, §10).
   */
  tabs?: readonly FactionTab[];
  className?: string;
}

/**
 * Slice 6 (screens §2): the Faction tab's five parts as a `TramBar`-style strip, 44 px, Oswald caps
 * on ink; the current part inverted (paper on ink). Real buttons, one tap each.
 */
export function FactionTabs({ current, onGo, dots, tabs = FACTION_TABS, className }: FactionTabsProps) {
  return (
    <nav
      aria-label={copy.together.tabs.faction}
      className={cx('grid min-h-11 items-stretch gap-px bg-ink-2', className)}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      data-testid="faction-tabs"
    >
      {tabs.map((t) => {
        const on = t === current;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onGo(t)}
            aria-current={on ? 'page' : undefined}
            className={cx(
              // Five chips at 360 px: *Scoreboard* keeps clear of its cell's edges with less tracking.
              'label-caps relative flex min-h-11 min-w-0 cursor-pointer items-center justify-center px-0.5 py-1 text-center text-[10.5px] leading-[1.15] tracking-[0.04em]! break-words sm:text-[11px] sm:tracking-[0.08em]!',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-paper',
              on ? 'bg-paper text-ink' : 'bg-ink text-paper hover:bg-ink-2',
            )}
            data-testid={`faction-tab-${t}`}
          >
            {copy.together.tabs[t]}
            {dots?.[t] && !on && (
              <span
                className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-failure"
                aria-label="new"
                data-testid={`faction-tab-dot-${t}`}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
