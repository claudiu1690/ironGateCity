# ADR 0079 — The six-hour game day: one night seam on the server, a night block in the views

**Status:** proposed (review 5 fix round; replaces the night window of GDD §2.2 slice 1, amends ADR 0005 for night only) · **Date:** 2026-10-08

## Context

The user decided (review 5 #11, `docs/design/review-5-answers.md` §11.3, GDD §2.2) that night is **the last two hours of every six from 00:00 UTC**: dusk at 04, 10, 16 and 22 UTC, and dawn at 00, 06, 12 and 18. The night is the same for everyone. **Every daily rule stays on the real City Day.**

Today night is `DAY_NIGHT = { 6, 20 }` and `isNight(now)` in `packages/rules/src/day.ts`. It is read in nine places:

- the server's city, nation and journey views (`isNight`);
- the art pickers in `art.ts` and `ambitionService.ts`;
- the client's journey map and the hall header (`isNight(now)` computed in the browser);
- the HUD clock's help note (`DAY_NIGHT.nightFromHour`).

Night was cosmetic until now. From this round it changes rules:

- the rival-ground run-in base;
- the night windows on missions and ways;
- the patrol stop;
- later, the Curfew Order (slice 7) and recognition (slice 8).

Night now arrives four times a day, so three things have to hold:

- a view read at 21:59 must not keep showing day art and day tickets until its next refetch;
- the client and the server must agree on what the night is;
- the e2e suite shares one test clock that only moves forward, and a third of all times are now night, so specs written when night was cosmetic would fail at random.

## Decision

1. **Rules** (`constants.ts`, `day.ts`):
   - `GAME_DAY_HOURS = 6` and `NIGHT_HOURS = 2`, aligned to `CITY_DAY.utcOffsetMs`, so the City Day's boundary is always a dawn;
   - `isNight(now)` (dusk inclusive, dawn exclusive), `nextDusk(now)`, `nextDawn(now)` (both strictly after `now`) and `nightKey(now)` (the night's index, or null by day);
   - `DAY_NIGHT` is removed.
2. **One server seam**, `apps/server/src/services/night.ts`:
   - `nightAt(now) → NightView { night, nextDusk, nextDawn, changesAt }`, where `changesAt` is the next dusk or dawn;
   - every server reader goes through it: the views, the art pickers, the run-in and mission risk at the act, the patrol roll, and later the Curfew and recognition;
   - a test-only `mode` of `'clock' | 'day' | 'night'` (module state, `nightHooks.mode`, default `clock`) overrides it. Production never sets it. It is set in four ways:
     - over HTTP, only under `E2E_TEST_HOOKS`, by the env var `E2E_NIGHT` at start-up or by `POST /api/test/night`;
     - Playwright's server runs with `E2E_NIGHT=day`, and night specs switch the mode and restore it;
     - the server's Vitest setup pins `day`, so the slice 1–5 server tests, whose clocks start at 09:00 UTC and cross 10:00, keep their meaning, and review-5 night tests opt into `clock` with a seeded night time;
     - `pnpm dev:mem` stays on the clock, so the user's playtest sees real nights.
3. **The views carry the block.** `CityView.night`, `NationView.night`, `JourneyView.night`, `TownHallView.night` and `HallView.night` (the election and council screens' hall header) all carry it. `isNight` stays on the city and nation views for first paint.
   - The client stops calling `isNight` itself.
   - It schedules one refetch of the view at `changesAt` plus 0–20 s of jitter, so a city's art, tickets and plate turn at dusk without a reload and without every client reading at the same instant.
   - The plate's *Dusk in 40 min* / *Night · dawn at 18:00* ticks from `nextDusk` / `nextDawn` with `useNow`.
4. **Night is read at the act's time**, from the act's `now`. A ticket shows what the server will apply at the moment it is read. The act decides with its own `now`, as every other rule does.

## Consequences

- There is no job and no migration. The City Day, the orders, the wage, the councils, the Issues, terms and seasons are untouched, and their tests pass unchanged.
- One more view field and one timer per page. The thundering herd at dusk is spread over 20 s.
- The e2e suite is deterministic again: day unless a spec asks. One server test per night rule runs on the real clock functions.
- The tiles spec's night case moves from a clock jump to the override.
- Slice 7's Curfew and slice 8's recognition read `nightAt` at the act. Their tests' times move: 22:00 is night and 21:59 is not, where they used 20:00 and 19:59.
- Slice 9's *Map at night* setting (`settings.night: 'clock' | 'day'`) applies on top of the block, to the art only. It never changes a rule.
- Rejected: the client computing `isNight(now)` locally. It would disagree with the override, and with the server's view of the tickets, for up to a refetch.
- Rejected: a per-player night. A shared town has one sky (GDD Appendix C #100).
