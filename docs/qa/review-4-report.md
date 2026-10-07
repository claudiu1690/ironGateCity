# QA report: the review-4 fix round

| | |
|---|---|
| **Build under test** | branch `slice-0` at `70bcab2` (commits `e01a292` → `70bcab2`, phases 0–9), plus the QA test files in §5 (uncommitted) |
| **Date** | 7 Oct 2026 |
| **Tester** | QA agent. A QA sub-agent was started for the browser audit at the six screen sizes, with its own worktree and ports. **Its results had not come back when this report was handed over**, so the screen-level rows below are marked ➖ where only a browser can tell. |
| **Sources of truth** | the user's notes `docs/review/2026-10-06-review-4.md` · `docs/design/review-4-answers.md` incl. §28 (the fix list) and §29 (settled) · `docs/tech/review-4.md` incl. Deviations 1–124 · ADRs 0073–0078 · `docs/GDD.md` as updated · `docs/review/review-4-build-notes.md` (what the user reads) · `CLAUDE.md` |
| **Environments** | Vitest on the in-memory replica set (rules, content, db, server, ui) · the Playwright suite against the production build in a clean worktree (`E:\Projects\ironGateCity-qa4`, the tiles junctioned in), `E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e` · `pnpm --filter @irongate/db migration:008` · the built art in `apps/client/public/art` against the art folder. The user's `pnpm dev:mem` (3001 / 5173 / 27018) was left untouched |

---

## 1. Verdict

**Pass with issues. Nothing blocks the review. Before the user plays, fix m1 (a line the build notes promise but the build doesn't print) and m3 (the compartment picture, its alt text and beat 2's narrative disagree).**

The server side of the round is solid:

- **Migration 008** works through `ensureIndexes`, the way a start-up runs it. It resets six drafts stopped at every point of the old six questions, keeps their face and name, and leaves alone drafts already on the new beats, empty drafts and completed drafts. It dates the one open journey that has a card and leaves alone the dated, card-less, arrived and closed ones. Run twice it modifies nothing. Two start-ups at once apply it exactly once. The developer's check script prints the counts deviation 122 quotes, to the digit.
- **The refusals hold.**
  - A locked place's ticket or mission is refused whatever the client sends.
  - The Town Hall is open at Level 1 even in Ashford's later-edition quarter (served, no Party XP, no opinion).
  - `CARD_NOT_YET` writes nothing and keeps no key. The card's id and title leak through none of `character.me`, `paper.today`, `travel.nation` or `travel.journey` before its moment.
  - `NOT_OFFERED` / `ONCE_ONLY` behave as ADR 0073 says.
- **Keyed writes hold under load:**
  - the favour sent six times under one key gives one log, 10 Energy once, six identical answers;
  - lodgings from three keys at once never pass fourteen nights, and every 100 Iron bought a week;
  - beat 1 tapped with three rows at once keeps one answer, and the join follows it.
- **The rules match the GDD for every case, not just examples:**
  - the sentence for Heat 0–100 at home and on rival ground;
  - the arrest's own mark and the seven-day escalation, for every type, a tap, and an earlier arrest 0–12 days back;
  - bail 150 / 80 / 300;
  - `cardAt` inside 0.20–0.80 for 14,000 draws across seven journey lengths;
  - the pin on a two-leg journey is continuous through the capital at 12 / 27;
  - `placeOpen` for every quarter lock and Level 1–12.
- **Irongate tiles the picture.** I sampled 160,000 points off the borders: each is in exactly one district, none in zero and none in two. The corners and both banks of the river belong, and all thirty places sit inside their own district.

One finding: **the "once only" favour isn't once only for a late sign-up** (m2). Someone who arrives after 22:00 UTC is dealt the welcome set again the next morning. The favour is offered again, and it pays again.

The **build notes are true except in three places:**

- row 5's *Level 2 · Intelligence 12 → 13* (the build prints *Level 2 · point placed*, m1);
- the "Things to look at" line about the compartment picture (m3);
- row 25's Me-tab quote, which carries the party's name in front (n4).

**Regressions:** none. Every slice 1–5 suite is green, including the capital, missions, run-ins and elections. The e2e suite passed in full on its second run. The first run lost one test to a sign-up that took more than five seconds under load (n7); that project passed alone and in the full re-run.

**Bug count:** blocker 0 · major 0 · **minor 4** · nit 9. The browser audit is outstanding (§8).

---

## 2. Test plan followed

Legend: ✅ verified and correct · ⚠️ verified, bug filed · ➖ not verified here (needs the browser audit).

### 2.1 Server: refusals, keys, atomicity

| # | Check | Result |
|---|---|---|
| S1 | The favour: the HQ's first ticket while its order is open; ×3 `ONCE_ONLY`; after it, a new key `NOT_OFFERED`; two keys at once, one winner (developer tests, re-run) | ✅ |
| S2 | The favour under **one** key sent six times at once: one log, Energy 100 → 90, six identical answers, slot B done once | ✅ |
| S3 | The favour for a late sign-up (22:30 UTC), then the next morning | ⚠️ **m2** |
| S4 | The favour while the day's orders are off (dev panel only) | ⚠️ n2 |
| S5 | A Harbour ticket and mission at Level 5: `ACTION_LOCKED` / `MISSION_LOCKED · QUARTER · 6`, nothing written; served at 6 (developer tests, re-run) | ✅ |
| S6 | Ashford's Town Hall (painted in the later-edition quarter) at Level 1, Alliance: *Sit in the public gallery* served, 6 Energy, no Party XP, no opinion | ✅ |
| S7 | `CARD_NOT_YET` before the moment, nothing written, the same key works after it (developer tests, re-run); the card's id and title in none of `character.me`, `paper.today`, `travel.nation`, `travel.journey` one second before `cardAt` | ✅ |
| S8 | `residence.room`: one key ×4 (developer); **three keys at once** → never more than 14 nights paid, Iron = 1,000 − 100 × beds granted | ✅ |
| S9 | `council.hall` for a city whose day nobody has settled, after the city's map (as the client does) | ✅ |
| S10 | `council.hall` alone for that city | ⚠️ n3 |
| S11 | The desk only on one's own council: a Coalport councillor at Duskwall's hall gets `desk: null`, `whatNow: null` | ✅ |
| S12 | `council.whatNowSeen` concurrent, and on another's term (developer tests, re-run) | ✅ |
| S13 | *In the cells now*: any party, soonest first, public fields only (`avatar, factionId, name, until, you`), a stay past `until` hidden (developer); **a prisoner who pays bail leaves the list at once** | ✅ |
| S14 | Beat 1 answered with three rows at once: one answer kept; the join follows the row that won | ✅ |
| S15 | Orders off on every arrest path: a caught Partial, a police run-in by choice and by luck, a rival tap, the test hook (developer tests, re-run) | ✅ |
| S16 | Local editions: away, in Irongate, on a train, a capital resident, at home, a stored Herald (developer tests, re-run) | ✅ |

### 2.2 Rules against the GDD

| # | Check | Result |
|---|---|---|
| R1 | The sentence for Heat 0–100, home and rival: 20 + ⌊Heat ÷ 2⌋, ×1.5 rival, at most 60, never under 20; answers' 58 → 49 / 60 | ✅ |
| R2 | `marksFor`: every mission type, a tap, arrested or not, an earlier arrest 0, 1, 3, 6, 7, 8, 12 days back or none. An arrest is never markless; three serious at 0–6 days, not 7 | ✅ |
| R3 | Bail with the arrest's mark: 150, Legal Aid 80, rival 300 (economy §24.3) | ✅ |
| R4 | `drawCardAt`: 7–60-minute journeys × 2,000 seeds, always 0.20–0.80 | ✅ |
| R5 | `trainAt` on two legs: the capital at 12 / 27, no jump over 0.001 in 10,000 steps, the ends on the pins | ✅ |
| R6 | `placeOpen`: `town-hall` open in every quarter at every Level; any other kind open exactly by the quarter's lock | ✅ |
| R7 | `closeOrders` twice keeps the first moment and changes no item | ✅ |

### 2.3 Content

| # | Check | Result |
|---|---|---|
| C1 | Irongate: 400 × 400 grid, every off-border point in exactly one district; corners and river banks; every place (the City Hall included) inside its own district | ✅ |
| C2 | Home cities: no quarter carries a frame, outline, label or district; one `town-hall` each, last in its list | ✅ |
| C3 | Routes: every point on the picture; no leg longer than three times its straight distance | ✅ |
| C4 | The rank ladder: seven *opens* lines and the six floors as the answers table; every party's seven titles are in GDD §5.4; *Activist · 1,212 / 2,000 to Organiser* | ✅ |
| C5 | No war word and no extremist term in any review-4 string (the origin, the halls, the favours, plain lines, routes, ranks, lodgings, residence, paper); no *close the game* anywhere in content | ✅ |
| C6 | Each party's favour is its HQ's first ticket and its welcome-B order names that HQ | ✅ |
| C7 | The countdown style: two to six days ahead is a weekday, never today's | ✅ |
| C8 | A moment seven days or more ahead | ⚠️ n5 |
| C9 | Faces: the eighteen built avatars side by side (note #1) | ✅ distinct |
| C10 | The compartment picture against its alt text and beat 2 | ⚠️ **m3** |

### 2.4 Migration 008

| # | Check | Result |
|---|---|---|
| D1 | Through `ensureIndexes`: six old drafts (1–6 answers) reset with face and name kept; new-beat drafts (1 and 2 answers), an empty draft and a completed old draft untouched | ✅ |
| D2 | Journeys: on the way with a card and no `at` → `at = boardedAt`; with `at`, no card, arrived, closed → untouched | ✅ |
| D3 | Run 2 modifies nothing (every step) | ✅ |
| D4 | Two start-ups at once: 6 resets and 1 dated card in total, nothing left half-done | ✅ |
| D5 | `pnpm --filter @irongate/db migration:008`: run 1 `resetOldDrafts 2/2`, `cardAtForOpenJourneys 1/1`, `cellsNowIndex 1/0`; run 2 modifies nothing (as deviation 122) | ✅ |

### 2.5 Screens (390×844, 375×667, 360×640, 667×375, 1440×900, 1920×1080)

The browser audit (tap targets, sideways scroll, the pin and plate labels against the sheets, motion and reduced motion, the walk of every note) was given to a sub-agent with its own worktree and ports. **Its results were not in at handback** (§8). What **is** verified on screen is the existing e2e suite: 129 tests at phone, 360 × 640, sideways and 1440 × 900, including the developer's `review4.spec.ts` walk and its vocabulary sweep, `travel.spec.ts` at 1440 × 900 and 390 × 844 (the side sheet, the route, the pin, the card, *Follow your pin*), `homeMap.spec.ts`, `landscape.spec.ts` (the paper on the desk) and `qa.slice5.spec.ts`.

### 2.6 Regressions (slices 1–5)

All developer and earlier QA suites green: rules 569 · content 331 · db 82 · ui 386 · server 591 (§6). The e2e suite covers the capital (overview, tram bar, ballot), missions and run-ins, the council cycle and the elections: green in run 2.

---

## 3. Bugs, ordered by severity

### Minor

#### m1. The level-up line after placing the point reads *point placed*, not the stat the build notes promise

- **Where:**
  - `packages/content/src/data/copy.ts` l. 555–562 (`levelUpLine`, `levelUpPlaced`);
  - `packages/ui/src/components/ResultModal.tsx` l. 612–616.
- **Steps:** a result that levels you up → place the point from the modal (*INT 12 → 13*).
- **Expected:**
  - build notes row 5: *the line changes at once to Level 2 · Intelligence 12 → 13*;
  - answers §5 and fix list 1's *Done when*: the same;
  - with two points waiting: *Level 3 · place your points (2)*.
- **Actual:**
  - *Level 2 · point placed*;
  - with two levels: *Levels 2–3 · 2 points to place*.
  - The developer's own test (`review4.test.tsx`) asserts *point placed*, so the gap is between the build and the design and notes, not a regression.
- **Why it matters:** the user reported this line, and the note tells them to look for a specific new wording that isn't there.
- **Fix:** print the placed stat (the modal already knows the stats before and after), or correct the build note.
- **Test:** `it.fails` in `packages/ui/test/qa.review4.test.tsx`. With the marker off it fails on *Received: Level 2 · point placed*.

#### m2. A late sign-up is offered the "once only" favour again the next morning, and paid again

- **Where:** `apps/server/src/services/dayService.ts` l. 190 deals the welcome set on every welcome day. `views.ts` `welcomeOffered` l. 167–181 only checks for an open welcome order today.
- **Steps:**
  1. Arrive at 22:30 UTC.
  2. Do the favour (the order is done, and the favour leaves the sheet).
  3. Read the next morning.
- **Expected:**
  - ADR 0073: *a first action that is offered once*;
  - answers §2.6: *a one-off welcome action*;
  - its own refusal copy: *That errand was for your first day, and it's done.*
- **Actual:**
  - Day 2's orders are `dir.shift-change, dir.welcome-b, dir.take-a-job` again.
  - The favour is back on the Union Hall's sheet.
  - A second tap is served: *Deliver the parcel*, order 0 → 1 done, +20 Party XP for the order, the same texts (*He writes your name in the book under hers*).
  - Two logs.
- **Who meets it:** every player whose first session starts after 22:00 UTC (GDD §13.7: their welcome day is two City Days).
- **Fix idea:** deal slot B from the rotation on the second welcome day when the favour is already logged, or have `welcomeOffered` refuse when the character has a log of the action. Designer: should the late sign-up's second day carry the committee session?
- **Test:** `it.fails` in `apps/server/test/qa.review4.server.test.ts`. With the marker off it fails at the next-morning sheet check (`expected true to be false`).

#### m3. The compartment picture, its alt text and beat 2 disagree, and the build notes describe a fourth picture

- **Where:**
  - the built `apps/client/public/art/scene.train-compartment-*.{avif,webp}` (committed in `f7e180d`);
  - the alt text in `packages/content/src/data/art.ts` l. 362–363;
  - `origin.step-suitcase.narrative`.
- **Actual:**
  - The built picture shows **a man in a hat reading a newspaper**, with a parcel on the opposite bench.
  - The alt text says *a woman asleep against the window*, a suitcase between two pairs of feet.
  - Beat 2 says *{helper} dozes against the window* (Stahl and Grey are men, and nobody dozes in the picture).
  - The build notes' "Things to look at" says the picture *shows a woman asleep by the window*.
  - Separately, the source `mvp/scenes/train-compartment.png` was replaced at 18:20 today, after the commit, with an **empty** compartment (a coat, a parcel, a lamp). The designer's §30.3 rewrites the narrative and the alt for that picture. Neither the new art nor §30.3 is in the build.
- **Expected:** the alt text describes the picture (accessibility), and the narrative doesn't contradict it.
- **Fix:** `pnpm art:build` with the new source, then apply §30.3's narrative and alt text. Correct the build note. `pnpm art:check` passes either way: it doesn't read the sources.
- **Test:** none automated (an art judgement). Recorded here.

#### m4. The council-rule note tells capital players *four councillors of seven*

- **Where:** `copy.help.ordinance` (`copy.ts` l. 471–474), used on the plate (`city.tsx` l. 391, 396) and on every Town Hall sheet (`TownHall.tsx` l. 152), the City Hall included.
- **Expected:** the capital passes a rule with six of ten (`CAPITAL_COUNCIL`). The *What now* card and the hall's own lines say *six of ten*.
- **Actual:** the note reads *Passed by four councillors of seven* in Irongate too. The sentence predates review 4, but review 4 puts it on a new screen, the City Hall's *rule in force*.
- **Fix:** take the figures from the council (`passVotes` / `seatCount`), as the hall's other lines do.

### Nits

| # | Where | What |
|---|---|---|
| n1 | `copy.ts` l. 478 (`help.today`: *since midnight*), l. 487 (*Your wage lands at midnight*); `orders.ts` l. 166, 338, 521 (*Paid at midnight*) | Answers §4 and deviations 3 and 7 remove *midnight* for the day's turn (01:00–03:00 in the player's clock), and the Jobs card now says *paid tomorrow 01:00*, but these five lines still say *midnight*, beside the clock's note *The day turns at 03:00* |
| n2 | `views.ts` `welcomeOffered` + `findAdvancingItem` | While the orders are off, the favour's order can't be done, so the favour stays offered and pays every tap (two taps → two logs). Only reachable through the dev panel on a first day. `it.fails` in `qa.review4.server.test.ts` |
| n3 | `townHallService.ts` l. 42 → `councilViewFor` | `council.hall` alone, for a city whose day nobody has settled, is refused `ELECTION_NOT_READY`. The read doesn't bootstrap the city as `city.get` does. The client always reads the map first, so players don't meet it. `it.fails` |
| n4 | build notes row 25 | Promises the Me tab reads *Activist · 1,212 / 2,000 to Organiser*. It reads *Red Collective · Activist · …* (deviation 13). Correct the note |
| n5 | `copy.when` / `copy.boundary` | Two days or more prints a bare weekday, so a moment **seven or more** days ahead reads as today's weekday: a bed paid fourteen nights reads *Your bed until Monday* on a Monday. Answers §4.2 has no form for a week or more ahead. Designer. `it.fails` in `qa.review4.content.test.ts` |
| n6 | answers §2.6 and §11.1, GDD §15.3; economy §24.1 | The favour and the gallery are said to be *difficulty 10*. At home the build uses GDD §8.4's 8 (correct by the table). The economy sheet's Vanguard *54 → 66 %* and the flattest build's *54 %* are worked at 10; at 8 they are 62 → 74 % and 62 %. Docs only |
| n7 | `apps/client/e2e/helpers.ts` l. 45 | `signUpOnly` waits the default 5 s for `/arrive`. Under load (my first full run, alongside another Playwright run) the sign-up took longer and `travel.spec.ts`'s 1440 × 900 test failed, skipping 44 later tests. Alone and in the re-run it passed. A longer timeout on that one `toHaveURL` would stop the cascade |
| n8 | README *A suggested walk-through* step 8 | Still says the plate reads *Ordinance: … · 5 days left*; it reads *Council rule: {name} · {plain line} · n days left* |
| n9 | Clock note at the user's UTC+3 | *The day turns at 03:00; the map is dark from 23:00 to 09:00*. The night window is UTC-fixed, which the clock now makes visible: a dark map at 08:30 in the morning. Pre-existing rule; for the designer |

---

## 4. One row per user note

Verdicts: **yes** (fixed as asked), **partly**, **no**. "Screen" means the evidence is the e2e suite. The QA browser audit at all six sizes is outstanding (§8).

| # | Note | Fixed as asked? | Evidence |
|---|---|---|---|
| 1 | Faces look the same | **yes** | Eighteen built avatars side by side: all distinct (five redrawn). The sign-up grid offers eighteen (the e2e page snapshot lists 18 radios) |
| 2 | Better intro story | **yes, with m2, m3** | Three beats, three parties (`arrival.spec.ts` phone, 360, desktop; server joins for all three; eight taps). The favour completes slot B and the secretary signs. The welcome decks and favour texts are word for word, with the recorded rewordings. Late sign-ups get the favour twice (m2); the picture and narrative disagree (m3) |
| 3 | Paper odd on a big monitor | **yes** (screen: `landscape.spec.ts` at 1280 / 959) | The 720 px sheet on the desk from 960 px. 1920 × 1080 not walked yet |
| 4 | No clock | **yes, nits n1, n5, n9** | `copy.when` / `boundary` tested to the edges. The HUD clock follows the dev clock (developer UI tests). *Midnight* survives in five day-turn lines (n1) |
| 5 | *place your point* stays | **partly** (m1) | It no longer stays, but it reads *point placed*, not the *Intelligence 12 → 13* the user is told to look for |
| 6 | *see the note* | **yes** | `orderSigned` third lines word for word in all three voices |
| 7 | Travel on the nation map | **yes** (server and rules); screen by `travel.spec.ts` | Routes, `trainAt` continuous, `cardAt` 0.20–0.80, the card withheld everywhere until its moment, `CARD_NOT_YET`, open on return and in the arrival modal. *Follow your pin* and the side sheet are covered by `travel.spec.ts` at 1440 × 900 and 390 × 844 |
| 8 | Irongate parts in no district | **yes** | 160,000 sample points: no dead area, no overlap; river included; every place inside its own district |
| 9 | Register or a room? | **yes** | One *Live here* state per row; the Lodgings card at Tram Junction only; the rule unchanged; keyed under three keys at once. (Build notes and README say *Take a bed · 50 Iron*: that is the price under *Eviction Notices*; the normal price is 100) |
| 10 | Won a seat, now what? | **yes** | *What now* once per term (front page and hall), the desk on one's own council only, the Next line by cycle day (developer tests + S11) |
| 11 | Council rules invisible, no place | **yes, nit m4** | Four `town-hall` places, open at Level 1 even in a later-edition quarter (S6); `plainLine` on all eleven rules; the plate's line opens the hall. The capital's note quotes the wrong majority (m4) |
| 12 | Heat: how, what, too small | **yes** | The note by state, *Cool at*, the 13 px line, Political Capital's own note (developer UI tests); `council`-type copy guards |
| 13 | Home orders do nothing away | **yes** | `OrdersView.away` in any other city and on a train; one 36 px line (developer tests) |
| 14 | ISSUE tag | **yes** | *Issue · {name}* chip and its note (developer UI test; copy word for word) |
| 15 | Keep the duty officer | **yes** | Lines unchanged |
| 16 | Don't say close the game | **yes** | No content string contains it (C5); the copy guard allows only the encounter's warning |
| 17 | *Legal Aid: half price*? | **yes** | The line and note; bail 80 with the arrest's mark (R3) |
| 18 | What does Reputation do? | **yes** | `help.standing` with *three times in a hundred*; *Known here · better odds* on checked tickets at Familiar+ (developer tests) |
| 19 | List of who is in prison | **yes** | `held.inCells`: any party, public fields only, the stale stay hidden, a bailed player gone at once (S13) |
| 20 | No repercussions | **yes** | The sentence (R1), the arrest mark and escalation (R2), orders off on every arrest path (S15), bail with the mark (R3); the release modal's lines (developer UI tests) |
| 21 | Home cities' odd outlines | **yes** | No shapes in content (C2); `lockedPins` with *Opens at Level 6*; `homeMap.spec.ts` green |
| 22 | Order sends me to missions I can't take | **yes** | The `offerable` test (developer content test over every template); the Level-6 Ashford case (developer server test) |
| 23 | A paper per city? | **yes** | Local editions in every case (S16); `rival.spec.ts` reads *The Coalport Clarion · Duskwall edition* |
| 24 | Health not always shown | **yes** (developer UI test: full Health shown) | Walk at all sizes outstanding |
| 25 | Rank names and unlocks | **yes, nit n4** | The ladder's seven rows and floors (C4); the Me tab line carries the party name in front, not as the note quotes |

**Twenty-three of twenty-five read as fixed. Two are partly fixed: #5 (m1) and, for late sign-ups and the compartment picture, #2 (m2, m3).**

---

## 5. Tests added (not committed)

| File | Tests | What it covers |
|---|---|---|
| `packages/rules/test/qa.review4.rules.test.ts` | **8** | The sentence for Heat 0–100, home and rival; `marksFor` over every type × arrested × earlier arrest against a reference; bail 150 / 80 / 300; `drawCardAt` 14,000 draws; `trainAt` on two legs (12 / 27, continuity at 10,000 steps); `placeOpen` for every lock and Level 1–12; `closeOrders` idempotent |
| `packages/content/test/qa.review4.content.test.ts` | **15** (1 `it.fails`: n5) | Irongate's 400 × 400 tiling sample, corners, river, places inside; home cities without shapes, one hall last; routes on the picture; the ladder against the answers and GDD §5.4; the countdown at 2–6 and 7 days; war words, extremist terms and *close the game* over every review-4 string; each favour first at its HQ |
| `packages/db/test/qa.review4.db.test.ts` | **2** | Migration 008 through `ensureIndexes` on old drafts (1–6 answers), new, empty and completed drafts, and five journey shapes; run twice; two start-ups at once |
| `apps/server/test/qa.review4.server.test.ts` | **11** (3 `it.fails`: m2, n2, n3) | The favour under one key ×6; the late sign-up (m2); the favour with orders off (n2); Ashford's hall at Level 1; the card kept from four reads; lodgings from three keys; `council.hall` on an untouched city after its map, and alone (n3); the desk on another council; *In the cells now* after bail; beat 1 with three rows at once |
| `packages/ui/test/qa.review4.test.tsx` | **2** (1 `it.fails`: m1) | The level-up line after the point is placed |

Every expected fail was run once with its marker removed and failed for its bug's reason:

- m1: *Received: Level 2 · point placed*;
- m2: the next-morning sheet still carries the favour; a second tap is served (+20 order Party XP);
- n2: two logs;
- n3: `ELECTION_NOT_READY`;
- n5: *Monday* on a Monday.

When a bug is fixed its test turns red: that is the reminder to drop the marker.

**Not added:** a `qa.review4.spec.ts` e2e spec. It was part of the browser sub-agent's work, which had not come back at handback (§8).

---

## 6. Command output (real runs)

| Command | Result |
|---|---|
| Baseline, clean worktree at `70bcab2`: `pnpm art:check && pnpm turbo lint typecheck test build --force` | exit 0 · `art:check ok: 78 assets, 19.05 MB` · **20 / 20 tasks** · rules 45 files / **561** · content 26 / **317** · ui 22 / **385** · db 17 / **80 + 1 expected fail** · server 59 / **583 + 2 expected fail** |
| Baseline `E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e` (run 1, alongside the sub-agent's Playwright work) | exit 1 · **84 passed, 1 failed, 44 did not run** · the failure: `travel.spec.ts:299` (1440 × 900 / 390 × 844), stuck on `/signup` past the helper's 5 s (n7) |
| `npx playwright test --project=travel --no-deps` (same ports) | **5 passed (1.1 m)** |
| Full e2e, run 2 (same command, same worktree) | **exit 0 · 129 passed (14.3 m)**, including the two older expected fails (slice-3 m4, slice-4's five names above the CTA) |
| With the QA files: `pnpm turbo lint typecheck --force` | first try: 1 type error in my own rules test (`q.opens.level` possibly undefined), fixed in the test; then **12 / 12** |
| With the QA files: `pnpm art:check && pnpm turbo lint typecheck test build --force` | **exit 0 · 20 / 20 tasks** · rules 46 / **569** · content 27 / **331 + 1 expected fail** · db 18 / **82 + 1 expected fail** · ui 23 / **386 + 1 expected fail** · server 60 / **591 + 5 expected fail** (3 of them this report's) |
| `pnpm --filter @irongate/db migration:008` | empty start `0/0, 0/0, 1/0`; run 1 `resetOldDrafts 2/2 · cardAtForOpenJourneys 1/1 · cellsNowIndex 1/0`; run 2 `0/0 · 0/0 · 1/0`, *run 2 modified nothing* |
| Along the way | My own test mistakes, fixed in the tests, not the code: `city.get` on a train is `IN_TRANSIT` (removed from the leak check); `factions[].rankTitles`, not `ranks`; float equality on the pin's end points |

**Not verified here:**

- the six screen sizes walked by hand (targets, side scroll, labels against sheets, reduced motion);
- keyboard reach of the new controls;
- a real phone;
- a screen reader;
- human feel.

---

## 7. Wording calls left for the designer

Judged as the player reads them, in the build.

1. **Holm's *counts them while you wait*** (was *in front of you*): **keep.** It reads naturally and keeps the man's care.
2. **Stahl's *Twenty flyers*** (was *leaflets*): **keep.** It matches Holm's *The parcel is flyers* and the game's word.
3. **Stahl's welcome deck, *Stahl's bundle goes out at Beacon House; start there.***: **acceptable.** It is passive (*goes out*) but clear, and fits 200.
   - On the same two screens Stahl is *Viktor Stahl · steward* on the platform and *Organiser Stahl* in the deck's first line. *Organiser* is the Collective's Rank 3 word, and *Steward* is the Vanguard's Rank 2 title.
   - **Suggest** one name for him across the platform and the paper.
4. **Grey's welcome deck, *Grey's signature wants a witness*:** **change.** The signature is the tenant's, not Grey's. The designer's *Grey's tenant wants a witness at {place}; start there.* is right.
5. **The journey phrases:**
   - *To Coalport · in 12 min* and *Follow your pin*: **keep** (plain, and they match the user's plain-pin decision).
   - *On the way · {title}*: **keep.** It reads as a status but opens the card, which the row's style makes clear.
   - The label after arrival, *To Coalport · now*: **suggest** *In Coalport*, or drop the label.
6. **The local election line, *Duskwall elects its council: names go in until Friday 03:00*:** fine. *03:00* is the day's turn in the user's own clock (UTC+3).
7. **The developer's refusal words** (deviation 10): fine and in voice. *A bed is taken where you stand: take the train there first* reads oddly (*taken* as in "occupied"). **Suggest** *Beds are let where you stand: take the train there first.*

---

## 8. Playtest checklist (for the user's next review)

The round's question: **does each of the twenty-five notes read as answered, in play?**

### Before the playtest

- [ ] Fix **m1**, or correct build-notes row 5.
- [ ] Rebuild the art and apply answers §30.3 (**m3**). Correct the build-notes line about the picture.
- [ ] Decide **m2** (does a late sign-up's second morning offer the favour?).
- [ ] Fix the capital's *four of seven* (**m4**). Settle the wording calls in §7 (Grey's deck, Stahl's name).
- [ ] Finish the browser audit at 390 × 844, 375 × 667, 360 × 640, 667 × 375, 1440 × 900 and 1920 × 1080, and add its `qa.review4.spec.ts`. It was started but had not reported at handback.
- [ ] Start a **fresh account**, one per party if possible. The dev panel moves the clock, gives Levels and Ranks, Heat and the cells.

### Walk, note by note

- [ ] **#1** The sign-up grid: eighteen distinct faces.
- [ ] **#2** For each party:
  - [ ] platform → suitcase → lining → paper → *To the city* → *Once*: eight taps;
  - [ ] whom you helped is your party, and their initials sign the orders;
  - [ ] the compartment picture matches beat 2's words;
  - [ ] close the tab mid-way and come back: you resume at the beat.
- [ ] **#3** The Paper tab at 1440 and 1920: a sheet on a dark desk; on the phone, unchanged.
- [ ] **#4** The clock follows the dev panel. Every countdown reads *in n min* / *at hh:mm* / *tomorrow hh:mm* / a weekday. Any *midnight* left (n1)?
- [ ] **#5** Level up, place the point: what the line says (m1).
- [ ] **#6** Finish the three orders: the line says what follows, and the note does follow.
- [ ] **#7** Level 10 → Nation → Irongate → Board:
  - [ ] the pin moves along the line, and the label stays clear of the side sheet on a desktop;
  - [ ] wait for the card: the pin pulses and the sheet opens;
  - [ ] close it: *On the way · …* reopens it;
  - [ ] go to the Paper, come back: the sheet is open;
  - [ ] drag away: *Follow your pin*;
  - [ ] let it arrive unanswered: the card is in the arrival modal.
- [ ] **#8** Irongate's overview: no land outside a district. Inside a district, drag to its corners.
- [ ] **#9** *Where you live* in an Irongate district: one *Live here* with its reason. Tram Junction: *Take a bed · 100 Iron* (50 only under *Eviction Notices*).
- [ ] **#10** Win a seat:
  - [ ] *What now* on the front page and once at the hall;
  - [ ] the desk's Next line, before and after you vote.
- [ ] **#11** The Town Hall pin in Coalport, Duskwall, Ashford (at Level 1) and Irongate's City Hall:
  - [ ] the rule in plain words;
  - [ ] the members as *Player* / *Local candidate*;
  - [ ] the plate's rule line opens the hall;
  - [ ] in Irongate, the note's majority (m4).
- [ ] **#12** Dev panel Heat 60:
  - [ ] *Heat 60 · Hot*, in red, under Energy;
  - [ ] its note says what Hot does and *Cool at*;
  - [ ] Political Capital opens its own note.
- [ ] **#13** In another city: *Your orders are in Coalport · n of 3 done*, one quiet line.
- [ ] **#14, #17, #18** The Issue chip's note; Legal Aid for an Alliance member in the cells; *Known here · better odds* after ten wins.
- [ ] **#16** Nothing invites you to close the game: the cells, the infirmary, the train.
- [ ] **#19** From a second account, the station's *In the cells now* lists you, then not after you pay bail.
- [ ] **#20** Heat 60, *Next caught: on*, a risky mission:
  - [ ] the sentence (20 + Heat ÷ 2);
  - [ ] *Orders off today*;
  - [ ] the release modal's *taken in · 1 mark*;
  - [ ] the next paper.
- [ ] **#21** Coalport, Duskwall, Ashford:
  - [ ] one map, greyed pins with a lock, *Opens at Level 6*;
  - [ ] Places grouped by quarter, the hall at the end of the first group.
- [ ] **#22** After Level 6, no order sends you to a mission you can't take.
- [ ] **#23** Travel: *The Coalport Clarion · Duskwall edition*, the town's Issues first; in Irongate, *· Irongate edition*; at home, no edition line.
- [ ] **#24** Health is always in the top bar, full or not, at every size.
- [ ] **#25** Party XP opens the ladder (seven rows, your row marked). The Me tab line.

### From the report (`pnpm report:playtest`, the review-4 section)

- [ ] Drafts at each beat and whom players helped (an even split, or one secretary favoured?).
- [ ] Join → favour median and p75: under three minutes?
- [ ] Look for **two favour logs per character** (m2 in the wild).
- [ ] Cards answered on the way against on arrival (does the moment on the map work?).
- [ ] Gallery sits; marked arrests, marks and orders off.

### Questions afterwards

1. "Who did you help on the platform, and why?"
2. "Did you watch the pin, or come back to it?"
3. "Did you find the Town Hall without being told? What did the rule do?"
4. "Did the cells feel like a cost now? Did you lose anything you owned?" (Nothing owned should be lost.)
5. "Which note still feels unanswered?"

---

## 9. Fix round (7 Oct 2026, developer)

Every bug in §3, the browser audit's own finds (R4-QA-01 to R4-QA-10 in `apps/client/e2e/qa.review4.spec.ts`), answers §30 and the coordinator's nits. Each `it.fails` / `test.fail` marker was dropped as its bug was fixed; the tests are plain tests now.

### 9.1 Status per bug

| Bug | Status | What changed |
|---|---|---|
| **m1** the level-up line | **Fixed** | `copy.levelUpLine(to, points)` / `copy.levelUpPlaced(to, placed, points)`; the result modal remembers the stats as the result found them and prints the stat that moved: *Level 2 · Intelligence 12 → 13*; two waiting: *Level 3 · place your points (2)*. A point placed elsewhere before the modal opened still reads *Level 2 · point placed*. QA's `it.fails` flipped; R4-QA-01 flipped |
| **m2** the favour paid twice | **Fixed** | `carriedWelcome` (rules): the welcome set is dealt once per character. A late sign-up's second welcome day carries the evening's set on as it stood (the favour done stays done, so it is not offered again), or deals the rotation once all three were done. The orders note counts only today's completions. QA's `it.fails` flipped; new tests in `packages/rules/test/review4.fixround.test.ts` and `apps/server/test/review4.fixround.test.ts`; `review1.test.ts`'s late-join case updated (Take a job stays done from the evening) |
| **m3** the compartment | **Fixed** | Art rebuilt from the new empty-compartment source (no crop: it is 2688 × 1520 already; the desktop panel centres on the rack, focus 0.3 / 0.4); §30.3's narrative and alt text; the story's scene pictures carry their alt text (R4-QA-09; the map backdrop stays decorative); build notes corrected. R4-QA-08, R4-QA-09 flipped |
| **m4** four of seven in the capital | **Fixed** | `copy.help.ordinance(passVotes, seats)`: the hall sheet passes its own council's figures, the plate six of ten in Irongate; `copy.help.rule` says *ten councillors* there too. Test in `packages/ui/test/review4.fixround.test.tsx` |
| n1 *midnight* | **Fixed** | *What you have done since the day turned*; *Your wage lands when the day turns*; the three *Take a job* lines end *The first wage lands {at}.*, rendered in the player's clock (*tomorrow 03:00*). `{at}` is allowed in order lines only. R4-QA-02 flipped |
| n2 favour with orders off | **Fixed** | `welcomeOffered` is false while the day's orders are off. `it.fails` flipped |
| n3 `council.hall` cold | **Fixed** | The read settles the city's day first (`ensureCityDay`). `it.fails` flipped |
| n4 Me-tab note | **Fixed (note)** | Build notes row 25 quotes *Red Collective · Activist · 1,212 / 2,000 to Organiser* |
| n5 a week ahead | **Fixed** | Seven days or more prints the date: *Your bed until 19 October*, *19 October 03:00* for a boundary. `it.fails` flipped |
| n6 difficulty 10 | **Fixed (docs)** | Answers §2.6, §11.1, GDD §15.3 and economy §24.1–24.2 say 8 at home (10 in Irongate); economy figures reworked: Vanguard 62 → 74 %, *light* 62 % and 50–54 %. 8 is right: it is the §8.4 home tier-1 difficulty every home ticket uses, and with the First day's +10 % the best-stat favour is 76 % (Collective) to 84 % (Vanguard), inside the 60–85 % band |
| n7 sign-up wait | **Fixed** | `signUpOnly` waits up to 30 s for `/arrive` |
| n8 README | **Fixed** | The plate's *Council rule: {name} · {plain words} · 5 days left*; *Take a bed · 100 Iron* (50 under *Eviction Notices*) |
| n9 dark until 09:00 at UTC+3 | **Checked, unchanged** | The build follows GDD §2.2: night is 20:00–06:00 UTC, *the same for everyone*, because later rules (Curfew, the night train, recognition at night) read the same window. A local night would be a design change; for the designer and the user |
| R4-QA-03 sideways HUD | **Fixed** | The first-line clock no longer sits above the gauges' button (its reach was over *To Organiser*); the sideways gauge columns are as wide as their words, so *1,212 / 2,000 Party XP* is not clipped. Flipped |
| R4-QA-05 the pulse | **Fixed** | The pin pulses first; the card's sheet opens 800 ms later (at once under reduced motion). Flipped |
| R4-QA-10 Grey's deck | **Fixed** | *Grey's tenant wants a witness at {place}; start there.*; beat 2's echo *You witnessed a tenant's signature for Grey.* Flipped |
| Arrival label | **Fixed** | After arrival the pin reads *In Coalport* (its name *Your pin: in Coalport*) |
| §30.1 the marker | **Done** | Chapter 1's choices, hint, check narrative and the partial and failure bodies as §30.1; `slice-2-onboarding.md` §3.4 updated |
| §30.2 wordings | **Done** | Grey's deck replaced; *Your pin* / *Follow your pin* kept (the user's plain-pin decision) |
| Nit: *1 Minutes* | **Fixed** | `{minutes}` carries its unit: *Spent 1 Minute in the Cells* |
| Nit: *HOME CITY ·* | **Fixed** | The dot is drawn before the share and clipped when the line wraps |
| Nit: README cells | **Fixed** | Only a Partial or a Failure is caught; *Next caught* is used up by a Success; or *Cells now* |
| Nit: Election card rule | **Done** | The card's rule line carries the plain words, as the plate |
| Build notes | **Corrected** | Row 5, 7 (*In Irongate*), 9 (*Take a bed · 100 Iron*, 50 under *Eviction Notices*), 11 (the majority per city), 12, 25; the wordings; *Things to look at* rewritten (the marker and the compartment are done; the favour once only; the small QA wordings) |

### 9.2 The browser audit, finished

QA's spec (`qa.review4.spec.ts`, project `qa-review4`) gains a last block: **one walk per size** at 390 × 844, 375 × 667, 360 × 640, 667 × 375, 1440 × 900 and 1920 × 1080, under reduced motion, over the platform, the compartment, the lining, the welcome edition, Coalport, the Union Hall and Town Hall sheets, the Me tab and its rank note, the capital overview, Tram Junction with the Lodgings card, the City Hall, the nation map, the journey, the card on the way and the arrival. On every screen:

- no control under 44 px either way (a control widened by its own `::after`, like the plate's rule line, is measured with it);
- no sideways scroll;
- nothing moving (opacity fades allowed: the clouds fade in place);
- on the journey, the pin and its label clear of the plate; on a phone, the place's pin clear of its sheet. From 640 px the place sheet is a modal panel over the dimmed map by design (review 2 #2), so the pin under it is not a finding.

All six walks pass. Beyond R4-QA-03 and R4-QA-05 the audit found one thing, fixed:

- **A place's pin under its sheet at 360 × 640 with the paper's banner up.** The banner takes 44 px off the map, so the 60 dvh sheet left a 55 px band, under the 60 px a pin needs, and the zoom fell back to centring the pin in the whole map, under the sheet. `clearArea` (CityMap) now keeps the thin band's open edge and reaches 60 px into the cover: the pin sits at the sheet's edge (measured: pin 145–189, sheet from 192). Unit test in `components.test.tsx`.

Two of QA's tests needed a correction on the way, not the build: R4-QA-05 measured the pin with `elementFromPoint`, which never returns it (the pin is `pointer-events: none`, so taps reach the map); it now checks that no dialog is over the pin's centre while it pulses, then that the card opens. The cells test left the release modal before its Continue had landed, so the modal came back on the next page in a busy full run; it now waits for the modal to close. The bed line accepts a date as well as a weekday for seven nights ahead (n5).

### 9.3 Not done, for the designer

- n9 (above).
- The journey plate still reads *arrives now · 19:16* after the train is in; the label under the pin now says *In Irongate*. A wording for the plate after arrival (*arrived 19:16*?) would match.

### 9.4 Command output (fix round, real runs)

| Command | Result |
|---|---|
| `pnpm art:build` (new compartment source) | 3 files rebuilt (`scene.train-compartment-1280.avif`, `-640.avif`, `-640.webp`); `art:check ok: 78 assets, 19.13 MB` |
| `pnpm art:check && pnpm turbo lint typecheck test build --force` | **exit 0 · 20 / 20 tasks** · rules 47 / **573** · content 27 / **332** (no expected fail left) · ui 24 / **391** · db 18 / **82 + 1 expected fail** (older, not review 4) · server 61 / **597 + 2 expected fail** (older, not review 4) |
| The same after the last fix (CityMap's thin band), cached where unchanged | **exit 0 · 20 / 20** · ui **392** (the new zoom test), the rest as above |
| `E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e`, run 1 | 157 passed, 1 failed: R4-QA-05's own check (`elementFromPoint` on a `pointer-events: none` pin), corrected in the test |
| Run 2 | 157 passed, 1 failed: the cells test leaving the release modal before Continue landed, corrected in the test; then `--project=qa-review4 --no-deps` found the 360 × 640 pin under its sheet with the banner up, fixed in CityMap |
| Run 3 | **exit 0 · 158 passed (16.5 m)**, `qa-review4` 29 of them (QA's 23 and the six audit walks) |
