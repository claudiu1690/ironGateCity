import type { DayKey } from './day';
import { roundOpinion } from './rewards';
import type { DailyTally } from './types';

export function emptyTally(day: DayKey | null): DailyTally {
  return {
    day,
    energy: 0,
    attempts: 0,
    successes: 0,
    xp: 0,
    fxp: 0,
    iron: 0,
    pc: 0,
    opinion: 0,
    ordersDone: 0,
    shiftWorked: false,
    statTrained: 0,
  };
}

/** §3.7: the tally for `today`; a stored tally from another day reads as zeros. */
export function currentTally(t: DailyTally, today: DayKey): DailyTally {
  return t.day === today ? { ...t } : emptyTally(today);
}

/** Add one tap's numbers to today's tally (opinion keeps three decimals). */
export function addToTally(
  t: DailyTally,
  today: DayKey,
  delta: Partial<Omit<DailyTally, 'day'>>,
): DailyTally {
  const c = currentTally(t, today);
  return {
    day: today,
    energy: c.energy + (delta.energy ?? 0),
    attempts: c.attempts + (delta.attempts ?? 0),
    successes: c.successes + (delta.successes ?? 0),
    xp: c.xp + (delta.xp ?? 0),
    fxp: c.fxp + (delta.fxp ?? 0),
    iron: c.iron + (delta.iron ?? 0),
    pc: c.pc + (delta.pc ?? 0),
    opinion: roundOpinion(c.opinion + (delta.opinion ?? 0)),
    ordersDone: c.ordersDone + (delta.ordersDone ?? 0),
    shiftWorked: c.shiftWorked || delta.shiftWorked === true,
    statTrained: c.statTrained + (delta.statTrained ?? 0),
  };
}
