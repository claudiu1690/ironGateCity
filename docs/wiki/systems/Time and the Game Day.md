---
type: system
title: Time and the Game Day
aliases: [City Day, Game Day, Day and Night, Night, Clock, Time Model]
tags: [time, core]
status: partly built
slice: "1 (City Day, lazy); 3 (the city's day job); review 5 (six-hour game day)"
gdd: ["§2", "§2.1", "§2.2"]
adrs: ["0005", "0017", "0079"]
updated: 2026-10-16
---

# Time and the Game Day

## In one paragraph

Every system runs on one clock: real time. The **City Day** is a real day, 00:00–24:00 UTC, and
every daily rule (the wage, the orders, the paper, the tally) turns at that boundary. Inside it, the
town has its own **six-hour game day**: dusk comes four times a real day and the streets are dark
for two hours each time. The calendar stays on real days so a player can keep a daily rhythm
without watching a clock; the night moves faster so everyone sees both day and night, at the same
instant, whatever their time zone.

## How it works

- **The units** ([[GDD#2. Time model|GDD §2]]): a 10-minute tick (Energy and Health regen) · the
  City Day (00:00 UTC) · the week from Monday ([[Issues of the Week]]) · the 5-day council cycle,
  staggered one day per city ([[City Council and the Rule Vote]]) · the 28-day term · the 84-day
  [[Political Seasons|Political Season]] (one in-game year) · the 21-day weather season ([[Weather]]).
- **The boundary is 00:00 UTC** for the MVP (Appendix C #1, closed). Every daily rule is written
  *per boundary crossed*, so it can be settled lazily on the next read
  ([[GDD#2.2 Day and night (new)|GDD §2.2]]).
- **Night is the last two hours of every six** from 00:00 UTC: dusk at 04, 10, 16 and 22 UTC,
  dawn at 00, 06, 12 and 18. Eight hours of dark a day in four windows, the same for everyone
  (review 5, decided 8 Oct 2026). This replaced the old 20:00–06:00 UTC night everywhere.
- **What night changes:** the map's night art and clouds; night-only missions and ways
  ([[Missions]], *Opens at nightfall*); the night run-in and patrol stop on rival ground
  ([[Night and Patrols]], [[Hostile Ground]]). Later: the Curfew Order (slice 7) and recognition
  at night (slice 8). Night content is always *extra*; nothing a Level needs waits for the dark.
- **The clock on screen** shows the player's own local time. The plate prints *Dusk in 40 min* /
  *Night · dawn at 18:00*. Every countdown is written one way: *in {n} min* · *at {hh:mm}* ·
  *tomorrow {hh:mm}* · *{Weekday}*; a boundary always prints its time.
- **A season at a glance** ([[GDD#2.1 A season at a glance|GDD §2.1]]): three national elections on
  days 28, 56 and 84; the third is the Season Election, then rollover. See [[Political Seasons]].

## Where it lives

**Rules:** [[GDD#2. Time model|GDD §2]] · [[GDD#2.2 Day and night (new)|GDD §2.2]] ·
[[design/review-5-answers|review 5 answers §11]] (the three options) ·
[[design/review-4-answers|review 4 answers §4]] (the clock strings) ·
[[adr/0005-lazy-per-character-city-day|ADR 0005]] ·
[[adr/0017-city-day-boundaries-lazy-first-job-primary|ADR 0017]] ·
[[adr/0079-the-six-hour-game-day-one-night-seam-and-a-night-block-in-the-views|ADR 0079]] ·
[[tech/review-5|tech spec, review 5]]

**Code:**
- Rules: `packages/rules/src/day.ts` (`dayKey`, `weekKey`, `isNight`, `nextDusk`, `nextDawn`,
  `nightKey`) · `packages/rules/src/constants.ts` (`CITY_DAY`, `GAME_DAY_HOURS = 6`,
  `NIGHT_HOURS = 2`) · `packages/rules/src/calendar.ts` (council cycle) · `packages/rules/src/week.ts`
- Server: `apps/server/src/services/night.ts` (`nightAt`, the one night seam) ·
  `apps/server/src/services/dayService.ts` (per-character settlement) ·
  `apps/server/src/services/cityDay.ts`, `cityDayCore.ts` (per-city boundary work) ·
  job `apps/server/src/jobs/cityDay.ts` (Agenda, 00:01 UTC)
- Data: `characters.day.settled`, `cities.world.settledDay` (`packages/db/src/models/character.ts`,
  `city.ts`)
- Client: `apps/client/src/components/DuskLine.tsx` (the plate's dusk/dawn line); views carry a
  `night` block and refetch at `changesAt`

## Status

- **Built:** the lazy City Day per character (slice 1, [[adr/0005-lazy-per-character-city-day|ADR 0005]]);
  the city's boundary work by job *and* first request (slice 3,
  [[adr/0017-city-day-boundaries-lazy-first-job-primary|ADR 0017]]); the six-hour game day and its
  night rules (review 5 fix round, 8–10 Oct 2026).
- **Designed, not built:** the 28-day term calendar (slice 7, ADR 0043) and the season calendar
  (was slice 8, ADR 0058; **deferred 16 Oct 2026**). See [[Slice 7 The Nation]], [[Slice 8 A Life in the City]].

## Decisions

- 29 Sep 2026: boundary at 00:00 UTC (Appendix C #1).
- 8 Oct 2026, [[Review 5]]: option B, the six-hour game day; every daily rule stays on the real day.
  The lever if four nights a day feels busy is an eight-hour day with a three-hour night, never a
  per-player night or a shorter City Day (Appendix C #100).
- 14 Oct 2026 (drift cleanup): GDD §2's units table says Heat cools **continuously** (5 an hour,
  not on the tick) and the City Day row says a city "votes on its rule"; §3.2's pending example has
  no clock time; [[adr/0005-lazy-per-character-city-day|ADR 0005]] amended (the wage; ADR 0079's
  night).

## Open questions / drift

- None open in the sources.

## Related

[[Session Loop]] · [[The Morning Paper]] · [[Political Seasons]] · [[Night and Patrols]] ·
[[Lazy Timers]] · [[Scheduled Jobs]] · [[Weather]]
