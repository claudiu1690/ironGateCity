import { copy } from '@irongate/content/copy';
import type { EventTicketView, HereNowView } from '@irongate/rules';
import { cx, formatClock } from '../format';
import { Button } from './Button';
import { HelpButton, helpMark } from './Help';
import type { HelpNote } from './Help';

export interface EventTicketProps {
  ticket: EventTicketView;
  /** The live clock: after the start, *Settling…* until the result is read. */
  now: number;
  onJoin: () => void;
}

/**
 * The venue's event ticket (screens §6.2): under a *Campaign event* kicker on a double rule, a ticket
 * whose stub is the start time (the view carries no art; tech §8.3's `EventTicketView`), the title
 * (*The rally · settles at 19:40*), *{filled} of {roles} roles*, and **Join** (→ the event page) or
 * *You're the {role}*; after the start, *Settling…*.
 */
export function EventTicket({ ticket: t, now, onJoin }: EventTicketProps) {
  const time = formatClock(t.startsAt);
  const settling = now >= t.startsAt;
  return (
    <section className="flex flex-col gap-1" data-testid="event-ticket" data-event-id={t.eventId}>
      <HelpButton
        notes={[copy.together.help.campaignEvent() as HelpNote]}
        label={copy.together.card.kicker}
        testId="event-ticket-help"
        className={cx(
          'label-caps self-stretch border-t-[3px] border-double border-ink pt-1 text-left text-[11px] font-semibold',
        )}
      >
        <span className={helpMark}>{copy.together.card.kicker}</span>
      </HelpButton>
      <div className="flex items-stretch border-[1.5px] border-ink bg-paper-card">
        <div className="flex w-14 shrink-0 flex-col items-center justify-center border-r-[1.5px] border-dashed border-ink bg-ink text-paper">
          <span className="font-label text-[15px] leading-none">{time}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-2.5 py-2">
          <span className="font-display text-[15px] leading-tight font-bold" data-testid="event-ticket-title">
            {copy.together.card.ticketTitle(t.name.toLowerCase(), time)}
          </span>
          <span className="font-mono text-[11px] text-text-2">{copy.together.event.rolesKicker(t.filled, t.roles)}</span>
        </div>
        <div className="flex shrink-0 items-center pr-2">
          {settling ? (
            <span className="font-mono text-[11px] text-muted">{copy.together.card.settling}</span>
          ) : t.you ? (
            <span className="font-mono text-[11px] text-petrol" data-testid="event-ticket-yours">
              {copy.together.card.yours(t.you.roleName)}
            </span>
          ) : (
            <Button className="px-3 text-[12px]" onClick={onJoin} data-testid="event-ticket-join">
              {copy.together.card.join}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

export interface HereNowLineProps {
  view: HereNowView | null;
  /** An own-faction name opens the profile sheet (lane B's), when given. */
  onName?: (characterId: string) => void;
  className?: string;
}

/**
 * `HereNowLine` (screens §6.1): under a place's blurb, one Courier 11 px line with a dotted-underlined
 * label: **Here now** · *you, Jan Sorel, Mira Hale and 2 more · 1 from another party* / *nobody else
 * just now*. Own-faction names are tappable; the other parties are a count.
 */
export function HereNowLine({ view, onName, className }: HereNowLineProps) {
  if (!view) return null;
  const h = copy.together.hereNow;
  const names = view.names.map((n) => n.name);
  const text = view.nobody ? h.nobody : h.line(names, view.more, view.others);
  return (
    <p className={cx('font-mono text-[11px] leading-snug text-text-2', className)} data-testid="here-now">
      <HelpButton
        notes={[copy.together.help.hereNow() as HelpNote]}
        label={h.label}
        testId="here-now-help"
        className="inline"
      >
        <span className={helpMark}>{h.label}</span>
      </HelpButton>
      {' · '}
      {onName && view.names.length > 0 && !view.nobody ? (
        <HereNowNames view={view} onName={onName} />
      ) : (
        <span data-testid="here-now-text">{text}</span>
      )}
    </p>
  );
}

/** The line with each own-faction name a real button (the profile sheet). */
function HereNowNames({ view, onName }: { view: HereNowView; onName: (id: string) => void }) {
  const h = copy.together.hereNow;
  const others = view.others > 0 ? ` · ${h.line([], 0, view.others).replace(/^you and /, '')}` : '';
  return (
    <span data-testid="here-now-text">
      you,{' '}
      {view.names.map((n, i) => (
        <span key={n.characterId}>
          {i > 0 && (i === view.names.length - 1 && view.more === 0 ? ' and ' : ', ')}
          <button
            type="button"
            onClick={() => onName(n.characterId)}
            className="-my-3 inline-flex min-h-11 cursor-pointer items-center underline decoration-dotted underline-offset-2"
            data-testid="here-now-name"
          >
            {n.name}
          </button>
        </span>
      ))}
      {view.more > 0 ? ` and ${view.more} more` : ''}
      {others}
    </span>
  );
}
