import { FACTION_IDS } from '@irongate/rules';
import type { BillDivision, BillKind, DayKey, FactionId, LawInForce, LineVote, OpinionShares } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';
import type { SeatHolder } from './politics';

/**
 * Slice 7 (docs/tech/slice-7.md §5.1–§5.7; ADR 0043–0049): the nation's seven collections. Nested
 * shapes that are written whole by the nation's day are `Mixed` (typed here); every guard a player
 * act needs is a top-level field or a unique index, never a counter on a hot document.
 */

const int = { type: Number, required: true, validate: Number.isInteger } as const;
const opts = { strict: true, versionKey: false, minimize: false } as const;

// ---------------------------------------------------------------------------------------------
// nation: one document, `_id: 'republic'` (ADR 0043).
// ---------------------------------------------------------------------------------------------

export type NationalHolder = SeatHolder & { factionId: FactionId };

export interface LawProjection extends LawInForce {
  docId: Types.ObjectId;
  /** The tabler's name and the division, stored at enactment for the law book (rows written before the
   * slice-7 fix round lack them; the book falls back to the bill). */
  by?: string;
  passed?: { for: number; against: number; day: DayKey };
}

export interface NationNewsItem {
  day: DayKey;
  id: string;
  priority: number;
  factionId: FactionId | null;
  contributors?: Types.ObjectId[];
  facts: Record<string, unknown>;
}

export interface NationDoc {
  _id: 'republic';
  world: { settledDay: DayKey; bootstrappedDay: DayKey };
  /** `toDay` exclusive. */
  term: { index: number; fromDay: DayKey; toDay: DayKey };
  government: {
    president: {
      holder: NationalHolder;
      /** null: a party figure (no office term). */
      termId: Types.ObjectId | null;
      since: DayKey;
      consecutive: 1 | 2;
      via: 'bootstrap' | 'election' | 'runnerUp';
    };
    runnerUp: { holder: NationalHolder; termId: Types.ObjectId | null } | null;
    parliament: { termIndex: number; seats: Record<FactionId, number>; players: Record<FactionId, number> };
    /** The seven-day guard on removal motions; the one field a player act writes (a removal's tabling). */
    lastRemovalDay: DayKey | null;
    autoRemovalTerm: number | null;
  };
  control: {
    day: DayKey;
    shares: OpinionShares;
    controlShare: Record<FactionId, number>;
    leader: FactionId;
    cities: Array<{ cityId: string; weight: number; unrest: boolean; shares: OpinionShares }>;
  };
  /** The last 60 boundaries. */
  controlLog: Array<{ day: DayKey; shares: OpinionShares; leader: FactionId }>;
  laws: { inForce: LawProjection[]; history: LawProjection[] };
  /** The last 14 boundaries' national lines (read live by the paper). */
  news: NationNewsItem[];
  createdAt: Date;
  updatedAt: Date;
}

const nationSchema = new Schema<NationDoc>(
  {
    _id: { type: String, enum: ['republic'], required: true },
    world: { settledDay: int, bootstrappedDay: int },
    term: { index: int, fromDay: int, toDay: int },
    government: { type: Schema.Types.Mixed, required: true },
    control: { type: Schema.Types.Mixed, required: true },
    controlLog: { type: Schema.Types.Mixed, default: () => [] },
    laws: {
      inForce: { type: Schema.Types.Mixed, default: () => [] },
      history: { type: Schema.Types.Mixed, default: () => [] },
    },
    news: { type: Schema.Types.Mixed, default: () => [] },
  },
  { ...opts, collection: 'nation', timestamps: true },
);

export const Nation = model<NationDoc>('Nation', nationSchema);

// ---------------------------------------------------------------------------------------------
// factions: one per faction, `_id` = the faction id (ADR 0046).
// ---------------------------------------------------------------------------------------------

export interface StandingOrdersDoc {
  fromDay: DayKey;
  picks: { A: string | null; B: string | null; C: string | null };
  push: { slot: 'A' | 'B'; cityId: string; districtId: string | null; target: 25 | 50 | 100 } | null;
  setBy: { characterId: Types.ObjectId; name: string };
  setAt: Date;
}

export interface FactionStateDoc {
  _id: FactionId;
  chair: {
    holder: { characterId: Types.ObjectId; name: string };
    termId: Types.ObjectId;
    fromDay: DayKey;
    toDay: DayKey;
  } | null;
  orders: { current: StandingOrdersDoc | null; next: StandingOrdersDoc | null };
  /** ≤ 3: the Chair's rule per council city, read at the next ballot's set. */
  rules: Array<{ cityId: string; ordinanceId: string; setDay: DayKey }>;
  /** Tomorrow's fixtures, ≤ 3. */
  fixtures: Array<{ cityId: string; day: DayKey; typeId: string; districtId: string | null }>;
  /** The last 14 days' push results. */
  pushDays: Array<{
    day: DayKey;
    slot: 'A' | 'B';
    cityId: string;
    districtId: string | null;
    target: 25 | 50 | 100;
    count: number;
    met: boolean;
  }>;
  /** Design §7.3's pointer into the preferred laws. */
  secretaryBillIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

const factionStateSchema = new Schema<FactionStateDoc>(
  {
    _id: { type: String, enum: FACTION_IDS, required: true },
    chair: { type: Schema.Types.Mixed, default: null },
    orders: {
      current: { type: Schema.Types.Mixed, default: null },
      next: { type: Schema.Types.Mixed, default: null },
    },
    rules: { type: Schema.Types.Mixed, default: () => [] },
    fixtures: { type: Schema.Types.Mixed, default: () => [] },
    pushDays: { type: Schema.Types.Mixed, default: () => [] },
    secretaryBillIndex: { type: Number, default: 0, min: 0 },
  },
  { ...opts, collection: 'factions', timestamps: true },
);
// The Chair's acts filter on `chair.holder.characterId` (the desk's writes).
factionStateSchema.index({ 'chair.holder.characterId': 1 }, { sparse: true, name: 'faction_chair' });

export const FactionState = model<FactionStateDoc>('FactionState', factionStateSchema);

// ---------------------------------------------------------------------------------------------
// factionElections: the Chair's election and the votes on the Chair (ADR 0047).
// ---------------------------------------------------------------------------------------------

export interface FactionElectionDoc {
  /** 'chair:collective:12' | 'confidence:collective:{chairTermId}:{trigger}'. */
  _id: string;
  kind: 'chair' | 'confidence';
  factionId: FactionId;
  termIndex: number;
  namesFrom: DayKey | null;
  votesFrom: DayKey;
  countDay: DayKey;
  status: 'names' | 'voting' | 'counted' | 'void';
  seed: string;
  /** `$inc` by a stand, filtered on `names` (ADR 0018). */
  filed: number;
  /** `$inc` by a vote, filtered on `voting`; never in a view before the count (ADR 0019). */
  ballots: number;
  /** Frozen at the close: players by filing, then 'n:secretary'. */
  ballot: Array<{ key: string; kind: 'player' | 'secretary'; name: string; order: number }> | null;
  chairTermId: Types.ObjectId | null;
  trigger: 'unrest' | 'petition' | null;
  result: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

const factionElectionSchema = new Schema<FactionElectionDoc>(
  {
    _id: { type: String, required: true },
    kind: { type: String, enum: ['chair', 'confidence'], required: true },
    factionId: { type: String, enum: FACTION_IDS, required: true },
    termIndex: int,
    namesFrom: { type: Number, default: null },
    votesFrom: int,
    countDay: int,
    status: { type: String, enum: ['names', 'voting', 'counted', 'void'], required: true },
    seed: { type: String, required: true },
    filed: { type: Number, default: 0 },
    ballots: { type: Number, default: 0 },
    ballot: { type: Schema.Types.Mixed, default: null },
    chairTermId: { type: Schema.Types.ObjectId, default: null },
    trigger: { type: String, enum: ['unrest', 'petition', null], default: null },
    result: { type: Schema.Types.Mixed, default: null },
  },
  { ...opts, collection: 'factionElections', timestamps: true },
);
factionElectionSchema.index({ factionId: 1, termIndex: -1, kind: 1 }, { name: 'felection_faction_term' });
factionElectionSchema.index({ status: 1, countDay: 1 }, { name: 'felection_due' });

export const FactionElection = model<FactionElectionDoc>('FactionElection', factionElectionSchema);

// ---------------------------------------------------------------------------------------------
// nationalElections: one per term, `_id` 'nation:{n}' (ADR 0047).
// ---------------------------------------------------------------------------------------------

export interface NationalElectionDoc {
  _id: string;
  termIndex: number;
  namesFrom: DayKey;
  pickFrom: DayKey;
  votesFrom: DayKey;
  countDay: DayKey;
  officeDay: DayKey;
  status: 'names' | 'pick' | 'voting' | 'counted' | 'seated';
  seed: string;
  filed: number;
  ballots: number;
  /** `$inc` by backing the party's candidate, filtered on `voting`. */
  backers: Record<FactionId, number>;
  picks: Record<
    FactionId,
    {
      ballots: number;
      ballot: Array<{ key: string; kind: 'player' | 'npc'; name: string; order: number }> | null;
      /** false: the figure stood alone. */
      voted: boolean;
      result: { winnerKey: string; rows: Array<Record<string, unknown>> } | null;
    }
  >;
  candidates: Array<{
    factionId: FactionId;
    key: string;
    kind: 'player' | 'npc';
    characterId?: Types.ObjectId;
    npcId?: string;
    name: string;
    pledges: string[];
    platformId: string | null;
    candidacyId?: Types.ObjectId;
  }> | null;
  result: Record<string, unknown> | null;
  countedAt: Date | null;
  seatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const zeroByFaction = () => Object.fromEntries(FACTION_IDS.map((f) => [f, 0]));

const nationalElectionSchema = new Schema<NationalElectionDoc>(
  {
    _id: { type: String, required: true },
    termIndex: int,
    namesFrom: int,
    pickFrom: int,
    votesFrom: int,
    countDay: int,
    officeDay: int,
    status: { type: String, enum: ['names', 'pick', 'voting', 'counted', 'seated'], required: true },
    seed: { type: String, required: true },
    filed: { type: Number, default: 0 },
    ballots: { type: Number, default: 0 },
    backers: { type: Schema.Types.Mixed, default: zeroByFaction },
    picks: { type: Schema.Types.Mixed, required: true },
    candidates: { type: Schema.Types.Mixed, default: null },
    result: { type: Schema.Types.Mixed, default: null },
    countedAt: { type: Date, default: null },
    seatedAt: { type: Date, default: null },
  },
  { ...opts, collection: 'nationalElections', timestamps: true },
);
nationalElectionSchema.index({ termIndex: -1 }, { name: 'nelection_term' });

export const NationalElection = model<NationalElectionDoc>('NationalElection', nationalElectionSchema);

// ---------------------------------------------------------------------------------------------
// bills: the order paper (ADR 0045). Votes and the Chairs' lines embedded; slots by natural keys.
// ---------------------------------------------------------------------------------------------

export type BillStatus =
  | 'voting'
  | 'awaitingSignature'
  | 'inForce'
  | 'failed'
  | 'vetoed'
  | 'struck'
  | 'lapsed'
  | 'removed'
  | 'survived';
export const BILL_STATUSES = [
  'voting',
  'awaitingSignature',
  'inForce',
  'failed',
  'vetoed',
  'struck',
  'lapsed',
  'removed',
  'survived',
] as const satisfies readonly BillStatus[];

export interface BillTabler {
  kind: 'player' | 'secretary' | 'figure' | 'clerk';
  as: 'deputy' | 'chair' | 'president' | null;
  characterId?: Types.ObjectId;
  npcId?: string;
  name: string;
  factionId: FactionId | null;
}

export interface BillDoc {
  _id: Types.ObjectId;
  termIndex: number;
  kind: BillKind;
  lawId: string | null;
  replacesLawId: string | null;
  overrideOf: Types.ObjectId | null;
  /** 'r1:12' | 'r2:12' | 'r3:12' | 'president:12:{weekDay}' | 'override:{billId}' | 'clerk:12:{day}'. */
  slotKey: string;
  /** '{characterId}:12:bill' | '{characterId}:12:removal' (players only). */
  tablerKey: string | null;
  tabledBy: BillTabler;
  tabledAt: Date;
  tabledDay: DayKey;
  divideDay: DayKey;
  needed: 31 | 36 | 40;
  factional: boolean;
  vetoable: boolean;
  status: BillStatus;
  /** ≤ 60, public. */
  votes: Array<{ characterId: Types.ObjectId; name: string; factionId: FactionId; vote: 'for' | 'against'; at: Date }>;
  lines: Partial<Record<FactionId, { line: LineVote; at: Date; by: { characterId: Types.ObjectId; name: string } }>>;
  division: BillDivision | null;
  signatureDay: DayKey | null;
  inForceFrom: DayKey | null;
  vetoedAt: Date | null;
  lawDocId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const billSchema = new Schema<BillDoc>(
  {
    termIndex: int,
    kind: { type: String, enum: ['law', 'strike', 'removal', 'override'], required: true },
    lawId: { type: String, default: null },
    replacesLawId: { type: String, default: null },
    overrideOf: { type: Schema.Types.ObjectId, default: null },
    slotKey: { type: String, required: true },
    tablerKey: { type: String, default: null },
    tabledBy: { type: Schema.Types.Mixed, required: true },
    tabledAt: { type: Date, required: true },
    tabledDay: int,
    divideDay: int,
    needed: { type: Number, enum: [31, 36, 40], required: true },
    factional: { type: Boolean, required: true },
    vetoable: { type: Boolean, required: true },
    status: { type: String, enum: BILL_STATUSES, required: true },
    votes: {
      type: [
        new Schema(
          {
            characterId: { type: Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            factionId: { type: String, enum: FACTION_IDS, required: true },
            vote: { type: String, enum: ['for', 'against'], required: true },
            at: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    lines: { type: Schema.Types.Mixed, default: () => ({}) },
    division: { type: Schema.Types.Mixed, default: null },
    signatureDay: { type: Number, default: null },
    inForceFrom: { type: Number, default: null },
    vetoedAt: { type: Date, default: null },
    lawDocId: { type: Schema.Types.ObjectId, default: null },
  },
  { ...opts, collection: 'bills', timestamps: true },
);
// Three regular slots, one President's bill a week, one override per veto, one clerk's motion a day.
billSchema.index({ slotKey: 1 }, { unique: true, partialFilterExpression: { status: 'voting' }, name: 'bill_slot' });
// One bill per law on the paper.
billSchema.index(
  { lawId: 1 },
  { unique: true, partialFilterExpression: { status: 'voting', kind: { $in: ['law', 'override'] } }, name: 'bill_law' },
);
// Once a term per member per power (§22.1 Q16).
billSchema.index(
  { tablerKey: 1 },
  { unique: true, partialFilterExpression: { tablerKey: { $type: 'string' } }, name: 'bill_tabler' },
);
billSchema.index({ termIndex: 1, status: 1, divideDay: 1 }, { name: 'bill_paper' });
billSchema.index(
  { status: 1, signatureDay: 1 },
  { partialFilterExpression: { status: 'awaitingSignature' }, name: 'bill_signature' },
);
billSchema.index({ lawId: 1, divideDay: -1 }, { partialFilterExpression: { status: 'failed' }, name: 'bill_failed_week' });
billSchema.index({ 'tabledBy.characterId': 1, tabledDay: -1 }, { name: 'bill_tabler_days' });

export const Bill = model<BillDoc>('Bill', billSchema);

// ---------------------------------------------------------------------------------------------
// laws: the law book (ADR 0044); expiry by the calendar writes nothing.
// ---------------------------------------------------------------------------------------------

export interface LawDoc {
  _id: Types.ObjectId;
  lawId: string;
  billId: Types.ObjectId;
  termIndex: number;
  fromDay: DayKey;
  /** By duration, exclusive. */
  toDay: DayKey;
  endedDay: DayKey | null;
  endedBy: 'struck' | 'replaced' | 'renewed' | null;
  tabledBy: BillTabler;
  passed: { for: number; against: number; overridden: boolean };
  createdAt: Date;
}

const lawSchema = new Schema<LawDoc>(
  {
    lawId: { type: String, required: true },
    billId: { type: Schema.Types.ObjectId, required: true },
    termIndex: int,
    fromDay: int,
    toDay: int,
    endedDay: { type: Number, default: null },
    endedBy: { type: String, enum: ['struck', 'replaced', 'renewed', null], default: null },
    tabledBy: { type: Schema.Types.Mixed, required: true },
    passed: { type: Schema.Types.Mixed, required: true },
  },
  { ...opts, collection: 'laws', timestamps: { createdAt: true, updatedAt: false } },
);
lawSchema.index({ fromDay: -1 }, { name: 'law_from' });
lawSchema.index({ lawId: 1, fromDay: -1 }, { name: 'law_id_from' });
// One law row per bill (an enactment replayed after a crash cannot insert twice).
lawSchema.index({ billId: 1 }, { unique: true, name: 'law_bill' });

export const LawModel = model<LawDoc>('Law', lawSchema);

// ---------------------------------------------------------------------------------------------
// petitions: to dissolve a council, and on the Chair (ADR 0049).
// ---------------------------------------------------------------------------------------------

export interface PetitionDoc {
  /** 'dissolve:coalport:20731' | 'chair:collective:{chairTermId}'. */
  _id: string;
  kind: 'dissolve' | 'chair';
  cityId: string | null;
  councilKey: string | null;
  factionId: FactionId | null;
  chairTermId: Types.ObjectId | null;
  openedBy: { characterId: Types.ObjectId; name: string };
  openedDay: DayKey;
  closesDay: DayKey;
  /** Signatures plus the townspeople's from Town Halls. */
  count: number;
  signatures: Array<{ characterId: Types.ObjectId; name: string; factionId: FactionId; day: DayKey; at: Date }>;
  townHall: number;
  /** Set at the close. */
  needed: number | null;
  status: 'open' | 'succeeded' | 'failed';
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const petitionSchema = new Schema<PetitionDoc>(
  {
    _id: { type: String, required: true },
    kind: { type: String, enum: ['dissolve', 'chair'], required: true },
    cityId: { type: String, default: null },
    councilKey: { type: String, default: null },
    factionId: { type: String, enum: [...FACTION_IDS, null], default: null },
    chairTermId: { type: Schema.Types.ObjectId, default: null },
    openedBy: {
      type: new Schema(
        { characterId: { type: Schema.Types.ObjectId, required: true }, name: { type: String, required: true } },
        { _id: false },
      ),
      required: true,
    },
    openedDay: int,
    closesDay: int,
    count: { type: Number, default: 0, min: 0 },
    signatures: {
      type: [
        new Schema(
          {
            characterId: { type: Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            factionId: { type: String, enum: FACTION_IDS, required: true },
            day: int,
            at: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    townHall: { type: Number, default: 0, min: 0 },
    needed: { type: Number, default: null },
    status: { type: String, enum: ['open', 'succeeded', 'failed'], required: true },
    closedAt: { type: Date, default: null },
  },
  { ...opts, collection: 'petitions', timestamps: true },
);
// One open dissolve petition per city.
petitionSchema.index(
  { cityId: 1 },
  { unique: true, partialFilterExpression: { status: 'open', kind: 'dissolve' }, name: 'petition_open_city' },
);
petitionSchema.index({ cityId: 1, closesDay: -1 }, { name: 'petition_city_close' });
petitionSchema.index({ status: 1, closesDay: 1 }, { name: 'petition_due' });
petitionSchema.index({ 'signatures.characterId': 1, closesDay: -1 }, { name: 'petition_signer' });

export const Petition = model<PetitionDoc>('Petition', petitionSchema);
