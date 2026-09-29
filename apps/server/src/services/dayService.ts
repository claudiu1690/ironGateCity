import type { GameContent } from '@irongate/content';
import { Character, City, PaperEntry, isDuplicateKeyError } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { dayKey, jobPay, settleDays, startOrders } from '@irongate/rules';
import { gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { getOrCreateCharacter } from './characterService';
import { buildEdition } from './edition';
import { MAX_ATTEMPTS, VersionConflict, inTransaction } from './txn';
import { energyState, fromOrdersState } from './views';

/**
 * ADR 0005: settle every City Day boundary crossed since `day.settled`, on first touch, in one
 * transaction: salary, streak and sick days, the tally, today's Party orders and today's paper.
 * Does nothing (and writes nothing) when the character is already settled for today. Concurrent
 * first touches are resolved by the version guard and the unique paperEntries index.
 */
export async function ensureSettled(
  content: GameContent,
  c0: CharacterDoc,
  now: number,
): Promise<CharacterDoc> {
  const today = dayKey(now);
  if (c0.day.settled === today) return c0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await inTransaction(async (session) => {
        const c = await Character.findById(c0._id).session(session).lean<CharacterDoc>();
        if (!c) throw new Error(`character ${c0._id.toHexString()} disappeared`);
        if (c.day.settled !== null && c.day.settled >= today) return c; // someone settled first

        const contentJob = c.job ? content.job(c.job.id) : undefined;
        const s = settleDays({
          settled: c.day.settled,
          today,
          job: c.job,
          pay: contentJob ? jobPay(contentJob, c.factionId) : null,
          sickDays: c.sickDays,
          tally: c.today,
          energy: energyState(c),
          now,
        });
        if (!s) return c;

        const previous = await PaperEntry.findOne(
          { characterId: c._id, day: { $lt: today } },
          { day: 1, snapshot: 1 },
        )
          .sort({ day: -1 })
          .session(session)
          .lean();
        const home = await City.findById(c.homeCityId, { opinion: 1 }).session(session).lean();
        const orders = startOrders(content.ordersOf(c.factionId), today, s.job !== null);
        const edition = buildEdition({
          content,
          character: c,
          settlement: s,
          previous,
          home,
          today,
          ordersToday: orders,
        });

        const updated = await Character.findOneAndUpdate(
          { _id: c._id, version: c.version, 'day.settled': c.day.settled },
          {
            $set: {
              'day.settled': today,
              job: s.job,
              sickDays: s.sickDays,
              today: s.today,
              orders: fromOrdersState(orders),
            },
            $inc: { iron: s.salary?.total ?? 0, version: 1 },
          },
          { session, returnDocument: 'after', lean: true },
        );
        if (!updated) throw new VersionConflict();
        await PaperEntry.create([edition], { session });
        return updated;
      });
    } catch (err) {
      if (err instanceof VersionConflict || isDuplicateKeyError(err)) continue;
      throw err;
    }
  }
  // Someone else kept winning: their settlement is as good as ours.
  const fresh = await Character.findById(c0._id).lean<CharacterDoc>();
  if (fresh && fresh.day.settled === today) return fresh;
  throw gameError('CONFLICT', 'ACTION_CONFLICT', { attempts: MAX_ATTEMPTS });
}

export interface LoadedCharacter {
  doc: CharacterDoc;
  /** Today's edition `readAt` (null while unread), for `paperDue`. */
  editionReadAt: number | null;
}

/** Every character-scoped procedure starts here: get-or-create, then settle the City Day. */
export async function loadCharacter(
  user: SessionUser,
  content: GameContent,
  now: number,
): Promise<LoadedCharacter> {
  const doc = await ensureSettled(content, await getOrCreateCharacter(user, content, now), now);
  return { doc, editionReadAt: await editionReadAt(doc, now) };
}

export async function editionReadAt(doc: CharacterDoc, now: number): Promise<number | null> {
  const entry = await PaperEntry.findOne({ characterId: doc._id, day: dayKey(now) }, { readAt: 1 }).lean();
  return entry?.readAt ? entry.readAt.getTime() : null;
}
