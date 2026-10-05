/**
 * QA (slice 5): migration 007 (tech design §5.5) on the cases the developer's test leaves open: the
 * slice-4 shapes that differ (a character whose `today` is null or missing, one with no
 * `journeyDeck`, one whose slice-4 migration never ran), the whole chain 006 → 007, two server
 * starts migrating at the same moment, and the second run changing nothing byte for byte. Every
 * migrated character must load through the schema and read like a fresh one.
 */
import type { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  Character,
  District,
  connectDb,
  disconnectDb,
  ensureIndexes,
  migrateSlice4TravelResidence,
  migrateSlice5Risk,
  mongoose,
} from '../src';
import type { CharacterDoc } from '../src';
import { withDbName } from '../src/testing/memoryReplSet';
import { getContent } from '@irongate/content';

beforeAll(async () => {
  await connectDb(withDbName(inject('mongoUri'), 'qa-db-slice5'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
});
afterAll(disconnectDb);

const SLICE5_TOP = ['heat', 'health', 'record', 'held', 'runIn', 'ways', 'flags', 'barred', 'hostileDeck', 'rivalTrips', 'firsts'];

const base = (userId: string, extra: Partial<CharacterDoc> = {}) => ({
  userId,
  name: 'Vera Kos',
  factionId: 'alliance' as const,
  homeCityId: 'ashford',
  cityId: 'ashford',
  avatarId: 'av.a.1',
  stats: { str: 5, int: 7, agi: 6, chaBase: 2 },
  energy: { value: 100, updatedAt: new Date('2026-10-01T08:00:00Z') },
  rested: 0,
  xp: 120,
  level: 6,
  fxp: 40,
  iron: 55,
  version: 3,
  ...extra,
});

/** A character as slice 4 stored it, with a hook to bend the stored shape. */
async function insertOld(userId: string, bend: (o: Record<string, unknown>) => void = () => {}): Promise<Types.ObjectId> {
  const o = new Character(base(userId)).toObject() as unknown as Record<string, unknown> & {
    _id: Types.ObjectId;
    stats: Record<string, unknown>;
    journeyDeck?: Record<string, unknown>;
    today?: Record<string, unknown> | null;
  };
  for (const k of SLICE5_TOP) delete o[k];
  delete o.stats.agiQuarters;
  if (o.journeyDeck) delete o.journeyDeck.firstDone;
  if (o.today) {
    delete o.today.missions;
    delete o.today.rivalCityId;
  }
  bend(o);
  const now = new Date();
  await Character.collection.insertOne({ ...o, createdAt: now, updatedAt: now });
  return o._id;
}

const snapshot = async () => {
  const out: Record<string, unknown[]> = {};
  for (const name of ['characters', 'districts']) {
    out[name] = await mongoose.connection.db!.collection(name).find().sort({ _id: 1 }).toArray();
  }
  return JSON.parse(JSON.stringify(out)) as Record<string, unknown[]>;
};

describe('QA · migration 007, the odd shapes and two starts at once', () => {
  it('fills every odd slice-4 shape the same way, concurrently, and a second run changes nothing', async () => {
    const ids = {
      todayNull: await insertOld('qa7-today-null', (o) => (o.today = null)),
      todayMissing: await insertOld('qa7-today-missing', (o) => delete o.today),
      noDeck: await insertOld('qa7-no-deck', (o) => {
        delete o.journeyDeck;
        o.journeysMade = 3;
      }),
      slice3: await insertOld('qa7-slice3', (o) => {
        // Never saw migration 006: no travel or residence fields at all.
        for (const k of ['journeyDeck', 'journey', 'journeysMade', 'residence', 'room', 'firstCapitalArrivalAt', 'lastQuoted']) delete o[k];
      }),
    };
    await District.collection.insertMany([
      {
        _id: 'irongate.government' as unknown as Types.ObjectId,
        cityId: 'irongate',
        opinion: { vanguard: 25, collective: 25, alliance: 25, neutral: 25 },
        state: { day: 20_735, battleground: true, controlledBy: null, previous: { battleground: false, controlledBy: null } },
      },
      // A district with no state object yet: the migration leaves it for the boundary.
      { _id: 'irongate.garrison-hill' as unknown as Types.ObjectId, cityId: 'irongate', opinion: { vanguard: 40, collective: 20, alliance: 20, neutral: 20 } },
    ]);

    // The chain as a start-up runs it: 006 first (the slice-3 character), then 007 from two servers at once.
    await migrateSlice4TravelResidence(getContent());
    const [a, b] = await Promise.all([migrateSlice5Risk(), migrateSlice5Risk()]);
    expect(a + b).toBe(4 + 1); // four characters and one district, each once
    const after = await snapshot();

    for (const [name, id] of Object.entries(ids)) {
      const raw = (await Character.collection.findOne({ _id: id }))!;
      expect(raw.heat?.value, name).toBe(0);
      expect(raw.health?.damage, name).toBe(0);
      expect(raw.record, name).toEqual({ marks: [], arrests: [] });
      expect(raw.held, name).toBeNull();
      expect(raw.runIn, name).toBeNull();
      expect(raw.stats.agiQuarters, name).toBe(0);
      expect(raw.hostileDeck, name).toEqual({ seen: [] });
      // It loads and validates through the schema, and its tally and deck read sensibly.
      await expect(Character.hydrate(raw).validate(), name).resolves.toBeUndefined();
      const doc = Character.hydrate(raw).toObject() as CharacterDoc;
      expect(typeof doc.journeyDeck?.firstDone, name).toBe('boolean');
    }
    const noDeck = (await Character.collection.findOne({ _id: ids.noDeck }))!;
    expect(noDeck.journeyDeck.firstDone).toBe(true);

    // The tally of a character whose `today` was null: it must not become a day-less tally that a
    // reader mistakes for today (a `today.day` is what every reader compares).
    const tn = (await Character.collection.findOne({ _id: ids.todayNull }))!;
    // (The schema's default for `today` is `{}`, so null is not a shape slice 4 writes; it reads as no day.)
    expect(tn.today).toEqual({ missions: 0, rivalCityId: null });

    const leaders = await District.collection.find({}, { projection: { state: 1 } }).sort({ _id: 1 }).toArray();
    expect(leaders.map((d) => [d._id, d.state?.leader ?? null])).toEqual([
      ['irongate.garrison-hill', null],
      ['irongate.government', 'vanguard'],
    ]);

    expect(await migrateSlice5Risk()).toBe(0);
    await ensureIndexes();
    expect(await migrateSlice5Risk()).toBe(0);
    expect(await snapshot()).toEqual(after);
  });
});
