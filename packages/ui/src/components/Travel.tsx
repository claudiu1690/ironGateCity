import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import type { JourneyCardResult, JourneyCardView, NationCityView, LocationView } from '@irongate/rules';
import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { cx, formatClock, formatOpinionDelta, formatUntil, formatWhen, renderTimeTokens } from '../format';
import { statName } from '../odds';
import { Button } from './Button';
import { OpinionBars } from './Capital';
import type { FactionNames } from './Capital';
import { HelpButton, helpMark } from './Help';
import { Stamp } from './Stamp';

/**
 * Slice 4's travel components (docs/design/slice-4-screens.md §2–§4): the city card and the Cities
 * list of the nation map, the journey's progress line and its card, and the Trains card at Central
 * Station. Plain props; the server decides every state, fare and outcome.
 */

// ---------------------------------------------------------------------------------------------
// The city card (screens §2.1).
// ---------------------------------------------------------------------------------------------

/** Why a city has no Board button, in the card's words (or null when it has one). */
export function cityCardNote(c: NationCityView): string | null {
  // Slice 5 (screens §8.1): rival ground is open from Level 10; the card says what it means.
  if (c.state === 'rival') return copy.risk.rival.cardNote;
  if (c.state === 'barred')
    return copy.risk.rival.barred(
      c.barredUntil ? formatUntil(c.barredUntil) : '',
    );
  if (c.state === 'later') return copy.travel.noServiceYetCard;
  return null;
}

/** The Board button's label and whether it can be tapped. */
export function boardButton(c: NationCityView): { label: string; enabled: boolean } | null {
  if (c.state === 'level') return { label: copy.travel.fromLevel(10), enabled: false };
  if ((c.state !== 'open' && c.state !== 'rival') || !c.fare || c.minutes === null) return null;
  if (c.canBoard.ok) return { label: copy.travel.board(c.fare.total, c.minutes), enabled: true };
  if (c.canBoard.reason === 'NOT_ENOUGH_IRON') return { label: copy.travel.needsFare(c.fare.total), enabled: false };
  return null;
}

export interface CityCardProps {
  city: NationCityView;
  names: FactionNames;
  onBoard: () => void;
  boardPending?: boolean;
  onSeeDistricts?: () => void;
}

/**
 * The nation's city card (the sheet's body; the sheet carries the line as kicker and the name): who
 * holds it, this week's Issues, the election line, and one button: *Board · 20 Iron · 12 min*, *See
 * the five districts* in the capital, or the lock line and no button.
 */
export function CityCard({ city: c, names, onBoard, boardPending, onSeeDistricts }: CityCardProps) {
  const board = boardButton(c);
  const note = cityCardNote(c);
  const election = c.election?.line
    ? c.election.line === 'votingOpen'
      ? copy.travel.votingOpenUntil(formatUntil(c.election.until ?? 0))
      : copy.travel.votesIn(c.election.days ?? 0)
    : null;
  return (
    <div className="flex flex-col gap-2" data-testid="city-card" data-city={c.cityId} data-state={c.state}>
      <HelpButton
        notes={[copy.capital.help.whoHolds(c.name)]}
        label={`What ${copy.capital.whoHolds(c.name)} means`}
        className="-my-2 self-start"
      >
        <span className={cx('label-caps text-[10px] font-semibold text-muted', helpMark)}>
          {copy.capital.whoHolds(c.name)}
        </span>
      </HelpButton>
      <OpinionBars values={c.whoHolds} names={names} />
      {c.issues.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" data-testid="city-issues">
          {c.issues.map((i) => (
            <li key={i.issueId} className="label-caps border border-ink px-1.5 py-0.5 text-[10px]">
              {i.name}
            </li>
          ))}
        </ul>
      )}
      {election && (
        <p className="font-mono text-[11.5px] text-text-2" data-testid="city-election">
          {election}
        </p>
      )}
      {/* Slice 5 (screens §8.1): *Rival ground · Home city of the Vanguard* (open or barred). */}
      {c.rival && (c.state === 'rival' || c.state === 'barred') && (
        <p className="label-caps text-[10px] font-semibold text-failure" data-testid="city-rival">
          {copy.risk.rival.cardLine(names[c.rival.homeFactionId] ?? c.rival.homeFactionId)}
        </p>
      )}
      {note && (
        <p className="font-mono text-[12px] text-muted" data-testid="city-lock">
          {note}
        </p>
      )}
      {board && (
        <Button
          className="w-full"
          disabled={!board.enabled}
          pending={boardPending}
          onClick={onBoard}
          data-testid="city-board"
        >
          {board.label}
        </Button>
      )}
      {c.seeDistricts && onSeeDistricts && (
        <Button variant="secondary" className="w-full" onClick={onSeeDistricts} data-testid="city-districts">
          {copy.travel.seeTheFiveDistricts}
        </Button>
      )}
    </div>
  );
}

/** A Cities row's second line: "12 min · 20 Iron", the lock word, or *you are here*. */
export function cityRowLine(c: NationCityView): string {
  if (c.lockWord) return c.lockWord;
  if (c.state === 'here') return copy.travel.youAreHere;
  if (c.state === 'level') return copy.travel.fromLevel(10);
  if (c.minutes !== null && c.fare) return copy.travel.minFare(c.minutes, c.fare.total);
  return '';
}

export interface CitiesListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cities: NationCityView[];
  onPick: (cityId: string) => void;
  returnFocusTo?: () => HTMLElement | null;
}

/** Screens §2.1: *Cities of the republic*, five rows in the server's order; a row does what the pin does. */
export function CitiesList({ open, onOpenChange, cities, onPick, returnFocusTo }: CitiesListProps) {
  const picked = useRef(false);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/50" />
        <Dialog.Content
          aria-describedby={undefined}
          data-testid="cities"
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
              {copy.travel.citiesOfTheRepublic}
            </Dialog.Title>
            <Dialog.Close className="label-caps min-h-11 min-w-11 cursor-pointer border-[1.5px] border-ink px-2 text-[11px] hover:bg-ink hover:text-paper">
              Close
            </Dialog.Close>
          </div>
          <ul className="flex flex-col overflow-y-auto overscroll-contain">
            {[...cities]
              .sort((a, b) => a.n - b.n)
              .map((c) => (
                <li key={c.cityId} className="border-b border-dotted border-faint last:border-b-0">
                  <button
                    type="button"
                    data-testid="city-row"
                    aria-label={`${c.name}, ${cityRowLine(c)}`}
                    className={cx(
                      'flex min-h-14 w-full cursor-pointer flex-col items-start gap-0.5 px-4 py-2 text-left hover:bg-paper-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
                      (c.state === 'rival' || c.state === 'later') && 'opacity-60',
                    )}
                    onClick={() => {
                      picked.current = true;
                      onOpenChange(false);
                      onPick(c.cityId);
                    }}
                  >
                    <span className="flex w-full items-baseline justify-between gap-2">
                      <span className="font-display text-[16px] leading-tight font-bold">{c.name}</span>
                      <span className="font-mono text-[11.5px] text-muted">{cityRowLine(c)}</span>
                    </span>
                    <span className="font-mono text-[11px] text-text-2">{c.line}</span>
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
// The journey (screens §3).
// ---------------------------------------------------------------------------------------------

export interface JourneyProgressProps {
  from: string;
  to: string;
  boardedAt: number;
  arrivesAt: number;
  /** The server's clock now (the client ticks it once a second). */
  now: number;
}

/**
 * Screens §3.2: the two city names at the ends, a 2 px track with a train mark at
 * (now − boardedAt) / (arrivesAt − boardedAt), and *arrives in 7 min · 14:22* under it (review 4,
 * answers §4.2: the `when` phrase, then the clock).
 */
export function JourneyProgress({ from, to, boardedAt, arrivesAt, now }: JourneyProgressProps) {
  const span = Math.max(1, arrivesAt - boardedAt);
  const f = Math.min(1, Math.max(0, (now - boardedAt) / span));
  return (
    <div className="flex flex-col gap-1.5" data-testid="journey-progress" data-progress={f.toFixed(3)}>
      <div className="label-caps flex justify-between text-[11px] font-semibold">
        <span>{from}</span>
        <span>{to}</span>
      </div>
      <div
        className="relative h-[2px] bg-ink"
        role="progressbar"
        aria-label={copy.travel.onTheTrainTo(to)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(f * 100)}
      >
        <span
          className="absolute top-1/2 h-3 w-5 -translate-x-1/2 -translate-y-1/2 border-[1.5px] border-ink bg-paper"
          style={{ left: `${f * 100}%` }}
          data-testid="train-mark"
          aria-hidden="true"
        />
      </div>
      <p className="font-mono text-[12px] text-text-2" data-testid="journey-left">
        {copy.travel.arrives(formatWhen(arrivesAt, now), formatClock(arrivesAt))}
      </p>
    </div>
  );
}

/**
 * A choice row's line (screens §3.4): the odds word, then the content's detail, which already names the
 * stat in full and the rewards (*Good odds · Agility · opinion +0.05 in Coalport · +5 Party XP*); where
 * the detail does not name the stat, it is added after the odds word. An unchecked choice: the detail.
 */
export function choiceLine(c: JourneyCardView['choices'][number]): string {
  // Slice 5 (screens §8.2): a gated row prints no odds word; its detail says what it depends on.
  if (c.gated || !c.stat || c.chance === null) return c.detail;
  const stat = copy.odds.statLine(c.stat.stats.map(statName));
  return [copy.odds.band(c.chance), ...(c.detail.includes(stat) ? [] : [stat]), c.detail].join(' · ');
}

export interface JourneyCardProps {
  card: JourneyCardView;
  onChoose: (choiceId: string) => void;
  /** The row waiting for the server (it collapses to it at once; QA slice 2 M1). */
  pendingChoiceId?: string | null;
  /** The arrival modal's compact card. */
  compact?: boolean;
}

/**
 * Screens §3.4: *On the way* · *Optional*, the title and the setup, the choices as `StoryScreen` rows
 * (one tap, final); after the choice, the chosen row and the outcome with its stamp and (a Partial)
 * the one-line reason. Review 5 #7 (answers §7): the card stays until a row is tapped, so its foot is
 * the explicit put-aside row, *Sleep through it* · *Nothing happens.* or *Let it pass* with its
 * consequence (the server's last choice, `setAside`); its outcome is the card's ignore text, no stamp.
 */
export function JourneyCard({ card, onChoose, pendingChoiceId = null, compact = false }: JourneyCardProps) {
  const chosen: JourneyCardResult | null = card.chosen;
  const pick = chosen?.choiceId ?? pendingChoiceId;
  const all = pick ? card.choices.filter((c) => c.id === pick) : card.choices;
  const rows = all.filter((c) => !c.setAside);
  const aside = all.find((c) => c.setAside);
  const setAside = !!chosen && card.choices.some((c) => c.setAside && c.id === chosen.choiceId);
  return (
    <section
      aria-label={card.title}
      className={cx('flex flex-col border-[1.5px] border-ink bg-paper-card', compact ? 'gap-1.5 p-2.5' : 'gap-2 p-3')}
      data-testid="journey-card"
      data-chosen={chosen ? chosen.choiceId : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="label-caps text-[10px] font-semibold">{copy.travel.onTheWay}</span>
        <span className="label-caps border border-ink px-1.5 text-[9.5px]">{copy.travel.optional}</span>
      </div>
      <h2 className={cx('font-display leading-tight font-bold', compact ? 'text-[17px]' : 'text-[20px]')}>
        {card.title}
      </h2>
      <p className="font-body text-[14px] leading-snug text-text-2">{card.setup}</p>
      <div className="flex flex-col gap-2" role="group" aria-label={card.title}>
        {rows.map((c) => {
          const short = !c.affordable && !chosen;
          return (
            <button
              key={c.id}
              type="button"
              disabled={!!pick || short}
              aria-busy={pendingChoiceId === c.id || undefined}
              aria-pressed={pick === c.id || undefined}
              onClick={() => onChoose(c.id)}
              className={cx(
                'flex min-h-[52px] w-full flex-col items-start justify-center gap-0.5 border-[1.5px] border-ink px-3 py-2 text-left',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol',
                pick === c.id
                  ? 'bg-ink text-paper'
                  : 'cursor-pointer bg-paper hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-paper disabled:hover:text-ink',
              )}
              data-testid="journey-choice"
            >
              <span className="font-body text-[15px] leading-snug font-semibold">{c.title}</span>
              <span className="font-mono text-[11px] opacity-85" data-testid="journey-choice-line">
                {short && c.cost !== null ? copy.travel.needsFare(c.cost) : choiceLine(c)}
              </span>
            </button>
          );
        })}
        {aside && (
          // A text row at the foot (44 px): no box, a dotted rule above; inverted once tapped.
          <button
            type="button"
            disabled={!!pick}
            aria-busy={pendingChoiceId === aside.id || undefined}
            aria-pressed={pick === aside.id || undefined}
            onClick={() => onChoose(aside.id)}
            className={cx(
              'flex min-h-11 w-full flex-col items-start justify-center gap-0.5 border-t border-dotted border-faint px-3 py-1.5 text-left',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol',
              pick === aside.id
                ? 'border-t-0 bg-ink text-paper'
                : 'cursor-pointer hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60',
            )}
            data-testid="journey-set-aside"
          >
            <span className="font-body text-[14px] leading-snug font-semibold">{aside.title}</span>
            <span className="font-mono text-[11px] opacity-85" data-testid="journey-set-aside-line">
              {aside.detail}
            </span>
          </button>
        )}
      </div>
      {chosen && (
        <div className="flex flex-col gap-1" data-testid="journey-outcome">
          <div className="flex items-start justify-between gap-2">
            {/* The put-aside row's outcome is its text alone (the row above already names it). */}
            {!setAside && <h3 className="font-display text-[17px] leading-tight font-bold">{chosen.headline}</h3>}
            {chosen.stamp && (
              <Stamp
                tone={chosen.stamp}
                label={chosen.stamp === 'success' ? 'Success' : 'Partial'}
                className="shrink-0 border-2 px-2 py-0.5 text-[13px]!"
              />
            )}
          </div>
          <p className="font-body text-[14px] leading-snug text-text-2">{chosen.body}</p>
          {chosen.reason && (
            <p className="font-body text-[12.5px] leading-snug text-text-2" data-testid="journey-reason">
              {chosen.reason}
            </p>
          )}
          {chosen.flag && (
            <p className="font-mono text-[11.5px] text-failure" data-testid="journey-flag">
              {renderTimeTokens(chosen.flag.line, { until: chosen.flag.until })}
            </p>
          )}
          {chosen.rewards.length > 0 && (
            <p className="font-mono text-[11.5px]" data-testid="journey-rewards">
              {chosen.rewards
                .map((x) =>
                  x.id === 'opinion'
                    ? `${copy.reward.opinion(x.note ?? '')} ${formatOpinionDelta(x.amount)} %`
                    : x.id === 'points'
                      ? `+${x.amount} points${x.note ? ` · ${x.note}` : ''}`
                      : x.id === 'heat'
                        ? copy.risk.heatReward(x.amount)
                        : `${x.amount > 0 ? '+' : '−'}${Math.abs(x.amount)} ${x.id === 'xp' ? copy.reward.xp : x.id === 'fxp' ? copy.reward.fxp : x.id === 'iron' ? copy.reward.iron : 'Rested'}`,
                )
                .join(' · ')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// The Trains card at Central Station (screens §5.2).
// ---------------------------------------------------------------------------------------------

export interface TrainsCardProps {
  trains: NonNullable<LocationView['trains']>;
  onBoard: (cityId: string) => void;
  pendingCityId?: string | null;
  onNation: () => void;
}

/** The `JobsCard` pattern: *Board the train to Coalport · 20 Iron · 12 min*, and *See the nation map*. */
export function TrainsCard({ trains, onBoard, pendingCityId, onNation }: TrainsCardProps) {
  return (
    <section aria-label="Trains" className="mt-1 flex flex-col border-[1.5px] border-ink bg-paper-card" data-testid="trains-card">
      <h3 className="label-caps border-b border-ink px-3 py-1.5 text-[11px] font-semibold">Trains</h3>
      <div className="flex flex-col gap-1.5 px-3 py-2">
        {trains.destinations.map((d) => (
          <Button
            key={d.cityId}
            className="w-full"
            disabled={!d.canBoard || !!pendingCityId}
            pending={pendingCityId === d.cityId}
            onClick={() => onBoard(d.cityId)}
            data-testid="trains-board"
          >
            {d.canBoard ? copy.travel.boardTheTrainTo(d.name, d.fare.total, d.minutes) : `${d.name} · ${copy.travel.needsFare(d.fare.total)}`}
          </Button>
        ))}
        <button
          type="button"
          onClick={onNation}
          className="label-caps -my-1 inline-flex min-h-11 cursor-pointer items-center self-start text-[11px] underline underline-offset-2"
          data-testid="trains-nation"
        >
          {copy.travel.seeTheNationMap}
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------
// Review 5 #7 (answers §7, GDD §14.10): the journey card's sheet, which stays until a row is tapped.
// ---------------------------------------------------------------------------------------------

export interface JourneyCardSheetProps {
  title: string;
  children: ReactNode;
  /** Once the card is answered: its Close button, and a tap on the dim closes it. Absent: neither. */
  onClose?: () => void;
}

/**
 * The card over the journey's map, drawn inside the journey screen (its parent is `relative` and
 * isolated), not over the whole app: the map under the dim is inert (a tap there does nothing), there
 * is no Close, no Escape and no swipe while the card waits, and the tab bar and the top bar stay
 * usable (the Paper, Me and Council tabs work; the Map tab comes back to the card). A bottom sheet on
 * a phone, a centred card from 640 px. Focus moves into it when it opens.
 */
export function JourneyCardSheet({ title, children, onClose }: JourneyCardSheetProps) {
  const titleId = useId();
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <>
      <div
        className="ease-dim absolute inset-0 z-30 bg-ink/60"
        data-state="open"
        data-testid="card-dim"
        aria-hidden="true"
        onClick={onClose}
      />
      <section
        ref={ref}
        role="dialog"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-state="open"
        data-testid="journey-card-sheet"
        onKeyDown={onClose ? (e) => e.key === 'Escape' && onClose() : undefined}
        className="ease-sheet absolute inset-x-0 bottom-0 z-40 flex max-h-[85%] flex-col gap-3 overflow-y-auto overscroll-contain bg-paper p-4 text-ink shadow-[0_-10px_30px_rgb(0_0_0/0.45)] outline-none sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[calc(100%-32px)] sm:w-[520px] sm:max-w-[calc(100%-32px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:shadow-[0_0_0_1px_var(--color-ink),0_24px_60px_rgb(0_0_0/0.5)]"
      >
        <h2 id={titleId} className="font-display text-[22px] font-bold">
          {title}
        </h2>
        {children}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="label-caps min-h-11 cursor-pointer border-[1.5px] border-ink px-4 text-[13px] hover:bg-ink hover:text-paper"
          >
            Close
          </button>
        )}
      </section>
    </>
  );
}
