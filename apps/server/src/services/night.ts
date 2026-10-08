import { isNight, nextDawn, nextDusk } from '@irongate/rules';
import type { NightView } from '@irongate/rules';

export type { NightView };

/** Review 5 (ADR 0079): how the seam reads the night. `clock` in production; the others pin it. */
export type NightMode = 'clock' | 'day' | 'night';

/**
 * Test only (ADR 0079): production never writes it. The server's Vitest setup pins `day`; under
 * `E2E_TEST_HOOKS` the env `E2E_NIGHT` (Playwright: `day`) or `POST /api/test/night` sets it.
 */
export const nightHooks: { mode: NightMode } = { mode: 'clock' };

/**
 * Review 5 (ADR 0079, tech design §3.2): the server's one seam for the town's night. Every reader
 * (the views, the art pickers, the run-in and the mission risk at the act, and later the patrol, the
 * Curfew and recognition) asks here with its own `now`. `changesAt` is the next dusk or dawn on the
 * clock, and null while a test pins the night.
 */
export function nightAt(now: number): NightView {
  const dusk = nextDusk(now);
  const dawn = nextDawn(now);
  if (nightHooks.mode !== 'clock') {
    return { night: nightHooks.mode === 'night', nextDusk: dusk, nextDawn: dawn, changesAt: null };
  }
  const night = isNight(now);
  return { night, nextDusk: dusk, nextDawn: dawn, changesAt: night ? dawn : dusk };
}
