import { copy } from '@irongate/content/copy';
import type { EventRowView } from '@irongate/rules';
import { cx, formatClock } from '../format';

const p = copy.together.paper;

export interface PaperEventsProps {
  events: EventRowView[];
  /** The residence city (*No event in Coalport today*) and the faction's Rank 3 title. */
  cityName: string;
  rank3Title: string;
  onOpen: (eventId: string) => void;
}

/**
 * Slice 6 (screens §8; tech design §11.1): the paper's *Events* rows under Party orders, the
 * `LettersRow` style. One row per open event of the faction in the residence city, fixture first:
 * *Today: the branch's doorstep drive at Foundry Row · settles at midnight · 2 of 4 roles*, and at the
 * right *you're the Coordinator*, or *Join* (the welcome edition: *join as a hand · 5 Energy*). A tap
 * opens the event page.
 */
export function PaperEvents({ events, cityName, rank3Title, onOpen }: PaperEventsProps) {
  return (
    <section aria-label={p.kicker} className="flex flex-col" data-testid="paper-events">
      <div className="label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
        {p.kicker}
      </div>
      {events.length === 0 ? (
        <p className="border-b border-dotted border-faint py-2 font-body text-[14px] text-text-2" data-testid="paper-events-empty">
          {p.empty(cityName, rank3Title)}
        </p>
      ) : (
        events.map((e) => (
          <button
            key={e.eventId}
            type="button"
            onClick={() => onOpen(e.eventId)}
            className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 border-b border-dotted border-faint py-2 text-left hover:bg-paper-card"
            data-testid="paper-event"
          >
            <span className="font-body text-[14px] leading-snug">
              {p.row(e.event, e.venueName, e.fixture ? p.midnight : formatClock(e.startsAt), e.filled, e.roles)}
            </span>
            <span
              className={cx(
                'shrink-0 text-right',
                e.you ? 'font-mono text-[12px] text-petrol' : e.joinAsHand ? 'font-mono text-[12px] text-ink' : 'label-caps border-[1.5px] border-ink px-3 py-2 text-[12px]',
              )}
            >
              {e.you ? p.yours(e.you.roleName) : e.joinAsHand ? p.joinAsHand : p.join}
            </span>
          </button>
        ))
      )}
    </section>
  );
}

/** The desk's *Signed up* rows (screens §8): *Signed up: the rally at Market Row, 19:40 · Organiser*. */
export function SignedUpRows({
  rows,
}: {
  rows: Array<{ event: string; venueName: string; startsAt: number; roleName: string }>;
}) {
  if (rows.length === 0) return null;
  return (
    <ul className="flex flex-col" aria-label={p.signedUpLabel} data-testid="desk-signed-up">
      {rows.map((r) => (
        <li
          key={`${r.event}-${r.startsAt}`}
          className="flex min-h-11 items-center border-b border-dotted border-faint font-body text-[14px]"
        >
          {p.signedUp(r.event, r.venueName, formatClock(r.startsAt), r.roleName)}
        </li>
      ))}
    </ul>
  );
}
