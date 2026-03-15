import { MissionOutcome } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateSeed, seededRandom } from '../lib/rng.js';
import { getEnergy, deductEnergy } from './energyService.js';
import { resolveEncounter } from './combatService.js';
import {
  canStartMission,
  applyLawModifiers,
  getCriminalLevel,
  applyMissionIronPenalty,
  computeNationalControl,
  shouldTriggerElection,
  type MissionBaseValues,
} from './ruleEngine.js';
import { broadcastInfluenceUpdate } from '../socket/index.js';
import { electionCheckQueue } from '../jobs/index.js';
import type { CharacterFull } from '../types.js';

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listMissions(character: CharacterFull) {
  const activeLaws = await prisma.law.findMany({ where: { status: 'ACTIVE' } });

  const missions = await prisma.mission.findMany({
    where: { cityId: character.currentCityId },
    include: { city: true },
  });

  const energyState = await getEnergy(character.id);

  return missions
    .map((m) => {
      const base: MissionBaseValues = {
        energyCost: m.energyCost,
        xpReward: m.xpReward,
        ironReward: m.ironReward,
        encounterChance: m.encounterChance,
        influenceGain: m.influenceGain,
        minCha: m.minCha,
      };
      const adjusted = applyLawModifiers(base, activeLaws, character);
      const eligibility = canStartMission(character, m, energyState.current, adjusted);

      return {
        ...m,
        adjustedEnergyCost: adjusted.energyCost,
        adjustedEncounterChance: adjusted.encounterChance,
        eligible: eligibility.eligible,
        ineligibleReason: eligibility.reason ?? null,
      };
    })
    .sort((a, b) => a.minLevel - b.minLevel);
}

// ─── Start ────────────────────────────────────────────────────────────────────

export async function startMission(character: CharacterFull, missionId: string) {
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { city: true },
  });
  if (!mission) throw new AppError(404, 'Mission not found.');

  const activeLaws = await prisma.law.findMany({ where: { status: 'ACTIVE' } });
  const energyState = await getEnergy(character.id);

  const base: MissionBaseValues = {
    energyCost: mission.energyCost,
    xpReward: mission.xpReward,
    ironReward: mission.ironReward,
    encounterChance: mission.encounterChance,
    influenceGain: mission.influenceGain,
    minCha: mission.minCha,
  };
  const adjusted = applyLawModifiers(base, activeLaws, character);
  const eligibility = canStartMission(character, mission, energyState.current, adjusted);
  if (!eligibility.eligible) throw new AppError(400, eligibility.reason!);

  await deductEnergy(character.id, adjusted.energyCost);

  const seed = generateSeed();
  const encounterRoll = seededRandom(`${seed}_enc`);
  const hasEncounter = encounterRoll < adjusted.encounterChance;

  let outcome: MissionOutcome;
  let combatPayload: object | null = null;
  let hpRemaining = character.currentHealth;

  if (hasEncounter) {
    // Pick an NPC appropriate to the city and mission type
    const npcSlug = pickNpcSlug(character.currentCity.slug, mission.faction);
    const combat = await resolveEncounter(character, npcSlug, `${seed}_combat`);
    combatPayload = { npcSlug, ...combat };

    if (combat.outcome === 'WIN') {
      outcome = MissionOutcome.ENCOUNTER_WIN;
      hpRemaining = combat.hpRemaining;
    } else {
      outcome = MissionOutcome.ENCOUNTER_LOSS;
      hpRemaining = 0;
      // Hospitalise for 30 minutes
      await prisma.character.update({
        where: { id: character.id },
        data: {
          currentHealth: 1,
          isHospitalised: true,
          hospitalisedUntil: new Date(Date.now() + 30 * 60 * 1000),
        },
      });
    }
  } else {
    const successProb = computeSuccessProb(character, mission);
    const roll = seededRandom(`${seed}_out`);
    if (roll >= successProb * 0.65) outcome = MissionOutcome.SUCCESS;
    else if (roll >= successProb * 0.30) outcome = MissionOutcome.PARTIAL_SUCCESS;
    else outcome = MissionOutcome.FAILURE;
  }

  // Compute rewards
  const criminalLevel = getCriminalLevel(character.criminalPoints);
  let xpAwarded = 0, ironAwarded = 0, fxpAwarded = 0;

  if (outcome === 'SUCCESS' || outcome === 'ENCOUNTER_WIN') {
    xpAwarded  = adjusted.xpReward;
    ironAwarded = applyMissionIronPenalty(adjusted.ironReward, criminalLevel);
    fxpAwarded  = mission.fxpReward;
  } else if (outcome === 'PARTIAL_SUCCESS') {
    xpAwarded  = Math.floor(adjusted.xpReward * 0.5);
    ironAwarded = applyMissionIronPenalty(Math.floor(adjusted.ironReward * 0.5), criminalLevel);
    fxpAwarded  = Math.floor(mission.fxpReward * 0.5);
  } else {
    xpAwarded = Math.floor(adjusted.xpReward * 0.25);
  }

  // Level-up check: 1000 XP per level (increases by 200 per level)
  const currentXp = character.xp + xpAwarded;
  const xpThreshold = 1000 + (character.level - 1) * 200;
  const newLevel = currentXp >= xpThreshold ? character.level + 1 : character.level;
  const newXp = newLevel > character.level ? currentXp - xpThreshold : currentXp;

  // Faction rank: every 5000 FXP up to rank 10
  const currentFxp = character.factionXp + fxpAwarded;
  const fxpThreshold = character.factionRank * 5000;
  const newFactionRank = currentFxp >= fxpThreshold && character.factionRank < 10
    ? character.factionRank + 1 : character.factionRank;
  const newFactionXp = newFactionRank > character.factionRank ? currentFxp - fxpThreshold : currentFxp;

  await prisma.character.update({
    where: { id: character.id },
    data: {
      xp: newXp,
      level: newLevel,
      factionXp: newFactionXp,
      factionRank: newFactionRank,
      ironMarks: { increment: ironAwarded },
      currentHealth: Math.max(1, hpRemaining),
      ...(hpRemaining <= 0 ? {} : { isHospitalised: false }),
    },
  });

  // Dossier entry if eligible
  let dossierEntry = null;
  if (mission.dossierReward && (outcome === 'SUCCESS' || outcome === 'ENCOUNTER_WIN')) {
    dossierEntry = await prisma.dossierEntry.create({
      data: {
        characterId: character.id,
        cityId: mission.cityId,
        category: 'POLITICAL',
        subjectName: 'Unknown Contact',
        content: `Intelligence gathered during mission: ${mission.title}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }

  // Update city influence on success
  if (outcome === 'SUCCESS' || outcome === 'ENCOUNTER_WIN') {
    await updateCityInfluence(mission.cityId, character.faction, adjusted.influenceGain);
  }

  // Emit influence update
  const updatedInfluence = await prisma.cityInfluence.findUnique({
    where: { cityId: mission.cityId },
  });
  if (updatedInfluence) broadcastInfluenceUpdate(mission.city.slug, updatedInfluence);

  // Check for election trigger
  await checkElectionTrigger();

  // Save mission log
  const log = await prisma.missionLog.create({
    data: {
      characterId: character.id,
      missionId: mission.id,
      outcome,
      xpAwarded,
      ironAwarded,
      fxpAwarded,
      rngSeed: combatPayload ? JSON.stringify({ seed, combat: combatPayload }) : seed,
    },
    include: { mission: true },
  });

  return {
    log,
    outcome,
    rewards: { xp: xpAwarded, iron: ironAwarded, fxp: fxpAwarded },
    levelUp: newLevel > character.level ? { newLevel } : null,
    rankUp: newFactionRank > character.factionRank ? { newRank: newFactionRank } : null,
    dossierEntry,
    combat: combatPayload,
    hpRemaining: Math.max(0, hpRemaining),
  };
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getMissionHistory(characterId: string) {
  return prisma.missionLog.findMany({
    where: { characterId },
    include: { mission: { include: { city: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeSuccessProb(character: CharacterFull, mission: { minStr: number; minCha: number; minAgi: number }): number {
  const base = 0.60;
  const strBonus = Math.min(0.20, (character.str - mission.minStr) * 0.02);
  const intBonus = Math.min(0.15, (character.int - 10) * 0.01);
  const chaBonus = Math.min(0.15, (character.charisma - mission.minCha) * 0.03);
  const equipBonus = getEquipMissionBonus(character);
  return Math.min(0.95, base + strBonus + intBonus + chaBonus + equipBonus);
}

function getEquipMissionBonus(character: CharacterFull): number {
  const eq = character.equipment;
  if (!eq) return 0;
  return (
    (eq.weapon?.missionBonus ?? 0) +
    (eq.armour?.missionBonus ?? 0) +
    (eq.utility?.missionBonus ?? 0) +
    (eq.accessory?.missionBonus ?? 0) +
    (eq.document?.missionBonus ?? 0)
  );
}

function pickNpcSlug(citySlug: string, missionFaction: string | null): string {
  const byCity: Record<string, string> = {
    duskwall: 'militia-guard',
    coalport: 'red-guard',
    ashford:  'party-thug',
  };
  if (citySlug in byCity) return byCity[citySlug];
  if (missionFaction === 'FASCIST') return 'street-enforcer';
  if (missionFaction === 'COMMUNIST') return 'red-guard';
  return 'city-police';
}

async function updateCityInfluence(cityId: string, faction: string, gain: number): Promise<void> {
  const inf = await prisma.cityInfluence.findUnique({ where: { cityId } });
  if (!inf) return;

  let f = inf.fascistPct, c = inf.communistPct, d = inf.democratPct;
  const current = faction === 'FASCIST' ? f : faction === 'COMMUNIST' ? c : d;
  const newPct = Math.min(100, current + gain);
  const actualGain = newPct - current;
  const otherSum = 100 - current;

  if (faction === 'FASCIST') {
    f = newPct;
    if (otherSum > 0) { c -= actualGain * (c / otherSum); d -= actualGain * (d / otherSum); }
  } else if (faction === 'COMMUNIST') {
    c = newPct;
    if (otherSum > 0) { f -= actualGain * (f / otherSum); d -= actualGain * (d / otherSum); }
  } else {
    d = newPct;
    if (otherSum > 0) { f -= actualGain * (f / otherSum); c -= actualGain * (c / otherSum); }
  }

  // Clamp and normalize
  f = Math.max(0, f); c = Math.max(0, c); d = Math.max(0, d);
  const total = f + c + d;
  if (total > 0) { f = (f / total) * 100; c = (c / total) * 100; d = (d / total) * 100; }

  await prisma.cityInfluence.update({
    where: { cityId },
    data: { fascistPct: f, communistPct: c, democratPct: d },
  });
}

async function checkElectionTrigger(): Promise<void> {
  const allInfluence = await prisma.cityInfluence.findMany({ include: { city: true } });
  const national = computeNationalControl(allInfluence);
  if (shouldTriggerElection(national)) {
    const activeElection = await prisma.election.findFirst({
      where: { status: { not: 'CONCLUDED' } },
    });
    if (!activeElection) {
      // Kick off the election check worker immediately rather than waiting for the cron
      await electionCheckQueue.add('check-now', {}, { jobId: `election-check-${Date.now()}` });
    }
  }
}
