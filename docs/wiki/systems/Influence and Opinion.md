---
type: system
title: Influence and Opinion
aliases: [Influence, Opinion, City opinion, Opinion meter, Swing, Opinion swing, Control]
tags: [city, opinion, influence]
status: partly built
slice: "1 (swing written); 3 (home drift); 4 (district meters, drift, multipliers); 5 (opinion against); damping designed for 9"
gdd: ["§14.2", "§14.3"]
adrs: ["0010", "0022", "0027", "0034", "0068"]
updated: 2026-10-14
---

# Influence and Opinion

## In one paragraph

Every city (and every Irongate district) has an **opinion meter**: three faction shares plus a
**Neutral** pool, always summing to 100 %. Political actions, missions, journey cards, events and
resolved Issues move it. The meter is the heart of the city layer: it decides who leads a
[[Battleground and Groundswell|battleground]], what a home city's morale is, and (from slice 7)
each faction's [[National Control]]. Holding a city gives a faction **places to go, never bigger
rewards**: control grants access, not multipliers.

## How it works

- **The swing.** Each political action has a swing: points moved toward the actor's faction, set
  per Energy and halved on a Partial. Tier 1 (canvass, propaganda, street speech) is **0.005 points
  per Energy** (a 10-Energy canvass: +0.05). Tier-2 missions are 0.01 per Energy (illegal ×2);
  tier-3 stories 0.5–2; an Issue's owner gets +3. Full table: [[GDD#14.2 Influence|GDD §14.2]].
- **Multipliers on one line.** Close race +25 %, Issue tag +50 %, comeback up to +30 %, ordinances
  and laws. They multiply, rounded once to three decimals ([[Battleground and Groundswell]]).
  Rested and Party orders never touch opinion.
- **Where the share comes from.**
  - *Persuasion* (canvass, speech, events, Issues) draws from **Neutral first**, then from the
    rivals in proportion to their shares.
  - *Actions against a rival* (vandalism, disruption, sabotage, exposés) take from the **target**:
    half goes to the actor's faction, half to Neutral.
- **Floors.** Neutral never below **5 %**. A home faction never below **50 %** in its home city
  ([[Home Cities]]). If nothing can be drawn, the swing shrinks to what can.
- **Precision.** Shares are kept to three decimals (integer thousandths), shown to one decimal.
- **Drift.** At each City Day boundary a battleground share drifts **1 % of its distance to the
  baseline**; a home city drifts **2 % of the distance to 70**. Both trade with Neutral.
- **Attribution.** Every swing is a row in the [[Influence Ledger and City Hero|influence ledger]]
  (slice 4 on).
- **Control grants access** ([[GDD#14.3 Control grants access, not multipliers|GDD §14.3]]):
  *Contested* (no faction above 50) · *Control* (above 50: the faction's buildings open, prices
  shift) · *Dominance* (above 70: exclusive high-tier missions, city dressing). **No reward
  multiplier ever scales with control** (the anti-snowball rule).
- **Damping at scale (slice 9, designed).** Swings from actions and events are multiplied by
  `clamp(20 ÷ active, 0.25, 1)`, where *active* is the seven-day mean of distinct contributors at
  the place. The factor is never shown to players. Drift, an Issue's +3, ballots and seats and the
  exposé are not damped.

## Where it lives

**Rules:** [[GDD#14.2 Influence|GDD §14.2]] · [[GDD#14.3 Control grants access, not multipliers|GDD §14.3]] ·
[[design/slice-4-battleground#6. District opinion and the three-way race|slice-4 design §6]] ·
[[adr/0010-opinion-written-in-action-transaction|ADR 0010]] (write-through) ·
[[adr/0022-morale-home-share-state-and-contention|ADR 0022]] (morale is the home share) ·
[[adr/0034-opinion-against-and-rival-ground|ADR 0034]] (opinion against, rival ground) ·
[[adr/0068-opinion-damping-from-a-seven-day-ring-on-the-place|ADR 0068]] (damping, proposed)

**Code:**
- Rules: `packages/rules/src/opinion.ts` (`applyPersuasion`, `applyAgainst`) ·
  `packages/rules/src/district.ts` (`applyBaselineDrift`, `controller`, `averageShares`) ·
  `packages/rules/src/morale.ts` (`applyDrift`) · constants `OPINION_PER_ENERGY`,
  `OPINION_FLOORS`, `DISTRICT` in `packages/rules/src/constants.ts` · the named swing factors in
  `packages/rules/src/ordinances.ts` (`swingFactors`, `factorProduct`)
- Server: `apps/server/src/services/place.ts` (`readPlace`, `moveOpinion`: the one place an act
  writes a meter) · `apps/server/src/services/modifiers.ts` (`placeStateOf`)
- Data: model `packages/db/src/models/city.ts` (`opinion` on home cities) ·
  `packages/db/src/models/district.ts` (one document per capital district)

## Status

- **Built:** the swing written in the action's transaction (slice 1); home drift (slice 3);
  district meters, battleground drift and the multipliers (slice 4); opinion *against* a rival and
  the rival-ground cap (slice 5).
- **Not built:** the control effects of §14.3 beyond plate words (no building, price or mission is
  gated by control in the code: `controlledBy` is read only by the city view and the capital
  boundary); the *Heat 25 % faster for rivals of the controlling party* rule (slice 7); damping
  (slice 9).

## Decisions

- Meter written in the action's transaction; a ledger fold is the fallback if contention shows
  (ADR 0010, kept by ADR 0028).
- An action *against* a rival credits the actor's half as their contribution (ADR 0034 §2, a
  designer default).
- Damping chosen to close Appendix C #13 (4 Oct 2026).

## Open questions / drift

> [!note] Inference
> GDD §14.3 lists faction buildings opening under control (Vanguard House, Safehouse, Press Club).
> In the code HQ actions are *members only*, not control-gated. This looks like an unbuilt rule,
> not a contradiction; no slice doc pins when control-gated access arrives.

## Related

[[Battleground and Groundswell]] · [[Home Cities]] · [[Influence Ledger and City Hero]] ·
[[Issues of the Week]] · [[Capital Districts]] · [[National Control]] · [[Hostile Ground]] ·
[[Street Actions]] · [[Missions]] · [[Modifiers]]
