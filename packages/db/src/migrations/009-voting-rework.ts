import { COUNCIL, PC } from '@irongate/rules';
import { mongoose } from '../connect';
import { Character } from '../models/character';
import { Candidacy } from '../models/politics';
import type { StepCounts } from './008-review4';

/**
 * The voting rework (docs/tech/voting-rework.md §6.2, ADR 0086): the data change that is not a
 * city's conversion. The refund of a deposit (`deposit: 'due'`, a struck candidate's 10 Political
 * Capital, credited at the next settlement) is retired with the strike, so every deposit still due is
 * credited once here.
 *
 * Run by `ensureIndexes` after 008 (the settlement's refund read is gone). The indexes follow the
 * schemas through `syncIndexes`, which runs before the migrations.
 */

/**
 * Per candidacy, one transaction: the candidacy flips `due → returned` first, and only a flip credits
 * the character (+10, capped at `PC.cap`, `version` bumped). A second run matches nothing, so each due
 * deposit is credited exactly once. `matched`: the due deposits seen; `modified`: those credited here.
 */
export async function refundDueDeposits(): Promise<StepCounts> {
  const due = await Candidacy.find({ deposit: 'due' }, { _id: 1, characterId: 1 }).lean();
  let modified = 0;
  for (const c of due) {
    const session = await mongoose.startSession();
    let credited = false;
    try {
      await session.withTransaction(async () => {
        credited = false;
        const flip = await Candidacy.updateOne(
          { _id: c._id, deposit: 'due' },
          { $set: { deposit: 'returned' } },
          { session },
        );
        if (flip.modifiedCount !== 1) return;
        await Character.updateOne(
          { _id: c.characterId },
          [
            {
              $set: {
                pc: { $min: [PC.cap, { $add: ['$pc', COUNCIL.cost.declare] }] },
                version: { $add: ['$version', 1] },
              },
            },
          ],
          // Mongoose 9 refuses an update pipeline unless it is asked for (found by the conversion check).
          { session, updatePipeline: true },
        );
        credited = true;
      });
    } finally {
      await session.endSession();
    }
    if (credited) modified += 1;
  }
  return { matched: due.length, modified };
}

/** Migration 009, in order; `ensureIndexes` calls it after 008 and the start-up log prints the counts. */
export async function migrateVotingRework(): Promise<{ refunds: StepCounts }> {
  return { refunds: await refundDueDeposits() };
}
