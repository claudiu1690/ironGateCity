import { actionRouter } from './routers/action';
import { ambitionRouter } from './routers/ambition';
import { arrivalRouter } from './routers/arrival';
import { characterRouter } from './routers/character';
import { cityRouter } from './routers/city';
import { councilRouter } from './routers/council';
import { healthRouter } from './routers/health';
import { jobRouter } from './routers/job';
import { paperRouter } from './routers/paper';
import { residenceRouter } from './routers/residence';
import { travelRouter } from './routers/travel';
import { createCallerFactory, router } from './trpc';

export const appRouter = router({
  health: healthRouter,
  arrival: arrivalRouter,
  character: characterRouter,
  city: cityRouter,
  action: actionRouter,
  job: jobRouter,
  paper: paperRouter,
  ambition: ambitionRouter,
  council: councilRouter,
  // Slice 4.
  travel: travelRouter,
  residence: residenceRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
