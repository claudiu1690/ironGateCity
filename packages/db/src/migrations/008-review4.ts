import type { Content } from '@irongate/content';
import { Character } from '../models/character';

/**
 * Review 4 (tech design docs/tech/review-4.md §14): the fix round's data changes, one exported step
 * per feature, each idempotent (a second run matches and modifies nothing) and each returning its
 * counts, which `migrateReview4` collects in order.
 *
 * Phase 1 lays the skeleton: every step is in place and does nothing yet. Each phase fills its own:
 *
 * | Step | Phase | Filter → update |
 * |---|---|---|
 * | `resetOldDrafts` | 8 (the prologue) | `arrivals` mid-way through the old six questions → `answers: []` |
 * | `cardAtForOpenJourneys` | 6 (the journey) | `journeys` on the way with a card and no `card.at` → `card.at = boardedAt` |
| `cellsNowIndex` | 2 (the cells) | `characters`: the `held_cells_now` partial index, made if missing |
 *
 * Nothing else needs a step: the `held_cells_now` index is declared on the character schema and made
 * by `syncIndexes`; `orders.off` and `officeTerms.whatNowSeenAt` read absent as null; the halls and
 * the lodgings are content (§14).
 */
export interface StepCounts {
  matched: number;
  modified: number;
}

export type Review4Step = 'resetOldDrafts' | 'cardAtForOpenJourneys' | 'cellsNowIndex';

export type Review4Counts = Record<Review4Step, StepCounts>;

const nothing = (): StepCounts => ({ matched: 0, modified: 0 });

/**
 * Phase 8 (the prologue, ADR 0073): a draft part-way through the old six questions starts again at the
 * platform; its face and name are kept. Not filled yet: the old questions are still the live ones.
 */
export async function resetOldDrafts(_content: Pick<Content, 'origin'>): Promise<StepCounts> {
  return nothing();
}

/**
 * Phase 6 (the journey on the map, ADR 0075): a journey on the way with a card and no `card.at` is
 * answerable at once, as before the change. Not filled yet: no journey carries `card.at`.
 */
export async function cardAtForOpenJourneys(): Promise<StepCounts> {
  return nothing();
}

/** Review 4 #19 (ADR 0078): the partial index *In the cells now* reads, as the schema declares it. */
export const CELLS_NOW_INDEX = {
  key: { 'held.locationId': 1, 'held.until': 1 },
  name: 'held_cells_now',
  partialFilterExpression: { 'held.state': 'in', 'held.kind': 'cells' },
} as const;

/**
 * Phase 2 (the cells, ADR 0078): the `held_cells_now` partial index on `characters`. It is declared on
 * the schema, so `syncIndexes` makes it at start-up; this step makes it when the migration runs on
 * its own against a database whose indexes were never synced. `matched` 1 when it is there,
 * `modified` 1 when this run made it. Nothing on the characters changes: `orders.off` reads absent as
 * null, sentences already running keep their `until`, and past arrests get no mark (ADR 0078).
 */
export async function cellsNowIndex(): Promise<StepCounts> {
  const has = async () =>
    (await Character.collection.indexes().catch(() => [])).some((i) => i.name === CELLS_NOW_INDEX.name);
  if (await has()) return { matched: 1, modified: 0 };
  await Character.collection.createIndex(CELLS_NOW_INDEX.key, {
    name: CELLS_NOW_INDEX.name,
    partialFilterExpression: CELLS_NOW_INDEX.partialFilterExpression,
  });
  return { matched: 0, modified: 1 };
}

/** Run the review-4 steps in order; called by `ensureIndexes` after 007. */
export async function migrateReview4(content: Pick<Content, 'origin'>): Promise<Review4Counts> {
  return {
    resetOldDrafts: await resetOldDrafts(content),
    cardAtForOpenJourneys: await cardAtForOpenJourneys(),
    cellsNowIndex: await cellsNowIndex(),
  };
}
