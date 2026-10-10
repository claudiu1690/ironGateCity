import { CITY_DAY, DIRECTIVES, GAME_DAY_HOURS, NIGHT_HOURS } from './constants';

/** Whole City Days since 1970-01-01 in game time (ADR 0005). */
export type DayKey = number;

/** 0 = Monday … 6 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** 1970-01-01 was a Thursday: day 0 is weekday 3 in a Monday-first week. */
const EPOCH_WEEKDAY = 3;

/** §2.2: the City Day containing `now` (00:00 UTC boundary). */
export function dayKey(now: number): DayKey {
  return Math.floor((now + CITY_DAY.utcOffsetMs) / CITY_DAY.ms);
}

/** Epoch ms at which `day` begins. */
export function dayStart(day: DayKey): number {
  return day * CITY_DAY.ms - CITY_DAY.utcOffsetMs;
}

/** Monday-based week number: every day from a Monday to the next Sunday shares it. */
export function weekKey(day: DayKey): number {
  return Math.floor((day + EPOCH_WEEKDAY) / 7);
}

export function weekday(day: DayKey): Weekday {
  return ((((day + EPOCH_WEEKDAY) % 7) + 7) % 7) as Weekday;
}

/** City Days since 2026-01-01, for content rotations (Party orders, the ambient headline). */
export function cityDayIndex(day: DayKey): number {
  return day - DIRECTIVES.epochDay;
}

const HOUR_MS = 3_600_000;
const GAME_DAY_MS = GAME_DAY_HOURS * HOUR_MS;
/** Into the six-hour block, the night starts here (04:00 of each block). */
const DUSK_INTO_MS = (GAME_DAY_HOURS - NIGHT_HOURS) * HOUR_MS;

/** The town's day index: whole six-hour blocks since the epoch, on the City Day's offset. */
export const gameDayIndex = (now: number): number => Math.floor((now + CITY_DAY.utcOffsetMs) / GAME_DAY_MS);

/**
 * §2.2 (review 5, ADR 0079): the start (a dawn) of the six-hour block holding `now`, aligned to the
 * City Day so 00:00 UTC is always a dawn.
 */
export function gameDayStart(now: number): number {
  return gameDayIndex(now) * GAME_DAY_MS - CITY_DAY.utcOffsetMs;
}

/**
 * §2.2 (review 5, ADR 0079): night is the last two hours of every six. Dusk is inclusive (04:00:00 is
 * night), dawn exclusive (06:00:00 is day).
 */
export function isNight(now: number): boolean {
  return now - gameDayStart(now) >= DUSK_INTO_MS;
}

/** The first dusk strictly after `now`. */
export function nextDusk(now: number): number {
  const dusk = gameDayStart(now) + DUSK_INTO_MS;
  return dusk > now ? dusk : dusk + GAME_DAY_MS;
}

/** The first dawn strictly after `now` (the end of the six-hour block holding it). */
export function nextDawn(now: number): number {
  return gameDayStart(now) + GAME_DAY_MS;
}

/** The night's index (its six-hour block) while it is night; null by day. */
export function nightKey(now: number): number | null {
  return isNight(now) ? gameDayIndex(now) : null;
}

/** Non-negative modulo, for rotations indexed by a day number that may precede the epoch. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
