import { z } from 'zod';
import { cellsNow, closeHeld, getHeld, heldAct, payOut, strikeMark } from '../../services/heldService';
import { protectedProcedure, router } from '../trpc';

const Keyed = z.object({ idempotencyKey: z.uuid() });

/** Slice 5 (tech design §8.1, ADR 0033): the cells and the infirmary. */
export const heldRouter = router({
  get: protectedProcedure.query(({ ctx }) => getHeld({ user: ctx.user, content: ctx.content, now: ctx.now })),
  /** Review 4 #19 (ADR 0078): *In the cells now* on a police station's sheet. */
  inCells: protectedProcedure
    .input(z.object({ locationId: z.string().min(1) }))
    .query(({ ctx, input }) => cellsNow({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  act: protectedProcedure
    .input(Keyed)
    .mutation(({ ctx, input }) => heldAct({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  bail: protectedProcedure
    .input(Keyed)
    .mutation(({ ctx, input }) => payOut({ user: ctx.user, content: ctx.content, now: ctx.now, how: 'bail', input })),
  walkOut: protectedProcedure
    .input(Keyed)
    .mutation(({ ctx, input }) => payOut({ user: ctx.user, content: ctx.content, now: ctx.now, how: 'walkOut', input })),
  discharge: protectedProcedure
    .input(Keyed)
    .mutation(({ ctx, input }) =>
      payOut({ user: ctx.user, content: ctx.content, now: ctx.now, how: 'discharge', input }),
    ),
  close: protectedProcedure
    .input(z.object({ stayId: z.string().regex(/^[0-9a-f]{24}$/) }))
    .mutation(({ ctx, input }) => closeHeld({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});

/** Slice 5 (design §7.3): *Have a mark struck off*. */
export const recordRouter = router({
  strike: protectedProcedure
    .input(Keyed)
    .mutation(({ ctx, input }) => strikeMark({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
