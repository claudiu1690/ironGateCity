import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { rankForFxp } from '@irongate/rules';

/**
 * The e2e character hook (`POST /api/test/character`, slice-3 tech design §8.6) as a function, so
 * the dev panel's Boost and Refill use the very same write. Memory mode only (E2E_TEST_HOOKS). It
 * never marks `playtest.boosted`: that belongs to the operator's `admin:boost` script, and the
 * playtest report's boosted / natural split reads only that mark.
 */
export interface CharacterSeed {
  /** Faction XP (and the Rank it gives; Rank never goes down). */
  fxp?: number;
  /** Local Standing Successes in the home city. */
  successes?: number;
  pc?: number;
  /** Stored Energy, from `now`. */
  energy?: number;
}

/** The `$set` for a seed; only the fields given. */
export function characterSeedSet(
  c: Pick<CharacterDoc, 'rank' | 'localStanding' | 'homeCityId'>,
  seed: CharacterSeed,
  now: number,
): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  if (seed.fxp !== undefined) {
    set.fxp = seed.fxp;
    set.rank = Math.max(c.rank, rankForFxp(seed.fxp));
  }
  if (seed.successes !== undefined) {
    set.localStanding = [
      ...c.localStanding.filter((x) => x.cityId !== c.homeCityId),
      { cityId: c.homeCityId, successes: seed.successes },
    ];
  }
  if (seed.pc !== undefined) set.pc = seed.pc;
  // A full bar for a long run of taps (the e2e council cycle does a day's orders).
  if (seed.energy !== undefined) {
    set['energy.value'] = seed.energy;
    set['energy.updatedAt'] = new Date(now);
  }
  return set;
}

/** Write a seed to the character (a test hook: no version guard, the version still moves). */
export async function applyCharacterSeed(
  c: Pick<CharacterDoc, '_id' | 'rank' | 'localStanding' | 'homeCityId'>,
  seed: CharacterSeed,
  now: number,
): Promise<Record<string, unknown>> {
  const set = characterSeedSet(c, seed, now);
  if (Object.keys(set).length > 0) {
    await Character.updateOne({ _id: c._id }, { $set: set, $inc: { version: 1 } });
  }
  return set;
}
