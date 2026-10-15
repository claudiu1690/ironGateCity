import { getChairPage } from '../../services/chairDeskService';
import { getPresident } from '../../services/presidentService';
import { protectedProcedure, router } from '../trpc';

/**
 * Slice 7 (docs/tech/slice-7.md §8.1): the office pages. Lane 2 (T16, T18): `chair` (the desk read
 * only, for any member) and `president`. Lane 1 adds `mine` and `governor` here (T13, T20).
 */
export const officeRouter = router({
  chair: protectedProcedure.query(({ ctx }) => getChairPage({ user: ctx.user, content: ctx.content, now: ctx.now })),
  president: protectedProcedure.query(({ ctx }) => getPresident({ user: ctx.user, content: ctx.content, now: ctx.now })),
});
