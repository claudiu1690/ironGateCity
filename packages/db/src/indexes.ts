import { getContent } from '@irongate/content';
import type { Content } from '@irongate/content';
import { migrateSlice1CharacterFields } from './migrations/001-slice1-character-fields';
import { migrateSlice2Arrival } from './migrations/002-slice2-arrival';
import { migrateSlice3Politics } from './migrations/003-slice3-politics';
import { migrateReview1Wage } from './migrations/004-review1-wage';
import { migrateReview2StreetOrdinances } from './migrations/005-review2-street-ordinances';
import { migrateSlice4TravelResidence } from './migrations/006-slice4-travel-residence';
import { migrateSlice5Risk } from './migrations/007-slice5-risk';
import { migrateReview4 } from './migrations/008-review4';
import type { Review4Counts, StepCounts } from './migrations/008-review4';
import { migrateVotingRework } from './migrations/009-voting-rework';
import { migrateSlice6Together } from './migrations/010-slice6-together';
import { migrateSlice7Nation } from './migrations/011-slice7-nation';
import { migrateSlice8Life } from './migrations/012-slice8-life';
import { DossierEntry } from './models/dossier';
import { LegacyEntry } from './models/legacy';
import { Bill, FactionElection, FactionState, LawModel, Nation, NationalElection, Petition } from './models/nation';
import type { StepCounts as Slice6Counts } from './migrations/008-review4';
import { CampaignEvent, EventSignup } from './models/campaignEvent';
import { ChatLimit, ChatMessage, ChatReport } from './models/chat';
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
import { Candidacy, Election, OfficeTerm, RuleBallot, Vote } from './models/politics';
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
  RuleBallot,
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
  // Slice 6 (tech design §5): events, sign-ups and chat.
  CampaignEvent,
  EventSignup,
  ChatMessage,
  ChatReport,
  ChatLimit,
  // Slice 7 (tech design §5): the nation's seven collections.
  Nation,
  FactionState,
  FactionElection,
  NationalElection,
  Bill,
  LawModel,
  Petition,
  // Slice 8 (tech design §5): the Dossier and Legacy (the season's collection is deferred).
  DossierEntry,
  LegacyEntry,
] as const;

/**
 * Create our collections, bring their indexes in line with the schemas and run the (idempotent)
 * migrations. Run at start-up (autoIndex is off) and before tests: collections must exist before the
 * first transaction touches them, and the unique indexes are what make writes idempotent.
 */
export async function ensureIndexes(
  content: Pick<Content, 'origin' | 'factions' | 'cities'> = getContent(),
): Promise<{
  review4: Review4Counts;
  votingRework: { refunds: StepCounts };
  slice6: { characters: Slice6Counts; factionScopes: Slice6Counts };
  slice7: Awaited<ReturnType<typeof migrateSlice7Nation>>;
  slice8: Awaited<ReturnType<typeof migrateSlice8Life>>;
}> {
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
  // Review 4 (tech design §14): one step per feature, filled phase by phase; after 007.
  // Review 4 (T29): the counts are returned for the start-up log (a second run modifies nothing).
  const review4 = await migrateReview4(content);
  // The voting rework (tech design §6.2, ADR 0086): the deposits still due are credited once; after 008.
  const votingRework = await migrateVotingRework();
  // Slice 6 (tech design §5.6): presence, events, chat and the scoreboard's faction scopes; after 009.
  const slice6 = await migrateSlice6Together();
  // Slice 7 (tech design §5.10): office and candidacy kinds, term backings; after 010.
  const slice7 = await migrateSlice7Nation();
  // Slice 8 (tech design §5.7, §24.4): the Wardrobe's sets and the life fields, milestones, the
  // Legacy backfill; after 011.
  const slice8 = await migrateSlice8Life(content);
  return { review4, votingRework, slice6, slice7, slice8 };
}
