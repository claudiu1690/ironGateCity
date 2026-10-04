/**
 * Slice 5, T10 (tech design §5, §18): the `encounters` and `stays` collections and their indexes,
 * the characters' risk fields, the changed enums and request kinds, migration 007 (twice: nothing
 * the second time) and a transaction over every touched collection on the memory replica set.
 */
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import {
  ActionLog,
  Character,
  City,
  District,
  Encounter,
  Journey,
  REQUEST_KINDS,
  RequestLog,
  Stay,
  connectDb,
  disconnectDb,
  ensureIndexes,
  isDuplicateKeyError,
  migrateSlice5Risk,
  mongoose,
} from '../src';
import type { ActionLogKind, ActionLogOutcome, CharacterDoc } from '../src';
import type { ActionResult } from '@irongate/rules';
import { withDbName } from '../src/testing/memoryReplSet';

beforeAll(async () => {
  await connectDb(withDbName(inject('mongoUri'), 'db-slice5-test'));
  await mongoose.connection.dropDatabase();
  await ensureIndexes();
});
afterAll(disconnectDb);

const indexes = async (m: {
  collection: {
    indexes: () => Promise<Array<{ key: object; unique?: boolean; partialFilterExpression?: object }>>;
  };
}) =>
  (await m.collection.indexes()).map((i) => ({
    key: i.key,
    unique: i.unique ?? false,
    partial: i.partialFilterExpression ?? null,
  }));

/** A slice-4 character as the slice-4 server creates it (every required field). */
const slice4Character = (userId: string, extra: Partial<CharacterDoc> = {}) => ({
  userId,
  name: 'Vera',
  factionId: 'collective' as const,
  homeCityId: 'coalport',
  cityId: 'coalport',
  avatarId: 'av.c.1',
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

/** The fields slice 5 adds to a character (tech design §5.1). */
const SLICE5_TOP = [
  'heat',
  'health',
  'record',
  'held',
  'runIn',
  'ways',
  'flags',
  'barred',
  'hostileDeck',
  'rivalTrips',
  'firsts',
] as const;

/** Insert a character the way slice 4 stored it: built by the schema, then without slice 5's fields. */
async function insertSlice4Raw(userId: string, extra: Partial<CharacterDoc> = {}): Promise<Types.ObjectId> {
  const o = new Character(slice4Character(userId, extra)).toObject() as unknown as Record<string, unknown> & {
    _id: Types.ObjectId;
    stats: Record<string, unknown>;
    journeyDeck: Record<string, unknown>;
    today: Record<string, unknown>;
  };
  for (const k of SLICE5_TOP) delete o[k];
  delete o.stats.agiQuarters;
  delete o.journeyDeck.firstDone;
  delete o.today.missions;
  delete o.today.rivalCityId;
  const now = new Date();
  await Character.collection.insertOne({ ...o, createdAt: now, updatedAt: now });
  return o._id;
}

/** The slice-5 part of a stored character, without the timestamps. */
type RawRisk = Required<
  Pick<
    CharacterDoc,
    | 'heat'
    | 'health'
    | 'record'
    | 'held'
    | 'runIn'
    | 'ways'
    | 'flags'
    | 'barred'
    | 'hostileDeck'
    | 'rivalTrips'
    | 'firsts'
    | 'journeyDeck'
    | 'stats'
    | 'today'
  >
>;
const riskPart = (raw: object, d = raw as RawRisk) => ({
  heat: { value: d.heat.value },
  health: { damage: d.health.damage },
  record: d.record,
  held: d.held,
  runIn: d.runIn,
  ways: d.ways,
  agiQuarters: d.stats.agiQuarters,
  flags: d.flags,
  barred: d.barred,
  hostileDeck: d.hostileDeck,
  rivalTrips: d.rivalTrips,
  firsts: d.firsts,
  firstDone: d.journeyDeck.firstDone,
  missions: d.today.missions,
  rivalCityId: d.today.rivalCityId,
});

const snapshot = async () => {
  const out: Record<string, unknown[]> = {};
  for (const name of ['characters', 'districts']) {
    out[name] = await mongoose.connection.db!.collection(name).find().sort({ _id: 1 }).toArray();
  }
  return out;
};

const encounter = (characterId: Types.ObjectId, idempotencyKey: string) => ({
  characterId,
  idempotencyKey,
  kind: 'mission' as const,
  refId: 'msn.cp.ledger',
  locationId: 'cp.docks',
  cityId: 'coalport',
  day: 20_735,
  rivalGround: false,
  seed: 'd'.repeat(32),
  opponent: { id: 'opp.cp.foreman', power: 33, agi: 8, wits: 6, payOff: 40, fightPct: 55 },
  you: { power: 30, agi: 6, cha: 2, armour: 0, health: 130, healthMax: 130 },
  chances: { fight: 48, run: 52, talk: 35, pay: 100 },
  held: { kind: 'mission', missionId: 'msn.cp.ledger', wayId: 'quiet', outcome: 'success' },
  state: 'pending' as const,
  decideBy: new Date(Date.now() + 300_000),
});

const stay = (characterId: Types.ObjectId) => ({
  characterId,
  kind: 'cells' as const,
  cityId: 'coalport',
  locationId: 'cp.police',
  rivalGround: false,
  reason: 'caught' as const,
  since: new Date(),
  until: new Date(Date.now() + 20 * 60_000),
  minutes: 20,
  heatAtArrest: 80,
  marks: 2,
  again: false,
  bail: { base: 70, total: 60, lines: [{ id: 'ord.x', label: 'Bail Reform', pct: -10 }] },
});

describe('encounters and stays (tech design §5.2, §5.3)', () => {
  it('have their indexes: the start key unique, pending run-ins in a partial index', async () => {
    expect(await indexes(Encounter)).toEqual(
      expect.arrayContaining([
        { key: { characterId: 1, idempotencyKey: 1 }, unique: true, partial: null },
        { key: { characterId: 1, createdAt: -1 }, unique: false, partial: null },
        { key: { state: 1, decideBy: 1 }, unique: false, partial: { state: 'pending' } },
      ]),
    );
    expect(await indexes(Stay)).toEqual(
      expect.arrayContaining([
        { key: { characterId: 1, since: -1 }, unique: false, partial: null },
        { key: { characterId: 1, releasedAt: -1 }, unique: false, partial: null },
      ]),
    );
  });

  it('one run-in per start key; a pending one is unresolved until chosen', async () => {
    const characterId = new Types.ObjectId();
    const e = await Encounter.create(encounter(characterId, 'start-1'));
    await expect(Encounter.create(encounter(characterId, 'start-1'))).rejects.toSatisfy(isDuplicateKeyError);
    await Encounter.create(encounter(characterId, 'start-2'));
    await Encounter.create(encounter(new Types.ObjectId(), 'start-1'));
    expect(await Encounter.findById(e._id).lean()).toMatchObject({
      state: 'pending',
      choice: null,
      by: null,
      outcome: null,
      logId: null,
      resolvedAt: null,
      resolvedAsOf: null,
      held: { missionId: 'msn.cp.ledger', wayId: 'quiet' },
      opponent: { payOff: 40 },
    });
    // A choice outside the four is refused; a resolution is a conditional update.
    await expect(
      Encounter.create({ ...encounter(characterId, 'start-3'), choice: 'flee' as never }),
    ).rejects.toThrow(/choice/);
    const r = await Encounter.updateOne(
      { _id: e._id, state: 'pending' },
      {
        $set: { state: 'resolved', choice: 'talk', by: 'player', outcome: 'talked', resolvedAt: new Date() },
      },
    );
    expect(r.modifiedCount).toBe(1);
    const again = await Encounter.updateOne(
      { _id: e._id, state: 'pending' },
      { $set: { state: 'resolved', choice: 'fight', by: 'player', outcome: 'won' } },
    );
    expect(again.matchedCount).toBe(0);
    expect(await Encounter.countDocuments({ state: 'pending', characterId })).toBe(1);
  });

  it('a stay starts unreleased, with slice 6 fields empty', async () => {
    const s = await Stay.create(stay(new Types.ObjectId()));
    expect(await Stay.findById(s._id).lean()).toMatchObject({
      logId: null,
      encounterId: null,
      releasedAt: null,
      how: null,
      ironPaid: 0,
      heatAfter: null,
      healthAfter: null,
      deportJourneyId: null,
      barredUntil: null,
      result: null,
      closedAt: null,
      bailPostedBy: null,
      visits: [],
      bail: { base: 70, total: 60, lines: [{ id: 'ord.x', label: 'Bail Reform', pct: -10 }] },
    });
    await expect(Stay.create({ ...stay(new Types.ObjectId()), reason: 'bored' as never })).rejects.toThrow(
      /reason/,
    );
    await expect(Stay.create({ ...stay(new Types.ObjectId()), how: 'escaped' as never })).rejects.toThrow(
      /how/,
    );
  });
});

describe('characters: the risk fields (tech design §5.1)', () => {
  it('a new character starts cool, unhurt, free, with a clean record', async () => {
    const c = await Character.create(slice4Character('u-new-5'));
    const raw = (await Character.collection.findOne({ _id: c._id }))!;
    expect(riskPart(raw)).toEqual({
      heat: { value: 0 },
      health: { damage: 0 },
      record: { marks: [], arrests: [] },
      held: null,
      runIn: null,
      ways: [],
      agiQuarters: 0,
      flags: [],
      barred: [],
      hostileDeck: { seen: [] },
      rivalTrips: 0,
      firsts: {},
      firstDone: false,
      missions: 0,
      rivalCityId: null,
    });
    expect(raw.heat.at).toBeInstanceOf(Date);
    expect(raw.health.at).toBeInstanceOf(Date);
  });

  it('stores the pointers, the record and the flags with their enums', async () => {
    const c = await Character.create(slice4Character('u-held-5'));
    const stayId = new Types.ObjectId();
    const encounterId = new Types.ObjectId();
    const until = new Date(Date.now() + 600_000);
    const r = await Character.updateOne(
      { _id: c._id, version: 3, runIn: null, held: null },
      {
        $set: {
          held: {
            stayId,
            kind: 'cells',
            cityId: 'coalport',
            locationId: 'cp.police',
            since: new Date(),
            until,
            bail: { total: 60, lines: [] },
            rivalGround: false,
            state: 'in',
          },
          runIn: { encounterId, state: 'resolved', day: 20_735, decideBy: new Date(), cityId: 'coalport' },
          'record.marks': [
            { day: 20_735, kind: 'minor', logId: null },
            { day: 20_735, kind: 'serious', logId: 'abc' },
          ],
          'record.arrests': [20_735],
          flags: [{ cityId: 'ashford', day: 20_735, flag: 'watched' }],
          barred: [{ cityId: 'ashford', until }],
          ways: [{ missionId: 'msn.cp.ledger', wayId: 'quiet' }],
          'firsts.mission': new Date(),
          'stats.agiQuarters': 3,
          'today.missions': 1,
          'today.rivalCityId': 'ashford',
        },
        $inc: { version: 1, rivalTrips: 1, 'heat.value': 20 },
      },
    );
    expect(r.modifiedCount).toBe(1);
    const d = (await Character.findById(c._id).lean())!;
    expect(d).toMatchObject({
      held: { stayId, kind: 'cells', state: 'in', bail: { total: 60, lines: [] } },
      runIn: { encounterId, state: 'resolved', day: 20_735 },
      record: { marks: [{ kind: 'minor' }, { kind: 'serious', logId: 'abc' }], arrests: [20_735] },
      flags: [{ cityId: 'ashford', flag: 'watched' }],
      barred: [{ cityId: 'ashford', until }],
      rivalTrips: 1,
      heat: { value: 20 },
      stats: { agiQuarters: 3 },
      today: { missions: 1, rivalCityId: 'ashford' },
      version: 4,
    });
    expect(d.firsts?.mission).toBeInstanceOf(Date);
    // A hydrated document validates its enums.
    const bad = new Character({
      ...slice4Character('u-bad-5'),
      record: { marks: [{ day: 1, kind: 'grave', logId: null }], arrests: [] },
    });
    await expect(bad.validate()).rejects.toThrow(/kind/);
  });
});

describe('migration 007 (tech design §5.5)', () => {
  it('fills the risk fields once; the second run changes nothing', async () => {
    const traveller = await insertSlice4Raw('u-006-traveller', {
      journeysMade: 2,
      journeyDeck: { seen: ['jev.passenger', 'jev.ticket'] },
      today: {
        day: 20_735,
        energy: 30,
        attempts: 3,
        successes: 2,
        xp: 30,
        fxp: 3,
        iron: 12,
        pc: 0,
        opinion: 0.3,
        ordersDone: 1,
        statTrained: 0,
      },
    });
    const homebody = await insertSlice4Raw('u-006-homebody');
    // A character slice 5 already wrote: hot, marked, a first card shown. Never touched.
    const hot = await Character.create(
      slice4Character('u-007-hot', {
        stats: { str: 5, int: 7, agi: 6, chaBase: 2, agiQuarters: 2 },
        heat: { value: 64, at: new Date('2026-10-02T10:00:00Z') },
        health: { damage: 40, at: new Date('2026-10-02T10:00:00Z') },
        record: { marks: [{ day: 20_734, kind: 'moderate', logId: null }], arrests: [20_734] },
        firsts: { mission: new Date('2026-10-02T09:00:00Z') },
        rivalTrips: 2,
      }),
    );
    // The capital's districts: a clear leader, a tie (FACTION_IDS order), one already set.
    const state = {
      day: 20_735,
      battleground: false,
      controlledBy: null,
      previous: { battleground: false, controlledBy: null },
    };
    await District.collection.insertMany([
      {
        _id: 'irongate.eastside' as unknown as Types.ObjectId,
        cityId: 'irongate',
        opinion: { vanguard: 15, collective: 35, alliance: 15, neutral: 35 },
        state,
      },
      {
        _id: 'irongate.old-town' as unknown as Types.ObjectId,
        cityId: 'irongate',
        opinion: { vanguard: 30, collective: 20, alliance: 30, neutral: 20 },
        state: { ...state, battleground: true },
      },
      {
        _id: 'irongate.riverside' as unknown as Types.ObjectId,
        cityId: 'irongate',
        opinion: { vanguard: 10, collective: 50, alliance: 20, neutral: 20 },
        state: { ...state, leader: 'alliance' },
      },
    ]);
    const before = await snapshot();
    const hotBefore = before.characters!.find((c) => (c as { _id: Types.ObjectId })._id.equals(hot._id));

    // Two slice-4 characters and two districts.
    expect(await migrateSlice5Risk()).toBe(4);

    const t = (await Character.collection.findOne({ _id: traveller }))!;
    expect(riskPart(t)).toEqual({
      heat: { value: 0 },
      health: { damage: 0 },
      record: { marks: [], arrests: [] },
      held: null,
      runIn: null,
      ways: [],
      agiQuarters: 0,
      flags: [],
      barred: [],
      hostileDeck: { seen: [] },
      rivalTrips: 0,
      firsts: {},
      firstDone: true,
      missions: 0,
      rivalCityId: null,
    });
    expect(t.heat.at).toBeInstanceOf(Date);
    expect(t.health.at).toEqual(t.heat.at);
    // Nothing slice 4 stored is touched.
    expect(t.stats).toEqual({ str: 5, int: 7, agi: 6, chaBase: 2, agiQuarters: 0 });
    expect(t.journeyDeck).toEqual({ seen: ['jev.passenger', 'jev.ticket'], firstDone: true });
    expect(t.today).toMatchObject({ day: 20_735, energy: 30, attempts: 3, ordersDone: 1, missions: 0 });

    const h = (await Character.collection.findOne({ _id: homebody }))!;
    expect(h.journeyDeck).toEqual({ seen: [], firstDone: false });
    // A migrated character carries exactly what a new one does.
    const fresh = (await Character.collection.findOne({ userId: 'u-new-5' }))!;
    expect(riskPart(h)).toEqual(riskPart(fresh));
    // And it loads and validates through the schema.
    await expect(Character.hydrate(h).validate()).resolves.toBeUndefined();

    expect((await Character.collection.findOne({ _id: hot._id }))!).toEqual(hotBefore);

    const leaders = await District.find({}, { 'state.leader': 1 }).sort({ _id: 1 }).lean();
    expect(leaders.map((d) => [d._id, d.state.leader])).toEqual([
      ['irongate.eastside', 'collective'],
      ['irongate.old-town', 'vanguard'],
      ['irongate.riverside', 'alliance'],
    ]);

    // The second run, and the whole start-up path, change nothing.
    const after = await snapshot();
    expect(await migrateSlice5Risk()).toBe(0);
    await ensureIndexes();
    expect(await migrateSlice5Risk()).toBe(0);
    expect(await snapshot()).toEqual(after);
  });
});

describe('the changed collections (tech design §5.4)', () => {
  const log = (kind: ActionLogKind, outcome: ActionLogOutcome, key: string) => ({
    characterId: new Types.ObjectId(),
    idempotencyKey: key,
    actionId: 'msn.cp.ledger',
    locationId: 'cp.docks',
    cityId: 'coalport',
    kind,
    times: 1,
    txAttempts: 1,
    seed: 'e'.repeat(32),
    outcome,
    // The result's shape belongs to the server; a mission's is not built yet.
    result: { kind } as unknown as ActionResult,
  });

  it('actionLogs take a mission, the cells and the infirmary, and the run-in', async () => {
    const encounterId = new Types.ObjectId();
    for (const outcome of ['success', 'partial', 'failure', 'takenIn', 'carriedOff'] as const) {
      await ActionLog.create({ ...log('mission', outcome, `m-${outcome}`), encounterId });
    }
    expect(await ActionLog.countDocuments({ kind: 'mission', encounterId })).toBe(5);
    // A slice-4 row has no run-in.
    const plain = await ActionLog.create(log('checked', 'success', 'c-1'));
    expect((await ActionLog.findById(plain._id).lean())!.encounterId).toBeUndefined();
    await expect(ActionLog.create(log('heist' as never, 'success', 'x-1'))).rejects.toThrow(/kind/);
    await expect(ActionLog.create(log('mission', 'escaped' as never, 'x-2'))).rejects.toThrow(/outcome/);
  });

  it('the request kinds include the run-in choice, the release acts and the strike', async () => {
    const added = [
      'encounter.choose',
      'held.bail',
      'held.walkOut',
      'held.discharge',
      'record.strike',
    ] as const;
    expect(REQUEST_KINDS).toEqual(expect.arrayContaining([...added, 'travel.board', 'job.take']));
    const characterId = new Types.ObjectId();
    for (const kind of added) {
      await RequestLog.create({ characterId, idempotencyKey: kind, kind, inputHash: 'h', result: { ok: 1 } });
    }
    expect(await RequestLog.countDocuments({ characterId })).toBe(5);
    await expect(
      RequestLog.create({
        characterId,
        idempotencyKey: 'z',
        kind: 'held.escape' as never,
        inputHash: 'h',
        result: {},
      }),
    ).rejects.toThrow(/kind/);
  });

  it('journeys: a ticket by default; a deportation; the card deck', async () => {
    const characterId = new Types.ObjectId();
    const base = {
      characterId,
      from: 'coalport',
      to: 'ashford',
      boardedAt: new Date(),
      arrivesAt: new Date(Date.now() + 720_000),
      minutes: 12,
      seed: 'f'.repeat(32),
      status: 'onTheWay' as const,
    };
    const ticket = await Journey.create({
      ...base,
      n: 1,
      fare: { base: 30, lines: [], total: 30 },
      card: { eventId: 'jev.checkpoint', deck: 'hostile' },
      rivalGround: true,
    });
    const j = (await Journey.findById(ticket._id).lean())!;
    expect(j.kind).toBeUndefined();
    expect([j.rivalGround, j.card]).toEqual([true, { eventId: 'jev.checkpoint', deck: 'hostile' }]);
    const plain = await Journey.create({
      ...base,
      n: 2,
      fare: { base: 20, lines: [], total: 20 },
      card: null,
    });
    expect((await Journey.findById(plain._id).lean())!.rivalGround).toBe(false);
    await expect(
      Journey.create({
        ...base,
        n: 3,
        fare: { base: 0, lines: [], total: 0 },
        card: null,
        kind: 'escape' as never,
      }),
    ).rejects.toThrow(/kind/);
  });
});

describe('a transaction over every touched collection (tech design §18)', () => {
  it('commits on the memory replica set: an arrest on rival ground after a lost run-in', async () => {
    const c = await Character.create(slice4Character('u-tx-5', { cityId: 'ashford' }));
    const now = Date.now();
    const encounterId = new Types.ObjectId();
    const stayId = new Types.ObjectId();
    const logId = new Types.ObjectId();
    const journeyId = new Types.ObjectId();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await Encounter.create(
          [
            {
              ...encounter(c._id, 'tx-start'),
              _id: encounterId,
              cityId: 'ashford',
              rivalGround: true,
              state: 'resolved',
              choice: 'fight',
              by: 'player',
              outcome: 'lost',
              logId,
              resolvedAt: new Date(now),
              resolvedAsOf: new Date(now),
            },
          ],
          { session },
        );
        await Stay.create(
          [
            {
              ...stay(c._id),
              _id: stayId,
              cityId: 'ashford',
              locationId: 'as.police',
              rivalGround: true,
              reason: 'policeLoss',
              logId,
              encounterId,
              marks: 1,
            },
          ],
          { session },
        );
        await ActionLog.create(
          [
            {
              _id: logId,
              characterId: c._id,
              idempotencyKey: 'tx-start',
              actionId: 'msn.as.posters',
              locationId: 'as.square',
              cityId: 'ashford',
              kind: 'mission',
              times: 1,
              txAttempts: 1,
              seed: 'a'.repeat(32),
              outcome: 'takenIn',
              result: { kind: 'mission' } as unknown as ActionResult,
              encounterId,
            },
          ],
          { session },
        );
        await Journey.create(
          [
            {
              _id: journeyId,
              characterId: c._id,
              n: 1,
              from: 'ashford',
              to: 'coalport',
              boardedAt: new Date(now + 1_200_000),
              arrivesAt: new Date(now + 1_920_000),
              minutes: 12,
              fare: { base: 0, lines: [], total: 0 },
              seed: 'b'.repeat(32),
              card: null,
              status: 'onTheWay',
              kind: 'deported',
              stayId,
            },
          ],
          { session },
        );
        await City.updateOne(
          { _id: 'ashford' },
          { $set: { rivalPressure: { day: 20_735, lost: 400, prev: null } } },
          { upsert: true, session },
        );
        const w = await Character.updateOne(
          { _id: c._id, version: 3, runIn: null, held: null },
          {
            $set: {
              runIn: {
                encounterId,
                state: 'resolved',
                day: 20_735,
                decideBy: new Date(now),
                cityId: 'ashford',
              },
              held: {
                stayId,
                kind: 'cells',
                cityId: 'ashford',
                locationId: 'as.police',
                since: new Date(now),
                until: new Date(now + 1_200_000),
                bail: null,
                rivalGround: true,
                state: 'in',
              },
              'record.marks': [{ day: 20_735, kind: 'moderate', logId: logId.toHexString() }],
              'record.arrests': [20_735],
              'health.damage': 35,
              'today.missions': 1,
              'today.rivalCityId': 'ashford',
            },
            $inc: { version: 1 },
          },
          { session },
        );
        if (w.modifiedCount !== 1) throw new Error('version conflict');
      });
    } finally {
      await session.endSession();
    }
    expect(await Encounter.findById(encounterId).lean()).toMatchObject({ outcome: 'lost', logId });
    expect(await Stay.findById(stayId).lean()).toMatchObject({ reason: 'policeLoss', encounterId, logId });
    expect(await ActionLog.findById(logId).lean()).toMatchObject({ outcome: 'takenIn', encounterId });
    expect(await Journey.findById(journeyId).lean()).toMatchObject({ kind: 'deported', stayId, card: null });
    expect((await City.findById('ashford').lean())?.rivalPressure).toEqual({
      day: 20_735,
      lost: 400,
      prev: null,
    });
    expect(await Character.findById(c._id).lean()).toMatchObject({
      version: 4,
      runIn: { encounterId, state: 'resolved' },
      held: { stayId, state: 'in', rivalGround: true, bail: null },
      record: { arrests: [20_735] },
      health: { damage: 35 },
    });
  });
});
