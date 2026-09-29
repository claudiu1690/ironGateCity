import {
  characterViewFixture,
  cityViewFixture,
  ordersViewFixture,
  paperViewFixture,
  tallyFixture,
} from '@irongate/rules/testing';
import { render, screen, within } from '@testing-library/react';
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
  fitPinsView,
  formatCountdown,
  formatOpinionDelta,
  formatSigned,
} from '../src';
import type { MapRect } from '../src';

const mill = cityViewFixture.locations[0]!;
const canvass = mill.actions[0]!;
const shift = mill.actions[1]!;
const study = cityViewFixture.locations[1]!.actions[0]!;
const full = { value: 100, nextTickAt: null };

describe('Ticket v2', () => {
  it('shows the odds, the order tag and performs ×1 and ×3', async () => {
    const user = userEvent.setup();
    const onPerform = vi.fn();
    render(<Ticket action={canvass} energy={full} hasJob={false} onPerform={onPerform} />);
    expect(screen.getByTestId('ticket-chance')).toHaveTextContent('66 %');
    expect(screen.getByTestId('ticket-tags')).toHaveTextContent('Canvassing · Party order 1 / 2 · +25 % FXP');
    await user.click(screen.getByRole('button', { name: 'Canvass the shift change, once, 10 Energy' }));
    await user.click(
      screen.getByRole('button', { name: 'Canvass the shift change, three times, 30 Energy' }),
    );
    expect(onPerform.mock.calls).toEqual([[1], [3]]);
  });

  it('disables ×3 below its cost with the hint, and ×1 with "Needs … ready at"', () => {
    const { rerender } = render(
      <Ticket
        action={canvass}
        energy={{ value: 25, nextTickAt: 0 }}
        hasJob={false}
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
        hasJob={false}
        onPerform={() => undefined}
      />,
    );
    expect(screen.getByRole('button', { name: /once/ })).toBeDisabled();
    expect(screen.getByTestId('ticket-hint')).toHaveTextContent(/^Needs 10 Energy · ready at \d\d:\d\d$/);
  });

  it('tapping the percentage shows the breakdown', async () => {
    const user = userEvent.setup();
    render(<Ticket action={canvass} energy={full} hasJob={false} onPerform={() => undefined} />);
    const toggle = screen.getByRole('button', { name: /66 %/ });
    expect(screen.queryByText('INT 12 vs difficulty 8 (×4)')).not.toBeVisible();
    await user.click(toggle);
    expect(screen.getByText('INT 12 vs difficulty 8 (×4)')).toBeVisible();
  });

  it('training shows the live cost and "INT 12 → 13 · no roll"; a shift without a job is disabled', () => {
    render(
      <Ticket
        action={study}
        energy={{ value: 150, nextTickAt: 0 }}
        hasJob={false}
        onPerform={() => undefined}
      />,
    );
    expect(screen.getByText('INT 12 → 13 · no roll')).toBeInTheDocument();
    // ×1 only (§8.5, content §13.2): one Train button with the live cost, no ×3.
    expect(screen.getByRole('button', { name: 'Study in the reading room, 44 Energy' })).toHaveTextContent(
      'Train',
    );
    expect(screen.queryByRole('button', { name: /three times/ })).toBeNull();
    render(<Ticket action={shift} energy={full} hasJob={false} onPerform={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Work your shift at the mill, 4 Energy' })).toBeDisabled();
    expect(screen.getByText('No job yet · take one below')).toBeInTheDocument();
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
    expect(pins[0]!.parentElement).toHaveStyle({ left: '36%', top: '44%' });
    expect(pins[0]).toHaveAttribute('aria-pressed', 'true');
    await user.click(pins[1]!);
    expect(onSelect).toHaveBeenCalledWith('coalport.union-hall');
    expect(screen.getByTestId('map-night')).toHaveStyle({ opacity: '0' });
    expect(artUrl('map.coalport.day', 1280, 'avif')).toBe('/art/map.coalport.day-1280.avif');
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
    render(<JobsCard jobs={[mill.jobs[0]!, driver]} held={null} onTake={onTake} energyValue={100} />);
    await user.click(screen.getByRole('button', { name: 'Take the job' }));
    expect(onTake).toHaveBeenCalledWith('coalport-factory-worker');
    expect(screen.getByText('216 a day · half at midnight, half for the shift')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Needs Level 3, AGI 10' })).toBeDisabled();
  });

  it('a switch carries its warning; the held job shows streak and sick days', () => {
    render(
      <JobsCard
        jobs={[
          { ...mill.jobs[0]!, switchCost: 2 },
          { ...mill.jobs[0]!, jobId: 'x', held: true },
        ]}
        held={{ streak: 4, sickDaysLeft: 2 }}
        onTake={() => undefined}
        energyValue={100}
      />,
    );
    expect(screen.getByRole('button', { name: 'Switch · 2 Energy · streak resets' })).toBeEnabled();
    expect(screen.getByText('Your job · streak 4 days · 2 sick days left')).toBeInTheDocument();
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
    expect(within(screen.getByTestId('desk')).getByText('no job yet')).toBeInTheDocument();
    expect(within(screen.getByTestId('desk')).getByText('150 XP to Level 2')).toBeInTheDocument();
  });

  it('the Today strip adds up the day', () => {
    render(
      <TodayStrip
        today={{ ...tallyFixture, energy: 30, attempts: 3, successes: 2, xp: 135, fxp: 18, opinion: 0.125 }}
      />,
    );
    expect(screen.getByTestId('today-strip')).toHaveTextContent(
      'Today:30 Energy · 3 attempts · 2 wins · +135 XP · +18 FXP · +0.125 opinion · +20 Iron',
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
    // m5 (onboarding §14.1): the PC column shows on phones as on desktop.
    expect(screen.getByTestId('hud-pc').parentElement).not.toHaveClass('hidden');
    await user.click(screen.getByRole('button', { name: '1 point to place' }));
    await user.click(screen.getByRole('button', { name: 'INT 12 → 13' }));
    expect(onPlaceStat).toHaveBeenCalledWith('int');
  });

  it('m5: no PC column, and no zero, before the first PC is earned', () => {
    render(<HudBar character={{ ...characterViewFixture, pc: 0 }} nextTickIn={425_000} />);
    expect(screen.queryByTestId('hud-pc')).toBeNull();
    expect(screen.queryByText('PC')).toBeNull();
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
