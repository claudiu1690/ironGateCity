---
type: system
title: Political Seasons
aliases: [Season, Political Season, Season Election, Season Champion, Rollover, Season rollover, Hall of Fame, Season Twists, Season track, Season Standing]
tags: [seasons, nation, retention]
status: designed
slice: "8 (designed, not built); track and twists later"
gdd: ["§2", "§2.1", "§22", "§25"]
adrs: ["0058", "0043"]
updated: 2026-10-14
---

# Political Seasons

## In one paragraph

A **Political Season** is one in-game year: 84 City Days (12 weeks, three 28-day terms), ending
in the **Season Election**. Each party builds a **season's score** from how much of the republic it
holds each day plus national elections won; the top party is the **Champion**. At the turn of the
season the map **settles halfway back** to its starting balance, laws and council rules end and
Heat goes to zero, but everything a player owns stays. Seasons give the game structure and let
newcomers compete on fair terms. Designed for slice 8, **not built**.

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

**Rules:** [[GDD#22. Political Seasons (new)|GDD §22]] · [[design/slice-8-life|slice 8 design §9]] · [[tech/slice-8|slice 8 tech spec]] (§6.10 `season.ts`, `seasonService`) · [[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]] · [[adr/0043-nation-day-term-calendar-and-the-republic-document|ADR 0043]] (the term epoch)

**Code:** none yet. Planned: `packages/rules/src/season.ts`, `seasonService` (`seasonFinaleInTx`), a `seasons` collection, `nation.season` on the `nation` document (itself slice 7).

## Status

- **Designed, not built** (slice 8). It depends on slice 7's term calendar and `nation` document.
- The free and premium tracks are launch + 60 days; twists from later seasons ([[GDD#25. Scope and roadmap|GDD §25]]).

## Decisions

- **No season track and no twist in season 1** (Appendix C #80): the slice's question is whether players have month-long goals, which the Dossier, patrons, the flat and the Ambition answer.
- **The election bonus is 100, not 10** (Appendix C #81): at 10 an election was a third of one day's lead.
- Twist renames from the content-policy review: *The Uprising* → **The Upset**; *Martial Law in Duskwall* → **Direct Rule in Duskwall**.

## Open questions / drift

> [!warning] Drift
> **Rollover vs "a city always has a rule".** GDD §22.2 says every council rule in force ends at rollover and "the councils' next **order papers** start the rules again"; [[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]] §4 says the city's rule ends and "the count and **division** of that boundary run first". Order papers and divisions no longer exist after the voting rework, whose rule is that a city always has a rule (ADR 0083). The slice-8 knock-on note in `docs/tech/slice-8.md` does not address this. What runs in a city between the rollover and its next count is unsettled.

- Reading note: §22.1's first bullet still says "plus 10 per national election won"; the slice-8 paragraph under it says "the 10 above is raised" to **100**. The later paragraph wins.

- Appendix C #5 (season length 12 weeks or 8) is still open.

## Related

[[National Elections]] · [[National Control]] · [[Legacy]] · [[Heat and Record]] · [[Issues of the Week]] · [[Ordinances]] · [[The Legislature and Laws]] · [[Monetisation]] · [[Slice 8 A Life in the City]]
