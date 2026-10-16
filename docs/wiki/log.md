---
type: overview
title: Log
updated: 2026-10-16
---

# Log

Append-only record of every change to the wiki. Newest first. Each entry header is
`## [YYYY-MM-DD] <op> | <title>` (op: build, update, ingest, query, lint, note).

## [2026-10-16] build | Slice 8 phase B, lane 2

The server for the Dossier, the exposé (and the Headline Story's Case File), the flat, Legacy, the
chapters' new steps and the paper's life lines; lane 1's test hooks and dev-panel buttons; the
canvass spec's sub-pixel pin (from slice 7's fix round). Updated [[The Dossier]], [[Legacy]],
[[Residence]], [[The Morning Paper]], [[Ambitions]], [[Slice 8 A Life in the City]], [[index]].

## [2026-10-16] build | Slice 8 phase B, lane 1

The server for the Wardrobe and personal modifiers (T9), shops (T10), bodyguards (T30) and the bar
(T31), with the designer's final alt texts and the Casino's society cards (Drift S8-4 closed).
Updated [[Equipment and Wardrobe]], [[Bodyguards]], [[Bars]], [[Buffs]], [[Slice 8 A Life in the City]],
[[Drift Report]]. T13 (society calls and patrons) is not built yet.

## [2026-10-16] update | Slice 8 phase A questions settled

The designer answered the developer's three phase-A questions in `design/slice-8-life.md` §24.9: a patron Request counts a Success or a Partial and never a Failure (as built; the party orders' rule of GDD §15.4; pinned in design §5.3 and §16.5); the seven slice-8 alt texts checked against the pictures and made final in design §19 (Crane, Marr) and §24.6 (the doorman, steward, minder, plate and round; three corrected, all under 160 characters; the developer passes them into `art.ts`); the `social` mission card stays `scene.hotel`, with the Casino's two calls to carry `card: 'scene.casino'`. Wiki: [[Patronage and Favours]], [[Bars]], [[Slice 8 A Life in the City]], [[Open Questions]] S8-T6, [[Drift Report]] S8-2 and a new S8-4.

## [2026-10-16] build | Slice 8 phase A (rules, content schemas, art, DB)

The developer built slice 8's phase A without the season: the rules (the Wardrobe, shops, personal modifiers, recognition, the Dossier and the exposé, patrons, the flat, Legacy, the chapters' milestones, the counts' endorsement, bodyguards and the bar's buffs), the content schemas, accessors and cross-checks (and bound the designer's data), the art (nothing missing; 25.38 MB), and the DB with migration 012. Updated [[Slice 8 A Life in the City]] (phase A, commits, leftovers). The details are in `docs/tech/slice-8.md`'s Deviations, phase A.

## [2026-10-16] update | Slice 8 content (T6, T27 data)

The designer wrote slice 8's content into `packages/content`: the 41-item catalogue with `keepsakeFrom` and *Read* texts, shops on twenty places (hire, bar and dining flags), the Front's four places with eight actions and seven society calls (the late table and the morgue file among them), Crane and Marr with twelve Requests, the Dossier's lines and Brandauer, chapters 4–12 of *The Names on the Stone* and the two due chapters, fifteen personal lines in five voices, the bodyguards' tiers, and a `copy.life` block (the modals, help notes, bodyguards and the bar). GDD §12.1 and §19.3 and design §24.8 record the answers to tech §24.10 (the card shows a mission's odds). Updated [[Equipment and Wardrobe]], [[The Dossier]], [[Patronage and Favours]], [[Legacy]], [[Residence]], [[Ambitions]], [[Bodyguards]], [[Bars]], [[Buffs]], [[Clearwater]], [[People of Irongate]], [[Content Package]], [[Slice 8 A Life in the City]], [[Decision Log]], [[Open Questions]] (S8-T6), [[Drift Report]] (S8-1–S8-3), [[index]].

## [2026-10-16] update | Slice 8 tech: bodyguards and the bar

[[tech/slice-8|tech/slice-8]] §24 is the technical design for the designer's §24: the contract `bodyguard { tier, name, paidThroughDay }` (a day key; no job, no auto-renew); his run-in row `minder`, frozen on the encounter and never against the police; `bar.round`, `bar.meal`, `bar.dinner`; the buffs as lazy state read as named parts through `PersonalModifiers`. It also covers content, migration 012's additions, test hooks, the modals and seven questions for the designer (Q7: the card's 62 % is a mission's figure). Tasks T26–T29 (phase A), T30–T31 (phase B), T32 (phase C); *Done when* is a scratch script or Playwright. New [[adr/0088-bodyguards-a-run-in-row-on-a-day-key-contract-and-bar-buffs-as-lazy-personal-modifiers|ADR 0088]]. Updated [[Bodyguards]], [[Bars]], [[Buffs]], [[Slice 8 A Life in the City]].

## [2026-10-16] update | Slice 8 approved, seasons deferred, bodyguards and the bar designed

The user approved design §20's eight defaults and deferred Political Seasons out of slice 8. The designer recorded both (GDD §0, §4.1, §17.3, §22's status, §25, Appendix C #5, #80, #81; design §23 lists what leaned on the season and what replaces it: the Legacy rows wait, the season's paper lines and desk clock go, nothing ends a law or a rule at a season) and designed the added scope in design §24: **bodyguards** (a doorman 400, a steward 1,200, a minder 3,000 a week at the party store; a visible *{Name} steps in* row at the Fight formula with his power 28 / 36 / 44; never against the police; no auto-renew) and **the bar** (a round 30, a plate 100, the hotel's dinner 400; *well fed* and *in good spirits* at +10 % XP; Health up to max; the barman, the stimulant and recruitment cut). GDD §6.7, §12, §18.3, §19.3, §20.1 rewritten; Appendix C #110, #111 closed, #113, #114 added; economy §22.11; screens §18; five art prompts (three portraits, two items). Updated [[Slice 8 A Life in the City]], [[Bodyguards]], [[Bars]], [[Buffs]], [[Political Seasons]], [[Legacy]], [[Health]], [[Run-ins and Combat]], [[Iron Marks and the Economy]], [[Decision Log]], [[Open Questions]] (C#110, C#111 closed; S8-24 added), [[Drift Report]] (B19–B21), `index.md`.

## [2026-10-16] update | Slice 8 tech: seasons deferred

The user: "let's leave the seasons for later"; the other design §20 defaults approved. [[tech/slice-8|tech/slice-8]] gains a dated *Seasons deferred* note (what moves to a later slice, what is kept and why: the counts' Protégé and perk bonuses, the Heat perk, `used.day`; the forward-compatibility rules), every season line marked deferred, §20's tasks rewritten (T15 deferred, T3 takes the counts' bonuses, T18 plays a month, `season.spec.ts` dropped). [[adr/0058-the-political-season-calendar-score-finale-and-rollover|ADR 0058]] *Deferred*; ADR 0057 notes its season parts. The plan's slice 8 entries. Updated [[Slice 8 A Life in the City]], [[Political Seasons]], [[Legacy]], [[Time and the Game Day]], [[Decision Log]], [[Drift Report]] (A9 parked), [[Open Questions]] (W-1, C#5 parked; C#74–#81 approved), `index.md`, `overview.md`.

## [2026-10-16] build | Slice 7 fix round

QA's M1 and m1 fixed, D-S7I-3b bound, the Chair's turnout clamped. The law book's rows name the tabler and the real division (stored on `nation.laws.inForce` at enactment, with a fallback to the bill); the share bar under the home plate is a labelled button for the plate's notes again, and the rule line's 44 px target ends at its top (the plate 12 px taller where the rule line is last); the Mayor's caption reads `captions.governorOrMayor` (the old `captions.governor` deleted); the Chair's result never shows more voters than the roll. Playwright `qa-nation` 7/7 (new checks for the law book and the bar), `chair`, `nation`, `clearwater`, `governor`, `review6` and `review1` (phone) green. [[review/slice-7-build-notes|Build notes]] for the user. Updated [[Slice 7 The Nation]], [[The Legislature and Laws]], [[Drift Report]] (D-S7I-3b and D-S7Q-1 resolved), [[Open Questions]], `index.md`.

## [2026-10-16] update | Slice 7 QA m2: one bill a term is tabling only

The designer confirmed the build's reading of GDD §15.6: a member tables one bill a term (from whichever office) and votes on every bill. Wording fixed in §15.6, a §0 row added, `design/slice-7-nation.md` §5.2 and its settled-table row 16 matched; `copy.nation.help.deputy` already said it. No numbers moved. Closed item (3) of the slice-7 QA list in [[Open Questions]].

## [2026-10-16] note | Slice 7 QA report

[[qa/slice-7-report|QA report]]: the `qa-nation` project (7 tests) passes; one major (the law book's tabler and division are placeholders), one minor (the plate's share bar), one wording question (*one bill per member per term*). Updated [[Slice 7 The Nation]], [[Open Questions]], [[Drift Report]].

## [2026-10-16] update | Slice 7 integration flags D-S7I-1 to D-S7I-3 settled by the designer

The Collective's event order line reworded (*on the doorsteps tonight*; no other player-facing
*canvass* in content); the law chips hidden on upright phones ≤ 700 px confirmed and screens §14
rewritten; `copy.nation.paper.captions.governorOrMayor(name, title, city)` added for the Mayor's
front-page caption, with the binding left to the developer (new row D-S7I-3b). Design
`slice-7-nation.md` *Settled 16 Oct (phase C)* §6, `slice-6-together.md` §12's table. Updated
[[Drift Report]] (three rows resolved, one added), [[National Control]], [[Offices]],
[[Slice 7 The Nation]].

## [2026-10-16] update | Slice 7 integration: the six scenes, T30, T31, the full e2e green

Six scenes wired (the Casino, the polling station, the law book, the tram depot, the Governor's
office, the lake harbour; scenes bound by place; the art set 24.02 MB, budget 24.52); the
designer's phase C rulings built (D-S7C-1 resolved); lane Y's issues fixed; the vocabulary sweeps
and the playtest report's *nation* section; every Playwright project green. Updated
[[Slice 7 The Nation]] (built, QA next), [[The Legislature and Laws]], [[National Control]],
[[National Elections]], [[Recall and Removal]], [[Offices]], [[Party Orders]], [[Clearwater]],
[[Art and Maps Pipeline]], [[Checks and Testing]], [[Dev Panel and Local Setup]], [[Drift Report]]
(D-S7I-1 to D-S7I-3 added), `index.md`.

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
