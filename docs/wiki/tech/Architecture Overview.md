---
type: tech
title: Architecture Overview
aliases: [Architecture, Tech Overview, Stack]
tags: [tech, hub]
status: built
slice: "0; grown every slice to 5 and the review rounds"
gdd: ["§13.1a"]
adrs: ["0001", "0002", "0003", "0004", "0005", "0008", "0017", "0030", "0072", "0087"]
updated: 2026-10-14
---

# Architecture Overview

## In one paragraph

Irongate City is one TypeScript monorepo (pnpm workspaces + Turborepo). A React 19 single-page
client talks to one Fastify server through tRPC. The server decides every outcome with the pure
maths in `packages/rules`, reads the game's fixed data from `packages/content`, and stores live state
in MongoDB through the Mongoose models in `packages/db`. A second process from the same code (the
worker) runs the few scheduled jobs with Agenda. The client only shows odds and renders the result
the server sends back. This page is the hub for every tech page.

## How it works

**The stack, as it is in the code today** (the plan's choices are in
`docs/IMPLEMENTATION_PLAN.md` §2):

| Layer | What the code uses | Where |
|---|---|---|
| Client | React 19, Vite 7, TanStack Router + Query, tRPC client, Tailwind v4 | `apps/client` |
| Shared UI | Design tokens, Radix Dialog, `react-zoom-pan-pinch`, fonts | `packages/ui` |
| API | Fastify 5 + tRPC 11, Zod inputs | `apps/server/src/app.ts`, `apps/server/src/trpc/` |
| Auth | Better Auth (email + password) with its MongoDB adapter | `apps/server/src/auth.ts` |
| Rules | Pure functions, no I/O, seeded RNG | `packages/rules/src` |
| Content | TypeScript data validated by Zod at start-up | `packages/content/src` |
| Database | MongoDB 7 replica set, Mongoose, transactions | `packages/db/src` |
| Jobs | Agenda 6 with its Mongo backend (no Redis) | `apps/server/src/worker.ts`, `apps/server/src/jobs/` |
| Errors | Sentry, only when a DSN is set | `apps/server/src/sentry.ts`, `apps/client/src/lib/sentry.ts` |

**Repo layout.**

```
apps/client      React game client (routes, features, components, lib)
apps/server      Fastify + tRPC API (src/index.ts) and the Agenda worker (src/worker.ts)
packages/rules   Pure game maths: checks, rewards, timers, calendar, counts, run-ins
packages/content Cities, places, actions, missions, Issues, papers, art catalogue (Zod-validated)
packages/db      Mongoose models, indexes, migrations 001–009 (010–013 planned for slices 6–9), seed, playtest reports
packages/ui      Tailwind tokens and shared components (HUD, ticket, stamp, result modal, maps)
scripts/art      The art pipeline (pnpm art:build, art:check, art:tiles)
```

Dependencies run one way: `rules` ← `content` ← `db` ← `server`; `client` and `ui` import `rules`
and `content` (and the server's router *type* only, for tRPC).

**One request, end to end** (a canvass tap):

```mermaid
sequenceDiagram
  participant C as Client (usePerformAction)
  participant T as tRPC action.perform
  participant S as actionService.performAction
  participant R as packages/rules
  participant M as MongoDB
  C->>T: actionId, locationId, times, idempotencyKey (one per tap)
  T->>S: session user, content, now
  S->>M: loadCharacter: settle city day + character day (lazy)
  S->>M: stored result for this key? (fast path)
  S->>M: transaction (snapshot read)
  S->>R: projectEnergy, readPlace modifiers, resolveTier1Action (seeded)
  S->>M: Character.findOneAndUpdate({_id, version, day.settled})
  S->>M: ledger, Issues, ActionLog { idempotencyKey, seed, result }
  S-->>C: ActionResult (rolls, chance, bonus tags, rewards, effects)
  C->>C: ResultModal renders it; computes nothing
```

1. The client makes one UUID per tap and sends it with the input
   ([[Atomic Actions and Idempotency]]).
2. The tRPC context carries the Better Auth user, the content and a clock `now()` that tests can move
   ([[Server and API]]).
3. The service first settles the days that are due: the city's world day, then the character's own
   day ([[Scheduled Jobs]], [[Lazy Timers]]).
4. Inside one MongoDB transaction it reads the character, projects the lazy timers, gathers the
   place's [[Modifiers]], and calls the pure resolver in [[Rules Package]] with a seed derived from
   the key by HMAC ([[adr/0087-roll-seeds-derived-from-the-request-key|ADR 0087]]), so a retried
   transaction draws the same rolls.
5. It writes the character with a version guard, then the side writes (opinion, ledger, Issues),
   then the `actionLogs` row that holds the full result.
6. The result is the whole breakdown the modal needs ([[GDD#13.1a The result modal|GDD §13.1a]]).
   A retry with the same key gets the stored copy.

## Key files

- `apps/server/src/index.ts` — the API process: env, Sentry, DB, Better Auth, the journey scheduler, Fastify.
- `apps/server/src/app.ts` — `buildApp()`: `/healthz`, the test hooks, the Better Auth bridge, the tRPC plugin.
- `apps/server/src/worker.ts` — the Agenda process (`city-day`, `journey-arrive`).
- `apps/server/src/trpc/router.ts` — `appRouter`, the list of routers.
- `apps/server/src/services/actionService.ts` — `performAction()`, the model for every keyed act.
- `packages/rules/src/index.ts`, `packages/content/src/load.ts`, `packages/db/src/indexes.ts`.
- `apps/client/src/router.tsx`, `apps/client/src/lib/trpc.ts`.

## Rules to follow

From `CLAUDE.md` and plan §2 "Architecture rules", all followed in the code today:

1. **Server-authoritative.** The client never decides a roll or a reward.
2. **Every game action is atomic and idempotent** — one transaction, one key, one version guard.
3. **Timers are lazy.** Only real events (the city's day, a journey's tidy arrival) are jobs.
4. **The rules package has no I/O.** No clock, no random, no database (checked: no `Date.now`,
   `Math.random` or `node:` import in `packages/rules/src`).
5. **The server returns the full breakdown.**
6. **Content is data.** A new place or mission is a content edit.
7. **Embed what's read together, reference what grows** ([[Database and Models]]).

## Decisions (ADRs)

- [[adr/0001-same-origin-api-via-proxy|ADR 0001]] — the browser only talks to its own origin; `/api` is proxied.
- [[adr/0002-atomic-idempotent-actions|ADR 0002]] — one transaction, one key, one version guard (amended 14 Oct 2026 by ADR 0087).
- [[adr/0087-roll-seeds-derived-from-the-request-key|ADR 0087]] — roll seeds derived from the request key by HMAC (per-process salt), and `assertKeyFree` checks the key inside every keyed transaction.
- [[adr/0003-city-documents-hold-state-not-content|ADR 0003]] — `cities` hold live state; places and actions stay in content.
- [[adr/0004-in-memory-replica-set-for-tests-and-dev|ADR 0004]] — an in-memory replica set for tests and Docker-free dev.
- [[adr/0005-lazy-per-character-city-day|ADR 0005]] and [[adr/0017-city-day-boundaries-lazy-first-job-primary|ADR 0017]] — the day, lazy per character and per city.
- [[adr/0030-modifier-sources-and-named-factors|ADR 0030]] — modifiers as named sources.
- [[adr/0072-production-topology-for-the-hosting-step|ADR 0072]] — the planned production setup (**proposed, not built**).

**Local until the end.** Nothing is hosted or deployed until the project's end (the user's rule;
the plan says so since 14 Oct 2026). The hosting step ([[adr/0072-production-topology-for-the-hosting-step|ADR 0072]]),
any deploy and the betas come after slice 9; `apps/client/vercel.json` keeps an `<api-host>`
placeholder until then. **Realtime** is refetch on focus (plus one refetch at dusk or dawn); Socket.IO
arrives with chat in slice 6 ([[adr/0038-chat-socketio-push-trpc-writes-change-streams|ADR 0038]], not
built); no Server-Sent Events. The plan's repo layout shows `scripts/art/`; art sources live outside
the repo ([[Art and Maps Pipeline]]).

## Related

[[Server and API]] · [[Game Client]] · [[Rules Package]] · [[Content Package]] ·
[[Database and Models]] · [[Scheduled Jobs]] · [[Atomic Actions and Idempotency]] · [[Lazy Timers]] ·
[[Modifiers]] · [[Art and Maps Pipeline]] · [[Checks and Testing]] · [[Dev Panel and Local Setup]] ·
[[Auth and Accounts]] · [[The Result Modal]] · [[Run a Slice]]
