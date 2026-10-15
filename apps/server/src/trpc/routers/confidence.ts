import { z } from 'zod';
import { getConfidence, openPetition, sign, vote } from '../../services/confidenceService';
import { protectedProcedure, router } from '../trpc';

/** Slice 7 T19 (docs/tech/slice-7.md §8.1): the petition on the Chair and the vote on the Chair. */
export const confidenceRouter = router({
  get: protectedProcedure.query(({ ctx }) => getConfidence({ user: ctx.user, content: ctx.content, now: ctx.now })),
  openPetition: protectedProcedure
    .input(z.object({ idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => openPetition({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  sign: protectedProcedure
    .input(z.object({ idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => sign({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  vote: protectedProcedure
    .input(z.object({ voteId: z.string().min(1), choice: z.enum(['confidence', 'noConfidence']), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => vote({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
