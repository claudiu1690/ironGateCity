---
type: overview
title: Log
updated: 2026-10-15
---

# Log

Append-only record of every change to the wiki. Newest first. Each entry header is
`## [YYYY-MM-DD] <op> | <title>` (op: build, update, ingest, query, lint, note).

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
