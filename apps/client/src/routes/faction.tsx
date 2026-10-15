import { copy } from '@irongate/content/copy';
import { FACTION_TABS, FactionCrest, FactionTabs } from '@irongate/ui';
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
 * Slice 6 (screens §2, tech design §12.1): the Faction tab. A header band (crest, the faction's name,
 * *{rank} · {n} members · {m} here now*), the five parts as a strip, and the open part's body. On a
 * desktop (≥ 1024) Chat stays in a column at the right and the strip's Chat opens it there.
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
  // On a desktop Chat is the right-hand column, so the left keeps the last other part.
  const left: FactionTab = wide && tab === 'chat' ? 'events' : tab;

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
  return (
    <div className="flex min-h-full flex-col bg-paper text-ink" data-testid="faction-page">
      <header className="relative flex min-h-[120px] shrink-0 items-end bg-ink px-4 pt-4 pb-3 text-paper">
        <div className="mx-auto flex w-full max-w-[1000px] items-center gap-3">
          {character && <FactionCrest factionId={character.factionId} label={h?.faction.name ?? ''} size={40} />}
          <div className="min-w-0">
            <h1 className="font-display text-[22px] leading-tight font-bold" data-testid="faction-name">
              {h?.faction.name ?? character?.factionName ?? copy.together.tabs.faction}
            </h1>
            {h && (
              <p className="font-mono text-[12px] text-paper-2" data-testid="faction-header-line">
                {copy.together.header(h.rankTitle, h.members, h.hereNow)}
              </p>
            )}
          </div>
        </div>
      </header>
      <FactionTabs
        current={wide && tab === 'chat' ? left : tab}
        onGo={go}
        dots={{ events: (character?.events?.unseen ?? 0) > 0, chat: !!character?.chat?.forYou }}
        className="sticky top-0 z-10"
      />
      {wide ? (
        <div className="mx-auto flex w-full max-w-[1000px] flex-1 items-stretch">
          <div className="min-w-0 flex-1">{body(left)}</div>
          {!character?.chat?.hidden && (
            <aside className="w-[360px] shrink-0 border-l-[1.5px] border-ink" aria-label={copy.together.tabs.chat}>
              <ChatTab column />
            </aside>
          )}
        </div>
      ) : (
        <div className="flex-1">{body(tab)}</div>
      )}
    </div>
  );
}
