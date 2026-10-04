# ADR 0059 — Telemetry: a first-party event stream written after the commit, player-days as activity spans, retention computed by the report

**Status:** proposed (slice 9) · **Date:** 2026-10-04

## Context

Slice 9 has to measure GDD §27 (retention D1/D7/D30, sessions per day, the political, social, pacing and economy rows) the same way on a local playtest and in a beta (`docs/design/slice-9-launch.md` §2). The rules for it:

- the data stays first-party, in our own database, with no third party in the beta;
- telemetry never holds chat text, a name, an email, an IP or a ballot's choice;
- a **player-day** is a City Day with at least one authenticated request;
- a **session** is a run of requests with no gap of 30 minutes or more;
- **classic** and **rolling** retention are both printed, with the cohort's size and band;
- testers, boosted accounts and moderators are left out of every figure.

Every game action is atomic and idempotent (ADR 0002, 0008), and a retried tap must not count twice. Sessions in this game are a few minutes long. The plan lists "events stored in a MongoDB collection" as the analytics option.

The designer's default was: a `telemetry` collection, `playerDays` touched at most every ten minutes, and `cohorts` written by the day job.

## Decision

1. **`telemetry`**, one document per event (TTL 180 days):
   - each event carries `kind`, `at`, `day`, `userId`, `characterId`, the client's session id `sid`, a compact client descriptor, and `props`;
   - `props` is validated by a Zod schema per kind and holds only enums, numbers, booleans and ids.
2. **Written after the commit, never in a transaction.** `track()` pushes to an in-process buffer that flushes with an unordered `insertMany` every two seconds, at 100 events and on shutdown. Nothing waits for it.
3. **Natural `_id`s make it idempotent where it matters:**
   - keyed acts use `{kind}:{idempotencyKey}`;
   - world events use `{kind}:{ref}`, e.g. `election.counted:{id}` or `day.rollover:{day}`.
   A replay or a second runner (job and lazy path) inserts nothing. Other events may be lost if a process crashes, and are never duplicated.
4. **Derived events from results.** Level-ups, rank-ups, Reputation rungs and Political Capital spent are mapped from the returned result's knock-ons by one pure function, so no service has to remember them.
5. **Client events** come through a beacon-friendly Fastify route, `POST /api/telemetry`:
   - batches of 50 at most, with a schema per kind;
   - signed out, only the anonymous kinds are accepted (the sign-up funnel and client errors);
   - the client's session id ties anonymous sign-up steps to the account.
6. **`playerDays`** is keyed `{userId}:{day}` and holds **activity spans** at minute precision. A span is extended within 30 minutes, otherwise a new span opens. The request context touches it **at most once a minute per account** with one pipeline upsert, outside the request's critical path. Ten-minute resolution would make the game's typical five-minute session read as zero. Kept for good.
7. **No `cohorts` collection.** Retention, sessions and every dashboard are computed by a pure builder (`packages/db/src/metrics.ts`) over `playerDays`, `user.createdAt`, `telemetry` and the domain collections. Exclusions (testers, roles, boosted, test members) therefore apply retroactively, and no job can leave a stale row.
8. **Ballots stay secret.** `vote.cast` carries the election's kind and city, never which faction was chosen. The cross-faction share is an aggregate the report computes from `votes` by faction pair (ADR 0019).
9. **API latency** is recorded as five-minute per-procedure histograms per process (`api.timings`), not as one row per request.

## Consequences

- One stream and one builder serve `pnpm report:metrics`, the console and the dev panel, locally and in a beta.
- Retries and duplicate world runners never inflate a figure. A crash can lose a few seconds of client and untied server events, which is accepted for telemetry.
- Volume is the cost: about 150–250 events per player-day, which is millions of documents in a six-week beta of 300. That sizes the hosted cluster (M10) unless `screen.view` is sampled. It is measured in the local soak and decided at the hosting step.
- PostHog stays a later option. The event kinds map onto it directly.
