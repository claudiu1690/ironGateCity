# ADR 0012 — The welcome set: a character's first City Day uses fixed Party orders, frozen at creation

**Status:** accepted (slice 2; amends ADR 0009); amended 2026-10-14, see review 1 and ADR 0073 · **Date:** 2026-09-29

## Amendment (14 Oct 2026)

The mechanism stands (welcome ids on the faction, `startOrders` with an optional welcome set, no new storage). The contents of the slots and the length of the welcome day changed (GDD §13.7):

- **Slot A** is two attempts at a political action **chosen by the player's best trained stat** (per city and stat), not the first pin's canvass (review 1, `docs/design/review-1-answers.md` §2). `Faction.welcomeOrders` is keyed by stat in `packages/content/src/data/factions.ts`.
- **Slot B** is **the favour from the platform** at the HQ, a welcome-only ticket (`use: 'welcome'`), not a committee session (review 4, **ADR 0073**). The first landing opens slot B's pin.
- **The welcome day** is the City Day of creation, **and the next one too when the character is created after 22:00 UTC** (review 1; closes Appendix C #18). The "23:50 UTC keeps the welcome set for ten minutes" consequence no longer holds.

## Context

ADR 0009 made Party orders a pure function of the faction and the day number: every member gets the same three
orders on the same City Day, and only per-player progress is stored (`characters.orders`). GDD §13.7 (slice-2
design) adds a **welcome set**: on a character's first City Day, however short, the orders are fixed instead of
rotated: slot A two attempts at the first pin's canvass, slot B one committee session at the HQ, slot C *Take a
job*. From the next day the rotation applies. This is per character, not per faction (Appendix C #18).

## Decision

- Content names the welcome set per faction: `Faction.welcomeOrders: [A, B, C]`, three existing template ids of
  that faction in slots A, B and C; slot C's template must have a `noJob` variant. No new templates.
- `startOrders(templates, day, hasJob, welcome?)` in `packages/rules` takes the welcome ids as an optional argument;
  with them it builds the three items from those templates instead of `ordersForDay`. Variants and targets are frozen
  exactly as for the rotation, so *Take a job* is frozen as the `noJob` variant (a new character never has a job).
- **"First City Day" is the settlement that prints the first edition** (`Settlement.firstEdition`, i.e.
  `day.settled` was null). The join transaction settles the character's first day at creation (ADR 0011), so the
  welcome set belongs to the City Day of creation. No `createdDay` field is stored.
- Everything else in ADR 0009 is unchanged: progress, the +25 % FXP, +20 FXP per order and +5 PC are written in the
  action's version-guarded update.

## Consequences

- No new storage and no new code path in the action transaction: the welcome items are ordinary `OrderItem`s.
- A character created at 23:50 UTC keeps the welcome set for ten minutes, then gets the rotation (accepted by the
  designer; Appendix C #18 records the extension if the playtest needs it: that would be a condition on the next
  settlement, still no storage).
- Characters migrated from slices 0–1 that have never been settled (`day.settled: null`) also get the welcome set on
  their first touch; migrated characters that already have a paper do not.
