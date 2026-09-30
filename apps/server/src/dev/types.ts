import type { MoraleState } from '@irongate/rules';

/**
 * The dev panel's wire types (memory mode only, behind E2E_TEST_HOOKS). The client imports them as
 * types (`@irongate/server/dev`); the routes exist only when the server has the test hooks on.
 */

export type DevAction = 'hour' | 'day' | 'phase' | 'boost' | 'energy';

export interface DevHomeCity {
  cityId: string;
  cityName: string;
  /** Null for a city without a council (none in slice 3: every home city has one). */
  council: {
    cycleDay: number;
    phase: 'count-day' | 'nominations' | 'polls';
    /** "Polls open (day 2 of 3)". */
    phaseLabel: string;
    next: {
      phase: 'polls' | 'count';
      /** The boundary, 00:00 UTC, epoch ms. */
      at: number;
      /** "Thursday 1 Oct 00:00 UTC". */
      atUtc: string;
    };
  } | null;
  /** The home faction's morale; null before the city is bootstrapped. */
  morale: { state: MoraleState; word: string; share: number } | null;
  /** The ordinance in force today, if any. */
  ordinance: { id: string; name: string; daysLeft: number | null } | null;
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
  /** The signed-in player's character, or null (signed out, or still arriving). */
  character: { name: string; rank: number; pc: number; energy: number; energyMax: number } | null;
  home: DevHomeCity | null;
}

export interface DevActionResult {
  /** One line for the panel: "Now Thursday 1 Oct 00:01 UTC · polls open in Coalport". */
  line: string;
  status: DevStatus;
}
