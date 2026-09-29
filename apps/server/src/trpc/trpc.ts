import { TRPCError, initTRPC } from '@trpc/server';
import { GameError } from '../gameError';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        // e.g. { reason: 'NOT_ENOUGH_ENERGY', energy: 4, cost: 10, nextTickAt: 1790000000000 }
        game: error.cause instanceof GameError ? error.cause.toData() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, user: ctx.user } });
});
