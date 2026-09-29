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

export interface StoredJob {
  id: string;
  since: DayKey;
  streak: number;
  lastShiftDay: DayKey | null;
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
  /** §5.3: +1 per level gained, placed on STR or INT; never expires. */
  statPointsPending: number;
  /** 1..7, denormalised from fxp (§5.4). */
  rank: number;
  /** Political Capital, 0..1000 (§6.5). */
  pc: number;
  /** §13.4: Successes on checked actions per city. */
  localStanding: Array<{ cityId: string; successes: number }>;
  job: StoredJob | null;
  /** The weekly allowance (§9.1), per character so it survives a job switch. */
  sickDays: { week: number; left: number };
  /** ADR 0005: the last City Day whose boundary has been applied; null for a new character. */
  day: { settled: DayKey | null };
  orders: StoredOrders;
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
    streak: int,
    lastShiftDay: { type: Number, default: null },
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
    shiftWorked: { type: Boolean, default: false },
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
    sickDays: { week: { type: Number, default: 0 }, left: { type: Number, default: 2 } },
    day: { settled: { type: Number, default: null } },
    orders: {
      day: { type: Number, default: 0 },
      items: { type: [orderItemSchema], default: [] },
      allDoneAt: { type: Date, default: null },
    },
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
    version: { type: Number, required: true, min: 0 },
  },
  { collection: 'characters', strict: true, timestamps: true, versionKey: false, minimize: false },
);

// One character per user: the join's natural key (ADR 0011).
characterSchema.index({ userId: 1 }, { unique: true });

export const Character = model<CharacterDoc>('Character', characterSchema);
