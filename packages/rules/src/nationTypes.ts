import type { DayKey } from './day';
import type { Office } from './ladder';
import type { MoraleState } from './morale';
import type { NationalPhase, TermDate } from './term';
import type { FactionId, OpinionShares } from './types';

/**
 * Slice 7 (docs/tech/slice-7.md §4.3, §6.11, §11.2): the nation's headline conditions and
 * placeholders. The views, results and errors of §8.3 and §10 are added here by T5 and filled by
 * phase B's server, as slice 6's `togetherTypes.ts`.
 */

/**
 * Tech design §11.2 (design §11.2): the personal national lines' conditions. Stored at the
 * settlement from the member's facts, except `pushed` (live, today's pushed item that counts).
 */
export type NationalCondition =
  | { kind: 'governorTookOffice' }
  | { kind: 'governorLocal' }
  | { kind: 'addressGiven' }
  | { kind: 'chairFiled' }
  | { kind: 'chairElected' }
  | { kind: 'chairLost' }
  | { kind: 'chairVoteOpened' }
  | { kind: 'deputySeated' }
  | { kind: 'listMissed' }
  | { kind: 'presidentSeated' }
  | { kind: 'presidentLost' }
  | { kind: 'pickWon' }
  | { kind: 'pickLost' }
  | { kind: 'billTabled' }
  | { kind: 'billPassed' }
  | { kind: 'billFailed' }
  | { kind: 'pledgeKept' }
  | { kind: 'petitionOpened' }
  | { kind: 'petitionFailed' }
  | { kind: 'dissolvedCouncillor' }
  | { kind: 'pushed' };

export const NATIONAL_CONDITION_KINDS = [
  'governorTookOffice',
  'governorLocal',
  'addressGiven',
  'chairFiled',
  'chairElected',
  'chairLost',
  'chairVoteOpened',
  'deputySeated',
  'listMissed',
  'presidentSeated',
  'presidentLost',
  'pickWon',
  'pickLost',
  'billTabled',
  'billPassed',
  'billFailed',
  'pledgeKept',
  'petitionOpened',
  'petitionFailed',
  'dissolvedCouncillor',
  'pushed',
] as const satisfies ReadonlyArray<NationalCondition['kind']>;

/** The national conditions that are live (selected at read), not stored at the settlement. */
export const LIVE_NATIONAL_CONDITION_KINDS = ['pushed'] as const satisfies ReadonlyArray<NationalCondition['kind']>;

const NATIONAL_KINDS = new Set<string>(NATIONAL_CONDITION_KINDS);

/** A headline template with a national condition (its placeholders are `NATION_PERSONAL_PLACEHOLDERS`). */
export const isNationTemplate = (t: { when: ReadonlyArray<{ kind: string }> }): boolean =>
  t.when.some((c) => NATIONAL_KINDS.has(c.kind));

/**
 * Tech design §4.3: the national lines' placeholders (design §11.1), resolved on the server from the
 * nation's day's facts (`nation.news`). Times travel as epoch ms for the client.
 */
export const NATIONAL_PLACEHOLDERS = [
  'president',
  'party',
  'seatsV',
  'seatsC',
  'seatsA',
  'scoreP',
  'second',
  'scoreS',
  'successor',
  'month',
  'forVotes',
  'needed',
  'law',
  'lawLine',
  'days',
  'by',
  'until',
  'weekdayPick',
  'leader',
  'leaderShare',
  'secondShare',
  'third',
  'thirdShare',
  'cityMoved',
  'lawsCount',
  'faction',
  'signatures',
  'weekday',
  'name',
  'votes',
  'secretary',
  'secretaryVotes',
  'reason',
  'noVotes',
  'cast',
  'count',
  'target',
  'place',
  'city',
] as const;
export type NationalPlaceholder = (typeof NATIONAL_PLACEHOLDERS)[number];

/** Tech design §4.3: the personal national lines' placeholders (design §11.2), from the settlement's facts. */
export const NATION_PERSONAL_PLACEHOLDERS = [
  'city',
  'local',
  'issueShort',
  'hall',
  'backers',
  'winner',
  'yourVotes',
  'ordinal',
  'seats',
  'margin',
  'score',
  'yourScore',
  'pickName',
  'orderTitle',
  // Shared with the base set: the reader, the faction, the law named in a bill line, the time tokens.
  'name',
  'faction',
  'party',
  'law',
  'place',
  'weekday',
  'until',
] as const;
export type NationPersonalPlaceholder = (typeof NATION_PERSONAL_PLACEHOLDERS)[number];

/**
 * Tech design §4.3: the slice-7 result modals' placeholders (design §12, §23.7), filled by the server
 * (`PoliticalResult` texts), on top of the slice-3 political set.
 */
export const NATION_RESULT_PLACEHOLDERS = [
  'until',
  'pollsWeekday',
  'countDay',
  'line',
  'at',
  'resultWeekday',
  'ordinance',
  'issueShort',
  'vote',
  'president',
  'needed',
  'signatures',
  'name',
  'n',
  'city',
  'event',
  'venue',
  'weekday',
  'law',
  'faction',
  'forVotes',
  'pickName',
] as const;

/** Slice 7's political acts (tech design §6.11); their texts are content (`politics.results`). */
export const NATION_ACTS = [
  'chairDeclare',
  'chairBack',
  'chairVote',
  'chairOrders',
  'partyLine',
  'partyRule',
  'fixture',
  'chairCall',
  'governorRule',
  'address',
  'presidentDeclare',
  'presidentWithdraw',
  'listDeclare',
  'pickVote',
  'nationalVote',
  'nationalBack',
  'listBack',
  'tableBill',
  'tableRemoval',
  'billVote',
  'veto',
  'petitionOpen',
  'petitionSign',
  'chairPetitionOpen',
  'chairPetitionSign',
  'confidenceVote',
] as const;
export type NationAct = (typeof NATION_ACTS)[number];

// ---------------------------------------------------------------------------------------------
// Tech design §8.3: the views phase A can pin (the calendar, the offices and the ladder, the party's
// target). The views of the desk, Parliament, the elections and the petitions are added by phase B
// with the services that build them.
// ---------------------------------------------------------------------------------------------

/** The term's line on every national screen: the phase, its end, the next date. */
export interface TermLineView {
  termIndex: number;
  termDay: number;
  phase: NationalPhase;
  /** Epoch ms of the phase's end (rendered in the player's clock), or null. */
  until: number | null;
  next: { what: TermDate; day: DayKey };
}

/** Me · an office held (screens §3). */
export interface OfficeCardView {
  office: Office;
  /** "Governor of Coalport". */
  title: string;
  until: DayKey;
  consecutive?: 1 | 2;
  pay: { pc: number; fxp: number };
  route: string;
}

/** Me · the ladder's five rows (screens §3). */
export interface LadderView {
  rows: Array<{
    office: Office;
    done: boolean;
    count?: number;
    need?: string;
    opensOn?: DayKey;
  }>;
}

/** The party's target on the desk and the Orders panel (design §4.2). */
export interface TargetBarView {
  count: number;
  target: 25 | 50 | 100;
  /** "doors". */
  unit: string;
  place: string;
  met: boolean;
}

/** The nation map's bar, the law chips, the pins' second line and the term (screens §2); phase B merges it into slice 4's `NationView`. */
export interface NationRepublicView {
  bar: { shares: Record<FactionId, number>; leader: FactionId; day: DayKey };
  laws: Array<{ lawId: string; name: string; daysLeft: number }>;
  cities: Array<{
    cityId: string;
    name: string;
    weight: number;
    unrest: boolean;
    shares: OpinionShares;
    word: 'held' | 'contested' | 'closeRace' | MoraleState;
    heldBy: FactionId | null;
  }>;
  term: TermLineView;
  act: { kind: 'vote' | 'candidates' | 'standList' | 'standPresident' | 'pick' } | null;
}
