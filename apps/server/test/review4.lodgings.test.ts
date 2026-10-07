/**
 * Review 4, T16 (docs/tech/review-4.md §10.3, §10.5; answers §9.2–§9.3; GDD §14.11): *Live here*,
 * one state per row of the residence card and no room on it; the Lodgings card at Tram Junction
 * (`LocationView.lodgings`) and `residence.room` from a place, its rule unchanged (100 Iron, seven
 * nights, Rested's cap +50, renewal at the end while seven or fewer remain, at most fourteen paid).
 */
import { randomUUID } from 'node:crypto';
import { Character, City, RequestLog } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import type { LocationView } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, setIssueEffect, traveller } from './slice4.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const JUNCTION = 'irongate.tram-junction';
const EASTSIDE = 'irongate.eastside';
const key = () => randomUUID();

beforeAll(async () => {
  await setupDb('review4-lodgings-test');
});
afterAll(teardownDb);

const junction = (locations: LocationView[]) => locations.find((l) => l.id === JUNCTION)!;

describe('the residence card: one state a row, no room (answers §9.2)', () => {
  it('every state, and the card never carries the room', async () => {
    const clock = testClock(at(DAY));
    const card = async (p: Awaited<ReturnType<typeof traveller>>, cityId: string, districtId?: string) => {
      const city = await p.caller.city.get({ cityId });
      const c = districtId ? city.districts!.find((d) => d.id === districtId)!.residence : city.residence!;
      expect('room' in c).toBe(false);
      return c;
    };
    const visiting = await traveller(clock, { name: 'Ada Visit', cityId: 'irongate' });
    expect(await card(visiting, 'irongate', EASTSIDE)).toMatchObject({
      state: 'visitingMay',
      livesIn: 'Coalport',
      cost: 500,
      button: { enabled: true },
    });
    const short = await traveller(clock, { name: 'Bo Short', cityId: 'irongate', iron: 100 });
    expect(await card(short, 'irongate', EASTSIDE)).toMatchObject({ state: 'noIron', button: { enabled: false } });
    const junior = await traveller(clock, { name: 'Cy Junior', cityId: 'irongate', fxp: 0 });
    expect(await card(junior, 'irongate', EASTSIDE)).toMatchObject({ state: 'belowRank', button: null });
    const moved = await traveller(clock, {
      name: 'Di Moved',
      cityId: 'irongate',
      residence: { cityId: 'coalport', districtId: null, windows: { canMoveFromDay: DAY + 3 } },
    });
    expect(await card(moved, 'irongate', EASTSIDE)).toMatchObject({ state: 'cooldown', canMoveFromDay: DAY + 3 });
    const resident = await traveller(clock, {
      name: 'Ed Resident',
      cityId: 'irongate',
      residence: { cityId: 'irongate', districtId: EASTSIDE },
    });
    expect(await card(resident, 'irongate', EASTSIDE)).toMatchObject({ state: 'resident', button: null });
    const away = await traveller(clock, {
      name: 'Flo Away',
      cityId: 'coalport',
      residence: { cityId: 'irongate', districtId: EASTSIDE },
    });
    expect(await card(away, 'coalport')).toMatchObject({ state: 'homeElsewhere', livesIn: 'Eastside', button: { enabled: true } });
    const home = await traveller(clock, { name: 'Gil Home', cityId: 'coalport' });
    expect(await card(home, 'coalport')).toMatchObject({ state: 'atHome' });
    const rival = await traveller(clock, { name: 'Hal Rival', cityId: 'duskwall' });
    expect(await card(rival, 'duskwall')).toMatchObject({ state: 'rivalGround', button: null });
  });

  it('Live here moves you in: the stamp is *Moved in*', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Ivo Moves', cityId: 'irongate' });
    const r = await p.caller.residence.register({ cityId: 'irongate', districtId: EASTSIDE, idempotencyKey: key() });
    expect(r).toMatchObject({ act: 'register', stamp: { label: 'Moved in' }, headline: 'Eastside has a new voter' });
  });
});

describe('the Lodgings card at Tram Junction (answers §9.3)', () => {
  it('only the Junction has it; the line, 100 Iron, the cap with a bed', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Jo Bed', cityId: 'irongate' });
    const city = await p.caller.city.get({ cityId: 'irongate' });
    expect(city.locations.filter((l) => l.lodgings).map((l) => l.id)).toEqual([JUNCTION]);
    expect(junction(city.locations).lodgings).toEqual({
      line: 'A bed on the tram line · 7 nights · 100 Iron',
      price: { base: 100, lines: [], total: 100 },
      running: null,
      tap: 'take',
      renewFromDay: null,
      cap: { now: 200, with: 250 },
    });
  });

  it('the rule unchanged: 100 Iron, seven nights, cap +50; renewal adds seven at ≤ 7 left; at most fourteen', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Kit Sleeps', cityId: 'irongate' });
    const r = await p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() });
    expect(r).toMatchObject({ act: 'room', stamp: { label: 'Taken' }, headline: 'A bed in Irongate' });
    expect(r.knockOns.iron).toEqual({ before: 1_000, after: 900 });
    expect(r.character.restedCap).toBe(250);
    expect((await Character.findById(p.id).lean<CharacterDoc>())!.room).toMatchObject({ cityId: 'irongate', fromDay: DAY, untilDay: DAY + 7 });
    let card = junction((await p.caller.city.get({ cityId: 'irongate' })).locations).lodgings!;
    expect(card).toMatchObject({ running: { untilDay: DAY + 7 }, tap: 'renew', renewFromDay: null, cap: { now: 250, with: 250 } });

    const renewed = await p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() });
    expect(renewed).toMatchObject({ act: 'renew', knockOns: { iron: { before: 900, after: 800 } } });
    expect((await Character.findById(p.id).lean<CharacterDoc>())!.room).toMatchObject({ fromDay: DAY, untilDay: DAY + 14 });
    card = junction((await p.caller.city.get({ cityId: 'irongate' })).locations).lodgings!;
    expect(card).toMatchObject({ tap: 'notYet', renewFromDay: DAY + 7 });
    const err = await p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() }).catch((e: unknown) => e);
    expect(gameData(err).game).toMatchObject({ reason: 'ROOM_PAID_AHEAD', renewFromDay: DAY + 7 });
    expect((await Character.findById(p.id).lean<CharacterDoc>())!.iron).toBe(800);
  });

  it('half price under Eviction Notices, the line naming the Issue', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Lu Half', cityId: 'irongate' });
    await setIssueEffect('irongate', 'issue.evictions', DAY - 1, DAY + 6);
    const card = junction((await p.caller.city.get({ cityId: 'irongate' })).locations).lodgings!;
    expect(card.price).toEqual({ base: 100, total: 50, lines: [{ id: 'issue.evictions', label: expect.any(String), pct: -50 }] });
    const r = await p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() });
    expect(r.knockOns.iron).toEqual({ before: 1_000, after: 950 });
    await City.updateOne({ _id: 'irongate' }, { $set: { 'issues.effects': [] } });
  });

  it('NOT_HERE from Coalport; NO_LODGINGS at the Forecourt; an unknown place is NOT_FOUND', async () => {
    const clock = testClock(at(DAY));
    const away = await traveller(clock, { name: 'Mo Away', cityId: 'coalport' });
    const e1 = await away.caller.residence.room({ locationId: JUNCTION, idempotencyKey: key() }).catch((e: unknown) => e);
    expect(gameData(e1).game).toMatchObject({ reason: 'NOT_HERE', cityId: 'irongate' });
    const here = await traveller(clock, { name: 'Ned Here', cityId: 'irongate' });
    const e2 = await here.caller.residence.room({ locationId: 'irongate.forecourt', idempotencyKey: key() }).catch((e: unknown) => e);
    expect(gameData(e2).game?.reason).toBe('NO_LODGINGS');
    const e3 = await here.caller.residence.room({ locationId: 'nowhere', idempotencyKey: key() }).catch((e: unknown) => e);
    expect(gameData(e3).code).toBe('NOT_FOUND');
    for (const p of [away, here]) expect((await Character.findById(p.id).lean<CharacterDoc>())!.iron).toBe(1_000);
  });

  it('a retry with one key: one bed, one charge, the same answer', async () => {
    const clock = testClock(at(DAY));
    const p = await traveller(clock, { name: 'Ola Twice', cityId: 'irongate' });
    const k = key();
    const rs = await Promise.all(Array.from({ length: 4 }, () => p.caller.residence.room({ locationId: JUNCTION, idempotencyKey: k })));
    expect(new Set(rs.map((r) => JSON.stringify(r))).size).toBe(1);
    expect(await RequestLog.countDocuments({ characterId: p.id, idempotencyKey: k })).toBe(1);
    expect((await Character.findById(p.id).lean<CharacterDoc>())!.iron).toBe(900);
  });
});
