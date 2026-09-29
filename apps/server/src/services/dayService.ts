import type { GameContent } from '@irongate/content';
import { Character, City, PaperEntry, isDuplicateKeyError } from '@irongate/db';
import type { CharacterDoc, CityDoc, PaperEntryDoc } from '@irongate/db';
import { dayKey, jobPay, settleDays, startOrders } from '@irongate/rules';
import { gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { buildEdition } from './edition';
import type { NewEdition } from './edition';
import { MAX_ATTEMPTS, VersionConflict, inTransaction } from './txn';
import { energyState, fromOrdersState } from './views';

/** What a settlement writes: the character's `$set` and `$inc`, and the edition to insert. */
export interface SettlementWrite {
  set: {
    'day.settled': number;
    job: CharacterDoc['job'];
    sickDays: CharacterDoc['sickDays'];
    today: CharacterDoc['today'];
    orders: CharacterDoc['orders'];
  };
  inc: { iron: number };
  edition: NewEdition;
}

/**
 * The pure middle of a settlement (slice-2 tech design §7.2): settle the boundaries crossed, start
 * today's Party orders (the welcome set on the first City Day, ADR 0012) and set today's paper.
 * `c` need not be stored yet: the join settles a character's first day before inserting it.
 * Returns null when there is nothing to settle.
 */
export function computeSettlement(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  read: { previous: Pick<PaperEntryDoc, 'day' | 'snapshot'> | null; home: Pick<CityDoc, 'opinion'> | null },
): SettlementWrite | null {
  const today = dayKey(now);
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
  if (!s) return null;
  const welcome = s.firstEdition ? content.faction(c.factionId).welcomeOrders : undefined;
  const orders = startOrders(content.ordersOf(c.factionId), today, s.job !== null, welcome);
  const edition = buildEdition({
    content,
    character: c,
    settlement: s,
    previous: read.previous,
    home: read.home,
    today,
    ordersToday: orders,
  });
  return {
    set: {
      'day.settled': today,
      job: s.job,
      sickDays: s.sickDays,
      today: s.today,
      orders: fromOrdersState(orders),
    },
    inc: { iron: s.salary?.total ?? 0 },
    edition,
  };
}

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

        const previous = await PaperEntry.findOne(
          { characterId: c._id, day: { $lt: today } },
          { day: 1, snapshot: 1 },
        )
          .sort({ day: -1 })
          .session(session)
          .lean();
        const home = await City.findById(c.homeCityId, { opinion: 1 }).session(session).lean();
        const w = computeSettlement(content, c, now, { previous, home });
        if (!w) return c;

        const updated = await Character.findOneAndUpdate(
          { _id: c._id, version: c.version, 'day.settled': c.day.settled },
          { $set: w.set, $inc: { iron: w.inc.iron, version: 1 } },
          { session, returnDocument: 'after', lean: true },
        );
        if (!updated) throw new VersionConflict();
        await PaperEntry.create([w.edition], { session });
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

/**
 * Every character-scoped procedure starts here: find the character, then settle the City Day.
 * There is no auto-create any more (ADR 0011): a user without a character is still arriving.
 */
export async function loadCharacter(
  user: SessionUser,
  content: GameContent,
  now: number,
): Promise<LoadedCharacter> {
  const found = await Character.findOne({ userId: user.id }).lean<CharacterDoc>();
  if (!found) throw gameError('PRECONDITION_FAILED', 'ARRIVAL_PENDING');
  const doc = await ensureSettled(content, found, now);
  return { doc, editionReadAt: await editionReadAt(doc, now) };
}

export async function editionReadAt(doc: CharacterDoc, now: number): Promise<number | null> {
  const entry = await PaperEntry.findOne({ characterId: doc._id, day: dayKey(now) }, { readAt: 1 }).lean();
  return entry?.readAt ? entry.readAt.getTime() : null;
}
