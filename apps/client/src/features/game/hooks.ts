import { projectEnergy } from '@irongate/rules';
import type { CharacterView, StatPointTarget } from '@irongate/rules';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef } from 'react';
import { isNetworkError, trpc } from '../../lib/trpc';
import { noteServerNow, useNow } from '../../lib/useNow';

/** The character, with Energy ticking locally by the same rules function the server uses. */
export function useCharacter() {
  const me = useQuery(trpc.character.me.queryOptions());
  const now = useNow(1_000);
  useEffect(() => {
    if (me.data) noteServerNow(me.data.serverNow);
  }, [me.data]);
  const projected = useMemo(() => {
    const c = me.data;
    if (!c) return null;
    const p = projectEnergy(
      { value: c.energy.value, rested: c.rested, updatedAt: c.energy.updatedAt },
      now,
      c.energy.max,
      c.restedCap ?? undefined,
    );
    const view: CharacterView = {
      ...c,
      rested: p.rested,
      energy: {
        value: p.value,
        max: p.max,
        updatedAt: p.updatedAt,
        nextTickAt: p.nextTickAt,
        fullAt: p.fullAt,
      },
    };
    return { view, nextTickIn: p.nextTickAt === null ? null : p.nextTickAt - now };
  }, [me.data, now]);
  return { query: me, character: projected?.view ?? null, nextTickIn: projected?.nextTickIn ?? null, now };
}

/** §5.3: one tap per stat point, each its own idempotency key (ADR 0008). */
export function usePlaceStat() {
  const queryClient = useQueryClient();
  const busy = useRef(false);
  const m = useMutation({
    ...trpc.character.placeStatPoint.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (view) => {
      queryClient.setQueryData(trpc.character.me.queryKey(), view);
      void queryClient.invalidateQueries({ queryKey: trpc.city.get.queryKey() });
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const place = (stat: StatPointTarget) => {
    if (busy.current) return;
    busy.current = true;
    m.mutate({ stat, idempotencyKey: crypto.randomUUID() });
  };
  return { place, placing: m.isPending ? (m.variables?.stat ?? null) : null };
}
