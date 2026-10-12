import { MONTH_NAMES, WEEKDAY_NAMES, councilDay, dayKey, dayStart, nextDusk, weekday } from '@irongate/rules';
import type { CycleDay, DayKey } from '@irongate/rules';

/**
 * The dev panel's clock maths (memory mode only, behind E2E_TEST_HOOKS). Pure: it only says where
 * the shared test clock should move to, from the council calendar in `@irongate/rules`. No game
 * rule lives here; the moves land a minute past a boundary so the city day has something to settle.
 */

export const HOUR_MS = 3_600_000;
/** "Just past" a 00:00 UTC boundary: 00:01, the worker's own minute of margin (ADR 0017). */
export const PAST_BOUNDARY_MS = 60_000;

/**
 * The voting rework (tech design §12): the three phases a city's cycle reads as: the result morning
 * (stand and set rules, day 1 of 2), standing (day 2 of 2), the vote (days 2–4).
 */
export type DevPhase = 'result-day' | 'standing' | 'vote';
/** Where "Skip to next phase" goes: the vote opening, or the count (the next cycle's day 0). */
export type NextPhase = 'vote' | 'count';

export function phaseOf(cycleDay: CycleDay): DevPhase {
  return cycleDay === 0 ? 'result-day' : cycleDay === 1 ? 'standing' : 'vote';
}

/** 00:01 UTC on the next City Day. */
export function nextDayAt(now: number): number {
  return dayStart(dayKey(now) + 1) + PAST_BOUNDARY_MS;
}

/** Review 5 (ADR 0079): the panel's *To dusk*, a minute past the next dusk (04, 10, 16 or 22 UTC). */
export function toDuskAt(now: number): number {
  return nextDusk(now) + PAST_BOUNDARY_MS;
}

/**
 * The next phase boundary after `day` in a city with council `offset` (tech design §3.1): standing
 * (cycle days 0–1) → the vote opens on day 2 (the set); the vote (days 2–4) → the count at the
 * boundary into the next cycle's day 0.
 */
export function nextPhase(day: DayKey, offset: number): { phase: NextPhase; day: DayKey } {
  const { phase, election } = councilDay(day, offset);
  return phase === 'nominations'
    ? { phase: 'vote', day: election.pollsFrom }
    : { phase: 'count', day: election.countDay };
}

/** The boundary instant (00:00 UTC) of the next phase, and where the skip lands (00:01). */
export function nextPhaseAt(
  now: number,
  offset: number,
): { phase: NextPhase; day: DayKey; startsAt: number; landAt: number } {
  const n = nextPhase(dayKey(now), offset);
  const startsAt = dayStart(n.day);
  return { ...n, startsAt, landAt: startsAt + PAST_BOUNDARY_MS };
}

/** "Thursday 1 Oct 00:01 UTC". */
export function formatUtc(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const day = dayKey(ms);
  return `${WEEKDAY_NAMES[weekday(day)]} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]!.slice(0, 3)} ${hh}:${mm} UTC`;
}

/** "The vote (day 2 of 3)" and the like, for the panel's phase line (tech design §12). */
export function phaseLabel(cycleDay: CycleDay): string {
  switch (cycleDay) {
    case 0:
      return 'Result day · stand and set rules (day 1 of 2)';
    case 1:
      return 'Stand and set rules (day 2 of 2)';
    default:
      return `The vote (day ${cycleDay - 1} of 3)`;
  }
}
