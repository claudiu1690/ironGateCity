import type { GameContent } from '@irongate/content';
import {
  Candidacy,
  Character,
  City,
  Election,
  OfficeTerm,
  OrderPaper,
  isDuplicateKeyError,
} from '@irongate/db';
import type {
  BallotLine,
  CandidacyDoc,
  CharacterDoc,
  CityDoc,
  ElectionDoc,
  OrderPaperDoc,
} from '@irongate/db';
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
  divide,
  drawNpcSlate,
  electionKey,
  isMonday,
  moraleState,
  moraleTransition,
  weekOf,
} from '@irongate/rules';
import type { DayKey, NpcSlateEntry, OpinionShares } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { captureException } from '../sentry';
import { bootstrapCapital, processCapitalBoundary } from './capitalDay';
import {
  AlreadySettled,
  activeMembersFilter,
  cityDayHooks,
  countLines,
  newSeed,
  tally,
  turnoutOf,
} from './cityDayCore';
import { bootstrapIssues, drawWeek, heroesStep, issuesStep } from './issuesDay';
import { writeLedger } from './ledger';
import type { LedgerRowInput } from './ledger';
import { placesOf } from './residence';
import { inTransaction } from './txn';

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
  const secretary = content.npc(faction.secretary.npcId)!;
  return { city, offset: city.council.offset, home: city.homeFactionId, faction, secretary };
}

const branchItem = (spec: ReturnType<typeof councilSpec>, day: DayKey, at: Date) => ({
  ordinanceId: spec.faction.branchMotion,
  movedBy: {
    kind: 'branch' as const,
    npcId: spec.secretary.id,
    name: spec.secretary.name,
    factionId: spec.home,
  },
  at,
  day,
});

/** The nine NPC ballot lines of a slate (a bootstrap on a polling day, or a missing election). */
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
      platform: c?.line ?? '',
      order: first + i,
    };
  });
}

/**
 * §7.3: a city with no `world` gets, in one transaction, a sitting NPC council (the top seven of
 * the slate), its order paper with the branch's motion, the branch's motion in force, the current
 * election in the phase of the day, and (slice 4) the week's Issues.
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
        // A polling day: no player could have filed, so the ballot is the nine NPCs.
        smallBranch: null,
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
        issues: { weekDay: weekOf(today), live, effects: [] },
      },
      $setOnInsert: { opinion },
    },
    { session, upsert: true },
  );
  if (done.matchedCount === 0 && done.upsertedCount === 0) throw new AlreadySettled();
}

/**
 * One boundary `d` of one city (§7.2): the drift; on Mondays the Issues (slice 4); into cycle day 0
 * the count, the City Heroes (slice 4), the seating, the next election and order paper; into day 2
 * the close and the division; the morale record; and `world.settledDay = d`. Throws AlreadySettled
 * when another runner got there first.
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
    const votes = await tally(e._id, session);
    const r = countElection(await countLines(e, cityId, session), votes);
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
    await OfficeTerm.insertMany(
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
        };
      }),
      { session },
    );
    // ADR 0022: +2 per player seat; −3 when no player voted.
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

    // Open election k and order paper k.
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
          factionId: home,
          kind: 'player',
          characterId: c.characterId,
          candidacyId: c._id,
          name: c.name,
          platform: content.platform(home, c.platformId)?.line ?? '',
          order: i,
        };
      });
      const ballot = [
        ...players,
        ...npcBallot(content, e.npcSlate, players.length, close.ballotNpcs.length, home),
      ];
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
      const npcSeats = await OfficeTerm.countDocuments({
        councilKey: paperId,
        'holder.kind': 'npc',
        vacatedDay: null,
      }).session(session);
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

  await writeLedger(content, ledger, session);
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
 * transaction each (bootstrapping first if the city has none). Idempotent and safe to race. Slice 4:
 * the capital takes its own boundary (ADR 0027); a city settled before slice 4 first draws the week
 * it is in (ADR 0029 §4).
 */
export async function settleCityDay(content: GameContent, cityId: string, now: number): Promise<CityDoc> {
  const today = dayKey(now);
  const capital = content.isDistricted(cityId);
  for (let guard = 0; guard < 1_000; guard++) {
    const city = await City.findById(cityId).lean<CityDoc>();
    const needsIssues = !!city?.world && !city.issues;
    if (!needsIssues && city?.world && city.world.settledDay >= today) return city;
    const d = city?.world ? city.world.settledDay + 1 : today;
    try {
      await inTransaction((session) => {
        if (needsIssues) return bootstrapIssues(content, cityId, weekOf(city.world!.settledDay), session);
        if (!city?.world) {
          return capital
            ? bootstrapCapital(content, cityId, now, session)
            : bootstrap(content, cityId, now, session);
        }
        return capital
          ? processCapitalBoundary(content, cityId, d, now, session)
          : processBoundary(content, cityId, d, now, session);
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
