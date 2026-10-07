import { districtFixtures, lodgingsFixtures, residenceCardFixtures } from '@irongate/rules/testing';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LodgingsCard, ResidenceCard, TramBar, coverRestView, nameHalfWidth, namesRestView, placeNames } from '../src';
import type { NameSpot } from '../src';

/**
 * Slice 4 fix round (docs/qa/slice-4-report.md M1, M3; docs/design/slice-4-fixes.md §1, §6): the
 * capital overview's names find a clear spot inside their own outline, the first view is the covered
 * picture centred on them, the tram bar's chips wrap rather than run into each other; the residence
 * card of a candidate on the ballot, and the room paid ahead.
 */

/** A square district outline around (x, y), `r` px each way. */
const square = (x: number, y: number, r: number) =>
  [
    [x - r, y - r],
    [x + r, y - r],
    [x + r, y + r],
    [x - r, y + r],
  ] as const;
const spot = (id: string, x: number, y: number, half = 50, r = 160): NameSpot => ({
  id,
  x,
  y,
  half,
  outline: square(x, y, r),
});
const rectOf = (s: NameSpot, p: { dx: number; dy: number }) => ({
  x0: s.x + p.dx - s.half,
  x1: s.x + p.dx + s.half,
  y0: s.y + p.dy - 22,
  y1: s.y + p.dy + 22,
});
const overlap = (a: ReturnType<typeof rectOf>, b: ReturnType<typeof rectOf>) =>
  a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

describe('the overview’s names (QA slice 4 M1)', () => {
  const box = { w: 1440, h: 770 };

  it('a name in the open stays on its point', () => {
    const at = placeNames([spot('a', 700, 400)], box, { top: 0, bottom: 0, blocks: [] });
    expect(at.get('a')).toEqual({ dx: 0, dy: 0, clear: true });
  });

  it('a name under the corner plate slides out of it, its centre still inside its outline', () => {
    const plate = { x0: 10, y0: 10, x1: 430, y1: 456 };
    const s = spot('old-town', 346, 200, 50, 200);
    const p = placeNames([s], box, { top: 0, bottom: 0, blocks: [plate] }).get('old-town')!;
    expect(p.clear).toBe(true);
    const r = rectOf(s, p);
    expect(r.x0 >= plate.x1 || r.y0 >= plate.y1).toBe(true);
    expect(Math.abs(p.dx) <= 200 && Math.abs(p.dy) <= 200).toBe(true);
  });

  it('two names on top of each other: the second moves, they never overlap', () => {
    const a = spot('gq', 182, 103, 56);
    const b = spot('ot', 82, 86, 37);
    const at = placeNames([a, b], { w: 343, h: 284 }, { top: 0, bottom: 0, blocks: [] });
    expect(overlap(rectOf(a, at.get('gq')!), rectOf(b, at.get('ot')!))).toBe(false);
    expect([...at.values()].every((p) => p.clear)).toBe(true);
  });

  it('a name stays between the bands (a phone’s plate and orders)', () => {
    const s = spot('a', 200, 120, 50);
    const p = placeNames([s], { w: 390, h: 600 }, { top: 150, bottom: 0, blocks: [] }).get('a')!;
    expect(rectOf(s, p).y0).toBeGreaterThanOrEqual(150);
  });

  it('nowhere clear inside its outline: it only slides along the edge, and says so', () => {
    const s = { id: 'a', x: 20, y: 100, half: 50, outline: square(20, 100, 10) };
    const p = placeNames([s], { w: 400, h: 300 }, { top: 0, bottom: 0, blocks: [{ x0: 0, y0: 0, x1: 400, y1: 300 }] }).get('a')!;
    expect(p).toEqual({ dx: 34, dy: 0, clear: false });
  });

  it('the first view moves up or down until every name is clear, when it can', () => {
    // A block over the top 60 px: a name at y 40 is under it at the centred view, clear 24 px lower.
    const blocks = [{ x0: 0, y0: 0, x1: 400, y1: 60 }];
    const place = (v: { x: number; y: number; scale: number }) =>
      placeNames([{ id: 'a', x: 200 + v.x, y: 40 + v.y, half: 50, outline: square(200 + v.x, 40 + v.y, 20) }], { w: 400, h: 300 }, {
        top: 0,
        bottom: 0,
        blocks,
      });
    const v = namesRestView({ scale: 1, x: 0, y: 0 }, [-100, 100], place);
    expect(v.y).toBeGreaterThan(0);
    expect(place(v).get('a')!.clear).toBe(true);
  });

  it('the overview’s first view is the covering scale, centred on the names, never zoomed in', () => {
    const v = coverRestView({
      box: { w: 1440, h: 770 },
      content: { w: 1440, h: 1440 },
      pins: [
        { x: 0.53, y: 0.3 },
        { x: 0.24, y: 0.25 },
        { x: 0.4, y: 0.6 },
        { x: 0.76, y: 0.62 },
        { x: 0.85, y: 0.16 },
      ],
      insets: { top: 0, bottom: 0, blocks: [{ x0: 10, y0: 10, x1: 430, y1: 556 }] },
      minScale: 1,
    });
    expect(v.scale).toBe(1);
    // The names' box (y 0.16–0.62) centred in the box's height.
    expect(v.y + 0.39 * 1440).toBeCloseTo(385, 0);
  });

  it('a compact name is narrower than the full one (a narrow map)', () => {
    expect(nameHalfWidth('Gov. Quarter', [], true)).toBeLessThan(nameHalfWidth('Government Quarter'));
  });
});

describe('the tram bar on a narrow column (QA slice 4 M3)', () => {
  const districts = districtFixtures.map((d) => ({ id: d.id, name: d.name }));

  it('four in a row by default; two rows of two in the side panel', () => {
    const { rerender } = render(<TramBar districts={districts} current="irongate.eastside" onGo={() => undefined} />);
    expect(screen.getByTestId('tram-bar').className).toContain('grid-cols-4');
    rerender(<TramBar districts={districts} current="irongate.eastside" onGo={() => undefined} columns={2} />);
    expect(screen.getByTestId('tram-bar').className).toContain('grid-cols-2');
  });

  it('a label wraps inside its chip rather than running into the next', () => {
    render(<TramBar districts={districts} current="irongate.eastside" onGo={() => undefined} />);
    for (const chip of screen.getAllByTestId('tram-chip')) {
      expect(chip.className).not.toContain('whitespace-nowrap');
      expect(chip.className).toContain('min-h-11');
    }
  });
});

describe('the residence card in the fix round (slice-4-fixes.md §1, §6)', () => {
  const noop = () => undefined;

  it('a candidate on the ballot where they live: the day they can move, no button', () => {
    render(
      <ResidenceCard card={residenceCardFixtures.onBallot} placeName="Eastside" rank2Title="Activist" onRegister={noop} />,
    );
    expect(screen.getByTestId('residence-line1')).toHaveTextContent('You live in Coalport');
    expect(screen.getByTestId('residence-line2')).toHaveTextContent(
      "You're a candidate in Coalport until the result · you can move from Friday.",
    );
    expect(screen.queryByTestId('residence-register')).toBeNull();
  });

  // Review 4 #9 (answers §9.3): the room is the Lodgings card at Tram Junction.
  it('Seven more nights while seven or fewer remain; with more than seven paid, the day it comes back and no button', () => {
    const { unmount } = render(<LodgingsCard lodgings={lodgingsFixtures.renew} onTake={noop} />);
    expect(screen.getByTestId('lodgings-take')).toHaveTextContent('Seven more nights · 100 Iron');
    unmount();
    render(<LodgingsCard lodgings={lodgingsFixtures.notYet} onTake={noop} />);
    expect(screen.getByTestId('lodgings-running')).toHaveTextContent(
      'Your bed until Sunday · Rested banks to 250 · renew from Sunday',
    );
    expect(screen.queryByTestId('lodgings-take')).toBeNull();
  });
});
