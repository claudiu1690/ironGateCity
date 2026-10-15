import { FACTION_IDS } from '@irongate/rules';
import type { DayKey, EventResolution, EventResult, FactionId, PoliticalResult, SignupResultDoc } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/**
 * Slice 6 (ADR 0036, 0037; tech design §5.1): a Campaign Event. The roster (≤ 5 roles, ≤ 4 hands) is
 * embedded: it is read with the event on every board row. The per-place limits are natural keys
 * (one fixture and two member starts a place a City Day; one open member-called event), not counters.
 * The seed is secret: it never reaches a view before resolution.
 */
export interface EventHolder {
  characterId: Types.ObjectId;
  signupId: Types.ObjectId;
  name: string;
  avatarId: string | null;
  rank: number;
  level: number;
  signedAt: Date;
}

export type EventKind = 'member' | 'fixture';
export type EventStatus = 'open' | 'resolved' | 'calledOff';
export type EventCalledBy =
  | { kind: 'member'; characterId: Types.ObjectId; name: string }
  | { kind: 'secretary'; npcId: string };

/** The resolution as stored on the event: the participants' rewards live on their sign-ups. */
export type EventResolutionDoc = Omit<EventResolution, 'participants'> & {
  participants: Array<{ characterId: string; signupId: string; slot: string }>;
};

export interface CampaignEventDoc {
  _id: Types.ObjectId;
  kind: EventKind;
  typeId: string;
  factionId: FactionId;
  cityId: string;
  districtId: string | null;
  /** The district, else the city. */
  placeId: string;
  venueId: string;
  /** The City Day it counts against: a member event dayKey(startsAt); the fixture its posting day. */
  day: DayKey;
  /** 0 the fixture; 1 and 2 the day's member-called starts. */
  dayIndex: 0 | 1 | 2;
  calledBy: EventCalledBy;
  calledAt: Date;
  startsAt: Date;
  /** The Headline Story's target, frozen at the call (tech §22.1 Q7). */
  targetFactionId: FactionId | null;
  /** 32 hex; never in a view before resolution. */
  seed: string;
  /** Content order. */
  roles: Array<{ roleId: string; holder: EventHolder | null }>;
  /** ≤ 4, sign-up order. */
  hands: EventHolder[];
  /** +1 on every roster write. */
  rev: number;
  status: EventStatus;
  result: EventResolutionDoc | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const holderSchema = new Schema<EventHolder>(
  {
    characterId: { type: Schema.Types.ObjectId, required: true },
    signupId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    avatarId: { type: String, default: null },
    rank: { type: Number, required: true, min: 1 },
    level: { type: Number, required: true, min: 1 },
    signedAt: { type: Date, required: true },
  },
  { _id: false },
);

const campaignEventSchema = new Schema<CampaignEventDoc>(
  {
    kind: { type: String, enum: ['member', 'fixture'], required: true },
    typeId: { type: String, required: true },
    factionId: { type: String, enum: FACTION_IDS, required: true },
    cityId: { type: String, required: true },
    districtId: { type: String, default: null },
    placeId: { type: String, required: true },
    venueId: { type: String, required: true },
    day: { type: Number, required: true },
    dayIndex: { type: Number, enum: [0, 1, 2], required: true },
    calledBy: { type: Schema.Types.Mixed, required: true },
    calledAt: { type: Date, required: true },
    startsAt: { type: Date, required: true },
    targetFactionId: { type: String, enum: [...FACTION_IDS, null], default: null },
    seed: { type: String, required: true },
    roles: {
      type: [new Schema({ roleId: { type: String, required: true }, holder: { type: holderSchema, default: null } }, { _id: false })],
      default: [],
    },
    hands: { type: [holderSchema], default: [] },
    rev: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['open', 'resolved', 'calledOff'], required: true },
    result: { type: Schema.Types.Mixed, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { collection: 'campaignEvents', strict: true, timestamps: true, versionKey: false, minimize: false },
);
// One fixture and two member starts a place a City Day (ADR 0036): no counter to race.
campaignEventSchema.index({ factionId: 1, placeId: 1, day: 1, dayIndex: 1 }, { unique: true, name: 'event_place_day' });
// One upcoming member-called event a place.
campaignEventSchema.index(
  { factionId: 1, placeId: 1 },
  { unique: true, partialFilterExpression: { status: 'open', kind: 'member' }, name: 'event_one_open' },
);
// The board (open soonest first; results by startsAt descending), the venue tickets, the paper's row.
campaignEventSchema.index({ factionId: 1, cityId: 1, status: 1, startsAt: 1 }, { name: 'event_board' });
// The city day's catch-up before a boundary.
campaignEventSchema.index({ cityId: 1, day: 1 }, { partialFilterExpression: { status: 'open' }, name: 'event_open_day' });
// The paper's *called off* and the report.
campaignEventSchema.index(
  { 'calledBy.characterId': 1, day: -1 },
  { partialFilterExpression: { 'calledBy.kind': 'member' }, name: 'event_caller' },
);

export const CampaignEvent = model<CampaignEventDoc>('CampaignEvent', campaignEventSchema);

/**
 * Slice 6 (ADR 0036; tech design §5.2): one per tap. The commitment (Energy, Rested, the order
 * bonus), the tap's idempotency record (its stored modal), the per-participant result at resolution
 * and the receipt at credit. Kept with withdrawals: history for the scoreboard, the paper and the
 * report.
 */
export type SignupStatus = 'committed' | 'withdrawn' | 'resolved';

export interface EventSignupDoc {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  characterId: Types.ObjectId;
  factionId: FactionId;
  typeId: string;
  cityId: string;
  placeId: string;
  /** The event's, denormalised for the indexes. */
  day: DayKey;
  startsAt: Date;
  /** A role id, or 'hand'. */
  slot: string;
  /** The tap that called the event. */
  caller: boolean;
  energy: number;
  restedCovered: number;
  /** The event order was open and this tap advanced it. */
  orderBonus: boolean;
  idempotencyKey: string;
  signedAt: Date;
  /** The tap's modal (Called / Signed up), returned on a retry. */
  tap: PoliticalResult;
  status: SignupStatus;
  withdrawnAt: Date | null;
  refund: { energy: number; rested: number } | null;
  /** Written at resolution. */
  result: SignupResultDoc | null;
  /** The modal, written at credit. */
  receipt: EventResult | null;
  creditedAt: Date | null;
  createdAt: Date;
}

const eventSignupSchema = new Schema<EventSignupDoc>(
  {
    eventId: { type: Schema.Types.ObjectId, required: true },
    characterId: { type: Schema.Types.ObjectId, required: true },
    factionId: { type: String, enum: FACTION_IDS, required: true },
    typeId: { type: String, required: true },
    cityId: { type: String, required: true },
    placeId: { type: String, required: true },
    day: { type: Number, required: true },
    startsAt: { type: Date, required: true },
    slot: { type: String, required: true },
    caller: { type: Boolean, default: false },
    energy: { type: Number, required: true, min: 0 },
    restedCovered: { type: Number, default: 0, min: 0 },
    orderBonus: { type: Boolean, default: false },
    idempotencyKey: { type: String, required: true },
    signedAt: { type: Date, required: true },
    tap: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['committed', 'withdrawn', 'resolved'], required: true },
    withdrawnAt: { type: Date, default: null },
    refund: { type: new Schema({ energy: Number, rested: Number }, { _id: false }), default: null },
    result: { type: Schema.Types.Mixed, default: null },
    receipt: { type: Schema.Types.Mixed, default: null },
    creditedAt: { type: Date, default: null },
  },
  {
    collection: 'eventSignups',
    strict: true,
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    minimize: false,
  },
);
// The tap's key (ADR 0002's fast path).
eventSignupSchema.index({ characterId: 1, idempotencyKey: 1 }, { unique: true, name: 'signup_key' });
eventSignupSchema.index({ eventId: 1 }, { name: 'signup_event' });
// *First event today*, the paper's facts, the report.
eventSignupSchema.index({ characterId: 1, day: 1, startsAt: 1 }, { name: 'signup_day' });

export const EventSignup = model<EventSignupDoc>('EventSignup', eventSignupSchema);
