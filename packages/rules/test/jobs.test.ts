import { describe, expect, it } from 'vitest';
import {
  JOBS,
  dayKey,
  dayStart,
  emptyTally,
  jobLock,
  jobLocks,
  jobPay,
  seniorityBonus,
  seniorityPct,
  settleDays,
} from '../src';
import type { JobState, WageDay } from '../src';

const M = dayKey(Date.UTC(2026, 9, 5)); // Monday 5 October 2026
const PAY = 216;
const recruit = { level: 1, stats: { str: 10, int: 12, agi: 5, cha: 2 } };

const settle = (
  settled: number | null,
  today: number,
  job: JobState | null,
  wageOn?: (ended: number) => WageDay,
) =>
  settleDays({
    settled,
    today,
    job,
    pay: job ? PAY : null,
    tally: emptyTally(settled),
    energy: { value: 100, rested: 0, updatedAt: dayStart(today) },
    now: dayStart(today),
    ...(wageOn ? { wageOn } : {}),
  });

const held = (seniority: number, since = M - 10): JobState => ({ id: 'factory-worker', since, seniority });

describe('pay (§9.1, §9.2; review 1: a job is a wage)', () => {
  it('Factory worker: 180 → 216 for the Collective, 180 for others', () => {
    const job = { dailyPay: 180, factionPayBonus: { collective: 0.2 } };
    expect(jobPay(job, 'collective')).toBe(216);
    expect(jobPay(job, 'vanguard')).toBe(180);
  });

  it('seniority: +2 % of the daily pay a day, to +20 % after ten days', () => {
    expect(seniorityPct(0)).toBe(0);
    expect(seniorityPct(1)).toBe(0.02);
    expect(seniorityBonus(216, 4)).toBe(17); // the answers' "Seniority 4 days: +17"
    expect(seniorityBonus(216, 10)).toBe(43);
    expect(seniorityBonus(216, 25)).toBe(43);
    expect(JOBS.salaryMaxDays).toBe(14);
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

describe('settleDays (ADR 0005, review 1)', () => {
  it('does nothing on the same day', () => {
    expect(settle(M, M, null)).toBeNull();
  });

  it('first touch: first edition, no pay', () => {
    const s = settle(null, M, null)!;
    expect(s).toMatchObject({ firstEdition: true, daysSince: null, salary: null, seniority: null });
    expect(s.today).toEqual(emptyTally(M));
  });

  it('the first boundary after taking the job pays the full wage and +2 % (216 → 220)', () => {
    const s = settle(M, M + 1, held(0, M))!;
    expect(s.salary).toEqual({ days: 1, perDay: 216, seniority: { days: 1, amount: 4 }, total: 220 });
    expect(s.seniority).toEqual({ before: 0, after: 1 });
    expect(s.job).toEqual({ id: 'factory-worker', since: M, seniority: 1 });
    expect(s.daysSince).toBe(1);
  });

  it('pays whether or not the player played: no shift, nothing missed', () => {
    const s = settle(M + 3, M + 4, held(3))!;
    expect(s.salary?.total).toBe(216 + seniorityBonus(216, 4));
    expect(s.seniority).toEqual({ before: 3, after: 4 });
  });

  it('at the cap the day is 216 × 1.20 = 259 (economy §16.1)', () => {
    expect(settle(M, M + 1, held(12))!.salary?.total).toBe(259);
  });

  it('8 days away: 8 days of pay, seniority counting every boundary, the job kept', () => {
    const s = settle(M, M + 8, held(0, M))!;
    const seniority = [1, 2, 3, 4, 5, 6, 7, 8].reduce((sum, d) => sum + seniorityBonus(216, d), 0);
    expect(s.salary).toEqual({
      days: 8,
      perDay: 216,
      seniority: { days: 8, amount: seniority },
      total: 8 * 216 + seniority,
    });
    expect(s.job?.id).toBe('factory-worker');
    expect(s.daysSince).toBe(8);
  });

  it('30 days away credits at most 14 days of pay; seniority still counts all 30 (capped at +20 %)', () => {
    const s = settle(M, M + 30, held(0, M))!;
    expect(s.salary?.days).toBe(14);
    expect(s.salary?.total).toBe(14 * 259); // every paid day is past ten days held
    expect(s.seniority).toEqual({ before: 0, after: 30 });
  });

  it('under an ordinance: its line is on the unmodified pay, beside seniority; Long Service counts two a day', () => {
    const publicWorks = (): WageDay => ({ payAdjust: 22, label: 'Public Works Order', seniorityStep: 1 });
    const pw = settle(M, M + 1, held(9), publicWorks)!;
    expect(pw.salary).toEqual({
      days: 1,
      perDay: 216,
      seniority: { days: 10, amount: 43 },
      total: 216 + 43 + 22,
      ordinance: { label: 'Public Works Order', amount: 22 },
    });
    const longService = (): WageDay => ({ payAdjust: 0, label: null, seniorityStep: 2 });
    const ls = settle(M, M + 5, held(0, M), longService)!;
    expect(ls.seniority).toEqual({ before: 0, after: 10 });
    expect(ls.salary?.seniority.amount).toBe(
      [2, 4, 6, 8, 10].reduce((a, d) => a + seniorityBonus(216, d), 0),
    );
  });

  it('no job: nothing is paid and there is no seniority', () => {
    const s = settleDays({
      settled: M,
      today: M + 1,
      job: null,
      pay: null,
      tally: { ...emptyTally(M), energy: 30 },
      energy: { value: 100, rested: 10, updatedAt: dayStart(M + 1) - 60 * 60_000 },
      now: dayStart(M + 1),
    })!;
    expect(s.restedBanked).toBe(30);
    expect(s.lastPlayed).toMatchObject({ day: M, energy: 30 });
    expect(s.salary).toBeNull();
    expect(s.seniority).toBeNull();
  });
});
