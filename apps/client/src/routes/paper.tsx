import { copy } from '@irongate/content/copy';
import {
  Button,
  DeskList,
  FrontPage,
  LettersRow,
  Masthead,
  OrdersList,
  PollingDayRow,
  renderTimeTokens,
} from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { trpc } from '../lib/trpc';

/**
 * The Morning Paper (§3.3 v2, mockup MobilePaper): masthead, headlines (the first as the lead),
 * Party orders, Letters, Your desk. Opening it marks today's edition read; one tap goes to the
 * city (the first edition opens the first pin's sheet, §7.5).
 */
export function PaperPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const paper = useQuery({ ...trpc.paper.today.queryOptions(), refetchOnWindowFocus: false });
  const markRead = useMutation({
    ...trpc.paper.markRead.mutationOptions(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: trpc.character.me.queryKey() }),
  });
  const character = queryClient.getQueryData(trpc.character.me.queryKey());
  const marked = useRef<number | null>(null);
  const day = paper.data?.day;
  useEffect(() => {
    if (day === undefined || marked.current === day) return;
    marked.current = day;
    markRead.mutate({ day });
  }, [day, markRead]);

  const toCity = async () => {
    const landing = paper.data?.landing;
    if (landing) {
      await navigate({
        to: '/city/$cityId',
        params: { cityId: landing.cityId },
        search: { loc: landing.locationId },
      });
      return;
    }
    const me = await queryClient.fetchQuery(trpc.character.me.queryOptions());
    await navigate({ to: '/city/$cityId', params: { cityId: me.cityId } });
  };

  if (paper.isError) {
    return (
      <div className="p-4 text-paper">
        <p role="alert">The paper could not be loaded.</p>
        <Button variant="outline-light" className="mt-3" onClick={() => void paper.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!paper.data) {
    return (
      <p className="label-caps py-10 text-center text-[12px] text-dim" role="status">
        The paper is on its way…
      </p>
    );
  }
  const p = paper.data;
  // Slice 3 (ADR 0023): `{until}` in a political headline, in the player's clock.
  const headlines = p.headlines.map((h) => ({
    ...h,
    headline: renderTimeTokens(h.headline, { until: h.until }),
    ...(h.deck ? { deck: renderTimeTokens(h.deck, { until: h.until }) } : {}),
  }));
  const [lead, ...rest] = headlines;
  const front = p.frontPage;

  return (
    <article className="paper-grain min-h-full text-ink">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-4 pb-8 lg:pb-[132px]">
        <Masthead paper={p} />
        {/* Slice 3 (screens §2.2): the front page the morning a seat is won. */}
        {front && <FrontPage front={front} factionId={character?.factionId ?? 'collective'} />}
        {lead && (
          <section className="flex flex-col gap-2 border-b border-ink pb-3" data-testid="headline">
            <h2 className="text-center font-display text-[30px] leading-[1.05] font-black sm:text-[36px]">
              {lead.headline}
            </h2>
            {lead.deck && (
              <p className="text-center font-display text-[16px] leading-snug font-bold text-text-2 italic">
                {lead.deck}
              </p>
            )}
          </section>
        )}
        {rest.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {rest.map((h) => (
              <section
                key={h.headline}
                className="flex flex-col gap-1 border-b border-dotted border-faint pb-2"
                data-testid="headline"
              >
                <h3 className="font-display text-[19px] leading-tight font-bold">{h.headline}</h3>
                {h.deck && <p className="font-body text-[14px] leading-snug text-text-2">{h.deck}</p>}
              </section>
            ))}
          </div>
        )}
        <OrdersList orders={p.orders} variant="paper" />
        {p.pollingDay && (
          <PollingDayRow summary={p.pollingDay} onOpen={(route) => void navigate({ to: route })} />
        )}
        {p.letters.map((l) => (
          <LettersRow
            key={`${l.kind}-${l.title}`}
            letter={l}
            onOpen={() => void navigate({ to: '/story/ambition', search: { from: '/paper' } })}
          />
        ))}
        <DeskList desk={p.desk} />
        {/* Sticky, so "To the city" is on the first screen (§12.3). On wide screens it rides above
            the floating tab dock (QA n1), and the page's bottom padding lets the Letters row and the
            desk scroll clear of both. */}
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-track bg-paper px-4 pt-2 pb-2 lg:bottom-[124px] lg:mx-0 lg:border lg:border-ink lg:p-2 lg:shadow-[0_8px_24px_rgb(0_0_0/0.35)]">
          {front ? (
            <Button onClick={() => void navigate({ to: '/council' })} className="w-full">
              {copy.toTheCouncil}
            </Button>
          ) : (
            <Button onClick={() => void toCity()} className="w-full">
              {copy.toTheCity}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
