import type { ActionResult } from '@irongate/rules';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { isNetworkError, trpc } from '../../lib/trpc';
import { noteServerNow } from '../../lib/useNow';
import { invalidateLife } from '../life/invalidate';

export interface PerformTarget {
  actionId: string;
  locationId: string;
}

/**
 * One tap = one idempotency key (ADR 0002), ×1 or ×3 (ADR 0006). The key is created once in the tap
 * handler; network retries re-send the same variables, so the same key, and the server returns the
 * stored result.
 */
export function usePerformAction(onResult: (result: ActionResult) => void) {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const mutation = useMutation({
    ...trpc.action.perform.mutationOptions(),
    retry: (failureCount, error) => failureCount < 2 && isNetworkError(error),
    onSuccess: (result) => {
      // The result carries the fresh HUD state; the city view changes (opinion, costs, order tags).
      noteServerNow(result.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), result.character);
      void queryClient.invalidateQueries({ queryKey: trpc.city.get.queryKey() });
      // Slice 8: a meal's or a round's lines, his row, the Me tab's buffs.
      invalidateLife(queryClient);
      // Slice 5: a tap on rival ground may start a run-in; its modal is the run-in gate's (the shell).
      if (result.kind === 'runIn') {
        queryClient.setQueryData(trpc.encounter.current.queryKey(), { pending: result } as never);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: trpc.held.get.queryKey() });
      onResult(result);
    },
    onSettled: () => {
      inFlight.current = false;
    },
  });

  const { mutate, reset } = mutation;
  const perform = useCallback(
    (target: PerformTarget, times: 1 | 3) => {
      if (inFlight.current) return; // a second tap before the button disables
      inFlight.current = true;
      reset();
      mutate({ ...target, idempotencyKey: crypto.randomUUID(), times });
    },
    [mutate, reset],
  );

  return { ...mutation, perform };
}
