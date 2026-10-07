/**
 * QA, review 4 (docs/qa/review-4-report.md): migration 008 as a start-up runs it, through
 * `ensureIndexes` (001–008 in order), on a database holding what slices 0–5 left behind: drafts at
 * every point of the old six-question origin, drafts already on the new beats, completed drafts,
 * journeys on the way with and without a card (and with a card already carrying `card.at`), arrived
 * and closed journeys. Run twice in a row, and twice at once (two servers starting together).
 */
import { getContent } from '@irongate/content';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { Arrival, Journey, connectDb, disconnectDb, ensureIndexes, mongoose } from '../src';
import { withDbName } from '../src/testing/memoryReplSet';

const content = getContent();
const OLD = ['origin.summer', 'origin.trouble', 'origin.talent', 'origin.coat', 'origin.promise', 'origin.wish'];
const NEW = content.origin.steps.flatMap((s) => s.questions.map((q) => q.id));
const at = new Date(Date.UTC(2026, 9, 6, 20));

beforeAll(async () => {
  await connectDb(withDbName(inject('mongoUri'), 'qa-review4-db'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes(content);
});
afterAll(disconnectDb);

async function fixtures() {
  await Arrival.deleteMany({});
  await Journey.deleteMany({});
  const old = (n: number) => OLD.slice(0, n).map((questionId) => ({ questionId, answerId: 'c', at }));
  const fresh = (n: number) =>
    content.origin.reference.slice(0, n).map((a) => ({ questionId: a.questionId, answerId: a.answerId, at }));
  await Arrival.insertMany([
    ...[1, 2, 3, 4, 5, 6].map((n) => ({ userId: `old-${n}`, name: `Old ${n}`, avatarId: 'avatar.man-30s', answers: old(n) })),
    { userId: 'new-1', name: 'New One', avatarId: 'avatar.woman-20s', answers: fresh(1) },
    { userId: 'new-2', name: 'New Two', avatarId: 'avatar.woman-20s', answers: fresh(2) },
    { userId: 'empty', name: 'Empty', avatarId: null, answers: [] },
    {
      userId: 'done-old',
      name: 'Done Old',
      avatarId: 'avatar.man-40s',
      answers: old(6),
      completedAt: at,
      factionId: 'collective',
      characterId: new mongoose.Types.ObjectId(),
    },
  ]);
  const base = {
    characterId: new mongoose.Types.ObjectId(),
    from: 'coalport',
    to: 'irongate',
    boardedAt: at,
    arrivesAt: new Date(at.getTime() + 12 * 60_000),
    minutes: 12,
    fare: { base: 20, lines: [], total: 20 },
    seed: 'c'.repeat(32),
    choice: null,
    kind: 'ticket',
    rivalGround: false,
  };
  const card = { eventId: 'jev.passenger', deck: 'ordinary' };
  const later = new Date(at.getTime() + 5 * 60_000);
  await Journey.collection.insertMany([
    { ...base, n: 1, status: 'onTheWay', card },
    { ...base, n: 2, status: 'onTheWay', card: { ...card, at: later } },
    { ...base, n: 3, status: 'onTheWay', card: null },
    { ...base, n: 4, status: 'arrived', card },
    { ...base, n: 5, status: 'closed', card },
  ] as never[]);
}

describe('migration 008 through ensureIndexes (QA)', () => {
  it('run 1 resets the six old drafts only and dates the one open card; run 2 changes nothing', async () => {
    await fixtures();
    const r1 = (await ensureIndexes(content)).review4;
    expect(r1.resetOldDrafts).toEqual({ matched: 6, modified: 6 });
    expect(r1.cardAtForOpenJourneys).toEqual({ matched: 1, modified: 1 });
    const r2 = (await ensureIndexes(content)).review4;
    expect(r2.resetOldDrafts).toEqual({ matched: 0, modified: 0 });
    expect(r2.cardAtForOpenJourneys).toEqual({ matched: 0, modified: 0 });
    expect(r2.cellsNowIndex.modified).toBe(0);

    const drafts = await Arrival.find({}).lean();
    const by = (id: string) => drafts.find((d) => d.userId === id)!;
    for (let n = 1; n <= 6; n++) {
      expect(by(`old-${n}`).answers).toEqual([]);
      expect([by(`old-${n}`).name, by(`old-${n}`).avatarId]).toEqual([`Old ${n}`, 'avatar.man-30s']);
    }
    expect(by('new-1').answers.map((a) => a.questionId)).toEqual(NEW.slice(0, 1));
    expect(by('new-2').answers.map((a) => a.questionId)).toEqual(NEW.slice(0, 2));
    expect(by('done-old').answers).toHaveLength(6);

    const js = await Journey.collection.find({}).sort({ n: 1 }).toArray();
    expect((js[0]!.card as { at: Date }).at).toEqual(at);
    expect((js[1]!.card as { at: Date }).at).toEqual(new Date(at.getTime() + 5 * 60_000));
    expect(js[2]!.card).toBeNull();
    expect((js[3]!.card as { at?: Date }).at).toBeUndefined();
    expect((js[4]!.card as { at?: Date }).at).toBeUndefined();
  });

  it('two start-ups at once: the drafts reset once, the card dated once, nothing left half-done', async () => {
    await fixtures();
    const [a, b] = await Promise.all([ensureIndexes(content), ensureIndexes(content)]);
    expect(a.review4.resetOldDrafts.modified + b.review4.resetOldDrafts.modified).toBe(6);
    expect(a.review4.cardAtForOpenJourneys.modified + b.review4.cardAtForOpenJourneys.modified).toBe(1);
    expect(await Arrival.countDocuments({ completedAt: null, 'answers.questionId': { $in: OLD } })).toBe(0);
    expect(await Journey.collection.countDocuments({ status: 'onTheWay', card: { $ne: null }, 'card.at': { $exists: false } })).toBe(0);
  });
});
