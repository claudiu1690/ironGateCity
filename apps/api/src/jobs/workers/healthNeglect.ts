/**
 * health:neglect — runs every 10 minutes
 *
 * For all non-hospitalised characters:
 *   - If lastFedAt > 24h:  Hunger  → drain 5 HP (soft floor: 30 HP)
 *   - If lastRestedAt > 24h: Fatigue → drain 3 HP (soft floor: 30 HP)
 *
 * Emits health:updated to each affected player's socket room.
 */

import { prisma } from '../../lib/prisma.js';
import { pushHealthUpdate } from '../../socket/index.js';

const SOFT_FLOOR = 30;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export async function runHealthNeglect(): Promise<void> {
  const now = Date.now();
  const cutoff = new Date(now - TWENTY_FOUR_HOURS);

  const characters = await prisma.character.findMany({
    where: { isHospitalised: false },
    select: {
      id: true,
      userId: true,
      currentHealth: true,
      maxHealth: true,
      lastFedAt: true,
      lastRestedAt: true,
    },
  });

  let updated = 0;

  await Promise.allSettled(
    characters.map(async (char) => {
      const isHungry   = char.lastFedAt   < cutoff;
      const isFatigued = char.lastRestedAt < cutoff;

      if (!isHungry && !isFatigued) return;

      let drain = 0;
      if (isHungry)   drain += 5;
      if (isFatigued) drain += 3;

      const newHp = Math.max(SOFT_FLOOR, char.currentHealth - drain);
      if (newHp === char.currentHealth) return; // At floor — no change needed

      await prisma.character.update({
        where: { id: char.id },
        data: { currentHealth: newHp },
      });

      pushHealthUpdate(char.userId, { currentHealth: newHp, maxHealth: char.maxHealth });
      updated++;
    }),
  );

  if (updated > 0) {
    console.log(`[health:neglect] Applied neglect drain to ${updated} characters`);
  }
}
