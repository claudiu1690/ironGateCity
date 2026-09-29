import type { GameErrorData } from '@irongate/rules';
import type { AppRouter } from '@irongate/server/router';
import { TRPCClientError, createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import { env } from '../env';
import { queryClient } from './queryClient';

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.apiBase}/trpc`,
      fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
    }),
  ],
});

/** Query and mutation options for every procedure, e.g. `trpc.character.me.queryOptions()`. */
export const trpc = createTRPCOptionsProxy<AppRouter>({ client: trpcClient, queryClient });

/** The game reason on a refused action (`error.data.game`), if any. */
export function gameErrorOf(error: unknown): GameErrorData | null {
  if (error instanceof TRPCClientError) {
    const data = error.data as { game?: GameErrorData | null } | undefined;
    return data?.game ?? null;
  }
  return null;
}

/** No HTTP response at all: safe to retry with the same idempotency key. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TRPCClientError && error.data === undefined && error.shape === undefined;
}
