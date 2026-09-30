import { describe, expect, it } from 'vitest';
import { applyDrift, applyMoraleLoss, applyPersuasion, moraleState, moraleTransition } from '../src';
import type { OpinionShares } from '../src';

const coalport = (collective: number, neutral = 100 - collective - 10): OpinionShares => ({
  vanguard: 5,
  collective,
  alliance: 5,
  neutral,
});

describe('morale (GDD §14.11, ADR 0022)', () => {
  it('states at the edges', () => {
    expect(moraleState(59.999)).toBe('unrest');
    expect(moraleState(60)).toBe('steady');
    expect(moraleState(79.999)).toBe('steady');
    expect(moraleState(80)).toBe('fired');
  });

  it('the drift is 2 % of the distance to 70: 95 → 94.5, 60 → 60.2, 70 stays', () => {
    expect(applyDrift(coalport(85, 5), 'collective')).toMatchObject({ delta: -0.3 });
    const high = applyDrift({ vanguard: 0, collective: 95, alliance: 0, neutral: 5 }, 'collective');
    expect(high.shares.collective).toBe(94.5);
    expect(high.shares.neutral).toBe(5.5);
    const low = applyDrift(coalport(60), 'collective');
    expect(low.shares.collective).toBe(60.2);
    expect(low.delta).toBe(0.2);
    expect(applyDrift(coalport(70), 'collective')).toMatchObject({ delta: 0 });
  });

  it('a drift up with Neutral at its floor moves nothing', () => {
    const r = applyDrift({ vanguard: 30, collective: 65, alliance: 0, neutral: 5 }, 'collective');
    expect(r.delta).toBe(0);
    expect(r.shares.collective).toBe(65);
  });

  it('the unvoted-count loss goes to Neutral, never below the home floor of 50', () => {
    expect(applyMoraleLoss(coalport(70), 'collective', 3).shares).toMatchObject({
      collective: 67,
      neutral: 23,
    });
    expect(applyMoraleLoss(coalport(51), 'collective', 3)).toMatchObject({ applied: 1 });
  });

  it('a transition record only when the state changes', () => {
    expect(moraleTransition({ state: 'steady', since: 1, previous: null }, 70, 5)).toBeNull();
    expect(moraleTransition({ state: 'steady', since: 1, previous: null }, 80, 5)).toEqual({
      state: 'fired',
      since: 5,
      previous: 'steady',
    });
    expect(moraleTransition(null, 59, 5)).toEqual({ state: 'unrest', since: 5, previous: null });
  });

  it('economy §14.5: a lone reference recruit (+1.15 a day) is Fired up on day 9 ± 1', () => {
    let s = coalport(70);
    let firedOn: number | null = null;
    for (let day = 1; day <= 30 && firedOn === null; day++) {
      s = applyPersuasion(s, { factionId: 'collective', swing: 1.15, homeFactionId: 'collective' }).shares;
      if (moraleState(s.collective) === 'fired') firedOn = day;
      s = applyDrift(s, 'collective').shares;
    }
    expect(firedOn).not.toBeNull();
    expect(Math.abs(firedOn! - 9)).toBeLessThanOrEqual(1);
  });

  it('economy §14.5: nobody playing, the fourth unvoted count (day 20) enters Unrest', () => {
    let s = coalport(70);
    let unrestOn: number | null = null;
    for (let day = 1; day <= 30 && unrestOn === null; day++) {
      s = applyDrift(s, 'collective').shares;
      if (day % 5 === 0) s = applyMoraleLoss(s, 'collective', 3).shares;
      if (moraleState(s.collective) === 'unrest') unrestOn = day;
    }
    expect(unrestOn).toBe(20);
  });
});
