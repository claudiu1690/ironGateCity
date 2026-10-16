import { z } from 'zod';
import { loadCharacter } from '../../services/dayService';
import { board, choose, close, getJourney, nationView } from '../../services/travelService';
import { isNationReady } from '../../services/nationDay';
import { governorsByCity, republicView } from '../../services/nationService';
import { protectedProcedure, router } from '../trpc';

const journeyId = z.string().regex(/^[0-9a-f]{24}$/);

/**
 * Slice 4 (tech design §8.1, ADR 0025): the nation map, boarding, the journey and its card, and
 * Continue on the arrival modal. A destination is a choice, checked against the character's state
 * in the transaction; no input names the caller's character.
 */
export const travelRouter = router({
  nation: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const { doc, nation } = await loadCharacter(ctx.user, ctx.content, now);
    const view = await nationView(ctx.content, doc, now);
    // Slice 7 (§8.3): the republic on the nation map.
    return {
      ...view,
      republic: isNationReady(nation, now) ? republicView(ctx.content, nation, now, await governorsByCity()) : null,
    };
  }),

  board: protectedProcedure
    .input(z.object({ to: z.string().regex(/^[a-z]+$/), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => board({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  /** The open journey (on the way, or arrived with the modal not yet closed), or null. */
  journey: protectedProcedure.query(async ({ ctx }) => {
    const now = ctx.now();
    const loaded = await loadCharacter(ctx.user, ctx.content, now);
    return getJourney(ctx.content, loaded, now);
  }),

  choose: protectedProcedure
    .input(z.object({ journeyId, choiceId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => choose({ user: ctx.user, content: ctx.content, now: ctx.now, input })),

  /** The arrival modal's Continue: idempotent. */
  close: protectedProcedure
    .input(z.object({ journeyId }))
    .mutation(({ ctx, input }) => close({ user: ctx.user, content: ctx.content, now: ctx.now(), input })),
});
