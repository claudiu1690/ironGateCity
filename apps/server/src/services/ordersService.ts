import type { GameContent } from '@irongate/content';
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { dayKey } from '@irongate/rules';
import type { CharacterView } from '@irongate/rules';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { toCharacterView } from './views';

/**
 * Review 1 (GDD §13.7): the orders-complete note was seen (*Carry on*). A conditional update to a
 * target state (ADR 0008): setting today's day twice is the same write, so no key is needed. It
 * touches no game number, so it takes no version.
 */
export async function seeOrdersNote(deps: {
  user: SessionUser;
  content: GameContent;
  now: number;
}): Promise<CharacterView> {
  const loaded = await loadCharacter(deps.user, deps.content, deps.now);
  const today = dayKey(deps.now);
  const updated = await Character.findOneAndUpdate(
    { _id: loaded.doc._id },
    { $set: { ordersNoteSeenDay: today } },
    { returnDocument: 'after', lean: true },
  );
  return toCharacterView(
    updated ?? (loaded.doc as CharacterDoc),
    deps.now,
    deps.content,
    loaded.editionReadAt,
    {
      city: loaded.city,
    },
  );
}
