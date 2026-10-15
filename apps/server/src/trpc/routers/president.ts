import { z } from 'zod';
import { address } from '../../services/presidentService';
import { protectedProcedure, router } from '../trpc';

/** Slice 7 T18 (docs/tech/slice-7.md §8.1): the President's Address (the veto is `parliament.veto`). */
export const presidentRouter = router({
  address: protectedProcedure
    .input(z.object({ issueDocId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => address({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
