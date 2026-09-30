import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  BOOST,
  Character,
  boostByEmails,
  boostPlan,
  connectDb,
  disconnectDb,
  ensureIndexes,
  mongoose,
  nativeDb,
} from '../src';
import { withDbName } from '../src/testing/memoryReplSet';

beforeAll(async () => {
  await connectDb(withDbName(inject('mongoUri'), 'db-boost-test'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
});
afterAll(disconnectDb);

async function account(
  email: string,
  c: { fxp: number; rank: number; pc: number; successes: number } | null,
) {
  const _id = new Types.ObjectId();
  await nativeDb().collection('user').insertOne({ _id, email, name: 'Tester' });
  if (!c) return _id;
  await Character.collection.insertOne({
    userId: _id.toHexString(),
    name: `Tester ${email}`,
    homeCityId: 'coalport',
    fxp: c.fxp,
    rank: c.rank,
    pc: c.pc,
    localStanding: [
      { cityId: 'duskwall', successes: 3 },
      { cityId: 'coalport', successes: c.successes },
    ],
    version: 4,
  });
  return _id;
}

describe('the playtest boost (packages/db/scripts/boostPlaytest.ts)', () => {
  it('plans only what is missing and never lowers anything', () => {
    const plan = boostPlan({
      fxp: 520,
      rank: 2,
      pc: 5,
      homeCityId: 'coalport',
      localStanding: [{ cityId: 'coalport', successes: 12 }],
    });
    expect(plan.set).toEqual({
      fxp: BOOST.fxp,
      rank: 3,
      pc: 10,
      localStanding: [{ cityId: 'coalport', successes: 30 }],
    });
    expect(plan.changes).toEqual([
      'FXP 520 → 2000',
      'Rank 2 → 3',
      'coalport Successes 12 → 30 (Known)',
      'PC 5 → 10 (the deposit)',
    ]);
    const high = boostPlan({
      fxp: 7_000,
      rank: 4,
      pc: 300,
      homeCityId: 'coalport',
      localStanding: [{ cityId: 'coalport', successes: 400 }],
    });
    expect(high).toEqual({ set: {}, changes: [] });
  });

  it('boosts by email, marks the character once, and a second run changes nothing', async () => {
    await account('low@example.test', { fxp: 520, rank: 2, pc: 5, successes: 12 });
    await account('done@example.test', { fxp: 3_000, rank: 3, pc: 50, successes: 40 });
    await account('arriving@example.test', null);
    const at = new Date('2026-10-01T09:00:00Z');
    const first = await boostByEmails(
      ['LOW@example.test', 'done@example.test', 'arriving@example.test', 'nobody@example.test'],
      at,
    );
    expect(first.map((r) => r.status)).toEqual(['boosted', 'unchanged', 'no-character', 'no-user']);
    const c = (await Character.collection.findOne({ name: 'Tester low@example.test' }))!;
    expect(c).toMatchObject({
      fxp: 2_000,
      rank: 3,
      pc: 10,
      version: 5,
      playtest: { boosted: true, boostedAt: at, from: { fxp: 520, rank: 2, successes: 12 } },
    });
    expect(c.localStanding).toEqual([
      { cityId: 'duskwall', successes: 3 },
      { cityId: 'coalport', successes: 30 },
    ]);
    const natural = await Character.collection.findOne({ name: 'Tester done@example.test' });
    expect(natural!.playtest).toBeUndefined();

    const again = await boostByEmails(['low@example.test'], new Date('2026-10-02T09:00:00Z'));
    expect(again).toEqual([
      { email: 'low@example.test', status: 'unchanged', name: 'Tester low@example.test', changes: [] },
    ]);
    expect(await Character.collection.findOne({ name: 'Tester low@example.test' })).toEqual(c);
  });
});
