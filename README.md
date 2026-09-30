# Irongate City

A political browser RPG set in a fictional 1946 Central European republic. The v3.0 code that used to live here has been archived (see git history); the game is being rebuilt from scratch in vertical slices. Start with [`CLAUDE.md`](CLAUDE.md) for the project rules and team, [`docs/GDD.md`](docs/GDD.md) for the game design, and [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the stack and the slice plan. The current slice's technical design is [`docs/tech/slice-2.md`](docs/tech/slice-2.md) (slice 2, "Arrival"); the earlier ones are [`docs/tech/slice-1.md`](docs/tech/slice-1.md) and [`docs/tech/slice-0.md`](docs/tech/slice-0.md).

## Development

### Prerequisites

- **Node 22.12** (see `.node-version`) and **pnpm 10.34** (`corepack enable` picks it up from `package.json`).
- **Docker Desktop**, only for the persistent local database. Everything else, tests and e2e included, runs without it.
- The first test run downloads a `mongod` binary for `mongodb-memory-server` (about 100 MB on Linux, 600 MB on Windows) to `node_modules/.cache/mongodb-memory-server`, or to `MONGOMS_DOWNLOAD_DIR` if set.

```sh
pnpm install
```

### Run the game

Two ways, depending on whether Docker is running.

**Without Docker (in-memory database, data lost on exit):**

```sh
pnpm dev:mem
```

This starts an in-memory MongoDB replica set on `127.0.0.1:27018` (`pnpm db:mem`), the API on <http://localhost:3001>, the client on <http://localhost:5173> and the worker (the Agenda `city-day` job, below). No `.env` is needed. The API runs in memory mode against that replica set, so the test hooks (below) are on for hand-testing. Open the client and sign up with a face: the origin story (six of the father's questions, each saved as it is tapped, so a reload resumes it) and the street, where you pick a party. The next screen is your home city's welcome edition (_The Coalport Clarion_, _The Duskwall Sentinel_ or _The Ashford Gazette_); **To the city** opens the map with the first pin's sheet open. The Letters row in the paper opens Ambition chapter 1.

**With Docker (persistent database):**

```sh
cp apps/server/.env.example apps/server/.env   # once; defaults point at the Docker database
pnpm db:up                                     # mongo:7 single-node replica set on 27017
pnpm seed                                      # once: collections, indexes, city state (idempotent)
pnpm dev                                       # API :3001 + client :5173
pnpm db:down                                   # when you're done
```

The client proxies `/api` to the API, so the browser only ever talks to its own origin (ADR 0001). Check the API with <http://localhost:3001/healthz>.

**The worker (slice 3).** `apps/server/src/worker.ts` runs the Agenda job `city-day` at 00:01 UTC and once at start: for each home city it counts the election, seats the council, closes nominations, divides the council on its ordinance and applies the morale drift (ADR 0017). `pnpm dev:mem` starts it; with Docker, run `pnpm dev:worker` beside `pnpm dev`; in production it is `node dist/worker.js`, a second process from the same image. The game stays correct without it: every request settles its home city's day first (the lazy path), so a quiet city is simply counted when someone next visits.

### Checks

| Command          | What it runs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`      | ESLint (typescript-eslint) in every package                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm typecheck` | `tsc --noEmit` in every package                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm test`      | Vitest: rules (with coverage), content, db, server and ui. The db and server suites start their own in-memory replica set; no Docker needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm e2e`       | Playwright: builds the server, runs it with `DB_MODE=memory` and the test hooks behind `vite preview`, and plays on a phone viewport: sign up with a face → the arrival → the welcome edition → map → ×1 and ×3 → result modal; take a job → shift → next day's paper; Ambition chapter 1; and, last, in its own project (it moves the shared clock a cycle), the council cycle: declare → the branch's endorsement → the ballot → the count → the ELECTED front page → an ordinance → the ordinance in play. The arrival also runs on a 360 × 640 phone and a 1440 × 900 desktop, and checks the first session's art stays under 1 MB. First time: `pnpm --filter @irongate/client exec playwright install chromium` |
| `pnpm build`     | Client bundle (`apps/client/dist`) and server bundle (`apps/server/dist/index.js`, `dist/worker.js`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pnpm format`    | Prettier                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Everything at once, as CI does: `pnpm art:check && pnpm turbo lint typecheck test build && pnpm e2e`.

### Art (ADR 0007, ADR 0015)

The web art in `apps/client/public/art` is generated and committed; the print-sized sources are not.

| Command          | What it does                                                                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm art:build` | Reads the catalogue (`packages/content/src/data/art.ts`) and the sources from `IRONGATE_ART_SRC` (default `E:/Projects/ironGateCity Docs/art-direction`), writes AVIF and WebP at the catalogue widths, skips unchanged files (`.build.json`) and enforces the per-file budgets |
| `pnpm art:check` | Checks every catalogue file exists and is within budget, every SVG is safe (no script, event handler, foreignObject or external reference) and the whole set is at most 12 MB, without the sources (CI runs it)                                                                 |

Kinds: `map`, `scene`, `portrait`, `avatar`, `item` (AVIF and WebP at the catalogue widths) and `vector` (the faction crests, copied as `/art/<id>.svg`). A changed image gets a new id (`map.coalport.day.v2`): `/art/*` is served with a one-year immutable cache.

### Test hooks and the playtest report

- `E2E_TEST_HOOKS=1` (only with `DB_MODE=memory`; the server refuses to start otherwise) adds `POST /api/test/clock { advanceMs }` or `{ advanceTo: { cityId, cycleDay, hour? } }` (forward only, to the next `hour`:00 UTC, default 9, on a day with that council cycle day), `POST /api/test/city-day` (what the worker's job does, at the test clock) and `POST /api/test/character { fxp?, successes?, pc?, energy? }` (the signed-in player's character). Playwright and `pnpm dev:mem` turn them on. In memory mode `MONGODB_URI` is used only when it points at 127.0.0.1 or localhost (the `pnpm db:mem` replica set); anything else is ignored and an in-process replica set starts.
- `pnpm admin:boost --email <address> [--email <address> …] [--dry-run]` (slice-3 playtest, an operator script against `MONGODB_URI`, never an API route) lifts the chosen testers' characters to Rank 3 (2,000 Faction XP), Known in their home city (30 Successes) and the 10 PC deposit, so they can stand in the next nominations window. It never lowers anything, prints what it changed, is safe to run twice, and marks each boosted character `playtest.boosted` with the time and the values before. Against `pnpm dev:mem`: `MONGODB_URI="mongodb://127.0.0.1:27018/irongate?directConnection=true" pnpm admin:boost --email you@example.test`.
- `pnpm report:playtest` prints the slice-1 playtest numbers (sessions, returns within 2–4 h, ×3 share, paper read rate, orders, shifts, levels, contended transactions) the slice-2 arrival funnel (sign-up → face → answers → joined → first action → welcome orders → job → chapter 1, with median and p75 times, overall and per faction) and the slice-3 elections section (per election and council term, the first vote, the first seat with boosted and natural testers apart, next-day returns, morale, contention around midnight) from `MONGODB_URI`, read-only. `--json` for raw output. Against `pnpm dev:mem`: `MONGODB_URI="mongodb://127.0.0.1:27018/irongate?directConnection=true" pnpm report:playtest`.

### Repository layout

```
apps/client      React 19 + Vite SPA (TanStack Router and Query, tRPC client, Better Auth client, Tailwind v4)
apps/server      Fastify + tRPC + Better Auth (src/index.ts) and the Agenda worker (src/worker.ts)
packages/rules   Pure game maths: RNG, checks, lazy Energy/Rested, rewards, levels, Standing, orders, jobs, the City Day, the paper. No I/O
scripts/art      The web art pipeline (sharp)
packages/content Factions, cities, locations, actions, jobs, Party orders, headlines, the art catalogue and UI copy as Zod-validated data
packages/db      Mongoose connection, models, indexes, seed, in-memory replica-set helper
packages/ui      Design tokens, fonts and shared components (HUD, ticket, stamp, result modal)
```

Workspace packages are consumed as TypeScript source; Vite, `tsx` and `tsup` compile them.

### Environment

Server variables are validated at start-up (`apps/server/src/env.ts`) and documented in [`apps/server/.env.example`](apps/server/.env.example); client variables are in [`apps/client/.env.example`](apps/client/.env.example).

### Deployment (not provisioned yet)

- **Client → Vercel:** project root `apps/client`; `apps/client/vercel.json` holds the build and the `/api` rewrite. Replace `<api-host>` with the API's host once it exists.
- **API and worker → Railway or Fly:** one image from `apps/server/Dockerfile` (build context: the repository root), two services: `node dist/index.js` with health check `/healthz` (see `apps/server/railway.toml`) and `node dist/worker.js`.
- **Database → MongoDB Atlas:** set `MONGODB_URI`, then run `pnpm seed` against it once.
- **Sentry (optional):** `SENTRY_DSN` on the server, `VITE_SENTRY_DSN` on the client. Absent means off.

The provisioning steps are listed in `docs/tech/slice-0.md` §18.
