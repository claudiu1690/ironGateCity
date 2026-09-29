import { randomUUID } from 'node:crypto';
import { ActionLog, Character } from '@irongate/db';
import { createRng } from '@irongate/rules';
import type { ActionResult } from '@irongate/rules';
import { TRPCError } from '@trpc/server';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { callerFor, newUser, setupDb, teardownDb, testClock } from './helpers';

const CANVASS = {
  actionId: 'coalport.mill-gate.canvass',
  locationId: 'coalport.mill-gate',
  times: 1 as const,
};

beforeAll(async () => {
  await setupDb('action-test');
});
afterAll(teardownDb);

async function freshCharacter(clock = testClock()) {
  const user = newUser();
  const caller = callerFor(user, clock.now);
  const me = await caller.character.me();
  return { user, caller, me, clock };
}

function gameData(err: unknown) {
  expect(err).toBeInstanceOf(TRPCError);
  const e = err as TRPCError;
  return { code: e.code, game: (e.cause as { toData?: () => Record<string, unknown> })?.toData?.() };
}

describe('city.get', () => {
  it('returns Coalport with the Mill Gate and a 66 % preview for the reference recruit', async () => {
    const { caller } = await freshCharacter();
    const city = await caller.city.get({ cityId: 'coalport' });
    expect(city).toMatchObject({
      id: 'coalport',
      name: 'Coalport',
      role: 'home',
      homeFactionId: 'collective',
      opinion: { vanguard: 9, collective: 70, alliance: 6, neutral: 15 },
    });
    expect(city.locations).toHaveLength(1);
    const [location] = city.locations;
    expect(location).toMatchObject({ id: 'coalport.mill-gate', name: 'Mill Gate', kind: 'factory-gate' });
    expect(location!.actions[0]).toMatchObject({
      id: 'coalport.mill-gate.canvass',
      name: 'Canvass the shift change',
      type: 'canvass',
      stat: 'int',
      energy: 10,
      preview: { stat: 'int', statValue: 12, difficulty: 8, statTerm: 16, bonusTotal: 0, chance: 66 },
    });
  });

  it('is NOT_FOUND for an unknown city', async () => {
    const { caller } = await freshCharacter();
    const err = await caller.city.get({ cityId: 'atlantis' }).catch((e: unknown) => e);
    expect(gameData(err)).toEqual({
      code: 'NOT_FOUND',
      game: { reason: 'UNKNOWN_CITY', cityId: 'atlantis' },
    });
  });
});

describe('action.perform', () => {
  it('spends 10 Energy, pays by outcome and writes a log with its seed', async () => {
    const { caller, me, clock } = await freshCharacter();
    const key = randomUUID();
    const result = await caller.action.perform({ ...CANVASS, idempotencyKey: key });

    expect(result.idempotencyKey).toBe(key);
    expect(result.performedAt).toBe(new Date(clock.now()).toISOString());
    expect(result.place).toEqual({
      cityId: 'coalport',
      cityName: 'Coalport',
      locationId: 'coalport.mill-gate',
      locationName: 'Mill Gate',
      kind: 'factory-gate',
    });
    expect(result.action).toEqual({
      id: CANVASS.actionId,
      name: 'Canvass the shift change',
      type: 'canvass',
      tier: 1,
    });
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0]!.check.chance).toBe(66);

    const success = result.stamp === 'success';
    expect(result.attempts[0]!.outcome).toBe(result.stamp);
    expect(result.headline).toBe(success ? 'The whistle goes, and they stop' : 'Most of them walk past');
    expect([result.rewards.xp.total, result.rewards.fxp.total, result.rewards.iron.total]).toEqual(
      success ? [45, 6, 20] : [23, 3, 10],
    );
    expect(result.rewards.opinion).toBe(success ? 0.05 : 0.025);
    expect(result.effects.opinion).toEqual({
      cityId: 'coalport',
      factionId: 'collective',
      delta: result.rewards.opinion,
      applied: false,
    });
    expect(result.effects.energy).toEqual({
      before: 100,
      after: 90,
      max: 100,
      nextTickAt: clock.now() + 10 * 60_000,
    });
    expect(result.effects.xp).toEqual({ before: 0, after: result.rewards.xp.total });
    expect(result.bonusTags).toEqual([]);

    // The fresh HUD state rides along.
    expect(result.character).toMatchObject({
      id: me.id,
      energy: { value: 90 },
      xp: result.rewards.xp.total,
      fxp: result.rewards.fxp.total,
      iron: result.rewards.iron.total,
      version: 1,
    });

    const log = await ActionLog.findOne({ idempotencyKey: key }).lean();
    expect(log).toMatchObject({
      actionId: CANVASS.actionId,
      locationId: CANVASS.locationId,
      cityId: 'coalport',
      outcome: result.stamp,
    });
    expect(log!.seed).toMatch(/^[0-9a-f]{32}$/);
    expect(log!.seed).toBe(result.seed);
    expect(log!._id.toHexString()).toBe(result.logId);
    expect(log!.result).toEqual(result);

    const stored = await Character.findById(me.id).lean();
    expect(stored).toMatchObject({ energy: { value: 90 }, rested: 0, version: 1 });
  });

  it('replaying createRng(log.seed) reproduces the roll', async () => {
    const { caller } = await freshCharacter();
    const result = await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID() });
    const log = await ActionLog.findOne({ idempotencyKey: result.idempotencyKey }).lean();
    expect(createRng(log!.seed).roll100()).toBe(result.attempts[0]!.roll);
  });

  it('the same key twice returns the identical result, one log, one Energy spend', async () => {
    const { caller, me } = await freshCharacter();
    const key = randomUUID();
    const first = await caller.action.perform({ ...CANVASS, idempotencyKey: key });
    const second = await caller.action.perform({ ...CANVASS, idempotencyKey: key });
    expect(second).toEqual(first);
    expect(await ActionLog.countDocuments({ idempotencyKey: key })).toBe(1);
    const view = await caller.character.me();
    expect(view.energy.value).toBe(90);
    expect(view.version).toBe(1);
    expect(view.id).toBe(me.id);
  });

  it('a double tap (5 concurrent calls, one key) makes one log and spends Energy once', async () => {
    const { caller } = await freshCharacter();
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => caller.action.perform({ ...CANVASS, idempotencyKey: key })),
    );
    for (const r of results) expect(r).toEqual(results[0]);
    expect(await ActionLog.countDocuments({ idempotencyKey: key })).toBe(1);
    expect((await caller.character.me()).energy.value).toBe(90);
  });

  it('concurrent taps with different keys each spend exactly once', async () => {
    const { caller, me } = await freshCharacter();
    const results = await Promise.all(
      Array.from({ length: 4 }, () => caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID() })),
    );
    expect(new Set(results.map((r) => r.logId)).size).toBe(4);
    const view = await caller.character.me();
    expect(view.energy.value).toBe(60);
    expect(view.version).toBe(4);
    const xp = results.reduce((s, r) => s + r.rewards.xp.total, 0);
    expect(view.xp).toBe(xp);
    expect(await ActionLog.countDocuments({ characterId: new Types.ObjectId(me.id) })).toBe(4);
  });

  it('ten canvasses empty the bar; the eleventh is NOT_ENOUGH_ENERGY with the next tick', async () => {
    const { caller, clock } = await freshCharacter();
    const results: ActionResult[] = [];
    for (let i = 0; i < 10; i++) {
      results.push(await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID() }));
    }
    expect(results.map((r) => r.effects.energy.after)).toEqual([90, 80, 70, 60, 50, 40, 30, 20, 10, 0]);
    expect((await caller.character.me()).energy.value).toBe(0);

    const err = await caller.action
      .perform({ ...CANVASS, idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(err)).toEqual({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'NOT_ENOUGH_ENERGY', energy: 0, cost: 10, nextTickAt: clock.now() + 10 * 60_000 },
    });

    // Lazy regen: 20 minutes later there are 10 Energy again, no worker involved.
    clock.advance(20 * 60_000);
    const again = await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID() });
    expect(again.effects.energy).toMatchObject({ before: 10, after: 0 });
  });

  it('spends Rested with Energy and tags the bonus', async () => {
    const { caller, clock } = await freshCharacter();
    clock.advance(60 * 60_000); // a full bar for an hour: 30 Rested
    const result = await caller.action.perform({ ...CANVASS, idempotencyKey: randomUUID() });
    expect(result.effects.rested).toEqual({ before: 30, after: 20 });
    expect(result.bonusTags).toEqual([
      { id: 'rested', label: 'Rested', note: '10 of 10 Energy, +50 % XP and Iron' },
    ]);
    expect(result.rewards.xp.bonus).toBe(result.stamp === 'success' ? 23 : 11);
    expect(result.rewards.fxp.bonus).toBe(0);
    expect(result.character.rested).toBe(20);
  });

  it('refuses an action in another city with WRONG_CITY', async () => {
    const { caller, me } = await freshCharacter();
    await Character.updateOne({ _id: me.id }, { $set: { cityId: 'irongate' } });
    const err = await caller.action
      .perform({ ...CANVASS, idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(err)).toEqual({
      code: 'BAD_REQUEST',
      game: { reason: 'WRONG_CITY', cityId: 'irongate', actionCityId: 'coalport' },
    });
    expect(await Character.findById(me.id).lean()).toMatchObject({ energy: { value: 100 }, version: 0 });
  });

  it('refuses unknown actions and locations', async () => {
    const { caller } = await freshCharacter();
    const unknownAction = await caller.action
      .perform({ ...CANVASS, actionId: 'coalport.mill-gate.strike', idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(unknownAction).game?.reason).toBe('UNKNOWN_ACTION');

    const unknownLocation = await caller.action
      .perform({ ...CANVASS, locationId: 'coalport.docks', idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect(gameData(unknownLocation).game?.reason).toBe('UNKNOWN_LOCATION');
  });

  it('rejects a malformed idempotency key', async () => {
    const { caller } = await freshCharacter();
    const err = await caller.action
      .perform({ ...CANVASS, idempotencyKey: 'not-a-uuid' })
      .catch((e: unknown) => e);
    expect((err as TRPCError).code).toBe('BAD_REQUEST');
  });

  it('refuses a signed-out caller with UNAUTHORIZED', async () => {
    const err = await callerFor(null)
      .action.perform({ ...CANVASS, idempotencyKey: randomUUID() })
      .catch((e: unknown) => e);
    expect((err as TRPCError).code).toBe('UNAUTHORIZED');
  });
});
