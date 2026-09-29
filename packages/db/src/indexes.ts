import { ActionLog } from './models/actionLog';
import { Character } from './models/character';
import { City } from './models/city';

export const models = [Character, City, ActionLog] as const;

/**
 * Create our collections and bring their indexes in line with the schemas. Run at start-up
 * (autoIndex is off) and before tests: collections must exist before the first transaction
 * touches them, and the unique indexes are what make actions idempotent.
 */
export async function ensureIndexes(): Promise<void> {
  for (const m of models) {
    await m.createCollection();
    await m.syncIndexes();
  }
}
