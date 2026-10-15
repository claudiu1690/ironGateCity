import { z } from 'zod';
import { getChairPage } from '../../services/chairDeskService';
import { getGovernorPage } from '../../services/governorOffice';
import { getOfficeMine } from '../../services/officeService';
import { getPresident } from '../../services/presidentService';
import { protectedProcedure, router } from '../trpc';

/**
 * Slice 7 (docs/tech/slice-7.md §8.1): the office pages. Lane 2 (T16, T18): `chair` (the desk read
 * only, for any member) and `president`. Lane 1 (T13, T20): `mine` (the Me tab's cards and ladder)
 * and `governor` (a city's Governor or Mayor).
 */
export const officeRouter = router({
  mine: protectedProcedure.query(({ ctx }) => getOfficeMine({ user: ctx.user, content: ctx.content, now: ctx.now })),
  governor: protectedProcedure
    .input(z.object({ cityId: z.string().min(1) }))
    .query(({ ctx, input }) => getGovernorPage({ user: ctx.user, content: ctx.content, now: ctx.now, input })),
  chair: protectedProcedure.query(({ ctx }) => getChairPage({ user: ctx.user, content: ctx.content, now: ctx.now })),
  president: protectedProcedure.query(({ ctx }) => getPresident({ user: ctx.user, content: ctx.content, now: ctx.now })),
});
