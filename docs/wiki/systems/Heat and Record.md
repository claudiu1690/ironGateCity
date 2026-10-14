---
type: system
title: Heat and Record
aliases: [Heat, Criminal Record, Record, Marks, Caught check, Your record]
tags: [resource, timer, risk]
status: partly built
slice: "5; review 4 (an arrest always marks)"
gdd: ["§6.4", "§11", "§11.1", "§11.2", "§11.3", "§11.4"]
adrs: ["0033", "0078"]
updated: 2026-10-14
---

# Heat and Record

## In one paragraph

Illegal political work (vandalism, disruption, theft, sabotage) has two costs that add up. **Heat**
is short-term attention: it rises with every illegal mission and cools within a day. The **record**
is long-term: a mission that goes wrong can get your name taken, and the marks on your record tax
the road that earned them. Neither ever touches what a player owns, and Heat never changes the odds
of a check: it changes the run-in chance and the separate caught check.

## How it works

### Heat ([[GDD#6.4 Heat (new)|GDD §6.4]])

- **0–100, cools 5 an hour** (100 → 0 in about 20 h), continuously and lazily. The rate is the
  **residence** city's (the *Customs Strike* Issue cools +50 %; safehouses later).
- **Rises on every outcome** of an illegal or watching mission: surveillance +5, vandalism +6,
  disruption +8, theft +10, sabotage +12; **×2 on rival ground** ([[Hostile Ground]]). Also +10
  for a parcel card's Partial, a failed *Pay them off*, or a checkpoint that writes your name down.
- **States:** *Cool* 0–24 · *Noticed* 25–49 (run-ins and the caught check +5 %, the police join the
  run-in pool) · *Hot* 50–74 (+15 %; a caught check that lands means the cells; the press names you)
  · *Wanted* 75–100 (as Hot, and a Failure on an illegal mission is the cells without a roll).
- The state is read **after** the mission's own gain. After the cells, Heat is set to **25**.
- **On the HUD only above 0**, its own line under Health (*Heat 60 · Hot*), with a help note by
  state. Also on the desk, the result's knock-on line and the Me tab.

### Getting caught ([[GDD#11.2 Getting caught|GDD §11.2]])

- Rolled **once per illegal mission that did not come off clean** (Partial or Failure, never a
  Success), after the run-in. Chance = base by type + Heat ÷ 2 + the state's bonus + 5 for a
  *Repeat offender* − Agility ÷ 2, kept 2–95 %. Base and Heat doubled on rival ground.
- **Caught while Cool or Noticed:** your name is taken (marks go on, the result stands).
  **Caught while Hot or Wanted:** the cells ([[Jail and the Cells]]).
- **An arrest is always at least one mark** (review 4): the type's marks, or one minor mark for work
  that carried none. A second arrest within 7 days escalates to serious.
- Extended surveillance has no caught check and no mark. The player sees no number: the ticket says
  *if caught, a mark on your record*.

### The record ([[GDD#11.3 Record levels|GDD §11.3]])

- Read as **your record**, counted in **marks**. Levels: *Clean* 0 · *On file* 1–2 (−10 % Iron) ·
  *Repeat offender* 3–5 (−20 % Iron, +5 % run-ins and caught) · *Notorious* 6+ (−30 % Iron; barred
  from courts, universities and the Alliance's HQs).
- The Iron penalty applies to **tier 2 and up only**: tier-1 actions are untouched.
- Private in the MVP: the Me tab, the desk and the mission ticket's Iron tag show it.

### Clearing it ([[GDD#11.4 Clearing a record|GDD §11.4]])

- **Time:** minor marks fade **14 City Days after the last offence** (built).
- **Connections:** **30 Political Capital strikes any mark**, oldest first, one tap on the Me tab
  (built; stamp *Struck off*).
- **Bribe** in a bar's back room, 500 / 1,000 / 2,000 Iron a mark by level (slice 8, not built);
  **Political Protection** at Rank 4 (not built); the **Rehabilitation Act** (slice 7, not built).

## Where it lives

**Rules:** [[GDD#6.4 Heat (new)|GDD §6.4]] · [[GDD#11. Heat & Criminal Record|GDD §11]] ·
[[design/slice-5-risk|slice-5 risk §6, §7]] · [[design/review-4-answers|review 4 answers §12, §20]] ·
[[economy|economy sheet §19.4]] (Heat budget) ·
[[adr/0033-heat-health-record-held-lazy|ADR 0033]] ·
[[adr/0078-the-cells-costs-orders-off-an-arrest-always-marks-and-the-cells-list|ADR 0078]] ·
[[qa/slice-5-report|QA report, slice 5]]

**Code:**
- Rules: `packages/rules/src/heat.ts` (`heatState`, `coolRate`, `projectHeat`, `addHeat`, `heatEta`)
  · `packages/rules/src/record.ts` (`liveMarks`, `recordLevel`, `recordView`, `marksFor`,
  `arrestOnRecord`, `strikeOldest`, `barredByRecord`) · `HEAT`, `CAUGHT`, `RECORD`,
  `MISSION_TYPES` in `packages/rules/src/constants.ts` · `packages/rules/src/missions.ts`
- Server: `apps/server/src/services/risk.ts` · `missionService.ts` · `heldService.ts` · router
  `apps/server/src/trpc/routers/held.ts` (`strike`)
- Data: `characters.heat { value, at }`, `characters.record { marks, arrests }`
  (`packages/db/src/models/character.ts`)
- Client: `HeatRow` in `packages/ui/src/components/Street.tsx`, `HudBar.tsx`; the record row on
  `apps/client/src/routes/me.tsx`

## Status

Built in slice 5; review 4 made every arrest a mark and moved Heat to a body line. Not built: the
bribe (slice 8), the shop surcharge and the *−5 % vote appeal* (slices 7–8), Political Protection,
the Rehabilitation Act, safehouses.

## Decisions

- 3 Oct 2026 (slice 5): *Known* renamed *On file*; the caught check fires only on a Partial or a
  Failure (Appendix C #56); the record's Iron penalty is on missions only (#49); the cooling rate is
  the residence city's.
- [[Review 4]] (6 Oct 2026): an arrest is always at least one mark.

## Open questions / drift

> [!warning] Drift
> **GDD §11.2 opening vs its slice-5 paragraph.** The opening line says *every illegal action
> rolls a caught check* and *being caught while Hot or Wanted means arrest*. The slice-5 paragraph
> (and the code) roll it only on a Partial or a Failure. The later paragraph wins; the older line
> is still printed.

> [!warning] Drift
> **GDD §11.4 bullets vs §11.3.** The bribe bullet still says *500 IM per point at Known*; the level
> is now *On file* and the slice-8 price list is 500 / 1,000 / 2,000.

> [!warning] Drift
> **GDD §6.7 vs §6.4.** The *Lodged* buff says a safehouse gives *Heat −20*; §6.4 says safehouses
> cool Heat *faster*. Neither is built.

## Related

[[Jail and the Cells]] · [[Run-ins and Combat]] · [[Missions]] · [[Hostile Ground]] ·
[[Political Capital]] · [[Health]] · [[Night and Patrols]] · [[Lazy Timers]]
