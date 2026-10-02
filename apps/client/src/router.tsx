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
import { CityPage } from './routes/city';
import { BallotPage, CountPage, CouncilPage, SlatePage } from './routes/council';
import { LoginPage } from './routes/login';
import { MePage } from './routes/me';
import { PaperPage } from './routes/paper';
import { SignupPage } from './routes/signup';

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
    if (me.paperDue) throw redirect({ to: '/paper' });
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
  /** The open location sheet, so a closed tab reopens the same sheet. */
  loc?: string;
  /** Review 1 (§13.7): the Party order the sheet was opened from; its tickets are marked. */
  order?: string;
}

const cityRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/city/$cityId',
  validateSearch: (search: Record<string, unknown>): CitySearch => ({
    ...(typeof search.loc === 'string' && search.loc ? { loc: search.loc } : {}),
    ...(typeof search.loc === 'string' && search.loc && typeof search.order === 'string' && search.order
      ? { order: search.order }
      : {}),
  }),
  component: CityPage,
});

const paperRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/paper',
  component: PaperPage,
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
  component: CountPage,
});

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
    cityRoute,
    paperRoute,
    meRoute,
    ambitionRoute,
    councilRoute,
    slateRoute,
    ballotRoute,
    countRoute,
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
