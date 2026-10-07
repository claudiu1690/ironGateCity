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

// Phase 6 (ADR 0075 §5): a journey on the way with a card and no `card.at` is answerable at once.
describe('migration 008: cardAtForOpenJourneys', () => {
  it('sets card.at = boardedAt on open journeys with a card and none, and nothing else; twice modifies nothing', async () => {
    const { Journey, cardAtForOpenJourneys } = await import('../src');
    const characterId = new mongoose.Types.ObjectId();
    const boardedAt = new Date(Date.UTC(2026, 9, 7, 14, 10));
    const base = {
      characterId,
      from: 'coalport',
      to: 'irongate',
      boardedAt,
      arrivesAt: new Date(boardedAt.getTime() + 12 * 60_000),
      minutes: 12,
      fare: { base: 20, lines: [], total: 20 },
      seed: 'a'.repeat(32),
      choice: null,
    };
    const drawnAt = new Date(boardedAt.getTime() + 5 * 60_000);
    const docs = await Journey.collection.insertMany([
      { ...base, n: 1, status: 'onTheWay', card: { eventId: 'jev.passenger', deck: 'ordinary' } },
      { ...base, n: 2, status: 'onTheWay', card: { eventId: 'jev.passenger', at: drawnAt } },
      { ...base, n: 3, status: 'onTheWay', card: null },
      { ...base, n: 4, status: 'arrived', card: { eventId: 'jev.passenger' } },
      { ...base, n: 5, status: 'closed', card: { eventId: 'jev.passenger' } },
    ] as never[]);
    const ids = Object.values(docs.insertedIds);
    const first = await cardAtForOpenJourneys();
    expect(first).toEqual({ matched: 1, modified: 1 });
    const read = async (i: number) => (await Journey.collection.findOne({ _id: ids[i] }))!.card as { at?: Date } | null;
    expect((await read(0))?.at).toEqual(boardedAt);
    expect((await read(0)) as unknown).toMatchObject({ eventId: 'jev.passenger', deck: 'ordinary' });
    expect((await read(1))?.at).toEqual(drawnAt);
    expect(await read(2)).toBeNull();
    expect((await read(3))?.at).toBeUndefined();
    expect((await read(4))?.at).toBeUndefined();
    expect(await cardAtForOpenJourneys()).toEqual({ matched: 0, modified: 0 });
    await Journey.deleteMany({ characterId });
  });
});

// Phase 8 (ADR 0073): a draft mid-way through the old six questions starts again at the platform.
describe('migration 008: resetOldDrafts', () => {
  it('empties the answers of an open draft on the old questions only, keeping face and name; twice modifies nothing', async () => {
    const { Arrival, resetOldDrafts } = await import('../src');
    const content = getContent();
    const userIds = ['u-old', 'u-new', 'u-empty', 'u-done'].map((x) => `${x}-${Date.now()}`);
    const at = new Date(Date.UTC(2026, 9, 7, 9));
    const old = [
      { questionId: 'origin.summer', answerId: 'c', at },
      { questionId: 'origin.trouble', answerId: 'c', at },
    ];
    const fresh = [{ questionId: 'origin.platform', answerId: 'holm', at }];
    const docs = await Arrival.insertMany([
      { userId: userIds[0], name: 'Old Draft', avatarId: 'avatar.woman-30s', answers: old },
      { userId: userIds[1], name: 'New Draft', avatarId: 'avatar.woman-30s', answers: fresh },
      { userId: userIds[2], name: 'Empty Draft', avatarId: 'avatar.woman-30s', answers: [] },
      {
        userId: userIds[3],
        name: 'Done',
        avatarId: 'avatar.woman-30s',
        answers: old,
        completedAt: at,
        factionId: 'collective',
        characterId: new mongoose.Types.ObjectId(),
      },
    ]);
    expect(await resetOldDrafts(content)).toEqual({ matched: 1, modified: 1 });
    const read = async (i: number) => (await Arrival.findById(docs[i]!._id).lean())!;
    const reset = await read(0);
    expect(reset.answers).toEqual([]);
    expect([reset.name, reset.avatarId, reset.completedAt]).toEqual(['Old Draft', 'avatar.woman-30s', null]);
    expect((await read(1)).answers.map((a) => a.questionId)).toEqual(['origin.platform']);
    expect((await read(3)).answers).toHaveLength(2);
    expect(await resetOldDrafts(content)).toEqual({ matched: 0, modified: 0 });
    await Arrival.deleteMany({ userId: { $in: userIds } });
  });

  it('a transaction over characters, journeys, arrivals and officeTerms commits', async () => {
    const { Arrival, Journey, OfficeTerm } = await import('../src');
    const session = await mongoose.startSession();
    const userId = `u-tx-${Date.now()}`;
    try {
      await session.withTransaction(async () => {
        await Character.find({}).session(session).limit(1);
        await Journey.find({}).session(session).limit(1);
        await OfficeTerm.find({}).session(session).limit(1);
        await Arrival.create([{ userId, name: 'Tx', avatarId: null, answers: [] }], { session });
      });
    } finally {
      await session.endSession();
    }
    expect(await Arrival.countDocuments({ userId })).toBe(1);
    await Arrival.deleteMany({ userId });
  });
});
