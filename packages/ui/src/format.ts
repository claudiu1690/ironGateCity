/** Display helpers. They format numbers the server decided; they never compute game outcomes. */
import { boundary, when } from '@irongate/content/copy';
import { dayKey, dayStart } from '@irongate/rules';

/**
 * Review 4 (tech design §12.1): the clock the time helpers read "now" from. The client points it at
 * the server's clock (`serverNow`, the dev panel's test clock included) at start-up; tests and
 * storybook-like renders keep the device's.
 */
let clockSource: () => number = () => Date.now();
export function setClockSource(source: () => number): void {
  clockSource = source;
}
export function clockNow(): number {
  return clockSource();
}

/** The next turn of the City Day (00:00 UTC), when wages land: "paid tomorrow 01:00". */
export function nextDayTurn(now: number = clockNow()): number {
  return dayStart(dayKey(now) + 1);
}

/** A moment in the one countdown style (answers §4.2): "in 24 min", "at 14:40", "tomorrow 01:00". */
export function formatWhen(ms: number, now: number = clockNow(), withTime = false): string {
  return when(ms, now, { withTime });
}

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

/** "1 day", "4 days". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/**
 * The end of a window in the player's clock, always with its time (review 4 §23 Q6, GDD §2.2):
 * "14:00" today, "tomorrow 01:00", "Saturday 01:00". The line says *until* or *closes* itself.
 */
export function formatUntil(ms: number, now: number = clockNow()): string {
  return boundary(ms, now);
}

/**
 * A moment as a `when` phrase with its time (review 4): "at 14:00", "in 20 min", "tomorrow 01:00",
 * "Saturday 01:00". The phrase carries its preposition (*The council votes tomorrow 01:00*).
 */
export function formatAt(ms: number, now: number = clockNow()): string {
  return when(ms, now, { withTime: true });
}

/** The local weekday of a moment ("the count is in Sunday's paper"). */
export function formatWeekday(ms: number): string {
  return WEEKDAYS[new Date(ms).getDay()]!;
}

/**
 * Server text with the `{until}` / `{at}` tokens rendered in the player's clock (review 4): *at {…}*
 * becomes the `when` phrase (*The council votes tomorrow 01:00*, *… at 14:00*), any other `{until}`
 * the boundary (*until tomorrow 01:00*) and any other `{at}` the `when` phrase.
 */
export function renderTimeTokens(
  text: string,
  t: { until?: number | null; at?: number | null },
  now: number = clockNow(),
): string {
  let out = text;
  for (const key of ['until', 'at'] as const) {
    const ms = t[key];
    if (ms == null) continue;
    out = out.replace(new RegExp(String.raw`\bat \{${key}\}`, 'g'), formatAt(ms, now));
    out = out.replaceAll(`{${key}}`, key === 'until' ? formatUntil(ms, now) : formatAt(ms, now));
  }
  return out;
}
