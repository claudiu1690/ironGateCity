import { z } from 'zod';
import { address, setRule } from '../../services/governorOffice';
import { protectedProcedure, router } from '../trpc';

/** Slice 7 T13 (docs/tech/slice-7.md §8.1): the Governor's (or Mayor's) rule and the Address. */
export const governorRouter = router({
  setRule: protectedProcedure
    .input(z.object({ ordinanceId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => setRule({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  address: protectedProcedure
    .input(z.object({ issueDocId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => address({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
