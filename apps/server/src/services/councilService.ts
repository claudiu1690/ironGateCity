import type { GameContent } from '@irongate/content';
import { Candidacy, Character, City, Election, OfficeTerm, RuleBallot, Vote } from '@irongate/db';
import type {
  CandidacyDoc,
  CharacterDoc,
  CityDoc,
  ElectionDoc,
  OfficeTermDoc,
  RequestKind,
  RuleBallotDoc,
  VoteDoc,
} from '@irongate/db';
import {
  COUNCIL,
  MORALE,
  RANK_FXP,
  applyPersuasion,
  backersOf,
  councilDay,
  councilKey,
  dayKey,
  dayStart,
  electionKey,
  fillTemplate,
  moraleState,
  moraleTransition,
  nextNominationsAfter,
  nextPollsFrom,
  standingView,
} from '@irongate/rules';
import type { CouncilAct, DayKey, FactionId, PoliticalPlaceholder, PoliticalResult } from '@irongate/rules';
import type { ClientSession } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { writeLedger } from './ledger';
import { ensureSettled, loadCharacter } from './dayService';
import { ballotView, electionView, givenThisCycle, weekdayName } from './politicsService';
import { residenceOf, residenceSpec } from './residence';
import { withRequestKey } from './requestKey';
import { townHallView } from './townHallService';
import { DayChanged, VersionConflict } from './txn';
import { toCharacterView } from './views';

/**
 * The council's acts (tech design §8.2, ADR 0018; the voting rework, tech design §8.1): stand
 * (`declare`), back (`endorse`), vote on the rule and, for a councillor, set the rule. Each runs
 * through an ADR 0008 request key (a retry returns the stored modal), is guarded set-once on its
 * natural key in the same transaction as any PC spend, and writes the document the boundary closing
 * its window writes, so no act commits after its window.
 */

interface ActCtx {
  session: ClientSession;
  c: CharacterDoc;
  city: CityDoc | null;
  now: number;
  today: DayKey;
  spec: ReturnType<typeof residenceSpec>;
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

/** Slice 4: in the capital a member belongs to their own faction's branch; at home to the home one. */
const branchOf = (x: Pick<ActCtx, 'spec' | 'c'>): FactionId => x.spec.home ?? x.c.factionId;
const isDistrict = (x: Pick<ActCtx, 'spec'>) => x.spec.place.kind === 'district';
/** The election voted and stood in: the home city's, or the district's (ADR 0027). */
const electionOf = (x: Pick<ActCtx, 'spec' | 'cal'>) => electionKey(x.spec.place.id, x.cal.cycle);

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
      const spec = residenceSpec(content, c);
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
    act: CouncilAct;
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
    stamp: { label: t.stamp, tone: 'success' },
    paper: { name: paper.name, shortName: paper.shortName },
    place: { cityId: x.spec.city.id, cityName: x.spec.city.name },
    headline: fillTemplate(t.headline, vars),
    body: fillTemplate(t.body, vars),
    // Review 2 (screens §9): what comes next, the last knock-on line.
    ...(t.next ? { next: fillTemplate(t.next, vars) } : {}),
    until: r.until ?? null,
    at: r.at ?? null,
    knockOns: { pc: null, morale: null, backers: null, ...r.knockOns },
    performedAt: new Date(x.now).toISOString(),
    idempotencyKey: r.idempotencyKey,
    character: toCharacterView(x.c, x.now, content, null, { city: x.city }),
    view: r.view,
  };
}

const notNominations = (x: ActCtx) =>
  new GameError('NOT_NOMINATIONS', { opensAt: dayStart(nextNominationsAfter(x.today, x.spec.offset)) });

/** The city's menu (design §4.5): the capital's own, else the home menu. */
const menuHas = (content: GameContent, cityId: string, ordinanceId: string) =>
  (content.isDistricted(cityId) ? content.irongateMenu() : content.ordinancesMenu()).some(
    (o) => o.id === ordinanceId,
  );

// ---------------------------------------------------------------------------------------------
// Stand and back (ADR 0084).
// ---------------------------------------------------------------------------------------------

/**
 * `council.declare` (tech design §8.1): stand with a rule on cycle days 0–1 for 10 Political Capital,
 * spent. Rank 3, Known here, not sitting; no backers needed. `ON_BALLOT` holds from here (a candidate
 * cannot move until the result).
 */
export function declare(deps: ActDeps<{ ordinanceId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runAct(deps, 'council.declare', async (x) => {
    const { c, spec, cal, today, session } = x;
    if (cal.phase !== 'nominations') throw notNominations(x);
    const o = content.ordinance(deps.input.ordinanceId);
    if (!o || !menuHas(content, spec.city.id, o.id)) {
      throw new GameError('UNKNOWN_ORDINANCE', { ordinanceId: deps.input.ordinanceId }, 'BAD_REQUEST');
    }
    if (c.rank < COUNCIL.standRank) {
      throw new GameError('RANK_TOO_LOW', {
        need: COUNCIL.standRank,
        fxpToGo: Math.max(0, RANK_FXP[COUNCIL.standRank - 1]! - c.fxp),
      });
    }
    // ADR 0026 §3: a new resident stands from the next nominations.
    const standsFromDay = residenceOf(c).standsFromDay;
    if (standsFromDay > today) {
      throw new GameError('NOT_YET_CANDIDATE', { standsFromAt: dayStart(standsFromDay) });
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
    const key = electionOf(x);
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
          factionId: branchOf(x),
          placeId: spec.place.id,
          cycle: cal.cycle,
          characterId: c._id,
          name: c.name,
          rule: o.id,
          filedAt: at,
          filedDay: today,
          status: 'standing',
          endorsements: [],
          // Design §3.6: orders done before standing → the branch backs at once (+3, once).
          branch: ordersAllDone(c, today) ? { day: today, at } : null,
          deposit: 'spent',
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
        vars: { name: c.name, rule: o.name, countDay: weekdayName(cal.election.countDay) },
        at: dayStart(cal.election.countDay),
        knockOns: { pc: { before: c.pc, after: updated.pc } },
        view: { kind: 'election', election: await electionView(content, updated, x.now, session, x.city) },
      },
    );
  });
}

/**
 * `council.endorse` (back; tech design §8.1): +3 to a standing candidate of your own party, public and
 * final, 10 Political Capital, one per member per cycle; open on cycle days 0–4, until the count.
 */
export function endorse(deps: ActDeps<{ candidacyId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runAct(deps, 'council.endorse', async (x) => {
    const { c, spec, cal, today, session } = x;
    if (c.rank < COUNCIL.voteRank) throw new GameError('RANK_TOO_LOW', { need: COUNCIL.voteRank });
    const key = electionOf(x);
    const cand = await Candidacy.findById(deps.input.candidacyId).session(session).lean<CandidacyDoc>();
    // In the capital any district's candidate of this cycle (ADR 0027 §4); at home this election's.
    const sameRace = isDistrict(x)
      ? cand?.cityId === spec.city.id && cand.cycle === cal.cycle
      : cand?.electionId === key;
    if (!cand || !sameRace) {
      throw new GameError('UNKNOWN_CANDIDACY', { candidacyId: deps.input.candidacyId }, 'BAD_REQUEST');
    }
    if (cand.characterId.equals(c._id)) throw new GameError('CANNOT_ENDORSE_SELF', {}, 'BAD_REQUEST');
    if (cand.status !== 'standing') throw new GameError('CANDIDACY_CLOSED', { status: cand.status });
    const candFaction = cand.factionId ?? branchOf(x);
    if (candFaction !== c.factionId) throw new GameError('WRONG_FACTION', { factionId: candFaction });
    const given = givenThisCycle(c, spec, cal.cycle);
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
      { _id: cand._id, status: 'standing', 'endorsements.characterId': { $ne: c._id } },
      { $push: { endorsements: { characterId: c._id, name: c.name, day: today, at } } },
      { session },
    );
    if (pushed.matchedCount === 0) {
      const now = await Candidacy.findById(cand._id).session(session).lean<CandidacyDoc>();
      if (now && now.status !== 'standing') throw new GameError('CANDIDACY_CLOSED', { status: now.status });
      throw new GameError(
        'ALREADY_ENDORSED',
        { candidacyId: cand._id.toHexString(), name: cand.name },
        'CONFLICT',
      );
    }
    // The one-per-cycle guard: the election at home, the city's cycle in the capital.
    const cityCycle = isDistrict(x) ? councilKey(spec.city.id, cal.cycle) : key;
    const entry = {
      electionId: cand.electionId,
      candidacyId: cand._id,
      name: cand.name,
      day: today,
      cityCycle,
    };
    const updated = await spendPc(
      x,
      COUNCIL.cost.endorse,
      { endorsementsGiven: [...(c.endorsementsGiven ?? []), entry].slice(-4) },
      isDistrict(x)
        ? { 'endorsementsGiven.cityCycle': { $ne: cityCycle } }
        : { 'endorsementsGiven.electionId': { $ne: key } },
    );
    const after = await Candidacy.findById(cand._id).session(session).lean<CandidacyDoc>();
    const n = backersOf({ members: after!.endorsements.length, branch: after!.branch !== null });
    return buildPoliticalResult(
      content,
      { ...x, c: updated },
      {
        act: 'endorse',
        idempotencyKey: deps.input.idempotencyKey,
        vars: { name: cand.name, n: String(n), countDay: weekdayName(cal.election.countDay) },
        at: dayStart(cal.election.countDay),
        knockOns: {
          pc: { before: c.pc, after: updated.pc },
          backers: { name: cand.name, n },
        },
        view: { kind: 'election', election: await electionView(content, updated, x.now, session, x.city) },
      },
    );
  });
}

// ---------------------------------------------------------------------------------------------
// The vote on the rule (cycle days 2–4; ADR 0083, ADR 0019).
// ---------------------------------------------------------------------------------------------

/**
 * `council.vote` (tech design §8.1): one tap for one of the set ballot's cards, secret and final. At
 * home +0.5 morale in the vote's transaction (ADR 0022); in the capital no opinion moves (design §8.6).
 */
export function vote(deps: ActDeps<{ ordinanceId: string }>): Promise<PoliticalResult> {
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
    const key = electionOf(x);
    const e = await Election.findById(key, { status: 1, countDay: 1, pollsFrom: 1 })
      .session(session)
      .lean<ElectionDoc>();
    if (!e || e.status === 'nominations') throw new GameError('ELECTION_NOT_READY', {}, 'CONFLICT');
    if (e.status !== 'polling') {
      throw new GameError('NOT_POLLING', { opensAt: dayStart(nextPollsFrom(today + 1, spec.offset)) });
    }
    // ADR 0026 §3: a new resident votes from the first polls opening after the move.
    const votesFromDay = residenceOf(c).votesFromDay;
    if (votesFromDay > e.pollsFrom) {
      throw new GameError('NOT_YET_VOTER', { votesFromAt: dayStart(votesFromDay) });
    }
    // The cards of the city's ballot k (the capital's for a district's vote).
    const ballot = await RuleBallot.findById(councilKey(spec.city.id, cal.cycle), { status: 1, cards: 1 })
      .session(session)
      .lean<RuleBallotDoc>();
    if (!ballot || ballot.status === 'open' || !ballot.cards) {
      throw new GameError('ELECTION_NOT_READY', {}, 'CONFLICT');
    }
    const card = ballot.cards.find((cd) => cd.ordinanceId === deps.input.ordinanceId);
    if (!card) throw new GameError('NOT_ON_BALLOT', { ordinanceId: deps.input.ordinanceId }, 'BAD_REQUEST');
    const ruleNameOf = (id: string) => content.ordinance(id)?.name ?? id;
    const existing = await Vote.findOne({ electionId: key, voterId: c._id }).session(session).lean<VoteDoc>();
    if (existing) {
      const id = existing.ordinanceId ?? existing.candidateKey ?? '';
      throw new GameError('ALREADY_VOTED', { ordinanceId: id, name: ruleNameOf(id) }, 'CONFLICT');
    }
    const open = await Election.updateOne(
      { _id: key, status: 'polling' },
      { $inc: { ballots: 1 } },
      { session },
    );
    if (open.matchedCount === 0) throw new GameError('NOT_POLLING', {});
    await Vote.create([{ electionId: key, voterId: c._id, ordinanceId: card.ordinanceId, day: today }], {
      session,
    });
    // The first ballot ever opens Finish His Work chapter 2 (design §17.7): set once, no other field.
    await Character.updateOne(
      { _id: c._id, firstBallotAt: null },
      { $set: { firstBallotAt: new Date(x.now) } },
      { session },
    );
    const vars = { rule: ruleNameOf(card.ordinanceId), countDay: weekdayName(e.countDay) };
    // Design §8.6: a capital ballot never moves a district's opinion (and there is no morale).
    const home = spec.home;
    if (!home) {
      return buildPoliticalResult(content, x, {
        act: 'ballot',
        idempotencyKey: deps.input.idempotencyKey,
        vars,
        at: dayStart(e.countDay),
        view: {
          kind: 'ballot',
          ballot: await ballotView(content, c, spec.city.id, x.city, x.now, session),
        },
      });
    }
    // ADR 0022: +0.5 morale per ballot, in the ballot's transaction; a ledger row, not a contribution.
    const shares = x.city?.opinion ?? spec.city.baselineOpinion;
    const op = applyPersuasion(shares, { factionId: home, swing: MORALE.ballot, homeFactionId: home });
    const m = moraleTransition(x.city?.morale ?? null, op.shares[home], today);
    await City.updateOne(
      { _id: spec.city.id },
      { $set: { opinion: op.shares, ...(m ? { morale: m } : {}) } },
      { session },
    );
    await writeLedger(
      content,
      [
        {
          cityId: spec.city.id,
          placeId: spec.city.id,
          factionId: home,
          swing: op.applied,
          kind: 'ballot',
          characterId: c._id,
          ref: key,
          day: today,
          at: new Date(x.now),
        },
      ],
      session,
    );
    const city = x.city ? { ...x.city, opinion: op.shares } : x.city;
    return buildPoliticalResult(
      content,
      { ...x, city },
      {
        act: 'ballot',
        idempotencyKey: deps.input.idempotencyKey,
        vars,
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
        view: { kind: 'ballot', ballot: await ballotView(content, c, spec.city.id, city, x.now, session) },
      },
    );
  });
}

// ---------------------------------------------------------------------------------------------
// The councillor's rule (cycle days 0–1 of the term; ADR 0084).
// ---------------------------------------------------------------------------------------------

/**
 * `council.setRule` (tech design §8.1): a player councillor names the rule they put to the town, free,
 * one tap, on the term's first two days. A target-state `$set` on the term; serialised with the set
 * by `$inc changes` on the open ballot (a miss: the set has run, `RULE_WINDOW_CLOSED`).
 */
export function setRule(deps: ActDeps<{ ordinanceId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runAct(deps, 'council.setRule', async (x) => {
    const { c, spec, cal, session } = x;
    const key = councilKey(spec.city.id, cal.cycle);
    const term = await OfficeTerm.findOne({
      councilKey: key,
      'holder.kind': 'player',
      'holder.characterId': c._id,
      vacatedDay: null,
    })
      .session(session)
      .lean<OfficeTermDoc>();
    if (!term) throw new GameError('NOT_COUNCILLOR');
    const o = content.ordinance(deps.input.ordinanceId);
    if (!o || !menuHas(content, spec.city.id, o.id)) {
      throw new GameError('UNKNOWN_ORDINANCE', { ordinanceId: deps.input.ordinanceId }, 'BAD_REQUEST');
    }
    const closed = () => new GameError('RULE_WINDOW_CLOSED', { opensAt: dayStart(cal.council.toDay) });
    if (!cal.council.ruleOpen) throw closed();
    const set = await OfficeTerm.updateOne(
      { _id: term._id, 'holder.characterId': c._id, vacatedDay: null },
      { $set: { rule: o.id, ruleSetAt: new Date(x.now) } },
      { session },
    );
    if (set.matchedCount === 0) throw new GameError('NOT_COUNCILLOR');
    const open = await RuleBallot.updateOne({ _id: key, status: 'open' }, { $inc: { changes: 1 } }, { session });
    if (open.matchedCount === 0) throw closed();
    const line = o.plainLine.replace(/\.$/, '');
    return buildPoliticalResult(content, x, {
      act: 'setRule',
      idempotencyKey: deps.input.idempotencyKey,
      vars: {
        rule: o.name,
        line: line.charAt(0).toUpperCase() + line.slice(1),
        pollsWeekday: weekdayName(cal.election.pollsFrom),
        weekday: weekdayName(cal.election.countDay - 1),
      },
      at: dayStart(cal.election.pollsFrom),
      view: {
        kind: 'hall',
        hall: await townHallView(content, c, spec.city.id, x.now, { session, city: x.city }),
      },
    });
  });
}

// ---------------------------------------------------------------------------------------------
// The branch's backing in play (design §3.6), called from an action, a job take or a mission.
// ---------------------------------------------------------------------------------------------

/**
 * When a write completes the day's third order on cycle days 0–4, the branch backs the caller's
 * standing candidacy (+3, once; §20.1 Q3). Returns the backers line for the result modal, or null.
 */
export async function branchBackIfStanding(
  content: GameContent,
  session: ClientSession,
  c: CharacterDoc,
  today: DayKey,
  now: number,
): Promise<{ backers: number } | null> {
  let spec: ReturnType<typeof residenceSpec>;
  try {
    spec = residenceSpec(content, c);
  } catch {
    return null;
  }
  if (spec.home !== null && spec.home !== c.factionId) return null;
  const cal = councilDay(today, spec.offset);
  const key = electionKey(spec.place.id, cal.cycle);
  const cand = await Candidacy.findOneAndUpdate(
    { electionId: key, characterId: c._id, status: 'standing', branch: null },
    { $set: { branch: { day: today, at: new Date(now) } } },
    { session, returnDocument: 'after', lean: true },
  );
  if (!cand) return null;
  return { backers: backersOf({ members: cand.endorsements.length, branch: true }) };
}
