---
type: entity
title: Coalport
aliases: [coalport]
tags: [city, home-city]
status: built
slice: "1 (The Mill); 5 (The Harbour, missions); review 4 (one map, Town Hall)"
gdd: ["§14.1", "§14.11", "§14.12", "§14.13"]
adrs: ["0024", "0035", "0076", "0077"]
updated: 2026-10-14
---

# Coalport

## In one paragraph

Coalport is the **home city of the [[Red Collective]]**: the industrial heartland of factories,
docks and workers' councils, a steel town on the river ([[GDD#14.1 The five cities|GDD §14.1]]). It
was the first city built (slice 1) and the test city for quarters. As a home city it can never be
lost: the Collective's share is its **morale** and never falls below 50 %
([[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]]). For the other two parties it is
**rival ground** ([[Hostile Ground]]).

## Key facts

| | |
|---|---|
| Role | Home city (`role: 'home'`, `homeFactionId: 'collective'`), 10 % of national weight |
| Baseline opinion | Vanguard 9 · Collective 70 · Alliance 6 · Neutral 15 |
| Train from the capital | 12 min ([[Travel and Journeys]]) |
| Council | 7 seats, cycle offset 2; the hall is the **Town Hall**, the domed hall on the river ([[City Council and the Rule Vote]]) |
| Paper | *The Coalport Clarion* (*Clarion*), "The voice of the mill and the quays", 5 marks |
| Party secretary | Petra Holm ([[People of Irongate]]) |
| Cells / infirmary | Harbour Police / The Infirmary (the matron) ([[Jail and the Cells]], [[Hospital and Treatment]]) |
| Run-in pool | strike picket, branch inspector |
| Jobs | Street vendor (Market Row), Factory worker (Mill Gate), Driver (Harbour Quays) — pay in [[GDD#9.2 Job catalogue|GDD §9.2]] |
| Map atmosphere | clouds by day, fog by night (on for the three home cities) |

## Places / members / roles

**Quarters** are Level gates for groups of places, read on the Places list
([[Quarters and the Map]]). A home city is **one map** since review 4: locked places show as greyed
pins with a lock ([[GDD#14.13 Quarters: how a city is laid out on the map (new, 1 Oct 2026)|GDD §14.13]]).

| Quarter | Opens | Places (content) |
|---|---|---|
| **The Mill** | Level 1 | Mill Gate `factory-gate` · Market Row `market` · Union Hall `faction-hq` (Collective, members only) · Foundry Row `street` (id `coalport.terraces`) · Harbour Quays `docks` · The Anchor `bar` · Town Hall `town-hall` |
| **The Harbour** | Level 6 (slice 5) | The Shipyard `docks` · Customs House `ministry` · The Infirmary `hospital` · Harbour Police `jail` · The Far Bank `market` |
| **The Sidings** | a later edition | not playable; survey pins only: Coalport Station, Coal Yards, Tram Depot, St Barbara's |

Twelve playable places. The Town Hall is open at every Level (review 4,
[[adr/0077-the-town-hall-an-always-open-place-and-the-councils-public-view|ADR 0077]]). The train's
arrival pin is Coalport Station (0.46, 0.62), an unbuilt Sidings pin.

**Missions** (tier 2, [[Missions]]):

| Mission | Place | Type · Level | Note |
|---|---|---|---|
| Speak at the launch | The Shipyard | speech · 6 | legal |
| Watch the sheds after dark | Customs House | surveillance · 6 | legal |
| Follow the ten o'clock lorry | Customs House | surveillance · 8 | **night only** (review 5) |
| Tear down the Vanguard's posters on the fish quay | The Far Bank | vandalism · 6 | Rank 3, against the Vanguard |
| Break up the stair meeting on Foundry Row | Foundry Row | disruption · 8 | Rank 3, against the Collective |
| Spike the duplicator at the Union Hall | Union Hall | sabotage · 10 | Rank 3, against the Collective (rival ground) |
| Lift the branch's membership roll | Union Hall | theft · 10 | Rank 3, against the Collective (rival ground) |

## In the game

**Content:** `packages/content/src/data/cities/coalport.ts` (city, quarters, places, tickets, texts),
`packages/content/src/data/missions/coalport.ts`, `packages/content/src/data/mapPins.ts` (16 survey
pins), `packages/content/src/data/cities/townHall.ts` (the hall's shared ticket),
`packages/content/src/data/jobs.ts`, `candidates.ts` (nine Collective locals).
**Design:** [[design/slice-1-content|slice-1 content]] (The Mill),
[[design/city-quarters#2. Coalport's three quarters|city quarters §2]],
[[design/slice-5-risk#2. The second quarters (Level 6)|slice-5 risk §2]] (The Harbour) and
[[design/slice-5-risk#5.1 Coalport|§5.1]] (missions).

## Art

- In the game (maps v3, painted, 8,640 px): `art-direction/maps-v3/coalport-day-8640.png`,
  `coalport-night-8640.png`; survey `maps-v3/pins/coalport-pins.jpg`; superseded
  `maps-v3/superseded/coalport-*-8640-redcross.png`.
- Pen-and-ink (retired plan): `art-direction/maps-pen/coalport.png`, `coalport-night.png`.
- Scenes used by its kinds: `union-hq.png`, `bar-anchor.png`, `factory-gate.png`, `docks.png`,
  `market.png`, `street.png`, `town-hall.png` (`mvp/scenes/`). See [[Art and Maps Pipeline]].

## Status

Built. The Mill in slices 0–1; The Harbour, missions, cells and infirmary in slice 5; one map, the
Town Hall and greyed later pins in review 4; night mission and *What's here* in review 5. The
Sidings is a later content addendum (the user, 2 Oct 2026).

## Related

[[Red Collective]] · [[Home Cities]] · [[Hostile Ground]] · [[Quarters and the Map]] ·
[[Duskwall]] · [[Ashford]] · [[Irongate]]
