---
type: system
title: Residence
aliases: [Political home, Home of your own, The flat, Lodgings, Rented room, Live here, Moving]
tags: [city, politics, home]
status: partly built
slice: "4 (residence and the capital's lodgings); the flat designed for 8"
gdd: ["§14.11", "§17.4", "§6.3"]
adrs: ["0026", "0056", "0084"]
updated: 2026-10-17
---

# Residence

## In one paragraph

Two different "homes" matter. Your **residence** is your **political home**: where you vote and stand, whose paper you read first, which [[Party Orders]] you get. It starts as your faction's [[Home Cities|home city]]; from Rank 2 you can move to a district of [[Irongate]] (and, from slice 7, to [[Clearwater]]). Your **home of your own** is where you sleep: a free rented room for everyone, and later a **flat** that banks more Rested. Residence is built; the flat is designed for slice 8. Neither ever takes anything from you.

## How it works

**Residence, the political home** ([[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]], "Residence (slice 4)"):
- **Moving:** Rank 2 or above, standing in the district (or at home, for the way back), one tap on ***Live here · 500 Iron***, a sheet listing the consequences. **500 Iron both ways, seven days between moves.** Moving between two districts is a move like any other.
- **What changes:** you vote in the new place from the first vote that opens after the move; you may stand there from the next standing window (Rank 3, *Known* in Irongate, 10 PC, no backers needed); a standing candidate can't move until the count; a seat you held at the old place is vacated to the branch's next NPC; your orders come from the capital rotation from the next City Day; the *Herald* is your paper.
- **What stays:** your job, [[Local Standing]] everywhere, Iron, XP, Level, Party XP, Rank, PC, items, the Ambition. `homeCityId` still means your faction's home (morale, *Fired up*, the Ambition).
- **A candidate on a ballot stays put** (`ON_BALLOT`) until the result. **Residence has no rent.** Rival home cities can never be a residence.
- **Lodgings in Irongate** (review 4: a ***Lodgings*** card at Tram Junction): *A bed on the tram line · 7 nights · 100 Iron*, Rested cap +50 while it runs (250 instead of 200). Renewal adds seven nights to the end, offered with seven or fewer left. Half price under the Evictions Issue.
- **The Rested cap follows the residence** ([[Rested]]).

**A home of your own** ([[GDD#17.4 A home of your own (new)|GDD §17.4]]; designed for slice 8):
- **The rented room:** free, everyone; **+10 Rested at every boundary**.
- **The flat:** in the residence city from **Level 10**; **2,500 Iron** with the first week paid, then **150 a week prepaid** (*Pay a week · 150* / *Pay four weeks · 600*). Gives **+25 Rested at every boundary**, **Rested cap +50**, a third outfit ***Evening*** ([[Equipment and Wardrobe]]) and **+2 worn Charisma** in its city.
- **The flat waits:** when the rent runs out the bonuses stop and nothing is taken; no arrears are ever owed; a week's rent restores everything. Moving residence leaves the flat where it is. One flat per player.
- **Post-MVP:** the townhouse, the villa, a second flat, the map marker.

## Where it lives

**Rules:** [[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]] · [[GDD#17.4 A home of your own (new)|§17.4]] · [[design/slice-4-battleground|slice-4 design]] (residence, the room) · [[design/slice-4-fixes|slice-4 fixes §6]] · [[design/review-4-answers|review-4 answers §9.3]] (the Lodgings card) · [[design/slice-8-life#6. A home (GDD §17.4, the MVP form)|slice-8 design §6]] · [[adr/0026-residence-the-political-home|ADR 0026]] · [[adr/0056-the-flat-prepaid-rent-as-a-day-key|ADR 0056]] (proposed) · [[tech/slice-4|tech spec slice 4]]

**Code:**
- Rules: `packages/rules/src/residence.ts` (`moveWindows`, `registerRefusal`, `roomPrice`, `roomTap`); `RESIDENCE { rank: 2, cost: 500, cooldownDays: 7 }`, `ROOM { cost: 100, days: 7, restedBonus: 50 }` in `constants.ts`
- Server: `apps/server/src/services/residence.ts` (`residenceOf`, `residenceSpec`, `paperCityOf` — the one seam for "where I vote, read and take orders"), `residenceService.ts` (`residenceCardView`, `lodgingsView`, `register`, `takeRoom`) · router `apps/server/src/trpc/routers/residence.ts` (`register`, `room`)
- Data: embedded `characters.residence { cityId, districtId, sinceDay, votesFromDay, standsFromDay, canMoveFromDay }` (migration 006); a lint rule limits reads of `homeCityId`
- Planned (ADR 0056): `home.flat { cityId, boughtDay, paidThroughDay }`; Rested added at each boundary in the settlement's Energy projection. Rules in `packages/rules/src/home.ts` (T3, 16 Oct 2026); the flat's copy, modals and paper lines in `copy.ts` (`copy.life.home`) and `lifeHeadlines.ts` (T6, 16 Oct 2026)

## Status

**Slice 8 phase C, lane Q (16 Oct 2026): the Me tab's *Where you sleep*** (`HomeCard`; buy the flat, pay a week or four, *Your flat waits*) and the desk's row; e2e `home.spec.ts`. The residence card's flat line on the place sheet is not on screen.

**Slice 8 phase B, lane 2 (16 Oct 2026): the flat is built on the server** (`apps/server/src/services/homeService.ts`: `home.get/buyFlat/payRent`; ADR 0056). Rent is a day key; a lapse writes nothing and the flat waits; Rested +25 at the boundary while it counts (+10 the room), the cap +50; the paper's *Rent Due* and *The Flat Waits*. The Me tab's card is phase C.

**Built:** residence and moving, district to district, and the Irongate lodgings ([[Slice 4 The Battleground|slice 4]]; the Lodgings card reworded in [[Review 4]]). Clearwater as a residence with lodgings at the Rows (slice 7). **Built in slice 8 (16 Oct 2026):** the rented room's +10 Rested and the flat (`homeService`, the Me tab's *Where you sleep*).

**Integration (17 Oct 2026, `8ae302a`):** a flat bought and lapsed on the same day now prints *The Flat Waits*: the purchase and the rent are separate facts in `lifeSettlement` (the selector was already one sort by priority). ADR 0056 accepted.

## Decisions

- 3 Oct 2026 (QA M2): a candidate on a ballot cannot move (Appendix C #61); chosen over striking the name.
- 3 Oct 2026 (QA m5): a room renewal adds nights to the end, never a restart.
- Review 4: *Register* became *Live here*; lodgings became their own card at Tram Junction.
- Slice 8 design: the flat waits; no arrears (Appendix C #79).
- 14 Oct 2026 (drift cleanup): GDD §14.11's residence paragraph now matches the voting rework ([[adr/0084-seats-by-reputation-and-backers-standing-is-spent-with-a-rule|ADR 0084]]): **no backers, no withdrawal, no deposit**; a **standing candidate stays put until the count** (`ON_BALLOT`); you vote from the first vote that opens after the move and may stand from the next standing window. GDD §7.4 now says **Rank 2** to move.

## Open questions / drift

- None open in the sources.

## Related

[[Home Cities]] · [[Capital Districts]] · [[City Council and the Rule Vote]] · [[Party Orders]] · [[Rested]] · [[The Morning Paper]] · [[Equipment and Wardrobe]] · [[Hostile Ground]] · [[Clearwater]]
