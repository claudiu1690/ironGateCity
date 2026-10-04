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
