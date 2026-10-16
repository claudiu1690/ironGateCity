---
type: entity
title: Clearwater
aliases: [clearwater, the swing city, the lake town]
tags: [city, battleground]
status: partly built
slice: "7 (content written 15 Oct 2026; being wired)"
gdd: ["§14.1", "§14.11", "§14.13", "§17.2"]
adrs: ["0050"]
updated: 2026-10-16
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

What exists in code today (slice 7, phase A, 15 Oct 2026):
- `packages/content/src/data/cities/clearwater.ts`: the city document: one map, three open quarters
  (The Front holds only the Casino; the Promenade, the Lido and the Pier Hotel are later pins), nine
  working places plus **the Casino as the hall** (kind `bar`, a gallery ticket), 24 tier-1 actions,
  the Courier, the council (offset 4, 7 seats, lists of 3), lodgings on the Rows, the Sanatorium's
  sisters, `nationalWeight` 0.3, baseline 22 / 22 / 22 / 34.
- `missions/clearwater.ts` (four missions), `jobs.ts` (`clearwaterJobs`), `candidates.ts`
  (`clearwaterCandidates`, nine), `issues.ts` (six Issues; `tram-fares` gains the lake),
  `orders.ts` (the lake rotation), `events.ts` (the venue rows), `courierHeadlines.ts` (the Courier's
  set), `nation.ts` (`service: 'open'`, *Battleground · the lake town*).
- `mapPins.ts`: the 13 survey pins; every place's pin equals its survey pin.
- **Not yet wired:** `load.ts` does not import the city yet, and the loader's slate, mission and
  paper rules still treat a non-districted city as a home city; the map assets and tiles are T9's.
  See [[Slice 7 The Nation]] for the developer's bindings.

## Art

- Painted map (for the game): `art-direction/maps-v3/clearwater-day-8640.png`,
  `clearwater-night-8640.png`; survey `maps-v3/pins/clearwater-pins.jpg`.
- Pen-and-ink (retired): `art-direction/maps-pen/clearwater.png`, `clearwater-night.png`; an early
  reference in the art-direction root: `clearwater.png`.
- Scenes ready: `mvp/scenes/casino.png`, `lido.png`.

## Status

- **Phase C, lane Y (16 Oct 2026):** played end to end on a phone (`apps/client/e2e/clearwater.spec.ts`): the board from the nation map, *You're on the lake*, the Casino selected, The Front's three later pins, *Live here* (the sheet names the lake branch and the Courier), a canvass at the fish quay, the Tram Depot's mission, a bed in the Rows, a visitor's Clearwater edition, the Courier, seven seats and the Mayor in the Casino's hall blocks.
- **15 Oct 2026, phase B lane 1 (developer):** playable. Its city day is `apps/server/src/services/battlegroundDay.ts` (`bootstrapBattleground`, `processBattlegroundBoundary`: drift on one meter, Monday's Issues, the meter's state on `cities.battleground`, the count of seven seats by `countBattleground` with lists of three, the rule by `decideBlocRule`, a Mayor from the largest bloc, the set with one card per party); `cityDayBuilt` is gone. Travel, *Live here* (`registerRefusal`'s `openIds`), the bed on the Rows, its election and ballot (one place, kind `district`, id `clearwater`), the Courier, every party's branch channel and Heat +25 % for rivals of its controller work; no patrol is rolled there. Not yet: the Chair's fixtures, the *Takes Clearwater* news.

- **15 Oct 2026, phase A (developer):** the content is bound in the loader as a contested city on one meter (three locals a party, no rule; the Courier on the Herald's set; thirty Issues); its map stills are catalogued; `countBattleground` (seven seats) and `decideBlocRule` are in rules. Its city day is held back (`cityDayBuilt` in `apps/server/src/services/cityDay.ts`) until phase B's T12, so the city is not yet playable although the train shows it open.
Content written 15 Oct 2026 (slice 7, phase A; [[Slice 7 The Nation]]); the loader's Clearwater
rules and the art are the developer's, so the city is not yet playable. The Front's three society
places wait for slice 8; the Casino is open now as the hall.

- **Baseline:** the nation card now shows **22 / 22 / 22 / 34** (`baselineOpinion` in
  `packages/content/src/data/nation.ts`, fixed 14 Oct 2026; it showed the provisional 20 / 24 / 24 /
  32), and [[GDD#14.1 The five cities|GDD §14.1]] says Clearwater is "designed for slice 7, not built yet".
- **The Casino:** the slice-7 design first said the hall is "a backdrop and a name, not a
  location"; the review-4 addendum and GDD §13.5 make it a place (kind `bar`) carrying the
  council's blocks. The addendum is the later word.

## Related

[[Irongate]] · [[Battleground and Groundswell]] · [[National Control]] · [[Residence]] ·
[[Travel and Journeys]] · [[Slice 7 The Nation]]
