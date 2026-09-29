# ADR 0008 — Non-action mutations are idempotent through a short-lived `requestLogs` collection

**Status:** accepted (slice 1) · **Date:** 2026-09-29

## Context

ADR 0002 makes game actions idempotent with a unique `{ characterId, idempotencyKey }` index on
`actionLogs`, which also stores the result forever as history. Slice 1 adds mutations that change the
character but are not "something that happened in the city": taking or switching a job (2 Energy) and
placing a stat point. A double tap on "+1 INT" with two points waiting must place one point, not two;
a late network retry of "take job A" must not undo a later "take job B".

Putting these rows in `actionLogs` would weaken its schema (no action, no seed, no outcome) and mix
them into the action history and the Today tally.

## Decision

- A new collection **`requestLogs`**: `{ characterId, idempotencyKey, kind, inputHash, result,
  createdAt }`, unique index `{ characterId: 1, idempotencyKey: 1 }`, TTL index on `createdAt`
  (7 days).
- A server helper `withRequestKey(characterId, key, kind, input, fn)` does what ADR 0002 does for
  actions: fast-path lookup → transaction (`fn` writes the character with the version guard, then the
  helper inserts the log row) → on E11000 return the winner's stored result. A key reused with a
  different `kind` or input is refused with `CONFLICT / KEY_REUSED`.
- Every mutation input carries `idempotencyKey: z.uuid()`, created once per tap on the client.
- Tier-1 actions and job shifts stay in `actionLogs` (they are history and feed the Today tally).
- Pure state catch-up (the City Day settlement, ADR 0005) and "mark the paper read" need no key: they
  are idempotent by construction (a conditional update to a target state).

## Consequences

- One pattern for every mutation; the retry behaviour is the same as for actions.
- The TTL keeps the collection small; a retry older than 7 days would run again, which no client does.
