/**
 * Review 4, T21–T22 (answers §29.1, ADR 0074): the six neutral local lines, `cityId: '*'`, read for
 * the city the reader is in; the loader keeps them to their conditions and placeholders.
 */
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
const local = () => content.headlines.filter((h) => h.cityId === '*');

describe('the neutral local lines (answers §29.1)', () => {
  it('six city lines, word for word, by priority; no city paper selects them', () => {
    expect(local().map((h) => [h.id, h.priority, h.group])).toEqual([
      ['hl.local.count', 0, 'city'],
      ['hl.local.voting', 1, 'city'],
      ['hl.local.candidates', 1, 'city'],
      ['hl.local.rule', 2, 'city'],
      ['hl.local.rival-pressure', 3, 'city'],
      ['hl.local.morale', 4, 'city'],
    ]);
    expect(local().map((h) => h.headline)).toEqual([
      '{city} Has a New Council',
      'Voting Open in {city}',
      '{city} Council: Candidates Wanted',
      '{ordinance} in Force in {city}',
      "Callers from Other Parties on {city}'s Streets",
      '{faction} Holds {city} at {share} %',
    ]);
    for (const h of local()) expect(h.deck!.length).toBeLessThanOrEqual(200);
    for (const c of content.cities) {
      expect(content.headlinesOf(c.id).some((h) => h.cityId === '*')).toBe(false);
      expect(content.politicalHeadlinesOf(c.id).some((h) => h.cityId === '*')).toBe(false);
    }
  });

  it('the loader refuses a local line outside the slot, with another kind, or an unknown placeholder', () => {
    const at = (c: ContentInput, id: string) => c.headlines.find((h) => h.id === id)!;
    fails((c) => {
      at(c, 'hl.local.count').group = 'personal';
    }, /a local line is a city line/);
    fails((c) => {
      at(c, 'hl.local.rule').when = [{ kind: 'seatWon' }];
    }, /"seatWon" is not a local condition/);
    fails((c) => {
      at(c, 'hl.local.morale').headline = '{name} Holds {city}';
    }, /unknown local placeholder \{name\}/);
    fails((c) => {
      at(c, 'hl.local.morale').cityId = 'coalport';
    }, /an hl\.local\.\* line is for any city/);
  });
});
