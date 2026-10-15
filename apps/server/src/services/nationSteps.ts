import type { NationBoundaryCtx } from './nationDay';

/**
 * Slice 7 (docs/tech/slice-7.md §3.1, §8.2): the nation's day's window handlers, by step, in the
 * boundary's order. `nationDay.ts` runs National Control first, then these lists in
 * `NATION_STEP_ORDER` ('push' → 'chair' → 'divisions' → 'enactments' → 'termWork' → 'monday' →
 * 'clerk'), then the laws' expiries and the news, all in one transaction.
 *
 * The hook point for lane 2 (T14–T19): add a handler to its step's list. A handler:
 * - writes its own documents in `ctx.session` with natural keys (a replay must be a no-op);
 * - changes the nation document only through `ctx.government`, `ctx.laws` (the projection),
 *   `ctx.set` and `ctx.news` (written once at the end, under the `settledDay` guard);
 * - reads `ctx.work` (nationWork: takeOffice, openChair, closeChairNames, countChair, openNation,
 *   openPick, countPick, countNation, monday) to know whether its window runs at `ctx.d`;
 * - is also run by the bootstrap for the steps 'termWork' and 'monday' (`ctx.bootstrap` true), so
 *   a window opening on the bootstrap day runs once.
 */
export type NationStep = 'push' | 'chair' | 'divisions' | 'enactments' | 'termWork' | 'monday' | 'clerk';

export type NationHandler = (ctx: NationBoundaryCtx) => Promise<void>;

export const NATION_STEPS: Record<NationStep, NationHandler[]> = {
  /** (2) The party's target of day d − 1 per faction (T16). */
  push: [],
  /** (3) Petitions on the Chair closing at d; votes on the Chair counting at d; the automatic vote (T19). */
  chair: [],
  /** (4) Divisions due at d (T15, T18's removals). */
  divisions: [],
  /** (4) Enactments due at d (signature day passed) (T15). */
  enactments: [],
  /** (5) The term-day work: take office (0), the Chair's election (9, 11, 14), the nation's (19, 21, 23, 27) (T14, T17). */
  termWork: [],
  /** (6) Monday: the President's slot for a party figure, then one secretary's bill (T15). */
  monday: [],
  /** (7) The clerk's motion to remove the President (T18). */
  clerk: [],
};
