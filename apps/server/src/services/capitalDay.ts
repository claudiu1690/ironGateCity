import type { GameContent } from '@irongate/content';
import { Candidacy, Character, City, District, Election, OfficeTerm, OrderPaper } from '@irongate/db';
import type {
  BallotLine,
  CandidacyDoc,
  CityDoc,
  DistrictDoc,
  ElectionDoc,
  OfficeTermDoc,
  OrderPaperDoc,
} from '@irongate/db';
import {
  CAPITAL_COUNCIL,
  COUNCIL,
  FACTION_IDS,
  applyBaselineDrift,
  averageShares,
  boundaryWork,
  closeNominations,
  councilDay,
  councilKey,
  councilOrder,
  countDistrict,
  createRng,
  dayKey,
  districtLeader,
  districtState,
  divideCapital,
  drawNpcSlate,
  drawOrderOf,
  electionKey,
  isMonday,
  npcFill,
  weekOf,
} from '@irongate/rules';
import type {
  DayKey,
  DistrictCountLine,
  FactionId,
  NpcSlateEntry,
  OpinionShares,
  ScoreboardTableView,
} from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import {
  AlreadySettled,
  activeMembersFilter,
  cityDayHooks,
  countLines,
  districtResidentsFilter,
  newSeed,
  tally,
  turnoutOf,
} from './cityDayCore';
import { drawWeek, heroesStep, issuesStep } from './issuesDay';
import { writeLedger } from './ledger';
import type { LedgerRowInput } from './ledger';

/**
 * The capital's day (slice-4 tech design §7.2–§7.3, ADR 0027): one transaction per boundary over
 * the city document (calendar, council, ordinance, Issues) and its five district documents (the
 * meters and their states). Drift → Issues (Monday) → states → the five counts and the new council
 * (cycle day 0) → heroes → close (day 2) → divide (day 2). Ballots and seats never move opinion.
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
        platform: c?.line ?? '',
        order: first + out.length,
      });
    }
  }
  return out;
}

/** The branch motions of the seated blocs, items 1–3 (design §8.4). */
function branchItems(
  content: GameContent,
  seats: Record<FactionId, number>,
  ballots: Record<FactionId, number>,
  opinion: OpinionShares,
  drawOrder: FactionId[],
  day: DayKey,
  at: Date,
) {
  return councilOrder(seats, ballots, opinion, drawOrder).map((f) => {
    const faction = content.faction(f);
    const secretary = content.npc(faction.secretary.npcId)!;
    return {
      ordinanceId: faction.branchMotion,
      movedBy: { kind: 'branch' as const, npcId: secretary.id, name: secretary.name, factionId: f },
      at,
      day,
    };
  });
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
    smallBranch: null,
    ballot: polling ? npcLines(content, npcSlate, 0, () => npcFill(0)) : null,
    ballots: 0,
    result: null,
    closedAt: polling ? at : null,
    countedAt: null,
  };
}

/**
 * §7.3: the capital with no `world` gets, in one transaction: the five districts at their
 * baselines, a sitting NPC council counted on the baselines, its order paper (divided on day 2+:
 * an NPC-only council passes nothing), the five elections in the phase of the day and the week's
 * Issues.
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
  // faction's two NPCs at their profiles.
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
      endorsements: 0,
      order: idx,
      factionId: s.factionId,
    }));
    const r = countDistrict({
      lines,
      votes: {},
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
      });
    });
  }
  await OfficeTerm.insertMany(terms, { session });

  const cityOpinion = averageShares(ds.map((d) => d.baseline));
  const drawOrder = drawOrderOf(createRng(`${newSeed(cityId, k)}:order`));
  const items = branchItems(content, seats, zero(), cityOpinion, drawOrder, today, at);
  const divided = cal.cycleDay >= 2;
  const division = divided
    ? divideCapital({
        items: items.map((it) => ({
          ordinanceId: it.ordinanceId,
          branchOf: it.movedBy.factionId,
          movedAt: now,
        })),
        playerVotes: [],
        npcSeats: seats,
      })
    : null;
  const inForce = division?.passed ? { fromDay: c0 + 2, toDay: c0 + 2 + COUNCIL.ordinanceDays } : null;
  await OrderPaper.create(
    [
      {
        _id: councilKey(cityId, k),
        cityId,
        cycle: k,
        fromDay: c0,
        divideDay: c0 + 2,
        status: divided ? 'divided' : 'open',
        items,
        votes: [],
        division: division
          ? {
              tallies: division.tallies,
              npcChoice: null,
              npcChoices: division.npcChoices,
              npcAbstained: false,
              passed: division.passed,
              inForce,
            }
          : null,
      },
    ],
    { session },
  );

  await Election.insertMany(
    ds.map((d) => districtElection(content, cityId, d, k, offset, cal.phase === 'polling', at)),
    { session },
  );

  const live = await drawWeek(content, cityId, weekOf(today), [], session);
  const done = await City.updateOne(
    { _id: cityId, world: { $exists: false } },
    {
      $set: {
        world: { settledDay: today, bootstrappedDay: today },
        council: {
          key: councilKey(cityId, k),
          fromDay: c0,
          toDay: c0 + COUNCIL.termDays,
          npcSeats: CAPITAL_COUNCIL.seats,
          seats: CAPITAL_COUNCIL.seats,
          npcSeatsByFaction: seats,
        },
        ordinance:
          division?.passed && inForce
            ? { id: division.passed, ...inForce, paperId: councilKey(cityId, k) }
            : null,
        ordinanceHistory: division?.passed && inForce ? [{ id: division.passed, ...inForce }] : [],
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
  if (!city?.world || city.world.settledDay !== d - 1) throw new AlreadySettled();
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

  // 4–5. The count, the new council and the heroes (cycle day 0).
  if (work.count) {
    const scoreboards = await heroesStep({
      cityId,
      places: ds.map((x) => ({ placeId: x.id, name: x.name, kind: 'district' as const })),
      cycle: k - 1,
      d,
      untilDay: d + COUNCIL.termDays,
      session,
    });
    const seats = zero();
    const ballots = zero();
    const terms: Array<Partial<OfficeTermDoc>> = [];
    for (const dist of ds) {
      const e = await prevElection(content, cityId, dist, k - 1, offset, d, at, session);
      const votes = await tally(e._id, session);
      const lines = (await countLines(e, cityId, session)) as DistrictCountLine[];
      const r = countDistrict({
        lines,
        votes,
        opinion: shares.get(dist.id)!,
        rng: createRng(`${e.seed}:draw`),
      });
      const turnout = await turnoutOf(e._id, districtResidentsFilter(cityId, dist.id, d), votes, session);
      const scoreboard: ScoreboardTableView[] = scoreboards.get(dist.id) ?? [];
      const counted = await Election.updateOne(
        { _id: e._id, status: 'polling' },
        {
          $set: {
            status: 'counted',
            result: {
              rows: r.rows,
              turnout,
              npcSeats: r.seated.filter((x) => x.kind === 'npc').length,
              topKey: r.seated[0]?.key ?? '',
              lastSeatKey: r.seated.at(-1)?.key ?? '',
              factions: r.factions,
              w: r.w,
              ballots: r.ballots,
              tie: r.tie,
              seatsByFaction: r.seatsByFaction,
              drawOrder: r.drawOrder,
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
        });
      });
      for (const s of r.factions) ballots[s.factionId] += s.ballots;
    }
    // A seat vacated at a move is not a completed term (ADR 0026).
    await OfficeTerm.updateMany(
      { councilKey: councilKey(cityId, k - 1), vacatedDay: null },
      { $set: { completed: true } },
      { session },
    );
    await OfficeTerm.insertMany(terms, { session });
    await Election.insertMany(
      ds.map((dist) => districtElection(content, cityId, dist, k, offset, false, at)),
      { session },
    );
    const drawOrder = drawOrderOf(createRng(`${newSeed(cityId, k)}:order`));
    const opinion = averageShares([...shares.values()]);
    await OrderPaper.create(
      [
        {
          _id: councilKey(cityId, k),
          cityId,
          cycle: k,
          fromDay: d,
          divideDay: d + 2,
          status: 'open',
          items: branchItems(content, seats, ballots, opinion, drawOrder, d, at),
        },
      ],
      { session },
    );
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
    };
  }

  // 6. Close nominations (cycle day 2): per district, per faction.
  if (work.close) {
    for (const dist of ds) await closeDistrict(content, cityId, dist, k, d, at, session);
  }

  // 7. Divide (cycle day 2).
  if (work.divide) {
    const paperId = councilKey(cityId, k);
    const p = await OrderPaper.findById(paperId).session(session).lean<OrderPaperDoc>();
    if (p && p.status === 'open') {
      const terms = await OfficeTerm.find({ councilKey: paperId, vacatedDay: null })
        .session(session)
        .lean<OfficeTermDoc[]>();
      const npcSeats = zero();
      for (const t of terms) if (t.holder.kind === 'npc' && t.factionId) npcSeats[t.factionId] += 1;
      const v = divideCapital({
        items: p.items.map((it) => ({
          ordinanceId: it.ordinanceId,
          branchOf: it.movedBy.kind === 'branch' ? (it.movedBy.factionId ?? null) : null,
          movedAt: new Date(it.at).getTime(),
        })),
        playerVotes: p.votes.flatMap((v) => {
          const t = terms.find(
            (x) => x.holder.kind === 'player' && x.holder.characterId.equals(v.characterId),
          );
          return t?.factionId ? [{ choice: v.choice, factionId: t.factionId }] : [];
        }),
        npcSeats,
      });
      const inForce = v.passed ? { fromDay: d, toDay: d + COUNCIL.ordinanceDays } : null;
      const divided = await OrderPaper.updateOne(
        { _id: paperId, status: 'open' },
        {
          $set: {
            status: 'divided',
            division: {
              tallies: v.tallies,
              npcChoice: null,
              npcChoices: v.npcChoices,
              npcAbstained: false,
              passed: v.passed,
              inForce,
            },
          },
        },
        { session },
      );
      if (divided.matchedCount === 0) throw new AlreadySettled();
      set.ordinance = v.passed && inForce ? { id: v.passed, ...inForce, paperId } : null;
      if (v.passed && inForce) {
        push.ordinanceHistory = { $each: [{ id: v.passed, ...inForce }], $slice: -4 };
      }
    }
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
    { _id: cityId, 'world.settledDay': d - 1 },
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
 * Cycle day 2 in a district: each faction's filed candidacies stand with two endorsements (the
 * faction's Irongate residents are its branch) or are struck; NPCs fill each faction's list to two;
 * the ballot is frozen (players by filing, then NPCs by faction).
 */
async function closeDistrict(
  content: GameContent,
  cityId: string,
  dist: DistrictSpec,
  k: number,
  d: DayKey,
  at: Date,
  session: ClientSession,
): Promise<void> {
  const e = await Election.findById(electionKey(dist.id, k)).session(session).lean<ElectionDoc>();
  if (!e || e.status !== 'nominations') return;
  const cands = await Candidacy.find({ electionId: e._id, status: 'filed' })
    .sort({ filedAt: 1 })
    .session(session)
    .lean<CandidacyDoc[]>();
  const standing = new Set<string>();
  const effective: Record<string, number> = {};
  const smallBranch: Record<string, boolean> = {};
  const fill: Record<FactionId, number> = zero();
  let endorsers = 0;
  for (const f of FACTION_IDS) {
    const own = cands.filter((c) => c.factionId === f);
    const filter = activeMembersFilter(cityId, f, d);
    endorsers += await Character.countDocuments(filter).session(session);
    const others: number[] = [];
    for (const c of own) {
      others.push(
        await Character.countDocuments({ ...filter, _id: { $ne: c.characterId } }).session(session),
      );
    }
    const close = closeNominations({
      candidacies: own.map((c, i) => ({
        id: c._id.toHexString(),
        filedAt: c.filedAt.getTime(),
        members: c.endorsements.length,
        branch: c.branch !== null,
        otherEndorsers: others[i]!,
      })),
      npcSlate: [],
    });
    for (const id of close.standing) standing.add(id);
    Object.assign(effective, close.effective);
    Object.assign(smallBranch, close.smallBranch);
    fill[f] = npcFill(close.standing.length);
  }
  const players: BallotLine[] = cands
    .filter((c) => standing.has(c._id.toHexString()))
    .map((c, i) => ({
      key: `p:${c.characterId.toHexString()}`,
      factionId: c.factionId!,
      kind: 'player',
      characterId: c.characterId,
      candidacyId: c._id,
      name: c.name,
      platform: content.platform(c.factionId!, c.platformId)?.line ?? '',
      order: i,
    }));
  const ballot = [
    ...players,
    ...npcLines(content, e.npcSlate as SlateEntry[], players.length, (f) => fill[f]),
  ];
  if (cands.length > 0) {
    await Candidacy.bulkWrite(
      cands.map((c) => {
        const id = c._id.toHexString();
        const stands = standing.has(id);
        return {
          updateOne: {
            filter: { _id: c._id, status: 'filed' },
            update: {
              $set: {
                status: stands ? 'standing' : 'struck',
                deposit: stands ? 'spent' : 'due',
                effective: effective[id],
                smallBranch: smallBranch[id],
              },
            },
          },
        };
      }),
      { session },
    );
  }
  const closed = await Election.updateOne(
    { _id: e._id, status: 'nominations' },
    { $set: { status: 'polling', smallBranch: { endorsers }, ballot, closedAt: at } },
    { session },
  );
  if (closed.matchedCount === 0) throw new AlreadySettled();
}
