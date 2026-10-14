---
type: entity
title: Duskwall
aliases: [duskwall]
tags: [city, home-city]
status: built
slice: "2 (The Fortress); 5 (The Pass, missions); review 4 (one map, Town Hall)"
gdd: ["§14.1", "§14.11", "§14.12", "§14.13"]
adrs: ["0076", "0077"]
updated: 2026-10-14
---

# Duskwall

## In one paragraph

Duskwall is the **home city of the [[Iron Vanguard]]**: a frontier town in the mountains, with the
old fortress, the customs and the checkpoints ([[GDD#14.1 The five cities|GDD §14.1]]). Since the
content-policy review (29 Sep 2026) it is a **frontier customs town, not a garrison town**: the
fortress houses the frontier customs, and every soldier in its texts became a customs man, a clerk
or an inspector ([[design/content-policy-review#1. The decisions|content-policy review §1]]). As a
home city it is never lost (morale floor 50 %); for the other parties it is rival ground.

## Key facts

| | |
|---|---|
| Role | Home city (`homeFactionId: 'vanguard'`), 10 % of national weight |
| Baseline opinion | Vanguard 70 · Collective 6 · Alliance 9 · Neutral 15 |
| Train from the capital | 15 min |
| Council | 7 seats, cycle offset 3; the hall is the **Town Hall**, the tower hall on the Customs Market |
| Paper | *The Duskwall Sentinel* (*Sentinel*), "For the city and the frontier", 5 marks |
| Party secretary | Viktor Stahl ([[People of Irongate]]) |
| Cells / infirmary | Lock-up / Infirmary (the matron) |
| Run-in pool | Vanguard street enforcer, Vanguard doorman |
| Jobs | Stores hand (Fortress Gate), Street vendor (Customs Market), Driver (Goods Yard) |

## Places / members / roles

| Quarter | Opens | Places (content) |
|---|---|---|
| **The Fortress** | Level 1 | Fortress Gate `ministry` · Customs Market `market` · Beacon House `faction-hq` (Vanguard, members only) · State Archives `library` · Goods Yard `station` · Rampart Row `street` · Town Hall `town-hall` |
| **The Pass** | Level 6 (slice 5) | Frontier Checkpoint `ministry` · Mountain Inn `bar` · Sawmill `factory-gate` · Lock-up `jail` · Infirmary `hospital` |
| **The Town** | a later edition | survey pins only: Duskwall Station, Town Square, The Signal Lamp, Brewery |

Twelve playable places. Some ids keep old words because ids are never shown and saves reference
them: `duskwall.garrison-gate` (Fortress Gate), `duskwall.quartermaster-market` (Customs Market).
The Fortress Gate's kind changed from `barracks` to `ministry`.

**Missions:**

| Mission | Place | Type · Level | Note |
|---|---|---|---|
| Watch the checkpoint after dark | Frontier Checkpoint | surveillance · 6 | legal |
| Lift the checkpoint's log after lights-out | Frontier Checkpoint | theft · 10 | **night only**, Rank 3, against the Vanguard |
| Speak at the whistle | Sawmill | speech · 6 | legal |
| Tear down the Alliance's posters on the inn wall | Mountain Inn | vandalism · 6 | Rank 3 |
| Break up the street meeting on Rampart Row | Rampart Row | disruption · 8 | Rank 3, against the Vanguard |
| Spike the duplicator at Beacon House | Beacon House | sabotage · 10 | Rank 3 (rival ground) |
| Lift the district roll | Beacon House | theft · 10 | Rank 3 (rival ground) |

## In the game

**Content:** `packages/content/src/data/cities/duskwall.ts`,
`packages/content/src/data/missions/duskwall.ts`, `mapPins.ts` (16 survey pins), `jobs.ts`,
`candidates.ts` (nine Vanguard locals).
**Design:** [[design/slice-2-cities#1. Duskwall — home city of the Vanguard|slice-2 cities §1]],
[[design/slice-5-risk#5.2 Duskwall|slice-5 risk §5.2]],
[[design/content-policy-review#4. Old → new: Duskwall (`packages/content/src/data/cities/duskwall.ts`, `headlines.ts`, jobs, order templates)|content-policy review §4]].

> [!warning] Content rule
> Duskwall is Vanguard ground: every new string here goes through the Vanguard checklist
> ([[design/content-policy-review#7. The checklist for future Vanguard content (the content policy, Appendix C #7)|§7]]).

## Art

- In the game: `art-direction/maps-v3/duskwall-day-8640.png`, `duskwall-night-8640.png`; survey
  `maps-v3/pins/duskwall-pins.jpg`.
- Pen-and-ink (retired): `art-direction/maps-pen/duskwall.png`, `duskwall-night.png`.
- HQ scene `mvp/scenes/vanguard-office.png`.

## Status

Built: The Fortress in slice 2; The Pass, missions, cells and infirmary in slice 5; one map and the
Town Hall in review 4; the night theft in review 5. The Town is a later edition.

> [!warning] Drift
> [[GDD#14.1 The five cities|GDD §14.1]] lists **Vanguard House** as a Duskwall key place. In
> content the Duskwall HQ is **Beacon House**; Vanguard House is the party's capital office in
> Garrison Hill ([[Irongate]]).

## Related

[[Iron Vanguard]] · [[Home Cities]] · [[Hostile Ground]] · [[Quarters and the Map]] · [[Coalport]] ·
[[Ashford]] · [[Irongate]]
