import { STAT_POINT_TARGETS } from '@irongate/rules';
import { z } from 'zod';
import { setAvatar } from '../../services/avatarService';
import { loadCharacter } from '../../services/dayService';
import { placeStatPoint } from '../../services/statService';
import { toCharacterView } from '../../services/views';
import { protectedProcedure, router } from '../trpc';

export const characterRouter = router({
  /** The caller's character (ARRIVAL_PENDING before the join), the City Day settled, timers projected. */
  me: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const { doc, editionReadAt } = await loadCharacter(ctx.user, ctx.content, now);
    return toCharacterView(doc, now, ctx.content, editionReadAt);
  }),

  /** §7.3: change the face, free, any time (a cosmetic value: last write wins, ADR 0008). */
  setAvatar: protectedProcedure
    .input(z.object({ avatarId: z.string().min(1) }))
    .mutation(({ ctx, input }) => setAvatar(ctx.user, ctx.content, ctx.now(), input.avatarId)),

  /** §5.3: one tap places one waiting stat point on STR or INT (ADR 0008). */
  placeStatPoint: protectedProcedure
    .input(z.object({ stat: z.enum(STAT_POINT_TARGETS), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) =>
      placeStatPoint({ user: ctx.user, content: ctx.content, now: ctx.now, input }),
    ),
});
