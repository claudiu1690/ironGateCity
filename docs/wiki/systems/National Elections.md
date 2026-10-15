---
type: system
title: National Elections
aliases: [National election, Season Election, The republic's vote, The party's pick, President election, Acclamation, Congress, Convention]
tags: [politics, nation, elections]
status: designed
slice: "7 (designed, not built)"
gdd: ["§2", "§15.2", "§15.5", "§15.10", "§22"]
adrs: ["0043", "0047", "0062"]
updated: 2026-10-15
---

# National Elections

## In one paragraph

Every 28-day **term** the republic elects a **President** and fills Parliament's **sixty seats**.
Each party first picks its candidate for President; then every Rank 2+ player votes for one of
the three candidates, from anywhere. A party's score mixes its share of the votes with its share
of who holds the republic ([[National Control]]), so everyday street work wins elections even when
few people vote. The top score takes the Presidency, and the sixty seats split by D'Hondt down
each party's list. The third election of a season is the **Season Election**. All of this is
designed for slice 7 and **not built**.

## How it works

- **Calendar** (term days, [[GDD#2. Time model|GDD §2]]; [[GDD#15.5 National elections|GDD §15.5]]): **names in 19–20** · **the party's pick 21–22** · **voting and backing 23–26** · **the count** at the boundary into day 27, printed *to be confirmed tomorrow* · **office from the next term's day 0**. Term day 0 is always a Monday, from a fixed epoch. No phase has a clock time.
- **Names in:**
  - **President:** Rank 6 · a completed deputy term · 14 days in the faction · not a sitting President in a second term · **100 PC** (returned only on a withdrawal before the pick) · **two pledges** from the law catalogue (a pledge is kept when that law passes during the term) · a platform line.
  - **The party's list (Parliament):** Rank 5 · a completed Governor term or three council terms · 14 days · **25 PC**.
  - No backers needed for either.
- **The party's pick** (*the Acclamation* / *the Congress* / *the Convention*): the faction's Rank 2+ members choose, one tap, secret, final, among declared candidates **and the party's own figure** (run by the game; see [[NPC Fill]]). No declared candidate: the figure stands unopposed.
- **The ballot:** every Rank 2+ player, from anywhere, one of the three candidates, any party, secret, final.
- **Backing:** Rank 2+, 10 PC, one per member per term, public: for the party's candidate (**+1 to the party's score, at most +5**) or for a name on the party's list (orders the list).
- **The party's score:** `w × ballotShare + (100 − w) × controlShare + min(5, backers)`, with `w = 50 × min(1, ballots ÷ 30)` (full weight from **thirty ballots** across the republic). The player reads *the party's score mixes its share of the votes with its share of who holds the republic, plus its backers*.
- **The result:** the highest score is President (ties: ballots, control share, a seeded draw). **Sixty seats by D'Hondt**; each party's seats go to its presidential candidate (if not elected), then its list by backers, then its local deputies. At the baselines three scores of 33.3 split 20 / 20 / 20.
- **The 24-hour audit:** the result is provisional on day 27 and confirms itself at day 0 unless a moderator acts ([[GDD#15.2 Integrity rules|GDD §15.2]]; [[Moderation and Fair Play]]).
- **At most two consecutive terms** as President. Powers and pay: [[Offices]].
- **Bootstrap:** the seed installs a party figure (from a seeded draw) as President for term 0, sixty local deputies at 20 / 20 / 20, the secretaries as acting Chairs and a local Governor in every city: "there is a government on day one".
- **Season Election:** the third term's count of a season; it feeds the season's score (+100 per national election won; [[Political Seasons]]).

## Where it lives

- **Rules (built, slice 7 phase A):** `term.ts` (the windows, `nationWork`), `national.ts` (`nationalScores`, `countNation` with slice 4's `dhondt`, `partyList`, `seatList`, `countPick`, `countChair`, `freezeChairList`, `confidenceResult`), `ladder.ts` (`standGate`). Collections `nationalElections` and `factionElections` (`packages/db/src/models/nation.ts`); candidacies gain `kind`, `termIndex`, `pledges`, `platformId`. Services and screens are phase B and C.
**Rules:** [[GDD#15.5 National elections|GDD §15.5]] · [[design/slice-7-nation#6. The national election|slice 7 design §6]] · [[tech/slice-7|slice 7 tech spec]] (§6.4 `national.ts`) · [[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]] (the term calendar and the `nation` document) · [[adr/0047-elections-above-the-council-reuse-the-box|ADR 0047]] (reuse `candidacies` and the numbered ballot box; `nationalElections`) · [[adr/0062-the-national-audit-self-confirms-and-council-recounts|ADR 0062]] (the audit)

**Code:** none yet. Planned: `packages/rules/src/term.ts` (`termOf`), `national.ts` (`nationalControl`, `nationalScores`, `countNation`, `partyList`, `countPick`), a `nationDay` settle step and `nation-day` Agenda job, a `nationalElections` collection, keys `pick:{faction}:{term}` and `nation:{term}` in the existing `votes` and `candidacies`. The client has a `/nation` route today, but it is the nation **map** (travel), not elections.

## Status

- **Designed, not built** (slice 7). No term calendar, `nation` document or national count exists in the code.
- The voting rework changed nothing here: the national ballot is still a vote for a person with two pledged laws ([[tech/voting-rework|tech §17]] item 7).

## Decisions

- **One office at the top, the President**: the first draft's Chancellor, 55 % line and coalition rule are removed (Appendix C #64).
- **The weight at thirty ballots** answers Appendix C #2 nationally (the capital's rule at three times the scale).
- **The list is ordered by backers** (Appendix C #72).
- **Linked accounts count once, silently; the audit confirms itself at day 0** (Appendix C #82, #83; slice 9).
- 14 Oct 2026 (drift cleanup): [[adr/0047-elections-above-the-council-reuse-the-box|ADR 0047]] amended (no backers, no deposits, no small-branch rule), matching GDD §15.4. Personal vote appeal gathered into one place in GDD §15.5.

## Open questions / drift

- Appendix C #2 (is 50 / 50 right at low population?) and #5 (season length) stay open.
- **Personal vote appeal** ([[GDD#Appendix C — Open questions|Appendix C #108]]): §8.2 (+1 % per 10 worn Charisma), §11.3 (*Notorious* −5 %) and §17.3 (*A name they know*) are now one term, `appeal`, that **slice 8 adds** to a candidate's own count (a home total, a battleground total, the President's ballot). Until then no formula has an appeal term and nothing built reads one. How the percentages become points on a total and on a party's score is pinned with slice 8.

## Related

[[Offices]] · [[The Legislature and Laws]] · [[Recall and Removal]] · [[National Control]] · [[NPC Fill]] · [[Political Seasons]] · [[Moderation and Fair Play]] · [[Slice 7 The Nation]]
