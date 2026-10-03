import type { DayKey, FactionId } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/**
 * Slice 4 (ADR 0029, tech design §5.5): one document per city per week per Issue
 * ('irongate:20731:issue.tram-fares'). Momentum is `$inc`'d in the action's transaction, guarded by
 * `status: 'live'`; the Monday step of the city day resolves it. Nothing here is secret.
 */
export type IssueStatus = 'live' | 'owned' | 'lapsed';

export interface IssueResultDoc {
  ownerId: FactionId | null;
  by: 'points' | 'share' | null;
  opinion: { applied: number; before: number; after: number } | null;
  /** The owner's top five. */
  top: Array<{ characterId: Types.ObjectId; name: string; points: number }>;
  effect: { fromDay: DayKey; toDay: DayKey } | null;
}

export interface IssueDoc {
  _id: string;
  cityId: string;
  districtId: string | null;
  issueId: string;
  /** The Monday that starts the week. */
  weekDay: DayKey;
  order: 1 | 2;
  seed: string;
  status: IssueStatus;
  momentum: Record<FactionId, number>;
  result: IssueResultDoc | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** `${cityId}:${weekDay}:${issueId}`. */
export const issueDocId = (cityId: string, weekDay: DayKey, issueId: string): string =>
  `${cityId}:${weekDay}:${issueId}`;

const points = { type: Number, default: 0, validate: Number.isInteger } as const;

const issueSchema = new Schema<IssueDoc>(
  {
    _id: { type: String, required: true },
    cityId: { type: String, required: true },
    districtId: { type: String, default: null },
    issueId: { type: String, required: true },
    weekDay: { type: Number, required: true, validate: Number.isInteger },
    order: { type: Number, enum: [1, 2], required: true },
    seed: { type: String, required: true },
    status: { type: String, enum: ['live', 'owned', 'lapsed'], required: true },
    momentum: { vanguard: points, collective: points, alliance: points },
    result: { type: Schema.Types.Mixed, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { collection: 'issues', strict: true, timestamps: true, versionKey: false, minimize: false },
);
issueSchema.index({ cityId: 1, weekDay: -1 });

export const IssueModel = model<IssueDoc>('Issue', issueSchema);
