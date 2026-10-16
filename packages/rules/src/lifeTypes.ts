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
