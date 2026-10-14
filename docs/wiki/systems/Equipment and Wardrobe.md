---
type: system
title: Equipment and Wardrobe
aliases: [Equipment, Wardrobe, Items, Inventory, Outfits, Keepsakes, Shops, Coat]
tags: [character, slice-8]
status: partly built
slice: "2 (two slots, starting kit, keepsakes); the Wardrobe designed for 8"
gdd: ["§21", "§21.1", "§21.2", "§21.3", "§21.4", "§8.2", "§20.3"]
adrs: ["0014", "0051", "0052"]
updated: 2026-10-14
---

# Equipment and Wardrobe

## In one paragraph

What you wear is who you are in Irongate: **Charisma is worn** ([[Stats and Checks|§8.2]]), so the coat on your back is your main Charisma source, and its tier gives a little armour in a [[Run-ins and Combat|run-in]]. Today the game has **two slots** (a coat and your papers), the faction's starting outfit, the origin coat, the party card and the Ambition **keepsakes**. The full **Wardrobe** (four slots, named outfits, shops on places, eighteen new items with small effects) is **designed for slice 8 and not built**. There are **no weapons**: this is a political contest.

## How it works

**Built (slice 2, [[GDD#21.4 The starting catalogue (slice 2)|GDD §21.4]]):**
- **Two slots:** *clothing* (the coat) and *document* (papers).
- **A new character** starts with 0 Iron, the faction's Tier I outfit worn (work jacket / mill coat / worn overcoat, CHA 2), the **party card**, and the **demob suit** (CHA 5) if the origin gave it.
- **Keepsakes** are unique: never sold, crafted, given or lost. Most have no slot and simply exist for later chapters to read (*The unit's list*, *Your election bill*, *A page of the ring's ledger*…; [[Ambitions]]).
- **Worn Charisma is computed on read**, never stored: the origin's base plus what is worn.
- **Armour** comes from the coat's tier: **Tier I = 4**, so +2 power in a fight.
- The party card is what *Show your papers* shows at checkpoints and to a patrol ([[Hostile Ground]], [[Night and Patrols]]).

**Designed (slice 8, [[GDD#21.1 Slots|GDD §21.1]]–[[GDD#21.3 Where equipment comes from|§21.3]]):**
- **Four slots**, in the player's words: **Coat** (armour by tier; a party coat +5 % Party XP), **On you** (the badge, a patron's piece), **Papers** (forged papers, the press pass), **Tools** (+5 to +10 % on one kind of work).
- **Effects** are a closed list of three: `chancePct` 5–10 on one kind of work, `fxpPct` 5, `dossierChance` 5–15. No item touches Energy, Iron, Rested or opinion.
- **Tiers**, said as what they are: work clothes (Level 1, CHA 2–5) · a good coat (Level 6, 10–15) · a tailor's suit (Level 16, 20–28) · a society wardrobe (Level 31, 30–40) · Tier V post-MVP.
- **Outfits:** *Town* and *Plain clothes* from the start, *Evening* with a paid flat ([[Residence]]); one tap changes the whole set; locked only in the cells, the infirmary and on a train (the journey to rival ground offers *Change into plain clothes*).
- **Shops are cards on places:** the clothes stall (`market`), the party store (HQ), the tailor (`hotel`, the Mountain Inn), the press (Herald House, Gazette House), the back room of a `bar` from Rank 3 ([[Bars]]). The record raises prices (+15 % / +30 %). The clothes stall buys anything sellable at a tenth; keepsakes, the kit and a worn item are never sold.
- **Eighteen items and eleven keepsakes** are listed in [[design/slice-8-life#3.9 The catalogue (GDD §21.4, the slice-8 additions)|slice-8 design §3.9]].
- **Charisma cuts both ways:** high worn Charisma makes you *recognised* on rival ground (more run-ins); plain clothes hide you ([[Hostile Ground]]).

## Where it lives

**Rules:** [[GDD#21. Equipment|GDD §21]] · [[GDD#8.2 Charisma is worn|§8.2]] · [[GDD#20.3 Weapons and armour|§20.3]] · [[design/slice-2-onboarding|slice-2 onboarding §4]] (kit and art) · [[design/slice-8-life#3. The Wardrobe (GDD §8.2, §21)|slice-8 design §3]] · [[design/slice-8-screens|slice-8 screens §2–§5]] · [[design/inventory-research|inventory research]] (what other games do; the recommendation in §4) · [[adr/0014-items-catalogue-in-content-inventory-embedded|ADR 0014]] · [[adr/0051-wardrobe-four-slots-outfits-and-shops|ADR 0051]] · [[adr/0052-personal-modifiers-items-perks-and-recognition|ADR 0052]]

**Code:**
- Rules: `packages/rules/src/items.ts` (`ItemSlot = 'clothing' | 'document'`, `equippedItems`, `wornCha`, `grantItem`); `armourOf` in `runIn.ts`; `ARMOUR_BY_TIER` in `constants.ts`
- Server: `wornStats` in `apps/server/src/services/views.ts` (the one place checks and views get Charisma)
- Data: catalogue `packages/content/src/data/items.ts` (11 items today); `ItemSlot` in `schemas.ts`; embedded `characters.inventory [{ uid, itemId, day, source }]` and `characters.equipment { clothing, document }`
- Client: the Me tab (`apps/client/src/routes/me.tsx`)

## Status

**Partly built.** Two slots, the starting kit and the keepsakes since [[Slice 2 Arrival|slice 2]]; armour used by run-ins since slice 5; review 5 renamed items (*Your father's coat* → *The demob suit*; ids kept). **Designed, not built:** the Wardrobe, shops, outfits, item effects, recognition (slice 8). **Post-MVP:** Tier V, crafting, drops, trading.

## Decisions

- Slice 8 design (4 Oct 2026): no weapon slot, no weapon items (Appendix C #74); the revolver and truncheon art is not catalogued.
- 4 Oct 2026: the user asked for the inventory research before the Wardrobe was designed.
- Review 5 (8 Oct 2026): items re-strung for *Coming home*; ids unchanged.

## Open questions / drift

- None open here. (The `ItemSlot` comment in `packages/rules/src/items.ts` that promised a weapon slot was corrected on 14 Oct 2026: four slots, no weapon slot.) Bodyguards, also slice 8, are on [[Bodyguards]].

## Related

[[Stats and Checks]] · [[Run-ins and Combat]] · [[Hostile Ground]] · [[Bars]] · [[Residence]] · [[Ambitions]] · [[Patronage and Favours]] · [[The Dossier]] · [[Heat and Record]] · [[Iron Marks and the Economy]]
