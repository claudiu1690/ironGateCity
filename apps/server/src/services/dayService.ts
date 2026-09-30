import type { GameContent } from '@irongate/content';
import { Candidacy, Character, City, OfficeTerm, PaperEntry, isDuplicateKeyError } from '@irongate/db';
import type { CandidacyDoc, CharacterDoc, CityDoc, OfficeTermDoc, PaperEntryDoc } from '@irongate/db';
import {
  COUNCIL,
  RESTED,
  applyGains,
  dayKey,
  dayStart,
  effect,
  halfPay,
  jobPay,
  jobPayWith,
  projectEnergyThrough,
  settleDays,
  shiftStreakStep,
  startOrders,
  stipendBoundaries,
} from '@irongate/rules';
import { gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureCityDay } from './cityDay';
import { buildEdition } from './edition';
import type { NewEdition } from './edition';
import { capOn, moraleOf, ordinanceIdOn, ordinanceModifiers } from './modifiers';
import { MAX_ATTEMPTS, VersionConflict, inTransaction } from './txn';
import { energyState, fromOrdersState } from './views';

/** What a settlement writes: the character's `$set` and `$inc`, the edition, the refunds. */
export interface SettlementWrite {
  set: {
    'day.settled': number;
    job: CharacterDoc['job'];
    sickDays: CharacterDoc['sickDays'];
    today: CharacterDoc['today'];
    orders: CharacterDoc['orders'];
    offices: CharacterDoc['offices'];
    xp: number;
    level: number;
    fxp: number;
    rank: number;
    pc: number;
    statPointsPending: number;
    'energy.value'?: number;
    'energy.updatedAt'?: Date;
    rested?: number;
  };
  inc: { iron: number };
  edition: NewEdition;
  /** Candidacies whose deposit this settlement returns (`due` → `returned`). */
  refunds: CandidacyDoc['_id'][];
}

/**
 * The pure middle of a settlement (slice-2 tech design §7.2, slice-3 §8.4): settle the boundaries
 * crossed (each ended day's half pay under that day's ordinance), the councillor's stipend and the
 * deposits returned (ADR 0020), today's offices, the Energy re-base when a Rested cap changed
 * (ADR 0021), today's Party orders (the welcome set on the first City Day, the crisis pair in
 * Unrest) and today's paper. `c` need not be stored yet: the join settles a first day before
 * inserting it. Returns null when there is nothing to settle.
 */
export function computeSettlement(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  read: {
    previous: Pick<PaperEntryDoc, 'day' | 'snapshot'> | null;
    home: CityDoc | Pick<CityDoc, 'opinion'> | null;
    terms?: OfficeTermDoc[];
    due?: CandidacyDoc[];
  },
): SettlementWrite | null {
  const today = dayKey(now);
  const city = read.home && '_id' in read.home ? (read.home as CityDoc) : null;
  const contentJob = c.job ? content.job(c.job.id) : undefined;
  const pay = contentJob ? jobPay(contentJob, c.factionId) : null;
  const caps = capOn(content, city);
  const s = settleDays({
    settled: c.day.settled,
    today,
    job: c.job,
    pay,
    sickDays: c.sickDays,
    tally: c.today,
    energy: energyState(c),
    now,
    halfPayOn:
      pay === null
        ? undefined
        : (ended) => {
            const m = ordinanceModifiers(content, ordinanceIdOn(city, ended));
            return {
              amount: halfPay(jobPayWith(pay, m)),
              label: effect(m, 'jobPayPct') ? (m.ordinance?.name ?? null) : null,
            };
          },
    capOn: caps,
  });
  if (!s) return null;

  // ADR 0020: the stipend for each boundary held since the last settlement, and refunds.
  const terms = read.terms ?? [];
  const due = read.due ?? [];
  const boundaries = stipendBoundaries(terms, c.day.settled, today);
  const stipend = { pc: boundaries * COUNCIL.stipend.pc, fxp: boundaries * COUNCIL.stipend.fxp };
  const refundPc = due.length * COUNCIL.cost.declare;
  const gains = applyGains(
    { xp: c.xp, level: c.level, fxp: c.fxp, rank: c.rank, pc: c.pc, statPointsPending: c.statPointsPending },
    { xp: 0, fxp: stipend.fxp, pc: stipend.pc + refundPc },
  );
  const offices = terms
    .filter((t) => t.fromDay <= today && today < t.toDay)
    .map((t) => ({
      termId: t._id,
      cityId: t.cityId,
      councilKey: t.councilKey,
      seat: t.seat,
      fromDay: t.fromDay,
      toDay: t.toDay,
    }));

  // ADR 0021 §4: re-base stored Energy to the boundary when a day since the last write had a
  // Rested cap other than the base (Rest Day Order); otherwise the lazy projection is exact as is.
  const from = dayKey(c.energy.updatedAt.getTime());
  let rebase = false;
  for (let d = Math.max(from, today - 40); d <= today && !rebase; d++) rebase = caps(d) !== RESTED.cap;
  const rebased = rebase ? projectEnergyThrough(energyState(c), dayStart(today), caps) : null;

  const faction = content.faction(c.factionId);
  const welcome = s.firstEdition ? faction.welcomeOrders : undefined;
  const homeOfFaction = content.city(c.homeCityId)?.homeFactionId === c.factionId;
  const unrest = homeOfFaction && moraleOf(content, city) === 'unrest';
  const orders = startOrders(
    content.ordersOf(c.factionId),
    today,
    s.job !== null,
    welcome,
    unrest ? faction.restoreOrders : undefined,
  );
  const edition = buildEdition({
    content,
    character: c,
    settlement: s,
    previous: read.previous,
    home: read.home,
    today,
    ordersToday: orders,
    stipend:
      boundaries > 0
        ? {
            boundaries,
            ...stipend,
            cityName: content.city(terms[0]?.cityId ?? c.homeCityId)?.name ?? '',
          }
        : null,
    deposits: due.length > 0 ? { count: due.length, pc: refundPc } : null,
    streakStepYesterday: shiftStreakStep(ordinanceModifiers(content, ordinanceIdOn(city, today - 1))),
  });
  return {
    set: {
      'day.settled': today,
      job: s.job,
      sickDays: s.sickDays,
      today: s.today,
      orders: fromOrdersState(orders),
      offices,
      xp: gains.next.xp,
      level: gains.next.level,
      fxp: gains.next.fxp,
      rank: gains.next.rank,
      pc: gains.next.pc,
      statPointsPending: gains.next.statPointsPending,
      ...(rebased
        ? {
            'energy.value': rebased.value,
            'energy.updatedAt': new Date(rebased.updatedAt),
            rested: rebased.rested,
          }
        : {}),
    },
    inc: { iron: s.salary?.total ?? 0 },
    edition,
    refunds: due.map((d) => d._id),
  };
}

/**
 * ADR 0005: settle every City Day boundary crossed since `day.settled`, on first touch, in one
 * transaction: salary, streak and sick days, the tally, the stipend and refunds, today's Party
 * orders and today's paper. ADR 0017: the home city's day is settled first, so no character acts
 * on day d before its city has been settled for d. Does nothing when already settled for today.
 * Concurrent first touches are resolved by the version guard and the unique paperEntries index.
 */
export async function ensureSettled(
  content: GameContent,
  c0: CharacterDoc,
  now: number,
  city?: CityDoc | null,
): Promise<CharacterDoc> {
  const today = dayKey(now);
  if (c0.day.settled === today) return c0;
  if (city === undefined) await ensureCityDay(content, c0.homeCityId, now);

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
        const home = await City.findById(c.homeCityId).session(session).lean<CityDoc>();
        const terms =
          c.day.settled === null
            ? []
            : await OfficeTerm.find({
                'holder.kind': 'player',
                'holder.characterId': c._id,
                toDay: { $gt: c.day.settled },
              })
                .session(session)
                .lean<OfficeTermDoc[]>();
        const due = await Candidacy.find({ characterId: c._id, deposit: 'due' })
          .session(session)
          .lean<CandidacyDoc[]>();
        const w = computeSettlement(content, c, now, { previous, home, terms, due });
        if (!w) return c;

        const updated = await Character.findOneAndUpdate(
          { _id: c._id, version: c.version, 'day.settled': c.day.settled },
          { $set: w.set, $inc: { iron: w.inc.iron, version: 1 } },
          { session, returnDocument: 'after', lean: true },
        );
        if (!updated) throw new VersionConflict();
        if (w.refunds.length > 0) {
          await Candidacy.updateMany(
            { _id: { $in: w.refunds }, deposit: 'due' },
            { $set: { deposit: 'returned' } },
            { session },
          );
        }
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
  /** The home city after its day was settled (ADR 0017): the ordinance, morale, the council. */
  city: CityDoc | null;
}

/**
 * Every character-scoped procedure starts here: find the character, settle the home city's day,
 * then the character's (ADR 0017's ordering). No auto-create (ADR 0011): a user without a
 * character is still arriving.
 */
export async function loadCharacter(
  user: SessionUser,
  content: GameContent,
  now: number,
): Promise<LoadedCharacter> {
  const found = await Character.findOne({ userId: user.id }).lean<CharacterDoc>();
  if (!found) throw gameError('PRECONDITION_FAILED', 'ARRIVAL_PENDING');
  const city = await ensureCityDay(content, found.homeCityId, now);
  const doc = await ensureSettled(content, found, now, city);
  return { doc, editionReadAt: await editionReadAt(doc, now), city };
}

export async function editionReadAt(doc: CharacterDoc, now: number): Promise<number | null> {
  const entry = await PaperEntry.findOne({ characterId: doc._id, day: dayKey(now) }, { readAt: 1 }).lean();
  return entry?.readAt ? entry.readAt.getTime() : null;
}
