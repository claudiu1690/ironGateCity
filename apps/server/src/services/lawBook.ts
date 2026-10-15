import type { GameContent } from '@irongate/content';
import type { NationDoc } from '@irongate/db';
import { RECORD, lawSourcesOn, markFadeDaysOf } from '@irongate/rules';
import type { DayKey, FactionId, LawInForce, ModifierSource, Modifiers } from '@irongate/rules';

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
let bookContent: GameContent | null = null;

export function setLawBook(nation: Pick<NationDoc, 'laws' | 'world'> | null, content?: GameContent): void {
  if (content) bookContent = content;
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

/** The laws alone as modifiers (laws are national: no city, no morale, no place). */
export function lawModifiers(content: GameContent, day: DayKey, actor: FactionId): Modifiers {
  return { sources: lawSourcesFor(content, day, actor), firedUp: false };
}

/**
 * ADR 0044 (`liveMarks`' `fadeDaysOn`): the minor marks' fade on a day, the smallest `markFadeDays`
 * in force then (the Rehabilitation Act's 7), else slice 5's 14. Undefined with no law in the book.
 */
export function lawFadeDaysOn(content: GameContent, actor: FactionId): ((day: DayKey) => number) | undefined {
  if (projection.length === 0) return undefined;
  return (day) => markFadeDaysOf(lawModifiers(content, day, actor)) ?? RECORD.minorFadeDays;
}

/** `lawFadeDaysOn` with the content the book was last set with (the record's readers have none). */
export function fadeDaysFor(actor: FactionId): ((day: DayKey) => number) | undefined {
  return bookContent ? lawFadeDaysOn(bookContent, actor) : undefined;
}

/** The law sources in force on `day` for an actor of `actor` (ADR 0030's third source). */
export function lawSourcesFor(
  content: GameContent,
  day: DayKey,
  actor: FactionId | undefined,
): ModifierSource[] {
  if (!actor || projection.length === 0) return [];
  return lawSourcesOn(projection, day, actor, (id) => content.lawSpec(id));
}
