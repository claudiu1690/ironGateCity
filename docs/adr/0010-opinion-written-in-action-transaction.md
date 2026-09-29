# ADR 0010 — City opinion is written in the action's transaction (slice 1); a ledger takes over if it contends

**Status:** accepted (slice 1) · **Date:** 2026-09-29

## Context

GDD §14.2 (build order pinned in the slice-1 design): "the swing is **written to the city meter from
slice 1** (the modal shows the delta to three decimals, trimmed, and the city's new share to one
decimal); the drift arrives with the calendar in slice 4." The source rules are fixed: persuasion draws
from Neutral first, then from the rivals in proportion to their shares; Neutral never falls below 5 %
and a home faction never below 50 % in its home city; if nothing can be drawn the swing shrinks;
shares keep three decimals and always sum to 100.

The `cities` document is one per city and shared by every player there. Writing it from every action
transaction makes it a hot document: concurrent transactions touching it conflict, and MongoDB aborts
all but one with a `WriteConflict` (a `TransientTransactionError` that `connection.transaction()`
retries).

## Decision

- The action transaction reads the city's state document in its snapshot, computes the new shares
  with a pure `applyPersuasion(shares, factionId, swing, floors)` in `packages/rules` (integer
  arithmetic in thousandths of a point, so the sum stays exactly 100.000), and `$set`s them. A ×3 run
  applies its summed swing once.
- The modal reports the requested swing, the swing actually applied (after floors) and the faction's
  share before and after.
- No version field on `cities`: the transaction's write-conflict detection serialises writers, and
  the retry re-reads the fresh shares.
- **Drift is not applied in slice 1** (GDD: slice 4). It could be added cheaply with the same lazy
  pattern as ADR 0005 (a `driftedDay` on the city document, applied by the first write of a day), once
  its exact rule is pinned.

## Consequences

- Correct and simple for the playtest's handful of players per city.
- At scale (many players acting in one city within the same second) transactions on that city will
  retry more often and latency rises. The planned remedy, due with the influence ledger in slice 4:
  append one ledger row per action (no shared write), and fold the ledger into the meter in small
  batches or lazily on read. The playtest report (`pnpm report:playtest`) records transaction retries
  so the need is measured, not guessed.
