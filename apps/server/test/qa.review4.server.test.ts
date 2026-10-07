/**
 * QA, review 4 (docs/qa/review-4-report.md): the server's new refusals and keyed writes, probed where
 * the developer's own review-4 tests do not go. The favour under one key sent many times at once; the
 * favour for a late sign-up, whose welcome set comes twice; the favour while the day's orders are off;
 * a town hall in a quarter painted for a later edition; the card withheld from every read before its
 * moment; lodgings from several keys at once; the Town Hall of a city nobody has touched; the desk
 * only on one's own council; *In the cells now* after bail; beat 1 tapped twice with two rows.
 *
 * Known bugs are `it.fails`, each named after its report entry (they pass while the bug is there).
 */
import { randomUUID } from 'node:crypto';
import { ActionLog, Arrival, Character, OfficeTerm } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { councilDay, councilKey, dayStart } from '@irongate/rules';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sendToHeld } from '../src/services/heldService';
import { arrive, callerFor, gameData, newUser, originAnswers, resetCity, setupDb, teardownDb, testClock } from './helpers';
import { at, content, member } from './slice5.helpers';
import { traveller } from './slice4.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const key = () => randomUUID();
const oid = (id: string) => new Types.ObjectId(id);
const FAVOUR = { actionId: 'coalport.union-hall.favour', locationId: 'coalport.union-hall' } as const;
const refusal = async (p: Promise<unknown>) =>
  gameData(
    await p.then(
      () => null,
      (e: unknown) => e,
    ),
  );
const doc = async (id: string) => (await Character.findById(id).lean<CharacterDoc>())!;

beforeAll(async () => {
  await setupDb('qa-review4-server');
});
afterAll(teardownDb);

async function joinedAt(ms: number, factionId: 'collective' | 'vanguard' | 'alliance' = 'collective') {
  const clock = testClock(ms);
  const user = newUser(`Qa ${factionId} ${ms}`);
  const caller = callerFor(user, clock.now);
  const r = await arrive(caller, { factionId });
  return { user, caller, clock, id: r.character.id };
}
const hqHas = async (caller: ReturnType<typeof callerFor>, actionId: string, cityId = 'coalport') =>
  (await caller.city.get({ cityId })).locations.some((l) => l.actions.some((a) => a.id === actionId));

describe('the favour under one key, sent six times at once (ADR 0002, ADR 0073)', () => {
  it('one result for all six, one log, 10 Energy once, the order done once', async () => {
    const { caller, id } = await joinedAt(at(DAY, 9));
    const k = key();
    const rs = await Promise.allSettled(
      Array.from({ length: 6 }, () => caller.action.perform({ ...FAVOUR, idempotencyKey: k, times: 1 })),
    );
    const ok = rs.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof caller.action.perform>>> => r.status === 'fulfilled');
    expect(ok).toHaveLength(6);
    expect(new Set(ok.map((r) => JSON.stringify(r.value))).size).toBe(1);
    expect(await ActionLog.countDocuments({ characterId: oid(id), actionId: FAVOUR.actionId })).toBe(1);
    const c = await doc(id);
    expect(c.energy.value).toBe(90);
    expect(c.orders.items.filter((i) => i.templateId === 'dir.welcome-b' && i.doneAt)).toHaveLength(1);
  });
});

describe('the favour is a first-day errand, offered once (ADR 0073: "a first action that is offered once")', () => {
  // QA m-favour-twice: a character who arrives at or after 22:00 UTC has two welcome days (GDD §13.7,
  // review 1), and the settlement deals the whole welcome set again on the second, slot B included.
  // The favour, done on the first evening, is offered and paid again the next morning.
  // Fixed in the QA fix round (`carriedWelcome`): the evening's set goes on, the favour done stays done.
  it('a late sign-up who did the favour at 22:30 is not offered it again the next morning', async () => {
    const { caller, clock, id } = await joinedAt(dayStart(DAY) + 22.5 * 3_600_000);
    await caller.action.perform({ ...FAVOUR, idempotencyKey: key(), times: 1 });
    expect(await hqHas(caller, FAVOUR.actionId)).toBe(false);
    clock.set(at(DAY + 1, 9));
    await caller.character.me();
    expect(await hqHas(caller, FAVOUR.actionId)).toBe(false);
    expect(await refusal(caller.action.perform({ ...FAVOUR, idempotencyKey: key(), times: 1 }))).toMatchObject({
      game: { reason: 'NOT_OFFERED' },
    });
    expect(await ActionLog.countDocuments({ characterId: oid(id), actionId: FAVOUR.actionId })).toBe(1);
  });

  // QA n-favour-off: while the day's orders are off (an arrest; in play only through the dev panel on
  // a first day) the favour's order can never be done, so the "once only" favour stays offered and
  // pays every tap.
  // Fixed in the QA fix round: the favour is not offered while the orders are off.
  it('with the orders off, the favour cannot be tapped twice', async () => {
    const { caller, clock, id } = await joinedAt(at(DAY, 10));
    await sendToHeld(content, oid(id), 'cells', clock.now());
    clock.advance(61 * 60_000); // out of the cells, the orders still off
    await caller.character.me();
    const tap = () => caller.action.perform({ ...FAVOUR, idempotencyKey: key(), times: 1 });
    await tap().catch(() => null);
    await tap().catch(() => null);
    expect(await ActionLog.countDocuments({ characterId: oid(id), actionId: FAVOUR.actionId })).toBeLessThanOrEqual(1);
  });
});

describe('a Town Hall painted in a later edition’s quarter (answers §11.1, §29 Q10)', () => {
  it('an Alliance recruit at Level 1 sits in Ashford’s gallery: served, no Party XP, a Reputation win', async () => {
    const { caller, id } = await joinedAt(at(DAY, 11), 'alliance');
    const r = await caller.action.perform({
      actionId: 'ashford.town-hall.gallery',
      locationId: 'ashford.town-hall',
      idempotencyKey: key(),
      times: 1,
    });
    expect(r.action.id).toBe('ashford.town-hall.gallery');
    expect(r.rewards.fxp.total).toBe(0);
    expect(r.rewards.opinion).toBe(0);
    expect((await doc(id)).energy.value).toBe(94);
  });
});

describe('the card is kept from every read until its moment (ADR 0075 §4, §23 Q7)', () => {
  it('character.me, paper.today, travel.nation and travel.journey carry neither the card’s id nor its words', async () => {
    const clock = testClock(at(DAY, 12));
    const p = await traveller(clock, { name: 'Qa Leak' });
    const b = await p.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    expect(b.journey.cardAt).not.toBeNull();
    clock.set(b.journey.cardAt! - 1_000);
    const j = (await Character.findById(p.id).lean<CharacterDoc>())!;
    expect(j.journey?.status).toBe('onTheWay');
    const { Journey } = await import('@irongate/db');
    const eventId = (await Journey.findById(b.journey.id).lean())!.card!.eventId;
    const ev = content.journeyEvent(eventId)!;
    const reads = [
      await p.caller.character.me(),
      await p.caller.paper.today(),
      await p.caller.travel.nation(),
      await p.caller.travel.journey(),
    ];
    for (const r of reads) {
      const s = JSON.stringify(r);
      expect(s).not.toContain(eventId);
      expect(s).not.toContain(ev.title);
    }
  });
});

describe('lodgings from three keys at once (answers §9.3: at most fourteen nights paid)', () => {
  it('never past fourteen nights, and every Iron taken bought a week', async () => {
    const clock = testClock(at(DAY, 9));
    const p = await traveller(clock, { name: 'Qa Beds', cityId: 'irongate' });
    const rs = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        p.caller.residence.room({ locationId: 'irongate.tram-junction', idempotencyKey: key() }),
      ),
    );
    const ok = rs.filter((r) => r.status === 'fulfilled').length;
    const c = await doc(p.id);
    expect(c.room!.untilDay - c.room!.fromDay).toBeLessThanOrEqual(14);
    expect(c.room!.untilDay - c.room!.fromDay).toBe(7 * ok);
    expect(c.iron).toBe(1_000 - 100 * ok);
  });
});

describe('the Town Hall of a city nobody has touched yet (council.hall)', () => {
  it('a Coalport visitor standing in Ashford reads its hall after the map, the first time anyone asks', async () => {
    const clock = testClock(at(DAY + 40, 9));
    const p = await traveller(clock, { name: 'Qa Untouched', cityId: 'ashford' });
    await resetCity('ashford');
    await p.caller.city.get({ cityId: 'ashford' });
    const v = await p.caller.council.hall({ cityId: 'ashford' });
    expect(v).toMatchObject({ cityId: 'ashford', seatCount: 7, desk: null, election: null });
    expect(v.seats).toHaveLength(7);
  });

  // QA n-hall-cold: council.hall alone, for a city whose day nobody has settled, is refused
  // ELECTION_NOT_READY (the read does not bootstrap the city as city.get does). The client always
  // reads the map first, so a player does not meet it.
  // Fixed in the QA fix round: the read settles the city's day first.
  it('council.hall alone, for a city nobody has touched, answers with the hall', async () => {
    const clock = testClock(at(DAY + 45, 9));
    const p = await member(clock, { name: 'Qa Cold Hall', level: 1 });
    await resetCity('ashford');
    const v = await p.caller.council.hall({ cityId: 'ashford' });
    expect(v.cityId).toBe('ashford');
  });
});

describe('the desk is for one’s own council only (answers §10.2)', () => {
  it('a Coalport councillor reading Duskwall’s hall gets no desk and no What now', async () => {
    const clock = testClock(at(DAY + 50, 9));
    const p = await member(clock, { name: 'Qa Councillor', rank: 3 });
    await p.caller.council.hall({ cityId: 'coalport' });
    const cal = councilDay(DAY + 50, content.city('coalport')!.council!.offset);
    const r = await OfficeTerm.updateOne(
      { councilKey: councilKey('coalport', cal.cycle), seat: 1 },
      { $set: { holder: { kind: 'player', characterId: oid(p.id), name: 'Qa Councillor' } } },
    );
    expect(r.matchedCount).toBe(1);
    const home = await p.caller.council.hall({ cityId: 'coalport' });
    expect(home.desk).not.toBeNull();
    await Character.updateOne({ _id: p.id }, { $set: { cityId: 'duskwall' }, $inc: { version: 1 } });
    await p.caller.city.get({ cityId: 'duskwall' });
    const away = await p.caller.council.hall({ cityId: 'duskwall' });
    expect([away.desk, away.whatNow]).toEqual([null, null]);
  });
});

describe('In the cells now, after bail (answers §19)', () => {
  it('a prisoner who paid bail leaves the list at once', async () => {
    const clock = testClock(at(DAY + 60, 10));
    const viewer = await member(clock, { name: 'Qa Viewer' });
    const held = await member(clock, { name: 'Qa Bailed', iron: 1_000 });
    await sendToHeld(content, oid(held.id), 'cells', clock.now());
    expect((await viewer.caller.held.inCells({ locationId: 'coalport.harbour-police' })).rows.map((r) => r.name)).toContain(
      'Qa Bailed',
    );
    await held.caller.held.bail({ idempotencyKey: key() });
    expect(
      (await viewer.caller.held.inCells({ locationId: 'coalport.harbour-police' })).rows.map((r) => r.name),
    ).not.toContain('Qa Bailed');
  });
});

describe('beat 1 tapped with two rows at once (set-once answers, ADR 0011/0073)', () => {
  it('one party wins, the draft holds one beat-1 answer, and the join follows it', async () => {
    const clock = testClock(at(DAY + 70, 9));
    const user = newUser('Qa Two Rows');
    const caller = callerFor(user, clock.now);
    await caller.arrival.start({ avatarId: 'avatar.woman-30s' });
    const platform = content.origin.steps[0]!.questions[0]!.id;
    await Promise.allSettled([
      caller.arrival.answer({ questionId: platform, answerId: 'holm' }),
      caller.arrival.answer({ questionId: platform, answerId: 'stahl' }),
      caller.arrival.answer({ questionId: platform, answerId: 'grey' }),
    ]);
    const draft = (await Arrival.findOne({ userId: user.id }).lean())!;
    expect(draft.answers).toHaveLength(1);
    const won = draft.answers[0]!.answerId;
    const faction = { holm: 'collective', stahl: 'vanguard', grey: 'alliance' }[won as 'holm']!;
    for (const a of originAnswers('collective').slice(1)) await caller.arrival.answer(a);
    expect((await caller.arrival.join({})).character.factionId).toBe(faction);
  });
});
