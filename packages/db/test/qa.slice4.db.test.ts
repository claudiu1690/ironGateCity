/**
 * QA (slice 4): migration 006 run twice over a mixed database (tech design §5.9): slice-3 documents
 * next to documents slice 4 already wrote (a capital resident, a district election and its
 * candidacy, a capital term, a capital endorsement), an orphan candidacy and an election with no
 * ballot. The first run fills only what is missing and never touches a slice-4 value; the second run
 * changes nothing, byte for byte.
 */
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  Candidacy,
  Character,
  Election,
  OfficeTerm,
  OrderPaper,
  connectDb,
  disconnectDb,
  ensureIndexes,
  migrateSlice4TravelResidence,
  mongoose,
} from '../src';
import { withDbName } from '../src/testing/memoryReplSet';
import { getContent } from '@irongate/content';

beforeAll(async () => {
  await connectDb(withDbName(inject('mongoUri'), 'qa-db-slice4'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
});
afterAll(disconnectDb);

const snapshot = async () => {
  const out: Record<string, unknown[]> = {};
  for (const name of ['characters', 'elections', 'candidacies', 'officeTerms', 'orderPapers']) {
    out[name] = await mongoose.connection.db!.collection(name).find().sort({ _id: 1 }).toArray();
  }
  return JSON.parse(JSON.stringify(out)) as Record<string, unknown[]>;
};

describe('QA · migration 006 over a mixed database', () => {
  it('fills slice-3 documents, leaves slice-4 values alone, and the second run is a no-op', async () => {
    const content = getContent();
    const slice3 = new Types.ObjectId();
    const capital = new Types.ObjectId();
    const resident = {
      cityId: 'irongate',
      districtId: 'irongate.eastside',
      sinceDay: 20730,
      votesFromDay: 20732,
      standsFromDay: 20735,
      canMoveFromDay: 20737,
    };
    await Character.collection.insertMany([
      {
        _id: slice3,
        userId: 'qa-006-a',
        name: 'Slice Three',
        homeCityId: 'ashford',
        cityId: 'ashford',
        endorsementsGiven: [
          { electionId: 'ashford:4100', candidacyId: new Types.ObjectId(), name: 'A', day: 1 },
          { electionId: 'ashford:4101', candidacyId: new Types.ObjectId(), name: 'B', day: 6 },
        ],
        version: 3,
      },
      {
        _id: capital,
        userId: 'qa-006-b',
        name: 'Capital Four',
        homeCityId: 'coalport',
        cityId: 'irongate',
        residence: resident,
        journey: null,
        journeysMade: 4,
        journeyDeck: { seen: ['jev.passenger', 'jev.boy'] },
        room: { cityId: 'irongate', fromDay: 20730, untilDay: 20737 },
        firstCapitalArrivalAt: new Date('2026-10-01T10:00:00Z'),
        lastQuoted: { day: 20731, issueId: 'issue.tram-fares' },
        endorsementsGiven: [
          {
            electionId: 'irongate.old-town:4146',
            candidacyId: new Types.ObjectId(),
            name: 'C',
            day: 20730,
            cityCycle: 'irongate:4146',
          },
        ],
        version: 9,
      },
    ]);
    await Election.collection.insertMany([
      { _id: 'ashford:4100' as never, cityId: 'ashford', factionId: 'alliance', cycle: 4100, status: 'nominations', ballot: null },
      {
        _id: 'irongate.eastside:4146' as never,
        cityId: 'irongate',
        kind: 'district',
        placeId: 'irongate.eastside',
        cycle: 4146,
        status: 'polling',
        ballot: [{ key: 'n:npc.c.ig.novak', kind: 'npc', factionId: 'collective', name: 'Pavel Novak', order: 0 }],
      },
    ]);
    await Candidacy.collection.insertMany([
      { electionId: 'ashford:4100', cityId: 'ashford', cycle: 4100, characterId: slice3, name: 'Slice Three', status: 'filed' },
      { electionId: 'ashford:3999', cityId: 'ashford', cycle: 3999, characterId: slice3, name: 'Orphan', status: 'defeated' },
      {
        electionId: 'irongate.eastside:4146',
        cityId: 'irongate',
        factionId: 'vanguard',
        placeId: 'irongate.eastside',
        cycle: 4146,
        characterId: capital,
        name: 'Capital Four',
        status: 'standing',
      },
    ]);
    await OfficeTerm.collection.insertMany([
      { cityId: 'duskwall', councilKey: 'duskwall:4100', seat: 1, fromDay: 1, toDay: 6, holder: { kind: 'npc', npcId: 'x', name: 'X' } },
      {
        cityId: 'irongate',
        councilKey: 'irongate:4146',
        seat: 7,
        factionId: 'collective',
        districtId: 'irongate.eastside',
        vacatedDay: 20731,
        fromDay: 20730,
        toDay: 20735,
        holder: { kind: 'npc', npcId: 'npc.c.ig.novak', name: 'Pavel Novak' },
      },
    ]);
    await OrderPaper.collection.insertOne({
      _id: 'irongate:4146' as never,
      cityId: 'irongate',
      cycle: 4146,
      status: 'open',
      items: [{ ordinanceId: 'ord.rally-permits', movedBy: { kind: 'branch', npcId: 'stahl', name: 'Stahl', factionId: 'vanguard' }, day: 20730 }],
    });

    const before = await snapshot();
    expect(await migrateSlice4TravelResidence(content)).toBeGreaterThan(0);
    const first = await snapshot();
    // The capital documents are exactly as they were.
    const byId = (list: unknown[], id: string) => (list as Array<{ _id: string }>).find((d) => d._id === id);
    expect(byId(first.characters!, capital.toHexString())).toEqual(byId(before.characters!, capital.toHexString()));
    expect(byId(first.elections!, 'irongate.eastside:4146')).toEqual(byId(before.elections!, 'irongate.eastside:4146'));
    expect(first.orderPapers).toEqual(before.orderPapers);
    const capitalTerm = (first.officeTerms as Array<{ cityId: string }>).find((t) => t.cityId === 'irongate');
    expect(capitalTerm).toEqual((before.officeTerms as Array<{ cityId: string }>).find((t) => t.cityId === 'irongate'));
    // The slice-3 documents are filled: at home, every window open; each endorsement keyed by its election.
    const old = byId(first.characters!, slice3.toHexString()) as unknown as Record<string, unknown> & {
      endorsementsGiven: Array<{ electionId: string; cityCycle: string }>;
    };
    expect(old.residence).toEqual({ cityId: 'ashford', districtId: null, sinceDay: 0, votesFromDay: 0, standsFromDay: 0, canMoveFromDay: 0 });
    expect(old.endorsementsGiven.map((e) => e.cityCycle)).toEqual(['ashford:4100', 'ashford:4101']);
    expect(byId(first.elections!, 'ashford:4100')).toMatchObject({ kind: 'home', placeId: 'ashford', ballot: null });
    const cands = first.candidacies as Array<{ electionId: string; placeId?: string; factionId?: string }>;
    expect(cands.find((c) => c.electionId === 'ashford:4100')).toMatchObject({ placeId: 'ashford', factionId: 'alliance' });
    // The orphan (no election on record) is left as it was, and does not make the second run count it.
    expect(cands.find((c) => c.electionId === 'ashford:3999')!.placeId).toBeUndefined();
    expect((first.officeTerms as Array<{ cityId: string }>).find((t) => t.cityId === 'duskwall')).toMatchObject({
      factionId: 'vanguard',
      districtId: null,
      vacatedDay: null,
    });

    expect(await migrateSlice4TravelResidence(content)).toBe(0);
    expect(await snapshot()).toEqual(first);
  });
});
