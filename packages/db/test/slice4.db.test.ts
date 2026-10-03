/**
 * Slice 4, T11 (tech design §5, §15): the six new collections and their indexes, the changed unique
 * keys, migration 006 (twice: nothing the second time) and a transaction over every new collection
 * on the memory replica set.
 */
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  Award,
  Candidacy,
  Character,
  City,
  Contribution,
  District,
  Election,
  InfluenceLedger,
  IssueModel,
  Journey,
  OfficeTerm,
  OrderPaper,
  connectDb,
  contributionId,
  disconnectDb,
  ensureIndexes,
  isDuplicateKeyError,
  issueDocId,
  migrateSlice4TravelResidence,
  mongoose,
} from '../src';
import { withDbName } from '../src/testing/memoryReplSet';
import { getContent } from '@irongate/content';

beforeAll(async () => {
  await connectDb(withDbName(inject('mongoUri'), 'db-slice4-test'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
});
afterAll(disconnectDb);

const key = async (m: { collection: { indexes: () => Promise<Array<{ key: object; unique?: boolean }>> } }) =>
  (await m.collection.indexes()).map((i) => ({ key: i.key, unique: i.unique ?? false }));

describe('the six collections (tech design §5.1–§5.6)', () => {
  it('have their indexes, natural keys unique', async () => {
    expect(await key(Journey)).toEqual(
      expect.arrayContaining([
        { key: { characterId: 1, n: 1 }, unique: true },
        { key: { characterId: 1, boardedAt: -1 }, unique: false },
        { key: { status: 1, arrivesAt: 1 }, unique: false },
        { key: { to: 1, boardedAt: -1 }, unique: false },
      ]),
    );
    expect(await key(District)).toContainEqual({ key: { cityId: 1 }, unique: false });
    expect(await key(InfluenceLedger)).toEqual(
      expect.arrayContaining([
        { key: { placeId: 1, cycleKey: 1 }, unique: false },
        { key: { 'source.characterId': 1, day: -1 }, unique: false },
      ]),
    );
    expect(await key(Contribution)).toEqual(
      expect.arrayContaining([
        { key: { scope: 1, amount: -1, lastAt: 1 }, unique: false },
        { key: { characterId: 1, kind: 1, ref: 1 }, unique: false },
      ]),
    );
    expect(await key(IssueModel)).toContainEqual({ key: { cityId: 1, weekDay: -1 }, unique: false });
    expect(await key(Award)).toEqual(
      expect.arrayContaining([
        { key: { kind: 1, ref: 1, characterId: 1 }, unique: true },
        { key: { characterId: 1, creditedAt: 1 }, unique: false },
        { key: { characterId: 1, kind: 1 }, unique: false },
      ]),
    );
  });

  it('a second journey n, a second award, a re-filled seat from another day', async () => {
    const characterId = new Types.ObjectId();
    const journey = {
      characterId,
      n: 1,
      from: 'coalport',
      to: 'irongate',
      boardedAt: new Date(0),
      arrivesAt: new Date(720_000),
      minutes: 12,
      fare: { base: 20, lines: [], total: 20 },
      seed: 'a'.repeat(32),
      card: { eventId: 'jev.passenger' },
      status: 'onTheWay' as const,
    };
    await Journey.create(journey);
    await expect(Journey.create(journey)).rejects.toSatisfy(isDuplicateKeyError);
    const award = {
      characterId,
      kind: 'hero' as const,
      cityId: 'irongate',
      placeId: 'irongate.eastside',
      ref: 'irongate.eastside:4146',
      pc: 25,
      day: 20_735,
    };
    await Award.create(award);
    await expect(Award.create(award)).rejects.toSatisfy(isDuplicateKeyError);
    const term = {
      cityId: 'coalport',
      councilKey: 'coalport:4147',
      electionId: 'coalport:4146',
      seat: 3,
      fromDay: 20_737,
      toDay: 20_742,
      holder: { kind: 'player' as const, characterId, name: 'Vera' },
      place: 3,
      total: 30,
    };
    await OfficeTerm.create(term);
    await expect(OfficeTerm.create(term)).rejects.toSatisfy(isDuplicateKeyError);
    // ADR 0026: a seat vacated at a move is re-filled by an NPC from the move's day.
    await OfficeTerm.create({
      ...term,
      fromDay: 20_739,
      holder: { kind: 'npc' as const, npcId: 'npc.c.weiss', name: 'Anna Weiss' },
    });
    // Five district elections share the capital's city and cycle.
    for (const d of ['irongate.eastside', 'irongate.old-town'])
      await Election.create({
        _id: `${d}:4146`,
        cityId: 'irongate',
        kind: 'district',
        placeId: d,
        cycle: 4146,
        nominationsFrom: 20_730,
        pollsFrom: 20_732,
        countDay: 20_735,
        status: 'nominations',
        seed: 'x',
        npcSlate: [],
      });
    expect(await Election.countDocuments({ cityId: 'irongate', cycle: 4146 })).toBe(2);
  });

  it('a new character lives at home with every window open', async () => {
    const c = new Character({ userId: 'u-new', homeCityId: 'duskwall', cityId: 'duskwall' });
    expect(c.toObject().residence).toEqual({
      cityId: 'duskwall',
      districtId: null,
      sinceDay: 0,
      votesFromDay: 0,
      standsFromDay: 0,
      canMoveFromDay: 0,
    });
    expect([c.journey, c.journeysMade, c.toObject().journeyDeck?.seen, c.room, c.lastQuoted]).toEqual([
      null,
      0,
      [],
      null,
      null,
    ]);
  });
});

describe('migration 006 (tech design §5.9)', () => {
  it('fills the travel and residence fields once; the second run changes nothing', async () => {
    const content = getContent();
    const oldId = new Types.ObjectId();
    await Character.collection.insertOne({
      _id: oldId,
      userId: 'old-006',
      name: 'Old',
      homeCityId: 'coalport',
      cityId: 'coalport',
      endorsementsGiven: [
        { electionId: 'coalport:4145', candidacyId: new Types.ObjectId(), name: 'A', day: 1 },
      ],
      version: 1,
    });
    await Election.collection.insertOne({
      _id: 'coalport:4100' as unknown as never,
      cityId: 'coalport',
      factionId: 'collective',
      cycle: 4100,
      status: 'counted',
      ballot: [{ key: 'n:npc.c.weiss', kind: 'npc', name: 'Anna Weiss', platform: '', order: 0 }],
    });
    await Candidacy.collection.insertOne({
      electionId: 'coalport:4100',
      cityId: 'coalport',
      cycle: 4100,
      characterId: oldId,
      name: 'Old',
      status: 'defeated',
    });
    await OfficeTerm.collection.insertOne({
      cityId: 'ashford',
      councilKey: 'ashford:4100',
      electionId: 'ashford:4099',
      seat: 7,
      fromDay: 1,
      toDay: 6,
      holder: { kind: 'npc', npcId: 'npc.a.x', name: 'X' },
    });
    await OrderPaper.collection.insertOne({
      _id: 'duskwall:4100' as unknown as never,
      cityId: 'duskwall',
      cycle: 4100,
      status: 'divided',
      items: [
        {
          ordinanceId: 'ord.rally-permits',
          movedBy: { kind: 'branch', npcId: 'stahl', name: 'Stahl' },
          day: 1,
        },
      ],
    });

    expect(await migrateSlice4TravelResidence(content)).toBeGreaterThanOrEqual(11);
    const c = await Character.collection.findOne({ _id: oldId });
    expect(c).toMatchObject({
      residence: {
        cityId: 'coalport',
        districtId: null,
        sinceDay: 0,
        votesFromDay: 0,
        standsFromDay: 0,
        canMoveFromDay: 0,
      },
      journey: null,
      journeysMade: 0,
      journeyDeck: { seen: [] },
      room: null,
      firstCapitalArrivalAt: null,
      lastQuoted: null,
    });
    expect(c!.endorsementsGiven[0].cityCycle).toBe('coalport:4145');
    expect(await Election.collection.findOne({ _id: 'coalport:4100' as unknown as never })).toMatchObject({
      kind: 'home',
      placeId: 'coalport',
      ballot: [{ key: 'n:npc.c.weiss', factionId: 'collective' }],
    });
    expect(await Candidacy.collection.findOne({ electionId: 'coalport:4100' })).toMatchObject({
      factionId: 'collective',
      placeId: 'coalport',
    });
    expect(await OfficeTerm.collection.findOne({ councilKey: 'ashford:4100' })).toMatchObject({
      factionId: 'alliance',
      districtId: null,
      vacatedDay: null,
    });
    expect(await OrderPaper.collection.findOne({ _id: 'duskwall:4100' as unknown as never })).toMatchObject({
      items: [{ movedBy: { kind: 'branch', factionId: 'vanguard' } }],
    });

    expect(await migrateSlice4TravelResidence(content)).toBe(0);
    // And the whole start-up path is idempotent too.
    await ensureIndexes();
    expect(await migrateSlice4TravelResidence(content)).toBe(0);
  });
});

describe('a transaction over every new collection (tech design §15)', () => {
  it('commits on the memory replica set', async () => {
    const characterId = new Types.ObjectId();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await City.create([{ _id: 'irongate' }], { session });
        await District.create(
          [
            {
              _id: 'irongate.eastside',
              cityId: 'irongate',
              opinion: { vanguard: 15, collective: 35, alliance: 15, neutral: 35 },
              state: {
                day: 20_730,
                battleground: false,
                controlledBy: null,
                previous: { battleground: false, controlledBy: null },
              },
            },
          ],
          { session },
        );
        await Journey.create(
          [
            {
              characterId,
              n: 1,
              from: 'coalport',
              to: 'irongate',
              boardedAt: new Date(),
              arrivesAt: new Date(),
              minutes: 12,
              fare: { base: 20, lines: [], total: 20 },
              seed: 'b'.repeat(32),
              card: null,
              status: 'onTheWay',
            },
          ],
          { session },
        );
        await InfluenceLedger.create(
          [
            {
              cityId: 'irongate',
              placeId: 'irongate.eastside',
              factionId: 'collective',
              swing: 94,
              kind: 'action',
              source: { kind: 'character', characterId },
              ref: 'log-1',
              day: 20_731,
              cycleKey: 'irongate.eastside:4146',
              at: new Date(),
            },
          ],
          { session },
        );
        const scope = 'influence|irongate.eastside:4146';
        await Contribution.updateOne(
          { _id: contributionId(scope, characterId) },
          {
            $inc: { amount: 94 },
            $set: { level: 10, lastAt: new Date(), name: 'Vera' },
            $setOnInsert: {
              scope,
              kind: 'influence',
              cityId: 'irongate',
              placeId: 'irongate.eastside',
              ref: 'irongate.eastside:4146',
              characterId,
              factionId: 'collective',
            },
          },
          { upsert: true, session },
        );
        await IssueModel.create(
          [
            {
              _id: issueDocId('irongate', 20_731, 'issue.tram-fares'),
              cityId: 'irongate',
              districtId: 'irongate.station-market',
              issueId: 'issue.tram-fares',
              weekDay: 20_731,
              order: 1,
              seed: 'c'.repeat(32),
              status: 'live',
            },
          ],
          { session },
        );
        await IssueModel.updateOne(
          { _id: 'irongate:20731:issue.tram-fares', status: 'live' },
          { $inc: { 'momentum.collective': 10 } },
          { session },
        );
        await Award.create(
          [
            {
              characterId,
              kind: 'issue',
              cityId: 'irongate',
              placeId: 'irongate.station-market',
              ref: 'irongate:20731:issue.tram-fares',
              pc: 4,
              day: 20_738,
            },
          ],
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
    expect(await District.countDocuments()).toBe(1);
    expect(
      await Contribution.findById(contributionId('influence|irongate.eastside:4146', characterId)).lean(),
    ).toMatchObject({
      amount: 94,
      level: 10,
    });
    expect((await IssueModel.findById('irongate:20731:issue.tram-fares').lean())?.momentum).toEqual({
      vanguard: 0,
      collective: 10,
      alliance: 0,
    });
    // The capital's city document has no meter of its own (ADR 0027).
    expect((await City.findById('irongate').lean())?.opinion).toBeUndefined();
    expect(await InfluenceLedger.countDocuments({ placeId: 'irongate.eastside' })).toBe(1);
    expect(await Award.countDocuments({ creditedAt: null })).toBeGreaterThanOrEqual(1);
  });
});
