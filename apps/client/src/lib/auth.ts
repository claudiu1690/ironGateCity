import { createAuthClient } from 'better-auth/react';
import { env } from '../env';
import { queryClient } from './queryClient';

/** Better Auth, through the same origin as the page (ADR 0001). */
export const authClient = createAuthClient({
  baseURL: new URL(`${env.apiBase}/auth`, window.location.origin).toString(),
});

const SESSION_KEY = ['auth', 'session'] as const;

/** The current session, cached briefly so route guards don't refetch on every navigation. */
export function fetchSession() {
  return queryClient.fetchQuery({
    queryKey: SESSION_KEY,
    queryFn: async () => {
      const { data } = await authClient.getSession();
      return data ?? null;
    },
    staleTime: 30_000,
  });
}

/** After signing in, up or out: forget the cached session and everything the old user saw. */
export async function resetSession() {
  queryClient.clear();
}
