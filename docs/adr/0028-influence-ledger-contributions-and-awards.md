# ADR 0028 — The influence ledger: rows in the transaction, per-character contributions, awards credited by the settlement

**Status:** proposed (slice 4; amends ADR 0010's remedy) · **Date:** 2026-10-03

## Context

GDD §14.5 (slice 4): every opinion change is a ledger row; each player sees, live, how much they moved each place this election and their rank among all contributors; at each count the top contributor per place and level bracket (at least +0.5) is District Hero (City Hero at home): 25 PC, a title for the next cycle, a line *In Print*. Issue resolutions also give 4 PC to the owner's top five contributors (GDD §14.6). ADR 0010 kept opinion written in the action's transaction and named a ledger folded into the meter as the remedy for contention. ADR 0020 decided that the city day never writes a character (the stipend and refunds are credited by the character's settlement).

## Decision

1. **Keep the write-through** (ADR 0010) and **append a ledger row in the same transaction** (`influenceLedger`: place, faction, signed swing in thousandths as applied, kind, source, ref, day, cycle key). Drift, Issue awards, ballots and seats are rows too, with a system source (a ballot records its voter but is not a contribution).
2. **A `contributions` collection** of running totals, one per character per scope, upserted with `$inc` in the same transaction: `influence|<place cycle key>` (thousandths, from `action` and `journey` rows only) and `points|<issue doc id>` (Issue momentum). Each row carries the name, faction, level at the last contribution and `lastAt` (the tie-break). The plate line's rank is a count of higher totals; the scoreboard table and the heroes read the top of one scope by index. Nothing aggregates the ledger on a read path.
3. **Awards** (`awards`: hero or Issue, PC, a title with its days, unique by kind, ref and character) are written by the city day and **credited by the character's settlement**, which flips `creditedAt` in its version-guarded transaction and prints the desk line. The awards are also the hero record (the current title, *Heroes ×n*).
4. Folding the meter from the ledger remains the remedy if the playtest's `txAttempts` show contention; the ledger rows already carry what a fold needs.

## Consequences

- Attribution is exact and auditable; the plate line, the scoreboard, heroes and the top five are index reads.
- Two extra writes per opinion-moving action (an insert and an upsert on the actor's own document), neither on a shared document, so no new contention.
- "Being away costs nothing": a hero or a top-five contributor gets the PC and the title whenever they next play.
- The faction ledger screen (slice 6) and Legacy entries (slice 8) read the same collections.
