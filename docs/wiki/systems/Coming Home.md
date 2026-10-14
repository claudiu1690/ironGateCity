---
type: system
title: Coming Home
aliases: [Origin Story, The Origin, Prologue, Character creation, The Last Train In, Coming home, Onboarding, First ten minutes, Welcome set, Home City]
tags: [onboarding, story, character]
status: built
slice: "2 (origin, welcome set); review 4 (The Last Train In); review 5 (Coming home)"
gdd: ["§7", "§7.1", "§7.2", "§7.3", "§7.4", "§7.5"]
adrs: ["0011", "0012", "0073"]
updated: 2026-10-14
---

# Coming Home

## In one paragraph

*Coming home* is the opening of the game and the whole of character creation. Spring 1946: the
player is demobbed after four years away and reaches the counter of the demobilisation office at
Irongate Central, where the clerk gives three pieces of bad news: the mill is sold, a stamp is
missing, the family flat was requisitioned. Three party people work that hall. The problem the
player chooses to chase **is their party and their town**, and the favour that fixes it is their
first action there. Three beats, one choice each, no number anywhere, and the player is on the
map in under three minutes. There is no tutorial screen.

## How it works

- **Before the story** ([[GDD#7.3 After the prologue|GDD §7.3]]): the sign-up form takes a **face**
  (18 portraits, no effect, changeable later) and a **name** (2–40 characters after trimming).
- **Three beats** ([[GDD#7.1 *Coming home* (review 5, 8 Oct 2026; replaces *The Last Train In*)|GDD §7.1]]),
  2–3 lines each, saved as tapped so a closed tab resumes at the next beat:
  1. *The counter* (Irongate, the demobilisation office): Holm's rehiring sheet (the
     [[Red Collective]], Coalport) · Stahl's list at the League's welfare desk (the
     [[Iron Vanguard]], Duskwall) · Grey's housing appeal (the [[Civic Alliance]], Ashford). Sets **the
     party**, so the home city, and the favour.
  2. *The kitbag* (the six o'clock train): tools / books / boots, **+6 to one stat and +1 to
     another** (STR, INT or AGI).
  3. *The post*: three documents, which set **the Ambition** ([[Ambitions]]); the player wears
     **the demob suit** (Tier I, Charisma 5) from here on.
- **The party is permanent** (changing needs a paid Faction Reset token, [[Monetisation]]). Joining
  adds the faction's +3 stat bonus, its Tier I outfit and the party card.
- **Home city** ([[GDD#7.4 Home City (new)|GDD §7.4]]): every player starts in the faction's
  home city: Vanguard in [[Duskwall]], Collective in [[Coalport]], Alliance in [[Ashford]]. Safe
  ground, the place they vote and stand. They can later move residence to a battleground
  ([[Residence]], [[Home Cities]]); never into a rival home city.
- **The first ten minutes** ([[GDD#7.5 The first ten minutes (new)|GDD §7.5]]): **eight taps** from
  sign-up to the first result modal. The welcome edition of [[The Morning Paper]] (three headlines,
  the welcome set of orders, the chapter-1 letter, the desk) → the home map with **the HQ's sheet
  open and the favour's ticket highlighted** → the first result → *Once more* → Level 2 and the
  stat point → *Take the job* → the party meeting completes the set (+5 Political Capital, the
  first time it appears) → the Ambition chapter → free play until Energy runs out.
- **The welcome set** ([[Party Orders]]): on the first City Day the orders are fixed per character:
  two attempts at a political action chosen by the player's best stat, **the favour at the HQ**
  (a once-only ticket), and *Take a job at {place}*.
- **The *First day* bonus:** +10 % on every checked action in the home city during the welcome day
  ([[Stats and Checks]]).

## Where it lives

**Rules:** [[GDD#7. Character creation — the Origin Story|GDD §7]] ·
[[design/review-5-answers|review 5 answers §19]] (the full script, the favours, the long story
re-anchored, art) · [[design/review-4-answers|review 4 answers §2]] (*The Last Train In*, the
mechanics kept) · [[design/slice-2-onboarding|slice-2 onboarding §8]] (timeline) ·
[[design/content-policy-review|content-policy review §7]] (the Vanguard row) ·
[[adr/0011-arrival-draft-and-character-at-join|ADR 0011]] ·
[[adr/0012-welcome-set-first-city-day-orders|ADR 0012]] ·
[[adr/0073-the-last-train-in-faction-as-an-answer-and-a-welcome-only-favour|ADR 0073]]

**Code:**
- Rules: `packages/rules/src/origin.ts` (`resolveOrigin`, `originFaction`, `buildNewCharacter`) ·
  `packages/rules/src/welcome.ts` (`isWelcomeDay`, `firstDayBonus`) · `startOrders` in
  `packages/rules/src/orders.ts` · `packages/rules/src/name.ts` · `STARTING`, `NAME`, `FIRST_DAY` in
  `constants.ts`
- Server: `apps/server/src/services/arrivalService.ts` (`arrival.join` creates the character, its
  first day and the welcome edition in one transaction) · `welcomeLanding` in `views.ts` · router
  `apps/server/src/trpc/routers/arrival.ts` (`faces`, `get`, `start`, `answer`, `join`)
- Data: model `packages/db/src/models/arrival.ts` (the draft, keyed by user) · content
  `packages/content/src/data/origin.ts` (the three beats), `factions.ts` (`welcomeOrders`),
  `orders.ts`, `people.ts`, `ambitions.ts`, `items.ts` (`outfit.fathers-coat` = the demob suit)
- Client: routes `apps/client/src/routes/signup.tsx`, `arrive.tsx` ·
  `packages/ui/src/components/Story.tsx`

## Status

Built. Slice 2 built a six-question origin; review 4 (7 Oct 2026) replaced it with three beats
(*The Last Train In*, the faction as an answer); review 5 (8 Oct 2026) rewrote the story as *Coming
home* with every id and mechanic kept. Slice 9's name moderation and invitation code are designed,
not built.

## Decisions

- 29 Sep 2026: the welcome set is per character (Appendix C #18); the face has no effect (#19).
- [[Review 4]] (6 Oct 2026): one stat choice of +6 / +1 (#91); the faction is chosen in the story;
  eight taps to the first result.
- [[Review 5]] (8 Oct 2026): two rounds of openings rejected (the father; three people waiting for
  a stranger); round 3, *Coming home*, confirmed by the user. The three people are the party
  secretaries (#90).
- 14 Oct 2026 (drift cleanup): GDD §7.4 now says a move needs **Rank 2** (and Level 10), as §5.2 and the code do; GDD §21.4 now starts every character in **the demob suit**.

## Open questions / drift

- Left open by [[qa/review-5-report|QA review 5]] for the user: one name for Stahl (*Viktor Stahl*
  at the counter, *Organiser Stahl* in the decks); the Vanguard's first edition says *Papers in
  order* beside a missing-stamp story (QA suggests *Papers received*); whether *camp* needs a word.

## Related

[[The Morning Paper]] · [[Party Orders]] · [[Ambitions]] · [[Home Cities]] · [[Residence]] ·
[[Stats and Checks]] · [[Levels and Faction Rank]] · [[Jobs]] · [[People of Irongate]] ·
[[Auth and Accounts]]
