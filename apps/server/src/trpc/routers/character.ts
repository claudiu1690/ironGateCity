import { STAT_POINT_TARGETS } from '@irongate/rules';
import { z } from 'zod';
import { setAvatar } from '../../services/avatarService';
import { seeOrdersNote } from '../../services/ordersService';
import { fullCharacterView } from '../../services/meView';
import { placeStatPoint } from '../../services/statService';
import { treatAt } from '../../services/treatmentService';
import { protectedProcedure, router } from '../trpc';

export const characterRouter = router({
  /** The caller's character (ARRIVAL_PENDING before the join), the City Day settled, timers projected. */
  me: protectedProcedure.query(({ ctx }) => fullCharacterView(ctx.user, ctx.content, ctx.now())),

  /** §7.3: change the face, free, any time (a cosmetic value: last write wins, ADR 0008). */
  setAvatar: protectedProcedure
    .input(z.object({ avatarId: z.string().min(1) }))
    .mutation(({ ctx, input }) => setAvatar(ctx.user, ctx.content, ctx.now(), input.avatarId)),

  /** §5.3: one tap places one waiting stat point on STR, INT or AGI (review 1; ADR 0008). */
  placeStatPoint: protectedProcedure
    .input(z.object({ stat: z.enum(STAT_POINT_TARGETS), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) =>
      placeStatPoint({ user: ctx.user, content: ctx.content, now: ctx.now, input }),
    ),

  /** Review 5 (answers §8, tech design §6.2): *Get patched up · n Iron* at an infirmary (request-keyed). */
  treat: protectedProcedure
    .input(z.object({ locationId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => treatAt({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  /** Review 1 (§13.7): the orders-complete note was seen (Carry on); idempotent, today only. */
  seeOrdersNote: protectedProcedure.mutation(({ ctx }) =>
    seeOrdersNote({ user: ctx.user, content: ctx.content, now: ctx.now() }),
  ),
});
