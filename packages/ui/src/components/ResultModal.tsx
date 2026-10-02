import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import { energyReadyAt, xpForLevel } from '@irongate/rules';
import type {
  ActionResult,
  CharacterView,
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
  renderTimeTokens,
} from '../format';
import { batchReasons, statName } from '../odds';
import type { TrainingPlaces } from '../odds';
import { Button } from './Button';
import { FACTION_STYLE } from './FactionCrest';
import { MapCrop } from './HallHeader';
import { Picture } from './Picture';
import { StatPointsPanel } from './Shell';
import { Stamp } from './Stamp';
import type { StampTone } from './Stamp';

export interface ResultModalProps {
  /** An action's result, or (slice 3) a political act's: `kind: 'political'`, screens §9. */
  result: ActionResult | PoliticalResult | null;
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
  }
}

/**
 * The result modal (GDD §13.1a, tech design §9): art and stamp, what happened, how it went (one
 * row per attempt: Success or Partial and its XP, and one plain reason under a row that isn't a
 * Success; review 2, never the roll or the odds), the rewards as a receipt (review 3), knock-on
 * effects, and *Once more · 10 Energy* · *Three more · 30 Energy* · *Continue*. The server sends the full breakdown; this renders the outcome and
 * words the reason from it, and computes nothing else. Full-screen on phones.
 */
export function ResultModal(props: ResultModalProps) {
  const { result, open, onOpenChange } = props;
  return (
    <Dialog.Root open={open && result !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/75" />
        <Dialog.Content
          className={cx(
            'fixed inset-0 z-50 flex flex-col overflow-y-auto bg-paper text-ink',
            'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[92dvh] sm:w-[min(600px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:shadow-[0_0_0_1px_var(--color-ink),0_24px_60px_rgb(0_0_0/0.5)]',
          )}
        >
          {result && result.kind === 'political' ? (
            <PoliticalBody result={result} />
          ) : (
            result && <ResultBody {...props} result={result} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ArtHeader({ r }: { r: ActionResult }) {
  const stamp = stampFor(r);
  const art = r.art;
  return (
    <div className="relative h-[150px] shrink-0 overflow-hidden bg-ink" data-art={art.rung}>
      {art.rung === 'scene' ? (
        <Picture
          asset={art.asset}
          sizes="600px"
          decorative
          className="absolute inset-0 size-full object-cover opacity-85"
        />
      ) : (
        // §13.5 rung 3: the map centred on the location (review 3: the crop shared with the hall header).
        <MapCrop asset={art.asset} x={art.x} y={art.y} className="opacity-80" />
      )}
      <div
        className="absolute inset-0 bg-[linear-gradient(0deg,rgb(21_24_26/0.9)_0%,rgb(21_24_26/0)_55%)]"
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Stamp tone={stamp.tone} label={stamp.label} />
      </div>
      <span className="label-caps absolute bottom-2 left-3 text-[10px] text-dim">
        {r.place.cityName} · {r.place.locationName} · {formatClock(Date.parse(r.performedAt))}
      </span>
    </div>
  );
}

/**
 * Slice 3 (screens §9): the political modal. The paper's masthead strip in place of the art, the
 * stamp over its right end; the headline and text; the knock-on lines; Continue only.
 */
function PoliticalBody({ result: r }: { result: PoliticalResult }) {
  const k = r.knockOns;
  const lines: Array<{ id: string; text: string }> = [];
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
        <Dialog.Close asChild>
          <Button variant="outline" className="w-full">
            Continue
          </Button>
        </Dialog.Close>
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
}: ResultModalProps & { result: ActionResult }) {
  const [later, setLater] = useState(false);
  const stamp = stampFor(r);
  const toneText =
    stamp.tone === 'success' ? 'text-success' : stamp.tone === 'failure' ? 'text-failure' : 'text-partial';
  const e = r.effects;
  const kicker = r.story
    ? copy.chapterKicker(r.story.ambitionTitle, r.story.chapter, r.story.of)
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

  return (
    <>
      <ArtHeader r={r} />
      <div className="flex flex-1 flex-col gap-4 px-4 pt-3.5 pb-4">
        {/* 2. What happened */}
        <section className="flex flex-col gap-1">
          <span className={cx('label-caps text-[10px]', toneText)}>{kicker}</span>
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
            <AttemptRow key={a.index} attempt={a} reason={reasons.byRow.get(a.index) ?? null} />
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
          <Receipt r={r} />
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
                {copy.levelUpLine(e.levelUp.from, e.levelUp.to, e.levelUp.statPoints)}
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
          {(item ||
            hooks.length > 0 ||
            e.ordersAllDone ||
            e.morale ||
            e.branchEndorsement ||
            signed.length > 0) && (
            <ul className="flex flex-col">
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
        {r.again && onAgain ? (
          <AgainButtons
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
function AttemptRow({ attempt: a, reason }: { attempt: ResultAttempt; reason: string | null }) {
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

function Receipt({ r }: { r: ActionResult }) {
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
  if (e.opinion && r.rewards.opinion !== 0)
    rows.push(
      <ReceiptRow
        key="opinion"
        label={copy.reward.opinion(r.place.cityName)}
        value={`${formatOpinionDelta(r.rewards.opinion)} %`}
        valueClassName={factionStyle.text}
        note={copy.reward.opinionMove(
          c.factionName,
          formatShare(e.opinion.shareBefore),
          formatShare(e.opinion.shareAfter),
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
function partsNote(line: RewardLine): string | null {
  if (line.parts && line.parts.length > 0)
    return copy.reward.parts(
      formatSigned(line.base),
      line.parts.map((p) => `${p.label} ${formatSigned(p.amount)}`).join(' and '),
    );
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
  again,
  onAgain,
  againPending,
  short1,
  short3,
  ready1,
  ready3,
}: {
  again: NonNullable<ActionResult['again']>;
  onAgain: (times: 1 | 3) => void;
  againPending: 1 | 3 | null;
  short1: boolean;
  short3: boolean;
  ready1: number | null;
  ready3: number | null;
}) {
  const at = (t: number | null) => (t === null ? '—' : formatClock(t));
  // A *Trained* result: the action's verb (stored results from before review 3 have none).
  const verb = again.cost3 === null && again.verb ? again.verb : null;
  const once = verb
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
