import type { DayKey, LegacyKind } from '@irongate/rules';
import { LEGACY } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/**
 * Slice 8 (docs/tech/slice-8.md §5.2, ADR 0057): the public, permanent record. One row per natural
 * `ref` (unique per character): `term:{id}`, `award:{id}`, `unrest|{cityId}|{entry}` (review 5),
 * `pledge:{termId}:{lawId}`, `survived:{ref}`, `expose:{logId}`, `protege:{patronId}`,
 * `ambition:{id}`, `backfill:…`. Every row is inserted in a character transaction with
 * `legacy.total`, so the two never disagree. Reserved for the season (deferred): `champion:{s}`,
 * `award:{s}:{kind}:{bracket}`.
 */
export interface LegacyEntryDoc {
  _id: Types.ObjectId;
  characterId: Types.ObjectId;
  ref: string;
  kind: LegacyKind;
  points: number;
  day: DayKey;
  params: {
    cityId?: string;
    districtId?: string;
    office?: string;
    patronId?: string;
    ambitionId?: string;
    lawId?: string;
    award?: string;
  };
  createdAt: Date;
}

export const LEGACY_KINDS = Object.keys(LEGACY.points) as LegacyKind[];

const legacyEntrySchema = new Schema<LegacyEntryDoc>(
  {
    characterId: { type: Schema.Types.ObjectId, required: true },
    ref: { type: String, required: true },
    kind: { type: String, enum: LEGACY_KINDS, required: true },
    points: { type: Number, required: true, min: 0 },
    day: { type: Number, required: true, validate: Number.isInteger },
    params: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  {
    collection: 'legacyEntries',
    strict: true,
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    minimize: false,
  },
);

legacyEntrySchema.index({ characterId: 1, ref: 1 }, { unique: true, name: 'legacy_ref' });
// The Me tab, the profile.
legacyEntrySchema.index({ characterId: 1, day: -1 }, { name: 'legacy_by_day' });

export const LegacyEntry = model<LegacyEntryDoc>('LegacyEntry', legacyEntrySchema);
