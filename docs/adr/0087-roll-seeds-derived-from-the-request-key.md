# ADR 0087 — Roll seeds are derived from the request key by HMAC, and every keyed transaction checks its key inside the snapshot

**Status:** accepted, built in the slice 5 fix round (QA M1, `docs/qa/slice-5-report.md`); recorded 14 Oct 2026 (amends ADR 0002 step 2.3; ADR 0032's claim was corrected in the same round) · **Date:** 2026-10-14

## Context

ADR 0002 resolves an action "with a fresh seed" inside a transaction, and relies on the unique index on `{ characterId, idempotencyKey }` to stop a duplicate.

Slice 5 QA (M1) found two holes:

- After a write conflict (`TransientTransactionError`) the driver runs the transaction callback again on a fresh snapshot. The re-run drew a **new** seed, so it could take the other branch of a mission or a rival tap (a final result, or a pending run-in).
- The two branches write their key to different collections (`actionLogs` for a final result, `encounters` for a pending run-in, `requestLogs` for a request-keyed mutation). Each collection has its own unique index, and none sees across them, so a re-run on the other branch could charge twice.

## Decision

1. **The seed is derived, not drawn.** `keySeed(characterId, idempotencyKey, salt?)` in `apps/server/src/services/keyGuard.ts` is `HMAC-SHA256(SEED_SALT, "{characterId}:{key}:{salt}")`, cut to 32 hex characters. `SEED_SALT` is 32 random bytes drawn once per process.
   - A re-run of the same request's transaction draws the same rolls and takes the same branch.
   - The seed can't be predicted from outside the server, so a client can't pick a key that rolls well.
   - Every keyed act that rolls uses it: `action.perform` (rival run-ins included), `mission.start`, `held.act`, the ambition check and `travel.board`'s card.
2. **The key is checked inside the transaction.** `assertKeyFree(session, characterId, key)` looks the key up in `actionLogs`, `encounters` and `requestLogs` in the session's snapshot before any write, on every run of the callback. A hit throws `KeyTaken`, the transaction aborts, and the stored answer is returned (or `KEY_REUSED` when another act holds the key). Both wrappers call it: `runKeyedAction` and `withRequestKey`.
3. The seed is still **stored** with the result (ADR 0002), so a roll can be replayed offline from the log.

## Consequences

- The duplicate guard is the in-transaction lookup; the derived seed only keeps a re-run from changing branch on its own. Neither replaces the other.
- Because the salt is per process, the same key gives a different seed after a restart. That doesn't matter: a request that already committed returns its stored result, and one that didn't commit never showed a roll to anyone. Replays read the stored seed, never recompute it.
- Running several server processes is fine for the same reason: one request runs in one process.
- Any new keyed act that rolls must take its seed from `keySeed` and go through one of the two wrappers. A reviewer checks this.
