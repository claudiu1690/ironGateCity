/**
 * Review 4 (docs/design/review-4-answers.md §4.2, §12, §16; tech design docs/tech/review-4.md §12.1):
 * the design strings of slices 4–5 the review reworded. The word-for-word tests read the slice's
 * screens document and compare through this table, so the old design text and the new copy are both
 * on record: the design's string on the left, the review-4 string on the right.
 *
 * - One countdown style: a moment is a `copy.when` phrase that carries its own preposition (*ready in
 *   24 min*, *Cool at 20:40*, *out in 38 min*); *by* is dropped; *minutes to go* is gone.
 * - Nothing invites the player to close the game (#16).
 */
export const REVIEW4_REWORDED: Readonly<Record<string, string>> = {
  // slice-4-screens.md §11
  'Six votes of ten to pass. The council votes at {at}.': 'Six votes of ten to pass. The council votes {at}.',
  "You can close the game. You'll arrive either way, and Energy keeps refilling on the way.":
    "You'll arrive either way, and Energy keeps refilling on the way.",
  '{n} min to go · arrives {time}': 'arrives {when} · {time}',
  // slice-5-screens.md §11
  'Health {a} → {b} · full again by {time}': 'Health {a} → {b} · full again {time}',
  'Heat {a} → {b} · {state} · cools by {time}': 'Heat {a} → {b} · {state} · Cool {time}',
  'In the cells at {place} · {n} minutes to go · bail {iron} Iron':
    'In the cells at {place} · out {out} · bail {iron} Iron',
  'In the infirmary at {place} · {n} minutes to go': 'In the infirmary at {place} · out {out}',
  'Warned: run-ins less likely in {city} until midnight':
    'Warned: run-ins less likely in {city} until {until}',
  'Watched today: run-ins likelier in {city} until midnight':
    'Watched today: run-ins likelier in {city} until {until}',
  'You can close the game. The door opens at {time} either way, and Energy keeps refilling in here.':
    'The door opens {time} either way, and Energy keeps refilling in here.',
  "You can close the game. You're discharged at {time} either way, and Health comes back ten every ten minutes.":
    "You're discharged {time} either way, and Health comes back ten every ten minutes.",
  'out at {time} · Health {hp} / {max}, rising': 'out {time} · Health {hp} / {max}, rising',
  'out at {time} · or pay bail': 'out {time} · or pay bail',
  'Your orders are in {city} today': 'Your orders are in {city} · {done} of {of} done',
  // Review 4 #17 (answers §17).
  'Legal Aid: half price': 'Legal Aid · the Alliance pays half your bail',
  // The screens' worked examples.
  'In the cells at Harbour Police · 24 minutes to go · bail 150 Iron':
    'In the cells at Harbour Police · out in 24 min · bail 150 Iron',
};

/** A design string as review 4 words it (unchanged when the review left it alone). */
export const reworded = (s: string): string => REVIEW4_REWORDED[s] ?? s;
