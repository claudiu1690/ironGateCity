import { describe, expect, it } from 'vitest';
import { LEVEL_XP_THRESHOLDS, levelForXp, xpForLevel, xpToNextLevel } from '../src';

describe('levels (§5.3)', () => {
  it('pins the designer anchors', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(2)).toBe(150);
    expect(xpForLevel(6)).toBe(2_500);
    expect(xpForLevel(10)).toBe(7_400);
    expect(xpForLevel(16)).toBe(20_000);
    expect(xpForLevel(31)).toBe(100_000);
    expect(xpForLevel(51)).toBe(400_000);
  });

  it('the +600 formula from Level 31 reproduces the table up to 51', () => {
    let xp = LEVEL_XP_THRESHOLDS[30]!;
    for (let level = 31; level < 51; level++) {
      xp += 9_300 + (level - 31) * 600;
      expect(xp).toBe(LEVEL_XP_THRESHOLDS[level]);
    }
  });

  it('continues past 51 with no cap (51 → 52 costs 21,300)', () => {
    expect(xpToNextLevel(51)).toBe(21_300);
    expect(xpForLevel(52)).toBe(421_300);
  });

  it('the XP needed for the next level never shrinks', () => {
    for (let level = 1; level < 80; level++) {
      expect(xpToNextLevel(level + 1)).toBeGreaterThanOrEqual(xpToNextLevel(level));
    }
  });

  it('level = highest threshold reached; one action can cross several', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(149)).toBe(1);
    expect(levelForXp(150)).toBe(2);
    expect(levelForXp(2_499)).toBe(5);
    expect(levelForXp(2_500)).toBe(6);
    expect(levelForXp(1_000_000)).toBeGreaterThan(51);
  });

  it('rejects levels below 1', () => {
    expect(() => xpForLevel(0)).toThrow(RangeError);
    expect(() => xpForLevel(1.5)).toThrow(RangeError);
  });
});
