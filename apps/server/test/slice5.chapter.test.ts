/**
 * Slice 5, T17 (tech design §8.2 "ambitionService.attempt", §15 "Server — chapter"; design §13):
 * Settle His Debts, chapter 2, *The riverside house*. The quiet way adds Heat +6 on every outcome,
 * lazily and in the attempt's transaction; the result carries it, `first` on the first Heat ever.
 * The roll is forced through the attempt's seed (`keySeed`, the key's seed since the fix round's
 * M1), so each outcome is played once.
 */
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { CHECK, createRng } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type * as KeyGuard from '../src/services/keyGuard';
import { setupDb, teardownDb, testClock } from './helpers';
import { at, key, member } from './slice5.helpers';

const forced = vi.hoisted(() => ({ seed: null as string | null }));
vi.mock('../src/services/keyGuard', async (importOriginal) => {
  const real = await importOriginal<typeof KeyGuard>();
  return {
    ...real,
    keySeed: (...a: Parameters<typeof real.keySeed>) => forced.seed ?? real.keySeed(...a),
  };
});

const DAY = 20732; // Tue 6 Oct 2026

beforeAll(async () => {
  await setupDb('slice5-chapter-test');
});
afterAll(teardownDb);

/** The first 32-hex seed whose first roll satisfies `ok`. */
function seedFor(ok: (roll: number) => boolean): string {
  for (let i = 0; i < 100_000; i++) {
    const hex = i.toString(16).padStart(32, '0');
    if (ok(createRng(hex).roll100())) return hex;
  }
  throw new Error('no seed');
}

/** Chapter 2 at step 2 (the check), chapter 1 played seven City Days ago, Energy full. */
async function atTheHouse(id: string, now: number) {
  await Character.updateOne(
    { _id: id },
    {
      $set: {
        ambition: {
          id: 'settle-his-debts',
          chapter: 2,
          step: 'check',
          choiceId: 'friday',
          flags: ['promised-friday'],
          history: [
            { chapter: 1, day: DAY - 7, choiceId: 'ask', approachId: 'read', outcome: 'success', logId: 'x' },
          ],
        },
        'energy.value': 100,
        'energy.updatedAt': new Date(now),
      },
      $inc: { version: 1 },
    },
  );
}

describe('Settle His Debts, chapter 2: The riverside house', () => {
  it('the quiet way: Heat +6 on success, partial and failure; the first Heat is marked once', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Odo Quiet', level: 6 });
    await atTheHouse(p.id, clock.now());
    const view = await p.caller.ambition.get();
    expect(view).toMatchObject({ chapter: 2, status: 'midway', letterFrom: "From the page's other side" });
    const chance = view.screen!.approaches.find((a) => a.id === 'yard')!.check.chance;
    expect(chance + CHECK.partialWindow).toBeLessThan(100);
    const seeds = {
      success: seedFor((r) => r <= chance),
      partial: seedFor((r) => r > chance && r <= chance + CHECK.partialWindow),
      failure: seedFor((r) => r > chance + CHECK.partialWindow),
    };
    const want = { success: [300, 80, 150], partial: [150, 40, 75], failure: [50, 0, 0] } as const;

    let heat = 0;
    for (const outcome of ['success', 'partial', 'failure'] as const) {
      await atTheHouse(p.id, clock.now());
      forced.seed = seeds[outcome];
      const r = await p.caller.ambition.attempt({ chapter: 2, approachId: 'yard', idempotencyKey: key() });
      forced.seed = null;
      expect(r.stamp).toBe(outcome);
      expect([r.rewards.xp.base, r.rewards.fxp.total, r.rewards.iron.base]).toEqual(want[outcome]);
      expect(r.effects.heat).toEqual({
        before: heat,
        gain: 6,
        after: heat + 6,
        state: 'cool',
        stateBefore: 'cool',
        coolsAt: null,
        first: heat === 0,
      });
      heat += 6;
      expect(r.character.heat?.value).toBe(heat);
      expect(r.effects.item).toMatchObject({ itemId: 'keep.ledger-page' });
      expect(r.effects.hooks[0]).toMatch(/^Chapter 3, "The collector": from .+, at Rank 3$/);
      const c = (await Character.findById(p.id).lean<CharacterDoc>())!;
      expect(c.heat?.value).toBe(heat);
      // The Noticed card is for 25; nothing below it touches `firsts.noticed`.
      expect(c.firsts?.noticed).toBeUndefined();
      // A retry with the same key returns the stored result and adds no Heat.
      const again = await p.caller.ambition.attempt({
        chapter: 2,
        approachId: 'yard',
        idempotencyKey: r.idempotencyKey,
      });
      expect(again.logId).toBe(r.logId);
      expect((await Character.findById(p.id).lean<CharacterDoc>())!.heat?.value).toBe(heat);
    }
  });

  it('the other ways add no Heat', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Odo Key', level: 6 });
    await atTheHouse(p.id, clock.now());
    const r = await p.caller.ambition.attempt({ chapter: 2, approachId: 'key', idempotencyKey: key() });
    expect(r.effects.heat).toBeUndefined();
    expect((await Character.findById(p.id).lean<CharacterDoc>())!.heat?.value).toBe(0);
  });
});
