import { journeyProgress, trainAt } from '@irongate/rules';
import type { RouteLeg } from '@irongate/rules';
import { journeyViewFixture } from '@irongate/rules/testing';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CityMap, TravelPin, setClockSource } from '../src';
import type { MapTraveller } from '../src';

/**
 * Review 4, phase 6 (docs/tech/review-4.md §6.5, §6.6; the user, 7 Oct 2026: a plain moving pin, not
 * a train): the traveller's pin on the nation map, placed by `trainAt` at the clock's progress, with
 * its Courier label; the route drawn on the picture.
 */

const j = journeyViewFixture;
const legs: RouteLeg[] = j.route.legs.map((l) => ({ points: l.points, minutes: l.toT - l.fromT }));
const traveller = (pulse = 0): MapTraveller => ({
  at: (now) => {
    const p = trainAt(legs, journeyProgress(j.boardedAt, j.arrivesAt, now));
    return { x: p.x, y: p.y, label: `To Irongate · ${Math.ceil((j.arrivesAt - now) / 60_000)} min` };
  },
  name: () => 'Your pin',
  colour: 'var(--color-collective)',
  pulse,
});
const view = { x: 10, y: 20, scale: 2 };
const content = { w: 400, h: 400 };

afterEach(() => {
  setClockSource(() => Date.now());
  vi.useRealTimers();
});

describe('TravelPin', () => {
  it.each([
    [0, j.route.legs[0]!.points[0]!],
    [1, j.route.legs[0]!.points.at(-1)!],
  ] as const)('at progress %s it sits on the route’s end, placed in the view', (progress, at) => {
    setClockSource(() => j.boardedAt + progress * (j.arrivesAt - j.boardedAt));
    render(<TravelPin traveller={traveller()} view={view} content={content} transition="none" />);
    const pin = screen.getByTestId('travel-pin');
    expect(Number(pin.getAttribute('data-map-x'))).toBeCloseTo(at[0], 4);
    expect(Number(pin.getAttribute('data-map-y'))).toBeCloseTo(at[1], 4);
    expect(pin.style.transform).toBe(`translate(${10 + at[0] * 400 * 2}px, ${20 + at[1] * 400 * 2}px)`);
  });

  it('halfway: trainAt’s point, the label under the pin, the faction’s colour, an image named for the reader', () => {
    const now = (j.boardedAt + j.arrivesAt) / 2;
    setClockSource(() => now);
    render(<TravelPin traveller={traveller()} view={view} content={content} transition="none" />);
    const p = trainAt(legs, 0.5);
    const pin = screen.getByRole('img', { name: 'Your pin' });
    expect(Number(pin.getAttribute('data-map-x'))).toBeCloseTo(p.x, 4);
    expect(screen.getByTestId('travel-pin-label')).toHaveTextContent('To Irongate · 6 min');
    expect(screen.getByTestId('travel-pin-mark').style.background).toBe('var(--color-collective)');
  });

  it('ticks once a second on the clock, and pulses when asked', () => {
    vi.useFakeTimers();
    let now = j.boardedAt + 60_000;
    setClockSource(() => now);
    const { rerender } = render(<TravelPin traveller={traveller()} view={view} content={content} transition="none" />);
    const x0 = Number(screen.getByTestId('travel-pin').getAttribute('data-map-x'));
    now += 60_000;
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(Number(screen.getByTestId('travel-pin').getAttribute('data-map-x'))).not.toBe(x0);
    expect(screen.getByTestId('travel-pin-mark').className).not.toContain('travel-pin-pulse');
    rerender(<TravelPin traveller={traveller(1)} view={view} content={content} transition="none" />);
    expect(screen.getByTestId('travel-pin-mark').className).toContain('travel-pin-pulse');
  });
});

describe('the route on the map', () => {
  it('CityMap draws each path as an ink line over a paper halo, and the traveller', () => {
    setClockSource(() => j.boardedAt);
    render(
      <CityMap
        map={j.map}
        isNight={false}
        locations={j.route.cities.map((c, i) => ({ id: c.cityId, n: i + 1, name: c.name, map: { x: c.x, y: c.y } }))}
        selectedId={null}
        onSelect={() => undefined}
        paths={j.route.legs.map((l, i) => ({ id: `leg-${i}`, points: l.points }))}
        traveller={traveller()}
      />,
    );
    const path = screen.getByTestId('map-path');
    expect(path.getAttribute('d')).toMatch(/^M0\.18 0\.8L/);
    expect(path.getAttribute('d')).not.toMatch(/Z$/);
    expect(screen.getByTestId('map-paths').querySelectorAll('path')).toHaveLength(2);
    expect(screen.getByTestId('travel-pin')).toBeInTheDocument();
  });
});
