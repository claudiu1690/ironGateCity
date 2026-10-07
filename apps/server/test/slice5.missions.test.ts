/**
 * Slice 5, T14 (tech design §3.1, §8.2 `missionService.start`, §10.1, §15 "Server — missions"): a
 * mission without a run-in, end to end. Every roll is forced through the street hooks.
 */
import { ActionLog, Character, City, Encounter, Stay } from '@irongate/db';
import type { CityDoc } from '@irongate/db';
import { ordersForDay } from '@irongate/rules';
import type { ActionResult } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { streetHooks } from '../src/services/streetHooks';
import { gameData, setupDb, teardownDb, testClock } from './helpers';
import { at, content, key, member, setRisk } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const LAUNCH = { locationId: 'coalport.shipyard', missionId: 'coalport.shipyard.launch' };
const POSTERS = { locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters' };
const WATCH = { locationId: 'coalport.customs-house', missionId: 'coalport.customs-house.watch' };

beforeAll(async () => {
  await setupDb('slice5-missions-test');
  streetHooks.enabled = true;
});
afterAll(async () => {
  streetHooks.enabled = false;
  await teardownDb();
});

const asResult = (r: unknown) => r as ActionResult;

describe('a speech mission (design §4.2, §15.1)', () => {
  it('Success: the receipt, persuasion, the way remembered, the tally; the second time is Again', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ada Launch' });
    const before = (await Character.findById(p.id).lean())!;
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const r = asResult(await p.caller.mission.start({ ...LAUNCH, wayId: 'cha-int', idempotencyKey: key() }));
    expect(r).toMatchObject({ kind: 'mission', stamp: 'success', action: { id: LAUNCH.missionId, tier: 2, times: 1 } });
    expect(r.mission).toMatchObject({ type: 'speech', label: 'speech', targetFactionId: null, firstTime: true });
    expect(r.mission!.way).toMatchObject({ id: 'cha-int', agility: false });
    expect(r.rewards.xp.base).toBe(75); // 5 XP an Energy × 15
    expect(r.rewards.iron.base).toBe(60); // 4 Iron an Energy
    expect(r.street).toMatchObject({ runIn: null, caught: null, record: null, sentTo: null, remembered: true });
    expect(r.street!.heat).toMatchObject({ before: 0, gain: 0, after: 0, state: 'cool' });
    expect(r.effects.opinion).toMatchObject({ factionId: 'collective' });
    expect(r.effects.opinion!.mode).toBeUndefined();
    expect(r.again).toMatchObject({ cost1: 15, cost3: null, way: { id: 'cha-int' } });
    const after = (await Character.findById(p.id).lean())!;
    expect(after.ways).toEqual([{ missionId: LAUNCH.missionId, wayId: 'cha-int' }]);
    expect(after.today.missions).toBe(1);
    expect(after.iron - before.iron).toBe(r.rewards.iron.total);
    expect(after.firsts?.mission).toBeInstanceOf(Date);
    expect(await ActionLog.countDocuments({ characterId: p.id, kind: 'mission' })).toBe(1);

    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const again = asResult(await p.caller.mission.start({ ...LAUNCH, wayId: 'cha-int', idempotencyKey: key() }));
    expect(again.street!.remembered).toBe(false);
    expect(again.mission!.firstTime).toBe(false);
    expect((await Character.findById(p.id).lean())!.today.missions).toBe(2);
  });

  it('Failure pays a fifth of the XP and nothing else', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Bo Flop' });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 100 });
    const r = asResult(await p.caller.mission.start({ ...LAUNCH, wayId: 'str', idempotencyKey: key() }));
    expect(r.stamp).toBe('failure');
    expect(r.rewards.xp.base).toBe(15);
    expect(r.rewards.fxp.total).toBe(0);
    expect(r.rewards.iron.total).toBe(0);
    expect(r.rewards.opinion).toBe(0);
  });

  it('a retried key returns the stored result; concurrent copies write one log', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Cy Twice' });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const k = key();
    const [a, b] = await Promise.all([
      p.caller.mission.start({ ...LAUNCH, wayId: 'best', idempotencyKey: k }),
      p.caller.mission.start({ ...LAUNCH, wayId: 'best', idempotencyKey: k }),
    ]);
    expect(asResult(a).logId).toBe(asResult(b).logId);
    const c = asResult(await p.caller.mission.start({ ...LAUNCH, wayId: 'best', idempotencyKey: k }));
    expect(c.logId).toBe(asResult(a).logId);
    expect(await ActionLog.countDocuments({ characterId: p.id, idempotencyKey: k })).toBe(1);
  });
});

describe('the gates and refusals (tech design §7.2)', () => {
  it('an illegal mission below Rank 3: MISSION_LOCKED RANK; nothing written', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Di Low' });
    const v = (await Character.findById(p.id).lean())!.version;
    await expect(p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'MISSION_LOCKED' && gameData(e).game?.lock === 'RANK' && gameData(e).game?.need === 3,
    );
    expect((await Character.findById(p.id).lean())!.version).toBe(v);
  });

  it('below Level 6: MISSION_LOCKED LEVEL; an unknown way: UNKNOWN_WAY; your own party: OWN_FACTION_TARGET', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ed Five', level: 5 });
    await expect(p.caller.mission.start({ ...LAUNCH, wayId: 'str', idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'MISSION_LOCKED' && gameData(e).game?.need === 6,
    );
    await expect(p.caller.mission.start({ ...LAUNCH, wayId: 'nope', idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'UNKNOWN_WAY',
    );
    const q = await member(clock, { name: 'Flo Own', level: 10, rank: 3 });
    await expect(
      q.caller.mission.start({ locationId: 'coalport.union-hall', missionId: 'coalport.union-hall.spike', wayId: 'agi', idempotencyKey: key() }),
    ).rejects.toSatisfy((e) => gameData(e).game?.reason === 'OWN_FACTION_TARGET');
  });

  it('with too little Energy: NOT_ENOUGH_ENERGY', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Gil Tired' });
    await Character.updateOne({ _id: p.id }, { $set: { 'energy.value': 3, rested: 0, 'energy.updatedAt': new Date(clock.now()) } });
    await expect(p.caller.mission.start({ ...LAUNCH, wayId: 'str', idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'NOT_ENOUGH_ENERGY',
    );
  });
});

describe('an illegal mission (design §4.2, §6, §7)', () => {
  it('posters: Heat +6, opinion against the Vanguard (two legs), a Partial while Cool takes your name', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Hal Paste', rank: 3 });
    await City.updateOne({ _id: 'coalport' }, { $set: { opinion: { vanguard: 20, collective: 60, alliance: 10, neutral: 10 } } });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const s = asResult(await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() }));
    expect(s.stamp).toBe('success');
    expect(s.street!.heat).toMatchObject({ before: 0, gain: 6, after: 6, state: 'cool' });
    expect(s.street!.caught).toBeNull();
    expect(s.effects.opinion).toMatchObject({ mode: 'against', targetFactionId: 'vanguard', shareBefore: 20 });
    expect(s.mission).toMatchObject({ label: 'against', targetFactionId: 'vanguard' });
    const city = (await City.findById('coalport').lean<CityDoc>())!;
    expect(city.opinion!.vanguard).toBeCloseTo(20 - s.effects.opinion!.applied, 3);
    expect(city.rivalPressure ?? null).toBeNull(); // the cap is rival ground's only

    // A Partial while Cool: the caught check takes the name (a minor mark), no cells.
    const partialRoll = s.attempts[0]!.check.chance + 1;
    streetHooks.set(p.id, { runIn: 'never', checkRoll: partialRoll, caught: 'always' });
    const r = asResult(await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() }));
    expect(r.stamp).toBe('partial');
    expect(r.street!.caught).toMatchObject({ caught: true, withoutRoll: false });
    expect(r.street!.record).toMatchObject({ added: 1, before: 'clean', after: 'onFile', marks: 1, first: true });
    expect(r.street!.sentTo).toBeNull();
    const after = (await Character.findById(p.id).lean())!;
    expect(after.record!.marks).toHaveLength(1);
    expect(after.heat!.value).toBe(12);
    expect(after.held).toBeNull();
  });

  it('Hot and caught: taken in — the stay, the pointer, no Again; then every act is refused HELD', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ivo Hot', rank: 3, iron: 500 });
    await setRisk(p.id, clock.now(), { heat: 60 });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 99, caught: 'always' });
    const r = asResult(await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() }));
    expect(r.stamp).toBe('takenIn');
    expect(r.again).toBeNull();
    expect(r.street!.sentTo).toMatchObject({ kind: 'cells', placeName: 'Harbour Police' });
    // Review 4 #20: 20 + 66 ÷ 2 = 53 minutes; bail 100 + 50 × 1 mark = 150.
    expect(r.street!.sentTo!.until - at(DAY)).toBe(53 * 60_000);
    expect(r.street!.sentTo!.bail).toBe(150);
    const stay = (await Stay.findOne({ characterId: p.id }).lean())!;
    expect(stay).toMatchObject({ kind: 'cells', reason: 'caught', minutes: 53, marks: 1, heatAtArrest: 66, again: false });
    const c = (await Character.findById(p.id).lean())!;
    expect(c.held).toMatchObject({ kind: 'cells', state: 'in', locationId: 'coalport.harbour-police' });
    expect(c.record!.arrests).toEqual([DAY]);
    await expect(p.caller.mission.start({ ...LAUNCH, wayId: 'str', idempotencyKey: key() })).rejects.toSatisfy(
      (e) => gameData(e).game?.reason === 'HELD',
    );
    const me = await p.caller.character.me();
    expect(me.held).toMatchObject({ kind: 'cells', state: 'in', placeName: 'Harbour Police' });
  });

  it('Wanted and a Failure: taken in without a roll; a second arrest within seven days is three serious marks', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Jo Wanted', rank: 3 });
    await setRisk(p.id, clock.now(), { heat: 80, marks: [{ day: DAY - 3, kind: 'minor' }], arrests: [DAY - 3] });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 100, caught: 'never' });
    const r = asResult(await p.caller.mission.start({ ...POSTERS, wayId: 'agi', idempotencyKey: key() }));
    expect(r.stamp).toBe('takenIn');
    expect(r.street!.caught).toMatchObject({ caught: true, withoutRoll: true });
    expect(r.street!.record).toMatchObject({ added: 3, escalated: true, after: 'repeat' });
    expect((await Stay.findOne({ characterId: p.id }).lean())!.reason).toBe('wanted');
  });

  it("the record's Iron penalty: On file pays a tenth less Iron", async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Kit Filed', rank: 3 });
    await setRisk(p.id, clock.now(), { marks: [{ day: DAY - 1, kind: 'minor' }] });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const r = asResult(await p.caller.mission.start({ ...LAUNCH, wayId: 'str', idempotencyKey: key() }));
    expect(r.rewards.iron.parts).toContainEqual({ id: 'record', label: 'Your record', amount: -6 });
    expect(r.bonusTags.find((t) => t.id === 'record')).toBeDefined();
  });
});

describe('Agility and the orders (design §4.1, §12.2)', () => {
  it('a Success on an Agility way: Agility +¼', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Lu Roofs' });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const r = asResult(await p.caller.mission.start({ ...WATCH, wayId: 'agi', idempotencyKey: key() }));
    expect(r.stamp).toBe('success');
    expect(r.street!.agility).toEqual({ quarters: 1, gained: true });
    expect(r.street!.heat).toMatchObject({ gain: 5, after: 5 });
    expect((await Character.findById(p.id).lean())!.stats.agiQuarters).toBe(1);
  });

  it('the slot-B mission order advances on any mission; Six wins does not', async () => {
    const templates = content.ordersOf('collective');
    let day = DAY;
    while (!ordersForDay(templates, day, 'home', 6).some((t) => t.id === 'dir.mission')) day++;
    const clock = testClock(at(day - 1));
    const p = await member(clock, { name: 'Mo Order' });
    clock.set(at(day));
    await p.caller.character.me();
    const before = (await Character.findById(p.id).lean())!;
    expect(before.orders.items.some((x) => x.templateId === 'dir.mission')).toBe(true);
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const r = asResult(await p.caller.mission.start({ ...WATCH, wayId: 'int', idempotencyKey: key() }));
    expect(r.effects.orders.map((o) => o.id)).toContain('dir.mission');
    expect(r.bonusTags.some((t) => t.id === 'order')).toBe(true);
  });
});

describe('no run-in means no encounter', () => {
  it('a forced quiet start writes no encounter', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Ned Quiet' });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    await p.caller.mission.start({ ...LAUNCH, wayId: 'str', idempotencyKey: key() });
    expect(await Encounter.countDocuments({ characterId: p.id })).toBe(0);
  });
});
