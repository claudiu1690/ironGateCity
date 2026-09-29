import type { GameContent } from '@irongate/content';
import { Character, isDuplicateKeyError } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { ENERGY, JOBS, emptyTally } from '@irongate/rules';
import type { SessionUser } from '../trpc/context';

const NAME_MAX = 60;

/**
 * The auto-created character: the content's starting character in its faction's home city.
 * `day.settled: null` makes the first touch settle the first City Day and print the first edition.
 */
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
    statPointsPending: 0,
    rank: 1,
    pc: 0,
    localStanding: [],
    job: null,
    sickDays: { week: 0, left: JOBS.sickDaysPerWeek },
    day: { settled: null },
    orders: { day: 0, items: [], allDoneAt: null },
    today: emptyTally(null),
    lastActionAt: null,
    version: 0,
    createdAt: at,
    updatedAt: at,
  };
}

/**
 * Get the user's character, creating it on first call. `$setOnInsert` only, so reading an existing
 * character never writes here (the City Day settlement is the one write a read can cause, ADR 0005).
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
