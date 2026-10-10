import { z } from 'zod';
import { gameError } from '../../gameError';
import { getCityView } from '../../services/cityService';
import { loadCharacter } from '../../services/dayService';
import { ensurePatrol } from '../../services/patrol';
import { protectedProcedure, router } from '../trpc';

export const cityRouter = router({
  get: protectedProcedure.input(z.object({ cityId: z.string().min(1) })).query(async ({ ctx, input }) => {
    const now = ctx.now();
    const loaded = await loadCharacter(ctx.user, ctx.content, now);
    const { doc, city, places } = loaded;
    // Slice 4 (ADR 0025): on a train no city is open; elsewhere only the city the character is in.
    if (doc.journey?.status === 'onTheWay') {
      throw gameError('PRECONDITION_FAILED', 'IN_TRANSIT', { arrivesAt: doc.journey.arrivesAt.getTime() });
    }
    if (ctx.content.city(input.cityId) && input.cityId !== doc.cityId) {
      throw gameError('BAD_REQUEST', 'WRONG_CITY', { cityId: doc.cityId, requested: input.cityId });
    }
    // Review 5 (ADR 0081): only this read, for the city the player stands in, may roll the patrol.
    const after = input.cityId === doc.cityId ? await ensurePatrol(ctx.content, loaded, now) : doc;
    return getCityView(ctx.content, input.cityId, after, now, city, places);
  }),
});
