import { useId, useState } from 'react';
import type { CheckBreakdown } from '@irongate/rules';
import { cx } from '../format';
import { CheckBreakdownList } from './CheckBreakdownList';

export interface TicketProps {
  name: string;
  /** e.g. "Canvassing". */
  typeLabel: string;
  energy: number;
  /** The server's preview; the ticket only displays it. */
  preview: CheckBreakdown;
  onPerform: () => void;
  pending?: boolean;
  disabled?: boolean;
  /** Why the button is disabled, shown under the ticket (e.g. not enough Energy). */
  notice?: string;
}

/** An action as a printed ticket: Energy stub, name and odds, and a ×1 button. */
export function Ticket({
  name,
  typeLabel,
  energy,
  preview,
  onPerform,
  pending,
  disabled,
  notice,
}: TicketProps) {
  const [open, setOpen] = useState(false);
  const breakdownId = useId();
  return (
    <div className="flex flex-col">
      <div className="flex min-h-[66px] items-stretch border border-ink bg-paper-card text-ink">
        <div className="flex w-[54px] shrink-0 flex-col items-center justify-center gap-px border-r-[1.5px] border-dashed border-ink bg-paper-2">
          <span className="font-label text-[19px] leading-none font-semibold">{energy}</span>
          <span className="label-caps text-[8px]">Energy</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-2.5 py-1.5">
          <span className="font-display text-[15px] leading-tight font-bold">{name}</span>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={breakdownId}
            className="-mx-1 -my-2 inline-flex min-h-11 cursor-pointer items-center self-start px-1 text-left font-mono text-[11px] text-muted hover:text-ink"
          >
            <span className="underline decoration-dotted underline-offset-2">
              <span data-testid="ticket-chance">{preview.chance} %</span>&nbsp;· {preview.stat.toUpperCase()}{' '}
              check · {typeLabel}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={onPerform}
          disabled={disabled || pending}
          aria-busy={pending || undefined}
          aria-label={`${name}, once, ${energy} Energy`}
          className={cx(
            'w-14 shrink-0 cursor-pointer border-l border-ink font-label text-[15px] text-paper',
            'bg-ink hover:bg-ink-2 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-paper',
            'disabled:cursor-not-allowed disabled:bg-faint',
          )}
        >
          {pending ? '…' : '×1'}
        </button>
      </div>
      <div hidden={!open} className="border-x border-b border-ink bg-paper px-3 py-2">
        <CheckBreakdownList id={breakdownId} check={preview} />
      </div>
      {notice && (
        <p role="status" className="mt-1.5 font-body text-[13px] text-collective">
          {notice}
        </p>
      )}
    </div>
  );
}
