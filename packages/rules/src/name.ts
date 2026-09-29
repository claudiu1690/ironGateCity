import { NAME } from './constants';

/** Why a name is refused (§7.3): the copy keys are `nameBlank`, `nameTooShort`, `nameTooLong`. */
export type NameProblem = 'blank' | 'short' | 'long';

/** A name as it is stored: NFC, trimmed, every run of whitespace one space. */
export function normalizeName(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

/**
 * §7.3 (onboarding §14.2): 2–40 characters after normalising; no character class is restricted
 * (accents and apostrophes are normal names). Characters are counted as code points, so "Zoë" is 3.
 * The client checks it under the field; the server refuses the same at sign-up and at the join.
 */
export function checkName(
  raw: string,
): { ok: true; name: string } | { ok: false; reason: NameProblem; name: string } {
  const name = normalizeName(raw);
  const length = [...name].length;
  if (length === 0) return { ok: false, reason: 'blank', name };
  if (length < NAME.min) return { ok: false, reason: 'short', name };
  if (length > NAME.max) return { ok: false, reason: 'long', name };
  return { ok: true, name };
}
