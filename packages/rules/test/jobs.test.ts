import { describe, expect, it } from 'vitest';
import {
  DIRECTIVES,
  dayKey,
  dayStart,
  emptyTally,
  jobLock,
  jobLocks,
  jobPay,
  resolveShift,
  settleDays,
  shiftPay,
  startOrders,
  weekKey,
} from '../src';
import type { JobState, SickDays } from '../src';
import { TEMPLATES } from './helpers';

const M = dayKey(Date.UTC(2026, 9, 5)); // Monday 5 October 2026
const PAY = 216;
const recruit = { level: 1, stats: { str: 10, int: 12, agi: 5, cha: 2 } };

const settle = (settled: number | null, today: number, job: JobState | null, sickDays: SickDays) =>
  settleDays({
    settled,
    today,
    job,
    pay: job ? PAY : null,
    sickDays,
    tally: emptyTally(settled),
    energy: { value: 100, rested: 0, updatedAt: dayStart(today) },
    now: dayStart(today),
  });

describe('pay (§9.1, §9.2)', () => {
  it('Factory worker: 180 → 216 for the Collective, 180 for others', () => {
    const job = { dailyPay: 180, factionPayBonus: { collective: 0.2 } };
    expect(jobPay(job, 'collective')).toBe(216);
    expect(jobPay(job, 'vanguard')).toBe(180);
  });

  it('shift = half + 2 % × min(streak, 10)', () => {
    expect(shiftPay(216, 1)).toEqual({ half: 108, bonus: 4, pct: 0.02, total: 112 });
    expect(shiftPay(216, 2).total).toBe(108 + 9);
    expect(shiftPay(216, 10)).toMatchObject({ half: 108, bonus: 43, total: 151 });
    expect(shiftPay(216, 14)).toMatchObject({ bonus: 43, total: 151 });
  });

  it('locks: level first, then each stat; null when met', () => {
    const driver = { level: 3, stats: { agi: 10 } };
    expect(jobLocks(driver, recruit)).toEqual([
      { reason: 'LEVEL', need: 3 },
      { reason: 'STAT', stat: 'agi', need: 10 },
    ]);
    expect(jobLock({ level: 1, stats: { agi: 10 } }, recruit)).toEqual({
      reason: 'STAT',
      stat: 'agi',
      need: 10,
    });
    expect(jobLock({ level: 1, stats: { str: 5 } }, recruit)).toBeNull();
  });
});

describe('settleDays (ADR 0005)', () => {
  const job = (streak: number, lastShiftDay: number | null, since = M - 10): JobState => ({
    id: 'factory-worker',
    since,
    streak,
    lastShiftDay,
  });
  const sick = (day: number, left = 2): SickDays => ({ week: weekKey(day), left });

  it('does nothing on the same day', () => {
    expect(settle(M, M, null, sick(M))).toBeNull();
  });

  it('first touch: first edition, no pay', () => {
    const s = settle(null, M, null, { week: 0, left: 0 })!;
    expect(s).toMatchObject({ firstEdition: true, daysSince: null, salary: null, streak: null });
    expect(s.sickDays).toEqual(sick(M));
    expect(s.today).toEqual(emptyTally(M));
  });

  it('one boundary with a shift yesterday: half pay, streak kept', () => {
    const s = settle(M, M + 1, job(1, M), sick(M))!;
    expect(s.salary).toEqual({ days: 1, perDay: 108, total: 108 });
    expect(s.streak).toEqual({ before: 1, after: 1, sickDaysUsed: 0, broken: false });
    expect(s.sickDays.left).toBe(2);
    expect(s.daysSince).toBe(1);
  });

  it('one boundary without a shift: a sick day, streak kept', () => {
    const s = settle(M, M + 1, job(1, M - 1), sick(M))!;
    expect(s.streak).toEqual({ before: 1, after: 1, sickDaysUsed: 1, broken: false });
    expect(s.sickDays.left).toBe(1);
  });

  it('no streak running: nothing is spent (designer answer Q1)', () => {
    const s = settle(M, M + 1, job(0, null, M), sick(M))!;
    expect(s.streak).toEqual({ before: 0, after: 0, sickDaysUsed: 0, broken: false });
    expect(s.sickDays.left).toBe(2);
  });

  it('the third missed day in a week ends the streak', () => {
    const s = settle(M + 2, M + 3, job(3, M + 1), sick(M, 0))!;
    expect(s.streak).toEqual({ before: 3, after: 0, sickDaysUsed: 0, broken: true });
    expect(s.job).toMatchObject({ id: 'factory-worker', streak: 0 });
  });

  it('the ended Sunday is judged before the Monday refill; a refill between misses keeps the streak', () => {
    const s = settle(M - 1, M + 1, job(5, M - 2), sick(M - 1, 1))!;
    expect(s.streak).toEqual({ before: 5, after: 5, sickDaysUsed: 2, broken: false });
    expect(s.sickDays).toEqual(sick(M, 1));
    const broken = settle(M - 1, M, job(5, M - 2), sick(M - 1, 0))!;
    expect(broken.streak?.broken).toBe(true);
    expect(broken.sickDays).toEqual(sick(M, 2));
  });

  it('the designer worked example: take Mon, work Wed and Fri, streak ends Sunday, refill Monday', () => {
    let j: JobState = job(0, null, M);
    let s: SickDays = sick(M);
    const work = (day: number) => {
      j = { ...j, streak: j.streak + 1, lastShiftDay: day };
    };
    const next = (from: number) => {
      const r = settle(from, from + 1, j, s)!;
      j = r.job!;
      s = r.sickDays;
      return r;
    };
    next(M); // Mon missed, streak 0: nothing spent
    next(M + 1); // Tue missed
    expect(s.left).toBe(2);
    work(M + 2);
    next(M + 2); // Wed worked
    next(M + 3); // Thu missed: sick day
    expect([j.streak, s.left]).toEqual([1, 1]);
    work(M + 4);
    next(M + 4); // Fri worked
    next(M + 5); // Sat missed: the last sick day
    expect([j.streak, s.left]).toEqual([2, 0]);
    const sunday = next(M + 6); // Sun missed: streak ends; Monday refills
    expect(sunday.streak?.broken).toBe(true);
    expect([j.streak, s.left, s.week]).toEqual([0, 2, weekKey(M + 7)]);
  });

  it('8 days away: 8 half-pays, streak 0, job kept', () => {
    const s = settle(M, M + 8, job(3, M), sick(M))!;
    expect(s.salary).toEqual({ days: 8, perDay: 108, total: 864 });
    expect(s.streak?.after).toBe(0);
    expect(s.job?.id).toBe('factory-worker');
    expect(s.daysSince).toBe(8);
  });

  it('30 days away credits at most 14 half-pays (designer answer Q9)', () => {
    const s = settle(M, M + 30, job(3, M), sick(M))!;
    expect(s.salary).toEqual({ days: 14, perDay: 108, total: 1_512 });
  });

  it('reports Rested banked since the last write without writing it', () => {
    const s = settleDays({
      settled: M,
      today: M + 1,
      job: null,
      pay: null,
      sickDays: sick(M),
      tally: { ...emptyTally(M), energy: 30 },
      energy: { value: 100, rested: 10, updatedAt: dayStart(M + 1) - 60 * 60_000 },
      now: dayStart(M + 1),
    })!;
    expect(s.restedBanked).toBe(30);
    expect(s.lastPlayed).toMatchObject({ day: M, energy: 30 });
    expect(s.salary).toBeNull();
    expect(s.streak).toBeNull();
  });
});

describe('resolveShift', () => {
  const orders = startOrders(TEMPLATES, DIRECTIVES.epochDay, true); // includes Work your shift
  const shift = (j: JobState, value = 100, rested = 50) =>
    resolveShift({
      job: j,
      today: M,
      pay: PAY,
      shiftEnergy: 4,
      energy: { value, rested, updatedAt: dayStart(M) },
      now: dayStart(M),
      orders,
      orderTemplates: TEMPLATES,
      homeCityId: 'coalport',
      descriptor: { kind: 'shift', actionId: 'coalport.mill-gate.shift', type: 'job', cityId: 'coalport' },
    });

  it('pays 108 + 4 on the first shift, without touching Rested, and counts for the order', () => {
    const r = shift({ id: 'factory-worker', since: M, streak: 0, lastShiftDay: null });
    if (!r.ok) throw new Error('expected ok');
    expect(r.resolution.pay).toEqual({ half: 108, bonus: 4, pct: 0.02, total: 112 });
    expect(r.resolution.energy.after).toMatchObject({ value: 96, rested: 50 });
    expect(r.resolution.job).toMatchObject({ streak: 1, lastShiftDay: M });
    expect(r.resolution.orders.completed).toEqual(['dir.work-shift']);
  });

  it('refuses a second shift the same day and a shift short of Energy', () => {
    expect(shift({ id: 'factory-worker', since: M, streak: 1, lastShiftDay: M })).toEqual({
      ok: false,
      reason: 'SHIFT_ALREADY_WORKED',
    });
    expect(shift({ id: 'factory-worker', since: M, streak: 0, lastShiftDay: null }, 3)).toMatchObject({
      ok: false,
      reason: 'NOT_ENOUGH_ENERGY',
      cost: 4,
      shortBy: 1,
    });
  });
});
