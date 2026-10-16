import { fellowsOn } from './presenceService';
import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { Character, City, District, IssueModel, Journey, PaperEntry } from '@irongate/db';
import type { CharacterDoc, CityDoc, DistrictDoc, IssueDoc, JourneyDoc } from '@irongate/db';
import {
  addHeat,
  addToTally,
  applyGains,
  applyPersuasion,
  averageShares,
  cardDifficulty,
  coolAndClean,
  councilDay,
  createRng,
  dayKey,
  dayStart,
  destinationState,
  drawCardAt,
  drawHostileCard,
  drawJourneyCard,
  ENERGY,
  fare,
  fillTemplate,
  JOURNEY_SET_ASIDE,
  journeyChoiceCheck,
  journeyLegs,
  journeyMinutes,
  legMinutes,
  legSpans,
  liveMarks,
  MORALE,
  moraleState,
  projectEnergy,
  projectHeat,
  resolveJourneyChoice,
  standingBonus,
  TRAVEL,
  weekOf,
} from '@irongate/rules';
import { fadeDaysFor, lawModifiers } from './lawBook';
import type {
  BoardResult,
  CharacterView,
  CheckStats,
  DestinationState,
  Fare,
  GameErrorReason,
  JourneyCardResult,
  JourneyChoiceSpec,
  JourneyChoiceView,
  JourneyView,
  Landing,
  LocationView,
  NationCityView,
  NationView,
  OpinionShares,
  StatKey,
} from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import { journeyScheduler } from '../jobs/scheduler';
import { captureException } from '../sentry';
import type { SessionUser } from '../trpc/context';
import { leaderOf, progressOf } from './actionService';
import { ensureCityDay } from './cityDay';
import { ensureSettled, loadCharacter } from './dayService';
import {
  assertFree,
  barredUntil,
  flagsPruned,
  flagsToday,
  heatDoc,
  heatRateOn,
  heatTimerOf,
  isRivalGround,
  marksOf,
  notFree,
} from './risk';
import type { LoadedCharacter } from './dayService';
import { addInfluence, addPoints, writeLedger } from './ledger';
import { dayModifiers, homeCapOf, restedCapToday } from './modifiers';
import { politicsSummary } from './politicsService';
import { keySeed } from './keyGuard';
import { withRequestKey } from './requestKey';
import { residenceCityId } from './residence';
import { DayChanged, MAX_ATTEMPTS, VersionConflict, inTransaction } from './txn';
import {
  assetView,
  energyState,
  namedStanding,
  standingSuccesses,
  toCharacterView,
  wornStats,
} from './views';
import { nightAt } from './night';
export { ensureArrived, settleArrival } from './journeyArrival';

/**
 * Travel (slice-4 tech design §8.1–§8.3, ADR 0025): the nation map, boarding, the journey and its
 * card, the arrival (lazy, and the tidy job's), and closing the arrival modal. The rules decide
 * (legs, who can go, the fare, the card and its roll); this file reads and writes.
 */

const MINUTE = 60_000;

export const capitalOf = (content: GameContent): string => content.nation.capitalId;

/** The capital's station: where a train arrives and the Trains card is (Central Station). */
export function capitalStation(content: GameContent) {
  const capital = content.city(capitalOf(content))!;
  return capital.locations.find((l) => l.kind === 'station')!;
}

/**
 * Where Continue on the arrival modal lands: the station district in the capital. Review 4 (answers
 * §21.3, ADR 0076): a home city is one map, and a train lands on its Town Hall's pin (the civic
 * centre, open at every Level), rival ground included.
 */
export function landingOf(content: GameContent, cityId: string, _rivalGround = false): Landing {
  if (cityId !== capitalOf(content)) {
    const hall = content.hallOf(cityId)?.location;
    return hall ? { cityId, locationId: hall.id } : { cityId };
  }
  const station = capitalStation(content);
  return { cityId, ...(station.quarterId ? { quarterId: station.quarterId } : {}), locationId: station.id };
}

/** `{destination}`: the city, or in the capital the station district (*Station & Market*). */
function destinationName(content: GameContent, cityId: string): string {
  if (cityId !== capitalOf(content)) return content.city(cityId)?.name ?? cityId;
  const q = capitalStation(content).quarterId;
  return q ? (content.district(q)?.quarter.name ?? cityId) : (content.city(cityId)?.name ?? cityId);
}

/** The journey minutes of every open city from the capital (the rules' `legMinutes` map). */
const minutesMap = (content: GameContent): Record<string, number> =>
  Object.fromEntries(content.nation.cities.map((c) => [c.cityId, c.minutes]));

/** Slice 5 (design §11.5): the usual time between two cities (a deportation's train home). */
export const legMinutesBetween = (content: GameContent, from: string, to: string): number =>
  legMinutes(from, to, minutesMap(content), capitalOf(content));

/** ADR 0030: the ticket from a city: its ticket sources of the day (Tram Subsidy, the Fare Hike). */
export function fareFrom(content: GameContent, origin: CityDoc | null, day: number): Fare {
  return fare(dayModifiers(content, origin, day));
}

/**
 * Design §2.3: the destination's state for this character standing in `here`. Slice 5 (design
 * §11.1, §11.5): a rival home is open from Level 10 (`rival`), or `barred` until a deportation's bar
 * ends. Without `now` the bar is not read (the board refuses it anyway).
 */
export function destinationOf(
  content: GameContent,
  c: Pick<CharacterDoc, 'level' | 'factionId' | 'barred'>,
  here: string,
  to: string,
  now?: number,
): DestinationState {
  const nc = content.nationCity(to)!;
  return destinationState({
    to,
    here,
    level: c.level,
    service: nc.service,
    factionHomeOf: (id) => content.city(id)?.homeFactionId ?? null,
    playerFaction: c.factionId,
    capitalId: capitalOf(content),
    ...(now !== undefined ? { barredUntil: barredUntil(c, to, now), now } : {}),
  });
}

/** Why a board is refused (in this order), or null. */
export function boardRefusal(
  content: GameContent,
  c: Pick<CharacterDoc, 'level' | 'factionId' | 'iron' | 'cityId' | 'journey' | 'barred'>,
  to: string,
  total: number,
  now?: number,
): { reason: GameErrorReason; data: Record<string, unknown> } | null {
  if (c.level < TRAVEL.level) return { reason: 'LEVEL_TOO_LOW', data: { need: TRAVEL.level } };
  if (c.journey?.status === 'onTheWay')
    return { reason: 'IN_TRANSIT', data: { arrivesAt: new Date(c.journey.arrivesAt).getTime() } };
  const state = destinationOf(content, c, c.cityId, to, now);
  if (state === 'here') return { reason: 'ALREADY_THERE', data: {} };
  if (state === 'barred') return { reason: 'BARRED', data: { cityId: to, until: barredUntil(c, to, now!) } };
  if (state === 'later') return { reason: 'DESTINATION_LOCKED', data: { lock: state } };
  if (c.iron < total) return { reason: 'NOT_ENOUGH_IRON', data: { iron: c.iron, cost: total } };
  return null;
}

/**
 * The Trains card at the capital's station: the destinations with a service, their minutes and
 * fares. Slice 5: rival homes are listed (boardable from Level 10, not while barred).
 */
export function trainsFrom(
  content: GameContent,
  c: CharacterDoc,
  origin: CityDoc | null,
  day: number,
  now?: number,
): NonNullable<LocationView['trains']> {
  const here = c.cityId;
  const f = fareFrom(content, origin, day);
  return {
    destinations: content.nation.cities
      .filter((n) => n.cityId !== here && destinationOf(content, c, here, n.cityId) !== 'later')
      .map((n) => ({
        cityId: n.cityId,
        name: n.name,
        minutes: journeyMinutes(
          legMinutes(here, n.cityId, minutesMap(content), capitalOf(content)),
          lawModifiers(content, day, c.factionId),
        ),
        fare: { base: f.base, lines: f.lines, total: f.total },
        canBoard: boardRefusal(content, c, n.cityId, f.total, now) === null,
      })),
  };
}

// ---------------------------------------------------------------------------------------------
// The nation map (travel.nation).
// ---------------------------------------------------------------------------------------------

export async function nationView(content: GameContent, c: CharacterDoc, now: number): Promise<NationView> {
  const today = dayKey(now);
  const night = nightAt(now);
  const capital = capitalOf(content);
  // Every open city's day, so their Issues and calendars are today's (one read each once settled).
  const docs = new Map<string, CityDoc | null>();
  for (const n of content.nation.cities) {
    if (content.city(n.cityId)?.council) docs.set(n.cityId, await ensureCityDay(content, n.cityId, now));
  }
  const districts = await District.find({ cityId: capital }).lean<DistrictDoc[]>();
  const here = c.journey?.status === 'onTheWay' ? null : c.cityId;
  const origin = here ? (docs.get(here) ?? null) : null;
  const f = fareFrom(content, origin, today);
  // A fixed list order: the capital, your home, the other three.
  // eslint-disable-next-line no-restricted-properties -- the faction's home on the map
  const home = c.homeCityId;
  const order = [
    ...content.nation.cities.filter((n) => n.cityId === capital),
    ...content.nation.cities.filter((n) => n.cityId === home && n.cityId !== capital),
    ...content.nation.cities.filter((n) => n.cityId !== capital && n.cityId !== home),
  ];
  const cities: NationCityView[] = order.map((n, idx) => {
    const doc = docs.get(n.cityId) ?? null;
    const spec = content.city(n.cityId);
    const state: DestinationState = here
      ? destinationOf(content, c, here, n.cityId, now)
      : c.level < TRAVEL.level
        ? 'level'
        : n.service === 'later'
          ? 'later'
          : destinationOf(content, c, c.journey!.to, n.cityId, now);
    let line = n.line;
    let whoHolds: OpinionShares = n.baselineOpinion ??
      spec?.baselineOpinion ?? {
        vanguard: 25,
        collective: 25,
        alliance: 25,
        neutral: 25,
      };
    if (n.cityId === capital) {
      const close = districts.filter((d) => d.state.battleground).length;
      // Design §19 Q14: the live tail.
      line = `${n.line} · ${close === 2 ? 'two close races today' : close === 1 ? 'one close race today' : close > 2 ? `${close} close races today` : 'contested'}`;
      if (districts.length > 0) whoHolds = averageShares(districts.map((d) => d.opinion));
    } else if (doc?.opinion) whoHolds = doc.opinion;
    const live = doc?.issues && doc.issues.weekDay === weekOf(today) ? doc.issues.live : [];
    const offset = spec?.council?.offset;
    let election: NationCityView['election'] = null;
    if (offset !== undefined) {
      const cal = councilDay(today, offset);
      election =
        cal.phase === 'polling'
          ? { line: 'votingOpen', until: dayStart(cal.election.countDay) }
          : { line: 'votesIn', days: cal.election.pollsFrom - today };
    }
    const refusal = here
      ? boardRefusal(content, c, n.cityId, f.total, now)
      : { reason: 'IN_TRANSIT' as const, data: {} };
    // Slice 5 (design §11.1): rival ground is open from Level 10; a bar locks it for 24 hours.
    const locked = state === 'barred' || state === 'later';
    const until = state === 'barred' ? barredUntil(c, n.cityId, now) : null;
    const rivalHome = spec?.homeFactionId && spec.homeFactionId !== c.factionId ? spec.homeFactionId : null;
    return {
      cityId: n.cityId,
      name: n.name,
      x: n.x,
      y: n.y,
      n: idx + 1,
      line,
      state,
      lockWord: state === 'barred' ? 'barred' : state === 'later' ? 'no service yet' : null,
      ...(until !== null ? { barredUntil: until } : {}),
      ...(rivalHome ? { rival: { homeFactionId: rivalHome } } : {}),
      // Review 5 (answers §10.2): the card's *The goal: Unrest · 11.4 points to go*.
      ...(rivalHome
        ? {
            goal: {
              toUnrest: Math.round(Math.max(0, whoHolds[rivalHome] - MORALE.unrestBelow) * 1_000) / 1_000,
              unrest: moraleState(whoHolds[rivalHome]) === 'unrest',
            },
          }
        : {}),
      minutes:
        here && n.cityId !== here && n.service === 'open'
          ? journeyMinutes(legMinutes(here, n.cityId, minutesMap(content), capital), lawModifiers(content, today, c.factionId))
          : null,
      fare: here && n.cityId !== here && !locked ? { base: f.base, lines: f.lines, total: f.total } : null,
      whoHolds,
      issues: live.map((l) => ({ issueId: l.issueId, name: content.issue(l.issueId)?.name ?? l.issueId })),
      election,
      canBoard: refusal ? { ok: false, reason: refusal.reason } : { ok: true },
      seeDistricts: n.cityId === capital && here === capital,
    };
  });
  return {
    map: {
      day: assetView(content, content.nation.map.day),
      night: assetView(content, content.nation.map.night),
    },
    tiles: true,
    frame: { ...content.nation.frame },
    clouds: content.nation.clouds ?? false,
    isNight: night.night,
    night,
    here:
      c.journey?.status === 'onTheWay'
        ? { journey: { from: c.journey.from, to: c.journey.to } }
        : { cityId: c.cityId },
    trainOpen: c.level >= TRAVEL.level,
    cities,
  };
}

// ---------------------------------------------------------------------------------------------
// Boarding (travel.board).
// ---------------------------------------------------------------------------------------------

export async function board(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { to: string; idempotencyKey: string };
}): Promise<BoardResult> {
  const { content, input } = deps;
  if (!content.nationCity(input.to)) {
    throw gameError('BAD_REQUEST', 'UNKNOWN_DESTINATION', { to: input.to });
  }
  const loaded = await loadCharacter(deps.user, content, deps.now());
  // Slice 5 (tech design §7.2): not from the cells, the ward or a run-in.
  assertFree(loaded.doc);
  let fresh = false;
  const result = await withRequestKey<BoardResult>({
    characterId: loaded.doc._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'travel.board',
    input: { to: input.to },
    resettle: async () => {
      const again = await Character.findById(loaded.doc._id).lean<CharacterDoc>();
      if (again) await ensureSettled(content, again, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      let c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      const blocked = notFree(c);
      if (blocked) throw blocked;
      const origin = await City.findById(c.cityId).session(session).lean<CityDoc>();
      const f = fareFrom(content, origin, today);
      const refusal = boardRefusal(content, c, input.to, f.total, now);
      if (refusal) throw new GameError(refusal.reason, refusal.data);

      // An arrived journey whose modal was never closed is closed now (slept through if unanswered;
      // an unanswered hostile card's ignore effects apply, once).
      if (c.journey?.status === 'arrived') {
        c = await closeJourneyInTx(content, session, c, c.journey.id, now, loaded.city);
      }
      // QA M1: one seed per key, so a re-run of this transaction draws the same card.
      const seed = keySeed(c._id, input.idempotencyKey);
      const made = c.journeysMade ?? 0;
      // Slice 5 (tech design §8.2): rival ground always draws from the hostile deck; elsewhere the
      // ordinary deck, the passenger first on the first journey that is neither (`firstDone`).
      const rival = isRivalGround(content, c, input.to);
      // Slice 6 (ADR 0040): on the train nobody is *here* at a place.
      const set: Record<string, unknown> = { 'presence.locationId': null };
      const inc: Record<string, number> = { iron: -f.total, version: 1, journeysMade: 1 };
      let card: { eventId: string; deck: 'ordinary' | 'hostile' } | null;
      if (rival) {
        const heat = projectHeat(heatTimerOf(c), now, heatRateOn(content, loaded.city, c.factionId)).value;
        const drawn = drawHostileCard({
          firstRival: (c.rivalTrips ?? 0) === 0,
          heat,
          seen: c.hostileDeck?.seen ?? [],
          rotation: content.hostileRotation(),
          firstId: content.hostileFirst(),
          listed: content.listedCard(),
          rng: createRng(seed),
        });
        card = { eventId: drawn.eventId, deck: 'hostile' };
        set.hostileDeck = { seen: drawn.seen };
        inc.rivalTrips = 1;
      } else {
        const firstDone = c.journeyDeck?.firstDone ?? made > 0;
        const drawn = drawJourneyCard({
          first: !firstDone,
          seen: c.journeyDeck?.seen ?? [],
          deck: content.journeyDeck(),
          firstId: content.journeyEvents.find((e) => e.first && e.deck === 'ordinary')!.id,
          rng: createRng(seed),
        });
        card = drawn.eventId ? { eventId: drawn.eventId, deck: 'ordinary' } : null;
        set.journeyDeck = { seen: drawn.seen, firstDone: true };
      }
      // Slice 7 (ADR 0044): the Open Borders Act's minutes, fixed at boarding.
      const minutes = journeyMinutes(
        legMinutes(c.cityId, input.to, minutesMap(content), capitalOf(content)),
        lawModifiers(content, dayKey(now), c.factionId),
      );
      const id = new Types.ObjectId();
      const boardedAt = new Date(now);
      const arrivesAt = new Date(now + minutes * MINUTE);
      // Review 4 (ADR 0075 §3): the card's moment, drawn with the card from the key's seed, so a
      // re-run of this transaction draws the same moment.
      const drawnCard = card
        ? {
            ...card,
            at: new Date(drawCardAt(createRng(`${seed}:cardAt`), boardedAt.getTime(), arrivesAt.getTime())),
          }
        : null;
      await Journey.create(
        [
          {
            _id: id,
            characterId: c._id,
            n: made + 1,
            from: c.cityId,
            to: input.to,
            boardedAt,
            arrivesAt,
            minutes,
            fare: f,
            seed,
            card: drawnCard,
            kind: 'ticket',
            rivalGround: rival,
            choice: null,
            status: 'onTheWay',
            arrivedAt: null,
            closedAt: null,
            sleptThrough: false,
            firstToCapital: input.to === capitalOf(content) && !c.firstCapitalArrivalAt,
          },
        ],
        { session },
      );
      const pointer = { id, from: c.cityId, to: input.to, boardedAt, arrivesAt, status: 'onTheWay' as const };
      const updated = await Character.findOneAndUpdate(
        {
          _id: c._id,
          version: c.version,
          'day.settled': today,
          iron: { $gte: f.total },
          $or: [{ journey: null }, { 'journey.status': 'arrived' }],
        },
        { $inc: inc, $set: { ...set, journey: pointer } },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();
      fresh = true;
      const j = (await Journey.findById(id).session(session).lean<JourneyDoc>())!;
      return {
        journey: await journeyView(content, updated, j, now, { city: loaded.city, session }),
        character: toCharacterView(updated, now, content, loaded.editionReadAt, { city: loaded.city }),
      };
    },
  });
  // ADR 0025 §5: the tidy job, after the commit; best effort, never awaited by the tap (the lazy
  // arrival is the guarantee).
  if (fresh) {
    const journeyId = result.journey.id;
    void Promise.resolve()
      .then(() => journeyScheduler().arriveAt(journeyId, new Date(result.journey.arrivesAt)))
      .catch((err: unknown) => captureException(err, { where: 'journey-arrive schedule', journeyId }));
  }
  return result;
}

// ---------------------------------------------------------------------------------------------
// The journey screen and the arrival modal (travel.journey).
// ---------------------------------------------------------------------------------------------

/** The destination's first live Issue this week (journey cards' points and `{issue}`). */
async function firstIssueOf(
  cityId: string,
  city: CityDoc | null,
  day: number,
  session: ClientSession | null,
): Promise<IssueDoc | null> {
  const first =
    city?.issues?.weekDay === weekOf(day) ? city.issues.live.find((l) => l.order === 1) : undefined;
  if (!first) return null;
  const q = IssueModel.findOne({ _id: first.docId, status: 'live', cityId });
  return (session ? q.session(session) : q).lean<IssueDoc>();
}

/**
 * Review 4 (ADR 0075 §4–§5): the card's moment, epoch ms; a card drawn before review 4 (no `at`)
 * reads as `boardedAt`, answerable at once as it was. Null when the journey drew no card.
 */
export function cardAtOf(j: Pick<JourneyDoc, 'card' | 'boardedAt'>): number | null {
  if (!j.card) return null;
  return j.card.at ? new Date(j.card.at).getTime() : j.boardedAt.getTime();
}

/**
 * Review 4 (ADR 0075 §4): whether the card's content may be shown and answered now: from its
 * moment, or once the journey has arrived (a moment is always before the arrival; the arrival test
 * hook and the dev panel bring the arrival forward).
 */
export function cardOpen(j: Pick<JourneyDoc, 'card' | 'boardedAt' | 'arrivesAt' | 'status'>, now: number): boolean {
  const at = cardAtOf(j);
  if (at === null) return false;
  return now >= at || j.status !== 'onTheWay' || now >= j.arrivesAt.getTime();
}

/** Review 4 (tech design §6.4): the journey's legs on the nation picture and their time spans. */
export function routeOf(content: GameContent, from: string, to: string): JourneyView['route'] {
  const minutes = minutesMap(content);
  const legs = journeyLegs(content.nation.routes, from, to, capitalOf(content), (id) => minutes[id] ?? 0);
  const spans = legSpans(legs);
  return {
    legs: legs.map((l, i) => ({
      points: l.points.map((p) => [p[0], p[1]] as [number, number]),
      fromT: spans[i]!.fromT,
      toT: spans[i]!.toT,
    })),
    cities: content.nation.cities.map((c) => ({ cityId: c.cityId, name: c.name, x: c.x, y: c.y })),
  };
}

const fillCard = (content: GameContent, text: string, vars: { destination: string; issue: string }) =>
  fillTemplate(text, vars as Record<string, string>);

export async function journeyView(
  content: GameContent,
  c: CharacterDoc,
  j: JourneyDoc,
  now: number,
  opts: {
    city: CityDoc | null;
    session?: ClientSession | null;
    /** Inside `choose`: the card is being answered now (`heat`: what the answer moved). */
    chosenless?: boolean;
    heat?: { before: number; after: number } | null;
  } = { city: null },
): Promise<JourneyView> {
  const session = opts.session ?? null;
  const today = dayKey(now);
  const capital = capitalOf(content);
  const destCity = await (session
    ? City.findById(j.to).session(session).lean<CityDoc>()
    : City.findById(j.to).lean<CityDoc>());
  const issue = await firstIssueOf(j.to, destCity, today, session);
  const vars = {
    destination: destinationName(content, j.to),
    issue: issue ? (content.issue(issue.issueId)?.short ?? '') : 'the week',
  };
  const window = 10 * MINUTE;
  const othersQ = Journey.countDocuments({
    to: j.to,
    from: j.from,
    _id: { $ne: j._id },
    boardedAt: {
      $gte: new Date(j.boardedAt.getTime() - window),
      $lte: new Date(j.boardedAt.getTime() + window),
    },
  });
  const others = await (session ? othersQ.session(session) : othersQ);
  // Review 4 (ADR 0075 §4): the card's content is kept until its moment; `cardAt` is sent at once.
  const cardAt = cardAtOf(j);
  const ev = j.card && cardOpen(j, now) ? content.journeyEvent(j.card.eventId) : undefined;
  const values = wornStats(c, content, now);
  const successes = standingSuccesses(c, j.to);
  const named = namedStanding(content, j.to, successes);
  const bonus = standingBonus(successes, `${named.name} in ${content.city(j.to)?.name ?? j.to}`);
  const status: JourneyView['status'] = j.status === 'onTheWay' ? 'onTheWay' : 'arrived';
  const chosen = opts.chosenless ? null : (j.choice?.result ?? null);
  const city = content.city(j.to);
  const nc = content.nationCity(j.to);
  const art = city
    ? {
        rung: 'map-crop' as const,
        asset: assetView(content, nightAt(now).night ? city.map.night : city.map.day),
        x: nc?.arrival.x ?? 0.5,
        y: nc?.arrival.y ?? 0.5,
      }
    : null;
  const choiceLine = (r: JourneyCardResult) =>
    `${ev?.title ?? ''}: ${
      r.rewards.length === 0
        ? r.headline
        : r.rewards
            .map((x) =>
              x.id === 'opinion'
                ? `opinion +${x.amount} in ${x.note ?? vars.destination}`
                : x.id === 'points'
                  ? `+${x.amount} points on ${x.note ?? vars.issue}`
                  : x.id === 'heat'
                    ? `Heat ${x.amount > 0 ? '+' : '−'}${Math.abs(x.amount)}`
                    : `${x.amount > 0 ? '+' : ''}${x.amount} ${x.id === 'xp' ? 'XP' : x.id === 'fxp' ? 'Party XP' : x.id === 'iron' ? 'Iron' : 'Rested'}`,
            )
            .join(', ')
    }`;
  // Slice 5 (tech design §8.2, §10.4): rival ground's place line, the warning once, the day flags,
  // and the Heat a card moved (answered) or will move when slept through (unanswered).
  const hostile = ev?.deck === 'hostile';
  const difficulty = cardDifficulty(hostile ? 'hostile' : 'ordinary');
  const rivalTrip = !!j.rivalGround;
  const unanswered = !!ev && !j.choice && !opts.chosenless;
  let knockOns: NonNullable<JourneyView['arrival']>['knockOns'] | null = null;
  if (status === 'arrived') {
    // The warning once: no earlier journey of this character went to rival ground.
    let firstRival = false;
    if (rivalTrip) {
      const q = Journey.countDocuments({ characterId: c._id, rivalGround: true, n: { $lt: j.n } });
      firstRival = (await (session ? q.session(session) : q)) === 0;
    }
    const flags = flagsToday(c, j.to, today);
    const ignore = unanswered ? ev.ignoreEffects : undefined;
    if (ignore?.flag) flags[ignore.flag] = true;
    const stored = (j.choice as { heat?: { before: number; after: number } } | null)?.heat;
    let heat: { before: number; after: number } | undefined = stored ?? opts.heat ?? undefined;
    if (ignore?.heat) {
      const change = addHeat(heatTimerOf(c), now, heatRateOn(content, opts.city, c.factionId), ignore.heat);
      heat = { before: change.before, after: change.after };
    }
    knockOns = {
      ticket: j.fare?.total ?? 0,
      rivalGround: firstRival,
      flags: [
        ...(flags.watched ? (['watched'] as const) : []),
        ...(flags.warned ? (['warned'] as const) : []),
      ],
      ...(heat ? { heat } : {}),
    };
  }
  return {
    id: j._id.toHexString(),
    from: { cityId: j.from, name: content.city(j.from)?.name ?? j.from },
    to: { cityId: j.to, name: content.city(j.to)?.name ?? j.to },
    boardedAt: j.boardedAt.getTime(),
    arrivesAt: j.arrivesAt.getTime(),
    serverNow: now,
    status,
    firstJourney: j.n === 1,
    others,
    route: routeOf(content, j.from, j.to),
    map: {
      day: assetView(content, content.nation.map.day),
      night: assetView(content, content.nation.map.night),
    },
    night: nightAt(now),
    cardAt,
    card: ev
      ? {
          eventId: ev.id,
          title: ev.title,
          setup: fillCard(content, ev.setup, vars),
          ignore: fillCard(content, ev.ignore, vars),
          choices: ev.choices.map((ch): JourneyChoiceView => ({
            id: ch.id,
            title: ch.title,
            detail: fillCard(content, ch.detail, vars),
            stat: ch.stats && ch.stats[0] !== 'best' ? { stats: ch.stats as CheckStats } : null,
            chance: ch.stats
              ? journeyChoiceCheck({ stats: ch.stats, values, standingBonus: bonus, difficulty }).chance
              : null,
            cost: ch.cost?.iron ?? null,
            affordable: c.iron >= (ch.cost?.iron ?? 0),
            // Design §23.2: the checkpoint's papers depend on Heat and the record (no odds word).
            gated: !!ch.gate,
          })).concat([
            // Review 5 #7 (answers §7): the explicit put-aside row, last; the only way out but a choice.
            {
              id: JOURNEY_SET_ASIDE,
              title: hostile ? copy.travel.letItPass : copy.travel.sleepThrough,
              detail: hostile ? copy.travel.letItPassLine(ev.ignoreEffects) : copy.travel.nothingHappens,
              stat: null,
              chance: null,
              cost: null,
              affordable: true,
              setAside: true,
            },
          ]),
          chosen,
          deck: hostile ? 'hostile' : 'ordinary',
        }
      : null,
    arrival:
      status === 'arrived' && art && knockOns
        ? {
            stamp: 'Arrived',
            place:
              j.to === capital
                ? `${city!.name} · ${vars.destination}`
                : rivalTrip
                  ? // Review 4 (ADR 0076): a home city is one map; the line names the city alone.
                    copy.risk.rival.placeLine(city!.name)
                  : city!.name,
            headline:
              j.to === capital
                ? j.firstToCapital
                  ? copy.travel.inTheCapital
                  : city!.name
                : // eslint-disable-next-line no-restricted-properties -- the faction's home
                  j.to === c.homeCityId
                  ? 'Home'
                  : // Slice 7 (screens §10): the lake's first arrival (no success there yet).
                    city!.role === 'battleground' && successes === 0
                    ? copy.nation.clearwater.onTheLake
                    : city!.name,
            // Slice-4 fixes §8 (QA n2): never "Nothing happened" above a card still to answer.
            body: j.choice
              ? choiceLine(j.choice.result)
              : ev
                ? copy.travel.cardBelow
                : copy.travel.nothingHappened,
            cardLine: j.choice ? choiceLine(j.choice.result) : null,
            knockOns,
            art,
            landing: landingOf(content, j.to, rivalTrip),
          }
        : null,
    whileYouRide: {
      paperUnread:
        (await PaperEntry.countDocuments({ characterId: c._id, day: today, readAt: null })) > 0 ? 1 : 0,
      election: await politicsSummary(content, c, opts.city, now, today),
    },
  };
}

/** travel.journey: the open journey (on the way, or arrived and not yet closed), or null. */
export async function getJourney(
  content: GameContent,
  loaded: LoadedCharacter,
  now: number,
): Promise<JourneyView | null> {
  const c = loaded.doc;
  if (!c.journey) return null;
  const j = await Journey.findById(c.journey.id).lean<JourneyDoc>();
  if (!j || j.status === 'closed') return null;
  // Slice 6 (ADR 0040): *You and n others on this train*.
  const view = await journeyView(content, c, j, now, { city: loaded.city });
  return { ...view, fellows: await fellowsOn(c) };
}

// ---------------------------------------------------------------------------------------------
// The card (travel.choose): one choice per journey, rolled from the journey's seed.
// ---------------------------------------------------------------------------------------------

/** The weakest of a choice's stats, for a Partial's one-line reason. */
export function partialReason(
  content: GameContent,
  cityId: string,
  stats: readonly StatKey[],
  values: Record<StatKey, number>,
) {
  const name = (s: StatKey) => copy.statNames[s];
  const weak = [...stats].sort((a, b) => values[a] - values[b])[0]!;
  const place = content
    .city(cityId)
    ?.locations.find((l) =>
      l.actions.some((a) => a.type === 'training' && 'trains' in a && a.trains === weak),
    );
  const where = place ? (place.ref ?? place.name) : null;
  if (stats.length === 1)
    return weak === 'cha' ? copy.reason.statLowCha : copy.reason.statLow(name(weak), where);
  return copy.reason.statLowTwo(name(stats[0]!), name(stats[1]!), name(weak), where);
}

/**
 * Review 5 #7 (answers §7, GDD §14.10): the card's put-aside row, *Sleep through it* (the ordinary
 * deck: nothing happens) or *Let it pass* (the hostile deck: its `ignoreEffects` now, Heat at the
 * residence city's rate and the day flag in the destination). The outcome is the card's `ignore`
 * text, no stamp. Stored as the journey's choice (so the arrival applies nothing again) and marked
 * slept through, inside `choose`'s transaction and request key.
 */
async function setAsideInTx(a: {
  content: GameContent;
  session: ClientSession;
  loaded: LoadedCharacter;
  c: CharacterDoc;
  j: JourneyDoc;
  ev: NonNullable<ReturnType<GameContent['journeyEvent']>>;
  now: number;
  idempotencyKey: string;
}): Promise<JourneyCardResult> {
  const { content, session, loaded, c, j, ev, now } = a;
  const today = dayKey(now);
  const at = new Date(now);
  const hostile = ev.deck === 'hostile';
  const fx = hostile ? ev.ignoreEffects : undefined;
  const vars = { destination: destinationName(content, j.to), issue: 'the week' };
  const destCity = await City.findById(j.to).session(session).lean<CityDoc>();
  const issue = await firstIssueOf(j.to, destCity, today, session);
  if (issue) vars.issue = content.issue(issue.issueId)?.short ?? vars.issue;
  const heatChange = fx?.heat ? addHeat(heatTimerOf(c), now, heatRateOn(content, loaded.city, c.factionId), fx.heat) : null;
  const set: Record<string, unknown> = {};
  if (heatChange) set.heat = heatDoc(heatChange.timer);
  if (fx?.flag) set.flags = withFlag(c, j.to, today, fx.flag);
  let updated = c;
  if (Object.keys(set).length > 0) {
    const w = await Character.findOneAndUpdate(
      { _id: c._id, version: c.version, 'day.settled': today },
      { $set: set, $inc: { version: 1 } },
      { session, returnDocument: 'after', lean: true },
    );
    if (!w) throw new VersionConflict();
    updated = w;
  }
  const rewards: JourneyCardResult['rewards'] = [];
  if (heatChange && heatChange.after !== heatChange.before)
    rewards.push({ id: 'heat', amount: heatChange.after - heatChange.before });
  const heat = heatChange ? { before: heatChange.before, after: heatChange.after } : null;
  const jView = await journeyView(content, updated, j, now, { city: loaded.city, session, chosenless: true, heat });
  const result: JourneyCardResult = {
    kind: 'journeyCard',
    journeyId: j._id.toHexString(),
    eventId: ev.id,
    choiceId: JOURNEY_SET_ASIDE,
    stamp: null,
    headline: hostile ? copy.travel.letItPass : copy.travel.sleepThrough,
    body: fillCard(content, ev.ignore, vars),
    reason: null,
    rewards,
    opinion: null,
    points: null,
    quoted: false,
    ...(fx?.flag
      ? {
          flag: {
            flag: fx.flag,
            line: copy.risk.flags[fx.flag](content.city(j.to)?.name ?? j.to, '{until}'),
            until: dayStart(dayKey(at.getTime()) + 1),
          },
        }
      : {}),
    performedAt: at.toISOString(),
    idempotencyKey: a.idempotencyKey,
    character: toCharacterView(updated, now, content, loaded.editionReadAt, { city: loaded.city }),
    journey: jView,
  };
  const stored = await Journey.updateOne(
    { _id: j._id, choice: null, status: { $ne: 'closed' } },
    {
      $set: {
        choice: { choiceId: JOURNEY_SET_ASIDE, outcome: 'chosen', at, result, ...(heat ? { heat } : {}) },
        sleptThrough: true,
      },
    },
    { session },
  );
  if (stored.matchedCount === 0) {
    const again = await Journey.findById(j._id).session(session).lean<JourneyDoc>();
    if (again?.status === 'closed') throw new GameError('CARD_CLOSED');
    throw new GameError('ALREADY_CHOSEN', { choiceId: again?.choice?.choiceId ?? null }, 'CONFLICT');
  }
  return result;
}

export async function choose(deps: {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: { journeyId: string; choiceId: string; idempotencyKey: string };
}): Promise<JourneyCardResult> {
  const { content, input } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  return withRequestKey<JourneyCardResult>({
    characterId: loaded.doc._id,
    idempotencyKey: input.idempotencyKey,
    kind: 'travel.choose',
    input: { journeyId: input.journeyId, choiceId: input.choiceId },
    resettle: async () => {
      const again = await Character.findById(loaded.doc._id).lean<CharacterDoc>();
      if (again) await ensureSettled(content, again, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const at = new Date(now);
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      const j = Types.ObjectId.isValid(input.journeyId)
        ? await Journey.findById(input.journeyId).session(session).lean<JourneyDoc>()
        : null;
      if (!j || !j.characterId.equals(c._id)) throw new GameError('NO_JOURNEY', {}, 'NOT_FOUND');
      if (!j.card) throw new GameError('NO_CARD');
      if (j.status === 'closed') throw new GameError('CARD_CLOSED');
      if (j.choice) throw new GameError('ALREADY_CHOSEN', { choiceId: j.choice.choiceId }, 'CONFLICT');
      // Review 4 (ADR 0075 §4): never before the card's moment; nothing is written, and the request
      // key is not kept (`withRequestKey` stores a key only on success), so the same key works later.
      if (!cardOpen(j, now)) throw new GameError('CARD_NOT_YET', { at: cardAtOf(j) });
      const ev = content.journeyEvent(j.card.eventId)!;
      if (input.choiceId === JOURNEY_SET_ASIDE) {
        return setAsideInTx({ content, session, loaded, c, j, ev, now, idempotencyKey: input.idempotencyKey });
      }
      const ch = ev.choices.find((x) => x.id === input.choiceId);
      if (!ch) throw new GameError('UNKNOWN_CHOICE', { choiceId: input.choiceId }, 'BAD_REQUEST');
      const cost = ch.cost?.iron ?? 0;
      if (c.iron < cost) throw new GameError('NOT_ENOUGH_IRON', { iron: c.iron, cost });

      const values = wornStats(c, content, now);
      const successes = standingSuccesses(c, j.to);
      const named = namedStanding(content, j.to, successes);
      const bonus = standingBonus(successes, `${named.name} in ${content.city(j.to)?.name ?? j.to}`);
      // Slice 5 (tech design §8.2): the hostile deck checks at 14; the checkpoint's gate is Cool and
      // Clean (Heat 0–24, no live mark); Heat at the residence city's rate.
      const hostile = ev.deck === 'hostile';
      const rateOn = heatRateOn(content, loaded.city, c.factionId);
      const heatNow = projectHeat(heatTimerOf(c), now, rateOn).value;
      const spec: JourneyChoiceSpec = {
        id: ch.id,
        ...(ch.stats ? { stats: ch.stats } : {}),
        ...(ch.cost ? { cost: ch.cost } : {}),
        success: { rewards: ch.success.rewards },
        ...(ch.partial ? { partial: { rewards: ch.partial.rewards } } : {}),
        ...(ch.gate ? { gate: ch.gate } : {}),
      };
      const r = resolveJourneyChoice({
        choice: spec,
        values,
        standingBonus: bonus,
        rng: createRng(`${j.seed}:card`),
        difficulty: cardDifficulty(hostile ? 'hostile' : 'ordinary'),
        ...(ch.gate ? { gateHolds: coolAndClean(heatNow, liveMarks(marksOf(c), today, fadeDaysFor(c.factionId)).length) } : {}),
      });
      const text = r.branch === 'stopped' || r.outcome === 'partial' ? ch.partial!.text : ch.success.text;
      const capital = capitalOf(content);
      const destCity = await City.findById(j.to).session(session).lean<CityDoc>();
      const vars = {
        destination: destinationName(content, j.to),
        issue: 'the week',
      };
      const issue = await firstIssueOf(j.to, destCity, today, session);
      if (issue) vars.issue = content.issue(issue.issueId)?.short ?? vars.issue;
      const rw = r.rewards;

      // The destination's meter (the station district in the capital): fixed amounts (design §19 Q11).
      let opinion: JourneyCardResult['opinion'] = null;
      const who = { _id: c._id, name: c.name, factionId: c.factionId, level: c.level };
      const placeId = j.to === capital ? (capitalStation(content).quarterId ?? j.to) : j.to;
      // No opinion or Issue points on a hostile card (design §11.4).
      if (!hostile && (rw.opinion ?? 0) > 0) {
        let before: OpinionShares;
        let after: OpinionShares;
        let applied: number;
        if (placeId !== j.to) {
          const d = (await District.findById(placeId).session(session).lean<DistrictDoc>())!;
          const op = applyPersuasion(d.opinion, { factionId: c.factionId, swing: rw.opinion! });
          [before, after, applied] = [d.opinion, op.shares, op.applied];
          await District.updateOne({ _id: placeId }, { $set: { opinion: op.shares } }, { session });
        } else {
          before = destCity?.opinion ?? content.city(j.to)!.baselineOpinion;
          const op = applyPersuasion(before, {
            factionId: c.factionId,
            swing: rw.opinion!,
            homeFactionId: content.city(j.to)?.homeFactionId,
          });
          [after, applied] = [op.shares, op.applied];
          await City.updateOne({ _id: j.to }, { $set: { opinion: op.shares } }, { session });
        }
        if (applied > 0) {
          await writeLedger(
            content,
            [
              {
                cityId: j.to,
                placeId,
                factionId: c.factionId,
                swing: applied,
                kind: 'journey',
                characterId: c._id,
                ref: j._id.toHexString(),
                day: today,
                at,
              },
            ],
            session,
          );
          await addInfluence(content, session, {
            c: who,
            cityId: j.to,
            placeId,
            points: applied,
            day: today,
            at,
          });
        }
        opinion = {
          placeName: vars.destination,
          factionId: c.factionId,
          before: before[c.factionId],
          after: after[c.factionId],
        };
      }

      // Points on the destination's first live Issue.
      let points: JourneyCardResult['points'] = null;
      if (!hostile && (rw.momentum ?? 0) > 0 && issue) {
        const doc = await IssueModel.findOneAndUpdate(
          { _id: issue._id, status: 'live' },
          { $inc: { [`momentum.${c.factionId}`]: rw.momentum! } },
          { session, returnDocument: 'after', lean: true },
        );
        if (!doc) throw new DayChanged();
        await addPoints(session, {
          c: who,
          cityId: j.to,
          placeId: doc.districtId ?? j.to,
          docId: doc._id,
          points: rw.momentum!,
          at,
        });
        points = {
          issueName: content.issue(doc.issueId)?.name ?? doc.issueId,
          added: rw.momentum!,
          totals: { ...doc.momentum },
          leader: leaderOf(doc.momentum),
        };
      }

      // The character: the stake, XP and Party XP, Rested banked to the cap, the tally, the quote.
      const cap = restedCapToday(content, loaded.city, today, c.room, c.factionId, homeCapOf(c));
      const energy = projectEnergy(energyState(c), now, ENERGY.max, cap);
      const rested = Math.min(cap, energy.rested + (rw.rested ?? 0));
      const gains = applyGains(progressOf(c), { xp: rw.xp ?? 0, fxp: rw.fxp ?? 0, pc: 0 });
      const iron = (rw.iron ?? 0) - cost;
      const tally = addToTally(c.today, today, {
        xp: rw.xp ?? 0,
        fxp: rw.fxp ?? 0,
        iron,
        opinion: opinion ? Math.max(0, opinion.after - opinion.before) : 0,
      });
      // Slice 5: the card's Heat (through `addHeat`) and its day flag in the destination today.
      const heatChange = rw.heat ? addHeat(heatTimerOf(c), now, rateOn, rw.heat) : null;
      const risk: Record<string, unknown> = {};
      if (heatChange) risk.heat = heatDoc(heatChange.timer);
      if (rw.flag) risk.flags = withFlag(c, j.to, today, rw.flag);
      const updated = await Character.findOneAndUpdate(
        { _id: c._id, version: c.version, 'day.settled': today, iron: { $gte: cost } },
        {
          $set: {
            xp: gains.next.xp,
            level: gains.next.level,
            fxp: gains.next.fxp,
            rank: gains.next.rank,
            pc: gains.next.pc,
            statPointsPending: gains.next.statPointsPending,
            'energy.value': energy.value,
            'energy.updatedAt': new Date(energy.updatedAt),
            rested,
            today: tally,
            ...(rw.quoted ? { lastQuoted: { day: today, issueId: issue?.issueId ?? '' } } : {}),
            ...risk,
          },
          $inc: { iron, version: 1 },
        },
        { session, returnDocument: 'after', lean: true },
      );
      if (!updated) throw new VersionConflict();

      const rewards: JourneyCardResult['rewards'] = [];
      if (rw.xp) rewards.push({ id: 'xp', amount: rw.xp });
      if (rw.fxp) rewards.push({ id: 'fxp', amount: rw.fxp });
      if (iron !== 0) rewards.push({ id: 'iron', amount: iron });
      if (opinion && rw.opinion) rewards.push({ id: 'opinion', amount: rw.opinion, note: vars.destination });
      if (points) rewards.push({ id: 'points', amount: points.added, note: points.issueName });
      if (rw.rested) rewards.push({ id: 'rested', amount: rested - energy.rested });
      if (heatChange && heatChange.after !== heatChange.before)
        rewards.push({ id: 'heat', amount: heatChange.after - heatChange.before });
      const statsUsed = ch.stats && ch.stats[0] !== 'best' ? (ch.stats as StatKey[]) : [];
      const resultBase = {
        kind: 'journeyCard' as const,
        journeyId: j._id.toHexString(),
        eventId: ev.id,
        choiceId: ch.id,
        stamp: r.outcome === 'chosen' ? null : r.outcome,
        headline: fillCard(content, text.headline, vars),
        body: fillCard(content, text.body, vars),
        reason:
          r.outcome === 'partial' && statsUsed.length > 0
            ? partialReason(content, j.to, statsUsed, values)
            : null,
        rewards,
        opinion,
        points,
        quoted: !!rw.quoted,
        ...(rw.flag
          ? {
              flag: {
                flag: rw.flag,
                // Review 4 (answers §4.2): `{until}` is rendered by the client in the player's clock.
                line: copy.risk.flags[rw.flag](content.city(j.to)?.name ?? j.to, '{until}'),
                until: dayStart(dayKey(at.getTime()) + 1),
              },
            }
          : {}),
        performedAt: at.toISOString(),
        idempotencyKey: input.idempotencyKey,
        character: toCharacterView(updated, now, content, loaded.editionReadAt, { city: loaded.city }),
      };
      const jView = await journeyView(content, updated, j, now, {
        city: loaded.city,
        session,
        chosenless: true,
        heat: heatChange ? { before: heatChange.before, after: heatChange.after } : null,
      });
      const result: JourneyCardResult = { ...resultBase, journey: jView };
      const stored = await Journey.updateOne(
        { _id: j._id, choice: null, status: { $ne: 'closed' } },
        {
          $set: {
            choice: {
              choiceId: ch.id,
              outcome: r.outcome,
              at,
              result: { ...result, journey: jView },
              // The arrival's Heat knock-on (`journeys.choice` is Mixed).
              ...(heatChange ? { heat: { before: heatChange.before, after: heatChange.after } } : {}),
            },
          },
        },
        { session },
      );
      if (stored.matchedCount === 0) {
        const again = await Journey.findById(j._id).session(session).lean<JourneyDoc>();
        if (again?.status === 'closed') throw new GameError('CARD_CLOSED');
        throw new GameError('ALREADY_CHOSEN', { choiceId: again?.choice?.choiceId ?? null }, 'CONFLICT');
      }
      return result;
    },
  });
}

// ---------------------------------------------------------------------------------------------
// Continue on the arrival modal (travel.close): idempotent.
// ---------------------------------------------------------------------------------------------

/** `flags[]` pruned to today, with `flag` in `cityId` today (once). */
export function withFlag(
  c: Pick<CharacterDoc, 'flags'>,
  cityId: string,
  today: number,
  flag: 'watched' | 'warned',
): Array<{ cityId: string; day: number; flag: 'watched' | 'warned' }> {
  const kept = flagsPruned(c, today).filter((f) => !(f.cityId === cityId && f.flag === flag));
  return [...kept, { cityId, day: today, flag }];
}

/**
 * Close an arrived journey inside the caller's transaction (tech design §8.2). The journey's
 * `status: 'arrived' → 'closed'` transition is the guard, so an unanswered card's ignore effects
 * (Heat at the residence city's rate, a day flag in the destination) apply exactly once, whoever
 * closes it: Continue, a new boarding, or the first act in the destination. The character's pointer
 * is cleared when it names this journey. Returns the character as written, or `c` unchanged when
 * there was nothing to write; a version miss throws `VersionConflict`.
 */
async function closeJourneyInTx(
  content: GameContent,
  session: ClientSession,
  c: CharacterDoc,
  journeyId: Types.ObjectId,
  now: number,
  residenceCity?: CityDoc | null,
): Promise<CharacterDoc> {
  const at = new Date(now);
  // Slept through is decided on the document as it is closed, not on an earlier read: an answer
  // committed before this write is an answer (QA slice 4 n1). A card still unanswered closes first;
  // anything else (no card, or a choice) closes as it is: not slept through, unless the choice was the
  // put-aside row (review 5 #7, already marked and its effects already applied).
  const slept = await Journey.findOneAndUpdate(
    { _id: journeyId, status: 'arrived', card: { $ne: null }, choice: null },
    { $set: { status: 'closed', closedAt: at, sleptThrough: true } },
    { session, returnDocument: 'after', lean: true },
  );
  if (!slept) {
    await Journey.updateOne({ _id: journeyId, status: 'arrived' }, { $set: { status: 'closed', closedAt: at } }, { session });
  }
  const set: Record<string, unknown> = {};
  const fx = slept?.card ? content.journeyEvent(slept.card.eventId)?.ignoreEffects : undefined;
  if (slept && fx) {
    const today = dayKey(now);
    if (fx.heat) {
      const city =
        residenceCity !== undefined
          ? residenceCity
          : await City.findById(residenceCityId(c)).session(session).lean<CityDoc>();
      set.heat = heatDoc(addHeat(heatTimerOf(c), now, heatRateOn(content, city, c.factionId), fx.heat).timer);
    }
    if (fx.flag) set.flags = withFlag(c, slept.to, today, fx.flag);
  }
  if (c.journey && new Types.ObjectId(c.journey.id).equals(journeyId)) set.journey = null;
  if (Object.keys(set).length === 0) return c;
  const updated = await Character.findOneAndUpdate(
    { _id: c._id, version: c.version },
    { $set: set, $inc: { version: 1 } },
    { session, returnDocument: 'after', lean: true },
  );
  if (!updated) throw new VersionConflict();
  return updated;
}

/**
 * Close an arrived journey whose destination is the character's city (its unanswered card's ignore
 * effects apply), inside the caller's transaction. Returns the character as written (version + 1)
 * or `c` unchanged when nothing was closed.
 *
 * For `action.perform` and `mission.start` (tech design §8.2 step 2.2), right after the character
 * is re-read in the transaction: the street's rolls then see the card's Heat and flag. A version
 * miss throws `VersionConflict` (the caller's retry re-reads).
 */
export async function closeArrivalInTx(
  content: GameContent,
  session: ClientSession,
  c: CharacterDoc,
  now: number,
): Promise<CharacterDoc> {
  if (c.journey?.status !== 'arrived' || c.journey.to !== c.cityId) return c;
  return closeJourneyInTx(content, session, c, new Types.ObjectId(c.journey.id), now);
}

export async function close(deps: {
  user: SessionUser;
  content: GameContent;
  now: number;
  input: { journeyId: string };
}): Promise<{ landing: Landing; character: CharacterView }> {
  const { content, now } = deps;
  const loaded = await loadCharacter(deps.user, content, now);
  const c = loaded.doc;
  const j = Types.ObjectId.isValid(deps.input.journeyId)
    ? await Journey.findById(deps.input.journeyId).lean<JourneyDoc>()
    : null;
  if (!j || !j.characterId.equals(c._id)) throw gameError('NOT_FOUND', 'NO_JOURNEY');
  if (j.status === 'onTheWay')
    throw gameError('PRECONDITION_FAILED', 'IN_TRANSIT', { arrivesAt: j.arrivesAt.getTime() });
  let fresh: CharacterDoc | null = null;
  for (let attempt = 1; ; attempt++) {
    try {
      fresh = await inTransaction(async (session) => {
        const cur = await Character.findById(c._id).session(session).lean<CharacterDoc>();
        if (!cur) throw new Error('character disappeared');
        return closeJourneyInTx(content, session, cur, j._id, now, loaded.city);
      });
      break;
    } catch (err) {
      if (err instanceof VersionConflict && attempt < MAX_ATTEMPTS) continue;
      throw err;
    }
  }
  return {
    landing: landingOf(content, j.to, !!j.rivalGround),
    character: toCharacterView(fresh, now, content, loaded.editionReadAt, { city: loaded.city }),
  };
}
