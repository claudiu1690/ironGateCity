import type { ActionResult, ActionViewKind, ResultStamp } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

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
  /** checked, training or shift (tech design §5.3). */
  kind: ActionViewKind;
  /** ×1 or ×3: one row for the whole run (ADR 0006). */
  times: number;
  /** How many times the transaction callback ran (contention on the city document, ADR 0010). */
  txAttempts: number;
  /** 32 hex chars; `createRng(seed)` replays the roll(s). Generated for every kind. */
  seed: string;
  /** The stamp: success, partial, batch, worked or trained. */
  outcome: ResultStamp;
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
    kind: { type: String, enum: ['checked', 'training', 'shift'], required: true },
    times: { type: Number, required: true, min: 1 },
    txAttempts: { type: Number, required: true, min: 1 },
    seed: { type: String, required: true, match: /^[0-9a-f]{32}$/ },
    outcome: {
      type: String,
      enum: ['success', 'partial', 'batch', 'worked', 'trained'],
      required: true,
    },
    result: { type: Schema.Types.Mixed, required: true },
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

export const ActionLog = model<ActionLogDoc>('ActionLog', actionLogSchema);
