import type { DailyTally, DayKey, HeadlineGroup } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/**
 * The Morning Paper: one edition per character per City Day (§3.3), generated at settlement
 * (ADR 0005). Its own collection: it grows daily. The unique `{ characterId, day }` index is the
 * settlement's idempotency; the previous edition's `snapshot` drives "rose since the last paper".
 */
export interface PaperEntryDoc {
  _id: Types.ObjectId;
  characterId: Types.ObjectId;
  day: DayKey;
  cityId: string;
  firstEdition: boolean;
  headlines: Array<{ templateId: string; group: HeadlineGroup; headline: string; deck?: string }>;
  desk: {
    salary: { jobId: string; jobName: string; days: number; perDay: number; total: number } | null;
    streak: { before: number; after: number; sickDaysUsed: number; broken: boolean } | null;
    restedBanked: number;
    daysSinceLastPaper: number | null;
    yesterday: DailyTally | null;
  };
  snapshot: { level: number; rank: number; standingLevel: number };
  readAt: Date | null;
  createdAt: Date;
}

const paperEntrySchema = new Schema<PaperEntryDoc>(
  {
    characterId: { type: Schema.Types.ObjectId, required: true },
    day: { type: Number, required: true },
    cityId: { type: String, required: true },
    firstEdition: { type: Boolean, required: true },
    headlines: { type: Schema.Types.Mixed, required: true },
    desk: { type: Schema.Types.Mixed, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    readAt: { type: Date, default: null },
  },
  {
    collection: 'paperEntries',
    strict: true,
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    minimize: false,
  },
);

paperEntrySchema.index({ characterId: 1, day: 1 }, { unique: true });

export const PaperEntry = model<PaperEntryDoc>('PaperEntry', paperEntrySchema);
