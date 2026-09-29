import { useEffect, useState } from 'react';

/**
 * The server clock as seen from this device (tech design §3.1): every view carries `serverNow`, and
 * the difference to `Date.now()` is kept here, so a wrong phone clock never shows the wrong day,
 * night or countdown.
 */
let skewMs = 0;

export function noteServerNow(serverNow: number): void {
  skewMs = serverNow - Date.now();
}

export function serverNow(): number {
  return Date.now() + skewMs;
}

/** The server's current time, updated every `intervalMs` (for countdowns; the server stays authoritative). */
export function useNow(intervalMs = 1_000): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = window.setInterval(() => setNow(serverNow()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** True on screens at least `px` wide (the desktop dock and ticker from 1024 px). */
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}
