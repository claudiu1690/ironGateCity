/**
 * Slice 5, T2 (docs/tech/slice-5.md §6.5, §6.8, §6.11, §6.13): tier-2 rewards to the unit (design
 * §4.2's table), opinion against a faction (ADR 0034), rival ground as a place state, and the tier-1
 * tap on rival ground (×1 only, the rival row, the Party XP line, opinion against, orders off, the
 * dropped twin).
 */
import { describe, expect, it } from 'vitest';
import {
  MISSION_TYPES,
  addPressure,
  applyAgainst,
  computeRewards,
  createRng,
  placeCheckBonuses,
  pressureOn,
  resolveTier1Action,
  rewardShares,
  rivalGroundOf,
  tier2Rewards,
} from '../src';
import type { MissionType, OpinionShares, OrdersState, PlaceModifiers, Tier1ActionInput } from '../src';
import { NAMES, TEMPLATES } from './helpers';

/** Design §4.2: per mission at the type's Energy, Success / Partial / Failure. */
const TABLE: Record<MissionType, { xp: number[]; fxp: number[]; iron: number[]; opinion: number[] }> = {
  speech: { xp: [75, 38, 15], fxp: [12, 6, 0], iron: [60, 30, 0], opinion: [0.15, 0.075, 0] },
  surveillance: { xp: [60, 30, 12], fxp: [0, 0, 0], iron: [48, 24, 0], opinion: [0, 0, 0] },
  vandalism: { xp: [50, 25, 10], fxp: [8, 4, 0], iron: [40, 20, 0], opinion: [0.2, 0.1, 0] },
  disruption: { xp: [75, 38, 15], fxp: [12, 6, 0], iron: [60, 30, 0], opinion: [0.3, 0.15, 0] },
  sabotage: { xp: [100, 50, 20], fxp: [16, 8, 0], iron: [80, 40, 0], opinion: [0.4, 0.2, 0] },
  theft: { xp: [75, 38, 15], fxp: [12, 6, 0], iron: [120, 60, 0], opinion: [0, 0, 0] },
  // Slice 8 (design §3.7): the society call, at the tier-2 rate with no Party XP (type-only addition).
  social: { xp: [75, 38, 15], fxp: [0, 0, 0], iron: [60, 30, 0], opinion: [0.15, 0.075, 0] },
};
const OUTCOMES = ['success', 'partial', 'failure'] as const;

describe('tier-2 rewards (design §4.2)', () => {
  it('the reward table to the unit, for each type at Success, Partial and Failure', () => {
    for (const type of Object.keys(TABLE) as MissionType[]) {
      const energy = MISSION_TYPES[type].energy;
      OUTCOMES.forEach((outcome, k) => {
        const r = tier2Rewards({ type, energy, outcome, restedUsed: 0 });
        const want = TABLE[type];
        expect([r.xp.total, r.fxp.total, r.iron.total, r.opinion], `${type} ${outcome}`).toEqual([
          want.xp[k],
          want.fxp[k],
          want.iron[k],
          want.opinion[k],
        ]);
      });
    }
  });

  it('with full Rested: +50 % on XP (also a Failure\'s) and Iron, each part rounded on its own', () => {
    const at = (outcome: (typeof OUTCOMES)[number]) =>
      tier2Rewards({ type: 'speech', energy: 15, outcome, restedUsed: 15 });
    expect([at('success').xp, at('success').iron]).toEqual([
      { base: 75, bonus: 38, total: 113, parts: [{ id: 'rested', label: 'Rested', amount: 38 }] },
      { base: 60, bonus: 30, total: 90, parts: [{ id: 'rested', label: 'Rested', amount: 30 }] },
    ]);
    expect(at('partial').xp).toMatchObject({ base: 38, bonus: 19, total: 57 });
    expect(at('failure').xp).toMatchObject({ base: 15, bonus: 8, total: 23 });
    expect(at('failure').iron.total).toBe(0);
    expect(at('failure').fxp.total).toBe(0);
  });

  it("theft's Iron ×2, and the record's −10 %, −20 % and −30 % as parts", () => {
    const theft = tier2Rewards({ type: 'theft', energy: 15, outcome: 'success', restedUsed: 0 });
    expect(theft.iron.total).toBe(120);
    for (const [pct, part] of [
      [-10, -6],
      [-20, -12],
      [-30, -18],
    ] as const) {
      const r = tier2Rewards({ type: 'speech', energy: 15, outcome: 'success', restedUsed: 0, recordIronPct: pct });
      expect(r.iron).toEqual({
        base: 60,
        bonus: part,
        total: 60 + part,
        parts: [{ id: 'record', label: 'Your record', amount: part }],
      });
    }
    // A Partial keeps its floor of 1 on the base; the record part is on the half.
    const p = tier2Rewards({ type: 'vandalism', energy: 10, outcome: 'partial', restedUsed: 0, recordIronPct: -30 });
    expect(p.iron).toMatchObject({ base: 20, bonus: -6, total: 14 });
  });

  it('a tier-1 action is unchanged by the tier-2 machinery', () => {
    const r = computeRewards({ tier: 1, energy: 10, outcome: 'partial', givesFxp: true, givesOpinion: true, restedUsed: 0 });
    expect([r.xp.total, r.fxp.total, r.iron.total, r.opinion]).toEqual([23, 3, 10, 0.025]);
    expect(r.xp.parts).toBeUndefined();
  });
});

const shares = (v: number, c: number, a: number, n: number): OpinionShares => ({
  vanguard: v,
  collective: c,
  alliance: a,
  neutral: n,
});
const sumK = (s: OpinionShares) =>
  Math.round(s.vanguard * 1000) + Math.round(s.collective * 1000) + Math.round(s.alliance * 1000) + Math.round(s.neutral * 1000);

describe('opinion against a faction (ADR 0034 §1, design §11.3)', () => {
  it('0.3 against the Vanguard: Vanguard −0.3, the actor +0.15, Neutral +0.15', () => {
    const r = applyAgainst(shares(70, 10, 5, 15), {
      actor: 'collective',
      target: 'vanguard',
      swing: 0.3,
      homeFactionId: 'vanguard',
    });
    expect(r).toEqual({
      shares: shares(69.7, 10.15, 5, 15.15),
      taken: 0.3,
      toActor: 0.15,
      toNeutral: 0.15,
    });
  });

  it('half rounded down to the thousandth goes to the actor, the rest to Neutral', () => {
    const r = applyAgainst(shares(30, 30, 30, 10), { actor: 'alliance', target: 'vanguard', swing: 0.075 });
    expect([r.toActor, r.toNeutral]).toEqual([0.037, 0.038]);
  });

  it('the floor at 50 for a home faction at home; none for a rival elsewhere', () => {
    const home = applyAgainst(shares(50.1, 20, 10, 19.9), {
      actor: 'collective',
      target: 'vanguard',
      swing: 0.3,
      homeFactionId: 'vanguard',
    });
    expect(home.taken).toBe(0.1);
    expect(home.shares.vanguard).toBe(50);
    const away = applyAgainst(shares(0.2, 50, 30, 19.8), { actor: 'alliance', target: 'vanguard', swing: 0.3 });
    expect(away.taken).toBe(0.2);
  });

  it("the cap's remainder: 1.97 lost today, a 0.05 swing takes 0.03", () => {
    const r = applyAgainst(shares(70, 10, 5, 15), {
      actor: 'alliance',
      target: 'vanguard',
      swing: 0.05,
      homeFactionId: 'vanguard',
      cap: 2 - 1.97,
    });
    expect(r.taken).toBe(0.03);
    expect(applyAgainst(shares(70, 10, 5, 15), { actor: 'alliance', target: 'vanguard', swing: 0.05, cap: 0 }).taken).toBe(0);
  });

  it('the sum stays exactly 100.000 over 5,000 random calls', () => {
    const rng = createRng('against');
    let s = shares(60, 15, 10, 15);
    const factions = ['vanguard', 'collective', 'alliance'] as const;
    for (let n = 0; n < 5_000; n++) {
      const actor = factions[rng.int(0, 2)]!;
      const target = factions.filter((f) => f !== actor)[rng.int(0, 1)]!;
      const r = applyAgainst(s, {
        actor,
        target,
        swing: rng.int(0, 600) / 1000,
        homeFactionId: 'vanguard',
        ...(rng.int(0, 1) === 1 ? { cap: rng.int(0, 2000) / 1000 } : {}),
      });
      s = r.shares;
      expect(sumK(s)).toBe(100_000);
      expect(s.vanguard).toBeGreaterThanOrEqual(0);
      expect(r.toActor + r.toNeutral).toBeCloseTo(r.taken, 9);
    }
  });
});

describe('rival ground as a place state (ADR 0034 §3)', () => {
  it('null at home; the home faction, Unrest and the pressure left elsewhere', () => {
    const today = 100;
    expect(rivalGroundOf({ homeFactionId: 'collective', actor: 'collective', morale: 'steady', pressure: null, today })).toBeNull();
    expect(rivalGroundOf({ homeFactionId: undefined, actor: 'collective', morale: null, pressure: null, today })).toBeNull();
    expect(
      rivalGroundOf({
        homeFactionId: 'vanguard',
        actor: 'collective',
        morale: 'unrest',
        pressure: { day: today, lost: 1_970, prev: null },
        today,
      }),
    ).toEqual({ homeFactionId: 'vanguard', unrest: true, pressureLeft: 0.03 });
    expect(
      rivalGroundOf({ homeFactionId: 'vanguard', actor: 'alliance', morale: 'fired', pressure: { day: 99, lost: 2_000, prev: null }, today })
        ?.pressureLeft,
    ).toBe(2);
  });

  it('the pressure keeps yesterday as prev for the paper', () => {
    const p1 = addPressure(null, 10, 300);
    const p2 = addPressure(p1, 10, 200);
    expect(p2).toEqual({ day: 10, lost: 500, prev: null });
    const p3 = addPressure(p2, 11, 100);
    expect(p3).toEqual({ day: 11, lost: 100, prev: { day: 10, lost: 500 } });
    expect([pressureOn(p3, 10), pressureOn(p3, 11), pressureOn(p3, 9)]).toEqual([500, 100, 0]);
  });

  const rival = (unrest = false): PlaceModifiers => ({
    sources: [],
    firedUp: false,
    place: {
      battleground: false,
      groundswell: null,
      issues: [],
      rivalGround: { homeFactionId: 'vanguard', unrest, pressureLeft: 1.5 },
    },
  });

  it('the +4 is a check row of −16; Party XP +50 % (+75 % in Unrest) as a part of its own', () => {
    expect(placeCheckBonuses('canvass', rival())).toEqual([{ id: 'rivalGround', label: 'Rival ground', value: -16 }]);
    expect(placeCheckBonuses('vandalism', rival())).toEqual([{ id: 'rivalGround', label: 'Rival ground', value: -16 }]);
    expect(rewardShares({ type: 'canvass', givesFxp: true, m: rival() }).fxp).toEqual([
      { id: 'rivalGround', label: 'Rival ground', share: 0.5 },
    ]);
    expect(rewardShares({ type: 'canvass', givesFxp: true, m: rival(true) }).fxp[0]!.share).toBe(0.75);
    expect(rewardShares({ type: 'intelligence', givesFxp: false, m: rival() }).fxp).toEqual([]);
  });
});

describe('a tier-1 tap on rival ground (design §10.5, §11.2)', () => {
  const orders: OrdersState = {
    day: 20_730,
    items: [{ templateId: 'dir.full-day', variant: 'main', target: 6, progress: 0, doneAt: null }],
    allDoneAt: null,
  };
  const input = (m: PlaceModifiers, times: 1 | 3 = 1): Tier1ActionInput => ({
    action: {
      id: 'duskwall.customs-market.canvass',
      type: 'canvass',
      locationId: 'duskwall.customs-market',
      cityId: 'duskwall',
      energy: 10,
      stats: ['int'],
      givesFxp: true,
      givesOpinion: true,
      locationKind: 'market',
    },
    cityRole: 'home',
    values: { str: 10, int: 25, agi: 5, cha: 5 },
    energy: { value: 100, rested: 0, updatedAt: 0 },
    now: 1_000,
    times,
    standing: { successes: 0, names: NAMES, cityName: 'Duskwall' },
    orders,
    orderTemplates: TEMPLATES,
    homeCityId: 'coalport',
    factionId: 'collective',
    modifiers: m,
  });
  const rival: PlaceModifiers = {
    sources: [],
    firedUp: false,
    place: {
      battleground: false,
      groundswell: null,
      issues: [],
      rivalGround: { homeFactionId: 'vanguard', unrest: false, pressureLeft: 1.25 },
    },
  };

  it('×3 is refused: ONCE_ON_RIVAL_GROUND', () => {
    const r = resolveTier1Action(input(rival, 3), createRng('x3'));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('ONCE_ON_RIVAL_GROUND');
  });

  it('difficulty 12 in effect (95 % at INT 25 still clamps; 42 % at 10), the FXP part and opinion against', () => {
    const r = resolveTier1Action(input(rival), createRng('tap'));
    if (!r.ok) throw new Error('refused');
    const a = r.resolution.attempts[0]!;
    expect(a.check.bonuses).toEqual([{ id: 'rivalGround', label: 'Rival ground', value: -16 }]);
    expect(a.check.chance).toBe(95);
    const weak = resolveTier1Action({ ...input(rival), values: { str: 10, int: 10, agi: 5, cha: 5 } }, createRng('tap'));
    if (!weak.ok) throw new Error('refused');
    expect(weak.resolution.attempts[0]!.check.chance).toBe(42);
    expect(r.resolution.opinion).toEqual({ mode: 'against', target: 'vanguard', cap: 1.25 });
    expect(a.rewards.fxp.parts).toEqual([{ id: 'rivalGround', label: 'Rival ground', amount: a.outcome === 'success' ? 3 : 2 }]);
    // Orders cannot be done on rival ground: *A full day* does not move.
    expect(r.resolution.orders.after).toEqual(orders);
    expect(a.orderId).toBeNull();
  });

  it('the dropped twin: the same rolls, every row a Partial', () => {
    const rolled = resolveTier1Action(input(rival), createRng('twin'));
    const twin = resolveTier1Action({ ...input(rival), forceOutcome: 'partial' }, createRng('twin'));
    if (!rolled.ok || !twin.ok) throw new Error('refused');
    expect(twin.resolution.attempts[0]!.roll).toBe(rolled.resolution.attempts[0]!.roll);
    expect(twin.resolution.attempts[0]!.outcome).toBe('partial');
    expect(twin.resolution.rewards.xp.total).toBe(23);
  });

  it('at home nothing changes: no row, no opinion mode, orders advance', () => {
    const home: PlaceModifiers = { sources: [], firedUp: false, place: { battleground: false, groundswell: null, issues: [] } };
    const r = resolveTier1Action({ ...input(home, 3), action: { ...input(home).action, cityId: 'coalport' } }, createRng('home'));
    if (!r.ok) throw new Error('refused');
    expect(r.resolution.opinion).toBeUndefined();
    expect(r.resolution.attempts[0]!.check.bonuses).toEqual([]);
  });
});
