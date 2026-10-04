# ADR 0061 — Linked accounts: `accountLinks` refreshed nightly, sets as components at read, and one collapsing seam in every count

**Status:** proposed (slice 9; applies ADR 0019, 0047) · **Date:** 2026-10-04

## Context

Design §4.3–§4.4 (GDD §15.2) defines when two accounts are **linked**:

- **L1:** a shared device;
- **L2:** a shared IP on 3 of the last 14 City Days, with at least three interleavings and no overlap;
- **L3:** created within 48 hours on one device or /24, with the same first three ballots. L3 alone is only *noted*.

A **household** never gives L2: two accounts that overlap ten minutes or more on three days are two people. A **linked set** is a connected component of links.

A set's ballots, backings, petition signatures and event hands count once: the earliest stands and the rest are set aside at the count. Its contributions to the Issue's top five, District Hero and the scoreboard are summed under its earliest account. Bail posted between linked accounts pays no Party XP, and a linked visit heals nothing. None of this is refused at the tap or told to anyone. The only public sign is an aggregate line on the count.

Counts happen in many places: the city day's councils, districts and Clearwater (ADR 0017); the nation's day for the Chair, the picks, the republic and votes on the Chair (ADR 0043, 0047); petitions at their close; event resolutions; awards. Any of them may run on a lazy path. Slice 3 counts with one `tally()` `$group` (ADR 0019).

## Decision

1. **`accountLinks`**, one row per pair (`{a}|{b}`, character ids):
   - `kinds`, the evidence and its window;
   - `active` (L1 or L2), `noted` (L3 alone) and `household`;
   - a sticky `unlinked` for the kinds a moderator unlinked; new evidence of another kind re-activates the link.
2. **The rules are pure** (`packages/rules/audit.ts`): `findLinks`, `linkedSets` (union-find), `collapseBySet`, `countableBackings`, `rankBySet`, `findBursts`, `findRings`, `recountRows`. An IP-day with more than 50 accounts is a shared network and gives no L2 evidence.
3. **The refresh** runs as the `links-refresh` job (23:50 UTC and at worker start) and again before the national count. It is a recompute of the 30-day window, upserted by pair, and rows that lose their evidence become inactive. It reads only sightings and early ballots, so it runs outside any game transaction.
4. **Sets are computed at read**, inside each count's transaction: the active links touching the count's voters, expanded until closed.
5. **One seam per count kind.**
   - `countableTally` replaces `tally`: it reads `{ voterId, candidateKey, createdAt }`, collapses by set (the earliest cast stands), and returns the votes and the set-asides.
   - Turnout uses the **kept** ballots, so a ring never inflates the ballot half's weight.
   - The same collapse runs on backings, signatures, hands, awards and the scoreboard's read (the top 50, collapsed, ten shown).
6. **`audits`**, one row per count that set anything aside or noted anything (always for the national count), keyed by the election id. Every count result stores `setAside: n`, the only number a player ever sees.
7. **At the tap**, bail and visits read the pair's row (one indexed read). Bail's Party XP is also capped at three a day per payer for everyone (`today.bailsXp`).

## Consequences

- Ballots are never refused and receipts never change. A household is safe by rule, and a ring loses its weight at every count.
- One function per count kind changes, and every count is tested with a linked pair.
- Links are only as fresh as the last refresh for council counts (at most a day old). The national count refreshes first, and a moderator can recount a council the same day (ADR 0062).
- Reading every ballot row instead of a `$group` costs little at MVP scale: tens of ballots per council, hundreds nationally.
