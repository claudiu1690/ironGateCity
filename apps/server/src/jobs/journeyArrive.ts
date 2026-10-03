import type { GameContent } from '@irongate/content';
import type { Agenda } from 'agenda';
import { settleArrival } from '../services/journeyArrival';
import { JOURNEY_ARRIVE_JOB } from './scheduler';

/**
 * ADR 0025 §5, tech design §9.2: the tidy job, scheduled by the API at boarding for `arrivesAt`.
 * Its handler is the lazy path's own `settleArrival`: two conditional updates, so a duplicate, a
 * late run or a request racing it settles the arrival once; a run before `arrivesAt` does nothing.
 */
export function defineJourneyArrive(
  agenda: Agenda,
  content: GameContent,
  log: (message: string) => void,
  now: () => number = Date.now,
): void {
  agenda.define<{ journeyId: string }>(
    JOURNEY_ARRIVE_JOB,
    async (job) => {
      const id = job.attrs.data.journeyId;
      if (await settleArrival(content, id, now())) log(`journey ${id} arrived`);
    },
    { concurrency: 5, lockLifetime: 60_000 },
  );
}
