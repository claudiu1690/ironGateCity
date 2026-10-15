import { copy } from '@irongate/content/copy';
import type { FactionId } from '@irongate/rules';
import { cx } from '../format';
import { FACTION_STYLE } from './FactionCrest';

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
  /** The faction whose 2 px accent line sits above the current cell's ink bar (an accent, never the cue). */
  factionId?: FactionId;
  className?: string;
}

/**
 * Review 7 #1, direction A (*The Branch Office*; screens §2): the five parts as a ruled strip on paper.
 * Equal 44 px cells on a phone, 150 px cells left-aligned from 1024 px. Labels are words only, Oswald
 * 11 px caps in `muted` (5.9:1); the cells are divided by 1 px `muted` rules (5.9:1, above the 3:1
 * floor) over a 1 px ink rule. The current part carries three cues: ink text at weight 600, the
 * paper-card fill, and a 3 px ink bar on the row's rule touching the panel (14:1), with the faction's
 * 2 px line just above it. Real buttons, one tap each; `aria-current="page"`.
 */
export function FactionTabs({ current, onGo, dots, tabs = FACTION_TABS, factionId, className }: FactionTabsProps) {
  return (
    <nav
      aria-label={copy.together.tabs.faction}
      className={cx('grid min-h-11 items-stretch border-b border-ink bg-paper lg:flex', className)}
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
              'label-caps relative flex min-h-11 min-w-0 cursor-pointer items-center justify-center px-0.5 py-1 text-center text-[11px] leading-[1.15] tracking-[0.06em]! break-words sm:tracking-[0.08em]! lg:w-[150px] lg:flex-none lg:text-[12px] lg:tracking-[0.1em]!',
              // The dividers: 1 px muted between cells (5.9:1); on a desktop the last cell closes the row.
              'border-r border-muted last:border-r-0 lg:last:border-r',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-petrol',
              on ? 'bg-paper-card font-semibold text-ink' : 'font-normal text-muted hover:bg-paper-card hover:text-ink',
            )}
            data-testid={`faction-tab-${t}`}
            data-on={on ? 'true' : undefined}
          >
            {copy.together.tabs[t]}
            {dots?.[t] && !on && (
              <span
                className="ml-1 inline-block size-1.5 shrink-0 rounded-full bg-failure"
                aria-label="new"
                data-testid={`faction-tab-dot-${t}`}
              />
            )}
            {on && (
              <>
                {/* The faction's accent line, just above the bar (never the cue on its own). */}
                {factionId && (
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-[2px] h-[2px]"
                    style={{ background: FACTION_STYLE[factionId].color }}
                    data-testid="faction-tab-accent"
                  />
                )}
                {/* The 3 px ink bar, laid on the row's rule so it touches the panel below. */}
                <span aria-hidden className="absolute inset-x-0 -bottom-px h-[3px] bg-ink" data-testid="faction-tab-bar" />
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}
