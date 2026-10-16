import type { GameContent } from '@irongate/content';
import { Character, Journey } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { PRESENCE, hereNowLine, visibleTo } from '@irongate/rules';
import type { FactionId, HereNowView } from '@irongate/rules';
import type { SessionUser } from '../trpc/context';
import { gameError } from '../gameError';
import { loadCharacter } from './dayService';

/**
 * Slice 6 (ADR 0040; tech design §6.3, §8.2): presence. `presence { locationId, seenAt }` on the
 * character, touched by the read path at most once a minute and by `presence.at` when a sheet opens.
 * Neither write bumps `version`: presence is not a game number, so an action racing a touch still
 * commits (its own guard is the version, which the touch leaves alone).
 */

/**
 * The read path's step 8: `seenAt = now` when older than a minute (no version bump). Slice 8 (tech
 * design §7.1, ADR 0052): with it `presence.recognised`, recognition above 0 on rival ground now (a
 * change of it writes at once, so taking the coat off hides the visitor again on the next read).
 */
export async function touchPresence(c: CharacterDoc, now: number, recognised = false): Promise<CharacterDoc> {
  const seen = c.presence?.seenAt ? new Date(c.presence.seenAt).getTime() : null;
  const was = c.presence?.recognised === true;
  if (seen !== null && now - seen < PRESENCE.touchEveryMs && was === recognised) return c;
  if (seen !== null && now - seen < PRESENCE.touchEveryMs) {
    await Character.updateOne({ _id: c._id }, { $set: { 'presence.recognised': recognised } });
    return { ...c, presence: { locationId: c.presence?.locationId ?? null, seenAt: c.presence?.seenAt ?? null, recognised } };
  }
  const at = new Date(now);
  await Character.updateOne(
    {
      _id: c._id,
      $or: [
        { presence: { $exists: false } },
        { 'presence.seenAt': null },
        { 'presence.seenAt': { $lt: new Date(now - PRESENCE.touchEveryMs) } },
      ],
    },
    { $set: { 'presence.seenAt': at, 'presence.recognised': recognised } },
  );
  return { ...c, presence: { locationId: c.presence?.locationId ?? null, seenAt: at, recognised } };
}

/** The home faction of the city a location (or city) is in; null in the capital. */
function homeOfLocation(content: GameContent, locationId: string): { cityId: string; home: FactionId | null } | null {
  const loc = content.location(locationId);
  if (!loc) return null;
  const city = content.city(loc.city.id);
  return { cityId: loc.city.id, home: (city?.homeFactionId ?? null) as FactionId | null };
}

/**
 * *Here now* at a location for a viewer (ADR 0040): own faction by name, the others as a count, a
 * visitor on rival ground invisible to all but their own faction (`visibleTo`).
 */
export async function hereNowAt(
  content: GameContent,
  viewer: Pick<CharacterDoc, '_id' | 'factionId'>,
  locationId: string,
  now: number,
): Promise<HereNowView> {
  const place = homeOfLocation(content, locationId);
  const rows = await Character.find(
    { 'presence.locationId': locationId, 'presence.seenAt': { $gte: new Date(now - PRESENCE.hereNowMs) } },
    { _id: 1, name: 1, factionId: 1, 'presence.recognised': 1 },
  )
    .limit(200)
    .lean();
  const mine: Array<{ id: string; name: string }> = [];
  let others = 0;
  for (const r of rows) {
    // Slice 8 (ADR 0052): a recognised visitor on rival ground is counted by the home faction.
    const recognised = r.presence?.recognised === true && place?.home === viewer.factionId;
    if (!recognised && !visibleTo(viewer.factionId, r.factionId, place?.home ?? null)) continue;
    if (r.factionId === viewer.factionId) mine.push({ id: r._id.toHexString(), name: r.name });
    else others += 1;
  }
  const line = hereNowLine({ me: viewer._id.toHexString(), mine, others });
  return { names: line.names.map((n) => ({ characterId: n.id, name: n.name })), more: line.more, others: line.others, nobody: line.nobody };
}

/** The city plate's *{n} of the {faction} in town now* (own faction, seen in the last ten minutes). */
export async function factionHereCount(
  c: Pick<CharacterDoc, '_id' | 'factionId'>,
  cityId: string,
  now: number,
): Promise<number> {
  return Character.countDocuments({
    factionId: c.factionId,
    cityId,
    'presence.seenAt': { $gte: new Date(now - PRESENCE.hereNowMs) },
    'journey.status': { $ne: 'onTheWay' },
  });
}

/** *You and n others on this train* (ADR 0040): the same leg, boarded within ten minutes. */
export async function fellowsOn(
  c: Pick<CharacterDoc, '_id' | 'journey'>,
): Promise<number | null> {
  const j = c.journey;
  if (!j || j.status !== 'onTheWay') return null;
  const boarded = new Date(j.boardedAt).getTime();
  return Journey.countDocuments({
    characterId: { $ne: c._id },
    from: j.from,
    to: j.to,
    status: 'onTheWay',
    boardedAt: { $gte: new Date(boarded - PRESENCE.trainWindowMs), $lte: new Date(boarded + PRESENCE.trainWindowMs) },
  });
}

/**
 * `presence.at` (tech §8.1): a place's sheet opened. Sets `presence.locationId` and `seenAt`
 * (skipped when unchanged and fresh) and returns the place's *Here now* line. A state write with no
 * key: setting the same place twice is the same write. Only a place in the city the character
 * stands in is recorded (a sheet opened from the map of another city is not being there).
 */
export async function presenceAt(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { locationId: string };
}): Promise<HereNowView> {
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  const place = homeOfLocation(deps.content, deps.input.locationId);
  if (!place) throw gameError('NOT_FOUND', 'UNKNOWN_LOCATION', { locationId: deps.input.locationId });
  const here = place.cityId === doc.cityId && !(doc.journey && doc.journey.status === 'onTheWay');
  if (here) {
    const seen = doc.presence?.seenAt ? new Date(doc.presence.seenAt).getTime() : 0;
    if (doc.presence?.locationId !== deps.input.locationId || now - seen >= PRESENCE.touchEveryMs) {
      await Character.updateOne(
        { _id: doc._id },
        { $set: { 'presence.locationId': deps.input.locationId, 'presence.seenAt': new Date(now) } },
      );
    }
  }
  return hereNowAt(deps.content, doc, deps.input.locationId, now);
}
