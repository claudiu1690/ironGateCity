import { copy } from '@irongate/content/copy';
import { FACTION_TABS, FactionHeader, FactionTabs } from '@irongate/ui';
import type { FactionTab } from '@irongate/ui';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect } from 'react';
import { ChatTab } from '../features/faction/ChatTab';
import { EventsTab } from '../features/faction/EventsTab';
import { MembersTab } from '../features/faction/MembersTab';
import { OrdersTab } from '../features/faction/OrdersTab';
import { ScoreboardTab } from '../features/faction/ScoreboardTab';
import { useCharacter } from '../features/game/hooks';
import { trpc } from '../lib/trpc';
import { useMinWidth } from '../lib/useNow';

export interface FactionSearch {
  /** The open part; absent: the one last used this session, else Events (screens §2). */
  tab?: FactionTab;
}

const TAB_KEY = 'irongate.factionTab';

export function validateFactionSearch(search: Record<string, unknown>): FactionSearch {
  return typeof search.tab === 'string' && (FACTION_TABS as readonly string[]).includes(search.tab)
    ? { tab: search.tab as FactionTab }
    : {};
}

/** The part last used in this session (screens §2: the first visit opens Events). */
export function lastFactionTab(): FactionTab {
  try {
    const t = sessionStorage.getItem(TAB_KEY);
    if (t && (FACTION_TABS as readonly string[]).includes(t)) return t as FactionTab;
  } catch {
    // Storage blocked: the default.
  }
  return 'events';
}

function rememberTab(tab: FactionTab) {
  try {
    sessionStorage.setItem(TAB_KEY, tab);
  } catch {
    // Storage blocked: nothing remembered.
  }
}

/**
 * Slice 6 (screens §2, tech design §12.1), redrawn for review 7 #1 as direction A, *The Branch
 * Office*: paper from the HUD down. The HQ scene as a plate with *{City} branch · {n} here now*, the
 * crest as a seal over its edge, the name and *{rank} · {n} members* on paper; then the five parts as
 * a ruled strip (sticky; the plate scrolls away), and the open part. On Chat (phone) the header folds
 * to the compact letterhead. On a desktop (≥ 1024) the strip's four cells sit left-aligned over the
 * left column and Chat is the right-hand column under *The room*.
 */
export function FactionPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/app/faction' });
  const tab = search.tab ?? lastFactionTab();
  const wide = useMinWidth(1024);
  const { character } = useCharacter();
  const hq = useQuery(trpc.faction.hq.queryOptions());

  useEffect(() => rememberTab(tab), [tab]);

  const go = (t: FactionTab) => void navigate({ to: '/faction', search: { tab: t }, replace: true });
  const chatHidden = !!character?.chat?.hidden;
  // Screens §10: on a desktop Chat is the right-hand column (four chips); with chat hidden from Me
  // there is no Chat chip at all. Either way the left keeps another part.
  const tabs = FACTION_TABS.filter((t) => t !== 'chat' || (!wide && !chatHidden));
  const left: FactionTab = tab === 'chat' && (wide || chatHidden) ? 'events' : tab;

  const body = (t: FactionTab) => {
    switch (t) {
      case 'orders':
        return <OrdersTab />;
      case 'events':
        return <EventsTab />;
      case 'members':
        return <MembersTab />;
      case 'scoreboard':
        return <ScoreboardTab />;
      case 'chat':
        return <ChatTab />;
    }
  };

  const h = hq.data;
  const factionId = h?.faction.id ?? character?.factionId;
  const name = h?.faction.name ?? character?.factionName ?? copy.together.tabs.faction;
  const header = factionId && (
    <FactionHeader
      factionId={factionId}
      name={name}
      plate={h?.plate ?? null}
      plateLine={h ? copy.together.plateLine(h.branch.name, h.hereNow) : undefined}
      line={h ? copy.together.letterhead(h.rankTitle, h.members) : undefined}
      compact={left === 'chat'}
    />
  );
  const strip = (
    <FactionTabs
      current={left}
      tabs={tabs}
      onGo={go}
      factionId={factionId}
      dots={{ events: (character?.events?.unseen ?? 0) > 0, chat: !!character?.chat?.forYou }}
      className="sticky top-0 z-10"
    />
  );
  return (
    <div className="flex min-h-full flex-col bg-paper text-ink" data-testid="faction-page">
      <div className="mx-auto flex w-full max-w-[1000px] flex-1 flex-col">
        {header}
        {wide ? (
          <div className="flex w-full flex-1 items-stretch">
            <div className="min-w-0 flex-1">
              {strip}
              {body(left)}
            </div>
            {!character?.chat?.hidden && (
              <aside className="w-[360px] shrink-0 border-l-[1.5px] border-ink" aria-label={copy.together.tabs.chat}>
                <ChatTab column />
              </aside>
            )}
          </div>
        ) : (
          <>
            {strip}
            <div className="flex-1">{body(left)}</div>
          </>
        )}
      </div>
    </div>
  );
}
