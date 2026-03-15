/**
 * bodyguard:upkeep — runs every midnight UTC
 *
 * For all characters with active bodyguards:
 *   1. Sum daily costs across all active guards
 *   2. Deduct from ironMarks
 *   3. If insufficient Iron: dismiss that guard (active = false)
 */

import { prisma } from '../../lib/prisma.js';

export async function runBodyguardUpkeep(): Promise<void> {
  const characters = await prisma.character.findMany({
    where: { bodyguards: { some: { active: true } } },
    select: {
      id: true,
      ironMarks: true,
      bodyguards: { where: { active: true }, select: { id: true, tier: true, dailyCost: true } },
    },
  });

  let dismissed = 0;
  let deducted = 0;

  await Promise.allSettled(
    characters.map(async (char) => {
      let iron = char.ironMarks;

      for (const guard of char.bodyguards) {
        if (iron >= guard.dailyCost) {
          iron -= guard.dailyCost;
          deducted += guard.dailyCost;
        } else {
          // Can't pay — dismiss this guard
          await prisma.bodyguard.update({
            where: { id: guard.id },
            data: { active: false },
          });
          dismissed++;
        }
      }

      if (iron !== char.ironMarks) {
        await prisma.character.update({
          where: { id: char.id },
          data: { ironMarks: iron },
        });
      }
    }),
  );

  console.log(
    `[bodyguard:upkeep] Deducted ${deducted} Iron total. Dismissed ${dismissed} guards for non-payment.`,
  );
}
