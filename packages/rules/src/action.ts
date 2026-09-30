import { computeCheck, outcomeForRoll, tier1Difficulty } from './check';
import { DIRECTIVES, FXP_TYPE_MULTIPLIER } from './constants';
import { projectEnergy, spendEnergy } from './energy';
import {
  NO_MODIFIERS,
  actionEnergy,
  ordinanceCheckBonuses,
  restedCapFor,
  rewardShares,
  standingPerSuccess,
  swingMultiplier,
} from './ordinances';
import type { CityModifiers } from './ordinances';
import type { EnergyProjection, EnergyState } from './energy';
import { advanceOrders, itemSpec, orderMatches } from './orders';
import { computeRewards, sumRewards } from './rewards';
import type { Rng } from './rng';
import { standingBonus, standingView } from './standing';
import type {
  ActionAttempt,
  ActionDescriptor,
  CheckBonus,
  CheckStats,
  CityRole,
  OrderTemplate,
  OrdersState,
  Outcome,
  Rewards,
  Stats,
} from './types';

export interface Tier1Attempt extends ActionAttempt {
  rewards: Rewards;
  restedUsed: number;
  /** The Party order this row advanced (it got the +25 % FXP). */
  orderId: string | null;
}

export interface Tier1Resolution {
  seed: string;
  times: number;
  attempts: Tier1Attempt[];
  /** ×1: Success or Partial. A batch always stamps "n of N" (designer answer §12 Q5). */
  summary: { stamp: 'success' | 'partial' | 'batch'; successes: number };
  /** `cost` and `restedUsed` are the run's totals. */
  energy: { before: EnergyProjection; after: EnergyState; cost: number; restedUsed: number };
  /** Per-line sums of the rows. */
  rewards: Rewards;
  /** Local Standing Successes in this city. */
  standing: { before: number; after: number };
  /** `completed` lists the order ids this run completed; `allDone` if it completed the third. */
  orders: { before: OrdersState; after: OrdersState; completed: string[]; allDone: boolean };
}

export type ResolveResult =
  | { ok: true; resolution: Tier1Resolution }
  | {
      ok: false;
      reason: 'NOT_ENOUGH_ENERGY';
      shortBy: number;
      /** The run's total cost. */
      cost: number;
      energy: EnergyProjection;
    };

export interface Tier1ActionInput {
  action: {
    id: string;
    type: string;
    locationId: string;
    cityId: string;
    energy: number;
    stats: CheckStats;
    givesFxp: boolean;
    givesOpinion: boolean;
  };
  cityRole: CityRole;
  values: Stats;
  energy: EnergyState;
  now: number;
  times: 1 | 3 | 5;
  /** Successes so far in this city; `names` are the five level names; label "Known in Coalport". */
  standing: { successes: number; names: readonly string[]; cityName: string };
  orders: OrdersState;
  orderTemplates: readonly OrderTemplate[];
  homeCityId: string;
  /** Items, weather: later slices. */
  bonuses?: CheckBonus[];
  /** Slice 3 (ADR 0021): the ordinance in force and morale in the action's city. */
  modifiers?: CityModifiers;
}

/** Stamp for a run of checked attempts (ADR 0006, GDD §13.1): ×1 by outcome, a batch "n of N". */
export function summarise(outcomes: Outcome[]): Tier1Resolution['summary'] {
  const successes = outcomes.filter((o) => o === 'success').length;
  if (outcomes.length > 1) return { stamp: 'batch', successes };
  return { stamp: successes === 1 ? 'success' : 'partial', successes };
}

/** GDD §13.1 (designer answer §12 Q5): the success text when more than half the rows succeeded. */
export function usesSuccessText(successes: number, times: number): boolean {
  return successes * 2 > times;
}

/**
 * The one entry point for a checked tier-1 action, ×1 or ×N (ADR 0006): project Energy once,
 * refuse the whole run if it is short, then resolve each row in order against evolving Energy,
 * Rested, Local Standing and Party orders, one roll per row from one seed.
 * Same seed + same input ⇒ identical resolution.
 */
export function resolveTier1Action(i: Tier1ActionInput, rng: Rng): ResolveResult {
  const m = i.modifiers ?? NO_MODIFIERS;
  const before = projectEnergy(i.energy, i.now, undefined, restedCapFor(m));
  // Cost ordinances change the cost only (ADR 0021 §3): rewards stay on the content Energy.
  const perRow = actionEnergy(i.action.energy, i.action.type, m);
  const cost = perRow * i.times;
  if (before.value < cost) {
    return { ok: false, reason: 'NOT_ENOUGH_ENERGY', shortBy: cost - before.value, cost, energy: before };
  }

  const difficulty = tier1Difficulty(i.cityRole);
  const descriptor: ActionDescriptor = {
    kind: 'checked',
    actionId: i.action.id,
    type: i.action.type,
    locationId: i.action.locationId,
    cityId: i.action.cityId,
  };
  const fxpRateMultiplier = FXP_TYPE_MULTIPLIER[i.action.type] ?? 1;
  const shares = rewardShares({ type: i.action.type, givesFxp: i.action.givesFxp, m });
  const ordinanceBonuses = ordinanceCheckBonuses(i.action.type, m);
  const perSuccess = standingPerSuccess(m);
  const swing = swingMultiplier(i.action.type, m);

  let state: EnergyState = { value: before.value, rested: before.rested, updatedAt: before.updatedAt };
  let successes = i.standing.successes;
  let orders = i.orders;
  const completed: string[] = [];
  let allDone = false;
  let restedTotal = 0;
  const attempts: Tier1Attempt[] = [];

  for (let n = 1; n <= i.times; n++) {
    const spent = spendEnergy(state, perRow);
    if (!spent.ok) throw new Error('unreachable: the run cost was checked up front');
    state = spent.state;
    restedTotal += spent.restedUsed;

    const label = `${i.standing.names[standingView(successes).level] ?? 'Known'} in ${i.standing.cityName}`;
    const standing = standingBonus(successes, label);
    const check = computeCheck({
      stats: i.action.stats,
      values: i.values,
      difficulty,
      bonuses: [...(i.bonuses ?? []), ...(standing ? [standing] : []), ...ordinanceBonuses],
    });
    const roll = rng.roll100();
    const outcome = outcomeForRoll(roll, check.chance, 1);

    const adv = advanceOrders(orders, i.orderTemplates, descriptor, outcome, i.homeCityId, i.now);
    const bonusApplies =
      adv.advanced !== null ||
      (!DIRECTIVES.bonusOnlyWhileOpen && matchesAnyOrder(orders, i.orderTemplates, descriptor, i.homeCityId));
    const rewards = computeRewards({
      tier: 1,
      energy: i.action.energy,
      outcome,
      givesFxp: i.action.givesFxp,
      givesOpinion: i.action.givesOpinion,
      restedUsed: spent.restedUsed,
      costPaid: perRow,
      fxpRateMultiplier,
      fxpBonusShare: bonusApplies ? DIRECTIVES.matchFxpBonus : 0,
      fxpShares: shares.fxp,
      ironShares: shares.iron,
      swingMultiplier: swing,
    });
    orders = adv.orders;
    if (adv.completed) completed.push(adv.completed.templateId);
    if (adv.allDone) allDone = true;
    // Ward Register counts each Success twice, inside the loop so a later row sees it (ADR 0021 §6).
    if (outcome === 'success') successes += perSuccess;

    attempts.push({
      index: n,
      check,
      roll,
      outcome,
      rewards,
      restedUsed: spent.restedUsed,
      orderId: adv.advanced?.templateId ?? null,
    });
  }

  return {
    ok: true,
    resolution: {
      seed: rng.seed,
      times: i.times,
      attempts,
      summary: summarise(attempts.map((a) => a.outcome)),
      energy: { before, after: state, cost, restedUsed: restedTotal },
      rewards: sumRewards(attempts.map((a) => a.rewards)),
      standing: { before: i.standing.successes, after: successes },
      orders: { before: i.orders, after: orders, completed, allDone },
    },
  };
}

function matchesAnyOrder(
  o: OrdersState,
  templates: readonly OrderTemplate[],
  a: ActionDescriptor,
  homeCityId: string,
): boolean {
  return o.items.some((item) => {
    const t = templates.find((x) => x.id === item.templateId);
    return t ? orderMatches(itemSpec(item, t).match, a, homeCityId) : false;
  });
}
