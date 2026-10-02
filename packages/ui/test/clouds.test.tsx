import { getContent } from '@irongate/content';
import { cityViewFixture } from '@irongate/rules/testing';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CLOUDS,
  CityMap,
  NIGHT_FADE_MS,
  ZOOM_MS,
  cloudPass,
  cloudPaths,
  cloudPlane,
  spriteCount,
} from '../src';

/**
 * Map atmosphere (clouds.ts, CloudLayer): clouds by day and fog by night over the city map, tried on
 * Coalport; above the art, under the pins, never in the way of a tap.
 */

const content = getContent();

describe('the cloud plane follows the map with a little parallax', () => {
  const rest = { scale: 1, x: -100, y: -50 };

  it('at rest it is the box itself', () => {
    const v = cloudPlane(rest, rest, 0.12);
    expect(v.scale).toBeCloseTo(1, 9);
    expect(v.x).toBeCloseTo(0, 9);
    expect(v.y).toBeCloseTo(0, 9);
  });

  it('a drag moves it (1 + parallax) × as far as the map', () => {
    const v = cloudPlane({ scale: 1, x: -140, y: -20 }, rest, 0.12);
    expect(v.scale).toBeCloseTo(1, 9);
    expect(v.x).toBeCloseTo(-40 * 1.12, 6);
    expect(v.y).toBeCloseTo(30 * 1.12, 6);
  });

  it('a zoom grows it a little more than the map, about the same fixed point', () => {
    // The map zooms 2.5 × about the box point (200, 300): screen = 2.5 q + (1 − 2.5)(200, 300).
    const a = 2.5;
    const view = { scale: a, x: a * rest.x + (1 - a) * 200, y: a * rest.y + (1 - a) * 300 };
    const v = cloudPlane(view, rest, 0.12);
    expect(v.scale).toBeCloseTo(a ** 1.12, 9);
    expect(v.scale).toBeGreaterThan(a);
    // The fixed point stays put on the plane too.
    expect(v.scale * 200 + v.x).toBeCloseTo(200, 6);
    expect(v.scale * 300 + v.y).toBeCloseTo(300, 6);
  });
});

describe('the sky: three depths', () => {
  const box = { w: 390, h: 660 };
  const opts = { margin: CLOUDS.margin, speed: 1, opacity: 1 };
  const depth = (time: 'day' | 'night', name: string) => CLOUDS[time].find((d) => d.name === name)!;
  const meanCross = (time: 'day' | 'night', name: string) => {
    const ks = depth(time, name).kinds;
    return (
      ks.reduce((t, k) => t + ((k.cross[0] + k.cross[1]) / 2) * k.count, 0) /
      ks.reduce((t, k) => t + k.count, 0)
    );
  };

  it('by day high, middle and low; by night low and middle; at most 14 images each (shadows count)', () => {
    expect(CLOUDS.day.map((d) => d.name)).toEqual(['low', 'middle', 'high']);
    expect(CLOUDS.night.map((d) => d.name)).toEqual(['low', 'middle']);
    for (const time of ['day', 'night'] as const) {
      expect(spriteCount(CLOUDS[time])).toBeLessThanOrEqual(14);
      const paths = CLOUDS[time].flatMap((d) => cloudPaths(d, box, 600, opts));
      expect(paths.length + paths.filter((p) => p.shadow).length).toBe(spriteCount(CLOUDS[time]));
    }
    expect(spriteCount(CLOUDS.day)).toBeGreaterThanOrEqual(12);
  });

  it('higher is faster and has more parallax; the high wisps load last; shadows in the middle only', () => {
    for (const time of ['day', 'night'] as const) {
      const ds = CLOUDS[time];
      for (let i = 1; i < ds.length; i++) {
        expect(ds[i]!.parallax).toBeGreaterThan(ds[i - 1]!.parallax);
        expect(meanCross(time, ds[i]!.name)).toBeLessThan(meanCross(time, ds[i - 1]!.name));
      }
    }
    expect(depth('day', 'high').delayMs).toBeGreaterThan(0);
    expect(depth('day', 'middle').delayMs).toBe(0);
    for (const d of [...CLOUDS.day, ...CLOUDS.night])
      for (const k of d.kinds) expect(!!k.shadow, `${d.name}`).toBe(d === depth('day', 'middle'));
    for (const k of depth('day', 'high').kinds) {
      expect(k.cross[0]).toBeGreaterThanOrEqual(40);
      expect(k.cross[1]).toBeLessThanOrEqual(80);
    }
  });

  it('each sprite its own size, speed and heading: no two move alike; within the opacity ranges', () => {
    for (const time of ['day', 'night'] as const) {
      for (const d of CLOUDS[time]) {
        const paths = cloudPaths(d, box, 600, opts);
        const motion = paths.map(
          (p) => `${p.w.toFixed(1)}|${p.duration.toFixed(0)}|${(p.y1 - p.y0).toFixed(1)}`,
        );
        expect(new Set(motion).size).toBe(paths.length);
        for (const p of paths) {
          const [lo, hi] = d.kinds[p.kind]!.opacity;
          expect(p.opacity).toBeGreaterThanOrEqual(lo);
          expect(p.opacity).toBeLessThanOrEqual(hi);
        }
      }
    }
    // Some mirrored, some not, across the day.
    const mirrors = CLOUDS.day.flatMap((d) => cloudPaths(d, box, 600, opts)).map((p) => p.mirror);
    expect(mirrors).toContain(true);
    expect(mirrors).toContain(false);
  });

  it('every path enters and leaves off-screen, crossing the map in the configured time', () => {
    for (const d of CLOUDS.day)
      for (const p of cloudPaths(d, box, 600, opts)) {
        expect(p.x0 + p.w).toBeLessThan(0);
        expect(p.x1).toBeGreaterThan(box.w);
        const [lo, hi] = d.kinds[p.kind]!.cross;
        const crossing = (p.duration / 1000) * ((box.w + p.w) / (p.x1 - p.x0));
        expect(crossing).toBeGreaterThanOrEqual(lo - 1e-6);
        expect(crossing).toBeLessThanOrEqual(hi + 1e-6);
      }
  });

  it('the same sky on every visit; the dev speed multiplier shortens the crossings', () => {
    const mid = depth('day', 'middle');
    expect(cloudPaths(mid, box, 600, opts)).toEqual(cloudPaths(mid, box, 600, opts));
    const fast = cloudPaths(mid, box, 600, { ...opts, speed: 10 });
    const slow = cloudPaths(mid, box, 600, opts);
    expect(fast[0]!.duration).toBeCloseTo(slow[0]!.duration / 10, 6);
  });

  it('each pass of a slot is another shape, size, speed and heading, from off-screen, in its lane', () => {
    for (const d of CLOUDS.day) {
      for (const first of cloudPaths(d, box, 600, opts)) {
        let p = first;
        const seen = new Set([p.src]);
        for (let i = 0; i < 6; i++) {
          const n = cloudPass(d, p, box, 600, opts);
          expect(n.key).toBe(first.key);
          expect(n.pass).toBe(p.pass + 1);
          expect(n.lane).toBe(first.lane);
          expect(n.phase).toBe(0);
          expect(n.x0 + n.w).toBeLessThan(0);
          if (d.kinds[p.kind]!.sprites.length > 1) expect(n.src).not.toBe(p.src);
          expect(`${n.w}|${n.duration}`).not.toBe(`${p.w}|${p.duration}`);
          // The same sequence on every visit.
          expect(cloudPass(d, p, box, 600, opts)).toEqual(n);
          seen.add(n.src);
          p = n;
        }
        if (d.kinds[first.kind]!.sprites.length > 2) expect(seen.size).toBeGreaterThan(2);
      }
    }
  });

  it('the art is clean: no sprite needs a mask', () => {
    const masked = [...CLOUDS.day, ...CLOUDS.night]
      .flatMap((d) => d.kinds.flatMap((k) => k.sprites))
      .filter((s) => s.mask)
      .map((s) => s.src);
    expect(masked).toEqual([]);
  });
});

describe('CityMap clouds', () => {
  const props = {
    map: cityViewFixture.map,
    isNight: false,
    locations: cityViewFixture.locations,
    selectedId: null as string | null,
    onSelect: () => undefined,
  };
  let animate: ReturnType<typeof vi.fn>;
  let anims: Array<{ el: HTMLElement; onfinish: null | (() => void) }>;
  beforeEach(() => {
    vi.useFakeTimers();
    animate = vi.fn(function (this: HTMLElement) {
      const a = { el: this, currentTime: 0, cancel: vi.fn(), pause: vi.fn(), play: vi.fn(), onfinish: null };
      anims.push(a);
      return a;
    });
    anims = [];
    (Element.prototype as unknown as { animate: unknown }).animate = animate;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete (Element.prototype as unknown as { animate?: unknown }).animate;
  });
  /** The sky after its start delay, and the high depth after its own. */
  const start = () => act(() => vi.advanceTimersByTime(CLOUDS.startDelayMs + 20));
  const all = () => act(() => vi.advanceTimersByTime(Math.max(...CLOUDS.day.map((d) => d.delayMs)) + 20));
  const count = (time: 'day' | 'night') =>
    CLOUDS[time].reduce((n, d) => n + d.kinds.reduce((m, k) => m + k.count, 0), 0);
  const clouds = () => screen.queryByTestId('map-clouds');

  it('on Coalport only: the content switches it on for Coalport, not the other cities', () => {
    expect(content.city('coalport')!.clouds).toBe(true);
    for (const id of ['duskwall', 'ashford']) expect(content.city(id)!.clouds).toBeFalsy();
    const { rerender } = render(<CityMap {...props} clouds={content.city('coalport')!.clouds} />);
    expect(clouds()).not.toBeNull();
    rerender(<CityMap {...props} clouds={content.city('duskwall')!.clouds} />);
    expect(clouds()).toBeNull();
    rerender(<CityMap {...props} />);
    expect(clouds()).toBeNull();
  });

  it('above the art, below the pins, with no pointer events: taps go through', () => {
    render(<CityMap {...props} clouds />);
    start();
    const layer = clouds()!;
    expect(layer).toHaveClass('pointer-events-none');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    const art = screen.getByTestId('map-layer');
    const pin = screen.getAllByTestId('hotspot')[0]!;
    expect(art.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(layer.compareDocumentPosition(pin) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(layer.contains(pin)).toBe(false);
    // Nothing inside it takes a pointer or focus.
    expect(layer.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0);
    // The day's sprites, after the start delay (the map's tiles first), drifting by transform only.
    expect(layer).toHaveAttribute('data-time', 'day');
    expect(layer).toHaveAttribute('data-drift', 'on');
    // The high wisps come last.
    expect(layer.querySelector('[data-depth=high]')).toBeNull();
    all();
    expect([...layer.querySelectorAll<HTMLElement>('[data-depth]')].map((e) => e.dataset.depth)).toEqual([
      'low',
      'middle',
      'high',
    ]);
    expect(layer.querySelectorAll('[data-cloud]').length).toBe(count('day'));
    expect(layer.querySelectorAll('img').length).toBe(spriteCount(CLOUDS.day));
    expect(animate).toHaveBeenCalled();
    const [frames, opts] = animate.mock.calls[0]! as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(frames.every((f) => Object.keys(f).every((k) => k === 'transform'))).toBe(true);
    // One crossing at a time: when it ends, the slot comes back as another shape from off-screen.
    expect(opts.fill).toBe('forwards');
    const anim = anims.find((a) => a.el.closest('[data-depth=middle]'))!;
    const slot = anim.el;
    const before = slot.dataset.cloud;
    const calls = animate.mock.calls.length;
    act(() => anim.onfinish!());
    expect(animate.mock.calls.length).toBe(calls + 1);
    expect(slot.isConnected).toBe(true);
    expect(slot.dataset.cloud).not.toBe(before);
  });

  it('reduced motion: the clouds stand still (no animation), fainter', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    render(<CityMap {...props} clouds />);
    start();
    expect(clouds()).toHaveAttribute('data-drift', 'off');
    expect(clouds()!.querySelectorAll('[data-cloud]').length).toBeGreaterThan(0);
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByTestId('map-clouds-level').style.opacity).toBe(String(CLOUDS.reducedMotionOpacity));
  });

  it('fades when a place is open, over the zoom, and comes back when it closes', () => {
    const { rerender } = render(<CityMap {...props} clouds />);
    start();
    const level = () => screen.getByTestId('map-clouds-level');
    expect(level().style.opacity).toBe('1');
    expect(level().style.transition).toBe(`opacity ${ZOOM_MS}ms ease`);
    rerender(<CityMap {...props} clouds selectedId={props.locations[0]!.id} />);
    expect(level().style.opacity).toBe(String(CLOUDS.zoomedOpacity));
    rerender(<CityMap {...props} clouds selectedId={null} />);
    expect(level().style.opacity).toBe('1');
  });

  it('day and night follow the map and cross-fade: fog at night, no shadows', () => {
    const { rerender } = render(<CityMap {...props} clouds />);
    start();
    expect(screen.queryByTestId('map-clouds-night')).toBeNull();
    expect(clouds()!.querySelectorAll('[data-cloud-shadow]').length).toBeGreaterThan(0);
    rerender(<CityMap {...props} clouds isNight />);
    expect(clouds()).toHaveAttribute('data-time', 'night');
    expect(screen.getByTestId('map-clouds-night').style.opacity).toBe('1');
    expect(screen.getByTestId('map-clouds-day').style.opacity).toBe('0');
    act(() => vi.advanceTimersByTime(NIGHT_FADE_MS + 60));
    expect(screen.queryByTestId('map-clouds-day')).toBeNull();
    const night = screen.getByTestId('map-clouds-night');
    const sprites = [...night.querySelectorAll('[data-cloud]')];
    expect(sprites.length).toBe(count('night'));
    expect(sprites.every((e) => /(fog|mistcurl)-night/.test(e.getAttribute('data-cloud')!))).toBe(true);
    expect(night.querySelectorAll('[data-cloud-shadow]')).toHaveLength(0);
  });
});
