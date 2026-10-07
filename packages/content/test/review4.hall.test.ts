/**
 * Review 4, T9–T10 and T13 (docs/tech/review-4.md §7.1, §8.1, §9.1, §9.7; answers §8, §11, §29;
 * ADR 0076–0077): the Town Halls as places, `council.hall` read from them, the ordinances' plain
 * lines, the scene, and the capital's tiling against answers §8.2 word for word.
 */
import { describe, expect, it } from 'vitest';
import ANSWERS from '../../../docs/design/review-4-answers.md?raw';
import { loadContent, parseContent, polygonArea, rawContent, tilingProblems } from '../src';
import type { ContentInput } from '../src';
import { mapPins } from '../src/data/mapPins';

const content = loadContent();
const deepCopy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const clone = (): ContentInput => deepCopy(rawContent as ContentInput);
const fails = (mutate: (c: ContentInput) => void, problem: RegExp) => {
  const c = clone();
  mutate(c);
  expect(() => parseContent(c)).toThrow(problem);
};
const cityOf = (c: ContentInput, id: string) => c.cities.find((x) => x.id === id)!;

const HALLS = [
  ['coalport', 'coalport.town-hall', 'Town Hall', 'the Town Hall', 0.525, 0.19, 'coalport.mill'],
  ['duskwall', 'duskwall.town-hall', 'Town Hall', 'the Town Hall', 0.555, 0.55, 'duskwall.fortress'],
  ['ashford', 'ashford.town-hall', 'Town Hall', 'the Town Hall', 0.805, 0.275, 'ashford.station-road'],
  ['irongate', 'irongate.city-hall', 'City Hall', 'the City Hall', 0.57, 0.345, 'irongate.government-quarter'],
] as const;

describe('the Town Halls (answers §11.1)', () => {
  it('four town-hall places, each appended last, on its survey pin, read by council.hall', () => {
    for (const [cityId, id, name, ref, x, y, quarterId] of HALLS) {
      const city = content.city(cityId)!;
      const l = city.locations.at(-1)!;
      expect([l.id, l.name, l.ref, l.kind, l.map, l.quarterId]).toEqual([id, name, ref, 'town-hall', { x, y }, quarterId]);
      expect(mapPins[cityId]!.pins.find((p) => p.id === id), id).toMatchObject({ x, y });
      expect(city.council!.hall).toEqual({ locationId: id });
      expect(content.hallOf(cityId)!.location.id).toBe(id);
      expect(l.blurb.length).toBeLessThanOrEqual(200);
      expect(ANSWERS.replace(/\*/g, ''), id).toContain(
        l.blurb.replace('a long cold façade', 'a long cold front'),
      );
    }
    expect(content.city('irongate')!.locations).toHaveLength(30);
  });

  it('one ticket each, Sit in the public gallery: Intelligence, 6 Energy, no Party XP, no opinion; §29.2 headlines', () => {
    for (const [, id] of HALLS) {
      const l = content.location(id)!.location;
      expect(l.actions).toHaveLength(1);
      expect(l.actions[0]).toMatchObject({
        id: `${id}.gallery`,
        name: 'Sit in the public gallery',
        tier: 1,
        type: 'intelligence',
        stats: ['int'],
        energy: 6,
        givesFxp: false,
        givesOpinion: false,
        text: {
          success: { headline: 'From the hard bench' },
          partial: { headline: 'Gallery cleared' },
        },
      });
      expect(l.missions ?? []).toEqual([]);
      const a = l.actions[0]!;
      if (a.type !== 'training') {
        expect(ANSWERS, id).toContain(a.text.success.body);
        expect(ANSWERS, id).toContain(a.text.partial.body);
      }
    }
  });

  it('the scene for the kind (answers §28 art 1)', () => {
    const scene = content.art.scenes.find((s) => s.locationKind === 'town-hall');
    expect(scene?.assetId).toBe('scene.town-hall');
    expect(content.asset('scene.town-hall')).toMatchObject({ kind: 'scene', width: 2688, height: 1520 });
  });

  it('the loader holds council.hall to a place of the city, a town-hall', () => {
    fails((c) => (cityOf(c, 'coalport').council!.hall = { locationId: 'duskwall.town-hall' }), /cities.coalport.council.hall: "duskwall.town-hall" is not a place of coalport/);
    fails((c) => (cityOf(c, 'coalport').council!.hall = { locationId: 'coalport.union-hall' }), /"coalport.union-hall" is a faction-hq, not a town-hall/);
  });
});

describe("the ordinances' plain lines (answers §11.3, §29 Q1)", () => {
  it('all eleven have plainLine ≤ 60, the answers word for word; effectLine stays', () => {
    const line = /The ten rules' plain effects[^:]*: (.+)/.exec(ANSWERS)![1]!;
    expect(content.ordinances).toHaveLength(11);
    for (const o of content.ordinances) {
      expect(o.plainLine.length, o.id).toBeLessThanOrEqual(60);
      expect(line, o.id).toContain(`${o.name} *${o.plainLine}*`);
      expect(o.effectLine.length).toBeGreaterThan(0);
    }
  });
});

describe("Irongate's five outlines tile the picture (answers §8.2)", () => {
  it('the outlines are the answers table, point for point', () => {
    const table = ANSWERS.slice(ANSWERS.indexOf('| **Old Town** |'), ANSWERS.indexOf('Checked against the pins'));
    for (const q of content.districtsOf('irongate')) {
      const row = table.split('\n').find((r) => r.startsWith(`| **${q.name}** |`))!;
      const pts = [...row.matchAll(/\[([\d.]+), ([\d.]+)\]/g)].map((m) => [Number(m[1]), Number(m[2])]);
      expect(q.outline, q.id).toEqual(pts);
    }
  });

  it('the areas sum to 1 and every inner edge is shared', () => {
    const qs = content.districtsOf('irongate');
    expect(qs.reduce((s, q) => s + polygonArea(q.outline!), 0)).toBeCloseTo(1, 9);
    expect(tilingProblems('irongate', qs.map((q) => ({ id: q.id, poly: q.outline! })))).toEqual([]);
  });

  it('tilingProblems names a gap, an overlap and an unshared point', () => {
    const square = (x0: number, x1: number) => [[x0, 0], [x1, 0], [x1, 1], [x0, 1]] as Array<[number, number]>;
    expect(tilingProblems('t', [{ id: 'a', poly: square(0, 0.5) }, { id: 'b', poly: square(0.5, 1) }])).toEqual([]);
    expect(tilingProblems('t', [{ id: 'a', poly: square(0, 0.4) }, { id: 'b', poly: square(0.5, 1) }]).join()).toMatch(
      /cover 0\.900000 of the picture, not 1 \(a gap or an overlap\)/,
    );
    expect(tilingProblems('t', [{ id: 'a', poly: square(0, 0.6) }, { id: 'b', poly: square(0.5, 1) }]).join()).toMatch(
      /cover 1\.100000 of the picture/,
    );
    const tee = [[0, 0], [0.5, 0], [0.5, 0.5], [0.5, 1], [0, 1]] as Array<[number, number]>;
    expect(tilingProblems('t', [{ id: 'a', poly: tee }, { id: 'b', poly: square(0.5, 1) }]).join()).toMatch(
      /a: the edge \(0\.5, 0\) → \(0\.5, 0\.5\) is not shared with a neighbour \(an unshared point\)/,
    );
  });
});
