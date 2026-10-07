/**
 * QA (slice 5): rival ground end to end on the server. A mission there (Heat ×2, Party XP +50 %,
 * opinion against the home party under the day's cap, the caught base ×2, the sentence ×1.5 and bail
 * ×2, the train home); the 2-point cap with six visitors tapping at once; the hostile draw reading the
 * Heat **projected** at boarding, and the first trip's checkpoint even when Hot. ADR 0034; design §11,
 * §23.1 #12; GDD §14.11–§14.12.
 */
import { City, Character } from '@irongate/db';
import type { CityDoc } from '@irongate/db';
import type { ActionResult } from '@irongate/rules';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { streetHooks } from '../src/services/streetHooks';
import { setupDb, teardownDb, testClock } from './helpers';
import { at, key, member, setRisk } from './slice5.helpers';

const DAY = 20732; // Tue 6 Oct 2026
const H = 3_600_000;
const MEETING = { locationId: 'duskwall.rampart-row', missionId: 'duskwall.rampart-row.street-meeting', wayId: 'str' };
const CANVASS = { actionId: 'duskwall.quartermaster-market.canvass', locationId: 'duskwall.quartermaster-market' };

beforeAll(async () => {
  await setupDb('qa-slice5-rival');
  streetHooks.enabled = true;
});
afterAll(async () => {
  streetHooks.enabled = false;
  await teardownDb();
});

async function setDuskwall(opinion: CityDoc['opinion'], pressure: CityDoc['rivalPressure'] | null) {
  await City.updateOne({ _id: 'duskwall' }, { $set: { opinion, rivalPressure: pressure } });
}

describe('QA · a mission on rival ground (design §11.2)', () => {
  it('a disruption in Duskwall: Heat +16, Party XP +50 % as its own part, opinion against the Vanguard, the rival city in the tally', async () => {
    const clock = testClock(at(DAY));
    await setDuskwall({ vanguard: 70, collective: 10, alliance: 5, neutral: 15 }, null);
    const p = await member(clock, { name: 'Ada Away', level: 10, rank: 3, cityId: 'duskwall' });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const r = (await p.caller.mission.start({ ...MEETING, idempotencyKey: key() })) as ActionResult;
    expect(r.stamp).toBe('success');
    expect(r.street!.heat).toMatchObject({ before: 0, gain: 16, after: 16 });
    expect(r.attempts[0]!.check.bonuses).toContainEqual({ id: 'rivalGround', label: 'Rival ground', value: -16 });
    // 15 Energy × 0.8 = 12 base; +50 % = +6 (design §11.3: 18 Party XP for 15 Energy).
    expect(r.rewards.fxp.base).toBe(12);
    expect(r.rewards.fxp.parts).toContainEqual({ id: 'rivalGround', label: 'Rival ground', amount: 6 });
    expect(r.effects.opinion).toMatchObject({ mode: 'against', targetFactionId: 'vanguard' });
    const city = (await City.findById('duskwall').lean<CityDoc>())!;
    expect(city.opinion!.vanguard).toBeCloseTo(69.7, 6);
    expect(city.rivalPressure).toMatchObject({ day: DAY, lost: 300 });
    const c = (await Character.findById(p.id).lean())!;
    expect((c.today as { rivalCityId?: string }).rivalCityId).toBe('duskwall');
  });

  it('Hot and caught there: the cells with the sentence ×1.5 and bail ×2, then the train home and a day’s bar', async () => {
    const clock = testClock(at(DAY) + 10 * 60_000);
    const p = await member(clock, { name: 'Bo Caught', level: 10, rank: 3, cityId: 'duskwall', iron: 1_000 });
    await setRisk(p.id, clock.now(), { heat: 40 });
    // A Partial (roll 99 at Fair odds is a Failure or a Partial; 80 keeps it inside the window) and the caught check forced.
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 95, caught: 'always' });
    const r = (await p.caller.mission.start({ ...MEETING, idempotencyKey: key() })) as ActionResult;
    expect(['partial', 'failure']).toContain(r.attempts[0]!.outcome);
    expect(r.stamp).toBe('takenIn');
    expect(r.street!.heat).toMatchObject({ before: 40, after: 56 });
    const held = (await p.caller.held.get())!;
    // Review 4 #20: (20 + 56 ÷ 2) × 1.5 = 72, at most 60 minutes; bail (100 + 50 × 1 mark) × 2 = 300.
    expect(held).toMatchObject({ kind: 'cells', rivalGround: true, placeName: 'Lock-up' });
    expect(held.until - clock.now()).toBe(60 * 60_000);
    expect(held.bail!.total).toBe(300);
    clock.set(held.until + 1);
    const me = await p.caller.character.me();
    expect(me.journey).toMatchObject({ from: 'duskwall', to: 'coalport' });
    expect(me.barred).toEqual([{ cityId: 'duskwall', cityName: 'Duskwall', until: held.until + 24 * H }]);
    expect(me.heat!.value).toBe(25);
  });

  it('the day’s cap reached by a mission: 1.9 lost, a disruption takes 0.1 and says so', async () => {
    const clock = testClock(at(DAY) + 20 * 60_000);
    await setDuskwall({ vanguard: 70, collective: 10, alliance: 5, neutral: 15 }, { day: DAY, lost: 1_900, prev: null });
    const p = await member(clock, { name: 'Cy Capped', level: 10, rank: 3, cityId: 'duskwall', factionId: 'alliance' });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const r = (await p.caller.mission.start({ ...MEETING, idempotencyKey: key() })) as ActionResult;
    expect(r.effects.opinion).toMatchObject({ mode: 'against', capped: true });
    const city = (await City.findById('duskwall').lean<CityDoc>())!;
    expect(city.rivalPressure!.lost).toBe(2_000);
    expect(city.opinion!.vanguard).toBeCloseTo(69.9, 6);
  });
});

describe('QA · the 2-point cap with visitors tapping at once (ADR 0034)', () => {
  it('six visitors at once with 1.95 already lost: the Vanguard loses exactly 0.05 more, never past 2.000', async () => {
    const clock = testClock(at(DAY) + 30 * 60_000);
    await setDuskwall({ vanguard: 70, collective: 10, alliance: 5, neutral: 15 }, { day: DAY, lost: 1_950, prev: null });
    const visitors = await Promise.all(
      Array.from({ length: 6 }, (_, n) =>
        member(clock, { name: `Dee Crowd ${n}`, level: 10, cityId: 'duskwall', factionId: n % 2 ? 'alliance' : 'collective' }),
      ),
    );
    for (const v of visitors) streetHooks.set(v.id, { runIn: 'never', checkRoll: 1 });
    const rs = await Promise.allSettled(visitors.map((v) => v.caller.action.perform({ ...CANVASS, idempotencyKey: key(), times: 1 })));
    expect(rs.filter((x) => x.status === 'rejected')).toEqual([]);
    const city = (await City.findById('duskwall').lean<CityDoc>())!;
    expect(city.rivalPressure!.lost).toBe(2_000);
    expect(Math.round(city.opinion!.vanguard * 1000)).toBe(70_000 - 50);
    const sum = city.opinion!.vanguard + city.opinion!.collective + city.opinion!.alliance + city.opinion!.neutral;
    expect(Math.round(sum * 1000)).toBe(100_000);
    // Every tap still paid its XP and Iron (the cap takes only the opinion).
    for (const x of rs) if (x.status === 'fulfilled') expect((x.value as ActionResult).rewards.xp.total).toBeGreaterThan(0);
  });
});

describe('QA · the hostile draw at boarding (design §11.4, §23.1 #12)', () => {
  it('the first trip to rival ground draws the checkpoint even at Heat 90', async () => {
    const clock = testClock(at(DAY) + 40 * 60_000);
    const p = await member(clock, { name: 'Ed First', level: 10 });
    await setRisk(p.id, clock.now(), { heat: 90 });
    const j = await p.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    expect(j.journey.card!.eventId).toBe('jev.checkpoint');
  });

  it('the list reads the Heat projected at boarding: stored 52 two hours ago is 42, so no list; 50 now is the list', async () => {
    const clock = testClock(at(DAY) + 50 * 60_000);
    const cooled = await member(clock, { name: 'Flo Cooled', level: 10 });
    const hot = await member(clock, { name: 'Gil Hot', level: 10 });
    for (const p of [cooled, hot]) await Character.updateOne({ _id: p.id }, { $set: { rivalTrips: 1, 'hostileDeck.seen': ['jev.checkpoint'] }, $inc: { version: 1 } });
    await setRisk(cooled.id, clock.now() - 2 * H, { heat: 52 });
    await setRisk(hot.id, clock.now(), { heat: 50 });
    const a = await cooled.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    const b = await hot.caller.travel.board({ to: 'duskwall', idempotencyKey: key() });
    const id = (x: typeof a) => x.journey.card!.eventId;
    expect(id(a)).not.toBe('jev.listed');
    expect(['jev.informer', 'jev.conductor']).toContain(id(a));
    expect(id(b)).toBe('jev.listed');
  });
});

describe('QA · the infirmary on rival ground (design §11.2: "the same; no deportation")', () => {
  it('a visitor carried off in Duskwall is discharged in Duskwall: no train home, no bar', async () => {
    const clock = testClock(at(DAY) + 60 * 60_000);
    const p = await member(clock, { name: 'Hal Mended', level: 10, rank: 3, cityId: 'duskwall' });
    streetHooks.set(p.id, { runIn: 'next', opponentId: 'vanguard-doorman', checkRoll: 1, choiceRoll: 100 });
    const pending = (await p.caller.mission.start({ ...MEETING, idempotencyKey: key() })) as unknown as { encounterId: string };
    const r = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'fight', idempotencyKey: key() });
    expect(r.stamp).toBe('carriedOff');
    const held = (await p.caller.held.get())!;
    expect(held).toMatchObject({ kind: 'infirmary', rivalGround: true, placeName: 'Infirmary', cityId: 'duskwall' });
    clock.set(held.until + 1);
    const me = await p.caller.character.me();
    expect(me.journey).toBeNull();
    expect(me.barred).toEqual([]);
    expect(me.cityId).toBe('duskwall');
    const after = (await p.caller.held.get())!;
    expect(after.release).toMatchObject({ act: 'discharged' });
  });
});
