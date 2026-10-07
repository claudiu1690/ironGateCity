import { copy } from '@irongate/content/copy';
import type { FactionId, IssueRowView } from '@irongate/rules';
import {
  Button,
  DeskList,
  ElectionCard,
  FrontPage,
  WhatNowCard,
  IssuesSection,
  LettersRow,
  Masthead,
  OrdersList,
  PaperSheet,
  Rosette,
  formatUntil,
  renderTimeTokens,
} from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { trpc } from '../lib/trpc';
import { useNow } from '../lib/useNow';

/**
 * The Morning Paper (§3.3 v2, mockup MobilePaper): masthead, headlines (the first as the lead),
 * Party orders, Letters, Your desk. Opening it marks today's edition read; one tap goes to the
 * city (the first edition opens the first pin's sheet, §7.5).
 */
export function PaperPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const paper = useQuery({ ...trpc.paper.today.queryOptions(), refetchOnWindowFocus: false });
  const now = useNow(60_000);
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
  const names: Partial<Record<FactionId, string>> =
    character?.factionNames ?? (character ? { [character.factionId]: character.factionName } : {});
  /**
   * Slice 4 (screens §7.1): *Where to act*: the Issue's district (or city) with its places listed and
   * marked, when you stand there; else the nation map at that city's card.
   */
  const whereToAct = (row: IssueRowView) => {
    if (!character || character.cityId !== row.cityId) {
      void navigate({ to: '/nation', search: { city: row.cityId } });
      return;
    }
    if (row.districtId)
      void navigate({
        to: '/city/$cityId/$quarterId',
        params: { cityId: row.cityId, quarterId: row.districtId },
        search: { places: true },
      });
    else void navigate({ to: '/city/$cityId', params: { cityId: row.cityId }, search: { places: true } });
  };

  return (
    <PaperSheet>
      <article className="paper-grain min-h-full text-ink">
        <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 pt-4 pb-8 lg:pb-[132px]">
          <Masthead paper={p} />
          {/* Slice 3 (screens §2.2): the front page the morning a seat is won. */}
          {front && <FrontPage front={front} factionId={character?.factionId ?? 'collective'} />}
          {/* Review 4 (answers §10.1): *What now* under the headline, above *To the council*. */}
          {front?.whatNow && (
            <WhatNowCard
              whatNow={front.whatNow}
              hallName={front.whatNow.hall.name}
              onDesk={() =>
                void navigate({
                  to: '/city/$cityId',
                  params: { cityId: front.whatNow!.cityId },
                  search: { loc: front.whatNow!.hall.locationId },
                })
              }
            />
          )}
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
                  data-in-print={h.inPrint || undefined}
                >
                  {/* Slice 4 (screens §7.3): the hero and the reporter's quote are In Print. */}
                  {h.inPrint && (
                    <span className="label-caps text-[10px] font-semibold text-muted" data-testid="in-print">
                      {copy.scoreboard.inPrint}
                    </span>
                  )}
                  <h3 className="flex items-start gap-1.5 font-display text-[19px] leading-tight font-bold">
                    {h.medal && (
                      <span className="mt-1 shrink-0">
                        <Rosette size={16} />
                      </span>
                    )}
                    <span>{h.headline}</span>
                  </h3>
                  {h.deck && <p className="font-body text-[14px] leading-snug text-text-2">{h.deck}</p>}
                </section>
              ))}
            </div>
          )}
          {/* Slice 4 (screens §7.1): the Issues, between the headlines and the Election row. */}
          {p.issues && (
            <IssuesSection
              issues={p.issues}
              names={names}
              settles={formatUntil(p.issues.settlesAt)}
              onWhereToAct={whereToAct}
            />
          )}
          <OrdersList orders={p.orders} variant="paper" />
          {p.pollingDay && (
            <ElectionCard
              summary={p.pollingDay}
              layout="row"
              now={now}
              factionNames={names}
              onOpen={(route) => void navigate({ to: route })}
            />
          )}
          {/* Review 4 (answers §23.2): the local city's election, a Courier line, not actionable. */}
          {p.localElection && (
            <p className="-mt-2 font-mono text-[11.5px] text-text-2" data-testid="local-election">
              {copy.paper.localElection(p.localElection.cityName, p.localElection.phase, formatUntil(p.localElection.until, now))}
            </p>
          )}
          {p.letters.map((l) => (
            <LettersRow
              key={`${l.kind}-${l.title}`}
              letter={l}
              onOpen={() => void navigate({ to: '/story/ambition', search: { from: '/paper' } })}
            />
          ))}
          <DeskList desk={p.desk} onHeld={() => void navigate({ to: '/held' })} />
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
    </PaperSheet>
  );
}
