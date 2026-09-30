import type { GameContent } from '@irongate/content';
import type { Agenda } from 'agenda';
import { runCityDay } from '../services/cityDay';

/** The Agenda job name (tech design §9). */
export const CITY_DAY_JOB = 'city-day';

/**
 * ADR 0017: the city day as a scheduled job, the primary runner. At 00:01 UTC (a minute's margin
 * for clock skew) and once at worker start; Agenda also runs an overdue job when it comes back.
 * Idempotent: every boundary is guarded by `world.settledDay`, so the job, a concurrent request or
 * a second worker settle each boundary once. A failure in one city does not stop the others; the
 * run then fails so Agenda records it.
 */
export async function scheduleCityDay(
  agenda: Agenda,
  content: GameContent,
  log: (message: string) => void,
  now: () => number = Date.now,
): Promise<void> {
  agenda.define(
    CITY_DAY_JOB,
    async () => {
      const r = await runCityDay(content, now());
      log(`city day: ${r.settled.map((s) => `${s.cityId}@${s.settledDay}`).join(', ')}`);
    },
    { concurrency: 1, lockLifetime: 10 * 60_000 },
  );
  // One job document by name: running this at every start is idempotent.
  await agenda.every('1 0 * * *', CITY_DAY_JOB, undefined, { timezone: 'UTC' });
  await agenda.now(CITY_DAY_JOB);
}
