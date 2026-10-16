---
type: history
title: Slice 8 A Life in the City
aliases: [Slice 8, A life in the city]
tags: [slice, building]
status: building
dates: 2026-10-04 (designed); 2026-10-16 (approved; the season deferred; bodyguards and the bar designed; phase A started)
commits: [a350253, 3e04e18, 2bcd5d1, bcc6cef, 11d2c41, 065ad16, cf934e2]
gdd: ["§6.7", "§8.2", "§10", "§12", "§14.12", "§17.1", "§17.2", "§17.3", "§17.4", "§19.3", "§21", "§22"]
adrs: ["0051", "0052", "0053", "0054", "0055", "0056", "0057", "0058", "0088"]
updated: 2026-10-16
---

# Slice 8 A Life in the City

**Status: building (phase A started 16 Oct 2026).** Designed on 4 Oct 2026, with an inventory research note; **approved by the user on 16 Oct 2026** (design §20's eight defaults as written), with **Political Seasons deferred** out of the slice and **bodyguards and the bar services with their buffs designed the same day** ([[design/slice-8-life#24. Bodyguards and the bar (added scope, designed 16 Oct 2026)|design §24]]).

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 8 — A life in the city|the plan]]: the Dossier, Case Files and exposés; two patrons; wardrobe and equipment (tiers, Charisma, plain clothes for hostile ground); homes (rented room and flat); Legacy and Ambition #1 complete. ~~The Political Season skeleton~~: **deferred on 16 Oct 2026** (below).

- **Question:** do players have goals for the next month, not just the next session?

## What is planned

- [[Equipment and Wardrobe]]: four plain slots (**Coat · On you · Papers · Tools**), **no weapon slot**; outfits *Town* and *Plain clothes* (a flat adds *Evening*); shops are cards on places; eighteen priced items; recognition on rival ground by Charisma, office and Legacy ([[adr/0051-wardrobe-four-slots-outfits-and-shops|ADR 0051]], [[adr/0052-personal-modifiers-items-perks-and-recognition|ADR 0052]]).
- [[The Dossier]]: entries on named people; three make a Case File (Level 16); an **exposé** prints it in three steps and costs the name's party opinion in their town; a Failure keeps the file. Blackmail and Denounce deferred ([[adr/0053-dossier-entries-collection-counted-not-stored|ADR 0053]], [[adr/0054-expose-a-story-at-the-press|ADR 0054]]).
- [[Patronage and Favours]]: two patrons, **Edith Crane** (the press) and **Julius Marr** (the money), with Favour, Requests and perks ([[adr/0055-patrons-favour-and-requests-by-the-calendar|ADR 0055]]).
- [[Residence|A home]]: **the flat** (2,500 Iron, 150 a week); rent that runs out makes the flat wait, never taken ([[adr/0056-the-flat-prepaid-rent-as-a-day-key|ADR 0056]]).
- [[Legacy]]: a lasting record with perks to spend (MVP, confirmed 14 Oct 2026) ([[adr/0057-legacy-entries-by-natural-ref-credited-in-character-transactions|ADR 0057]]). The Unrest prize's Legacy +2 ([[Review 5]]) waits for this slice.
- [[Ambitions]]: *The Names on the Stone* chapters 4–12; the due chapters of the other two.
- ~~[[Political Seasons]]~~ **deferred (the user, 16 Oct 2026)**: the 84-day season, the score, the Season Election, the Champion, the awards, the Hall of Fame, the rollover and the finale move to a later slice ([[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]] *Deferred*).
- Clearwater's Front opens (four places, society calls).
- **[[Bodyguards]]** (added 14 Oct, designed 16 Oct 2026, design §24.2): *someone to walk with you*: a doorman (Level 6, **400** a week), a steward (Rank 3, **1,200**), a minder (Level 16, **3,000**), one at a time, hired at **the party store**, prepaid, renewed by hand (four weeks ahead at most, no auto-renew); in a run-in a visible row, ***{Name} steps in***, at the Fight formula with his power (28 / 36 / 44); **never against the police**; a lapse ends the row and nothing else. Three new portraits.
- **[[Bars]] and [[Buffs]]** (designed 16 Oct 2026, design §24.3): the bar's card with *Buy a round* (30 Iron, 2 Energy, three a day → *in good spirits*, +10 % XP on the next three missions, nine in hand at most) and *A plate of something* (100 → *well fed*, +10 % XP for four hours, Health +15 up to max); the hotel's *Dinner* (400, Charisma 10 → +10 % XP and Iron for six hours, Health +25); the back room as designed. Overhearing is the bar's existing ticket; the barman's report, the stimulant and recruitment are cut. Two new item pictures.
- **What the season's deferral changes in the slice** (design §23): Legacy's Champion and award rows wait; the season's paper lines and the desk's season clock go; the republic sheet's season card, the Hall of Fame and the *Champion of Season n* titles are not built; nothing ends a law or a council rule at a season; the spymaster's count waits; the vocabulary test drops *season* and *Champion*. The month-long goals that remain: a Case File, a patron's tier, a Request, the rent, a chapter's date, a bodyguard's week.

## Documents

- Design: [[design/slice-8-life|design/slice-8-life]] (§20 approved, §21 settled, §22 review-4 addendum, **§23 the season deferred and what it changes, §24 bodyguards and the bar**: rules, copy, modals, paper lines, help notes, economy, art, five points for the user in §24.7), [[design/slice-8-screens|design/slice-8-screens]] (§11 deferred; **§18 the hire card, the bar's card, the dining room**), [[design/inventory-research|design/inventory-research]]. Economy: [[economy|economy sheet]] §22 (§22.8 deferred; **§22.11 bodyguards and the bar**). GDD: §0 (16 Oct), §6.7, §12, §19.3, §20.1, §18.3, §22's status, §25; Appendix C #110 and #111 closed, **#113** (never against the police) and **#114** (the buffs' levers) added.
- Tech design: [[tech/slice-8|tech/slice-8]]. **16 Oct 2026: §24 bodyguards and the bar** ([[adr/0088-bodyguards-a-run-in-row-on-a-day-key-contract-and-bar-buffs-as-lazy-personal-modifiers|ADR 0088]]; tasks T26–T29 in phase A, T30–T31 in phase B, T32 in phase C). **Updated 16 Oct 2026: seasons cut out** (a dated note at the top lists what moved, what is kept and the forward-compatibility rules; §20's tasks rewritten, T15 deferred, T18 plays a month instead of a season, `season.spec.ts` dropped). Updated 14 Oct 2026: the knock-ons from [[tech/review-4|tech/review-4]] §20, [[tech/review-5|tech/review-5]] §18 and [[tech/voting-rework|tech/voting-rework]] §17 are applied; **§1.1 *Added scope*** lists bodyguards and bar services / buffs, still to be designed; the planned migration is now `012-slice8-life` (§5.7, was 010).
- ADRs: [[adr/0051-wardrobe-four-slots-outfits-and-shops|ADR 0051]] to [[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]].

## Decisions made

- **16 Oct 2026 (the user): "let's leave the seasons for later".** The Political Season is deferred out of slice 8; the other design §20 defaults are **approved**: no weapons; Crane and Marr; fixed outfit names; a failed exposé keeps its file; the flat is the only paid home; Blackmail and Denounce held back (and the two season rules, +100 per election and no track or twist in season 1, wait with the season). [[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]] is *Deferred*; [[tech/slice-8|tech/slice-8]] *Seasons deferred (16 Oct 2026)* lists what moved. Phase A starts the same day.
- [[Review 5]] (8 Oct) re-strung the Ambitions away from the father: *The Names on the Stone*, *Who Sold the Homes*, *The Ration Ledger*; the coat is **the demob suit**. No number moved.
- **16 Oct 2026 (the designer, under the 14 Oct decision):** bodyguards and the bar designed (above); Appendix C #110 and #111 closed. **Five designer defaults for the user** (design §24.7): never against the police; all three tiers at the party store; one at a time with no mid-week replacement; three services (the barman's report cut); no Health above max.
- **14 Oct 2026 (the user, drift cleanup): [[Bodyguards]], [[Legacy]] perks and the bar services with their buffs ([[Bars]], [[Buffs]]) are MVP and join this slice.** *Lodged* and *Weatherproof* stay out for now (pending the user).

- The plan now lists the flat only (the room is built, as slice 4's Lodgings card).
- Parked with the season (drift row A9): what rule runs between the season's rollover and the next count ([[Political Seasons]]).

## Content (T6 and T27's data, 16 Oct 2026, the designer)

Written in `packages/content` (lint, typecheck and a throwaway `loadContent()` run are green with the unbound data spliced in):

- `data/items.ts`: the nineteen items (coats 200–20,000, the badge, the hat, the watch, the pen, the case, the ribbon, forged papers, the press pass, paste and brush, the camera, wire cutters) and ten new keepsakes; every keepsake has `keepsakeFrom` and a *Read* text (design §21.3; the list's receipt re-strung for the voting rework).
- `shops` on twenty places: five clothes stalls, six party stores (`hire: true`), three tailors (the Grand Hotel adds the three-piece suit), two press shops (Gazette House adds the correspondent's suit), five back rooms (`bribe: true`); `bar: true` on the seven bars, `dining: true` on the three dining rooms.
- **The Front** (`cities/clearwater.ts`): the Promenade, the Lido and the Pier Hotel as places on their survey pins with eight tier-1 actions and the blurbs of design §16.3; the Casino's two actions, back room and scene; the Pier Hotel's tailor, `patronId: 'marr'` and dining room. Society calls (`missions/clearwater.ts`, `missions/irongate.ts`): the six of design §3.7 plus *The late table* (Marr) and *The morgue file* (Crane, surveillance, `dossier.subject: 'choose'`).
- `data/patrons.ts` (new): Crane and Marr, twelve Requests word for word; `people.ts`: the two NPCs and `extraNames` (Brandauer); `data/dossier.ts` (new): the twenty lines; `held.ts`, `journeyEvents.ts`, `issues.ts`: the Dossier payloads and the two Issues that feed exposés.
- `data/ambitions.ts`: *The Names on the Stone* 4–12 (chapter 7's Favour, chapter 12's `completes` and the ribbon), *The night caretaker* (Brandauer's entry), *The collector* (choice B 100 Iron), teasers for *The archive* and *The parcel*.
- `data/lifeHeadlines.ts` (new): fifteen personal lines in five voices; `data/bodyguards.ts`: the three tiers.
- `data/copy.ts`: a `life` block (the Wardrobe, shops, the Dossier, the exposé's texts, patrons, the flat, Legacy's words and perks, the desk's clocks, recognition, society calls, the modals and knock-ons, refusals, the twelve help notes, bodyguards and the bar).
- GDD §12.1 (*on a mission*; four weeks ahead) and §19.3 (the rounds' and meals' rules) carry the designer's answers to tech §24.10; design §24.8 records them.

**Bound (the developer, `91f1503`):** `load.ts` carries `patrons`, `dossierLines`, `extraNames` and `lifeHeadlines` and allows `LIFE_PLACEHOLDERS`. `art.ts` adds `portrait.crane`, `portrait.marr` and a `social` mission card (`scene.hotel`). The bodyguards' two lines are now headline rows on T26's conditions, with his name as `{minder}`. See [[Open Questions]] S8-T6 and the [[Drift Report]] S8-1–S8-3.

## Phase A as built (16 Oct 2026, the developer)

What landed (details in [[tech/slice-8#Deviations (as built)|the tech design's Deviations, phase A]]):

- **Rules:**
  - `items.ts` v2: four slots, outfits, `wearGate`, the effect bounds;
  - `shop.ts`, `personal.ts` (item rows, Party XP parts, the perk effects, the bar's `buffShares`) and `recognition.ts`;
  - `dossier.ts` (entries, Case Files, informants, the exposé), `applyToNeutral`, and `feedMatches` for `expose`;
  - `patrons.ts` (`patronDays` by the calendar), `home.ts` (the flat's rent as a day key), `legacy.ts` (with review 5's Unrest prize +2), and the chapters' milestones;
  - `CountLine.bonus` and `scoreBonus`; Rested at the boundary; the Monday perk;
  - `bodyguard.ts`, `buffs.ts` and the run-in's minder row (`minded`);
  - `lifeTypes.ts`: conditions, acts, errors and placeholders.
- **Content** (`slice8.ts`): the schemas, the accessors (`shopsAt`, `names`, `patronOf`, `societyCalls`…) and the cross-checks, including `barProblems`. The designer's data is bound and loads through every check.
- **Art:** eighteen Wardrobe items, three scenes, the bar's two items, the three bodyguards and the two patrons. Nothing was missing from the art folder. The set is 25.38 MB.
- **DB:** `dossierEntries`, `legacyEntries`, the life fields on `characters` (and the bodyguard and buffs), the encounter's minder, and migration 012 steps 1–3 with the Legacy backfill.
- **Not built:** the season (deferred) and the §8.3 views (phase B).
- **Testing:** scratch scripts only, under the user's rule. The fast check is green. The `missions`, `rival`, `travel`, `capital`, `home-map` and `clearwater` Playwright projects pass. One `phone` test (`canvass.spec.ts`, a sub-pixel pin ratio) fails and is left for QA.

## Phase B, lane 1 as built (16 Oct 2026, the developer)

- **T9, personal modifiers:** worn Charisma with the flat; item rows, Party XP parts and buff shares on every tier-1 action and mission; recognition in every rival-ground run-in roll; *Talk your way out* reads the Papers slot; the society door and the patron's introduction on the mission gate; the flat and the perk in the Rested cap, and the boundary's Rested (the room's 10, the flat's 25) banked by the settlement; the Wardrobe's procedures, dressing for arrival, outfits at the join.
- **T10, shops:** buy, sell and the back room's bribe, each one keyed transaction; the record's surcharge; a sale leaves every outfit.
- **T30, bodyguards:** hire and renew, the card, his row at every run-in (never against the police), *minded* with his own line.
- **T31, the bar:** a round, a plate, dinner; the buffs on the receipts; a round in hand spent at a mission's start.
- **Not built:** T13 (society calls through `missionService`, `patronService`), forged papers at the checkpoint, `presence.recognised`. A place's cards and the Me tab's line are queries of their own (`life.place`, `life.me`). Details: [[tech/slice-8|tech/slice-8]] *Deviations, Phase B, lane 1*.

## QA and leftovers

Phase A built 16 Oct 2026; no QA yet. Leftovers: `canvass.spec.ts` *all six pins on the first view* fails on `phone` (pin 3's viewport ratio is 0.9999998). **Settled by the designer, 16 Oct 2026 (design §24.9):** a Request counts a Success or a Partial and never a Failure (as built; GDD §15.4's party-orders rule); the seven alt texts are final in design §19 and §24.6 (the doorman, the steward and the minder corrected; the developer passes them into `art.ts`); the `social` mission card stays `scene.hotel`, and the Casino's two calls should carry `card: 'scene.casino'` ([[Drift Report]] S8-4; **done `310a86f`**, with the final alt texts). New in phase B: `qa-risk`'s *360 × 640 / 812 × 375: the quarter* fails on the plate's share bar (360 × 6 under the 44 px rule), and `clearwater` was flaky once. To watch: GDD Appendix C #74–#79 (approved defaults), #113, #114, and design §24.7's five (see [[Open Questions]]).

## Commits

`a350253` design (4 Oct) · `3e04e18` tech design, ADRs 0051–0058 and the inventory research (4 Oct) · phase A (16 Oct): `2bcd5d1` T1 · `11d2c41` T5 · `bcc6cef` T2 · `7798bc8` T7/T28 · `065ad16` T3 · `cf934e2` T27 schema · `6d43735` T4 · `bc4a8f6` T8/T29 · `2e346df` T26 · `91f1503` T6 binding · `18ef217` the Clearwater spec · `6d3787c` Deviations · phase B lane 1 (16 Oct): `310a86f` the designer's alt texts and the Casino's cards · `bc29e2d` T9 · `96d8c20` T10, T30, T31.

## Related

- Previous: [[Slice 7 The Nation]] · Next: [[Slice 9 Launch Readiness]]
