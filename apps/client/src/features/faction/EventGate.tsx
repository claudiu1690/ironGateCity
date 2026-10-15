import type { FactionId } from '@irongate/rules';
import { ResultModal } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useCharacter } from '../game/hooks';
import { trainingPlacesOf } from '../game/trainingPlaces';
import { setResultModalOpen } from '../../lib/modalGate';
import { isNetworkError, trpc } from '../../lib/trpc';
import { noteServerNow } from '../../lib/useNow';
import { invalidateTogether } from './eventActs';

/**
 * Slice 6 (tech design §12.1, screens §5; modal order §12 of the screens): the event gate, in the
 * shell above every screen. After the run-in and the held release, while the character has unseen
 * event results, `events.current` → `ResultModal kind="event"` (or the caller's *Called off*
 * political modal) → Continue → `events.seen`, oldest first; then the orders-complete note.
 */
export function EventGate() {
  const qc = useQueryClient();
  const { character } = useCharacter();
  const unseen = character?.events?.unseen ?? 0;
  // The run-in (slice 5) and the held screens' release modal come first.
  const waiting = !!character && unseen > 0 && !character.runIn && !character.held;
  const current = useQuery({
    ...trpc.events.current.queryOptions(),
    enabled: waiting,
    refetchOnWindowFocus: true,
  });
  // A new result arrived (the count moved): ask again.
  useEffect(() => {
    if (waiting) void qc.invalidateQueries({ queryKey: trpc.events.current.queryKey() });
  }, [unseen, waiting, qc]);

  const data = waiting ? (current.data ?? null) : null;
  const seen = useMutation({
    ...trpc.events.seen.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r) => {
      noteServerNow(r.character.serverNow);
      qc.setQueryData(trpc.character.me.queryKey(), r.character);
      qc.setQueryData(trpc.events.current.queryKey(), null);
      void qc.invalidateQueries({ queryKey: trpc.events.current.queryKey() });
      invalidateTogether(qc);
    },
  });
  const open = !!data;
  useEffect(() => {
    setResultModalOpen(open, 'event-gate');
    return () => setResultModalOpen(false, 'event-gate');
  }, [open]);

  const cityId = data?.kind === 'result' ? data.result.character.cityId : (character?.cityId ?? '');
  const city = useQuery({ ...trpc.city.get.queryOptions({ cityId }), enabled: open && !!cityId });

  if (!character || !data) return null;
  const onContinue = () => {
    if (seen.isPending) return;
    if (data.kind === 'result')
      seen.mutate({ eventId: data.result.eventId, signupId: data.result.signupId });
    else if (data.result.view.kind === 'event') seen.mutate({ eventId: data.result.view.event.id, signupId: null });
  };
  const names: Partial<Record<FactionId, string>> = character.factionNames ?? {
    [character.factionId]: character.factionName,
  };
  return (
    <ResultModal
      result={data.result}
      open
      onOpenChange={(o) => {
        if (!o) onContinue();
      }}
      onContinue={onContinue}
      continuePending={seen.isPending}
      factionNames={names}
      trainingPlaces={trainingPlacesOf(city.data)}
    />
  );
}
