import { DossierCategory } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { redis, RedisKeys } from '../lib/redis.js';
import { AppError, ErrorCode } from '../middleware/errorHandler.js';
import { deductEnergy } from './energyService.js';
import { generateSeed, seededRandomInt } from '../lib/rng.js';
import type { CharacterFull } from '../types.js';

const DOSSIER_TTL_S = 7 * 24 * 60 * 60; // 7 days

const IRON_BY_CATEGORY: Record<DossierCategory, number> = {
  POLITICAL: 200,
  CRIMINAL: 150,
  ASSET: 180,
  LOCATION: 100,
  UNCLEAR: 50,
};

// NPC surveillance action pool — picked via seeded RNG
const NPC_POOL = [
  { subjectName: 'Viktor Bauer',      category: DossierCategory.POLITICAL,  content: 'Exchanged documents with an Iron Shield lieutenant near the central station.' },
  { subjectName: 'Miriam Schell',     category: DossierCategory.POLITICAL,  content: 'Organising a workers\' meeting at the Old Mill warehouse, 22:00 Thursday.' },
  { subjectName: 'Otto Krauss',       category: DossierCategory.CRIMINAL,   content: 'Received a large unmarked cash delivery from an unknown courier.' },
  { subjectName: 'Lena Vogt',         category: DossierCategory.CRIMINAL,   content: 'Seen bribing a city clerk outside the Registry of Deeds.' },
  { subjectName: 'Franz Richter',     category: DossierCategory.POLITICAL,  content: 'Attended a clandestine Communist cell meeting at the Coalport docks.' },
  { subjectName: 'Hilde Möller',      category: DossierCategory.ASSET,      content: 'Owns an undeclared warehouse on the north side of the harbour.' },
  { subjectName: 'Rudolf Steinmann',  category: DossierCategory.LOCATION,   content: 'Spotted entering a safehouse on Kessler Lane at irregular intervals.' },
  { subjectName: 'Agnes Wulf',        category: DossierCategory.POLITICAL,  content: 'Photographed shaking hands with a known Democrat party treasurer.' },
  { subjectName: 'Hans Brauer',       category: DossierCategory.CRIMINAL,   content: 'Running an unlicensed printing press from a basement on Gerber Street.' },
  { subjectName: 'Klara Engel',       category: DossierCategory.ASSET,      content: 'Controls four tenement blocks under shell company "Engel Holdings."' },
  { subjectName: 'Dietrich Wolff',    category: DossierCategory.LOCATION,   content: 'Arms cache believed to be located in his workshop on the industrial canal.' },
  { subjectName: 'Sabine Hartmann',   category: DossierCategory.POLITICAL,  content: 'Photographed at three consecutive Fascist party rallies, always near the podium.' },
  { subjectName: 'Emil Schreiber',    category: DossierCategory.UNCLEAR,    content: 'Contacted by multiple factions in a single week — allegiance unknown.' },
  { subjectName: 'Maria Fuchs',       category: DossierCategory.CRIMINAL,   content: 'Identified fencing stolen factory equipment through the Clearwater market.' },
  { subjectName: 'Karl Jäger',        category: DossierCategory.POLITICAL,  content: 'Delivering sealed letters to the offices of three sitting councillors.' },
];

/** INT → max dossier slot count */
function slotLimit(intStat: number): number {
  return Math.max(3, intStat);
}

export async function listEntries(characterId: string, intStat: number) {
  const rows = await prisma.dossierEntry.findMany({
    where: { characterId },
    orderBy: { createdAt: 'desc' },
  });

  // Map DB fields → frontend-expected shape
  const entries = rows.map((r) => ({
    id:             r.id,
    targetName:     r.subjectName,          // schema: subjectName
    targetFaction:  null,                   // not stored; placeholder
    category:       r.category,
    intel:          [r.content],            // schema: content (string) → intel (string[])
    isStale:        r.isStale,
    expiresAt:      r.expiresAt.toISOString(),
    createdAt:      r.createdAt.toISOString(),
  }));

  return {
    entries,
    capacity: { used: rows.length, max: slotLimit(intStat) },
  };
}

export async function performSurveillance(character: CharacterFull): Promise<object[]> {
  const ENERGY_COST = 3;
  await deductEnergy(character.id, ENERGY_COST);

  const currentEntries = await prisma.dossierEntry.count({
    where: { characterId: character.id, isStale: false },
  });
  const maxSlots = slotLimit(character.int);
  const availableSlots = maxSlots - currentEntries;

  if (availableSlots <= 0) {
    throw AppError.dossierFull();
  }

  const seed = generateSeed();
  const toSave = Math.min(availableSlots, 3);
  const usedIndices = new Set<number>();
  const saved = [];

  const expiresAt = new Date(Date.now() + DOSSIER_TTL_S * 1000);

  for (let i = 0; i < toSave; i++) {
    let idx: number;
    do {
      idx = seededRandomInt(`${seed}_pick_${i}`, 0, NPC_POOL.length - 1);
    } while (usedIndices.has(idx));
    usedIndices.add(idx);

    const template = NPC_POOL[idx];
    const entry = await prisma.dossierEntry.create({
      data: {
        characterId: character.id,
        cityId: character.currentCityId,
        category: template.category,
        subjectName: template.subjectName,
        content: template.content,
        expiresAt,
      },
    });

    // Set Redis TTL for freshness tracking
    await redis.setex(RedisKeys.dossierFresh(entry.id), DOSSIER_TTL_S, '1');
    saved.push(entry);
  }

  return saved;
}

export async function discardEntry(characterId: string, entryId: string): Promise<void> {
  const entry = await prisma.dossierEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.characterId !== characterId) throw AppError.notFound('Dossier entry');
  await prisma.dossierEntry.delete({ where: { id: entryId } });
  await redis.del(RedisKeys.dossierFresh(entryId));
}

export async function sellEntry(
  characterId: string,
  entryId: string,
): Promise<{ ironAwarded: number }> {
  const entry = await prisma.dossierEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.characterId !== characterId) throw AppError.notFound('Dossier entry');

  const baseReward = IRON_BY_CATEGORY[entry.category];
  const stalePenalty = entry.isStale ? 0.3 : 1.0;
  const ironAwarded = Math.floor(baseReward * stalePenalty);

  await prisma.$transaction([
    prisma.dossierEntry.delete({ where: { id: entryId } }),
    prisma.character.update({
      where: { id: characterId },
      data: { ironMarks: { increment: ironAwarded } },
    }),
  ]);
  await redis.del(RedisKeys.dossierFresh(entryId));
  return { ironAwarded };
}
