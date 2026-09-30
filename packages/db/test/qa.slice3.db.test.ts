/**
 * QA, slice 3 (docs/qa/slice-3.md §2.9): the playtest boost. Idempotent, never lowers anything,
 * marks what it boosted, and keeps a tester who reached Rank 3 and Known on their own among the
 * natural testers of the report (tech design Deviations, "Playtest tooling").
 */
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
  await connectDb(withDbName(inject('mongoUri'), 'db-qa-slice3'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
});
afterAll(disconnectDb);

async function account(email: string, c: { fxp: number; rank: number; pc: number; successes: number }) {
  const _id = new Types.ObjectId();
  await nativeDb().collection('user').insertOne({ _id, email, name: 'Tester' });
  await Character.collection.insertOne({
    userId: _id.toHexString(),
    name: `Tester ${email}`,
    homeCityId: 'ashford',
    fxp: c.fxp,
    rank: c.rank,
    pc: c.pc,
    localStanding: [{ cityId: 'ashford', successes: c.successes }],
    version: 1,
  });
}

describe('QA · admin:boost', () => {
  it('never lowers anything, for every mix of values around the thresholds', () => {
    for (const fxp of [0, 1_999, 2_000, 9_000])
      for (const rank of [1, 2, 3, 5])
        for (const pc of [0, 9, 10, 500])
          for (const successes of [0, 29, 30, 400]) {
            const c = {
              fxp,
              rank,
              pc,
              homeCityId: 'ashford',
              localStanding: [{ cityId: 'ashford', successes }],
            };
            const { set } = boostPlan(c);
            const after = {
              fxp: set.fxp ?? fxp,
              rank: set.rank ?? rank,
              pc: set.pc ?? pc,
              successes: set.localStanding?.find((s) => s.cityId === 'ashford')?.successes ?? successes,
            };
            expect(after.fxp).toBeGreaterThanOrEqual(Math.max(fxp, BOOST.fxp));
            expect(after.rank).toBeGreaterThanOrEqual(Math.max(rank, 3));
            expect(after.pc).toBeGreaterThanOrEqual(Math.max(pc, BOOST.pc));
            expect(after.successes).toBeGreaterThanOrEqual(Math.max(successes, BOOST.successes));
            // Idempotent: the plan of the result is empty.
            expect(
              boostPlan({
                ...after,
                homeCityId: 'ashford',
                localStanding: [{ cityId: 'ashford', successes: after.successes }],
              }).changes,
            ).toEqual([]);
          }
  });

  it('a boosted tester: marked once with the values before; three runs in parallel change it once', async () => {
    await account('parallel@example.test', { fxp: 700, rank: 2, pc: 3, successes: 11 });
    const at = new Date('2026-10-05T10:00:00Z');
    const runs = await Promise.all([0, 1, 2].map(() => boostByEmails(['parallel@example.test'], at)));
    const statuses = runs.map((r) => r[0]!.status).sort();
    expect(statuses.filter((s) => s === 'boosted')).toHaveLength(1);
    const c = (await Character.collection.findOne({ name: 'Tester parallel@example.test' }))!;
    expect(c).toMatchObject({
      fxp: 2_000,
      rank: 3,
      pc: 10,
      version: 2,
      playtest: { boosted: true, boostedAt: at, from: { fxp: 700, rank: 2, successes: 11 } },
    });
  });

  it.fails(
    'BUG n-boost: a tester who reached Rank 3 and Known alone, with under 10 PC, is marked boosted (the report then counts them as boosted)',
    async () => {
      await account('natural@example.test', { fxp: 2_400, rank: 3, pc: 4, successes: 60 });
      const [r] = await boostByEmails(['natural@example.test']);
      expect(r!.changes).toEqual(['PC 4 → 10 (the deposit)']);
      const c = (await Character.collection.findOne({ name: 'Tester natural@example.test' }))!;
      // Deviations: "a tester already at Rank 3 and Known counts as natural".
      expect(c.playtest?.boosted).not.toBe(true);
    },
  );
});
