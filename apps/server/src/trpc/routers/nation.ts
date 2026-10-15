import { z } from 'zod';
import { loadCharacter } from '../../services/dayService';
import {
  back,
  nationalElectionView,
  nationalResultView,
  pickView,
  pickVote,
  standList,
  standPresident,
  vote,
  withdrawPresident,
} from '../../services/nationalElectionService';
import { getNation } from '../../services/nationService';
import { protectedProcedure, router } from '../trpc';

const LawId = z.string().regex(/^law\.[a-z-]+$/);

/**
 * Slice 7 (docs/tech/slice-7.md §8.1). The republic: `nation.get` (T11); the national election (T17):
 * names in, the party's pick, the republic's vote (named by party: the three candidates are one per
 * party and frozen), backing, the result. Ballots are secret (the caller's own choice only).
 */
export const nationRouter = router({
  get: protectedProcedure.query(({ ctx }) => getNation({ user: ctx.user, content: ctx.content, now: ctx.now() })),
  election: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const { doc } = await loadCharacter(ctx.user, ctx.content, now);
    return nationalElectionView(ctx.content, doc, now);
  }),
  standPresident: protectedProcedure
    .input(z.object({ pledges: z.tuple([LawId, LawId]), platformId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => standPresident({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  withdrawPresident: protectedProcedure
    .input(z.object({ idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => withdrawPresident({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  standList: protectedProcedure
    .input(z.object({ idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => standList({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  pick: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const { doc } = await loadCharacter(ctx.user, ctx.content, now);
    return pickView(ctx.content, doc, now);
  }),
  pickVote: protectedProcedure
    .input(z.object({ key: z.string().regex(/^(p:[0-9a-f]{24}|n:[a-z.]+)$/), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => pickVote({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  vote: protectedProcedure
    .input(z.object({ factionId: z.enum(['vanguard', 'collective', 'alliance']), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => vote({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  back: protectedProcedure
    .input(
      z.object({
        target: z.union([
          z.strictObject({ kind: z.literal('president') }),
          z.strictObject({ kind: z.literal('list'), candidacyId: z.string().regex(/^[0-9a-f]{24}$/) }),
        ]),
        idempotencyKey: z.uuid(),
      }),
    )
    .mutation(({ ctx, input }) => back({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  result: protectedProcedure
    .input(z.object({ termIndex: z.int().optional() }).optional())
    .query(({ ctx, input }) => nationalResultView({ user: ctx.user, content: ctx.content, now: ctx.now }, input?.termIndex)),
});
