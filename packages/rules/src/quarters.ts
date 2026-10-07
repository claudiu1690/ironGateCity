/**
 * Quarters (GDD §14.13, design §2.1, ADR 0035): a quarter opens by Level, per character (1 / 6 /
 * 10), or the moment the game sends the character to a place in it (a view rule, nothing stored).
 * A quarter of a later edition is a teaser whatever the Level. Pure.
 */
export type QuarterOpens = { level: number } | { edition: 'later' };

export type QuarterLock = { kind: 'level'; level: number } | { kind: 'edition' };

export function quarterOpen(
  q: { opens?: QuarterOpens },
  level: number,
  heldHere = false,
): { open: boolean; lock: QuarterLock | null } {
  const opens = q.opens ?? { level: 1 };
  if ('edition' in opens) return { open: false, lock: { kind: 'edition' } };
  if (heldHere || level >= opens.level) return { open: true, lock: null };
  return { open: false, lock: { kind: 'level', level: opens.level } };
}

/** Review 4 (ADR 0077): the place kinds open at every Level, whatever their quarter (the Town Halls). */
export const ALWAYS_OPEN_KINDS = ['town-hall'] as const;

/**
 * Review 4 (ADR 0076–0077): whether a place is open to a character: its kind always open (the Town
 * Hall), or the game holding the character there, or its quarter open by Level (`quarterOpen`). A
 * place outside any quarter is open. Pure.
 */
export function placeOpen(i: {
  quarter?: { opens?: QuarterOpens } | null;
  kind: string;
  level: number;
  heldHere?: boolean;
}): { open: boolean; lock: QuarterLock | null } {
  if ((ALWAYS_OPEN_KINDS as readonly string[]).includes(i.kind)) return { open: true, lock: null };
  if (!i.quarter) return { open: true, lock: null };
  return quarterOpen(i.quarter, i.level, i.heldHere ?? false);
}
