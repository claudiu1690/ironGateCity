import type { GameContent } from '@irongate/content';
import { isDbUp } from '@irongate/db';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import type { FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import { fromNodeHeaders } from 'better-auth/node';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import pkg from '../package.json' with { type: 'json' };
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

export async function buildApp({ env, auth, content, now = Date.now }: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : { level: env.LOG_LEVEL },
    trustProxy: true,
    // tRPC batches put several procedure names in the path.
    routerOptions: { maxParamLength: 5_000 },
  });

  app.get('/healthz', async (_req, reply) => {
    const up = isDbUp();
    return reply.code(up ? 200 : 503).send({ ok: up, db: up ? 'up' : 'down', version: APP_VERSION });
  });

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
      const response = await auth.handler(
        new Request(url, { method: request.method, headers: fromNodeHeaders(request.headers), body }),
      );
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
