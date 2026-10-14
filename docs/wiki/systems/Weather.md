---
type: system
title: Weather
aliases: [Weatherproof, Weather seasons]
tags: [city, mood]
status: designed
slice: "not scheduled in slices 0–9"
gdd: ["§14.7", "§2"]
adrs: []
updated: 2026-10-14
---

# Weather

## In one paragraph

Weather gives each city a mood that changes day to day. It is rolled **per city, per City Day**
from seasonal odds, nudges the odds of some actions up or down, adds flavour, and **never blocks an
action**. It is designed in the GDD but not built, and no slice in the plan schedules it yet.

## How it works

- **Seasons:** a 12-week Political Season is four 3-week weather seasons (spring, summer, autumn,
  winter) ([[GDD#2. Time model|GDD §2]] has the calendar; [[Political Seasons]]).
- **Rolls** ([[GDD#14.7 Weather|GDD §14.7]]), headline examples:
  - Spring: rain 40 % (−10 % success outdoors without outerwear); clear 60 % (+5 % propaganda).
  - Summer: heatwave 20 % (+10 % run-in aggression; outdoor rallies +15 % influence).
  - Autumn: fog 30 % (+10 % stealth; disruption harder to trace).
  - Winter: snow 50 % (journeys +25 % time); frost 30 % (−10 % outdoors without a winter coat).
- **No Health penalties.** The right outerwear gives **Weatherproof**, which removes the penalties
  ([[Buffs]], [[Equipment and Wardrobe]]).
- GDD §8.4 caps weather at **−10 % to +10 %** on outdoor checks; tickets show it as a tag.
- Weather is meant to weight the Issue draw later ([[Issues of the Week]]) and to slow journeys in
  snow ([[Travel and Journeys]]).

## Where it lives

**Rules:** [[GDD#14.7 Weather|GDD §14.7]] · [[GDD#8.4 Checks: from stats to odds (new)|GDD §8.4]]
(the ±10 % band)

**Code:** none. The only traces are flavour: a reason line `weather: 'The rain was against you.'`
in `packages/content/src/data/copy.ts` (the check's penalty reasons, review 2), and ambient
headlines. The check input `bonuses[]` was left ready for weather in slice 1 (`docs/tech/slice-1.md`).

## Status

- **Designed, not built.** Slice 1 and slice 4 tech specs list weather as *out*; slice 8 lists
  *Weatherproof* as not built. No design doc for slices 5–9 picks it up.

## Decisions

- None recorded beyond the GDD text.

## Open questions / drift

> [!note] Inference
> Weather has no home slice. The GDD's Appendix B still lists a `weatherRotate` worker, but the
> project rule is that timers are lazy, so a roll would more likely be a seeded function of
> city + day than a job. Worth a decision on whether weather is in the MVP at all.

- The GDD's *Weatherproof* buff appears in §6.7 and §14.7 but has no item in the slice-8 wardrobe.

## Related

[[Political Seasons]] · [[Stats and Checks]] · [[Equipment and Wardrobe]] · [[Travel and Journeys]] ·
[[Issues of the Week]] · [[Time and the Game Day]]
