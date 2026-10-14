---
type: tech
title: Modifiers
aliases: [Modifier Sources, Bonuses, Named Factors, PlaceModifiers]
tags: [tech, rules, pattern]
status: partly built
slice: "3 (ordinances); 4 (sources, Issues, place factors); 5 (rival ground); laws and personal modifiers designed for 7–8"
gdd: ["§8.4", "§13.1a", "§14.4", "§14.6", "§15.3"]
adrs: ["0021", "0022", "0030", "0034", "0044", "0052"]
updated: 2026-10-14
---

# Modifiers

## In one paragraph

Many things change the game's numbers for a while: a rule the town voted in, an Issue of the Week,
morale, a close race, a comeback, rival ground. Instead of each one patching numbers in its own way,
they are all **named sources** with effects from one closed list. The server gathers the sources
in force for the place and day, the pure rules apply them, and every source that touched a result
shows up **by name** in the result modal — as a bonus tag, a named part of a reward line, or a named
odds bonus. The player always sees *why* a number moved.

## How it works

**The shape** (`packages/rules/src/ordinances.ts`, `types.ts`):
- `ModifierSource { id, name, kind: 'ordinance' | 'issue', effects }` — one per ordinance (rule) or
  Issue effect in force.
- `PlaceModifiers { sources, firedUp, place }` — `place` is `PlaceState`: close race
  (`battleground`), the actor's `groundswell` %, the live `issues` whose feeds tag actions, and
  `rivalGround`.
- Effects are a closed DSL with bounds owned by rules and checked by content
  (`ordinanceBoundProblem`): `energyDelta`, `chancePct`, `restedCapDelta`, `jobPayPct`, `ironPct`,
  `fxpPct`, `swingPct`, `trainingEnergyPct`, `ticketPct`, `roomPct`, `standingMultiplier`,
  `seniorityDays`, `heatCoolPct`, `bailPct` (the full list is in `ordinances.ts`).

**How they combine** ([[adr/0030-modifier-sources-and-named-factors|ADR 0030]] §2):

| Kind | Combination |
|---|---|
| `energyDelta`, `chancePct`, `restedCapDelta` | add (Energy never below 1; the chance clamp holds) |
| `jobPayPct`, `ironPct`, `fxpPct` | each a share of the unmodified base, its own named part |
| `swingPct` | each a factor in the opinion product |
| `trainingEnergyPct`, `ticketPct`, `roomPct` | multiply, rounded half up once (tickets never below 5 Iron) |
| `standingMultiplier`, `seniorityDays` | the larger |

The opinion swing is `base × Π(1 + pct/100)` over *Close race* +25 %, *Issue: {name}* +50 %,
*Comeback* +5…30 % and every `swingPct` source, in full precision, rounded once
([[GDD#14.4 Battleground and Groundswell|GDD §14.4]] — see [[Battleground and Groundswell]]).

**Where the server gathers them** (`apps/server/src/services/modifiers.ts`):
- `sourcesOn(content, city, day)` — the rule in force (`ordinanceIdOn`), then the Issue effects
  (`issueEffectsOn`), in that order.
- `moraleOf()` → *Fired up* when the actor's party is ≥ 80 % in its home city.
- `placeStateOf()` — close race and comeback from the `districts` document, live Issues, rival ground.
- `modifiersFor(content, city, factionId, day, { cityId, district })` → `PlaceModifiers`.
- `dayModifiers()` — a past day's sources only (each ended day's wage and cap).
- `capOn()` / `restedCapToday()` — the Rested cap per day: 200 + the residence city's sources + a room.
- `readPlace()` (`place.ts`) calls `modifiersFor` inside the action's transaction snapshot.

**How they reach the screen** (`apps/server/src/services/actionResult.ts`, `buildActionResult`):
- **Bonus tags** (`BonusTag { id, label, note }`): *Rested*, *Party order*, Local Standing,
  *First day*, *Issue: {name}*, rival ground, *Close race*, *Comeback*, *Fired up*, and one tag per
  source that applied (e.g. "+20 % Iron", "10 Energy", "reputation ×2", "+15 % opinion").
- **Reward line parts** (`RewardLine { base, bonus, total, parts[] }`): each share is a
  `RewardPart { id, label, amount }`.
- **Check bonuses** (`CheckBonus { id, label, value }`): kept with their value in the stored
  breakdown, but shown to the player as an odds word ("better odds"), never a number (review 2).
- **Opinion factors** (`rewards.opinionFactors`): each factor of the swing, named.
- **The plate and Town Hall** list sources in force as `ModifierSourceView { name, effectLine,
  daysLeft }`.

### Designed, not built

- **Laws** as a third source kind with per-effect `appliesTo` and `LAW_BOUNDS`
  ([[adr/0044-laws-a-third-modifier-source|ADR 0044]], slice 7, **proposed**).
- **Personal modifiers** — items, Legacy perks, recognition on rival ground — beside the place's
  sources ([[adr/0052-personal-modifiers-items-perks-and-recognition|ADR 0052]], slice 8, **proposed**).
  Today the only personal bonuses are Local Standing, Rested, the welcome day and worn Charisma.

## Key files

- `packages/rules/src/ordinances.ts` — `placeModifiers`, `sourcesOf`, `effects`, `effect`, `actionEnergy`, `NO_MODIFIERS`
- `packages/rules/src/rewards.ts` (`computeRewards`, parts), `check.ts` (`computeCheck`), `action.ts` (opinion factors)
- `apps/server/src/services/modifiers.ts`, `place.ts` (`readPlace`), `actionResult.ts`
- `packages/content/src/data/ordinances.ts`, `issues.ts` — the sources' effects as data

## Rules to follow

- A new thing that changes numbers is a **source** with DSL effects, not a special case.
- A new effect kind needs: its bounds in rules, its combination rule, a content check, and a tag
  in `buildActionResult`.
- Modifiers are constant for a City Day; read them from the documents the request already has.
- Every applied bonus is named on the result; odds bonuses are words, not numbers.

## Decisions (ADRs)

- [[adr/0021-ordinance-effects-closed-dsl-day-constant|ADR 0021]] — the closed DSL, day-constant.
- [[adr/0022-morale-home-share-state-and-contention|ADR 0022]] — morale states.
- [[adr/0030-modifier-sources-and-named-factors|ADR 0030]] — sources and named factors.
- [[adr/0034-opinion-against-and-rival-ground|ADR 0034]] — rival ground as place state.
- [[adr/0044-laws-a-third-modifier-source|ADR 0044]], [[adr/0052-personal-modifiers-items-perks-and-recognition|ADR 0052]] — proposed.

## Related

[[Ordinances]] · [[Issues of the Week]] · [[Battleground and Groundswell]] · [[Hostile Ground]] ·
[[The Result Modal]] · [[Rules Package]] · [[Lazy Timers]]
