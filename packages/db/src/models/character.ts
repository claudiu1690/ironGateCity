import { FACTION_IDS } from '@irongate/rules';
import type {
  AmbitionState,
  DailyTally,
  DayKey,
  Equipment,
  FactionId,
  InventoryEntry,
  OutfitId,
  PatronId,
  PatronTier,
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
  /** Slice 7 (ADR 0046): the Chair's pushed place and whether the item's attempts count. */
  push?: { cityId: string; districtId: string | null; counts: boolean };
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
  /** Slice 7 (ADR 0046): "Set by the Chair, {name}" (absent or null: the secretary's). */
  setBy?: { characterId: Types.ObjectId; name: string } | null;
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
  /** Slice 8 (ADR 0051): *Change into plain clothes*, applied by `settleArrival`. */
  dress?: 'plain' | null;
}

/** Slice 5: the day's tally gains the missions and the rival city acted in today (tech design §5.1). */
export type StoredTally = DailyTally & {
  missions?: number;
  rivalCityId?: string | null;
  // Slice 8 (tech design §5.6, §24.4): the day's limits.
  /** Society calls made today, by place. */
  calls?: string[];
  /** Gifts given today, by patron. */
  gifts?: PatronId[];
  /** The day's one exposé (step 2 attempted). */
  expose?: boolean;
  /** The back room's one bribe a day. */
  bribe?: boolean;
  /** Rounds bought today (0–3). */
  rounds?: number;
};

// Slice 8 (tech design §5.6; ADR 0051, 0053–0057). Optional at the type level while older writers
// build characters without them; the schema's defaults and migration 012 set them on every document.

export interface StoredOutfits {
  town: Equipment;
  plain: Equipment;
  /** Null until a flat is bought. */
  evening: Equipment | null;
}

export interface StoredPatronRequest {
  id: string;
  arrivedDay: DayKey;
  untilDay: DayKey;
  target: number;
  progress: number;
  doneAt: Date | null;
  params: { districtId?: string; issueId?: string };
}

export interface StoredPatron {
  id: PatronId;
  /** 0–100, never falls. */
  favour: number;
  firstVisitDay: DayKey | null;
  /** At most two open. */
  requests: StoredPatronRequest[];
  /** The rotation pointer. */
  next: number;
  tierDays: Partial<Record<PatronTier, DayKey>>;
  /** The weekly favour last called. */
  favourDay: DayKey | null;
  /** Marr's: the bribe at half price through this day. */
  discretionUntil: DayKey | null;
  /** The last boundary's paid Requests (the paper), at most four. */
  thanks: Array<{ requestId: string; day: DayKey }>;
}

export interface StoredLegacy {
  total: number;
  spent: number;
  perks: { party: number; dossier: number; sleep: number; walk: number; name: number; monday: number; friends: number; quiet: number };
}

export interface StoredMilestones {
  caseFileAt: Date | null;
  chairVoteAt: Date | null;
  nationalVoteAt: Date | null;
  listAt: Date | null;
  deputyFromDay: DayKey | null;
  completed: { council: number; governor: number; chair: number; deputy: number; president: number };
}

export interface StoredExpose {
  fileId: Types.ObjectId;
  angle: 'plain' | 'headline';
  locationId: string;
  day: DayKey;
}

/** Tech design §24.4 (ADR 0088): one contract at a time, kept after a lapse (his name for a re-hire). */
export interface StoredBodyguard {
  tier: 1 | 2 | 3;
  name: string;
  paidThroughDay: DayKey;
}

export interface StoredBuffs {
  wellFed: { tier: 'plate' | 'dinner'; until: Date } | null;
  spirits: { left: number };
}

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
  /** Slice 8: the first coat bought (`wardrobe-first`) and the first time recognised. */
  coat?: Date;
  recognised?: Date;
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
    /** Slice 7 (ADR 0048): the office (absent on old entries: `council`); `key` the term's key. */
    office?: 'council' | 'governor' | 'chair' | 'deputy' | 'president';
    key?: string;
  }>;
  /**
   * Slice 7 (ADR 0047): one backing per Chair election and per national election; the current and
   * the previous term's (≤ 6). Separate from the council's `endorsementsGiven` (pruned too fast).
   */
  termBackings?: Array<{ key: string; candidacyId: Types.ObjectId; name: string; day: DayKey }>;
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
  // Slice 8 (tech design §5.6, §24.4).
  outfits?: StoredOutfits;
  lastOutfit?: OutfitId;
  patrons?: StoredPatron[];
  home?: { flat: { cityId: string; boughtDay: DayKey; paidThroughDay: DayKey } | null };
  legacy?: StoredLegacy;
  milestones?: StoredMilestones;
  /** The exposé's step 1, set once; null between stories. */
  expose?: StoredExpose | null;
  /** Names burned for this player (14 days), pruned at every write. */
  dossierBurns?: Array<{ subjectId: string; until: DayKey }>;
  /** The Dossier tab's dot: an entry landed since … */
  dossierLastAt?: Date | null;
  /** Unversioned (ADR 0040's pattern): the tab opened. */
  dossierSeenAt?: Date | null;
  bodyguard?: StoredBodyguard | null;
  buffs?: StoredBuffs;
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
    // Slice 7 (ADR 0046): no default, so items written before it stay as they were.
    push: {
      type: new Schema(
        { cityId: { type: String, required: true }, districtId: { type: String, default: null }, counts: { type: Boolean, required: true } },
        { _id: false },
      ),
      default: undefined,
    },
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
    // Slice 8 (tech design §5.6, §24.4).
    calls: { type: [String], default: [] },
    gifts: { type: [String], default: [] },
    expose: { type: Boolean, default: false },
    bribe: { type: Boolean, default: false },
    rounds: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

// Slice 8 (tech design §5.6): the Wardrobe's sets, patrons, the home, Legacy and the milestones.
const equipmentSchema = new Schema<Equipment>(
  {
    clothing: { type: String, default: null },
    accessory: { type: String, default: null },
    document: { type: String, default: null },
    utility: { type: String, default: null },
  },
  { _id: false },
);
const outfitsSchema = new Schema<StoredOutfits>(
  {
    town: { type: equipmentSchema, required: true },
    plain: { type: equipmentSchema, required: true },
    evening: { type: equipmentSchema, default: null },
  },
  { _id: false },
);
const patronRequestSchema = new Schema<StoredPatronRequest>(
  {
    id: { type: String, required: true },
    arrivedDay: int,
    untilDay: int,
    target: int,
    progress: int,
    doneAt: { type: Date, default: null },
    params: { type: new Schema({ districtId: String, issueId: String }, { _id: false }), default: () => ({}) },
  },
  { _id: false },
);
const patronSchema = new Schema<StoredPatron>(
  {
    id: { type: String, enum: ['crane', 'marr'], required: true },
    favour: { type: Number, required: true, min: 0, max: 100 },
    firstVisitDay: { type: Number, default: null },
    requests: { type: [patronRequestSchema], default: [] },
    next: { type: Number, default: 0, min: 0 },
    tierDays: {
      type: new Schema(
        { acquaintance: Number, associate: Number, confidant: Number, protege: Number },
        { _id: false, minimize: false },
      ),
      default: () => ({}),
    },
    favourDay: { type: Number, default: null },
    discretionUntil: { type: Number, default: null },
    thanks: {
      type: [new Schema({ requestId: { type: String, required: true }, day: int }, { _id: false })],
      default: [],
    },
  },
  { _id: false },
);
const perksDefault = () => ({ party: 0, dossier: 0, sleep: 0, walk: 0, name: 0, monday: 0, friends: 0, quiet: 0 });
const legacySchema = new Schema<StoredLegacy>(
  {
    total: { type: Number, default: 0, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
    perks: {
      type: new Schema(
        {
          party: { type: Number, default: 0 },
          dossier: { type: Number, default: 0 },
          sleep: { type: Number, default: 0 },
          walk: { type: Number, default: 0 },
          name: { type: Number, default: 0 },
          monday: { type: Number, default: 0 },
          friends: { type: Number, default: 0 },
          quiet: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      default: perksDefault,
    },
  },
  { _id: false },
);
const completedDefault = () => ({ council: 0, governor: 0, chair: 0, deputy: 0, president: 0 });
const milestonesSchema = new Schema<StoredMilestones>(
  {
    caseFileAt: { type: Date, default: null },
    chairVoteAt: { type: Date, default: null },
    nationalVoteAt: { type: Date, default: null },
    listAt: { type: Date, default: null },
    deputyFromDay: { type: Number, default: null },
    completed: {
      type: new Schema(
        {
          council: { type: Number, default: 0 },
          governor: { type: Number, default: 0 },
          chair: { type: Number, default: 0 },
          deputy: { type: Number, default: 0 },
          president: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      default: completedDefault,
    },
  },
  { _id: false },
);
const exposeSchema = new Schema<StoredExpose>(
  {
    fileId: { type: Schema.Types.ObjectId, required: true },
    angle: { type: String, enum: ['plain', 'headline'], required: true },
    locationId: { type: String, required: true },
    day: int,
  },
  { _id: false },
);
const bodyguardSchema = new Schema<StoredBodyguard>(
  { tier: { type: Number, enum: [1, 2, 3], required: true }, name: { type: String, required: true }, paidThroughDay: int },
  { _id: false },
);
const buffsSchema = new Schema<StoredBuffs>(
  {
    wellFed: {
      type: new Schema(
        { tier: { type: String, enum: ['plate', 'dinner'], required: true }, until: { type: Date, required: true } },
        { _id: false },
      ),
      default: null,
    },
    spirits: {
      type: new Schema({ left: { type: Number, default: 0, min: 0, max: 9 } }, { _id: false }),
      default: () => ({ left: 0 }),
    },
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
  {
    mission: Date,
    noticed: Date,
    hot: Date,
    wanted: Date,
    mark: Date,
    onFile: Date,
    repeat: Date,
    notorious: Date,
    // Slice 8.
    coat: Date,
    recognised: Date,
  },
  { _id: false, minimize: false },
);

// Slice 6 (tech design §5.4).
export interface StoredPresence {
  locationId: string | null;
  seenAt: Date | null;
  /** Slice 8 (ADR 0052): unversioned; a recognised visitor is counted by the home faction. */
  recognised?: boolean;
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
  {
    locationId: { type: String, default: null },
    seenAt: { type: Date, default: null },
    recognised: { type: Boolean, default: undefined },
  },
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
      setBy: {
        type: new Schema(
          { characterId: { type: Schema.Types.ObjectId, required: true }, name: { type: String, required: true } },
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
            source: {
              type: String,
              // Slice 8: bought at a shop, or a patron's piece.
              enum: ['kit', 'origin', 'chapter', 'migration', 'shop', 'patron'],
              required: true,
            },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
    equipment: {
      clothing: { type: String, default: null },
      // Slice 8 (ADR 0051): the four slots (migration 012 sets the two new ones to null).
      accessory: { type: String, default: null },
      document: { type: String, default: null },
      utility: { type: String, default: null },
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
            // Slice 7 (ADR 0048).
            office: { type: String, enum: ['council', 'governor', 'chair', 'deputy', 'president'] },
            key: { type: String },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    // Slice 7 (ADR 0047): migration 011 sets [] on every character.
    termBackings: {
      type: [
        new Schema(
          {
            key: { type: String, required: true },
            candidacyId: { type: Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            day: int,
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
          // Slice 8 (ADR 0051): dressed for arrival.
          dress: { type: String, enum: ['plain', null], default: null },
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
    // Slice 8 (tech design §5.6, §24.4): the same defaults as migration 012. `outfits` has none: the
    // join and migration 012 build it from the kit (`defaultOutfits`).
    outfits: { type: outfitsSchema, default: undefined },
    lastOutfit: { type: String, enum: ['town', 'plain', 'evening'], default: 'town' },
    patrons: { type: [patronSchema], default: [] },
    home: {
      type: new Schema(
        {
          flat: {
            type: new Schema({ cityId: { type: String, required: true }, boughtDay: int, paidThroughDay: int }, { _id: false }),
            default: null,
          },
        },
        { _id: false },
      ),
      default: () => ({ flat: null }),
    },
    legacy: { type: legacySchema, default: () => ({ total: 0, spent: 0, perks: perksDefault() }) },
    milestones: {
      type: milestonesSchema,
      default: () => ({
        caseFileAt: null,
        chairVoteAt: null,
        nationalVoteAt: null,
        listAt: null,
        deputyFromDay: null,
        completed: completedDefault(),
      }),
    },
    expose: { type: exposeSchema, default: null },
    dossierBurns: {
      type: [new Schema({ subjectId: { type: String, required: true }, until: int }, { _id: false })],
      default: [],
    },
    dossierLastAt: { type: Date, default: null },
    dossierSeenAt: { type: Date, default: null },
    bodyguard: { type: bodyguardSchema, default: null },
    buffs: { type: buffsSchema, default: () => ({ wellFed: null, spirits: { left: 0 } }) },
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
// Slice 7 (tech design §5.9): the faction-wide rolls (the petition on the Chair, turnout).
characterSchema.index({ factionId: 1, rank: 1, lastActionAt: -1 }, { name: 'faction_rank_active' });

export const Character = model<CharacterDoc>('Character', characterSchema);
