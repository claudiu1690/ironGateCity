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

/** A server instant shown in the player's local clock, 24-hour "14:20" (content §12.1). */
export function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Meter shares: one decimal (§14.2), "70.1". */
export function formatShare(x: number): string {
  // Halves up, absorbing float noise (70.05 is stored as 70.04999…).
  return (Math.round(x * 10 + 1e-7) / 10).toFixed(1);
}

/** "STR", "CHA+INT". */
export function statLabel(stats: readonly string[]): string {
  return stats.map((s) => s.toUpperCase()).join('+');
}

/** "1 day", "4 days". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
