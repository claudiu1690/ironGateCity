/**
 * criminal:decay — runs every midnight UTC
 *
 * For each character with criminalPoints > 0:
 *   If lastOffenceAt > 14 days ago AND criminalPoints === 1:
 *     → Set criminalPoints = 0 (clean record)
 *
 * The decay only clears the final point — rehabilitation is slow by design.
 */

import { prisma } from '../../lib/prisma.js';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export async function runCriminalDecay(): Promise<void> {
  const cutoff = new Date(Date.now() - FOURTEEN_DAYS_MS);

  const cleared = await prisma.character.updateMany({
    where: {
      criminalPoints: 1,
      lastOffenceAt: { lt: cutoff },
    },
    data: { criminalPoints: 0 },
  });

  if (cleared.count > 0) {
    console.log(`[criminal:decay] Cleared criminal record for ${cleared.count} characters`);
  }
}
