# Mini-slice "new maps": the v3 painted maps in the game

Architect, 1 Oct 2026. Puts the approved maps-v3 art (one big painted picture per city, the nation at 9,216 px) into the game with Deep Zoom tiles, moves every existing place to its approved pin, and turns a quarter into a **frame** on the one picture. ADR 0024 is revised to match (its "Revision (maps v3)" section). No rule, number or economy value changes.

**Inputs:** masters in `E:\Projects\ironGateCity Docs\art-direction\maps-v3\` (12 PNGs, 200–390 MB each); pins in `maps-v3\pins\pins.json` (`[id, name, x, y, quarter]`, fractions of the master); the spike `spike/big-maps` (ab99562, 2aa1886); `CityMap` as review 2 left it.

---

## 1. Scope

| In | Out (deferred, with where it goes) |
|---|---|
| Tiles for all 12 masters (5 cities + nation, day and night) | New places: the 71 pins in pins.json without content stay **survey data** (§5.4), never content |
| Coalport, Duskwall, Ashford in the game on the v3 art, tiled, with their 18 places at the approved pins | Locked plates, quarter bar, overview, Level gates (city-quarters.md §1.3); they come with the slice that builds quarter 2 |
| A quarter = a frame on the city picture (content, first quarter only) | Irongate districts in play, Clearwater, the nation screen (slices 4 and 7) |
| Stills (two widths, committed) as first paint, fallback and production path until R2 | Cloudflare R2, `art:publish`, the CDN switch flipped on (needs the user's account) |
| A dev-only map viewer for all 12 pictures with every surveyed pin | The zoom-through nation → city and between pictures (spike `focus`/`enterFrom`/`exitTo`): no second picture to go through until slice 4 |
| Day/night quick fade (250 ms) | AVIF tiles (§4, only if the measured bytes demand it) |

**How the spike comes over: re-implement, don't cherry-pick.** Its two commits carry OpenSeadragon, the lab, 4,000 lines of measurement JSON and the zoom-through props. Take **file contents** only: `git show spike/big-maps:packages/ui/src/components/TileLayer.tsx` and `.../test/tiles.test.tsx`, plus the `tiles` part of the `CityMap` diff (aspect and native size from the pyramid, the tile backdrop, the two tile layers, `tileView` following the target or a drag). Leave out `focus`, `enterFrom`, `hold`, `holdTilesAtFit`, `exitTo`, `onSettle`, `layerChildren`, `focusView`, `placeOn`, `regionOnBox`. Copy ADR 0024 (done with this design). No new dependency (sharp is already a root devDependency).

**The single-image path stays**, as the **still** path: the committed AVIF/WebP of the same v3 art. It renders when no tile origin is configured (production until R2, unit tests) and when tiles fail at runtime. The old pen-and-ink files are deleted.

---

## 2. Quarters on one picture

A quarter (and, from slice 4, a capital district) is a **frame**: a rectangle of the city picture in fractions, `{ x0, y0, x1, y1 }`. It is not an image.

- **Data (content, authored by the game designer):** `City.quarters: Quarter[]` (min 1), `Quarter = { id, name, frame }`; `Location.quarterId` (required). This mini-slice adds **only the first quarter** of each home city, because only its places exist: `coalport.mill` *The Mill*, `duskwall.fortress` *The Fortress*, `ashford.college` *The College* (names from city-quarters.md §8.1). Levels, teaser lines and plates are added when quarter 2 is built.
- **Initial frames** = the bounding box of the quarter's pins in pins.json, grown by 0.06 on every side, clamped to [0, 1]. The developer writes these values; the designer may tune them in the dev viewer (§6):

| Quarter | x0 | y0 | x1 | y1 | Pins span (x × y) |
|---|---|---|---|---|---|
| `coalport.mill` | 0.34 | 0.02 | 0.81 | 0.62 | 0.35 × 0.48 |
| `duskwall.fortress` | 0.07 | 0.06 | 0.65 | 0.91 | 0.46 × 0.73 |
| `ashford.college` | 0.24 | 0.19 | 0.76 | 0.68 | 0.40 × 0.37 |

- **Validation (content load):** `quarterId` names a quarter of the same city; every location's pin lies inside its quarter's frame with a margin of at least 0.02; `x0 < x1`, `y0 < y1`.
- **What the frame does in `CityMap`** (new optional prop `frame?: MapRect` in fractions; default the whole picture, which is today's behaviour):
  - **Scale 1 means "the frame covers the box"**, not "the picture covers the box": `contentW = max(w / (x1 − x0), h · aspect / (y1 − y0))`. `fitPinsView`, `zoomView` and `zoomScale` are unchanged; their "1" is now the frame. So the fitted view is about the frame, fitted to the pins clear of the plate, the orders and the dock (QA M2), and a pin zooms 2.5× that view (at least 1.6×, at most 3×, never past native resolution) exactly as review 2 set.
  - **Zoomed drag stays near the frame:** `panLimits` gains the frame. While zoomed, the frame grown by 25 % of its width and height on each side (clamped to the picture) must cover the box; the zoomed view itself is always allowed, as today. This keeps "no free pan": a player cannot drag across the whole city.
  - Outside the frame is real art (the other quarters, drawn in full), never black. The blurred backdrop stays for the one case where the picture is smaller than the box (see risk R3).
- **Entry:** the city view opens on the city's first quarter (`quarters[0]`), the only one in this mini-slice, for every visitor; `?loc=` deep links zoom into the pin as today; the welcome landing is unchanged. The GDD's "the quarter you are in" (last viewed, station on arrival) comes with quarter 2 as client memory, as §14.13 says.
- **Irongate:** the five districts map one to one to pins.json quarter numbers 1–5 (Government Quarter, Old Town, Station & Market, Eastside, Garrison Hill). Slice 4 gives each district a `frame` the same way (survey pins + 0.06), replacing slice-4-battleground.md §4.2's crops, which were measured on the retired image. Nothing in Irongate is content in this mini-slice.

---

## 3. Data and contract changes

**Content (`packages/content`)**
- `schemas.ts`: `Frame = { x0, y0, x1, y1 }` (fractions, refined); `Quarter`; `City.quarters`; `Location.quarterId`; `TilesManifest` (below); `MapPins` (§5.4).
- `data/cities/*.ts`: one quarter each; every location gets `quarterId` and its pins.json `map` (table in §5.3). Location order, ids and names are unchanged, so the pin numbers are unchanged.
- `data/art.ts`: the six home-city map assets point at `maps-v3/<city>-<day|night>-8640.png`, `width/height 8640`, `widths [1024, 2048]`. Asset ids are kept (`map.coalport.day`, ...): the still file names change with the widths, so no cached old file is ever served under a new picture. Alt texts are redrafted for the painted art (§8, game designer). Irongate, Clearwater and nation stills are **not** catalogued yet (their slices add them with a measured budget, ADR 0015's rule).
- `data/tiles.json` (generated, committed): `{ "<assetId>": { rev, width, height, tileSize, overlap, maxLevel, format: "webp", tiles, bytes } }` for all 12 masters. Loaded and Zod-validated in `load.ts`; `content.tiles(id)` returns the entry or undefined. Load check: **every `map` asset in the catalogue has an entry with the same width and height.** Entries without a catalogue asset are allowed (the dev viewer's six).

**Rules types (`packages/rules/src/types.ts`)**
- `AssetView.tiles: TileSource | null`, `TileSource = { path: string /* "<assetId>/<rev>" */, width, height, tileSize, overlap, maxLevel, format: 'webp' }`. Null for every non-map asset.
- `CityView.quarters: Array<{ id: string; name: string; frame: Frame }>`.
- `LocationView` is unchanged (the client needs no `quarterId` yet).

**Server:** `assetView()` fills `tiles` from `content.tiles(id)`; `cityService` adds `quarters`. No tRPC input changes, no new procedures, no new errors.

**Stored data and migration: none.** No document stores map coordinates. `actionLog.result` stores past `ActionResult`s with a `map-crop` art (old id widths and x/y); only an idempotent replay re-reads one, and its decorative header then misses its file (the ink background shows). Accepted; no migration.

**Map-crop rung (§13.5 rung 3):** `ResultModal` (`CROP_W`) and `Story` (`W`) show the still at **2048 px** (its largest width, native, never upscaled) instead of 1400, so a place reads at about the old size on the denser art.

---

## 4. Tile pipeline: `pnpm art:tiles` (`scripts/art/tiles.ts`)

- **Input:** `--src <folder>` (default `$IRONGATE_ART_SRC/maps-v3`). Every file matching `^(nation|coalport|duskwall|ashford|clearwater|irongate)-(day|night)-(\d+)\.png$` becomes asset id `map.<name>.<day|night>`. The script refuses a file whose real size differs from the size in its name. `--only <name>` and `--force` as in the spike.
- **Cutting:** sharp's native Deep Zoom writer (libvips `dzsave`, streaming, so a 390 MB master needs no raw buffer): `sharp(src, { limitInputPixels: false }).flatten({ background: '#EFE6D2' }).webp({ quality: 75, effort: 4 }).tile({ size: 512, overlap: 1, layout: 'dz', depth: 'onepixel' }).toFile(<dir>/webp.dz)`, which writes `webp.dzi` and `webp_files/<level>/<col>_<row>.webp`, the layout `TileLayer` already reads.
- **Why WebP only (revises ADR 0024's AVIF + WebP):** one format halves the files and the build time; sharp writes it natively (AVIF needs the spike's hand tiler, which holds the whole master in memory); every supported browser decodes WebP; tiles are plain `<img>`s with no `<picture>` fallback. Cost: about 1.5× AVIF's bytes per view. Revisit only if T13's measurement misses its target.
- **Levels:** every level down to 1 px; `maxLevel = ceil(log2(max(w, h)))` (14 for all 12 masters). The client draws a one-tile underlay (the smallest level ≥ 256 px) plus the detail level for the destination view, **DPR capped at 2** (`TILE_MAX_DPR`, the phone cap), as in the spike.
- **Versioned output (git-ignored):** `.art-cache/tiles/<assetId>/<rev>/`, with `rev` = the first 8 hex of sha256(master bytes + settings). A re-export (for example Coalport repainted) gets a new path, so the immutable cache never goes stale. Idempotent: an existing `<rev>/webp.dzi` is skipped.
- **Self-check after each cut:** the `.dzi` size equals the master, there are `maxLevel + 1` level folders, and each level holds exactly the columns × rows that `levelSize`/`tilesFor` predict. The pure geometry moves to `packages/ui/src/tiles.ts` (no React) so the script and `TileLayer` share it. Then the script merges the entry into `tiles.json`.
- **Estimated output** (spike: 140–165 KB/MP WebP for pen art; the painted art is assumed up to 1.5× that): about 420 tiles per 8,640 picture (10–20 MB), 730 for Irongate (18–33 MB), 450 for the nation (12–22 MB). **All 12: about 5,700 files, 150–260 MB.** Build time is a few minutes per master. The developer records the real figures in §9.

---

## 5. Hosting, fallback, pins

### 5.1 Where the client finds tiles
- `apps/client/src/env.ts`: `tilesOrigin = VITE_TILES_ORIGIN ?? (DEV ? '/tiles' : '')`. An empty value means no tiles: the still path, with no tile requests.
- `packages/ui` exports `pyramidFor(asset: AssetView, origin: string): TilePyramid | null` = `{ ...asset.tiles, base: origin + '/' + asset.tiles.path }`, or null when there is no origin or no `tiles`. `city.tsx` passes `tiles={day && night ? { day, night } : null}` and `frame={c.quarters[0].frame}`.
- **Dev and preview:** a Vite plugin (the spike's `serveLabTiles`, renamed) serves `/tiles/*` from `<repo>/.art-cache/tiles` (path-traversal guard, `image/webp`, `Cache-Control: public, max-age=31536000, immutable`). It is never copied into the build.
- **Production now:** `VITE_TILES_ORIGIN` unset, so Vercel serves the stills. The new art ships, but a zoomed place is capped at the 2048 still's resolution (§8 Q2).
- **Later (R2 mini-slice):** upload `.art-cache/tiles/**` to the bucket under the same paths, set `VITE_TILES_ORIGIN=https://tiles.<domain>`, done. No CORS is needed (plain `<img>`). If a CSP is ever added, `img-src` must list the origin.

### 5.2 Runtime fallback
- `TileLayer` gains `onUnavailable()`, called when an **underlay** tile errors (a 404, or HTML from a SPA rewrite failing to decode). `CityMap` then switches to the stills for the rest of its mount. A failed **detail** tile is dropped from "pending" and the underlay shows there.
- `CityMap` reports `data-art="tiles" | "still"` for tests. With tiles, the blurred backdrop is the underlay tile (the spike's `backdropUrl`).
- `aspect` and `nativeScale` come from whichever source is active (8640 tiles or the 2048 still); the target view recomputes once if a fallback happens.

### 5.3 Pins moved (fractions of the master, from pins.json)

| City | Location: x, y |
|---|---|
| Coalport | mill-gate 0.75, 0.20 · market-row 0.40, 0.44 · union-hall 0.42, 0.35 · terraces 0.65, 0.08 · quays 0.71, 0.43 · anchor 0.62, 0.56 |
| Duskwall | garrison-gate 0.59, 0.37 · quartermaster-market 0.44, 0.53 · beacon-house 0.38, 0.45 · archives 0.58, 0.12 · goods-yard 0.13, 0.85 · rampart-row 0.22, 0.38 |
| Ashford | gazette-house 0.53, 0.47 · assembly-rooms 0.69, 0.27 · university 0.49, 0.25 · courts 0.70, 0.37 · bridge-street 0.40, 0.55 · weavers-row 0.30, 0.62 |

### 5.4 The survey of the art (future places, kept as data)
`packages/content/src/data/mapPins.ts`: pins.json transcribed and Zod-validated, as `{ [mapKey]: { pins: Array<{ id, name, x, y, quarter }> } }` for the five cities, plus `nation: { pins: [] }` until the city positions are supplied (§8 Q1). It is **not** game content: nothing in the server reads it. Two users only: the content test (**every location's `map` equals its survey pin**; every location id is in the survey) and the dev viewer. Later slices copy a survey pin into a new location; the test then keeps the two in step.

### 5.5 The nation map
The 9,216 px pair is tiled and viewable in the dev viewer only; there is no nation screen until slice 4. **City positions on the new picture are not in pins.json**, and slice-4-battleground.md §2.1's table was measured on the retired 5,504 × 3,072 art, so it does not carry over. The main session or the user supplies five `[cityId, x, y]` fractions into `mapPins.nation`; this mini-slice does not block on them. Nothing else about the nation changes here.

---

## 6. Day and night, and the dev viewer

- **Quick fade:** the night layer's opacity transition becomes **250 ms** (from 700) for both paths, because day and night differ by up to half a building and a slow fade shows a double image. Reduced motion means no transition. With tiles, the layer that faded out is **unmounted 300 ms after the flip**, so a later zoom fetches one set of tiles, not two. The lazy first mount is unchanged (a landing at night loads night only).
- **Dev viewer `/dev/maps`** (registered only when `import.meta.env.DEV`, outside the auth guard, at most ~150 lines). It offers a picker for the 12 pyramids from `tiles.json`, a day/night toggle, and for cities a quarter picker that sets `frame` to its pins' box + 0.06. It shows `CityMap` with that quarter's survey pins, and tapping a pin zooms in. It is the user's and the designer's way to check Irongate, Clearwater, the nation, the pins and the frames before their slices.

---

## 7. Checks and tests

**`pnpm art:check` (CI, no sources needed):**
- map budgets keyed by the new widths: 2048: 600 / 850 KB, 1024: 220 / 320 KB (AVIF / WebP), the same pixel counts as the old 2560 × 1717 and 1280 × 859 files;
- the 12 MB set cap is unchanged;
- `tiles.json` parses, and every catalogue map has a matching entry.

`pnpm art:tiles --check` (dev only) checks that every manifest entry's `<rev>` exists in `.art-cache/tiles`.

**Unit (Vitest):**
- `ui`: the spike's geometry tests, retargeted to 8,640 and 11,520;
- `TileLayer`: an underlay error calls `onUnavailable`; a detail error does not, and pending reaches 0;
- `pyramidFor`: null without an origin or tiles, and the right `base`;
- `CityMap` with `frame`: at scale 1 the frame covers the box; on 390 × 600, 1440 × 814 and 812 × 375 every pin is clear (QA M2 fixtures with v3 pins); a zoomed drag stops at frame + 25 %;
- `CityMap` with `tiles`: `data-art="tiles"`, no `<picture>` in the layer; after `onUnavailable`, `data-art="still"` and the pins are the same DOM nodes;
- night: a 250 ms transition, and the hidden tile layer unmounted after the flip;
- `content`: frame containment, `quarterId` valid, locations equal the survey, the manifest covers the catalogue;
- `server` and `rules`: fixtures move to 8640² with `[1024, 2048]` and `tiles`; `assetView` and `city.get` include `tiles` and `quarters`.

**E2E (Playwright):**
- The e2e client build sets `VITE_TILES_ORIGIN=/e2e-tiles`, which nothing serves, so **every existing spec runs the fallback path**. `map.spec` (every pin clear at every size; no black at rest or zoomed), `landscape.spec` and the arrival's first-session budget (≤ 1 MB of `/art/`) must pass as they are.
- New `tiles.spec.ts` routes `**/e2e-tiles/**` to a committed fixture tile (`e2e/fixtures/tile.webp`, 512², a few hundred bytes):
  1. `data-art="tiles"` and some loaded `[data-tile]` images;
  2. a pin tap zooms in (`data-zoomed=true`, then `data-moving=false`), tiles of a higher level are requested, and the pin buttons are the same nodes as before (mark them with `evaluate`);
  3. routing the tiles to 404 gives `data-art="still"` within 2 s, with the still visible and no black (the map.spec sampler);
  4. landscape 812 × 375: a tap zooms into a pin and the side panel opens;
  5. at night (test clock at 21:00 UTC) the night layer is shown, and after a flip back exactly one tile layer is mounted.

---

## 8. Questions (for the user, the main session, the game designer)

1. **Nation city positions** on `nation-day-9216.png`: five fractions, needed by slice 4 (not here).
2. **Production before R2:** the next deploy shows the v3 art as 2048 stills; a zoomed place is softer than with tiles (capped at the still's resolution). Ship like that, or hold the deploy until the user has made the R2 account?
3. **Duskwall's first view on wide screens** (risk R3): Goods Yard (0.13, 0.85) and State Archives (0.58, 0.12) span 73 % of the picture's height, so on a 16:9 desktop the first view letterboxes onto the blurred backdrop. Accept, move the Goods Yard pin, or leave the Goods Yard out of the frame until quarter 2? (A game designer call.)
4. **Zoom numbers:** review 2's 2.5× / 1.6× / 3× now apply to the frame. The user should check them in the dev viewer before the playtest; the frame + 25 % drag limit should be confirmed as "no free pan".
5. **Game designer, docs:**
   - GDD §14.13, §14.9 and Appendix C #39: the user chose the stitched model (one picture per city; quarters and districts are frames; the overview is the whole picture zoomed out);
   - city-quarters.md §4 and slice-4-battleground.md §2.1 and §4.2: their pins and crops are superseded by pins.json;
   - later quarters are spread out on the new art (Coalport's Harbour pins run x 0.17–0.93), so decide whether quarter 2's frame is its own or "all open places";
   - the map alt texts for the painted art.
6. **Coalport's red cross** (Infirmary, 0.17, 0.50) will be painted out later; no code impact. When the repaint lands: re-run `art:tiles`, which gives a new rev and so new tile URLs. The **stills keep their URLs** under the year-long immutable `/art/` cache, so the repaint must ship with a new still asset id (for example `map.coalport.day-2`) or players keep the old still.

## 9. Risks and measurements to record

- **R1 Bytes per view with tiles.** Estimated at 300–600 KB for a phone's first city view (painted WebP). Target ≤ 450 KB on a Pixel 7 profile; record the real figures here (T13). If missed: AVIF tiles, quality 70, or DPR 1.5 for the first view. The ADR 0015 first-session check must count tile bytes once tiles are live.
- **R2 The still path's first-session bytes:** the 2048 still is picked on phones (about 450–600 KB); the arrival spec guards the 1 MB.
- **R3 Letterboxing:** square art plus a tall pin spread (Duskwall) on wide screens; see Q3.
- **R4 Pins measured on the `*-A-big*` sources:** fractions carry over if the masters are the same composition. The developer spot-checks each existing pin on its building in the dev viewer (T12).
- **R5 Disk:** the cache is 150–260 MB per working copy; it lives outside git and is rebuilt by `art:tiles`.

---

## 10. Tasks (in order; each ends green: `pnpm lint typecheck test`)

1. **Housekeeping and geometry.** `.gitignore` gets `.art-cache/`. Bring `TileLayer.tsx` and its tests over from the spike (file contents, §1), with the pure geometry in `packages/ui/src/tiles.ts`. *Check:* the ui tests pass; no `openseadragon`, lab or spike scripts on slice-0.
2. **`pnpm art:tiles`** (§4) and its `--check`. *Check:* it cuts all 12 masters into `.art-cache/tiles`, writes `tiles.json`, and its self-check passes; a second run skips everything; it prints the files, MB and seconds per master.
3. **Content schema** (§3): `Frame`, `Quarter`, `City.quarters`, `Location.quarterId`, `TilesManifest` and `content.tiles()`, `MapPins` with the survey transcribed. *Check:* the content tests (containment, survey equality, manifest coverage) fail on a deliberately wrong value and pass on the real data.
4. **Pins and quarters data:** the three quarters with the §2 frames; the 18 locations at §5.3's positions with `quarterId`. *Check:* the content tests are green and the pin numbers are unchanged.
5. **Stills:** the six map assets on the v3 sources, widths 1024/2048, the new budgets; run `art:build`; delete the old `map.*-1280|2560.*` files. *Check:* `pnpm art:check` passes, with the set ≤ 12 MB, reported.
6. **Contract:** `AssetView.tiles`, `CityView.quarters`, server views, fixtures. *Check:* the server and rules tests are green, and `city.get` returns `tiles` and `quarters` for Coalport.
7. **`CityMap` frame:** the `contentW` rule and `panLimits` with the frame. *Check:* the frame unit tests (§7); the existing fit and zoom tests are green after their expected numbers are updated to the new fixtures.
8. **`CityMap` tiles:** the spike's tile part, `onUnavailable` and the fallback, `data-art`, the tile backdrop. *Check:* the tiles and fallback unit tests; no remount across the fallback.
9. **Day/night:** the 250 ms fade and the hidden tile layer unmounted. *Check:* the unit test; the reduced-motion path is instant.
10. **Client wiring:** `env.tilesOrigin`, `pyramidFor`, `city.tsx` passing `tiles` and `frame`, the Vite `/tiles` plugin, map-crop at 2048 in `ResultModal` and `Story`. *Check:* `pnpm dev` with the cache shows Coalport tiled (`data-art=tiles`); without the cache it falls back to stills.
11. **E2E** (§7): the build env, the fixture tile, `tiles.spec.ts`. *Check:* the full Playwright run is green, including `map.spec`, `landscape.spec` and the arrival budget.
12. **Dev viewer `/dev/maps`** (§6). *Check:* all 12 pictures open, day and night; every survey pin sits on its building (spot-check the 18 existing ones and note any off by more than half a building).
13. **Measure and record** in §9: with tiles in dev, the bytes and tiles for the first city view and for a zoom to a place, on a Pixel 7 profile (DPR capped at 2) and on a 1440 × 900 desktop; the still path's first-session total. *Check:* the figures are in this document, and R1 is answered.
