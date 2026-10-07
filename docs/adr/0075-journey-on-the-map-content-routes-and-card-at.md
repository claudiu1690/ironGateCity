# ADR 0075 — The journey on the nation map: routes as content, the card's moment drawn at boarding

**Status:** proposed (review 4 fix round; amends ADR 0025) · **Date:** 2026-10-06

## Context

Review 4 (`docs/design/review-4-answers.md` §7, GDD §14.10) moves the journey onto the nation map.

- The painted railway between the two cities is traced, and the player's **pin** (a plain moving pin, not a train; user, 7 Oct 2026) sits on it **at the point the clock says**.
- The journey's card (when one was drawn) **fires at a point drawn at boarding**, 0.20–0.80 of the way, and is answerable from then until the arrival's settlement.
- Timing stays lazy and server-authoritative. Nothing is scheduled.

ADR 0025 holds:

- The card and its seed live on the `journeys` document.
- `travel.choose` is allowed until `status = 'closed'`.
- The client only displays.

There is no geometry for the rails anywhere: the nation map has pins only.

## Decision

1. **Routes are content.**
   - `nation.routes[]` holds one polyline per leg *from the capital*, `{ to, points[] }`, with 8–20 points in fractions of the nation picture.
   - The loader checks four legs, one for each other nation city. The first point equals the capital's nation pin and the last equals the city's pin.
   - Points are traced in the dev map viewer's new trace mode.
2. **Geometry is pure and lives in rules** (`travel.ts`):
   - `journeyLegs(routes, from, to, capitalId, minutesOf)` reverses a leg into the capital, and joins two legs through it for an outer-to-outer journey.
   - `trainAt(legs, progress)` splits the time by each leg's minutes (as the fare's times are added), then places the train by length within its leg.
   - The client calls `trainAt` once a second with `journeyProgress(boardedAt, arrivesAt, now)` on the server clock. The server never computes a position.
3. **`cardAt` is drawn at boarding.**
   - When a card is drawn, `card.at` is drawn with it from `createRng(seed + ':cardAt')`, uniform in [0.20, 0.80] of the journey, rounded to the second, and stored on the journey's `card`.
   - The card's own draw (`seed`) and roll (`seed + ':card'`) are unchanged, so a re-run under the same request key (ADR 0032's guard) draws the same moment.
4. **The server keeps the card's content until its moment.**
   - `travel.journey` returns `cardAt` whenever there is a card, but `card` itself only once `now ≥ cardAt`.
   - `travel.choose` refuses before `cardAt` with `CARD_NOT_YET { at }`, inside the transaction, on the server clock, and writes nothing.
   - The window closes as ADR 0025 says: at the arrival modal's close, a new boarding, or the first act in the destination.
5. **A journey without `card.at`** (boarded before this change) reads as `at = boardedAt`. Migration 008 also writes it, for tidiness.
6. **No job and no pointer change.** The client sets one timer for `cardAt`, as it already does for `arrivesAt`, and asks again. The character's `journey` pointer is unchanged, because only the journey screen needs the moment.

## Consequences

- A curious player can see in the network response that a card is coming, and when, but not what it is. The design wants the surprise on screen; hiding even the moment would need polling. Accepted, and listed as a question.
- The deportation journey has no card and no route change. It is drawn on the same legs.
- Clearwater's leg is traced now, although its service opens in slice 7.
- Slower or faster trains (first class, a law on fares) change only `minutes`. The position follows.
