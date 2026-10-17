---
type: system
title: Bodyguards
aliases: [Bodyguard, Protection, Someone to walk with you, A doorman, A steward, A minder]
tags: [risk]
status: designed
slice: "8 (designed 16 Oct 2026; building)"
gdd: ["§12", "§12.1", "§20.1", "§18.3", "§1.5", "§25"]
adrs: ["0088", "0056", "0032"]
updated: 2026-10-17
---

# Bodyguards

## In one paragraph

A bodyguard is a named man who walks with you for **a prepaid week** and **steps in first at a run-in**. The player never reads *bodyguard* on a label: the party store's card is ***Someone to walk with you*** and the three tiers are **a doorman, a steward and a minder**, civilians, never soldiers. In a run-in he is **a visible row with his own odds**, not a hidden modifier; he never argues with the police. When the week is up he goes and nothing else changes, which keeps "being away costs opportunity, never assets". MVP, [[Slice 8 A Life in the City|slice 8]]; designed 16 Oct 2026, building.

## How it works

Per [[GDD#12.1 Contracts (slice 8, pinned)|GDD §12.1]] and [[design/slice-8-life#24.2 Bodyguards (GDD §12, §20.1)|design §24.2]]:

- **Three tiers, one at a time**, hired on **the party store's card** (every HQ and capital house, members only): a **doorman** (Level 6, **400** Iron a week, power 28), a **steward** (Rank 3, **1,200**, power 36), a **minder** (Level 16, **3,000**, power 44). One price, the week; no hire fee. A name is drawn at hire (three per tier) and a portrait by tier.
- **In a run-in** ([[Run-ins and Combat]], [[GDD#20.1 The four options|GDD §20.1]]): the sheet's first row is ***{Name} steps in · {odds word} · his strength***, at **the Fight formula with his power in place of yours** (50 % + 3 % × (his − theirs), 5–95; the opponent scaled as for you). Works: the act is paid as rolled, no Health lost, +10 XP. Fails: he is down and the fight goes ahead at your Fight odds −10. **Never against the police** (the row dimmed). *Leave it to luck* counts the row as a free one. Against a street enforcer at home: 62 / 86 / 95 %.
- **Prepaid, renewed by hand**, at most **four weeks ahead**; **no auto-renew** (it would spend an absent player's Iron). A different tier waits for the week's end.
- **A lapse ends the row and nothing else**: the paper says *{Name} Has Gone Back to the Door*; Iron and the record stand; the card hires him again. Not an item: never in the Wardrobe, never sold.
- He goes everywhere you go; not into the cells, a journey card or a patrol stop (cards, not fights).
- Shown on the Me tab (*Walking with you · Ruda, a doorman · until Thursday*), the desk's *Ahead* on the last days, the run-in sheet.

## Where it lives

**Rules:** [[GDD#12. Bodyguards|GDD §12]] · [[GDD#20. Combat (NPC-only in MVP)|GDD §20]] · [[GDD#18.3 Sinks|§18.3]] · [[design/slice-8-life#24. Bodyguards and the bar (added scope, designed 16 Oct 2026)|slice-8 design §24]] (§24.2 rules and copy, §24.4 economy, §24.6 art, §24.7 points for the user) · [[design/slice-8-screens|screens §18]] · [[economy|economy sheet]] §22.11 · [[tech/slice-8#24. Bodyguards and the bar (technical design, 16 Oct 2026; ADR 0088)|tech/slice-8 §24]] (technical design, 16 Oct 2026) · [[adr/0088-bodyguards-a-run-in-row-on-a-day-key-contract-and-bar-buffs-as-lazy-personal-modifiers|ADR 0088]] (a run-in row on a day-key contract)

**Code** (rules T26, server T30 built 16 Oct 2026; the client is T32): `services/bodyguardService.ts` (`bodyguard.hire` / `.renew` in `trpc/routers/life.ts`, `hireCard`, `minderView`, `minderAtRunIn`, `minderLine`); his row written in `startRunInInTx` (`services/streetService.ts`, every run-in path), `encounter.choose('minder')` refused `NO_MINDER` / `NOT_AGAINST_POLICE`; `RunInPending.rows.minder`. Planned at design time:
- Rules: `BODYGUARD` in `packages/rules/src/constants.ts`; `packages/rules/src/bodyguard.ts` (`contractCounts`, `hireGate`, `hire`, `renewed`, `canRenew`); `runIn.ts` gains the choice `minder`, the outcome `minded` and `minderChance` (the v3.0 +5 power and +5 % Run per tier are never built).
- Data: `characters.bodyguard { tier, name, paidThroughDay }` (a day key, like the flat's rent; kept after a lapse so a re-hire keeps his name); `encounters.minder` and `chances.minder`, frozen when the run-in fires.
- Content (**written, T27 data, 16 Oct 2026**): `packages/content/src/data/bodyguards.ts` (the three tiers' names, portraits and run-in lines); `hire: true` on all six party stores in `cities/*.ts`; the card's, the Me tab's, the run-in row's, the modals' and the help note's words in `copy.ts` (`copy.life.minder`), with the two paper lines in five voices waiting there for the `bodyguardLast` / `bodyguardGone` conditions.
- Server: `bodyguardService` (`bodyguard.hire` at your party store, `bodyguard.renew` from anywhere); the row in `encounterService`; the paper's `bodyguard-last` / `bodyguard-gone` from the settlement. No job.
- Client (**built, T32, phase C lane P, 16 Oct 2026**): `packages/ui/src/components/Minder.tsx` (`HireCard`, `HireConfirm`, `MinderRow`, `MinderEncounterRow` as the run-in sheet's first row in `Street.tsx`, `MinderResultRow` for the renewal's modal); `apps/client/src/features/life/PlaceLife.tsx` (the card at the party store), `MeLife.tsx` (`MeMinder`, *Walking with you*); `StreetView.runIn.minder { name }` for *{Name} was pushed aside*; e2e `apps/client/e2e/bodyguard.spec.ts` (project `bodyguard`).

**Art needed** (design §24.6): `portrait.doorman`, `portrait.steward`, `portrait.minder` (Noir Lithograph; no uniform, badge, armband or weapon).

## Status

**Server built (slice 8 phase B, 16 Oct 2026):** the hire, the renewal, the card, his row at every run-in, *minded* with his line. Waiting: the paper's two lines (lane 2's paper, T16), the dev hooks (T17, built `908d996`). **The client is built (T32, `2af2468`, `6bb7ff8`):** the hire card, *Walking with you*, his run-in row (dimmed against the police) and the result's lines. The user moved bodyguards into the MVP on 14 Oct 2026; the design above replaces GDD §12's v3.0 contract (hire fee, two at a time, auto-renew, three hidden modifiers).

**Integration (17 Oct 2026, `8ae302a`):** the full e2e is green; design §25 #1 is built: a row whose chance sits at the ceiling (95) adds *as good as odds get* (`HireRowView.capped`, `bodyguardService.cardChance`; the minder's hire row and his run-in row). Slice-8 screens are swept for *bodyguard, guard, escort, muscle, enforcer* (`lifeSweep`; *a street enforcer* stays). ADR 0088 accepted.

## Decisions

- v3.1 rework: prepaid contracts, nothing taken on lapse (GDD §0, the absence rule).
- **14 Oct 2026 (the user):** MVP, slice 8.
- **16 Oct 2026 (the designer):** the party store, not the back room (Appendix C #110 closed); one price per week, 400 / 1,200 / 3,000; a visible row at the Fight formula with his power; never against the police (Appendix C #113); no auto-renew; four weeks ahead at most.
- **17 Oct 2026 (the designer, phase C; design §25 #1):** the steward (86 %) and the minder (95 %) both read *Good odds* and the three odds words stay (GDD §8.4, no fourth band); a row at the formula's ceiling (95) adds the tag ***as good as odds get*** on the hire card and on his run-in row (`copy.life.minder.asGoodAsTheyGet`). Code: `HireRowView.capped`, the card and the run-in row (developer).

## Open questions / drift

- ~~Architect's questions to the designer (tech §24.10)~~ **settled 16 Oct 2026 (design §24.8):** four weeks ahead is four beyond the running week; re-hiring the same tier keeps his name; no record surcharge; **the card shows the mission's figure** (62 / 50, 86 / 74; *against a street enforcer, on a mission at home*); GDD §12.1 says *on a mission*.
- Designer defaults for the user (design §24.7): never against the police; the party store for all three tiers; one at a time with no mid-week replacement. Levers: Appendix C #113 and economy §22.10's bodyguard row (his power or the police's share, never the price).
- The slice-5 design and tech spec still call bodyguards *after the MVP* (written before 14 Oct 2026).

## Related

[[Run-ins and Combat]] · [[Hospital and Treatment]] · [[Heat and Record]] · [[Hostile Ground]] · [[Night and Patrols]] · [[Equipment and Wardrobe]] · [[Iron Marks and the Economy]] · [[Slice 8 A Life in the City]]
