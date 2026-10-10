# ADR 0084 — Seats by reputation and backers; standing is 10 PC spent with a rule; backing open until the count; the councillor's rule lives on the term

**Status:** proposed (voting rework, `docs/tech/voting-rework.md`; amends ADR 0018's declare, withdraw and endorse rows and ADR 0020's deposit refund) · **Date:** 2026-10-10

## Context

The approved design (`voting-simplified.md` §3.5–§3.7, the user's answers to its §7 Q1 and Q2) makes these changes:

- **Seats:** the total is `local support + 3 × backers` (at most five counted). Members' votes are no longer part of it, because the ballot is for a rule. Ties go to backers, then Standing Successes, then filing order (locals after every player).
- **Standing:** Rank 3, Known here, **10 PC spent and never returned**, and the candidate names their rule.
- **Removed:** the two-backer gate, striking, withdrawing, the small-branch doubling and the deposit's refund.
- **Backing** stays as an optional +3: 10 PC, public, final, one per member per cycle per city, **open until the count**.
- **The branch's backing** becomes a free +3, given on a day the candidate does all three orders.

As built, a candidacy runs `filed → standing | struck` at the close (day 2). The deposit runs `held → spent | due → returned`, and the settlement refunds `due` (ADR 0020). Endorsing is open on days 0–1 only, and `effective` (with the small-branch double) is computed at the close. The count adds members' votes. Platform lines are a faction list, chosen at declare.

## Decision

1. **A candidacy is `standing` from the declare**, then `elected` or `defeated` at the count.
   - `rule` (an ordinance id) replaces `platformId`. `deposit` is written `spent` and nothing reads it.
   - `filed`, `withdrawn` and `struck` remain in the type for old rows only.
   - The declare's guards are unchanged:
     - the unique `{ electionId, characterId }`;
     - `$inc elections.filed` filtered on `status: 'nominations'`;
     - the version- and `pc ≥ 10`-guarded spend.
   - `council.withdraw` is removed. A standing candidate cannot move house until the count (`ON_BALLOT` from the declare, Appendix C #61), so the move's withdraw path goes.
2. **The list freezes at the set** (boundary into day 2): every standing player, by filing, then locals to nine (`npcsStanding`, unchanged). `closeNominations` becomes `freezeList`, with no strike and no doubling.
3. **The count is `countSeats(lines)`.**
   - `total = wardVote + 3 × min(backers, 5)`, where `backers` = members' backings + 1 if the branch backed.
   - It is computed **at the count** from the candidacy, since backing is open until then.
   - Ties: backers, then successes, then order.
   - `CountRow` loses `votes`. Old counted results keep theirs, and views read `backers ?? endorsements`.
4. **Backing (`council.endorse`) is open on cycle days 0–4.**
   - Its guards: the candidacy filtered on `status: 'standing'` (which the count flips), plus the existing `endorsementsGiven` guard and the PC spend.
   - **The branch's backing** is set once, on any day 0–4 when an act completes the candidate's three orders (`branchBackIfStanding`, in that act's transaction, filtered on `status: 'standing', branch: null`).
5. **The councillor's rule lives on `officeTerms.rule`.**
   - The count copies it from the candidacy for a player, and from content (`NpcCandidate.rule`) for a home local; it is null for capital locals.
   - `council.setRule` changes it on cycle days 0–1 of the term, free:
     - a request-keyed transaction;
     - the term filtered on holder, current and not vacated;
     - `$inc changes` on the ballot filtered on `status: 'open'`.
6. **The refund is retired.** Migration 009 credits every remaining `deposit: 'due'` once (ADR 0086). The settlement's refund read and the desk's *Deposit returned* line are removed.

## Consequences

- The PC sinks in slice 3 are two (stand 10, back 10). The economy sheet's +55 a cycle from the first seat is the designer's number (design §3.8).
- A branch of one always has a list, and a candidate whose backers never come still stands. Seats are won by work (local support) and by backing, never by turnout.
- `marginToSeat` and the *8th · 4 short* line are unchanged in shape. The *last seat is usually close* line goes.
- Backing on days 2–4 writes a candidacy that the count also writes. A backing racing the count loses with a write conflict and is refused `CANDIDACY_CLOSED`.
- Slice 7 reuses `candidacies` for the Chair and the national lists (ADR 0047). Its two-backer gate for the Chair goes the same way (design §5.1, §15.4), and its knock-ons are listed in the tech doc.
