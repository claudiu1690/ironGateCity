import type { DayKey } from './day';
import type { NationalScore } from './national';
import type { BillDivision, BillKind, LineVote, LocalWhy } from './parliament';
import type { PushSpec } from './orders';
import type { ChairPhase, NationalPhase } from './term';
import type { TargetBarView, TermLineView } from './nationTypes';
import type { FactionId } from './types';

/**
 * Slice 7 phase B, lane 2 (docs/tech/slice-7.md §8.3, §10.2): the views of the Chair's election, the
 * Chair's desk, Parliament, the national election, the President, petitions and the vote on the
 * Chair. Built by the server; no view carries another member's secret ballot or a count of one before
 * the count (ADR 0019). Bill votes and backers are public by design.
 */

/** Why an act is not open now, in a form the client words (a reason and its numbers). */
export interface ActGate {
  ok: boolean;
  why: string | null;
  need?: number;
  /** Epoch ms when it opens, where that is a date. */
  opensAt?: number | null;
}

// ---------------------------------------------------------------------------------------------
// The Chair's election and the vote on the Chair.
// ---------------------------------------------------------------------------------------------

export interface ChairCandidateView {
  candidacyId: string;
  name: string;
  avatarId: string | null;
  rank: number;
  level: number;
  platform: string | null;
  /** Public: the members who backed (the branch's backing counts one). */
  backers: number;
  you: boolean;
  canBack: boolean;
}

export interface ChairResultView {
  termIndex: number;
  factionId: FactionId;
  status: 'counted' | 'void';
  rows: Array<{
    key: string;
    kind: 'player' | 'secretary';
    name: string;
    votes: number;
    backers: number;
    backersCounted: number;
    total: number;
    place: number;
  }>;
  winner: { name: string; kind: 'player' | 'secretary' };
  turnout: { voters: number; eligible: number };
  secretaryKept: boolean;
  margin: number;
}

export interface ChairElectionView {
  termIndex: number;
  factionId: FactionId;
  phase: ChairPhase | 'result' | 'none';
  status: 'names' | 'voting' | 'counted' | 'void' | null;
  /** The window's days: names in, the vote, the count. */
  days: { namesFrom: DayKey; votesFrom: DayKey; countDay: DayKey };
  chair: { name: string; kind: 'player' | 'secretary'; since: DayKey | null; until: DayKey | null; you: boolean };
  secretary: { name: string; addressedAs: string };
  candidates: ChairCandidateView[];
  /** Days 9–10, for a member who could stand (or why not). */
  stand: (ActGate & { cost: number; platforms: Array<{ id: string; line: string }>; standing: boolean }) | null;
  canVote: ActGate;
  yourVote: { name: string } | null;
  yourBacking: { name: string } | null;
  result: ChairResultView | null;
}

export interface ConfidenceView {
  factionId: FactionId;
  chair: { name: string; since: DayKey; until: DayKey; you: boolean } | null;
  petition: {
    id: string;
    count: number;
    /** Provisional until the close. */
    needed: number;
    until: number;
    signers: Array<{ name: string }>;
    you: 'signed' | 'sign' | 'no';
    status: 'open' | 'succeeded' | 'failed';
  } | null;
  canOpen: ActGate;
  vote: {
    voteId: string;
    trigger: 'unrest' | 'petition';
    until: number;
    countDay: DayKey;
    yourVote: 'confidence' | 'noConfidence' | null;
    canVote: ActGate;
  } | null;
  last: { voteId: string; removed: boolean; confidence: number; noConfidence: number; day: DayKey } | null;
}

// ---------------------------------------------------------------------------------------------
// The Chair's desk (and the read-only page for members).
// ---------------------------------------------------------------------------------------------

export interface FamilyView {
  family: string;
  label: string;
}

export interface ChairDeskView {
  factionId: FactionId;
  chair: { name: string; since: DayKey; until: DayKey; you: boolean } | null;
  orders: {
    slots: Array<{ slot: 'A' | 'B' | 'C'; current: FamilyView | null; menu: FamilyView[] }>;
    push: PushSpec | null;
    places: Array<{ cityId: string; districtId: string | null; name: string }>;
    fromDay: DayKey | null;
    setBy: { name: string } | null;
    target: TargetBarView | null;
  };
  lines: Array<{
    billId: string;
    law: string;
    kind: BillKind;
    line: LineVote | null;
    secretaryLine: LineVote;
    players: number;
    localsFollow: 'you' | 'players' | 'unrest';
    locals: number;
  }>;
  rules: Array<{
    cityId: string;
    cityName: string;
    ordinanceId: string | null;
    name: string | null;
    fromSet: DayKey;
    menu: Array<{ ordinanceId: string; name: string }>;
  }>;
  bill: { used: { lawName: string; day: DayKey } | null; cost: number };
  fixtures: Array<{
    cityId: string;
    cityName: string;
    day: DayKey;
    districtId: string | null;
    typeId: string | null;
    rotation: boolean;
    menu: Array<{ typeId: string; name: string }>;
    districts: Array<{ districtId: string; name: string }>;
  }>;
  /** The open cities a call may go to. */
  callCities: Array<{ cityId: string; name: string; districts: Array<{ districtId: string; name: string }> }>;
}

// ---------------------------------------------------------------------------------------------
// Parliament.
// ---------------------------------------------------------------------------------------------

export type BillState =
  | 'voting'
  | 'awaitingSignature'
  | 'inForce'
  | 'failed'
  | 'vetoed'
  | 'struck'
  | 'removed'
  | 'survived'
  | 'lapsed';

export interface BillRowView {
  billId: string;
  kind: BillKind;
  law: { id: string; name: string; line: string; effectLine: string } | null;
  /** A strike: the law it strikes out. */
  strikes: string | null;
  replaces: string | null;
  tabledBy: { name: string; factionId: FactionId | null; kind: 'player' | 'secretary' | 'figure' | 'clerk' };
  tabledDay: DayKey;
  /** Epoch ms of the division (the boundary into divideDay). */
  until: number;
  divideDay: DayKey;
  needed: 31 | 36 | 40;
  factional: boolean;
  counts: { for: number; against: number };
  /** Each bloc's locals as they stand now (the chain's current link). */
  localLines: Record<FactionId, { vote: 'for' | 'against' | 'abstain'; why: LocalWhy; n: number }>;
  state: BillState;
  you: { canVote: boolean; vote: 'for' | 'against' | null };
}

export interface BillPageView extends BillRowView {
  appliesTo: { kind: 'members' | 'others'; factionId: FactionId } | null;
  days: number | null;
  removal: { president: string; runnerUp: string | null } | null;
  votes: Array<{ name: string; factionId: FactionId; vote: 'for' | 'against' }>;
  division: BillDivision | null;
  /** The Chair's line on this bill, for the Chair. */
  chairLine: { line: LineVote | null; secretaryLine: LineVote } | null;
  /** The President's signature day. */
  signature: { today: boolean; canVeto: boolean; vetoUsed: boolean } | null;
  inForceFrom: DayKey | null;
}

export interface LawCardView {
  lawId: string;
  name: string;
  factionId: FactionId;
  line: string;
  effectLine: string;
  days: number;
  needed: 31 | 36;
  factional: boolean;
}

export interface ChamberView {
  termIndex: number;
  seats: Record<FactionId, { seats: number; players: number }>;
  locals: number;
  president: { name: string; factionId: FactionId; figure: boolean };
  term: TermLineView;
  bills: BillRowView[];
  decided: Array<{
    billId: string;
    day: DayKey;
    law: string | null;
    kind: BillKind;
    outcome: 'passed' | 'failed' | 'vetoed' | 'struck' | 'removed' | 'survived' | 'lapsed';
    for: number;
    against: number;
  }>;
  table: { as: 'deputy' | 'chair' | 'president'; cost: number; ok: boolean; why: string | null } | null;
  you: { deputy: boolean; chair: boolean; president: boolean };
}

export interface CatalogueView {
  as: 'deputy' | 'chair' | 'president' | null;
  cost: number;
  affordable: boolean;
  atCap: boolean;
  inForce: Array<LawCardView & { toDay: DayKey; daysLeft: number }>;
  laws: Array<LawCardView & { lines: Record<FactionId, LineVote>; available: boolean; why: string | null }>;
}

export interface BlocListView {
  factionId: FactionId;
  seats: number;
  players: Array<{ name: string; place: number }>;
  locals: { named: Array<{ name: string; who: string }>; more: number };
}

// ---------------------------------------------------------------------------------------------
// The national election and the President.
// ---------------------------------------------------------------------------------------------

export interface NationalCandidateView {
  factionId: FactionId;
  key: string;
  name: string;
  kind: 'player' | 'npc';
  avatarId: string | null;
  portrait: string | null;
  platform: string | null;
  pledges: Array<{ lawId: string; name: string }>;
  canBack: boolean;
}

export interface NationalElectionView {
  termIndex: number;
  phase: NationalPhase;
  status: 'names' | 'pick' | 'voting' | 'counted' | 'seated' | null;
  days: { namesFrom: DayKey; pickFrom: DayKey; votesFrom: DayKey; countDay: DayKey; officeDay: DayKey };
  candidates: NationalCandidateView[] | null;
  /** Your party's list, live (backers public). */
  list: Array<{ candidacyId: string; name: string; backers: number; place: number; you: boolean; canBack: boolean }>;
  presidentCandidates: Array<{ candidacyId: string; name: string; pledges: string[]; you: boolean }>;
  stand: { list: ActGate & { cost: number; standing: boolean }; president: ActGate & { cost: number; standing: boolean; canWithdraw: boolean } } | null;
  canVote: ActGate;
  yourVote: { factionId: FactionId } | null;
  yourBacking: { name: string } | null;
  backers: Record<FactionId, number> | null;
  pickName: string;
}

export interface PickView {
  termIndex: number;
  factionId: FactionId;
  pickName: string;
  status: 'names' | 'pick' | 'voting' | 'counted' | 'seated' | null;
  ballot: Array<{ key: string; name: string; kind: 'player' | 'npc'; pledges: string[] }> | null;
  voted: boolean;
  canVote: ActGate;
  yourVote: { name: string } | null;
  result: { winnerKey: string; winner: string; rows: Array<{ key: string; name: string; votes: number; place: number }> } | null;
}

export interface NationalResultView {
  termIndex: number;
  stamp: 'toBeConfirmed' | 'final';
  scores: NationalScore[];
  w: number;
  ballots: number;
  turnout: { voters: number; eligible: number };
  president: { name: string; factionId: FactionId; figure: boolean };
  runnerUp: { name: string; factionId: FactionId; figure: boolean } | null;
  drawn: boolean;
  lists: Record<FactionId, Array<{ name: string; seated: boolean; kind: 'player' | 'npc' }>>;
}

export interface PresidentPageView {
  holder: { name: string; factionId: FactionId; figure: boolean; since: DayKey; via: 'bootstrap' | 'election' | 'runnerUp' };
  you: boolean;
  until: DayKey;
  pledges: Array<{ lawId: string; name: string; kept: boolean }>;
  week: { tabled: { lawName: string; day: DayKey } | null; canTable: boolean };
  veto: { used: { lawName: string; day: DayKey } | null; signable: Array<{ billId: string; law: string; forVotes: number }> };
  address: { used: { issueShort: string; day: DayKey } | null; issues: Array<{ docId: string; cityId: string; name: string; short: string }> };
  pay: { pc: number; fxp: number };
}

// ---------------------------------------------------------------------------------------------
// Petitions to dissolve a council.
// ---------------------------------------------------------------------------------------------

export interface PetitionView {
  city: { id: string; name: string };
  open: {
    id: string;
    count: number;
    /** Provisional until the close. */
    needed: number;
    until: number;
    closesDay: DayKey;
    signers: Array<{ name: string; factionId: FactionId }>;
    townHall: number;
    you: 'open' | 'sign' | 'signed' | 'councillor' | 'no';
  } | null;
  canOpen: ActGate;
  canSign: ActGate;
  last: { outcome: 'dissolved' | 'fellShort'; day: DayKey; count: number; needed: number } | null;
}
