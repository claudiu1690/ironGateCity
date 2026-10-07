/**
 * Slice 5, T17 (tech design §8.2 "travelService v3", §10.4, §15 "Server — rival ground"; design
 * §11.1, §11.4, §23.2): rival ground opens from Level 10, the bar after a deportation, the hostile
 * deck's draw, the checkpoint's gate, the cards' Heat and day flags, an unanswered card's ignore
 * effects applied once (Continue, a new boarding, the first act), and the arrival's knock-ons.
 */
import { Character, Journey } from '@irongate/db';
import type { CharacterDoc, JourneyDoc } from '@irongate/db';
import { journeyChoiceCheck } from '@irongate/rules';
import { Types } from 'mongoose';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { noScheduler, setJourneyScheduler } from '../src/jobs/scheduler';
import { closeArrivalInTx, settleArrival, trainsFrom } from '../src/services/travelService';
import { VersionConflict, inTransaction } from '../src/services/txn';
import { wornStats } from '../src/services/views';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import type { Player } from './politics.helpers';
import { at, content, key, member, setRisk } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const MIN = 60_000;
const refusal = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => {
        throw new Error('expected a refusal');
      },
      (e: unknown) => e,
    ),
  );

beforeAll(async () => {
  await setupDb('slice5-travel-test');
});
afterAll(teardownDb);
afterEach(() => setJourneyScheduler(noScheduler));

type Clock = ReturnType<typeof testClock>;
/** A Collective member at Level 10 in Coalport (rival ground: Duskwall, Ashford). */
const fresh = async (opts: Parameters<typeof member>[1] = {}): Promise<Player & { clock: Clock }> => {
  const clock = testClock(at(DAY));
  const p = await member(clock, { level: 10, ...opts });
  return { ...p, clock };
};
const doc = async (id: string) => (await Character.findById(id).lean<CharacterDoc>())!;
const journey = async (id: string) => (await Journey.findById(id).lean<JourneyDoc>())!;

/** Board to `to` and arrive (the lazy arrival on the next read). */
async function ride(p: Player & { clock: Clock }, to: string) {
  const b = await p.caller.travel.board({ to, idempotencyKey: key() });
  p.clock.set(b.journey.arrivesAt);
  const j = (await p.caller.travel.journey())!;
  return { b, j };
}

describe('rival ground opens from Level 10 (design §11.1)', () => {
  it('Level 9 is refused; at 10 the card is open, Duskwall boards, the checkpoint is drawn', async () => {
    const low = await fresh({ level: 9, name: 'Ria Low' });
    expect(await refusal(low.caller.travel.board({ to: 'duskwall', idempotencyKey: key() }))).toMatchObject({
      game: { reason: 'LEVEL_TOO_LOW', need: 10 },
    });

    const p = await fresh({ name: 'Ria Open' });
    const n = await p.caller.travel.nation();
    const dusk = n.cities.find((c) => c.cityId === 'duskwall')!;
    expect(dusk).toMatchObject({
      state: 'rival',
      lockWord: null,
      rival: { homeFactionId: 'vanguard' },
      minutes: 27,
      fare: { total: 20 },
      canBoard: { ok: true },
    });
    expect(n.cities.find((c) => c.cityId === 'irongate')!.rival).toBeUndefined();

    const b = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    expect(b.journey.card).toMatchObject({ eventId: 'jev.checkpoint', deck: 'hostile' });
    expect(b.character.iron).toBe(980);
    const c = await doc(p.id);
    expect([c.rivalTrips, c.hostileDeck?.seen, c.journeyDeck?.firstDone]).toEqual([
      1,
      ['jev.checkpoint'],
      false,
    ]);
    const j = await journey(b.journey.id);
    expect([j.kind, j.rivalGround, j.card]).toEqual([
      'ticket',
      true,
      { eventId: 'jev.checkpoint', deck: 'hostile' },
    ]);
  });

  it('the Trains card lists rival homes (boardable) and Clearwater not at all', async () => {
    const p = await fresh({ name: 'Ria Trains', cityId: 'irongate' });
    const t = trainsFrom(content, await doc(p.id), null, DAY, at(DAY));
    expect(t.destinations.map((d) => [d.cityId, d.canBoard]).sort()).toEqual([
      ['ashford', true],
      ['coalport', true],
      ['duskwall', true],
    ]);
  });

  it("the passenger is still the first ordinary journey's card after a rival trip", async () => {
    const p = await fresh({ name: 'Ria First' });
    await ride(p, 'duskwall');
    const back = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    expect(back.journey.card).toMatchObject({ eventId: 'jev.passenger', deck: 'ordinary' });
    expect((await doc(p.id)).journeyDeck).toEqual({ seen: ['jev.passenger'], firstDone: true });
  });
});

describe('the bar after a deportation (design §11.5)', () => {
  it('barred until then: the card, BARRED, and open again after', async () => {
    const p = await fresh({ name: 'Ria Barred' });
    const until = at(DAY) + 3 * 60 * MIN;
    await setRisk(p.id, p.clock.now(), { barred: [{ cityId: 'duskwall', until: new Date(until) }] });
    const dusk = (await p.caller.travel.nation()).cities.find((c) => c.cityId === 'duskwall')!;
    expect(dusk).toMatchObject({
      state: 'barred',
      lockWord: 'barred',
      barredUntil: until,
      fare: null,
      canBoard: { ok: false, reason: 'BARRED' },
    });
    expect(await refusal(p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() }))).toMatchObject({
      code: 'PRECONDITION_FAILED',
      game: { reason: 'BARRED', cityId: 'duskwall', until },
    });
    // Ashford is not barred.
    expect((await p.caller.travel.nation()).cities.find((c) => c.cityId === 'ashford')!.state).toBe('rival');
    expect(trainsFrom(content, await doc(p.id), null, DAY, p.clock.now()).destinations).toEqual(
      expect.arrayContaining([expect.objectContaining({ cityId: 'duskwall', canBoard: false })]),
    );
    expect(await Journey.countDocuments({ characterId: p.id })).toBe(0);
    p.clock.set(until);
    const b = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    expect(b.journey.to.cityId).toBe('duskwall');
  });
});

describe('the hostile draw (design §11.4, §23.1 #12)', () => {
  it('the checkpoint first; then the rotation without replacement; the list at Heat 50, not 49', async () => {
    const p = await fresh({ name: 'Ria Deck' });
    const drawn: string[] = [];
    const trip = async (heat: number) => {
      await setRisk(p.id, p.clock.now(), { heat });
      const { b } = await ride(p, 'duskwall');
      drawn.push(b.journey.card!.eventId);
      await ride(p, 'coalport');
      return b;
    };
    // The first trip draws the checkpoint whatever the Heat.
    await trip(60);
    expect(drawn[0]).toBe('jev.checkpoint');
    await trip(0);
    await trip(49);
    // All three of the rotation seen once before a repeat.
    expect(new Set(drawn)).toEqual(new Set(['jev.checkpoint', 'jev.informer', 'jev.conductor']));
    expect((await doc(p.id)).hostileDeck?.seen).toHaveLength(3);
    // Heat 50 on a later trip: the list, outside the rotation (seen unchanged).
    await trip(50);
    expect(drawn[3]).toBe('jev.listed');
    expect((await doc(p.id)).hostileDeck?.seen).toHaveLength(3);
    // Then the round starts again.
    await trip(0);
    expect(['jev.checkpoint', 'jev.informer', 'jev.conductor']).toContain(drawn[4]);
    expect((await doc(p.id)).hostileDeck?.seen).toEqual([drawn[4]]);
    expect((await doc(p.id)).rivalTrips).toBe(5);
  });
});

describe('the cards on rival ground (tech design §10.4, design §23.2)', () => {
  it('the checkpoint rows: no odds word on the gated row, difficulty 14 on the checked one', async () => {
    const p = await fresh({ name: 'Ria Rows' });
    const b = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    const rows = b.journey.card!.choices;
    expect(rows.find((r) => r.id === 'papers')).toMatchObject({ gated: true, chance: null, stat: null });
    expect(rows.find((r) => r.id === 'lamp')).toMatchObject({ gated: false, chance: null, cost: 30 });
    const values = wornStats(await doc(p.id), content);
    const at14 = journeyChoiceCheck({ stats: ['cha'], values, standingBonus: null, difficulty: 14 }).chance;
    const at10 = journeyChoiceCheck({ stats: ['cha'], values, standingBonus: null }).chance;
    expect(rows.find((r) => r.id === 'talk')!.chance).toBe(at14);
    expect(at14).toBeLessThan(at10);
  });

  it('the gate holds (Cool and Clean): waved on, nothing written but the choice', async () => {
    const p = await fresh({ name: 'Ria Clean' });
    const b = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    const r = await p.caller.travel.choose({
      journeyId: b.journey.id,
      choiceId: 'papers',
      idempotencyKey: key(),
    });
    expect(r).toMatchObject({ stamp: null, headline: 'Waved on', rewards: [], opinion: null, points: null });
    expect(r.flag).toBeUndefined();
    const c = await doc(p.id);
    expect([c.heat?.value, c.flags]).toEqual([0, []]);
  });

  it('the gate fails on Heat 25: Heat +10 and Watched in Duskwall today', async () => {
    const p = await fresh({ name: 'Ria Noticed' });
    // Yesterday's flag is pruned at the write.
    await setRisk(p.id, p.clock.now(), {
      heat: 25,
      flags: [{ cityId: 'duskwall', day: DAY - 1, flag: 'warned' }],
    });
    const b = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    const r = await p.caller.travel.choose({
      journeyId: b.journey.id,
      choiceId: 'papers',
      idempotencyKey: key(),
    });
    expect(r).toMatchObject({
      stamp: null,
      headline: 'They write your name down',
      rewards: [{ id: 'heat', amount: 10 }],
      // Review 4: the day's turn travels as `until`, rendered by the client.
      flag: {
        flag: 'watched',
        line: 'Watched today: run-ins likelier in Duskwall until {until}',
        until: (DAY + 1) * 86_400_000,
      },
    });
    const c = await doc(p.id);
    expect(c.heat?.value).toBe(35);
    expect(c.flags).toEqual([{ cityId: 'duskwall', day: DAY, flag: 'watched' }]);
    // The arrival's knock-ons carry the flag and the card's Heat.
    p.clock.set(b.journey.arrivesAt);
    const j = (await p.caller.travel.journey())!;
    expect(j.arrival!.knockOns).toMatchObject({ flags: ['watched'], heat: { before: 25, after: 35 } });
    expect(j.arrival!.cardLine).toBe('Papers, please: Heat +10');
    expect((await p.caller.character.me()).here).toEqual({ rivalGround: true, flags: ['watched'] });
  });

  it('the gate fails on a live mark at Heat 0', async () => {
    const p = await fresh({ name: 'Ria Marked' });
    await setRisk(p.id, p.clock.now(), { marks: [{ day: DAY - 1, kind: 'minor' }] });
    const b = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    const r = await p.caller.travel.choose({
      journeyId: b.journey.id,
      choiceId: 'papers',
      idempotencyKey: key(),
    });
    expect(r.headline).toBe('They write your name down');
    expect((await doc(p.id)).heat?.value).toBe(10);
  });

  it('a checked hostile row pays §23.2 (Partial: half, rounded half up, and Watched); the lamp costs 30', async () => {
    const p = await fresh({ name: 'Ria Talk' });
    const b = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    const r = await p.caller.travel.choose({
      journeyId: b.journey.id,
      choiceId: 'talk',
      idempotencyKey: key(),
    });
    expect(['success', 'partial']).toContain(r.stamp);
    if (r.stamp === 'success') {
      expect(r.rewards).toEqual([{ id: 'fxp', amount: 6 }]);
      expect(r.flag).toBeUndefined();
    } else {
      expect(r.rewards).toEqual([{ id: 'fxp', amount: 3 }]);
      expect(r.flag?.flag).toBe('watched');
    }
    expect([r.opinion, r.points]).toEqual([null, null]);

    const q = await fresh({ name: 'Ria Lamp' });
    const b2 = await q.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    const lamp = await q.caller.travel.choose({
      journeyId: b2.journey.id,
      choiceId: 'lamp',
      idempotencyKey: key(),
    });
    expect(lamp).toMatchObject({
      stamp: null,
      headline: 'The lamp moves on',
      rewards: [{ id: 'iron', amount: -30 }],
    });
    expect((await doc(q.id)).iron).toBe(1_000 - 20 - 30);
  });

  it('the conductor: Warned; a drink costs 10 and cools Heat 5 (never below 0)', async () => {
    const p = await fresh({ name: 'Ria Drink' });
    await ride(p, 'duskwall');
    await ride(p, 'coalport');
    await setRisk(p.id, p.clock.now(), { heat: 3 });
    const b = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    await Journey.updateOne(
      { _id: b.journey.id },
      { $set: { card: { eventId: 'jev.conductor', deck: 'hostile' } } },
    );
    const r = await p.caller.travel.choose({
      journeyId: b.journey.id,
      choiceId: 'drink',
      idempotencyKey: key(),
    });
    expect(r.rewards).toEqual([
      { id: 'fxp', amount: 6 },
      { id: 'iron', amount: -10 },
      { id: 'heat', amount: -3 },
    ]);
    expect((await doc(p.id)).heat?.value).toBe(0);

    const q = await fresh({ name: 'Ria Warned' });
    await ride(q, 'duskwall');
    await ride(q, 'coalport');
    const b2 = await q.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    await Journey.updateOne(
      { _id: b2.journey.id },
      { $set: { card: { eventId: 'jev.conductor', deck: 'hostile' } } },
    );
    const w = await q.caller.travel.choose({
      journeyId: b2.journey.id,
      choiceId: 'warning',
      idempotencyKey: key(),
    });
    // Review 4: the day's turn travels as `until`, rendered by the client.
    expect(w.flag).toEqual({
      flag: 'warned',
      line: 'Warned: run-ins less likely in Duskwall until {until}',
      until: (DAY + 1) * 86_400_000,
    });
    // The first trip's checkpoint, slept through, left Watched; Warned joins it (both count).
    expect((await doc(q.id)).flags).toEqual([
      { cityId: 'duskwall', day: DAY, flag: 'watched' },
      { cityId: 'duskwall', day: DAY, flag: 'warned' },
    ]);
  });
});

describe('an unanswered card: its ignore effects once (tech design §8.2)', () => {
  it('at Continue: Heat +10 and Watched, once however often Continue is pressed', async () => {
    const p = await fresh({ name: 'Ria Sleeps' });
    const { j } = await ride(p, 'duskwall');
    // Shown before it applies: what sleeping through will cost.
    expect(j.arrival!.knockOns).toMatchObject({ heat: { before: 0, after: 10 }, flags: ['watched'] });
    const closed = await p.caller.travel.close({ journeyId: j.id });
    expect(closed.landing).toEqual({ cityId: 'duskwall', quarterId: 'duskwall.fortress' });
    await p.caller.travel.close({ journeyId: j.id });
    const c = await doc(p.id);
    expect([c.heat?.value, c.flags, c.journey]).toEqual([
      10,
      [{ cityId: 'duskwall', day: DAY, flag: 'watched' }],
      null,
    ]);
    expect((await journey(j.id)).sleptThrough).toBe(true);
    expect(closed.character.heat?.value).toBe(10);
  });

  it('at a new boarding: the old card is slept through and its effects land before the draw', async () => {
    const p = await fresh({ name: 'Ria Reboards' });
    const { j } = await ride(p, 'duskwall');
    await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    const c = await doc(p.id);
    expect([c.heat?.value, c.flags]).toEqual([10, [{ cityId: 'duskwall', day: DAY, flag: 'watched' }]]);
    expect([(await journey(j.id)).status, (await journey(j.id)).sleptThrough]).toEqual(['closed', true]);
    // Continue on the closed journey afterwards changes nothing.
    await p.caller.travel.close({ journeyId: j.id });
    expect((await doc(p.id)).heat?.value).toBe(10);
  });

  it('at the first act (closeArrivalInTx): once; version + 1; a stale character is a VersionConflict', async () => {
    const p = await fresh({ name: 'Ria Acts' });
    const { j } = await ride(p, 'duskwall');
    const before = await doc(p.id);
    const stale = { ...before, version: before.version - 1 };
    await expect(
      inTransaction((s) => closeArrivalInTx(content, s, stale, p.clock.now())),
    ).rejects.toBeInstanceOf(VersionConflict);
    expect((await journey(j.id)).status).toBe('arrived');

    const after = await inTransaction(async (s) => {
      const c = (await Character.findById(p.id).session(s).lean<CharacterDoc>())!;
      return closeArrivalInTx(content, s, c, p.clock.now());
    });
    expect(after.version).toBe(before.version + 1);
    expect([after.heat?.value, after.journey, after.flags?.length]).toEqual([10, null, 1]);
    // A second call has nothing to close and returns the character as given.
    const again = await inTransaction((s) => closeArrivalInTx(content, s, after, p.clock.now()));
    expect(again).toBe(after);
    await p.caller.travel.close({ journeyId: j.id });
    expect((await doc(p.id)).heat?.value).toBe(10);
  });

  it('an answered card applies nothing more at Continue; the conductor slept through is the line only', async () => {
    const p = await fresh({ name: 'Ria Answers' });
    const b = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    await p.caller.travel.choose({ journeyId: b.journey.id, choiceId: 'papers', idempotencyKey: key() });
    p.clock.set(b.journey.arrivesAt);
    await p.caller.travel.close({ journeyId: b.journey.id });
    expect((await doc(p.id)).heat?.value).toBe(0);

    await ride(p, 'coalport');
    const b2 = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    await Journey.updateOne(
      { _id: b2.journey.id },
      { $set: { card: { eventId: 'jev.conductor', deck: 'hostile' } } },
    );
    p.clock.set(b2.journey.arrivesAt);
    const j = (await p.caller.travel.journey())!;
    expect(j.arrival!.knockOns.heat).toBeUndefined();
    await p.caller.travel.close({ journeyId: j.id });
    const c = await doc(p.id);
    expect([c.heat?.value, c.flags]).toEqual([0, []]);
  });
});

describe('the arrival on rival ground (screens §8.2)', () => {
  it('the place line, the warning on the first trip only, the first quarter as the landing', async () => {
    const p = await fresh({ name: 'Ria Arrives' });
    const { j } = await ride(p, 'duskwall');
    expect(j.arrival).toMatchObject({
      stamp: 'Arrived',
      place: 'Duskwall · The Fortress · rival ground',
      headline: 'Duskwall',
      knockOns: { ticket: 20, heraldVisitor: false, rivalGround: true },
      landing: { cityId: 'duskwall', quarterId: 'duskwall.fortress' },
    });
    await ride(p, 'coalport');
    const home = (await p.caller.travel.journey())!;
    expect(home.arrival!.knockOns).toMatchObject({ rivalGround: false, flags: [] });
    expect(home.arrival!.place).toBe('Coalport');
    const { j: second } = await ride(p, 'ashford');
    expect(second.arrival!.knockOns.rivalGround).toBe(false);
    expect(second.arrival!.place).toMatch(/^Ashford · .+ · rival ground$/);
  });
});

describe('a deportation journey (kind deported) needs no fare or card', () => {
  it('arrives through the same path; the arrival reads no ticket; Continue closes it', async () => {
    const p = await fresh({ name: 'Ria Deported', cityId: 'duskwall' });
    const c = await doc(p.id);
    const id = new Types.ObjectId();
    const boardedAt = new Date(p.clock.now());
    const arrivesAt = new Date(p.clock.now() + 27 * MIN);
    await Journey.create({
      _id: id,
      characterId: c._id,
      n: (c.journeysMade ?? 0) + 1,
      from: 'duskwall',
      to: 'coalport',
      boardedAt,
      arrivesAt,
      minutes: 27,
      fare: { base: 0, lines: [], total: 0 },
      seed: 'f'.repeat(32),
      card: null,
      kind: 'deported',
      rivalGround: false,
      stayId: new Types.ObjectId(),
      choice: null,
      status: 'onTheWay',
      arrivedAt: null,
      closedAt: null,
      sleptThrough: false,
      firstToCapital: false,
    });
    await Character.updateOne(
      { _id: c._id },
      {
        $set: { journey: { id, from: 'duskwall', to: 'coalport', boardedAt, arrivesAt, status: 'onTheWay' } },
        $inc: { journeysMade: 1, version: 1 },
      },
    );
    expect(await settleArrival(content, id.toHexString(), arrivesAt.getTime())).toBe(true);
    p.clock.set(arrivesAt.getTime());
    const j = (await p.caller.travel.journey())!;
    expect(j.card).toBeNull();
    expect(j.arrival!.knockOns).toMatchObject({ ticket: 0, rivalGround: false });
    const closed = await p.caller.travel.close({ journeyId: j.id });
    expect(closed.character.journey).toBeNull();
    expect((await doc(p.id)).cityId).toBe('coalport');
  });
});
