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
import { bailSchema } from './stay';
import type { StayKind, StoredBail } from './stay';

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
  /**
   * Review 4 #20 (ADR 0078): the day's orders taken off the board by an arrest. It lives inside the
   * object the settlement replaces each City Day, so it ends at the day's turn (absent = null).
   */
  off?: { at: Date; reason: 'cells' } | null;
}

/**
 * Slice 4 (ADR 0026): where the character votes, stands, reads and takes orders. Migration 006
 * sets it to the home city with every window at 0.
 */
export interface StoredResidence {
  cityId: string;
  districtId: string | null;
  sinceDay: DayKey;
  votesFromDay: DayKey;
  standsFromDay: DayKey;
  canMoveFromDay: DayKey;
}

/** Slice 4 (ADR 0025): the pointer to the open journey, until the arrival modal is closed. */
export interface StoredJourney {
  id: Types.ObjectId;
  from: string;
  to: string;
  boardedAt: Date;
  arrivesAt: Date;
  status: 'onTheWay' | 'arrived';
}

/** Slice 5: the day's tally gains the missions and the rival city acted in today (tech design §5.1). */
export type StoredTally = DailyTally & {
  missions?: number;
  rivalCityId?: string | null;
};

/** Slice 5 (ADR 0033): one unit on the record; the level and the fading are computed on read. */
export interface StoredMark {
  day: DayKey;
  kind: 'minor' | 'moderate' | 'serious';
  /** The `actionLogs` id (hex) of the offence, or null. */
  logId: string | null;
}

/** Slice 5 (ADR 0033): the record. Marks oldest first; `arrests` the last three (the escalation). */
export interface StoredRecord {
  marks: StoredMark[];
  arrests: DayKey[];
}

/**
 * Slice 5 (ADR 0033): the pointer to the stay in the cells or the infirmary. `out`: released, the
 * release modal not yet closed (`held.close`).
 */
export interface StoredHeld {
  stayId: Types.ObjectId;
  kind: StayKind;
  cityId: string;
  locationId: string;
  since: Date;
  until: Date;
  bail: StoredBail | null;
  rivalGround: boolean;
  state: 'in' | 'out';
}

/** Slice 5 (ADR 0032): the pointer to the run-in, until its result modal is closed. */
export interface StoredRunIn {
  encounterId: Types.ObjectId;
  state: 'pending' | 'resolved';
  day: DayKey;
  decideBy: Date;
  cityId: string;
}

/** Slice 5: a hostile card's day flag on a city (pruned to today at every write). */
export interface StoredFlag {
  cityId: string;
  day: DayKey;
  flag: 'watched' | 'warned';
}

/** Slice 5: a city the character is barred from after a deportation (pruned at every write). */
export interface StoredBar {
  cityId: string;
  until: Date;
}

/** Slice 5: when each one-time card was shown (`hl.*.mission-first` and the like). */
export interface StoredFirsts {
  mission?: Date;
  noticed?: Date;
  hot?: Date;
  wanted?: Date;
  mark?: Date;
  /** QA m5: the first crossing into each record level (its card). `mark` stands for `onFile` before. */
  onFile?: Date;
  repeat?: Date;
  notorious?: Date;
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
  /**
   * Where the character stands. Slice 4 (ADR 0025): the city left until a journey arrives; being on
   * a train is `journey.status = 'onTheWay'`.
   */
  cityId: string;
  /** The face chosen at sign-up; null only for characters migrated from slices 0–1 (ADR 0016). */
  avatarId: string | null;
  /**
   * Worn CHA = chaBase (the origin's base, 0–4) + what is equipped (§8.2, ADR 0014). Slice 5:
   * `agiQuarters` 0–3, a quarter point of Agility per Agility Success (design §4.1).
   */
  stats: { str: number; int: number; agi: number; chaBase: number; agiQuarters?: number };
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
  /** §3.7: the current City Day's running totals (slice 5: `missions`, `rivalCityId`). */
  today: StoredTally;
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
  /**
   * Slice 3 (ADR 0018): the one-per-cycle endorsement guard; the last four, newest last. Slice 4:
   * `cityCycle` keys the guard per city and cycle ('irongate:4146'; at home the election id).
   */
  endorsementsGiven: Array<{
    electionId: string;
    candidacyId: Types.ObjectId;
    name: string;
    day: DayKey;
    cityCycle?: string;
  }>;
  /** Slice 3: the first ballot ever cast (Finish His Work chapter 2 opens after it, design §17.7). */
  firstBallotAt?: Date | null;
  // Slice 4 (tech design §5.7). Optional at the type level until every reader takes the residence
  // seam; the schema's defaults and migration 006 set them on every document.
  residence?: StoredResidence;
  journey?: StoredJourney | null;
  journeysMade?: number;
  /**
   * The journey cards drawn this round (reset after seven). Slice 5: `firstDone`, the passenger card
   * shown (the first journey that is not to rival ground).
   */
  journeyDeck?: { seen: string[]; firstDone?: boolean };
  room?: { cityId: string; fromDay: DayKey; untilDay: DayKey } | null;
  firstCapitalArrivalAt?: Date | null;
  /** The reporter's quote (`hl.*.quoted` in the next edition). */
  lastQuoted?: { day: DayKey; issueId: string } | null;
  /** The admin boost script's mark (playtest seeding): the report separates boosted testers. */
  playtest?: { boosted: true; boostedAt: Date; from: { fxp: number; rank: number; successes: number } };
  // Slice 5 (tech design §5.1, ADR 0032, 0033). Optional at the type level while slice 4's writers
  // build characters without them; the schema's defaults and migration 007 set them on every document.
  /** 0–100 at `at`, whole points; cools lazily (ADR 0033). */
  heat?: { value: number; at: Date };
  /** Health = max − damage at `at`, max = 100 + 5 × level; regenerates lazily (ADR 0033). */
  health?: { damage: number; at: Date };
  record?: StoredRecord;
  held?: StoredHeld | null;
  runIn?: StoredRunIn | null;
  /**
   * Review 5 fix round (QA m5): resolved run-ins whose result has not been closed yet, oldest first,
   * moved off the pointer when a new run-in starts (a second tab or device). Each stays on the gate,
   * after the pointer's own, until `encounter.close` takes it off. Absent on older documents (= []).
   */
  runInUnseen?: StoredRunIn[];
  /** The way remembered per mission: the second time is one tap. */
  ways?: Array<{ missionId: string; wayId: string }>;
  flags?: StoredFlag[];
  barred?: StoredBar[];
  /** The hostile deck's rotation (reset when all seen). */
  hostileDeck?: { seen: string[] };
  // Slice 6 (tech design §5.4). Optional at the type level while older writers build characters
  // without them; the schema's defaults and migration 010 set them on every document.
  /** ADR 0040: where and when the character was last seen; touched without bumping `version`. */
  presence?: StoredPresence;
  /** ADR 0036, 0037: open sign-ups (≤ 3), calls withdrawn from, result modals not yet seen (≤ 10). */
  events?: StoredEvents;
  chat?: { hidden: boolean; seenAt: Date | null };
  /** Muted characters (≤ 200). */
  mutes?: Types.ObjectId[];
  /** Lower-cased words of the name (the Members search). */
  nameWords?: string[];
  rivalTrips?: number;
  firsts?: StoredFirsts;
  /**
   * Review 5 (ADR 0081): the night patrol on rival ground. Absent reads as no nights, no quiet and no
   * card; written only by the city read's roll, the answer, and the quiet writers' `$max`.
   */
  patrol?: StoredPatrol;
  /** Optimistic guard, +1 per game write (ADR 0002). */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const int = { type: Number, required: true, validate: Number.isInteger } as const;

/** Review 5 (ADR 0081): one city's night (the last bucket rolled, the stops). */
export interface StoredPatrolNight {
  cityId: string;
  night: number;
  bucket: number;
  stops: number;
}
export interface StoredPatrolCard {
  id: Types.ObjectId;
  cityId: string;
  night: number;
  bucket: number;
  at: Date;
  seed: string;
}
export interface StoredPatrol {
  nights?: StoredPatrolNight[];
  quietUntil?: Date | null;
  card?: StoredPatrolCard | null;
}

const patrolNightSchema = new Schema<StoredPatrolNight>(
  { cityId: { type: String, required: true }, night: int, bucket: int, stops: int },
  { _id: false },
);
const patrolCardSchema = new Schema<StoredPatrolCard>(
  {
    id: { type: Schema.Types.ObjectId, required: true },
    cityId: { type: String, required: true },
    night: int,
    bucket: int,
    at: { type: Date, required: true },
    seed: { type: String, required: true },
  },
  { _id: false },
);
const patrolSchema = new Schema<StoredPatrol>(
  {
    nights: { type: [patrolNightSchema], default: undefined },
    quietUntil: { type: Date, default: undefined },
    card: { type: patrolCardSchema, default: undefined },
  },
  { _id: false },
);

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

const tallySchema = new Schema<StoredTally>(
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
    // Slice 5 (tech design §5.1).
    missions: { type: Number, default: 0 },
    rivalCityId: { type: String, default: null },
  },
  { _id: false },
);

// Slice 5 (tech design §5.1, ADR 0032, 0033): the embedded risk state.
const markSchema = new Schema<StoredMark>(
  {
    day: int,
    kind: { type: String, enum: ['minor', 'moderate', 'serious'], required: true },
    logId: { type: String, default: null },
  },
  { _id: false },
);

const recordSchema = new Schema<StoredRecord>(
  {
    marks: { type: [markSchema], default: [] },
    arrests: { type: [Number], default: [] },
  },
  { _id: false },
);

const heldSchema = new Schema<StoredHeld>(
  {
    stayId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ['cells', 'infirmary'], required: true },
    cityId: { type: String, required: true },
    locationId: { type: String, required: true },
    since: { type: Date, required: true },
    until: { type: Date, required: true },
    bail: { type: bailSchema, default: null },
    rivalGround: { type: Boolean, required: true },
    state: { type: String, enum: ['in', 'out'], required: true },
  },
  { _id: false },
);

const runInSchema = new Schema<StoredRunIn>(
  {
    encounterId: { type: Schema.Types.ObjectId, required: true },
    state: { type: String, enum: ['pending', 'resolved'], required: true },
    day: int,
    decideBy: { type: Date, required: true },
    cityId: { type: String, required: true },
  },
  { _id: false },
);

const waySchema = new Schema(
  { missionId: { type: String, required: true }, wayId: { type: String, required: true } },
  { _id: false },
);

const flagSchema = new Schema<StoredFlag>(
  {
    cityId: { type: String, required: true },
    day: int,
    flag: { type: String, enum: ['watched', 'warned'], required: true },
  },
  { _id: false },
);

const barSchema = new Schema<StoredBar>(
  { cityId: { type: String, required: true }, until: { type: Date, required: true } },
  { _id: false },
);

// `minimize: false`: an empty `{}` is stored, the same as migration 007 writes.
const firstsSchema = new Schema<StoredFirsts>(
  { mission: Date, noticed: Date, hot: Date, wanted: Date, mark: Date, onFile: Date, repeat: Date, notorious: Date },
  { _id: false, minimize: false },
);

// Slice 6 (tech design §5.4).
export interface StoredPresence {
  locationId: string | null;
  seenAt: Date | null;
}
export interface StoredEventOpen {
  signupId: Types.ObjectId;
  eventId: Types.ObjectId;
  cityId: string;
  startsAt: Date;
  /** A role id, or 'hand'. */
  slot: string;
  energy: number;
}
export interface StoredEvents {
  open: StoredEventOpen[];
  calls: Array<{ eventId: Types.ObjectId; startsAt: Date }>;
  unseen: Array<{ kind: 'result' | 'calledOff'; eventId: Types.ObjectId; signupId: Types.ObjectId | null }>;
}

const presenceSchema = new Schema<StoredPresence>(
  { locationId: { type: String, default: null }, seenAt: { type: Date, default: null } },
  { _id: false },
);
const eventsSchema = new Schema<StoredEvents>(
  {
    open: {
      type: [
        new Schema<StoredEventOpen>(
          {
            signupId: { type: Schema.Types.ObjectId, required: true },
            eventId: { type: Schema.Types.ObjectId, required: true },
            cityId: { type: String, required: true },
            startsAt: { type: Date, required: true },
            slot: { type: String, required: true },
            energy: { type: Number, required: true, min: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    calls: {
      type: [
        new Schema(
          { eventId: { type: Schema.Types.ObjectId, required: true }, startsAt: { type: Date, required: true } },
          { _id: false },
        ),
      ],
      default: [],
    },
    unseen: {
      type: [
        new Schema(
          {
            kind: { type: String, enum: ['result', 'calledOff'], required: true },
            eventId: { type: Schema.Types.ObjectId, required: true },
            signupId: { type: Schema.Types.ObjectId, default: null },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { _id: false, minimize: false },
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
      // Slice 5: a quarter point per Agility Success; four make a point of Agility.
      agiQuarters: { type: Number, default: 0, min: 0, max: 3, validate: Number.isInteger },
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
      off: {
        type: new Schema(
          { at: { type: Date, required: true }, reason: { type: String, enum: ['cells'], required: true } },
          { _id: false },
        ),
        default: undefined,
      },
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
            cityCycle: { type: String },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    firstBallotAt: { type: Date, default: undefined },
    // Slice 4 (ADR 0025, 0026).
    residence: {
      type: new Schema(
        {
          cityId: { type: String, required: true },
          districtId: { type: String, default: null },
          sinceDay: int,
          votesFromDay: int,
          standsFromDay: int,
          canMoveFromDay: int,
        },
        { _id: false },
      ),
      // A new character lives at home, every window open (the same as migration 006).
      default: function (this: { homeCityId?: string }) {
        return this.homeCityId
          ? {
              cityId: this.homeCityId,
              districtId: null,
              sinceDay: 0,
              votesFromDay: 0,
              standsFromDay: 0,
              canMoveFromDay: 0,
            }
          : undefined;
      },
    },
    journey: {
      type: new Schema(
        {
          id: { type: Schema.Types.ObjectId, required: true },
          from: { type: String, required: true },
          to: { type: String, required: true },
          boardedAt: { type: Date, required: true },
          arrivesAt: { type: Date, required: true },
          status: { type: String, enum: ['onTheWay', 'arrived'], required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    journeysMade: { type: Number, default: 0 },
    journeyDeck: {
      type: new Schema(
        {
          seen: { type: [String], default: [] },
          // Slice 5: migration 007 sets it from `journeysMade > 0`.
          firstDone: { type: Boolean, default: false },
        },
        { _id: false },
      ),
      default: () => ({ seen: [], firstDone: false }),
    },
    room: {
      type: new Schema({ cityId: String, fromDay: Number, untilDay: Number }, { _id: false }),
      default: null,
    },
    firstCapitalArrivalAt: { type: Date, default: null },
    lastQuoted: {
      type: new Schema({ day: Number, issueId: String }, { _id: false }),
      default: null,
    },
    playtest: {
      type: new Schema(
        { boosted: Boolean, boostedAt: Date, from: { fxp: Number, rank: Number, successes: Number } },
        { _id: false },
      ),
      default: undefined,
    },
    // Slice 5 (tech design §5.1): a new character starts cool, unhurt, with a clean record (the same
    // as migration 007).
    heat: {
      type: new Schema(
        { value: { type: Number, required: true, min: 0, max: 100 }, at: { type: Date, required: true } },
        { _id: false },
      ),
      default: () => ({ value: 0, at: new Date() }),
    },
    health: {
      type: new Schema(
        { damage: { type: Number, required: true, min: 0 }, at: { type: Date, required: true } },
        { _id: false },
      ),
      default: () => ({ damage: 0, at: new Date() }),
    },
    record: { type: recordSchema, default: () => ({ marks: [], arrests: [] }) },
    held: { type: heldSchema, default: null },
    runIn: { type: runInSchema, default: null },
    runInUnseen: { type: [runInSchema], default: [] },
    ways: { type: [waySchema], default: [] },
    flags: { type: [flagSchema], default: [] },
    barred: { type: [barSchema], default: [] },
    hostileDeck: {
      type: new Schema({ seen: { type: [String], default: [] } }, { _id: false }),
      default: () => ({ seen: [] }),
    },
    rivalTrips: { type: Number, default: 0, min: 0 },
    firsts: { type: firstsSchema, default: () => ({}) },
    // Review 5 (ADR 0081): absent until the first roll (no migration).
    patrol: { type: patrolSchema, default: undefined },
    // Slice 6 (tech design §5.4): the same defaults as migration 010.
    presence: { type: presenceSchema, default: () => ({ locationId: null, seenAt: null }) },
    events: { type: eventsSchema, default: () => ({ open: [], calls: [], unseen: [] }) },
    chat: {
      type: new Schema({ hidden: { type: Boolean, default: false }, seenAt: { type: Date, default: null } }, { _id: false }),
      default: () => ({ hidden: false, seenAt: null }),
    },
    mutes: { type: [Schema.Types.ObjectId], default: [] },
    nameWords: { type: [String], default: [] },
    version: { type: Number, required: true, min: 0 },
  },
  { collection: 'characters', strict: true, timestamps: true, versionKey: false, minimize: false },
);

// One character per user: the join's natural key (ADR 0011).
characterSchema.index({ userId: 1 }, { unique: true });
// Slice 4 (tech design §5.7): the eligibility counts (turnout, the small branch) count residents.
characterSchema.index({
  'residence.cityId': 1,
  'residence.districtId': 1,
  factionId: 1,
  rank: 1,
  lastActionAt: -1,
});
// Slice 4 (ADR 0025): the tidy job and the report find characters on a train.
characterSchema.index({ 'journey.status': 1 }, { partialFilterExpression: { 'journey.status': 'onTheWay' } });

// Review 4 #19 (ADR 0078): *In the cells now* on a police station's sheet reads the players held there.
characterSchema.index(
  { 'held.locationId': 1, 'held.until': 1 },
  { partialFilterExpression: { 'held.state': 'in', 'held.kind': 'cells' }, name: 'held_cells_now' },
);

// Slice 6 (tech design §5.4, ADR 0040): Members and the chat header by recency; *Here now* at a place;
// the Members search.
characterSchema.index({ factionId: 1, 'presence.seenAt': -1 }, { name: 'presence_faction' });
characterSchema.index(
  { 'presence.locationId': 1, 'presence.seenAt': -1 },
  { partialFilterExpression: { 'presence.locationId': { $type: 'string' } }, name: 'presence_here' },
);
characterSchema.index({ factionId: 1, nameWords: 1 }, { name: 'name_words' });

export const Character = model<CharacterDoc>('Character', characterSchema);
