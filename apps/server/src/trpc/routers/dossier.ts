import { z } from 'zod';
import { PERK_IDS } from '@irongate/rules';
import type { PerkId } from '@irongate/rules';
import {
  bindDossier,
  getDossier,
  getStation,
  seenDossier,
  sellDossier,
  turnDossier,
} from '../../services/dossierService';
import { attemptExpose, chooseExpose, getExpose } from '../../services/exposeService';
import { buyFlat, getHome, payRentFor } from '../../services/homeService';
import { getLegacy, takePerk } from '../../services/legacyService';
import { protectedProcedure, router } from '../trpc';

/**
 * Slice 8 phase B, lane 2 (tech design §8.1): the Dossier, the exposé, the home and Legacy. No
 * input names the caller's character, prices or odds; every act that moves Iron, Legacy or a file
 * carries a key.
 */
const Oid = z.string().regex(/^[0-9a-f]{24}$/);
const Key = z.uuid();

export const dossierRouter = router({
  get: protectedProcedure.query(({ ctx }) => getDossier({ user: ctx.user, content: ctx.content, now: ctx.now })),
  seen: protectedProcedure.mutation(({ ctx }) => seenDossier({ user: ctx.user, content: ctx.content, now: ctx.now })),
  /** A station's card: what the man by the left-luggage buys from you. */
  station: protectedProcedure
    .input(z.object({ locationId: z.string().min(1) }))
    .query(({ ctx, input }) => getStation({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  bind: protectedProcedure
    .input(z.object({ subjectId: z.string().min(1), idempotencyKey: Key }))
    .mutation(({ ctx, input }) => bindDossier({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  sell: protectedProcedure
    .input(z.object({ locationId: z.string().min(1), id: Oid, idempotencyKey: Key }))
    .mutation(({ ctx, input }) => sellDossier({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  turn: protectedProcedure
    .input(z.object({ fileId: Oid, idempotencyKey: Key }))
    .mutation(({ ctx, input }) => turnDossier({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});

export const exposeRouter = router({
  get: protectedProcedure
    .input(z.object({ locationId: z.string().min(1).optional() }))
    .query(({ ctx, input }) => getExpose({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  choose: protectedProcedure
    .input(z.object({ locationId: z.string().min(1), fileId: Oid, angle: z.enum(['plain', 'headline']) }))
    .mutation(({ ctx, input }) => chooseExpose({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  attempt: protectedProcedure
    .input(z.object({ wayId: z.enum(['write', 'talk', 'legwork']), idempotencyKey: Key }))
    .mutation(({ ctx, input }) => attemptExpose({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});

export const homeRouter = router({
  get: protectedProcedure.query(({ ctx }) => getHome({ user: ctx.user, content: ctx.content, now: ctx.now })),
  buyFlat: protectedProcedure
    .input(z.object({ idempotencyKey: Key }))
    .mutation(({ ctx, input }) => buyFlat({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  payRent: protectedProcedure
    .input(z.object({ weeks: z.union([z.literal(1), z.literal(4)]), idempotencyKey: Key }))
    .mutation(({ ctx, input }) => payRentFor({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});

export const legacyRouter = router({
  get: protectedProcedure.query(({ ctx }) => getLegacy({ user: ctx.user, content: ctx.content, now: ctx.now })),
  takePerk: protectedProcedure
    .input(z.object({ perkId: z.enum(PERK_IDS as [PerkId, ...PerkId[]]), idempotencyKey: Key }))
    .mutation(({ ctx, input }) => takePerk({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
