import { TERM, TERM_DAYS } from './constants';
import { mod } from './day';
import type { DayKey } from './day';
import { isMonday } from './week';

/**
 * Slice 7 (docs/tech/slice-7.md §3.1, §6.2; ADR 0043; design §2): the term calendar. A term is 28 City
 * Days from a fixed Monday; every Chair and national window is a pure function of the day key, so
 * nothing has a clock time and nothing needs a job of its own.
 */

export interface TermDay {
  /** The term's number (0 is the term starting at the epoch; negative before it). */
  index: number;
  /** 0…27. */
  termDay: number;
  fromDay: DayKey;
  /** Exclusive. */
  toDay: DayKey;
}

export const termStart = (index: number): DayKey => TERM.epochDay + index * TERM.days;

export function termOf(day: DayKey): TermDay {
  const index = Math.floor((day - TERM.epochDay) / TERM.days);
  const fromDay = termStart(index);
  return { index, termDay: mod(day - TERM.epochDay, TERM.days), fromDay, toDay: fromDay + TERM.days };
}

/** Design §4.1: names in on term days 9–10, the vote on 11–13, the count into 14. */
export type ChairPhase = 'none' | 'names' | 'voting';
/** Design §6: names 19–20, the party's pick 21–22, the republic's vote 23–26, the provisional result 27. */
export type NationalPhase = 'none' | 'names' | 'pick' | 'voting' | 'result';

const C = TERM_DAYS.chair;
const N = TERM_DAYS.nation;

export function chairPhase(day: DayKey): ChairPhase {
  const t = termOf(day).termDay;
  if (t >= C.namesFrom && t < C.votesFrom) return 'names';
  if (t >= C.votesFrom && t < C.countDay) return 'voting';
  return 'none';
}

export function nationalPhase(day: DayKey): NationalPhase {
  const t = termOf(day).termDay;
  if (t >= N.namesFrom && t < N.pickFrom) return 'names';
  if (t >= N.pickFrom && t < N.votesFrom) return 'pick';
  if (t >= N.votesFrom && t < N.countDay) return 'voting';
  if (t === N.countDay) return 'result';
  return 'none';
}

/** The nation's day's work at the boundary into `day` (§3.1's table). */
export interface NationWork {
  takeOffice: boolean;
  openChair: boolean;
  closeChairNames: boolean;
  countChair: boolean;
  openNation: boolean;
  openPick: boolean;
  countPick: boolean;
  countNation: boolean;
  monday: boolean;
}

/**
 * ADR 0043 (§22.1 Q18): each window's steps run only when the window opened on or after the
 * bootstrap day; a window already open at the bootstrap is skipped and the acting holder continues.
 * Taking office runs on every day 0 (with no counted election the government carries over).
 */
export function nationWork(day: DayKey, bootstrappedDay: DayKey): NationWork {
  const { termDay: t, fromDay } = termOf(day);
  const chairRuns = fromDay + C.namesFrom >= bootstrappedDay;
  const nationRuns = fromDay + N.namesFrom >= bootstrappedDay;
  return {
    takeOffice: t === 0,
    openChair: chairRuns && t === C.namesFrom,
    closeChairNames: chairRuns && t === C.votesFrom,
    countChair: chairRuns && t === C.countDay,
    openNation: nationRuns && t === N.namesFrom,
    openPick: nationRuns && t === N.pickFrom,
    countPick: nationRuns && t === N.votesFrom,
    countNation: nationRuns && t === N.countDay,
    monday: isMonday(day),
  };
}

/** Design §5.2 (§22.1 Q14): bills are tabled on term days 0–23, so every bill divides by day 27. */
export const canTableOn = (day: DayKey): boolean => termOf(day).termDay <= TERM_DAYS.tableUntil;

/** Design §10.2: a removal cannot be tabled on term days 0–4 or 24–27. */
export function removalOpen(day: DayKey): boolean {
  const t = termOf(day).termDay;
  return !TERM_DAYS.removalClosed.some(([lo, hi]) => t >= lo && t <= hi);
}

export type TermDate =
  | 'chairNames'
  | 'chairVotes'
  | 'chairCount'
  | 'nationNames'
  | 'pick'
  | 'votes'
  | 'count'
  | 'office';

const TERM_DATE: Readonly<Record<TermDate, number>> = {
  chairNames: C.namesFrom,
  chairVotes: C.votesFrom,
  chairCount: C.countDay,
  nationNames: N.namesFrom,
  pick: N.pickFrom,
  votes: N.votesFrom,
  count: N.countDay,
  office: 0,
};

/** The first day on or after `day` that is `what`'s term day (every TermLine's and card's date). */
export function nextDate(day: DayKey, what: TermDate): DayKey {
  const { fromDay, termDay } = termOf(day);
  const target = TERM_DATE[what];
  return termDay <= target ? fromDay + target : fromDay + TERM.days + target;
}
