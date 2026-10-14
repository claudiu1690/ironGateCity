---
type: system
title: Bodyguards
aliases: [Bodyguard, Protection]
tags: [risk, post-mvp]
status: parked
slice: "none (GDD §25 says MVP; the plan and slice designs say after the MVP)"
gdd: ["§12", "§12.1", "§20.1"]
adrs: []
updated: 2026-10-14
---

# Bodyguards

## In one paragraph

Bodyguards are hired protection against [[Run-ins and Combat|run-ins]]. In the GDD they **only protect** (the *Eliminate* mode is a v1.5 PvP feature). They are hired on **prepaid 7-day contracts**: when a contract ends the bodyguard leaves and nothing is taken, which keeps the rule "being away costs opportunity, never assets". **Nothing is built and no slice designs them.**

## How it works

Per [[GDD#12.1 Contracts (reworked)|GDD §12.1]] (v3.1 text, not pinned by any slice):

- **Three tiers:** street thug (hire 500, contract 350), trained enforcer (2,000 / 1,400), elite operative (8,000 / 5,600).
- **Protection** grows by tier: −10 / −20 / −30 % run-in damage and +5 / +10 / +15 % to Run. The enforcer and the operative have a 15 % / 25 % chance to avoid the infirmary; the operative intercepts one ambush a day.
- **At most two** active (one elite operative).
- **Where:** Vanguard House, safehouses, or the back room / black market (any faction, +25 %).
- **Contracts are prepaid.** Renew by hand or auto-renew. Being unable to pay at midnight no longer dismisses them.
- **In combat** ([[GDD#20.1 The four options|GDD §20.1]]): +5 power per bodyguard tier, and +5 % per tier to Run.

## Where it lives

**Rules:** [[GDD#12. Bodyguards|GDD §12]] · [[GDD#20. Combat (NPC-only in MVP)|GDD §20]] · [[design/slice-5-risk|slice-5 design §10.3, §11.6]] ("bodyguards are later" / "after the MVP") · [[design/content-policy-review|content-policy review]] (Vanguard House "cheaper bodyguards")

**Code:** none. `packages/rules/src/runIn.ts` computes power as STR × 1.5 + armour ÷ 2, with no bodyguard term; `RUN_IN` in `constants.ts` has no bodyguard field.

## Status

**Parked.** Not built, and not in any slice design (slices 6–9 do not mention them). The slice-5 design and tech spec list bodyguards as *after the MVP*, and the implementation plan's *After the MVP* list names them.

## Decisions

- v3.1 rework: prepaid contracts, nothing taken on lapse (GDD §0, the absence rule).

## Open questions / drift

> [!warning] Drift
> [[GDD#25. Scope and roadmap|GDD §25]] marks **Bodyguards (Protect) ✔ at launch (MVP)**. The implementation plan (*After the MVP*: "Ministers · bodyguards · …"), [[design/slice-5-risk|slice-5 design §11.6]] ("bodyguards (after the MVP)") and [[tech/slice-5|tech spec slice 5]] put them after the MVP, and no slice 6–9 design includes them.

> [!note] Inference
> The §12.1 numbers were written against v3.0's economy (hire fees of 500–8,000 Iron against today's ~1,000 Iron a day) and have not been re-checked by the economy sheet. They would need a balance pass before any build.

## Related

[[Run-ins and Combat]] · [[Hospital and Treatment]] · [[Equipment and Wardrobe]] · [[Hostile Ground]] · [[Iron Marks and the Economy]]
