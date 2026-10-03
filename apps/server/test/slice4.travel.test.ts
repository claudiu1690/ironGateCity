/**
 * Slice 4, T15 (tech design §8.1–§8.3, §15 "travel"; ADR 0025): boarding, the fare, the card, the
 * lazy arrival and the tidy job racing it, the card's one choice, Continue, and the visitor's Herald.
 */
import { randomUUID } from 'node:crypto';
import { Character, City, Contribution, District, InfluenceLedger, IssueModel, Journey } from '@irongate/db';
import type { CharacterDoc, JourneyDoc } from '@irongate/db';
import { dayKey } from '@irongate/rules';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { recordingScheduler, setJourneyScheduler, noScheduler } from '../src/jobs/scheduler';
import { settleArrival } from '../src/services/travelService';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, content, setIssueEffect, setLiveIssues, traveller } from './slice4.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const MIN = 60_000;
const key = () => randomUUID();
const refusal = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => {
        throw new Error('expected a refusal');
      },
      (e: unknown) => e,
    ),
  );

let rec: ReturnType<typeof recordingScheduler>;
beforeAll(async () => {
  await setupDb('slice4-travel-test');
});
afterAll(teardownDb);
afterEach(() => setJourneyScheduler(noScheduler));

const fresh = (clock = testClock(at(DAY)), opts: Parameters<typeof traveller>[1] = {}) =>
  traveller(clock, opts).then((p) => ({ ...p, clock }));

describe('boarding (travel.board)', () => {
  it('one tap: the fare, the journey, the first card is the passenger, the tidy job scheduled', async () => {
    rec = recordingScheduler();
    setJourneyScheduler(rec);
    const { caller, id, clock } = await fresh();
    const r = await caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    expect(r.character.iron).toBe(980);
    expect(r.journey).toMatchObject({
      from: { cityId: 'coalport' },
      to: { cityId: 'irongate' },
      status: 'onTheWay',
      firstJourney: true,
      arrivesAt: clock.now() + 12 * MIN,
    });
    expect(r.journey.card?.eventId).toBe('jev.passenger');
    // The odds are a number for the client's word; the destination is Station & Market.
    expect(r.journey.card!.choices[0]!.chance).toBeGreaterThan(0);
    expect(r.journey.card!.choices[0]!.detail).toContain('Station & Market');
    expect(r.character.journey).toMatchObject({ to: 'irongate', status: 'onTheWay' });
    expect(rec.calls).toEqual([{ journeyId: r.journey.id, at: new Date(clock.now() + 12 * MIN) }]);
    const c = (await Character.findById(id).lean<CharacterDoc>())!;
    expect([c.cityId, c.journeysMade, c.journeyDeck?.seen]).toEqual(['coalport', 1, ['jev.passenger']]);
    const j = (await Journey.findById(r.journey.id).lean<JourneyDoc>())!;
    expect(j.fare).toEqual({ base: 20, lines: [], total: 20 });
    expect(j.n).toBe(1);
  });

  it('a double tap with one key is one journey; another key is refused in transit', async () => {
    const { caller, id } = await fresh();
    const k = key();
    const [a, b] = await Promise.all([
      caller.travel.board({ to: 'irongate', idempotencyKey: k }),
      caller.travel.board({ to: 'irongate', idempotencyKey: k }),
    ]);
    expect(a.journey.id).toBe(b.journey.id);
    expect(await Journey.countDocuments({ characterId: id })).toBe(1);
    expect((await refusal(caller.travel.board({ to: 'irongate', idempotencyKey: key() }))).game?.reason).toBe(
      'IN_TRANSIT',
    );
    // On the train the city and its actions are closed.
    expect((await refusal(caller.city.get({ cityId: 'coalport' }))).game?.reason).toBe('IN_TRANSIT');
    expect(
      (
        await refusal(
          caller.action.perform({
            actionId: 'coalport.mill-gate.canvass',
            locationId: 'coalport.mill-gate',
            idempotencyKey: key(),
            times: 1,
          }),
        )
      ).game?.reason,
    ).toBe('IN_TRANSIT');
    expect((await Character.findById(id).lean<CharacterDoc>())!.iron).toBe(980);
  });

  it('every refusal, and nothing written', async () => {
    const low = await fresh(undefined, { level: 9 });
    expect(await refusal(low.caller.travel.board({ to: 'irongate', idempotencyKey: key() }))).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'LEVEL_TOO_LOW', need: 10 },
    });
    const p = await fresh(undefined, { iron: 19 });
    expect(await refusal(p.caller.travel.board({ to: 'irongate', idempotencyKey: key() }))).toMatchObject({
      game: { reason: 'NOT_ENOUGH_IRON', iron: 19, cost: 20 },
    });
    expect(
      (await refusal(p.caller.travel.board({ to: 'coalport', idempotencyKey: key() }))).game?.reason,
    ).toBe('ALREADY_THERE');
    expect(await refusal(p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() }))).toMatchObject({
      game: { reason: 'DESTINATION_LOCKED', lock: 'rival' },
    });
    expect(await refusal(p.caller.travel.board({ to: 'clearwater', idempotencyKey: key() }))).toMatchObject({
      game: { reason: 'DESTINATION_LOCKED', lock: 'later' },
    });
    expect(await refusal(p.caller.travel.board({ to: 'atlantis', idempotencyKey: key() }))).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'UNKNOWN_DESTINATION' },
    });
    expect(await Journey.countDocuments({ characterId: { $in: [low.id, p.id] } })).toBe(0);
  });

  it('fares: the Tram Subsidy halves them (10); with the Tram Fare Hike too, 5, never below', async () => {
    const p = await fresh();
    await City.updateOne(
      { _id: 'coalport' },
      { $set: { ordinance: { id: 'ord.tram-subsidy', fromDay: DAY - 1, toDay: DAY + 4, paperId: null } } },
    );
    const nation = await p.caller.travel.nation();
    const ig = nation.cities.find((c) => c.cityId === 'irongate')!;
    expect(ig.fare).toEqual({
      base: 20,
      lines: [{ id: 'ord.tram-subsidy', label: 'Tram Subsidy', pct: -50 }],
      total: 10,
    });
    await City.updateOne({ _id: 'coalport' }, { $set: { ordinance: null } });
    // From the capital: the subsidy and the Fare Hike's effect: 20 → 10 → 5.
    const q = await fresh(undefined, { cityId: 'irongate' });
    await City.updateOne(
      { _id: 'irongate' },
      { $set: { ordinance: { id: 'ord.tram-subsidy', fromDay: DAY - 1, toDay: DAY + 4, paperId: null } } },
    );
    await setIssueEffect('irongate', 'issue.tram-fares', DAY - 1, DAY + 6);
    const r = await q.caller.travel.board({ to: 'coalport', idempotencyKey: key() });
    expect((await Journey.findById(r.journey.id).lean<JourneyDoc>())!.fare.total).toBe(5);
    expect(r.character.iron).toBe(995);
    await City.updateOne({ _id: 'irongate' }, { $set: { ordinance: null, 'issues.effects': [] } });
  });
});

describe('arrival (ADR 0025 §4)', () => {
  it('lazily at arrivesAt and not a millisecond before; the arrival modal; Continue lands at Central Station', async () => {
    const { caller, id, clock } = await fresh();
    const b = await caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    clock.set(b.journey.arrivesAt - 1);
    expect((await caller.character.me()).cityId).toBe('coalport');
    expect((await caller.travel.journey())!.status).toBe('onTheWay');
    clock.set(b.journey.arrivesAt);
    const me = await caller.character.me();
    expect([me.cityId, me.journey?.status]).toEqual(['irongate', 'arrived']);
    const j = (await caller.travel.journey())!;
    expect(j.arrival).toMatchObject({
      stamp: 'Arrived',
      place: 'Irongate · Station & Market',
      headline: "You're in the capital",
      knockOns: { ticket: 20, heraldVisitor: true },
      landing: {
        cityId: 'irongate',
        quarterId: 'irongate.station-market',
        locationId: 'irongate.central-station',
      },
    });
    expect(j.arrival!.art).toMatchObject({ rung: 'map-crop', x: 0.35, y: 0.555 });
    expect((await Character.findById(id).lean<CharacterDoc>())!.firstCapitalArrivalAt?.getTime()).toBe(
      b.journey.arrivesAt,
    );
    const closed = await caller.travel.close({ journeyId: j.id });
    expect(closed.landing).toEqual(j.arrival!.landing);
    expect(closed.character.journey).toBeNull();
    // Idempotent: Continue again returns the same landing.
    expect((await caller.travel.close({ journeyId: j.id })).landing).toEqual(j.arrival!.landing);
    const stored = (await Journey.findById(j.id).lean<JourneyDoc>())!;
    // The passenger's card was never answered: slept through.
    expect([stored.status, stored.sleptThrough]).toEqual(['closed', true]);
    expect(await caller.travel.journey()).toBeNull();
    // The capital is open now (the city view).
    const city = await caller.city.get({ cityId: 'irongate' });
    expect(city.districts).toHaveLength(5);
  });

  it('the tidy job and a request at once: one arrival', async () => {
    const { caller, id, clock } = await fresh();
    const b = await caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    clock.set(b.journey.arrivesAt + 5);
    const before = (await Character.findById(id).lean<CharacterDoc>())!.version;
    const [job1, job2, me] = await Promise.all([
      settleArrival(content, b.journey.id, clock.now()),
      settleArrival(content, b.journey.id, clock.now()),
      caller.character.me(),
    ]);
    expect(me.cityId).toBe('irongate');
    const c = (await Character.findById(id).lean<CharacterDoc>())!;
    // Exactly one runner moved the character (the version moved once for the arrival).
    expect([job1, job2].filter(Boolean).length).toBeLessThanOrEqual(1);
    expect(c.version - before).toBeLessThanOrEqual(2);
    expect(c.journey?.status).toBe('arrived');
    // A job run before arrivesAt does nothing.
    const again = await fresh();
    const b2 = await again.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    expect(await settleArrival(content, b2.journey.id, b2.journey.arrivesAt - 1)).toBe(false);
  });

  it('boarding while arrived but not closed closes the old journey first', async () => {
    const { caller, clock } = await fresh();
    const b = await caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    clock.set(b.journey.arrivesAt + 1);
    const back = await caller.travel.board({ to: 'coalport', idempotencyKey: key() });
    expect(back.journey.firstJourney).toBe(false);
    const old = (await Journey.findById(b.journey.id).lean<JourneyDoc>())!;
    expect([old.status, old.sleptThrough]).toEqual(['closed', true]);
  });
});

describe('the card (travel.choose)', () => {
  it('during the journey: the passenger moves Station & Market, writes the ledger; once only', async () => {
    const { caller, id } = await fresh();
    const b = await caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    const before = (await District.findById('irongate.station-market').lean())!.opinion.collective;
    const r = await caller.travel.choose({
      journeyId: b.journey.id,
      choiceId: 'talk',
      idempotencyKey: key(),
    });
    expect(['success', 'partial']).toContain(r.stamp);
    const fxp = r.stamp === 'success' ? 6 : 3;
    expect(r.rewards).toEqual(
      expect.arrayContaining([
        { id: 'fxp', amount: fxp },
        { id: 'opinion', amount: r.stamp === 'success' ? 0.03 : 0.015, note: 'Station & Market' },
      ]),
    );
    expect(r.opinion).toMatchObject({ placeName: 'Station & Market', factionId: 'collective', before });
    const after = (await District.findById('irongate.station-market').lean())!.opinion.collective;
    expect(after).toBeGreaterThan(before);
    const rows = await InfluenceLedger.find({ kind: 'journey', ref: b.journey.id }).lean();
    expect(rows.map((x) => [x.placeId, x.factionId, x.source.kind])).toEqual([
      ['irongate.station-market', 'collective', 'character'],
    ]);
    expect(await Contribution.countDocuments({ characterId: id, kind: 'influence' })).toBe(1);
    // A second choice is refused; the same key replays.
    expect(
      (
        await refusal(
          caller.travel.choose({ journeyId: b.journey.id, choiceId: 'listen', idempotencyKey: key() }),
        )
      ).game,
    ).toMatchObject({ reason: 'ALREADY_CHOSEN', choiceId: 'talk' });
    expect((await caller.travel.journey())!.card!.chosen?.choiceId).toBe('talk');
  });

  it('on the arrival modal it is still answerable; after Continue, CARD_CLOSED', async () => {
    const { caller, clock } = await fresh();
    const b = await caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    clock.set(b.journey.arrivesAt + 1);
    const r = await caller.travel.choose({
      journeyId: b.journey.id,
      choiceId: 'listen',
      idempotencyKey: key(),
    });
    expect(r.stamp).toBeNull();
    expect(r.rewards).toEqual([{ id: 'xp', amount: 14 }]);
    expect((await caller.travel.journey())!.arrival!.cardLine).toContain('A talkative passenger');
    await caller.travel.close({ journeyId: b.journey.id });
    const second = await fresh();
    const b2 = await second.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    second.clock.set(b2.journey.arrivesAt + 1);
    await second.caller.travel.close({ journeyId: b2.journey.id });
    expect(
      (
        await refusal(
          second.caller.travel.choose({ journeyId: b2.journey.id, choiceId: 'talk', idempotencyKey: key() }),
        )
      ).game?.reason,
    ).toBe('CARD_CLOSED');
  });

  it("the card school's stake needs 20 Iron; the reporter's points go to the destination's first Issue", async () => {
    const p = await fresh(undefined, { iron: 30 });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    await Journey.updateOne({ _id: b.journey.id }, { $set: { card: { eventId: 'jev.cards' } } });
    expect(
      (
        await refusal(
          p.caller.travel.choose({ journeyId: b.journey.id, choiceId: 'sit', idempotencyKey: key() }),
        )
      ).game,
    ).toMatchObject({ reason: 'NOT_ENOUGH_IRON', iron: 10, cost: 20 });

    const q = await fresh();
    const [first] = await setLiveIssues('irongate', ['issue.tram-fares', 'issue.press-raids'], DAY);
    const b2 = await q.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    await Journey.updateOne({ _id: b2.journey.id }, { $set: { card: { eventId: 'jev.reporter' } } });
    const view = (await q.caller.travel.journey())!;
    expect(view.card!.setup).toContain('the tram fares');
    const r = await q.caller.travel.choose({
      journeyId: b2.journey.id,
      choiceId: 'line',
      idempotencyKey: key(),
    });
    const pts = r.stamp === 'success' ? 10 : 5;
    expect(r.points).toMatchObject({ issueName: 'Tram Fare Hike', added: pts, leader: 'collective' });
    expect((await IssueModel.findById(first).lean())!.momentum.collective).toBe(pts);
    const c = (await Character.findById(q.id).lean<CharacterDoc>())!;
    if (r.stamp === 'success') expect(c.lastQuoted).toEqual({ day: DAY, issueId: 'issue.tram-fares' });
  });
});

describe('the nation map and the visitor (travel.nation, tech design §11.1)', () => {
  it('the list order, the states, the capital line; the Herald for a visitor the next morning', async () => {
    const { caller, clock } = await fresh();
    const n = await caller.travel.nation();
    expect(n.cities.map((c) => [c.cityId, c.state])).toEqual([
      ['irongate', 'open'],
      ['coalport', 'here'],
      ['ashford', 'rival'],
      ['duskwall', 'rival'],
      ['clearwater', 'later'],
    ]);
    expect(n.cities[0]!.line).toMatch(
      /^Capital · 5 districts · (two close races today|one close race today|contested)/,
    );
    expect(n.cities.find((c) => c.cityId === 'clearwater')!.lockWord).toBe('no service yet');
    expect(n.trainOpen).toBe(true);
    const b = await caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    clock.set(b.journey.arrivesAt + 1);
    await caller.travel.close({ journeyId: b.journey.id });
    clock.set(at(DAY + 1));
    const paper = await caller.paper.today();
    expect(paper.paper.name).toBe('The Irongate Herald');
    // The residence's Election row and the Issues still follow the residence (Coalport first).
    expect(paper.pollingDay?.cityId).toBe('coalport');
    expect(paper.issues!.rows[0]!.cityId).toBe('coalport');
    // The first arrival in the capital is news in the Herald.
    expect(paper.headlines.map((h) => h.headline)).toContain('Mara Lenk Arrives in the Capital');
    expect(dayKey(clock.now())).toBe(DAY + 1);
  });
});
