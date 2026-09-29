import { copy } from '@irongate/content/copy';
import { energyReadyAt } from '@irongate/rules';
import type { ActionView } from '@irongate/rules';
import { useId, useState } from 'react';
import { cx, formatClock, statLabel } from '../format';
import { CheckBreakdownList } from './CheckBreakdownList';

export const TYPE_LABEL: Record<string, string> = {
  canvass: 'Canvassing',
  speech: 'Speech',
  propaganda: 'Propaganda',
  intelligence: 'Intelligence',
  council: 'Council',
  training: 'Training',
  job: 'Job shift',
};

export interface TicketProps {
  action: ActionView;
  /** Energy projected to now (value and the next tick), from the HUD. */
  energy: { value: number; nextTickAt: number | null };
  /** Whether the character holds any job (for the shift ticket's state line). */
  hasJob: boolean;
  onPerform: (times: 1 | 3) => void;
  /** Which button is waiting for the server. */
  pending?: 1 | 3 | null;
  /** A refusal from the server, already worded. */
  notice?: string;
  /** +25 % FXP on matching attempts (from the orders view). */
  orderBonusPct?: number;
}

/**
 * An action as a printed ticket (mockups MobileMission, Mission): Energy stub, name, the odds (tap
 * for the breakdown) or "no roll", a tags line, and ×1 / ×3 (one Work or Train button for shifts and
 * training). It displays the server's numbers.
 */
export function Ticket({
  action: a,
  energy,
  hasJob,
  onPerform,
  pending,
  notice,
  orderBonusPct = 25,
}: TicketProps) {
  const [open, setOpen] = useState(false);
  const breakdownId = useId();
  const hintId = useId();

  let blocked: string | null = null;
  if (a.locked)
    blocked = a.locked.reason === 'LEVEL' ? `Level ${a.locked.need}` : `Standing ${a.locked.need}`;
  else if (a.kind === 'shift' && a.shift) {
    if (!a.shift.held) blocked = hasJob ? copy.shiftNotYourJob : copy.shiftNoJob;
    else if (a.shift.workedToday && a.shift.nextShiftAt !== null)
      blocked = copy.shiftWorked(formatClock(a.shift.nextShiftAt));
  }
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

  const order = a.order
    ? a.order.progress >= a.order.target
      ? copy.orderDone
      : a.givesFxp
        ? copy.orderTag(a.order.progress, a.order.target, orderBonusPct)
        : `Party order ${a.order.progress} / ${a.order.target}`
    : null;
  const tags = [TYPE_LABEL[a.type] ?? a.type, order].filter(Boolean).join(' · ');

  const button = cx(
    'w-12 shrink-0 cursor-pointer border-l border-ink font-label text-[15px] text-paper',
    'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-paper',
    'disabled:cursor-not-allowed disabled:bg-faint',
  );

  return (
    <div className="flex flex-col" data-testid={`ticket-${a.id}`}>
      <div
        className={cx(
          'flex min-h-[64px] items-stretch border bg-paper-card text-ink',
          blocked ? 'border-faint' : 'border-ink',
        )}
      >
        <div className="flex w-[52px] shrink-0 flex-col items-center justify-center gap-px border-r-[1.5px] border-dashed border-ink bg-paper-2">
          <span className="font-label text-[19px] leading-none font-semibold">{a.energy}</span>
          <span className="label-caps text-[8px]">Energy</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2.5 py-1.5">
          <span className="font-display text-[15px] leading-tight font-bold">{a.name}</span>
          {a.preview ? (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls={breakdownId}
              className="-mx-1 -my-2 inline-flex min-h-11 cursor-pointer items-center self-start px-1 text-left font-mono text-[11px] text-muted hover:text-ink"
            >
              <span className="underline decoration-dotted underline-offset-2">
                <span data-testid="ticket-chance">{a.preview.chance} %</span>&nbsp;·{' '}
                {statLabel(a.preview.stats)} check
              </span>
            </button>
          ) : (
            <span className="font-mono text-[11px] text-muted">
              {a.trains ? `${a.trains.stat.toUpperCase()} ${a.trains.from} → ${a.trains.to} · ` : ''}no roll
            </span>
          )}
          <span
            className={cx('font-mono text-[10.5px]', order ? 'text-collective' : 'text-muted')}
            data-testid="ticket-tags"
          >
            {tags}
          </span>
        </div>
        {a.kind === 'shift' || a.kind === 'training' ? (
          // Shifts and training have no batch (§8.5, §13.1): one button, the live cost on the stub.
          <button
            type="button"
            onClick={() => onPerform(1)}
            disabled={blocked !== null || short1 || !!pending}
            aria-busy={pending === 1 || undefined}
            aria-label={`${a.name}, ${a.energy} Energy`}
            aria-describedby={hint ? hintId : undefined}
            className={cx(button, 'w-16 bg-ink text-[12px] tracking-[0.1em] uppercase hover:bg-ink-2')}
          >
            {pending === 1 ? '…' : a.kind === 'shift' ? 'Work' : 'Train'}
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
              className={cx(button, 'bg-ink hover:bg-ink-2')}
            >
              {pending === 1 ? '…' : '×1'}
            </button>
            <button
              type="button"
              onClick={() => onPerform(3)}
              disabled={blocked !== null || short3 || !!pending}
              aria-busy={pending === 3 || undefined}
              aria-label={`${a.name}, three times, ${a.energy3 ?? a.energy * 3} Energy`}
              title={short3 && a.energy3 !== null ? copy.x3Needs(a.energy3) : undefined}
              aria-describedby={hint ? hintId : undefined}
              className={cx(button, 'bg-ink-2 hover:bg-ink')}
            >
              {pending === 3 ? '…' : '×3'}
            </button>
          </>
        )}
      </div>
      {a.preview && (
        <div hidden={!open} className="border-x border-b border-ink bg-paper px-3 py-2">
          <CheckBreakdownList id={breakdownId} check={a.preview} />
        </div>
      )}
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
