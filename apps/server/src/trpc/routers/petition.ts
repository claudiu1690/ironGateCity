import { z } from 'zod';
import { getPetition, open, sign } from '../../services/petitionService';
import { protectedProcedure, router } from '../trpc';

/** Slice 7 T19 (docs/tech/slice-7.md §8.1): a petition to dissolve the residence city's council. */
export const petitionRouter = router({
  get: protectedProcedure
    .input(z.object({ cityId: z.string().min(1).optional() }).optional())
    .query(({ ctx, input }) => getPetition({ user: ctx.user, content: ctx.content, now: ctx.now }, input?.cityId)),
  open: protectedProcedure
    .input(z.object({ idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => open({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  sign: protectedProcedure
    .input(z.object({ petitionId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => sign({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
