/**
 * Slice 5 (tech design §8.5): the street's test hooks. With `E2E_TEST_HOOKS` (memory mode only) the
 * app enables them and `POST /api/test/street` sets what the caller's **next** act (a mission or a
 * tap on rival ground) uses: the run-in forced on or off, the opponent, the check's roll, the
 * choice's first roll, the caught check. Consumed once, before the act's transaction (so a retried
 * transaction keeps it). Off, `take` always returns null: production never reads the map.
 */
export interface StreetForce {
  runIn?: 'next' | 'never';
  opponentId?: string;
  /** 1..100: the check's (first row's) roll. */
  checkRoll?: number;
  /** 1..100: the run-in choice's first roll. */
  choiceRoll?: number;
  caught?: 'always' | 'never';
}

const pending = new Map<string, StreetForce>();
/**
 * The force each tap (character and idempotency key) took, so every concurrent or retried copy of
 * one tap resolves under the same force: without it the first copy takes the hooks and its twin rolls
 * freely, and whichever commits first decides the answer both get (a pending run-in, say).
 */
const byTap = new Map<string, StreetForce | null>();
const TAPS_KEPT = 500;

export const streetHooks = {
  enabled: false,
  set(characterId: string, force: StreetForce): void {
    pending.set(characterId, { ...(pending.get(characterId) ?? {}), ...force });
  },
  /** The force for the caller's next act, removed (null when none, or when the hooks are off). */
  take(characterId: string, idempotencyKey?: string): StreetForce | null {
    if (!streetHooks.enabled) return null;
    const tap = idempotencyKey ? `${characterId}|${idempotencyKey}` : null;
    if (tap && byTap.has(tap)) return byTap.get(tap) ?? null;
    const f = pending.get(characterId) ?? null;
    pending.delete(characterId);
    if (tap) {
      byTap.set(tap, f);
      if (byTap.size > TAPS_KEPT) byTap.delete(byTap.keys().next().value!);
    }
    return f;
  },
  peek(characterId: string): StreetForce | null {
    return streetHooks.enabled ? (pending.get(characterId) ?? null) : null;
  },
  clear(): void {
    pending.clear();
    byTap.clear();
  },
};
