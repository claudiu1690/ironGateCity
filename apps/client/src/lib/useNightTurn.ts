import type { NightView } from '@irongate/rules';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { onServerClockJump, serverNow } from './useNow';

/** ADR 0079: the refetch at dusk or dawn is spread over 20 s, so every client does not read at once. */
export const NIGHT_TURN_JITTER_MS = 20_000;
/** A turn that fired early (a refetch that still answers the old night): try again this much later. */
const RETRY_MS = 5_000;

/**
 * Review 5 (ADR 0079, tech design §3.3): the client never computes the night. A view carries its
 * `night` block; at `changesAt` (the next dusk or dawn, on the server's clock) plus 0–20 s of jitter
 * this refetches the given queries, so the map's art, the tickets and the plate turn without a
 * reload. One timer, cleared on unmount and re-armed when the block changes. A pinned night (tests:
 * `changesAt` null) arms nothing.
 */
export function useNightTurn(night: NightView | null | undefined, queryKeys: readonly QueryKey[]): void {
  const queryClient = useQueryClient();
  const keys = useRef(queryKeys);
  useEffect(() => {
    keys.current = queryKeys;
  });
  const [fired, setFired] = useState(0);
  // A jump of the server clock (the dev panel's skips) re-arms the timer against the new time.
  const [jumps, setJumps] = useState(0);
  useEffect(() => onServerClockJump(() => setJumps((n) => n + 1)), []);
  const changesAt = night?.changesAt ?? null;
  useEffect(() => {
    if (changesAt === null) return;
    const ahead = changesAt - serverNow();
    // Still the old block after a turn (the refetch beat the server's clock): look again shortly.
    const delay =
      ahead > 0 ? ahead + Math.floor(Math.random() * NIGHT_TURN_JITTER_MS) : fired > 0 ? RETRY_MS : 0;
    const t = window.setTimeout(() => {
      for (const queryKey of keys.current) void queryClient.invalidateQueries({ queryKey });
      setFired((n) => n + 1);
    }, delay);
    return () => window.clearTimeout(t);
  }, [changesAt, fired, jumps, queryClient]);
}
