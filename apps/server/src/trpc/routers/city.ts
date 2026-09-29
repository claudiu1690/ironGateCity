import { z } from 'zod';
import { getCityView } from '../../services/cityService';
import { loadCharacter } from '../../services/dayService';
import { protectedProcedure, router } from '../trpc';

export const cityRouter = router({
  get: protectedProcedure.input(z.object({ cityId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const now = ctx.now();
    const { doc } = await loadCharacter(ctx.user, ctx.content, now);
    return getCityView(ctx.content, input.cityId, doc, now);
  }),
});
