import { createHash, randomBytes } from 'node:crypto';
import type { GameContent } from '@irongate/content';
import { Candidacy, Character, NationalElection, OfficeTerm, Vote } from '@irongate/db';
import type { CandidacyDoc, CharacterDoc, NationalElectionDoc, OfficeTermDoc, VoteDoc } from '@irongate/db';
import {
  FACTION_IDS,
  NATIONAL,
  PC,
  PRESIDENT,
  DEPUTY,
  TERM_DAYS,
  countNation,
  countPick,
  createRng,
  dayKey,
  dayStart,
  drawOrderOf,
  nationalPhase,
  nationalScores,
  nationalTurnoutWeight,
  partyList,
  seatList,
  standGate,
  termOf,
  termsWeight,
} from '@irongate/rules';
import type {
  DayKey,
  FactionId,
  NationalElectionView,
  NationalResultView,
  PickView,
  PoliticalResult,
} from '@irongate/rules';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { activeMembers } from './chairElectionService';
import { loadCharacter } from './dayService';
import { newsItem } from './nationDay';
import type { NationBoundaryCtx } from './nationDay';
import { nationResult, refusal, runNationAct, serviceRecord, spendPc } from './nationAct';
import type { NationActDeps, NationCtx } from './nationAct';
import { deputyKey, holderOfCandidate, lapseBills, presidentKey } from './parliamentService';
import type { NationalResult } from './parliamentService';
import { weekdayName } from './politicsService';

/**
 * Slice 7 T17 (docs/tech/slice-7.md §3.3, §8.2 `nationalElectionService`; ADR 0047; design §6): the
 * national election. Names in on term days 19–20 (President: 100 PC and two pledges, returned only by
 * a withdrawal on those days; the list: 25 PC, spent), the party's pick on 21–22 (its figure always
 * on the ballot), the republic's vote and backing on 23–26, the count into day 27 (provisional), and
 * taking office at day 0. The windows are the nation's day's (`nationalElectionSteps`).
 */

export const nationElectionId = (n: number): string => `nation:${n}`;
export const pickElectionId = (f: FactionId, n: number): string => `pick:${f}:${n}`;

const N = TERM_DAYS.nation;

/** The figure's ballot key (`n:{npcId}`). */
const figureKey = (content: GameContent, f: FactionId): string => `n:${content.figure(f)?.npcId ?? `figure.${f}`}`;

async function election(x: Pick<NationCtx, 'session' | 'today'>): Promise<NationalElectionDoc | null> {
  return NationalElection.findById(nationElectionId(termOf(x.today).index)).session(x.session).lean<NationalElectionDoc>();
}

const notNow = (today: DayKey) => new GameError('NOT_NOW', { phase: nationalPhase(today) });

// ---------------------------------------------------------------------------------------------
// Names in.
// ---------------------------------------------------------------------------------------------

/** `nation.standPresident` (§7.2): Rank 6, a completed deputy's term, 14 days, two pledges, 100 PC. */
export function standPresident(
  deps: NationActDeps<{ pledges: [string, string]; platformId: string }>,
): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'nation.standPresident', async (x) => {
    const { c, session, today } = x;
    const e = await election(x);
    if (!e || e.status !== 'names') throw notNow(today);
    const [a, b] = deps.input.pledges;
    if (a === b || !content.law(a) || !content.law(b)) throw new GameError('PLEDGES', { need: PRESIDENT.pledges }, 'BAD_REQUEST');
    const platform = (content.faction(c.factionId).chairPlatforms ?? []).find((p) => p.id === deps.input.platformId);
    if (!platform) throw new GameError('UNKNOWN_PLATFORM', { platformId: deps.input.platformId }, 'BAD_REQUEST');
    const existing = await Candidacy.findOne({ electionId: e._id, characterId: c._id }).session(session).lean<CandidacyDoc>();
    if (existing && existing.status !== 'withdrawn') throw new GameError('ALREADY_STANDING', { kind: existing.kind }, 'CONFLICT');
    if (existing) throw new GameError('ALREADY_STANDING', { kind: existing.kind, status: 'withdrawn' }, 'CONFLICT');
    const gate = standGate('president', await serviceRecord(c, today, session), c.pc);
    if (gate) throw refusal(gate, gate.reason === 'NOT_ENOUGH_PC' ? { pc: c.pc, cost: PRESIDENT.deposit } : {});
    await file(x, e, 'president', { pledges: [a, b], platformId: platform.id, deposit: 'held' });
    const updated = await spendPc(x, PRESIDENT.deposit);
    return nationResult(content, { ...x, c: updated }, {
      act: 'presidentDeclare',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { pickName: pickNameOf(content, c.factionId), weekday: weekdayName(e.pickFrom) },
      at: dayStart(e.pickFrom),
      knockOns: { pc: { before: c.pc, after: updated.pc } },
      view: { kind: 'nationalElection', nationalElection: await nationalElectionView(content, updated, x.now, session) },
    });
  });
}

/** `nation.standList` (§7.2): Rank 5, a Governor's term or three council terms, 14 days, 25 PC spent. */
export function standList(deps: NationActDeps<object>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'nation.standList', async (x) => {
    const { c, session, today } = x;
    const e = await election(x);
    if (!e || e.status !== 'names') throw notNow(today);
    const existing = await Candidacy.findOne({ electionId: e._id, characterId: c._id }).session(session).lean<CandidacyDoc>();
    if (existing) throw new GameError('ALREADY_STANDING', { kind: existing.kind, status: existing.status }, 'CONFLICT');
    const gate = standGate('list', await serviceRecord(c, today, session), c.pc);
    if (gate) throw refusal(gate, gate.reason === 'NOT_ENOUGH_PC' ? { pc: c.pc, cost: DEPUTY.deposit } : {});
    await file(x, e, 'list', { pledges: [], platformId: null, deposit: 'spent' });
    const updated = await spendPc(x, DEPUTY.deposit);
    return nationResult(content, { ...x, c: updated }, {
      act: 'listDeclare',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { weekday: weekdayName(e.countDay), pollsWeekday: weekdayName(e.votesFrom) },
      at: dayStart(e.countDay),
      knockOns: { pc: { before: c.pc, after: updated.pc } },
      view: { kind: 'nationalElection', nationalElection: await nationalElectionView(content, updated, x.now, session) },
    });
  });
}

async function file(
  x: NationCtx,
  e: NationalElectionDoc,
  kind: 'president' | 'list',
  o: { pledges: string[]; platformId: string | null; deposit: 'held' | 'spent' },
): Promise<void> {
  const filed = await NationalElection.updateOne({ _id: e._id, status: 'names' }, { $inc: { filed: 1 } }, { session: x.session });
  if (filed.matchedCount === 0) throw notNow(x.today);
  await Candidacy.create(
    [
      {
        electionId: e._id,
        kind,
        termIndex: e.termIndex,
        factionId: x.c.factionId,
        characterId: x.c._id,
        name: x.c.name,
        pledges: o.pledges,
        platformId: o.platformId,
        filedAt: new Date(x.now),
        filedDay: x.today,
        status: 'standing',
        endorsements: [],
        branch: null,
        deposit: o.deposit,
        place: null,
      },
    ],
    { session: x.session },
  );
}

/** `nation.withdrawPresident` (§7.2): days 19–20 only; the 100 PC back (capped). */
export function withdrawPresident(deps: NationActDeps<object>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'nation.withdrawPresident', async (x) => {
    const { c, session } = x;
    const e = await election(x);
    const cand = e
      ? await Candidacy.findOne({ electionId: e._id, characterId: c._id, kind: 'president', status: 'standing' })
          .session(session)
          .lean<CandidacyDoc>()
      : null;
    if (!cand) throw new GameError('NOT_STANDING');
    if (e!.status !== 'names') throw new GameError('WITHDRAW_CLOSED', { closedAt: dayStart(e!.pickFrom) });
    const w = await Candidacy.updateOne(
      { _id: cand._id, status: 'standing' },
      { $set: { status: 'withdrawn', deposit: 'returned' } },
      { session },
    );
    if (w.matchedCount === 0) throw new GameError('NOT_STANDING');
    const after = Math.min(PC.cap, c.pc + PRESIDENT.deposit);
    const updated = await spendPc(x, c.pc - after);
    return nationResult(content, { ...x, c: updated }, {
      act: 'presidentWithdraw',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { weekday: weekdayName(e!.pickFrom) },
      knockOns: { pc: { before: c.pc, after: updated.pc } },
      view: { kind: 'nationalElection', nationalElection: await nationalElectionView(content, updated, x.now, session) },
    });
  });
}

// ---------------------------------------------------------------------------------------------
// The party's pick and the republic's vote.
// ---------------------------------------------------------------------------------------------

/** `nation.pickVote` (§7.2): Rank 2+, your own party's ballot (its candidates and its figure), secret, final. */
export function pickVote(deps: NationActDeps<{ key: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'nation.pickVote', async (x) => {
    const { c, session, today } = x;
    const e = await election(x);
    if (!e || e.status !== 'pick') throw notNow(today);
    const f = c.factionId;
    const pick = e.picks[f];
    if (!pick?.voted || !pick.ballot) throw new GameError('NO_VOTE_OPEN');
    if (c.rank < NATIONAL.voteRank) throw new GameError('RANK_TOO_LOW', { need: NATIONAL.voteRank });
    const line = pick.ballot.find((l) => l.key === deps.input.key);
    if (!line) throw new GameError('NOT_ON_BALLOT', { key: deps.input.key }, 'BAD_REQUEST');
    const id = pickElectionId(f, e.termIndex);
    if (await Vote.exists({ electionId: id, voterId: c._id }).session(session)) throw new GameError('ALREADY_VOTED', {}, 'CONFLICT');
    const open = await NationalElection.updateOne(
      { _id: e._id, status: 'pick' },
      { $inc: { [`picks.${f}.ballots`]: 1 } },
      { session },
    );
    if (open.matchedCount === 0) throw notNow(today);
    await Vote.create([{ electionId: id, voterId: c._id, candidateKey: line.key, day: today }], { session });
    return nationResult(content, x, {
      act: 'pickVote',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { name: line.name, weekday: weekdayName(e.votesFrom) },
      at: dayStart(e.votesFrom),
      view: { kind: 'pick', pick: await pickView(content, c, x.now, session) },
    });
  });
}

/** `nation.vote` (§7.2): Rank 2+, one of the three candidates (named by party), secret, final. */
export function vote(deps: NationActDeps<{ factionId: FactionId }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'nation.vote', async (x) => {
    const { c, session, today } = x;
    const e = await election(x);
    if (!e || e.status !== 'voting') throw notNow(today);
    if (c.rank < NATIONAL.voteRank) throw new GameError('RANK_TOO_LOW', { need: NATIONAL.voteRank });
    const cand = (e.candidates ?? []).find((k) => k.factionId === deps.input.factionId);
    if (!cand) throw new GameError('NOT_ON_BALLOT', { factionId: deps.input.factionId }, 'BAD_REQUEST');
    if (await Vote.exists({ electionId: e._id, voterId: c._id }).session(session)) throw new GameError('ALREADY_VOTED', {}, 'CONFLICT');
    const open = await NationalElection.updateOne({ _id: e._id, status: 'voting' }, { $inc: { ballots: 1 } }, { session });
    if (open.matchedCount === 0) throw notNow(today);
    await Vote.create([{ electionId: e._id, voterId: c._id, candidateKey: cand.factionId, day: today }], { session });
    return nationResult(content, x, {
      act: 'nationalVote',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { name: cand.name, countDay: weekdayName(e.countDay) },
      at: dayStart(e.countDay),
      view: { kind: 'nationalElection', nationalElection: await nationalElectionView(content, c, x.now, session) },
    });
  });
}

/**
 * `nation.back` (§7.2): 10 PC, one a term, public and final: your party's candidate for President
 * (+1 to the party's score, five counted; the figure included, §22.1 Q27) or a name on its list.
 */
export function back(
  deps: NationActDeps<{ target: { kind: 'president' } | { kind: 'list'; candidacyId: string } }>,
): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'nation.back', async (x) => {
    const { c, session, today } = x;
    const e = await election(x);
    if (!e || e.status !== 'voting') throw notNow(today);
    if (c.rank < NATIONAL.voteRank) throw new GameError('RANK_TOO_LOW', { need: NATIONAL.voteRank });
    const key = e._id;
    const given = (c.termBackings ?? []).find((b) => b.key === key);
    if (given) throw new GameError('ALREADY_BACKED', { name: given.name }, 'CONFLICT');
    if (c.pc < NATIONAL.backCost) throw new GameError('NOT_ENOUGH_PC', { pc: c.pc, cost: NATIONAL.backCost });
    const at = new Date(x.now);
    const t = deps.input.target;
    let name: string;
    let candidacyId: Types.ObjectId;
    let ordinal: string | null = null;
    if (t.kind === 'president') {
      const cand = (e.candidates ?? []).find((k) => k.factionId === c.factionId);
      if (!cand) throw new GameError('NOT_ON_BALLOT', {}, 'BAD_REQUEST');
      if (cand.characterId && cand.characterId.equals(c._id)) throw new GameError('CANNOT_BACK_SELF', {}, 'BAD_REQUEST');
      const inc = await NationalElection.updateOne(
        { _id: e._id, status: 'voting' },
        { $inc: { [`backers.${c.factionId}`]: 1 } },
        { session },
      );
      if (inc.matchedCount === 0) throw notNow(today);
      if (cand.candidacyId) {
        await Candidacy.updateOne(
          { _id: cand.candidacyId, 'endorsements.characterId': { $ne: c._id } },
          { $push: { endorsements: { characterId: c._id, name: c.name, day: today, at } } },
          { session },
        );
      }
      name = cand.name;
      candidacyId = cand.candidacyId ?? new Types.ObjectId('000000000000000000000000');
    } else {
      const cand = Types.ObjectId.isValid(t.candidacyId)
        ? await Candidacy.findById(t.candidacyId).session(session).lean<CandidacyDoc>()
        : null;
      if (!cand || cand.electionId !== key || cand.kind !== 'list' || cand.factionId !== c.factionId)
        throw new GameError('NOT_ON_BALLOT', { candidacyId: t.candidacyId }, 'BAD_REQUEST');
      if (cand.characterId.equals(c._id)) throw new GameError('CANNOT_BACK_SELF', {}, 'BAD_REQUEST');
      if (cand.status !== 'standing') throw new GameError('CANDIDACY_CLOSED', { status: cand.status });
      const pushed = await Candidacy.updateOne(
        { _id: cand._id, status: 'standing', 'endorsements.characterId': { $ne: c._id } },
        { $push: { endorsements: { characterId: c._id, name: c.name, day: today, at } } },
        { session },
      );
      if (pushed.matchedCount === 0) throw new GameError('ALREADY_BACKED', { name: cand.name }, 'CONFLICT');
      name = cand.name;
      candidacyId = cand._id;
    }
    const updated = await spendPc(x, NATIONAL.backCost, {
      set: { termBackings: [...(c.termBackings ?? []), { key, candidacyId, name, day: today }].slice(-6) },
      filter: { 'termBackings.key': { $ne: key } },
    });
    const view = await nationalElectionView(content, updated, x.now, session);
    if (t.kind === 'list') {
      const place = view.list.find((l) => l.candidacyId === candidacyId.toHexString())?.place ?? 0;
      ordinal = ordinalOf(place);
    }
    const after = await NationalElection.findById(e._id, { backers: 1 }).session(session).lean<NationalElectionDoc>();
    return nationResult(content, { ...x, c: updated }, {
      act: t.kind === 'president' ? 'nationalBack' : 'listBack',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { name, countDay: weekdayName(e.countDay), ...(ordinal ? { ordinal } : {}) },
      at: dayStart(e.countDay),
      knockOns: {
        pc: { before: c.pc, after: updated.pc },
        backers: { name, n: t.kind === 'president' ? Math.min(NATIONAL.backersMax, after?.backers[c.factionId] ?? 0) : 0 },
      },
      view: { kind: 'nationalElection', nationalElection: view },
    });
  });
}

const ordinalOf = (n: number): string => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

const pickNameOf = (content: GameContent, f: FactionId) => content.faction(f).pickName ?? 'the party';

// ---------------------------------------------------------------------------------------------
// The views.
// ---------------------------------------------------------------------------------------------

/** `nation.election` (§8.3): the candidates (from day 23), your party's list (live), the stand cards, your own vote. */
export async function nationalElectionView(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  session: ClientSession | null = null,
): Promise<NationalElectionView> {
  const today = dayKey(now);
  const term = termOf(today);
  const s = <T>(q: { session(s: ClientSession | null): T }): T => q.session(session);
  const e = await s(NationalElection.findById(nationElectionId(term.index))).lean<NationalElectionDoc>();
  const cands = e
    ? await s(Candidacy.find({ electionId: e._id, status: { $in: ['standing', 'elected', 'defeated'] } }).sort({ filedAt: 1 })).lean<CandidacyDoc[]>()
    : [];
  const mine = e ? await s(Candidacy.findOne({ electionId: e._id, characterId: c._id })).lean<CandidacyDoc>() : null;
  const myVote = e ? await s(Vote.findOne({ electionId: e._id, voterId: c._id })).lean<VoteDoc>() : null;
  const backing = e ? ((c.termBackings ?? []).find((b) => b.key === e._id) ?? null) : null;
  const canBackNow = e?.status === 'voting' && !backing && c.rank >= NATIONAL.voteRank && c.pc >= NATIONAL.backCost;
  const listed = cands.filter((k) => k.factionId === c.factionId && k.kind === 'list');
  const ordered = [...listed].sort(
    (a, b) => b.endorsements.length - a.endorsements.length || a.filedAt.getTime() - b.filedAt.getTime(),
  );
  const presCand = cands.filter((k) => k.factionId === c.factionId && k.kind === 'president');
  const head = presCand.filter((k) => k.status !== 'elected');
  const placeOf = (id: Types.ObjectId) => head.length + ordered.findIndex((k) => k._id.equals(id)) + 1;
  let stand: NationalElectionView['stand'] = null;
  if (e?.status === 'names') {
    const record = await serviceRecord(c, today, session);
    const gl = standGate('list', record, c.pc);
    const gp = standGate('president', record, c.pc);
    stand = {
      list: { ok: !gl && !mine, why: mine ? 'ALREADY_STANDING' : (gl?.reason ?? null), cost: DEPUTY.deposit, standing: mine?.kind === 'list' },
      president: {
        ok: !gp && !mine,
        why: mine ? 'ALREADY_STANDING' : (gp?.reason ?? null),
        cost: PRESIDENT.deposit,
        standing: mine?.kind === 'president' && mine.status === 'standing',
        canWithdraw: mine?.kind === 'president' && mine.status === 'standing',
      },
    };
  }
  return {
    termIndex: term.index,
    phase: nationalPhase(today),
    status: e?.status ?? null,
    days: {
      namesFrom: term.fromDay + N.namesFrom,
      pickFrom: term.fromDay + N.pickFrom,
      votesFrom: term.fromDay + N.votesFrom,
      countDay: term.fromDay + N.countDay,
      officeDay: term.toDay,
    },
    candidates: e?.candidates
      ? e.candidates.map((k) => {
          const fig = k.kind === 'npc' ? content.figure(k.factionId) : undefined;
          const platforms = content.faction(k.factionId).chairPlatforms ?? [];
          return {
            factionId: k.factionId,
            key: k.key,
            name: k.name,
            kind: k.kind,
            avatarId: null,
            portrait: fig?.portrait ?? null,
            platform: fig ? fig.line : (platforms.find((p) => p.id === k.platformId)?.line ?? null),
            pledges: k.pledges.map((id) => ({ lawId: id, name: content.law(id)?.name ?? id })),
            canBack: !!canBackNow && k.factionId === c.factionId && !(k.characterId && k.characterId.equals(c._id)),
          };
        })
      : null,
    list: ordered.map((k) => ({
      candidacyId: k._id.toHexString(),
      name: k.name,
      backers: k.endorsements.length,
      place: placeOf(k._id),
      you: k.characterId.equals(c._id),
      canBack: !!canBackNow && !k.characterId.equals(c._id) && k.status === 'standing',
    })),
    presidentCandidates: presCand.map((k) => ({
      candidacyId: k._id.toHexString(),
      name: k.name,
      pledges: (k.pledges ?? []).map((id) => content.law(id)?.name ?? id),
      you: k.characterId.equals(c._id),
    })),
    stand,
    canVote: {
      ok: e?.status === 'voting' && !myVote && c.rank >= NATIONAL.voteRank,
      why: e?.status !== 'voting' ? 'NOT_NOW' : myVote ? 'ALREADY_VOTED' : c.rank < NATIONAL.voteRank ? 'RANK_TOO_LOW' : null,
    },
    yourVote: myVote?.candidateKey ? { factionId: myVote.candidateKey as FactionId } : null,
    yourBacking: backing ? { name: backing.name } : null,
    // Backers are public (design §6.3): each party's count of backers for its candidate.
    backers: e && e.status !== 'names' && e.status !== 'pick' ? e.backers : null,
    pickName: pickNameOf(content, c.factionId),
  };
}

/** `nation.pick` (§8.3): your party's ballot, your own choice, and the pick's result once counted. */
export async function pickView(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  session: ClientSession | null = null,
): Promise<PickView> {
  const today = dayKey(now);
  const term = termOf(today);
  const f = c.factionId;
  const s = <T>(q: { session(s: ClientSession | null): T }): T => q.session(session);
  const e = await s(NationalElection.findById(nationElectionId(term.index))).lean<NationalElectionDoc>();
  const pick = e?.picks?.[f];
  const myVote = e ? await s(Vote.findOne({ electionId: pickElectionId(f, term.index), voterId: c._id })).lean<VoteDoc>() : null;
  const cands = e
    ? await s(Candidacy.find({ electionId: e._id, factionId: f, kind: { $in: ['president', 'list'] } })).lean<CandidacyDoc[]>()
    : [];
  const pledgesOf = (key: string) =>
    (cands.find((k) => `p:${k.characterId.toHexString()}` === key)?.pledges ?? []).map((id) => content.law(id)?.name ?? id);
  const nameOf = (key: string) => pick?.ballot?.find((l) => l.key === key)?.name ?? key;
  return {
    termIndex: term.index,
    factionId: f,
    pickName: pickNameOf(content, f),
    status: e?.status ?? null,
    ballot: pick?.ballot ? pick.ballot.map((l) => ({ key: l.key, name: l.name, kind: l.kind, pledges: pledgesOf(l.key) })) : null,
    voted: pick?.voted ?? false,
    canVote: {
      ok: e?.status === 'pick' && !!pick?.voted && !myVote && c.rank >= NATIONAL.voteRank,
      why: e?.status !== 'pick' ? 'NOT_NOW' : !pick?.voted ? 'NO_VOTE_OPEN' : myVote ? 'ALREADY_VOTED' : c.rank < NATIONAL.voteRank ? 'RANK_TOO_LOW' : null,
    },
    yourVote: myVote?.candidateKey ? { name: nameOf(myVote.candidateKey) } : null,
    result: pick?.result
      ? {
          winnerKey: pick.result.winnerKey,
          winner: nameOf(pick.result.winnerKey),
          rows: pick.result.rows.map((r) => ({
            key: String(r.key),
            name: nameOf(String(r.key)),
            votes: Number(r.votes),
            place: Number(r.place),
          })),
        }
      : null,
  };
}

/** The national count's stored result (`nationalElections.result`). */
interface StoredCount extends NationalResult {
  scores: NationalResultView['scores'];
  w: number;
  ballots: number;
  turnout: { voters: number; eligible: number };
  president: NationalResult['candidates'][number];
  runnerUp: NationalResult['candidates'][number] | null;
  drawn: boolean;
  seats: Record<FactionId, number>;
}

/** `nation.result` (§10.2): the count as stored (the page is the count, not a recomputation). */
export async function nationalResultView(
  deps: { user: SessionUser; content: GameContent; now: () => number },
  termIndex?: number,
): Promise<NationalResultView | null> {
  await loadCharacter(deps.user, deps.content, deps.now());
  const e =
    termIndex !== undefined
      ? await NationalElection.findById(nationElectionId(termIndex)).lean<NationalElectionDoc>()
      : await NationalElection.findOne({ status: { $in: ['counted', 'seated'] } }).sort({ termIndex: -1 }).lean<NationalElectionDoc>();
  if (!e || (e.status !== 'counted' && e.status !== 'seated') || !e.result) return null;
  const r = e.result as unknown as StoredCount;
  const who = (k: NationalResult['candidates'][number]) => ({ name: k.name, factionId: k.factionId, figure: k.kind === 'npc' });
  return {
    termIndex: e.termIndex,
    stamp: e.status === 'counted' ? 'toBeConfirmed' : 'final',
    scores: r.scores,
    w: r.w,
    ballots: r.ballots,
    turnout: r.turnout,
    president: who(r.president),
    runnerUp: r.runnerUp ? who(r.runnerUp) : null,
    drawn: r.drawn,
    lists: Object.fromEntries(
      FACTION_IDS.map((f) => [f, (r.lists[f] ?? []).map((l) => ({ name: l.name, seated: l.seated, kind: l.kind }))]),
    ) as NationalResultView['lists'],
  };
}

// ---------------------------------------------------------------------------------------------
// The nation's day (step 'termWork'): open (19), the picks (21), count the picks (23), count (27),
// take office (0).
// ---------------------------------------------------------------------------------------------

async function openNation(ctx: NationBoundaryCtx): Promise<void> {
  if (!ctx.work.openNation) return;
  const term = termOf(ctx.d);
  const picks = Object.fromEntries(FACTION_IDS.map((f) => [f, { ballots: 0, ballot: null, voted: false, result: null }]));
  const res = await NationalElection.updateOne(
    { _id: nationElectionId(term.index) },
    {
      $setOnInsert: {
        termIndex: term.index,
        namesFrom: term.fromDay + N.namesFrom,
        pickFrom: term.fromDay + N.pickFrom,
        votesFrom: term.fromDay + N.votesFrom,
        countDay: term.fromDay + N.countDay,
        officeDay: term.toDay,
        status: 'names',
        seed: randomBytes(16).toString('hex'),
        filed: 0,
        ballots: 0,
        backers: Object.fromEntries(FACTION_IDS.map((f) => [f, 0])),
        picks,
        candidates: null,
        result: null,
        countedAt: null,
        seatedAt: null,
      },
    },
    { upsert: true, session: ctx.session },
  );
  if (res.upsertedCount > 0) ctx.news.push(newsItem(ctx.d, 'nl.names-in', 1, null, { weekdayPick: weekdayName(term.fromDay + N.pickFrom) }));
}

/** Term day 21: each party's ballot: its President candidates by filing and its figure (last). */
async function openPicks(ctx: NationBoundaryCtx): Promise<void> {
  if (!ctx.work.openPick) return;
  const term = termOf(ctx.d);
  const e = await NationalElection.findById(nationElectionId(term.index)).session(ctx.session).lean<NationalElectionDoc>();
  if (!e || e.status !== 'names') return;
  const set: Record<string, unknown> = { status: 'pick' };
  for (const f of FACTION_IDS) {
    const players = await Candidacy.find({ electionId: e._id, factionId: f, kind: 'president', status: 'standing' })
      .sort({ filedAt: 1 })
      .session(ctx.session)
      .lean<CandidacyDoc[]>();
    const fig = ctx.content.figure(f);
    const ballot = [
      ...players.map((p, idx) => ({ key: `p:${p.characterId.toHexString()}`, kind: 'player' as const, name: p.name, order: idx })),
      { key: figureKey(ctx.content, f), kind: 'npc' as const, name: fig?.name ?? f, order: players.length },
    ];
    set[`picks.${f}`] = { ballots: 0, ballot, voted: players.length > 0, result: null };
  }
  await NationalElection.updateOne({ _id: e._id, status: 'names' }, { $set: set }, { session: ctx.session });
  ctx.news.push(newsItem(ctx.d, 'nl.party-pick', 1, null, { until: dayStart(term.fromDay + N.votesFrom) }));
}

async function completedOf(characterId: Types.ObjectId, session: ClientSession) {
  const rows = await OfficeTerm.find({ 'holder.kind': 'player', 'holder.characterId': characterId, completed: true }, { office: 1 })
    .session(session)
    .lean<Array<Pick<OfficeTermDoc, 'office'>>>();
  return {
    governor: rows.filter((r) => r.office === 'governor').length,
    council: rows.filter((r) => (r.office ?? 'council') === 'council').length,
  };
}

/** Term day 23: the picks counted; the losing players move to the list; the three candidates frozen. */
async function countPicks(ctx: NationBoundaryCtx): Promise<void> {
  if (!ctx.work.countPick) return;
  const { session, content } = ctx;
  const term = termOf(ctx.d);
  const e = await NationalElection.findById(nationElectionId(term.index)).session(session).lean<NationalElectionDoc>();
  if (!e || e.status !== 'pick') return;
  const candidates: NonNullable<NationalElectionDoc['candidates']> = [];
  const set: Record<string, unknown> = {};
  for (const f of FACTION_IDS) {
    const pick = e.picks[f];
    const ballot = pick?.ballot ?? [{ key: figureKey(content, f), kind: 'npc' as const, name: content.figure(f)?.name ?? f, order: 0 }];
    let winnerKey = ballot[ballot.length - 1]!.key;
    if (pick?.voted) {
      const tallies = await Vote.aggregate<{ _id: string; n: number }>([
        { $match: { electionId: pickElectionId(f, term.index) } },
        { $group: { _id: '$candidateKey', n: { $sum: 1 } } },
      ]).session(session);
      const lines = [];
      for (const l of ballot) {
        const w = l.kind === 'player' ? termsWeight(await completedOf(new Types.ObjectId(l.key.slice(2)), session)) : 0;
        lines.push({ key: l.key, backers: 0, termsWeight: w, order: l.order });
      }
      const r = countPick({ ballot: lines, votes: Object.fromEntries(tallies.map((t) => [t._id, t.n])) });
      winnerKey = r.winnerKey;
      set[`picks.${f}.result`] = r;
    }
    const players = await Candidacy.find({ electionId: e._id, factionId: f, kind: 'president', status: 'standing' })
      .session(session)
      .lean<CandidacyDoc[]>();
    for (const p of players) {
      if (`p:${p.characterId.toHexString()}` !== winnerKey) {
        // The losers of a pick move to the list (their President deposit stays spent).
        await Candidacy.updateOne({ _id: p._id, status: 'standing' }, { $set: { kind: 'list', deposit: 'spent' } }, { session });
      }
    }
    const won = players.find((p) => `p:${p.characterId.toHexString()}` === winnerKey);
    if (won) {
      candidates.push({
        factionId: f,
        key: winnerKey,
        kind: 'player',
        characterId: won.characterId,
        name: won.name,
        pledges: won.pledges ?? [],
        platformId: won.platformId ?? null,
        candidacyId: won._id,
      });
    } else {
      const fig = content.figure(f);
      candidates.push({
        factionId: f,
        key: figureKey(content, f),
        kind: 'npc',
        npcId: fig?.npcId ?? `figure.${f}`,
        name: fig?.name ?? f,
        pledges: [],
        platformId: null,
      });
    }
  }
  await NationalElection.updateOne(
    { _id: e._id, status: 'pick' },
    { $set: { ...set, status: 'voting', candidates } },
    { session },
  );
  ctx.news.push(newsItem(ctx.d, 'nl.voting-open', 0, null, { until: dayStart(term.fromDay + N.countDay) }));
}

const seedHex = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32);

/** Term day 27: the provisional count (scores from this boundary's control snapshot, D'Hondt, the lists). */
async function countNational(ctx: NationBoundaryCtx): Promise<void> {
  if (!ctx.work.countNation) return;
  const { session, content } = ctx;
  const term = termOf(ctx.d);
  const e = await NationalElection.findById(nationElectionId(term.index)).session(session).lean<NationalElectionDoc>();
  if (!e || e.status !== 'voting' || !e.candidates) return;
  const tallies = await Vote.aggregate<{ _id: string; n: number }>([
    { $match: { electionId: e._id } },
    { $group: { _id: '$candidateKey', n: { $sum: 1 } } },
  ]).session(session);
  const ballotsByFaction = Object.fromEntries(tallies.map((t) => [t._id, t.n])) as Partial<Record<FactionId, number>>;
  const scores = nationalScores({ ballotsByFaction, controlShare: ctx.control.controlShare, backers: e.backers });
  const count = countNation({ scores, drawOrder: drawOrderOf(createRng(seedHex(`nation-count:${e.seed}`))) });
  const ballots = tallies.reduce((s, t) => s + t.n, 0);
  const candOf = (f: FactionId) => {
    const k = e.candidates!.find((x) => x.factionId === f)!;
    return {
      factionId: f,
      key: k.key,
      kind: k.kind,
      ...(k.characterId ? { characterId: k.characterId.toHexString() } : {}),
      ...(k.npcId ? { npcId: k.npcId } : {}),
      name: k.name,
      pledges: k.pledges,
    };
  };
  const lists = {} as NationalResult['lists'];
  const listCands = await Candidacy.find({ electionId: e._id, kind: 'list', status: 'standing' }).session(session).lean<CandidacyDoc[]>();
  const listChars = await Character.find({ _id: { $in: listCands.map((l) => l.characterId) } }, { localStanding: 1 })
    .session(session)
    .lean<Array<Pick<CharacterDoc, '_id' | 'localStanding'>>>();
  for (const f of FACTION_IDS) {
    const cand = candOf(f);
    const elected = count.president === f;
    const mine = listCands.filter((l) => l.factionId === f);
    const entries = [];
    for (const l of mine) {
      entries.push({
        key: `p:${l.characterId.toHexString()}`,
        backers: l.endorsements.length,
        termsWeight: termsWeight(await completedOf(l.characterId, session)),
        reputationWins: (listChars.find((x) => x._id.equals(l.characterId))?.localStanding ?? []).reduce((s, x) => s + x.successes, 0),
        filedAt: l.filedAt.getTime(),
      });
    }
    const order = partyList({ candidate: { key: cand.key, kind: cand.kind }, elected, list: entries });
    const seated = seatList(order, count.seats[f] ?? 0);
    lists[f] = order.map((key) => {
      const l = mine.find((x) => `p:${x.characterId.toHexString()}` === key);
      const isCand = key === cand.key;
      return {
        key,
        name: isCand ? cand.name : (l?.name ?? key),
        kind: 'player' as const,
        characterId: key.slice(2),
        seated: seated.seated.includes(key),
        place: seated.places[key] ?? 0,
      };
    });
    for (const l of mine) {
      const key = `p:${l.characterId.toHexString()}`;
      await Candidacy.updateOne(
        { _id: l._id, status: 'standing' },
        { $set: { status: seated.seated.includes(key) ? 'elected' : 'defeated', place: seated.places[key] ?? null } },
        { session },
      );
    }
    if (cand.kind === 'player') {
      const k = e.candidates.find((x) => x.factionId === f)!;
      if (k.candidacyId) {
        await Candidacy.updateOne(
          { _id: k.candidacyId, status: 'standing' },
          { $set: { status: elected ? 'elected' : 'defeated', place: elected ? 1 : (seated.places[cand.key] ?? null) } },
          { session },
        );
      }
    }
  }
  const order = [...count.scores].sort((a, b) => b.score - a.score).map((s) => s.factionId);
  const eligible = (await Promise.all(FACTION_IDS.map((f) => activeMembers(f, NATIONAL.voteRank, ctx.now, session)))).reduce((s, n) => s + n, 0);
  const result: StoredCount = {
    scores: count.scores.map((s) => ({ ...s })),
    w: nationalTurnoutWeight(ballots),
    ballots,
    turnout: { voters: ballots, eligible },
    president: candOf(count.president),
    runnerUp: candOf(count.runnerUp),
    drawn: count.drawn,
    seats: count.seats,
    order: [count.president, count.runnerUp, ...order.filter((f) => f !== count.president && f !== count.runnerUp)],
    candidates: FACTION_IDS.map(candOf),
    lists,
  };
  await NationalElection.updateOne(
    { _id: e._id, status: 'voting' },
    { $set: { status: 'counted', result, countedAt: new Date(ctx.now) } },
    { session },
  );
  const sc = (f: FactionId) => (Math.round((count.scores.find((s) => s.factionId === f)?.score ?? 0) * 10) / 10).toFixed(1);
  ctx.news.push(
    newsItem(ctx.d, 'nl.result', 0, null, {
      president: result.president.name,
      party: content.faction(count.president).name,
      scoreP: sc(count.president),
      second: content.faction(count.runnerUp).name,
      scoreS: sc(count.runnerUp),
      seatsV: count.seats.vanguard,
      seatsC: count.seats.collective,
      seatsA: count.seats.alliance,
    }),
  );
}

/**
 * Term day 0 (§8.2 *Take office*): the counted election of term n − 1 seats the President (a
 * `president` term, or a figure with none) and the player deputies (`deputy` terms, seat = list
 * place); the old President's and deputies' terms complete; the old term's open bills lapse. With
 * no counted election the government carries over.
 */
async function takeOffice(ctx: NationBoundaryCtx): Promise<void> {
  if (!ctx.work.takeOffice || ctx.bootstrap) return;
  const { session, d, content } = ctx;
  const n = termOf(d).index;
  await lapseBills(ctx, n - 1);
  const e = await NationalElection.findById(nationElectionId(n - 1)).session(session).lean<NationalElectionDoc>();
  // The old terms complete at day 0, whatever the election did (removed ones are already vacated).
  await OfficeTerm.updateMany(
    { councilKey: { $in: [presidentKey(n - 1), deputyKey(n - 1)] }, vacatedDay: null, completed: false, toDay: { $lte: d } },
    { $set: { completed: true } },
    { session },
  );
  if (!e || e.status !== 'counted' || !e.result) return;
  const r = e.result as unknown as StoredCount;
  const toDay = d + 28;
  const prev = ctx.government.president;
  const holder = holderOfCandidate(r.president);
  const same =
    (holder.kind === 'player' && prev.holder.kind === 'player' && holder.characterId.equals(prev.holder.characterId)) ||
    (holder.kind === 'npc' && prev.holder.kind === 'npc' && holder.npcId === prev.holder.npcId);
  let termId: Types.ObjectId | null = null;
  if (holder.kind === 'player') {
    termId = new Types.ObjectId();
    await OfficeTerm.updateOne(
      { councilKey: presidentKey(n), seat: 1, fromDay: d },
      {
        $setOnInsert: {
          _id: termId,
          office: 'president',
          cityId: 'nation',
          councilKey: presidentKey(n),
          electionId: e._id,
          seat: 1,
          factionId: holder.factionId,
          districtId: null,
          vacatedDay: null,
          fromDay: d,
          toDay,
          holder: { kind: 'player', characterId: holder.characterId, name: holder.name },
          place: 1,
          total: 0,
          completed: false,
          frontPageSeenAt: null,
          via: 'election',
          pledges: r.president.pledges.map((lawId) => ({ lawId, keptDay: null })),
        },
      },
      { upsert: true, session },
    );
  }
  const players = Object.fromEntries(FACTION_IDS.map((f) => [f, 0])) as Record<FactionId, number>;
  for (const f of FACTION_IDS) {
    for (const l of r.lists[f] ?? []) {
      if (!l.seated || !l.characterId) continue;
      players[f] += 1;
      await OfficeTerm.updateOne(
        { councilKey: deputyKey(n), seat: l.place + FACTION_IDS.indexOf(f) * 100, fromDay: d },
        {
          $setOnInsert: {
            office: 'deputy',
            cityId: 'nation',
            councilKey: deputyKey(n),
            electionId: e._id,
            seat: l.place + FACTION_IDS.indexOf(f) * 100,
            factionId: f,
            districtId: null,
            vacatedDay: null,
            fromDay: d,
            toDay,
            holder: { kind: 'player', characterId: new Types.ObjectId(l.characterId), name: l.name },
            place: l.place,
            total: 0,
            completed: false,
            frontPageSeenAt: null,
            via: 'election',
          },
        },
        { upsert: true, session },
      );
    }
  }
  ctx.government.president = {
    holder,
    termId,
    since: d,
    consecutive: same ? (Math.min(2, prev.consecutive + 1) as 1 | 2) : 1,
    via: 'election',
  };
  ctx.government.runnerUp = r.runnerUp ? { holder: holderOfCandidate(r.runnerUp), termId: null } : null;
  ctx.government.parliament = { termIndex: n, seats: r.seats, players };
  await NationalElection.updateOne({ _id: e._id, status: 'counted' }, { $set: { status: 'seated', seatedAt: new Date(ctx.now) } }, { session });
  ctx.news.push(
    newsItem(d, 'nl.took-office', 0, null, {
      president: holder.name,
      party: content.faction(holder.factionId).name,
      seatsV: r.seats.vanguard,
      seatsC: r.seats.collective,
      seatsA: r.seats.alliance,
    }),
  );
}

/** The handlers this file adds to the nation's day (`nationSteps.ts`, step 'termWork'), in §3.1's order. */
export const nationalElectionSteps = [takeOffice, openNation, openPicks, countPicks, countNational] as const;
