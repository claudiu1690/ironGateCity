import { z } from 'zod';
import { attemptChapter, chooseChapter, getAmbition } from '../../services/ambitionService';
import { protectedProcedure, router } from '../trpc';

/** Ambition chapters (GDD §17.1, ADR 0013). */
export const ambitionRouter = router({
  get: protectedProcedure.query(({ ctx }) => getAmbition(ctx.content, ctx.user, ctx.now())),

  /** Step 1: a set-once choice, no roll. */
  choose: protectedProcedure
    .input(z.object({ chapter: z.number().int().min(1), choiceId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      chooseChapter(ctx.content, ctx.user, input.chapter, input.choiceId, ctx.now()),
    ),

  /** Step 2: the check, paid in Energy; one key per tap (ADR 0002). */
  attempt: protectedProcedure
    .input(
      z.object({ chapter: z.number().int().min(1), approachId: z.string().min(1), idempotencyKey: z.uuid() }),
    )
    .mutation(({ ctx, input }) =>
      attemptChapter({ user: ctx.user, content: ctx.content, now: ctx.now, input }),
    ),
});
