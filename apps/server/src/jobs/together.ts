import type { GameContent } from '@irongate/content';
import type { Agenda } from 'agenda';
import { Types } from 'mongoose';
import { trimChat } from '../services/chatService';
import { EVENT_RESOLVE_JOB } from '../services/eventScheduler';
import { resolveEvent } from '../services/eventService';

/** Slice 6 (tech design §9): the daily chat trim. */
export const CHAT_TRIM_JOB = 'chat-trim';

/**
 * Slice 6 (ADR 0037, tech design §9): `campaign-event-resolve`, scheduled by the API at `startsAt`.
 * Its handler is the lazy path's own `resolveEvent`: the `status: 'open'` guard makes a duplicate, a
 * late run or a read racing it resolve once; a run before `startsAt` does nothing.
 */
export function defineEventResolve(
  agenda: Agenda,
  content: GameContent,
  log: (message: string) => void,
  now: () => number = Date.now,
): void {
  agenda.define<{ eventId: string }>(
    EVENT_RESOLVE_JOB,
    async (job) => {
      const id = job.attrs.data.eventId;
      if (!Types.ObjectId.isValid(id)) return;
      if (await resolveEvent(content, new Types.ObjectId(id), now())) log(`event ${id} resolved`);
    },
    { concurrency: 5, lockLifetime: 60_000 },
  );
}

/**
 * Slice 6 (ADR 0039): lines older than each channel's 200th newest, daily at 00:30 UTC and at
 * worker start. Storage hygiene only: the history read never shows past the 200th; the TTL index
 * removes lines after seven days.
 */
export async function scheduleChatTrim(agenda: Agenda, content: GameContent, log: (message: string) => void): Promise<void> {
  agenda.define(
    CHAT_TRIM_JOB,
    async () => {
      const n = await trimChat(content);
      if (n > 0) log(`chat trim: ${n} lines`);
    },
    { concurrency: 1, lockLifetime: 10 * 60_000 },
  );
  await agenda.every('30 0 * * *', CHAT_TRIM_JOB, undefined, { timezone: 'UTC' });
  await agenda.now(CHAT_TRIM_JOB);
}
