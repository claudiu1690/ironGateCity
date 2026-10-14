# Irongate City

A **political browser RPG** set in a fictional 1946 Central European republic. Three factions fight for five cities through canvassing, rallies, espionage and elections. Players who win office pass laws that change the game's rules for everyone.

## Start here: the wiki

**`docs/wiki/index.md`** is the map of the project: one page per system, entity, slice and review round, saying how it works in plain words, where its rules (GDD §, ADRs) and code live, what is built, the user's decisions, open questions and drift. Where the project stands today: `docs/wiki/overview.md`. How the wiki is kept: `docs/wiki/CLAUDE.md`. The user browses it in Obsidian (`docs/` is the vault).

- **Before answering a question or starting work** on a system, read the index and the pages it points to, then the GDD sections they link. **The GDD wins on rules and numbers; the code wins on what is built.**
- **Every piece of work ends by updating the wiki** (`docs/wiki/runbooks/Keep the Wiki Current.md`): the touched pages, the slice or round page, the Decision Log, Open Questions / Drift Report, `index.md` and a `log.md` entry.
- "Lint the wiki" runs a health check (drift between GDD, content, code and wiki; stale status; broken links).

| Other sources | What it is |
|---|---|
| `docs/GDD.md` | **Game Design Document v3.1**, the source of truth for every rule and number. Section numbers (§) are referenced everywhere. |
| `docs/IMPLEMENTATION_PLAN.md` | The stack, architecture rules and slices 0–9 (summarised in the wiki's *Architecture Overview*) |
| `docs/adr/`, `docs/design/`, `docs/tech/`, `docs/qa/`, `docs/review/` | Architecture decisions, per-slice design and review answers, technical plans, QA reports, the user's review notes |
| UI and art direction | Design canvas (mockups of every core screen): https://claude.ai/artifact/Huss4jaqe4JEs47YP3CaCy |
| Final art | `E:\Projects\ironGateCity Docs\art-direction\`: `maps-v3\` (the maps the game builds from, day and night), `mvp\` (portraits, avatars, scenes, items), `crests\` (faction SVGs) |

**Git:** the folder is owned by a different Windows user, so git needs `git config --global --add safe.directory E:/Projects/ironGateCity` once.

## How we build: vertical slices

- Every slice is **playable end to end** and ends with a **playtest question** (see the plan). Don't build a layer in isolation.
- **Everything runs locally until the end of the project.** No hosting or deploying until the user says so.
- **Design one slice ahead**: mocks, content lists and numbers for slice N+1 are prepared while slice N is built.
- Work is proposed and tracked **as slices** (and review rounds), in the order of the plan. Runbooks: `docs/wiki/runbooks/Run a Slice.md`, `Run a Design Review Round.md`.
- **Testing (user's rule, 8 Oct 2026):** no new unit tests for now. Run the fast checks plus the affected Playwright specs while working, and the full e2e once before QA (details: the wiki's *Checks and Testing*).

Stack and repo layout: TypeScript · pnpm + Turborepo · React 19 + Vite · Fastify + tRPC · Zod · MongoDB + Mongoose · Agenda · Better Auth · Playwright. `apps/client`, `apps/server`, `packages/rules` (pure game maths, no I/O), `packages/content` (game data), `packages/db`, `packages/ui`. Details: the wiki's *Architecture Overview*.

## Rules that apply to all work

**Game design**
1. **It's a browser game with short sessions** (GDD pillar 7): one tap or one choice by default; multi-step flows are rare (≤3 steps) and resumable; **never require being online at a set time**; narrative text is 2–3 lines; every result is one modal with visible numbers.
2. **A political battle, not a war.** The design uses campaign terms (canvass, rally, speech, exposé, strike, battleground, groundswell), never "front", "uprising" or war framing. **Players read plain words**, not the system terms (GDD §1.5; the mapping lives in `copy.ts`).
3. **Borrow principles, not signature systems** from other games (especially Torn). Re-express mechanics through politics.
4. **Being away costs opportunity, never assets.** Nothing a player owns is destroyed by absence.
5. **Faction naming is parked.** The GDD uses Iron Vanguard / Red Collective / Civic Alliance (Fascists / Communists / Democrats). Don't rename anything until the user decides.
6. **No real-world extremist symbols** in any art or text. Review all Vanguard content for this.

**Engineering**
1. **Server-authoritative.** The client shows odds and results; the server decides them using `packages/rules`.
2. **Every game action is atomic and idempotent** (a conditional `findOneAndUpdate`, or a transaction when several documents change; an idempotency key per request).
3. **Timers are lazy**: Energy, Rested, Heat and Health are computed from stored value + timestamp. Only real events (votes closing, journeys arriving, day rollover) are scheduled jobs.
4. **Content is data.** A new location or mission never needs code.
5. **Embed what's read together, reference what grows** (character stats embedded; logs, votes, ledgers and chat in their own collections).
6. The server returns the **full result breakdown** (outcome, bonuses, rewards, knock-on effects) for the result modal (GDD §13.1a).
7. Match numbers to the GDD. If a number must change, change the GDD in the same piece of work and say so.

## The team (subagents in `.claude/agents/`)

| Agent | Model | Owns |
|---|---|---|
| `architect` | Opus 5.5 | Technical design of each slice, data models, API contracts, ADRs, the plan, reviews for structure |
| `game-designer` | Fable 5.1 | `docs/GDD.md`, `docs/design/`, content in `packages/content`, the economy sheet, balance and pacing, player-facing text |
| `developer` | Opus 5.5 | Implementing slices: code, migrations and seed, Playwright flows |
| `qa` | Sonnet 5.5 | Verifying slices against the GDD and the plan: test plans, Playwright tests, bug reports, playtest checklists |

**Typical flow for a slice:** game-designer (content and numbers ready) → architect (technical design) → developer (build) → qa (verify, report) → developer (fix) → wiki updated → playtest question answered.
