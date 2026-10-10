import { z } from 'zod';
import { answerPatrol } from '../../services/patrol';
import { protectedProcedure, router } from '../trpc';

export const patrolRouter = router({
  /**
   * Review 5 (ADR 0081, tech design §8.3): answer the patrol card waiting in the city (a row, or
   * *Let it pass*); request-keyed, the journey card's rules at 14.
   */
  answer: protectedProcedure
    .input(z.object({ choiceId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => answerPatrol({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
