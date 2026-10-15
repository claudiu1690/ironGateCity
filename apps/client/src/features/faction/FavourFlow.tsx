import type { PoliticalResult } from '@irongate/rules';
import { FavourSheet, ResultModal } from '@irongate/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { setResultModalOpen } from '../../lib/modalGate';
import { isNetworkError, trpc, trpcClient } from '../../lib/trpc';
import { noteServerNow } from '../../lib/useNow';
import { useCharacter } from '../game/hooks';
import { togetherNotice } from './togetherErrors';

export interface FavourTarget {
  characterId: string;
  kind: 'bail' | 'visit';
}

/** After a favour or a profile's tap: the Faction tab's reads, the chat (the live buttons), the paper. */
export function invalidateTogether(queryClient: ReturnType<typeof useQueryClient>): void {
  for (const key of [
    trpc.faction.members.queryKey(),
    trpc.faction.profile.queryKey(),
    trpc.faction.hq.queryKey(),
    trpc.chat.history.queryKey(),
    trpc.held.inCells.queryKey(),
    trpc.paper.today.queryKey(),
  ])
    void queryClient.invalidateQueries({ queryKey: key });
}

/**
 * Slice 6 (screens §7.1; ADR 0041): *Post bail* and *Visit*, from a Members row, a profile, a chat
 * line or the station's *In the cells now*. The sheet reads the mate's profile (the server's favour,
 * status and price), one tap posts with a key made once per tap (a network retry re-sends it), and the
 * payer's or the visitor's modal follows (`ResultModal kind="political"`).
 */
export function FavourFlow({
  target,
  onClose,
  onDone,
}: {
  target: FavourTarget | null;
  onClose: () => void;
  /** The favour went through (the row's button reads *Posted* / *Visited*). */
  onDone?: (t: FavourTarget) => void;
}) {
  const queryClient = useQueryClient();
  const { character } = useCharacter();
  const mate = useQuery({
    ...trpc.faction.profile.queryOptions({ characterId: target?.characterId ?? '000000000000000000000000' }),
    enabled: !!target,
    refetchOnMount: 'always',
  });
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<PoliticalResult | null>(null);

  const confirm = async () => {
    if (!target || busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    const key = crypto.randomUUID();
    const call = () =>
      target.kind === 'bail'
        ? trpcClient.favours.postBail.mutate({ characterId: target.characterId, idempotencyKey: key })
        : trpcClient.favours.visit.mutate({ characterId: target.characterId, idempotencyKey: key });
    try {
      let r: PoliticalResult | null = null;
      for (let attempt = 0; attempt < 3 && !r; attempt++) {
        try {
          r = await call();
        } catch (e) {
          if (attempt < 2 && isNetworkError(e)) continue;
          throw e;
        }
      }
      if (!r) return;
      noteServerNow(r.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      invalidateTogether(queryClient);
      onDone?.(target);
      setResult(r);
      setResultModalOpen(true);
    } catch (e) {
      setError(e);
      void mate.refetch();
      invalidateTogether(queryClient);
    } finally {
      busy.current = false;
      setPending(false);
    }
  };

  const finish = () => {
    setResult(null);
    setError(null);
    setResultModalOpen(false);
    onClose();
  };

  return (
    <>
      <FavourSheet
        mate={mate.data ?? null}
        kind={target?.kind ?? 'bail'}
        open={!!target && !result}
        onOpenChange={(o) => {
          if (!o) {
            setError(null);
            onClose();
          }
        }}
        onConfirm={() => void confirm()}
        pending={pending}
        notice={error ? (togetherNotice(error) ?? null) : null}
        legalAid={character?.factionId === 'alliance'}
        rivalGround={!!character?.here?.rivalGround}
      />
      <ResultModal
        result={result}
        open={!!result}
        onOpenChange={(o) => {
          if (!o) finish();
        }}
        onContinue={finish}
      />
    </>
  );
}
