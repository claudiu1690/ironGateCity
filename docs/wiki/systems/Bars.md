---
type: system
title: Bars
aliases: [Bar, The back room, Black Market, Buy a round]
tags: [city-services]
status: partly built
slice: "bar places since 1; bar services and buffs MVP, slice 8, not built yet (back room designed for 8)"
gdd: ["§19.3", "§6.7", "§11.4", "§25"]
adrs: ["0051"]
updated: 2026-10-14
---

# Bars

## In one paragraph

Bars are places of kind `bar` where the town talks: dockers' bars, a press club, a station buffet. Today they are **ordinary places with tier-1 tickets** (listening, singing, talking at the long bar; [[Street Actions]]). The GDD also gives them **bar services**: buy a round, bribe the barman, a meal, a stimulant, recruitment, and the **back room** (the GDD's Black Market). **None of the services is built.** The user put the bar services and their buffs in the **MVP, slice 8 (A Life in the City), not built yet** (14 Oct 2026); slice 8 has designed the back room so far, and the rest is still to be designed.

## How it works

- **The bar places** (content): The Anchor (Coalport), the Mountain Inn (Duskwall), and in Irongate the Press Club, the Station Buffet, the Red Lantern and the Gate Tavern. Each has its own tier-1 tickets.
- **The §19.3 services** ([[GDD#19.3 Bars|GDD §19.3]], MVP slice 8, not pinned yet; prices to be checked against today's economy, Appendix C #111):
  - *Buy a round* (2 Energy): *In Good Spirits*, +10 % XP on the next 3 missions; 3 a day;
  - *Bribe the barman* (4): a city report; 1 a day;
  - *Faction recruitment* (5, Rank 2+), *Overhear conversation* (3; 10 % Dossier entry), a *Stimulant* (+10 HP, overdose rules; Appendix C #111's default cuts the overdose and keeps three a day), a *Bar meal* (*Well-Fed (Bar)*, [[Buffs]]).
- **The back room** (designed, slice 8): a shop card on bars that have one, **from Rank 3**: the Anchor, the Gate Tavern, the Red Lantern, the Mountain Inn's taproom and Clearwater's Casino. It sells forged papers and wire cutters ([[Equipment and Wardrobe]]) and offers **the bribe that clears a mark**: *Have a mark struck off · {price} Iron*, **500 at *On file*, 1,000 at *Repeat offender*, 2,000 at *Notorious***, oldest mark first, one a day ([[GDD#11.4 Clearing a record|GDD §11.4]]). Julius Marr's Confidant favour halves it for a week ([[Patronage and Favours]]). The record raises its prices like every shop.
- **Level 6** opens the second quarters, which [[design/city-quarters|city-quarters]] calls "the level that opens bar services".

## Where it lives

**Rules:** [[GDD#19.3 Bars|GDD §19.3]] · [[GDD#25. Scope and roadmap|GDD §25]] · [[GDD#6.7 Buffs (replaces "Physical Neglect")|GDD §6.7]] · [[GDD#11.4 Clearing a record|§11.4]] · [[design/slice-8-life|slice-8 design §3.5, §3.8]] (back room, bribe) · [[design/slice-5-risk|slice-5 design §2.4]] · [[tech/slice-8|tech/slice-8]] §1.1 (added scope, to be designed) · [[adr/0051-wardrobe-four-slots-outfits-and-shops|ADR 0051]] (shops as cards on places, `bribe`)

**Code:**
- Content: the bar places in `packages/content/src/data/cities/{coalport,duskwall,irongate}.ts` (`kind: 'bar'`)
- Services: none. No buff, round, meal or back-room code exists.

## Status

**Partly built:** the bar places and their tier-1 tickets (slices 1, 2, 4 and 5). **Designed:** the back room and its bribe (slice 8). **MVP, slice 8, not built yet, still to be designed** (the user, 14 Oct 2026): buy a round, the barman's report, meals, stimulants, recruitment, overhearing, with the Well-Fed buffs and *In Good Spirits* ([[GDD#25. Scope and roadmap|GDD §25]], [[tech/slice-8|tech/slice-8]] §1.1).

## Decisions

- Slice 5 design §2.4: no bar services in slice 5; they are buffs and items.
- Slice 8 design: the *Black Market* is said as **the back room**; no random item.
- **14 Oct 2026 (the user, drift cleanup):** the bar services and their buffs are **MVP, slice 8**. GDD §6.7, §19.3 and §25 now say so; the plan lists them under slice 8 as added scope.

## Open questions / drift

- [[GDD#Appendix C — Open questions|Appendix C #111]]: may Well-Fed take Health **above max** (default: up to max only), and are the prices and the Stimulant's overdose right for today's economy (default: cut the overdose, keep three a day)?
- [[design/city-quarters|city-quarters §3]] still says the Anchor's bar services come at Level 6 in *slice 5*; Level 6 stays the gate, slice 8 the build.

## Related

[[Buffs]] · [[Heat and Record]] · [[Equipment and Wardrobe]] · [[Patronage and Favours]] · [[The Dossier]] · [[Street Actions]] · [[Jail and the Cells]]
