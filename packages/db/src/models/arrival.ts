import type { FactionId } from '@irongate/rules';
import { FACTION_IDS } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/**
 * ADR 0011: the origin before the character exists. One draft per user (unique `userId`): the
 * face, the six answers in order (set-once, by question index) and, once the faction is confirmed,
 * the character it became. No TTL: a player may come back weeks later to the same question.
 */
export interface ArrivalDoc {
  _id: Types.ObjectId;
  /** Better Auth user id. */
  userId: string;
  name: string;
  avatarId: string | null;
  answers: Array<{ questionId: string; answerId: string; at: Date }>;
  completedAt: Date | null;
  characterId: Types.ObjectId | null;
  factionId: FactionId | null;
  createdAt: Date;
  updatedAt: Date;
}

const arrivalSchema = new Schema<ArrivalDoc>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    avatarId: { type: String, default: null },
    answers: {
      type: [
        new Schema(
          {
            questionId: { type: String, required: true },
            answerId: { type: String, required: true },
            at: { type: Date, required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    completedAt: { type: Date, default: null },
    characterId: { type: Schema.Types.ObjectId, default: null },
    factionId: { type: String, enum: [...FACTION_IDS, null], default: null },
  },
  { collection: 'arrivals', strict: true, timestamps: true, versionKey: false, minimize: false },
);

arrivalSchema.index({ userId: 1 }, { unique: true });

export const Arrival = model<ArrivalDoc>('Arrival', arrivalSchema);
