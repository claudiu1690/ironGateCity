# ADR 0045 — Parliament: bills in their own collection with embedded votes, slots by natural keys, local deputies computed at the division, a signature day that serialises with the veto

**Status:** accepted (slice 7, built 16 Oct 2026; as built: docs/tech/slice-7.md, Deviations); the Unrest link amended 2026-10-16 (the secretary's line) · **Date:** 2026-10-04

## Context

Parliament always sits (design §5, GDD §15.6). Sixty seats are split by the national score; each party's seats go to its players and then to **local deputies run by the game**.

**The order paper** holds at most three bills plus the President's. A bill is a law, a strike-out or a vote to remove the President. Each power has its own limit:

- the President: once a week, free, in a slot of its own;
- a deputy and a Chair: once a term, 50 PC;
- the secretaries: one bill a week, for parties with no player Chair or deputy.

**The vote:**

- three days; deputies vote For or Against, publicly;
- local deputies follow a chain: the player deputies' majority → the Chair's line → the secretary's line; while the party's home city is in Unrest they vote the secretary's line ahead of the chain (amended 16 Oct 2026, phase C: they abstained, and a quiet month stalled Parliament; GDD §15.6);
- the thresholds: 31, 36 for a factional law, 40 for a removal or an override.

**After a pass:**

- a passed law waits one **signature day**, on which the President may veto (once a term);
- a vetoed bill can be voted through anyway with 40;
- at most five laws are in force; a failed bill waits seven days; open bills lapse at term day 0.

The design suggests computing local votes at the division rather than storing them (design §18 Q4), and asks whether bills are embedded in a term document or have their own collection (Q2).

## Decision

1. **`bills` is its own collection.** A term holds an unbounded number of bills. Each bill is read alone (its page) and as a short list (the chamber).
   - **Votes are embedded**: at most sixty, public, read with the bill. A vote is a conditional `$push` filtered on `status: 'voting'` and `votes.characterId: { $ne }`.
   - The Chairs' **lines are embedded** (`lines.{faction}`).
2. **Slots and limits are unique natural keys, not counters:**

   | Key | Rule it enforces |
   |---|---|
   | `slotKey` (`r1`–`r3` per term), partial on `status: 'voting'` | three regular slots; a racing tabler retries the next slot, then gets `PAPER_FULL` |
   | `slotKey` `president:{term}:{weekDay}` | the President's week |
   | `slotKey` `override:{billId}` | one override per veto |
   | `slotKey` `clerk:{term}:{day}` | the clerk's motion |
   | `lawId`, partial on a voting law bill | one bill per law on the paper |
   | `tablerKey` (`{characterId}:{term}:bill` / `:removal`) | once a term per member |

   **The seven days between removal motions** are serialised by a guarded write on `nation.government.lastRemovalDay`.
3. **Local deputies are never stored.** At the division, `divideBill` (pure) computes each bloc's local vote from:
   - the bloc's player deputies' votes;
   - the Chair's line on the bill;
   - the secretary's line (content);
   - Unrest at home.
   A tie among player deputies falls through to the next link; an explicit *Free vote* abstains; an unset line falls to the secretary's. The division stores each bloc's vote **and its reason**, for the bill's page.
4. **The life of a bill is a status machine driven by boundaries**, in the nation's day (ADR 0043):
   - `voting` → (the division into tabling day + 4) → `awaitingSignature` | `failed` | `struck` (a strike-out's law ends the boundary after) | `removed` / `survived`;
   - `awaitingSignature` → (the next boundary) → `inForce`, inserting the law (ADR 0044);
   - **the veto** writes the bill filtered on `status: 'awaitingSignature'`, `signatureDay: today`, so a veto racing the enactment is a write conflict that one side wins;
   - **the override** is a new bill in its own slot (needs 40, not vetoable), tabled only if it can divide by the boundary into term day 27.
5. **The cap at enactment** (`enact`, pure): the same law renews itself; a named law ends; at the cap with no live named law, the law in force that ends soonest ends.
6. **Who tables what is re-read in the transaction.** The power comes from `officeTerms` (ADR 0048); the price and the version guard are on the character.

## Consequences

- The paper's limits are exact under races, with no counter to drift and no hot document beyond the bills themselves.
- Local deputies cost nothing to store, and their behaviour can change (a rule change in `localVote`) without a migration. The stored division keeps history honest.
- The chamber is one indexed query (`termIndex`, `status`, `divideDay`). A bill's page is one document.
- The veto and the enactment can never both apply. Every pass, failure, veto and override is printed from the stored division.
