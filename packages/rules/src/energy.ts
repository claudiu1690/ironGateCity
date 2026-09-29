import { ENERGY, RESTED } from './constants';

/** Lazy timer state (§6.2, §6.3): stored value + timestamp, projected on read. */
export interface EnergyState {
  value: number;
  rested: number;
  /** Epoch ms. Only ever advanced by whole ticks, so the part-tick remainder is kept. */
  updatedAt: number;
}

export interface EnergyProjection extends EnergyState {
  max: number;
  /** When the next +5 lands, or null when Energy is full. */
  nextTickAt: number | null;
  /** When Energy reaches max, or null when it already has. */
  fullAt: number | null;
}

/**
 * Energy at `now`: +5 per whole 10-minute tick up to max; what would overflow a full bar goes to
 * Rested, up to its cap. Pure: never reads a clock.
 */
export function projectEnergy(state: EnergyState, now: number, max: number = ENERGY.max): EnergyProjection {
  const elapsed = now - state.updatedAt;
  const ticks = elapsed > 0 ? Math.floor(elapsed / ENERGY.tickMs) : 0;
  const gain = ticks * ENERGY.regenPerTick;

  let value: number;
  let overflow: number;
  if (state.value >= max) {
    // Already full (or above max from a bonus): every tick overflows and nothing is taken away.
    value = state.value;
    overflow = gain;
  } else {
    value = Math.min(max, state.value + gain);
    overflow = state.value + gain - value;
  }
  const rested = Math.min(RESTED.cap, state.rested + overflow);
  const updatedAt = state.updatedAt + ticks * ENERGY.tickMs;

  const full = value >= max;
  const nextTickAt = full ? null : updatedAt + ENERGY.tickMs;
  const fullAt = full ? null : updatedAt + Math.ceil((max - value) / ENERGY.regenPerTick) * ENERGY.tickMs;

  return { value, rested, updatedAt, max, nextTickAt, fullAt };
}

export type SpendResult =
  | { ok: true; state: EnergyState; restedUsed: number }
  | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; shortBy: number };

/**
 * Spend `cost` Energy from a projection. Each Energy point spent while Rested > 0 uses one Rested
 * point (§6.3), so `restedUsed = min(rested, cost)`.
 */
export function spendEnergy(p: EnergyProjection, cost: number): SpendResult {
  if (p.value < cost) {
    return { ok: false, reason: 'NOT_ENOUGH_ENERGY', shortBy: cost - p.value };
  }
  const restedUsed = Math.min(p.rested, cost);
  return {
    ok: true,
    restedUsed,
    state: { value: p.value - cost, rested: p.rested - restedUsed, updatedAt: p.updatedAt },
  };
}
