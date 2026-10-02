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
| Day/night quick fade (250 ms) | AVIF tiles (§4, only if the measured bytes demand it; **done 2 Oct, §9.2**) |
| | Nation-map city positions on the new picture (§5.5, §8 Q1): slice 4 uses them; **supplied 2 Oct**, in `mapPins.nation` (§9.2) |

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
- **Superseded 2 Oct 2026 (§9.2): the tiles are AVIF q55**, cut in two passes (dzsave to PNG tiles, then each tile to AVIF), because R1 was missed. The paragraph below is the first pyramid's reasoning.
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
- New `tiles.spec.ts` routes `**/e2e-tiles/**` to a committed fixture tile (`e2e/fixtures/tile.avif` since §9.2, 512², a few hundred bytes):
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
   - city-quarters.md §4 and slice-4-battleground.md §2.1 and §4.2: their pins and crops are superseded by pins.json; *(done 2 Oct: slice-4-battleground.md §2.1 is the painted nation with `mapPins.nation`, §4.2 is the five district frames from the survey pins + 0.06, §4.3 the survey pins; slice-4-screens.md rewritten for review 3's rules)*
   - later quarters are spread out on the new art (Coalport's Harbour pins run x 0.17–0.93), so decide whether quarter 2's frame is its own or "all open places";
   - the map alt texts for the painted art.
6. **Coalport's red cross** (Infirmary, 0.17, 0.50) will be painted out later; no code impact. *(Done 2 Oct: §9.2 says what was chosen for the stills.)* When the repaint lands: re-run `art:tiles`, which gives a new rev and so new tile URLs. The **stills keep their URLs** under the year-long immutable `/art/` cache, so the repaint must ship with a new still asset id (for example `map.coalport.day-2`) or players keep the old still.

## 9. Risks and measurements to record

- **R1 Bytes per view with tiles.** Estimated at 300–600 KB for a phone's first city view (painted WebP). Target ≤ 450 KB on a Pixel 7 profile; record the real figures here (T13). If missed: AVIF tiles, quality 70, or DPR 1.5 for the first view. The ADR 0015 first-session check must count tile bytes once tiles are live.
- **R2 The still path's first-session bytes:** the 2048 still is picked on phones (about 450–600 KB); the arrival spec guards the 1 MB.
- **R3 Letterboxing:** square art plus a tall pin spread (Duskwall) on wide screens; see Q3.
- **R4 Pins measured on the `*-A-big*` sources:** fractions carry over if the masters are the same composition. The developer spot-checks each existing pin on its building in the dev viewer (T12).
- **R5 Disk:** the cache is 150–260 MB per working copy; it lives outside git and is rebuilt by `art:tiles`.

---

### 9.1 Measured (developer, 1 Oct 2026)

**Tiles (T2, `pnpm art:tiles`, sharp 0.35 / libvips dzsave, 28 cores).** All 12 masters cut in about 33 s (2–5 s each, hashing included); a second run skips all 12 in about 4 s; the self-check passes on every pyramid.

| Pyramid | Tiles | MB |
|---|---|---|
| Coalport day / night | 418 / 418 | 23.5 / 20.3 |
| Duskwall day / night | 418 / 418 | 25.0 / 21.1 |
| Ashford day / night | 418 / 418 | 24.9 / 20.9 |
| Clearwater day / night | 418 / 418 | 23.4 / 20.4 |
| Irongate day / night | 732 / 732 | 47.1 / 42.2 |
| Nation day / night | 453 / 453 | 30.6 / 24.7 |
| **All 12** | **5,714** (+ 12 `.dzi`) | **324 MB** (337 MB on disk) |

The painted art costs about 300 KB per megapixel in WebP q75, above the §4 estimate (150–260 MB in all). A level-13 tile averages about 90 KB (WebP q75); the same tile is about 89 KB at q70, 82 KB at q60, 56 KB as AVIF q50 and 48 KB as AVIF q45.

**Stills (T5).** The committed set is **8.59 MB** (≤ 12 MB). The designed budgets could not all be met with the painted art: a 2048 px WebP is 1.0–1.5 MB even at q30–60 (budget 850 KB), and six of them would take the set to about 17 MB. So (deviation) a map's **WebP fallback is written at 1024 px only** (`Asset.webpWidths`, `AssetView.webpWidths`, used by `Picture`), and maps may step down to AVIF q35 / WebP q44 to meet the unchanged budgets. Every supported browser takes the AVIF (1024 and 2048).

| Still | KB (quality) |
|---|---|
| 2048 AVIF, day / night | 507–536 (q35) / 508–529 (q40) |
| 1024 AVIF | 185–217 (q45–50) |
| 1024 WebP | 311–319 (q44–68) |

**R1, bytes per view with tiles (T13).** Dev server (`/tiles` from the cache), Chromium, a fresh context and an empty cache per run; tile bytes as transferred, tiles in brackets. Pixel 7 profile (412 × 915, DPR 2.625, capped at 2) and a 1440 × 900 desktop at DPR 1.

| City | Pixel 7: first view | Pixel 7: zoom to pin 1 | Desktop: first view | Desktop: zoom to pin 1 |
|---|---|---|---|---|
| Coalport | 480 KB (10, levels 9 + 11) | 1,051 KB (12, level 13) | 460 KB (7) | 1,041 KB (12) |
| Duskwall | 502 KB (10) | 924 KB (9, level 12) | 502 KB (10) | 1,060 KB (12) |
| Ashford | 501 KB (10) | 1,029 KB (12) | 1,280 KB (13, level 12; first view covers) | 711 KB (8) |

**R1 is missed:** a phone's first city view is 480–500 KB against the 450 KB target, and a zoom into a place about 1 MB. (Before a fix in `TileLayer` the first view was up to 2.2 MB: the map box changes size once more a few ms after the first view (700 → 656 px tall on Pixel 7, as the page above it settles), and the detail level of that first, discarded view was fetched as well; the detail is now fetched once the view has held for 150 ms, `DETAIL_SETTLE_MS`.) Per §9 R1 the options are AVIF tiles (about 60 % of the bytes at q50), WebP q70 (about 4 % less), or DPR 1.5 for the first view: an architect's call.

**R2, the still path's first session** (arrival spec, sign-up to the first result modal, `/art/` bytes): phone 628–883 KB, 360 px phone 737–883 KB, desktop 592–660 KB; Ashford is the largest. Under the 1 MB budget.

**R3 and the small screens.** With the approved pins, the first view is letterboxed (the blurred copy at the sides) for Coalport and Duskwall on every desktop size from 1024 to 1920 px and on phones; Ashford covers on desktops. Two more consequences, both handled in `CityMap` (deviations):
- at 640 × 900 the 420 px corner plate was 66 % of the map's width, so it counted as a band and left the pins about 200 px of height; `OVERLAY_BAND_WIDTH_SHARE` is now 0.7, so the corner plate is always a block;
- on small screens (640 × 900, 375 × 812, 360 × 640, phones held sideways) the fitted view brings some pins closer than their 44 px targets (Duskwall's Customs Market and Beacon House are 0.1 apart while its pins span 0.73 of the height: 17 px apart at 360 × 640), so one covered the other. Pins closer than 46 px on screen are now spread apart by the least that clears them (`spreadPins`), at rest only in practice; zoomed views are never affected. A pin can then sit up to about 15 px off its building on a small phone until it is tapped. Moving the Goods Yard out of the first quarter (§8 Q3) would remove most of this for Duskwall.
- `map.spec`'s motion check ("the art covers the map at every frame of the zoom", 1440 × 900) moved from Coalport, whose first view is now letterboxed there, to Ashford.

**R4, pin spot-check (T12).** In `/dev/maps` all 12 pictures open, day and night. The 18 existing pins sit on their buildings at the first view and zoomed (Union Hall on the columned hall, Mill Gate at the mill, the Fortress Gate on the gatehouse, Gazette House on the brick print works with its chimney); none is off by more than half a building.

### 9.2 AVIF tiles, the Coalport repaint, the nation pins (developer, 2 Oct 2026)

**Coalport repainted** (the red cross on the Infirmary painted out; `coalport-day/night-8640.png` of 2 Oct). The tiles were re-cut (new revs, so new tile URLs) and the six Coalport stills rebuilt (`pnpm art:build`: 1024 AVIF 218 / 185 KB, 2048 AVIF 507 / 508 KB, 1024 WebP 313 / 319 KB; the committed set is still 8.59 MB). **The still asset ids are kept** (`map.coalport.day`, `map.coalport.night`). §8 Q6's new id exists so that a browser holding the old still under the year-long immutable `/art/` cache gets the new one; nothing has been deployed since the v3 stills went in (the project runs locally until the end), and only `vercel.json` sends that header (`vite dev` and `vite preview` do not), so no browser holds the old still that way. The rule stands from the first deploy on: a master repainted after its stills have shipped needs a new id (or a versioned file name).

**Tiles are AVIF q55** (`scripts/art/tiles.ts`): `format: "avif"` in `tiles.json`; `TileSource.format` and `TilePyramid.format` are `'avif' | 'webp'`; the URL is `<path>/avif_files/<level>/<col>_<row>.avif`; the Vite `/tiles` server sends `image/avif`. sharp's Deep Zoom writer cannot write AVIF tiles, so a pyramid is cut in two passes: dzsave writes lossless PNG tiles (the same geometry, so the self-check is unchanged), then every tile is encoded to AVIF (effort 4, all cores) and its PNG removed. About 20 s per 8,640 px master (about 60 s for Irongate); all 12 in 5.4 min; a second run skips all 12. WebP stays a one-line setting.

*Quality.* Five full-size tiles and three level-13 tiles (Union Hall, the mill, the quays at night, the Fortress, Gazette House by day and night) were compared at 3 × magnification with the master and WebP q75: q45 smears the foliage and the roof texture; q50 softens them a little; **q55 is close to WebP q75** there; lines and windows stay sharp at all three. 4:2:0 chroma saves only 3 %, so sharp's default 4:4:4 is kept.

| Per tile (KB) | WebP q75 | AVIF q45 | AVIF q50 | AVIF q55 |
|---|---|---|---|---|
| Level 14 (full size), 5 tiles | 50–60 | 26–31 | 30–35 | 34–40 |
| Level 13, 3 tiles | 82–89 | 41–47 | 48–54 | 56–62 |

*Pyramids.* Each 8,640 px picture 14.0–16.6 MB (WebP 20.3–25.0), Irongate 31.7 / 28.7 MB (WebP 47.1 / 42.2), the nation 20.3 / 16.9 MB (WebP 30.6 / 24.7). **All 12: 5,714 files, 219 MB** (WebP 324 MB). The old WebP revs are still in `.art-cache/tiles` (git-ignored; deleting them frees about 340 MB).

**R1 re-measured.** A production build behind `vite preview` with `/tiles` from the cache, an API in `DB_MODE=memory`; Chromium, a fresh context and an empty cache per run, a new account whose home is the city. First view = `/city/<id>` until no tile is pending; zoom = pin 1 opened as a player would, until it lands and no tile is pending. KB as transferred, tiles in brackets. "WebP" is the size of the same tiles in the previous WebP q75 pyramid (file bytes), so both columns are the same view.

| Phone 390 × 844, DPR 3 (capped 2) | First view, AVIF | First view, WebP | Zoom to pin 1, AVIF | Zoom, WebP |
|---|---|---|---|---|
| Coalport, map box 661 px tall | **324** (10: levels 9 + 11) | 486 | 749 (12, level 13) | about 1,070 |
| Coalport, map box 705 px tall | 1,266 (26: levels 9 + 12) | 1,788 | 926 (15, level 13) | 1,300 |
| Duskwall | **339** (10: levels 9 + 11) | 502 | 1,415 (24, level 13) | 2,052 |
| Ashford | 1,241 (21: levels 9 + 12) | 1,776 | 719 (12, level 13) | 1,029 |
| **Desktop 1440 × 900, DPR 1** | | | | |
| Coalport | 938 (16: levels 9 + 12) | 1,331 | 1,331 (35, level 14) | 1,991 |
| Duskwall | 943 (16: levels 9 + 12) | 1,358 | 727 (12, level 13) | 1,060 |
| Ashford | 891 (13: levels 9 + 12) | 1,280 | 922 (24, level 14) | 1,397 |

AVIF is **0.67–0.70 × WebP's bytes** for every view. **R1 is met only where the phone's first view lands on level 11** (Duskwall, and Coalport at times: 324–339 KB). It is missed by far where it lands on level 12 (Ashford, and Coalport at times: 1.24–1.27 MB). That comes from review 3, not the format: the at-rest view now covers the box (§11.2), so an upright phone shows most of the picture with the art 520–675 CSS px wide, and the detail level asks for the full capped device pixels (§11.1). Level 11 is 1,080 px across, enough for art up to 540 CSS px wide at DPR 2. Coalport sits on that edge: a 44 px taller map box (the header's election and hint lines come and go) takes the art from 519 to 610 px wide and the first view from 10 tiles to 26. §9.1's 480–500 KB were measured before review 3.

*To meet R1 everywhere* (an architect's and the user's call; not done here): draw the **at-rest** view with the DPR capped at 1.5 (level 11 up to 720 CSS px of art: about 320–350 KB of AVIF for all three cities, at 1.5–1.6 device pixels per CSS pixel at rest), and keep 2 for every zoom, which is where review 3's blur was seen. The other levers are weaker: AVIF q50 saves another 12 % at a visible cost in texture, and a lower cap for zooms brings the blur back.

**Frames and decoding: no AVIF stalls.** The spike's rAF recorder over the zoom to pin 1 (main-thread frames; a gap over 25 ms counts as dropped frames). "Throttled" = 4G and CPU 4 × slower.

| | Unthrottled | Throttled |
|---|---|---|
| WebP q75 | 60 fps, 0 dropped, worst 17 ms | 57–60 fps, 0–11 dropped, worst 17–117 ms, up to 2 long frames |
| AVIF q55 | 57–60 fps, 0–3 dropped, worst 17–33 ms | 55–60 fps, 0–10 dropped, worst 17–100 ms, up to 3 long frames |

The same within noise. Decoding the zoom's tiles with `createImageBitmap`, one at a time: **AVIF 2.6–3.8 ms a tile, WebP 3.5–5.5 ms** (CPU 4 × slower: AVIF 4.2–6.7 ms, WebP 6.1–11.4 ms). Chromium's AV1 decoder is not slower on these 512 px tiles, and `TileLayer`'s `decoding="async"` keeps decoding off the main thread anyway. Every supported browser decodes AVIF (the stills are AVIF already), so the client needed no change beyond the format type.

**Nation pins.** The five cities on `nation-day-9216.png` (user-approved): Irongate 0.52, 0.53 · Ashford 0.12, 0.17 · Duskwall 0.88, 0.25 · Coalport 0.18, 0.80 · Clearwater 0.88, 0.85, in `mapPins.nation` (`id` = the city id, `quarter` 1, as pins.json has them), checked by the content test; the dev viewer shows them on the nation picture.

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

---

## 11. Review 3 changes (developer, 2 Oct 2026)

The user playtested the v3 maps and asked for three things. No rule, number or economy value changes.

**1. Blurry zoom on an upright phone (bug).** Two causes, both fixed in `packages/ui`:
- *The detail level.* `TileLayer` took a level with 85 % of the device pixels the view needed (`MIN_PIXEL_RATIO`). Upright, the frame covers a tall box, so the art is laid out larger and a zoom can land just past a level's edge: Duskwall at 390 × 844 drew level 12 (2,160 px) for 1,244 CSS px of art, 0.87 of the 2,488 device pixels capped at DPR 2 and 0.58 of the phone's real ones, while the same zoom held sideways drew level 13 (1.0 of its real pixels). The level is now `detailLevelFor` (`tiles.ts`): the lowest level with at least the art's on-screen width × min(DPR, 2), the same rule on every screen.
- *The compositor.* The map layer kept `will-change: transform` for good, so Chromium kept rasterising it at the scale it had before the zoom and showed the zoomed view as a stretched bitmap whatever tile level was drawn (measured at 390 × 844, DPR 3: about 30 % less edge detail than the same view repainted). `will-change` is now set only while the map moves or is dragged; once a zoom lands (`ZOOM_MS` + 50) the layer is painted again at its scale.

**2. No dark bands: the map at rest covers the screen.** This replaces review 2's "no free pan" with **"drag only within the quarter, no free zoom"**, at the user's request.
- *The at-rest view* never zooms out past the scale at which the whole picture covers the box (`minScale` in `fitPinsView`), nor so far that two pins' 44 px targets overlap (`PIN_GAP`). If every pin can be clear of the plate, the orders and the dock at or above that floor, the old search finds the view; otherwise `mostPinsClear` searches the covered views from that floor up to 1.5 × and takes the one from which a drag can bring the most pins clear, then the one with the most pins clear at rest, then the lower scale, then the position nearest the pins' centre. (Past 1 × only where a pin is otherwise stuck under the desktop's corner plate, as at 640 × 900, where the plate takes two thirds of the map's width.) `data-fit` is `cover` at every tested size; the blurred backdrop stays only as a safety net.
- *A phone's plate and orders panel* now run edge to edge (no 10 px margin) and are opaque (`data-map-opaque`); the art may stop short under them (`MapInsets.hideTop/hideBottom`), so a pin near the art's top edge (Coalport's Foundry Row, Duskwall's State Archives) comes out below the plate instead of being stuck under it. From 640 px the plate is the corner card as before.
- *Drag at rest:* within `restPanLimits`: the frame grown by `REST_PAN_MARGIN` (10 %) on each side, widened so that every pin can be dragged into the clear part of the box (past the widest block), always within the picture (its edge never shows). Same scale (no wheel, pinch or double-tap zoom). The dragged view is kept when a place closes (until a resize). Keyboard focus on a pin outside the view pans it in, at rest as when zoomed.
- *Zoom numbers unchanged:* a pin's zoom is still 2.5 × the view that would show every pin (the old fitted view), at least 1.6 ×, at most 3 ×.
- *`spreadPins` is gone* (§9.1's deviation): the covered view keeps pins at least `PIN_GAP` apart, so pins sit on their buildings.

**3. The Places list.** A **Places** button (a small pill: top right of the map from 640 px and on a phone held sideways, just above the orders panel on a phone held upright; it steps aside while a place is open) opens `PlacesList` (`packages/ui`): every place of the city view in pin order, each row the pin's number, the name, the location's blurb (at most two lines) and a *Party order* tag where an open order's pin points (the orders list's data). A row closes the list and calls the same `select(id)` as the pin (zoom, then the sheet, `?loc=` set). A bottom sheet on an upright phone, a 360 px panel at the right otherwise; Radix Dialog, named *Places in {City}*, Escape and Close close it, focus returns to the button.

**Tests changed and why:** the review-2 unit test "at rest a drag does not move it" now checks that a drag at rest moves the map at the same scale and that closing a place comes back to it; the QA M2 unit fixtures for "every pin clear in the first view" became "the at-rest view covers the box; every pin is clear at rest or a drag away; drag limits never show past the picture" on six screens; the `spreadPins` tests are removed. In e2e, `map.spec` now requires `data-fit="cover"` at rest at every size (no letterbox branch) and every pin clear at rest or after a drag (`pinsOutOfReach`); pins not clear at rest are opened through the Places list (`openPlace`); `landscape.spec`'s "every pin clear at rest" and `qa.slice2.spec`'s M2 checks became "clear or a drag away"; `qa.spec`'s "review 2: a fixed map" now checks that the wheel does nothing, a drag at rest pans at the same scale, and closing a place comes back to the dragged view; `tiles.spec`'s first test waits out the 150 ms detail settle before reading the at-rest level, and its no-black check allows for the phone's opaque bands. New: `places.spec.ts`, and `tiles.spec.ts` checks the drawn level after a zoom at 390 × 844 DPR 3 and 360 × 640 DPR 2.
