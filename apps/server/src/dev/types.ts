import type { HeatState, MoraleState, RecordLevel, RuleHow } from '@irongate/rules';

/**
 * The dev panel's wire types (memory mode only, behind E2E_TEST_HOOKS). The client imports them as
 * types (`@irongate/server/dev`); the routes exist only when the server has the test hooks on.
 */

/**
 * Slice 4 (tech design §8.7): `arrive` (Arrive now, on a train), `monday` (Next Monday), `level10`
 * (Level 10, and Rank 2 if below), `irongate` (Take me to Irongate: no ticket, no card), `live`
 * (Live in… a capital district or `home`; the body's `target`).
 */
export type DevAction =
  | 'hour'
  | 'day'
  | 'phase'
  | 'boost'
  | 'energy'
  | 'arrive'
  | 'monday'
  | 'level10'
  | 'irongate'
  | 'live'
  // Slice 5 (tech design §8.6). `heat` (target 0..100), `health` (`full`, `half` or a value),
  // `record` (a number of marks, today's minor ones; 0 is clean), `runIn` (`off`, `random` or an
  // opponent id), `caught` (the next act is caught), `cells` / `infirmary` (sent now), `release`
  // (while held), `decide` (while a run-in is pending), `level6`, `rank3`, `goto` (target: a rival
  // home city; no ticket, no card), `unbar` (Lift the bar).
  | 'heat'
  | 'health'
  | 'record'
  | 'runIn'
  | 'caught'
  | 'cells'
  | 'infirmary'
  | 'release'
  | 'decide'
  | 'level6'
  | 'rank3'
  | 'goto'
  | 'unbar'
  // Review 5 (ADR 0079): `dusk` moves the clock a minute past the next dusk.
  | 'dusk'
  // Review 5 (ADR 0081): `patrol` (target `next`, `never` or `auto`): the caller's patrol mode.
  | 'patrol'
  // Review 5 (ADR 0082): `unrest` (target: a rival home city): the caller pushes it into Unrest
  // (1.8 points in their name, the home share to 58); the prize is decided at the next day's turn.
  | 'unrest'
  // The voting rework (tech design §12): `seat` (*Seat me*: the lowest-ranked local seat of the
  // residence's sitting council), `townVotes` (*Votes for card 2 × 3*, days 2–4).
  | 'seat'
  | 'townVotes'
  // Slice 6 (tech design §8.7): `members` (three test members here), `fillEvent` (target `roles` or
  // `hands`: test members onto my soonest open event), `startEvent` (my soonest event starts now),
  // `rolls` (target `success`, `failure` or `random`: my soonest event's next rolls),
  // `memberCells` / `memberWard` (a test member sent), `memberSays` (a test member's chat line),
  // `chatReset` (my chat limits cleared).
  | 'members'
  | 'fillEvent'
  | 'startEvent'
  | 'rolls'
  | 'memberCells'
  | 'memberWard'
  | 'memberSays'
  | 'chatReset'
  // Review 7: `iron` (*Give 2,000 Iron*), so bail can be tested without the console.
  | 'iron'
  // Slice 7 (tech design §8.7): `termDay` (target 0, 9, 11, 14, 19, 21, 23, 27), `office` (target
  // governor, chair, deputy, president), `ladder` (a council, a Governor's and a deputy's term
  // completed), `secretaryBill` (the Monday bills now), `deputies` (three test deputies),
  // `deputiesVote` (target for, against: the test deputies on the newest open bill), `lead` (the
  // caller's party leads by ten at the next boundary).
  | 'termDay'
  | 'office'
  | 'ladder'
  | 'secretaryBill'
  | 'deputies'
  | 'deputiesVote'
  | 'lead'
  // Phase C, lane Y: three test members sign the residence's dissolve petition, back the caller for
  // Chair, vote for the caller as Chair, vote for the caller's party for President, sign the petition
  // on the Chair.
  | 'residentsSign'
  | 'chairBackers'
  | 'chairVotes'
  | 'nationVotes'
  | 'chairPetitionSign'
  // Slice 8 phase B, lane 2 (tech design §8.7): *Three entries on a rival name*, *Make it stale*,
  // *Next tap lands an entry*, *A Case File now*, *Rent due today*, *Rent ran out*, *Give me 20 Legacy*.
  | 'dossierThree'
  | 'dossierStale'
  | 'dossierNext'
  | 'dossierFile'
  | 'rentToday'
  | 'rentOut'
  | 'legacy20'
  // Lane 1's (tech design §8.7, §24.9): the Wardrobe, someone to walk with you, the bar.
  | 'partyCoat'
  | 'greatcoatHat'
  | 'pressKit'
  | 'forgedPapers'
  | 'doorman'
  | 'steward'
  | 'minder'
  | 'minderLastDay'
  | 'minderLapse'
  | 'wellFed5'
  | 'spirits9'
  | 'roundsUsed';

/** Slice 8 phase B, lane 2 (tech design §8.7): the Dossier's used / cap and the last roll, the flat, Legacy. */
export interface DevLifeStatus {
  /** Worn Charisma (with the flat's +2 here) and recognition here (the figure and its parts). */
  worn: { cha: number; chaBase: number; recognition: Record<string, unknown> };
  bodyguard: { tier: 1 | 2 | 3; name: string; paidThroughDay: number; power: number } | null;
  buffs: { wellFed: { tier: 'plate' | 'dinner'; minutesLeft: number } | null; spirits: number; rounds: number };
  dossier: { used: number; cap: number; lastRoll: { chance: number; roll: number; landed: boolean; source: string; at: number } | null };
  flat: { cityId: string; paidThroughDay: number; state: 'paid' | 'due' | 'waiting'; counts: boolean } | null;
  legacy: { total: number; toSpend: number };
}

/** Slice 7 (tech design §8.7): the status's nation block. */
export interface DevNationStatus {
  termIndex: number;
  termDay: number;
  phase: string;
  leader: string;
  government: string;
  laws: string[];
  bills: string[];
  chair: string | null;
  orders: string | null;
  offices: string[];
}

/** Slice 5 (tech design §8.6): the street force set for the caller's next act (`POST /api/test/street`). */
export interface DevStreetForce {
  runIn?: 'next' | 'never';
  opponentId?: string;
  checkRoll?: number;
  choiceRoll?: number;
  caught?: 'always' | 'never';
  /** Review 5: each row's check roll, for any act. */
  rolls?: number[];
}

/** Slice 5 (tech design §8.6): the status's risk block, read from the stored character. */
export interface DevRisk {
  level: number;
  /** `coolBy`: when Heat is under 25 again (null while Cool). */
  heat: { value: number; state: HeatState; coolBy: number | null; coolByUtc: string | null };
  health: { value: number; max: number };
  /** `fadesOn`: the City Day the live minor marks fade, or null. */
  record: { level: RecordLevel; marks: number; fadesOn: number | null; fadesOnUtc: string | null };
  /** `bail`: the bail asked (Iron), null on the ward. */
  held: {
    kind: 'cells' | 'infirmary';
    state: 'in' | 'out';
    placeName: string;
    minutesLeft: number;
    bail: number | null;
  } | null;
  runIn: { state: 'pending' | 'resolved'; opponent: string; decidesAt: number; decidesAtUtc: string } | null;
  /** Today's flags in the city the character is in. */
  flags: Array<'watched' | 'warned'>;
  barred: Array<{ cityId: string; cityName: string; until: number; untilUtc: string }>;
  /** The rival pressure of the city the character is in (points lost to rivals today, of the cap); null outside a home city. */
  pressure: {
    cityName: string;
    homeFaction: string;
    rivalGround: boolean;
    lostToday: number;
    cap: number;
  } | null;
  /** What the next act is forced to, or null. */
  street: DevStreetForce | null;
  /** The two rival home cities (*Take me to…*). */
  rivalHomes: Array<{ cityId: string; cityName: string }>;
  /** The six opponents (*Next run-in*). */
  opponents: Array<{ id: string; label: string }>;
}

export interface DevHomeCity {
  cityId: string;
  cityName: string;
  /** Null for a city without a council (none in slice 3: every home city has one). */
  council: {
    cycleDay: number;
    phase: 'result-day' | 'standing' | 'vote';
    /** "The vote (day 2 of 3)". */
    phaseLabel: string;
    next: {
      phase: 'vote' | 'count';
      /** The boundary, 00:00 UTC, epoch ms. */
      at: number;
      /** "Thursday 1 Oct 00:00 UTC". */
      atUtc: string;
    };
  } | null;
  /** The home faction's morale; null before the city is bootstrapped. */
  morale: { state: MoraleState; word: string; share: number } | null;
  /** The rule in force today, if any, and how it won (null: not decided by a rule ballot). */
  ordinance: { id: string; name: string; daysLeft: number | null; how: RuleHow | null } | null;
  /** The voting rework (tech design §12): this cycle's ballot, its status and its cards (names). */
  ballot: { status: 'open' | 'set' | 'counted'; cards: string[] } | null;
}

export interface DevStatus {
  /** Always true: the route does not exist otherwise. */
  hooks: true;
  /** Slice 6 (tech design §8.7): open sign-ups, events here, today's fixture, unseen results, chat, presence. */
  together?: DevTogetherStatus | null;
  /** Slice 7 (tech design §8.7): the term, the republic, the offices, the laws, the bills (null before the bootstrap). */
  nation?: DevNationStatus | null;
  /** Slice 8 (tech design §8.7): a life in the city (lane 2's part). */
  life?: DevLifeStatus | null;
  /** The shared test clock, epoch ms. */
  now: number;
  /** "Thursday 1 Oct 00:01 UTC". */
  utc: string;
  /** How far the test clock is ahead of the real one. */
  offsetMs: number;
  /** The City Day key (whole days since 1970-01-01, 00:00 UTC boundary). */
  cityDay: number;
  /** Review 5 (ADR 0079): the town's night now, the next dusk and dawn, and the seam's test mode. */
  night: {
    night: boolean;
    nextDusk: number;
    nextDuskUtc: string;
    nextDawn: number;
    nextDawnUtc: string;
    mode: 'clock' | 'day' | 'night';
    /** Review 5 (ADR 0080): a tier-1 tap's run-in chance here and now on rival ground; null elsewhere. */
    tapRunIn: number | null;
  };
  /**
   * Review 5 (ADR 0081): the night patrol where the character stands: the mode, the chance of a roll
   * (null off rival ground), the last bucket rolled here tonight, the stops, the quiet and the card.
   */
  patrol?: {
    mode: string;
    chance: number | null;
    lastRollAt: number | null;
    stops: number;
    quietUntil: number | null;
    quietUntilUtc: string | null;
    card: string | null;
  } | null;
  /** The signed-in player's character, or null (signed out, or still arriving). */
  character: { name: string; rank: number; pc: number; energy: number; energyMax: number } | null;
  home: DevHomeCity | null;
  /** Slice 4: where the character is (a city, or a train with the minutes left). */
  where:
    | { cityId: string; cityName: string }
    | { train: { to: string; toName: string; minutesLeft: number } }
    | null;
  /** Slice 4: where the character lives, and the windows (weekday names). */
  residence: {
    cityName: string;
    districtName: string | null;
    votesFrom: string;
    standsFrom: string;
    canMoveFrom: string;
  } | null;
  /** Slice 5: Heat, Health, the record, held, the run-in, flags, bars, the rival pressure. */
  risk: DevRisk | null;
  /** Slice 4: the capital's five districts (shares, close race, comeback). */
  capital: Array<{
    id: string;
    name: string;
    shares: { vanguard: number; collective: number; alliance: number; neutral: number };
    closeRace: boolean;
    comeback: string | null;
  }>;
  /** Slice 4: the residence city's Issues this week with their points. */
  issues: Array<{
    name: string;
    placeName: string;
    momentum: { vanguard: number; collective: number; alliance: number };
  }>;
}

export interface DevActionResult {
  /** One line for the panel: "Now Thursday 1 Oct 00:01 UTC · polls open in Coalport". */
  line: string;
  status: DevStatus;
}

/** Slice 6 (tech design §8.7): the dev panel's together lines. */
export interface DevTogetherStatus {
  signups: Array<{ eventId: string; slot: string; startsAt: number }>;
  eventsHere: Array<{ id: string; kind: string; typeId: string; startsAt: number; filled: number; roles: number; hands: number }>;
  fixtureToday: string | null;
  unseenResults: number;
  chat: { recent: number; lastAt: number | null; forYou: number };
  presence: { seenAt: number | null; locationId: string | null };
}
