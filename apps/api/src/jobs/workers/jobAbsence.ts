/**
 * job:absence — runs every midnight UTC
 *
 * For all characters with a job:
 *   1. Check if lastJobDoneAt is before today (UTC)
 *   2. If so: increment jobAbsences
 *   3. If jobAbsences >= 3: fired — set currentJobId = null
 */

import { prisma } from '../../lib/prisma.js';

export async function runJobAbsence(): Promise<void> {
  const startOfTodayUtc = new Date();
  startOfTodayUtc.setUTCHours(0, 0, 0, 0);

  const employed = await prisma.character.findMany({
    where: { currentJobId: { not: null } },
    select: { id: true, lastJobDoneAt: true, jobAbsences: true, currentJobId: true },
  });

  let absentCount = 0;
  let firedCount = 0;

  await Promise.allSettled(
    employed.map(async (char) => {
      const workedToday =
        char.lastJobDoneAt !== null && char.lastJobDoneAt >= startOfTodayUtc;

      if (workedToday) return; // Present — no action

      const newAbsences = char.jobAbsences + 1;
      absentCount++;

      if (newAbsences >= 3) {
        // Fired
        await prisma.character.update({
          where: { id: char.id },
          data: { currentJobId: null, jobAbsences: 0 },
        });
        firedCount++;
      } else {
        await prisma.character.update({
          where: { id: char.id },
          data: { jobAbsences: newAbsences },
        });
      }
    }),
  );

  console.log(`[job:absence] ${absentCount} absences recorded. ${firedCount} characters fired.`);
}
