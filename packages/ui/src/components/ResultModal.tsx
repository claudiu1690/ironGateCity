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
  ResultAttempt,
  RewardLine,
  StatPointTarget,
} from '@irongate/rules';
import { useState } from 'react';
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
import type { TrainingPlaces } from '../odds';
import { Button } from './Button';
import { formatSwing, ordinal } from './Capital';
import { FACTION_STYLE } from './FactionCrest';
import { GroundSash } from './GroundSash';
import type { Ground } from './GroundSash';
import { ArtPanel } from './HallHeader';
import { Picture } from './Picture';
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
const CARD_ACTS = new Set(['bail', 'released', 'deported', 'walkOut', 'discharged', 'strike']);

export function ResultModal(props: ResultModalProps) {
  const { result, open, onOpenChange } = props;
  const card = result?.kind === 'political' && CARD_ACTS.has(result.act);
  return (
    <Dialog.Root open={open && result !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="ease-dim fixed inset-0 z-40 bg-ink/75" />
        <Dialog.Content
          className={cx(
            // Slice 5 (review 3: never pop): it rises in over the dim and back out.
            card
              ? 'ease-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-y-auto bg-paper text-ink shadow-[0_-10px_30px_rgb(0_0_0/0.45)]'
              : 'ease-card fixed inset-0 z-50 flex flex-col overflow-y-auto bg-paper text-ink',
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
    <ArtPanel art={art} className="h-[150px]">
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
        <Stamp tone={stamp.tone} label={stamp.label} />
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
  if (k.endorsements) {
    lines.push({
      id: 'endorsements',
      text: `${k.endorsements.name}: ${copy.backersOf(k.endorsements.n, k.endorsements.needed)}`,
    });
  }
  // Slice 4 (screens §6.3): a move or a room: the Iron, a home seat given up, a candidacy withdrawn.
  if (k.iron) {
    const spent = k.iron.before - k.iron.after;
    lines.push({
      id: 'iron',
      text:
        r.act === 'bail'
          ? copy.risk.bailPaid(spent)
          : r.act === 'walkOut'
            ? copy.risk.wardPaid(spent)
            : copy.ironLeft(spent, formatNumber(k.iron.after)),
    });
  }
  if (k.energy) lines.push({ id: 'energy', text: copy.risk.energyKnock(k.energy.before - k.energy.after) });
  if (k.seatGivenUp) lines.push({ id: 'seat', text: copy.residence.seatGivenUp(k.seatGivenUp.cityName) });
  if (k.candidacyWithdrawn) lines.push({ id: 'candidacy', text: copy.residence.candidacyWithdrawn });
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
            {a.knockOns.heraldVisitor && (
              <li className="border-b border-dotted border-faint py-1 font-body text-[12.5px]" data-testid="arrival-herald">
                {copy.travel.heraldYours}
              </li>
            )}
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

function standingLine(s: NonNullable<ActionResult['effects']['standing']>): string {
  const a: NamedStandingView = s.after;
  if (a.level > s.before.level) return copy.standingUp(a.cityName, a.name);
  return a.next === null ? a.name : `${a.name} · ${a.successes} / ${a.next} to ${a.nextName}`;
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
  const [later, setLater] = useState(false);
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
  const item = e.item ?? null;
  const hooks = e.hooks ?? [];
  const energyNow = energy?.value ?? r.character.energy.value;
  const short1 = r.again ? energyNow < r.again.cost1 : true;
  const short3 = r.again && r.again.cost3 !== null ? energyNow < r.again.cost3 : false;
  const ready1 = r.again && short1 && energy ? energyReadyAt(energy, r.again.cost1) : null;
  const ready3 =
    r.again && r.again.cost3 !== null && short3 && energy ? energyReadyAt(energy, r.again.cost3) : null;
  // Orders still open after this action, for the signed line ("Two remain").
  const left = r.character.orders.items.filter((o) => !o.done).length;
  const signed = e.orders
    .filter((o) => o.fxp > 0)
    .map((o) => copy.orderSigned[r.character.factionId](o.fxp, left));
  const reasons = batchReasons(r.attempts, trainingPlaces);

  // Slice 4 (tech design §10.1): the points this work added to an Issue, and the scoreboard line.
  const names = factionNames ?? {};
  const fname = (f: FactionId) => names[f] ?? (f === r.character.factionId ? r.character.factionName : f);
  const issueLines = (e.issues ?? []).map((x) => {
    const sorted = Object.values(x.totals).sort((a, b) => b - a);
    const who = x.leader === null ? null : x.leader === x.factionId ? '' : fname(x.leader);
    return {
      id: x.issueId,
      text: copy.capital.issuePoints(
        x.name,
        fname(x.factionId),
        x.added,
        copy.capital.leadsBy(who, sorted[0] ?? 0, sorted[1] ?? 0),
      ),
    };
  });
  const scoreLine = e.scoreboard
    ? copy.scoreboard.line(
        e.scoreboard.placeName,
        formatSwing(e.scoreboard.swing),
        r.character.factionName,
        ordinal(e.scoreboard.rank),
        e.scoreboard.of,
      )
    : null;

  return (
    <>
      <ArtHeader
        art={r.art}
        stamp={stamp}
        caption={`${r.place.cityName} · ${r.place.locationName} · ${formatClock(Date.parse(r.performedAt))}`}
        ground={ground}
      />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-3.5 pb-4">
        {/* Slice 5 (screens §4.3): the run-in first, when there was one. */}
        {street?.runIn && <RunInBlock runIn={street.runIn} places={trainingPlaces} />}
        {/* 2. What happened */}
        <section className="flex flex-col gap-1">
          <span className={cx('label-caps text-[10px]', toneText)} data-testid="result-kicker">
            {kicker}
          </span>
          <Dialog.Title className="font-display text-[24px] leading-tight font-black">
            {r.headline}
          </Dialog.Title>
          <Dialog.Description className="font-body text-[14px] leading-normal text-text-2">
            {r.body}
          </Dialog.Description>
        </section>

        {/* 3. How it went */}
        <section aria-labelledby="how-it-went" className="flex flex-col gap-1.5">
          <h3 id="how-it-went" className="label-caps text-[10px] text-muted">
            How it went
          </h3>
          {r.attempts.map((a) => (
            <AttemptRow
              key={a.index}
              attempt={a}
              reason={reasons.byRow.get(a.index) ?? null}
              dropped={a.index === 1 ? (street?.dropped ?? null) : null}
            />
          ))}
          {reasons.shared && (
            <p
              className="pl-6 font-body text-[12.5px] leading-snug text-text-2"
              data-testid="attempts-reason"
            >
              {reasons.shared}
            </p>
          )}
          {r.rows.map((row) => (
            <div
              key={row.index}
              className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2"
              data-testid="attempt-row"
            >
              <span className="font-label text-[12px] text-muted">{row.index}</span>
              <span className="font-label text-[13px]">{row.label}</span>
              <span className="font-mono text-[11px] text-muted">{row.detail}</span>
            </div>
          ))}
        </section>

        {/* 4. Rewards */}
        <section aria-labelledby="rewards" className="flex flex-col gap-2">
          <h3 id="rewards" className="label-caps text-[10px] text-muted">
            Rewards
          </h3>
          {r.bonusTags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {r.bonusTags.map((tag) => (
                <li
                  key={tag.id}
                  className="label-caps border border-petrol px-1.5 py-0.5 text-[10px] text-petrol"
                >
                  {tag.label} · {tag.note}
                </li>
              ))}
            </ul>
          )}
          <Receipt r={r} names={names0} />
        </section>

        {/* 5. Knock-on effects */}
        <section aria-labelledby="effects">
          <h3 id="effects" className="label-caps mb-1 text-[10px] text-muted">
            Knock-on effects
          </h3>
          {/* n2: the level-up and its stat point first, so on a desktop it is on the first screen with
              Continue, not below the list of effects. */}
          {e.levelUp && (
            <div
              className="mb-2 flex flex-col gap-1.5 border-[1.5px] border-xp bg-paper-card p-2.5"
              data-testid="effect-level"
            >
              <span className="font-label text-[14px]">
                {/* Review 4 #5: the result is a record of the moment, but the line follows the
                    character: once no point waits it says so, wherever the point was placed. */}
                {statPoints && statPoints.pending <= 0
                  ? copy.levelUpPlaced(e.levelUp.from, e.levelUp.to)
                  : copy.levelUpLine(e.levelUp.from, e.levelUp.to, e.levelUp.statPoints)}
              </span>
              {statPoints && onPlaceStat && !later && (
                <StatPointsPanel
                  pending={statPoints.pending}
                  level={statPoints.level}
                  stats={statPoints.stats}
                  guide={statPoints.guide}
                  onPlace={onPlaceStat}
                  placing={placing}
                  onLater={() => setLater(true)}
                  title={statPoints.pending > 0 ? copy.pointsToPlace(statPoints.pending) : undefined}
                />
              )}
            </div>
          )}
          {/* Review 1 (§13.4, answers §9): a Standing level crossed is a card in the level-up's block. */}
          {e.standingUp && <StandingCard up={e.standingUp} />}
          <StreetLines street={street} heat={e.heat ?? null} stat={e.stat} />
          {(item ||
            hooks.length > 0 ||
            e.ordersAllDone ||
            e.morale ||
            e.branchEndorsement ||
            issueLines.length > 0 ||
            scoreLine ||
            signed.length > 0) && (
            <ul className="flex flex-col">
              {/* Slice 4: the Issue's points and the scoreboard (tech design §10.1). */}
              {issueLines.map((l) => (
                <li
                  key={l.id}
                  className="border-b border-dotted border-faint py-1 font-body text-[12.5px]"
                  data-testid="effect-issue"
                >
                  {l.text}
                </li>
              ))}
              {scoreLine && (
                <li
                  className="border-b border-dotted border-faint py-1 font-mono text-[12px] text-petrol"
                  data-testid="effect-scoreboard"
                >
                  {scoreLine}
                </li>
              )}
              {/* Review 1 (answers §6): an order done is a signed line from the secretary. */}
              {signed.map((line) => (
                <li
                  key={line}
                  className="border-b border-dotted border-faint py-1 font-body text-[12.5px] text-petrol"
                  data-testid="effect-order-signed"
                >
                  {line}
                </li>
              ))}
              {e.morale && (
                <li
                  className="border-b border-dotted border-faint py-1 font-body text-[12.5px]"
                  data-testid="effect-morale"
                >
                  {copy.moraleCrossed(e.morale.cityName, e.morale.after)}
                </li>
              )}
              {e.branchEndorsement && (
                <li
                  className="border-b border-dotted border-faint py-1 font-body text-[12.5px]"
                  data-testid="effect-branch"
                >
                  {copy.branchEndorsesYou} · {e.branchEndorsement.endorsements} / {e.branchEndorsement.needed}
                </li>
              )}
              {/* m5: where PC first appears, the same line on every device (onboarding §14.1). */}
              {e.ordersAllDone && (
                <li
                  className="border-b border-dotted border-faint py-1 font-body text-[12.5px]"
                  data-testid="effect-all-orders"
                >
                  {copy.allOrdersDone(e.ordersAllDone.pc)}
                </li>
              )}
              {item && (
                <li
                  className="border-b border-dotted border-faint py-1 font-body text-[12.5px]"
                  data-testid="effect-item"
                >
                  {copy.keepsakeLine(item.name)}
                </li>
              )}
              {hooks.map((h) => (
                <li
                  key={h}
                  className="border-b border-dotted border-faint py-1 font-body text-[12.5px]"
                  data-testid="effect-hook"
                >
                  {h}
                </li>
              ))}
            </ul>
          )}
          <dl className="flex flex-col">
            {e.standing && (
              <Effect label="Reputation" value={standingLine(e.standing)} testId="effect-standing" />
            )}
            {e.orders.map((o) => (
              <Effect
                key={o.id}
                label={o.title}
                value={`${o.before} → ${o.after} / ${o.target}${o.done ? ' ✓' : ''}`}
                testId="effect-order"
              />
            ))}
            {e.rankUp && <Effect label={`Rank ${e.rankUp.to}`} value={e.rankUp.title} />}
            {e.stat && (
              <Effect
                label="Trained"
                value={`${statName(e.stat.stat)} ${e.stat.before} → ${e.stat.after}`}
                testId="effect-stat"
              />
            )}
            <Effect label="Energy" value={`${e.energy.before} → ${e.energy.after}`} testId="effect-energy" />
            {(e.rested.before > 0 || e.rested.after > 0) && (
              <Effect label="Rested" value={`${e.rested.before} → ${e.rested.after}`} />
            )}
            {/* Review 3 (answers §3.3): the XP, Party XP, Iron and opinion before → after lines are on
                the receipt above. */}
            {e.pc && <Effect label="Political Capital" value={`${e.pc.before} → ${e.pc.after}`} />}
          </dl>
        </section>
      </div>

      {/* 6. Buttons: a sticky bar, so Again and Continue are on the first screen of a phone
          (mockup MobileMission) however long the breakdown above runs. */}
      <div
        className="sticky bottom-0 z-10 mt-auto flex flex-col gap-1.5 border-t border-track bg-paper px-4 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))]"
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

/** Review 1 (answers §9): the new level's title, what changed, what the next level brings. */
function StandingCard({ up }: { up: NonNullable<ActionResult['effects']['standingUp']> }) {
  const [heading, now, next] = copy.standingCard[up.level](up.cityName, up.rank3Title);
  return (
    <div
      className="mb-2 flex flex-col gap-1 border-[1.5px] border-petrol bg-paper-card p-2.5"
      data-testid="effect-standing-card"
    >
      <span className="label-caps text-[10px] text-muted">{copy.standingCard.kicker}</span>
      <span className="font-display text-[18px] leading-tight font-black text-petrol">{heading}</span>
      <span className="font-body text-[13px]">{now}</span>
      <span className="font-body text-[12.5px] text-text-2">{next}</span>
    </div>
  );
}

/**
 * One attempt (review 2, answers §2.3): the index, the outcome in its colour and the XP; under a row
 * that isn't a Success, one plain reason. Nothing opens on a tap: no bar, no roll, no ledger.
 */
function AttemptRow({
  attempt: a,
  reason,
  dropped = null,
}: {
  attempt: ResultAttempt;
  reason: string | null;
  /** Slice 5 (screens §4.3): after a Run or a loss, the check's outcome with *dropped: you ran*. */
  dropped?: 'ran' | 'lost' | null;
}) {
  const success = a.outcome === 'success';
  const failure = a.outcome === 'failure';
  const label = success ? 'Success' : a.outcome === 'partial' ? 'Partial' : 'Failure';
  return (
    <div className="flex flex-col gap-0.5" data-testid="attempt-row" data-outcome={a.outcome}>
      <div className="grid min-h-8 grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2">
        <span className="font-label text-[12px] text-muted">{a.index}</span>
        <span
          className={cx(
            'label-caps text-[12px] font-semibold tracking-[0.08em]',
            success ? 'text-success' : failure ? 'text-failure' : 'text-partial',
          )}
          data-testid="attempt-outcome"
        >
          {label}
          {dropped && (
            <span
              className="ml-2 font-mono text-[11px] font-normal tracking-normal text-muted normal-case"
              data-testid="attempt-dropped"
            >
              {copy.risk.dropped[dropped]}
            </span>
          )}
        </span>
        <span className="font-label text-[13px]">{formatSigned(a.rewards.xp.total)} XP</span>
      </div>
      {reason && (
        <p className="pl-6 font-body text-[12.5px] leading-snug text-text-2" data-testid="attempt-reason">
          {reason}
        </p>
      )}
    </div>
  );
}

/**
 * Review 3 (answers §3, GDD §13.1a): the rewards as a printed receipt, one line per reward in a fixed
 * order (XP, Party XP, Iron, opinion, an item), its value set large at the right, a note under the
 * label where there is something to say, and a thin bar under XP and Party XP (the HUD's bars in
 * miniature, read from the character view after the gain). A zero line is not printed.
 */
/**
 * Review 3 open point (answers §9.2): the thin bars under XP and Party XP. If they read as clutter in
 * the next play-through, this goes false: the notes stay.
 */
const RECEIPT_BARS = true;

function Receipt({ r, names = {} }: { r: ActionResult; names?: Partial<Record<FactionId, string>> }) {
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
  if (r.rewards.xp.total !== 0)
    rows.push(
      <ReceiptRow
        key="xp"
        label={copy.reward.xp}
        value={formatSigned(r.rewards.xp.total)}
        note={join(partsNote(r.rewards.xp), toLevel)}
        bar={
          RECEIPT_BARS
            ? { label: copy.hud.xp, value: c.xp - floor, max: next - floor, className: 'bg-ink' }
            : undefined
        }
        testId="reward-xp"
      />,
    );
  if (r.rewards.fxp.total !== 0)
    rows.push(
      <ReceiptRow
        key="fxp"
        label={copy.reward.fxp}
        value={formatSigned(r.rewards.fxp.total)}
        valueClassName={factionStyle.text}
        note={join(partsNote(r.rewards.fxp), toRank)}
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
  if (r.rewards.iron.total !== 0)
    rows.push(
      <ReceiptRow
        key="iron"
        label={copy.reward.iron}
        value={formatSigned(r.rewards.iron.total)}
        note={partsNote(r.rewards.iron)}
        testId="reward-iron"
      />,
    );
  const against = e.opinion?.mode === 'against' ? e.opinion : null;
  if (against && against.applied !== 0) {
    // Slice 5 (screens §4.3): *Opinion against the Vanguard in Coalport · −0.20 · Vanguard 9.0 → 8.8 %*.
    const target = against.targetFactionId ?? against.factionId;
    const tname = names[target] ?? c.factionNames?.[target] ?? target;
    rows.push(
      <ReceiptRow
        key="opinion"
        label={copy.risk.opinionAgainst(tname, against.placeName ?? r.place.cityName)}
        // QA fixes n4: points, never a `%` (the share's move carries the %).
        value={formatOpinionDelta(-Math.abs(against.applied))}
        note={copy.reward.opinionMove(tname, formatShare(against.shareBefore), formatShare(against.shareAfter))}
        testId="reward-opinion"
      />,
    );
  } else if (e.opinion && r.rewards.opinion !== 0)
    rows.push(
      <ReceiptRow
        key="opinion"
        // Slice 4: the district whose meter moved ("Opinion in Station & Market").
        label={copy.reward.opinion(e.opinion.placeName ?? r.place.cityName)}
        value={`${formatOpinionDelta(r.rewards.opinion)} %`}
        valueClassName={factionStyle.text}
        // Slice 4 (ADR 0030 §4): the named factors first (*Close race +25 % · Issue: Tram Fare Hike
        // +50 %*), then the meter's move.
        note={join(
          ...(r.rewards.opinionFactors ?? []).map((f) => copy.reward.factor(f.label, f.pct)),
          copy.reward.opinionMove(
            c.factionName,
            formatShare(e.opinion.shareBefore),
            formatShare(e.opinion.shareAfter),
          ),
        )}
        testId="reward-opinion"
      />,
    );
  if (item)
    rows.push(
      <li
        key="item"
        className="flex min-h-[52px] items-center gap-2.5 border-b border-dotted border-faint py-1.5"
        data-testid="reward-item"
      >
        <Picture asset={item.art} sizes="40px" decorative className="size-10 shrink-0 object-cover" />
        <span className="font-body text-[13px]">
          {item.keepsake ? copy.reward.keepsake : copy.reward.item} ·{' '}
          <span className="font-display font-bold">{item.name}</span>
        </span>
      </li>,
    );
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-col border-t border-dotted border-faint" data-testid="receipt">
      {rows}
    </ul>
  );
}

/** "+40 and Rested +5" (the base and its parts), or null when the line is all base. */
/** Slice 5's receipt parts in the screens' words (screens §4.3; QA fixes n4): lower case, joined by *·*. */
const RISK_PARTS: Record<string, (n: number) => string> = {
  rivalGround: (n) => copy.risk.parts.rivalGround(Math.abs(n)),
  fullStrength: (n) => copy.risk.parts.fullStrength(Math.abs(n)),
  paidOff: (n) => copy.risk.parts.paidOff(Math.abs(n)),
  record: (n) => copy.risk.yourRecordPart(Math.abs(n)),
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
      className="flex min-h-8 flex-col justify-center gap-0.5 border-b border-dotted border-faint py-1.5"
      data-testid={testId}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-body text-[13px]" data-testid="reward-label">
          {label}
        </span>
        <span
          className={cx('font-label text-[17px] leading-none font-semibold', valueClassName)}
          data-testid="reward-value"
        >
          {value}
        </span>
      </div>
      {note && (
        <span className="font-mono text-[10.5px] leading-snug text-muted" data-testid="reward-note">
          {note}
        </span>
      )}
      {bar && (
        <div
          role="progressbar"
          aria-label={bar.label}
          aria-valuemin={0}
          aria-valuemax={bar.max}
          aria-valuenow={Math.min(bar.value, bar.max)}
          className="mt-0.5 h-[3px] w-full bg-track"
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
 * on a second line and *Continue* under them; from 640 px one row, the labels on one line. Short of
 * Energy a button is disabled and keeps its label and cost; one hint line says when (the first that
 * is short).
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
      className="min-h-[52px] flex-col gap-0.5 px-2 sm:min-h-11 sm:flex-row sm:gap-1.5"
      data-testid={testId}
    >
      {/* Phone: the label over its cost; from 640 px one line, "Once more · 10 Energy". */}
      <span className="text-[12px] leading-tight sm:text-[13px]">{label}</span>
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
          again.cost3 === null ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-3',
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
          <Button variant="outline" className={cx(again.cost3 !== null && 'col-span-2 sm:col-span-1')}>
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

function Effect({ label, value, testId }: { label: string; value: string; testId?: string }) {
  return (
    <div className="flex justify-between gap-2.5 border-b border-dotted border-faint py-1 text-[12.5px]">
      <dt className="font-body">{label}</dt>
      <dd className="text-right font-label" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

/**
 * Slice 5 (screens §4.3): the street's knock-on lines, in order: Heat (and the first crossing's card),
 * the record (and the first mark's card), *Agility +¼*, *Missions remember*. Also a chapter's Heat.
 */
function StreetLines({
  street,
  heat: chapterHeat,
  stat,
}: {
  street: NonNullable<ActionResult['street']> | null;
  heat: NonNullable<ActionResult['effects']['heat']> | null;
  stat: ActionResult['effects']['stat'];
}) {
  const heat = street?.heat ?? chapterHeat;
  const lines: Array<{ id: string; text: string; card?: boolean; tone?: string }> = [];
  if (heat && heat.after !== heat.before) {
    lines.push({
      id: 'heat',
      text: copy.risk.heatMove(
        formatSigned(heat.after - heat.before),
        heat.after,
        heatWord(heat.state),
        heat.state !== 'cool' && heat.coolsAt !== null ? formatWhen(heat.coolsAt) : null,
      ),
      tone: heat.state === 'hot' || heat.state === 'wanted' ? 'text-failure' : undefined,
    });
    if (heat.first && heat.state !== 'cool')
      lines.push({
        id: 'heat-card',
        // Review 4 (answers §12): the Noticed card says when it cools.
        text:
          heat.state === 'noticed' && heat.coolsAt !== null
            ? `${copy.risk.heatCard.noticed} ${copy.risk.heatCardCool(formatWhen(heat.coolsAt))}`
            : copy.risk.heatCard[heat.state],
        card: true,
      });
  }
  const rec = street?.record ?? null;
  if (rec && rec.added > 0) {
    // Review 4 #20 (answers §20.3): an arrest's marks read *Your record: taken in · 1 mark · On file*.
    lines.push({
      id: 'record',
      text: rec.takenIn
        ? copy.risk.takenInKnock(rec.added, recordWord(rec.after))
        : copy.risk.nameTaken(rec.marks, recordWord(rec.after)),
    });
    if (rec.escalated) lines.push({ id: 'record-escalated', text: copy.risk.secondTime, tone: 'text-failure' });
    // QA m5: the card of the level reached, on its first crossing; the fade clause only when every
    // live mark is minor (a result stored before the fix has no `allMinor`: minor unless escalated).
    if (rec.first && rec.after !== 'clean')
      lines.push({
        id: 'record-card',
        text: copy.risk.recordCard(rec.after, rec.marks, rec.allMinor ?? !rec.escalated),
        card: true,
      });
  }
  // Review 4 #20 (answers §20.3, tech design §11.6): the cells took the day's orders off.
  if (street?.ordersOff) lines.push({ id: 'orders-off', text: copy.risk.ordersOffKnock, tone: 'text-failure' });
  const agi = street?.agility ?? null;
  if (agi && agi.quarters > 0 && !(stat && stat.stat === 'agi'))
    lines.push({ id: 'agility', text: copy.risk.agility(4 - agi.quarters) });
  if (street?.remembered) lines.push({ id: 'remembered', text: copy.risk.remembered });
  if (lines.length === 0) return null;
  return (
    <ul className="mb-1 flex flex-col" data-testid="effect-street">
      {lines.map((l) =>
        l.card ? (
          <li
            key={l.id}
            className="my-1 border-[1.5px] border-ink bg-paper-card px-2.5 py-1.5 font-body text-[12.5px] leading-snug"
            data-testid={`effect-${l.id}`}
          >
            {l.text}
          </li>
        ) : (
          <li
            key={l.id}
            className={cx('border-b border-dotted border-faint py-1 font-body text-[12.5px]', l.tone)}
            data-testid={`effect-${l.id}`}
          >
            {l.text}
          </li>
        ),
      )}
    </ul>
  );
}
