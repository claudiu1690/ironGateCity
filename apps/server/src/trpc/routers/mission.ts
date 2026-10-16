import { z } from 'zod';
import { startMission } from '../../services/missionService';
import { protectedProcedure, router } from '../trpc';

/** Slice 5 (tech design §8.1, ADR 0031): a mission's one keyed start. */
export const missionRouter = router({
  start: protectedProcedure
    .input(
      z.object({
        locationId: z.string().min(1),
        missionId: z.string().min(1),
        wayId: z.string().min(1),
        idempotencyKey: z.uuid(),
        // Slice 8 (T13, §21.1 Q12): the morgue file's chosen name.
        subjectId: z.string().min(1).max(60).optional(),
      }),
    )
    .mutation(({ ctx, input }) => startMission({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
