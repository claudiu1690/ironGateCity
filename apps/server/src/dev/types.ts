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
  | 'townVotes';

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
