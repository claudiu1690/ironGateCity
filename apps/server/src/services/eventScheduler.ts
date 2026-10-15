import type { Agenda } from 'agenda';

/**
 * Slice 6 (ADR 0037, tech design §9): the API schedules `campaign-event-resolve` at `startsAt` after a
 * call commits, through the non-processing Agenda client (as `journey-arrive`). Best effort: the lazy
 * paths (any read of the event, a participant's read, the city day before a boundary) are the
 * guarantee.
 */
export const EVENT_RESOLVE_JOB = 'campaign-event-resolve';

export interface EventScheduler {
  resolveAt(eventId: string, at: Date): Promise<void>;
}

export const noEventScheduler: EventScheduler = { resolveAt: async () => {} };

let current: EventScheduler = noEventScheduler;

export const eventScheduler = (): EventScheduler => current;

export function setEventScheduler(s: EventScheduler): void {
  current = s;
}

/** One job per event (`unique` on the event id), due at `startsAt`. */
export function agendaEventScheduler(agenda: Agenda): EventScheduler {
  return {
    async resolveAt(eventId, at) {
      await agenda.ready;
      await agenda.create(EVENT_RESOLVE_JOB, { eventId }).unique({ 'data.eventId': eventId }).schedule(at).save();
    },
  };
}
