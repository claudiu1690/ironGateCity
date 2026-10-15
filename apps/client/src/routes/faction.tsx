import { copy } from '@irongate/content/copy';
import { FACTION_TABS, FactionTabs, artUrl } from '@irongate/ui';
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
  return (
    <div className="flex min-h-full flex-col bg-paper text-ink" data-testid="faction-page">
      <header className="relative flex shrink-0 items-center bg-ink px-4 py-3 text-paper">
        <div className="mx-auto flex w-full max-w-[1000px] items-center gap-3">
          {/* The faction's crest (content's `crest.{faction}` SVG, ADR 0015), on paper so it reads on ink. */}
          {character && (
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-paper p-1.5">
              <img
                src={artUrl(`crest.${character.factionId}`, 0, 'svg')}
                alt={h?.faction.name ?? character.factionName}
                className="size-full object-contain"
                data-testid="faction-crest"
              />
            </span>
          )}
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
        current={left}
        tabs={tabs}
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
        <div className="flex-1">{body(left)}</div>
      )}
    </div>
  );
}
