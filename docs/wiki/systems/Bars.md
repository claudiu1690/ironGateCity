---
type: system
title: Bars
aliases: [Bar, The back room, Black Market, Buy a round, The bar's card, The dining room]
tags: [city-services]
status: partly built
slice: "bar places since 1; the bar's card, the dining room and the back room designed for 8 (16 Oct 2026; building)"
gdd: ["§19.3", "§6.7", "§11.4", "§25"]
adrs: ["0051", "0088"]
updated: 2026-10-16
---

# Bars

## In one paragraph

Bars are places of kind `bar` where the town talks: dockers' bars, a press club, a station buffet, the Casino on the lake. Today they are **ordinary places with tier-1 tickets** (listening, singing, talking at the long bar; [[Street Actions]]). Slice 8 gives them **the bar's card** (*Buy a round*, *A plate of something*) and, from Rank 3, **the back room** (the GDD's Black Market, said plainly), and gives hotels **the dining room**. Of the GDD's seven v3.0 services three are built, one is already the bar's intelligence ticket, and three are cut with a reason. Designed 16 Oct 2026; building in [[Slice 8 A Life in the City|slice 8]].

## How it works

- **The bar places** (content): The Anchor (Coalport), the Mountain Inn (Duskwall), the Press Club, the Station Buffet, the Red Lantern and the Gate Tavern (Irongate), the Casino (Clearwater). Each has its own tier-1 tickets.
- **The bar's card** ([[GDD#19.3 Bars|GDD §19.3]], [[design/slice-8-life#24.3 The bar and its buffs (GDD §6.7, §19.3)|design §24.3]]), kicker *THE BAR · {place}*, one tap each:
  - ***Buy a round*** · 2 Energy · **30 Iron** · three a day → *in good spirits* ([[Buffs]]): +10 % XP on the next three missions, nine in hand at most;
  - ***A plate of something*** · 2 Energy · **100 Iron** → *well fed* for four hours: +10 % XP, Health +15 up to max.
- **The dining room** (a `hotel`: the Grand Hotel, the Pier Hotel, the Mountain Inn): ***Dinner*** · 2 Energy · **400 Iron** · worn Charisma 10 → *well fed, properly* for six hours: +10 % XP and +10 % Iron, Health +25 up to max. Barred: *Not dressed for the dining room*.
- **The back room** (from Rank 3; the Anchor, the Gate Tavern, the Red Lantern, the Mountain Inn's taproom, the Casino): forged papers and wire cutters ([[Equipment and Wardrobe]]) and **the bribe that clears a mark**: *Have a mark struck off*, **500 / 1,000 / 2,000** by the record's level, oldest first, one a day ([[GDD#11.4 Clearing a record|GDD §11.4]]); Julius Marr's Confidant favour halves it for a week ([[Patronage and Favours]]).
- **Not built, and why:** *Overhear conversation* is the bar's existing intelligence ticket (which carries the 10 % Dossier chance from slice 8); *Bribe the barman* would sell what the plate shows; the *Stimulant* duplicates *Get patched up* and its overdose was a punishment; *Faction recruitment* is Party XP for Energy, which the orders already are.

## Where it lives

**Rules:** [[GDD#19.3 Bars|GDD §19.3]] · [[GDD#6.7 Buffs (replaces "Physical Neglect")|GDD §6.7]] · [[GDD#11.4 Clearing a record|§11.4]] · [[GDD#25. Scope and roadmap|§25]] · [[design/slice-8-life|slice-8 design §3.5, §3.8 (the back room), §24.3 (the card, the buffs, copy, modals)]] · [[design/slice-8-screens|screens §18.4]] · [[economy|economy sheet]] §22.11 · [[adr/0051-wardrobe-four-slots-outfits-and-shops|ADR 0051]] (shops as cards on places) · [[tech/slice-8#24. Bodyguards and the bar (technical design, 16 Oct 2026; ADR 0088)|tech/slice-8 §24]] · [[adr/0088-bodyguards-a-run-in-row-on-a-day-key-contract-and-bar-buffs-as-lazy-personal-modifiers|ADR 0088]]

**Code:**
- Content: the bar places in `packages/content/src/data/cities/*.ts` (`kind: 'bar'`)
- Content (T27 data, 16 Oct 2026): `bar: true` on all seven bars and `dining: true` on the Grand Hotel, the Pier Hotel and the Mountain Inn in `cities/*.ts`; the back room (`shops: [{ kind: 'backRoom', bribe: true }]`) on the Anchor, the Gate Tavern, the Red Lantern, the Mountain Inn and the Casino; the cards' words, the modals and the help notes in `copy.ts` (`copy.life.bar`, `.shop`).
- Services: none yet. Planned (tech §24, tasks T31, T32): `Location.bar` / `Location.dining` are checked by the loader (`barProblems`); `BAR` prices in `packages/rules/src/constants.ts` and the gates in `packages/rules/src/buffs.ts`; `barService` (`bar.round`, `bar.meal`, `bar.dinner`, each one keyed character update); the `BarCard` and `DiningCard` in the place sheet's card slot; `bar.spec.ts`.

**Art needed** (design §24.6): `item.round`, `item.bar-plate`; the dining room uses `scene.hotel`.

## Status

**Partly built:** the bar places and their tickets (slices 1–5, 7). **Designed 16 Oct 2026, building:** the bar's card, the dining room, the back room and its bribe (slice 8).

## Decisions

- Slice 5 design §2.4: no bar services in slice 5.
- Slice 8 design: the *Black Market* is said as **the back room**; no random item.
- **14 Oct 2026 (the user):** the bar services and their buffs are **MVP, slice 8**.
- **16 Oct 2026 (the designer):** three services (a round, a plate, the hotel's dinner) and the back room; the round priced at 30; the barman's report, the stimulant and recruitment cut; Appendix C #111 closed.

## Open questions / drift

- Designer default for the user (design §24.7 #4): three services; the alternative is a *Bribe the barman* that tells you who was in the bar yesterday.
- [[design/city-quarters|city-quarters §3]] still says the Anchor's bar services come at Level 6 in *slice 5*; the card is Level 1, slice 8.

## Related

[[Buffs]] · [[Heat and Record]] · [[Equipment and Wardrobe]] · [[Patronage and Favours]] · [[The Dossier]] · [[Street Actions]] · [[Bodyguards]] · [[Slice 8 A Life in the City]]
