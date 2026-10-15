import { copy } from '@irongate/content/copy';
import type { FactionId, FactionScoreboardView, MemberRowView, ProfileView } from '@irongate/rules';
import { useEffect } from 'react';
import { FACTION_STYLE } from './FactionCrest';
import { Button } from './Button';
import { Chip } from './Chip';
import { Rosette } from './Capital';
import { BottomSheet } from './Sheets';
import { artUrl } from './Picture';
import { cx, formatClock } from '../format';

/**
 * Slice 6 (screens §2.3, §2.4, §7.1; tech design §12.2): the Faction tab's Members rows, the public
 * profile sheet, the favour sheet (bail and the visit) and the faction scoreboard. Plain props; the
 * client fetches and decides nothing (the server's views carry the favours, the asks and the brackets).
 */

const t = copy.together;

/** A member's face at a small size (the 128 px avatar), ringed in the faction's colour. */
export function MemberFace({
  avatarId,
  size,
  factionId,
  className,
}: {
  avatarId: string | null;
  size: number;
  factionId?: FactionId;
  className?: string;
}) {
  const width = size > 64 ? 256 : 128;
  return (
    <span
      className={cx('inline-block shrink-0 overflow-hidden rounded-full border border-ink bg-paper-2', className)}
      style={{
        width: size,
        height: size,
        ...(factionId ? { boxShadow: `0 0 0 2px ${FACTION_STYLE[factionId].color}` } : {}),
      }}
      aria-hidden="true"
    >
      {avatarId && (
        <picture className="contents">
          <source type="image/avif" srcSet={artUrl(avatarId, width, 'avif')} />
          <img
            src={artUrl(avatarId, width, 'webp')}
            alt=""
            draggable={false}
            loading="lazy"
            decoding="async"
            className="size-full object-cover object-top"
          />
        </picture>
      )}
    </span>
  );
}

/** *in 24 min* from the server's minutes (review 4's countdown style). */
const outIn = (minutes: number, now: number) => copy.when(now + minutes * 60_000, now);

/**
 * `MemberStatus` (screens §2.3, review 4 addendum): the state that matters (the failure colour), or
 * the band. `hereCity`: the viewer's city (*here now · Coalport*).
 */
export function memberStatusText(
  row: Pick<MemberRowView, 'status' | 'band' | 'residence'>,
  now: number,
  hereCity: string,
): { text: string; alert: boolean } {
  const s = row.status;
  if (s) {
    if (s.kind === 'cells' && 'placeName' in s) return { text: t.members.status.cells(s.placeName, outIn(s.minutes, now)), alert: true };
    if (s.kind === 'infirmary' && 'minutes' in s) return { text: t.members.status.infirmary(outIn(s.minutes, now)), alert: true };
    if (s.kind === 'train') return { text: t.members.status.train(s.to, outIn(s.minutes, now)), alert: true };
    if (s.kind === 'rivalGround') return { text: t.members.status.rivalGround(s.cityName), alert: true };
  }
  const place = row.residence.districtName
    ? `${row.residence.districtName}, ${row.residence.cityName}`
    : row.residence.cityName;
  switch (row.band) {
    case 'hereNow':
      return { text: t.members.band.hereNow(hereCity), alert: false };
    case 'online':
      return { text: t.members.band.online(place), alert: false };
    case 'today':
      return { text: t.members.band.today, alert: false };
    case 'thisWeek':
      return { text: t.members.band.thisWeek, alert: false };
    default:
      return { text: t.members.band.away, alert: false };
  }
}

/** The favour button's words (*Post bail · 150 Iron* / *Visit · 3 Energy*, then *Posted* / *Visited*). */
export function favourLabel(f: NonNullable<MemberRowView['favour']>, done: boolean): string {
  if (f.kind === 'bail') return done ? t.favours.posted : t.favours.postBail(f.iron);
  return done || f.visited ? t.favours.visited : t.favours.visit;
}

/** The invite's words (review 7 #3, design §23.2): *Invite to the rally · 19:40*, the card's time phrase. */
export function inviteLabel(ask: NonNullable<MemberRowView['ask']>): string {
  return t.members.invite(ask.eventName, formatClock(ask.startsAt));
}

/**
 * A one-line toast (the invite's result, design §23.2: no modal, the cheapest social tap). It sits
 * above the tab bar and goes after a few seconds.
 */
export function Toast({ text, onDone, ms = 4000 }: { text: string | null; onDone: () => void; ms?: number }) {
  useEffect(() => {
    if (!text) return;
    const id = window.setTimeout(onDone, ms);
    return () => window.clearTimeout(id);
  }, [text, onDone, ms]);
  if (!text) return null;
  return (
    <p
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-[420px] border-[1.5px] border-ink bg-ink px-3 py-2 font-mono text-[12px] text-paper shadow-[0_10px_30px_rgb(0_0_0/0.45)]"
      data-testid="toast"
    >
      {text}
    </p>
  );
}

export interface MemberRowProps {
  row: MemberRowView;
  now: number;
  /** The viewer's city, for *here now · {city}*. */
  hereCity: string;
  factionId: FactionId;
  onOpen: (row: MemberRowView) => void;
  onFavour?: (row: MemberRowView) => void;
  onAsk?: (row: MemberRowView) => void;
  /** This session's taps: the favour done, the ask sent. */
  favourDone?: boolean;
  asked?: boolean;
  askPending?: boolean;
}

/**
 * `MemberRow` (screens §2.3): the avatar with the faction's ring, the name, *Organiser · Level 12*,
 * the status line, a hero's rosette, and at the right the favour (*Post bail*, *Visit*), the invite
 * (*Invite to the rally · 19:40*, then *Invited to the rally* as plain text; review 7 #3) or the week's
 * figure. The row opens the profile; the right-hand button is its own.
 */
export function MemberRow({
  row,
  now,
  hereCity,
  factionId,
  onOpen,
  onFavour,
  onAsk,
  favourDone = false,
  asked = false,
  askPending = false,
}: MemberRowProps) {
  const status = memberStatusText(row, now, hereCity);
  const favour = row.favour;
  const ask = row.ask;
  return (
    <li
      className={cx('flex min-h-16 items-center gap-2 border-b border-dotted border-faint', row.you && 'bg-paper-2')}
      data-testid="member-row"
      data-member={row.name}
      data-status={row.status?.kind ?? row.band}
      data-band={row.band}
    >
      <button
        type="button"
        onClick={() => onOpen(row)}
        className="flex min-h-16 min-w-0 flex-1 cursor-pointer items-center gap-3 px-1 py-2 text-left hover:bg-paper-card focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-petrol"
      >
        <MemberFace avatarId={row.avatarId} size={40} factionId={factionId} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="truncate font-body text-[15px] font-semibold">{row.name}</span>
            <span className="font-mono text-[11px] text-muted">{t.members.rankLevel(row.rankTitle, row.level)}</span>
            {row.you && <span className="label-caps text-[10px] text-petrol">{t.scoreboard.you}</span>}
          </span>
          <span
            className={cx('font-mono text-[11px] leading-snug', status.alert ? 'text-failure' : row.band === 'hereNow' ? 'text-ink' : 'text-muted')}
            data-testid="member-status"
          >
            {status.text}
          </span>
          {row.heroes.length > 0 && (
            <span className="flex items-center gap-1 font-mono text-[11px] text-text-2">
              <Rosette size={11} />
              {row.heroes.join(' · ')}
            </span>
          )}
        </span>
      </button>
      <span className="flex w-[148px] shrink-0 justify-end pr-1">
        {favour && onFavour ? (
          <Button
            variant="outline"
            className="px-2 text-[12px] whitespace-nowrap"
            disabled={favourDone || (favour.kind === 'visit' && favour.visited)}
            onClick={() => onFavour(row)}
            data-testid="member-favour"
          >
            {favourLabel(favour, favourDone)}
          </Button>
        ) : ask && (asked || ask.asked) ? (
          <span className="px-2 text-right font-mono text-[11px] leading-snug text-muted" data-testid="member-invited">
            {t.members.invited(ask.eventName)}
          </span>
        ) : ask && onAsk ? (
          <button
            type="button"
            className="label-caps min-h-11 cursor-pointer px-2 text-right text-[12px] leading-tight text-petrol underline underline-offset-2 disabled:cursor-default disabled:text-muted disabled:no-underline"
            disabled={askPending}
            aria-busy={askPending || undefined}
            onClick={() => onAsk(row)}
            data-testid="member-ask"
          >
            {inviteLabel(ask)}
          </button>
        ) : row.movedThisWeek > 0 ? (
          <span className="font-mono text-[11px] text-muted">{t.members.movedThisWeek(row.movedThisWeek.toFixed(1))}</span>
        ) : null}
      </span>
    </li>
  );
}

/** *14 October* (the member-since date, in the player's clock). */
const dayMonth = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

export interface ProfileSheetProps {
  profile: ProfileView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  factionId: FactionId;
  factionName: string;
  hereCity: string;
  now: number;
  onMessage: (p: ProfileView) => void;
  onFavour: (p: ProfileView) => void;
  onAsk: (p: ProfileView) => void;
  onMute: (p: ProfileView, muted: boolean) => void;
  mutePending?: boolean;
  asked?: boolean;
  askPending?: boolean;
  favourDone?: boolean;
  loading?: boolean;
}

/**
 * `ProfileSheet` (screens §2.3; design §7.3): the avatar at 96 px, the name, *{faction} · {rank} ·
 * Level n*, where they live, member since, heroes, Reputation here, the status; *Message*, the favour
 * when it applies, and *Mute* / *Unmute* at the foot. Nothing private: no record, Heat, Health, Iron
 * or stats (the view carries none).
 */
export function ProfileSheet({
  profile: p,
  open,
  onOpenChange,
  factionId,
  factionName,
  hereCity,
  now,
  onMessage,
  onFavour,
  onAsk,
  onMute,
  mutePending,
  asked,
  askPending,
  favourDone,
  loading,
}: ProfileSheetProps) {
  const status = p ? memberStatusText(p, now, hereCity) : null;
  const place = p
    ? p.residence.districtName
      ? `${p.residence.districtName}, ${p.residence.cityName}`
      : p.residence.cityName
    : '';
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={p?.name ?? '…'}>
      {!p ? (
        <p className="font-mono text-[12px] text-muted" role="status">
          {loading ? '…' : ''}
        </p>
      ) : (
        <div className="flex flex-col gap-3" data-testid="profile-sheet">
          <div className="flex items-center gap-4">
            <MemberFace avatarId={p.avatarId} size={96} factionId={factionId} />
            <p className="font-mono text-[12px] leading-snug text-text-2">{t.profile.line(factionName, p.rankTitle, p.level)}</p>
          </div>
          <dl className="flex flex-col font-body text-[14px]">
            <Row>{t.profile.livesIn(place)}</Row>
            <Row>{t.profile.memberSince(dayMonth(p.memberSince))}</Row>
            <Row>{p.heroes.length ? t.profile.heroes(p.heroes.join(', ')) : t.profile.noHeroes}</Row>
            {p.standingHere && <Row>{t.profile.reputationHere(p.standingHere.level)}</Row>}
            {status && (
              <Row>
                <span className={cx('font-mono text-[12px]', status.alert ? 'text-failure' : 'text-muted')} data-testid="profile-status">
                  {status.text}
                </span>
              </Row>
            )}
          </dl>
          {!p.you && (
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" className="flex-1" onClick={() => onMessage(p)} data-testid="profile-message">
                {t.profile.message}
              </Button>
              {p.favour && (
                <Button
                  variant="outline"
                  className="flex-1 whitespace-nowrap"
                  disabled={favourDone || (p.favour.kind === 'visit' && p.favour.visited)}
                  onClick={() => onFavour(p)}
                  data-testid="profile-favour"
                >
                  {favourLabel(p.favour, !!favourDone)}
                </Button>
              )}
              {!p.favour && p.ask && (asked || p.ask.asked) ? (
                <span className="flex min-h-11 flex-1 items-center justify-center font-mono text-[12px] text-muted" data-testid="profile-invited">
                  {t.members.invited(p.ask.eventName)}
                </span>
              ) : !p.favour && p.ask ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  pending={askPending}
                  onClick={() => onAsk(p)}
                  data-testid="profile-ask"
                >
                  {inviteLabel(p.ask)}
                </Button>
              ) : null}
            </div>
          )}
          {!p.you && (
            <button
              type="button"
              className="label-caps min-h-11 cursor-pointer self-start text-[12px] text-muted underline underline-offset-2 disabled:cursor-default"
              disabled={mutePending}
              aria-busy={mutePending || undefined}
              onClick={() => onMute(p, !p.muted)}
              data-testid="profile-mute"
            >
              {p.muted ? t.profile.unmute : t.profile.mute}
            </button>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <dd className="flex min-h-9 items-center border-b border-dotted border-faint">{children}</dd>;
}

export interface FavourSheetProps {
  /** The mate (a Members row or a profile); null while it loads. */
  mate: MemberRowView | null;
  kind: 'bail' | 'visit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  pending?: boolean;
  /** A refusal, worded. */
  notice?: string | null;
  /** The viewer's party is the Alliance: *Legal Aid · the Alliance pays half your bail*. */
  legalAid?: boolean;
  /** The viewer stands on rival ground (a visit is refused there). */
  rivalGround?: boolean;
}

/**
 * `FavourSheet` (screens §7.1): the kicker *Post bail* / *A visit*, the mate's face and name, one body
 * line, the Courier guard when one applies, and one button. The server decides; a stale row reads
 * *Already out*.
 */
export function FavourSheet({
  mate,
  kind,
  open,
  onOpenChange,
  onConfirm,
  pending,
  notice,
  legalAid,
  rivalGround,
}: FavourSheetProps) {
  const s = mate?.status ?? null;
  const live = kind === 'bail' ? s?.kind === 'cells' : s?.kind === 'infirmary';
  const f = mate?.favour ?? null;
  const iron = f?.kind === 'bail' ? f.iron : 0;
  const body =
    mate && s && live && 'placeName' in s
      ? kind === 'bail'
        ? t.favours.bailBody(mate.name, s.placeName, copy.count(s.minutes), iron)
        : t.favours.visitBody(mate.name, copy.count(s.minutes))
      : null;
  const guard = !mate
    ? null
    : !live || !f
      ? t.favours.guards.alreadyOut
      : kind === 'visit' && rivalGround
        ? t.favours.guards.notFromRivalGround
        : f.kind === 'visit' && f.visited
          ? t.favours.guards.visited
          : !f.affordable
            ? f.kind === 'bail'
              ? t.favours.guards.needsIron(f.iron)
              : t.favours.guards.needsEnergy
            : kind === 'bail' && legalAid
              ? t.favours.guards.legalAid
              : null;
  const blocked = !mate || !live || !f || (f.kind === 'visit' && f.visited) || !f.affordable || (kind === 'visit' && !!rivalGround);
  const label = kind === 'bail' ? t.favours.postBail(iron) : t.favours.visit;
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={kind === 'bail' ? t.favours.bailKicker : t.favours.visitKicker}>
      <div className="flex flex-col gap-3" data-testid="favour-sheet" data-kind={kind}>
        {mate && (
          <div className="flex items-center gap-3">
            <MemberFace avatarId={mate.avatarId} size={48} />
            <span className="font-display text-[18px] font-bold">{mate.name}</span>
          </div>
        )}
        {body && <p className="font-body text-[14.5px] leading-normal text-text-2">{body}</p>}
        {guard && (
          <p className="font-mono text-[12px] text-muted" data-testid="favour-guard">
            {guard}
          </p>
        )}
        {notice && (
          <p className="font-mono text-[12px] text-failure" role="alert">
            {notice}
          </p>
        )}
        <Button
          className="w-full whitespace-nowrap"
          disabled={blocked}
          pending={pending}
          onClick={onConfirm}
          data-testid="favour-confirm"
        >
          {label}
        </Button>
      </div>
    </BottomSheet>
  );
}

export interface FactionScoreboardProps {
  view: FactionScoreboardView;
  factionName: string;
  onPeriod: (period: 'week' | 'all') => void;
  onCity: (cityId: string | null) => void;
  onOpen: (characterId: string) => void;
}

/**
 * The faction scoreboard (screens §2.4; design §6.4): *This week* · *All time*, the city chips, then
 * per Level bracket the top ten (the top three with the rosette), the member's own row highlighted and
 * shown below the ten when outside them; tapping a row opens the profile.
 */
export function FactionScoreboard({ view, factionName, onPeriod, onCity, onOpen }: FactionScoreboardProps) {
  const period = view.period === 'week' ? t.scoreboard.thisWeek : t.scoreboard.allTime;
  const empty = view.brackets.every((b) => b.rows.length === 0);
  return (
    <section className="flex flex-col gap-3" data-testid="faction-scoreboard-table" data-period={view.period}>
      <div className="flex gap-2">
        <Chip on={view.period === 'week'} onClick={() => onPeriod('week')} testId="scoreboard-week">
          {t.scoreboard.thisWeek}
        </Chip>
        <Chip on={view.period === 'all'} onClick={() => onPeriod('all')} testId="scoreboard-all">
          {t.scoreboard.allTime}
        </Chip>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label={t.scoreboard.allCities}>
        <Chip on={view.cityId === null} onClick={() => onCity(null)} testId="scoreboard-city">
          {t.scoreboard.allCities}
        </Chip>
        {view.cities.map((c) => (
          <Chip key={c.id} on={view.cityId === c.id} onClick={() => onCity(c.id)} testId="scoreboard-city">
            {c.name}
          </Chip>
        ))}
      </div>
      <h3 className="label-caps border-t-[3px] border-b border-double border-ink py-1 text-[10px] font-semibold">
        {t.scoreboard.kicker(factionName, period)}
      </h3>
      {empty ? (
        <p className="font-body text-[14px] text-text-2 italic" data-testid="scoreboard-empty">
          {t.scoreboard.empty}
        </p>
      ) : (
        <table className="w-full border-collapse font-label text-[13px]">
          <thead>
            <tr className="label-caps border-b border-ink text-[10px] text-muted">
              {t.scoreboard.columns.map((c, i) => (
                <th key={c} scope="col" className={cx('py-1 font-normal', i >= 2 ? 'text-right' : 'text-left')}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          {view.brackets.map((b) => {
            const youBelow = view.you && view.you.bracket === b.bracket && !b.rows.some((r) => r.you) ? view.you : null;
            if (b.rows.length === 0 && !youBelow) return null;
            return (
              <tbody key={b.bracket} className="border-b border-ink">
                <tr>
                  <td colSpan={5} className="pt-1 text-right font-mono text-[10.5px] text-muted">
                    {copy.scoreboard.brackets[b.bracket - 1]}
                  </td>
                </tr>
                {b.rows.map((r, i) => (
                  <tr
                    key={r.characterId}
                    className={cx('cursor-pointer border-b border-dotted border-faint hover:bg-paper-card', r.you && 'bg-paper-2')}
                    data-testid="faction-scoreboard-row"
                    data-you={r.you || undefined}
                    onClick={() => onOpen(r.characterId)}
                  >
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2 font-body">
                      <button
                        type="button"
                        className="flex min-h-7 cursor-pointer items-center gap-1 text-left"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen(r.characterId);
                        }}
                      >
                        {r.rosette && <Rosette size={12} />}
                        {r.name}
                        {r.you && <span className="font-mono text-[10.5px] text-muted">{t.scoreboard.you}</span>}
                      </button>
                    </td>
                    <td className="py-2 text-right">{r.level}</td>
                    <td className="py-2 text-right">{r.moved.toFixed(1)}</td>
                    <td className="py-2 text-right">{r.events}</td>
                  </tr>
                ))}
                {youBelow && (
                  <tr className="bg-paper-2" data-testid="faction-scoreboard-row" data-you="true" data-below="true">
                    <td className="py-2">{youBelow.rank}</td>
                    <td className="py-2 font-body">
                      <span className="font-mono text-[10.5px] text-muted">{t.scoreboard.you}</span>
                    </td>
                    <td className="py-2 text-right" />
                    <td className="py-2 text-right">{youBelow.moved.toFixed(1)}</td>
                    <td className="py-2 text-right">{youBelow.events}</td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      )}
      <p className="font-mono text-[11px] leading-snug text-muted">{t.scoreboard.note}</p>
    </section>
  );
}
