/**
 * QA slice 4: travel (GDD §14.10, design §2–§3, tech design §8.2, §9.2, ADR 0025). What the
 * developer's tests leave open: the journey times both ways for every faction, five boards with five
 * keys at once, two answers to one card at once, the card's deck over many journeys, closing the
 * game mid-journey (Energy refills, political acts work, the city is closed), arriving while away
 * (the tidy job only, a real Agenda worker), the arrival waiting days later, and Continue racing an
 * answer on the arrival modal.
 */
import { randomUUID } from 'node:crypto';
import { MongoBackend } from '@agendajs/mongo-backend';
import { Character, Journey, RequestLog, nativeDb } from '@irongate/db';
import type { CharacterDoc, JourneyDoc } from '@irongate/db';
import { ENERGY } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { Agenda } from 'agenda';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { defineJourneyArrive } from '../src/jobs/journeyArrive';
import { JOURNEY_ARRIVE_JOB, agendaJourneyScheduler } from '../src/jobs/scheduler';
import { settleCityDay } from '../src/services/cityDay';
import { settleArrival } from '../src/services/travelService';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, content, toTheCard, traveller } from './slice4.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const MIN = 60_000;
const key = () => randomUUID();

beforeAll(async () => {
  await setupDb('qa-slice4-travel');
});
afterAll(teardownDb);

describe('the timetable (GDD §14.10, design §2.2: 12 / 12 / 15 / 25)', () => {
  it('content keeps the GDD table: Ashford 12, Coalport 12, Duskwall 15, Clearwater 25, the capital 0', () => {
    const minutes = Object.fromEntries(content.nation.cities.map((c) => [c.cityId, c.minutes]));
    expect(minutes).toEqual({ irongate: 0, ashford: 12, coalport: 12, duskwall: 15, clearwater: 25 });
    expect(content.nation.cities.find((c) => c.cityId === 'clearwater')!.service).toBe('later');
  });

  it.each([
    ['collective', 'coalport', 12],
    ['alliance', 'ashford', 12],
    ['vanguard', 'duskwall', 15],
  ] as Array<[FactionId, string, number]>)(
    'the %s: home → the capital and back, %s, %i minutes each way, 20 Iron each; Clearwater locked, rival homes open (slice 5)',
    async (factionId, home, minutes) => {
      const clock = testClock(at(DAY));
      const p = await traveller(clock, { factionId, name: `T ${factionId}` });
      const nation = await p.caller.travel.nation();
      for (const c of nation.cities) {
        const expected =
          c.cityId === home ? 'here' : c.cityId === 'irongate' ? 'open' : c.cityId === 'clearwater' ? 'later' : 'rival';
        expect(c.state, c.cityId).toBe(expected);
        if (expected === 'later') {
          expect(c.canBoard).toEqual({ ok: false, reason: 'DESTINATION_LOCKED' });
          expect(c.lockWord).toBe('no service yet');
          expect(c.fare).toBeNull();
        }
        // Slice 5 (design §11.1): a rival home is open from Level 10, its lock word gone.
        if (expected === 'rival') {
          expect(c.canBoard).toEqual({ ok: true });
          expect(c.lockWord).toBeNull();
          expect(c.fare).not.toBeNull();
        }
      }
      expect(nation.cities.find((c) => c.cityId === 'irongate')!.minutes).toBe(minutes);
      const go = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
      expect(go.journey.arrivesAt - go.journey.boardedAt).toBe(minutes * MIN);
      clock.set(go.journey.arrivesAt);
      await p.caller.travel.close({ journeyId: go.journey.id });
      const back = await p.caller.travel.board({ to: home, idempotencyKey: key() });
      expect(back.journey.arrivesAt - back.journey.boardedAt).toBe(minutes * MIN);
      expect(back.character.iron).toBe(1_000 - 40);
    },
  );
});

describe('boarding is atomic and once (ADR 0025 §3, tech design §18)', () => {
  it('five taps with five keys at once: one journey, 20 Iron once, journeysMade 1, the others refused', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Wanda Kurz' });
    const all = await Promise.allSettled(
      [1, 2, 3, 4, 5].map(() => p.caller.travel.board({ to: 'irongate', idempotencyKey: key() })),
    );
    expect(all.filter((s) => s.status === 'fulfilled')).toHaveLength(1);
    for (const s of all) {
      if (s.status === 'rejected') expect(['IN_TRANSIT', 'ACTION_CONFLICT']).toContain(gameData(s.reason).game?.reason);
    }
    const c = (await Character.findById(p.id).lean<CharacterDoc>())!;
    expect([c.iron, c.journeysMade]).toEqual([980, 1]);
    expect(await Journey.countDocuments({ characterId: p.id })).toBe(1);
    expect(await RequestLog.countDocuments({ characterId: p.id, kind: 'travel.board' })).toBe(1);
  });
});

describe('the card: one choice per journey (design §3, ADR 0025 §6)', () => {
  it('two answers with two keys at once: one stored, rewarded once; the other ALREADY_CHOSEN', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Xaver Linz' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    toTheCard(clock, b.journey);
    const before = (await Character.findById(p.id).lean<CharacterDoc>())!;
    const all = await Promise.allSettled(
      ['listen', 'listen', 'talk'].map((choiceId) =>
        p.caller.travel.choose({ journeyId: b.journey.id, choiceId, idempotencyKey: key() }),
      ),
    );
    const won = all.filter((s) => s.status === 'fulfilled');
    expect(won).toHaveLength(1);
    for (const s of all) {
      if (s.status === 'rejected') expect(['ALREADY_CHOSEN', 'ACTION_CONFLICT']).toContain(gameData(s.reason).game?.reason);
    }
    const after = (await Character.findById(p.id).lean<CharacterDoc>())!;
    const j = (await Journey.findById(b.journey.id).lean<JourneyDoc>())!;
    // *Let him talk* pays 14 XP; *Talk politics* 6 or 3 Party XP: once, whichever won.
    if (j.choice!.choiceId === 'listen') expect(after.xp - before.xp).toBe(14);
    else expect(after.fxp - before.fxp).toBeLessThanOrEqual(6);
    expect(await RequestLog.countDocuments({ characterId: p.id, kind: 'travel.choose' })).toBe(1);
  });

  it('the deck over 24 journeys: the passenger first, then no card again before all seven are seen', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Yara Pohl', iron: 5_000 });
    const drawn: string[] = [];
    let where = 'coalport';
    for (let n = 1; n <= 24; n++) {
      const to = where === 'coalport' ? 'irongate' : 'coalport';
      const b = await p.caller.travel.board({ to, idempotencyKey: key() });
      // Review 4 (ADR 0075): the draw is stored at boarding; the view shows it from its moment.
      const card = (await Journey.findById(b.journey.id).lean<JourneyDoc>())!.card;
      expect(b.journey.cardAt !== null).toBe(card !== null);
      if (n === 1) expect(card?.eventId).toBe('jev.passenger');
      if (card) drawn.push(card.eventId);
      clock.set(b.journey.arrivesAt);
      await p.caller.travel.close({ journeyId: b.journey.id });
      where = to;
    }
    // Without replacement: in each round of seven no card repeats.
    for (let i = 0; i < drawn.length; i += 7) {
      const round = drawn.slice(i, i + 7);
      expect(new Set(round).size, `round ${i / 7 + 1}: ${round.join(', ')}`).toBe(round.length);
    }
    // 23 later journeys at one in three: some cards, not all (a loose bound; the rules test 30,000 seeds).
    expect(drawn.length).toBeGreaterThan(1);
    expect(drawn.length).toBeLessThan(24);
  });
});

describe('closing the game mid-journey (GDD §14.10, design §2.4)', () => {
  it('Energy keeps refilling; the city is closed; a political act at home works from the train', async () => {
    const coalportPolls = 20734; // Thu 8 Oct: Coalport cycle day 2
    const clock = testClock(at(coalportPolls));
    await settleCityDay(content, 'coalport', clock.now());
    const p = await traveller(clock, { name: 'Zora Fink' });
    await Character.updateOne(
      { _id: p.id },
      { $set: { 'energy.value': 40, 'energy.updatedAt': new Date(clock.now()) } },
    );
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    expect(b.character.energy.value).toBe(40);
    // On the train: the city view and the jobs are closed; the ballot at home is open (residence).
    expect(gameData(await p.caller.city.get({ cityId: 'coalport' }).catch((e: unknown) => e)).game?.reason).toBe(
      'IN_TRANSIT',
    );
    const election = await p.caller.council.election();
    expect(election.ballot?.canVote).toBe(true);
    const vote = await p.caller.council.vote({
      candidateKey: election.candidates[0]!.key,
      idempotencyKey: key(),
    });
    expect(vote.act).toBe('ballot');
    // The player closes the game; nothing happens until arrivesAt; at arrivesAt Energy has refilled.
    clock.set(b.journey.arrivesAt - 1);
    expect((await p.caller.travel.journey())!.status).toBe('onTheWay');
    clock.set(b.journey.arrivesAt);
    const me = await p.caller.character.me();
    expect(me.cityId).toBe('irongate');
    expect(me.energy.value).toBeGreaterThan(40);
    expect(me.energy.value).toBeLessThanOrEqual(ENERGY.max);
  });
});

describe('arriving while away (ADR 0025 §4–§5)', () => {
  it('the tidy job alone settles it; days later the arrival modal still waits with its card; the Herald says so', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Anton Reis' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    // Nobody reads anything: the job runs at arrivesAt (as the worker does, with its own clock).
    expect(await settleArrival(content, b.journey.id, b.journey.arrivesAt)).toBe(true);
    expect(await settleArrival(content, b.journey.id, b.journey.arrivesAt + 1)).toBe(false);
    const c = (await Character.findById(p.id).lean<CharacterDoc>())!;
    expect([c.cityId, c.journey?.status]).toEqual(['irongate', 'arrived']);
    expect(c.firstCapitalArrivalAt?.getTime()).toBe(b.journey.arrivesAt);
    // Two days later the player opens the game.
    clock.set(at(DAY + 2));
    const j = (await p.caller.travel.journey())!;
    expect(j.status).toBe('arrived');
    expect(j.arrival).toMatchObject({ stamp: 'Arrived', headline: "You're in the capital" });
    expect(j.card?.eventId).toBe('jev.passenger');
    expect(j.card?.chosen).toBeNull();
    const r = await p.caller.travel.choose({ journeyId: j.id, choiceId: 'listen', idempotencyKey: key() });
    expect(r.rewards).toEqual([{ id: 'xp', amount: 14 }]);
    const paper = await p.caller.paper.today();
    expect(paper.paper.name).toBe('The Irongate Herald');
    await p.caller.travel.close({ journeyId: j.id });
    expect((await Journey.findById(j.id).lean<JourneyDoc>())!.sleptThrough).toBe(false);
  });

  it('a real Agenda: the API schedules one job per journey (twice → one), the worker settles it once', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Berta Sell' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    const api = new Agenda({ backend: new MongoBackend({ mongo: nativeDb() }) });
    const scheduler = agendaJourneyScheduler(api);
    // Due now on the real clock, so the worker picks it up; the handler uses the game's clock.
    await scheduler.arriveAt(b.journey.id, new Date(Date.now() - 1_000));
    await scheduler.arriveAt(b.journey.id, new Date(Date.now() - 1_000));
    const jobs = nativeDb().collection('agendaJobs');
    expect(await jobs.countDocuments({ name: JOURNEY_ARRIVE_JOB, 'data.journeyId': b.journey.id })).toBe(1);
    const worker = new Agenda({ backend: new MongoBackend({ mongo: nativeDb() }), processEvery: '1 second' });
    const log: string[] = [];
    defineJourneyArrive(worker, content, (m) => log.push(m), () => b.journey.arrivesAt + 1);
    try {
      await worker.start();
      const deadline = Date.now() + 20_000;
      for (;;) {
        const j = (await Journey.findById(b.journey.id).lean<JourneyDoc>())!;
        if (j.status === 'arrived') break;
        if (Date.now() > deadline) throw new Error('the worker did not settle the journey in 20 s');
        await new Promise((r) => setTimeout(r, 200));
      }
    } finally {
      await worker.stop();
    }
    expect(log).toEqual([`journey ${b.journey.id} arrived`]);
    expect((await Character.findById(p.id).lean<CharacterDoc>())!.cityId).toBe('irongate');
  });

  // Nit n1 (QA slice 4), fixed in the fix round: `travel.close` read the journey before its
  // transaction, so an answer committed in between was stored and paid but the journey was marked
  // slept through. The close now decides on the document as it closes it.
  it('fixed (nit n1): Continue racing an answer on the arrival modal never marks an answered card slept through', async () => {
    for (let i = 0; i < 30; i++) {
      const clock = testClock(at(DAY));
      const p = await traveller(clock, { name: `Race ${i}` });
      const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
      clock.set(b.journey.arrivesAt + 1);
      await Promise.allSettled([
        p.caller.travel.choose({ journeyId: b.journey.id, choiceId: 'listen', idempotencyKey: key() }),
        p.caller.travel.close({ journeyId: b.journey.id }),
      ]);
      const j = (await Journey.findById(b.journey.id).lean<JourneyDoc>())!;
      expect(j.status).toBe('closed');
      expect(j.sleptThrough, `race ${i}: choice ${j.choice?.choiceId ?? 'none'}`).toBe(j.choice === null);
    }
  });
});
