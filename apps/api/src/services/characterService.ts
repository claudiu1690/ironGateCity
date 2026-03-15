import { Faction } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { deductEnergy } from './energyService.js';
import { computeCharisma } from './ruleEngine.js';
import { broadcastInfluenceUpdate } from '../socket/index.js';
import type { CharacterFull } from '../types.js';

// City adjacency for travel cost calculation
const ADJACENT: Record<string, string[]> = {
  irongate:   ['ashford', 'coalport', 'duskwall', 'clearwater'],
  ashford:    ['irongate', 'clearwater'],
  coalport:   ['irongate', 'duskwall'],
  duskwall:   ['irongate', 'coalport'],
  clearwater: ['irongate', 'ashford'],
};

export async function getFullCharacter(userId: string): Promise<CharacterFull> {
  const character = await prisma.character.findUnique({
    where: { userId },
    include: {
      equipment: {
        include: { weapon: true, armour: true, utility: true, accessory: true, document: true },
      },
      bodyguards: { where: { active: true } },
      currentJob: true,
      currentCity: true,
    },
  });
  if (!character) throw new AppError(404, 'Character not found.');
  return character;
}

export async function getPublicProfile(characterId: string) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: { currentCity: true },
  });
  if (!character) throw new AppError(404, 'Character not found.');

  return {
    id: character.id,
    name: character.name,
    nickname: character.nickname,
    faction: character.faction,
    level: character.level,
    str: character.str,
    int: character.int,
    agi: character.agi,
    charisma: character.charisma,
    factionRank: character.factionRank,
    criminalPoints: character.criminalPoints,
    currentCity: character.currentCity.name,
    isHospitalised: character.isHospitalised,
  };
}

export async function travel(character: CharacterFull, targetCitySlug: string): Promise<void> {
  if (character.isHospitalised) {
    throw AppError.hospitalised();
  }

  const targetCity = await prisma.city.findUnique({ where: { slug: targetCitySlug } });
  if (!targetCity) throw new AppError(404, `City '${targetCitySlug}' not found.`, ErrorCode.NOT_FOUND);

  if (targetCity.id === character.currentCityId) {
    throw new AppError(400, 'You are already in that city.', ErrorCode.WRONG_CITY);
  }

  const fromSlug = character.currentCity.slug;
  const adjacent = ADJACENT[fromSlug] ?? [];
  const energyCost = adjacent.includes(targetCitySlug) ? 5 : 10;

  await deductEnergy(character.id, energyCost);

  await prisma.character.update({
    where: { id: character.id },
    data: { currentCityId: targetCity.id },
  });
}

export async function setFaction(
  character: CharacterFull,
  faction: Faction,
  originChoice: 'strength' | 'wisdom' | 'speed',
): Promise<void> {
  if (character.originStoryComplete) {
    throw new AppError(409, 'Faction already set — Origin Story complete.', ErrorCode.CONFLICT);
  }

  // Origin choice bonuses
  const statBoosts: Record<string, Partial<{ str: number; int: number; agi: number; factionXp: number }>> = {
    strength: { str: 2, factionXp: 50 },
    wisdom:   { int: 2, factionXp: 50 },
    speed:    { agi: 2, factionXp: 50 },
  };
  const boost = statBoosts[originChoice] ?? { factionXp: 50 };

  await prisma.character.update({
    where: { id: character.id },
    data: { faction, originStoryComplete: true, ...boost },
  });
}

export async function recomputeCharisma(characterId: string): Promise<number> {
  const equipment = await prisma.equipmentSlots.findUnique({
    where: { characterId },
    include: { weapon: true, armour: true, utility: true, accessory: true, document: true },
  });

  if (!equipment) return 0;

  const cha = computeCharisma(equipment as Parameters<typeof computeCharisma>[0]);
  await prisma.character.update({ where: { id: characterId }, data: { charisma: cha } });
  return cha;
}
