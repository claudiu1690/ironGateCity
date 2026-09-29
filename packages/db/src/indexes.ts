import { getContent } from '@irongate/content';
import type { Content } from '@irongate/content';
import { migrateSlice1CharacterFields } from './migrations/001-slice1-character-fields';
import { migrateSlice2Arrival } from './migrations/002-slice2-arrival';
import { ActionLog } from './models/actionLog';
import { Arrival } from './models/arrival';
import { Character } from './models/character';
import { City } from './models/city';
import { PaperEntry } from './models/paperEntry';
import { RequestLog } from './models/requestLog';

export const models = [Character, City, ActionLog, PaperEntry, RequestLog, Arrival] as const;

/**
 * Create our collections, bring their indexes in line with the schemas and run the (idempotent)
 * migrations. Run at start-up (autoIndex is off) and before tests: collections must exist before the
 * first transaction touches them, and the unique indexes are what make writes idempotent.
 */
export async function ensureIndexes(
  content: Pick<Content, 'origin' | 'factions'> = getContent(),
): Promise<void> {
  for (const m of models) {
    await m.createCollection();
    await m.syncIndexes();
  }
  await migrateSlice1CharacterFields();
  // Slice 2 (ADR 0016): after 001, so slice-0 characters get both.
  await migrateSlice2Arrival(content);
}
