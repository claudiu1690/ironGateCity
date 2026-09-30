/**
 * The QA vocabulary check of docs/design/review-2-answers.md §1.13 (GDD §1.5): a player reads
 * everyday words, so no player-facing string may carry a system term (canvass, propaganda,
 * ordinance, endorse, the slate, FXP, PC, Local Standing…). The design, the schemas and the ids keep
 * their terms; only what reaches a screen is checked.
 *
 * Built to take more sources: a source is any value (an object tree, a list of strings, a function's
 * output); `playerStrings` walks it, skipping ids and the keys that hold ids or enums, and
 * `systemTermHits` returns every offending string with its path. Add a source to
 * `VOCABULARY_SOURCES` (or pass your own list) to extend the check, e.g. to `copy.ts` and `packages/ui`.
 */
import { rawContent } from '../src';
import { copy } from '../src/data/copy';

/** The answers' regex (§1.13), plus *ward* and the meter *Standing* (allowed only as listed below). */
export const SYSTEM_TERMS = new RegExp(
  // "A word preceded by `.`, `-` or `_` is an id" (§1.13): never a hit.
  String.raw`(?<![.\-_\w])(?:canvass\w*|leaflet\w*|propaganda|ordinance\w*|endorse\w*|slate\b|order paper|division\b|divides\b|motion\b|nominations?\b|ballot\w*|FXP\b|PC\b|Local Standing|hoardings?\b|mimeograph|manifests?\b|groundswell|wards?\b)`,
  'gi',
);
/** *Standing* as the meter's name (capitalised); "a stranger is standing where…" is plain English. */
export const STANDING_METER = /(?<![.\-_\w])Standing\b/g;

/**
 * The allowed exceptions (§1.13), each an exact phrase removed before the scan:
 * - *His ward book*: the Ambition chapter's title and his keepsake; the book keeps its name in the
 *   chapter texts ("a ward book", "the back of the ward book"), since it is his book (§1.10);
 * - *Stand(ing) for the council*.
 */
export const ALLOWED_PHRASES: readonly RegExp[] = [/\bward book\b/gi, /\bStand(?:ing)? for the council\b/gi];

/**
 * §1.2: the duplicator machine's name "stays in the body text" (only titles lose it). Allowed in a
 * location's blurb, an outcome body and an image's alt text; never in a title, name, line or headline.
 */
export const BODY_ONLY_TERMS = /\bmimeograph\b/gi;
const BODY_KEYS = new Set(['body', 'blurb', 'alt', 'narrative']);

/** Keys whose values are ids, enums, asset references or numbers, never read by a player. */
const SKIP_KEYS = new Set([
  'id',
  'type',
  'kind',
  'kinds',
  'locationKind',
  'actionType',
  'actionTypes',
  'when',
  'match',
  'stats',
  'stat',
  'trains',
  'crest',
  'role',
  'slot',
  'use',
  'counts',
  'group',
  'phase',
  'scope',
  'source',
  'flatten',
  'flag',
  'keepsake',
  'art',
  'crestArt',
  'portrait',
  'outfit',
  'card',
  'avatars',
  'map',
  'restoreOrders',
  'branchMotion',
]);
const isIdKey = (key: string) => SKIP_KEYS.has(key) || /(Id|Ids)$/.test(key);
const isStrings = (v: unknown) =>
  typeof v === 'string' || (Array.isArray(v) && v.every((x) => typeof x === 'string'));

export interface PlayerString {
  /** Where it is, "cities[0].locations[2].actions[1].text.success.body". */
  path: string;
  /** The last key of the path ("body", "headline"…), or "" for a bare string. */
  key: string;
  text: string;
}

/** Every player-facing string in a value, placeholders (`{name}`) blanked. */
export function playerStrings(value: unknown, path = '', key = ''): PlayerString[] {
  if (typeof value === 'string') return [{ path, key, text: value.replace(/\{[A-Za-z]+\}/g, '…') }];
  if (typeof value === 'function') {
    // A copy template: call it with neutral arguments so its text is scanned too.
    try {
      return playerStrings((value as (...a: unknown[]) => unknown)('X', 'Y', 'Z'), `${path}()`, key);
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) return value.flatMap((v, i) => playerStrings(v, `${path}[${i}]`, key));
  if (value && typeof value === 'object') {
    // An id key skips its string (or list of strings); an object under it is still walked
    // (the root `art` holds the images' alt texts, an item's `art` is an asset id).
    return Object.entries(value).flatMap(([k, v]) =>
      isIdKey(k) && isStrings(v) ? [] : playerStrings(v, path ? `${path}.${k}` : k, k),
    );
  }
  return [];
}

export interface VocabularySource {
  name: string;
  value: unknown;
}

/** The sources checked: the loaded content data and the UI copy (`packages/ui` renders its own check). */
export const VOCABULARY_SOURCES: VocabularySource[] = [
  { name: 'content', value: rawContent },
  { name: 'copy', value: copy },
];

/** Every system term found, as "source:path: "term" in "text"". Empty when the words are plain. */
export function systemTermHits(sources: readonly VocabularySource[] = VOCABULARY_SOURCES): string[] {
  const hits: string[] = [];
  for (const { name, value } of sources) {
    for (const s of playerStrings(value)) {
      let text = s.text;
      for (const allowed of ALLOWED_PHRASES) text = text.replace(allowed, '…');
      if (BODY_KEYS.has(s.key)) text = text.replace(BODY_ONLY_TERMS, '…');
      const found = [...text.matchAll(SYSTEM_TERMS), ...text.matchAll(STANDING_METER)].map((m) => m[0]);
      for (const term of found) hits.push(`${name}:${s.path}: "${term}" in "${s.text}"`);
    }
  }
  return hits;
}
