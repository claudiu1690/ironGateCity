/**
 * influence:decay — runs every 24 hours (1am UTC)
 *
 * For each city:
 *   1. Check if any missions completed in that city in the last 24 hours
 *   2. If NO missions ran: decay each faction's influence by 1% toward 33.33% equilibrium
 *   3. Re-normalise so total == 100
 *   4. Save to DB + emit Socket.io update
 */

import { prisma } from '../../lib/prisma.js';
import { broadcastInfluenceUpdate, broadcastNewsTick } from '../../socket/index.js';
import { computeNationalControl } from '../../services/ruleEngine.js';

const EQUILIBRIUM = 33.33;
const DECAY_RATE = 1.0;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function decayToward(pct: number): number {
  if (pct > EQUILIBRIUM + DECAY_RATE) return pct - DECAY_RATE;
  if (pct < EQUILIBRIUM - DECAY_RATE) return pct + DECAY_RATE;
  return EQUILIBRIUM;
}

export async function runInfluenceDecay(): Promise<void> {
  const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);

  const cities = await prisma.city.findMany({
    include: { influence: true },
  });

  let decayed = 0;

  for (const city of cities) {
    if (!city.influence) continue;

    // Check if any missions ran in this city recently
    const missionCount = await prisma.missionLog.count({
      where: {
        mission: { cityId: city.id },
        createdAt: { gte: since },
      },
    });

    if (missionCount > 0) continue; // Active city — no decay

    let { fascistPct: f, communistPct: c, democratPct: d } = city.influence;

    f = decayToward(f);
    c = decayToward(c);
    d = decayToward(d);

    // Re-normalise to ensure sum == 100
    const total = f + c + d;
    if (total > 0) {
      f = (f / total) * 100;
      c = (c / total) * 100;
      d = (d / total) * 100;
    }

    await prisma.cityInfluence.update({
      where: { cityId: city.id },
      data: { fascistPct: f, communistPct: c, democratPct: d },
    });

    // Compute national control for the broadcast payload
    const allInfluences = await prisma.cityInfluence.findMany({ include: { city: true } });
    const national = computeNationalControl(allInfluences);

    broadcastInfluenceUpdate(city.slug, {
      cityId: city.id,
      citySlug: city.slug,
      fascistPct: f,
      communistPct: c,
      democratPct: d,
      nationalControl: national,
    });

    decayed++;
  }

  if (decayed > 0) {
    console.log(`[influence:decay] Decayed ${decayed} inactive cities toward equilibrium`);
  }
}
