# ADR 0078 — The cells' costs: the day's orders off on the orders state, an arrest always marks, the cells list by a partial index

**Status:** accepted, built in the review 4 fix round (7 Oct 2026; amends ADR 0033 and the slice-5 design defaults §23.1 #3) · **Date:** 2026-10-06

## Context

Review 4 (`docs/design/review-4-answers.md` §19–§20; GDD §19.2, §11.2, §13.7) gives the cells three costs and takes no asset:

1. a longer sentence: **20 + Heat ÷ 2 minutes**, at most 60, ×1.5 on rival ground;
2. **the day's Party orders are off** from the arrest to the day's turn. Orders already done stay done and paid; the +5 Political Capital for all three is unreachable unless already paid;
3. **an arrest is always at least one mark**: the type's marks, or one minor mark when the work carried none.

It also adds a public ***In the cells now*** card on every police station's sheet, listing every party's prisoners with *out in n min*.

ADR 0033 stores the held state as `held` on the character plus a `stays` collection, and releases on read. Arrests happen in four places, all inside keyed transactions:

- a mission with no run-in;
- a run-in resolved by choice;
- a run-in resolved by luck;
- a rival-ground tier-1 run-in.

The dev panel's *Send to the cells* hook adds a fifth path.

## Decision

1. **The sentence** is a constant change: `CELLS.baseMinutes` 10 → 20. `sentenceMinutes` is unchanged.
2. **Orders off is a field of the day's orders state:** `orders.off: { at, reason: 'cells' } | null`.
   - It lives inside the object the settlement replaces each City Day, so it **ends at the day's turn with no job and no cleanup**.
   - `advanceOrders` and `findAdvancingItem` advance nothing while it is set. Every progress path goes through them: actions, missions, jobs, chapters and order tags.
   - `closeOrders(o, at)` sets it. `finishMission` and the rival tap's finish call it whenever the result sends the character to the cells.
   - The arresting act's own progress is not counted, because the orders are off from the arrest. This is the default; see the questions.
3. **An arrest always marks.**
   - `marksFor` adds one `minor` mark when `arrested` and the type carries none.
   - Every arrest is now recorded in `arrests[]`, so the seven-day escalation applies to every arrest. Slice 5's "an arrest with no marks never escalates" is moot.
4. **One write path.** Every arrest goes through the rules' result. The server writes `held`, the stay, the marks and `orders.off` in the transaction that already writes the arrest. The test hook writes the same fields.
5. **The cells list is a read over `characters`.**
   - `held.inCells({ locationId })` reads characters with `held.state: 'in'`, `held.kind: 'cells'`, the location, and `held.until > now`.
   - A row whose `until` has passed but has not yet been released (release is lazy) is simply not shown.
   - A new partial index serves it: `{ 'held.locationId': 1, 'held.until': 1 }` where `held.state: 'in'` and `held.kind: 'cells'`.
   - Only public fields leave the server: the name, the avatar, the party, `until` and *you*. Heat, the record and bail stay private.

## Consequences

- No migration of live state is needed. Characters already in the cells keep their stored `until`. Today's orders of a character arrested before the deploy stay open. Past arrests get no retroactive mark. The index is declared on the character schema, and `syncIndexes` creates it at start-up.
- Bail rises for arrests that used to carry no mark (+50 for the new minor mark, before any multiplier). `docs/economy.md` §24.3 counts it, and the economy test's cells figures change with this ADR.
- Slice 6 adds *Post bail* on the list's own-party rows and the Members status line. Both read the same index.
- A Party XP or Reputation penalty was rejected (GDD §4.3: it would take an asset). The orders' closure is the branch's disapproval, paid in opportunity.
