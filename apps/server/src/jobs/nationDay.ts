import type { GameContent } from '@irongate/content';
import type { Agenda } from 'agenda';
import { runNationDay } from '../services/nationDay';

/** The Agenda job name (slice-7 tech design §9). */
export const NATION_DAY_JOB = 'nation-day';

/**
 * Slice 7 (§9, ADR 0043): every council city's day, then the nation's, at 00:02 UTC (after the
 * city day's 00:01) and once at worker start. Idempotent: the `world.settledDay` guards and every
 * derived document's natural key; the lazy path (`ensureNationDay`) is the guarantee.
 */
export async function scheduleNationDay(
  agenda: Agenda,
  content: GameContent,
  log: (message: string) => void,
  now: () => number = Date.now,
): Promise<void> {
  agenda.define(
    NATION_DAY_JOB,
    async () => {
      const r = await runNationDay(content, now());
      log(`nation day: settled ${r.settledDay}`);
    },
    { concurrency: 1, lockLifetime: 10 * 60_000 },
  );
  await agenda.every('2 0 * * *', NATION_DAY_JOB, undefined, { timezone: 'UTC' });
  await agenda.now(NATION_DAY_JOB);
}
