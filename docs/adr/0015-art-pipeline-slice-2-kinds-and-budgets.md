# ADR 0015 — Art pipeline for slice 2: avatar, item and vector kinds, a focus point, and budgets per set and per first session

**Status:** accepted (slice 2; extends ADR 0007) · **Date:** 2026-09-29

## Context

ADR 0007 turns print-sized sources into committed AVIF/WebP files for three kinds (`map`, `scene`, `portrait`)
with a 5 MB cap on the whole set. Slice 2 adds two more cities' maps by day and night, four scenes (the origin
deathbed and street, the Vanguard office, the newsroom), three portraits (the father, Stahl, Grey), six avatars
(880 × 1168 PNGs), five item images (512 × 512 JPEGs) and three faction crests (SVGs of about 1 KB). The origin art
panel needs a focus point on desktop (the deathbed at 30 % / 50 %). The Duskwall and Ashford maps are RGB, so they
need no flatten.

Coalport's two maps cost 2.7 MB at both widths and formats; the whole slice-1 set is 3.3 MB.

## Decision

- **New kinds**, each with its widths and per-file budgets in `scripts/art/build.ts`:

  | Kind | Crop | Widths | Budget per file (AVIF / WebP) |
  |---|---|---|---|
  | `avatar` | 4:5 head and shoulders, like NPC portraits | 128, 256 | 256: 20 / 25 KB · 128: 6 / 8 KB |
  | `item` | 1:1 | 128, 256 | 256: 20 / 25 KB · 128: 6 / 8 KB |
  | `vector` | none | — (copied as `/art/<id>.svg`) | 8 KB |

  Maps, scenes and portraits keep ADR 0007's widths and budgets.
- **Vectors** are copied, not encoded. `art:check` refuses an SVG with a `<script>`, an `on…=` attribute, a
  `<foreignObject>` or any external reference (`href` or `url(` not starting with `#`), so an SVG can never carry
  code into the page.
- **`Asset.focus { x, y }`** (fractions) is optional content: the client uses it as `object-position` when a panel
  crops the image (the origin art panel, the phone's 16:9 story band). No per-panel crops are generated.
- `AssetView` gains `format: 'raster' | 'svg'`; `artUrl` returns `/art/<id>.svg` for vectors.
- **Budgets:**
  - The committed set: **≤ 12 MB** after slice 2 (estimate 10.5–11.5 MB; the per-file budgets bound the worst
    case). `art:check` enforces it.
  - **First session on a phone: ≤ 1 MB of art transferred** from sign-up to the first result modal (AVIF, Pixel 7).
    Measured by the Playwright arrival spec, which sums `/art/` response sizes (estimate about 0.75 MB: six avatars,
    the deathbed and street scenes, the father's portrait, three crests, the home map, the secretary's portrait).

## Consequences

- Git grows by about 7–8 MB in this slice, in line with ADR 0007's 20–30 MB estimate for the MVP.
- A new city costs about 3 MB of maps; the 12 MB cap will be raised per slice with a measured figure, never removed.
- Missing scenes (an Alliance HQ, barracks, library, station, street, market, university, court) cost nothing: the
  map crop stands in (§13.5 rung 3); they are art requests, not blockers.
