---
type: tech
title: Atomic Actions and Idempotency
aliases: [Idempotency, Atomic Actions, Idempotency Keys, Double Tap]
tags: [tech, server, pattern]
status: built
slice: "0; extended in 1 (request keys), 3 (political acts), 5 (cross-collection key check)"
gdd: ["§4.3"]
adrs: ["0002", "0006", "0008", "0018", "0087"]
updated: 2026-10-14
---

# Atomic Actions and Idempotency

## In one paragraph

A double tap must never spend Energy twice, and a result must be decided once, on the server.
So every game act carries a **key made once per tap** by the client, runs in **one MongoDB
transaction**, writes the character with a **version guard**, and stores its **full result** under
that key. A retry or a second copy of the same tap gets the stored result back, byte for byte, with
no new roll. Acts that are "once by rule" (one vote, one candidacy) are also guarded by a unique
natural key in the database.

## How it works

**On the client**: the tap handler calls `crypto.randomUUID()` once and puts it in the input
(`usePerformAction`, `usePoliticalAct`, `useBoard`, `useMissionStart`). Network retries re-send the
same input, so the same key. A second tap while one is in flight is ignored.

**Two helpers on the server**, same shape:

| Helper | File | For | Result stored in |
|---|---|---|---|
| `runKeyedAction()` + `storedResult()` | `apps/server/src/services/keyedAction.ts` | Game actions: tier-1 actions, training, missions, chapters | `actionLogs` (kept forever, it is history) — or `encounters` when a run-in is pending |
| `withRequestKey()` | `apps/server/src/services/requestKey.ts` | Other mutations: job, stat point, council acts, travel, residence, run-in choice, bail, treat, patrol answer… | `requestLogs` (7-day TTL), with `kind` and a hash of the input |

**The steps** (`runKeyedAction`, from [[adr/0002-atomic-idempotent-actions|ADR 0002]] and later fixes):

1. **Fast path.** Look up the key. Found → return the stored result (a key reused for a
   different input → `CONFLICT / KEY_REUSED`).
2. **Transaction** via `inTransaction()` (`txn.ts`: `readConcern: snapshot`, `writeConcern:
   majority`; the driver re-runs the callback on a transient error):
   1. `assertKeyFree()` (`keyGuard.ts`) checks the key in **all three** keyed collections
      (`actionLogs`, `encounters`, `requestLogs`) inside the snapshot. Taken → `KeyTaken`.
   2. Read the character. If its `day.settled` is not today → `DayChanged`.
   3. Project lazy timers and resolve with `packages/rules`, seeded by `keySeed(characterId, key)`
      (HMAC with a per-process salt, [[adr/0087-roll-seeds-derived-from-the-request-key|ADR 0087]]),
      so a re-run draws the same rolls and a client can't pick a key that rolls well.
   4. `Character.findOneAndUpdate({ _id, version, 'day.settled' }, { $set…, $inc: { …, version: 1 } })`.
      `null` → `VersionConflict`.
   5. Side writes (opinion, ledger, Issues), then insert the log row with the full result. The
      unique `{ characterId, idempotencyKey }` index makes a racing duplicate fail with E11000.
3. **On failure** (`mayHaveLostToSameKey`: `KeyTaken`, `VersionConflict`, `DayChanged`, a
   `GameError`, E11000) look up the winner's stored result first and return it if there is one.
   Otherwise: version miss → retry; day changed → `resettle()` then retry; refusal → TRPC error.
   At most `MAX_ATTEMPTS = 3`, then one last lookup, then `CONFLICT / ACTION_CONFLICT`.

`withRequestKey` does the same, inserting the `requestLogs` row at the end of the transaction, and
also retries on E11000 so a set-once duplicate shows the domain refusal instead of a 500.

**×3 is one request** ([[adr/0006-repeat-actions-one-request|ADR 0006]]): `times: 1 | 3` in one
key, one transaction, one seed stream; Energy for all three or none.

**Set-once political acts** ([[adr/0018-political-acts-set-once-with-request-keys|ADR 0018]]):
the natural key is the real "once" guard — unique `candidacies {electionId, characterId}`, unique
`votes {electionId, voterId}`, and conditional character updates (`pc ≥ cost`, not already given).
A new key after success meets that guard and gets a refusal carrying the settled state
(`ALREADY_VOTED`…). Each act writes the document its window's closing step writes, so a race with
the boundary becomes a write conflict and the loser sees the closed window.

**Mutations with no key** are idempotent by construction (a conditional update to a target state):
the day settlement, `paper.markRead`, `character.seeOrdersNote`, `council.whatNowSeen`,
`travel.close`, `encounter.close`, `held.close`, and `arrival.join` (keyed on the user). Cosmetic
values (`setAvatar`, `arrival.start`) are last-write-wins.

**Which rule from `CLAUDE.md`?** Engineering rule 2 allows "a conditional `findOneAndUpdate`, or a
transaction when several documents change". In the code every keyed act uses a transaction *and* a
conditional `findOneAndUpdate` inside it, because the key's log row is always a second document.

## Key files

- `apps/server/src/services/keyedAction.ts` — `runKeyedAction`, `storedResult`
- `apps/server/src/services/requestKey.ts` — `withRequestKey`
- `apps/server/src/services/keyGuard.ts` — `assertKeyFree`, `keySeed`
- `apps/server/src/services/txn.ts` — `inTransaction`, `VersionConflict`, `DayChanged`, `KeyTaken`, `MAX_ATTEMPTS`, `mayHaveLostToSameKey`
- `packages/db/src/models/actionLog.ts`, `requestLog.ts` (`REQUEST_KINDS`, TTL), `encounter.ts`
- Model use: `apps/server/src/services/actionService.ts` (`performAction` → `resolveAndWrite` → `writeTier1`)

## Rules to follow

- Every state-changing input takes `idempotencyKey: z.uuid()`.
- Never compute a refusal before checking for the winner's stored result.
- Every write to `characters` filters on `version` (and `day.settled` for actions) and bumps it.
- A new request kind goes in `REQUEST_KINDS`; a new keyed collection must be added to `assertKeyFree`.
- Use `keySeed`, never a fresh random seed, inside a keyed transaction.

## Decisions (ADRs)

- [[adr/0002-atomic-idempotent-actions|ADR 0002]] — one transaction, one key, one version guard (step 2.3 amended by ADR 0087, 14 Oct 2026).
- [[adr/0087-roll-seeds-derived-from-the-request-key|ADR 0087]] — the seed is derived from the request key (`keySeed`, HMAC-SHA256 with a salt drawn once per process), and every keyed transaction checks its key in `actionLogs`, `encounters` and `requestLogs` inside the snapshot (`assertKeyFree`). Built in the slice-5 fix round (QA M1); recorded 14 Oct 2026.
- [[adr/0006-repeat-actions-one-request|ADR 0006]] — ×3 in one request (amended 14 Oct 2026: stamp `batch`, success text when more than half succeed, training ×1 only).
- [[adr/0008-idempotency-for-non-action-mutations|ADR 0008]] — `requestLogs` for other mutations.
- [[adr/0018-political-acts-set-once-with-request-keys|ADR 0018]] — set-once on a natural key (amended 14 Oct 2026: kinds `council.declare`, `.endorse`, `.vote`, `.setRule`).

## Related

[[Server and API]] · [[Database and Models]] · [[Lazy Timers]] · [[Street Actions]] ·
[[City Council and the Rule Vote]] · [[The Result Modal]]
