import type { DayKey, FactionId, Groundswell, OpinionShares } from '@irongate/rules';
import { Schema, model } from 'mongoose';

/**
 * Slice 4 (ADR 0027, tech design §5.2): one document per capital district, so the capital's
 * writes spread over five documents. Opinion is written by actions (ADR 0010), journey cards,
 * Issues and the drift; the state is set at each boundary and read by actions in their snapshot.
 * Created by the capital's bootstrap.
 */
export interface DistrictStateDoc {
  day: DayKey;
  battleground: boolean;
  controlledBy: FactionId | null;
  previous: { battleground: boolean; controlledBy: FactionId | null };
}

export interface DistrictDoc {
  /** The content id, e.g. "irongate.eastside". */
  _id: string;
  cityId: string;
  opinion: OpinionShares;
  state: DistrictStateDoc;
  groundswell: Groundswell | null;
  /** The last 60 boundaries, for the playtest report (`$push` with `$slice: -60`). */
  stateLog: Array<{
    day: DayKey;
    opinion: OpinionShares;
    battleground: boolean;
    controlledBy: FactionId | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const share = { type: Number, required: true, min: 0, max: 100 } as const;

const districtSchema = new Schema<DistrictDoc>(
  {
    _id: { type: String, required: true },
    cityId: { type: String, required: true },
    opinion: { vanguard: share, collective: share, alliance: share, neutral: share },
    state: { type: Schema.Types.Mixed, required: true },
    groundswell: { type: Schema.Types.Mixed, default: null },
    stateLog: { type: Schema.Types.Mixed, default: [] },
  },
  { collection: 'districts', strict: true, timestamps: true, versionKey: false, minimize: false },
);
districtSchema.index({ cityId: 1 });

export const District = model<DistrictDoc>('District', districtSchema);
