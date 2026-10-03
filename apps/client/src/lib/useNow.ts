import { useEffect, useState } from 'react';

/**
 * The server clock as seen from this device (tech design §3.1): every view carries `serverNow`, and
 * the difference to `Date.now()` is kept here, so a wrong phone clock never shows the wrong day,
 * night or countdown.
 */
let skewMs = 0;
/** The `useNow` hooks mounted: told at once when the skew jumps (QA slice 4 n5). */
const listeners = new Set<() => void>();

export function noteServerNow(serverNow: number): void {
  const next = serverNow - Date.now();
  const jumped = Math.abs(next - skewMs) > 1_000;
  skewMs = next;
  // A first reading, a wrong phone clock or a dev-panel skip: every countdown on screen moves now,
  // not at its next tick (up to a minute later).
  if (jumped) for (const l of listeners) l();
}

export function serverNow(): number {
  return Date.now() + skewMs;
}

/** The server's current time, updated every `intervalMs` (for countdowns; the server stays authoritative). */
export function useNow(intervalMs = 1_000): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const tick = () => setNow(serverNow());
    listeners.add(tick);
    const id = window.setInterval(tick, intervalMs);
    return () => {
      listeners.delete(tick);
      window.clearInterval(id);
    };
  }, [intervalMs]);
  return now;
}

/** True while a media query matches (re-rendering when it flips). */
export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}

/** True on screens at least `px` wide (the desktop dock and ticker from 1024 px). */
export function useMinWidth(px: number): boolean {
  return useMedia(`(min-width: ${px}px)`);
}

/** A phone held sideways (the `short:` variant in tokens.css, review 2 #3). */
export const SHORT_LANDSCAPE = '(orientation: landscape) and (max-height: 500px)';

/**
 * Where a location opens (review 2 #2, #3): a bottom sheet on a phone held upright, a side panel on
 * a phone held sideways, a centred panel over the map from 768 px (tablets and desktops).
 */
export function useLocationLayout(): 'sheet' | 'side' | 'panel' {
  const short = useMedia(SHORT_LANDSCAPE);
  const md = useMinWidth(768);
  return short ? 'side' : md ? 'panel' : 'sheet';
}
