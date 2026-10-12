import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import { dayKey, dayStart, energyReadyAt, heatState, xpForLevel } from '@irongate/rules';
import type {
  ActionResult,
  CharacterView,
  FactionId,
  JourneyView,
  NamedStandingView,
  OrdinanceTagView,
  PoliticalResult,
  RewardLine,
  StatPointTarget,
} from '@irongate/rules';
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  cx,
  formatClock,
  formatNumber,
  formatOpinionDelta,
  formatShare,
  formatSigned,
  formatUntil,
  formatWhen,
  renderTimeTokens,
} from '../format';
import { batchReasons, statName } from '../odds';
import { KNOCK_ONS_SHOWN, KNOCK_ONS_SHOWN_SHORT, SHORT_SCREEN, fitTagCount, howItWent, knockOnLines } from '../result';
import type { KnockOnLine } from '../result';
import type { TrainingPlaces } from '../odds';
import { Button } from './Button';
import { formatSwing, ordinal } from './Capital';
import { FACTION_STYLE } from './FactionCrest';
import { GroundSash } from './GroundSash';
import type { Ground } from './GroundSash';
import { ArtPanel } from './HallHeader';
import { Picture } from './Picture';
import { BottomSheet } from './Sheets';
import { StatPointsPanel } from './Shell';
import { Stamp } from './Stamp';
import type { StampTone } from './Stamp';
import { RunInBlock, heatWord, recordWord } from './Street';

/**
 * Slice 4 (screens §4, tech design §10.2): the arrival modal, `ResultModal kind="journey"`: the
 * journey view with its `arrival` (the destination's picture at the station, the stamp *Arrived*).
 */
export interface JourneyArrivalResult {
  kind: 'journey';
  journey: JourneyView;
}

export interface ResultModalProps {
  /**
   * An action's result, or (slice 3) a political act's: `kind: 'political'`, screens §9; or (slice 4)
   * the arrival, `kind: 'journey'`.
   */
  result: ActionResult | PoliticalResult | JourneyArrivalResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Once more / Three more: the caller re-runs the action with a new idempotency key. */
  onAgain?: (times: 1 | 3) => void;
  againPending?: 1 | 3 | null;
  /** Live Energy (projected now), for the repeat buttons. */
  energy?: { value: number; nextTickAt: number | null };
  /** Live stat points (the stored result stays immutable), and what the choice screen says. */
  statPoints?: {
    pending: number;
    level: number;
    stats: { str: number; int: number; agi: number };
    guide?: CharacterView['statGuide'];
  };
  onPlaceStat?: (stat: StatPointTarget) => void;
  placing?: StatPointTarget | null;
  /** Review 2 (answers §2.4): where to train each stat here, for the reason line ("the Union Hall"). */
  trainingPlaces?: TrainingPlaces;
  /** Slice 4: the ground sash on the picture (whose ground the place is), from the page's view. */
  ground?: Ground | null;
  /** Slice 4: every party's short name, for the Issue knock-on ("Vanguard leads 130 to 85"). */
  factionNames?: Partial<Record<FactionId, string>>;
  /** Slice 4, the arrival: Continue (`travel.close`), disabled from the tap until it answers. */
  onContinue?: () => void;
  continuePending?: boolean;
  /** Slice 4, the arrival: the unanswered journey card, compact, above Continue. */
  journeyCard?: ReactNode;
  /**
   * Slice 5 (screens §4.3): a result that sent you to the cells or the infirmary has one button, *To the
   * cells* / *To the infirmary*: the caller goes there (and closes the run-in when there was one).
   */
  onSentTo?: () => void;
  sentToPending?: boolean;
}

export function stampFor(r: Pick<ActionResult, 'stamp' | 'successes' | 'action'>): {
  label: string;
  tone: StampTone;
} {
  switch (r.stamp) {
    case 'success':
      return { label: 'Success', tone: 'success' };
    case 'partial':
      return { label: 'Partial', tone: 'partial' };
    case 'failure':
      // Designer answer §13 Q10: the stamp says Failure; nothing else in the modal says "failed".
      return { label: 'Failure', tone: 'failure' };
    case 'batch':
      return {
        label: `${r.successes} of ${r.action.times}`,
        tone: r.successes * 2 > r.action.times ? 'success' : 'partial',
      };
    case 'trained':
      return { label: 'Trained', tone: 'success' };
    // Slice 5 (screens §4.3): sent to the cells or the infirmary, in the failure colour.
    case 'takenIn':
      return { label: copy.risk.takenIn, tone: 'failure' };
    case 'carriedOff':
      return { label: copy.risk.carriedOff, tone: 'failure' };
  }
}

/**
 * The result modal (GDD §13.1a, tech design §9): art and stamp, what happened, how it went (one
 * row per attempt: Success or Partial and its XP, and one plain reason under a row that isn't a
 * Success; review 2, never the roll or the odds), the rewards as a receipt (review 3), knock-on
 * effects, and *Once more · 10 Energy* · *Three more · 30 Energy* · *Continue*. The server sends the full breakdown; this renders the outcome and
 * words the reason from it, and computes nothing else. Full-screen on phones.
 */
/** Slice 5: the cells', the infirmary's and the record's results: a card, not a half-empty screen. */
const CARD_ACTS = new Set(['bail', 'released', 'deported', 'walkOut', 'discharged', 'strike', 'treated']);

export function ResultModal(props: ResultModalProps) {
  const { result, open, onOpenChange } = props;
  const card = result?.kind === 'political' && CARD_ACTS.has(result.act);
  // Review 5 #4 (answers §4.1): an action's result scrolls only in its middle (the art and the stamp
  // stay at the top, the buttons at the bottom).
  const action = !!result && result.kind !== 'political' && result.kind !== 'journey';
  return (
    <Dialog.Root open={open && result !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ease-dim fixed inset-0 z-40 bg-ink/75" />
        <Dialog.Content
          className={cx(
            // Slice 5 (review 3: never pop): it rises in over the dim and back out.
            card
              ? 'ease-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-y-auto bg-paper text-ink shadow-[0_-10px_30px_rgb(0_0_0/0.45)]'
              : cx('ease-card fixed inset-0 z-50 flex flex-col bg-paper text-ink', action ? 'overflow-hidden' : 'overflow-y-auto'),
            'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[92dvh] sm:w-[min(600px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:shadow-[0_0_0_1px_var(--color-ink),0_24px_60px_rgb(0_0_0/0.5)]',
          )}
        >
          {result && result.kind === 'political' ? (
            <PoliticalBody result={result} onContinue={props.onContinue} continuePending={props.continuePending} />
          ) : result && result.kind === 'journey' ? (
            <JourneyBody {...props} result={result} />
          ) : (
            result && <ResultBody {...props} result={result} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * The result's picture (§13.5: a scene, or rung 3, the map centred on the location; review 3: the crop
 * shared with the hall header), the stamp, the place line and (slice 4) the ground sash on its corner;
 * with a sash the stamp moves left, so the band never covers it.
 */
function ArtHeader({
  art,
  stamp,
  caption,
  ground,
}: {
  art: ActionResult['art'];
  stamp: { label: string; tone: StampTone };
  caption: string;
  ground?: Ground | null;
}) {
  return (
    // Review 5 (answers §17.2 item 1): 112 px under 800 px of height, 136 up to 900, 150 above; the
    // QA fix round (m2, answers §17.3): 88 px on a phone under 700 px tall (375 × 667, 360 × 640).
    <ArtPanel
      art={art}
      className="h-[112px] shrink-0 [@media(max-height:700px)]:h-[88px] [@media(min-height:800px)]:h-[136px] [@media(min-height:900px)]:h-[150px]"
    >
      <div
        className="absolute inset-0 bg-[linear-gradient(0deg,rgb(21_24_26/0.9)_0%,rgb(21_24_26/0)_55%)]"
        aria-hidden="true"
      />
      <div
        className={cx(
          'absolute inset-0 flex items-center',
          ground ? 'justify-start pl-[7%] sm:justify-center sm:pr-[18%] sm:pl-0' : 'justify-center',
        )}
        data-testid="result-stamp"
      >
        {/* The stamp at 80 % on the short crops, 70 % on the shortest (under 700 px). */}
        <div className="scale-80 [@media(max-height:700px)]:scale-70 [@media(min-height:800px)]:scale-100">
          <Stamp tone={stamp.tone} label={stamp.label} />
        </div>
      </div>
      <span className="label-caps absolute bottom-2 left-3 text-[10px] text-dim">{caption}</span>
      {ground && <GroundSash ground={ground} />}
    </ArtPanel>
  );
}

/**
 * Slice 3 (screens §9): the political modal. The paper's masthead strip in place of the art, the
 * stamp over its right end; the headline and text; the knock-on lines; Continue only.
 */
function PoliticalBody({
  result: r,
  onContinue,
  continuePending,
}: {
  result: PoliticalResult;
  onContinue?: () => void;
  continuePending?: boolean;
}) {
  const k = r.knockOns;
  const lines: Array<{ id: string; text: string }> = [];
  // Slice 5 (tech design §10.3): out of the cells or the infirmary, the record struck.
  if (k.heat)
    lines.push({ id: 'heat', text: copy.risk.heatKnock(k.heat.before, k.heat.after, heatWord(heatState(k.heat.after))) });
  // Review 4 #20 (answers §20.3): out of the cells, the arrest's mark and the orders off.
  if (k.takenIn)
    lines.push({ id: 'taken-in', text: copy.risk.takenInKnock(k.takenIn.added, recordWord(k.takenIn.level)) });
  if (k.ordersOff) lines.push({ id: 'orders-off', text: copy.risk.ordersOffKnock });
  if (k.health) lines.push({ id: 'health', text: copy.risk.healthKnock(k.health.before, k.health.after) });
  if (k.record)
    lines.push({ id: 'record', text: copy.risk.recordKnock(recordWord(k.record.after.level), k.record.after.marks) });
  if (k.barred)
    lines.push({
      id: 'barred',
      text: copy.risk.barredFrom(k.barred.cityName, formatUntil(k.barred.until)),
    });
  if (k.pc) lines.push({ id: 'pc', text: copy.pcLeft(k.pc.before - k.pc.after, k.pc.after) });
  if (k.morale) {
    lines.push({
      id: 'morale',
      text: copy.moraleKnockOn(
        k.morale.cityName,
        formatOpinionDelta(Math.round((k.morale.after - k.morale.before) * 1000) / 1000),
        formatShare(k.morale.after),
      ),
    });
    if (k.morale.stateAfter !== k.morale.stateBefore)
      lines.push({ id: 'morale-state', text: copy.moraleCrossed(k.morale.cityName, k.morale.stateAfter) });
  }
  // The voting rework (tech design §4.4): *{name} · {n} backers*.
  if (k.backers) {
    lines.push({
      id: 'backers',
      text: `${k.backers.name} · ${k.backers.n} ${k.backers.n === 1 ? 'backer' : 'backers'}`,
    });
  }
  // Slice 4 (screens §6.3): a move or a room: the Iron, a home seat given up.
  if (k.iron) {
    const spent = k.iron.before - k.iron.after;
    lines.push({
      id: 'iron',
      text:
        r.act === 'bail'
          ? copy.risk.bailPaid(spent)
          : r.act === 'walkOut' || r.act === 'treated'
            ? copy.risk.wardPaid(spent)
            : copy.ironLeft(spent, formatNumber(k.iron.after)),
    });
  }
  if (k.energy) lines.push({ id: 'energy', text: copy.risk.energyKnock(k.energy.before - k.energy.after) });
  if (k.seatGivenUp) lines.push({ id: 'seat', text: copy.residence.seatGivenUp(k.seatGivenUp.cityName) });
  const t = { until: r.until, at: r.at };
  // Review 2 (screens §9): every act ends with what comes next.
  if (r.next) lines.push({ id: 'next', text: renderTimeTokens(r.next, t) });
  return (
    <>
      <div className="relative shrink-0 bg-paper px-4 pt-4" data-art="masthead">
        <div className="border-b-[3px] border-double border-ink pb-2">
          <span className="font-display text-[22px] font-black">{r.paper.name}</span>
        </div>
        {/* On the rule's right end, in its own band, so it hides neither the paper nor the text. */}
        <div className="-mt-3 flex justify-end pr-1">
          <Stamp tone={r.stamp.tone} label={r.stamp.label} className="px-3 text-[18px]" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-4 px-4 pt-3.5 pb-4">
        <section className="flex flex-col gap-1">
          <span className="label-caps text-[10px] text-muted">{r.place.cityName}</span>
          <Dialog.Title className="font-display text-[24px] leading-tight font-black">
            {renderTimeTokens(r.headline, t)}
          </Dialog.Title>
          <Dialog.Description className="font-body text-[14px] leading-normal text-text-2">
            {renderTimeTokens(r.body, t)}
          </Dialog.Description>
        </section>
        {lines.length > 0 && (
          <section aria-labelledby="political-effects">
            <h3 id="political-effects" className="label-caps mb-1 text-[10px] text-muted">
              Knock-on effects
            </h3>
            <ul className="flex flex-col">
              {lines.map((l) => (
                <li
                  key={l.id}
                  className={cx(
                    'border-b border-dotted border-faint py-1',
                    l.id === 'next' ? 'font-mono text-[12px] text-petrol' : 'font-body text-[12.5px]',
                  )}
                  data-testid={`political-${l.id}`}
                >
                  {l.text}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div
        className="sticky bottom-0 z-10 mt-auto border-t border-track bg-paper px-4 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))]"
        data-testid="result-buttons"
      >
        {onContinue ? (
          <Button
            variant="primary"
            className="w-full"
            onClick={onContinue}
            pending={continuePending}
            data-testid="political-continue"
          >
            Continue
          </Button>
        ) : (
          <Dialog.Close asChild>
            <Button variant="outline" className="w-full">
              Continue
            </Button>
          </Dialog.Close>
        )}
      </div>
    </>
  );
}

/**
 * Slice 4 (screens §4): the arrival. The destination's picture at its station with the stamp
 * *Arrived* and the place line; the headline and the card's line (or the train was on time); the
 * ticket and, for a visitor, the Herald; the unanswered card inside, answerable until *Continue*.
 */
function JourneyBody({
  result,
  ground,
  onContinue,
  continuePending,
  journeyCard,
}: ResultModalProps & { result: JourneyArrivalResult }) {
  const a = result.journey.arrival;
  const waiting = !!result.journey.card && !result.journey.card.chosen;
  if (!a) return null;
  return (
    <>
      <ArtHeader art={a.art} stamp={{ label: a.stamp, tone: 'success' }} caption={a.place} ground={ground} />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-3.5 pb-4">
        <section className="flex flex-col gap-1">
          <span className="label-caps text-[10px] text-success">{copy.travel.arrived}</span>
          <Dialog.Title className="font-display text-[24px] leading-tight font-black" data-testid="arrival-headline">
            {a.headline}
          </Dialog.Title>
          <Dialog.Description className="font-body text-[14px] leading-normal text-text-2" data-testid="arrival-body">
            {a.body}
          </Dialog.Description>
        </section>
        <section aria-labelledby="arrival-effects">
          <h3 id="arrival-effects" className="label-caps mb-1 text-[10px] text-muted">
            Knock-on effects
          </h3>
          <ul className="flex flex-col">
            <li className="border-b border-dotted border-faint py-1 font-body text-[12.5px]" data-testid="arrival-ticket">
              {copy.travel.ticket(a.knockOns.ticket)}
            </li>
            {/* Slice 5 (screens §8.2): rival ground's warning (the first trip), the day's flags, Heat. */}
            {a.knockOns.rivalGround && (
              <li className="border-b border-dotted border-faint py-1 font-body text-[12.5px]" data-testid="arrival-rival">
                {copy.risk.rival.arrivalWarning}
              </li>
            )}
            {a.knockOns.heat && a.knockOns.heat.after !== a.knockOns.heat.before && (
              <li className="border-b border-dotted border-faint py-1 font-body text-[12.5px]" data-testid="arrival-heat">
                {copy.risk.heatKnock(
                  a.knockOns.heat.before,
                  a.knockOns.heat.after,
                  heatWord(heatState(a.knockOns.heat.after)),
                )}
              </li>
            )}
            {(a.knockOns.flags ?? []).map((f) => (
              <li
                key={f}
                className="border-b border-dotted border-faint py-1 font-body text-[12.5px]"
                data-testid="arrival-flag"
              >
                {copy.risk.flags[f](result.journey.to.name, formatUntil(dayStart(dayKey(result.journey.arrivesAt) + 1)))}
              </li>
            ))}
          </ul>
        </section>
        {journeyCard}
      </div>
      {/* Review 5 #7 (answers §7): with a card still to answer, Continue is not shown until one of its
          rows (a choice, or the put-aside row) is tapped; then the outcome prints and it appears. */}
      {!waiting && (
        <div
          className="sticky bottom-0 z-10 mt-auto border-t border-track bg-paper px-4 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))]"
          data-testid="result-buttons"
        >
          <Button
            variant="primary"
            className="w-full"
            onClick={onContinue}
            pending={continuePending}
            data-testid="arrival-continue"
          >
            {copy.travel.continue}
          </Button>
        </div>
      )}
    </>
  );
}

/**
 * A ticket tag's words (screens §8, review 2): "Rally Permits · 10 Energy", "Open Doors · better
 * odds", "Street Fund · +25 % Iron". Never a percentage of chance.
 */
export function ordinanceTagText(t: OrdinanceTagView): string {
  const pct = `${t.value >= 0 ? '+' : '−'}${Math.abs(t.value)} %`;
  switch (t.kind) {
    case 'energy':
      return `${t.name} · ${t.value} Energy`;
    case 'chance':
      return `${t.name} · ${t.value >= 0 ? copy.odds.betterOdds : copy.odds.worseOdds}`;
    case 'iron':
      return `${t.name} · ${pct} Iron`;
    case 'fxp':
      return `${t.name} · ${pct} Party XP`;
    case 'swing':
      return `${t.name} · ${pct} opinion`;
    case 'standing':
      return `${t.name} · reputation ×${t.value}`;
  }
}

/** Each stat that moved between the result's first look and now, in the panel's order. */
function placedStats(
  before: { str: number; int: number; agi: number } | null,
  now: { str: number; int: number; agi: number },
): { stat: string; from: number; to: number }[] {
  if (!before) return [];
  return (['str', 'int', 'agi'] as const)
    .filter((k) => now[k] > before[k])
    .map((k) => ({ stat: statName(k), from: before[k], to: now[k] }));
}

function standingLine(s: NonNullable<ActionResult['effects']['standing']>): string {
  const a: NamedStandingView = s.after;
  if (a.level > s.before.level) return copy.standingUp(a.cityName, a.name);
  return a.next === null ? a.name : `${a.name} · ${a.successes} / ${a.next} to ${a.nextName}`;
}

const OUTCOME_TONE = { success: 'text-success', partial: 'text-partial', failure: 'text-failure' } as const;
const OUTCOME_WORD = { success: 'Success', partial: 'Partial', failure: 'Failure' } as const;

/** A fold's text row: right-aligned Courier, *Details ▾* / *4 more ▾*, expanding in place. */
function FoldButton({
  open,
  onToggle,
  controls,
  children,
  testId,
}: {
  open: boolean;
  onToggle: () => void;
  controls: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      // A 20 px row in the layout (answers §17.2), a 44 px target: the box reaches 12 px above and
      // below it by negative margins.
      className="-my-3 flex min-h-11 min-w-11 cursor-pointer items-center justify-end gap-1 self-end font-mono text-[12px] leading-5 text-petrol hover:underline focus-visible:outline-2 focus-visible:outline-petrol"
      data-testid={testId}
    >
      {children}
      <span aria-hidden="true" className={cx('inline-block transition-transform', open && 'rotate-180')}>
        ▾
      </span>
    </button>
  );
}

/**
 * Review 5 (answers §17.2 item 4): the bonus tags as one line, Oswald caps, no boxes, joined with *·*.
 * When they would wrap the line is cut at the last whole tag that fits and ends *· +n more*, which
 * opens *Details* (where the cut tags are). The tags' widths are measured once per set; a resize only
 * re-fits them.
 */
function TagsLine({
  tags,
  fit,
  onFit,
  onMore,
}: {
  tags: ActionResult['bonusTags'];
  fit: number;
  onFit: (n: number) => void;
  onMore: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const sizes = useRef<{ key: string; widths: number[]; sep: number; more: number } | null>(null);
  const key = tags.map((t) => t.id).join('|');
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      if (sizes.current?.key !== key) {
        const items = [...el.querySelectorAll<HTMLElement>('[data-tag]')];
        // Only when every tag is on the line (the first render of a set); layout widths, so the
        // modal's rise-in transform does not skew them.
        if (items.length !== tags.length) return;
        const sep = el.querySelector<HTMLElement>('[data-tag-sep]')?.offsetWidth ?? 0;
        const more = el.querySelector<HTMLElement>('[data-tag-probe]')?.offsetWidth ?? 0;
        sizes.current = { key, widths: items.map((t) => t.offsetWidth), sep, more };
      }
      const s = sizes.current;
      // Two pixels spare for the rounding of the layout widths.
      if (el.clientWidth <= 0) return;
      onFit(fitTagCount(s.widths, el.clientWidth - 2, s.sep, () => s.more));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [key, tags.length, onFit]);
  const shown = tags.slice(0, fit);
  const cut = tags.length - shown.length;
  const sep = (
    <span aria-hidden="true" className="px-1.5" data-tag-sep>
      ·
    </span>
  );
  return (
    <div
      ref={box}
      className="relative flex h-4 min-w-0 items-center overflow-x-clip leading-4 whitespace-nowrap [@media(max-height:700px)]:flex-1"
      data-testid="result-tags"
    >
      <ul className="flex min-w-0 items-baseline">
        {shown.map((t, i) => (
          <li key={t.id} className="label-caps flex items-baseline text-[10px] text-petrol">
            {i > 0 && sep}
            <span data-tag={t.id}>
              {t.label} · {t.note}
            </span>
          </li>
        ))}
      </ul>
      {cut > 0 && (
        <button
          type="button"
          onClick={onMore}
          // A 16 px line, a 44 px target (the box reaches 14 px above and below it).
          className="label-caps -my-3.5 flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center text-[10px] text-petrol underline decoration-dotted underline-offset-[3px]"
          data-testid="result-tags-more"
        >
          {shown.length > 0 && sep}
          {copy.result.moreTags(cut)}
        </button>
      )}
      {/* The width of *+n more* (the · before it is the separator's), for the fit: generated content,
          so it is never seen, read or in the line's text. */}
      <span
        aria-hidden="true"
        className="label-caps invisible absolute top-0 left-0 text-[10px] whitespace-pre before:content-[attr(data-tag-probe)]"
        data-tag-probe={copy.result.moreTags(9)}
      />
    </div>
  );
}

/** True while a media query matches (re-rendering when it flips). */
function useMedia(query: string): boolean {
  const [match, setMatch] = useState(
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

function ResultBody({
  result: r,
  onAgain,
  againPending,
  energy,
  statPoints,
  onPlaceStat,
  placing,
  trainingPlaces,
  ground,
  factionNames,
  onSentTo,
  sentToPending,
}: ResultModalProps & { result: ActionResult }) {
  const [picking, setPicking] = useState(false);
  const [details, setDetails] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const shortScreen = useMedia(SHORT_SCREEN);
  const [tagFit, setTagFit] = useState(r.bonusTags.length);
  const ids = useId();
  // Review 4 #5 (answers §5): the stats as this result found them, so the placed line can name the
  // stat that moved (*Level 2 · Intelligence 12 → 13*). Taken again when a new result comes in.
  const [seen, setSeen] = useState({ r, stats: statPoints?.stats ?? null });
  if (seen.r !== r || (!seen.stats && statPoints)) {
    if (seen.r !== r) {
      setPicking(false);
      setDetails(false);
      setMoreOpen(false);
      setTagFit(r.bonusTags.length);
    }
    setSeen({ r, stats: statPoints?.stats ?? null });
  }
  const stamp = stampFor(r);
  const street = r.street ?? null;
  const toneText =
    stamp.tone === 'success' ? 'text-success' : stamp.tone === 'failure' ? 'text-failure' : 'text-partial';
  const e = r.effects;
  const names0 = factionNames ?? {};
  // Slice 5 (tech design §10.1): *Mission · Against the Vanguard* before the mission's name.
  const missionKicker = r.mission
    ? r.mission.label === 'speech'
      ? copy.risk.label.speech
      : r.mission.label === 'watch'
        ? copy.risk.label.watch
        : copy.risk.label.against(
            r.mission.targetFactionId ? (names0[r.mission.targetFactionId] ?? r.mission.targetFactionId) : '',
          )
    : null;
  const kicker = r.story
    ? copy.chapterKicker(r.story.ambitionTitle, r.story.chapter, r.story.of)
    : missionKicker
      ? `${missionKicker} · ${r.action.name}`
      : r.action.times > 1
        ? `${r.action.name} · ${r.action.times} times`
        : r.action.name;
  const energyNow = energy?.value ?? r.character.energy.value;
  const short1 = r.again ? energyNow < r.again.cost1 : true;
  const short3 = r.again && r.again.cost3 !== null ? energyNow < r.again.cost3 : false;
  const ready1 = r.again && short1 && energy ? energyReadyAt(energy, r.again.cost1) : null;
  const ready3 =
    r.again && r.again.cost3 !== null && short3 && energy ? energyReadyAt(energy, r.again.cost3) : null;
  const reasons = batchReasons(r.attempts, trainingPlaces);
  const how = howItWent(r, reasons);

  // Review 5 (answers §17.2 item 5): what *Details* holds beyond the receipt's breakdown: the cut
  // tags with their notes, and a ×3's per-row reasons (the one printed under the rows excepted).
  const cutTags = r.bonusTags.slice(tagFit);
  const printedReason = how.kind === 'rows' ? how.reason : null;
  const rowReasons =
    how.kind === 'rows'
      ? r.attempts
          .map((a) => ({ index: a.index, text: reasons.byRow.get(a.index) ?? null }))
          .filter((x): x is { index: number; text: string } => !!x.text && x.text !== printedReason)
      : [];
  const extraDetails: ReactNode[] = [
    ...cutTags.map((t) => (
      <li key={`tag:${t.id}`} className="label-caps text-[10px] text-petrol" data-testid="detail-tag">
        {t.label} · {t.note}
      </li>
    )),
    ...rowReasons.map((x) => (
      <li key={`reason:${x.index}`} data-testid="attempt-reason" data-row={x.index}>
        {x.index} · {x.text}
      </li>
    )),
  ];

  // Slice 4 (tech design §10.1): the points this work added to an Issue, and the scoreboard line.
  const lines = knockOnLines(r, { statPending: statPoints?.pending ?? e.levelUp?.statPoints ?? 0 });
  const knockOnsShown = shortScreen ? KNOCK_ONS_SHOWN_SHORT : KNOCK_ONS_SHOWN;
  const shown = lines.slice(0, knockOnsShown);
  const rest = lines.slice(knockOnsShown);
  const knock = knockOnNodes(r, {
    names: names0,
    level: e.levelUp ? (
      <LevelUpLine
        to={e.levelUp.to}
        statPoints={e.levelUp.statPoints}
        pending={statPoints?.pending ?? null}
        placed={
          statPoints && statPoints.pending <= 0
            ? placedStats(seen.r === r ? seen.stats : null, statPoints.stats)
            : null
        }
        onPlaceIt={statPoints && onPlaceStat && statPoints.pending > 0 ? () => setPicking(true) : null}
      />
    ) : null,
  });

  return (
    <>
      <ArtHeader
        art={r.art}
        stamp={stamp}
        caption={`${r.place.cityName} · ${r.place.locationName} · ${formatClock(Date.parse(r.performedAt))}`}
        ground={ground}
      />
      <div
        // Review 5 (answers §17.2): under 800 px of height the kickers lose their 8 px top gap; under
        // 700 px (QA m2) the middle's own padding is 8 px.
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 pt-3 pb-3 [@media(max-height:700px)]:py-2 [@media(max-height:799.98px)]:gap-2"
        data-testid="result-middle"
      >
        {/* Slice 5 (screens §4.3): the run-in first, when there was one (it is the thing that happened). */}
        {street?.runIn && <RunInBlock runIn={street.runIn} places={trainingPlaces} />}
        {/* 2. What happened; review 5: *How it went* only when it says what the stamp does not. */}
        <section className="flex flex-col gap-1">
          <span className={cx('label-caps text-[10px]', toneText)} data-testid="result-kicker">
            {kicker}
          </span>
          <Dialog.Title className="font-display text-[22px] leading-tight font-black sm:text-[24px]">
            {r.headline}
          </Dialog.Title>
          {/* QA m2: Source Serif 14 / 20 on a phone under 700 px tall. */}
          <Dialog.Description className="font-body text-[15px] leading-[22px] text-text-2 [@media(max-height:700px)]:text-[14px] [@media(max-height:700px)]:leading-[20px]">
            {r.body}
          </Dialog.Description>
          {how.kind === 'reason' && (
            <p className="mt-1 font-body text-[13.5px] leading-snug text-text-2 italic" data-testid="attempt-reason">
              {how.text}
            </p>
          )}
          {how.kind === 'rows' && (
            <>
              <p className="mt-1 font-mono text-[12px] leading-snug" data-testid="attempt-rows" aria-label={how.line}>
                {r.attempts.map((a, i) => (
                  <span key={a.index} data-testid="attempt-row" data-outcome={a.outcome} aria-hidden="true">
                    {i > 0 && ' · '}
                    {a.index} ·{' '}
                    <span className={OUTCOME_TONE[a.outcome]} data-testid="attempt-outcome">
                      {OUTCOME_WORD[a.outcome]}
                    </span>{' '}
                    · {formatSigned(a.rewards.xp.total)}
                  </span>
                ))}
              </p>
              {how.reason && (
                <p
                  className="font-body text-[13.5px] leading-snug text-text-2 italic"
                  data-testid={reasons.shared ? 'attempts-reason' : 'attempt-reason'}
                >
                  {how.reason}
                </p>
              )}
            </>
          )}
          {how.kind === 'runIn' && street?.dropped && r.attempts[0] && (
            // Slice 5 (screens §4.3): after a Run or a loss, the check's outcome with *dropped: you ran*.
            <p className="mt-1 font-mono text-[12px]" data-testid="attempt-row" data-outcome={r.attempts[0].outcome}>
              <span className={OUTCOME_TONE[r.attempts[0].outcome]} data-testid="attempt-outcome">
                {OUTCOME_WORD[r.attempts[0].outcome]}
              </span>{' '}
              <span className="text-muted" data-testid="attempt-dropped">
                {copy.risk.dropped[street.dropped]}
              </span>
            </p>
          )}
        </section>

        {/* 4. Rewards: the tags on one line, the receipt (four lines at most) and *Details*. */}
        {/* QA m2: under 700 px of height the tags ride on the *Rewards* line itself. */}
        <section
          aria-labelledby={`${ids}-rewards`}
          className="flex flex-col gap-1 [@media(max-height:700px)]:flex-row [@media(max-height:700px)]:flex-wrap [@media(max-height:700px)]:items-center [@media(max-height:700px)]:gap-x-3"
        >
          <h3 id={`${ids}-rewards`} className="label-caps shrink-0 text-[10px] text-muted">
            Rewards
          </h3>
          {r.bonusTags.length > 0 && (
            <TagsLine
              tags={r.bonusTags}
              fit={Math.min(tagFit, r.bonusTags.length)}
              onFit={setTagFit}
              onMore={() => setDetails(true)}
            />
          )}
          <Receipt
            r={r}
            names={names0}
            open={details}
            onToggle={() => setDetails((o) => !o)}
            detailsId={`${ids}-details`}
            extra={extraDetails}
          />
        </section>

        {/* 5. Knock-on effects: three lines in the priority of answers §17.2 item 6, then *n more*. */}
        {lines.length > 0 && (
          <section aria-labelledby={`${ids}-effects`} className="flex flex-col">
            <h3 id={`${ids}-effects`} className="label-caps mb-0.5 text-[10px] text-muted">
              Knock-on effects
            </h3>
            <ul className="flex flex-col" data-testid="effect-lines">
              {shown.map((l) => knock(l))}
            </ul>
            {rest.length > 0 && (
              <>
                <ul id={`${ids}-more`} className="flex flex-col" hidden={!moreOpen} data-testid="effect-more">
                  {rest.map((l) => knock(l))}
                </ul>
                <FoldButton
                  open={moreOpen}
                  onToggle={() => setMoreOpen((o) => !o)}
                  controls={`${ids}-more`}
                  testId="effect-more-toggle"
                >
                  {copy.result.more(rest.length)}
                </FoldButton>
              </>
            )}
          </section>
        )}
        {/* Review 5 #4 (answers §4.1): the picker is not inline in the modal; *Place it* opens it as a
            sheet over the modal, and placing the point closes it. */}
        {e.levelUp && statPoints && onPlaceStat && statPoints.pending > 0 && (
          <BottomSheet
            stacked
            open={picking}
            onOpenChange={setPicking}
            // Review 5 (answers §3.2): *Level 5 · one more to place* once a first point is in.
            title={copy.levelPointsToPlace(
              e.levelUp.to,
              statPoints.pending,
              placedStats(seen.r === r ? seen.stats : null, statPoints.stats).length > 0,
            )}
          >
            <StatPointsPanel
              pending={statPoints.pending}
              level={statPoints.level}
              stats={statPoints.stats}
              guide={statPoints.guide}
              onPlace={onPlaceStat}
              placing={placing}
              onLater={() => setPicking(false)}
              title={null}
            />
          </BottomSheet>
        )}
      </div>

      {/* 6. Buttons: a sticky bar, so Again and Continue are on the first screen of a phone
          (mockup MobileMission) however long the breakdown above runs. */}
      <div
        className="sticky bottom-0 z-10 mt-auto flex flex-col gap-1.5 border-t border-track bg-paper px-4 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]"
        data-testid="result-buttons"
      >
        {street?.sentTo ? (
          // Slice 5 (screens §4.3): taken in or carried off: one button, there.
          <Button
            variant="primary"
            className="w-full"
            onClick={onSentTo}
            pending={sentToPending}
            data-testid="result-sent-to"
          >
            {street.sentTo.kind === 'cells' ? copy.risk.toCells : copy.risk.toInfirmary}
          </Button>
        ) : r.again && onAgain ? (
          <AgainButtons
            mission={r.kind === 'mission'}
            again={r.again}
            onAgain={onAgain}
            againPending={againPending ?? null}
            short1={short1}
            short3={short3}
            ready1={ready1}
            ready3={ready3}
          />
        ) : (
          <Dialog.Close asChild>
            <Button variant="outline" className="w-full">
              Continue
            </Button>
          </Dialog.Close>
        )}
      </div>
    </>
  );
}

/**
 * The level-up line (review 5 #4, answers §4.1): *Level 4 · one point to place* and *Place it*; the
 * result is a record of the moment, but the line follows the character (review 4 #5): once no point
 * waits it says so, wherever the point was placed.
 */
function LevelUpLine({
  to,
  statPoints,
  pending,
  placed,
  onPlaceIt,
}: {
  to: number;
  statPoints: number;
  pending: number | null;
  placed: { stat: string; from: number; to: number }[] | null;
  onPlaceIt: (() => void) | null;
}) {
  return (
    <li
      className="mb-1 flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-[1.5px] border-xp bg-paper-card px-2.5 py-1"
      data-testid="effect-level"
    >
      <span className="font-label text-[14px]">
        {placed ? copy.levelUpPlaced(to, placed, statPoints) : copy.levelUpLine(to, pending ?? statPoints)}
      </span>
      {onPlaceIt && (
        <Button variant="outline" className="px-4" onClick={onPlaceIt} data-testid="place-it">
          {copy.placeIt}
        </Button>
      )}
    </li>
  );
}

/**
 * Every knock-on line's node by its `knockOnLines` id (review 5, answers §17.2 item 6): one line each
 * (Courier 12 for a figure, the body face for a sentence) unless it is a card.
 */
function knockOnNodes(
  r: ActionResult,
  o: { names: Partial<Record<FactionId, string>>; level: ReactNode },
): (l: KnockOnLine) => ReactNode {
  const e = r.effects;
  const street = r.street ?? null;
  const left = r.character.orders.items.filter((x) => !x.done).length;
  const fname = (f: FactionId) => o.names[f] ?? (f === r.character.factionId ? r.character.factionName : f);
  const line = (id: string, text: ReactNode, testId: string, tone?: string) => (
    <li
      key={id}
      className={cx('border-b border-dotted border-faint py-[3px] font-body text-[12.5px] leading-4', tone)}
      data-testid={testId}
    >
      {text}
    </li>
  );
  const card = (id: string, body: ReactNode, testId: string) => (
    <li
      key={id}
      className="my-1 border-[1.5px] border-ink bg-paper-card px-2.5 py-1.5 font-body text-[12.5px] leading-snug"
      data-testid={testId}
    >
      {body}
    </li>
  );
  const street_ = streetLines(street, e.heat ?? null);
  return (l) => {
    const [kind, ref] = [l.id.split(':')[0]!, l.id.slice(l.id.indexOf(':') + 1)];
    switch (kind) {
      case 'placeIt':
        return <Fragment key={l.id}>{o.level}</Fragment>;
      case 'standing-card':
        return e.standingUp ? <StandingCard key={l.id} up={e.standingUp} /> : null;
      case 'rank':
        return e.rankUp ? <Effect key={l.id} label={`Rank ${e.rankUp.to}`} value={e.rankUp.title} /> : null;
      case 'heat':
      case 'heat-card':
      case 'record':
      case 'record-escalated':
      case 'record-card':
      case 'orders-off': {
        const s = street_[kind];
        if (!s) return null;
        return s.card ? card(l.id, s.text, `effect-${kind}`) : line(l.id, s.text, `effect-${kind}`, s.tone);
      }
      case 'agility': {
        const agi = street?.agility;
        return agi ? line(l.id, copy.risk.agility(4 - agi.quarters), 'effect-agility') : null;
      }
      case 'remembered':
        return line(l.id, copy.risk.remembered, 'effect-remembered');
      case 'order-signed': {
        // Review 1 (answers §6): an order done is a signed line from the secretary.
        const x = e.orders.find((y) => y.id === ref);
        return x ? line(l.id, copy.orderSigned[r.character.factionId](x.fxp, left), 'effect-order-signed', 'text-petrol') : null;
      }
      case 'order': {
        const x = e.orders.find((y) => y.id === ref);
        return x ? (
          <Effect
            key={l.id}
            label={x.title}
            value={`${x.before} → ${x.after} / ${x.target}${x.done ? ' ✓' : ''}`}
            testId="effect-order"
          />
        ) : null;
      }
      case 'all-orders':
        // m5: where PC first appears, the same line on every device (onboarding §14.1).
        return e.ordersAllDone ? line(l.id, copy.allOrdersDone(e.ordersAllDone.pc), 'effect-all-orders') : null;
      case 'morale':
        return e.morale ? line(l.id, copy.moraleCrossed(e.morale.cityName, e.morale.after), 'effect-morale') : null;
      case 'issue': {
        const x = (e.issues ?? []).find((y) => y.issueId === ref);
        if (!x) return null;
        const sorted = Object.values(x.totals).sort((a, b) => b - a);
        const who = x.leader === null ? null : x.leader === x.factionId ? '' : fname(x.leader);
        return line(
          l.id,
          copy.capital.issuePoints(x.name, fname(x.factionId), x.added, copy.capital.leadsBy(who, sorted[0] ?? 0, sorted[1] ?? 0)),
          'effect-issue',
        );
      }
      case 'branch':
        return e.branch
          ? line(
              l.id,
              `${copy.branchEndorsesYou} · ${e.branch.backers} ${e.branch.backers === 1 ? 'backer' : 'backers'}`,
              'effect-branch',
            )
          : null;
      case 'pc':
        return e.pc ? <Effect key={l.id} label="Political Capital" value={`${e.pc.before} → ${e.pc.after}`} /> : null;
      case 'standing':
        return e.standing ? (
          <Effect key={l.id} label="Reputation" value={standingLine(e.standing)} testId="effect-standing" />
        ) : null;
      case 'scoreboard':
        return e.scoreboard ? (
          <li
            key={l.id}
            className="border-b border-dotted border-faint py-[3px] font-mono text-[12px] leading-4 text-petrol"
            data-testid="effect-scoreboard"
          >
            {copy.scoreboard.line(
              e.scoreboard.placeName,
              formatSwing(e.scoreboard.swing),
              r.character.factionName,
              ordinal(e.scoreboard.rank),
              e.scoreboard.of,
            )}
          </li>
        ) : null;
      case 'hook': {
        const h = (e.hooks ?? [])[Number(ref)];
        return h ? line(l.id, h, 'effect-hook') : null;
      }
      case 'trained':
        return e.stat ? (
          <Effect
            key={l.id}
            label="Trained"
            value={`${statName(e.stat.stat)} ${e.stat.before} → ${e.stat.after}`}
            testId="effect-stat"
          />
        ) : null;
      case 'energy':
        return (
          <Effect
            key={l.id}
            label="Energy"
            value={`${e.energy.before} → ${e.energy.after}`}
            testId="effect-energy"
            more={
              e.rested.before > 0 || e.rested.after > 0 ? (
                <span className="font-label text-muted" data-testid="effect-rested">
                  {copy.result.rested(e.rested.before, e.rested.after)}
                </span>
              ) : null
            }
          />
        );
      default:
        return null;
    }
  };
}

/** Review 1 (answers §9): the new level's title, what changed, what the next level brings. */
function StandingCard({ up }: { up: NonNullable<ActionResult['effects']['standingUp']> }) {
  const [heading, now, next] = copy.standingCard[up.level](up.cityName, up.rank3Title);
  return (
    <li
      className="my-1 flex flex-col gap-0.5 border-[1.5px] border-petrol bg-paper-card px-2.5 py-1.5"
      data-testid="effect-standing-card"
    >
      <span className="label-caps text-[10px] text-muted">{copy.standingCard.kicker}</span>
      <span className="font-display text-[17px] leading-tight font-black text-petrol">{heading}</span>
      <span className="font-body text-[13px]">{now}</span>
      <span className="font-body text-[12.5px] text-text-2">{next}</span>
    </li>
  );
}

/**
 * Review 3 (answers §3, GDD §13.1a), compacted by review 5 (answers §17.2 item 5): the rewards as a
 * printed receipt, four lines at most (XP, Party XP, Iron, opinion; an item or keepsake as a fifth on
 * a chapter, §18 Q2). XP and Party XP keep their bar and one Courier note, the distance to the next
 * Level or Rank; Iron and opinion are one line each with no note. A zero line is not printed. The
 * breakdown (the parts of XP, Party XP and Iron, the opinion's factors and meter line), the cut tags
 * and a ×3's reasons wait behind *Details ▾*, which expands in place.
 */
/**
 * Review 3 open point (answers §9.2): the thin bars under XP and Party XP. If they read as clutter in
 * the next play-through, this goes false: the notes stay.
 */
const RECEIPT_BARS = true;

function Receipt({
  r,
  names = {},
  open,
  onToggle,
  detailsId,
  extra,
}: {
  r: ActionResult;
  names?: Partial<Record<FactionId, string>>;
  open: boolean;
  onToggle: () => void;
  detailsId: string;
  extra: ReactNode[];
}) {
  const c = r.character;
  const e = r.effects;
  const item = e.item ?? null;
  const factionStyle = FACTION_STYLE[c.factionId];
  const floor = xpForLevel(c.level);
  const next = xpForLevel(c.level + 1);
  const toLevel = copy.reward.toLevel(formatNumber(next - c.xp), c.level + 1);
  const { fxpFloor, fxpNext, nextTitle } = c.rank;
  const up = fxpNext !== null && nextTitle !== null ? { fxp: fxpNext, title: nextTitle } : null;
  const toRank = up
    ? copy.reward.toRank(formatNumber(c.fxp), formatNumber(up.fxp), up.title)
    : copy.reward.top(formatNumber(c.fxp));
  const join = (...parts: Array<string | null>) => parts.filter(Boolean).join(' · ') || null;
  const rows: ReactNode[] = [];
  const details: ReactNode[] = [];
  const detail = (id: string, label: string, text: string | null) => {
    if (text)
      details.push(
        <li key={id} data-testid={`detail-${id}`}>
          {label} · {text}
        </li>,
      );
  };
  if (r.rewards.xp.total !== 0) {
    rows.push(
      <ReceiptRow
        key="xp"
        label={copy.reward.xp}
        value={formatSigned(r.rewards.xp.total)}
        note={toLevel}
        bar={
          RECEIPT_BARS
            ? { label: copy.hud.xp, value: c.xp - floor, max: next - floor, className: 'bg-ink' }
            : undefined
        }
        testId="reward-xp"
      />,
    );
    detail('xp', copy.reward.xp, partsNote(r.rewards.xp));
  }
  if (r.rewards.fxp.total !== 0) {
    rows.push(
      <ReceiptRow
        key="fxp"
        label={copy.reward.fxp}
        value={formatSigned(r.rewards.fxp.total)}
        valueClassName={factionStyle.text}
        note={toRank}
        bar={
          RECEIPT_BARS
            ? {
                label: copy.hud.fxp,
                value: up ? c.fxp - fxpFloor : 1,
                max: up ? up.fxp - fxpFloor : 1,
                color: factionStyle.color,
              }
            : undefined
        }
        testId="reward-fxp"
      />,
    );
    detail('fxp', copy.reward.fxp, partsNote(r.rewards.fxp));
  }
  if (r.rewards.iron.total !== 0) {
    rows.push(
      <ReceiptRow key="iron" label={copy.reward.iron} value={formatSigned(r.rewards.iron.total)} testId="reward-iron" />,
    );
    detail('iron', copy.reward.iron, partsNote(r.rewards.iron));
  }
  const against = e.opinion?.mode === 'against' ? e.opinion : null;
  if (against && against.applied !== 0) {
    // Slice 5 (screens §4.3): *Opinion against the Vanguard in Coalport · −0.20*; the meter in Details.
    const target = against.targetFactionId ?? against.factionId;
    const tname = names[target] ?? c.factionNames?.[target] ?? target;
    const label = copy.risk.opinionAgainst(tname, against.placeName ?? r.place.cityName);
    rows.push(
      <ReceiptRow
        key="opinion"
        label={label}
        // QA fixes n4: points, never a `%` (the share's move carries the %).
        value={formatOpinionDelta(-Math.abs(against.applied))}
        testId="reward-opinion"
      />,
    );
    details.push(
      <li key="opinion" data-testid="detail-opinion">
        {copy.reward.opinionMove(tname, formatShare(against.shareBefore), formatShare(against.shareAfter))}
      </li>,
    );
  } else if (e.opinion && r.rewards.opinion !== 0) {
    rows.push(
      <ReceiptRow
        key="opinion"
        // Slice 4: the district whose meter moved ("Opinion in Station & Market").
        label={copy.reward.opinion(e.opinion.placeName ?? r.place.cityName)}
        value={`${formatOpinionDelta(r.rewards.opinion)} %`}
        valueClassName={factionStyle.text}
        testId="reward-opinion"
      />,
    );
    // Slice 4 (ADR 0030 §4): the named factors first (*Close race +25 % · Issue: Tram Fare Hike
    // +50 %*), then the meter's move.
    details.push(
      <li key="opinion" data-testid="detail-opinion">
        {join(
          ...(r.rewards.opinionFactors ?? []).map((f) => copy.reward.factor(f.label, f.pct)),
          copy.reward.opinionMove(c.factionName, formatShare(e.opinion.shareBefore), formatShare(e.opinion.shareAfter)),
        )}
      </li>,
    );
  }
  if (item)
    rows.push(
      <li
        key="item"
        className="flex min-h-[48px] items-center gap-2.5 border-b border-dotted border-faint py-1"
        data-testid="reward-item"
      >
        <Picture asset={item.art} sizes="40px" decorative className="size-10 shrink-0 object-cover" />
        <span className="font-body text-[13px]">
          {item.keepsake ? copy.reward.keepsake : copy.reward.item} ·{' '}
          <span className="font-display font-bold">{item.name}</span>
        </span>
      </li>,
    );
  const all = [...details, ...extra];
  if (rows.length === 0 && all.length === 0) return null;
  return (
    // QA m2: a full row of its own when the tags share the *Rewards* line (under 700 px of height).
    <div className="flex flex-col [@media(max-height:700px)]:basis-full">
      {rows.length > 0 && (
        <ul className="flex flex-col border-t border-dotted border-faint" data-testid="receipt">
          {rows}
        </ul>
      )}
      {all.length > 0 && (
        <>
          <FoldButton open={open} onToggle={onToggle} controls={detailsId} testId="result-details">
            {copy.result.details}
          </FoldButton>
          <ul
            id={detailsId}
            hidden={!open}
            className="flex flex-col gap-0.5 border-b border-dotted border-faint pb-1.5 font-mono text-[11px] leading-snug text-muted"
            data-testid="result-details-list"
          >
            {all}
          </ul>
        </>
      )}
    </div>
  );
}

/** "+40 and Rested +5" (the base and its parts), or null when the line is all base. */
/** Slice 5's receipt parts in the screens' words (screens §4.3; QA fixes n4): lower case, joined by *·*. */
const RISK_PARTS: Record<string, (n: number) => string> = {
  rivalGround: (n) => copy.risk.parts.rivalGround(Math.abs(n)),
  fullStrength: (n) => copy.risk.parts.fullStrength(Math.abs(n)),
  paidOff: (n) => copy.risk.parts.paidOff(Math.abs(n)),
  record: (n) => copy.risk.yourRecordPart(Math.abs(n)),
  // Review 5 (answers §18 Q1): a night mission's Iron part, *night rate +15*.
  nightRate: (n) => copy.night.ratePart(Math.abs(n)),
};

function partsNote(line: RewardLine): string | null {
  if (line.parts && line.parts.length > 0) {
    const risk = line.parts.some((p) => RISK_PARTS[p.id ?? '']);
    const words = line.parts.map((p) =>
      RISK_PARTS[p.id ?? ''] ? RISK_PARTS[p.id!]!(p.amount) : `${p.label} ${formatSigned(p.amount)}`,
    );
    if (risk) return [formatSigned(line.base), ...words].join(' · ');
    return copy.reward.parts(formatSigned(line.base), words.join(' and '));
  }
  if (line.bonus > 0) return copy.reward.parts(formatSigned(line.base), `${formatSigned(line.bonus)} bonus`);
  return null;
}

function ReceiptRow({
  label,
  value,
  valueClassName,
  note,
  bar,
  testId,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  note?: string | null;
  bar?: { label: string; value: number; max: number; className?: string; color?: string };
  testId: string;
}) {
  const pct = bar && bar.max > 0 ? Math.max(0, Math.min(100, (bar.value / bar.max) * 100)) : 0;
  return (
    <li
      className="flex min-h-7 flex-col justify-center gap-px border-b border-dotted border-faint py-[3px]"
      data-testid={testId}
    >
      {/* Review 5 (answers §17.2 item 5): the one note (the distance to the next Level or Rank) beside
          the label, so the line and its bar take two rows, not three. */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-body text-[13px]" data-testid="reward-label">
            {label}
          </span>
          {note && (
            <span className="truncate font-mono text-[10.5px] text-muted" data-testid="reward-note">
              {note}
            </span>
          )}
        </span>
        <span
          className={cx('font-label text-[17px] leading-none font-semibold', valueClassName)}
          data-testid="reward-value"
        >
          {value}
        </span>
      </div>
      {bar && (
        <div
          role="progressbar"
          aria-label={bar.label}
          aria-valuemin={0}
          aria-valuemax={bar.max}
          aria-valuenow={Math.min(bar.value, bar.max)}
          className="mt-px h-[3px] w-full bg-track"
          data-testid="reward-bar"
        >
          <div
            className={cx('h-[3px]', bar.className)}
            style={{ width: `${pct}%`, ...(bar.color ? { backgroundColor: bar.color } : {}) }}
          />
        </div>
      )}
    </li>
  );
}

/**
 * Review 3 (answers §4.2): the repeat buttons say what they do and what they cost, never a bare
 * number: *Once more · 10 Energy* · *Three more · 30 Energy* · *Continue*, or after a *Trained*
 * result *Study again · 46 Energy* · *Continue*. On a phone the repeats sit side by side with the cost
 * on a second line and *Continue* under them; from 640 px one row, the labels on one line. Review 5
 * (answers §17.2): a single repeat (a mission's *Again*, a training's) sits beside *Continue* on a
 * phone too, a row the compact result needs. Short of Energy a button is disabled and keeps its label
 * and cost; one hint line says when (the first that is short).
 */
function AgainButtons({
  mission = false,
  again,
  onAgain,
  againPending,
  short1,
  short3,
  ready1,
  ready3,
}: {
  /** Slice 5 (screens §4.3): a mission's one repeat, *Again · 15 Energy* (the remembered way). */
  mission?: boolean;
  again: NonNullable<ActionResult['again']>;
  onAgain: (times: 1 | 3) => void;
  againPending: 1 | 3 | null;
  short1: boolean;
  short3: boolean;
  ready1: number | null;
  ready3: number | null;
}) {
  const at = (t: number | null) => (t === null ? '—' : formatWhen(t));
  // A *Trained* result: the action's verb (stored results from before review 3 have none).
  const verb = again.cost3 === null && again.verb ? again.verb : null;
  const once = mission
    ? { full: copy.risk.wayCost(copy.risk.again, again.cost1), label: copy.risk.again }
    : verb
      ? { full: copy.again.train(verb, again.cost1), label: copy.again.trainLabel(verb) }
      : { full: copy.again.once(again.cost1), label: copy.again.onceLabel };
  const repeat = (
    times: 1 | 3,
    full: string,
    label: string,
    cost: number,
    short: boolean,
    variant: 'primary' | 'secondary',
    testId: string,
  ) => (
    <Button
      variant={variant}
      onClick={() => onAgain(times)}
      pending={againPending === times}
      disabled={short || !!againPending}
      aria-label={full}
      className="min-h-12 flex-col gap-0 px-2 sm:min-h-11 sm:flex-row sm:gap-1.5 [@media(max-height:799.98px)]:px-1"
      data-testid={testId}
    >
      {/* Phone: the label over its cost; from 640 px one line, "Once more · 10 Energy". */}
      <span className="text-[12px] leading-tight whitespace-nowrap sm:text-[13px]">{label}</span>
      <span
        aria-hidden="true"
        className={cx(
          'font-mono text-[11px] leading-tight tracking-normal normal-case sm:font-label sm:text-[13px]',
          short
            ? 'text-paper'
            : variant === 'primary'
              ? 'text-energy-light sm:text-energy'
              : 'text-energy-light',
        )}
        data-testid="again-cost"
      >
        <span className="hidden sm:inline">· </span>
        {copy.again.cost(cost)}
      </span>
    </Button>
  );
  const hint = short1
    ? verb
      ? copy.again.trainNeeds(verb, again.cost1, at(ready1))
      : copy.again.onceNeeds(again.cost1, at(ready1))
    : short3 && again.cost3 !== null
      ? copy.again.threeNeeds(again.cost3, at(ready3))
      : null;
  return (
    <>
      <div
        className={cx(
          'grid gap-2',
          // QA m2: on a phone under 800 px tall the three sit in one row (the label over its cost).
          again.cost3 === null ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 [@media(max-height:799.98px)]:grid-cols-3',
        )}
      >
        {repeat(1, once.full, once.label, again.cost1, short1, 'primary', 'again-once')}
        {again.cost3 !== null &&
          repeat(
            3,
            copy.again.three(again.cost3),
            copy.again.threeLabel,
            again.cost3,
            short3,
            'secondary',
            'again-three',
          )}
        <Dialog.Close asChild>
          <Button
            variant="outline"
            className={cx(again.cost3 !== null && 'col-span-2 sm:col-span-1 [@media(max-height:799.98px)]:col-span-1')}
          >
            Continue
          </Button>
        </Dialog.Close>
      </div>
      {hint && (
        <p className="font-mono text-[11px] text-muted" data-testid="again-hint">
          {hint}
        </p>
      )}
    </>
  );
}

/** One knock-on figure: the label left, the value right (Courier-free: the label face), on one line. */
function Effect({
  label,
  value,
  testId,
  more,
}: {
  label: string;
  value: string;
  testId?: string;
  /** A second figure on the same line (Energy's *Rested 30 → 20*). */
  more?: ReactNode;
}) {
  return (
    <li className="flex justify-between gap-2.5 border-b border-dotted border-faint py-[3px] text-[12.5px] leading-4">
      <span className="font-body">{label}</span>
      <span className="flex flex-wrap justify-end gap-x-2 text-right">
        <span className="font-label" data-testid={testId}>
          {value}
        </span>
        {more}
      </span>
    </li>
  );
}

/**
 * Slice 5 (screens §4.3): the street's knock-on lines by id: Heat (and the first crossing's card), the
 * record (and the first mark's card), the orders taken off. Also a chapter's Heat.
 */
function streetLines(
  street: NonNullable<ActionResult['street']> | null,
  chapterHeat: NonNullable<ActionResult['effects']['heat']> | null,
): Partial<Record<string, { text: string; card?: boolean; tone?: string }>> {
  const out: Partial<Record<string, { text: string; card?: boolean; tone?: string }>> = {};
  const heat = street?.heat ?? chapterHeat;
  if (heat && heat.after !== heat.before) {
    out.heat = {
      text: copy.risk.heatMove(
        formatSigned(heat.after - heat.before),
        heat.after,
        heatWord(heat.state),
        heat.state !== 'cool' && heat.coolsAt !== null ? formatWhen(heat.coolsAt) : null,
      ),
      ...(heat.state === 'hot' || heat.state === 'wanted' ? { tone: 'text-failure' } : {}),
    };
    if (heat.first && heat.state !== 'cool')
      out['heat-card'] = {
        // Review 4 (answers §12): the Noticed card says when it cools.
        text:
          heat.state === 'noticed' && heat.coolsAt !== null
            ? `${copy.risk.heatCard.noticed} ${copy.risk.heatCardCool(formatWhen(heat.coolsAt))}`
            : copy.risk.heatCard[heat.state],
        card: true,
      };
  }
  const rec = street?.record ?? null;
  if (rec && rec.added > 0) {
    // Review 4 #20 (answers §20.3): an arrest's marks read *Your record: taken in · 1 mark · On file*.
    out.record = {
      text: rec.takenIn
        ? copy.risk.takenInKnock(rec.added, recordWord(rec.after))
        : copy.risk.nameTaken(rec.marks, recordWord(rec.after)),
    };
    if (rec.escalated) out['record-escalated'] = { text: copy.risk.secondTime, tone: 'text-failure' };
    // QA m5: the card of the level reached, on its first crossing; the fade clause only when every
    // live mark is minor (a result stored before the fix has no `allMinor`: minor unless escalated).
    if (rec.first && rec.after !== 'clean')
      out['record-card'] = {
        text: copy.risk.recordCard(rec.after, rec.marks, rec.allMinor ?? !rec.escalated),
        card: true,
      };
  }
  // Review 4 #20 (answers §20.3, tech design §11.6): the cells took the day's orders off.
  if (street?.ordersOff) out['orders-off'] = { text: copy.risk.ordersOffKnock, tone: 'text-failure' };
  return out;
}
