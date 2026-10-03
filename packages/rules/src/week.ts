import { WEEK } from './constants';
import { mod } from './day';
import type { DayKey } from './day';

/**
 * Slice 4 (tech design §6.2): the week of the Issues starts on Monday. `WEEK.mondayEpoch` is
 * 2026-01-05, a Monday; the week key is the Monday's day key (`irongate:20731:issue.tram-fares`).
 */
export const isMonday = (d: DayKey): boolean => mod(d - WEEK.mondayEpoch, 7) === 0;

/** The Monday starting the week that contains `d`. */
export const weekOf = (d: DayKey): DayKey => d - mod(d - WEEK.mondayEpoch, 7);

/** The next Monday strictly after `d` (when this week's Issues settle). */
export const nextMonday = (d: DayKey): DayKey => weekOf(d) + 7;
