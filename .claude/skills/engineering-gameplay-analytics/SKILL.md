---
name: engineering-gameplay-analytics
description: >-
  Use when tracking player events, implementing retention analytics, building engagement funnels, measuring D1/D7/D30 retention, or setting up gameplay telemetry. Triggers: analytics, telemetry, events, retention, D1 D7 D30, funnel, engagement, session tracking, player behavior.
---

# Gameplay Analytics (Irongate City: MongoDB + Mongoose, no Redis)

> **Adapted for Irongate City (10 Oct 2026).** The upstream skill (fcsouza/agent-skills) assumed PostgreSQL + Drizzle + Redis. This copy is rewritten for the project's stack and decisions: **MongoDB (replica set) + Mongoose**, **no Redis**, **Fastify + tRPC**, telemetry kept **first-party in our own database**.
>
> The project's source of truth is **ADR 0059** (`docs/adr/0059-telemetry-first-party-events-and-player-days.md`) and `docs/design/slice-9-launch.md` §2. Where this skill and those documents differ, follow them.

## Purpose

Track player events, measure retention (D1/D7/D30, classic and rolling), sessions, funnels and the GDD §27 metrics. Store them in MongoDB next to the game, with no third party and no extra infrastructure.

## When to Use

Trigger: analytics, telemetry, player events, retention, D1/D7/D30, funnel analysis, engagement metrics, session tracking, DAU/MAU, cohort analysis, A/B tags, the `pnpm report:metrics` report, the dev panel's metrics.

## Prerequisites

- `packages/db`: the Mongoose connection and models live there. Add the telemetry models next to them (see `boilerplate/analytics-schema.ts`).
- The request context in `apps/server`: authenticated `userId` / `characterId`, the client session id `sid` (sent by the client), the City Day key.
- **No new dependencies.** Mongoose is already in the stack. Never add Redis, Kafka or a hosted analytics SDK without an ADR.

## Core Principles

1. **Use `noun.verb` kinds in a closed catalogue.** Examples: `action.tap`, `mission.run`, `vote.cast`, `journey.boarded`, `signup.form`. Each kind has a **Zod schema for its `props`**, holding only enums, numbers, booleans and ids. An unknown kind or invalid props is logged and dropped, never stored. See `templates/event-catalog.md`.

2. **Every event carries the same envelope:**
   - `kind`, `at` (Date);
   - `day` (the City Day key);
   - `userId`, `characterId`;
   - `sid` (the client's session id);
   - `client` (a compact descriptor: platform, build);
   - `props`.

   The server fills the envelope; the client never chooses `userId`.

3. **Write after the commit, never inside the game transaction.** `track()` pushes to an **in-process buffer**. The buffer flushes with an unordered `insertMany` every 2 s, at 100 events, and on shutdown. Nothing awaits it, and a failed flush is logged and dropped. Telemetry is observability, never game logic (CLAUDE.md engineering rule 2 stays about game state only). No Redis: one Node process with a small buffer is enough at our scale (ADR 0059).

4. **Make events idempotent with natural `_id`s.** A retried tap must not count twice (every game action is keyed and idempotent, ADR 0002/0008):
   - keyed acts use `_id = "{kind}:{idempotencyKey}"`;
   - world events use `_id = "{kind}:{ref}"`, e.g. `election.counted:{electionId}` or `day.rollover:{day}`.

   A duplicate insert fails with E11000 inside the unordered `insertMany`, which is ignored on purpose. Other events get a generated id; a crash may lose a few seconds of them, but never duplicates them.

5. **Derive events from results, not from memory.** Level-ups, rank-ups, Reputation rungs and Political Capital spent are mapped from the returned result's knock-ons by **one pure function**, so no service has to remember to emit them.

6. **Activity is `playerDays` spans, not heartbeats.**
   - A **player-day** is a City Day with at least one authenticated request; a **session** is a run of requests with no gap of 30 minutes or more.
   - `playerDays` is keyed `{userId}:{day}`, and its `spans[]` hold `[start, end]` pairs at minute precision. A span is extended if the last one ended within 30 minutes; otherwise a new span opens.
   - The request context touches it **at most once a minute per account** with one upsert, outside the request's critical path.
   - No session heartbeat events: short sessions (a few minutes) would read as zero at coarser resolution.

7. **Compute cohorts, don't store them.** There is no `cohorts` collection. Retention, sessions and every dashboard come from a **pure builder** (`packages/db/src/metrics.ts`) over `playerDays`, `user.createdAt`, `telemetry` and the domain collections. Exclusions (testers, moderators, boosted and test accounts) then apply retroactively, and no job can leave a stale row. Print **classic** (exactly day N) and **rolling** (day N or later) retention, with the cohort's size and band.

8. **Privacy is a hard rule:**
   - never put chat text, names, emails, IPs, or a ballot's choice in telemetry;
   - `vote.cast` carries the election kind and city only. The cross-faction share is an aggregate computed from `votes` (ADR 0019);
   - the client's anonymous kinds (the sign-up funnel, client errors) are the only ones accepted signed out.

9. **Plan the volume.**
   - Expect about 150–250 events per player-day.
   - `telemetry` has a **TTL index of 180 days** on `at`; `playerDays` is kept indefinitely.
   - Sample `screen.view` before anything else if the hosted cluster struggles; never sample keyed game acts.
   - API latency is recorded as 5-minute per-procedure histograms (`api.timings`), not one row per request.

10. **Use A/B tags on events, not forks.** If an experiment ever runs, tag events with `experiment` and `variant` in `props` and group by them in the builder. Never fork the server-authoritative rules for an experiment without a GDD change.

## Step-by-Step Instructions

### 1. Models

Copy `boilerplate/analytics-schema.ts` into `packages/db/src/models/`. It gives two models:
- `Telemetry`: one document per event, with a TTL of 180 days and indexes for kind/day and user/day;
- `PlayerDay`: `{userId}:{day}` with `spans[]`.

Register the indexes in `ensureIndexes` with the rest; migrations follow the existing `packages/db/src/migrations` pattern.

### 2. The buffer and `track()`

Copy `boilerplate/analytics-client.ts` into `apps/server/src/services/telemetry.ts`. Start it once at server start:
- `telemetry.start()`;
- `telemetry.stop()` on shutdown, which flushes.

Call `track()` **after** a game transaction commits:

```ts
// in a keyed action service, after the transaction resolved
telemetry.track({
  kind: 'action.tap',
  ctx,                         // request context: userId, characterId, sid, day, client
  key: input.idempotencyKey,   // makes _id = "action.tap:{key}"
  props: { actionType: 'canvass', count: 1, energy: 10, outcome: 'success', oddsBand: 'good', rested: true },
});
```

World events (the day job, counts) pass `ref` instead of `key`, e.g. `{ kind: 'election.counted', ref: election._id }`.

### 3. Activity spans

In the request context hook (Fastify `onRequest` for authenticated tRPC calls), call `telemetry.touch(ctx)`. It upserts `playerDays` at most once a minute per user and never blocks the request.

### 4. Client events

Add `POST /api/telemetry` (a plain Fastify route, beacon-friendly) that accepts batches of 50 or fewer, validates each against its kind's Zod schema, and fills the envelope server-side. Signed out, it accepts only the anonymous kinds.

### 5. The report

Build the dashboards as **pure functions** over aggregation results in `packages/db/src/metrics.ts`, and print them with `pnpm report:metrics` (and the dev panel). The pipelines are in `templates/retention-dashboard.md`.

## Code Examples

### Ignoring duplicate inserts (natural `_id`s)

```ts
try {
  await Telemetry.insertMany(batch, { ordered: false });
} catch (err) {
  // E11000 = a replayed keyed act or a second world runner: expected, ignore.
  // Anything else: log and drop. Telemetry never throws into game code.
  if (!isOnlyDuplicateKeyErrors(err)) log.warn({ err }, 'telemetry flush failed');
}
```

### Per-kind props validation

```ts
const PROPS = {
  'vote.cast': z.object({ electionKind: z.enum(['council', 'capital', 'chair', 'national']), cityId: z.string() }),
  'mission.run': z.object({ missionId: z.string(), type: z.string(), way: z.string(), outcome: z.enum(['success', 'partial', 'failure']), runIn: z.boolean(), caught: z.boolean() }),
} as const;
```

## Testing

Follow the repo's current testing rules (`.claude/agents/developer.md`). As of 8 Oct 2026 there are **no new unit tests**, so verify through Playwright and `pnpm report:metrics` on a local playtest. The builder's figures are pure functions, so they're easy to unit-test once unit tests return.

## Pitfalls & Anti-Patterns

- **Writing telemetry inside the game transaction.** A telemetry failure must never abort or slow a game action. Write only after the commit.
- **Counting retries twice.** Always pass the idempotency key for keyed acts. A generated `_id` on a keyed act inflates every figure built from it.
- **Storing derived tables.** A `cohorts` collection goes stale and can't apply new exclusions. Compute from `playerDays`.
- **Confusing DAU with retention.** D1 is "of the cohort created on day X, the share active on day X+1", not "players active yesterday".
- **Heartbeat sessions.** Infer sessions from `playerDays` spans with a 30-minute gap rule, not from client heartbeats.
- **PII creep.** Any free text or name in `props` is a bug; the Zod schemas should make it impossible.
- **Adding Redis "for buffering".** Not needed at this scale and not in the stack. The in-process buffer plus `insertMany` is the decision (ADR 0059).
- **Hard-coding funnels.** Keep funnel definitions as data (a list of kinds and filters) beside the builder.

## Cross-References

- ADR 0059 (telemetry), ADR 0019 (ballot secrecy), ADR 0002/0008 (keyed, idempotent actions)
- `docs/design/slice-9-launch.md` §2 (the event list, the dashboards, the §27 mapping)
- GDD §27 (the metrics and the gates)
- `design-game-economy-design` (the economy rows the dashboards measure)

## Designer Philosophy

**Will Wright** (SimCity, The Sims): analytics closes the gap between what you designed and what players experience. In The Sims, behaviour data showed players spending far more time decorating than managing relationships, and that reshaped the expansions.

**Raph Koster** (Ultima Online, Star Wars Galaxies): the most important design discoveries come from patterns you weren't looking for, so every meaningful player action should produce a queryable event.

**Amy Jo Kim** (community design): engagement isn't maximising time in game. A high D1 with a collapsing D30 is an onboarding cliff, not a content problem. Analytics should show where meaning breaks down, not only where players leave.

## Sources

- [MongoDB TTL indexes](https://www.mongodb.com/docs/manual/core/index-ttl/)
- [MongoDB insertMany (unordered, duplicate keys)](https://www.mongodb.com/docs/manual/reference/method/db.collection.insertMany/)
- [MongoDB aggregation pipeline](https://www.mongodb.com/docs/manual/aggregation/)
- [Mongoose models and indexes](https://mongoosejs.com/docs/guide.html)
- [GDC Vault: player metrics in game development](https://gdcvault.com)
