---
type: entity
title: Irongate
aliases: [the capital, Irongate (the capital), irongate]
tags: [city, battleground, capital]
status: built
slice: "4 (districts, residence, three-way count); 5 (missions); review 4 (outlines tile the picture, City Hall)"
gdd: ["§14.1", "§14.9", "§14.11", "§14.13", "§15.3"]
adrs: ["0026", "0027", "0076", "0077", "0085"]
updated: 2026-10-14
---

# Irongate

## In one paragraph

Irongate is **the capital** and the main **battleground**: the political heart of the republic,
where every faction has its capital office ([[GDD#14.1 The five cities|GDD §14.1]]). It is worth
**40 % of the nation** and is the only city split into **five districts**, each with its own
opinion meter, control and two council seats
([[GDD#14.9 Capital districts (new)|GDD §14.9]]). Players move here from home from Rank 2 to vote
and stand where national power is decided ([[Residence]]). Every player passes through it in the
opening: the demobilisation office at Irongate Central ([[Coming Home]]).

## Key facts

| | |
|---|---|
| Role | Battleground (`role: 'battleground'`), the nation's `capitalId`; 0 min from itself |
| City opinion | the equal average of the five districts ([[Capital Districts]]) |
| Council | **10 seats, 2 per district**, cycle offset 0; three-way count; the hall is the **City Hall** (Government Quarter), a place since review 4 |
| The town's rule | the largest bloc's ([[adr/0085-the-contested-citys-rule-is-the-largest-blocs|ADR 0085]]; [[City Council and the Rule Vote]]) |
| Mayor | the largest bloc's top player councillor with a completed term (slice 7, designed) |
| Paper | *The Irongate Herald* (*Herald*), "All the republic, every morning", 6 marks |
| Cells / infirmary | Police Headquarters / St Agnes Hospital (the sister) |
| Lodgings | *A bed on the tram line*, at Tram Junction (100 Iron, 7 nights; [[Residence]]) |
| Jobs | Porter (Central Station), Street vendor (Market Square), Driver (Riverside Quays) |
| Moving around | trams between districts are instant and free |
| Recognition | **District Hero** per district ([[Influence Ledger and City Hero]]) |

## Places / members / roles

The districts are the capital's quarters: each is a framed, outlined part of one picture, all open
from Level 1. The five outlines **tile the whole picture** (review 4,
[[adr/0076-home-cities-one-map-capital-districts-tile-the-picture|ADR 0076]]).

| District | Leans (baseline V/C/A/N) | Places (content) |
|---|---|---|
| **Government Quarter** | neutral, hardest to hold (20/20/20/40) | Parliament `parliament` · The Forecourt `square` · The Ministries `ministry` · The Supreme Court `court` · The Opera `theatre` · Chancery Row `street` · City Hall `town-hall` |
| **Old Town** | Alliance (15/15/35/35) | Herald House `press` · Concord House `faction-hq` (Alliance) · Basilica Square `square` · St Agnes Hospital `hospital` · Lantern Lane `street` · The Press Club `bar` |
| **Station & Market** | swing (20/20/20/40) | Market Square `market` · Tram Junction `square` · Central Station `station` · The Grand Hotel `hotel` · The Bombed Blocks `street` · The Station Buffet `bar` |
| **Eastside** | Collective (15/35/15/35) | Union House `faction-hq` (Collective) · Riverside Quays `docks` · The Ironworks Gate `factory-gate` · The Red Lantern `bar` · Foundry Row `street` · The Iron Bridge `square` |
| **Garrison Hill** | Vanguard (35/15/15/35) | Vanguard House `faction-hq` (Vanguard) · Police Headquarters `ministry` · The Esplanade `square` · The Villas `street` · The Gate Tavern `bar` |

Thirty places, all painted and all playable. No location is a barracks
([[design/content-policy-review|content-policy review]]). HQs are members only.

**Missions** (all Level 10, difficulty 20):

| Mission | Place | Type | Note |
|---|---|---|---|
| Speak to the lunch-hour rally on the Forecourt | The Forecourt | speech | legal |
| Watch the Grand Hotel's lobby after midnight | The Grand Hotel | surveillance | legal |
| Tear down the rivals' posters on the tram shelters | Tram Junction | vandalism | Rank 3, against the district's leader |
| Ride the last tram with the Eastside flyers | Tram Junction | speech | **night only** |
| Break up the rival meeting at the Station Buffet | The Station Buffet | disruption | Rank 3, against the district's leader |

## In the game

**Content:** `packages/content/src/data/cities/irongate.ts` (districts with frames, outlines,
anchors and baselines; 30 places), `packages/content/src/data/missions/irongate.ts`, `mapPins.ts`
(30 pins, each with its district), `heraldHeadlines.ts` (the Herald), `candidates.ts` (ten locals
per party, two per district), `nation.ts` (capital id, routes).
**Design:** [[design/slice-4-battleground#4. Irongate|slice-4 battleground §4]] (districts, places,
62 tier-1 actions, texts), [[design/slice-5-risk#5.4 Irongate|slice-5 risk §5.4]] (missions),
[[design/review-4-answers|review-4 answers]] (tiling, City Hall).
**ADRs:** [[adr/0027-capital-districts-and-the-three-way-count|0027]] (districts and the three-way
count), [[adr/0026-residence-the-political-home|0026]] (residence),
[[adr/0077-the-town-hall-an-always-open-place-and-the-councils-public-view|0077]] (the hall).

## Art

- In the game (painted, 11,520 px): `art-direction/maps-v3/irongate-day-11520.png`,
  `irongate-night-11520.png`; survey `maps-v3/pins/irongate-pins.jpg`.
- Pen-and-ink, **retired** by GDD §14.9: `art-direction/maps-pen/irongate-districts.png`,
  `irongate-districts-night.png`, `irongate-closeup.png`, `irongate-closeup-night.png`. Early
  references in the art-direction root: `capital-districts.png`, `irongate-graphic.png`.
- Scenes include `parliament.png`, `theatre.png`, `hotel.png`, `station.png`, `square.png`,
  `town-hall.png`; the opening uses `demob-office.png` and `train-compartment.png`.

## Status

Built: districts, opinion, residence, the three-way council and Issues in slice 4; missions in slice
5; tiling outlines, the City Hall place and the Lodgings card in review 4; the largest bloc's rule in
the [[Voting Rework]]. Designed, not built: the Mayor, Parliament as a working chamber and the
President ([[Slice 7 The Nation]]); patron Edith Crane at Herald House ([[Slice 8 A Life in the City]]).

## Related

[[Capital Districts]] · [[Battleground and Groundswell]] · [[Residence]] · [[National Control]] ·
[[Clearwater]] · [[Iron Vanguard]] · [[Red Collective]] · [[Civic Alliance]]
