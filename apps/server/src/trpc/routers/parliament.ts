import { z } from 'zod';
import { getLawBook } from '../../services/nationService';
import { blocView, catalogueView, chamberView, getBill, table, veto, vote } from '../../services/parliamentService';
import { protectedProcedure, router } from '../trpc';

const Oid = z.string().regex(/^[0-9a-f]{24}$/);
const LawId = z.string().regex(/^law\.[a-z-]+$/);

/**
 * Parliament (§8.1): `parliament.laws` (T11, the law book); `chamber`, `bill`, `catalogue`, `bloc`,
 * `table`, `vote` (T15) and `veto` (T18). Bill votes are public by design (the chamber is not a ballot).
 */
export const parliamentRouter = router({
  laws: protectedProcedure.query(({ ctx }) => getLawBook({ user: ctx.user, content: ctx.content, now: ctx.now() })),
  chamber: protectedProcedure.query(({ ctx }) => chamberView({ user: ctx.user, content: ctx.content, now: ctx.now })),
  bill: protectedProcedure
    .input(z.object({ billId: Oid }))
    .query(({ ctx, input }) => getBill({ user: ctx.user, content: ctx.content, now: ctx.now }, input.billId)),
  catalogue: protectedProcedure.query(({ ctx }) => catalogueView({ user: ctx.user, content: ctx.content, now: ctx.now })),
  bloc: protectedProcedure
    .input(z.object({ factionId: z.enum(['vanguard', 'collective', 'alliance']) }))
    .query(({ ctx, input }) => blocView({ user: ctx.user, content: ctx.content, now: ctx.now }, input.factionId)),
  table: protectedProcedure
    .input(
      z.object({
        kind: z.enum(['law', 'strike', 'removal']),
        lawId: LawId.nullable(),
        replacesLawId: LawId.nullable(),
        idempotencyKey: z.uuid(),
      }),
    )
    .mutation(({ ctx, input }) => table({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  vote: protectedProcedure
    .input(z.object({ billId: Oid, vote: z.enum(['for', 'against']), idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => vote({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  veto: protectedProcedure
    .input(z.object({ billId: Oid, idempotencyKey: z.uuid() }))
    .mutation(({ ctx, input }) => veto({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
});
