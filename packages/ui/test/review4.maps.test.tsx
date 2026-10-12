import { cityViewFixture, townHallFixture, whatNowFixture } from '@irongate/rules/testing';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { systemTermHits } from '../../content/test/vocabulary';
import { CityMap, TownHallBlocks, WhatNowCard, bboxOf } from '../src';

/**
 * Review 4, phases 3–4 (docs/tech/review-4.md §7.2, §8.4, §9.5): a home city's greyed pins on the map;
 * a district's drag limit as its outline's box; the Town Hall's blocks for a visitor and a councillor;
 * the *What now* card at 360 px.
 */

const noop = () => undefined;
const names = { vanguard: 'Vanguard', collective: 'Collective', alliance: 'Alliance' } as const;

describe('the greyed pins (answers §21.4)', () => {
  it('a locked pin is the disc at 50 % with the lock, named by its note; a tap reaches the page, no zoom', () => {
    const onSelect = vi.fn();
    render(
      <CityMap
        map={cityViewFixture.map}
        isNight={false}
        locations={[
          ...cityViewFixture.locations,
          {
            id: 'coalport.coal-yards',
            n: 0,
            name: 'Coal Yards',
            map: { x: 0.44, y: 0.84 },
            pin: { marks: ['locked'], sub: 'Opens with a later edition' },
          },
        ]}
        selectedId={null}
        onSelect={onSelect}
      />,
    );
    const pin = screen.getByTestId('locked-pin');
    expect(pin).toHaveAttribute('aria-label', 'Coal Yards, opens with a later edition');
    expect(pin).toHaveAttribute('data-marks', 'locked');
    expect(within(pin).getByTestId('lock-mark')).toBeInTheDocument();
    expect(pin.querySelector('.opacity-50')).not.toBeNull();
    // The open places stay numbered hotspots.
    expect(screen.getAllByTestId('hotspot')).toHaveLength(cityViewFixture.locations.length);
    fireEvent.click(pin);
    expect(onSelect).toHaveBeenCalledWith('coalport.coal-yards');
  });

  it("bboxOf: a district's outline box (the drag limit)", () => {
    expect(
      bboxOf([
        [0, 0.37],
        [0.2, 0.4],
        [0.605, 0.53],
        [0.53, 1],
        [0, 1],
      ]),
    ).toEqual({ x0: 0, y0: 0.37, x1: 0.605, y1: 1 });
  });
});

describe('What now (answers §10.1)', () => {
  it('campaign vocabulary on every new string', () => {
    const { container } = render(
      <>
        <WhatNowCard whatNow={whatNowFixture} hallName="Town Hall" onDesk={noop} />
        <TownHallBlocks hall={townHallFixture} names={names} factionId="collective" />
      </>,
    );
    const text = container.textContent ?? '';
    expect(systemTermHits([{ name: 'ui', value: text }])).toEqual([]);
    expect(text).not.toMatch(/\b(war|battle|uprising|troops|front|enemy)\b/i);
  });
});
