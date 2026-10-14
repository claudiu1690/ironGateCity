---
type: system
title: Buffs
aliases: [Well-Fed, Lodged, In Good Spirits, Weatherproof, Physical Neglect]
tags: [resource, economy]
status: designed
slice: "Well-Fed and In Good Spirits MVP, slice 8, not built yet (decided 14 Oct 2026); Lodged replaced by the home (slice 8); Weatherproof waits for weather"
gdd: ["§6.7", "§19.3", "§25"]
adrs: []
updated: 2026-10-14
---

# Buffs

## In one paragraph

Buffs are short bonuses bought with Iron: a meal, a night's lodging, a round at the bar, the right
coat for the weather. They replace v3.0's hunger, fatigue and exposure, which drained the player
for not eating or sleeping. In v3.1 food and lodging only ever *add* something, so skipping them
costs nothing (project rule: being away costs opportunity, never assets). None of them is built yet; **Well-Fed and *In Good Spirits* are MVP, slice 8** (the user, 14 Oct 2026).

## How it works

The designed set ([[GDD#6.7 Buffs (replaces "Physical Neglect")|GDD §6.7]]; see the § for the full
table):

- **Well-Fed** (four grades): street food 50 Iron (+5 % XP, 3 h) up to a high-society dinner 1,500
  Iron at Charisma 25+ (+15 % XP and one exclusive political mission, 8 h). **Only one Well-Fed is
  active at a time**; the strongest applies.
- **Lodged:** basic lodging 100 / hotel 500 / safehouse free at Rank 3+, for +25 / +75 / +40
  [[Rested]]; the hotel restores full Health; a safehouse makes **Heat cool faster** there ([[Heat and Record]]; it said Heat −20 until 14 Oct 2026).
- **In Good Spirits:** the bar's *Buy a Round*, +10 % XP on the next 3 missions ([[Bars]]).
- **Weatherproof:** seasonal outerwear ignores weather penalties on outdoor missions while worn
  ([[Weather]], [[Equipment and Wardrobe]]).

## Where it lives

**Rules:** [[GDD#6.7 Buffs (replaces "Physical Neglect")|GDD §6.7]] ·
[[GDD#18.3 Sinks|GDD §18.3]] (meals and lodging as a sink) ·
[[design/slice-8-life|slice-8 design]] (the home replaces lodging) · [[tech/slice-8|tech/slice-8]] §1.1 (added scope: a buff as lazy state on the character, a named part in rewards; to be designed) · [[GDD#25. Scope and roadmap|GDD §25]]

**Code:** none. There is no buff state on the character and no buff content
(`packages/db/src/models/character.ts`, `packages/content/src/data/items.ts` checked).

## Status

**Not built.** **The Well-Fed buffs and *In Good Spirits* (with the bar services) are MVP, slice 8
(A Life in the City), not built yet** (the user, 14 Oct 2026; GDD §6.7, §25); still to be designed in
the slice-8 docs. *Lodged* is not built as a buff: the home (§17.4, [[Residence]]) is the lodging,
and its Rested arrives at the boundary (+10 a room, +25 a paid flat); the safehouse row waits for the
faction-only places (later). *Weatherproof* waits for weather ([[Weather]]).

## Decisions

- v3.1: the v3.0 "Physical Neglect" mechanics are removed; food, lodging and outerwear give
  bonuses instead of preventing penalties.
- Slice 8 (designed): lodging becomes the home.
- **14 Oct 2026 (the user, drift cleanup):** Well-Fed, *In Good Spirits* and the bar services are MVP, slice 8. Lodged and Weatherproof stay out for now (a question to the user is pending).

## Open questions / drift

- [[GDD#Appendix C — Open questions|Appendix C #111]]: may Well-Fed's Health part (+5 to +30) take
  Health above max? Default: **up to max only**. Also the meal prices against today's economy.
- Open (the user): are *Lodged* and *Weatherproof* in or out of the MVP?

## Related

[[Rested]] · [[Health]] · [[Bars]] · [[Residence]] · [[Weather]] · [[Equipment and Wardrobe]] ·
[[Iron Marks and the Economy]]
