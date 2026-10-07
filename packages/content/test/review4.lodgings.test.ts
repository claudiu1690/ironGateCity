/**
 * Review 4 #9 (answers §9.3, tech design §10.1): the paid bed is a Lodgings card at a place. The
 * content: Tram Junction carries it, with its line; the loader allows at most one a city, and only in
 * `ROOM.cityId` (slice 7 widens it to the battleground cities).
 */
import { ROOM } from '@irongate/rules';
import { describe, expect, it } from 'vitest';
import { loadContent, parseContent, rawContent } from '../src';
import type { ContentInput } from '../src';

const content = loadContent();
const clone = (): ContentInput => JSON.parse(JSON.stringify(rawContent)) as ContentInput;
const fails = (mutate: (c: ContentInput) => void, problem: RegExp) => {
  const c = clone();
  mutate(c);
  expect(() => parseContent(c)).toThrow(problem);
};
const city = (c: ContentInput, id: string) => c.cities.find((x) => x.id === id)!;

describe('the Lodgings card in content', () => {
  it('Tram Junction, and only it, has lodgings, in the room city', () => {
    const all = content.cities.flatMap((c) => c.locations.filter((l) => l.lodgings).map((l) => l.id));
    expect(all).toEqual(['irongate.tram-junction']);
    expect(content.lodgingsOf(ROOM.cityId)?.location).toMatchObject({
      id: 'irongate.tram-junction',
      lodgings: { line: 'A bed on the tram line · 7 nights · 100 Iron' },
    });
    expect(content.lodgingsOf('coalport')).toBeUndefined();
  });

  it('the loader refuses a second place in a city, a place outside the room city, and a line over 60', () => {
    fails((c) => {
      city(c, 'irongate').locations.find((l) => l.id === 'irongate.forecourt')!.lodgings = { line: 'A bed' };
    }, /cities\.irongate has 2 places with lodgings/);
    fails((c) => {
      city(c, 'coalport').locations[0]!.lodgings = { line: 'A bed by the mill' };
    }, /lodgings only in irongate/);
    fails((c) => {
      city(c, 'irongate').locations.find((l) => l.id === 'irongate.tram-junction')!.lodgings = { line: 'x'.repeat(61) };
    }, /lodgings/);
  });
});
