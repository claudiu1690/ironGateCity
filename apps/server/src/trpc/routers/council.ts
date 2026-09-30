import { dayKey } from '@irongate/rules';
import { z } from 'zod';
import { councilVote, declare, endorse, propose, vote, withdraw } from '../../services/councilService';
import { loadCharacter } from '../../services/dayService';
import { councilView, electionView, getCount } from '../../services/politicsService';
import { protectedProcedure, router } from '../trpc';

/**
 * Slice 3 (tech design §8.1): the home council. No input names a city or a character: the
 * session's character and its home city decide everything (§13).
 */
export const councilRouter = router({
  /** The slate (nominations) or the ballot (polls): never another voter's choice or a total. */
  election: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const { doc } = await loadCharacter(ctx.user, ctx.content, now);
    return electionView(ctx.content, doc, dayKey(now));
  }),

  /** The latest counted election by default; null while the asked-for election is open. */
  count: protectedProcedure
    .input(
      z
        .object({
          electionId: z
            .string()
            .regex(/^[a-z]+:\d+$/)
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const { doc } = await loadCharacter(ctx.user, ctx.content, ctx.now());
      return getCount(ctx.content, doc, input?.electionId);
    }),

  /** The sitting council: seats, the order paper, the vote. */
  chamber: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const { doc, city } = await loadCharacter(ctx.user, ctx.content, now);
    return councilView(ctx.content, doc, city, dayKey(now));
  }),

  declare: protectedProcedure
    .input(z.object({ platformId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => declare({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  withdraw: protectedProcedure
    .input(z.object({ idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => withdraw({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  endorse: protectedProcedure
    .input(z.object({ candidacyId: z.string().regex(/^[0-9a-f]{24}$/), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => endorse({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  /** One tap, one candidate, final (ADR 0019). */
  vote: protectedProcedure
    .input(
      z.object({
        candidateKey: z.string().regex(/^(p:[0-9a-f]{24}|n:[a-z0-9.-]+)$/),
        idempotencyKey: z.uuid(),
      }),
    )
    .mutation(({ ctx, input }) => vote({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  propose: protectedProcedure
    .input(z.object({ ordinanceId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => propose({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  /** An ordinance id on the order paper, or 'against'. */
  councilVote: protectedProcedure
    .input(z.object({ choice: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => councilVote({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
