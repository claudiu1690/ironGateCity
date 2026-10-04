import type { JourneyCardResult } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/**
 * Slice 4 (ADR 0025, tech design §5.1): one document per trip. The card, the choice and the
 * arrival are its state; `{ characterId, n }` is the natural key, so two boardings cannot both
 * succeed. The character carries a small pointer (`character.journey`) until the arrival modal is
 * closed.
 */
export type JourneyStatus = 'onTheWay' | 'arrived' | 'closed';
export type JourneyKind = 'ticket' | 'deported';

export interface JourneyDoc {
  _id: Types.ObjectId;
  characterId: Types.ObjectId;
  /** The character's nth journey, 1-based. */
  n: number;
  from: string;
  to: string;
  boardedAt: Date;
  arrivesAt: Date;
  minutes: number;
  fare: { base: number; lines: Array<{ id: string; label: string; pct: number }>; total: number };
  /** 32 hex: the card draw and the card's roll. */
  seed: string;
  /** Slice 5: `deck` is the card's deck (absent on cards drawn before slice 5: ordinary). */
  card: { eventId: string; deck?: 'ordinary' | 'hostile' } | null;
  /**
   * Slice 5 (ADR 0033): a deportation is a fareless, cardless train home on release from the cells
   * on rival ground. Absent means a ticket.
   */
  kind?: JourneyKind;
  /** Slice 5: a journey to rival ground (absent on journeys before slice 5: false). */
  rivalGround?: boolean;
  /** Slice 5: the stay a deportation ends. */
  stayId?: Types.ObjectId | null;
  /** Stored verbatim: the arrival modal's line. */
  choice: {
    choiceId: string;
    outcome: 'success' | 'partial' | 'chosen';
    at: Date;
    result: JourneyCardResult;
  } | null;
  status: JourneyStatus;
  /** When the arrival was settled (lazily or by the job). */
  arrivedAt: Date | null;
  /** The arrival modal closed; a card left unanswered was slept through. */
  closedAt: Date | null;
  sleptThrough: boolean;
  /** The first arrival in the capital (`hl.ig.first-arrival`, the modal's headline). */
  firstToCapital: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const int = { type: Number, required: true, validate: Number.isInteger } as const;

const journeySchema = new Schema<JourneyDoc>(
  {
    characterId: { type: Schema.Types.ObjectId, required: true },
    n: int,
    from: { type: String, required: true },
    to: { type: String, required: true },
    boardedAt: { type: Date, required: true },
    arrivesAt: { type: Date, required: true },
    minutes: int,
    fare: { type: Schema.Types.Mixed, required: true },
    seed: { type: String, required: true },
    card: { type: Schema.Types.Mixed, default: null },
    choice: { type: Schema.Types.Mixed, default: null },
    status: { type: String, enum: ['onTheWay', 'arrived', 'closed'], required: true },
    arrivedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    sleptThrough: { type: Boolean, default: false },
    firstToCapital: { type: Boolean, default: false },
    // Slice 5 (tech design §5.4). `kind` has no default: absent means a ticket.
    kind: { type: String, enum: ['ticket', 'deported'] },
    rivalGround: { type: Boolean, default: false },
    stayId: { type: Schema.Types.ObjectId },
  },
  { collection: 'journeys', strict: true, timestamps: true, versionKey: false, minimize: false },
);
journeySchema.index({ characterId: 1, n: 1 }, { unique: true });
journeySchema.index({ characterId: 1, boardedAt: -1 });
journeySchema.index({ status: 1, arrivesAt: 1 });
// "You and 2 others on this train".
journeySchema.index({ to: 1, boardedAt: -1 });

export const Journey = model<JourneyDoc>('Journey', journeySchema);
