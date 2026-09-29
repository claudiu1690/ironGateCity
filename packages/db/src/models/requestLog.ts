import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

export const REQUEST_KINDS = ['job.take', 'stat.place'] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

/**
 * ADR 0008: idempotency for mutations that are not game actions (taking a job, placing a stat
 * point). The unique `{ characterId, idempotencyKey }` index is the lock; rows expire after 7 days.
 */
export interface RequestLogDoc {
  _id: Types.ObjectId;
  characterId: Types.ObjectId;
  idempotencyKey: string;
  kind: RequestKind;
  /** A hash of the input: the same key with a different input is refused. */
  inputHash: string;
  result: unknown;
  createdAt: Date;
}

export const REQUEST_LOG_TTL_SECONDS = 7 * 24 * 3600;

const requestLogSchema = new Schema<RequestLogDoc>(
  {
    characterId: { type: Schema.Types.ObjectId, required: true },
    idempotencyKey: { type: String, required: true },
    kind: { type: String, enum: REQUEST_KINDS, required: true },
    inputHash: { type: String, required: true },
    result: { type: Schema.Types.Mixed, required: true },
  },
  {
    collection: 'requestLogs',
    strict: true,
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    minimize: false,
  },
);

requestLogSchema.index({ characterId: 1, idempotencyKey: 1 }, { unique: true });
requestLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: REQUEST_LOG_TTL_SECONDS });

export const RequestLog = model<RequestLogDoc>('RequestLog', requestLogSchema);
