# ADR 0036 — Campaign events: the roster embedded in the event, sign-ups in their own collection, limits by natural keys, a secret seed

**Status:** accepted (slice 6, built 15 Oct 2026) · **Date:** 2026-10-03

## Context

Slice 6 brings Campaign Events (`docs/design/slice-6-together.md` §2–§4, GDD §16.3). An event is called by a Rank 3 member at a fixed venue, 1–12 hours ahead, with 3–5 named roles and up to four hands. Signing up spends the role's Energy at the tap and is the commitment; withdrawal is allowed until an hour before the start. Several members sign up concurrently from the board, the venue and the paper. The limits are:

- per faction per city (per district in the capital): one upcoming member-called event, two member-called starts a City Day, plus the secretary's daily fixture;
- per member: three open sign-ups.

At the start the server rolls every member-held role. The design suggests seeding the rolls by the event id, a `campaignEvents` collection with roles embedded (the plan's data-model row), and per-city per-day counters on the city document.

Four forces:

1. The board shows each event with its roster on every row, so the roster is read with the event.
2. Sign-ups are history: withdrawals, the per-participant result, the scoreboard's *Events* column, the paper's facts, *first event of the day* and the playtest report all read them per member.
3. A sign-up must never be left out of a resolution that has already read the roster, and two members must never hold one role.
4. The event id is in the client's route (`/faction/events/{id}`) and the rules package is in the client bundle.

## Decision

1. **`campaignEvents`, roster embedded.** `roles[] { roleId, holder | null }` in content order and `hands[]` (at most four), each holder a small snapshot (character, sign-up id, name, avatar, Rank, Level). The roster is bounded at nine and read on every board row.
2. **`eventSignups`, one document per tap.** It holds the commitment (Energy, Rested covered, whether the tap advanced the event order), the tap's idempotency key and stored result (ADR 0002's fast path: unique `{ characterId, idempotencyKey }`), the status (`committed → withdrawn | resolved`), the per-participant result written at resolution, and the receipt written at credit (ADR 0037).
3. **Signing up is one transaction** over the character (Energy and Rested lazily, the version guard, `'day.settled': today`, `events.open` below three), the event and the sign-up. The event's slot is one conditional update: `status: 'open'`, `startsAt > now`, the member not already on the roster, and the slot empty (`roles.{i}.holder: null`) or a hand free (`hands.3` absent). Because the sign-up **writes the event document**, it write-conflicts with a resolution that also writes it. One of them retries, so a committed sign-up is either in the resolved roster or refused `EVENT_STARTED`.
4. **The per-member limit** is `events.open[]` on the character (at most three pointers `{ signupId, eventId, cityId, startsAt, slot, energy }`), checked under the version guard. It is also the read path's pointer to due sign-ups (ADR 0037).
5. **Per-place limits are unique natural keys, not counters.**
   - `{ factionId, placeId, day, dayIndex }` unique, where `dayIndex` is 0 for the fixture and 1 or 2 for the day's member starts. `day` is the City Day the start counts against: `dayKey(startsAt)` for a member's event, the posting day for the fixture.
   - `{ factionId, placeId }` unique, partial on `{ status: 'open', kind: 'member' }`: one upcoming member-called event.

   The call resolves the place's due event first (lazily), so the partial index reflects the truth. Concurrent calls get E11000 and retry or refuse (`ONE_AT_A_TIME`, `BRANCH_HANDS_FULL`). Nothing is written to the city document.
6. **A secret seed.** Each event stores 16 random bytes as hex, never sent in a view before resolution. Each role rolls from a named stream (`seed + ':role:' + roleId`), so filling another role or adding a hand never moves a role's roll. The job and every lazy path read the same stored seed, so they agree.
7. **The call is the caller's first sign-up.** The caller's withdrawal leaves the event standing (it is the branch's). The character keeps an `events.calls[]` pointer from that withdrawal, so the *called off* modal can reach the caller if nobody joins.

## Consequences

- Double taps, races for a role and late sign-ups are all decided by one conditional write per tap. The idempotency record and the history are the same document.
- Limits are exact under races without a counter to keep in step, and calls never contend with actions on the city's opinion document.
- A role's outcome cannot be computed in advance from public data.
- The roster is denormalised (the holder's name and Rank at sign-up). The board shows the name a member signed up with; names cannot change in the MVP.
- The plan's slice-6 row gains `eventSignups`.
