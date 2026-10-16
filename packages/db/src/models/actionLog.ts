import type { ActionResult, ActionResultKind, ResultStamp } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/** Slice 5 (tech design §5.4): `mission` joins the kinds. */
/** Slice 8 (ADR 0054): `expose`, the exposé's step 2. */
export const ACTION_LOG_KINDS = ['checked', 'training', 'shift', 'chapter', 'mission', 'expose'] as const;
export type ActionLogKind = ActionResultKind | (typeof ACTION_LOG_KINDS)[number];

/** `worked`: slice-1 shifts. Slice 5: `takenIn` (the cells), `carriedOff` (the infirmary). */
export const ACTION_LOG_OUTCOMES = [
  'success',
  'partial',
  'failure',
  'batch',
  'worked',
  'trained',
  'takenIn',
  'carriedOff',
] as const;
export type ActionLogOutcome = ResultStamp | (typeof ACTION_LOG_OUTCOMES)[number];

/**
 * One row per performed action. Grows without limit, so it has its own collection (plan §2 rule 6).
 * The unique `{ characterId, idempotencyKey }` index is the idempotency lock (ADR 0002); `result`
 * is the full modal payload, stored verbatim and returned unchanged on a retry.
 */
export interface ActionLogDoc {
  _id: Types.ObjectId;
  characterId: Types.ObjectId;
  idempotencyKey: string;
  actionId: string;
  locationId: string;
  cityId: string;
  /**
   * checked, training or shift (slice-1 tech design §5.3); chapter for an Ambition check (slice 2);
   * mission (slice 5): `actionId` holds the mission id.
   */
  kind: ActionLogKind;
  /** ×1 or ×3: one row for the whole run (ADR 0006). */
  times: number;
  /** How many times the transaction callback ran (contention on the city document, ADR 0010). */
  txAttempts: number;
  /** 32 hex chars; `createRng(seed)` replays the roll(s). Generated for every kind. */
  seed: string;
  /**
   * The stamp: success, partial, failure (chapters), batch, worked or trained. Slice 5: takenIn (the
   * cells) or carriedOff (the infirmary) after a mission or a run-in.
   */
  outcome: ActionLogOutcome;
  /** Slice 5 (ADR 0032): the run-in this row resolved, written under the start's key. */
  encounterId?: Types.ObjectId;
  result: ActionResult;
  createdAt: Date;
}

const actionLogSchema = new Schema<ActionLogDoc>(
  {
    characterId: { type: Schema.Types.ObjectId, required: true },
    idempotencyKey: { type: String, required: true },
    actionId: { type: String, required: true },
    locationId: { type: String, required: true },
    cityId: { type: String, required: true },
    kind: { type: String, enum: ACTION_LOG_KINDS, required: true },
    times: { type: Number, required: true, min: 1 },
    txAttempts: { type: Number, required: true, min: 1 },
    seed: { type: String, required: true, match: /^[0-9a-f]{32}$/ },
    outcome: {
      type: String,
      enum: ACTION_LOG_OUTCOMES,
      required: true,
    },
    result: { type: Schema.Types.Mixed, required: true },
    encounterId: { type: Schema.Types.ObjectId },
  },
  {
    collection: 'actionLogs',
    strict: true,
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    minimize: false,
  },
);

actionLogSchema.index({ characterId: 1, idempotencyKey: 1 }, { unique: true });
// History, and slice 1's "Today" tally.
actionLogSchema.index({ characterId: 1, createdAt: -1 });
// Slice 8 (tech design §11.1, §22.1 Q28): the public exposé line, yesterday's most recent printed one.
actionLogSchema.index(
  { kind: 1, outcome: 1, 'result.performedAt': -1 },
  { partialFilterExpression: { kind: 'expose' }, name: 'expose_by_day' },
);

export const ActionLog = model<ActionLogDoc>('ActionLog', actionLogSchema);
