import type { MissionType } from './constants';
import type { OrderMatch } from './types';

/**
 * Slice 8 (docs/tech/slice-8.md §6.12, §11.2): the shared types of a life in the city. The
 * Political Season's are deferred (16 Oct 2026): the conditions `seasonWeek`, `seasonCountdown`
 * and `seasonFront` and the ids `nl.season-*` are reserved, not defined.
 */

/** Tech design §11.2: the personal lines' conditions; `requestArrived` is live, the rest stored. */
export const LIFE_CONDITION_KINDS = [
  'coatBought',
  'exposePrinted',
  'exposeP3',
  'exposeSpiked',
  'caseFileMade',
  'staleTomorrow',
  'requestArrived',
  'requestThanks',
  'patronTier',
  'informantReport',
  'flatBought',
  'flatDue',
  'flatWaiting',
  'legacyEntry',
  'recognised',
  // Tech design §24.5 (ADR 0088): the bodyguard's last day, and gone this morning.
  'bodyguardLast',
  'bodyguardGone',
] as const;
export type LifeConditionKind = (typeof LIFE_CONDITION_KINDS)[number];
export type LifeCondition = { kind: LifeConditionKind };
export const LIVE_LIFE_CONDITION_KINDS = ['requestArrived'] as const satisfies readonly LifeConditionKind[];

/**
 * Design §5.3 (ADR 0055): a patron's Request matches with the orders' DSL, without the rival-ground
 * exclusion, plus mission types and `districtId: 'rotate'` (the Request's own district).
 */
export interface RequestMatch extends OrderMatch {
  missionTypes?: MissionType[];
}

/** Tech design §6.12: a life in the city's political result modals (their texts are copy). */
export const LIFE_ACTS = [
  'bought',
  'sold',
  'markBought',
  'caseFile',
  'dossierSold',
  'informant',
  'gift',
  'patronFavour',
  'flatBought',
  'rentPaid',
  'perk',
  // Tech design §24.7 (ADR 0088): bodyguards and the bar.
  'hired',
  'renewed',
  'round',
  'meal',
  'dinner',
] as const;
export type LifeAct = (typeof LIFE_ACTS)[number];

/** Tech design §10.3: the knock-on lines a life in the city adds to existing modals. */
export const LIFE_KNOCK_ON_KINDS = ['dossier', 'favour', 'legacy', 'keepsake', 'recognised'] as const;
export type LifeKnockOnKind = (typeof LIFE_KNOCK_ON_KINDS)[number];

/** Tech design §10.2: the exposé's stamp on the story modal. */
export type ExposeStamp = 'printed' | 'pageThree' | 'spiked';

/** Tech design §5.1: where an entry came from. */
export const DOSSIER_SOURCES = [
  'intelligence',
  'surveillance',
  'theft',
  'informer',
  'cells',
  'ward',
  'society',
  'gossip',
  'informant',
  'chapter',
  'morgue',
  'test',
] as const;
export type DossierSource = (typeof DOSSIER_SOURCES)[number];
export type DossierStatus = 'held' | 'bound' | 'attached' | 'informant' | 'spent' | 'sold';
