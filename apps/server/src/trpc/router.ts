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
import { eventsRouter } from './routers/events';
import { chatRouter, factionRouter, favoursRouter, presenceRouter } from './routers/faction';
import { nationRouter } from './routers/nation';
import { parliamentRouter } from './routers/parliament';
import { chairRouter } from './routers/chair';
import { chairElectionRouter } from './routers/chairElection';
import { confidenceRouter } from './routers/confidence';
import { officeRouter } from './routers/office';
import { petitionRouter } from './routers/petition';
import { presidentRouter } from './routers/president';
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
  // Slice 6.
  faction: factionRouter,
  events: eventsRouter,
  favours: favoursRouter,
  presence: presenceRouter,
  chat: chatRouter,
  // Slice 7.
  nation: nationRouter,
  parliament: parliamentRouter,
  // Slice 7 phase B, lane 2.
  chairElection: chairElectionRouter,
  chair: chairRouter,
  confidence: confidenceRouter,
  office: officeRouter,
  president: presidentRouter,
  petition: petitionRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
