import { randomBytes } from 'node:crypto';
import type { GameContent } from '@irongate/content';
import {
  Candidacy,
  Character,
  City,
  Election,
  OfficeTerm,
  OrderPaper,
  Vote,
  isDuplicateKeyError,
} from '@irongate/db';
import type { BallotLine, CandidacyDoc, CityDoc, ElectionDoc, OrderPaperDoc } from '@irongate/db';
import {
  COUNCIL,
  MORALE,
  applyDrift,
  applyMoraleLoss,
  applyPersuasion,
  boundaryWork,
  closeNominations,
  councilDay,
  councilKey,
  countElection,
  createRng,
  dayKey,
  dayStart,
  divide,
  drawNpcSlate,
  electionKey,
  moraleState,
  moraleTransition,
  wardVote,
} from '@irongate/rules';
import type { CountLine, DayKey, FactionId, NpcSlateEntry } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { captureException } from '../sentry';
import { inTransaction } from './txn';

/**
 * The city's day (ADR 0017, tech design §7): every world boundary of a council city, settled once,
 * boundary by boundary, by the Agenda job or by the first request that needs the city. Each
 * boundary is one transaction guarded by `world.settledDay: d − 1`; every derived document has a
 * natural unique key, so a second runner can never duplicate one. The decisions are pure functions
 * in `@irongate/rules`; this file reads and writes.
 */

/** Another runner settled (or bootstrapped) this boundary first: re-read and carry on. */
export class AlreadySettled extends Error {
  override name = 'AlreadySettled';
}

const DAY_MS = 86_400_000;

/** Test seams (server tests only): fixed seeds for replayable runs, and an injected failure. */
export const cityDayHooks: {
  seed?: (cityId: string, cycle: number) => string;
  beforeBoundary?: (cityId: string, day: DayKey) => void;
  /** Called after every transaction attempt that lost to another runner (the report counts them). */
  onRetry?: (cityId: string, day: DayKey) => void;
  /**
   * Cities whose order papers carry no branch's motion, so no ordinance is ever in force unless a
   * player moves one: slice-1/2 tests that pin shift and training numbers across days.
   */
  noBranchMotion?: Set<string>;
} = {};

const withBranch = (cityId: string) => !cityDayHooks.noBranchMotion?.has(cityId);

const newSeed = (cityId: string, cycle: number) =>
  cityDayHooks.seed?.(cityId, cycle) ?? randomBytes(16).toString('hex');

/** Resident Rank 2+ members of the home faction active in the seven days before `day` (design §17 Q17). */
export function activeMembersFilter(cityId: string, factionId: FactionId, day: DayKey) {
  return {
    homeCityId: cityId,
    factionId,
    rank: { $gte: COUNCIL.voteRank },
    lastActionAt: { $gte: new Date(dayStart(day) - COUNCIL.activeEndorserDays * DAY_MS) },
  };
}

function councilSpec(content: GameContent, cityId: string) {
  const city = content.city(cityId);
  if (!city?.council || !city.homeFactionId) throw new Error(`city "${cityId}" has no council`);
  const faction = content.faction(city.homeFactionId);
  const secretary = content.npc(faction.secretary.npcId)!;
  return { city, offset: city.council.offset, home: city.homeFactionId, faction, secretary };
}

const branchItem = (spec: ReturnType<typeof councilSpec>, day: DayKey, at: Date) => ({
  ordinanceId: spec.faction.branchMotion,
  movedBy: { kind: 'branch' as const, npcId: spec.secretary.id, name: spec.secretary.name },
  at,
  day,
});

/** The nine NPC ballot lines of a slate (a bootstrap on a polling day, or a missing election). */
function npcBallot(
  content: GameContent,
  slate: readonly NpcSlateEntry[],
  first: number,
  n: number,
): BallotLine[] {
  return slate.slice(0, n).map((s, i) => {
    const c = content.candidate(s.npcId);
    return {
      key: `n:${s.npcId}`,
      kind: 'npc',
      npcId: s.npcId,
      name: c?.name ?? s.npcId,
      platform: c?.line ?? '',
      order: first + i,
    };
  });
}

/**
 * §7.3: a city with no `world` gets, in one transaction, a sitting NPC council (the top seven of
 * the slate), its order paper with the branch's motion, the branch's motion in force, and the
 * current election in the phase of the day.
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
      fromDay: c0,
      toDay: c0 + COUNCIL.termDays,
      holder: { kind: 'npc', npcId: s.id, name: s.name },
      place: i + 1,
      total: s.profile,
      completed: false,
    })),
    { session },
  );

  const branch = spec.faction.branchMotion;
  const divided = cal.cycleDay >= 2;
  const inForce = divided
    ? { id: branch, fromDay: c0 + 2, toDay: c0 + 2 + COUNCIL.ordinanceDays, paperId: councilKey(cityId, k) }
    : { id: branch, fromDay: c0 + 2 - COUNCIL.ordinanceDays, toDay: c0 + 2, paperId: null };
  await OrderPaper.create(
    [
      {
        _id: councilKey(cityId, k),
        cityId,
        cycle: k,
        fromDay: c0,
        divideDay: c0 + 2,
        status: divided ? 'divided' : 'open',
        items: withBranch(cityId) ? [branchItem(spec, today, at)] : [],
        votes: [],
        division:
          divided && withBranch(cityId)
            ? {
                tallies: [
                  { choice: branch, player: 0, npc: COUNCIL.seats },
                  { choice: 'against', player: 0, npc: 0 },
                ],
                npcChoice: branch,
                npcAbstained: false,
                passed: branch,
                inForce: { fromDay: inForce.fromDay, toDay: inForce.toDay },
              }
            : null,
      },
    ],
    { session },
  );

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
        factionId: spec.home,
        cycle: k,
        nominationsFrom: cal.election.nominationsFrom,
        pollsFrom: cal.election.pollsFrom,
        countDay: cal.election.countDay,
        status: cal.phase === 'polling' ? 'polling' : 'nominations',
        seed,
        npcSlate,
        filed: 0,
        // A polling day: no player could have filed, so the ballot is the nine NPCs.
        smallBranch: null,
        ballot: cal.phase === 'polling' ? npcBallot(content, npcSlate, 0, COUNCIL.slateSize) : null,
        ballots: 0,
        result: null,
        closedAt: cal.phase === 'polling' ? at : null,
        countedAt: null,
      },
    ],
    { session },
  );

  const share = opinion[spec.home];
  const done = await City.updateOne(
    { _id: cityId, world: { $exists: false } },
    {
      $set: {
        world: { settledDay: today, bootstrappedDay: today },
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
      },
      $setOnInsert: { opinion },
    },
    { session, upsert: true },
  );
  if (done.matchedCount === 0 && done.upsertedCount === 0) throw new AlreadySettled();
}

/** Every vote of an election, grouped by candidate (the count's `$group`, ADR 0019). */
async function tally(electionId: string, session: ClientSession): Promise<Record<string, number>> {
  const rows = await Vote.aggregate<{ _id: string; n: number }>([
    { $match: { electionId } },
    { $group: { _id: '$candidateKey', n: { $sum: 1 } } },
  ]).session(session);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

/** The count lines of a frozen ballot: the player ward vote from Local Standing now (design §17 Q1). */
async function countLines(
  e: Pick<ElectionDoc, '_id' | 'ballot' | 'npcSlate'>,
  cityId: string,
  session: ClientSession,
): Promise<CountLine[]> {
  const ballot = e.ballot ?? [];
  const playerIds = ballot.flatMap((b) => (b.characterId ? [b.characterId] : []));
  const chars = await Character.find({ _id: { $in: playerIds } }, { localStanding: 1, name: 1 })
    .session(session)
    .lean();
  const cands = await Candidacy.find(
    { electionId: e._id, characterId: { $in: playerIds } },
    { characterId: 1, effective: 1 },
  )
    .session(session)
    .lean();
  return ballot.map((b): CountLine => {
    if (b.kind === 'player' && b.characterId) {
      const c = chars.find((x) => x._id.equals(b.characterId!));
      const successes = c?.localStanding.find((s) => s.cityId === cityId)?.successes ?? 0;
      const cand = cands.find((x) => x.characterId.equals(b.characterId!));
      return {
        key: b.key,
        kind: 'player',
        name: c?.name ?? b.name,
        wardVote: wardVote(successes),
        successes,
        endorsements: cand?.effective ?? 0,
        order: b.order,
      };
    }
    const npc = e.npcSlate.find((s) => s.npcId === b.npcId);
    return {
      key: b.key,
      kind: 'npc',
      name: b.name,
      wardVote: npc?.wardVote ?? 0,
      // Design §17 Q5: an NPC's Standing Successes for the tie-break are profile × 5, before jitter.
      successes: (npc?.profile ?? 0) * 5,
      endorsements: 0,
      order: b.order,
    };
  });
}

/**
 * One boundary `d` of one city (§7.2): the drift; into cycle day 0 the count, the seating, the next
 * election and order paper; into day 2 the close and the division; the morale record; and
 * `world.settledDay = d`. Throws AlreadySettled when another runner got there first.
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
  if (!city?.world || city.world.settledDay !== d - 1) throw new AlreadySettled();
  const home = spec.home;
  const work = boundaryWork(d, spec.offset);
  const cal = councilDay(d, spec.offset);
  const at = new Date(now);

  let shares = applyDrift(city.opinion, home).shares;
  const set: Record<string, unknown> = {};
  const push: Record<string, unknown> = {};

  if (work.count) {
    // Election k − 1 → council k.
    const prevKey = electionKey(cityId, cal.cycle - 1);
    let e = await Election.findById(prevKey).session(session).lean<ElectionDoc>();
    if (!e) {
      // No election on record (data loss): count an NPC-only one so the council still sits.
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
            factionId: home,
            cycle: cal.cycle - 1,
            nominationsFrom: prev.election.nominationsFrom,
            pollsFrom: prev.election.pollsFrom,
            countDay: d,
            status: 'polling',
            seed,
            npcSlate,
            ballot: npcBallot(content, npcSlate, 0, COUNCIL.slateSize),
            closedAt: at,
          },
        ],
        { session },
      );
      e = await Election.findById(prevKey).session(session).lean<ElectionDoc>();
    }
    if (!e || e.status !== 'polling') throw new AlreadySettled();
    const votes = await tally(e._id, session);
    const r = countElection(await countLines(e, cityId, session), votes);
    const voters = Object.values(votes).reduce((a, b) => a + b, 0);
    // Design §17 Q17: the active branch. A member who cast a ballot in this election was active,
    // whatever their last action, so the voters are always part of it.
    const active = await Character.find(activeMembersFilter(cityId, home, d), { _id: 1 })
      .session(session)
      .lean();
    const voterIds = await Vote.distinct('voterId', { electionId: e._id }).session(session);
    const eligible = new Set([...active.map((x) => x._id.toHexString()), ...voterIds.map((v) => String(v))])
      .size;
    const counted = await Election.updateOne(
      { _id: e._id, status: 'polling' },
      {
        $set: {
          status: 'counted',
          result: {
            rows: r.rows,
            turnout: { voters, eligible },
            npcSeats: r.npcSeats,
            topKey: r.topKey,
            lastSeatKey: r.lastSeatKey,
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
    await OfficeTerm.updateMany(
      { councilKey: councilKey(cityId, cal.cycle - 1) },
      { $set: { completed: true } },
      { session },
    );
    await OfficeTerm.insertMany(
      r.seated.map((row, i) => {
        const b = (e.ballot ?? []).find((x) => x.key === row.key)!;
        return {
          cityId,
          councilKey: councilKey(cityId, cal.cycle),
          electionId: e._id,
          seat: i + 1,
          fromDay: d,
          toDay: d + COUNCIL.termDays,
          holder:
            row.kind === 'player'
              ? { kind: 'player', characterId: b.characterId, name: row.name }
              : { kind: 'npc', npcId: b.npcId, name: row.name },
          place: row.place,
          total: row.total,
          completed: false,
        };
      }),
      { session },
    );
    // ADR 0022: +2 per player seat; −3 when no player voted.
    const playerSeats = r.seated.filter((x) => x.kind === 'player').length;
    if (playerSeats > 0) {
      shares = applyPersuasion(shares, {
        factionId: home,
        swing: MORALE.seat * playerSeats,
        homeFactionId: home,
      }).shares;
    }
    if (voters === 0) shares = applyMoraleLoss(shares, home, MORALE.noVoterPenalty).shares;

    // Open election k and order paper k.
    const seed = newSeed(cityId, cal.cycle);
    await Election.create(
      [
        {
          _id: electionKey(cityId, cal.cycle),
          cityId,
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
    await OrderPaper.create(
      [
        {
          _id: councilKey(cityId, cal.cycle),
          cityId,
          cycle: cal.cycle,
          fromDay: d,
          divideDay: d + 2,
          status: 'open',
          items: withBranch(cityId) ? [branchItem(spec, d, at)] : [],
        },
      ],
      { session },
    );
    set.council = {
      key: councilKey(cityId, cal.cycle),
      fromDay: d,
      toDay: d + COUNCIL.termDays,
      npcSeats: r.npcSeats,
    };
  }

  if (work.close) {
    const e = await Election.findById(electionKey(cityId, cal.cycle)).session(session).lean<ElectionDoc>();
    if (e && e.status === 'nominations') {
      const cands = await Candidacy.find({ electionId: e._id, status: 'filed' })
        .sort({ filedAt: 1 })
        .session(session)
        .lean<CandidacyDoc[]>();
      const filter = activeMembersFilter(cityId, home, d);
      const eligible = await Character.countDocuments(filter).session(session);
      const others: number[] = [];
      for (const c of cands) {
        others.push(
          await Character.countDocuments({ ...filter, _id: { $ne: c.characterId } }).session(session),
        );
      }
      const close = closeNominations({
        candidacies: cands.map((c, i) => ({
          id: c._id.toHexString(),
          filedAt: c.filedAt.getTime(),
          members: c.endorsements.length,
          branch: c.branch !== null,
          otherEndorsers: others[i]!,
        })),
        npcSlate: e.npcSlate,
      });
      const byId = new Map(cands.map((c) => [c._id.toHexString(), c]));
      const players: BallotLine[] = close.standing.map((id, i) => {
        const c = byId.get(id)!;
        return {
          key: `p:${c.characterId.toHexString()}`,
          kind: 'player',
          characterId: c.characterId,
          candidacyId: c._id,
          name: c.name,
          platform: content.platform(home, c.platformId)?.line ?? '',
          order: i,
        };
      });
      const ballot = [...players, ...npcBallot(content, e.npcSlate, players.length, close.ballotNpcs.length)];
      if (cands.length > 0) {
        await Candidacy.bulkWrite(
          cands.map((c) => {
            const id = c._id.toHexString();
            const stands = close.standing.includes(id);
            return {
              updateOne: {
                filter: { _id: c._id, status: 'filed' },
                update: {
                  $set: {
                    status: stands ? 'standing' : 'struck',
                    deposit: stands ? 'spent' : 'due',
                    effective: close.effective[id],
                    smallBranch: close.smallBranch[id],
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
        { $set: { status: 'polling', smallBranch: { endorsers: eligible }, ballot, closedAt: at } },
        { session },
      );
      if (closed.matchedCount === 0) throw new AlreadySettled();
    }
  }

  if (work.divide) {
    const paperId = councilKey(cityId, cal.cycle);
    const p = await OrderPaper.findById(paperId).session(session).lean<OrderPaperDoc>();
    if (p && p.status === 'open') {
      const npcSeats = await OfficeTerm.countDocuments({ councilKey: paperId, 'holder.kind': 'npc' }).session(
        session,
      );
      const unrest = moraleState(shares[home]) === 'unrest';
      const v = divide({
        items: p.items.map((it) => ({
          ordinanceId: it.ordinanceId,
          branch: it.movedBy.kind === 'branch',
          movedAt: new Date(it.at).getTime(),
        })),
        playerVotes: p.votes,
        npcSeats,
        unrest,
      });
      const inForce = v.passed ? { fromDay: d, toDay: d + COUNCIL.ordinanceDays } : null;
      const divided = await OrderPaper.updateOne(
        { _id: paperId, status: 'open' },
        { $set: { status: 'divided', division: { ...v, inForce } } },
        { session },
      );
      if (divided.matchedCount === 0) throw new AlreadySettled();
      set.ordinance = v.passed
        ? { id: v.passed, fromDay: d, toDay: d + COUNCIL.ordinanceDays, paperId }
        : null;
      if (v.passed) {
        push.ordinanceHistory = {
          $each: [{ id: v.passed, fromDay: d, toDay: d + COUNCIL.ordinanceDays }],
          $slice: -4,
        };
      }
    }
  }

  const share = shares[home];
  const m = moraleTransition(city.morale ?? null, share, d);
  const done = await City.updateOne(
    { _id: cityId, 'world.settledDay': d - 1 },
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
 * transaction each (bootstrapping first if the city has none). Idempotent and safe to race.
 */
export async function settleCityDay(content: GameContent, cityId: string, now: number): Promise<CityDoc> {
  const today = dayKey(now);
  for (let guard = 0; guard < 1_000; guard++) {
    const city = await City.findById(cityId).lean<CityDoc>();
    if (city?.world && city.world.settledDay >= today) return city;
    const d = city?.world ? city.world.settledDay + 1 : today;
    try {
      await inTransaction((session) =>
        city?.world
          ? processBoundary(content, cityId, d, now, session)
          : bootstrap(content, cityId, now, session),
      );
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
 * The worker's job and the e2e hook: every council city. A failure in one city does not stop the
 * others; the run then fails so Agenda records it.
 */
export async function runCityDay(
  content: GameContent,
  now: number,
): Promise<{ settled: Array<{ cityId: string; settledDay: DayKey | null }>; failed: string[] }> {
  const settled: Array<{ cityId: string; settledDay: DayKey | null }> = [];
  const failed: string[] = [];
  const errors: unknown[] = [];
  for (const city of content.councilCities()) {
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
