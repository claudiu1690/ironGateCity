---
type: system
title: Capital Districts
aliases: [Districts, Irongate districts, District, Government Quarter, Old Town, Station & Market, Eastside, Garrison Hill]
tags: [city, irongate, battleground, map]
status: built
slice: "4; tiling and Town Hall in review 4"
gdd: ["§14.9", "§15.3"]
adrs: ["0027", "0076", "0077"]
updated: 2026-10-14
---

# Capital Districts

## In one paragraph

[[Irongate]] is the only city split into **five districts**, each with its own opinion meter,
close race and comeback, two council seats and its own Issues. The capital is worth 40 % of the
nation and every party's HQ is there, so districts give it several fights at once and give each
party home ground inside it. On the map the districts are the capital's quarters: five outlines
that together cover the whole painted picture.

## How it works

- **The five** ([[GDD#14.9 Capital districts (new)|GDD §14.9]]): **Government Quarter**
  (Neutral-leaning, hardest to hold) · **Old Town** (Alliance) · **Station & Market** (swing) ·
  **Eastside** (Collective) · **Garrison Hill** (Vanguard). Baselines: the two swing districts
  20 / 20 / 20 / 40; the three leaning districts 35 for their party, 15 / 15, Neutral 35.
- **Places:** 30 (29 plus the City Hall from review 4), **62 tier-1 actions**, three jobs (Porter,
  Street vendor, Driver). HQ actions are members only.
- **Opinion:** each district has its own meter. Irongate's city opinion is the **equal average of
  the five**, computed on read (Appendix C #9: equal weights).
- **Control, close race, comeback** apply per district ([[Battleground and Groundswell]]). Control
  gives access, never multipliers.
- **Issues:** each of the capital's two weekly Issues is tied to a district, and the two come from
  different districts ([[Issues of the Week]]).
- **Heroes:** a District Hero per district and bracket ([[Influence Ledger and City Hero]]).
- **Council:** 10 seats, 2 per district, every district counting the same night; one council, one
  rule for the whole city. Since the voting rework the seats go by reputation and backers and the
  town votes on a rule ([[City Council and the Rule Vote]]). The hall is **the City Hall**
  (`irongate.city-hall`, kind `town-hall`), a place in the Government Quarter since review 4.
- **Moving around:** trams between districts are instant and free (the tram bar). Which district
  you are in is client memory, not a server fact; a capital action names its district.
- **Residence:** a player may live in a district (Rank 2, 500 Iron, seven days between moves) and
  vote and stand there ([[Residence]]).
- **On the map:** one painted picture (11,520 px). The overview shows five outlined districts and a
  Districts list, no place pins; a district view shows only its own pins and holds the drag to the
  outline's bounding box. Since review 4 the five outlines **tile the whole picture** along the
  river's middle, checked exactly by the loader. See [[Quarters and the Map]].

## Where it lives

**Rules:** [[GDD#14.9 Capital districts (new)|GDD §14.9]] ·
[[design/slice-4-battleground#4. Irongate|slice-4 design §4]] (places, actions, frames) ·
[[design/review-4-answers#8. #8 — Irongate's five districts cover the whole picture (GDD §14.9)|review-4 answers §8]] ·
[[adr/0027-capital-districts-and-the-three-way-count|ADR 0027]] ·
[[adr/0076-home-cities-one-map-capital-districts-tile-the-picture|ADR 0076]] ·
[[adr/0077-the-town-hall-an-always-open-place-and-the-councils-public-view|ADR 0077]]

**Code:**
- Rules: `packages/rules/src/district.ts` · `packages/rules/src/capitalCount.ts` · constants
  `DISTRICT`, `CAPITAL_COUNCIL`
- Server: `apps/server/src/services/capitalDay.ts` (`districtSpecs`, `bootstrapCapital`,
  `processCapitalBoundary`: drift → Issues → states → counts → heroes → close → divide) ·
  `apps/server/src/services/cityService.ts` (`districtWord`: *Close race*, *Leans…*, *Held by…*,
  *Comeback*) · `apps/server/src/services/townHallService.ts`
- Data: content `packages/content/src/data/cities/irongate.ts` (quarters with `frame`,
  `outline`, `label`, `district`) · `packages/content/src/geometry.ts` (`tilingProblems`) · model
  `packages/db/src/models/district.ts`
- Client: `apps/client/src/routes/city.tsx` (`/city/$cityId` overview, `/city/$cityId/$quarterId`
  district) · `packages/ui/src/components/Capital.tsx`, `CityMap.tsx`

## Status

- **Built:** slice 4 (districts, meters, states, ten-seat council, heroes, Issues by district);
  review 4 (the tiling, the drag limit, the City Hall as a place); voting rework (seats and rule).
- **Not built:** *rivals of the controlling party gain Heat 25 % faster* (designed for slice 7, ADR 0050 §4; GDD §14.9 no longer calls it built, and which slice carries control effects is [[GDD#Appendix C — Open questions|Appendix C #109]]).

## Decisions

- Equal district weights (Appendix C #9, 29 Sep 2026).
- The user's district lock (3 Oct 2026): the overview draws outlines and names only, the district
  view holds the player inside it.
- The districts tile the whole picture, river included (review 4, 6 Oct 2026).
- City Hall chosen as the council's hall (3 Oct 2026). A sixth district is a split, never new land
  (Appendix C #41).

## Open questions / drift

- None found between GDD, constants and content.

## Related

[[Irongate]] · [[Quarters and the Map]] · [[Battleground and Groundswell]] · [[Influence and Opinion]] ·
[[City Council and the Rule Vote]] · [[Residence]] · [[National Control]] · [[Slice 4 The Battleground]]
