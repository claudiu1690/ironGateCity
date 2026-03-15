/**
 * dossier:stale — runs every hour
 *
 * Finds all DossierEntry records where:
 *   expiresAt < now AND isStale = false
 *
 * Sets isStale = true in batch and emits dossier:stale to each affected player.
 */

import { prisma } from '../../lib/prisma.js';
import { redis, RedisKeys } from '../../lib/redis.js';
import { pushDossierStale } from '../../socket/index.js';

export async function runDossierStale(): Promise<void> {
  const now = new Date();

  const expiredEntries = await prisma.dossierEntry.findMany({
    where: { expiresAt: { lt: now }, isStale: false },
    include: { character: { select: { userId: true } } },
  });

  if (expiredEntries.length === 0) return;

  // Batch update in DB
  await prisma.dossierEntry.updateMany({
    where: { id: { in: expiredEntries.map((e) => e.id) } },
    data: { isStale: true },
  });

  // Notify each affected player + clean up Redis TTL keys
  for (const entry of expiredEntries) {
    pushDossierStale(entry.character.userId, { entryId: entry.id });
    await redis.del(RedisKeys.dossierFresh(entry.id));
  }

  console.log(`[dossier:stale] Marked ${expiredEntries.length} entries as stale`);
}
