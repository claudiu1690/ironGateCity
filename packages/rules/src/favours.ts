/**
 * Slice 6: favours between faction mates (docs/tech/slice-6.md §6.5; design §9; ADR 0041). Pure.
 */
import { FAVOURS } from './constants';
import type { HeldKind } from './held';
import type { FactionId } from './types';

const MINUTE_MS = 60_000;

interface MateHeld {
  kind: HeldKind;
  state: 'in' | 'out';
  until: number;
  bail: { total: number } | null;
}

export type BailFavourRefusal = 'NOT_A_MATE' | 'SELF' | 'ALREADY_OUT' | 'NOT_IN_CELLS' | 'NOT_ENOUGH_IRON';

/** Design §9.1: post a mate's bail from anywhere (Iron, not an Energy act). */
export function bailFavourGate(i: {
  payer: { factionId: FactionId; iron: number; id: string };
  mate: { factionId: FactionId; id: string; held: MateHeld | null };
  now: number;
}): null | { reason: BailFavourRefusal; need?: number } {
  if (i.payer.id === i.mate.id) return { reason: 'SELF' };
  if (i.payer.factionId !== i.mate.factionId) return { reason: 'NOT_A_MATE' };
  const h = i.mate.held;
  if (!h || h.state !== 'in' || h.until <= i.now) return { reason: 'ALREADY_OUT' };
  if (h.kind !== 'cells' || !h.bail) return { reason: 'NOT_IN_CELLS' };
  if (i.payer.iron < h.bail.total) return { reason: 'NOT_ENOUGH_IRON', need: h.bail.total };
  return null;
}

export type VisitRefusal =
  | 'NOT_A_MATE'
  | 'SELF'
  | 'ALREADY_OUT'
  | 'NOT_IN_INFIRMARY'
  | 'ALREADY_VISITED'
  | 'NOT_ENOUGH_ENERGY'
  | 'HELD'
  | 'IN_TRANSIT'
  | 'RIVAL_GROUND'
  | 'RUN_IN_PENDING';

/** Design §9.2 (user default 15 Oct 2026): a visit on the ward, 3 Energy, from anywhere but rival ground. */
export function visitGate(i: {
  visitor: {
    factionId: FactionId;
    id: string;
    energy: number;
    held: boolean;
    inTransit: boolean;
    rivalGround: boolean;
    runInPending: boolean;
  };
  mate: { factionId: FactionId; id: string; held: MateHeld | null };
  visits: ReadonlyArray<{ characterId: string }>;
  now: number;
}): null | { reason: VisitRefusal; need?: number } {
  if (i.visitor.id === i.mate.id) return { reason: 'SELF' };
  if (i.visitor.factionId !== i.mate.factionId) return { reason: 'NOT_A_MATE' };
  const h = i.mate.held;
  if (!h || h.state !== 'in' || h.until <= i.now) return { reason: 'ALREADY_OUT' };
  if (h.kind !== 'infirmary') return { reason: 'NOT_IN_INFIRMARY' };
  if (i.visits.some((v) => v.characterId === i.visitor.id)) return { reason: 'ALREADY_VISITED' };
  if (i.visitor.held) return { reason: 'HELD' };
  if (i.visitor.inTransit) return { reason: 'IN_TRANSIT' };
  if (i.visitor.runInPending) return { reason: 'RUN_IN_PENDING' };
  if (i.visitor.rivalGround) return { reason: 'RIVAL_GROUND' };
  if (i.visitor.energy < FAVOURS.visit.energy) return { reason: 'NOT_ENOUGH_ENERGY', need: FAVOURS.visit.energy };
  return null;
}

/**
 * Design §9.2: the first three visits of a stay take five minutes off (never below five minutes
 * after admission, nor before now) and heal 10; a fourth and later bring grapes only.
 */
export function visitEffect(i: { since: number; until: number; now: number; counted: number }): {
  counted: boolean;
  until: number;
  minutesOff: number;
  health: number;
} {
  if (i.counted >= FAVOURS.visit.counted) return { counted: false, until: i.until, minutesOff: 0, health: 0 };
  const floor = Math.max(i.since + FAVOURS.visit.minStayMinutes * MINUTE_MS, i.now);
  const until = Math.min(i.until, Math.max(floor, i.until - FAVOURS.visit.minutes * MINUTE_MS));
  const minutesOff = Math.max(0, Math.round((i.until - until) / MINUTE_MS));
  return { counted: true, until, minutesOff, health: FAVOURS.visit.health };
}
