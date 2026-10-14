---
type: history
title: Slice 7 The Nation
aliases: [Slice 7, The nation]
tags: [slice, designed]
status: designed
dates: 2026-10-04 (designed); not built
commits: [1f8172a, ef6b697]
gdd: ["§2", "§14.1", "§14.8", "§15.1", "§15.4", "§15.5", "§15.6", "§15.8", "§15.9", "§15.10", "§17.1"]
adrs: ["0043", "0044", "0045", "0046", "0047", "0048", "0049", "0050"]
updated: 2026-10-14
---

# Slice 7 The Nation

**Status: designed only, not built.** Designed on 4 Oct 2026; amended by [[Review 4]], [[Review 5]] and the [[Voting Rework]].

## Goal and playtest question

From [[IMPLEMENTATION_PLAN#Slice 7 — The nation|the plan]]: the rest of the office ladder (Governor/Mayor, Faction Chair, Parliament, national elections, the President), laws with fixed bounds and a 5-law cap, Clearwater as the second battleground, National Control weights 40/30/10/10/10, recall petitions and no-confidence votes.

- **Question:** does holding office feel powerful, and does losing it make players want to fight back?

## What is planned

- **Terms of 28 City Days** from a fixed epoch, with fixed windows for every vote; never a required online time ([[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]]).
- [[Offices]]: the **Governor** (the largest bloc's top councillor), the elected **Chair** of each party (standing orders, the push, the party line), **60 deputies** and **the President** (one law a week, one veto, an Address); no Chancellor. Several offices at once are allowed ([[adr/0046-faction-document-chair-standing-orders-and-push|ADR 0046]], [[adr/0048-offices-on-office-terms-and-the-ladder|ADR 0048]]).
- [[The Legislature and Laws]]: thirteen laws, at most five in force; 31 of 60 passes, 36 for a factional law; laws are a third modifier source and never touch Party XP or the odds ([[adr/0044-laws-a-third-modifier-source|ADR 0044]], [[adr/0045-parliament-bills-slots-and-computed-local-deputies|ADR 0045]]).
- [[National Elections]], reusing the ballot box ([[adr/0047-elections-above-the-council-reuse-the-box|ADR 0047]]).
- [[Clearwater]] as a single-meter battleground with a seven-seat council and the Casino as its hall ([[adr/0050-clearwater-single-meter-battleground|ADR 0050]]).
- [[National Control]]: 0.40 × Irongate + 0.30 × Clearwater + 0.10 × each home.
- [[Recall and Removal]]: a petition **dissolves** a council; a vote removes the President; a vote on a Chair ([[adr/0049-petitions-dissolution-and-removals|ADR 0049]]).
- Ambition chapter 3, now *The list*.

## Documents

- Design: [[design/slice-7-nation|design/slice-7-nation]] (§21 points for the user, §23 settled; review 4, review 5 and voting addenda) and [[design/slice-7-screens|design/slice-7-screens]].
- Tech design: [[tech/slice-7|tech/slice-7]]. Largely rewritten on 14 Oct 2026 with the knock-ons from [[tech/review-4|tech/review-4]] §20, [[tech/review-5|tech/review-5]] §18 and [[tech/voting-rework|tech/voting-rework]] §17 applied: the party's card from `partyCardOf` (Governor or Mayor at the head), `countDistrict` → `countBattleground`, `decideCapitalRule` → `decideBlocRule` (§6.8); petitions close before the set and leave the rule to run out its window. The planned migration is now `011-slice7-nation` (§5.10, was 009).
- ADRs: [[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]] to [[adr/0050-clearwater-single-meter-battleground|ADR 0050]]; [[adr/0047-elections-above-the-council-reuse-the-box|0047]] (no backers or deposits), [[adr/0048-offices-on-office-terms-and-the-ladder|0048]] (Governor's rule = card 1) and [[adr/0049-petitions-dissolution-and-removals|0049]] (the rule runs out its window) amended 14 Oct 2026.
- GDD: [[GDD#15. The Political Engine|GDD §15]], [[GDD#14.8 National Control|GDD §14.8]].

## Decisions made

- Seven **points for the user** with defaults (design §21): the President only; the secretary always on the Chair's ballot; petitions dissolve rather than call a snap election; the secretaries table bills for parties with no player in Parliament; Clearwater's start evened to 22 / 22 / 22 / 34; the Front a teaser until slice 8; several offices at once. The review-4 guide asked the user to check them; no explicit answer is recorded.
- **Voting simplified (user, 10 Oct 2026)** changed this slice's design: the Governor sets card 1; the Chair's rule is card 1 wherever no Governor sits; the Chair stands for **25 PC, spent, no backers needed**.

- 14 Oct 2026 (drift cleanup): [[design/slice-7-nation|design §13]] is now headed ***The list*** (keepsake *Your line on the list*); the design's ladder table says no backers needed; its old Governor's-rule bullet is marked superseded; §10.1 lets a dissolved council's rule run out its window. The plan names petitions that dissolve a council and votes to remove the President. Clearwater's card shows 22 / 22 / 22 / 34.
- Open (designer): confirm `partyCardOf`'s chain against the GDD wording ([[City Council and the Rule Vote]]).

## QA and leftovers

Not built, so no QA. Open defaults: GDD Appendix C #64–#73 (see [[Open Questions]]).

## Commits

`1f8172a` design, art done (4 Oct) · `ef6b697` tech design and ADRs 0043–0050 (4 Oct). Voting addenda in `9067c94` (10 Oct).

## Related

- Previous: [[Slice 6 Together]] · Next: [[Slice 8 A Life in the City]]
