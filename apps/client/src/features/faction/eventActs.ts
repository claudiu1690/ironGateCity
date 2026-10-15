import { copy } from '@irongate/content/copy';
import type { EventPageView, PoliticalResult } from '@irongate/rules';
import { useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { gameErrorOf, isNetworkError, trpc } from '../../lib/trpc';
import { noticeFor } from '../game/errors';
import { noteServerNow } from '../../lib/useNow';

/**
 * Slice 6 (tech design §12.1): after any together mutation, the client renders the returned view and
 * invalidates `character.me`, `events.board`, `events.get`, `faction.*`, `city.get`, `paper.today`
 * and `held.get`.
 */
export function invalidateTogether(qc: QueryClient, opts: { me?: boolean } = {}): void {
  const keys = [
    trpc.events.board.queryKey(),
    trpc.events.get.queryKey(),
    trpc.events.callSheet.queryKey(),
    trpc.faction.pathKey(),
    trpc.city.get.queryKey(),
    trpc.paper.today.queryKey(),
    trpc.held.get.queryKey(),
    ...(opts.me ? [trpc.character.me.queryKey()] : []),
  ];
  for (const queryKey of keys) void qc.invalidateQueries({ queryKey });
}

/** Put an event page the server returned in the cache (the page renders it at once). */
export function setEventView(qc: QueryClient, event: EventPageView): void {
  qc.setQueryData(trpc.events.get.queryKey({ eventId: event.id }), event);
}

/**
 * A call or a sign-up (ADR 0036): one key per tap, re-sent on a network retry (the server replays
 * the stored modal); a second tap before the first answers does nothing; the button stays disabled
 * until the returned view renders. The result is a small political modal (*Called*, *Signed up*).
 */
export function useEventAct() {
  const qc = useQueryClient();
  const busy = useRef(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<PoliticalResult | null>(null);

  const run = useCallback(
    async (label: string, call: (idempotencyKey: string) => Promise<PoliticalResult>) => {
      if (busy.current) return null;
      busy.current = true;
      setPending(label);
      setError(null);
      const key = crypto.randomUUID();
      try {
        let r: PoliticalResult | null = null;
        for (let attempt = 0; attempt < 3 && !r; attempt++) {
          try {
            r = await call(key);
          } catch (e) {
            if (attempt < 2 && isNetworkError(e)) continue;
            throw e;
          }
        }
        if (!r) return null;
        noteServerNow(r.character.serverNow);
        qc.setQueryData(trpc.character.me.queryKey(), r.character);
        if (r.view.kind === 'event') setEventView(qc, r.view.event);
        invalidateTogether(qc);
        setResult(r);
        return r;
      } catch (e) {
        setError(e);
        invalidateTogether(qc);
        return null;
      } finally {
        busy.current = false;
        setPending(null);
      }
    },
    [qc],
  );

  return { run, pending, error, result, clear: () => setResult(null), clearError: () => setError(null) };
}

/** A refused call, sign-up or withdrawal, worded (`copy.together.errors`); the server's reason decides. */
export function eventNotice(error: unknown): string | undefined {
  if (!error) return undefined;
  const g = gameErrorOf(error);
  if (!g || g.reason === 'NOT_ENOUGH_ENERGY') return noticeFor(error);
  const v = (copy.together.errors as Record<string, unknown>)[g.reason];
  return typeof v === 'string' ? v : noticeFor(error);
}
