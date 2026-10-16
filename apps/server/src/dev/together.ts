import { randomUUID } from 'node:crypto';
import type { GameContent } from '@irongate/content';
import { CampaignEvent, Character, ChatLimit, ChatMessage, EventSignup } from '@irongate/db';
import type { CampaignEventDoc, CharacterDoc } from '@irongate/db';
import { RANK_FXP, dayKey, levelForXp, xpForLevel } from '@irongate/rules';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Types } from 'mongoose';
import { z } from 'zod';
import type { Auth } from '../auth';
import { GameError } from '../gameError';
import { chatPost } from '../services/chatService';
import { callEvent, eventHooks, signUpEvent } from '../services/eventService';
import { sendToHeld } from '../services/heldService';
import { nameWordsOf } from '@irongate/db';

/**
 * Slice 6 (tech design §8.6): the together hooks, for solo play and e2e. Registered only inside the
 * E2E_TEST_HOOKS guard (memory mode). Test members are characters with `userId: 'test:{uuid}'` (no
 * login); they act through the real services with that user, so every rule applies to them. The
 * playtest report leaves them out by that prefix.
 */

export const TEST_MEMBER_PREFIX = 'test:';
const NAMES = ['Ada Ross', 'Ben Holt', 'Cora Lind', 'Dan Marek', 'Eva Novak', 'Felix Brandt', 'Greta Vos', 'Hugo Lenz'];

const Oid = z.string().regex(/^[0-9a-f]{24}$/);
const MembersBody = z.strictObject({
  n: z.number().int().min(1).max(8),
  rank: z.number().int().min(1).max(7).optional(),
  level: z.number().int().min(1).max(60).optional(),
  cityId: z.string().min(1).optional(),
  energy: z.number().int().min(0).max(100).optional(),
  /** Slice 7 phase C (lane X): Political Capital, so test members can back, sign and stand. */
  pc: z.number().int().min(0).max(10_000).optional(),
});
const EventsBody = z.union([
  z.strictObject({ startNow: z.union([Oid, z.literal('mine')]) }),
  z.strictObject({ fill: Oid, members: z.array(Oid).min(1).max(9), as: z.enum(['roles', 'hands']).optional() }),
  z.strictObject({
    rolls: z.strictObject({
      eventId: Oid,
      byRole: z.union([z.record(z.string(), z.number().int().min(1).max(100)), z.literal('success'), z.literal('failure')]),
    }),
  }),
  z.strictObject({
    call: z.strictObject({
      typeId: z.string().min(1),
      hours: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
      roleId: z.string().min(1),
      as: Oid,
      districtId: z.string().min(1).nullable().optional(),
    }),
  }),
]);
const ChatBody = z.union([
  z.strictObject({ as: Oid, channel: z.string().min(1), text: z.string().min(1).max(2_000) }),
  z.strictObject({ resetLimits: z.literal(true) }),
]);
const PresenceBody = z.strictObject({ characterId: Oid, locationId: z.string().min(1).nullable(), seenAgoMs: z.number().int().min(0) });
const MemberHeldBody = z.strictObject({ send: z.enum(['cells', 'infirmary']), characterId: Oid });

class Refusal extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const userOf = (c: Pick<CharacterDoc, 'userId' | 'name'>) => ({ id: c.userId, name: c.name });

async function testMember(id: string, factionId?: string): Promise<CharacterDoc> {
  const m = await Character.findById(new Types.ObjectId(id)).lean<CharacterDoc>();
  if (!m || !m.userId.startsWith(TEST_MEMBER_PREFIX)) throw new Refusal(404, 'not a test member');
  if (factionId && m.factionId !== factionId) throw new Refusal(400, 'not of your faction');
  return m;
}

/** `n` test members of the caller's faction, cloned from the caller's settled character. */
export async function createTestMembers(
  content: GameContent,
  me: CharacterDoc,
  body: z.output<typeof MembersBody>,
  now: number,
): Promise<Array<{ characterId: string; name: string }>> {
  if (body.cityId && !content.city(body.cityId)) throw new Refusal(400, 'unknown cityId');
  const out: Array<{ characterId: string; name: string }> = [];
  const taken = await Character.countDocuments({ userId: { $regex: `^${TEST_MEMBER_PREFIX}` }, factionId: me.factionId });
  for (let k = 0; k < body.n; k++) {
    const _id = new Types.ObjectId();
    const name = `${NAMES[(taken + k) % NAMES.length]}${taken + k >= NAMES.length ? ` ${Math.floor((taken + k) / NAMES.length) + 1}` : ''}`;
    const rank = body.rank ?? 1;
    const level = body.level ?? me.level;
    const xp = Math.max(xpForLevel(level), 0);
    const at = new Date(now);
    const { _id: _drop, ...rest } = me;
    void _drop;
    await Character.create([
      {
        ...rest,
        _id,
        userId: `${TEST_MEMBER_PREFIX}${randomUUID()}`,
        name,
        nameWords: nameWordsOf(name),
        avatarId: content.avatars[(taken + k) % content.avatars.length] ?? me.avatarId,
        cityId: body.cityId ?? me.cityId,
        rank,
        fxp: RANK_FXP[Math.max(0, rank - 1)] ?? 0,
        level: levelForXp(xp) || level,
        xp,
        pc: body.pc ?? 0,
        iron: 500,
        energy: { value: body.energy ?? 100, updatedAt: at },
        rested: 0,
        job: null,
        journey: null,
        held: null,
        runIn: null,
        runInUnseen: [],
        offices: [],
        localStanding: [],
        inventory: [],
        presence: { locationId: null, seenAt: at },
        events: { open: [], calls: [], unseen: [] },
        chat: { hidden: false, seenAt: null },
        mutes: [],
        lastActionAt: at,
        version: 0,
        createdAt: at,
        updatedAt: at,
      },
    ]);
    out.push({ characterId: _id.toHexString(), name });
  }
  return out;
}

export function registerTogetherHooks(
  app: FastifyInstance,
  deps: { auth: Auth; content: GameContent; now: () => number },
): void {
  const { auth, content, now } = deps;

  async function me(request: FastifyRequest): Promise<CharacterDoc> {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) throw new Refusal(401, 'sign in first');
    const c = await Character.findOne({ userId: session.user.id }).lean<CharacterDoc>();
    if (!c) throw new Refusal(404, 'no character yet');
    return c;
  }
  const handle =
    <S extends z.ZodType>(schema: S, fn: (body: z.output<S>, c: CharacterDoc) => Promise<object>) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const parsed = schema.safeParse(request.body ?? {});
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues.map((i) => i.message).join('; ') });
        return { ok: true, ...(await fn(parsed.data, await me(request))) };
      } catch (err) {
        if (err instanceof Refusal) return reply.code(err.status).send({ error: err.message });
        const cause = (err as { cause?: unknown }).cause;
        if (cause instanceof GameError) return reply.code(409).send({ error: cause.reason, ...cause.data });
        throw err;
      }
    };

  app.post('/api/test/members', handle(MembersBody, async (body, c) => ({ members: await createTestMembers(content, c, body, now()) })));

  app.post(
    '/api/test/events',
    handle(EventsBody, async (body, c) => {
      if ('startNow' in body) {
        const ev =
          body.startNow === 'mine'
            ? await CampaignEvent.findOne({
                _id: { $in: (c.events?.open ?? []).map((p) => p.eventId) },
                status: 'open',
              })
                .sort({ startsAt: 1 })
                .lean<CampaignEventDoc>()
            : await CampaignEvent.findOne({ _id: new Types.ObjectId(body.startNow), factionId: c.factionId, status: 'open' }).lean<CampaignEventDoc>();
        if (!ev) throw new Refusal(404, 'no open event');
        const at = new Date(now());
        await CampaignEvent.updateOne({ _id: ev._id, status: 'open' }, { $set: { startsAt: at } });
        await EventSignup.updateMany({ eventId: ev._id }, { $set: { startsAt: at } });
        await Character.updateMany(
          { 'events.open.eventId': ev._id },
          { $set: { 'events.open.$[p].startsAt': at } },
          { arrayFilters: [{ 'p.eventId': ev._id }] },
        );
        await Character.updateMany(
          { 'events.calls.eventId': ev._id },
          { $set: { 'events.calls.$[p].startsAt': at } },
          { arrayFilters: [{ 'p.eventId': ev._id }] },
        );
        return { eventId: ev._id.toHexString(), startsAt: at.getTime() };
      }
      if ('rolls' in body) {
        eventHooks.rolls.set(body.rolls.eventId, body.rolls.byRole);
        return { eventId: body.rolls.eventId };
      }
      if ('call' in body) {
        const m = await testMember(body.call.as, c.factionId);
        const r = await callEvent({
          user: userOf(m),
          content,
          now,
          input: {
            typeId: body.call.typeId,
            hours: body.call.hours,
            roleId: body.call.roleId,
            districtId: body.call.districtId ?? null,
            idempotencyKey: randomUUID(),
          },
        });
        return { eventId: r.view.kind === 'event' ? r.view.event.id : null };
      }
      const ev = await CampaignEvent.findOne({ _id: new Types.ObjectId(body.fill), factionId: c.factionId }).lean<CampaignEventDoc>();
      if (!ev) throw new Refusal(404, 'no such event');
      const signed: Array<{ characterId: string; slot: string }> = [];
      const freeRoles = ev.roles.filter((r) => r.holder === null).map((r) => r.roleId);
      for (const id of body.members) {
        const m = await testMember(id, c.factionId);
        const asRole = body.as !== 'hands' && m.rank >= 2 && freeRoles.length > 0;
        const slot = asRole ? { roleId: freeRoles.shift()! } : ('hand' as const);
        await signUpEvent({ user: userOf(m), content, now, input: { eventId: body.fill, slot, idempotencyKey: randomUUID() } });
        signed.push({ characterId: id, slot: slot === 'hand' ? 'hand' : slot.roleId });
      }
      return { signed };
    }),
  );

  app.post(
    '/api/test/chat',
    handle(ChatBody, async (body, c) => {
      if ('resetLimits' in body) {
        await ChatLimit.deleteOne({ _id: c._id });
        return { reset: true };
      }
      const m = await testMember(body.as, c.factionId);
      const line = await chatPost({ user: userOf(m), content, now, input: { channel: body.channel, text: body.text, idempotencyKey: randomUUID() } });
      return { line };
    }),
  );

  app.post(
    '/api/test/presence',
    handle(PresenceBody, async (body, c) => {
      const m = await testMember(body.characterId, c.factionId);
      await Character.updateOne(
        { _id: m._id },
        { $set: { 'presence.locationId': body.locationId, 'presence.seenAt': new Date(now() - body.seenAgoMs) } },
      );
      return { characterId: body.characterId };
    }),
  );

  // Tech §8.6 (slice 5's `/api/test/held`, extended): a test member to the cells or the infirmary.
  app.post(
    '/api/test/member-held',
    handle(MemberHeldBody, async (body, c) => {
      const m = await testMember(body.characterId, c.factionId);
      await sendToHeld(content, m._id, body.send, now());
      const after = await Character.findById(m._id, { held: 1 }).lean<CharacterDoc>();
      return { held: { kind: body.send, until: after?.held ? new Date(after.held.until).getTime() : null } };
    }),
  );
}

/** The dev panel's status lines (tech §8.7). */
export async function togetherStatus(c: CharacterDoc, now: number) {
  const evs = await CampaignEvent.find({ factionId: c.factionId, cityId: c.cityId, status: 'open' }).lean<CampaignEventDoc[]>();
  const lim = await ChatLimit.findById(c._id).lean();
  const forYou = await ChatMessage.countDocuments({ 'system.to': c._id });
  return {
    signups: (c.events?.open ?? []).map((p) => ({ eventId: p.eventId.toHexString(), slot: p.slot, startsAt: new Date(p.startsAt).getTime() })),
    eventsHere: evs.map((e) => ({
      id: e._id.toHexString(),
      kind: e.kind,
      typeId: e.typeId,
      startsAt: e.startsAt.getTime(),
      filled: e.roles.filter((r) => r.holder).length,
      roles: e.roles.length,
      hands: e.hands.length,
    })),
    fixtureToday: evs.find((e) => e.kind === 'fixture' && e.day === dayKey(now))?._id.toHexString() ?? null,
    unseenResults: c.events?.unseen?.length ?? 0,
    chat: { recent: lim?.recent?.length ?? 0, lastAt: lim?.last ? new Date(lim.last.at).getTime() : null, forYou },
    presence: { seenAt: c.presence?.seenAt ? new Date(c.presence.seenAt).getTime() : null, locationId: c.presence?.locationId ?? null },
  };
}

/** The dev panel's together buttons (tech §8.7): each calls a hook's function; the panel holds no rule. */
export async function togetherAction(
  content: GameContent,
  c: CharacterDoc,
  action: 'members' | 'fillEvent' | 'startEvent' | 'rolls' | 'memberCells' | 'memberWard' | 'memberSays' | 'chatReset',
  target: unknown,
  now: () => number,
): Promise<string> {
  const mates = async () =>
    Character.find({ factionId: c.factionId, cityId: c.cityId, userId: { $regex: `^${TEST_MEMBER_PREFIX}` } })
      .limit(8)
      .lean<CharacterDoc[]>();
  const soonest = async () =>
    CampaignEvent.findOne({ _id: { $in: (c.events?.open ?? []).map((p) => p.eventId) }, status: 'open' })
      .sort({ startsAt: 1 })
      .lean<CampaignEventDoc>();
  switch (action) {
    case 'members': {
      const made = await createTestMembers(content, c, { n: 3, rank: 2 }, now());
      return `Three test members here: ${made.map((m) => m.name).join(', ')}`;
    }
    case 'fillEvent': {
      const ev = await soonest();
      if (!ev) return 'No open event of yours to fill';
      let n = 0;
      const free = ev.roles.filter((r) => r.holder === null).map((r) => r.roleId);
      for (const m of await mates()) {
        if (ev.roles.some((r) => r.holder?.characterId.equals(m._id)) || ev.hands.some((h) => h.characterId.equals(m._id))) continue;
        const role = target !== 'hands' && m.rank >= 2 ? free.shift() : undefined;
        try {
          await signUpEvent({
            user: userOf(m),
            content,
            now,
            input: { eventId: ev._id.toHexString(), slot: role ? { roleId: role } : 'hand', idempotencyKey: randomUUID() },
          });
          n += 1;
        } catch {
          // A full event or a test member out of Energy: the next one.
        }
      }
      return `${n} test members signed up`;
    }
    case 'startEvent': {
      const ev = await soonest();
      if (!ev) return 'No open event of yours';
      const at = new Date(now());
      await CampaignEvent.updateOne({ _id: ev._id, status: 'open' }, { $set: { startsAt: at } });
      await EventSignup.updateMany({ eventId: ev._id }, { $set: { startsAt: at } });
      await Character.updateMany(
        { 'events.open.eventId': ev._id },
        { $set: { 'events.open.$[p].startsAt': at } },
        { arrayFilters: [{ 'p.eventId': ev._id }] },
      );
      return 'Your event starts now: the next read resolves it';
    }
    case 'rolls': {
      const ev = await soonest();
      if (!ev) return 'No open event of yours';
      if (target === 'random') eventHooks.rolls.delete(ev._id.toHexString());
      else eventHooks.rolls.set(ev._id.toHexString(), target === 'failure' ? 'failure' : 'success');
      return `Next rolls: ${target === 'failure' ? 'all fail' : target === 'random' ? 'random' : 'all succeed'}`;
    }
    case 'memberCells':
    case 'memberWard': {
      const m = (await mates()).find((x) => !(x.held && x.held.state === 'in'));
      if (!m) return 'No free test member here';
      await sendToHeld(content, m._id, action === 'memberCells' ? 'cells' : 'infirmary', now());
      return `${m.name} ${action === 'memberCells' ? 'taken in' : 'admitted'}`;
    }
    case 'memberSays': {
      const m = (await mates())[0];
      if (!m) return 'No test member here';
      const channel = `city:${c.factionId}:${c.cityId}`;
      try {
        await chatPost({ user: userOf(m), content, now, input: { channel, text: `Who's on tonight? (${new Date(now()).toISOString().slice(11, 19)})`, idempotencyKey: randomUUID() } });
      } catch {
        await chatPost({ user: userOf(m), content, now, input: { channel: `party:${c.factionId}`, text: `Anyone about? (${now()})`, idempotencyKey: randomUUID() } });
      }
      return `${m.name} said something`;
    }
    case 'chatReset':
      await ChatLimit.deleteOne({ _id: c._id });
      return 'Your chat limits are cleared';
  }
}
