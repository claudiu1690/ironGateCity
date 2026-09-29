import { publicProcedure, router } from '../trpc';

export const healthRouter = router({
  ping: publicProcedure.query(({ ctx }) => ({ ok: true as const, now: ctx.now() })),
});
