import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { levelForXp, rankForFxp, xpForLevel } from '@irongate/rules';

/**
 * The e2e character hook (`POST /api/test/character`, slice-3 tech design §8.6, slice-4 §8.6) as a
 * function, so the dev panel's buttons use the very same write. Memory mode only (E2E_TEST_HOOKS).
 * It never marks `playtest.boosted`: that belongs to the operator's `admin:boost` script, and the
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
  /** Slice 4: the Level (XP set to its threshold; never lowered). */
  level?: number;
  /** Slice 4: XP (the Level follows). */
  xp?: number;
  /** Slice 4: where the character stands (any journey is dropped). */
  cityId?: string;
  /** Slice 4: where the character lives, every window open (votes and stands at once). */
  residence?: { cityId: string; districtId: string | null };
  /** Slice 4: Local Standing Successes in Irongate. */
  irongateSuccesses?: number;
  /** Slice 4: Iron. */
  iron?: number;
}

/** The `$set` for a seed; only the fields given. */
export function characterSeedSet(
  c: Pick<CharacterDoc, 'rank' | 'localStanding' | 'homeCityId' | 'xp' | 'level'>,
  seed: CharacterSeed,
  now: number,
): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  if (seed.fxp !== undefined) {
    set.fxp = seed.fxp;
    set.rank = Math.max(c.rank, rankForFxp(seed.fxp));
  }
  let standing = c.localStanding;
  const withStanding = (cityId: string, successes: number) => {
    standing = [...standing.filter((x) => x.cityId !== cityId), { cityId, successes }];
    set.localStanding = standing;
  };
  if (seed.successes !== undefined) withStanding(c.homeCityId, seed.successes);
  if (seed.irongateSuccesses !== undefined) withStanding('irongate', seed.irongateSuccesses);
  if (seed.pc !== undefined) set.pc = seed.pc;
  if (seed.iron !== undefined) set.iron = seed.iron;
  // A full bar for a long run of taps (the e2e council cycle does a day's orders).
  if (seed.energy !== undefined) {
    set['energy.value'] = seed.energy;
    set['energy.updatedAt'] = new Date(now);
  }
  const xp = seed.level !== undefined ? Math.max(c.xp, xpForLevel(seed.level)) : seed.xp;
  if (xp !== undefined) {
    set.xp = xp;
    set.level = Math.max(seed.level ?? 1, levelForXp(xp));
  }
  if (seed.cityId !== undefined) {
    set.cityId = seed.cityId;
    set.journey = null;
  }
  if (seed.residence !== undefined) {
    set.residence = {
      cityId: seed.residence.cityId,
      districtId: seed.residence.districtId,
      sinceDay: 0,
      votesFromDay: 0,
      standsFromDay: 0,
      canMoveFromDay: 0,
    };
  }
  return set;
}

/** Write a seed to the character (a test hook: no version guard, the version still moves). */
export async function applyCharacterSeed(
  c: Pick<CharacterDoc, '_id' | 'rank' | 'localStanding' | 'homeCityId' | 'xp' | 'level'>,
  seed: CharacterSeed,
  now: number,
): Promise<Record<string, unknown>> {
  const set = characterSeedSet(c, seed, now);
  if (Object.keys(set).length > 0) {
    await Character.updateOne({ _id: c._id }, { $set: set, $inc: { version: 1 } });
  }
  return set;
}
