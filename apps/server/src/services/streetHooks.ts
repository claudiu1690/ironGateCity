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
  /**
   * Review 5 (tech design §4.3): each row's check roll (1..100), for any act while hooks are on, home
   * tier 1 included (`checkRoll` covers only missions and rival taps). Consumed once like the rest.
   */
  rolls?: number[];
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
  /**
   * Review 5: an act that reads only the rows' rolls (a tier-1 tap at home) takes `rolls` and leaves
   * the rest of the force for the next act on rival ground or the next mission.
   */
  takeRolls(characterId: string, idempotencyKey?: string): StreetForce | null {
    if (!streetHooks.enabled) return null;
    const tap = idempotencyKey ? `${characterId}|${idempotencyKey}` : null;
    if (tap && byTap.has(tap)) return byTap.get(tap) ?? null;
    const f = pending.get(characterId);
    const taken = f?.rolls ? { rolls: f.rolls } : null;
    if (f?.rolls) {
      const { rolls: _r, ...rest } = f;
      if (Object.keys(rest).length > 0) pending.set(characterId, rest);
      else pending.delete(characterId);
    }
    if (tap) {
      byTap.set(tap, taken);
      if (byTap.size > TAPS_KEPT) byTap.delete(byTap.keys().next().value!);
    }
    return taken;
  },
  peek(characterId: string): StreetForce | null {
    return streetHooks.enabled ? (pending.get(characterId) ?? null) : null;
  },
  clear(): void {
    pending.clear();
    byTap.clear();
  },
};
