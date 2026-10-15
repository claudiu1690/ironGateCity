---
type: tech
title: Dev Panel and Local Setup
aliases: [Local Setup, Dev Panel, Test Hooks, dev:mem, Running Locally]
tags: [tech, dev, runbook-ish]
status: built
slice: "0 (local DB); 3 (dev panel); a button set per slice to 5, review 5, voting rework"
gdd: []
adrs: ["0001", "0004", "0072"]
updated: 2026-10-15
---

# Dev Panel and Local Setup

## In one paragraph

The game runs **only on the developer's machine** for now: the user decided on 2 Oct 2026 to work
and playtest locally until the end of the project, and to set up hosting last. The quickest way to
play is `pnpm dev:mem`: an in-memory MongoDB replica set, the API, the worker and the client, with no
Docker and no `.env`. In that mode the server turns on **test hooks**, and the client shows a small
**Dev** button: a panel that moves a shared test clock and lifts the player, so a five-day council
cycle or a night on rival ground can be reviewed in minutes.

## How it works

**Prerequisites**: Node 22.12 (`.node-version`), pnpm 10.34 (`corepack enable`), `pnpm install`.
Git needs `git config --global --add safe.directory E:/Projects/ironGateCity` once (the folder has
another Windows owner).

**Option A — in memory (normal)**: `pnpm dev:mem` runs three processes with `concurrently`:
- `pnpm db:mem` — `packages/db/scripts/memMongo.ts`: a replica set `rs0` on `127.0.0.1:27018`
  (`MEM_MONGO_PORT`); data is lost when it stops.
- `dev:mem:apps` — API on <http://localhost:3001> and client on <http://localhost:5173>, with
  `DB_MODE=memory`, `E2E_TEST_HOOKS=1` and a dev-only auth secret set inline in the script.
- `dev:mem:worker` — the Agenda worker ([[Scheduled Jobs]]).

**Option B — Docker**: `pnpm db:up` (`docker-compose.yml`: `mongo:7` started with `--replSet rs0`
on port 27017; a health check runs `rs.initiate` with host `127.0.0.1:27017` so Windows can reach
the primary) → `pnpm seed` once → `pnpm dev` (API + client) → `pnpm dev:worker` beside it →
`pnpm db:down`. Needs an `apps/server/.env`.

**Env files** (names only, never values):
- `apps/server/.env.example`: `NODE_ENV`, `PORT`, `HOST`, `DB_MODE`, `MONGODB_URI`,
  `BETTER_AUTH_SECRET`, `PUBLIC_ORIGIN`, `TRUST_PROXY` (commented), `SENTRY_DSN`, `LOG_LEVEL`,
  `APP_VERSION` (commented). Loaded by `loadDotEnv()` only if `.env` exists.
- `apps/client/.env.example`: `VITE_API_BASE`, `VITE_SENTRY_DSN` (also read: `VITE_TILES_ORIGIN`).
- Art scripts: `IRONGATE_ART_SRC`. Dev proxy: `API_PROXY_TARGET`.
- `.env`, `.env.local` are git-ignored.

**Safety guards** (`apps/server/src/env.ts`): test hooks are refused unless `DB_MODE=memory`; in
memory mode `MONGODB_URI` is used only if `isLoopbackUri()` passes (127.0.0.1/localhost and only
harmless options; `proxyHost` and the like are refused), else an in-process replica set starts. So a
server with test hooks can never reach a real database. `HOST` defaults to loopback, so the dev
server is not on the LAN.

**Test hooks** (`apps/server/src/app.ts`, `src/dev/riskRoutes.ts`, only with `E2E_TEST_HOOKS`):
`POST /api/test/clock` (forward only: `advanceMs`, to a council cycle day, to next Monday),
`/city-day` (what the worker's job does), `/character` (FXP, Standing, PC, Energy, Level, Iron, city,
residence, Heat, Health, marks, stats, Rank), `/journey` (arrive now), `/issues`, `/street` (force the
next run-in and rolls), `/held`, `/run-in`, `/night` (`clock`/`day`/`night`), `/patrol`, `/unrest`,
`/rule-votes`, `/seat`. Playwright and the dev panel use the same functions.

**The dev panel** (client `apps/client/src/features/dev/DevPanel.tsx` + `devApi.ts`; server
`apps/server/src/dev/panel.ts`): `GET /api/test/dev/status` and `POST /api/test/dev/:action`. The
status is a 404 on any server without hooks, and then the button is hidden. Actions include: +1 hour,
next day, skip to next phase, to dusk, boost me (Rank 3, standing, PC, full bar), refill Energy,
arrive now, next Monday, Level 10, Level 6, Rank 3, take me to Irongate / a rival town, live in a
district, Heat / Health / record presets, next run-in and caught, cells / infirmary now, release,
decide now, lift the bar, patrol next/never/auto, push a town into Unrest, seat me, three votes for
card 2. Each prints one line and refreshes the HUD, paper and map. The clock is **shared** by
everyone on the local server and only moves forward. **It survives an API restart** (review 6
leftovers): the offset is kept in the database (`dev_meta`, `_id: 'clock'`, written with `$max`) and
read back at start-up, so `dev:mem`'s reload on a saved file never puts the clock back. Stopping the
whole `pnpm dev:mem` (its database too) resets it; every Playwright run starts a fresh database, so
nothing carries between runs. If a character is ever settled on a later day than the clock, an act
gets a clear dev error (`CLOCK_BEHIND`, with the day to skip to) instead of looping to 409
`ACTION_CONFLICT`; reads carry on with the character as stored.

Server dev files (`apps/server/src/dev/`):

| File | Does |
|---|---|
| `clock.ts` | Pure maths for where the clock should move (a minute past a boundary) |
| `clockStore.ts` | The clock offset kept in `dev_meta` and loaded at start-up (review 6 leftovers) |
| `panel.ts` | The panel's routes, status and actions |
| `characterSeed.ts` | `applyCharacterSeed`, the `/api/test/character` write |
| `risk.ts`, `riskRoutes.ts` | Heat, Health, marks, cells, run-ins, night and patrol hooks |
| `unrest.ts` | Push a rival home city into Unrest as the caller |
| `voting.ts` | Synthetic rule votes and a seat |
| `issues.ts` | Set a city's live Issues for the week |
| `types.ts` | Wire types the client imports (`@irongate/server/dev`) |

None of these hold a game rule: they stand in for time passing or other players, and the next read
does the rest.

**Operator scripts** against any `MONGODB_URI`: `pnpm admin:boost --email … [--dry-run]`,
`pnpm report:playtest [--json]` (run within a week of a playtest: request logs expire).

**Dev-only client route**: `/dev/maps`, the map viewer.

### Hosting (deferred)

`apps/server/Dockerfile` (one image, `dist/index.js` and `dist/worker.js`), `apps/server/railway.toml`
and `apps/client/vercel.json` exist from slice 0 but nothing is deployed. The planned production
setup is [[adr/0072-production-topology-for-the-hosting-step|ADR 0072]] (**proposed, not built**):
same-site subdomains instead of ADR 0001's Vercel proxy, a direct WebSocket for chat, the worker as
a second process, tiles on R2, mail over HTTP — with that direct mode built and tested locally first.

## Key files

- `package.json` (root scripts), `docker-compose.yml`, `apps/server/.env.example`, `apps/client/.env.example`
- `apps/server/src/env.ts`, `src/db.ts` (`startDb`), `src/app.ts` (hooks), `src/dev/*`
- `apps/client/src/features/dev/DevPanel.tsx`, `devApi.ts`, `MapViewer.tsx`
- Slice 7: `apps/server/src/dev/nation.ts` (`/api/test/term`, `/nation`, `/office`), `nation2.ts` (lane 2: `/parliament`, `/ballots`, `/petition`), `nationPanel.ts` (the panel's *The nation* block: term day, Make me Governor / Chair / deputy / President, the ladder, the secretary's bill, test deputies and their votes, *My party leads by ten*; the status's term, republic, government, laws, bills, Chair and offices)
- `packages/db/scripts/memMongo.ts`, `README.md` ("Reviewing with the dev panel" and walk-throughs)

## Rules to follow

- Never propose deploys or hosting accounts as next steps until the project wraps up.
- Never put a game rule in a dev hook; hooks only move time or stand in for players.
- Test hooks stay impossible outside memory mode.
- Never print or commit secret values; `.env.example` lists names only.

## Decisions (ADRs)

- [[adr/0001-same-origin-api-via-proxy|ADR 0001]] — the dev proxy mirrors the planned production rewrite.
- [[adr/0004-in-memory-replica-set-for-tests-and-dev|ADR 0004]] — in-memory replica set as the Docker-free fallback.
- [[adr/0072-production-topology-for-the-hosting-step|ADR 0072]] — the hosting step (proposed).

## Related

[[Checks and Testing]] · [[Scheduled Jobs]] · [[Server and API]] · [[Database and Models]] ·
[[Run a Slice]] · [[Run a Design Review Round]]
