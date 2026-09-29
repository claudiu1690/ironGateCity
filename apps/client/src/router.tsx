import type { QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import { AppShell } from './components/AppShell';
import { fetchSession } from './lib/auth';
import { queryClient } from './lib/queryClient';
import { trpc } from './lib/trpc';
import { CityPage } from './routes/city';
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

/**
 * `/`: get-or-create the character (which settles the City Day), then the paper when it is due
 * (§3.3: a new edition, or 3 hours away), else the city the character is in.
 */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async ({ context }) => {
    await requireSession();
    const me = await context.queryClient.fetchQuery({ ...trpc.character.me.queryOptions(), staleTime: 0 });
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

/** The signed-in shell: HUD on top, tab bar at the bottom (tech design §12.1). */
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  beforeLoad: requireSession,
  component: AppShell,
});

export interface CitySearch {
  /** The open location sheet, so a closed tab reopens the same sheet. */
  loc?: string;
}

const cityRoute = createRoute({
  getParentRoute: () => appRoute,
  path: '/city/$cityId',
  validateSearch: (search: Record<string, unknown>): CitySearch =>
    typeof search.loc === 'string' && search.loc ? { loc: search.loc } : {},
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  appRoute.addChildren([cityRoute, paperRoute, meRoute]),
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
