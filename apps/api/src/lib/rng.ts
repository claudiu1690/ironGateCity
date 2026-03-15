import { createHash, randomBytes } from 'crypto';

/**
 * Seeded RNG for reproducible, auditable mission outcomes.
 * All seeds are stored in MissionLog for post-hoc verification.
 */
export function generateSeed(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Deterministic float [0, 1) from a seed string.
 * Uses SHA-256 so the same seed always produces the same number.
 */
export function seededRandom(seed: string): number {
  const hash = createHash('sha256').update(seed).digest('hex');
  // Take the first 8 hex chars as a 32-bit unsigned integer
  const int = parseInt(hash.slice(0, 8), 16);
  return int / 0xffffffff;
}

/**
 * Roll a mission outcome given a base success probability (0–1).
 * Returns a value you compare against your threshold table.
 */
export function rollOutcome(seed: string, successProbability: number): boolean {
  return seededRandom(seed) < successProbability;
}

/**
 * Seeded integer in the range [min, max] inclusive.
 */
export function seededRandomInt(seed: string, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}
