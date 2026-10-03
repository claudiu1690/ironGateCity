# ADR 0027 — The capital: district documents, state at the boundary, an election per district, one council

**Status:** proposed (slice 4) · **Date:** 2026-10-03

## Context

Irongate has five districts, each with its own opinion meter, a *close race* (Battleground) state and a *comeback* (Groundswell) state evaluated at the City Day boundary (GDD §14.4, §14.9). The city's share is the equal average of the five, computed on read. The council has ten seats, two per district, counted per district with a turnout-weighted score and D'Hondt, every district on the same night (cycle offset 0); one order paper carries each seated bloc's branch motion plus up to three proposals, and an item passes with six of ten (GDD §15.3).

Every capital action writes opinion (ADR 0010). One `cities` document per city made each home city a single hot document; the capital will have players of all three factions.

## Decision

1. **A `districts` collection**, one document per district (`_id` = the district id): `opinion`, `state { day, battleground, controlledBy, previous }`, `groundswell { factionId, fromDay, untilDay } | null`, a 60-day `stateLog`. Capital actions write only their district, so the capital's writes spread over five documents.
2. **The Irongate `cities` document keeps the city-wide state** (the calendar's `world`, the sitting council, the ordinance and its history, the week's Issues) and **no opinion**: the city's share is `averageShares` of the five, on read. `CityDoc.opinion` becomes optional at the type level, narrowed for home cities.
3. **States are set at the boundary**, after the drift and the Monday Issue step, and read by actions in their snapshot, like morale (ADR 0022): a close race is the top two faction shares within 10; control is a share above 50; a Groundswell starts the boundary after a faction loses control and lasts until it retakes control or 14 boundaries pass. Pure functions in `packages/rules` (`district.ts`).
4. **One election per district per cycle**: `_id = electionKey(districtId, cycle)` (`irongate.eastside:4146`), `kind: 'district'`, NPC slates of two per faction, a ballot of any faction's names, the count by `countDistrict` (rules). Votes, candidacies and endorsements key on the election as in slice 3; the one-endorsement-per-cycle guard keys on the city's cycle (`irongate:4146`).
5. **One council per city**: the ten terms share `councilKey('irongate', k)`, with `districtId` and `factionId`; one order paper with up to six items; `divideCapital` (each bloc's NPCs follow their own players, else their branch; six of ten).
6. **One boundary transaction for the capital** (ADR 0017's guard on `world.settledDay`): drift → Issues (Monday) → states → the five counts and the new council (cycle day 0) → heroes → close (day 2) → divide (day 2). Ballots and seats never move a district's opinion. The bootstrap creates the districts at their baselines, an NPC council counted on the baselines, the order paper (an NPC-only council passes nothing, so no ordinance is in force), the five elections in the phase of the day and the week's Issues.

## Consequences

- Concurrent actions in different districts do not conflict; actions in one district serialise as a home city's do.
- The capital's boundary transaction is the largest in the game (five counts, ten terms, five elections, heroes, Issues). It is measured in the worker-down test; if it approaches the transaction limits, each district's count can become its own guarded transaction without changing the documents.
- Clearwater (slice 7, a single-meter battleground) can reuse the state functions on its city document; a later districted city reuses the whole shape.
- A district that outgrows six places gets a second frame on the picture under the same district document (Appendix C #41): the frames are content, the meter is not.
