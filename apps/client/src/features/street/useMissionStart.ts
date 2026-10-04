import type { ActionResult } from '@irongate/rules';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { isNetworkError, trpc } from '../../lib/trpc';
import { noteServerNow } from '../../lib/useNow';

export interface MissionTarget {
  locationId: string;
  missionId: string;
  wayId: string;
}

/**
 * Slice 5 (tech design §8.1, ADR 0031): one mission start = one idempotency key (ADR 0002), made in
 * the tap handler, so a network retry re-sends the same key and gets the stored answer. A run-in
 * answer (`RunInPending`) is not a result: the character view carries the pending pointer and the
 * run-in gate in the shell opens its modal.
 */
export function useMissionStart(onResult: (result: ActionResult) => void) {
  const queryClient = useQueryClient();
  const inFlight = useRef(false);
  const mutation = useMutation({
    ...trpc.mission.start.mutationOptions(),
    retry: (failureCount, error) => failureCount < 2 && isNetworkError(error),
    onSuccess: (result) => {
      noteServerNow(result.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), result.character);
      void queryClient.invalidateQueries({ queryKey: trpc.city.get.queryKey() });
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
  const start = useCallback(
    (target: MissionTarget) => {
      if (inFlight.current) return;
      inFlight.current = true;
      reset();
      mutate({ ...target, idempotencyKey: crypto.randomUUID() });
    },
    [mutate, reset],
  );
  return { ...mutation, start };
}
