# ADR 0005 — The City Day is settled lazily, per character, on first touch

**Status:** accepted (slice 1) · **Date:** 2026-09-29

## Context

Slice 1 needs "a day" for five things: the job's daily half salary, the work streak and sick days,
the Party Directives, the Morning Paper and the "Today" tally. The world's City Day events
(elections, weather, Issues) are scheduled events and belong to slice 3 onward.

GDD §2.2 (pinned in the slice-1 design): the City Day boundary is **00:00 UTC** for the MVP, and every
daily rule is stated **per boundary crossed**, so it can be settled lazily. §9.1: at every boundary the
job held at that moment pays 50 % of daily pay automatically ("a week away banks seven half-pays");
sick days refill to 2 at the Monday boundary. CLAUDE.md: being away costs opportunity, never assets;
nothing requires being online at a set time.

Two ways to do per-character daily accounting:

- **A midnight Agenda job** that walks every character: pays salaries, advances streaks, writes a
  paper for everyone. Work grows with *all* characters, active or not; a failed or late run leaves a
  population half-settled; it creates documents for players who never come back.
- **Lazy settlement:** each character stores the last City Day it was settled for; the first request
  on a new day settles everything since, in one transaction. Work grows with *active* characters
  only, and a missed midnight cannot exist.

## Decision

1. **Day key.** `dayKey(now) = floor((now + CITY_DAY.utcOffsetMs) / 86_400_000)`, an integer (days
   since 1970-01-01 in game time), `utcOffsetMs = 0`. Weeks start on Monday (`weekKey`). Both in
   `packages/rules/src/day.ts`, so server and client agree. Content that counts days from its own
   epoch (the Directive rotation counts from 2026-01-01) derives it from the same key.
2. **Stored state.** `characters.day.settled: DayKey | null` — the last day whose boundary has been
   applied. New characters start with `null` (their first touch creates their first edition).
3. **Settle on first touch.** Every character-scoped procedure (queries included) calls
   `ensureSettled(characterId, now)`. If `day.settled === today` it returns without writing.
   Otherwise one transaction:
   - computes `settleDays(...)` in `packages/rules` (pure): half salary for **every boundary** crossed
     since `day.settled` (accrued, credited, reported on the desk — no claim tap), missed shifts spend
     sick days week by week or end the streak, the Today tally closes into "last played", and today's
     tally and today's Party orders start fresh (orders are computed from content and the day number,
     so only their progress is stored);
   - updates the character with a version guard and `day.settled: prev` in the filter;
   - inserts today's `paperEntries` document (unique on `{ characterId, day }`); its content is a pure
     function of the character, the settlement and the day, so a retry produces the same edition.
4. **Mutations check the day.** Inside every action transaction, if `dayKey(now) !== c.day.settled`
   the transaction aborts with an internal `DAY_CHANGED`; the caller runs `ensureSettled` again and
   retries (bounded). A tap at 23:59:59.9 that commits at 00:00:00.1 counts on the new day, after the
   new day was settled.
5. **No Agenda job** in slice 1. The worker stays a stub. Later world-level day jobs never touch
   per-character accounting.

## Consequences

- A query can write, at most once per character per day. This is state catch-up (like projecting
  Energy), idempotent and safe to run from a GET; concurrent first requests on a new day are resolved
  by the version guard and the unique index (one paper, one salary).
- Nothing is lost by being away, and a player who never returns never gets documents created.
- Changing `utcOffsetMs` later shifts every day key by up to one day. Do it only with a one-off
  migration (ideally at a UTC midnight): a day key that moves backwards could reopen a worked shift.
- Day and night on the map use the same clock (`isNight(now)`, 20:00–06:00 UTC, GDD §2.2).
