# ADR 0018 — Political acts: set-once on a natural key, replayed through a request key, and serialised with the boundary that closes their window

**Status:** accepted (slice 3; applies ADR 0002 and ADR 0008) · **Date:** 2026-09-29

## Context

Slice 3 adds six player acts: **declare** (10 PC), **withdraw**, **endorse** (10 PC), **vote**, **propose** (20 PC) and the **council vote**. None of them rolls dice. Each is "at most once" by rule:

- one candidacy per member per cycle;
- one endorsement per member per cycle in each city;
- one ballot per election;
- one proposal per councillor per term;
- one council vote per councillor per term.

Each also produces a result modal with knock-on lines (*−10 PC · 35 left*, *Coalport morale +0.5 → 84.5 %*) that a retry must return unchanged.

The design (§15 Q4) suggests conditional updates keyed by the natural key, with no idempotency key. ADR 0008 asks for a key on every non-action mutation, and so does the plan's rule ("an idempotency key per request").

A third problem is new. Every act is only valid inside a window that a boundary closes (ADR 0017). A declare that commits a millisecond after the nominations close must not slip onto a ballot that was frozen without it.

## Decision

1. **The natural key is the exactly-once guard**, enforced by the database:

   | Act | Guard |
   |---|---|
   | Declare | unique `candidacies {electionId, characterId}` |
   | Endorse | the endorser's character update, filtered on `endorsementsGiven.electionId: { $ne }`, `pc ≥ 10` and the version |
   | Vote | unique `votes {electionId, voterId}` |
   | Propose | a conditional `$push` on the order paper (`items.movedBy.characterId: { $ne }`, `items.ordinanceId: { $ne }`, at most 4 items) |
   | Council vote | a conditional `$push` (`votes.characterId: { $ne }`) |
   | Withdraw | `status: 'filed' → 'withdrawn'` |

   Every spend of PC is in the same transaction as its guard, with `pc: { $gte: cost }` and the version in the character filter.
2. **The request key replays the answer (ADR 0008).** Every act takes `idempotencyKey: z.uuid()` and runs through `withRequestKey`, with new `RequestKind`s `council.declare | council.withdraw | council.endorse | council.vote | council.propose | council.councilVote`.
   - A retry with the same key returns the stored modal byte for byte.
   - A new key after success meets the natural guard and gets a domain refusal that carries the existing state (`ALREADY_VOTED { name }`, `ALREADY_ENDORSED { candidacyId }`), which the client renders as the settled screen.
   - `withRequestKey` retries once on E11000 when no stored result exists, so a concurrent duplicate surfaces as the domain refusal, not a 500.
3. **Every window-bound act writes the document its closing step writes:**

   | Act | Writes | Closed by |
   |---|---|---|
   | Declare | `$inc elections.filed` | the close (sets `status: 'polling'`) |
   | Endorse, withdraw, the branch's endorsement | the candidacy | the close (writes every candidacy) |
   | Vote | `$inc elections.ballots`, filtered on `status: 'polling'` | the count (sets `counted`) |
   | Propose, council vote | the order paper, filtered on `status: 'open'` | the division (sets `divided`) |

   MongoDB's snapshot isolation turns a race into a write conflict. The loser retries, and the retry sees the new status or the new day and refuses. **A stored act is always in its window's result.**
4. No act writes on the client's word: the city is the character's home, the phase comes from `dayKey(ctx.now())`, and seats come from `officeTerms` read in the transaction (ADR 0020).

## Consequences

- A double tap, a network retry or two devices can never spend PC twice, vote twice or hold two candidacies. Every copy of one tap gets one modal.
- `requestLogs` keeps its 7-day TTL. The domain collections are the history, and the playtest report reads those, never `requestLogs` (QA slice 2 m2).
- The election document takes one small write per ballot during the polls. That is few writes: one per member per cycle.
- An act racing the boundary can fail with `NOT_POLLING` or `NOT_NOMINATIONS` a moment after the player saw the window open. The client shows the refusal's line and the next window. This is the only way a political tap "does nothing", and it is visible.
