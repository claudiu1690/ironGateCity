import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { Candidacy, Character, City, OfficeTerm } from '@irongate/db';
import type { CandidacyDoc, CharacterDoc, CityDoc, OfficeTermDoc } from '@irongate/db';
import {
  ENERGY,
  RANK_FXP,
  RESIDENCE,
  ROOM,
  councilDay,
  dayKey,
  dayStart,
  electionKey,
  fillTemplate,
  moveWindows,
  projectEnergy,
  registerRefusal,
  roomPrice,
  roomTap,
} from '@irongate/rules';
import type {
  CapitalPlaceholder,
  DayKey,
  GameErrorReason,
  PoliticalPlaceholder,
  PoliticalResult,
  ResidenceCardView,
} from '@irongate/rules';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server';
import type { ClientSession } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureSettled, loadCharacter } from './dayService';
import { dayModifiers, restedCapToday } from './modifiers';
import { politicsSummary, weekdayName } from './politicsService';
import { withRequestKey } from './requestKey';
import { residenceCtx, residenceOf } from './residence';
import { DayChanged, VersionConflict } from './txn';
import { energyState, toCharacterView } from './views';

/**
 * Residence (slice-4 tech design §8.2, ADR 0026, design §7): registering in a capital district or
 * back at home (Rank 2, 500 Iron, seven days between moves), with the old place's candidacy
 * withdrawn and seat vacated in the same transaction; and the room in Irongate (100 Iron, seven
 * days, Rested cap +50). Both re-base Energy at the tap, so the projection never mixes two caps.
 */

const capitalOf = (content: GameContent) => content.nation.capitalId;

/** A place's name: a district, or a city. */
export function placeName(content: GameContent, cityId: string, districtId: string | null): string {
  return districtId
    ? (content.district(districtId)?.quarter.name ?? districtId)
    : (content.city(cityId)?.name ?? cityId);
}

/**
 * The old place's open candidacy (filed), the seat held there today, and (slice-4 fixes §1, QA M2)
 * whether the member's name is on its ballot (standing while the polls are open), with the count
 * day, when they may move.
 */
async function oldPlaceStakes(
  content: GameContent,
  c: CharacterDoc,
  today: DayKey,
  session: ClientSession | null,
): Promise<{
  candidacy: CandidacyDoc | null;
  term: OfficeTermDoc | null;
  onBallot: { countDay: DayKey } | null;
}> {
  const r = residenceOf(c);
  const offset = content.city(r.cityId)?.council?.offset;
  if (offset === undefined) return { candidacy: null, term: null, onBallot: null };
  const cd = councilDay(today, offset);
  const key = electionKey(r.districtId ?? r.cityId, cd.cycle);
  const cq = Candidacy.findOne({
    electionId: key,
    characterId: c._id,
    status: { $in: cd.phase === 'polling' ? ['filed', 'standing'] : ['filed'] },
  });
  const tq = OfficeTerm.findOne({
    cityId: r.cityId,
    'holder.kind': 'player',
    'holder.characterId': c._id,
    fromDay: { $lte: today },
    toDay: { $gt: today },
    vacatedDay: null,
    ...(r.districtId ? { districtId: r.districtId } : {}),
  });
  const [found, term] = await Promise.all([
    (session ? cq.session(session) : cq).lean<CandidacyDoc>(),
    (session ? tq.session(session) : tq).lean<OfficeTermDoc>(),
  ]);
  const standing = found?.status === 'standing';
  return {
    candidacy: standing ? null : found,
    term,
    onBallot: standing ? { countDay: cd.election.countDay } : null,
  };
}

/**
 * Screens §6.1: the residence card for a district of the capital (or, with `districtId: null`, the
 * home city's card for the way back), chosen on the server.
 */
export async function residenceCardView(
  content: GameContent,
  c: CharacterDoc,
  target: { cityId: string; districtId: string | null },
  today: DayKey,
  docs: { capital: CityDoc | null; residence: CityDoc | null },
): Promise<ResidenceCardView> {
  const r = residenceOf(c);
  const capital = capitalOf(content);
  const livesIn = placeName(content, r.cityId, r.districtId);
  const here = r.cityId === target.cityId && r.districtId === target.districtId;
  const room =
    c.cityId === capital
      ? (() => {
          const price = roomPrice(dayModifiers(content, docs.capital, today));
          const running = !!c.room && c.room.fromDay <= today && today < c.room.untilDay;
          const tap = roomTap(c.room, today);
          return {
            state: running ? ('running' as const) : ('none' as const),
            price: { total: price.total, lines: price.lines },
            ...(running ? { untilDay: c.room!.untilDay } : {}),
            // Slice-4 fixes §6 (QA m5): more than seven nights paid, no Renew until this day.
            ...(tap.kind === 'paidAhead' ? { renewFromDay: tap.renewFromDay } : {}),
            cap: restedCapToday(content, docs.residence, today, {
              cityId: ROOM.cityId,
              fromDay: today,
              untilDay: today + ROOM.days,
            }),
          };
        })()
      : null;
  const base = { livesIn, cost: RESIDENCE.cost as 500, room };
  if (here) {
    return {
      ...base,
      state: target.cityId === capital ? 'resident' : 'atHome',
      registeredDay: r.sinceDay,
      votesFromDay: r.votesFromDay,
      canMoveFromDay: r.canMoveFromDay,
      button: null,
      sheet: null,
    };
  }
  if (c.rank < RESIDENCE.rank) return { ...base, state: 'belowRank', button: null, sheet: null };
  if (today < r.canMoveFromDay) {
    return { ...base, state: 'cooldown', canMoveFromDay: r.canMoveFromDay, button: null, sheet: null };
  }
  const stakes = await oldPlaceStakes(content, c, today, null);
  // Slice-4 fixes §1 (QA M2): a candidate on the ballot where they live stays until the result.
  if (stakes.onBallot) {
    return { ...base, state: 'onBallot', canMoveFromDay: stakes.onBallot.countDay, button: null, sheet: null };
  }
  const offset = content.city(target.cityId)?.council?.offset ?? 0;
  const w = moveWindows(today, offset);
  const target_ = placeName(content, target.cityId, target.districtId);
  const lines = [
    { text: copy.residence.sheet.vote(target_, weekdayName(w.votesFromDay)), warn: false },
    ...(stakes.candidacy || stakes.term
      ? [{ text: copy.residence.sheet.giveUp(content.city(r.cityId)?.name ?? livesIn), warn: true }]
      : []),
    { text: copy.residence.sheet.orders(target.cityId === capital), warn: false },
    { text: copy.residence.sheet.untouched, warn: false },
    { text: copy.residence.sheet.moveAgain(weekdayName(w.canMoveFromDay)), warn: false },
  ];
  const state =
    c.iron < RESIDENCE.cost ? 'noIron' : target.cityId === capital ? 'visitingMay' : 'homeElsewhere';
  return {
    ...base,
    state,
    votesFromDay: w.votesFromDay,
    canMoveFromDay: w.canMoveFromDay,
    button: { enabled: state !== 'noIron' },
    sheet: { lines },
  };
}

const CODES: Partial<Record<GameErrorReason, TRPC_ERROR_CODE_KEY>> = {
  DESTINATION_LOCKED: 'BAD_REQUEST',
  ALREADY_RESIDENT: 'CONFLICT',
};

/** The Energy re-base at a move or a room: Energy and Rested projected to now under the old cap. */
function rebase(content: GameContent, c: CharacterDoc, city: CityDoc | null, now: number) {
  const e = projectEnergy(
    energyState(c),
    now,
    ENERGY.max,
    restedCapToday(content, city, dayKey(now), c.room),
  );
  return { 'energy.value': e.value, 'energy.updatedAt': new Date(e.updatedAt), rested: e.rested };
}

/**
 * ADR 0026 §5: a seat vacated at a move: the term gets `vacatedDay` (not completed; the stipend
 * stops); the faction's highest-profile local of that place not seated holds the seat from today to
 * the old `toDay`; the old city's NPC seats go up by one.
 */
async function vacateSeat(
  content: GameContent,
  term: OfficeTermDoc,
  today: DayKey,
  session: ClientSession,
): Promise<void> {
  const seated = await OfficeTerm.find({
    councilKey: term.councilKey,
    vacatedDay: null,
    'holder.kind': 'npc',
  })
    .session(session)
    .lean<OfficeTermDoc[]>();
  const slate = term.districtId
    ? content.slateOf(term.districtId, term.factionId)
    : content.slateOf(term.cityId).filter((s) => !term.factionId || s.factionId === term.factionId);
  const npc = [...slate]
    .sort((a, b) => b.profile - a.profile)
    .find((s) => !seated.some((t) => t.holder.npcId === s.id));
  if (!npc) throw new Error(`no local left to sit in ${term.councilKey} seat ${term.seat}`);
  const holder = { kind: 'npc' as const, npcId: npc.id, name: npc.name };
  if (term.fromDay === today) {
    // Won at this morning's count and given up the same day: no boundary was held, so the local
    // simply takes the term (the unique key is the seat and its first day).
    const done = await OfficeTerm.updateOne(
      { _id: term._id, vacatedDay: null },
      { $set: { holder, total: npc.profile } },
      { session },
    );
    if (done.matchedCount === 0) throw new VersionConflict();
  } else {
    const done = await OfficeTerm.updateOne(
      { _id: term._id, vacatedDay: null },
      { $set: { vacatedDay: today } },
      { session },
    );
    if (done.matchedCount === 0) throw new VersionConflict();
    await OfficeTerm.create(
      [
        {
          cityId: term.cityId,
          councilKey: term.councilKey,
          electionId: term.electionId,
          seat: term.seat,
          factionId: term.factionId,
          districtId: term.districtId ?? null,
          vacatedDay: null,
          fromDay: today,
          toDay: term.toDay,
          holder,
          place: term.place,
          total: npc.profile,
          completed: false,
        },
      ],
      { session },
    );
  }
  await City.updateOne(
    { _id: term.cityId, 'council.key': term.councilKey },
    {
      $inc: {
        'council.npcSeats': 1,
        ...(term.districtId && term.factionId ? { [`council.npcSeatsByFaction.${term.factionId}`]: 1 } : {}),
      },
    },
    { session },
  );
}

function residenceResult(
  content: GameContent,
  i: {
    act: 'register' | 'room' | 'renew';
    cityId: string;
    c: CharacterDoc;
    now: number;
    idempotencyKey: string;
    vars: Partial<Record<PoliticalPlaceholder | CapitalPlaceholder, string>>;
    knockOns: Partial<PoliticalResult['knockOns']>;
    residenceCity: CityDoc | null;
    view: PoliticalResult['view'];
  },
): PoliticalResult {
  const t = content.politics.results[i.act];
  const city = content.city(i.cityId)!;
  const paper = city.paper ?? { name: 'The paper', shortName: 'paper' };
  return {
    kind: 'political',
    act: i.act,
    stamp: { label: t.stamp, tone: 'success' },
    paper: { name: paper.name, shortName: paper.shortName },
    place: { cityId: city.id, cityName: city.name },
    headline: fillTemplate(t.headline, i.vars),
    body: fillTemplate(t.body, i.vars),
    ...(t.next ? { next: fillTemplate(t.next, i.vars) } : {}),
    until: null,
    at: null,
    knockOns: { pc: null, morale: null, endorsements: null, ...i.knockOns },
    performedAt: new Date(i.now).toISOString(),
    idempotencyKey: i.idempotencyKey,
    character: toCharacterView(i.c, i.now, content, null, { city: i.residenceCity }),
    view: i.view,
  };
}

/** residence.register: move to a capital district, or back home (tech design §8.2). */
export async function register(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { cityId: string; districtId: string | null; idempotencyKey: string };
}): Promise<PoliticalResult> {
  const { content, input } = deps;
  const capital = capitalOf(content);
  const targetCity = content.city(input.cityId);
  if (!targetCity?.council) throw gameError('BAD_REQUEST', 'DESTINATION_LOCKED', { cityId: input.cityId });
  if (input.cityId === capital) {
    if (!input.districtId || content.district(input.districtId)?.city.id !== capital) {
      throw gameError('BAD_REQUEST', 'UNKNOWN_DISTRICT', { districtId: input.districtId });
    }
  } else if (input.districtId !== null) {
    throw gameError('BAD_REQUEST', 'UNKNOWN_DISTRICT', { districtId: input.districtId });
  }
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'residence.register',
    input: { cityId: input.cityId, districtId: input.districtId },
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
      const r = residenceOf(c);
      const target = { cityId: input.cityId, districtId: input.districtId };
      const stakes = await oldPlaceStakes(content, c, today, session);
      const refusal = registerRefusal({
        rank: c.rank,
        iron: c.iron,
        cost: RESIDENCE.cost,
        today,
        canMoveFromDay: r.canMoveFromDay,
        here: c.cityId,
        target,
        residence: residenceCtx(c),
        // eslint-disable-next-line no-restricted-properties -- the faction's home: the way back
        homeCityId: c.homeCityId,
        capitalId: capital,
        inTransit: c.journey?.status === 'onTheWay',
        onBallot: !!stakes.onBallot,
      });
      if (refusal) {
        const data: Record<string, unknown> =
          refusal === 'RANK_TOO_LOW'
            ? { need: RESIDENCE.rank, fxpToGo: Math.max(0, RANK_FXP[RESIDENCE.rank - 1]! - c.fxp) }
            : refusal === 'MOVE_COOLDOWN'
              ? { canMoveFromAt: dayStart(r.canMoveFromDay) }
              : refusal === 'NOT_ENOUGH_IRON'
                ? { iron: c.iron, cost: RESIDENCE.cost }
                : refusal === 'IN_TRANSIT'
                  ? { arrivesAt: c.journey ? new Date(c.journey.arrivesAt).getTime() : null }
                  : refusal === 'ON_BALLOT' && stakes.onBallot
                    ? { canMoveFromAt: dayStart(stakes.onBallot.countDay), canMoveFromDay: stakes.onBallot.countDay }
                    : {};
        throw new GameError(refusal, data, CODES[refusal] ?? 'PRECONDITION_FAILED');
      }
      const oldCity = await City.findById(r.cityId).session(session).lean<CityDoc>();
      const windows = moveWindows(today, targetCity.council!.offset);
      const residence = { cityId: target.cityId, districtId: target.districtId, sinceDay: today, ...windows };
      const updated = await Character.findOneAndUpdate(
        {
          _id: c._id,
          version: c.version,
          'day.settled': today,
          iron: { $gte: RESIDENCE.cost },
          'residence.canMoveFromDay': { $lte: today },
        },
        {
          $inc: { iron: -RESIDENCE.cost, version: 1 },
          $set: {
            residence,
            // ADR 0030 §5: the cap changes with the residence; Energy is re-based at the tap.
            ...rebase(content, c, oldCity, now),
            ...(stakes.term
              ? { offices: (c.offices ?? []).filter((o) => !o.termId.equals(stakes.term!._id)) }
              : {}),
          },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      // The old place: a filed candidacy is withdrawn (the deposit stays with the branch), a seat
      // held there is vacated to the branch's next local.
      if (stakes.candidacy) {
        await Candidacy.updateOne(
          { _id: stakes.candidacy._id, status: 'filed' },
          { $set: { status: 'withdrawn', deposit: 'kept' } },
          { session },
        );
      }
      if (stakes.term) await vacateSeat(content, stakes.term, today, session);

      const newCity = await City.findById(target.cityId).session(session).lean<CityDoc>();
      const capitalDoc =
        target.cityId === capital ? newCity : await City.findById(capital).session(session).lean<CityDoc>();
      const place = placeName(content, target.cityId, target.districtId);
      const hq = content.hqOf(c.factionId, target.cityId).location;
      return residenceResult(content, {
        act: 'register',
        cityId: target.cityId,
        c: updated,
        now,
        idempotencyKey: input.idempotencyKey,
        vars: { district: place, weekday: weekdayName(windows.votesFromDay), hq: hq?.name ?? '' },
        knockOns: {
          iron: { before: c.iron, after: updated.iron },
          seatGivenUp: stakes.term ? { cityName: content.city(stakes.term.cityId)?.name ?? '' } : null,
          candidacyWithdrawn: !!stakes.candidacy,
        },
        residenceCity: newCity,
        view: {
          kind: 'residence',
          residence: await residenceCardView(content, updated, target, today, {
            capital: capitalDoc,
            residence: newCity,
          }),
          election: await politicsSummary(content, updated, newCity, now, today, session),
        },
      });
    },
  });
}

/**
 * residence.room: a room in Irongate for seven days; on a room running with seven or fewer nights
 * left, seven more nights at its end (slice-4 fixes §6, QA m5); more than seven left, refused
 * (ROOM_PAID_AHEAD), so at most fourteen nights are ever paid for.
 */
export async function takeRoom(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { idempotencyKey: string };
}): Promise<PoliticalResult> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'residence.room',
    input: {},
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
      if (c.journey?.status === 'onTheWay') {
        throw new GameError('IN_TRANSIT', { arrivesAt: new Date(c.journey.arrivesAt).getTime() });
      }
      if (c.cityId !== ROOM.cityId) throw new GameError('NOT_IN_CITY', { cityId: ROOM.cityId });
      const capitalDoc = await City.findById(ROOM.cityId).session(session).lean<CityDoc>();
      const price = roomPrice(dayModifiers(content, capitalDoc, today));
      if (c.iron < price.total) throw new GameError('NOT_ENOUGH_IRON', { iron: c.iron, cost: price.total });
      const r = residenceOf(c);
      const residenceCity =
        r.cityId === ROOM.cityId
          ? capitalDoc
          : await City.findById(r.cityId).session(session).lean<CityDoc>();
      const tap = roomTap(c.room, today);
      if (tap.kind === 'paidAhead') {
        throw new GameError('ROOM_PAID_AHEAD', {
          renewFromDay: tap.renewFromDay,
          renewFromAt: dayStart(tap.renewFromDay),
        });
      }
      const room = { cityId: ROOM.cityId, fromDay: tap.fromDay, untilDay: tap.untilDay };
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: price.total } },
        {
          $inc: { iron: -price.total, version: 1 },
          $set: { room, ...rebase(content, c, residenceCity, now) },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      const district = r.cityId === ROOM.cityId && r.districtId ? r.districtId : stationDistrict(content);
      return residenceResult(content, {
        act: tap.kind === 'renew' ? 'renew' : 'room',
        cityId: ROOM.cityId,
        c: updated,
        now,
        idempotencyKey: input.idempotencyKey,
        vars: {
          weekday: weekdayName(room.untilDay),
          cap: String(restedCapToday(content, residenceCity, today, room)),
        },
        knockOns: { iron: { before: c.iron, after: updated.iron } },
        residenceCity,
        view: {
          kind: 'residence',
          residence: await residenceCardView(
            content,
            updated,
            { cityId: ROOM.cityId, districtId: district },
            today,
            { capital: capitalDoc, residence: residenceCity },
          ),
          election: await politicsSummary(content, updated, residenceCity, now, today, session),
        },
      });
    },
  });
}

/** The capital's station district (where a train arrives). */
function stationDistrict(content: GameContent): string {
  const capital = content.city(capitalOf(content))!;
  return capital.locations.find((l) => l.kind === 'station')?.quarterId ?? capital.quarters[0]!.id;
}
