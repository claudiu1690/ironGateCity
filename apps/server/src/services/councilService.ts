import type { GameContent } from '@irongate/content';
import { Candidacy, Character, City, Election, OfficeTerm, OrderPaper, Vote } from '@irongate/db';
import type {
  CandidacyDoc,
  CharacterDoc,
  CityDoc,
  ElectionDoc,
  OfficeTermDoc,
  OrderPaperDoc,
  RequestKind,
  VoteDoc,
} from '@irongate/db';
import {
  AGAINST_ALL,
  COUNCIL,
  MORALE,
  RANK_FXP,
  applyPersuasion,
  councilDay,
  councilKey,
  dayKey,
  dayStart,
  electionKey,
  fillTemplate,
  isSmallBranch,
  moraleState,
  moraleTransition,
  nextNominationsAfter,
  nextPollsFrom,
  standingView,
} from '@irongate/rules';
import type { DayKey, PoliticalAct, PoliticalPlaceholder, PoliticalResult } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { activeMembersFilter } from './cityDay';
import { ensureSettled, loadCharacter } from './dayService';
import { councilView, electionView, endorsementsOf, homeSpec, weekdayName } from './politicsService';
import { withRequestKey } from './requestKey';
import { DayChanged, VersionConflict } from './txn';
import { toCharacterView } from './views';

/**
 * The six political acts (tech design §8.2, ADR 0018): declare, withdraw, endorse, vote, propose
 * and the council vote. Each runs through an ADR 0008 request key (a retry returns the stored
 * modal), is guarded set-once on its natural key in the same transaction as any PC spend, and
 * writes the document the boundary closing its window writes, so no act commits after its window.
 */

interface ActCtx {
  session: ClientSession;
  c: CharacterDoc;
  city: CityDoc | null;
  now: number;
  today: DayKey;
  spec: ReturnType<typeof homeSpec>;
  cal: ReturnType<typeof councilDay>;
}

interface ActDeps<I> {
  user: SessionUser;
  content: GameContent;
  now: () => number;
  input: I & { idempotencyKey: string };
}

const ordersAllDone = (c: CharacterDoc, today: DayKey) =>
  c.orders.day === today && c.orders.allDoneAt !== null;

async function runAct<I extends object>(
  deps: ActDeps<I>,
  kind: RequestKind,
  fn: (x: ActCtx) => Promise<PoliticalResult>,
): Promise<PoliticalResult> {
  const { content } = deps;
  const loaded = await loadCharacter(deps.user, content, deps.now());
  const { idempotencyKey, ...input } = deps.input;
  return withRequestKey({
    characterId: loaded.doc._id,
    idempotencyKey,
    kind,
    input,
    resettle: async () => {
      const fresh = await Character.findById(loaded.doc._id).lean<CharacterDoc>();
      if (fresh) await ensureSettled(content, fresh, deps.now());
    },
    fn: async (session) => {
      const now = deps.now();
      const today = dayKey(now);
      const c = await Character.findById(loaded.doc._id).session(session).lean<CharacterDoc>();
      if (!c) throw new Error('character disappeared');
      if (c.day.settled !== today) throw new DayChanged();
      const spec = homeSpec(content, c);
      const city = await City.findById(spec.city.id).session(session).lean<CityDoc>();
      return fn({ session, c, city, now, today, spec, cal: councilDay(today, spec.offset) });
    },
  });
}

/** Spend PC on the character with the version and `pc ≥ cost` guards (ADR 0018). */
async function spendPc(x: ActCtx, cost: number, extra: Record<string, unknown> = {}, filter: object = {}) {
  const updated = await Character.findOneAndUpdate(
    { _id: x.c._id, version: x.c.version, 'day.settled': x.today, pc: { $gte: cost }, ...filter },
    { $inc: { pc: -cost, version: 1 }, ...(Object.keys(extra).length ? { $set: extra } : {}) },
    { session: x.session, returnDocument: 'after', lean: true },
  );
  if (!updated) throw new VersionConflict();
  return updated as CharacterDoc;
}

function buildPoliticalResult(
  content: GameContent,
  x: Pick<ActCtx, 'now' | 'spec'> & { c: CharacterDoc; city: CityDoc | null },
  r: {
    act: PoliticalAct;
    idempotencyKey: string;
    vars: Partial<Record<PoliticalPlaceholder, string>>;
    until?: number | null;
    at?: number | null;
    knockOns?: Partial<PoliticalResult['knockOns']>;
    view: PoliticalResult['view'];
  },
): PoliticalResult {
  const t = content.politics.results[r.act];
  const paper = x.spec.city.paper ?? { name: 'The paper', shortName: 'paper' };
  const vars = { paper: `the ${paper.shortName}`, ...r.vars };
  return {
    kind: 'political',
    act: r.act,
    stamp: { label: t.stamp, tone: r.act === 'withdraw' ? 'partial' : 'success' },
    paper: { name: paper.name, shortName: paper.shortName },
    place: { cityId: x.spec.city.id, cityName: x.spec.city.name },
    headline: fillTemplate(t.headline, vars),
    body: fillTemplate(t.body, vars),
    // Review 2 (screens §9): what comes next, the last knock-on line.
    ...(t.next ? { next: fillTemplate(t.next, vars) } : {}),
    until: r.until ?? null,
    at: r.at ?? null,
    knockOns: { pc: null, morale: null, endorsements: null, ...r.knockOns },
    performedAt: new Date(x.now).toISOString(),
    idempotencyKey: r.idempotencyKey,
    character: toCharacterView(x.c, x.now, content, null, { city: x.city }),
    view: r.view,
  };
}

const notNominations = (x: ActCtx) =>
  new GameError('NOT_NOMINATIONS', { opensAt: dayStart(nextNominationsAfter(x.today, x.spec.offset)) });

// ---------------------------------------------------------------------------------------------
// Declare, withdraw, endorse (nominations).
// ---------------------------------------------------------------------------------------------

export function declare(deps: ActDeps<{ platformId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runAct(deps, 'council.declare', async (x) => {
    const { c, spec, cal, today, session } = x;
    if (cal.phase !== 'nominations') throw notNominations(x);
    if (!content.platform(spec.home, deps.input.platformId)) {
      throw new GameError('UNKNOWN_PLATFORM', { platformId: deps.input.platformId }, 'BAD_REQUEST');
    }
    if (c.rank < COUNCIL.standRank) {
      throw new GameError('RANK_TOO_LOW', {
        need: COUNCIL.standRank,
        fxpToGo: Math.max(0, RANK_FXP[COUNCIL.standRank - 1]! - c.fxp),
      });
    }
    const successes = c.localStanding.find((s) => s.cityId === spec.city.id)?.successes ?? 0;
    if (standingView(successes).level < COUNCIL.knownLevel)
      throw new GameError('NOT_KNOWN', { successes, need: 30 });
    const sitting = await OfficeTerm.findOne({
      cityId: spec.city.id,
      'holder.kind': 'player',
      'holder.characterId': c._id,
      fromDay: { $lte: today },
      toDay: { $gt: today },
    })
      .session(session)
      .lean<OfficeTermDoc>();
    if (sitting) throw new GameError('SITTING_COUNCILLOR', { termEndsAt: dayStart(sitting.toDay) });
    const key = electionKey(spec.city.id, cal.cycle);
    const e = await Election.findById(key).session(session).lean<ElectionDoc>();
    if (!e) throw new GameError('ELECTION_NOT_READY', {}, 'CONFLICT');
    const existing = await Candidacy.findOne({ electionId: key, characterId: c._id })
      .session(session)
      .lean<CandidacyDoc>();
    if (existing) throw new GameError('ALREADY_FILED', { status: existing.status }, 'CONFLICT');
    if (c.pc < COUNCIL.cost.declare)
      throw new GameError('NOT_ENOUGH_PC', { pc: c.pc, cost: COUNCIL.cost.declare });
    const filed = await Election.updateOne(
      { _id: key, status: 'nominations' },
      { $inc: { filed: 1 } },
      { session },
    );
    if (filed.matchedCount === 0) throw notNominations(x);
    const at = new Date(x.now);
    await Candidacy.create(
      [
        {
          electionId: key,
          cityId: spec.city.id,
          cycle: cal.cycle,
          characterId: c._id,
          name: c.name,
          platformId: deps.input.platformId,
          filedAt: at,
          filedDay: today,
          status: 'filed',
          endorsements: [],
          // Design §17 Q2: orders done before filing → the branch endorses at filing.
          branch: ordersAllDone(c, today) ? { day: today, at } : null,
          deposit: 'held',
        },
      ],
      { session },
    );
    const updated = await spendPc(x, COUNCIL.cost.declare);
    return buildPoliticalResult(
      content,
      { ...x, c: updated },
      {
        act: 'declare',
        idempotencyKey: deps.input.idempotencyKey,
        vars: { name: c.name, pollsWeekday: weekdayName(cal.election.pollsFrom) },
        until: dayStart(cal.election.pollsFrom),
        knockOns: { pc: { before: c.pc, after: updated.pc } },
        view: { kind: 'election', election: await electionView(content, updated, today, session) },
      },
    );
  });
}

export function withdraw(deps: ActDeps<object>): Promise<PoliticalResult> {
  const { content } = deps;
  return runAct(deps, 'council.withdraw', async (x) => {
    const { c, spec, cal, today, session } = x;
    if (cal.phase !== 'nominations') throw notNominations(x);
    const key = electionKey(spec.city.id, cal.cycle);
    const done = await Candidacy.findOneAndUpdate(
      { electionId: key, characterId: c._id, status: 'filed' },
      { $set: { status: 'withdrawn', deposit: 'kept' } },
      { session, returnDocument: 'after', lean: true },
    );
    if (!done) {
      const existing = await Candidacy.findOne({ electionId: key, characterId: c._id })
        .session(session)
        .lean<CandidacyDoc>();
      throw new GameError('NOT_FILED', { status: existing?.status ?? null });
    }
    return buildPoliticalResult(content, x, {
      act: 'withdraw',
      idempotencyKey: deps.input.idempotencyKey,
      vars: { weekday: weekdayName(nextNominationsAfter(today, spec.offset)) },
      view: { kind: 'election', election: await electionView(content, c, today, session) },
    });
  });
}

export function endorse(deps: ActDeps<{ candidacyId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runAct(deps, 'council.endorse', async (x) => {
    const { c, spec, cal, today, session } = x;
    if (cal.phase !== 'nominations') throw notNominations(x);
    if (c.rank < COUNCIL.voteRank) throw new GameError('RANK_TOO_LOW', { need: COUNCIL.voteRank });
    const key = electionKey(spec.city.id, cal.cycle);
    const cand = await Candidacy.findById(deps.input.candidacyId).session(session).lean<CandidacyDoc>();
    if (!cand || cand.electionId !== key) {
      throw new GameError('UNKNOWN_CANDIDACY', { candidacyId: deps.input.candidacyId }, 'BAD_REQUEST');
    }
    if (cand.characterId.equals(c._id)) throw new GameError('CANNOT_ENDORSE_SELF', {}, 'BAD_REQUEST');
    if (cand.status !== 'filed') throw new GameError('CANDIDACY_CLOSED', { status: cand.status });
    const given = (c.endorsementsGiven ?? []).find((g) => g.electionId === key);
    if (given) {
      throw new GameError(
        'ALREADY_ENDORSED',
        { candidacyId: given.candidacyId.toHexString(), name: given.name },
        'CONFLICT',
      );
    }
    if (c.pc < COUNCIL.cost.endorse)
      throw new GameError('NOT_ENOUGH_PC', { pc: c.pc, cost: COUNCIL.cost.endorse });
    const at = new Date(x.now);
    const pushed = await Candidacy.updateOne(
      { _id: cand._id, status: 'filed', 'endorsements.characterId': { $ne: c._id } },
      { $push: { endorsements: { characterId: c._id, name: c.name, day: today, at } } },
      { session },
    );
    if (pushed.matchedCount === 0) {
      const now = await Candidacy.findById(cand._id).session(session).lean<CandidacyDoc>();
      if (now && now.status !== 'filed') throw new GameError('CANDIDACY_CLOSED', { status: now.status });
      throw new GameError(
        'ALREADY_ENDORSED',
        { candidacyId: cand._id.toHexString(), name: cand.name },
        'CONFLICT',
      );
    }
    const entry = { electionId: key, candidacyId: cand._id, name: cand.name, day: today };
    const updated = await spendPc(
      x,
      COUNCIL.cost.endorse,
      { endorsementsGiven: [...(c.endorsementsGiven ?? []), entry].slice(-4) },
      { 'endorsementsGiven.electionId': { $ne: key } },
    );
    const after = await Candidacy.findById(cand._id).session(session).lean<CandidacyDoc>();
    const others = await Character.countDocuments({
      ...activeMembersFilter(spec.city.id, spec.home, today),
      _id: { $ne: cand.characterId },
    }).session(session);
    const secretary = content.npc(spec.faction.secretary.npcId)?.name ?? '';
    const n = endorsementsOf(content, after!, isSmallBranch(others), secretary).n;
    return buildPoliticalResult(
      content,
      { ...x, c: updated },
      {
        act: 'endorse',
        idempotencyKey: deps.input.idempotencyKey,
        vars: { name: cand.name, n: String(n), pollsWeekday: weekdayName(cal.election.pollsFrom) },
        until: dayStart(cal.election.pollsFrom),
        knockOns: {
          pc: { before: c.pc, after: updated.pc },
          endorsements: { name: cand.name, n, needed: COUNCIL.endorsementsNeeded },
        },
        view: { kind: 'election', election: await electionView(content, updated, today, session) },
      },
    );
  });
}

// ---------------------------------------------------------------------------------------------
// The ballot (polls open; ADR 0019).
// ---------------------------------------------------------------------------------------------

export function vote(deps: ActDeps<{ candidateKey: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runAct(deps, 'council.vote', async (x) => {
    const { c, spec, cal, today, session } = x;
    if (cal.phase !== 'polling') {
      throw new GameError('NOT_POLLING', { opensAt: dayStart(nextPollsFrom(today, spec.offset)) });
    }
    if (c.rank < COUNCIL.voteRank) {
      throw new GameError('RANK_TOO_LOW', {
        need: COUNCIL.voteRank,
        fxpToGo: Math.max(0, RANK_FXP[COUNCIL.voteRank - 1]! - c.fxp),
      });
    }
    const key = electionKey(spec.city.id, cal.cycle);
    const e = await Election.findById(key, { ballot: 1, status: 1, countDay: 1 })
      .session(session)
      .lean<ElectionDoc>();
    if (!e || e.status === 'nominations') throw new GameError('ELECTION_NOT_READY', {}, 'CONFLICT');
    if (e.status !== 'polling') {
      throw new GameError('NOT_POLLING', { opensAt: dayStart(nextPollsFrom(today + 1, spec.offset)) });
    }
    const line = (e.ballot ?? []).find((b) => b.key === deps.input.candidateKey);
    if (!line)
      throw new GameError('UNKNOWN_CANDIDATE', { candidateKey: deps.input.candidateKey }, 'BAD_REQUEST');
    const existing = await Vote.findOne({ electionId: key, voterId: c._id }).session(session).lean<VoteDoc>();
    if (existing) {
      const name = (e.ballot ?? []).find((b) => b.key === existing.candidateKey)?.name ?? '';
      throw new GameError('ALREADY_VOTED', { candidateKey: existing.candidateKey, name }, 'CONFLICT');
    }
    const open = await Election.updateOne(
      { _id: key, status: 'polling' },
      { $inc: { ballots: 1 } },
      { session },
    );
    if (open.matchedCount === 0) throw new GameError('NOT_POLLING', {});
    await Vote.create([{ electionId: key, voterId: c._id, candidateKey: line.key, day: today }], { session });
    // The first ballot ever opens Finish His Work chapter 2 (design §17.7): set once, no other field.
    await Character.updateOne(
      { _id: c._id, firstBallotAt: null },
      { $set: { firstBallotAt: new Date(x.now) } },
      { session },
    );
    // ADR 0022: +0.5 morale per ballot, in the ballot's transaction.
    const home = spec.home;
    const shares = x.city?.opinion ?? spec.city.baselineOpinion;
    const op = applyPersuasion(shares, { factionId: home, swing: MORALE.ballot, homeFactionId: home });
    const m = moraleTransition(x.city?.morale ?? null, op.shares[home], today);
    await City.updateOne(
      { _id: spec.city.id },
      { $set: { opinion: op.shares, ...(m ? { morale: m } : {}) } },
      { session },
    );
    const city = x.city ? { ...x.city, opinion: op.shares } : x.city;
    return buildPoliticalResult(
      content,
      { ...x, city },
      {
        act: 'ballot',
        idempotencyKey: deps.input.idempotencyKey,
        vars: { name: line.name, countDay: weekdayName(e.countDay) },
        at: dayStart(e.countDay),
        knockOns: {
          morale: {
            cityName: spec.city.name,
            factionId: home,
            before: shares[home],
            after: op.shares[home],
            stateBefore: moraleState(shares[home]),
            stateAfter: moraleState(op.shares[home]),
          },
        },
        view: { kind: 'election', election: await electionView(content, c, today, session) },
      },
    );
  });
}

// ---------------------------------------------------------------------------------------------
// The chamber: propose and the council vote (council days 0–1).
// ---------------------------------------------------------------------------------------------

async function councillorTerm(x: ActCtx): Promise<OfficeTermDoc> {
  const term = await OfficeTerm.findOne({
    councilKey: councilKey(x.spec.city.id, x.cal.cycle),
    'holder.kind': 'player',
    'holder.characterId': x.c._id,
  })
    .session(x.session)
    .lean<OfficeTermDoc>();
  if (!term) throw new GameError('NOT_COUNCILLOR');
  if (!x.cal.council.voting) {
    throw new GameError('COUNCIL_CLOSED', {
      divideAt: dayStart(x.cal.council.divideDay),
      opensAt: dayStart(x.cal.council.toDay),
    });
  }
  return term;
}

export function propose(deps: ActDeps<{ ordinanceId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runAct(deps, 'council.propose', async (x) => {
    const { c, spec, cal, today, session } = x;
    await councillorTerm(x);
    const o = content.ordinance(deps.input.ordinanceId);
    if (!o) throw new GameError('UNKNOWN_ORDINANCE', { ordinanceId: deps.input.ordinanceId }, 'BAD_REQUEST');
    if (c.pc < COUNCIL.cost.propose)
      throw new GameError('NOT_ENOUGH_PC', { pc: c.pc, cost: COUNCIL.cost.propose });
    const key = councilKey(spec.city.id, cal.cycle);
    const at = new Date(x.now);
    const pushed = await OrderPaper.updateOne(
      {
        _id: key,
        status: 'open',
        'items.ordinanceId': { $ne: o.id },
        'items.movedBy.characterId': { $ne: c._id },
        [`items.${COUNCIL.maxProposals}`]: { $exists: false },
      },
      {
        $push: {
          items: {
            ordinanceId: o.id,
            movedBy: { kind: 'player', characterId: c._id, name: c.name },
            at,
            day: today,
          },
        },
      },
      { session },
    );
    if (pushed.matchedCount === 0) {
      const p = await OrderPaper.findById(key).session(session).lean<OrderPaperDoc>();
      if (!p || p.status !== 'open')
        throw new GameError('COUNCIL_CLOSED', { divideAt: dayStart(cal.council.divideDay) });
      const mine = p.items.find((i) => i.movedBy.kind === 'player' && i.movedBy.characterId.equals(c._id));
      if (mine) throw new GameError('ALREADY_PROPOSED', { ordinanceId: mine.ordinanceId }, 'CONFLICT');
      if (p.items.some((i) => i.ordinanceId === o.id))
        throw new GameError('ALREADY_ON_PAPER', { ordinanceId: o.id }, 'CONFLICT');
      throw new GameError('PAPER_FULL');
    }
    const updated = await spendPc(x, COUNCIL.cost.propose);
    return buildPoliticalResult(
      content,
      { ...x, c: updated },
      {
        act: 'propose',
        idempotencyKey: deps.input.idempotencyKey,
        vars: { ordinance: o.name, ordinanceLine: o.line },
        at: dayStart(cal.council.divideDay),
        knockOns: { pc: { before: c.pc, after: updated.pc } },
        view: { kind: 'council', council: await councilView(content, updated, x.city, today, session) },
      },
    );
  });
}

export function councilVote(deps: ActDeps<{ choice: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runAct(deps, 'council.councilVote', async (x) => {
    const { c, spec, cal, today, session } = x;
    const term = await councillorTerm(x);
    const key = councilKey(spec.city.id, cal.cycle);
    const p = await OrderPaper.findById(key).session(session).lean<OrderPaperDoc>();
    const choice = deps.input.choice;
    if (!p || p.status !== 'open')
      throw new GameError('COUNCIL_CLOSED', { divideAt: dayStart(cal.council.divideDay) });
    if (choice !== AGAINST_ALL && !p.items.some((i) => i.ordinanceId === choice)) {
      throw new GameError('NOT_ON_PAPER', { choice }, 'BAD_REQUEST');
    }
    const pushed = await OrderPaper.updateOne(
      { _id: key, status: 'open', 'votes.characterId': { $ne: c._id } },
      {
        $push: { votes: { characterId: c._id, name: c.name, seat: term.seat, choice, at: new Date(x.now) } },
      },
      { session },
    );
    if (pushed.matchedCount === 0) {
      const again = await OrderPaper.findById(key).session(session).lean<OrderPaperDoc>();
      if (!again || again.status !== 'open') throw new GameError('COUNCIL_CLOSED', {});
      const mine = again.votes.find((v) => v.characterId.equals(c._id));
      throw new GameError('ALREADY_COUNCIL_VOTED', { choice: mine?.choice ?? null }, 'CONFLICT');
    }
    const o = content.ordinance(choice);
    return buildPoliticalResult(content, x, {
      act: 'councilVote',
      idempotencyKey: deps.input.idempotencyKey,
      vars: {
        ordinance: o?.name ?? 'none of these',
        ordinanceLine: o?.line ?? '',
        resultWeekday: weekdayName(cal.council.divideDay),
      },
      at: dayStart(cal.council.divideDay),
      view: { kind: 'council', council: await councilView(content, c, x.city, today, session) },
    });
  });
}

// ---------------------------------------------------------------------------------------------
// The branch's endorsement in play (design §6.3), called from an action or a job take.
// ---------------------------------------------------------------------------------------------

/**
 * When a write completes the day's third order on a nominations day, the branch endorses the
 * caller's filed candidacy (once). Returns the endorsement line for the result modal, or null.
 */
export async function branchEndorseIfFiled(
  content: GameContent,
  session: ClientSession,
  c: CharacterDoc,
  today: DayKey,
  now: number,
): Promise<{ endorsements: number; needed: number; smallBranch: boolean } | null> {
  const spec = content.city(c.homeCityId);
  if (!spec?.council || spec.homeFactionId !== c.factionId) return null;
  const cal = councilDay(today, spec.council.offset);
  if (cal.phase !== 'nominations') return null;
  const key = electionKey(spec.id, cal.cycle);
  const cand = await Candidacy.findOneAndUpdate(
    { electionId: key, characterId: c._id, status: 'filed', branch: null },
    { $set: { branch: { day: today, at: new Date(now) } } },
    { session, returnDocument: 'after', lean: true },
  );
  if (!cand) return null;
  const others = await Character.countDocuments({
    ...activeMembersFilter(spec.id, spec.homeFactionId, today),
    _id: { $ne: c._id },
  }).session(session);
  const small = isSmallBranch(others);
  const faction = content.faction(spec.homeFactionId);
  const n = endorsementsOf(
    content,
    cand as CandidacyDoc,
    small,
    content.npc(faction.secretary.npcId)?.name ?? '',
  ).n;
  return { endorsements: n, needed: COUNCIL.endorsementsNeeded, smallBranch: small };
}
