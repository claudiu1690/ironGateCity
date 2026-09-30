import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import { energyReadyAt } from '@irongate/rules';
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
import { Picture } from './Picture';
import { StatPointsPanel } from './Shell';
import { Stamp } from './Stamp';
import type { StampTone } from './Stamp';

export interface ResultModalProps {
  /** An action's result, or (slice 3) a political act's: `kind: 'political'`, screens §9. */
  result: ActionResult | PoliticalResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Again ×1 / ×3: the caller re-runs the action with a new idempotency key. */
  onAgain?: (times: 1 | 3) => void;
  againPending?: 1 | 3 | null;
  /** Live Energy (projected now), for the Again buttons. */
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
 * Success; review 2, never the roll or the odds), four reward tiles, knock-on effects, and
 * Again ×1 · Again ×3 · Continue. The server sends the full breakdown; this renders the outcome and
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
  const CROP_W = 1400; // the map is shown at this width, centred on the location (§13.5 rung 3)
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
        <Picture
          asset={art.asset}
          sizes={`${CROP_W}px`}
          decorative
          className="absolute max-w-none opacity-80"
          style={{
            width: CROP_W,
            height: (CROP_W * art.asset.height) / art.asset.width,
            left: `calc(50% - ${art.x * CROP_W}px)`,
            top: `calc(75px - ${(art.y * CROP_W * art.asset.height) / art.asset.width}px)`,
          }}
        />
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
  const factionText = FACTION_STYLE[r.character.factionId].text;
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <RewardTile label="Experience" line={r.rewards.xp} />
            <RewardTile
              label="Party XP"
              line={r.rewards.fxp}
              className={factionText}
              testId="tile-faction-xp"
            />
            <RewardTile label="Iron" line={r.rewards.iron} />
            {item ? (
              <div
                className="flex items-center gap-2 border-[1.5px] border-ink bg-paper-card px-2.5 py-2"
                data-testid="tile-keepsake"
              >
                <Picture asset={item.art} sizes="40px" decorative className="size-10 shrink-0 object-cover" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="label-caps text-[9px] text-muted">
                    {item.keepsake ? 'Keepsake' : 'Item'}
                  </span>
                  <span className="font-display text-[14px] leading-tight font-bold">{item.name}</span>
                </span>
              </div>
            ) : (
              <Tile
                label={r.place.cityName}
                value={e.opinion ? `${formatOpinionDelta(r.rewards.opinion)} %` : '—'}
                className={factionText}
                note={e.opinion ? `${r.character.factionName} opinion` : 'no opinion'}
                testId="tile-opinion"
              />
            )}
          </div>
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
            {e.opinion && (
              <Effect
                label={`${r.character.factionName} in ${r.place.cityName}`}
                value={`${formatShare(e.opinion.shareBefore)} → ${formatShare(e.opinion.shareAfter)} %`}
                testId="effect-opinion"
              />
            )}
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
            {e.xp.after !== e.xp.before && (
              <Effect
                label="Experience"
                value={`${formatNumber(e.xp.before)} → ${formatNumber(e.xp.after)}`}
              />
            )}
            {e.fxp.after !== e.fxp.before && (
              <Effect
                label="Party XP"
                value={`${formatNumber(e.fxp.before)} → ${formatNumber(e.fxp.after)}`}
              />
            )}
            {e.iron.after !== e.iron.before && (
              <Effect label="Iron" value={`${formatNumber(e.iron.before)} → ${formatNumber(e.iron.after)}`} />
            )}
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
          <>
            <div className={cx('grid gap-2', r.again.cost3 === null ? 'grid-cols-2' : 'grid-cols-3')}>
              <Button
                onClick={() => onAgain(1)}
                pending={againPending === 1}
                disabled={short1 || !!againPending}
              >
                Again ×1
                <span aria-hidden="true" className="text-energy normal-case">
                  {' '}
                  {r.again.cost1}
                </span>
              </Button>
              {r.again.cost3 !== null && (
                <Button
                  variant="secondary"
                  onClick={() => onAgain(3)}
                  pending={againPending === 3}
                  disabled={short3 || !!againPending}
                  title={short3 ? copy.x3Needs(r.again.cost3) : undefined}
                >
                  Again ×3
                  <span aria-hidden="true" className="text-energy-light normal-case">
                    {' '}
                    {r.again.cost3}
                  </span>
                </Button>
              )}
              <Dialog.Close asChild>
                <Button variant="outline">Continue</Button>
              </Dialog.Close>
            </div>
            {(short1 || short3) && (
              <p className="font-mono text-[11px] text-muted" data-testid="again-hint">
                {short1
                  ? copy.needsEnergy(r.again.cost1, ready1 === null ? '—' : formatClock(ready1))
                  : r.again.cost3 !== null
                    ? copy.x3Needs(r.again.cost3)
                    : null}
              </p>
            )}
          </>
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

function RewardTile({
  label,
  line,
  className,
  note,
  testId,
}: {
  label: string;
  line: RewardLine;
  className?: string;
  note?: string;
  testId?: string;
}) {
  return (
    <Tile
      label={label}
      value={formatSigned(line.total)}
      className={className}
      note={
        note ??
        (line.parts && line.parts.length > 0
          ? `${formatSigned(line.base)} · ${line.parts.map((p) => `${p.label} ${formatSigned(p.amount)}`).join(' · ')}`
          : line.bonus > 0
            ? `${formatSigned(line.base)} and ${formatSigned(line.bonus)} bonus`
            : undefined)
      }
      testId={testId ?? `tile-${label.toLowerCase().replace(/\s+/g, '-')}`}
    />
  );
}

function Tile({
  label,
  value,
  note,
  className,
  testId,
}: {
  label: string;
  value: string;
  note?: string;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className="flex flex-col gap-0.5 border-[1.5px] border-ink bg-paper-card px-2.5 py-2"
      data-testid={testId}
    >
      <span className="label-caps text-[9px] text-muted">{label}</span>
      <span className={cx('font-label text-[22px] leading-none font-semibold', className)}>{value}</span>
      {note && <span className="font-mono text-[10px] text-muted">{note}</span>}
    </div>
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
