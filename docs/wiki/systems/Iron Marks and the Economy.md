---
type: system
title: Iron Marks and the Economy
aliases: [Iron, Iron Marks, IM, Economy, Money, Sinks]
tags: [resource, economy]
status: partly built
slice: "1 (earned); 4 (first sinks: tickets, the move, the room); 5 (bail, pay-offs); review 5 (treatment)"
gdd: ["§6.6", "§18", "§18.1", "§18.2", "§18.3", "§18.4"]
adrs: []
updated: 2026-10-14
---

# Iron Marks and the Economy

## In one paragraph

Iron (Iron Marks, *IM* in the GDD; players read *Iron*) is the currency. It comes from actions and
missions, the job's daily wage, and later Dossier sales. The rule is simple: **baseline income is
higher than baseline cost**. There is no mandatory upkeep, ever, so a player who spends nothing
still progresses; every Iron sink is optional acceleration, access or status, and choosing how to
spend is part of the game.

## How it works

- **Principle** ([[GDD#18.1 Principle|GDD §18.1]], [[GDD#6.6 Iron Marks (IM)|GDD §6.6]]): no
  mandatory daily upkeep. Nobody adds an upkeep "to give Iron a purpose" (economy sheet §5.2).
- **Earned from:** tier-1 actions (2 Iron per Energy at tier 1), missions (4 per Energy at tier 2;
  theft ×2), the job's wage at every boundary ([[Jobs]]), and Rested's +50 % on top ([[Rested]]).
  Campaign Events pay no Iron in the MVP. A new character starts with **0 Iron**.
- **Income targets** ([[GDD#18.2 Income (reference player, per City Day)|GDD §18.2]]): about
  1,000–2,000 a day in week 1, ~3,500 in month 1, ~6,000–7,500 in month 3. The reference player
  lands at the low end of week 1 (~1,000) by the economy sheet's model.
- **The record taxes mission Iron:** −10 / −20 / −30 % at *On file* / *Repeat offender* /
  *Notorious*, tier 2 and up only ([[Heat and Record]]). Council rules can add up to +25 % Iron.
- **Built sinks** ([[GDD#18.3 Sinks|GDD §18.3]]): a train ticket **20** (never below 5) ·
  moving residence **500**, 7 days between moves · a room in Irongate **100 for 7 days** (Rested
  cap +50) · bail **100 + 50 a mark** (×2 Notorious, ×2 rival ground, ×½ Alliance) · *Walk out
  well* **100** · *Get patched up* **1 a point** of Health missing, at least 10 · paying off a
  run-in **50–300**.
- **Designed sinks:** clothing and equipment (slice 8, shops buy back at a tenth) · the flat
  (2,500 + 150 a week) · bribes to clear marks (500 / 1,000 / 2,000) · patron gifts (200) ·
  bodyguards · posting a mate's bail (slice 6) · meals and lodging ([[Buffs]], later).
- **Later (v1.2)** ([[GDD#18.4 Later (v1.2)|GDD §18.4]]): player trading, a faction treasury with
  caps and an audit log, market taxes.

## Where it lives

**Rules:** [[GDD#6.6 Iron Marks (IM)|GDD §6.6]] · [[GDD#18. Economy|GDD §18]] ·
[[GDD#5.5 Reward rates per mission tier (starting values)|GDD §5.5]] (rates) ·
[[economy|economy sheet]] (the four-profile model; §5 daily income, §15.1 slice-4 sinks, §19.7
the cells, §22 the Wardrobe's prices, §25 review 5)

**Code:**
- Rules: `TIER_RATES`, `RECORD.ironPct`, `TRAVEL`, `RESIDENCE`, `ROOM`, `CELLS.bail`, `HEALTH.walkOut`,
  `TREATMENT`, `STARTING.iron` in `packages/rules/src/constants.ts` · `computeRewards`,
  `roundHalfUp` in `packages/rules/src/rewards.ts` · `packages/rules/src/jobs.ts` (wage)
- Server: `apps/server/src/services/travelService.ts`, `residenceService.ts`, `heldService.ts`,
  `treatmentService.ts`, `streetService.ts` (run-in pay-offs), `dayService.ts` (wage)
- Data: `characters.iron` (`packages/db/src/models/character.ts`); content prices in
  `packages/content/src/data/items.ts`, `jobs.ts`, `opponents.ts`
- Client: the HUD's Iron in `packages/ui/src/components/HudBar.tsx`; the receipt's Iron line in
  `ResultModal.tsx`

## Status

Iron is earned from slice 1. The first sinks arrived in slice 4 (tickets, the move, the room), then
bail, walking out and pay-offs (slice 5), treatment (review 5). Shops, the flat, bribes, bodyguards
and gifts are slice 8 and later; trading and the treasury are v1.2.

## Decisions

- v3.1: missions used to pay less than upkeep cost; upkeep is gone, sinks are optional (§0).
- Slice 6 (designed): events pay no Iron, because Iron already runs ahead of its sinks (economy
  sheet §19.11).
- [[Review 5]]: treatment priced at 1 Iron a point (Appendix C #97).

## Open questions / drift

> [!warning] Drift
> **GDD §18.2 vs §9.2.** The week-1 income row gives the job **80–300**, a v3.0 range. The job
> ladder pays at least 100 (the street vendor) and 216 for a member's day-1 job.

> [!note] Inference
> Until slice 8's shops land, a reference player banks most of their Iron (economy sheet §5.2:
> ~26,000 by day 30). The sheet calls this fine; it is worth watching in playtests.

## Related

[[Jobs]] · [[Rested]] · [[Heat and Record]] · [[Travel and Journeys]] · [[Residence]] ·
[[Equipment and Wardrobe]] · [[Hospital and Treatment]] · [[Jail and the Cells]] · [[Buffs]] ·
[[Monetisation]]
