import type { GameContent } from '@irongate/content';
import { Character } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import type { Auth } from '../auth';
import { streetHooks } from '../services/streetHooks';
import {
  DevRefusal,
  HeldBody,
  RunInBody,
  StreetBody,
  decideNow,
  releaseNow,
  sendHeld,
  setStreet,
  zodLine,
} from './risk';

/**
 * Slice 5 (tech design §8.5): the e2e risk hooks `POST /api/test/street`, `/held` and `/run-in`.
 * Registered only inside the E2E_TEST_HOOKS guard in app.ts (memory mode), which also turns the
 * street hooks on; anywhere else these routes do not exist and `streetHooks.take` returns null.
 */
export function registerRiskHooks(
  app: FastifyInstance,
  deps: { auth: Auth; content: GameContent; now: () => number },
): void {
  const { auth, content, now } = deps;
  streetHooks.enabled = true;

  /** The body parsed, and the caller's character; a refusal otherwise. */
  async function prepare<S extends z.ZodType>(
    request: FastifyRequest,
    schema: S,
  ): Promise<{ body: z.output<S>; c: CharacterDoc }> {
    const parsed = schema.safeParse(request.body ?? {});
    if (!parsed.success) throw new DevRefusal(400, zodLine(parsed.error));
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) throw new DevRefusal(401, 'sign in first');
    const c = await Character.findOne({ userId: session.user.id }).lean<CharacterDoc>();
    if (!c) throw new DevRefusal(404, 'no character yet');
    return { body: parsed.data, c };
  }

  const handle =
    (fn: (request: FastifyRequest) => Promise<object>) =>
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        return { ok: true, ...(await fn(request)) };
      } catch (err) {
        if (err instanceof DevRefusal) return reply.code(err.statusCode).send({ error: err.message });
        throw err;
      }
    };

  // What the caller's next act (a mission or a tap on rival ground) uses; consumed once.
  app.post(
    '/api/test/street',
    handle(async (request) => {
      const { body, c } = await prepare(request, StreetBody);
      return { force: setStreet(content, c, body) };
    }),
  );

  // The cells or the infirmary of the city the character is in now, or the stay ends now.
  app.post(
    '/api/test/held',
    handle(async (request) => {
      const { body, c } = await prepare(request, HeldBody);
      const at = now();
      if ('send' in body) {
        await sendHeld(content, c, body.send, at);
        const after = await Character.findById(c._id, { held: 1 }).lean<CharacterDoc>();
        return {
          held: { kind: body.send, until: after?.held ? new Date(after.held.until).getTime() : null },
        };
      }
      await releaseNow(c, at);
      return { releasedAt: at };
    }),
  );

  // The pending run-in's decide time is now: the next read resolves it by luck.
  app.post(
    '/api/test/run-in',
    handle(async (request) => {
      const { c } = await prepare(request, RunInBody);
      const at = now();
      await decideNow(c, at);
      return { decideBy: at };
    }),
  );
}
