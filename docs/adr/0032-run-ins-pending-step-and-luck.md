# ADR 0032 — Run-ins: a pending step in `encounters`, a pointer on the character, luck after a decide window and before the day turns

**Status:** proposed (slice 5) · **Date:** 2026-10-03

## Context

A **run-in** can follow a mission's check (`docs/design/slice-5-risk.md` §4.6, §10), and every tier-1 tap on rival ground (§10.5). The check's result is **held**. The player then makes one choice: Fight, Run, Talk your way out, Pay them off, or *Leave it to luck*. That choice decides whether the held result is paid:

- a win, a talk or a payment pays it as rolled;
- a Run keeps only Failure's XP;
- a loss sends the player to the infirmary, or to the cells if the opponent was the police.

The caught check follows. One result modal shows the whole story. An unanswered run-in is resolved by luck "on the next read" (GDD §20). This raises three problems:

1. **One tap now spans two requests** (the start, then the choice), and both must be idempotent (ADR 0002, 0008).
2. **The client reads while the run-in modal is open.** After the start returns, it invalidates `character.me` and `city.get`, and TanStack Query refetches on window focus. If any read resolved a pending run-in, those refetches would resolve the run-in the player is looking at.
3. **A run-in started at 23:58 can be answered after midnight.** Its rewards, orders and tally belong to the day it was started (ADR 0005, 0017).

The plan (§5) lists an `encounters` collection for slice 5.

## Decision

1. **An `encounters` collection**, one document per run-in. Its `state` goes from `pending` to `resolved`. It holds:
   - the seed;
   - the opponent with its scaled numbers, and the four chances;
   - the **held start** (the pure mission start, or for a tier-1 tap the resolution and its Partial twin);
   - the choice, `by: 'player' | 'luck' | 'auto'`, the outcome, and the final `logId`.

   The unique index is `{ characterId, idempotencyKey }` (the start's key).
2. **A pointer on the character**, `runIn { encounterId, state, day, decideBy, cityId }`. It stays until the result modal is closed (`encounter.close`), the same pattern as `journey` (ADR 0025). While it is `pending`, Energy actions, missions, training, travel and the cells' acts refuse with `RUN_IN_PENDING`. Political acts and the paper still work.
3. **Writes.**
   - The start writes, in one transaction: the Energy, the Heat (paid whatever happens), the way, the pointer and the encounter.
   - The resolution writes, in one transaction: everything else (rewards, Standing, orders, the tally, opinion and the ledger, Issue points, Health, the record, the cells or the infirmary, the encounter's resolution) and the `actionLogs` row, **under the start's key**.
   - The start's retry looks in `actionLogs`, then in `encounters`. `actionLogs` rows stay immutable.
4. **`encounter.choose`** takes a request key and a `state: 'pending'` guard. A choice the player sends while the run-in is pending wins, even after `decideBy`. A choice on a resolved run-in returns its stored result, never a refusal: one choice, final.
5. **Luck.** `loadCharacter` resolves a pending run-in by luck (`by: 'auto'`) in two cases:
   - **after the decide window**: on any read once `decideBy` (start + `RUN_IN.decideMs`, five minutes) has passed;
   - **at the day's turn**: before the character's day is settled, whenever the run-in belongs to an earlier City Day. Its orders and tally then land on its own day.

   Both resolve **as of `min(decideBy, the end of its day)`**: the sentence, the ward and Health all count from then. This is the same function the choice uses, run without a request key (state catch-up, ADR 0008).
6. **Rolls are named streams of the stored seed** (`seed`, `:runIn`, `:choice`, `:caught`, `:damage`). A retry, a second device or a different choice can never reroll a row.

## Consequences

- One result modal per mission whatever happens. A run-in never holds a player hostage, and closing the game is the same as *Leave it to luck*.
- A player who reopens the game within five minutes sees the same run-in again, rather than a luck result they never chose. GDD §20's "on the next read" becomes "the next read after five minutes, or the day's end". The designer records the window in the GDD.
- A run-in never crosses a City Day unresolved, so ADR 0017's invariant holds. Its city-side writes (opinion, ledger, Issue points) go to the documents as they are at resolution. A tag on an Issue that is no longer live adds no points instead of failing the resolution.
- Two collections take part in one tap's idempotency. The `stored()` lookup checks both. A concurrent start whose two copies take different branches (one rolls a run-in, the other does not) still commits once, because both write the character under the version guard.
