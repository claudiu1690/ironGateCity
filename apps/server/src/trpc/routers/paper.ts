import { z } from 'zod';
import { getPaper, markPaperRead } from '../../services/paperService';
import { protectedProcedure, router } from '../trpc';

export const paperRouter = router({
  /** Today's Morning Paper (§3.3). */
  today: protectedProcedure.query(({ ctx }) =>
    getPaper({ user: ctx.user, content: ctx.content, now: ctx.now() }),
  ),

  /** No-op if already read; not game state, so no idempotency key. */
  markRead: protectedProcedure
    .input(z.object({ day: z.number().int() }))
    .mutation(({ ctx, input }) =>
      markPaperRead({ user: ctx.user, content: ctx.content, now: ctx.now(), day: input.day }),
    ),
});
