import { CHECK, TIER1_DIFFICULTY } from './constants';
import type { CheckBonus, CheckBreakdown, CityRole, Outcome, StatKey, Stats, Tier } from './types';

/** §8.4: Chance = 50 + 4 × (stat − difficulty) + bonuses, clamped 5..95. */
export function computeCheck(i: {
  stat: StatKey;
  stats: Stats;
  difficulty: number;
  bonuses?: CheckBonus[];
}): CheckBreakdown {
  const bonuses = i.bonuses ?? [];
  const statValue = i.stats[i.stat];
  const statTerm = CHECK.perPoint * (statValue - i.difficulty);
  const bonusTotal = bonuses.reduce((sum, b) => sum + b.value, 0);
  const raw = CHECK.base + statTerm + bonusTotal;
  const chance = Math.min(CHECK.max, Math.max(CHECK.min, raw));
  return {
    stat: i.stat,
    statValue,
    difficulty: i.difficulty,
    base: CHECK.base,
    statTerm,
    bonuses: bonuses.map((b) => ({ ...b })),
    bonusTotal,
    raw,
    chance,
  };
}

/** §8.4: 8 in a home city, 10 in a battleground. */
export function tier1Difficulty(cityRole: CityRole): number {
  return TIER1_DIFFICULTY[cityRole];
}

/**
 * §8.4: a roll at or below the chance is a Success; up to 20 above is a Partial; beyond that a
 * tier-1 action is still a Partial and tiers 2–3 fail.
 */
export function outcomeForRoll(roll: number, chance: number, tier: Tier): Outcome {
  if (roll <= chance) return 'success';
  if (roll <= chance + CHECK.partialWindow) return 'partial';
  return tier === 1 ? 'partial' : 'failure';
}
