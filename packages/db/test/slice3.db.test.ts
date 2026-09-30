import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  Candidacy,
  Character,
  City,
  Election,
  OfficeTerm,
  OrderPaper,
  Vote,
  connectDb,
  disconnectDb,
  ensureIndexes,
  isDuplicateKeyError,
  migrateSlice3Politics,
  mongoose,
} from '../src';
import { withDbName } from '../src/testing/memoryReplSet';

beforeAll(async () => {
  await connectDb(withDbName(inject('mongoUri'), 'db-slice3-test'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
});
afterAll(disconnectDb);

const election = (cycle: number) => ({
  _id: `coalport:${cycle}`,
  cityId: 'coalport',
  factionId: 'collective' as const,
  cycle,
  nominationsFrom: 5 * cycle + 2,
  pollsFrom: 5 * cycle + 4,
  countDay: 5 * cycle + 7,
  status: 'nominations' as const,
  seed: 'abc',
  npcSlate: [],
});

const key = async (m: { collection: { indexes: () => Promise<Array<{ key: object; unique?: boolean }>> } }) =>
  (await m.collection.indexes()).map((i) => ({ key: i.key, unique: i.unique ?? false }));

describe('slice-3 collections (ADR 0019, 0020)', () => {
  it('the natural keys are unique indexes', async () => {
    expect(await key(Election)).toContainEqual({ key: { cityId: 1, cycle: -1 }, unique: true });
    expect(await key(Candidacy)).toContainEqual({ key: { electionId: 1, characterId: 1 }, unique: true });
    expect(await key(Vote)).toContainEqual({ key: { electionId: 1, voterId: 1 }, unique: true });
    expect(await key(OfficeTerm)).toContainEqual({ key: { councilKey: 1, seat: 1 }, unique: true });
    expect(await key(Character)).toContainEqual({
      key: { homeCityId: 1, rank: 1, lastActionAt: -1 },
      unique: false,
    });
  });

  it('a second election for the same city and cycle, a second ballot, a second seat are refused', async () => {
    await Election.create(election(4145));
    await expect(Election.create({ ...election(4145), _id: 'coalport:x' })).rejects.toSatisfy(
      isDuplicateKeyError,
    );
    const voterId = new Types.ObjectId();
    await Vote.create({ electionId: 'coalport:4145', voterId, candidateKey: 'n:npc.c.weiss', day: 1 });
    await expect(
      Vote.create({ electionId: 'coalport:4145', voterId, candidateKey: 'n:npc.c.baum', day: 1 }),
    ).rejects.toSatisfy(isDuplicateKeyError);
    const term = {
      cityId: 'coalport',
      councilKey: 'coalport:4146',
      electionId: 'coalport:4145',
      seat: 1,
      fromDay: 1,
      toDay: 6,
      holder: { kind: 'npc' as const, npcId: 'npc.c.weiss', name: 'Anna Weiss' },
      place: 1,
      total: 44,
    };
    await OfficeTerm.create(term);
    await expect(OfficeTerm.create(term)).rejects.toSatisfy(isDuplicateKeyError);
    const characterId = new Types.ObjectId();
    const cand = {
      electionId: 'coalport:4145',
      cityId: 'coalport',
      cycle: 4145,
      characterId,
      name: 'Mara Lenk',
      platformId: 'plat.c.mill',
      filedAt: new Date(),
      filedDay: 1,
      status: 'filed' as const,
      deposit: 'held' as const,
    };
    await Candidacy.create(cand);
    await expect(Candidacy.create(cand)).rejects.toSatisfy(isDuplicateKeyError);
  });

  it('migration 003 fills the political fields once', async () => {
    await Character.collection.insertOne({ userId: 'old-user', name: 'Old', version: 1 });
    expect(await migrateSlice3Politics()).toBe(1);
    const doc = await Character.collection.findOne({ userId: 'old-user' });
    expect(doc).toMatchObject({ offices: [], endorsementsGiven: [] });
    expect(await migrateSlice3Politics()).toBe(0);
  });

  it('a transaction touching all five collections and the city commits', async () => {
    await City.create({
      _id: 'coalport',
      opinion: { vanguard: 9, collective: 70, alliance: 6, neutral: 15 },
    });
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Election.create([election(4146)], { session });
      await Candidacy.create(
        [
          {
            electionId: 'coalport:4146',
            cityId: 'coalport',
            cycle: 4146,
            characterId: new Types.ObjectId(),
            name: 'A',
            platformId: 'plat.c.mill',
            filedAt: new Date(),
            filedDay: 1,
            status: 'filed',
            deposit: 'held',
          },
        ],
        { session },
      );
      await Vote.create(
        [{ electionId: 'coalport:4146', voterId: new Types.ObjectId(), candidateKey: 'n:x', day: 1 }],
        { session },
      );
      await OfficeTerm.create(
        [
          {
            cityId: 'coalport',
            councilKey: 'coalport:4147',
            electionId: 'coalport:4146',
            seat: 1,
            fromDay: 1,
            toDay: 6,
            holder: { kind: 'player', characterId: new Types.ObjectId(), name: 'B' },
            place: 1,
            total: 47,
          },
        ],
        { session },
      );
      await OrderPaper.create(
        [{ _id: 'coalport:4147', cityId: 'coalport', cycle: 4147, fromDay: 1, divideDay: 3, status: 'open' }],
        { session },
      );
      await City.updateOne(
        { _id: 'coalport' },
        { $set: { world: { settledDay: 1, bootstrappedDay: 1 } } },
        { session },
      );
    });
    await session.endSession();
    expect(await OrderPaper.findById('coalport:4147').lean()).toMatchObject({ status: 'open', items: [] });
    expect((await City.findById('coalport').lean())!.world).toEqual({ settledDay: 1, bootstrappedDay: 1 });
    expect(await OfficeTerm.countDocuments({ 'holder.kind': 'player' })).toBe(1);
  });
});
