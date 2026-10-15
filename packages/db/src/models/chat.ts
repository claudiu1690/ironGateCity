import { CHAT, FACTION_IDS, SYSTEM_LINE_KINDS } from '@irongate/rules';
import type { ChatLineView, DayKey, FactionId, SystemLineKind } from '@irongate/rules';
import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

/**
 * Slice 6 (ADR 0038, 0039; tech design §5.3): faction chat. Lines expire after seven days (TTL); the
 * 200-a-channel cap is enforced on read and trimmed daily. System lines are outbox inserts in the
 * transaction that caused them, deduplicated by `dedupeKey`. Fan-out is a change stream on inserts.
 */
export interface ChatMessageDoc {
  _id: Types.ObjectId;
  /** 'party:collective' · 'city:collective:coalport'. */
  channel: string;
  factionId: FactionId;
  cityId: string | null;
  kind: 'member' | 'system';
  /** A snapshot of the author at the time (member lines). */
  characterId: Types.ObjectId | null;
  name: string | null;
  avatarId: string | null;
  rank: number | null;
  /** Member lines: ≤ 280 code points, normalised (`normaliseChatText`). */
  text: string | null;
  system: { kind: SystemLineKind; payload: Record<string, unknown>; to?: Types.ObjectId; ref?: string } | null;
  /** Member lines. */
  idempotencyKey?: string;
  /** System lines: 'called:{id}', 'result:{id}', 'held:{stayId}', 'nudge:{event}:{from}:{to}', … */
  dedupeKey?: string;
  at: Date;
}

const chatMessageSchema = new Schema<ChatMessageDoc>(
  {
    channel: { type: String, required: true },
    factionId: { type: String, enum: FACTION_IDS, required: true },
    cityId: { type: String, default: null },
    kind: { type: String, enum: ['member', 'system'], required: true },
    characterId: { type: Schema.Types.ObjectId, default: null },
    name: { type: String, default: null },
    avatarId: { type: String, default: null },
    rank: { type: Number, default: null },
    text: { type: String, default: null, maxlength: CHAT.maxLength * 2 },
    system: {
      type: new Schema(
        {
          kind: { type: String, enum: SYSTEM_LINE_KINDS, required: true },
          payload: { type: Schema.Types.Mixed, default: {} },
          to: { type: Schema.Types.ObjectId },
          ref: { type: String },
        },
        { _id: false, minimize: false },
      ),
      default: null,
    },
    idempotencyKey: { type: String },
    dedupeKey: { type: String },
    at: { type: Date, required: true },
  },
  { collection: 'chatMessages', strict: true, versionKey: false, minimize: false },
);
chatMessageSchema.index({ channel: 1, at: -1, _id: -1 }, { name: 'chat_history' });
chatMessageSchema.index({ at: 1 }, { expireAfterSeconds: CHAT.ttlDays * 86_400, name: 'chat_ttl' });
chatMessageSchema.index(
  { characterId: 1, idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { kind: 'member' }, name: 'chat_key' },
);
chatMessageSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $exists: true } }, name: 'chat_dedupe' },
);
// The *for you* dot.
chatMessageSchema.index(
  { 'system.to': 1, at: -1 },
  { partialFilterExpression: { 'system.to': { $exists: true } }, name: 'chat_for_you' },
);

export const ChatMessage = model<ChatMessageDoc>('ChatMessage', chatMessageSchema);

/** A report with its context (≤ 20 lines around it); kept for slice 9's audit (no TTL). */
export interface ChatReportDoc {
  _id: Types.ObjectId;
  messageId: Types.ObjectId;
  channel: string;
  reporterId: Types.ObjectId;
  reportedId: Types.ObjectId;
  text: string;
  context: ChatLineView[];
  createdAt: Date;
}

const chatReportSchema = new Schema<ChatReportDoc>(
  {
    messageId: { type: Schema.Types.ObjectId, required: true },
    channel: { type: String, required: true },
    reporterId: { type: Schema.Types.ObjectId, required: true },
    reportedId: { type: Schema.Types.ObjectId, required: true },
    text: { type: String, required: true },
    context: { type: Schema.Types.Mixed, default: [] },
  },
  {
    collection: 'chatReports',
    strict: true,
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    minimize: false,
  },
);
chatReportSchema.index({ messageId: 1, reporterId: 1 }, { unique: true, name: 'report_once' });
chatReportSchema.index({ createdAt: -1 }, { name: 'report_recent' });

export const ChatReport = model<ChatReportDoc>('ChatReport', chatReportSchema);

/**
 * One per poster (`_id` = the character id), so a chat post never writes the character: the last 30
 * post times (oldest first), the last line's hash, and the report's counters.
 */
export interface ChatLimitDoc {
  _id: Types.ObjectId;
  recent: Date[];
  last: { hash: string; at: Date } | null;
  posts: number;
  firstAt: Date | null;
  days: number;
  lastDay: DayKey | null;
}

const chatLimitSchema = new Schema<ChatLimitDoc>(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    recent: { type: [Date], default: [] },
    last: { type: new Schema({ hash: String, at: Date }, { _id: false }), default: null },
    posts: { type: Number, default: 0, min: 0 },
    firstAt: { type: Date, default: null },
    days: { type: Number, default: 0, min: 0 },
    lastDay: { type: Number, default: null },
  },
  { collection: 'chatLimits', strict: true, versionKey: false, minimize: false },
);

export const ChatLimit = model<ChatLimitDoc>('ChatLimit', chatLimitSchema);
