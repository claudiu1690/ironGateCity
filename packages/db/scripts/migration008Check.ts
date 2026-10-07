/**
 * Review 4, T29 (`pnpm --filter @irongate/db exec tsx scripts/migration008Check.ts`): migration 008 run
 * twice through `ensureIndexes` on a seeded in-memory database holding what a database played through
 * slices 0–5 holds for it: drafts mid-way through the old origin, a journey on the way with a card from
 * before `card.at`, and a closed one. Prints the counts of both runs; the second modifies nothing.
 */
import { getContent } from '@irongate/content';
import {
  Arrival,
  Journey,
  connectDb,
  disconnectDb,
  ensureIndexes,
  mongoose,
  seed,
} from '../src';
import { startMemoryReplSet, withDbName } from '../src/testing/memoryReplSet';

const rs = await startMemoryReplSet();
await connectDb(withDbName(rs.uri, 'migration008'));
const content = getContent();
// A fresh database: indexes, the earlier migrations and the seed (as `pnpm dev:mem` starts).
const boot = await ensureIndexes(content);
await seed(content);
console.log('start-up on an empty database:', JSON.stringify(boot.review4));

// What a slice 0–5 database holds for migration 008.
const at = new Date(Date.UTC(2026, 9, 6, 20));
const old = (n: number) =>
  ['origin.summer', 'origin.trouble', 'origin.talent', 'origin.coat', 'origin.promise', 'origin.wish']
    .slice(0, n)
    .map((questionId) => ({ questionId, answerId: 'c', at }));
await Arrival.insertMany([
  { userId: 'played-1', name: 'Ida Brenner', avatarId: 'avatar.woman-30s', answers: old(3) },
  { userId: 'played-2', name: 'Otto Brandt', avatarId: 'avatar.man-40s', answers: old(6) },
  { userId: 'played-3', name: 'Kit Harrow', avatarId: 'avatar.man-20s', answers: [] },
  {
    userId: 'played-4',
    name: 'Mara Lenk',
    avatarId: 'avatar.woman-20s',
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
  seed: 'b'.repeat(32),
  choice: null,
};
await Journey.collection.insertMany([
  { ...base, n: 1, status: 'onTheWay', card: { eventId: 'jev.passenger', deck: 'ordinary' } },
  { ...base, n: 2, status: 'closed', card: { eventId: 'jev.passenger', deck: 'ordinary' } },
] as never[]);

const first = await ensureIndexes(content);
console.log('run 1:', JSON.stringify(first.review4));
const second = await ensureIndexes(content);
console.log('run 2:', JSON.stringify(second.review4));
const modified = Object.values(second.review4).reduce((s, c) => s + c.modified, 0);
console.log(modified === 0 ? 'run 2 modified nothing' : `run 2 modified ${modified}`);
await disconnectDb();
await rs.stop();
