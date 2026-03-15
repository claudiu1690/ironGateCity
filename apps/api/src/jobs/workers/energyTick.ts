/**
 * energy:tick — runs every 1 minute
 *
 * For all characters not at max Energy:
 *   1. Read their hash from Redis (or fall back to DB)
 *   2. Compute elapsed time since lastTickAt
 *   3. If at least one tick boundary crossed: add Energy, cap at max, write Redis + Postgres
 *   4. Emit energy:updated to the player's socket room
 *
 * Processes in batches of 500.
 */

import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { applyTickToCharacter } from '../../services/energyService.js';

const BATCH_SIZE = 500;
const ENERGY_KEY = (id: string) => `energy:${id}`;

export async function runEnergyTick(): Promise<void> {
  let offset = 0;
  let processed = 0;

  // We need userId to push socket events → include character relation
  while (true) {
    const batch = await prisma.energyState.findMany({
      take: BATCH_SIZE,
      skip: offset,
      include: { character: { select: { userId: true } } },
    });

    if (batch.length === 0) break;

    await Promise.allSettled(
      batch.map(async (state) => {
        if (state.current >= state.max) return; // Already at max — skip

        const cached = await redis.hgetall(ENERGY_KEY(state.characterId));
        const lastTickAt = cached.lastTickAt
          ? parseInt(cached.lastTickAt, 10)
          : state.lastTickAt.getTime();
        const currentStored = cached.current
          ? parseInt(cached.current, 10)
          : state.current;

        await applyTickToCharacter(
          state.characterId,
          state.character.userId,
          currentStored,
          state.max,
          lastTickAt,
        );

        processed++;
      }),
    );

    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  if (processed > 0) {
    console.log(`[energy:tick] Ticked ${processed} characters`);
  }
}
