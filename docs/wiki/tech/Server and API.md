---
type: tech
title: Server and API
aliases: [Server, API, tRPC, apps/server]
tags: [tech, server]
status: built
slice: "0; a router or more per slice to 5, review 5, voting rework"
gdd: []
adrs: ["0001", "0002", "0008", "0017", "0018", "0025", "0087"]
updated: 2026-10-14
---

# Server and API

## In one paragraph

`apps/server` is one Node codebase with two entry points. `src/index.ts` is the **API**: a Fastify 5
server with Better Auth at `/api/auth/*` and tRPC at `/api/trpc`. `src/worker.ts` is the **worker**
that runs the Agenda jobs ([[Scheduled Jobs]]). Routers are thin: they check the input with Zod and
call a service. Services hold the game flow: they settle the day, open a transaction, call the pure
[[Rules Package]] and write MongoDB. Every refusal is a typed `GameError` the client can switch on.

## How it works

**Start-up** (`src/index.ts`): `loadDotEnv()` → `loadEnv()` (Zod, fails fast) → `initSentry()` →
`getContent()` → `startDb()` (connect, `ensureIndexes()` with migrations, seed outside production) →
`createAuth()` → a non-processing Agenda client for the journey job → `buildApp()` → `listen()`.
SIGINT/SIGTERM close the app, the DB and flush Sentry.

**`buildApp()`** (`src/app.ts`):
- `GET /healthz` — `{ ok, db, version }`, 503 when the DB is down.
- The test hooks under `/api/test/*`, only when `E2E_TEST_HOOKS=1` ([[Dev Panel and Local Setup]]).
- `/api/auth/*` — bridges Fastify's request to a web `Request` for Better Auth, and passes the
  resolved client IP in its own header ([[Auth and Accounts]]).
- `/api/trpc` — `fastifyTRPCPlugin` with `appRouter`. `createContext` reads the session and gives
  `{ user, content, now }`. Internal errors are logged and sent to Sentry.

**tRPC setup** (`src/trpc/trpc.ts`): `publicProcedure` and `protectedProcedure` (UNAUTHORIZED
without a session). The `errorFormatter` copies a `GameError` into `error.data.game`, e.g.
`{ reason: 'NOT_ENOUGH_ENERGY', energy, cost, nextTickAt }`.

**`gameError.ts`**: `class GameError(reason, data, code)` with `toData()` and `toTRPC()`; the helper
`gameError(code, reason, data)` returns a `TRPCError`. Thrown inside a transaction it aborts it; the
keyed-action helpers turn it into a TRPC error ([[Atomic Actions and Idempotency]]). The reasons
are a closed union `GameErrorReason` in `packages/rules/src/types.ts`.

**`env.ts`**: one Zod schema. Variables (names only): `NODE_ENV`, `PORT` (3001), `HOST`
(127.0.0.1 by default), `DB_MODE` (`uri` | `memory`), `MONGODB_URI`, `BETTER_AUTH_SECRET` (≥ 32
chars), `PUBLIC_ORIGIN`, `TRUST_PROXY` (hop count or CIDR list; `true` refused), `SENTRY_DSN`,
`LOG_LEVEL`, `E2E_TEST_HOOKS`, `E2E_NIGHT`, `E2E_PATROL`. Test hooks are refused unless
`DB_MODE=memory`; in memory mode `isLoopbackUri()` refuses any URI that could leave the machine.

**`sentry.ts`**: `initSentry`, `captureException`, `flushSentry` — no-ops without `SENTRY_DSN`.

### Routers → services

| Router (`src/trpc/routers/`) | Procedures | Main services | What it does |
|---|---|---|---|
| `health` | `ping` | — | Public liveness through tRPC |
| `arrival` | `faces`, `get`, `start`, `answer`, `join` | `arrivalService` | The face and the three-beat opening; `join` creates the character ([[Coming Home]]) |
| `character` | `me`, `setAvatar`, `placeStatPoint`, `treat`, `seeOrdersNote` | `meView`, `avatarService`, `statService`, `treatmentService`, `ordersService` | The character view with timers projected; stat points; *Get patched up* |
| `city` | `get` | `cityService.getCityView`, `dayService.loadCharacter`, `patrol.ensurePatrol` | The city map view; the only read that may roll the night patrol |
| `action` | `perform` | `actionService.performAction`, `actionResult` | A tier-1 action or training, ×1 or ×3 ([[Street Actions]]) |
| `job` | `take` | `jobService` | Take or switch a job ([[Jobs]]) |
| `paper` | `today`, `markRead` | `paperService`, `edition`, `localEdition`, `capitalPaper` | [[The Morning Paper]] |
| `ambition` | `get`, `choose`, `attempt` | `ambitionService` | Ambition chapters ([[Ambitions]]) |
| `council` | `election`, `ballot`, `count`, `capitalCount`, `hall`, `whatNowSeen`, `declare`, `endorse`, `vote`, `setRule` | `councilService`, `politicsService`, `ruleBallot`, `townHallService` | Councils and the rule vote ([[City Council and the Rule Vote]]) |
| `travel` | `nation`, `board`, `journey`, `choose`, `close` | `travelService`, `journeyArrival` | Trains and journey cards ([[Travel and Journeys]]) |
| `residence` | `register`, `room` | `residenceService` | Moving residence, a room ([[Residence]]) |
| `mission` | `start` | `missionService`, `missionCtx`, `missionResult` | Tier-2 missions ([[Missions]]) |
| `encounter` | `current`, `choose`, `close` | `streetService` | The run-in's one choice ([[Run-ins and Combat]]) |
| `held` | `get`, `inCells`, `act`, `bail`, `walkOut`, `discharge`, `close` | `heldService` | Cells and infirmary ([[Jail and the Cells]], [[Hospital and Treatment]]) |
| `record` | `strike` | `heldService.strikeMark` | Strike a mark off ([[Heat and Record]]) |
| `patrol` | `answer` | `patrol` | Answer the night patrol card ([[Night and Patrols]]) |

**Shared services** used by many routers: `dayService` (`loadCharacter`, `ensureSettled`,
`computeSettlement` — the character's day), `cityDay` / `capitalDay` / `issuesDay` / `cityDayCore`
(the world's day), `keyedAction`, `requestKey`, `keyGuard`, `txn` (atomic writes), `modifiers`,
`place` (`readPlace`, `moveOpinion`, `placeWrites`), `ledger`, `risk`, `night` (`nightAt`),
`views` (view builders), `residence`, `story`, `art` (`pickArt`), `votingConversion`.

**Request pattern.** No input names the caller's character: the session decides
(e.g. `council` router comment). Read procedures call `loadCharacter()` first, which settles the
city day and the character day, a due journey arrival and a due release.

## Key files

- `apps/server/src/index.ts`, `src/app.ts`, `src/db.ts` (`startDb`), `src/env.ts`, `src/gameError.ts`, `src/sentry.ts`
- `apps/server/src/trpc/trpc.ts`, `context.ts`, `router.ts`, `routers/*.ts`
- `apps/server/src/services/*.ts` (about 60 files; the largest are `politicsService`, `travelService`, `cityService`, `views`)
- `apps/server/Dockerfile`, `railway.toml`, `tsup.config.ts` — one image, `dist/index.js` and `dist/worker.js`

## Rules to follow

- Routers stay thin; game flow lives in a service; maths lives in `packages/rules`.
- Every mutation that changes game state takes `idempotencyKey: z.uuid()` and runs through
  `runKeyedAction` or `withRequestKey` ([[Atomic Actions and Idempotency]]).
- Use `ctx.now()`, never `Date.now()`, so tests and the dev clock can move time.
- Refuse with `gameError(code, reason, data)`; add new reasons to `GameErrorReason`.

## Decisions (ADRs)

- [[adr/0001-same-origin-api-via-proxy|ADR 0001]] — same-origin `/api` through a proxy (Vite in dev, a Vercel rewrite planned in production). [[adr/0072-production-topology-for-the-hosting-step|ADR 0072]] (proposed) would replace the production proxy with same-site subdomains.
- [[adr/0002-atomic-idempotent-actions|ADR 0002]], [[adr/0008-idempotency-for-non-action-mutations|ADR 0008]], [[adr/0018-political-acts-set-once-with-request-keys|ADR 0018]] — keyed writes. ADR 0018 was amended 14 Oct 2026 to the request kinds the code has (`council.declare`, `.endorse`, `.vote`, `.setRule`).
- [[adr/0087-roll-seeds-derived-from-the-request-key|ADR 0087]] — `keySeed` and `assertKeyFree` in `apps/server/src/services/keyGuard.ts`, used by `runKeyedAction` and `withRequestKey` ([[Atomic Actions and Idempotency]]).
- [[adr/0017-city-day-boundaries-lazy-first-job-primary|ADR 0017]], [[adr/0025-journeys-lazy-arrival-and-a-tidy-job|ADR 0025]] — the worker's jobs.
- [[adr/0069-request-guards-in-process-rate-limits-and-maintenance|ADR 0069]] — rate limits and a maintenance flag: **proposed for slice 9, not built**. Today only Better Auth limits sign-in and sign-up.

## Related

[[Architecture Overview]] · [[Atomic Actions and Idempotency]] · [[Scheduled Jobs]] ·
[[Auth and Accounts]] · [[Database and Models]] · [[Dev Panel and Local Setup]] · [[Game Client]]
