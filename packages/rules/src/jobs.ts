import { JOBS } from './constants';
import { weekKey } from './day';
import type { DayKey } from './day';
import { projectEnergy, spendEnergy } from './energy';
import type { EnergyProjection, EnergyState } from './energy';
import { advanceOrders } from './orders';
import { roundHalfUp } from './rewards';
import { emptyTally } from './tally';
import type {
  ActionDescriptor,
  DailyTally,
  FactionId,
  OrderTemplate,
  OrdersState,
  StatKey,
  Stats,
} from './types';

export interface JobState {
  id: string;
  since: DayKey;
  /** Consecutive City Days with a shift, counting today once it is worked (§9.1). */
  streak: number;
  lastShiftDay: DayKey | null;
}

/** The weekly allowance, per character (it survives a job switch). */
export interface SickDays {
  week: number;
  left: number;
}

/** §9.2: daily pay with the faction bonus (Factory worker 180 → 216 for the Collective). */
export function jobPay(
  job: { dailyPay: number; factionPayBonus?: Partial<Record<FactionId, number>> },
  factionId: FactionId,
): number {
  return roundHalfUp(job.dailyPay * (1 + (job.factionPayBonus?.[factionId] ?? 0)));
}

/** Half pay: what each 00:00 boundary credits, and the base of a shift. */
export function halfPay(pay: number): number {
  return roundHalfUp(pay * JOBS.salaryShare);
}

/** §9.1: a shift pays the other half plus 2 % × min(streak, 10) of daily pay (216 at 10: 108 + 43). */
export function shiftPay(
  pay: number,
  streakCountingToday: number,
): { half: number; bonus: number; pct: number; total: number } {
  const half = halfPay(pay);
  const pct = JOBS.streakPerDay * Math.min(Math.max(streakCountingToday, 0), JOBS.streakCapDays);
  const bonus = roundHalfUp(pay * pct);
  return { half, bonus, pct, total: half + bonus };
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
  /** Half pay credited for the boundaries crossed (capped, designer answer §12 Q9). */
  salary: { days: number; perDay: number; total: number } | null;
  job: JobState | null;
  sickDays: SickDays;
  streak: { before: number; after: number; sickDaysUsed: number; broken: boolean } | null;
  /** The tally being closed (the last day the character was touched), or null. */
  lastPlayed: DailyTally | null;
  today: DailyTally;
  /** Rested gained since the last stored Energy write (reported, not written: Energy stays lazy). */
  restedBanked: number;
}

const refill = (day: DayKey): SickDays => ({ week: weekKey(day), left: JOBS.sickDaysPerWeek });

/**
 * ADR 0005: settle every City Day boundary crossed since `settled`, lazily, in one go.
 * Per ended day: the job held pays half pay; a day without a shift spends a sick day while a streak
 * is running, or ends the streak when none is left; the Monday refill happens after the ended Sunday
 * is judged. Returns null when there is nothing to settle.
 */
export function settleDays(i: {
  settled: DayKey | null;
  today: DayKey;
  job: JobState | null;
  pay: number | null;
  sickDays: SickDays;
  tally: DailyTally;
  energy: EnergyState;
  now: number;
}): Settlement | null {
  if (i.settled !== null && i.settled >= i.today) return null;
  const restedBanked = Math.max(0, projectEnergy(i.energy, i.now).rested - i.energy.rested);

  if (i.settled === null) {
    return {
      day: i.today,
      firstEdition: true,
      daysSince: null,
      salary: null,
      job: i.job ? { ...i.job } : null,
      sickDays: refill(i.today),
      streak: null,
      lastPlayed: null,
      today: emptyTally(i.today),
      restedBanked,
    };
  }

  let sick: SickDays = { ...i.sickDays };
  const job = i.job ? { ...i.job } : null;
  const streakBefore = job?.streak ?? 0;
  let sickDaysUsed = 0;
  let broken = false;
  let boundaries = 0;

  for (let ended = i.settled; ended < i.today; ended++) {
    boundaries += 1;
    // The allowance belongs to the ended day's week: refill if it is from an earlier week.
    if (sick.week !== weekKey(ended)) sick = refill(ended);
    if (job && job.lastShiftDay !== ended) {
      const running = job.streak > 0;
      if (running || !JOBS.sickDaysOnlyWhileStreak) {
        if (sick.left > 0) {
          sick = { ...sick, left: sick.left - 1 };
          sickDaysUsed += 1;
        } else if (running) {
          job.streak = 0;
          broken = true;
        }
      }
    }
  }
  if (sick.week !== weekKey(i.today)) sick = refill(i.today);

  const perDay = job && i.pay !== null ? halfPay(i.pay) : 0;
  const paidDays = JOBS.salaryMaxDays === null ? boundaries : Math.min(boundaries, JOBS.salaryMaxDays);
  return {
    day: i.today,
    firstEdition: false,
    daysSince: i.today - i.settled,
    salary: job && i.pay !== null ? { days: paidDays, perDay, total: paidDays * perDay } : null,
    job,
    sickDays: sick,
    streak: job ? { before: streakBefore, after: job.streak, sickDaysUsed, broken } : null,
    lastPlayed: i.tally.day !== null && i.tally.day < i.today ? { ...i.tally } : null,
    today: emptyTally(i.today),
    restedBanked,
  };
}

export interface ShiftResolution {
  job: JobState;
  energy: { before: EnergyProjection; after: EnergyState; cost: number };
  pay: { half: number; bonus: number; pct: number; total: number };
  streak: { before: number; after: number };
  orders: { before: OrdersState; after: OrdersState; completed: string[]; allDone: boolean };
}

export type ShiftResult =
  | { ok: true; resolution: ShiftResolution }
  | { ok: false; reason: 'SHIFT_ALREADY_WORKED' }
  | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; shortBy: number; cost: number; energy: EnergyProjection };

/**
 * §9.1: one shift per City Day (regardless of job changes), not a check. Pays the other half plus
 * the streak bonus; no XP or FXP; Energy without Rested (designer answer §12 Q2).
 */
export function resolveShift(i: {
  job: JobState;
  today: DayKey;
  pay: number;
  shiftEnergy: number;
  energy: EnergyState;
  now: number;
  orders: OrdersState;
  orderTemplates: readonly OrderTemplate[];
  homeCityId: string;
  descriptor: ActionDescriptor;
}): ShiftResult {
  if (i.job.lastShiftDay === i.today) return { ok: false, reason: 'SHIFT_ALREADY_WORKED' };
  const before = projectEnergy(i.energy, i.now);
  const spent = spendEnergy(before, i.shiftEnergy, { useRested: JOBS.shiftUsesRested });
  if (!spent.ok) {
    return {
      ok: false,
      reason: 'NOT_ENOUGH_ENERGY',
      shortBy: spent.shortBy,
      cost: i.shiftEnergy,
      energy: before,
    };
  }
  const streak = i.job.streak + 1;
  const adv = advanceOrders(i.orders, i.orderTemplates, i.descriptor, 'success', i.homeCityId, i.now);
  return {
    ok: true,
    resolution: {
      job: { ...i.job, streak, lastShiftDay: i.today },
      energy: { before, after: spent.state, cost: i.shiftEnergy },
      pay: shiftPay(i.pay, streak),
      streak: { before: i.job.streak, after: streak },
      orders: {
        before: i.orders,
        after: adv.orders,
        completed: adv.completed ? [adv.completed.templateId] : [],
        allDone: adv.allDone,
      },
    },
  };
}
