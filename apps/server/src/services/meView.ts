import type { GameContent } from '@irongate/content';
import { dayKey } from '@irongate/rules';
import type { CharacterView } from '@irongate/rules';
import type { SessionUser } from '../trpc/context';
import { meExtras } from './cityService';
import { loadCharacter } from './dayService';
import { politicsWaiting } from './politicsService';
import { toCharacterView } from './views';

/**
 * The caller's full character view, as `character.me` reads it: the City Day settled, the residence
 * city's Rested cap, the politics dot and the Me tab's extras (heroes, the scoreboard). Review 4 #5:
 * a write that hands the client a view to put in the `me` cache returns this one, not a partial view,
 * so nothing on screen goes back a step until the next read.
 */
export async function fullCharacterView(
  user: SessionUser,
  content: GameContent,
  now: number,
): Promise<CharacterView> {
  const { doc, editionReadAt, city } = await loadCharacter(user, content, now);
  const today = dayKey(now);
  const waiting = await politicsWaiting(content, doc, city, now, today);
  const view = toCharacterView(doc, now, content, editionReadAt, { city, politicsWaiting: waiting });
  return { ...view, ...(await meExtras(content, doc, today)) };
}
