import { copy } from '@irongate/content/copy';
import type { AssetView, HireCardView, HireRowView, MinderView } from '@irongate/rules';
import { cx } from '../format';
import { Button } from './Button';
import { weekdayOf } from './Capital';
import { HelpButton, helpMark } from './Help';
import { Picture } from './Picture';
import { BottomSheet } from './Sheets';

/**
 * Slice 8 (screens §18.1–§18.3; design §24; tech design §24.6): someone to walk with you. The party
 * store's hire card, the Me tab's *Walking with you* row and his row at a run-in. Plain props. The
 * player reads *a doorman*, *a steward*, *a minder* (design §24: no other word for him on a label).
 */

const m = copy.life.minder;

/** An odds word for a band (the card's word against a street enforcer on a mission at home). */
const BAND_AT: Record<'good' | 'fair' | 'long', number> = { good: 70, fair: 50, long: 0 };
export const oddsWordOf = (band: 'good' | 'fair' | 'long'): string => copy.odds.band(BAND_AT[band]);

export interface HireCardProps {
  card: HireCardView;
  /** A tap on *Hire*: the caller asks first when `row.confirm` (over 1,000 Iron). */
  onHire: (row: HireRowView) => void;
  onRenew: (weeks: 1 | 4) => void;
  /** `hire-{tier}`, `renew-1` or `renew-4` while the server answers. */
  pending: string | null;
  notice?: string | null;
}

/** Screens §18.1: kicker, then a row per tier (portrait, price, his strength, the one button or state). */
export function HireCard({ card, onHire, onRenew, pending, notice }: HireCardProps) {
  const busy = pending !== null;
  return (
    <section
      aria-label={m.kicker}
      className="mt-1 flex flex-col border-[1.5px] border-ink bg-paper-card"
      data-testid="hire-card"
    >
      <div className="border-b border-ink px-3 py-1.5">
        <HelpButton notes={[copy.life.help.bodyguard()]} label={`${m.kicker}: what it is`}>
          <h3 className={cx('label-caps text-[11px] font-semibold', helpMark)}>{m.kicker}</h3>
        </HelpButton>
      </div>
      {card.rows.map((r) => {
        const dimmed = r.state === 'level' || r.state === 'rank' || r.state === 'withYou' || r.state === 'needsIron';
        const until = r.until !== undefined ? weekdayOf(r.until) : '';
        return (
          <div
            key={r.tier}
            className={cx(
              'flex min-h-[88px] gap-3 border-b border-dotted border-faint px-3 py-2 last:border-b-0',
              dimmed && 'opacity-70',
            )}
            data-testid={`hire-row-${r.tier}`}
            data-state={r.state}
          >
            <div className="aspect-[4/5] w-16 shrink-0 self-start overflow-hidden border border-ink">
              <Picture asset={r.portrait} sizes="64px" decorative className="size-full object-cover object-top" />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-body text-[15px] leading-snug font-semibold" data-testid="hire-title">
                {r.state === 'running' && r.name
                  ? `${r.name} · ${m.said[r.said]}`
                  : m.row(m.saidCap[r.said], r.week)}
              </span>
              <span className="font-mono text-[11px] leading-snug" data-testid="hire-odds">
                {m.stepsInLine(oddsWordOf(r.word))}
              </span>
              <span className="font-mono text-[10.5px] leading-snug text-muted">{m.against}</span>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {r.state === 'hire' && (
                  <Button
                    onClick={() => onHire(r)}
                    pending={pending === `hire-${r.tier}`}
                    disabled={busy}
                    data-testid="hire"
                  >
                    {m.hire(r.week)}
                  </Button>
                )}
                {r.state === 'level' && <State>{m.fromLevel(r.need ?? 0)}</State>}
                {r.state === 'rank' && <State>{m.fromRank3}</State>}
                {r.state === 'needsIron' && <State>{copy.life.wardrobe.needsIron(r.week)}</State>}
                {(r.state === 'withYou' || r.state === 'running') && r.name && (
                  <State>{m.withYouUntil(r.name, until)}</State>
                )}
                {r.state === 'running' && r.renew && (
                  <RenewButtons renew={r.renew} onRenew={onRenew} pending={pending} />
                )}
              </div>
            </div>
          </div>
        );
      })}
      {notice && (
        <p role="status" className="px-3 pb-2 font-body text-[13px] text-failure" data-testid="hire-notice">
          {notice}
        </p>
      )}
    </section>
  );
}

function State({ children }: { children: string }) {
  return (
    <span className="font-mono text-[12px] text-muted" data-testid="hire-state">
      {children}
    </span>
  );
}

/** *Another week · 400* and *Four weeks · 1,600* (only when it fits), or *Paid four weeks ahead*. */
function RenewButtons({
  renew,
  onRenew,
  pending,
}: {
  renew: { week: number; four: number | null } | null;
  onRenew: (weeks: 1 | 4) => void;
  pending: string | null;
}) {
  if (!renew) return <State>{m.paidAhead}</State>;
  return (
    <>
      <Button
        variant="outline"
        onClick={() => onRenew(1)}
        pending={pending === 'renew-1'}
        disabled={pending !== null}
        data-testid="renew-week"
      >
        {m.anotherWeek(renew.week)}
      </Button>
      {renew.four !== null && (
        <Button
          variant="outline"
          onClick={() => onRenew(4)}
          pending={pending === 'renew-4'}
          disabled={pending !== null}
          data-testid="renew-four"
        >
          {m.fourWeeks(renew.four)}
        </Button>
      )}
    </>
  );
}

export interface HireConfirmProps {
  row: HireRowView | null;
  onOpenChange: (open: boolean) => void;
  onHire: (row: HireRowView) => void;
  pending: boolean;
}

/** Screens §18.1: over 1,000 Iron, *Hire {Name} for a week, 1,200 Iron?* · Hire · Not now. */
export function HireConfirm({ row, onOpenChange, onHire, pending }: HireConfirmProps) {
  return (
    <BottomSheet
      open={row !== null}
      onOpenChange={onOpenChange}
      title={row ? m.hireConfirm(row.name ?? m.said[row.said], row.week) : ''}
      stacked
    >
      {row && (
        <div className="flex flex-col gap-2" data-testid="hire-confirm">
          <Button onClick={() => onHire(row)} pending={pending} data-testid="hire-confirm-hire">
            {m.hireButton}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.life.shop.notNow}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

export interface MinderRowProps {
  minder: MinderView | null;
  onRenew: (weeks: 1 | 4) => void;
  pending: string | null;
  notice?: string | null;
}

/** Screens §18.2: the Me tab's *Walking with you* (under *Where you sleep*). */
export function MinderRow({ minder, onRenew, pending, notice }: MinderRowProps) {
  return (
    <section
      aria-label={m.meKicker}
      className="flex flex-col gap-2 border-[1.5px] border-ink bg-paper-card p-3"
      data-testid="me-minder"
    >
      <HelpButton notes={[copy.life.help.bodyguard()]} label={`${m.meKicker}: what it is`} className="self-start">
        <h2 className={cx('label-caps text-[11px] font-semibold text-muted', helpMark)}>{m.meKicker}</h2>
      </HelpButton>
      {minder ? (
        <div className="flex items-center gap-3">
          <div className="aspect-[4/5] w-10 shrink-0 overflow-hidden border border-ink">
            <Picture asset={minder.portrait} sizes="40px" decorative className="size-full object-cover object-top" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="font-mono text-[12px]" data-testid="me-minder-line">
              {minder.state === 'last'
                ? m.lastDay(minder.name, weekdayOf(minder.until))
                : m.meLine(minder.name, m.said[minder.said], weekdayOf(minder.until))}
            </span>
            <div className="flex flex-wrap gap-2">
              <RenewButtons renew={minder.renew.week > 0 ? minder.renew : null} onRenew={onRenew} pending={pending} />
            </div>
          </div>
        </div>
      ) : (
        <span className="font-mono text-[12px] text-muted" data-testid="me-minder-line">
          {m.nobody}
        </span>
      )}
      {notice && (
        <p role="status" className="font-body text-[13px] text-failure">
          {notice}
        </p>
      )}
    </section>
  );
}

export interface MinderEncounterRowProps {
  minder: { name: string; portrait: AssetView; chance: number | null; blocked: 'police' | null };
  best: boolean;
  disabled: boolean;
  pending: boolean;
  onChoose: () => void;
}

/** Screens §18.3: the run-in sheet's first row, *{Name} steps in · Good odds · his strength*. */
export function MinderEncounterRow({ minder, best, disabled, pending, onChoose }: MinderEncounterRowProps) {
  const blocked = minder.blocked !== null || minder.chance === null;
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={disabled || blocked}
      aria-busy={pending || undefined}
      className={cx(
        'flex min-h-14 w-full items-center gap-2.5 border-[1.5px] border-ink px-2 py-1.5 text-left',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-petrol',
        pending
          ? 'bg-ink text-paper'
          : 'cursor-pointer bg-paper-card hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-paper-card disabled:hover:text-ink',
      )}
      data-testid="run-in-minder"
      data-blocked={blocked ? 'police' : undefined}
    >
      <span className="aspect-[4/5] w-10 shrink-0 overflow-hidden border border-current">
        <Picture asset={minder.portrait} sizes="40px" decorative className="size-full object-cover object-top" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex w-full items-baseline justify-between gap-3">
          <span className="font-body text-[15px] leading-snug font-semibold">{m.stepsIn(minder.name)}</span>
          {best && !blocked && (
            <span className="shrink-0 font-mono text-[10.5px] opacity-80" data-testid="run-in-best">
              {copy.risk.bestFreeOdds}
            </span>
          )}
        </span>
        <span className="font-mono text-[11px] opacity-85" data-testid="run-in-line">
          {blocked ? m.notAgainstPolice : `${copy.odds.band(minder.chance ?? 0)} · ${m.hisStrength}`}
        </span>
      </span>
    </button>
  );
}

/** Tech design §24.7: a renewal's modal shows him (the `minder` view): the portrait and *until {weekday}*. */
export function MinderResultRow({ minder }: { minder: MinderView }) {
  return (
    <div className="flex items-center gap-3" data-testid="result-minder">
      <div className="aspect-[4/5] w-10 shrink-0 overflow-hidden border border-ink">
        <Picture asset={minder.portrait} sizes="40px" decorative className="size-full object-cover object-top" />
      </div>
      <span className="font-mono text-[12px]">{m.meLine(minder.name, m.said[minder.said], weekdayOf(minder.until))}</span>
    </div>
  );
}
