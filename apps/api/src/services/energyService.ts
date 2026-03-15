/**
 * Energy Service
 *
 * Energy is NEVER stored as a static value.
 * It is always computed from lastTickAt + elapsed time.
 *
 * Redis storage: HASH at key `energy:{characterId}`
 *   Fields: current (int), max (int), lastTickAt (unix ms)
 *
 * Postgres (EnergyState) is the source of truth for cold-start / persistence.
 * Redis is the live cache. A background job persists Redis → Postgres every minute.
 */

import { redis } from '../lib/redis.js';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { pushEnergyUpdate } from '../socket/index.js';

const ENERGY_KEY = (characterId: string) => `energy:${characterId}`;
const REGEN_PER_TICK = 5;   // energy points per tick
const TICK_MS = 300_000;    // tick interval: 5 minutes
const REDIS_TTL_S = 28_800; // 8 hours

export interface EnergySnapshot {
  current: number;
  max: number;
  lastTickAt: number; // unix ms
}

// ─── §5.2 Authoritative getEnergy Pattern ────────────────────────────────────

/**
 * Returns the current computed energy for a character.
 * Falls back to Postgres on cache miss and seeds Redis.
 */
export async function getEnergy(characterId: string): Promise<EnergySnapshot> {
  const cached = await redis.hgetall(ENERGY_KEY(characterId));

  if (!cached.lastTickAt) {
    // Cold start — load from Postgres, seed Redis
    const state = await prisma.energyState.findUnique({ where: { characterId } });
    if (!state) throw new AppError(404, 'Energy record not found for character.', ErrorCode.NOT_FOUND);

    await redis.hset(ENERGY_KEY(characterId), {
      current: state.current,
      max: state.max,
      lastTickAt: Date.now(),
    });
    await redis.expire(ENERGY_KEY(characterId), REDIS_TTL_S);

    return { current: state.current, max: state.max, lastTickAt: Date.now() };
  }

  const current = parseInt(cached.current, 10);
  const max = parseInt(cached.max, 10);
  const lastTickAt = parseInt(cached.lastTickAt, 10);

  const elapsed = Date.now() - lastTickAt;
  const gained = Math.floor(elapsed / TICK_MS) * REGEN_PER_TICK;
  const computed = Math.min(current + gained, max);

  return { current: computed, max, lastTickAt };
}

/**
 * Deducts energy from the Redis hash.
 * Writes to Postgres asynchronously (non-blocking) per spec §5.2.
 * Throws 400 if insufficient.
 */
export async function deductEnergy(characterId: string, amount: number): Promise<void> {
  const { current, max } = await getEnergy(characterId);

  if (current < amount) {
    throw AppError.insufficientEnergy(current, amount);
  }

  const newValue = current - amount;
  const now = Date.now();

  await redis.hset(ENERGY_KEY(characterId), {
    current: newValue,
    lastTickAt: now,
  });
  await redis.expire(ENERGY_KEY(characterId), REDIS_TTL_S);

  // Non-blocking Postgres persist (spec §5.2: "asynchronously, non-blocking")
  prisma.energyState
    .update({ where: { characterId }, data: { current: newValue, lastTickAt: new Date(now) } })
    .catch(console.error);
}

/**
 * Adds energy (e.g. from pack purchase), capped at max.
 * Persists synchronously since it is triggered by a payment event.
 */
export async function addEnergy(characterId: string, amount: number): Promise<EnergySnapshot> {
  const { current, max } = await getEnergy(characterId);
  const newCurrent = Math.min(max, current + amount);
  const now = Date.now();

  await redis.hset(ENERGY_KEY(characterId), { current: newCurrent, lastTickAt: now });
  await redis.expire(ENERGY_KEY(characterId), REDIS_TTL_S);

  await prisma.energyState.update({
    where: { characterId },
    data: { current: newCurrent, lastTickAt: new Date(now) },
  });

  return { current: newCurrent, max, lastTickAt: now };
}

/**
 * Updates the max energy cap (Premium upgrade / downgrade).
 */
export async function setMaxEnergy(characterId: string, newMax: number): Promise<void> {
  const { current } = await getEnergy(characterId);
  const cappedCurrent = Math.min(current, newMax);

  await redis.hset(ENERGY_KEY(characterId), { current: cappedCurrent, max: newMax });
  await redis.expire(ENERGY_KEY(characterId), REDIS_TTL_S);

  await prisma.energyState.update({
    where: { characterId },
    data: { max: newMax, current: cappedCurrent },
  });
}

/**
 * Seeds a fresh energy hash into Redis (called on character creation).
 */
export async function seedEnergyInRedis(
  characterId: string,
  current: number,
  max: number,
): Promise<void> {
  await redis.hset(ENERGY_KEY(characterId), { current, max, lastTickAt: Date.now() });
  await redis.expire(ENERGY_KEY(characterId), REDIS_TTL_S);
}

/**
 * Persists current Redis state back to Postgres.
 * Called by the energy:tick background job and on server shutdown.
 */
export async function syncEnergyToDb(characterId: string): Promise<void> {
  const { current } = await getEnergy(characterId);
  await prisma.energyState.update({
    where: { characterId },
    data: { current, lastTickAt: new Date() },
  });
}

/**
 * Write a tick update directly to Redis (used by the energy:tick background job).
 * Also emits energy:updated to the player's socket room.
 */
export async function applyTickToCharacter(
  characterId: string,
  userId: string,
  currentStored: number,
  max: number,
  lastTickAt: number,
): Promise<void> {
  const elapsed = Date.now() - lastTickAt;
  const gained = Math.floor(elapsed / TICK_MS) * REGEN_PER_TICK;
  if (gained === 0) return; // No tick boundary crossed — nothing to do

  const newCurrent = Math.min(currentStored + gained, max);
  const now = Date.now();

  await redis.hset(ENERGY_KEY(characterId), { current: newCurrent, lastTickAt: now });

  // Async DB persist
  prisma.energyState
    .update({ where: { characterId }, data: { current: newCurrent, lastTickAt: new Date(now) } })
    .catch(console.error);

  // Push to player socket room
  pushEnergyUpdate(userId, { current: newCurrent, max });
}
