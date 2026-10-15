import type { GameContent } from '@irongate/content';
import { Bill, Candidacy, Character, FactionState, Nation, OfficeTerm, Petition } from '@irongate/db';
import type { BillDoc, CandidacyDoc, CharacterDoc, FactionStateDoc, NationDoc, OfficeTermDoc, PetitionDoc } from '@irongate/db';
import { FACTION_IDS, chairPhase, dayKey, dayStart, nationalPhase, termOf } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { randomUUID } from 'node:crypto';
import { officeTitle } from '../services/nationEdition';
import { nationDayHooks } from '../services/nationDay';
import { mondayBillsNow } from '../services/parliamentService';
import { residenceCityId } from '../services/residence';
import { createCaller } from '../trpc/router';
import { recordOffices, seatOffice, termTarget } from './nation';
import { DevRefusal } from './risk';
import { createTestMembers } from './together';
import type { DevNationStatus } from './types';

/**
 * Slice 7 T21 (docs/tech/slice-7.md §8.7): the dev panel's nation buttons and status block. Each
 * button calls the same writers as the hooks (`/api/test/term`, `/nation`, `/office`, lane 2's
 * `/parliament`), then the panel's settle. The panel holds no rule.
 */

export type NationDevAction =
  | 'termDay'
  | 'office'
  | 'ladder'
  | 'secretaryBill'
  | 'deputies'
  | 'deputiesVote'
  | 'lead'
  // Phase C, lane Y: lane 2's ballots and petitions as buttons (three test members each, through the
  // real procedures, as `/api/test/ballots` and `/api/test/petition`).
  | 'residentsSign'
  | 'chairBackers'
  | 'chairVotes'
  | 'nationVotes'
  | 'chairPetitionSign';

export const NATION_DEV_ACTIONS: readonly NationDevAction[] = [
  'termDay',
  'office',
  'ladder',
  'secretaryBill',
  'deputies',
  'deputiesVote',
  'lead',
  'residentsSign',
  'chairBackers',
  'chairVotes',
  'nationVotes',
  'chairPetitionSign',
];

const TERM_DAYS_OFFERED = [0, 9, 11, 14, 19, 21, 23, 27];

const callerAs = (content: GameContent, c: CharacterDoc, now: () => number) =>
  createCaller({ user: { id: c.userId, name: c.name }, content, now } as never);

/**
 * Three new test members (Rank 3, the caller's copies: same town, same residence) each run `act`;
 * the result counts the acts that went through and names the first refusal.
 */
async function asTestMembers(
  content: GameContent,
  c: CharacterDoc,
  n: number,
  now: number,
  act: (m: CharacterDoc) => Promise<unknown>,
): Promise<string> {
  const made = await createTestMembers(content, c, { n, rank: 3 } as never, now);
  let ok = 0;
  let refused: string | null = null;
  for (const m of made) {
    const doc = await Character.findById(m.characterId).lean<CharacterDoc>();
    if (!doc) continue;
    try {
      await act(doc);
      ok += 1;
    } catch (err) {
      const e = err as { cause?: { reason?: string }; message?: string };
      refused ??= e.cause?.reason ?? e.message ?? 'refused';
    }
  }
  return `${ok} of ${made.length}${refused ? ` (refused: ${refused})` : ''}`;
}

/** One nation button; `moved` asks the panel to run the days for the new clock. */
export async function nationAction(
  content: GameContent,
  c: CharacterDoc,
  action: NationDevAction,
  target: unknown,
  clock: { now: () => number; advance: (ms: number) => Promise<void> },
): Promise<{ did: string; moved: boolean }> {
  const now = clock.now();
  const today = dayKey(now);
  switch (action) {
    case 'termDay': {
      const n = Number(target);
      if (!TERM_DAYS_OFFERED.includes(n)) throw new DevRefusal(400, `target is a term day: ${TERM_DAYS_OFFERED.join(', ')}`);
      const day = termTarget(today, n);
      const at = dayStart(day) + 9 * 3_600_000;
      if (at > now) await clock.advance(at - now);
      return { did: `Term day ${n}`, moved: true };
    }
    case 'office': {
      const office = String(target) as 'governor' | 'chair' | 'deputy' | 'president';
      if (!['governor', 'chair', 'deputy', 'president'].includes(office))
        throw new DevRefusal(400, 'target is governor, chair, deputy or president');
      // *Make me Governor here*: the council city the character is in, else the residence.
      const here = content.city(c.cityId)?.council ? c.cityId : residenceCityId(c);
      const r = await seatOffice(content, c, office, office === 'governor' ? here : undefined, now);
      return { did: `${officeTitle(content, office, here, c.factionId)}: ${r.councilKey}`, moved: false };
    }
    case 'ladder': {
      const r = await recordOffices(c, { council: 1, governor: 1, deputy: 1 }, now);
      return { did: `The ladder: ${r.inserted} completed terms (a council, a Governor's and a deputy's)`, moved: false };
    }
    case 'secretaryBill': {
      const r = await mondayBillsNow(content, now);
      return { did: `The Monday bills now: ${JSON.stringify(r)}`, moved: false };
    }
    case 'deputies': {
      // Three test members of the party, Rank 5, seated as player deputies of this Parliament.
      const made = await createTestMembers(content, c, { n: 3, rank: 5 } as never, now);
      for (const m of made) {
        const doc = await Character.findById(m.characterId).lean<CharacterDoc>();
        if (doc) await seatOffice(content, doc, 'deputy', undefined, now);
      }
      return { did: `Three test deputies: ${made.map((m) => m.name).join(', ')}`, moved: false };
    }
    case 'deputiesVote': {
      const vote = target === 'against' ? 'against' : 'for';
      const bill = await Bill.findOne({ status: 'voting' }).sort({ tabledDay: -1, _id: -1 }).lean<BillDoc>();
      if (!bill) throw new DevRefusal(409, 'No bill is up for a vote');
      const deputies = await OfficeTerm.find({
        office: 'deputy',
        'holder.kind': 'player',
        'holder.characterId': { $ne: c._id },
        fromDay: { $lte: today },
        toDay: { $gt: today },
        vacatedDay: null,
      })
        .limit(10)
        .lean<OfficeTermDoc[]>();
      let n = 0;
      for (const t of deputies) {
        if (t.holder.kind !== 'player') continue;
        const d = await Character.findById(t.holder.characterId).lean<CharacterDoc>();
        if (!d) continue;
        try {
          await callerAs(content, d, clock.now).parliament.vote({ billId: bill._id.toHexString(), vote, idempotencyKey: randomUUID() });
          n += 1;
        } catch {
          // Already voted, or not a deputy any more: the next one.
        }
      }
      return { did: `${n} test deputies voted ${vote === 'for' ? 'For' : 'Against'}`, moved: false };
    }
    case 'residentsSign': {
      // *Three test residents sign*: Rank 3 copies of the caller (so residents of the same town) sign
      // the open petition to dissolve its council.
      const cityId = residenceCityId(c);
      const p = await Petition.findOne({ kind: 'dissolve', cityId, status: 'open' }).lean<PetitionDoc>();
      if (!p) throw new DevRefusal(409, `No petition is open in ${content.city(cityId)?.name ?? cityId}`);
      const r = await asTestMembers(content, c, 3, now, (m) =>
        callerAs(content, m, clock.now).petition.sign({ petitionId: String(p._id), idempotencyKey: randomUUID() }),
      );
      return { did: `Test residents sign: ${r}`, moved: false };
    }
    case 'chairBackers': {
      const cand = await Candidacy.findOne({
        electionId: `chair:${c.factionId}:${termOf(today).index}`,
        characterId: c._id,
        status: 'standing',
      }).lean<CandidacyDoc>();
      if (!cand) throw new DevRefusal(409, 'You are not standing for Chair');
      const r = await asTestMembers(content, c, 3, now, (m) =>
        callerAs(content, m, clock.now).chairElection.back({ candidacyId: cand._id.toHexString(), idempotencyKey: randomUUID() }),
      );
      return { did: `Test members back you for Chair: ${r}`, moved: false };
    }
    case 'chairVotes': {
      const r = await asTestMembers(content, c, 3, now, (m) =>
        callerAs(content, m, clock.now).chairElection.vote({ key: `p:${c._id.toHexString()}`, idempotencyKey: randomUUID() }),
      );
      return { did: `Test members vote for you as Chair: ${r}`, moved: false };
    }
    case 'nationVotes': {
      const r = await asTestMembers(content, c, 3, now, (m) =>
        callerAs(content, m, clock.now).nation.vote({ factionId: c.factionId, idempotencyKey: randomUUID() }),
      );
      return { did: `Test members vote for the ${content.faction(c.factionId).shortName}: ${r}`, moved: false };
    }
    case 'chairPetitionSign': {
      const r = await asTestMembers(content, c, 3, now, (m) =>
        callerAs(content, m, clock.now).confidence.sign({ idempotencyKey: randomUUID() }),
      );
      return { did: `Test members sign the petition on the Chair: ${r}`, moved: false };
    }
    case 'lead': {
      const control = Object.fromEntries(FACTION_IDS.map((f) => [f, f === c.factionId ? 40 : 30])) as Record<FactionId, number>;
      nationDayHooks.controlOverride = control;
      return { did: `The ${content.faction(c.factionId).shortName} leads by ten at the next boundary`, moved: false };
    }
  }
}

/** §8.7's status fields: the term, the republic, the offices, the laws, the bills, the Chair and the orders. */
export async function nationStatus(content: GameContent, c: CharacterDoc | null, now: number): Promise<DevNationStatus | null> {
  const nation = await Nation.findById('republic').lean<NationDoc>();
  if (!nation) return null;
  const today = dayKey(now);
  const term = termOf(today);
  const name = (f: FactionId) => content.faction(f).shortName;
  const ctl = nation.control;
  const bills = await Bill.find({ status: { $in: ['voting', 'awaitingSignature'] } }).lean<BillDoc[]>();
  const fs = c ? await FactionState.findById(c.factionId).lean<FactionStateDoc>() : null;
  const standing = fs?.orders?.next && today >= fs.orders.next.fromDay ? fs.orders.next : fs?.orders?.current;
  const mine = c
    ? await OfficeTerm.find({
        'holder.kind': 'player',
        'holder.characterId': c._id,
        fromDay: { $lte: today },
        toDay: { $gt: today },
        vacatedDay: null,
      }).lean<OfficeTermDoc[]>()
    : [];
  const pres = nation.government.president;
  const seats = nation.government.parliament;
  return {
    termIndex: term.index,
    termDay: term.termDay,
    phase: `${nationalPhase(today)} · Chair ${chairPhase(today)}`,
    leader: ctl ? `${name(ctl.leader)} · ${FACTION_IDS.map((f) => `${name(f)} ${ctl.controlShare[f].toFixed(1)}`).join(' · ')}` : '—',
    government: `${pres.holder.name} (${name(pres.holder.factionId)}${pres.holder.kind === 'npc' ? ', figure' : ''}) · seats ${FACTION_IDS.map((f) => `${seats.seats[f]}${seats.players?.[f] ? ` (${seats.players[f]} players)` : ''}`).join(' / ')}`,
    laws: nation.laws.inForce.map((l) => `${content.law(l.lawId)?.name ?? l.lawId} · ${l.toDay - today} days`),
    bills: bills.map((b) => `${b.lawId ? (content.law(b.lawId)?.name ?? b.lawId) : b.kind} · ${b.status}${b.division ? ` · ${b.division.for}–${b.division.against}` : ` · ${b.votes?.length ?? 0} votes`}`),
    chair: fs?.chair ? fs.chair.holder.name : null,
    orders: standing ? `set by ${standing.setBy.name}${standing.push ? ` · push ${standing.push.target}` : ''}` : null,
    offices: c ? mine.map((t) => officeTitle(content, t.office ?? 'council', t.cityId, c.factionId)) : [],
  };
}
