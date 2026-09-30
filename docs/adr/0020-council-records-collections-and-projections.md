# ADR 0020 — Council records live in their own collections; the character only embeds projections; world processing never writes a character

**Status:** accepted, implemented (slice 3; follows plan §5 row 3) · **Date:** 2026-09-29

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
