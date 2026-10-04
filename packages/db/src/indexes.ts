import { getContent } from '@irongate/content';
import type { Content } from '@irongate/content';
import { migrateSlice1CharacterFields } from './migrations/001-slice1-character-fields';
import { migrateSlice2Arrival } from './migrations/002-slice2-arrival';
import { migrateSlice3Politics } from './migrations/003-slice3-politics';
import { migrateReview1Wage } from './migrations/004-review1-wage';
import { migrateReview2StreetOrdinances } from './migrations/005-review2-street-ordinances';
import { migrateSlice4TravelResidence } from './migrations/006-slice4-travel-residence';
import { migrateSlice5Risk } from './migrations/007-slice5-risk';
import { ActionLog } from './models/actionLog';
import { Arrival } from './models/arrival';
import { Character } from './models/character';
import { City } from './models/city';
import { District } from './models/district';
import { Encounter } from './models/encounter';
import { IssueModel } from './models/issue';
import { Journey } from './models/journey';
import { Award, Contribution, InfluenceLedger } from './models/ledger';
import { PaperEntry } from './models/paperEntry';
import { Candidacy, Election, OfficeTerm, OrderPaper, Vote } from './models/politics';
import { RequestLog } from './models/requestLog';
import { Stay } from './models/stay';

export const models = [
  Character,
  City,
  ActionLog,
  PaperEntry,
  RequestLog,
  Arrival,
  // Slice 3 (ADR 0020): transactions need the collections to exist.
  Election,
  Candidacy,
  Vote,
  OfficeTerm,
  OrderPaper,
  // Slice 4 (tech design §5): the six new collections.
  Journey,
  District,
  InfluenceLedger,
  Contribution,
  IssueModel,
  Award,
  // Slice 5 (tech design §5.2, §5.3): run-ins and stays.
  Encounter,
  Stay,
] as const;

/**
 * Create our collections, bring their indexes in line with the schemas and run the (idempotent)
 * migrations. Run at start-up (autoIndex is off) and before tests: collections must exist before the
 * first transaction touches them, and the unique indexes are what make writes idempotent.
 */
export async function ensureIndexes(
  content: Pick<Content, 'origin' | 'factions' | 'cities'> = getContent(),
): Promise<void> {
  for (const m of models) {
    await m.createCollection();
    await m.syncIndexes();
  }
  await migrateSlice1CharacterFields();
  // Slice 2 (ADR 0016): after 001, so slice-0 characters get both.
  await migrateSlice2Arrival(content);
  // Slice 3: after 002.
  await migrateSlice3Politics();
  // Review 1: jobs become a wage; after 003 (renames the Shift Hours Order it seeded).
  await migrateReview1Wage();
  // Review 2: the Ward Register and the Ward Fund become the Street Register and the Street Fund.
  await migrateReview2StreetOrdinances();
  // Slice 4: residence, journeys, the place of elections and terms; after 005.
  await migrateSlice4TravelResidence(content);
  // Slice 5: Heat, Health, the record and the run-in state; the districts' leader; after 006.
  await migrateSlice5Risk();
}
