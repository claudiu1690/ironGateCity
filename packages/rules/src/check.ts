import { CHECK, TIER1_DIFFICULTY } from './constants';
import type {
  CheckBonus,
  CheckBreakdown,
  CheckStatSpec,
  CheckStats,
  CityRole,
  Outcome,
  Stats,
  Tier,
  TrainableStat,
} from './types';

/**
 * Review 1 (§8.4, §13.7): the best trained stat, the highest of STR, INT and AGI. Ties go to
 * `prefer` (the faction's bonus stat), then INT, then STR, then AGI.
 */
export function bestTrainedStat(
  values: Pick<Stats, 'str' | 'int' | 'agi'>,
  prefer?: TrainableStat,
): TrainableStat {
  const order: TrainableStat[] = ['int', 'str', 'agi'];
  const ranked = prefer ? [prefer, ...order.filter((s) => s !== prefer)] : order;
  let best = ranked[0]!;
  for (const s of ranked) if (values[s] > values[best]) best = s;
  return best;
}

/**
 * §8.4: Chance = 50 + 4 × (stat − difficulty) + bonuses, clamped 5..95. A two-stat check uses the
 * average of the two stats; a .5 average still gives a whole chance (4 × 0.5 = 2). A best-stat
 * check (review 1) uses the best trained stat and names it.
 */
export function computeCheck(i: {
  stats: CheckStatSpec;
  values: Stats;
  difficulty: number;
  bonuses?: CheckBonus[];
  /** For a best-stat check's tie (the faction's bonus stat). */
  prefer?: TrainableStat;
}): CheckBreakdown {
  const bonuses = i.bonuses ?? [];
  const best = i.stats[0] === 'best';
  const stats: CheckStats = best ? [bestTrainedStat(i.values, i.prefer)] : (i.stats as CheckStats);
  const statValues = stats.map((s) => i.values[s]);
  const statValue = statValues.reduce((a, b) => a + b, 0) / statValues.length;
  const statTerm = CHECK.perPoint * (statValue - i.difficulty);
  const bonusTotal = bonuses.reduce((sum, b) => sum + b.value, 0);
  const raw = CHECK.base + statTerm + bonusTotal;
  const chance = Math.min(CHECK.max, Math.max(CHECK.min, raw));
  return {
    stats: [...stats] as CheckStats,
    ...(best ? { best: true } : {}),
    statValues,
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
