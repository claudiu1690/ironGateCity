# Irongate City — Implementation Plan

| | |
|---|---|
| **Based on** | `docs/GDD.md` v3.1 |
| **Approach** | **Vertical slices.** Every slice is playable end to end, locally. **No hosting or deploying until the end of the project** (the user's standing rule). |
| **Existing code** | Scrapped. `apps/api` and `apps/web` were built for GDD v3.0 and are replaced. Git history keeps them for reference (the seed content can be mined). |
| **Written** | 29 Sep 2026; brought up to date 14 Oct 2026 (slices 0–5, reviews 1–5 and the voting rework built; the user's MVP scope decisions) |

---

## 1. How we build

**A vertical slice** cuts through every layer at once: database, rules, API, UI and content. At the end of each slice the new thing **can be played locally** (`pnpm dev:mem`, with the dev panel), not a finished layer waiting for the others.

- **Local until the end.** Nothing is hosted or deployed until the project's end (the user's standing rule). The hosting step (ADR 0072: the production topology, R2 tiles, mail, Sentry), any deploy, and the closed and open betas come **after slice 9**. `apps/client/vercel.json` keeps an `<api-host>` placeholder until then.
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
| **Realtime** | **Refetch on focus** (TanStack Query) and one refetch at the next dusk or dawn (ADR 0079); **Socket.IO** when faction chat arrives (slice 6, ADR 0038). No Server-Sent Events | Short sessions mostly need "refresh on focus"; live chat is the only true realtime need |
| **Auth** | **Better Auth** (email and password, sessions; OAuth later) with its MongoDB adapter | Maintained, TypeScript-first, runs inside our own API and database |
| **Game rules** | A pure TypeScript package, `packages/rules` | The check formula, rewards, combat and pacing in one tested place, used by the server to decide and by the client to show the odds |
| **Content** | TypeScript/JSON files in `packages/content`, validated by Zod, loaded at startup | Locations, actions, missions, Issues, events and NPCs are reviewed in git like code; no admin tool needed for the MVP |
| **Randomness** | A **seeded RNG** per action; the seed is derived from the request key by HMAC (ADR 0087) and stored with the result | Every roll can be replayed and audited; a retried transaction draws the same rolls |
| **Testing** | **Vitest** (rules and services), **Playwright** (a playthrough per slice) | The rules package gets heavy unit tests; each slice gets an end-to-end test of its core flow |
| **Hosting** (at the end of the project, ADR 0072) | Client on **Vercel**; API + worker on **Railway** or **Fly.io**; database on **MongoDB Atlas** (the free tier to start); tiles on R2 | Cheap to start, scales later. Until then everything runs locally |
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
├── scripts/art/         The art pipeline: builds web art and map tiles into apps/client/public/art
└── docs/                GDD, this plan, economy sheet, design and tech docs, ADRs, the wiki
```

The final art sources live outside the repository (`E:\Projects\ironGateCity Docs\art-direction\`; the maps from `maps-v3\`), read through `IRONGATE_ART_SRC` by `scripts/art` (ADR 0007, 0015, 0024).

### Architecture rules

1. **Every game action is atomic** with an idempotency key, so a double tap never spends Energy twice. Where one document changes, use a single conditional update (`findOneAndUpdate` with `$inc` and a guard such as "Energy ≥ cost"). Where several documents change, use a MongoDB transaction.
2. **Timers are lazy.** Store the last value and a timestamp; compute the current value on read. Only real events (a council vote closing, a journey arriving, the day rolling over) are scheduled jobs.
3. **The rules package has no I/O.** It takes state in and returns results out. It is the most tested code in the project.
4. **The server returns the full breakdown** of every result (roll, chance, bonuses, rewards, knock-on effects), and the client just renders it in the result modal.
5. **Content is data.** Adding a location or a mission never needs a code change.
6. **Embed what's read together, reference what grows.** A character's stats, timers, equipment and job live inside the character document (one read per session). Things that grow without limit, such as the action log, votes, the influence ledger and chat, get their own collections with indexes.

---

## 3. Before slice 1: design to finish

These come from the MVP assessment. They are done "one slice ahead" of the build. (All done: the design and tech documents for slices 1–9 are in `docs/design` and `docs/tech`. The slice-3 row's endorsements and ordinance vote were replaced by the voting rework.)

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

Each slice lists what's built, the content it needs, and the **question its playtest answers**. Slices 0–5 are built; the text below says what they built, with the later changes named (the per-slice tech docs and the wiki's history pages have the detail). Slices 6–9 are designed and not built.

### Slice 0 — Walking skeleton (built)

**Build:**
- The monorepo, CI (lint, types, tests), Sentry wired in both apps (off until a DSN is set at the hosting step). No preview deploys: hosting waits for the end of the project
- MongoDB (a single-node replica set locally, Docker or in memory) + Mongoose models v1: users, characters, cities (state only; places are content, ADR 0003)
- Better Auth sign-up and login
- `packages/rules` v1: the check formula (GDD §8.4) and seeded RNG, with tests
- `packages/ui` v1: design tokens, fonts, HUD bar, ticket, stamp, **result modal**
- One location with **one action** that resolves on the server and shows the result modal

**Done when:** locally, you sign up, tap "Canvass" and see a real result modal.
**Question:** does the whole pipe work, from tap to database to modal?

### Slice 1 — The 5-minute session (built)

**Build:**
- One home city (**Coalport**) with its detailed map, day and night, and 5–6 clickable locations
- **Tier-1 actions** with ×1 / ×3 (training ×1 only), Energy and Rested (lazy), bonuses, **Local Standing**
- **Jobs**: a **wage**, the full daily pay at every boundary, and **seniority** (review 1; it was a salary with a shift, a streak and sick days)
- **Morning Paper v1**: your desk (the wage, Rested, Energy), 2–3 headlines
- **Party orders** (Directives) from the NPC party secretary, computed from content and the day (ADR 0009)
- Levels, XP and FXP; the "Today" tally

**Content:** Coalport's locations and about 20 tier-1 actions with narrative text.
**Question:** **is spending a bar of Energy fun, and do players want to come back in 3 hours?**

### Slice 2 — Arrival (built)

**Build:**
- The **opening**: since review 5, ***Coming home*** at the demobilisation office, three beats of one choice each that set the **party** (whom you help), the stats and the Ambition (GDD §7; ADR 0073). It was a deathbed dialogue followed by a faction choice
- The start in the party's home city: Duskwall, Coalport and Ashford, each with its own locations and actions
- The **welcome edition** of the Morning Paper and the **welcome set** of orders (slot A by best stat, slot B the favour at the HQ; ADR 0012, 0073)
- Starting kit, the coat everyone wears (Charisma is worn), Ambition chapter 1
- Mobile layout for everything built so far

**Content:** 3 home cities (about 60 tier-1 actions), the opening, Ambition chapter 1.
**Question:** **does a brand-new player understand what to do in the first 10 minutes, without a tutorial screen?**

### Slice 3 — The first vote (built; the voting reworked 10–12 Oct 2026)

**Build:**
- The **calendar**: the City Day rollover, and a five-day council cycle in each home city
- **Ranks** and the councillor rung: Rank 3, *Known* here, **10 Political Capital spent, no backers needed** (the voting rework; it was two endorsements and a deposit)
- **Standing** (naming your rule), optional **backing** (+3), the one-tap **ballot on the town's rule** (three rule cards; ADR 0083), results in the Morning Paper
- **Home-city councils**: seats by reputation plus backers (ADR 0084), and **NPC fill**
- **Council rules** (ordinances) that really change numbers; the winner runs the city for five days from the count. (It was a councillor's ordinance vote on an order paper.)
- **Morale** and the morale states (GDD §14.11)

**Question:** **does the first vote, and the first seat, feel like a big moment?**

### Slice 4 — The battleground (built)

**Build:**
- The **national map** and **timed train journeys**, running in the background, with journey cards (the journey drawn on the nation map since review 4, ADR 0075)
- **Irongate** with its 5 districts: district opinion, Battleground and Groundswell (players read *close race* and *comeback*)
- **Moving residence** (*Live here*) and the capital's count by district; since the voting rework the capital's rule is **the largest bloc's card** (ADR 0085). The rented room is the **Lodgings** card (review 4)
- **Issues of the Week**: the weekly deck, Issue momentum, resolution
- The influence ledger and District Hero

**Content:** 5 districts' locations and actions, the Issue deck, 7 journey events.
**Question:** **do players choose to move to the capital, and does the three-way fight feel alive?**

### Slice 5 — Risk (built)

**Build:**
- **Tier-2 missions**: briefings, ways, the remembered way, Success / Partial / Failure
- **Heat**, the caught check, the **record**, **the cells**, **the infirmary**
- **Run-ins** as one choice (*Fight · Run · Talk your way out · Pay them off*) or luck after five minutes (GDD §20; ADR 0032)
- **Rival ground** (hostile ground): rival home cities with double Heat, journey cards, run-ins and rewards

**Question:** **is risk exciting rather than punishing?**

### Between slices 5 and 6 (built)

Five review rounds and the voting rework changed what slices 0–5 built: the wage (review 1), the opening and local editions (review 4), the six-hour game day, night windows and the patrol stop (review 5), and the town's rule vote (10–12 Oct). Their tech docs are `docs/tech/review-4.md`, `review-5.md` and `voting-rework.md`; each lists its knock-ons on slices 6–9, which are applied to those tech docs.

### Slice 6 — Together (built)

**Build:**
- **Campaign Events**: scheduling, roles, sign-up as commitment, automatic resolution, results in the modal and the paper
- **Faction chat** and **presence** ("who's here"), using Socket.IO (ADR 0038)
- The **Faction HQ** screen: Directives, members, the contribution ledger, the event board
- Favours between players: posting bail, infirmary visits

**Question:** **do players feel part of a team, and do they come back for the group's events?**

### Slice 7 — The nation (built)

**Build:**
- The rest of the ladder: **Governor/Mayor** (their rule is card 1 on the town's ballot), **Faction Chair** (who sets real Directives), **Parliament** (the Legislature), **national elections**, **the President** (one office at the top; design `docs/design/slice-7-nation.md`)
- **Laws** with fixed bounds, the 5-law cap, factional laws at 60 % (36 of 60)
- **Clearwater** as the second battleground; **national control** weights (40/30/10/10/10)
- **Petitions to dissolve a council** (the rule in force runs out its window), votes to remove the President, votes on the Chair; no snap elections (ADR 0049)

**Question:** **does holding office feel powerful, and does losing it make players want to fight back?**

### Slice 8 — A life in the city

**Build:**
- **Dossier** and **Case Files**, and exposés
- **Patrons** (2 for MVP): Favour, Requests, perks
- **Wardrobe and equipment**: tiers, Charisma, plain clothes for rival ground
- **Homes**: the flat (the rented room is built, as the Lodgings card)
- **Legacy** (the record) **and the Legacy perks**, Ambition #1 complete
- ~~The **Political Season** skeleton: Season Election, awards, rollover~~ **Deferred (the user, 16 Oct 2026: "let's leave the seasons for later")**: the season, its score, the Season Election, the Champion, the awards, the Hall of Fame and the rollover move to a later slice, not yet placed (ADR 0058 *Deferred*; `docs/tech/slice-8.md`, *Seasons deferred*)
- **Added to the MVP on 14 Oct 2026 (the user's decision), still to be designed:** **bodyguards** (prepaid contracts, GDD §12), and **bar services and the buffs they give** (Buy a Round's *In Good Spirits*, the bar meal's *Well-Fed*, GDD §6.7, §19.3). The game-designer updates the GDD; the slice-8 design and tech docs add them before the build

**Question:** **do players have goals for the next month, not just the next session?**

### Slice 9 — Launch readiness

**Build:**
- Balance pass against telemetry (GDD §27 metrics)
- Anti-abuse: one account per person, network checks, the 24 h election audit
- Moderation tools for chat and names
- Performance, accessibility, onboarding polish
- The betas' mechanics (invite codes, waves, the feedback form) and hosting preparation that runs locally

**Then, at the end of the project:** the hosting step (ADR 0072), the first deploy, a closed beta, then an open beta.

**Question:** locally, **is the game ready to measure?** In the betas: **are the day-7 and day-30 retention targets within reach?**

### After the MVP (launch + 60 days and beyond)

Ministers · first class, cars and the night train · townhouses and villas · Season Twists · the premium cosmetic track and Stripe · more patrons and Ambitions · counter-demonstrations · player trading · **faction-only places** (the Vanguard House gym, the Underground Press, the Alliance-only Press Club; GDD §14.1, §16.1).

---

## 5. What each slice adds to the data model (MongoDB)

**Embedded** means a field inside an existing document; **collection** means its own collection.

| Slice | New collections | Embedded in `characters` |
|---|---|---|
| 0 | `users`, `sessions` (Better Auth), `characters`, `cities` (state only: opinion and what is in force; places, actions and maps are content, ADR 0003), `actionLogs` | stats, `energy {value, updatedAt}`, `rested`, `xp`, `level` |
| 1 | `paperEntries`, `requestLogs` (ADR 0008). No `directives` collection: Party orders are computed from content and the day, only progress is stored (ADR 0009) | `job {id, since, seniority}` (the wage, review 1; was `streak`, `sickDays`, `lastShift`), `orders` (the day's progress), `day.settled`, `today` (the tally), `localStanding [{cityId, successes}]`, `fxp`, `rank` |
| 2 | `arrivals` (the opening's draft, ADR 0011). No `items` collection: the catalogue is content (ADR 0014) | `origin`, `ambition {id, chapter}`, `inventory[]` (owned instances), `equipment {slot: uid}`, `homeCityId`, `avatarId` |
| 3 | `elections`, `candidacies`, `votes`, `officeTerms`, `ordinances` (the rule ballot since the voting rework, below) | `offices[]` (current), `endorsementsGiven[]` (backings) |
| 4 | `districts`, `influenceLedger`, `contributions`, `awards`, `journeys`, `issues` | `residence {cityId, districtId, sinceDay, …}`, `cityId` (where the character stands), `journey` (the open journey's pointer), `journeyDeck`, `room` |
| 5 | `encounters`, `stays` | `heat {value, at}`, `health {damage, at}`, `record` (marks), `ways[]` (the remembered way), `held` and `runIn` pointers (ADR 0032, 0033) |
| Review 4 | none new; changed: `arrivals` (three answers; migration 008 resets old drafts), `journeys` (`card.at`, the card's moment), `officeTerms` (`whatNowSeenAt`), the `held_cells_now` partial index on `characters` (ADR 0073–0078) | `orders.off { at, reason: 'cells' }` (the day's orders taken off by an arrest), and every new character wears his coat (no CHA base, no Iron or FXP seed) |
| Review 5 | none new, no migration (every new field reads absent as its default); changed: `cities` (`rivalPressure.byFaction` and `week`, the push by party; `unrestPrize { entry, paidDay }`), `awards` (`kind: 'unrest'`, `fxp`, `meta`), `requestLogs` (`character.treat`, `patrol.answer`); content: `Way.window` and `Mission.window` (`'night'`), `Location.treatment`, the patrol deck (ADR 0079–0082) | `patrol { nights[], quietUntil, card }` (the night patrol's buckets, its quiet and a waiting card) |
| Voting rework | none new; `ordinances` is the **rule ballot** (model `RuleBallot`: `setDay`, `countDay`, `status: 'open' \| 'set' \| 'counted'`, `cards`, `unrest`, `changes`, `result`; an old order paper's fields under `legacy`; index `{ cityId, countDay }`); changed: `votes` (`ordinanceId`; exactly one of it and `candidateKey`), `candidacies` (`rule`; `platformId` gone), `officeTerms` (`rule`, `ruleSetAt`), `cities` (`world.voting: 2`, the conversion's guard), `requestLogs` (`council.setRule`); migration 009 refunds due deposits once; a city converts itself at its next settlement (ADR 0083–0086, `docs/tech/voting-rework.md`) | none (`endorsementsGiven[]` unchanged: one backing per election) |
| 6 | `campaignEvents` (roster embedded), `eventSignups`, `chatMessages`, `chatReports`, chat rate documents, faction scoreboard totals | `presence` (unversioned, ADR 0040), open sign-up pointers (ADR 0036) |
| 7 | `nation` (the term, the republic's shares, the President), `factions` (the Chair, standing orders, the push, lines, rules, fixtures), `factionElections`, `nationalElections`, `bills`, `laws`, `petitions`; changed: `officeTerms` (office kinds), `candidacies` (kinds), `votes` (new keys), `cities` (Clearwater's meter under `battleground { state, groundswell, stateLog }`, `council.governor`, `council.dissolved`), `ordinances`, `contributions` (the push's `push|{f}|{day}` rows), `chatMessages` (the Officers channel); the laws in force projected on `nation` for the read path (ADR 0043–0050; as built, docs/tech/slice-7.md Deviations) | `termBackings[]`, the office kind on `offices[]`, the push and `setBy` on the day's orders |
| 8 | `dossierEntries` (entries, Case Files, informants; the tab's and the stale-tomorrow indexes), `legacyEntries` (unique natural `ref`); changed: `actionLogs` (kind `expose`, the partial index `expose_by_day`), `influenceLedger` (kind `expose`), `requestLogs` (the shop, Dossier, patron, home, Legacy, bodyguard and bar kinds), `campaignEvents` (the Headline Story's attached Case File), `encounters` (`minder`); the shops, the Front's places, patrons, the catalogue and the bodyguards are content (ADR 0051–0057, 0088; as built, docs/tech/slice-8.md Deviations). **Deferred with the season (16 Oct 2026, ADR 0058):** `seasons` (the Hall of Fame), `nation` (the running season), `contributions` (`season\|{s}`), `laws` (`endedBy: 'season'`) | `equipment` (four slots), `outfits`, `lastOutfit`, `patrons[]` (Favour, first visit, Requests, tier days, the weekly favour), `home.flat { cityId, boughtDay, paidThroughDay }`, `legacy { total, spent, perks }` (`seasonCredited` deferred), `milestones`, `expose` (the story's step 1), `dossierBurns`, `dossierLastAt` / `dossierSeenAt`, `bodyguard { tier, name, paidThroughDay }`, `buffs` (well fed, spirits), `firsts`, `presence.recognised` (unversioned), the day's limits on `today` (calls, rounds, the exposé) |
| 9 | `telemetry`, `playerDays`, `networkSightings`, `signupCaps`, `inviteCodes`, `accountLinks`, `audits`, `reports` (replacing `chatReports`), `editorNotes`, `appeals`, `feedback`, `moderationLog`, `modProposals`; on Better Auth's `user`: the role, the moderation state, the normalised email, the closure, the tester flag; changed: `cities` and `districts` (`active`), `influenceLedger` (`damped`), the election collections (`setAside`, recounts), `officeTerms` (`recounted`, `vacatedBy`), `chatLimits` (reports), `paperEntries` (`desk.away`) (ADR 0059–0072) | `settings`, `seen.purpose`, `renamedDay`, `retired`, `today.bailsXp` |

City opinion (including home-city morale) lives inside the `cities` documents, and each capital district's in its `districts` document (ADR 0027), as `opinion {faction: share}`.

---

## 6. First steps (done)

1. Archive the old code: remove `apps/api` and `apps/web` in one commit, so it stays in git history for reference.
2. Set up the new monorepo skeleton (slice 0 layout) and run an empty client and server locally (no deploy until the end of the project).
3. Write `packages/rules` v1 with tests: the check formula, seeded RNG, lazy Energy.
4. Build the economy sheet and the Coalport content list (design for slice 1), while slice 0 is built.
