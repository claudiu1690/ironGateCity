import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import { FACTION_IDS, RANK_FXP, WEEKDAY_NAMES, weekday } from '@irongate/rules';
import type {
  CapitalCountView,
  DayKey,
  DistrictView,
  FactionId,
  IssueRowView,
  OpinionShares,
  QuarterView,
  LodgingsView,
  ResidenceCardView,
  ScoreboardLineView,
  ScoreboardTableView,
} from '@irongate/rules';
import { useId, useRef, useState } from 'react';
import { cx, formatShare } from '../format';
import { Button } from './Button';
import { FACTION_STYLE, FactionCrest } from './FactionCrest';
import { HelpButton, helpMark } from './Help';
import { PersonMark } from './Politics';
import { BottomSheet } from './Sheets';

/**
 * Slice 4's capital components (docs/design/slice-4-screens.md §5–§9): plain props, no tRPC. They word
 * the server's views (shares, states, points, residence cards, the count) and compute no outcome.
 */

/** Every party's short name (content, through the character view): faction naming is parked. */
export type FactionNames = Partial<Record<FactionId, string>>;
const nameOf = (names: FactionNames, f: FactionId) => names[f] ?? f;

/** Screens §9.1: a swing to two decimals with its sign, trimmed: "+1.3", "+0.05". */
export function formatSwing(swing: number): string {
  const s = Math.abs(swing)
    .toFixed(2)
    .replace(/\.?0+$/, '');
  return `${swing < 0 ? '−' : '+'}${s}`;
}

/** "1st", "2nd", "3rd", "4th". */
export function ordinal(n: number): string {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
}

/** A day key's weekday name ("Thursday"), the game's clock (the boundary is 00:00 UTC). */
export const weekdayOf = (day: DayKey): string => WEEKDAY_NAMES[weekday(day)];

// ---------------------------------------------------------------------------------------------
// The three-bar opinion gauge (screens §1) and its points mode (§7.1).
// ---------------------------------------------------------------------------------------------

export interface OpinionBarsProps {
  /** Shares (points of the meter) with Neutral, or (points mode) each party's Issue points. */
  values: Partial<OpinionShares> & Record<FactionId, number>;
  names: FactionNames;
  /** `shares`: three thin bars on a Neutral track, one decimal at the ends; `points`: one bar in three. */
  mode?: 'shares' | 'points';
  className?: string;
}

/**
 * The one new visual idiom of slice 4 (screens §1): three thin bars in the parties' colours on a
 * Neutral track, the share to one decimal at the end of each; on the city card, the district card and
 * the plate. In points mode (the Issues), one bar of three segments sized by points, no track.
 */
export function OpinionBars({ values, names, mode = 'shares', className }: OpinionBarsProps) {
  if (mode === 'points') {
    const total = FACTION_IDS.reduce((n, f) => n + values[f], 0);
    return (
      <span
        className={cx('flex h-1.5 w-full bg-track', className)}
        role="img"
        aria-label={FACTION_IDS.map((f) => `${nameOf(names, f)} ${values[f]}`).join(', ')}
        data-testid="points-bar"
      >
        {total > 0 &&
          FACTION_IDS.map((f) => (
            <span
              key={f}
              style={{ width: `${(values[f] / total) * 100}%`, background: FACTION_STYLE[f].color }}
            />
          ))}
      </span>
    );
  }
  return (
    <span
      className={cx('flex w-full flex-col gap-[3px]', className)}
      role="img"
      aria-label={FACTION_IDS.map((f) => `${nameOf(names, f)} ${formatShare(values[f])} %`).join(', ')}
      data-testid="opinion-bars"
    >
      {FACTION_IDS.map((f) => (
        <span key={f} className="flex items-center gap-1.5" aria-hidden="true">
          <FactionCrest factionId={f} size={7} />
          <span className="relative h-[5px] flex-1 bg-neutral/35">
            <span
              className="absolute inset-y-0 left-0"
              style={{ width: `${Math.min(100, values[f])}%`, background: FACTION_STYLE[f].color }}
            />
          </span>
          <span className="w-8 text-right font-label text-[11px] leading-none" data-testid={`share-${f}`}>
            {formatShare(values[f])}
          </span>
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------------------------
// A district's state in words (screens §5, §11).
// ---------------------------------------------------------------------------------------------

/** The plate's and the list's state word: *Close race*, *Leans Alliance*, *Held by the Collective 52*. */
export function districtStateWord(d: Pick<DistrictView, 'state' | 'opinion'>, names: FactionNames): string {
  const s = d.state;
  if (s.word === 'closeRace') return copy.capital.closeRace;
  if (s.word === 'held' && s.controlledBy)
    return copy.capital.heldBy(nameOf(names, s.controlledBy), formatShare(d.opinion[s.controlledBy]));
  if (s.word === 'leans' && s.leans) return copy.capital.leans(nameOf(names, s.leans));
  return copy.sash.contested;
}

/** The top bar's subtitle in a district: *Station & Market · close race today* / *· leans Alliance*. */
export function districtSubtitle(d: Pick<DistrictView, 'name' | 'state' | 'opinion'>, names: FactionNames): string {
  if (d.state.word === 'closeRace') return copy.capital.districtCloseRace(d.name);
  const lean = d.state.controlledBy ?? d.state.leans;
  return lean ? copy.capital.districtLeans(d.name, nameOf(names, lean)) : d.name;
}

/** Screens §5.2: the comeback line for members of the party that has one. */
export function comebackLine(d: Pick<DistrictView, 'state'>, names: FactionNames): string | null {
  const g = d.state.groundswell;
  return g ? copy.capital.comeback(nameOf(names, g.factionId), g.pct) : null;
}

// ---------------------------------------------------------------------------------------------
// The district card (the overview's sheet, screens §5.1) and the Districts list.
// ---------------------------------------------------------------------------------------------

export interface DistrictCardProps {
  district: DistrictView;
  names: FactionNames;
  /** The district the player stands in (client memory): *Show places* as well. */
  here: boolean;
  onGo: () => void;
  onShowPlaces?: () => void;
}

/** The district card's body (the sheet carries the kicker, the name and the blurb). */
export function DistrictCard({ district: d, names, here, onGo, onShowPlaces }: DistrictCardProps) {
  const issue = d.issues[0];
  const [a, b] = d.seats;
  const seat = (s: DistrictView['seats'][number]) =>
    `${s.name} (${nameOf(names, s.factionId)}${s.local ? ', local' : ''})`;
  return (
    <div className="flex flex-col gap-2" data-testid="district-card" data-district={d.id}>
      <HelpButton
        notes={[copy.capital.help.whoHolds(d.name), copy.capital.help.closeRace()]}
        label={`What ${copy.capital.whoHolds(d.name)} means`}
        className="-my-2 self-start"
      >
        <span className={cx('label-caps text-[10px] font-semibold text-muted', helpMark)}>
          {copy.capital.whoHolds(d.name)}
        </span>
      </HelpButton>
      <OpinionBars values={d.opinion} names={names} />
      <ul className="flex flex-col font-mono text-[11.5px] text-text-2">
        <li data-testid="district-race">
          {d.state.battleground ? copy.capital.closeRaceToday : copy.capital.notACloseRace}
        </li>
        <li data-testid="district-issue">{issue ? copy.capital.thisWeek(issue.name) : copy.capital.noIssue}</li>
        {a && b && <li data-testid="district-seats">{copy.capital.councilSeats(seat(a), seat(b))}</li>}
        {comebackLine(d, names) && <li>{comebackLine(d, names)}</li>}
      </ul>
      {d.scoreboard.table.length > 0 && (
        <details className="border-t border-dotted border-faint pt-1" data-testid="district-who-moved">
          <summary className="label-caps flex min-h-11 cursor-pointer items-center text-[11px]">
            {copy.capital.whoMovedFold(d.name)}
          </summary>
          <ScoreboardTable table={d.scoreboard.table} districtName={d.name} names={names} />
        </details>
      )}
      <div className="flex flex-col gap-1.5 pt-1 sm:flex-row">
        <Button className="flex-1" onClick={onGo} data-testid="district-go">
          {copy.capital.goTo(d.name)}
        </Button>
        {here && onShowPlaces && (
          <Button variant="secondary" className="flex-1" onClick={onShowPlaces}>
            {copy.capital.showPlaces}
          </Button>
        )}
      </div>
    </div>
  );
}

export interface DistrictsListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  districts: DistrictView[];
  names: FactionNames;
  onPick: (id: string) => void;
  returnFocusTo?: () => HTMLElement | null;
}

/** Screens §5.1: the Districts list (the Places pill's pattern): the name, the state, the three bars. */
export function DistrictsList({ open, onOpenChange, districts, names, onPick, returnFocusTo }: DistrictsListProps) {
  const picked = useRef(false);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50" />
        <Dialog.Content
          aria-describedby={undefined}
          data-testid="districts"
          onOpenAutoFocus={() => {
            picked.current = false;
          }}
          onCloseAutoFocus={(e) => {
            if (picked.current) return e.preventDefault();
            const to = returnFocusTo?.();
            if (to) {
              e.preventDefault();
              to.focus();
            }
          }}
          className={cx(
            'fixed z-50 flex flex-col bg-paper text-ink',
            'inset-x-0 bottom-0 max-h-[75dvh] pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgb(0_0_0/0.45)]',
            'sm:inset-x-auto sm:top-[calc(var(--hud-h,44px)+12px)] sm:right-3 sm:bottom-auto sm:max-h-[calc(100dvh-var(--hud-h,44px)-24px)] sm:w-[360px] sm:pb-0 sm:shadow-[0_0_0_1px_var(--color-ink),0_18px_40px_rgb(0_0_0/0.5)]',
            'short:top-[calc(var(--hud-h,44px)+6px)] short:max-h-[calc(100dvh-var(--hud-h,44px)-12px)]',
          )}
        >
          <div className="flex items-center gap-3 border-b-2 border-ink py-1.5 pr-2 pl-4">
            <Dialog.Title className="min-w-0 flex-1 font-display text-[20px] leading-tight font-black">
              {copy.capital.districts}
            </Dialog.Title>
            <Dialog.Close className="label-caps min-h-11 min-w-11 cursor-pointer border-[1.5px] border-ink px-2 text-[11px] hover:bg-ink hover:text-paper">
              Close
            </Dialog.Close>
          </div>
          <ul className="flex flex-col overflow-y-auto overscroll-contain">
            {[...districts]
              .sort((a, b) => a.n - b.n)
              .map((d) => (
                <li key={d.id} className="border-b border-dotted border-faint last:border-b-0">
                  <button
                    type="button"
                    data-testid="district-row"
                    aria-label={`${d.n}. ${d.name}, ${districtStateWord(d, names)}`}
                    className="flex min-h-11 w-full cursor-pointer items-start gap-3 px-4 py-2 text-left hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
                    onClick={() => {
                      picked.current = true;
                      onOpenChange(false);
                      onPick(d.id);
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-paper bg-ink font-label text-[14px] font-semibold text-paper shadow-[0_0_0_2px_var(--color-ink)]"
                    >
                      {d.n}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-display text-[16px] leading-tight font-bold">{d.name}</span>
                        <span className="label-caps text-[10px] text-muted">{districtStateWord(d, names)}</span>
                      </span>
                      <OpinionBars values={d.opinion} names={names} />
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------------------------
// The tram bar (screens §5.2).
// ---------------------------------------------------------------------------------------------

export interface TramBarProps {
  /** Slice 5 (screens §3.1): a home city's quarters, a locked one with its lock mark. */
  districts: Array<{ id: string; name: string; locked?: boolean }>;
  /** The district on show: left out of the bar (the other four are the trams). */
  current: string | null;
  onGo: (id: string) => void;
  className?: string;
  /** QA slice 4 M3: two rows of two in a narrow column (the side panel of a phone held sideways). */
  columns?: 2 | 3 | 4;
  /**
   * Slice 5 (screens §3.1): the quarter bar of a home city: every quarter, the current one inverted;
   * a locked one's tap opens its teaser (`onLocked`) instead of moving. Absent: the capital's trams.
   */
  quarters?: { onLocked: (id: string) => void };
}

/**
 * Screens §5.2: four chips at the bottom of the map, the other districts, one tap each (instant, free,
 * no modal); Oswald caps on ink, 44 px high. It replaces the mockup's *Tram to Eastside* ticket.
 * QA slice 4 M3: a label that does not fit its chip wraps to a second line (*Station & / Market*),
 * never runs into the next; in the side panel the chips are two rows of two.
 */
export function TramBar({ districts, current, onGo, className, columns = 4, quarters }: TramBarProps) {
  if (quarters)
    return (
      <nav
        aria-label={copy.risk.quarters.title}
        className={cx(
          'grid min-h-11 items-stretch gap-px bg-ink-2',
          columns === 2 ? 'grid-cols-2' : 'grid-cols-3',
          className,
        )}
        data-testid="quarter-bar"
      >
        {districts.map((d) => {
          const on = d.id === current;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => (d.locked ? quarters.onLocked(d.id) : on ? undefined : onGo(d.id))}
              aria-current={on ? 'page' : undefined}
              aria-label={d.locked ? copy.risk.quarterLocked(d.name) : d.name}
              className={cx(
                'label-caps flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-1 px-1.5 py-1 text-center text-[11px] leading-[1.15] break-words',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-paper',
                on ? 'bg-paper text-ink' : 'bg-ink text-paper hover:bg-ink-2',
                d.locked && 'text-dim',
              )}
              data-testid="quarter-chip"
              data-locked={d.locked || undefined}
              data-current={on || undefined}
            >
              {d.locked && <LockMark />}
              {d.name}
            </button>
          );
        })}
      </nav>
    );
  return (
    <nav
      aria-label={copy.capital.tram}
      className={cx(
        'grid min-h-11 items-stretch gap-px bg-ink-2',
        columns === 2 ? 'grid-cols-2' : 'grid-cols-4',
        className,
      )}
      data-testid="tram-bar"
    >
      {districts
        .filter((d) => d.id !== current)
        .map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => onGo(d.id)}
            className="label-caps flex min-h-11 min-w-0 cursor-pointer items-center justify-center bg-ink px-1.5 py-1 text-center text-[11px] leading-[1.15] break-words text-paper hover:bg-ink-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-paper"
            data-testid="tram-chip"
            aria-label={`${copy.capital.tram}: ${d.name}`}
          >
            {copy.capital.tramShort[d.name] ?? d.name}
          </button>
        ))}
    </nav>
  );
}

/** A small padlock, the quarter bar's and the Quarters list's lock mark (screens §3.1). */
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

// ---------------------------------------------------------------------------------------------
// The quarters of a home city (screens §3.2, §3.3).
// ---------------------------------------------------------------------------------------------

/** A locked quarter's lock line: *Opens at Level 6* / *Opens with a later edition*. */
export function quarterLockLine(
  q: Pick<QuarterView, 'lock' | 'teaser'>,
  opts: { teaser?: boolean } = {},
): string | null {
  if (!q.lock) return null;
  if (q.lock.kind === 'level') return copy.risk.quarters.opensAt(q.lock.level);
  // QA fixes §9: the teaser sheet's line is the lock and its teaser (*Opens with a later edition · The
  // station, …*); the map's pin and the list keep the lock alone.
  return opts.teaser && q.teaser ? `${copy.risk.quarters.later} · ${q.teaser}` : copy.risk.quarters.later;
}

export interface QuarterTeaserSheetProps {
  quarter: QuarterView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The player's Level, for *Level 6 opens it; you are Level 5.* */
  level: number;
}

/**
 * Screens §3.3: a locked quarter's teaser: the kicker (*Quarter · opens at Level 6* / *· a later
 * edition*), the name, the blurb from content and one Courier line; no button but Close.
 */
export function QuarterTeaserSheet({ quarter: q, open, onOpenChange, level }: QuarterTeaserSheetProps) {
  return (
    <Dialog.Root open={open && !!q} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ease-dim fixed inset-0 z-40 bg-ink/60" />
        <Dialog.Content
          aria-describedby={undefined}
          className="ease-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col gap-2.5 overflow-y-auto bg-paper p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-ink shadow-[0_-10px_30px_rgb(0_0_0/0.45)] sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:shadow-[0_0_0_1px_var(--color-ink),0_24px_60px_rgb(0_0_0/0.5)]"
          data-testid="quarter-teaser"
        >
          {q && (
            <>
              <span className="label-caps text-[10px] text-muted" data-testid="teaser-kicker">
                {q.lock?.kind === 'level' ? copy.risk.quarters.kicker(q.lock.level) : copy.risk.quarters.kickerLater}
              </span>
              <Dialog.Title className="font-display text-[20px] leading-tight font-black">{q.name}</Dialog.Title>
              {q.blurb && <p className="font-body text-[15px] leading-snug text-text-2">{q.blurb}</p>}
              {q.lock?.kind === 'level' && (
                <p className="font-mono text-[12px] text-muted" data-testid="teaser-level">
                  {copy.risk.quarters.levelOpens(q.lock.level, level)}
                </p>
              )}
              {q.lock && q.lock.kind !== 'level' && (
                <p className="font-mono text-[12px] text-muted" data-testid="teaser-line">
                  {quarterLockLine(q, { teaser: true })}
                </p>
              )}
              <Dialog.Close className="label-caps mt-1 min-h-11 cursor-pointer border-[1.5px] border-ink px-4 text-[13px] hover:bg-ink hover:text-paper">
                Close
              </Dialog.Close>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export interface QuartersListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cityName: string;
  quarters: QuarterView[];
  /** An open quarter: go in. A locked one: its teaser. */
  onPick: (id: string) => void;
  returnFocusTo?: () => HTMLElement | null;
}

/**
 * Screens §3.2: the overview's Places pill reads *Quarters* and lists them with their lock lines (the
 * Districts list's pattern: a bottom sheet on a phone, a panel at the top right from 640 px).
 */
export function QuartersList({ open, onOpenChange, cityName, quarters, onPick, returnFocusTo }: QuartersListProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ease-dim fixed inset-0 z-40 bg-ink/50" />
        <Dialog.Content
          aria-describedby={undefined}
          data-testid="quarters-list"
          onCloseAutoFocus={(e) => {
            const to = returnFocusTo?.();
            if (to) {
              e.preventDefault();
              to.focus();
            }
          }}
          className={cx(
            'ease-sheet fixed z-50 flex flex-col bg-paper text-ink',
            'inset-x-0 bottom-0 max-h-[75dvh] pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgb(0_0_0/0.45)]',
            'sm:inset-x-auto sm:top-[calc(var(--hud-h,44px)+12px)] sm:right-3 sm:bottom-auto sm:w-[360px] sm:pb-0 sm:shadow-[0_0_0_1px_var(--color-ink),0_18px_40px_rgb(0_0_0/0.5)]',
          )}
        >
          <div className="flex items-center gap-3 border-b-2 border-ink py-1.5 pr-2 pl-4">
            <Dialog.Title className="min-w-0 flex-1 font-display text-[20px] leading-tight font-black">
              {copy.risk.quartersIn(cityName)}
            </Dialog.Title>
            <Dialog.Close className="label-caps min-h-11 min-w-11 cursor-pointer border-[1.5px] border-ink px-2 text-[11px] hover:bg-ink hover:text-paper">
              Close
            </Dialog.Close>
          </div>
          <ul className="flex flex-col overflow-y-auto overscroll-contain">
            {quarters.map((q) => {
              const lock = q.open === false ? quarterLockLine(q) : null;
              return (
                <li key={q.id} className="border-b border-dotted border-faint last:border-b-0">
                  <button
                    type="button"
                    data-testid="quarter-row"
                    data-locked={lock ? true : undefined}
                    className="flex min-h-11 w-full cursor-pointer items-start gap-3 px-4 py-2 text-left hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
                    onClick={() => {
                      onOpenChange(false);
                      onPick(q.id);
                    }}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2 font-display text-[16px] leading-tight font-bold">
                        {lock && <LockMark />}
                        {q.name}
                      </span>
                      <span className="font-mono text-[11.5px] text-muted" data-testid="quarter-row-line">
                        {lock ?? q.teaser ?? ''}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------------------------
// The scoreboard (screens §9).
// ---------------------------------------------------------------------------------------------

export function scoreboardText(
  line: Pick<ScoreboardLineView, 'placeName' | 'swing' | 'rank' | 'of'>,
  factionName: string,
): string {
  return line.of <= 1
    ? copy.scoreboard.lineAlone(line.placeName, formatSwing(line.swing), factionName)
    : copy.scoreboard.line(line.placeName, formatSwing(line.swing), factionName, ordinal(line.rank), line.of);
}

/** Screens §9.1: *This election you've moved Eastside +1.3 for the Collective (2nd of 7)*. */
export function ScoreboardLine({
  line,
  factionName,
  className,
}: {
  line: Pick<ScoreboardLineView, 'placeName' | 'swing' | 'rank' | 'of'>;
  factionName: string;
  className?: string;
}) {
  return (
    <p className={cx('font-mono text-[11px] leading-snug', className)} data-testid="scoreboard-line">
      {scoreboardText(line, factionName)}
    </p>
  );
}

/** A small ink rosette, the hero's mark (screens §7.3, §9.2). */
export function Rosette({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" data-testid="rosette">
      <path d="M5 10 3.5 15.5 8 13l4.5 2.5L11 10z" style={{ fill: 'var(--color-ink)' }} />
      <circle cx="8" cy="6.5" r="5.5" style={{ fill: 'var(--color-ink)' }} />
      <circle cx="8" cy="6.5" r="3" fill="none" style={{ stroke: 'var(--color-paper)' }} strokeWidth="1" />
    </svg>
  );
}

/** Screens §9.2: *Who moved Eastside · this election*: the top three per level bracket. */
export function ScoreboardTable({
  table,
  districtName,
  names,
}: {
  table: ScoreboardTableView[];
  districtName: string;
  names: FactionNames;
}) {
  return (
    <section className="flex flex-col gap-1" aria-label={copy.scoreboard.whoMoved(districtName)} data-testid="scoreboard-table">
      <h3 className="label-caps border-t-[3px] border-b border-double border-ink py-1 text-[10px] font-semibold">
        {copy.scoreboard.whoMoved(districtName)}
      </h3>
      <table className="w-full border-collapse font-label text-[13px]">
        <thead>
          <tr className="label-caps border-b border-ink text-[10px] text-muted">
            {copy.scoreboard.columns.map((c, i) => (
              <th key={c} scope="col" className={cx('py-1 font-normal', i >= 3 ? 'text-right' : 'text-left')}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        {table.map((b) => (
          <tbody key={b.bracket} className="border-b border-ink">
            <tr>
              <td colSpan={5} className="pt-1 text-right font-mono text-[10.5px] text-muted">
                {copy.scoreboard.brackets[b.bracket - 1]}
              </td>
            </tr>
            {b.rows.map((r, i) => (
              <tr key={r.characterId} className={cx('border-b border-dotted border-faint', r.you && 'bg-paper-2')} data-testid="scoreboard-row">
                <td className="py-1">{i + 1}</td>
                <td className="py-1 font-body">
                  <span className="flex items-center gap-1">
                    {r.hero && <Rosette size={12} />}
                    {r.name}
                    {r.you && <span className="font-mono text-[10.5px] text-muted">{copy.you}</span>}
                  </span>
                </td>
                <td className="py-1">
                  <span className="flex items-center gap-1">
                    <FactionCrest factionId={r.factionId} size={8} />
                    {nameOf(names, r.factionId)}
                  </span>
                </td>
                <td className="py-1 text-right">{r.level}</td>
                <td className="py-1 text-right">{formatSwing(r.swing)}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <p className="font-mono text-[10.5px] text-muted">{copy.scoreboard.heroNote}</p>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Where you live (screens §6).
// ---------------------------------------------------------------------------------------------

export interface ResidenceCardProps {
  card: ResidenceCardView;
  /** The place *Live here* moves to: the district on show, or (at home) the home city. */
  placeName: string;
  /** The faction's Rank 2 title, for the below-Rank line. */
  rank2Title: string;
  onRegister: () => void;
  registerPending?: boolean;
  className?: string;
}

/**
 * The residence card's two lines and its button, per state (review 4 #9, answers §9.2's table): one
 * button, *Live here · 500 Iron*, and the plain reason why.
 */
export function residenceLines(
  card: ResidenceCardView,
  placeName: string,
  rank2Title: string,
): { line1: string; line2: string; button: { label: string; enabled: boolean } | null } {
  const r = copy.residence;
  const live = r.youLiveIn(card.livesIn);
  const liveHere = { label: r.liveHere(card.cost), enabled: card.button?.enabled ?? true };
  switch (card.state) {
    case 'visitingMay':
      return { line1: live, line2: r.liveHereLine(placeName), button: liveHere };
    case 'belowRank':
      return { line1: live, line2: r.belowRank(rank2Title, RANK_FXP[1]), button: null };
    case 'cooldown':
      return { line1: live, line2: r.canMoveAgainFrom(weekdayOf(card.canMoveFromDay ?? 0)), button: null };
    case 'noIron':
      return { line1: live, line2: r.liveHereShort(placeName), button: { label: r.needsIron(card.cost), enabled: false } };
    case 'resident':
      return {
        line1: live,
        line2: r.sinceLine(
          weekdayOf(card.registeredDay ?? 0),
          weekdayOf(card.votesFromDay ?? 0),
          weekdayOf(card.canMoveFromDay ?? 0),
        ),
        button: null,
      };
    case 'homeElsewhere':
      return { line1: live, line2: r.liveHereAgain(placeName), button: liveHere };
    case 'atHome':
      return { line1: live, line2: '', button: null };
    // Slice-4 fixes §1 (QA M2): a candidate on the ballot where they live moves after the result.
    case 'onBallot':
      return { line1: live, line2: r.onBallotLine(card.livesIn, weekdayOf(card.canMoveFromDay ?? 0)), button: null };
    // Slice 5 (screens §8.3): a visitor on rival ground; the card's one line (phase C styles it).
    case 'rivalGround':
      return { line1: copy.risk.cantLiveHere, line2: '', button: null };
  }
}

/**
 * Screens §6.1, review 4 #9 (answers §9.2): *Where you live*, the `JobsCard` pattern. One state line,
 * the plain reason why, one button (*Live here · 500 Iron*). The room is the Lodgings card at Tram
 * Junction (`LodgingsCard`), not a row here.
 */
export function ResidenceCard({ card, placeName, rank2Title, onRegister, registerPending, className }: ResidenceCardProps) {
  const l = residenceLines(card, placeName, rank2Title);
  return (
    <section
      aria-label={copy.residence.whereYouLive}
      className={cx('flex flex-col border-[1.5px] border-ink bg-paper-card', className)}
      data-testid="residence-card"
      data-state={card.state}
    >
      <div className="flex flex-col gap-1 px-3 py-2">
        <HelpButton
          notes={[copy.help.residence()]}
          label={`What ${copy.residence.whereYouLive} means`}
          className="-my-2 self-start"
        >
          <span className={cx('label-caps text-[10px] font-semibold', helpMark)}>{copy.residence.whereYouLive}</span>
        </HelpButton>
        <p className="font-body text-[15px] leading-snug" data-testid="residence-line1">
          {l.line1}
        </p>
        {l.line2 && (
          <p className="font-mono text-[11px] text-muted" data-testid="residence-line2">
            {l.line2}
          </p>
        )}
        {l.button && (
          <Button
            className="mt-1 w-full"
            disabled={!l.button.enabled}
            pending={registerPending}
            onClick={onRegister}
            data-testid="residence-register"
          >
            {l.button.label}
          </Button>
        )}
      </div>
    </section>
  );
}

export interface LodgingsCardProps {
  lodgings: LodgingsView;
  onTake: () => void;
  pending?: boolean;
  /** One line under the button after a refusal. */
  notice?: string | null;
  className?: string;
}

/**
 * Review 4 #9 (answers §9.3): *Lodgings* on the place's sheet (Tram Junction), the `JobsCard` pattern,
 * its benefit in words. The line, the cap in a sentence and *Take a bed · 100 Iron* (outline); running,
 * *Your bed until Sunday · Rested banks to 250* and *Seven more nights · 100 Iron* while seven or fewer
 * remain, else *renew from Monday*. Under a rents Issue the price line names it (*50 Iron · Eviction
 * Notices*).
 */
export function LodgingsCard({ lodgings: g, onTake, pending, notice, className }: LodgingsCardProps) {
  const l = copy.lodgings;
  const priced = g.price.lines[0];
  return (
    <section
      aria-label={l.kicker}
      className={cx('mt-1 flex flex-col border-[1.5px] border-ink bg-paper-card', className)}
      data-testid="lodgings"
      data-tap={g.tap}
    >
      <div className="flex items-center border-b border-ink px-3 py-1.5">
        <HelpButton notes={[copy.help.lodgings()]} label={`What ${l.kicker} means`} className="-my-2">
          <span className={cx('label-caps text-[11px] font-semibold', helpMark)}>{l.kicker}</span>
        </HelpButton>
      </div>
      <div className="flex flex-col gap-1.5 px-3 py-2">
        <span className="font-display text-[15px] font-bold" data-testid="lodgings-line">
          {g.line}
        </span>
        {g.running ? (
          <p className="font-mono text-[11.5px] text-petrol" data-testid="lodgings-running">
            {g.renewFromDay !== null
              ? l.paidAhead(weekdayOf(g.running.untilDay), g.cap.with, weekdayOf(g.renewFromDay))
              : l.running(weekdayOf(g.running.untilDay), g.cap.with)}
          </p>
        ) : (
          <p className="font-mono text-[11.5px] text-text-2" data-testid="lodgings-benefit">
            {l.benefit(g.cap.with, g.cap.now)}
          </p>
        )}
        {priced && (
          <p className="font-mono text-[11px] text-muted" data-testid="lodgings-priced">
            {l.priced(g.price.total, priced.label)}
          </p>
        )}
        {g.tap !== 'notYet' && (
          <Button variant="outline" className="w-full" pending={pending} onClick={onTake} data-testid="lodgings-take">
            {g.tap === 'renew' ? l.more(g.price.total) : l.take(g.price.total)}
          </Button>
        )}
        {notice && (
          <p role="status" className="font-mono text-[12px] text-collective">
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}

export interface RegisterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeName: string;
  cost: number;
  lines: Array<{ text: string; warn: boolean }>;
  onRegister: () => void;
  pending?: boolean;
}

/** Screens §6.2: the consequences before the tap, then one button. */
export function RegisterSheet({ open, onOpenChange, placeName, cost, lines, onRegister, pending }: RegisterSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={copy.residence.liveIn(placeName, cost)}>
      <ul className="flex flex-col gap-1.5" data-testid="register-lines">
        {lines.map((l) => (
          <li key={l.text} className={cx('flex gap-2 font-body text-[14px] leading-snug', l.warn && 'text-failure')}>
            <span className="font-mono" aria-hidden="true">
              ✓
            </span>
            <span>{l.text}</span>
          </li>
        ))}
      </ul>
      <Button className="w-full" pending={pending} onClick={onRegister} data-testid="register-confirm">
        {copy.residence.liveHere(cost)}
      </Button>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------------------------
// The Issues in the paper (screens §7.1).
// ---------------------------------------------------------------------------------------------

export interface IssueRowProps {
  row: IssueRowView;
  names: FactionNames;
  open: boolean;
  onToggle: () => void;
  /** "settles Sunday midnight", in the player's clock. */
  settles: string;
  onWhereToAct?: (row: IssueRowView) => void;
}

export function IssueRow({ row, names, open, onToggle, settles, onWhereToAct }: IssueRowProps) {
  const id = useId();
  const totals = [...FACTION_IDS]
    .sort((a, b) => row.momentum[b] - row.momentum[a])
    .map((f) => `${nameOf(names, f)} ${row.momentum[f]}`)
    .join(' · ');
  return (
    <li className="border-b border-dotted border-faint" data-testid="issue-row" data-issue={row.issueId}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex min-h-16 w-full cursor-pointer items-center gap-3 py-2 text-left hover:bg-paper-card"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="label-caps text-[10px] text-muted">{row.placeName}</span>
          <span className="font-body text-[16px] leading-tight font-semibold">{row.name}</span>
          <OpinionBars mode="points" values={row.momentum} names={names} />
          <span className="font-mono text-[11px] text-muted" data-testid="issue-totals">
            {totals} · {copy.issues.settles(settles)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 font-mono text-[11px]" data-testid="issue-leader">
          {row.leader ? (
            <>
              <FactionCrest factionId={row.leader} size={12} label={nameOf(names, row.leader)} /> {copy.issues.leads}
            </>
          ) : (
            copy.issues.open
          )}
        </span>
      </button>
      {open && (
        <div id={id} className="flex flex-col gap-1.5 pb-2" data-testid="issue-detail">
          {row.blurb && <p className="font-body text-[13px] leading-snug text-text-2 italic">{row.blurb}</p>}
          {row.stances && (
            <ul className="flex flex-col gap-0.5">
              {FACTION_IDS.map((f) => (
                <li key={f} className="flex gap-1.5 font-body text-[12.5px] leading-snug">
                  <FactionCrest factionId={f} size={9} className="mt-1 shrink-0" />
                  <span>
                    <span className="font-semibold">{nameOf(names, f)}:</span> {row.stances![f]}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="font-mono text-[11.5px]">{copy.issues.ifSettled(row.effectLine)}</p>
          {onWhereToAct && (
            <button
              type="button"
              onClick={() => onWhereToAct(row)}
              className="label-caps -my-1 inline-flex min-h-11 cursor-pointer items-center self-start text-[11px] underline underline-offset-2"
              data-testid="where-to-act"
            >
              {copy.issues.whereToAct}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export interface IssuesSectionProps {
  issues: { newThisWeek: boolean; rows: IssueRowView[]; more: IssueRowView[] };
  names: FactionNames;
  settles: string;
  onWhereToAct?: (row: IssueRowView) => void;
}

/**
 * Screens §7.1: *The Issues* between the headlines and the Election row: the residence city's two,
 * the capital's two, then a folded row for the other cities; one row open at a time.
 */
export function IssuesSection({ issues, names, settles, onWhereToAct }: IssuesSectionProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const toggle = (k: string) => setOpen((o) => (o === k ? null : k));
  const others = [...new Set(issues.more.map((r) => r.placeName))];
  if (issues.rows.length === 0 && issues.more.length === 0) return null;
  return (
    <section aria-label={copy.issues.theIssues} className="flex flex-col" data-testid="issues-section">
      <div className="flex items-center justify-between border-t-[3px] border-b border-double border-ink py-1">
        <HelpButton notes={[copy.issues.help.theIssues()]} label={`What ${copy.issues.theIssues} are`} className="-my-2">
          <span className={cx('label-caps text-[11px] font-semibold', helpMark)}>{copy.issues.theIssues}</span>
        </HelpButton>
        {issues.newThisWeek && (
          <span className="font-mono text-[11px] text-petrol" data-testid="issues-new">
            {copy.issues.newThisWeek}
          </span>
        )}
      </div>
      <ul className="flex flex-col">
        {issues.rows.slice(0, 4).map((r) => (
          <IssueRow
            key={`${r.cityId}:${r.issueId}`}
            row={r}
            names={names}
            open={open === `${r.cityId}:${r.issueId}`}
            onToggle={() => toggle(`${r.cityId}:${r.issueId}`)}
            settles={settles}
            onWhereToAct={onWhereToAct}
          />
        ))}
        {others.length > 0 && (
          <li className="border-b border-dotted border-faint">
            <button
              type="button"
              aria-expanded={more}
              onClick={() => setMore((m) => !m)}
              className="label-caps flex min-h-11 w-full cursor-pointer items-center justify-between text-[11px]"
              data-testid="issues-more"
            >
              <span>{others.join(' · ')}</span>
              <span aria-hidden="true">{more ? '−' : '+'}</span>
            </button>
          </li>
        )}
        {more &&
          issues.more.map((r) => (
            <IssueRow
              key={`${r.cityId}:${r.issueId}`}
              row={r}
              names={names}
              open={open === `${r.cityId}:${r.issueId}`}
              onToggle={() => toggle(`${r.cityId}:${r.issueId}`)}
              settles={settles}
              onWhereToAct={onWhereToAct}
            />
          ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// The result in the capital (screens §8).
// ---------------------------------------------------------------------------------------------

type CapitalDistrictCount = CapitalCountView['districts'][number];

export interface DistrictSwitcherProps {
  districts: Array<{ districtId: string; name: string }>;
  selected: string;
  onSelect: (id: string) => void;
}

/** Screens §8: five chips under the plate, the player's district first (the server's order). */
export function DistrictSwitcher({ districts, selected, onSelect }: DistrictSwitcherProps) {
  return (
    <div role="tablist" aria-label={copy.capital.districts} className="flex flex-wrap gap-1.5" data-testid="district-switcher">
      {districts.map((d) => {
        const on = d.districtId === selected;
        return (
          <button
            key={d.districtId}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onSelect(d.districtId)}
            className={cx(
              'label-caps min-h-11 cursor-pointer border-[1.5px] border-ink px-3 text-[11px]',
              on ? 'bg-ink text-paper' : 'bg-paper-card text-ink hover:bg-paper-2',
            )}
            data-testid="district-chip"
          >
            {copy.capital.tramShort[d.name] ?? d.name}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Screens §8: a district's result: the parties' table (votes, opinion, score, seats), the candidates by
 * party with *the line* between the seats and the rest, the fixed lines in words, and who moved it.
 */
export function DistrictResultTable({ district: d, names }: { district: CapitalDistrictCount; names: FactionNames }) {
  const pct = Math.round(d.w);
  const order = [...d.factions].sort((a, b) => b.score - a.score);
  return (
    <section className="flex flex-col gap-3" data-testid="district-result" data-district={d.districtId}>
      <table className="w-full border-collapse font-label text-[13px]" data-testid="parties-table">
        <thead>
          <tr className="label-caps border-b border-ink text-[10px] text-muted">
            {copy.capitalElection.partiesColumns.map((c, i) => (
              <th key={c} scope="col" className={cx('py-1 font-normal', i === 0 ? 'text-left' : 'text-right')}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {order.map((f) => (
            <tr key={f.factionId} className="border-b border-dotted border-faint" data-testid="party-row">
              <td className="py-1.5">
                <span className="flex items-center gap-1.5">
                  <FactionCrest factionId={f.factionId} size={10} />
                  {nameOf(names, f.factionId)}
                </span>
              </td>
              <td className="py-1.5 text-right">{f.ballots}</td>
              {/* The share of opinion among the three parties (a fraction from the count), in points. */}
              <td className="py-1.5 text-right">{formatShare(f.opinionShare * 100)}</td>
              <td className="py-1.5 text-right font-semibold">{formatShare(f.score)}</td>
              <td className="py-1.5 text-right">
                <span className="inline-flex gap-0.5" aria-label={`${f.seats}`}>
                  {f.seats === 0
                    ? '0'
                    : Array.from({ length: f.seats }, (_, i) => (
                        <span key={i} className="inline-block h-3 w-1.5 bg-ink" data-testid="seat-bar" />
                      ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-mono text-[11px] text-muted" data-testid="votes-cast">
        {copy.capitalElection.votesCast(d.ballots, pct, 100 - pct)}
      </p>
      <table className="w-full border-collapse text-[13px]" data-testid="capital-count-table">
        <thead>
          <tr className="label-caps border-b border-ink text-[10px] text-muted">
            <th scope="col" className="w-6 py-1 text-left font-normal">
              #
            </th>
            <th scope="col" className="py-1 text-left font-normal">
              Name
            </th>
            <th scope="col" className="py-1 pl-2 text-right font-normal">
              <span className="max-[400px]:hidden">{copy.resultColumns[2]}</span>
              <span className="min-[401px]:hidden">{copy.resultColumnsShort[2]}</span>
            </th>
            <th scope="col" className="py-1 pl-2 text-right font-normal">
              <span className="max-[400px]:hidden">{copy.resultColumns[3]}</span>
              <span className="min-[401px]:hidden">{copy.resultColumnsShort[3]}</span>
            </th>
            <th scope="col" className="py-1 pl-2 text-right font-normal">
              {copy.resultColumns[4]}
            </th>
            <th scope="col" className="py-1 pl-1 text-right font-normal">
              {copy.resultColumns[5]}
            </th>
          </tr>
        </thead>
        {order.map((f) => {
          const rows = d.rows.filter((r) => r.factionId === f.factionId);
          const lastSeat = rows.filter((r) => r.seated).length;
          return (
            <tbody key={f.factionId} className="border-b border-ink">
              <tr>
                <th colSpan={6} scope="rowgroup" className="label-caps pt-1.5 text-left text-[10px] font-semibold">
                  <span className="flex items-center gap-1.5">
                    <FactionCrest factionId={f.factionId} size={9} />
                    {nameOf(names, f.factionId)}
                  </span>
                </th>
              </tr>
              {rows.map((r, i) => (
                <tr
                  key={r.key}
                  className={cx(
                    'border-b border-dotted border-faint',
                    r.you && 'bg-paper-2',
                    i === lastSeat && lastSeat > 0 && 'border-t border-t-ink',
                  )}
                  data-testid="capital-count-row"
                  data-seated={r.seated}
                >
                  <td className={cx('py-1.5 font-label', r.seated && 'border-l-[3px] border-l-ink pl-1')}>{i + 1}</td>
                  <td className="py-1.5">
                    <span className="flex flex-wrap items-center gap-x-1.5">
                      <PersonMark avatar={r.avatar} factionId={r.factionId} size={20} />
                      <span className="font-body">{r.name}</span>
                      {r.local && <span className="label-caps text-[9px] text-muted">{copy.ward}</span>}
                      {r.you && <span className="font-mono text-[11px] text-muted">{copy.you}</span>}
                      {r.yourVote && <span className="font-mono text-[11px] text-petrol">{copy.yourVote}</span>}
                    </span>
                  </td>
                  <td className="py-1.5 pl-2 text-right font-label">{r.wardVote}</td>
                  <td className="py-1.5 pl-2 text-right font-label">{r.endorsements}</td>
                  <td className="py-1.5 pl-2 text-right font-label">{r.votes}</td>
                  <td className="py-1.5 pl-1 text-right font-label font-semibold">{r.total}</td>
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
      <p className="font-mono text-[11px] text-muted" data-testid="how-seats">
        {copy.capitalElection.howSeatsAreWon}
      </p>
      {d.scoreboard.length > 0 && <ScoreboardTable table={d.scoreboard} districtName={d.name} names={names} />}
    </section>
  );
}
