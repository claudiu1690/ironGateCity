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
  // Review 4 #20 (answers §20.3, ADR 0078): the cells' decks gain the orders clause (past tense: the
  // paper prints the morning after), and the cells' note the new rule.
  'Taken in after {missionTitle}; {how} The duty officer wrote it down. Heat is back to 25; the branch says nothing.':
    "Taken in after {missionTitle}; {how} The duty officer wrote it down. Heat is back to 25; the day's orders were off.",
  'Taken in after {missionTitle}; {how} Heat is back to 25. The committee has read this and will say so.':
    "Taken in after {missionTitle}; {how} Heat is back to 25. The committee has read this and took the day's orders off the board.",
  'Taken in after {missionTitle}; {how} Legal Aid halved the bail; the Rooms would rather not mention it. Heat is back to 25.':
    "Taken in after {missionTitle}; {how} Legal Aid halved the bail. Heat is back to 25; the Rooms took the day's orders off the board.",
  'Taken in at police headquarters after {missionTitle}; {how} Heat is back to 25. The Herald prints names.':
    "Taken in at police headquarters after {missionTitle}; {how} Heat is back to 25, the day's orders off. The Herald prints names.",
  'A sentence of ten to sixty minutes, by your Heat. Pay bail or wait; either way you walk out with Heat at 25. Energy, the wage and the vote carry on without you.':
    'A sentence of twenty to sixty minutes, by your Heat. Pay bail or wait; either way you walk out with Heat at 25, a mark on your record, and no Party orders until the day turns. Energy, the wage and the vote carry on without you.',
  // Review 4 #9 (answers §9.2–§9.3): *Live here*, and the room as a bed at the Junction's Lodgings card.
  'You live in {place}': 'You live in {place}.',
  'Register in {district} · 500 Iron': 'Live in {district} · 500 Iron',
  'Register here to vote and stand in {district} · 7 days between moves':
    'Live in {district} instead: vote and stand here, and your orders come from here. A week between moves.',
  'You can move again from {weekday}': 'You can move again from {weekday}.',
  "You're a candidate in {place} until the result · you can move from {weekday}":
    "You're a candidate in {place} until the result · you can move from {weekday}.",
  'Registered {weekday} · you vote from {weekday2} · move again from {weekday3}':
    'Since {weekday} · you vote from {weekday2} · move again from {weekday3}.',
  '{rank2}s can register in the capital. 400 Party XP makes a {rank2}.':
    '{rank2}s can live in the capital. 400 Party XP makes a {rank2}.',
  'Register · 500 Iron': 'Live here · 500 Iron',
  Registered: 'Moved in',
  'A room in Irongate': 'A bed in Irongate',
  '100 Iron · 7 days · Rested cap +50': 'Rested banks higher while you have it: up to {cap} instead of {base}.',
  'Take a room · 100 Iron': 'Take a bed · 100 Iron',
  'Renew · 100 Iron · 7 more nights': 'Seven more nights · 100 Iron',
  'Room until {weekday} · Rested cap {cap}': 'Your bed until {weekday} · Rested banks to {cap}',
  'Room until {weekday} · Rested cap {cap} · renew from {renewFrom}':
    'Your bed until {weekday} · Rested banks to {cap} · renew from {renewFrom}',
  // Review 4 phases 3–4 (the small extra): the capital Election card's first line, as *Live here*.
  'Registered in {district}': 'You live in {district}',
  // The screens' worked examples.
  'In the cells at Harbour Police · 24 minutes to go · bail 150 Iron':
    'In the cells at Harbour Police · out in 24 min · bail 150 Iron',
};

/** A design string as review 4 words it (unchanged when the review left it alone). */
export const reworded = (s: string): string => REVIEW4_REWORDED[s] ?? s;

/**
 * Review 4 #2 (answers §2.6, ADR 0073): the welcome deck named slot A's place (*Spend it at {place}
 * first.*); it now names the favour from the platform and the HQ. Stahl's line is shortened to keep
 * the printed deck within 200 (*goes out at Beacon House*, the developer's words for the designer).
 */
export const REVIEW4_WELCOME_DECKS: Readonly<Record<string, string>> = {
  "Three orders from Secretary Holm below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Spend it at {place} first.":
    "Three orders from Secretary Holm below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Holm's parcel wants delivering at {place}; start there.",
  "Three orders from Organiser Stahl below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Spend it at {place} first.":
    "Three orders from Organiser Stahl below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Stahl's bundle goes out at {place}; start there.",
  "Three orders from Mr Grey below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Spend it at {place} first.":
    "Three orders from Mr Grey below, and a letter from your father's things. Energy refills on its own, five points every ten minutes. Grey's signature wants a witness at {place}; start there.",
};

/**
 * Review 4 #2 (answers §2.6): two favour texts reworded for the vocabulary checks, for the designer
 * to confirm. *in front of* is kept off mission and place text (it reads as a front), and *leaflets*
 * are *flyers* in every player-facing string (review 2 §1.13).
 */
export const REVIEW4_PROLOGUE_REWORDED: Readonly<Record<string, string>> = {
  'The parcel is flyers, five hundred of them, and the man on the door counts them in front of you. "She said you\'d come." He writes your name in the book under hers.':
    'The parcel is flyers, five hundred of them, and the man on the door counts them while you wait. "She said you\'d come." He writes your name in the book under hers.',
  'Twenty leaflets go into twenty hands on the steps of Beacon House, and the clerk inside takes the rest with a nod that is nearly approval. Your name goes on the list under Thursday.':
    'Twenty flyers go into twenty hands on the steps of Beacon House, and the clerk inside takes the rest with a nod that is nearly approval. Your name goes on the list under Thursday.',
};
