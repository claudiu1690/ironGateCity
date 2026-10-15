import { randomBytes } from 'node:crypto';
import type { GameContent } from '@irongate/content';
import { FactionElection, FactionState, OfficeTerm, Petition, Vote } from '@irongate/db';
import type { CharacterDoc, FactionElectionDoc, FactionStateDoc, PetitionDoc, VoteDoc } from '@irongate/db';
import {
  CHAIR,
  CONFIDENCE,
  FACTION_IDS,
  chairPetitionGate,
  confidenceResult,
  dayKey,
  dayStart,
  signaturesNeeded,
  termOf,
} from '@irongate/rules';
import type { ConfidenceView, DayKey, FactionId, PoliticalResult } from '@irongate/rules';
import type { ClientSession, Types } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { activeMembers } from './chairElectionService';
import { loadCharacter } from './dayService';
import { newsItem } from './nationDay';
import type { NationBoundaryCtx } from './nationDay';
import { nationResult, refusal, runNationAct, spendPc } from './nationAct';
import type { NationActDeps, NationCtx } from './nationAct';
import { weekdayName } from './politicsService';

/**
 * Slice 7 T19 (docs/tech/slice-7.md §8.2; ADR 0049; design §4.5): the vote on the Chair. Opened
 * automatically when the party's home city enters Unrest while a player Chair holds office (once per
 * Chair per term), or by a petition of Rank 3+ members (10 PC each; the greater of three and a quarter
 * of the active Rank 3+ members within two City Days; not in the Chair's first five or last three
 * days; one per Chair per term). Two City Days of *Confidence* / *No confidence* (Rank 2+, secret);
 * removed at two thirds No and at least three No votes.
 */

export const chairPetitionId = (f: FactionId, chairTermId: Types.ObjectId): string => `chair:${f}:${chairTermId.toHexString()}`;
export const confidenceId = (f: FactionId, chairTermId: Types.ObjectId, trigger: 'unrest' | 'petition'): string =>
  `confidence:${f}:${chairTermId.toHexString()}:${trigger}`;

async function chairOf(session: ClientSession | null, f: FactionId): Promise<FactionStateDoc['chair']> {
  const q = FactionState.findById(f);
  return ((await (session ? q.session(session) : q).lean<FactionStateDoc>())?.chair ?? null) as FactionStateDoc['chair'];
}

async function gate(x: Pick<NationCtx, 'session' | 'c' | 'today'>, opening: boolean) {
  const chair = await chairOf(x.session, x.c.factionId);
  const p = chair ? await Petition.findById(chairPetitionId(x.c.factionId, chair.termId)).session(x.session).lean<PetitionDoc>() : null;
  const g = chairPetitionGate({
    rank: x.c.rank,
    chairDay: chair ? x.today - chair.fromDay : 0,
    usedThisTerm: !!p,
    playerChair: !!chair,
    pc: x.c.pc,
    signed: !!p?.signatures.some((s) => s.characterId.equals(x.c._id)),
    opening,
  });
  return { chair, p, g };
}

/** `confidence.openPetition` (§7.2). */
export function openPetition(deps: NationActDeps<object>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'confidence.openPetition', async (x) => {
    const { c, session, today } = x;
    const { chair, g } = await gate(x, true);
    if (g) throw refusal(g, g.reason === 'NOT_ENOUGH_PC' ? { pc: c.pc, cost: CONFIDENCE.cost } : {});
    const at = new Date(x.now);
    const closesDay = today + CONFIDENCE.closeAfter;
    await Petition.create(
      [
        {
          _id: chairPetitionId(c.factionId, chair!.termId),
          kind: 'chair',
          cityId: null,
          councilKey: null,
          factionId: c.factionId,
          chairTermId: chair!.termId,
          openedBy: { characterId: c._id, name: c.name },
          openedDay: today,
          closesDay,
          count: 1,
          signatures: [{ characterId: c._id, name: c.name, factionId: c.factionId, day: today, at }],
          townHall: 0,
          needed: null,
          status: 'open',
          closedAt: null,
        },
      ],
      { session },
    );
    const updated = await spendPc(x, CONFIDENCE.cost);
    const needed = signaturesNeeded(await activeMembers(c.factionId, CONFIDENCE.petitionRank, x.now, session), CONFIDENCE.min);
    return nationResult(content, { ...x, c: updated }, {
      act: 'chairPetitionOpen',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { needed: String(needed), resultWeekday: weekdayName(closesDay) },
      until: dayStart(closesDay),
      at: dayStart(closesDay),
      knockOns: { pc: { before: c.pc, after: updated.pc } },
      view: { kind: 'confidence', confidence: await confidenceView(content, updated, x.now, session) },
    });
  });
}

/** `confidence.sign` (§7.2): Rank 3+, 10 PC, once, public. */
export function sign(deps: NationActDeps<object>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'confidence.sign', async (x) => {
    const { c, session, today } = x;
    const { p, g } = await gate(x, false);
    if (g) throw refusal(g, g.reason === 'NOT_ENOUGH_PC' ? { pc: c.pc, cost: CONFIDENCE.cost } : {});
    if (!p || p.status !== 'open') throw new GameError('PETITION_CLOSED');
    const pushed = await Petition.updateOne(
      { _id: p._id, status: 'open', 'signatures.characterId': { $ne: c._id } },
      {
        $push: { signatures: { characterId: c._id, name: c.name, factionId: c.factionId, day: today, at: new Date(x.now) } },
        $inc: { count: 1 },
      },
      { session },
    );
    if (pushed.matchedCount === 0) throw new GameError('ALREADY_SIGNED', {}, 'CONFLICT');
    const updated = await spendPc(x, CONFIDENCE.cost);
    const needed = signaturesNeeded(await activeMembers(c.factionId, CONFIDENCE.petitionRank, x.now, session), CONFIDENCE.min);
    return nationResult(content, { ...x, c: updated }, {
      act: 'chairPetitionSign',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { signatures: String(p.count + 1), needed: String(needed), resultWeekday: weekdayName(p.closesDay) },
      until: dayStart(p.closesDay),
      at: dayStart(p.closesDay),
      knockOns: { pc: { before: c.pc, after: updated.pc } },
      view: { kind: 'confidence', confidence: await confidenceView(content, updated, x.now, session) },
    });
  });
}

/** `confidence.vote` (§7.2): Rank 2+, *Confidence* or *No confidence*, secret and final. */
export function vote(deps: NationActDeps<{ voteId: string; choice: 'confidence' | 'noConfidence' }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'confidence.vote', async (x) => {
    const { c, session, today } = x;
    const e = await FactionElection.findById(deps.input.voteId).session(session).lean<FactionElectionDoc>();
    if (!e || e.kind !== 'confidence' || e.factionId !== c.factionId || e.status !== 'voting')
      throw new GameError('NO_VOTE_OPEN');
    if (c.rank < CHAIR.voteRank) throw new GameError('RANK_TOO_LOW', { need: CHAIR.voteRank });
    if (await Vote.exists({ electionId: e._id, voterId: c._id }).session(session)) throw new GameError('ALREADY_VOTED', {}, 'CONFLICT');
    const open = await FactionElection.updateOne({ _id: e._id, status: 'voting' }, { $inc: { ballots: 1 } }, { session });
    if (open.matchedCount === 0) throw new GameError('NO_VOTE_OPEN');
    await Vote.create([{ electionId: e._id, voterId: c._id, candidateKey: deps.input.choice, day: today }], { session });
    return nationResult(content, x, {
      act: 'confidenceVote',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { vote: deps.input.choice === 'confidence' ? 'Confidence' : 'No confidence', countDay: weekdayName(e.countDay) },
      at: dayStart(e.countDay),
      view: { kind: 'confidence', confidence: await confidenceView(content, c, x.now, session) },
    });
  });
}

/** `confidence.get` (§8.3): the petition (signers public), the open vote (your own choice only), the last result. */
export async function confidenceView(
  content: GameContent,
  c: CharacterDoc,
  now: number,
  session: ClientSession | null = null,
): Promise<ConfidenceView> {
  const today = dayKey(now);
  const f = c.factionId;
  const s = <T>(q: { session(s: ClientSession | null): T }): T => q.session(session);
  const chair = await chairOf(session, f);
  const { p, g } = await gate({ session: session as ClientSession, c, today }, true);
  const open = await s(FactionElection.findOne({ kind: 'confidence', factionId: f, status: 'voting' }).sort({ votesFrom: -1 })).lean<FactionElectionDoc>();
  const last = await s(FactionElection.findOne({ kind: 'confidence', factionId: f, status: 'counted' }).sort({ countDay: -1 })).lean<FactionElectionDoc>();
  const mine = open ? await s(Vote.findOne({ electionId: open._id, voterId: c._id })).lean<VoteDoc>() : null;
  const needed = p ? (p.needed ?? signaturesNeeded(await activeMembers(f, CONFIDENCE.petitionRank, now, session), CONFIDENCE.min)) : 0;
  const lastResult = last?.result as { removed: boolean; confidence: number; noConfidence: number } | null | undefined;
  return {
    factionId: f,
    chair: chair ? { name: chair.holder.name, since: chair.fromDay, until: chair.toDay, you: chair.holder.characterId.equals(c._id) } : null,
    petition: p
      ? {
          id: p._id,
          count: p.count,
          needed,
          until: dayStart(p.closesDay),
          signers: p.signatures.map((x) => ({ name: x.name })),
          you: p.signatures.some((x) => x.characterId.equals(c._id))
            ? 'signed'
            : p.status === 'open' && c.rank >= CONFIDENCE.petitionRank
              ? 'sign'
              : 'no',
          status: p.status,
        }
      : null,
    canOpen: { ok: !g, why: g?.reason ?? null, ...(g?.need !== undefined ? { need: g.need } : {}) },
    vote: open
      ? {
          voteId: open._id,
          trigger: open.trigger ?? 'petition',
          until: dayStart(open.countDay),
          countDay: open.countDay,
          yourVote: (mine?.candidateKey as 'confidence' | 'noConfidence' | undefined) ?? null,
          canVote: {
            ok: !mine && c.rank >= CHAIR.voteRank,
            why: mine ? 'ALREADY_VOTED' : c.rank < CHAIR.voteRank ? 'RANK_TOO_LOW' : null,
          },
        }
      : null,
    last:
      last && lastResult
        ? { voteId: last._id, removed: lastResult.removed, confidence: lastResult.confidence, noConfidence: lastResult.noConfidence, day: last.countDay }
        : null,
  };
}

export async function getConfidence(deps: { user: SessionUser; content: GameContent; now: () => number }): Promise<ConfidenceView> {
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  return confidenceView(deps.content, doc, now);
}

// ---------------------------------------------------------------------------------------------
// The nation's day (step 'chair'): petitions closing, votes counting, the automatic vote.
// ---------------------------------------------------------------------------------------------

async function openVote(ctx: NationBoundaryCtx, f: FactionId, chairTermId: Types.ObjectId, trigger: 'unrest' | 'petition'): Promise<void> {
  await FactionElection.updateOne(
    { _id: confidenceId(f, chairTermId, trigger) },
    {
      $setOnInsert: {
        kind: 'confidence',
        factionId: f,
        termIndex: termOf(ctx.d).index,
        namesFrom: null,
        votesFrom: ctx.d,
        countDay: ctx.d + CONFIDENCE.voteDays,
        status: 'voting',
        seed: randomBytes(16).toString('hex'),
        filed: 0,
        ballots: 0,
        ballot: [
          { key: 'confidence', kind: 'player', name: 'Confidence', order: 0 },
          { key: 'noConfidence', kind: 'player', name: 'No confidence', order: 1 },
        ],
        chairTermId,
        trigger,
        result: null,
      },
    },
    { upsert: true, session: ctx.session },
  );
}

/** Petitions on the Chair closing at `d`: enough names open a two-day vote from `d`. */
async function closeChairPetitions(ctx: NationBoundaryCtx): Promise<void> {
  const due = await Petition.find({ kind: 'chair', status: 'open', closesDay: { $lte: ctx.d } }).session(ctx.session).lean<PetitionDoc[]>();
  for (const p of due) {
    const f = p.factionId!;
    const needed = signaturesNeeded(await activeMembers(f, CONFIDENCE.petitionRank, ctx.now, ctx.session), CONFIDENCE.min);
    const chair = (await chairOf(ctx.session, f)) ?? null;
    const live = !!chair && !!p.chairTermId && chair.termId.equals(p.chairTermId);
    const succeeded = live && p.count >= needed;
    await Petition.updateOne(
      { _id: p._id, status: 'open' },
      { $set: { status: succeeded ? 'succeeded' : 'failed', needed, closedAt: new Date(ctx.now) } },
      { session: ctx.session },
    );
    if (succeeded) await openVote(ctx, f, p.chairTermId!, 'petition');
  }
}

/** Votes on the Chair counting at `d`: removed → the term vacated, the secretary acts, the settings cleared. */
async function countConfidence(ctx: NationBoundaryCtx): Promise<void> {
  const due = await FactionElection.find({ kind: 'confidence', status: 'voting', countDay: { $lte: ctx.d } })
    .session(ctx.session)
    .lean<FactionElectionDoc[]>();
  for (const e of due) {
    const tallies = await Vote.aggregate<{ _id: string; n: number }>([
      { $match: { electionId: e._id } },
      { $group: { _id: '$candidateKey', n: { $sum: 1 } } },
    ]).session(ctx.session);
    const confidence = tallies.find((t) => t._id === 'confidence')?.n ?? 0;
    const noConfidence = tallies.find((t) => t._id === 'noConfidence')?.n ?? 0;
    const { removed } = confidenceResult({ confidence, noConfidence });
    await FactionElection.updateOne(
      { _id: e._id, status: 'voting' },
      { $set: { status: 'counted', result: { removed, confidence, noConfidence } } },
      { session: ctx.session },
    );
    if (!removed || !e.chairTermId) continue;
    const term = await OfficeTerm.findOneAndUpdate(
      { _id: e.chairTermId, vacatedDay: null },
      { $set: { vacatedDay: ctx.d } },
      { session: ctx.session, returnDocument: 'after', lean: true },
    );
    await FactionState.updateOne(
      { _id: e.factionId, 'chair.termId': e.chairTermId },
      { $set: { chair: null, orders: { current: null, next: null }, rules: [], fixtures: [] } },
      { session: ctx.session },
    );
    const sec = ctx.content.faction(e.factionId).secretary;
    ctx.news.push(
      newsItem(ctx.d, 'nl.chair-removed', 1, e.factionId, {
        name: term?.holder.name ?? '',
        faction: ctx.content.faction(e.factionId).name,
        noVotes: noConfidence,
        cast: confidence + noConfidence,
        secretary: sec.addressedAs,
      }),
    );
  }
}

/** Design §4.5: the home city entered Unrest since the last boundary while a player Chair holds office. */
async function unrestVote(ctx: NationBoundaryCtx): Promise<void> {
  for (const f of FACTION_IDS) {
    const chair = await chairOf(ctx.session, f);
    if (!chair) continue;
    const home = ctx.content.councilCities().find((c) => c.homeFactionId === f);
    const doc = home ? ctx.cities.get(home.id) : null;
    const m = doc?.morale;
    if (!m || m.state !== 'unrest' || m.since < ctx.d - 1 || m.since < chair.fromDay) continue;
    await openVote(ctx, f, chair.termId, 'unrest');
  }
}

export const confidenceSteps = [closeChairPetitions, countConfidence, unrestVote] as const;

export type { DayKey };
