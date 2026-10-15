/**
 * Slice 6: presence (docs/tech/slice-6.md §6.3; design §7; ADR 0040). *Here now* is seen in the last
 * ten minutes; own faction by name, the others as a count; a visitor on rival ground is invisible to
 * all but their own faction. Pure.
 */
import { PRESENCE } from './constants';
import { dayKey } from './day';
import type { HeldKind } from './held';
import type { FactionId } from './types';

export type PresenceBand = 'hereNow' | 'online' | 'today' | 'thisWeek' | 'away';
export const PRESENCE_BANDS = ['hereNow', 'online', 'today', 'thisWeek', 'away'] as const;

const WEEK_MS = 7 * 86_400_000;

/** < 10 min: here now (same city) or online; the same City Day: today; < 7 days: this week; else away. */
export function presenceBand(seenAt: number | null, now: number, sameCity: boolean): PresenceBand {
  if (seenAt === null) return 'away';
  const ago = now - seenAt;
  if (ago < PRESENCE.hereNowMs) return sameCity ? 'hereNow' : 'online';
  if (dayKey(seenAt) === dayKey(now)) return 'today';
  if (ago < WEEK_MS) return 'thisWeek';
  return 'away';
}

/** Whether someone seen at `seenAt` counts as present now (strictly under ten minutes ago). */
export const isHereNow = (seenAt: number | null, now: number): boolean =>
  seenAt !== null && now - seenAt < PRESENCE.hereNowMs;

/**
 * Design §7: may `viewer` see (by name or in a count) a member of faction `x` at a place whose home
 * faction is `placeHomeFactionId` (null in the capital)? Own faction always; otherwise only where the
 * place is nobody's home or is x's own home (a visitor on rival ground is invisible).
 */
export function visibleTo(viewer: FactionId, x: FactionId, placeHomeFactionId: FactionId | null): boolean {
  if (viewer === x) return true;
  return placeHomeFactionId === null || placeHomeFactionId === x;
}

/** *You and Anna Reyes, Tomas Vey and 3 more · 2 others*: two names, then a count. */
export function hereNowLine(i: {
  me: string;
  mine: ReadonlyArray<{ id: string; name: string }>;
  others: number;
}): { names: Array<{ id: string; name: string }>; more: number; others: number; nobody: boolean } {
  const mates = i.mine.filter((m) => m.id !== i.me);
  const names = mates.slice(0, PRESENCE.namesShown).map((m) => ({ ...m }));
  const more = Math.max(0, mates.length - names.length);
  return { names, more, others: i.others, nobody: mates.length === 0 && i.others === 0 };
}

export type MemberStatus =
  | { kind: HeldKind; placeName: string; minutes: number }
  | { kind: 'train'; to: string; minutes: number; deported: boolean }
  | { kind: 'rivalGround'; cityName: string }
  | null;

const minutesUntil = (until: number, now: number): number => Math.max(1, Math.ceil((until - now) / 60_000));

/**
 * Design §6.3, review 4 (`copy.when` words the minutes): the Members row's status. Projects slice
 * 5's lazy release: `until ≤ now` reads as out, or as on the train home after a rival-ground arrest.
 * A pending patrol card shows nothing (review 5).
 */
export function memberStatus(i: {
  held: {
    kind: HeldKind;
    state: 'in' | 'out';
    until: number;
    rivalGround: boolean;
    placeName: string;
    homeCityId?: string;
    homeCityName?: string;
  } | null;
  journey: { toName: string; arrivesAt: number; deported?: boolean } | null;
  cityId: string;
  cityName: string;
  homeCityOf: (cityId: string) => FactionId | null;
  factionId: FactionId;
  now: number;
  /** The deportation's minutes from the arrest's city to the member's home (rival ground only). */
  deportationMinutes?: (from: string, to: string) => number;
}): MemberStatus {
  const h = i.held;
  if (h && h.state === 'in') {
    if (h.until > i.now) return { kind: h.kind, placeName: h.placeName, minutes: minutesUntil(h.until, i.now) };
    // Released on read as of `until`; a rival-ground arrest goes home by train from then.
    if (h.kind === 'cells' && h.rivalGround && h.homeCityId && i.deportationMinutes) {
      const arrives = h.until + i.deportationMinutes(i.cityId, h.homeCityId) * 60_000;
      if (arrives > i.now)
        return {
          kind: 'train',
          to: h.homeCityName ?? h.homeCityId,
          minutes: minutesUntil(arrives, i.now),
          deported: true,
        };
      return null;
    }
  }
  if (i.journey && i.journey.arrivesAt > i.now)
    return {
      kind: 'train',
      to: i.journey.toName,
      minutes: minutesUntil(i.journey.arrivesAt, i.now),
      deported: i.journey.deported ?? false,
    };
  const home = i.homeCityOf(i.cityId);
  if (home !== null && home !== i.factionId) return { kind: 'rivalGround', cityName: i.cityName };
  return null;
}
