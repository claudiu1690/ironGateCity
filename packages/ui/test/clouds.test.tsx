import { getContent } from '@irongate/content';
import { cityViewFixture } from '@irongate/rules/testing';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOUDS, CityMap, NIGHT_FADE_MS, ZOOM_MS, cloudPaths, cloudPlane } from '../src';

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

describe('the sky', () => {
  const box = { w: 390, h: 660 };
  const opts = { margin: CLOUDS.margin, speed: 1, opacity: 1 };

  it('at most ten sprites a time of day (shadows count), within the opacity ranges', () => {
    for (const kinds of [CLOUDS.day, CLOUDS.night]) {
      const paths = cloudPaths(kinds, box, 600, opts);
      const sprites = paths.length + paths.filter((p) => p.shadow).length;
      expect(sprites).toBeLessThanOrEqual(10);
      expect(paths.length).toBeGreaterThanOrEqual(3);
      for (const p of paths) {
        const [lo, hi] = kinds[p.kind]!.opacity;
        expect(p.opacity).toBeGreaterThanOrEqual(lo);
        expect(p.opacity).toBeLessThanOrEqual(hi);
      }
    }
    // Shadows by day only.
    expect(cloudPaths(CLOUDS.day, box, 600, opts).some((p) => p.shadow)).toBe(true);
    expect(cloudPaths(CLOUDS.night, box, 600, opts).some((p) => p.shadow)).toBe(false);
  });

  it('every path enters and leaves off-screen, crossing the map in the configured time', () => {
    for (const p of cloudPaths(CLOUDS.day, box, 600, opts)) {
      expect(p.x0 + p.w).toBeLessThan(0);
      expect(p.x1).toBeGreaterThan(box.w);
      const [lo, hi] = CLOUDS.day[p.kind]!.cross;
      const crossing = (p.duration / 1000) * ((box.w + p.w) / (p.x1 - p.x0));
      expect(crossing).toBeGreaterThanOrEqual(lo - 1e-6);
      expect(crossing).toBeLessThanOrEqual(hi + 1e-6);
    }
  });

  it('the same sky on every visit; the dev speed multiplier shortens the crossings', () => {
    expect(cloudPaths(CLOUDS.day, box, 600, opts)).toEqual(cloudPaths(CLOUDS.day, box, 600, opts));
    const fast = cloudPaths(CLOUDS.day, box, 600, { ...opts, speed: 10 });
    const slow = cloudPaths(CLOUDS.day, box, 600, opts);
    expect(fast[0]!.duration).toBeCloseTo(slow[0]!.duration / 10, 6);
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
  beforeEach(() => {
    vi.useFakeTimers();
    animate = vi.fn(() => ({ currentTime: 0, cancel: vi.fn(), pause: vi.fn(), play: vi.fn() }));
    (Element.prototype as unknown as { animate: unknown }).animate = animate;
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete (Element.prototype as unknown as { animate?: unknown }).animate;
  });
  const start = () => act(() => vi.advanceTimersByTime(CLOUDS.startDelayMs + 20));
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
    expect(layer.querySelectorAll('[data-cloud]').length).toBe(CLOUDS.day.reduce((n, k) => n + k.count, 0));
    expect(animate).toHaveBeenCalled();
    const [frames, opts] = animate.mock.calls[0]! as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(frames.every((f) => Object.keys(f).every((k) => k === 'transform'))).toBe(true);
    expect(opts.iterations).toBe(Infinity);
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
    expect(sprites.length).toBe(CLOUDS.night.reduce((n, k) => n + k.count, 0));
    expect(sprites.every((e) => e.getAttribute('data-cloud')!.includes('fog-night'))).toBe(true);
    expect(night.querySelectorAll('[data-cloud-shadow]')).toHaveLength(0);
  });
});
