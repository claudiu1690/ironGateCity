# ADR 0020 — Council records live in their own collections; the character only embeds projections; world processing never writes a character

**Status:** accepted, implemented (slice 3; follows plan §5 row 3); superseded in part 2026-10-12 by ADR 0083 (the `ordinances` row) and ADR 0084 (the deposit refund) · **Date:** 2026-09-29

## Amendment (14 Oct 2026)

The split stands: council records in their own collections, projections on the character, and no world→character writes. Two rows changed in the voting rework:

- **`ordinances` is the rule ballot**, not an order paper (ADR 0083 §2): model `RuleBallot`, one per council term, `_id = councilKey`, with `status: 'open' | 'set' | 'counted'`, the frozen `cards`, `unrest`, `changes` and `result`; an old order paper's items, votes and division sit under `legacy`. There is no division; the ordinance history is the ballots' results and `cities.ordinanceHistory`.
- **The deposit refund is retired** (ADR 0084 §6). Standing is 10 PC spent and never returned. Migration 009 credited every remaining `deposit: 'due'` once (ADR 0086); the settlement's refund read and the desk's *Deposit returned* line are gone. The stipend is unchanged.
- **`officeTerms` gains `rule`** (the councillor's rule, ADR 0084 §5) and `ruleSetAt`.

## Context

Plan §5 gives slice 3 five collections (`elections`, `candidacies`, `votes`, `officeTerms`, `ordinances`) and two embedded fields (`offices[]`, `endorsementsGiven[]`).

Slice 3 also has three effects that cross from the city to a player:

- a councillor's **stipend** (10 PC and 20 FXP at every boundary held, present or not);
- the **deposit refund** of a struck candidacy;
- the seat itself.

If the city-day transaction (ADR 0017) wrote character documents, every count would bump versions under players who are acting at midnight. The count would also have to apply the PC cap and rank-ups, which are the character settlement's job (ADR 0005).

## Decision

**Collections**, all written only by the city day or by the acts of ADR 0018:

| Collection | One document per | Natural key |
|---|---|---|
| `elections` | city per cycle | `_id = "coalport:4091"` |
| `candidacies` | member per election | unique `{electionId, characterId}` |
| `votes` | voter per election | ADR 0019 |
| `officeTerms` | seat per term | unique `{councilKey, seat}`; players and NPCs alike, so a completed term can be counted for the ladder (slice 7) |
| `ordinances` | **order paper**: council term | `_id = councilKey`: the items, the councillors' public votes and the division |

The division is the ordinance history. The city document keeps only what is in force and the last four ordinances (ADR 0021).

**Embedded on `characters`:**

- `offices[]`: a **projection** written by the character's own settlement from `officeTerms`. Seats begin and end only at boundaries, and the settlement always runs after its city's boundary (ADR 0017), so the projection is exact for the whole day. It serves the HUD, the Me tab and the Paper dot with no extra read. Every permission check re-reads `officeTerms` inside its transaction.
- `endorsementsGiven[]`: written by the endorse transaction, which already spends PC on the character. It is the one-per-cycle guard (ADR 0018). It is pruned to the last four cycles.

**No world→character writes.** The settlement credits the stipend and the refund lazily, in its version-guarded transaction:

- the **stipend** for each boundary `b` since `day.settled` with `term.fromDay < b ≤ term.toDay` (5 a term);
- **refunds** for candidacies with `deposit: 'due'`, flipped to `returned` in the same transaction.

The rules are `stipendBoundaries` and `applyGains`. Both are shown on the desk (*Stipend, Coalport Council · +50 PC · +100 FXP*, *Deposit returned · +10 PC*).

## Consequences

- The count never contends with character writes, and the PC cap and rank-ups stay in one place.
- A councillor away for the whole term gets the whole stipend on their next visit, like the salary. Nothing is lost, and nothing is paid twice (the `day.settled` guard).
- The settlement grows by two indexed reads a day (`officeTerms` by holder, `candidacies` with a refund due).
- A seat is visible in views from the character's next settlement, which is always before any view of that day.
