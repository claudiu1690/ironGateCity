import { migrateSlice1CharacterFields } from './migrations/001-slice1-character-fields';
import { ActionLog } from './models/actionLog';
import { Character } from './models/character';
import { City } from './models/city';
import { PaperEntry } from './models/paperEntry';
import { RequestLog } from './models/requestLog';

export const models = [Character, City, ActionLog, PaperEntry, RequestLog] as const;

/**
 * Create our collections, bring their indexes in line with the schemas and run the (idempotent)
 * migrations. Run at start-up (autoIndex is off) and before tests: collections must exist before the
 * first transaction touches them, and the unique indexes are what make writes idempotent.
 */
export async function ensureIndexes(): Promise<void> {
  for (const m of models) {
    await m.createCollection();
    await m.syncIndexes();
  }
  await migrateSlice1CharacterFields();
}
