import { getContent } from '@irongate/content';
import { cityViewFixture, mapFixture } from '@irongate/rules/testing';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DETAIL_SETTLE_MS } from '../src/components/TileLayer';
import {
  CityMap,
  FRAME_PAN_MARGIN,
  FREE_ZOOM_STEP,
  NIGHT_FADE_MS,
  ZOOM_MS,
  contentFor,
  coversBox,
  bboxOf,
  fitPinsView,
  freePanLimits,
  panLimits,
  PIN_GAP,
  pyramidFor,
  restPanLimits,
  zoomView,
} from '../src';
import type { MapInsets, MapRect, TilePyramid } from '../src';

/**
 * Maps v3 (docs/design/maps-v3-integration.md §2, §5.2, §6, §7): a quarter is a frame on the city's
 * one picture; the art comes as tiles with the stills as the fallback; day and night fade quickly.
 */

const content = getContent();
/**
 * Review 4 (ADR 0076): frames are the capital's districts' only (a home city is one map), so the frame
 * checks run over the five districts. The map's behaviour tests keep the Mill's old frame as a plain
 * rectangle around the fixture's Coalport pins.
 */
const cities = content.districtsOf('irongate').map((q) => q.id);
const MILL: MapRect = { x0: 0.34, y0: 0.02, x1: 0.81, y1: 0.62 };
const frameOf = (id: string): MapRect => (id === 'coalport' ? MILL : content.district(id)!.quarter.frame!);
/** Review 4 (ADR 0076): a district's drag limit, its outline's bounding box. */
const limitOf = (id: string): MapRect => bboxOf(content.district(id)!.quarter.outline!);
/** A district's places. */
const placesOf = (id: string) => content.capitalCity().locations.filter((l) => l.quarterId === id);
const pinsOf = (id: string) => placesOf(id).map((l) => l.map);

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

describe('review 3: at rest the art covers the map, and a drag brings the other pins in', () => {
  const PIN_CLEAR = 30; // PIN_PAD: half the 44 px target plus a margin
  // The map box and the overlays the city page puts over it at the tested screens (measured on the
  // dev server): a phone's plate and orders as bands; a tablet's and a desktop's plate in its corner,
  // the tab dock and the Places button as blocks; a phone held sideways has its plate beside the map.
  const desktopBlocks = (w: number, h: number) => [
    { x0: 10, y0: 10, x1: 430, y1: 560 },
    { x0: w / 2 - 210, y0: h - 72, x1: w / 2 + 210, y1: h - 8 },
    { x0: w - 110, y0: 10, x1: w - 10, y1: 54 },
  ];
  const CASES: Array<{ at: string; box: { w: number; h: number }; insets: MapInsets }> = [
    {
      at: '360×640',
      box: { w: 360, h: 457 },
      insets: {
        top: 120,
        bottom: 190,
        hideTop: 120,
        hideBottom: 190,
        blocks: [{ x0: 260, y0: 220, x1: 360, y1: 264 }],
      },
    },
    {
      at: '390×844',
      box: { w: 390, h: 661 },
      insets: {
        top: 165,
        bottom: 190,
        hideTop: 165,
        hideBottom: 190,
        blocks: [{ x0: 290, y0: 415, x1: 390, y1: 459 }],
      },
    },
    { at: '844×390', box: { w: 520, h: 299 }, insets: { top: 0, bottom: 0, blocks: [] } },
    {
      at: '640×900',
      box: { w: 640, h: 815 },
      insets: { top: 0, bottom: 0, blocks: desktopBlocks(640, 815).filter((_, i) => i !== 1) },
    },
    {
      at: '768×1024',
      box: { w: 768, h: 880 },
      insets: { top: 0, bottom: 0, blocks: desktopBlocks(768, 880) },
    },
    {
      at: '1440×900',
      box: { w: 1440, h: 814 },
      insets: { top: 0, bottom: 0, blocks: desktopBlocks(1440, 814) },
    },
    {
      at: '1920×1080',
      box: { w: 1920, h: 994 },
      insets: { top: 0, bottom: 0, blocks: desktopBlocks(1920, 994) },
    },
  ];
  type View = { scale: number; x: number; y: number };
  const restOf = (id: string, box: { w: number; h: number }, insets: MapInsets) => {
    const frame = frameOf(id);
    const c = contentFor(box, 1, frame);
    const shownH = box.h - (insets.hideTop ?? 0) - (insets.hideBottom ?? 0);
    const coverScale = Math.min(1, Math.max(box.w / c.w, shownH / c.h));
    const v = fitPinsView({ box, content: c, pins: pinsOf(id), insets, minScale: coverScale, frame });
    return { frame, c, coverScale, v };
  };
  const at = (v: View, c: { w: number; h: number }, p: { x: number; y: number }) => ({
    x: v.x + p.x * c.w * v.scale,
    y: v.y + p.y * c.h * v.scale,
  });
  const clearAt = (box: { w: number; h: number }, insets: MapInsets, q: { x: number; y: number }) =>
    q.x >= PIN_CLEAR - 0.5 &&
    q.x <= box.w - PIN_CLEAR + 0.5 &&
    q.y >= insets.top + PIN_CLEAR - 0.5 &&
    q.y <= box.h - insets.bottom - PIN_CLEAR + 0.5 &&
    (insets.blocks ?? []).every(
      (b) =>
        q.x + PIN_CLEAR <= b.x0 ||
        q.x - PIN_CLEAR >= b.x1 ||
        q.y + PIN_CLEAR <= b.y0 ||
        q.y - PIN_CLEAR >= b.y1,
    );

  it('the at-rest view covers the box (never the blurred bands), and pins stay 44 px targets apart', () => {
    for (const id of cities)
      for (const { at: size, box, insets } of CASES) {
        const { c, coverScale, v } = restOf(id, box, insets);
        const label = `${id} ${size}`;
        expect(coversBox(box, c, v, insets), label).toBe(true);
        expect(v.scale, label).toBeGreaterThanOrEqual(Math.min(1, coverScale) - 1e-9);
        expect(v.scale, label).toBeLessThanOrEqual(1.5); // past 1 only to bring a pin out from under the plate
        const pts = pinsOf(id).map((p) => at(v, c, p));
        for (let i = 0; i < pts.length; i++)
          for (let j = i + 1; j < pts.length; j++)
            // Two 44 px targets never overlap (review 3: the at-rest view zooms in for it; spreadPins is gone).
            expect(Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y), label).toBeGreaterThanOrEqual(
              PIN_GAP - 0.01,
            );
      }
  });

  it('every pin is clear at rest or a drag away, or one zoom step and a drag (the art may stop short under a phone’s opaque bands)', () => {
    const zoomOnly: string[] = [];
    for (const id of cities)
      for (const { at: size, box, insets } of CASES) {
        const { c, v } = restOf(id, box, insets);
        // Review 4 (ADR 0076): inside a district the drag limit is its outline's bounding box (no
        // margin). Moving this test from the home cities' old frames to the capital's districts found
        // three pins that only a zoom brings clear (not new: the capital was never in this test): on a
        // portrait tablet a district opens zoomed out to fit its pins, and a pin at the picture's
        // top-left edge sits under the desktop plate; the + button (or a pinch) and a drag bring it out.
        const reachAt = (scale: number, p: { x: number; y: number }) => {
          const lim = freePanLimits(box, c, v, scale, limitOf(id), pinsOf(id), insets, 0);
          for (let a = 0; a <= 40; a++)
            for (let b = 0; b <= 40; b++) {
              const w = {
                scale,
                x: lim.x[0] + ((lim.x[1] - lim.x[0]) * a) / 40,
                y: lim.y[0] + ((lim.y[1] - lim.y[0]) * b) / 40,
              };
              if (clearAt(box, insets, at(w, c, p))) return true;
            }
          return false;
        };
        for (const l of placesOf(id)) {
          const rest = reachAt(v.scale, l.map);
          const zoomed = rest || reachAt(v.scale * FREE_ZOOM_STEP, l.map);
          expect(zoomed, `${id} ${size} ${l.id}`).toBe(true);
          if (!rest) zoomOnly.push(`${id} ${size} ${l.id}`);
        }
      }
    // Pinned: the three a zoom brings out (portrait tablets, the plate over the picture's top-left edge).
    expect(zoomOnly).toEqual([
      'irongate.government-quarter 640×900 irongate.ministries',
      'irongate.old-town 640×900 irongate.concord-house',
      'irongate.old-town 768×1024 irongate.concord-house',
    ]);
  });

  it('a drag at rest never shows past the picture and never zooms; the at-rest view is inside its limits', () => {
    for (const id of cities)
      for (const { at: size, box, insets } of CASES) {
        const { c, v } = restOf(id, box, insets);
        const lim = restPanLimits(box, c, v, limitOf(id), pinsOf(id), insets, 0);
        const label = `${id} ${size}`;
        for (const x of lim.x)
          for (const y of lim.y)
            expect(coversBox(box, c, { scale: v.scale, x, y }, insets), label).toBe(true);
        expect(v.x, label).toBeGreaterThanOrEqual(lim.x[0]);
        expect(v.x, label).toBeLessThanOrEqual(lim.x[1]);
        expect(v.y, label).toBeGreaterThanOrEqual(lim.y[0]);
        expect(v.y, label).toBeLessThanOrEqual(lim.y[1]);
      }
  });

  it('in the map: a long drag at rest stops at the picture edge, and closing a place comes back to it', () => {
    vi.useFakeTimers();
    try {
      const f = frameOf('coalport');
      const props = {
        map: cityViewFixture.map,
        isNight: false,
        locations: cityViewFixture.locations,
        onSelect: () => undefined,
        frame: f,
      };
      const { rerender } = render(<CityMap {...props} selectedId={null} />);
      const map = screen.getByTestId('city-map');
      expect(map).toHaveAttribute('data-fit', 'cover');
      const [x0, y0, scale0] = map.getAttribute('data-view')!.split(',').map(Number);
      fireEvent.pointerDown(map, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(map, { pointerId: 1, clientX: 5100, clientY: 5100 });
      fireEvent.pointerUp(map, { pointerId: 1 });
      const dragged = map.getAttribute('data-view')!;
      const [x, y, scale] = dragged.split(',').map(Number);
      expect(scale).toBe(scale0); // no zoom
      expect(x! > x0! || y! > y0!).toBe(true); // it moved
      expect(x).toBeLessThanOrEqual(0.05); // the picture's left and top edges at most at the box's
      expect(y).toBeLessThanOrEqual(0.05);
      rerender(<CityMap {...props} selectedId="coalport.union-hall" />);
      act(() => vi.advanceTimersByTime(ZOOM_MS + 60));
      rerender(<CityMap {...props} selectedId={null} />);
      expect(map.getAttribute('data-view')).toBe(dragged);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('review 4 (answers §8.3, ADR 0076): inside a district the drag reaches its whole outline', () => {
  const box = { w: 390, h: 600 };
  const insets: MapInsets = { top: 0, bottom: 0 };
  it("Station & Market's far corner (0.02, 0.98) is reachable at rest and zoomed, never past the picture", () => {
    const id = 'irongate.station-market';
    const frame = frameOf(id);
    const lim0 = limitOf(id);
    expect(lim0).toEqual({ x0: 0, y0: 0.37, x1: 0.605, y1: 1 });
    const c = contentFor(box, 1, frame);
    const cover = Math.min(1, Math.max(box.w / c.w, box.h / c.h));
    const fitted = fitPinsView({ box, content: c, pins: pinsOf(id), insets, minScale: cover, frame });
    for (const scale of [fitted.scale, fitted.scale * 2, fitted.scale * 4]) {
      const lim = freePanLimits(box, c, fitted, scale, lim0, pinsOf(id), insets, 0);
      // The corner can be brought on screen: the view whose left and bottom edges are the picture's.
      const corner = { x: 0.02 * c.w * scale, y: 0.98 * c.h * scale };
      const best = { x: lim.x[1], y: lim.y[0] };
      expect(best.x + corner.x, `x at ${scale}`).toBeLessThanOrEqual(box.w);
      expect(best.y + corner.y, `y at ${scale}`).toBeLessThanOrEqual(box.h);
      expect(best.y + corner.y, `y at ${scale}`).toBeGreaterThanOrEqual(0);
      for (const x of lim.x) for (const y of lim.y) expect(coversBox(box, c, { scale, x, y })).toBe(true);
    }
    // The old limit (the frame grown by 10 %) did not reach it.
    const old = restPanLimits(box, c, fitted, frame, pinsOf(id), insets);
    expect(old.y[0] + 0.98 * c.h * fitted.scale).toBeGreaterThan(box.h);
  });
});

describe('a zoomed drag stays near the frame (§2: no free pan)', () => {
  const box = { w: 390, h: 600 };
  const f = frameOf('coalport');
  const c = contentFor(box, 1, f);

  it('the frame grown by 25 % covers the box at both limits; the whole picture would allow more', () => {
    const fitted = fitPinsView({ box, content: c, pins: content.city('coalport')!.locations.slice(0, 6).map((l) => l.map), insets: { top: 0, bottom: 0 } });
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
    expect(srcs.every((s) => s.startsWith('/tiles/map.coalport.day/1a2b3c4d/avif_files/'))).toBe(true);
    expect(srcs).toContain('/tiles/map.coalport.day/1a2b3c4d/avif_files/9/0_0.avif');
    expect(screen.getByTestId('map-backdrop').querySelector('img')!.getAttribute('src')).toBe(
      '/tiles/map.coalport.day/1a2b3c4d/avif_files/9/0_0.avif',
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
