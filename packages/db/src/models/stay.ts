import type { PoliticalResult, PriceLine } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

export type StayKind = 'cells' | 'infirmary';
export type StayReason = 'caught' | 'wanted' | 'policeLoss' | 'runInLost' | 'dev';
export type StayHow = 'served' | 'bail' | 'walkOut' | 'discharge';

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
  /** Slice 6 (a faction mate's bail): always null in slice 5. */
  bailPostedBy: null;
  /** Slice 6 (visits): always empty in slice 5. */
  visits: unknown[];
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
    how: { type: String, enum: ['served', 'bail', 'walkOut', 'discharge', null], default: null },
    ironPaid: { type: Number, default: 0, min: 0 },
    heatAfter: nullableNum,
    healthAfter: nullableNum,
    deportJourneyId: { type: Schema.Types.ObjectId, default: null },
    barredUntil: { type: Date, default: null },
    result: { type: Schema.Types.Mixed, default: null },
    closedAt: { type: Date, default: null },
    bailPostedBy: { type: Schema.Types.Mixed, default: null },
    visits: { type: [Schema.Types.Mixed], default: [] },
  },
  { collection: 'stays', strict: true, timestamps: true, versionKey: false, minimize: false },
);

// History: the character's stays, newest first (the "You again" line, the report).
staySchema.index({ characterId: 1, since: -1 });
// The settlement's yesterday read: stays released yesterday.
staySchema.index({ characterId: 1, releasedAt: -1 });

export const Stay = model<StayDoc>('Stay', staySchema);
