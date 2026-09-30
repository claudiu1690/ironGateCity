import { describe, expect, it } from 'vitest';
import {
  FIRST_DAY,
  STANDING,
  bestTrainedStat,
  computeCheck,
  dayKey,
  firstDayBonus,
  isWelcomeDay,
  statUse,
} from '../src';

/** Review 1 (30 Sep 2026): the rules behind `docs/design/review-1-answers.md` §2, §7, §9. */
describe('best-stat checks (GDD §8.4, review 1 §2)', () => {
  it('the best trained stat is the highest of STR, INT and AGI; ties to the faction stat, then INT, STR', () => {
    expect(bestTrainedStat({ str: 13, int: 5, agi: 8 })).toBe('str');
    expect(bestTrainedStat({ str: 8, int: 8, agi: 8 })).toBe('int');
    expect(bestTrainedStat({ str: 8, int: 8, agi: 8 }, 'str')).toBe('str');
    expect(bestTrainedStat({ str: 9, int: 7, agi: 9 })).toBe('str');
    expect(bestTrainedStat({ str: 9, int: 7, agi: 9 }, 'agi')).toBe('agi');
  });

  it("a committee for the user's Vanguard (STR 13, INT 5): 70 %, and 80 % with the First day row", () => {
    const values = { str: 13, int: 5, agi: 8, cha: 2 };
    const c = computeCheck({ stats: ['best'], values, difficulty: 8 });
    expect(c).toMatchObject({ stats: ['str'], best: true, statValue: 13, chance: 70 });
    const d = computeCheck({ stats: ['best'], values, difficulty: 8, bonuses: [firstDayBonus('Duskwall')] });
    expect(d.chance).toBe(80);
    expect(d.bonuses).toEqual([{ id: 'first-day', label: 'First day in Duskwall', value: 10 }]);
    // A named stat is not marked best.
    expect(computeCheck({ stats: ['int'], values, difficulty: 8 }).best).toBeUndefined();
  });
});

describe('the welcome day (GDD §8.4, §13.7; Appendix C #18)', () => {
  it('is the creation day, and the next one too when created at or after 22:00 UTC', () => {
    const noon = Date.UTC(2026, 8, 30, 12, 0);
    const late = Date.UTC(2026, 8, 30, 22, 0);
    const day = dayKey(noon);
    expect([isWelcomeDay(noon, day), isWelcomeDay(noon, day + 1)]).toEqual([true, false]);
    expect([isWelcomeDay(late, day), isWelcomeDay(late, day + 1), isWelcomeDay(late, day + 2)]).toEqual([
      true,
      true,
      false,
    ]);
    expect(isWelcomeDay(Date.UTC(2026, 8, 30, 21, 59), day + 1)).toBe(false);
    expect(FIRST_DAY.chancePct).toBe(10);
  });
});

describe('the stat-point choice (GDD §5.3, review 1 §7)', () => {
  it('counts single-stat actions for their stat, two-stat for both, best-stat for none', () => {
    const u = statUse([
      { stats: ['int'] },
      { stats: ['int'] },
      { stats: ['str'] },
      { stats: ['cha', 'int'] },
      { stats: ['agi'] },
      { stats: ['best'] },
    ]);
    expect(u).toEqual({ total: 6, counts: { str: 1, int: 3, agi: 1 }, lead: 'int' });
    expect(statUse([{ stats: ['str'] }, { stats: ['str'] }, { stats: ['int'] }]).lead).toBe('str');
  });
});

describe('One of Us (GDD §13.4, review 1 §9)', () => {
  it('pays 1 PC a day', () => {
    expect(STANDING.oneOfUsPcPerDay).toBe(1);
  });
});
