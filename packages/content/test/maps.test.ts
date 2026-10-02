import { describe, expect, it } from 'vitest';
import { MapPins, loadContent, parseContent, rawContent } from '../src';
import type { ContentInput, MapPins as MapPinsType } from '../src';
import { mapPins } from '../src/data/mapPins';

/**
 * Maps v3 (docs/design/maps-v3-integration.md §2, §3, §5.4): quarters are frames on one picture,
 * every place sits at its approved pin, and every catalogue map has its tile pyramid.
 */

const deepCopy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const clone = (): ContentInput => deepCopy(rawContent as ContentInput);
const city = (c: ContentInput, id: string) => c.cities.find((x) => x.id === id)!;

/** Every location whose pin is not its survey pin, or that the survey lacks. */
function surveyMismatches(cities: ContentInput['cities'], survey: MapPinsType): string[] {
  const out: string[] = [];
  for (const c of cities) {
    const pins = new Map((survey[c.id]?.pins ?? []).map((p) => [p.id, p]));
    for (const l of c.locations) {
      const p = pins.get(l.id);
      if (!p) out.push(`${l.id}: not in the survey`);
      else if (p.x !== l.map.x || p.y !== l.map.y)
        out.push(`${l.id}: at ${l.map.x}, ${l.map.y}, surveyed at ${p.x}, ${p.y}`);
    }
  }
  return out;
}

describe('the survey of the art (pins.json)', () => {
  it('validates: 89 places over the five cities, and the five cities on the nation', () => {
    const parsed = MapPins.parse(mapPins);
    expect(Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, v.pins.length]))).toEqual({
      coalport: 15,
      duskwall: 15,
      ashford: 17,
      irongate: 29,
      clearwater: 13,
      nation: 5,
    });
    const ids = Object.values(parsed).flatMap((m) => m.pins.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('the nation pins are the five surveyed cities, the content cities under their own names', () => {
    const nation = mapPins.nation!.pins;
    const cityKeys = Object.keys(mapPins).filter((k) => k !== 'nation');
    expect(nation.map((p) => p.id).sort()).toEqual([...cityKeys].sort());
    // The user-approved positions on nation-day-9216.png (design §5.5).
    expect(Object.fromEntries(nation.map((p) => [p.id, [p.x, p.y]]))).toEqual({
      irongate: [0.52, 0.53],
      ashford: [0.12, 0.17],
      duskwall: [0.88, 0.25],
      coalport: [0.18, 0.8],
      clearwater: [0.88, 0.85],
    });
    const content = loadContent();
    for (const p of nation) {
      const c = content.city(p.id);
      if (c) expect(p.name).toBe(c.name);
    }
  });

  it('every location sits on its surveyed pin', () => {
    expect(surveyMismatches(clone().cities, mapPins)).toEqual([]);
  });

  it('a location moved off its pin, or a place the survey lacks, is caught', () => {
    const c = clone();
    city(c, 'coalport').locations[0]!.map = { x: 0.5, y: 0.2 };
    city(c, 'duskwall').locations[1]!.id = 'duskwall.nowhere';
    expect(surveyMismatches(c.cities, mapPins)).toEqual([
      'coalport.mill-gate: at 0.5, 0.2, surveyed at 0.75, 0.2',
      'duskwall.nowhere: not in the survey',
    ]);
  });

  it('the pin numbers are unchanged (location order)', () => {
    const content = loadContent();
    expect(content.city('coalport')!.locations.map((l) => l.id.split('.')[1])).toEqual([
      'mill-gate',
      'market-row',
      'union-hall',
      'terraces',
      'quays',
      'anchor',
    ]);
    expect(content.city('duskwall')!.locations.map((l) => l.id.split('.')[1])).toEqual([
      'garrison-gate',
      'quartermaster-market',
      'beacon-house',
      'archives',
      'goods-yard',
      'rampart-row',
    ]);
    expect(content.city('ashford')!.locations.map((l) => l.id.split('.')[1])).toEqual([
      'gazette-house',
      'assembly-rooms',
      'university',
      'courts',
      'bridge-street',
      'weavers-row',
    ]);
  });
});

describe('quarters are frames (§2)', () => {
  it('each home city has its first quarter, framed on its pins + 0.06', () => {
    const content = loadContent();
    expect(content.cities.map((c) => c.quarters)).toEqual([
      [{ id: 'coalport.mill', name: 'The Mill', frame: { x0: 0.34, y0: 0.02, x1: 0.81, y1: 0.62 } }],
      [{ id: 'duskwall.fortress', name: 'The Fortress', frame: { x0: 0.07, y0: 0.06, x1: 0.65, y1: 0.91 } }],
      [{ id: 'ashford.college', name: 'The College', frame: { x0: 0.24, y0: 0.19, x1: 0.76, y1: 0.68 } }],
    ]);
    // The frame is the pins' box grown by 0.06 on every side, clamped to the picture.
    for (const c of content.cities) {
      const xs = c.locations.map((l) => l.map.x);
      const ys = c.locations.map((l) => l.map.y);
      const r = (v: number) => Math.round(v * 100) / 100;
      expect(c.quarters[0]!.frame).toEqual({
        x0: r(Math.max(0, Math.min(...xs) - 0.06)),
        y0: r(Math.max(0, Math.min(...ys) - 0.06)),
        x1: r(Math.min(1, Math.max(...xs) + 0.06)),
        y1: r(Math.min(1, Math.max(...ys) + 0.06)),
      });
      for (const l of c.locations) expect(l.quarterId).toBe(c.quarters[0]!.id);
    }
  });

  it('rejects a pin outside its frame, or within 0.02 of its edge', () => {
    const c = clone();
    city(c, 'coalport').quarters[0]!.frame = { x0: 0.39, y0: 0.02, x1: 0.81, y1: 0.62 };
    expect(() => parseContent(c)).toThrow(
      /coalport.market-row": its pin \(0.4, 0.44\) is not 0.02 inside coalport.mill's frame/,
    );
    const d = clone();
    city(d, 'ashford').locations[5]!.map = { x: 0.9, y: 0.62 };
    expect(() => parseContent(d)).toThrow(/ashford.weavers-row": its pin \(0.9, 0.62\) is not/);
  });

  it('rejects an unknown quarter, a quarter of another city, and an empty frame', () => {
    const c = clone();
    city(c, 'coalport').locations[0]!.quarterId = 'coalport.harbour';
    expect(() => parseContent(c)).toThrow(/quarterId "coalport.harbour" is not a quarter of coalport/);
    const d = clone();
    city(d, 'coalport').locations[0]!.quarterId = 'duskwall.fortress';
    expect(() => parseContent(d)).toThrow(/quarterId "duskwall.fortress" is not a quarter of coalport/);
    const e = clone();
    city(e, 'duskwall').quarters[0]!.frame = { x0: 0.65, y0: 0.06, x1: 0.07, y1: 0.91 };
    expect(() => parseContent(e)).toThrow(/x0 < x1 and y0 < y1/);
    const f = clone();
    city(f, 'duskwall').quarters = [];
    expect(() => parseContent(f)).toThrow(/quarters/);
  });
});

describe('the tiles manifest (§3)', () => {
  it('covers every catalogue map, at its size; the extra pyramids are allowed', () => {
    const content = loadContent();
    const maps = content.art.assets.filter((a) => a.kind === 'map');
    expect(maps.map((a) => a.id).sort()).toEqual([
      'map.ashford.day',
      'map.ashford.night',
      'map.coalport.day',
      'map.coalport.night',
      'map.duskwall.day',
      'map.duskwall.night',
    ]);
    for (const a of maps) {
      expect(content.tiles(a.id)).toMatchObject({ width: a.width, height: a.height, format: 'avif' });
    }
    expect(Object.keys(content.tilePyramids).sort()).toEqual(
      ['ashford', 'clearwater', 'coalport', 'duskwall', 'irongate', 'nation']
        .flatMap((n) => [`map.${n}.day`, `map.${n}.night`])
        .sort(),
    );
    expect(content.tiles('map.irongate.day')).toMatchObject({ width: 11520, maxLevel: 14 });
    expect(content.tiles('map.nation.night')).toMatchObject({ width: 9216, maxLevel: 14 });
    expect(content.tiles('portrait.holm')).toBeUndefined();
  });

  it('rejects a catalogue map without tiles, or with tiles of another size', () => {
    const c = clone() as ContentInput & { tilePyramids: Record<string, { width: number }> };
    delete c.tilePyramids['map.duskwall.night'];
    expect(() => parseContent(c)).toThrow(/map "map.duskwall.night" has no entry in tiles.json/);
    const d = clone() as ContentInput & { tilePyramids: Record<string, { width: number }> };
    d.tilePyramids['map.coalport.day']!.width = 5056;
    expect(() => parseContent(d)).toThrow(
      /map "map.coalport.day" is 8640 × 8640 but its tiles are 5056 × 8640/,
    );
  });
});
