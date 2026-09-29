# Irongate City

A **political browser RPG** set in a fictional 1946 Central European republic. Three factions fight for five cities through canvassing, rallies, espionage and elections. Players who win office pass laws that change the game's rules for everyone.

## Read these first

| Document | What it is |
|---|---|
| `docs/GDD.md` | **Game Design Document v3.1** — the source of truth for every rule, number and system. Section numbers (§) are referenced everywhere. |
| `docs/IMPLEMENTATION_PLAN.md` | **How we build it**: the stack, the repo layout, architecture rules, and slices 0–9 |
| UI and art direction | Design canvas (mockups of every core screen): https://claude.ai/artifact/Huss4jaqe4JEs47YP3CaCy |
| Final art | `E:\Projects\ironGateCity Docs\art-direction\` — `maps-pen\` (all maps, day and night), `mvp\` (portraits, avatars, scenes, items), `crests\` (faction SVGs) |

## Current state

- **Design:** GDD v3.1 is complete enough to build from. Open questions are in GDD Appendix C.
- **Code:** being **rebuilt from scratch** in vertical slices. `apps/api` and `apps/web` were built for the old v3.0 design and are to be removed (they stay in git history; the seed content can be mined for ideas). Next up: **slice 0, the walking skeleton**.
- **Git:** the folder is owned by a different Windows user, so git needs `git config --global --add safe.directory E:/Projects/ironGateCity` once.

## How we build: vertical slices

- Every slice is **playable end to end and deployed**, and ends with a **playtest question** (see the plan). Don't build a layer in isolation.
- **Design one slice ahead**: mocks, content lists and numbers for slice N+1 are prepared while slice N is built.
- Work is proposed and tracked **as slices**, in the order of the plan.

## Stack (details in the plan)

TypeScript everywhere · pnpm + Turborepo · **React 19 + Vite** SPA, TanStack Query, Tailwind v4 + Radix · **Fastify + tRPC** · Zod · **MongoDB** (replica set; Atlas in production) + **Mongoose** · **Agenda** for scheduled jobs (no Redis) · Better Auth · Vitest + Playwright · Vercel (client), Railway/Fly (server), MongoDB Atlas.

```
apps/client      React game client
apps/server      Fastify + tRPC API and the Agenda worker
packages/rules   Pure game maths (checks, rewards, combat, timers) — no I/O, heavily tested
packages/content Cities, locations, actions, missions, Issues, events, NPCs as validated data
packages/db      Mongoose models, indexes, seed
packages/ui      Design tokens and shared components (ticket, stamp, result modal, gauges)
```

## Rules that apply to all work

**Game design**
1. **It's a browser game with short sessions** (GDD pillar 7): one tap or one choice by default; multi-step flows are rare (≤3 steps) and resumable; **never require being online at a set time**; narrative text is 2–3 lines; every result is one modal with visible numbers.
2. **A political battle, not a war.** Use campaign vocabulary (canvass, rally, speech, exposé, strike, battleground, groundswell), never "front", "uprising" or war framing.
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
6. The server returns the **full result breakdown** (roll, chance, bonuses, rewards, knock-on effects) for the result modal (GDD §13.1a).
7. Match numbers to the GDD. If a number must change, change the GDD in the same piece of work and say so.

## The team (subagents in `.claude/agents/`)

| Agent | Model | Owns |
|---|---|---|
| `architect` | Fable 5.1 | Technical design of each slice, data models, API contracts, architecture decisions, reviews for structure |
| `game-designer` | Fable 5.1 | `docs/GDD.md`, content in `packages/content`, the economy sheet, balance and pacing, player-facing text |
| `developer` | Opus 5.5 | Implementing slices: code, tests for the code it writes, migrations and seed |
| `qa` | Opus 5.5 | Verifying slices against the GDD and the plan: test plans, Vitest/Playwright tests, bug reports, playtest checklists |

**Typical flow for a slice:** game-designer (content and numbers ready) → architect (technical design) → developer (build) → qa (verify, report) → developer (fix) → playtest question answered.
