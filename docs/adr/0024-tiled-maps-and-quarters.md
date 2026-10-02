# ADR 0024 — Big maps: Deep Zoom tiles in our own `CityMap`, quarters as separate pictures, tiles on Cloudflare R2

**Status:** accepted as revised for maps v3 (see "Revision (maps v3)" at the end, which overrides decisions 2, 3, 4 and 6; R2 hosting, decision 5, is accepted but not built yet) · **Date:** 2026-10-01 · Revised 2026-10-01

The spike's code, measurement scripts and data (`apps/client/spike/`, `docs/tech/spike-big-maps*.md|data`, the map lab) stay on the branch `spike/big-maps` and are not merged; paths to them below refer to that branch.

## Context

The user wants much bigger cities ("more city to play in", growing with more places at later levels) and
more distance between cities. The plan is a map in levels, each its own picture: **nation → city
overview → quarter → place**, with smooth transitions between them.

Today (ADR 0007, 0015) a city map is one picture: the art is served as one AVIF/WebP file at 1,280 or
2,560 px, committed to git, and `CityMap` (review 2) shows it fitted to its pins, with no free pan or
zoom. A tap zooms smoothly into a pin (one CSS transform, 500 ms), the pins are DOM buttons that never
remount, and the art never shows black past its edge. The art brief v2 (`docs/art/map-brief.md`) already
moves every map to a 6,144 px square. Bigger pictures break the single-file model:

- a 2,560 px file of a 14,336 px picture is 5.6 × downsampled, so a zoomed place is blurry;
- a 4,096 px single file of the fake big city is **1.65 MB AVIF**, more than the whole first-session
  budget (ADR 0015: ≤ 1 MB of art on a phone from sign-up to the first result);
- the art can no longer live in git (see the storage numbers below).

The spike built the lab at `/dev/map-lab` (dev only, behind the test-hooks guard; how to run it:
`docs/tech/spike-big-maps.md`) and measured it. The art is fake: today's maps mirrored and upscaled to
14,336 px squares, so the tiles carry real pen-and-ink detail.

## Options

**Renderer**

1. **OpenSeadragon 6** (the standard deep-zoom viewer): canvas or WebGL drawing, its own spring
   animation, DOM overlays it repositions every frame, nested pictures as several tiled images in one
   world.
2. **A tile layer inside our own `CityMap`** (`TileLayer.tsx`, about 200 lines): plain `<img>` tiles
   positioned in the layer `CityMap` already scales with one CSS transform. Two levels at once: a
   one-tile underlay (448 px, shared with the blurred backdrop) and the detail level whose pixels match
   the view the map is *going to* (DPR capped at 2), so a zoom fetches its destination from its first
   frame. The previous detail stays until the new one has loaded.

**Navigation between levels**: a **zoom-through** (the OpenSeadragon variant nests the quarter as a second tiled image in its world and fades it in once the zoom lands). The parent zooms until the plate
covers the screen while the child picture is already mounted, invisible, exactly where the plate will
land (so its tiles load during the zoom). The parent lands, the child fades in over it (180 ms; aligned,
so the eye sees one picture), then settles to its own fitted view with its own pins. Back runs it in
reverse. The parent's tiles are frozen while it zooms through, since the child covers them a moment
later.

**Hosting** of the tiles: Vercel static (with the client), an object store behind a CDN (Cloudflare
R2, or S3 + CloudFront), or Git LFS.

## Measurements

Method: `apps/client/spike/measure-maps.ts`, Playwright Chromium 1.63 against a production build
(`vite preview`, HTTP/1.1, so at most 6 connections; a CDN would serve HTTP/2 or 3), the real GPU
(D3D11 through ANGLE), a fresh context and an empty cache per run. Throttling: Chrome DevTools
presets, **Fast 3G** (562.5 ms RTT, 1.44 Mbit/s) and **4G** (165 ms RTT, 8.1 Mbit/s); CPU 4 × slower on
phone sizes, none on desktop. Screens: 375 × 812 at DPR 3, 360 × 640 at DPR 2, both in landscape, and
1440 × 900 at DPR 1.

Engines: **tiles** (our layer, the fake 14,336 px city and quarter), **osd** (OpenSeadragon, same
files), **single** (today's Coalport as today's 2,560 px AVIF), **native** (our layer on today's Coalport
tiled at its own 5,056 px: the like-for-like comparison with *single*).

Bytes are art bytes as transferred (tiles or the map file), with the number of files. "fps / dropped" is
main-thread `requestAnimationFrame` frames over the transition (a gap over 25 ms counts as dropped
frames). Decoded MB is the estimated decoded size of the images in the page (w × h × 4; OpenSeadragon's
tile cache counted the same way); it double-counts the single map, which is in the page twice (the map
and its blurred backdrop share one decode).

**1. Bytes and tiles per view** (art KB transferred, files in brackets; the same on both networks. Decoded: estimated MB of decoded images at the city view / at the place)

| Screen | Renderer | First city view | Quarter (zoom-through) | Zoom to a place | Back to the city | Nation → city (cold) | Decoded MB |
|---|---|---|---|---|---|---|---|
| phone-375 | single (today, 2,560 px file) | 432 (1) | – | 0 (0) | – | – | 35.2 / 35.2 |
| phone-375 | tiles, today's Coalport (5,056 px) | 127 (5) | – | 241 (18) | – | – | 4 / 18.4 |
| phone-375 | tiles, big city + quarter (14,336 px) | 478 (17) | 333 (13) | 411 (24) | 0 | 478 | 14.5 / 27 |
| phone-375 | OpenSeadragon, big city + quarter | 534 (18) | 797 (30) | 398 (32) | 165 | – | 17.8 / 81.8 |
| phone-360 | single (today, 2,560 px file) | 432 (1) | – | 0 (0) | – | – | 35.2 / 35.2 |
| phone-360 | tiles, today's Coalport (5,056 px) | 151 (7) | – | 329 (24) | – | – | 4.8 / 24.3 |
| phone-360 | tiles, big city + quarter (14,336 px) | 478 (17) | 333 (13) | 287 (16) | 0 | 478 | 14.5 / 18.5 |
| phone-360 | OpenSeadragon, big city + quarter | 534 (18) | 797 (30) | 144 (8) | 51 | – | 17.8 / 56.6 |
| phone-375-land | single (today, 2,560 px file) | 432 (1) | – | 0 (0) | – | – | 31.8 / 31.8 |
| phone-375-land | tiles, today's Coalport (5,056 px) | 151 (7) | – | 290 (12) | – | – | 4.8 / 13 |
| phone-375-land | tiles, big city + quarter (14,336 px) | 151 (5) | 427 (17) | 333 (18) | 0 | 538 | 4.8 / 20.6 |
| phone-375-land | OpenSeadragon, big city + quarter | 538 (18) | fails: its cover-fit home view leaves the plate pin off screen / under the bar | | | | |
| phone-360-land | single (today, 2,560 px file) | 432 (1) | – | 0 (0) | – | – | 19.8 / 19.8 |
| phone-360-land | tiles, today's Coalport (5,056 px) | 151 (7) | – | 290 (12) | – | – | 4.8 / 13 |
| phone-360-land | tiles, big city + quarter (14,336 px) | 151 (5) | 427 (17) | 0 (0) | 0 | 538 | 4.8 / 12.7 |
| phone-360-land | OpenSeadragon, big city + quarter | 538 (18) | fails: its cover-fit home view leaves the plate pin off screen / under the bar | | | | |
| desktop | single (today, 2,560 px file) | 432 (1) | – | 0 (0) | – | – | 35.2 / 35.2 |
| desktop | tiles, today's Coalport (5,056 px) | 151 (7) | – | 292 (20) | – | – | 4.8 / 21.7 |
| desktop | tiles, big city + quarter (14,336 px) | 478 (17) | 373 (17) | 243 (12) | 0 | 478 | 14.5 / 14.3 |
| desktop | OpenSeadragon, big city + quarter | 538 (18) | 772 (31) | 576 (42) | 118 | – | 17.8 / 93.3 |

**2. Time to the first city view** (ms from navigation: first art file received / view complete, every tile in; includes the app's 192 KB of JS, OpenSeadragon 281 KB)

| Screen | Network | single | tiles, today's Coalport | tiles, big city | OpenSeadragon, big city |
|---|---|---|---|---|---|
| phone-375 | Fast 3G | 7096 / 7106 | 4596 / 5241 | 4913 / 7771 | 5443 / 9774 |
| phone-375 | 4G | 1823 / 1840 | 1370 / 1512 | 1425 / 2088 | 1684 / 2761 |
| phone-360 | Fast 3G | 7069 / 7085 | 4607 / 5511 | 4954 / 7797 | 5407 / 9857 |
| phone-360 | 4G | 1828 / 1840 | 1347 / 1609 | 1451 / 2130 | 1647 / 2651 |
| phone-375-land | Fast 3G | 7123 / 7127 | 4588 / 5478 | 5050 / 5327 | 5384 / 9857 |
| phone-375-land | 4G | 1819 / 1826 | 1396 / 1640 | 1409 / 1513 | 1665 / 2703 |
| phone-360-land | Fast 3G | 7091 / 7096 | 4613 / 5522 | 5032 / 5306 | 5394 / 9793 |
| phone-360-land | 4G | 1820 / 1826 | 1402 / 1663 | 1478 / 1546 | 1658 / 2712 |
| desktop | Fast 3G | 6975 / 6991 | 4475 / 5745 | 4777 / 7695 | 5278 / 9534 |
| desktop | 4G | 1736 / 1751 | 1262 / 1588 | 1323 / 2007 | 1536 / 2566 |

**3. Frames during the transitions** (main-thread fps / dropped frames, 4G; phones with CPU 4 × slower)

| Screen | Renderer | GPU: quarter | GPU: place | GPU: back | Software (SwiftShader): quarter | Software: place |
|---|---|---|---|---|---|---|
| phone-375 | single (today, 2,560 px file) | – | 60 / 0 | – | – | 60 / 0 |
| phone-375 | tiles, today's Coalport (5,056 px) | – | 60 / 0 | – | – | 60 / 0 |
| phone-375 | tiles, big city + quarter (14,336 px) | 60 / 0 | 60 / 0 | 60 / 0 | 60 / 0 | 60 / 0 |
| phone-375 | OpenSeadragon, big city + quarter | 59 / 1 | 60 / 0 | 56.1 / 3 | 28.1 / 43 | 24.3 / 25 |
| phone-360 | single (today, 2,560 px file) | – | 60 / 0 | – | – | 60 / 0 |
| phone-360 | tiles, today's Coalport (5,056 px) | – | 60 / 0 | – | – | 60 / 0 |
| phone-360 | tiles, big city + quarter (14,336 px) | 60 / 0 | 60 / 0 | 60 / 0 | 60 / 0 | 60 / 0 |
| phone-360 | OpenSeadragon, big city + quarter | 59 / 1 | 60 / 0 | 56.1 / 3 | 34.2 / 31 | 31.6 / 18 |
| desktop | single (today, 2,560 px file) | – | 60 / 0 | – | – | 60 / 0 |
| desktop | tiles, today's Coalport (5,056 px) | – | 60 / 0 | – | – | 60 / 0 |
| desktop | tiles, big city + quarter (14,336 px) | 60 / 0 | 60 / 0 | 60 / 0 | 60 / 0 | 60 / 0 |
| desktop | OpenSeadragon, big city + quarter | 60 / 0 | 60 / 0 | 58.7 / 1 | 38.3 / 25 | 34.5 / 17 |

## Storage

Measured pyramids (512 px tiles, 1 px overlap, every level down to 1 px; AVIF q50, WebP q72):

| Pyramid | Size (px) | MP | Tiles per format | AVIF | WebP | AVIF KB per MP |
|---|---|---|---|---|---|---|
| Fake big city, day (today's Coalport mirrored, upscaled ×1.42) | 14,336² | 205.5 | 1,059 | 12.5 MB | 20.3 MB | 62 |
| Fake big city, night | 14,336² | 205.5 | 1,059 | 10.5 MB | 15.2 MB | 52 |
| Fake quarter, day (a quarter of the city, upscaled ×2) | 14,336² | 205.5 | 1,059 | 7.0 MB | 11.0 MB | 35 |
| Fake quarter, night | 14,336² | 205.5 | 1,059 | 6.0 MB | 8.6 MB | 30 |
| Today's Coalport, day (native, no upscale) | 5,056 × 3,392 | 17.1 | 108 | 1.42 MB | 2.38 MB | 85 |
| Today's Coalport, night | 5,056 × 3,392 | 17.1 | 108 | 1.17 MB | 1.76 MB | 70 |
| Nation, day (native) | 5,504 × 3,072 | 16.9 | 102 | 1.71 MB | 2.75 MB | 104 |
| Nation, night | 5,504 × 3,072 | 16.9 | 102 | 1.29 MB | 1.81 MB | 78 |

For comparison, the fake big city as one file: **1.65 MB** AVIF at 4,096 px, 0.81 MB at 2,560 px.
Building a 14,336 px pyramid in both formats took 80–135 s on a 28-core machine. Upscaled art
compresses better than genuinely detailed art: day and night together cost 65 KB/MP (upscaled ×2–3),
112 KB/MP (upscaled ×1.4, as the brief's ×1.5) and 155–178 KB/MP (native detail). WebP costs 1.45–1.7 ×
AVIF.

Extrapolated to every map:

| Inventory | Pictures (× day and night) | Megapixels | AVIF | WebP | Files per format |
|---|---|---|---|---|---|
| **A.** The brief v2: every map a 6,144 px square (4 cities × overview + 3 quarters, Irongate overview + 5 districts, the nation) | 23 (46 images) | 868 | **≈ 95 MB** (112 KB/MP, upscaled ×1.5 art) | ≈ 147 MB | 9,338 |
| **B.** Big quarters: the 17 quarters and districts at 14,336 px, the 5 overviews and the nation at 6,144 px | 23 (46 images) | 3,720 | **≈ 236–563 MB** (65 KB/MP upscaled ×3 … 155 KB/MP genuine detail) | ≈ 366–873 MB | 38,442 |

Today's whole committed art set is under 12 MB (ADR 0015). Either inventory is 10–100 × that, and tens
of thousands of files.

**The quarters design that landed on `slice-0` during the spike** (`b9623a9`: GDD §14.13,
`docs/design/city-quarters.md`, the revised `docs/art/map-brief.md`) fits these findings.
- **Sizes.** Every overview and every quarter is a 4096 → 6144 square, which is inventory A.
- **First view.** A city opens into the quarter you are in, which keeps the first session on one
  quarter view (see Consequences).
- **Plates.** The overview and the nation map carry plates, with no pin zoom.
- **One difference for the zoom-through.** In that design a plate's **footprint is the quarter map's
  central half** (x and y 0.25–0.75), not the whole quarter as in the lab. The child is then placed
  so that its central half, not its whole art, lands on the footprint: `enterFrom` and `exitTo` get
  the footprint rect grown by 50 % on every side (the same `placeOn` maths). The brief's check 14
  (structures within 5 % of the width) is what keeps the cross-fade reading as one town.

## Decision

1. **Renderer: our own tile layer inside `CityMap`, not OpenSeadragon.** `CityMap` gains an optional
   `tiles` source; with it, `TileLayer` draws the art instead of the single `<picture>`. Everything
   review 2 settled stays as it is: the fitted view that keeps pins clear of the plate, the dock and the
   panel, no free pan or zoom, the 500 ms eased zoom as **one CSS transform**, pins as React buttons
   that are never remounted (checked in every run), reduced motion, keyboard focus. OpenSeadragon has
   no such fit: in landscape its cover-fit view left the plate pin off screen or under the bar, and
   those runs failed. Measured against OpenSeadragon on the same files:
   - **less than half the bytes** for the zoom-through (333–427 KB against 754–805 KB), and less or
     similar for a place;
   - **60 fps with no dropped frames everywhere**, including software rendering with a 4 × slower
     CPU, where OpenSeadragon falls to 24–38 fps (it redraws a canvas from the main thread every frame);
   - **about 2 KB of code against 90.7 KB gzipped** (`TileLayer` is 1.3 KB gzipped, plus the new `CityMap` props);
   - no CORS needed (OpenSeadragon's WebGL drawer needs it on the tile origin).

   We own about 200 lines (level choice, seams, the underlay) and give up nothing we want: pinch-zoom
   and free pan are what review 2 removed.
2. **Levels are separate pictures, joined by the zoom-through**: `focus`, then `enterFrom` with
   `hold`, a fade, and a settle; back is `exitTo`, a fade, and the parent settling. The child's tiles
   are fetched during the parent's zoom, and the parent's tiles are frozen while it zooms through. A
   quarter's art should be drawn as a more detailed version of its plate on the overview, so the
   180 ms fade is invisible (as in the lab). Where two levels are different drawings (nation → city),
   the fade is a short dissolve.
3. **Size each picture for what the zoom shows: about 6,144 px square (the brief v2 size), and get
   "more city" from more pictures, not bigger ones.** Under today's zoom rules (the fitted view, a
   place at most 3 × cover, never past native) and DPR capped at 2, no screen ever fetched more than
   level 12 (3,584 px) of a 14,336 px picture. Its top two levels, about 94 % of its tiles, were never
   requested. A quarter at 6,144 px already zooms sharper than today's map, and each new quarter or
   district is a new picture. Larger pictures are only worth it if the game designer raises the zoom
   cap (a GDD change; not made here).
4. **Tiles:**
   - Deep Zoom layout, 512 px, 1 px overlap, AVIF (q 50) and WebP (q 72), every level;
   - DPR capped at 2 (`TILE_MAX_DPR`);
   - a one-tile underlay (≤ 512 px, also the blurred backdrop), so nothing past the loaded detail is
     ever black;
   - the detail level follows the view the map is going to.
5. **Hosting: Cloudflare R2 behind a Cloudflare custom domain (e.g. `tiles.<game domain>`), with
   immutable versioned paths.** Not Vercel static, not Git LFS (see Consequences).
6. **Publishing:** the art pipeline grows a `tiled-map` kind.
   - **Build.** `pnpm art:build` (`scripts/art/build.ts`) cuts each tiled map's pyramid with this
     spike's tiler (sharp's own `.tile()` cannot write AVIF) into a git-ignored cache,
     `.art-cache/tiles/<id>/<hash>/{avif,webp}_files/…`. `<hash>` is the first 8 hex of the source
     hash plus the settings, so a re-export gets a new path and caches never go stale.
   - **Manifest.** It writes a small committed manifest, `packages/content/src/data/tiles.json`, with
     per id `width`, `height`, `tileSize`, `overlap`, `maxLevel`, `formats`, `hash` and byte totals.
     Content refers to maps by id as today; the server's views carry the manifest entry as a
     `TilePyramid` without `base`, and the client prefixes `VITE_TILES_ORIGIN`.
   - **Publish.** `pnpm art:publish` uploads every pyramid whose `tiles/<id>/<hash>/` prefix is not in
     the bucket yet:
     - through R2's S3 API (`@aws-sdk/client-s3`), with credentials from the environment, never
       committed;
     - with `Cache-Control: public, max-age=31536000, immutable` and the right `Content-Type`;
     - **before** the commit that points at them is deployed.

     Old hashes are kept for a few releases (rollback), then pruned.
   - **Check.** `pnpm art:check` (CI) checks the manifest against the catalogue and fetches the
     top-left tile of each pyramid from the tile origin.
   - **Dev.** Without the art folder or the bucket, the Vite middleware from the spike serves the
     cache, and `VITE_TILES_ORIGIN` defaults to it.

## Consequences

- **First-session budget (ADR 0015, ≤ 1 MB of art on a phone).** Today's Coalport tiled costs
  **127–151 KB** for its first view against 432 KB as one file, and is complete 1.6–1.9 s sooner on
  Fast 3G. Tiling alone gives back about 300 KB of the budget. But a dense big overview (478 KB) plus
  entering a quarter (333 KB) is 811 KB, over budget with the avatars, portraits and scenes. So the
  first session should **open straight on the home quarter** (one view, 330–430 KB), not on the
  overview; the overview is for later sessions.
- **Storage lives outside git.** Inventory A (every map at 6,144 px) is about 95 MB AVIF + 147 MB
  WebP in about 18,700 files; inventory B is up to about 1.4 GB in 77,000 files. Today's committed set
  is under 12 MB.
  - **Vercel static** would ship tens of thousands of files with every deploy and tie art releases to
    code releases. It would still need the files from somewhere other than git. Vercel's own CLI docs
    offer an archive mode "to avoid file limit rate issues".
  - **Git LFS** (GitHub Free: 10 GiB storage and 10 GiB bandwidth a month) spends bandwidth on every
    clone, CI run and Vercel build, keeps every re-export forever, and Vercel must be told to fetch it.
  - **R2** costs $0.015 per GB-month with no egress fees. Each month 10 GB-month of storage, 1 M writes
    and 10 M reads are free, so both inventories cost effectively nothing. A full publish of
    inventory B is about 77,000 writes, and behind Cloudflare's cache most reads never reach the
    bucket. S3 + CloudFront works the same way at a higher price (egress).
- **New infrastructure:**
  - an R2 bucket and a custom domain on Cloudflare;
  - publish credentials in CI or on the art machine;
  - the tile origin in the client's CSP `img-src`. Tiles are plain `<img>`s, so no CORS is needed.
- **The committed single map files** (`/art/map.*-1280|2560`) go once a city's map is tiled, so the
  git art set shrinks.
- **Content gains plates:** a picture's children, each with the child picture's id, its region on the
  parent as fractions, and its unlock rule. The game designer decides the unlock rules; locked plates
  show as teasers.
- **Pins must sit in a compact core of each picture** (brief v2 §2). The lab's placeholder pins span
  half the art, so on a portrait phone the city and the quarter fall back to the letterbox (the blurred
  backdrop, never black).
- **Memory:** 13–27 MB of decoded tiles at a place on our layer, against 57–93 MB for OpenSeadragon,
  whose cache keeps every tile it has drawn. The JS heap stays at 4–7 MB either way.
- **Risks and limits of these numbers:**
  - **The art is fake.** Mirrored, upscaled art compresses about 2 × better than genuine detail, so
    real pyramids and views may cost up to 2 × the bytes. Re-measure with Coalport v2 once it is
    approved.
  - **The GPU in the runs is a desktop card,** and CPU throttling slows the main thread only. Phone
    compositors are weaker, although the software-rendered pass (SwiftShader) still held 60 fps on our
    layer.
  - **The rAF counter sees main-thread frames only.** The filmstrip (CDP screencast) shows compositor
    frames. It was checked by eye, and every frame of our transitions was scored for near-black
    pixels: at most 0.3 % of the map area, about what the ink linework itself gives.
  - **The preview server is HTTP/1.1** (6 connections). A CDN on HTTP/2 or 3 fetches the 13–24 tiles
    of a view faster than measured.
  - **A day/night flip loads both sets of tiles** for the 700 ms crossfade.
  - **DPR is capped at 2:** slightly softer on 3 × phones, for 2.25 × fewer bytes.
  - **Not built in the spike:**
    - reduced motion for the zoom-through (it should cut, not fade);
    - keyboard focus moving into the child picture;
    - handling a tile that fails to load (the underlay shows meanwhile).

## Revision (maps v3), 1 Oct 2026

**Context.** The user approved new map art: **one big painted picture per city**, holding all its quarters (8,640 px squares; Irongate 11,520 px, with all five districts and a spare band for future districts), and the nation at 9,216 px, day and night. The masters are 200–390 MB PNGs outside the repository. Day and night line up to within about half a building. Pins for every current and future place are in `maps-v3/pins/pins.json`. That overtakes decisions 2 and 3 (separate quarter pictures at about 6,144 px) and the quarters design's separate-image model (GDD Appendix C #39 now goes the stitched way). Design: `docs/design/maps-v3-integration.md`.

**Decisions, replacing the ones named:**

- **(2) One picture per city; a quarter or district is a frame.** The frame is a rectangle of fractions in content (`Quarter.frame`, and from slice 4 `District.frame`). `CityMap`'s scale 1 becomes "the frame covers the box", and fit, zoom and the review-2 numbers are unchanged on top of it. A zoomed drag is bounded to the frame grown by 25 %, so "no free pan" holds on a picture much larger than the screen. The zoom-through between pictures is kept for nation → city only and **deferred to slice 4**. It is not built now.
- **(3) Sizes are what the user approved** (8,640 / 11,520 / 9,216). Because the fitted view is now a frame, not the whole picture, a zoom into a place does reach the top level. The spike's finding that the top two levels go unused applied only to whole-picture views.
- **(4) Tiles are WebP only** (quality 75, 512 px, 1 px overlap, every level down to 1 px), cut by sharp's native Deep Zoom writer (libvips `dzsave`, streaming). This replaces AVIF + WebP from the hand tiler. The reasons: half the files and build time, no whole-master raw buffer, and universal decode for plain `<img>` tiles. The cost is about 1.5× AVIF bytes per view, to be measured. AVIF comes back only if the phone first-view target (≤ 450 KB) is missed. The underlay tile, the detail level for the destination view, and the DPR cap of 2 stay as decided.
  - *Amended 2 Oct 2026:* the target was missed, so the tiles are **AVIF q55** (one format still, WebP no longer cut): dzsave writes PNG tiles, then each is encoded to AVIF. About 0.68 × WebP's bytes per view, no decode stalls measured. Figures and the remaining R1 gap in `docs/design/maps-v3-integration.md` §9.2.
- **(6) Publishing:** a separate `pnpm art:tiles` (not a `tiled-map` kind in `art:build`) writes `.art-cache/tiles/<assetId>/<rev>/webp_files/…` (git-ignored; `rev` is a hash of the master plus the settings) and the committed manifest `packages/content/src/data/tiles.json`. `AssetView.tiles` carries the entry without an origin, and the client prefixes `VITE_TILES_ORIGIN`. `art:publish` comes with the R2 mini-slice.
- **Stills stay as the fallback and first paint:** committed AVIF/WebP of the same art at 1024 and 2048 px. They are used when no tile origin is set (production until R2 exists), in unit tests, and when an underlay tile fails at runtime (`CityMap` switches for the rest of its mount).
- **(5) Hosting on Cloudflare R2 is unchanged but waits for the user's account.** Until then, dev and preview serve `.art-cache/tiles` at `/tiles` through a Vite middleware, and production shows the stills.

**Consequences.**
- **Storage:** about 5,700 tiles, 150–260 MB for all 12 pictures (estimate; measured figures go in the design's §9). The committed stills replace the pen-and-ink map files at about the same bytes, so the 12 MB set cap holds.
- **Production before R2** shows the v3 art capped at the 2048 still's resolution when zoomed. This is a known, temporary step down in sharpness, not in content.
- **The first-session budget** (ADR 0015, ≤ 1 MB on a phone) must count tile bytes once tiles are live.
- **Re-exported masters** get new tile paths automatically. A re-exported **still** keeps its URL under the year-long immutable `/art/` cache, so it needs a new asset id.
- **Content** gains `City.quarters` (first quarter only for now), `Location.quarterId`, the tiles manifest and a survey of every pin (`mapPins.ts`, not game content). No stored document depends on map coordinates, so there is no migration.
