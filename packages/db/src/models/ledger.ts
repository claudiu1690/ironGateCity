import { FACTION_IDS } from '@irongate/rules';
import type { DayKey, FactionId } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/**
 * Slice 4 (ADR 0028, tech design §5.3–§5.4, §5.6): the influence ledger (a row per opinion change,
 * appended in the transaction that changes opinion), the per-character contribution totals
 * (upserted alongside) and the awards the city day writes and the settlement credits.
 */

const int = { type: Number, required: true, validate: Number.isInteger } as const;

// ---------------------------------------------------------------------------------------------
// influenceLedger: append-only.
// ---------------------------------------------------------------------------------------------

export type LedgerKind = (typeof LEDGER_KINDS)[number];
/** Slice 6 (tech design §5.5): `event`, a Campaign Event's leg per member participant (`ref` = the event id). */
export const LEDGER_KINDS = ['action', 'journey', 'issue', 'drift', 'ballot', 'seat', 'noVoter', 'event'] as const;

export type LedgerSource = { kind: 'character'; characterId: Types.ObjectId } | { kind: 'system' };

export interface InfluenceLedgerDoc {
  _id: Types.ObjectId;
  cityId: string;
  /** The district, or the home city. */
  placeId: string;
  factionId: FactionId;
  /** Integer thousandths of a point as applied after the floors; signed (the drift). */
  swing: number;
  kind: LedgerKind;
  source: LedgerSource;
  /** The actionLogs id, the journey id, the issue doc id, or the boundary ('d:20735'). */
  ref: string;
  day: DayKey;
  /** The place's election key for the cycle of the day ('irongate.eastside:4146'). */
  cycleKey: string;
  at: Date;
}

const influenceLedgerSchema = new Schema<InfluenceLedgerDoc>(
  {
    cityId: { type: String, required: true },
    placeId: { type: String, required: true },
    factionId: { type: String, enum: FACTION_IDS, required: true },
    swing: int,
    kind: { type: String, enum: LEDGER_KINDS, required: true },
    source: {
      type: new Schema(
        {
          kind: { type: String, enum: ['character', 'system'], required: true },
          characterId: { type: Schema.Types.ObjectId },
        },
        { _id: false },
      ),
      required: true,
    },
    ref: { type: String, required: true },
    day: int,
    cycleKey: { type: String, required: true },
    at: { type: Date, required: true },
  },
  { collection: 'influenceLedger', strict: true, versionKey: false, minimize: false },
);
influenceLedgerSchema.index({ placeId: 1, cycleKey: 1 });
influenceLedgerSchema.index(
  { 'source.characterId': 1, day: -1 },
  { partialFilterExpression: { 'source.kind': 'character' } },
);

export const InfluenceLedger = model<InfluenceLedgerDoc>('InfluenceLedger', influenceLedgerSchema);

// ---------------------------------------------------------------------------------------------
// contributions: one per character per scope; `_id` = `${scope}|${characterId}`.
// ---------------------------------------------------------------------------------------------

/** Slice 6 (ADR 0042): `faction`, the scoreboard's scoped totals (`faction|{f}|{period}|{city}`). */
export type ContributionKind = 'influence' | 'points' | 'faction';

export interface ContributionDoc {
  /** `${scope}|${characterId}`: the upsert's natural key. */
  _id: string;
  /** 'influence|irongate.eastside:4146' · 'points|irongate:20731:issue.tram-fares'. */
  scope: string;
  kind: ContributionKind;
  cityId: string;
  placeId: string;
  /** The cycle key, or the issue doc id. */
  ref: string;
  characterId: Types.ObjectId;
  name: string;
  factionId: FactionId;
  /** At the last contribution (the hero's bracket, design §19 Q5). */
  level: number;
  /** Influence: thousandths; points: integer momentum. */
  amount: number;
  /** The tie-break: earlier to reach the total. */
  lastAt: Date;
  /** Slice 6 (ADR 0042): faction scopes only. */
  period?: 'week' | 'all';
  bracket?: 1 | 2 | 3;
  /** Events joined in the period. */
  events?: number;
}

/** The natural key of a contribution. */
export const contributionId = (scope: string, characterId: Types.ObjectId | string): string =>
  `${scope}|${String(characterId)}`;

const contributionSchema = new Schema<ContributionDoc>(
  {
    _id: { type: String, required: true },
    scope: { type: String, required: true },
    kind: { type: String, enum: ['influence', 'points', 'faction'], required: true },
    cityId: { type: String, required: true },
    placeId: { type: String, required: true },
    ref: { type: String, required: true },
    characterId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    factionId: { type: String, enum: FACTION_IDS, required: true },
    level: int,
    amount: int,
    lastAt: { type: Date, required: true },
    period: { type: String, enum: ['week', 'all'] },
    bracket: { type: Number, enum: [1, 2, 3] },
    events: { type: Number, min: 0 },
  },
  { collection: 'contributions', strict: true, versionKey: false, minimize: false },
);
contributionSchema.index({ scope: 1, amount: -1, lastAt: 1 });
contributionSchema.index({ characterId: 1, kind: 1, ref: 1 });
// Slice 6 (ADR 0042): each bracket's top ten on the scoreboard.
contributionSchema.index({ scope: 1, bracket: 1, amount: -1, lastAt: 1 }, { name: 'contrib_scoreboard' });

export const Contribution = model<ContributionDoc>('Contribution', contributionSchema);

// ---------------------------------------------------------------------------------------------
// awards: hero and Issue PC due to a character; the hero record. Review 5 (ADR 0082): the Unrest
// prize's Party XP.
// ---------------------------------------------------------------------------------------------

export type AwardKind = 'hero' | 'issue' | 'unrest';

export interface AwardDoc {
  _id: Types.ObjectId;
  characterId: Types.ObjectId;
  kind: AwardKind;
  cityId: string;
  placeId: string;
  /** The cycle key (a hero), the issue doc id, or `unrest|{cityId}|{entry}` (review 5). */
  ref: string;
  /** 25 or 4; 0 for the Unrest prize. */
  pc: number;
  /** Review 5 (ADR 0082): Party XP credited with it (50 for the Unrest prize); 0 otherwise. */
  fxp?: number;
  /** Review 5 (ADR 0082): the Unrest prize's `{ pushedK, top }` (the member's party's top three). */
  meta?: { pushedK: number; top: string[] } | null;
  /** "District Hero, Eastside" until the next count; null for an Issue award. */
  title: { label: string; fromDay: DayKey; untilDay: DayKey } | null;
  /** The swing (heroes, thousandths) or the points (Issues), for In Print. */
  amount: number | null;
  bracket: 1 | 2 | 3 | null;
  day: DayKey;
  /** Set by the settlement that credits the PC (once). */
  creditedAt: Date | null;
  createdAt: Date;
}

const awardSchema = new Schema<AwardDoc>(
  {
    characterId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ['hero', 'issue', 'unrest'], required: true },
    cityId: { type: String, required: true },
    placeId: { type: String, required: true },
    ref: { type: String, required: true },
    pc: int,
    fxp: { type: Number, default: 0 },
    meta: { type: Schema.Types.Mixed, default: null },
    title: { type: Schema.Types.Mixed, default: null },
    amount: { type: Number, default: null },
    bracket: { type: Number, default: null },
    day: int,
    creditedAt: { type: Date, default: null },
  },
  {
    collection: 'awards',
    strict: true,
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    minimize: false,
  },
);
// A re-run of a count or a resolution cannot pay twice.
awardSchema.index({ kind: 1, ref: 1, characterId: 1 }, { unique: true });
awardSchema.index({ characterId: 1, creditedAt: 1 }, { partialFilterExpression: { creditedAt: null } });
awardSchema.index({ characterId: 1, kind: 1 });

export const Award = model<AwardDoc>('Award', awardSchema);
