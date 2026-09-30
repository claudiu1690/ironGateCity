import { z } from 'zod';
import { gameError } from '../../gameError';
import { getCityView } from '../../services/cityService';
import { loadCharacter } from '../../services/dayService';
import { protectedProcedure, router } from '../trpc';

export const cityRouter = router({
  get: protectedProcedure.input(z.object({ cityId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const now = ctx.now();
    const { doc, city } = await loadCharacter(ctx.user, ctx.content, now);
    // Slice 2: only the city the character is in (travel is slice 4).
    if (ctx.content.city(input.cityId) && input.cityId !== doc.cityId) {
      throw gameError('BAD_REQUEST', 'WRONG_CITY', { cityId: doc.cityId, requested: input.cityId });
    }
    return getCityView(ctx.content, input.cityId, doc, now, city);
  }),
});
