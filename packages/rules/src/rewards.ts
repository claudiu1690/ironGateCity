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
  /** §13.3: council sessions pay FXP at 1.5× the tier rate. */
  fxpRateMultiplier?: number;
  /** §15.4: +25 % of the base FXP when the attempt advances an open Party order. */
  fxpBonusShare?: number;
}): Rewards {
  const rates = TIER_RATES[i.tier];
  // §6.3: Rested is spent per Energy point, so its bonus is proportional to the share it covered.
  const restedShare = i.energy > 0 ? Math.min(1, i.restedUsed / i.energy) : 0;

  const xp = line(rates.xpPerEnergy * i.energy, RESTED.xpBonus * restedShare, i.outcome);
  // FXP and influence never get the Rested bonus (§6.3); FXP gets the Party-order bonus instead.
  const fxp = i.givesFxp
    ? line(rates.fxpPerEnergy * i.energy * (i.fxpRateMultiplier ?? 1), i.fxpBonusShare ?? 0, i.outcome)
    : { ...NOTHING };
  const iron = line(rates.ironPerEnergy * i.energy, RESTED.ironBonus * restedShare, i.outcome);
  const opinion = i.givesOpinion
    ? roundOpinion(OPINION_PER_ENERGY[i.tier] * i.energy * OUTCOME_FACTOR[i.outcome])
    : 0;

  return { xp, fxp, iron, opinion };
}

/** Line-by-line sum of several attempts' rewards (the modal's tiles; opinion to three decimals). */
export function sumRewards(list: Rewards[]): Rewards {
  const add = (a: RewardLine, b: RewardLine): RewardLine => ({
    base: a.base + b.base,
    bonus: a.bonus + b.bonus,
    total: a.total + b.total,
  });
  return list.reduce<Rewards>(
    (acc, r) => ({
      xp: add(acc.xp, r.xp),
      fxp: add(acc.fxp, r.fxp),
      iron: add(acc.iron, r.iron),
      opinion: roundOpinion(acc.opinion + r.opinion),
    }),
    { xp: { ...NOTHING }, fxp: { ...NOTHING }, iron: { ...NOTHING }, opinion: 0 },
  );
}

/** A reward line with no Outcome factor (training XP: 2.25 per Energy plus the Rested bonus). */
export function flatLine(base: number, bonusShare: number): RewardLine {
  const b = roundHalfUp(base);
  const bonus = roundHalfUp(base * bonusShare);
  return { base: b, bonus, total: b + bonus };
}
