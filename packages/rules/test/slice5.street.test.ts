/**
 * Slice 5, T4 (docs/tech/slice-5.md §6.5–§6.7, §6.13): run-ins (the chance, the pool, the odds, the
 * one choice and every failed path), the caught check, the cells and the infirmary, and
 * `finishMission` (the street applied to the held start).
 */
import { describe, expect, it } from 'vitest';
import {
  bailFor,
  caughtChance,
  caughtCheck,
  createRng,
  deportation,
  dischargeSelf,
  finishMission,
  healthAt,
  healthNow,
  heldNow,
  luckChoice,
  pickOpponent,
  release,
  resolveMission,
  resolveRunIn,
  runInChance,
  runInChances,
  scaleOpponent,
  sentenceMinutes,
  walkOut,
  yourPower,
} from '../src';
import type { CaughtResult, MissionInput, MissionStart, OpponentSpec, RunInOutcome } from '../src';
import { NAMES, TEMPLATES, fixedRng } from './helpers';

const OPP: Record<string, OpponentSpec & { side: 'vanguard' | 'collective' | 'alliance' | 'police' }> = {
  'street-enforcer': { id: 'street-enforcer', side: 'vanguard', power: 22, agi: 10, wits: 10, payOff: 60 },
  'vanguard-doorman': { id: 'vanguard-doorman', side: 'vanguard', power: 35, agi: 9, wits: 12, payOff: 150 },
  'strike-picket': { id: 'strike-picket', side: 'collective', power: 25, agi: 12, wits: 11, payOff: 80 },
  'branch-inspector': { id: 'branch-inspector', side: 'collective', power: 17, agi: 11, wits: 16, payOff: null, fightPct: -10 },
  'party-thug': { id: 'party-thug', side: 'alliance', power: 19, agi: 10, wits: 10, payOff: 50 },
  'city-police': { id: 'city-police', side: 'police', power: 30, agi: 12, wits: 14, payOff: 300 },
};
const sideOf = (id: string) => OPP[id]!.side;
const tier2 = (id: string) => scaleOpponent(OPP[id]!, { tier: 2, rivalGround: false });
const noFlags = { watched: false, warned: false };

describe('the run-in chance (design §10.1)', () => {
  const at = (base: number, over: Partial<Parameters<typeof runInChance>[0]> = {}) =>
    runInChance({ base, tier: 2, rivalGround: false, heatState: 'cool', record: 'clean', flags: noFlags, ...over });
  it('a Cool speech 5, a watch 10, a Hot disruption on rival ground 75, a rival tier-1 tap 15', () => {
    expect(at(5)).toBe(5);
    expect(at(10)).toBe(10);
    expect(at(30, { rivalGround: true, heatState: 'hot' })).toBe(75);
    expect(runInChance({ base: 0, tier: 1, rivalGround: true, heatState: 'cool', record: 'clean', flags: noFlags })).toBe(15);
    expect(runInChance({ base: 0, tier: 1, rivalGround: false, heatState: 'hot', record: 'clean', flags: noFlags })).toBe(0);
  });
  it('+5 Noticed, +15 Hot and Wanted, +5 a Repeat offender, ±10 the day flags, kept 0–90', () => {
    expect(at(15, { heatState: 'noticed' })).toBe(20);
    expect(at(15, { heatState: 'wanted', record: 'repeat' })).toBe(35);
    expect(at(15, { flags: { watched: true, warned: false } })).toBe(25);
    expect(at(5, { flags: { watched: false, warned: true } })).toBe(0);
    expect(at(5, { flags: { watched: true, warned: true } })).toBe(5);
    expect(at(30, { rivalGround: true, heatState: 'wanted', record: 'notorious', flags: { watched: true, warned: false } })).toBe(90);
  });
});

describe('who it is (design §10.2)', () => {
  const pool = ['street-enforcer', 'strike-picket', 'city-police'];
  it('own side never; the police half the time from Noticed (50 ± 1 % over 20,000 seeds)', () => {
    let police = 0;
    for (let n = 0; n < 20_000; n++) {
      const id = pickOpponent({ pool, actor: 'vanguard', heatState: 'noticed', sideOf, policeId: 'city-police', rng: createRng(`p${n}`) });
      expect(id).not.toBe('street-enforcer');
      if (id === 'city-police') police++;
    }
    expect(police / 20_000).toBeGreaterThan(0.49);
    expect(police / 20_000).toBeLessThan(0.51);
  });
  it('at Cool the pool as written, uniformly; an empty pool is the police', () => {
    const seen = new Map<string, number>();
    for (let n = 0; n < 6_000; n++) {
      const id = pickOpponent({ pool, actor: 'alliance', heatState: 'cool', sideOf, policeId: 'city-police', rng: createRng(`c${n}`) });
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    for (const id of pool) expect(seen.get(id)! / 6_000).toBeCloseTo(1 / 3, 1);
    expect(
      pickOpponent({ pool: ['street-enforcer'], actor: 'vanguard', heatState: 'cool', sideOf, policeId: 'city-police', rng: createRng('e') }),
    ).toBe('city-police');
    expect(
      pickOpponent({ pool: ['street-enforcer'], actor: 'vanguard', heatState: 'hot', sideOf, policeId: 'city-police', rng: createRng('e') }),
    ).toBe('city-police');
  });
});

describe('the odds (economy §19.5)', () => {
  it('power: STR × 1.5 + armour ÷ 2 (Tier I armour 4); the scaling ×1.1 and +4', () => {
    expect(yourPower(10, 1)).toBe(17);
    expect(yourPower(20, 1)).toBe(32);
    expect(yourPower(10, null)).toBe(15);
    expect(tier2('street-enforcer').power).toBe(24);
    expect(tier2('city-police').power).toBe(33);
    expect(scaleOpponent(OPP['street-enforcer']!, { tier: 2, rivalGround: true }).power).toBe(28);
    expect(scaleOpponent(OPP['street-enforcer']!, { tier: 1, rivalGround: true }).power).toBe(26);
  });
  it('the reference recruit: Fight 29 % and 5 %, Run 30 % and 25 %, Talk 30 % and 14 %; a STR-20 Vanguard 74 % and 47 %', () => {
    const ref = { power: 17, agi: 5, cha: 5 };
    expect(runInChances(ref, tier2('street-enforcer'))).toEqual({ fight: 29, run: 30, talk: 30, pay: 90 });
    expect(runInChances(ref, tier2('city-police'))).toEqual({ fight: 5, run: 25, talk: 14, pay: 90 });
    const str = { power: 32, agi: 5, cha: 5 };
    expect(runInChances(str, tier2('street-enforcer')).fight).toBe(74);
    expect(runInChances(str, tier2('city-police')).fight).toBe(47);
  });
  it("the branch inspector: −10 on your Fight odds, and won't be bought", () => {
    const c = runInChances({ power: 17, agi: 5, cha: 5 }, tier2('branch-inspector'));
    expect(c.fight).toBe(50 + 3 * (17 - 19) - 10);
    expect(c.pay).toBeNull();
  });
  it('luck takes the best free odds; ties fight > run > talk', () => {
    expect(luckChoice({ fight: 30, run: 30, talk: 30 })).toBe('fight');
    expect(luckChoice({ fight: 20, run: 30, talk: 30 })).toBe('run');
    expect(luckChoice({ fight: 20, run: 25, talk: 30 })).toBe('talk');
    expect(luckChoice({ fight: 74, run: 30, talk: 30 })).toBe('fight');
  });
});

describe('the one choice (design §10.3)', () => {
  const them = tier2('street-enforcer');
  const chances = runInChances({ power: 17, agi: 5, cha: 5 }, them);
  const go = (choice: 'fight' | 'run' | 'talk' | 'pay', rolls: number[], healthBefore = 125, iron = 500) =>
    resolveRunIn({ choice, chances, them, iron, healthBefore, healthMax: 125, armour: 4, rng: fixedRng(rolls), damageRng: createRng('dmg') });

  it('a won fight: +20 XP, damage within bounds, full strength when at full Health', () => {
    const r = go('fight', [1]);
    expect(r).toMatchObject({ outcome: 'won', xp: 20, fullStrength: true, ironPaid: 0, heatAdded: 0, cause: null });
    expect(r.healthLoss).toBeGreaterThanOrEqual(0);
    expect(go('fight', [1], 100).fullStrength).toBe(false);
  });

  it('damage bounds: their power × 0.8 ± 20 % less the armour; Health floors at 1 on a win', () => {
    for (let n = 0; n < 500; n++) {
      const r = resolveRunIn({ choice: 'fight', chances, them, iron: 0, healthBefore: 125, healthMax: 125, armour: 4, rng: fixedRng([1]), damageRng: createRng(`d${n}`) });
      expect(r.healthLoss).toBeGreaterThanOrEqual(15 - 4);
      expect(r.healthLoss).toBeLessThanOrEqual(23 - 4);
    }
    expect(go('fight', [1], 5).healthAfter).toBe(1);
  });

  it('a lost fight: Health 0, no XP, the power reason', () => {
    expect(go('fight', [100])).toMatchObject({ outcome: 'lost', healthAfter: 0, healthLoss: 125, xp: 0, cause: 'power' });
  });

  it('Run: away for +10; failed, half a win\'s damage and the fight at −10, in one transaction', () => {
    expect(go('run', [30])).toMatchObject({ outcome: 'ran', xp: 10, steps: [{ row: 'run', chance: 30, roll: 30, ok: true }] });
    const failed = go('run', [31, 19]);
    expect(failed.steps).toEqual([
      { row: 'run', chance: 30, roll: 31, ok: false },
      { row: 'fight', chance: 19, roll: 19, ok: true },
    ]);
    expect(failed).toMatchObject({ outcome: 'won', cause: 'agi', xp: 20 });
    expect(failed.healthLoss).toBeGreaterThan(0);
    expect(go('run', [31, 20])).toMatchObject({ outcome: 'lost', healthAfter: 0 });
  });

  it('Talk: let go for +10; failed, the fight at −10', () => {
    expect(go('talk', [30])).toMatchObject({ outcome: 'talked', xp: 10, healthLoss: 0 });
    expect(go('talk', [31, 20]).steps.map((s) => [s.row, s.chance])).toEqual([
      ['talk', 30],
      ['fight', 19],
    ]);
  });

  it('Pay: the Iron whatever happens; failed, +10 Heat and the fight at full odds', () => {
    expect(go('pay', [90])).toMatchObject({ outcome: 'paid', ironPaid: 60, heatAdded: 0, xp: 0 });
    const failed = go('pay', [91, 29]);
    expect(failed).toMatchObject({ ironPaid: 60, heatAdded: 10, outcome: 'won', cause: 'luck' });
    expect(failed.steps.map((s) => [s.row, s.chance])).toEqual([
      ['pay', 90],
      ['fight', 29],
    ]);
    expect(() => go('pay', [1], 125, 59)).toThrow(/60 Iron/);
    expect(() =>
      resolveRunIn({ choice: 'pay', chances: { ...chances, pay: null }, them: tier2('branch-inspector'), iron: 999, healthBefore: 125, healthMax: 125, armour: 4, rng: fixedRng([1]) }),
    ).toThrow(/won't be bought/);
  });
});

describe('the caught check (design §7.1, §15.3, economy §19.4)', () => {
  const chance = (heatAfter: number, over: Partial<Parameters<typeof caughtChance>[0]> = {}) =>
    caughtChance({ base: 10, rivalGround: false, heatAfter, record: 'clean', agi: 5, ...over });
  it('design §15.3: Heat 56, AGI 5 → 10 + 28 + 15 − 2 = 51', () => {
    expect(chance(56)).toBe(51);
  });
  it("economy §19.4's three: 8, 16, 33", () => {
    expect([chance(0), chance(16), chance(40)]).toEqual([8, 16, 33]);
  });
  it('kept 2–95; rival ground doubles the base; a Repeat offender +5', () => {
    expect(chance(0, { agi: 40 })).toBe(2);
    expect(chance(100, { base: 20, rivalGround: true, record: 'notorious' })).toBe(95);
    expect(chance(0, { rivalGround: true })).toBe(18);
    expect(chance(0, { record: 'repeat' })).toBe(13);
  });
  const check = (over: Partial<Parameters<typeof caughtCheck>[0]>) =>
    caughtCheck({ type: 'disruption', outcome: 'partial', street: 'none', heatAfter: 30, record: 'clean', agi: 5, rivalGround: false, rng: fixedRng([1]), ...over });
  it('none on a Success, after a loss or a Run, or on a legal type', () => {
    expect(check({ outcome: 'success' }).checked).toBe(false);
    expect(check({ street: 'lost' }).checked).toBe(false);
    expect(check({ street: 'ran' }).checked).toBe(false);
    expect(check({ type: 'surveillance' }).checked).toBe(false);
    expect(check({ type: 'speech' }).checked).toBe(false);
    expect(check({ street: 'paid' }).checked).toBe(true);
  });
  it('Cool or Noticed: the name taken; Hot: the cells; Wanted and a Failure: the cells without a roll', () => {
    expect(check({ heatAfter: 30 })).toMatchObject({ caught: true, arrest: false, withoutRoll: false });
    expect(check({ heatAfter: 56 })).toMatchObject({ caught: true, arrest: true });
    expect(check({ heatAfter: 80, outcome: 'failure', rng: fixedRng([]) })).toMatchObject({ caught: true, arrest: true, withoutRoll: true, roll: null });
    expect(check({ heatAfter: 30, rng: fixedRng([100]) })).toMatchObject({ checked: true, caught: false, arrest: false });
    expect(check({ heatAfter: 30, rng: fixedRng([100]), force: 'always' }).caught).toBe(true);
  });
});

describe('the cells and the infirmary (design §8.2, §9.2)', () => {
  // Review 4 #20 (GDD §19.2, ADR 0078): 20 + Heat ÷ 2 (was 10 +).
  it('sentences: 20 at Heat 0; 49 at Heat 58; 60 at 80; 60 on rival ground; never over 60', () => {
    expect(sentenceMinutes(0, false)).toBe(20);
    expect(sentenceMinutes(58, false)).toBe(49);
    expect(sentenceMinutes(80, false)).toBe(60);
    expect(sentenceMinutes(58, true)).toBe(60);
    expect(sentenceMinutes(100, false)).toBe(60);
    expect(sentenceMinutes(100, true)).toBe(60);
  });
  it("bail: 100, 200, 800, 1,600, 800; The Cells Are Full halves it", () => {
    const b = (marks: number, over: Partial<Parameters<typeof bailFor>[0]> = {}) =>
      bailFor({ marks, notorious: marks >= 6, rivalGround: false, alliance: false, ...over }).total;
    expect([b(0), b(2), b(6), b(6, { rivalGround: true }), b(6, { rivalGround: true, alliance: true })]).toEqual([
      100, 200, 800, 1_600, 800,
    ]);
    expect(b(2, { sources: [{ id: 'issue.cells-full', label: 'The Cells Are Full', pct: -50 }] })).toBe(100);
    expect(b(1)).toBe(150);
    expect(bailFor({ marks: 1, notorious: false, rivalGround: false, alliance: true }).lines).toEqual([
      { id: 'legalAid', label: 'Legal Aid', pct: -50 },
    ]);
    expect(b(1, { alliance: true })).toBe(80);
  });
  const T = Date.UTC(2026, 9, 3, 14);
  it('release: Heat 25 at `until`; discharge at half or the current value; deportation times', () => {
    expect(release({ held: { kind: 'cells', rivalGround: false }, at: T, health: { damage: 0, at: T } })).toMatchObject({
      heat: { value: 25, at: T },
      deport: false,
    });
    expect(release({ held: { kind: 'cells', rivalGround: true }, at: T, health: { damage: 0, at: T } }).deport).toBe(true);
    expect(release({ held: { kind: 'infirmary', rivalGround: true }, at: T, health: { damage: 0, at: T } })).toMatchObject({ heat: null, deport: false });
    const energy = { value: 50, rested: 30, updatedAt: T };
    const half = dischargeSelf({ energy, level: 6, health: healthAt(30, 6, T), now: T });
    if (!half.ok) throw new Error('refused');
    expect(healthNow(half.health, T, 6)).toBe(62);
    expect(half.energy).toEqual({ value: 45, rested: 30, updatedAt: T });
    const high = dischargeSelf({ energy, level: 6, health: healthAt(100, 6, T), now: T });
    if (!high.ok) throw new Error('refused');
    expect(healthNow(high.health, T, 6)).toBe(100);
    expect(walkOut({ energy, level: 6, iron: 99, now: T })).toEqual({ ok: false, reason: 'NOT_ENOUGH_IRON' });
    expect(walkOut({ energy: { value: 4, rested: 0, updatedAt: T }, level: 6, iron: 500, now: T })).toEqual({ ok: false, reason: 'NOT_ENOUGH_ENERGY' });
    expect(walkOut({ energy, level: 6, iron: 500, now: T })).toMatchObject({ ok: true, iron: 100, health: { damage: 0, at: T } });
    expect(deportation({ at: T, minutes: 15 })).toEqual({ boardedAt: T, arrivesAt: T + 15 * 60_000, barredUntil: T + 24 * 3_600_000 });
    expect(heldNow({ until: T, state: 'in' }, T - 1)).toBe('in');
    expect(heldNow({ until: T, state: 'in' }, T)).toBe('out');
  });
});

const T0 = Date.UTC(2026, 9, 3, 9);
const base: MissionInput = {
  mission: {
    id: 'coalport.far-bank.posters',
    type: 'vandalism',
    energy: 10,
    difficulty: 14,
    locationId: 'coalport.far-bank',
    cityId: 'coalport',
    pool: ['street-enforcer', 'city-police'],
  },
  way: { id: 'dark', stats: ['agi'] },
  values: { str: 10, int: 25, agi: 19, cha: 5 },
  energy: { value: 100, rested: 0, updatedAt: T0 },
  now: T0,
  standing: { successes: 0, names: NAMES, cityName: 'Coalport' },
  orders: { day: 20_730, items: [], allDoneAt: null },
  orderTemplates: TEMPLATES,
  homeCityId: 'coalport',
  factionId: 'collective',
  target: 'vanguard',
  heat: { value: 0, at: T0 },
  rateOn: () => 5,
  record: 'clean',
  flags: noFlags,
  opponents: { sideOf, policeId: 'city-police' },
};
const startOf = (over: Partial<MissionInput>): MissionStart => {
  const r = resolveMission({ ...base, ...over }, createRng('finish'));
  if (!r.ok) throw new Error('refused');
  return r.start;
};
const finish = (s: MissionStart, runIn: RunInOutcome | null, opponentSide: 'police' | 'vanguard' | null, caught: CaughtResult | null, over: { marks?: Array<{ day: number; kind: 'minor' | 'moderate' | 'serious'; logId: null }>; arrests?: number[]; alliance?: boolean } = {}) =>
  finishMission({
    start: s,
    runIn,
    opponentSide,
    caught,
    marks: over.marks ?? [],
    arrests: over.arrests ?? [],
    agiQuarters: 0,
    health: { damage: 0, at: T0 },
    level: 6,
    at: T0 + 60_000,
    today: 20_730,
    rateOn: () => 5,
    logId: 'log1',
    bail: { alliance: over.alliance ?? false, sources: [] },
  });
const fight = (rolls: number[], healthBefore = 125, them = tier2('street-enforcer')) =>
  resolveRunIn({ choice: 'fight', chances: runInChances({ power: 17, agi: 5, cha: 5 }, them), them, iron: 500, healthBefore, healthMax: 125, armour: 4, rng: fixedRng(rolls), damageRng: createRng('d') });

describe('finishMission (design §4.6, §7.2, §8.1, §9.2)', () => {
  it('a won fight at full strength pays as rolled with the run-in +20 and +10 % on XP and Party XP', () => {
    const s = startOf({ force: { checkRoll: 1 } });
    const f = finish(s, fight([1]), 'vanguard', null);
    expect(f.stamp).toBe('success');
    expect(f.rewards.xp).toMatchObject({ base: 50, total: 50 + 20 + 5 });
    expect(f.rewards.xp.parts).toEqual([
      { id: 'runIn', label: 'The run-in', amount: 20 },
      { id: 'fullStrength', label: 'Won at full strength', amount: 5 },
    ]);
    expect(f.rewards.fxp.parts).toContainEqual({ id: 'fullStrength', label: 'Won at full strength', amount: 1 });
    expect(f.swing).toBe(0.2);
    expect(f.health?.before).toBe(125);
  });

  it('Pay: paid as rolled, the Iron a part of its own; a failed Pay adds 10 Heat', () => {
    const s = startOf({ force: { checkRoll: 1 } });
    const them = tier2('street-enforcer');
    const chances = runInChances({ power: 17, agi: 5, cha: 5 }, them);
    const paid = resolveRunIn({ choice: 'pay', chances, them, iron: 500, healthBefore: 125, healthMax: 125, armour: 4, rng: fixedRng([1]) });
    const f = finish(s, paid, 'vanguard', null);
    expect(f.rewards.iron).toMatchObject({ base: 40, total: -20 });
    expect(f.rewards.iron.parts).toEqual([{ id: 'paidOff', label: 'Paid off', amount: -60 }]);
    expect(f.heat.after).toBe(6);
    const failed = resolveRunIn({ choice: 'pay', chances, them, iron: 500, healthBefore: 125, healthMax: 125, armour: 4, rng: fixedRng([100, 1]), damageRng: createRng('x') });
    expect(finish(s, failed, 'vanguard', null).heat).toMatchObject({ before: 0, after: 16 });
  });

  it("Run: the dropped twin (Failure's XP) plus the run-in's +10, no opinion, no caught check", () => {
    const s = startOf({ force: { checkRoll: 1 } });
    const ran = resolveRunIn({ choice: 'run', chances: { fight: 29, run: 95, talk: 30, pay: 90 }, them: tier2('street-enforcer'), iron: 0, healthBefore: 125, healthMax: 125, armour: 4, rng: fixedRng([1]) });
    const f = finish(s, ran, 'vanguard', null);
    expect(f).toMatchObject({ stamp: 'success', paid: 'dropped', dropped: 'ran', swing: 0 });
    expect([f.rewards.xp.total, f.rewards.fxp.total, f.rewards.iron.total, f.rewards.opinion]).toEqual([10 + 10, 0, 0, 0]);
    expect(f.agility).toEqual({ quarters: 0, gained: false, statUp: false });
    expect(caughtCheck({ type: 'vandalism', outcome: 'failure', street: 'ran', heatAfter: 90, record: 'clean', agi: 5, rivalGround: false, rng: fixedRng([]) }).checked).toBe(false);
  });

  it('a party loss: the infirmary at 30, the small XP, stamp *Taken to the infirmary*', () => {
    const s = startOf({ force: { checkRoll: 1 } });
    const f = finish(s, fight([100]), 'vanguard', null);
    expect(f).toMatchObject({ stamp: 'carriedOff', paid: 'dropped', dropped: 'lost' });
    expect(f.sentTo).toMatchObject({ kind: 'infirmary', reason: 'runInLost', held: { minutes: 20, until: T0 + 60_000 + 20 * 60_000 } });
    expect(f.health?.after).toBe(30);
    expect(f.record.added).toEqual([]);
  });

  // Review 4 #20 (GDD §11.2, ADR 0078): a watch's arrest is one minor mark (was none).
  it("a police loss: the cells with the type's marks (one minor mark for a watch), Health 30", () => {
    const s = startOf({ force: { checkRoll: 1 } });
    const f = finish(s, fight([100], 125, tier2('city-police')), 'police', null);
    expect(f).toMatchObject({ stamp: 'takenIn', sentTo: { kind: 'cells', reason: 'policeLoss' } });
    expect(f.record.added).toEqual([{ day: 20_730, kind: 'minor', logId: 'log1' }]);
    expect(f.record.arrests).toEqual([20_730]);
    expect(f.sentTo?.held.bail?.total).toBe(150);
    expect(f.health?.after).toBe(30);
    const watch = startOf({ mission: { ...base.mission, type: 'surveillance', energy: 12 }, target: null });
    const w = finish(watch, fight([100], 125, tier2('city-police')), 'police', null);
    expect(w.sentTo?.kind).toBe('cells');
    expect(w.record.added).toEqual([{ day: 20_730, kind: 'minor', logId: 'log1' }]);
    expect(w.record.arrests).toEqual([20_730]);
    expect(w.sentTo?.held.bail?.total).toBe(150);
  });

  it('caught while Noticed: the name taken; while Hot: the cells, the sentence by the Heat at the arrest', () => {
    const s = startOf({ force: { checkRoll: 80 }, heat: { value: 24, at: T0 } });
    const name = finish(s, null, null, { checked: true, chance: 30, roll: 1, caught: true, withoutRoll: false, arrest: false });
    expect(name).toMatchObject({ stamp: 'partial', sentTo: null, record: { nameTaken: true, before: 'clean', after: 'onFile' } });
    const hot = startOf({ force: { checkRoll: 99 }, heat: { value: 50, at: T0 } });
    const cells = finish(hot, null, null, { checked: true, chance: 50, roll: 1, caught: true, withoutRoll: false, arrest: true });
    expect(cells.stamp).toBe('takenIn');
    expect(cells.sentTo).toMatchObject({ kind: 'cells', reason: 'caught', held: { minutes: 20 + 28 } });
    // Wanted and a Failure: arrested without a roll.
    const wanted = startOf({ force: { checkRoll: 100 }, heat: { value: 80, at: T0 } });
    expect(finish(wanted, null, null, { checked: true, chance: null, roll: null, caught: true, withoutRoll: true, arrest: true }).sentTo?.reason).toBe('wanted');
  });

  it('a second arrest within seven days: three serious marks, bail on the marks after', () => {
    const hot = startOf({ force: { checkRoll: 99 }, heat: { value: 50, at: T0 } });
    const f = finish(hot, null, null, { checked: true, chance: 50, roll: 1, caught: true, withoutRoll: false, arrest: true }, { marks: [{ day: 20_727, kind: 'minor', logId: null }], arrests: [20_727] });
    expect(f.record).toMatchObject({ escalated: true, after: 'repeat' });
    expect(f.record.added.map((m) => m.kind)).toEqual(['serious', 'serious', 'serious']);
    expect(f.sentTo?.held.bail?.total).toBe(100 + 50 * 4);
    expect(f.record.arrests).toEqual([20_727, 20_730]);
  });
});
