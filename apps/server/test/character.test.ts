import { Character, PaperEntry } from '@irongate/db';
import { dayKey } from '@irongate/rules';
import { TRPCError } from '@trpc/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { arrive, callerFor, gameData, newUser, seedRecruit, setupDb, teardownDb, testClock } from './helpers';

beforeAll(async () => {
  await setupDb('character-test');
});
afterAll(teardownDb);

describe('character.me v2', () => {
  // Slice 2 (ADR 0011): no auto-create; the character is made by the arrival's join, which settles
  // the first City Day with the welcome set (ADR 0012) and prints the welcome edition.
  it('creates the reference recruit once at the join, settles the first City Day and prints the first edition', async () => {
    const clock = testClock();
    const user = newUser('Mara Lenk');
    const caller = callerFor(user, clock.now);
    expect(gameData(await caller.character.me().catch((e: unknown) => e)).game).toEqual({
      reason: 'ARRIVAL_PENDING',
    });

    await arrive(caller);
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
      // The reference answers: the refused coat's 150 Iron and Justice's 50 FXP (onboarding §2.4).
      fxp: 50,
      iron: 150,
      version: 0,
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
    // The welcome set, not the rotation (ADR 0012).
    expect(first.orders.items.map((o) => [o.id, o.title, o.target])).toEqual([
      ['dir.shift-change', 'Be at the gate', 2],
      ['dir.report', 'Report to the hall', 1],
      ['dir.work-shift', 'Take a job', 1],
    ]);
    expect(first.orders.issuer).toMatchObject({
      name: 'Petra Holm',
      signature: '— P.H.',
      portrait: { id: 'portrait.holm' },
    });
    expect(await PaperEntry.countDocuments({ characterId: first.id })).toBe(1);
  });

  it('settles one City Day and prints one edition when first calls race', async () => {
    const user = newUser();
    const clock = testClock();
    await seedRecruit(user, clock.now());
    const caller = callerFor(user, clock.now);
    const views = await Promise.all(Array.from({ length: 5 }, () => caller.character.me()));
    expect(new Set(views.map((v) => v.id)).size).toBe(1);
    expect(await Character.countDocuments({ userId: user.id })).toBe(1);
    expect(await PaperEntry.countDocuments({ characterId: views[0]!.id })).toBe(1);
  });

  it('projects lazy timers on read without writing (same day)', async () => {
    const clock = testClock();
    const user = newUser();
    await seedRecruit(user, clock.now());
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
