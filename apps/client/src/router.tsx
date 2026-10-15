import type { QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  redirect,
} from '@tanstack/react-router';
import { AppShell } from './components/AppShell';
import { devStatusQuery } from './features/dev/devApi';
import { fetchSession } from './lib/auth';
import { queryClient } from './lib/queryClient';
import { gameErrorOf, trpc } from './lib/trpc';
import { AmbitionPage } from './routes/ambition';
import { ArrivePage } from './routes/arrive';
import { CityPage, lastDistrict } from './routes/city';
import { JourneyPage } from './routes/journey';
import { NationPage } from './routes/nation';
import { BallotPage, CountPage, CouncilPage, SlatePage } from './routes/council';
import { LoginPage } from './routes/login';
import { MePage } from './routes/me';
import { PaperPage } from './routes/paper';
import { HeldPage } from './routes/held';
import { FactionPage, validateFactionSearch } from './routes/faction';
import { EventPage, validateEventSearch } from './routes/event';
import { SignupPage } from './routes/signup';
import { BillPage, LawBookPage, ParliamentPage } from './routes/parliament';
import { NationalPage, NationalResultPage, PickPage } from './routes/election';
import { PresidentPage } from './routes/president';
import { PetitionPage } from './routes/petition';
import { ChairElectionPage, ChairResultPage, ChairVotePage, ConfidencePage } from './features/chair/ChairElection';

interface RouterContext {
  queryClient: QueryClient;
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

async function requireSession() {
  const session = await fetchSession();
  if (!session) throw redirect({ to: '/login' });
  return session;
}

async function redirectIfSignedIn() {
  const session = await fetchSession();
  if (session) throw redirect({ to: '/' });
}

/** The character, or null while the user is still arriving (ADR 0011: ARRIVAL_PENDING). */
async function fetchCharacter(qc: QueryClient, fresh = false) {
  try {
    return await qc.fetchQuery({
      ...trpc.character.me.queryOptions(),
      retry: false,
      ...(fresh ? { staleTime: 0 } : {}),
    });
  } catch (err) {
    if (gameErrorOf(err)?.reason === 'ARRIVAL_PENDING') return null;
    throw err;
  }
}

/** Slice 2: every character screen needs a character; a user without one is sent to the arrival. */
async function requireCharacter({ context }: { context: RouterContext }) {
  await requireSession();
  // The dev panel's status (a 404 unless the server has its test hooks on) is asked alongside, so
  // the panel's button is in place before the city map measures what it must keep pins clear of.
  const [me] = await Promise.all([
    fetchCharacter(context.queryClient),
    context.queryClient.ensureQueryData(devStatusQuery),
  ]);
  if (!me) throw redirect({ to: '/arrive' });
}

/**
 * `/`: the arrival when there is no character yet; the paper when it is due (§3.3: a new
 * edition, or 3 hours away); else the city the character is in.
 */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async ({ context }) => {
    await requireSession();
    const me = await fetchCharacter(context.queryClient, true);
    if (!me) throw redirect({ to: '/arrive' });
    // Slice 4 (tech design §12.1): on a train (or arrived, the modal not yet closed), the journey.
    if (me.journey) throw redirect({ to: '/journey' });
    // Slice 5 (tech design §12.1): in the cells or on the ward (or the release not yet seen), there.
    if (me.held) throw redirect({ to: '/held' });
    if (me.paperDue) throw redirect({ to: '/paper' });
    // The capital opens on the last district viewed in this session.
    const district = lastDistrict(me.cityId);
    if (district)
      throw redirect({ to: '/city/$cityId/$quarterId', params: { cityId: me.cityId, quarterId: district } });
    throw redirect({ to: '/city/$cityId', params: { cityId: me.cityId } });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: redirectIfSignedIn,
  component: LoginPage,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/signup',
  beforeLoad: redirectIfSignedIn,
  component: SignupPage,
});

/** The arrival (slice-2 tech design §12.1): full screen, no HUD or tab bar; resumable at every tap. */
const arriveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/arrive',
  beforeLoad: requireSession,
  component: ArrivePage,
});

/** The signed-in shell: HUD on top, tab bar at the bottom (tech design §12.1). */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: requireCharacter,
  component: AppShell,
});

export interface CitySearch {
  /** The open location sheet, so a closed tab reopens the same sheet (the overview: a district's card). */
  loc?: string;
  /** Review 1 (§13.7): the Party order the sheet was opened from; its tickets are marked. */
  order?: string;
  /** Slice 4: open the Places list on arrival (*Show places*, *Where to act*). */
  places?: boolean;
  /** Review 4 (§7.5, ADR 0073): the ticket highlighted on the open sheet (the favour, first landing). */
  act?: string;
}

const cityRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/city/$cityId',
  validateSearch: (search: Record<string, unknown>): CitySearch => ({
    ...(typeof search.loc === 'string' && search.loc ? { loc: search.loc } : {}),
    ...(typeof search.loc === 'string' && search.loc && typeof search.order === 'string' && search.order
      ? { order: search.order }
      : {}),
    ...(search.places === true || search.places === 'true' || search.places === '1' ? { places: true } : {}),
    ...(typeof search.loc === 'string' && search.loc && typeof search.act === 'string' && search.act
      ? { act: search.act }
      : {}),
  }),
  component: CityPage,
});

/**
 * Slice 4 (tech design §12.1, §12.3): a district of the capital. The city page stays mounted (its
 * child renders nothing), so a district opens over the same map, which changes its frame and pins.
 */
const quarterRoute = createRoute({
  getParentRoute: () => cityRoute,
  path: '$quarterId',
  component: () => null,
});

/** Slice 4: the nation map (the Map tab's *Nation*). */
const nationRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/nation',
  // A city's card open on arrival (the paper's *Where to act* for another city's Issue).
  validateSearch: (search: Record<string, unknown>): { city?: string } =>
    typeof search.city === 'string' && /^[a-z]+$/.test(search.city) ? { city: search.city } : {},
  component: NationPage,
});

/** Slice 4: the journey screen, and the arrival modal over it. */
const journeyRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/journey',
  component: JourneyPage,
});

export interface CountSearch {
  /** Slice 4 (screens §8): the capital's district shown on the result. */
  d?: string;
}

/** Slice 5 (tech design §12.1): the cells or the infirmary, and the release modal. */
const heldRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/held',
  component: HeldPage,
});

const paperRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/paper',
  component: PaperPage,
});

/** Slice 6 (tech design §12.1): the Faction tab, its five parts by `?tab=`. */
const factionRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/faction',
  validateSearch: validateFactionSearch,
  component: FactionPage,
});

/** Slice 6 (tech design §12.1): an event's page, in every state. */
const eventRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/faction/events/$eventId',
  validateSearch: validateEventSearch,
  component: EventPage,
});

const meRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/me',
  component: MePage,
});

export interface AmbitionSearch {
  /** Where the Letters row was opened, for Continue. */
  from?: string;
}

/** An Ambition chapter inside the shell (the HUD stays: it spends Energy). */
const ambitionRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/story/ambition',
  validateSearch: (search: Record<string, unknown>): AmbitionSearch =>
    typeof search.from === 'string' && search.from.startsWith('/') ? { from: search.from } : {},
  component: AmbitionPage,
});

/** Slice 3: the council screens (tech design §12.1), inside the shell. */
const councilRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/council',
  component: CouncilPage,
});
const slateRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/council/slate',
  component: SlatePage,
});
const ballotRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/council/ballot',
  component: BallotPage,
});
const countRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/council/count',
  validateSearch: (search: Record<string, unknown>): CountSearch =>
    typeof search.d === 'string' && /^[a-z]+\.[a-z-]+$/.test(search.d) ? { d: search.d } : {},
  component: CountPage,
});

/**
 * Slice 7 phase C, lane X (tech design §12.1): Parliament, a bill, the law book; the Chair's election
 * and the vote on the Chair; the party's pick and the republic's election; the President's page; the
 * petition. `/office/chair` is the Faction tab's Chair part (§22.1 Q24).
 */
const nationLaneX = [
  createRoute({ getParentRoute: () => appRoute, path: '/parliament', component: ParliamentPage }),
  createRoute({ getParentRoute: () => appRoute, path: '/parliament/bill/$billId', component: BillPage }),
  createRoute({ getParentRoute: () => appRoute, path: '/parliament/laws', component: LawBookPage }),
  createRoute({ getParentRoute: () => appRoute, path: '/faction/election', component: ChairElectionPage }),
  createRoute({ getParentRoute: () => appRoute, path: '/faction/election/vote', component: ChairVotePage }),
  createRoute({ getParentRoute: () => appRoute, path: '/faction/election/result', component: ChairResultPage }),
  createRoute({ getParentRoute: () => appRoute, path: '/faction/confidence', component: ConfidencePage }),
  createRoute({
    getParentRoute: () => appRoute,
    path: '/office/chair',
    beforeLoad: () => {
      throw redirect({ to: '/faction', search: { tab: 'chair' } });
    },
  }),
  createRoute({ getParentRoute: () => appRoute, path: '/office/president', component: PresidentPage }),
  createRoute({ getParentRoute: () => appRoute, path: '/election/pick', component: () => <PickPage /> }),
  createRoute({ getParentRoute: () => appRoute, path: '/election/pick/vote', component: () => <PickPage vote /> }),
  createRoute({ getParentRoute: () => appRoute, path: '/election/national', component: () => <NationalPage /> }),
  createRoute({ getParentRoute: () => appRoute, path: '/election/national/vote', component: () => <NationalPage vote /> }),
  createRoute({ getParentRoute: () => appRoute, path: '/election/national/result', component: NationalResultPage }),
  createRoute({ getParentRoute: () => appRoute, path: '/council/petition', component: PetitionPage }),
];

/**
 * Maps v3 §6: the dev map viewer, every tiled picture with every surveyed pin. Dev builds only (the
 * branch is dropped from a production build, with its chunk), outside the sign-in guard.
 */
const devRoutes = import.meta.env.DEV
  ? [
      createRoute({
        getParentRoute: () => rootRoute,
        path: '/dev/maps',
        component: lazyRouteComponent(() => import('./features/dev/MapViewer'), 'MapViewer'),
      }),
    ]
  : [];

const routeTree = rootRoute.addChildren([
  ...devRoutes,
  indexRoute,
  loginRoute,
  signupRoute,
  arriveRoute,
  appRoute.addChildren([
    cityRoute.addChildren([quarterRoute]),
    nationRoute,
    journeyRoute,
    heldRoute,
    paperRoute,
    factionRoute,
    eventRoute,
    meRoute,
    ambitionRoute,
    councilRoute,
    slateRoute,
    ballotRoute,
    countRoute,
    ...nationLaneX,
  ]),
]);

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
