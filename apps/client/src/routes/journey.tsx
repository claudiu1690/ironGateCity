import { copy } from '@irongate/content/copy';
import { journeyProgress, trainAt } from '@irongate/rules';
import type { FactionId, JourneyCardResult, JourneyView, RouteLeg } from '@irongate/rules';
import {
  CityMap,
  ElectionCard,
  JourneyCard,
  JourneyCardSheet,
  JourneyProgress,
  ResultModal,
  cx,
  formatClock,
  formatWhen,
  groundOf,
  pyramidFor,
} from '@irongate/ui';
import type { MapHotspot, MapRect, MapTraveller } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { env } from '../env';
import { noticeFor } from '../features/game/errors';
import { useCharacter } from '../features/game/hooks';
import { setResultModalOpen } from '../lib/modalGate';
import { isNetworkError, trpc } from '../lib/trpc';
import { useNightTurn } from '../lib/useNightTurn';
import { noteServerNow, serverNow, useMinWidth, useNow } from '../lib/useNow';

/** The journey with a card's outcome folded in (the result's own journey view carries none). */
function withChosen(r: JourneyCardResult): JourneyView {
  return { ...r.journey, card: r.journey.card ? { ...r.journey.card, chosen: r } : null };
}

/** Review 4 (tech design §6.5): the map's frame, the route and its two ends grown by 0.08. */
const FRAME_GROW = 0.08;
/** QA review 4 (R4-QA-05): the card's sheet opens once the pin's 700 ms pulse is seen. */
const PULSE_BEFORE_SHEET_MS = 800;
function frameOf(points: ReadonlyArray<readonly [number, number]>): MapRect {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    x0: Math.max(0, Math.min(...xs) - FRAME_GROW),
    y0: Math.max(0, Math.min(...ys) - FRAME_GROW),
    x1: Math.min(1, Math.max(...xs) + FRAME_GROW),
    y1: Math.min(1, Math.max(...ys) + FRAME_GROW),
  };
}

/**
 * Review 4 (answers §7.3, tech design §6.5): the plate. The kicker (*Third class · car 4*), the train's
 * name, the two ends with the track and *arrives in 7 min · 14:22*, the sentence, the fellow
 * travellers, the row back to an unanswered card, and the two *while you ride* rows in its foot. It
 * ticks once a second on its own, so the map under it does not re-render.
 */
function JourneyPlate({
  data,
  names,
  onOpenCard,
  className,
}: {
  data: JourneyView;
  names: Partial<Record<FactionId, string>>;
  onOpenCard: (() => void) | null;
  className?: string;
}) {
  const navigate = useNavigate();
  const now = useNow(1_000);
  return (
    <article
      className={cx('paper-grain flex flex-col gap-2.5 bg-paper px-4 pt-3 pb-3 text-ink', className)}
      data-testid="journey-plate"
    >
      <header className="flex flex-col gap-0.5">
        <span className="font-mono text-[11.5px] text-muted">{copy.travel.thirdClass}</span>
        <h1 className="font-display text-[22px] leading-tight font-black" data-testid="journey-title">
          {copy.travel.theTrainAt(formatClock(data.boardedAt), data.to.name)}
        </h1>
      </header>
      <JourneyProgress
        from={data.from.name}
        to={data.to.name}
        boardedAt={data.boardedAt}
        arrivesAt={data.arrivesAt}
        now={Math.min(now, data.arrivesAt)}
      />
      <p className="border-y border-ink py-2 font-body text-[14.5px] leading-snug italic" data-testid="journey-sentence">
        {copy.travel.eitherWay}
      </p>
      {onOpenCard && data.card && (
        <button
          type="button"
          onClick={onOpenCard}
          className="flex min-h-11 cursor-pointer items-center justify-between gap-2 border-[1.5px] border-ink bg-paper-card px-3 text-left hover:bg-ink hover:text-paper"
          data-testid="journey-card-open"
        >
          <span className="font-body text-[14px] font-semibold">{copy.travel.backToTheCard(data.card.title)}</span>
          <span aria-hidden="true">›</span>
        </button>
      )}
      {data.others > 0 && (
        <p className="font-mono text-[11.5px] text-muted" data-testid="journey-others">
          {copy.travel.others(data.others)}
        </p>
      )}
      <section aria-label={copy.travel.whileYouRide} className="flex flex-col">
        <div className="label-caps border-t-[3px] border-b border-double border-ink py-1 text-[11px] font-semibold">
          {copy.travel.whileYouRide}
        </div>
        <Link
          to="/paper"
          className="flex min-h-11 items-center justify-between gap-3 border-b border-dotted border-faint py-1.5 hover:bg-paper-card"
          data-testid="journey-paper"
        >
          <span className="font-display text-[17px] font-bold">{copy.travel.readThePaper}</span>
          {data.whileYouRide.paperUnread > 0 && (
            <span className="font-mono text-[12px] text-petrol">{copy.travel.unread(data.whileYouRide.paperUnread)}</span>
          )}
        </Link>
        {data.whileYouRide.election && (
          <ElectionCard
            summary={data.whileYouRide.election}
            layout="row"
            now={now}
            factionNames={names}
            onOpen={(route) => void navigate({ to: route })}
          />
        )}
      </section>
    </article>
  );
}

/**
 * Slice 4 (screens §3–§4), review 4 (answers §7, tech design §6.5, ADR 0075): the journey on the
 * nation map. The map is fitted to the line between the two cities, the route traced over the painted
 * rails, the other cities muted, and **your pin** (the user, 7 Oct 2026: a plain moving pin, not a
 * train) where the clock puts it, ticking once a second. After a drag, *Follow your pin* brings the
 * view back. The plate sits on top on a phone and as a 480 px side sheet from 1024 px. The card (when
 * the journey drew one) opens as a sheet at its moment, the pin pulsing once, and is open again on
 * return while it can be answered. At `arrivesAt` the server is asked again and the arrival modal
 * opens over the map; its *Continue* lands on the station district in the capital, or the city's Town
 * Hall at home.
 */
export function JourneyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { character } = useCharacter();
  const j = useQuery({ ...trpc.travel.journey.queryOptions(), refetchOnWindowFocus: true });
  const wide = useMinWidth(1024);
  const data = j.data;
  // Review 5 (ADR 0079): the map's day or night is the view's, read again at dusk and dawn.
  useNightTurn(data?.night, [trpc.travel.journey.queryKey()]);
  useEffect(() => {
    if (data) noteServerNow(data.serverNow);
  }, [data]);

  // At `arrivesAt`, ask again: the read settles the arrival (ADR 0025), and the modal opens.
  const arrivesAt = data?.status === 'onTheWay' ? data.arrivesAt : null;
  const refetch = j.refetch;
  useEffect(() => {
    if (arrivesAt === null) return;
    const t = window.setTimeout(() => void refetch(), Math.max(0, arrivesAt - serverNow()) + 400);
    return () => window.clearTimeout(t);
  }, [arrivesAt, refetch]);
  // Review 4 (ADR 0075 §6): at the card's moment, ask again; the server sends the card from then.
  const cardAt = data?.status === 'onTheWay' && data.cardAt !== null && !data.card ? data.cardAt : null;
  useEffect(() => {
    if (cardAt === null) return;
    const t = window.setTimeout(() => void refetch(), Math.max(0, cardAt - serverNow()) + 400);
    return () => window.clearTimeout(t);
  }, [cardAt, refetch]);
  const arrived = data?.status === 'arrived' && !!data.arrival;
  // The character (its city, its journey's status) changed with the arrival.
  useEffect(() => {
    if (arrived) void queryClient.invalidateQueries({ queryKey: trpc.character.me.queryKey() });
  }, [arrived, queryClient]);
  // No open journey (closed in another tab, or never): the map.
  useEffect(() => {
    if (j.isSuccess && data === null && character)
      void navigate({ to: '/city/$cityId', params: { cityId: character.cityId }, replace: true });
  }, [j.isSuccess, data, character, navigate]);
  useEffect(() => {
    setResultModalOpen(arrived);
    return () => setResultModalOpen(false);
  }, [arrived]);

  // The card's sheet: open when the card arrives (or on return while it can be answered), once per
  // journey mount. Review 5 #7 (answers §7): it can't be put aside without a row; left by another tab
  // (the Paper, Me, Council), the browser or the app closed, it is open again on return to the map,
  // or waits in the arrival modal. The plate's row opens it early, in the pulse's wait. The pin
  // pulses as it opens.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pulse, setPulse] = useState(0);
  const openedFor = useRef<string | null>(null);
  const sheetTimer = useRef<number | undefined>(undefined);
  const answerable = !!data?.card && !data.card.chosen && data.status === 'onTheWay';
  useEffect(() => {
    if (!data || !answerable || openedFor.current === data.id) return;
    openedFor.current = data.id;
    setPulse((n) => n + 1);
    // QA review 4 (R4-QA-05): the pin pulses first, where the player can see it, then the sheet opens
    // over the map (the pulse is 700 ms). Under reduced motion there is no pulse, so no wait.
    const still =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) setSheetOpen(true);
    // A ref, not the effect's cleanup: a refetch changes `data` inside the wait and must not cancel it.
    else sheetTimer.current = window.setTimeout(() => setSheetOpen(true), PULSE_BEFORE_SHEET_MS);
  }, [data, answerable]);
  useEffect(() => () => window.clearTimeout(sheetTimer.current), []);

  // The card: one tap, final; the row collapses at once (QA slice 2 M1). Answered on the arrival
  // modal, its outcome stays there; answered on the way, the sheet shows it until closed.
  const chooseBusy = useRef(false);
  const [answeredOnArrival, setAnsweredOnArrival] = useState(false);
  const choose = useMutation({
    ...trpc.travel.choose.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r) => {
      noteServerNow(r.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      queryClient.setQueryData(trpc.travel.journey.queryKey(), withChosen(r));
      if (r.journey.status === 'arrived') setAnsweredOnArrival(true);
    },
    onSettled: () => {
      chooseBusy.current = false;
    },
  });
  const onChoose = (choiceId: string) => {
    if (chooseBusy.current || !data) return;
    chooseBusy.current = true;
    choose.mutate({ journeyId: data.id, choiceId, idempotencyKey: crypto.randomUUID() });
  };

  // Continue: close the arrival (idempotent), then the landing.
  const [closing, setClosing] = useState(false);
  const close = useMutation({
    ...trpc.travel.close.mutationOptions(),
    retry: (n, e) => n < 2 && isNetworkError(e),
    onSuccess: (r) => {
      noteServerNow(r.character.serverNow);
      queryClient.setQueryData(trpc.character.me.queryKey(), r.character);
      queryClient.setQueryData(trpc.travel.journey.queryKey(), null);
      for (const key of [trpc.city.get.queryKey(), trpc.travel.nation.queryKey(), trpc.paper.today.queryKey()])
        void queryClient.invalidateQueries({ queryKey: key });
      const l = r.landing;
      if (l.quarterId)
        void navigate({
          to: '/city/$cityId/$quarterId',
          params: { cityId: l.cityId, quarterId: l.quarterId },
          search: l.locationId ? { loc: l.locationId } : {},
        });
      else void navigate({ to: '/city/$cityId', params: { cityId: l.cityId }, search: l.locationId ? { loc: l.locationId } : {} });
    },
    onError: () => setClosing(false),
  });
  const onContinue = () => {
    if (closing || !data) return;
    setClosing(true);
    close.mutate({ journeyId: data.id });
  };

  // *Follow your pin*: shown once the player has moved the map away from its rest view.
  const [moved, setMoved] = useState(false);
  const [recentre, setRecentre] = useState(0);

  // The ground sash on the arrival's picture: whose ground the station's place is.
  const landing = data?.arrival?.landing;
  const dest = useQuery({
    ...trpc.city.get.queryOptions({ cityId: data?.to.cityId ?? '' }),
    enabled: arrived && !!landing,
  });
  const names: Partial<Record<FactionId, string>> =
    character?.factionNames ?? (character ? { [character.factionId]: character.factionName } : {});
  const ground = (() => {
    const c = dest.data;
    if (!c || !landing) return null;
    const d = landing.quarterId ? c.districts?.find((x) => x.id === landing.quarterId) : undefined;
    return d
      ? groundOf({ shares: d.opinion, closeRace: d.state.battleground, names })
      : groundOf({ shares: c.opinion, names });
  })();

  // The map: the route, its frame, the pins and the traveller (all from the server's route).
  const route = data?.route;
  const legs = useMemo<RouteLeg[]>(
    () => (route ? route.legs.map((l) => ({ points: l.points, minutes: l.toT - l.fromT })) : []),
    [route],
  );
  const factionId = character?.factionId;
  const traveller = useMemo<MapTraveller | null>(() => {
    if (!data || legs.length === 0 || !factionId) return null;
    const { boardedAt, arrivesAt: at, to } = data;
    return {
      at: (now) => {
        const p = trainAt(legs, journeyProgress(boardedAt, at, now));
        // QA review 4: after arrival the label says where you are, *In Coalport*, not *· now*.
        const label = now >= at ? copy.travel.pinIn(to.name) : copy.travel.pinTo(to.name, formatWhen(at, now));
        return { x: p.x, y: p.y, label };
      },
      name: (now) =>
        now >= at ? copy.travel.pinInName(to.name) : copy.travel.pinName(to.name, formatWhen(at, now)),
      colour: `var(--color-${factionId})`,
      pulse,
    };
  }, [data, legs, factionId, pulse]);

  if (j.isError) {
    return (
      <p role="alert" className="p-4 font-body text-paper">
        The journey could not be loaded. Check your connection and try again.
      </p>
    );
  }
  if (!data || !route) {
    return (
      <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
        Finding your seat…
      </p>
    );
  }
  const card = data.card;
  const ends = [data.from.cityId, data.to.cityId];
  // A two-leg journey runs through the capital: the pin where its legs meet.
  const via = route.legs.length > 1 ? route.legs[0]!.points.at(-1) : undefined;
  const pins: MapHotspot[] = route.cities.map((c, i) => ({
    id: c.cityId,
    n: i + 1,
    name: c.name,
    map: { x: c.x, y: c.y },
    pin: {
      style: 'label',
      label: c.name,
      // The other cities muted; the capital a two-leg journey runs through is on the line.
      marks: ends.includes(c.cityId) || (via && via[0] === c.x && via[1] === c.y) ? [] : ['muted'],
    },
  }));
  const allPoints = route.legs.flatMap((l) => l.points);
  const frame = frameOf(allPoints);
  const dayTiles = pyramidFor(data.map.day, env.tilesOrigin);
  const nightTiles = pyramidFor(data.map.night, env.tilesOrigin);
  const tiles = dayTiles && nightTiles ? { day: dayTiles, night: nightTiles } : null;
  const plate = (
    <JourneyPlate
      data={data}
      names={names}
      onOpenCard={answerable && !sheetOpen ? () => setSheetOpen(true) : null}
      className={wide ? 'max-h-full overflow-y-auto shadow-[0_0_0_1px_var(--color-ink),0_8px_24px_rgb(0_0_0/0.45)]' : 'max-h-[46%] shrink-0 overflow-y-auto border-b border-ink'}
    />
  );

  return (
    <div
      // `isolate`: the card's dim and sheet stay under the app's tab bar and top bar (review 5 #7).
      className="relative isolate flex h-full min-h-[420px] flex-col bg-ink"
      data-testid="journey"
      data-card-at={data.cardAt ?? undefined}
      data-status={data.status}
    >
      {!wide && plate}
      <CityMap
        className="min-h-[200px] min-w-0 flex-1"
        map={data.map}
        tiles={tiles}
        frame={frame}
        isNight={data.night.night}
        locations={pins}
        selectedId={null}
        onSelect={() => undefined}
        restFocus={ends}
        restPoints={allPoints.map(([x, y]) => ({ x, y }))}
        paths={route.legs.map((l, i) => ({ id: `leg-${i}`, points: l.points }))}
        traveller={traveller}
        onUserMove={setMoved}
        recentre={recentre}
        zoomButtons={wide ? 'top-3 right-3 flex' : undefined}
      >
        {wide && (
          <div
            className="absolute top-3 bottom-[124px] left-3 z-10 flex w-[480px] flex-col"
            data-map-overlay="journey-plate"
          >
            {plate}
          </div>
        )}
        {moved && (
          <button
            type="button"
            onClick={() => {
              setMoved(false);
              setRecentre((n) => n + 1);
            }}
            data-map-control=""
            data-testid="follow-pin"
            className={cx(
              'label-caps pointer-events-auto absolute z-10 flex min-h-11 cursor-pointer items-center gap-1.5 bg-paper px-3 text-[12px] font-semibold text-ink shadow-[0_0_0_1px_var(--color-ink),0_4px_12px_rgb(0_0_0/0.4)] hover:bg-paper-2',
              wide ? 'top-3 left-[504px]' : 'bottom-3 left-1/2 -translate-x-1/2',
            )}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <rect x="3" y="3" width="6" height="6" transform="rotate(45 6 6)" fill="currentColor" />
            </svg>
            {copy.travel.followYourPin}
          </button>
        )}
      </CityMap>
      {card && !arrived && sheetOpen && (
        // Review 5 #7 (answers §7): unanswered, the card stays until a row is tapped (no Close, no
        // Escape, the map under its dim inert); the tab bar still works. Answered, it shows the
        // outcome and closes as before.
        <JourneyCardSheet
          title={copy.travel.onTheTrainTo(data.to.name)}
          onClose={answerable ? undefined : () => setSheetOpen(false)}
        >
          <JourneyCard
            card={card}
            onChoose={onChoose}
            pendingChoiceId={choose.isPending ? (choose.variables?.choiceId ?? null) : null}
          />
          {choose.error && (
            <p role="status" className="font-body text-[13px] text-collective">
              {noticeFor(choose.error)}
            </p>
          )}
        </JourneyCardSheet>
      )}
      <ResultModal
        result={arrived ? { kind: 'journey', journey: data } : null}
        open={arrived}
        onOpenChange={(o) => {
          // Review 5 #7: Escape or a tap outside is Continue, and Continue waits for the card's row.
          if (!o && !(card && !card.chosen)) onContinue();
        }}
        onContinue={onContinue}
        continuePending={closing}
        ground={ground}
        journeyCard={
          card && !card.chosen ? (
            <>
              <JourneyCard
                card={card}
                compact
                onChoose={onChoose}
                pendingChoiceId={choose.isPending ? (choose.variables?.choiceId ?? null) : null}
              />
              {choose.error && (
                <p role="status" className="font-body text-[13px] text-collective">
                  {noticeFor(choose.error)}
                </p>
              )}
            </>
          ) : card?.chosen && answeredOnArrival ? (
            <JourneyCard card={card} compact onChoose={() => undefined} />
          ) : null
        }
      />
    </div>
  );
}
