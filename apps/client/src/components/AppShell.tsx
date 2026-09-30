import { copy } from '@irongate/content/copy';
import { HudBar, OrdersComplete, TabBar } from '@irongate/ui';
import type { TabId, TabItem } from '@irongate/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { useLayoutEffect, useRef } from 'react';
import { DevPanel } from '../features/dev/DevPanel';
import { useCharacter, usePlaceStat } from '../features/game/hooks';
import { useResultModalOpen } from '../lib/modalGate';
import { trpc } from '../lib/trpc';
import { useMinWidth } from '../lib/useNow';

/**
 * The app shell (tech design §12.1): HUD v2 on top, the tab bar at the bottom (a dock on wide
 * screens), a "paper is in" line when a new edition waits, and the desktop ticker.
 */
export function AppShell() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { character, nextTickIn } = useCharacter();
  const stat = usePlaceStat();
  const wide = useMinWidth(1024);
  const paperDue = !!character?.paperDue && !pathname.startsWith('/paper');
  // The ticker (wide screens) and the "paper is in" banner both need the paper's name.
  const paper = useQuery({ ...trpc.paper.today.queryOptions(), enabled: !!character && (wide || paperDue) });
  // Review 1 (GDD §13.7): the orders-complete note, once the completing result modal is closed; it
  // waits (server-side) until Carry on, so a closed tab shows it on the next open.
  const queryClient = useQueryClient();
  const resultOpen = useResultModalOpen();
  const seen = useMutation({
    ...trpc.character.seeOrdersNote.mutationOptions(),
    onSuccess: (view) => queryClient.setQueryData(trpc.character.me.queryKey(), view),
  });
  const note = character?.orders.complete ?? null;

  // QA m4: one <main> scrolls every screen, so a new screen (another tab, a chapter) opens at its
  // top instead of at the last one's scroll position. A change of search only (a pin's sheet on the
  // city map) keeps it.
  const mainRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [pathname]);

  const active: TabId = pathname.startsWith('/paper') ? 'paper' : pathname.startsWith('/me') ? 'me' : 'map';
  const cityHref = character ? `/city/${character.cityId}` : '/';
  const items: TabItem[] = [
    { id: 'map', label: 'Map', href: cityHref },
    {
      id: 'paper',
      label: 'Paper',
      href: '/paper',
      // Also while an Ambition chapter is ready, the Letter opened or not (onboarding §14.3 n7), and
      // (slice 3) while a ballot or a councillor's ordinance vote is open and not cast.
      dot:
        (!!character?.paperDue ||
          (character?.lettersWaiting ?? 0) > 0 ||
          (character?.politicsWaiting ?? 0) > 0) &&
        active !== 'paper',
    },
    { id: 'dossier', label: 'Dossier', href: '#', disabled: true },
    { id: 'faction', label: 'Faction', href: '#', disabled: true },
    {
      id: 'me',
      label: 'Me',
      href: '/me',
      // Designer answer §13 Q7: a dot until a migrated character picks a face.
      dot: (character?.statPointsPending ?? 0) > 0 || (!!character && character.avatar === null),
    },
  ];

  const slotA = character?.orders.items[0];
  const lead = paper.data?.headlines[0];

  return (
    <div className="flex h-dvh flex-col bg-ink">
      {character ? (
        <HudBar
          character={character}
          nextTickIn={nextTickIn}
          onPlaceStat={stat.place}
          placing={stat.placing}
        />
      ) : (
        <div className="h-[76px] shrink-0 border-b border-ink-2 bg-ink" />
      )}
      {paperDue && paper.data && (
        <Link
          to="/paper"
          className="label-caps flex min-h-11 shrink-0 items-center justify-center bg-paper-2 text-[11px] text-ink underline-offset-2 hover:underline"
          data-testid="paper-banner"
        >
          {copy.paperIsIn(paper.data.paper.shortName)}
        </Link>
      )}
      <main ref={mainRef} className="relative min-h-0 flex-1 overflow-y-auto pb-16 lg:pb-0">
        <Outlet />
      </main>
      {wide && (slotA || lead) && (
        <div className="flex h-[30px] shrink-0 items-center gap-4 overflow-hidden bg-paper px-5 whitespace-nowrap text-ink">
          <span className="label-caps bg-ink px-2 py-0.5 text-[11px] font-semibold text-paper">
            {paper.data?.paper.name ?? 'The paper'}
          </span>
          {slotA && (
            <span className="font-mono text-[13px]">
              Party order: {slotA.title} ({slotA.progress} of {slotA.target})
            </span>
          )}
          {lead && (
            <>
              {/* n10: a neutral middle dot, no faction's mark as punctuation (onboarding §14.3). */}
              <span className="text-dim" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-[13px]">{lead.headline}</span>
            </>
          )}
        </div>
      )}
      <TabBar items={items} active={active} onNavigate={(href) => void navigate({ to: href })} />
      {character && note && (
        <OrdersComplete
          open={!resultOpen}
          note={note}
          factionId={character.factionId}
          name={character.name}
          issuer={character.orders.issuer}
          pending={seen.isPending}
          onCarryOn={() => {
            if (!seen.isPending) seen.mutate();
          }}
        />
      )}
      {/* Memory mode only: renders nothing unless the server has its test hooks on. */}
      <DevPanel />
    </div>
  );
}
