// Telemetry models for Irongate City (MongoDB + Mongoose). ADR 0059.
// Copy into packages/db/src/models/ and register the indexes in ensureIndexes.

import { Schema, model, type InferSchemaType } from "mongoose";

// ─── telemetry: one document per event (TTL 180 days) ────────────────────────
//
// _id is a string so it can be natural:
//   keyed acts   → "{kind}:{idempotencyKey}"   (a retried tap inserts nothing)
//   world events → "{kind}:{ref}"              (a second runner inserts nothing)
//   other events → "{kind}:{random uuid}"

const TELEMETRY_TTL_SECONDS = 180 * 24 * 60 * 60;

const telemetrySchema = new Schema(
	{
		_id: { type: String, required: true },
		kind: { type: String, required: true }, // "noun.verb", from the closed catalogue
		at: { type: Date, required: true },
		day: { type: String, required: true }, // City Day key, e.g. "2026-10-10"
		userId: { type: String, default: null }, // null only for anonymous kinds (sign-up funnel, client errors)
		characterId: { type: String, default: null },
		sid: { type: String, default: null }, // the client's session id; ties anonymous steps to the account
		client: {
			platform: { type: String }, // "web", "pwa"
			build: { type: String }, // the client's build id
		},
		props: { type: Schema.Types.Mixed, default: {} }, // validated per kind by Zod before insert
	},
	{ versionKey: false, minimize: true },
);

telemetrySchema.index({ at: 1 }, { expireAfterSeconds: TELEMETRY_TTL_SECONDS });
telemetrySchema.index({ kind: 1, day: 1 });
telemetrySchema.index({ userId: 1, day: 1 });

export const Telemetry = model("Telemetry", telemetrySchema, "telemetry");
export type TelemetryDoc = InferSchemaType<typeof telemetrySchema>;

// ─── playerDays: activity spans per user per City Day (kept for good) ────────
//
// _id = "{userId}:{day}". spans = [[startMinute, endMinute], ...] in minutes since
// the epoch; a span is extended if the last one ended within 30 minutes,
// otherwise a new span opens. Sessions and retention are computed from these.

const playerDaySchema = new Schema(
	{
		_id: { type: String, required: true },
		userId: { type: String, required: true },
		day: { type: String, required: true },
		spans: { type: [[Number]], default: [] },
		firstAt: { type: Date, required: true },
		lastAt: { type: Date, required: true },
	},
	{ versionKey: false },
);

playerDaySchema.index({ day: 1 });
playerDaySchema.index({ userId: 1, day: 1 }, { unique: true });

export const PlayerDay = model("PlayerDay", playerDaySchema, "playerDays");
export type PlayerDayDoc = InferSchemaType<typeof playerDaySchema>;

// No cohorts collection: retention is computed by the metrics builder over
// playerDays + users.createdAt, so exclusions apply retroactively (ADR 0059 §7).
