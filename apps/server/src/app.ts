import type { GameContent } from '@irongate/content';
import { Character, isDbUp } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { cycleOf, dayKey, dayStart, rankForFxp } from '@irongate/rules';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import type { FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import { fromNodeHeaders } from 'better-auth/node';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import pkg from '../package.json' with { type: 'json' };
import { CLIENT_IP_HEADER } from './auth';
import type { Auth } from './auth';
import type { Env } from './env';
import { runCityDay } from './services/cityDay';
import { captureException } from './sentry';
import type { Context } from './trpc/context';
import { appRouter } from './trpc/router';
import type { AppRouter } from './trpc/router';

export const APP_VERSION = process.env.APP_VERSION ?? pkg.version;

export interface AppDeps {
  env: Env;
  auth: Auth;
  content: GameContent;
  now?: () => number;
}

/**
 * Fastify 5 treats a bare hop count as "trust nothing" because it cannot check the first peer. A
 * count is still what the default Vercel → edge topology needs until the edge's addresses are
 * known, so it becomes an explicit per-hop function here (the risk is documented at TRUST_PROXY).
 */
function trustProxyOption(tp: Env['TRUST_PROXY']): string[] | ((addr: string, hop: number) => boolean) {
  return typeof tp === 'number' ? (_addr, hop) => hop < tp : tp;
}

export async function buildApp({
  env,
  auth,
  content,
  now: baseNow = Date.now,
}: AppDeps): Promise<FastifyInstance> {
  // Tech design §7.8: a process-wide clock offset that only Playwright can move.
  let clockOffsetMs = 0;
  const now = () => baseNow() + clockOffsetMs;
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: env.LOG_LEVEL },
    // QA m7: trust only the proxy hops of the deployment (env.ts TRUST_PROXY), so request.ip is
    // the player's address and cannot be chosen with a forged X-Forwarded-For.
    trustProxy: trustProxyOption(env.TRUST_PROXY),
    // tRPC batches put several procedure names in the path.
    routerOptions: { maxParamLength: 5_000 },
  });

  app.get('/healthz', async (_req, reply) => {
    const up = isDbUp();
    return reply.code(up ? 200 : 503).send({ ok: up, db: up ? 'up' : 'down', version: APP_VERSION });
  });

  if (env.E2E_TEST_HOOKS) {
    // Memory mode only (env.ts refuses E2E_TEST_HOOKS otherwise). The clock moves forward only
    // (QA n11): lazy time assumes it never runs back past a settled day.
    app.post('/api/test/clock', async (request, reply) => {
      const body = (request.body ?? {}) as {
        advanceMs?: unknown;
        advanceTo?: { cityId?: unknown; cycleDay?: unknown; hour?: unknown };
      };
      if (body.advanceTo !== undefined) {
        // Slice 3 (tech design §8.6): to the next hour:00 UTC on a day with that cycle day.
        const offset = content.city(String(body.advanceTo.cityId))?.council?.offset;
        const cycleDay = Number(body.advanceTo.cycleDay);
        const hour = body.advanceTo.hour === undefined ? 9 : Number(body.advanceTo.hour);
        if (offset === undefined || !Number.isInteger(cycleDay) || cycleDay < 0 || cycleDay > 4) {
          return reply.code(400).send({ error: 'advanceTo needs a council cityId and a cycleDay 0..4' });
        }
        if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
          return reply.code(400).send({ error: 'hour must be 0..23' });
        }
        const t0 = now();
        for (let d = dayKey(t0); ; d++) {
          const t = dayStart(d) + hour * 3_600_000;
          if (t > t0 && cycleOf(d, offset).cycleDay === cycleDay) {
            clockOffsetMs += t - t0;
            break;
          }
        }
        return { offsetMs: clockOffsetMs, now: now() };
      }
      const advanceMs = Number(body.advanceMs);
      if (!Number.isFinite(advanceMs) || advanceMs < 0) {
        return reply.code(400).send({ error: 'advanceMs must be a number ≥ 0' });
      }
      clockOffsetMs += advanceMs;
      return { offsetMs: clockOffsetMs, now: now() };
    });

    // What the worker's city-day job does, at the test clock (ADR 0017 §6).
    app.post('/api/test/city-day', async () => runCityDay(content, now()));

    // The session user's character: FXP (and the Rank it gives), home Local Standing, PC.
    app.post('/api/test/character', async (request, reply) => {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
      if (!session) return reply.code(401).send({ error: 'sign in first' });
      const body = (request.body ?? {}) as {
        fxp?: unknown;
        successes?: unknown;
        pc?: unknown;
        energy?: unknown;
      };
      const c = await Character.findOne({ userId: session.user.id }).lean<CharacterDoc>();
      if (!c) return reply.code(404).send({ error: 'no character yet' });
      const set: Record<string, unknown> = {};
      if (body.fxp !== undefined) {
        const fxp = Number(body.fxp);
        set.fxp = fxp;
        set.rank = Math.max(c.rank, rankForFxp(fxp));
      }
      if (body.successes !== undefined) {
        set.localStanding = [
          ...c.localStanding.filter((x) => x.cityId !== c.homeCityId),
          { cityId: c.homeCityId, successes: Number(body.successes) },
        ];
      }
      if (body.pc !== undefined) set.pc = Number(body.pc);
      // A full bar for a long run of taps (the e2e council cycle does a day's orders).
      if (body.energy !== undefined) {
        set['energy.value'] = Number(body.energy);
        set['energy.updatedAt'] = new Date(now());
      }
      await Character.updateOne({ _id: c._id }, { $set: set, $inc: { version: 1 } });
      return { ok: true, ...set };
    });
  }

  // Better Auth: bridge Fastify's request to a web Request and back (Better Auth's Fastify guide).
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(request, reply) {
      const url = new URL(request.url, env.PUBLIC_ORIGIN);
      const body =
        request.method === 'GET' || request.body === undefined
          ? undefined
          : typeof request.body === 'string'
            ? request.body
            : JSON.stringify(request.body);
      // Better Auth rate-limits by client IP. Hand it the address Fastify resolved with
      // trustProxy, in a header of our own that a client-sent copy cannot override (QA m7).
      const headers = fromNodeHeaders(request.headers);
      headers.set(CLIENT_IP_HEADER, request.ip);
      const response = await auth.handler(new Request(url, { method: request.method, headers, body }));
      reply.status(response.status);
      response.headers.forEach((value, key) => {
        if (key !== 'set-cookie') reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) reply.header('set-cookie', cookies);
      return reply.send(response.body ? await response.text() : null);
    },
  });

  await app.register(fastifyTRPCPlugin, {
    prefix: '/api/trpc',
    trpcOptions: {
      router: appRouter,
      async createContext({ req }): Promise<Context> {
        const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
        return {
          user: session ? { id: session.user.id, name: session.user.name } : null,
          content,
          now,
        };
      },
      onError({ error, path }) {
        if (error.code === 'INTERNAL_SERVER_ERROR') {
          app.log.error({ err: error, path }, 'tRPC internal error');
          captureException(error, { path });
        }
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  });

  return app;
}
