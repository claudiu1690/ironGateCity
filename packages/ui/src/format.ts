/** Display helpers. They format numbers the server decided; they never compute game outcomes. */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** "7:05", or "1:02:05" past an hour. Negative or null → "0:00". */
export function formatCountdown(ms: number | null | undefined): string {
  const total = Math.max(0, Math.ceil((ms ?? 0) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** "+45", "0", "−3" (typographic minus). */
export function formatSigned(n: number): string {
  if (n > 0) return `+${n.toLocaleString('en-GB')}`;
  if (n < 0) return `−${Math.abs(n).toLocaleString('en-GB')}`;
  return '0';
}

/** Opinion deltas are tiny (+0.05 points): up to three decimals, trailing zeros trimmed. */
export function formatOpinionDelta(delta: number): string {
  const s = Math.abs(delta)
    .toFixed(3)
    .replace(/\.?0+$/, '');
  return delta > 0 ? `+${s}` : delta < 0 ? `−${s}` : '0';
}

/** In-game time from an ISO timestamp, "09:00" (UTC, the game's clock, GDD §2). */
export function formatGameTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-GB');
}
