import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { ActionLog, Award, Character, City, Encounter, OfficeTerm, PaperEntry, Stay, isDuplicateKeyError } from '@irongate/db';
import type { NationDoc } from '@irongate/db';
import type {
  AwardDoc,
  CharacterDoc,
  CityDoc,
  OfficeTermDoc,
  PaperEntryDoc,
  StayDoc,
  StoredMark,
} from '@irongate/db';
import {
  COUNCIL,
  JOBS,
  RESTED,
  STANDING,
  applyGains,
  dayKey,
  dayStart,
  effects,
  jobPay,
  jobPayWith,
  liveMarks,
  projectEnergyThrough,
  projectHeat,
  seniorityStep,
  settleDays,
  standingView,
  carriedWelcome,
  startOrders,
  stipendBoundaries,
} from '@irongate/rules';
import type { DayKey, RivalGroundState } from '@irongate/rules';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { gameError } from '../gameError';
import { ensureReleased } from './heldService';
import { heatRateOn, heatTimerOf, isRivalGround, marksOf, rivalGroundAt } from './risk';
import { ensureRunInSettled } from './streetService';
import type { SessionUser } from '../trpc/context';
import { ensureCityDay, ensurePlaces } from './cityDay';
import { ensureNationDay } from './nationDay';
import { dueCities, ensureEventsCredited, ensureEventsResolved } from './eventService';
import { touchPresence } from './presenceService';
import { readTogether } from './togetherEdition';
import type { TogetherEdition } from './togetherEdition';
import { jobCityOf, residenceCityId } from './residence';
import { buildEdition, riskEdition } from './edition';
import { ensureArrived } from './journeyArrival';
import type { NewEdition, RiskRead } from './edition';
import { capOn, dayModifiers, moraleOf } from './modifiers';
import { MAX_ATTEMPTS, VersionConflict, inTransaction } from './txn';
import {
  energyState,
  fromOrdersState,
  startableMissions,
  toOrdersState,
  welcomeDayOf,
  welcomeOrderIds,
} from './views';

/** What a settlement writes: the character's `$set` and `$inc`, the edition, the awards. */
export interface SettlementWrite {
  set: {
    'day.settled': number;
    job: CharacterDoc['job'];
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
    /** Slice 5 (tech design §8.4): the record with its faded marks dropped (only when one faded). */
    'record.marks'?: StoredMark[];
  };
  inc: { iron: number };
  edition: NewEdition;
  /** Slice 4 (ADR 0028): the awards this settlement credits (`creditedAt` set once). */
  awards: AwardDoc['_id'][];
}

/**
 * The pure middle of a settlement (slice-2 tech design §7.2, slice-3 §8.4, review 1): settle the
 * boundaries crossed (each ended day's wage under that day's ordinance, seniority, One of Us PC),
 * the councillor's stipend (ADR 0020; the voting rework retired the deposit's refund, migration
 * 009 credited what was left), today's offices, the Energy re-base when a Rested cap changed
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
    /** The residence city (orders, crisis, paper, Rested cap; ADR 0026, 0030). */
    home: CityDoc | Pick<CityDoc, 'opinion'> | null;
    /** Slice 4 (ADR 0030 §6): the job's city, for each ended day's wage; default `home`. */
    jobCity?: CityDoc | null;
    terms?: OfficeTermDoc[];
    /** Slice 4 (ADR 0028): hero and Issue awards not yet credited. */
    awards?: AwardDoc[];
    /** Slice 5 (tech design §8.4): yesterday's stays and the titles the risk headlines name. */
    risk?: RiskRead | null;
    /** Slice 6 (tech design §8.4): yesterday's events and favours. */
    together?: TogetherEdition | null;
  },
): SettlementWrite | null {
  const today = dayKey(now);
  const city = read.home && '_id' in read.home ? (read.home as CityDoc) : null;
  const wageCity = read.jobCity !== undefined ? read.jobCity : city;
  const contentJob = c.job ? content.job(c.job.id) : undefined;
  const pay = contentJob ? jobPay(contentJob, c.factionId) : null;
  // ADR 0030 §5: the residence city's sources and the room, wherever the character is.
  const caps = capOn(content, city, c.room);
  const s = settleDays({
    settled: c.day.settled,
    today,
    // A job stored before review 1 has no seniority yet (migration 004): it starts at 0.
    job: c.job ? { id: c.job.id, since: c.job.since, seniority: c.job.seniority ?? 0 } : null,
    pay,
    tally: c.today,
    energy: energyState(c),
    now,
    // Review 1 (§9.1): each ended day's ordinance line on the full wage, and its seniority step.
    wageOn: (ended) => {
      // ADR 0030 §6: the job's city's sources of that day (an ordinance, an Issue effect).
      const m = dayModifiers(content, wageCity, ended);
      const payAdjust = pay === null ? 0 : jobPayWith(pay, m) - pay;
      const names = effects(m, 'jobPayPct').map((x) => x.source.name);
      return {
        payAdjust,
        label: payAdjust !== 0 && names.length > 0 ? names.join(' · ') : null,
        seniorityStep: seniorityStep(m),
      };
    },
    capOn: caps,
  });
  if (!s) return null;

  // ADR 0020: the stipend for each boundary held since the last settlement, and refunds.
  const terms = read.terms ?? [];
  // Slice 4 (ADR 0026): a seat vacated at a move stops paying at the move.
  const boundaries = stipendBoundaries(
    terms.map((t) => ({ fromDay: t.fromDay, toDay: t.vacatedDay ?? t.toDay })),
    c.day.settled,
    today,
  );
  // Slice 4 (ADR 0028): the awards the city days wrote since the last settlement.
  const awards = read.awards ?? [];
  const awardsPc = awards.reduce((sum, a) => sum + a.pc, 0);
  // Review 5 (ADR 0082): the Unrest prize's Party XP, credited like the stipend's (the rank follows).
  const awardsFxp = awards.reduce((sum, a) => sum + (a.fxp ?? 0), 0);
  const awardLines = awards.map((a) =>
    a.kind === 'unrest'
      ? {
          kind: a.kind,
          label: copy.unrestPrize(
            content.city(a.cityId)?.name ?? a.cityId,
            ((a.meta?.pushedK ?? a.amount ?? 0) / 1_000).toFixed(1),
            a.fxp ?? 0,
          ),
          pc: a.pc,
          fxp: a.fxp ?? 0,
        }
      : {
          kind: a.kind,
          label:
            a.kind === 'hero'
              ? (a.title?.label ?? 'Hero')
              : `Your work on ${content.issue(a.ref.split(':').slice(2).join(':'))?.short ?? 'the Issue'}`,
          pc: a.pc,
        },
  );
  // The headline names the first prize credited (two towns entering Unrest the same night is rare).
  const prize = awards.find((a) => a.kind === 'unrest');
  const prizeCity = prize ? content.city(prize.cityId) : undefined;
  const unrestPushed =
    prize && prizeCity?.homeFactionId
      ? {
          cityName: prizeCity.name,
          homeName: content.faction(prizeCity.homeFactionId).shortName,
          partyName: content.faction(c.factionId).shortName,
          top: prize.meta?.top ?? [],
        }
      : null;
  const stipend = { pc: boundaries * COUNCIL.stipend.pc, fxp: boundaries * COUNCIL.stipend.fxp };
  // Review 1 (§13.4): One of Us pays 1 PC a day per city where it is held, for the boundaries
  // crossed (at most 14, like the wage). Standing only rises when acting, and a settlement comes
  // before the day's first action, so today's level is the level each ended day had.
  const oneOfUsCities = c.localStanding.filter((x) => standingView(x.successes).level === 4).length;
  const paidBoundaries = s.daysSince === null ? 0 : Math.min(s.daysSince, JOBS.salaryMaxDays);
  const oneOfUsPc = oneOfUsCities * paidBoundaries * STANDING.oneOfUsPcPerDay;
  const gains = applyGains(
    { xp: c.xp, level: c.level, fxp: c.fxp, rank: c.rank, pc: c.pc, statPointsPending: c.statPointsPending },
    { xp: 0, fxp: stipend.fxp + awardsFxp, pc: stipend.pc + oneOfUsPc + awardsPc },
  );
  const offices = terms
    .filter((t) => t.fromDay <= today && today < t.toDay && (t.vacatedDay ?? null) === null)
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
  // Review 1 (§13.7): the welcome set on the welcome day (the creation day, and the next when created
  // after 22:00 UTC), slot A by the best trained stat.
  // QA m2 (ADR 0073): the set is dealt once per character. On a late sign-up's second welcome day the
  // evening's set goes on as it stands (the favour done stays done), or the rotation once it is finished.
  const welcomeDay = s.firstEdition || welcomeDayOf(c, today);
  const carried =
    welcomeDay && !s.firstEdition
      ? carriedWelcome(
          toOrdersState(c.orders),
          today,
          faction.welcomeOrders.B,
          content.ordersOf(c.factionId),
          s.job !== null,
          dayStart(today),
        )
      : null;
  const welcome = welcomeDay && carried === null ? welcomeOrderIds(content, c) : undefined;
  // The crisis pair only for a member living in the faction's home city (design §10).
  const homeOfFaction = content.city(residenceCityId(c))?.homeFactionId === c.factionId;
  const unrest = homeOfFaction && moraleOf(content, city) === 'unrest';
  // Slice 4 (design §10): a capital resident takes the capital rotation from the day after the move.
  const residenceKind = content.isDistricted(residenceCityId(c)) ? 'capital' : 'home';
  const missionsOpen =
    startableMissions(
      content,
      { ...c, level: gains.next.level, rank: gains.next.rank },
      residenceCityId(c),
      today,
    ).length > 0;
  const orders = carried && carried !== 'rotation' ? carried : startOrders(
    content.ordersOf(c.factionId),
    today,
    s.job !== null,
    welcome,
    unrest ? faction.restoreOrders : undefined,
    dayStart(today),
    residenceKind,
    // Slice 5 (design §12.2): the slot-B mission order enters the rotation at Level 6.
    gains.next.level,
    // Review 4 #22: and only on a day the member has a mission they can start in the residence city
    // (its quarter open, offered to their party, no gate unmet); else slot B draws another order.
    (t) => !(t.match.kinds ?? []).includes('mission') || missionsOpen,
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
            cityName: content.city(terms[0]?.cityId ?? residenceCityId(c))?.name ?? '',
          }
        : null,
    oneOfUsPc,
    awards: awardLines,
    unrestPushed,
    seniorityStepYesterday: seniorityStep(dayModifiers(content, wageCity, today - 1)),
    // Slice 5 (tech design §11.2): the risk facts, with the Heat projected at the settlement.
    risk: riskEdition(content, c, today, projectHeat(heatTimerOf(c), now, heatRateOn(content, city)).value, read.risk ?? null),
    together: read.together ?? null,
  });
  // Slice 5 (tech design §8.4): the marks that have faded are dropped from the stored record.
  const stored = marksOf(c);
  const live = liveMarks(stored, today);
  return {
    set: {
      'day.settled': today,
      job: s.job,
      // The new day's tally starts at zero, slice 5's fields with it (no mission, no rival city).
      today: { ...s.today, missions: 0, rivalCityId: null },
      ...(live.length < stored.length ? { 'record.marks': live } : {}),
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
    awards: awards.map((a) => a._id),
  };
}

/**
 * Review 6 leftovers: under the test hooks (memory mode, `pnpm dev:mem` and Playwright) app.ts sets
 * `devClock`, so a character settled on a later day than the server's clock gets a clear dev error
 * (`CLOCK_BEHIND`) instead of an act that retries to ACTION_CONFLICT. Production never sets it.
 */
export const dayHooks: { devClock: boolean } = { devClock: false };

/**
 * Review 6 leftovers: the character's settled day is ahead of `today`. Only the test clock can do
 * that (it was put back, e.g. an API restart before the offset was kept), or, in production, a
 * second's clock skew between two servers at midnight. It is not treated as settled: every act's
 * write is guarded on `'day.settled': today` and the day's counters belong to the later day, so an
 * act would only lose its guard. A read carries on with the character as stored; an act's retry
 * (the DayChanged → resettle path) is refused at once rather than looping to ACTION_CONFLICT.
 */
function refuseAhead(settled: number, today: number): never {
  if (dayHooks.devClock) {
    throw gameError('CONFLICT', 'CLOCK_BEHIND', {
      settledDay: settled,
      today,
      message: `Dev clock is behind this character: settled on day ${settled}, the server is on day ${today}. Skip the clock forward (Dev panel: Next day) until day ${settled}.`,
    });
  }
  // Production: a skew of seconds, gone on the next tap.
  throw gameError('CONFLICT', 'ACTION_CONFLICT', { attempts: 0 });
}

/**
 * ADR 0005: settle every City Day boundary crossed since `day.settled`, on first touch, in one
 * transaction: the wage and seniority, the tally, the stipend and refunds, today's Party
 * orders and today's paper. ADR 0017: the home city's day is settled first, so no character acts
 * on day d before its city has been settled for d. Does nothing when already settled for today.
 * Concurrent first touches are resolved by the version guard and the unique paperEntries index.
 */
export async function ensureSettled(
  content: GameContent,
  c0: CharacterDoc,
  now: number,
  city?: CityDoc | null,
  opts: { read?: boolean } = {},
): Promise<CharacterDoc> {
  const today = dayKey(now);
  if (c0.day.settled === today) return c0;
  if (c0.day.settled !== null && c0.day.settled > today) {
    if (opts.read) return c0;
    refuseAhead(c0.day.settled, today);
  }
  if (city === undefined) await ensurePlaces(content, c0, now);

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
        // ADR 0026, 0030 §6: the residence city, and the job's city when it is another.
        const homeId = residenceCityId(c);
        const home = await City.findById(homeId).session(session).lean<CityDoc>();
        const jobCityId = jobCityOf(content, c);
        const jobCity =
          jobCityId === null || jobCityId === homeId
            ? undefined
            : await City.findById(jobCityId).session(session).lean<CityDoc>();
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
        // A stable order on the desk (heroes, then Issues, each oldest first): an unsorted read came
        // back in either order under load.
        const awards = await Award.find({ characterId: c._id, creditedAt: null })
          .sort({ kind: 1, _id: 1 })
          .session(session)
          .lean<AwardDoc[]>();
        // Slice 5 (tech design §8.4): yesterday's stays and what they and the marks were for.
        const risk = await readRisk(c, today, session);
        // Slice 6 (tech design §8.4): yesterday's events, bail and visits.
        const together = c.day.settled === null ? null : await readTogether(content, c, today, session);
        const w = computeSettlement(content, c, now, {
          together,
          previous,
          home,
          ...(jobCity !== undefined ? { jobCity } : {}),
          terms,
          awards,
          risk,
        });
        if (!w) return c;

        const updated = await Character.findOneAndUpdate(
          { _id: c._id, version: c.version, 'day.settled': c.day.settled },
          { $set: w.set, $inc: { iron: w.inc.iron, version: 1 } },
          { session, returnDocument: 'after', lean: true },
        );
        if (!updated) throw new VersionConflict();
        if (w.awards.length > 0) {
          const credited = await Award.updateMany(
            { _id: { $in: w.awards }, creditedAt: null },
            { $set: { creditedAt: new Date(now) } },
            { session },
          );
          if (credited.modifiedCount !== w.awards.length) throw new VersionConflict();
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

/**
 * Slice 5 (tech design §8.4): the settlement's risk reads, in its session: the stays that started or
 * ended yesterday (or since), the action logs and encounters that name what each was for, and the
 * first mission when it was yesterday.
 */
async function readRisk(c: CharacterDoc, today: DayKey, session: ClientSession): Promise<RiskRead> {
  const from = new Date(dayStart(today - 1));
  const stays = await Stay.find({
    characterId: c._id,
    $or: [{ since: { $gte: from } }, { releasedAt: { $gte: from } }],
  })
    .session(session)
    .lean<StayDoc[]>();
  const first = c.firsts?.mission ? dayKey(new Date(c.firsts.mission).getTime()) === today - 1 : false;
  const logIds = new Set<string>();
  for (const s of stays) if (s.logId) logIds.add(s.logId.toHexString());
  for (const m of c.record?.marks ?? []) if (m.day === today - 1 && m.logId) logIds.add(m.logId);
  const ids = [...logIds].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));
  const logs = ids.length
    ? await ActionLog.find({ _id: { $in: ids } }, { kind: 1, actionId: 1 }).session(session).lean()
    : [];
  const encIds = stays.flatMap((s) => (s.encounterId ? [s.encounterId] : []));
  const encs = encIds.length
    ? await Encounter.find({ _id: { $in: encIds } }, { kind: 1, refId: 1, 'opponent.id': 1 })
        .session(session)
        .lean()
    : [];
  // The first mission's row (or its run-in, should no row name it).
  const firstLog = first
    ? await ActionLog.findOne({ characterId: c._id, kind: 'mission' }, { actionId: 1 })
        .sort({ createdAt: 1 })
        .session(session)
        .lean()
    : null;
  const firstEnc =
    first && !firstLog
      ? await Encounter.findOne({ characterId: c._id, kind: 'mission' }, { refId: 1 })
          .sort({ createdAt: 1 })
          .session(session)
          .lean()
      : null;
  return {
    stays,
    acts: new Map(logs.map((l) => [l._id.toHexString(), { kind: l.kind, actionId: l.actionId }])),
    encounters: new Map(
      encs.map((e) => [e._id.toHexString(), { kind: e.kind, refId: e.refId, opponentId: e.opponent.id }]),
    ),
    firstMissionId: firstLog?.actionId ?? firstEnc?.refId ?? null,
  };
}

export interface LoadedCharacter {
  doc: CharacterDoc;
  /** Today's edition `readAt` (null while unread), for `paperDue`. */
  editionReadAt: number | null;
  /**
   * The residence city after its day was settled (ADR 0017, 0026): the ordinance, morale, the
   * council. Slices 1–3: the home city.
   */
  city: CityDoc | null;
  /** Slice 4 (tech design §7.6): every city the request depends on, settled for today. */
  places: Map<string, CityDoc | null>;
  /** Slice 5 (ADR 0034): the place state of the city the character is in (null off rival ground). */
  rivalGround: RivalGroundState | null;
  /** Slice 5 (ADR 0033): in the cells or on the ward right now, or null. */
  heldNow: 'cells' | 'infirmary' | null;
  /**
   * Slice 7 (tech design §3.6, §7.1): the nation as settled for today (the laws, the term, the
   * government), or null when the nation's day failed (national acts refuse `NATION_NOT_READY`).
   */
  nation: NationDoc | null;
}

/**
 * Every character-scoped procedure starts here (slice-5 tech design §3.3, the read order): find the
 * character, settle the city days (ADR 0017), resolve a run-in by luck when its window has passed or
 * its day has ended (ADR 0032), release a stay that is over (ADR 0033), settle the character's day,
 * then a due journey's arrival. No auto-create (ADR 0011): a user without a character is still
 * arriving. `opts.keepRunIn` is `encounter.choose`'s own run-in, which luck leaves alone unless it is
 * from an earlier day.
 */
export async function loadCharacter(
  user: SessionUser,
  content: GameContent,
  now: number,
  opts: { keepRunIn?: Types.ObjectId | null } = {},
): Promise<LoadedCharacter> {
  const found = await Character.findOne({ userId: user.id }).lean<CharacterDoc>();
  if (!found) throw gameError('PRECONDITION_FAILED', 'ARRIVAL_PENDING');
  const places = await ensurePlaces(content, found, now);
  // Slice 7 (tech design §3.6 step 2): the nation's day after the places (it settles every city first).
  const nation = await ensureNationDay(content, now);
  // Slice 6 (tech design §3.4 step 1): the cities of due sign-ups are settled too (their boundary
  // resolves an earlier day's events first). Nothing when no sign-up is due.
  for (const id of dueCities(found, now)) if (!places.has(id)) places.set(id, await ensureCityDay(content, id, now));
  const city = places.get(residenceCityId(found)) ?? null;
  const lucky = await ensureRunInSettled(content, found, now, opts.keepRunIn ?? null);
  const released = await ensureReleased(content, lucky, now);
  // Slice 6 step 4 (ADR 0037): due events still open are resolved (the world only).
  if (hasDueEvents(released, now)) await ensureEventsResolved(content, released, now);
  const settled = await ensureSettled(content, released, now, city, { read: true });
  // Slice 6 step 6: due, resolved sign-ups are credited after the settlement (today's tally).
  const credited = hasDueEvents(settled, now) ? await ensureEventsCredited(content, settled, now) : settled;
  // Slice 4 (ADR 0025 §4): a due journey arrives (lazily) once the day is settled.
  const arrived = await ensureArrived(content, credited, now);
  // Slice 6 step 8 (ADR 0040): presence, at most once a minute, no version bump.
  const doc = await touchPresence(arrived, now);
  // The city the character is in (an arrival may have moved them since `ensurePlaces`).
  const rival = isRivalGround(content, doc, doc.cityId);
  const here = !rival
    ? null
    : places.has(doc.cityId)
      ? (places.get(doc.cityId) ?? null)
      : await City.findById(doc.cityId).lean<CityDoc>();
  const held = doc.held && doc.held.state === 'in' ? doc.held.kind : null;
  return {
    doc,
    editionReadAt: await editionReadAt(doc, now),
    city,
    places,
    rivalGround: rival ? rivalGroundAt(content, doc.factionId, doc.cityId, here, dayKey(now)) : null,
    heldNow: held,
    nation,
  };
}

/** Slice 6 (tech §3.4): a sign-up or a withdrawn call whose start has passed (no query otherwise). */
export function hasDueEvents(c: Pick<CharacterDoc, 'events'>, now: number): boolean {
  const due = (p: { startsAt: Date }) => new Date(p.startsAt).getTime() <= now;
  return (c.events?.open ?? []).some(due) || (c.events?.calls ?? []).some(due);
}

export async function editionReadAt(doc: CharacterDoc, now: number): Promise<number | null> {
  const entry = await PaperEntry.findOne({ characterId: doc._id, day: dayKey(now) }, { readAt: 1 }).lean();
  return entry?.readAt ? entry.readAt.getTime() : null;
}
