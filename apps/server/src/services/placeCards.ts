import type { GameContent } from '@irongate/content';
import { dayKey } from '@irongate/rules';
import type { BuffsView, MinderView, OutfitId, PlaceLifeCardsView } from '@irongate/rules';
import type { SessionUser } from '../trpc/context';
import { barCard, buffsView, diningCard } from './barService';
import { hireCard, minderView } from './bodyguardService';
import { loadCharacter } from './dayService';
import { gameError } from '../gameError';
import { shopCards } from './shopService';
import { wardrobeView } from './wardrobeService';

/**
 * Slice 8 phase B, lane 1 (tech design §8.3, §24.6): a place's life cards (its shops, the party
 * store's hire card, the bar, the dining room) and the Me tab's life line (worn Charisma and the
 * outfit, *Walking with you*, the buffs). Read with the character; the server decides every state.
 */
type Deps = { user: SessionUser; content: GameContent; now: () => number };

export async function placeCards(deps: Deps, locationId: string): Promise<PlaceLifeCardsView> {
  const now = deps.now();
  if (!deps.content.location(locationId)) throw gameError('NOT_FOUND', 'UNKNOWN_LOCATION', { locationId });
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  const today = dayKey(now);
  return {
    shops: shopCards(deps.content, doc, locationId, today),
    hire: hireCard(deps.content, doc, locationId, today),
    bar: barCard(deps.content, doc, locationId, now, today),
    dining: diningCard(deps.content, doc, locationId, now, today),
  };
}

export interface LifeMeView {
  cha: number;
  outfit: OutfitId | null;
  minder: MinderView | null;
  buffs: BuffsView | null;
}

export async function lifeMe(deps: Deps): Promise<LifeMeView> {
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  const w = wardrobeView(deps.content, doc, now);
  return { cha: w.cha, outfit: w.line.outfit, minder: minderView(deps.content, doc, dayKey(now)), buffs: buffsView(doc, now) };
}
