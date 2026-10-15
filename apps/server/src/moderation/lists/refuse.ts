/**
 * The word filter's project lists (slice 6 design §23.1; GDD §16.2). They live on the server, never
 * in `packages/content`: QA's vocabulary guards sweep every content string and must never read them.
 *
 * Patterns use `obscenity`'s syntax: `|` marks a word boundary, `[x]` an optional letter, `?` any one
 * character. The recommended transformers already fold case, leetspeak, confusables, skipped symbols
 * and doubled letters before matching, so one spelling per entry is enough.
 */

/**
 * The dataset's words that are slurs (refused; everything else the dataset carries is masked). By
 * `originalWord` as `obscenity`'s English dataset names them.
 */
export const SLUR_WORDS: readonly string[] = [
  'abo',
  'abeed',
  'africoon',
  'arabush',
  'boonga',
  'chingchong',
  'chink',
  'dyke',
  'fag',
  'kike',
  'negro',
  'nigger',
  'retard',
  'spastic',
  'tranny',
];

/**
 * Real-world hate (the content-policy review §7.2): salutes, slogans, party names and leaders. Each is
 * refused. The word stands for the entry's `originalWord`; the patterns are what is matched.
 */
export const REFUSE_PHRASES: ReadonlyArray<{ word: string; patterns: readonly string[] }> = [
  { word: 'hitler', patterns: ['hitler'] },
  { word: 'nazi', patterns: ['|nazi', '|nsdap'] },
  { word: 'mussolini', patterns: ['mussolini'] },
  { word: 'sieg heil', patterns: ['sieg heil', 'siegheil'] },
  { word: 'heil', patterns: ['|heil|'] },
  { word: 'white power', patterns: ['white power', 'whitepower'] },
  { word: 'third reich', patterns: ['third reich', '|reich|'] },
  { word: 'ku klux klan', patterns: ['|kkk|', 'ku klux'] },
  { word: 'blood and soil', patterns: ['blood and soil'] },
];

/**
 * Words the library carries that are not swearing in a 1946 noir game (design §23.1): never masked.
 * Removed from the dataset if it carries them.
 */
export const MILD_WORDS: readonly string[] = ['bloody', 'damn', 'hell', 'sod'];
