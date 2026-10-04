# ADR 0068 — Opinion damping: a seven-day ring of distinct contributors on each place, rolled by its own boundary, applied in the opinion write

**Status:** proposed (slice 9; extends ADR 0022, 0028) · **Date:** 2026-10-04

## Context

Design §3.3 (GDD §14.2, closing Appendix C #13) multiplies a city's or district's swing from **solo and event actions** by `clamp(20 ÷ active, 0.25, 1)`. Here *active* is the seven-day mean of distinct characters with a ledger row at the place per City Day, written by the day job.

The factor is the identity under twenty contributors, so nothing built so far changes. Drift, the Issue's +3, ballot and seat inputs to morale, and the exposé are not damped. The ledger records the swing as applied, and the modal shows the applied figure.

Opinion is written in the act's transaction on the place document (ADR 0010, 0022). Each place's boundary is its own lazy-safe transaction (ADR 0017).

## Decision

1. **`active: { days: Array<{ day, n }>, mean }`** on every place document that takes opinion (home cities, capital districts, Clearwater).
2. **The place's own boundary** into day *d* counts the distinct `characterId`s of the ledger's solo, mission and event rows at the place on *d − 1*. `rollActive` (pure) replaces a same-day entry, keeps seven, and averages them. A re-run of the boundary writes the same ring.
3. **`swingFactor(mean)`** (pure) multiplies the swing passed to `applyPersuasion` / `applyAgainst` in tier-1 actions, missions and event resolutions, read from the place document those writes already hold. The ledger row stores `damped` when the factor is under 1. The opinion knock-on's named factors (ADR 0030) gain a dev-only `damping` row.
4. Nothing else reads it.

## Consequences

- No new job, read or contention: the ring rides the boundary, and the factor rides the act's existing read.
- At today's populations the factor is 1, so every earlier slice's tests pass unchanged.
- The open beta needs no rule change when a city fills. The 20 and the 0.25 are constants checked by `pnpm sim:scale` before it.
