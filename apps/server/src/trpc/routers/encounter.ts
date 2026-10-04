import { z } from 'zod';
import { chooseRunIn, closeRunIn, currentRunIn } from '../../services/streetService';
import { protectedProcedure, router } from '../trpc';

const EncounterId = z.string().regex(/^[0-9a-f]{24}$/);

/** Slice 5 (tech design §8.1, ADR 0032): the run-in's one choice, its modal state and its close. */
export const encounterRouter = router({
  current: protectedProcedure.query(({ ctx }) =>
    currentRunIn({ user: ctx.user, content: ctx.content, now: ctx.now }),
  ),
  choose: protectedProcedure
    .input(
      z.object({
        encounterId: EncounterId,
        choice: z.enum(['fight', 'run', 'talk', 'pay', 'luck']),
        idempotencyKey: z.uuid(),
      }),
    )
    .mutation(({ ctx, input }) => chooseRunIn({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  close: protectedProcedure
    .input(z.object({ encounterId: EncounterId }))
    .mutation(({ ctx, input }) => closeRunIn({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
