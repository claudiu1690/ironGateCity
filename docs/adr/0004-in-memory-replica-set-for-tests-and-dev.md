# ADR 0004 — `mongodb-memory-server` replica set for tests and as a Docker-free dev fallback

**Status:** accepted (slice 0) · **Date:** 2026-09-29

## Context

Transactions need a replica set. The primary local database is a single-node replica set in Docker
(`docker-compose.yml`), but on the development machine the Docker daemon is not always running, and
CI should not depend on a Docker service just to run unit tests.

## Decision

- Add `mongodb-memory-server` (dev dependency) and a helper `packages/db/src/testing/memoryReplSet.ts`
  that starts `MongoMemoryReplSet` (`count: 1`, `storageEngine: 'wiredTiger'`) and returns its URI.
- **Vitest** (server procedure tests, db tests) uses it from a global setup; every test file gets a
  clean database name.
- **Playwright** starts the server with `DB_MODE=memory`, so the e2e flow runs with no Docker.
- **Dev fallback:** `pnpm db:mem` runs a standalone in-memory replica set on port `27018`
  (name `rs0`) and keeps the process alive; `pnpm dev:mem` starts it together with the apps and
  points the server at it. Data is lost when the process exits, which is fine for a skeleton.
- pnpm 10 blocks post-install scripts by default: `mongodb-memory-server` and `esbuild` are listed
  in `pnpm.onlyBuiltDependencies`. The mongod binary (~100 MB) is downloaded on first use to
  `~/.cache/mongodb-binaries` (`MONGOMS_DOWNLOAD_DIR`); CI caches that directory.

## Consequences

- Tests and the e2e flow run anywhere with Node and network access for the first binary download.
- Docker stays the recommended dev database for persistence and for browsing in Compass.
- One more dev dependency; no production impact.
