---
type: system
title: Buffs
aliases: [Well-Fed, Well fed, Lodged, In Good Spirits, In good spirits, Weatherproof, Physical Neglect]
tags: [resource, economy]
status: designed
slice: "Well fed and In good spirits: 8 (designed 16 Oct 2026; building); Lodged replaced by the home; Weatherproof waits for weather"
gdd: ["§6.7", "§19.3", "§18.3", "§25"]
adrs: ["0052", "0088"]
updated: 2026-10-16
---

# Buffs

## In one paragraph

Buffs are short bonuses bought with Iron at a bar or a hotel: a round, a plate, a dinner. They replace v3.0's hunger, fatigue and exposure, which drained the player for not eating or sleeping; in v3.1 food only ever *adds* something, so skipping it costs nothing. The player never reads *buff*: the words are ***well fed***, ***well fed, properly*** and ***in good spirits***. Two are built in [[Slice 8 A Life in the City|slice 8]] (designed 16 Oct 2026); *Lodged* became the home and *Weatherproof* waits for weather.

## How it works

Per [[GDD#6.7 Buffs (replaces "Physical Neglect")|GDD §6.7]] and [[design/slice-8-life#24.3 The bar and its buffs (GDD §6.7, §19.3)|design §24.3]]:

- **Well fed** (*A plate of something* at any bar, 100 Iron, 2 Energy): **+10 % XP** on tier-1 actions and missions (society calls included; not training, chapters, event roles or the exposé's fixed rewards) and **Health +15 now, up to max**, for **four hours**.
- **Well fed, properly** (*Dinner* at a hotel's dining room, 400 Iron, 2 Energy, worn Charisma 10): **+10 % XP and +10 % Iron** on the same, **Health +25 up to max**, for **six hours**.
- **In good spirits** (*Buy a round*, 30 Iron, 2 Energy, three a day): **+10 % XP on the next three missions**; a second round adds three more, **nine in hand at most**.
- **One meal at a time, the better one:** a dinner replaces a plate; a plate over a dinner, or the same tier over itself, is dimmed (*Well fed until 19:40*). **Health never goes above max** (Appendix C #111 closed).
- **Lazy state** on the character (the meal's tier and end time; the rounds a count), no job. Each buff is **a line of its own on the receipt** (*Well fed · +10 % XP* · *In good spirits · +10 % XP · 2 left*), beside Rested and the party coat's +5 %, rounded per line ([[The Result Modal]]).
- **Away:** a meal's clock runs out whether or not you play (a timer that is a choice); rounds in hand wait. Nothing is taken.
- **Not built:** street food (+5 % is below what the receipt prints), the society dinner (needs its mission), the stimulant (cut: Health is free and *Get patched up* sells it), *Lodged* (the home is the lodging, [[Residence]]), *Weatherproof* ([[Weather]]).

## Where it lives

**Rules:** [[GDD#6.7 Buffs (replaces "Physical Neglect")|GDD §6.7]] · [[GDD#19.3 Bars|§19.3]] · [[GDD#18.3 Sinks|§18.3]] · [[design/slice-8-life|slice-8 design §24.3]] · [[design/slice-8-screens|screens §18.4–§18.5]] · [[economy|economy sheet]] §22.11 · [[adr/0052-personal-modifiers-items-perks-and-recognition|ADR 0052]] (a buff's percentage as a personal modifier) · [[tech/slice-8#24. Bodyguards and the bar (technical design, 16 Oct 2026; ADR 0088)|tech/slice-8 §24]] · [[adr/0088-bodyguards-a-run-in-row-on-a-day-key-contract-and-bar-buffs-as-lazy-personal-modifiers|ADR 0088]] (lazy state read as personal modifiers)

**Code** (rules T26, server T31 built 16 Oct 2026): `services/barService.ts` (the meals and rounds, `buffsView`); `buffsOf` in `services/personal.ts`; the shares through `personalShares` into tier-1 actions and missions (`Tier1ActionInput.personal`, `MissionInput.personal`); a round in hand is spent at the mission's start (`services/missionService.ts`). Planned at design time:
- `characters.buffs { wellFed { tier, until }, spirits { left } }` and `today.rounds` (lazy: a meal is an end time, never written when it ends; rounds are a count);
- `packages/rules/src/buffs.ts` (the gates, `afterMeal`, `afterRound`); `PersonalModifiers.buffs` and `buffShares` in `personal.ts`, giving named XP and Iron parts (`buff:wellFed`, `buff:spirits`), one receipt line each;
- a round is used up in the mission's own transaction (`spendSpirits`); Health through `healHealth`, so never above max.
- Settled 16 Oct 2026 (design §24.8, GDD §19.3): a round at seven or eight tops up to nine; every mission that reaches its rewards uses one; a meal counts at the mission's start. The receipt labels and the buff line are in `copy.ts` (`copy.life.bar.receipt`, `.meLine`; T6/T27, 16 Oct 2026).

## Status

**Server built (slice 8 phase B, 16 Oct 2026):** the buffs on every tier-1 action's and mission's receipt. The Me tab's line is `life.me`; the client is T32. *Lodged* and *Weatherproof* stay out for now (a question to the user is pending).

## Decisions

- v3.1: the v3.0 "Physical Neglect" mechanics are removed; food gives bonuses instead of preventing penalties.
- Slice 8 (designed): lodging becomes the home.
- **14 Oct 2026 (the user):** Well fed, In good spirits and the bar services are MVP, slice 8.
- **16 Oct 2026 (the designer):** two meal tiers and the round, priced 100 / 400 / 30; Health up to max only; the clocks four and six hours; nine missions in hand at most; separate receipt lines.

## Open questions / drift

- Appendix C #114: the buffs' sizes. If three meals a day become mandatory, the lever is the plate's price (100 → 150) and then the hours, never the percentage. Economy §22.11: about +12 % XP for 390 Iron a day; no §5.2 milestone moves by more than a day.
- Designer default for the user (design §24.7 #5): no Health above max.
- Open (the user): are *Lodged* and *Weatherproof* in or out of the MVP?

## Related

[[Rested]] · [[Health]] · [[Bars]] · [[Residence]] · [[Weather]] · [[Equipment and Wardrobe]] · [[Iron Marks and the Economy]] · [[The Result Modal]]
