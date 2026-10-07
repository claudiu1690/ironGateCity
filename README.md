# Irongate City

A political browser RPG set in a fictional 1946 Central European republic. The v3.0 code that used to live here has been archived (see git history); the game is being rebuilt from scratch in vertical slices. Start with [`CLAUDE.md`](CLAUDE.md) for the project rules and team, [`docs/GDD.md`](docs/GDD.md) for the game design, and [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for the stack and the slice plan. The current slice's technical design is [`docs/tech/slice-2.md`](docs/tech/slice-2.md) (slice 2, "Arrival"); the earlier ones are [`docs/tech/slice-1.md`](docs/tech/slice-1.md) and [`docs/tech/slice-0.md`](docs/tech/slice-0.md).

## Development

### Prerequisites

- **Node 22.12** (see `.node-version`) and **pnpm 10.34** (`corepack enable` picks it up from `package.json`).
- **Docker Desktop**, only for the persistent local database. Everything else, tests and e2e included, runs without it.
- The first test run downloads a `mongod` binary for `mongodb-memory-server` (about 100 MB on Linux, 600 MB on Windows) to `node_modules/.cache/mongodb-memory-server`, or to `MONGOMS_DOWNLOAD_DIR` if set.

```sh
pnpm install
```

### Run the game

Two ways, depending on whether Docker is running.

**Without Docker (in-memory database, data lost on exit):**

```sh
pnpm dev:mem
```

This starts an in-memory MongoDB replica set on `127.0.0.1:27018` (`pnpm db:mem`), the API on <http://localhost:3001>, the client on <http://localhost:5173> and the worker (the Agenda `city-day` job, below). No `.env` is needed. The API runs in memory mode against that replica set, so the test hooks (below) are on for hand-testing. Open the client and sign up with a face: the origin story (six of the father's questions, each saved as it is tapped, so a reload resumes it) and the street, where you pick a party. The next screen is your home city's welcome edition (_The Coalport Clarion_, _The Duskwall Sentinel_ or _The Ashford Gazette_); **To the city** opens the map with the first pin's sheet open. The Letters row in the paper opens Ambition chapter 1.

**With Docker (persistent database):**

```sh
cp apps/server/.env.example apps/server/.env   # once; defaults point at the Docker database
pnpm db:up                                     # mongo:7 single-node replica set on 27017
pnpm seed                                      # once: collections, indexes, city state (idempotent)
pnpm dev                                       # API :3001 + client :5173
pnpm db:down                                   # when you're done
```

The client proxies `/api` to the API, so the browser only ever talks to its own origin (ADR 0001). Check the API with <http://localhost:3001/healthz>.

**The worker (slice 3).** `apps/server/src/worker.ts` runs the Agenda job `city-day` at 00:01 UTC and once at start: for each home city it counts the election, seats the council, closes nominations, divides the council on its ordinance and applies the morale drift (ADR 0017). `pnpm dev:mem` starts it; with Docker, run `pnpm dev:worker` beside `pnpm dev`; in production it is `node dist/worker.js`, a second process from the same image. The game stays correct without it: every request settles its home city's day first (the lazy path), so a quiet city is simply counted when someone next visits.

### Checks

| Command          | What it runs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`      | ESLint (typescript-eslint) in every package                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm typecheck` | `tsc --noEmit` in every package                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm test`      | Vitest: rules (with coverage), content, db, server and ui. The db and server suites start their own in-memory replica set; no Docker needed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm e2e`       | Playwright: builds the server, runs it with `DB_MODE=memory` and the test hooks behind `vite preview`, and plays on a phone viewport: sign up with a face → the arrival (review 4: *The Last Train In*, three beats) → the welcome edition → the favour at the HQ → map → ×1 and ×3 → result modal; take a job → shift → next day's paper; Ambition chapter 1; and, last, in its own project (it moves the shared clock a cycle), the council cycle: declare → the branch's endorsement → the ballot → the count → the ELECTED front page → an ordinance → the ordinance in play. The arrival also runs on a 360 × 640 phone and a 1440 × 900 desktop, and checks the first session's art stays under 1 MB. Last of all, `review4.spec.ts` walks the review-4 notes a new member meets and sweeps every screen it passes for system terms, war words and *close the game*. Run it on free ports with `E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e` when `pnpm dev:mem` holds the usual ones. First time: `pnpm --filter @irongate/client exec playwright install chromium` |
| `pnpm build`     | Client bundle (`apps/client/dist`) and server bundle (`apps/server/dist/index.js`, `dist/worker.js`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pnpm format`    | Prettier                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

Everything at once, as CI does: `pnpm art:check && pnpm turbo lint typecheck test build && pnpm e2e`.

### Art (ADR 0007, ADR 0015)

The web art in `apps/client/public/art` is generated and committed; the print-sized sources are not.

| Command          | What it does                                                                                                                                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm art:build` | Reads the catalogue (`packages/content/src/data/art.ts`) and the sources from `IRONGATE_ART_SRC` (default `E:/Projects/ironGateCity Docs/art-direction`), writes AVIF and WebP at the catalogue widths, skips unchanged files (`.build.json`) and enforces the per-file budgets |
| `pnpm art:check` | Checks every catalogue file exists and is within budget, every SVG is safe (no script, event handler, foreignObject or external reference) and the whole set is at most 12 MB, without the sources (CI runs it)                                                                 |

Kinds: `map`, `scene`, `portrait`, `avatar`, `item` (AVIF and WebP at the catalogue widths) and `vector` (the faction crests, copied as `/art/<id>.svg`). A changed image gets a new id (`map.coalport.day.v2`): `/art/*` is served with a one-year immutable cache.

### Test hooks and the playtest report

- `E2E_TEST_HOOKS=1` (only with `DB_MODE=memory`; the server refuses to start otherwise) adds `POST /api/test/clock { advanceMs }` or `{ advanceTo: { cityId, cycleDay, hour? } }` (forward only, to the next `hour`:00 UTC, default 9, on a day with that council cycle day), `POST /api/test/city-day` (what the worker's job does, at the test clock) and `POST /api/test/character { fxp?, successes?, pc?, energy?, level?, xp?, iron?, cityId?, residence?: { cityId, districtId }, irongateSuccesses? }` (the signed-in player's character; `level` sets XP to that level's threshold, `cityId` places the character off any train, `residence` registers with every window open). Slice 4 adds `POST /api/test/clock { advanceTo: { weekday: 'monday', hour? } }` (to the next Monday), `POST /api/test/journey { arriveNow: true }` (the caller's train arrives now; the next read settles it) and `POST /api/test/issues { cityId, issueIds }` (this week's Issues of a city, for specs that pin numbers). Slice 5 adds `heat`, `health`, `marks: [{ kind, daysAgo }]`, `agi`, `str`, `cha` and `rank` to `POST /api/test/character`, and `POST /api/test/street { runIn?: 'next' | 'never', opponentId?, checkRoll?, choiceRoll?, caught?: 'always' | 'never' }` (the caller's **next** mission or rival tap uses these, once), `POST /api/test/held { send: 'cells' | 'infirmary' }` or `{ releaseNow: true }`, and `POST /api/test/run-in { decideNow: true }` (the pending run-in's window ends now; the next read leaves it to luck). Playwright and `pnpm dev:mem` turn them on. In memory mode `MONGODB_URI` is used only when it points at 127.0.0.1 or localhost (the `pnpm db:mem` replica set) and carries no option that could route the driver elsewhere (only `directConnection`, `replicaSet`, read and write concerns, timeouts and `appName`; `proxyHost` and the like are refused, QA m3); anything else is ignored and an in-process replica set starts. The same guard holds the dev panel (below).
- `pnpm admin:boost --email <address> [--email <address> …] [--dry-run]` (slice-3 playtest, an operator script against `MONGODB_URI`, never an API route) lifts the chosen testers' characters to Rank 3 (2,000 Faction XP), Known in their home city (30 Successes) and the 10 PC deposit, so they can stand in the next nominations window. It never lowers anything, prints what it changed, is safe to run twice, and marks each boosted character `playtest.boosted` with the time and the values before. Against `pnpm dev:mem`: `MONGODB_URI="mongodb://127.0.0.1:27018/irongate?directConnection=true" pnpm admin:boost --email you@example.test`.
- `pnpm report:playtest` prints the slice-1 playtest numbers (sessions, returns within 2–4 h, ×3 share, paper read rate, orders, shifts, levels, contended transactions) the slice-2 arrival funnel (sign-up → face → answers → joined → first action → welcome orders → job → chapter 1, with median and p75 times, overall and per faction) and the slice-3 elections section (per election and council term, the first vote, the first seat with boosted and natural testers apart, next-day returns, morale, contention around midnight) and the slice-4 battleground section (journeys, legs, cards drawn, answered on the way or on arrival, slept through, dwell at the arrival, the first trip after Level 10; first moves, moves home, rooms, residents per district; the capital's counts and councils; close-race days, comebacks, control changes; the Issues by week; contributors, heroes and who moved the capital; contention per district) and the slice-5 risk section (missions by type and day, legal and illegal, outcomes and repeats; run-ins, how they were answered and the loss rate on luck; Heat at mission time and the time spent Hot; marks and fades; the cells and the infirmary, waited against paid, and who came back the next day; rival ground: trips, cards, flags, Party XP there against home, the pressure on each home city, deportations) and the review-4 section (the prologue's three beats and whom players helped, the favour and how soon after the join, journey cards answered on the way or on arrival, the Town Hall's gallery, the cells' marked arrests and the day's orders taken off) from `MONGODB_URI`, read-only. Moves and rooms come from request logs, which expire after seven days: run it within a week of the playtest. `--json` for raw output. Against `pnpm dev:mem`: `MONGODB_URI="mongodb://127.0.0.1:27018/irongate?directConnection=true" pnpm report:playtest`.

### Reviewing with the dev panel

A five-day council cycle in minutes, by hand. Start the game with `pnpm dev:mem`, open <http://localhost:5173>, sign up and arrive. A small **Dev** button (dashed amber border) sits on the right edge, half-way down: it opens the **DEV · test clock** sheet. It shows the game time in UTC and in your own clock, the City Day, your home city's phase and cycle day with when the next phase starts, morale and the ordinance in force, and (slice 4) where you are (a city, or the train and its minutes left), where you live with your windows, the capital's five districts (shares, close race, comeback) and your residence city's Issues with their points, and (slice 5) Heat with its cool-by time, Health, the record and its fade day, a stay (minutes left, bail), a run-in (who, decides at), today's flags, bars, the rival pressure of the city you are in and what your next act is forced to. The buttons:

| Button                 | What it does                                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **+1 hour**            | Moves the clock an hour                                                                                                                                                                                             |
| **Next day**           | To 00:01 UTC of the next City Day, then runs the city day (the worker's job) and settles you: the new paper is in                                                                                                   |
| **Skip to next phase** | Nominations → the polls → the count, in your home city: to 00:01 UTC of the next phase boundary, then as Next day                                                                                                   |
| **Boost me**           | Rank 3, _One of Us_ at home (150 Successes, above the operator boost's _Known_ so a lone reviewer can win), at least 30 PC and a full bar. Never lowers anything, and never sets `playtest.boosted` (the playtest report's boosted / natural split is the `admin:boost` script's alone) |
| **Refill Energy**      | A full bar                                                                                                                                                                                                          |
| **Arrive now**         | (Slice 4, shown on a train) Your train arrives now: the journey screen turns into the arrival modal |
| **Next Monday**        | To 00:01 UTC of the next Monday, then as Next day: last week's Issues resolve and two new ones are drawn in every open city |
| **Level 10**           | Level 10 (the train is open) and Rank 2 if below (you can register in the capital) |
| **Take me to Irongate** | You stand in Irongate at once: no ticket, no card (the map opens on the capital) |
| **Live in… / Live there** | Registers you in the chosen capital district, or back home, with every window open (you vote and stand at once) |
| **Risk: Heat / Health / Record** | (Slice 5) Heat 0, 30, 60 or 80; Health full, half or 10; a clean record or 2, 4 or 7 of today's minor marks |
| **Next run-in / Set** | (Slice 5) Your next mission or rival tap: no run-in (_Off_), a run-in with the place's opponent (_Random_), or with one of the six. **Next caught: on**: that act is caught |
| **Cells now / Infirmary now** | (Slice 5) Taken to the cells or the infirmary of the city you are in, with the real sentence and bail. While held: **Release now**. While a run-in waits: **Decide now** (luck decides) |
| **Level 6 / Rank 3** | (Slice 5) The Harbour and the missions open |
| **Take me to… / Go** | (Slice 5) You stand in a rival home city at once: no ticket, no card. **Lift the bar** clears a deportation's bar |

Each action prints one line (_Now Thursday 1 Oct 00:01 UTC · polls open in Coalport_) and refreshes the HUD, the paper and the map. The clock is the server's **shared** test clock: it moves for everyone on this local server, and only forward (restart `pnpm dev:mem` to start again).

The panel exists only in memory mode: its routes (`GET /api/test/dev/status`, `POST /api/test/dev/{hour,day,phase,boost,energy,arrive,monday,level10,irongate,live}` and slice 5's `{heat,health,record,runIn,caught,cells,infirmary,release,decide,level6,rank3,goto,unbar}`) are registered with the other test hooks, behind `E2E_TEST_HOOKS`, which the server refuses outside `DB_MODE=memory`. Anywhere else the status route is a 404 and the client renders nothing, whatever the build.

**The Last Train In** (review 4, from a fresh `pnpm dev:mem`; eight taps from sign-up to the first result):

1. **Sign up** with a name and one of the eighteen faces.
2. **The platform** (Irongate Central, the last train in): three rows, Holm with a parcel, Stahl with a bundle of flyers, Grey with a signature to witness, each with their portrait and two lines. Tap a row (it inverts), then the button, ***Help Holm · the six o'clock to Coalport***: whom you help is your party, and their town is your home.
3. **The suitcase** (the six o'clock to Coalport): *You carried Holm's parcel.* at the top, Holm beside the text. One tap: tools, books or not much (+6 and +1 to your stats, never shown).
4. **The lining**: his ward book, his letter from prison or the marker (your Ambition); his coat goes on (Charisma 5). The join is sent at once, and the welcome edition opens: *Holm's parcel wants delivering at the Union Hall; start there.*, three orders signed *— P.H.* (slot A by your best stat, the favour, *Take a job*).
5. **To the city**: the Union Hall's sheet is open with ***Deliver the parcel*** first and ringed. **Once · 10 Energy** is the first result: the order *1 / 1*, Holm's signed line, the council session's Party XP. The favour then leaves the sheet; the branch meeting stays. Closing the tab at any beat resumes there.

**A suggested walk-through** (a Collective member in Coalport):

1. **Boost me.** The HUD reads Organiser (Rank 3), PC 30.
2. **Skip to next phase** until the sheet says _Count day_ or _Nominations_. The paper's Polling Day row offers _Stand for the council · 10 PC_.
3. **Declare** from the slate. To stand at the close you need two endorsements: carry out the day's three Party orders while filed and the branch endorses you (Refill Energy as needed).
4. **Your total.** A total is ward vote (Successes ÷ 5) + 3 per endorsement + ballots. Boosted to _One of Us_, a lone candidate totals 30 + 6 + 1 = 37 against about 17–21 for the seventh NPC seat, so you top the poll. (With the operator boost's _Known_ it would be 13, and you would lose; that is the real race.)
5. **Skip to next phase**: the polls open. The row says _Cast your ballot_; cast it for yourself.
6. **Skip to next phase**: the count. The paper's front page carries the ELECTED stamp; **To the council** opens the chamber.
7. **Vote an ordinance** (or propose one, 20 PC) while the council votes (cycle days 0–1).
8. **Next day** twice (or Skip to next phase once): the council divides at the boundary into the polls. The plate reads _Council rule: {name} · {what it does, in plain words} · 5 days left_ (a tap opens the Town Hall) and the tickets carry its tags.
9. **Unrest:** keep skipping phases without casting a ballot. Every count with no home ballot costs the home share 3 points, and the daily drift back toward 70 is small, so after about four unvoted counts (eight skips) Coalport falls below 60: the plate reads _Unrest_, the _Restore the base_ orders appear and the NPC councillors abstain.

**The Town Hall's desk** (review 4, after winning a seat in the walk-through above):

1. The front page after the count carries ***What now***: what a councillor does and when, and **To your desk at the Town Hall**, which opens the hall's pin. It shows once there and once at the hall.
2. The Town Hall's sheet: the desk (your vote and **Propose** while the council votes, the Next line by cycle day), the rule in force in plain words, the council's members (*Player* or *Local candidate*), the order paper, the week's Issues and the Election card. *Sit in the public gallery* is the hall's ticket, open to anyone at any Level.
3. The plate's rule line (*… · studying costs a fifth less*) is a button: it opens the hall. `/council` shows the same blocks for your home.

**The first trip and a move** (slice 4, from a fresh `pnpm dev:mem`; a Collective member in Coalport; review 4: the journey on the map, *Live here*, a bed):

1. **Level 10.** The map's **City | Nation** control (bottom left on a phone, top right from 640 px); **Nation** opens the painted republic with Coalport (_you are here_) and Irongate in view. Tap **Irongate · 12 min**: the card says who holds it, this week's Issues and **Board · 20 Iron · 12 min**.
2. **Board.** The journey runs on the nation map: the route drawn on the rails, your pin on it with *To Irongate · in 12 min* under it, the plate (a 480 px side sheet from 1024 px) with the arrival time. Drag or zoom the map and ***Follow your pin*** brings it back. The card arrives on the way, at a moment drawn when you boarded: the pin pulses and the sheet *On the train to Irongate* opens (*A talkative passenger*, one tap, optional); closed, it waits as *On the way · …* on the plate. To see it at once, **+1 hour** past the moment in the panel, or **Arrive now** (an unanswered card waits in the arrival modal).
3. **Arrive now** (or wait twelve minutes, or close the tab and come back later: the arrival waits). The arrival modal reads _Arrived · You're in the capital_ with the ground sash (whose ground this is) on the picture; **Continue** lands on Station & Market with Central Station open. The paper is still your own: *The Coalport Clarion · Irongate edition*.
4. **The capital.** _‹ Irongate_ goes back to the overview: five districts that cover the whole picture, river included, with their names, no places. Tap one to zoom in; inside, only its places show, the rest of the city is dimmed, and the map drags to the district's corners and no further. The tram bar hops districts in one tap.
5. **A move.** In a district, tap _Where you live_ (the plate's corner on a phone): **Live in {district} · 500 Iron** opens the sheet with the plain why (*vote and stand here, and your orders come from here*); **Live here** gives the _Moved in_ modal, and the Election card reads _You live in {district}_. (Rank 2 is needed: Level 10 gives it.) A bed is a place card instead: Tram Junction's **Lodgings**, **Take a bed · 100 Iron** (*A bed in Irongate*; 50 while the *Eviction Notices* Issue holds).
6. **Skip to next phase** to the district's polls: _Voting is open in {district}_, six names in three parties. Skip again to the count: **See the result** shows the five districts, yours first.
7. **Next Monday**: the paper's _The Issues_ section reads _New this week_.
8. **Home.** Central Station's **Trains** card: _Board the train to Coalport · 20 Iron · 12 min_, then **Arrive now**. The `journey-arrive` Agenda job (the worker in `pnpm dev:mem`) also settles a journey at its arrival time for players who never come back; the lazy arrival on the next read is the guarantee.

**A first mission** (slice 5, from a fresh `pnpm dev:mem`; a Collective member in Coalport):

1. **Level 6** (the panel; the next morning's paper says _The Harbour Opens_). Review 4: Coalport is one map. Before Level 6 the Harbour's places are greyed pins with a lock (_Opens at Level 6_; a tap says so); now they open, numbered 7–11, and the Places list groups them under *The Harbour*. Every city has a **Town Hall** pin, open at every Level.
2. **The Shipyard** (pin 7): under the tickets, **Missions**: _Speak at the launch_, _Mission · Speech_, an odds word and _Heat +0 · A little risk_.
3. **Choose a way**: the briefing and three ways with their odds words. Tap one (it inverts), then the button _{way} · 15 Energy_. The result: _Success_, _Partial_ or _Failure_, the receipt, and _Missions remember: next time, one tap_.
4. The ticket now reads **Again** (and _Choose another way_ under it): one tap.
5. **Rank 3** (the panel), then **The Far Bank** (pin 11): _Tear down the Vanguard's posters_, _Mission · Against the Vanguard_, _Heat +6 · Risky · if caught, a mark on your record_. Set **Next run-in** to _the Vanguard street enforcer_ first to see a run-in: one choice (_Fight_, _Run_, _Talk your way out_, _Pay them off · 60 Iron_, or _Leave it to luck_); the result opens with what happened. Close the tab instead and come back after five minutes: the run-in was left to luck and its result waits.

**A night in the cells** (slice 5, after the first mission):

1. **Heat 60** and **Next caught: on** (the panel), then a risky mission (the posters again). Only a **Partial or a Failure** can be caught: *Next caught* forces the catch, not the outcome, so a Success goes through and uses it up; set it again and play until one comes off badly, or use **Cells now** in the panel to go straight in. Caught, the result is stamped _Taken in_ with _Your record: taken in · 1 mark · On file_, _Orders off until the day turns_ and one button, **To the cells**. Review 4: the cells cost three things and take nothing: a sentence of 20 minutes plus half your Heat (at most 60), the day's Party orders, and at least one mark.
2. The cells: the duty officer, the minutes and _out in …_, **Pay bail · {n} Iron**, and the cell's one tap, _Listen to the cells_. The Map tab lands here while you are held; the Paper and Me work. The door opens at the time shown either way (or **Release now** in the panel). From a second account, the Harbour Police's sheet lists you under ***In the cells now***.
3. **Pay bail** (or wait): _Released_, Heat down to 25, the record line and *orders off*, and **Continue** lands on the Harbour Police's sheet; the orders panel reads *Orders off today*. **Next day**: the paper reports the night in the cells and the orders are back, and the desk shows Heat and _Your record · On file_.
4. Me: Health, Heat with _cool by_, the record, and **Have a mark struck off · 30 Political Capital** (Boost me gives 30).
5. **The infirmary**: **Next run-in** _the Vanguard street enforcer_, then the posters and **Fight** until one is lost (or **Infirmary now**): _Taken to the infirmary_, the matron, 20 minutes, **Walk out well · 5 Energy · 100 Iron** or **Discharge yourself · 5 Energy**.

**A rival trip** (slice 5, from a fresh `pnpm dev:mem`; a Collective member):

1. **Level 10** and **Rank 3** (the panel), then Map → **Nation**: Duskwall reads _Duskwall · rival ground · 27 min_; its card _Rival ground · Home city of the Vanguard_, what that means, and **Board · 20 Iron · 27 min**.
2. **Board**: the first trip's card is always _Papers, please_. _Show your papers_ has no odds word: it depends on your Heat and your record (Cool and clean: _Waved on_).
3. **Arrive now**: the arrival reads _Duskwall · rival ground_ with the warning, once, and lands on Duskwall's Town Hall. The plate: _Duskwall · rival ground_, what your work draws from the Vanguard's morale today, and Heat. Every ticket has one button, **Once**, and _Rival ground · +50 % Party XP · worse odds_; the orders panel is one quiet line, _Your orders are in Coalport · 0 of 3 done_. The paper reads *The Coalport Clarion · Duskwall edition*: Duskwall's dateline, its Issues first and its election's line, your own orders and letters.
4. **Heat 60**, **Next caught: on**, then Beacon House's _Spike the duplicator_: taken in, the cells with _Bail is double on rival ground_. **Release now**: _Put on the train_, Duskwall barred until tomorrow; **Continue** shows the train home (no card). **Arrive now**, then Nation: Duskwall reads _Barred · until …_ (**Lift the bar** clears it).

### Repository layout

```
apps/client      React 19 + Vite SPA (TanStack Router and Query, tRPC client, Better Auth client, Tailwind v4)
apps/server      Fastify + tRPC + Better Auth (src/index.ts) and the Agenda worker (src/worker.ts)
packages/rules   Pure game maths: RNG, checks, lazy Energy/Rested, rewards, levels, Standing, orders, jobs, the City Day, the paper. No I/O
scripts/art      The web art pipeline (sharp)
packages/content Factions, cities, locations, actions, jobs, Party orders, headlines, the art catalogue and UI copy as Zod-validated data
packages/db      Mongoose connection, models, indexes, seed, in-memory replica-set helper
packages/ui      Design tokens, fonts and shared components (HUD, ticket, stamp, result modal)
```

Workspace packages are consumed as TypeScript source; Vite, `tsx` and `tsup` compile them.

### Environment

Server variables are validated at start-up (`apps/server/src/env.ts`) and documented in [`apps/server/.env.example`](apps/server/.env.example); client variables are in [`apps/client/.env.example`](apps/client/.env.example).

### Deployment (not provisioned yet)

- **Client → Vercel:** project root `apps/client`; `apps/client/vercel.json` holds the build and the `/api` rewrite. Replace `<api-host>` with the API's host once it exists.
- **API and worker → Railway or Fly:** one image from `apps/server/Dockerfile` (build context: the repository root), two services: `node dist/index.js` with health check `/healthz` (see `apps/server/railway.toml`) and `node dist/worker.js`.
- **Database → MongoDB Atlas:** set `MONGODB_URI`, then run `pnpm seed` against it once.
- **Sentry (optional):** `SENTRY_DSN` on the server, `VITE_SENTRY_DSN` on the client. Absent means off.

The provisioning steps are listed in `docs/tech/slice-0.md` §18.
