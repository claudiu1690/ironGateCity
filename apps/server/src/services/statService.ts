import type { GameContent } from '@irongate/content';
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import type { CharacterView, StatPointTarget } from '@irongate/rules';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureSettled, loadCharacter } from './dayService';
import { withRequestKey } from './requestKey';
import { VersionConflict } from './txn';
import { toCharacterView } from './views';

/** §5.3, tech design §7.6: place one waiting stat point on STR, INT or AGI (review 1), one tap per point. */
export async function placeStatPoint(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { stat: StatPointTarget; idempotencyKey: string };
}): Promise<CharacterView> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey({
    characterId: loaded.doc._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'stat.place',
    input: { stat: input.stat },
    resettle: async () => {
      const fresh = await Character.findById(loaded.doc._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.statPointsPending < 1) throw new GameError('NO_STAT_POINTS', { statPointsPending: 0 });
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, statPointsPending: { $gte: 1 } },
        { $inc: { [`stats.${input.stat}`]: 1, statPointsPending: -1, version: 1 } },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      return toCharacterView(updated, now, content, loaded.editionReadAt);
    },
  });
}
