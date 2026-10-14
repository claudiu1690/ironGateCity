---
type: runbook
title: Keep the Wiki Current
aliases: [update the wiki, wiki update, UPDATE operation]
tags: [process, wiki]
updated: 2026-10-14
---

# Keep the Wiki Current

**Use when:** you finish a slice, a phase, a review round, a QA report, a GDD change, a content
change or an ADR. This is the UPDATE operation of the [[CLAUDE|wiki manual]], as a checklist. The
GDD wins on rules and numbers, the code wins on what is built; the wiki summarises and links.

## Steps

1. **Read `index.md`** and open the pages for every system, entity and tech area the work touched.
2. **Each touched system page:**
   - **Status**: built in which slice or round; what is still designed only.
   - **Where it lives**: new or moved files (`packages/rules/src/…`, services, models, content
     files, client features), new ADRs, design and tech doc sections.
   - **How it works**: only the headline rules and numbers, if they changed; link the GDD §.
   - **Decisions**: the user's calls, with the date and the round.
3. **Entities**: new places, missions, people or quarters on the city, faction and
   [[People of Irongate]] pages.
4. **Tech pages**: a new pattern, package, job or model on the right tech page.
5. **History**: add or update the page for the slice or round (what was built, phases and commits,
   QA and leftovers) and add the user's decisions to [[Decision Log]].
6. **New ADR** → link it from every system and tech page it affects (and its `adrs:` frontmatter).
7. **Questions**: move resolved items out of [[Open Questions]] and [[Drift Report]]; add new
   leftovers and any GDD vs content vs code mismatch (also as a `> [!warning] Drift` callout on the
   page). Mark guesses as `> [!note] Inference`.
8. **New page?** Use the template in `_templates/`, give it full frontmatter, and link it from at
   least one existing page.
9. **Bump `updated:`** on every page you edited.
10. **`index.md`**: add new pages and fix one-liners that changed.
11. **`log.md`**: one entry at the top, `## [YYYY-MM-DD] update | <title>`, then 1–3 lines saying
    what changed and which pages.

## Checks before done

- Links use exact titles; GDD links use the exact heading text; other docs use folder paths
  (`[[tech/slice-5|…]]`).
- No big tables of numbers copied from the GDD.
- Plain words, campaign vocabulary, faction names as the GDD has them.
- Nothing claimed as built that the code doesn't have.

## Related

[[Run a Slice]] · [[Run a Design Review Round]] · [[Drift Report]] · [[Open Questions]] ·
[[Decision Log]]
