import type { GameContent } from '@irongate/content';
import { Character, Nation, OfficeTerm } from '@irongate/db';
import type { CharacterDoc, NationDoc } from '@irongate/db';
import { FACTION_IDS, dayKey, termOf } from '@irongate/rules';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { fromNodeHeaders } from 'better-auth/node';
import { Types } from 'mongoose';
import { z } from 'zod';
import type { Auth } from '../auth';
import { deputyKey, mondayBillsNow } from '../services/parliamentService';
import { createCaller } from '../trpc/router';

/**
 * Slice 7 phase B, lane 2 (docs/tech/slice-7.md §8.6): the hooks for Parliament, the ballots above the
 * council and the petitions, only with `E2E_TEST_HOOKS` (memory mode). Every vote, signature and
 * backing goes through the real procedures as the named characters (test members from
 * `/api/test/members`), so the rules and the keys are the game's; only seating a deputy writes the
 * term row and the chamber's player count directly (as `/api/test/office` does for one seat).
 */

const Oid = z.string().regex(/^[0-9a-f]{24}$/);
const As = z.array(Oid).min(1).max(40);

export const ParliamentBody = z.union([
  z.strictObject({ votes: z.strictObject({ billId: Oid, as: As, vote: z.enum(['for', 'against']) }) }),
  z.strictObject({ deputies: z.strictObject({ as: As }) }),
  z.strictObject({ secretaryBill: z.literal(true) }),
]);

export const BallotsBody = z.union([
  z.strictObject({ chair: z.strictObject({ as: As, key: z.string().min(1) }) }),
  z.strictObject({ chairBack: z.strictObject({ as: As, candidacyId: Oid }) }),
  z.strictObject({ pick: z.strictObject({ as: As, key: z.string().min(1) }) }),
  z.strictObject({ nation: z.strictObject({ as: As, factionId: z.enum(['vanguard', 'collective', 'alliance']) }) }),
  z.strictObject({ confidence: z.strictObject({ as: As, voteId: z.string().min(1), choice: z.enum(['confidence', 'noConfidence']) }) }),
]);

export const PetitionBody = z.union([
  z.strictObject({ sign: z.strictObject({ as: As, petitionId: z.string().min(1) }) }),
  z.strictObject({ chairSign: z.strictObject({ as: As }) }),
]);

class Refusal extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function registerNationHooks2(
  app: FastifyInstance,
  deps: { auth: Auth; content: GameContent; now: () => number },
): void {
  const { auth, content, now } = deps;
  const handle =
    <S extends z.ZodType>(schema: S, fn: (body: z.output<S>) => Promise<object>) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
        if (!session) throw new Refusal(401, 'sign in first');
        const parsed = schema.safeParse(request.body ?? {});
        if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues.map((i) => i.message).join('; ') });
        return { ok: true, ...(await fn(parsed.data)) };
      } catch (err) {
        if (err instanceof Refusal) return reply.code(err.status).send({ error: err.message });
        throw err;
      }
    };

  /** A caller acting as a character (a test member or any player). */
  async function callerOf(id: string) {
    const c = await Character.findById(id).lean<CharacterDoc>();
    if (!c) throw new Refusal(404, `no character ${id}`);
    return createCaller({ user: { id: c.userId, name: c.name }, content, now } as never);
  }

  /** Run one act per character; refusals are reported per character, not thrown. */
  async function each(as: string[], fn: (caller: Awaited<ReturnType<typeof callerOf>>) => Promise<unknown>) {
    const out: Array<{ characterId: string; ok: boolean; reason?: string }> = [];
    for (const id of as) {
      try {
        await fn(await callerOf(id));
        out.push({ characterId: id, ok: true });
      } catch (err) {
        const e = err as { cause?: { reason?: string }; message?: string };
        out.push({ characterId: id, ok: false, reason: e.cause?.reason ?? e.message ?? 'error' });
      }
    }
    return out;
  }

  /** Parliament: test deputies' votes, seating characters as player deputies, the Monday bills now. */
  app.post(
    '/api/test/parliament',
    handle(ParliamentBody, async (body) => {
      if ('votes' in body) {
        const { billId, vote } = body.votes;
        return { results: await each(body.votes.as, (c) => c.parliament.vote({ billId, vote, idempotencyKey: randomUUID() })) };
      }
      if ('secretaryBill' in body) return { tabled: await mondayBillsNow(content, now()) };
      const nation = await Nation.findById('republic').lean<NationDoc>();
      if (!nation) throw new Refusal(409, 'the nation is not settled yet');
      const n = nation.government.parliament.termIndex;
      const term = termOf(dayKey(now()));
      const seated: string[] = [];
      for (const id of body.deputies.as) {
        const c = await Character.findById(id).lean<CharacterDoc>();
        if (!c) throw new Refusal(404, `no character ${id}`);
        const taken = await OfficeTerm.countDocuments({ office: 'deputy', councilKey: deputyKey(n), factionId: c.factionId });
        const place = 50 + taken + 1;
        await OfficeTerm.create({
          _id: new Types.ObjectId(),
          office: 'deputy',
          cityId: 'nation',
          councilKey: deputyKey(n),
          electionId: 'test',
          seat: FACTION_IDS.indexOf(c.factionId) * 100 + place,
          factionId: c.factionId,
          districtId: null,
          vacatedDay: null,
          fromDay: dayKey(now()),
          toDay: term.toDay,
          holder: { kind: 'player', characterId: c._id, name: c.name },
          place,
          total: 0,
          completed: false,
          frontPageSeenAt: null,
          via: 'election',
        });
        await Nation.updateOne({ _id: 'republic' }, { $inc: { [`government.parliament.players.${c.factionId}`]: 1 } });
        seated.push(id);
      }
      return { seated };
    }),
  );

  /** Ballots above the council, cast through the real procedures as the named characters. */
  app.post(
    '/api/test/ballots',
    handle(BallotsBody, async (body) => {
      if ('chair' in body) {
        const { key } = body.chair;
        return { results: await each(body.chair.as, (c) => c.chairElection.vote({ key, idempotencyKey: randomUUID() })) };
      }
      if ('chairBack' in body) {
        const { candidacyId } = body.chairBack;
        return { results: await each(body.chairBack.as, (c) => c.chairElection.back({ candidacyId, idempotencyKey: randomUUID() })) };
      }
      if ('pick' in body) {
        const { key } = body.pick;
        return { results: await each(body.pick.as, (c) => c.nation.pickVote({ key, idempotencyKey: randomUUID() })) };
      }
      if ('nation' in body) {
        const { factionId } = body.nation;
        return { results: await each(body.nation.as, (c) => c.nation.vote({ factionId, idempotencyKey: randomUUID() })) };
      }
      const { voteId, choice } = body.confidence;
      return { results: await each(body.confidence.as, (c) => c.confidence.vote({ voteId, choice, idempotencyKey: randomUUID() })) };
    }),
  );

  /** Signatures on a dissolve petition, or on the petition on the Chair, as the named characters. */
  app.post(
    '/api/test/petition',
    handle(PetitionBody, async (body) => {
      if ('sign' in body) {
        const { petitionId } = body.sign;
        return { results: await each(body.sign.as, (c) => c.petition.sign({ petitionId, idempotencyKey: randomUUID() })) };
      }
      return { results: await each(body.chairSign.as, (c) => c.confidence.sign({ idempotencyKey: randomUUID() })) };
    }),
  );
}
