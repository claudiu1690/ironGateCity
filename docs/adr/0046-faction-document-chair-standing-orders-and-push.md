# ADR 0046 — The faction document: what a Chair sets, standing orders by family with a push, the party's target from members' own rows

**Status:** proposed (slice 7; amends ADR 0009) · **Date:** 2026-10-04

## Context

An elected Chair (design §4) sets several things for the whole faction:

- **standing orders**: three picks that apply from the next boundary and repeat until changed;
- **a push** of slot A or B to a battleground, with **the party's target** (25 / 50 / 100 matching attempts, faction-wide); when it is met, every member who did one gets +10 Party XP;
- **the party's rule** per council (the locals' default);
- **tomorrow's fixture** per branch;
- **the party line** on bills (stored on the bill, ADR 0045).

When there is no player Chair, the secretary's rotation and defaults apply.

ADR 0009 computed the secretary's orders from content and the day key, kept only progress on the character, and deferred a `directives` collection to the Chair.

Two facts complicate the design's "each pick resolves `{city}` to the member's residence":

- the home templates name home places (the Mill Gate);
- the capital has its own templates (slice 4).

A faction-wide counter for the target, `$inc`'d in every action, would put one hot document into every member's action transaction.

## Decision

1. **One `factions` document per faction** (`_id` the faction id) holds:
   - the Chair's projection;
   - `orders.current` and `orders.next` (each with `fromDay`);
   - `rules` (≤ 3 cities), `fixtures` (tomorrow's, ≤ 3);
   - `pushDays` (14 days of results), and the secretary's bill pointer.
   It is written by the Chair's acts, filtered on `chair.holder.characterId` with the Chair's term re-read, and by the nation's day. It is read by a member once a day (at their settlement), and by the desk and the Orders panel. **A change of Chair clears the orders, rules and fixtures.** The `directives` collection ADR 0009 deferred is not needed.
2. **Standing orders are by family.**
   - Rotation templates gain a `family` (content).
   - The Chair picks one family per slot. At the member's settlement, `startOrders` takes for each slot the residence's template of that family, else the residence's rotation.
   - `standingOn(orders, day)` returns `next` once `day ≥ next.fromDay`, so a set on day *d* applies from *d + 1* with no job.
   - The day's orders are still frozen on the character (ADR 0009). The crisis pair and the welcome set still win.
3. **The push** replaces the pushed slot with the faction's **push template** (`use: 'push'`, content, one for slot A and one for slot B):
   - resolved to the battleground for members at Level 10 or above (`push.counts: true`);
   - resolved to the member's residence below Level 10 (`counts: false`);
   - the item stores its place, and `orderMatches` resolves `'push'` from it.
4. **The party's target is counted from members' own rows.** An attempt that matches a counting pushed item upserts the member's own `contributions` row (`push|{faction}|{day}`) in the action's transaction. That document is written only by that member, so no new contention is added.
   - The live `TargetBar` is a `$group` over the scope.
   - The nation's day stores the day's count and whether it was met on `pushDays`.
   - The member's own settlement pays the +10 Party XP (the world never writes a character, ADR 0020).
5. **The party's rule** for a city falls back to `faction.branchMotion`. It is written into the next order paper at its count (never mid-paper: councillors may already have voted). **The fixture** for (city, tomorrow) wins over slice 6's rotation when the city day posts it.

## Consequences

- A Chair who opens the game once a week shapes every member's morning; an absent Chair costs the faction nothing (the defaults hold).
- The read path adds one read per member per day, not per request.
- The target's count is exact and contention-free, at the price of an aggregate on read (tens of rows in the MVP). If a faction grows large, the bar reads the stored count of the last minute.
- Families are a content task: until the designer assigns them, each template is its own family, and capital and Clearwater residents keep their rotation for the Chair's slots (a graceful default).
