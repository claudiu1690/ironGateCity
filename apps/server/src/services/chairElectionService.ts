import { randomBytes } from 'node:crypto';
import type { GameContent } from '@irongate/content';
import { Candidacy, Character, FactionElection, FactionState, OfficeTerm, Vote } from '@irongate/db';
import type { CandidacyDoc, CharacterDoc, FactionElectionDoc, FactionStateDoc, VoteDoc } from '@irongate/db';
import {
  CHAIR,
  FACTION_IDS,
  TERM_DAYS,
  backersOf,
  chairPhase,
  countChair,
  dayKey,
  dayStart,
  freezeChairList,
  standGate,
  termOf,
  termsWeight,
} from '@irongate/rules';
import type { ChairElectionView, ChairResultView, DayKey, FactionId, PoliticalResult } from '@irongate/rules';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { newsItem } from './nationDay';
import type { NationBoundaryCtx } from './nationDay';
import { nationResult, refusal, runNationAct, serviceRecord, spendPc } from './nationAct';
import type { NationActDeps, NationCtx } from './nationAct';
import { weekdayName } from './politicsService';

/**
 * Slice 7 T14 (docs/tech/slice-7.md §3.4, §8.2 `chairElectionService`; ADR 0047, 0084; design §4.1):
 * the Faction Chair's election. Names in on term days 9–10 (25 PC spent, no backers needed; backing
 * optional, +3 each, five counted; the secretary's backing when the member's orders are done), the
 * vote on 11–13 (Rank 2+, from anywhere, the secretary always on the ballot), the count into day 14.
 * The windows are opened, closed and counted by the nation's day (`chairElectionSteps`).
 */

export const chairElectionId = (f: FactionId, termIndex: number): string => `chair:${f}:${termIndex}`;
export const chairTermKey = (f: FactionId, termIndex: number): string => `chair:${f}:${termIndex}`;

const ACTIVE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The faction-wide eligible roll: Rank ≥ `rank`, active in the last seven days (design §4.1). */
export async function activeMembers(
  factionId: FactionId,
  rank: number,
  now: number,
  session: ClientSession | null = null,
): Promise<number> {
  const q = Character.countDocuments({
    factionId,
    rank: { $gte: rank },
    lastActionAt: { $gte: new Date(now - ACTIVE_DAYS * DAY_MS) },
  });
  return session ? q.session(session) : q;
}

/** The term whose Chair election is open (or last ran) on `day`: the current term from day 9. */
const electionTermOn = (day: DayKey): number => termOf(day).index;

/** A candidacy's backers: the members' endorsements and the secretary's (design §4.1). */
const backersOfCand = (c: Pick<CandidacyDoc, 'endorsements' | 'branch'>) =>
  backersOf({ members: c.endorsements.length, branch: c.branch !== null });

// ---------------------------------------------------------------------------------------------
// The acts.
// ---------------------------------------------------------------------------------------------

async function openElection(x: NationCtx, status: FactionElectionDoc['status']): Promise<FactionElectionDoc> {
  const n = electionTermOn(x.today);
  const e = await FactionElection.findById(chairElectionId(x.c.factionId, n)).session(x.session).lean<FactionElectionDoc>();
  const term = termOf(x.today);
  if (!e || e.status !== status) {
    const what = status === 'names' ? 'chairNames' : 'chairVotes';
    const opensOn =
      term.termDay < (status === 'names' ? TERM_DAYS.chair.namesFrom : TERM_DAYS.chair.votesFrom)
        ? term.fromDay + (status === 'names' ? TERM_DAYS.chair.namesFrom : TERM_DAYS.chair.votesFrom)
        : term.toDay + (status === 'names' ? TERM_DAYS.chair.namesFrom : TERM_DAYS.chair.votesFrom);
    throw new GameError('NOT_NOW', { phase: chairPhase(x.today), what, opensAt: dayStart(opensOn) });
  }
  return e;
}

/** `chairElection.stand` (§7.2): Rank 4, a completed council term, 14 days, not a second term; 25 PC spent. */
export function stand(deps: NationActDeps<{ platformId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'chairElection.stand', async (x) => {
    const { c, session, today } = x;
    const e = await openElection(x, 'names');
    const platform = (content.faction(c.factionId).chairPlatforms ?? []).find((p) => p.id === deps.input.platformId);
    if (!platform) throw new GameError('UNKNOWN_PLATFORM', { platformId: deps.input.platformId }, 'BAD_REQUEST');
    const existing = await Candidacy.findOne({ electionId: e._id, characterId: c._id }).session(session).lean<CandidacyDoc>();
    if (existing) throw new GameError('ALREADY_STANDING', { status: existing.status }, 'CONFLICT');
    const record = await serviceRecord(c, today, session);
    const gate = standGate('chair', record, c.pc);
    if (gate) throw refusal(gate, gate.reason === 'NOT_ENOUGH_PC' ? { pc: c.pc, cost: CHAIR.deposit } : {});
    const filed = await FactionElection.updateOne({ _id: e._id, status: 'names' }, { $inc: { filed: 1 } }, { session });
    if (filed.matchedCount === 0) throw new GameError('NOT_NOW', { phase: chairPhase(today) });
    const at = new Date(x.now);
    const ordersDone = c.orders.day === today && c.orders.allDoneAt !== null;
    await Candidacy.create(
      [
        {
          electionId: e._id,
          kind: 'chair',
          termIndex: e.termIndex,
          factionId: c.factionId,
          characterId: c._id,
          name: c.name,
          platformId: platform.id,
          filedAt: at,
          filedDay: today,
          status: 'standing',
          endorsements: [],
          // Design §4.1: the secretary backs a filed candidate whose three orders are done (+3, once).
          branch: ordersDone ? { day: today, at } : null,
          deposit: 'spent',
          place: null,
        },
      ],
      { session },
    );
    const updated = await spendPc(x, CHAIR.deposit);
    return nationResult(content, { ...x, c: updated }, {
      act: 'chairDeclare',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { name: c.name, pollsWeekday: weekdayName(e.votesFrom), countDay: weekdayName(e.countDay) },
      at: dayStart(e.votesFrom),
      knockOns: { pc: { before: c.pc, after: updated.pc } },
      view: { kind: 'chairElection', chairElection: await chairElectionView(content, updated, x.now, session) },
    });
  });
}

/** `chairElection.back` (§7.2): +3 to a standing candidate of your party, 10 PC, one per election, until the count. */
export function back(deps: NationActDeps<{ candidacyId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'chairElection.back', async (x) => {
    const { c, session, today } = x;
    const n = electionTermOn(today);
    const key = chairElectionId(c.factionId, n);
    const e = await FactionElection.findById(key).session(session).lean<FactionElectionDoc>();
    if (!e || (e.status !== 'names' && e.status !== 'voting')) throw new GameError('NOT_NOW', { phase: chairPhase(today) });
    if (c.rank < CHAIR.voteRank) throw new GameError('RANK_TOO_LOW', { need: CHAIR.voteRank });
    const cand = Types.ObjectId.isValid(deps.input.candidacyId)
      ? await Candidacy.findById(deps.input.candidacyId).session(session).lean<CandidacyDoc>()
      : null;
    if (!cand || cand.electionId !== key) throw new GameError('NOT_ON_BALLOT', { candidacyId: deps.input.candidacyId }, 'BAD_REQUEST');
    if (cand.characterId.equals(c._id)) throw new GameError('CANNOT_BACK_SELF', {}, 'BAD_REQUEST');
    if (cand.status !== 'standing') throw new GameError('CANDIDACY_CLOSED', { status: cand.status });
    const given = (c.termBackings ?? []).find((b) => b.key === key);
    if (given) throw new GameError('ALREADY_BACKED', { name: given.name }, 'CONFLICT');
    if (c.pc < CHAIR.backCost) throw new GameError('NOT_ENOUGH_PC', { pc: c.pc, cost: CHAIR.backCost });
    const at = new Date(x.now);
    const pushed = await Candidacy.updateOne(
      { _id: cand._id, status: 'standing', 'endorsements.characterId': { $ne: c._id } },
      { $push: { endorsements: { characterId: c._id, name: c.name, day: today, at } } },
      { session },
    );
    if (pushed.matchedCount === 0) throw new GameError('ALREADY_BACKED', { name: cand.name }, 'CONFLICT');
    const entry = { key, candidacyId: cand._id, name: cand.name, day: today };
    const updated = await spendPc(x, CHAIR.backCost, {
      set: { termBackings: [...(c.termBackings ?? []), entry].slice(-6) },
      filter: { 'termBackings.key': { $ne: key } },
    });
    const after = await Candidacy.findById(cand._id).session(session).lean<CandidacyDoc>();
    const n2 = backersOfCand(after!);
    return nationResult(content, { ...x, c: updated }, {
      act: 'chairBack',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { name: cand.name, n: String(n2), pollsWeekday: weekdayName(e.votesFrom), countDay: weekdayName(e.countDay) },
      at: dayStart(e.countDay),
      knockOns: { pc: { before: c.pc, after: updated.pc }, backers: { name: cand.name, n: n2 } },
      view: { kind: 'chairElection', chairElection: await chairElectionView(content, updated, x.now, session) },
    });
  });
}

/** `chairElection.vote` (§7.2): Rank 2+, one tap for a name on the frozen ballot, secret and final. */
export function vote(deps: NationActDeps<{ key: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'chairElection.vote', async (x) => {
    const { c, session, today } = x;
    const e = await openElection(x, 'voting');
    if (c.rank < CHAIR.voteRank) throw new GameError('RANK_TOO_LOW', { need: CHAIR.voteRank });
    const line = (e.ballot ?? []).find((l) => l.key === deps.input.key);
    if (!line) throw new GameError('NOT_ON_BALLOT', { key: deps.input.key }, 'BAD_REQUEST');
    const existing = await Vote.findOne({ electionId: e._id, voterId: c._id }).session(session).lean<VoteDoc>();
    if (existing) throw new GameError('ALREADY_VOTED', {}, 'CONFLICT');
    const open = await FactionElection.updateOne({ _id: e._id, status: 'voting' }, { $inc: { ballots: 1 } }, { session });
    if (open.matchedCount === 0) throw new GameError('NOT_NOW', { phase: chairPhase(today) });
    await Vote.create([{ electionId: e._id, voterId: c._id, candidateKey: line.key, day: today }], { session });
    return nationResult(content, x, {
      act: 'chairVote',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { name: line.name, countDay: weekdayName(e.countDay) },
      at: dayStart(e.countDay),
      view: { kind: 'chairElection', chairElection: await chairElectionView(content, c, x.now, session) },
    });
  });
}

/**
 * The secretary's backing in play (design §4.1; tech §8.2): when a write completes the member's three
 * orders while they have a standing Chair candidacy, the branch backs it (+3, once). Called from the
 * orders' completion beside slice 3's `branchBackIfStanding`, in the same transaction.
 */
export async function chairBranchBackIfStanding(
  session: ClientSession,
  c: Pick<CharacterDoc, '_id' | 'factionId'>,
  today: DayKey,
  now: number,
): Promise<void> {
  const phase = chairPhase(today);
  if (phase === 'none') return;
  await Candidacy.updateOne(
    {
      electionId: chairElectionId(c.factionId, electionTermOn(today)),
      characterId: c._id,
      status: 'standing',
      branch: null,
    },
    { $set: { branch: { day: today, at: new Date(now) } } },
    { session },
  );
}

// ---------------------------------------------------------------------------------------------
// The views.
// ---------------------------------------------------------------------------------------------

function secretaryOf(content: GameContent, f: FactionId) {
  const s = content.faction(f).secretary;
  const npc = content.npc(s.npcId);
  return { name: npc?.name ?? s.addressedAs, addressedAs: s.addressedAs };
}

/** `chairElection.get`: the card, the list (backers public), the stand card, your own vote only. */
export async function chairElectionView(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  session: ClientSession | null = null,
): Promise<ChairElectionView> {
  const today = dayKey(now);
  const term = termOf(today);
  const f = c.factionId;
  const key = chairElectionId(f, term.index);
  const s = <T>(q: { session(s: ClientSession | null): T }): T => q.session(session);
  const e = await s(FactionElection.findById(key)).lean<FactionElectionDoc>();
  const fs = await s(FactionState.findById(f)).lean<FactionStateDoc>();
  const cands = await s(Candidacy.find({ electionId: key, status: { $in: ['standing', 'elected', 'defeated'] } }).sort({ filedAt: 1 })).lean<CandidacyDoc[]>();
  const players = cands.length
    ? await s(Character.find({ _id: { $in: cands.map((x) => x.characterId) } }, { avatarId: 1, rank: 1, level: 1 })).lean<Pick<CharacterDoc, '_id' | 'avatarId' | 'rank' | 'level'>[]>()
    : [];
  const myVote = e ? await s(Vote.findOne({ electionId: key, voterId: c._id })).lean<VoteDoc>() : null;
  const platforms = content.faction(f).chairPlatforms ?? [];
  const backing = (c.termBackings ?? []).find((b) => b.key === key) ?? null;
  const phaseNow = chairPhase(today);
  const open = e && (e.status === 'names' || e.status === 'voting');
  const secretary = secretaryOf(content, f);
  const mine = cands.find((x) => x.characterId.equals(c._id));
  let stand: ChairElectionView['stand'] = null;
  if (phaseNow === 'names') {
    const record = await serviceRecord(c, today, session);
    const gate = standGate('chair', record, c.pc);
    stand = {
      ok: !gate && !mine && e?.status === 'names',
      why: mine ? 'ALREADY_STANDING' : (gate?.reason ?? (e?.status === 'names' ? null : 'NOT_NOW')),
      ...(gate?.need !== undefined ? { need: gate.need } : {}),
      cost: CHAIR.deposit,
      platforms: platforms.map((p) => ({ id: p.id, line: p.line })),
      standing: !!mine,
    };
  }
  const nameOfKey = (k: string) => (e?.ballot ?? []).find((l) => l.key === k)?.name ?? null;
  return {
    termIndex: term.index,
    factionId: f,
    phase: e?.status === 'counted' || e?.status === 'void' ? 'result' : phaseNow,
    status: e?.status ?? null,
    days: {
      namesFrom: term.fromDay + TERM_DAYS.chair.namesFrom,
      votesFrom: term.fromDay + TERM_DAYS.chair.votesFrom,
      countDay: term.fromDay + TERM_DAYS.chair.countDay,
    },
    chair: fs?.chair
      ? {
          name: fs.chair.holder.name,
          kind: 'player',
          since: fs.chair.fromDay,
          until: fs.chair.toDay,
          you: fs.chair.holder.characterId.equals(c._id),
        }
      : { name: secretary.name, kind: 'secretary', since: null, until: null, you: false },
    secretary,
    candidates: cands.map((x) => {
      const p = players.find((pl) => pl._id.equals(x.characterId));
      return {
        candidacyId: x._id.toHexString(),
        name: x.name,
        avatarId: p?.avatarId ?? null,
        rank: p?.rank ?? 1,
        level: p?.level ?? 1,
        platform: platforms.find((pl) => pl.id === x.platformId)?.line ?? null,
        backers: backersOfCand(x),
        you: x.characterId.equals(c._id),
        canBack:
          !!open && x.status === 'standing' && !x.characterId.equals(c._id) && !backing && c.rank >= CHAIR.voteRank && c.pc >= CHAIR.backCost,
      };
    }),
    stand,
    canVote: {
      ok: e?.status === 'voting' && !myVote && c.rank >= CHAIR.voteRank,
      why: e?.status !== 'voting' ? 'NOT_NOW' : myVote ? 'ALREADY_VOTED' : c.rank < CHAIR.voteRank ? 'RANK_TOO_LOW' : null,
      ...(c.rank < CHAIR.voteRank ? { need: CHAIR.voteRank } : {}),
    },
    yourVote: myVote ? { name: nameOfKey(myVote.candidateKey ?? '') ?? '' } : null,
    yourBacking: backing ? { name: backing.name } : null,
    result: e && (e.status === 'counted' || e.status === 'void') ? resultOf(content, e) : null,
  };
}

function resultOf(content: GameContent, e: FactionElectionDoc): ChairResultView | null {
  if (e.status === 'void') {
    const s = secretaryOf(content, e.factionId);
    return {
      termIndex: e.termIndex,
      factionId: e.factionId,
      status: 'void',
      rows: [],
      winner: { name: s.name, kind: 'secretary' },
      turnout: { voters: 0, eligible: 0 },
      secretaryKept: true,
      margin: 0,
    };
  }
  const r = e.result as unknown as Omit<ChairResultView, 'termIndex' | 'factionId' | 'status'> | null;
  if (!r) return null;
  return { termIndex: e.termIndex, factionId: e.factionId, status: 'counted', ...r };
}

/** `chairElection.result`: the count of a term (default: the latest counted or void). */
export async function chairResultView(
  deps: { user: SessionUser; content: GameContent; now: () => number },
  termIndex?: number,
): Promise<ChairResultView | null> {
  const { doc } = await loadCharacter(deps.user, deps.content, deps.now());
  const q =
    termIndex !== undefined
      ? FactionElection.findById(chairElectionId(doc.factionId, termIndex))
      : FactionElection.findOne({ kind: 'chair', factionId: doc.factionId, status: { $in: ['counted', 'void'] } }).sort({ termIndex: -1 });
  const e = await q.lean<FactionElectionDoc>();
  if (!e || (e.status !== 'counted' && e.status !== 'void')) return null;
  return resultOf(deps.content, e);
}

// ---------------------------------------------------------------------------------------------
// The nation's day (step 'termWork'): open (term day 9), close the names (11), count (14).
// ---------------------------------------------------------------------------------------------

/** Term day 9: the three elections, status `names` (a replay finds them and does nothing). */
async function openChair(ctx: NationBoundaryCtx): Promise<void> {
  if (!ctx.work.openChair) return;
  const term = termOf(ctx.d);
  for (const f of FACTION_IDS) {
    await FactionElection.updateOne(
      { _id: chairElectionId(f, term.index) },
      {
        $setOnInsert: {
          kind: 'chair',
          factionId: f,
          termIndex: term.index,
          namesFrom: term.fromDay + TERM_DAYS.chair.namesFrom,
          votesFrom: term.fromDay + TERM_DAYS.chair.votesFrom,
          countDay: term.fromDay + TERM_DAYS.chair.countDay,
          status: 'names',
          seed: randomBytes(16).toString('hex'),
          filed: 0,
          ballots: 0,
          ballot: null,
          chairTermId: null,
          trigger: null,
          result: null,
        },
      },
      { upsert: true, session: ctx.session },
    );
  }
}

/** Term day 11: the ballot frozen (every standing player by filing, then the secretary); none → void. */
async function closeChairNames(ctx: NationBoundaryCtx): Promise<void> {
  if (!ctx.work.closeChairNames) return;
  const term = termOf(ctx.d);
  for (const f of FACTION_IDS) {
    const key = chairElectionId(f, term.index);
    const e = await FactionElection.findById(key).session(ctx.session).lean<FactionElectionDoc>();
    if (!e || e.status !== 'names') continue;
    const standing = await Candidacy.find({ electionId: key, status: 'standing' })
      .session(ctx.session)
      .lean<CandidacyDoc[]>();
    if (standing.length === 0) {
      await FactionElection.updateOne({ _id: key, status: 'names' }, { $set: { status: 'void' } }, { session: ctx.session });
      continue;
    }
    const order = freezeChairList(standing.map((s) => ({ id: `p:${s.characterId.toHexString()}`, filedAt: s.filedAt.getTime() })));
    const sec = secretaryOf(ctx.content, f);
    const ballot = order.map((k, idx) => {
      if (k === 'n:secretary') return { key: k, kind: 'secretary' as const, name: sec.name, order: idx };
      const cand = standing.find((s) => `p:${s.characterId.toHexString()}` === k)!;
      return { key: k, kind: 'player' as const, name: cand.name, order: idx };
    });
    await FactionElection.updateOne(
      { _id: key, status: 'names' },
      { $set: { status: 'voting', ballot } },
      { session: ctx.session },
    );
  }
}

/**
 * Term day 14: the count (votes + 3 × backers, five counted; the secretary votes only), the winner's
 * `chair` term from `d` to the next term's day 14, the previous Chair's term completed, `factions.chair`
 * and, at a change of holder, the standing orders, rules and fixtures cleared (§22.1 Q22). Runs the
 * handover on every term day 14 (a void or skipped election hands the party to the secretary).
 */
async function countChairElections(ctx: NationBoundaryCtx): Promise<void> {
  const term = termOf(ctx.d);
  if (term.termDay !== TERM_DAYS.chair.countDay) return;
  const { session } = ctx;
  for (const f of FACTION_IDS) {
    const key = chairElectionId(f, term.index);
    const e = ctx.work.countChair ? await FactionElection.findById(key).session(session).lean<FactionElectionDoc>() : null;
    let winner: { characterId: Types.ObjectId; name: string; candidacyId: Types.ObjectId } | null = null;
    if (e && e.status === 'voting' && e.ballot) {
      const tallies = await Vote.aggregate<{ _id: string; n: number }>([
        { $match: { electionId: key } },
        { $group: { _id: '$candidateKey', n: { $sum: 1 } } },
      ]).session(session);
      const votes = Object.fromEntries(tallies.map((t) => [t._id, t.n]));
      const cands = await Candidacy.find({ electionId: key, status: 'standing' }).session(session).lean<CandidacyDoc[]>();
      const lines = [];
      for (const l of e.ballot) {
        if (l.kind === 'secretary') {
          lines.push({ key: l.key, kind: 'secretary' as const, backers: 0, termsWeight: 0, order: l.order });
          continue;
        }
        const cand = cands.find((x) => `p:${x.characterId.toHexString()}` === l.key);
        const rec = cand ? await completedOf(cand.characterId, session) : { governor: 0, council: 0 };
        lines.push({ key: l.key, kind: 'player' as const, backers: cand ? backersOfCand(cand) : 0, termsWeight: termsWeight(rec), order: l.order });
      }
      const count = countChair({ lines, votes });
      const eligible = await activeMembers(f, CHAIR.voteRank, ctx.now, session);
      const rows = count.rows.map((r) => ({
        key: r.key,
        kind: r.kind,
        name: e.ballot!.find((l) => l.key === r.key)?.name ?? r.key,
        votes: r.votes,
        backers: r.backers,
        backersCounted: r.backersCounted,
        total: r.total,
        place: r.place,
      }));
      const top = rows[0]!;
      const result = {
        rows,
        winner: { name: top.name, kind: top.kind },
        turnout: { voters: e.ballots, eligible },
        secretaryKept: count.secretaryKept,
        margin: count.margin,
      };
      await FactionElection.updateOne({ _id: key, status: 'voting' }, { $set: { status: 'counted', result } }, { session });
      for (const cand of cands) {
        const won = !count.secretaryKept && `p:${cand.characterId.toHexString()}` === count.winnerKey;
        await Candidacy.updateOne(
          { _id: cand._id, status: 'standing' },
          { $set: { status: won ? 'elected' : 'defeated', place: rows.find((r) => r.key === `p:${cand.characterId.toHexString()}`)?.place ?? null } },
          { session },
        );
        if (won) winner = { characterId: cand.characterId, name: cand.name, candidacyId: cand._id };
      }
      const fname = ctx.content.faction(f).name;
      const secVotes = rows.find((r) => r.kind === 'secretary')?.votes ?? 0;
      if (winner) {
        ctx.news.push(
          newsItem(ctx.d, 'nl.chair-elected', 1, f, { name: winner.name, faction: fname, votes: top.votes, secretaryVotes: secVotes }),
        );
      } else {
        const sec = secretaryOf(ctx.content, f);
        ctx.news.push(
          newsItem(ctx.d, 'nl.chair-secretary', 2, f, {
            secretary: sec.addressedAs,
            faction: fname,
            reason: `${sec.addressedAs} had ${secVotes} votes, more than any member`,
          }),
        );
      }
    } else if (e && e.status === 'void') {
      const sec = secretaryOf(ctx.content, f);
      ctx.news.push(
        newsItem(ctx.d, 'nl.chair-secretary', 2, f, {
          secretary: sec.addressedAs,
          faction: ctx.content.faction(f).name,
          reason: 'Nobody stood',
        }),
      );
    }
    await handOver(ctx, f, winner);
  }
}

async function completedOf(characterId: Types.ObjectId, session: ClientSession) {
  const rows = await OfficeTerm.find(
    { 'holder.kind': 'player', 'holder.characterId': characterId, completed: true },
    { office: 1 },
  )
    .session(session)
    .lean<Array<{ office?: string }>>();
  return {
    governor: rows.filter((r) => r.office === 'governor').length,
    council: rows.filter((r) => (r.office ?? 'council') === 'council').length,
  };
}

/** The old Chair's term ends at `d` (completed unless vacated); the new one (or the secretary) takes over. */
async function handOver(
  ctx: NationBoundaryCtx,
  f: FactionId,
  winner: { characterId: Types.ObjectId; name: string; candidacyId: Types.ObjectId } | null,
): Promise<void> {
  const { session, d } = ctx;
  const term = termOf(d);
  await OfficeTerm.updateMany(
    { office: 'chair', factionId: f, toDay: d, vacatedDay: null, completed: false },
    { $set: { completed: true } },
    { session },
  );
  let chair: FactionStateDoc['chair'] = null;
  if (winner) {
    const councilKey = chairTermKey(f, term.index);
    const existing = await OfficeTerm.findOne({ councilKey, seat: 1, fromDay: d }).session(session).lean<{ _id: Types.ObjectId }>();
    const termId = existing?._id ?? new Types.ObjectId();
    if (!existing) {
      await OfficeTerm.create(
        [
          {
            _id: termId,
            office: 'chair',
            cityId: 'nation',
            councilKey,
            electionId: chairElectionId(f, term.index),
            seat: 1,
            factionId: f,
            districtId: null,
            vacatedDay: null,
            fromDay: d,
            toDay: d + 28,
            holder: { kind: 'player', characterId: winner.characterId, name: winner.name },
            place: 1,
            total: 0,
            completed: false,
            frontPageSeenAt: null,
            via: 'election',
          },
        ],
        { session },
      );
    }
    chair = { holder: { characterId: winner.characterId, name: winner.name }, termId, fromDay: d, toDay: d + 28 };
  }
  const before = ctx.factions[f]?.chair ?? null;
  const changed = (before?.holder.characterId.toHexString() ?? null) !== (chair?.holder.characterId.toHexString() ?? null);
  await FactionState.updateOne(
    { _id: f },
    {
      $set: {
        chair,
        // §22.1 Q22: a change of holder clears the standing orders, the rules and the fixtures.
        ...(changed ? { orders: { current: null, next: null }, rules: [], fixtures: [] } : {}),
      },
    },
    { session },
  );
}

/** The handlers this file adds to the nation's day (`nationSteps.ts`, step 'termWork'), in order. */
export const chairElectionSteps = [openChair, closeChairNames, countChairElections] as const;
