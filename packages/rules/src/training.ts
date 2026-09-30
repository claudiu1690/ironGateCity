import { RESTED, TIER_RATES, TRAINING } from './constants';
import { projectEnergy, spendEnergy } from './energy';
import type { EnergyProjection, EnergyState } from './energy';
import { restedCapFor, trainingEnergy } from './ordinances';
import type { CityModifiers } from './ordinances';
import { advanceOrders } from './orders';
import { flatLine } from './rewards';
import type { ActionDescriptor, OrderTemplate, OrdersState, RewardLine, TrainableStat } from './types';

/** §8.5: Energy for the next point = 20 + 2 × the stat's current value. */
export function trainingCost(statValue: number): number {
  return TRAINING.baseCost + TRAINING.costPerPoint * statValue;
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
  /** Always 1: training has no batch (§8.5, content §13.2). */
  times: 1;
  stat: { stat: TrainableStat; before: number; after: number };
  /** One row: the point trained. */
  rows: TrainingRow[];
  energy: { before: EnergyProjection; after: EnergyState; cost: number; restedUsed: number };
  xp: RewardLine;
  orders: { before: OrdersState; after: OrdersState; completed: string[]; allDone: boolean };
}

export type TrainingResult =
  | { ok: true; resolution: TrainingResolution }
  | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; shortBy: number; cost: number; energy: EnergyProjection };

/**
 * §8.5 training, ×1 only (no batch: three points cost more than the 100-Energy bar holds; content
 * §13.2): not a check, always succeeds, +1 stat at the live cost. Pays XP at half the tier rate
 * (2.25 per Energy) with the Rested bonus, nothing else. Refused whole if Energy is short. The point
 * is one `training` order match.
 */
export function resolveTraining(i: {
  trains: TrainableStat;
  base: Record<TrainableStat, number>;
  energy: EnergyState;
  now: number;
  orders: OrdersState;
  orderTemplates: readonly OrderTemplate[];
  homeCityId: string;
  descriptor: ActionDescriptor;
  /** Slice 3: Reading Room Grant (training Energy −20 %) and the Rested cap. */
  modifiers?: CityModifiers;
}): TrainingResult {
  const before = projectEnergy(i.energy, i.now, undefined, restedCapFor(i.modifiers));
  const from = i.base[i.trains];
  const baseCost = trainingCost(from);
  // A cost ordinance changes the cost only: XP stays on the unmodified cost (design §17 Q11).
  const cost = trainingEnergy(baseCost, i.modifiers);
  const spent = spendEnergy(before, cost);
  if (!spent.ok) {
    return { ok: false, reason: 'NOT_ENOUGH_ENERGY', shortBy: cost - before.value, cost, energy: before };
  }

  const xpPerEnergy = TIER_RATES[1].xpPerEnergy * TRAINING.xpRateShare;
  const xp = flatLine(xpPerEnergy * baseCost, RESTED.xpBonus * (spent.restedUsed / cost));
  const row: TrainingRow = { index: 1, from, to: from + 1, cost, restedUsed: spent.restedUsed, xp };
  const adv = advanceOrders(i.orders, i.orderTemplates, i.descriptor, 'success', i.homeCityId, i.now);
  return {
    ok: true,
    resolution: {
      times: 1,
      stat: { stat: i.trains, before: from, after: from + 1 },
      rows: [row],
      energy: { before, after: spent.state, cost, restedUsed: spent.restedUsed },
      xp,
      orders: {
        before: i.orders,
        after: adv.orders,
        completed: adv.completed ? [adv.completed.templateId] : [],
        allDone: adv.allDone,
      },
    },
  };
}
