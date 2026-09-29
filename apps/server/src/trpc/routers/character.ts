import { getOrCreateCharacter, toCharacterView } from '../../services/characterService';
import { protectedProcedure, router } from '../trpc';

export const characterRouter = router({
  /** Get-or-create the caller's character, with Energy and Rested projected to now. */
  me: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const doc = await getOrCreateCharacter(ctx.user, ctx.content, now);
    return toCharacterView(doc, now, ctx.content);
  }),
});
