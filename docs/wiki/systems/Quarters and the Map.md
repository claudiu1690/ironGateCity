---
type: system
title: Quarters and the Map
aliases: [Quarters, Quarter, City map, Map, Tiled maps, Places list, What's here, Town Hall, Map pins, Survey]
tags: [map, city, art]
status: built
slice: "maps v3 (1–2 Oct); 4 (districts, nation map); 5 (second quarters); review 3 (free zoom); review 4 (one map, tiling, Town Hall); review 5 (What's here); review 6 (map buttons in one row; nation map held sideways)"
gdd: ["§14.13", "§14.9"]
adrs: ["0024", "0035", "0076", "0077"]
updated: 2026-10-15
---

# Quarters and the Map

## In one paragraph

Every city is **one big painted bird's-eye picture** (8,640 px; the capital 11,520; the nation
9,216), day and night, served as zoomable tiles. The map fills the screen, the player drags and
zooms it freely, and a tap on a pin zooms onto the place and opens its sheet. A **quarter** is a
group of places that opens by Level (1 / 6 / 10). In the capital the quarters are the five
[[Capital Districts|districts]], drawn as outlines; in every other city a quarter is only a Level
gate, and the whole city is one map with locked places shown as greyed pins.

## How it works

- **The chain** is nation → city → (district) → place. Pins are fractions of the city picture,
  taken from the **survey** of the painted art (`mapPins.ts`). A place becomes playable by copying
  its survey pin into a location, never by repainting ([[GDD#14.13 Quarters: how a city is laid out on the map (new, 1 Oct 2026)|GDD §14.13]]).
- **Quarters open by Level, per character:** first at Level 1, second at **Level 6**, third at
  **Level 10** (the train's level). Always a Level, never Rank, story or the clock. A quarter never
  closes. A place also opens the moment the game sends you there (infirmary, cells).
- **A home city is one map** (review 4, reversing slice 5's overview): every surveyed place is a
  pin; locked places are **greyed pins with a lock** and a note (*Opens at Level 6* / *Opens with a
  later edition*). No outlines, overview, quarter bar or teaser. Clearwater (slice 7) is one map too.
- **The capital keeps districts:** an overview with five outlines and names and a Districts list
  (no place pins); a district view draws only its own pins and holds the drag to the outline's
  bounding box. The five outlines **tile the whole picture**, checked by the loader.
- **The Town Hall** (review 4): the council's hall is a place on every city map, kind
  `town-hall`, **open at every Level** whatever its quarter. Its sheet is the council's public face
  (gallery ticket, your desk, the rule in force, next week's rule, the council, standing, Issues).
  The map opens on it on arrival by train ([[City Council and the Rule Vote]]).
- **Where the map opens:** the last pin viewed in that city; the Town Hall on arrival; the HQ with
  the first sheet open for a new character.
- **Free zoom** (review 3): between *no further in than the painting's finest detail* and *no
  further out than the scale that still fills the screen*. Same gestures on the nation map, the
  district overview and each district. Opening a place is one movement (zoom, dim and sheet together,
  250–350 ms; a fade under *reduce motion*).
- **What's here** (review 5): the plate's button opens a sheet with the city's two Issues, the
  missions you can start today, the orders here, then the places (grouped by quarter in a home city,
  the one place a quarter's name is read).
- **The map's buttons** (review 6): *What's here* and *City · Nation* (on the nation map *Cities* and
  *City · Nation*) share one row with an 8 px gap, at the top right sideways and from 640 px, at the
  two ends of the orders bar on an upright phone; they never overlap. Held sideways on a short screen
  the city and nation maps take the screen's height, with no 420 px floor.
- **Tiles:** AVIF q55, 512 px Deep Zoom tiles cut by `pnpm art:tiles` into a git-ignored cache,
  listed in the committed manifest `tiles.json` (12 pictures: five cities and the nation, day and
  night). Dev serves them through a Vite middleware; committed 1024/2048 px stills are the fallback
  and first paint. Hosting on Cloudflare R2 is decided but deferred (local until the end of the
  project). See [[Art and Maps Pipeline]].

## Where it lives

**Rules:** [[GDD#14.13 Quarters: how a city is laid out on the map (new, 1 Oct 2026)|GDD §14.13]] ·
[[GDD#14.9 Capital districts (new)|GDD §14.9]] ·
[[design/city-quarters|city-quarters design]] (the rule; Coalport's three quarters) ·
[[design/maps-v3-integration|maps-v3 integration]] (pictures, frames, pins, tiles, clouds) ·
[[design/review-4-answers#21. #21 — Home cities have no quarters on the map (GDD §14.13, reversed)|review-4 answers §21]] ·
[[design/review-5-answers#9. #9 — *What's here* (decided; GDD §14.13)|review-5 answers §9]] ·
[[adr/0024-tiled-maps-and-quarters|ADR 0024]] (tiles; revised for maps v3) ·
[[adr/0035-home-quarters-outlines-and-overview|ADR 0035]] (superseded in part) ·
[[adr/0076-home-cities-one-map-capital-districts-tile-the-picture|ADR 0076]] ·
[[adr/0077-the-town-hall-an-always-open-place-and-the-councils-public-view|ADR 0077]]

**Code:**
- Rules: `packages/rules/src/quarters.ts` (`quarterOpen`, `placeOpen`, `ALWAYS_OPEN_KINDS`) ·
  constant `QUARTERS`
- Content: `packages/content/src/data/mapPins.ts` (the survey: 92 city pins + 5 nation pins) ·
  `packages/content/src/data/tiles.json` · `packages/content/src/data/cities/*.ts` (`quarters[]`)
  · `packages/content/src/data/cities/townHall.ts` · `packages/content/src/geometry.ts`
  (`tilingProblems`) · `packages/content/src/maps.ts` (`cityOutlines`, `tilePyramids`)
- Server: `apps/server/src/services/cityService.ts` (`getCityView`: `lockedPins`, quarters,
  `whatsHereOf`) · `apps/server/src/services/townHallService.ts` · router
  `apps/server/src/trpc/routers/council.ts` (`council.hall`)
- Client: `packages/ui/src/components/CityMap.tsx` (`panLimit`), `TileLayer.tsx`,
  `CloudLayer.tsx`, `Places.tsx`, `TownHall.tsx` · `apps/client/src/routes/city.tsx` ·
  `apps/client/src/features/council/TownHall.tsx` · `apps/client/src/components/MapSwitch.tsx` ·
  `apps/client/src/routes/nation.tsx` · dev viewer
  `apps/client/src/features/dev/MapViewer.tsx` (`/dev/maps`, with the route trace mode)
- Scripts: `scripts/art/tiles.ts` (`pnpm art:tiles`), `scripts/art/build.ts` (`pnpm art:check`)

## Status

- **Built:** maps v3 pictures and AVIF tiles (1–2 Oct 2026); districts and the nation map
  (slice 4); second quarters (slice 5); free zoom (review 3); one map for home cities, the tiling,
  the Town Hall (review 4); *What's here* (review 5); the buttons' row and the nation map held
  sideways ([[Review 6]]).
- **Not built:** R2 tile hosting (deferred to the hosting step); third quarters' places (later
  content); Clearwater's map in play (slice 7; its tiles already exist).

## Decisions

- The stitched model: one picture per city, quarters as frames (user, 1 Oct 2026; Appendix C #39).
- Free zoom with two visible limits (review 3, 2 Oct 2026; Appendix C #45). The district lock
  (3 Oct 2026).
- Home cities are one map (review 4, 6 Oct 2026; Appendix C #95). Town Hall open at Level 1
  (Appendix C #93).
- Tiles in AVIF, not WebP, after the phone first-view target was missed (2 Oct 2026).

## Open questions / drift

- **Survey size** (GDD §14.13 *Growth*, fixed 14 Oct 2026): `mapPins.ts` holds **92 city pins** (Irongate 30 · Coalport 16 · Duskwall 16 · Ashford 17 · Clearwater 13) plus **5 nation pins**; **66 places are playable** (twelve in each home city with its Town Hall, thirty in the capital). The GDD said 89 and 18 until then.

- GDD §14.13 keeps the superseded bullets about home-city frames, overviews and teasers (marked
  as superseded at the head of the section), which can mislead a quick reader.

## Related

[[Capital Districts]] · [[Home Cities]] · [[Travel and Journeys]] · [[Art and Maps Pipeline]] ·
[[Game Client]] · [[Content Package]] · [[City Council and the Rule Vote]] · [[Add a Place]]
