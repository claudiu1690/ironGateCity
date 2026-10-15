---
type: overview
title: Log
updated: 2026-10-15
---

# Log

Append-only record of every change to the wiki. Newest first. Each entry header is
`## [YYYY-MM-DD] <op> | <title>` (op: build, update, ingest, query, lint, note).

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
