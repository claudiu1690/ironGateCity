import type { DossierCategory, PatronId } from './constants';
import type { DayKey } from './day';
import type { ExposeStamp } from './lifeTypes';
import type { PerkId } from './legacy';
import type { AssetView, FactionId, Outcome } from './types';

/**
 * Slice 8 phase B, lane 2 (docs/tech/slice-8.md §8.3, §10): the Dossier's, the exposé's, the home's
 * and Legacy's views and knock-on lines. Built by the server; the client renders words, never a
 * chance. The Wardrobe's, the shops' and the patrons' views are lane 1's.
 */

/** Tech design §10.3: *Dossier: an entry on Josef Baum · political · goes stale Thursday*. */
export interface DossierKnock {
  subjectId: string;
  name: string;
  category: DossierCategory;
  staleOn: DayKey;
  /** *Dossier full · an entry went begging*. */
  refused: boolean;
  /** The worded line. */
  line: string;
  /** Dev and QA only (the client never shows a chance). */
  dev?: { chance: number; roll: number; source: string };
}

/** Tech design §10.3: *Legacy +2 · An exposé printed*. */
export interface LegacyKnock {
  kind: string;
  points: number;
  total: number;
  line: string;
}

export interface DossierEntryView {
  id: string;
  category: DossierCategory;
  /** The filled line. */
  line: string;
  source: string;
  day: DayKey;
  staleOn: DayKey;
  fresh: boolean;
}

export interface DossierNameView {
  subjectId: string;
  name: string;
  factionId: FactionId | null;
  city: string;
  district: string | null;
  /** Fresh 1, stale ½. */
  weight: number;
  /** Three marks toward a Case File. */
  clock: Array<'fresh' | 'stale' | 'empty'>;
  canBind: boolean;
  why: string | null;
  burned: { until: DayKey } | null;
  entries: DossierEntryView[];
}

export interface DossierFileView {
  id: string;
  subjectId: string;
  name: string;
  factionId: FactionId | null;
  city: string;
  kinds: DossierCategory[];
  lines: string[];
  weight: number;
  status: 'held' | 'attached';
  print: { ok: boolean; why: string | null; nearest: { locationId: string; name: string } | null };
  sell: { value: number; nearest: { locationId: string; name: string } | null };
  turn: { ok: boolean; why: string | null };
}

export interface DossierInformantView {
  id: string;
  name: string;
  city: string;
  daysLeft: number;
  next: DayKey | null;
  /** The last report's line (*{line} · {subject} · {weekday}*), or null before the first. */
  last: string | null;
}

export interface DossierView {
  used: number;
  cap: number;
  fresh: number;
  stale: number;
  files: number;
  full: boolean;
  header: string;
  /** Entries whose last fresh day is today (*n go stale tomorrow*). */
  staleTomorrow: number;
  names: DossierNameView[];
  caseFiles: DossierFileView[];
  informants: DossierInformantView[];
  /** The tab's dot (an entry landed since the tab was last opened). */
  dot: boolean;
  /** Lane Q (screens §6.1): the header band's picture (`scene.newsroom`). */
  art?: AssetView;
}

/** A station's card (screens §6.3): what can be sold here. */
export interface StationCardView {
  kicker: string;
  line: string;
  rows: Array<{ id: string; kind: 'entry' | 'file'; name: string; line: string; price: number }>;
}

/** The exposé's screen (ADR 0054, 0013): step 1 (the file and the angle) or step 2 (the ways). */
export interface ExposeView {
  step: 1 | 2;
  locationId: string;
  paper: string;
  kicker: string;
  title: string;
  /** Step 1: the files that qualify. */
  files: Array<{ id: string; name: string; party: string; lines: number; weight: number }>;
  angles: Array<{ id: 'plain' | 'headline'; text: string; hint: string }>;
  /** Step 2: the chosen file and angle, the three ways with odds words. */
  chosen: { fileId: string; name: string; angle: 'plain' | 'headline' } | null;
  ways: Array<{ id: 'write' | 'talk' | 'legwork'; text: string; odds: string }>;
  cta: { label: string; energy: number; ok: boolean; why: string | null } | null;
  /** A refusal for the whole screen (no file, printed today, own party …), worded. */
  refusal: string | null;
  /** Lane Q (screens §7): the press's scene and the step's text. */
  art?: AssetView;
  narrative?: string;
}

/** The exposé's part of an `ActionResult` (tech design §10.2). */
export interface ExposeOutcome {
  stamp: ExposeStamp;
  outcome: Outcome;
  subjectId: string;
  subject: string;
  partyId: FactionId;
  angle: 'plain' | 'headline';
  fileKept: boolean;
  swing: { placeId: string; placeName: string; amount: number; mode: 'toNeutral' | 'against'; capped: boolean } | null;
  pc: number;
  legacy: LegacyKnock | null;
  lines: string[];
  /** The paper's fills (tech design §11.1): the file's first two lines, the town, the author. */
  printed: { author: string; line1: string; line2: string; city: string };
}

export interface HomeView {
  sleep: 'room' | 'flat';
  line: string;
  flat: {
    cityId: string;
    cityName: string;
    paidThrough: DayKey;
    state: 'paid' | 'due' | 'waiting';
    counts: boolean;
    livesIn: string | null;
  } | null;
  buy: { ok: boolean; why: 'level' | 'notHere' | 'iron' | null; cost: number; city: string } | null;
  rent: { week: number; four: number; ok: { week: boolean; four: boolean } };
}

export interface LegacyView {
  total: number;
  toSpend: number;
  line: string;
  entries: Array<{ words: string; day: DayKey; points: number }>;
  perks: Array<{ id: PerkId; name: string; line: string; cost: number; taken: number; max: number; state: 'take' | 'needs' | 'taken' }>;
}

/** The paper's life rows (design §10.2, §10.3), stored on the edition at the settlement. */
export interface LifeDesk {
  dossier: string | null;
  patrons: string | null;
  sleep: string | null;
  legacy: string | null;
  ahead: string[];
}

export interface LifeLetter {
  kind: 'request' | 'informant' | 'gossip';
  from: string;
  title: string;
  line: string;
  patronId?: PatronId;
}
