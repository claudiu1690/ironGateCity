---
type: tech
title: Art and Maps Pipeline
aliases: [Art Pipeline, Map Tiles, art:build, art:tiles, Fallback Ladder]
tags: [tech, art, maps]
status: partly built
slice: "1 (pipeline); 2 (kinds, budgets); maps v3 tiles 1–2 Oct; R2 hosting deferred"
gdd: ["§13.5"]
adrs: ["0007", "0015", "0024", "0035", "0076"]
updated: 2026-10-14
---

# Art and Maps Pipeline

## In one paragraph

The game's art is painted outside the repo, in `E:\Projects\ironGateCity Docs\art-direction\`.
Two scripts turn it into web files. `pnpm art:build` makes small **AVIF + WebP stills** of every
image in the art catalogue and commits them under `apps/client/public/art`. `pnpm art:tiles` cuts
each huge map master into a **Deep Zoom pyramid of AVIF tiles** in a git-ignored cache, so a city
map can be zoomed sharply on a phone. Content refers to art only by id. When a result has no art of
its own, the server picks the next best picture by the **fallback ladder**.

## How it works

**Sources** (`IRONGATE_ART_SRC`, default `E:/Projects/ironGateCity Docs/art-direction`):

| Folder | Holds |
|---|---|
| `maps-v3/` | The current map masters, day and night: `<city>-<day|night>-<size>.png` (cities 8,640 px, Irongate 11,520, nation 9,216), `pins/pins.json`, `superseded/` |
| `maps-pen/` | The earlier pen-and-ink maps, day and night |
| `mvp/avatars`, `mvp/items`, `mvp/portraits`, `mvp/scenes` | Faces, items, portraits, scenes |
| `crests/` | Faction crests (SVG and PNG) |
| top level, `style-tests/` | References, posters, style tests |

**The catalogue** (`packages/content/src/data/art.ts`): every image has an id, a kind (`map`,
`scene`, `portrait`, `avatar`, `item`, `vector`), a source path, output widths, a crop/focus and alt
text. The loader checks every referenced id exists with the right kind ([[Content Package]]).
Map stills come from `maps-v3/${city}-${time}-${size}.png`.

**`pnpm art:build` / `art:check`** (`scripts/art/build.ts`, sharp):
- Writes `apps/client/public/art/<id>-<width>.avif|webp` (vectors copied as `<id>.svg` after a
  safety check: no script, event handler, `foreignObject` or external reference).
- Skips unchanged outputs (`apps/client/public/art/.build.json` holds source hash + settings).
- Per-file budgets by kind and width; over budget, quality steps down to a floor (AVIF 40 / WebP 60;
  painted maps AVIF 35 / WebP 44); still over → the build fails.
- A total cap for the committed set (`TOTAL_BUDGET`, raised per slice with a measured figure).
- `art:check` needs no sources: files present, within budget, SVGs safe. CI runs it.

**`pnpm art:tiles`** (`scripts/art/tiles.ts`, ADR 0024 revised for maps v3):
- Cuts every master in `maps-v3` into `.art-cache/tiles/<assetId>/<rev>/avif.dzi` +
  `avif_files/<level>/<col>_<row>.avif`. `rev` = first 8 hex of sha256(master + settings), so a new
  export gets a new path and an immutable cache never serves a stale tile.
- sharp's `dzsave` writes PNG tiles, then each is encoded to AVIF q55 in parallel.
- Merges the entry into `packages/content/src/data/tiles.json` (size, tile size 512, levels,
  `rev`, tile count, bytes). `--check` confirms every manifest `rev` is in the cache.
- `.art-cache/` is git-ignored (hundreds of MB).

**Serving.** Vite serves `public/art`; in dev and preview a plugin in
`apps/client/vite.config.ts` serves `.art-cache/tiles` at `/tiles`. The client's `tilesOrigin`
(`VITE_TILES_ORIGIN`, default `/tiles` in dev, empty in production) decides whether tiles load at
all; with none, the map shows the stills. `vercel.json` sets a one-year immutable cache on `/art/*`.

**On screen** (`packages/ui`): `Picture` builds `<picture>` with AVIF then WebP `srcset`;
`CityMap` + `TileLayer` place `<img>` tiles in a layer scaled by one CSS transform (a one-tile
underlay plus the detail level of where the view is going); `CloudLayer` adds the map atmosphere.
The server's views carry `AssetView { id, width, height, widths }`. Pins come from
`content/src/data/mapPins.ts`. Dev builds have `/dev/maps` (`MapViewer`) to check every tiled
picture with every pin ([[Quarters and the Map]]).

**The fallback ladder** ([[GDD#13.5 Art for missions: the fallback ladder (new)|GDD §13.5]]):
- Tier-1 result: `pickArt()` (`apps/server/src/services/art.ts`) — a scene bound to the place's kind
  (a `faction-hq` by its party), else a **map crop** of the city by day or night centred on the place
  (`ResultArt { rung: 'scene' | 'map-crop' }`).
- Mission result: `missionArt()` (`missionResult.ts`) — the mission's own card, else its type's card,
  else `pickArt()`.
- Story art (the opening, Ambition chapters) is bound directly by the story content.

## Key files

- `scripts/art/build.ts`, `scripts/art/tiles.ts`
- `packages/content/src/data/art.ts`, `mapPins.ts`, `tiles.json`, `src/maps.ts`
- `apps/server/src/services/art.ts` (`pickArt`), `missionResult.ts` (`missionArt`)
- `packages/ui/src/components/Picture.tsx`, `CityMap.tsx`, `TileLayer.tsx`, `CloudLayer.tsx`, `src/tiles.ts`
- `apps/client/vite.config.ts` (tiles plugin), `apps/client/vercel.json`

## Rules to follow

- Reference art by catalogue id only; add the id to `art.ts` first.
- Never commit sources or tiles; commit only the built stills.
- Run `pnpm art:build` after adding art, `pnpm art:check` before finishing; `pnpm art:tiles` after a new map master.
- Keep the stills working: they are the first paint, the fallback and the production path until tiles are hosted.
- No real-world extremist symbols in any art (`CLAUDE.md` design rule 6).

## Decisions (ADRs)

- [[adr/0007-web-art-pipeline|ADR 0007]] — catalogue as content; one sharp script; committed AVIF/WebP.
- [[adr/0015-art-pipeline-slice-2-kinds-and-budgets|ADR 0015]] — avatar, item and vector kinds; focus point; budgets per set and per first session (≤ 1 MB of art from sign-up to first result).
- [[adr/0024-tiled-maps-and-quarters|ADR 0024]] — Deep Zoom tiles in our own `CityMap`. Revised for maps v3. **Decision 5, tiles on Cloudflare R2, is accepted but not built**: hosting waits for the end of the project.
- [[adr/0035-home-quarters-outlines-and-overview|ADR 0035]], [[adr/0076-home-cities-one-map-capital-districts-tile-the-picture|ADR 0076]] — quarters and one map per home city.

> [!warning] Drift
> - `README.md` and the comment on `art:check` say the whole committed set is "at most 12 MB".
>   The code's cap is `TOTAL_BUDGET = 19.85 MB` (`scripts/art/build.ts`), raised slice by slice.
> - `CLAUDE.md` names `maps-pen\` as the final maps. The game now builds every map from
>   `maps-v3\` (`art.ts`, `tiles.ts`).
> - GDD §13.5 numbers the rungs 1 story · 2 place scene · 3 map crop · 4 mission-type card.
>   `missionArt()` tries the mission card **before** the place scene and map crop (it calls it
>   "rung 4"). *Inference:* either the GDD's numbers are not a priority order, or the code's order
>   differs — worth a designer check.

## Related

[[Quarters and the Map]] · [[Content Package]] · [[Game Client]] · [[The Result Modal]] ·
[[Dev Panel and Local Setup]]
