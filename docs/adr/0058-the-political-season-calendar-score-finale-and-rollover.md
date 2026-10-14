# ADR 0058 — The Political Season: three terms from the term epoch, a running score on `nation`, a finale at season day 0, and a rollover split by owner

**Status:** proposed (slice 8; extends ADR 0043); decision 4 under review since the voting rework (ADR 0083), awaiting the user (drift row A9) · **Date:** 2026-10-04

## Amendment (14 Oct 2026, partial)

Decision 4 names "the count and division of that boundary". Councils have no division since the voting rework (ADR 0083): the boundary into season day 0 holds the count of the town's rule vote (and, on a set day, the set). Decision 4 also ends "its council rule in force on day 83", which conflicts with ADR 0083's "a city always has a rule". **Which wins (the rule runs out its window, the season ends it and card 1 / the fallback takes over, or something else) is the user's call** (drift row A9, GDD §22.2); this ADR is not changed until then.

## Context

GDD §22 and design §9: a season is three terms (84 City Days) from the term epoch; the Season Election is the third term's national election (counted into season day 83, confirmed into the next season's day 0). The score per party is the sum over the season's boundaries of its control share plus 100 per national election won. The Champion (the top score) gives every member of 14 days Legacy +5 and a title; four awards (*Top of the ledger* per Level bracket, *Most titles*, *Best orator*, *The spymaster*) give Legacy +5 and a title each; the Hall of Fame keeps every season. **The rollover** moves every city's and district's opinion halfway back to its baseline (a home city never below 50), ends every law and council rule in force, sets Heat to 0 and reshuffles the Issue deck; everything a player owns stays. The design suggests a `seasons` collection and a rollover job after the national seating.

ADR 0043: the nation's day settles each boundary after every city, by a job and by the first request. ADR 0017: each city's boundary is its own transaction. ADR 0020: the world never writes a character.

## Decision

1. **The calendar is pure**: `seasonOf(day)` from `TERM.epochDay`, 84 days; season day 0 is always a term day 0 and a Monday. The season the nation bootstraps in is *Season 1*.
2. **The running score lives on `nation.season`** (control shares summed in thousandths, the elections won with their party), updated by the nation's day at every boundary and by the take-office step at term day 0 (to the old season when that day is also season day 0). The season card reads it from the document every request already loads.
3. **The finale** runs in the nation's day at season day 0, after the Season Election is seated: the scores, the Champion (ties: elections won, the last control share, the seeded draw), the three Presidents, the four awards from data that already exists (a new contributions scope `season|{s}`; `awards`; `eventSignups`; `dossierEntries.used`), one **`seasons`** document (`_id` unique), `nation.lastSeason`, the laws in force on day 83 ended (`endedBy: 'season'`), and the national front page.
4. **The rollover is split by owner**:
   - each **city's** boundary into season day 0 ends with `seasonResetCity`: its meters halfway to baseline (ledger rows of kind `season`) and its council rule in force on day 83 ended. The count and division of that boundary run first, on the season's opinion; Monday's draw ignores last week's Issues;
   - the **nation's day** ends the laws (above);
   - **Heat to 0 is lazy**: a Heat stamped before the season's start projects as 0 from it;
   - the season's counters reset because their keys carry the season.
5. **Legacy for the Champion and the awards is credited lazily** by each member's settlement from the `seasons` documents (ADR 0057).
6. **No new job.** The finale and the resets ride `nation-day` and `city-day` and their lazy paths.

## Consequences

- No bulk write to characters at the finale, however many members a faction has.
- The finale's transaction carries four bounded aggregations; measured in the integration suite, with a guarded second transaction as the fallback.
- A season track or twists (post-MVP) attach to `nation.season` and the finale without changing the calendar.
- Choosing launch day as season 1's start moves the term epoch (ADR 0043's migration).
