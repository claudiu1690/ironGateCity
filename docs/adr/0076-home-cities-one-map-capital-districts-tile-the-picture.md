# ADR 0076 — Home cities are one map; only the capital's districts have outlines, and they tile the picture

**Status:** proposed (review 4 fix round; **reverses ADR 0035 for home cities**, keeps it for the capital; amends the slice-4 district lock) · **Date:** 2026-10-06

## Context

ADR 0035 gave every home city the capital's overview: quarters drawn as outlines with names, a quarter view held inside its frame, a quarter bar, a teaser sheet, and the routes `/city/$c/overview` and `/city/$c/$quarter`. Review 4 reverses this for home cities (`docs/design/review-4-answers.md` §21, GDD §14.13):

- **A home city is one map.** Every surveyed place is a pin.
- Locked places are **greyed pins with a lock** and the note *Opens at Level 6* or *Opens with a later edition*.
- There are no outlines, no bar, no overview and no teaser sheet.
- A quarter stays as **the Level gate of a group of places**, read on the Places list, which is grouped by quarter.
- **Only Irongate has districts**, because there they are political units.

In the same review, the capital's five districts must **tile the whole picture**, water included, along the river's middle (§8; GDD §14.9). Inside a district the drag limit becomes **the outline's bounding box**; the frames stay the zoom targets.

There is one more case. Ashford's Town Hall stands in a later-edition quarter but must be open at Level 1 (ADR 0077).

## Decision

1. **Content: quarter shapes are the capital's only.**
   - `Quarter.frame` becomes optional in the schema. The loader requires `frame`, `outline`, `label` and `district` on every quarter of a districted city, and **refuses** them on any other city.
   - `teaser` is removed.
   - `opens`, `name` and `blurb` stay on every quarter.
2. **The capital's outlines are a proven tiling.** The loader checks:
   - the five polygons' areas sum to 1 (± 1e-9);
   - every edge not on the picture's border appears, reversed, in exactly one other polygon (so shared points are the same points);
   - every pin, anchor and label lies strictly inside its own district.

   A gap, an overlap or a T-junction each fails with a named problem, and each has a failing fixture.
3. **Places open by `placeOpen`.** It is pure, in rules, and replaces `quarterOpen` at every place-level call. A place is open:
   - when its kind is always-open (`town-hall`), or
   - when the game holds the character there (slice 5's rule), or
   - when its quarter is open by Level.

   `quarterOpen` remains for the capital's districts and for group headers.
4. **Later places come from the survey.** For a city without districts, `content.laterPins(cityId)` is derived at load from `mapPins`: every survey pin that is not a location, placed in `quarters[pin.quarter − 1]` (the loader checks that the quarter exists). Its lock is always `edition`. Nothing is duplicated in content.
5. **The view.**
   - `CityView.locations` stays open places only.
   - `CityView.lockedPins[]` carries `{ id, name, quarterId, map, lock }` for locked locations and later pins: no tickets, no missions, no jobs.
   - For a home city, `CityView.quarters[]` carries `{ id, name, blurb, lock }` (the group headers).
6. **Routes.**
   - For a home city, `/city/$cityId/$quarterId` (including `overview`) redirects to `/city/$cityId`, keeping `?loc`.
   - The capital keeps every ADR 0035 route.
   - Session memory of the last quarter goes. The last pin viewed stays.
7. **The drag limit.** `CityMap` gains `panLimit?: MapRect`. A district passes its outline's bounding box, which replaces the frame grown by `REST_PAN_MARGIN` at rest and when zoomed. It is still widened so that every pin can be brought clear of the blocks. The zoom-out limit is unchanged.

## Consequences

- Most of slice 5's home-overview client code goes: the overview, the quarter view, the bar in quarter mode, the teaser sheet and the *Quarters* list for home cities. The capital's path is untouched. `quarters.spec.ts` is rewritten for the one map.
- The survey becomes a reader of game views. Its header comment changes from "nothing in the server reads it" to "the server reads its unbuilt pins as later places". A survey pin that moves (Ashford's Town Hall) moves in `mapPins.ts` and in the art folder's `pins.json`.
- Clearwater (slice 7) is a one-map city: no frames, outlines, labels or `landingQuarterId`. The Front's four places are later pins until slice 8 builds them.
- A sixth district is a split of one of the five (Appendix C #41). The tiling check makes the split exact.
