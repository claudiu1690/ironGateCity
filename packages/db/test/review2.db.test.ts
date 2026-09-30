import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  City,
  OrderPaper,
  connectDb,
  disconnectDb,
  ensureIndexes,
  migrateReview2StreetOrdinances,
  mongoose,
} from '../src';
import { withDbName } from '../src/testing/memoryReplSet';

beforeAll(async () => {
  await connectDb(withDbName(inject('mongoUri'), 'db-review2-test'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
});
afterAll(disconnectDb);

/** Review 2 (answers §1.10, §5.6): the Ward Register and the Ward Fund become Street ones, ids included. */
describe('migration 005 (review 2: the Street Register and the Street Fund)', () => {
  it('rewrites the ids in cities and order papers, leaves the rest alone; twice is a no-op', async () => {
    await City.collection.insertMany([
      {
        _id: 'coalport' as unknown as never,
        ordinance: { id: 'ord.ward-fund', fromDay: 20_705, toDay: 20_710, paperId: 'coalport:2' },
        ordinanceHistory: [
          { id: 'ord.ward-register', fromDay: 20_700, toDay: 20_705 },
          { id: 'ord.public-works', fromDay: 20_695, toDay: 20_700 },
        ],
      },
      {
        _id: 'duskwall' as unknown as never,
        ordinance: { id: 'ord.rally-permits', fromDay: 20_705, toDay: 20_710, paperId: 'duskwall:2' },
        ordinanceHistory: [],
      },
    ]);
    await OrderPaper.collection.insertMany([
      {
        _id: 'coalport:2' as unknown as never,
        cityId: 'coalport',
        cycle: 2,
        fromDay: 20_703,
        divideDay: 20_705,
        status: 'divided',
        items: [
          {
            ordinanceId: 'ord.long-service',
            movedBy: { kind: 'branch', npcId: 'holm', name: 'Holm' },
            at: new Date(),
            day: 20_703,
          },
          {
            ordinanceId: 'ord.ward-fund',
            movedBy: { kind: 'player', characterId: new mongoose.Types.ObjectId(), name: 'Vera' },
            at: new Date(),
            day: 20_703,
          },
        ],
        votes: [
          {
            characterId: new mongoose.Types.ObjectId(),
            name: 'Vera',
            seat: 1,
            choice: 'ord.ward-fund',
            at: new Date(),
          },
          {
            characterId: new mongoose.Types.ObjectId(),
            name: 'Otto',
            seat: 2,
            choice: 'against',
            at: new Date(),
          },
        ],
        division: {
          tallies: [
            { choice: 'ord.ward-fund', player: 1, npc: 3 },
            { choice: 'ord.long-service', player: 0, npc: 2 },
          ],
          npcChoice: 'ord.ward-fund',
          npcAbstained: false,
          passed: 'ord.ward-fund',
          inForce: { fromDay: 20_705, toDay: 20_710 },
        },
      },
      {
        _id: 'coalport:3' as unknown as never,
        cityId: 'coalport',
        cycle: 3,
        fromDay: 20_708,
        divideDay: 20_710,
        status: 'open',
        items: [
          {
            ordinanceId: 'ord.ward-register',
            movedBy: { kind: 'branch', npcId: 'holm', name: 'Holm' },
            at: new Date(),
            day: 20_708,
          },
        ],
        votes: [],
        division: null,
      },
      {
        _id: 'duskwall:2' as unknown as never,
        cityId: 'duskwall',
        cycle: 2,
        fromDay: 20_704,
        divideDay: 20_706,
        status: 'open',
        items: [
          {
            ordinanceId: 'ord.rally-permits',
            movedBy: { kind: 'branch', npcId: 'stahl', name: 'Stahl' },
            at: new Date(),
            day: 20_704,
          },
        ],
        votes: [],
        division: null,
      },
    ]);
    const untouched = await OrderPaper.collection.findOne({ _id: 'duskwall:2' as unknown as never });

    // Two cities hold nothing old but Coalport; three papers, two of them Coalport's.
    expect(await migrateReview2StreetOrdinances()).toBe(3);

    const coalport = await City.collection.findOne({ _id: 'coalport' as unknown as never });
    expect(coalport?.ordinance).toEqual({
      id: 'ord.street-fund',
      fromDay: 20_705,
      toDay: 20_710,
      paperId: 'coalport:2',
    });
    expect(coalport?.ordinanceHistory.map((h: { id: string }) => h.id)).toEqual([
      'ord.street-register',
      'ord.public-works',
    ]);
    const duskwall = await City.collection.findOne({ _id: 'duskwall' as unknown as never });
    expect(duskwall?.ordinance.id).toBe('ord.rally-permits');

    const divided = await OrderPaper.collection.findOne({ _id: 'coalport:2' as unknown as never });
    expect(divided?.items.map((i: { ordinanceId: string }) => i.ordinanceId)).toEqual([
      'ord.long-service',
      'ord.street-fund',
    ]);
    expect(divided?.items[1].movedBy.name).toBe('Vera');
    expect(divided?.votes.map((v: { choice: string }) => v.choice)).toEqual(['ord.street-fund', 'against']);
    expect(divided?.division).toMatchObject({
      passed: 'ord.street-fund',
      npcChoice: 'ord.street-fund',
      npcAbstained: false,
      tallies: [
        { choice: 'ord.street-fund', player: 1, npc: 3 },
        { choice: 'ord.long-service', player: 0, npc: 2 },
      ],
      inForce: { fromDay: 20_705, toDay: 20_710 },
    });
    const open = await OrderPaper.collection.findOne({ _id: 'coalport:3' as unknown as never });
    expect(open?.items[0].ordinanceId).toBe('ord.street-register');
    expect(open?.division).toBeNull();
    expect(await OrderPaper.collection.findOne({ _id: 'duskwall:2' as unknown as never })).toEqual(untouched);

    // Idempotent: a second run, and the start-up run, change nothing.
    expect(await migrateReview2StreetOrdinances()).toBe(0);
    await ensureIndexes();
    expect((await City.collection.findOne({ _id: 'coalport' as unknown as never }))?.ordinance.id).toBe(
      'ord.street-fund',
    );
  });
});
