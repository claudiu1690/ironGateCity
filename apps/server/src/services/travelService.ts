import { randomBytes } from 'node:crypto';
import type { GameContent } from '@irongate/content';
import { copy } from '@irongate/content/copy';
import { Character, City, District, IssueModel, Journey, PaperEntry } from '@irongate/db';
import type { CharacterDoc, CityDoc, DistrictDoc, IssueDoc, JourneyDoc } from '@irongate/db';
import {
  ENERGY,
  TRAVEL,
  addToTally,
  applyGains,
  applyPersuasion,
  averageShares,
  councilDay,
  createRng,
  dayKey,
  dayStart,
  destinationState,
  drawJourneyCard,
  fare,
  fillTemplate,
  isNight,
  journeyChoiceCheck,
  legMinutes,
  projectEnergy,
  resolveJourneyChoice,
  standingBonus,
  weekOf,
} from '@irongate/rules';
import type {
  BoardResult,
  CharacterView,
  CheckStats,
  DestinationState,
  Fare,
  GameErrorReason,
  JourneyCardResult,
  JourneyChoiceSpec,
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
import type { LoadedCharacter } from './dayService';
import { addInfluence, addPoints, writeLedger } from './ledger';
import { dayModifiers, restedCapToday } from './modifiers';
import { politicsSummary } from './politicsService';
import { withRequestKey } from './requestKey';
import { residenceCityId } from './residence';
import { DayChanged, VersionConflict, inTransaction } from './txn';
import {
  assetView,
  energyState,
  namedStanding,
  standingSuccesses,
  toCharacterView,
  wornStats,
} from './views';
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

/** Where Continue on the arrival modal lands: the station district in the capital, else the city. */
export function landingOf(content: GameContent, cityId: string): Landing {
  if (cityId !== capitalOf(content)) return { cityId };
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

/** ADR 0030: the ticket from a city: its ticket sources of the day (Tram Subsidy, the Fare Hike). */
export function fareFrom(content: GameContent, origin: CityDoc | null, day: number): Fare {
  return fare(dayModifiers(content, origin, day));
}

/** Design §2.3: the destination's state for this character standing in `here`. */
export function destinationOf(
  content: GameContent,
  c: Pick<CharacterDoc, 'level' | 'factionId'>,
  here: string,
  to: string,
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
  });
}

/** Why a board is refused (in this order), or null. */
export function boardRefusal(
  content: GameContent,
  c: Pick<CharacterDoc, 'level' | 'factionId' | 'iron' | 'cityId' | 'journey'>,
  to: string,
  total: number,
): { reason: GameErrorReason; data: Record<string, unknown> } | null {
  if (c.level < TRAVEL.level) return { reason: 'LEVEL_TOO_LOW', data: { need: TRAVEL.level } };
  if (c.journey?.status === 'onTheWay')
    return { reason: 'IN_TRANSIT', data: { arrivesAt: new Date(c.journey.arrivesAt).getTime() } };
  const state = destinationOf(content, c, c.cityId, to);
  if (state === 'here') return { reason: 'ALREADY_THERE', data: {} };
  if (state === 'rival' || state === 'later') return { reason: 'DESTINATION_LOCKED', data: { lock: state } };
  if (c.iron < total) return { reason: 'NOT_ENOUGH_IRON', data: { iron: c.iron, cost: total } };
  return null;
}

/** The Trains card at the capital's station: the open destinations, their minutes and fares. */
export function trainsFrom(
  content: GameContent,
  c: CharacterDoc,
  origin: CityDoc | null,
  day: number,
): NonNullable<LocationView['trains']> {
  const here = c.cityId;
  const f = fareFrom(content, origin, day);
  return {
    destinations: content.nation.cities
      .filter((n) => n.cityId !== here && destinationOf(content, c, here, n.cityId) !== 'later')
      .filter((n) => destinationOf(content, c, here, n.cityId) !== 'rival')
      .map((n) => ({
        cityId: n.cityId,
        name: n.name,
        minutes: legMinutes(here, n.cityId, minutesMap(content), capitalOf(content)),
        fare: { base: f.base, lines: f.lines, total: f.total },
        canBoard: boardRefusal(content, c, n.cityId, f.total) === null,
      })),
  };
}

// ---------------------------------------------------------------------------------------------
// The nation map (travel.nation).
// ---------------------------------------------------------------------------------------------

export async function nationView(content: GameContent, c: CharacterDoc, now: number): Promise<NationView> {
  const today = dayKey(now);
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
      ? destinationOf(content, c, here, n.cityId)
      : c.level < TRAVEL.level
        ? 'level'
        : n.service === 'later'
          ? 'later'
          : destinationOf(content, c, c.journey!.to, n.cityId) === 'here'
            ? 'here'
            : destinationOf(content, c, c.journey!.to, n.cityId);
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
      ? boardRefusal(content, c, n.cityId, f.total)
      : { reason: 'IN_TRANSIT' as const, data: {} };
    const locked = state === 'rival' || state === 'later';
    return {
      cityId: n.cityId,
      name: n.name,
      x: n.x,
      y: n.y,
      n: idx + 1,
      line,
      state,
      lockWord: state === 'rival' ? 'rival ground' : state === 'later' ? 'no service yet' : null,
      minutes:
        here && n.cityId !== here && n.service === 'open'
          ? legMinutes(here, n.cityId, minutesMap(content), capital)
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
    isNight: isNight(now),
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
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      const origin = await City.findById(c.cityId).session(session).lean<CityDoc>();
      const f = fareFrom(content, origin, today);
      const refusal = boardRefusal(content, c, input.to, f.total);
      if (refusal) throw new GameError(refusal.reason, refusal.data);

      // An arrived journey whose modal was never closed is closed now (slept through if unanswered).
      if (c.journey?.status === 'arrived') {
        const prev = await Journey.findById(c.journey.id).session(session).lean<JourneyDoc>();
        await Journey.updateOne(
          { _id: c.journey.id, status: 'arrived' },
          { $set: { status: 'closed', closedAt: new Date(now), sleptThrough: !!prev?.card && !prev.choice } },
          { session },
        );
      }
      const seed = randomBytes(16).toString('hex');
      const deck = content.journeyDeck();
      const firstId = content.journeyEvents.find((e) => e.first)!.id;
      const made = c.journeysMade ?? 0;
      const card = drawJourneyCard({
        first: made === 0,
        seen: c.journeyDeck?.seen ?? [],
        deck,
        firstId,
        rng: createRng(seed),
      });
      const minutes = legMinutes(c.cityId, input.to, minutesMap(content), capitalOf(content));
      const id = new Types.ObjectId();
      const boardedAt = new Date(now);
      const arrivesAt = new Date(now + minutes * MINUTE);
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
            card: card.eventId ? { eventId: card.eventId } : null,
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
        {
          $inc: { iron: -f.total, version: 1, journeysMade: 1 },
          $set: { journey: pointer, journeyDeck: { seen: card.seen } },
        },
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

const fillCard = (content: GameContent, text: string, vars: { destination: string; issue: string }) =>
  fillTemplate(text, vars as Record<string, string>);

export async function journeyView(
  content: GameContent,
  c: CharacterDoc,
  j: JourneyDoc,
  now: number,
  opts: { city: CityDoc | null; session?: ClientSession | null; chosenless?: boolean } = { city: null },
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
  const ev = j.card ? content.journeyEvent(j.card.eventId) : undefined;
  const values = wornStats(c, content);
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
        asset: assetView(content, isNight(now) ? city.map.night : city.map.day),
        x: nc?.arrival.x ?? 0.5,
        y: nc?.arrival.y ?? 0.5,
      }
    : null;
  const choiceLine = (r: JourneyCardResult) =>
    `${ev?.title ?? ''}: ${r.rewards
      .map((x) =>
        x.id === 'opinion'
          ? `opinion +${x.amount} in ${x.note ?? vars.destination}`
          : x.id === 'points'
            ? `+${x.amount} points on ${x.note ?? vars.issue}`
            : `${x.amount > 0 ? '+' : ''}${x.amount} ${x.id === 'xp' ? 'XP' : x.id === 'fxp' ? 'Party XP' : x.id === 'iron' ? 'Iron' : 'Rested'}`,
      )
      .join(', ')}`;
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
    card: ev
      ? {
          eventId: ev.id,
          title: ev.title,
          setup: fillCard(content, ev.setup, vars),
          ignore: fillCard(content, ev.ignore, vars),
          choices: ev.choices.map((ch) => ({
            id: ch.id,
            title: ch.title,
            detail: fillCard(content, ch.detail, vars),
            stat: ch.stats && ch.stats[0] !== 'best' ? { stats: ch.stats as CheckStats } : null,
            chance: ch.stats
              ? journeyChoiceCheck({ stats: ch.stats, values, standingBonus: bonus }).chance
              : null,
            cost: ch.cost?.iron ?? null,
            affordable: c.iron >= (ch.cost?.iron ?? 0),
          })),
          chosen,
        }
      : null,
    arrival:
      status === 'arrived' && art
        ? {
            stamp: 'Arrived',
            place: j.to === capital ? `${city!.name} · ${vars.destination}` : city!.name,
            headline:
              j.to === capital
                ? j.firstToCapital
                  ? copy.travel.inTheCapital
                  : city!.name
                : // eslint-disable-next-line no-restricted-properties -- the faction's home
                  j.to === c.homeCityId
                  ? 'Home'
                  : city!.name,
            body: j.choice ? choiceLine(j.choice.result) : copy.travel.nothingHappened,
            cardLine: j.choice ? choiceLine(j.choice.result) : null,
            knockOns: {
              ticket: j.fare.total,
              heraldVisitor: j.to === capital && residenceCityId(c) !== capital,
            },
            art,
            landing: landingOf(content, j.to),
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
  return journeyView(content, c, j, now, { city: loaded.city });
}

// ---------------------------------------------------------------------------------------------
// The card (travel.choose): one choice per journey, rolled from the journey's seed.
// ---------------------------------------------------------------------------------------------

/** The weakest of a choice's stats, for a Partial's one-line reason. */
function partialReason(
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
      const ev = content.journeyEvent(j.card.eventId)!;
      const ch = ev.choices.find((x) => x.id === input.choiceId);
      if (!ch) throw new GameError('UNKNOWN_CHOICE', { choiceId: input.choiceId }, 'BAD_REQUEST');
      const cost = ch.cost?.iron ?? 0;
      if (c.iron < cost) throw new GameError('NOT_ENOUGH_IRON', { iron: c.iron, cost });

      const values = wornStats(c, content);
      const successes = standingSuccesses(c, j.to);
      const named = namedStanding(content, j.to, successes);
      const bonus = standingBonus(successes, `${named.name} in ${content.city(j.to)?.name ?? j.to}`);
      const spec: JourneyChoiceSpec = {
        id: ch.id,
        ...(ch.stats ? { stats: ch.stats } : {}),
        ...(ch.cost ? { cost: ch.cost } : {}),
        success: { rewards: ch.success.rewards },
        ...(ch.partial ? { partial: { rewards: ch.partial.rewards } } : {}),
      };
      const r = resolveJourneyChoice({
        choice: spec,
        values,
        standingBonus: bonus,
        rng: createRng(`${j.seed}:card`),
      });
      const text = r.outcome === 'partial' ? ch.partial!.text : ch.success.text;
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
      if ((rw.opinion ?? 0) > 0) {
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
      if ((rw.momentum ?? 0) > 0 && issue) {
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
      const cap = restedCapToday(content, loaded.city, today, c.room);
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
        performedAt: at.toISOString(),
        idempotencyKey: input.idempotencyKey,
        character: toCharacterView(updated, now, content, loaded.editionReadAt, { city: loaded.city }),
      };
      const jView = await journeyView(content, updated, j, now, {
        city: loaded.city,
        session,
        chosenless: true,
      });
      const result: JourneyCardResult = { ...resultBase, journey: jView };
      const stored = await Journey.updateOne(
        { _id: j._id, choice: null, status: { $ne: 'closed' } },
        {
          $set: {
            choice: { choiceId: ch.id, outcome: r.outcome, at, result: { ...result, journey: jView } },
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
  await inTransaction(async (session) => {
    await Journey.updateOne(
      { _id: j._id, status: 'arrived' },
      { $set: { status: 'closed', closedAt: new Date(now), sleptThrough: !!j.card && !j.choice } },
      { session },
    );
    await Character.updateOne(
      { _id: c._id, 'journey.id': j._id },
      { $set: { journey: null }, $inc: { version: 1 } },
      { session },
    );
  });
  const fresh = (await Character.findById(c._id).lean<CharacterDoc>())!;
  return {
    landing: landingOf(content, j.to),
    character: toCharacterView(fresh, now, content, loaded.editionReadAt, { city: loaded.city }),
  };
}
