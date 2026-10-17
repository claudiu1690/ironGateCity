---
type: tech
title: Checks and Testing
aliases: [Testing, Tests, E2E, Playwright, Vitest, pnpm check]
tags: [tech, testing]
status: built
slice: "0; e2e projects added per slice and round; Vitest frozen 8 Oct 2026"
gdd: []
adrs: ["0004", "0070"]
updated: 2026-10-17
---

# Checks and Testing

## In one paragraph

Quality checks are lint, typecheck, build and the art check, run through Turborepo (cached), plus
**Playwright** end-to-end specs that play the real game in a browser against a server running on an
in-memory database. There are also about 180 **Vitest** files from slices 0–5, but since
**8 Oct 2026** the team rule is: no new Vitest tests and Vitest is not part of the working loop. Each
phase runs the cached checks and only the e2e specs it touches; the full e2e runs once per round,
before QA.

## How it works

**Root scripts** (`package.json`):

| Script | What it runs |
|---|---|
| `pnpm lint` / `typecheck` / `test` / `build` | `turbo run <task>` in every package |
| `pnpm e2e` | `turbo run e2e` → `playwright test` in `apps/client` |
| `pnpm art:check` | The art files exist, within budget, SVGs safe ([[Art and Maps Pipeline]]) |
| `pnpm format`, `format:check` | Prettier |
| `pnpm report:playtest`, `admin:boost` | Operator scripts in `packages/db` ([[Database and Models]]) |

Package extras: `pnpm --filter @irongate/server check:voting-conversion`,
`pnpm --filter @irongate/db migration:008`.

**Turborepo** (`turbo.json`): `build` depends on `^build` (outputs `dist/**`, env `VITE_*`);
`typecheck` on `^typecheck`; `test` on `^typecheck`; `dev` and `e2e` are never cached. `dev` and
`e2e` pass through the env names they need (`DB_MODE`, `MONGODB_URI`, `E2E_*`, `PLAYWRIGHT_*`,
`MONGOMS_*`, `QA_SHOW_BUGS`…). Cached runs replay instantly when nothing changed — never add
`--force` while working.

**The team rule (8 Oct 2026, the user's decision)** — from the user's notes:
- No new Vitest tests; existing files stay but are not run in the workflow.
- Per phase: the cached checks, then only the affected e2e specs.
- The full `pnpm e2e` once per round, before QA. QA writes e2e, not Vitest.
- Flaky tests get fixed, not re-run.
- `pnpm check` (art:check + lint + typecheck + build) and `pnpm e2e:only …` were **planned, not
  built**. Until they exist: `pnpm art:check && pnpm turbo run lint typecheck build`, and pick
  Playwright projects directly (`pnpm --filter @irongate/client exec playwright test --project <name>`).

**Playwright** (`apps/client/playwright.config.ts`, specs in `apps/client/e2e/`, helpers in
`e2e/helpers.ts`):
- Two web servers: the **built** server (`node ../server/dist/index.js`) with `NODE_ENV=production`,
  `DB_MODE=memory`, `E2E_TEST_HOOKS=1`, `E2E_NIGHT=day`, `E2E_PATROL=never`, a test-only auth
  secret; and the built client under `vite preview` with the same `/api` proxy, `VITE_TILES_ORIGIN=
  /e2e-tiles` (so specs run on the stills unless they route tiles).
- **Ports**: API `E2E_API_PORT` (default 3101), web `E2E_WEB_PORT` (default 4173). When
  `pnpm dev:mem` is running, use free ones: `E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e`.
- **One worker, projects in a chain**: specs share the server's test clock, so the clock-moving
  specs run as serial projects, each depending on the one before: `phone` (most specs, Pixel 7),
  `small-phone`, `landscape`, `desktop` → `council` → `qa-council` → `dev-panel` → `travel` →
  `capital` → `qa-capital` → `home-map` → `missions` → `rival` → `qa-risk` → `review4` →
  `qa-review4` → `review5` → `qa-review5` → `voting` → `qa-voting` → `review6` → `faction` →
  `favours` → `events` → `qa-together` → `chair` → `nation` → `removal` → `petition` →
  `clearwater` → `governor`. Run in chunks under ten minutes with `--no-deps` (each chunk a fresh
  server); slice 7's integration ran every project green that way (16 Oct 2026).
- About 30 spec files: per slice (`canvass`, `session`, `day`, `arrival`, `council`, `travel`,
  `capital`, `missions`, `rival`, `voting`…), per review round, and QA's (`qa.*.spec.ts`). The
  `review4` spec also sweeps screens for system terms and war words; slice 7's specs sweep theirs
  with `nationKit.sweep` (the refused words *whip, Directive, recall, Legislature, National Control,
  no-confidence, Chancellor*, the war words, and *front* except *The Front*, *front door*, *front
  page*; *ballot* allowed). Slice 8's specs call `nationKit.lifeSweep`: the same, plus the Wardrobe's
  system words, *bodyguard, guard, escort, muscle, enforcer* (*a street enforcer* stays), *season* and
  *Champion* (deferred) and *CHA*; *out front* is allowed. Slice 8's integration ran all 353 tests green
  in nine chunks (17 Oct 2026). `QA_SHOW_BUGS=1` shows known
  bugs kept as expected failures.
- First run: `pnpm --filter @irongate/client exec playwright install chromium`.

**Vitest** (frozen): `packages/rules/test` (46 files, with coverage), `packages/content/test` (28,
including word-for-word and vocabulary checks), `packages/db/test` (18), `packages/ui/test` (25,
jsdom + Testing Library), `apps/server/test` (62, each suite starts its own in-memory replica set via
`test/globalSetup.ts`; `test/setup.ts` pins the night to day). The client has no Vitest files.

**CI** (`.github/workflows/ci.yml`, on push and PR): install → `pnpm art:check` →
`pnpm turbo lint typecheck test build` → install Chromium → `pnpm e2e` → upload the report on failure.
`mongod` binaries for `mongodb-memory-server` are cached.

## Key files

- `package.json`, `turbo.json`, `.github/workflows/ci.yml`
- `apps/client/playwright.config.ts`, `apps/client/e2e/*.spec.ts`, `e2e/helpers.ts`, `e2e/fixtures/`
- `apps/server/vitest.config.ts`, `apps/server/test/globalSetup.ts`
- `packages/db/src/testing/memoryReplSet.ts`

## Rules to follow

- Checks: `pnpm art:check && pnpm turbo run lint typecheck build` (cached, no `--force`).
- Per phase: only the affected Playwright projects. Full e2e once before QA.
- No new Vitest files until the user says otherwise.
- A spec that moves the shared clock goes in its own serial project at the end of the chain.
- Specs use the test hooks, never a real database ([[Dev Panel and Local Setup]]).

## Decisions (ADRs)

- [[adr/0004-in-memory-replica-set-for-tests-and-dev|ADR 0004]] — the in-memory replica set behind every test.
- [[adr/0070-performance-and-accessibility-checks-with-playwright-and-axe|ADR 0070]] — performance budgets with CDP throttling and WCAG checks with `@axe-core/playwright`: **proposed for slice 9, not built**. `@axe-core/playwright` is not installed; there is no bundle-budget script yet. (The arrival spec checks the first session's art stays under 1 MB.)

> [!warning] Drift
> - The 8 Oct rule names `pnpm check` and `pnpm e2e:only`; **neither script exists** in any
>   `package.json`.
> - CI still runs `turbo … test` (all Vitest suites) on every push, while the working rule drops
>   Vitest. *Inference:* the rule was meant for the local loop; CI was not changed.
> - The rule mentions "a parallel group and a serial group" in Playwright. The config still has
>   `workers: 1` and `fullyParallel: false`.
> - `README.md` still describes `pnpm test` as part of "everything at once, as CI does".

## Related

[[Dev Panel and Local Setup]] · [[Architecture Overview]] · [[Run a Slice]] · [[Database and Models]]
