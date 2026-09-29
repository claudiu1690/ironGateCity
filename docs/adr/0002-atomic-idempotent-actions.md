# ADR 0002 — Game actions: one transaction, one unique idempotency key, one version guard

**Status:** accepted (slice 0) · **Date:** 2026-09-29

## Context

Architecture rule 1: a double tap must never spend Energy twice, and the outcome must be decided
once on the server. Energy is a lazy timer (stored value + timestamp), so the guard "Energy ≥ cost"
cannot be expressed directly in a single `findOneAndUpdate` filter: the current value has to be
computed from the stored value first. An action also writes two documents (the character and its
action log), and from slice 1 sometimes three (the city's opinion).

## Decision

Every action procedure carries a **client-generated idempotency key** (UUID v4, created once per tap)
and runs as follows:

1. **Fast path:** `actionLogs.findOne({ characterId, idempotencyKey })`. If it exists, return its
   stored `result` unchanged. No dice are rolled again.
2. **Transaction** (`mongoose.connection.transaction(fn)`, which retries `TransientTransactionError`):
   1. read the character inside the session;
   2. compute the lazy timers with `packages/rules`; if Energy < cost, abort with `NOT_ENOUGH_ENERGY`;
   3. resolve the action with a fresh seed and `packages/rules` (pure);
   4. `characters.findOneAndUpdate({ _id, version }, { $set: timers, $inc: { xp, fxp, iron, version: 1 } })`
      — the **version guard** turns any interleaved write into a miss (`null`), which aborts and
      retries the transaction from step 1;
   5. `actionLogs.insertOne({ characterId, idempotencyKey, seed, result, ... })` — the **unique
      index** on `{ characterId, idempotencyKey }` makes a concurrent duplicate abort with E11000;
      the caller then falls back to step 1 and returns the winner's stored result;
   6. commit.
3. Return the stored result (identical for the first call and every retry).

The action log stores the **full result document** (the same JSON the modal renders) plus the seed,
so a retry returns exactly what the first call returned and any roll can be replayed offline.

## Consequences

- Double taps, network retries and duplicated requests all produce one log, one Energy spend and
  one modal.
- Every action needs a replica set (transactions). Local dev uses a single-node replica set
  (Docker) or `mongodb-memory-server`'s `MongoMemoryReplSet`.
- Bounded retries (3) on write conflicts; after that the client gets `CONFLICT` and may retry with
  the **same** key.
- The version guard is redundant with MongoDB's write-conflict detection inside transactions; it is
  kept because it is explicit, cheap, and still protects the document if a future code path skips
  the transaction.
