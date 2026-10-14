# Irongate wiki — operating manual

This folder is a **persistent, cross-linked wiki** about Irongate City, written and kept current by
the AI. It is not a copy of the GDD. It is the **map**: for each system, entity and slice it says in
plain words how it works, where the rules live (GDD §, design doc, ADR), where the code lives, what
is built, what was decided and why, and what is still open. Knowledge is written down once and kept
current, so no one has to re-read 2,700 lines of GDD to answer "how does Heat work and where is it
coded?".

**Division of labour.** The user directs the game and reads the wiki. The AI writes and maintains
it: summarising, cross-linking, filing, bookkeeping, and keeping it consistent with the GDD and the
code.

The vault is the whole **`docs/`** folder (open `docs/` in Obsidian). The wiki lives in
`docs/wiki/`; everything else in `docs/` is a **source** the wiki links to.

---

## Sources and who wins

| Source | Where | Authoritative for |
|---|---|---|
| **GDD** | `docs/GDD.md` | **Every rule and number.** It wins over the wiki, always. |
| Implementation plan | `docs/IMPLEMENTATION_PLAN.md` | Stack, architecture rules, the slice list |
| Design docs | `docs/design/*.md` | Per-slice content, screens, wording, review answers (detail the GDD summarises) |
| Tech specs | `docs/tech/*.md` | Per-slice technical design |
| ADRs | `docs/adr/*.md` | Why an architecture decision was made |
| Reviews | `docs/review/*.md` | The user's review notes and build notes |
| QA reports | `docs/qa/*.md` | What was verified, bugs found, leftovers |
| Economy sheet | `docs/economy.md` | Income/sink balance |
| Code | `packages/*`, `apps/*` | **What is actually built** |

**Rules:**
1. **The GDD wins on rules and numbers. The code wins on "what is built".** The wiki never
   competes with either: it summarises and links.
2. **Don't copy big tables of numbers from the GDD.** Quote the few headline numbers a reader needs
   (e.g. "Energy max 100, +5 every 10 min"), then link the § for the rest. Duplicated tables drift.
3. When sources disagree (GDD vs design doc vs content data vs code), **don't pick a winner
   silently**: add a `> [!warning] Drift` callout on the page naming both sides, and add a row to
   [[Drift Report]].
4. **Never invent.** Every claim traces to a source or to code. Anything inferred goes in a
   `> [!note] Inference` callout.
5. **Plain words.** Short sentences, no jargon the user doesn't use. Follow the game's vocabulary
   (canvass, rally, battleground; never war framing — project CLAUDE.md rule 2).
6. **Faction names are parked** (project CLAUDE.md rule 5): use Iron Vanguard / Red Collective /
   Civic Alliance as the GDD does.

---

## Folders

```
docs/wiki/
├── CLAUDE.md        ← this manual
├── index.md         ← catalog of every page — READ FIRST on any question
├── log.md           ← dated record of every change to the wiki (newest first)
├── overview.md      ← landing page: what the game is, the map of the wiki
├── systems/         ← game systems and rules (Energy, Missions, City Council…)
├── entities/        ← factions, cities, people
├── tech/            ← architecture and code: packages, server, client, jobs, patterns
├── history/         ← slices, review rounds, the voting rework, the decision log
├── runbooks/        ← step-by-step procedures (add a mission, run a slice…)
├── questions/       ← open questions and the drift report
└── _templates/      ← page templates (Obsidian Templates plugin points here)
```

---

## Page conventions

**Filenames** are human titles with spaces (`systems/Heat and Record.md`). Titles are **unique
across the vault**, so a bare `[[Heat and Record]]` resolves.

**Frontmatter** on every page:

```yaml
---
type: system | entity | tech | history | runbook | question | overview
title: <exact page title>
aliases: []            # other names, so links resolve (e.g. [Directives, Party Directives])
tags: []
status: built | partly built | designed | parked   # for systems/entities: state in the game
slice: <slice that built it, e.g. "3; reworked in voting rework">
gdd: []                # GDD sections, e.g. ["§6.4", "§11"]
adrs: []               # ADR numbers, e.g. ["0033"]
updated: YYYY-MM-DD    # bump on every edit
---
```

**Links:**
- Wiki pages: `[[Page Title]]` or `[[Page Title|shown text]]`. Link the first mention of every
  system/entity on a page. A link to a page that doesn't exist yet is fine — it marks a page worth
  writing.
- **GDD sections:** link the heading, show the §: `[[GDD#6.4 Heat (new)|GDD §6.4]]`. Copy the
  heading text **exactly** (including "(new)" etc.) from `docs/GDD.md`.
- **Other docs in `docs/`: always use the folder path**, because some filenames repeat across
  folders (`tech/slice-3.md` and `qa/slice-3.md`): `[[tech/slice-3|tech spec]]`,
  `[[design/slice-5-risk#4. Missions|design §4]]`, `[[adr/0033-heat-health-record-held-lazy|ADR 0033]]`,
  `[[qa/slice-5-report|QA report]]`.
- **Code** (outside the vault): backticked repo paths, e.g. `packages/rules/src/heat.ts`,
  `apps/server/src/services/missionService.ts`. Name the main function or model when it helps.

**Standard sections for a system page** (`_templates/system.md`):
1. **In one paragraph** — what it is and why it exists, in plain words.
2. **How it works** — the rules in short bullets, with the headline numbers and § links.
3. **Where it lives** — rules sources (GDD §, design doc §, ADRs) and code (rules package, server
   service/router, model, content file, client route/feature).
4. **Status** — built in which slice, reworked when, what is designed but not built.
5. **Decisions** — the user's calls that shaped it, with dates and a link to the round.
6. **Open questions / drift** — anything unresolved or inconsistent.
7. **Related** — links to neighbouring pages.

Keep a page to what a reader needs; a system page is usually 40–120 lines.

---

## Operations

### QUERY — answering a question from the wiki
1. Read `index.md`, then the relevant pages, and follow their links.
2. For any rule or number, **check the linked GDD section** before answering; the wiki may lag.
3. Answer with links to the wiki pages and the GDD §. Say what is built vs only designed.
4. If the wiki was missing or wrong, fix the page (and log it).

### UPDATE — after a slice, a review round or a GDD change (the regular job)
Part of finishing any piece of work (see [[Keep the Wiki Current]]):
1. For each system the work touched: update **Status**, **Where it lives** (new files, ADRs),
   **Decisions**, and the headline rules if they changed.
2. Add or update the **history** page for the slice/round, and add the user's decisions to
   [[Decision Log]].
3. New system, entity or ADR → new page or a link from the right page.
4. Move resolved items out of [[Open Questions]] / [[Drift Report]].
5. Update `index.md` (new pages, changed one-liners) and add a `log.md` entry.

### INGEST — a new source document
When a new doc lands (a design doc, review notes, an outside reference): read it, tell the user
the 3–6 key points and what they change, then update every page it touches (often 5–15), and
`index.md` + `log.md`.

### LINT — health check (on request)
Report, then offer fixes:
- **Drift**: numbers or rules that differ between GDD, design docs, `packages/content` data,
  `packages/rules` constants and the wiki.
- **Stale status**: pages that say "designed" for something now built, or the reverse.
- **Broken links** and **orphans** (pages nothing links to); **missing pages** worth writing.
- New ADRs, design docs or GDD sections not yet linked from any page.
Log it as `## [YYYY-MM-DD] lint | <summary>`.

---

## index.md and log.md

- **`index.md`** lists every page by folder with a one-line summary. Read it first; update it
  whenever a page is added or its one-liner changes.
- **`log.md`** is append-only, newest first. Each entry starts with
  `## [YYYY-MM-DD] <op> | <title>` where op ∈ {build, update, ingest, query, lint, note}, then 1–3
  lines saying what changed and which pages.
