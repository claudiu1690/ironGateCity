import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { cloudPass, cloudPaths, cloudPlane, pathAt } from '../clouds';
import type { CloudConfig, CloudDepth, CloudKind, CloudPath } from '../clouds';

interface View {
  scale: number;
  x: number;
  y: number;
}

export interface CloudLayerProps {
  config: CloudConfig;
  isNight: boolean;
  box: { w: number; h: number };
  /** The picture's width on screen at rest (CityMap's contentW × the at-rest scale). */
  pictureW: number;
  /** The view shown, and the at-rest view the planes are laid out on. */
  view: View;
  rest: View;
  /** The map layer's own transition (a zoom), so the clouds move with it. */
  transition: string;
  /** The map is moving or dragged: the planes are compositor layers meanwhile. */
  moving: boolean;
  /** A place is open: the clouds fade to `zoomedOpacity`. */
  zoomed: boolean;
  /** The day/night cross-fade. */
  fade: string;
  fadeMs: number;
  zoomMs: number;
  reducedMotion: boolean;
}

/** A sprite's mask (a stray fragment at the art's edge hidden), on the image and its shadow alike. */
const masked = (mask?: string): CSSProperties =>
  mask ? { maskImage: mask, WebkitMaskImage: mask, maskSize: '100% 100%', WebkitMaskSize: '100% 100%' } : {};

/**
 * One depth's sprites, each drifting on its own path (Web Animations, transform only). A sprite that
 * has crossed the map comes back as its slot's next pass (`next`: another shape, size, speed and
 * heading); with reduced motion they stand still on their first pass.
 */
const CloudSet = memo(function CloudSet({
  paths,
  kinds,
  still,
  filterId,
  next,
}: {
  paths: CloudPath[];
  kinds: readonly CloudKind[];
  still: boolean;
  filterId: string;
  next: (p: CloudPath) => CloudPath;
}) {
  const els = useRef(new Map<string, HTMLDivElement>());
  const anims = useRef(new Map<string, { a: Animation; sig: string; pass: number }>());
  /** Each slot's pass (0: the first). */
  const [passOf, setPassOf] = useState<Readonly<Record<string, number>>>({});
  // Each slot's current path: its first, carried on to its pass (the same sequence after a resize).
  const current = useMemo(
    () =>
      paths.map((p) => {
        let c = p;
        for (let i = 0; i < (passOf[p.key] ?? 0); i++) c = next(c);
        return c;
      }),
    [paths, passOf, next],
  );
  const sigOf = (p: CloudPath) =>
    `${p.pass}:${p.src}:${p.x0.toFixed(1)},${p.y0.toFixed(1)},${p.x1.toFixed(1)},${p.y1.toFixed(1)},${p.duration.toFixed(0)}`;
  const currentKey = current.map((p) => `${p.key}=${sigOf(p)}`).join('|');

  useEffect(() => {
    if (still) return;
    const live = new Set<string>();
    for (const p of current) {
      live.add(p.key);
      const el = els.current.get(p.key);
      if (!el || typeof el.animate !== 'function') continue;
      const sig = sigOf(p);
      const old = anims.current.get(p.key);
      if (old?.sig === sig) continue;
      // A resize (the same pass on a new path) keeps the sprite's progress; a new pass starts off-screen.
      const t0 =
        old && old.pass === p.pass
          ? Math.min(1, Number(old.a.currentTime ?? 0) / Number(old.a.effect?.getTiming().duration ?? 1))
          : p.phase;
      old?.a.cancel();
      const a = el.animate(
        [
          { transform: `translate3d(${p.x0}px, ${p.y0}px, 0)` },
          { transform: `translate3d(${p.x1}px, ${p.y1}px, 0)` },
        ],
        { duration: p.duration, easing: 'linear', fill: 'forwards' },
      );
      a.currentTime = t0 * p.duration;
      const key = p.key;
      const pass = p.pass;
      a.onfinish = () => setPassOf((m) => ((m[key] ?? 0) === pass ? { ...m, [key]: pass + 1 } : m));
      if (typeof document !== 'undefined' && document.hidden) a.pause();
      anims.current.set(p.key, { a, sig, pass: p.pass });
    }
    for (const [k, v] of anims.current)
      if (!live.has(k)) {
        v.a.cancel();
        anims.current.delete(k);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey, still]);

  useEffect(
    () => () => {
      for (const v of anims.current.values()) v.a.cancel();
      anims.current.clear();
    },
    [],
  );

  // A hidden tab: the drift pauses (no frames are spent on it), and goes on where it was.
  useEffect(() => {
    if (still || typeof document === 'undefined') return;
    const onVis = () => {
      for (const v of anims.current.values()) {
        if (document.hidden) v.a.pause();
        else if (v.a.playState === 'paused') v.a.play();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [still]);

  return (
    <>
      {current.map((p) => {
        const k = kinds[p.kind]!;
        // Still (reduced motion), or before the animation starts: the sprite where its phase puts it.
        const at = pathAt(p, p.phase);
        const img: CSSProperties = {
          position: 'absolute',
          left: 0,
          top: 0,
          width: p.w,
          height: p.h,
          maxWidth: 'none',
          transform: p.mirror ? 'scaleX(-1)' : undefined,
          ...masked(p.mask),
        };
        return (
          <div
            key={p.key}
            ref={(el) => {
              if (el) els.current.set(p.key, el);
              else els.current.delete(p.key);
            }}
            className="absolute top-0 left-0"
            style={{
              width: p.w,
              height: p.h,
              transform: `translate3d(${at.x}px, ${at.y}px, 0)`,
              willChange: still ? undefined : 'transform',
              mixBlendMode: k.blend && k.blend !== 'normal' ? k.blend : undefined,
            }}
            data-cloud={p.src}
          >
            {p.shadow && (
              <img
                src={p.src}
                alt=""
                draggable={false}
                decoding="async"
                fetchPriority="low"
                data-cloud-shadow=""
                style={{
                  ...img,
                  left: p.shadow.dx * p.w,
                  top: p.shadow.dy * p.w,
                  opacity: p.shadow.opacity,
                  filter: `brightness(0) blur(${p.shadow.blur}px)`,
                }}
              />
            )}
            <img
              src={p.src}
              alt=""
              draggable={false}
              decoding="async"
              fetchPriority="low"
              style={{
                ...img,
                opacity: p.opacity,
                filter: k.tint ? `url(#${filterId}-${p.kind})` : undefined,
              }}
            />
          </div>
        );
      })}
    </>
  );
});

/**
 * One depth of the sky: its plane follows the map with the depth's parallax; its sprites mount
 * `delayMs` after the rest of the sky (the high wisps load last) and fade in.
 */
function DepthPlane({
  depth,
  paths,
  plane,
  still,
  filterId,
  fadeInMs,
  next,
}: {
  depth: CloudDepth;
  paths: CloudPath[];
  plane: CSSProperties;
  still: boolean;
  filterId: string;
  fadeInMs: number;
  next: (p: CloudPath) => CloudPath;
}) {
  const [on, setOn] = useState(depth.delayMs <= 0);
  const [shown, setShown] = useState(on);
  useEffect(() => {
    if (on) return;
    const t = setTimeout(() => setOn(true), depth.delayMs);
    return () => clearTimeout(t);
  }, [on, depth.delayMs]);
  useEffect(() => {
    if (!on || shown) return;
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [on, shown]);
  if (!on) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: shown ? 1 : 0,
        transition: `opacity ${fadeInMs}ms ease`,
      }}
      data-depth={depth.name}
    >
      <div style={plane}>
        <CloudSet paths={paths} kinds={depth.kinds} still={still} filterId={filterId} next={next} />
      </div>
    </div>
  );
}

/**
 * Map atmosphere (clouds.ts): sprites drifting over the map art, under the pins and overlays, with
 * `pointer-events: none` so every tap goes through. Each time of day is up to three depths (low,
 * middle, high), each a plane laid out on the at-rest box that follows the map's view with its own
 * parallax (`cloudPlane`); the sprites drift across them with transform-only Web Animations
 * (composited, paused in a hidden tab, none with reduced motion). Day and night cross-fade with the
 * map; a place being open fades the layer.
 */
export function CloudLayer({
  config,
  isNight,
  box,
  pictureW,
  view,
  rest,
  transition,
  moving,
  zoomed,
  fade,
  fadeMs,
  zoomMs,
  reducedMotion,
}: CloudLayerProps) {
  const uid = `ig${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  // The sprites come after the map's own first tiles, then fade in.
  const [ready, setReady] = useState(config.startDelayMs <= 0);
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => setReady(true), config.startDelayMs);
    return () => clearTimeout(t);
  }, [ready, config.startDelayMs]);
  const [shown, setShown] = useState(ready);
  useEffect(() => {
    if (!ready) return;
    const r = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(r);
  }, [ready]);

  // Only the current time's sprites are loaded; both during the cross-fade.
  const [mounted, setMounted] = useState({ day: !isNight, night: isNight });
  useEffect(() => {
    setMounted((m) => (isNight ? { ...m, night: true } : { ...m, day: true }));
    const t = setTimeout(
      () => setMounted(isNight ? { day: false, night: true } : { day: true, night: false }),
      fadeMs + 50,
    );
    return () => clearTimeout(t);
  }, [isNight, fadeMs]);

  const opts = { margin: config.margin, speed: config.speed, opacity: config.opacity };
  const optsKey = `${opts.margin},${opts.speed},${opts.opacity}`;
  const W = Math.round(box.w);
  const H = Math.round(box.h);
  const P = Math.round(pictureW);
  const dayPaths = useMemo(
    () => config.day.map((d) => cloudPaths(d, { w: W, h: H }, P, opts, 7)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.day, W, H, P, optsKey],
  );
  const nightPaths = useMemo(
    () => config.night.map((d) => cloudPaths(d, { w: W, h: H }, P, opts, 13)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.night, W, H, P, optsKey],
  );

  // Each depth's next pass for a slot, stable while the box and the config are.
  const nextDay = useMemo(
    () => config.day.map((d) => (p: CloudPath) => cloudPass(d, p, { w: W, h: H }, P, opts, 7)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.day, W, H, P, optsKey],
  );
  const nextNight = useMemo(
    () => config.night.map((d) => (p: CloudPath) => cloudPass(d, p, { w: W, h: H }, P, opts, 13)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.night, W, H, P, optsKey],
  );

  const plane = (p: number): CSSProperties => {
    const v = cloudPlane(view, rest, p);
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      width: 0,
      height: 0,
      transform: `translate(${v.x}px, ${v.y}px) scale(${v.scale})`,
      transformOrigin: '0 0',
      transition,
      willChange: moving ? 'transform' : 'auto',
    };
  };
  const still = reducedMotion;
  const level = (zoomed ? config.zoomedOpacity : 1) * (still ? config.reducedMotionOpacity : 1);

  // One SVG colour matrix per tinted kind (the night's fog and curls), painted once per sprite.
  const filters = (['day', 'night'] as const).flatMap((time) =>
    config[time].flatMap((d) =>
      d.kinds.map((k, i) =>
        k.tint ? (
          <filter
            key={`${time}-${d.name}-${i}`}
            id={`${uid}-${time}-${d.name}-${i}`}
            colorInterpolationFilters="sRGB"
          >
            <feColorMatrix
              type="matrix"
              values={[
                [k.tint.keep, 0, 0, 0, ((1 - k.tint.keep) * k.tint.color[0]) / 255],
                [0, k.tint.keep, 0, 0, ((1 - k.tint.keep) * k.tint.color[1]) / 255],
                [0, 0, k.tint.keep, 0, ((1 - k.tint.keep) * k.tint.color[2]) / 255],
                [0, 0, 0, k.tint.alpha, 0],
              ]
                .map((r) => r.map((n) => +n.toFixed(4)).join(' '))
                .join('  ')}
            />
          </filter>
        ) : null,
      ),
    ),
  );

  const sky = (time: 'day' | 'night', paths: CloudPath[][], next: Array<(p: CloudPath) => CloudPath>) =>
    config[time].map((d, i) => (
      <DepthPlane
        key={d.name}
        depth={d}
        paths={paths[i]!}
        plane={plane(d.parallax)}
        still={still}
        filterId={`${uid}-${time}-${d.name}`}
        fadeInMs={config.fadeInMs}
        next={next[i]!}
      />
    ));

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      data-testid="map-clouds"
      data-time={isNight ? 'night' : 'day'}
      data-drift={still ? 'off' : 'on'}
      style={{ opacity: shown ? 1 : 0, transition: `opacity ${config.fadeInMs}ms ease` }}
    >
      <div
        className="absolute inset-0"
        style={{ opacity: level, transition: `opacity ${zoomMs}ms ease` }}
        data-testid="map-clouds-level"
      >
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
          <defs>{filters}</defs>
        </svg>
        {ready && mounted.day && (
          <div
            style={{ position: 'absolute', inset: 0, opacity: isNight ? 0 : 1, transition: fade }}
            data-testid="map-clouds-day"
          >
            {sky('day', dayPaths, nextDay)}
          </div>
        )}
        {ready && mounted.night && (
          <div
            style={{ position: 'absolute', inset: 0, opacity: isNight ? 1 : 0, transition: fade }}
            data-testid="map-clouds-night"
          >
            {sky('night', nightPaths, nextNight)}
          </div>
        )}
      </div>
    </div>
  );
}
