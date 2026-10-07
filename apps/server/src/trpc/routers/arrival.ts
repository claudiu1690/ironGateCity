import { z } from 'zod';
import { answerArrival, getArrival, joinArrival, startArrival } from '../../services/arrivalService';
import { assetView } from '../../services/views';
import { protectedProcedure, publicProcedure, router } from '../trpc';

/** The arrival (slice-2 tech design §7.1, ADR 0011; review 4, ADR 0073): the face, the three beats. */
export const arrivalRouter = router({
  /** The faces (eighteen), for the sign-up form (before any session exists). */
  faces: publicProcedure.query(({ ctx }) => ctx.content.avatars.map((id) => assetView(ctx.content, id))),

  get: protectedProcedure.query(({ ctx }) => getArrival(ctx.content, ctx.user)),

  /** The face chosen at sign-up: creates the draft (a cosmetic value; last write wins). */
  start: protectedProcedure
    .input(z.object({ avatarId: z.string().min(1) }))
    .mutation(({ ctx, input }) => startArrival(ctx.content, ctx.user, input.avatarId)),

  /** One origin answer; set-once and in order, so a retry returns the same view. */
  answer: protectedProcedure
    .input(z.object({ questionId: z.string().min(1), answerId: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      answerArrival(ctx.content, ctx.user, input.questionId, input.answerId, ctx.now()),
    ),

  /**
   * Review 4 (ADR 0073): once the three beats are in, the join creates the character (beat 1's party),
   * its first day and the welcome edition. No input: idempotent on the user.
   */
  join: protectedProcedure
    .input(z.object({}).strict())
    .mutation(({ ctx }) => joinArrival(ctx.content, ctx.user, ctx.now)),
});
