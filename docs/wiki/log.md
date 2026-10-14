---
type: overview
title: Log
updated: 2026-10-14
---

# Log

Append-only record of every change to the wiki. Newest first. Each entry header is
`## [YYYY-MM-DD] <op> | <title>` (op: build, update, ingest, query, lint, note).

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
