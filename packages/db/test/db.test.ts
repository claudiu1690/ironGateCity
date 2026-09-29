import { getContent } from '@irongate/content';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  ActionLog,
  Character,
  City,
  PaperEntry,
  REQUEST_LOG_TTL_SECONDS,
  RequestLog,
  migrateSlice1CharacterFields,
  connectDb,
  disconnectDb,
  ensureIndexes,
  isDbUp,
  isDuplicateKeyError,
  mongoose,
  seed,
} from '../src';
import { withDbName } from '../src/testing/memoryReplSet';

beforeAll(async () => {
  await connectDb(withDbName(inject('mongoUri'), 'db-test'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
});

afterAll(async () => {
  await disconnectDb();
});

const logFields = (characterId: Types.ObjectId, idempotencyKey: string) => ({
  characterId,
  idempotencyKey,
  actionId: 'coalport.mill-gate.canvass',
  locationId: 'coalport.mill-gate',
  cityId: 'coalport',
  kind: 'checked' as const,
  times: 1,
  txAttempts: 1,
  seed: '0123456789abcdef0123456789abcdef',
  outcome: 'success' as const,
  result: { any: 'payload', nested: { empty: {} }, list: [] } as never,
});

describe('connection', () => {
  it('is up and is a replica set', async () => {
    expect(isDbUp()).toBe(true);
    const hello = await mongoose.connection.db!.admin().command({ hello: 1 });
    expect(hello.setName).toBe('rs0');
  });
});

describe('indexes', () => {
  it('characters has a unique userId index', async () => {
    const indexes = await Character.collection.indexes();
    expect(indexes).toContainEqual(expect.objectContaining({ key: { userId: 1 }, unique: true }));
  });

  it('actionLogs has the idempotency lock and the history index', async () => {
    const indexes = await ActionLog.collection.indexes();
    expect(indexes).toContainEqual(
      expect.objectContaining({ key: { characterId: 1, idempotencyKey: 1 }, unique: true }),
    );
    expect(indexes).toContainEqual(expect.objectContaining({ key: { characterId: 1, createdAt: -1 } }));
  });

  it('paperEntries is unique per character and day', async () => {
    const indexes = await PaperEntry.collection.indexes();
    expect(indexes).toContainEqual(
      expect.objectContaining({ key: { characterId: 1, day: 1 }, unique: true }),
    );
    const characterId = new Types.ObjectId();
    const edition = {
      characterId,
      day: 20_000,
      cityId: 'coalport',
      firstEdition: true,
      headlines: [],
      desk: { salary: null, streak: null, restedBanked: 0, daysSinceLastPaper: null, yesterday: null },
      snapshot: { level: 1, rank: 1, standingLevel: 0 },
    };
    await PaperEntry.create(edition);
    const err = await PaperEntry.create(edition).catch((e: unknown) => e);
    expect(isDuplicateKeyError(err)).toBe(true);
  });

  it('requestLogs has the idempotency lock and a 7-day TTL', async () => {
    const indexes = await RequestLog.collection.indexes();
    expect(indexes).toContainEqual(
      expect.objectContaining({ key: { characterId: 1, idempotencyKey: 1 }, unique: true }),
    );
    expect(indexes).toContainEqual(
      expect.objectContaining({ key: { createdAt: 1 }, expireAfterSeconds: REQUEST_LOG_TTL_SECONDS }),
    );
    expect(REQUEST_LOG_TTL_SECONDS).toBe(604_800);
  });

  it('ensureIndexes can run again', async () => {
    await expect(ensureIndexes()).resolves.toBeUndefined();
  });
});

describe('actionLogs', () => {
  it('rejects a duplicate idempotency key for the same character', async () => {
    const characterId = new Types.ObjectId();
    await ActionLog.create(logFields(characterId, 'key-1'));
    const err = await ActionLog.create(logFields(characterId, 'key-1')).catch((e: unknown) => e);
    expect(isDuplicateKeyError(err)).toBe(true);
    expect(await ActionLog.countDocuments({ characterId })).toBe(1);
  });

  it('allows the same key for a different character', async () => {
    await ActionLog.create(logFields(new Types.ObjectId(), 'shared-key'));
    await expect(ActionLog.create(logFields(new Types.ObjectId(), 'shared-key'))).resolves.toBeTruthy();
  });

  it('stores the result verbatim, empty objects included', async () => {
    const characterId = new Types.ObjectId();
    await ActionLog.create(logFields(characterId, 'verbatim'));
    const log = await ActionLog.findOne({ characterId }).lean();
    expect(log?.result).toEqual({ any: 'payload', nested: { empty: {} }, list: [] });
    expect(log?.createdAt).toBeInstanceOf(Date);
  });

  it('rejects a malformed seed', async () => {
    const bad = { ...logFields(new Types.ObjectId(), 'bad-seed'), seed: 'not-hex' };
    await expect(ActionLog.create(bad)).rejects.toThrow(/seed/);
  });
});

describe('transactions', () => {
  it('commit together and roll back together', async () => {
    const characterId = new Types.ObjectId();
    const value = await mongoose.connection.transaction(async (session) => {
      await ActionLog.create([logFields(characterId, 'txn-1')], { session });
      return 'committed';
    });
    expect(value).toBe('committed');

    await expect(
      mongoose.connection.transaction(async (session) => {
        await ActionLog.create([logFields(characterId, 'txn-2')], { session });
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');
    expect(await ActionLog.countDocuments({ characterId })).toBe(1);
  });
});

describe('migration 001 (slice-1 character fields)', () => {
  it('fills a slice-0 character once and is idempotent', async () => {
    const now = new Date();
    const { insertedId } = await Character.collection.insertOne({
      userId: `slice0-${Date.now()}`,
      name: 'Old Timer',
      factionId: 'collective',
      homeCityId: 'coalport',
      cityId: 'coalport',
      stats: { str: 10, int: 12, agi: 5, chaBase: 2 },
      energy: { value: 50, updatedAt: now },
      rested: 0,
      xp: 90,
      level: 1,
      fxp: 12,
      iron: 40,
      version: 3,
      createdAt: now,
      updatedAt: now,
    });
    expect(await migrateSlice1CharacterFields()).toBeGreaterThanOrEqual(1);
    const doc = await Character.findById(insertedId).lean();
    expect(doc).toMatchObject({
      statPointsPending: 0,
      rank: 1,
      pc: 0,
      localStanding: [],
      job: null,
      day: { settled: null },
      orders: { items: [], allDoneAt: null },
      today: { day: null, energy: 0, shiftWorked: false },
      lastActionAt: null,
      xp: 90,
      version: 3,
    });
    expect(await migrateSlice1CharacterFields()).toBe(0);
    expect(await Character.findById(insertedId).lean()).toEqual(doc);
  });
});

describe('seed', () => {
  it('upserts one state document per content city, idempotently', async () => {
    const content = getContent();
    const first = await seed(content);
    expect(first.inserted).toBe(content.cities.length);

    const coalport = await City.findById('coalport').lean();
    expect(coalport?.opinion).toEqual({ vanguard: 9, collective: 70, alliance: 6, neutral: 15 });

    // Live state changes are never overwritten by a re-seed.
    await City.updateOne(
      { _id: 'coalport' },
      { $set: { 'opinion.neutral': 14.95, 'opinion.collective': 70.05 } },
    );
    const before = await City.findById('coalport').lean();
    const second = await seed(content);
    expect(second.inserted).toBe(0);
    const after = await City.findById('coalport').lean();
    expect(after).toEqual(before);
    expect(await City.countDocuments()).toBe(content.cities.length);
  });
});
