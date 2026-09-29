import type { GameContent } from '@irongate/content';
import { isDbUp } from '@irongate/db';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import type { FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import { fromNodeHeaders } from 'better-auth/node';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import pkg from '../package.json' with { type: 'json' };
import { CLIENT_IP_HEADER } from './auth';
import type { Auth } from './auth';
import type { Env } from './env';
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
    app.post('/api/test/clock', async (request, reply) => {
      const body = (request.body ?? {}) as { advanceMs?: unknown };
      const advanceMs = Number(body.advanceMs);
      // Forward only (QA n11): lazy time assumes the clock never runs back past a settled day.
      if (!Number.isFinite(advanceMs) || advanceMs < 0) {
        return reply.code(400).send({ error: 'advanceMs must be a number ≥ 0' });
      }
      clockOffsetMs += advanceMs;
      return { offsetMs: clockOffsetMs, now: now() };
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
