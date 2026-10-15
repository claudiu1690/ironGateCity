import { copy } from '@irongate/content/copy';
import type { EventBand, EventCardView, EventCaller, FactionId, PlaceTagView } from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx, formatClock, formatWeekday } from '../format';
import { Button } from './Button';
import { formatSwing } from './Capital';
import { FACTION_STYLE } from './FactionCrest';
import { HelpButton, helpMark } from './Help';
import type { HelpNote } from './Help';
import { MemberFace } from './Members';
import { Picture } from './Picture';
import type { StampTone } from './Stamp';

/**
 * Slice 6 (screens §2.2, §3, §5): the shared bits of the Campaign Event screens: the tags' words, the
 * band's stamp, a member's face by avatar id, and *called by …*.
 */

/** *Issue: tram fares · opinion +50 %* · *Close race · +25 %* (the events' two place tags). */
export function eventTagText(t: PlaceTagView): string | null {
  if (t.kind === 'issue') return copy.together.card.tags.issue(t.name);
  if (t.kind === 'closeRace') return copy.together.card.tags.closeRace;
  return null;
}

/** The stamp of a band: the faction colour on Triumph, the failure colour on Fiasco (design §2.6). */
export function bandStamp(
  band: EventBand | 'calledOff',
  factionId: FactionId,
): { label: string; tone: StampTone; color?: string } {
  if (band === 'calledOff') return { label: copy.together.calledOffWord, tone: 'partial' };
  const label = copy.together.band[band];
  if (band === 'triumph') return { label, tone: 'success', color: FACTION_STYLE[factionId].color };
  if (band === 'fiasco') return { label, tone: 'failure' };
  if (band === 'mixed') return { label, tone: 'partial' };
  return { label, tone: 'success' };
}

export function calledByText(c: EventCaller): string {
  return c.kind === 'secretary' ? copy.together.card.calledBySecretary(c.name) : copy.together.card.calledBy(c.name);
}

/**
 * A member's face (lane B's `MemberFace`, one avatar component for the slice), or a dashed circle
 * with *?* for an open place.
 */
export function Face({
  avatarId,
  size,
  open = false,
  className,
}: {
  avatarId: string | null;
  size: number;
  open?: boolean;
  className?: string;
}) {
  if (open)
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={cx(
          'flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-muted font-label text-[13px] text-muted',
          className,
        )}
      >
        ?
      </span>
    );
  return <MemberFace avatarId={avatarId} size={size} className={className} />;
}

export interface EventCardProps {
  event: EventCardView;
  /** The card's button: join (opens the page with the slot to pick) or the page itself. */
  onOpen: () => void;
  /** *Join* / *Join as a hand*: the page, with the first open slot selected. */
  onJoin?: () => void;
  /** *Your sign-ups*: Withdraw until the hour before; after it the committed line. */
  withdraw?: {
    canWithdraw: boolean;
    withdrawUntil: number;
    /** *Withdraw · 10 Energy back*. */
    label: string;
    onWithdraw: () => void;
    pending?: boolean;
  } | null;
  className?: string;
}

/**
 * `EventCard` (screens §2.2): the board's row. The event's art at 56 px, the name, *{venue} · settles
 * at {time} · {filled} of {roles} roles{ · hands n of 4}*, *called by …*, a tag line, and at the right
 * *Join* / *Join as a hand* / *You're the {role}* / *Full* / *Settling…*. The card opens the event page.
 */
export function EventCard({ event: e, onOpen, onJoin, withdraw, className }: EventCardProps) {
  const tags = e.tags.map(eventTagText).filter((t): t is string => !!t);
  const time = formatClock(e.startsAt);
  const line = copy.together.card.line(
    e.action === 'elsewhere' ? `${e.place.venueName}, ${e.place.districtName ?? e.place.cityName}` : e.place.venueName,
    time,
    e.filled,
    e.roles,
    e.hands.k > 0 ? e.hands.k : null,
  );
  const settles = copy.together.card.settlesAt(time);
  const at = line.indexOf(settles);
  const settlesParts = at >= 0 ? [line.slice(0, at), line.slice(at + settles.length)] : null;
  const elsewhere = e.action === 'elsewhere';
  let right: ReactNode = null;
  if (withdraw) {
    right = withdraw.canWithdraw ? (
      <Button
        variant="outline"
        className="px-3 text-[12px]"
        onClick={withdraw.onWithdraw}
        pending={withdraw.pending}
        data-testid="event-card-withdraw"
      >
        {withdraw.label}
      </Button>
    ) : null;
  } else if (e.action === 'join' || e.action === 'joinHand') {
    right = (
      <Button
        className="px-3 text-[12px] whitespace-nowrap"
        onClick={(ev) => {
          ev.stopPropagation();
          (onJoin ?? onOpen)();
        }}
        data-testid="event-card-join"
      >
        {e.action === 'join' ? copy.together.card.join : copy.together.card.joinAsHand}
      </Button>
    );
  } else if (e.action === 'yours' && e.you) {
    right = (
      <span className="font-mono text-[11px] text-petrol" data-testid="event-card-yours">
        {copy.together.card.yours(e.you.roleName)}
      </span>
    );
  } else if (e.action === 'full') {
    right = <span className="font-mono text-[11px] text-muted">{copy.together.card.full}</span>;
  } else if (e.action === 'settling') {
    right = <span className="font-mono text-[11px] text-muted">{copy.together.card.settling}</span>;
  }
  return (
    <article
      className={cx(
        'flex items-start gap-3 border-[1.5px] border-ink bg-paper-2 p-2.5',
        elsewhere && 'opacity-75',
        className,
      )}
      data-testid="event-card"
      data-event-id={e.id}
      data-kind={e.kind}
    >
      <Picture
        asset={e.art}
        sizes="56px"
        decorative
        className="size-14 shrink-0 border border-ink object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {elsewhere ? (
          <h3 className="font-display text-[16px] leading-tight font-bold">{e.name}</h3>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="-my-1 min-h-11 cursor-pointer text-left font-display text-[16px] leading-tight font-bold underline-offset-2 hover:underline"
            data-testid="event-card-open"
          >
            {e.name}
          </button>
        )}
        {/* Slice 6 fix round (QA clarity): *settles at 19:40* carries a note (it happens then, online or not). */}
        <HelpButton
          notes={[copy.together.help.settles() as HelpNote, copy.together.help.campaignEvent() as HelpNote]}
          label={copy.together.help.settles()[0] ?? ''}
          testId="event-card-settles-help"
          className="-my-1 self-start"
        >
          <span className="font-mono text-[11px] text-text-2" data-testid="event-card-line">
            {settlesParts ? (
              <>
                {settlesParts[0]}
                <span className={helpMark}>{settles}</span>
                {settlesParts[1]}
              </>
            ) : (
              line
            )}
            {elsewhere ? ` · ${copy.together.board.joinFromThere}` : ''}
          </span>
        </HelpButton>
        <span className="font-body text-[13px] text-text-2" data-testid="event-card-caller">
          {calledByText(e.calledBy)}
        </span>
        {tags.length > 0 && (
          <span className="label-caps text-[10px] text-petrol" data-testid="event-card-tags">
            {tags.join(' · ')}
          </span>
        )}
        {withdraw && e.you && (
          <span className="font-mono text-[11px] text-petrol" data-testid="event-card-yours">
            {copy.together.card.yours(e.you.roleName)}
          </span>
        )}
        {withdraw && !withdraw.canWithdraw && (
          <span className="font-mono text-[11px] text-muted" data-testid="event-card-committed">
            {copy.together.event.committed(formatClock(withdraw.withdrawUntil))}
          </span>
        )}
      </div>
      {right && <div className="flex shrink-0 items-center self-center">{right}</div>}
    </article>
  );
}

export interface EventResultLineProps {
  row: { startsAt: number; name: string; venueName: string; band: EventBand | 'calledOff'; swing: number; members: number };
  factionId: FactionId;
  onOpen: () => void;
}

/** A resolved event on the board (screens §2.2, `SystemLine` style): one tappable line. */
export function EventResultLine({ row: r, factionId, onOpen }: EventResultLineProps) {
  const stamp = bandStamp(r.band, factionId);
  const text =
    r.band === 'calledOff'
      ? copy.together.board.resultRowCalledOff(formatWeekday(r.startsAt), formatClock(r.startsAt), r.name, r.venueName)
      : copy.together.board.resultRow(
          formatWeekday(r.startsAt),
          formatClock(r.startsAt),
          r.name,
          r.venueName,
          stamp.label,
          formatSwing(r.swing),
          r.members,
        );
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-11 w-full cursor-pointer items-center border-b border-ink py-1.5 text-left font-mono text-[12px] leading-snug hover:bg-paper-2"
      data-testid="event-result-row"
    >
      <span
        className={cx(r.band === 'fiasco' && 'text-failure')}
        style={r.band === 'triumph' ? { color: FACTION_STYLE[factionId].color } : undefined}
      >
        {text}
      </span>
    </button>
  );
}
