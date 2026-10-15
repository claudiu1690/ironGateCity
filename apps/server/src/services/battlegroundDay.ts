import type { GameContent } from '@irongate/content';
import { Candidacy, City, Election, OfficeTerm, RuleBallot } from '@irongate/db';
import type {
  BallotLine,
  CandidacyDoc,
  CityDoc,
  ElectionDoc,
  OfficeTermDoc,
  RuleBallotDoc,
} from '@irongate/db';
import {
  BATTLEGROUND_COUNCILS,
  COUNCIL,
  FACTION_IDS,
  applyBaselineDrift,
  boundaryWork,
  cardBallots,
  councilDay,
  councilKey,
  councilOrder,
  countBattleground,
  createRng,
  dayKey,
  decideBlocRule,
  districtLeader,
  districtState,
  drawNpcSlate,
  electionKey,
  isMonday,
  ruleWindowFrom,
  weekOf,
} from '@irongate/rules';
import type {
  DayKey,
  DistrictCountLine,
  FactionId,
  NpcSlateEntry,
  OpinionShares,
  RuleCard,
  ScoreboardTableView,
  SeatRule,
} from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import {
  AlreadySettled,
  cityDayHooks,
  cityResidentsFilter,
  countLines,
  newSeed,
  turnoutOf,
} from './cityDayCore';
import { governorAtCount } from './governorService';
import { drawWeek, heroesStep, issuesStep } from './issuesDay';
import { writeLedger } from './ledger';
import type { LedgerRowInput } from './ledger';
import { closePetitionsInTx } from './petitionService';
import {
  capitalCardOrder,
  capitalCards,
  capitalDrawOrder,
  cardsFor,
  openBallotDoc,
  seatRules,
  setBallotStep,
  tallyRules,
} from './ruleBallot';

/**
 * Slice 7 (docs/tech/slice-7.md §8.2; ADR 0050, 0085): Clearwater's day, a contested council on one
 * meter. The capital's boundary with the city as its only place: drift on the city's meter → Issues
 * (Monday) → the meter's state on the city (`cities.battleground`) → the petition close (T19's hook)
 * → the count (day 0: seven seats three ways by `countBattleground`, lists of three; the rule by
 * `decideBlocRule`) → the Governor (the Mayor: the largest bloc) → heroes → the next election and
 * rule ballot → the set (day 2: the list freezes, one card per party). No patrol is ever rolled here.
 */

type SlateEntry = NpcSlateEntry & { factionId: FactionId };
const zero = (): Record<FactionId, number> => ({ vanguard: 0, collective: 0, alliance: 0 });
const P = BATTLEGROUND_COUNCILS.clearwater;

/** A Clearwater battleground: a council city with the battleground role and no districts. */
export const isOneMeterBattleground = (content: GameContent, cityId: string): boolean =>
  content.city(cityId)?.role === 'battleground' && !content.isDistricted(cityId);

/** The locals a faction puts on the list when `players` of its members stand (lists of three). */
export const battlegroundFill = (players: number): number => Math.max(0, P.listSize - Math.max(0, players));

/** Petition closes before the set (T19 fills it; a no-op until then). */
export const battlegroundHooks: {
  petitionClose?: (content: GameContent, cityId: string, d: DayKey, session: ClientSession) => Promise<void>;
} = {};

function slateOf(content: GameContent, cityId: string, seed: string): SlateEntry[] {
  const slate = content.slateOf(cityId);
  return drawNpcSlate(
    slate.map((s) => ({ npcId: s.id, profile: s.profile })),
    createRng(seed),
  ).map((e, idx) => ({ ...e, factionId: slate[idx]!.factionId }));
}

function npcLines(
  content: GameContent,
  slate: readonly SlateEntry[],
  first: number,
  perFaction: (f: FactionId) => number,
): BallotLine[] {
  const out: BallotLine[] = [];
  for (const f of FACTION_IDS) {
    for (const s of slate.filter((x) => x.factionId === f).slice(0, perFaction(f))) {
      const c = content.candidate(s.npcId);
      out.push({
        key: `n:${s.npcId}`,
        factionId: f,
        kind: 'npc',
        npcId: s.npcId,
        name: c?.name ?? s.npcId,
        order: first + out.length,
      });
    }
  }
  return out;
}

function electionDoc(
  content: GameContent,
  cityId: string,
  k: number,
  offset: number,
  polling: boolean,
  at: Date,
) {
  const cal = councilDay(k * COUNCIL.cycleDays + offset, offset);
  const seed = cityDayHooks.seed?.(cityId, k) ?? newSeed(cityId, k);
  const npcSlate = slateOf(content, cityId, seed);
  return {
    _id: electionKey(cityId, k),
    cityId,
    kind: 'battleground' as const,
    placeId: cityId,
    cycle: k,
    nominationsFrom: cal.election.nominationsFrom,
    pollsFrom: cal.election.pollsFrom,
    countDay: cal.election.countDay,
    status: polling ? ('polling' as const) : ('nominations' as const),
    seed,
    npcSlate,
    filed: 0,
    ballot: polling ? npcLines(content, npcSlate, 0, () => P.listSize) : null,
    ballots: 0,
    result: null,
    closedAt: polling ? at : null,
    countedAt: null,
  };
}

const stateDoc = (
  d: DayKey,
  st: { battleground: boolean; controlledBy: FactionId | null },
  prev: { battleground: boolean; controlledBy: FactionId | null },
  opinion: OpinionShares,
) => ({
  day: d,
  battleground: st.battleground,
  controlledBy: st.controlledBy,
  previous: prev,
  leader: districtLeader(opinion),
});

/**
 * ADR 0050: Clearwater with no `world` gets, in one transaction, its meter at the baseline, a sitting
 * NPC council counted on the baseline (seven of the nine locals), rule ballot k (`open`, or `set` on
 * day 2+ with one card per party), the largest bloc's card in force, the election in the phase of the
 * day and the week's Issues. Written converted (`world.voting: 2`).
 */
export async function bootstrapBattleground(
  content: GameContent,
  cityId: string,
  now: number,
  session: ClientSession,
): Promise<void> {
  const spec = content.city(cityId)!;
  const offset = spec.council!.offset;
  const today = dayKey(now);
  const cal = councilDay(today, offset);
  const k = cal.cycle;
  const c0 = cal.council.fromDay;
  const at = new Date(now);
  const state = await City.findById(cityId).session(session).lean<CityDoc>();
  if (state?.world) throw new AlreadySettled();
  const baseline = spec.baselineOpinion;
  const opinion = state?.opinion ?? baseline;

  const slate = content.slateOf(cityId);
  const lines: DistrictCountLine[] = slate.map((s, idx) => ({
    key: `n:${s.id}`,
    kind: 'npc',
    name: s.name,
    wardVote: s.profile,
    successes: s.profile * 5,
    backers: 0,
    order: idx,
    factionId: s.factionId!,
  }));
  const r = countBattleground({
    lines,
    ballotsByFaction: zero(),
    opinion,
    rng: createRng(`${newSeed(cityId, k - 1)}:draw`),
    seats: P.seats,
    fullTurnout: P.fullTurnout,
  });
  const seats = zero();
  const terms: Array<Partial<OfficeTermDoc>> = r.seated.map((row, idx) => {
    seats[row.factionId] += 1;
    return {
      cityId,
      councilKey: councilKey(cityId, k),
      electionId: electionKey(cityId, k - 1),
      seat: idx + 1,
      factionId: row.factionId,
      districtId: null,
      vacatedDay: null,
      fromDay: c0,
      toDay: c0 + COUNCIL.termDays,
      holder: { kind: 'npc', npcId: row.key.slice(2), name: row.name },
      place: row.place,
      total: row.total,
      completed: false,
      rule: null,
    };
  });
  await OfficeTerm.insertMany(terms, { session });

  const seatRows: SeatRule[] = terms.map((t) => ({
    seat: t.seat!,
    holder: 'npc',
    name: t.holder!.name,
    npcId: t.holder!.npcId,
    factionId: t.factionId!,
    total: t.total!,
    rule: null,
  }));
  const drawOrder = capitalDrawOrder(cityId, k);
  const cards = capitalCards(content, seatRows, councilOrder(seats, zero(), opinion, drawOrder));
  const set = cal.cycleDay >= 2;
  await RuleBallot.create([{ ...openBallotDoc(cityId, k, c0), ...(set ? { status: 'set', cards } : {}) }], {
    session,
  });
  const dec = decideBlocRule({ cards, seatsByFaction: seats, votes: {}, opinion, drawOrder });
  const inForce = { fromDay: c0, toDay: c0 + COUNCIL.ordinanceDays };
  await Election.create([electionDoc(content, cityId, k, offset, cal.phase === 'polling', at)], { session });

  const st = districtState({ controlledBy: null, groundswell: null }, opinion, today);
  const live = await drawWeek(content, cityId, weekOf(today), [], session);
  const done = await City.updateOne(
    { _id: cityId, world: { $exists: false } },
    {
      $set: {
        world: { settledDay: today, bootstrappedDay: today, voting: 2 },
        opinion,
        battleground: {
          state: stateDoc(
            today,
            st,
            { battleground: st.battleground, controlledBy: st.controlledBy },
            opinion,
          ),
          groundswell: null,
          stateLog: [],
        },
        council: {
          key: councilKey(cityId, k),
          fromDay: c0,
          toDay: c0 + COUNCIL.termDays,
          npcSeats: P.seats,
          seats: P.seats,
          npcSeatsByFaction: seats,
          governor: null,
        },
        ordinance: { id: dec.winner, ...inForce, paperId: null },
        ordinanceHistory: [{ id: dec.winner, ...inForce }],
        issues: { weekDay: weekOf(today), live, effects: [] },
      },
    },
    { session, upsert: true },
  );
  if (done.matchedCount === 0 && done.upsertedCount === 0) throw new AlreadySettled();
}

/** One boundary `d` of Clearwater. Throws AlreadySettled when another runner got there first. */
export async function processBattlegroundBoundary(
  content: GameContent,
  cityId: string,
  d: DayKey,
  now: number,
  session: ClientSession,
): Promise<void> {
  cityDayHooks.beforeBoundary?.(cityId, d);
  const spec = content.city(cityId)!;
  const offset = spec.council!.offset;
  const city = await City.findById(cityId).session(session).lean<CityDoc>();
  if (!city?.world || city.world.settledDay !== d - 1 || city.world.voting !== 2) throw new AlreadySettled();
  const work = boundaryWork(d, offset);
  const cal = councilDay(d, offset);
  const k = cal.cycle;
  const at = new Date(now);
  const prevState = city.battleground?.state ?? null;

  // 1. Drift on the city's meter.
  const shares = new Map<string, OpinionShares>();
  const ledger: LedgerRowInput[] = [];
  const drift = applyBaselineDrift(city.opinion ?? spec.baselineOpinion, spec.baselineOpinion);
  shares.set(cityId, drift.shares);
  for (const [f, swing] of Object.entries(drift.moves)) {
    ledger.push({
      cityId,
      placeId: cityId,
      factionId: f as FactionId,
      swing: swing!,
      kind: 'drift',
      ref: `d:${d}`,
      day: d,
      at,
    });
  }
  const set: Record<string, unknown> = {};
  const push: Record<string, unknown> = {};

  // 2. Issues, on Mondays.
  if (isMonday(d) && !cityDayHooks.noIssues?.has(cityId)) {
    set.issues = await issuesStep({ content, cityId, d, city, shares, homeFactionId: null, at, session });
  }

  // 3. The meter's state.
  const opinion = shares.get(cityId)!;
  const st = districtState(
    { controlledBy: prevState?.controlledBy ?? null, groundswell: city.battleground?.groundswell ?? null },
    opinion,
    d,
  );

  // 3b. The petition close, before the set (T19).
  await closePetitionsInTx(cityId, d, now, session);
  await battlegroundHooks.petitionClose?.(content, cityId, d, session);

  // 4–5. The count, the new council, the Mayor and the heroes (day 0).
  if (work.count) {
    const scoreboards = await heroesStep({
      cityId,
      places: [{ placeId: cityId, name: spec.name, kind: 'city' as const }],
      cycle: k - 1,
      d,
      untilDay: d + COUNCIL.termDays,
      session,
    });
    const ballotId = councilKey(cityId, k - 1);
    const prevBallot = await RuleBallot.findById(ballotId).session(session).lean<RuleBallotDoc>();
    if (prevBallot?.status === 'counted') throw new AlreadySettled();
    const cards: RuleCard[] =
      prevBallot?.cards && prevBallot.status === 'set'
        ? prevBallot.cards
        : await cardsFor(content, cityId, k - 1, { unrest: false, capital: true }, session);
    const e = await prevElection(content, cityId, k - 1, offset, d, at, session);
    const votesBy = await tallyRules([e._id], session);
    const votes = votesBy[e._id] ?? {};
    const lines = (await countLines(e, cityId, session)) as DistrictCountLine[];
    const r = countBattleground({
      lines,
      ballotsByFaction: cardBallots(cards, votes),
      opinion,
      rng: createRng(`${e.seed}:draw`),
      seats: P.seats,
      fullTurnout: P.fullTurnout,
    });
    const t = await turnoutOf(e._id, cityResidentsFilter(cityId, d), votes, session);
    const scoreboard: ScoreboardTableView[] = scoreboards.get(cityId) ?? [];
    const counted = await Election.updateOne(
      { _id: e._id, status: 'polling' },
      {
        $set: {
          status: 'counted',
          result: {
            rows: r.rows,
            turnout: t,
            npcSeats: r.seated.filter((x) => x.kind === 'npc').length,
            topKey: r.seated[0]?.key ?? '',
            lastSeatKey: r.seated.at(-1)?.key ?? '',
            factions: r.factions,
            w: r.w,
            ballots: r.ballots,
            tie: r.tie,
            seatsByFaction: r.seatsByFaction,
            drawOrder: r.drawOrder,
            cardVotes: votes,
            scoreboard,
          },
          countedAt: at,
        },
      },
      { session },
    );
    if (counted.matchedCount === 0) throw new AlreadySettled();
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
    const seats = zero();
    const terms: Array<Partial<OfficeTermDoc>> = r.seated.map((row, idx) => {
      const b = (e.ballot ?? []).find((x) => x.key === row.key)!;
      seats[row.factionId] += 1;
      return {
        cityId,
        councilKey: councilKey(cityId, k),
        electionId: e._id,
        seat: idx + 1,
        factionId: row.factionId,
        districtId: null,
        vacatedDay: null,
        fromDay: d,
        toDay: d + COUNCIL.termDays,
        holder:
          row.kind === 'player'
            ? { kind: 'player', characterId: b.characterId!, name: row.name }
            : { kind: 'npc', npcId: b.npcId!, name: row.name },
        place: row.place,
        total: row.total,
        completed: false,
        rule: row.kind === 'player' ? (b.rule ?? content.faction(row.factionId).branchMotion) : null,
      };
    });
    // ADR 0085: the largest bloc's card wins; ties by votes, opinion, the cycle's draw.
    const dec = decideBlocRule({
      cards,
      seatsByFaction: seats,
      votes,
      opinion,
      drawOrder: capitalDrawOrder(cityId, k - 1),
    });
    const window = ruleWindowFrom(d);
    const result = { ...dec, turnout: t, inForce: window };
    if (prevBallot) {
      const done = await RuleBallot.updateOne(
        { _id: ballotId, status: { $in: ['open', 'set'] } },
        { $set: { status: 'counted', cards, result } },
        { session },
      );
      if (done.matchedCount === 0) throw new AlreadySettled();
    } else {
      const prev = councilDay(d - 1, offset);
      await RuleBallot.create(
        [{ ...openBallotDoc(cityId, k - 1, prev.council.fromDay), status: 'counted', cards, result }],
        {
          session,
        },
      );
    }
    set.ordinance = { id: dec.winner, ...window, paperId: ballotId };
    push.ordinanceHistory = { $each: [{ id: dec.winner, ...window }], $slice: -4 };
    await OfficeTerm.updateMany(
      { councilKey: councilKey(cityId, k - 1), vacatedDay: null },
      { $set: { completed: true } },
      { session },
    );
    const inserted = await OfficeTerm.insertMany(terms, { session });
    await Election.create([electionDoc(content, cityId, k, offset, false, at)], { session });
    await RuleBallot.create([openBallotDoc(cityId, k, d)], { session });
    const npcByFaction = zero();
    for (const x of terms) if (x.holder?.kind === 'npc') npcByFaction[x.factionId!] += 1;
    // T13: the Mayor, from the largest bloc (ADR 0048).
    const governor = await governorAtCount(content, {
      cityId,
      k,
      d,
      bloc: largestBloc(seats, r.factions, opinion, capitalDrawOrder(cityId, k - 1)),
      seated: inserted.map((x) => x.toObject() as OfficeTermDoc),
      rows: r.rows,
      session,
    });
    set.council = {
      key: councilKey(cityId, k),
      fromDay: d,
      toDay: d + COUNCIL.termDays,
      npcSeats: terms.filter((x) => x.holder?.kind === 'npc').length,
      seats: P.seats,
      npcSeatsByFaction: npcByFaction,
      governor,
    };
  }

  // 6. The set (cycle day 2): the list freezes, then one card per party.
  if (work.set) {
    await freezeList(content, cityId, k, at, session);
    const seatRows = await seatRules(content, cityId, k, session);
    const order = await capitalCardOrder(content, cityId, k, seatRows, session, opinion);
    await setBallotStep(
      content,
      { cityId, k, fromDay: cal.council.fromDay, unrest: false, capital: true, order },
      session,
    );
  }

  // 7. Write the meter and settle the city.
  await writeLedger(content, ledger, session);
  const prevPair = {
    battleground: prevState?.battleground ?? false,
    controlledBy: prevState?.controlledBy ?? null,
  };
  const done = await City.updateOne(
    { _id: cityId, 'world.settledDay': d - 1, 'world.voting': 2 },
    {
      $set: {
        ...set,
        opinion,
        'battleground.state': stateDoc(d, st, prevPair, opinion),
        'battleground.groundswell': st.groundswell,
        'world.settledDay': d,
      },
      $push: {
        ...push,
        'battleground.stateLog': {
          $each: [{ day: d, opinion, battleground: st.battleground, controlledBy: st.controlledBy }],
          $slice: -60,
        },
      },
    },
    { session },
  );
  if (done.matchedCount === 0) throw new AlreadySettled();
}

/** The largest bloc by seats; ties by ballots, opinion and the draw (design §8.4). */
function largestBloc(
  seats: Record<FactionId, number>,
  factions: ReadonlyArray<{ factionId: FactionId; ballots: number }>,
  opinion: OpinionShares,
  drawOrder: readonly FactionId[],
): FactionId | null {
  const ballots = zero();
  for (const f of factions) ballots[f.factionId] = f.ballots;
  return councilOrder(seats, ballots, opinion, drawOrder)[0] ?? null;
}

async function prevElection(
  content: GameContent,
  cityId: string,
  k: number,
  offset: number,
  d: DayKey,
  at: Date,
  session: ClientSession,
): Promise<ElectionDoc> {
  const id = electionKey(cityId, k);
  let e = await Election.findById(id).session(session).lean<ElectionDoc>();
  if (!e) {
    await Election.create([{ ...electionDoc(content, cityId, k, offset, true, at), countDay: d }], {
      session,
    });
    e = await Election.findById(id).session(session).lean<ElectionDoc>();
  }
  if (!e || e.status !== 'polling') throw new AlreadySettled();
  return e;
}

/** Cycle day 2: every standing player by filing, then each faction's locals to three names. */
async function freezeList(
  content: GameContent,
  cityId: string,
  k: number,
  at: Date,
  session: ClientSession,
): Promise<void> {
  const e = await Election.findById(electionKey(cityId, k)).session(session).lean<ElectionDoc>();
  if (!e || e.status !== 'nominations') return;
  const cands = await Candidacy.find({ electionId: e._id, status: 'standing' })
    .sort({ filedAt: 1 })
    .session(session)
    .lean<CandidacyDoc[]>();
  const fill = zero();
  for (const f of FACTION_IDS) fill[f] = battlegroundFill(cands.filter((c) => c.factionId === f).length);
  const players: BallotLine[] = cands.map((c, i) => ({
    key: `p:${c.characterId.toHexString()}`,
    factionId: c.factionId!,
    kind: 'player',
    characterId: c.characterId,
    candidacyId: c._id,
    name: c.name,
    rule: c.rule ?? content.faction(c.factionId!).branchMotion,
    order: i,
  }));
  const ballot = [
    ...players,
    ...npcLines(content, e.npcSlate as SlateEntry[], players.length, (f) => fill[f]),
  ];
  const closed = await Election.updateOne(
    { _id: e._id, status: 'nominations' },
    { $set: { status: 'polling', ballot, closedAt: at } },
    { session },
  );
  if (closed.matchedCount === 0) throw new AlreadySettled();
}
