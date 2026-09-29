import { computeCheck, outcomeForRoll, tier1Difficulty } from './check';
import { projectEnergy, spendEnergy } from './energy';
import type { EnergyProjection, EnergyState } from './energy';
import { computeRewards } from './rewards';
import type { Rng } from './rng';
import type { ActionAttempt, CheckBonus, CityRole, Outcome, Rewards, StatKey, Stats } from './types';

export interface Tier1Resolution {
  seed: string;
  attempts: ActionAttempt[];
  outcome: Outcome;
  energy: { before: EnergyProjection; after: EnergyState; cost: number; restedUsed: number };
  rewards: Rewards;
}

export type ResolveResult =
  | { ok: true; resolution: Tier1Resolution }
  | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; shortBy: number; energy: EnergyProjection };

export interface Tier1ActionInput {
  action: { energy: number; stat: StatKey; givesFxp: boolean; givesOpinion: boolean };
  cityRole: CityRole;
  stats: Stats;
  bonuses?: CheckBonus[];
  energy: EnergyState;
  now: number;
  times: 1;
}

/**
 * The one entry point the server calls for a tier-1 action: project Energy, spend it, roll once,
 * pick the outcome and work out the rewards. Same seed + same input ⇒ same resolution.
 */
export function resolveTier1Action(i: Tier1ActionInput, rng: Rng): ResolveResult {
  const before = projectEnergy(i.energy, i.now);
  const spent = spendEnergy(before, i.action.energy);
  if (!spent.ok) return { ok: false, reason: spent.reason, shortBy: spent.shortBy, energy: before };

  const check = computeCheck({
    stat: i.action.stat,
    stats: i.stats,
    difficulty: tier1Difficulty(i.cityRole),
    bonuses: i.bonuses,
  });
  const roll = rng.roll100();
  const outcome = outcomeForRoll(roll, check.chance, 1);
  const rewards = computeRewards({
    tier: 1,
    energy: i.action.energy,
    outcome,
    givesFxp: i.action.givesFxp,
    givesOpinion: i.action.givesOpinion,
    restedUsed: spent.restedUsed,
  });

  return {
    ok: true,
    resolution: {
      seed: rng.seed,
      attempts: [{ index: 1, check, roll, outcome }],
      outcome,
      energy: { before, after: spent.state, cost: i.action.energy, restedUsed: spent.restedUsed },
      rewards,
    },
  };
}
