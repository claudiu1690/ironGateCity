import type { GameContent } from '@irongate/content';
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import type { CharacterView } from '@irongate/rules';
import { gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { toCharacterView } from './views';

/**
 * §7.3: the face can be changed on the Me tab at any time, free. A cosmetic value: a conditional
 * update to a target state (last write wins; the same value twice is a no-op), ADR 0008. It is not
 * game state, so it does not bump the version guard.
 */
export async function setAvatar(
  user: SessionUser,
  content: GameContent,
  now: number,
  avatarId: string,
): Promise<CharacterView> {
  if (!content.avatars.includes(avatarId)) throw gameError('BAD_REQUEST', 'UNKNOWN_AVATAR', { avatarId });
  const { doc, editionReadAt } = await loadCharacter(user, content, now);
  const updated = await Character.findOneAndUpdate(
    { _id: doc._id },
    { $set: { avatarId } },
    { returnDocument: 'after', lean: true },
  );
  return toCharacterView((updated ?? doc) as CharacterDoc, now, content, editionReadAt);
}
