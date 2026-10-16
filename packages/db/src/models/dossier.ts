import { DOSSIER_CATEGORIES, DOSSIER_SOURCES, FACTION_IDS } from '@irongate/rules';
import type { DayKey, DossierCategory, DossierSource, DossierStatus, FactionId } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/**
 * Slice 8 (docs/tech/slice-8.md §5.1, ADR 0053): the Dossier. Entries, Case Files and informants, one
 * row each. The slot count is counted (`status: 'held'`), never stored: every path that adds an
 * entry writes the character under its version guard in the same transaction.
 */
export interface DossierLineDoc {
  category: DossierCategory;
  lineId: string;
  params: { placeId?: string | null; weekday?: number };
  day: DayKey;
  source: DossierSource;
}

export interface DossierEntryDoc {
  _id: Types.ObjectId;
  characterId: Types.ObjectId;
  kind: 'entry' | 'file';
  /** A name's id (`npc.c.baum`). */
  subjectId: string;
  /** Frozen at landing (Brandauer: null). */
  subjectFactionId: FactionId | null;
  cityId: string;
  districtId: string | null;
  // An entry.
  category?: DossierCategory;
  /** `political.2`. */
  lineId?: string;
  params?: { placeId?: string | null; weekday?: number };
  /** Landing (an entry) or binding (a file). */
  day: DayKey;
  source: DossierSource;
  // A file.
  /** The bound entries' lines, oldest first. */
  lines?: DossierLineDoc[];
  kinds?: DossierCategory[];
  /** The weight at binding (fresh 1, stale ½). */
  weight?: number;
  /** A bound entry's file. */
  fileId?: Types.ObjectId | null;
  status: DossierStatus;
  informant?: { fromDay: DayKey; untilDay: DayKey; reported: number; cityId: string } | null;
  /** Written by every use (the report, the Headline Story, the burn; the spymaster later). */
  used?: { how: 'expose' | 'sold' | 'informant' | 'headlineStory'; day: DayKey; ref: string | null } | null;
  /** The Headline Story's event. */
  attachedTo?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const int = { type: Number, required: true, validate: Number.isInteger } as const;
const params = new Schema({ placeId: { type: String, default: null }, weekday: Number }, { _id: false });

const dossierEntrySchema = new Schema<DossierEntryDoc>(
  {
    characterId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ['entry', 'file'], required: true },
    subjectId: { type: String, required: true },
    subjectFactionId: { type: String, enum: [...FACTION_IDS, null], default: null },
    cityId: { type: String, required: true },
    districtId: { type: String, default: null },
    category: { type: String, enum: DOSSIER_CATEGORIES },
    lineId: { type: String },
    params: { type: params, default: undefined },
    day: int,
    source: { type: String, enum: DOSSIER_SOURCES, required: true },
    lines: {
      type: [
        new Schema(
          {
            category: { type: String, enum: DOSSIER_CATEGORIES, required: true },
            lineId: { type: String, required: true },
            params: { type: params, default: () => ({}) },
            day: int,
            source: { type: String, enum: DOSSIER_SOURCES, required: true },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
    kinds: { type: [{ type: String, enum: DOSSIER_CATEGORIES }], default: undefined },
    weight: { type: Number },
    fileId: { type: Schema.Types.ObjectId, default: null },
    status: {
      type: String,
      enum: ['held', 'bound', 'attached', 'informant', 'spent', 'sold'],
      required: true,
    },
    informant: {
      type: new Schema(
        {
          fromDay: int,
          untilDay: int,
          reported: { type: Number, default: 0, min: 0 },
          cityId: { type: String, required: true },
        },
        { _id: false },
      ),
      default: null,
    },
    used: {
      type: new Schema(
        {
          how: { type: String, enum: ['expose', 'sold', 'informant', 'headlineStory'], required: true },
          day: int,
          ref: { type: String, default: null },
        },
        { _id: false },
      ),
      default: null,
    },
    attachedTo: { type: Schema.Types.ObjectId, default: null },
  },
  { collection: 'dossierEntries', strict: true, timestamps: true, versionKey: false },
);

// The tab (held by name), the slot count, binding, the informants.
dossierEntrySchema.index({ characterId: 1, status: 1, subjectId: 1, day: -1 }, { name: 'dossier_by_status' });
// *n go stale tomorrow*. (The spymaster's partial index waits with the season, 16 Oct 2026.)
dossierEntrySchema.index(
  { characterId: 1, kind: 1, status: 1, day: 1 },
  { partialFilterExpression: { kind: 'entry', status: 'held' }, name: 'dossier_held_entries' },
);

export const DossierEntry = model<DossierEntryDoc>('DossierEntry', dossierEntrySchema);
