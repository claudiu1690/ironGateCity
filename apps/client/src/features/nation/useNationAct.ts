import type { PoliticalResult } from '@irongate/rules';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { isNetworkError, trpc } from '../../lib/trpc';
import { noteServerNow } from '../../lib/useNow';

/**
 * Slice 7 phase C (tech design §12.1): after a national act, the returned view renders at once (the
 * result's `view` kinds `chairElection`, `desk`, `bill`, `pick`, `nationalElection`, `president`,
 * `petition`, `confidence`), and every national screen that could show the change reads again.
 */
export function applyNationView(qc: QueryClient, r: PoliticalResult): void {
  const v = r.view;
  switch (v.kind) {
    case 'chairElection':
      qc.setQueryData(trpc.chairElection.get.queryKey(), v.chairElection);
      break;
    case 'desk':
      qc.setQueryData(trpc.chair.desk.queryKey(), v.desk);
      break;
    case 'bill':
      qc.setQueryData(trpc.parliament.bill.queryKey({ billId: v.bill.billId }), v.bill);
      break;
    case 'pick':
      qc.setQueryData(trpc.nation.pick.queryKey(), v.pick);
      break;
    case 'nationalElection':
      qc.setQueryData(trpc.nation.election.queryKey(), v.nationalElection);
      break;
    case 'president':
      qc.setQueryData(trpc.office.president.queryKey(), v.president);
      break;
    case 'petition':
      qc.setQueryData(trpc.petition.get.queryKey(), v.petition);
      break;
    case 'confidence':
      qc.setQueryData(trpc.confidence.get.queryKey(), v.confidence);
      break;
    default:
      break;
  }
  const keep = new Set<string>([v.kind]);
  const stale = [
    ['chairElection', trpc.chairElection.pathKey()],
    ['desk', trpc.chair.pathKey()],
    ['bill', trpc.parliament.pathKey()],
    ['pick', trpc.nation.pathKey()],
    ['president', trpc.office.pathKey()],
    ['petition', trpc.petition.pathKey()],
    ['confidence', trpc.confidence.pathKey()],
  ] as const;
  for (const [kind, queryKey] of stale) {
    // The returned view is fresh; its siblings under the same router are not.
    void qc.invalidateQueries({
      queryKey,
      predicate: keep.has(kind) ? (q) => !sameKey(q.queryKey, keyOf(qc, r)) : undefined,
    });
  }
  void qc.invalidateQueries({ queryKey: trpc.paper.today.queryKey() });
  void qc.invalidateQueries({ queryKey: trpc.city.get.queryKey() });
  void qc.invalidateQueries({ queryKey: trpc.council.pathKey() });
}

function keyOf(_qc: QueryClient, r: PoliticalResult): readonly unknown[] {
  const v = r.view;
  switch (v.kind) {
    case 'chairElection':
      return trpc.chairElection.get.queryKey();
    case 'desk':
      return trpc.chair.desk.queryKey();
    case 'bill':
      return trpc.parliament.bill.queryKey({ billId: v.bill.billId });
    case 'pick':
      return trpc.nation.pick.queryKey();
    case 'nationalElection':
      return trpc.nation.election.queryKey();
    case 'president':
      return trpc.office.president.queryKey();
    case 'petition':
      return trpc.petition.get.queryKey();
    case 'confidence':
      return trpc.confidence.get.queryKey();
    default:
      return [];
  }
}

function sameKey(a: readonly unknown[], b: readonly unknown[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * One national act per tap (ADR 0018), as slice 3's `usePoliticalAct`: the key is made once in the
 * tap, a network retry re-sends it, a second tap before the answer does nothing, and the button stays
 * disabled (`pending`) until the returned view renders.
 */
export function useNationAct() {
  const queryClient = useQueryClient();
  const busy = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<PoliticalResult | null>(null);
  const [open, setOpen] = useState(false);

  const run = useCallback(
    async (label: string, call: (idempotencyKey: string) => Promise<PoliticalResult>): Promise<PoliticalResult | null> => {
      if (busy.current) return null;
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
        if (!r) return null;
        noteServerNow(r.character.serverNow);
        queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
        applyNationView(queryClient, r);
        setResult(r);
        setOpen(true);
        return r;
      } catch (e) {
        setError(e);
        // The refusal carries the settled state: every national screen reads again.
        for (const k of [trpc.chairElection, trpc.chair, trpc.parliament, trpc.nation, trpc.office, trpc.petition, trpc.confidence])
          void queryClient.invalidateQueries({ queryKey: k.pathKey() });
        return null;
      } finally {
        busy.current = false;
        setPending(null);
      }
    },
    [queryClient],
  );

  return { run, pending, error, result, open, setOpen };
}
