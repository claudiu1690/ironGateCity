import { prisma } from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { deductEnergy } from './energyService.js';
import { seededRandomInt, generateSeed } from '../lib/rng.js';
import type { CharacterFull } from '../types.js';

export async function listAvailable(character: CharacterFull) {
  const jobs = await prisma.job.findMany({
    where: {
      minLevel: { lte: character.level },
      minStr: { lte: character.str },
      minInt: { lte: character.int },
      minAgi: { lte: character.agi },
      minFactionRank: { lte: character.factionRank },
      OR: [
        { cityId: null },
        { cityId: character.currentCityId },
        { requiresTravel: false },
      ],
    },
    orderBy: [{ tier: 'asc' }, { ironMinPay: 'asc' }],
  });

  return jobs.map((j) => ({
    ...j,
    isCurrent: j.id === character.currentJobId,
    travelRequired: j.requiresTravel && j.cityId !== null && j.cityId !== character.currentCityId,
  }));
}

export async function takeJob(character: CharacterFull, jobId: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new AppError(404, 'Job not found.');

  // Stat gate checks
  if (character.level < job.minLevel) throw new AppError(400, `Requires Level ${job.minLevel}.`);
  if (character.str < job.minStr) throw new AppError(400, `Requires ${job.minStr} Strength.`);
  if (character.int < job.minInt) throw new AppError(400, `Requires ${job.minInt} Intelligence.`);
  if (character.agi < job.minAgi) throw new AppError(400, `Requires ${job.minAgi} Agility.`);
  if (character.factionRank < job.minFactionRank) {
    throw new AppError(400, `Requires Faction Rank ${job.minFactionRank}.`);
  }

  // Switching job costs 2 Energy
  if (character.currentJobId && character.currentJobId !== jobId) {
    await deductEnergy(character.id, 2);
  }

  await prisma.character.update({
    where: { id: character.id },
    data: { currentJobId: jobId, jobAbsences: 0, lastJobDoneAt: null },
  });
}

export async function doWork(character: CharacterFull): Promise<{ ironEarned: number }> {
  if (!character.currentJobId || !character.currentJob) {
    throw new AppError(400, 'You are not currently employed.');
  }

  const job = character.currentJob;

  // Once per day gate
  if (character.lastJobDoneAt) {
    const lastDone = new Date(character.lastJobDoneAt);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    if (lastDone >= startOfDay) {
      throw new AppError(400, 'You have already worked today. Come back tomorrow.');
    }
  }

  // Travel check — non-premium characters must be in the job's city
  if (job.requiresTravel && job.cityId && job.cityId !== character.currentCityId) {
    throw new AppError(400, 'You must travel to the job city before working.');
  }

  await deductEnergy(character.id, job.energyCost);

  const seed = generateSeed();
  const ironEarned = seededRandomInt(seed, job.ironMinPay, job.ironMaxPay);

  await prisma.character.update({
    where: { id: character.id },
    data: {
      ironMarks: { increment: ironEarned },
      lastJobDoneAt: new Date(),
      jobAbsences: 0,
    },
  });

  return { ironEarned };
}

export async function quitJob(characterId: string): Promise<void> {
  await prisma.character.update({
    where: { id: characterId },
    data: { currentJobId: null, jobAbsences: 0 },
  });
}
