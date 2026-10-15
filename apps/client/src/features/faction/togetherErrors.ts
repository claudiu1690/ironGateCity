import { copy } from '@irongate/content/copy';
import { gameErrorOf } from '../../lib/trpc';
import { noticeFor } from '../game/errors';

const e = copy.together.errors;
const limits = copy.together.chat.limits;

/**
 * Slice 6: a refused favour, chat line, ask or mute, worded (`copy.together.errors`). The server's
 * reason decides; anything not of slice 6 falls back to the game's wording.
 */
export function togetherNotice(error: unknown): string | undefined {
  if (!error) return undefined;
  const g = gameErrorOf(error);
  if (!g) return noticeFor(error);
  if (g.reason === 'CHAT_RATE' || g.reason === 'CHAT_TEXT' || g.reason === 'CHAT_REFUSED') return chatLimitLine(error) ?? undefined;
  if (g.reason === 'NOT_ENOUGH_IRON') return e.NOT_ENOUGH_IRON(Number(g.need ?? g.cost ?? 0));
  if (g.reason === 'NOT_ENOUGH_ENERGY') return noticeFor(error);
  if ((g.reason as string) === 'ALREADY_VISITED') return e.VISITED;
  const v = (e as Record<string, unknown>)[g.reason];
  return typeof v === 'string' ? v : noticeFor(error);
}

/**
 * The composer's limit line (screens §2.5), only when hit: *One message every three seconds* ·
 * *Thirty messages in ten minutes…; back in {n} minutes* · *Said that already* · *That can't be said here.*
 */
export function chatLimitLine(error: unknown, now: number = Date.now()): string | null {
  const g = gameErrorOf(error);
  if (!g) return null;
  if (g.reason === 'CHAT_TEXT') return g.why === 'tooLong' ? limits.tooLong : limits.empty;
  // Review 7 #2 (design §23.1): the word filter; the draft stays in the composer.
  if (g.reason === 'CHAT_REFUSED') return limits.refused;
  if (g.reason !== 'CHAT_RATE') return null;
  if (g.why === 'tooMany') {
    const retryAt = typeof g.retryAt === 'number' ? g.retryAt : now + 60_000;
    return limits.tooMany(Math.max(1, Math.ceil((retryAt - now) / 60_000)));
  }
  if (g.why === 'repeat') return limits.repeat;
  return limits.tooFast;
}
