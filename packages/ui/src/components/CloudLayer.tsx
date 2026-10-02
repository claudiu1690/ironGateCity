import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { cloudPaths, cloudPlane, pathAt } from '../clouds';
import type { CloudConfig, CloudKind, CloudPath } from '../clouds';

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
  /** The view shown, and the at-rest view the plane is laid out on. */
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

/** One time of day's sprites, each drifting on its own path (Web Animations, transform only). */
function CloudSet({
  paths,
  kinds,
  still,
  filterId,
}: {
  paths: CloudPath[];
  kinds: readonly CloudKind[];
  still: boolean;
  filterId: string;
}) {
  const els = useRef(new Map<string, HTMLDivElement>());
  const anims = useRef(new Map<string, { a: Animation; duration: number }>());
  const pathsKey = paths
    .map((p) => `${p.key}:${p.x0.toFixed(1)},${p.y0.toFixed(1)},${p.x1.toFixed(1)},${p.duration.toFixed(0)}`)
    .join('|');

  useEffect(() => {
    if (still) return;
    const next = new Map<string, { a: Animation; duration: number }>();
    for (const p of paths) {
      const el = els.current.get(p.key);
      if (!el || typeof el.animate !== 'function') continue;
      // A resize keeps each sprite's progress along its (new) path.
      const old = anims.current.get(p.key);
      const t0 = old ? (Number(old.a.currentTime ?? 0) % old.duration) / old.duration : p.phase;
      old?.a.cancel();
      const a = el.animate(
        [
          { transform: `translate3d(${p.x0}px, ${p.y0}px, 0)` },
          { transform: `translate3d(${p.x1}px, ${p.y1}px, 0)` },
        ],
        { duration: p.duration, iterations: Infinity, easing: 'linear' },
      );
      a.currentTime = t0 * p.duration;
      if (typeof document !== 'undefined' && document.hidden) a.pause();
      next.set(p.key, { a, duration: p.duration });
    }
    for (const [k, v] of anims.current) if (!next.has(k)) v.a.cancel();
    anims.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathsKey, still]);

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
        else v.a.play();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [still]);

  return (
    <>
      {paths.map((p) => {
        const k = kinds[p.kind]!;
        // Still (reduced motion), or before the animation starts: the sprite where its phase puts it.
        const at = pathAt(p, p.phase);
        const flip = p.mirror ? ' scaleX(-1)' : '';
        const img: CSSProperties = {
          position: 'absolute',
          left: 0,
          top: 0,
          width: p.w,
          height: p.h,
          maxWidth: 'none',
          transform: flip ? flip.trim() : undefined,
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
}

/**
 * Map atmosphere (clouds.ts): sprites drifting over the map art, under the pins and overlays, with
 * `pointer-events: none` so every tap goes through. Each time of day is a plane laid out on the
 * at-rest box that follows the map's view with a little parallax (`cloudPlane`); the sprites drift
 * across it with transform-only Web Animations (composited, paused in a hidden tab, none with
 * reduced motion). Day and night cross-fade with the map; a place being open fades the layer.
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
    () => cloudPaths(config.day, { w: W, h: H }, P, opts, 7),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.day, W, H, P, optsKey],
  );
  const nightPaths = useMemo(
    () => cloudPaths(config.night, { w: W, h: H }, P, opts, 13),
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

  const filters = config.night.map((k, i) =>
    k.tint ? (
      <filter key={i} id={`${uid}-fog-${i}`} colorInterpolationFilters="sRGB">
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
  );

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
            <div style={plane(config.parallax.day)}>
              <CloudSet paths={dayPaths} kinds={config.day} still={still} filterId={`${uid}-day`} />
            </div>
          </div>
        )}
        {ready && mounted.night && (
          <div
            style={{ position: 'absolute', inset: 0, opacity: isNight ? 1 : 0, transition: fade }}
            data-testid="map-clouds-night"
          >
            <div style={plane(config.parallax.night)}>
              <CloudSet paths={nightPaths} kinds={config.night} still={still} filterId={`${uid}-fog`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
