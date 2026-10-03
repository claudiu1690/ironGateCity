import { HERO } from './constants';

/**
 * The influence ledger's totals (slice-4 tech design §6.7, design §11, GDD §14.5, ADR 0028): the
 * scoreboard line, the scoreboard table and the heroes, from the per-character `contributions`
 * (amounts in thousandths of a point; `lastAt` epoch ms, the tie-break: earlier to reach it).
 */

export type Bracket = 1 | 2 | 3;

/** Design §11.3: Levels 1–15, 16–30 and 31 up. */
export const levelBracket = (level: number): Bracket => (level <= 15 ? 1 : level <= 30 ? 2 : 3);

export interface ContributionRow {
  characterId: string;
  amount: number;
  lastAt: number;
  level: number;
}

/** Larger first; on a tie the earlier to reach it. */
const ahead = (a: { amount: number; lastAt: number }, b: { amount: number; lastAt: number }) =>
  b.amount - a.amount || a.lastAt - b.lastAt;

/**
 * Design §11.2: *This election you've moved Eastside +1.3 for the Collective (2nd of 7)*: the swing
 * in points, the rank among every contributor (any faction) and how many there are. Null when the
 * player moved nothing here this election.
 */
export function scoreboardLine(
  mine: { amount: number; lastAt: number } | null,
  all: ReadonlyArray<{ amount: number; lastAt: number }>,
): { swing: number; rank: number; of: number } | null {
  if (!mine || mine.amount === 0) return null;
  const higher = all.filter((r) => ahead(r, mine) < 0).length;
  return { swing: mine.amount / 1_000, rank: higher + 1, of: Math.max(all.length, higher + 1) };
}

/**
 * Design §11.3: per bracket, the top contributor of the cycle is the hero, if at least +0.5 (500
 * thousandths). Ties: the earlier to reach the total.
 */
export function heroes(
  rows: readonly ContributionRow[],
): Array<{ bracket: Bracket; characterId: string; amount: number }> {
  const out: Array<{ bracket: Bracket; characterId: string; amount: number }> = [];
  for (const bracket of [1, 2, 3] as const) {
    const top = rows.filter((r) => levelBracket(r.level) === bracket).sort(ahead)[0];
    if (top && top.amount >= HERO.minSwing * 1_000)
      out.push({ bracket, characterId: top.characterId, amount: top.amount });
  }
  return out;
}

/** Screens §9.2: the top `n` of each bracket that has contributors, brackets in order. */
export function topByBracket<T extends ContributionRow>(
  rows: readonly T[],
  n = 3,
): Array<{ bracket: Bracket; rows: T[] }> {
  const out: Array<{ bracket: Bracket; rows: T[] }> = [];
  for (const bracket of [1, 2, 3] as const) {
    const top = rows
      .filter((r) => levelBracket(r.level) === bracket)
      .sort(ahead)
      .slice(0, n);
    if (top.length > 0) out.push({ bracket, rows: top });
  }
  return out;
}
