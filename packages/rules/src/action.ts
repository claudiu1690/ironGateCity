import { computeCheck, outcomeForRoll, tier1Difficulty } from './check';
import { DIRECTIVES, FXP_TYPE_MULTIPLIER } from './constants';
import { projectEnergy, spendEnergy } from './energy';
import { pointsFor, issueTags } from './issues';
import {
  NO_MODIFIERS,
  actionEnergy,
  ordinanceCheckBonuses,
  placeCheckBonuses,
  placeOf,
  restedCapFor,
  rivalGroundIn,
  rewardShares,
  standingPerSuccess,
  swingFactors,
  swingMultiplier,
} from './ordinances';
import type { Modifiers, SwingFactor } from './ordinances';
import type { EnergyProjection, EnergyState } from './energy';
import { advanceOrders, itemSpec, orderMatches } from './orders';
import { perkCanvassEnergy, personalShares } from './personal';
import type { PersonalModifiers } from './personal';
import type { MatchCtx } from './orders';
import { computeRewards, sumRewards } from './rewards';
import type { Rng } from './rng';
import { standingBonus, standingView } from './standing';
import type {
  ActionAttempt,
  ActionDescriptor,
  CheckBonus,
  CheckStatSpec,
  CityRole,
  FactionId,
  OrderTemplate,
  OrdersState,
  Outcome,
  Rewards,
  Stats,
  TrainableStat,
} from './types';

export interface Tier1Attempt extends ActionAttempt {
  rewards: Rewards;
  restedUsed: number;
  /** The Party order this row advanced (it got the +25 % FXP). */
  orderId: string | null;
  /** Slice 4 (ADR 0029): the momentum this row adds to each tagged Issue (0 untagged); at a place only. */
  points?: number;
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
  /**
   * Slice 4 (ADR 0029, 0030): the live Issues tagging this action, the run's momentum for each (the
   * sum of the rows' points) and the swing's named factors (empty outside a place).
   */
  issues?: Array<{ docId: string; issueId: string; name: string; points: number }>;
  opinionFactors?: SwingFactor[];
  /**
   * Slice 5 (ADR 0034): on rival ground the swing is taken **against** the home faction, under the
   * day's cap (`cap`: the points it can still lose today); absent elsewhere (persuasion).
   */
  opinion?: { mode: 'against'; target: FactionId; cap: number };
}

export type ResolveResult =
  | { ok: true; resolution: Tier1Resolution }
  | {
      ok: false;
      /** Slice 5 (design §11.2): ×1 only on rival ground. */
      reason: 'NOT_ENOUGH_ENERGY' | 'ONCE_ON_RIVAL_GROUND';
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
    stats: CheckStatSpec;
    givesFxp: boolean;
    givesOpinion: boolean;
    /** Slice 4: the location's quarter (a capital district) and kind, for Issue feeds and orders. */
    districtId?: string;
    locationKind?: string;
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
  /** Slice 1–3: the home city, where `cityId: 'home'` orders point. */
  homeCityId: string;
  /** Slice 4 (ADR 0026): the residence, where `'home'` orders point; wins over `homeCityId`. */
  residence?: MatchCtx;
  /** Slice 4: the actor's faction (a comeback is only its own). */
  factionId?: FactionId;
  /** The First day row (review 1); items, weather: later slices. */
  bonuses?: CheckBonus[];
  /** A best-stat check's tie-break: the faction's bonus stat (review 1). */
  prefer?: TrainableStat;
  /**
   * Slice 3 (ADR 0021): the ordinance in force and morale in the action's city. Slice 4 (ADR 0030):
   * the place's sources, close race, comeback and live Issues.
   */
  modifiers?: Modifiers;
  /** Slice 4 (ADR 0030 §5): the Rested cap of the residence and the room; default from `modifiers`. */
  restedCap?: number;
  /**
   * Slice 5 (ADR 0032 §1): every row's outcome forced to Partial, rolling the same rolls: the
   * *dropped twin* of a rival-ground tap that a Run or a loss drops to Partial.
   */
  forceOutcome?: 'partial';
  /** Slice 5 (test hooks, tech design §8.5): the first row's roll. */
  forceRoll?: number;
  /** Review 5 (test hooks, tech design §4.3): each row's roll in order (row n takes `forceRolls[n − 1]`). */
  forceRolls?: readonly number[];
  /**
   * Slice 8 (ADR 0052, 0088; T9): what is worn, the perks and the bar's buffs: the Party XP parts,
   * the buff shares and *A shorter walk*. The item rows come in through `bonuses` (as the ticket's).
   */
  personal?: PersonalModifiers;
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
  const before = projectEnergy(i.energy, i.now, undefined, i.restedCap ?? restedCapFor(m));
  // Cost ordinances change the cost only (ADR 0021 §3): rewards stay on the content Energy.
  // Slice 8 (T9): *A shorter walk* (canvass −1 a level), never below 1.
  const perRow = actionEnergy(
    i.action.energy,
    i.action.type,
    m,
    i.personal ? perkCanvassEnergy(i.personal.perks, i.action.type) : 0,
  );
  const cost = perRow * i.times;
  const rival = rivalGroundIn(m);
  if (rival && i.times > 1) {
    return { ok: false, reason: 'ONCE_ON_RIVAL_GROUND', shortBy: 0, cost, energy: before };
  }
  if (before.value < cost) {
    return { ok: false, reason: 'NOT_ENOUGH_ENERGY', shortBy: cost - before.value, cost, energy: before };
  }

  const difficulty = tier1Difficulty(i.cityRole);
  const home = i.residence ?? i.homeCityId;
  // ADR 0034 §3: the orders cannot be done on rival ground.
  const ctx: MatchCtx = rival
    ? { ...(typeof home === 'string' ? { cityId: home, districtId: null } : home), rivalGround: true }
    : home;
  const place = placeOf(m);
  const untagged: ActionDescriptor = {
    kind: 'checked',
    actionId: i.action.id,
    type: i.action.type,
    locationId: i.action.locationId,
    cityId: i.action.cityId,
    ...(i.action.districtId !== undefined ? { districtId: i.action.districtId } : {}),
    ...(i.action.locationKind !== undefined ? { locationKind: i.action.locationKind } : {}),
  };
  // ADR 0029: the live Issues whose feeds this action matches (the city's own Issues).
  const tagged = place ? issueTags(place.issues, untagged) : [];
  const descriptor: ActionDescriptor =
    tagged.length > 0 ? { ...untagged, issueIds: tagged.map((t) => t.issueId) } : untagged;
  const fxpRateMultiplier = FXP_TYPE_MULTIPLIER[i.action.type] ?? 1;
  const placeShares = rewardShares({ type: i.action.type, givesFxp: i.action.givesFxp, m });
  // Slice 8 (T9, ADR 0052, 0088): the personal parts after the place's, each its own line.
  const own = personalShares(i.personal, 'action', i.now);
  const shares = {
    fxp: [...placeShares.fxp, ...own.fxp],
    xp: [...placeShares.xp, ...own.xp],
    iron: [...placeShares.iron, ...own.iron],
  };
  const ordinanceBonuses = [
    ...ordinanceCheckBonuses(i.action.type, m),
    ...placeCheckBonuses(i.action.type, m),
  ];
  const perSuccess = standingPerSuccess(m);
  // Slice 3's callers (no place) keep the single multiplier and their stored shape; a place names
  // every factor (ADR 0030 §4).
  const factors = place ? swingFactors(i.action.type, i.factionId ?? null, m, tagged) : [];
  const swing = place ? 1 : swingMultiplier(i.action.type, m);

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
      ...(i.prefer ? { prefer: i.prefer } : {}),
    });
    const drawn = rng.roll100();
    const roll = i.forceRolls?.[n - 1] ?? (n === 1 && i.forceRoll !== undefined ? i.forceRoll : drawn);
    const outcome = i.forceOutcome ?? outcomeForRoll(roll, check.chance, 1);

    const adv = advanceOrders(orders, i.orderTemplates, descriptor, outcome, ctx, i.now);
    const bonusApplies =
      adv.advanced !== null ||
      (!DIRECTIVES.bonusOnlyWhileOpen && matchesAnyOrder(orders, i.orderTemplates, descriptor, ctx));
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
      // Slice 7 (ADR 0044): a law's `xpPct` (scope actions) as a part on the XP base.
      ...(shares.xp.length > 0 ? { xpShares: shares.xp } : {}),
      swingMultiplier: swing,
      ...(factors.length > 0 ? { opinionFactors: factors } : {}),
    });
    orders = adv.orders;
    if (adv.completed) completed.push(adv.completed.templateId);
    if (adv.allDone) allDone = true;
    // Street Register counts each Success twice, inside the loop so a later row sees it (ADR 0021 §6).
    if (outcome === 'success') successes += perSuccess;

    attempts.push({
      index: n,
      check,
      roll,
      outcome,
      rewards,
      restedUsed: spent.restedUsed,
      orderId: adv.advanced?.templateId ?? null,
      // §14.6: the content Energy, half up on a Partial (design §19 Q9, Q10).
      ...(place ? { points: tagged.length > 0 ? pointsFor(i.action.energy, outcome) : 0 } : {}),
    });
  }
  const runPoints = attempts.reduce((sum, a) => sum + (a.points ?? 0), 0);

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
      ...(place
        ? {
            issues: tagged.map((t) => ({
              docId: t.docId,
              issueId: t.issueId,
              name: t.name,
              points: runPoints,
            })),
            opinionFactors: factors,
          }
        : {}),
      ...(rival ? { opinion: { mode: 'against' as const, target: rival.homeFactionId, cap: rival.pressureLeft } } : {}),
    },
  };
}

function matchesAnyOrder(
  o: OrdersState,
  templates: readonly OrderTemplate[],
  a: ActionDescriptor,
  ctx: MatchCtx,
): boolean {
  return o.items.some((item) => {
    const t = templates.find((x) => x.id === item.templateId);
    return t ? orderMatches(itemSpec(item, t).match, a, ctx) : false;
  });
}
