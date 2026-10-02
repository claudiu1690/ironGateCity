import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getContent } from '@irongate/content';
import { cityViewFixture, hallFixture, mapFixture } from '@irongate/rules/testing';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CityMap,
  FREE_ZOOM_STEP,
  HallHeader,
  HowElectionsWork,
  LocationSheet,
  TILE_MAX_DPR,
  ZOOM_MS,
  contentFor,
  coversBox,
  detailLevelFor,
  fitPinsView,
  freePanLimits,
  freeZoomLimits,
  pyramidFor,
  restFromView,
  Ticket,
  viewFromRest,
} from '../src';

/**
 * Review 3 (GDD §14.13, docs/design/review-3-answers.md §1–§2): free zoom on the city map between
 * the covering scale (never a dark band) and the art's finest detail (never blurry), remembered for
 * the session; opening a place is one movement.
 */

const content = getContent();
const cities = ['coalport', 'duskwall', 'ashford'] as const;
const pyramid = pyramidFor(mapFixture('map.coalport.day'), '/tiles')!;
const BOXES = [
  { w: 390, h: 692 },
  { w: 360, h: 560 },
  { w: 1440, h: 814 },
  { w: 812, h: 331 },
];

describe('the free zoom limits (answers §1)', () => {
  it('in: the top tile level at one pixel per device pixel, the DPR capped at 2; out: the covering scale', () => {
    const l = freeZoomLimits({ fitted: 1.1, cover: 1, artWidth: 8640, contentW: 1500, dpr: 3 });
    expect(TILE_MAX_DPR).toBe(2);
    expect(l.max).toBeCloseTo(8640 / (1500 * 2), 6);
    expect(l.min).toBe(1);
    // A desktop at DPR 1 may go twice as close; never below the view the map opens on.
    expect(freeZoomLimits({ fitted: 1, cover: 1, artWidth: 8640, contentW: 1500, dpr: 1 }).max).toBeCloseTo(
      5.76,
      6,
    );
    expect(freeZoomLimits({ fitted: 1.2, cover: 1, artWidth: 2048, contentW: 2000, dpr: 2 }).max).toBe(1.2);
    expect(freeZoomLimits({ fitted: 0.9, cover: 1, artWidth: 8640, contentW: 1500, dpr: 2 }).min).toBe(0.9);
  });

  it('never blurry: at the closest zoom every city on every screen draws the top tile level at 1:1 or finer', () => {
    for (const id of cities)
      for (const box of BOXES)
        for (const dpr of [1, 2, 3]) {
          const frame = content.city(id)!.quarters[0]!.frame;
          const c = contentFor(box, 1, frame);
          const { max } = freeZoomLimits({
            fitted: 1,
            cover: 1,
            artWidth: pyramid.width,
            contentW: c.w,
            dpr,
          });
          const shown = c.w * max;
          const at = `${id} ${box.w}×${box.h} @${dpr}`;
          // The detail level asked for is the top one, and no tile pixel is stretched past a device pixel.
          if (max > 1) expect(detailLevelFor(pyramid, shown, dpr), at).toBe(pyramid.maxLevel);
          expect(shown * Math.min(TILE_MAX_DPR, dpr), at).toBeLessThanOrEqual(pyramid.width + 1);
        }
  });

  it('never black: anywhere a drag can take the map at any zoom in range, the art covers the box', () => {
    for (const id of cities)
      for (const box of BOXES) {
        const city = content.city(id)!;
        const frame = city.quarters[0]!.frame;
        const c = contentFor(box, 1, frame);
        const pins = city.locations.map((l) => l.map);
        const insets = { top: 0, bottom: 0, blocks: [] };
        const cover = Math.min(1, Math.max(box.w / c.w, box.h / c.h));
        const fitted = fitPinsView({ box, content: c, pins, insets, minScale: cover, frame });
        const { min, max } = freeZoomLimits({
          fitted: fitted.scale,
          cover,
          artWidth: 8640,
          contentW: c.w,
          dpr: 2,
        });
        expect(min, id).toBeLessThanOrEqual(fitted.scale);
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
          const scale = min + (max - min) * t;
          const lim = freePanLimits(box, c, fitted, scale, frame, pins, insets);
          for (const x of lim.x)
            for (const y of lim.y)
              expect(coversBox(box, c, { scale, x, y }), `${id} ${box.w}×${box.h} at ${scale}`).toBe(true);
        }
      }
  });
});

describe('CityMap: zooming at rest (answers §1)', () => {
  const props = {
    map: cityViewFixture.map,
    isNight: false,
    locations: cityViewFixture.locations,
    onSelect: () => undefined,
  };
  const viewOf = (el: HTMLElement) =>
    el.getAttribute('data-view')!.split(',').map(Number) as [number, number, number];
  const limitsOf = (el: HTMLElement) =>
    el.getAttribute('data-zoom-limits')!.split(',').map(Number) as [number, number, number];
  const wheel = (el: HTMLElement, deltaY: number, opts: Partial<WheelEventInit> = {}) => {
    const e = new WheelEvent('wheel', {
      deltaY,
      clientX: 195,
      clientY: 240,
      cancelable: true,
      bubbles: true,
      ...opts,
    });
    act(() => {
      el.dispatchEvent(e);
    });
    return e;
  };
  const tap = (el: Element, x = 200, y = 200, id = 1) => {
    fireEvent.pointerDown(el, { pointerId: id, button: 0, clientX: x, clientY: y, pointerType: 'touch' });
    fireEvent.pointerUp(el, { pointerId: id, clientX: x, clientY: y, pointerType: 'touch' });
  };
  afterEach(() => vi.useRealTimers());

  it('the wheel zooms about the pointer, never past the finest detail nor out past the covering scale', () => {
    render(<CityMap {...props} selectedId={null} />);
    const box = screen.getByTestId('city-map');
    const [min, max, fitted] = limitsOf(box);
    expect(viewOf(box)[2]).toBeCloseTo(fitted, 3);
    expect(wheel(box, -300).defaultPrevented).toBe(true);
    const zoomed = viewOf(box)[2];
    expect(zoomed).toBeGreaterThan(fitted);
    for (let i = 0; i < 20; i++) wheel(box, -500);
    expect(viewOf(box)[2]).toBeCloseTo(max, 3);
    for (let i = 0; i < 40; i++) wheel(box, 500);
    expect(viewOf(box)[2]).toBeCloseTo(min, 3);
    // Never a dark band: at the covering scale the art still covers the box.
    expect(box).toHaveAttribute('data-fit', 'cover');
    const [x, y, s] = viewOf(box);
    const layer = screen.getByTestId('map-layer');
    expect(
      coversBox(
        { w: 390, h: 480 },
        { w: parseFloat(layer.style.width), h: parseFloat(layer.style.height) },
        { x, y, scale: s },
      ),
    ).toBe(true);
  });

  it('a trackpad pinch (ctrl + wheel) zooms finer than a wheel notch', () => {
    render(<CityMap {...props} selectedId={null} />);
    const box = screen.getByTestId('city-map');
    const start = viewOf(box)[2];
    wheel(box, -10, { ctrlKey: true });
    const k = viewOf(box)[2] / start;
    expect(k).toBeGreaterThan(1.05);
    expect(k).toBeLessThan(1.2);
  });

  it('a double tap goes to twice the rest view, and a second one back to it, easing', () => {
    render(<CityMap {...props} selectedId={null} />);
    const box = screen.getByTestId('city-map');
    const [, max, fitted] = limitsOf(box);
    tap(box);
    expect(viewOf(box)[2]).toBeCloseTo(fitted, 3); // one tap is a tap
    tap(box);
    expect(viewOf(box)[2]).toBeCloseTo(Math.min(max, fitted * FREE_ZOOM_STEP), 3);
    expect(screen.getByTestId('map-layer').style.transition).toContain(`transform ${ZOOM_MS}ms`);
    tap(box, 210, 205);
    tap(box, 210, 205);
    expect(viewOf(box)[2]).toBeCloseTo(fitted, 3);
  });

  it('a double tap on a pin opens it instead (a pin tap is never a zoom)', () => {
    const onSelect = vi.fn();
    render(<CityMap {...props} onSelect={onSelect} selectedId={null} />);
    const box = screen.getByTestId('city-map');
    const before = viewOf(box)[2];
    const pin = screen.getAllByTestId('hotspot')[0]!;
    tap(pin);
    tap(pin);
    expect(viewOf(box)[2]).toBeCloseTo(before, 3);
  });

  it('two fingers pinch: apart zooms in, within the limits', () => {
    render(<CityMap {...props} selectedId={null} />);
    const box = screen.getByTestId('city-map');
    const start = viewOf(box)[2];
    fireEvent.pointerDown(box, {
      pointerId: 11,
      button: 0,
      clientX: 150,
      clientY: 240,
      pointerType: 'touch',
    });
    fireEvent.pointerDown(box, {
      pointerId: 12,
      button: 0,
      clientX: 250,
      clientY: 240,
      pointerType: 'touch',
    });
    fireEvent.pointerMove(box, { pointerId: 12, clientX: 300, clientY: 240, pointerType: 'touch' });
    fireEvent.pointerMove(box, { pointerId: 11, clientX: 100, clientY: 240, pointerType: 'touch' });
    expect(viewOf(box)[2]).toBeCloseTo(Math.min(limitsOf(box)[1], start * 2), 2);
    fireEvent.pointerUp(box, { pointerId: 12, pointerType: 'touch' });
    fireEvent.pointerUp(box, { pointerId: 11, pointerType: 'touch' });
    expect(viewOf(box)[2]).toBeCloseTo(Math.min(limitsOf(box)[1], start * 2), 2);
  });

  it('the + / − buttons step the zoom and are disabled at the limits', () => {
    render(<CityMap {...props} selectedId={null} zoomButtons="flex top-2 right-2" />);
    const box = screen.getByTestId('city-map');
    const [min, max, fitted] = limitsOf(box);
    const zin = screen.getByRole('button', { name: 'Zoom in' });
    const zout = screen.getByRole('button', { name: 'Zoom out' });
    expect(screen.getByTestId('map-zoom')).toHaveAttribute('data-map-overlay', 'zoom');
    fireEvent.click(zin);
    expect(viewOf(box)[2]).toBeCloseTo(Math.min(max, fitted * 2), 3);
    for (let i = 0; i < 6; i++) fireEvent.click(zin);
    expect(viewOf(box)[2]).toBeCloseTo(max, 3);
    expect(zin).toBeDisabled();
    for (let i = 0; i < 8; i++) fireEvent.click(zout);
    expect(viewOf(box)[2]).toBeCloseTo(min, 3);
    expect(zout).toBeDisabled();
  });

  it('the view is remembered for the session; a place opens from any zoom and closing returns to it', () => {
    const onArrive = vi.fn();
    const key = `test-${Math.random()}`;
    const { unmount } = render(<CityMap {...props} selectedId={null} memoryKey={key} />);
    let box = screen.getByTestId('city-map');
    wheel(box, -400);
    fireEvent.pointerDown(box, { pointerId: 1, button: 0, clientX: 200, clientY: 200 });
    fireEvent.pointerMove(box, { pointerId: 1, clientX: 170, clientY: 180 });
    fireEvent.pointerUp(box, { pointerId: 1, clientX: 170, clientY: 180 });
    const mine = box.getAttribute('data-view');
    unmount();
    const { rerender } = render(<CityMap {...props} selectedId={null} memoryKey={key} onArrive={onArrive} />);
    box = screen.getByTestId('city-map');
    expect(box.getAttribute('data-view')).toBe(mine);
    rerender(<CityMap {...props} selectedId="coalport.union-hall" memoryKey={key} onArrive={onArrive} />);
    expect(box).toHaveAttribute('data-zoomed', 'true');
    expect(onArrive).toHaveBeenCalledWith('coalport.union-hall', expect.anything());
    rerender(<CityMap {...props} selectedId={null} memoryKey={key} onArrive={onArrive} />);
    expect(box.getAttribute('data-view')).toBe(mine);
  });
});

describe('opening a place is one movement (answers §2)', () => {
  const css = readFileSync(join(__dirname, '../src/tokens.css'), 'utf8');

  it('the sheet, the side panel, the centred panel and the dim carry the movement classes', () => {
    for (const [layout, cls] of [
      ['sheet', 'place-sheet'],
      ['side', 'place-side'],
      ['panel', 'place-panel'],
    ] as const) {
      const { unmount } = render(
        <LocationSheet
          open
          onOpenChange={() => undefined}
          n={1}
          kindLabel="Docks"
          name="Harbour Quays"
          blurb="Cranes."
          layout={layout}
        >
          <p>Tickets</p>
        </LocationSheet>,
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass(cls);
      expect(dialog).toHaveAttribute('data-state', 'open');
      if (layout === 'panel') expect(screen.getByTestId('location-backdrop')).toHaveClass('place-dim');
      unmount();
    }
  });

  it("300 ms on the map zoom's curve, out in reverse; reduce motion cross-fades in 120 ms without movement", () => {
    expect(css).toContain('--place-ms: 300ms');
    expect(css).toContain('--place-ease: cubic-bezier(0.33, 0, 0.2, 1)');
    expect(ZOOM_MS).toBe(300);
    for (const k of ['sheet', 'side', 'panel', 'dim'])
      expect(css).toMatch(
        new RegExp(
          `\\.place-${k}\\[data-state='closed'\\] \\{\\s*animation: place-[a-z]+-out var\\(--place-ms\\)`,
        ),
      );
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('--place-fade-ms');
    expect(css).toContain('--place-fade-ms: 120ms');
    // The reduced-motion keyframes move nothing.
    const fade = css.slice(css.indexOf('@keyframes place-fade-in'), css.indexOf('.place-sheet['));
    expect(fade).not.toContain('transform');
  });
});

describe('training verbs, ticket buttons and the election screens (answers §4–§6)', () => {
  const study = cityViewFixture.locations[1]!.actions[0]!;

  it("every training action's ticket button is the action's verb (content), never 'Train'", () => {
    const training = cities.flatMap((id) =>
      content.city(id)!.locations.flatMap((l) => l.actions.filter((a) => a.type === 'training')),
    );
    expect(training).toHaveLength(9);
    for (const a of training) {
      const verb = 'verb' in a ? a.verb : '';
      const { unmount } = render(
        <Ticket
          action={{ ...study, id: a.id, name: a.name, verb }}
          energy={{ value: 100, nextTickAt: null }}
          onPerform={() => undefined}
        />,
      );
      expect(screen.getByTestId('ticket-verb'), a.id).toHaveTextContent(new RegExp(`^${verb}$`));
      expect(screen.getByTestId('ticket-verb')).not.toHaveTextContent(/train/i);
      unmount();
    }
  });

  it('the hall header: the city picture at the hall, by day or by night, with the caps line', () => {
    const { rerender } = render(<HallHeader hall={hallFixture} cityName="Coalport" night={false} />);
    const header = screen.getByTestId('hall-header');
    expect(header).toHaveAttribute('data-art', 'map.coalport.day');
    expect(screen.getByTestId('hall-kicker')).toHaveTextContent('Coalport Council · the Town Hall');
    expect(screen.getByTestId('hall-kicker')).toHaveClass('label-caps');
    // The hall at 50 % of the width and 55 % of the height, the still at its native 2048 px.
    const img = header.querySelector('img')!;
    expect(img.style.width).toBe('2048px');
    expect(img.style.left).toBe(`calc(50% - ${0.525 * 2048}px)`);
    expect(img.style.top).toBe(`calc(55% - ${0.19 * 2048}px)`);
    rerender(<HallHeader hall={hallFixture} cityName="Coalport" night />);
    expect(screen.getByTestId('hall-header')).toHaveAttribute('data-art', 'map.coalport.night');
  });

  it('How elections work: one link, five short lines, the same note as the card', async () => {
    render(<HowElectionsWork cityName="Coalport" rank2="Activist" rank3="Organiser" />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'How elections work' }));
    const note = screen.getByTestId('help-note');
    expect(note).toHaveTextContent('How elections work');
    const lines = within(note)
      .getAllByTestId('note-line')
      .map((l) => l.textContent);
    expect(lines).toEqual([
      'Coalport elects seven councillors every five days: two days for names to go in, three days of voting, the result the next morning.',
      'The candidates are players who stand, and local candidates: townspeople run by the game, who fill the list so there is always an election.',
      'Activists vote once, in secret. Organisers who are Known in Coalport can stand; it costs 10 Political Capital and takes two backers.',
      "The seven with the most support win. Support is the town's own vote for you (your reputation here), plus your backers, plus the votes.",
      "A seat is five days on the council: a vote on the town's rule, and 10 Political Capital and 20 Party XP a day.",
    ]);
  });
});

describe('the remembered view (answers §1)', () => {
  it('is kept per size of map: back on the same size it is the same view; another size starts at rest', () => {
    const box = { w: 390, h: 692 };
    const content = { w: 692, h: 692 };
    const v = { scale: 1.7, x: -300, y: -250 };
    const r = restFromView(v, box, content);
    expect(r.box).toBe('390x692');
    const back = viewFromRest(r, box, content, { min: 1, max: 4 });
    expect(back.scale).toBeCloseTo(v.scale, 9);
    expect(back.x).toBeCloseTo(v.x, 9);
    expect(back.y).toBeCloseTo(v.y, 9);
    // The zoom is clamped to the limits of the size it is shown at.
    expect(viewFromRest(r, box, content, { min: 1, max: 1.5 }).scale).toBe(1.5);
  });
});

describe('the wheel over a pin (answers §1)', () => {
  it('zooms the map, as over the art; over an overlay it does not', () => {
    render(
      <CityMap
        map={cityViewFixture.map}
        isNight={false}
        locations={cityViewFixture.locations}
        onSelect={() => undefined}
        selectedId={null}
      >
        <div data-map-overlay="top" data-testid="plate">
          Plate
        </div>
      </CityMap>,
    );
    const box = screen.getByTestId('city-map');
    const scale = () => Number(box.getAttribute('data-view')!.split(',')[2]);
    const before = scale();
    const wheelOn = (el: Element) =>
      act(() => {
        el.dispatchEvent(new WheelEvent('wheel', { deltaY: -300, cancelable: true, bubbles: true }));
      });
    wheelOn(screen.getByTestId('plate'));
    expect(scale()).toBeCloseTo(before, 6);
    wheelOn(screen.getAllByTestId('hotspot')[0]!);
    expect(scale()).toBeGreaterThan(before);
  });
});
