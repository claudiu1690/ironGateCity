import type { GameContent } from '@irongate/content';
import { Character, Journey, isDbUp } from '@irongate/db';
import type { CharacterDoc } from '@irongate/db';
import { cycleOf, dayKey, dayStart, isMonday } from '@irongate/rules';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import type { FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import { fromNodeHeaders } from 'better-auth/node';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import pkg from '../package.json' with { type: 'json' };
import { CLIENT_IP_HEADER } from './auth';
import type { Auth } from './auth';
import { applyCharacterSeed } from './dev/characterSeed';
import { loadClockOffset, saveClockOffset } from './dev/clockStore';
import { setWeekIssues } from './dev/issues';
import { registerDevPanel } from './dev/panel';
import { CharacterRiskBody, zodLine } from './dev/risk';
import { registerRiskHooks } from './dev/riskRoutes';
import { registerTogetherHooks } from './dev/together';
import type { Env } from './env';
import { runCityDay } from './services/cityDay';
import { settleNationDay } from './services/nationDay';
import { registerNationHooks } from './dev/nation';
import { registerNationHooks2 } from './dev/nation2';
import { registerLifeHooks } from './dev/life';
import { dayHooks } from './services/dayService';
import { nightHooks } from './services/night';
import { patrolHooks } from './services/patrolHooks';
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
  // Tech design §7.8: a process-wide clock offset that only Playwright and the dev panel can move.
  // Review 6 leftovers: under the test hooks it is kept in the database (dev/clockStore.ts) and read
  // back here, so `pnpm dev:mem`'s reload on a saved file never puts the clock back.
  let clockOffsetMs = env.E2E_TEST_HOOKS ? await loadClockOffset() : 0;
  const now = () => baseNow() + clockOffsetMs;
  /** Forward only (QA n11), and kept. */
  const advanceClock = async (ms: number) => {
    if (!(ms >= 0)) throw new Error('the test clock only moves forward');
    clockOffsetMs += ms;
    await saveClockOffset(clockOffsetMs);
  };
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
    // Review 5 (ADR 0079): the night seam's test mode, when the run asks for one (Playwright: day).
    if (env.E2E_NIGHT) nightHooks.mode = env.E2E_NIGHT;
    // Review 5 (ADR 0081): the patrol's hooks (Playwright: never; dev:mem: auto).
    patrolHooks.enabled = true;
    // Review 6 leftovers: a character settled ahead of the test clock gets a clear dev error.
    dayHooks.devClock = true;
    if (env.E2E_PATROL) patrolHooks.base = env.E2E_PATROL;
    // Memory mode only (env.ts refuses E2E_TEST_HOOKS otherwise). The clock moves forward only
    // (QA n11): lazy time assumes it never runs back past a settled day.
    app.post('/api/test/clock', async (request, reply) => {
      const body = (request.body ?? {}) as {
        advanceMs?: unknown;
        advanceTo?: { cityId?: unknown; cycleDay?: unknown; hour?: unknown; weekday?: unknown };
      };
      if (body.advanceTo !== undefined && body.advanceTo.weekday !== undefined) {
        // Slice 4 (tech design §8.6): forward to the next Monday at hour:00 UTC (the Issues' week).
        const hour = body.advanceTo.hour === undefined ? 9 : Number(body.advanceTo.hour);
        if (body.advanceTo.weekday !== 'monday')
          return reply.code(400).send({ error: "weekday must be 'monday'" });
        if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
          return reply.code(400).send({ error: 'hour must be 0..23' });
        }
        const t0 = now();
        for (let d = dayKey(t0); ; d++) {
          const t = dayStart(d) + hour * 3_600_000;
          if (t > t0 && isMonday(d)) {
            await advanceClock(t - t0);
            break;
          }
        }
        return { offsetMs: clockOffsetMs, now: now() };
      }
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
            await advanceClock(t - t0);
            break;
          }
        }
        return { offsetMs: clockOffsetMs, now: now() };
      }
      const advanceMs = Number(body.advanceMs);
      if (!Number.isFinite(advanceMs) || advanceMs < 0) {
        return reply.code(400).send({ error: 'advanceMs must be a number ≥ 0' });
      }
      await advanceClock(advanceMs);
      return { offsetMs: clockOffsetMs, now: now() };
    });

    // What the worker's city-day job does, at the test clock (ADR 0017 §6).
    // Slice 7 (§8.6): it also runs the nation's day.
    app.post('/api/test/city-day', async () => {
      const r = await runCityDay(content, now());
      const n = await settleNationDay(content, now());
      return { ...r, nation: { settledDay: n.world.settledDay } };
    });

    // The session user's character: FXP (and the Rank it gives), home Local Standing, PC, Energy.
    app.post('/api/test/character', async (request, reply) => {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
      if (!session) return reply.code(401).send({ error: 'sign in first' });
      const body = (request.body ?? {}) as {
        fxp?: unknown;
        successes?: unknown;
        pc?: unknown;
        energy?: unknown;
        // Slice 4 (tech design §8.6).
        level?: unknown;
        xp?: unknown;
        iron?: unknown;
        cityId?: unknown;
        residence?: { cityId?: unknown; districtId?: unknown };
        irongateSuccesses?: unknown;
      };
      // Slice 5 (tech design §8.5): Heat, Health, the record's marks, AGI, STR, CHA's base, the Rank.
      // (Unknown keys, the slice 3–4 fields, are stripped from this parse and read below.)
      const risk = CharacterRiskBody.safeParse(body);
      if (!risk.success) return reply.code(400).send({ error: zodLine(risk.error) });
      const c = await Character.findOne({ userId: session.user.id }).lean<CharacterDoc>();
      if (!c) return reply.code(404).send({ error: 'no character yet' });
      const num = (v: unknown) => (v === undefined ? undefined : Number(v));
      const cityId = body.cityId === undefined ? undefined : String(body.cityId);
      if (cityId !== undefined && !content.city(cityId))
        return reply.code(400).send({ error: 'unknown cityId' });
      const residence =
        body.residence === undefined
          ? undefined
          : {
              cityId: String(body.residence.cityId),
              districtId: body.residence.districtId == null ? null : String(body.residence.districtId),
            };
      if (
        residence &&
        (!content.city(residence.cityId)?.council ||
          (residence.districtId !== null &&
            content.district(residence.districtId)?.city.id !== residence.cityId) ||
          (residence.districtId === null && content.isDistricted(residence.cityId)))
      ) {
        return reply.code(400).send({ error: 'unknown residence' });
      }
      const set = await applyCharacterSeed(
        c,
        {
          fxp: num(body.fxp),
          successes: num(body.successes),
          pc: num(body.pc),
          energy: num(body.energy),
          level: num(body.level),
          xp: num(body.xp),
          iron: num(body.iron),
          irongateSuccesses: num(body.irongateSuccesses),
          ...(cityId !== undefined ? { cityId } : {}),
          ...(residence ? { residence } : {}),
          ...risk.data,
        },
        now(),
      );
      return { ok: true, ...set };
    });

    // Slice 4 (tech design §8.6): the caller's open journey arrives now (nothing else changes; the
    // next request settles the arrival lazily).
    app.post('/api/test/journey', async (request, reply) => {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
      if (!session) return reply.code(401).send({ error: 'sign in first' });
      const body = (request.body ?? {}) as { arriveNow?: unknown };
      if (body.arriveNow !== true)
        return reply.code(400).send({ error: 'arriveNow: true is the only option' });
      const c = await Character.findOne({ userId: session.user.id }).lean<CharacterDoc>();
      if (!c?.journey || c.journey.status !== 'onTheWay')
        return reply.code(409).send({ error: 'not on a train' });
      const at = new Date(now());
      await Journey.updateOne({ _id: c.journey.id, status: 'onTheWay' }, { $set: { arrivesAt: at } });
      await Character.updateOne(
        { _id: c._id, 'journey.id': c.journey.id },
        { $set: { 'journey.arrivesAt': at } },
      );
      return { ok: true, arrivesAt: at.getTime() };
    });

    // Slice 4: this week's live Issues of a city (none clears them), for specs that pin numbers.
    app.post('/api/test/issues', async (request, reply) => {
      const body = (request.body ?? {}) as { cityId?: unknown; issueIds?: unknown };
      const cityId = String(body.cityId ?? '');
      const ids = Array.isArray(body.issueIds) ? body.issueIds.map(String) : [];
      if (!content.city(cityId)?.council) return reply.code(400).send({ error: 'a council cityId' });
      try {
        return await setWeekIssues(content, cityId, ids, now());
      } catch (err) {
        return reply.code(400).send({ error: (err as Error).message });
      }
    });

    // Slice 5 (tech design §8.5): the street, held and run-in hooks; turns the street hooks on.
    registerRiskHooks(app, { auth, content, now });
    // Slice 6 (tech design §8.6): test members, events, chat and presence.
    registerTogetherHooks(app, { auth, content, now });

    // Slice 7 (tech design §8.6): the term, the republic and the offices.
    registerNationHooks(app, { auth, content, clock: { now, advance: advanceClock } });
    // Slice 7 lane 2 (§8.6): Parliament, the ballots above the council and the petitions.
    registerNationHooks2(app, { auth, content, now });
    // Slice 8 phase B, lane 2 (tech design §8.6): the Dossier, the flat and Legacy.
    registerLifeHooks(app, { auth, content, now });

    // The dev time-skip panel (README "Reviewing with the dev panel"): same guard, same clock.
    registerDevPanel(app, {
      auth,
      content,
      clock: {
        now,
        offsetMs: () => clockOffsetMs,
        advance: advanceClock,
      },
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
