import type { QueryClient } from '@tanstack/react-query';
import {
  Outlet,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router';
import { fetchSession } from './lib/auth';
import { queryClient } from './lib/queryClient';
import { trpc } from './lib/trpc';
import { CityPage } from './routes/city';
import { LoginPage } from './routes/login';
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

/** `/`: get-or-create the character, then go to the city it is in. */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async ({ context }) => {
    await requireSession();
    const me = await context.queryClient.fetchQuery(trpc.character.me.queryOptions());
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

const cityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/city/$cityId',
  beforeLoad: requireSession,
  component: CityPage,
});

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, signupRoute, cityRoute]);

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
