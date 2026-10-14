---
type: system
title: Battleground and Groundswell
aliases: [Battleground, Groundswell, Close race, Comeback, Morale, Unrest, Fired up, Unrest prize, Push bar]
tags: [city, opinion, battleground]
status: partly built
slice: "3 (morale); 4 (close race, comeback in districts); review 5 (push ring, Unrest prize); Clearwater in 7"
gdd: ["§14.4", "§14.11"]
adrs: ["0022", "0027", "0050", "0082"]
updated: 2026-10-14
---

# Battleground and Groundswell

## In one paragraph

Two day-long states make the city fight follow the action. A **battleground** (player word:
*close race*) is a place where the top two parties are within 10 points: political work there pays
more for everyone. A **groundswell** (player word: *comeback*) helps a party that has just lost
control of a place win it back. In the home cities the same meter is read as the home party's
**morale**, with its own states (*Fired up*, *Steady*, *Unrest*) and, since review 5, a prize for
rivals who push a town into Unrest.

## How it works

**Close race** ([[GDD#14.4 Battleground and Groundswell|GDD §14.4]])
- Set **once a day at the City Day boundary**: the top two faction shares within **10 points**
  (Neutral is not a party). Tickets never change under a player mid-day.
- That day every **political action** (canvass, speech, propaganda, council) there gets **+25 %
  swing, +25 % Party XP and +5 chance**, for every party. Intelligence and training get nothing.
- At the baselines the Government Quarter and Station & Market are close races.

**Comeback**
- When a party **loses control** (above 50 at one boundary, 50 or below at the next) it gets **+5 %
  swing per day, stacking to +30 %** (day 6 on), on its own political actions there, until it
  retakes control or **14 boundaries** pass.
- Never fires in a home city (a home cannot be lost). Built for districts only; Clearwater gets it in
  slice 7. It cannot fire until someone first crosses 50 (Appendix C #29).

**One line:** `swing = base × (1 + close race) × (1 + issue) × (1 + comeback) × (1 + ordinance)`,
rounded once; each factor is its own line in the result.

**Morale in a home city** ([[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]])
- Morale *is* the home party's share (ADR 0022). States: **Fired up 80–100** (+10 % Party XP at
  home) · **Steady 60–79** · **Unrest 50–59** (a crisis).
- Inputs: political actions, the daily drift (2 % of the distance to 70), **+0.5 per ballot**,
  **+2 per player seat**, **−3 at a count with no voter**, and rival work (capped at **2 points a
  day**, see [[Hostile Ground]]).
- Unrest: crisis orders (*Restore the base*), the branch's card leaves the city's ballot, rivals earn
  +75 % Party XP there, and from slice 7 the city counts half in [[National Control]], the local
  deputies abstain and a player Chair faces a vote. Leaving Unrest prints *{City} Stands Firm*.

**The push ring and the Unrest prize** (review 5, built; [[adr/0082-the-push-ring-on-the-city-and-the-unrest-prize-as-an-award|ADR 0082]])
- The rival-ground plate shows a **push bar**: today's points taken from the home party, split by
  the two rival parties, against the 2-point cap; plus the goal (points to Unrest) and *your party
  has pushed n this week*. These are reads of `rivalPressure.byFaction` and its seven-day `week` ring
  on the city document.
- When a rival home city **enters Unrest**, every member of a pushing party who moved **≥ 0.5
  points there in the last seven days** gets **+50 Party XP** and a headline (Legacy +2 waits for
  slice 8). Paid once per entry, at most once in seven days per city, as an `unrest` award credited
  at the member's next settlement.

## Where it lives

**Rules:** [[GDD#14.4 Battleground and Groundswell|GDD §14.4]] ·
[[GDD#14.11 Home cities and battlegrounds (new)|GDD §14.11]] ·
[[design/slice-4-battleground#6. District opinion and the three-way race|slice-4 design §6]] ·
[[design/review-5-answers#10. #10 — Rival ground: the push, the danger, the goal (decided: the user approved §10.2 and §10.3 as proposed, 8 Oct 2026)|review-5 answers §10]] ·
[[adr/0022-morale-home-share-state-and-contention|ADR 0022]] ·
[[adr/0027-capital-districts-and-the-three-way-count|ADR 0027]] ·
[[adr/0050-clearwater-single-meter-battleground|ADR 0050]] (proposed) · ADR 0082

**Code:**
- Rules: `packages/rules/src/district.ts` (`isBattleground`, `controller`, `districtState`,
  `groundswellPct`) · `packages/rules/src/morale.ts` (`moraleState`, `applyDrift`,
  `applyMoraleLoss`, `unrestEntry`, `prizeWinners`) · `packages/rules/src/rivalGround.ts`
  (`addPressure`, `pressureByFaction`, `pushedThisWeek`) · constants `DISTRICT`, `BATTLEGROUND`,
  `MORALE`, `UNREST_PRIZE`
- Server: `apps/server/src/services/capitalDay.ts` (`processCapitalBoundary`: drift → Issues →
  states) · `apps/server/src/services/cityDay.ts` (home drift, seat and no-voter inputs, the prize)
  · `apps/server/src/services/modifiers.ts` (`groundswellOn`, `placeStateOf`) ·
  `apps/server/src/services/cityService.ts` (`rivalHeaderView`)
- Data: `packages/db/src/models/district.ts` (`state`, `groundswell`, `stateLog`) ·
  `packages/db/src/models/city.ts` (`morale`, `moraleLog`, `rivalPressure`, `unrestPrize`) · the
  slice-4 playtest report `packages/db/src/battleground.ts` (`buildBattlegroundReport`)
- Client: `packages/ui/src/components/RivalHeader.tsx`, `apps/client/src/routes/city.tsx`

## Status

- **Built:** morale and its states (slice 3); close race and comeback in the five districts
  (slice 4); the rival header, push ring and Unrest prize (review 5, 8–10 Oct 2026).
- **Designed, not built:** Clearwater as a single-meter battleground with comeback (slice 7,
  ADR 0050); the Unrest consequences that need slice 7 (half weight, deputies, Chair vote); Legacy +2.

## Decisions

- *Fired up* raised from +5 % to +10 % so per-line rounding shows it (Appendix C #23).
- The Unrest prize and the header were approved by the user on 8 Oct 2026 (review 5 #10). The
  cap is per city, not per member: two rival towns in Unrest in one week pays 100 Party XP.

## Open questions / drift

- Groundswell may never fire at playtest population (Appendix C #29, open by design).

## Related

[[Influence and Opinion]] · [[Capital Districts]] · [[Home Cities]] · [[Hostile Ground]] ·
[[Issues of the Week]] · [[Clearwater]] · [[Party Orders]] · [[Night and Patrols]]
