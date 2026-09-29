# ADR 0011 — The origin lives in an `arrivals` draft; the character is created, settled and printed at faction confirm

**Status:** accepted (slice 2) · **Date:** 2026-09-29

## Context

Slice 2 puts a three-step origin story (six answers, GDD §7.2) and the faction choice (§7.3) between sign-up and
play. Stats, faction, home city, kit, Iron, the FXP seed and the Ambition are all unknown until the last tap, yet the
story must be **resumable at every tap** (§13.1 tier 3) and every answer idempotent.

Until now every character-scoped procedure get-or-creates a `characters` document from `content.startingCharacter`
(slice 0), and every service assumes a character has a faction, a home city, stats and a settled City Day.

Options:

- **A `characters` document in `status: 'origin'`** with null faction, home and stats. One collection, but every
  field slice 0–1 relies on becomes nullable, and every service, view, index and test must learn a second shape. A
  forgotten guard would settle a City Day, print a paper or roll a check for a character with no faction.
- **Answers on the Better Auth `user`.** Couples game state to the auth library's schema and its sign-up hooks.
- **A small draft document per user**, turned into a character in one transaction when the faction is confirmed.

## Decision

1. **`arrivals` collection**, one document per user (unique `userId`): `name`, `avatarId`, `answers[]` (in order,
   `{ questionId, answerId, at }`, at most six), `completedAt`, `characterId`, `factionId`. Nothing else. No TTL: a
   player may come back weeks later and finds the same question waiting (pillar 7).
2. **No auto-create any more.** `loadCharacter` finds the character by `userId`; if there is none it refuses with
   `PRECONDITION_FAILED ARRIVAL_PENDING` and the client routes to `/arrive`. `content.startingCharacter` is removed.
3. **Answers are set-once and ordered, by natural key.** `arrival.answer` is one conditional update:
   `findOneAndUpdate({ userId, completedAt: null, answers: { $size: i } }, { $push: { answers } })` where `i` is the
   question's index. A retry or double tap of an answered question returns the current view (no error, no second
   write); a different answer to an answered question also returns the current view (the first tap wins). No
   idempotency key: the question index is the key (as ADR 0008 allows for conditional updates to a target state).
4. **`arrival.join` creates the character in one transaction** and makes the first City Day in the same one:
   read the arrival in the session → check six answers and a face → `resolveOrigin` and `buildNewCharacter` in
   `packages/rules` (pure) → insert the character with `day.settled: today`, the welcome set of orders (ADR 0012) and
   the kit (ADR 0014) → insert the welcome edition in `paperEntries` → mark the arrival complete with a guard on
   `completedAt: null`. The natural key is the user: the unique `characters.userId` index and the
   `completedAt: null` guard make a concurrent second join fail with E11000 or a miss; the caller then returns the
   winner's character. A join naming a different faction after the first succeeded is refused with
   `CONFLICT ALREADY_ARRIVED` (the choice is permanent, §7.3).
5. The permanent record of the origin moves onto the character as `origin { answers, arrivedAt }`, because later
   chapters read it (the promised coat). The arrival document stays as a completed record.

## Consequences

- `characters` keeps its invariant: every document has a faction, a home city, stats and a settled day. Slice-1
  services only gain the `ARRIVAL_PENDING` refusal at the one entry point.
- The HUD has nothing to show during the origin, by design: the story screens are full-screen with the face and name
  only (the Story mockup), and nothing in them spends Energy.
- Slice-1 server tests no longer get a character for free; a test helper builds the reference recruit with the
  same rules function the join uses (`docs/tech/slice-2.md` §14).
- The settlement code is split so the join can compute the first settlement for a document that is not stored yet
  (`computeSettlement`), and `ensureSettled` keeps using it for every later day.
