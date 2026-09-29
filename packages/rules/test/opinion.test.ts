import { describe, expect, it } from 'vitest';
import { applyPersuasion } from '../src';
import type { OpinionShares } from '../src';

const sumK = (s: OpinionShares) => Math.round((s.vanguard + s.collective + s.alliance + s.neutral) * 1000);
const coalport: OpinionShares = { vanguard: 9, collective: 70, alliance: 6, neutral: 15 };

describe('applyPersuasion (§14.2)', () => {
  it('draws from Neutral first: +0.05 → Collective 70.05, Neutral 14.95', () => {
    const r = applyPersuasion(coalport, {
      factionId: 'collective',
      swing: 0.05,
      homeFactionId: 'collective',
    });
    expect(r.applied).toBe(0.05);
    expect(r.shares).toEqual({ vanguard: 9, collective: 70.05, alliance: 6, neutral: 14.95 });
    expect(sumK(r.shares)).toBe(100_000);
  });

  it('keeps a Partial canvass (0.025) exactly', () => {
    const r = applyPersuasion(coalport, { factionId: 'collective', swing: 0.025 });
    expect(r.shares.neutral).toBe(14.975);
    expect(r.shares.collective).toBe(70.025);
  });

  it('with Neutral at its floor, draws from the rivals 9:6', () => {
    const r = applyPersuasion(
      { vanguard: 9, collective: 80, alliance: 6, neutral: 5 },
      { factionId: 'collective', swing: 0.05 },
    );
    expect(r.shares).toEqual({ vanguard: 8.97, collective: 80.05, alliance: 5.98, neutral: 5 });
    expect(sumK(r.shares)).toBe(100_000);
  });

  it('takes part from Neutral and the rest from the rivals', () => {
    const r = applyPersuasion(
      { vanguard: 9, collective: 80.97, alliance: 5, neutral: 5.03 },
      { factionId: 'collective', swing: 0.06 },
    );
    expect(r.applied).toBe(0.06);
    expect(r.shares.neutral).toBe(5);
    expect(sumK(r.shares)).toBe(100_000);
  });

  it('the Collective caps at 95 (nothing left to draw): the swing shrinks', () => {
    const r = applyPersuasion(
      { vanguard: 0.02, collective: 94.98, alliance: 0, neutral: 5 },
      { factionId: 'collective', swing: 0.05 },
    );
    expect(r.applied).toBe(0.02);
    expect(r.shares.collective).toBe(95);
    expect(r.shares.vanguard).toBe(0);
    expect(sumK(r.shares)).toBe(100_000);
  });

  it('a rival persuading in Coalport never takes the Collective below 50', () => {
    const r = applyPersuasion(
      { vanguard: 40, collective: 50.01, alliance: 4.99, neutral: 5 },
      { factionId: 'vanguard', swing: 0.5, homeFactionId: 'collective' },
    );
    expect(r.shares.collective).toBe(50);
    expect(r.applied).toBeCloseTo(0.5, 9);
    expect(r.shares.alliance).toBeCloseTo(4.5, 9);
    expect(sumK(r.shares)).toBe(100_000);
  });

  it('never moves on a zero swing', () => {
    const r = applyPersuasion(coalport, { factionId: 'collective', swing: 0 });
    expect(r).toEqual({ shares: coalport, applied: 0 });
  });

  it('sums to exactly 100.000 over many small swings, floors held', () => {
    let s = coalport;
    for (let i = 0; i < 2_000; i++) {
      s = applyPersuasion(s, {
        factionId: i % 7 === 0 ? 'alliance' : 'collective',
        swing: 0.025,
        homeFactionId: 'collective',
      }).shares;
      expect(sumK(s)).toBe(100_000);
    }
    expect(s.neutral).toBeGreaterThanOrEqual(5);
    expect(s.collective).toBeGreaterThanOrEqual(50);
  });
});
