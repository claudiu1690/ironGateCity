import { randomUUID } from 'node:crypto';
import { Character, PaperEntry } from '@irongate/db';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  callerFor,
  freshCharacter,
  gameData,
  newUser,
  noOrdinance,
  seedRecruit,
  setupDb,
  teardownDb,
  testClock,
} from './helpers';

const DAY = 86_400_000;
const MONDAY = Date.UTC(2026, 8, 28, 9); // day index 270

/** Review 1: a recruit on its welcome day (arrived now), whose slot C is "Take a job at …". */
async function welcomeRecruit(clock = testClock(MONDAY)) {
  const user = newUser('Mara Lenk');
  await seedRecruit(user, clock.now(), { arrivedAt: clock.now() });
  const caller = callerFor(user, clock.now);
  const me = await caller.character.me();
  return { user, caller, me, clock };
}

/** Review 1 (GDD §9.1): the seniority line on 216 for the k-th boundary held (+2 % a day, to +20 %). */
const seniorityLine = (k: number) => Math.round(216 * 0.02 * Math.min(k, 10) + 1e-9);

beforeAll(async () => {
  await setupDb('jobs-test');
});
afterAll(teardownDb);

describe('job.take (§9.1)', () => {
  it('the first job is free and completes "Take a job" (+20 FXP); a retry returns the same result', async () => {
    const { caller, me } = await welcomeRecruit();
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    // Review 1 (§13.7): "Take a job at {place}" is the welcome set's slot C, no longer the rotation's.
    expect(me.orders.items[2]).toMatchObject({
      id: 'dir.take-a-job',
      title: 'Take a job at the Mill Gate',
      done: false,
    });
    const key = randomUUID();
    const r = await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: key });
    // Review 1: a job is a wage: no shift Energy and no streak; seniority starts at 0, paid at midnight.
    expect(r.job).toEqual({
      id: 'coalport-factory-worker',
      name: 'Factory worker',
      locationId: 'coalport.mill-gate',
      locationName: expect.any(String),
      dailyPay: 216,
      seniority: { days: 0, pct: 0 },
      paidAt: Date.UTC(2026, 8, 29),
    });
    expect(r.outcome).toMatchObject({
      switched: false,
      orderCompleted: true,
      fxp: 20,
      firstPayAt: Date.UTC(2026, 8, 29),
    });
    expect(r.character).toMatchObject({ fxp: 20, energy: { value: 100 } });
    expect(r.character.orders.items[2]).toMatchObject({ done: true });
    expect(await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: key })).toEqual(r);
    const again = await caller.job
      .take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(again)).toMatchObject({ code: 'BAD_REQUEST', game: { reason: 'ALREADY_IN_JOB' } });
  });

  it('switching is free (no Energy, Rested untouched) and resets seniority to 0', async () => {
    const { caller, clock } = await freshCharacter(testClock(MONDAY));
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    clock.advance(3 * DAY);
    const before = await caller.character.me();
    expect(before.job).toMatchObject({ id: 'coalport-factory-worker', seniority: { days: 3, pct: 6 } });
    const r = await caller.job.take({ jobId: 'coalport-street-vendor', idempotencyKey: randomUUID() });
    // Review 1 (§9.1): was "switching costs 2 Energy"; a switch is now free and resets seniority.
    expect(r.outcome.switched).toBe(true);
    expect(r.character.energy.value).toBe(before.energy.value);
    expect(r.character.rested).toBe(before.rested);
    expect(r.character.iron).toBe(before.iron);
    expect(r.job).toMatchObject({
      id: 'coalport-street-vendor',
      dailyPay: 100,
      seniority: { days: 0, pct: 0 },
    });
    expect((await Character.findById(before.id).lean())!.job).toMatchObject({
      id: 'coalport-street-vendor',
      seniority: 0,
    });
    // The next boundary pays the new job at seniority 1: 100 + 2.
    clock.advance(DAY);
    expect((await caller.character.me()).iron).toBe(before.iron + 102);
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

describe('the wage and seniority (review 1, GDD §9.1)', () => {
  it('the first boundary pays 216 + 4 = 220, the second 216 + 9; once per boundary; the desk says so', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(MONDAY));
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    // Review 1: there is no shift action; the Mill Gate's shift ticket is gone.
    const city = await caller.city.get({ cityId: 'coalport' });
    expect(city.locations.flatMap((l) => l.actions).some((a) => a.id === 'coalport.mill-gate.shift')).toBe(
      false,
    );
    // Review 1: with no job, the desk names where the Jobs cards are, in pin order.
    const noJob = await caller.paper.today();
    expect(noJob.desk.job).toBeNull();
    expect(noJob.desk.jobPlaces).toEqual(['the Mill Gate', 'Market Row', 'Harbour Quays']);
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    expect((await caller.character.me()).iron).toBe(0); // nothing is paid on the day it is taken

    clock.set(Date.UTC(2026, 8, 29, 0, 0, 1)); // just past the boundary
    const tuesday = await caller.character.me();
    expect(tuesday.iron).toBe(220);
    expect(tuesday.job).toMatchObject({ seniority: { days: 1, pct: 2 }, paidAt: Date.UTC(2026, 8, 30) });
    expect((await caller.character.me()).iron).toBe(220); // a second read the same day pays nothing
    const paper = await caller.paper.today();
    expect(paper.desk.salary).toEqual({
      jobName: 'Factory worker',
      days: 1,
      perDay: 216,
      seniority: { days: 1, pct: 2, amount: 4 },
      total: 220,
      ordinance: null,
    });
    expect(paper.desk.job).toEqual({ name: 'Factory worker', dailyPay: 216, seniority: { days: 1, pct: 2 } });
    // The Today tally carries no pay (it lands at the boundary): Iron today is from actions only.
    expect(tuesday.today.iron).toBe(0);

    clock.set(Date.UTC(2026, 8, 30, 9));
    expect((await caller.character.me()).iron).toBe(220 + 225);
    const stored = await PaperEntry.findOne({ characterId: me.id, day: tuesday.day.key + 1 }).lean();
    expect(stored!.desk.salary).toMatchObject({ days: 1, perDay: 216, total: 225 });
  });

  it('seniority caps at +20 % after ten days (216 → 259); lazy = eager over twelve days', async () => {
    const eager = await freshCharacter(testClock(MONDAY), 'Eager');
    const lazy = await freshCharacter(testClock(MONDAY), 'Lazy');
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    await eager.caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    await lazy.caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    let expected = 0;
    for (let k = 1; k <= 12; k++) {
      eager.clock.advance(DAY);
      expected += 216 + seniorityLine(k);
      expect((await eager.caller.character.me()).iron).toBe(expected);
    }
    // The 10th, 11th and 12th boundaries each pay the capped rate: 216 + 43 = 259.
    expect(216 + seniorityLine(10)).toBe(259);
    expect(expected).toBe(12 * 216 + 324);
    lazy.clock.advance(12 * DAY);
    const back = await lazy.caller.character.me();
    expect(back.iron).toBe(expected);
    expect(back.job).toMatchObject({ seniority: { days: 12, pct: 20 } });
    const paper = await lazy.caller.paper.today();
    expect(paper.desk.salary).toMatchObject({
      days: 12,
      perDay: 216,
      seniority: { days: 12, pct: 20, amount: 324 },
      total: expected,
    });
  });

  it('16 days away pays the most recent 14 days; seniority counts all 16; the job is kept (§4.3)', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(MONDAY));
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    clock.advance(16 * DAY);
    const back = await caller.character.me();
    // Review 1: was "8 days away pays 8 half-pays, streak 0"; now full pay, capped at 14 days.
    let total = 0;
    for (let k = 3; k <= 16; k++) total += 216 + seniorityLine(k);
    expect(total).toBe(3507);
    expect(back.iron).toBe(total);
    expect(back.job).toMatchObject({ id: 'coalport-factory-worker', seniority: { days: 16, pct: 20 } });
    const paper = await caller.paper.today();
    expect(paper.desk.salary).toEqual({
      jobName: 'Factory worker',
      days: 14,
      perDay: 216,
      seniority: { days: 16, pct: 20, amount: 483 },
      total: 3507,
      ordinance: null,
    });
    // Not asserted here: after 16 days the Five / Ten Days In headlines fill both personal slots and
    // push out "While You Were Away" (reported to the lead; the away deck is checked below at 3 days).
    expect((await Character.findById(me.id).lean())!.job).toMatchObject({
      id: 'coalport-factory-worker',
      seniority: 16,
    });
  });

  it('3 days away: "3 days of pay banked (674 Iron)" (review 1: was half pay)', async () => {
    const { caller, clock } = await freshCharacter(testClock(MONDAY));
    await noOrdinance('coalport');
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    clock.advance(3 * DAY);
    const paper = await caller.paper.today();
    expect(paper.headlines[0]).toMatchObject({ headline: 'While You Were Away' });
    // Review 1: "{days} days of pay banked": 216 + 4, 216 + 9, 216 + 13.
    expect(paper.headlines[0]!.deck).toMatch(/^3 days of pay banked \(674 Iron\)/);
  });

  it('a job stored before review 1 (no seniority) reads as 0 and is paid from 0', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(MONDAY));
    await noOrdinance('coalport');
    await Character.collection.updateOne(
      { _id: new Types.ObjectId(me.id) },
      { $set: { job: { id: 'coalport-factory-worker', since: me.day.key - 3 } } },
    );
    expect((await caller.character.me()).job).toMatchObject({ seniority: { days: 0, pct: 0 } });
    clock.advance(DAY);
    const next = await caller.character.me();
    expect(next.iron).toBe(220);
    expect(next.job).toMatchObject({ seniority: { days: 1, pct: 2 } });
  });
});
