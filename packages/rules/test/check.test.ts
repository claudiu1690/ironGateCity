import { describe, expect, it } from 'vitest';
import { computeCheck, outcomeForRoll, tier1Difficulty } from '../src';
import type { Stats } from '../src';

const stats = (s: Partial<Stats>): Stats => ({ str: 5, int: 5, agi: 5, cha: 2, ...s });

describe('computeCheck — the §8.4 examples', () => {
  it('Canvass in Coalport, INT 12, Known standing → 72 %', () => {
    const c = computeCheck({
      stat: 'int',
      stats: stats({ int: 12 }),
      difficulty: tier1Difficulty('home'),
      bonuses: [{ id: 'standing', label: 'Known in Coalport', value: 6 }],
    });
    expect(c).toEqual({
      stat: 'int',
      statValue: 12,
      difficulty: 8,
      base: 50,
      statTerm: 16,
      bonuses: [{ id: 'standing', label: 'Known in Coalport', value: 6 }],
      bonusTotal: 6,
      raw: 72,
      chance: 72,
    });
  });

  it('the reference recruit canvassing at home → 66 %', () => {
    const c = computeCheck({ stat: 'int', stats: stats({ str: 10, int: 12 }), difficulty: 8 });
    expect(c.chance).toBe(66);
    expect(c.bonuses).toEqual([]);
    expect(c.bonusTotal).toBe(0);
  });

  it('Speech to the picket, INT 18, difficulty 12 → 74 %', () => {
    expect(computeCheck({ stat: 'int', stats: stats({ int: 18 }), difficulty: 12 }).chance).toBe(74);
  });

  it('Sabotage in Duskwall, AGI 17, difficulty 16 + 4, forged papers → 48 %', () => {
    const c = computeCheck({
      stat: 'agi',
      stats: stats({ agi: 17 }),
      difficulty: 16 + 4,
      bonuses: [{ id: 'item', label: 'Forged papers', value: 10 }],
    });
    expect(c.statTerm).toBe(-12);
    expect(c.chance).toBe(48);
  });
});

describe('computeCheck — clamps', () => {
  it('clamps to 95 at the top, keeping the raw value', () => {
    const c = computeCheck({ stat: 'int', stats: stats({ int: 30 }), difficulty: 8 });
    expect(c.raw).toBe(138);
    expect(c.chance).toBe(95);
  });

  it('clamps to 5 at the bottom', () => {
    const c = computeCheck({ stat: 'cha', stats: stats({ cha: 0 }), difficulty: 25 });
    expect(c.raw).toBe(-50);
    expect(c.chance).toBe(5);
  });

  it('does not share the bonus objects it was given', () => {
    const bonuses = [{ id: 'x', label: 'X', value: 1 }];
    const c = computeCheck({ stat: 'int', stats: stats({}), difficulty: 8, bonuses });
    c.bonuses[0]!.value = 99;
    expect(bonuses[0]!.value).toBe(1);
  });
});

describe('tier1Difficulty', () => {
  it('is 8 at home and 10 in a battleground', () => {
    expect(tier1Difficulty('home')).toBe(8);
    expect(tier1Difficulty('battleground')).toBe(10);
  });
});

describe('outcomeForRoll', () => {
  it('succeeds at or below the chance (roll = chance is a Success)', () => {
    expect(outcomeForRoll(1, 66, 1)).toBe('success');
    expect(outcomeForRoll(66, 66, 1)).toBe('success');
  });

  it('is a Partial up to 20 points above', () => {
    expect(outcomeForRoll(67, 66, 1)).toBe('partial');
    expect(outcomeForRoll(86, 66, 2)).toBe('partial');
  });

  it('beyond chance + 20: tier 1 is still a Partial, tiers 2 and 3 fail', () => {
    expect(outcomeForRoll(87, 66, 1)).toBe('partial');
    expect(outcomeForRoll(87, 66, 2)).toBe('failure');
    expect(outcomeForRoll(87, 66, 3)).toBe('failure');
  });

  it('a tier-1 action never fails, over every roll and chance', () => {
    for (let chance = 5; chance <= 95; chance++) {
      for (let roll = 1; roll <= 100; roll++) {
        expect(outcomeForRoll(roll, chance, 1)).not.toBe('failure');
      }
    }
  });

  it('a 95 % button still gives a Partial on 96–100', () => {
    expect(outcomeForRoll(96, 95, 1)).toBe('partial');
    expect(outcomeForRoll(100, 95, 1)).toBe('partial');
  });
});
