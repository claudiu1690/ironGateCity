# ADR 0051 — The Wardrobe: four slots of inventory uids, outfits as saved uid sets, shops as cards on places

**Status:** proposed (slice 8; extends ADR 0014) · **Date:** 2026-10-04

## Context

Slice 8 makes Charisma a decision (GDD §8.2, §21; `docs/design/slice-8-life.md` §3; screens §2–§5):

- four slots, *Coat · On you · Papers · Tools*; the coat is never taken off;
- two named outfits from the start, *Town* and *Plain clothes*, and *Evening* with a paid flat; one tap changes the whole set; saving is explicit (*Keep this as Town*); changing is locked in the cells, the infirmary and on a train, except the journey's *Change into plain clothes*, which takes effect at the station;
- shops are cards on places (the clothes stall, the party store, the tailor, the press, the back room), each selling one of each item; prices rise with the record (+15 % / +30 %); shops buy back at a tenth, after a confirm; keepsakes and the kit are never sold;
- worn Charisma adds +2 while in the city of a paid flat.

ADR 0014 put the catalogue in content and `inventory[]` and `equipment` (of inventory uids) on the character, computing worn Charisma on read, and left the other slots to this slice.

## Decision

1. **The catalogue stays content.** `ItemSlot` becomes `clothing | accessory | document | utility`. An item gains `effects` (ADR 0052), `price`, `level`, `rank`, `factionId`, `members` and `keepsakeFrom`. **Armour is not a field**: it is the coat's tier's (`armourOf`, slice 5), so a coat and its tier cannot disagree.
2. **`equipment` grows to four uids**; `clothing` is never null.
3. **Outfits are saved uid sets:** `outfits { town, plain, evening | null }` and `lastOutfit`. **Which chip is inverted is computed** (`outfitOf`: the first saved set equal to what is worn), never stored, so a single item worn from a chooser can never leave a stale "wearing Town". `lastOutfit` only names the outfit *Keep this as …* offers.
4. **Dressing is a set-to-state write** (`wear`, `takeOff`, `outfit`, `keep`) under the character's version guard, with **no request key** (ADR 0008's allowance: the end state is the request) and **no modal**. The guards are pure (`wearGate`).
5. **Dressing for arrival** is a field on the journey (`dress: 'plain'`), applied by `settleArrival` in the same conditional update that moves the character (ADR 0025), so it happens once at the station whether the lazy path or the tidy job arrives first.
6. **Shops are content on the place**: `Location.shops[]` (`kind`, `items`, `buys: 'any' | 'own' | null`, `bribe`), at most two per place (the Mountain Inn has the tailor and the back room). The price, the record's surcharge, the Level, Rank, faction and membership gates are computed on the server from content and the character. A buy or a sale is one version-guarded character update with an ADR 0008 request key. **One of each item** (`ALREADY_OWNED`), so the inventory stays bounded.
7. **A sale never leaves a dangling uid**: a worn item is refused (*Take it off first*); an item saved in an outfit leaves it in the same update (a coat falls back to the kit's work clothes).
8. **Worn Charisma** stays computed in one place (`wornStats`): the origin's base, the coat, what is on you, and the flat's +2 (ADR 0056).

## Consequences

- One character read still answers "what am I wearing and what is my Charisma".
- Adding an item or a shop is a content change; the loader checks the shop's place kind, the faction's store and the prices.
- A double tap on a chip is harmless; a double tap on *Buy* replays its stored result.
- Duplicates and crafting (post-MVP) would need `ALREADY_OWNED` relaxed; the uid model already allows two instances.
