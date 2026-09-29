# ADR 0006 — ×3 is one request: one key, one transaction, one seed stream, all-or-nothing Energy

**Status:** accepted (slice 1) · **Date:** 2026-09-29

## Context

GDD §13.1 (pinned for slice 1): "A batch rolls each attempt from one seed, shows one row per attempt
and a '2 of 3' stamp, counts each row separately for Standing and Directives, and is **disabled when
Energy is short** (no partial batch). ×3 ships in slice 1; ×5 later." §8.5: training ×3 trains three
points at three rising costs. The mockups (`MobileMission.dc.html`, `Mission.dc.html`) recompute Local
Standing between attempts, so the chance can rise mid-run, and use the success text when at least one
attempt succeeded.

Options considered:

- **Three client requests** in a row: three modals or client-side stitching, three chances of a
  network failure half way, and the client deciding what "one ×3" means.
- **One request, three seeds:** more stored data for no benefit.
- **One request, one seed, a stream of rolls:** `createRng(seed)` is already a deterministic stream
  (slice 0 designed for this).

## Decision

- `action.perform` takes `times: 1 | 3` (the rules accept 5; the API and UI add ×5 when the design
  asks). One idempotency key covers the run; one `actionLogs` row stores it with `times`, the seed and
  every attempt. A key reused with a different action or `times` is refused (`KEY_REUSED`).
- One transaction, one seed; attempt *i* of a checked action uses the *i*-th `roll100()` of
  `createRng(seed)`. Replaying the seed reproduces every roll.
- **All or nothing:** if projected Energy is below the run's total cost (`3 × cost` for a checked
  action; the sum of the three rising costs for training), the server refuses with
  `NOT_ENOUGH_ENERGY { energy, cost, times, nextTickAt }` and nothing is spent. The view carries both
  costs, so the client disables ×3 on the same rule. Job shifts are ×1 only (once a day).
- Attempts are resolved **in order against evolving state**: each spends its own Energy and Rested
  (the Rested bonus is exact per Energy point, §6.3), each Success adds to Local Standing before the
  next check (as in the mockup), each row advances a Party order, each training row raises the stat
  and therefore the next row's cost.
- Each row's rewards are rounded on their own (§5.5); the tiles are the sums of the rows.
- The stamp is `success` (all), `partial` (none) or `mixed` with `successes` of `times` ("2 of 3");
  the narrative is the success text when at least one row succeeded.

## Consequences

- One modal, one write, one log row per tap, whatever `times` is. Retries return the stored result.
- The modal's rows show the chance each attempt actually had (it can differ within a run).
- ×5 needs no new server logic: widen the input and add the button.
