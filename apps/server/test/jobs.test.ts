import { randomUUID } from 'node:crypto';
import { Character, PaperEntry } from '@irongate/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freshCharacter, gameData, noOrdinance, setupDb, teardownDb, testClock } from './helpers';

const DAY = 86_400_000;
const MONDAY = Date.UTC(2026, 8, 28, 9); // day index 270: slot C is "Work your shift" / "Take a job"
const MILL_SHIFT = {
  actionId: 'coalport.mill-gate.shift',
  locationId: 'coalport.mill-gate',
  times: 1,
} as const;
const STALL = { actionId: 'coalport.market-row.stall', locationId: 'coalport.market-row', times: 1 } as const;

beforeAll(async () => {
  await setupDb('jobs-test');
});
afterAll(teardownDb);

describe('job.take (§9.1)', () => {
  it('the first job is free and completes "Take a job" (+20 FXP); a retry returns the same result', async () => {
    const { caller, me } = await freshCharacter(testClock(MONDAY));
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    expect(me.orders.items[2]).toMatchObject({ id: 'dir.work-shift', title: 'Take a job', done: false });
    const key = randomUUID();
    const r = await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: key });
    expect(r.job).toMatchObject({ id: 'coalport-factory-worker', dailyPay: 216, shiftEnergy: 4, streak: 0 });
    expect(r.outcome).toMatchObject({ switched: false, orderCompleted: true, fxp: 20 });
    expect(r.character).toMatchObject({ fxp: 20, energy: { value: 100 } });
    expect(r.character.orders.items[2]).toMatchObject({ done: true });
    expect(await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: key })).toEqual(r);
    const again = await caller.job
      .take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(again)).toMatchObject({ code: 'BAD_REQUEST', game: { reason: 'ALREADY_IN_JOB' } });
  });

  it('switching costs 2 Energy (Rested untouched) and resets the streak', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(MONDAY));
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    await caller.action.perform({ ...MILL_SHIFT, idempotencyKey: randomUUID() });
    clock.advance(60 * 60_000); // 96 + 30 → 100 and 26 Rested
    const r = await caller.job.take({ jobId: 'coalport-street-vendor', idempotencyKey: randomUUID() });
    expect(r.outcome.switched).toBe(true);
    expect(r.character.energy.value).toBe(98);
    expect(r.character.rested).toBe(26);
    expect(r.job).toMatchObject({ id: 'coalport-street-vendor', streak: 0, shiftWorkedToday: true });
    // One shift per City Day regardless of job changes.
    const shift = await caller.action
      .perform({ ...STALL, idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(shift)).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'SHIFT_ALREADY_WORKED' },
    });
    void me;
  });

  it('refuses a locked job and unknown jobs', async () => {
    const { caller } = await freshCharacter();
    const locked = await caller.job
      .take({ jobId: 'coalport-driver', idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(locked)).toEqual({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'JOB_LOCKED', need: 3 },
    });
    const unknown = await caller.job
      .take({ jobId: 'astronaut', idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(unknown)).toMatchObject({ code: 'NOT_FOUND', game: { reason: 'UNKNOWN_JOB' } });
  });
});

describe('shifts, salary, streak and sick days', () => {
  it('shift pays 108 + 4, once a day; the next day 108 half pay, then 108 + 9', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(MONDAY));
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    const noJob = await caller.action
      .perform({ ...MILL_SHIFT, idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(noJob)).toMatchObject({ game: { reason: 'NOT_YOUR_JOB', jobId: null } });
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });

    const first = await caller.action.perform({ ...MILL_SHIFT, idempotencyKey: randomUUID() });
    expect(first).toMatchObject({ kind: 'shift', stamp: 'worked', again: null });
    expect(first.rewards.iron).toEqual({ base: 108, bonus: 4, total: 112 });
    expect(first.effects.shift).toMatchObject({
      half: 108,
      streakBonus: 4,
      streakPct: 2,
      streak: { before: 0, after: 1 },
      sickDaysLeft: 2,
    });
    expect(first.effects.energy).toMatchObject({ before: 100, after: 96 });
    expect(first.effects.rested).toEqual({ before: 0, after: 0 });
    expect(first.bonusTags).toEqual([]);
    expect(first.today).toMatchObject({ shiftWorked: true, iron: 112, energy: 4 });
    const twice = await caller.action
      .perform({ ...MILL_SHIFT, idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(twice).game).toMatchObject({
      reason: 'SHIFT_ALREADY_WORKED',
      nextAt: Date.UTC(2026, 8, 29),
    });

    clock.advance(DAY);
    const tuesday = await caller.character.me();
    expect(tuesday.iron).toBe(112 + 108);
    expect(tuesday.job).toMatchObject({ streak: 1, shiftWorkedToday: false });
    const second = await caller.action.perform({ ...MILL_SHIFT, idempotencyKey: randomUUID() });
    expect(second.rewards.iron).toEqual({ base: 108, bonus: 9, total: 117 });
    const paper = await PaperEntry.findOne({ characterId: me.id, day: tuesday.day.key }).lean();
    expect(paper!.desk.salary).toMatchObject({ jobName: 'Factory worker', days: 1, perDay: 108, total: 108 });
  });

  it('two missed days in a week keep the streak; the third ends it; the job is kept', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(MONDAY));
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    await caller.action.perform({ ...MILL_SHIFT, idempotencyKey: randomUUID() }); // Mon
    clock.advance(DAY);
    await caller.action.perform({ ...MILL_SHIFT, idempotencyKey: randomUUID() }); // Tue, streak 2
    clock.advance(DAY);
    expect((await caller.character.me()).job?.streak).toBe(2); // Wed
    clock.advance(DAY);
    expect(await caller.character.me()).toMatchObject({ job: { streak: 2 }, sickDaysLeft: 1 }); // Thu
    clock.advance(DAY);
    expect(await caller.character.me()).toMatchObject({ job: { streak: 2 }, sickDaysLeft: 0 }); // Fri
    clock.advance(DAY);
    expect(await caller.character.me()).toMatchObject({ job: { id: 'coalport-factory-worker', streak: 0 } }); // Sat
    void me;
  });

  it('8 days away pays 8 half-pays, streak 0, job kept', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(MONDAY));
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    await caller.action.perform({ ...MILL_SHIFT, idempotencyKey: randomUUID() });
    clock.advance(8 * DAY);
    const back = await caller.character.me();
    expect(back.iron).toBe(112 + 8 * 108);
    expect(back.job).toMatchObject({ id: 'coalport-factory-worker', streak: 0 });
    const paper = await caller.paper.today();
    // Slice 3: the desk's salary gains the pay ordinances' line (null: none in force).
    expect(paper.desk.salary).toEqual({
      jobName: 'Factory worker',
      days: 8,
      perDay: 108,
      total: 864,
      ordinance: null,
    });
    expect(paper.headlines[0]).toMatchObject({ headline: 'While You Were Away' });
    expect(paper.headlines[0]!.deck).toMatch(/^8 days of half pay banked \(864 Iron\)/);
    expect((await Character.findById(me.id).lean())!.job?.id).toBe('coalport-factory-worker');
  });
});
