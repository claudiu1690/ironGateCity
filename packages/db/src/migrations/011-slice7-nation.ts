import { Character } from '../models/character';
import { Candidacy, OfficeTerm } from '../models/politics';
import type { StepCounts } from './008-review4';

/**
 * Migration 011 (docs/tech/slice-7.md §5.10): slice 7's data. Run by `ensureIndexes` after 010; the
 * seven new collections and their indexes come first through `syncIndexes`. Idempotent: each step
 * filters on the field's absence, so a second run modifies nothing.
 *
 * Step 3 of the tech design is not here: the `nation` and `factions` documents are made by the
 * nation's bootstrap, and Clearwater's city document by its city day's bootstrap (ADR 0017's
 * pattern), on the worker's start or the first request (phase B).
 */

/** Step 1: every old office term is a council term; every old candidacy a council candidacy. */
export async function markCouncilKinds(): Promise<{ terms: StepCounts; candidacies: StepCounts }> {
  const terms = await OfficeTerm.updateMany({ office: { $exists: false } }, { $set: { office: 'council' } });
  const candidacies = await Candidacy.updateMany({ kind: { $exists: false } }, { $set: { kind: 'council' } });
  return {
    terms: { matched: terms.matchedCount, modified: terms.modifiedCount },
    candidacies: { matched: candidacies.matchedCount, modified: candidacies.modifiedCount },
  };
}

/**
 * Step 2: `termBackings: []` on every character without it; each `offices[]` entry gains
 * `office: 'council'` and `key` from its `councilKey` (only entries without an `office`).
 */
export async function addNationCharacterFields(): Promise<StepCounts> {
  const backings = await Character.updateMany({ termBackings: { $exists: false } }, { $set: { termBackings: [] } });
  const offices = await Character.updateMany(
    { offices: { $elemMatch: { office: { $exists: false } } } },
    [
      {
        $set: {
          offices: {
            $map: {
              input: '$offices',
              as: 'o',
              in: {
                $cond: [
                  { $eq: [{ $type: '$$o.office' }, 'missing'] },
                  { $mergeObjects: ['$$o', { office: 'council', key: '$$o.councilKey' }] },
                  '$$o',
                ],
              },
            },
          },
        },
      },
    ],
    { updatePipeline: true },
  );
  return {
    matched: backings.matchedCount + offices.matchedCount,
    modified: backings.modifiedCount + offices.modifiedCount,
  };
}

/** Migration 011, in order; `ensureIndexes` calls it after 010 and the start-up log prints the counts. */
export async function migrateSlice7Nation(): Promise<{
  terms: StepCounts;
  candidacies: StepCounts;
  characters: StepCounts;
}> {
  const { terms, candidacies } = await markCouncilKinds();
  const characters = await addNationCharacterFields();
  return { terms, candidacies, characters };
}
