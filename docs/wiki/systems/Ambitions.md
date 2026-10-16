---
type: system
title: Ambitions
aliases: [Ambition, Chapters, The Names on the Stone, Who Sold the Homes, The Ration Ledger, Keepsakes chapters]
tags: [story, tier-3, long-term]
status: partly built
slice: "2 (chapter 1s); 3 and 5 (two chapter 2s); re-anchored in review 5; more chapters designed for 7 and 8"
gdd: ["§17.1", "§13.1"]
adrs: ["0013"]
updated: 2026-10-16
---

# Ambitions

## In one paragraph

An Ambition is a **personal storyline that runs for months**, separate from the faction. The player picks one in the opening (the envelope of post on the train home) and plays it as **chapters**: short tier-3 stories that open one at a time, at most one a week, as the player climbs. It gives a reason to care about the city that isn't just numbers. Since [[Review 5]] the three Ambitions are anchored to *Coming home* (the father is gone from the story); ids and numbers did not change.

## How it works

- **The three** ([[GDD#17.1 Ambitions (new)|GDD §17.1]]):
  - ***The Names on the Stone*** (`finish-his-work`): forty of your unit are left off the town's memorial; get them on, which takes a seat. Campaigning, offices, speeches.
  - ***Who Sold the Homes*** (`clear-his-name`): requisitioned flats sold while their people were away; the signature belongs to a rising man. The Dossier, Case Files, exposés.
  - ***The Ration Ledger*** (`settle-his-debts`): a ring drew your family's rations; pay, betray or take them over. Iron, Heat, the back room, patrons.
- **12 chapters** each. A chapter opens when its **requirement** is met (a Level, a Rank, a first ballot, a Case File, an office) and **seven City Days** have passed since the last one.
- **A chapter is a tier-3 story of at most three steps**: a choice with no roll (remembered as a flag), one check with **three ways** (two story stats and ***Legwork***, your best stat), then the result. **A chapter never fails**: Success, Partial or Failure change the text and rewards, and the chapter completes on any outcome. Resumable (`ambition { id, chapter, step, flags }`).
- **Chapter 1** opens on arrival as a **Letter** in the welcome paper: **10 Energy, difficulty 8**, Success 150 XP / 40 Party XP / 100 Iron, a keepsake on every outcome. Later chapters pay more (300 / 80 / 150 for chapter 2).
- **No standing, no orders, no run-ins:** chapter checks count for neither [[Local Standing]] nor [[Party Orders]], and home-city chapters trigger no encounter. A chapter's way may carry Heat (*The riverside house*: the quiet way +6 Heat).
- **The Paper tab's dot** shows while a chapter is ready. The result shows the next chapter's hook with its date and requirement (*From Tuesday 6 October, at Rank 2*).
- **Rewards** over the run: keepsakes ([[Equipment and Wardrobe]]), patron Favour, and **Legacy 30** for completing an Ambition ([[Legacy]]).
- **MVP scope:** all three choosable; *The Names on the Stone* built to twelve chapters, the other two to four by launch ([[GDD#25. Scope and roadmap|GDD §25]], Appendix C #6).

## Where it lives

**Rules:** [[GDD#17.1 Ambitions (new)|GDD §17.1]] · [[design/review-5-answers#19.6 The long story, re-anchored (no father; the ladder, its numbers and every id kept)|review-5 answers §19.6]] and §19.10 (the built scripts) · [[design/slice-2-onboarding|slice-2 onboarding §3]] (superseded scripts) · [[design/slice-8-life|slice-8 design §8, §16.1–§16.2]] (chapters 4–12) · [[design/voting-simplified|voting-simplified §8.11–§8.12]] (chapter 3) · [[adr/0013-tier-3-stories-shared-view-no-interpreter|ADR 0013]]

**Code:**
- Rules: `packages/rules/src/ambition.ts`; `AMBITION { daysBetweenChapters: 7, chaptersPlanned: 12 }`, `CHAPTER` in `constants.ts`
- Server: `apps/server/src/services/ambitionService.ts` (`ambitionView`, `getAmbition`, `chooseChapter`, `attemptChapter`), `story.ts` · router `apps/server/src/trpc/routers/ambition.ts` (`get`, `choose`, `attempt`)
- Data: content `packages/content/src/data/ambitions.ts` (since T6, 16 Oct 2026: *The Names on the Stone* 1–12 complete, *Who Sold the Homes* 1–2 with *The archive* as a teaser, *The Ration Ledger* 1–3 with *The parcel* as a teaser); keepsakes in `items.ts` (every one with `keepsakeFrom` and a *Read* text); embedded `characters.ambition`
- Client: `apps/client/src/routes/ambition.tsx` · `packages/ui/src/components/Story.tsx`

## Status

**Built:** chapter 1 of all three ([[Slice 2 Arrival|slice 2]]); *Stand for the stone* ([[Slice 3 The First Vote|slice 3]]); *The riverside house* ([[Slice 5 Risk|slice 5]]); all re-strung in [[Review 5]]. Content also holds the titles of the next chapters as teasers (*The list*, *The night caretaker*, *The collector*). **Content written, server to come (slice 8):** *The Names on the Stone* 4–12 (the keepsakes, chapter 7's Favour +5, chapter 12's completion and the ribbon), *The night caretaker* (Brandauer's entry by hand) and *The collector* (choice B pays 100 Iron), T6, 16 Oct 2026; their requirement kinds read `characters.milestones` (rules T3). *The list* (chapter 3) was built with slice 7.

## Decisions

- Review 1: every chapter check has a *Legwork* way at your best stat.
- Appendix C #6: *The Names on the Stone* is built to twelve first.
- 8 Oct 2026, review 5: the father is gone; Ambitions re-anchored to *Coming home*; ids kept.
- 10 Oct 2026 (voting simplified, §8.12): chapter 3 is named *The list*, for the list the name goes on.

## Open questions / drift

- Chapter 3 of *The Names on the Stone* was briefly *The ten marks* ([[design/voting-simplified|voting-simplified]] §8.11.1); §8.12 row 7 renamed it *The list*, keepsake *Your line on the list*. GDD and `ambitions.ts` agree. §8.11.1 is now headed *The list* too, and its knock-on line says chapter 4 comes **after a completed council term**, as GDD §17.1 and the slice-8 design do (fixed 14 Oct 2026; it said *after your first council seat*). The slice-7 design's §13 is also headed *The list*.

## Related

[[Legacy]] · [[Patronage and Favours]] · [[The Dossier]] · [[Equipment and Wardrobe]] · [[The Morning Paper]] · [[Coming Home]] · [[Offices]] · [[Heat and Record]]
