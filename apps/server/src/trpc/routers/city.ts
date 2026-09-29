import { z } from 'zod';
import { getOrCreateCharacter } from '../../services/characterService';
import { getCityView } from '../../services/cityService';
import { protectedProcedure, router } from '../trpc';

export const cityRouter = router({
  get: protectedProcedure.input(z.object({ cityId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const character = await getOrCreateCharacter(ctx.user, ctx.content, ctx.now());
    return getCityView(ctx.content, input.cityId, character);
  }),
});
