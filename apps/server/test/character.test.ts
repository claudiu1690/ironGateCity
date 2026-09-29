import { Character, PaperEntry } from '@irongate/db';
import { dayKey } from '@irongate/rules';
import { TRPCError } from '@trpc/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { callerFor, newUser, setupDb, teardownDb, testClock } from './helpers';

beforeAll(async () => {
  await setupDb('character-test');
});
afterAll(teardownDb);

describe('character.me v2', () => {
  it('creates the reference recruit once, settles the first City Day and prints the first edition', async () => {
    const clock = testClock();
    const user = newUser('Mara Lenk');
    const caller = callerFor(user, clock.now);

    const first = await caller.character.me();
    const second = await caller.character.me();
    expect(second.id).toBe(first.id);
    expect(await Character.countDocuments({ userId: user.id })).toBe(1);
    const today = dayKey(clock.now());

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
      version: 1,
      serverNow: clock.now(),
      day: { key: today, endsAt: (today + 1) * 86_400_000 },
      rank: { value: 1, title: 'Recruit', fxpFloor: 0, fxpNext: 400 },
      pc: 0,
      statPointsPending: 0,
      job: null,
      sickDaysLeft: 2,
      standing: { cityId: 'coalport', name: 'Stranger', level: 0, successes: 0 },
      today: { day: today, energy: 0 },
      paperDue: true,
    });
    expect(first.orders.items.map((o) => [o.id, o.target])).toEqual([
      ['dir.shift-change', 2],
      ['dir.ears-open', 2],
      ['dir.sharpen-up', 1],
    ]);
    expect(first.orders.issuer).toMatchObject({
      name: 'Petra Holm',
      signature: '— P.H.',
      portrait: { id: 'portrait.holm' },
    });
    expect(await PaperEntry.countDocuments({ characterId: first.id })).toBe(1);
  });

  it('creates one character and one edition when first calls race', async () => {
    const user = newUser();
    const caller = callerFor(user, testClock().now);
    const views = await Promise.all(Array.from({ length: 5 }, () => caller.character.me()));
    expect(new Set(views.map((v) => v.id)).size).toBe(1);
    expect(await Character.countDocuments({ userId: user.id })).toBe(1);
    expect(await PaperEntry.countDocuments({ characterId: views[0]!.id })).toBe(1);
  });

  it('projects lazy timers on read without writing (same day)', async () => {
    const clock = testClock();
    const user = newUser();
    const caller = callerFor(user, clock.now);
    await caller.character.me();
    const stored = await Character.findOne({ userId: user.id }).lean();
    clock.advance(60 * 60_000);
    const later = await caller.character.me();
    expect(later.energy.value).toBe(100);
    expect(later.rested).toBe(30);
    expect(await Character.findOne({ userId: user.id }).lean()).toEqual(stored);
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
