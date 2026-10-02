/**
 * Deep Zoom tile geometry (ADR 0024, maps-v3 integration §4). Pure, no React: `TileLayer` draws with
 * it and `scripts/art/tiles.ts` checks its own output against it.
 *
 * Layout (libvips `dzsave`, `layout: 'dz'`): `${base}/${format}_files/${level}/${col}_${row}.${format}`.
 * Level `maxLevel` is the full size; each level below halves it (rounding up), down to 1 px at 0.
 */

/** The tiles' image format: AVIF since maps v3 §9.2 (WebP was the first pyramid's). */
export type TileFormat = 'avif' | 'webp';

/** What the server says of a map's pyramid (`AssetView.tiles`): everything but where it is hosted. */
export interface TileSourceLike {
  /** `<assetId>/<rev>`: the pyramid's folder under the tile origin. */
  path: string;
  width: number;
  height: number;
  tileSize: number;
  overlap: number;
  maxLevel: number;
  format: TileFormat;
}

export interface TilePyramid {
  /** URL of the pyramid's folder, e.g. `/tiles/map.coalport.day/1a2b3c4d`. */
  base: string;
  width: number;
  height: number;
  tileSize: number;
  overlap: number;
  maxLevel: number;
  format: TileFormat;
}

/** Device pixels per CSS pixel the tiles are picked for: a phone's 3 × costs 2.25 × the bytes of 2 ×. */
export const TILE_MAX_DPR = 2;

/**
 * The always-there underlay: the smallest level at least this many pixels across. One tile (270 px
 * for an 8,640 px map), the same file as CityMap's blurred backdrop, so it is free.
 */
export const BASE_MIN_PX = 256;

/** `maxLevel` of a Deep Zoom pyramid down to 1 px: ceil(log2(the longer side)). */
export function maxLevelFor(width: number, height: number): number {
  return Math.ceil(Math.log2(Math.max(width, height, 1)));
}

export function levelSize(p: Pick<TilePyramid, 'width' | 'height' | 'maxLevel'>, level: number) {
  const k = 2 ** (p.maxLevel - level);
  return { w: Math.max(1, Math.ceil(p.width / k)), h: Math.max(1, Math.ceil(p.height / k)) };
}

/** Columns and rows of tiles at a level. */
export function levelGrid(
  p: Pick<TilePyramid, 'width' | 'height' | 'maxLevel' | 'tileSize'>,
  level: number,
): { cols: number; rows: number } {
  const { w, h } = levelSize(p, level);
  return { cols: Math.ceil(w / p.tileSize), rows: Math.ceil(h / p.tileSize) };
}

/** Every tile of the pyramid (all levels). */
export function tileCount(p: Pick<TilePyramid, 'width' | 'height' | 'maxLevel' | 'tileSize'>): number {
  let n = 0;
  for (let level = 0; level <= p.maxLevel; level++) {
    const g = levelGrid(p, level);
    n += g.cols * g.rows;
  }
  return n;
}

/** The lowest level with at least `px` pixels across (the full size if none). */
export function levelFor(p: Pick<TilePyramid, 'width' | 'height' | 'maxLevel'>, px: number): number {
  for (let level = 0; level <= p.maxLevel; level++) if (levelSize(p, level).w >= px) return level;
  return p.maxLevel;
}

/**
 * The detail level for a view (review 3 fix): the lowest level with at least as many pixels across as
 * the art takes on screen, in device pixels with the DPR capped at TILE_MAX_DPR. `shownW` is the art's
 * width on screen in CSS pixels (the layer's width at scale 1 times the view's scale).
 *
 * Before review 3 a level with 85 % of those pixels was taken as good enough. On an upright phone the
 * quarter's frame covers a tall box, so the art is laid out larger and a zoom lands right past a
 * level's edge (Duskwall at 390 × 844: 1,244 px wide on screen, level 12's 2,160 px taken for the
 * 2,488 device pixels capped, 0.58 of the phone's real ones), while held sideways the same zoom took
 * level 13. Now the full capped count is asked for, as on every other screen.
 */
export function detailLevelFor(
  p: Pick<TilePyramid, 'width' | 'height' | 'maxLevel'>,
  shownW: number,
  dpr: number,
): number {
  return levelFor(p, Math.round(shownW * Math.min(TILE_MAX_DPR, dpr || 1)));
}

export function tileUrl(p: TilePyramid, level: number, col: number, row: number): string {
  return `${p.base}/${p.format}_files/${level}/${col}_${row}.${p.format}`;
}

/** The underlay's level: one small tile of the whole art (also the blurred backdrop). */
export function baseLevelOf(p: TilePyramid): number {
  return Math.min(p.maxLevel, levelFor(p, BASE_MIN_PX));
}

/** The whole art in one small tile, for the blurred backdrop (the underlay's file). */
export function backdropUrl(p: TilePyramid): string {
  return tileUrl(p, baseLevelOf(p), 0, 0);
}

/** The client's pyramid for a server's tile source, or null without an origin or a source. */
export function pyramidFor(asset: { tiles: TileSourceLike | null }, origin: string): TilePyramid | null {
  if (!origin || !asset.tiles) return null;
  const { path, ...rest } = asset.tiles;
  return { ...rest, base: `${origin.replace(/\/+$/, '')}/${path}` };
}

export interface Tile {
  key: string;
  level: number;
  url: string;
  /** In the layer's CSS pixels at scale 1. */
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The tiles of `level` that cover the part of the layer between x0..x1, y0..y1 (layer px at scale 1). */
export function tilesFor(
  p: TilePyramid,
  level: number,
  content: { w: number; h: number },
  rect: { x0: number; y0: number; x1: number; y1: number } | null,
): Tile[] {
  const { w: lw, h: lh } = levelSize(p, level);
  const sx = content.w / lw;
  const sy = content.h / lh;
  const cols = Math.ceil(lw / p.tileSize);
  const rows = Math.ceil(lh / p.tileSize);
  const r = rect ?? { x0: 0, y0: 0, x1: content.w, y1: content.h };
  const c0 = Math.max(0, Math.floor(r.x0 / sx / p.tileSize));
  const c1 = Math.min(cols - 1, Math.floor((r.x1 - 1e-6) / sx / p.tileSize));
  const r0 = Math.max(0, Math.floor(r.y0 / sy / p.tileSize));
  const r1 = Math.min(rows - 1, Math.floor((r.y1 - 1e-6) / sy / p.tileSize));
  const out: Tile[] = [];
  for (let c = c0; c <= c1; c++) {
    for (let row = r0; row <= r1; row++) {
      // The file's own extent, overlap included, so neighbours overlap by a pixel: no hairline seams.
      const x0 = Math.max(0, c * p.tileSize - p.overlap);
      const y0 = Math.max(0, row * p.tileSize - p.overlap);
      const x1 = Math.min(lw, (c + 1) * p.tileSize + p.overlap);
      const y1 = Math.min(lh, (row + 1) * p.tileSize + p.overlap);
      out.push({
        key: `${level}/${c}_${row}`,
        level,
        url: tileUrl(p, level, c, row),
        left: x0 * sx,
        top: y0 * sy,
        width: (x1 - x0) * sx,
        height: (y1 - y0) * sy,
      });
    }
  }
  return out;
}
