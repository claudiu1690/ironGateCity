---
type: tech
title: Database and Models
aliases: [packages/db, Database, Models, MongoDB, Mongoose]
tags: [tech, db]
status: built
slice: "0; collections added in slices 1–5, migrations to the voting rework (009)"
gdd: []
adrs: ["0002", "0003", "0004", "0005", "0008", "0009", "0016", "0020", "0025", "0028", "0032", "0033"]
updated: 2026-10-14
---

# Database and Models

## In one paragraph

`packages/db` (`@irongate/db`) owns the MongoDB connection, the Mongoose models, their indexes, the
start-up migrations, the seed and the read-only playtest reports. MongoDB must run as a **replica
set**, because every game action is a multi-document transaction. The rule for shape is *embed what's
read together, reference what grows*: one `characters` document holds everything a session reads;
anything that grows without limit (logs, votes, the ledger) has its own collection.

## How it works

**Connection** (`src/connect.ts`): `connectDb(uri)` sets `autoIndex: false`, then waits (retrying)
until the server answers `hello` as a writable replica-set primary; a non-replica set fails at once.
`nativeDb()` gives the raw driver DB to Better Auth and Agenda. `isDuplicateKeyError()` spots E11000.

**Indexes and migrations** (`src/indexes.ts`, `ensureIndexes()`): for every model, `createCollection()`
then `syncIndexes()` (collections must exist before a transaction touches them), then migrations
001 → 009 in order. Each migration is idempotent (it filters on the old shape), so it runs at every
start. The server logs the counts of 008 and 009.

| Migration | What it does |
|---|---|
| `001-slice1-character-fields` | Slice-0 characters get slice-1 fields |
| `002-slice2-arrival` | Arrival fields; Coalport job ids renamed ([[adr/0016-slice-0-1-characters-migrate-in-place|ADR 0016]]) |
| `003-slice3-politics` | `offices`, `endorsementsGiven` on characters |
| `004-review1-wage` | Jobs become a wage (seniority); retired order templates |
| `005-review2-street-ordinances` | Ward Register / Ward Fund renamed to Street |
| `006-slice4-travel-residence` | Residence, journeys, election and term places |
| `007-slice5-risk` | Heat, Health, record, run-in state |
| `008-review4` | Review-4 steps (old drafts reset, `card.at`, the `held_cells_now` index…) |
| `009-voting-rework` | Deposits still due are refunded once |

**Seed** (`src/seed.ts`, `seed(content)`): one `cities` state document per content city with its
baseline opinion, `$setOnInsert` only, so it never changes live state. The server seeds itself
outside production; production would run `pnpm seed` once.

### Models

**Embedded** (inside `characters`, one read per session): name, faction, home and current city,
avatar, `stats`, `energy {value, updatedAt}`, `rested`, XP / level / FXP / rank / PC / Iron,
`statPointsPending`, `localStanding[]`, `job`, `day.settled`, `orders`, `today` (tally), `origin`,
`ambition`, `inventory[]`, `equipment`, `offices[]`, `endorsementsGiven[]`, `residence`, `journey`
(a pointer), `room`, `heat {value, at}`, `health {damage, at}`, `record`, `held`, `runIn` (pointer),
`ways[]`, `flags`, `barred`, `hostileDeck`, `firsts`, `patrol`, and `version` (the optimistic lock).

**Referenced** (own collections, they grow):

| Model (file) | Collection | Holds | Key indexes |
|---|---|---|---|
| `Character` (`character.ts`) | `characters` | The player's character | unique `userId`; residents (`residence.*`, faction, rank, `lastActionAt`); partial `journey.status: onTheWay`; partial `held_cells_now` |
| `City` (`city.ts`) | `cities` | Live city state: opinion, morale record, ordinance (rule) in force, Issues, rival pressure, Unrest prize, `world.settledDay` | `_id` = city id |
| `District` (`district.ts`) | `districts` | A capital district's meter, close race, comeback | `cityId` |
| `ActionLog` (`actionLog.ts`) | `actionLogs` | One row per action: key, seed, full result | unique `{characterId, idempotencyKey}` |
| `RequestLog` (`requestLog.ts`) | `requestLogs` | Results of keyed non-action mutations | unique `{characterId, idempotencyKey}`; TTL 7 days |
| `PaperEntry` (`paperEntry.ts`) | `paperEntries` | One edition per character per day | unique `{characterId, day}` |
| `Arrival` (`arrival.ts`) | `arrivals` | The opening's draft before a character exists | unique `userId` |
| `Election`, `Candidacy`, `Vote`, `OfficeTerm`, `RuleBallot` (`politics.ts`) | `elections`, `candidacies`, `votes`, `officeTerms`, `ordinances` | Councils and the rule vote | unique `{electionId, characterId}`, `{electionId, voterId}`, `{councilKey, seat, fromDay}`; `{cityId, countDay}` |
| `Journey` (`journey.ts`) | `journeys` | Train journeys and their card | unique `{characterId, n}`; `{status, arrivesAt}` |
| `InfluenceLedger`, `Contribution`, `Award` (`ledger.ts`) | `influenceLedger`, `contributions`, `awards` | Who moved opinion; totals; hero and Unrest awards | `{placeId, cycleKey}`; `{scope, amount, lastAt}`; unique `{kind, ref, characterId}` |
| `IssueModel` (`issue.ts`) | `issues` | A week's Issue and its result | `{cityId, weekDay}` |
| `Encounter` (`encounter.ts`) | `encounters` | Run-ins, pending or resolved | unique `{characterId, idempotencyKey}`; partial pending by `decideBy` |
| `Stay` (`stay.ts`) | `stays` | Cells and infirmary history | `{characterId, since}` |

Better Auth adds its own `user`, `session`, `account` and `verification` collections in the same
database ([[Auth and Accounts]]). Agenda adds its jobs collection ([[Scheduled Jobs]]).

**Reports** (read-only, pure maths over rows; run by `pnpm report:playtest`):
`src/report.ts` (slice 1: sessions, returns, ×3, paper, orders), `src/funnel.ts` (slice 2: the
arrival funnel), `src/elections.ts` (slice 3 and the voting rework's council section),
`src/battleground.ts` (slice 4), `src/risk.ts` (slice 5), `src/review4Report.ts` (review 4).
`src/boost.ts` is the operator script behind `pnpm admin:boost`. Scripts are in `packages/db/scripts/`.

**Testing helper** (`src/testing/memoryReplSet.ts`, `@irongate/db/testing`): `startMemoryReplSet()`
starts a one-node in-memory replica set with `mongodb-memory-server`; `withDbName()` gives each test
file its own database. Used by Vitest global setups, `DB_MODE=memory` and `pnpm db:mem`
([[adr/0004-in-memory-replica-set-for-tests-and-dev|ADR 0004]]).

## Key files

- `packages/db/src/index.ts`, `connect.ts`, `indexes.ts`, `seed.ts`
- `packages/db/src/models/*.ts`, `src/migrations/*.ts`
- `packages/db/scripts/` — `memMongo.ts`, `seed.ts`, `playtestReport.ts`, `boostPlaytest.ts`, `migration008Check.ts`

## Rules to follow

- New field read every session → embed it in `characters`. Grows without limit → its own collection.
- Every new collection goes in `models` in `indexes.ts` (so it exists before transactions).
- A schema change ships with an idempotent migration run from `ensureIndexes()`.
- Writes to `characters` bump `version` and filter on it ([[Atomic Actions and Idempotency]]).
- Reports never read `requestLogs` for long-term numbers (7-day TTL) and never pair a voter with a choice.

## Decisions (ADRs)

[[adr/0003-city-documents-hold-state-not-content|0003]] city state only ·
[[adr/0005-lazy-per-character-city-day|0005]] `paperEntries` per day ·
[[adr/0008-idempotency-for-non-action-mutations|0008]] `requestLogs` ·
[[adr/0009-party-orders-computed-progress-embedded|0009]] orders computed, progress embedded ·
[[adr/0020-council-records-collections-and-projections|0020]] council collections ·
[[adr/0025-journeys-lazy-arrival-and-a-tidy-job|0025]] journeys ·
[[adr/0028-influence-ledger-contributions-and-awards|0028]] ledger ·
[[adr/0032-run-ins-pending-step-and-luck|0032]], [[adr/0033-heat-health-record-held-lazy|0033]] risk state.

> [!warning] Drift
> Plan §5 lists collections the code never made: `directives` (orders are computed and embedded,
> ADR 0009) and `items` (a content catalogue, ADR 0014); and `cities (locations embedded)`
> (ADR 0003 keeps places in content). The rule ballot model is `RuleBallot` but its collection is
> still named `ordinances` (by design, voting rework).

## Related

[[Architecture Overview]] · [[Atomic Actions and Idempotency]] · [[Lazy Timers]] ·
[[Scheduled Jobs]] · [[Dev Panel and Local Setup]]
