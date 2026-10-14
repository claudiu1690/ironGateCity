---
type: history
title: Slice 8 A Life in the City
aliases: [Slice 8, A life in the city]
tags: [slice, designed]
status: designed
dates: 2026-10-04 (designed); not built
commits: [a350253, 3e04e18]
gdd: ["§6.7", "§8.2", "§10", "§12", "§14.12", "§17.1", "§17.2", "§17.3", "§17.4", "§19.3", "§21", "§22"]
adrs: ["0051", "0052", "0053", "0054", "0055", "0056", "0057", "0058"]
updated: 2026-10-14
---

# Slice 8 A Life in the City

**Status: designed only, not built.** Designed on 4 Oct 2026, with an inventory research note.

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 8 — A life in the city|the plan]]: the Dossier, Case Files and exposés; two patrons; wardrobe and equipment (tiers, Charisma, plain clothes for hostile ground); homes (rented room and flat); Legacy and Ambition #1 complete; the Political Season skeleton.

- **Question:** do players have goals for the next month, not just the next session?

## What is planned

- [[Equipment and Wardrobe]]: four plain slots (**Coat · On you · Papers · Tools**), **no weapon slot**; outfits *Town* and *Plain clothes* (a flat adds *Evening*); shops are cards on places; eighteen priced items; recognition on rival ground by Charisma, office and Legacy ([[adr/0051-wardrobe-four-slots-outfits-and-shops|ADR 0051]], [[adr/0052-personal-modifiers-items-perks-and-recognition|ADR 0052]]).
- [[The Dossier]]: entries on named people; three make a Case File (Level 16); an **exposé** prints it in three steps and costs the name's party opinion in their town; a Failure keeps the file. Blackmail and Denounce deferred ([[adr/0053-dossier-entries-collection-counted-not-stored|ADR 0053]], [[adr/0054-expose-a-story-at-the-press|ADR 0054]]).
- [[Patronage and Favours]]: two patrons, **Edith Crane** (the press) and **Julius Marr** (the money), with Favour, Requests and perks ([[adr/0055-patrons-favour-and-requests-by-the-calendar|ADR 0055]]).
- [[Residence|A home]]: **the flat** (2,500 Iron, 150 a week); rent that runs out makes the flat wait, never taken ([[adr/0056-the-flat-prepaid-rent-as-a-day-key|ADR 0056]]).
- [[Legacy]]: a lasting record with perks to spend (MVP, confirmed 14 Oct 2026) ([[adr/0057-legacy-entries-by-natural-ref-credited-in-character-transactions|ADR 0057]]). The Unrest prize's Legacy +2 ([[Review 5]]) waits for this slice.
- [[Ambitions]]: *The Names on the Stone* chapters 4–12; the due chapters of the other two.
- [[Political Seasons]]: 84 days (three terms), a season score, the Season Election, the Champion, awards, the rollover; no track and no twist in season 1 ([[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]]).
- Clearwater's Front opens (four places, society calls).
- **Added 14 Oct 2026, to be designed:** [[Bodyguards]] (prepaid contracts) and bar services with their buffs ([[Bars]], [[Buffs]]: *Well-Fed*, *In Good Spirits*).

## Documents

- Design: [[design/slice-8-life|design/slice-8-life]] (§20 points for the user, §21 settled, §22 review-4 addendum), [[design/slice-8-screens|design/slice-8-screens]], [[design/inventory-research|design/inventory-research]].
- Tech design: [[tech/slice-8|tech/slice-8]]. Updated 14 Oct 2026: the knock-ons from [[tech/review-4|tech/review-4]] §20, [[tech/review-5|tech/review-5]] §18 and [[tech/voting-rework|tech/voting-rework]] §17 are applied; **§1.1 *Added scope*** lists bodyguards and bar services / buffs, still to be designed; the planned migration is now `012-slice8-life` (§5.7, was 010).
- ADRs: [[adr/0051-wardrobe-four-slots-outfits-and-shops|ADR 0051]] to [[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]].

## Decisions made

- Eight **points for the user** with defaults (design §20): no weapons; Crane and Marr; fixed outfit names; a failed exposé keeps its file; the flat is the only paid home; +100 season score per election won (not 10); no track or twist in season 1; Blackmail and Denounce held back. The review-4 guide asked the user to check them; no explicit answer is recorded.
- [[Review 5]] (8 Oct) re-strung the Ambitions away from the father: *The Names on the Stone*, *Who Sold the Homes*, *The Ration Ledger*; the coat is **the demob suit**. No number moved.
- **14 Oct 2026 (the user, drift cleanup): [[Bodyguards]], [[Legacy]] perks and the bar services with their buffs ([[Bars]], [[Buffs]]) are MVP and join this slice**, not built yet. Legacy perks were already designed here; bodyguards and bar services still need the game-designer's slice-8 design update, then the architect's technical design. Open details: [[GDD#Appendix C — Open questions|Appendix C #110]] (bodyguard prices, where they're hired) and #111 (Well-Fed above max, prices). *Lodged* and *Weatherproof* stay out for now (pending the user).

- The plan now lists the flat only (the room is built, as slice 4's Lodgings card).
- Still open (the user, drift row A9): what rule runs between the season's rollover and the next count ([[Political Seasons]]).

## QA and leftovers

Not built, so no QA. Open defaults: GDD Appendix C #74–#81 (see [[Open Questions]]).

## Commits

`a350253` design (4 Oct) · `3e04e18` tech design, ADRs 0051–0058 and the inventory research (4 Oct).

## Related

- Previous: [[Slice 7 The Nation]] · Next: [[Slice 9 Launch Readiness]]
