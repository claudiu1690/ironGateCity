import type { GameContent } from '@irongate/content';
import {
  Award,
  Candidacy,
  Character,
  City,
  InfluenceLedger,
  Election,
  OfficeTerm,
  RuleBallot,
  isDuplicateKeyError,
} from '@irongate/db';
import type {
  BallotLine,
  CandidacyDoc,
  CharacterDoc,
  CityDoc,
  ElectionDoc,
  OfficeTermDoc,
  RuleBallotDoc,
  UnrestPrizeDoc,
} from '@irongate/db';
import {
  COUNCIL,
  MORALE,
  UNREST_PRIZE,
  applyDrift,
  applyMoraleLoss,
  applyPersuasion,
  boundaryWork,
  councilDay,
  councilKey,
  countSeats,
  createRng,
  dayKey,
  decideHomeRule,
  drawNpcSlate,
  electionKey,
  freezeList,
  isMonday,
  moraleState,
  moraleTransition,
  prizeWinners,
  ruleWindowFrom,
  unrestEntry,
  weekOf,
} from '@irongate/rules';
import type { DayKey, FactionId, NpcSlateEntry, OpinionShares, SeatRule } from '@irongate/rules';
import { ensureFixtures } from './eventPlace';
import { resolveOpenBefore } from './eventService';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { captureException } from '../sentry';
import { bootstrapBattleground, isOneMeterBattleground, processBattlegroundBoundary } from './battlegroundDay';
import { bootstrapCapital, processCapitalBoundary } from './capitalDay';
import {
  AlreadySettled,
  activeMembersFilter,
  cityDayHooks,
  countLines,
  newSeed,
  turnoutOf,
} from './cityDayCore';
import { governorAtCount } from './governorService';
import { bootstrapIssues, drawWeek, heroesStep, issuesStep } from './issuesDay';
import { cycleKeyOf, writeLedger } from './ledger';
import type { LedgerRowInput } from './ledger';
import { placesOf } from './residence';
import { cardsFor, homeCards, openBallotDoc, setBallotStep, tallyRules } from './ruleBallot';
import { inTransaction } from './txn';
import { convertCityVoting } from './votingConversion';

export { AlreadySettled, activeMembersFilter, cityDayHooks } from './cityDayCore';

/**
 * The city's day (ADR 0017, tech design §7): every world boundary of a council city, settled once,
 * boundary by boundary, by the Agenda job or by the first request that needs the city. Each
 * boundary is one transaction guarded by `world.settledDay: d − 1`; every derived document has a
 * natural unique key, so a second runner can never duplicate one. The decisions are pure functions
 * in `@irongate/rules`; this file reads and writes. Slice 4: the capital's day is capitalDay.ts;
 * every city runs the Issues step on Mondays and names its heroes at a count (issuesDay.ts).
 */

const withBranch = (cityId: string) => !cityDayHooks.noBranchMotion?.has(cityId);

function councilSpec(content: GameContent, cityId: string) {
  const city = content.city(cityId);
  if (!city?.council || !city.homeFactionId) throw new Error(`city "${cityId}" has no council`);
  const faction = content.faction(city.homeFactionId);
  return { city, offset: city.council.offset, home: city.homeFactionId, faction };
}

/** The NPC lines of a list (a bootstrap on a polling day, a missing election, or the set's fill). */
function npcBallot(
  content: GameContent,
  slate: readonly NpcSlateEntry[],
  first: number,
  n: number,
  factionId: string,
): BallotLine[] {
  return slate.slice(0, n).map((s, i) => {
    const c = content.candidate(s.npcId);
    return {
      key: `n:${s.npcId}`,
      factionId: factionId as BallotLine['factionId'],
      kind: 'npc',
      npcId: s.npcId,
      name: c?.name ?? s.npcId,
      ...(c?.rule ? { rule: c.rule } : {}),
      order: first + i,
    };
  });
}

/**
 * §7.3; the voting rework (tech design §6.1): a city with no `world` gets, in one transaction, a
 * sitting NPC council (the top seven of the slate, each with its content rule), rule ballot k (`open`,
 * or `set` on days 2–4 over the NPC council), card 1 in force for the cycle, the current election in
 * the phase of the day, and (slice 4) the week's Issues. Written converted (`world.voting: 2`).
 */
async function bootstrap(content: GameContent, cityId: string, now: number, session: ClientSession) {
  const spec = councilSpec(content, cityId);
  const today = dayKey(now);
  const cal = councilDay(today, spec.offset);
  const k = cal.cycle;
  const c0 = cal.council.fromDay;
  const at = new Date(now);
  const slate = content.slateOf(cityId);
  const state = await City.findById(cityId).session(session).lean<CityDoc>();
  if (state?.world) throw new AlreadySettled();
  const opinion = state?.opinion ?? spec.city.baselineOpinion;

  await OfficeTerm.insertMany(
    slate.slice(0, COUNCIL.seats).map((s, i) => ({
      cityId,
      councilKey: councilKey(cityId, k),
      electionId: electionKey(cityId, k - 1),
      seat: i + 1,
      factionId: spec.home,
      districtId: null,
      vacatedDay: null,
      fromDay: c0,
      toDay: c0 + COUNCIL.termDays,
      holder: { kind: 'npc', npcId: s.id, name: s.name },
      place: i + 1,
      total: s.profile,
      completed: false,
      rule: s.rule ?? null,
    })),
    { session },
  );

  // Ballot k: open on days 0–1; on days 2–4 set over the NPC council (no player could have moved).
  const unrest = moraleState(opinion[spec.home]) === 'unrest';
  const seats = slate.slice(0, COUNCIL.seats).map(
    (s, i): SeatRule => ({
      seat: i + 1,
      holder: 'npc',
      name: s.name,
      npcId: s.id,
      factionId: spec.home,
      total: s.profile,
      rule: s.rule ?? null,
    }),
  );
  const cards = homeCards(content, cityId, seats, unrest);
  const set = cal.cycleDay >= 2;
  await RuleBallot.create(
    [{ ...openBallotDoc(cityId, k, c0), ...(set ? { status: 'set', cards, unrest } : {}) }],
    { session },
  );
  // The rule in force for the cycle: card 1 of the NPC council's ballot (the branch's default).
  const inForce = {
    id: homeCards(content, cityId, seats, false)[0]!.ordinanceId,
    fromDay: c0,
    toDay: c0 + COUNCIL.ordinanceDays,
    paperId: null,
  };

  const seed = newSeed(cityId, k);
  const npcSlate = drawNpcSlate(
    slate.map((s) => ({ npcId: s.id, profile: s.profile })),
    createRng(seed),
  );
  await Election.create(
    [
      {
        _id: electionKey(cityId, k),
        cityId,
        kind: 'home',
        placeId: cityId,
        factionId: spec.home,
        cycle: k,
        nominationsFrom: cal.election.nominationsFrom,
        pollsFrom: cal.election.pollsFrom,
        countDay: cal.election.countDay,
        status: cal.phase === 'polling' ? 'polling' : 'nominations',
        seed,
        npcSlate,
        filed: 0,
        // A polling day: no player could have stood, so the list is the nine locals.
        ballot:
          cal.phase === 'polling' ? npcBallot(content, npcSlate, 0, COUNCIL.slateSize, spec.home) : null,
        ballots: 0,
        result: null,
        closedAt: cal.phase === 'polling' ? at : null,
        countedAt: null,
      },
    ],
    { session },
  );

  // Slice 4 (ADR 0029 §4): a new city draws the week it is in.
  const live = await drawWeek(content, cityId, weekOf(today), [], session);
  const share = opinion[spec.home];
  const done = await City.updateOne(
    { _id: cityId, world: { $exists: false } },
    {
      $set: {
        world: { settledDay: today, bootstrappedDay: today, voting: 2 },
        morale: { state: moraleState(share), since: today, previous: null },
        moraleLog: [],
        council: {
          key: councilKey(cityId, k),
          fromDay: c0,
          toDay: c0 + COUNCIL.termDays,
          npcSeats: COUNCIL.seats,
        },
        ordinance: withBranch(cityId) ? inForce : null,
        ordinanceHistory: withBranch(cityId)
          ? [{ id: inForce.id, fromDay: inForce.fromDay, toDay: inForce.toDay }]
          : [],
        issues: { weekDay: weekOf(today), live, effects: [] },
      },
      $setOnInsert: { opinion },
    },
    { session, upsert: true },
  );
  if (done.matchedCount === 0 && done.upsertedCount === 0) throw new AlreadySettled();
}

/**
 * One boundary `d` of one city (§7.2; the voting rework, tech design §7.2): the drift; on Mondays the
 * Issues (slice 4); into cycle day 0 the count (the seats of election k − 1 and the rule of ballot
 * k − 1), the City Heroes (slice 4), the seating, the next election and ballot; into day 2 the set
 * (the list and the three cards); the morale record; and `world.settledDay = d`. Throws
 * AlreadySettled when another runner got there first.
 */
async function processBoundary(
  content: GameContent,
  cityId: string,
  d: DayKey,
  now: number,
  session: ClientSession,
): Promise<void> {
  cityDayHooks.beforeBoundary?.(cityId, d);
  const spec = councilSpec(content, cityId);
  const city = await City.findById(cityId).session(session).lean<CityDoc>();
  if (!city?.world || city.world.settledDay !== d - 1 || city.world.voting !== 2) throw new AlreadySettled();
  const home = spec.home;
  const work = boundaryWork(d, spec.offset);
  const cal = councilDay(d, spec.offset);
  const at = new Date(now);
  const ledger: LedgerRowInput[] = [];
  const row = (kind: LedgerRowInput['kind'], swing: number): LedgerRowInput => ({
    cityId,
    placeId: cityId,
    factionId: home,
    swing,
    kind,
    ref: `d:${d}`,
    day: d,
    at,
  });

  const drift = applyDrift(city.opinion!, home);
  let shares: OpinionShares = drift.shares;
  ledger.push(row('drift', drift.delta));
  const set: Record<string, unknown> = {};
  const push: Record<string, unknown> = {};

  // Slice 4 (§3.2): the Issues step after the drift, on Mondays.
  if (isMonday(d)) {
    const byPlace = new Map([[cityId, shares]]);
    set.issues = await issuesStep({
      content,
      cityId,
      d,
      city,
      shares: byPlace,
      homeFactionId: home,
      at,
      session,
    });
    shares = byPlace.get(cityId)!;
  }

  if (work.count) {
    // Election k − 1 → council k; ballot k − 1 → the rule for [d, d + 5).
    const prevKey = electionKey(cityId, cal.cycle - 1);
    let e = await Election.findById(prevKey).session(session).lean<ElectionDoc>();
    if (!e) {
      // No election on record (data loss): count a locals-only one so the council still sits.
      const seed = newSeed(cityId, cal.cycle - 1);
      const npcSlate = drawNpcSlate(
        content.slateOf(cityId).map((s) => ({ npcId: s.id, profile: s.profile })),
        createRng(seed),
      );
      const prev = councilDay(d - 1, spec.offset);
      await Election.create(
        [
          {
            _id: prevKey,
            cityId,
            kind: 'home',
            placeId: cityId,
            factionId: home,
            cycle: cal.cycle - 1,
            nominationsFrom: prev.election.nominationsFrom,
            pollsFrom: prev.election.pollsFrom,
            countDay: d,
            status: 'polling',
            seed,
            npcSlate,
            ballot: npcBallot(content, npcSlate, 0, COUNCIL.slateSize, home),
            closedAt: at,
          },
        ],
        { session },
      );
      e = await Election.findById(prevKey).session(session).lean<ElectionDoc>();
    }
    if (!e || e.status !== 'polling') throw new AlreadySettled();
    const votes = (await tallyRules([e._id], session))[e._id] ?? {};
    const r = countSeats(await countLines(e, cityId, session));
    const turnout = await turnoutOf(e._id, activeMembersFilter(cityId, home, d), votes, session);
    // Slice 4 (§7.5): the City Hero of the election just counted, and its scoreboard table.
    const scoreboards = await heroesStep({
      cityId,
      places: [{ placeId: cityId, name: spec.city.name, kind: 'city' }],
      cycle: cal.cycle - 1,
      d,
      untilDay: d + COUNCIL.termDays,
      session,
    });
    const counted = await Election.updateOne(
      { _id: e._id, status: 'polling' },
      {
        $set: {
          status: 'counted',
          result: {
            rows: r.rows,
            turnout,
            npcSeats: r.npcSeats,
            topKey: r.topKey,
            lastSeatKey: r.lastSeatKey,
            scoreboard: scoreboards.get(cityId) ?? [],
          },
          countedAt: at,
        },
      },
      { session },
    );
    if (counted.matchedCount === 0) throw new AlreadySettled();

    // The rule (ADR 0083): ballot k − 1's cards, most votes, a tie or no votes to card 1.
    const ballotId = councilKey(cityId, cal.cycle - 1);
    const prevBallot = await RuleBallot.findById(ballotId).session(session).lean<RuleBallotDoc>();
    if (prevBallot?.status === 'counted') throw new AlreadySettled();
    const cards =
      prevBallot?.cards && prevBallot.status === 'set'
        ? prevBallot.cards
        : await cardsFor(
            content,
            cityId,
            cal.cycle - 1,
            { unrest: moraleState(shares[home]) === 'unrest', capital: false },
            session,
          );
    const dec = decideHomeRule(cards, votes);
    const window = ruleWindowFrom(d);
    const result = { ...dec, turnout, inForce: window };
    if (prevBallot) {
      const done = await RuleBallot.updateOne(
        { _id: ballotId, status: { $in: ['open', 'set'] } },
        { $set: { status: 'counted', cards, result } },
        { session },
      );
      if (done.matchedCount === 0) throw new AlreadySettled();
    } else {
      const prev = councilDay(d - 1, spec.offset);
      await RuleBallot.create(
        [{ ...openBallotDoc(cityId, cal.cycle - 1, prev.council.fromDay), status: 'counted', cards, unrest: false, result }],
        { session },
      );
    }
    if (withBranch(cityId)) {
      set.ordinance = { id: dec.winner, ...window, paperId: ballotId };
      push.ordinanceHistory = { $each: [{ id: dec.winner, ...window }], $slice: -4 };
    } else set.ordinance = null;

    const standing = (e.ballot ?? []).filter((b) => b.kind === 'player' && b.candidacyId);
    if (standing.length > 0) {
      await Candidacy.bulkWrite(
        standing.map((b) => {
          const row = r.rows.find((x) => x.key === b.key)!;
          return {
            updateOne: {
              filter: { _id: b.candidacyId, status: 'standing' },
              update: { $set: { status: row.seated ? 'elected' : 'defeated', place: row.place } },
            },
          };
        }),
        { session },
      );
    }
    // A seat vacated at a move is not a completed term (ADR 0026).
    await OfficeTerm.updateMany(
      { councilKey: councilKey(cityId, cal.cycle - 1), vacatedDay: null },
      { $set: { completed: true } },
      { session },
    );
    const inserted = await OfficeTerm.insertMany(
      r.seated.map((row, i) => {
        const b = (e.ballot ?? []).find((x) => x.key === row.key)!;
        return {
          cityId,
          councilKey: councilKey(cityId, cal.cycle),
          electionId: e._id,
          seat: i + 1,
          factionId: home,
          districtId: null,
          vacatedDay: null,
          fromDay: d,
          toDay: d + COUNCIL.termDays,
          holder:
            row.kind === 'player'
              ? { kind: 'player', characterId: b.characterId, name: row.name }
              : { kind: 'npc', npcId: b.npcId, name: row.name },
          place: row.place,
          total: row.total,
          completed: false,
          // ADR 0084 §5: the councillor's rule, from the candidacy (a player) or content (a local).
          rule:
            row.kind === 'player'
              ? (b.rule ?? spec.faction.branchMotion)
              : (content.candidate(b.npcId ?? '')?.rule ?? null),
        };
      }),
      { session },
    );
    // ADR 0022: +2 per player seat; −3 when nobody voted.
    const playerSeats = r.seated.filter((x) => x.kind === 'player').length;
    if (playerSeats > 0) {
      const op = applyPersuasion(shares, {
        factionId: home,
        swing: MORALE.seat * playerSeats,
        homeFactionId: home,
      });
      shares = op.shares;
      ledger.push(row('seat', op.applied));
    }
    if (turnout.voters === 0) {
      const loss = applyMoraleLoss(shares, home, MORALE.noVoterPenalty);
      shares = loss.shares;
      ledger.push(row('noVoter', -loss.applied));
    }

    // Open election k and ballot k.
    const seed = newSeed(cityId, cal.cycle);
    await Election.create(
      [
        {
          _id: electionKey(cityId, cal.cycle),
          cityId,
          kind: 'home',
          placeId: cityId,
          factionId: home,
          cycle: cal.cycle,
          nominationsFrom: cal.election.nominationsFrom,
          pollsFrom: cal.election.pollsFrom,
          countDay: cal.election.countDay,
          status: 'nominations',
          seed,
          npcSlate: drawNpcSlate(
            content.slateOf(cityId).map((s) => ({ npcId: s.id, profile: s.profile })),
            createRng(seed),
          ),
        },
      ],
      { session },
    );
    await RuleBallot.create([openBallotDoc(cityId, cal.cycle, d)], { session });
    // Slice 7 (ADR 0048): the Governor, from the whole council.
    const governor = await governorAtCount(content, {
      cityId,
      k: cal.cycle,
      d,
      bloc: null,
      seated: inserted.map((x) => x.toObject() as OfficeTermDoc),
      rows: r.rows,
      homeFactionId: home,
      session,
    });
    set.council = {
      key: councilKey(cityId, cal.cycle),
      fromDay: d,
      toDay: d + COUNCIL.termDays,
      npcSeats: r.npcSeats,
      governor,
    };
  }

  if (work.set) {
    // ADR 0084 §2: the list freezes (every standing player by filing, then the slate's locals).
    const e = await Election.findById(electionKey(cityId, cal.cycle)).session(session).lean<ElectionDoc>();
    if (e && e.status === 'nominations') {
      const cands = await Candidacy.find({ electionId: e._id, status: 'standing' })
        .sort({ filedAt: 1 })
        .session(session)
        .lean<CandidacyDoc[]>();
      const list = freezeList({
        standing: cands.map((c) => ({ id: c._id.toHexString(), filedAt: c.filedAt.getTime() })),
        npcSlate: e.npcSlate,
      });
      const byId = new Map(cands.map((c) => [c._id.toHexString(), c]));
      const players: BallotLine[] = list.standing.map((id, i) => {
        const c = byId.get(id)!;
        return {
          key: `p:${c.characterId.toHexString()}`,
          factionId: home,
          kind: 'player',
          characterId: c.characterId,
          candidacyId: c._id,
          name: c.name,
          rule: c.rule ?? spec.faction.branchMotion,
          order: i,
        };
      });
      const ballot = [
        ...players,
        ...npcBallot(content, e.npcSlate, players.length, list.ballotNpcs.length, home),
      ];
      const closed = await Election.updateOne(
        { _id: e._id, status: 'nominations' },
        { $set: { status: 'polling', ballot, closedAt: at } },
        { session },
      );
      if (closed.matchedCount === 0) throw new AlreadySettled();
    }
    // ADR 0083: the three cards freeze over council k's rules; Unrest after this boundary's drift.
    await setBallotStep(
      content,
      {
        cityId,
        k: cal.cycle,
        fromDay: cal.council.fromDay,
        unrest: moraleState(shares[home]) === 'unrest',
        capital: false,
      },
      session,
    );
  }

  await writeLedger(content, ledger, session);
  const share = shares[home];
  const m = moraleTransition(city.morale ?? null, share, d);
  // Review 5 (ADR 0082): the Unrest prize, decided on the morale record after this boundary's own
  // transition and written by this guarded update (a re-run throws AlreadySettled before it).
  const prize = await unrestPrizeStep(
    content,
    { cityId, home, city, morale: m ?? city.morale ?? null, d },
    session,
  );
  if (prize) set.unrestPrize = prize;
  const done = await City.updateOne(
    { _id: cityId, 'world.settledDay': d - 1, 'world.voting': 2 },
    {
      $set: { opinion: shares, ...set, ...(m ? { morale: m } : {}), 'world.settledDay': d },
      $push: {
        moraleLog: { $each: [{ day: d, share, state: moraleState(share) }], $slice: -60 },
        ...push,
      },
    },
    { session },
  );
  if (done.matchedCount === 0) throw new AlreadySettled();
}

/**
 * Review 5 (answers §10.3, ADR 0082): a home city's Unrest entry seen at boundary `d`. Each entry is
 * considered once (`unrestPrize.entry`); when it pays (nothing paid in the seven days before), the
 * pushers are the home party's negative action legs at the city in the seven City Days before `d`,
 * summed by character from the influence ledger (the `{ placeId, cycleKey }` index); members of
 * other parties with half a point or more get an `unrest` award of 50 Party XP, upserted on the
 * award's unique `{ kind, ref, characterId }` and credited by their own settlement. Null when the
 * boundary sees no new entry.
 */
async function unrestPrizeStep(
  content: GameContent,
  i: {
    cityId: string;
    home: FactionId;
    city: CityDoc;
    morale: CityDoc['morale'] | null;
    d: DayKey;
  },
  session: ClientSession,
): Promise<UnrestPrizeDoc | null> {
  const prev = i.city.unrestPrize ?? null;
  const step = unrestEntry({ morale: i.morale, prize: prev, day: i.d });
  if (!step.consider) return null;
  let paid = false;
  if (step.pay) {
    const days = Array.from({ length: UNREST_PRIZE.windowDays }, (_, k) => i.d - UNREST_PRIZE.windowDays + k);
    const cycleKeys = [...new Set(days.map((x) => cycleKeyOf(content, i.cityId, i.cityId, x)))];
    const sums = await InfluenceLedger.aggregate<{ _id: Types.ObjectId; pushedK: number }>([
      {
        $match: {
          placeId: i.cityId,
          cycleKey: { $in: cycleKeys },
          day: { $gte: i.d - UNREST_PRIZE.windowDays, $lt: i.d },
          factionId: i.home,
          kind: 'action',
          swing: { $lt: 0 },
          'source.kind': 'character',
        },
      },
      { $group: { _id: '$source.characterId', pushedK: { $sum: { $multiply: ['$swing', -1] } } } },
    ]).session(session);
    const pushers = sums.filter((x) => x.pushedK >= UNREST_PRIZE.minPushedK);
    const people =
      pushers.length > 0
        ? await Character.find(
            { _id: { $in: pushers.map((x) => x._id) }, factionId: { $ne: i.home } },
            { name: 1, factionId: 1 },
          )
            .session(session)
            .lean<Array<Pick<CharacterDoc, '_id' | 'name' | 'factionId'>>>()
        : [];
    const byId = new Map(people.map((p) => [p._id.toHexString(), p]));
    const { winners, topByFaction } = prizeWinners(
      pushers.flatMap((x) => {
        const p = byId.get(x._id.toHexString());
        return p
          ? [{ characterId: x._id.toHexString(), name: p.name, factionId: p.factionId, pushedK: x.pushedK }]
          : [];
      }),
      i.home,
    );
    if (winners.length > 0) {
      const ref = `unrest|${i.cityId}|${step.entry}`;
      await Award.bulkWrite(
        winners.map((w) => ({
          updateOne: {
            filter: { kind: 'unrest', ref, characterId: new Types.ObjectId(w.characterId) },
            update: {
              $setOnInsert: {
                kind: 'unrest',
                ref,
                characterId: new Types.ObjectId(w.characterId),
                cityId: i.cityId,
                placeId: i.cityId,
                pc: 0,
                fxp: UNREST_PRIZE.fxp,
                amount: w.pushedK,
                meta: { pushedK: w.pushedK, top: topByFaction[w.factionId] ?? [] },
                title: null,
                bracket: null,
                day: i.d,
                creditedAt: null,
              },
            },
            upsert: true,
          },
        })),
        { session },
      );
      paid = true;
    }
  }
  return { entry: step.entry, paidDay: paid ? i.d : (prev?.paidDay ?? null) };
}

const isConflict = (err: unknown) =>
  err instanceof AlreadySettled ||
  isDuplicateKeyError(err) ||
  (typeof err === 'object' &&
    err !== null &&
    ((err as { code?: unknown }).code === 112 ||
      ((err as { errorLabels?: unknown }).errorLabels instanceof Array &&
        (err as { errorLabels: string[] }).errorLabels.includes('TransientTransactionError'))));

/**
 * ADR 0017 §1: settle every boundary of `cityId` up to `dayKey(now)`, oldest first, one
 * transaction each (bootstrapping first if the city has none). Idempotent and safe to race. Slice 4:
 * the capital takes its own boundary (ADR 0027); a city settled before slice 4 first draws the week
 * it is in (ADR 0029 §4). The voting rework (ADR 0086): a city not yet on the rule vote converts
 * first, in its own transaction.
 */
export async function settleCityDay(content: GameContent, cityId: string, now: number): Promise<CityDoc> {
  const today = dayKey(now);
  const capital = content.isDistricted(cityId);
  // Slice 7 (ADR 0050): Clearwater, a battleground on one meter.
  const oneMeter = isOneMeterBattleground(content, cityId);
  for (let guard = 0; guard < 1_000; guard++) {
    // Review 4 (the deposit test's flake): read at majority. A concurrent settler's commit can be
    // visible to a plain (local) read a moment before it is in the majority snapshot that the
    // caller's next transaction reads (`readConcern: snapshot`); the character's settlement then
    // missed what the city day had just written (a struck candidate's deposit came back a day late).
    // "Settled" must mean "settled for every transaction that follows".
    const city = await City.findById(cityId).readConcern('majority').lean<CityDoc>();
    // The voting rework (ADR 0086): a city settled before the rework converts first, as of its
    // settled day, before any boundary (no new-model boundary ever sees old state).
    const needsVoting = !!city?.world && city.world.voting !== 2;
    const needsIssues = !!city?.world && !city.issues;
    if (!needsVoting && !needsIssues && city?.world && city.world.settledDay >= today) return city;
    const d = city?.world ? city.world.settledDay + 1 : today;
    // Slice 6 (tech design §3.2, ADR 0037): every open Campaign Event of an earlier day is resolved
    // (each in its own transaction) before the boundary, so its swing, ledger and momentum land
    // before the drift, the count and Monday's Issues.
    if (city?.world && !needsVoting && !needsIssues) await resolveOpenBefore(content, cityId, d, now);
    try {
      await inTransaction((session) => {
        if (needsVoting) return convertCityVoting(content, cityId, city.world!.settledDay, session);
        if (needsIssues) return bootstrapIssues(content, cityId, weekOf(city.world!.settledDay), session);
        if (!city?.world) {
          return capital
            ? bootstrapCapital(content, cityId, now, session)
            : oneMeter
              ? bootstrapBattleground(content, cityId, now, session)
              : bootstrap(content, cityId, now, session);
        }
        // Slice 6 (tech design §3.2): the boundary posts day d's fixtures in its transaction.
        return (
          capital
            ? processCapitalBoundary(content, cityId, d, now, session)
            : oneMeter
              ? processBattlegroundBoundary(content, cityId, d, now, session)
              : processBoundary(content, cityId, d, now, session)
        ).then(() => ensureFixtures(content, cityId, d, session));
      });
    } catch (err) {
      if (!isConflict(err)) throw err;
      cityDayHooks.onRetry?.(cityId, d);
    }
  }
  throw new Error(`city day for "${cityId}" did not converge`);
}

/**
 * ADR 0017 §2, §5: the request path. Settles the city first (one read by `_id` when it is already
 * settled); a failure that is not a conflict goes to Sentry and the request carries on with the
 * last stored city (the degrade path).
 */
export async function ensureCityDay(
  content: GameContent,
  cityId: string,
  now: number,
): Promise<CityDoc | null> {
  const spec = content.city(cityId);
  if (!spec?.council) return City.findById(cityId).lean<CityDoc>();
  try {
    return await settleCityDay(content, cityId, now);
  } catch (err) {
    captureException(err, { where: 'ensureCityDay', cityId });
    console.error(`[city-day] ${cityId}: ${(err as Error).message}`);
    return City.findById(cityId).lean<CityDoc>();
  }
}

/**
 * Slice 4 (tech design §7.6, ADR 0017's invariant generalised): settle the day of every city the
 * character's request depends on (where it stands or is travelling to, the residence, the job's
 * city) before the character's own settlement. Each is one read once settled.
 */
export async function ensurePlaces(
  content: GameContent,
  c: Pick<CharacterDoc, 'homeCityId' | 'residence' | 'cityId' | 'journey' | 'job'>,
  now: number,
): Promise<Map<string, CityDoc | null>> {
  const places = new Map<string, CityDoc | null>();
  for (const id of placesOf(content, c)) places.set(id, await ensureCityDay(content, id, now));
  return places;
}

/**
 * The worker's job and the e2e hook: every council city, the capital first (its count is the
 * biggest). A failure in one city does not stop the others; the run then fails so Agenda records it.
 */
export async function runCityDay(
  content: GameContent,
  now: number,
): Promise<{ settled: Array<{ cityId: string; settledDay: DayKey | null }>; failed: string[] }> {
  const settled: Array<{ cityId: string; settledDay: DayKey | null }> = [];
  const failed: string[] = [];
  const errors: unknown[] = [];
  const cities = [...content.councilCities()].sort(
    (a, b) => Number(content.isDistricted(b.id)) - Number(content.isDistricted(a.id)),
  );
  for (const city of cities) {
    try {
      const doc = await settleCityDay(content, city.id, now);
      settled.push({ cityId: city.id, settledDay: doc.world?.settledDay ?? null });
    } catch (err) {
      captureException(err, { where: 'runCityDay', cityId: city.id });
      failed.push(city.id);
      errors.push(err);
    }
  }
  if (errors.length > 0) throw new AggregateError(errors, `city day failed for ${failed.join(', ')}`);
  return { settled, failed };
}
