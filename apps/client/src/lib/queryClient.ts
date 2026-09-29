import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Short sessions: coming back to the tab refreshes Energy and anything else that moved.
      refetchOnWindowFocus: true,
      staleTime: 10_000,
      retry: 1,
    },
  },
});
