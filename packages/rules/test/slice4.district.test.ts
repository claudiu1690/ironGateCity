/** Slice 4, T2 (tech design §6.10): the drift, the close race, control, the comeback, averages. */
import { describe, expect, it } from 'vitest';
import {
  applyBaselineDrift,
  averageShares,
  controller,
  createRng,
  districtState,
  groundswellPct,
  isBattleground,
} from '../src';
import type { OpinionShares } from '../src';

const S = (vanguard: number, collective: number, alliance: number, neutral: number): OpinionShares => ({
  vanguard,
  collective,
  alliance,
  neutral,
});
const K = (s: OpinionShares) =>
  Math.round(s.vanguard * 1000) +
  Math.round(s.collective * 1000) +
  Math.round(s.alliance * 1000) +
  Math.round(s.neutral * 1000);

describe('the drift to the baseline (design §6.2)', () => {
  it('moves each share 1 % of its distance, the balance through Neutral', () => {
    // Eastside, baseline 15 / 35 / 15 / 35: the Collective at 45 drifts to 44.9.
    const east = applyBaselineDrift(S(15, 45, 15, 25), S(15, 35, 15, 35));
    expect(east.shares).toEqual(S(15, 44.9, 15, 25.1));
    expect(east.moves).toEqual({ collective: -0.1 });
    // Garrison Hill, baseline 35 / 15 / 15 / 35: the Vanguard at 15 drifts to 15.2.
    const hill = applyBaselineDrift(S(15, 15, 15, 55), S(35, 15, 15, 35));
    expect(hill.shares).toEqual(S(15.2, 15, 15, 54.8));
    expect(hill.moves).toEqual({ vanguard: 0.2 });
  });

  it('keeps the sum at exactly 100.000 over 5,000 random shares', () => {
    const rng = createRng('drift');
    const base = S(20, 20, 20, 40);
    for (let n = 0; n < 5_000; n++) {
      const a = rng.int(0, 60_000);
      const b = rng.int(0, 95_000 - a);
      const c = rng.int(0, 95_000 - a - b);
      const s = S(a / 1000, b / 1000, c / 1000, (100_000 - a - b - c) / 1000);
      const r = applyBaselineDrift(s, base);
      expect(K(r.shares)).toBe(100_000);
      expect(r.shares.neutral).toBeGreaterThanOrEqual(Math.min(5, s.neutral));
    }
  });

  it('Neutral at its floor of 5 blocks an upward drift; a shortfall is left', () => {
    // The Collective and the Alliance fall (0.3 and 0.25 go to Neutral), which pays the Vanguard's 0.25.
    const r = applyBaselineDrift(S(10, 45, 40, 5), S(35, 15, 15, 35));
    expect(r.shares).toEqual(S(10.25, 44.7, 39.75, 5.3));
    // Only the Vanguard wants to rise (+0.05) and Neutral has nothing above 5: nothing moves.
    const blocked = applyBaselineDrift(S(30, 30, 35, 5), S(35, 30, 35, 0));
    expect(blocked.shares).toEqual(S(30, 30, 35, 5));
    expect(blocked.moves).toEqual({});
    // Two rising factions share what Neutral can give (0.1 above its floor) in proportion.
    const shared = applyBaselineDrift(S(20, 40, 34.9, 5.1), S(50, 60, 34.9, 0));
    expect(shared.shares).toEqual(S(20.06, 40.04, 34.9, 5));
  });
});

describe('the close race and control (design §6.3)', () => {
  it('within 10 points is a close race (inclusive)', () => {
    expect(isBattleground(S(30, 20, 15, 35))).toBe(true);
    expect(isBattleground(S(30.001, 20, 14.999, 35))).toBe(false);
    expect(isBattleground(S(20, 20, 20, 40))).toBe(true);
    expect(isBattleground(S(15, 35, 15, 35))).toBe(false);
  });

  it('control is above 50; 50.000 is not', () => {
    expect(controller(S(50, 20, 10, 20))).toBeNull();
    expect(controller(S(50.001, 20, 9.999, 20))).toBe('vanguard');
  });
});

describe('the comeback (design §6.4)', () => {
  it('starts the boundary after control is lost, reaches +30 on day 6, ends at 14 boundaries', () => {
    const lost = districtState({ controlledBy: 'collective', groundswell: null }, S(15, 49, 15, 21), 100);
    expect(lost.started).toBe('collective');
    expect(lost.groundswell).toEqual({ factionId: 'collective', fromDay: 100, untilDay: 114 });
    const g = lost.groundswell!;
    expect([100, 101, 102, 103, 104, 105, 106, 113].map((d) => groundswellPct(g, d))).toEqual([
      5, 10, 15, 20, 25, 30, 30, 30,
    ]);
    const still = districtState({ controlledBy: null, groundswell: g }, S(15, 49, 15, 21), 113);
    expect(still.groundswell).toEqual(g);
    const over = districtState({ controlledBy: null, groundswell: g }, S(15, 49, 15, 21), 114);
    expect([over.groundswell, over.ended]).toEqual([null, true]);
  });

  it('ends when the faction retakes control', () => {
    const g = { factionId: 'collective' as const, fromDay: 100, untilDay: 114 };
    const back = districtState({ controlledBy: null, groundswell: g }, S(15, 51, 15, 19), 103);
    expect([back.groundswell, back.ended, back.controlledBy]).toEqual([null, true, 'collective']);
  });

  it('no comeback without control first', () => {
    const r = districtState({ controlledBy: null, groundswell: null }, S(20, 20, 20, 40), 100);
    expect(r).toEqual({
      battleground: true,
      controlledBy: null,
      groundswell: null,
      started: null,
      ended: false,
    });
  });
});

describe('the city share (design §6.6)', () => {
  it('is the equal average of the five baselines: 21 / 21 / 21 / 37', () => {
    const avg = averageShares([
      S(20, 20, 20, 40),
      S(15, 15, 35, 35),
      S(20, 20, 20, 40),
      S(15, 35, 15, 35),
      S(35, 15, 15, 35),
    ]);
    expect(avg).toEqual(S(21, 21, 21, 37));
  });

  it('keeps the sum at 100.000 when the average rounds', () => {
    const avg = averageShares([
      S(20.001, 20, 20, 39.999),
      S(20, 20.001, 20, 39.999),
      S(20, 20, 20.001, 39.999),
    ]);
    expect(K(avg)).toBe(100_000);
  });
});
