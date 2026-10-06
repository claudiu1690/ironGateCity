# ADR 0073 — *The Last Train In*: the faction is an origin answer, and the favour is a welcome-only ticket

**Status:** proposed (review 4 fix round; amends ADR 0011 and ADR 0012) · **Date:** 2026-10-06

## Context

Review 4 replaces the deathbed quiz and the street of faction cards with three beats of one choice each (`docs/design/review-4-answers.md` §2, GDD §7):

1. *The platform*: whom you help is your party.
2. *The suitcase*: your stats (+6 and +1).
3. *The lining*: your Ambition, and his coat on your back.

The favour you did becomes your first action. It is slot B of the welcome set, at your party's HQ, and the first landing opens that pin with the favour highlighted.

Today the build works like this (ADR 0011):

- The `arrivals` draft collects six set-once answers, two per step.
- `arrival.join({ factionId })` is the street's choice. It resolves the answers against the chosen faction in one transaction with the character, its first City Day and the welcome edition.
- The origin DSL has `chaBase`, `iron` and `wish` effects.
- The welcome set's slot B is the rotation's committee session (ADR 0012).

None of these fits a party chosen in the first answer, or a first action that is offered once.

## Decision

1. **The faction is an answer.**
   - The origin DSL gains `{ kind: 'faction', factionId, person }` and loses `chaBase`, `iron` and `wish`. `stat` goes up to 6.
   - Content holds three steps of one question each. Beat 1's three answers each carry exactly one `faction` effect, the three are distinct, and each `person` is that faction's secretary (checked by the loader).
   - `resolveOrigin` reads the faction from the answers and returns it in the outcome.
   - `arrival.join` takes **no input**. The character's party is the one beat 1 recorded.
   - Everything else in ADR 0011 stands: the draft keyed by user, set-once answers in order, one transaction for the character, its day and the welcome edition, and the user as the natural key.
2. **No street phase.** The arrival's phases are `face → story → ready → arrived`.
   - `ready` means all three answers are in and no character exists.
   - The client calls `arrival.join` as soon as it reads `ready`: straight after the third answer, and again on any later visit. The join is idempotent on the user, so a lost response or a closed tab costs nothing.
3. **The favour is a ticket with `use: 'welcome'`.** It is a `CheckedAction` at the faction's HQ, matched by the welcome-B order template (also `use: 'welcome'`).
   - The server offers it only while today's orders hold an **open** item whose template is `use: 'welcome'` and matches it.
   - It is shown with `energy3: null`. A ×3 is refused with a new `ONCE_ONLY` reason (the twin of rival ground's `ONCE_ON_RIVAL_GROUND`).
   - Outside its order it is refused with `NOT_OFFERED`. The check runs **inside** the action's transaction, on the character read there, so two taps under two keys cannot both pay.
   - Its rates, Party XP share and *First day* bonus are the `council` type's. Nothing in rules special-cases it.
4. **The landing names the favour.** `welcomeLanding` returns slot B's place and its `actionId`. The welcome edition's `{place}` names the same place.

## Consequences

- Drafts begun under the old story have six answers with ids that no longer exist. Migration 008 resets their answers and keeps the face and name. A drafting player starts again at the platform.
- Existing characters keep their stored `origin.answers` and `stats.chaBase` as history. Nothing re-resolves them.
- The e2e helper that signs a player up (`apps/client/e2e/helpers.ts`) changes in the same commit as the server and client, because every spec goes through it.
- Slice 9's telemetry (`origin.step` per answer, `faction.joined` at the join) keeps its meaning. The funnel counts three origin steps instead of six.
- A one-off ticket is a general mechanism: a later welcome or tutorial act needs only content.
