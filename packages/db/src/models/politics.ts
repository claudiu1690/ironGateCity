import { FACTION_IDS } from '@irongate/rules';
import type {
  CountRow,
  DayKey,
  FactionId,
  NpcSlateEntry,
  RuleCard,
  RuleHow,
  RuleTally,
} from '@irongate/rules';
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
  /** Slice 4: the candidate's faction (a capital ballot names three parties). */
  factionId?: FactionId;
  kind: 'player' | 'npc';
  characterId?: Types.ObjectId;
  npcId?: string;
  candidacyId?: Types.ObjectId;
  name: string;
  /** Old lists only (before the voting rework): the platform line. */
  platform?: string;
  /** The voting rework (ADR 0084): a player's rule on the frozen list. */
  rule?: string;
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
  /**
   * Slice 4 (ADR 0027): `home` (absent = home) or a capital `district`; `placeId` the city or the
   * district. A district election has no single faction.
   */
  /** Slice 7 (ADR 0050): `battleground`, Clearwater's one election a cycle for its seven seats. */
  kind?: 'home' | 'district' | 'battleground';
  placeId?: string;
  factionId?: FactionId;
  cycle: number;
  nominationsFrom: DayKey;
  pollsFrom: DayKey;
  countDay: DayKey;
  status: ElectionStatus;
  /** Random at open: the NPC jitter's seed, stored for replay. */
  seed: string;
  /** All nine, drawn at open, profile order. Slice 4: a district's six carry their faction. */
  npcSlate: Array<NpcSlateEntry & { factionId?: FactionId }>;
  /** `$inc` by declare: serialises a filing with the close (ADR 0018). */
  filed: number;
  /** Old elections only (the small-branch rule, retired by the voting rework). */
  smallBranch?: { endorsers: number } | null;
  /** The candidate list, frozen at the set (the name is kept from the person ballot). */
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
    kind: { type: String, enum: ['home', 'district', 'battleground'] },
    placeId: { type: String },
    factionId: { type: String, enum: FACTION_IDS },
    cycle: int,
    nominationsFrom: int,
    pollsFrom: int,
    countDay: int,
    status: { type: String, enum: ['nominations', 'polling', 'counted'], required: true },
    seed: { type: String, required: true },
    npcSlate: { type: Schema.Types.Mixed, required: true },
    filed: { type: Number, default: 0 },
    smallBranch: { type: Schema.Types.Mixed },
    ballot: { type: Schema.Types.Mixed, default: null },
    ballots: { type: Number, default: 0 },
    result: { type: Schema.Types.Mixed, default: null },
    closedAt: { type: Date, default: null },
    countedAt: { type: Date, default: null },
  },
  { ...opts, collection: 'elections', timestamps: true },
);
// Slice 4: not unique any more (five district elections share the capital's city and cycle); the
// `_id` is the place's election key, which is.
electionSchema.index({ cityId: 1, cycle: -1 });

export const Election = model<ElectionDoc>('Election', electionSchema);

// ---------------------------------------------------------------------------------------------
// candidacies: one per member per election.
// ---------------------------------------------------------------------------------------------

export type CandidacyStatus = 'filed' | 'withdrawn' | 'struck' | 'standing' | 'elected' | 'defeated';
export type DepositState = 'held' | 'kept' | 'spent' | 'due' | 'returned';

export interface CandidacyDoc {
  _id: Types.ObjectId;
  electionId: string;
  /**
   * Slice 7 (ADR 0047): `chair`, `president` or `list` (absent: `council`). A non-council candidacy
   * has no city or cycle (the schema requires them only for the council); `termIndex` instead.
   */
  kind?: 'council' | 'chair' | 'president' | 'list';
  termIndex?: number;
  /** Slice 7: the President's two pledges (law ids). */
  pledges?: string[];
  /** Slice 7: the Chair's or the President's platform line. */
  platformId?: string | null;
  cityId: string;
  /** Slice 4: the candidate's faction and the place (the city or the district). */
  factionId?: FactionId;
  placeId?: string;
  cycle: number;
  characterId: Types.ObjectId;
  name: string;
  /** The voting rework (ADR 0084): the rule named at standing (absent on old rows: the faction's default). */
  rule?: string;
  filedAt: Date;
  filedDay: DayKey;
  status: CandidacyStatus;
  /** Members' endorsements: public (design §6.3). */
  endorsements: Array<{ characterId: Types.ObjectId; name: string; day: DayKey; at: Date }>;
  /** The secretary's, once. */
  branch: { day: DayKey; at: Date } | null;
  /** Old candidacies only: the counted endorsements and the small-branch rule at the close. */
  effective?: number | null;
  smallBranch?: boolean | null;
  deposit: DepositState;
  place: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Slice 7: a council candidacy (no `kind`, or `council`) needs its city and cycle; the others do not. */
function councilOnly(this: { kind?: string }): boolean {
  return (this.kind ?? 'council') === 'council';
}

const candidacySchema = new Schema<CandidacyDoc>(
  {
    electionId: { type: String, required: true },
    kind: { type: String, enum: ['council', 'chair', 'president', 'list'] },
    termIndex: { type: Number, validate: Number.isInteger },
    pledges: { type: [String], default: undefined },
    platformId: { type: String, default: undefined },
    cityId: { type: String, required: councilOnly },
    factionId: { type: String, enum: FACTION_IDS },
    placeId: { type: String },
    cycle: { type: Number, required: councilOnly, validate: Number.isInteger },
    characterId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    rule: { type: String },
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
    effective: { type: Number },
    smallBranch: { type: Boolean },
    deposit: { type: String, enum: ['held', 'kept', 'spent', 'due', 'returned'], required: true },
    place: { type: Number, default: null },
  },
  { ...opts, collection: 'candidacies', timestamps: true },
);
candidacySchema.index({ electionId: 1, characterId: 1 }, { unique: true });
candidacySchema.index({ electionId: 1, filedAt: 1 });

export const Candidacy = model<CandidacyDoc>('Candidacy', candidacySchema);

// ---------------------------------------------------------------------------------------------
// votes: one per voter per election (ADR 0019: secret at the API, linkable only for the audit).
// ---------------------------------------------------------------------------------------------

export interface VoteDoc {
  _id: Types.ObjectId;
  electionId: string;
  voterId: Types.ObjectId;
  /** A vote for a person (old rows; slice 7's person ballots). */
  candidateKey?: string;
  /** The voting rework (ADR 0083 §4): a vote for a rule. Exactly one of the two is set. */
  ordinanceId?: string;
  day: DayKey;
  createdAt: Date;
}

const voteSchema = new Schema<VoteDoc>(
  {
    electionId: { type: String, required: true },
    voterId: { type: Schema.Types.ObjectId, required: true },
    candidateKey: { type: String },
    ordinanceId: { type: String },
    day: int,
  },
  { ...opts, collection: 'votes', timestamps: { createdAt: true, updatedAt: false } },
);
// The voting rework (tech design §5.1): a vote is for a person or for a rule, never both or neither.
voteSchema.pre('validate', function () {
  if ((this.candidateKey == null) === (this.ordinanceId == null)) {
    throw new Error('a vote names exactly one of candidateKey and ordinanceId');
  }
});
voteSchema.index({ electionId: 1, voterId: 1 }, { unique: true });
voteSchema.index({ electionId: 1, candidateKey: 1 });
// The voting rework (ADR 0083 §4): the count's `$group` by rule.
voteSchema.index({ electionId: 1, ordinanceId: 1 });

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
  /** 1..7 at home; 1..10 in the capital (2 × (district n − 1) + 1 | 2). */
  seat: number;
  /** Slice 4: the seat's faction and district (null at home). */
  factionId?: FactionId;
  districtId?: string | null;
  /** Slice 4 (ADR 0026): the day a move vacated the seat (the stipend stops; not completed). */
  vacatedDay?: DayKey | null;
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
  /**
   * Slice 7 (ADR 0048): the office (absent: `council`). `councilKey` per office: `governor:{city}:{cycle}`,
   * `chair:{f}:{term}`, `deputy:{term}`, `president:{term}`; `seat` 1, or a deputy's list place.
   */
  office?: 'council' | 'governor' | 'chair' | 'deputy' | 'president';
  /** Slice 7: the office's powers, each set once (the Address, the veto, the Governor's rule). */
  powers?: {
    address?: { day: DayKey; cityId: string; issueDocId: string };
    veto?: { billId: Types.ObjectId; day: DayKey };
  };
  /** Slice 7: the President's pledges, kept when the law passes in the term. */
  pledges?: Array<{ lawId: string; keptDay: DayKey | null }>;
  /** Slice 7: how a President or a deputy took office. */
  via?: 'election' | 'runnerUp';
  /**
   * Review 4 (answers §10.1, ADR 0077): the *What now* card was shown at the hall (absent or null:
   * unseen). Set once by `council.whatNowSeen`, a conditional `$set`.
   */
  whatNowSeenAt?: Date | null;
  /**
   * The voting rework (ADR 0084 §5): the councillor's rule, copied at the count from the candidacy
   * (a player) or content (a home local); null for a capital local. Absent or null on a player's
   * term reads as the faction's default. `ruleSetAt`: the last `council.setRule`.
   */
  rule?: string | null;
  ruleSetAt?: Date | null;
  createdAt: Date;
}

const officeTermSchema = new Schema<OfficeTermDoc>(
  {
    cityId: { type: String, required: true },
    councilKey: { type: String, required: true },
    electionId: { type: String, required: true },
    seat: int,
    factionId: { type: String, enum: FACTION_IDS },
    districtId: { type: String, default: null },
    vacatedDay: { type: Number, default: null },
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
    whatNowSeenAt: { type: Date, default: null },
    // The voting rework: no defaults, so terms written before phase 2 stay as they were.
    rule: { type: String },
    ruleSetAt: { type: Date },
    // Slice 7 (ADR 0048): no defaults; migration 011 sets `office: 'council'` on the old terms.
    office: { type: String, enum: ['council', 'governor', 'chair', 'deputy', 'president'] },
    powers: { type: Schema.Types.Mixed, default: undefined },
    pledges: { type: Schema.Types.Mixed, default: undefined },
    via: { type: String, enum: ['election', 'runnerUp'] },
  },
  { ...opts, collection: 'officeTerms', timestamps: { createdAt: true, updatedAt: false } },
);
// Slice 4 (ADR 0026): a seat vacated at a move is re-filled from the move's day.
officeTermSchema.index({ councilKey: 1, seat: 1, fromDay: 1 }, { unique: true });
// Slice 7 (tech design §5.8): every office's terms by key (the powers' re-reads, take office).
officeTermSchema.index({ office: 1, councilKey: 1 }, { name: 'term_office_key' });
officeTermSchema.index(
  { 'holder.characterId': 1, toDay: -1 },
  { partialFilterExpression: { 'holder.kind': 'player' } },
);

export const OfficeTerm = model<OfficeTermDoc>('OfficeTerm', officeTermSchema);

// ---------------------------------------------------------------------------------------------
// ordinances: the rule ballot, one per council term; `_id` = councilKey (the voting rework).
// ---------------------------------------------------------------------------------------------

/** The old order paper's item (kept under `legacy` by the conversion, ADR 0086). */
export interface LegacyPaperItem {
  ordinanceId: string;
  movedBy:
    | { kind: 'branch'; npcId: string; name: string; characterId?: undefined; factionId?: FactionId }
    | { kind: 'player'; characterId: Types.ObjectId; name: string; npcId?: undefined; factionId?: FactionId };
  at: Date;
  day: DayKey;
}

/** The old council's vote (under `legacy`). */
export interface CouncilVote {
  characterId: Types.ObjectId;
  name: string;
  seat: number;
  /** An ordinance id or 'against'. */
  choice: string;
  at: Date;
}

/** The old division (under `legacy`). */
export interface Division {
  tallies: Array<{ choice: string; player: number; npc: number }>;
  npcChoice: string | null;
  npcAbstained: boolean;
  passed: string | null;
  inForce: { fromDay: DayKey; toDay: DayKey } | null;
}

/** The voting rework (ADR 0083 §2, tech design §5.1): what the count stores on a rule ballot. */
export interface RuleBallotResult {
  winner: string;
  how: RuleHow;
  /** In finishing order. */
  tallies: RuleTally[];
  turnout: { voters: number; eligible: number } | null;
  inForce: { fromDay: DayKey; toDay: DayKey };
}

/**
 * The voting rework (ADR 0083 §2): an `ordinances` document is a **rule ballot**, the ballot council
 * k puts to the town (`_id` = councilKey). Created `open` at the count that seats council k, `set` at
 * fromDay + 2 (the cards frozen), `counted` at fromDay + 5. An old order paper's fields moved under
 * `legacy` at the conversion (ADR 0086).
 */
export interface RuleBallotDoc {
  _id: string;
  cityId: string;
  cycle: number;
  fromDay: DayKey;
  setDay: DayKey;
  countDay: DayKey;
  status: 'open' | 'set' | 'counted';
  /** Frozen at the set; null while open (the views compute the provisional cards). */
  cards: RuleCard[] | null;
  /** Home cities: Unrest at the set (the party's card came off). */
  unrest: boolean | null;
  /** `$inc` by `council.setRule`, filtered on `status: 'open'`: serialises a change with the set. */
  changes: number;
  result: RuleBallotResult | null;
  legacy?: { items: LegacyPaperItem[]; votes: CouncilVote[]; division: Division | null };
  createdAt: Date;
  updatedAt: Date;
}

const ruleBallotSchema = new Schema<RuleBallotDoc>(
  {
    _id: { type: String, required: true },
    cityId: { type: String, required: true },
    cycle: int,
    fromDay: int,
    setDay: int,
    countDay: int,
    status: { type: String, enum: ['open', 'set', 'counted'], required: true },
    cards: { type: Schema.Types.Mixed, default: null },
    unrest: { type: Boolean, default: null },
    changes: { type: Number, default: 0 },
    result: { type: Schema.Types.Mixed, default: null },
    legacy: { type: Schema.Types.Mixed },
  },
  { ...opts, collection: 'ordinances', timestamps: true },
);
// The voting rework (tech design §5.1): a city's latest ballots (replaces `{ cityId, divideDay }`).
ruleBallotSchema.index({ cityId: 1, countDay: -1 });

export const RuleBallot = model<RuleBallotDoc>('RuleBallot', ruleBallotSchema);
