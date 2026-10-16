import { roundHalfUp } from './rewards';
import type { Rng } from './rng';
import { FACTION_IDS } from './types';
import type { ActionDescriptor, FactionId, IssueMatch, OpinionShares, Outcome } from './types';

/**
 * Issues of the Week (slice-4 tech design §6.6, design §9, GDD §14.6, ADR 0029): the Monday draw,
 * the tags, the points and the resolution. Pure; the city day stores the seed and the documents.
 */

export interface IssueDraw {
  id: string;
  districtId: string | null;
  order: 1 | 2;
}

/**
 * Design §9.1: two Issues, never last week's, and in a city with districts from two different
 * districts; all weights 1. With too few left, as many as there are (content guarantees four).
 */
export function drawIssues(i: {
  eligible: ReadonlyArray<{ id: string; districtId: string | null }>;
  lastWeek: readonly string[];
  distinctDistricts: boolean;
  rng: Rng;
}): IssueDraw[] {
  const pool = i.eligible.filter((e) => !i.lastWeek.includes(e.id));
  const out: IssueDraw[] = [];
  if (pool.length === 0) return out;
  const first = pool[i.rng.int(0, pool.length - 1)]!;
  out.push({ id: first.id, districtId: first.districtId, order: 1 });
  const rest = pool.filter(
    (e) => e.id !== first.id && (!i.distinctDistricts || e.districtId !== first.districtId),
  );
  if (rest.length > 0) {
    const second = rest[i.rng.int(0, rest.length - 1)]!;
    out.push({ id: second.id, districtId: second.districtId, order: 2 });
  }
  return out;
}

/**
 * One feed (AND of its fields); the city is the Issue's own. Slice 5 (design §12.1): a mission is
 * tagged by the same feeds as the type it is seen as (the illegal types are kept out by the caller).
 */
export function feedMatches(m: IssueMatch, a: ActionDescriptor): boolean {
  // Slice 6 (tech 6.7): an event is tagged as an action of its `actionType` at its venue.
  // Slice 8 (design §4.5, §21.1 Q29): an exposé is tagged only by a feed naming `expose`.
  if (a.kind === 'expose') {
    if (!m.actionTypes?.includes('expose')) return false;
  } else if (a.kind !== 'checked' && a.kind !== 'mission' && a.kind !== 'event') return false;
  if (m.actionTypes && (a.type === undefined || !m.actionTypes.includes(a.type))) return false;
  if (m.locationIds && (a.locationId === undefined || !m.locationIds.includes(a.locationId))) return false;
  if (m.locationKinds && (a.locationKind === undefined || !m.locationKinds.includes(a.locationKind)))
    return false;
  if (m.districtId !== undefined && a.districtId !== m.districtId) return false;
  return true;
}

/** Design §9.2: the live Issues an action is tagged with (each Issue's feeds are an OR). */
export function issueTags<T extends { docId: string; issueId: string; feeds: readonly IssueMatch[] }>(
  live: readonly T[],
  a: ActionDescriptor,
): T[] {
  return live.filter((l) => l.feeds.some((m) => feedMatches(m, a)));
}

/**
 * Design §9.3: a tagged row adds its content Energy on Success, half (rounded half up) on a
 * Partial, nothing on a failure.
 */
export const pointsFor = (energy: number, outcome: Outcome): number =>
  outcome === 'success' ? energy : outcome === 'partial' ? roundHalfUp(energy / 2) : 0;

/**
 * Design §9.4: the faction with most points owns the Issue; a tie goes to the higher share in the
 * city (the district in Irongate); still tied, nobody. No points at all: it lapses.
 */
export function resolveIssue(i: { momentum: Partial<Record<FactionId, number>>; shares: OpinionShares }): {
  ownerId: FactionId | null;
  by: 'points' | 'share' | null;
  lapsed: boolean;
} {
  const pts = (f: FactionId) => i.momentum[f] ?? 0;
  const best = Math.max(...FACTION_IDS.map(pts));
  if (best <= 0) return { ownerId: null, by: null, lapsed: true };
  const leaders = FACTION_IDS.filter((f) => pts(f) === best);
  if (leaders.length === 1) return { ownerId: leaders[0]!, by: 'points', lapsed: false };
  const k = (f: FactionId) => Math.round(i.shares[f] * 1_000);
  const top = Math.max(...leaders.map(k));
  const byShare = leaders.filter((f) => k(f) === top);
  if (byShare.length === 1) return { ownerId: byShare[0]!, by: 'share', lapsed: false };
  return { ownerId: null, by: null, lapsed: false };
}
