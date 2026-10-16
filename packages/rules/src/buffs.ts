import { BAR } from './constants';

/**
 * The bar's buffs (tech design §24.5, ADR 0088; design §24.3): lazy state on the character. Well fed
 * is value + time (`until`); in good spirits is a count of missions, spent one per mission that
 * reaches its rewards (§24.10 Q3), waiting while away.
 */

export type MealTier = 'plate' | 'dinner';

export interface Buffs {
  wellFed: { tier: MealTier; until: number } | null;
  /** Missions left in good spirits (0 to 9). */
  spirits: number;
}

export const NO_BUFFS: Buffs = { wellFed: null, spirits: 0 };

/** The meal counting at `at`, or null. */
export const wellFedAt = (b: Buffs, at: number): MealTier | null =>
  b.wellFed !== null && at < b.wellFed.until ? b.wellFed.tier : null;

export type RoundRefusal = 'ROUNDS_TODAY' | 'SPIRITS_FULL' | 'NOT_ENOUGH_ENERGY' | 'NOT_ENOUGH_IRON';

/** Design §24.3 (§24.10 Q2): three rounds a day; refused only at nine in hand. */
export function roundGate(i: {
  rounds: number;
  spirits: number;
  energy: number;
  iron: number;
}): null | { reason: RoundRefusal } {
  if (i.rounds >= BAR.round.perDay) return { reason: 'ROUNDS_TODAY' };
  if (i.spirits >= BAR.round.max) return { reason: 'SPIRITS_FULL' };
  if (i.energy < BAR.energy) return { reason: 'NOT_ENOUGH_ENERGY' };
  if (i.iron < BAR.round.iron) return { reason: 'NOT_ENOUGH_IRON' };
  return null;
}

export type MealRefusal = 'WELL_FED' | 'NOT_DRESSED' | 'NOT_ENOUGH_ENERGY' | 'NOT_ENOUGH_IRON';

/**
 * Design §24.3: a plate is refused while any meal counts; dinner while a dinner counts (it replaces a
 * plate) and needs worn Charisma 10.
 */
export function mealGate(i: {
  tier: MealTier;
  current: MealTier | null;
  until: number | null;
  wornCha: number;
  energy: number;
  iron: number;
}): null | { reason: MealRefusal; until?: number; need?: number } {
  if (i.current !== null && (i.tier === 'plate' || i.current === 'dinner'))
    return { reason: 'WELL_FED', ...(i.until !== null ? { until: i.until } : {}) };
  if (i.tier === 'dinner' && i.wornCha < BAR.dinner.cha)
    return { reason: 'NOT_DRESSED', need: BAR.dinner.cha };
  if (i.energy < BAR.energy) return { reason: 'NOT_ENOUGH_ENERGY' };
  if (i.iron < BAR[i.tier].iron) return { reason: 'NOT_ENOUGH_IRON', need: BAR[i.tier].iron };
  return null;
}

export const afterRound = (b: Buffs): Buffs => ({
  ...b,
  spirits: Math.min(BAR.round.max, b.spirits + BAR.round.missions),
});
export const afterMeal = (b: Buffs, tier: MealTier, now: number): Buffs => ({
  ...b,
  wellFed: { tier, until: now + BAR[tier].hours * 3_600_000 },
});
/** Through `healHealth`: never above max (design §24.7 #5). */
export const mealHealth = (tier: MealTier): number => BAR[tier].health;
