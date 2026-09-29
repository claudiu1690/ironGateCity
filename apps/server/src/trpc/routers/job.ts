import { z } from 'zod';
import { takeJob } from '../../services/jobService';
import { protectedProcedure, router } from '../trpc';

export const jobRouter = router({
  /** §9.1: take a job (free) or switch (2 Energy, streak resets) at its location (ADR 0008). */
  take: protectedProcedure
    .input(z.object({ jobId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => takeJob({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
