import { randomUUID } from 'node:crypto';
import { ActionLog, Character, City } from '@irongate/db';
import { createRng } from '@irongate/rules';
import type { ActionResult, OpinionShares } from '@irongate/rules';
import type { TRPCError } from '@trpc/server';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { callerFor, freshCharacter, gameData, setupDb, teardownDb, testClock, noOrdinance } from './helpers';

// Review 1 (§13.7): slot C now rotates Train once · Six wins · Five attempts (day mod 3), so day 271
// (29 Sep) has Six wins, which any Success advances. These tests run on Monday 19 October 2026, day
// index 291, which has slice 1's three: the Mill Gate canvass (2), Gather intelligence (2) and Train
// once (1). The recruit is not on its welcome day (no First day row).
const ORDERS_DAY = Date.UTC(2026, 9, 19, 9);
const CANVASS = { actionId: 'coalport.mill-gate.canvass', locationId: 'coalport.mill-gate' } as const;
const LISTEN = { actionId: 'coalport.anchor.listen', locationId: 'coalport.anchor' } as const;
const STUDY = { actionId: 'coalport.union-hall.reading-room', locationId: 'coalport.union-hall' } as const;

const sumK = (s: OpinionShares) => Math.round((s.vanguard + s.collective + s.alliance + s.neutral) * 1000);
const collective = async () => (await City.findById('coalport').lean())!.opinion.collective;

beforeAll(async () => {
  await setupDb('action-test');
});
afterAll(teardownDb);

describe('city.get v2', () => {
  it('returns Coalport with 6 numbered hotspots, tickets, jobs and the day map', async () => {
    const { caller } = await freshCharacter(testClock(ORDERS_DAY));
    await noOrdinance('coalport'); // slice 3: the slice-1 numbers, with no ordinance in force
    const city = await caller.city.get({ cityId: 'coalport' });
    expect(city).toMatchObject({ id: 'coalport', role: 'home', isNight: false });
    expect(city.map.day).toMatchObject({
      id: 'map.coalport.day',
      width: 5056,
      height: 3392,
      widths: [1280, 2560],
    });
    expect(city.standing).toMatchObject({ level: 0, name: 'Stranger', nextName: 'Familiar', next: 10 });
    expect(city.locations.map((l) => [l.n, l.name])).toEqual([
      [1, 'Mill Gate'],
      [2, 'Market Row'],
      [3, 'Union Hall'],
      [4, 'Foundry Row'],
      [5, 'Harbour Quays'],
      [6, 'The Anchor'],
    ]);
    const mill = city.locations[0]!;
    expect(mill.map).toEqual({ x: 0.36, y: 0.44 });
    expect(mill.actions[0]).toMatchObject({
      id: CANVASS.actionId,
      kind: 'checked',
      energy: 10,
      energy3: 30,
      preview: { stats: ['int'], chance: 66 },
      order: {
        id: 'dir.shift-change',
        title: 'Canvass the shift change at the Mill Gate',
        progress: 0,
        target: 2,
      },
      locked: null,
    });
    expect(mill.actions[1]).toMatchObject({
      kind: 'checked',
      preview: { stats: ['cha', 'int'], chance: 46 },
    });
    // Review 1 (§9.1): a job is a wage: no shift ticket, and the Jobs card has no switch cost.
    expect(mill.actions.map((a) => a.kind)).not.toContain('shift');
    expect(mill.jobs).toEqual([
      expect.objectContaining({
        jobId: 'coalport-factory-worker',
        pay: 216,
        held: false,
        locked: null,
        isSwitch: false,
      }),
    ]);
    const study = city.locations[2]!.actions[2]!;
    expect(study).toMatchObject({
      kind: 'training',
      energy: 44,
      energy3: null, // ×1 only (§8.5)
      trains: { stat: 'int', from: 12, to: 13 },
    });
    const driver = city.locations[4]!.jobs[0]!;
    expect(driver.unmet).toEqual([
      { reason: 'LEVEL', need: 3 },
      { reason: 'STAT', stat: 'agi', need: 10 },
    ]);
  });

  it('is NOT_FOUND for an unknown city', async () => {
    const { caller } = await freshCharacter(testClock(ORDERS_DAY));
    const err = await caller.city.get({ cityId: 'atlantis' }).catch((e: unknown) => e);
    expect(gameData(err)).toEqual({
      code: 'NOT_FOUND',
      game: { reason: 'UNKNOWN_CITY', cityId: 'atlantis' },
    });
  });
});

describe('action.perform ×1', () => {
  it('spends 10 Energy, pays by outcome, moves the meter and writes a log with its seed', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(ORDERS_DAY));
    const before = await collective();
    const key = randomUUID();
    const result = await caller.action.perform({ ...CANVASS, idempotencyKey: key, times: 1 });

    expect(result).toMatchObject({ kind: 'checked', action: { times: 1 }, idempotencyKey: key });
    expect(result.performedAt).toBe(new Date(clock.now()).toISOString());
    expect(result.art).toMatchObject({
      rung: 'map-crop',
      asset: { id: 'map.coalport.day' },
      x: 0.36,
      y: 0.44,
    });
    const success = result.stamp === 'success';
    expect(result.successes).toBe(success ? 1 : 0);
    expect(result.headline).toBe(success ? 'The whistle goes, and they stop' : 'Most of them walk past');
    expect(result.rewards.fxp.base).toBe(success ? 6 : 3);
    expect(result.rewards.fxp.bonus).toBe(success ? 2 : 1); // the Mill Gate canvass order is open
    expect(result.effects.opinion).toMatchObject({
      delta: success ? 0.05 : 0.025,
      applied: success ? 0.05 : 0.025,
    });
    expect(result.effects.orders).toEqual([
      {
        id: 'dir.shift-change',
        title: 'Canvass the shift change at the Mill Gate',
        before: 0,
        after: 1,
        target: 2,
        done: false,
        fxp: 0,
      },
    ]);
    expect(result.bonusTags).toContainEqual({ id: 'order', label: 'Party order', note: '+25 % FXP' });
    expect(result.today).toMatchObject({ energy: 10, attempts: 1, successes: result.successes });
    expect(result.again).toEqual({ cost1: 10, cost3: 30 });
    expect(await collective()).toBeCloseTo(before + result.effects.opinion!.applied, 6);

    const log = await ActionLog.findOne({ idempotencyKey: key }).lean();
    expect(log).toMatchObject({ kind: 'checked', times: 1, outcome: result.stamp, seed: result.seed });
    expect(log!.txAttempts).toBeGreaterThanOrEqual(1);
    expect(log!.result).toEqual(result);
    expect(await Character.findById(me.id).lean()).toMatchObject({ energy: { value: 90 } });
  });

  it('refuses unknown actions and locations, WRONG_CITY, bad keys and signed-out callers', async () => {
    const { caller, me } = await freshCharacter(testClock(ORDERS_DAY));
    const unknown = await caller.action
      .perform({ ...CANVASS, actionId: 'coalport.mill-gate.strike', idempotencyKey: randomUUID(), times: 1 })
      .catch((e: unknown) => e);
    expect(gameData(unknown).game?.reason).toBe('UNKNOWN_ACTION');
    const place = await caller.action
      .perform({ ...CANVASS, locationId: 'coalport.docks', idempotencyKey: randomUUID(), times: 1 })
      .catch((e: unknown) => e);
    expect(gameData(place).game?.reason).toBe('UNKNOWN_LOCATION');
    const badKey = await caller.action
      .perform({ ...CANVASS, idempotencyKey: 'nope', times: 1 })
      .catch((e: unknown) => e);
    expect((badKey as TRPCError).code).toBe('BAD_REQUEST');
    const signedOut = await callerFor(null)
      .action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 })
      .catch((e: unknown) => e);
    expect((signedOut as TRPCError).code).toBe('UNAUTHORIZED');
    await Character.updateOne({ _id: me.id }, { $set: { cityId: 'irongate' } });
    const wrong = await caller.action
      .perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 })
      .catch((e: unknown) => e);
    expect(gameData(wrong)).toEqual({
      code: 'BAD_REQUEST',
      game: { reason: 'WRONG_CITY', cityId: 'irongate', actionCityId: 'coalport' },
    });
  });

  it('there is no shift action any more: the old shift id is UNKNOWN_ACTION', async () => {
    // Review 1 (§9.1): was "a shift is ×1 only"; a job is a wage and the shift action is gone.
    const { caller } = await freshCharacter(testClock(ORDERS_DAY));
    const err = await caller.action
      .perform({
        actionId: 'coalport.mill-gate.shift',
        locationId: 'coalport.mill-gate',
        idempotencyKey: randomUUID(),
        times: 1,
      })
      .catch((e: unknown) => e);
    expect(gameData(err)).toMatchObject({ code: 'NOT_FOUND', game: { reason: 'UNKNOWN_ACTION' } });
  });
});

describe('action.perform ×3 (ADR 0006)', () => {
  it('Energy 100 → 70 in one log, three rows, the meter up by the applied swing, sum 100', async () => {
    const { caller } = await freshCharacter(testClock(ORDERS_DAY));
    const before = await collective();
    const key = randomUUID();
    const r = await caller.action.perform({ ...CANVASS, idempotencyKey: key, times: 3 });
    expect(r.stamp).toBe('batch');
    expect(r.attempts).toHaveLength(3);
    expect(r.effects.energy).toMatchObject({ before: 100, after: 70 });
    expect(r.action.times).toBe(3);
    expect(await ActionLog.countDocuments({ idempotencyKey: key })).toBe(1);
    const city = (await City.findById('coalport').lean())!;
    expect(city.opinion.collective).toBeCloseTo(before + r.effects.opinion!.applied, 6);
    expect(sumK(city.opinion)).toBe(100_000);
    // Rows 1–2 advance the Mill Gate canvass order (+25 %); it completes on row 2 (+20 FXP); row 3 gets nothing.
    expect(r.attempts.map((a) => a.orderId)).toEqual(['dir.shift-change', 'dir.shift-change', null]);
    expect(r.attempts[2]!.rewards.fxp.bonus).toBe(0);
    expect(r.effects.orders).toEqual([
      {
        id: 'dir.shift-change',
        title: 'Canvass the shift change at the Mill Gate',
        before: 0,
        after: 2,
        target: 2,
        done: true,
        fxp: 20,
      },
    ]);
    expect(r.effects.fxp.after - r.effects.fxp.before).toBe(r.rewards.fxp.total + 20);
    expect(r.today).toMatchObject({ energy: 30, attempts: 3, ordersDone: 1 });
    expect(r.headline).toBe(r.successes >= 2 ? 'The whistle goes, and they stop' : 'Most of them walk past');
    // Seed replay: the i-th roll of createRng(seed) is attempt i.
    const rng = createRng(r.seed);
    expect(r.attempts.map((a) => a.roll)).toEqual([rng.roll100(), rng.roll100(), rng.roll100()]);
  });

  it('the same key twice → identical result; five concurrent → one log, Energy 70', async () => {
    const { caller } = await freshCharacter(testClock(ORDERS_DAY));
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => caller.action.perform({ ...CANVASS, idempotencyKey: key, times: 3 })),
    );
    for (const r of results) expect(r).toEqual(results[0]);
    expect(await caller.action.perform({ ...CANVASS, idempotencyKey: key, times: 3 })).toEqual(results[0]);
    expect(await ActionLog.countDocuments({ idempotencyKey: key })).toBe(1);
    expect((await caller.character.me()).energy.value).toBe(70);
    const reused = await caller.action
      .perform({ ...CANVASS, idempotencyKey: key, times: 1 })
      .catch((e: unknown) => e);
    expect(gameData(reused)).toMatchObject({ code: 'CONFLICT', game: { reason: 'KEY_REUSED' } });
  });

  it('25 Energy → NOT_ENOUGH_ENERGY { cost: 30, times: 3 }, nothing spent', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(ORDERS_DAY));
    await Character.updateOne(
      { _id: me.id },
      { $set: { 'energy.value': 25, 'energy.updatedAt': new Date(clock.now()) } },
    );
    const err = await caller.action
      .perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 3 })
      .catch((e: unknown) => e);
    expect(gameData(err)).toEqual({
      code: 'PRECONDITION_FAILED',
      game: {
        reason: 'NOT_ENOUGH_ENERGY',
        energy: 25,
        cost: 30,
        times: 3,
        nextTickAt: clock.now() + 600_000,
      },
    });
    expect(await Character.findById(me.id).lean()).toMatchObject({ energy: { value: 25 } });
    expect(await ActionLog.countDocuments({ characterId: new Types.ObjectId(me.id) })).toBe(0);
  });

  it('five characters canvassing at once all commit; the meter moves by the sum', async () => {
    const clock = testClock();
    const players = await Promise.all(Array.from({ length: 5 }, () => freshCharacter(clock)));
    const before = await collective();
    const results = await Promise.all(
      players.map((p) => p.caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 })),
    );
    const applied = results.reduce((s, r) => s + r.effects.opinion!.applied, 0);
    expect(await collective()).toBeCloseTo(before + applied, 6);
    expect(sumK((await City.findById('coalport').lean())!.opinion)).toBe(100_000);
  });
});

describe('training (§8.5)', () => {
  it('×1 costs 44, INT 12 → 13, 99 XP, completes Sharpen up; Again is ×1 only at the next cost (46)', async () => {
    const { caller } = await freshCharacter(testClock(ORDERS_DAY));
    const r = await caller.action.perform({ ...STUDY, idempotencyKey: randomUUID(), times: 1 });
    expect(r).toMatchObject({ kind: 'training', stamp: 'trained', rewards: { xp: { total: 99 } } });
    expect(r.rows).toEqual([{ index: 1, label: 'INT 12 → 13', detail: '44 Energy · no roll' }]);
    expect(r.effects.stat).toEqual({ stat: 'int', before: 12, after: 13 });
    expect(r.effects.orders[0]).toMatchObject({ id: 'dir.sharpen-up', done: true, fxp: 20 });
    expect(r.again).toEqual({ cost1: 46, cost3: null });
    expect(r.art.rung).toBe('scene');
    expect(r.character.stats.int).toBe(13);
    expect(r.today.statTrained).toBe(1);
    const again = await caller.action.perform({ ...STUDY, idempotencyKey: randomUUID(), times: 1 });
    expect(again.rows[0]).toMatchObject({ label: 'INT 13 → 14', detail: '46 Energy · no roll' });
    const short = await caller.action
      .perform({ ...STUDY, idempotencyKey: randomUUID(), times: 1 })
      .catch((e: unknown) => e);
    expect(gameData(short).game).toMatchObject({
      reason: 'NOT_ENOUGH_ENERGY',
      energy: 10,
      cost: 48,
      times: 1,
    });
  });

  it('has no ×3 (content §13.2): times 3 is refused with TRAINING_IS_ONCE and spends nothing', async () => {
    const { caller, me, clock } = await freshCharacter(testClock(ORDERS_DAY));
    await Character.updateOne(
      { _id: me.id },
      { $set: { 'energy.value': 150, 'energy.updatedAt': new Date(clock.now()) } },
    );
    const err = await caller.action
      .perform({ ...STUDY, idempotencyKey: randomUUID(), times: 3 })
      .catch((e: unknown) => e);
    expect(gameData(err)).toMatchObject({ code: 'BAD_REQUEST', game: { reason: 'TRAINING_IS_ONCE' } });
    const after = await caller.character.me();
    expect(after.stats.int).toBe(12);
    expect(after.energy.value).toBe(150);
    const city = await caller.city.get({ cityId: 'coalport' });
    const ticket = city.locations.flatMap((l) => l.actions).find((a) => a.id === STUDY.actionId);
    expect(ticket).toMatchObject({ kind: 'training', energy: 44, energy3: null });
  });
});

describe('same-key copies in flight at once (QA M1)', () => {
  it('training ×1 and canvass ×3 at the Energy limit: every copy gets the stored result, one log each', async () => {
    const { caller, me } = await freshCharacter(testClock(ORDERS_DAY));
    await Character.updateOne({ _id: me.id }, { $set: { 'energy.value': 44 } });
    const trainKey = randomUUID();
    const trained = await Promise.all(
      [1, 2, 3].map(() => caller.action.perform({ ...STUDY, idempotencyKey: trainKey, times: 1 })),
    );
    for (const r of trained) expect(r).toEqual(trained[0]);
    expect((await caller.character.me()).stats.int).toBe(13);

    await Character.updateOne({ _id: me.id }, { $set: { 'energy.value': 30 } });
    const batchKey = randomUUID();
    const batch = await Promise.all(
      [1, 2, 3].map(() => caller.action.perform({ ...CANVASS, idempotencyKey: batchKey, times: 3 })),
    );
    for (const r of batch) expect(r).toEqual(batch[0]);
    expect(await ActionLog.countDocuments({ characterId: me.id })).toBe(2);
    expect((await caller.character.me()).energy.value).toBe(0);
  });
});

describe('levels and stat points (§5.3)', () => {
  it('crossing two thresholds gives two points; one key places one point; none left → NO_STAT_POINTS', async () => {
    const { caller, me } = await freshCharacter(testClock(ORDERS_DAY));
    await Character.updateOne({ _id: me.id }, { $set: { xp: 440 } });
    const r = await caller.action.perform({ ...STUDY, idempotencyKey: randomUUID(), times: 1 });
    expect(r.effects.levelUp).toEqual({ from: 1, to: 3, statPoints: 2 });
    expect(r.character).toMatchObject({ level: 3, statPointsPending: 2 });

    const key = randomUUID();
    const [a, b] = await Promise.all([
      caller.character.placeStatPoint({ stat: 'str', idempotencyKey: key }),
      caller.character.placeStatPoint({ stat: 'str', idempotencyKey: key }),
    ]);
    expect(a).toEqual(b);
    expect(a).toMatchObject({ statPointsPending: 1, stats: { str: 11 } });
    const reused = await caller.character
      .placeStatPoint({ stat: 'int', idempotencyKey: key })
      .catch((e: unknown) => e);
    expect(gameData(reused).game?.reason).toBe('KEY_REUSED');
    expect(
      await caller.character.placeStatPoint({ stat: 'int', idempotencyKey: randomUUID() }),
    ).toMatchObject({
      statPointsPending: 0,
      stats: { int: 14 },
    });
    const none = await caller.character
      .placeStatPoint({ stat: 'int', idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(none)).toMatchObject({ code: 'PRECONDITION_FAILED', game: { reason: 'NO_STAT_POINTS' } });
  });
});

describe('Party orders (ADR 0009)', () => {
  it('all three done: +20 FXP each and +5 PC once; a retried key does not pay twice', async () => {
    const { caller, me } = await freshCharacter(testClock(ORDERS_DAY));
    await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 3 });
    const intel = await caller.action.perform({ ...LISTEN, idempotencyKey: randomUUID(), times: 3 });
    expect(intel.effects.orders).toMatchObject([{ id: 'dir.ears-open', after: 2, done: true, fxp: 20 }]);
    expect(intel.effects.ordersAllDone).toBeNull();
    const key = randomUUID();
    const study = await caller.action.perform({ ...STUDY, idempotencyKey: key, times: 1 });
    expect(study.effects.ordersAllDone).toEqual({ pc: 5 });
    expect(study.effects.pc).toEqual({ before: 0, after: 5 });
    expect(study.character.orders.allDone).toBe(true);
    expect(study.today.ordersDone).toBe(3);
    const again = await caller.action.perform({ ...STUDY, idempotencyKey: key, times: 1 });
    expect(again).toEqual(study);
    const stored = (await Character.findById(me.id).lean())!;
    expect(stored.pc).toBe(5);
    const view = await caller.character.me();
    expect(view.orders.items.every((o) => o.done)).toBe(true);
    expect(view.today.pc).toBe(5);
  });
});

describe('Local Standing (§13.4)', () => {
  it('each Success on a checked action counts; the bonus appears in later checks', async () => {
    const { caller, me } = await freshCharacter(testClock(ORDERS_DAY));
    await Character.updateOne(
      { _id: me.id },
      { $set: { localStanding: [{ cityId: 'coalport', successes: 9 }] } },
    );
    const results: ActionResult[] = [];
    for (let i = 0; i < 5 && !results.some((r) => r.successes > 0); i++) {
      results.push(await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID(), times: 1 }));
    }
    const hit = results.find((r) => r.successes > 0);
    if (!hit) return; // five Partials in a row (≈0.5 %): nothing to assert
    expect(hit.effects.standing).toMatchObject({
      before: { name: 'Stranger' },
      after: { name: 'Familiar', level: 1 },
    });
    const city = await caller.city.get({ cityId: 'coalport' });
    expect(city.locations[0]!.actions[0]!.preview).toMatchObject({
      chance: 69,
      bonuses: [{ id: 'standing', label: 'Familiar in Coalport', value: 3 }],
    });
  });
});
