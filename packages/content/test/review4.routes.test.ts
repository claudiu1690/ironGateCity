/**
 * Review 4, T18 (docs/tech/review-4.md §6.1, ADR 0075): the nation's routes are content, one leg per
 * city other than the capital, traced from the capital's pin to the city's.
 */
import { describe, expect, it } from 'vitest';
import { loadContent, parseContent, rawContent, routeProblems } from '../src';
import type { ContentInput } from '../src';

const content = loadContent();
const clone = (): ContentInput => JSON.parse(JSON.stringify(rawContent)) as ContentInput;
const fails = (mutate: (c: ContentInput) => void, problem: RegExp) => {
  const c = clone();
  mutate(c);
  expect(() => parseContent(c)).toThrow(problem);
};
const leg = (c: ContentInput, to: string) => c.nation.routes.find((r) => r.to === to)!;

describe('nation.routes', () => {
  it('four legs, one for each city but the capital, 8 to 20 points, from the capital pin to the city pin', () => {
    const n = content.nation;
    expect(n.routes.map((r) => r.to).sort()).toEqual(['ashford', 'clearwater', 'coalport', 'duskwall']);
    const capital = n.cities.find((c) => c.cityId === n.capitalId)!;
    for (const r of n.routes) {
      const city = n.cities.find((c) => c.cityId === r.to)!;
      expect(r.points.length).toBeGreaterThanOrEqual(8);
      expect(r.points.length).toBeLessThanOrEqual(20);
      expect(r.points[0]).toEqual([capital.x, capital.y]);
      expect(r.points.at(-1)).toEqual([city.x, city.y]);
    }
    expect(routeProblems(n)).toEqual([]);
  });

  it('the loader refuses a wrong endpoint, a missing or doubled leg, equal neighbours and too few points', () => {
    fails((c) => {
      leg(c, 'coalport').points[leg(c, 'coalport').points.length - 1] = [0.2, 0.8];
    }, /nation\.routes\.coalport: must end at coalport's pin/);
    fails((c) => {
      leg(c, 'ashford').points[0] = [0.5, 0.5];
    }, /nation\.routes\.ashford: must start at the capital's pin/);
    fails((c) => {
      leg(c, 'duskwall').to = 'ashford';
    }, /one leg to ashford|one leg to duskwall/);
    fails((c) => {
      const p = leg(c, 'clearwater').points;
      p.splice(3, 0, [p[2]![0], p[2]![1]]);
    }, /points 2 and 3 are equal/);
    fails((c) => {
      leg(c, 'ashford').points = leg(c, 'ashford').points.slice(0, 7);
    }, /routes/);
    fails((c) => {
      c.nation.routes.pop();
    }, /routes/);
  });
});
