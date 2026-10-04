import type { ActionResult, FactionId, Landing } from '@irongate/rules';
import { EncounterModal, ResultModal } from '@irongate/ui';
import type { RunInChoice } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { usePerformAction } from '../action/usePerformAction';
import { noticeFor } from '../game/errors';
import { useCharacter, usePlaceStat } from '../game/hooks';
import { setResultModalOpen } from '../../lib/modalGate';
import { isNetworkError, trpc, trpcClient } from '../../lib/trpc';
import { noteServerNow, serverNow } from '../../lib/useNow';
import { useMissionStart } from './useMissionStart';

/** Where a landing goes: a quarter or a district with its place's sheet open, else the city. */
export function landingRoute(l: Landing): {
  to: '/city/$cityId/$quarterId' | '/city/$cityId';
  params: { cityId: string; quarterId?: string };
  search: { loc?: string };
} {
  const search = l.locationId ? { loc: l.locationId } : {};
  return l.quarterId
    ? { to: '/city/$cityId/$quarterId', params: { cityId: l.cityId, quarterId: l.quarterId }, search }
    : { to: '/city/$cityId', params: { cityId: l.cityId }, search };
}

/**
 * Slice 5 (tech design §12.1, ADR 0032): the run-in gate, in the shell above every screen. While the
 * character has a pending run-in, the run-in modal (it cannot be dismissed); once it is resolved (by the
 * player's one choice, or by luck after the five-minute window), the mission's result with the run-in
 * block, until Continue or *To the cells* closes it (`encounter.close`). The gate also shows the result
 * of *Again* from that modal, so a repeat stays one tap.
 */
export function RunInGate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { character } = useCharacter();
  const stat = usePlaceStat();
  const runIn = character?.runIn ?? null;
  const current = useQuery({
    ...trpc.encounter.current.queryOptions(),
    enabled: !!runIn,
    refetchOnWindowFocus: true,
  });
  const data = runIn ? current.data : null;
  const pending = data && 'pending' in data ? data.pending : null;
  const stored = data && 'result' in data ? data.result : null;
  // The result the gate shows: the run-in's (resolved), or a repeat's started from it.
  const [repeat, setRepeat] = useState<ActionResult | null>(null);
  const shown = stored ?? repeat;

  // At the end of the decide window the next read leaves it to luck: read again then (the server
  // decides; this only asks).
  const decideBy = runIn?.state === 'pending' ? runIn.decideBy : null;
  useEffect(() => {
    if (decideBy === null) return;
    const t = window.setTimeout(
      () => {
        void queryClient.invalidateQueries({ queryKey: trpc.character.me.queryKey() });
        void queryClient.invalidateQueries({ queryKey: trpc.encounter.current.queryKey() });
      },
      Math.max(0, decideBy - serverNow()) + 1_500,
    );
    return () => window.clearTimeout(t);
  }, [decideBy, queryClient]);
  // The character's pointer moved on (resolved in another tab): read the encounter again.
  const state = runIn?.state ?? null;
  const encounterId = runIn?.encounterId ?? null;
  useEffect(() => {
    if (state) void queryClient.invalidateQueries({ queryKey: trpc.encounter.current.queryKey() });
  }, [state, encounterId, queryClient]);

  const afterWrite = (c: ActionResult['character']) => {
    noteServerNow(c.serverNow);
    queryClient.setQueryData(trpc.character.me.queryKey(), c);
    for (const key of [trpc.city.get.queryKey(), trpc.held.get.queryKey(), trpc.paper.today.queryKey()])
      void queryClient.invalidateQueries({ queryKey: key });
  };

  // The one choice: one key per tap; every row is disabled from the tap until the result renders.
  const chooseBusy = useRef(false);
  const choose = useMutation({
    ...trpc.encounter.choose.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (result) => {
      queryClient.setQueryData(trpc.encounter.current.queryKey(), { result } as never);
      afterWrite(result.character);
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: trpc.encounter.current.queryKey() }),
    onSettled: () => {
      chooseBusy.current = false;
    },
  });
  const onChoose = (choice: RunInChoice) => {
    if (chooseBusy.current || !pending) return;
    chooseBusy.current = true;
    choose.mutate({ encounterId: pending.encounterId, choice, idempotencyKey: crypto.randomUUID() });
  };

  // Continue / *To the cells*: close the run-in (idempotent), then go where the result sent you.
  const [closing, setClosing] = useState(false);
  const closeRunIn = async (): Promise<Landing | null> => {
    if (!encounterId) return null;
    const r = await trpcClient.encounter.close.mutate({ encounterId });
    noteServerNow(r.character.serverNow);
    queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
    queryClient.setQueryData(trpc.encounter.current.queryKey(), null);
    return r.landing;
  };
  const onContinue = async (toHeld: boolean) => {
    if (closing) return;
    setClosing(true);
    try {
      if (stored) await closeRunIn();
      setRepeat(null);
      if (toHeld) void navigate({ to: '/held' });
    } catch {
      // The next read shows the result again; Continue can be tapped once more.
    } finally {
      setClosing(false);
    }
  };

  // *Again* from the gate's result: the run-in closes first, then the same mission (its remembered
  // way) or the same tap, under a new key.
  const mission = useMissionStart((r) => setRepeat(r));
  const action = usePerformAction((r) => setRepeat(r));
  const onAgain = async () => {
    const r = shown;
    if (!r || closing || mission.isPending || action.isPending) return;
    setClosing(true);
    try {
      if (stored) await closeRunIn();
      setRepeat(null);
    } catch {
      setClosing(false);
      return;
    }
    setClosing(false);
    if (r.kind === 'mission' && r.again?.way)
      mission.start({ locationId: r.place.locationId, missionId: r.action.id, wayId: r.again.way.id });
    else action.perform({ actionId: r.action.id, locationId: r.place.locationId }, 1);
  };

  const encounterOpen = !!pending && runIn?.state === 'pending';
  const resultOpen = !encounterOpen && !!shown;
  useEffect(() => {
    setResultModalOpen(resultOpen || encounterOpen);
  }, [resultOpen, encounterOpen]);

  if (!character) return null;
  const names: Partial<Record<FactionId, string>> = character.factionNames ?? {
    [character.factionId]: character.factionName,
  };
  return (
    <>
      <EncounterModal
        pending={pending}
        open={encounterOpen}
        onChoose={onChoose}
        choosing={choose.isPending ? (choose.variables?.choice ?? null) : null}
        notice={choose.error ? noticeFor(choose.error) : null}
      />
      <ResultModal
        result={shown}
        open={resultOpen}
        onOpenChange={(o) => {
          if (!o) void onContinue(false);
        }}
        onAgain={() => void onAgain()}
        againPending={mission.isPending || action.isPending || closing ? 1 : null}
        energy={{ value: character.energy.value, nextTickAt: character.energy.nextTickAt }}
        statPoints={{
          pending: character.statPointsPending,
          level: character.level,
          stats: { str: character.stats.str, int: character.stats.int, agi: character.stats.agi },
          guide: character.statGuide,
        }}
        onPlaceStat={stat.place}
        placing={stat.placing}
        factionNames={names}
        onSentTo={() => void onContinue(true)}
        sentToPending={closing}
      />
    </>
  );
}
