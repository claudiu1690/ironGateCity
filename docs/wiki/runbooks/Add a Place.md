---
type: runbook
title: Add a Place
aliases: [new location, add location, add a location]
tags: [content, map, cities]
updated: 2026-10-14
---

# Add a Place

**Use when:** you want a new location (a pin with tickets) in an existing city. Content is data:
no code changes, and no repainting, because the painted maps already hold every long-run place
([[GDD#14.13 Quarters: how a city is laid out on the map (new, 1 Oct 2026)|GDD §14.13]]). Background:
[[Quarters and the Map]], [[design/city-quarters|city quarters]],
[[design/maps-v3-integration#5.4 The survey of the art (future places, kept as data)|maps v3 §5.4]].

## Steps

1. **Design it** (game-designer): name, kind, quarter, one-line blurb, tickets with success and
   partial texts, any job or lodgings. Write it in the slice or round design doc. Vanguard or
   Duskwall text goes through the [[design/content-policy-review#7. The checklist for future Vanguard content (the content policy, Appendix C #7)|content-policy checklist]].
2. **Take a survey pin.** Every playable place sits on its surveyed pin in
   `packages/content/src/data/mapPins.ts` (the approved survey of the painted art; 92 pins over five
   cities today, of which 66 are playable; GDD §14.13 still says 89 and 18, from before slice 5 and
   review 4's halls). Unbuilt pins already show in home cities as greyed *later* pins. A place becomes playable
   by **copying its pin** into a location; the loader refuses a place that is not on its survey pin.
   If the place is not on the survey at all, the pin is added to `mapPins.ts` **and** to
   `art-direction/maps-v3/pins/pins.json` (the file's own rule), checked on the painting.
3. **Pick the kind** from the closed list (`LocationKind` in `schemas.ts`;
   [[GDD#13.5 Art for missions: the fallback ladder (new)|GDD §13.5]]). The kind picks the scene art,
   the sheet kicker (`KIND_LABELS` in `copy.ts`) and the map-crop fallback. **A new kind is a design
   change**, not content: it needs the GDD, the schema, a kicker label and a scene binding.
4. **Add the location** to the city file `packages/content/src/data/cities/<city>.ts`, at the
   **end** of `locations`, so no existing pin renumbers (the pin number is the index + 1; the Town
   Halls were appended last for this reason):

   | Field | Rule (checked by the loader) |
   |---|---|
   | `id` | `<city>.<slug>`, unique |
   | `name`, `ref` | `ref` is the name in running text when it takes an article (*the Mill Gate*) |
   | `kind` | from the closed list |
   | `blurb` | ≤ 200 chars, one line |
   | `map` | exactly the survey pin; at least 0.03 from every other place |
   | `quarterId` | a quarter of that city; in the capital the pin must lie inside the district's outline |
   | `factionId` | only on a `faction-hq` (required there; members only). A home city has exactly one HQ, its own party's |
   | `actions` | ≥ 1 ticket (below). A `hospital` or `jail` has **exactly two** |
   | `treatment` | required on every `hospital` (the carer: `matron`, `sister`, `nurse`), nowhere else |
   | `lodgings` | at most one per city, and only in the room's city (`ROOM.cityId`, Irongate until slice 7) |
   | `missions` | none here: they go in the missions file ([[Add a Mission]]) |

5. **Write the tickets** (`Action` in `schemas.ts`). A checked ticket has `id` `<place id>.<slug>`,
   `name`, `tier: 1`, `type` (`canvass`, `speech`, `propaganda`, `intelligence`, `council`),
   `stats` (one stat, two, or `['best']`), `energy` 3–15 inside the [[GDD#13.3 Mission types|§13.3]]
   band, `givesFxp`, `givesOpinion`, optional `requires` (Level, Reputation) and `text.success` /
   `text.partial` (headline ≤ 80, body ≤ 240 chars, ≤ 4 sentences). A training ticket has `trains`
   and a one-word `verb` (*Study*, *Lift*). Rewards are not data: they follow from type and Energy.
   City files keep shared presets at the top (`const canvass = { tier: 1, type: 'canvass', energy: 10, … }`).
6. **Mind the quarter's gate.** A place in a quarter that `opens: { edition: 'later' }` is not
   reachable (the Town Hall is the one exception, open at every Level). Opening a later quarter is a
   content addendum the user decides, as for Coalport's Sidings.
7. **Jobs, orders, papers (if any).** A job goes in `packages/content/src/data/jobs.ts` with its
   `locationId` (the job ladder is checked). Party order templates in `orders.ts` can match the new
   place. The city's council hall is a `town-hall` built with `townHall(...)` in `cities/townHall.ts`.
8. **Art.** Usually none: the kind's scene (`scenes` in `art.ts`) or the map crop at the pin stands
   in ([[Art and Maps Pipeline]]).
9. **Update the GDD in the same work**: the place lists and counts in §14.13 (or §14.9 for the
   capital), §13.5's kinds by city, §14.1's key places when it is one; then the city's wiki page
   and [[Keep the Wiki Current]].

## Checks before done

- Content loads (`loadContent()` via `tsx`, or start the server); the loader lists every problem.
- `pnpm art:check && pnpm turbo run lint typecheck build` (turbo cache, no `--force`).
- e2e projects that touch places: `home-map` (home cities) or `capital` (Irongate), e.g.
  `pnpm --filter @irongate/client exec playwright test --project=home-map`.
- Play it in `pnpm dev:mem`: the pin on the map, the Places list (*What's here*, grouped by quarter
  in a home city), the sheet's kicker, each ticket and its result. Check pins on a 360 px phone
  (44 px apart at rest).
- The dev map viewer (`/dev/maps`) draws the survey pins over the picture.

## Related

[[Quarters and the Map]] · [[Add a Mission]] · [[Add or Change Game Text]] · [[Content Package]] ·
[[Coalport]] · [[Duskwall]] · [[Ashford]] · [[Irongate]] · [[Clearwater]]
