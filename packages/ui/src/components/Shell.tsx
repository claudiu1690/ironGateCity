import { copy } from '@irongate/content/copy';
import type { CharacterView, StatPointTarget } from '@irongate/rules';
import { useId, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { cx } from '../format';

export type TabId = 'map' | 'paper' | 'dossier' | 'faction' | 'me';

export interface TabItem {
  id: TabId;
  label: string;
  href: string;
  disabled?: boolean;
  /** A dot: the paper is due, stat points wait. */
  dot?: boolean;
}

const ICONS: Record<TabId, ReactNode> = {
  map: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14" />,
  paper: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M7 8h10M7 12h6M7 16h6M15 12h2v4h-2z" />
    </>
  ),
  dossier: <path d="M3 6h6l2 2h10v11H3z" />,
  faction: <path d="M5 21V4h11l-2 4 2 4H5" />,
  me: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
};

export interface TabBarProps {
  items: TabItem[];
  active: TabId;
  /** Client-side navigation; the links stay real links. */
  onNavigate: (href: string) => void;
}

/**
 * The bottom tab bar on phones (mockups MobileCity, MobilePaper) and a floating dock on wide screens
 * (City). Disabled tabs are shown with "Soon".
 */
export function TabBar({ items, active, onNavigate }: TabBarProps) {
  return (
    <nav
      aria-label="Main"
      // The desktop dock floats over the city map: its first view keeps every pin clear (QA M2).
      data-map-overlay="bottom"
      className={cx(
        'fixed inset-x-0 bottom-0 z-20 flex h-16 border-t border-ink-2 bg-ink pb-[env(safe-area-inset-bottom)]',
        'lg:inset-x-auto lg:bottom-12 lg:left-[calc(50%-210px)] lg:h-auto lg:border-0 lg:shadow-[0_0_0_1px_var(--color-paper),0_10px_30px_rgb(0_0_0/0.5)]',
        // Review 2 #3: a phone held sideways keeps its height for the map: a rail down the left.
        'short:inset-y-0 short:right-auto short:left-0 short:h-auto short:w-[calc(64px+env(safe-area-inset-left))] short:flex-col short:border-t-0 short:border-r short:pb-0 short:pl-[env(safe-area-inset-left)]',
      )}
    >
      {items.map((t) => {
        const on = t.id === active;
        const body = (
          <>
            <span className="relative">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                {ICONS[t.id]}
              </svg>
              {t.dot && (
                <span
                  className="absolute -top-1 -right-1.5 size-2 rounded-full bg-collective ring-2 ring-ink"
                  data-testid={`tab-dot-${t.id}`}
                />
              )}
            </span>
            <span>{t.label}</span>
            {t.disabled && <span className="text-[8px] tracking-[0.1em] text-faint">Soon</span>}
          </>
        );
        const cls = cx(
          'label-caps flex min-h-14 flex-1 flex-col items-center justify-center gap-[3px] text-[10px] tracking-[0.12em] lg:w-[84px] lg:flex-none lg:py-2 short:min-h-11 short:tracking-[0.06em]',
          on
            ? 'text-paper shadow-[inset_0_3px_0_var(--color-paper)] lg:bg-paper lg:text-ink lg:shadow-none short:shadow-[inset_3px_0_0_var(--color-paper)]'
            : 'text-dim',
        );
        if (t.disabled) {
          return (
            <span
              key={t.id}
              role="link"
              aria-disabled="true"
              className={cx(cls, 'cursor-not-allowed opacity-60')}
            >
              {body}
            </span>
          );
        }
        return (
          <a
            key={t.id}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            onClick={(e: MouseEvent) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              onNavigate(t.href);
            }}
            className={cx(
              cls,
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-paper',
            )}
          >
            {body}
          </a>
        );
      })}
    </nav>
  );
}

export interface StatPointsPanelProps {
  pending: number;
  level: number;
  stats: { str: number; int: number; agi: number };
  /** Review 1 (§5.3): the counts behind the lead line and the stat lines; absent: the cards alone. */
  guide?: CharacterView['statGuide'];
  onPlace: (stat: StatPointTarget) => void;
  placing?: StatPointTarget | null;
  onLater?: () => void;
  /**
   * The heading line; defaults to *Level 4 · one point to place* (*one more to place* after a
   * placement). Null leaves it out (a sheet whose title says it).
   */
  title?: string | null;
  tone?: 'paper' | 'ink';
  /**
   * Review 5 (answers §3.2): the last point placed, for *Strength 9 · +1*. Absent: the panel notes
   * it itself, from the stat that rose while it was open.
   */
  placed?: { stat: StatPointTarget; value: number } | null;
}

const PICK = ['str', 'int', 'agi'] as const;
type Pick3 = (typeof PICK)[number];

/**
 * §5.3 (review 1, answers §7; review 5, answers §3): one tap per point, on a paper card per stat in
 * the ticket's style. The choice explains itself: a lead line from the residence city's actions, each
 * card's own line (which actions here use it, what it opens later) and its tags (*Most used here*,
 * *Your best*), and the Charisma footer. Each tap is its own idempotency key (caller). On an ink
 * surface (`tone: 'ink'`) the cards stay paper, the ticket-on-modal pattern.
 */
export function StatPointsPanel({
  pending,
  level,
  stats,
  guide,
  onPlace,
  placing,
  onLater,
  title,
  tone = 'paper',
  placed: placedProp,
}: StatPointsPanelProps) {
  // The stat that rose while the panel was open: *Strength 9 · +1* (answers §3.2, the Placed state).
  const now = `${stats.str}|${stats.int}|${stats.agi}`;
  const [seen, setSeen] = useState({ now, stats });
  const [rose, setRose] = useState<{ stat: Pick3; value: number } | null>(null);
  if (seen.now !== now) {
    const up = PICK.find((s) => stats[s] > seen.stats[s]);
    setRose(up ? { stat: up, value: stats[up] } : null);
    setSeen({ now, stats });
  }
  const placed = placedProp === undefined ? rose : placedProp;
  if (pending <= 0) return null;
  const ink = tone === 'ink';
  const sc = copy.statChoice;
  const muted = ink ? 'text-dim' : 'text-text-2';
  const heading = title === undefined ? copy.levelPointsToPlace(level, pending, !!placed) : title;
  return (
    <div className="flex flex-col gap-2" data-testid="stat-points">
      {heading && (
        <span className={cx('font-body text-[15px] font-semibold', ink ? 'text-paper' : 'text-ink')}>
          {heading}
        </span>
      )}
      {guide && (
        <p
          className={cx('font-body text-[13px] leading-snug', ink ? 'text-paper' : 'text-ink')}
          data-testid="stat-lead"
        >
          {sc.lead(
            guide.cityName,
            copy.statNames[guide.lead],
            guide.counts[guide.lead],
            guide.total,
            copy.statNames[guide.best.stat],
            guide.best.value,
            guide.best.stat === guide.lead,
          )}
        </p>
      )}
      <div className="flex flex-col gap-2" role="group" aria-label={copy.statChoice.cards}>
        {PICK.map((s) => {
          const tags: Array<'mostUsed' | 'best'> = [];
          if (guide?.lead === s) tags.push('mostUsed');
          if (guide?.best.stat === s) tags.push('best');
          return (
            <StatCard
              key={s}
              stat={s}
              value={stats[s]}
              line={guide ? sc[s](guide.counts[s], guide.total) : undefined}
              tags={tags}
              state={
                placing === s
                  ? 'placing'
                  : placing
                    ? 'dimmed'
                    : placed?.stat === s && placed.value === stats[s]
                      ? 'placed'
                      : 'ready'
              }
              onPlace={() => onPlace(s)}
              onInk={ink}
            />
          );
        })}
      </div>
      {guide && <p className={cx('font-body text-[12px] italic', muted)}>{sc.footer}</p>}
      {onLater && (
        <button
          type="button"
          onClick={onLater}
          className={cx(
            'min-h-11 cursor-pointer self-start font-body text-[13px] underline decoration-dotted underline-offset-[3px]',
            ink ? 'text-dim' : 'text-text-2',
          )}
        >
          {copy.statChoice.later}
        </button>
      )}
    </div>
  );
}

export interface StatCardProps {
  stat: Pick3;
  /** The stat before the point. */
  value: number;
  /** `copy.statChoice[stat](…)`, when the guide is known. */
  line?: string;
  tags: Array<'mostUsed' | 'best'>;
  state: 'ready' | 'placing' | 'dimmed' | 'placed';
  onPlace: () => void;
  /** On an ink surface the card is paper (the ticket-on-modal pattern); on paper it has no fill. */
  onInk?: boolean;
}

/**
 * Review 5 (answers §3.2): one stat's paper card, the whole card the tap (56 px at least, a 1.5 px ink
 * rule, no fill, square corners). Left, the stat in full and its Courier line; right, *8 → 9* in
 * Playfair and the tags. It inverts on press; while its call is in flight it stays inverted
 * (`aria-busy`) and the others drop to 60 %; placed, it reads *Strength 9* with a Courier *+1*.
 */
export function StatCard({ stat, value, line, tags, state, onPlace, onInk = false }: StatCardProps) {
  const name = copy.statNames[stat];
  const lineId = useId();
  const busy = state === 'placing';
  return (
    <button
      type="button"
      onClick={onPlace}
      disabled={busy || state === 'dimmed'}
      aria-busy={busy || undefined}
      aria-label={state === 'placed' ? `${name} ${value} · +1` : `${name} ${value} → ${value + 1}`}
      aria-describedby={line ? lineId : undefined}
      className={cx(
        'group relative grid min-h-14 w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-[1.5px] border-ink px-3 py-2 text-left text-ink transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol',
        'active:bg-ink active:text-paper disabled:cursor-default',
        busy ? 'bg-ink text-paper' : onInk ? 'bg-paper' : 'bg-transparent',
        state === 'dimmed' && 'opacity-60',
      )}
      data-testid={`stat-card-${stat}`}
      data-state={state}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-body text-[15px] leading-snug font-semibold">{name}</span>
        {line && (
          <span
            id={lineId}
            className="font-mono text-[11.5px] leading-snug opacity-85"
            data-testid={`stat-line-${stat}`}
          >
            {line}
          </span>
        )}
      </span>
      {/* The number on the right: under the tags when there are any, so the line keeps its width. */}
      <span className={cx('flex shrink-0 justify-end', tags.length > 0 ? 'self-end' : 'self-start pt-0.5')}>
        {state === 'placed' ? (
          <span
            className="font-display text-[20px] leading-none font-black"
            data-testid={`stat-placed-${stat}`}
          >
            {value} <span className="font-mono text-[12px] font-normal text-success">+1</span>
          </span>
        ) : (
          <span className="font-display text-[20px] leading-none font-black whitespace-nowrap">
            {value} → {value + 1}
          </span>
        )}
      </span>
      {tags.length > 0 && (
        <span
          className="label-caps absolute top-2.5 right-3 text-right text-[10px] leading-tight text-petrol group-active:text-paper"
          data-testid={`stat-tags-${stat}`}
        >
          {tags.map((t) => copy.statChoice.tags[t]).join(' · ')}
        </span>
      )}
    </button>
  );
}
