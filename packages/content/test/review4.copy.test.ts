/**
 * Review 4, phase 1 (docs/tech/review-4.md §12.1–§12.2, T1 and T4): the one countdown style
 * (`copy.when`, `copy.boundary`, `copy.count`) under two time zones, the vocabulary of every countdown
 * string in copy.ts, and the clock's and Heat's notes word for word against
 * docs/design/review-4-answers.md §4.1 and §12.
 */
import { describe, expect, it } from 'vitest';
import ANSWERS from '../../../docs/design/review-4-answers.md?raw';
import COPY_SOURCE from '../src/data/copy.ts?raw';
import { boundary, copy, count, when } from '../src/data/copy';

const BERLIN = { timeZone: 'Europe/Berlin' };
const NEW_YORK = { timeZone: 'America/New_York' };
const MIN = 60_000;
const HOUR = 60 * MIN;

describe('copy.when: one countdown style (answers §4.2)', () => {
  // Wednesday 7 October 2026, 12:00 UTC: 14:00 in Berlin (CEST), 08:00 in New York (EDT).
  const now = Date.UTC(2026, 9, 7, 12, 0);

  it.each([
    ['under an hour', now + 24 * MIN, 'in 24 min', 'in 24 min'],
    ['30 seconds is a minute', now + 30_000, 'in 1 min', 'in 1 min'],
    ['59 minutes 30', now + 59.5 * MIN, 'in 60 min', 'in 60 min'],
    ['later today', now + 6 * HOUR + 40 * MIN, 'at 20:40', 'at 14:40'],
    ['tomorrow', Date.UTC(2026, 9, 8, 0, 0), 'tomorrow 02:00', 'at 20:00'],
    ['two days or more', Date.UTC(2026, 9, 10, 0, 0), 'Saturday', 'Friday'],
    ['passed', now - MIN, 'now', 'now'],
    ['exactly now', now, 'now', 'now'],
  ])('%s', (_name, at, berlin, newYork) => {
    expect(when(at, now, BERLIN)).toBe(berlin);
    expect(when(at, now, NEW_YORK)).toBe(newYork);
  });

  it('two days or more with the time, where it matters', () => {
    const sat = Date.UTC(2026, 9, 10, 0, 0);
    expect(when(sat, now, { ...BERLIN, withTime: true })).toBe('Saturday 02:00');
    expect(when(sat, now, { ...NEW_YORK, withTime: true })).toBe('Friday 20:00');
  });

  it('"tomorrow" is the next local day, not the next 24 hours', () => {
    // 23:30 in Berlin; 00:30 the next local day is "tomorrow", although 60 minutes off.
    const late = Date.UTC(2026, 9, 7, 21, 30);
    expect(when(late + 61 * MIN, late, BERLIN)).toBe('tomorrow 00:31');
    // In New York it is 17:30: the same moment is later today.
    expect(when(late + 61 * MIN, late, NEW_YORK)).toBe('at 18:31');
  });

  it('across the clocks going back (Berlin, 25 October 2026)', () => {
    const sat = Date.UTC(2026, 9, 24, 20, 0); // Saturday 22:00 CEST
    const sunNoon = Date.UTC(2026, 9, 25, 11, 0); // Sunday 12:00 CET
    expect(when(sunNoon, sat, BERLIN)).toBe('tomorrow 12:00');
  });

  it('a boundary always prints the time, with no preposition (§23 Q6)', () => {
    const turn = Date.UTC(2026, 9, 8, 0, 0); // the City Day's turn
    expect(boundary(turn, now, BERLIN)).toBe('tomorrow 02:00');
    expect(boundary(turn, now, NEW_YORK)).toBe('20:00');
    expect(boundary(Date.UTC(2026, 9, 10), now, BERLIN)).toBe('Saturday 02:00');
    expect(boundary(now + 20 * MIN, now, BERLIN)).toBe('14:20');
  });

  it('a length that is not a moment is a count', () => {
    expect(count(38)).toBe('38 minutes');
    expect(count(1)).toBe('1 minute');
  });

  it('the copy reads with the phrase: ready, full, out, Cool, arrives', () => {
    const at = when(now + 24 * MIN, now, BERLIN);
    expect(copy.needsEnergy(10, at)).toBe('Needs 10 Energy · ready in 24 min');
    expect(copy.energyFullAt(when(now + 2 * HOUR, now, BERLIN))).toBe('full at 16:00');
    expect(copy.risk.cells.outAt(when(now + 38 * MIN, now, BERLIN))).toBe('out in 38 min · or pay bail');
    expect(copy.risk.heatMove('+8', 32, 'Noticed', when(now + 6 * HOUR + 40 * MIN, now, NEW_YORK))).toBe(
      'Heat +8 → 32 · Noticed · Cool at 14:40',
    );
    expect(copy.travel.arrives(when(now + 7 * MIN, now, BERLIN), '14:07')).toBe('arrives in 7 min · 14:07');
    expect(copy.risk.desk.cells('Harbour Police', 'in 24 min', 150)).toBe(
      'In the cells at Harbour Police · out in 24 min · bail 150 Iron',
    );
  });
});

describe('the vocabulary of times in copy.ts (fix list 6, 13)', () => {
  /** The template literals and quoted strings of copy.ts, comments dropped. */
  const code = COPY_SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('no "by {time}": a moment is never "by"', () => {
    const TIMEISH = 'until|time|at|when|ready|readyAt|fullAt|paid|firstPayAt|weekday|out|cool';
    expect(code.match(new RegExp(String.raw`\bby \$\{(?:${TIMEISH})\}`, 'g')) ?? []).toEqual([]);
    expect(code.match(/\b(?:cools?|Cool|full again) by\b/g) ?? []).toEqual([]);
  });

  it('no "minutes to go" and no "min to go"', () => {
    expect(code.match(/minutes? to go|min to go/g) ?? []).toEqual([]);
  });

  it('"close the game" only in the encounter\'s warning (#16)', () => {
    const hits = code.match(/[^\n]*close the game[^\n]*/gi) ?? [];
    expect(hits).toHaveLength(1);
    expect(hits[0]).toContain("If you close the game, it's left to luck.");
    expect(copy.risk.oneChoice).toBe("One choice. If you close the game, it's left to luck.");
  });

  it('the sentences of answers §16, word for word', () => {
    expect(copy.risk.cells.eitherWay('at 03:59')).toBe(
      'The door opens at 03:59 either way, and Energy keeps refilling in here.',
    );
    expect(copy.risk.infirmary.eitherWay('at 03:59')).toBe(
      "You're discharged at 03:59 either way, and Health comes back ten every ten minutes.",
    );
    expect(copy.travel.eitherWay).toBe("You'll arrive either way, and Energy keeps refilling on the way.");
    expect(ANSWERS).toContain(`***${copy.travel.eitherWay}***`);
  });
});

describe('the notes, word for word (answers §4.1, §12)', () => {
  it('the clock (review 5 rewrote it for the six-hour day: review5.copy.test.ts)', () => {
    const [kicker, note] = copy.help.clock('{dayTurn}');
    expect(kicker).toBe('The clock');
    expect(note).toContain('The day turns at {dayTurn}');
  });

  it('Heat, by state, with "Cool at" on its own line while not Cool', () => {
    const quote = /> \*\*HEAT · \{state\}\*\*\n> (.+)\n/.exec(ANSWERS)![1]!;
    for (const state of ['cool', 'noticed', 'hot', 'wanted'] as const) {
      const [kicker, note] = copy.risk.help.heat(state, 'at 20:40');
      expect(kicker).toBe(`Heat · ${copy.risk.heatState[state]}`);
      const [body, cool] = note!.split('\n');
      expect(body).toBe(quote.replace('{stateLine}', copy.risk.heatStateLine[state]));
      // Each state line is the answers' own, in italics.
      expect(ANSWERS).toContain(`*${copy.risk.heatStateLine[state]}*`);
      expect(cool).toBe(state === 'cool' ? undefined : 'Cool at 20:40.');
    }
    // No cooling moment known: no line.
    expect(copy.risk.help.heat('hot', null)[1]).not.toContain('\n');
  });
});
