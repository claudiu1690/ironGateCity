---
type: system
title: Rested
aliases: [Rested pool, Rested bonus]
tags: [resource, timer, retention]
status: built
slice: "1; cap rule in 4 (residence, the room); home sources designed for 8"
gdd: ["§6.3", "§4.2"]
adrs: ["0005", "0021", "0030", "0071"]
updated: 2026-10-14
---

# Rested

## In one paragraph

Rested is the Energy a player would have lost by being away. While the Energy bar is full, the
regen overflows into a Rested pool, and later each Energy point spent draws one Rested point for a
bonus on XP and Iron. It means a once-a-day player loses nothing by not logging in every three
hours, while a frequent player simply does more. It never boosts Party XP or influence, so absence
can't be turned into political power.

## How it works

- **Cap 200** ([[GDD#6.3 Rested (new)|GDD §6.3]]). Filled by the Energy overflow (+5 every 10
  minutes while Energy is full).
- **Effect:** each Energy point spent on a boostable action (checked actions, missions, chapters
  and training) while Rested > 0 uses 1 Rested and gives **+50 % XP and +50 % Iron** on that
  action. **Party XP and opinion get nothing.**
- **Per point, not per action:** 3 Rested on a 10-Energy action gives +15 % (the modal reads
  *Rested: 3 of 10 Energy, +15 % XP and Iron*). Nothing is held back or wasted.
- **Whose cap** (slice 4): 200 + the **residence** city's council rule and Issue effects of the
  day + 50 for a room in Irongate while it runs. One rule: *actions where you act, the wage where
  the job is, the Rested cap where you live.* A pool above a lapsed cap keeps its value and banks
  nothing more.
- **Other sources** (designed): the home at every boundary (+10 a rented room, +25 a paid flat,
  slice 8; [[Residence]]); the *Welcome back* fill to the cap after 30 days away (slice 9).
- **Lodged** buffs (+25 / +75 / +40) from [[Buffs]] are not built; the home replaces them.

## Where it lives

**Rules:** [[GDD#6.3 Rested (new)|GDD §6.3]] · [[GDD#4.2 What being away costs|GDD §4.2]] ·
[[economy|economy sheet §3, §6]] · [[adr/0021-ordinance-effects-closed-dsl-day-constant|ADR 0021]]
(a pool above the cap keeps its value) ·
[[adr/0030-modifier-sources-and-named-factors|ADR 0030]] (residence rule) ·
[[adr/0071-while-you-were-away-built-at-read|ADR 0071]] (*Welcome back*)

**Code:**
- Rules: `RESTED` in `packages/rules/src/constants.ts` · `projectEnergy`, `spendEnergy` in
  `packages/rules/src/energy.ts` · `restedCapFor` in `packages/rules/src/ordinances.ts` ·
  `computeRewards` (`RESTED_PART`) in `packages/rules/src/rewards.ts` · `chapterRewards` in
  `ambition.ts` · `ROOM` (cap +50) in `constants.ts`
- Server: spent in `apps/server/src/services/actionService.ts` (actions and training),
  `missionService.ts`, `ambitionService.ts`
- Data: `characters.rested` (shares `energy.updatedAt`) in `packages/db/src/models/character.ts`
- Client: the desk row in `packages/ui/src/components/Paper.tsx`; the Rested tag and *Details*
  line in `packages/ui/src/components/ResultModal.tsx`

## Status

Built in slice 1; the cap rule and the Irongate room in slice 4. Home sources (slice 8) and the
30-day fill (slice 9) are designed, not built.

## Decisions

- Rested gives no Party XP and no influence, by design: a pillar, not a tuning knob (Appendix C #14
  says the lever for heavy players is the level table, never the Rested bonus).
- 3 Oct 2026 (slice 4): the cap belongs to the residence city.

## Open questions / drift

- Appendix C #14: a six-session player earns little Rested and still levels ~35 % faster than the
  reference player. Intended; watch telemetry.

> [!note] Inference
> GDD §6.3 says Rested boosts "checked actions and training". The code also applies it to tier-2
> missions and Ambition chapters (`missions.ts`, `ambition.ts`), which are checked; this reads as
> consistent rather than drift.

## Related

[[Energy]] · [[Session Loop]] · [[Residence]] · [[Buffs]] · [[The Result Modal]] ·
[[Iron Marks and the Economy]] · [[Levels and Faction Rank]]
