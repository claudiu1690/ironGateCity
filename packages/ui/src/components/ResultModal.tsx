import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import { energyReadyAt } from '@irongate/rules';
import type {
  ActionResult,
  NamedStandingView,
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
  plural,
  statLabel,
} from '../format';
import { Button } from './Button';
import { CheckBreakdownList } from './CheckBreakdownList';
import { FACTION_STYLE } from './FactionCrest';
import { Picture } from './Picture';
import { StatPointsPanel } from './Shell';
import { Stamp } from './Stamp';
import type { StampTone } from './Stamp';

export interface ResultModalProps {
  result: ActionResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Again ×1 / ×3: the caller re-runs the action with a new idempotency key. */
  onAgain?: (times: 1 | 3) => void;
  againPending?: 1 | 3 | null;
  /** Live Energy (projected now), for the Again buttons. */
  energy?: { value: number; nextTickAt: number | null };
  /** Live stat points (the stored result stays immutable). */
  statPoints?: { pending: number; level: number; stats: { str: number; int: number } };
  onPlaceStat?: (stat: StatPointTarget) => void;
  placing?: StatPointTarget | null;
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
    case 'worked':
      return { label: 'Shift worked', tone: 'success' };
    case 'trained':
      return { label: 'Trained', tone: 'success' };
  }
}

/**
 * The result modal (GDD §13.1a, tech design §9): art and stamp, what happened, how it went (one
 * row per attempt), four reward tiles, knock-on effects, and Again ×1 · Again ×3 · Continue. It
 * renders the server's breakdown and computes nothing. Full-screen on phones.
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
          {result && <ResultBody {...props} result={result} />}
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

function standingLine(s: NonNullable<ActionResult['effects']['standing']>): string {
  const a: NamedStandingView = s.after;
  if (a.level > s.before.level) return copy.standingUp(a.cityName, a.name, a.bonus);
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
            <AttemptRow key={a.index} attempt={a} />
          ))}
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
                  {tag.label}: {tag.note}
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <RewardTile label="Experience" line={r.rewards.xp} />
            <RewardTile label="Faction XP" line={r.rewards.fxp} className={factionText} />
            <RewardTile
              label="Iron"
              line={r.rewards.iron}
              note={
                e.shift
                  ? `${formatSigned(e.shift.half)} half pay, ${formatSigned(e.shift.streakBonus)} streak`
                  : undefined
              }
            />
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
                  onPlace={onPlaceStat}
                  placing={placing}
                  onLater={() => setLater(true)}
                  title={statPoints.pending > 0 ? copy.pointsToPlace(statPoints.pending) : undefined}
                />
              )}
            </div>
          )}
          {(item || hooks.length > 0 || e.ordersAllDone) && (
            <ul className="flex flex-col">
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
              <Effect label="Local Standing" value={standingLine(e.standing)} testId="effect-standing" />
            )}
            {e.orders.map((o) => (
              <Effect
                key={o.id}
                label={o.title}
                value={`${o.before} → ${o.after} / ${o.target}${o.done ? ' ✓' : ''}${o.fxp > 0 ? ` · ${copy.orderComplete(o.fxp)}` : ''}`}
                testId="effect-order"
              />
            ))}
            {e.rankUp && <Effect label={`Rank ${e.rankUp.to}`} value={e.rankUp.title} />}
            {e.stat && (
              <Effect
                label="Trained"
                value={`${e.stat.stat.toUpperCase()} ${e.stat.before} → ${e.stat.after}`}
                testId="effect-stat"
              />
            )}
            {e.shift && (
              <Effect
                label="Work streak"
                value={`${plural(e.shift.streak.after, 'day')} · ${e.shift.sickDaysLeft} sick days left · next shift at ${formatClock(e.shift.nextShiftAt)}`}
                testId="effect-shift"
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
                label="Faction XP"
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

function AttemptRow({ attempt: a }: { attempt: ResultAttempt }) {
  const [open, setOpen] = useState(false);
  const success = a.outcome === 'success';
  const failure = a.outcome === 'failure';
  const label = success ? 'Success' : a.outcome === 'partial' ? 'Partial' : 'Failure';
  return (
    <div className="flex flex-col gap-1" data-testid="attempt-row">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="grid min-h-11 cursor-pointer grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2 text-left"
      >
        <span className="font-label text-[12px] text-muted">{a.index}</span>
        <span
          className="relative h-2.5 bg-track"
          role="img"
          aria-label={`Chance ${a.check.chance} %, rolled ${a.roll}`}
        >
          <span
            className={cx(
              'absolute inset-y-0 left-0',
              success ? 'bg-success-fill' : failure ? 'bg-failure-fill' : 'bg-partial-fill',
            )}
            style={{ width: `${a.check.chance}%` }}
          />
          <span
            className="absolute -top-[3px] h-4 w-[3px] -translate-x-1/2 bg-ink"
            style={{ left: `${a.roll}%` }}
            aria-hidden="true"
          />
        </span>
        <span
          className={cx(
            'label-caps text-[11px] tracking-[0.06em]',
            success ? 'text-success' : failure ? 'text-failure' : 'text-partial',
          )}
        >
          {label} · {formatSigned(a.rewards.xp.total)} XP
        </span>
      </button>
      <span className="pl-6 font-mono text-[11px] text-muted">
        Rolled {a.roll} against {a.check.chance} % · {statLabel(a.check.stats)} {a.check.statValue} vs{' '}
        {a.check.difficulty}
        {a.check.bonusTotal !== 0 ? ` · bonuses ${formatSigned(a.check.bonusTotal)} %` : ''}
      </span>
      {open && (
        <div className="ml-6 border border-faint bg-paper-card px-2 py-1.5">
          <CheckBreakdownList check={a.check} />
        </div>
      )}
    </div>
  );
}

function RewardTile({
  label,
  line,
  className,
  note,
}: {
  label: string;
  line: RewardLine;
  className?: string;
  note?: string;
}) {
  return (
    <Tile
      label={label}
      value={formatSigned(line.total)}
      className={className}
      note={
        note ??
        (line.bonus > 0 ? `${formatSigned(line.base)} and ${formatSigned(line.bonus)} bonus` : undefined)
      }
      testId={`tile-${label.toLowerCase().replace(/\s+/g, '-')}`}
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
