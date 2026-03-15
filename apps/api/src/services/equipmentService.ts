import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { generateSeed, seededRandom } from '../lib/rng.js';
import { recomputeCharisma } from './characterService.js';
import { getCriminalLevel } from './ruleEngine.js';
import type { CharacterFull } from '../types.js';

const SLOT_FIELDS = {
  WEAPON: 'weaponId', ARMOUR: 'armourId', UTILITY: 'utilityId',
  ACCESSORY: 'accessoryId', DOCUMENT: 'documentId',
} as const;

export async function getInventory(characterId: string) {
  return prisma.playerInventory.findMany({
    where: { characterId },
    include: { item: true },
    orderBy: { acquiredAt: 'desc' },
  });
}

export async function getShop(character: CharacterFull) {
  const criminalLevel = getCriminalLevel(character.criminalPoints);
  const costMult = criminalLevel === 'REPEAT' || criminalLevel === 'NOTORIOUS' ? 1.15 : 1.0;

  const items = await prisma.item.findMany({
    where: {
      acquireMethod: 'store',
      tier: { lte: Math.ceil(character.level / 5) + 1 }, // unlock higher tiers with level
      OR: [{ faction: null }, { faction: character.faction }],
    },
    orderBy: [{ slot: 'asc' }, { tier: 'asc' }],
  });

  return items.map((item) => ({
    ...item,
    adjustedCost: Math.ceil(item.ironCost * costMult),
    canAfford: character.ironMarks >= Math.ceil(item.ironCost * costMult),
  }));
}

export async function buyItem(character: CharacterFull, itemId: string): Promise<void> {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) throw new AppError(404, 'Item not found.');
  if (item.acquireMethod !== 'store') throw new AppError(400, 'This item cannot be purchased from the shop.');

  const criminalLevel = getCriminalLevel(character.criminalPoints);
  const costMult = criminalLevel === 'REPEAT' || criminalLevel === 'NOTORIOUS' ? 1.15 : 1.0;
  const finalCost = Math.ceil(item.ironCost * costMult);

  if (character.ironMarks < finalCost) {
    throw AppError.insufficientIron(character.ironMarks, finalCost);
  }

  if (item.faction && item.faction !== character.faction) {
    throw AppError.factionMismatch(item.faction);
  }

  await prisma.$transaction([
    prisma.character.update({
      where: { id: character.id },
      data: { ironMarks: { decrement: finalCost } },
    }),
    prisma.playerInventory.create({
      data: { characterId: character.id, itemId: item.id },
    }),
  ]);
}

export async function equipItem(character: CharacterFull, inventoryId: string): Promise<number> {
  const invEntry = await prisma.playerInventory.findUnique({
    where: { id: inventoryId },
    include: { item: true },
  });
  if (!invEntry || invEntry.characterId !== character.id) {
    throw new AppError(404, 'Inventory entry not found.');
  }

  const slotField = SLOT_FIELDS[invEntry.item.slot];

  await prisma.equipmentSlots.upsert({
    where: { characterId: character.id },
    update: { [slotField]: invEntry.item.id },
    create: { characterId: character.id, [slotField]: invEntry.item.id },
  });

  // Recompute charisma after equip
  return recomputeCharisma(character.id);
}

export async function craftItems(
  character: CharacterFull,
  inventoryId1: string,
  inventoryId2: string,
): Promise<{ success: boolean; resultItem?: object }> {
  const [inv1, inv2] = await Promise.all([
    prisma.playerInventory.findUnique({ where: { id: inventoryId1 }, include: { item: true } }),
    prisma.playerInventory.findUnique({ where: { id: inventoryId2 }, include: { item: true } }),
  ]);

  if (!inv1 || inv1.characterId !== character.id) throw new AppError(404, 'First item not found in inventory.');
  if (!inv2 || inv2.characterId !== character.id) throw new AppError(404, 'Second item not found in inventory.');
  if (inv1.item.slot !== inv2.item.slot) throw new AppError(400, 'Items must be the same slot type to craft.');
  if (inv1.item.tier !== inv2.item.tier) throw new AppError(400, 'Items must be the same tier to craft.');
  if (inv1.item.tier >= 5) throw new AppError(400, 'Tier 5 items cannot be crafted further.');

  // 40% success chance, seeded
  const seed = generateSeed();
  const roll = seededRandom(seed);
  const success = roll < 0.4;

  // Always delete both source items
  await prisma.playerInventory.deleteMany({
    where: { id: { in: [inventoryId1, inventoryId2] } },
  });

  if (!success) return { success: false };

  // Find a Tier+1 item of the same slot and faction
  const resultItem = await prisma.item.findFirst({
    where: {
      slot: inv1.item.slot,
      tier: inv1.item.tier + 1,
      OR: [{ faction: null }, { faction: inv1.item.faction ?? undefined }],
    },
  });

  if (!resultItem) return { success: true }; // No higher tier item found but craft succeeded

  const newInv = await prisma.playerInventory.create({
    data: { characterId: character.id, itemId: resultItem.id },
    include: { item: true },
  });

  return { success: true, resultItem: newInv };
}
