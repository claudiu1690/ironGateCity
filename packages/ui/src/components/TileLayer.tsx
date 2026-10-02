import { useEffect, useMemo, useRef, useState } from 'react';
import { TILE_MAX_DPR, baseLevelOf, levelFor, levelSize, tilesFor } from '../tiles';
import type { Tile, TilePyramid } from '../tiles';

/** The view, as CityMap keeps it: the layer's translate and scale, over a box of this size. */
interface TileView {
  scale: number;
  x: number;
  y: number;
}

/** A level is good enough while it has at least this share of the device pixels it is shown at. */
const MIN_PIXEL_RATIO = 0.85;
/** Tiles kept around the view, as a share of a tile: a short drag finds them ready. */
const MARGIN_TILES = 0.25;
/**
 * The detail is fetched once the view it is for has held this long (maps v3 T13): the first view
 * often moves once more a frame later (a banner or the plate's orders change the map's size), and a
 * drag moves it on every pointer event; neither should fetch a level of tiles that is never shown.
 */
export const DETAIL_SETTLE_MS = 150;

export interface TileLayerProps {
  pyramid: TilePyramid;
  /** The layer's size in CSS pixels at scale 1 (CityMap's `contentW` × `contentH`). */
  content: { w: number; h: number };
  /** The map box. */
  box: { w: number; h: number };
  /**
   * The view the map is at or on its way to (CityMap sets the destination at once and lets CSS
   * animate to it), so the destination's tiles load during the zoom.
   */
  view: TileView;
  /** Reports how many wanted tiles are still loading. */
  onPending?: (n: number) => void;
  /**
   * The underlay failed (a 404, or HTML from a rewrite that does not decode): the tiles are not
   * there, and CityMap switches to the still pictures for the rest of its mount (design §5.2).
   */
  onUnavailable?: () => void;
}

/**
 * ADR 0024: the map art as tiles, inside CityMap's scaled layer. Two levels at a time:
 *
 * - the **underlay**, the smallest level at least BASE_MIN_PX across, whole: wherever the detail is
 *   not loaded yet, the art is there (blurred), never the ink behind it;
 * - the **detail**, the level whose pixels match the destination view's device pixels (DPR capped at
 *   TILE_MAX_DPR), only the tiles that view shows (plus a margin).
 *
 * The previous detail tiles stay until every new one has loaded, so a zoom never flashes down to the
 * underlay. A detail tile that fails is given up on (the underlay shows there). Tiles are plain
 * <img>s positioned in the layer's pixels; the layer's one CSS transform moves them all with the
 * pins, so the zoom stays a compositor animation.
 */
export function TileLayer({ pyramid: p, content, box, view, onPending, onUnavailable }: TileLayerProps) {
  const dpr = Math.min(TILE_MAX_DPR, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);
  const baseLevel = baseLevelOf(p);
  const detailLevel = Math.max(baseLevel, levelFor(p, content.w * view.scale * dpr * MIN_PIXEL_RATIO));
  const m = (MARGIN_TILES * p.tileSize * content.w) / levelSize(p, detailLevel).w;
  const rect = {
    x0: Math.max(0, -view.x / view.scale - m),
    y0: Math.max(0, -view.y / view.scale - m),
    x1: Math.min(content.w, (box.w - view.x) / view.scale + m),
    y1: Math.min(content.h, (box.h - view.y) / view.scale + m),
  };
  const rectKey = [rect.x0, rect.y0, rect.x1, rect.y1].map((v) => Math.round(v)).join(',');
  const wantKey = `${p.base}|${detailLevel}|${rectKey}|${content.w}|${content.h}`;
  const [settled, setSettled] = useState<{ key: string; level: number; rect: typeof rect } | null>(null);
  const wantRef = useRef({ key: wantKey, level: detailLevel, rect });
  wantRef.current = { key: wantKey, level: detailLevel, rect };
  useEffect(() => {
    const t = setTimeout(() => setSettled(wantRef.current), DETAIL_SETTLE_MS);
    return () => clearTimeout(t);
  }, [wantKey]);
  const base = useMemo(
    () => tilesFor(p, baseLevel, content, null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.base, baseLevel, content.w, content.h],
  );
  const detail = useMemo(
    () => (!settled || settled.level === baseLevel ? [] : tilesFor(p, settled.level, content, settled.rect)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.base, baseLevel, content.w, content.h, settled?.key],
  );

  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  /** The detail tiles still shown from before, until the new ones are in. */
  const [held, setHeld] = useState<Tile[]>([]);
  const prevDetail = useRef<Tile[]>([]);
  useEffect(() => {
    const keys = new Set(detail.map((t) => t.key));
    const keep = [...prevDetail.current, ...held].filter(
      (t) => !keys.has(t.key) && loadedRef.current.has(t.key),
    );
    setHeld(Array.from(new Map(keep.map((t) => [t.key, t])).values()));
    prevDetail.current = detail;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);
  const wanted = useMemo(() => [...base, ...detail], [base, detail]);
  const pending = wanted.filter((t) => !loaded.has(t.key) && !failed.has(t.key)).length;
  useEffect(() => {
    onPending?.(pending);
    if (pending === 0 && held.length > 0) setHeld([]);
  }, [pending, held.length, onPending]);

  const onUnavailableRef = useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;
  const onLoad = (key: string) => setLoaded((s) => (s.has(key) ? s : new Set(s).add(key)));
  const onError = (t: Tile) => {
    if (t.level === baseLevel) onUnavailableRef.current?.();
    setFailed((s) => (s.has(t.key) ? s : new Set(s).add(t.key)));
  };
  const wantedKeys = new Set(wanted.map((t) => t.key));
  const shown = [...base, ...held.filter((t) => !wantedKeys.has(t.key)), ...detail].filter(
    (t) => t.level === baseLevel || !failed.has(t.key),
  );
  return (
    <div className="pointer-events-none absolute inset-0" data-testid="tile-layer" data-pending={pending}>
      {shown.map((t) => (
        <img
          key={t.key}
          src={t.url}
          alt=""
          draggable={false}
          decoding="async"
          onLoad={() => onLoad(t.key)}
          onError={() => onError(t)}
          data-tile={t.key}
          className="absolute max-w-none select-none"
          style={{ left: t.left, top: t.top, width: t.width, height: t.height, zIndex: t.level }}
        />
      ))}
    </div>
  );
}
