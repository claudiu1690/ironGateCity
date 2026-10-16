---
type: system
title: Political Seasons
aliases: [Season, Political Season, Season Election, Season Champion, Rollover, Season rollover, Hall of Fame, Season Twists, Season track, Season Standing]
tags: [seasons, nation, retention]
status: parked
slice: "deferred out of slice 8 on 16 Oct 2026 (a later slice, not yet placed); track and twists later"
gdd: ["§2", "§2.1", "§22", "§25"]
adrs: ["0058", "0043"]
updated: 2026-10-16
---

# Political Seasons

## In one paragraph

A **Political Season** is one in-game year: 84 City Days (12 weeks, three 28-day terms), ending
in the **Season Election**. Each party builds a **season's score** from how much of the republic it
holds each day plus national elections won; the top party is the **Champion**. At the turn of the
season the map **settles halfway back** to its starting balance, laws and council rules end and
Heat goes to zero, but everything a player owns stays. Seasons give the game structure and let
newcomers compete on fair terms. Designed for slice 8, then **deferred on 16 Oct 2026** (the user: "let's leave the seasons for later"): not built, and not yet placed in a later slice.

## How it works

- **Calendar** ([[GDD#2. Time model|GDD §2]], [[GDD#2.1 A season at a glance|§2.1]]): a season is three terms from the term epoch; `seasonDay = (dayKey − TERM_EPOCH) mod 84`. **The Season Election is the third term's national election** ([[National Elections]]).
- **The season's score** ([[GDD#22.1 Season end|GDD §22.1]]): per faction, the sum over the season's boundaries of **the party's control share** ([[National Control]]) **+ 100 per national election won**.
- **The Champion:** the top score at the confirmation. Every member in the faction for 14 days gets **Legacy +5** and the title *Champion of Season n* ([[Legacy]]).
- **Four awards** (Legacy +5 and a title each): *Top of the ledger* (one per Level bracket), *Most titles* (Hero titles), *Best orator* (Triumphs as Speaker or Organiser), *The spymaster* (Case Files used).
- **The Hall of Fame:** a `seasons` document per season (the Champion, the scores, the three Presidents, the award holders), with a page off Parliament.
- **Rollover** ([[GDD#22.2 Rollover (the first day of the new season)|GDD §22.2]]), the new season's day-0 boundary:
  - **Resets:** every city's and district's opinion moves **50 % of the way to its baseline** (a home city never below 50); **every law and council rule in force ends**; Heat to 0; the Issue deck reshuffled; the season's counters cleared.
  - **Stays:** Level, Rank, stats, items, Iron, the home and its rent, Political Capital, Favour, Legacy, the Dossier, the record, Ambition progress, seniority, residence, offices won.
  - The player reads *the map settled halfway; your coat, your flat and your Dossier are where you left them*.
- **Season Twists** ([[GDD#22.3 Season Twists|§22.3]]): one rule change per season, announced a week ahead (*The Long Winter*, *Free Press Spring*, *The Upset*…). **None in season 1.**
- **Season track** ([[GDD#22.4 Season track|§22.4]]): a free 30-tier track and a cosmetic-only premium track. **Not built in slice 8.**

**Technical shape** ([[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]]): the calendar is pure (`seasonOf(day)`, season day 0 is always a term day 0 and a Monday); the running score lives on `nation.season`; the finale runs in the nation's day at season day 0 after the Season Election is seated; the rollover is split by owner (each city's boundary resets its meters and ends its rule; the nation's day ends the laws; Heat to 0 is lazy); Legacy is credited lazily by each member's settlement; **no new job**.

## Where it lives

**What the deferral changes in slice 8** ([[design/slice-8-life#23. Approved; the season deferred (the user, 16 Oct 2026)|design §23]]): the two Legacy rows (Champion, an award) wait; the season's paper lines, the desk's season clock, the republic sheet's season card, the Hall of Fame and the *Champion of Season n* titles are not built; **nothing ends a law or a council rule at a season** (they run as slice 7 built them); the spymaster's count waits; the QA vocabulary test drops *season* and *Champion*; the exposé's twist multiplier is a constant 1. GDD §22 carries the status at its top; §17.3's two rows read *with seasons, deferred*; §25's row moved to *launch + 60 days*; Appendix C #5, #80 and #81 are marked deferred.

**Rules:** [[GDD#22. Political Seasons (new)|GDD §22]] (status note, 16 Oct 2026) · [[design/slice-8-life|slice 8 design §9 (kept), §23 (deferred)]] · [[tech/slice-8|slice 8 tech spec]] (§6.10 `season.ts`, `seasonService`) · [[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]] · [[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]] (the term epoch)

**Code:** none. Deferred design: `packages/rules/src/season.ts`, `seasonService` (`seasonFinaleInTx`), a `seasons` collection, `nation.season` on the `nation` document (itself slice 7). What slice 8 keeps so it can be added later without a data migration is in [[tech/slice-8|tech/slice-8]] *Seasons deferred (16 Oct 2026)* (the season stays a pure function of the term epoch; the Legacy refs `champion:{s}` and `award:{s}:…` are reserved; Heat is read through one projection that `heatAt` can wrap).

## Status

- **Deferred (16 Oct 2026)**, designed but not built; it was slice 8. It depends on slice 7's term calendar and `nation` document (built). [[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]] is *Deferred*.
- The free and premium tracks are launch + 60 days; twists from later seasons ([[GDD#25. Scope and roadmap|GDD §25]]).

## Decisions

- **16 Oct 2026, the user: "let's leave the seasons for later".** Out of slice 8; the rest of slice 8 is built without it.
- **No season track and no twist in season 1** (Appendix C #80): the slice's question is whether players have month-long goals, which the Dossier, patrons, the flat and the Ambition answer.
- **The election bonus is 100, not 10** (Appendix C #81): at 10 an election was a third of one day's lead.
- Twist renames from the content-policy review: *The Uprising* → **The Upset**; *Martial Law in Duskwall* → **Direct Rule in Duskwall**.

## Open questions / drift

> [!warning] Drift
> **Rollover vs "a city always has a rule".** GDD §22.2 says every council rule in force ends at rollover and "the councils' next **order papers** start the rules again"; [[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]] §4 says the city's rule ends and "the count and **division** of that boundary run first". Order papers and divisions no longer exist after the voting rework, whose rule is that a city always has a rule (ADR 0083). Since 14 Oct 2026 ADR 0058 carries a partial amendment (no division; which wins is the user's call) and [[tech/slice-8|tech/slice-8]] marks the rule cut at rollover as pending that call. **Parked with the season (drift row A9, 16 Oct 2026):** does the rule run out its window, does the season end it with card 1 or the fallback taking over, or something else?

- Reading note: §22.1's first bullet still says "plus 10 per national election won"; the slice-8 paragraph under it says "the 10 above is raised" to **100**. The later paragraph wins.

- Appendix C #5 (season length 12 weeks or 8) is still open.

## Related

[[National Elections]] · [[National Control]] · [[Legacy]] · [[Heat and Record]] · [[Issues of the Week]] · [[Ordinances]] · [[The Legislature and Laws]] · [[Monetisation]] · [[Slice 8 A Life in the City]]
