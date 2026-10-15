import { getNation } from '../../services/nationService';
import { protectedProcedure, router } from '../trpc';

/**
 * Slice 7 (docs/tech/slice-7.md §8.1). The republic: `nation.get` (T11). Lane 2 adds the national
 * election's procedures here (`election`, `standPresident`, …, T17).
 */
export const nationRouter = router({
  get: protectedProcedure.query(({ ctx }) => getNation({ user: ctx.user, content: ctx.content, now: ctx.now() })),
});
