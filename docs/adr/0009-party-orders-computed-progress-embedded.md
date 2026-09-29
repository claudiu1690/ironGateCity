# ADR 0009 — Secretary's Party orders are computed from content and the day; only progress is stored, on the character

**Status:** accepted (slice 1) · **Date:** 2026-09-29

## Context

The plan's data-model table (§5) lists a `directives` collection for slice 1. The slice-1 design
(GDD §13.7, `docs/design/slice-1-content.md` §6) then pinned how the NPC party secretary chooses
orders: **faction-wide**, deterministic from the day number — slot A `A[day mod 5]`, slot B
`B[day mod 4]`, slot C `C[day mod 3]`, with day counted from 2026-01-01. Every member of a faction gets
the same three orders on the same day. What differs per player is only the progress, and one
per-player variant (the slot-C shift order reads "Take a job" for a player with no job).

A `directives` document per character per day would store three copies of content that can be
recomputed, add a second document to every action transaction, and grow daily for no reader: no rule
looks at a past day's orders except "all three done yesterday" for the paper, which settlement sees
before it resets the day.

## Decision

- The day's orders are a pure function `ordersForDay(templates, factionId, day)` in `packages/rules`.
- Per-player state is embedded in `characters.orders`:
  `{ day, items: [{ templateId, variant: 'main' | 'noJob', target, progress, doneAt }], allDoneAt }`.
  Settlement resets it for the new day and freezes the variant and target (so a mid-day content
  deploy or taking a job doesn't change an order under the player).
- Progress, the +25 % FXP, the +20 FXP per order and the +5 PC for all three are written in the same
  version-guarded character update as the action that earned them. Taking a job advances a `noJob`
  order in the `job.take` transaction.
- The **`directives` collection is deferred** to the Faction Chair (slice 7): it will hold what a
  Chair *sets* for the faction on a day (one document per faction per day), which the rotation then
  no longer supplies. Personal progress stays embedded.

## Consequences

- No extra document per action and no extra collection in slice 1; the orders appear on every screen
  from the one character read.
- Yesterday's orders are not kept as history beyond the paper's "all three done yesterday" headline
  and the tally's "orders done". If a later feature needs order history, it reads `actionLogs`.
- The plan's §5 row for slice 1 changes: `orders {day, items[]}` embedded instead of a `directives`
  collection (recorded in `docs/tech/slice-1.md` §5).
