import { COUNCIL } from './constants';
import { mod } from './day';
import type { DayKey } from './day';

/**
 * The five-day council cycle (slice-3 tech design §3.1, GDD §15.3). Everything is a pure function
 * of the City Day key and the city's offset (Irongate 0, Ashford 1, Coalport 2, Duskwall 3,
 * Clearwater 4): the client never waits on a job to know what is open.
 *
 * - cycle k starts on `start(k) = 5k + offset`;
 * - election k: nominations on cycle days 0–1, polls on days 2–4, counted at the boundary into
 *   `start(k + 1)`;
 * - council k (elected by election k − 1) sits from `start(k)` to `start(k + 1)`; its councillors
 *   set their rule on days 0–1, and the boundary into `start(k) + 2` (the set) freezes the list and
 *   the three cards (the voting rework, ADR 0083);
 * - the rule decided by ballot k − 1 is in force for `[start(k), start(k + 1))`.
 */
export type CouncilPhase = 'nominations' | 'polling';
export type CycleDay = 0 | 1 | 2 | 3 | 4;

export function cycleOf(day: DayKey, offset: number): { cycle: number; cycleDay: CycleDay; start: DayKey } {
  const n = COUNCIL.cycleDays;
  const cycle = Math.floor((day - offset) / n);
  return { cycle, cycleDay: mod(day - offset, n) as CycleDay, start: cycle * n + offset };
}

/** The first day of cycle `k` in a city with `offset`. */
export function cycleStart(cycle: number, offset: number): DayKey {
  return cycle * COUNCIL.cycleDays + offset;
}

export interface CouncilDay {
  cycle: number;
  cycleDay: CycleDay;
  phase: CouncilPhase;
  /** The open election (cycle `cycle`). */
  election: { cycle: number; nominationsFrom: DayKey; pollsFrom: DayKey; countDay: DayKey };
  /**
   * The sitting council (cycle `cycle`); `toDay` is exclusive. The voting rework (ADR 0083):
   * `ruleOpen` on days 0–1 (councillors set their rule); `setDay` = fromDay + 2, the boundary that
   * freezes the list and the three cards.
   */
  council: {
    cycle: number;
    fromDay: DayKey;
    toDay: DayKey;
    ruleOpen: boolean;
    setDay: DayKey;
  };
  /**
   * Voting rework (ADR 0083): the rule in force this cycle (ballot k − 1's result, decided at the
   * count into `fromDay`); `toDay` exclusive: `[start, start + 5)`.
   */
  ruleWindow: { fromDay: DayKey; toDay: DayKey };
  /** What this cycle's vote decides, in force from the next count: `[start + 5, start + 10)`. */
  nextRuleWindow: { fromDay: DayKey; toDay: DayKey };
}

export function councilDay(day: DayKey, offset: number): CouncilDay {
  const { cycle, cycleDay, start } = cycleOf(day, offset);
  const n = COUNCIL.cycleDays;
  return {
    cycle,
    cycleDay,
    phase: cycleDay <= 1 ? 'nominations' : 'polling',
    election: { cycle, nominationsFrom: start, pollsFrom: start + 2, countDay: start + n },
    council: {
      cycle,
      fromDay: start,
      toDay: start + n,
      ruleOpen: cycleDay <= 1,
      setDay: start + 2,
    },
    ruleWindow: { fromDay: start, toDay: start + n },
    nextRuleWindow: { fromDay: start + n, toDay: start + 2 * n },
  };
}

/** `elections._id`: "coalport:4145". */
export const electionKey = (cityId: string, cycle: number): string => `${cityId}:${cycle}`;
/** `ordinances._id` and `officeTerms.councilKey`: "coalport:4146" (the cycle the council sits in). */
export const councilKey = (cityId: string, cycle: number): string => `${cityId}:${cycle}`;

/**
 * Voting rework (ADR 0083): the rule ballot council k puts to the town, `ordinances._id`
 * ("coalport:4146"), the same string as the council's key.
 */
export const ruleBallotKey = councilKey;

/** The cycle number in a key made by `electionKey` / `councilKey`. */
export function cycleOfKey(key: string): number {
  return Number(key.slice(key.lastIndexOf(':') + 1));
}

/**
 * What the boundary into `day` does in a city (ADR 0083): into cycle day 0 the count (election k − 1's
 * seats and ballot k − 1's rule, seating council k, opening election k and ballot k); into day 2 the
 * set (the list and the three cards freeze). The drift runs at every boundary.
 */
export function boundaryWork(day: DayKey, offset: number): { count: boolean; set: boolean } {
  const { cycleDay } = cycleOf(day, offset);
  return { count: cycleDay === 0, set: cycleDay === 2 };
}

/** The next nominations day 0 strictly after `day`. */
export function nextNominationsAfter(day: DayKey, offset: number): DayKey {
  const { start } = cycleOf(day, offset);
  return start + COUNCIL.cycleDays;
}

/** The next day the polls open on or after `day` ("Coalport votes from Thursday"). */
export function nextPollsFrom(day: DayKey, offset: number): DayKey {
  const { start, cycleDay } = cycleOf(day, offset);
  return cycleDay <= 2 ? start + 2 : start + COUNCIL.cycleDays + 2;
}
