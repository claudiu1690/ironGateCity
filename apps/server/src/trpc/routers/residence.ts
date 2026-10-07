import { z } from 'zod';
import { register, takeRoom } from '../../services/residenceService';
import { protectedProcedure, router } from '../trpc';

/**
 * Slice 4 (tech design §8.1, ADR 0026): where you live. The city and district are a choice, checked
 * against the character's state in the transaction (standing in that city, not on a train).
 */
export const residenceRouter = router({
  register: protectedProcedure
    .input(
      z.object({
        cityId: z.string().min(1),
        districtId: z.string().min(1).nullable(),
        idempotencyKey: z.uuid(),
      }),
    )
    .mutation(({ ctx, input }) => register({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  /** Review 4 #9 (tech design §10.3): a bed at the place with the Lodgings card. */
  room: protectedProcedure
    .input(z.object({ locationId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => takeRoom({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
