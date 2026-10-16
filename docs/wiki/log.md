---
type: overview
title: Log
updated: 2026-10-16
---

# Log

Append-only record of every change to the wiki. Newest first. Each entry header is
`## [YYYY-MM-DD] <op> | <title>` (op: build, update, ingest, query, lint, note).

## [2026-10-16] update | Slice 7 phase C rulings: Parliament's stall, four strings, six alt texts

The designer settled the quiet-month stall (every home in Unrest, a bill lost 1–0–59): the −3 at an
unvoted count was the cause; in Unrest the locals now vote the secretary's line and the −3 needs an
eligible voter (GDD §0, §14.11, §15.6, Appendix C #112; economy §21.6a; design *Settled 16 Oct 2026
(phase C)* with the code changes for the developer). Content: the first journey card is
destination-neutral, `nl.leader-line` opens with words, the Governor headlines and copy use `{title}`
or *Mayor*; six final alt texts in design §23.8 with a flag on the law book's window. Updated
[[The Legislature and Laws]], [[Home Cities]], [[Slice 7 The Nation]], [[Decision Log]],
[[Open Questions]] (S7-C1 closed, C#112 added), [[Drift Report]] (D-S7C-1 open, code pending).

## [2026-10-16] build | Slice 7 phase C, lane Y: the nation map, Clearwater, the Governor, the paper

The nation map's bar, law chips, pins' second line and republic sheet; Clearwater's screens; the Me
tab's office cards and ladder; the Governor's page; the paper's national section, second Election
row, desk lines, orders' target bar and office front pages; the Officers channel, the dev panel's
ballot and petition buttons, the Chair's handover fix, the eleven personal lines. Specs `clearwater`
and `governor`. Updated [[Slice 7 The Nation]], [[Offices]], [[National Control]], [[Clearwater]],
[[The Morning Paper]], [[Party Orders]], [[Chat and Presence]], [[Dev Panel and Local Setup]].

## [2026-10-16] build | Slice 7 phase C, lane X: Parliament, the Chair, the elections, petitions

The Chair's desk and chip, the Chair's election and the vote on the Chair, Parliament and the law
book, the party's pick and the republic's election and result, the President's page, the petition
page; the chair, nation, removal and petition specs. Updated [[Slice 7 The Nation]].

## [2026-10-15] build | Slice 7 phase B, lane 1 finished

The Governor's rule and Address, the office pages' reads, the party cards at the set through
`partyCardOf`, the Chair's fixtures, the record's law fade everywhere, the settlement and paper v7, the
dev panel's nation block, the Chair's tie (H1 closed). Updated [[Slice 7 The Nation]], [[Offices]],
[[Party Orders]], [[The Morning Paper]], [[Dev Panel and Local Setup]], [[Drift Report]].

## [2026-10-15] update | Slice 7: the Chair's tie settled (S7-T14)

The game-designer ruled on the Chair's count: *beat the game's own figure* means strictly more, so
the secretary wins an exact tie (ties: votes, then the secretary before any player, then backers,
completed terms, filing). Recorded in `docs/design/slice-7-nation.md` (§4.1 and a new *Settled
15 Oct 2026 (phase B)* section with the one-comparator change for `countChair`), GDD §15.4 and §0.
Code not yet changed (a [[Drift Report]] row). Updated [[Open Questions]] (S7-T14 closed),
[[National Elections]], [[Slice 7 The Nation]], the [[Decision Log]].

## [2026-10-15] build | Slice 7 phase B, lane 1: the nation's day, Clearwater, the Governor

The developer's T11 (the nation's day, laws in every modifier, `nation.get`), T12 (Clearwater's
city day and the city playable), T13 in part (the Governor at every count), T20 in part (every
office's stipend) and T21 in part (the term, nation and office hooks; the events spec's clock).
Updated [[Slice 7 The Nation]], [[Clearwater]], [[National Control]], [[index]].

## [2026-10-15] build | Slice 7 phase B, lane 2: the nation's acts

The developer's T14–T19 on the server: the Chair's election, Parliament and laws, the Chair's desk
and the party's target, the national election, the President's powers and removals, petitions and
the vote on the Chair; their routers and the nation's day handlers; two fixes in shared code (the
boundary's ObjectIds, the push on order items). Checked with scratch scripts; one question raised
(the Chair's tie). Updated [[Slice 7 The Nation]], [[National Elections]], [[The Legislature and Laws]],
[[Recall and Removal]], [[Offices]], [[Party Orders]], [[Open Questions]].

## [2026-10-15] update | Slice 7 phase A: the designer's four questions settled

The game-designer answered the developer's phase-A questions in `docs/design/slice-7-nation.md`
(*Settled 15 Oct 2026 (phase A)*): §6.3's one-ballot example corrected to 21 / 20 / 19 (D'Hondt on
the exact scores, the build was right; the GDD does not repeat the example); the three trimmed alt
texts checked against the pictures and kept; `governorOf` changed so a first-term councillor is never
Governor (the bloc's top unseated local holds the chair instead); the portrait crops and the scenes'
full frame confirmed. The *The Front* / *ballot* allowances move to the T30 Playwright sweeps.
Updated [[Slice 7 The Nation]], [[Decision Log]].

## [2026-10-15] build | Slice 7 phase A: rules, schemas, art, DB

The developer's T1–T6, T9 and T10: the term, the ladder, National Control and the counts, Parliament,
laws as effects, the councils' chain, orders v3, the petitions' gates; the content schemas and checks
with the designer's content bound; the art; the seven collections and migration 011; Clearwater's city
day held for phase B. Updated [[Slice 7 The Nation]], [[National Control]], [[National Elections]],
[[The Legislature and Laws]], [[Recall and Removal]], [[Offices]], [[Clearwater]], [[index]].

## [2026-10-15] build | Review 7: the Faction tab as the Branch Office

The user picked direction A for note #1: paper from the HUD down, the HQ scene as a 128 px plate
(180 on desktop) with *{City} branch · {n} here now*, the crest SVG as a seal over its edge, the name
and *{rank} · {n} members* on paper, a ruled strip whose current part has three cues, the compact
letterhead and paper chips on Chat, *The room* head on the desktop column. Also *Reich* off the
refuse list (the user: keep *dyke*, add nothing). Screens §2 rewritten to the build. Updated
[[Review 7]], [[Slice 6 Together]] (drift closed), [[Chat and Presence]], [[Campaign Events]],
[[Moderation and Fair Play]], [[Decision Log]].

## [2026-10-15] build | Slice 7 content: Clearwater and the nation (T7, T8)

The game-designer's phase-A content: Clearwater's city file, missions, jobs, slate, six Issues and the lake rotation; the thirteen laws; the factions' figures, deputies, platforms and houses; families and the push; the Town Hall and its venues; the national lines, the personal lines in five voices and the Courier; the 26 modals; chapter 3 *The list*; `copy.nation`. The design doc gains an "Added 15 Oct 2026" note with the departures and the developer's bindings. Updated [[Clearwater]], [[Slice 7 The Nation]], [[Drift Report]] (C6), [[Open Questions]] (S7-C), [[index]].

## [2026-10-15] update | Slice 7 approved: the seven defaults, the build starts

The user approved `docs/design/slice-7-nation.md` §21 as written (the President only; the secretary and the figure on every ballot; petitions dissolve; the secretaries' bills; Clearwater evened; The Front as later pins; several offices). GDD §0 row and Appendix C #64, #65, #66, #68, #70 marked; economy §21.7 noted. Updated [[Slice 7 The Nation]] (building), [[Decision Log]], [[Open Questions]], [[index]], [[overview]].

## [2026-10-15] build | Review 7: the chat word filter, the invite, Give Iron

The user's Design Review 4 notes #2 and #3 (design §23): the word filter on the server (`apps/server/src/moderation/`, `obscenity` 0.4.6; slurs and real-world hate refused, swearing masked as *b—*, names refused on either tier), the invite naming its event (*Invite to the rally · 19:40*, hidden when there is nothing to ask, the venue in the chat line, a toast), *Invite someone* on the event page, the help notes *The editor* and *Invite*, and the dev panel's *Give 2,000 Iron*. New [[Review 7]]; updated [[Chat and Presence]], [[Moderation and Fair Play]], [[Slice 6 Together]], [[Decision Log]], [[index]].

## [2026-10-15] build | Slice 6 fix round

QA m1 (concurrent same-key *Join*: stored result, `eventSignups` in `assertKeyFree`), m2 (`HeldReleaseGate` in the shell: the release on every screen), m3 approved as built; the *Settles at* and *Campaign event* notes on the board; the paper's swing trimmed; the review-4 sweeps' *canvass* allowance removed; tech docs tidied (30 venues, the Doorstep Drive). Build notes for the user: [[review/slice-6-build-notes]]. Updated [[Slice 6 Together]], [[Campaign Events]], [[Open Questions]] (S6-1 to S6-3 closed).

## [2026-10-15] note | Slice 6 QA

QA of slice 6 on the risk areas: no blocker or major; two minor findings (m1 concurrent same-key *Join*, m2 `/faction` while a release is unseen) and one known deviation (no withdrawal modal). The `qa-voting` tie failure was a race in the test (fixed). Report [[qa/slice-6-report]]; new e2e project `qa-together`. Updated [[Slice 6 Together]], [[Open Questions]].

## [2026-10-15] update | Slice 6 wording rulings (the Doorstep Drive, swing precision, phase B defaults)

The designer's phase C rulings in design §22 #9–12: *Canvass Drive* / *Canvasser* renamed **Doorstep
Drive** / **Door-knocker** in content, the GDD (§0, §16.3) and the slice-6 and slice-7 design docs;
swings print to two decimals trimmed (GDD §14.2); the two phase-B defaults confirmed. Slice 6 marked
built, in QA. Updated [[Campaign Events]], [[Slice 6 Together]], [[Decision Log]], [[overview]], [[index]].

## [2026-10-15] build | Slice 6 phase C, lane A (the Faction tab, events, presence, e2e, report)

The `/faction` shell, Orders and Events, the event page in every state, the call sheet, the event
result modal and its gate, the venue's tickets, *Here now*, the plate's count, the dev panel's
*Together* buttons (T18–T20); `events.spec.ts`, the slice-6 word sweep and the report's *together*
section (T24); the README, the Deviations and ADRs 0036–0042 accepted (T25). Updated
[[Slice 6 Together]], [[Campaign Events]], [[Chat and Presence]].

## [2026-10-15] build | Slice 6 phase C, lane B (Members, scoreboard, chat, favours)

T21–T23: Members, the profile, the faction scoreboard, chat with the socket client, favours from
every entry point, the paper's and held screens' lines; `faction` and `favours` e2e projects.
Updated [[Slice 6 Together]], [[Chat and Presence]], [[Patronage and Favours]].

## [2026-10-15] build | Slice 6 phase B (the server)

T8–T16 built in `21929a7`: events (call, sign-up, withdraw, resolution, credit, fixtures), the Faction
tab's reads, favours, chat with the Socket.IO push socket, presence, the paper's event parts, the
test hooks; T17 as a scratch script. Updated [[Slice 6 Together]], [[Campaign Events]],
[[Chat and Presence]], [[Patronage and Favours]].

## [2026-10-15] build | Slice 6 phase A (rules, content, art, db)

T1–T7 built: event maths, presence, chat, favours and the scoreboard's scopes in rules; six event
types and 30 venues in content; the two event scenes; the five new collections and migration 010.
The ledger choice is (b), an attribution log. Updated [[Slice 6 Together]], [[Campaign Events]],
[[Chat and Presence]], [[Patronage and Favours]], [[Influence Ledger and City Hero]].

## [2026-10-15] build | Review 6 leftovers

R6-1 (the journey held sideways: plate beside the map) and R6-2 (the city's map buttons stack from
640 to 767 px, measured) closed; the dev clock's offset kept in the database across API restarts,
and a clear `CLOCK_BEHIND` dev error instead of a 409 loop; the night trail checked (unchanged).
Updated [[Review 6]], [[Open Questions]] (R6-1, R6-2 closed), [[Dev Panel and Local Setup]],
[[Travel and Journeys]], [[Quarters and the Map]].

## [2026-10-15] update | Slice 6: the seven defaults approved

The user approved all seven defaults of the slice-6 design (§19) as written; no number moves and
the build is under way. Marked in the design doc, GDD §0 (15 Oct) and Appendix C #57, #59, #60,
#89; updated [[Slice 6 Together]] (status: building), [[Decision Log]], [[Open Questions]]
(rows S7–S9, C#57/#59/#60/#89, C#58/#62/#63). Not touched (another agent's build is in flight):
[[index]] and [[overview]] still call slice 6 "designed only".

## [2026-10-15] build | Review 6

Three fixes from the user's Design Review 3: the nation map held sideways (no 420 px floor), the
city's map buttons in one row, the dotted and smoothed journey trail. New [[Review 6]]; updated
[[Travel and Journeys]], [[Quarters and the Map]], [[Open Questions]] (R6-1, R6-2), [[Decision Log]], [[index]].

## [2026-10-14] update | Drift cleanup

The user decided: bodyguards, Legacy perks and bar buffs/services are MVP (slice 8, not built yet);
faction-only places come later; the project `CLAUDE.md` is slimmed to the rules plus wiki pointers.
The game-designer fixed the GDD, design docs and Clearwater's content baseline (App C #108–#111
added); the architect amended 16 ADRs, added ADR 0087, rewrote the plan as built (local until the
end) and applied the knock-ons to tech/slice-6…9. 66 wiki pages updated to match; the
[[Drift Report]] went from about 75 rows to 6 open; [[Decision Log]], [[Open Questions]] and
[[index]] updated. Link check clean.

## [2026-10-14] build | The wiki is created

The wiki was set up in `docs/wiki/`, with `docs/` as the Obsidian vault, modelled on the zeus-brain
vault. Added the operating manual ([[CLAUDE]]), templates, [[index]], [[overview]], this log, and
the first full set of 106 pages: 55 systems, 9 entities, 14 tech, 17 history (slices 0–9,
reviews 1–5, the voting rework, the [[Decision Log]]), 6 runbooks, [[Open Questions]] and the
[[Drift Report]]. Every page was checked against the code. A link check passed: every wiki link,
GDD heading anchor and `adr/`/`design/`/`tech/`/`qa/` path resolves. The build found about 75 drift
items (biggest group: old voting wording left in the GDD and ADRs after the rework) and 22 new open
questions (section D of [[Open Questions]]). The project `CLAUDE.md` and the four agent files now
point agents at the wiki and tell them to update it at the end of every piece of work.
