/**
 * Map atmosphere (2 Oct 2026, tried on Coalport): clouds drift over the city map by day, each with a
 * soft shadow on the town, and fog patches drift lower and slower by night. A client-side overlay
 * drawn by `CityMap` (`clouds` prop) from the sprites in `apps/client/public/fx/`. The whole look is
 * tuned here: counts, sizes, speeds, headings, opacities, the shadow, the night tint and the parallax.
 */

export interface CloudSprite {
  src: string;
  /** Intrinsic size (px), for the aspect. */
  w: number;
  h: number;
}

/** One kind of drifting sprite (the day's clouds, the day's mist bands, the night's fog). */
export interface CloudKind {
  /** Cycled through; every second copy of a sprite is mirrored so repeats do not look alike. */
  sprites: readonly CloudSprite[];
  count: number;
  /** Each sprite's width, as a share of the picture's width on screen at rest: [min, max]. */
  size: readonly [number, number];
  /** Never narrower than this (px), so a phone's clouds still read as clouds. */
  minPx: number;
  /** Never wider than this share of the box's longer side (a desktop's picture is much wider). */
  maxShare: number;
  /** Seconds to drift across the map at rest (the box's width): [min, max]. */
  cross: readonly [number, number];
  /** Heading in degrees from due east (positive: drifting down the screen): [min, max]. */
  heading: readonly [number, number];
  opacity: readonly [number, number];
  /** Where their paths run, as a share of the map's height at rest (0 top, 1 bottom). */
  band: readonly [number, number];
  /**
   * A soft shadow on the town under each sprite: the same sprite in black, blurred, offset down and
   * right by `dx`, `dy` (shares of the sprite's width).
   */
  shadow?: { opacity: number; dx: number; dy: number; blur: number };
  /**
   * The night fog's faint alpha boosted and its grey tinted (an SVG colour matrix, painted once):
   * rgb' = keep × rgb + (1 − keep) × color, alpha' = alpha × `alpha`.
   */
  tint?: { color: readonly [number, number, number]; keep: number; alpha: number };
  /** How the sprite blends with the map under it. */
  blend?: 'normal' | 'screen' | 'lighten';
}

export interface CloudConfig {
  day: readonly CloudKind[];
  night: readonly CloudKind[];
  /**
   * How much higher than the ground the sprites feel: on a drag or a zoom they move (and grow) this
   * share more than the map. Night fog hangs lower.
   */
  parallax: { day: number; night: number };
  /** The layer's opacity while a place is open (zoomed in), so the place and its sheet stay clear. */
  zoomedOpacity: number;
  /** With reduced motion the sprites stand still, at this share of their opacity. */
  reducedMotionOpacity: number;
  /** The sprites mount this long after the map (its tiles load first), then fade in. */
  startDelayMs: number;
  fadeInMs: number;
  /** Paths start and end this share of the box's width past its edges (they enter from off-screen). */
  margin: number;
  /** Multipliers for tuning in the dev viewer: every drift's speed, every sprite's opacity. */
  speed: number;
  opacity: number;
}

const FX = '/fx';
const cloud = (n: number, w: number, h: number): CloudSprite => ({ src: `${FX}/cloud-day-${n}.webp`, w, h });
const fog = (n: number, h: number): CloudSprite => ({ src: `${FX}/fog-night-${n}.webp`, w: 1200, h });

export const CLOUDS: CloudConfig = {
  day: [
    {
      sprites: [cloud(1, 1024, 538), cloud(2, 1024, 614), cloud(3, 1024, 456)],
      count: 4,
      size: [0.32, 0.42],
      minPx: 200,
      maxShare: 0.5,
      cross: [90, 170],
      heading: [-6, 10],
      opacity: [0.5, 0.6],
      band: [0.05, 0.95],
      shadow: { opacity: 0.25, dx: 0.12, dy: 0.2, blur: 8 },
    },
    {
      sprites: [{ src: `${FX}/mist-day-1.webp`, w: 1600, h: 571 }],
      count: 1,
      size: [0.6, 0.7],
      minPx: 360,
      maxShare: 0.9,
      cross: [150, 180],
      heading: [-4, 4],
      opacity: [0.5, 0.5],
      band: [0.3, 0.7],
    },
  ],
  night: [
    {
      sprites: [fog(1, 282), fog(2, 410), fog(3, 343), fog(4, 345), fog(5, 313), fog(6, 361)],
      count: 4,
      size: [0.45, 0.6],
      minPx: 280,
      maxShare: 0.8,
      cross: [140, 210],
      heading: [-3, 5],
      opacity: [0.4, 0.5],
      band: [0.08, 0.92],
      tint: { color: [196, 208, 222], keep: 0.35, alpha: 2.6 },
      blend: 'screen',
    },
  ],
  parallax: { day: 0.12, night: 0.06 },
  zoomedOpacity: 0.15,
  reducedMotionOpacity: 0.6,
  startDelayMs: 700,
  fadeInMs: 1500,
  margin: 0.15,
  speed: 1,
  opacity: 1,
};

/** The map's view (CityMap's MapView). */
interface View {
  scale: number;
  x: number;
  y: number;
}

/**
 * Where the cloud plane is drawn: its coordinates are the box's at rest (the map's at-rest view),
 * and it follows the map's move from that view, amplified by `parallax`. The map's move from rest is
 * screen = a·q + b (a = scale / rest scale); the plane's is a^(1+p)·q + b·(1 − a^(1+p)) / (1 − a): a
 * zoom about the same fixed point, a little closer, and a pure drag (a = 1) is (1 + p) × the drag.
 * Returns the plane's CSS translate and scale (transform-origin 0 0).
 */
export function cloudPlane(view: View, rest: View, parallax: number): View {
  const a = view.scale / rest.scale;
  const bx = view.x - a * rest.x;
  const by = view.y - a * rest.y;
  const ac = a ** (1 + parallax);
  const k = Math.abs(1 - a) < 1e-6 ? 1 + parallax : (1 - ac) / (1 - a);
  return { scale: ac, x: bx * k, y: by * k };
}

/** A small seeded generator, so a city's sky is the same on every visit and in tests. */
function rand(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** One sprite's path and look, in the plane's (at-rest box) pixels. */
export interface CloudPath {
  key: string;
  src: string;
  w: number;
  h: number;
  /** The path's start and end (the sprite's top left corner). */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** One crossing (ms), and where in it the sprite starts (0–1), so the sky is never empty. */
  duration: number;
  phase: number;
  opacity: number;
  mirror: boolean;
  kind: number;
  shadow?: CloudKind['shadow'];
}

/**
 * Every sprite's path for one time of day over a box, the picture `pictureW` px wide at rest. The
 * phases are spread evenly (with a little jitter) so the sprites are spread across the map at any
 * moment.
 */
export function cloudPaths(
  kinds: readonly CloudKind[],
  box: { w: number; h: number },
  pictureW: number,
  config: Pick<CloudConfig, 'margin' | 'speed' | 'opacity'>,
  seed = 7,
): CloudPath[] {
  const out: CloudPath[] = [];
  kinds.forEach((k, ki) => {
    const r = rand(seed * 101 + ki * 17 + 1);
    const lerp = ([lo, hi]: readonly [number, number]) => lo + (hi - lo) * r();
    for (let i = 0; i < k.count; i++) {
      const sprite = k.sprites[i % k.sprites.length]!;
      const w = Math.min(k.maxShare * Math.max(box.w, box.h), Math.max(k.minPx, lerp(k.size) * pictureW));
      const h = (w * sprite.h) / sprite.w;
      const m = config.margin * box.w;
      const x0 = -m - w;
      const x1 = box.w + m;
      const heading = (lerp(k.heading) * Math.PI) / 180;
      const dy = Math.tan(heading) * (x1 - x0);
      // Spread the paths over the band: lane i of count, jittered within it.
      const lane = (i + 0.25 + 0.5 * r()) / k.count;
      const mid = box.h * (k.band[0] + (k.band[1] - k.band[0]) * lane);
      const y0 = mid - h / 2 - dy / 2;
      // A crossing of the box takes `cross` seconds; the path is longer by the margins and the sprite.
      const seconds = (lerp(k.cross) * (x1 - x0)) / (box.w + w);
      out.push({
        key: `${ki}-${i}`,
        src: sprite.src,
        w,
        h,
        x0,
        y0,
        x1,
        y1: y0 + dy,
        duration: (seconds * 1000) / Math.max(0.01, config.speed),
        // Lanes run top to bottom; their phases are shuffled so neighbours are not side by side.
        phase: (((i * 3) % Math.max(1, k.count)) + 0.3 * r()) / Math.max(1, k.count),
        opacity: Math.min(1, lerp(k.opacity) * config.opacity),
        mirror: Math.floor(i / k.sprites.length) % 2 === 1 || (k.sprites.length === 1 && i % 2 === 1),
        kind: ki,
        ...(k.shadow ? { shadow: k.shadow } : {}),
      });
    }
  });
  return out;
}

/** Where a path is at a share of its crossing. */
export const pathAt = (p: CloudPath, t: number) => ({
  x: p.x0 + (p.x1 - p.x0) * t,
  y: p.y0 + (p.y1 - p.y0) * t,
});
