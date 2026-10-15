/**
 * Slice 6: the faction scoreboard's scoped totals (docs/tech/slice-6.md §6.6; ADR 0042). Pure.
 */
import type { DayKey } from './day';
import type { FactionId } from './types';
import { weekOf } from './week';

export type ScoreboardPeriod = 'week' | 'all';

/** `faction|{f}|w{monday}|{city}` · `…|w{monday}|all` · `faction|{f}|all|{city}` · `…|all|all`. */
export const scopeFor = (f: FactionId, period: ScoreboardPeriod, cityId: string | null, day: DayKey): string =>
  `faction|${f}|${period === 'week' ? `w${weekOf(day)}` : 'all'}|${cityId ?? 'all'}`;

/** The four scopes an opinion row in `cityId` on `day` adds to (ADR 0042). */
export function factionScopes(f: FactionId, cityId: string, day: DayKey): [string, string, string, string] {
  return [
    scopeFor(f, 'week', cityId, day),
    scopeFor(f, 'week', null, day),
    scopeFor(f, 'all', cityId, day),
    scopeFor(f, 'all', null, day),
  ];
}
