# ADR 0050 — Clearwater: a single-meter battleground on its city document, counted and divided by the capital's functions with parameters

**Status:** proposed (slice 7; extends ADR 0027) · **Date:** 2026-10-04

## Context

Clearwater opens in slice 7 as the second battleground (design §9, GDD §14.1, §15.3). It has:

- **one opinion meter**, baseline 22 / 22 / 22 / 34, with the capital district's rules: drift, close race, control, comeback;
- **seven council seats**, counted three ways by D'Hondt on the turnout-weighted score at ten ballots;
- local candidates filling each party's list to three;
- an order paper led by the Governor's rule and each seated bloc's party rule;
- **four of seven** to pass.

Control of a district or of Clearwater also gains a rule in slice 7: rivals of the controlling party gain Heat 25 % faster there.

ADR 0027 built the capital as five `districts` documents with one boundary transaction and one council of ten. It noted that Clearwater could reuse the state functions on its city document.

## Decision

1. **Clearwater's meter and state live on its `cities` document**: `opinion`, `state` (a `DistrictStateDoc`), `groundswell` and `stateLog`. Its content is a `battleground` city with three quarters (no districts).
2. **The capital's count and division are generalised by parameters**, not copied:
   - `countDistrict` becomes `countBattleground({ seats, fullTurnout, … })`, with lists of `listSize` (2 in the capital, 3 in Clearwater);
   - `divideCapital` becomes `divideBlocs({ passVotes, governorFaction, … })`;
   - `BATTLEGROUND_COUNCILS` holds both settings. The slice-4 tests run unchanged through the new functions.
3. **`processBattlegroundBoundary`** runs Clearwater's boundary in ADR 0027's order, on one meter:
   - drift → Issues (Monday) → state → the petition close (ADR 0049);
   - → the count, the Governor (ADR 0048), heroes, the next election and order paper;
   - → the close and the division.
   **`bootstrapBattleground`** mirrors the capital's bootstrap on one meter.
4. **Control's Heat rule is a place factor**: `heatGainAt(gain, place, actor)` × 1.25 (rounded half up) for a rival of the party above 50 in the district or Clearwater, applied wherever Heat is gained at the place (missions, events). It is not a law kind and not a multiplier on anything else (GDD §14.3: control grants access, never multipliers on rewards).
5. **What a battleground city offers comes from its content role**, not from city ids in rules: residence from Rank 2, a room (`ROOM` loses its `cityId`), the capital-style orders (`residence: 'clearwater'`), all three factions' fixtures and branch channels.

## Consequences

- One code path counts and divides every three-way council. A future third battleground is content plus a settings row.
- Clearwater's writes concentrate on one document, as a home city's do. Its population is a fraction of the capital's in the MVP. If it outgrows that, it can take ADR 0027's district split without changing the views.
- The Heat rule makes control mean something on the ground without touching rewards or odds.
