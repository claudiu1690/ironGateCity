/**
 * Review 5, phase 1 (docs/tech/review-5.md §3.3–§3.5; ADR 0079, 0080): the town's six-hour day in
 * words: the plate's dusk line through `copy.when`, the night window's lock line, the patrols tag, and
 * the clock's and the patrols' notes word for word against docs/design/review-5-answers.md §11.3 and
 * §16.1 (and GDD §14.12 for the patrols).
 */
import { describe, expect, it } from 'vitest';
import ANSWERS from '../../../docs/design/review-5-answers.md?raw';
import GDD from '../../../docs/GDD.md?raw';
import { copy } from '../src/data/copy';

const MIN = 60_000;
const HOUR = 60 * MIN;

describe('the plate line (answers §11.3: *Dusk in 40 min* · *Night · dawn at 18:00*)', () => {
  const day = Date.UTC(2026, 9, 8, 15, 20);
  it('by day: dusk in minutes under an hour, at a time later', () => {
    const n = { night: false, nextDusk: Date.UTC(2026, 9, 8, 16), nextDawn: Date.UTC(2026, 9, 8, 18) };
    expect(copy.night.plate(n, day)).toBe('Dusk in 40 min');
    expect(copy.night.plate(n, day - 2 * HOUR)).toMatch(/^Dusk at \d\d:00$/);
  });
  it('at night: dawn in minutes, or at a time', () => {
    const n = { night: true, nextDusk: Date.UTC(2026, 9, 8, 22), nextDawn: Date.UTC(2026, 9, 8, 18) };
    expect(copy.night.plate(n, Date.UTC(2026, 9, 8, 17, 35))).toBe('Night · dawn in 25 min');
    expect(copy.night.plate(n, Date.UTC(2026, 9, 8, 16, 1))).toMatch(/^Night · dawn at \d\d:00$/);
  });
  it('the 03:58 case of the plan: *Dusk in 2 min*', () => {
    const n = { night: false, nextDusk: Date.UTC(2026, 9, 9, 4), nextDawn: Date.UTC(2026, 9, 9, 6) };
    expect(copy.night.plate(n, Date.UTC(2026, 9, 9, 3, 58))).toBe('Dusk in 2 min');
  });
  it('words only: no UTC, no digits beyond the time', () => {
    const n = { night: false, nextDusk: Date.UTC(2026, 9, 8, 22), nextDawn: Date.UTC(2026, 9, 9) };
    expect(copy.night.plate(n, day)).not.toMatch(/UTC/);
  });
});

describe('the night window and the patrols tag (answers §12.1–§12.2)', () => {
  it('*Opens at nightfall · dusk at 16:00*', () => {
    expect(copy.night.opensAt('at 16:00')).toBe('Opens at nightfall · dusk at 16:00');
    expect(ANSWERS).toContain('***Opens at nightfall · dusk at 16:00***');
  });
  it('*Night · patrols out*', () => {
    expect(copy.night.patrolsTag).toBe('Night · patrols out');
    expect(ANSWERS).toContain(`***${copy.night.patrolsTag}***`);
  });
});

describe('the notes, word for word (answers §11.3, §16.1; GDD §14.12)', () => {
  it('the clock', () => {
    const [kicker, note] = copy.help.clock('{dayTurn}');
    expect(kicker).toBe('The clock');
    expect(ANSWERS).toContain(`*${note}*`);
  });
  it('the patrols', () => {
    const [kicker, note] = copy.help.patrols();
    expect(kicker).toBe('Patrols');
    expect(ANSWERS).toContain(`\`help.patrols\`: *${note}*`);
    expect(GDD).toContain(`\`help.patrols\`: *${note}*`);
  });
});

describe('the new refusals (tech design §3.5)', () => {
  it('*A patrol has stopped you · answer it on the map*', () => {
    expect(copy.errors.patrolPending).toBe('A patrol has stopped you · answer it on the map');
    expect(copy.errors.noPatrol.length).toBeGreaterThan(0);
    expect(copy.errors.fullHealth.length).toBeGreaterThan(0);
  });
});
