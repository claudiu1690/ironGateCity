import type { ActionResult } from '@irongate/rules';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { isNetworkError, trpc } from '../../lib/trpc';

/**
 * One tap = one idempotency key (ADR 0002). The key is created once in the tap handler; network
 * retries re-send the same variables, so the same key, and the server returns the stored result.
 */
export function usePerformAction(onResult: (result: ActionResult) => void) {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const mutation = useMutation({
    ...trpc.action.perform.mutationOptions(),
    retry: (failureCount, error) => failureCount < 2 && isNetworkError(error),
    onSuccess: (result) => {
      // The result carries the fresh HUD state: no refetch needed.
      queryClient.setQueryData(trpc.character.me.queryKey(), result.character);
      onResult(result);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const { mutate, reset } = mutation;
  const perform = useCallback(
    (actionId: string, locationId: string) => {
      if (inFlight.current) return; // a second tap before the button disables
      inFlight.current = true;
      reset();
      mutate({ actionId, locationId, idempotencyKey: crypto.randomUUID(), times: 1 });
    },
    [mutate, reset],
  );

  return { ...mutation, perform };
}
