import { Character } from '../models/character';

/**
 * Slice 3 (tech design §5.9): characters get the two embedded political fields. Idempotent: only
 * documents without `offices` are touched. Cities are not migrated: they bootstrap lazily on their
 * first city day (ADR 0017).
 */
export async function migrateSlice3Politics(): Promise<number> {
  const result = await Character.updateMany(
    { offices: { $exists: false } },
    { $set: { offices: [], endorsementsGiven: [] } },
    { strict: false, timestamps: false },
  );
  return result.modifiedCount;
}
