# ADR 0081 — The patrol stop: a seeded roll per ten-minute bucket on the city read, embedded state, a pending card that holds the street

**Status:** proposed (review 5 fix round) · **Date:** 2026-10-08

## Context

The user decided (review 5 #12, made random; `docs/design/review-5-answers.md` §16.1; GDD §14.12) that **a player who is only looking at a rival town at night may be stopped by a patrol**:

- **When a roll happens:** on a **read of the city view**, at night, on rival ground, not held and not in transit.
- **How often:** **one roll per ten-minute bucket per city**, at **12 %**:
  - +5 at *Noticed* and +10 at *Hot* or *Wanted*;
  - +10 if *Watched* and −10 if *Warned*;
  - ×2 under the Curfew;
  - kept between 5 and 40.
- **Limits:**
  - **at most two stops a night per city**;
  - no stop within 10 minutes of arriving by train;
  - no stop within 15 minutes of the last stop or of a run-in.
- **What never rolls:** an act, a timer, or a closed app. A refresh must never re-roll.

The stop is a card in the hostile deck's shape (difficulty 14, never failing, no Energy).

Two constraints come from how the city view is read. It is a query that React Query refetches on focus, after mutations, and every 10 s while stale. So a write on a read must be rare, atomic and idempotent, and two concurrent reads in a new bucket must not both stop the player.

## Decision

1. **The state is embedded on the character**, because it is read with the character on every city read:

   ```
   patrol: {
     nights: Array<{ cityId, night, bucket, stops }>,   // pruned to the current night
     quietUntil: Date | null,
     card: { id, cityId, night, bucket, at, seed } | null,
   }
   ```

2. **A pure decision** (`packages/rules/src/patrol.ts`), `patrolDecision`, skips without a write when any of these holds:
   - it is day;
   - the city is not rival ground;
   - the player is held, in transit, or has a pending run-in or a pending card;
   - the bucket has already been rolled for this city and night;
   - it is inside `quietUntil`;
   - the night's two stops are spent.

   Otherwise it rolls. **The roll is seeded** from `characterId:cityId:bucket`. A second evaluation of the same bucket gives the same number, so a refresh cannot re-roll even before the write lands.
3. **One conditional write per bucket.** `city.get` (and only `city.get`, for the city the player stands in) calls `ensurePatrol` after `loadCharacter`:
   - it writes `findOneAndUpdate({ _id, version }, { $set: { patrol }, $inc: { version: 1 } })`, which records the bucket and, on a stop, creates the card, counts the stop and sets `quietUntil` to 15 minutes on;
   - if the version moved, it reloads and decides again once; if it moved again, it returns without a roll, and the next read in the bucket rolls;
   - reads inside a rolled bucket, inside quiet, or past the cap do not write at all;
   - at most one write is made per ten minutes per player present on rival ground at night.
4. **The quiet is written where the trouble happens:**
   - the arrival settlement sets `$max: { 'patrol.quietUntil': arrivesAt + 10 min }`;
   - `startRunInInTx` sets `$max: … at + 15 min`;
   - the stop sets it to `at + 15 min`.
5. **A pending card holds the street.**
   - `notFree` returns `PATROL_PENDING`, so Energy acts, missions, chapters, boarding, residence acts and treatment wait one tap. Votes, the paper and reads do not.
   - The card **never resolves itself**. A player who closes the app finds it on return, as with the journey card (being away costs nothing).
   - `patrol.answer({ choiceId, idempotencyKey })` resolves it through `withRequestKey` and the journey card's rules (`resolveJourneyChoice` at 14, the *Cool and Clean* gate for *Show your papers*).
   - The answer writes Heat and the *Watched* flag in the card's city and clears the card, in one transaction with the request log.
6. **The card is content:** a `JourneyEvent` with `deck: 'patrol'`. It is never drawn on a train. Its rows and its *Let it pass* row work like the hostile deck's.
7. **Test hooks** (memory mode only):
   - `E2E_PATROL=never|auto` (Playwright: `never`; `dev:mem`: `auto`);
   - `POST /api/test/patrol { mode: 'next' | 'never' | 'auto' }`, where `next` forces the next eligible read's roll to hit and is consumed once.

## Consequences

- No job, no timer, nothing while absent.
- A player who closes the app on rival ground at dusk and reopens at midnight gets one roll, not a stop.
- A scripted client that never reads the city view never meets a patrol. Its acts still carry the night run-in (ADR 0080), and the stop is a presence feature, not a toll. Accepted.
- The version bump makes an action that is in flight at the same moment retry once. This happens at most every ten minutes for a player on rival ground at night.
- The card's Heat (+10) is not doubled by rival ground. The card's figures are final, as the checkpoint's are (a default; see the review-5 tech design's questions).
- Rejected: a separate `patrols` collection. The state is tiny, read with the character, and history is not needed. The answer's request log keeps the result.
- Rejected: rolling in `loadCharacter`. Every read (the paper, the Me tab) would roll, which is not "looking at the town".
