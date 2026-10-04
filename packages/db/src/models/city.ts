import type { DayKey, FactionId, MoraleState, OpinionShares } from '@irongate/rules';
import { Schema, model } from 'mongoose';

/** ADR 0022: the morale state record, written only when a transaction crosses a threshold. */
export interface MoraleRecordDoc {
  state: MoraleState;
  since: DayKey;
  previous: MoraleState | null;
}

/**
 * Slice 5 (ADR 0034, tech design §5.4): the share lost to rivals on a City Day, in thousandths of a
 * point. `prev` keeps the day before (yesterday's edition and *Rival Callers* read it).
 */
export interface RivalPressureDoc {
  day: DayKey;
  /** Thousandths of a point. */
  lost: number;
  prev: { day: DayKey; lost: number } | null;
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
  /**
   * Faction shares plus Neutral, summing to 100 (§14.2). Slice 4 (ADR 0027): absent on a city with
   * districts (the capital), whose share is the average of its `districts` documents, on read.
   */
  opinion?: OpinionShares;
  /** ADR 0017: the last boundary settled, and the day of the bootstrap. */
  world?: { settledDay: DayKey; bootstrappedDay: DayKey };
  morale?: MoraleRecordDoc;
  /** The last 60 boundaries, for the playtest report. */
  moraleLog?: Array<{ day: DayKey; share: number; state: MoraleState }>;
  /**
   * The sitting council, for views. `toDay` exclusive. Slice 4: `seats` (10 in the capital) and the
   * capital's NPC seats by faction.
   */
  council?: {
    key: string;
    fromDay: DayKey;
    toDay: DayKey;
    npcSeats: number;
    seats?: 7 | 10;
    npcSeatsByFaction?: Partial<Record<FactionId, number>>;
  } | null;
  /** The ordinance in force; `toDay` exclusive. `paperId`: the order paper that passed it. */
  ordinance?: { id: string; fromDay: DayKey; toDay: DayKey; paperId: string | null } | null;
  /** The last four ordinances (ADR 0021): each ended day's pay and Rested cap. */
  ordinanceHistory?: Array<{ id: string; fromDay: DayKey; toDay: DayKey }>;
  /**
   * Slice 4 (ADR 0029): this week's live Issues and the Issue effects in force (`toDay` exclusive;
   * the last eight). Absent until the city's first draw.
   */
  issues?: {
    weekDay: DayKey;
    live: Array<{ docId: string; issueId: string; districtId: string | null; order: 1 | 2 }>;
    effects: Array<{ issueId: string; docId: string; ownerId: FactionId; fromDay: DayKey; toDay: DayKey }>;
  };
  /**
   * Slice 5 (ADR 0034): on a home city, the home faction's share lost to visitors' party work on
   * rival ground, by day (the 2-point cap); written with the opinion in the act's transaction.
   * Absent or null until the first such act.
   */
  rivalPressure?: RivalPressureDoc | null;
  createdAt: Date;
  updatedAt: Date;
}

const share = { type: Number, required: true, min: 0, max: 100 } as const;

const citySchema = new Schema<CityDoc>(
  {
    _id: { type: String, required: true },
    // Slice 4: absent on the capital (its districts carry the meters).
    opinion: {
      type: new Schema(
        { vanguard: share, collective: share, alliance: share, neutral: share },
        { _id: false },
      ),
      default: undefined,
    },
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
    issues: { type: Schema.Types.Mixed, default: undefined },
    // Slice 5: home cities only, written on the first visitor's act against the home faction.
    rivalPressure: { type: Schema.Types.Mixed, default: undefined },
  },
  { collection: 'cities', strict: true, timestamps: true, versionKey: false },
);

/** A home city's document: it always has its meter (ADR 0027). */
export type HomeCityDoc = CityDoc & { opinion: OpinionShares };

/** The home city's meter; a capital document has none (its districts do). */
export function cityOpinion(city: Pick<CityDoc, '_id' | 'opinion'>): OpinionShares {
  if (!city.opinion) throw new Error(`city "${city._id}" has no opinion of its own (it has districts)`);
  return city.opinion;
}

export const City = model<CityDoc>('City', citySchema);
