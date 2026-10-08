import { nightHooks } from '../src/services/night';

/**
 * Review 5 (ADR 0079): the server tests run with the town held at day. Their clocks start at 09:00
 * UTC and cross 10:00 (a dusk now), so night rules (the run-in on rival ground, later the patrol)
 * would change their meaning; night tests opt into `clock` with a seeded night time and restore it.
 */
nightHooks.mode = 'day';
