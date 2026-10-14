---
type: tech
title: Scheduled Jobs
aliases: [Agenda, Worker, Jobs (tech), city-day job]
tags: [tech, server, jobs]
status: built
slice: "3 (city-day); 4 (journey-arrive)"
gdd: ["§2.2", "§14.10"]
adrs: ["0005", "0017", "0025", "0027", "0029", "0086"]
updated: 2026-10-14
---

# Scheduled Jobs

## In one paragraph

Only **real events** are scheduled jobs: the city's day rolling over, and a train's tidy arrival.
Everything else (Energy, Heat, a release from the cells) is computed when read
([[Lazy Timers]]). Jobs run in a second process, the **worker** (`apps/server/src/worker.ts`), with
**Agenda**, which keeps its jobs in MongoDB, so there is no Redis. The game stays correct without the
worker: every request first settles any day that is due. The job only spares the first player of the
day the wait, and settles quiet cities that nobody visits.

## How it works

**The worker** (`src/worker.ts`): loads env and Sentry, `startDb()`, creates
`new Agenda({ backend: new MongoBackend({ mongo: nativeDb() }), processEvery: '30 seconds' })`,
defines `journey-arrive`, starts Agenda, then `scheduleCityDay()`. It shuts down cleanly on
SIGINT/SIGTERM. In production it is `node dist/worker.js`, a second service from the same image
(`apps/server/railway.toml` comment); locally `pnpm dev:mem` starts it, or `pnpm dev:worker`.

**Job conventions** (header of `worker.ts`): one job per real event, keyed by a natural id; every
handler is a no-op if the event's state is already resolved, so a duplicate or late run is harmless.

### `city-day` (`src/jobs/cityDay.ts`)

- Defined with `concurrency: 1`, `lockLifetime` 10 min. Scheduled with
  `agenda.every('1 0 * * *', …, { timezone: 'UTC' })` — **00:01 UTC**, a minute's margin for clock
  skew — and run once at worker start (`agenda.now`). One job document by name, so re-running the
  schedule is idempotent.
- The handler calls `runCityDay(content, now)` (`src/services/cityDay.ts`): every council city, the
  capital first. A failure in one city does not stop the others; the run then fails so Agenda logs it.
- `settleCityDay()` settles each boundary oldest first, one transaction each. Per city it can: count
  the election and the rule ballot, seat the council, put the next rule in force, set the next
  ballot's three cards (day 2), apply morale drift and the Unrest prize, draw the week's Issues on a
  Monday and credit heroes (`issuesDay.ts`), and run the capital's three-way count (`capitalDay.ts`).
  A city not yet on the rule vote converts first (`votingConversion.ts`, ADR 0086).
- **Guard**: `cities.world.settledDay`. Whoever settles a boundary first wins; a second runner gets
  `AlreadySettled` (`cityDayCore.ts`), re-reads and moves on.
- **The lazy path**: `ensureCityDay()` / `ensurePlaces()` run on every request, for every city the
  character depends on (where it stands, its residence, its job's city), *before* the character's
  own day. A failure there goes to Sentry and the request carries on with the last stored city.

### `journey-arrive` (`src/jobs/journeyArrive.ts`, `src/jobs/scheduler.ts`)

- After a boarding commits, the **API** schedules one job per journey through a non-processing
  Agenda client (`agendaJourneyScheduler`, set in `src/index.ts`): `create('journey-arrive',
  { journeyId }).unique({ 'data.journeyId' }).schedule(arrivesAt)`. Best effort: a failure changes
  nothing.
- The worker's handler calls `settleArrival()` (`src/services/journeyArrival.ts`) — the same function
  the lazy path `ensureArrived()` uses. Two conditional updates in one transaction (journey
  `onTheWay → arrived`, the character's `cityId` and pointer), so it settles once however many
  runners race. A run before `arrivesAt` does nothing. `concurrency: 5`.
- Tests inject `recordingScheduler()` or `noScheduler`.

### What is not a job (on purpose)

The character's own day (wage, paper, orders) settles on first touch
([[adr/0005-lazy-per-character-city-day|ADR 0005]]). Energy, Rested, Heat, Health, releases,
run-in deadlines and the night patrol are all computed on read.

### Planned jobs (designed, not built)

| Job | Slice | Source |
|---|---|---|
| `campaign-event-resolve` | 6 | [[tech/slice-6|tech spec slice 6]], [[adr/0037-event-resolution-world-first-credit-on-read|ADR 0037]] |
| `nation-day` | 7 | [[tech/slice-7|tech spec slice 7]], [[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]] |
| `links-refresh` (nightly) | 9 | [[tech/slice-9|tech spec slice 9]], [[adr/0061-linked-accounts-count-once-at-every-count|ADR 0061]] |
| `account-erase` (daily) | 9 | [[tech/slice-9|tech spec slice 9]], [[adr/0067-closing-an-account-retirement-and-erasure|ADR 0067]] |

## Key files

- `apps/server/src/worker.ts`
- `apps/server/src/jobs/cityDay.ts` (`scheduleCityDay`, `CITY_DAY_JOB`), `jobs/journeyArrive.ts` (`defineJourneyArrive`), `jobs/scheduler.ts`
- `apps/server/src/services/cityDay.ts` (`runCityDay`, `settleCityDay`, `ensureCityDay`, `ensurePlaces`), `capitalDay.ts`, `issuesDay.ts`, `cityDayCore.ts`, `journeyArrival.ts`
- Test seam: `POST /api/test/city-day` runs what the job does, at the test clock ([[Dev Panel and Local Setup]])

## Rules to follow

- Add a job only for a real event at a set time. If it can be computed on read, compute it.
- Make the lazy path the guarantee and the job the convenience.
- Every handler is idempotent: guard on the event's state document.
- Keep per-character accounting out of world jobs.

## Decisions (ADRs)

- [[adr/0005-lazy-per-character-city-day|ADR 0005]] — the character's day is lazy; no job in slice 1.
- [[adr/0017-city-day-boundaries-lazy-first-job-primary|ADR 0017]] — the city's day: job first, first request as backup, `settledDay` guard.
- [[adr/0025-journeys-lazy-arrival-and-a-tidy-job|ADR 0025]] — lazy arrival plus a tidy job (it settles the design/plan disagreement on arrivals).
- [[adr/0027-capital-districts-and-the-three-way-count|ADR 0027]], [[adr/0029-issues-of-the-week|ADR 0029]], [[adr/0086-converting-a-city-to-the-rule-vote|ADR 0086]] — steps inside the city day.

> [!note] Inference
> Agenda's Mongo backend stores jobs in its default collection (`agendaJobs`); the code does not
> set a name.

## Related

[[Time and the Game Day]] · [[Lazy Timers]] · [[Travel and Journeys]] ·
[[City Council and the Rule Vote]] · [[Issues of the Week]] · [[Server and API]]
