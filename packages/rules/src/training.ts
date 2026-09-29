import { RESTED, TIER_RATES, TRAINING } from './constants';
import { projectEnergy, spendEnergy } from './energy';
import type { EnergyProjection, EnergyState } from './energy';
import { advanceOrders } from './orders';
import { flatLine } from './rewards';
import type { ActionDescriptor, OrderTemplate, OrdersState, RewardLine, TrainableStat } from './types';

/** §8.5: Energy for the next point = 20 + 2 × the stat's current value. */
export function trainingCost(statValue: number): number {
  return TRAINING.baseCost + TRAINING.costPerPoint * statValue;
}

/** Total Energy for `times` points in a row at rising costs (INT 12 ×3: 44 + 46 + 48 = 138). */
export function trainingRunCost(statValue: number, times: number): number {
  let total = 0;
  for (let n = 0; n < times; n++) total += trainingCost(statValue + n);
  return total;
}

export interface TrainingRow {
  index: number;
  from: number;
  to: number;
  cost: number;
  restedUsed: number;
  xp: RewardLine;
}

export interface TrainingResolution {
  times: number;
  stat: { stat: TrainableStat; before: number; after: number };
  rows: TrainingRow[];
  energy: { before: EnergyProjection; after: EnergyState; cost: number; restedUsed: number };
  xp: RewardLine;
  orders: { before: OrdersState; after: OrdersState; completed: string[]; allDone: boolean };
}

export type TrainingResult =
  | { ok: true; resolution: TrainingResolution }
  | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; shortBy: number; cost: number; energy: EnergyProjection };

/**
 * §8.5 training, ×1 or ×N: not a check, always succeeds, +1 stat per row at rising costs. Pays XP at
 * half the tier rate (2.25 per Energy) with the Rested bonus, nothing else. The whole run is refused
 * if Energy is short. Each row is one `training` order match.
 */
export function resolveTraining(i: {
  trains: TrainableStat;
  base: Record<TrainableStat, number>;
  energy: EnergyState;
  now: number;
  times: 1 | 3 | 5;
  orders: OrdersState;
  orderTemplates: readonly OrderTemplate[];
  homeCityId: string;
  descriptor: ActionDescriptor;
}): TrainingResult {
  const before = projectEnergy(i.energy, i.now);
  const from = i.base[i.trains];
  const cost = trainingRunCost(from, i.times);
  if (before.value < cost) {
    return { ok: false, reason: 'NOT_ENOUGH_ENERGY', shortBy: cost - before.value, cost, energy: before };
  }

  const xpPerEnergy = TIER_RATES[1].xpPerEnergy * TRAINING.xpRateShare;
  let state: EnergyState = { value: before.value, rested: before.rested, updatedAt: before.updatedAt };
  let stat = from;
  let orders = i.orders;
  let restedTotal = 0;
  const completed: string[] = [];
  let allDone = false;
  const rows: TrainingRow[] = [];

  for (let n = 1; n <= i.times; n++) {
    const rowCost = trainingCost(stat);
    const spent = spendEnergy(state, rowCost);
    if (!spent.ok) throw new Error('unreachable: the run cost was checked up front');
    state = spent.state;
    restedTotal += spent.restedUsed;
    const xp = flatLine(xpPerEnergy * rowCost, RESTED.xpBonus * (spent.restedUsed / rowCost));
    rows.push({ index: n, from: stat, to: stat + 1, cost: rowCost, restedUsed: spent.restedUsed, xp });
    stat += 1;

    const adv = advanceOrders(orders, i.orderTemplates, i.descriptor, 'success', i.homeCityId, i.now);
    orders = adv.orders;
    if (adv.completed) completed.push(adv.completed.templateId);
    if (adv.allDone) allDone = true;
  }

  const xp = rows.reduce<RewardLine>(
    (acc, r) => ({
      base: acc.base + r.xp.base,
      bonus: acc.bonus + r.xp.bonus,
      total: acc.total + r.xp.total,
    }),
    { base: 0, bonus: 0, total: 0 },
  );
  return {
    ok: true,
    resolution: {
      times: i.times,
      stat: { stat: i.trains, before: from, after: stat },
      rows,
      energy: { before, after: state, cost, restedUsed: restedTotal },
      xp,
      orders: { before: i.orders, after: orders, completed, allDone },
    },
  };
}
