import { createHash } from 'node:crypto';
import type { GameContent } from '@irongate/content';
import { Bill, FactionState, LawModel, Nation, NationalElection, OfficeTerm, isDuplicateKeyError } from '@irongate/db';
import type { BillDoc, BillTabler, CharacterDoc, FactionStateDoc, LawDoc, NationDoc, NationalElectionDoc, OfficeTermDoc } from '@irongate/db';
import {
  DEPUTY,
  FACTION_IDS,
  PARLIAMENT,
  TERM_DAYS,
  autoRemovalDue,
  billDays,
  billNeeded,
  createRng,
  dayKey,
  dayStart,
  divideBill,
  drawOrderOf,
  enact,
  figureBill,
  isFactional,
  lawsOnDay,
  localVote,
  nationalPhase,
  nextDate,
  overrideFits,
  removalSecretaryLines,
  secretaryBill,
  tableGate,
  termOf,
  vetoOpen,
  weekKey,
} from '@irongate/rules';
import type {
  BillKind,
  BillPageView,
  BillRowView,
  BlocListView,
  CatalogueView,
  ChamberView,
  DayKey,
  FactionId,
  LawCardView,
  LawInForce,
  LineVote,
  PoliticalResult,
  TermLineView,
} from '@irongate/rules';
import { Types } from 'mongoose';
import type { ClientSession } from 'mongoose';
import { GameError } from '../gameError';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { newsItem } from './nationDay';
import type { NationBoundaryCtx } from './nationDay';
import { currentTerm, nationOf, nationResult, refusal, runNationAct, spendPc } from './nationAct';
import type { NationActDeps } from './nationAct';
import { weekdayName } from './politicsService';
import { inTransaction } from './txn';

/**
 * Slice 7 T15 and T18 (docs/tech/slice-7.md §3.2, §8.2 `parliamentService`; ADR 0045, 0049; design
 * §5, §7, §10.2): Parliament. Tabling (a deputy or a Chair once a term for 50 PC, the President once a
 * week in a slot of its own), the deputies' public votes, the divisions and enactments at the
 * nation's boundary (the locals by the chain), strikes, the cap and renewals, the failed week, the
 * Monday bills (a figure President's, the secretaries'), the veto and *vote it through anyway*, the
 * removal of the President (a player's motion or the clerk's) and the runner-up taking office.
 *
 * Slots are natural keys (`slotKey`, `tablerKey`, `lawId`: unique partial indexes on `bills`); a free
 * regular slot is chosen from the session's read, so two tablers racing for the last slot meet on
 * the unique index and the loser retries against the new state (`PAPER_FULL` or the next slot).
 */

export const deputyKey = (n: number): string => `deputy:${n}`;
export const presidentKey = (n: number): string => `president:${n}`;
const REGULAR = ['r1', 'r2', 'r3'] as const;
const regularSlot = (slot: string, n: number) => `${slot}:${n}`;
const presidentSlot = (n: number, day: DayKey) => `president:${n}:${weekKey(day)}`;
const isRegular = (b: Pick<BillDoc, 'slotKey'>) => /^r[123]:/.test(b.slotKey);

// ---------------------------------------------------------------------------------------------
// Shared reads.
// ---------------------------------------------------------------------------------------------

/** The paper's state for `tableGate` and the Monday bills, read in the session. */
async function paperState(session: ClientSession | null, n: number, today: DayKey) {
  const s = <T>(q: { session(s: ClientSession | null): T }): T => q.session(session);
  const voting = await s(Bill.find({ termIndex: n, status: 'voting' })).lean<BillDoc[]>();
  const failed = await s(
    Bill.find({ status: 'failed', lawId: { $ne: null }, divideDay: { $gt: today - 7 } }, { lawId: 1 }),
  ).lean<Array<Pick<BillDoc, 'lawId'>>>();
  const regular = voting.filter(isRegular);
  return {
    voting,
    onPaper: voting.map((b) => b.lawId).filter((x): x is string => x !== null),
    failedWithinWeek: failed.map((b) => b.lawId!).filter(Boolean),
    regularOnPaper: regular.length,
    regularOpen: Math.max(0, PARLIAMENT.regularSlots - regular.length),
    freeSlots: REGULAR.filter((r) => !regular.some((b) => b.slotKey === regularSlot(r, n))),
  };
}

const projectionOf = (nation: Pick<NationDoc, 'laws'>): LawInForce[] =>
  (nation.laws?.inForce ?? []).map((l) => ({ lawId: l.lawId, fromDay: l.fromDay, toDay: l.toDay }));

/** Each party's home city in Unrest at the last control snapshot (design §4.3: its locals abstain). */
function unrestOf(content: GameContent, control: Pick<NationDoc['control'], 'cities'> | null): Record<FactionId, boolean> {
  const out = Object.fromEntries(FACTION_IDS.map((f) => [f, false])) as Record<FactionId, boolean>;
  for (const c of control?.cities ?? []) {
    const home = content.city(c.cityId)?.homeFactionId;
    if (home && c.unrest) out[home] = true;
  }
  return out;
}

/** The secretaries' lines on a bill (design §7.3, §10.2). A strike reverses the struck law's lines. */
function secretaryLinesOf(content: GameContent, b: Pick<BillDoc, 'kind' | 'lawId'>, presidentFaction: FactionId): Record<FactionId, LineVote> {
  if (b.kind === 'removal') return removalSecretaryLines(presidentFaction);
  const law = b.lawId ? content.law(b.lawId) : undefined;
  const lines = law?.secretaryLines ?? { vanguard: 'free', collective: 'free', alliance: 'free' };
  if (b.kind !== 'strike') return lines;
  const flip = (l: LineVote): LineVote => (l === 'for' ? 'against' : l === 'against' ? 'for' : 'free');
  return { vanguard: flip(lines.vanguard), collective: flip(lines.collective), alliance: flip(lines.alliance) };
}

function seatsOf(nation: Pick<NationDoc, 'government'>): Record<FactionId, { players: number; locals: number }> {
  const p = nation.government.parliament;
  return Object.fromEntries(
    FACTION_IDS.map((f) => [f, { players: p.players[f] ?? 0, locals: Math.max(0, (p.seats[f] ?? 0) - (p.players[f] ?? 0)) }]),
  ) as Record<FactionId, { players: number; locals: number }>;
}

/** Which office a member tables as (the President in their own slot first; a removal: deputy or Chair). */
async function tablerOf(
  session: ClientSession | null,
  c: Pick<CharacterDoc, '_id'>,
  today: DayKey,
  kind: BillKind,
): Promise<{ as: 'deputy' | 'chair' | 'president'; term: OfficeTermDoc } | null> {
  const find = (office: 'deputy' | 'chair' | 'president') =>
    session
      ? currentTerm(session, c._id as Types.ObjectId, office, today)
      : OfficeTerm.findOne({
          office,
          'holder.kind': 'player',
          'holder.characterId': c._id,
          fromDay: { $lte: today },
          toDay: { $gt: today },
          vacatedDay: null,
        }).lean<OfficeTermDoc>();
  if (kind !== 'removal') {
    const p = await find('president');
    if (p) return { as: 'president', term: p };
  }
  const d = await find('deputy');
  if (d) return { as: 'deputy', term: d };
  const ch = await find('chair');
  if (ch) return { as: 'chair', term: ch };
  return null;
}

const lawCard = (content: GameContent, id: string): LawCardView | null => {
  const l = content.law(id);
  if (!l) return null;
  const factional = isFactional(l);
  return {
    lawId: l.id,
    name: l.name,
    factionId: l.factionId,
    line: l.line,
    effectLine: l.effectLine,
    days: l.days,
    needed: billNeeded('law', factional) as 31 | 36,
    factional,
  };
};

// ---------------------------------------------------------------------------------------------
// The acts.
// ---------------------------------------------------------------------------------------------

/**
 * `parliament.table` (§7.2): a law, a strike, or a removal. The tabler's office re-read in the
 * session, `tableGate` against the paper read in the session, the slot, the bill, the PC (a deputy or
 * a Chair). A removal also writes `government.lastRemovalDay` under the seven-day guard.
 */
export function table(
  deps: NationActDeps<{ kind: 'law' | 'strike' | 'removal'; lawId: string | null; replacesLawId: string | null }>,
): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'parliament.table', async (x) => {
    const { c, session, today } = x;
    const nation = nationOf(x);
    const { kind } = deps.input;
    const n = termOf(today).index;
    const law = deps.input.lawId ? content.law(deps.input.lawId) : undefined;
    if (kind !== 'removal' && !law) throw new GameError('UNKNOWN_LAW', { lawId: deps.input.lawId }, 'BAD_REQUEST');
    if (deps.input.replacesLawId && !content.law(deps.input.replacesLawId))
      throw new GameError('UNKNOWN_LAW', { lawId: deps.input.replacesLawId }, 'BAD_REQUEST');
    const tabler = await tablerOf(session, c, today, kind);
    if (!tabler) throw new GameError('NOT_DEPUTY');
    const { as } = tabler;
    const tablerKey = as === 'president' ? null : `${c._id.toHexString()}:${n}:${kind === 'removal' ? 'removal' : 'bill'}`;
    const usedPower =
      as === 'president'
        ? !!(await Bill.exists({ slotKey: presidentSlot(n, today) }).session(session))
        : !!(await Bill.exists({ tablerKey }).session(session));
    if (kind === 'removal' && !nation.government.runnerUp) throw new GameError('REMOVAL_CLOSED', { why: 'noRunnerUp' });
    const paper = await paperState(session, n, today);
    const gate = tableGate({
      as,
      kind,
      day: today,
      pc: c.pc,
      usedPower,
      lawId: law?.id ?? null,
      replaces: deps.input.replacesLawId,
      inForce: projectionOf(nation),
      onPaper: paper.onPaper,
      failedWithinWeek: paper.failedWithinWeek,
      regularOpen: paper.regularOpen,
      lastRemovalDay: nation.government.lastRemovalDay,
    });
    if (gate) throw refusal(gate, gate.reason === 'NOT_ENOUGH_PC' ? { pc: c.pc, cost: gate.need } : {});
    const slotKey = as === 'president' ? presidentSlot(n, today) : regularSlot(paper.freeSlots[0]!, n);
    const factional = kind === 'law' && law ? isFactional(law) : false;
    const days = billDays(today);
    const tabledBy: BillTabler = { kind: 'player', as, characterId: c._id, name: c.name, factionId: c.factionId };
    const billId = new Types.ObjectId();
    const doc = {
      _id: billId,
      termIndex: n,
      kind,
      lawId: kind === 'removal' ? null : law!.id,
      replacesLawId: kind === 'law' ? deps.input.replacesLawId : null,
      overrideOf: null,
      slotKey,
      tablerKey,
      tabledBy,
      tabledAt: new Date(x.now),
      tabledDay: today,
      divideDay: days.divideDay,
      needed: billNeeded(kind, factional),
      factional,
      vetoable: kind === 'law',
      status: 'voting' as const,
      votes: [],
      lines: {},
      division: null,
      signatureDay: null,
      inForceFrom: null,
      vetoedAt: null,
      lawDocId: null,
    };
    // A concurrent tabler on the same slot, law or once-a-term key: E11000 → the request key retries
    // against the new state (the next free slot, `PAPER_FULL`, `LAW_ON_PAPER`, `ALREADY_TABLED`).
    await Bill.create([doc], { session });
    if (kind === 'removal') {
      const guard = await Nation.updateOne(
        {
          _id: 'republic',
          $or: [
            { 'government.lastRemovalDay': null },
            { 'government.lastRemovalDay': { $lte: today - PARLIAMENT.removal.gapDays } },
          ],
        },
        { $set: { 'government.lastRemovalDay': today } },
        { session },
      );
      if (guard.matchedCount === 0) throw new GameError('REMOVAL_TOO_SOON');
    }
    const cost = as === 'president' ? 0 : kind === 'removal' ? PARLIAMENT.removal.cost : DEPUTY.billCost;
    const updated = cost > 0 ? await spendPc(x, cost) : c;
    const view = await billView(content, updated, billId, x.now, session);
    if (kind === 'removal') {
      return nationResult(content, { ...x, c: updated }, {
        act: 'tableRemoval',
        idempotencyKey: deps.input.idempotencyKey,
        vars: { president: nation.government.president.holder.name, resultWeekday: weekdayName(days.divideDay) },
        until: dayStart(days.divideDay),
        at: dayStart(days.divideDay),
        knockOns: cost > 0 ? { pc: { before: c.pc, after: updated.pc } } : {},
        view: { kind: 'bill', bill: view! },
      });
    }
    return nationResult(content, { ...x, c: updated }, {
      act: 'tableBill',
      idempotencyKey: deps.input.idempotencyKey,
      vars: {
        law: kind === 'strike' ? `Striking out the ${law!.name}` : law!.name,
        lawLine: law!.line,
        needed: String(doc.needed),
        resultWeekday: weekdayName(days.divideDay),
      },
      until: dayStart(days.divideDay),
      at: dayStart(days.divideDay),
      knockOns: cost > 0 ? { pc: { before: c.pc, after: updated.pc } } : {},
      view: { kind: 'bill', bill: view! },
    });
  });
}

/** `parliament.vote` (§7.2): a deputy's For or Against, public and final, while the bill is open. */
export function vote(deps: NationActDeps<{ billId: string; vote: 'for' | 'against' }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'parliament.vote', async (x) => {
    const { c, session, today } = x;
    const deputy = await currentTerm(session, c._id, 'deputy', today);
    if (!deputy) throw new GameError('NOT_DEPUTY');
    const billId = Types.ObjectId.isValid(deps.input.billId) ? new Types.ObjectId(deps.input.billId) : null;
    const bill = billId ? await Bill.findById(billId).session(session).lean<BillDoc>() : null;
    if (!bill) throw new GameError('BILL_NOT_FOUND', {}, 'NOT_FOUND');
    if (bill.status !== 'voting') throw new GameError('BILL_CLOSED', { status: bill.status });
    if (bill.votes.some((v) => v.characterId.equals(c._id))) throw new GameError('ALREADY_VOTED', {}, 'CONFLICT');
    const pushed = await Bill.updateOne(
      { _id: bill._id, status: 'voting', 'votes.characterId': { $ne: c._id } },
      {
        $push: {
          votes: { characterId: c._id, name: c.name, factionId: c.factionId, vote: deps.input.vote, at: new Date(x.now) },
        },
      },
      { session },
    );
    if (pushed.matchedCount === 0) throw new GameError('BILL_CLOSED', {});
    const view = await billView(content, c, bill._id, x.now, session);
    return nationResult(content, x, {
      act: 'billVote',
      idempotencyKey: deps.input.idempotencyKey,
      vars: {
        vote: deps.input.vote === 'for' ? 'For' : 'Against',
        law: billTitle(content, bill),
        resultWeekday: weekdayName(bill.divideDay),
      },
      at: dayStart(bill.divideDay),
      view: { kind: 'bill', bill: view! },
    });
  });
}

/**
 * `parliament.veto` (T18; §5.5): the President, once a term, on the bill's signature day. The write is
 * filtered on `awaitingSignature`, so it serialises with the enactment at the next boundary; the
 * override is tabled in its own slot when it can still divide by term day 27, else the veto is final.
 */
export function veto(deps: NationActDeps<{ billId: string }>): Promise<PoliticalResult> {
  const { content } = deps;
  return runNationAct(deps, 'parliament.veto', async (x) => {
    const { c, session, today } = x;
    const term = await currentTerm(session, c._id, 'president', today);
    if (!term) throw new GameError('NOT_PRESIDENT');
    if (term.powers?.veto) throw new GameError('VETO_USED');
    const billId = Types.ObjectId.isValid(deps.input.billId) ? new Types.ObjectId(deps.input.billId) : null;
    const bill = billId ? await Bill.findById(billId).session(session).lean<BillDoc>() : null;
    if (!bill) throw new GameError('BILL_NOT_FOUND', {}, 'NOT_FOUND');
    if (!vetoOpen(bill, today, false)) throw new GameError('NOT_VETOABLE', { status: bill.status });
    const at = new Date(x.now);
    const stopped = await Bill.updateOne(
      { _id: bill._id, status: 'awaitingSignature', vetoable: true, signatureDay: today },
      { $set: { status: 'vetoed', vetoedAt: at } },
      { session },
    );
    if (stopped.matchedCount === 0) throw new GameError('NOT_VETOABLE', {});
    const used = await OfficeTerm.updateOne(
      { _id: term._id, 'powers.veto': { $exists: false } },
      { $set: { 'powers.veto': { billId: bill._id, day: today } } },
      { session },
    );
    if (used.matchedCount === 0) throw new GameError('VETO_USED');
    const fits = overrideFits(today);
    const days = billDays(today);
    if (fits) {
      await Bill.create(
        [
          {
            termIndex: bill.termIndex,
            kind: 'override',
            lawId: bill.lawId,
            replacesLawId: bill.replacesLawId,
            overrideOf: bill._id,
            slotKey: `override:${bill._id.toHexString()}`,
            tablerKey: null,
            tabledBy: bill.tabledBy,
            tabledAt: at,
            tabledDay: today,
            divideDay: days.divideDay,
            needed: PARLIAMENT.twoThirds,
            factional: bill.factional,
            vetoable: false,
            status: 'voting',
            votes: [],
            lines: {},
            division: null,
            signatureDay: null,
            inForceFrom: null,
            vetoedAt: null,
            lawDocId: null,
          },
        ],
        { session },
      );
    }
    const view = await billView(content, c, bill._id, x.now, session);
    return nationResult(content, x, {
      act: 'veto',
      idempotencyKey: deps.input.idempotencyKey,
      vars: {
        law: billTitle(content, bill),
        forVotes: String(bill.division?.for ?? 0),
        resultWeekday: weekdayName(days.divideDay),
      },
      at: fits ? dayStart(days.divideDay) : null,
      ...(fits ? {} : { next: 'Next: the veto is final; Parliament cannot vote it through before the term ends.' }),
      view: { kind: 'bill', bill: view! },
    });
  });
}

// ---------------------------------------------------------------------------------------------
// The views.
// ---------------------------------------------------------------------------------------------

const billTitle = (content: GameContent, b: Pick<BillDoc, 'kind' | 'lawId'>): string => {
  if (b.kind === 'removal') return 'The removal of the President';
  const name = b.lawId ? (content.law(b.lawId)?.name ?? b.lawId) : '';
  return b.kind === 'strike' ? `Striking out the ${name}` : name;
};

function stateOf(b: Pick<BillDoc, 'status'>): BillRowView['state'] {
  return b.status;
}

function rowOf(content: GameContent, b: BillDoc, me: CharacterDoc | null, nation: NationDoc, deputy: boolean): BillRowView {
  const law = b.lawId ? content.law(b.lawId) : undefined;
  const lines = secretaryLinesOf(content, b, nation.government.president.holder.factionId);
  const unrest = unrestOf(content, nation.control);
  const seats = seatsOf(nation);
  const localLines = Object.fromEntries(
    FACTION_IDS.map((f) => {
      const pf = b.votes.filter((v) => v.factionId === f && v.vote === 'for').length;
      const pa = b.votes.filter((v) => v.factionId === f && v.vote === 'against').length;
      const lv = localVote({ players: { for: pf, against: pa }, chairLine: b.lines?.[f]?.line ?? null, secretaryLine: lines[f], unrest: unrest[f] });
      return [f, { ...lv, n: seats[f].locals }];
    }),
  ) as BillRowView['localLines'];
  const mine = me ? b.votes.find((v) => v.characterId.equals(me._id)) : undefined;
  return {
    billId: b._id.toHexString(),
    kind: b.kind,
    law: law && b.kind !== 'strike' ? { id: law.id, name: law.name, line: law.line, effectLine: law.effectLine } : null,
    strikes: b.kind === 'strike' ? (law?.name ?? b.lawId) : null,
    replaces: b.replacesLawId ? (content.law(b.replacesLawId)?.name ?? b.replacesLawId) : null,
    tabledBy: { name: b.tabledBy.name, factionId: b.tabledBy.factionId, kind: b.tabledBy.kind },
    tabledDay: b.tabledDay,
    until: dayStart(b.divideDay),
    divideDay: b.divideDay,
    needed: b.needed,
    factional: b.factional,
    counts: {
      for: b.votes.filter((v) => v.vote === 'for').length,
      against: b.votes.filter((v) => v.vote === 'against').length,
    },
    localLines,
    state: stateOf(b),
    you: { canVote: deputy && b.status === 'voting' && !mine, vote: mine?.vote ?? null },
  };
}

async function readNation(session: ClientSession | null): Promise<NationDoc> {
  const n = await (session ? Nation.findById('republic').session(session) : Nation.findById('republic')).lean<NationDoc>();
  if (!n) throw new GameError('NATION_NOT_READY', {}, 'CONFLICT');
  return n;
}

/** `parliament.bill` (§8.3): the bill, its public votes, the live chain or the division. */
export async function billView(
  content: GameContent,
  c: CharacterDoc,
  billId: Types.ObjectId,
  now: number,
  session: ClientSession | null = null,
): Promise<BillPageView | null> {
  const today = dayKey(now);
  const b = await (session ? Bill.findById(billId).session(session) : Bill.findById(billId)).lean<BillDoc>();
  if (!b) return null;
  const nation = await readNation(session);
  const deputy = !!(await tablerTerm(session, c, today, 'deputy'));
  const president = await tablerTerm(session, c, today, 'president');
  const chair = await tablerTerm(session, c, today, 'chair');
  const law = b.lawId ? content.law(b.lawId) : undefined;
  const appliesTo = law?.effects.find((e) => e.appliesTo && e.appliesTo !== 'all')?.appliesTo;
  const lines = secretaryLinesOf(content, b, nation.government.president.holder.factionId);
  const runnerUp = nation.government.runnerUp;
  return {
    ...rowOf(content, b, c, nation, deputy),
    appliesTo: law && appliesTo && appliesTo !== 'all' ? { kind: appliesTo, factionId: law.factionId } : null,
    days: law && b.kind !== 'strike' && b.kind !== 'removal' ? law.days : null,
    removal: b.kind === 'removal' ? { president: nation.government.president.holder.name, runnerUp: runnerUp?.holder.name ?? null } : null,
    votes: b.votes.map((v) => ({ name: v.name, factionId: v.factionId, vote: v.vote })),
    division: b.division,
    chairLine: chair ? { line: b.lines?.[c.factionId]?.line ?? null, secretaryLine: lines[c.factionId] } : null,
    signature: president
      ? {
          today: b.status === 'awaitingSignature' && b.signatureDay === today,
          canVeto: vetoOpen(b, today, !!president.powers?.veto),
          vetoUsed: !!president.powers?.veto,
        }
      : null,
    inForceFrom: b.inForceFrom,
  };
}

async function tablerTerm(session: ClientSession | null, c: Pick<CharacterDoc, '_id'>, today: DayKey, office: 'deputy' | 'chair' | 'president') {
  const q = OfficeTerm.findOne({
    office,
    'holder.kind': 'player',
    'holder.characterId': c._id,
    fromDay: { $lte: today },
    toDay: { $gt: today },
    vacatedDay: null,
  });
  return (session ? q.session(session) : q).lean<OfficeTermDoc>();
}

export function termLine(today: DayKey): TermLineView {
  const t = termOf(today);
  const phase = nationalPhase(today);
  const N = TERM_DAYS.nation;
  const endOf: Record<typeof phase, number | null> = {
    none: null,
    names: t.fromDay + N.pickFrom,
    pick: t.fromDay + N.votesFrom,
    voting: t.fromDay + N.countDay,
    result: t.toDay,
  };
  const what = phase === 'none' ? 'nationNames' : phase === 'names' ? 'pick' : phase === 'pick' ? 'votes' : phase === 'voting' ? 'count' : 'office';
  const end = endOf[phase];
  return {
    termIndex: t.index,
    termDay: t.termDay,
    phase,
    until: end === null ? null : dayStart(end),
    next: { what, day: nextDate(today + (phase === 'none' ? 0 : 1), what) },
  };
}

/** `parliament.chamber` (§8.3): the seats, the President, the order paper, the last ten decided, the table card. */
export async function chamberView(deps: { user: SessionUser; content: GameContent; now: () => number }): Promise<ChamberView> {
  const { content } = deps;
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, content, now);
  const today = dayKey(now);
  const nation = await readNation(null);
  const n = termOf(today).index;
  const open = await Bill.find({ termIndex: n, status: { $in: ['voting', 'awaitingSignature'] } }).sort({ tabledAt: 1 }).lean<BillDoc[]>();
  const decided = await Bill.find({ status: { $nin: ['voting', 'awaitingSignature'] } }).sort({ divideDay: -1, tabledAt: -1 }).limit(10).lean<BillDoc[]>();
  const deputy = !!(await tablerTerm(null, c, today, 'deputy'));
  const chair = !!(await tablerTerm(null, c, today, 'chair'));
  const president = !!(await tablerTerm(null, c, today, 'president'));
  const tabler = await tablerOf(null, c, today, 'law');
  let tableCard: ChamberView['table'] = null;
  if (tabler) {
    const paper = await paperState(null, n, today);
    const tablerKey = tabler.as === 'president' ? null : `${c._id.toHexString()}:${n}:bill`;
    const usedPower =
      tabler.as === 'president' ? !!(await Bill.exists({ slotKey: presidentSlot(n, today) })) : !!(await Bill.exists({ tablerKey }));
    const cost = tabler.as === 'president' ? 0 : DEPUTY.billCost;
    const gate = tableGate({
      as: tabler.as,
      kind: 'law',
      day: today,
      pc: c.pc,
      usedPower,
      lawId: null,
      replaces: null,
      inForce: [],
      onPaper: [],
      failedWithinWeek: [],
      regularOpen: paper.regularOpen,
      lastRemovalDay: null,
    });
    tableCard = { as: tabler.as, cost, ok: !gate, why: gate?.reason ?? null };
  }
  const seats = seatsOf(nation);
  const outcomeOf = (b: BillDoc): ChamberView['decided'][number]['outcome'] =>
    b.status === 'inForce' ? 'passed' : (b.status as ChamberView['decided'][number]['outcome']);
  const pres = nation.government.president;
  return {
    termIndex: n,
    seats: Object.fromEntries(FACTION_IDS.map((f) => [f, { seats: seats[f].players + seats[f].locals, players: seats[f].players }])) as ChamberView['seats'],
    locals: FACTION_IDS.reduce((s, f) => s + seats[f].locals, 0),
    president: { name: pres.holder.name, factionId: pres.holder.factionId, figure: pres.holder.kind === 'npc' },
    term: termLine(today),
    bills: [...open]
      .sort((a, b) => Number(b.slotKey.startsWith('president')) - Number(a.slotKey.startsWith('president')))
      .map((b) => rowOf(content, b, c, nation, deputy)),
    decided: decided.map((b) => ({
      billId: b._id.toHexString(),
      day: b.divideDay,
      law: b.lawId ? (content.law(b.lawId)?.name ?? b.lawId) : null,
      kind: b.kind,
      outcome: outcomeOf(b),
      for: b.division?.for ?? 0,
      against: b.division?.against ?? 0,
    })),
    table: tableCard,
    you: { deputy, chair, president },
  };
}

/** `parliament.catalogue` (§8.3): the thirteen laws, each with the party lines and why it cannot be tabled now. */
export async function catalogueView(deps: { user: SessionUser; content: GameContent; now: () => number }): Promise<CatalogueView> {
  const { content } = deps;
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, content, now);
  const today = dayKey(now);
  const nation = await readNation(null);
  const n = termOf(today).index;
  const tabler = await tablerOf(null, c, today, 'law');
  const paper = await paperState(null, n, today);
  const inForce = lawsOnDay(projectionOf(nation), today);
  const usedPower = tabler
    ? tabler.as === 'president'
      ? !!(await Bill.exists({ slotKey: presidentSlot(n, today) }))
      : !!(await Bill.exists({ tablerKey: `${c._id.toHexString()}:${n}:bill` }))
    : false;
  const cost = tabler?.as === 'president' ? 0 : DEPUTY.billCost;
  return {
    as: tabler?.as ?? null,
    cost,
    affordable: c.pc >= cost,
    atCap: inForce.length >= PARLIAMENT.maxInForce,
    inForce: inForce.map((l) => ({ ...lawCard(content, l.lawId)!, toDay: l.toDay, daysLeft: l.toDay - today })),
    laws: content.laws.map((l) => {
      const gate = tabler
        ? tableGate({
            as: tabler.as,
            kind: 'law',
            day: today,
            pc: c.pc,
            usedPower,
            lawId: l.id,
            replaces: inForce[0]?.lawId ?? null,
            inForce,
            onPaper: paper.onPaper,
            failedWithinWeek: paper.failedWithinWeek,
            regularOpen: paper.regularOpen,
            lastRemovalDay: null,
          })
        : { reason: 'NOT_DEPUTY' };
      return { ...lawCard(content, l.id)!, lines: l.secretaryLines, available: !gate, why: gate?.reason ?? null };
    }),
  };
}

/** `parliament.bloc` (§8.3): a party's seats, its player deputies by list place, its named locals. */
export async function blocView(deps: { user: SessionUser; content: GameContent; now: () => number }, factionId: FactionId): Promise<BlocListView> {
  const { content } = deps;
  const now = deps.now();
  await loadCharacter(deps.user, content, now);
  const today = dayKey(now);
  const nation = await readNation(null);
  const n = nation.government.parliament.termIndex;
  const players = await OfficeTerm.find({
    office: 'deputy',
    councilKey: deputyKey(n),
    factionId,
    'holder.kind': 'player',
    fromDay: { $lte: today },
    toDay: { $gt: today },
    vacatedDay: null,
  })
    .sort({ seat: 1 })
    .lean<OfficeTermDoc[]>();
  const seats = seatsOf(nation)[factionId];
  const named = content.localDeputies(factionId) ?? [];
  const shown = named.slice(0, Math.min(named.length, seats.locals));
  return {
    factionId,
    seats: seats.players + seats.locals,
    players: players.map((p) => ({ name: p.holder.name, place: p.seat })),
    locals: { named: shown.map((d) => ({ name: d.name, who: d.who })), more: Math.max(0, seats.locals - shown.length) },
  };
}

/** `parliament.bill` for the router. */
export async function getBill(deps: { user: SessionUser; content: GameContent; now: () => number }, billId: string): Promise<BillPageView> {
  const now = deps.now();
  const { doc } = await loadCharacter(deps.user, deps.content, now);
  const view = Types.ObjectId.isValid(billId) ? await billView(deps.content, doc, new Types.ObjectId(billId), now) : null;
  if (!view) throw new GameError('BILL_NOT_FOUND', {}, 'NOT_FOUND').toTRPC();
  return view;
}

// ---------------------------------------------------------------------------------------------
// The nation's day: divisions, enactments, the Monday bills, the clerk's motion, the removal.
// ---------------------------------------------------------------------------------------------

/** Step 'divisions' (§3.2): every bill dividing at `d`, the locals by the chain. */
async function divisionsDue(ctx: NationBoundaryCtx): Promise<void> {
  const { session, d, content } = ctx;
  const bills = await Bill.find({ status: 'voting', divideDay: d }).sort({ tabledAt: 1 }).session(session).lean<BillDoc[]>();
  for (const b of bills) {
    const seats = seatsOf({ government: ctx.government });
    const unrest = Object.fromEntries(
      FACTION_IDS.map((f) => [f, ctx.control.cities.some((c) => c.unrest && content.city(c.cityId)?.homeFactionId === f)]),
    ) as Record<FactionId, boolean>;
    const chairLines = Object.fromEntries(
      FACTION_IDS.filter((f) => b.lines?.[f]).map((f) => [f, b.lines[f]!.line]),
    ) as Partial<Record<FactionId, LineVote>>;
    const division = divideBill({
      needed: b.needed,
      seats,
      votes: b.votes.map((v) => ({ factionId: v.factionId, vote: v.vote })),
      chairLines,
      secretaryLines: secretaryLinesOf(content, b, ctx.government.president.holder.factionId),
      unrest,
    });
    const law = b.lawId ? content.law(b.lawId) : undefined;
    const lawName = law?.name ?? '';
    let set: Partial<BillDoc> = { division };
    if (b.kind === 'law' || b.kind === 'override') {
      if (division.passed) set = { ...set, status: 'awaitingSignature', signatureDay: d, inForceFrom: d + 1 };
      else {
        set = { ...set, status: 'failed' };
        ctx.news.push(
          newsItem(d, 'nl.law-failed', 2, null, { law: lawName, forVotes: division.for, needed: b.needed, by: b.tabledBy.name }),
        );
      }
    } else if (b.kind === 'strike') {
      if (division.passed) {
        set = { ...set, status: 'struck' };
        const row = ctx.laws.inForce.find((l) => l.lawId === b.lawId);
        if (row) {
          row.toDay = Math.min(row.toDay, d + 1);
          await LawModel.updateOne(
            { _id: row.docId, endedDay: null },
            { $set: { endedDay: d + 1, endedBy: 'struck' } },
            { session },
          );
        }
        ctx.news.push(newsItem(d, 'nl.law-struck', 1, null, { law: lawName, forVotes: division.for }));
      } else {
        set = { ...set, status: 'failed' };
        ctx.news.push(newsItem(d, 'nl.law-failed', 2, null, { law: `Striking out the ${lawName}`, forVotes: division.for, needed: b.needed, by: b.tabledBy.name }));
      }
    } else if (b.kind === 'removal') {
      if (division.passed) {
        set = { ...set, status: 'removed' };
        await removePresident(ctx, division.for);
      } else {
        set = { ...set, status: 'survived' };
        ctx.news.push(newsItem(d, 'nl.survived', 0, null, { president: ctx.government.president.holder.name, forVotes: division.for }));
      }
    }
    await Bill.updateOne({ _id: b._id, status: 'voting' }, { $set: set }, { session });
  }
}

/** Step 'enactments' (§3.2): a passed law comes into force at `d` unless the President vetoed it. */
async function enactmentsDue(ctx: NationBoundaryCtx): Promise<void> {
  const { session, d, content } = ctx;
  const bills = await Bill.find({ status: 'awaitingSignature', inForceFrom: d }).sort({ tabledAt: 1 }).session(session).lean<BillDoc[]>();
  for (const b of bills) {
    const law = b.lawId ? content.law(b.lawId) : undefined;
    if (!law) continue;
    const lawDocId = new Types.ObjectId();
    // Filtered on `awaitingSignature`: a veto that committed first leaves nothing to enact.
    const claimed = await Bill.updateOne(
      { _id: b._id, status: 'awaitingSignature' },
      { $set: { status: 'inForce', lawDocId } },
      { session },
    );
    if (claimed.matchedCount === 0) continue;
    const projection = ctx.laws.inForce.map((l) => ({ lawId: l.lawId, fromDay: l.fromDay, toDay: l.toDay }));
    const { start, ends } = enact({ inForce: projection, lawId: law.id, days: law.days, replaces: b.replacesLawId, day: d });
    for (const end of ends) {
      const idx = ctx.laws.inForce.findIndex((l) => l.lawId === end.lawId && l.fromDay <= d && l.toDay > d);
      if (idx < 0) continue;
      const row = ctx.laws.inForce[idx]!;
      ctx.laws.inForce.splice(idx, 1);
      ctx.laws.history.push({ ...row, toDay: d });
      await LawModel.updateOne(
        { _id: row.docId, endedDay: null },
        { $set: { endedDay: d, endedBy: end.why === 'renewed' ? 'renewed' : 'replaced' } },
        { session },
      );
    }
    const overridden = b.kind === 'override';
    try {
      await LawModel.create(
        [
          {
            _id: lawDocId,
            lawId: law.id,
            billId: b._id,
            termIndex: b.termIndex,
            fromDay: start.fromDay,
            toDay: start.toDay,
            endedDay: null,
            endedBy: null,
            tabledBy: b.tabledBy,
            passed: { for: b.division?.for ?? 0, against: b.division?.against ?? 0, overridden },
          },
        ],
        { session },
      );
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }
    ctx.laws.inForce.push({
      docId: lawDocId,
      ...start,
      by: b.tabledBy.name,
      passed: { for: b.division?.for ?? 0, against: b.division?.against ?? 0, day: b.divideDay },
    });
    // The President's pledges kept (design §6.1).
    const pres = ctx.government.president;
    if (pres.termId) {
      await OfficeTerm.updateOne(
        { _id: pres.termId, pledges: { $elemMatch: { lawId: law.id, keptDay: null } } },
        { $set: { 'pledges.$.keptDay': d } },
        { session },
      );
    }
    ctx.news.push(
      overridden
        ? newsItem(d, 'nl.law-overridden', 1, null, { law: law.name, forVotes: b.division?.for ?? 0, days: law.days })
        : newsItem(d, 'nl.law-in-force', 1, null, { law: law.name, lawLine: law.line, days: law.days, by: b.tabledBy.name }),
    );
  }
}

/** A bill tabled by the game (a figure President, a secretary, the clerk). */
function gameBill(
  ctx: NationBoundaryCtx,
  i: { kind: BillKind; lawId: string | null; slotKey: string; tabledBy: BillTabler; needed: 31 | 36 | 40; factional: boolean },
) {
  const days = billDays(ctx.d);
  return {
    termIndex: termOf(ctx.d).index,
    kind: i.kind,
    lawId: i.lawId,
    replacesLawId: null,
    overrideOf: null,
    slotKey: i.slotKey,
    tablerKey: null,
    tabledBy: i.tabledBy,
    tabledAt: new Date(ctx.now),
    tabledDay: ctx.d,
    divideDay: days.divideDay,
    needed: i.needed,
    factional: i.factional,
    vetoable: i.kind === 'law',
    status: 'voting' as const,
    votes: [],
    lines: {},
    division: null,
    signatureDay: null,
    inForceFrom: null,
    vetoedAt: null,
    lawDocId: null,
  };
}

/** The cap rule for a game-tabled law: at five in force, the soonest-ending is named (§22.1 Q15). */
const capReplaces = (inForce: readonly LawInForce[], d: DayKey): string | null => {
  const live = lawsOnDay(inForce, d);
  if (live.length < PARLIAMENT.maxInForce) return null;
  return [...live].sort((a, b) => a.toDay - b.toDay || a.fromDay - b.fromDay)[0]!.lawId;
};

/** Step 'monday' (design §5.2, §6.5, §7.3): a figure President's bill, then one secretary's bill. */
async function mondayBills(ctx: NationBoundaryCtx): Promise<void> {
  if (!ctx.work.monday) return;
  const { session, d, content } = ctx;
  const n = termOf(d).index;
  const projection = ctx.laws.inForce.map((l) => ({ lawId: l.lawId, fromDay: l.fromDay, toDay: l.toDay }));
  const factions = Object.fromEntries(
    (await FactionState.find({}).session(session).lean<FactionStateDoc[]>()).map((f) => [f._id, f]),
  ) as Record<FactionId, FactionStateDoc>;
  // A party's figure as President tables its preferred laws on Mondays (its own slot).
  const pres = ctx.government.president;
  if (pres.holder.kind === 'npc' && !(await Bill.exists({ slotKey: presidentSlot(n, d) }).session(session))) {
    const f = pres.holder.factionId;
    const paper = await paperState(session, n, d);
    const pick = figureBill({
      preferred: content.faction(f).preferredLaws ?? [],
      pointer: factions[f]?.secretaryBillIndex ?? 0,
      inForce: projection,
      onPaper: paper.onPaper,
      failedWithinWeek: paper.failedWithinWeek,
      day: d,
    });
    const law = pick ? content.law(pick.lawId) : undefined;
    if (pick && law) {
      const factional = isFactional(law);
      await Bill.create(
        [
          {
            ...gameBill(ctx, {
              kind: 'law',
              lawId: law.id,
              slotKey: presidentSlot(n, d),
              tabledBy: { kind: 'figure', as: 'president', npcId: pres.holder.npcId, name: pres.holder.name, factionId: f },
              needed: billNeeded('law', factional),
              factional,
            }),
            replacesLawId: capReplaces(projection, d),
          },
        ],
        { session },
      );
      await FactionState.updateOne({ _id: f }, { $set: { secretaryBillIndex: pick.pointer } }, { session });
      factions[f] = { ...factions[f]!, secretaryBillIndex: pick.pointer };
      ctx.news.push(newsItem(d, 'nl.law-tabled', 2, null, { law: law.name, lawLine: law.line, by: pres.holder.name, until: dayStart(d + 4), needed: billNeeded('law', factional) }));
    }
  }
  // One secretary's bill a week, for a party with no player Chair and no player deputy.
  const paper = await paperState(session, n, d);
  // The step runs on Mondays: a secretary's bill since last Monday's (exclusive) is this week's.
  const tabledThisWeek = !!(await Bill.exists({ 'tabledBy.kind': 'secretary', tabledDay: { $gt: d - 7 } }).session(session));
  const draw = drawOrderOf(createRng(createHash('sha256').update(`secretary:${d}`).digest('hex').slice(0, 32)));
  const pick = secretaryBill({
    blocs: FACTION_IDS.map((f) => ({
      factionId: f,
      seats: ctx.government.parliament.seats[f] ?? 0,
      playerChair: !!factions[f]?.chair,
      playerDeputies: ctx.government.parliament.players[f] ?? 0,
      preferred: content.faction(f).preferredLaws ?? [],
      pointer: factions[f]?.secretaryBillIndex ?? 0,
    })),
    regularOnPaper: paper.regularOnPaper,
    inForce: projection,
    onPaper: paper.onPaper,
    failedWithinWeek: paper.failedWithinWeek,
    day: d,
    tabledThisWeek,
    drawOrder: draw,
  });
  const law = pick ? content.law(pick.lawId) : undefined;
  if (pick && law && paper.freeSlots.length > 0) {
    const sec = content.faction(pick.factionId).secretary;
    const factional = isFactional(law);
    await Bill.create(
      [
        {
          ...gameBill(ctx, {
            kind: 'law',
            lawId: law.id,
            slotKey: regularSlot(paper.freeSlots[0]!, n),
            tabledBy: { kind: 'secretary', as: null, npcId: sec.npcId, name: sec.addressedAs, factionId: pick.factionId },
            needed: billNeeded('law', factional),
            factional,
          }),
          replacesLawId: capReplaces(projection, d),
        },
      ],
      { session },
    );
    await FactionState.updateOne({ _id: pick.factionId }, { $set: { secretaryBillIndex: pick.pointer } }, { session });
    ctx.news.push(newsItem(d, 'nl.law-tabled', 2, null, { law: law.name, lawLine: law.line, by: sec.addressedAs, until: dayStart(d + 4), needed: billNeeded('law', factional) }));
  }
}

/**
 * Test seam for the dev panel (§8.6 `POST /api/test/nation { secretaryBill: true }`, lane 1's T21):
 * the Monday bills now, outside a Monday, in their own transaction against the nation as settled
 * (a figure President's bill when the President's slot is free this week, then a secretary's bill
 * by the same rule). Returns the bills tabled.
 */
export async function mondayBillsNow(content: GameContent, now: number): Promise<number> {
  return inTransaction(async (session) => {
    const nation = await Nation.findById('republic').session(session).lean<NationDoc>();
    if (!nation) throw new GameError('NATION_NOT_READY', {}, 'CONFLICT');
    const before = await Bill.countDocuments({ status: 'voting' }).session(session);
    const d = dayKey(now);
    const ctx = {
      content,
      d,
      now,
      session,
      nation,
      factions: {} as NationBoundaryCtx['factions'],
      cities: new Map(),
      districts: [],
      control: nation.control as unknown as NationBoundaryCtx['control'],
      work: { monday: true } as NationBoundaryCtx['work'],
      bootstrap: false,
      government: nation.government,
      laws: nation.laws,
      set: {},
      news: [],
    } as NationBoundaryCtx;
    await mondayBills(ctx);
    if (ctx.news.length) await Nation.updateOne({ _id: 'republic' }, { $push: { news: { $each: ctx.news } } }, { session });
    return (await Bill.countDocuments({ status: 'voting' }).session(session)) - before;
  });
}

/** Step 'clerk' (T18; design §10.2, §22.1 Q11): the clerk's motion when the President's party's control share is under 25 %. */
async function clerkMotion(ctx: NationBoundaryCtx): Promise<void> {
  const { d, session } = ctx;
  const n = termOf(d).index;
  const g = ctx.government;
  if (!g.runnerUp) return;
  const due = autoRemovalDue({
    controlShare: ctx.control.controlShare[g.president.holder.factionId] ?? 0,
    day: d,
    lastRemovalDay: g.lastRemovalDay,
    usedThisTerm: g.autoRemovalTerm === n,
  });
  if (!due) return;
  const slotKey = `clerk:${n}:${d}`;
  if (await Bill.exists({ slotKey }).session(session)) return;
  await Bill.create(
    [
      gameBill(ctx, {
        kind: 'removal',
        lawId: null,
        slotKey,
        tabledBy: { kind: 'clerk', as: null, name: 'The clerk of the chamber', factionId: null },
        needed: PARLIAMENT.twoThirds,
        factional: false,
      }),
    ],
    { session },
  );
  g.lastRemovalDay = d;
  g.autoRemovalTerm = n;
}

/**
 * T18 (§8.2 `removePresident`; §22.1 Q13): the runner-up takes office at the division. A player
 * runner-up's deputy term is vacated and their seat passes to the next unseated name on the party's
 * list (a player's new deputy term, else a local); the removed player's term is vacated, not
 * completed. The next runner-up is the next score that has not held the office this term.
 */
export async function removePresident(ctx: NationBoundaryCtx, forVotes: number): Promise<void> {
  const { session, d, content } = ctx;
  const g = ctx.government;
  const old = g.president;
  const next = g.runnerUp;
  if (!next) return;
  const n = termOf(d).index;
  if (old.termId) {
    await OfficeTerm.updateOne({ _id: old.termId, vacatedDay: null }, { $set: { vacatedDay: d } }, { session });
  }
  const election = await NationalElection.findOne({ status: 'seated', termIndex: n - 1 }).session(session).lean<NationalElectionDoc>();
  const result = (election?.result ?? null) as NationalResult | null;
  let termId: Types.ObjectId | null = null;
  if (next.holder.kind === 'player') {
    const cand = result?.candidates.find((c) => c.factionId === next.holder.factionId);
    termId = new Types.ObjectId();
    await OfficeTerm.create(
      [
        {
          _id: termId,
          office: 'president',
          cityId: 'nation',
          councilKey: presidentKey(n),
          electionId: `nation:${n - 1}`,
          seat: 1,
          factionId: next.holder.factionId,
          districtId: null,
          vacatedDay: null,
          fromDay: d,
          toDay: termOf(d).toDay,
          holder: { kind: 'player', characterId: next.holder.characterId, name: next.holder.name },
          place: 2,
          total: 0,
          completed: false,
          frontPageSeenAt: null,
          via: 'runnerUp',
          pledges: (cand?.pledges ?? []).map((lawId) => ({ lawId, keptDay: null })),
        },
      ],
      { session },
    );
    // Their deputy seat passes down the party's list (§22.1 Q13).
    const seat = await OfficeTerm.findOneAndUpdate(
      { office: 'deputy', councilKey: deputyKey(n), 'holder.characterId': next.holder.characterId, vacatedDay: null },
      { $set: { vacatedDay: d } },
      { session, returnDocument: 'after', lean: true },
    );
    if (seat) {
      const list = result?.lists[next.holder.factionId] ?? [];
      const seatedIds = new Set(
        (
          await OfficeTerm.find({ office: 'deputy', councilKey: deputyKey(n), factionId: next.holder.factionId })
            .session(session)
            .lean<OfficeTermDoc[]>()
        ).map((t) => t.holder.characterId?.toHexString()),
      );
      const heir = list.find((l) => l.kind === 'player' && l.characterId && !seatedIds.has(l.characterId) && l.characterId !== next.holder.characterId?.toHexString());
      if (heir) {
        await OfficeTerm.create(
          [
            {
              office: 'deputy',
              cityId: 'nation',
              councilKey: deputyKey(n),
              electionId: `nation:${n - 1}`,
              seat: seat.seat,
              factionId: next.holder.factionId,
              districtId: null,
              vacatedDay: null,
              fromDay: d,
              toDay: termOf(d).toDay,
              holder: { kind: 'player', characterId: new Types.ObjectId(heir.characterId), name: heir.name },
              place: heir.place,
              total: 0,
              completed: false,
              frontPageSeenAt: null,
              via: 'runnerUp',
            },
          ],
          { session },
        );
      } else {
        g.parliament.players[next.holder.factionId] = Math.max(0, (g.parliament.players[next.holder.factionId] ?? 0) - 1);
      }
    }
  }
  g.president = { holder: next.holder, termId, since: d, consecutive: 1, via: 'runnerUp' };
  // The next runner-up: the next score that has not held the office this term.
  const held = new Set([old.holder.factionId, next.holder.factionId]);
  const after = (result?.order ?? []).find((f) => !held.has(f));
  const cand = after ? result?.candidates.find((c) => c.factionId === after) : undefined;
  g.runnerUp = cand ? { holder: holderOfCandidate(cand), termId: null } : null;
  const month = election ? monthOf(election.countDay) : '';
  ctx.news.push(newsItem(d, 'nl.removed', 0, null, { president: old.holder.name, forVotes, successor: next.holder.name, month }));
  void content;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthOf = (day: DayKey): string => MONTHS[new Date(dayStart(day) + 12 * 3600_000).getUTCMonth()]!;

/** The national count's stored result (T17), as the removal reads it. */
export interface NationalResult {
  order: FactionId[];
  candidates: Array<{ factionId: FactionId; key: string; kind: 'player' | 'npc'; characterId?: string; npcId?: string; name: string; pledges: string[] }>;
  lists: Record<FactionId, Array<{ key: string; name: string; kind: 'player' | 'npc'; characterId?: string; seated: boolean; place: number }>>;
}

export function holderOfCandidate(c: NationalResult['candidates'][number]): NationDoc['government']['president']['holder'] {
  return c.kind === 'player'
    ? { kind: 'player', characterId: new Types.ObjectId(c.characterId!), name: c.name, factionId: c.factionId }
    : { kind: 'npc', npcId: c.npcId!, name: c.name, factionId: c.factionId };
}

/** The handlers this file adds to the nation's day (`nationSteps.ts`). */
export const parliamentSteps = { divisions: [divisionsDue], enactments: [enactmentsDue], monday: [mondayBills], clerk: [clerkMotion] } as const;

/** Lapse the old term's open bills at term day 0 (called by the take-office step, T17). */
export async function lapseBills(ctx: NationBoundaryCtx, oldTerm: number): Promise<void> {
  await Bill.updateMany({ termIndex: oldTerm, status: 'voting' }, { $set: { status: 'lapsed' } }, { session: ctx.session });
}

export type { LawDoc };
