import { z } from 'zod';
import { performAction } from '../../services/actionService';
import { protectedProcedure, router } from '../trpc';

export const actionRouter = router({
  perform: protectedProcedure
    .input(
      z.object({
        actionId: z.string().min(1),
        locationId: z.string().min(1),
        /** Created once per tap on the client; a retry reuses it (ADR 0002). */
        idempotencyKey: z.uuid(),
        /** ×3 / ×5 widen this in slice 1. */
        times: z.literal(1),
      }),
    )
    .mutation(({ ctx, input }) =>
      performAction({ user: ctx.user, content: ctx.content, now: ctx.now, input }),
    ),
});
