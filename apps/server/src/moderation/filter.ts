import { copy } from '@irongate/content/copy';
import {
  DataSet,
  RegExpMatcher,
  createSimpleTransformer,
  englishDataset,
  englishRecommendedBlacklistMatcherTransformers,
  englishRecommendedWhitelistMatcherTransformers,
  parseRawPattern,
} from 'obscenity';
import { ALLOW_TERMS } from './lists/allow';
import { MILD_WORDS, REFUSE_PHRASES, SLUR_WORDS } from './lists/refuse';

/**
 * Review 7 #2 (slice 6 design §23.1; GDD §16.2): the word filter, brought forward from slice 9 in its
 * simplest shape. Pure, server-only, no I/O. Two tiers:
 *
 * - **refuse**: slurs and real-world hate. A chat line is not posted; a name is not accepted.
 * - **mask**: ordinary swearing. Each word prints as its first letter and the editor's dash (*b—*).
 *
 * Built on `obscenity` (MIT): its English dataset and recommended transformers (case, leetspeak,
 * confusables, skipped symbols, doubled letters), then the project lists: the refuse phrases added,
 * the mild period words removed, the allow list whitelisted.
 */

interface Meta {
  originalWord: string;
  refuse: boolean;
}

const slurs = new Set(SLUR_WORDS);
const mild = new Set(MILD_WORDS);

const dataset = new DataSet<Meta>();
dataset.addAll(englishDataset as unknown as DataSet<Meta>);
dataset.removePhrasesIf((p) => !!p.metadata && mild.has(p.metadata.originalWord));
for (const r of REFUSE_PHRASES) {
  dataset.addPhrase((b) => {
    let out = b.setMetadata({ originalWord: r.word, refuse: true });
    for (const p of r.patterns) out = out.addPattern(parseRawPattern(p));
    return out;
  });
}
dataset.addPhrase((b) => {
  let out = b.setMetadata({ originalWord: '', refuse: false });
  for (const term of ALLOW_TERMS) out = out.addWhitelistedTerm(term);
  return out;
});

/** Letters spelled out with dots, dashes, underscores or stars (*s.h.i.t*); spaces are kept, so words never join. */
const SPELLED = new Set(['.', '-', '_', '*', "'"].map((c) => c.charCodeAt(0)));
const skipSpelling = createSimpleTransformer((c) => (SPELLED.has(c) ? undefined : c));

const matcher = new RegExpMatcher({
  ...dataset.build(),
  blacklistMatcherTransformers: [skipSpelling, ...englishRecommendedBlacklistMatcherTransformers],
  whitelistMatcherTransformers: [skipSpelling, ...englishRecommendedWhitelistMatcherTransformers],
});

function tierOf(meta: Partial<Meta> | undefined): 'refuse' | 'mask' {
  if (!meta) return 'mask';
  if (meta.refuse) return 'refuse';
  return meta.originalWord && slurs.has(meta.originalWord) ? 'refuse' : 'mask';
}

export type CheckResult = { refused: true } | { refused: false; text: string };

/**
 * Check a line: `{ refused: true }` when any match is on the refuse tier, else the text with every
 * swear-word masked (unchanged when none).
 */
export function check(text: string): CheckResult {
  const matches = matcher.getAllMatches(text, true);
  if (matches.length === 0) return { refused: false, text };
  const spans: Array<{ start: number; end: number; first: string }> = [];
  for (const m of matches) {
    const meta = dataset.getPayloadWithPhraseMetadata(m).phraseMetadata;
    if (tierOf(meta) === 'refuse') return { refused: true };
    // `endIndex` is inclusive; a match may start on a skipped symbol ($hit): use the word's letter.
    const at = text[m.startIndex] ?? '';
    const first = /\p{L}/u.test(at) ? at : (meta?.originalWord?.[0] ?? at);
    spans.push({ start: m.startIndex, end: m.endIndex + 1, first });
  }
  // Overlapping matches merge into one masked word.
  const merged: typeof spans = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s.start < last.end) last.end = Math.max(last.end, s.end);
    else merged.push({ ...s });
  }
  let out = '';
  let cursor = 0;
  for (const s of merged) {
    out += text.slice(cursor, s.start) + copy.together.chat.mask(s.first);
    cursor = s.end;
  }
  out += text.slice(cursor);
  return { refused: false, text: out };
}

/** A name passes only with no match at all (design §23.1: a swearing name is not masked, it is not a name). */
export function nameAllowed(name: string): boolean {
  return !matcher.hasMatch(name);
}
