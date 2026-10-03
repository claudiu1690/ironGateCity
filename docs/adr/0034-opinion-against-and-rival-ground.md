# ADR 0034 — Opinion against a faction, and rival ground as a place state

**Status:** proposed (slice 5; extends ADR 0010, 0028, 0030) · **Date:** 2026-10-03

## Context

GDD §14.2: *actions against a rival take the swing from the target faction; half goes to the actor's faction and half to Neutral*. Slice 5 brings the first such actions:

- vandalism, disruption and sabotage name a target (`leader` in the capital);
- every opinion-moving action on **rival ground**, the other factions' home cities (GDD §14.12, `docs/design/slice-5-risk.md` §11), draws from the home faction, at most **2 points a City Day per city** across both rivals (§14.11), with the home floor of 50 holding.

Rival ground also differs in other ways:

- +4 difficulty on every check;
- ×1 only;
- a 15 % run-in on every tier-1 tap;
- Heat, mission run-ins and the caught base doubled;
- +50 % Party XP (+75 % while the city is in Unrest);
- the orders cannot be done there.

ADR 0030 made the day-constant facts of a place (close race, comeback, live Issues) a `PlaceState` read in the action's snapshot.

## Decision

1. **`applyAgainst(shares, { actor, target, swing, homeFactionId?, cap? })`** in `packages/rules/opinion.ts`.
   - It works in integer thousandths.
   - It takes from the target down to the target's floor (50 in its home city) and down to the remaining cap.
   - `floor(taken / 2)` goes to the actor, the rest to Neutral. The shares still sum to exactly 100.000.
   - Persuasion (`applyPersuasion`) is unchanged.
2. **The ledger gets two legs** in the same transaction: the target's −taken and the actor's +half. The influence contribution (heroes, the scoreboard line) counts the **actor's leg**, which is what moved *for* the actor's faction. This is a designer question with that default.
3. **Rival ground is a place state, not character state.** `PlaceState.rivalGround { homeFactionId, unrest, pressureLeft } | null` is set when the city's home faction exists and is not the actor's, computed from the city document every action already reads. On rival ground:
   - The **+4** is a named check row `{ id: 'rivalGround', label: 'Rival ground', value: −16 }`. That is exactly +4 difficulty under §8.4 (4 % a point). The ticket's *worse odds* tag and the reason line *This is rival ground; everything is harder here.* come from the existing machinery.
   - The **Party XP** line gets a share `Rival ground` of 0.5, or 0.75 in Unrest, a part of its own.
   - **Heat ×2**, **mission run-ins ×2** and the **caught base ×2** live in the street's rules (ADR 0032, 0033). The tier-1 run-in is 15 % flat.
   - **×1** is refused at the server (`ONCE_ON_RIVAL_GROUND`). The view sends no ×3 cost.
   - **The orders do not match** there (`MatchCtx.rivalGround`).
4. **The cap is a counter on the home city's document**: `cities.rivalPressure { day, lost, prev }`. The action's transaction writes it together with the opinion, on the same document, so concurrent writes serialise as ADR 0010's write-through already does. `prev` keeps yesterday's total for the paper's *Rival Callers* line.
5. **`leader` in the capital** is a boundary fact: `districts.state.leader`, set by `districtState` at each boundary like the close race, so a ticket's target never changes under a player. A mission against `leader` targets the leading faction, or the runner-up when the leader is the actor's own faction.

## Consequences

- Every rule of rival ground is a named line or tag in the existing breakdown. The client learns no new rule. It prints the tags the server sends.
- Morale damage at home is real and bounded, and the home floor still guarantees the home. The morale knock-on (ADR 0022) fires on a threshold crossed by a rival's action, as it does for the home faction's own.
- Heroes can include visitors (GDD §14.5). An illegal mission's contribution is half its swing, by default.
