import { Character } from '@irongate/db';
import { TRPCError } from '@trpc/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { callerFor, newUser, setupDb, teardownDb, testClock } from './helpers';

beforeAll(async () => {
  await setupDb('character-test');
});
afterAll(teardownDb);

describe('character.me', () => {
  it('creates the reference recruit once and returns the same character after', async () => {
    const clock = testClock();
    const user = newUser('Mara Lenk');
    const caller = callerFor(user, clock.now);

    const first = await caller.character.me();
    const second = await caller.character.me();
    expect(second.id).toBe(first.id);
    expect(await Character.countDocuments({ userId: user.id })).toBe(1);

    expect(first).toMatchObject({
      name: 'Mara Lenk',
      factionId: 'collective',
      factionName: 'Collective',
      homeCityId: 'coalport',
      cityId: 'coalport',
      stats: { str: 10, int: 12, agi: 5, cha: 2 },
      energy: { value: 100, max: 100, updatedAt: clock.now(), nextTickAt: null, fullAt: null },
      rested: 0,
      xp: 0,
      level: 1,
      fxp: 0,
      iron: 0,
      version: 0,
    });
  });

  it('creates one character when first calls race', async () => {
    const user = newUser();
    const caller = callerFor(user);
    const views = await Promise.all(Array.from({ length: 5 }, () => caller.character.me()));
    expect(new Set(views.map((v) => v.id)).size).toBe(1);
    expect(await Character.countDocuments({ userId: user.id })).toBe(1);
  });

  it('projects lazy timers on read without writing', async () => {
    const clock = testClock();
    const user = newUser();
    const caller = callerFor(user, clock.now);
    await caller.character.me();
    const stored = await Character.findOne({ userId: user.id }).lean();

    // Full bar for an hour: 6 ticks of 5 overflow into Rested.
    clock.advance(60 * 60_000);
    const later = await caller.character.me();
    expect(later.energy.value).toBe(100);
    expect(later.rested).toBe(30);

    const after = await Character.findOne({ userId: user.id }).lean();
    expect(after).toEqual(stored);
  });

  it('refuses a signed-out caller with UNAUTHORIZED', async () => {
    const err = await callerFor(null)
      .character.me()
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TRPCError);
    expect((err as TRPCError).code).toBe('UNAUTHORIZED');
  });
});

describe('health.ping', () => {
  it('answers without a session', async () => {
    const clock = testClock();
    expect(await callerFor(null, clock.now).health.ping()).toEqual({ ok: true, now: clock.now() });
  });
});
