import { copy } from '@irongate/content/copy';
import type { ActionResult, FactionId, PoliticalResult } from '@irongate/rules';
import { ElectionCard, HeldScreen, PaperSheet, ResultModal, healthNow } from '@irongate/ui';
import type { HeldPending } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { noticeFor } from '../features/game/errors';
import { useCharacter, usePlaceStat } from '../features/game/hooks';
import { trainingPlacesOf } from '../features/game/trainingPlaces';
import { landingRoute } from '../features/street/RunInGate';
import { setResultModalOpen } from '../lib/modalGate';
import { isNetworkError, trpc, trpcClient } from '../lib/trpc';
import { noteServerNow, serverNow, useNow } from '../lib/useNow';
import { groundFor } from './city';

/**
 * Slice 5 (screens §6–§7, tech design §12.1): the cells or the infirmary, in place of the map while
 * held. The minutes tick on the client once a second; at `until` it asks the server again (the server
 * releases you, lazily, as of `until`) and the release modal opens; its Continue (`held.close`) lands on
 * the police station's or the infirmary's sheet, or the journey after a deportation.
 */
export function HeldPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { character } = useCharacter();
  const stat = usePlaceStat();
  const held = useQuery({ ...trpc.held.get.queryOptions(), refetchOnWindowFocus: true });
  const now = useNow(1_000);
  const h = held.data ?? null;
  useEffect(() => {
    if (h) noteServerNow(h.serverNow);
  }, [h]);

  // At `until`, ask again: the read releases (or discharges) you as of then.
  const until = h?.state === 'in' ? h.until : null;
  const refetch = held.refetch;
  useEffect(() => {
    if (until === null) return;
    const t = window.setTimeout(
      () => {
        void refetch();
        void queryClient.invalidateQueries({ queryKey: trpc.character.me.queryKey() });
      },
      Math.max(0, until - serverNow()) + 600,
    );
    return () => window.clearTimeout(t);
  }, [until, refetch, queryClient]);

  // Not held (released in another tab, or never): the city you are in.
  useEffect(() => {
    if (held.isSuccess && h === null && character && !character.held)
      void navigate({ to: '/city/$cityId', params: { cityId: character.cityId }, replace: true });
  }, [held.isSuccess, h, character, navigate]);

  // The ways out: bail, walk out well, discharge yourself (one key each, ADR 0002).
  const [release, setRelease] = useState<PoliticalResult | null>(null);
  const busy = useRef(false);
  const pay = useMutation({
    mutationFn: async ({ kind, key }: { kind: Exclude<HeldPending, null>; key: string }) =>
      kind === 'bail'
        ? trpcClient.held.bail.mutate({ idempotencyKey: key })
        : kind === 'walkOut'
          ? trpcClient.held.walkOut.mutate({ idempotencyKey: key })
          : trpcClient.held.discharge.mutate({ idempotencyKey: key }),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r) => {
      noteServerNow(r.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      setRelease(r);
      void queryClient.invalidateQueries({ queryKey: trpc.held.get.queryKey() });
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const payOut = (kind: Exclude<HeldPending, null>) => {
    if (busy.current) return;
    busy.current = true;
    pay.mutate({ kind, key: crypto.randomUUID() });
  };

  // Continue on the release modal: the stay closes (idempotent), then where it lands.
  const [closing, setClosing] = useState(false);
  const close = useMutation({
    ...trpc.held.close.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r) => {
      noteServerNow(r.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      queryClient.setQueryData(trpc.held.get.queryKey(), null);
      for (const key of [
        trpc.city.get.queryKey(),
        trpc.paper.today.queryKey(),
        trpc.travel.nation.queryKey(),
      ])
        void queryClient.invalidateQueries({ queryKey: key });
      if ('journey' in r.landing) void navigate({ to: '/journey' });
      else void navigate(landingRoute(r.landing));
    },
    onError: () => setClosing(false),
  });
  const shownRelease = release ?? (h?.state === 'out' ? h.release : null);
  const onContinue = () => {
    if (closing || !h) return;
    setClosing(true);
    close.mutate({ stayId: h.stayId });
  };

  // The cell's or the ward's one tap: an ordinary result.
  const [tapResult, setTapResult] = useState<ActionResult | null>(null);
  const tapBusy = useRef(false);
  const tap = useMutation({
    ...trpc.held.act.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r) => {
      noteServerNow(r.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      setTapResult(r);
      void queryClient.invalidateQueries({ queryKey: trpc.held.get.queryKey() });
    },
    onSettled: () => {
      tapBusy.current = false;
    },
  });
  const onTap = () => {
    if (tapBusy.current) return;
    tapBusy.current = true;
    tap.mutate({ idempotencyKey: crypto.randomUUID() });
  };
  const releaseOpen = !!shownRelease;
  useEffect(() => {
    setResultModalOpen(releaseOpen || !!tapResult);
    return () => setResultModalOpen(false);
  }, [releaseOpen, tapResult]);

  // The ground sash on the held place's picture: whose ground it is.
  const city = useQuery({
    ...trpc.city.get.queryOptions({ cityId: h?.cityId ?? '' }),
    enabled: !!h && !!character && character.cityId === h.cityId && !character.journey,
  });
  const names: Partial<Record<FactionId, string>> =
    character?.factionNames ?? (character ? { [character.factionId]: character.factionName } : {});
  const place = city.data?.locations.find((l) => l.id === h?.locationId);

  if (held.isError) {
    return (
      <p role="alert" className="p-4 font-body text-paper">
        This could not be loaded. Check your connection and try again.
      </p>
    );
  }
  if (!h || !character) {
    return (
      <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
        Loading…
      </p>
    );
  }
  const hp = character.health
    ? { value: healthNow(character.health, now), max: character.health.max }
    : { value: h.health.value, max: h.health.max };
  const energy = { value: character.energy.value, nextTickAt: character.energy.nextTickAt };
  return (
    <PaperSheet>
      <HeldScreen
        held={h}
        now={Math.min(now, h.until)}
        health={hp}
        energy={energy}
        onBail={() => payOut('bail')}
        onWalkOut={() => payOut('walkOut')}
        onDischarge={() => payOut('discharge')}
        pending={pay.isPending ? (pay.variables?.kind ?? null) : null}
        onTap={onTap}
        tapPending={tap.isPending}
        tapNotice={tap.error ? noticeFor(tap.error) : undefined}
        notice={pay.error ? noticeFor(pay.error) : null}
        ground={city.data ? groundFor(city.data, place, names) : null}
      >
        <Link
          to="/paper"
          className="flex min-h-14 items-center justify-between gap-3 border-b border-dotted border-faint py-2 hover:bg-paper-card"
          data-testid="held-paper"
        >
          <span className="font-display text-[18px] font-bold">{copy.travel.readThePaper}</span>
          {h.paperUnread > 0 && (
            <span className="font-mono text-[12px] text-petrol">{copy.travel.unread(h.paperUnread)}</span>
          )}
        </Link>
        {(h.election ?? city.data?.election) && (
          <ElectionCard
            summary={(h.election ?? city.data?.election)!}
            layout="row"
            now={now}
            factionNames={names}
            onOpen={(route) => void navigate({ to: route })}
          />
        )}
      </HeldScreen>
      <ResultModal
        result={shownRelease}
        open={releaseOpen}
        onOpenChange={(o) => {
          if (!o) onContinue();
        }}
        onContinue={onContinue}
        continuePending={closing}
      />
      <ResultModal
        result={tapResult}
        open={!!tapResult && !releaseOpen}
        onOpenChange={(o) => {
          if (!o) setTapResult(null);
        }}
        energy={energy}
        statPoints={{
          pending: character.statPointsPending,
          level: character.level,
          stats: { str: character.stats.str, int: character.stats.int, agi: character.stats.agi },
          guide: character.statGuide,
        }}
        onPlaceStat={stat.place}
        placing={stat.placing}
        factionNames={names}
        trainingPlaces={trainingPlacesOf(city.data)}
      />
    </PaperSheet>
  );
}
