import { districtLeader } from '@irongate/rules';
import type { OpinionShares } from '@irongate/rules';
import { Character } from '../models/character';
import { District } from '../models/district';

/**
 * Slice 5 (tech design §5.5, ADR 0032, 0033, 0034): the risk fields. Idempotent: every step filters
 * on its field's absence, so a second run changes nothing.
 *
 * 1. Characters (`heat` absent), in one aggregation-pipeline update: cool (Heat 0) and unhurt as of
 *    now, a clean record, not held, no run-in, no ways, flags or bars, the hostile deck unseen, no
 *    rival trips, no one-time cards shown; the passenger card counts as done once a journey was
 *    made; today's tally gains the missions and the rival city.
 * 2. Districts (`state.leader` absent): the leader from the current opinion, one conditional update
 *    per district. The next boundary sets it properly.
 *
 * `ensureIndexes` creates `encounters` and `stays` before this runs; no new unique index is on a
 * field added here. Returns the number of documents changed.
 */
export async function migrateSlice5Risk(): Promise<number> {
  let changed = 0;

  // 1. Characters.
  changed += (
    await Character.collection.updateMany({ heat: { $exists: false } }, [
      {
        $set: {
          heat: { value: 0, at: '$$NOW' },
          health: { damage: 0, at: '$$NOW' },
          record: { marks: [], arrests: [] },
          held: null,
          runIn: null,
          ways: [],
          'stats.agiQuarters': 0,
          flags: [],
          barred: [],
          hostileDeck: { seen: [] },
          rivalTrips: 0,
          // An empty object is not a valid expression in `$set`; `$literal` writes `{}`.
          firsts: { $literal: {} },
          // A missing count compares below 0: false.
          'journeyDeck.firstDone': { $gt: ['$journeysMade', 0] },
          'today.missions': 0,
          'today.rivalCityId': null,
        },
      },
    ])
  ).modifiedCount;

  // 2. Districts: the leader from the opinion they hold now.
  const pending = await District.collection
    .find({ 'state.leader': { $exists: false }, state: { $type: 'object' } }, { projection: { opinion: 1 } })
    .toArray();
  for (const d of pending) {
    const leader = districtLeader(d.opinion as unknown as OpinionShares);
    changed += (
      await District.collection.updateOne(
        { _id: d._id, 'state.leader': { $exists: false } },
        { $set: { 'state.leader': leader } },
      )
    ).modifiedCount;
  }
  return changed;
}
