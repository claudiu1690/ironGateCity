# ADR 0048 — Every office is an `officeTerms` row; the ladder is a count of completed terms; the Governor is chosen in the count's transaction

**Status:** proposed (slice 7; extends ADR 0020) · **Date:** 2026-10-04

## Context

Slice 7 completes the ladder (GDD §15.1, design §3):

| Office | Term | Pay per boundary held |
|---|---|---|
| Governor / Mayor | 5 days, with the council | 20 PC, 30 FXP |
| Faction Chair | 28 days, term day 14 → 14 | 20 PC, 40 FXP |
| Deputy | 28 days, day 0 → 0 | 5 PC, 30 FXP |
| President | 28 days, at most two in a row | 50 PC, 60 FXP |

Rules that apply to every office:

- **each office needs a completed term in the one below**: Chair: a council term; deputy: a Governor's term or three council terms; President: a deputy's term;
- a term is completed when held to its count; a move, a dissolution or a removal does not complete it;
- several offices at once are allowed, and the stipends add.

ADR 0020 put council seats in `officeTerms` (players and NPCs), a display projection `offices[]` on the character, and stipends credited lazily by the character's settlement. It noted that "a completed term can be counted for the ladder (slice 7)".

## Decision

1. **`officeTerms.office`**: `'council' | 'governor' | 'chair' | 'deputy' | 'president'` (absent = council).
   - `councilKey` is per office: `governor:{city}:{cycle}`, `chair:{faction}:{term}`, `deputy:{term}`, `president:{term}`.
   - The unique `{ councilKey, seat, fromDay }` serves them all; a runner-up's presidency starts on its own day.
   - Player holders only, for the new kinds: local Governors, local deputies and the party's figures have no rows (they need no ladder and draw no pay).
   - `vacatedDay` and `completed` keep slice 4's meaning.
2. **Powers are set-once fields on the term**: `powers.rule`, `powers.address`, `powers.veto`; `pledges[]` on a President's term. Every power re-reads the term in its transaction; the projections (`characters.offices`, `factions.chair`, `nation.government`) are for display only.
3. **The ladder is a count** of completed rows by office (`ServiceRecord`, from the existing index on the holder). `standGate` and `ladderRows` are pure.
4. **Stipends generalise.** `officeStipends` pays per boundary held per office, ending at `vacatedDay`, in the member's settlement (ADR 0020); the PC cap is applied once by `applyGains`.
5. **The Governor (Mayor) is chosen in the count's transaction**, by `governorOf` (pure):
   - at home: the highest-total player councillor with a completed council term;
   - in the capital and Clearwater: the same among the largest bloc's councillors;
   - else the bloc's top local, marked *Local*, setting nothing and paid nothing.
   The projection is `cities.council.governor`.
6. **The Governor's rule is an item on the order paper** (`movedBy.kind: 'governor'`, inserted at position 1, ahead of the party's item). The local councillors' chain: their players' lead → the Governor's rule (the Governor's bloc) → the party's rule (ADR 0046) → the branch's motion. Four player *None of these* at home make the locals abstain.

## Consequences

- One collection answers "who holds what", "what did they complete" and "what are they paid", for every office.
- A dissolution, a removal or a move is one write (`vacatedDay`). Pay stops and the rung is not earned, with no other bookkeeping.
- Adding ministers later (post-MVP) is another `office` value with its own key.
- The settlement reads the same `officeTerms` query as slice 3, now over more rows (≤ 5 current per member).
