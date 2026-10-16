import { z } from 'zod';
import { callSheet, eventBoard, getEvent } from '../../services/eventViews';
import {
  callEvent,
  currentEvent,
  eventResult,
  nudgeEvent,
  seenEvent,
  signUpEvent,
  withdrawEvent,
} from '../../services/eventService';
import { protectedProcedure, router } from '../trpc';

const Oid = z.string().regex(/^[0-9a-f]{24}$/);

/** Slice 6 (tech design §8.1; ADR 0036, 0037): Campaign Events. */
export const eventsRouter = router({
  board: protectedProcedure.query(({ ctx }) => eventBoard({ user: ctx.user, content: ctx.content, now: ctx.now })),
  get: protectedProcedure
    .input(z.object({ eventId: Oid }))
    .query(({ ctx, input }) => getEvent({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  /** The capital's district is client memory (tech §22.1 Q6): the sheet is asked for one. */
  callSheet: protectedProcedure
    .input(z.object({ districtId: z.string().min(1).nullable().default(null) }).default({ districtId: null }))
    .query(({ ctx, input }) => callSheet({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  /** Tech §8.1's `events.call`: `call` is a reserved word in a tRPC router, so `callEvent` (Deviations). */
  callEvent: protectedProcedure
    .input(
      z.object({
        typeId: z.string().min(1),
        hours: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
        roleId: z.string().min(1),
        districtId: z.string().min(1).nullable(),
        idempotencyKey: z.uuid(),
        /** Slice 8 (tech design §8.1): the Headline Story's *Attach a Case File*. */
        caseFileId: z.string().regex(/^[0-9a-f]{24}$/).optional(),
      }),
    )
    .mutation(({ ctx, input }) => callEvent({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  signUp: protectedProcedure
    .input(
      z.object({
        eventId: Oid,
        slot: z.union([z.strictObject({ roleId: z.string().min(1) }), z.literal('hand')]),
        idempotencyKey: z.uuid(),
      }),
    )
    .mutation(({ ctx, input }) => signUpEvent({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  withdraw: protectedProcedure
    .input(z.object({ eventId: Oid, idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => withdrawEvent({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  nudge: protectedProcedure
    .input(z.object({ eventId: Oid, characterId: Oid }))
    .mutation(({ ctx, input }) => nudgeEvent({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  current: protectedProcedure.query(({ ctx }) => currentEvent({ user: ctx.user, content: ctx.content, now: ctx.now })),
  result: protectedProcedure
    .input(z.object({ signupId: Oid }))
    .query(({ ctx, input }) => eventResult({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  seen: protectedProcedure
    .input(z.object({ eventId: Oid, signupId: Oid.nullable() }))
    .mutation(({ ctx, input }) => seenEvent({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
