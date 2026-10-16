import { FLAT, ROOM_REST } from './constants';
import type { DayKey } from './day';

/**
 * A home (design docs/design/slice-8-life.md §6; GDD §17.4; ADR 0056). The rented room is the absence
 * of a flat. The flat's rent is a day key: every bonus is a pure function of the day, so a lapse
 * needs no write, and the flat waits; nothing is ever taken away (no arrears).
 */

export interface Flat {
  cityId: string;
  boughtDay: DayKey;
  /** Inclusive. */
  paidThroughDay: DayKey;
}

export const flatPaidOn = (f: Flat | null, day: DayKey): boolean => !!f && day <= f.paidThroughDay;

/** §21.1 Q6: every bonus needs the flat's city to be the residence. */
export const flatCounts = (f: Flat | null, residenceCityId: string, day: DayKey): boolean =>
  flatPaidOn(f, day) && f!.cityId === residenceCityId;

/** Design §6: +2 worn Charisma while standing in the city of a counting flat. */
export const flatCha = (f: Flat | null, residenceCityId: string, standingIn: string, day: DayKey): number =>
  flatCounts(f, residenceCityId, day) && standingIn === f!.cityId ? FLAT.cha : 0;

/** Design §6: Rested at the boundary into `boundaryDay`: the flat's 25 if it counted the night before, else the room's 10. */
export const restAtBoundary = (f: Flat | null, residenceCityId: string, boundaryDay: DayKey): number =>
  flatCounts(f, residenceCityId, boundaryDay - 1) ? FLAT.rest : ROOM_REST;

/** The desk's row: *paid until Thursday* · due today · waiting. */
export const flatState = (f: Flat, today: DayKey): 'paid' | 'due' | 'waiting' =>
  f.paidThroughDay > today ? 'paid' : f.paidThroughDay === today ? 'due' : 'waiting';

/** Design §6: a lapsed flat pays from today (no arrears). */
export const payRent = (f: Flat, today: DayKey, weeks: number): Flat => ({
  ...f,
  paidThroughDay: Math.max(f.paidThroughDay, today - 1) + 7 * weeks,
});

export const rentPrice = (weeks: number): number => FLAT.week * weeks;

export type FlatRefusal = 'FLAT_LEVEL' | 'NOT_IN_RESIDENCE_CITY' | 'FLAT_OWNED' | 'NOT_ENOUGH_IRON';

/** Design §6 (§21.1 Q5): Level 10, standing in the residence city, no flat yet, 2,500 Iron. */
export function buyFlatGate(i: {
  level: number;
  inResidenceCity: boolean;
  flat: Flat | null;
  iron: number;
}): null | { reason: FlatRefusal; need?: number } {
  if (i.level < FLAT.level) return { reason: 'FLAT_LEVEL', need: FLAT.level };
  if (i.flat) return { reason: 'FLAT_OWNED' };
  if (!i.inResidenceCity) return { reason: 'NOT_IN_RESIDENCE_CITY' };
  if (i.iron < FLAT.price) return { reason: 'NOT_ENOUGH_IRON', need: FLAT.price };
  return null;
}

/** Design §6: a new flat comes with its first week paid. */
export const newFlat = (cityId: string, today: DayKey): Flat => ({
  cityId,
  boughtDay: today,
  paidThroughDay: today + 6,
});

export type RentRefusal = 'NO_FLAT' | 'BAD_WEEKS' | 'PAID_AHEAD' | 'NOT_ENOUGH_IRON';

/** Design §6 (§21.1 Q4): one or four weeks, at most eight weeks ahead (`paidThroughDay ≤ today + 55`). */
export function payRentGate(i: {
  flat: Flat | null;
  weeks: number;
  today: DayKey;
  iron: number;
}): null | { reason: RentRefusal; need?: number } {
  if (!i.flat) return { reason: 'NO_FLAT' };
  if (!(FLAT.weeks as readonly number[]).includes(i.weeks)) return { reason: 'BAD_WEEKS' };
  if (payRent(i.flat, i.today, i.weeks).paidThroughDay > i.today + FLAT.aheadDays)
    return { reason: 'PAID_AHEAD' };
  if (i.iron < rentPrice(i.weeks)) return { reason: 'NOT_ENOUGH_IRON', need: rentPrice(i.weeks) };
  return null;
}
