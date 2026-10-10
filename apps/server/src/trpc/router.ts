import { actionRouter } from './routers/action';
import { ambitionRouter } from './routers/ambition';
import { arrivalRouter } from './routers/arrival';
import { characterRouter } from './routers/character';
import { cityRouter } from './routers/city';
import { councilRouter } from './routers/council';
import { encounterRouter } from './routers/encounter';
import { healthRouter } from './routers/health';
import { heldRouter, recordRouter } from './routers/held';
import { jobRouter } from './routers/job';
import { missionRouter } from './routers/mission';
import { paperRouter } from './routers/paper';
import { patrolRouter } from './routers/patrol';
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
  // Slice 5.
  mission: missionRouter,
  encounter: encounterRouter,
  held: heldRouter,
  record: recordRouter,
  // Review 5 (ADR 0081).
  patrol: patrolRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
