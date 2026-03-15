import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CharacterFull } from '../types.js';

const TIER_CONFIG = {
  1: { hireCost: 100, dailyCost: 50,  maxActive: 2 },
  2: { hireCost: 500, dailyCost: 200, maxActive: 2 },
  3: { hireCost: 2000, dailyCost: 800, maxActive: 1 },
} as const;

export async function listActive(characterId: string) {
  return prisma.bodyguard.findMany({
    where: { characterId, active: true },
    orderBy: { hiredAt: 'asc' },
  });
}

export async function hire(character: CharacterFull, tier: number): Promise<void> {
  if (![1, 2, 3].includes(tier)) throw new AppError(400, 'Tier must be 1, 2, or 3.');

  const config = TIER_CONFIG[tier as keyof typeof TIER_CONFIG];

  // Count currently active guards of this tier
  const activeCount = character.bodyguards.filter((b) => b.tier === tier && b.active).length;
  if (activeCount >= config.maxActive) {
    throw new AppError(400, `You already have the maximum number of Tier ${tier} bodyguards (${config.maxActive}).`);
  }

  if (character.ironMarks < config.hireCost) {
    throw new AppError(400, `Insufficient Iron Marks. Hiring Tier ${tier} costs ${config.hireCost}.`);
  }

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { ironMarks: { decrement: config.hireCost } },
    }),
    prisma.bodyguard.create({
      data: {
        characterId: character.id,
        tier,
        dailyCost: config.dailyCost,
      },
    }),
  ]);
}

export async function dismiss(character: CharacterFull, bodyguardId: string): Promise<void> {
  const guard = await prisma.bodyguard.findUnique({ where: { id: bodyguardId } });
  if (!guard || guard.characterId !== character.id) {
    throw new AppError(404, 'Bodyguard not found.');
  }
  await prisma.bodyguard.update({
    where: { id: bodyguardId },
    data: { active: false },
  });
}
