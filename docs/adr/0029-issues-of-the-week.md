# ADR 0029 — Issues of the Week: a document per Issue per week, momentum in the action's transaction, the Monday step of the city day

**Status:** proposed (slice 4) · **Date:** 2026-10-03

## Context

GDD §14.6 (slice 4): at the Monday 00:00 UTC boundary every open city draws two Issues from its eligible deck (seeded by the week, never last week's two, in Irongate from two different districts). Matching actions are tagged: +50 % opinion and momentum (the action's Energy on Success, half on Partial) for the actor's faction, public. At the next Monday boundary, before the new draw, the faction with most momentum owns each Issue (ties: the higher share; then nobody; no momentum: it lapses): +3 opinion in the Issue's city or district, 4 PC to its top five contributors, and the Issue's bounded effect on the whole city for seven City Days. No early resolution.

## Decision

1. **An `issues` collection**: one document per city per week per Issue (`irongate:20731:issue.tram-fares`) with the district, the order (first or second), the seed, the status (`live → owned | lapsed`), momentum by faction and the result. The city document carries the week's live Issues and the effects in force (`issues { weekDay, live, effects }`), so actions read their tags and the modifiers from the document they already read.
2. **Momentum is written in the action's transaction** with `$inc` guarded by `status: 'live'`; a miss means the week resolved under the action, which then retries on the new day (ADR 0018's rule). Per-contributor points go to `contributions` (ADR 0028), not to a map inside the Issue document, which would grow with the city's population.
3. **Resolution and the draw are the Monday step of the city day** (ADR 0017), after the drift and before the states and the count: resolve last week's live documents, then draw this week's. The draw is a pure function in rules over a seed derived from the city and the week (`sha256`, stored on each document).
4. **Existing cities draw lazily**: a city with a `world` but no `issues` gets this week's draw in its own transaction (conditional on `issues` absent) before its next boundary; a new city draws in its bootstrap. No city is ever without Issues.
5. **Effects are modifier sources** (ADR 0030), the same DSL as ordinances, active `[Monday, Monday + 7)` and listed on the city document; tickets and rooms gain their own effect kinds.

## Consequences

- The paper's Issues section reads at most eight small documents; nothing about Issues is secret.
- A tagged action writes one more document, shared by the same population that already shares the district (or the home city), so contention does not change in kind.
- Weighted draws (laws, weather) and early resolution later change only the rules functions.
