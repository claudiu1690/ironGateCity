---
type: entity
title: Ashford
aliases: [ashford]
tags: [city, home-city]
status: built
slice: "2 (The College); 5 (The Wharf, missions); review 4 (one map, Town Hall)"
gdd: ["§14.1", "§14.11", "§14.12", "§14.13"]
adrs: ["0076", "0077"]
updated: 2026-10-14
---

# Ashford

## In one paragraph

Ashford is the **home city of the [[Civic Alliance]]**: a university town on the river, with the
college under its dome, the county courts, the *Gazette* and cafés on the bridges
([[GDD#14.1 The five cities|GDD §14.1]],
[[design/slice-2-cities#2. Ashford — home city of the Alliance|slice-2 cities §2]]). As a home city
it is never lost (morale floor 50 %); for the other two parties it is rival ground.

## Key facts

| | |
|---|---|
| Role | Home city (`homeFactionId: 'alliance'`), 10 % of national weight |
| Baseline opinion | Vanguard 6 · Collective 9 · Alliance 70 · Neutral 15 |
| Train from the capital | 12 min |
| Council | 7 seats, cycle offset 1; the hall is the **Town Hall** (`ashford.town-hall`) |
| Paper | *The Ashford Gazette* (*Gazette*), "Fair report, free comment", 6 marks |
| Party secretary | Thomas Grey ([[People of Irongate]]) |
| Cells / infirmary | Police Station / County Infirmary (the matron) |
| Run-in pool | party heavy (`party-thug`) only |
| Jobs | Copy clerk (Gazette House), Street vendor (Bridge Street), Driver (Bridge Street) |

## Places / members / roles

| Quarter | Opens | Places (content) |
|---|---|---|
| **The College** | Level 1 | Gazette House `press` · Assembly Rooms `faction-hq` (Alliance, members only) · University Quad `university` · The Courts `court` · Bridge Street `market` · Weavers' Row `street` |
| **The Wharf** | Level 6 (slice 5) | The Wharf `docks` · Brewery `factory-gate` · Cattle Market `market` · County Infirmary `hospital` · Police Station `jail` |
| **Station Road** | a later edition | Town Hall `town-hall` (playable); survey pins only: Ashford Station, Corn Exchange, Theatre, Park and Bandstand, Press Club |

Twelve playable places. The Town Hall sits in the later-edition quarter on the survey but is open at
every Level ([[GDD#Appendix C — Open questions|Appendix C]] #93).

**Missions:**

| Mission | Place | Type · Level | Note |
|---|---|---|---|
| Watch the wharf after dark | The Wharf | surveillance · 6 | legal |
| Speak at the cattle auction | Cattle Market | speech · 6 | legal |
| Tear down the Collective's posters on the brewery wall | Brewery | vandalism · 6 | Rank 3 |
| Paste over the brewery gate before the dawn shift | Brewery | vandalism · 6 | **night only**, Rank 3, against the Alliance |
| Break up the tenants' meeting on Weavers' Row | Weavers' Row | disruption · 8 | Rank 3, against the Alliance |
| Spike the duplicator at the Rooms | Assembly Rooms | sabotage · 10 | Rank 3 (rival ground) |
| Lift the constituency roll | Assembly Rooms | theft · 10 | Rank 3 (rival ground) |

## In the game

**Content:** `packages/content/src/data/cities/ashford.ts`,
`packages/content/src/data/missions/ashford.ts`, `mapPins.ts` (17 survey pins), `jobs.ts`,
`candidates.ts` (nine Alliance locals).
**Design:** [[design/slice-2-cities|slice-2 cities]], [[design/slice-5-risk#5.3 Ashford|slice-5 risk §5.3]].

## Art

- In the game: `art-direction/maps-v3/ashford-day-8640.png`, `ashford-night-8640.png`; survey
  `maps-v3/pins/ashford-pins.jpg`.
- Pen-and-ink (retired): `art-direction/maps-pen/ashford.png`, `ashford-night.png`.
- Scenes for its kinds: `alliance-hq.png`, `newsroom.png` (press), `university.png`, `court.png`.

## Status

Built: The College in slice 2; The Wharf, missions, cells and infirmary in slice 5; one map and the
Town Hall in review 4; the night vandalism in review 5. Station Road is a later edition.

> [!note] Inference
> The Ashford train's arrival pin is Ashford Station, an unbuilt Station Road pin; the map opens on
> the Town Hall's pin on arrival (GDD §14.13), which is playable. No drift found, but the station
> quarter is the one place where the playable hall and unbuilt pins share a later-edition quarter.

## Related

[[Civic Alliance]] · [[Home Cities]] · [[Hostile Ground]] · [[Quarters and the Map]] · [[Coalport]] ·
[[Duskwall]] · [[Irongate]]
