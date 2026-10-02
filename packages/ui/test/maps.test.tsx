import { getContent } from '@irongate/content';
import { cityViewFixture, mapFixture } from '@irongate/rules/testing';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DETAIL_SETTLE_MS } from '../src/components/TileLayer';
import {
  CityMap,
  FRAME_PAN_MARGIN,
  NIGHT_FADE_MS,
  ZOOM_MS,
  contentFor,
  fitPinsView,
  PIN_GAP,
  panLimits,
  pyramidFor,
  spreadPins,
  zoomView,
} from '../src';
import type { MapInsets, MapRect, TilePyramid } from '../src';

/**
 * Maps v3 (docs/design/maps-v3-integration.md §2, §5.2, §6, §7): a quarter is a frame on the city's
 * one picture; the art comes as tiles with the stills as the fallback; day and night fade quickly.
 */

const content = getContent();
const cities = ['coalport', 'duskwall', 'ashford'] as const;
const frameOf = (id: string) => content.city(id)!.quarters[0]!.frame;
const pinsOf = (id: string) => content.city(id)!.locations.map((l) => l.map);

describe('the frame covers the box at scale 1 (§2)', () => {
  const BOXES = [
    { w: 390, h: 600 },
    { w: 1440, h: 814 },
    { w: 812, h: 375 },
  ];

  it('for each first quarter and screen: the frame fills the box on one axis and covers it on both', () => {
    for (const id of cities)
      for (const box of BOXES) {
        const f = frameOf(id);
        const c = contentFor(box, 1, f);
        const fw = (f.x1 - f.x0) * c.w;
        const fh = (f.y1 - f.y0) * c.h;
        const label = `${id} ${box.w}×${box.h}`;
        expect(fw, label).toBeGreaterThanOrEqual(box.w - 1e-6);
        expect(fh, label).toBeGreaterThanOrEqual(box.h - 1e-6);
        expect(Math.min(fw - box.w, fh - box.h), label).toBeCloseTo(0, 6);
      }
  });

  it('the whole picture as the frame is the old rule: the picture covers the box', () => {
    expect(contentFor({ w: 390, h: 600 }, 1)).toEqual({ w: 600, h: 600 });
    expect(contentFor({ w: 1440, h: 814 }, 1)).toEqual({ w: 1440, h: 1440 });
  });
});

describe('every v3 pin clear in the first view (QA M2 fixtures)', () => {
  const PIN_CLEAR = 22; // half the 44 px target
  // The overlays the city page puts over the map at these sizes (measured on the slice-2 screens):
  // a phone's plate and orders as bands; a desktop's plate in its corner and the tab dock as blocks; a
  // phone held sideways has its plate beside the map, not over it.
  const CASES: Array<{ box: { w: number; h: number }; insets: MapInsets }> = [
    { box: { w: 390, h: 600 }, insets: { top: 118, bottom: 92, blocks: [] } },
    {
      box: { w: 1440, h: 814 },
      insets: {
        top: 0,
        bottom: 0,
        blocks: [
          { x0: 10, y0: 10, x1: 430, y1: 330 },
          { x0: 560, y0: 742, x1: 880, y1: 804 },
        ],
      },
    },
    { box: { w: 812, h: 375 }, insets: { top: 0, bottom: 0, blocks: [] } },
  ];

  it('no pin off screen, under a band or under a block, for the three home cities', () => {
    for (const id of cities)
      for (const { box, insets } of CASES) {
        const c = contentFor(box, 1, frameOf(id));
        const v = fitPinsView({ box, content: c, pins: pinsOf(id), insets });
        for (const p of pinsOf(id)) {
          const x = v.x + p.x * c.w * v.scale;
          const y = v.y + p.y * c.h * v.scale;
          const label = `${id} ${box.w}×${box.h} pin ${p.x},${p.y}`;
          expect(x - PIN_CLEAR, label).toBeGreaterThanOrEqual(0);
          expect(x + PIN_CLEAR, label).toBeLessThanOrEqual(box.w);
          expect(y - PIN_CLEAR, label).toBeGreaterThanOrEqual(insets.top);
          expect(y + PIN_CLEAR, label).toBeLessThanOrEqual(box.h - insets.bottom);
          for (const b of insets.blocks ?? [])
            expect(
              x + PIN_CLEAR <= b.x0 ||
                x - PIN_CLEAR >= b.x1 ||
                y + PIN_CLEAR <= b.y0 ||
                y - PIN_CLEAR >= b.y1,
              `${label} under a block`,
            ).toBe(true);
        }
      }
  });
});

describe('a zoomed drag stays near the frame (§2: no free pan)', () => {
  const box = { w: 390, h: 600 };
  const f = frameOf('coalport');
  const c = contentFor(box, 1, f);

  it('the frame grown by 25 % covers the box at both limits; the whole picture would allow more', () => {
    const fitted = fitPinsView({ box, content: c, pins: pinsOf('coalport'), insets: { top: 0, bottom: 0 } });
    const z = zoomView({ box, content: c, fitted, pin: { x: 0.42, y: 0.35 }, maxScale: 3 });
    const lim = panLimits(box, c, z, f);
    const cw = c.w * z.scale;
    const ch = c.h * z.scale;
    const g = {
      x0: Math.max(0, f.x0 - FRAME_PAN_MARGIN * (f.x1 - f.x0)),
      x1: Math.min(1, f.x1 + FRAME_PAN_MARGIN * (f.x1 - f.x0)),
      y0: Math.max(0, f.y0 - FRAME_PAN_MARGIN * (f.y1 - f.y0)),
      y1: Math.min(1, f.y1 + FRAME_PAN_MARGIN * (f.y1 - f.y0)),
    };
    expect(lim.x[1]).toBeCloseTo(Math.max(-g.x0 * cw, z.x), 6);
    expect(lim.x[0]).toBeCloseTo(Math.min(box.w - g.x1 * cw, z.x), 6);
    expect(lim.y[0]).toBeCloseTo(Math.min(box.h - g.y1 * ch, z.y), 6);
    expect(lim.y[1]).toBeCloseTo(Math.max(-g.y0 * ch, z.y), 6);
    const whole = panLimits(box, c, z);
    expect(whole.x[1] - whole.x[0]).toBeGreaterThan(lim.x[1] - lim.x[0]);
    // The zoomed view itself is always allowed.
    expect(z.x).toBeGreaterThanOrEqual(lim.x[0]);
    expect(z.x).toBeLessThanOrEqual(lim.x[1]);
  });

  it('in the map: a long drag stops where the grown frame meets the box edge', () => {
    vi.useFakeTimers();
    try {
      const props = {
        map: cityViewFixture.map,
        isNight: false,
        locations: cityViewFixture.locations,
        onSelect: () => undefined,
        frame: f,
      };
      const { rerender } = render(<CityMap {...props} selectedId={null} />);
      rerender(<CityMap {...props} selectedId="coalport.union-hall" />);
      act(() => vi.advanceTimersByTime(ZOOM_MS));
      const map = screen.getByTestId('city-map');
      const [, , scale] = map.getAttribute('data-view')!.split(',').map(Number);
      fireEvent.pointerDown(map, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(map, { pointerId: 1, clientX: 5100, clientY: 5100 });
      fireEvent.pointerUp(map, { pointerId: 1 });
      const [x, y] = map.getAttribute('data-view')!.split(',').map(Number);
      // jsdom's box is 390 × 480; the grown frame's top-left corner sits on the box's.
      const jc = contentFor({ w: 390, h: 480 }, 1, f);
      const gx0 = Math.max(0, f.x0 - FRAME_PAN_MARGIN * (f.x1 - f.x0));
      const gy0 = Math.max(0, f.y0 - FRAME_PAN_MARGIN * (f.y1 - f.y0));
      expect(x).toBeCloseTo(-gx0 * jc.w * scale!, 0);
      expect(y).toBeCloseTo(-gy0 * jc.h * scale!, 0);
      expect(x).toBeLessThan(0); // not the picture's own edge: the drag stopped short of it
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('CityMap with tiles (§5.2)', () => {
  const tiles = {
    day: pyramidFor(cityViewFixture.map.day, '/tiles')!,
    night: pyramidFor(cityViewFixture.map.night, '/tiles')!,
  };
  const props = {
    map: cityViewFixture.map,
    isNight: false,
    locations: cityViewFixture.locations,
    selectedId: null,
    onSelect: () => undefined,
    tiles,
    frame: frameOf('coalport'),
  };
  const layer = () => screen.getByTestId('map-layer');
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const settle = () => act(() => vi.advanceTimersByTime(DETAIL_SETTLE_MS));

  it('draws tiles, not the stills: the underlay, the detail, and the underlay tile as the backdrop', () => {
    render(<CityMap {...props} />);
    settle();
    expect(screen.getByTestId('city-map')).toHaveAttribute('data-art', 'tiles');
    expect(layer().querySelectorAll('picture')).toHaveLength(0);
    const srcs = [...layer().querySelectorAll('img[data-tile]')].map((i) => i.getAttribute('src')!);
    expect(srcs.length).toBeGreaterThan(1);
    expect(srcs.every((s) => s.startsWith('/tiles/map.coalport.day/1a2b3c4d/webp_files/'))).toBe(true);
    expect(srcs).toContain('/tiles/map.coalport.day/1a2b3c4d/webp_files/9/0_0.webp');
    expect(screen.getByTestId('map-backdrop').querySelector('img')!.getAttribute('src')).toBe(
      '/tiles/map.coalport.day/1a2b3c4d/webp_files/9/0_0.webp',
    );
    expect(screen.getAllByTestId('hotspot')).toHaveLength(2);
  });

  it('an underlay tile that fails switches to the stills, with the same pin elements', () => {
    render(<CityMap {...props} />);
    const pins = screen.getAllByTestId('hotspot');
    const underlay = layer().querySelector('img[data-tile^="9/"]')!;
    act(() => {
      fireEvent.error(underlay);
    });
    expect(screen.getByTestId('city-map')).toHaveAttribute('data-art', 'still');
    expect(layer().querySelectorAll('img[data-tile]')).toHaveLength(0);
    expect(layer().querySelector('picture source[type="image/avif"]')!.getAttribute('srcset')).toContain(
      'map.coalport.day-2048.avif',
    );
    const after = screen.getAllByTestId('hotspot');
    expect(after.every((p, i) => p === pins[i])).toBe(true);
  });

  it('a detail tile that fails is dropped; the tiles stay on', () => {
    render(<CityMap {...props} />);
    settle();
    const detail = [...layer().querySelectorAll('img[data-tile]')].find(
      (i) => !i.getAttribute('data-tile')!.startsWith('9/'),
    )!;
    act(() => {
      fireEvent.error(detail);
    });
    expect(screen.getByTestId('city-map')).toHaveAttribute('data-art', 'tiles');
  });

  it('without tiles (no origin): the stills', () => {
    render(<CityMap {...props} tiles={null} />);
    expect(screen.getByTestId('city-map')).toHaveAttribute('data-art', 'still');
    expect(layer().querySelectorAll('img[data-tile]')).toHaveLength(0);
  });
});

describe('day and night (§6)', () => {
  const tiles: { day: TilePyramid; night: TilePyramid } = {
    day: pyramidFor(mapFixture('map.coalport.day'), '/tiles')!,
    night: pyramidFor(mapFixture('map.coalport.night', '5e6f7a8b'), '/tiles')!,
  };
  const props = {
    map: cityViewFixture.map,
    locations: cityViewFixture.locations,
    selectedId: null,
    onSelect: () => undefined,
    frame: frameOf('coalport') as MapRect,
  };
  const tileLayers = () => screen.queryAllByTestId('tile-layer');
  afterEach(() => vi.unstubAllGlobals());

  it('a quick 250 ms fade', () => {
    render(<CityMap {...props} isNight={false} />);
    expect(NIGHT_FADE_MS).toBe(250);
    expect(screen.getByTestId('map-night').style.transition).toBe('opacity 250ms ease');
  });

  it('with tiles, the layer that faded out is unmounted after the flip: one set of tiles', () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<CityMap {...props} tiles={tiles} isNight />);
      expect(tileLayers()).toHaveLength(1); // a landing at night loads night only
      rerender(<CityMap {...props} tiles={tiles} isNight={false} />);
      expect(tileLayers()).toHaveLength(2); // both during the fade
      act(() => vi.advanceTimersByTime(300));
      expect(tileLayers()).toHaveLength(1);
      const srcs = [...document.querySelectorAll('img[data-tile]')].map((i) => i.getAttribute('src')!);
      expect(srcs.every((s) => s.includes('map.coalport.day'))).toBe(true);
      rerender(<CityMap {...props} tiles={tiles} isNight />);
      act(() => vi.advanceTimersByTime(300));
      expect(tileLayers()).toHaveLength(1);
      expect(screen.getByTestId('map-night').querySelector('[data-testid=tile-layer]')).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reduced motion: no fade', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q.includes('reduce'),
      media: q,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    render(<CityMap {...props} isNight={false} />);
    expect(screen.getByTestId('map-night').style.transition).toBe('none');
  });
});

describe('pins too close to tap apart are spread (small screens)', () => {
  const area = { x0: 0, y0: 100, x1: 360, y1: 400 };

  it('two pins 17 px apart end at least PIN_GAP apart, inside the area; clear pins stay put', () => {
    const pts = [
      { x: 150, y: 200 },
      { x: 160, y: 214 },
      { x: 300, y: 350 },
    ];
    const off = spreadPins(pts, area);
    const at = pts.map((p, i) => ({ x: p.x + off[i]!.x, y: p.y + off[i]!.y }));
    expect(Math.hypot(at[0]!.x - at[1]!.x, at[0]!.y - at[1]!.y)).toBeGreaterThanOrEqual(PIN_GAP - 0.5);
    expect(off[2]).toEqual({ x: 0, y: 0 });
    // The least move: each by about half the shortfall.
    expect(Math.hypot(off[0]!.x, off[0]!.y)).toBeLessThan(PIN_GAP / 2);
  });

  it('a cluster of four is cleared, within the area, and pins off screen are left alone', () => {
    const pts = [
      { x: 30, y: 110 },
      { x: 40, y: 120 },
      { x: 35, y: 130 },
      { x: 45, y: 105 },
      { x: 500, y: 200 },
      { x: 505, y: 205 },
    ];
    const off = spreadPins(pts, area);
    const at = pts.map((p, i) => ({ x: p.x + off[i]!.x, y: p.y + off[i]!.y }));
    for (let i = 0; i < 4; i++) {
      expect(at[i]!.x).toBeGreaterThanOrEqual(22);
      expect(at[i]!.y).toBeGreaterThanOrEqual(122);
      for (let j = i + 1; j < 4; j++)
        expect(Math.hypot(at[i]!.x - at[j]!.x, at[i]!.y - at[j]!.y)).toBeGreaterThanOrEqual(PIN_GAP - 1);
    }
    expect(off[4]).toEqual({ x: 0, y: 0 });
    expect(off[5]).toEqual({ x: 0, y: 0 });
  });
});
