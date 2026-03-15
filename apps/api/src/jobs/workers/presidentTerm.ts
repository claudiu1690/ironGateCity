/**
 * president:term — delayed job, scheduled at president.termEnds
 *
 * 1. Delete the ActivePresident record
 * 2. Emit announcement to /world
 * 3. Re-election check is handled by election:check cron (runs every 15 min)
 */

import { prisma } from '../../lib/prisma.js';
import { broadcastNewsTick } from '../../socket/index.js';

export async function runPresidentTerm(characterId: string): Promise<void> {
  const president = await prisma.activePresident.findUnique({ where: { characterId } });

  if (!president) {
    console.log(`[president:term] No active president for character ${characterId}`);
    return;
  }

  // Fetch character name for the broadcast
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { name: true, faction: true },
  });

  await prisma.activePresident.delete({ where: { characterId } });

  broadcastNewsTick(
    `The term of ${character?.name ?? 'the President'} (${character?.faction ?? ''}) has ended. A new election may follow.`,
    'president',
  );

  console.log(`[president:term] Term ended for character ${characterId}`);
}
