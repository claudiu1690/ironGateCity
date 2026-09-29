import { describe, expect, it } from 'vitest';
import { NAME, checkName, normalizeName } from '../src';

/** §7.3 (onboarding §14.2, slice-2 QA m3): the name rule. */
describe('checkName', () => {
  it('trims, collapses inner runs of spaces and keeps accents and apostrophes', () => {
    expect(normalizeName('  Mara   Lenk \t')).toBe('Mara Lenk');
    expect(checkName("  Zoë  O'Hara ")).toEqual({ ok: true, name: "Zoë O'Hara" });
    // A decomposed "ë" counts as one character once normalised.
    expect(checkName('Zoë')).toEqual({ ok: true, name: 'Zoë' });
  });

  it('refuses a blank name, one of spaces only, and a single character', () => {
    expect(checkName('')).toMatchObject({ ok: false, reason: 'blank' });
    expect(checkName('   ')).toMatchObject({ ok: false, reason: 'blank' });
    expect(checkName(' \n\t ')).toMatchObject({ ok: false, reason: 'blank' });
    expect(checkName(' K ')).toMatchObject({ ok: false, reason: 'short', name: 'K' });
    expect(checkName('Ko')).toEqual({ ok: true, name: 'Ko' });
  });

  it('allows 40 characters and refuses 41, counted after trimming', () => {
    const forty = 'A'.repeat(NAME.max);
    expect(NAME).toEqual({ min: 2, max: 40 });
    expect(checkName(`   ${forty}   `)).toEqual({ ok: true, name: forty });
    expect(checkName(`${forty}B`)).toMatchObject({ ok: false, reason: 'long' });
    // Inner spaces collapse before counting.
    expect(checkName(`${'A'.repeat(20)}     ${'B'.repeat(19)}`)).toMatchObject({ ok: true });
  });
});
