import { describe, expect, it } from 'vitest';
import {
  addToTally,
  applyGains,
  currentTally,
  emptyTally,
  rankBounds,
  rankForFxp,
  standingBonus,
  standingView,
} from '../src';

describe('standingView (§13.4)', () => {
  it.each([
    [0, 0, 0],
    [9, 0, 0],
    [10, 1, 3],
    [29, 1, 3],
    [30, 2, 6],
    [69, 2, 6],
    [70, 3, 9],
    [149, 3, 9],
    [150, 4, 12],
    [900, 4, 12],
  ])('%i Successes → level %i, +%i %', (successes, level, bonus) => {
    const v = standingView(successes);
    expect(v.level).toBe(level);
    expect(v.bonus).toBe(bonus);
  });

  it('reports the floor and the next threshold', () => {
    expect(standingView(14)).toEqual({ level: 1, successes: 14, floor: 10, next: 30, bonus: 3 });
    expect(standingView(150).next).toBeNull();
  });

  it('standingBonus is null at Stranger and a labelled bonus above', () => {
    expect(standingBonus(9, 'x')).toBeNull();
    expect(standingBonus(30, 'Known in Coalport')).toEqual({
      id: 'standing',
      label: 'Known in Coalport',
      value: 6,
    });
  });
});

describe('rank (§5.4)', () => {
  it('Rank 2 at 400 FXP', () => {
    expect(rankForFxp(0)).toBe(1);
    expect(rankForFxp(399)).toBe(1);
    expect(rankForFxp(400)).toBe(2);
    expect(rankForFxp(2_000)).toBe(3);
    expect(rankForFxp(1_000_000)).toBe(7);
    expect(rankBounds(2)).toEqual({ floor: 400, next: 2_000 });
    expect(rankBounds(7)).toEqual({ floor: 60_000, next: null });
  });
});

describe('applyGains', () => {
  const p = { xp: 149, level: 1, fxp: 390, rank: 1, pc: 998, statPointsPending: 0 };

  it('149 XP + 1,000 → Level 4 and 3 stat points', () => {
    const r = applyGains(p, { xp: 1_000, fxp: 0, pc: 0 });
    expect(r.next.level).toBe(4);
    expect(r.next.statPointsPending).toBe(3);
    expect(r.levelUp).toEqual({ from: 1, to: 4, statPoints: 3 });
  });

  it('crossing 400 FXP ranks up; PC caps at 1,000', () => {
    const r = applyGains(p, { xp: 0, fxp: 10, pc: 5 });
    expect(r.rankUp).toEqual({ from: 1, to: 2 });
    expect(r.next.pc).toBe(1_000);
    expect(r.levelUp).toBeNull();
  });

  it('never lowers level or rank', () => {
    const r = applyGains({ ...p, level: 5, rank: 3 }, { xp: 1, fxp: 1, pc: 0 });
    expect(r.next.level).toBe(5);
    expect(r.next.rank).toBe(3);
    expect(r.rankUp).toBeNull();
  });
});

describe('tally (§3.7)', () => {
  it('reads zeros for another day', () => {
    const t = { ...emptyTally(10), energy: 30 };
    expect(currentTally(t, 10).energy).toBe(30);
    expect(currentTally(t, 11)).toEqual(emptyTally(11));
  });

  it('adds a tap, starting fresh on a new day, opinion to three decimals', () => {
    let t = addToTally({ ...emptyTally(10), energy: 50 }, 11, { energy: 30, attempts: 3, opinion: 0.1 });
    t = addToTally(t, 11, { energy: 4, opinion: 0.025, iron: 112 });
    expect(t).toMatchObject({
      day: 11,
      energy: 34,
      attempts: 3,
      opinion: 0.125,
      iron: 112,
    });
    t = addToTally(t, 11, { statTrained: 1 });
    expect(t.statTrained).toBe(1);
  });
});
