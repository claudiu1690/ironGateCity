# ADR 0017 — The city's day: world boundaries are settled per city, before any character settles, by an Agenda job or the first request

**Status:** accepted, implemented (slice 3; extends ADR 0005) · **Date:** 2026-09-29

## Context

Slice 3 brings the first world events. At each City Day boundary a home city may:

- **count** an election (into cycle day 0);
- **close** nominations (into day 2);
- **divide** the council on its ordinance (into day 2);
- apply the morale **drift** (every day);
- **open** the next election and order paper (into day 0).

These are shared by every resident, unlike the per-character settlement of ADR 0005, and some must be exact.

- A ballot cast at 23:59:59 must be counted or refused. It must never be stored and left out of the count.
- A Success scored after midnight must not raise a ward vote counted "at" midnight.
- Being away costs nothing (CLAUDE.md rule 4). The count runs whether or not anyone is online, and the design never asks a player to be present at a set time.

The design (`docs/design/slice-3-politics.md` §15 Q1) asks for an Agenda job at 00:00 UTC, perhaps with a lazy count on first touch.

Options:

- **A job only.** If the worker is down or late, everything waits. A player who opens the paper at 00:00:30 sees yesterday. A resident can act on the new day before the count, which corrupts the ward vote and morale order.
- **Lazy only.** Every boundary is processed by the first request that needs the city. The result is exact, but a city nobody touches is never counted, and the first player of the day pays for the count.
- **Both, over one idempotent function.**

## Decision

1. **One function, per city and per boundary.** `settleCityDay(content, cityId, now)` processes every boundary since `cities.world.settledDay`, oldest first. Each boundary `d` runs in its own transaction, in this order: drift; then, by `cycleDay(d)`, the count, the seating and the next election and order paper (day 0), or the nominations close and the division (day 2). The transaction ends with `cities.updateOne({ _id, 'world.settledDay': d − 1 }, { $set: { 'world.settledDay': d, … } })`. A miss means another runner settled `d` first: abort and re-read. Every derived document has a natural unique key (`elections._id = city:cycle`, `ordinances._id = city:cycle`, `officeTerms {councilKey, seat}`), so a second run cannot duplicate one. The decisions (who is struck, the ballot, the count, the division, the drift) are pure functions in `packages/rules`.
2. **The ordering invariant.** `ensureSettled` (every character settlement, including the join's first day) first calls `ensureCityDay(homeCityId, now)`. This is one read by `_id` when the city is already settled. So **no character acts on day d before its home city has been settled for d.** Every action transaction already refuses a character whose `day.settled` is not today (`DayChanged`, ADR 0005). Therefore no post-boundary Success, ballot or opinion swing can reach a count or a drift of an earlier boundary.
3. **The Agenda job is primary, and the request path is the guarantee.**
   - The worker defines `city-day`, which runs `settleCityDay` for every city that has a council.
   - It is scheduled with `agenda.every('1 0 * * *', 'city-day', undefined, { timezone: 'UTC' })` and also run once at worker start. Agenda also runs an overdue job when it comes back.
   - The one-minute margin keeps a worker whose clock runs fast from counting early.
   - The job does the work for quiet cities and spares the first player of the day the wait. The request path makes sure no request ever sees a stale city, whether the worker is down, late, or has not reached the city yet.
4. **Bootstrap.** A city with no `world` field is bootstrapped at `dayKey(now)` on its first `settleCityDay`: a sitting NPC council (top seven of the slate), its order paper with the branch's motion, the branch's motion in force, and the current election in the phase of the day. This happens on the worker's start after a deploy, or on the first request. `seed()` does not bootstrap, because tests run on a test clock.
5. **Degrade, don't block.** If `ensureCityDay` throws in a request (a bug, not a conflict), the error goes to Sentry and the character settlement goes ahead. The Polling Day row, the count and the chamber are live views (ADR 0023), so they catch up when the job succeeds. Political writes that need the day's documents refuse with `ELECTION_NOT_READY` until then.
6. **Time in tests.**
   - Server tests call `runCityDay(content, clock.now())` directly, or let a procedure settle the city lazily.
   - The e2e server gains `POST /api/test/city-day`, which runs the job at the test clock, and `advanceTo` on the existing clock hook. These exist only with `E2E_TEST_HOOKS` (memory mode only).
   - Agenda itself always uses the real clock.

## Consequences

- A count runs exactly once per city per cycle, whichever runner gets there first, and runs correctly after any downtime. A city idle for n days is caught up in n short transactions.
- Every request pays one indexed read for its home city. That read also returns the day-constant state the views need (the ordinance in force, morale, the sitting council), so nothing is read twice.
- The worker is now a real service. Provisioning needs the second process (slice-0 design §12).
- Midnight transactions on a city document conflict with actions in flight. Those actions retry, find the new day and resettle (ADR 0005). This is the intended order.
- The worker and the API must share a sane clock (NTP). A skew of seconds only moves which side of midnight a last-second ballot falls on. It can never lose a stored ballot (ADR 0018).
