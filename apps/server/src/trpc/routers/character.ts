import { STAT_POINT_TARGETS } from '@irongate/rules';
import { z } from 'zod';
import { loadCharacter } from '../../services/dayService';
import { placeStatPoint } from '../../services/statService';
import { toCharacterView } from '../../services/views';
import { protectedProcedure, router } from '../trpc';

export const characterRouter = router({
  /** Get-or-create the caller's character, settle the City Day, project Energy and Rested to now. */
  me: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const { doc, editionReadAt } = await loadCharacter(ctx.user, ctx.content, now);
    return toCharacterView(doc, now, ctx.content, editionReadAt);
  }),

  /** §5.3: one tap places one waiting stat point on STR or INT (ADR 0008). */
  placeStatPoint: protectedProcedure
    .input(z.object({ stat: z.enum(STAT_POINT_TARGETS), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) =>
      placeStatPoint({ user: ctx.user, content: ctx.content, now: ctx.now, input }),
    ),
});
