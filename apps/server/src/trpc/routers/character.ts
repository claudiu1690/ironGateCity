import { STAT_POINT_TARGETS, dayKey } from '@irongate/rules';
import type { CharacterView } from '@irongate/rules';
import { z } from 'zod';
import { setAvatar } from '../../services/avatarService';
import { loadCharacter } from '../../services/dayService';
import { meExtras } from '../../services/cityService';
import { politicsWaiting } from '../../services/politicsService';
import { seeOrdersNote } from '../../services/ordersService';
import { placeStatPoint } from '../../services/statService';
import { toCharacterView } from '../../services/views';
import { protectedProcedure, router } from '../trpc';

export const characterRouter = router({
  /** The caller's character (ARRIVAL_PENDING before the join), the City Day settled, timers projected. */
  me: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const { doc, editionReadAt, city } = await loadCharacter(ctx.user, ctx.content, now);
    const waiting = await politicsWaiting(ctx.content, doc, city, now, dayKey(now));
    const view = toCharacterView(doc, now, ctx.content, editionReadAt, { city, politicsWaiting: waiting });
    // Slice 4 (tech design §8.3): the hero title, heroes and this election's scoreboard (the Me tab).
    const me: CharacterView = { ...view, ...(await meExtras(ctx.content, doc, dayKey(now))) };
    return me;
  }),

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

  /** Review 1 (§13.7): the orders-complete note was seen (Carry on); idempotent, today only. */
  seeOrdersNote: protectedProcedure.mutation(({ ctx }) =>
    seeOrdersNote({ user: ctx.user, content: ctx.content, now: ctx.now() }),
  ),
});
