import { describe, expect, it } from 'vitest';
import { computeRewards, roundHalfUp, roundOpinion } from '../src';

const canvass = { tier: 1 as const, energy: 10, givesFxp: true, givesOpinion: true };

describe('computeRewards — the 10-Energy tier-1 canvass (§5.5 reference action)', () => {
  it('Success → 45 XP / 6 FXP / 20 Iron, +0.05 opinion', () => {
    expect(computeRewards({ ...canvass, outcome: 'success', restedUsed: 0 })).toEqual({
      xp: { base: 45, bonus: 0, total: 45 },
      fxp: { base: 6, bonus: 0, total: 6 },
      iron: { base: 20, bonus: 0, total: 20 },
      opinion: 0.05,
    });
  });

  it('Partial → 23 / 3 / 10 (22.5 rounds half up), +0.025 opinion', () => {
    expect(computeRewards({ ...canvass, outcome: 'partial', restedUsed: 0 })).toEqual({
      xp: { base: 23, bonus: 0, total: 23 },
      fxp: { base: 3, bonus: 0, total: 3 },
      iron: { base: 10, bonus: 0, total: 10 },
      opinion: 0.025,
    });
  });

  it('full Rested → 68 / 6 / 30: +50 % on XP and Iron, never on FXP or opinion', () => {
    expect(computeRewards({ ...canvass, outcome: 'success', restedUsed: 10 })).toEqual({
      xp: { base: 45, bonus: 23, total: 68 },
      fxp: { base: 6, bonus: 0, total: 6 },
      iron: { base: 20, bonus: 10, total: 30 },
      opinion: 0.05,
    });
  });

  it('Rested is proportional: 3 of 10 Energy → +15 % (6.75 XP → 7, 3 Iron)', () => {
    const r = computeRewards({ ...canvass, outcome: 'success', restedUsed: 3 });
    expect(r.xp).toEqual({ base: 45, bonus: 7, total: 52 });
    expect(r.iron).toEqual({ base: 20, bonus: 3, total: 23 });
  });

  it('Partial with full Rested works from full precision (22.5 × 0.5 = 11.25 → 11)', () => {
    const r = computeRewards({ ...canvass, outcome: 'partial', restedUsed: 10 });
    expect(r.xp).toEqual({ base: 23, bonus: 11, total: 34 });
    expect(r.iron).toEqual({ base: 10, bonus: 5, total: 15 });
  });

  it('a line that pays on Success pays at least 1 on a Partial', () => {
    // 1 Energy: FXP 0.6 on Success → 1; Partial 0.3 → rounds to 0, floored to 1.
    const r = computeRewards({ ...canvass, energy: 1, outcome: 'partial', restedUsed: 0 });
    expect(r.fxp).toEqual({ base: 1, bonus: 0, total: 1 });
  });

  it('pays no FXP or opinion when the action gives none', () => {
    const r = computeRewards({
      tier: 1,
      energy: 10,
      givesFxp: false,
      givesOpinion: false,
      outcome: 'success',
      restedUsed: 0,
    });
    expect(r.fxp).toEqual({ base: 0, bonus: 0, total: 0 });
    expect(r.opinion).toBe(0);
    expect(r.xp.total).toBe(45);
  });

  it('pays nothing on a Failure (tiers 2–3 only; kept total for completeness)', () => {
    const r = computeRewards({ ...canvass, outcome: 'failure', restedUsed: 0 });
    expect(r.xp.total + r.fxp.total + r.iron.total + r.opinion).toBe(0);
  });

  it('handles 0 Energy without dividing by zero', () => {
    const r = computeRewards({ ...canvass, energy: 0, outcome: 'success', restedUsed: 0 });
    expect(r.xp.total).toBe(0);
  });
});

describe('computeRewards — slice 1 multipliers', () => {
  it('council 10 Energy pays FXP ×1.5: 9 / 5, no opinion', () => {
    const council = {
      tier: 1 as const,
      energy: 10,
      givesFxp: true,
      givesOpinion: false,
      restedUsed: 0,
      fxpRateMultiplier: 1.5,
    };
    expect(computeRewards({ ...council, outcome: 'success' }).fxp).toEqual({ base: 9, bonus: 0, total: 9 });
    expect(computeRewards({ ...council, outcome: 'partial' }).fxp).toEqual({ base: 5, bonus: 0, total: 5 });
    expect(computeRewards({ ...council, outcome: 'success' }).opinion).toBe(0);
  });

  it('the Party-order bonus is +25 % of the base FXP, rounded on its own (6 → +2, 3 → +1)', () => {
    expect(
      computeRewards({ ...canvass, outcome: 'success', restedUsed: 0, fxpBonusShare: 0.25 }).fxp,
    ).toEqual({
      base: 6,
      bonus: 2,
      total: 8,
    });
    expect(
      computeRewards({ ...canvass, outcome: 'partial', restedUsed: 0, fxpBonusShare: 0.25 }).fxp,
    ).toEqual({
      base: 3,
      bonus: 1,
      total: 4,
    });
  });

  it('speech 12 Energy: 54 / 7 / 24, +0.06; Partial 27 / 4 / 12, +0.03', () => {
    const s = computeRewards({ ...canvass, energy: 12, outcome: 'success', restedUsed: 0 });
    expect([s.xp.total, s.fxp.total, s.iron.total, s.opinion]).toEqual([54, 7, 24, 0.06]);
    const p = computeRewards({ ...canvass, energy: 12, outcome: 'partial', restedUsed: 0 });
    expect([p.xp.total, p.fxp.total, p.iron.total, p.opinion]).toEqual([27, 4, 12, 0.03]);
  });
});

describe('rounding helpers', () => {
  it('roundHalfUp rounds halves up and absorbs float noise', () => {
    expect(roundHalfUp(22.5)).toBe(23);
    expect(roundHalfUp(22.4999999999)).toBe(23);
    expect(roundHalfUp(22.49)).toBe(22);
    expect(roundHalfUp(0.3)).toBe(0);
    expect(roundHalfUp(6.75)).toBe(7);
  });

  it('roundOpinion keeps three decimals', () => {
    expect(roundOpinion(0.0250000001)).toBe(0.025);
    expect(roundOpinion(0.1 + 0.2)).toBe(0.3);
    expect(roundOpinion(0.0125)).toBe(0.013);
  });
});
