/**
 * Review 5 phase 10 (docs/design/review-5-answers.md §19; tech design docs/tech/review-5.md §12):
 * *Coming home* restrings the opening and the long story without the father. The older design
 * documents (slice-2 onboarding, slice 3, review 4) keep their words as the record; the word-for-word
 * tests read them through these tables, the old string on the left and the review-5 string on the
 * right. Ids never change.
 */
import { expect } from 'vitest';
import R5 from '../../../docs/design/review-5-answers.md?raw';
import type { loadContent } from '../src';
import { REVIEW4_WELCOME_DECKS } from './review4';

type Chapter = NonNullable<ReturnType<ReturnType<typeof loadContent>['chapter']>>;

/** §19.4, §19.6: the suit and the keepsakes, by their old names. */
export const REVIEW5_ITEM_NAMES: Readonly<Record<string, string>> = {
  "Your father's coat": 'The demob suit',
  'His ward book': "The unit's list",
  'The prison letter': 'The requisition order',
  'The marker': 'The ration page',
  'His election bill': 'Your election bill',
};

/** §19.6: the three Ambitions' titles, by their old ones. */
export const REVIEW5_AMBITION_TITLES: Readonly<Record<string, string>> = {
  'Finish His Work': 'The Names on the Stone',
  'Clear His Name': 'Who Sold the Homes',
  'Settle His Debts': 'The Ration Ledger',
};

/**
 * §19.5: the welcome decks, from review 4's (the favour from the platform) to review 5's (the
 * favour from the counter); the letter is the envelope opened on the train (§19.10.7).
 */
export const REVIEW5_WELCOME_DECKS: Readonly<Record<string, string>> = {
  "Three orders from Secretary Holm below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Holm's parcel wants delivering at {place}; start there.":
    "Three orders from Secretary Holm below, and the envelope you opened on the train. Energy refills on its own, five points every ten minutes. The rehiring sheet wants your name at {place}; start there.",
  "Three orders from Organiser Stahl below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Stahl's bundle goes out at {place}; start there.":
    "Three orders from Organiser Stahl below, and the envelope you opened on the train. Energy refills on its own, five points every ten minutes. The League's letter waits at {place}; start there.",
  "Three orders from Mr Grey below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Grey's tenant wants a witness at {place}; start there.":
    "Three orders from Mr Grey below, and the envelope you opened on the train. Energy refills on its own, five points every ten minutes. The appeal wants your signature at {place}; start there.",
};

/**
 * §19.5's Vanguard deck sentence, shortened by the developer so the deck keeps within its 200 (with
 * §19.10.7's first sentence it was 202), as review 4 shortened Stahl's line; the designer took it
 * in §19.10.7.
 */
export const REVIEW5_DECK_REWORDED: Readonly<Record<string, string>> = {
  "Your papers want the League's letter at {place}; start there.": "The League's letter waits at {place}; start there.",
};
export const asBuiltDeck = (s: string): string => REVIEW5_DECK_REWORDED[s] ?? s;

/** A slice-2 welcome deck as built today: review 1's place, review 4's favour, review 5's counter. */
export function welcomeDeckNow(slice2Deck: string): string {
  const r4 = REVIEW4_WELCOME_DECKS[slice2Deck] ?? slice2Deck;
  return REVIEW5_WELCOME_DECKS[r4] ?? r4;
}

/** An item's name as built today, from any older design document's. */
export const itemNameNow = (name: string): string => REVIEW5_ITEM_NAMES[name] ?? name;

/**
 * §19.10: a built chapter's strings, one table per chapter (`| field | string |`), keyed as the
 * design writes them: `title`, `letterFrom`, `choose.title`, `choice \`show\` · text`, `approach
 * \`knock\` (cha, int)`, `success.body`…
 */
export function restrungChapter(subsection: string): Map<string, string> {
  const from = R5.indexOf(`#### ${subsection} `);
  if (from < 0) throw new Error(`answers §${subsection} is missing`);
  const to = R5.indexOf('\n#### ', from + 1);
  const rows = R5.slice(from, to < 0 ? undefined : to)
    .split('\n')
    .filter((l) => l.startsWith('| ') && !l.startsWith('| Field') && !l.startsWith('|---'))
    .map((l) =>
      l
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim()),
    );
  return new Map(rows.map(([field, text]) => [field!.replace(/`/g, '').replace(/ \(.*\)$/, ''), text!]));
}

/** Every player-facing string of a built chapter, word for word against its §19.10 table. */
export function expectChapterRestrung(chapter: Chapter | undefined, subsection: string): void {
  const t = restrungChapter(subsection);
  const s = chapter?.story;
  if (!chapter || !s) throw new Error(`no story for §${subsection}`);
  const got: [string, string][] = [
    ['title', chapter.title],
    ['letterFrom', s.letterFrom],
    ['choose.title', s.choose.title],
    ['choose.narrative', s.choose.narrative],
    ...s.choose.choices.flatMap((c): [string, string][] => [
      [`choice ${c.id} · text`, c.text],
      [`choice ${c.id} · hint`, c.hint],
    ]),
    ['check.title', s.check.title],
    ['check.narrative', s.check.narrative],
    ...s.check.approaches.map((a): [string, string] => [`approach ${a.id}`, a.text]),
    ['cta', s.check.cta],
    ...(['success', 'partial', 'failure'] as const).flatMap((o): [string, string][] => [
      [`${o}.headline`, s.result[o].headline],
      [`${o}.body`, s.result[o].body],
    ]),
  ];
  expect(Object.fromEntries(got)).toEqual(Object.fromEntries(t));
}

/** §19.10.5–§19.10.6: the slice-5 screens' strings of *The riverside house*, as re-strung. */
export const REVIEW5_SCREENS_REWORDED: Readonly<Record<string, string>> = {
  "From the marker's other side": "From the page's other side",
  'Keepsake: A page of his ledger': "Keepsake: A page of the ring's ledger",
};
export const restrung = (s: string): string => REVIEW5_SCREENS_REWORDED[s] ?? s;
