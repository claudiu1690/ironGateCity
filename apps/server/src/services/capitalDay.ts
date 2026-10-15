import type { GameContent } from '@irongate/content';
import { Candidacy, City, District, Election, OfficeTerm, RuleBallot } from '@irongate/db';
import type {
  BallotLine,
  CandidacyDoc,
  CityDoc,
  DistrictDoc,
  ElectionDoc,
  OfficeTermDoc,
  RuleBallotDoc,
} from '@irongate/db';
import {
  CAPITAL_COUNCIL,
  COUNCIL,
  FACTION_IDS,
  applyBaselineDrift,
  averageShares,
  boundaryWork,
  cardBallots,
  councilDay,
  councilKey,
  councilOrder,
  countDistrict,
  createRng,
  dayKey,
  decideCapitalRule,
  districtLeader,
  districtState,
  drawNpcSlate,
  drawOrderOf,
  electionKey,
  isMonday,
  npcFill,
  ruleWindowFrom,
  weekOf,
} from '@irongate/rules';
import type {
  DayKey,
  DistrictCountLine,
  DistrictCountRow,
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
  countLines,
  districtResidentsFilter,
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
 * The capital's day (slice-4 tech design §7.2–§7.3, ADR 0027; the voting rework, tech design §7.3,
 * ADR 0085): one transaction per boundary over the city document (calendar, council, rule, Issues)
 * and its five district documents (the meters and their states). Drift → Issues (Monday) → states →
 * the five counts, the largest bloc's rule and the new council (cycle day 0) → heroes → the set (day
 * 2: the five lists and one card per party). Ballots and seats never move opinion.
 */

type SlateEntry = NpcSlateEntry & { factionId: FactionId };
const zero = (): Record<FactionId, number> => ({ vanguard: 0, collective: 0, alliance: 0 });

interface DistrictSpec {
  id: string;
  name: string;
  n: number;
  baseline: OpinionShares;
}

export function districtSpecs(content: GameContent, cityId: string): DistrictSpec[] {
  return content.districtsOf(cityId).map((q) => ({
    id: q.id,
    name: q.name,
    n: q.district!.n,
    baseline: q.district!.baselineOpinion,
  }));
}

/** A district's six NPCs with this cycle's jitter (profile order within each faction). */
function districtSlate(content: GameContent, districtId: string, seed: string): SlateEntry[] {
  const slate = content.slateOf(districtId);
  return drawNpcSlate(
    slate.map((s) => ({ npcId: s.id, profile: s.profile })),
    createRng(seed),
  ).map((e, idx) => ({ ...e, factionId: slate[idx]!.factionId }));
}

/** The NPC ballot lines of a district: `perFaction(f)` names of each faction, in faction order. */
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

const seatOf = (n: number, idx: number) => CAPITAL_COUNCIL.perDistrict * (n - 1) + idx + 1;

/** An election document of a district (cycle `k`) in the phase of `today`. */
function districtElection(
  content: GameContent,
  cityId: string,
  d: DistrictSpec,
  k: number,
  offset: number,
  polling: boolean,
  at: Date,
) {
  const cal = councilDay(k * COUNCIL.cycleDays + offset, offset);
  const seed = newSeed(d.id, k);
  const npcSlate = districtSlate(content, d.id, seed);
  return {
    _id: electionKey(d.id, k),
    cityId,
    kind: 'district' as const,
    placeId: d.id,
    cycle: k,
    nominationsFrom: cal.election.nominationsFrom,
    pollsFrom: cal.election.pollsFrom,
    countDay: cal.election.countDay,
    status: polling ? ('polling' as const) : ('nominations' as const),
    seed,
    npcSlate,
    filed: 0,
    ballot: polling ? npcLines(content, npcSlate, 0, () => npcFill(0)) : null,
    ballots: 0,
    result: null,
    closedAt: polling ? at : null,
    countedAt: null,
  };
}

/**
 * §7.3; the voting rework (tech design §6.1): the capital with no `world` gets, in one transaction:
 * the five districts at their baselines, a sitting NPC council counted on the baselines, rule ballot k
 * (`open`, or `set` on day 2+ with one card per party), the largest bloc's card in force for the cycle,
 * the five elections in the phase of the day and the week's Issues. Written converted (`world.voting: 2`).
 */
export async function bootstrapCapital(
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
  const ds = districtSpecs(content, cityId);

  await District.deleteMany({ cityId }, { session });
  await District.insertMany(
    ds.map((d) => {
      const st = districtState({ controlledBy: null, groundswell: null }, d.baseline, today);
      return {
        _id: d.id,
        cityId,
        opinion: d.baseline,
        state: {
          day: today,
          battleground: st.battleground,
          controlledBy: st.controlledBy,
          previous: { battleground: st.battleground, controlledBy: st.controlledBy },
          // Slice 5 (ADR 0034 §5): the leading faction at the boundary (a mission's `leader` target).
          leader: districtLeader(d.baseline),
        },
        groundswell: null,
        stateLog: [],
      };
    }),
    { session },
  );

  // The sitting council k: each district counted with no ballots on its baseline, over each
  // faction's two locals at their profiles.
  const seats = zero();
  const terms: Array<Partial<OfficeTermDoc>> = [];
  for (const d of ds) {
    const slate = content.slateOf(d.id);
    const lines: DistrictCountLine[] = slate.map((s, idx) => ({
      key: `n:${s.id}`,
      kind: 'npc',
      name: s.name,
      wardVote: s.profile,
      successes: s.profile * 5,
      backers: 0,
      order: idx,
      factionId: s.factionId,
    }));
    const r = countDistrict({
      lines,
      ballotsByFaction: zero(),
      opinion: d.baseline,
      rng: createRng(`${newSeed(d.id, k - 1)}:draw`),
    });
    r.seated.forEach((row, idx) => {
      seats[row.factionId] += 1;
      terms.push({
        cityId,
        councilKey: councilKey(cityId, k),
        electionId: electionKey(d.id, k - 1),
        seat: seatOf(d.n, idx),
        factionId: row.factionId,
        districtId: d.id,
        vacatedDay: null,
        fromDay: c0,
        toDay: c0 + COUNCIL.termDays,
        holder: { kind: 'npc', npcId: row.key.slice(2), name: row.name },
        place: row.place,
        total: row.total,
        completed: false,
        // ADR 0085: a capital local names no rule (the party's card falls to the secretary).
        rule: null,
      });
    });
  }
  await OfficeTerm.insertMany(terms, { session });

  // One card per party over the NPC council; the largest bloc's is in force for the cycle.
  const cityOpinion = averageShares(ds.map((d) => d.baseline));
  const npcSeatRules: SeatRule[] = terms.map((t) => ({
    seat: t.seat!,
    holder: 'npc',
    name: t.holder!.name,
    npcId: t.holder!.npcId,
    factionId: t.factionId!,
    total: t.total!,
    rule: null,
  }));
  const drawOrder = capitalDrawOrder(cityId, k);
  const cards = capitalCards(content, npcSeatRules, councilOrder(seats, zero(), cityOpinion, drawOrder));
  const set = cal.cycleDay >= 2;
  await RuleBallot.create(
    [{ ...openBallotDoc(cityId, k, c0), ...(set ? { status: 'set', cards } : {}) }],
    { session },
  );
  const dec = decideCapitalRule({ cards, seatsByFaction: seats, votes: {}, opinion: cityOpinion, drawOrder });
  const inForce = { fromDay: c0, toDay: c0 + COUNCIL.ordinanceDays };

  await Election.insertMany(
    ds.map((d) => districtElection(content, cityId, d, k, offset, cal.phase === 'polling', at)),
    { session },
  );

  const live = await drawWeek(content, cityId, weekOf(today), [], session);
  const done = await City.updateOne(
    { _id: cityId, world: { $exists: false } },
    {
      $set: {
        world: { settledDay: today, bootstrappedDay: today, voting: 2 },
        council: {
          key: councilKey(cityId, k),
          fromDay: c0,
          toDay: c0 + COUNCIL.termDays,
          npcSeats: CAPITAL_COUNCIL.seats,
          seats: CAPITAL_COUNCIL.seats,
          npcSeatsByFaction: seats,
        },
        ordinance: { id: dec.winner, ...inForce, paperId: null },
        ordinanceHistory: [{ id: dec.winner, ...inForce }],
        issues: { weekDay: weekOf(today), live, effects: [] },
      },
      // ADR 0027: the capital's meters are its districts'; the city document keeps none.
      $unset: { opinion: 1 },
    },
    { session, upsert: true },
  );
  if (done.matchedCount === 0 && done.upsertedCount === 0) throw new AlreadySettled();
}

/** One boundary `d` of the capital (§7.2). Throws AlreadySettled when another runner got there first. */
export async function processCapitalBoundary(
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
  const ds = districtSpecs(content, cityId);
  const docs = await District.find({ cityId }).session(session).lean<DistrictDoc[]>();
  const docOf = (id: string) => {
    const doc = docs.find((x) => x._id === id);
    if (!doc) throw new Error(`district "${id}" has no document`);
    return doc;
  };

  // 1. Drift, every district.
  const shares = new Map<string, OpinionShares>();
  const ledger: LedgerRowInput[] = [];
  for (const dist of ds) {
    const drift = applyBaselineDrift(docOf(dist.id).opinion, dist.baseline);
    shares.set(dist.id, drift.shares);
    for (const [f, swing] of Object.entries(drift.moves)) {
      ledger.push({
        cityId,
        placeId: dist.id,
        factionId: f as FactionId,
        swing: swing!,
        kind: 'drift',
        ref: `d:${d}`,
        day: d,
        at,
      });
    }
  }
  const set: Record<string, unknown> = {};
  const push: Record<string, unknown> = {};

  // 2. Issues, on Mondays (may move one district by +3).
  if (isMonday(d)) {
    set.issues = await issuesStep({
      content,
      cityId,
      d,
      city,
      shares,
      homeFactionId: null,
      at,
      session,
    });
  }

  // 3. States.
  const states = new Map(
    ds.map((dist) => {
      const doc = docOf(dist.id);
      return [
        dist.id,
        districtState(
          { controlledBy: doc.state.controlledBy, groundswell: doc.groundswell },
          shares.get(dist.id)!,
          d,
        ),
      ];
    }),
  );

  // Slice 7 T19 (ADR 0049 as amended): the city's petition closing at d, before the count and the set.
  await closePetitionsInTx(cityId, d, now, session);

  // 4–5. The count (the seats and the largest bloc's rule), the new council and the heroes (day 0).
  if (work.count) {
    const scoreboards = await heroesStep({
      cityId,
      places: ds.map((x) => ({ placeId: x.id, name: x.name, kind: 'district' as const })),
      cycle: k - 1,
      d,
      untilDay: d + COUNCIL.termDays,
      session,
    });
    // Ballot k − 1's cards (ADR 0085): one per party, shared rules merged.
    const ballotId = councilKey(cityId, k - 1);
    const prevBallot = await RuleBallot.findById(ballotId).session(session).lean<RuleBallotDoc>();
    if (prevBallot?.status === 'counted') throw new AlreadySettled();
    const cards: RuleCard[] =
      prevBallot?.cards && prevBallot.status === 'set'
        ? prevBallot.cards
        : await cardsFor(content, cityId, k - 1, { unrest: false, capital: true }, session);
    const es: ElectionDoc[] = [];
    for (const dist of ds) es.push(await prevElection(content, cityId, dist, k - 1, offset, d, at, session));
    const votesBy = await tallyRules(
      es.map((e) => e._id),
      session,
    );
    const seats = zero();
    const ballots = zero();
    const cityVotes: Record<string, number> = {};
    const turnout = { voters: 0, eligible: 0 };
    const terms: Array<Partial<OfficeTermDoc>> = [];
    const allRows: DistrictCountRow[] = [];
    for (const [i, dist] of ds.entries()) {
      const e = es[i]!;
      const votes = votesBy[e._id] ?? {};
      for (const [id, n] of Object.entries(votes)) cityVotes[id] = (cityVotes[id] ?? 0) + n;
      const lines = (await countLines(e, cityId, session)) as DistrictCountLine[];
      const r = countDistrict({
        lines,
        ballotsByFaction: cardBallots(cards, votes),
        opinion: shares.get(dist.id)!,
        rng: createRng(`${e.seed}:draw`),
      });
      const t = await turnoutOf(e._id, districtResidentsFilter(cityId, dist.id, d), votes, session);
      turnout.voters += t.voters;
      turnout.eligible += t.eligible;
      const scoreboard: ScoreboardTableView[] = scoreboards.get(dist.id) ?? [];
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
              // The voting rework (tech design §8.3): the district's votes by card, for its party rows.
              cardVotes: votes,
              scoreboard,
            },
            countedAt: at,
          },
        },
        { session },
      );
      if (counted.matchedCount === 0) throw new AlreadySettled();
      allRows.push(...r.rows);
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
      r.seated.forEach((row, idx) => {
        const b = (e.ballot ?? []).find((x) => x.key === row.key)!;
        seats[row.factionId] += 1;
        terms.push({
          cityId,
          councilKey: councilKey(cityId, k),
          electionId: e._id,
          seat: seatOf(dist.n, idx),
          factionId: row.factionId,
          districtId: dist.id,
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
          // ADR 0084 §5: a player's rule from the candidacy; a capital local names none.
          rule:
            row.kind === 'player' ? (b.rule ?? content.faction(row.factionId).branchMotion) : null,
        });
      });
      for (const f of r.factions) ballots[f.factionId] += f.ballots;
    }
    // ADR 0085: the largest bloc's card wins; ties by votes, opinion, the cycle's draw.
    const opinion = averageShares([...shares.values()]);
    const dec = decideCapitalRule({
      cards,
      seatsByFaction: seats,
      votes: cityVotes,
      opinion,
      drawOrder: drawOrderOf(createRng(`${es[0]?.seed ?? cityId}:rule`)),
    });
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
      const prev = councilDay(d - 1, offset);
      await RuleBallot.create(
        [{ ...openBallotDoc(cityId, k - 1, prev.council.fromDay), status: 'counted', cards, result }],
        { session },
      );
    }
    set.ordinance = { id: dec.winner, ...window, paperId: ballotId };
    push.ordinanceHistory = { $each: [{ id: dec.winner, ...window }], $slice: -4 };

    // A seat vacated at a move is not a completed term (ADR 0026).
    await OfficeTerm.updateMany(
      { councilKey: councilKey(cityId, k - 1), vacatedDay: null },
      { $set: { completed: true } },
      { session },
    );
    const inserted = await OfficeTerm.insertMany(terms, { session });
    // Slice 7 (ADR 0048): the Mayor, from the largest bloc (seats, then ballots, opinion, the draw).
    const governor = await governorAtCount(content, {
      cityId,
      k,
      d,
      bloc: councilOrder(seats, ballots, opinion, drawOrderOf(createRng(`${es[0]?.seed ?? cityId}:rule`)))[0] ?? null,
      seated: inserted.map((x) => x.toObject() as OfficeTermDoc),
      rows: allRows,
      session,
    });
    await Election.insertMany(
      ds.map((dist) => districtElection(content, cityId, dist, k, offset, false, at)),
      { session },
    );
    await RuleBallot.create([openBallotDoc(cityId, k, d)], { session });
    const npcSeats = terms.filter((t) => t.holder?.kind === 'npc');
    const npcByFaction = zero();
    for (const t of npcSeats) npcByFaction[t.factionId!] += 1;
    set.council = {
      key: councilKey(cityId, k),
      fromDay: d,
      toDay: d + COUNCIL.termDays,
      npcSeats: npcSeats.length,
      seats: CAPITAL_COUNCIL.seats,
      npcSeatsByFaction: npcByFaction,
      governor,
    };
  }

  // 6. The set (cycle day 2): the five lists freeze, then one card per party (ADR 0085).
  if (work.set) {
    for (const dist of ds) await freezeDistrict(content, cityId, dist, k, at, session);
    const seatRows = await seatRules(content, cityId, k, session);
    const order = await capitalCardOrder(
      content,
      cityId,
      k,
      seatRows,
      session,
      averageShares([...shares.values()]),
    );
    await setBallotStep(
      content,
      { cityId, k, fromDay: cal.council.fromDay, unrest: false, capital: true, order },
      session,
    );
  }

  // 8. Write the districts and settle the city.
  await writeLedger(content, ledger, session);
  await District.bulkWrite(
    ds.map((dist) => {
      const doc = docOf(dist.id);
      const st = states.get(dist.id)!;
      const opinion = shares.get(dist.id)!;
      return {
        updateOne: {
          filter: { _id: dist.id },
          update: {
            $set: {
              opinion,
              state: {
                day: d,
                battleground: st.battleground,
                controlledBy: st.controlledBy,
                previous: { battleground: doc.state.battleground, controlledBy: doc.state.controlledBy },
                leader: districtLeader(opinion),
              },
              groundswell: st.groundswell,
            },
            $push: {
              stateLog: {
                $each: [{ day: d, opinion, battleground: st.battleground, controlledBy: st.controlledBy }],
                $slice: -60,
              },
            },
          },
        },
      };
    }),
    { session },
  );
  const done = await City.updateOne(
    { _id: cityId, 'world.settledDay': d - 1, 'world.voting': 2 },
    { $set: { ...set, 'world.settledDay': d }, ...(Object.keys(push).length > 0 ? { $push: push } : {}) },
    { session },
  );
  if (done.matchedCount === 0) throw new AlreadySettled();
}

/** Election k − 1 of a district, polling; an NPC-only one is counted when none is on record. */
async function prevElection(
  content: GameContent,
  cityId: string,
  dist: DistrictSpec,
  k: number,
  offset: number,
  d: DayKey,
  at: Date,
  session: ClientSession,
): Promise<ElectionDoc> {
  const id = electionKey(dist.id, k);
  let e = await Election.findById(id).session(session).lean<ElectionDoc>();
  if (!e) {
    await Election.create(
      [{ ...districtElection(content, cityId, dist, k, offset, true, at), countDay: d }],
      {
        session,
      },
    );
    e = await Election.findById(id).session(session).lean<ElectionDoc>();
  }
  if (!e || e.status !== 'polling') throw new AlreadySettled();
  return e;
}

/**
 * Cycle day 2 in a district (ADR 0084 §2): every standing player by filing, then each faction's
 * locals to two names; the list freezes. No strike, no doubling.
 */
async function freezeDistrict(
  content: GameContent,
  cityId: string,
  dist: DistrictSpec,
  k: number,
  at: Date,
  session: ClientSession,
): Promise<void> {
  const e = await Election.findById(electionKey(dist.id, k)).session(session).lean<ElectionDoc>();
  if (!e || e.status !== 'nominations') return;
  const cands = await Candidacy.find({ electionId: e._id, status: 'standing' })
    .sort({ filedAt: 1 })
    .session(session)
    .lean<CandidacyDoc[]>();
  const fill: Record<FactionId, number> = zero();
  for (const f of FACTION_IDS) fill[f] = npcFill(cands.filter((c) => c.factionId === f).length);
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
