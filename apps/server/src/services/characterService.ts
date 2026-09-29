import type { GameContent } from '@irongate/content';
import { Character, isDuplicateKeyError } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { ENERGY, projectEnergy } from '@irongate/rules';
import type { CharacterView, Stats } from '@irongate/rules';
import type { SessionUser } from '../trpc/context';

const NAME_MAX = 60;

/** The auto-created character (slice 0): the content's starting character in its faction's home city. */
export function characterDefaults(name: string, content: GameContent, now: number) {
  const start = content.startingCharacter;
  const faction = content.faction(start.factionId);
  const at = new Date(now);
  return {
    name: name.trim().slice(0, NAME_MAX) || 'Comrade',
    factionId: start.factionId,
    homeCityId: faction.homeCityId,
    cityId: faction.homeCityId,
    stats: { ...start.stats },
    energy: { value: ENERGY.max, updatedAt: at },
    rested: 0,
    xp: 0,
    level: 1,
    fxp: 0,
    iron: 0,
    version: 0,
    createdAt: at,
    updatedAt: at,
  };
}

/**
 * Get the user's character, creating it on first call. `$setOnInsert` only, so reading an existing
 * character never writes (lazy timers are projected, not stored).
 */
export async function getOrCreateCharacter(
  user: SessionUser,
  content: GameContent,
  now: number,
): Promise<CharacterDoc> {
  const upsert = () =>
    Character.findOneAndUpdate(
      { userId: user.id },
      { $setOnInsert: { userId: user.id, ...characterDefaults(user.name, content, now) } },
      { upsert: true, returnDocument: 'after', timestamps: false, lean: true },
    );
  try {
    const doc = await upsert();
    if (!doc) throw new Error('character upsert returned nothing');
    return doc;
  } catch (err) {
    // Two first calls racing on the unique userId index: the loser reads the winner's document.
    if (!isDuplicateKeyError(err)) throw err;
    const doc = await Character.findOne({ userId: user.id }).lean();
    if (!doc) throw err;
    return doc;
  }
}

/** Stats as a check sees them: CHA is worn (slice 0: chaBase stands in for it). */
export function wornStats(doc: Pick<CharacterDoc, 'stats'>): Stats {
  return { str: doc.stats.str, int: doc.stats.int, agi: doc.stats.agi, cha: doc.stats.chaBase };
}

/** The HUD view: lazy Energy and Rested projected to `now`. */
export function toCharacterView(doc: CharacterDoc, now: number, content: GameContent): CharacterView {
  const energy = projectEnergy(
    { value: doc.energy.value, rested: doc.rested, updatedAt: doc.energy.updatedAt.getTime() },
    now,
  );
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    factionId: doc.factionId,
    factionName: content.faction(doc.factionId).shortName,
    homeCityId: doc.homeCityId,
    cityId: doc.cityId,
    stats: wornStats(doc),
    energy: {
      value: energy.value,
      max: energy.max,
      updatedAt: energy.updatedAt,
      nextTickAt: energy.nextTickAt,
      fullAt: energy.fullAt,
    },
    rested: energy.rested,
    xp: doc.xp,
    level: doc.level,
    fxp: doc.fxp,
    iron: doc.iron,
    version: doc.version,
  };
}
