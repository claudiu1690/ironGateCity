/**
 * law:expire — delayed job, scheduled at law.expiresAt
 *
 * 1. Set law.status = EXPIRED
 * 2. Emit law:expired to /world namespace
 */

import { prisma } from '../../lib/prisma.js';
import { broadcastLawExpired, broadcastNewsTick } from '../../socket/index.js';

export async function runLawExpire(lawId: string): Promise<void> {
  const law = await prisma.law.findUnique({ where: { id: lawId } });

  if (!law || law.status !== 'ACTIVE') {
    console.log(`[law:expire] Law ${lawId} is not ACTIVE — skipping`);
    return;
  }

  await prisma.law.update({
    where: { id: lawId },
    data: { status: 'EXPIRED' },
  });

  broadcastLawExpired({ lawId, title: law.title });
  broadcastNewsTick(`Law expired: "${law.title}" is no longer in effect.`, 'law');

  console.log(`[law:expire] Law "${law.title}" (${lawId}) expired`);
}
