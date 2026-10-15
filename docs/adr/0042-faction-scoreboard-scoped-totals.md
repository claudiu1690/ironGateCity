# ADR 0042 — The faction scoreboard: faction-scoped contribution totals written with every opinion row, events counted at resolution

**Status:** accepted (slice 6, built 15 Oct 2026) · **Date:** 2026-10-03

## Context

The Faction tab's Scoreboard (`docs/design/slice-6-together.md` §6.4, screens §2.4, GDD §14.5) ranks a faction's members:

- by **this week** (Monday to Monday, the Issues' week) and **all time**;
- for **all cities** or one city;
- by Level bracket, with columns **Moved** (the member's opinion won, summed over cities), **Events** (joined in the period) and heroes.

The Members list shows each member's *+n this week*.

ADR 0028 keeps contributions as running totals per character per place-cycle (`influence|{place}:{cycle}`), upserted in the transaction that writes the ledger row. It rules out folding the ledger on a read path. Place-cycles do not align with weeks, and an all-time fold over every row grows without bound.

## Decision

1. **Faction-scoped contribution documents**, `kind: 'faction'`, in the existing `contributions` collection. There are four scopes per row, `faction|{factionId}|{period}|{city}`:
   - `period` is `w{weekDay}` (the week's Monday) or `all`;
   - `city` is the row's city or `all`.

   Each document carries `amount` (thousandths, the actor's leg as applied, positive only), `events`, the name, the Level at the last contribution and its `bracket`, and `lastAt` (the tie-break).
2. **Written in `addInfluence`**, the one helper every opinion path already calls in its transaction: tier-1 actions, missions, journey cards and Campaign Events. A new path gets the scoreboard for free. The event resolution also increments `events` on the four scopes for each member participant (ADR 0037).
3. **Read by index:** `{ scope, bracket, amount: -1, lastAt: 1 }` gives each bracket's top ten. The viewer's own row is read by `_id`, with its rank as a count. Heroes in the period come from `awards`.
4. **Migration 008 backfills** all-time totals from the existing influence contributions and this week's from the week's ledger rows. A test checks the week against a ledger fold.

## Consequences

- Four more upserts per opinion-moving row. Each is on the actor's own documents, so they add no contention; the slice-6 integration suite measures their cost. The fallback, if it shows, is two scopes (`all` per period) with the city filter read from them.
- Week documents accumulate, one per active member per week. They are small, and slice 8's season rollover can prune them.
- The scoreboard, the members' weekly figure and the playtest report read the same totals as the heroes, with no ledger fold on any read path.
