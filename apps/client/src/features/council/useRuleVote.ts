import { useState } from 'react';
import { trpcClient } from '../../lib/trpc';
import type { usePoliticalAct } from './usePoliticalAct';

/**
 * The voting rework (tech design §9.1): the rule ballot's selection and its one act, shared by the
 * ballot page, the Town Hall's *Next week's rule* block and the desktop Election card. The vote runs
 * through the page's political act (one key per tap, one modal); the server decides.
 */
export function useRuleVote(act: ReturnType<typeof usePoliticalAct>) {
  const [selected, setSelected] = useState<string | null>(null);
  const vote = () => {
    if (!selected) return;
    void act.run('vote', (k) => trpcClient.council.vote.mutate({ ordinanceId: selected, idempotencyKey: k }));
  };
  return { selected, select: setSelected, vote, pending: act.pending === 'vote' };
}
