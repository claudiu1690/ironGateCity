import type { DayKey, MoraleState, OpinionShares } from '@irongate/rules';
import { Schema, model } from 'mongoose';

/** ADR 0022: the morale state record, written only when a transaction crosses a threshold. */
export interface MoraleRecordDoc {
  state: MoraleState;
  since: DayKey;
  previous: MoraleState | null;
}

/**
 * Live state of a city only (ADR 0003): its name, locations and actions stay in
 * `@irongate/content`, addressed by the same id. `opinion` is written by action transactions
 * (ADR 0010), ballots and the city day (ADR 0022). Slice 3 adds the city day's state (ADR 0017),
 * morale, the sitting council and the ordinance in force (ADR 0021); absent until the city is
 * bootstrapped.
 */
export interface CityDoc {
  /** The content id, e.g. "coalport". */
  _id: string;
  /** Faction shares plus Neutral, summing to 100 (§14.2). */
  opinion: OpinionShares;
  /** ADR 0017: the last boundary settled, and the day of the bootstrap. */
  world?: { settledDay: DayKey; bootstrappedDay: DayKey };
  morale?: MoraleRecordDoc;
  /** The last 60 boundaries, for the playtest report. */
  moraleLog?: Array<{ day: DayKey; share: number; state: MoraleState }>;
  /** The sitting council, for views. `toDay` exclusive. */
  council?: { key: string; fromDay: DayKey; toDay: DayKey; npcSeats: number } | null;
  /** The ordinance in force; `toDay` exclusive. `paperId`: the order paper that passed it. */
  ordinance?: { id: string; fromDay: DayKey; toDay: DayKey; paperId: string | null } | null;
  /** The last four ordinances (ADR 0021): each ended day's pay and Rested cap. */
  ordinanceHistory?: Array<{ id: string; fromDay: DayKey; toDay: DayKey }>;
  createdAt: Date;
  updatedAt: Date;
}

const share = { type: Number, required: true, min: 0, max: 100 } as const;

const citySchema = new Schema<CityDoc>(
  {
    _id: { type: String, required: true },
    opinion: { vanguard: share, collective: share, alliance: share, neutral: share },
    world: {
      type: new Schema({ settledDay: Number, bootstrappedDay: Number }, { _id: false }),
      default: undefined,
    },
    morale: {
      type: new Schema(
        { state: String, since: Number, previous: { type: String, default: null } },
        { _id: false },
      ),
      default: undefined,
    },
    moraleLog: { type: Schema.Types.Mixed, default: undefined },
    council: { type: Schema.Types.Mixed, default: undefined },
    ordinance: { type: Schema.Types.Mixed, default: undefined },
    ordinanceHistory: { type: Schema.Types.Mixed, default: undefined },
  },
  { collection: 'cities', strict: true, timestamps: true, versionKey: false },
);

export const City = model<CityDoc>('City', citySchema);
