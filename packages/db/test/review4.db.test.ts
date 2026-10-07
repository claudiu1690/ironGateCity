/**
 * Review 4, T2 (tech design docs/tech/review-4.md §14): migration 008's skeleton. `ensureIndexes`
 * runs it after 007; each step is in place and returns its counts, and a second run modifies nothing.
 * The steps' filters and fixtures land with their phases (6: `cardAtForOpenJourneys`, 8:
 * `resetOldDrafts`), and this file grows with them.
 */
import { getContent } from '@irongate/content';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { connectDb, disconnectDb, ensureIndexes, migrateReview4, mongoose } from '../src';
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
    expect(Object.keys(first)).toEqual(['resetOldDrafts', 'cardAtForOpenJourneys']);
    for (const counts of Object.values(first)) {
      expect(counts).toEqual({ matched: expect.any(Number), modified: expect.any(Number) });
    }
    const second = await migrateReview4(getContent());
    for (const counts of Object.values(second)) expect(counts.modified).toBe(0);
  });
});
