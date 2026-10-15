import { z } from 'zod';
import { back, chairElectionView, chairResultView, stand, vote } from '../../services/chairElectionService';
import { loadCharacter } from '../../services/dayService';
import { protectedProcedure, router } from '../trpc';

/**
 * Slice 7 T14 (docs/tech/slice-7.md §8.1): the Faction Chair's election. No input names the caller's
 * faction: the session's character decides. Votes are secret (the caller's own choice only).
 */
export const chairElectionRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const { doc } = await loadCharacter(ctx.user, ctx.content, now);
    return chairElectionView(ctx.content, doc, now);
  }),
  stand: protectedProcedure
    .input(z.object({ platformId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => stand({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  back: protectedProcedure
    .input(z.object({ candidacyId: z.string().regex(/^[0-9a-f]{24}$/), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => back({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  vote: protectedProcedure
    .input(z.object({ key: z.string().regex(/^(p:[0-9a-f]{24}|n:secretary)$/), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => vote({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  result: protectedProcedure
    .input(z.object({ termIndex: z.int().optional() }).optional())
    .query(({ ctx, input }) => chairResultView({ user: ctx.user, content: ctx.content, now: ctx.now }, input?.termIndex)),
});
