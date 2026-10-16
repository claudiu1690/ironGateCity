import { z } from 'zod';
import { dinner, meal, round } from '../../services/barService';
import { hire, renew } from '../../services/bodyguardService';
import { favourPatron, getPatron, giftPatron, visitPatron } from '../../services/patronService';
import { lifeMe, placeCards } from '../../services/placeCards';
import { bribe, buy, sell } from '../../services/shopService';
import { protectedProcedure, router } from '../trpc';

/**
 * Slice 8 phase B, lane 1 (tech design §8.1, §24.6): shops, someone to walk with you, the bar and
 * the dining room. Every act carries a request key (ADR 0008); no input names a price or an odds.
 */
const Key = z.uuid();
const Place = z.string().min(1);

export const shopRouter = router({
  buy: protectedProcedure
    .input(z.object({ locationId: Place, itemId: z.string().min(1), idempotencyKey: Key }))
    .mutation(({ ctx, input }) => buy({ user: ctx.user, content: ctx.content, now: ctx.now }, input)),
  sell: protectedProcedure
    .input(z.object({ locationId: Place, uid: z.string().min(1).max(40), idempotencyKey: Key }))
    .mutation(({ ctx, input }) => sell({ user: ctx.user, content: ctx.content, now: ctx.now }, input)),
  bribe: protectedProcedure
    .input(z.object({ locationId: Place, idempotencyKey: Key }))
    .mutation(({ ctx, input }) => bribe({ user: ctx.user, content: ctx.content, now: ctx.now }, input)),
});

export const bodyguardRouter = router({
  hire: protectedProcedure
    .input(z.object({ locationId: Place, tier: z.union([z.literal(1), z.literal(2), z.literal(3)]), idempotencyKey: Key }))
    .mutation(({ ctx, input }) => hire({ user: ctx.user, content: ctx.content, now: ctx.now }, input)),
  renew: protectedProcedure
    .input(z.object({ weeks: z.union([z.literal(1), z.literal(4)]), idempotencyKey: Key }))
    .mutation(({ ctx, input }) => renew({ user: ctx.user, content: ctx.content, now: ctx.now }, input)),
});

export const barRouter = router({
  round: protectedProcedure
    .input(z.object({ locationId: Place, idempotencyKey: Key }))
    .mutation(({ ctx, input }) => round({ user: ctx.user, content: ctx.content, now: ctx.now }, input)),
  meal: protectedProcedure
    .input(z.object({ locationId: Place, idempotencyKey: Key }))
    .mutation(({ ctx, input }) => meal({ user: ctx.user, content: ctx.content, now: ctx.now }, input)),
  dinner: protectedProcedure
    .input(z.object({ locationId: Place, idempotencyKey: Key }))
    .mutation(({ ctx, input }) => dinner({ user: ctx.user, content: ctx.content, now: ctx.now }, input)),
});

/** The place's life cards and the Me tab's life line (read on focus, as `city.get`). */
export const lifeRouter = router({
  place: protectedProcedure
    .input(z.object({ locationId: Place }))
    .query(({ ctx, input }) => placeCards({ user: ctx.user, content: ctx.content, now: ctx.now }, input.locationId)),
  me: protectedProcedure.query(({ ctx }) => lifeMe({ user: ctx.user, content: ctx.content, now: ctx.now })),
});

/** Slice 8 phase B, lane 1 (T13; tech design §8.1): patrons. The gift and the favour carry a key. */
const PatronId = z.enum(['crane', 'marr']);
export const patronRouter = router({
  get: protectedProcedure
    .input(z.object({ patronId: PatronId }))
    .query(({ ctx, input }) => getPatron({ user: ctx.user, content: ctx.content, now: ctx.now }, input.patronId)),
  visit: protectedProcedure
    .input(z.object({ patronId: PatronId }))
    .mutation(({ ctx, input }) => visitPatron({ user: ctx.user, content: ctx.content, now: ctx.now }, input.patronId)),
  gift: protectedProcedure
    .input(z.object({ patronId: PatronId, idempotencyKey: Key }))
    .mutation(({ ctx, input }) => giftPatron({ user: ctx.user, content: ctx.content, now: ctx.now }, input)),
  favour: protectedProcedure
    .input(z.object({ patronId: PatronId, issueDocId: z.string().min(1).optional(), idempotencyKey: Key }))
    .mutation(({ ctx, input }) => favourPatron({ user: ctx.user, content: ctx.content, now: ctx.now }, input)),
});
