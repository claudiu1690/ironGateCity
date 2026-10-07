/**
 * Review 4, T2 (tech design docs/tech/review-4.md §14): migration 008's skeleton. `ensureIndexes`
 * runs it after 007; each step is in place and returns its counts, and a second run modifies nothing.
 * The steps' filters and fixtures land with their phases (6: `cardAtForOpenJourneys`, 8:
 * `resetOldDrafts`), and this file grows with them.
 */
import { getContent } from '@irongate/content';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { Character, cellsNowIndex, connectDb, disconnectDb, ensureIndexes, migrateReview4, mongoose } from '../src';
import { withDbName } from '../src/testing/memoryReplSet';

beforeAll(async () => {
  await connectDb(withDbName(inject('mongoUri'), 'db-review4-test'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
});
afterAll(disconnectDb);

describe('migration 008 (review 4)', () => {
  it('runs every step in order, counted, and twice modifies nothing', async () => {
    const first = await migrateReview4(getContent());
    expect(Object.keys(first)).toEqual(['resetOldDrafts', 'cardAtForOpenJourneys', 'cellsNowIndex']);
    for (const counts of Object.values(first)) {
      expect(counts).toEqual({ matched: expect.any(Number), modified: expect.any(Number) });
    }
    const second = await migrateReview4(getContent());
    for (const counts of Object.values(second)) expect(counts.modified).toBe(0);
  });

  // Phase 2 (ADR 0078): *In the cells now* reads the players held at a station by a partial index.
  it('the held_cells_now partial index exists (schema), and the step makes it when missing', async () => {
    const find = async () => (await Character.collection.indexes()).find((i) => i.name === 'held_cells_now');
    const idx = await find();
    expect(idx?.key).toEqual({ 'held.locationId': 1, 'held.until': 1 });
    expect(idx?.partialFilterExpression).toEqual({ 'held.state': 'in', 'held.kind': 'cells' });
    expect(await cellsNowIndex()).toEqual({ matched: 1, modified: 0 });
    await Character.collection.dropIndex('held_cells_now');
    expect(await cellsNowIndex()).toEqual({ matched: 0, modified: 1 });
    expect((await find())?.partialFilterExpression).toEqual({ 'held.state': 'in', 'held.kind': 'cells' });
    expect(await cellsNowIndex()).toEqual({ matched: 1, modified: 0 });
  });

  it('orders.off is stored on the day orders and read back; a settlement-style $set drops it', async () => {
    const _id = new mongoose.Types.ObjectId();
    await Character.collection.insertOne({ _id, orders: { day: 5, items: [], allDoneAt: null } } as never);
    await Character.updateOne({ _id }, { $set: { orders: { day: 5, items: [], allDoneAt: null, off: { at: new Date(1_000), reason: 'cells' } } } });
    expect((await Character.findById(_id).lean())?.orders.off).toEqual({ at: new Date(1_000), reason: 'cells' });
    await Character.updateOne({ _id }, { $set: { orders: { day: 6, items: [], allDoneAt: null } } });
    expect((await Character.findById(_id).lean())?.orders.off ?? null).toBeNull();
    await Character.deleteOne({ _id });
  });
});
