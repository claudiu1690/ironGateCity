import { copy } from '@irongate/content/copy';
import type {
  EventPageView,
  EventRoleGateReason,
  EventRoleView,
  FactionId,
  Outcome,
} from '@irongate/rules';
import type { ReactNode } from 'react';
import { cx, formatClock, formatWeekday } from '../format';
import { statLine, statName } from '../odds';
import { formatSwing } from './Capital';
import { Face, bandStamp, eventTagText } from './EventCard';
import { FACTION_STYLE } from './FactionCrest';
import { GroundSash } from './GroundSash';
import type { Ground } from './GroundSash';
import { ArtPanel } from './HallHeader';
import { HelpButton, helpMark } from './Help';
import type { HelpNote } from './Help';
import { Stamp } from './Stamp';

/**
 * Slice 6 (screens §3; the mockup `MobileEvent.dc.html`): the parts of the event page. Plain props:
 * the client fetches `events.get` and passes the view; these word it and decide nothing.
 */

/** A gate in words: *Organisers and above* · *Needs 15 Energy* · *You're on this one already.* */
export function roleGateText(
  gate: { reason: EventRoleGateReason | 'HANDS_FULL'; need?: number },
  ladder: readonly string[],
): string {
  const e = copy.together.errors;
  switch (gate.reason) {
    case 'RANK':
      return e.RANK(ladder[(gate.need ?? 2) - 1] ?? `Rank ${gate.need ?? 2}`);
    case 'NOT_ENOUGH_ENERGY':
      return e.NOT_ENOUGH_ENERGY(gate.need ?? 0);
    default:
      return e[gate.reason];
  }
}

/** A named role's stats in words: *Charisma and Intelligence* (a `best` role names no stat). */
function roleStats(r: EventRoleView): string {
  return copy.odds.statLine((r.stats as string[]).map(statName));
}

/** *Good odds · Intelligence* / *Long shot · your best, Strength* (the member's own odds, as words). */
export function roleOdds(r: EventRoleView): string | null {
  if (!r.forYou) return null;
  return copy.odds.ticket(
    copy.odds.band(r.forYou.chance),
    statLine({ stats: r.forYou.stats, best: r.stats[0] === 'best' }),
  );
}

const OUTCOME_WORD: Record<Outcome | 'volunteer', string> = copy.together.result.outcome as Record<
  Outcome | 'volunteer',
  string
>;
const OUTCOME_TONE: Record<Outcome | 'volunteer', string> = {
  success: 'text-success',
  partial: 'text-partial',
  failure: 'text-failure',
  volunteer: 'text-muted',
};

export interface EventHeaderProps {
  event: EventPageView;
  /** The member's party (an event is always their own): Triumph's stamp in its colour. */
  factionId: FactionId;
  ground: Ground | null;
  /** The live clock (server-aligned), for *starts in {h} h {m} m*. */
  now: number;
  /** The back arrow (where the page was opened from). */
  back?: ReactNode;
}

/**
 * The header band (screens §3.1, 230 px on a phone): the event's art behind an ink band, the ground
 * sash, the kicker, the name in Playfair 32 px and the when line (*started · settling*, or the
 * result's line once resolved; the stamp on a resolved or called-off page).
 */
export function EventHeader({ event: e, factionId, ground, now, back }: EventHeaderProps) {
  const city = e.place.districtName ? `${e.place.districtName}, ${e.place.cityName}` : e.place.cityName;
  let line: string;
  if (e.state === 'resolved' && e.result)
    line = copy.together.event.resolvedLine(copy.together.band[e.result.band], formatSwing(e.result.swing), e.result.members);
  else if (e.state === 'calledOff') line = copy.together.calledOffWord;
  else if (e.state === 'settling' || now >= e.startsAt) line = copy.together.event.settling;
  else if (e.kind === 'fixture') line = copy.together.event.fixtureLine;
  else {
    const left = Math.max(0, e.startsAt - now);
    const h = Math.floor(left / 3_600_000);
    const m = Math.floor((left % 3_600_000) / 60_000);
    line = copy.together.event.whenLine(
      formatWeekday(e.startsAt),
      formatClock(e.startsAt),
      h,
      m,
      e.calledBy.name,
    );
  }
  const stamp =
    e.state === 'calledOff'
      ? bandStamp('calledOff', factionId)
      : e.state === 'resolved' && e.result
        ? bandStamp(e.result.band, factionId)
        : null;
  return (
    <ArtPanel art={e.art} className="h-[230px] text-paper">
      <div
        className="absolute inset-0 bg-[linear-gradient(0deg,rgb(21_24_26/0.95)_0%,rgb(21_24_26/0.55)_55%,rgb(21_24_26/0.2)_100%)]"
        aria-hidden="true"
      />
      {back && <div className="absolute top-2 left-2 z-10">{back}</div>}
      {ground && <GroundSash ground={ground} />}
      {stamp && (
        <div className="absolute top-12 right-4" data-testid="event-stamp">
          <Stamp tone={stamp.tone} label={stamp.label} color={stamp.color} className="text-[20px]" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 px-4 pb-3">
        <span className="label-caps text-[10px] text-dim" data-testid="event-kicker">
          {copy.together.event.kicker(city, e.place.venueName)}
        </span>
        <h1 className="font-display text-[32px] leading-[1.05] font-black" data-testid="event-name">
          {e.name}
        </h1>
        <span className="font-mono text-[12px] text-paper-2" data-testid="event-when">
          {line}
        </span>
      </div>
    </ArtPanel>
  );
}

export interface PaysTilesProps {
  event: EventPageView;
  /** Every party's short name (*against the Vanguard*). */
  names: Partial<Record<FactionId, string>>;
}

/** *What it can pay* (screens §3.1 item 2): four tiles, two by two, and the tag row under them. */
export function PaysTiles({ event: e, names }: PaysTilesProps) {
  const t = copy.together.event;
  const max = e.pays.opinionUpTo.toFixed(1);
  const opinion = e.pays.againstFactionId
    ? t.opinionAgainst(max, names[e.pays.againstFactionId] ?? e.pays.againstFactionId)
    : t.opinionUpTo(max);
  const tiles: Array<[string, string, string]> = [
    ['opinion', t.tiles.opinion, opinion],
    ['fxp', t.tiles.fxp, t.fxpTile],
    ['pc', t.tiles.pc, t.pcTile],
    ['paper', t.tiles.paper, t.paperTile],
  ];
  const tags = [
    ...e.tags.map(eventTagText).filter((x): x is string => !!x),
    ...(e.firedUp ? [copy.together.card.tags.firedUp] : []),
  ];
  return (
    <section aria-label={t.pays} className="flex flex-col gap-1.5" data-testid="event-pays">
      <h2 className="label-caps text-[11px] font-semibold text-muted">{t.pays}</h2>
      <div className="grid grid-cols-2 gap-px border border-ink bg-ink">
        {tiles.map(([id, label, value]) => (
          <div key={id} className="flex flex-col gap-0.5 bg-paper-card px-2.5 py-2" data-testid={`event-tile-${id}`}>
            <span className="label-caps text-[10px] text-muted">{label}</span>
            <span className="font-body text-[13px] leading-snug">{value}</span>
          </div>
        ))}
      </div>
      {tags.length > 0 && (
        <span className="label-caps text-[10px] text-petrol" data-testid="event-tags">
          {tags.join(' · ')}
        </span>
      )}
    </section>
  );
}

export interface RoleRowProps {
  role: EventRoleView;
  factionId: FactionId;
  ladder: readonly string[];
  selected?: boolean;
  /** An open role the member may take: the row selects (the button spends). */
  onSelect?: () => void;
  /** After the start: the role's result at the right. */
  resolved?: boolean;
}

/**
 * `RoleRow` (screens §3.1 item 4): a `StoryScreen` row, 56 px min: the holder's face (or *?*), the
 * role's name, the holder's line or the member's own odds word (faction colour) or the gate; the hint
 * under open rows; a tick when filled; tapping an open row selects it (the row inverts).
 */
export function RoleRow({ role: r, factionId, ladder, selected = false, onSelect, resolved = false }: RoleRowProps) {
  const open = !r.holder;
  const odds = roleOdds(r);
  const selectable = open && !r.gate && !!r.forYou && !!onSelect && !resolved;
  let sub: ReactNode;
  if (r.holder)
    sub = (
      <span className="font-mono text-[11px] text-text-2" data-testid="role-holder">
        {r.stats[0] === 'best' ? r.holder.name : copy.together.event.holderLine(r.holder.name, roleStats(r))}
        {r.holder.you ? ` · ${copy.together.result.you}` : ''}
      </span>
    );
  else if (resolved)
    sub = <span className="font-mono text-[11px] text-muted">{copy.together.event.volunteerHalf}</span>;
  else if (r.gate)
    sub = (
      <span className="font-mono text-[11px] text-muted" data-testid="role-gate">
        {roleGateText(r.gate, ladder)}
      </span>
    );
  else if (odds)
    sub = (
      <span
        className={cx('font-mono text-[11px]', selected ? 'text-paper' : FACTION_STYLE[factionId].text)}
        data-testid="role-odds"
      >
        {odds}
      </span>
    );
  else sub = <span className="font-mono text-[11px] text-muted">{copy.together.event.open}</span>;
  const body = (
    <>
      <Face avatarId={r.holder?.avatarId ?? null} size={36} open={open} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-display text-[16px] leading-tight font-bold">
          {r.name}
          {!resolved && <span className="font-mono text-[11px] font-normal text-muted"> · {r.energy} Energy</span>}
        </span>
        {sub}
        {open && !resolved && r.hint && (
          <span className={cx('font-body text-[13px] leading-snug italic', selected ? 'text-paper-2' : 'text-text-2')}>
            {r.hint}
          </span>
        )}
      </span>
      {resolved && r.result ? (
        <span
          className={cx('label-caps shrink-0 text-[12px] font-semibold', OUTCOME_TONE[r.result.outcome])}
          data-testid="role-result"
        >
          {OUTCOME_WORD[r.result.outcome]}
        </span>
      ) : (
        r.holder && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M5 12l5 5 9-10" />
          </svg>
        )
      )}
    </>
  );
  const cls = cx(
    'flex min-h-14 w-full items-center gap-3 border-b border-dotted border-faint px-2 py-2 text-left',
    selected && 'bg-ink text-paper',
  );
  return selectable ? (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(cls, 'cursor-pointer hover:bg-paper-2', selected && 'hover:bg-ink')}
      data-testid="role-row"
      data-role-id={r.roleId}
    >
      {body}
    </button>
  ) : (
    <div className={cls} data-testid="role-row" data-role-id={r.roleId}>
      {body}
    </div>
  );
}

export interface HandsRowProps {
  hands: EventPageView['hands'];
  ladder: readonly string[];
  selected?: boolean;
  /** Null: no place for this member (or already on the event). */
  onSelect?: (() => void) | null;
  resolved?: boolean;
}

/** `HandsRow` (screens §3.1 item 5): *Hands · {k} of 4*, the faces at 28 px, then a dashed circle. */
export function HandsRow({ hands: h, ladder, selected = false, onSelect, resolved = false }: HandsRowProps) {
  const k = h.holders.length;
  const body = (
    <>
      <span className="flex shrink-0 items-center -space-x-1.5">
        {h.holders.map((x) => (
          <Face key={x.characterId} avatarId={x.avatarId} size={28} />
        ))}
        {k < h.max && <Face avatarId={null} size={28} open />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-display text-[16px] leading-tight font-bold">{copy.together.event.hands(k)}</span>
        <span className={cx('font-mono text-[11px]', selected ? 'text-paper-2' : 'text-text-2')}>
          {h.holders.length > 0 ? `${h.holders.map((x) => x.name).join(', ')} · ` : ''}
          {copy.together.event.handsLine}
        </span>
        {h.gate && !resolved && h.gate.reason !== 'ALREADY_ON_EVENT' && (
          <span className="font-mono text-[11px] text-muted" data-testid="hands-gate">
            {roleGateText(h.gate, ladder)}
          </span>
        )}
      </span>
    </>
  );
  const cls = cx(
    'flex min-h-14 w-full items-center gap-3 border-b border-dotted border-faint px-2 py-2 text-left',
    selected && 'bg-ink text-paper',
  );
  return onSelect && !resolved ? (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cx(cls, 'cursor-pointer hover:bg-paper-2', selected && 'hover:bg-ink')}
      data-testid="hands-row"
    >
      {body}
    </button>
  ) : (
    <div className={cls} data-testid="hands-row">
      {body}
    </div>
  );
}

/** The roles' kicker with its help note (*Campaign event*). */
export function RolesKicker({ filled, n }: { filled: number; n: number }) {
  return (
    <div className="flex items-baseline justify-between border-b-[3px] border-double border-ink pb-1">
      <h2 className="label-caps text-[11px] font-semibold" data-testid="roles-kicker">
        {copy.together.event.rolesKicker(filled, n)}
      </h2>
      <span className="font-mono text-[11px] text-muted">{copy.together.event.everyRoleMatters}</span>
    </div>
  );
}

/** The Courier paragraph (screens §3.1 item 6), with the *volunteers* help note. */
export function VolunteersNote() {
  return (
    <div className="flex flex-col gap-1">
      <HelpButton
        notes={[copy.together.help.volunteers() as HelpNote]}
        label={copy.together.help.volunteers()[0] ?? ''}
        testId="volunteers-help"
        className={cx('self-start font-mono text-[11px] text-muted', helpMark)}
      >
        {copy.together.help.volunteers()[0]}
      </HelpButton>
      <p className="font-mono text-[11px] leading-snug text-muted" data-testid="volunteers-note">
        {copy.together.event.volunteersLine}
      </p>
    </div>
  );
}
