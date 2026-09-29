import { actionRouter } from './routers/action';
import { characterRouter } from './routers/character';
import { cityRouter } from './routers/city';
import { healthRouter } from './routers/health';
import { jobRouter } from './routers/job';
import { paperRouter } from './routers/paper';
import { createCallerFactory, router } from './trpc';

export const appRouter = router({
  health: healthRouter,
  character: characterRouter,
  city: cityRouter,
  action: actionRouter,
  job: jobRouter,
  paper: paperRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
