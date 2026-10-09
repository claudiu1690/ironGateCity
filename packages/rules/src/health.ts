import { HEALTH, TREATMENT } from './constants';

/**
 * Health (GDD §6.1, design §9.1, ADR 0033): max 100 + 5 a Level after the first, +10 every ten minutes from the
 * moment it falls. Stored as *damage* so a level-up never leaves a full player below full. Pure.
 */

export interface HealthTimer {
  /** Points below max, as of `at`. */
  damage: number;
  /** Epoch ms; advanced by whole ticks, so the part-tick is kept. */
  at: number;
}

/**
 * §6.1: 100, +5 for every Level after the first (Level 1: 100; Level 6: 125; Level 10: 145, the
 * design's and the GDD's pinned figures; the tech design's "100 + 5 × Level" is its Deviations' note).
 */
export const healthMax = (level: number): number => HEALTH.base + HEALTH.perLevel * Math.max(0, level - 1);

/** −10 damage per whole 10 minutes since `at`; `at` advances by whole ticks (0 damage: `at` kept). */
export function projectHealth(t: HealthTimer, now: number): HealthTimer {
  if (t.damage <= 0) return { damage: 0, at: t.at };
  const elapsed = now - t.at;
  const ticks = elapsed > 0 ? Math.floor(elapsed / HEALTH.tickMs) : 0;
  if (ticks === 0) return { ...t };
  const damage = Math.max(0, t.damage - ticks * HEALTH.regen);
  return { damage, at: t.at + ticks * HEALTH.tickMs };
}

/** Health at `now`: max − damage, never below 0. */
export function healthNow(t: HealthTimer, now: number, level: number): number {
  return Math.max(0, healthMax(level) - projectHealth(t, now).damage);
}

/** A timer that reads `value` at `at` (an admission's 30, a discharge's half or full). */
export function healthAt(value: number, level: number, at: number): HealthTimer {
  return { damage: Math.max(0, healthMax(level) - Math.max(0, value)), at };
}

/** When Health is full again, or null when it is. */
export function healthFullAt(t: HealthTimer, now: number): number | null {
  const p = projectHealth(t, now);
  if (p.damage <= 0) return null;
  return p.at + Math.ceil(p.damage / HEALTH.regen) * HEALTH.tickMs;
}

/** Review 5 (answers §8): the treatment's price for `missing` points: 0 when none, else 1 a point, at least 10. */
export function treatmentPrice(missing: number): number {
  if (missing <= 0) return 0;
  return Math.max(TREATMENT.minIron, Math.ceil(missing) * TREATMENT.perPoint);
}

/**
 * Review 5 (answers §8, tech design §6.2): *Get patched up* now. The price comes from Health
 * projected at `now` (a regen tick lowers it); the timer after is full (damage 0 at `now`).
 */
export function treat(i: {
  health: HealthTimer;
  level: number;
  iron: number;
  now: number;
}):
  | { ok: true; price: number; before: number; after: number; health: HealthTimer }
  | { ok: false; reason: 'FULL_HEALTH' | 'NOT_ENOUGH_IRON'; price: number } {
  const max = healthMax(i.level);
  const before = healthNow(i.health, i.now, i.level);
  const price = treatmentPrice(max - before);
  if (price === 0) return { ok: false, reason: 'FULL_HEALTH', price: 0 };
  if (i.iron < price) return { ok: false, reason: 'NOT_ENOUGH_IRON', price };
  return { ok: true, price, before, after: max, health: { damage: 0, at: i.now } };
}
