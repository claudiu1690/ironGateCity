# ADR 0043 — The nation's day: a term calendar from a code epoch, one `nation` document, settled after every city by a job and by the first request

**Status:** accepted (slice 7, built 16 Oct 2026; as built: docs/tech/slice-7.md, Deviations) · **Date:** 2026-10-04

## Context

Slice 7 adds national events on top of the cities' five-day councils (GDD §2, §15.4–§15.6, design §2):

- a 28-day **term** with fixed windows: the Chair's names (term days 9–10), votes (11–13) and count (into 14); the national names (19–20), the party's pick (21–22), the vote (23–26), the count (into 27) and office (into 0);
- Parliament's **divisions** and **enactments**, every few days, always at a boundary;
- the daily **National Control** snapshot, which reads all five cities *after* their own boundary (the drift, morale and the capital's districts);
- the secretaries' Monday bills, the party's target, the votes on a Chair, the clerk's removal motion.

Three things must hold:

- **Never online at a set time.** Every phase is a pure function of the day key, as the council cycle is (ADR 0017).
- **The ordering.** The nation reads the cities as settled for day *d*.
- **The read path stays cheap.** Every act needs the laws in force (ADR 0044), so whatever holds them is read on every request.

The design suggests `TERM_EPOCH` "set at deploy", one document per term, and a national job after the cities (design §18 Q1, Q3).

## Decision

1. **The epoch is a code constant.** `TERM = { days: 28, epochDay: 20_458 }` in `packages/rules` (Monday 5 January 2026, the Issues' Monday epoch), so term day 0 is always a Monday.
   - `termOf(day)` is pure.
   - Rules has no configuration, and stored documents key on the term number (`nation:{n}`, `chair:{f}:{n}`, `deputy:{n}`). Moving the epoch is therefore a migration, never a deploy setting.
2. **One `nation` document** (`_id: 'republic'`) holds:
   - the calendar guard (`world.settledDay`, `bootstrappedDay`);
   - the current term and the sitting government (the President, the runner-up, the seats per party and how many are players);
   - the day's control snapshot and a 60-day log;
   - the laws-in-force projection and its 60-day history (ADR 0044);
   - the national lines of the last 14 boundaries.
   It is read once per request by `_id`. It is written by the nation's day, and by one guarded field when a removal is tabled (`government.lastRemovalDay`, the seven-day rule). Per-term records live in their own collections, keyed by the term number.
3. **`settleNationDay(content, now)`**, ADR 0017's pattern:
   - each boundary *d* in `(settledDay, today]` is one transaction, oldest first;
   - the transaction ends with `updateOne({ _id, 'world.settledDay': d − 1 }, { 'world.settledDay': d })`; a miss means another runner did it;
   - **before any boundary it calls `ensureCityDay` for every council city**, so the nation always reads cities settled for *d*;
   - the work of each term day is the pure `nationWork(d, bootstrappedDay)`.
4. **The job is primary, the request is the guarantee.**
   - The `nation-day` Agenda job (`2 0 * * *` UTC, and at worker start) runs it; the `city-day` job also calls it after the cities.
   - `ensureNationDay` in `loadCharacter` runs it lazily: one read when settled, the whole catch-up when not.
   - On a throw: Sentry, and national acts refuse `NATION_NOT_READY`.
   - **No job per bill, election or petition**: every one of them closes at a boundary.
5. **Bootstrap.** The first settle inserts the document for the current term:
   - President: the party figure of a seeded draw;
   - sixty local deputies at 20 / 20 / 20;
   - no player Chair, and the three `factions` documents (ADR 0046).
   **A window runs if it opens on or after the bootstrap day**; a window already open is skipped, and its holder continues.

## Consequences

- Every phase is computable on the client from the day key; no screen waits for a job.
- Every request pays one more indexed read. It carries the laws, the term and the government, which views need anyway.
- The first request after a missed boundary pays for every city's and the nation's catch-up. The 00:01 and 00:02 jobs normally spare it.
- The boundary transaction grows on count days (day 0: up to 61 term rows). It is measured in the integration suite. The fallback is per-step transactions with a step marker on `world`, without changing the documents.
- A deploy changes no term numbering. Choosing season 1's start date before launch is a migration of the epoch, recorded for the user.
