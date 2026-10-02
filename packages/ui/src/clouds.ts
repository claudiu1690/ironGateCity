/**
 * Map atmosphere (2 Oct 2026, tried on Coalport): clouds drift over the city map by day, each main
 * cloud with a soft shadow on the town, and fog and mist curls drift lower and slower by night. A
 * client-side overlay drawn by `CityMap` (`clouds` prop) from the sprites in `apps/client/public/fx/`.
 *
 * The sky is three depths (the user, 2 Oct: "more shapes, clouds moving at different speeds"): high
 * wisps that pass quickly with the most parallax, the main clouds in the middle, and slow mist or fog
 * low over the roofs with the least. The whole look is tuned here: each depth's sprites, counts, sizes,
 * speeds, headings, opacities, shadows, the night tint and the parallax.
 */

export interface CloudSprite {
  src: string;
  /** Intrinsic size (px), for the aspect. */
  w: number;
  h: number;
  /**
   * A CSS mask over the sprite (and its shadow), for art with a stray fragment cut by its edge: the
   * gradient hides the fragment, so the hard edge never shows. Non-destructive: the file is as made.
   */
  mask?: string;
}

/** One kind of drifting sprite within a depth (the high wisps, the middle's big clouds, the night fog). */
export interface CloudKind {
  /** The pool: shuffled with the seed, then cycled through. */
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
  /** The share of these sprites drawn mirrored, so a repeated sprite does not look alike. */
  mirror: number;
  /**
   * A soft shadow on the town under each sprite: the same sprite in black, blurred, offset down and
   * right by `dx`, `dy` (shares of the sprite's width).
   */
  shadow?: { opacity: number; dx: number; dy: number; blur: number };
  /**
   * Night: the faint alpha boosted and the grey tinted (an SVG colour matrix, painted once):
   * rgb' = keep × rgb + (1 − keep) × color, alpha' = alpha × `alpha`.
   */
  tint?: { color: readonly [number, number, number]; keep: number; alpha: number };
  /** How the sprite blends with the map under it. */
  blend?: 'normal' | 'screen' | 'lighten';
}

export type CloudDepthName = 'high' | 'middle' | 'low';

/** One depth of the sky: its own plane, parallax and sprites. */
export interface CloudDepth {
  name: CloudDepthName;
  /**
   * How much higher than the ground it feels: on a drag or a zoom it moves (and grows) this share
   * more than the map.
   */
  parallax: number;
  /** Mounted this long after the rest of the sky (the high wisps load last). */
  delayMs: number;
  kinds: readonly CloudKind[];
}

export interface CloudConfig {
  /** Each time of day's depths, drawn bottom (low) to top (high) in this order. */
  day: readonly CloudDepth[];
  night: readonly CloudDepth[];
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
const s = (name: string, w: number, h: number, mask?: string): CloudSprite => ({
  src: `${FX}/${name}.webp`,
  w,
  h,
  ...(mask ? { mask } : {}),
});

/** The day's three original clouds, seen from above. */
const CLOUD = [s('cloud-day-1', 1024, 538), s('cloud-day-2', 1024, 614), s('cloud-day-3', 1024, 456)];
/**
 * The two large billowing clouds. Each file has a stray fragment of another cloud cut by its edge
 * (day-1 bottom right, day-2 top left): masked off along the diagonal.
 */
const BIG = [
  s('bigcloud-day-1', 1100, 659, 'linear-gradient(to bottom right, #000 57%, transparent 63%)'),
  s('bigcloud-day-2', 1100, 841, 'linear-gradient(to bottom right, transparent 12%, #000 20%)'),
];
const PUFF = [1, 2, 3, 4, 5, 6].map((n) => s(`puff-day-${n}`, 640, [291, 449, 375, 357, 375, 363][n - 1]!));
const WISP = [
  s('wisp-day-1', 1200, 541),
  s('wisp-day-2', 1040, 672),
  s('wisp-day-3', 752, 880),
  s('wisp-day-4', 1200, 354),
];
const MIST = [s('mist-day-1', 1600, 571)];
const FOG = [282, 410, 343, 345, 313, 361].map((h, i) => s(`fog-night-${i + 1}`, 1200, h));
/** Night mist curls; day-4 has a fragment cut by its top right corner: masked off. */
const CURL = [
  s('mistcurl-night-1', 800, 519),
  s('mistcurl-night-2', 800, 303),
  s('mistcurl-night-3', 768, 848),
  s('mistcurl-night-4', 800, 417, 'linear-gradient(to bottom left, transparent 12%, #000 20%)'),
  s('mistcurl-night-5', 800, 489),
];

const SHADOW = { opacity: 0.25, dx: 0.12, dy: 0.2, blur: 8 };
const NIGHT_TINT = { color: [196, 208, 222] as const, keep: 0.35, alpha: 2.6 };
const CURL_TINT = { color: [196, 208, 222] as const, keep: 0.35, alpha: 2.2 };

/**
 * At most 14 images a time of day, shadows included (phones stay smooth): by day 2 mist bands low,
 * 4 clouds (a big one, an original, two puffs) with their 4 shadows in the middle, 3 wisps and a small
 * puff high; by night 3 fog patches and a mist curl low, 2 fog patches and 3 curls in the middle.
 */
export const CLOUDS: CloudConfig = {
  day: [
    {
      name: 'low',
      parallax: 0.05,
      delayMs: 0,
      kinds: [
        {
          sprites: MIST,
          count: 2,
          size: [0.55, 0.75],
          minPx: 340,
          maxShare: 0.9,
          cross: [170, 240],
          heading: [-4, 4],
          opacity: [0.4, 0.5],
          band: [0.2, 0.85],
          mirror: 0.5,
        },
      ],
    },
    {
      name: 'middle',
      parallax: 0.12,
      delayMs: 0,
      kinds: [
        {
          sprites: BIG,
          count: 1,
          size: [0.42, 0.5],
          minPx: 260,
          maxShare: 0.6,
          cross: [130, 170],
          heading: [-6, 8],
          opacity: [0.5, 0.6],
          band: [0.05, 0.95],
          mirror: 0.5,
          shadow: SHADOW,
        },
        {
          sprites: CLOUD,
          count: 1,
          size: [0.3, 0.38],
          minPx: 200,
          maxShare: 0.48,
          cross: [100, 150],
          heading: [-8, 8],
          opacity: [0.5, 0.6],
          band: [0.05, 0.95],
          mirror: 0.5,
          shadow: SHADOW,
        },
        {
          sprites: PUFF,
          count: 2,
          size: [0.13, 0.2],
          minPx: 110,
          maxShare: 0.26,
          cross: [90, 130],
          heading: [-8, 10],
          opacity: [0.45, 0.58],
          band: [0.05, 0.95],
          mirror: 0.5,
          shadow: SHADOW,
        },
      ],
    },
    {
      name: 'high',
      parallax: 0.2,
      delayMs: 1500,
      kinds: [
        {
          sprites: WISP,
          count: 3,
          size: [0.22, 0.34],
          minPx: 150,
          maxShare: 0.45,
          cross: [40, 80],
          heading: [-2, 14],
          opacity: [0.6, 0.8],
          band: [0, 1],
          mirror: 0.5,
        },
        {
          sprites: PUFF,
          count: 1,
          size: [0.07, 0.1],
          minPx: 70,
          maxShare: 0.14,
          cross: [50, 70],
          heading: [0, 12],
          opacity: [0.45, 0.55],
          band: [0.1, 0.9],
          mirror: 0.5,
        },
      ],
    },
  ],
  night: [
    {
      name: 'low',
      parallax: 0.04,
      delayMs: 0,
      kinds: [
        {
          sprites: FOG,
          count: 3,
          size: [0.5, 0.65],
          minPx: 300,
          maxShare: 0.85,
          cross: [170, 240],
          heading: [-3, 4],
          opacity: [0.4, 0.5],
          band: [0.08, 0.92],
          mirror: 0.5,
          tint: NIGHT_TINT,
          blend: 'screen',
        },
        {
          sprites: CURL,
          count: 1,
          size: [0.24, 0.3],
          minPx: 170,
          maxShare: 0.4,
          cross: [160, 220],
          heading: [-4, 4],
          opacity: [0.35, 0.45],
          band: [0.15, 0.85],
          mirror: 0.5,
          tint: CURL_TINT,
          blend: 'screen',
        },
      ],
    },
    {
      name: 'middle',
      parallax: 0.08,
      delayMs: 0,
      kinds: [
        {
          sprites: FOG,
          count: 2,
          size: [0.38, 0.5],
          minPx: 260,
          maxShare: 0.7,
          cross: [120, 170],
          heading: [-5, 6],
          opacity: [0.35, 0.45],
          band: [0.05, 0.95],
          mirror: 0.5,
          tint: NIGHT_TINT,
          blend: 'screen',
        },
        {
          sprites: CURL,
          count: 3,
          size: [0.18, 0.28],
          minPx: 140,
          maxShare: 0.4,
          cross: [100, 150],
          heading: [-6, 8],
          opacity: [0.35, 0.5],
          band: [0.05, 0.95],
          mirror: 0.5,
          tint: CURL_TINT,
          blend: 'screen',
        },
      ],
    },
  ],
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
 * Where a cloud plane is drawn: its coordinates are the box's at rest (the map's at-rest view), and
 * it follows the map's move from that view, amplified by `parallax`. The map's move from rest is
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

function shuffled<T>(items: readonly T[], r: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** One sprite's path and look, in the plane's (at-rest box) pixels. */
export interface CloudPath {
  /** The sprite's slot in its depth (the element), the same on every pass. */
  key: string;
  /** Which crossing this is (0: the first, part-way along); each pass draws a new look. */
  pass: number;
  src: string;
  mask?: string;
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
  /** The slot's lane, a share of its kind's band (top to bottom); kept from pass to pass. */
  lane: number;
  shadow?: CloudKind['shadow'];
}

type Box = { w: number; h: number };
type Opts = Pick<CloudConfig, 'margin' | 'speed' | 'opacity'>;

/** One sprite's size, speed, heading, opacity and mirroring, drawn within its kind's ranges. */
function drawPath(
  k: CloudKind,
  sprite: CloudSprite,
  r: () => number,
  box: Box,
  pictureW: number,
  config: Opts,
  base: Pick<CloudPath, 'key' | 'pass' | 'kind' | 'lane'>,
  /** Where along the on-map part of the path it starts (0–1); null: off-screen at the start. */
  along: number | null,
): CloudPath {
  const lerp = ([lo, hi]: readonly [number, number]) => lo + (hi - lo) * r();
  const w = Math.min(k.maxShare * Math.max(box.w, box.h), Math.max(k.minPx, lerp(k.size) * pictureW));
  const h = (w * sprite.h) / sprite.w;
  const m = config.margin * box.w;
  const x0 = -m - w;
  const x1 = box.w + m;
  const heading = (lerp(k.heading) * Math.PI) / 180;
  const dy = Math.tan(heading) * (x1 - x0);
  const mid = box.h * (k.band[0] + (k.band[1] - k.band[0]) * base.lane);
  const y0 = mid - h / 2 - dy / 2;
  // A crossing of the box takes `cross` seconds; the path is longer by the margins and the sprite.
  const seconds = (lerp(k.cross) * (x1 - x0)) / (box.w + w);
  return {
    ...base,
    src: sprite.src,
    ...(sprite.mask ? { mask: sprite.mask } : {}),
    w,
    h,
    x0,
    y0,
    x1,
    y1: y0 + dy,
    duration: (seconds * 1000) / Math.max(0.01, config.speed),
    // Within the part of the path where the sprite is over the map, so the first view has the whole
    // sky in it (the different speeds spread them out from there).
    phase: along === null ? 0 : (m + (box.w + w) * along) / (x1 - x0),
    opacity: Math.min(1, lerp(k.opacity) * config.opacity),
    mirror: r() < k.mirror,
    ...(k.shadow ? { shadow: k.shadow } : {}),
  };
}

/**
 * Every sprite's first path in one depth over a box, the picture `pictureW` px wide at rest. Each
 * sprite draws its own size, speed and heading within its kind's ranges; the depth's sprites share
 * out its lanes (top to bottom) and their starting places (along the path) in two different shuffles,
 * so neighbours are neither side by side nor in step.
 */
export function cloudPaths(
  depth: CloudDepth,
  box: Box,
  pictureW: number,
  config: Opts,
  seed = 7,
): CloudPath[] {
  const r = rand(seed * 101 + depth.name.length * 17 + 1);
  const n = depth.kinds.reduce((t, k) => t + k.count, 0);
  const lanes = shuffled(
    Array.from({ length: n }, (_, i) => i),
    r,
  );
  const phases = shuffled(
    Array.from({ length: n }, (_, i) => i),
    r,
  );
  const out: CloudPath[] = [];
  let j = 0;
  depth.kinds.forEach((k, ki) => {
    const pool = shuffled(k.sprites, r);
    for (let i = 0; i < k.count; i++, j++) {
      const lane = (lanes[j]! + 0.25 + 0.5 * r()) / n;
      const along = (phases[j]! + 0.15 + 0.7 * r()) / n;
      const base = { key: `${depth.name}-${ki}-${i}`, pass: 0, kind: ki, lane };
      out.push(drawPath(k, pool[i % pool.length]!, r, box, pictureW, config, base, along));
    }
  });
  return out;
}

/**
 * The same slot's next crossing (the user: "more shapes, clouds moving at different speeds"): when a
 * sprite has crossed the map it comes back from off-screen as another sprite of its kind's pool, with
 * a new size, speed, heading and mirroring, in the same lane. Seeded by the slot and the pass, so
 * the sky's sequence is the same on every visit.
 */
export function cloudPass(
  depth: CloudDepth,
  prev: CloudPath,
  box: Box,
  pictureW: number,
  config: Opts,
  seed = 7,
): CloudPath {
  const pass = prev.pass + 1;
  const k = depth.kinds[prev.kind]!;
  let h = seed * 7919 + pass * 104729;
  for (const c of prev.key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const r = rand(h);
  // Never the same sprite twice running, where the pool has another.
  const pool = k.sprites.length > 1 ? k.sprites.filter((s) => s.src !== prev.src) : k.sprites;
  const sprite = pool[Math.floor(r() * pool.length)]!;
  const base = { key: prev.key, pass, kind: prev.kind, lane: prev.lane };
  return drawPath(k, sprite, r, box, pictureW, config, base, null);
}

/** How many images a time of day draws: every sprite, and every shadow. */
export const spriteCount = (depths: readonly CloudDepth[]) =>
  depths.reduce((t, d) => t + d.kinds.reduce((u, k) => u + k.count * (k.shadow ? 2 : 1), 0), 0);

/** Where a path is at a share of its crossing. */
export const pathAt = (p: CloudPath, t: number) => ({
  x: p.x0 + (p.x1 - p.x0) * t,
  y: p.y0 + (p.y1 - p.y0) * t,
});
