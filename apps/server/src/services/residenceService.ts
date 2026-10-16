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
  LodgingsView,
  PoliticalResult,
  ResidenceCardView,
} from '@irongate/rules';
import type { TRPC_ERROR_CODE_KEY } from '@trpc/server';
import type { ClientSession } from 'mongoose';
import { GameError, gameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { ensureSettled, loadCharacter } from './dayService';
import { assertFree, notFree } from './risk';
import { dayModifiers, homeCapOf, restedCapToday } from './modifiers';
import { politicsSummary, weekdayName } from './politicsService';
import { withRequestKey } from './requestKey';
import { isContested, openResidences, residenceCtx, residenceOf } from './residence';
import { DayChanged, VersionConflict } from './txn';
import { energyState, toCharacterView } from './views';

/**
 * Residence (slice-4 tech design §8.2, ADR 0026, design §7): registering in a capital district or
 * back at home (Rank 2, 500 Iron, seven days between moves), with the old place's candidacy
 * withdrawn and seat vacated in the same transaction; and (review 4 #9) a bed at the Lodgings card
 * (100 Iron, seven days, Rested cap +50). Both re-base Energy at the tap, so the projection never
 * mixes two caps.
 */

const capitalOf = (content: GameContent) => content.nation.capitalId;

/** A place's name: a district, or a city. */
export function placeName(content: GameContent, cityId: string, districtId: string | null): string {
  return districtId
    ? (content.district(districtId)?.quarter.name ?? districtId)
    : (content.city(cityId)?.name ?? cityId);
}

/**
 * The seat held at the old place today, and (slice-4 fixes §1; the voting rework, ADR 0084) whether
 * the member is standing there this cycle (from the stand on any cycle day, until the result), with
 * the count day, when they may move.
 */
async function oldPlaceStakes(
  content: GameContent,
  c: CharacterDoc,
  today: DayKey,
  session: ClientSession | null,
): Promise<{
  term: OfficeTermDoc | null;
  onBallot: { countDay: DayKey } | null;
}> {
  const r = residenceOf(c);
  const offset = content.city(r.cityId)?.council?.offset;
  if (offset === undefined) return { term: null, onBallot: null };
  const cd = councilDay(today, offset);
  const key = electionKey(r.districtId ?? r.cityId, cd.cycle);
  const cq = Candidacy.findOne({
    electionId: key,
    characterId: c._id,
    status: 'standing',
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
    term,
    onBallot: standing ? { countDay: cd.election.countDay } : null,
  };
}

/**
 * Review 4 #9 (answers §9.3, tech design §10.3): the Lodgings card at the place that has one (Tram
 * Junction). The room's rule, unchanged: its price under the day's rules of the place's city, whether
 * a bed is running, what a tap buys (`roomTap`), and Rested's cap now and with a bed.
 */
export function lodgingsView(
  content: GameContent,
  c: CharacterDoc,
  location: { lodgings?: { line: string } },
  today: DayKey,
  docs: { city: CityDoc | null; residence: CityDoc | null },
): LodgingsView | null {
  if (!location.lodgings) return null;
  const price = roomPrice(dayModifiers(content, docs.city, today));
  const running = !!c.room && c.room.fromDay <= today && today < c.room.untilDay;
  const tap = roomTap(c.room, today);
  return {
    line: location.lodgings.line,
    price: {
      base: price.base,
      lines: price.lines.map((l) => ({ id: l.id, label: l.label, pct: l.pct })),
      total: price.total,
    },
    running: running ? { untilDay: c.room!.untilDay } : null,
    tap: tap.kind === 'paidAhead' ? 'notYet' : tap.kind,
    renewFromDay: tap.kind === 'paidAhead' ? tap.renewFromDay : null,
    cap: {
      now: restedCapToday(content, docs.residence, today, c.room, c.factionId, homeCapOf(c)),
      with: restedCapToday(content, docs.residence, today, {
        cityId: ROOM.cityId,
        fromDay: today,
        untilDay: today + ROOM.days,
      }, c.factionId),
    },
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
): Promise<ResidenceCardView> {
  const r = residenceOf(c);
  const livesIn = placeName(content, r.cityId, r.districtId);
  const here = r.cityId === target.cityId && r.districtId === target.districtId;
  // Review 4 #9 (answers §9.3): the room left the card; it is the Lodgings card at Tram Junction.
  const base = { livesIn, cost: RESIDENCE.cost as 500 };
  // Slice 5 (screens §8.3, GDD §14.12): another faction's home city is rival ground, where nobody
  // may live or stand: *You can't live or stand here*.
  const homeFaction = content.city(target.cityId)?.homeFactionId;
  if (homeFaction && homeFaction !== c.factionId) {
    return { ...base, state: 'rivalGround', button: null, sheet: null };
  }
  if (here) {
    return {
      ...base,
      state: isContested(content, target.cityId) ? 'resident' : 'atHome',
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
    ...(stakes.term
      ? [{ text: copy.residence.sheet.giveUp(content.city(r.cityId)?.name ?? livesIn), warn: true }]
      : []),
    { text: copy.residence.sheet.orders(isContested(content, target.cityId), target.cityId !== content.nation.capitalId && isContested(content, target.cityId)), warn: false },
    { text: copy.residence.sheet.untouched, warn: false },
    { text: copy.residence.sheet.moveAgain(weekdayName(w.canMoveFromDay)), warn: false },
  ];
  const state =
    c.iron < RESIDENCE.cost ? 'noIron' : isContested(content, target.cityId) ? 'visitingMay' : 'homeElsewhere';
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
    restedCapToday(content, city, dayKey(now), c.room, c.factionId, homeCapOf(c)),
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
    knockOns: { pc: null, morale: null, backers: null, ...i.knockOns },
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
  // Slice 5 (tech design §7.2): not from the cells, the ward or a run-in.
  assertFree(loaded.doc);
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
      const blocked = notFree(c);
      if (blocked) throw blocked;
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
        openIds: openResidences(content),
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
      // The old place: a seat held there is vacated to the branch's next local (a candidate cannot
      // move until the result: `ON_BALLOT`).
      if (stakes.term) await vacateSeat(content, stakes.term, today, session);

      const newCity = await City.findById(target.cityId).session(session).lean<CityDoc>();
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
        },
        residenceCity: newCity,
        view: {
          kind: 'residence',
          residence: await residenceCardView(content, updated, target, today),
          election: await politicsSummary(content, updated, newCity, now, today, session),
        },
      });
    },
  });
}

/**
 * residence.room (review 4 #9, tech design §10.3): a bed at the place with the Lodgings card (Tram
 * Junction), for seven days; on a bed running with seven or fewer nights left, seven more nights at its
 * end (slice-4 fixes §6, QA m5); more than seven left, refused (ROOM_PAID_AHEAD), so at most fourteen
 * nights are ever paid for. The place must have lodgings (`NO_LODGINGS`), and the character must stand
 * in its city, off the train (`NOT_HERE`). The rule is the room's, unchanged.
 */
export async function takeRoom(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { locationId: string; idempotencyKey: string };
}): Promise<PoliticalResult> {
  const { content, input } = deps;
  const located = content.location(input.locationId);
  if (!located) throw gameError('NOT_FOUND', 'UNKNOWN_LOCATION', { locationId: input.locationId });
  const loaded = await loadCharacter(deps.user, content, deps.now());
  // Slice 5 (tech design §7.2): not from the cells, the ward or a run-in.
  assertFree(loaded.doc);
  return withRequestKey<PoliticalResult>({
    characterId: loaded.doc._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'residence.room',
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
      const blocked = notFree(c);
      if (blocked) throw blocked;
      const roomCity = located.city.id;
      if (!located.location.lodgings) throw new GameError('NO_LODGINGS', { locationId: input.locationId });
      const onTrain = c.journey?.status === 'onTheWay';
      if (onTrain || c.cityId !== roomCity) {
        throw new GameError('NOT_HERE', {
          cityId: roomCity,
          ...(onTrain ? { arrivesAt: new Date(c.journey!.arrivesAt).getTime() } : {}),
        });
      }
      const cityDoc = await City.findById(roomCity).session(session).lean<CityDoc>();
      const price = roomPrice(dayModifiers(content, cityDoc, today));
      if (c.iron < price.total) throw new GameError('NOT_ENOUGH_IRON', { iron: c.iron, cost: price.total });
      const r = residenceOf(c);
      const residenceCity =
        r.cityId === roomCity ? cityDoc : await City.findById(r.cityId).session(session).lean<CityDoc>();
      const tap = roomTap(c.room, today);
      if (tap.kind === 'paidAhead') {
        throw new GameError('ROOM_PAID_AHEAD', {
          renewFromDay: tap.renewFromDay,
          renewFromAt: dayStart(tap.renewFromDay),
        });
      }
      const room = { cityId: roomCity, fromDay: tap.fromDay, untilDay: tap.untilDay };
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: price.total } },
        {
          $inc: { iron: -price.total, version: 1 },
          $set: { room, ...rebase(content, c, residenceCity, now) },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      const capital = capitalOf(content);
      const district = r.cityId === capital && r.districtId ? r.districtId : stationDistrict(content);
      return residenceResult(content, {
        act: tap.kind === 'renew' ? 'renew' : 'room',
        cityId: roomCity,
        c: updated,
        now,
        idempotencyKey: input.idempotencyKey,
        vars: {
          weekday: weekdayName(room.untilDay),
          cap: String(restedCapToday(content, residenceCity, today, room, c.factionId)),
        },
        knockOns: { iron: { before: c.iron, after: updated.iron } },
        residenceCity,
        view: {
          kind: 'residence',
          residence: await residenceCardView(
            content,
            updated,
            // Slice 7: Clearwater's lodgings show its own card.
            content.isDistricted(roomCity) ? { cityId: capital, districtId: district } : { cityId: roomCity, districtId: null },
            today,
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
