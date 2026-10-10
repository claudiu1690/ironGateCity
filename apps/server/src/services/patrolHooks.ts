/**
 * Review 5 (ADR 0081, tech design §8.3): the patrol's test hooks, the `streetHooks` pattern. With
 * `E2E_TEST_HOOKS` (memory mode only) the app enables them: `E2E_PATROL` sets the mode at start-up
 * (Playwright `never`; `pnpm dev:mem` leaves it unset, `auto`) and `POST /api/test/patrol` sets it for
 * the caller. `next` forces the caller's next eligible roll to hit and is consumed by that roll;
 * `never` skips every roll. Off, `mode` is always `auto`: production never reads the map.
 */
export type PatrolMode = 'next' | 'never' | 'auto';

const byCharacter = new Map<string, PatrolMode>();

export const patrolHooks = {
  enabled: false,
  /** The mode for every character without one of its own. */
  base: 'auto' as Exclude<PatrolMode, 'next'>,
  set(characterId: string, mode: PatrolMode): void {
    byCharacter.set(characterId, mode);
  },
  mode(characterId: string): PatrolMode {
    if (!patrolHooks.enabled) return 'auto';
    return byCharacter.get(characterId) ?? patrolHooks.base;
  },
  /** A forced roll landed: `next` is spent (the character goes back to the base mode). */
  spend(characterId: string): void {
    if (byCharacter.get(characterId) === 'next') byCharacter.delete(characterId);
  },
  clear(): void {
    byCharacter.clear();
  },
};
