import { OPINION_DECIMALS, OPINION_PER_ENERGY, OUTCOME_FACTOR, RESTED, TIER_RATES } from './constants';
import type { Outcome, RewardLine, Rewards } from './types';

/** Nearest whole number, halves up (§5.5). The epsilon absorbs float noise such as 22.499999999. */
export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5 + 1e-9);
}

/** Opinion keeps a fixed number of decimals (§14.2). */
export function roundOpinion(x: number): number {
  const f = 10 ** OPINION_DECIMALS;
  return Math.round(x * f + 1e-9) / f;
}

/**
 * One reward line (§5.5): worked out in full precision, then base and bonus rounded separately so
 * the tiles add up. A line that pays on a Success pays at least 1 on a Partial.
 */
function line(successBase: number, bonusShare: number, outcome: Outcome): RewardLine {
  const full = successBase * OUTCOME_FACTOR[outcome];
  let base = roundHalfUp(full);
  if (outcome === 'partial' && successBase > 0) base = Math.max(1, base);
  const bonus = roundHalfUp(full * bonusShare);
  return { base, bonus, total: base + bonus };
}

const NOTHING: RewardLine = { base: 0, bonus: 0, total: 0 };

export function computeRewards(i: {
  tier: 1;
  energy: number;
  outcome: Outcome;
  givesFxp: boolean;
  givesOpinion: boolean;
  restedUsed: number;
}): Rewards {
  const rates = TIER_RATES[i.tier];
  // §6.3: Rested is spent per Energy point, so its bonus is proportional to the share it covered.
  const restedShare = i.energy > 0 ? Math.min(1, i.restedUsed / i.energy) : 0;

  const xp = line(rates.xpPerEnergy * i.energy, RESTED.xpBonus * restedShare, i.outcome);
  // FXP and influence never get the Rested bonus (§6.3).
  const fxp = i.givesFxp ? line(rates.fxpPerEnergy * i.energy, 0, i.outcome) : { ...NOTHING };
  const iron = line(rates.ironPerEnergy * i.energy, RESTED.ironBonus * restedShare, i.outcome);
  const opinion = i.givesOpinion
    ? roundOpinion(OPINION_PER_ENERGY[i.tier] * i.energy * OUTCOME_FACTOR[i.outcome])
    : 0;

  return { xp, fxp, iron, opinion };
}
