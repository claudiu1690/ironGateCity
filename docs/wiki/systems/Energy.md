---
type: system
title: Energy
aliases: [Energy bar, EN]
tags: [resource, timer]
status: built
slice: "0 (stored, lazy); 1 (spent on actions)"
gdd: ["§6.2"]
adrs: ["0002", "0005", "0006", "0021"]
updated: 2026-10-14
---

# Energy

## In one paragraph

Energy is what a player spends to act. It refills on its own, so it paces play into short
sessions: a full bar is one regular session, and a player who comes back three or four times a day
does more without anyone being punished for coming back less. Energy that would overflow a full bar
is not wasted: it banks as [[Rested]].

## How it works

- **Max 100** (Premium 120, not built). **Regen +5 every 10 minutes**, server-side, so full from
  empty in **3h20** ([[GDD#6.2 Energy|GDD §6.2]]).
- **Spent on:** tier-1 actions and missions (5–30), training ([[Stats and Checks]]: 20 + 2 × the
  stat), surveillance (3–5), and later Campaign Event roles, social missions and bar activities.
- **Never spent on:** a job ([[Jobs]]), travel (a ticket and time instead, [[Travel and Journeys]]),
  voting or political acts (those cost [[Political Capital]]).
- **Lazy timer:** stored as a value and a timestamp, projected on every read; the timestamp only
  advances by whole ticks so no part-tick is lost ([[Lazy Timers]]).
- **A batch (×3) is all or nothing:** it is disabled when Energy is short, never a partial batch.
  Every button that spends Energy says what it does and what it costs (*Once more · 10 Energy*).
- **Short of Energy:** the button keeps its label and shows when it is ready (*Once more needs 10
  Energy · ready at 14:20*). The Out of Energy card says when the bar is full and that Rested banks
  after that.
- **Council rules can change costs**, never rewards: an ordinance can take up to 2 off an action's
  cost or 20 % off training; rewards stay on the content's Energy.
- **On the HUD** it is always the word *Energy*, never *EN*, first in the order Energy · Health ·
  Heat · XP · Party XP (review 5).

## Where it lives

**Rules:** [[GDD#6.2 Energy|GDD §6.2]] · [[GDD#6.3 Rested (new)|GDD §6.3]] ·
[[design/review-3-answers|review 3 answers §4]] (buttons that say their cost) ·
[[economy|economy sheet §3]] (Energy and Rested per day) ·
[[adr/0006-repeat-actions-one-request|ADR 0006]] (×3 in one request) ·
[[adr/0021-ordinance-effects-closed-dsl-day-constant|ADR 0021]] (cost ordinances)

**Code:**
- Rules: `packages/rules/src/energy.ts` (`projectEnergy`, `spendEnergy`, `energyReadyAt`,
  `projectEnergyThrough`) · `ENERGY` in `packages/rules/src/constants.ts` · `actionEnergy` in
  `packages/rules/src/ordinances.ts`
- Server: spent inside the action transaction in `apps/server/src/services/actionService.ts` and
  `missionService.ts`
- Data: `characters.energy { value, updatedAt }` and `characters.rested`
  (`packages/db/src/models/character.ts`)
- Client: `packages/ui/src/components/HudBar.tsx` (the client projects between reads)

## Status

Built in slice 0 (stored and lazy) and slice 1 (spent on actions, ×3). The HUD order was settled in
review 5. Premium's 120 max and Energy Packs ([[Monetisation]]) are not built.

## Decisions

- v3.1: regen slowed from 5 per 5 min to 5 per 10 min, to fit 3–4 sessions a day without asking
  for a login every 100 minutes; Rested absorbs the overflow.
- [[Review 3]]: every Energy button names the act and the cost.

## Open questions / drift

None found. The code's `ENERGY = { max: 100, regenPerTick: 5, tickMs: 10 min }` matches the GDD.

## Related

[[Rested]] · [[Session Loop]] · [[Street Actions]] · [[Missions]] · [[Lazy Timers]] ·
[[Atomic Actions and Idempotency]] · [[Ordinances]]
