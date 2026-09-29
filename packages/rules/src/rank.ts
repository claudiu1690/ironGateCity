import { RANK_FXP } from './constants';

/** §5.4: the highest Rank whose FXP threshold has been reached (1..7). */
export function rankForFxp(fxp: number): number {
  let rank = 1;
  while (rank < RANK_FXP.length && fxp >= RANK_FXP[rank]!) rank++;
  return rank;
}

/** FXP at which `rank` begins, and the next rank's threshold (null at Rank 7). */
export function rankBounds(rank: number): { floor: number; next: number | null } {
  const i = Math.min(Math.max(rank, 1), RANK_FXP.length) - 1;
  return { floor: RANK_FXP[i]!, next: i + 1 < RANK_FXP.length ? RANK_FXP[i + 1]! : null };
}
