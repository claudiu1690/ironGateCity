import { LEVEL_XP_STEP, LEVEL_XP_THRESHOLDS } from './constants';

const LAST_TABLE_LEVEL = LEVEL_XP_THRESHOLDS.length; // 51

/** §5.3: cumulative XP at which `level` is reached (Level 1 = 0). There is no cap. */
export function xpForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new RangeError(`Level must be an integer >= 1, got ${level}`);
  }
  if (level <= LAST_TABLE_LEVEL) return LEVEL_XP_THRESHOLDS[level - 1]!;
  let xp: number = LEVEL_XP_THRESHOLDS[LAST_TABLE_LEVEL - 1]!;
  for (let l = LAST_TABLE_LEVEL; l < level; l++) xp += xpToNextLevel(l);
  return xp;
}

/** XP needed to go from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  if (level >= LEVEL_XP_STEP.fromLevel) {
    return LEVEL_XP_STEP.firstStep + (level - LEVEL_XP_STEP.fromLevel) * LEVEL_XP_STEP.growth;
  }
  return xpForLevel(level + 1) - xpForLevel(level);
}

/** §5.3: the highest level whose threshold `xp` has reached. */
export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}
