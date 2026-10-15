import type { GameContent } from '@irongate/content';
import type { NationDoc } from '@irongate/db';
import { lawSourcesOn } from '@irongate/rules';
import type { DayKey, FactionId, LawInForce, ModifierSource } from '@irongate/rules';

/**
 * Slice 7 (docs/tech/slice-7.md §7.1, ADR 0044): the laws in force, as ADR 0030's builder reads
 * them. The projection (`nation.laws.inForce ∪ history`) is set by every read of the nation document
 * (`ensureNationDay`, `settleNationDay`), which every request and every job runs before it builds a
 * modifier, so the builder's existing signatures only gain the actor (whom a law applies to).
 *
 * Phase B deviation: a per-process projection rather than the document threaded through every
 * caller (25 call sites); the projection only changes at a boundary, and the boundary's reader
 * replaces it before anything that boundary decides is read.
 */

let projection: readonly LawInForce[] = [];
let settledDay: DayKey | null = null;

export function setLawBook(nation: Pick<NationDoc, 'laws' | 'world'> | null): void {
  if (!nation) return;
  projection = [...(nation.laws?.inForce ?? []), ...(nation.laws?.history ?? [])].map((l) => ({
    lawId: l.lawId,
    fromDay: l.fromDay,
    toDay: l.toDay,
  }));
  settledDay = nation.world.settledDay;
}

/** The projection as last read (tests and the dev panel). */
export const lawBook = (): { projection: readonly LawInForce[]; settledDay: DayKey | null } => ({
  projection,
  settledDay,
});

/** The law sources in force on `day` for an actor of `actor` (ADR 0030's third source). */
export function lawSourcesFor(content: GameContent, day: DayKey, actor: FactionId | undefined): ModifierSource[] {
  if (!actor || projection.length === 0) return [];
  return lawSourcesOn(projection, day, actor, (id) => content.lawSpec(id));
}
