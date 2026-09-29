/**
 * QA (slices 0–1): the rules checked number by number against the GDD, independent of the
 * developer's own tests. Every expectation cites the GDD section or design answer it comes from.
 */
import { describe, expect, it } from 'vitest';
import {
  CHECK,
  DIRECTIVES,
  JOBS,
  LEVEL_XP_THRESHOLDS,
  RANK_FXP,
  applyGains,
  applyPersuasion,
  computeCheck,
  computeRewards,
  createRng,
  dayKey,
  emptyTally,
  halfPay,
  isNight,
  jobPay,
  levelForXp,
  ordersForDay,
  outcomeForRoll,
  projectEnergy,
  rankForFxp,
  resolveShift,
  resolveTier1Action,
  resolveTraining,
  roundHalfUp,
  settleDays,
  shiftPay,
  standingView,
  startOrders,
  trainingCost,
  usesSuccessText,
  weekday,
  xpForLevel,
} from '../src';
import type { EnergyState, JobState, OrdersState, SickDays, Stats, Tier1ActionInput } from '../src';
import { NAMES, TEMPLATES, fixedRng } from './helpers';

const RECRUIT: Stats = { str: 10, int: 12, agi: 5, cha: 2 };
const T0 = Date.UTC(2026, 8, 29, 9, 0, 0); // Tuesday 29 September 2026, 09:00 UTC
const NO_ORDERS: OrdersState = { day: 0, items: [], allDoneAt: null };

const tier1 = (over: Partial<Tier1ActionInput> = {}): Tier1ActionInput => ({
  action: {
    id: 'coalport.mill-gate.canvass',
    type: 'canvass',
    locationId: 'coalport.mill-gate',
    cityId: 'coalport',
    energy: 10,
    stats: ['int'],
    givesFxp: true,
    givesOpinion: true,
  },
  cityRole: 'home',
  values: RECRUIT,
  energy: { value: 100, rested: 0, updatedAt: T0 },
  now: T0,
  times: 1,
  standing: { successes: 0, names: NAMES, cityName: 'Coalport' },
  orders: NO_ORDERS,
  orderTemplates: TEMPLATES,
  homeCityId: 'coalport',
  ...over,
});

function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error(`expected ok, got ${JSON.stringify(r)}`);
  return r as Extract<T, { ok: true }>;
}

// ---------------------------------------------------------------------------------------------
// §8.4 — the check
// ---------------------------------------------------------------------------------------------
describe('§8.4 check formula, clamp and outcome bands', () => {
  it('chance = clamp(50 + 4 × (stat − difficulty) + bonuses, 5, 95) for every stat 0..60, difficulty 8/10/14/22, bonus −10..+12', () => {
    for (const difficulty of [8, 10, 14, 22]) {
      for (let stat = 0; stat <= 60; stat++) {
        for (const bonus of [-10, 0, 3, 6, 12]) {
          const b = computeCheck({
            stats: ['int'],
            values: { ...RECRUIT, int: stat },
            difficulty,
            bonuses: bonus ? [{ id: 'x', label: 'x', value: bonus }] : [],
          });
          const raw = 50 + 4 * (stat - difficulty) + bonus;
          expect(b.raw).toBe(raw);
          expect(b.chance).toBe(Math.min(95, Math.max(5, raw)));
          expect(Number.isInteger(b.chance)).toBe(true);
        }
      }
    }
  });

  it('bonuses are added before the clamp (a 5 % base + 12 % Standing is 17 %, not 5 %)', () => {
    const b = computeCheck({
      stats: ['agi'],
      values: { ...RECRUIT, agi: 0 },
      difficulty: 10,
      bonuses: [{ id: 'standing', label: 'One of Us in Coalport', value: 12 }],
    });
    expect(b.raw).toBe(50 - 40 + 12);
    expect(b.chance).toBe(22);
  });

  it('two-stat checks average the stats, and every half-point average still gives a whole chance', () => {
    for (let a = 0; a <= 30; a++) {
      for (let c = 0; c <= 30; c++) {
        const b = computeCheck({
          stats: ['cha', 'int'],
          values: { ...RECRUIT, cha: a, int: c },
          difficulty: 8,
        });
        expect(b.statValue).toBe((a + c) / 2);
        expect(Number.isInteger(b.chance)).toBe(true);
        expect(b.statValues).toEqual([a, c]);
      }
    }
    // (3 + 12) / 2 = 7.5 → 50 + 4 × −0.5 = 48 %
    expect(
      computeCheck({ stats: ['cha', 'int'], values: { ...RECRUIT, cha: 3 }, difficulty: 8 }).chance,
    ).toBe(48);
  });

  it('roll ≤ chance is a Success, up to chance + 20 a Partial, beyond that Partial (tier 1) / Failure (tiers 2–3), over every roll and chance', () => {
    for (let chance = CHECK.min; chance <= CHECK.max; chance++) {
      for (let roll = 1; roll <= 100; roll++) {
        const expected = roll <= chance ? 'success' : roll <= chance + 20 ? 'partial' : 'failure';
        expect(outcomeForRoll(roll, chance, 1)).toBe(expected === 'failure' ? 'partial' : expected);
        expect(outcomeForRoll(roll, chance, 2)).toBe(expected);
      }
    }
    // The §8.4 prose: "A shown 72 % succeeds on rolls 1–72: exactly 72 times in 100."
    let wins = 0;
    for (let roll = 1; roll <= 100; roll++) if (outcomeForRoll(roll, 72, 1) === 'success') wins++;
    expect(wins).toBe(72);
  });

  it('the Standing bonus enters the odds of each row (Known +6 → 72 %, One of Us +12 → 78 %), labelled by level and city', () => {
    const known = ok(
      resolveTier1Action(
        tier1({ standing: { successes: 30, names: NAMES, cityName: 'Coalport' } }),
        fixedRng([100]),
      ),
    );
    expect(known.resolution.attempts[0]!.check.chance).toBe(72);
    expect(known.resolution.attempts[0]!.check.bonuses).toEqual([
      { id: 'standing', label: 'Known in Coalport', value: 6 },
    ]);
    const ofUs = ok(
      resolveTier1Action(
        tier1({ standing: { successes: 150, names: NAMES, cityName: 'Coalport' } }),
        fixedRng([100]),
      ),
    );
    expect(ofUs.resolution.attempts[0]!.check.chance).toBe(78);
    expect(ofUs.resolution.attempts[0]!.check.bonuses[0]!.label).toBe('One of Us in Coalport');
    const stranger = ok(
      resolveTier1Action(
        tier1({ standing: { successes: 9, names: NAMES, cityName: 'Coalport' } }),
        fixedRng([100]),
      ),
    );
    expect(stranger.resolution.attempts[0]!.check.bonuses).toEqual([]);
  });

  it('a ×3 crossing a Standing threshold mid-run: rows 1–2 at 66 %, row 3 at 69 % (9 → 10 → Familiar)', () => {
    const r = ok(
      resolveTier1Action(
        tier1({ times: 3, standing: { successes: 8, names: NAMES, cityName: 'Coalport' } }),
        fixedRng([1, 1, 1]),
      ),
    );
    expect(r.resolution.attempts.map((a) => a.check.chance)).toEqual([66, 66, 69]);
    expect(r.resolution.standing).toEqual({ before: 8, after: 11 });
  });

  it('Partials never count for Standing', () => {
    const r = ok(resolveTier1Action(tier1({ times: 3 }), fixedRng([67, 90, 100])));
    expect(r.resolution.attempts.map((a) => a.outcome)).toEqual(['partial', 'partial', 'partial']);
    expect(r.resolution.standing.after).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
// §5.5, §6.3 — rewards
// ---------------------------------------------------------------------------------------------
describe('§5.5 rewards: half up per line, base and bonus apart, ≥ 1 on a Partial; §6.3 Rested proportional', () => {
  const rewards = (energy: number, outcome: 'success' | 'partial', restedUsed = 0, extra = {}) =>
    computeRewards({ tier: 1, energy, outcome, givesFxp: true, givesOpinion: true, restedUsed, ...extra });

  it('matches the economy sheet §1 per-action table for every tier-1 Energy cost', () => {
    const table: Array<[number, [number, number], [number, number], [number, number], [number, number]]> = [
      // energy, XP S/P, FXP S/P, Iron S/P, opinion S/P
      [3, [14, 7], [2, 1], [6, 3], [0.015, 0.008]],
      [4, [18, 9], [2, 1], [8, 4], [0.02, 0.01]],
      [8, [36, 18], [5, 2], [16, 8], [0.04, 0.02]],
      [10, [45, 23], [6, 3], [20, 10], [0.05, 0.025]],
      [12, [54, 27], [7, 4], [24, 12], [0.06, 0.03]],
    ];
    for (const [e, xp, fxp, iron, op] of table) {
      const s = rewards(e, 'success');
      const p = rewards(e, 'partial');
      expect([s.xp.total, p.xp.total], `XP at ${e}`).toEqual(xp);
      expect([s.fxp.total, p.fxp.total], `FXP at ${e}`).toEqual(fxp);
      expect([s.iron.total, p.iron.total], `Iron at ${e}`).toEqual(iron);
      expect([s.opinion, p.opinion], `opinion at ${e}`).toEqual(op);
    }
  });

  it('council (×1.5 FXP): 10 Energy → 9 / 5 FXP, no opinion', () => {
    const s = computeRewards({
      tier: 1,
      energy: 10,
      outcome: 'success',
      givesFxp: true,
      givesOpinion: false,
      restedUsed: 0,
      fxpRateMultiplier: 1.5,
    });
    const p = computeRewards({
      tier: 1,
      energy: 10,
      outcome: 'partial',
      givesFxp: true,
      givesOpinion: false,
      restedUsed: 0,
      fxpRateMultiplier: 1.5,
    });
    expect([s.fxp.total, p.fxp.total]).toEqual([9, 5]); // 9 and 4.5 → 5
    expect([s.opinion, p.opinion]).toEqual([0, 0]);
  });

  it('a paying line never pays less than 1 on a Partial (1 Energy: FXP 0.6 → 1 / 0.3 → 1)', () => {
    const p = rewards(1, 'partial');
    expect(p.fxp.base).toBe(1);
    expect(p.xp.base).toBe(2); // 2.25 → 2
    expect(p.iron.base).toBe(1);
  });

  it('Rested is proportional per Energy point and rounded as its own bonus: every restedUsed 0..10 on a 10-Energy canvass', () => {
    for (let r = 0; r <= 10; r++) {
      const s = rewards(10, 'success', r);
      expect(s.xp.base).toBe(45);
      expect(s.xp.bonus).toBe(roundHalfUp(45 * 0.5 * (r / 10)));
      expect(s.iron.bonus).toBe(roundHalfUp(20 * 0.5 * (r / 10)));
      expect(s.xp.total).toBe(s.xp.base + s.xp.bonus);
      expect(s.fxp.bonus).toBe(0); // §6.3: FXP never gets Rested
      const p = rewards(10, 'partial', r);
      expect(p.xp.base).toBe(23);
      expect(p.xp.bonus).toBe(roundHalfUp(22.5 * 0.5 * (r / 10)));
    }
    // GDD §6.3 example: 3 Rested on a 10-Energy action = +15 %: 6.75 → 7 XP, 3 Iron
    expect(rewards(10, 'success', 3).xp.bonus).toBe(7);
    expect(rewards(10, 'success', 3).iron.bonus).toBe(3);
  });

  it('the Party-order bonus is +25 % of the base FXP, rounded on its own, never on XP / Iron / opinion', () => {
    const s = rewards(10, 'success', 10, { fxpBonusShare: DIRECTIVES.matchFxpBonus });
    expect(s.fxp).toEqual({ base: 6, bonus: 2, total: 8 }); // 1.5 → 2
    expect(s.xp).toEqual({ base: 45, bonus: 23, total: 68 }); // Rested only
    expect(s.opinion).toBe(0.05);
    const council = computeRewards({
      tier: 1,
      energy: 10,
      outcome: 'partial',
      givesFxp: true,
      givesOpinion: false,
      restedUsed: 0,
      fxpRateMultiplier: 1.5,
      fxpBonusShare: 0.25,
    });
    expect(council.fxp).toEqual({ base: 5, bonus: 1, total: 6 }); // 4.5 → 5, 1.125 → 1
  });
});

// ---------------------------------------------------------------------------------------------
// §5.3 levels, §5.4 rank, §6.5 PC
// ---------------------------------------------------------------------------------------------
describe('§5.3 levels and §5.4 rank', () => {
  const GDD_TABLE = [
    0, 150, 450, 900, 1600, 2500, 3500, 4650, 5950, 7400, 9000, 10800, 12800, 15000, 17400, 20000, 22800,
    25900, 29300, 33000, 37000, 41400, 46200, 51400, 57000, 63000, 69400, 76300, 83700, 91600, 100000, 109300,
    119200, 129700, 140800, 152500, 164800, 177700, 191200, 205300, 220000, 235300, 251200, 267700, 284800,
    302500, 320800, 339700, 359200, 379300, 400000,
  ];

  it('the table equals the GDD §5.3 table, and each threshold is exact (XP − 1 is the level below)', () => {
    expect([...LEVEL_XP_THRESHOLDS]).toEqual(GDD_TABLE);
    GDD_TABLE.forEach((xp, i) => {
      expect(xpForLevel(i + 1)).toBe(xp);
      expect(levelForXp(xp)).toBe(i + 1);
      if (xp > 0) expect(levelForXp(xp - 1)).toBe(i);
    });
    // "Level 51 → 52 costs 21,300", then +600 per level with no cap
    expect(xpForLevel(52) - xpForLevel(51)).toBe(21_300);
    expect(xpForLevel(53) - xpForLevel(52)).toBe(21_900);
  });

  it('multi-level: 0 → 1,600 XP in one gain is Level 5 and 4 stat points; the next gain from 1,599 → 1,600 is 1 point', () => {
    const p = { xp: 0, level: 1, fxp: 0, rank: 1, pc: 0, statPointsPending: 0 };
    const g = applyGains(p, { xp: 1_600, fxp: 0, pc: 0 });
    expect(g.levelUp).toEqual({ from: 1, to: 5, statPoints: 4 });
    expect(g.next.statPointsPending).toBe(4);
    const h = applyGains({ ...p, xp: 1_599, level: 4, statPointsPending: 2 }, { xp: 1, fxp: 0, pc: 0 });
    expect(h.levelUp).toEqual({ from: 4, to: 5, statPoints: 1 });
    expect(h.next.statPointsPending).toBe(3); // pending points never expire
  });

  it('Rank 2 at 400 FXP (lowered from 500), then 2,000 / 6,000 / 15,000 / 25,000 / 60,000', () => {
    expect([...RANK_FXP]).toEqual([0, 400, 2_000, 6_000, 15_000, 25_000, 60_000]);
    expect(rankForFxp(399)).toBe(1);
    expect(rankForFxp(400)).toBe(2);
    expect(rankForFxp(1_999)).toBe(2);
    expect(rankForFxp(2_000)).toBe(3);
    expect(rankForFxp(59_999)).toBe(6);
    expect(rankForFxp(60_000)).toBe(7);
    expect(rankForFxp(10_000_000)).toBe(7);
  });

  it('PC is capped at 1,000 and never decays (§6.5)', () => {
    const p = { xp: 0, level: 1, fxp: 0, rank: 1, pc: 998, statPointsPending: 0 };
    expect(applyGains(p, { xp: 0, fxp: 0, pc: 5 }).next.pc).toBe(1_000);
    expect(applyGains({ ...p, pc: 1_000 }, { xp: 0, fxp: 0, pc: 5 }).next.pc).toBe(1_000);
  });
});

// ---------------------------------------------------------------------------------------------
// §8.5 training
// ---------------------------------------------------------------------------------------------
// m4 (fix round 1): the designer removed ×3 training (content §13.2, GDD §8.5): training is ×1 only.
describe('§8.5 training: 20 + 2 × stat, half-rate XP, ×1 only (m4)', () => {
  it('costs 20 + 2 × current stat (the GDD examples: 15 → 50, 30 → 80, 60 → 140)', () => {
    for (let s = 0; s <= 100; s++) expect(trainingCost(s)).toBe(20 + 2 * s);
    expect([trainingCost(15), trainingCost(30), trainingCost(60)]).toEqual([50, 80, 140]);
    // The cost rises per point trained: INT 12, 13, 14 → 44, 46, 48; AGI 5, 6, 7 → 30, 32, 34.
    expect([trainingCost(12), trainingCost(13), trainingCost(14)]).toEqual([44, 46, 48]);
    expect([trainingCost(5), trainingCost(6), trainingCost(7)]).toEqual([30, 32, 34]);
  });

  it('XP = 2.25 per Energy, halves up: INT 44 → 99, AGI 30 → 68, STR 40 → 90 (economy §1)', () => {
    const run = (trains: 'int' | 'agi' | 'str') =>
      ok(
        resolveTraining({
          trains,
          base: { str: 10, int: 12, agi: 5 },
          energy: { value: 100, rested: 0, updatedAt: T0 },
          now: T0,
          orders: NO_ORDERS,
          orderTemplates: TEMPLATES,
          homeCityId: 'coalport',
          descriptor: { kind: 'training' },
        }),
      ).resolution;
    expect([run('int').xp.total, run('agi').xp.total, run('str').xp.total]).toEqual([99, 68, 90]);
    expect(run('agi').stat).toEqual({ stat: 'agi', before: 5, after: 6 });
  });

  it('×1 short by one Energy is refused and spends nothing; exactly enough spends to 0; one point per tap', () => {
    const base = { str: 10, int: 12, agi: 5 };
    const common = {
      trains: 'int' as const,
      base,
      now: T0,
      orders: NO_ORDERS,
      orderTemplates: TEMPLATES,
      homeCityId: 'coalport',
      descriptor: { kind: 'training' as const },
    };
    const short = resolveTraining({ ...common, energy: { value: 43, rested: 0, updatedAt: T0 } });
    expect(short).toMatchObject({ ok: false, reason: 'NOT_ENOUGH_ENERGY', cost: 44, shortBy: 1 });
    const exact = ok(resolveTraining({ ...common, energy: { value: 44, rested: 0, updatedAt: T0 } }));
    expect(exact.resolution.energy.after.value).toBe(0);
    // A full bar trains exactly one point: there is no batch to be unreachable any more (m4).
    const full = ok(resolveTraining({ ...common, energy: { value: 100, rested: 200, updatedAt: T0 } }));
    expect(full.resolution.rows).toHaveLength(1);
    expect(full.resolution.stat).toEqual({ stat: 'int', before: 12, after: 13 });
    expect(full.resolution.energy.after.value).toBe(56);
  });
});

// ---------------------------------------------------------------------------------------------
// §14.2 opinion
// ---------------------------------------------------------------------------------------------
describe('§14.2 persuasion: Neutral first, floors 5 % and 50 %, three decimals, sum 100', () => {
  const COALPORT = { vanguard: 9, collective: 70, alliance: 6, neutral: 15 };
  const sumK = (s: typeof COALPORT) =>
    Math.round((s.vanguard + s.collective + s.alliance + s.neutral) * 1000);

  it('200 canvasses: Neutral drains to 5.000 first, then the rivals 9 : 6, the Collective reaches exactly 95 and stops', () => {
    let s = { ...COALPORT };
    let neutralHitFloorAt = -1;
    for (let i = 1; i <= 1000; i++) {
      const r = applyPersuasion(s, { factionId: 'collective', swing: 0.05, homeFactionId: 'collective' });
      if (s.neutral > 5) expect(s.vanguard).toBe(COALPORT.vanguard); // rivals untouched while Neutral is above its floor
      s = r.shares;
      if (neutralHitFloorAt < 0 && s.neutral === 5) neutralHitFloorAt = i;
      expect(sumK(s)).toBe(100_000);
      expect(s.neutral).toBeGreaterThanOrEqual(5);
    }
    expect(neutralHitFloorAt).toBe(200); // 10 points / 0.05
    expect(s).toEqual({ vanguard: 0, collective: 95, alliance: 0, neutral: 5 });
  });

  it('a rival persuading in Coalport: Neutral first, then the Collective (floor 50) and the other rival', () => {
    let s = { vanguard: 9, collective: 50.02, alliance: 35.98, neutral: 5 };
    const r = applyPersuasion(s, { factionId: 'vanguard', swing: 0.05, homeFactionId: 'collective' });
    expect(r.shares.collective).toBeGreaterThanOrEqual(50);
    expect(sumK(r.shares)).toBe(100_000);
    expect(r.applied).toBe(0.05);
    s = { vanguard: 44, collective: 50, alliance: 1, neutral: 5 };
    const r2 = applyPersuasion(s, { factionId: 'vanguard', swing: 5, homeFactionId: 'collective' });
    expect(r2.applied).toBe(1); // only the Alliance's 1 point can be drawn; the swing shrinks
    expect(r2.shares).toEqual({ vanguard: 45, collective: 50, alliance: 0, neutral: 5 });
  });
});

// ---------------------------------------------------------------------------------------------
// §9 jobs, pay and the lazy City Day
// ---------------------------------------------------------------------------------------------
describe('§9 jobs: pay, the shift and the streak', () => {
  it('job pay (§9.2 pinned): vendor 100, factory 180 (216 Collective), driver 200; half pay 50 / 108 / 100', () => {
    const factory = { dailyPay: 180, factionPayBonus: { collective: 0.2 } };
    expect(jobPay(factory, 'collective')).toBe(216);
    expect(jobPay(factory, 'vanguard')).toBe(180);
    expect(jobPay({ dailyPay: 100 }, 'collective')).toBe(100);
    expect([halfPay(100), halfPay(216), halfPay(200), halfPay(180)]).toEqual([50, 108, 100, 90]);
  });

  it('streak bonus = 2 % × min(streak, 10) of daily pay, for streaks 0..14 at every pinned pay', () => {
    for (const pay of [100, 180, 200, 216]) {
      for (let s = 0; s <= 14; s++) {
        const r = shiftPay(pay, s);
        expect(r.half).toBe(roundHalfUp(pay / 2));
        expect(r.bonus).toBe(roundHalfUp((pay * 2 * Math.min(s, 10)) / 100));
        expect(r.total).toBe(r.half + r.bonus);
      }
    }
    expect(shiftPay(216, 1).total).toBe(112);
    expect(shiftPay(216, 10).total).toBe(151); // economy §5.1: "108–151 Iron"
  });

  it('a shift never touches Rested and pays no XP / FXP; one shift per day even with Rested full', () => {
    const job: JobState = { id: 'factory-worker', since: 0, streak: 3, lastShiftDay: null };
    const today = dayKey(T0);
    const r = ok(
      resolveShift({
        job,
        today,
        pay: 216,
        shiftEnergy: 4,
        energy: { value: 100, rested: 200, updatedAt: T0 },
        now: T0,
        orders: NO_ORDERS,
        orderTemplates: TEMPLATES,
        homeCityId: 'coalport',
        descriptor: { kind: 'shift' },
      }),
    ).resolution;
    expect(r.energy.after).toMatchObject({ value: 96, rested: 200 });
    expect(r.pay).toEqual({ half: 108, bonus: 17, pct: 0.08, total: 125 }); // streak 4: 17.28 → 17
    const again = resolveShift({
      job: r.job,
      today,
      pay: 216,
      shiftEnergy: 4,
      energy: r.energy.after,
      now: T0,
      orders: NO_ORDERS,
      orderTemplates: TEMPLATES,
      homeCityId: 'coalport',
      descriptor: { kind: 'shift' },
    });
    expect(again).toEqual({ ok: false, reason: 'SHIFT_ALREADY_WORKED' });
  });
});

describe('ADR 0005 settleDays: sick days, the Monday refill, the 14 half-pay cap', () => {
  const MON = dayKey(Date.UTC(2026, 8, 28)); // Monday 28 September 2026
  const energy: EnergyState = { value: 100, rested: 0, updatedAt: Date.UTC(2026, 8, 20) };
  const settle = (settled: number, today: number, job: JobState | null, sick: SickDays) =>
    settleDays({
      settled,
      today,
      job,
      pay: job ? 216 : null,
      sickDays: sick,
      tally: emptyTally(settled),
      energy,
      now: today * 86_400_000 + 3_600_000,
    })!;

  it('the calendar: 28 Sep 2026 is a Monday and 29 Sep a Tuesday (the paper dateline example)', () => {
    expect(weekday(MON)).toBe(0);
    expect(weekday(MON + 1)).toBe(1);
  });

  it('Sunday is judged before the Monday refill: the third miss on a Sunday ends the streak even though Monday refills', () => {
    const SAT = MON + 5;
    const SUN = MON + 6;
    const job: JobState = { id: 'factory-worker', since: MON - 7, streak: 4, lastShiftDay: SAT };
    // Thursday and Friday were missed: no sick days left this week.
    const s = settle(SAT, SUN + 1, job, { week: Math.floor((MON + 3) / 7), left: 0 });
    expect(s.streak).toEqual({ before: 4, after: 0, sickDaysUsed: 0, broken: true });
    expect(s.sickDays.left).toBe(2); // refilled for the new week after the judgement
  });

  it('with one sick day left, a missed Sunday uses it and the refill then restores 2 for Monday', () => {
    const SUN = MON + 6;
    const job: JobState = { id: 'factory-worker', since: MON - 7, streak: 4, lastShiftDay: SUN - 1 };
    const s = settle(SUN - 1, SUN + 1, job, { week: Math.floor((MON + 3) / 7), left: 1 });
    expect(s.streak).toMatchObject({ after: 4, sickDaysUsed: 1, broken: false });
    expect(s.sickDays.left).toBe(2);
  });

  it('no sick day is spent while the streak is 0 (job just taken), whatever the weekday', () => {
    const job: JobState = { id: 'factory-worker', since: MON, streak: 0, lastShiftDay: null };
    const s = settle(MON, MON + 3, job, { week: Math.floor((MON + 3) / 7), left: 2 });
    expect(s.streak).toEqual({ before: 0, after: 0, sickDaysUsed: 0, broken: false });
    expect(s.sickDays.left).toBe(2);
    expect(s.salary).toEqual({ days: 3, perDay: 108, total: 324 });
  });

  it('salary: vendor 50, driver 100 per boundary; capped at 14 per return; nothing without a job', () => {
    const vendor = settleDays({
      settled: MON,
      today: MON + 2,
      job: { id: 'street-vendor', since: MON, streak: 0, lastShiftDay: null },
      pay: 100,
      sickDays: { week: 0, left: 2 },
      tally: emptyTally(MON),
      energy,
      now: 0,
    })!;
    expect(vendor.salary).toEqual({ days: 2, perDay: 50, total: 100 });
    const away = settleDays({
      settled: MON,
      today: MON + 40,
      job: { id: 'driver', since: MON, streak: 0, lastShiftDay: null },
      pay: 200,
      sickDays: { week: 0, left: 2 },
      tally: emptyTally(MON),
      energy,
      now: 0,
    })!;
    expect(away.salary).toEqual({ days: 14, perDay: 100, total: 1_400 });
    expect(away.job?.id).toBe('driver'); // §9.1: never fired for being away
    expect(settle(MON, MON + 5, null, { week: 0, left: 2 }).salary).toBeNull();
    expect(JOBS.salaryMaxDays).toBe(14);
  });

  it('lazy = eager: settling a gap in one go equals settling it day by day (random schedules, 400 runs)', () => {
    const rng = createRng('qa-settle');
    for (let run = 0; run < 400; run++) {
      const start = MON + rng.int(0, 6);
      let lazy = {
        settled: start,
        job: {
          id: 'factory-worker',
          since: start,
          streak: rng.int(0, 12),
          lastShiftDay: start as number | null,
        } as JobState,
        sick: { week: Math.floor((start + 3) / 7), left: rng.int(0, 2) } as SickDays,
        iron: 0,
      };
      let eager = structuredClone(lazy);
      let day = start;
      for (let step = 0; step < 25; step++) {
        const gap = rng.int(1, 4); // the player comes back after 1–4 days (≤ 14: no cap involved)
        const to = day + gap;
        const l = settle(lazy.settled, to, lazy.job, lazy.sick);
        lazy = { settled: to, job: l.job!, sick: l.sickDays, iron: lazy.iron + l.salary!.total };
        for (let d = day; d < to; d++) {
          const e = settle(eager.settled, d + 1, eager.job, eager.sick);
          eager = { settled: d + 1, job: e.job!, sick: e.sickDays, iron: eager.iron + e.salary!.total };
        }
        expect(lazy).toEqual(eager);
        // Sometimes work today's shift (the only day a shift can happen is a touched day).
        if (rng.int(0, 1) === 1) {
          lazy.job = { ...lazy.job, streak: lazy.job.streak + 1, lastShiftDay: to };
          eager.job = { ...eager.job, streak: eager.job.streak + 1, lastShiftDay: to };
        }
        day = to;
      }
    }
  });

  it('§4.3 rule 2: a single missed day (no earlier miss that week) never breaks a running streak, on any weekday', () => {
    for (let d = 0; d < 7; d++) {
      const ended = MON + d;
      const s = settle(
        ended,
        ended + 1,
        { id: 'factory-worker', since: MON - 7, streak: 3, lastShiftDay: ended - 1 },
        { week: Math.floor((MON + 3) / 7), left: 2 },
      );
      expect(s.streak).toMatchObject({ after: 3, broken: false, sickDaysUsed: 1 });
    }
  });
});

// ---------------------------------------------------------------------------------------------
// §6.2 / §6.3 lazy Energy and Rested
// ---------------------------------------------------------------------------------------------
describe('§6.2 / §6.3 lazy Energy and Rested', () => {
  it('+5 per whole 10 minutes: empty to full in 3 h 20; overflow banks into Rested up to 200 (10 h 00 after full)', () => {
    const s: EnergyState = { value: 0, rested: 0, updatedAt: T0 };
    expect(projectEnergy(s, T0 + 199 * 60_000).value).toBe(95);
    expect(projectEnergy(s, T0 + 200 * 60_000)).toMatchObject({ value: 100, rested: 0, fullAt: null });
    expect(projectEnergy(s, T0 + (200 + 400) * 60_000).rested).toBe(200);
    expect(projectEnergy(s, T0 + 30 * 86_400_000)).toMatchObject({ value: 100, rested: 200 });
  });

  it('projecting in many small steps equals one projection (a player polling every few seconds gains nothing)', () => {
    const s: EnergyState = { value: 13, rested: 7, updatedAt: T0 };
    let step = s;
    for (let t = T0; t <= T0 + 15 * 3_600_000; t += 37_000) step = projectEnergy(step, t);
    const once = projectEnergy(s, T0 + Math.floor((15 * 3_600_000) / 37_000) * 37_000);
    expect({ value: step.value, rested: step.rested, updatedAt: step.updatedAt }).toEqual({
      value: once.value,
      rested: once.rested,
      updatedAt: once.updatedAt,
    });
  });
});

// ---------------------------------------------------------------------------------------------
// §13.1 batches, §15.4 orders
// ---------------------------------------------------------------------------------------------
describe('§13.1 ×3 and §15.4 Party orders', () => {
  it('majority rule for the narrative (designer answer Q5)', () => {
    expect([0, 1, 2, 3].map((s) => usesSuccessText(s, 3))).toEqual([false, false, true, true]);
    expect([0, 1].map((s) => usesSuccessText(s, 1))).toEqual([false, true]);
    expect([2, 3].map((s) => usesSuccessText(s, 5))).toEqual([false, true]);
  });

  it('×3 stamps "n of 3" for 0 and 3 successes too, and refuses a run 1 Energy short without spending', () => {
    expect(ok(resolveTier1Action(tier1({ times: 3 }), fixedRng([1, 1, 1]))).resolution.summary).toEqual({
      stamp: 'batch',
      successes: 3,
    });
    expect(ok(resolveTier1Action(tier1({ times: 3 }), fixedRng([99, 99, 99]))).resolution.summary).toEqual({
      stamp: 'batch',
      successes: 0,
    });
    const short = resolveTier1Action(
      tier1({ times: 3, energy: { value: 29, rested: 50, updatedAt: T0 } }),
      fixedRng([]),
    );
    expect(short).toMatchObject({ ok: false, reason: 'NOT_ENOUGH_ENERGY', cost: 30, shortBy: 1 });
  });

  it('Energy regenerated just in time counts: 25 stored + 1 tick (10 min later) = 30 → ×3 allowed', () => {
    const r = resolveTier1Action(
      tier1({ times: 3, energy: { value: 25, rested: 0, updatedAt: T0 - 600_000 } }),
      fixedRng([1, 1, 1]),
    );
    expect(r.ok).toBe(true);
  });

  it('orders rotate by City Day number from 2026-01-01 (Tue 29 Sep 2026 = day 271: Be at the gate · Keep your ears open · Sharpen up)', () => {
    const day = dayKey(T0);
    expect(day - DIRECTIVES.epochDay).toBe(271);
    expect(ordersForDay(TEMPLATES, day).map((t) => t.id)).toEqual([
      'dir.shift-change',
      'dir.ears-open',
      'dir.sharpen-up',
    ]);
    expect(ordersForDay(TEMPLATES, day + 1).map((t) => t.id)).toEqual([
      'dir.foundry-row',
      'dir.paper-the-town',
      'dir.full-day',
    ]);
  });

  it('only rows that advance an open order get +25 %; nothing after the completing row of the same ×3', () => {
    const day = dayKey(T0);
    const orders = startOrders(TEMPLATES, day, false); // Be at the gate (2) is slot A today
    const r = ok(resolveTier1Action(tier1({ times: 3, orders }), fixedRng([1, 1, 1]))).resolution;
    expect(r.attempts.map((a) => a.rewards.fxp.bonus)).toEqual([2, 2, 0]);
    expect(r.attempts.map((a) => a.orderId)).toEqual(['dir.shift-change', 'dir.shift-change', null]);
    expect(r.orders.completed).toEqual(['dir.shift-change']);
  });

  it('the Take a job variant is frozen when there is no job, and a job-holder gets Work your shift', () => {
    const day = dayKey(T0);
    expect(startOrders(TEMPLATES, day, false).items[2]!.variant).toBe('main'); // Sharpen up has no variant
    const shiftDay = [...Array(3).keys()]
      .map((k) => day + k)
      .find((d) => ordersForDay(TEMPLATES, d)[2]!.id === 'dir.work-shift')!;
    expect(startOrders(TEMPLATES, shiftDay, false).items[2]).toMatchObject({ variant: 'noJob', target: 1 });
    expect(startOrders(TEMPLATES, shiftDay, true).items[2]).toMatchObject({ variant: 'main', target: 1 });
  });
});

describe('§2.2 day and night', () => {
  it('night is 20:00–06:00 UTC; the City Day turns at 00:00 UTC', () => {
    const at = (h: number, m = 0) => Date.UTC(2026, 8, 29, h, m);
    expect([at(5, 59), at(6), at(19, 59), at(20), at(0), at(23, 59)].map(isNight)).toEqual([
      true,
      false,
      false,
      true,
      true,
      true,
    ]);
    expect(dayKey(Date.UTC(2026, 8, 29, 23, 59, 59, 999)) + 1).toBe(dayKey(Date.UTC(2026, 8, 30)));
  });

  it('standing thresholds 10 / 30 / 70 / 150 and +3 % per level', () => {
    expect([0, 9, 10, 29, 30, 69, 70, 149, 150, 10_000].map((s) => standingView(s).level)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4,
    ]);
    expect([0, 10, 30, 70, 150].map((s) => standingView(s).bonus)).toEqual([0, 3, 6, 9, 12]);
  });
});
