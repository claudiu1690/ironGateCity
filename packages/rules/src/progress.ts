import { LEVEL_UP, PC } from './constants';
import { levelForXp } from './levels';
import { rankForFxp } from './rank';

/** The progression fields every gain touches (stored on the character). */
export interface Progress {
  xp: number;
  level: number;
  fxp: number;
  rank: number;
  pc: number;
  statPointsPending: number;
}

export interface GainsResult {
  next: Progress;
  levelUp: { from: number; to: number; statPoints: number } | null;
  rankUp: { from: number; to: number } | null;
}

/**
 * Add XP, FXP and PC, then apply level-ups (§5.3: one action can cross several; each gives one
 * stat point) and Rank (§5.4). Levels and Rank never go down; PC is capped at 1,000 (§6.5).
 */
export function applyGains(p: Progress, g: { xp: number; fxp: number; pc: number }): GainsResult {
  const xp = p.xp + g.xp;
  const fxp = p.fxp + g.fxp;
  const level = Math.max(p.level, levelForXp(xp));
  const rank = Math.max(p.rank, rankForFxp(fxp));
  const pc = Math.max(p.pc, Math.min(PC.cap, p.pc + g.pc));
  const gained = level - p.level;
  const statPoints = gained * LEVEL_UP.statPoints;
  return {
    next: { xp, level, fxp, rank, pc, statPointsPending: p.statPointsPending + statPoints },
    levelUp: gained > 0 ? { from: p.level, to: level, statPoints } : null,
    rankUp: rank > p.rank ? { from: p.rank, to: rank } : null,
  };
}
