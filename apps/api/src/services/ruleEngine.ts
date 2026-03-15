/**
 * Rule Engine — all game business logic lives here.
 *
 * Rules:
 * - Every function is pure (no side effects, no DB calls).
 * - Route handlers fetch the required data, pass it in, act on the result.
 * - Never inline these checks inside route handlers.
 */

import type { Character, Mission, Law, EquipmentSlots, Item, CityInfluence, City } from '@prisma/client';

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type CriminalLevel = 'CLEAN' | 'KNOWN' | 'REPEAT' | 'NOTORIOUS';

/** Shape of Law.effect JSON stored in the database */
export interface LawEffect {
  type: LawEffectType;
  value: number;
  targetFaction?: 'FASCIST' | 'COMMUNIST' | 'DEMOCRAT' | null;
  nightOnly?: boolean;
}

export type LawEffectType =
  | 'ENERGY_COST_MODIFIER'
  | 'XP_RATE_MODIFIER'
  | 'IRON_RATE_MODIFIER'
  | 'ENCOUNTER_MODIFIER'
  | 'HOSPITAL_COST_MODIFIER'
  | 'TRAVEL_COST_MODIFIER'
  | 'INFLUENCE_MODIFIER'
  | 'CHA_THRESHOLD_MODIFIER'
  | 'CRIMINAL_RECORD_MODIFIER';

/** Values that laws can modify for a given mission attempt */
export interface MissionBaseValues {
  energyCost: number;
  xpReward: number;
  ironReward: number;
  encounterChance: number;
  influenceGain: number;
  minCha: number;
  hospitalCost?: number;
  travelCost?: number;
}

export interface MissionEligibilityResult {
  eligible: boolean;
  reason?: string;
}

/** Minimal character shape required by eligibility checks */
type EligibilityCharacter = Pick<
  Character,
  | 'isHospitalised'
  | 'level'
  | 'factionRank'
  | 'charisma'
  | 'agi'
  | 'str'
  | 'faction'
  | 'currentCityId'
  | 'criminalPoints'
>;

type EquipmentWithItems = EquipmentSlots & {
  weapon: Item | null;
  armour: Item | null;
  utility: Item | null;
  accessory: Item | null;
  document: Item | null;
};

type CityInfluenceWithCity = CityInfluence & { city: Pick<City, 'slug'> };

// ─── 8.1 Mission Eligibility ──────────────────────────────────────────────────

/**
 * Returns whether a character may start a given mission.
 * Call applyLawModifiers() first to get the adjusted baseValues, then pass
 * the adjusted energyCost here — this function does not call the DB.
 */
export function canStartMission(
  character: EligibilityCharacter,
  mission: Mission,
  currentEnergy: number,
  adjustedValues: Pick<MissionBaseValues, 'energyCost' | 'minCha'>,
): MissionEligibilityResult {
  if (character.isHospitalised) {
    return { eligible: false, reason: 'Character is hospitalised and cannot take missions.' };
  }

  if (currentEnergy < adjustedValues.energyCost) {
    return {
      eligible: false,
      reason: `Insufficient energy. Need ${adjustedValues.energyCost}, have ${currentEnergy}.`,
    };
  }

  if (character.level < mission.minLevel) {
    return {
      eligible: false,
      reason: `Requires Level ${mission.minLevel}. You are Level ${character.level}.`,
    };
  }

  if (character.factionRank < mission.minFactionRank) {
    return {
      eligible: false,
      reason: `Requires Faction Rank ${mission.minFactionRank}. You are Rank ${character.factionRank}.`,
    };
  }

  if (character.charisma < adjustedValues.minCha) {
    return {
      eligible: false,
      reason: `Requires ${adjustedValues.minCha} Charisma. You have ${character.charisma}.`,
    };
  }

  if (character.agi < mission.minAgi) {
    return {
      eligible: false,
      reason: `Requires ${mission.minAgi} Agility. You have ${character.agi}.`,
    };
  }

  if (character.str < mission.minStr) {
    return {
      eligible: false,
      reason: `Requires ${mission.minStr} Strength. You have ${character.str}.`,
    };
  }

  if (mission.faction !== null && character.faction !== mission.faction) {
    return {
      eligible: false,
      reason: `This mission is restricted to the ${mission.faction} faction.`,
    };
  }

  if (character.currentCityId !== mission.cityId) {
    return {
      eligible: false,
      reason: 'You must be in the mission city to start this mission.',
    };
  }

  return { eligible: true };
}

// ─── 8.2 Charisma Computation ─────────────────────────────────────────────────

/**
 * Computes and returns the character's charisma from their equipped items.
 * Store the result in character.charisma after any equipment change.
 */
export function computeCharisma(equipment: EquipmentWithItems): number {
  return (
    (equipment.armour?.chaBonus ?? 0) +
    (equipment.accessory?.chaBonus ?? 0) +
    (equipment.weapon?.chaBonus ?? 0) +
    (equipment.utility?.chaBonus ?? 0) +
    (equipment.document?.chaBonus ?? 0)
  );
}

// ─── 8.3 Criminal Record ──────────────────────────────────────────────────────

/**
 * Maps raw criminal points to a named tier.
 *   0     → CLEAN
 *   1–2   → KNOWN      (-10% Iron, no other penalties)
 *   3–5   → REPEAT     (-20% Iron, +15% shop prices, +5% police encounter)
 *   6+    → NOTORIOUS  (-30% Iron, blocked from courts/uni/Democrat buildings, +15% police)
 */
export function getCriminalLevel(criminalPoints: number): CriminalLevel {
  if (criminalPoints <= 0) return 'CLEAN';
  if (criminalPoints <= 2) return 'KNOWN';
  if (criminalPoints <= 5) return 'REPEAT';
  return 'NOTORIOUS';
}

/**
 * Applies the iron penalty that corresponds to a criminal tier.
 * Returns the adjusted iron reward (floored to an integer).
 */
export function applyMissionIronPenalty(baseIron: number, criminalLevel: CriminalLevel): number {
  const multipliers: Record<CriminalLevel, number> = {
    CLEAN: 1.0,
    KNOWN: 0.9,
    REPEAT: 0.8,
    NOTORIOUS: 0.7,
  };
  return Math.floor(baseIron * multipliers[criminalLevel]);
}

// ─── 8.4 Active Law Modifiers ────────────────────────────────────────────────

/**
 * Applies all active law effects to mission base values.
 * Laws that target a specific faction only apply when the character's faction matches.
 * nightOnly laws are skipped unless isNight === true.
 *
 * Returns a new MissionBaseValues object — never mutates the input.
 */
export function applyLawModifiers(
  base: MissionBaseValues,
  activeLaws: Law[],
  character: Pick<Character, 'faction' | 'criminalPoints'>,
  isNight = false,
): MissionBaseValues {
  let result: MissionBaseValues = { ...base };

  for (const law of activeLaws) {
    const effect = law.effect as unknown as LawEffect;

    // Skip faction-targeted laws that don't apply to this character
    if (effect.targetFaction && effect.targetFaction !== character.faction) continue;

    // Skip night-only laws during the day
    if (effect.nightOnly && !isNight) continue;

    switch (effect.type) {
      case 'ENERGY_COST_MODIFIER':
        result.energyCost = Math.max(0, Math.round(result.energyCost * (1 + effect.value)));
        break;

      case 'XP_RATE_MODIFIER':
        result.xpReward = Math.round(result.xpReward * (1 + effect.value));
        break;

      case 'IRON_RATE_MODIFIER':
        result.ironReward = Math.round(result.ironReward * (1 + effect.value));
        break;

      case 'ENCOUNTER_MODIFIER':
        result.encounterChance = Math.min(
          1,
          Math.max(0, result.encounterChance * (1 + effect.value)),
        );
        break;

      case 'HOSPITAL_COST_MODIFIER':
        if (result.hospitalCost !== undefined) {
          result.hospitalCost = Math.round(result.hospitalCost * (1 + effect.value));
        }
        break;

      case 'TRAVEL_COST_MODIFIER':
        if (result.travelCost !== undefined) {
          result.travelCost = Math.round(result.travelCost + effect.value);
        }
        break;

      case 'INFLUENCE_MODIFIER':
        result.influenceGain = result.influenceGain * (1 + effect.value);
        break;

      case 'CHA_THRESHOLD_MODIFIER':
        result.minCha = Math.max(0, result.minCha + effect.value);
        break;

      case 'CRIMINAL_RECORD_MODIFIER': {
        // Rehabilitation Act — effectively reduces the criminal level seen by this law pass.
        // The actual character.criminalPoints are NOT mutated; this is a view-layer adjustment.
        // Other rules that need to honour this should re-call getCriminalLevel with adjusted points.
        const adjusted = Math.max(0, character.criminalPoints - effect.value);
        // Expose through a synthetic field so callers can use it if needed
        (result as MissionBaseValues & { _adjustedCriminalPoints?: number })._adjustedCriminalPoints =
          adjusted;
        break;
      }
    }
  }

  return result;
}

// ─── 8.5 National Control ────────────────────────────────────────────────────

const CITY_WEIGHTS: Record<string, number> = {
  irongate: 30,
  ashford: 15,
  coalport: 20,
  duskwall: 20,
  clearwater: 15,
};

export interface NationalControl {
  FASCIST: number;
  COMMUNIST: number;
  DEMOCRAT: number;
}

/**
 * Computes weighted national influence from all city influence records.
 * Values sum to ~100. If any faction >= 55 and no election is active,
 * the caller should enqueue an election job.
 */
export function computeNationalControl(
  cityInfluences: CityInfluenceWithCity[],
): NationalControl {
  const national: NationalControl = { FASCIST: 0, COMMUNIST: 0, DEMOCRAT: 0 };

  for (const city of cityInfluences) {
    const weight = (CITY_WEIGHTS[city.city.slug] ?? 0) / 100;
    national.FASCIST += city.fascistPct * weight;
    national.COMMUNIST += city.communistPct * weight;
    national.DEMOCRAT += city.democratPct * weight;
  }

  // Round to 2 decimal places for display
  national.FASCIST = Math.round(national.FASCIST * 100) / 100;
  national.COMMUNIST = Math.round(national.COMMUNIST * 100) / 100;
  national.DEMOCRAT = Math.round(national.DEMOCRAT * 100) / 100;

  return national;
}

/**
 * Returns true if the faction has crossed the 55% threshold for triggering an election.
 */
export function shouldTriggerElection(national: NationalControl): boolean {
  return Object.values(national).some((pct) => pct >= 55);
}
