/**
 * QA (slice 4): content checks the developer's tests leave open. The journey cards against the GDD's
 * own caps (parsed from §14.10), the Issues' player lines in plain words (no odds), and the Herald's
 * seat headlines read aloud for every district (an article before a vowel).
 */
import { describe, expect, it } from 'vitest';
import { getContent } from '../src';
import { fillTemplate } from '@irongate/rules';
// Vite's ?raw import (see raw.d.ts): the package has no Node types.
import GDD from '../../../docs/GDD.md?raw';

const content = getContent();

describe('QA · the journey cards against GDD §14.10', () => {
  const s = GDD.slice(GDD.indexOf('### 14.10'), GDD.indexOf('### 14.11'));
  it('the GDD caps: 45 XP / 6 Party XP / 0.05 opinion / 10 points, 10 Rested, 100 Iron (only the parcel over 40)', () => {
    expect(s).toContain("a card pays **at most a 10-Energy action's XP, Party XP, opinion and points (45 / 6 / 0.05 / 10), 10 Rested, and at most 100 Iron**, which only the parcel pays");
    expect(s).toContain('every other card at most 40');
    for (const ev of content.journeyEvents) {
      for (const ch of ev.choices) {
        for (const o of [ch.success, ...(ch.partial ? [ch.partial] : [])]) {
          const r = o.rewards;
          const at = `${ev.id}/${ch.id}`;
          expect(r.xp ?? 0, at).toBeLessThanOrEqual(45);
          expect(r.fxp ?? 0, at).toBeLessThanOrEqual(6);
          expect(r.opinion ?? 0, at).toBeLessThanOrEqual(0.05);
          expect(r.momentum ?? 0, at).toBeLessThanOrEqual(10);
          expect(r.rested ?? 0, at).toBeLessThanOrEqual(10);
          expect(r.iron ?? 0, at).toBeLessThanOrEqual(ev.id === 'jev.parcel' ? 100 : 40);
          expect(r.iron ?? 0, at).toBeGreaterThanOrEqual(0);
        }
        // "never take Iron a player did not stake": a priced choice pays back at most its stake on a Partial.
        if (ch.cost && ch.partial) expect(ch.partial.rewards.iron ?? 0).toBeLessThanOrEqual(ch.cost.iron);
      }
    }
  });

  it('seven cards, the passenger first; every card has an ignore line; a checked choice has its Partial', () => {
    // Slice 5: the ordinary deck (the hostile deck has its own first card, the checkpoint).
    const ordinary = content.journeyEvents.filter((e) => e.deck === 'ordinary');
    expect(ordinary).toHaveLength(7);
    expect(ordinary.filter((e) => e.first).map((e) => e.id)).toEqual(['jev.passenger']);
    for (const ev of content.journeyEvents) {
      expect(ev.ignore.length, ev.id).toBeGreaterThan(0);
      // Slice 5: the checkpoint's gated row (unchecked, a Partial for "stopped") is the one exception.
      for (const ch of ev.choices) expect(!!ch.partial, `${ev.id}/${ch.id}`).toBe(!!ch.stats || !!ch.gate);
    }
  });
});

describe('QA · Issues in plain words (GDD §1.5, review 2 §1.10)', () => {
  it('no effect line, blurb or stance names odds (chance, a percentage of success)', () => {
    for (const i of content.issues) {
      for (const line of [i.effectLine, i.blurb, ...Object.values(i.stances)]) {
        expect(line, i.id).not.toMatch(/\bchance\b|\bodds of\b|\d+ ?% (chance|success)/i);
      }
    }
  });
});

describe('QA · the Herald read aloud for every district (design §12)', () => {
  const herald = [...content.headlinesOf('irongate'), ...content.politicalHeadlinesOf('irongate')];
  const names = content.districtsOf('irongate').map((q) => q.name);

  // Fixed 3 Oct 2026 (docs/design/slice-4-fixes.md §4): *Takes a Seat in {district}*.
  it('no seat headline says "a Eastside" or "a Old Town"', () => {
    const vars = { name: 'Mara Lenk', voted: 'Pavel Novak', faction: 'Collective', margin: '3', ordinal: 'first' };
    const bad: string[] = [];
    for (const h of herald) {
      for (const district of names) {
        const text = fillTemplate(`${h.headline} ${h.deck ?? ''}`, { ...vars, district });
        for (const m of text.matchAll(/\b[Aa] (?=[AEIOU])\w+/g)) bad.push(`${h.id}: …${m[0]}…`);
      }
    }
    expect([...new Set(bad)]).toEqual([]);
  });
});
