/**
 * Review 4 (phase 9, the user: the journey's pin label half under the 480 px side sheet; the same for
 * the plate on the city maps): a label slides off an overlay and stays inside the map.
 */
import { describe, expect, it } from 'vitest';
import { labelSide, travelLabelAbove, travelLabelLeft } from '../src';

// The desktop journey: a 1440 px map, the side sheet from 12 to 492 px, 12 to 652 px down.
const sheet = { x0: 12, y0: 12, x1: 492, y1: 652 };

describe('the traveller’s label (TravelPin)', () => {
  it('centred under the pin when clear', () => {
    expect(travelLabelLeft({ px: 900, py: 300, width: 166, height: 20, boxW: 1440, avoid: [sheet] })).toBe(817);
  });

  it('slides right of the sheet when the pin is just past it, never under it', () => {
    const left = travelLabelLeft({ px: 520, py: 300, width: 166, height: 20, boxW: 1440, avoid: [sheet] });
    expect(left).toBeGreaterThanOrEqual(sheet.x1);
    expect(left).toBe(498);
  });

  it('below the sheet it stays centred; at the box’s edges it stays inside', () => {
    expect(travelLabelLeft({ px: 300, py: 700, width: 166, height: 20, boxW: 1440, avoid: [sheet] })).toBe(217);
    expect(travelLabelLeft({ px: 20, py: 300, width: 166, height: 20, boxW: 390, avoid: [] })).toBe(6);
    expect(travelLabelLeft({ px: 380, py: 300, width: 166, height: 20, boxW: 390, avoid: [] })).toBe(218);
  });
});

describe('the traveller’s label near the bottom', () => {
  it('goes above the pin when below would run past the map’s bottom edge', () => {
    expect(travelLabelAbove(810, 20, 808)).toBe(true);
    expect(travelLabelAbove(400, 20, 808)).toBe(false);
  });
});

describe('a city pin’s name label (CityMap, from 1024 px)', () => {
  const plate = { x0: 12, y0: 12, x1: 432, y1: 550 };
  it('goes right unless it would run under an overlay there and the left is clear', () => {
    expect(labelSide(600, 300, 'Union Hall', undefined, [plate])).toBe('right');
    const dock = { x0: 510, y0: 780, x1: 930, y1: 850 };
    expect(labelSide(420, 810, 'The Anchor', undefined, [dock])).toBe('left');
    // A pin under the plate shows no name beside it.
    expect(labelSide(400, 300, 'St Barbara’s', 'Opens with a later edition', [plate])).toBe('none');
    // Both sides blocked: right, as before.
    expect(labelSide(470, 810, 'The Anchor', undefined, [dock, { x0: 0, y0: 780, x1: 460, y1: 850 }])).toBe('right');
  });
});
