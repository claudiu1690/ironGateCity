import type { PoliticalResult, PriceLine } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

export type StayKind = 'cells' | 'infirmary';
export type StayReason = 'caught' | 'wanted' | 'policeLoss' | 'runInLost' | 'dev';
/** Slice 6 (ADR 0041): `bailPosted`, out on a faction mate's bail. */
export type StayHow = 'served' | 'bail' | 'walkOut' | 'discharge' | 'bailPosted';

/** Slice 6 (ADR 0041): the mate who posted the bail, and what they paid. */
export interface StayBailPostedBy {
  characterId: Types.ObjectId;
  name: string;
  at: Date;
  iron: number;
}

/** Slice 6 (design §9.2): a visit on the ward; the first three of a stay count. */
export interface StayVisit {
  characterId: Types.ObjectId;
  name: string;
  at: Date;
  counted: boolean;
}

/**
 * The bail asked at the arrest, with each source's line (ADR 0030); the same on the pointer.
 * `base` (before the lines) is kept when the writer gives it, so a rules `Bail` stores whole.
 */
export interface StoredBail {
  base?: number;
  total: number;
  lines: PriceLine[];
}

const priceLineSchema = new Schema<PriceLine>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    pct: { type: Number, required: true },
  },
  { _id: false },
);

/** Shared with `character.held.bail`. */
export const bailSchema = new Schema<StoredBail>(
  {
    base: { type: Number, min: 0 },
    total: { type: Number, required: true, min: 0 },
    lines: { type: [priceLineSchema], default: [] },
  },
  { _id: false },
);

/**
 * Slice 5 (ADR 0033, tech design §5.3): one document per stay in the cells or the infirmary. The
 * character carries the pointer (`character.held`) until the release modal is closed; this is the
 * history for the paper, the playtest report and slice 6. Release is written on read as of
 * `until` (or by bail, walking out, discharging), and stores the release modal in `result` once.
 */
export interface StayDoc {
  _id: Types.ObjectId;
  characterId: Types.ObjectId;
  kind: StayKind;
  cityId: string;
  locationId: string;
  rivalGround: boolean;
  reason: StayReason;
  /** The `actionLogs` row of the act that caused it. */
  logId: Types.ObjectId | null;
  /** The run-in that caused it. */
  encounterId: Types.ObjectId | null;
  since: Date;
  until: Date;
  minutes: number;
  heatAtArrest: number | null;
  /** Marks added by this arrest (0 for the infirmary). */
  marks: number;
  /** A second arrest within seven days, or a second stay (the "You again" line). */
  again: boolean;
  bail: StoredBail | null;
  releasedAt: Date | null;
  how: StayHow | null;
  ironPaid: number;
  heatAfter: number | null;
  healthAfter: number | null;
  /** The train home on release from the cells on rival ground. */
  deportJourneyId: Types.ObjectId | null;
  barredUntil: Date | null;
  /** The release modal, stored once. */
  result: PoliticalResult | null;
  closedAt: Date | null;
  /** Slice 6 (ADR 0041): a faction mate's bail. */
  bailPostedBy: StayBailPostedBy | null;
  /** Slice 6 (design §9.2): visitors, once each per stay. */
  visits: StayVisit[];
  createdAt: Date;
  updatedAt: Date;
}

const nullableNum = { type: Number, default: null } as const;

const staySchema = new Schema<StayDoc>(
  {
    characterId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ['cells', 'infirmary'], required: true },
    cityId: { type: String, required: true },
    locationId: { type: String, required: true },
    rivalGround: { type: Boolean, required: true },
    reason: { type: String, enum: ['caught', 'wanted', 'policeLoss', 'runInLost', 'dev'], required: true },
    logId: { type: Schema.Types.ObjectId, default: null },
    encounterId: { type: Schema.Types.ObjectId, default: null },
    since: { type: Date, required: true },
    until: { type: Date, required: true },
    minutes: { type: Number, required: true, min: 0 },
    heatAtArrest: nullableNum,
    marks: { type: Number, required: true, min: 0, validate: Number.isInteger },
    again: { type: Boolean, required: true },
    bail: { type: bailSchema, default: null },
    releasedAt: { type: Date, default: null },
    how: { type: String, enum: ['served', 'bail', 'walkOut', 'discharge', 'bailPosted', null], default: null },
    ironPaid: { type: Number, default: 0, min: 0 },
    heatAfter: nullableNum,
    healthAfter: nullableNum,
    deportJourneyId: { type: Schema.Types.ObjectId, default: null },
    barredUntil: { type: Date, default: null },
    result: { type: Schema.Types.Mixed, default: null },
    closedAt: { type: Date, default: null },
    bailPostedBy: {
      type: new Schema<StayBailPostedBy>(
        {
          characterId: { type: Schema.Types.ObjectId, required: true },
          name: { type: String, required: true },
          at: { type: Date, required: true },
          iron: { type: Number, required: true, min: 0 },
        },
        { _id: false },
      ),
      default: null,
    },
    visits: {
      type: [
        new Schema<StayVisit>(
          {
            characterId: { type: Schema.Types.ObjectId, required: true },
            name: { type: String, required: true },
            at: { type: Date, required: true },
            counted: { type: Boolean, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { collection: 'stays', strict: true, timestamps: true, versionKey: false, minimize: false },
);

// History: the character's stays, newest first (the "You again" line, the report).
staySchema.index({ characterId: 1, since: -1 });
// The settlement's yesterday read: stays released yesterday.
staySchema.index({ characterId: 1, releasedAt: -1 });
// Slice 6 (tech design §5.5): the payer's paper (*bail posted by*).
staySchema.index(
  { 'bailPostedBy.characterId': 1, 'bailPostedBy.at': -1 },
  { partialFilterExpression: { 'bailPostedBy.characterId': { $exists: true } }, name: 'stay_bail_posted_by' },
);

export const Stay = model<StayDoc>('Stay', staySchema);
