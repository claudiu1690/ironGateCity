import { FACTION_IDS } from '@irongate/rules';
import type { FactionId } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/**
 * One per user; everything a session reads is embedded (plan §2 rule 6). Energy and Rested are
 * lazy timers: stored value + timestamp, projected with `@irongate/rules` on read.
 */
export interface CharacterDoc {
  _id: Types.ObjectId;
  /** Better Auth user id. */
  userId: string;
  name: string;
  factionId: FactionId;
  homeCityId: string;
  /** Where the character is now; equals homeCityId in slice 0. */
  cityId: string;
  /** Worn CHA = chaBase + equipment (slice 2); in slice 0 chaBase stands in for it. */
  stats: { str: number; int: number; agi: number; chaBase: number };
  /** `updatedAt` only advances by whole 10-minute ticks, never to "now". */
  energy: { value: number; updatedAt: Date };
  /** Shares energy.updatedAt: it only changes when Energy is projected and written. */
  rested: number;
  xp: number;
  level: number;
  fxp: number;
  iron: number;
  /** Optimistic guard, +1 per game action (ADR 0002). */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const int = { type: Number, required: true, validate: Number.isInteger } as const;

const characterSchema = new Schema<CharacterDoc>(
  {
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    factionId: { type: String, enum: FACTION_IDS, required: true },
    homeCityId: { type: String, required: true },
    cityId: { type: String, required: true },
    stats: {
      str: int,
      int: int,
      agi: int,
      chaBase: int,
    },
    energy: {
      value: { type: Number, required: true, min: 0 },
      updatedAt: { type: Date, required: true },
    },
    rested: { type: Number, required: true, min: 0 },
    xp: { type: Number, required: true, min: 0 },
    level: { type: Number, required: true, min: 1 },
    fxp: { type: Number, required: true, min: 0 },
    iron: { type: Number, required: true, min: 0 },
    version: { type: Number, required: true, min: 0 },
  },
  { collection: 'characters', strict: true, timestamps: true, versionKey: false },
);

// get-or-create is an upsert on this.
characterSchema.index({ userId: 1 }, { unique: true });

export const Character = model<CharacterDoc>('Character', characterSchema);
