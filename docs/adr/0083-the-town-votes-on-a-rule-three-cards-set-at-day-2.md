# ADR 0083 — The town votes on a rule: three cards set at the boundary into day 2, one secret vote by rule, the winner in force from the count for five days

**Status:** proposed (voting rework, `docs/tech/voting-rework.md`; supersedes the division of ADR 0017 §1, the propose and council-vote rows of ADR 0018, the `ordinances` row of ADR 0020 and the *Up for a vote* block of ADR 0077; amends ADR 0019 and ADR 0021 §2) · **Date:** 2026-10-10

## Context

The user approved `docs/design/voting-simplified.md` on 10 Oct 2026. The player now votes for **a rule**, not a person:

- three rule cards, one tap, most votes wins;
- a tie, or no votes, goes to card 1, the party's rule;
- the winner runs the city for five days from the count.

The council's division goes, and so do proposals (20 PC), *None of these* and the 4-of-7 and 6-of-10 thresholds. A councillor's power is to put **their rule** on the ballot.

As built (slice 3, ADR 0017–0021):

- the citizens elect people (election k, counted into cycle day 0);
- the sitting council divides on an order paper at the boundary into day 2;
- `cities.ordinance` holds the rule passed, in force `[start + 2, start + 7)`.

Each `ordinances` document is an order paper, one per council term, with the items, the councillors' public votes and the division. Votes are one row per voter in `votes { electionId, voterId, candidateKey }` (ADR 0019).

## Decision

1. **The calendar keeps its days** (`cycleDay`, the offsets, the two boundaries). What each window holds changes:

   | Window | Holds |
   |---|---|
   | Cycle days 0–1 | Candidates stand. Councillors set their rule. |
   | Boundary into day 2 | **The set**: the candidate list is frozen (as the close did) and **the three cards are frozen**. |
   | Days 2–4 | The town votes on the rule. |
   | Boundary into day 0 | **The count**: the seats and the rule. |

   The winning rule is in force `[countDay, countDay + 5)`, a whole cycle: the rule voted on in cycle k runs in cycle k + 1. `councilDay` loses `voting` / `divideDay` and gains `ruleOpen` (days 0–1), `setDay`, `ruleWindow` and `nextRuleWindow`. `boundaryWork` returns `{ count, set }`.
2. **`ordinances` documents become rule ballots** (model `RuleBallot`, collection unchanged, `_id = councilKey(cityId, k)`, the same string as `electionKey` at home):
   - the fields are `status: 'open' | 'set' | 'counted'`, `cards` (frozen at the set), `unrest` (frozen with them), `changes` (a counter that serialises a councillor's rule change with the set) and `result` (at the count);
   - an old order paper's `items`, `votes` and `division` move under `legacy`;
   - the document is created open at the count that seats council k, set at `start + 2` and counted at `start + 5`.
3. **The cards are a pure function** in `packages/rules` (`homeBallot`, `capitalBallot`, `partyCardOf`) over the council's seats read in the set's transaction. Every councillor's rule is stored on their `officeTerms` row (`rule`), copied from the candidacy at the count for players and from content for locals. On days 0–1 the views show the same function's output over the current seats as a **provisional** ballot.
4. **The vote is a row in the numbered box (ADR 0019) keyed by rule.**
   - `votes` gains `ordinanceId`. `candidateKey` stays optional for slice 7's person ballots. Exactly one of the two is set.
   - The unique `{ electionId, voterId }` stays the one-vote guard: one per member per cycle per city at home, per district in the capital.
   - `{ electionId, ordinanceId }` is the count's `$group` index.
   - The vote `$inc`s `elections.ballots` filtered on `status: 'polling'` (ADR 0018 §3), and the count sets `counted`, so a stored vote is always in its count.
   - Secrecy is unchanged: no view carries a total, or another voter's choice, before the count.
5. **The count decides in the boundary's transaction:**
   - `decideHomeRule(cards, votes)` gives the winner, `how` (`votes`, `tie` or `fallback`) and the tallies;
   - it writes `result` on the ballot, `cities.ordinance = { id, fromDay: d, toDay: d + 5, paperId }` and the history entry;
   - it creates ballot k + 1 open.

   **A city always has a rule.**
6. **Unrest** (a home city's morale state at the set) takes the party's card off the ballot, and the fallback is the first card that remains (§14.11 as amended). It replaces the locals' abstention.
7. **Removed:** `divide`, `divideCapital`, `AGAINST_ALL`, `DivisionItem`, `deskNext`, `council.propose`, `council.councilVote`, `council.chamber`, the order paper's views, `COUNCIL.passVotes`, `maxProposals`, `cost.propose` and `CAPITAL_COUNCIL.passVotes`.

## Consequences

- No new collection, job or tick. The count and the set ride the existing city-day boundaries (ADR 0017). A vote is one indexed row and one `$inc`, as before.
- The rule's window moves two days earlier relative to the cycle, so the conversion (ADR 0086) must clip or extend the rule in force at the switch, never retroactively.
- The rule runs one cycle after the vote that chose it, with a different council sitting. That is the design's calendar (*the winner runs from Sunday for five days*).
- A councillor's rule change is a write on their own term plus a counter on the ballot. A change racing the set loses with a write conflict and is refused with `RULE_WINDOW_CLOSED`.
- ADR 0021's day-constant modifiers are unchanged: they read `cities.ordinance` and its history by day.
- The `ordinances` history keeps old order papers readable under `legacy`. Nothing reads them in play.
