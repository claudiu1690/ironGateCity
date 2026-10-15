/**
 * Slice 6: faction chat (docs/tech/slice-6.md §6.4; design §8; ADR 0038, 0039). Pure.
 */
import { CHAT } from './constants';
import { FACTION_IDS } from './types';
import type { FactionId } from './types';

export type ChatChannelKind = 'party' | 'city' | 'officers';
export const partyChannel = (f: FactionId): string => `party:${f}`;
export const cityChannel = (f: FactionId, cityId: string): string => `city:${f}:${cityId}`;
/** Slice 7 (screens §5.4, §16): the party's officers, Rank 4 and above (`CHAIR.rank`). */
export const officersChannel = (f: FactionId): string => `officers:${f}`;

/**
 * The faction's channels: *Party*, one branch per open city (its home city, the capital and
 * Clearwater) and, for Rank 4 and above (slice 7), *Officers*.
 */
export function channelsOf(f: FactionId, chatCities: readonly string[], officers = false): string[] {
  return [partyChannel(f), ...chatCities.map((c) => cityChannel(f, c)), ...(officers ? [officersChannel(f)] : [])];
}

/** Every channel of a faction, the officers' included (the daily trim). */
export const allChannelsOf = (f: FactionId, chatCities: readonly string[]): string[] => channelsOf(f, chatCities, true);

export function parseChannel(
  id: string,
):
  | { kind: 'party'; factionId: FactionId }
  | { kind: 'officers'; factionId: FactionId }
  | { kind: 'city'; factionId: FactionId; cityId: string }
  | null {
  const parts = id.split(':');
  const f = parts[1] as FactionId;
  if (!(FACTION_IDS as readonly string[]).includes(f)) return null;
  if (parts[0] === 'party' && parts.length === 2) return { kind: 'party', factionId: f };
  if (parts[0] === 'officers' && parts.length === 2) return { kind: 'officers', factionId: f };
  if (parts[0] === 'city' && parts.length === 3 && /^[a-z-]+$/.test(parts[2]!))
    return { kind: 'city', factionId: f, cityId: parts[2]! };
  return null;
}

/** FNV-1a (32-bit) as eight hex digits. */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** C0 and C1 controls and DEL (newlines and tabs are spaced first), the bidi embeddings, overrides and isolates. */
// eslint-disable-next-line no-control-regex
const CONTROLS = /[\u0000-\u001F\u007F-\u009F‪-‮⁦-⁩]/g;

/**
 * NFC; newlines and tabs to spaces; control characters and bidi overrides removed; trimmed; at most
 * 280 code points (an emoji counts one). The hash is of the lower-cased text (the repeat rule).
 */
export function normaliseChatText(
  raw: string,
): { ok: true; text: string; hash: string } | { ok: false; reason: 'empty' | 'tooLong' } {
  const text = raw
    .normalize('NFC')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(CONTROLS, '')
    .trim();
  if (text.length === 0) return { ok: false, reason: 'empty' };
  if ([...text].length > CHAT.maxLength) return { ok: false, reason: 'tooLong' };
  return { ok: true, text, hash: fnv1a(text.toLowerCase()) };
}

/**
 * ADR 0039: one line every three seconds, 30 in ten minutes, no repeat of the same text within a
 * minute. `recent` is the poster's last 30 post times, oldest first.
 */
export function chatRateCheck(i: {
  recent: readonly number[];
  last: { hash: string; at: number } | null;
  hash: string;
  now: number;
}): null | { reason: 'tooFast' | 'tooMany' | 'repeat'; retryAt: number } {
  const latest = i.recent.length > 0 ? i.recent[i.recent.length - 1]! : null;
  if (latest !== null && i.now - latest < CHAT.minGapMs) return { reason: 'tooFast', retryAt: latest + CHAT.minGapMs };
  const inWindow = i.recent.filter((t) => i.now - t < CHAT.window.ms);
  if (inWindow.length >= CHAT.window.max) return { reason: 'tooMany', retryAt: inWindow[0]! + CHAT.window.ms };
  if (i.last && i.last.hash === i.hash && i.now - i.last.at < CHAT.repeatMs)
    return { reason: 'repeat', retryAt: i.last.at + CHAT.repeatMs };
  return null;
}

/**
 * Tech §22.1 Q12: a system line goes to the place's city branch when it is one of the faction's
 * channels, else to the residence city's.
 */
export function systemChannelFor(i: {
  factionId: FactionId;
  placeCityId: string;
  residenceCityId: string;
  chatCities: readonly string[];
}): string {
  const city = i.chatCities.includes(i.placeCityId) ? i.placeCityId : i.residenceCityId;
  return cityChannel(i.factionId, city);
}
