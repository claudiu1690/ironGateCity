# ADR 0022 — Morale is the home share in `cities.opinion`, with a small state record; drift and count inputs run at the boundary; contention reassessed

**Status:** accepted, implemented (slice 3; amends ADR 0010) · **Date:** 2026-09-29

## Context

GDD §14.11 (slice 3) turns the home faction's share of its home city into **morale**, with three states: *Fired up* ≥ 80, *Steady* 60–79.999, *Unrest* < 60.

Morale has five inputs:

| Input | Effect | When |
|---|---|---|
| Political actions | the §14.2 swing | as today |
| Ballot | +0.5 each | at the ballot |
| Seat | +2 per player seat | at the count |
| No player voted | −3 | at the count |
| Drift | 2 % of the distance to 70 a day, between the home faction and Neutral | at the boundary |

The states have effects:

- *Fired up* pays +10 % FXP.
- *Unrest* swaps two Party orders and makes NPC councillors abstain.
- The paper prints *Stands Firm* the morning after a city leaves Unrest.

ADR 0010 already writes opinion inside action transactions and names contention on the city document as the risk.

## Decision

- **No second number.** Morale *is* `cities.opinion[homeFactionId]`. `moraleState(share)` is a pure function in rules. The city document gains `morale { state, since: DayKey, previous }`, written only when a transaction moves the share across a threshold. It exists for the *Stands Firm* headline and the report, and is never used for the maths.
- **Drift and the count's inputs** are applied in the city-day transaction (ADR 0017), drift first, then the count (+2 per player seat, −3 when no player voted). There are two pure functions:
  - `applyDrift(shares, home)`: `roundOpinion(0.02 × (70 − share))`, drawn from or returned to Neutral, within the floors;
  - `applyMoraleLoss(shares, home, n)`: home to Neutral, with the home floor at 50.

  Each boundary also appends `{ day, share, state }` to `cities.moraleLog`, capped at the last 60, for the playtest report.
- **Ballots** apply +0.5 with `applyPersuasion` in the vote's transaction, and show it in the modal.
- **Actions** keep ADR 0010 and additionally read the home city's modifiers and morale inside their snapshot. Reads never conflict. An action that crosses a threshold sets `morale` and returns a knock-on line.
- **Which morale counts, and when:**
  - *Fired up* applies to actions in the actor's home city when the state at the action's snapshot is *Fired up*.
  - *Unrest* orders are frozen at the character's settlement, from the state after the boundary.
  - NPCs abstain if the city is in Unrest at the division boundary, after that boundary's drift.

**Contention, reassessed.** The city document gets three new writers:

- about one ballot per member per cycle, so 0.6 writes a member a day;
- one city-day transaction a day;
- threshold records, which ride on writes already happening.

Actions with opinion stay the dominant writer, as in slice 1. So the new load is under a few per cent of the existing write load, and the ADR 0010 remedy (an influence ledger folded in batches) stays planned for slice 4. The playtest report already measures `txAttempts` per action, and gains the same per political act.

## Consequences

- Every opinion writer can move morale, and the state is always consistent with the share, because it is derived.
- Drift is exact over any absence: it is applied boundary by boundary, even when a city catches up after days without a runner.
- The midnight city-day transaction briefly conflicts with actions in flight. They retry on the new day (ADR 0005).
