import { getLawBook } from '../../services/nationService';
import { protectedProcedure, router } from '../trpc';

/**
 * Parliament (§8.1): `parliament.laws` (T11, the law book). Lane 2 adds `chamber`, `bill`,
 * `catalogue`, `bloc`, `table`, `vote`, `veto` here (T15, T18).
 */
export const parliamentRouter = router({
  laws: protectedProcedure.query(({ ctx }) => getLawBook({ user: ctx.user, content: ctx.content, now: ctx.now() })),
});
