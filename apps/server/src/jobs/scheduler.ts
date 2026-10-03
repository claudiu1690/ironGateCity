import type { Agenda } from 'agenda';

/**
 * ADR 0025 §5, tech design §9.2: the API schedules the tidy `journey-arrive` job after a boarding
 * commits, through a non-processing Agenda client on the same backend. Best effort: the lazy
 * arrival is the guarantee, so a failure here changes nothing. Tests inject a recorder.
 */

export const JOURNEY_ARRIVE_JOB = 'journey-arrive';

export interface JourneyScheduler {
  arriveAt(journeyId: string, at: Date): Promise<void>;
}

/** No worker (tests, a process without Agenda): nothing is scheduled; arrival stays lazy. */
export const noScheduler: JourneyScheduler = { arriveAt: async () => {} };

let current: JourneyScheduler = noScheduler;

export const journeyScheduler = (): JourneyScheduler => current;

export function setJourneyScheduler(s: JourneyScheduler): void {
  current = s;
}

/** One job per journey (`unique` on the journey id), due at `arrivesAt`. */
export function agendaJourneyScheduler(agenda: Agenda): JourneyScheduler {
  return {
    async arriveAt(journeyId, at) {
      await agenda.ready;
      await agenda
        .create(JOURNEY_ARRIVE_JOB, { journeyId })
        .unique({ 'data.journeyId': journeyId })
        .schedule(at)
        .save();
    },
  };
}

/** A scheduler that records what it was asked (tests). */
export function recordingScheduler(): JourneyScheduler & { calls: Array<{ journeyId: string; at: Date }> } {
  const calls: Array<{ journeyId: string; at: Date }> = [];
  return {
    calls,
    async arriveAt(journeyId, at) {
      calls.push({ journeyId, at });
    },
  };
}
