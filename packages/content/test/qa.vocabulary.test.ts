/**
 * QA, review 2 (docs/design/review-2-answers.md §1.13; GDD §1.5): plain words. No player-facing
 * string of the content data carries a system term. The scan and its exceptions live in
 * `./vocabulary.ts`, so more sources (copy.ts, packages/ui) can be added to the same check.
 */
import { describe, expect, it } from 'vitest';
import {
  STANDING_METER,
  SYSTEM_TERMS,
  VOCABULARY_SOURCES,
  playerStrings,
  systemTermHits,
} from './vocabulary';

describe('review 2 §1.13: the QA vocabulary test', () => {
  it('no player-facing string in the content data uses a system term', () => {
    expect(systemTermHits(VOCABULARY_SOURCES)).toEqual([]);
  });

  it('scans titles, bodies, blurbs, lines, headlines, decks, stamps and names', () => {
    const keys = new Set(VOCABULARY_SOURCES.flatMap((s) => playerStrings(s.value)).map((s) => s.key));
    for (const k of ['name', 'title', 'body', 'blurb', 'line', 'headline', 'deck', 'stamp', 'next', 'alt'])
      expect(keys, k).toContain(k);
    // Ids, enums and asset references are not player-facing.
    for (const k of ['id', 'type', 'kind', 'actionTypes', 'factionId', 'keepsake'])
      expect(keys, k).not.toContain(k);
  });

  it('the guard catches every listed term and lets the ids and the allowed phrases through', () => {
    const hit = (text: string, key = 'body') =>
      systemTermHits([{ name: 't', value: { [key]: text } }]).length;
    for (const bad of [
      'Canvass the bread queue',
      'Hand out leaflets',
      'Propaganda opinion swing',
      'Propose an ordinance',
      'Two endorsements by Tuesday',
      'The slate',
      'on the order paper',
      'the division',
      'The council divides at 01:00',
      'motion carried',
      'Nominations open',
      'Ballot cast',
      '+20 FXP',
      '10 PC',
      'Local Standing',
      'the yard hoardings',
      'the manifests at the yard',
      'Groundswell',
      'in the wards',
    ])
      expect(hit(bad), bad).toBeGreaterThan(0);
    expect(hit('Standing 12')).toBeGreaterThan(0);
    expect(hit('Run the mimeograph', 'title')).toBeGreaterThan(0);
    for (const ok of [
      'coalport.market-row.leaflets',
      'ord.ward-fund',
      'dir.restore-canvass',
      'His ward book',
      'From the back of the ward book',
      'Stand for the council · 10 Political Capital',
      'Standing for the council',
      'A stranger is standing where somebody used to.',
      'Smoke, coffee, and a mimeograph that never stops.',
      'The promotion list; the wardrobe; a ballroom-free text',
      '{standing} Face in Coalport',
    ])
      expect(hit(ok), ok).toBe(0);
    expect(hit('ward')).toBe(1);
    expect(SYSTEM_TERMS.flags).toContain('i');
    expect(STANDING_METER.flags).not.toContain('i');
  });
});
