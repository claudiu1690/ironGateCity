# Irongate City

A political browser RPG set in a fictional 1946 Central European republic. The v3.0 code that used to live here has been archived (see git history); the game is being rebuilt from scratch in vertical slices. Start with [`CLAUDE.md`](CLAUDE.md) for the project rules and team, [`docs/GDD.md`](docs/GDD.md) for the game design, and [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the stack and the slice plan. The current slice's technical design is [`docs/tech/slice-0.md`](docs/tech/slice-0.md).

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

This starts an in-memory MongoDB replica set on `127.0.0.1:27018` (`pnpm db:mem`), the API on <http://localhost:3001> and the client on <http://localhost:5173>. No `.env` is needed. Open the client, sign up, and tap **×1** on _Canvass the shift change_.

**With Docker (persistent database):**

```sh
cp apps/server/.env.example apps/server/.env   # once; defaults point at the Docker database
pnpm db:up                                     # mongo:7 single-node replica set on 27017
pnpm seed                                      # once: collections, indexes, city state (idempotent)
pnpm dev                                       # API :3001 + client :5173
pnpm db:down                                   # when you're done
```

The client proxies `/api` to the API, so the browser only ever talks to its own origin (ADR 0001). Check the API with <http://localhost:3001/healthz>.

### Checks

| Command          | What it runs                                                                                                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`      | ESLint (typescript-eslint) in every package                                                                                                                                                                                       |
| `pnpm typecheck` | `tsc --noEmit` in every package                                                                                                                                                                                                   |
| `pnpm test`      | Vitest: rules (with coverage), content, db, server and ui. The db and server suites start their own in-memory replica set; no Docker needed                                                                                       |
| `pnpm e2e`       | Playwright: builds the server, runs it with `DB_MODE=memory` behind `vite preview`, and plays sign up → Canvass → result modal on a phone viewport. First time: `pnpm --filter @irongate/client exec playwright install chromium` |
| `pnpm build`     | Client bundle (`apps/client/dist`) and server bundle (`apps/server/dist/index.js`, `dist/worker.js`)                                                                                                                              |
| `pnpm format`    | Prettier                                                                                                                                                                                                                          |

Everything at once, as CI does: `pnpm turbo lint typecheck test build && pnpm e2e`.

### Repository layout

```
apps/client      React 19 + Vite SPA (TanStack Router and Query, tRPC client, Better Auth client, Tailwind v4)
apps/server      Fastify + tRPC + Better Auth (src/index.ts) and the Agenda worker (src/worker.ts)
packages/rules   Pure game maths: seeded RNG, checks, lazy Energy/Rested, rewards, levels. No I/O
packages/content Factions, cities, locations and actions as Zod-validated data
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
