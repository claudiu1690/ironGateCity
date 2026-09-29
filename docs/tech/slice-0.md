# Slice 0 — Walking skeleton: technical design

| | |
|---|---|
| **Goal** | A deployed URL where you sign up, tap **Canvass** at one Coalport location and see a real result modal, decided on the server with the full breakdown. |
| **Question** | Does the whole pipe work, tap → database → modal? |
| **Sources** | `docs/IMPLEMENTATION_PLAN.md` §2, §4 (slice 0), §5 row 0, §6 · GDD §2, §5.3, §5.5, §6.2, §6.3, §7.3–7.4, §8.4–8.5, §13.1, §13.1a, §14.1–14.2, §14.11, §16.1 |
| **ADRs** | [0001 same-origin API](../adr/0001-same-origin-api-via-proxy.md) · [0002 atomic idempotent actions](../adr/0002-atomic-idempotent-actions.md) · [0003 city state vs content](../adr/0003-city-documents-hold-state-not-content.md) · [0004 in-memory replica set](../adr/0004-in-memory-replica-set-for-tests-and-dev.md) |

Numbers marked **PLACEHOLDER** are not pinned by the GDD. They are chosen so the slice runs, live in one
constants file, and are listed as questions for the game designer in §17. Nothing else invents a rule.

---

## 1. Scope

**In:** monorepo + CI · MongoDB replica set (Docker or in-memory) · Mongoose models `characters`, `cities`,
`actionLogs` (+ Better Auth's own collections) · Better Auth email/password sign-up and login · auto-created
character · `packages/rules` v1 (seeded RNG, check formula, lazy Energy/Rested, tier-1 rewards) ·
`packages/content` v1 (factions, Coalport, one location, one action) · `packages/ui` v1 (tokens, fonts, HUD bar,
ticket, stamp, result modal) · one screen with one action, ×1 only · Playwright flow sign up → canvass → modal ·
deployment configuration (no accounts yet) · Agenda worker entry point as a stub.

**Out (deliberately, see §15):** ×3/×5, Local Standing, levels/level-ups, jobs, Morning Paper, city opinion
*writes*, origin story, faction choice, maps, mobile polish, rate limiting, moderation, analytics.

---

## 2. Repository, tooling and versions

```
ironGateCity/
├── apps/client/           React 19 + Vite SPA
├── apps/server/           Fastify + tRPC (src/index.ts) and the Agenda worker (src/worker.ts)
├── packages/rules/        pure maths, no I/O
├── packages/content/      Zod-validated data
├── packages/db/           Mongoose connection, models, indexes, seed, memory-replset helper
├── packages/ui/           tokens, fonts, components
├── docs/                  GDD, plan, tech designs, ADRs
├── docker-compose.yml     mongo:7 single-node replica set
├── pnpm-workspace.yaml · turbo.json · tsconfig.base.json · eslint.config.js · .github/workflows/ci.yml
```

**Package names:** `@irongate/client`, `@irongate/server`, `@irongate/rules`, `@irongate/content`, `@irongate/db`,
`@irongate/ui`. Packages are consumed **as TypeScript source** (`"exports": { ".": "./src/index.ts" }`, Turborepo
"just-in-time" packages); Vite and `tsx` compile them, `tsup` bundles them into the server build. No per-package
build step in slice 0.

**Versions** (pin the major; `latest` = latest at install, verify it works):

| Area | Packages |
|---|---|
| Base | `typescript ^5.9` · `turbo ^2` · `tsx ^4` · `tsup ^8` · `eslint ^9` + `typescript-eslint ^8` · `prettier ^3` · Node **22.12** (`.node-version`), pnpm **10.34** (`packageManager` field) |
| Client | `react ^19.2` · `react-dom ^19.2` · `vite ^7` · `@vitejs/plugin-react ^5` · `@tanstack/react-query ^5` · `@tanstack/react-router ^1` (code-based routes, no plugin) · `tailwindcss ^4` + `@tailwindcss/vite ^4` · `@radix-ui/react-dialog ^1` · `@fontsource-variable/playfair-display`, `@fontsource-variable/source-serif-4`, `@fontsource-variable/oswald`, `@fontsource/courier-prime` (latest) · `@sentry/react` (latest) |
| Server | `fastify ^5` · `@fastify/cors ^11` · `@trpc/server ^11`, `@trpc/client ^11`, `@trpc/tanstack-react-query ^11` · `zod ^4` · `mongoose ^8` (if 9.x is current at install, use it and note it) · `better-auth` (latest 1.x) · `agenda` (latest; **check** it accepts a `Db` from the mongodb 6 driver that Mongoose 8 ships; if not, write ADR 0005 and use `@hokify/agenda`) · `@sentry/node` (latest) |
| Tests | `vitest` (latest) · `@playwright/test` (latest) · `mongodb-memory-server ^10` |

**pnpm 10 note:** root `package.json` needs `"pnpm": { "onlyBuiltDependencies": ["esbuild", "mongodb-memory-server"] }`
or post-install scripts are skipped.

**Root scripts** (`turbo run` under the hood):

| Script | Does |
|---|---|
| `dev` | server (`tsx watch src/index.ts`, port 3001) + client (Vite, port 5173, `/api` proxied to 3001) against `MONGODB_URI` (Docker) |
| `db:up` / `db:down` | `docker compose up -d` / `down` |
| `db:mem` | in-memory replica set on `127.0.0.1:27018`, name `rs0`, kept alive (ADR 0004) |
| `dev:mem` | `db:mem` + `dev` with `MONGODB_URI=mongodb://127.0.0.1:27018/irongate?replicaSet=rs0&directConnection=true` (`concurrently`, dev dependency) |
| `seed` | `packages/db` seed against `MONGODB_URI` (idempotent) |
| `lint` · `typecheck` · `test` · `e2e` · `build` | per package via Turborepo; `test` never needs Docker |

**Environment** — validated with Zod at start-up (`apps/server/src/env.ts`); a bad value fails fast with the field name.
Loaded from `.env` with Node's built-in `process.loadEnvFile()` (no `dotenv`), only if the file exists.

| Server var | Type | Notes |
|---|---|---|
| `NODE_ENV` | `development \| test \| production` | default `development` |
| `PORT` | int | default `3001` |
| `DB_MODE` | `uri \| memory` | `memory` starts a `MongoMemoryReplSet` in-process (Playwright, quick demos); default `uri` |
| `MONGODB_URI` | string | required when `DB_MODE=uri` |
| `BETTER_AUTH_SECRET` | string ≥ 32 chars | |
| `PUBLIC_ORIGIN` | URL | the origin the **browser** sees (`http://localhost:5173` in dev, the Vercel URL in prod); Better Auth `baseURL` and `trustedOrigins` |
| `SENTRY_DSN` | string, optional | absent → Sentry is not initialised (no-op) |
| `LOG_LEVEL` | pino level | default `info` |

| Client var (`import.meta.env`) | Notes |
|---|---|
| `VITE_API_BASE` | default `/api` (same-origin, ADR 0001). Only set to an absolute URL for the cross-origin fallback |
| `VITE_SENTRY_DSN` | optional; absent → no-op |

`docker-compose.yml`:

```yaml
services:
  mongo:
    image: mongo:7
    command: ["--replSet", "rs0", "--bind_ip_all"]
    ports: ["27017:27017"]
    volumes: ["mongo_data:/data/db", "mongo_config:/data/configdb"]
    healthcheck:
      test: >
        mongosh --quiet --eval "try { rs.status().ok } catch (e) { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] }).ok }"
      interval: 5s
      timeout: 30s
      retries: 30
volumes: { mongo_data: {}, mongo_config: {} }
```
`MONGODB_URI=mongodb://127.0.0.1:27017/irongate?replicaSet=rs0&directConnection=true`. The member host must be
`127.0.0.1` so the Windows host can reach the primary.

---

## 3. Content (`packages/content`)

Everything below is data; the server never hard-codes a name, a cost or a line of text. Ids are stable strings
and dotted by containment.

```ts
// schemas.ts (Zod). Inferred types are exported.
FactionId   = z.enum(['vanguard', 'collective', 'alliance'])            // internal ids; display names are data (GDD: naming parked)
StatKey     = z.enum(['str', 'int', 'agi', 'cha'])
Faction     = { id: FactionId, name: string, shortName: string, crest: z.enum(['square','circle','triangle']), homeCityId: string,
                startingBonus: Partial<Record<StatKey, number>> }      // §16.1: vanguard {str:3}, collective {str:2,int:1}, alliance {int:3}
Action      = { id: string, name: string, tier: z.literal(1), type: z.enum(['canvass','speech','propaganda','training','intelligence','job']),
                stat: StatKey, energy: z.number().int().min(5).max(15),   // §5.5 tier-1 range
                givesFxp: boolean, givesOpinion: boolean,                  // §13.3: canvass = yes / yes
                text: { success: { headline: string, body: string }, partial: { headline: string, body: string } } }  // body: 2–3 lines
Location    = { id: string, name: string, kind: z.enum(['factory-gate','docks','market','station','bar','street','hq']), blurb: string,
                actions: Action[] }
City        = { id: string, name: string, role: z.enum(['home','battleground']), homeFactionId: FactionId.optional(),
                baselineOpinion: { vanguard, collective, alliance, neutral: number },   // sums to 100
                locations: Location[] }
Content     = { factions: Faction[], cities: City[] }
```

`loadContent(): Content` parses every data file with the schemas (throws with the Zod path on error) and also checks:
unique ids, every faction `homeCityId` exists, a home city has a `homeFactionId`, `baselineOpinion` sums to 100.
`getContent()` memoises. A Vitest test loads the real data.

**Slice-0 data** (`data/factions.ts`, `data/cities/coalport.ts`):

- Factions: the three of §16.1, names as in the GDD (parked), crests ■ ● ▲.
- City `coalport`: home, `homeFactionId: 'collective'`, **PLACEHOLDER** `baselineOpinion { collective: 70, vanguard: 10, alliance: 10, neutral: 10 }`
  (70 is the §14.11 drift target; the split of the rest is a guess).
- Location `coalport.mill-gate`, "Mill Gate", kind `factory-gate`, blurb 1 line.
- Action `coalport.mill-gate.canvass`, "Canvass the shift change", tier 1, type `canvass`, stat `int` (§8.4 example),
  **PLACEHOLDER** `energy: 10`, `givesFxp: true`, `givesOpinion: true`, success and partial text as **placeholders
  marked `TODO(game-designer)`** in the file (2–3 lines each, campaign vocabulary, no war framing).

---

## 4. Data model (`packages/db`)

Mongoose, `strict: true`, `timestamps: true`, `versionKey: false` (we keep our own `version`). Connection via
`connectDb(uri)`; `mongoose.connection.getClient().db()` is handed to Better Auth's adapter so auth and game data
share one database and one replica set.

### `characters` — one per user, everything a session reads embedded

```ts
{
  _id: ObjectId,
  userId: string,                 // Better Auth user id (string)
  name: string,                   // from the sign-up form
  factionId: 'vanguard'|'collective'|'alliance',
  homeCityId: string,             // 'coalport'
  cityId: string,                 // where the character is now; == homeCityId in slice 0
  stats: { str: number, int: number, agi: number, chaBase: number },   // worn CHA = chaBase + equipment (slice 2); slice 0: chaBase stands in
  energy: { value: number, updatedAt: Date },   // lazy timer (§6.2); `updatedAt` is advanced by whole 10-min ticks, never set to "now"
  rested: number,                 // §6.3; shares energy.updatedAt (it only changes when Energy is projected or spent)
  xp: number, level: number,      // level stays 1 in slice 0 (no per-level table yet, §17 Q7)
  fxp: number, iron: number,      // fxp/iron pulled forward from the plan's slice-1 row: the reward tiles need them
  version: number,                // optimistic guard, +1 per game action (ADR 0002)
  createdAt, updatedAt
}
```
Indexes: `{ userId: 1 }` **unique** (get-or-create is an upsert on it).
Defaults for the auto-created character (all **PLACEHOLDER** until slice 2's origin story):
faction `collective`, city `coalport`, `stats { str: 7, int: 11, agi: 5, chaBase: 2 }`
(= 5 base + Collective +2 STR +1 INT, §7.3/§8.5; **+5 INT stands in for the origin story**, so the canvass odds land at
62 %, inside the §8.4 60–85 % band; CHA 2 = basic work clothes, §8.2), `energy { value: 100, updatedAt: now }`,
`rested 0`, `xp 0`, `level 1`, `fxp 0`, `iron 0`, `version 0`.

### `cities` — live state only (ADR 0003)

```ts
{ _id: string /* content id */, opinion: { vanguard, collective, alliance, neutral: number }, createdAt, updatedAt }
```
No extra index. Seeded with `baselineOpinion` via `$setOnInsert`. **Not written in slice 0.**

### `actionLogs` — grows without limit, own collection

```ts
{
  _id: ObjectId, characterId: ObjectId, idempotencyKey: string /* uuid */,
  actionId: string, locationId: string, cityId: string,
  seed: string /* 32 hex chars */, outcome: 'success'|'partial'|'failure',
  result: ActionResult /* the full modal payload, §8, stored verbatim (Mixed) */,
  createdAt: Date
}
```
Indexes: `{ characterId: 1, idempotencyKey: 1 }` **unique** (the idempotency lock) · `{ characterId: 1, createdAt: -1 }`
(history, slice 1's "Today" tally).

### Better Auth collections

`user`, `session`, `account`, `verification` — created and indexed by Better Auth's MongoDB adapter (the plan's
`users`/`sessions` are these). Not touched by our code except through `auth.api`.

### Seed (`packages/db/src/seed.ts`)

`seed(content)` upserts a `cities` doc per content city with `$setOnInsert`. Idempotent; run by `pnpm seed`, by the server
at start-up in `memory` mode, and by the test setup.

---

## 5. Rules (`packages/rules`) — pure, no I/O

One constants file, one function per concept, everything returns the numbers the modal shows.

```ts
// constants.ts
export const ENERGY  = { max: 100, regenPerTick: 5, tickMs: 10 * 60_000 } as const;         // §6.2
export const RESTED  = { cap: 200, xpBonus: 0.5, ironBonus: 0.5 } as const;                  // §6.3
export const CHECK   = { base: 50, perPoint: 4, min: 5, max: 95, partialWindow: 20 } as const; // §8.4
export const TIER1_DIFFICULTY = { home: 8, battleground: 10 } as const;                      // §8.4
export const TIER_RATES = { 1: { xpPerEnergy: 4.5, fxpPerEnergy: 0.6, ironPerEnergy: 2 } } as const; // §5.5
export const PLACEHOLDERS = { opinionPerTier1Success: 0.05 } as const;   // % of city opinion; partial = half. §17 Q4

// rng.ts — deterministic; no Math.random anywhere in this package
export interface Rng { readonly seed: string; next(): number /* [0,1) */; int(min: number, max: number): number; roll100(): number /* 1..100 */ }
export function createRng(seed: string): Rng;   // cyrb128 string hash → sfc32; same seed ⇒ same sequence (×3 later draws 3 rolls from one seed)

// energy.ts — lazy timers
export interface EnergyState { value: number; rested: number; updatedAt: number /* epoch ms */ }
export interface EnergyProjection extends EnergyState { max: number; nextTickAt: number | null; fullAt: number | null }
export function projectEnergy(state: EnergyState, now: number, max?: number): EnergyProjection;
//   ticks = floor((now - updatedAt) / tickMs); gain = ticks * 5; value' = min(max, value + gain);
//   overflow (only the part above max) → rested' = min(cap, rested + overflow); updatedAt' = updatedAt + ticks * tickMs (keeps the remainder)
export type SpendResult = { ok: true; state: EnergyState; restedUsed: number } | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; shortBy: number };
export function spendEnergy(p: EnergyProjection, cost: number): SpendResult;
//   restedUsed = min(rested, cost)  (§6.3: one Rested per Energy point spent while Rested > 0; proration is §17 Q6)

// check.ts
export type StatKey = 'str' | 'int' | 'agi' | 'cha';
export type Stats = Record<StatKey, number>;                 // cha already "worn"
export interface CheckBonus { id: string; label: string; value: number }   // e.g. { id: 'standing', label: 'Known in Coalport', value: 6 } (slice 1)
export interface CheckBreakdown { stat: StatKey; statValue: number; difficulty: number; base: number; statTerm: number;
                                  bonuses: CheckBonus[]; bonusTotal: number; raw: number; chance: number /* clamped 5..95 */ }
export function computeCheck(i: { stat: StatKey; stats: Stats; difficulty: number; bonuses?: CheckBonus[] }): CheckBreakdown;
export function tier1Difficulty(cityRole: 'home' | 'battleground'): number;
export type Outcome = 'success' | 'partial' | 'failure';
export function outcomeForRoll(roll: number, chance: number, tier: 1 | 2 | 3): Outcome;
//   roll <= chance → success; roll <= chance + 20 → partial; else tier 1 → partial, tiers 2–3 → failure.  ("≤" is §17 Q5)

// rewards.ts
export interface RewardLine { base: number; bonus: number; total: number }
export interface Rewards { xp: RewardLine; fxp: RewardLine; iron: RewardLine; opinion: number /* % points, 0 if !givesOpinion */ }
export function computeRewards(i: { tier: 1; energy: number; outcome: Outcome; givesFxp: boolean; givesOpinion: boolean; restedUsed: number }): Rewards;
//   base = rate * energy, halved on partial (round to nearest, §17 Q3); Rested bonus = base * 0.5 * (restedUsed / energy) on XP and Iron only

// action.ts — the one entry point the server calls
export interface ActionAttempt { index: number; check: CheckBreakdown; roll: number; outcome: Outcome }
export interface Tier1Resolution { seed: string; attempts: ActionAttempt[]; outcome: Outcome; energy: { before: EnergyProjection; after: EnergyState; cost: number; restedUsed: number }; rewards: Rewards }
export type ResolveResult = { ok: true; resolution: Tier1Resolution } | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; shortBy: number };
export function resolveTier1Action(i: { action: { energy: number; stat: StatKey; givesFxp: boolean; givesOpinion: boolean };
                                        cityRole: 'home' | 'battleground'; stats: Stats; bonuses?: CheckBonus[];
                                        energy: EnergyState; now: number; times: 1 }, rng: Rng): ResolveResult;

// types.ts — shared DTOs (ActionResult, CharacterView, …) so ui and client import types from one place without a new package
```

**Tests (Vitest, `packages/rules/test`)** — at minimum: `createRng` is deterministic and uniform-ish over 10k rolls;
`projectEnergy` at 0 / 1 / 19.99 / 20 min, overflow into Rested, both caps, remainder kept, `nextTickAt`/`fullAt`;
`spendEnergy` exact cost, insufficient, Rested consumption; `computeCheck` reproduces the three §8.4 examples (72 %, 74 %,
48 %) and the clamps; `outcomeForRoll` boundaries (roll = chance, chance + 20, chance + 21, tier 1 never fails);
`computeRewards` 10 Energy tier 1 → 45 / 6 / 20, partial → 23 / 3 / 10, full Rested → 68 / 6 / 30; `resolveTier1Action`
replay: same seed + same input ⇒ identical resolution.

---

## 6. API (`apps/server`)

Fastify 5 (`trustProxy: true`, pino logging). Routes:

| Path | What |
|---|---|
| `GET /healthz` | `{ ok: true, db: 'up' \| 'down', version }` for Railway/Fly health checks |
| `ALL /api/auth/*` | Better Auth handler (web `Request` ↔ Fastify bridge, per Better Auth's Fastify guide) |
| `POST/GET /api/trpc/*` | `fastifyTRPCPlugin` |

**Better Auth config:** `emailAndPassword: { enabled: true }` (no email verification in slice 0), `database: mongodbAdapter(db)`,
`baseURL: env.PUBLIC_ORIGIN`, `trustedOrigins: [env.PUBLIC_ORIGIN]`, `basePath: '/api/auth'`, secret from env. Sign-up
requires `name`, `email`, `password` (Better Auth defaults). Cookies: defaults (`HttpOnly`, `SameSite=Lax`, `Secure` in
production, host-only) — correct because the API is same-origin (ADR 0001).

**tRPC context:** `{ userId: string | null, characterId?: ObjectId }` from `auth.api.getSession({ headers })`.
`protectedProcedure` throws `UNAUTHORIZED` when `userId` is null.

**Error contract:** `TRPCError` with the standard `code` plus `cause: GameError` whose `reason` and `data` are copied into
`error.data.game` by the `errorFormatter`, so the client can switch on a string:

```ts
type GameErrorReason = 'NOT_ENOUGH_ENERGY' | 'WRONG_CITY' | 'UNKNOWN_ACTION' | 'UNKNOWN_LOCATION' | 'ACTION_CONFLICT';
// error.data.game = { reason, ...data }   e.g. { reason: 'NOT_ENOUGH_ENERGY', energy: 4, cost: 10, nextTickAt: 1790000000000 }
```

### Procedures (`apps/server/src/trpc/routers/*`)

```ts
health.ping           public   ()                    → { ok: true, now: number }

character.me          protected ()                   → CharacterView
  // get-or-create: characters.findOneAndUpdate({ userId }, { $setOnInsert: defaults(user.name) }, { upsert: true, new: true })
  // then projectEnergy(now) — the stored doc is not written on read (lazy)

city.get              protected ({ cityId: z.string() })  → CityView
  // content city + cities state + for every action at every location: preview = computeCheck(...) + energy cost
  // errors: NOT_FOUND (unknown city)

action.perform        protected ({
                        actionId: z.string(), locationId: z.string(),
                        idempotencyKey: z.string().uuid(),
                        times: z.literal(1)                      // ×3 / ×5 widen this to z.union in slice 1
                      })                                        → ActionResult
  // errors: NOT_FOUND + UNKNOWN_ACTION / UNKNOWN_LOCATION; BAD_REQUEST + WRONG_CITY;
  //         PRECONDITION_FAILED + NOT_ENOUGH_ENERGY { energy, cost, nextTickAt }; CONFLICT + ACTION_CONFLICT (after 3 retries)
```

```ts
interface CharacterView { id: string; name: string; factionId: FactionId; homeCityId: string; cityId: string;
  stats: { str: number; int: number; agi: number; cha: number };   // cha = worn (chaBase in slice 0)
  energy: { value: number; max: number; updatedAt: number; nextTickAt: number | null; fullAt: number | null };   // projected + the stored timestamp so the client can tick with the same rules function
  rested: number; xp: number; level: number; fxp: number; iron: number; version: number }

interface CityView { id: string; name: string; role: 'home' | 'battleground'; homeFactionId?: FactionId;
  opinion: Record<FactionId | 'neutral', number>;
  locations: Array<{ id: string; name: string; kind: string; blurb: string;
    actions: Array<{ id: string; name: string; type: string; stat: StatKey; energy: number; preview: CheckBreakdown }> }> }
```

### `action.perform` — the algorithm (ADR 0002)

```
1  ctx.userId → character (must exist; character.me creates it). Load content action/location; check location.cityId === character.cityId.
2  existing = ActionLog.findOne({ characterId, idempotencyKey }) → if found: return existing.result        (retry / double tap)
3  for attempt in 1..3:
4    try transaction (mongoose.connection.transaction(async session => {
5      c = Character.findById(id).session(session)                                     // fresh read inside the snapshot
6      seed = randomBytes(16).toString('hex'); rng = createRng(seed); now = Date.now()
7      r = resolveTier1Action({ action, cityRole, stats: worn(c), energy: c.energy+rested, now, times: 1 }, rng)
8      if (!r.ok) throw GameError('NOT_ENOUGH_ENERGY', { energy, cost, nextTickAt })                        // aborts the txn
9      result = buildActionResult(c, r, content)                                                            // §8
10     updated = Character.findOneAndUpdate({ _id: c._id, version: c.version },
            { $set: { 'energy.value': after.value, 'energy.updatedAt': after.updatedAt, rested: after.rested },
              $inc: { xp: rewards.xp.total, fxp: rewards.fxp.total, iron: rewards.iron.total, version: 1 } },
            { new: true, session })
11     if (!updated) throw new VersionConflict()                                                            // someone else moved first
12     result.character = toView(updated, now)                                                             // attach the fresh HUD state BEFORE storing
13     await ActionLog.create([{ characterId, idempotencyKey, actionId, locationId, cityId, seed, outcome, result }], { session })
14     return result
   }))
15   catch VersionConflict → continue (retry); catch E11000 on actionLogs → return (await ActionLog.findOne({characterId, idempotencyKey})).result
16   catch GameError → rethrow as TRPCError
17 after 3 failed attempts → TRPCError CONFLICT / ACTION_CONFLICT
```
`connection.transaction()` already retries `TransientTransactionError` (write conflicts) internally; the loop covers
our own version miss. Nothing is written outside the transaction. The result returned at step 14 is byte-for-byte what step 13
stored, so a retried key (step 2 or step 15) shows the same modal.

**Tests (`apps/server/test`, Vitest + `MongoMemoryReplSet`, via `appRouter.createCaller(ctx)` with a fake `userId`):**
`character.me` creates once and returns the same id twice · `city.get` returns the Mill Gate with a 62 % preview for the
default character · `action.perform`: Energy 100 → 90, rewards 45/6/20 or 23/3/10, log written with seed · same key twice
→ identical result object and **one** log, Energy 90 · `Promise.all` of 5 calls with the same key → one log · 10 different
keys → Energy 0 and the 11th is `NOT_ENOUGH_ENERGY` with `nextTickAt` · replaying `createRng(log.seed)` reproduces `roll` ·
wrong city → `WRONG_CITY` · unauthenticated → `UNAUTHORIZED`. One HTTP test with `app.inject`: `POST /api/auth/sign-up/email`
→ cookie → `character.me` succeeds.

---

## 7. Jobs (Agenda)

Slice 0 has **no real events** to schedule. `apps/server/src/worker.ts` exists so the deploy shape is right from day 1:
connect to Mongo, `new Agenda({ mongo: db, processEvery: '30 seconds' })`, define nothing, `await agenda.start()`, stop on
`SIGTERM`/`SIGINT`. Runs as a second Railway/Fly process (`pnpm --filter @irongate/server start:worker`). Idempotency conventions
for future jobs are recorded now so slice 3 follows them: one job per real event, keyed by a natural id
(`unique({ name, 'data.key' })`), and every handler is a no-op if the event's state document is already resolved.

Lazy timers (Energy, Rested) need no job.

---

## 8. The result modal breakdown (GDD §13.1a)

Produced in one place, `apps/server/src/services/actionResult.ts` (`buildActionResult`), from three inputs: the pure
`Tier1Resolution`, the content action's text, and the character before/after. Stored verbatim in `actionLogs.result` and
returned unchanged. The client renders it; it computes nothing.

```ts
interface ActionResult {
  logId: string; idempotencyKey: string; performedAt: string /* ISO, UTC */; seed: string;
  place: { cityId: string; cityName: string; locationId: string; locationName: string; kind: string };   // §13.1a-1 art key = location kind (fallback ladder, slice 1)
  action: { id: string; name: string; type: string; tier: 1 };
  stamp: 'success' | 'partial';                                    // ×3 later: '2 of 3'
  headline: string; body: string;                                  // §13.1a-2, from content by outcome
  attempts: ActionAttempt[];                                        // §13.1a-3: chance bar + roll marker + full CheckBreakdown per row
  rewards: Rewards;                                                 // §13.1a-4: four tiles (xp, fxp, iron, opinion) with base/bonus/total
  bonusTags: Array<{ id: string; label: string; note: string }>;   // e.g. { id: 'rested', label: 'Rested', note: '+50 % XP and Iron on 10 Energy' }; empty in most slice-0 runs
  effects: {                                                        // §13.1a-5
    energy: { before: number; after: number; max: number; nextTickAt: number | null };
    rested: { before: number; after: number };
    xp: { before: number; after: number }; fxp: { before: number; after: number }; iron: { before: number; after: number };
    level: number;
    opinion: { cityId: string; factionId: FactionId; delta: number; applied: false }   // slice 0 reports, does not move the meter (§15)
  };
  character: CharacterView;                                         // fresh HUD state, saves a refetch
}
```
Buttons (§13.1a-6): **Continue** and **Again ×1** (re-runs `action.perform` with a new key); **Again ×3** is rendered disabled
with a "slice 1" tooltip so the layout is final.

---

## 9. Client (`apps/client`)

- **Boot:** `main.tsx` → Sentry (if DSN) → `QueryClientProvider` → tRPC client (`httpBatchLink`, url `${VITE_API_BASE}/trpc`,
  `credentials: 'include'`) via `@trpc/tanstack-react-query` → `RouterProvider`.
- **Auth:** `createAuthClient({ baseURL: VITE_API_BASE + '/auth' })` from `better-auth/react`; `useSession()` gates routes.
- **Routes** (code-based TanStack Router): `/login`, `/signup`, `/` → `character.me` then redirect to `/city/$cityId`;
  `/city/$cityId` → the play screen.
- **Play screen:** `HudBar` (name, faction crest, Energy gauge ticking locally with `projectEnergy` from the stored
  `energy.updatedAt`, Rested, XP, Iron) · city plate · the one location card · one `Ticket` per action showing
  `preview.chance` and the Energy stub · tapping the percentage shows the `CheckBreakdown`.
- **Perform:** the click handler creates `idempotencyKey = crypto.randomUUID()` **once** and calls `useMutation`
  (`retry: 2` on network errors reuses the same input, so the same key). Button disabled while pending.
  On success: `setQueryData(character.me, result.character)` and open `ResultModal(result)`. On `NOT_ENOUGH_ENERGY`:
  inline notice with the countdown to `nextTickAt`. TanStack Query `refetchOnWindowFocus: true` (short sessions).
- Files: `src/{main.tsx, router.tsx, env.ts, lib/{trpc.ts, auth.ts, sentry.ts}, routes/{login.tsx, signup.tsx, city.tsx}, features/action/{useCanvass.ts, ActionTicket.tsx}}`.

---

## 10. UI package (`packages/ui`) v1

Modest scope, Noir Lithograph printed-matter look (design canvas: https://claude.ai/artifact/Huss4jaqe4JEs47YP3CaCy — the
developer matches the token values to it; the hex values below are starting points).

- `src/tokens.css` — Tailwind v4 `@theme`: `--color-ink #1a1815`, `--color-paper #f2ead8`, `--color-paper-2 #e6dcc3`,
  `--color-petrol #1f4e5a`, `--color-oxblood #6b1f24` (Collective ●), `--color-ochre #b8862b` (Vanguard ■),
  `--color-slate #4a5a6a` (Alliance ▲), `--color-rule #3a352e`; `--font-display` Playfair Display, `--font-body`
  Source Serif 4, `--font-label` Oswald, `--font-mono` Courier Prime; square corners (`--radius-* : 0`); a halftone/paper
  background utility. Fonts self-hosted via `@fontsource*` imports in `src/fonts.ts`.
- Components (plain props, **no tRPC or router imports**; types from `@irongate/rules` types):
  `HudBar` · `Gauge` (Energy, with "next +5 in m:ss") · `Ticket` (name, stat check %, Energy stub, button, 44 px targets) ·
  `Stamp` (rotated rubber stamp: Success / Partial) · `ResultModal` (Radix Dialog, sections 1–6 of §8, full-screen on
  phones) · `Button`, `Field`, `Plate` (enamel-sign heading), `FactionCrest` (■ ● ▲ + colour).
- `apps/client` consumes `tokens.css` through `@import "@irongate/ui/tokens.css"` and Tailwind's `@source` for the ui package.

---

## 11. Testing and CI

| Layer | Tool | Where |
|---|---|---|
| Rules | Vitest | `packages/rules/test` (§5) |
| Content | Vitest | `packages/content/test/load.test.ts` — real data validates |
| DB | Vitest + memory replset | `packages/db/test` — indexes exist, duplicate key on `actionLogs`, seed idempotent |
| Server | Vitest + memory replset | `apps/server/test` (§6), `globalSetup` starts `MongoMemoryReplSet`, `MONGODB_URI` per file |
| E2E | Playwright | `apps/client/e2e/canvass.spec.ts`: sign up (unique email) → city screen shows Mill Gate → tap Canvass → modal shows a stamp, one attempt row with a roll and chance, four reward tiles, Energy 100 → 90 → Continue → HUD shows 90. `playwright.config.ts` `webServer`: server with `DB_MODE=memory` (built with tsup) and `vite preview` with the proxy |

`.github/workflows/ci.yml`: on push/PR → `pnpm/action-setup` (10.34) → Node 22.12 with pnpm cache → cache
`~/.cache/mongodb-binaries` → `pnpm install --frozen-lockfile` → `pnpm turbo lint typecheck test build` → `pnpm exec playwright
install --with-deps chromium` → `pnpm e2e` → upload `playwright-report` on failure. No Docker service.

---

## 12. Deployment design (accounts not yet available — §18)

- **Client (Vercel):** root `apps/client`, build `pnpm turbo build --filter @irongate/client`, output `dist`.
  `apps/client/vercel.json`: `rewrites: [{ source: '/api/:path*', destination: 'https://<api-host>/api/:path*' }, { source: '/(.*)', destination: '/index.html' }]`.
  `<api-host>` is filled in when Railway/Fly exists (ADR 0001).
- **Server (Railway or Fly):** `apps/server/Dockerfile` multi-stage (`node:22-alpine`, corepack pnpm, `pnpm install --frozen-lockfile`,
  `tsup` bundle with `noExternal: [/^@irongate\//]`, runtime image with prod deps only). Two services from one image:
  `node dist/index.js` (API, health check `/healthz`) and `node dist/worker.js`. Env vars from §2.
- **Database:** Atlas M0, `MONGODB_URI` with `retryWrites=true&w=majority`; run `pnpm seed` once against it.
- **Sentry:** `@sentry/node` in `src/sentry.ts`, `Sentry.init` only when `SENTRY_DSN` is set; tRPC `onError` reports; client
  mirrors with `@sentry/react`.
- **Cross-site fallback** (only if the proxy fails for a reason we can't fix): `@fastify/cors` with `origin: PUBLIC_ORIGIN, credentials: true`,
  Better Auth `advanced.defaultCookieAttributes { sameSite: 'none', secure: true }`, `VITE_API_BASE` absolute. Known to
  break on Safari/ITP — a stopgap, not a plan.

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Better Auth ↔ Fastify bridge (raw body, headers, cookie passthrough) misbehaves | Follow the Better Auth Fastify guide exactly; cover with the `app.inject` sign-up test in task 5 before touching the client |
| `agenda` incompatible with the mongodb 6 driver | Worker is a stub; verify at install, ADR 0005 → `@hokify/agenda` if needed |
| `mongodb-memory-server` first download on Windows/CI (size, proxy) | Cache dir in CI; document `MONGOMS_DOWNLOAD_DIR`; Docker remains the primary dev DB |
| Lazy Energy drift between client tick and server projection | Both use `projectEnergy` from `@irongate/rules` with the server's `updatedAt`; the server is authoritative and refetch-on-focus resyncs |
| Vercel rewrite and cookies (`Set-Cookie` passthrough, `Host`) | Verified as the first thing after provisioning; fallback in §12 |
| zod 4 vs libraries that still expect zod 3 | tRPC 11 accepts Standard Schema; Better Auth bundles its own; if anything else breaks, `zod/v3` compat import |
| Placeholder numbers leak into slice 1 as "decided" | All in `PLACEHOLDERS`/content with `TODO(game-designer)`; §17 lists each |

---

## 14. Idempotency and atomicity summary

- One tap = one UUID = at most one `actionLogs` row (unique index) = at most one Energy spend (transaction + version guard).
- Retries with the same key, from the client or the network, return the stored result; a new tap is a new key.
- Character reads never write; only actions write, and only inside the transaction.
- The seed is stored per log; `createRng(seed)` replays the roll(s).

---

## 15. Deliberately left out of slice 0

| Left out | Where it lands |
|---|---|
| ×3 / ×5 (`times` widened, N attempts, "2 of 3" stamp) | slice 1 |
| Local Standing bonus (`bonuses[]` is already plumbed through `computeCheck`) | slice 1 |
| Level-ups (per-level XP table, +5 max HP, +1 stat point) — `level` stays 1 | slice 1, needs §17 Q7 |
| Writing city opinion (the modal reports `delta`, `applied: false`) | slice 1 or 4, needs §17 Q4 |
| Origin story, faction choice, starting kit, worn CHA from equipment | slice 2 |
| Maps, day/night, map crops as modal art (`place.kind` is the future art key) | slice 1–2 |
| Morning Paper, jobs, Directives | slice 1 |
| Rate limiting, one-account-per-person, name moderation/uniqueness | slice 9 |
| Analytics events (PostHog or a collection) | slice 1+ |
| SSE / WebSockets | slice 6 |

---

## 16. Task list (in order; each task leaves the repo green and is one commit)

**T0. Remove the old code** — delete `apps/api`, `apps/web`, root `package.json`, `package-lock.json`, root `node_modules`,
`docker-compose.yml` (Postgres/Redis); keep `README.md` but replace its body with a one-paragraph pointer to `CLAUDE.md`
and the plan. Commit alone ("Archive v3.0 code; see git history").

**T1. Monorepo scaffold** — root `package.json` (`packageManager`, workspaces, `onlyBuiltDependencies`, scripts §2),
`pnpm-workspace.yaml`, `turbo.json` (`build`, `dev` persistent/no-cache, `lint`, `typecheck`, `test`, `e2e`),
`tsconfig.base.json` (strict, `module: ESNext`, `moduleResolution: bundler`, `noUncheckedIndexedAccess`), `eslint.config.js`
(typescript-eslint recommended), `.prettierrc`, `.editorconfig`, `.node-version`, `.gitignore` (+ `test-results/`,
`playwright-report/`, `.vercel/`, `dist/`), empty `apps/*` and `packages/*` with `package.json`, `tsconfig.json`, `src/index.ts`,
`docker-compose.yml` (§2), `.env.example` files, `.github/workflows/ci.yml`. `pnpm install && pnpm turbo lint typecheck` green.

**T2. `packages/rules` v1** — constants, `rng`, `energy`, `check`, `rewards`, `action`, `types`; the tests in §5. 100 % of
branches in `check.ts` and `energy.ts` covered.

**T3. `packages/content` v1** — schemas, loader with cross-checks, factions, Coalport / Mill Gate / canvass with
`TODO(game-designer)` text; loader test.

**T4. `packages/db`** — `connectDb`, models and indexes (§4), `seed`, `testing/memoryReplSet.ts` (ADR 0004), `scripts/memMongo.ts`
(for `db:mem`); tests: indexes (`syncIndexes`), duplicate `idempotencyKey` rejected, seed idempotent.

**T5. Server: app, env, auth, `character.me`** — `env.ts`, `db.ts` (`DB_MODE`), `sentry.ts` (no-op without DSN), `app.ts`
(Fastify, `/healthz`, Better Auth bridge, tRPC plugin, `errorFormatter`), `trpc/{context,trpc,router}.ts`, `character.me`
get-or-create with the §4 defaults; tests: `createCaller` for `character.me`, `app.inject` sign-up → session → `character.me`.

**T6. Server: `city.get` and `action.perform`** — `services/actionService.ts` (algorithm §6), `services/actionResult.ts` (§8),
routers; all tests listed in §6.

**T7. Worker stub, build, Dockerfile** — `worker.ts` (§7), `tsup.config.ts` (two entries), `start`/`start:worker` scripts,
`apps/server/Dockerfile`, `railway.toml` or `fly.toml` skeleton (health check path). `pnpm build` produces `dist/index.js`
and `dist/worker.js`; `DB_MODE=memory node dist/index.js` answers `/healthz`.

**T8. `packages/ui` v1** — tokens, fonts, `HudBar`, `Gauge`, `Ticket`, `Stamp`, `ResultModal`, `Button`, `Field`, `Plate`,
`FactionCrest` (§10). A `ResultModal` smoke test with Vitest + `@testing-library/react` rendering a fixture `ActionResult`
(fixture exported from `packages/rules` tests) is enough.

**T9. Client** — Vite + Tailwind v4 + proxy, tRPC + auth clients, routes, play screen, canvass mutation with idempotency key,
modal wiring, local Energy tick, `NOT_ENOUGH_ENERGY` notice (§9). Runs with `pnpm dev:mem` end to end.

**T10. Playwright e2e** — `canvass.spec.ts` (§11) with `webServer` in memory mode; wired into CI. CI green on the branch.

**T11. Deployment config** — `vercel.json` (placeholder api host), Sentry client init, `README.md` dev section (Docker path,
`dev:mem` path, seed, tests, e2e), `.env.example` complete. Nothing here needs an account to be committed.

---

## 17. Questions for the game designer

Each has a **PLACEHOLDER** in code so slice 0 runs; the answer replaces it (and the GDD is updated in the same change).

1. **Starting stats before the origin story** (slice 2). Placeholder for the auto-created Collective character:
   STR 7 / INT 11 / AGI 5 / CHA 2 (5 base + faction, +5 INT standing in for the origin choices). Canvass odds = 62 %.
2. **Energy cost of the tier-1 Canvass** at the Mill Gate. Placeholder **10** (§5.5 allows 5–15) → 45 XP / 6 FXP / 20 Iron on Success.
3. **Rounding of half rewards on Partial.** Placeholder: round to nearest (22.5 XP → 23, 3 FXP, 10 Iron). Floor instead?
4. **Opinion per tier-1 political action** and **where the share comes from** in a home city (the Neutral pool first? rivals
   proportionally? capped at 100 %?). Placeholder: +0.05 % on Success, +0.025 % on Partial, reported but not applied.
5. **"Below the chance"** (§8.4): implemented as roll ≤ chance, so a shown 72 % is exactly 72 %. Confirm.
6. **Rested with fewer points than the Energy spent** (§6.3): implemented proportionally (3 Rested on a 10-Energy action →
   +15 % XP/Iron). Alternative: all-or-nothing.
7. **Per-level XP table** inside the §5.3 brackets (needed for level-ups in slice 1; `level` stays 1 until then).
8. **Text** for the Mill Gate canvass: headline + 2–3 lines for Success and for Partial (placeholders are in
   `packages/content/src/data/cities/coalport.ts`, marked `TODO(game-designer)`).
9. **Baseline opinion of Coalport** (placeholder 70 / 10 / 10 / 10 with Neutral) — only matters once Q4 is answered.
10. **Location kinds** for the art fallback ladder (§13.5): the enum in the content schema starts with 7 kinds; the slice-1
    Coalport list should settle it.

## 18. Needs the user (provisioning; not in the developer's task list)

1. **GitHub**: the repo remote with Actions enabled (CI in T1 runs there). Locally: `git config --global --add safe.directory E:/Projects/ironGateCity`.
2. **MongoDB Atlas**: a free M0 cluster, a database user, network access for Railway/Fly egress (or 0.0.0.0/0 to start);
   gives `MONGODB_URI`.
3. **Railway or Fly**: one project, two services from `apps/server/Dockerfile` (API with `/healthz`, worker), env vars from §2,
   `BETTER_AUTH_SECRET` (`openssl rand -base64 48`), `PUBLIC_ORIGIN` = the Vercel URL. Gives `<api-host>` for `vercel.json`.
4. **Vercel**: import the repo, root `apps/client`, framework Vite; preview deploys per branch. Preview URLs are different
   origins: either set `PUBLIC_ORIGIN`/`trustedOrigins` to include `https://*.vercel.app` (Better Auth supports wildcards) or
   test auth only on the production URL at first.
5. **Sentry** (optional for slice 0): two DSNs (server, client).
6. **Docker Desktop** running when using `pnpm dev` with Docker; otherwise `pnpm dev:mem`.
7. **Decision when convenient:** a custom domain (`play.` + `api.`) would let us drop the Vercel proxy later (ADR 0001, option B).

---

## Deviations (developer, slice 0 build)

Smallest working deviations from this design, found while building T0–T11. None changes a game rule; the
game-designer answers in `docs/design/slice-0-answers.md` replaced every §17 placeholder.

**Versions and libraries**

| Design said | Built with | Why |
|---|---|---|
| `mongoose ^8` (9 if current) | **mongoose 9.10**, mongodb driver **7.6** | 9 is current. `findOneAndUpdate` uses `returnDocument: 'after'` (`new: true` is deprecated in 9). Better Auth 1.7 and Agenda's Mongo backend both accept driver 7 |
| `agenda` with `new Agenda({ mongo: db })`; ADR 0005 → `@hokify/agenda` if incompatible | **agenda 6.2** + **`@agendajs/mongo-backend` 4** | Agenda 6 takes a pluggable backend: `new Agenda({ backend: new MongoBackend({ mongo: db }) })`. It accepts the driver-7 `Db`, so no ADR 0005 and no fork |
| `mongodb-memory-server ^10` | 10.4 (MongoDB **7.0.24**) | As designed. 11.x exists; not needed |
| TypeScript ^5.9, ESLint ^9, Vite ^7 | 5.9.3, 9.39, 7.3 | Kept the pinned majors although TS 7, ESLint 10 and Vite 8 are current. npm flags ESLint 9 as out of support; upgrade separately |
| Vitest latest | 5.0 | |
| `railway.toml` or `fly.toml` | `apps/server/railway.toml` | One skeleton; the worker is a second service with start command `node dist/worker.js` |
| `concurrently` for `dev:mem` | `concurrently` + **`cross-env`** | Setting env vars in an npm script must work in cmd.exe too |

**Data and API**

- **Starting character is content**, not a server constant: `content.startingCharacter` (the reference recruit,
  STR 10 / INT 12 / AGI 5 / chaBase 2, Collective), validated with Zod. Canvass preview is 66 %, not 62 %.
- **Faction cross-check relaxed:** `homeCityId` must resolve only when that city is loaded, because slice 0 ships
  Coalport alone (Duskwall and Ashford don't exist yet). When loaded, a home city and its faction must point at each
  other; and `startingCharacter`'s home city must be loaded.
- **`CharacterView.factionName`** (the faction's short display name) added, so the HUD and modal never hard-code a
  faction name in the client while naming is parked.
- **`CharacterView.energy.updatedAt`** is the projection's timestamp (the stored one advanced by whole ticks), not the
  raw stored value, so the client re-projects exactly with the same `projectEnergy`.
- **`GameErrorReason`** gains `UNKNOWN_CITY` (`city.get` NOT_FOUND). An action id that exists but not at the given
  location is `UNKNOWN_ACTION`.
- **`ResolveResult`** failure also carries the Energy projection, so the server reports `nextTickAt` without projecting
  twice. `ActionAttempt.index` is 1-based.
- **`action.perform`** get-or-creates the character (the same upsert as `character.me`) instead of requiring it to
  exist. Transactions use `readConcern: snapshot`, `writeConcern: majority`.
- **Rewards rounding** per the designer: halves up, per line; the Rested bonus is worked from the full-precision base
  (Partial + full Rested = 23 + 11 XP); a paying line pays at least 1 on a Partial. Opinion keeps 3 decimals.
- **Level table** (§5.3) is in `packages/rules` (`LEVEL_XP_THRESHOLDS`, `xpForLevel`, `levelForXp`); level-ups are
  not applied yet.

**Server**

- Env adds `HOST` (default `0.0.0.0`); `/healthz` also reads optional `APP_VERSION`, and answers **503** with
  `ok: false` when the database is down, so a platform health check fails over.
- `connectDb` retries until a **writable replica-set primary** answers (30 s in production, 5 min in development, for a
  Docker healthcheck or `db:mem` still booting) and refuses a standalone server. `autoIndex` is off; the server runs
  `ensureIndexes()` (create collections + `syncIndexes`) at start-up, since transactions need the collections to exist.
- The server **seeds at start-up whenever `NODE_ENV !== 'production'`**, not only in memory mode (the seed is
  idempotent), so `pnpm dev:mem` has Coalport's state document. Production still runs `pnpm seed` once.
- `dev:mem` uses `MONGODB_URI=mongodb://127.0.0.1:27018/irongate?directConnection=true` (no `replicaSet=rs0&`, to
  keep `&` out of a cmd.exe command line; transactions still work against the primary) and sets a dev-only
  `BETTER_AUTH_SECRET` and `PUBLIC_ORIGIN`, so it needs no `.env`.

**Client and UI**

- The client imports the router type from `@irongate/server/router` (server is a client devDependency); the client
  tsconfig includes Node types because of it.
- Vite proxies to `127.0.0.1` rather than `localhost` (Windows resolves `localhost` to IPv6 first) with
  `changeOrigin: false` and `xfwd: true`.
- Token hex values come from the design canvas rather than §10's starting points (ink `#15181A`, paper `#EFE6D2`,
  petrol `#1E4D52`, Collective oxblood `#8C2B23`, Vanguard ochre `#C39A3A`, Alliance slate `#4B7394`). **Partial amber
  is darkened** from the canvas's `#9A7420` to `#7D5E19` to reach 4.5:1 text contrast on paper.
- The opinion delta shows up to three decimals (`+0.05 %`, `+0.025 %`). One decimal, as §14.2 says for the meter,
  would show `+0.1` and `+0.0` for a single canvass. **Question for the game designer.**
- Extra shared pieces: `CheckBreakdownList` (the tap-the-percentage breakdown) and a `Button` `outline-light` variant
  for ink surfaces. The rules fixture for the UI smoke test is exported as `@irongate/rules/testing`.
- Playwright runs a phone project (Pixel 7, Chromium) against the built server on port 3101 with
  `NODE_ENV=production`, `DB_MODE=memory`.

**Build and CI**

- Turborepo `typecheck` and `test` depend on `^typecheck`, so a change in a source-consumed package invalidates its
  dependants' cache.
- `MONGOMS_DISABLE_POSTINSTALL=1` in the Dockerfile and the Vercel install command, so image and client builds don't
  download `mongod`. CI sets `MONGOMS_DOWNLOAD_DIR` explicitly (the default is `node_modules/.cache`, not
  `~/.cache/mongodb-binaries`) and caches it.

**Not verified here:** the Docker image build and the `pnpm db:up` path (Docker daemon not running), the GitHub
Actions run (no remote run), and anything needing an account (§18).
