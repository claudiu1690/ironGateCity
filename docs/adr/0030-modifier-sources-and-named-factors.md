# ADR 0030 — Modifier sources: ordinances and Issue effects as named lines; the opinion swing as named factors

**Status:** proposed (slice 4; amends ADR 0021) · **Date:** 2026-10-03

## Context

ADR 0021 made ordinance effects a closed, bounded DSL with one ordinance in force per city, applied as day-constant named modifiers (`CityModifiers { ordinance, firedUp }`). Slice 4 adds, in the same city and day: up to two Issue effects for the week (the same DSL plus tickets and rooms), stacking with the ordinance "as separate lines" (GDD §14.6); and per-place factors on the opinion swing: *close race* +25 %, an Issue tag +50 %, a *comeback* +5…30 %, multiplying with the ordinance's, each its own line, applied in full precision and rounded once (GDD §14.4). A close race also adds +25 % Party XP (a line on base) and +5 to the chance of political checks. Ticket fares (Tram Subsidy, the Tram Fare Hike) halve, never below 5 Iron; the Eviction Notices halve the room.

## Decision

1. **`PlaceModifiers { sources, firedUp, place }`.** `sources` is the ordered list of `ModifierSource { id, name, kind: 'ordinance' | 'issue', effects }` in force in the city on the day (the ordinance first, then the Issue effects by order); `place` carries the district's close race, the actor faction's Groundswell percentage and the action's Issue tags. `NO_MODIFIERS` and a single ordinance source reproduce slice 3 exactly.
2. **Combination rules by effect kind**, each source named on its own line or tag:

   | Kind | Combination |
   |---|---|
   | `energyDelta`, `chancePct`, `restedCapDelta` | add (Energy never below 1; the chance clamp applies) |
   | `jobPayPct`, `ironPct`, `fxpPct` | each a share of the unmodified base, its own part (as ADR 0021) |
   | `swingPct` | each a factor in the opinion product |
   | `trainingEnergyPct`, `ticketPct`, `roomPct` | multiply, rounded half up once (tickets never below 5 Iron) |
   | `standingMultiplier`, `seniorityDays` | the larger (never ×4) |

3. **Two new effect kinds**, `ticketPct` and `roomPct`, bounds −50…0, validated by content like the others.
4. **The opinion swing is a product of named factors**: `swing = base × Π(1 + pct/100)` over *Close race* (political types in a close race), *Issue: {name}* (tagged), *Comeback* (the actor's own Groundswell, political types) and every `swingPct` source; computed per row in full precision and rounded once to three decimals. The result carries `rewards.opinionFactors` so the modal names each factor. The Party XP line takes *Close race* as a share of base beside the Party order, *Fired up* and the sources; the check takes *Close race* +5 as a named bonus (shown as an odds word, never a number).
5. **The Rested cap** is the base plus the residence city's sources of the day plus a room while it runs; registering and taking a room re-base Energy at the tap, so the piecewise projection never mixes two residences.
6. **The wage** of each ended day takes the sources of the job's city on that day.

## Consequences

- Every bonus a player gets has a name in the breakdown and on the ticket, whatever its source.
- The slice-3 helpers become reductions over a list; the slice 1–3 tests pin that one source behaves exactly as before.
- Laws (slice 7) and weather slot in as further source kinds without changing the modal or the combination table.
