import { Character } from '../models/character';

/**
 * Slice 1: give slice-0 characters the new embedded fields (tech design §5.1). Idempotent: only
 * documents without `statPointsPending` are touched. Level-ups and Rank catch up on the next write
 * (`applyGains` never lowers them); `day.settled: null` makes the next touch write a first edition.
 */
export async function migrateSlice1CharacterFields(): Promise<number> {
  const result = await Character.updateMany(
    { statPointsPending: { $exists: false } },
    {
      $set: {
        statPointsPending: 0,
        rank: 1,
        pc: 0,
        localStanding: [],
        job: null,
        sickDays: { week: 0, left: 2 },
        day: { settled: null },
        orders: { day: 0, items: [], allDoneAt: null },
        today: {
          day: null,
          energy: 0,
          attempts: 0,
          successes: 0,
          xp: 0,
          fxp: 0,
          iron: 0,
          pc: 0,
          opinion: 0,
          ordersDone: 0,
          shiftWorked: false,
          statTrained: 0,
        },
        lastActionAt: null,
      },
    },
    { strict: false, timestamps: false },
  );
  return result.modifiedCount;
}
