import { copy } from '@irongate/content/copy';
import type { FactionId, JourneyCardResult, JourneyView } from '@irongate/rules';
import {
  ElectionCard,
  JourneyCard,
  JourneyProgress,
  ResultModal,
  formatClock,
  groundOf,
} from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { noticeFor } from '../features/game/errors';
import { useCharacter } from '../features/game/hooks';
import { setResultModalOpen } from '../lib/modalGate';
import { isNetworkError, trpc } from '../lib/trpc';
import { noteServerNow, serverNow, useNow } from '../lib/useNow';

/** The journey with a card's outcome folded in (the result's own journey view carries none). */
function withChosen(r: JourneyCardResult): JourneyView {
  return { ...r.journey, card: r.journey.card ? { ...r.journey.card, chosen: r } : null };
}

/**
 * Slice 4 (screens §3–§4, tech design §12.1): the journey screen in place of the map while on a
 * train: the train's name, the progress line ticking once a second, the sentence (*you can close the
 * game*), the optional card, and the paper and the election while you ride. At `arrivesAt` it asks the
 * server again (the server is the authority) and the arrival modal opens over it; its *Continue* lands
 * on the station district in the capital, or the city at home.
 */
export function JourneyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { character } = useCharacter();
  const j = useQuery({ ...trpc.travel.journey.queryOptions(), refetchOnWindowFocus: true });
  const now = useNow(1_000);
  const data = j.data;
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

  // The card: one tap, final; the row collapses at once (QA slice 2 M1). Answered on the arrival
  // modal, its outcome stays there; answered on the way, the modal's body line says it.
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
      else void navigate({ to: '/city/$cityId', params: { cityId: l.cityId } });
    },
    onError: () => setClosing(false),
  });
  const onContinue = () => {
    if (closing || !data) return;
    setClosing(true);
    close.mutate({ journeyId: data.id });
  };

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

  if (j.isError) {
    return (
      <p role="alert" className="p-4 font-body text-paper">
        The journey could not be loaded. Check your connection and try again.
      </p>
    );
  }
  if (!data) {
    return (
      <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
        Finding your seat…
      </p>
    );
  }
  const card = data.card;
  return (
    <div className="min-h-full bg-ink">
      <article className="paper-grain mx-auto flex min-h-full max-w-[640px] flex-col gap-3 px-4 pt-4 pb-8 text-ink lg:pb-[132px]" data-testid="journey">
        <header className="flex flex-col gap-1">
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
        <p className="border-y border-ink py-2 font-body text-[15px] leading-snug italic" data-testid="journey-sentence">
          {copy.travel.youCanClose}
        </p>
        {card && !arrived && (
          <JourneyCard card={card} onChoose={onChoose} pendingChoiceId={choose.isPending ? (choose.variables?.choiceId ?? null) : null} />
        )}
        {choose.error && !arrived && (
          <p role="status" className="font-body text-[13px] text-collective">
            {noticeFor(choose.error)}
          </p>
        )}
        {data.others > 0 && (
          <p className="font-mono text-[11.5px] text-muted" data-testid="journey-others">
            {copy.travel.others(data.others)}
          </p>
        )}
        <section aria-label={copy.travel.whileYouRide} className="flex flex-col">
          <div className="label-caps border-t-[3px] border-b border-double border-ink py-1.5 text-[11px] font-semibold">
            {copy.travel.whileYouRide}
          </div>
          <Link
            to="/paper"
            className="flex min-h-14 items-center justify-between gap-3 border-b border-dotted border-faint py-2 hover:bg-paper-card"
            data-testid="journey-paper"
          >
            <span className="font-display text-[18px] font-bold">{copy.travel.readThePaper}</span>
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
      <ResultModal
        result={arrived ? { kind: 'journey', journey: data } : null}
        open={arrived}
        onOpenChange={(o) => {
          if (!o) onContinue();
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
