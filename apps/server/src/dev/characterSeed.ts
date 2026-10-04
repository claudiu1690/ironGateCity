import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import {
  RANK_FXP,
  dayKey,
  healthAt,
  healthMax,
  levelForXp,
  rankForFxp,
  setHeat,
  xpForLevel,
} from '@irongate/rules';
import type { MarkKind } from '@irongate/rules';
import { healthDoc, heatDoc } from '../services/risk';

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
  /** Slice 5 (tech design §8.5): Heat 0–100, from `now`. */
  heat?: number;
  /** Slice 5: Health, a value (kept 0..max at the Level after this seed), from `now`. */
  health?: number;
  /** Slice 5: the record's marks, replacing it (and its arrests): each `daysAgo` City Days back. */
  marks?: Array<{ kind: MarkKind; daysAgo: number }>;
  /** Slice 5: Agility, Strength, and CHA's base (worn CHA = the base + what is equipped). */
  agi?: number;
  str?: number;
  cha?: number;
  /** Slice 5: the Rank, with FXP at its floor (it may lower both: a test hook). */
  rank?: number;
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
  // Slice 5 (tech design §8.5): the lazy states start at `now`.
  if (seed.heat !== undefined) set.heat = heatDoc(setHeat(seed.heat, now));
  if (seed.health !== undefined) {
    const level = (set.level as number | undefined) ?? c.level;
    set.health = healthDoc(healthAt(Math.min(healthMax(level), seed.health), level, now));
  }
  if (seed.marks !== undefined) {
    const today = dayKey(now);
    const marks = seed.marks
      .map((m) => ({ day: today - m.daysAgo, kind: m.kind, logId: null }))
      .sort((a, b) => a.day - b.day);
    set.record = { marks, arrests: [] };
  }
  if (seed.agi !== undefined) set['stats.agi'] = seed.agi;
  if (seed.str !== undefined) set['stats.str'] = seed.str;
  if (seed.cha !== undefined) set['stats.chaBase'] = seed.cha;
  if (seed.rank !== undefined) {
    set.rank = seed.rank;
    set.fxp = RANK_FXP[seed.rank - 1]!;
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
