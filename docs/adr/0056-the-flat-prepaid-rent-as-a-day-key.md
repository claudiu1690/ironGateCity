# ADR 0056 — The flat: prepaid rent as a day key, every bonus a function of the day, Rested at the boundary in the settlement's projection

**Status:** accepted (slice 8, built 17 Oct 2026; extends ADR 0030 §5) · **Date:** 2026-10-04

## Context

GDD §6.3, §17.4 and design §6: everyone sleeps in **a rented room** (+10 Rested at every boundary). **A flat** in the residence city (Level 10, 2,500 Iron with the first week paid, then 150 a week prepaid) gives +25 Rested at every boundary, Rested cap +50 (the larger of the flat and slice 4's room, never both), a third outfit (*Evening*), and +2 worn Charisma in its city. **When the rent runs out the flat waits**: the bonuses stop, nothing is taken, and no arrears are owed. Moving residence leaves the flat where it is.

ADR 0030 §5 made the Rested cap a per-day function (`capOn(day)`) that the settlement's projection walks, and re-bases Energy at a move or a room.

## Decision

1. **`home.flat { cityId, boughtDay, paidThroughDay }`**, an inclusive day key. *A rented room* is the absence of a flat.
2. **Every bonus is a pure function of the day**: `flatCounts(day)` = paid through that day and its city is the residence. The cap, the *Evening* chip, the +2 Charisma (also standing in its city) and the boundary's Rested read it. **A lapse writes nothing.**
3. **Paying** sets `paidThroughDay = max(paidThroughDay, today − 1) + 7 × weeks`: a lapsed flat pays from today, so no arrears exist by construction.
4. **Rested at the boundary** is `restOn(b)` (+25 when the flat counted on the night before, else +10), added inside `projectEnergyThrough` as it crosses each boundary, capped at that day's cap, in the settlement's one projection: banked once whoever reads first.
5. **Buying, and paying a lapsed flat, re-base Energy at the tap** (today's cap changes); the perk *A better night's sleep* adds its +50 the same way.

## Consequences

- No job, no expiry write, nothing repossessed: the rule "nothing owned is lost by absence" holds by construction.
- A townhouse or a villa (post-MVP) is another kind with its own numbers in the same functions.
- The first boundary after a lapse pays +25 for the paid last night and +10 after, which the paper explains (*The Flat Waits*).
