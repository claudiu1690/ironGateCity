/**
 * Slice 5, T19 (tech design §15 "Server — integration"): a risky week on the test clock for one
 * player per faction — missions to *Hot*, the cells and bail, the infirmary, a trip to rival ground
 * ending in a deportation, marks fading on day 14, a strike-off — and the boundary races: a run-in
 * started at 23:59:59 and answered at 00:00:01, a release at the boundary, a mission straddling the
 * Monday Issue resolution. Every roll is forced through the street hooks.
 */
import { ActionLog, Character, Encounter, Journey, PaperEntry, Stay } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { dayStart } from '@irongate/rules';
import type { ActionResult, FactionId, RunInPending } from '@irongate/rules';
import { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { releaseHeldNow, sendToHeld } from '../src/services/heldService';
import { streetHooks } from '../src/services/streetHooks';
import { setupDb, teardownDb, testClock } from './helpers';
import { at, content, key, member, setRisk } from './slice5.helpers';

const MONDAY = 20734; // Mon 12 Oct 2026 (a week's first day)
const DAY = MONDAY + 1; // Tuesday

beforeAll(async () => {
  await setupDb('slice5-integration-test');
  streetHooks.enabled = true;
});
afterAll(async () => {
  streetHooks.enabled = false;
  await teardownDb();
});

const asResult = (r: unknown) => r as ActionResult;
const asPending = (r: unknown) => r as RunInPending;

interface Plan {
  factionId: FactionId;
  home: string;
  posters: { locationId: string; missionId: string };
  /** A party opponent who is not of the actor's side. */
  heavy: string;
  rival: string;
  rivalMission: { locationId: string; missionId: string; wayId: string };
}

const PLANS: Plan[] = [
  {
    factionId: 'collective',
    home: 'coalport',
    posters: { locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters' },
    heavy: 'street-enforcer',
    rival: 'duskwall',
    rivalMission: { locationId: 'duskwall.mountain-inn', missionId: 'duskwall.mountain-inn.posters', wayId: 'agi' },
  },
  {
    factionId: 'vanguard',
    home: 'duskwall',
    posters: { locationId: 'duskwall.mountain-inn', missionId: 'duskwall.mountain-inn.posters' },
    heavy: 'party-thug',
    rival: 'ashford',
    rivalMission: { locationId: 'ashford.brewery', missionId: 'ashford.brewery.posters', wayId: 'agi' },
  },
  {
    factionId: 'alliance',
    home: 'ashford',
    posters: { locationId: 'ashford.brewery', missionId: 'ashford.brewery.posters' },
    heavy: 'strike-picket',
    rival: 'coalport',
    rivalMission: { locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters', wayId: 'agi' },
  },
];

/** The stored edition's template ids of a day. */
async function idsOn(id: string, day: number): Promise<string[]> {
  const e = await PaperEntry.findOne({ characterId: id, day }).lean();
  return (e?.headlines ?? []).map((h) => h.templateId);
}

const doc = async (id: string) => (await Character.findById(id).lean<CharacterDoc>())!;

describe('a risky week (tech design §15, T19)', () => {
  for (const plan of PLANS) {
    it(`${plan.factionId}: Hot, the cells and bail, the infirmary, rival ground and the train home, a strike-off, two weeks on`, async () => {
      const clock = testClock(at(DAY, 8));
      const p = await member(clock, { name: `Risky ${plan.factionId}`, factionId: plan.factionId, level: 10, rank: 3, iron: 2_000, pc: 40 });
      const start = await doc(p.id);
      const quiet = () => streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });

      // Day 1: posters until Hot (+6 a time; Energy 10 a time from 100).
      let r!: ActionResult;
      for (let n = 0; n < 9; n++) {
        quiet();
        r = asResult(await p.caller.mission.start({ ...plan.posters, wayId: 'agi', idempotencyKey: key() }));
        expect(r.stamp).toBe('success');
      }
      expect(r.street!.heat).toMatchObject({ after: 54, state: 'hot' });
      expect((await p.caller.character.me()).heat!.state).toBe('hot');

      // A Partial while Hot and caught: the cells; bail.
      await Character.updateOne({ _id: p.id }, { $set: { 'energy.value': 100, 'energy.updatedAt': new Date(clock.now()) } });
      streetHooks.set(p.id, { runIn: 'never', checkRoll: r.attempts[0]!.check.chance + 1, caught: 'always' });
      r = asResult(await p.caller.mission.start({ ...plan.posters, wayId: 'agi', idempotencyKey: key() }));
      expect(r.stamp).toBe('takenIn');
      const held = (await p.caller.held.get())!;
      expect(held.kind).toBe('cells');
      const bail = await p.caller.held.bail({ idempotencyKey: key() });
      expect(bail.knockOns.heat).toMatchObject({ after: 25 });
      await p.caller.held.close({ stayId: held.stayId });

      // Day 2: the morning paper prints the cells (In Print), not *seen* (Heat 25 after bail).
      clock.set(at(DAY + 1, 9));
      await p.caller.character.me();
      const day2 = await idsOn(p.id, DAY + 1);
      expect(day2.some((id) => id.endsWith('.cells'))).toBe(true);
      expect(day2.some((id) => id.endsWith('.seen'))).toBe(false);

      // A run-in lost to a party heavy: the infirmary, discharged lazily at about 50.
      await Character.updateOne({ _id: p.id }, { $set: { 'energy.value': 100, 'energy.updatedAt': new Date(clock.now()) } });
      streetHooks.set(p.id, { runIn: 'next', opponentId: plan.heavy, checkRoll: 1, choiceRoll: 100 });
      const pending = asPending(await p.caller.mission.start({ ...plan.posters, wayId: 'agi', idempotencyKey: key() }));
      const lost = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'fight', idempotencyKey: key() });
      expect(lost.stamp).toBe('carriedOff');
      await p.caller.encounter.close({ encounterId: pending.encounterId });
      clock.set(clock.now() + 20 * 60_000);
      expect((await p.caller.character.me()).health!.value).toBe(50);
      const ward = (await p.caller.held.get())!;
      expect(ward.release).toMatchObject({ act: 'discharged' });
      await p.caller.held.close({ stayId: ward.stayId });

      // Day 3: the paper prints the infirmary; then rival ground, Hot there, taken in, the train home.
      clock.set(at(DAY + 2, 9));
      await p.caller.character.me();
      expect((await idsOn(p.id, DAY + 2)).some((id) => id.endsWith('.infirmary'))).toBe(true);
      await Character.updateOne({ _id: p.id }, { $set: { cityId: plan.rival, 'energy.value': 100, 'energy.updatedAt': new Date(clock.now()) } });
      await setRisk(p.id, clock.now(), { heat: 60 });
      await p.caller.character.me();
      streetHooks.set(p.id, { runIn: 'never', checkRoll: 100, caught: 'always' });
      r = asResult(await p.caller.mission.start({ ...plan.rivalMission, idempotencyKey: key() }));
      expect(r.stamp).toBe('takenIn');
      expect(r.street!.heat!.gain).toBe(12); // ×2 on rival ground
      // A second arrest within seven days: three serious marks (design §7.2).
      expect(r.street!.record).toMatchObject({ added: 3, escalated: true });
      const rivalCells = (await p.caller.held.get())!;
      expect(rivalCells.rivalGround).toBe(true);
      clock.set(rivalCells.until + 1);
      const me = await p.caller.character.me();
      expect(me.journey).toMatchObject({ to: plan.home, status: 'onTheWay' });
      expect(me.barred!.map((b) => b.cityId)).toEqual([plan.rival]);
      await p.caller.held.close({ stayId: rivalCells.stayId });
      const j = (await Journey.findById(me.journey!.id).lean())!;
      clock.set(j.arrivesAt.getTime() + 1);
      expect((await p.caller.character.me()).cityId).toBe(plan.home);

      // Day 4: the paper prints the train home (In Print) or the night in the rival cells.
      clock.set(at(DAY + 3, 9));
      await p.caller.character.me();
      const day4 = await idsOn(p.id, DAY + 3);
      expect(day4.some((id) => /\.(deported|cells|rival-trip)$/.test(id))).toBe(true);

      // A strike-off for 30 PC (the oldest mark).
      const marksBefore = (await doc(p.id)).record!.marks.length;
      const struck = await p.caller.record.strike({ idempotencyKey: key() });
      expect(struck.knockOns.record!.after.marks).toBe(marksBefore - 1);

      // Nothing owned is lost: Iron only moved by acts and bail; the stays and the run-in are history.
      expect(await Stay.countDocuments({ characterId: p.id })).toBe(3);
      expect(await Encounter.countDocuments({ characterId: p.id, state: 'resolved' })).toBe(1);
      expect((await doc(p.id)).iron).toBeGreaterThan(0);
      expect(start.inventory.length).toBe((await doc(p.id)).inventory.length);

      // The strike took the day-1 minor mark; the three serious marks never fade (slice 5).
      clock.set(at(DAY + 2 + 14, 9));
      const later = await p.caller.character.me();
      expect(later.record).toMatchObject({ level: 'repeat', marks: 3, fading: 0 });
      expect(later.heat!.value).toBe(0);
      expect(later.held).toBeNull();
    });
  }
});

describe('the fade (design §7.3)', () => {
  it('a minor mark from a mission is gone fourteen City Days after it, not a day before', async () => {
    const clock = testClock(at(DAY));
    const p = await member(clock, { name: 'Fade Away', rank: 3 });
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const s = asResult(
      await p.caller.mission.start({ locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters', wayId: 'agi', idempotencyKey: key() }),
    );
    streetHooks.set(p.id, { runIn: 'never', checkRoll: s.attempts[0]!.check.chance + 1, caught: 'always' });
    const r = asResult(
      await p.caller.mission.start({ locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters', wayId: 'agi', idempotencyKey: key() }),
    );
    expect(r.street!.record).toMatchObject({ added: 1, after: 'onFile' });
    clock.set(at(DAY + 13));
    expect((await p.caller.character.me()).record).toMatchObject({ level: 'onFile', marks: 1, fadesOn: DAY + 14 });
    clock.set(at(DAY + 14));
    expect((await p.caller.character.me()).record).toMatchObject({ level: 'clean', marks: 0 });
  });
});

describe('boundary races (tech design §15, T19)', () => {
  it('a run-in started at 23:59:59 and answered at 00:00:01: the day’s turn wins (luck), one resolution', async () => {
    const clock = testClock(dayStart(DAY + 1) - 1_000);
    const p = await member(clock, { name: 'Race Midnight', rank: 3 });
    streetHooks.set(p.id, { runIn: 'next', opponentId: 'street-enforcer', checkRoll: 1, choiceRoll: 1 });
    const pending = asPending(
      await p.caller.mission.start({ locationId: 'coalport.far-bank', missionId: 'coalport.far-bank.posters', wayId: 'agi', idempotencyKey: key() }),
    );
    clock.set(dayStart(DAY + 1) + 1_000);
    const r = await p.caller.encounter.choose({ encounterId: pending.encounterId, choice: 'pay', idempotencyKey: key() });
    expect(r.street!.runIn!.by).toBe('auto');
    expect(await ActionLog.countDocuments({ characterId: p.id })).toBe(1);
    const enc = (await Encounter.findById(pending.encounterId).lean())!;
    expect(enc.resolvedAsOf!.getTime()).toBe(dayStart(DAY + 1) - 1);
    expect((await doc(p.id)).day.settled).toBe(DAY + 1);
  });

  it('a release at the boundary: as of until; the next day settles after it', async () => {
    const clock = testClock(dayStart(DAY + 1) - 10 * 60_000);
    const p = await member(clock, { name: 'Race Release' });
    await sendToHeld(content, new Types.ObjectId(p.id), 'cells', clock.now());
    await releaseHeldNow(new Types.ObjectId(p.id), dayStart(DAY + 1));
    clock.set(dayStart(DAY + 1) + 1);
    const me = await p.caller.character.me();
    expect(me.held!.state).toBe('out');
    expect(me.heat!.value).toBe(25);
    const stay = (await Stay.findOne({ characterId: p.id }).lean())!;
    expect(stay.releasedAt!.getTime()).toBe(dayStart(DAY + 1));
    expect(await PaperEntry.countDocuments({ characterId: p.id, day: DAY + 1 })).toBe(1);
  });

  it('a mission straddling midnight into Monday (the Issue week’s resolution) lands on the new day', async () => {
    const sunday = MONDAY + 6; // the next week's Sunday
    const clock = testClock(dayStart(sunday + 1) - 100);
    const p = await member(clock, { name: 'Race Monday' });
    let calls = 0;
    const straddle = () => (calls++ === 0 ? clock.now() : clock.now() + 200);
    const { callerFor } = await import('./helpers');
    const caller = callerFor(p.user, straddle);
    streetHooks.set(p.id, { runIn: 'never', checkRoll: 1 });
    const r = asResult(
      await caller.mission.start({ locationId: 'coalport.shipyard', missionId: 'coalport.shipyard.launch', wayId: 'str', idempotencyKey: key() }),
    );
    expect(r.today.day).toBe(sunday + 1);
    expect(r.character.day.key).toBe(sunday + 1);
  });
});
