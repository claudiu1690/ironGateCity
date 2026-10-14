# ADR 0062 — The national audit: provisional with the automatic set-asides, confirmed by take-office if nobody acts; council recounts within the day from stored inputs

**Status:** proposed (slice 9; extends ADR 0043, 0047); decision 4 amended 2026-10-14 for the voting rework (ADR 0083, 0084) · **Date:** 2026-10-04

## Amendment (14 Oct 2026)

Councils have no order paper since the voting rework (ADR 0083). In decision 4, "the order paper and the rule in force are untouched" now reads: **the rule ballot and the rule in force are untouched.** A recount moves seats only; the rule was decided by the town's vote, not by the seats.

Also changed by ADR 0084: a council's seat count is `local support + 3 × backers`, with no members' votes, so the set-asides that can move a seat in a recount are **backings** by linked accounts. The linked-accounts rule (ADR 0061) applies to the rule votes (`votes` by `ordinanceId`) at the count itself (`docs/tech/voting-rework.md` §17). Whether a recount may also change the rule a town chose is open for the slice-9 design; the default is no (the rule stands, as GDD §15.2 says today).

## Context

Slice 7 counts the republic at the boundary into term day 27 (*to be confirmed tomorrow*) and seats the government at day 0, in two transactions on two days (ADR 0047). Design §4.5 (GDD §15.2) fills that day with **the audit**:

- At the count, the audit runs itself: links are recomputed, sets are set aside, and bursts and backing rings are noted. The provisional result already carries the set-asides.
- During the day a moderator may **confirm**, **set aside** a noted set, **unlink**, or **order a recount** of a council counted in the last 24 hours.
- **At day 0 the count confirms itself** if nobody acted, because nothing an absent person must do may block anyone (§15.1).
- A council recount applies the set-asides. A seat that changes hands passes at once (the loser's term is not completed), and the rule in force stands. Council results are otherwise final at the count.

## Decision

1. **Day 27.** Before the boundary's transaction, `refreshLinks()` (ADR 0061). Inside it:
   - `countNation` runs with the collapsed tally;
   - the notes (bursts, rings, L3 pairs among the voters) are computed;
   - `audits { _id: 'nation:{n}', status: 'provisional' }` is written.
   The stored result keeps every input (ADR 0047).
2. **Moderator acts** are `audit.*` procedures, gated by role and logged with an idempotency key:
   - **Confirm** filters `status: 'provisional'`.
   - **Set aside** and **unlink** re-run `countNation` from the stored inputs with the new tally and replace the result, while it is provisional.
3. **Day 0.** Take-office first sets a provisional audit to `confirmed` with `confirmedBy: 'auto'`, in its own transaction with the same status filter, then seats from the (possibly re-run) result. The paper's day-0 line names the set-asides as a number.
4. **Council recounts** are allowed for a council, district or Clearwater count **counted at today's boundary**:
   - `recountPreview` and `recount` run the pure `recountRows` over the stored rows and inputs with the extra set-asides;
   - a changed seat: the loser's term gets `vacatedDay = today`, `recounted: 'lost'` (not completed, so no ladder credit), and the winner's term starts today, `afterRecount`;
   - the Governor is recomputed, and the city's projection and both characters' `offices[]` are updated under their version guards;
   - the order paper and the rule in force are untouched;
   - a live headline (ADR 0023) reports it.
   Council and district results gain the `inputs` a recount needs where slices 3–7 did not store them.
5. No recount exists for the Chair or the picks. Their set-asides are applied at the count.

## Consequences

- The republic is never without a confirmed government, and a moderator's absence costs nothing.
- Every recount is a pure function of stored data, so it is reproducible and testable.
- A recount writes two characters from a moderator's act. This is a rare, deliberate exception to "the world never writes a character" (ADR 0020), taken under their version guards (a racing act retries).
- After day 0 a national result is final. A late discovery is a note in the log and the next term's concern.
