import { z } from 'zod';
import {
  changeOutfit,
  dressOnArrival,
  getWardrobe,
  keepOutfit,
  takeOff,
  wear,
} from '../../services/wardrobeService';
import { protectedProcedure, router } from '../trpc';

const Outfit = z.enum(['town', 'plain', 'evening']);

/**
 * Slice 8 (tech design §8.1, ADR 0051): the Wardrobe. Set-to-state (no key, ADR 0008): each writes
 * a target state under the version guard, so a replay is a no-op; no modal, the view comes back.
 */
export const wardrobeRouter = router({
  get: protectedProcedure.query(({ ctx }) => getWardrobe({ user: ctx.user, content: ctx.content, now: ctx.now })),
  wear: protectedProcedure
    .input(z.object({ uid: z.string().min(1).max(40) }))
    .mutation(({ ctx, input }) => wear({ user: ctx.user, content: ctx.content, now: ctx.now }, input.uid)),
  takeOff: protectedProcedure
    .input(z.object({ slot: z.enum(['accessory', 'document', 'utility']) }))
    .mutation(({ ctx, input }) => takeOff({ user: ctx.user, content: ctx.content, now: ctx.now }, input.slot)),
  outfit: protectedProcedure
    .input(z.object({ outfit: Outfit }))
    .mutation(({ ctx, input }) => changeOutfit({ user: ctx.user, content: ctx.content, now: ctx.now }, input.outfit)),
  keep: protectedProcedure
    .input(z.object({ outfit: Outfit }))
    .mutation(({ ctx, input }) => keepOutfit({ user: ctx.user, content: ctx.content, now: ctx.now }, input.outfit)),
  /** Only *Change into plain clothes* (tech design §3.2). */
  dressOnArrival: protectedProcedure
    .input(z.object({ journeyId: z.string().regex(/^[0-9a-f]{24}$/) }))
    .mutation(({ ctx, input }) => dressOnArrival({ user: ctx.user, content: ctx.content, now: ctx.now }, input.journeyId)),
});
