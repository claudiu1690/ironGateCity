/**
 * QA (slices 0–1): atomicity, idempotency, lazy time, the §13.1a payload and permissions, checked
 * against the GDD and ADRs 0002 / 0005 / 0006 / 0008 with the in-memory replica set.
 */
import { randomUUID } from 'node:crypto';
import { getContent } from '@irongate/content';
import { ActionLog, Character, City, PaperEntry, RequestLog } from '@irongate/db';
import { createRng, dayKey, sumRewards } from '@irongate/rules';
import type { ActionResult } from '@irongate/rules';
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
const MIN = 60_000;
const CANVASS = { actionId: 'coalport.mill-gate.canvass', locationId: 'coalport.mill-gate' } as const;
const STUDY = { actionId: 'coalport.union-hall.reading-room', locationId: 'coalport.union-hall' } as const;
const COMMITTEE = { actionId: 'coalport.union-hall.committee', locationId: 'coalport.union-hall' } as const;

const settle = <T>(ps: Promise<T>[]) => Promise.allSettled(ps);
const fulfilled = <T>(rs: PromiseSettledResult<T>[]) =>
  rs.filter((r): r is PromiseFulfilledResult<T> => r.status === 'fulfilled').map((r) => r.value);
const rejected = <T>(rs: PromiseSettledResult<T>[]) =>
  rs.filter((r): r is PromiseRejectedResult => r.status === 'rejected').map((r) => gameData(r.reason));

async function drain(caller: ReturnType<typeof callerFor>, energy: number) {
  // Spend with intelligence taps (3 E) and canvasses (10 E) until `energy` is left, to set up a state.
  const me = await caller.character.me();
  let left = me.energy.value;
  while (left - 10 >= energy) {
    await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 });
    left -= 10;
  }
  while (left - 3 >= energy) {
    await caller.action.perform({
      actionId: 'coalport.anchor.listen',
      locationId: 'coalport.anchor',
      idempotencyKey: randomUUID(),
      times: 1,
    });
    left -= 3;
  }
  return left;
}

beforeAll(async () => {
  await setupDb('qa-server');
});
afterAll(teardownDb);

describe('permissions and input (CLAUDE.md engineering rule 1)', () => {
  it('every character procedure refuses a signed-out caller with UNAUTHORIZED; only health.ping is public', async () => {
    const anon = callerFor(null);
    const calls: Array<[string, () => Promise<unknown>]> = [
      ['character.me', () => anon.character.me()],
      [
        'character.placeStatPoint',
        () => anon.character.placeStatPoint({ stat: 'int', idempotencyKey: randomUUID() }),
      ],
      ['city.get', () => anon.city.get({ cityId: 'coalport' })],
      ['action.perform', () => anon.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 })],
      ['job.take', () => anon.job.take({ jobId: 'coalport-street-vendor', idempotencyKey: randomUUID() })],
      ['paper.today', () => anon.paper.today()],
      ['paper.markRead', () => anon.paper.markRead({ day: 1 })],
    ];
    for (const [name, call] of calls) {
      const err = await call().catch((e: unknown) => e);
      expect(gameData(err).code, name).toBe('UNAUTHORIZED');
    }
    await expect(anon.health.ping()).resolves.toMatchObject({ ok: true });
  });

  it('the client cannot choose the seed, the roll, the rewards or ×5: extra fields are ignored, times is 1 | 3', async () => {
    const { caller } = await freshCharacter();
    const forged = {
      ...CANVASS,
      idempotencyKey: randomUUID(),
      times: 1,
      seed: '00000000000000000000000000000000',
      roll: 1,
      rewards: { xp: { total: 9999 } },
      outcome: 'success',
    } as unknown as Parameters<typeof caller.action.perform>[0];
    const r = await caller.action.perform(forged);
    expect(r.seed).not.toBe('00000000000000000000000000000000');
    expect(r.attempts[0]!.roll).toBe(createRng(r.seed).roll100()); // the stored seed, not the client's
    expect([45, 23]).toContain(r.rewards.xp.total);
    for (const times of [2, 5, 0, -1]) {
      const bad = await caller.action
        .perform({ ...CANVASS, idempotencyKey: randomUUID(), times } as never)
        .catch((e: unknown) => e);
      expect(gameData(bad).code, `times ${times}`).toBe('BAD_REQUEST');
    }
    const notUuid = await caller.action
      .perform({ ...CANVASS, idempotencyKey: 'tap-1', times: 1 })
      .catch((e: unknown) => e);
    expect(gameData(notUuid).code).toBe('BAD_REQUEST');
    // Review 1 (§5.3): a point goes to STR, INT or AGI; CHA is worn (§8.2), so 'cha' is refused.
    const badStat = await caller.character
      .placeStatPoint({ stat: 'cha' as never, idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(badStat).code).toBe('BAD_REQUEST');
  });

  it('one character cannot act on another: every write is scoped to the session user', async () => {
    const a = await freshCharacter();
    const b = await freshCharacter();
    const key = randomUUID();
    const ra = await a.caller.action.perform({ ...CANVASS, idempotencyKey: key, times: 1 });
    // The same key from another character is a new action of that character, not a replay of A's.
    const rb = await b.caller.action.perform({ ...CANVASS, idempotencyKey: key, times: 1 });
    expect(rb.logId).not.toBe(ra.logId);
    expect(rb.character.id).toBe(b.me.id);
    expect((await a.caller.character.me()).energy.value).toBe(90);
  });
});

describe('atomicity and idempotency (ADR 0002, 0006, 0008)', () => {
  it('double tap on ×1 (same key, concurrent): one log, 10 Energy, identical results', async () => {
    const { caller, me } = await freshCharacter();
    const key = randomUUID();
    const rs = fulfilled(
      await settle(
        [1, 2, 3, 4].map(() => caller.action.perform({ ...CANVASS, idempotencyKey: key, times: 1 })),
      ),
    );
    expect(rs).toHaveLength(4);
    for (const r of rs) expect(r).toEqual(rs[0]);
    expect(await ActionLog.countDocuments({ characterId: me.id })).toBe(1);
    expect((await caller.character.me()).energy.value).toBe(90);
  });

  it('five different-key ×3 at once from 100 Energy: exactly three commit, Energy 10, and the books balance', async () => {
    const { caller, me } = await freshCharacter();
    const beforeCity = (await City.findById('coalport').lean())!.opinion.collective;
    const rs = await settle(
      [1, 2, 3, 4, 5].map(() =>
        caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 3 }),
      ),
    );
    const ok = fulfilled(rs);
    const refused = rejected(rs);
    expect(ok).toHaveLength(3);
    expect(refused.map((e) => e.game?.reason).sort()).toEqual(['NOT_ENOUGH_ENERGY', 'NOT_ENOUGH_ENERGY']);
    const after = await caller.character.me();
    expect(after.energy.value).toBe(10);
    expect(await ActionLog.countDocuments({ characterId: me.id })).toBe(3);
    // Iron, XP, FXP and the tally equal the sum of the committed results (nothing lost or doubled).
    const total = sumRewards(ok.map((r) => r.rewards));
    expect(after.iron).toBe(total.iron.total);
    expect(after.xp).toBe(total.xp.total);
    expect(after.today).toMatchObject({
      energy: 90,
      attempts: 9,
      xp: total.xp.total,
      iron: total.iron.total,
    });
    // Each run saw the Energy the previous one left (100 → 70 → 40 → 10 in some order).
    expect(ok.map((r) => r.effects.energy.before).sort((x, y) => x - y)).toEqual([40, 70, 100]);
    const afterCity = (await City.findById('coalport').lean())!.opinion.collective;
    const applied = ok.reduce((s, r) => s + (r.effects.opinion?.applied ?? 0), 0);
    expect(Math.round((afterCity - beforeCity) * 1000)).toBe(Math.round(applied * 1000)); // ADR 0010: the meter moved by exactly the applied swings
  });

  it('mixed ×1 and ×3 with different keys at once: Energy never goes below 0 and equals 100 − the sum of committed costs', async () => {
    const { caller, me } = await freshCharacter();
    const rs = await settle([
      ...[1, 2, 3, 4].map(() =>
        caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 3 }),
      ),
      ...[1, 2, 3, 4].map(() =>
        caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 }),
      ),
    ]);
    const ok = fulfilled(rs);
    const spent = ok.reduce((s, r) => s + r.action.times * 10, 0);
    expect(spent).toBeLessThanOrEqual(100);
    expect((await caller.character.me()).energy.value).toBe(100 - spent);
    expect(await ActionLog.countDocuments({ characterId: me.id })).toBe(ok.length);
    for (const e of rejected(rs)) expect(['NOT_ENOUGH_ENERGY', 'ACTION_CONFLICT']).toContain(e.game?.reason);
  });

  it('×3 with too little Energy spends nothing: Energy, Rested, version, the meter and the logs are untouched', async () => {
    const { caller, me, clock } = await freshCharacter();
    await drain(caller, 20);
    clock.advance(9 * MIN); // no tick yet
    const doc = await Character.findById(me.id).lean();
    const city = await City.findById('coalport').lean();
    const logs = await ActionLog.countDocuments({ characterId: me.id });
    const err = await caller.action
      .perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 3 })
      .catch((e: unknown) => e);
    expect(gameData(err)).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'NOT_ENOUGH_ENERGY', energy: 20, cost: 30, times: 3 },
    });
    expect(await Character.findById(me.id).lean()).toEqual(doc);
    expect(await City.findById('coalport').lean()).toEqual(city);
    expect(await ActionLog.countDocuments({ characterId: me.id })).toBe(logs);
    const study = await caller.action
      .perform({ ...STUDY, idempotencyKey: randomUUID(), times: 1 })
      .catch((e: unknown) => e);
    expect(gameData(study).game).toMatchObject({ reason: 'NOT_ENOUGH_ENERGY', cost: 44 });
    expect(await Character.findById(me.id).lean()).toEqual(doc);
  });

  it('a key is bound to its action and count: reuse with ×1, another action or another kind is KEY_REUSED', async () => {
    const { caller } = await freshCharacter();
    const key = randomUUID();
    await caller.action.perform({ ...CANVASS, idempotencyKey: key, times: 3 });
    for (const input of [
      { ...CANVASS, idempotencyKey: key, times: 1 as const },
      { ...COMMITTEE, idempotencyKey: key, times: 3 as const },
    ]) {
      const err = await caller.action.perform(input).catch((e: unknown) => e);
      expect(gameData(err)).toMatchObject({ code: 'CONFLICT', game: { reason: 'KEY_REUSED' } });
    }
    const jobKey = randomUUID();
    await caller.job.take({ jobId: 'coalport-street-vendor', idempotencyKey: jobKey });
    const statErr = await caller.character
      .placeStatPoint({ stat: 'int', idempotencyKey: jobKey })
      .catch((e: unknown) => e);
    expect(gameData(statErr).game?.reason).toBe('KEY_REUSED');
    const otherJob = await caller.job
      .take({ jobId: 'coalport-factory-worker', idempotencyKey: jobKey })
      .catch((e: unknown) => e);
    expect(gameData(otherJob).game?.reason).toBe('KEY_REUSED');
  });

  it('job.take: five concurrent taps with one key → one request log, one job, no Energy spent', async () => {
    const { caller, me } = await freshCharacter();
    const key = randomUUID();
    await settle(
      [1, 2, 3, 4, 5].map(() => caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: key })),
    );
    expect(await RequestLog.countDocuments({ characterId: me.id, kind: 'job.take' })).toBe(1);
    const after = await caller.character.me();
    expect(after.job?.id).toBe('coalport-factory-worker');
    expect(after.energy.value).toBe(100);
  });

  // M1 (QA slices 0–1, "concurrent retry with the same key returns a refusal"; fixed in fix round 1):
  // ADR 0002 / 0008 say a
  // retried key returns the stored result. When the duplicate arrives while the first request is still
  // in its transaction, the loser re-runs the rules against the winner's state and is refused instead.
  // The loser now looks up the stored result before refusing or retrying.
  const everyRunIdentical = async (run: () => Promise<PromiseSettledResult<unknown>[]>) => {
    for (let i = 0; i < 5; i++) {
      const rs = await run();
      const reasons = rs.map((r) => (r.status === 'fulfilled' ? 'ok' : gameData(r.reason).game?.reason));
      expect(reasons).toEqual(rs.map(() => 'ok'));
      const values = fulfilled(rs);
      for (const v of values) expect(v).toEqual(values[0]);
    }
  };

  it('M1: job.take — every concurrent tap with one key gets the stored result (not ALREADY_IN_JOB)', async () => {
    await everyRunIdentical(async () => {
      const { caller } = await freshCharacter();
      const key = randomUUID();
      return settle(
        [1, 2, 3].map(() => caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: key })),
      );
    });
  });

  it('M1: placeStatPoint — every concurrent tap with one key gets the stored result (not NO_STAT_POINTS)', async () => {
    await everyRunIdentical(async () => {
      const { caller, me } = await freshCharacter();
      await Character.updateOne({ _id: me.id }, { $set: { statPointsPending: 1 } });
      const key = randomUUID();
      return settle(
        [1, 2, 3].map(() => caller.character.placeStatPoint({ stat: 'int', idempotencyKey: key })),
      );
    });
  });

  it('M1: action.perform at the Energy limit — every concurrent retry with one key gets the stored result (not NOT_ENOUGH_ENERGY)', async () => {
    await everyRunIdentical(async () => {
      const { caller, me } = await freshCharacter();
      await Character.updateOne({ _id: me.id }, { $set: { 'energy.value': 10 } });
      const key = randomUUID();
      return settle(
        [1, 2, 3].map(() => caller.action.perform({ ...CANVASS, idempotencyKey: key, times: 1 })),
      );
    });
  });

  // Review 1 (§9.1): was "M1: a shift"; the shift is gone, so the same retry rule is checked on a switch.
  it('M1: a job switch — every concurrent tap with one key gets the stored result (not ALREADY_IN_JOB)', async () => {
    await everyRunIdentical(async () => {
      const { caller } = await freshCharacter();
      await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
      const key = randomUUID();
      return settle(
        [1, 2, 3].map(() => caller.job.take({ jobId: 'coalport-street-vendor', idempotencyKey: key })),
      );
    });
  });

  it('job switches racing with different keys: every committed switch costs nothing and seniority ends at 0', async () => {
    const { caller, clock } = await freshCharacter();
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    clock.advance(2 * DAY);
    const before = await caller.character.me();
    expect(before.job?.seniority.days).toBeGreaterThan(0);
    const rs = await settle(
      ['coalport-street-vendor', 'coalport-factory-worker', 'coalport-street-vendor'].map((jobId) =>
        caller.job.take({ jobId, idempotencyKey: randomUUID() }),
      ),
    );
    expect(fulfilled(rs).length).toBeGreaterThanOrEqual(1);
    const after = await caller.character.me();
    // Review 1 (§9.1): was "costs exactly 2 Energy"; a switch is free and resets seniority.
    expect(after.energy.value).toBe(before.energy.value);
    expect(after.rested).toBe(before.rested);
    expect(after.iron).toBe(before.iron);
    expect(after.job?.seniority).toEqual({ days: 0, pct: 0 });
    for (const e of rejected(rs)) expect(['ALREADY_IN_JOB', 'ACTION_CONFLICT']).toContain(e.game?.reason);
  });

  it('stat points: one key placed five times at once → one point; five keys with two pending → exactly two', async () => {
    const { caller, me } = await freshCharacter();
    await Character.updateOne({ _id: me.id }, { $set: { statPointsPending: 2 } });
    const key = randomUUID();
    await settle(
      [1, 2, 3, 4, 5].map(() => caller.character.placeStatPoint({ stat: 'int', idempotencyKey: key })),
    );
    let c = await caller.character.me();
    expect(c.stats.int).toBe(13);
    expect(c.statPointsPending).toBe(1);
    await Character.updateOne({ _id: me.id }, { $set: { statPointsPending: 2 } });
    const rs = await settle(
      [1, 2, 3, 4, 5].map(() =>
        caller.character.placeStatPoint({ stat: 'str', idempotencyKey: randomUUID() }),
      ),
    );
    c = await caller.character.me();
    expect(fulfilled(rs)).toHaveLength(2);
    expect(c.stats.str).toBe(12);
    expect(c.statPointsPending).toBe(0);
    for (const e of rejected(rs)) expect(['NO_STAT_POINTS', 'ACTION_CONFLICT']).toContain(e.game?.reason);
  });

  // Review 1 (§9.1): was "two shifts at once: one pays"; the wage is paid by the settlement, so the
  // race to guard is every first touch of a new day at once, actions included: one wage, once.
  it('the first touches of a new day at once (reads and two actions): the wage is credited once', async () => {
    const { caller, me, clock } = await freshCharacter();
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    clock.advance(DAY);
    const rs = await settle<unknown>([
      caller.character.me(),
      caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 }),
      caller.paper.today(),
      caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 }),
      caller.city.get({ cityId: 'coalport' }),
    ]);
    const actions = fulfilled(rs).filter(
      (v): v is ActionResult => typeof v === 'object' && v !== null && 'logId' in v,
    );
    const actionIron = actions.reduce((sum, r) => sum + r.rewards.iron.total, 0);
    const c = await caller.character.me();
    expect(c.iron).toBe(220 + actionIron); // 216 + seniority 1 (+4), once
    expect(await PaperEntry.countDocuments({ characterId: me.id })).toBe(2);
  });
});

describe('lazy time (ADR 0005) and "being away costs opportunity, never assets" (§4.3)', () => {
  it('the paper is generated exactly once per touched day, even with every read racing, and never for untouched days', async () => {
    const clock = testClock(Date.UTC(2026, 8, 28, 23, 30));
    const user = newUser();
    // Slice 2: no auto-create (ADR 0011); the recruit is seeded unsettled for today.
    await seedRecruit(user, clock.now());
    const caller = callerFor(user, clock.now);
    await settle<unknown>([
      caller.character.me(),
      caller.paper.today(),
      caller.city.get({ cityId: 'coalport' }),
      caller.character.me(),
    ]);
    const id = (await Character.findOne({ userId: user.id }).lean())!._id;
    const touched = [dayKey(clock.now())];
    for (const hop of [DAY, DAY, 3 * DAY, 45 * MIN, DAY]) {
      clock.advance(hop);
      await settle<unknown>([
        caller.character.me(),
        caller.paper.today(),
        caller.city.get({ cityId: 'coalport' }),
        caller.paper.today(),
      ]);
      if (!touched.includes(dayKey(clock.now()))) touched.push(dayKey(clock.now()));
    }
    const days = (await PaperEntry.find({ characterId: id }, { day: 1 }).sort({ day: 1 }).lean()).map(
      (p) => p.day,
    );
    expect(days).toEqual(touched);
  });

  it('30 days away: nothing owned is lost; salary is 14 days at the full rate; Energy full, Rested 200; job kept', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(Date.UTC(2026, 8, 28, 9)));
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 3 });
    await caller.action.perform({ ...STUDY, idempotencyKey: randomUUID(), times: 1 });
    const before = await caller.character.me();
    clock.advance(30 * DAY);
    const after = await caller.character.me();
    // Review 1 (§9.1, §4.3): full pay, the most recent 14 boundaries, all at the capped +20 %: 259.
    expect(after.iron).toBe(before.iron + 14 * 259);
    expect(after).toMatchObject({
      xp: before.xp,
      level: before.level,
      fxp: before.fxp,
      pc: before.pc,
      stats: before.stats,
      statPointsPending: before.statPointsPending,
    });
    expect(after.standing.successes).toBe(before.standing.successes);
    // Absence never lowers a rate (§4.3 rule 2): seniority counted all 30 days (60 under Long Service).
    expect(after.job).toMatchObject({ id: 'coalport-factory-worker', seniority: { pct: 20 } });
    expect(after.job!.seniority.days).toBeGreaterThanOrEqual(30);
    expect(after.energy.value).toBe(100);
    expect(after.rested).toBe(200);
    const paper = await caller.paper.today();
    // Review 1: the away headline is not asserted here: on this return the Five / Ten Days In headlines
    // take both personal slots (reported to the lead as a question); the desk carries the numbers.
    expect(paper.desk.salary).toMatchObject({
      days: 14,
      perDay: 216,
      seniority: { pct: 20, amount: 14 * 43 },
      total: 3_626,
    });
    void me;
  });

  it('Energy and Rested need no job: a full bar at +5 / 10 min, Rested banking while full, read-only (no write on read)', async () => {
    const { caller, me, clock } = await freshCharacter();
    await drain(caller, 0);
    clock.advance(200 * MIN - 1);
    expect((await caller.character.me()).energy.value).toBe(95);
    clock.advance(1);
    const doc = await Character.findById(me.id).lean();
    const full = await caller.character.me();
    expect(full.energy).toMatchObject({ value: 100, fullAt: null, nextTickAt: null });
    clock.advance(100 * MIN);
    expect((await caller.character.me()).rested).toBe(50);
    expect(await Character.findById(me.id).lean()).toEqual(doc); // same day: reads write nothing
  });

  it('Party orders rotate by the City Day number with no job running (Mon 28 Sep → Tue → Wed)', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(Date.UTC(2026, 8, 28, 12)));
    const ids = [me.orders.items.map((o) => o.id)];
    for (let d = 0; d < 2; d++) {
      clock.advance(DAY);
      ids.push((await caller.character.me()).orders.items.map((o) => o.id));
    }
    // Review 1 (§13.7): slot C rotates Train once · Six wins · Five attempts; Take a job is
    // welcome-only, so a player with no job past the welcome day is not sent to take one.
    expect(ids).toEqual([
      ['dir.canvass-coalport', 'dir.report', 'dir.sharpen-up'], // day 270: A[0], B[2], C[0]
      ['dir.shift-change', 'dir.ears-open', 'dir.full-day'],
      ['dir.foundry-row', 'dir.paper-the-town', 'dir.five-in-the-book'],
    ]);
    expect(me.orders.items[2]!.title).toBe('Study, lift or run once in Coalport');
  });

  // Review 1 (§9.1): was "the streak across a weekend and the Monday refill"; streak and sick days
  // are gone. The nearest rule: seniority counts the days away, the job is never lost, pay resumes.
  it('seniority across a weekend away: every boundary counts, the job is kept, the back pay is exact', async () => {
    // Mon 21 Sep: take the job, touch Mon–Wed; away Thu–Sun; back Mon 28 Sep.
    const clock = testClock(Date.UTC(2026, 8, 21, 8));
    const user = newUser();
    await seedRecruit(user, clock.now()); // slice 2: no auto-create (ADR 0011)
    await noOrdinance('coalport'); // slice 3: one seniority day a boundary, with no Long Service Order
    const caller = callerFor(user, clock.now);
    await caller.character.me();
    await caller.job.take({ jobId: 'coalport-factory-worker', idempotencyKey: randomUUID() });
    clock.advance(DAY);
    expect((await caller.character.me()).iron).toBe(220);
    clock.advance(DAY);
    expect((await caller.character.me()).iron).toBe(220 + 225);
    clock.advance(5 * DAY); // Mon 28
    const c = await caller.character.me();
    expect(c.job).toMatchObject({ id: 'coalport-factory-worker', seniority: { days: 7, pct: 14 } });
    // Seniority lines for days 1–7 on 216: 4, 9, 13, 17, 22, 26, 30.
    expect(c.iron).toBe(7 * 216 + 121);
    const paper = await caller.paper.today();
    expect(paper.desk.salary).toMatchObject({
      days: 5,
      perDay: 216,
      seniority: { days: 7, pct: 14, amount: 13 + 17 + 22 + 26 + 30 },
      total: 5 * 216 + 108,
    });
  });
});

describe('Morning Paper text (§3.3, content §7.4)', () => {
  // m1 (QA slices 0–1, "While You Were Away tells a jobless player 0 days of half pay"; fixed in fix
  // round 1): hl.away needs at least one half-pay credited; hl.away-no-job covers the rest (content §13.1).
  it('m1: a player without a job, away 3 days, is not told "0 days of half pay banked (0 Iron)"', async () => {
    const { caller, clock } = await freshCharacter(testClock(Date.UTC(2026, 8, 28, 9)));
    clock.advance(3 * DAY);
    const decks = (await caller.paper.today()).headlines.map((h) => h.deck ?? '');
    // Review 1: "half pay" became "pay" (§9.1).
    expect(decks.join(' ')).not.toMatch(/\b0 days of (half )?pay|\(0 Iron\)/);
  });
});

describe('the result modal payload (§13.1a, tech design §9)', () => {
  it('×3 carries every roll and chance, the tiles, the tags, the knock-on effects and the "n of 3" stamp; the text follows the majority', async () => {
    const content = getContent();
    const text = content.action(CANVASS.actionId)!.action.text as {
      success: { headline: string };
      partial: { headline: string };
    };
    const { caller, clock } = await freshCharacter();
    clock.advance(100 * MIN); // bank 50 Rested
    const r: ActionResult = await caller.action.perform({
      ...CANVASS,
      idempotencyKey: randomUUID(),
      times: 3,
    });

    expect(r.kind).toBe('checked');
    expect(r.action).toMatchObject({ id: CANVASS.actionId, times: 3, tier: 1 });
    expect(r.stamp).toBe('batch');
    const wins = r.attempts.filter((a) => a.outcome === 'success').length;
    expect(r.successes).toBe(wins);
    expect(r.headline).toBe(wins >= 2 ? text.success.headline : text.partial.headline);
    // Section 3: one row per attempt, each with its breakdown, roll and outcome; replayable from the seed.
    expect(r.attempts).toHaveLength(3);
    const rng = createRng(r.seed);
    for (const a of r.attempts) {
      expect(a.roll).toBe(rng.roll100());
      expect(a.check).toMatchObject({ base: 50, difficulty: 8, stats: ['int'] });
      expect(a.outcome).toBe(a.roll <= a.check.chance ? 'success' : 'partial');
      expect(a.rewards.xp.total).toBe(a.rewards.xp.base + a.rewards.xp.bonus);
    }
    // Section 4: four tiles that are the sum of the rows, with base and bonus; the Rested tag with its numbers.
    expect(r.rewards).toEqual(sumRewards(r.attempts.map((a) => a.rewards)));
    expect(r.bonusTags).toContainEqual({
      id: 'rested',
      label: 'Rested',
      note: '30 of 30 Energy, +50 % XP and Iron',
    });
    expect(r.bonusTags.some((t) => t.id === 'order')).toBe(true); // Be at the gate is open today
    // Section 5: knock-on effects.
    expect(r.effects.energy).toMatchObject({ before: 100, after: 70 });
    expect(r.effects.rested).toEqual({ before: 50, after: 20 });
    expect(r.effects.opinion).toMatchObject({ cityId: 'coalport', factionId: 'collective' });
    expect(r.effects.opinion!.shareAfter).toBeCloseTo(
      r.effects.opinion!.shareBefore + r.effects.opinion!.applied,
      3,
    );
    expect(r.effects.standing?.after.successes).toBe(wins);
    expect(r.effects.orders[0]).toMatchObject({
      id: 'dir.shift-change',
      before: 0,
      after: 2,
      target: 2,
      done: true,
      fxp: 20,
    });
    expect(r.effects.fxp.after - r.effects.fxp.before).toBe(r.rewards.fxp.total + 20);
    expect(r.today).toMatchObject({ energy: 30, attempts: 3, successes: wins, ordersDone: 1 });
    // Section 6: Again costs.
    expect(r.again).toEqual({ cost1: 10, cost3: 30 });
    expect(r.art).toMatchObject({ rung: 'map-crop', x: 0.75, y: 0.2 });
  });

  it('council at the Union Hall: FXP ×1.5, no opinion effect, the Collective hall scene', async () => {
    const { caller } = await freshCharacter();
    const r = await caller.action.perform({ ...COMMITTEE, idempotencyKey: randomUUID(), times: 1 });
    expect([9, 5]).toContain(r.rewards.fxp.base);
    expect(r.rewards.opinion).toBe(0);
    expect(r.effects.opinion).toBeNull();
    expect(r.art).toMatchObject({ rung: 'scene', asset: { id: 'scene.union-hq' } });
  });
});
