import { copy } from '@irongate/content/copy';
import { energyReadyAt } from '@irongate/rules';
import type { ActionView } from '@irongate/rules';
import { useEffect, useId, useRef } from 'react';
import { cx, formatClock } from '../format';
import { bandNote, oddsTag, statName, ticketOdds } from '../odds';
import { HelpButton, helpMark } from './Help';
import { ordinanceTagText } from './ResultModal';

/** Review 2 (answers §1.11): the plain type labels. */
export const TYPE_LABEL: Record<string, string> = copy.typeLabel;

export interface TicketProps {
  action: ActionView;
  /** Energy projected to now (value and the next tick), from the HUD. */
  energy: { value: number; nextTickAt: number | null };
  onPerform: (times: 1 | 3) => void;
  /** Which button is waiting for the server. */
  pending?: 1 | 3 | null;
  /** A refusal from the server, already worded. */
  notice?: string;
  /** +25 % FXP on matching attempts (from the orders view). */
  orderBonusPct?: number;
  /** Review 1 (§13.7): opened from its Party order: marked, and scrolled into view. */
  highlight?: boolean;
}

/**
 * An action as a printed ticket (mockups MobileMission, Mission): Energy stub, name, the odds as a
 * word with the stat they rest on (*Good odds · Intelligence*, review 2; a tap opens the band's
 * note, never a number) or *Intelligence 12 → 13 · always works*, a tags line, and *Once* / *×3* with
 * the batch's cost under it (review 3: every button that spends Energy says what it costs); training
 * has one button, the title's verb (*Study*, *Lift*: content), with the live cost on the stub. It
 * words the server's numbers.
 */
export function Ticket({
  action: a,
  energy,
  onPerform,
  pending,
  notice,
  orderBonusPct = 25,
  highlight = false,
}: TicketProps) {
  const hintId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView?.({ block: 'nearest' });
  }, [highlight]);

  let blocked: string | null = null;
  if (a.locked)
    blocked = a.locked.reason === 'LEVEL' ? `Level ${a.locked.need}` : copy.needsReputation(a.locked.need);
  const short1 = energy.value < a.energy;
  const short3 = a.energy3 !== null && energy.value < a.energy3;
  const readyAt = short1 ? energyReadyAt(energy, a.energy) : null;
  const hint =
    blocked ??
    (short1
      ? copy.needsEnergy(a.energy, readyAt === null ? '—' : formatClock(readyAt))
      : short3 && a.energy3 !== null
        ? copy.x3Needs(a.energy3)
        : null);

  const orderDone = !!a.order && a.order.progress >= a.order.target;
  const order = a.order
    ? orderDone
      ? copy.orderDone
      : a.givesFxp
        ? copy.orderTag(a.order.progress, a.order.target, orderBonusPct)
        : `Party order ${a.order.progress} / ${a.order.target}`
    : null;
  // Slice 3 (screens §8): the rule's tags go before the Party-order tag; review 2: a check bonus
  // that is not a rule's or the reputation's (First day) is a tag in words, "· better odds".
  const bonusTags = (a.preview?.bonuses ?? [])
    .filter((b) => b.id !== 'standing' && !(a.tags ?? []).some((t) => t.ordinanceId === b.id))
    .map(oddsTag);
  const tags = [TYPE_LABEL[a.type] ?? a.type, ...(a.tags ?? []).map(ordinanceTagText), ...bonusTags, order]
    .filter(Boolean)
    .join(' · ');

  const button = cx(
    // Review 3 (answers §4.3): both buttons the stub's 52 px, so the ticket reads 52 · text · 52 · 52.
    'w-[52px] shrink-0 cursor-pointer border-l border-ink font-label text-paper',
    'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-paper',
    'disabled:cursor-not-allowed disabled:bg-faint',
  );

  return (
    <div
      ref={ref}
      className="flex flex-col"
      data-testid={`ticket-${a.id}`}
      data-highlight={highlight || undefined}
    >
      <div
        className={cx(
          'flex min-h-[64px] items-stretch border bg-paper-card text-ink',
          blocked ? 'border-faint' : 'border-ink',
          highlight && 'shadow-[0_0_0_3px_var(--color-xp)]',
        )}
      >
        <div className="flex w-[52px] shrink-0 flex-col items-center justify-center gap-px border-r-[1.5px] border-dashed border-ink bg-paper-2">
          <span className="font-label text-[19px] leading-none font-semibold">{a.energy}</span>
          <span className="label-caps text-[8px]">Energy</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2.5 py-1.5">
          <span className="font-display text-[15px] leading-tight font-bold">{a.name}</span>
          {a.preview ? (
            <HelpButton
              notes={[bandNote(a.preview)]}
              label={`${ticketOdds(a.preview)}: what the odds mean`}
              testId="ticket-odds-help"
              className="-mx-1 -my-2 inline-flex items-center self-start px-1 font-mono text-[11px] text-muted hover:text-ink"
            >
              <span className={helpMark} data-testid="ticket-odds">
                <span data-testid="ticket-chance">{copy.odds.band(a.preview.chance)}</span>
                {ticketOdds(a.preview).slice(copy.odds.band(a.preview.chance).length)}
              </span>
            </HelpButton>
          ) : (
            <span className="font-mono text-[11px] text-muted">
              {a.trains ? `${statName(a.trains.stat)} ${a.trains.from} → ${a.trains.to} · ` : ''}
              {copy.odds.alwaysWorks}
            </span>
          )}
          <span
            // Review 1 #10: a done order is no longer a call to action; in the accent colour it read
            // as a warning that the action was blocked. Muted, like any other tag line.
            className={cx('font-mono text-[10.5px]', order && !orderDone ? 'text-collective' : 'text-muted')}
            data-testid="ticket-tags"
          >
            {tags}
          </span>
        </div>
        {a.kind === 'training' ? (
          // Training has no batch (§8.5, §13.1): one button, the live cost on the stub.
          <button
            type="button"
            onClick={() => onPerform(1)}
            disabled={blocked !== null || short1 || !!pending}
            aria-busy={pending === 1 || undefined}
            aria-label={`${a.name}, ${a.energy} Energy`}
            aria-describedby={hint ? hintId : undefined}
            className={cx(button, 'w-16 bg-ink text-[12px] tracking-[0.1em] uppercase hover:bg-ink-2')}
            data-testid="ticket-verb"
          >
            {/* Review 3 (GDD §8.5): the title's verb, never "Train" (content `verb`). */}
            {pending === 1 ? '…' : (a.verb ?? copy.typeLabel.training)}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onPerform(1)}
              disabled={blocked !== null || short1 || !!pending}
              aria-busy={pending === 1 || undefined}
              aria-label={`${a.name}, once, ${a.energy} Energy`}
              aria-describedby={hint ? hintId : undefined}
              className={cx(button, 'bg-ink text-[12px] tracking-[0.08em] uppercase hover:bg-ink-2')}
              data-testid="ticket-once"
            >
              {pending === 1 ? '…' : copy.ticket.once}
            </button>
            <button
              type="button"
              onClick={() => onPerform(3)}
              disabled={blocked !== null || short3 || !!pending}
              aria-busy={pending === 3 || undefined}
              aria-label={`${a.name}, three times, ${a.energy3 ?? a.energy * 3} Energy`}
              title={short3 && a.energy3 !== null ? copy.x3Needs(a.energy3) : undefined}
              aria-describedby={hint ? hintId : undefined}
              className={cx(
                button,
                'group flex flex-col items-center justify-center gap-0.5 bg-ink-2 hover:bg-ink',
              )}
              data-testid="ticket-three"
            >
              {pending === 3 ? (
                '…'
              ) : (
                <>
                  <span className="text-[15px] leading-none">{copy.ticket.three}</span>
                  {/* The one cost the stub does not state, on the button that spends it. */}
                  <span
                    className="label-caps text-[8px] leading-none text-energy-light group-disabled:text-paper"
                    aria-hidden="true"
                    data-testid="ticket-three-cost"
                  >
                    {copy.ticket.threeCost(a.energy3 ?? a.energy * 3)}
                  </span>
                </>
              )}
            </button>
          </>
        )}
      </div>
      {hint && (
        <p id={hintId} className="mt-1 font-mono text-[11px] text-muted" data-testid="ticket-hint">
          {hint}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-1 font-body text-[13px] text-collective">
          {notice}
        </p>
      )}
    </div>
  );
}
