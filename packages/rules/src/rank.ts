import { RANK_FXP, RANK_OPENS } from './constants';
import type { RankRowView } from './types';

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

/**
 * Review 4 #25 (answers §25, GDD §5.4): the faction's ladder, seven rows: the title (content), the
 * Party XP floor (`RANK_FXP`) and what the rank opens (a key; the words are `copy.ranks.opens`).
 */
export function rankLadder(titles: readonly string[]): RankRowView[] {
  return RANK_FXP.map((fxp, i) => ({
    rank: i + 1,
    title: titles[i] ?? `Rank ${i + 1}`,
    fxp,
    opens: RANK_OPENS[i]!,
  }));
}
