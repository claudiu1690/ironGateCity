import { copy } from '@irongate/content/copy';
import type { CharacterView, StatPointTarget } from '@irongate/rules';
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
          'label-caps flex min-h-14 flex-1 flex-col items-center justify-center gap-[3px] text-[10px] tracking-[0.12em] lg:w-[84px] lg:flex-none lg:py-2',
          on
            ? 'text-paper shadow-[inset_0_3px_0_var(--color-paper)] lg:bg-paper lg:text-ink lg:shadow-none'
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
  /** Review 1 (§5.3): the counts behind the lead line and the stat lines; absent: buttons only. */
  guide?: CharacterView['statGuide'];
  onPlace: (stat: StatPointTarget) => void;
  placing?: StatPointTarget | null;
  onLater?: () => void;
  /** The heading line; defaults to "Level 4 · 1 stat point to place". */
  title?: string;
  tone?: 'paper' | 'ink';
}

/**
 * §5.3 (review 1, answers §7): one tap per point, on STR, INT or AGI. The choice explains itself:
 * a lead line from the residence city's actions (*Most of the work in Duskwall uses INT: 9 of 15
 * actions. Your best is STR 13.*), one line per stat, and the CHA footer. Each tap is its own
 * idempotency key (caller).
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
}: StatPointsPanelProps) {
  if (pending <= 0) return null;
  const ink = tone === 'ink';
  const sc = copy.statChoice;
  const muted = ink ? 'text-dim' : 'text-text-2';
  return (
    <div className="flex flex-col gap-1.5" data-testid="stat-points">
      <span className={cx('font-label text-[13px]', ink ? 'text-paper' : 'text-ink')}>
        {title ?? copy.levelPointsToPlace(level, pending)}
      </span>
      {guide && (
        <p
          className={cx('font-body text-[13px] leading-snug', ink ? 'text-paper' : 'text-ink')}
          data-testid="stat-lead"
        >
          {sc.lead(
            guide.cityName,
            guide.lead.toUpperCase(),
            guide.counts[guide.lead],
            guide.total,
            guide.best.stat.toUpperCase(),
            guide.best.value,
            guide.best.stat === guide.lead,
          )}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        {(['str', 'int', 'agi'] as const).map((s) => (
          <div key={s} className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
            <button
              type="button"
              onClick={() => onPlace(s)}
              disabled={!!placing}
              aria-busy={placing === s || undefined}
              className={cx(
                'label-caps min-h-11 shrink-0 cursor-pointer self-start px-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-60',
                ink ? 'bg-paper text-ink hover:bg-paper-2' : 'bg-ink text-paper hover:bg-ink-2',
              )}
            >
              {copy.statButton(s.toUpperCase(), stats[s])}
            </button>
            {guide && (
              <span
                className={cx('font-body text-[12px] leading-snug', muted)}
                data-testid={`stat-line-${s}`}
              >
                {sc[s](guide.counts[s], guide.total)}
              </span>
            )}
          </div>
        ))}
      </div>
      {guide && <p className={cx('font-body text-[12px] italic', muted)}>{sc.footer}</p>}
      {onLater && (
        <button
          type="button"
          onClick={onLater}
          className={cx(
            'label-caps min-h-11 cursor-pointer self-start border-[1.5px] px-3 text-[12px]',
            ink ? 'border-dim text-dim' : 'border-ink text-ink',
          )}
        >
          {copy.later}
        </button>
      )}
    </div>
  );
}
