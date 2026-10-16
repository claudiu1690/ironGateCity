import type { PoliticalResult } from '@irongate/rules';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { isNetworkError, trpc } from '../../lib/trpc';
import { noteServerNow } from '../../lib/useNow';
import { invalidateLife } from '../life/invalidate';

/**
 * Slice 3: one political act per tap (ADR 0018). The key is created once in the tap handler, a
 * network retry re-sends it, and the server replays the stored modal. A second tap before the
 * first answers does nothing (QA slice 2 M1); the CTA stays disabled until the new view renders.
 */
export function usePoliticalAct() {
  const queryClient = useQueryClient();
  const busy = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<PoliticalResult | null>(null);
  const [open, setOpen] = useState(false);

  const run = useCallback(
    async (label: string, call: (idempotencyKey: string) => Promise<PoliticalResult>) => {
      if (busy.current) return;
      busy.current = true;
      setPending(label);
      setError(null);
      const key = crypto.randomUUID();
      try {
        let r: PoliticalResult | null = null;
        for (let attempt = 0; attempt < 3 && !r; attempt++) {
          try {
            r = await call(key);
          } catch (e) {
            if (attempt < 2 && isNetworkError(e)) continue;
            throw e;
          }
        }
        if (!r) return;
        noteServerNow(r.character.serverNow);
        queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
        if (r.view.kind === 'election')
          queryClient.setQueryData(trpc.council.election.queryKey(), r.view.election);
        // The voting rework (tech design §8.4): after a vote, the ballot; after a rule change, the hall.
        else if (r.view.kind === 'ballot') queryClient.setQueryData(trpc.council.ballot.queryKey(), r.view.ballot);
        else if (r.view.kind === 'hall')
          queryClient.setQueryData(trpc.council.hall.queryKey({ cityId: r.view.hall.cityId }), r.view.hall);
        void queryClient.invalidateQueries({ queryKey: trpc.paper.today.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.city.get.queryKey() });
        // Slice 8 (tech design §24.6): the life cards and the Me tab's life line with the character.
        invalidateLife(queryClient);
        // Review 4 (ADR 0077): the Town Hall's sheet shows the same council (and the same ballot).
        if (r.view.kind !== 'hall') void queryClient.invalidateQueries({ queryKey: trpc.council.hall.queryKey() });
        if (r.view.kind !== 'ballot') void queryClient.invalidateQueries({ queryKey: trpc.council.ballot.queryKey() });
        // Slice 4: a move or a room changes the nation's cards and the election screens too.
        void queryClient.invalidateQueries({ queryKey: trpc.travel.nation.queryKey() });
        if (r.view.kind === 'residence') {
          void queryClient.invalidateQueries({ queryKey: trpc.council.election.queryKey() });
          void queryClient.invalidateQueries({ queryKey: trpc.council.count.queryKey() });
        }
        setResult(r);
        setOpen(true);
      } catch (e) {
        setError(e);
        // The refusal carries the settled state: refetch the screen so it shows it.
        void queryClient.invalidateQueries({ queryKey: trpc.council.election.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.council.ballot.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.council.hall.queryKey() });
      } finally {
        busy.current = false;
        setPending(null);
      }
    },
    [queryClient],
  );

  return { run, pending, error, result, open, setOpen };
}
