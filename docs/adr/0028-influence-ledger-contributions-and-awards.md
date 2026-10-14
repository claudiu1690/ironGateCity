# ADR 0028 — The influence ledger: rows in the transaction, per-character contributions, awards credited by the settlement

**Status:** accepted, built in slice 4 (amends ADR 0010's remedy); amended 2026-10-14 (a known limit of decision 4, open for slice 6) · **Date:** 2026-10-03

## Amendment (14 Oct 2026)

Decision 4 says the ledger rows "already carry what a fold needs". That isn't quite true as built (QA slice 4, note n3; `packages/rules/src/ledger.ts`): **persuasion writes a row only for the gaining party.** Opinion is a share that sums to 100. When Neutral is at its floor and the gain comes out of a rival's share, that loss is applied to the meter but has no row, so folding the ledger would not reproduce the meter. At slice-4 scale this never happens (Neutral sits at 35–40 in the capital), but it will in a city where the parties have taken everything above Neutral's floor.

Nothing reads the ledger as a meter today (the meter is written through, decision 1), so no code changes now. **Decision for slice 6** (the faction ledger screen and the scoreboard read these collections first): either

- (a) write the losers' rows too (one row per party that moved, with a system source for the losses, so contributions stay credited to the actor only), which makes a fold exact; or
- (b) keep the gaining-party rows only and record that the ledger is an attribution log, not the meter's source, which drops the fold as the contention remedy.

Default for the slice-6 design: (a) if the slice-6 screens show losses per party, otherwise (b).

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
