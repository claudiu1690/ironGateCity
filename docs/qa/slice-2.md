# QA report: slice 2, "Arrival"

| | |
|---|---|
| **Build under test** | branch `slice-0`, HEAD `f28610f` ("Apply the content-policy review to content"), including `c732d64` (the lost-tap fix), plus the QA test files in §5. During the run the branch moved to `fc0e37a` ("Slice 3 design: the first vote", docs only); the final suite ran on that tree. |
| **Date** | 29 Sep 2026 (machine clock: Tuesday, UTC+3) |
| **Tester** | QA agent |
| **Sources of truth** | `docs/GDD.md` (§3.3, §7.1–7.5, §8.2, §8.5, §13.7, §17.1, §21.4) · `docs/tech/slice-2.md` with its Deviations · ADRs 0011–0016 · `docs/design/slice-2-onboarding.md` (with §13) · `docs/design/slice-2-cities.md` · `docs/design/content-policy-review.md` · `docs/economy.md` §13 · `CLAUDE.md` · `docs/mockups/Story.dc.html` |
| **Environments** | Vitest with the in-memory replica set (rules, content, db, ui, server) · the real app via `pnpm dev:mem` (API :3001, client :5173, mongod :27018), driven by Playwright scripts for **each faction at 360×640, 375×812 and 1440×900** (nine full first-ten-minute runs), plus spot checks at 768×1024, 1024×768, 1280×800 and 1920×1080 · the Playwright suite against the production build (`pnpm e2e`) |

---

## 1. Verdict

**Pass with issues: fix M1 and M2 before the playtest.**

The server side is solid. Every number I checked matches the GDD: the answer table, the reference recruits, the three coat options, the wish, the kit, worn CHA, chapter odds, bands and rewards, Rested on chapters, and the hook date. The join is atomic: I injected failures in the middle of the transaction and nothing was left behind. It is also one-per-user under nine concurrent joins naming three factions. There is no auto-created character, and every new procedure is authorised. The migration keeps slice-0/1 characters playable, and running it again changes nothing. The content matches the designs and the content-policy review. The first ten minutes read clearly in the real app for all three factions without a tutorial screen: welcome edition → open sheet → canvass → orders → job → HQ → Letter → chapter → Me. Automated, a player can take the first action about 2.3 s after sign-up, and no console errors appeared in any run.

Two major issues are in what a new player meets first:

- **M1:** a double tap on an origin answer silently answers the next question too. Answers are final, so the player loses a question they never read.
- **M2:** on screens 640 px and wider, Ashford's first pin (Gazette House: welcome order A and the day-1 job) is hidden under the city plate. Pin 2 is also hidden at some sizes.

**Bug count:** blocker 0 · **major 2** · **minor 5** · **nit 13**.

---

## 2. Test plan followed

Legend: ✅ verified and correct · ⚠️ verified, bug filed · ➖ not verifiable here.

### 2.1 The origin (GDD §7.2, §8.5; ADR 0011)

| # | Check | How | Result |
|---|---|---|---|
| O1 | Every answer's text and effect vs the GDD §7.2 table (parsed from `GDD.md`) | Content test: prompts and answer texts row by row; the effect column parsed; the **marginal effect** of every summer/trouble/talent answer through the real `resolveOrigin`, from the reference build, in all three factions | ✅ |
| O2 | The three reference recruits (§8.5): Collective 10/12/5 CHA 2, 150 Iron, +50 FXP; Vanguard 11/11/5/2; Alliance 8/14/5/2 | Content test and server (real join) | ✅ |
| O3 | The coat: A, the father's coat worn (CHA 5); B, +150 Iron in the faction outfit (CHA 2); C, the promised coat (a keepsake) and +1 CHA base (worn 6); the outfit is kept when a coat is worn | Content test in 3 factions × 3 coats; server `it.each` over the 9 combinations through the real join (inventory, equipment, `wearing`, `keepsakes`, `partyCard`, Iron, desk *Wearing*) | ✅ |
| O4 | The wish pays +50 FXP only on a matching faction (3 wishes × 3 factions); the tag is on the matching card only | Content test; server street view; UI (tag on Vanguard / Collective as answered) | ✅ |
| O5 | The flattest build (fished · talked · read people, Vanguard): STR 8 / INT 8 / AGI 8, CHA base 3, 50 % at home | Real app, 360×640 | ✅ (CHA 8 with the coat) |
| O6 | Set-once: replaying an earlier answer (same or different) changes nothing; answering ahead → `OUT_OF_ORDER {next}` | Server test | ✅ |
| O7 | Resumable at **every** step: after each of the 6 answers a new session sees the next question, the echo on the second question of each step only, and progress *n of 3*; after 6, the street | Server test (non-reference path); real app with a reload after every answer (Collective 375×812) | ✅ |
| O8 | Double submit: 4 × answer A + 4 × answer B at once for each of the 6 questions, plus a racing tap on the next question → one stored, every copy fulfilled, never out of order | Server test | ✅ |
| O9 | **Double tap in the UI** | Real app: tap, then tap again 80 / 150 / 250 / 400 ms later, and at 120 ms added latency | ⚠️ **M1**: the second tap answers the next question |
| O10 | No numbers on origin screens; no effects in the view | Server (view JSON carries no stats/effects); UI (only *Step n of 3* and *'19* in a hint) | ✅ |
| O11 | Second join with another faction → `CONFLICT ALREADY_ARRIVED {factionId}`; answers after the join → `ALREADY_ARRIVED`; `arrival.start` after the join → `arrived` with no write | Server test | ✅ |

### 2.2 The join transaction (ADR 0011, 0012, 0016)

| # | Check | Result |
|---|---|---|
| J1 | 9 concurrent joins (3 × each faction): exactly 1 character and 1 paper; the arrival completed with the winner's faction and id; the winner's faction gets the same character, the other two get `ALREADY_ARRIVED` | ✅ |
| J2 | **Atomicity:** `PaperEntry.create` fails inside the join → no character, no paper, arrival still open; a retry succeeds | ✅ |
| J3 | **Atomicity:** closing the arrival fails → character and paper rolled back | ✅ |
| J4 | Joined already settled today: `version 0`, the welcome set frozen (`dir.v.guard-change` 2 · `dir.v.report` 1 · `dir.v.work-shift` as `noJob`), first edition, landing = pin 1 | ✅ |
| J5 | No auto-create: `character.me`, `setAvatar`, `placeStatPoint`, `city.get`, `paper.today`, `paper.markRead`, `action.perform`, `job.take`, `ambition.get/choose/attempt` → `ARRIVAL_PENDING`, and no character document appears | ✅ |
| J6 | Migration (ADR 0016) through the API: a slice-1 **and** a slice-0 raw document → CHA 2 worn (base 0 + mill coat), no face, *Finish His Work* ready, Letter dot, 66 % canvass and 46 % CHA+INT speech unchanged; the renamed job's shift works; chapter 1 plays; a face can be set; `ensureIndexes()` again → both documents byte-identical; a slice-2 joined character untouched | ✅ |

### 2.3 Items and worn CHA (GDD §8.2, §21.4, ADR 0014)

| # | Check | Result |
|---|---|---|
| I1 | §21.4 catalogue from the GDD table (ids, names, slots, CHA, keepsake flag) | ✅ |
| I2 | Kit per faction (work jacket / mill coat / worn overcoat, CHA 2, Tier I) + party card | ✅ |
| I3 | Worn CHA in **every** CHA check: Alliance recruit with the promised coat (CHA 7): all six Ashford CHA+INT previews = `computeCheck` with CHA 7; a real *Canvass the public queue* attempt at 64 %; the Settle His Debts CHA+STR approach at 42 % | ✅ |
| I4 | Party card line (*Iron Vanguard · Initiate · member since 29 September*), keepsakes on Me (the promised coat and the chapter keepsake; not the party card) | ✅ |
| I5 | Worn CHA bounds: CHA base 4 + promised coat = 9 (the top of §8.5) | ✅ (rules) |

### 2.4 Ambition chapter 1 (GDD §17.1, ADR 0013)

| # | Check | Result |
|---|---|---|
| A1 | Chapter 1 numbers for all three Ambitions from the GDD text (10 Energy, difficulty 8, 150/40/100 · 75/20/50 · 25/0/0, keepsake), chapter-2 teasers (Rank 2 / Level 6 / Level 6), *of 12* | ✅ |
| A2 | Tier-3 bands at the clamp extremes (5 %: 1–5 S, 6–25 P, 26+ F; 95 %: 96–100 P) | ✅ |
| A3 | Rested on chapters: proportional, halves up, never on FXP (0 / 3 / 5 / 10 of 10 Energy covered, every outcome) | ✅ |
| A4 | Step resumes: a new session finds the check, with the choice as its echo; Letters row `midway` (*waiting for you*); the tab dot off while midway; a second choice changes nothing | ✅ |
| A5 | Idempotent: 5 attempts with 5 keys at once → one result, one `chapter` log, −10 Energy, one keepsake; the same key → the stored result; the key bound to its approach and to its kind (`KEY_REUSED` across canvass ↔ chapter) | ✅ |
| A6 | Today tally counts Energy, XP, FXP and Iron; no attempt or win; Standing and order progress unchanged; no opinion; `again: null` | ✅ |
| A7 | Hook date computed from the day played: played Sat 3 Oct 23:55 UTC → *from Saturday 10 October, at Rank 2*; Clear His Name → *at Level 6* | ✅ |
| A8 | After the chapter: no Letter, status `none`, chapter 2 not choosable or attemptable | ✅ |
| A9 | Exactly 10 Energy is enough (bar to 0); the stamp reads *Failure* and no text says "failed" (content and every live modal I saw) | ✅ |
| A10 | Client seed / outcome / rewards fields are ignored; the stored seed replays stamp and rewards | ✅ |
| A11 | In the app: Letters row → choice → approaches with odds (46 / 66 % Collective; 50 / 50 % Vanguard flat build; 42 / 82 % Alliance) → CTA → one modal with the keepsake tile, *Keepsake: …* and the hook line → Continue → Paper; Me shows the keepsake and *Chapter 1 done* | ✅ (n2: on desktop the level-up point is below the sticky Continue) |

### 2.5 Three home cities

| # | Check | Result |
|---|---|---|
| C1 | Duskwall and Ashford word for word vs `slice-2-cities.md` (locations, kinds, x/y, blurbs, 43 actions, reward columns, every text, jobs, secretaries, 24 order templates, headlines, ambient pools, mastheads) | ✅ (the developer's `slice2.content.test.ts`, re-run and read; spot-checked every row of the content-policy review §4 against the content: all present, no old string left) |
| C2 | Mastheads, straplines and prices vs GDD §3.3; secretaries' names and signatures vs §13.7 | ✅ (QA content test) |
| C3 | Map pins on their buildings | ✅ by eye at 375×812 and 1440×900 for Duskwall and Ashford (gatehouse, tents, foot of the searchlight tower, colonnade, goods shed, terraces; lettered press front, pediment, dome, courthouse, awnings, tenement yard) · ⚠️ **M2** at ≥ 640 px (hidden under the plate) |
| C4 | `city.get` refuses the other two cities (`WRONG_CITY`), unknown → `NOT_FOUND`; `action.perform` and `job.take` in another city → `WRONG_CITY`, nothing written | ✅ all three factions |
| C5 | Welcome edition per city: masthead, dateline, *Welcome to {city}* with the secretary and pin 1, the arrival notice with the name, the morale line, three orders at 0 signed by the secretary, Letters row, *Wearing* | ✅ in the app, all three |

### 2.6 Content policy (CLAUDE.md rules 2 and 6)

| # | Check | Result |
|---|---|---|
| P1 | Every display string and alt text in content + copy (ids removed) against the review §7 checklist: militia ranks and words, torch/torchlight, "hold the line", "above all", purity, blood, storm, salute, commissar, politburo, comrade, war/front/uprising/enemy… | ✅ (allowed by the review: *the General Strike*, *the front row*, *columns out front*) |
| P2 | The Vanguard card, wish and both reviewed rank ladders | ✅ |
| P3 | String literals and JSX text in `apps/client/src`, `packages/ui/src`, `apps/server/src` | ⚠️ one hit: the server's blank-name fallback *Comrade* (m3) |
| P4 | Faction cards: Vanguard gate-and-lantern and Alliance hall-and-ballot crests pass | ✅ · **known, waiting on the user:** the Collective crest (hammer through a gear wheel, review §5). Its alt text says so to screen readers (`packages/content/src/data/art.ts:231`); an `it.fails` in the content QA test tracks it |
| P5 | Duskwall art: the map shows the fortress and olive lorries; the review judged the art needs no change. Noted, not filed | ➖ |

### 2.7 The first ten minutes in the real app (GDD §7.5)

Nine automated full runs, one per faction and size, each covering: sign-up (with a face-less submit first) → six answers (one by keyboard, one double-clicked) → the street → the welcome edition → *To the city* → the first canvass → *Again ×1* → *Take the job* → close the sheet and tap the HQ pin within 16 ms → the committee → the Letters row → the chapter → Me → the face sheet. Each run also took screenshots and a DOM audit (unnamed controls, targets under 44 px, contrast, horizontal overflow) of every screen.

| # | Check | 360×640 | 375×812 | 1440×900 |
|---|---|---|---|---|
| F1 | Readable without a tutorial: every next step is on screen or one tap away | ✅ | ✅ | ✅ (n1: *To the city* below the fold) |
| F2 | Story screens: prompt, all three choices and the caption in the first viewport; CTA in view | ✅ | ✅ | ✅ |
| F3 | Street: wish tag, confirm names faction and city, confirm in view | ✅ (n3: facts under the sticky footer) | ✅ | ✅ |
| F4 | First landing: the pin-1 sheet open, pin 1 above the sheet, odds and *Party order 0 / 2* on the ticket | ✅ | ✅ | ✅ |
| F5 | All six pins tappable with no sheet open | ✅ | ✅ | ⚠️ **M2** (Ashford) |
| F6 | Lost-tap regression: closing the sheet and tapping another pin 16 ms later opens it | ✅ all 9 runs + e2e | | |
| F7 | 44 px targets | ✅ (the avatar radios are 1 px behind ≥ 96 px tiles; *Sign in* is inline text) | ✅ | ✅ |
| F8 | Keyboard: story answers, the street and join reachable with Tab and Enter/Space; full keyboard-only arrival at 1440×900 in e2e | ✅ | ✅ | ✅ (n4: radio roles without arrow keys) |
| F9 | Labels: no unnamed interactive element on any screen | ✅ | ✅ | ✅ |
| F10 | Contrast ≥ 4.5:1 | ⚠️ **m1** (Vanguard 2.31:1, Alliance 4.42:1 reward tiles) | same | same |
| F11 | No horizontal scroll; no console errors | ✅ | ✅ | ✅ |
| F12 | Art from sign-up to the first modal ≤ 1 MB | Vanguard 750 KB · Collective 718 · Alliance **929** | 750 · 722 · 929 | 568 · 537 · 630 |
| F13 | Pillar 7: one tap → one modal; nothing needs a set time; 2–3 line narratives | ✅ | ✅ | ✅ |

### 2.8 Security

| # | Check | Result |
|---|---|---|
| S1 | Signed-out callers are refused on `arrival.get/start/answer/join`, `ambition.get/choose/attempt` and `character.setAvatar`; only `arrival.faces` is public | ✅ |
| S2 | The client can't set stats, Iron, FXP, home city, items or a seed. Extra fields are stripped at the join and the attempt | ✅ |
| S3 | The client can't choose a faction after joining (`ALREADY_ARRIVED`), and no procedure takes an item id | ✅ |
| S4 | Validation: unknown faction, face (including a portrait id), question or answer; an empty face; a chapter number of 0, −1, 1.5 or `"1"`; a non-UUID key | ✅ |
| S5 | Validation: a name of spaces | ⚠️ **m3** |

### 2.9 Regressions (slices 0–1)

The whole slice-0/1 suite still passes, including the previous QA's `qa.gdd`, `qa.content`, `qa.server`, `qa.http` and `qa.spec` tests (§6). Checked by hand:

- The ×3 modal's sticky buttons.
- The out-of-Energy flow, jobs and switches, and the paper being due after 3 h.
- The CSRF and CORS checks in the production build.
- Pin M2 at 375×812 and 1440×900 for Coalport.

---

## 3. Bugs, ordered by severity

### Major

#### M1. A double tap on an origin answer also answers the next question

- **Where:** `packages/ui/src/components/Story.tsx:166` and `apps/client/src/routes/arrive.tsx:24`.
  - The choices are keyed `a`/`b`/`c` on every question, so React keeps the same three buttons in the same places when the next question swaps in.
  - The `busy` guard is released `onSettled`, as soon as the answer's response arrives.
  - A second tap that lands after the response is therefore a fresh, valid tap on the next question.
- **Steps:** sign up at 375×812. Tap *Fished the river with you.*, then tap the same spot again 80–400 ms later.
- **Expected:** GDD §7.2: "An answer is final once tapped … a second tap on the same question changes nothing." The second tap of a double tap does nothing, and the player sees *And when the street kids got into trouble…* with the echo *You went fishing with him.*
- **Actual:** both taps are stored. Question 2 is answered *Led them in* (+2 STR), and the player lands on *You always had a talent* without ever having read question 2.
  - Reproduced at gaps of 80, 150, 250 and 400 ms locally, and at 250 ms with 120 ms of added network latency.
  - The server behaves correctly: it cannot tell a double tap from two deliberate taps.
- **Impact:** a permanent change to the character from an accidental tap, on the first screen of the game. Double taps are common on phones. There is no way back (set-once by design).
- **Fix ideas (developer):**
  - Key the choices by question (`key={questionId + c.id}`) and ignore taps for a short settle time (about 400 ms) after a new question appears, or until its fade-in ends.
  - Or keep `busy` until the new question has rendered.
  - The chapter's step 1 → 2 swap has the same shape, but there a second tap only selects an approach, which is harmless.
- **Test:** `test.fail` "M1: a double tap on an origin answer does not also answer the next question" in `apps/client/e2e/qa.slice2.spec.ts`.

#### M2. From 640 px wide, the city plate hides Ashford's first pin (and sometimes the second)

- **Where:** `packages/ui/src/components/CityMap.tsx:42` and `:111-121`.
  - `measureInsets` ignores overlays narrower than 60 % of the map (`OVERLAY_MIN_WIDTH_SHARE`).
  - From `sm:` the plate is 420 px wide (`apps/client/src/routes/city.tsx:136-138`), and it carries the orders list and Today. So the first view does not keep pins clear of it.
- **Steps:** arrive as the Alliance at 1440×900. Read the paper, then open the map (or close the first-landing sheet).
- **Expected:** every pin whole and tappable in the first view (slice-1 M2 fix; tech design §12.3). Pin 1 matters most: it holds welcome order A, the first ticket and the day-1 Copy clerk job.
- **Actual:** `elementFromPoint` at the pin's centre hits the orders list.

  | Size | Hidden pins (Ashford) |
  |---|---|
  | 1920×1080 | pin 1 (Gazette House) |
  | 1440×900 | pin 1 |
  | 1280×800 | pins 1 and 2 (only pin 2's label shows) |
  | 1024×768 | pins 1 and 2 |
  | 768×1024 | pins 1 and 2 |

  - Duskwall and Coalport are clear at every size, and every city is clear on phones.
  - Seen by hand, not asserted: with the *The Clarion is in* banner showing, Coalport's pin 6 (The Anchor) sits under the ticker at 1280×800. That is slice 1's desktop M2 again.
- **Mitigation:** the orders list's pin links (*Be at the loading bay · 1*) still open pin 1's sheet. The first landing opens pin 1's sheet with the plate folded, so the first tap works.
- **Test:** `test.fail` ×2 "M2: ashford at 1440×900 / 768×1024 …". A passing test covers Duskwall at 1440 and 360.

### Minor

#### m1. The Faction XP and opinion tiles fail contrast for the Vanguard and the Alliance

- **Where:** `packages/ui/src/components/ResultModal.tsx:153, 222, 249` put the faction colour on the tile value (22 px, semibold, so normal text, needing 4.5:1). Colours are in `packages/ui/src/tokens.css:36, 38`.
- **Measured:** Vanguard gold `#c39a3a` on `#f6f0e1` = **2.31:1**; Alliance blue `#4b7394` = **4.42:1**. The Collective red passes.
- **Expected:** 4.5:1 (CLAUDE.md / agent rules; WCAG 1.4.3). Suggest a darker text variant of each faction colour, as fix round 1 did for `energy-light`.
- **Test:** `test.fail` ×2 "m1: the Iron Vanguard's / Civic Alliance's Faction XP tile …".

#### m2. The arrival funnel never counts *Take a job*, so "welcome orders 3 / 3 on day 1" reads 0

- **Where:** `packages/db/scripts/playtestReport.ts:86-95` builds order completions from `actionLogs` only. `job.take` writes a `requestLogs` row, so order C is never counted. `jobSinceDay` (`:83`) is the *current* job's `since`, so a day-2 switch hides a day-1 take.
- **Actual:** on the dev database, three Vanguard players who completed all three orders on day 1 show `welcome orders 3 / 3 on day 1: 0`, while `joinToAllOrders` has values.
- **Expected:** the funnel answers the slice question with numbers (tech design §14.1). This row is one of the headline numbers. Also, `firstActionMatch` and `secondTapAgain` print as fractions (1 = 100 %) next to player counts (n12).
- **Fix before the playtest.** No automated test: `funnel.ts` is pure and its inputs are what's wrong. The developer should add a fixture with a job take.

#### m3. A name of spaces becomes "Comrade" in every faction's paper

- **Where:**
  - `apps/client/src/routes/signup.tsx:34` trims the name after the form's `required` check has passed on whitespace.
  - Better Auth accepts `"   "` (checked over HTTP).
  - `apps/server/src/services/arrivalService.ts:174` falls back to the hard-coded `'Comrade'`.
- **Actual:** the Vanguard welcome edition prints *Comrade Arrives at Duskwall Station*. The word is Collective vocabulary for any faction, and it lives outside content. The content-policy review §7 lists "comrade" (as a rank) among Collective words to avoid.
- **Expected:** sign-up refuses a blank name with a message. Any fallback is neutral and comes from content.
- **Tests:** `it.fails` "BUG: a blank sign-up name is not turned into "Comrade"…" (server) and `test.fail` "m3: sign-up refuses a name made of spaces" (e2e). The server's source sweep allows exactly this one string.

#### m4. A tab keeps the previous tab's scroll position; Me opens part-way down

- **Where:** `apps/client/src/components/AppShell.tsx:70`. One `<main overflow-y-auto>` is shared by every route and never reset on navigation.
- **Steps:** on a phone, scroll the welcome edition to the desk and tap **Me**.
- **Actual:** Me opens at `scrollTop` 460. The face, *Wearing*, the party card and the keepsakes (slice 2's new rows) are above the fold.
- **Expected:** a new tab opens at its top.
- **Test:** `test.fail` "m4: the Me tab opens at its top after scrolling the paper".

#### m5. GDD §7.5 promises that PC "appears in the HUD for the first time"; phones never show PC in the HUD

- **Where:** `packages/ui/src/components/HudBar.tsx:104` (`hidden … sm:flex`). The developer recorded it ("PC stays hidden on phones as in slice 1").
- **GDD vs code:** §7.5 and onboarding §8.2 (minute 7) use the HUD to introduce PC. On a phone the only signs are the modal line *All three orders done · +5 Political Capital* and the Me tab.
- **Which is right:** the GDD's intent is right, since PC becomes the currency of the slice-3 vote. The game designer should decide between a compact PC chip on phones and rewording §7.5. I did not change either.

### Nits

| # | Where | What |
|---|---|---|
| n1 | `apps/client/src/routes/paper.tsx:103` (`lg:static`) | At 1440×900 the welcome edition's *To the city* is below the fold. At first view the Letters row sits under the floating dock. Phones are fine (sticky) |
| n2 | `ResultModal` chapter kind | On desktop the level-up point panel (*STR / INT / Later*) is below the sticky Continue and needs a scroll. The HUD badge covers it |
| n3 | Street at 360×640 | The selected card expands and its facts (*+3 Strength · Starts in Duskwall · Their event: the Grand Rally*) fall under the sticky footer; a scroll shows them |
| n4 | `packages/ui/src/components/Story.tsx:194, 283` | The approach tickets and faction cards are `role="radio"` buttons with no arrow-key navigation (ARIA radio-group pattern). Each is its own tab stop, so they are reachable, just not the pattern the role promises |
| n5 | URLs | `/city/duskwall?loc=duskwall.garrison-gate` puts *garrison* in the address bar. The review keeps ids because they are "never shown"; the URL shows them |
| n6 | `packages/content/src/data/art.ts:231` | The Collective crest's alt text describes "a hammer raised through a gear wheel" (known, waiting on the user; tracked by `it.fails`) |
| n7 | `views.ts` `lettersWaiting` | The Paper tab's dot stays while a chapter is ready, even after the Letter was opened. Design §13 Q8 said "ready and not yet opened". Recorded as a deviation; noted for the designer |
| n8 | Art budget | Ashford's first session is **929 KB** on a DPR-2 phone (91 % of 1 MB; the 2560-wide Ashford day map is 525 KB). A watch item for any new art on the first path |
| n9 | Sheet kicker | *1 · MINISTRY* on the Fortress Gate (a customs house) reads oddly. The kind label lives in client code |
| n10 | `apps/client/src/components/AppShell.tsx:85` | The desktop ticker separates items with a red "■": the Vanguard's small-mark shape in the Collective's colour, for every faction. A neutral dot would avoid the question |
| n11 | Phone map (Duskwall, Ashford at 375×812) | An empty dark band of about 130 px between the fitted map and the orders panel. Cosmetic |
| n12 | `pnpm report:playtest` | *first action was welcome order A* and *second tap was Again* print shares as 0–1 next to player counts; label them as percentages |
| n13 | `apps/client/src/routes/ambition.tsx:100` | After chapter 1 the chapter screen shows *Chapter 2 of 12 · Stand where he stood* and a Continue, with no date or requirement (the hook appears only once, in the modal) |

---

## 4. GDD vs code: disagreements and which is right

| Topic | GDD / design says | Code does | My view |
|---|---|---|---|
| §7.5 "PC appears in the HUD for the first time" | PC is introduced in the HUD | Hidden on phones | GDD's intent (m5); designer to choose the fix |
| §7.2 "a second tap … changes nothing" | Double taps are harmless | The second tap answers the next question (M1) | GDD is right; client bug |
| Design §13 Q8 dot "not yet opened" | Dot until the Letter is opened | Dot while ready (n7) | Either is fine; the design is the spec, so the designer should confirm the deviation |
| §8.5 / §7.2 arithmetic | 6–9 trained points, best 8–16 | Matches (the flattest build 8/8/8 confirmed in the app) | Agree |

Everything else agrees, number for number.

---

## 5. Tests added (not committed)

| File | Tests | What it covers |
|---|---|---|
| `packages/rules/test/qa.slice2.rules.test.ts` | **12** | Tier-3 bands at 5 % and 95 %. Chapter checks clamp. Chapter rewards with Rested covering 0 / 3 / 5 / 10 of 10 Energy (halves up, no FXP bonus, no opinion). Chapter status at day +6 / +7 with an unmet Level requirement and after 200 days. A teaser is `none`. `resolveOrigin` doesn't depend on answer order. Worn CHA 9 at the top of the range, with distinct uids and equipment. Rank from the FXP seed. Keepsake vs ordinary grants. Two-stat CHA odds 46 / 52 / 54 % |
| `packages/content/test/qa.slice2.test.ts` | **14** (1 `it.fails`) | The GDD §7.2 table parsed from `GDD.md` (prompts, answers, effects), with the marginal effect of every answer through the resolver in 3 factions. The coat in 3 × 3. Promise and wish 3 × 3. §7.3 bonuses. §8.5 reference recruits. The §21.4 catalogue parsed from the GDD. Kits. §17.1 numbers, titles and teasers, and no "fail" in chapter texts. §3.3 mastheads. §13.7 secretaries. The content-policy checklist over all display text and alt texts. The reviewed Vanguard card, wish and both rank ladders. The known Collective crest alt text (`it.fails`) |
| `apps/server/test/qa.slice2.server.test.ts` | **33** (1 `it.fails`) | Permissions on 8 new procedures. `ARRIVAL_PENDING` on 11 procedures, with no document created. Input validation. Stripped client fields (stats, Iron, FXP, items, home city, seed, outcome). Resume after each of 6 answers with echoes and progress. Set-once replays and `OUT_OF_ORDER`. Double submits and racing next-question taps for all 6 questions. 9 concurrent joins across 3 factions. Join atomicity ×2 (injected failures). The settled join. Kit and worn CHA for 3 factions × 3 coats. Worn CHA in previews, a real attempt and a chapter approach. Chapter resume, 5-key concurrency, key binding, the Today tally, no Standing/orders, seed replay, the hook date on a Saturday and a Level requirement, the post-chapter state, exactly 10 Energy. `WRONG_CITY` ×3 factions. Migration of slice-0 and slice-1 documents through the API, idempotent. A source sweep of client/UI/server strings. m3 (`it.fails`) |
| `apps/client/e2e/qa.slice2.spec.ts` | **13** (7 `test.fail`) | M1 double tap. m1 contrast ×2. Resume at the street and mid-chapter. The lost-tap regression on the first landing. m3 blank name. m4 tab scroll. M2 ×2 (Ashford 1440×900, 768×1024). All pins tappable (Duskwall 1440 and 360). The chapter at 360×640 (choices, approaches, CTA and Continue in view, no "failed", no side scroll). A keyboard-only arrival at 1440×900 |

Every expected failure was checked to fail for the bug's reason: I ran each one once as a plain test and read the assertion message. When a bug is fixed its test turns red, which is the reminder to remove the annotation.

Scratch scripts outside the repo (Playwright explorations, the double-tap, pin-cover and scroll probes, and the DOM audit) are in the session's scratchpad and are not part of the change.

---

## 6. Command output (real runs)

| Command | Result |
|---|---|
| Baseline before QA changes: `pnpm art:check && pnpm turbo lint typecheck test build` | exit 0 · `art:check ok: 30 assets, 11.02 MB` · 20/20 tasks (all cached) |
| `pnpm art:check` (final) | `art:check ok: 30 assets, 11.02 MB` (≤ 12 MB) |
| `pnpm turbo lint typecheck test build --force` (final) | **exit 0 · 20 successful, 20 total · 0 cached**. rules 17 files / **213 passed** · content 4 / **81 passed + 1 expected fail** · db 3 / **19 passed** · ui 3 / **32 passed** · server 11 / **127 passed + 1 expected fail** |
| `pnpm e2e` (final) | **exit 0 · 42 passed (1.8 m)** on phone, small-phone and desktop projects. That includes the 13 QA slice-2 tests, 7 of them expected failures that failed as expected |
| Along the way | Two of my first assertions were wrong and were fixed in the tests: a clamp that difficulty 8 cannot reach, and the Vanguard desk showing the work jacket. My first source sweep missed one-word strings: a sanity check caught that it didn't find *Comrade*, and I widened it. One M2 case (Coalport at 1280×800) passed in the production build because the paper banner is not shown there; I removed it from the assertions and kept it in the bug text |
| Clean-up | `dev:mem` and its whole process tree stopped. Ports 3001, 5173, 27018, 3101 and 4173 have no listener. No QA-started `node` or `mongod` is left; the six `node.exe` processes that predate the session are untouched. Nothing committed |

**Not verified here:** a real phone or iOS Safari, a screen reader, a slow real network (latency was simulated for M1), CI, deployment, and human comprehension (that is the playtest).

---

## 7. Playtest checklist for slice 2

**Question:** *Does a brand-new player understand what to do in the first 10 minutes, without a tutorial screen?*

### Before the playtest
- [ ] Fix **M1** (the double tap in the origin) and **M2** (Ashford's pins on desktop and tablet).
- [ ] Fix **m2** (the funnel's 3 / 3 row), or the headline number will read 0.
- [ ] Fix **m3** (blank names) and decide **m5** (PC on phones).
- [ ] Resolve the Collective crest (waiting on the user).
- [ ] Deployed build; `pnpm report:playtest` runs against the playtest database, and its arrival funnel has been checked on a known account.
- [ ] 6–9 testers who have never seen the game, split evenly so each faction gets 2–3 players (they choose freely; note what they chose and why), ≥ 70 % on phones, at least one on a small phone (≈ 360 px) and one on a desktop.
- [ ] Tell testers only: "Sign up and play for ten minutes." No explanation of the game, the orders or the Letter.
- [ ] Note each tester's time zone (the day turns at 00:00 UTC; a late-evening join gets the welcome set for only a short day, ADR 0012).

### Watch live (screen share; don't coach; time with a stopwatch from *Sign up*)
- [ ] **Sign-up:** do they understand the face is required? Any hesitation over which face?
- [ ] **The origin:** reading speed per step; any double taps (M1); do they notice the echo line? Do they ask what the answers do? (They should not see numbers.)
- [ ] **The street:** do they read the cards? Do they notice *His wish · +50 Faction XP*? Do they pick the wished party, and why? Does *Permanent* worry them?
- [ ] **The welcome edition:** do they read the headlines and orders, or tap *To the city* at once? Do they notice the Letter?
- [ ] **First action:** the time from *To the city* to the first ×1 (target under 60 s; tech §14.1), and the time from sign-up to the first result modal (design: about 3 min, 11 taps).
- [ ] **Welcome order A:** do they tap *Again* to finish it? Do they see *Party order 1 / 2* and the +20 FXP line?
- [ ] **The job:** do they find *Take the job* on the same sheet without help? Do they work the shift?
- [ ] **The HQ (order B):** do they use the order's pin link, pan the map, or ask? On desktop Alliance, can they find Gazette House (M2)?
- [ ] **Completing all three:** do they notice *All orders carried out · +5 PC*? Do they know what PC is (m5)?
- [ ] **The Letter:** do they find it on their own (Paper tab dot)? Do they understand the two approaches and the odds? If the stamp reads *Failure*, how do they react (App. C #20)?
- [ ] **Me:** do they visit it? Do they notice the keepsake and *Wearing*?
- [ ] **When Energy runs low:** do they read the Out of Energy card, and say what they will do next?
- [ ] Anything they tapped that did nothing, anything they couldn't read or reach, and anywhere they stopped and asked "what now?".

### From the report (`pnpm report:playtest`, arrival funnel)
- [ ] The funnel per faction: where do players stop? (accounts → face → answers 1–6 → joined → first action → orders 1/2/3 → job → chapter)
- [ ] The median and p75 of sign-up → join, join → first action, join → all orders (target ≤ 10 min) and join → chapter.
- [ ] The first-action match (first action = welcome order A) and second tap = Again.
- [ ] Resumes (a gap of more than 10 minutes between two answers) that still joined.

### Questions afterwards (short, open)
1. "What did you think you were supposed to do when the map opened?"
2. "What were the three lines from the secretary for?" (the orders)
3. "Did you open the letter from your father? What did it do?"
4. "What did your answers to your father change, if anything?"
5. "Why did you choose that party? Would you choose again?"
6. "Was there a moment you didn't know what to do next? Where?"
7. "Was anything too small, hard to read, or hard to tap?"

### Answer the question
- **Yes** if most testers complete the three welcome orders and open the Letter within 10 minutes without asking for help, and their answers to questions 1–3 describe the orders and the Letter correctly.
- **No, and where:** the funnel step where the most players stop, weighed against the "what now?" moments observed live. Send findings about the words and pacing to the game designer, and findings about the screens (M1, M2, m4, n1, n3) to the developer.

---

## 8. Fix round 1

| | |
|---|---|
| **Date** | 29 Sep 2026 |
| **By** | developer agent |
| **Tree** | branch `slice-0` on `72abaaa` ("Design answers: slice-2 QA and slice-3 tech design"), uncommitted |
| **Design answers applied** | `docs/design/slice-2-onboarding.md` §14 (m5, m3, n7, n9, n10, n13, n5, m1, n12, n8, n6), and the user's decision to keep the Collective crest |

### 8.1 Status per bug

| Bug | Status | What changed | Test |
|---|---|---|---|
| **M1** double tap in the origin | **Fixed** | `StoryScreen` keys its choices and approaches by a `screenKey` (the question id, or the chapter step), so the next question's choices are new buttons, and each tap carries the key of the screen its button was rendered for. A new screen's choices ignore **taps** for `STORY_SETTLE_MS` = 500 ms (`aria-disabled`, dimmed). A key press is not held back: the focus moves to the new prompt when the screen changes, so a repeated Enter cannot reach a choice. The first screen also settles when it replaces one the player has just tapped (`settleOnMount`: the face's *Continue*, the Letters row). `arrive.tsx` drops a tap for a question that is no longer current or already sent, and keeps that guard until the next question (another id) has settled; it is released only on an error. The server stores an answer only for the current question id (set-once, in order; an earlier id returns the current view, a later one is `OUT_OF_ORDER`), now pinned by a developer test. The same guard is on the Ambition chapter (the choice step and the approaches). | QA `M1` e2e is now a normal test; `story.test.tsx` ×4; `arrival.test.ts` "QA M1" |
| **M2** pins under the plate | **Fixed** | `CityMap` measures every `[data-map-overlay]` over the map, its own and the shell's. A wide one marked `top` or `bottom` is a band; anything else (the plate in its corner from 640 px, and the desktop tab dock, now marked) is a **block**. `fitPinsView` keeps the old first view when every pin is between the bands and clear of the blocks. Otherwise it searches from that scale down for the position nearest the centred one that keeps every pin between the bands, clear of every block and within the pan limits. The pan-limit check also fixes 640 px wide, where the image's limits pulled Ashford's pins back under a plate that is a band at that width. The first view is fitted again in place (never by remounting, so the `c732d64` lost-tap fix holds) when the box or an overlay changes size and the player has not moved the map: this is the Coalport pin 6 / banner case at 1280×800. The library's own resize alignment could cancel that reset, so the view is checked 150 ms later and set again if it did not hold. On a desktop, a pan made for a sheet is undone when the sheet closes, as on phones, and the overlays are not re-measured while a sheet is open (the plate folds then). | QA `M2` ×2 are now normal tests; new `e2e/map.spec.ts` (all three cities at 1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, 640×900, 375×812 and 360×640; Ashford's first-landing sheet closed at 1280×800, then a pin tapped at once); `components.test.tsx` ×4 |
| **m1** tile contrast | **Fixed** | Tokens `--color-vanguard-text: #7d5f18` and `--color-alliance-text: #3a5b78` (the design's `--vanguard-text` and `--alliance-text`, named for Tailwind's `text-*` utilities). `FACTION_STYLE.text` uses them; fills, crests and marks keep the faction colours. | QA `m1` ×2 are now normal tests; `ResultModal.test.tsx` |
| **m2** funnel misses *Take a job* | **Fixed** | `jobTakeRows()` in `packages/db/src/funnel.ts` turns `job.take` request logs into funnel rows of kind `job`: they count towards the orders and "all three done", and are never the first or second action. *Job taken on day 1* also counts a day-1 take that was switched later. The report reads them. Request logs expire after 7 days, so run the report within a week of the playtest. | `funnel.test.ts`: three Vanguard players read 3 / 3 on day 1 (0 before the fix) |
| **m3** blank name → "Comrade" | **Fixed** | Rule `checkName` in `packages/rules` (§7.3: NFC, trimmed, inner spaces collapsed, 2–40 code points). Sign-up form: the three design strings under the field, `maxLength` 40. Server: Better Auth `databaseHooks` refuse the same at sign-up and on update-user (400 `NAME_BLANK`, `NAME_TOO_SHORT`, `NAME_TOO_LONG`) and store the name normalised; the join refuses a draft name outside the rule (`BAD_NAME`). An account from before the rule: a blank or one-letter name becomes `copy.unnamed`, "A Newcomer"; a longer one is cut to 40. "Comrade" is gone, and so is the QA source sweep's allowance for it. The db schemas keep `maxlength: 60`, so older documents still validate. | The QA server `it.fails` and e2e `m3` are now normal tests; `name.test.ts`; `http.test.ts`; `arrival.test.ts` ×2 |
| **m4** shared scroll position | **Fixed** | The shell's `<main>` goes back to its top when the route's path changes (a tab, or the chapter screen). A change of search only (a pin's sheet) keeps it. | QA `m4` is now a normal test |
| **m5** PC on phones | **Fixed** (design §14.1) | The HUD's PC column shows at every width once PC > 0, never as a zero. The modal line where PC first appears is `copy.allOrdersDone` ("All orders carried out · +5 PC"). Me reads `copy.politicalCapital` ("Political Capital 5"). Not on the plate. | `components.test.tsx`, `ResultModal.test.tsx` |
| n1 *To the city* below the fold | Fixed | The paper's CTA is sticky at every width. On wide screens it sits above the floating dock, with bottom padding so the Letters row and the desk scroll clear. Checked at 1440×900. | — |
| n2 level-up panel below Continue | Fixed | The level-up line and its stat-point panel now open the Knock-on effects section instead of closing it. | existing modal tests |
| n3 street facts under the footer | Fixed | A selected faction card scrolls itself into view, with a bottom scroll margin that clears the sticky confirm. | — |
| n4 radios without arrow keys | Fixed | Faction cards and approach tickets take Up/Down/Left/Right (wrapping), Home and End, which move and pick. Each stays its own Tab stop, so the QA keyboard-only arrival still works. | `story.test.tsx` |
| n5 `garrison` in URLs | No change (design §14.3) | | |
| n6 Collective crest alt text | Closed (user decision) | The crest stays and its alt text stays honest. The QA `it.fails` is now a normal test asserting the crest and its alt text. There was no crest TODO in the code. | `qa.slice2.test.ts` |
| n7 Paper dot | Rule confirmed (design §14.3) | This was already the behaviour; the comments are updated. | `ambition.test.ts` "n7" |
| n8 Ashford art budget | Accepted (design §14.4) | Found on the way: a first landing **at night** loaded the day map as well as the night one. The e2e server clock is pushed past 20:00 UTC by the other specs, and the small-phone Vanguard and Alliance runs then measured 1.09 and 1.33 MB. The day map now loads only by day, as the night map already did. | `components.test.tsx`; the small-phone arrival specs |
| n9 kind labels | Fixed | `copy.kindLabel(kind)` in content, with the 19 labels of §14.3; the client's table is gone. | — |
| n10 ticker separator | Fixed | A dim middle dot, `aria-hidden`. | — |
| n11 empty band on the phone map | Fixed | Where the image is shorter than the area between the plate and the orders panel, it now sits in the middle of that area, so the empty ground is split between top and bottom. Where it is taller, it covers the area. | `components.test.tsx` |
| n12 shares as fractions | Fixed | `formatShare`: every share in the printed report reads "62 %" (the JSON stays 0–1). | `funnel.test.ts` |
| n13 chapter screen after chapter 1 | Fixed | `AmbitionView.waitsUntil` comes from the server: `copy.chapterWaitsUntil` ("From Tuesday 6 October, at Rank 2"), with the kicker, the title and **Back to the paper**, and no choices. | `ambition.test.ts`, `chapter.spec.ts` |

### 8.2 Also changed, and why

- **Docs moved under the tests.** `72abaaa` added slice-3 material to the GDD and the onboarding design. GDD §21.4 now lists `keep.election-bill` (*His election bill*), so the item is catalogued in content (inert until chapter 2 is written). The developer's content test now counts 10 items and compares the slice-2 design's list without it. The onboarding hook line is marked as superseded in slice 3 (chapter 2 after the first ballot). The content keeps *at Rank 2* until then, and the developer's test now checks only the doc's title and date part. No QA assertion was changed for this.
- **QA test files:** every expected-failure marker of a fixed bug is now a normal test, with a "Fixed in fix round 1" line in its comment. The only QA assertion edited is the source sweep, which no longer allows "Comrade" (stricter). The crest `it.fails` became a normal test, as instructed.
- **M1 has no server-side timing rule.** The server cannot tell the second tap of a double tap from a quick, deliberate tap on a question it has already sent. A minimum read time would also refuse the quick keyboard answers of the QA keyboard-only test. The server's guarantee is the question id: an answer is stored only for the question that is current.

### 8.3 Command output (real runs)

| Command | Result |
|---|---|
| `pnpm art:check` | `art:check ok: 30 assets, 11.02 MB` |
| `pnpm turbo lint typecheck test build --force` | exit 0 · **20 successful, 20 total · 0 cached** · rules 18 files / **216 passed** · content 4 / **82 passed** · db 3 / **22 passed** · ui 3 / **45 passed** · server 11 / **133 passed**. No expected failures left |
| `pnpm e2e` | exit 0 · **46 passed (5.0 m)** on the phone, small-phone and desktop projects |
| M1 and M2 ×5: `playwright test e2e/qa.slice2.spec.ts e2e/map.spec.ts --project=phone -g "M1\|M2" --repeat-each 5` | exit 0 · **45 passed (6.4 m)**: 9 tests × 5 (QA M1, QA M2 ×2, the QA m1 pair, which the case-insensitive grep also matches, and `map.spec.ts` ×4) |
| By hand with `pnpm dev:mem` | At 768×1024 and 1280×800, all three cities, with the *paper is in* banner showing: every pin clear (Playwright against the dev server, `elementFromPoint` at each pin, plus screenshots). Also clear at 1920×1080, 1440×900, 1024×768, 640×900, 375×812 and 360×640. The paper's *To the city* at 1440×900 sits above the dock. `dev:mem` is stopped; ports 3001, 5173, 27018, 3101 and 4173 have no listener |
| `prettier --check .` | all files formatted |
