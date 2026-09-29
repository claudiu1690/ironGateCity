# ADR 0007 — Web art: a committed sharp script turns the source art into AVIF/WebP at fixed widths

**Status:** accepted (slice 1) · **Date:** 2026-09-29

## Context

Slice 1 is the first slice with art: Coalport's detailed map by day and by night, the portrait of the
party secretary (Petra Holm, `mvp/portraits/holm.png`), and the scenes for the result modal's two
locations that have one (`union-hq` for the Union Hall, `bar-anchor` for The Anchor). The sources live outside the repository in
`E:\Projects\ironGateCity Docs\art-direction\` and are print-sized: the maps are 5056 × 3392 PNGs of
28–34 MB each (the day map has an alpha channel), scenes are 2688 × 1520 PNGs of ~6 MB, portraits
880 × 1168 PNGs of ~1.8 MB. None of this can be served to a phone.

A test encode of the Coalport maps (flattened onto paper, Lanczos resize) gave:

| | 1280 w AVIF | 1280 w WebP | 2560 w AVIF | 2560 w WebP |
|---|---|---|---|---|
| Coalport day | 158 KB | 232 KB | 427 KB | 641 KB |
| Coalport night | 123 KB | 168 KB | 347 KB | 462 KB |

Scenes at 1280 w: ~85 KB AVIF / ~125 KB WebP. Portraits at 512 w: ~30 KB / ~41 KB.

## Decision

- **Catalogue as content.** Every image the game references has an id in
  `packages/content/src/data/art.ts` (Zod-validated): `id`, `kind` (`map` | `scene` | `portrait`),
  `source` (path relative to the art folder), output `widths`, output aspect/crop, `alt` text and, for
  maps, the flatten colour. Content references art only by id (a city's `map.day`/`map.night`, an
  NPC's `portrait`, a scene bound to a location kind), and the loader checks every id exists.
- **One script.** `scripts/art/build.ts` at the repository root, run with `pnpm art:build`, uses
  **`sharp`** (new root dev dependency; it is the standard libvips binding with prebuilt binaries for
  Windows, Linux and macOS; add it to `pnpm.onlyBuiltDependencies` if pnpm reports its install script
  as ignored). It reads sources from `IRONGATE_ART_SRC`
  (default `E:/Projects/ironGateCity Docs/art-direction`), flattens alpha onto paper `#EFE6D2`,
  resizes with Lanczos, and writes `apps/client/public/art/<id>-<width>.avif` and `.webp`.
  It is idempotent: it skips an output whose recorded source hash and settings are unchanged
  (`apps/client/public/art/.build.json`).
- **Widths:** maps 1280 and 2560; scenes 640 and 1280; portraits 256 and 512.
- **Budgets, enforced by the script:** per file, maps ≤ 600 KB (AVIF) / 850 KB (WebP) at 2560 and
  ≤ 220 / 320 KB at 1280; scenes ≤ 150 / 200 KB at 1280; portraits ≤ 45 / 60 KB at 512. When a file is
  over budget the script lowers quality in steps to a floor (AVIF q 40, WebP q 60) and fails if it is
  still over. Slice 1's whole `public/art` stays under **5 MB**.
- **What is committed:** the script, the catalogue and the **generated** AVIF/WebP files. The sources
  are **not** committed (they are outside the repo and too large); CI and Vercel never need them.
- **Serving:** Vite copies `public/art` as-is; Vercel serves it from its CDN with long cache headers
  (`/art/*` → `Cache-Control: public, max-age=31536000, immutable`; a changed image gets a new id
  suffix, e.g. `map.coalport.day.v2`). The server's views carry `AssetView { id, width, height,
  widths }`; the client builds `<picture>` with AVIF then WebP `srcset`s. No image CDN, no LFS.

## Consequences

- Deploys and CI are independent of the 500 MB art folder; only someone regenerating art needs it.
- Git grows by about 3 MB per city (both maps) plus small scenes and portraits: roughly 20–30 MB for
  the MVP. Acceptable without LFS; revisit if art is re-exported often (each re-export adds history).
- `sharp` has a native binary; it is a dev dependency of the repository root only, so neither the
  server image nor the client bundle carries it.
- Map crops for the result modal (§13.5 rung 3) use the same map files with CSS positioning; no
  per-location crops are generated.
