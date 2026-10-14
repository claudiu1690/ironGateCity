---
type: system
title: Buffs
aliases: [Well-Fed, Lodged, In Good Spirits, Weatherproof, Physical Neglect]
tags: [resource, economy]
status: designed
slice: "not built; Lodged and Weatherproof replaced by the home (slice 8); Well-Fed and In Good Spirits wait for a later slice"
gdd: ["§6.7"]
adrs: []
updated: 2026-10-14
---

# Buffs

## In one paragraph

Buffs are short bonuses bought with Iron: a meal, a night's lodging, a round at the bar, the right
coat for the weather. They replace v3.0's hunger, fatigue and exposure, which drained the player
for not eating or sleeping. In v3.1 food and lodging only ever *add* something, so skipping them
costs nothing (project rule: being away costs opportunity, never assets). None of them is built yet.

## How it works

The designed set ([[GDD#6.7 Buffs (replaces "Physical Neglect")|GDD §6.7]]; see the § for the full
table):

- **Well-Fed** (four grades): street food 50 Iron (+5 % XP, 3 h) up to a high-society dinner 1,500
  Iron at Charisma 25+ (+15 % XP and one exclusive political mission, 8 h). **Only one Well-Fed is
  active at a time**; the strongest applies.
- **Lodged:** basic lodging 100 / hotel 500 / safehouse free at Rank 3+, for +25 / +75 / +40
  [[Rested]]; the hotel restores full Health, the safehouse gives a briefing and Heat −20.
- **In Good Spirits:** the bar's *Buy a Round*, +10 % XP on the next 3 missions ([[Bars]]).
- **Weatherproof:** seasonal outerwear ignores weather penalties on outdoor missions while worn
  ([[Weather]], [[Equipment and Wardrobe]]).

## Where it lives

**Rules:** [[GDD#6.7 Buffs (replaces "Physical Neglect")|GDD §6.7]] ·
[[GDD#18.3 Sinks|GDD §18.3]] (meals and lodging as a sink) ·
[[design/slice-8-life|slice-8 design]] (the home replaces lodging)

**Code:** none. There is no buff state on the character and no buff content
(`packages/db/src/models/character.ts`, `packages/content/src/data/items.ts` checked).

## Status

**Not built.** Slice 8's note in §6.7: *Lodged* and *Weatherproof* are not built; the home (§17.4,
[[Residence]]) is the lodging, and its Rested arrives at the boundary (+10 a room, +25 a paid flat).
The Well-Fed buffs and *In Good Spirits* wait for a later slice that is not named.

## Decisions

- v3.1: the v3.0 "Physical Neglect" mechanics are removed; food, lodging and outerwear give
  bonuses instead of preventing penalties.
- Slice 8 (designed): lodging becomes the home.

## Open questions / drift

> [!warning] Drift
> **GDD §6.7 vs §6.4.** *Lodged* (safehouse) says *Heat −20*; §6.4 says safehouses make Heat cool
> *faster*. Two different effects for the same place; neither is built.

- Open: Well-Fed's Health part (+5 to +30) is not defined against the Health max (a top-up to
  max, or above it?).
- No slice owns Well-Fed or *In Good Spirits*: neither `docs/IMPLEMENTATION_PLAN.md` nor the
  slice-8/9 design docs mention them ([[design/slice-8-life|slice-8 design §3.9]] says only that
  *Weatherproof* and *Lodged* are not built).

## Related

[[Rested]] · [[Health]] · [[Bars]] · [[Residence]] · [[Weather]] · [[Equipment and Wardrobe]] ·
[[Iron Marks and the Economy]]
