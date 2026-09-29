import { CITY_DAY, DAY_NIGHT, DIRECTIVES } from './constants';

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

/** §2.2: night art from 20:00 to 06:00 UTC. Cosmetic in slice 1. */
export function isNight(now: number): boolean {
  const msIntoDay = (((now + CITY_DAY.utcOffsetMs) % CITY_DAY.ms) + CITY_DAY.ms) % CITY_DAY.ms;
  const hour = Math.floor(msIntoDay / 3_600_000);
  return hour >= DAY_NIGHT.nightFromHour || hour < DAY_NIGHT.dayFromHour;
}

/** Non-negative modulo, for rotations indexed by a day number that may precede the epoch. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
