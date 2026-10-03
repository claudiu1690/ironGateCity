import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useRef } from 'react';
import { isNetworkError, trpc } from '../../lib/trpc';
import { noteServerNow } from '../../lib/useNow';

/**
 * Slice 4 (tech design §8.2, §12.4): *Board* is one tap. The idempotency key is made once in the tap
 * handler (a network retry re-sends it, ADR 0008), a second tap before the answer does nothing, and the
 * journey screen opens on the returned view.
 */
export function useBoard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const busy = useRef(false);
  const m = useMutation({
    ...trpc.travel.board.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r) => {
      noteServerNow(r.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      queryClient.setQueryData(trpc.travel.journey.queryKey(), r.journey);
      void queryClient.invalidateQueries({ queryKey: trpc.travel.nation.queryKey() });
      void queryClient.invalidateQueries({ queryKey: trpc.paper.today.queryKey() });
      void navigate({ to: '/journey' });
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const board = (to: string) => {
    if (busy.current) return;
    busy.current = true;
    m.mutate({ to, idempotencyKey: crypto.randomUUID() });
  };
  return { board, pendingTo: m.isPending ? (m.variables?.to ?? null) : null, error: m.error, reset: m.reset };
}
