import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { deductEnergy } from './energyService.js';
import type { CharacterFull } from '../types.js';

export const HOSPITAL_SERVICES = {
  BASIC_TREATMENT: {
    name: 'Basic Treatment',
    description: 'Heal 25 HP at the local clinic.',
    energyCost: 5,
    ironCost: 30,
    hpRestore: 25,
  },
  FULL_RECOVERY: {
    name: 'Full Recovery',
    description: 'Full HP restoration and immediate discharge from hospitalisation.',
    energyCost: 10,
    ironCost: 120,
    hpRestore: 9999, // fills to max
  },
  NEGLECT_TREATMENT: {
    name: 'Neglect Treatment',
    description: 'Clears hunger and fatigue debuffs. Resets lastFedAt and lastRestedAt.',
    energyCost: 5,
    ironCost: 50,
    hpRestore: 0,
  },
} as const;

type ServiceKey = keyof typeof HOSPITAL_SERVICES;

export async function getStatus(character: CharacterFull) {
  return {
    isHospitalised: character.isHospitalised,
    hospitalisedUntil: character.hospitalisedUntil,
    currentHealth: character.currentHealth,
    maxHealth: character.maxHealth,
    services: Object.entries(HOSPITAL_SERVICES).map(([key, svc]) => ({
      id: key,
      ...svc,
      canAfford: character.ironMarks >= svc.ironCost,
    })),
  };
}

export async function treat(character: CharacterFull, service: string): Promise<object> {
  const svc = HOSPITAL_SERVICES[service as ServiceKey];
  if (!svc) throw new AppError(400, `Unknown service: ${service}`);

  if (character.ironMarks < svc.ironCost) {
    throw AppError.insufficientIron(character.ironMarks, svc.ironCost);
  }

  await deductEnergy(character.id, svc.energyCost);

  const newHp = Math.min(character.maxHealth, character.currentHealth + svc.hpRestore);
  const isFullyHealed = newHp >= character.maxHealth;

  const now = new Date();
  await prisma.character.update({
    where: { id: character.id },
    data: {
      ironMarks: { decrement: svc.ironCost },
      currentHealth: newHp,
      ...(service === 'FULL_RECOVERY' || isFullyHealed
        ? { isHospitalised: false, hospitalisedUntil: null }
        : {}),
      ...(service === 'NEGLECT_TREATMENT'
        ? { lastFedAt: now, lastRestedAt: now }
        : {}),
    },
  });

  return {
    service,
    hpRestored: Math.min(svc.hpRestore, character.maxHealth - character.currentHealth),
    newHp,
    discharged: service === 'FULL_RECOVERY' || isFullyHealed,
  };
}
