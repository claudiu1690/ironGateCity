# Irongate City — Implementation Plan

| | |
|---|---|
| **Based on** | `docs/GDD.md` v3.1 |
| **Approach** | **Vertical slices.** Every slice is playable end to end and deployed. |
| **Existing code** | Scrapped. `apps/api` and `apps/web` were built for GDD v3.0 and are replaced. Git history keeps them for reference (the seed content can be mined). |
| **Written** | 29 Sep 2026 |

---

## 1. How we build

**A vertical slice** cuts through every layer at once: database, rules, API, UI and content. At the end of each slice there's a **deployed URL where the new thing can be played**, not a finished layer waiting for the others.

- **Design one slice ahead.** While slice N is being built, the mocks, content lists and numbers for slice N + 1 are prepared.
- **Every slice ends with a playtest.** It answers one question (listed per slice). If the answer is no, fix it before moving on.
- **Short sessions first** (GDD pillar 7). Every feature is checked against: one tap or one choice, never online at a set time, a result in one modal.
- **Server-authoritative.** The client shows odds and results; it never decides them.

---

## 2. The stack

| Layer | Choice | Why |
|---|---|---|
| **Language** | **TypeScript** everywhere | One language for client, server, rules and content |
| **Monorepo** | **pnpm workspaces + Turborepo** | Fast installs, shared packages, cached builds |
| **Game client** | **React 19 + Vite** (a single-page app) | A game is an app, not a website: no server rendering needed, simple and fast to develop |
| **Client data** | **TanStack Query** (+ TanStack Router) | Caching, refetch on focus (perfect for short sessions), optimistic updates |
| **Styling** | **Tailwind CSS v4** with the mockups' design tokens; **Radix UI** primitives for dialogs, sheets and tooltips | The printed-matter look from the mockups, accessible modals out of the box |
| **Maps** | Layered images with **SVG overlays** (as in the mockups) + `react-zoom-pan-pinch` on phones | No game engine needed: the maps are illustrations with clickable places |
| **API** | **Node.js + Fastify + tRPC** | End-to-end types between server and client with no API code to hand-write; Fastify is fast and simple |
| **Validation** | **Zod** | One schema library for API inputs, content files and environment config |
| **Database** | **MongoDB 7** (a replica set: MongoDB Atlas in production, a single-node replica set in Docker locally) | Documents are easy to browse and understand in **MongoDB Compass** or the Atlas Data Explorer. A replica set gives multi-document transactions, which every game action needs |
| **ODM** | **Mongoose** with TypeScript types | Schemas, validation and indexes per collection; atomic updates (`$inc` with conditions) for spending Energy and Iron |
| **Jobs and schedule** | **Agenda** (a job scheduler that stores its jobs in MongoDB) | Daily rollover, elections, journeys and events without a second database. **No Redis in the MVP** |
| **Timers** | **Computed lazily** from timestamps | Energy, Rested, Heat and Health are calculated when read, so there are no per-minute workers |
| **Realtime** | **Server-Sent Events** first; **WebSockets (Socket.IO)** when faction chat arrives (slice 6) | Short sessions mostly need "refresh on focus"; live chat is the only true realtime need |
| **Auth** | **Better Auth** (email and password, sessions; OAuth later) with its MongoDB adapter | Maintained, TypeScript-first, runs inside our own API and database |
| **Game rules** | A pure TypeScript package, `packages/rules` | The check formula, rewards, combat and pacing in one tested place, used by the server to decide and by the client to show the odds |
| **Content** | TypeScript/JSON files in `packages/content`, validated by Zod, loaded at startup | Locations, actions, missions, Issues, events and NPCs are reviewed in git like code; no admin tool needed for the MVP |
| **Randomness** | A **seeded RNG** per action | Every roll can be replayed and audited |
| **Testing** | **Vitest** (rules and services), **Playwright** (a playthrough per slice) | The rules package gets heavy unit tests; each slice gets an end-to-end test of its core flow |
| **Hosting** | Client on **Vercel**; API + worker on **Railway** or **Fly.io**; database on **MongoDB Atlas** (the free tier to start) | Cheap to start, scales later, preview deploys per branch |
| **Monitoring** | **Sentry** (errors) and simple event analytics (PostHog, or events stored in a MongoDB collection) | Crashes, and the retention metrics in GDD §27 |
| **Payments** | **Stripe**, after the MVP | Monetisation isn't part of the slices |

### Repository layout

```
ironGateCity/
├── apps/
│   ├── client/          React + Vite game client
│   └── server/          Fastify + tRPC API, Agenda worker (same codebase, two entry points)
├── packages/
│   ├── rules/           Pure game maths: checks, rewards, combat, timers, pacing
│   ├── content/         Cities, locations, actions, missions, Issues, events, NPCs (validated data)
│   ├── db/              Mongoose models, indexes, seed scripts
│   └── ui/              Design tokens and shared components (ticket, stamp, result modal, gauges)
├── docs/                GDD, this plan, economy sheet, content guides
└── art/                 Final game assets (maps, portraits, scenes, items, crests)
```

### Architecture rules

1. **Every game action is atomic** with an idempotency key, so a double tap never spends Energy twice. Where one document changes, use a single conditional update (`findOneAndUpdate` with `$inc` and a guard such as "Energy ≥ cost"). Where several documents change, use a MongoDB transaction.
2. **Timers are lazy.** Store the last value and a timestamp; compute the current value on read. Only real events (a council vote closing, a journey arriving, the day rolling over) are scheduled jobs.
3. **The rules package has no I/O.** It takes state in and returns results out. It is the most tested code in the project.
4. **The server returns the full breakdown** of every result (roll, chance, bonuses, rewards, knock-on effects), and the client just renders it in the result modal.
5. **Content is data.** Adding a location or a mission never needs a code change.
6. **Embed what's read together, reference what grows.** A character's stats, timers, equipment and job live inside the character document (one read per session). Things that grow without limit, such as the action log, votes, the influence ledger and chat, get their own collections with indexes.

---

## 3. Before slice 1: design to finish

These come from the MVP assessment. They are done "one slice ahead" of the build:

| Needed by | Design task |
|---|---|
| Slice 1 | **Economy sheet**: income, costs, XP/FXP per day against the GDD pacing targets |
| Slice 1 | **Content list for one home city**: locations, tier-1 actions, success and partial text |
| Slice 2 | **Onboarding script**: the welcome paper, what unlocks when, the starting kit |
| Slice 3 | **Political screens** (mocks): standing, endorsements, the ballot, results, the ordinance vote |
| Slice 4 | Content lists for Irongate's districts; the Issue deck; journey events |
| Slice 6 | **Faction HQ** mock |
| Slice 8 | **Character and Wardrobe**, **Dossier** mocks; Ambition #1 chapters; 2 patrons |

---

## 4. The slices

Each slice lists what's built, the content it needs, and the **question its playtest answers**.

### Slice 0 — Walking skeleton

**Build:**
- The monorepo, CI (lint, types, tests), preview deploys, Sentry
- MongoDB (Docker single-node replica set locally, Atlas for the deployed build) + Mongoose models v1: users, characters, cities with their locations
- Better Auth sign-up and login
- `packages/rules` v1: the check formula (GDD §8.4) and seeded RNG, with tests
- `packages/ui` v1: design tokens, fonts, HUD bar, ticket, stamp, **result modal**
- One location with **one action** that resolves on the server and shows the result modal

**Done when:** a deployed URL where you sign up, tap "Canvass" and see a real result modal.
**Question:** does the whole pipe work, from tap to database to modal?

### Slice 1 — The 5-minute session

**Build:**
- One home city (**Coalport**) with its detailed map, day and night, and 5–6 clickable locations
- **Tier-1 actions** with ×1 / ×3, Energy and Rested (lazy), bonuses, **Local Standing**
- **Jobs**: daily salary and shift, streak and sick days
- **Morning Paper v1**: your desk (salary, Rested, Energy), 2–3 headlines
- **Party Directives** from the NPC party secretary
- Levels, XP and FXP; the "Today" tally

**Content:** Coalport's locations and about 20 tier-1 actions with narrative text.
**Question:** **is spending a bar of Energy fun, and do players want to come back in 3 hours?**

### Slice 2 — Arrival

**Build:**
- The **origin story**: the deathbed dialogue, stats, Ambition choice
- **Faction choice** and the start in that faction's home city: Duskwall, Coalport and Ashford, each with its own locations and actions
- The **welcome edition** of the Morning Paper and the day-1 unlock order
- Starting kit, first outfit (Charisma is worn), Ambition chapter 1
- Mobile layout for everything built so far

**Content:** 3 home cities (about 60 tier-1 actions), the origin dialogue, Ambition chapter 1.
**Question:** **does a brand-new player understand what to do in the first 10 minutes, without a tutorial screen?**

### Slice 3 — The first vote

**Build:**
- The **calendar**: the City Day rollover, and council elections in each home city on their day
- **Ranks** and the **office ladder** rules for councillors (Rank 3, *Known*, 2 endorsements)
- Standing for council, endorsing, the one-tap **ballot**, results in the Morning Paper
- **Home-city councils** (a race within the faction) and **NPC fill**
- A councillor's **ordinance vote**, with ordinances that really change numbers
- **Morale** and the morale states (GDD §14.11)

**Question:** **does the first vote, and the first seat, feel like a big moment?**

### Slice 4 — The battleground

**Build:**
- The **national map** and **timed train journeys**, running in the background, with journey events
- **Irongate** with its 5 districts: district opinion, Battleground and Groundswell
- **Moving residence** to a battleground, and three-way council elections there
- **Issues of the Week**: the weekly deck, Issue momentum, resolution
- The influence ledger and District Hero

**Content:** 5 districts' locations and actions, the Issue deck, 7 journey events.
**Question:** **do players choose to move to the capital, and does the three-way fight feel alive?**

### Slice 5 — Risk

**Build:**
- **Tier-2 missions**: briefings, approaches, the remembered approach, Success / Partial / Failure
- **Heat**, the caught check, the **Criminal Record**, **jail**, **hospital**
- **Encounters** as one choice (Fight, Flee, Bluff, Bribe) plus auto-resolve (GDD §20)
- **Hostile ground**: enemy home cities with double Heat, journey events, encounters and rewards

**Question:** **is risk exciting rather than punishing?**

### Slice 6 — Together

**Build:**
- **Campaign Events**: scheduling, roles, sign-up as commitment, automatic resolution, results in the modal and the paper
- **Faction chat** and **presence** ("who's here"), using WebSockets
- The **Faction HQ** screen: Directives, members, the contribution ledger, the event board
- Favours between players: posting bail, hospital visits

**Question:** **do players feel part of a team, and do they come back for the group's events?**

### Slice 7 — The nation

**Build:**
- The rest of the ladder: **Governor/Mayor**, **Faction Chair** (who sets real Directives), **Legislature**, **national elections**, President or Chancellor
- **Laws** with fixed bounds, the 5-law cap, factional laws at 60 %
- **Clearwater** as the second battleground; **national control** weights (40/30/10/10/10)
- Recall petitions, no-confidence votes

**Question:** **does holding office feel powerful, and does losing it make players want to fight back?**

### Slice 8 — A life in the city

**Build:**
- **Dossier** and **Case Files**, and exposés
- **Patrons** (2 for MVP): Favour, Requests, perks
- **Wardrobe and equipment**: tiers, Charisma, plain clothes for hostile ground
- **Homes**: rented room and flat
- **Legacy** (the record), Ambition #1 complete
- The **Political Season** skeleton: Season Election, awards, rollover

**Question:** **do players have goals for the next month, not just the next session?**

### Slice 9 — Launch readiness

**Build:**
- Balance pass against telemetry (GDD §27 metrics)
- Anti-abuse: one account per person, network checks, the 24 h election audit
- Moderation tools for chat and names
- Performance, accessibility, onboarding polish
- Closed beta, then open beta

**Question:** **are the day-7 and day-30 retention targets within reach?**

### After the MVP (launch + 60 days and beyond)

Ministers · bodyguards · first class, cars and the night train · townhouses and villas · Legacy perks · Season Twists · the premium cosmetic track and Stripe · more patrons and Ambitions · counter-demonstrations · player trading.

---

## 5. What each slice adds to the data model (MongoDB)

**Embedded** means a field inside an existing document; **collection** means its own collection.

| Slice | New collections | Embedded in `characters` |
|---|---|---|
| 0 | `users`, `sessions` (Better Auth), `characters`, `cities` (locations embedded), `actionLogs` | stats, `energy {value, updatedAt}`, `rested`, `xp`, `level` |
| 1 | `directives`, `paperEntries` | `job {id, streak, sickDays, lastShift}`, `localStanding {cityId: successes}`, `fxp`, `rank` |
| 2 | `items` (catalogue) | `origin`, `ambition {id, chapter}`, `inventory[]`, `equipment {slot: itemId}`, `homeCityId` |
| 3 | `elections`, `candidacies`, `votes`, `officeTerms`, `ordinances` | `offices[]` (current), `endorsementsGiven[]` |
| 4 | `influenceLedger`, `journeys`, `issues` | `residence {cityId, districtId}`, `currentCityId`, `journeyId` |
| 5 | `encounters` | `heat {value, updatedAt}`, `record {points, history[]}`, `approachMemory {missionId: approach}`, `jail`, `hospital` |
| 6 | `campaignEvents` (roles embedded), `chatMessages` | `presence {locationId, seenAt}` |
| 7 | `laws`, `nationalElections`, `recallPetitions` | — |
| 8 | `dossierEntries`, `caseFiles`, `seasons` | `patrons {patronId: favour}`, `home`, `legacy[]` |

City and district opinion (including home-city morale) live inside the `cities` documents, as `influence {faction: share}` per city or district.

---

## 6. First steps

1. Archive the old code: remove `apps/api` and `apps/web` in one commit, so it stays in git history for reference.
2. Set up the new monorepo skeleton (slice 0 layout) and deploy an empty client and server.
3. Write `packages/rules` v1 with tests: the check formula, seeded RNG, lazy Energy.
4. Build the economy sheet and the Coalport content list (design for slice 1), while slice 0 is built.
