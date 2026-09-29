import * as Dialog from '@radix-ui/react-dialog';
import type { ActionAttempt, ActionResult, RewardLine } from '@irongate/rules';
import { cx, formatGameTime, formatNumber, formatOpinionDelta, formatSigned } from '../format';
import { Button } from './Button';
import { FACTION_STYLE } from './FactionCrest';
import { Stamp } from './Stamp';

export interface ResultModalProps {
  result: ActionResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Again ×1: the caller re-runs the action with a new idempotency key. */
  onAgain?: () => void;
  againPending?: boolean;
  againDisabled?: boolean;
}

/**
 * The result modal (GDD §13.1a): art and stamp, what happened, how it went (one row per attempt),
 * four reward tiles, knock-on effects, and the buttons. It renders the server's breakdown and
 * computes nothing. Full-screen on phones.
 */
export function ResultModal({
  result,
  open,
  onOpenChange,
  onAgain,
  againPending,
  againDisabled,
}: ResultModalProps) {
  return (
    <Dialog.Root open={open && result !== null} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/70" />
        <Dialog.Content
          className={cx(
            'fixed inset-0 z-50 flex flex-col overflow-y-auto bg-paper text-ink',
            'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[92vh] sm:w-[min(560px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:shadow-[0_0_0_1px_var(--color-ink),0_24px_60px_rgb(0_0_0/0.5)]',
          )}
        >
          {result && (
            <ResultBody
              result={result}
              onAgain={onAgain}
              againPending={againPending}
              againDisabled={againDisabled}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ResultBody({
  result: r,
  onAgain,
  againPending,
  againDisabled,
}: Pick<ResultModalProps, 'onAgain' | 'againPending' | 'againDisabled'> & { result: ActionResult }) {
  const stampColor = r.stamp === 'success' ? 'text-success' : 'text-partial';
  const factionText = FACTION_STYLE[r.effects.opinion.factionId].text;
  const factionName = r.character.factionName;
  return (
    <>
      {/* 1. Art and a stamp (slice 0 has no art: a halftone plate keyed by place kind). */}
      <div
        className="relative flex h-[150px] shrink-0 items-center justify-center overflow-hidden bg-ink text-ink-2"
        data-art-kind={r.place.kind}
      >
        <div className="halftone absolute inset-0" aria-hidden="true" />
        <Stamp outcome={r.stamp} className="relative" />
        <span className="label-caps absolute bottom-2 left-3 text-[10px] text-dim">
          {r.place.cityName} · {r.place.locationName} · {formatGameTime(r.performedAt)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 pt-3.5 pb-4">
        {/* 2. What happened */}
        <section className="flex flex-col gap-1">
          <span className={cx('label-caps text-[10px]', stampColor)}>{r.action.name}</span>
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
            <RewardTile label="Iron" line={r.rewards.iron} />
            <Tile
              label={r.place.cityName}
              value={`${formatOpinionDelta(r.rewards.opinion)} %`}
              className={factionText}
              note={`${factionName} opinion`}
              testId="tile-opinion"
            />
          </div>
        </section>

        {/* 5. Knock-on effects */}
        <section aria-labelledby="effects">
          <h3 id="effects" className="label-caps mb-1 text-[10px] text-muted">
            Knock-on effects
          </h3>
          <dl className="flex flex-col">
            <Effect
              label="Energy"
              value={`${r.effects.energy.before} → ${r.effects.energy.after}`}
              testId="effect-energy"
            />
            {(r.effects.rested.before > 0 || r.effects.rested.after > 0) && (
              <Effect label="Rested" value={`${r.effects.rested.before} → ${r.effects.rested.after}`} />
            )}
            <Effect
              label="Experience"
              value={`${formatNumber(r.effects.xp.before)} → ${formatNumber(r.effects.xp.after)}`}
            />
            <Effect
              label="Iron"
              value={`${formatNumber(r.effects.iron.before)} → ${formatNumber(r.effects.iron.after)}`}
            />
            <Effect
              label={`${factionName} in ${r.place.cityName}`}
              value={`${formatOpinionDelta(r.effects.opinion.delta)} %${r.effects.opinion.applied ? '' : ' · counted from slice 1'}`}
            />
          </dl>
        </section>

        {/* 6. Buttons */}
        <div className="mt-auto grid grid-cols-3 gap-2 pt-1">
          <Button onClick={onAgain} pending={againPending} disabled={againDisabled || !onAgain}>
            Again ×1
          </Button>
          <Button variant="secondary" disabled title="Coming in slice 1" aria-describedby="again3-note">
            Again ×3
          </Button>
          <Dialog.Close asChild>
            <Button variant="outline">Continue</Button>
          </Dialog.Close>
        </div>
        <p id="again3-note" className="sr-only">
          Repeating three times arrives in a later update.
        </p>
      </div>
    </>
  );
}

function AttemptRow({ attempt: a }: { attempt: ActionAttempt }) {
  const success = a.outcome === 'success';
  const label = a.outcome === 'success' ? 'Success' : a.outcome === 'partial' ? 'Partial' : 'Failure';
  return (
    <div className="flex flex-col gap-1" data-testid="attempt-row">
      <div className="grid grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-2">
        <span className="font-label text-[12px] text-muted">{a.index}</span>
        <div
          className="relative h-2.5 bg-track"
          role="img"
          aria-label={`Chance ${a.check.chance} %, rolled ${a.roll}`}
        >
          <div
            className={cx('absolute inset-y-0 left-0', success ? 'bg-success-fill' : 'bg-partial-fill')}
            style={{ width: `${a.check.chance}%` }}
          />
          <span
            className="absolute -top-[3px] h-4 w-[3px] -translate-x-1/2 bg-ink"
            style={{ left: `${a.roll}%` }}
            aria-hidden="true"
          />
        </div>
        <span
          className={cx(
            'label-caps text-[11px] tracking-[0.06em]',
            success ? 'text-success' : 'text-partial',
          )}
        >
          {label}
        </span>
      </div>
      <span className="pl-6 font-mono text-[11px] text-muted">
        Rolled {a.roll} against {a.check.chance} % · {a.check.stat.toUpperCase()} {a.check.statValue} vs{' '}
        {a.check.difficulty}
        {a.check.bonusTotal !== 0 ? ` · bonuses ${formatSigned(a.check.bonusTotal)} %` : ''}
      </span>
    </div>
  );
}

function RewardTile({ label, line, className }: { label: string; line: RewardLine; className?: string }) {
  return (
    <Tile
      label={label}
      value={formatSigned(line.total)}
      className={className}
      note={line.bonus > 0 ? `${formatSigned(line.base)} and ${formatSigned(line.bonus)} bonus` : undefined}
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
