import type { GameContent } from '@irongate/content';
import { CampaignEvent, Character, ChatLimit, ChatMessage, ChatReport, Stay, isDuplicateKeyError } from '@irongate/db';
import type { CharacterDoc, ChatLimitDoc, ChatMessageDoc, StayDoc } from '@irongate/db';
import { CHAT, PRESENCE, channelsOf, chatRateCheck, dayKey, normaliseChatText, parseChannel } from '@irongate/rules';
import type { ChatChannelsView, ChatLineButton, ChatLineView, ChatPageView, CharacterView } from '@irongate/rules';
import { Types } from 'mongoose';
import { GameError, gameError } from '../gameError';
import { check } from '../moderation';
import type { SessionUser } from '../trpc/context';
import { loadCharacter } from './dayService';
import { residenceCityId } from './residence';
import { MAX_ATTEMPTS, inTransaction } from './txn';
import { toCharacterView } from './views';

/**
 * Slice 6 (ADR 0038, 0039; tech design §8.2): faction chat. Posting is a tRPC mutation (one auth,
 * validation, idempotency path); the socket only pushes (`chatSocket.ts`, a change stream on
 * inserts). The limiter is one small document per poster; history never shows past the channel's
 * 200th newest line.
 */

interface Deps {
  user: SessionUser;
  content: GameContent;
  now: () => number;
}

/** A stored line as the client sees it (no per-viewer button; `withButtons` adds them). */
export function lineView(m: ChatMessageDoc): ChatLineView {
  return {
    id: m._id.toHexString(),
    channel: m.channel,
    at: m.at.getTime(),
    kind: m.kind,
    author:
      m.kind === 'member' && m.characterId
        ? { characterId: m.characterId.toHexString(), name: m.name ?? '', avatarId: m.avatarId, rank: m.rank ?? 1 }
        : null,
    text: m.text,
    system: m.system
      ? { kind: m.system.kind, payload: m.system.payload, to: m.system.to ? m.system.to.toHexString() : null, button: null }
      : null,
  };
}

/** The channels a faction member reads (tech §22.1 Q11): Party, and one per chat city. */
export function channelsFor(content: GameContent, c: Pick<CharacterDoc, 'factionId'>): string[] {
  return channelsOf(c.factionId, content.chatCities(c.factionId));
}

function assertChannel(content: GameContent, c: CharacterDoc, channel: string): void {
  const p = parseChannel(channel);
  if (!p || p.factionId !== c.factionId || !channelsFor(content, c).includes(channel)) {
    throw gameError('FORBIDDEN', 'CHAT_CHANNEL', { channel });
  }
}

/** The live button of each system line for this viewer (one `$in` read per kind). */
async function withButtons(lines: ChatLineView[], viewer: CharacterDoc, now: number): Promise<ChatLineView[]> {
  const stayIds: Types.ObjectId[] = [];
  const eventIds: Types.ObjectId[] = [];
  for (const l of lines) {
    const ref = (l.system?.payload as { eventId?: string } | undefined)?.eventId;
    if (ref && Types.ObjectId.isValid(ref)) eventIds.push(new Types.ObjectId(ref));
  }
  const refs = await ChatMessage.find({ _id: { $in: lines.map((l) => new Types.ObjectId(l.id)) } }, { 'system.ref': 1 }).lean();
  const refOf = new Map(refs.map((r) => [r._id.toHexString(), r.system?.ref ?? null]));
  for (const l of lines) {
    if (l.system && (l.system.kind === 'takenIn' || l.system.kind === 'admitted')) {
      const ref = refOf.get(l.id);
      if (ref && Types.ObjectId.isValid(ref)) stayIds.push(new Types.ObjectId(ref));
    }
  }
  const [stays, events] = await Promise.all([
    stayIds.length ? Stay.find({ _id: { $in: stayIds } }).lean<StayDoc[]>() : Promise.resolve([] as StayDoc[]),
    eventIds.length
      ? CampaignEvent.find({ _id: { $in: eventIds }, factionId: viewer.factionId }, { status: 1, startsAt: 1, roles: 1, hands: 1 }).lean()
      : Promise.resolve([]),
  ]);
  return lines.map((l) => {
    if (!l.system) return l;
    let button: ChatLineButton | null = null;
    const payload = l.system.payload as { characterId?: string; eventId?: string; iron?: number };
    if (l.system.kind === 'takenIn' || l.system.kind === 'admitted') {
      const stay = stays.find((s) => s._id.toHexString() === refOf.get(l.id));
      const live = stay && !stay.releasedAt && stay.until.getTime() > now && payload.characterId !== viewer._id.toHexString();
      if (live && stay.kind === 'cells' && !stay.bailPostedBy && stay.bail)
        button = { kind: 'postBail', iron: stay.bail.total, characterId: payload.characterId ?? '' };
      if (live && stay.kind === 'infirmary' && !(stay.visits ?? []).some((v) => v.characterId.equals(viewer._id)))
        button = { kind: 'visit', characterId: payload.characterId ?? '' };
    } else if (payload.eventId) {
      const ev = events.find((e) => e._id.toHexString() === payload.eventId);
      if (ev?.status === 'open' && ev.startsAt.getTime() > now) button = { kind: 'join', eventId: payload.eventId };
      else if (ev?.status === 'resolved') button = { kind: 'seeResult', eventId: payload.eventId };
    }
    return { ...l, system: { ...l.system, button } };
  });
}

/** `chat.channels` (tech §8.1). */
export async function chatChannels(deps: Deps): Promise<ChatChannelsView> {
  const { content } = deps;
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, content, now);
  const ids = channelsFor(content, c);
  const seenSince = new Date(now - PRESENCE.hereNowMs);
  const channels = await Promise.all(
    ids.map(async (id) => {
      const p = parseChannel(id)!;
      const cityId = p.kind === 'city' ? p.cityId : null;
      const hereNow = await Character.countDocuments({
        factionId: c.factionId,
        'presence.seenAt': { $gte: seenSince },
        ...(cityId ? { cityId } : {}),
      });
      return {
        id,
        kind: p.kind,
        cityId,
        name: cityId ? (content.city(cityId)?.name ?? cityId) : content.faction(c.factionId).shortName,
        hereNow,
      };
    }),
  );
  const home = residenceCityId(c);
  const current = ids.find((id) => id.endsWith(`:${c.cityId}`)) ?? ids.find((id) => id.endsWith(`:${home}`)) ?? ids[0]!;
  return { channels, current };
}

/** `chat.history` (tech §8.1): 50 before the cursor, never past the channel's 200th newest. */
export async function chatHistory(deps: Deps & { input: { channel: string; before?: string | undefined } }): Promise<ChatPageView> {
  const { content, input } = deps;
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, content, now);
  assertChannel(content, c, input.channel);
  const floor = await ChatMessage.find({ channel: input.channel }, { at: 1 })
    .sort({ at: -1, _id: -1 })
    .skip(CHAT.keep - 1)
    .limit(1)
    .lean();
  const filter: Record<string, unknown> = { channel: input.channel };
  const and: Record<string, unknown>[] = [];
  if (floor[0]) and.push({ $or: [{ at: { $gt: floor[0].at } }, { at: floor[0].at, _id: { $gte: floor[0]._id } }] });
  if (input.before) {
    const b = await ChatMessage.findById(new Types.ObjectId(input.before), { at: 1 }).lean();
    if (b) and.push({ $or: [{ at: { $lt: b.at } }, { at: b.at, _id: { $lt: b._id } }] });
  }
  if (and.length) filter.$and = and;
  const rows = await ChatMessage.find(filter).sort({ at: -1, _id: -1 }).limit(CHAT.page + 1).lean<ChatMessageDoc[]>();
  const more = rows.length > CHAT.page;
  const page = rows.slice(0, CHAT.page).reverse();
  const p = parseChannel(input.channel);
  const hereNow = await Character.countDocuments({
    factionId: c.factionId,
    'presence.seenAt': { $gte: new Date(now - PRESENCE.hereNowMs) },
    ...(p?.kind === 'city' ? { cityId: p.cityId } : {}),
  });
  return {
    channel: input.channel,
    lines: await withButtons(page.map(lineView), c, now),
    more,
    muted: (c.mutes ?? []).map((m) => m.toHexString()),
    hereNow,
  };
}

/** A refused line (design §23.1): the limiter's write commits; nothing else is stored. */
const REFUSED = Symbol('refused');

/** `chat.post` (ADR 0039): the limiter and the insert in one transaction; a retried key returns the line. */
export async function chatPost(
  deps: Deps & { input: { channel: string; text: string; idempotencyKey: string } },
): Promise<ChatLineView> {
  const { content, input } = deps;
  const now0 = deps.now();
  const { doc: c } = await loadCharacter(deps.user, content, now0);
  assertChannel(content, c, input.channel);
  const stored = async () => {
    const m = await ChatMessage.findOne({ characterId: c._id, idempotencyKey: input.idempotencyKey, kind: 'member' }).lean<ChatMessageDoc>();
    return m ? lineView(m) : null;
  };
  const existing = await stored();
  if (existing) return existing;
  const norm = normaliseChatText(input.text);
  if (!norm.ok) throw gameError('BAD_REQUEST', 'CHAT_TEXT', { why: norm.reason });
  const p = parseChannel(input.channel)!;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const done = await inTransaction(async (session): Promise<ChatLineView | typeof REFUSED> => {
        const now = deps.now();
        const lim = await ChatLimit.findById(c._id).session(session).lean<ChatLimitDoc>();
        const recent = (lim?.recent ?? []).map((d) => new Date(d).getTime());
        const last = lim?.last ? { hash: lim.last.hash, at: new Date(lim.last.at).getTime() } : null;
        const rate = chatRateCheck({ recent, last, hash: norm.hash, now });
        if (rate) throw new GameError('CHAT_RATE', { why: rate.reason, retryAt: rate.retryAt }, 'TOO_MANY_REQUESTS');
        const today = dayKey(now);
        // Review 7 #2 (design §23.1): the limiter first, then the word filter. A refused line is
        // not stored, but it still counts toward the rate limits, so a repeat attempt is bounded.
        const filtered = check(norm.text);
        if (filtered.refused) {
          await ChatLimit.updateOne(
            { _id: c._id },
            {
              $push: { recent: { $each: [new Date(now)], $slice: -CHAT.window.max } },
              $set: { lastDay: today },
              $inc: { days: lim?.lastDay === today ? 0 : 1 },
              $setOnInsert: { firstAt: new Date(now), posts: 0 },
            },
            { session, upsert: true },
          );
          return REFUSED;
        }
        await ChatLimit.updateOne(
          { _id: c._id },
          {
            $push: { recent: { $each: [new Date(now)], $slice: -CHAT.window.max } },
            $set: { last: { hash: norm.hash, at: new Date(now) }, lastDay: today },
            $inc: { posts: 1, days: lim?.lastDay === today ? 0 : 1 },
            $setOnInsert: { firstAt: new Date(now) },
          },
          { session, upsert: true },
        );
        const [m] = await ChatMessage.create(
          [
            {
              channel: input.channel,
              factionId: c.factionId,
              cityId: p.kind === 'city' ? p.cityId : null,
              kind: 'member',
              characterId: c._id,
              name: c.name,
              avatarId: c.avatarId ?? null,
              rank: c.rank,
              text: filtered.text,
              system: null,
              idempotencyKey: input.idempotencyKey,
              at: new Date(now),
            },
          ],
          { session },
        );
        return lineView(m!.toObject() as ChatMessageDoc);
      });
      if (done === REFUSED) throw gameError('BAD_REQUEST', 'CHAT_REFUSED');
      return done;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const winner = await stored();
        if (winner) return winner;
        continue;
      }
      if (err instanceof GameError) {
        const winner = await stored();
        if (winner) return winner;
        throw err.toTRPC();
      }
      throw err;
    }
  }
  const winner = await stored();
  if (winner) return winner;
  throw gameError('CONFLICT', 'ACTION_CONFLICT', { attempts: MAX_ATTEMPTS });
}

/** `chat.seen`: `chat.seenAt = now` ($max). */
export async function chatSeen(deps: Deps): Promise<{ ok: true }> {
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, deps.content, now);
  await Character.updateOne({ _id: c._id }, { $max: { 'chat.seenAt': new Date(now) } });
  return { ok: true };
}

/** `chat.report` (ADR 0039): once per reporter per line, with the 20 lines around it. */
export async function chatReport(deps: Deps & { input: { messageId: string } }): Promise<{ reported: true; already: boolean }> {
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, deps.content, now);
  const m = await ChatMessage.findById(new Types.ObjectId(deps.input.messageId)).lean<ChatMessageDoc>();
  if (!m || m.kind !== 'member' || !m.characterId || m.characterId.equals(c._id) || m.factionId !== c.factionId) {
    throw gameError('PRECONDITION_FAILED', 'CANNOT_REPORT');
  }
  const before = await ChatMessage.find({ channel: m.channel, at: { $lte: m.at }, _id: { $ne: m._id } }).sort({ at: -1 }).limit(10).lean<ChatMessageDoc[]>();
  const after = await ChatMessage.find({ channel: m.channel, at: { $gte: m.at }, _id: { $ne: m._id } }).sort({ at: 1 }).limit(9).lean<ChatMessageDoc[]>();
  const context = [...before.reverse(), m, ...after].map(lineView);
  try {
    await ChatReport.create([
      { messageId: m._id, channel: m.channel, reporterId: c._id, reportedId: m.characterId, text: m.text ?? '', context },
    ]);
    return { reported: true, already: false };
  } catch (err) {
    if (isDuplicateKeyError(err)) return { reported: true, already: true };
    throw err;
  }
}

/** `chat.mute`: `$addToSet` / `$pull` (≤ 200). */
export async function chatMute(deps: Deps & { input: { characterId: string; muted: boolean } }): Promise<{ muted: string[] }> {
  const now = deps.now();
  const { doc: c } = await loadCharacter(deps.user, deps.content, now);
  const id = new Types.ObjectId(deps.input.characterId);
  if (id.equals(c._id)) throw gameError('PRECONDITION_FAILED', 'SELF');
  const updated = await Character.findOneAndUpdate(
    { _id: c._id, ...(deps.input.muted ? { [`mutes.${CHAT.maxMutes - 1}`]: { $exists: false } } : {}) },
    deps.input.muted ? { $addToSet: { mutes: id } } : { $pull: { mutes: id } },
    { returnDocument: 'after', lean: true },
  );
  return { muted: (updated?.mutes ?? c.mutes ?? []).map((m) => m.toHexString()) };
}

/** `chat.setHidden` (Me · *Chat*). */
export async function chatSetHidden(deps: Deps & { input: { hidden: boolean } }): Promise<{ character: CharacterView }> {
  const now = deps.now();
  const loaded = await loadCharacter(deps.user, deps.content, now);
  const updated = await Character.findOneAndUpdate(
    { _id: loaded.doc._id },
    { $set: { 'chat.hidden': deps.input.hidden } },
    { returnDocument: 'after', lean: true },
  );
  return { character: toCharacterView(updated ?? loaded.doc, now, deps.content, loaded.editionReadAt, { city: loaded.city }) };
}

/** The *for you* dot (tech §8.3): a line addressed to the character since they last opened chat. */
export async function chatForYou(c: CharacterDoc): Promise<boolean> {
  const since = c.chat?.seenAt ? new Date(c.chat.seenAt) : new Date(0);
  return !!(await ChatMessage.exists({ 'system.to': c._id, at: { $gt: since } }));
}

/** The daily trim (tech §9): lines older than each channel's 200th newest. */
export async function trimChat(content: GameContent): Promise<number> {
  let deleted = 0;
  for (const f of ['vanguard', 'collective', 'alliance'] as const) {
    for (const channel of channelsOf(f, content.chatCities(f))) {
      const floor = await ChatMessage.find({ channel }, { at: 1 }).sort({ at: -1, _id: -1 }).skip(CHAT.keep - 1).limit(1).lean();
      if (!floor[0]) continue;
      const r = await ChatMessage.deleteMany({
        channel,
        $or: [{ at: { $lt: floor[0].at } }, { at: floor[0].at, _id: { $lt: floor[0]._id } }],
      });
      deleted += r.deletedCount;
    }
  }
  return deleted;
}
