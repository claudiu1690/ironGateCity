import type { OpinionShares } from '@irongate/rules';
import { Schema, model } from 'mongoose';

/**
 * Live state of a city only (ADR 0003): its name, locations and actions stay in
 * `@irongate/content`, addressed by the same id. Not written in slice 0 beyond the seed.
 */
export interface CityDoc {
  /** The content id, e.g. "coalport". */
  _id: string;
  /** Faction shares plus Neutral, summing to 100 (§14.2). */
  opinion: OpinionShares;
  createdAt: Date;
  updatedAt: Date;
}

const share = { type: Number, required: true, min: 0, max: 100 } as const;

const citySchema = new Schema<CityDoc>(
  {
    _id: { type: String, required: true },
    opinion: { vanguard: share, collective: share, alliance: share, neutral: share },
  },
  { collection: 'cities', strict: true, timestamps: true, versionKey: false },
);

export const City = model<CityDoc>('City', citySchema);
