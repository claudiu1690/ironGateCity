/**
 * Slice 4, T16 (tech design §8.2, §15 "residence"; ADR 0026): registering in each district, the
 * windows on each cycle day, every refusal writing nothing, the home candidacy withdrawn and the home
 * seat vacated (a local sits from the move's day; the stipend stops), moving back, the room and its
 * renewal, and the Rested cap with the room and Fever at St Agnes.
 */
import { randomUUID } from 'node:crypto';
import { Candidacy, Character, City, OfficeTerm, RequestLog } from '@irongate/db';
import type { CharacterDoc, OfficeTermDoc } from '@irongate/db';
import { moveWindows } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, content, setIssueEffect, traveller } from './slice4.helpers';

/** Review 4 #9: the room is taken at the Lodgings card (Tram Junction). */
const JUNCTION = 'irongate.tram-junction';
const DAY = 20732; // Tue 6 Oct 2026: Irongate cycle day 2, Coalport cycle day 0
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

beforeAll(async () => {
  await setupDb('slice4-register-test');
});
afterAll(teardownDb);

describe('registering (residence.register)', () => {
  it.each(content.districtsOf('irongate').map((q) => [q.id, q.name]))(
    'in %s: 500 Iron, the windows, the *Moved in* modal (review 4 #9), the resident card',
    async (districtId, name) => {
      const clock = testClock(at(DAY));
      const p = await traveller(clock, { cityId: 'irongate', name: 'Ada Kern' });
      const r = await p.caller.residence.register({ cityId: 'irongate', districtId, idempotencyKey: key() });
      expect(r).toMatchObject({
        kind: 'political',
        act: 'register',
        stamp: { label: 'Moved in' },
        headline: `${name} has a new voter`,
        paper: { name: 'The Irongate Herald' },
        knockOns: { iron: { before: 1000, after: 500 }, seatGivenUp: null, candidacyWithdrawn: false },
      });
      expect(r.body).toContain('Union House expects you at six');
      expect(r.view).toMatchObject({ kind: 'residence', residence: { state: 'resident' } });
      const c = (await Character.findById(p.id).lean<CharacterDoc>())!;
      // Cycle day 2: the polls are open, so the vote is next cycle's (ADR 0026 §3).
      expect(c.residence).toEqual({
        cityId: 'irongate',
        districtId,
        sinceDay: DAY,
        votesFromDay: 20737,
        standsFromDay: 20735,
        canMoveFromDay: DAY + 7,
      });
      expect(r.character.residence).toMatchObject({ districtId, districtName: name });
    },
  );

  it('the windows on each cycle day: days 0–1 vote this cycle, days 2–4 the next', () => {
    const D0 = 20730;
    expect([0, 1, 2, 3, 4].map((cd) => moveWindows(D0 + cd, 0).votesFromDay)).toEqual([
      D0 + 2,
      D0 + 2,
      D0 + 7,
      D0 + 7,
      D0 + 7,
    ]);
  });

  it('every refusal, and nothing written', async () => {
    const clock = testClock(at(DAY));
    const E = 'irongate.eastside';
    const reg = (
      p: Awaited<ReturnType<typeof traveller>>,
      cityId = 'irongate',
      districtId: string | null = E,
    ) => refusal(p.caller.residence.register({ cityId, districtId, idempotencyKey: key() }));
    const athome = await traveller(clock, { name: 'B One' });
    expect((await reg(athome)).game?.reason).toBe('NOT_IN_CITY');
    const low = await traveller(clock, { name: 'B Two', fxp: 0, cityId: 'irongate' });
    expect(await reg(low)).toMatchObject({ game: { reason: 'RANK_TOO_LOW', need: 2 } });
    const poor = await traveller(clock, { name: 'B Three', iron: 499, cityId: 'irongate' });
    expect(await reg(poor)).toMatchObject({ game: { reason: 'NOT_ENOUGH_IRON', iron: 499, cost: 500 } });
    expect(await reg(poor, 'duskwall', null)).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'DESTINATION_LOCKED' },
    });
    expect(await reg(poor, 'irongate', 'irongate.nowhere')).toMatchObject({
      code: 'BAD_REQUEST',
      game: { reason: 'UNKNOWN_DISTRICT' },
    });
    expect(await reg(poor, 'irongate', null)).toMatchObject({ game: { reason: 'UNKNOWN_DISTRICT' } });
    const resident = await traveller(clock, {
      name: 'B Four',
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: E, windows: { canMoveFromDay: DAY + 3 } },
    });
    expect(await reg(resident, 'irongate', 'irongate.old-town')).toMatchObject({
      game: { reason: 'MOVE_COOLDOWN' },
    });
    await Character.updateOne({ _id: resident.id }, { $set: { 'residence.canMoveFromDay': 0 } });
    expect(await reg(resident)).toMatchObject({ code: 'CONFLICT', game: { reason: 'ALREADY_RESIDENT' } });
    const riding = await traveller(clock, { name: 'B Five' });
    await riding.caller.travel.board({ to: 'irongate', idempotencyKey: key() });
    expect((await reg(riding)).game?.reason).toBe('IN_TRANSIT');
    for (const p of [athome, low, poor, resident, riding]) {
      expect(await RequestLog.countDocuments({ characterId: p.id, kind: 'residence.register' })).toBe(0);
    }
    expect((await Character.findById(poor.id).lean<CharacterDoc>())!.iron).toBe(499);
  });

  it('a home candidacy is withdrawn and a home seat vacated: a local sits from today; the stipend stops; moving back', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, {
      name: 'Clara Holm',
      fxp: 2_000,
      successes: 30,
      pc: 40,
      cityId: 'irongate',
    });
    // Coalport is on cycle day 0 (nominations): stand at home first.
    await p.caller.council.declare({
      platformId: content.faction('collective').platforms[0]!.id,
      idempotencyKey: key(),
    });
    // …and hold seat 1 of the sitting Coalport council.
    const term = (await OfficeTerm.findOne({ councilKey: 'coalport:4146', seat: 1 }).lean<OfficeTermDoc>())!;
    await OfficeTerm.updateOne(
      { _id: term._id },
      { $set: { holder: { kind: 'player', characterId: p.id, name: 'Clara Holm' }, fromDay: DAY - 1 } },
    );
    await Character.updateOne(
      { _id: p.id },
      {
        $set: {
          offices: [
            {
              termId: term._id,
              cityId: 'coalport',
              councilKey: 'coalport:4146',
              seat: 1,
              fromDay: DAY - 1,
              toDay: term.toDay,
            },
          ],
        },
      },
    );
    const npcBefore = (await City.findById('coalport').lean())!.council!.npcSeats;
    const r = await p.caller.residence.register({
      cityId: 'irongate',
      districtId: 'irongate.old-town',
      idempotencyKey: key(),
    });
    expect(r.knockOns).toMatchObject({ seatGivenUp: { cityName: 'Coalport' }, candidacyWithdrawn: true });
    const cand = (await Candidacy.findOne({ characterId: p.id, electionId: 'coalport:4146' }).lean())!;
    expect([cand.status, cand.deposit]).toEqual(['withdrawn', 'kept']);
    const terms = await OfficeTerm.find({ councilKey: 'coalport:4146', seat: 1 })
      .sort({ fromDay: 1 })
      .lean<OfficeTermDoc[]>();
    expect(terms.map((t) => [t.holder.kind, t.fromDay, t.vacatedDay ?? null, t.completed])).toEqual([
      ['player', DAY - 1, DAY, false],
      ['npc', DAY, null, false],
    ]);
    expect(terms[1]!.toDay).toBe(term.toDay);
    expect((await City.findById('coalport').lean())!.council!.npcSeats).toBe(npcBefore + 1);
    const c = (await Character.findById(p.id).lean<CharacterDoc>())!;
    expect(c.offices).toEqual([]);
    // The next morning: no stipend for the seat given up; the Herald and the capital's orders.
    clock.set(at(DAY + 1));
    const paper = await p.caller.paper.today();
    expect(paper.desk.stipend).toBeNull();
    expect(paper.paper.name).toBe('The Irongate Herald');
    expect(paper.headlines.map((h) => h.headline)).toContain('Clara Holm Takes Up Residence in Old Town');
    const me = await p.caller.character.me();
    expect(me.orders.items.map((o) => o.id).some((id) => id.startsWith('dir.c.capital-'))).toBe(true);
    // Moving back home: from Coalport, after the seven days, 500 Iron again.
    clock.set(at(DAY + 7));
    await Character.updateOne({ _id: p.id }, { $set: { cityId: 'coalport', iron: 600 } });
    const back = await p.caller.residence.register({
      cityId: 'coalport',
      districtId: null,
      idempotencyKey: key(),
    });
    expect(back.headline).toBe('Coalport has a new voter');
    const home = (await Character.findById(p.id).lean<CharacterDoc>())!.residence!;
    expect([home.cityId, home.districtId, home.canMoveFromDay]).toEqual(['coalport', null, DAY + 14]);
  });
});

describe('the room and the Rested cap (design §7.4, ADR 0030 §5)', () => {
  // Review 4 #9 (tech design §10.5): the same rule through the Lodgings card at the Junction.
  it('100 Iron for seven days, the cap +50 wherever; a renewal adds seven nights (slice-4 fixes §6); NOT_HERE at home', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Dora Fink', cityId: 'irongate' });
    const r = await p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() });
    expect(r).toMatchObject({ act: 'room', stamp: { label: 'Taken' }, headline: 'A bed in Irongate' });
    expect(r.body).toContain('Rested banks to 250');
    expect(r.knockOns.iron).toEqual({ before: 1000, after: 900 });
    expect(r.character.restedCap).toBe(250);
    expect(r.character.room).toEqual({ untilDay: DAY + 7 });
    // Slice-4 fixes §6 (QA m5): a renewal adds seven nights to the end, never restarts the room;
    // with more than seven nights paid it is refused, so at most fourteen are ever paid for.
    clock.set(at(DAY + 2));
    const renewed = await p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() });
    expect(renewed).toMatchObject({ act: 'renew', stamp: { label: 'Renewed' }, headline: 'A bed in Irongate' });
    expect(renewed.knockOns.iron).toEqual({ before: 900, after: 800 });
    expect((await Character.findById(p.id).lean<CharacterDoc>())!.room).toMatchObject({
      fromDay: DAY,
      untilDay: DAY + 14,
    });
    expect((await refusal(p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() }))).game).toEqual({
      reason: 'ROOM_PAID_AHEAD',
      renewFromDay: DAY + 7,
      renewFromAt: expect.any(Number),
    });
    expect((await Character.findById(p.id).lean<CharacterDoc>())!.iron).toBe(800);
    // At home the room still raises the cap; it cannot be taken there.
    await Character.updateOne({ _id: p.id }, { $set: { cityId: 'coalport' } });
    expect((await p.caller.character.me()).restedCap).toBe(250);
    expect((await refusal(p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() }))).game?.reason).toBe(
      'NOT_HERE',
    );
  });

  it('Fever at St Agnes raises the cap for Irongate residents only (+ the room: 300)', async () => {
    const clock = testClock(at(DAY));
    const resident = await traveller(clock, {
      name: 'Emil Kade',
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: 'irongate.old-town' },
    });
    const visitor = await traveller(clock, { name: 'Ferd Lutz', cityId: 'irongate' });
    await setIssueEffect('irongate', 'issue.fever-st-agnes', DAY - 1, DAY + 6);
    expect((await resident.caller.character.me()).restedCap).toBe(250);
    expect((await visitor.caller.character.me()).restedCap).toBe(200);
    await resident.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() });
    expect((await resident.caller.character.me()).restedCap).toBe(300);
    await City.updateOne({ _id: 'irongate' }, { $set: { 'issues.effects': [] } });
  });
});
