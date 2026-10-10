// Server-side telemetry for Irongate City: an in-process buffer flushed with
// unordered insertMany, natural _ids for idempotency, and playerDays activity
// spans touched at most once a minute per user. No Redis. ADR 0059.
// Copy into apps/server/src/services/telemetry.ts.

import { randomUUID } from "node:crypto";
import { PlayerDay, Telemetry } from "./analytics-schema"; // packages/db models

const FLUSH_EVERY_MS = 2_000;
const FLUSH_AT = 100;
const MAX_BUFFER = 5_000; // drop the oldest beyond this: telemetry never grows unbounded
const SESSION_GAP_MIN = 30;
const TOUCH_EVERY_MS = 60_000;

export interface TelemetryCtx {
	userId: string | null;
	characterId: string | null;
	sid: string | null;
	day: string; // City Day key
	client?: { platform?: string; build?: string };
}

export interface TrackInput {
	kind: string; // "noun.verb", must exist in the catalogue
	ctx: TelemetryCtx;
	props?: Record<string, unknown>;
	key?: string; // keyed act: _id = "{kind}:{key}"
	ref?: string; // world event: _id = "{kind}:{ref}"
	at?: Date;
}

type Logger = { warn: (o: unknown, m: string) => void; info: (o: unknown, m: string) => void };

export class TelemetryBuffer {
	private buffer: Record<string, unknown>[] = [];
	private timer: NodeJS.Timeout | null = null;
	private flushing = false;
	private lastTouch = new Map<string, number>(); // userId → ms of the last playerDays upsert

	constructor(
		private readonly validate: (kind: string, props: unknown) => Record<string, unknown> | null,
		private readonly log: Logger,
	) {}

	start(): void {
		if (!this.timer) this.timer = setInterval(() => void this.flush(), FLUSH_EVERY_MS);
	}

	async stop(): Promise<void> {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
		await this.flush();
	}

	/** Fire-and-forget. Call after the game transaction committed. Never throws. */
	track(input: TrackInput): void {
		try {
			const props = this.validate(input.kind, input.props ?? {});
			if (!props) {
				this.log.warn({ kind: input.kind }, "telemetry: unknown kind or invalid props, dropped");
				return;
			}
			const id = input.key
				? `${input.kind}:${input.key}`
				: input.ref
					? `${input.kind}:${input.ref}`
					: `${input.kind}:${randomUUID()}`;
			this.buffer.push({
				_id: id,
				kind: input.kind,
				at: input.at ?? new Date(),
				day: input.ctx.day,
				userId: input.ctx.userId,
				characterId: input.ctx.characterId,
				sid: input.ctx.sid,
				client: input.ctx.client ?? {},
				props,
			});
			if (this.buffer.length > MAX_BUFFER) this.buffer.splice(0, this.buffer.length - MAX_BUFFER);
			if (this.buffer.length >= FLUSH_AT) void this.flush();
		} catch (err) {
			this.log.warn({ err }, "telemetry: track failed, dropped");
		}
	}

	/** Unordered insertMany; duplicate _ids (E11000) are expected and ignored. */
	async flush(): Promise<void> {
		if (this.flushing || this.buffer.length === 0) return;
		this.flushing = true;
		const batch = this.buffer.splice(0, this.buffer.length);
		try {
			await Telemetry.insertMany(batch, { ordered: false, lean: true });
		} catch (err) {
			if (!onlyDuplicateKeys(err)) this.log.warn({ err, size: batch.length }, "telemetry: flush failed, batch dropped");
		} finally {
			this.flushing = false;
		}
	}

	/**
	 * Record activity for player-days and sessions. Call from the request
	 * context for authenticated calls. At most one upsert a minute per user,
	 * not awaited by the request.
	 */
	touch(ctx: TelemetryCtx, now = new Date()): void {
		if (!ctx.userId) return;
		const ms = now.getTime();
		const last = this.lastTouch.get(ctx.userId) ?? 0;
		if (ms - last < TOUCH_EVERY_MS) return;
		this.lastTouch.set(ctx.userId, ms);
		const minute = Math.floor(ms / 60_000);

		// One upsert with an update pipeline: extend the last span if it ended
		// within SESSION_GAP_MIN minutes, otherwise open a new span.
		void PlayerDay.updateOne(
			{ _id: `${ctx.userId}:${ctx.day}` },
			[
				{
					$set: {
						userId: ctx.userId,
						day: ctx.day,
						firstAt: { $ifNull: ["$firstAt", now] },
						lastAt: now,
						spans: {
							$let: {
								vars: {
									s: { $ifNull: ["$spans", []] },
									lastEnd: { $arrayElemAt: [{ $arrayElemAt: [{ $ifNull: ["$spans", [[0, -1e12]]] }, -1] }, 1] },
								},
								in: {
									$cond: [
										{ $and: [{ $gt: [{ $size: "$$s" }, 0] }, { $gte: ["$$lastEnd", minute - SESSION_GAP_MIN] }] },
										{
											$concatArrays: [
												{ $slice: ["$$s", { $subtract: [{ $size: "$$s" }, 1] }] },
												[[{ $arrayElemAt: [{ $arrayElemAt: ["$$s", -1] }, 0] }, minute]],
											],
										},
										{ $concatArrays: ["$$s", [[minute, minute]]] },
									],
								},
							},
						},
					},
				},
			],
			{ upsert: true },
		).catch((err: unknown) => this.log.warn({ err }, "telemetry: playerDays touch failed"));

		if (this.lastTouch.size > 50_000) this.lastTouch.clear(); // bounded memory
	}
}

function onlyDuplicateKeys(err: unknown): boolean {
	const e = err as { code?: number; writeErrors?: { code?: number }[] };
	if (e?.code === 11000) return true;
	return Array.isArray(e?.writeErrors) && e.writeErrors.length > 0 && e.writeErrors.every((w) => w.code === 11000);
}
