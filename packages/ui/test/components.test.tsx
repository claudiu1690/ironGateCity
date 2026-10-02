import {
  characterViewFixture,
  cityViewFixture,
  ordersViewFixture,
  paperViewFixture,
  tallyFixture,
} from '@irongate/rules/testing';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  CityMap,
  DeskList,
  Field,
  HudBar,
  JobsCard,
  Masthead,
  OrdersList,
  TabBar,
  Ticket,
  TodayStrip,
  artUrl,
  ZOOM_MS,
  coversBox,
  fitPinsView,
  nativeScale,
  panLimits,
  zoomScale,
  zoomView,
  formatCountdown,
  formatOpinionDelta,
  formatSigned,
} from '../src';
import type { MapRect } from '../src';

const mill = cityViewFixture.locations[0]!;
const canvass = mill.actions[0]!;
const study = cityViewFixture.locations[1]!.actions[0]!;
const full = { value: 100, nextTickAt: null };

describe('Ticket v2', () => {
  it('shows the odds, the order tag and performs ×1 and ×3', async () => {
    const user = userEvent.setup();
    const onPerform = vi.fn();
    render(<Ticket action={canvass} energy={full} onPerform={onPerform} />);
    // Review 2 (GDD §8.4): the odds as a word, the plain type label, Party XP.
    expect(screen.getByTestId('ticket-chance')).toHaveTextContent('Fair odds');
    expect(screen.getByTestId('ticket-tags')).toHaveTextContent(
      'Talk to voters · Party order 1 / 2 · +25 % Party XP',
    );
    // Review 3 (answers §4.3): *Once* and *×3* with the batch's cost under it; the names unchanged.
    expect(screen.getByTestId('ticket-once')).toHaveTextContent(/^Once$/);
    expect(screen.getByTestId('ticket-three')).toHaveTextContent(/^×330 Energy$/);
    expect(screen.getByTestId('ticket-three-cost')).toHaveTextContent('30 Energy');
    await user.click(screen.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }));
    await user.click(
      screen.getByRole('button', { name: 'Canvass the shift change, three times, 30 Energy' }),
    );
    expect(onPerform.mock.calls).toEqual([[1], [3]]);
  });

  it('review 1 #10: an action whose order is done stays playable, its tag muted, with no hint', () => {
    const done = { ...canvass, order: { ...canvass.order!, progress: 2, target: 2 } };
    render(<Ticket action={done} energy={full} onPerform={() => undefined} />);
    const tags = screen.getByTestId('ticket-tags');
    expect(tags).toHaveTextContent('Talk to voters · Order done');
    expect(tags).toHaveClass('text-muted');
    expect(tags).not.toHaveClass('text-collective');
    expect(screen.getByRole('button', { name: /once/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /three times/ })).toBeEnabled();
    expect(screen.queryByTestId('ticket-hint')).toBeNull();
  });

  it('disables ×3 below its cost with the hint, and ×1 with "Needs … ready at"', () => {
    const { rerender } = render(
      <Ticket
        action={canvass}
        energy={{ value: 25, nextTickAt: 0 }}

        onPerform={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /three times/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /once/ })).toBeEnabled();
    expect(screen.getByTestId('ticket-hint')).toHaveTextContent('×3 needs 30 Energy');
    rerender(
      <Ticket
        action={canvass}
        energy={{ value: 5, nextTickAt: Date.UTC(2026, 8, 29, 14, 10) }}

        onPerform={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /once/ })).toBeDisabled();
    expect(screen.getByTestId('ticket-hint')).toHaveTextContent(/^Needs 10 Energy · ready at \d\d:\d\d$/);
  });

  it('review 2: tapping the odds word opens the band note, never a number', async () => {
    const user = userEvent.setup();
    render(<Ticket action={canvass} energy={full} onPerform={() => undefined} />);
    expect(screen.getByTestId('ticket-odds')).toHaveTextContent('Fair odds · Intelligence');
    expect(screen.getByTestId(`ticket-${canvass.id}`)).not.toHaveTextContent('%·');
    await user.click(screen.getByRole('button', { name: /what the odds mean/ }));
    const note = screen.getByTestId('help-note');
    expect(note).toHaveTextContent('Fair odds');
    expect(note).toHaveTextContent('About one try in two comes off here. It uses your Intelligence.');
    expect(note).not.toHaveTextContent(/\d/);
  });

  it('training shows the live cost and "Intelligence 12 → 13 · always works"', () => {
    render(
      <Ticket
        action={study}
        energy={{ value: 150, nextTickAt: 0 }}

        onPerform={() => undefined}
      />,
    );
    expect(screen.getByText('Intelligence 12 → 13 · always works')).toBeInTheDocument();
    // ×1 only (§8.5, content §13.2): one button with the live cost, no ×3. Review 3 (§8.5): the
    // button is the title's verb (content), never "Train".
    expect(screen.getByRole('button', { name: 'Study in the reading room, 44 Energy' })).toHaveTextContent(
      /^Study$/,
    );
    expect(screen.queryByRole('button', { name: /three times/ })).toBeNull();
  });

  it('review 2: a first-day bonus is a tag in words; no percentage of chance on the ticket', () => {
    const first = {
      ...canvass,
      preview: {
        ...canvass.preview!,
        bonuses: [{ id: 'first-day', label: 'First day in Coalport', value: 10 }],
        bonusTotal: 10,
        raw: 76,
        chance: 76,
      },
    };
    render(<Ticket action={first} energy={full} onPerform={() => undefined} />);
    expect(screen.getByTestId('ticket-odds')).toHaveTextContent('Good odds · Intelligence');
    expect(screen.getByTestId('ticket-tags')).toHaveTextContent('First day in Coalport · better odds');
    expect(screen.getByTestId(`ticket-${canvass.id}`).textContent).not.toMatch(/\d+ %(?! Party XP)/);
  });

  it('review 1: a ticket opened from its order is marked', () => {
    render(<Ticket action={canvass} energy={full} onPerform={() => undefined} highlight />);
    expect(screen.getByTestId('ticket-coalport.mill-gate.canvass')).toHaveAttribute('data-highlight', 'true');
  });
});

describe('CityMap', () => {
  it('places numbered hotspots at their map fractions and reports taps', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <CityMap
        map={cityViewFixture.map}
        isNight={false}
        locations={cityViewFixture.locations}
        selectedId="coalport.mill-gate"
        onSelect={onSelect}
      />,
    );
    const pins = screen.getAllByTestId('hotspot');
    expect(pins.map((p) => p.getAttribute('aria-label'))).toEqual(['1. Mill Gate', '3. Union Hall']);
    expect(pins[0]!.parentElement).toHaveAttribute('data-map-x', '0.75');
    expect(pins[0]!.parentElement).toHaveAttribute('data-map-y', '0.2');
    expect(pins[0]).toHaveAttribute('aria-pressed', 'true');
    await user.click(pins[1]!);
    expect(onSelect).toHaveBeenCalledWith('coalport.union-hall');
    expect(screen.getByTestId('map-night')).toHaveStyle({ opacity: '0' });
    expect(artUrl('map.coalport.day', 1024, 'avif')).toBe('/art/map.coalport.day-1024.avif');
    // Maps v3: no tiles given, so the stills; the WebP fallback at 1024 only.
    expect(screen.getByTestId('city-map')).toHaveAttribute('data-art', 'still');
    const webp = document.querySelector('[data-testid=map-layer] source[type="image/webp"]')!;
    expect(webp.getAttribute('srcset')).toBe('/art/map.coalport.day-1024.webp 1024w');
    const avif = document.querySelector('[data-testid=map-layer] source[type="image/avif"]')!;
    expect(avif.getAttribute('srcset')).toBe(
      '/art/map.coalport.day-1024.avif 1024w, /art/map.coalport.day-2048.avif 2048w',
    );
  });

  it('a landing at night loads the night map only; the day map comes when day does (art budget)', () => {
    const props = {
      map: cityViewFixture.map,
      locations: cityViewFixture.locations,
      selectedId: null,
      onSelect: () => undefined,
    };
    const { rerender, container } = render(<CityMap {...props} isNight />);
    const srcs = () => [...container.querySelectorAll('img, source')].map((e) => e.outerHTML).join(' ');
    expect(srcs()).toContain('map.coalport.night');
    expect(srcs()).not.toContain('map.coalport.day');
    rerender(<CityMap {...props} isNight={false} />);
    expect(srcs()).toContain('map.coalport.day');
  });
});

describe('the fixed map (review 2 #8, #9)', () => {
  const props = {
    map: cityViewFixture.map,
    isNight: false,
    locations: cityViewFixture.locations,
    onSelect: () => undefined,
  };
  const viewOf = (el: HTMLElement) => el.getAttribute('data-view')!.split(',').map(Number);

  // Review 3 (2 Oct 2026): at rest the map drags (within limits); it used to stay put. A drag keeps
  // the scale (the free zoom is the wheel, a pinch, a double tap or the buttons: review3.test.tsx).
  it('at rest a drag moves it at the same scale; a selection zooms in and arrives as the zoom starts', async () => {
    vi.useFakeTimers();
    try {
      const onArrive = vi.fn();
      const { rerender } = render(<CityMap {...props} selectedId={null} onArrive={onArrive} />);
      const box = screen.getByTestId('city-map');
      const fitted = viewOf(box);
      expect(box).toHaveAttribute('data-zoomed', 'false');
      fireEvent.pointerDown(box, { pointerId: 1, button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(box, { pointerId: 1, clientX: 40, clientY: 40 });
      fireEvent.pointerUp(box, { pointerId: 1 });
      const rest = box.getAttribute('data-view');
      expect(viewOf(box)[2]).toBe(fitted[2]); // no zoom
      expect(viewOf(box)[0] !== fitted[0] || viewOf(box)[1] !== fitted[1]).toBe(true);
      const pins = screen.getAllByTestId('hotspot');
      rerender(<CityMap {...props} selectedId="coalport.union-hall" onArrive={onArrive} />);
      expect(box).toHaveAttribute('data-zoomed', 'true');
      expect(viewOf(box)[2]).toBeGreaterThan(Number(rest!.split(',')[2]));
      // Review 3 (GDD §14.13): one movement of 250–350 ms; the page opens the sheet as it starts.
      expect(screen.getByTestId('map-layer').style.transition).toContain(`transform ${ZOOM_MS}ms`);
      expect(ZOOM_MS).toBeGreaterThanOrEqual(250);
      expect(ZOOM_MS).toBeLessThanOrEqual(350);
      expect(onArrive).toHaveBeenCalledWith('coalport.union-hall', { fillsMap: true });
      act(() => vi.advanceTimersByTime(ZOOM_MS + 50));
      expect(onArrive).toHaveBeenCalledTimes(1);
      // Zoomed in, a drag pans; the pins are the same elements throughout (no remount).
      const zoomed = viewOf(box);
      fireEvent.pointerDown(box, { pointerId: 2, button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerMove(box, { pointerId: 2, clientX: 60, clientY: 100 });
      fireEvent.pointerUp(box, { pointerId: 2 });
      expect(viewOf(box)[0]).not.toBe(zoomed[0]);
      rerender(<CityMap {...props} selectedId={null} onArrive={onArrive} />);
      expect(box.getAttribute('data-view')).toBe(rest);
      expect(screen.getAllByTestId('hotspot').every((p, i) => p === pins[i])).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('zoomView and panLimits (review 2 #9)', () => {
  const ASPECT = 1; // maps v3: square pictures
  const box = { w: 390, h: 692 };
  const content = { w: box.h * ASPECT, h: box.h };
  const fitted = { scale: 0.6, x: 0, y: 0 };

  it('closer than the fitted view (follow-up: 2.5 ×, at least 1.6 ×), the pin clear of the sheet', () => {
    const cover = { bottom: 480 };
    for (const pin of [
      { x: 0.75, y: 0.2 },
      { x: 0.15, y: 0.89 }, // near the bottom edge: short of the box's edge, under the sheet
      { x: 0.65, y: 0.08 },
    ]) {
      const v = zoomView({ box, content, fitted, pin, cover });
      expect(v.scale).toBeGreaterThanOrEqual(1.6);
      const px = v.x + pin.x * content.w * v.scale;
      const py = v.y + pin.y * content.h * v.scale;
      expect(px).toBeGreaterThanOrEqual(30);
      expect(px).toBeLessThanOrEqual(box.w - 30);
      expect(py).toBeGreaterThanOrEqual(30);
      expect(py).toBeLessThanOrEqual(box.h - cover.bottom - 30);
      const lim = panLimits(box, content, v);
      expect(v.x).toBeGreaterThanOrEqual(lim.x[0]);
      expect(v.x).toBeLessThanOrEqual(lim.x[1]);
      expect(v.y).toBeGreaterThanOrEqual(lim.y[0]);
      expect(v.y).toBeLessThanOrEqual(lim.y[1]);
    }
  });

  it('never above 3 ×, never past the native resolution, never below the covering scale', () => {
    const mid = { x: 0.5, y: 0.5 };
    expect(zoomView({ box, content, fitted: { scale: 2, x: 0, y: 0 }, pin: mid }).scale).toBe(3);
    expect(zoomView({ box, content, fitted: { scale: 0.3, x: 0, y: 0 }, pin: mid }).scale).toBe(1.6);
    // A 1920 px desktop on the stills: the 2048 px file allows 1.07 ×, not 2.5 ×.
    const wide = { w: 1920, h: 994 };
    const wideContent = { w: 1920, h: 1920 / ASPECT };
    const cap = nativeScale({ width: 8640, widths: [1024, 2048] }, wideContent.w);
    expect(cap).toBeCloseTo(2048 / 1920);
    const v = zoomView({
      box: wide,
      content: wideContent,
      fitted: { scale: 1, x: 0, y: 0 },
      pin: mid,
      maxScale: cap,
    });
    expect(wideContent.w * v.scale).toBeLessThanOrEqual(2048 + 1e-6);
    // Wider than the art: it covers the box (upscaled) rather than show past its edge.
    expect(nativeScale({ width: 8640, widths: [1024, 2048] }, 3000)).toBe(1);
    // The tiles serve the full 8,640 px: 3 × is reached.
    expect(nativeScale({ width: 8640, widths: [8640] }, 1920)).toBeCloseTo(4.5);
    expect(zoomScale({ scale: 1, x: 0, y: 0 }, 1)).toBe(1);
  });
});

describe('no black past the art (review 2 follow-up)', () => {
  // Any art shape: today's 3:2, and the squarer and taller art to come.
  const ASPECTS = [5056 / 3392, 4 / 3, 1, 2 / 3, 16 / 9];
  const BOXES = [
    { w: 360, h: 520 },
    { w: 375, h: 692 },
    { w: 488, h: 331 },
    { w: 768, h: 904 },
    { w: 1280, h: 714 },
    { w: 1920, h: 994 },
  ];
  const PINS = [0.03, 0.15, 0.36, 0.5, 0.64, 0.89, 0.97].flatMap((x) =>
    [0.03, 0.14, 0.44, 0.63, 0.89, 0.97].map((y) => ({ x, y })),
  );
  const contentOf = (b: { w: number; h: number }, aspect: number) => {
    const w = Math.max(b.w, b.h * aspect);
    return { w, h: w / aspect };
  };
  const at = (
    v: { scale: number; x: number; y: number },
    c: { w: number; h: number },
    p: { x: number; y: number },
  ) => ({
    x: v.x + p.x * c.w * v.scale,
    y: v.y + p.y * c.h * v.scale,
  });

  it('with no panel (tablets, desktops) the zoom covers the box for a pin anywhere, the pin on screen', () => {
    for (const aspect of ASPECTS)
      for (const b of BOXES) {
        const c = contentOf(b, aspect);
        const maxScale = nativeScale({ width: 6000, widths: [1280, 2560] }, c.w);
        for (const pin of PINS) {
          const v = zoomView({ box: b, content: c, fitted: { scale: 1, x: 0, y: 0 }, pin, maxScale });
          const label = `${aspect.toFixed(2)} ${b.w}×${b.h} pin ${pin.x},${pin.y}`;
          expect(coversBox(b, c, v), label).toBe(true);
          expect(v.scale, label).toBeGreaterThanOrEqual(1);
          const p = at(v, c, pin);
          expect(p.x, label).toBeGreaterThanOrEqual(0);
          expect(p.x, label).toBeLessThanOrEqual(b.w);
          expect(p.y, label).toBeGreaterThanOrEqual(0);
          expect(p.y, label).toBeLessThanOrEqual(b.h);
        }
      }
  });

  it('beside a panel: the pin clear of it, the part it leaves clear always covered, the rest only if it can', () => {
    const cases = [
      { b: { w: 375, h: 692 }, cover: { bottom: 487 } }, // a phone's sheet
      { b: { w: 360, h: 520 }, cover: { bottom: 384 } },
      { b: { w: 488, h: 331 }, cover: { left: 80 } }, // a phone held sideways
    ];
    for (const aspect of ASPECTS)
      for (const { b, cover } of cases) {
        const c = contentOf(b, aspect);
        const maxScale = nativeScale({ width: 6000, widths: [2560] }, c.w);
        for (const pin of PINS.filter((p) => p.x > 0.1 && p.x < 0.9 && p.y > 0.1 && p.y < 0.9)) {
          const v = zoomView({
            box: b,
            content: c,
            fitted: { scale: 0.6, x: 0, y: 0 },
            pin,
            cover,
            maxScale,
          });
          const label = `${aspect.toFixed(2)} ${b.w}×${b.h} pin ${pin.x},${pin.y}`;
          const clear = {
            x0: cover.left ?? 0,
            x1: b.w,
            y0: 0,
            y1: b.h - (cover.bottom ?? 0),
          };
          // The clear part is covered by the art.
          expect(v.x, label).toBeLessThanOrEqual(clear.x0 + 0.5);
          expect(v.y, label).toBeLessThanOrEqual(clear.y0 + 0.5);
          expect(v.x + c.w * v.scale, label).toBeGreaterThanOrEqual(clear.x1 - 0.5);
          expect(v.y + c.h * v.scale, label).toBeGreaterThanOrEqual(clear.y1 - 0.5);
          // The pin's 44 px target clear of the panel.
          const p = at(v, c, pin);
          expect(p.x - 22, label).toBeGreaterThanOrEqual(clear.x0);
          expect(p.x + 22, label).toBeLessThanOrEqual(clear.x1);
          expect(p.y - 22, label).toBeGreaterThanOrEqual(clear.y0);
          expect(p.y + 22, label).toBeLessThanOrEqual(clear.y1);
          // The art covers the whole box unless the pin cannot be clear then even at the native cap.
          if (!coversBox(b, c, v)) expect(v.scale, label).toBeLessThanOrEqual(maxScale + 1e-9);
          // Panning stays within limits that keep the clear part covered.
          const lim = panLimits(b, c, v);
          for (const x of lim.x) expect(x + c.w * v.scale, label).toBeGreaterThanOrEqual(clear.x1 - 0.5);
          for (const y of lim.y) expect(y + c.h * v.scale, label).toBeGreaterThanOrEqual(clear.y1 - 0.5);
          expect(Math.max(...lim.x), label).toBeLessThanOrEqual(clear.x0 + 0.5);
          expect(Math.max(...lim.y), label).toBeLessThanOrEqual(clear.y0 + 0.5);
        }
      }
  });

  it('a pin away from the edges zooms with the art covering the whole box, even beside a panel', () => {
    const b = { w: 375, h: 692 };
    const c = contentOf(b, 1);
    const v = zoomView({
      box: b,
      content: c,
      fitted: { scale: 0.6, x: 0, y: 0 },
      pin: { x: 0.5, y: 0.4 },
      cover: { bottom: 487 },
      maxScale: nativeScale({ width: 6000, widths: [2560] }, c.w),
    });
    expect(coversBox(b, c, v)).toBe(true);
  });

  it('the zoom between two covering views covers at every frame (the transition is linear in x, y, scale)', () => {
    const b = { w: 1440, h: 814 };
    const c = contentOf(b, 5056 / 3392);
    const fitted = fitPinsView({
      box: b,
      content: c,
      pins: [
        { x: 0.2, y: 0.2 },
        { x: 0.8, y: 0.8 },
      ],
      insets: { top: 0, bottom: 0 },
    });
    expect(coversBox(b, c, fitted)).toBe(true);
    for (const pin of [
      { x: 0.05, y: 0.05 },
      { x: 0.95, y: 0.9 },
      { x: 0.5, y: 0.5 },
    ]) {
      const z = zoomView({
        box: b,
        content: c,
        fitted,
        pin,
        maxScale: nativeScale({ width: 5056, widths: [2560] }, c.w),
      });
      for (let t = 0; t <= 1; t += 0.05) {
        const f = {
          scale: fitted.scale + (z.scale - fitted.scale) * t,
          x: fitted.x + (z.x - fitted.x) * t,
          y: fitted.y + (z.y - fitted.y) * t,
        };
        expect(coversBox(b, c, f), `t ${t.toFixed(2)}`).toBe(true);
      }
    }
  });

  it('the first view covers the box when the pins allow it, and says so', () => {
    const b = { w: 1440, h: 814 };
    const c = contentOf(b, 5056 / 3392);
    const pins = [
      { x: 0.3, y: 0.2 },
      { x: 0.7, y: 0.8 },
    ];
    expect(coversBox(b, c, fitPinsView({ box: b, content: c, pins, insets: { top: 0, bottom: 0 } }))).toBe(
      true,
    );
    // A phone upright with pins spread across a 3:2 map: letterboxed (the blurred copy fills the rest).
    const phone = { w: 360, h: 520 };
    const pc = contentOf(phone, 5056 / 3392);
    const wide = [
      { x: 0.14, y: 0.4 },
      { x: 0.78, y: 0.6 },
    ];
    expect(
      coversBox(
        phone,
        pc,
        fitPinsView({ box: phone, content: pc, pins: wide, insets: { top: 0, bottom: 0 } }),
      ),
    ).toBe(false);
  });
});

describe('JobsCard', () => {
  it('offers a free first job with its pay line, and names every unmet requirement', async () => {
    const user = userEvent.setup();
    const onTake = vi.fn();
    const driver = {
      ...mill.jobs[0]!,
      jobId: 'coalport-driver',
      name: 'Driver',
      locked: { reason: 'LEVEL' as const, need: 3 },
      unmet: [
        { reason: 'LEVEL' as const, need: 3 },
        { reason: 'STAT' as const, stat: 'agi' as const, need: 10 },
      ],
    };
    render(<JobsCard jobs={[mill.jobs[0]!, driver]} held={null} onTake={onTake} />);
    await user.click(screen.getByRole('button', { name: 'Take the job' }));
    expect(onTake).toHaveBeenCalledWith('coalport-factory-worker');
    // Review 1: a wage, paid at midnight; no Energy anywhere.
    expect(screen.getByTestId('job-coalport-factory-worker')).toHaveTextContent(
      '216 a day · paid at midnight',
    );
    expect(screen.getByRole('button', { name: 'Needs Level 3, AGI 10' })).toBeDisabled();
  });

  it('review 1: a switch is free and resets seniority; the held job shows its seniority', () => {
    render(
      <JobsCard
        jobs={[
          { ...mill.jobs[0]!, isSwitch: true },
          { ...mill.jobs[0]!, jobId: 'x', held: true },
        ]}
        held={{ days: 4, pct: 8 }}
        onTake={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: 'Switch · seniority resets' })).toBeEnabled();
    expect(screen.getByText('Your job · seniority 4 days · +8 %')).toBeInTheDocument();
  });
});

describe('Paper pieces', () => {
  it('masthead, orders (paper variant) and the desk', () => {
    render(
      <>
        <Masthead paper={paperViewFixture} />
        <OrdersList orders={ordersViewFixture} variant="paper" />
        <DeskList desk={paperViewFixture.desk} />
      </>,
    );
    expect(screen.getByRole('heading', { name: 'The Coalport Clarion' })).toBeInTheDocument();
    expect(screen.getByTestId('dateline')).toHaveTextContent('Tuesday · 29 September · Coalport');
    expect(screen.getAllByTestId('order')).toHaveLength(3);
    expect(screen.getByText('— P.H.')).toBeInTheDocument();
    // Review 1: with no job, where the jobs are.
    expect(within(screen.getByTestId('desk')).getByTestId('desk-no-job')).toHaveTextContent(
      'No job yet · take one at the Mill Gate, Market Row or Harbour Quays',
    );
    expect(within(screen.getByTestId('desk')).getByText('150 XP to Level 2')).toBeInTheDocument();
  });

  it('the Today strip adds up the day', () => {
    render(
      <TodayStrip
        today={{ ...tallyFixture, energy: 30, attempts: 3, successes: 2, xp: 135, fxp: 18, opinion: 0.125 }}
      />,
    );
    expect(screen.getByTestId('today-strip')).toHaveTextContent(
      'Today:30 Energy · 3 attempts · 2 wins · +135 XP · +18 Party XP · +0.125 opinion · +20 Iron',
    );
  });
});

describe('TabBar', () => {
  it('real links, disabled tabs with "Soon", dots', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <TabBar
        active="map"
        onNavigate={onNavigate}
        items={[
          { id: 'map', label: 'Map', href: '/city/coalport' },
          { id: 'paper', label: 'Paper', href: '/paper', dot: true },
          { id: 'dossier', label: 'Dossier', href: '#', disabled: true },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Map' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('tab-dot-paper')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dossier/ })).toHaveAttribute('aria-disabled', 'true');
    await user.click(screen.getByRole('link', { name: 'Paper' }));
    expect(onNavigate).toHaveBeenCalledWith('/paper');
  });
});

describe('HudBar v2', () => {
  it('shows name, rank title and level, Energy with "full at", Iron; a badge when points wait', async () => {
    const user = userEvent.setup();
    const onPlaceStat = vi.fn();
    render(
      <HudBar
        character={{ ...characterViewFixture, statPointsPending: 1, pc: 5 }}
        nextTickIn={425_000}
        onPlaceStat={onPlaceStat}
      />,
    );
    expect(screen.getByText('Mara Lenk')).toBeInTheDocument();
    expect(screen.getByTestId('hud-rank')).toHaveTextContent('Recruit · Lv 1');
    expect(screen.getByTestId('hud-energy')).toHaveTextContent('90 / 100');
    expect(screen.getByTestId('hud-next-tick')).toHaveTextContent(/^full at \d\d:\d\d$/);
    expect(screen.getByRole('meter', { name: 'Energy' })).toHaveAttribute(
      'aria-valuetext',
      '90 of 100, next +5 in 7:05',
    );
    expect(screen.getByTestId('hud-iron')).toHaveTextContent('20');
    expect(screen.getByTestId('hud-pc')).toHaveTextContent('5');
    // m5 (onboarding §14.1): the PC column shows on phones as on desktop; review 2 #5: named in
    // full, never the bare "PC".
    expect(screen.getByTestId('hud-pc-block')).not.toHaveClass('hidden');
    expect(screen.getByTestId('hud-pc-block')).toHaveTextContent('5PoliticalCapital');
    expect(screen.getByRole('region', { name: 'Character' })).not.toHaveTextContent(/\bPC\b/);
    await user.click(
      screen.getByRole('button', { name: '1 point to place · nothing is lost by choosing later' }),
    );
    await user.click(screen.getByRole('button', { name: 'INT 12 → 13' }));
    expect(onPlaceStat).toHaveBeenCalledWith('int');
  });

  it('review 1 #3, #4, #14: gauges in words, XP to the next Level and Faction XP to the next Rank', () => {
    render(
      <HudBar character={{ ...characterViewFixture, level: 2, xp: 270, fxp: 31 }} nextTickIn={425_000} />,
    );
    const hud = screen.getByRole('region', { name: 'Character' });
    // Words, not "EN".
    expect(hud).toHaveTextContent('Energy');
    expect(hud).not.toHaveTextContent(/\bEN\b/);
    // XP (answers §5): "{xp} XP · {n} to Level {next}"; the bar fills within Level 2 (150–450).
    expect(screen.getByTestId('hud-xp')).toHaveTextContent('270 XP · 180 to Level 3');
    const xp = screen.getByRole('meter', { name: 'Experience to next level' });
    expect(xp).toHaveAttribute('aria-valuenow', '120');
    expect(xp).toHaveAttribute('aria-valuemax', '300');
    expect(xp).toHaveAttribute('aria-valuetext', '270 XP, 180 to Level 3');
    expect((xp.firstElementChild as HTMLElement).style.width).toBe('40%');
    // Faction XP (answers §8, review 2 #7): the bar labelled with the next rank ("To Rank 2" under
    // 400 px) and its numbers always shown after it.
    expect(screen.getByTestId('hud-fxp-rank')).toHaveTextContent('To Rank 2To Activist');
    expect(screen.getByTestId('hud-fxp')).toHaveTextContent('31 / 400 Party XP');
    expect(screen.getByRole('meter', { name: 'Party XP to next rank' })).toHaveAttribute(
      'aria-valuetext',
      '31 of 400 Party XP, 369 to Activist',
    );
  });

  it('#14: at the top Rank the Faction XP bar is full and names the title', () => {
    render(
      <HudBar
        character={{
          ...characterViewFixture,
          fxp: 61_000,
          rank: {
            ...characterViewFixture.rank,
            value: 7,
            title: 'Chairman',
            fxpFloor: 60_000,
            fxpNext: null,
            nextTitle: null,
          },
        }}
        nextTickIn={null}
      />,
    );
    expect(screen.getByTestId('hud-fxp-rank')).toHaveTextContent('Chairman');
    expect(screen.getByTestId('hud-fxp')).toHaveTextContent('61,000 Party XP');
    const fxp = screen.getByRole('meter', { name: 'Party XP to next rank' });
    expect((fxp.firstElementChild as HTMLElement).style.width).toBe('100%');
  });

  it('m5: no PC column, and no zero, before the first PC is earned', () => {
    render(<HudBar character={{ ...characterViewFixture, pc: 0 }} nextTickIn={425_000} />);
    expect(screen.queryByTestId('hud-pc')).toBeNull();
    expect(screen.queryByText('PC')).toBeNull();
    expect(screen.queryByText('Political')).toBeNull();
  });
});

describe('Field', () => {
  it('labels its input and reports errors', () => {
    render(<Field label="Email" type="email" error="Required" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Required');
  });
});

describe('format helpers', () => {
  it('formats countdowns, signed numbers and opinion deltas', () => {
    expect(formatCountdown(425_000)).toBe('7:05');
    expect(formatCountdown(3_725_000)).toBe('1:02:05');
    expect(formatCountdown(-5)).toBe('0:00');
    expect(formatSigned(45)).toBe('+45');
    expect(formatSigned(-3)).toBe('−3');
    expect(formatOpinionDelta(0.025)).toBe('+0.025');
    expect(formatOpinionDelta(0)).toBe('0');
  });
});

describe('fitPinsView (QA M2: every pin on screen at the first view)', () => {
  // Coalport's six pins (content §1.1) on its 5056 × 3392 map.
  const PINS = [
    { x: 0.36, y: 0.44 },
    { x: 0.43, y: 0.5 },
    { x: 0.66, y: 0.3 },
    { x: 0.6, y: 0.14 },
    { x: 0.5, y: 0.63 },
    { x: 0.15, y: 0.89 },
  ];
  const ASPECT = 5056 / 3392;
  const view = (w: number, h: number, insets = { top: 0, bottom: 0 }) => {
    const cw = Math.max(w, h * ASPECT);
    const content = { w: cw, h: cw / ASPECT };
    const v = fitPinsView({ box: { w, h }, content, pins: PINS, insets });
    const at = PINS.map((p) => ({ x: v.x + p.x * content.w * v.scale, y: v.y + p.y * content.h * v.scale }));
    return { v, at, content };
  };

  it('a 375 × 692 phone map with the plate (72 px) and the orders panel (110 px): all six clear of both', () => {
    const { v, at } = view(375, 692, { top: 72, bottom: 110 });
    expect(v.scale).toBeLessThan(1);
    for (const p of at) {
      expect(p.x - 22).toBeGreaterThanOrEqual(0);
      expect(p.x + 22).toBeLessThanOrEqual(375);
      expect(p.y - 22).toBeGreaterThanOrEqual(72);
      expect(p.y + 22).toBeLessThanOrEqual(692 - 110);
    }
  });

  it('a 1440 × 814 desktop map keeps the covering scale and every pin inside the box', () => {
    const { v, at } = view(1440, 814);
    expect(v.scale).toBe(1);
    for (const p of at) {
      expect(p.y - 22).toBeGreaterThanOrEqual(0);
      expect(p.y + 22).toBeLessThanOrEqual(814);
    }
  });

  it('never positions the image past the pan limits (no jump on the first drag)', () => {
    for (const [w, h] of [
      [375, 692],
      [768, 900],
      [1440, 814],
      [320, 400],
    ] as const) {
      const { v, content } = view(w, h, { top: 60, bottom: 90 });
      const dx = w - content.w * v.scale;
      const dy = h - content.h * v.scale;
      expect(v.x).toBeGreaterThanOrEqual(Math.min(dx, 0) - 1e-9);
      expect(v.x).toBeLessThanOrEqual(Math.max(dx, 0) + 1e-9);
      expect(v.y).toBeGreaterThanOrEqual(Math.min(dy, 0) - 1e-9);
      expect(v.y).toBeLessThanOrEqual(Math.max(dy, 0) + 1e-9);
    }
  });

  // Slice-2 QA M2: from 640 px the plate (with the orders list and Today) sits in the top-left
  // corner, 420 px wide, and the desktop tab dock floats over the bottom middle. Ashford's first two
  // pins are in the map's top-left corner.
  const ASHFORD = [
    { x: 0.18, y: 0.16 },
    { x: 0.33, y: 0.11 },
    { x: 0.59, y: 0.3 },
    { x: 0.78, y: 0.2 },
    { x: 0.2, y: 0.45 },
    { x: 0.69, y: 0.69 },
  ];
  const DUSKWALL = [
    { x: 0.47, y: 0.44 },
    { x: 0.5, y: 0.65 },
    { x: 0.64, y: 0.78 },
    { x: 0.77, y: 0.36 },
    { x: 0.18, y: 0.64 },
    { x: 0.14, y: 0.84 },
  ];
  const clearView = (w: number, h: number, pins: typeof ASHFORD, blocks: MapRect[]) => {
    const cw = Math.max(w, h * ASPECT);
    const content = { w: cw, h: cw / ASPECT };
    const v = fitPinsView({ box: { w, h }, content, pins, insets: { top: 0, bottom: 0, blocks } });
    const at = pins.map((p) => ({ x: v.x + p.x * content.w * v.scale, y: v.y + p.y * content.h * v.scale }));
    for (const [n, p] of at.entries()) {
      // Inside the box, the whole 44 px target clear of every block.
      expect(p.x - 22, `pin ${n + 1}`).toBeGreaterThanOrEqual(0);
      expect(p.x + 22, `pin ${n + 1}`).toBeLessThanOrEqual(w);
      expect(p.y - 22, `pin ${n + 1}`).toBeGreaterThanOrEqual(0);
      expect(p.y + 22, `pin ${n + 1}`).toBeLessThanOrEqual(h);
      for (const b of blocks) {
        const clear = p.x + 22 <= b.x0 || p.x - 22 >= b.x1 || p.y + 22 <= b.y0 || p.y - 22 >= b.y1;
        expect(clear, `pin ${n + 1} under ${JSON.stringify(b)}`).toBe(true);
      }
    }
    const dx = w - content.w * v.scale;
    const dy = h - content.h * v.scale;
    expect(v.x).toBeGreaterThanOrEqual(Math.min(dx, 0) - 1e-9);
    expect(v.x).toBeLessThanOrEqual(Math.max(dx, 0) + 1e-9);
    expect(v.y).toBeGreaterThanOrEqual(Math.min(dy, 0) - 1e-9);
    expect(v.y).toBeLessThanOrEqual(Math.max(dy, 0) + 1e-9);
    return v;
  };

  it('n11: on a phone the map sits in the middle of the area between the plate and the orders panel', () => {
    for (const pins of [PINS, ASHFORD, DUSKWALL]) {
      const [w, h, top, bottom] = [375, 692, 72, 110];
      const cw = Math.max(w, h * ASPECT);
      const content = { w: cw, h: cw / ASPECT };
      const v = fitPinsView({ box: { w, h }, content, pins, insets: { top, bottom } });
      // The image is shorter than the clear area here (the pins' width sets the scale): what is left
      // is split between the top and the bottom, not one band above the orders panel.
      const above = v.y - top;
      const below = h - bottom - (v.y + content.h * v.scale);
      expect(Math.abs(above - below)).toBeLessThanOrEqual(1);
      for (const p of pins) {
        const y = v.y + p.y * content.h * v.scale;
        expect(y - 22).toBeGreaterThanOrEqual(top);
        expect(y + 22).toBeLessThanOrEqual(h - bottom);
      }
    }
  });

  it('keeps Ashford clear of the corner plate and the dock at 1920, 1440, 1280, 1024 and 768 wide', () => {
    for (const [w, h, plateH] of [
      [1920, 994, 330],
      [1440, 814, 330],
      [1280, 714, 330],
      [1024, 682, 330],
      [768, 904, 330],
    ] as const) {
      const plate = { x0: 10, y0: 10, x1: 430, y1: 10 + plateH };
      const dock = { x0: w / 2 - 210, y0: h - 34, x1: w / 2 + 210, y1: h };
      clearView(w, h, ASHFORD, w >= 1024 ? [plate, dock] : [plate]);
    }
  });

  it('640 wide: the plate is a band, and the pan limits must not pull Ashford back under it', () => {
    // 640 × 735 map, the plate with its orders 232 px deep across 420 px (a band at this width).
    const [w, h, top] = [640, 735, 232];
    const cw = Math.max(w, h * ASPECT);
    const content = { w: cw, h: cw / ASPECT };
    const v = fitPinsView({ box: { w, h }, content, pins: ASHFORD, insets: { top, bottom: 0 } });
    const dy = h - content.h * v.scale;
    expect(v.y).toBeGreaterThanOrEqual(Math.min(dy, 0) - 1e-9);
    expect(v.y).toBeLessThanOrEqual(Math.max(dy, 0) + 1e-9);
    for (const p of ASHFORD) {
      const y = v.y + p.y * content.h * v.scale;
      expect(y - 22).toBeGreaterThanOrEqual(top);
      expect(y + 22).toBeLessThanOrEqual(h);
    }
  });

  it('a first view already clear of the blocks is kept as it was (Duskwall at 1440 × 814)', () => {
    const plate = { x0: 10, y0: 10, x1: 430, y1: 340 };
    const cw = Math.max(1440, 814 * ASPECT);
    const content = { w: cw, h: cw / ASPECT };
    const without = fitPinsView({
      box: { w: 1440, h: 814 },
      content,
      pins: DUSKWALL,
      insets: { top: 0, bottom: 0 },
    });
    expect(clearView(1440, 814, DUSKWALL, [plate])).toEqual(without);
  });
});
