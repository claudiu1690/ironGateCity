import { nextNominationsAfter, nextPollsFrom } from './calendar';
import { RESIDENCE, ROOM } from './constants';
import type { DayKey } from './day';
import { priceLines, priceWith } from './ordinances';
import type { Modifiers, PriceLine } from './ordinances';
import type { GameErrorReason, ResidenceCtx } from './types';

/**
 * Residence (slice-4 tech design §6.7, design §7, GDD §14.11, ADR 0026): the windows stored at a
 * move, the refusals of a registration and the room's price.
 */

/**
 * ADR 0026 §3: from the target city's calendar: the vote from the first polls opening after the
 * registration (registered on cycle day 0 or 1: this cycle; days 2–4: the next), standing from the
 * next nominations, and the next move seven days on.
 */
export function moveWindows(
  today: DayKey,
  offset: number,
): { votesFromDay: DayKey; standsFromDay: DayKey; canMoveFromDay: DayKey } {
  return {
    votesFromDay: nextPollsFrom(today + 1, offset),
    standsFromDay: nextNominationsAfter(today, offset),
    canMoveFromDay: today + RESIDENCE.cooldownDays,
  };
}

/**
 * Tech design §8.1: why a registration is refused, in this order, or null. A target must be the
 * capital or the player's own home; the player stands in the target city, not on a train.
 */
export function registerRefusal(i: {
  rank: number;
  iron: number;
  cost: number;
  today: DayKey;
  canMoveFromDay: DayKey;
  /** The city the character stands in. */
  here: string;
  target: ResidenceCtx;
  residence: ResidenceCtx;
  /** The faction's home city (the way back). */
  homeCityId: string;
  capitalId: string;
  inTransit: boolean;
  /**
   * Slice-4 fixes §1 (QA M2): the member's name is on a ballot (polls open) where they live; they
   * can move after the result. After the cooldown, before the Iron.
   */
  onBallot?: boolean;
}): GameErrorReason | null {
  if (i.inTransit) return 'IN_TRANSIT';
  if (i.target.cityId !== i.capitalId && i.target.cityId !== i.homeCityId) return 'DESTINATION_LOCKED';
  if (i.here !== i.target.cityId) return 'NOT_IN_CITY';
  if (i.rank < RESIDENCE.rank) return 'RANK_TOO_LOW';
  if (i.today < i.canMoveFromDay) return 'MOVE_COOLDOWN';
  if (i.residence.cityId === i.target.cityId && i.residence.districtId === i.target.districtId)
    return 'ALREADY_RESIDENT';
  if (i.onBallot) return 'ON_BALLOT';
  if (i.iron < i.cost) return 'NOT_ENOUGH_IRON';
  return null;
}

/** Design §7.4: 100 Iron, each `roomPct` source a line (Eviction Notices: 50). */
export function roomPrice(m?: Modifiers): { base: number; lines: PriceLine[]; total: number } {
  const lines = priceLines(m, 'roomPct');
  return { base: ROOM.cost, lines, total: priceWith(ROOM.cost, lines) };
}

/**
 * Slice-4 fixes §6 (QA m5): what a tap on the room buys. No room running: seven nights from today.
 * A room running with seven or fewer nights left: seven more nights at its end (it never restarts).
 * More than seven left: nothing (`paidAhead`, renew from the day seven remain), so at most fourteen
 * nights are ever paid for.
 */
export function roomTap(
  room: { fromDay: DayKey; untilDay: DayKey } | null | undefined,
  today: DayKey,
):
  | { kind: 'take' | 'renew'; fromDay: DayKey; untilDay: DayKey }
  | { kind: 'paidAhead'; renewFromDay: DayKey } {
  const running = !!room && room.fromDay <= today && today < room.untilDay;
  if (!running) return { kind: 'take', fromDay: today, untilDay: today + ROOM.days };
  if (room.untilDay - today > ROOM.days) return { kind: 'paidAhead', renewFromDay: room.untilDay - ROOM.days };
  return { kind: 'renew', fromDay: room.fromDay, untilDay: room.untilDay + ROOM.days };
}
