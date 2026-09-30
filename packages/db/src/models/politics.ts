import { FACTION_IDS } from '@irongate/rules';
import type { CountRow, DayKey, FactionId, NpcSlateEntry } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/**
 * Slice 3 council records (ADR 0020): their own collections, written only by the city day
 * (ADR 0017) or by the political acts (ADR 0018). Every document has a natural unique key, so a
 * second run of a boundary cannot duplicate one.
 */

const int = { type: Number, required: true, validate: Number.isInteger } as const;
const opts = { strict: true, versionKey: false, minimize: false } as const;

// ---------------------------------------------------------------------------------------------
// elections: one per city per cycle; `_id` = electionKey ("coalport:4145").
// ---------------------------------------------------------------------------------------------

export interface BallotLine {
  /** 'p:<characterId>' | 'n:<npcId>'. */
  key: string;
  kind: 'player' | 'npc';
  characterId?: Types.ObjectId;
  npcId?: string;
  candidacyId?: Types.ObjectId;
  name: string;
  platform: string;
  /** Players by filing, then NPCs by profile. */
  order: number;
}

export interface ElectionResult {
  rows: CountRow[];
  turnout: { voters: number; eligible: number };
  npcSeats: number;
  topKey: string;
  lastSeatKey: string;
}

export type ElectionStatus = 'nominations' | 'polling' | 'counted';

export interface ElectionDoc {
  _id: string;
  cityId: string;
  factionId: FactionId;
  cycle: number;
  nominationsFrom: DayKey;
  pollsFrom: DayKey;
  countDay: DayKey;
  status: ElectionStatus;
  /** Random at open: the NPC jitter's seed, stored for replay. */
  seed: string;
  /** All nine, drawn at open, profile order. */
  npcSlate: NpcSlateEntry[];
  /** `$inc` by declare: serialises a filing with the close (ADR 0018). */
  filed: number;
  /** Decided at the close. */
  smallBranch: { endorsers: number } | null;
  /** Frozen at the close. */
  ballot: BallotLine[] | null;
  /** `$inc` by each vote; never in a view before the count (ADR 0019). */
  ballots: number;
  result: ElectionResult | null;
  closedAt: Date | null;
  countedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const electionSchema = new Schema<ElectionDoc>(
  {
    _id: { type: String, required: true },
    cityId: { type: String, required: true },
    factionId: { type: String, enum: FACTION_IDS, required: true },
    cycle: int,
    nominationsFrom: int,
    pollsFrom: int,
    countDay: int,
    status: { type: String, enum: ['nominations', 'polling', 'counted'], required: true },
    seed: { type: String, required: true },
    npcSlate: { type: Schema.Types.Mixed, required: true },
    filed: { type: Number, default: 0 },
    smallBranch: { type: Schema.Types.Mixed, default: null },
    ballot: { type: Schema.Types.Mixed, default: null },
    ballots: { type: Number, default: 0 },
    result: { type: Schema.Types.Mixed, default: null },
    closedAt: { type: Date, default: null },
    countedAt: { type: Date, default: null },
  },
  { ...opts, collection: 'elections', timestamps: true },
);
electionSchema.index({ cityId: 1, cycle: -1 }, { unique: true });

export const Election = model<ElectionDoc>('Election', electionSchema);

// ---------------------------------------------------------------------------------------------
// candidacies: one per member per election.
// ---------------------------------------------------------------------------------------------

export type CandidacyStatus = 'filed' | 'withdrawn' | 'struck' | 'standing' | 'elected' | 'defeated';
export type DepositState = 'held' | 'kept' | 'spent' | 'due' | 'returned';

export interface CandidacyDoc {
  _id: Types.ObjectId;
  electionId: string;
  cityId: string;
  cycle: number;
  characterId: Types.ObjectId;
  name: string;
  platformId: string;
  filedAt: Date;
  filedDay: DayKey;
  status: CandidacyStatus;
  /** Members' endorsements: public (design §6.3). */
  endorsements: Array<{ characterId: Types.ObjectId; name: string; day: DayKey; at: Date }>;
  /** The secretary's, once. */
  branch: { day: DayKey; at: Date } | null;
  /** At the close: members + branch × (small ? 2 : 1). */
  effective: number | null;
  /** At the close: the small-branch rule applied. */
  smallBranch: boolean | null;
  deposit: DepositState;
  place: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const candidacySchema = new Schema<CandidacyDoc>(
  {
    electionId: { type: String, required: true },
    cityId: { type: String, required: true },
    cycle: int,
    characterId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    platformId: { type: String, required: true },
    filedAt: { type: Date, required: true },
    filedDay: int,
    status: {
      type: String,
      enum: ['filed', 'withdrawn', 'struck', 'standing', 'elected', 'defeated'],
      required: true,
    },
    endorsements: {
      type: [
        new Schema(
          {
            characterId: { type: Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            day: int,
            at: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    branch: {
      type: new Schema({ day: int, at: { type: Date, required: true } }, { _id: false }),
      default: null,
    },
    effective: { type: Number, default: null },
    smallBranch: { type: Boolean, default: null },
    deposit: { type: String, enum: ['held', 'kept', 'spent', 'due', 'returned'], required: true },
    place: { type: Number, default: null },
  },
  { ...opts, collection: 'candidacies', timestamps: true },
);
candidacySchema.index({ electionId: 1, characterId: 1 }, { unique: true });
candidacySchema.index({ electionId: 1, filedAt: 1 });
candidacySchema.index({ characterId: 1, deposit: 1 }, { partialFilterExpression: { deposit: 'due' } });

export const Candidacy = model<CandidacyDoc>('Candidacy', candidacySchema);

// ---------------------------------------------------------------------------------------------
// votes: one per voter per election (ADR 0019: secret at the API, linkable only for the audit).
// ---------------------------------------------------------------------------------------------

export interface VoteDoc {
  _id: Types.ObjectId;
  electionId: string;
  voterId: Types.ObjectId;
  candidateKey: string;
  day: DayKey;
  createdAt: Date;
}

const voteSchema = new Schema<VoteDoc>(
  {
    electionId: { type: String, required: true },
    voterId: { type: Schema.Types.ObjectId, required: true },
    candidateKey: { type: String, required: true },
    day: int,
  },
  { ...opts, collection: 'votes', timestamps: { createdAt: true, updatedAt: false } },
);
voteSchema.index({ electionId: 1, voterId: 1 }, { unique: true });
voteSchema.index({ electionId: 1, candidateKey: 1 });

export const Vote = model<VoteDoc>('Vote', voteSchema);

// ---------------------------------------------------------------------------------------------
// officeTerms: one per seat per term, NPCs included.
// ---------------------------------------------------------------------------------------------

export type SeatHolder =
  | { kind: 'player'; characterId: Types.ObjectId; name: string; npcId?: undefined }
  | { kind: 'npc'; npcId: string; name: string; characterId?: undefined };

export interface OfficeTermDoc {
  _id: Types.ObjectId;
  cityId: string;
  councilKey: string;
  electionId: string;
  /** 1..7. */
  seat: number;
  /** Sits fromDay..toDay − 1; ends at the count at toDay. */
  fromDay: DayKey;
  toDay: DayKey;
  holder: SeatHolder;
  place: number;
  total: number;
  /** Set at the count at toDay. */
  completed: boolean;
  /** Players: the front page's stamp animates until this is set (ADR 0023). */
  frontPageSeenAt: Date | null;
  createdAt: Date;
}

const officeTermSchema = new Schema<OfficeTermDoc>(
  {
    cityId: { type: String, required: true },
    councilKey: { type: String, required: true },
    electionId: { type: String, required: true },
    seat: int,
    fromDay: int,
    toDay: int,
    holder: {
      type: new Schema(
        {
          kind: { type: String, enum: ['player', 'npc'], required: true },
          characterId: { type: Schema.Types.ObjectId },
          npcId: { type: String },
          name: { type: String, required: true },
        },
        { _id: false },
      ),
      required: true,
    },
    place: int,
    total: int,
    completed: { type: Boolean, default: false },
    frontPageSeenAt: { type: Date, default: null },
  },
  { ...opts, collection: 'officeTerms', timestamps: { createdAt: true, updatedAt: false } },
);
officeTermSchema.index({ councilKey: 1, seat: 1 }, { unique: true });
officeTermSchema.index(
  { 'holder.characterId': 1, toDay: -1 },
  { partialFilterExpression: { 'holder.kind': 'player' } },
);

export const OfficeTerm = model<OfficeTermDoc>('OfficeTerm', officeTermSchema);

// ---------------------------------------------------------------------------------------------
// ordinances: the order paper, one per council term; `_id` = councilKey.
// ---------------------------------------------------------------------------------------------

export type MovedBy =
  | { kind: 'branch'; npcId: string; name: string; characterId?: undefined }
  | { kind: 'player'; characterId: Types.ObjectId; name: string; npcId?: undefined };

export interface OrderPaperItem {
  ordinanceId: string;
  movedBy: MovedBy;
  at: Date;
  day: DayKey;
}

export interface CouncilVote {
  characterId: Types.ObjectId;
  name: string;
  seat: number;
  /** An ordinance id or 'against'. */
  choice: string;
  at: Date;
}

export interface Division {
  tallies: Array<{ choice: string; player: number; npc: number }>;
  npcChoice: string | null;
  npcAbstained: boolean;
  passed: string | null;
  inForce: { fromDay: DayKey; toDay: DayKey } | null;
}

export interface OrderPaperDoc {
  _id: string;
  cityId: string;
  cycle: number;
  fromDay: DayKey;
  divideDay: DayKey;
  status: 'open' | 'divided';
  /** Item 1 is the branch's motion; at most four. */
  items: OrderPaperItem[];
  /** Public inside the council. */
  votes: CouncilVote[];
  division: Division | null;
  createdAt: Date;
  updatedAt: Date;
}

const orderPaperSchema = new Schema<OrderPaperDoc>(
  {
    _id: { type: String, required: true },
    cityId: { type: String, required: true },
    cycle: int,
    fromDay: int,
    divideDay: int,
    status: { type: String, enum: ['open', 'divided'], required: true },
    items: {
      type: [
        new Schema(
          {
            ordinanceId: { type: String, required: true },
            movedBy: {
              type: new Schema(
                {
                  kind: { type: String, enum: ['branch', 'player'], required: true },
                  npcId: { type: String },
                  characterId: { type: Schema.Types.ObjectId },
                  name: { type: String, required: true },
                },
                { _id: false },
              ),
              required: true,
            },
            at: { type: Date, required: true },
            day: int,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    votes: {
      type: [
        new Schema(
          {
            characterId: { type: Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            seat: int,
            choice: { type: String, required: true },
            at: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    division: { type: Schema.Types.Mixed, default: null },
  },
  { ...opts, collection: 'ordinances', timestamps: true },
);
orderPaperSchema.index({ cityId: 1, divideDay: -1 });

export const OrderPaper = model<OrderPaperDoc>('OrderPaper', orderPaperSchema);
