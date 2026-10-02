import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DETAIL_SETTLE_MS, TileLayer } from '../src/components/TileLayer';
import {
  backdropUrl,
  detailLevelFor,
  levelFor,
  levelGrid,
  levelSize,
  maxLevelFor,
  pyramidFor,
  tileCount,
  tileUrl,
  tilesFor,
} from '../src/tiles';
import type { TilePyramid } from '../src/tiles';

/** ADR 0024 (maps v3): the tile layer's maths, on the approved 8,640 and 11,520 px pictures. */

const city: TilePyramid = {
  base: '/tiles/map.coalport.day/1a2b3c4d',
  width: 8640,
  height: 8640,
  tileSize: 512,
  overlap: 1,
  maxLevel: 14,
  format: 'webp',
};
const capital: TilePyramid = {
  ...city,
  base: '/tiles/map.irongate.day/5e6f7a8b',
  width: 11520,
  height: 11520,
};

describe('tile pyramid levels', () => {
  it('every level down to 1 px: maxLevel is 14 for the 8,640, 9,216 and 11,520 px masters', () => {
    expect(maxLevelFor(8640, 8640)).toBe(14);
    expect(maxLevelFor(9216, 9216)).toBe(14);
    expect(maxLevelFor(11520, 11520)).toBe(14);
  });

  it('halves each level, rounding up, like Deep Zoom', () => {
    expect(levelSize(city, 14)).toEqual({ w: 8640, h: 8640 });
    expect(levelSize(city, 12)).toEqual({ w: 2160, h: 2160 });
    expect(levelSize(city, 9)).toEqual({ w: 270, h: 270 });
    expect(levelSize(capital, 13)).toEqual({ w: 5760, h: 5760 });
    expect(levelSize(capital, 9)).toEqual({ w: 360, h: 360 });
    expect(levelSize(city, 0)).toEqual({ w: 1, h: 1 });
  });

  it('counts the tiles the writer makes (about 420 for a city, 730 for Irongate)', () => {
    expect(levelGrid(city, 14)).toEqual({ cols: 17, rows: 17 });
    expect(levelGrid(capital, 14)).toEqual({ cols: 23, rows: 23 });
    expect(tileCount(city)).toBe(418);
    expect(tileCount(capital)).toBe(732);
    expect(tileCount({ ...city, width: 9216, height: 9216 })).toBe(453);
  });

  it('picks the lowest level with enough pixels, never past the full size', () => {
    expect(levelFor(city, 1080)).toBe(11);
    expect(levelFor(city, 1081)).toBe(12);
    expect(levelFor(city, 99999)).toBe(14);
    expect(levelFor(city, 256)).toBe(9); // 270 px: the one-tile underlay and backdrop
    expect(levelFor(capital, 256)).toBe(9); // 360 px
  });

  it('names tiles the DZI way; the backdrop is the underlay tile', () => {
    expect(tileUrl(city, 12, 3, 1)).toBe('/tiles/map.coalport.day/1a2b3c4d/webp_files/12/3_1.webp');
    expect(backdropUrl(city)).toBe('/tiles/map.coalport.day/1a2b3c4d/webp_files/9/0_0.webp');
  });
});

describe('the detail level for a view (review 3: no blurry zoom on an upright phone)', () => {
  // The zoomed views measured on the dev server (layer width at scale 1 × the zoom's 1.6): Duskwall,
  // whose frame covers a tall box, upright at 390 × 844 and held sideways at 844 × 390.
  const upright = 777.5 * 1.6; // 1,244 CSS px of art across
  const sideways = 896 * 1.6; // 1,434

  it('asks for every device pixel the art takes on screen, the DPR capped at 2', () => {
    // 1,244 px × 2 = 2,488 device pixels: level 12 (2,160) is short of them, level 13 (4,320) is not.
    expect(detailLevelFor(city, upright, 3)).toBe(13);
    expect(detailLevelFor(city, upright, 2)).toBe(13);
    expect(levelSize(city, detailLevelFor(city, upright, 3)).w).toBeGreaterThanOrEqual(upright * 2);
    // Upright and sideways now get the same level for the same zoom.
    expect(detailLevelFor(city, upright, 3)).toBe(detailLevelFor(city, sideways, 3));
  });

  it('caps the DPR at TILE_MAX_DPR and never asks past the full size', () => {
    expect(detailLevelFor(city, 1000, 3)).toBe(detailLevelFor(city, 1000, 2));
    expect(detailLevelFor(city, 1000, 1)).toBe(11); // 1,080 px
    expect(detailLevelFor(city, 1080, 1)).toBe(11);
    expect(detailLevelFor(city, 1081, 1)).toBe(12);
    expect(detailLevelFor(city, 9000, 2)).toBe(city.maxLevel);
  });

  it('in the layer: a zoomed upright view draws the level its pixels need', () => {
    vi.useFakeTimers();
    const dpr = window.devicePixelRatio;
    Object.defineProperty(window, 'devicePixelRatio', { value: 3, configurable: true });
    try {
      const { container } = render(
        <TileLayer
          pyramid={city}
          content={{ w: 777.5, h: 777.5 }}
          box={{ w: 390, h: 661 }}
          view={{ scale: 1.6, x: -400, y: -300 }}
        />,
      );
      act(() => vi.advanceTimersByTime(DETAIL_SETTLE_MS));
      const levels = new Set(
        [...container.querySelectorAll<HTMLImageElement>('img[data-tile]')].map(
          (i) => i.dataset.tile!.split('/')[0],
        ),
      );
      expect([...levels].sort()).toEqual(['13', '9']);
    } finally {
      Object.defineProperty(window, 'devicePixelRatio', { value: dpr, configurable: true });
      vi.useRealTimers();
    }
  });
});

describe('pyramidFor', () => {
  const tiles = {
    path: 'map.coalport.day/1a2b3c4d',
    width: 8640,
    height: 8640,
    tileSize: 512,
    overlap: 1,
    maxLevel: 14,
    format: 'webp' as const,
  };

  it('is null without an origin or without tiles', () => {
    expect(pyramidFor({ tiles }, '')).toBeNull();
    expect(pyramidFor({ tiles: null }, '/tiles')).toBeNull();
  });

  it('puts the pyramid under the origin', () => {
    expect(pyramidFor({ tiles }, '/tiles')).toEqual({
      base: '/tiles/map.coalport.day/1a2b3c4d',
      width: 8640,
      height: 8640,
      tileSize: 512,
      overlap: 1,
      maxLevel: 14,
      format: 'webp',
    });
    expect(pyramidFor({ tiles }, 'https://tiles.example.org/')!.base).toBe(
      'https://tiles.example.org/map.coalport.day/1a2b3c4d',
    );
  });
});

describe('tilesFor', () => {
  const content = { w: 1000, h: 1000 };

  it('covers the whole art at a level when no rect is given', () => {
    const t = tilesFor(city, 11, content, null);
    expect(t).toHaveLength(9); // 1080 px = 3 × 3 tiles of 512
    expect(new Set(t.map((x) => x.key)).size).toBe(9);
  });

  it('takes only the tiles a rect shows', () => {
    // The top-left quarter of the layer at level 12 (2160 px: 5 × 5 tiles): columns and rows 0–2.
    const t = tilesFor(city, 12, content, { x0: 0, y0: 0, x1: 500, y1: 500 });
    expect(t.map((x) => x.key).sort()).toEqual(
      [0, 1, 2].flatMap((c) => [0, 1, 2].map((r) => `12/${c}_${r}`)).sort(),
    );
  });

  it('lets neighbours overlap by the file overlap, so no seam shows', () => {
    const [a, b] = tilesFor(city, 11, content, { x0: 0, y0: 0, x1: 600, y1: 10 });
    expect(a!.key).toBe('11/0_0');
    expect(b!.key).toBe('11/1_0');
    expect(a!.left + a!.width).toBeGreaterThan(b!.left);
    expect(a!.left).toBe(0);
  });
});

describe('TileLayer', () => {
  const props = {
    pyramid: city,
    content: { w: 1000, h: 1000 },
    box: { w: 390, h: 600 },
    view: { scale: 1, x: -200, y: -100 },
  };
  const underlay = (c: HTMLElement) => c.querySelector<HTMLImageElement>('img[data-tile^="9/"]')!;
  const details = (c: HTMLElement) =>
    [...c.querySelectorAll<HTMLImageElement>('img[data-tile]')].filter(
      (i) => !i.dataset.tile!.startsWith('9/'),
    );

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const settle = () => act(() => vi.advanceTimersByTime(DETAIL_SETTLE_MS));

  it('reports what it still waits for: the underlay at once, the detail once the view has held', () => {
    let pending = -1;
    const { container } = render(<TileLayer {...props} onPending={(n) => (pending = n)} />);
    expect(pending).toBe(1);
    expect(details(container)).toHaveLength(0);
    settle();
    expect(pending).toBeGreaterThan(1);
    expect(details(container).length).toBeGreaterThan(0);
  });

  it('a view that moves again within DETAIL_SETTLE_MS fetches only the last one', () => {
    const { container, rerender } = render(<TileLayer {...props} />);
    act(() => vi.advanceTimersByTime(DETAIL_SETTLE_MS - 20));
    rerender(<TileLayer {...props} view={{ scale: 2, x: -900, y: -600 }} />);
    act(() => vi.advanceTimersByTime(DETAIL_SETTLE_MS - 20));
    expect(details(container)).toHaveLength(0);
    act(() => vi.advanceTimersByTime(20));
    const levels = new Set(details(container).map((i) => i.dataset.tile!.split('/')[0]));
    expect([...levels]).toEqual(['12']);
  });

  it('an underlay tile that fails says the tiles are unavailable', () => {
    const onUnavailable = vi.fn();
    const { container } = render(<TileLayer {...props} onUnavailable={onUnavailable} />);
    fireEvent.error(underlay(container));
    expect(onUnavailable).toHaveBeenCalledTimes(1);
  });

  it('a detail tile that fails is given up on (the underlay shows there): pending reaches 0', () => {
    const onUnavailable = vi.fn();
    let pending = -1;
    const { container } = render(
      <TileLayer {...props} onUnavailable={onUnavailable} onPending={(n) => (pending = n)} />,
    );
    settle();
    fireEvent.load(underlay(container));
    const d = details(container);
    expect(d.length).toBeGreaterThan(0);
    fireEvent.error(d[0]!);
    for (const img of d.slice(1)) fireEvent.load(img);
    expect(pending).toBe(0);
    expect(onUnavailable).not.toHaveBeenCalled();
    expect(container.querySelector(`img[data-tile="${d[0]!.dataset.tile}"]`)).toBeNull();
  });
});
