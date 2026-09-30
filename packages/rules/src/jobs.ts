import { JOBS } from './constants';
import type { DayKey } from './day';
import { projectEnergy, projectEnergyThrough } from './energy';
import type { EnergyState } from './energy';
import { roundHalfUp } from './rewards';
import { emptyTally } from './tally';
import type { DailyTally, FactionId, StatKey, Stats } from './types';

/**
 * The job held (review 1, GDD §9.1: a job is a wage). `seniority` counts the City Day boundaries
 * the job has been held (Long Service: two a day); it resets only on a switch.
 */
export interface JobState {
  id: string;
  since: DayKey;
  seniority: number;
}

/** §9.2: daily pay with the faction bonus (Factory worker 180 → 216 for the Collective). */
export function jobPay(
  job: { dailyPay: number; factionPayBonus?: Partial<Record<FactionId, number>> },
  factionId: FactionId,
): number {
  return roundHalfUp(job.dailyPay * (1 + (job.factionPayBonus?.[factionId] ?? 0)));
}

/** §9.1: seniority as a share of the daily pay: +2 % a day, to +20 % after ten days. */
export function seniorityPct(days: number): number {
  return JOBS.seniorityPerDay * Math.min(Math.max(days, 0), JOBS.seniorityCapDays);
}

/** §9.1: the seniority line on the unmodified daily pay (216 at 4 days: +17; at 10: +43). */
export function seniorityBonus(pay: number, days: number): number {
  return roundHalfUp(pay * seniorityPct(days));
}

export type JobLock = { reason: 'LEVEL'; need: number } | { reason: 'STAT'; stat: StatKey; need: number };

/** §9.1: requirements are checked on taking, never again. Level first, then each stat. */
export function jobLocks(
  unlock: { level: number; stats?: Partial<Record<StatKey, number>> },
  c: { level: number; stats: Stats },
): JobLock[] {
  const locks: JobLock[] = [];
  if (c.level < unlock.level) locks.push({ reason: 'LEVEL', need: unlock.level });
  for (const [stat, need] of Object.entries(unlock.stats ?? {}) as Array<[StatKey, number]>) {
    if (c.stats[stat] < need) locks.push({ reason: 'STAT', stat, need });
  }
  return locks;
}

/** The first unmet requirement, or null when the job can be taken. */
export function jobLock(
  unlock: { level: number; stats?: Partial<Record<StatKey, number>> },
  c: { level: number; stats: Stats },
): JobLock | null {
  return jobLocks(unlock, c)[0] ?? null;
}

export interface Settlement {
  day: DayKey;
  firstEdition: boolean;
  /** City Days since the last settlement, or null for a new character. */
  daysSince: number | null;
  /**
   * The wage credited for the boundaries crossed (review 1, GDD §9.1): full daily pay per boundary,
   * at most 14 days (the fortnight cap). `perDay` is the unmodified pay (with the member's fifth);
   * `seniority` sums each paid day's seniority line; `ordinance` each ended day's adjustment under the
   * ordinance in force that day (Public Works, Ward Fund; ADR 0021 §4), present only when non-zero.
   */
  salary: {
    days: number;
    perDay: number;
    seniority: { days: number; amount: number };
    total: number;
    ordinance?: { label: string; amount: number };
  } | null;
  job: JobState | null;
  /** Seniority before and after the boundaries crossed, or null without a job. */
  seniority: { before: number; after: number } | null;
  /** The tally being closed (the last day the character was touched), or null. */
  lastPlayed: DailyTally | null;
  today: DailyTally;
  /** Rested gained since the last stored Energy write (reported, not written: Energy stays lazy). */
  restedBanked: number;
}

/** What one ended City Day means for the wage: its ordinance's pay line and the seniority step. */
export interface WageDay {
  /** The ordinance's adjustment on the full daily pay (Public Works +22, Ward Fund −54), or 0. */
  payAdjust: number;
  /** The ordinance's name when `payAdjust` is non-zero. */
  label: string | null;
  /** Seniority days this boundary adds: 1, or 2 under the Long Service Order. */
  seniorityStep: number;
}

/**
 * ADR 0005: settle every City Day boundary crossed since `settled`, lazily, in one go. Review 1
 * (GDD §9.1): at each boundary the job held pays its full daily pay, plus seniority (counted after
 * that boundary's step, so the first pays +2 %), plus the ended day's ordinance line. Seniority
 * counts every boundary held, present or not; pay is credited for the most recent 14 at most.
 * Returns null when there is nothing to settle.
 */
export function settleDays(i: {
  settled: DayKey | null;
  today: DayKey;
  job: JobState | null;
  pay: number | null;
  tally: DailyTally;
  energy: EnergyState;
  now: number;
  /** Each ended day's ordinance line and seniority step; absent = no ordinance, one day a day. */
  wageOn?: (endedDay: DayKey) => WageDay;
  /** Slice 3: each day's Rested cap (Rest Day Order); absent = RESTED.cap. */
  capOn?: (day: DayKey) => number;
}): Settlement | null {
  if (i.settled !== null && i.settled >= i.today) return null;
  const projected = i.capOn ? projectEnergyThrough(i.energy, i.now, i.capOn) : projectEnergy(i.energy, i.now);
  const restedBanked = Math.max(0, projected.rested - i.energy.rested);

  if (i.settled === null) {
    return {
      day: i.today,
      firstEdition: true,
      daysSince: null,
      salary: null,
      job: i.job ? { ...i.job } : null,
      seniority: null,
      lastPlayed: null,
      today: emptyTally(i.today),
      restedBanked,
    };
  }

  const job = i.job ? { ...i.job } : null;
  const before = job?.seniority ?? 0;
  const firstPaid = i.today - Math.min(i.today - i.settled, JOBS.salaryMaxDays);
  let seniority = before;
  let days = 0;
  let seniorityAmount = 0;
  let adjustment = 0;
  const labels: string[] = [];
  for (let ended = i.settled; ended < i.today; ended++) {
    const w = i.wageOn?.(ended) ?? { payAdjust: 0, label: null, seniorityStep: 1 };
    if (!job) continue;
    seniority += w.seniorityStep;
    if (i.pay === null || ended < firstPaid) continue;
    days += 1;
    seniorityAmount += seniorityBonus(i.pay, seniority);
    if (w.payAdjust !== 0) {
      adjustment += w.payAdjust;
      if (w.label && !labels.includes(w.label)) labels.push(w.label);
    }
  }
  if (job) job.seniority = seniority;
  const salary =
    job && i.pay !== null
      ? {
          days,
          perDay: i.pay,
          seniority: { days: seniority, amount: seniorityAmount },
          total: days * i.pay + seniorityAmount + adjustment,
          ...(adjustment !== 0 ? { ordinance: { label: labels.join(' · '), amount: adjustment } } : {}),
        }
      : null;
  return {
    day: i.today,
    firstEdition: false,
    daysSince: i.today - i.settled,
    salary,
    job,
    seniority: job ? { before, after: seniority } : null,
    lastPlayed: i.tally.day !== null && i.tally.day < i.today ? { ...i.tally } : null,
    today: emptyTally(i.today),
    restedBanked,
  };
}
