import type { DayKey } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/** Slice 5 (ADR 0032): the four answers to a run-in. */
export const ENCOUNTER_CHOICES = ['fight', 'run', 'talk', 'pay'] as const;
export type EncounterChoice = (typeof ENCOUNTER_CHOICES)[number];
/** `luck`: the player's *Leave it to luck*; `auto`: luck by the read path (ADR 0032 §5). */
export type EncounterBy = 'player' | 'luck' | 'auto';
export type EncounterOutcome = 'won' | 'lost' | 'ran' | 'talked' | 'paid';
export type EncounterState = 'pending' | 'resolved';

/**
 * Slice 5 (ADR 0032, tech design §5.2): one document per run-in, `pending` until a choice or luck
 * resolves it. It holds the pending step across two requests, keeps `actionLogs` immutable and is
 * history for the report. `{ characterId, idempotencyKey }` (the start's key) is unique, so a
 * retried start finds its run-in instead of rolling a second one.
 *
 * `held` is the pure start the run-in holds (a mission's start, or a tier-1 tap's resolution and its
 * Partial twin), stored as JSON; its shape belongs to `@irongate/rules`, so it is typed by the
 * reader (`EncounterDoc<MissionStart | Tier1Held>`).
 */
export interface EncounterDoc<Held = unknown> {
  _id: Types.ObjectId;
  characterId: Types.ObjectId;
  /** The start's request key. */
  idempotencyKey: string;
  /** A mission, or a tier-1 tap on rival ground. */
  kind: 'mission' | 'action';
  /** The mission id or the tier-1 action id. */
  refId: string;
  locationId: string;
  cityId: string;
  /** The City Day the run-in belongs to: its rewards, orders and tally land there (ADR 0032 §5). */
  day: DayKey;
  rivalGround: boolean;
  /** 32 hex; the named streams `:runIn`, `:choice`, `:damage`, `:caught` replay every roll. */
  seed: string;
  /** Scaled: power round(×1.1) on tier 2, +4 on rival ground. */
  opponent: {
    id: string;
    power: number;
    agi: number;
    wits: number;
    payOff: number | null;
    fightPct: number;
  };
  you: { power: number; agi: number; cha: number; armour: number; health: number; healthMax: number };
  chances: { fight: number; run: number; talk: number; pay: number | null };
  held: Held;
  state: EncounterState;
  /** start + `RUN_IN.decideMs`; after it any read resolves the run-in by luck. */
  decideBy: Date;
  choice: EncounterChoice | null;
  by: EncounterBy | null;
  outcome: EncounterOutcome | null;
  /** The `actionLogs` row written by the resolution, under the start's key. */
  logId: Types.ObjectId | null;
  resolvedAt: Date | null;
  /** What the resolution counts from: `min(decideBy, the end of its day)` for luck by the read path. */
  resolvedAsOf: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const num = { type: Number, required: true } as const;
const nullableNum = { type: Number, default: null } as const;

const encounterSchema = new Schema<EncounterDoc>(
  {
    characterId: { type: Schema.Types.ObjectId, required: true },
    idempotencyKey: { type: String, required: true },
    kind: { type: String, enum: ['mission', 'action'], required: true },
    refId: { type: String, required: true },
    locationId: { type: String, required: true },
    cityId: { type: String, required: true },
    day: { type: Number, required: true, validate: Number.isInteger },
    rivalGround: { type: Boolean, required: true },
    seed: { type: String, required: true, match: /^[0-9a-f]{32}$/ },
    opponent: {
      type: new Schema(
        {
          id: { type: String, required: true },
          power: num,
          agi: num,
          wits: num,
          payOff: nullableNum,
          fightPct: num,
        },
        { _id: false },
      ),
      required: true,
    },
    you: {
      type: new Schema(
        { power: num, agi: num, cha: num, armour: num, health: num, healthMax: num },
        { _id: false },
      ),
      required: true,
    },
    chances: {
      type: new Schema({ fight: num, run: num, talk: num, pay: nullableNum }, { _id: false }),
      required: true,
    },
    held: { type: Schema.Types.Mixed, required: true },
    state: { type: String, enum: ['pending', 'resolved'], required: true },
    decideBy: { type: Date, required: true },
    choice: { type: String, enum: [...ENCOUNTER_CHOICES, null], default: null },
    by: { type: String, enum: ['player', 'luck', 'auto', null], default: null },
    outcome: { type: String, enum: ['won', 'lost', 'ran', 'talked', 'paid', null], default: null },
    logId: { type: Schema.Types.ObjectId, default: null },
    resolvedAt: { type: Date, default: null },
    resolvedAsOf: { type: Date, default: null },
  },
  { collection: 'encounters', strict: true, timestamps: true, versionKey: false, minimize: false },
);

// The start's key: a retried start finds its run-in (ADR 0032 §3).
encounterSchema.index({ characterId: 1, idempotencyKey: 1 }, { unique: true });
// History, and the report's run-ins per character.
encounterSchema.index({ characterId: 1, createdAt: -1 });
// The dev panel and the report: run-ins still waiting for a choice.
encounterSchema.index({ state: 1, decideBy: 1 }, { partialFilterExpression: { state: 'pending' } });

export const Encounter = model<EncounterDoc>('Encounter', encounterSchema);
