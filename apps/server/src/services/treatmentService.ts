import { copy } from '@irongate/content/copy';
import type { GameContent } from '@irongate/content';
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { dayKey, healthMax, treat } from '@irongate/rules';
import type { PoliticalResult } from '@irongate/rules';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureSettled, loadCharacter } from './dayService';
import { residenceCityId } from './residence';
import { withRequestKey } from './requestKey';
import { healthDoc, healthTimerOf, notFree } from './risk';
import { DayChanged, VersionConflict } from './txn';
import { placeOpenFor, toCharacterView } from './views';

/**
 * Review 5 (answers §8, GDD §19.1, tech design §6.2): *Get patched up · n Iron* at any infirmary.
 * One Iron a point of Health missing, at least 10, no Energy; Health to its maximum now. The client
 * shows a live price from the Health timer; the server charges its own figure at the tap (which a
 * regen tick can only have lowered). Request-keyed (`withRequestKey`): the same key twice charges once.
 */
export async function treatAt(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { locationId: string; idempotencyKey: string };
}): Promise<PoliticalResult> {
  const { content, input } = deps;
  const located = content.location(input.locationId);
  if (!located || located.location.kind !== 'hospital' || !located.location.treatment)
    throw gameError('NOT_FOUND', 'UNKNOWN_LOCATION', { locationId: input.locationId });
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const carer = located.location.treatment.carer;

  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'character.treat',
    input: { locationId: input.locationId },
    resettle: async () => {
      const fresh = await Character.findById(loaded.doc._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      // §6.2's order: here, open, free, not on a train; then the price.
      if (c.cityId !== located.city.id) throw new GameError('NOT_HERE', { cityId: located.city.id });
      const open = placeOpenFor(content, c, located.location);
      if (!open.open && open.lock) {
        throw new GameError(
          'ACTION_LOCKED',
          open.lock.kind === 'level' ? { lock: 'QUARTER', need: open.lock.level } : { lock: 'EDITION', need: 0 },
        );
      }
      const blocked = notFree(c);
      if (blocked) throw blocked;
      if (c.journey?.status === 'onTheWay')
        throw new GameError('IN_TRANSIT', { arrivesAt: new Date(c.journey.arrivesAt).getTime() });

      const r = treat({ health: healthTimerOf(c), level: c.level, iron: c.iron, now });
      if (!r.ok) {
        if (r.reason === 'FULL_HEALTH') throw new GameError('FULL_HEALTH', { max: healthMax(c.level) });
        // `cost` for the client's *Needs n Iron* wording (CANNOT_PAY's, as the run-in's pay-off).
        throw new GameError('CANNOT_PAY', { why: 'NOT_ENOUGH_IRON', iron: c.iron, cost: r.price });
      }
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: r.price } },
        { $set: { health: healthDoc(r.health) }, $inc: { iron: -r.price, version: 1 } },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();

      const home = content.city(residenceCityId(updated));
      const paper = home?.paper ?? { name: 'The paper', shortName: 'paper' };
      const t = copy.treatment;
      return {
        kind: 'political',
        act: 'treated',
        stamp: { label: t.stamp, tone: 'success' },
        paper: { name: paper.name, shortName: paper.shortName },
        place: { cityId: located.city.id, cityName: located.city.name },
        headline: t.headline,
        body: t.body[carer],
        until: null,
        at: now,
        knockOns: {
          pc: null,
          morale: null,
          backers: null,
          health: { before: r.before, after: r.after, max: healthMax(updated.level) },
          iron: { before: c.iron, after: updated.iron },
        },
        performedAt: new Date(now).toISOString(),
        idempotencyKey: input.idempotencyKey,
        character: toCharacterView(updated, now, content, loaded.editionReadAt, { city: loaded.city }),
        view: { kind: 'place', locationId: located.location.id },
      };
    },
  });
}
