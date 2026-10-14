---
type: entity
title: Clearwater
aliases: [clearwater, the swing city, the lake town]
tags: [city, battleground]
status: designed
slice: "7 (designed, not built)"
gdd: ["§14.1", "§14.11", "§14.13", "§17.2"]
adrs: ["0050"]
updated: 2026-10-14
---

# Clearwater

## In one paragraph

Clearwater is the **second battleground**, the swing city: a lake resort with a working town behind
it. The casino and the promenade face the lake; the tram sheds, the Rows and St Martin's sit in the
Depot; the cannery and the fish quay are at the Harbour
([[GDD#14.1 The five cities|GDD §14.1]]). It is worth **30 % of the nation** and is nobody's home,
so all three parties meet there on equal terms. It is **designed for slice 7 and not built**: the
game shows it on the nation map as *Contested · no service yet*.

## Key facts

| | Designed ([[design/slice-7-nation#9. Clearwater|slice-7 design §9]]) |
|---|---|
| Role | battleground, **one meter** (no districts) |
| Baseline | 22 / 22 / 22 / 34 (pinned in slice 7; GDD §14.11, Appendix C #70) |
| Train | 25 min from Irongate, 20 Iron; from a home city through the capital. No hostile card |
| Council | 7 seats, three-way, cycle offset 4; the hall is **the Casino** |
| Paper | *The Clearwater Courier*, "Lake, town and harbour, every morning", 6 marks |
| Residence | Rank 2, 500 Iron, seven days between moves; Lodgings at **the Rows** |
| Difficulty | 10 on tier 1, 20 on missions |
| Patron | **Julius Marr**, banker, at the Pier Hotel (slice 8; [[Patronage and Favours]]) |

## Places / members / roles

Designed as **one map** (review 4 addendum, [[design/slice-7-nation#24. Review 4 addendum (6 Oct 2026)|§24]]),
with the Places list grouped by quarter:

| Quarter | Places (designed) |
|---|---|
| **The Front** (later edition, opens with slice 8) | The Promenade · The Casino (`bar`; the council's hall) · The Lido · The Pier Hotel |
| **The Depot** | Tram Depot `station` · Back Lane Market `market` · The Rows `street` · St Martin's `square` · The Sanatorium `hospital` |
| **The Harbour** (the station's quarter) | The Harbour `docks` · The Cannery `factory-gate` · Clearwater Station `station` · Harbour Police `jail` |

Designed content: 24 tier-1 actions; jobs Street vendor (Back Lane Market), Cannery hand (the
Cannery), Tram conductor (Tram Depot); four missions: *Address the harvest supper at St Martin's*,
*Watch the night boats on the mole*, *Spoil the tram company's timetable*, *Lift the cannery's wage
book*; six new Issues (deck to 30); a slate of three locals per party (nine).

## In the game

What exists in code today:
- `packages/content/src/data/nation.ts`: the nation card (`service: 'later'`, *Contested · no service
  yet*, 25 min, arrival at the station pin) and a route from the capital.
- `packages/content/src/data/mapPins.ts`: the 13 survey pins of the painted picture.
- References in rules and tests (calendar offset 4, travel, paper) and the dev map viewer.
- **No city document, places, council or missions** in `packages/content/src/data/cities/`.

## Art

- Painted map (for the game): `art-direction/maps-v3/clearwater-day-8640.png`,
  `clearwater-night-8640.png`; survey `maps-v3/pins/clearwater-pins.jpg`.
- Pen-and-ink (retired): `art-direction/maps-pen/clearwater.png`, `clearwater-night.png`; an early
  reference in the art-direction root: `clearwater.png`.
- Scenes ready: `mvp/scenes/casino.png`, `lido.png`.

## Status

Designed, not built (slice 7; [[Slice 7 The Nation]]). The Front waits for slice 8.

- **Baseline:** the nation card now shows **22 / 22 / 22 / 34** (`baselineOpinion` in
  `packages/content/src/data/nation.ts`, fixed 14 Oct 2026; it showed the provisional 20 / 24 / 24 /
  32), and [[GDD#14.1 The five cities|GDD §14.1]] says Clearwater is "designed for slice 7, not built yet".
- **The Casino:** the slice-7 design first said the hall is "a backdrop and a name, not a
  location"; the review-4 addendum and GDD §13.5 make it a place (kind `bar`) carrying the
  council's blocks. The addendum is the later word.

## Related

[[Irongate]] · [[Battleground and Groundswell]] · [[National Control]] · [[Residence]] ·
[[Travel and Journeys]] · [[Slice 7 The Nation]]
