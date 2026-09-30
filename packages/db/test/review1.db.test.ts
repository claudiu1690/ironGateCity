import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  Character,
  City,
  OrderPaper,
  connectDb,
  disconnectDb,
  ensureIndexes,
  migrateReview1Wage,
  mongoose,
} from '../src';
import { withDbName } from '../src/testing/memoryReplSet';

beforeAll(async () => {
  await connectDb(withDbName(inject('mongoUri'), 'db-review1-test'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
});
afterAll(disconnectDb);

/** Review 1 (GDD §9.1): the wage migration, idempotent, touching only documents in the old shape. */
describe('migration 004 (review 1: a job is a wage)', () => {
  it('turns the streak and sick days into seniority 0, drops the shift orders, renames Shift Hours; twice is a no-op', async () => {
    await Character.collection.insertMany([
      {
        userId: 'old-worker',
        name: 'Worker',
        version: 3,
        job: { id: 'coalport-factory-worker', since: 20_700, streak: 6, lastShiftDay: 20_705 },
        sickDays: { week: 2957, left: 1 },
        today: { day: 20_706, energy: 4, shiftWorked: true },
        orders: {
          day: 20_706,
          items: [
            { templateId: 'dir.shift-change', variant: 'main', target: 2, progress: 1, doneAt: null },
            { templateId: 'dir.work-shift', variant: 'main', target: 1, progress: 0, doneAt: null },
          ],
          allDoneAt: null,
        },
      },
      { userId: 'old-idle', name: 'Idle', version: 1, job: null, sickDays: { week: 0, left: 2 } },
      { userId: 'new-one', name: 'New', version: 1, job: { id: 'x', since: 1, seniority: 4 } },
    ]);
    await City.collection.insertOne({
      _id: 'coalport' as unknown as never,
      ordinance: { id: 'ord.shift-hours', fromDay: 20_700, toDay: 20_705, paperId: 'coalport:1' },
      ordinanceHistory: [{ id: 'ord.shift-hours', fromDay: 20_700, toDay: 20_705 }],
    });
    await OrderPaper.collection.insertOne({
      _id: 'coalport:1' as unknown as never,
      cityId: 'coalport',
      cycle: 1,
      fromDay: 20_698,
      divideDay: 20_700,
      status: 'divided',
      items: [
        {
          ordinanceId: 'ord.shift-hours',
          movedBy: { kind: 'branch', npcId: 'holm', name: 'Holm' },
          at: new Date(),
          day: 20_698,
        },
      ],
      votes: [],
      division: {
        tallies: [{ choice: 'ord.shift-hours', player: 0, npc: 7 }],
        npcChoice: 'ord.shift-hours',
        npcAbstained: false,
        passed: 'ord.shift-hours',
        inForce: { fromDay: 20_700, toDay: 20_705 },
      },
    });

    expect(await migrateReview1Wage()).toBeGreaterThan(0);
    const worker = await Character.collection.findOne({ userId: 'old-worker' });
    expect(worker?.job).toEqual({ id: 'coalport-factory-worker', since: 20_700, seniority: 0 });
    expect(worker?.sickDays).toBeUndefined();
    expect(worker?.today).toEqual({ day: 20_706, energy: 4 });
    expect(worker?.orders.items.map((i: { templateId: string }) => i.templateId)).toEqual([
      'dir.shift-change',
    ]);
    expect((await Character.collection.findOne({ userId: 'old-idle' }))?.sickDays).toBeUndefined();
    expect((await Character.collection.findOne({ userId: 'new-one' }))?.job).toEqual({
      id: 'x',
      since: 1,
      seniority: 4,
    });
    const city = await City.collection.findOne({ _id: 'coalport' as unknown as never });
    expect(city?.ordinance.id).toBe('ord.long-service');
    expect(city?.ordinanceHistory[0].id).toBe('ord.long-service');
    const paper = await OrderPaper.collection.findOne({ _id: 'coalport:1' as unknown as never });
    expect(paper?.items[0].ordinanceId).toBe('ord.long-service');
    expect(paper?.division).toMatchObject({
      passed: 'ord.long-service',
      npcChoice: 'ord.long-service',
      tallies: [{ choice: 'ord.long-service' }],
    });

    // Idempotent: a second run changes nothing.
    expect(await migrateReview1Wage()).toBe(0);
  });
});
