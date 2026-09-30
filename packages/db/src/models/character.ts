import { FACTION_IDS } from '@irongate/rules';
import type {
  AmbitionState,
  DailyTally,
  DayKey,
  Equipment,
  FactionId,
  InventoryEntry,
} from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/** Review 1 (GDD §9.1): a job is a wage; `seniority` counts the boundaries held (Long Service: 2). */
export interface StoredJob {
  id: string;
  since: DayKey;
  seniority: number;
}

export interface StoredOrderItem {
  templateId: string;
  variant: 'main' | 'noJob';
  target: number;
  progress: number;
  doneAt: Date | null;
}

export interface StoredOrders {
  day: DayKey;
  items: StoredOrderItem[];
  allDoneAt: Date | null;
}

/**
 * One per user; everything a session reads is embedded (plan §2 rule 6). Energy and Rested are
 * lazy timers: stored value + timestamp, projected with `@irongate/rules` on read. The City Day is
 * settled lazily on first touch (ADR 0005); Party-order progress is embedded (ADR 0009).
 */
export interface CharacterDoc {
  _id: Types.ObjectId;
  /** Better Auth user id. */
  userId: string;
  name: string;
  factionId: FactionId;
  homeCityId: string;
  /** Where the character is now; equals homeCityId until travel (slice 4). */
  cityId: string;
  /** The face chosen at sign-up; null only for characters migrated from slices 0–1 (ADR 0016). */
  avatarId: string | null;
  /** Worn CHA = chaBase (the origin's base, 0–4) + what is equipped (§8.2, ADR 0014). */
  stats: { str: number; int: number; agi: number; chaBase: number };
  /** `updatedAt` only advances by whole 10-minute ticks, never to "now". */
  energy: { value: number; updatedAt: Date };
  /** Shares energy.updatedAt: it only changes when Energy is projected and written. */
  rested: number;
  xp: number;
  level: number;
  fxp: number;
  iron: number;
  /** §5.3: +1 per level gained, placed on STR, INT or AGI (review 1); never expires. */
  statPointsPending: number;
  /** 1..7, denormalised from fxp (§5.4). */
  rank: number;
  /** Political Capital, 0..1000 (§6.5). */
  pc: number;
  /** §13.4: Successes on checked actions per city. */
  localStanding: Array<{ cityId: string; successes: number }>;
  job: StoredJob | null;
  /** ADR 0005: the last City Day whose boundary has been applied; null for a new character. */
  day: { settled: DayKey | null };
  orders: StoredOrders;
  /**
   * Review 1 (GDD §13.7): the City Day whose orders-complete note was seen (Carry on). The note shows
   * while today's three are done and this is not today, so it waits if the tab closes first.
   */
  ordersNoteSeenDay?: DayKey | null;
  /** §3.7: the current City Day's running totals. */
  today: DailyTally;
  /** Drives "the paper is due after 3 h" (§3.3). */
  lastActionAt: Date | null;
  /** The origin, frozen at join (ADR 0011); later chapters read it. */
  origin: {
    answers: Array<{ questionId: string; answerId: string }>;
    arrivedAt: Date;
    /** Characters from slices 0–1, given the reference answers (ADR 0016). */
    migrated?: true;
  };
  /** §17.1, ADR 0013: the Ambition in progress. `history[].logId` is the actionLogs id (hex). */
  ambition: AmbitionState;
  /** ADR 0014: owned instances; equipment points at their uids. */
  inventory: InventoryEntry[];
  equipment: Equipment;
  /**
   * Slice 3 (ADR 0020): a settlement projection of the seats held today, from `officeTerms`.
   * Display only; every permission re-reads `officeTerms`.
   */
  offices: Array<{
    termId: Types.ObjectId;
    cityId: string;
    councilKey: string;
    seat: number;
    fromDay: DayKey;
    toDay: DayKey;
  }>;
  /** Slice 3 (ADR 0018): the one-per-cycle endorsement guard; the last four, newest last. */
  endorsementsGiven: Array<{ electionId: string; candidacyId: Types.ObjectId; name: string; day: DayKey }>;
  /** Slice 3: the first ballot ever cast (Finish His Work chapter 2 opens after it, design §17.7). */
  firstBallotAt?: Date | null;
  /** The admin boost script's mark (playtest seeding): the report separates boosted testers. */
  playtest?: { boosted: true; boostedAt: Date; from: { fxp: number; rank: number; successes: number } };
  /** Optimistic guard, +1 per game write (ADR 0002). */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const int = { type: Number, required: true, validate: Number.isInteger } as const;

const orderItemSchema = new Schema<StoredOrderItem>(
  {
    templateId: { type: String, required: true },
    variant: { type: String, enum: ['main', 'noJob'], required: true },
    target: int,
    progress: int,
    doneAt: { type: Date, default: null },
  },
  { _id: false },
);

const jobSchema = new Schema<StoredJob>(
  {
    id: { type: String, required: true },
    since: int,
    seniority: { ...int, default: 0 },
  },
  { _id: false },
);

const tallySchema = new Schema<DailyTally>(
  {
    day: { type: Number, default: null },
    energy: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    successes: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    fxp: { type: Number, default: 0 },
    iron: { type: Number, default: 0 },
    pc: { type: Number, default: 0 },
    opinion: { type: Number, default: 0 },
    ordersDone: { type: Number, default: 0 },
    statTrained: { type: Number, default: 0 },
  },
  { _id: false },
);

const characterSchema = new Schema<CharacterDoc>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    factionId: { type: String, enum: FACTION_IDS, required: true },
    homeCityId: { type: String, required: true },
    cityId: { type: String, required: true },
    stats: {
      str: int,
      int: int,
      agi: int,
      chaBase: int,
    },
    energy: {
      value: { type: Number, required: true, min: 0 },
      updatedAt: { type: Date, required: true },
    },
    rested: { type: Number, required: true, min: 0 },
    xp: { type: Number, required: true, min: 0 },
    level: { type: Number, required: true, min: 1 },
    fxp: { type: Number, required: true, min: 0 },
    iron: { type: Number, required: true, min: 0 },
    statPointsPending: { type: Number, required: true, min: 0, default: 0 },
    rank: { type: Number, required: true, min: 1, default: 1 },
    pc: { type: Number, required: true, min: 0, default: 0 },
    localStanding: {
      type: [new Schema({ cityId: { type: String, required: true }, successes: int }, { _id: false })],
      default: [],
    },
    job: { type: jobSchema, default: null },
    day: { settled: { type: Number, default: null } },
    orders: {
      day: { type: Number, default: 0 },
      items: { type: [orderItemSchema], default: [] },
      allDoneAt: { type: Date, default: null },
    },
    ordersNoteSeenDay: { type: Number, default: null },
    today: { type: tallySchema, default: () => ({}) },
    lastActionAt: { type: Date, default: null },
    avatarId: { type: String, default: null },
    origin: {
      answers: {
        type: [new Schema({ questionId: String, answerId: String }, { _id: false })],
        default: [],
      },
      arrivedAt: { type: Date },
      migrated: { type: Boolean },
    },
    ambition: {
      id: { type: String },
      chapter: { type: Number },
      step: { type: String, enum: ['choose', 'check'] },
      choiceId: { type: String, default: null },
      flags: { type: [String], default: undefined },
      history: {
        type: [
          new Schema(
            {
              chapter: Number,
              day: Number,
              choiceId: { type: String, default: null },
              approachId: String,
              outcome: { type: String, enum: ['success', 'partial', 'failure'] },
              logId: String,
            },
            { _id: false },
          ),
        ],
        default: undefined,
      },
    },
    inventory: {
      type: [
        new Schema(
          {
            uid: { type: String, required: true },
            itemId: { type: String, required: true },
            day: { type: Number, required: true },
            source: { type: String, enum: ['kit', 'origin', 'chapter', 'migration'], required: true },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
    equipment: {
      clothing: { type: String, default: null },
      document: { type: String, default: null },
    },
    offices: {
      type: [
        new Schema(
          {
            termId: { type: Schema.Types.ObjectId, required: true },
            cityId: { type: String, required: true },
            councilKey: { type: String, required: true },
            seat: int,
            fromDay: int,
            toDay: int,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    endorsementsGiven: {
      type: [
        new Schema(
          {
            electionId: { type: String, required: true },
            candidacyId: { type: Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            day: int,
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    firstBallotAt: { type: Date, default: undefined },
    playtest: {
      type: new Schema(
        { boosted: Boolean, boostedAt: Date, from: { fxp: Number, rank: Number, successes: Number } },
        { _id: false },
      ),
      default: undefined,
    },
    version: { type: Number, required: true, min: 0 },
  },
  { collection: 'characters', strict: true, timestamps: true, versionKey: false, minimize: false },
);

// One character per user: the join's natural key (ADR 0011).
characterSchema.index({ userId: 1 }, { unique: true });
// Slice 3: the eligibility counts (turnout, the small-branch rule).
characterSchema.index({ homeCityId: 1, rank: 1, lastActionAt: -1 });

export const Character = model<CharacterDoc>('Character', characterSchema);
