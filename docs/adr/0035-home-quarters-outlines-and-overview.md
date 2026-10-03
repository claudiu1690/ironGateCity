# ADR 0035 — Home-city quarters: outlines and opening on `Quarter`, one overview path for every city

**Status:** proposed (slice 5; extends ADR 0024's revision and the slice-4 district lock) · **Date:** 2026-10-03

## Context

At Level 6 each home city opens its second quarter, and its third quarter is a teaser (`docs/design/slice-5-risk.md` §2, GDD §14.13). The user's district lock (3 Oct 2026) is applied to home cities. A home city gets what the capital has:

- an **overview**: the whole picture, quarters as outlines with their names, a locked quarter drawn in full with its lock line, and a teaser sheet;
- a **quarter view** held inside its frame;
- a **quarter bar** and a *Quarters* list.

In slice 4, outlines live in `Quarter.district.outline`, so only the capital has them. The route `/city/$cityId` is the capital's overview, but for a home city it is the pin view: every slice 1–4 link (`?loc=`) and about twenty e2e specs use it that way.

## Decision

1. **Content.** `Quarter` gains:
   - `outline`, moved out of `district.outline` (6–24 points);
   - `label { x, y }`, where the name sits;
   - `opens: { level: 1 | 6 | 10 } | { edition: 'later' }`;
   - `teaser`, the line after the lock word.

   The loader's outline checks (pins inside their own outline, no two outlines overlapping) apply to every city that has outlines. A city with two or more quarters must have an outline and a label on every quarter.
2. **Rules.** `quarterOpen(q, level, heldLocationQuarter?)` covers both GDD §14.13 cases: a quarter opens by Level, and it opens when the game sends the character there. The second case cannot happen in slice 5 (missions need Level 6, rival ground Level 10), so it is a view rule with nothing stored.
3. **The view.** `CityView.quarters[]` carries, for every city: outline, label, open, lock, blurb and teaser. The client's overview and quarter views take the capital's `CityPage` path whenever `quarters.length > 1`:
   - one mounted `CityMap`;
   - `outlines` on the overview;
   - `focusOutline` and `lockToFrame` inside a quarter;
   - `TramBar` as the quarter bar, with locked chips.
4. **Routes.**
   - `/city/$cityId/$quarterId` is a quarter or district.
   - `/city/$cityId/overview` is the overview of any city. Quarter ids are always dotted, so `overview` cannot collide with one.
   - `/city/$cityId` keeps its slice-4 meaning: the capital's overview; for a home city, the **landing quarter** (the quarter of `?loc`, else the last quarter viewed in the session, else the first), rendered in place.
5. Which quarter the player is in stays **client memory** (GDD §14.13). The server never stores it.

## Consequences

- Every existing link and spec keeps working: `/city/coalport?loc=coalport.union-hall` still opens the Mill with the Union Hall's sheet.
- Irongate's content changes shape (its outline moves up a level). There is no stored document to migrate.
- The third quarters are drawn and teased with no places in content. A later content addendum adds their places, with no change to code.
