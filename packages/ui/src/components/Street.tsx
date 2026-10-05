import * as Dialog from '@radix-ui/react-dialog';
import { copy } from '@irongate/content/copy';
import { HEALTH, heatState } from '@irongate/rules';
import type { CharacterView, HeatState, RecordLevel, RunInPending, StreetView } from '@irongate/rules';
import { cx, formatClock, formatWeekday } from '../format';
import { statName } from '../odds';
import type { TrainingPlaces } from '../odds';
import { Button } from './Button';
import { HelpButton, helpMark } from './Help';
import { Picture } from './Picture';

/**
 * Slice 5's street (docs/design/slice-5-screens.md §2, §5): the run-in modal and its rows, the run-in
 * block of the mission result, and the Heat, Health and record rows of the HUD, the Me tab and the desk.
 * Every outcome is the server's; these word it.
 */

// ---------------------------------------------------------------------------------------------
// The lazy states between reads (ADR 0033): the client ticks them as it ticks Energy.
// ---------------------------------------------------------------------------------------------

/** Heat now, from the read's value and the time a point takes to cool (the residence city's rate). */
export function heatNow(h: CharacterView['heat'], now: number): number {
  if (!h || h.value <= 0) return 0;
  const steps = h.stepMs > 0 ? Math.floor(Math.max(0, now - h.at) / h.stepMs) : 0;
  return Math.max(0, h.value - steps);
}

/** Health now: ten every ten minutes back to full, counted back from the read's *full at*. */
export function healthNow(h: CharacterView['health'], now: number): number {
  if (!h) return 0;
  if (h.full || h.fullAt === null || now >= h.fullAt) return h.max;
  const ticks = Math.ceil((h.fullAt - now) / HEALTH.tickMs);
  return Math.min(h.max, Math.max(h.value, h.max - ticks * HEALTH.regen));
}

export const heatWord = (s: HeatState): string => copy.risk.heatState[s];
export const recordWord = (l: RecordLevel): string => copy.risk.recordLevel[l];
const hotOrWorse = (s: HeatState) => s === 'hot' || s === 'wanted';

// ---------------------------------------------------------------------------------------------
// The HUD's Heat line and Health bar (screens §2.1, §2.2).
// ---------------------------------------------------------------------------------------------

/**
 * *Heat 32 · Noticed* in Courier 11 px, under Political Capital, only above 0; the state word in the
 * failure colour from *Hot*. A tap on the label opens its note.
 */
export function HeatRow({ value, tone = 'ink' }: { value: number; tone?: 'ink' | 'paper' }) {
  if (value <= 0) return null;
  const s = heatState(value);
  return (
    <HelpButton
      notes={[copy.risk.help.heat()]}
      label={`${copy.risk.heatLine(value, heatWord(s))}: what Heat means`}
      testId="hud-heat"
      className={cx(
        // A 44 px target over a 14 px line (the HUD stays at most two lines taller, screens §10).
        '-my-[15px] inline-flex items-center self-start font-mono text-[11px] leading-none',
        tone === 'ink' ? 'text-paper' : 'text-ink',
      )}
    >
      <span data-testid="hud-heat-line">
        <span className={helpMark}>Heat</span> {value} ·{' '}
        <span className={hotOrWorse(s) ? 'text-failure-fill' : undefined} data-heat-state={s}>
          {heatWord(s)}
        </span>
      </span>
    </HelpButton>
  );
}

/** Screens §2.2: a thin bar under Party XP while Health is below full: *Health* · *96 / 125*. */
export function HealthBar({ value, max }: { value: number; max: number }) {
  if (value >= max) return null;
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <HelpButton
      notes={[copy.risk.help.health()]}
      label={`${copy.risk.health} ${copy.risk.healthValue(value, max)}: what Health means`}
      testId="hud-health"
      className="-my-[15px] grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 leading-none"
    >
      <span className={cx('label-caps text-[9px] text-dim', helpMark)}>{copy.risk.health}</span>
      <span
        role="progressbar"
        aria-label={copy.risk.health}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-1 w-full bg-failure"
      >
        <span className="block h-1 bg-paper" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-label text-[11px] leading-none text-paper" data-testid="hud-health-value">
        {copy.risk.healthValue(value, max)}
      </span>
    </HelpButton>
  );
}

// ---------------------------------------------------------------------------------------------
// The Me tab's rows (screens §2.4).
// ---------------------------------------------------------------------------------------------

/** "One fades on Thursday": the fade day's weekday, in the player's clock. */
const DAY_MS = 86_400_000;
export function fadesOnLine(fadesOn: number | null): string | null {
  if (fadesOn === null) return null;
  return copy.risk.fadesOn(formatWeekday(fadesOn * DAY_MS + DAY_MS / 2));
}

/** *Clean* / *On file · 2 marks · one fades on Thursday* / *Notorious · 7 marks · bail doubled*. */
export function recordText(r: NonNullable<CharacterView['record']>): string {
  if (r.level === 'clean' || r.marks === 0) return copy.risk.recordLevel.clean;
  const parts = [copy.risk.recordLine(recordWord(r.level), r.marks)];
  const fade = r.fading > 0 ? fadesOnLine(r.fadesOn) : null;
  if (fade) parts.push(fade);
  if (r.bailDoubled) parts.push(copy.risk.bailDoubled);
  return parts.join(' · ');
}

export interface RiskRowsProps {
  heat: number;
  heatState: HeatState;
  /** When Heat drops under 25 (shown only while *Noticed* or above). */
  coolsAt: number | null;
  health: { value: number; max: number };
  record: NonNullable<CharacterView['record']>;
  pc: number;
  onStrike: () => void;
  strikePending?: boolean;
  notice?: string | null;
}

/**
 * Screens §2.4: three rows in the stats block's style: Health (always), Heat (*32 · Noticed · cool by
 * 20:40* or *0 · Cool*) and the record, with *Have a mark struck off · 30 Political Capital* at the right
 * when there is a mark (*Needs 30 Political Capital*, disabled, when short).
 */
export function RiskRows({
  heat,
  heatState: s,
  coolsAt,
  health,
  record,
  onStrike,
  strikePending,
  notice,
}: RiskRowsProps) {
  const cost = record.strike?.cost ?? 30;
  return (
    <dl className="flex flex-col" data-testid="me-risk">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-dotted border-faint">
        <dt>
          <HelpButton
            notes={[copy.risk.help.health()]}
            label="What Health means"
            className="min-w-11 font-body text-[14px]"
          >
            <span className={helpMark}>{copy.risk.health}</span>
          </HelpButton>
        </dt>
        <dd className="font-label text-[14px]" data-testid="me-health">
          {copy.risk.healthValue(health.value, health.max)}
        </dd>
      </div>
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-dotted border-faint">
        <dt>
          <HelpButton
            notes={[copy.risk.help.heat()]}
            label="What Heat means"
            // QA m9: "Heat" alone is 31 px wide; the target is at least 44 × 44.
            className="min-w-11 font-body text-[14px]"
          >
            <span className={helpMark}>Heat</span>
          </HelpButton>
        </dt>
        <dd
          className={cx('text-right font-label text-[14px]', hotOrWorse(s) && 'text-failure')}
          data-testid="me-heat"
        >
          {copy.risk.heatMe(
            heat,
            heatWord(s),
            s !== 'cool' && coolsAt !== null ? formatClock(coolsAt) : null,
          )}
        </dd>
      </div>
      <div className="flex flex-col gap-1 border-b border-dotted border-faint py-1">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <dt>
            <HelpButton
              notes={[copy.risk.help.record()]}
              label="What your record means"
              className="min-w-11 font-body text-[14px]"
            >
              <span className={helpMark}>{copy.risk.yourRecord}</span>
            </HelpButton>
          </dt>
          <dd
            className={cx(
              'text-right font-label text-[14px]',
              record.level === 'notorious' && 'text-failure',
            )}
            data-testid="me-record"
          >
            {recordText(record)}
          </dd>
        </div>
        {record.marks > 0 && (
          <Button
            variant="outline"
            className="self-end text-[11px]"
            onClick={onStrike}
            pending={strikePending}
            disabled={!record.strike?.affordable}
            data-testid="me-strike"
          >
            {record.strike?.affordable ? copy.risk.strikeOff(cost) : copy.risk.needsPc(cost)}
          </Button>
        )}
        {notice && (
          <p role="status" className="font-body text-[13px] text-collective">
            {notice}
          </p>
        )}
      </div>
    </dl>
  );
}

// ---------------------------------------------------------------------------------------------
// The run-in modal (screens §5).
// ---------------------------------------------------------------------------------------------

export type RunInChoice = 'fight' | 'run' | 'talk' | 'pay' | 'luck';

export interface EncounterRowProps {
  title: string;
  line: string;
  best?: boolean;
  disabled?: boolean;
  pending?: boolean;
  onChoose: () => void;
  testId: string;
}

/** A run-in row (the `StoryScreen` row, 56 px): one tap, final; *best free odds* at the right. */
export function EncounterRow({ title, line, best, disabled, pending, onChoose, testId }: EncounterRowProps) {
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={disabled}
      aria-busy={pending || undefined}
      className={cx(
        'flex min-h-14 w-full flex-col items-start justify-center gap-0.5 border-[1.5px] border-ink px-3.5 py-1.5 text-left',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol',
        pending
          ? 'bg-ink text-paper'
          : 'cursor-pointer bg-paper-card hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-paper-card disabled:hover:text-ink',
      )}
      data-testid={testId}
    >
      <span className="flex w-full items-baseline justify-between gap-3">
        <span className="font-body text-[15px] leading-snug font-semibold">{title}</span>
        {best && (
          <span className="shrink-0 font-mono text-[10.5px] opacity-80" data-testid="run-in-best">
            {copy.risk.bestFreeOdds}
          </span>
        )}
      </span>
      <span className="font-mono text-[11px] opacity-85" data-testid="run-in-line">
        {line}
      </span>
    </button>
  );
}

export interface EncounterModalProps {
  pending: RunInPending | null;
  open: boolean;
  onChoose: (choice: RunInChoice) => void;
  /** The choice waiting for the server (every row is disabled from the tap). */
  choosing: RunInChoice | null;
  notice?: string | null;
}

/**
 * Screens §5: the run-in, over the map; it cannot be dismissed (closing the tab leaves it to luck). The
 * opponent's portrait on an ink band with the kicker, their label and their *appears* line; your line;
 * four rows with odds words (Pay with its price, *nearly always works*); *Leave it to luck* and its line.
 */
export function EncounterModal({ pending: p, open, onChoose, choosing, notice }: EncounterModalProps) {
  if (!p) return null;
  const odds = (chance: number, stat: 'str' | 'agi' | 'cha') =>
    copy.odds.ticket(copy.odds.band(chance), statName(stat));
  const busy = choosing !== null;
  const pay = p.rows.pay;
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="ease-dim fixed inset-0 z-[60] bg-ink/75" />
        <Dialog.Content
          aria-describedby="run-in-appears"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={cx(
            // A card, never a half-empty screen: at the bottom of a phone over the dimmed map, in the
            // middle from 640 px.
            'ease-sheet fixed inset-x-0 bottom-0 z-[70] flex max-h-[100dvh] flex-col overflow-y-auto bg-paper text-ink shadow-[0_-10px_30px_rgb(0_0_0/0.45)]',
            'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[92dvh] sm:w-[520px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:shadow-[0_0_0_1px_var(--color-ink),0_24px_60px_rgb(0_0_0/0.5)]',
          )}
          data-testid="run-in"
        >
          <div className="flex shrink-0 items-stretch gap-3 bg-ink p-3 text-paper">
            <div className="aspect-[4/5] w-24 shrink-0 overflow-hidden border border-paper/60 sm:w-32">
              <Picture
                asset={p.opponent.portrait}
                sizes="(min-width: 640px) 128px, 96px"
                className="size-full object-cover object-top"
                loading="eager"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <span className="label-caps text-[10px] text-dim" data-testid="run-in-kicker">
                {copy.risk.runInKicker(p.place.locationName)}
              </span>
              <Dialog.Title
                className="font-display text-[20px] leading-tight font-black"
                data-testid="run-in-label"
              >
                {p.opponent.label}
              </Dialog.Title>
              <p id="run-in-appears" className="font-body text-[14px] leading-snug text-paper/90 italic">
                {p.opponent.appears}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 px-4 pt-2.5 pb-1">
            <p className="font-mono text-[11px] text-text-2" data-testid="run-in-you">
              {copy.risk.you(p.you.health, p.you.healthMax, p.you.heat, heatWord(p.you.heatState))}
            </p>
            <div className="flex flex-col gap-2" role="group" aria-label={p.opponent.label}>
              <EncounterRow
                title={copy.risk.rows.fight}
                line={odds(p.rows.fight.chance, 'str')}
                best={p.luck === 'fight'}
                disabled={busy}
                pending={choosing === 'fight'}
                onChoose={() => onChoose('fight')}
                testId="run-in-fight"
              />
              <EncounterRow
                title={copy.risk.rows.run}
                line={odds(p.rows.run.chance, 'agi')}
                best={p.luck === 'run'}
                disabled={busy}
                pending={choosing === 'run'}
                onChoose={() => onChoose('run')}
                testId="run-in-run"
              />
              <EncounterRow
                title={copy.risk.rows.talk}
                line={odds(p.rows.talk.chance, 'cha')}
                best={p.luck === 'talk'}
                disabled={busy}
                pending={choosing === 'talk'}
                onChoose={() => onChoose('talk')}
                testId="run-in-talk"
              />
              <EncounterRow
                title={pay ? copy.risk.rows.pay(pay.price) : copy.risk.payNone}
                line={
                  !pay
                    ? copy.risk.wontBeBought
                    : pay.affordable
                      ? copy.risk.nearlyAlways
                      : copy.risk.needsIron(pay.price)
                }
                disabled={busy || !pay || !pay.affordable}
                pending={choosing === 'pay'}
                onChoose={() => onChoose('pay')}
                testId="run-in-pay"
              />
            </div>
            {notice && (
              <p role="status" className="font-body text-[13px] text-collective">
                {notice}
              </p>
            )}
          </div>
          <div className="flex flex-col items-center gap-0.5 px-4 pt-0.5 pb-[max(10px,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => onChoose('luck')}
              disabled={busy}
              aria-busy={choosing === 'luck' || undefined}
              className="label-caps min-h-11 cursor-pointer px-3 text-[12px] font-semibold text-petrol underline decoration-dotted underline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="run-in-luck"
            >
              {choosing === 'luck' ? '…' : copy.risk.leaveItToLuck}
            </button>
            <p className="text-center font-mono text-[11px] text-muted">{copy.risk.oneChoice}</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------------------------
// The run-in block of the mission result (screens §4.3), above the headline.
// ---------------------------------------------------------------------------------------------

/**
 * The reason line when the choice did not come off (screens §4.3). QA fixes n12: by the band of the
 * row that didn't come off: *Good odds* is bad luck, *Fair odds* only fair, a *Long shot* names the
 * stat (and where it trains, m4). Never *Try again*.
 */
export function runInReason(r: NonNullable<StreetView['runIn']>, places: TrainingPlaces = {}): string | null {
  const failed = r.steps.some((s) => !s.ok) || r.outcome === 'lost';
  if (!failed) return null;
  const band = r.steps.find((s) => !s.ok)?.band;
  if (band === 'good') return copy.reason.runIn.luckGood;
  if (band === 'fair') return copy.reason.runIn.luckFair;
  switch (r.cause) {
    case 'power':
      return copy.risk.outmatched;
    case 'agi':
      return copy.reason.statLow(statName('agi'), places.agi ?? null);
    case 'cha':
      return copy.reason.statLowCha;
    case 'luck':
      return copy.reason.runIn.luckGood;
    default:
      return null;
  }
}

export function RunInBlock({
  runIn: r,
  places,
}: {
  runIn: NonNullable<StreetView['runIn']>;
  places?: TrainingPlaces;
}) {
  const reason = runInReason(r, places);
  const hp = r.health && r.health.after !== r.health.before ? r.health : null;
  return (
    <section
      className="flex gap-3 border-[1.5px] border-ink bg-paper-card p-2.5"
      aria-label={r.opponent.label}
      data-testid="result-run-in"
      data-outcome={r.outcome}
    >
      <div className="aspect-[4/5] w-10 shrink-0 overflow-hidden border border-ink">
        <Picture
          asset={r.opponent.portrait}
          sizes="40px"
          decorative
          className="size-full object-cover object-top"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="label-caps text-[10px] font-semibold">{r.opponent.label}</span>
        <p className="font-body text-[13.5px] leading-snug" data-testid="run-in-did">
          {copy.risk.didLine(r.by, r.steps, r.opponent.pronoun)} <span className="text-text-2">{r.line}</span>
        </p>
        {hp && (
          <p className="font-mono text-[11.5px]" data-testid="run-in-health">
            {copy.risk.healthLine(hp.before, hp.after)}
          </p>
        )}
        {reason && (
          <p className="font-body text-[12.5px] leading-snug text-text-2" data-testid="run-in-reason">
            {reason}
          </p>
        )}
      </div>
    </section>
  );
}
