# ADR 0025 — Journeys: their own collection, a pointer on the character, lazy arrival plus a tidy job

**Status:** accepted, built in slice 4 · **Date:** 2026-10-03

## Context

From Level 10 a player boards a train (GDD §14.10, `docs/design/slice-4-battleground.md` §2–3). The train leaves at the tap and takes 12–25 real minutes. The player may close the game and still arrives. About one journey in three (the first always) carries a card with one optional choice, answerable during the journey and on the arrival modal; after the modal closes it was slept through. In transit the player cannot act in any city, but can read the paper and do every political act of their residence.

Two documents disagree on how arrival happens: the design (§2.4) says arrival is lazy and needs no job; the plan (§2 rule 2) names "a journey arriving" as one of the real events that are scheduled jobs. The character already has `cityId` (where it stands), required, read by every action, the city view and the index route.

## Decision

1. **A `journeys` collection**, one document per trip, with the fare, the seed, the card, the choice and its stored result, and the status `onTheWay → arrived → closed`. Natural key `{ characterId, n }` (unique), where `n` is the character's `journeysMade + 1`, so two boardings cannot both succeed.
2. **A pointer on the character**, `journey { id, from, to, boardedAt, arrivesAt, status }`, so a session still reads one document. It stays until the arrival modal is closed. `cityId` keeps its meaning (the city you stand in) and stays the city left until arrival: being on a train is `journey.status = 'onTheWay'`. No nullable `cityId`.
3. **Boarding** is one transaction: the fare (`iron ≥ fare`), the version guard, `journey` null or arrived (an arrived-but-unclosed journey is closed in the same transaction), `journeysMade + 1`, the card drawn from the journey's seed, the journey inserted. An ADR 0008 request key replays the result.
4. **Arrival is lazy, and lazy is the guarantee.** `settleArrival(journeyId, now)` runs two conditional updates (the journey `onTheWay → arrived`, the character's `cityId = to` with `journey.status = 'arrived'`) once `arrivesAt ≤ now` on the server clock. `loadCharacter` calls it for a due journey, after the day is settled.
5. **A tidy job anyway.** After the boarding commits, the API schedules `journey-arrive` for `arrivesAt` through a non-processing Agenda client on the same backend (unique by journey id where Agenda supports it). The worker's handler is the same `settleArrival`. It is best effort: a failure to schedule goes to Sentry and changes nothing. It exists so the database says where absent players are (the playtest report, slice 6's presence), honouring the plan's rule without making correctness depend on the worker.
6. **The card** is resolved by `travel.choose`: one choice per journey (`choice: null` guard, plus a request key), rolled from `createRng(seed + ':card')`, applied in one transaction (the character, the destination's opinion with a ledger row, points on the destination's first Issue), the result stored on the journey. Choosing is allowed until `status = 'closed'`; closing the arrival modal (`travel.close`) ends the window and marks an unanswered card slept through.

## Consequences

- Reads of position stay cheap and correct whether or not the worker runs; a journey whose `arrivesAt` has passed is treated as arrived by every reader that settles first, and the report reads `journeys` directly.
- The API gains a small dependency on the Agenda client (already a server dependency). Tests inject a recording scheduler and never rely on Agenda.
- No cancellation: the train leaves at the tap (GDD §14.10, slice 4). Adding first class, the car or the night train later is a field on the journey and a different time; the state machine does not change.
- Fellow travellers are a count over `{ to, boardedAt }`; carriage chat (slice 6) can key on the same leg window.
