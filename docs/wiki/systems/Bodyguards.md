---
type: system
title: Bodyguards
aliases: [Bodyguard, Protection]
tags: [risk]
status: designed
slice: "MVP, slice 8, not built yet (decided 14 Oct 2026; still to be designed)"
gdd: ["§12", "§12.1", "§20.1", "§25"]
adrs: []
updated: 2026-10-14
---

# Bodyguards

## In one paragraph

Bodyguards are hired protection against [[Run-ins and Combat|run-ins]]. In the GDD they **only protect** (the *Eliminate* mode is a v1.5 PvP feature). They are hired on **prepaid 7-day contracts**: when a contract ends the bodyguard leaves and nothing is taken, which keeps the rule "being away costs opportunity, never assets". **MVP, slice 8, not built yet** (the user, 14 Oct 2026); the slice-8 design and tech docs still have to add them.

## How it works

Per [[GDD#12.1 Contracts (reworked)|GDD §12.1]] (v3.1 text, not pinned yet; until built, §20's bodyguard terms are 0):

- **Three tiers:** street thug (hire 500, contract 350), trained enforcer (2,000 / 1,400), elite operative (8,000 / 5,600).
- **Protection** grows by tier: −10 / −20 / −30 % run-in damage and +5 / +10 / +15 % to Run. The enforcer and the operative have a 15 % / 25 % chance to avoid the infirmary; the operative intercepts one ambush a day.
- **At most two** active (one elite operative).
- **Where:** the design names Vanguard House, safehouses, or the Black Market (any faction, +25 %). Of those only the Black Market exists in the plan, as **the back room** of a bar ([[Bars]]); Vanguard House's gym and the safehouses are faction-only places, built later. The default is a contract card in the back room ([[GDD#Appendix C — Open questions|Appendix C #110]]).
- **Contracts are prepaid.** Renew by hand or auto-renew. Being unable to pay at midnight no longer dismisses them.
- **In combat** ([[GDD#20.1 The four options|GDD §20.1]]): +5 power per bodyguard tier, and +5 % per tier to Run.

## Where it lives

**Rules:** [[GDD#12. Bodyguards|GDD §12]] · [[GDD#20. Combat (NPC-only in MVP)|GDD §20]] · [[GDD#25. Scope and roadmap|GDD §25]] · [[tech/slice-8|tech/slice-8]] §1.1 (added scope: the likely shape is an embedded `bodyguard { until, tier }`, a named row in the run-in, a lapse by day key) · [[design/slice-5-risk|slice-5 design §10.3, §11.6]] (written when they were "after the MVP") · [[design/content-policy-review|content-policy review]] (Vanguard House "cheaper bodyguards")

**Code:** none. `packages/rules/src/runIn.ts` computes power as STR × 1.5 + armour ÷ 2, with no bodyguard term; `RUN_IN` in `constants.ts` has no bodyguard field.

## Status

**MVP, slice 8, not built yet.** The user moved them from *After the MVP* into slice 8 on 14 Oct 2026. GDD §12 and §25 and the plan say so; [[tech/slice-8|tech/slice-8]] §1.1 lists what the technical design must settle, after the game-designer's slice-8 design update. The slice-5 design and tech spec still call them *after the MVP* (written before the decision).

## Decisions

- v3.1 rework: prepaid contracts, nothing taken on lapse (GDD §0, the absence rule).
- **14 Oct 2026 (the user, drift cleanup):** bodyguards are MVP, built in [[Slice 8 A Life in the City|slice 8]].

## Open questions / drift

- [[GDD#Appendix C — Open questions|Appendix C #110]]: the §12.1 prices were written for v3.0's economy (hire 500–8,000 Iron against today's ~1,000 Iron a day) and need checking so a street thug is a week's choice and an elite operative a month-1 goal; and where the contract card lives (default: the back room; the Black Market's +25 % dropped unless a cheaper source exists).

## Related

[[Run-ins and Combat]] · [[Hospital and Treatment]] · [[Equipment and Wardrobe]] · [[Hostile Ground]] · [[Iron Marks and the Economy]]
