---
type: system
title: Home Cities
aliases: [Home city, Home cities and battlegrounds, Home floor]
tags: [city, factions, morale]
status: partly built
slice: "0–3 (home cities, morale); 5 (second quarters, rival ground); review 4 (one map)"
gdd: ["§14.11", "§14.13"]
adrs: ["0022", "0076"]
updated: 2026-10-14
---

# Home Cities

## In one paragraph

Each party has a **home city it can never lose**: Duskwall for the Iron Vanguard, Coalport for the
Red Collective, Ashford for the Civic Alliance. New players start there, among their own people.
Power is won or lost in the two **battlegrounds**, [[Irongate]] and [[Clearwater]]. A home city is
kept alive by its **morale** (the home party's share) and by **politics inside the party**: its
council seats are contested between members of the same party.

## How it works

- **Home vs battleground** ([[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]]):
  - Home: always the home party's (**never below 50 %**); new players live there; the council is
    contested within the party; safe for its own party, [[Hostile Ground|rival ground]] for others;
    **10 %** national weight each.
  - Battleground: three-way contest; anyone Rank 2+ may live there; Irongate 40 %, Clearwater 30 %.
- **Why the floor stays:** a rival-held home would make a terrible first day, would snowball, and
  would invite griefing. Neglect is punished through morale states instead. Only the rare Season
  Twist *The Upset* lets a home be contested for one season ([[Political Seasons]]).
- **Morale** is the home share: *Fired up* 80+, *Steady* 60–79, *Unrest* 50–59. It drifts toward
  **70** at 2 % of the distance a day and moves with actions, ballots (+0.5), seats (+2) and a count
  with no voter (−3). Details, Unrest consequences and the Unrest prize:
  [[Battleground and Groundswell]].
- **Baselines:** each home starts at **70** for its party, 15 Neutral, the two rivals 9 / 6 (the
  stronger rival chosen for the fiction; [[GDD#14.11 Home cities and battlegrounds (new)|§14.11
  table]]).
- **Rival pressure is capped:** rivals can take at most **2 points a City Day** from the home party,
  across both rivals.
- **One map** (review 4): a home city shows the whole painted picture with every surveyed place
  as a pin. Locked places are greyed pins with a lock and a note (*Opens at Level 6* / *Opens with a
  later edition*). There are no quarter outlines, no overview and no quarter bar. A quarter is only
  the **Level gate of a group of places**, read on the *What's here* list. See
  [[Quarters and the Map]].
- **Places today:** eleven per home city in content (six in the Level-1 quarter, five in the
  Level-6 second quarter from slice 5, e.g. Coalport's Mill and Harbour) plus the **Town Hall**,
  open from Level 1 whatever its quarter. The third quarters (e.g. Coalport's Sidings) are *Opens
  with a later edition*; their survey pins show as greyed later places.
- **Residence** starts as the home city; `homeCityId` keeps meaning the party's home ([[Residence]]).

## Where it lives

**Rules:** [[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]] ·
[[GDD#14.13 Quarters: how a city is laid out on the map (new, 1 Oct 2026)|GDD §14.13]] ·
[[design/slice-2-cities|slice-2 design]] (Duskwall, Ashford) ·
[[design/slice-5-risk#2. The second quarters (Level 6)|slice-5 design §2]] ·
[[design/review-4-answers#21. #21 — Home cities have no quarters on the map (GDD §14.13, reversed)|review-4 answers §21]] ·
[[adr/0022-morale-home-share-state-and-contention|ADR 0022]] ·
[[adr/0076-home-cities-one-map-capital-districts-tile-the-picture|ADR 0076]]

**Code:**
- Rules: `packages/rules/src/morale.ts` · `packages/rules/src/quarters.ts` (`placeOpen`) ·
  constants `MORALE`, `OPINION_FLOORS`
- Server: `apps/server/src/services/cityDay.ts` (home boundary: drift, count, morale inputs) ·
  `apps/server/src/services/cityService.ts` (`getCityView`: `lockedPins`, quarter group headers)
- Data: content `packages/content/src/data/cities/{coalport,duskwall,ashford}.ts`,
  `packages/content/src/data/cities/townHall.ts` · model `packages/db/src/models/city.ts`
- Client: `apps/client/src/routes/city.tsx` (`/city/$cityId`; a home city's `/$quarterId`
  redirects to it) · `packages/ui/src/components/Places.tsx`

## Status

- **Built:** the three home cities (slices 0–2), morale and its states (slice 3), second quarters
  and rival ground (slice 5), one map with greyed pins and Town Halls (review 4), *What's here*
  (review 5), the Unrest prize (review 5).
- **Not built:** the Unrest effects that need slice 7 (half national weight, deputies abstain, the
  vote on the Chair); third quarters (later content); *The Upset* (slice 8 seasons).

## Decisions

- Home cities are one map; only Irongate has districts (review 4, 6 Oct 2026, reversing slice 5's
  overview; Appendix C #95).
- The Town Hall is open from Level 1 whatever its quarter (Appendix C #93).
- Home stations' quarters are a later content addendum (user, 2 Oct 2026).

## Open questions / drift

- None beyond those on [[Battleground and Groundswell]] and [[National Control]].

## Related

[[Coalport]] · [[Duskwall]] · [[Ashford]] · [[Battleground and Groundswell]] · [[Hostile Ground]] ·
[[Quarters and the Map]] · [[Residence]] · [[City Council and the Rule Vote]] · [[Iron Vanguard]] ·
[[Red Collective]] · [[Civic Alliance]]
