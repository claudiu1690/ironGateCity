import { ResultModal } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { setResultModalOpen } from '../../lib/modalGate';
import { isNetworkError, trpc } from '../../lib/trpc';
import { noteServerNow } from '../../lib/useNow';
import { useCharacter } from '../game/hooks';
import { landingRoute } from './RunInGate';

/**
 * Slice 6 fix round (QA m2): the held release, in the shell above every screen. A stay that ended
 * while the player was away waits as `held.state: 'out'` until its release modal is closed; `/`
 * sends the player to `/held` for it, but a deep link or a reload elsewhere (the Faction tab) did
 * not show it, and the event results behind it waited unseen. Off `/held` (whose page has its own
 * copy with the ways out), this shows the same release modal; its Continue closes the stay
 * (`held.close`, idempotent) and lands where the held page would. The order stays the run-in, the
 * release, the event results, then the orders-complete note.
 */
export function HeldReleaseGate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { character } = useCharacter();
  const waiting = !!character && character.held?.state === 'out' && !character.runIn && pathname !== '/held';
  const held = useQuery({ ...trpc.held.get.queryOptions(), enabled: waiting });
  const h = waiting ? (held.data ?? null) : null;
  const release = h?.state === 'out' ? h.release : null;

  const [closing, setClosing] = useState(false);
  const close = useMutation({
    ...trpc.held.close.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r) => {
      noteServerNow(r.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      queryClient.setQueryData(trpc.held.get.queryKey(), null);
      for (const key of [trpc.city.get.queryKey(), trpc.paper.today.queryKey(), trpc.travel.nation.queryKey()])
        void queryClient.invalidateQueries({ queryKey: key });
      setClosing(false);
      // A deportation lands on the journey; otherwise the player stays on the screen they opened.
      if ('journey' in r.landing) void navigate({ to: '/journey' });
      else if (pathname.startsWith('/city')) void navigate(landingRoute(r.landing));
    },
    onError: () => setClosing(false),
  });

  const open = !!release;
  useEffect(() => {
    setResultModalOpen(open, 'held-gate');
    return () => setResultModalOpen(false, 'held-gate');
  }, [open]);

  if (!h || !release) return null;
  const onContinue = () => {
    if (closing) return;
    setClosing(true);
    close.mutate({ stayId: h.stayId });
  };
  return (
    <ResultModal
      result={release}
      open
      onOpenChange={(o) => {
        if (!o) onContinue();
      }}
      onContinue={onContinue}
      continuePending={closing}
    />
  );
}
