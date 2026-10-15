import { z } from 'zod';
import { callEvent, getDesk, setFixture, setLine, setOrders, setRule } from '../../services/chairDeskService';
import { protectedProcedure, router } from '../trpc';

const Family = z.string().min(1).nullable();

/** Slice 7 T16 (docs/tech/slice-7.md §8.1): the Chair's desk. Every act re-reads the Chair's term. */
export const chairRouter = router({
  desk: protectedProcedure.query(({ ctx }) => getDesk({ user: ctx.user, content: ctx.content, now: ctx.now })),
  setOrders: protectedProcedure
    .input(
      z.object({
        picks: z.strictObject({ A: Family, B: Family, C: Family }),
        push: z
          .strictObject({
            slot: z.enum(['A', 'B']),
            cityId: z.string().min(1),
            districtId: z.string().min(1).nullable(),
            target: z.union([z.literal(25), z.literal(50), z.literal(100)]),
          })
          .nullable(),
        idempotencyKey: z.uuid(),
      }),
    )
    .mutation(({ ctx, input }) => setOrders({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  setLine: protectedProcedure
    .input(z.object({ billId: z.string().regex(/^[0-9a-f]{24}$/), line: z.enum(['for', 'against', 'free']), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => setLine({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  setRule: protectedProcedure
    .input(z.object({ cityId: z.string().min(1), ordinanceId: z.string().min(1), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => setRule({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  setFixture: protectedProcedure
    .input(
      z.object({
        cityId: z.string().min(1),
        typeId: z.string().min(1),
        districtId: z.string().min(1).nullable(),
        idempotencyKey: z.uuid(),
      }),
    )
    .mutation(({ ctx, input }) => setFixture({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  callEvent: protectedProcedure
    .input(
      z.object({
        cityId: z.string().min(1),
        districtId: z.string().min(1).nullable(),
        typeId: z.string().min(1),
        hours: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
        idempotencyKey: z.uuid(),
      }),
    )
    .mutation(({ ctx, input }) => callEvent({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
