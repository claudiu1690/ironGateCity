import { HEAT } from './constants';
import { dayKey, dayStart } from './day';
import type { DayKey } from './day';

/**
 * Heat (GDD §6.4, design §6, ADR 0033): 0–100, whole points, cooling lazily from a stored value and
 * timestamp at the **residence** city's rate of each City Day (5 an hour, raised by its
 * `heatCoolPct` sources). Pure: never reads a clock.
 *
 * Cooling is counted in integer units so that a write never loses (or invents) a part-point: a
 * point is `UNITS_PER_POINT` units, and a rate of r points an hour cools `r × 2,000` units a
 * millisecond (5 an hour: 10,000; the Customs Strike's 7.5: 15,000; any rate 5 × Π(1 + pct / 100)
 * with up to two whole-percent sources is a whole number of units).
 */

export type HeatState = 'cool' | 'noticed' | 'hot' | 'wanted';

export interface HeatTimer {
  /** Whole points, 0–100, as of `at`. */
  value: number;
  /** Epoch ms. The part of a point already cooled since `at` is kept by projecting from `at`. */
  at: number;
}

/** Points an hour → cooling units a millisecond. */
const UNITS_PER_MS_PER_RATE = 2_000;
/** One point of Heat in cooling units (3,600,000 ms × 2,000). */
const UNITS_PER_POINT = 3_600_000 * UNITS_PER_MS_PER_RATE;

/** 0–24 Cool · 25–49 Noticed · 50–74 Hot · 75–100 Wanted (§6.4). */
export function heatState(h: number): HeatState {
  if (h >= HEAT.states.wanted) return 'wanted';
  if (h >= HEAT.states.hot) return 'hot';
  if (h >= HEAT.states.noticed) return 'noticed';
  return 'cool';
}

/** The state's bonus on the run-in chance and the caught check (Noticed +5, Hot and Wanted +15). */
export const heatBonus = (s: HeatState): number => HEAT.bonus[s];

/**
 * Points an hour: 5 × Π(1 + pct / 100) over the `heatCoolPct` sources of the day (ADR 0030's
 * percentage rule: sources multiply). The Customs Strike's +50 gives 7.5.
 */
export function coolRate(pcts: readonly number[] = []): number {
  return pcts.reduce((r, p) => r * (1 + p / 100), HEAT.coolPerHour);
}

const unitsPerMs = (rate: number): number => Math.max(1, Math.round(rate * UNITS_PER_MS_PER_RATE));

/**
 * Walk the City Days from `from`, cooling at each day's rate, until `target` units have cooled (or
 * `until` is reached). Returns the units cooled by `until` (at most `target`) and, when the target
 * was reached, the moment it was (a fraction of a millisecond is possible; callers round).
 */
function walk(
  from: number,
  until: number,
  rateOn: (day: DayKey) => number,
  target: number,
): { cooled: number; reachedAt: number | null } {
  let t = from;
  let cooled = 0;
  while (t < until) {
    const day = dayKey(t);
    const end = Math.min(until, dayStart(day + 1));
    const u = unitsPerMs(rateOn(day));
    const seg = (end - t) * u;
    if (cooled + seg >= target) return { cooled: target, reachedAt: t + (target - cooled) / u };
    cooled += seg;
    t = end;
  }
  return { cooled, reachedAt: null };
}

/**
 * Heat at `now` (ADR 0033 §1): `value − floor(cooled)`, never below 0. The returned `at` is the
 * moment the last whole point cooled, so the part-point already cooled is kept for the next write;
 * at 0 it is `now`.
 */
export function projectHeat(t: HeatTimer, now: number, rateOn: (day: DayKey) => number): HeatTimer {
  if (t.value <= 0 || now <= t.at) return t.value <= 0 ? { value: 0, at: Math.max(t.at, now) } : { ...t };
  // Units to the full cool-down bound the walk (a player away for a month walks at most 100 points).
  const full = t.value * UNITS_PER_POINT;
  const { cooled } = walk(t.at, now, rateOn, full);
  const whole = Math.floor(cooled / UNITS_PER_POINT);
  const value = t.value - whole;
  if (value <= 0) return { value: 0, at: now };
  if (whole === 0) return { ...t };
  // Floor: a write never loses cooling (at worst it keeps under a millisecond's worth extra).
  const at = Math.floor(walk(t.at, now, rateOn, whole * UNITS_PER_POINT).reachedAt ?? now);
  return { value, at };
}

export interface HeatChange {
  before: number;
  after: number;
  stateBefore: HeatState;
  stateAfter: HeatState;
  timer: HeatTimer;
}

/** Project to `now`, then add `gain` (negative cools a card's −10), kept to 0–100. */
export function addHeat(
  t: HeatTimer,
  now: number,
  rateOn: (day: DayKey) => number,
  gain: number,
): HeatChange {
  const p = projectHeat(t, now, rateOn);
  const after = Math.min(HEAT.max, Math.max(0, p.value + gain));
  const timer: HeatTimer = after <= 0 ? { value: 0, at: now } : p.value <= 0 ? { value: after, at: now } : { value: after, at: p.at };
  return {
    before: p.value,
    after,
    stateBefore: heatState(p.value),
    stateAfter: heatState(after),
    timer,
  };
}

/** A release from the cells: 25 at `until` (§19.2). */
export const setHeat = (value: number, at: number): HeatTimer => ({
  value: Math.min(HEAT.max, Math.max(0, value)),
  at,
});

/**
 * When Heat first drops under `below` (25 for *Cool by*, 1 for gone), or null when it already is
 * (design §23.1 #9).
 */
export function heatEta(
  t: HeatTimer,
  now: number,
  rateOn: (day: DayKey) => number,
  below: number,
): number | null {
  const p = projectHeat(t, now, rateOn);
  if (p.value < below) return null;
  const points = p.value - below + 1;
  const far = p.at + 400 * 86_400_000;
  const at = walk(p.at, far, rateOn, points * UNITS_PER_POINT).reachedAt;
  return at === null ? null : Math.ceil(at);
}

/** Milliseconds per point at a rate (the client's projection between reads). */
export const heatStepMs = (rate: number): number => Math.ceil(UNITS_PER_POINT / unitsPerMs(rate));
