# QA report: the review-5 fix round (Design Review 2)

| | |
|---|---|
| **Build under test** | branch `slice-0` at `98f87cb` (commits `6142de8` → `98f87cb`), plus the QA files in §5 (uncommitted) |
| **Date** | 10 Oct 2026 |
| **Tester** | QA agent |
| **Sources of truth** | the user's notes `docs/review/2026-10-08-review-5.md` · `docs/design/review-5-answers.md` incl. §16–§19 · `docs/tech/review-5.md` incl. §23 Deviations (every phase) · ADRs 0079–0082 · `docs/GDD.md` as updated · `docs/review/review-5-build-notes.md` (what the user reads) · `CLAUDE.md` |
| **Rules of the round** | The user's 8 Oct rule: **no Vitest** (not written, not run; the older Vitest files are known stale and were left alone). Verified with Playwright and by playing the screens. Tests only in `apps/client/e2e/qa.review5.spec.ts`, as its own last project, known bugs `test.fail`. |
| **Environments** | Exploration: the production build of the server (`DB_MODE=memory`, test hooks on, night held at day, patrols off) behind `vite preview`, on my own ports (3310 / 4280), driven by scripts and by Playwright. Final runs: `E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e` (the full suite, once) and `--project=qa-review5 --no-deps` (my project, on the final spec). The user's `pnpm dev:mem` (3001 / 5173 / 27018) was not touched. Two stale processes from 7 Oct were found holding 3302 / 4274 (not mine, not the user's; left alone, other ports used) |

---

## 1. Verdict

**Pass with issues. Nothing blocks the review. Five minor findings, seven nits; before the user plays, fix (or accept on purpose) m1, m2 and m4, and correct three lines of the build notes (§3 "Build notes against the build").**

What is solid, by the numbers rather than by trust:

- **The patrol's rules hold, at their edges.** Per ten-minute bucket exactly one write (twenty reads at once: version +1, once; eight readers at once over twelve buckets, 80 runs of that test and 150 more buckets by script: never two writes, never disagreeing about the card). A refresh never re-rolls: the outcome of a bucket is fixed for whoever reads it. The 12 % is 12.01 % over 20,000 seeds; the chance table (12, +5 *Noticed*, +10 *Hot* / *Wanted*, +10 *Watched*, −10 *Warned*, ×2 Curfew, kept 5–40) is exact in all 32 cells. The quiet is ten minutes after the train, fifteen after a stop and after a run-in; the cap is two a night per town and a new night (the next six-hour block) has its own two. Never held, never in transit, never by day, never at home, never on a tap (a tap leaves *stops 0*). A pending card holds `action.perform`, `mission.start`, `travel.board` and `character.treat` with `PATROL_PENDING` and takes nothing; reads, the paper and the nation map keep working. The same key twice answers once (three at once: one Heat change); the same key with another row is `KEY_REUSED`; a second key finds `NO_PATROL`. The papers' two branches: a Cool, clean visitor is *Waved on*; a Hot one has *the name written down* (Heat +10, *Watched*).
- **Treatment is atomic.** 1 Iron a point, floor of 10 (3 missing → 10), no Energy; one key sent four times charges once; five different keys at once charge once (the other four get `FULL_HEALTH`); short of Iron is `CANNOT_PAY { why, iron, cost }` with nothing taken; refused while held (the cells and the ward, with the kind), on a train, with a run-in waiting, and with a patrol waiting; allowed on rival ground. The modal says what answers §8.2 says, word for word.
- **The Unrest prize cannot be farmed by the cases I tried.** 0.5 points pays, 0.499 and 0.4 do not; a home member is refused by the hook and paid nothing; the boundary run twice and a second day pay once; in / out / in on one day pays once, at the turn; a town that falls and drifts back over 60 before the turn pays nobody; a re-entry three days after a prize pays nobody, eight days after pays again; a push eight days before the entry is out of the window and one three days before is in. The headline names the top three, by push then name.
- **The six-hour day tiles the day.** Probed at 24 minutes either side of every edge on the server's own clock: night is exactly 04–06, 10–12, 16–18 and 22–24 UTC; `nextDusk` / `nextDawn` land only on those hours; the map and the rules agree at every probe.
- **Jobs.** The loader refuses a Driver at 200 (*"job … pays 200 … at least 238"*), accepts 238 and refuses 237; the content passes. Driver 240 > a member's factory 216, in Coalport and in Duskwall.
- **No father, anywhere a player reads** (content, copy, the paper, the three opening screens on three phones, the favour's result). The Vanguard's counter row is a welfare desk; no uniform, rank, march, symbol or slogan in any of the new strings or the new art (`demob-office`, `memorial-ribbon` viewed).
- **Screens.** At 390 × 844, 375 × 667, 360 × 640, 667 × 375, 1440 × 900 and 1920 × 1080, on the counter, the kitbag, the post, the welcome edition, the favour's result, the Me tab with the cards, the HUD, the home map, *What's here*, the Infirmary sheet, the Paper, the rival plate (day and night), the patrol card, the nation map's refusal and the treatment result: no control under 44 px, no control without an accessible name, no sideways scroll, nothing but opacity moving under reduced motion, no war word. Contrast of the new text (plate lines, *What's here*, the treatment card, the danger line in the failure colour) is 5.9 to 15.7, all over 4.5.

**Regressions:** none. The full e2e is green (§6): slices 1–5 and the review-4 features pass at every size they ran at.

**Bug count:** blocker 0 · major 0 · **minor 5** · nit 7.

---

## 2. Test plan followed

Legend: ✅ verified and correct · ⚠️ verified, bug or note filed · ➖ not verified here.

### 2.1 Server (API and hooks)

| # | Check | Result |
|---|---|---|
| S1 | Treatment: price 61 at 64 / 125, floor 10, no Energy; the modal's words | ✅ |
| S2 | Treatment: `FULL_HEALTH`, `CANNOT_PAY` with the cost, `NOT_HERE`, `UNKNOWN_LOCATION` (a non-hospital and garbage) | ✅ |
| S3 | Treatment: one key ×4 and five keys at once charge once; one key for another place is `KEY_REUSED` | ✅ |
| S4 | Treatment while held (cells, ward), on a train, with a run-in pending, with a patrol pending; allowed on rival ground | ✅ |
| S5 | Patrol: one write per bucket; twenty concurrent reads; a refresh never re-rolls; auto mode over twelve buckets ×80 runs | ✅ (one hook-only quirk, n2) |
| S6 | Patrol: quiet after the train (10), a stop (15), a run-in (pending and 15 after); the cap of two; a new night resets it | ✅ |
| S7 | Patrol: never held, in transit, by day, at home; a tap never rolls | ✅ |
| S8 | Patrol: a pending card holds acts, missions, boarding, treatment; reads, paper, nation map free | ✅ |
| S9 | Patrol: the same key twice; an unknown row keeps the card; the papers' two branches | ✅ |
| S10 | Prize: 0.5 threshold, home excluded, boundary twice, a second day, in/out/in, recovery before the turn, 3 and 8 days, the seven-day window | ✅ |
| S11 | The six-hour day at its edges through the server clock | ✅ |
| S12 | Night missions: the lock by day for a mission and a way (`opensAt`), the Night rate (a quarter of the base Iron; Partial a quarter of half; a Failure none; never Party XP), no order ever points at one (12 days) | ✅ |
| S13 | Jobs: loader rung rule (200 refused, 237 refused, 238 accepted), pay figures in two cities | ✅ |
| S14 | Closing the arrival over an unanswered hostile card applies the put-aside row (Heat, flag): not a free skip | ✅ |
| S15 | The three favours: success texts word for word (§19.5); the welcome decks and orders per party | ✅ |
| S16 | Run-in chance and the plate's word: day 15 / night 25 base, plus Heat and *Watched*, at Heat 0–80 | ✅ |
| S17 | A run-in left unclosed blocks the next run-in with `ACTION_CONFLICT` | ⚠️ **m5** |

### 2.2 Content and rules

| # | Check | Result |
|---|---|---|
| C1 | Four night missions, twelve night ways (3 posters, 3 duplicators, 3 rolls, 3 watches) | ✅ |
| C2 | Level-up lines' counts against content (Coalport: Intelligence 16 of 27, Strength 6, Agility 3) | ✅ |
| C3 | No war word, no extremist symbol over 7,627 strings of content and copy; the hits are the setting's past (*since the war*) and run-in combat | ✅ |
| C4 | No *father* in any player string (the two exceptions are Ashford's yard hand, slice 2, and unreferenced alt texts) | ✅ |
| C5 | The prize decks: `{top}` singular and plural | ⚠️ **m4** |
| C6 | The art: `demob-office` (no flag, insignia or uniform; the clock reads eleven), `memorial-ribbon` (plain black ribbon) | ✅ |
| C7 | Stale numbers and windows in the docs | ⚠️ n3 |

### 2.3 Screens (six sizes) and the focus areas

See §4 (one row per note), §5 (the tests), and §3 for what the screens turned up. ➖ **Not verified here:** a real phone; a screen reader; Firefox (the scroll bar's `scrollbar-width` branch is only read, not run); human feel; whether the clouds *read* as bigger (only their sizes and counts are measured).

### 2.4 Regressions (slices 1–5, review 4)

The full e2e (§6): capital, missions, run-ins, the council cycle, elections, the journey, the cells, the dev panel, the maps at every size. Green.

---

## 3. Bugs, ordered by severity

### Minor

#### m1. The plate drops the dusk line on phones under 700 px tall (375 × 667, 360 × 640)

- **Where:** `apps/client/src/routes/city.tsx` l. 899–902 (`ruleAndDusk` carries `[@media(max-width:639px)_and_(max-height:700px)]:hidden`); tech doc §23 phase 1 deviation 9.
- **Steps:** a 375 × 667 (or 360 × 640) viewport, any city plate, by day or by night.
- **Expected:** build notes row 11 and answers §11.3: *the plate's last line says Dusk in 40 min or Night · dawn at 18:00*; GDD §2.2.
- **Actual:** no dusk or dawn line at all (`plate-dusk` is not rendered). The plate's help note says the town's day is six hours and dusk "comes round four times a day", with no time. A player on an iPhone SE or a 360 px Android is never told when it gets dark, apart from the map turning. It is there at 390 × 844, 667 × 375, 1440 and 1920.
- **Why it matters:** the user asked for the day and night cycle (#11); a short phone gets the cycle without its clock.
- **Fix idea:** on a short phone let the dusk line *replace* the rule's line (it is the shorter of the two) instead of folding with it; or put the time in the first line of the help note.
- **Test:** `test.fail` in `qa.review5.spec.ts` (*the plate's dusk line … at 375 × 667* and *at 360 × 640*).

#### m2. On the smaller phones the result scrolls more than the rule allows

- **Where:** `packages/ui/src/components/ResultModal.tsx`; answers §17.3.
- **Steps:** a Success, a ×3 (2 of 3) and a Partial at the Mill Gate; measure the middle's overflow. Measured here (px the middle runs past its box; the modal itself never scrolls and the buttons stay on screen):

| | 390 × 844 | 375 × 667 | 360 × 640 | 667 × 375 | 1440 × 900 | 1920 × 1080 |
|---|---|---|---|---|---|---|
| ×1 Success | 0 | 73 | 100 | 282 | 0 | 0 |
| ×3 (2 of 3) | 0 | **155** | **182** | 329 | 0 | 0 |
| ×1 Partial | 0 | 76 | 125 | 288 | 0 | 0 |

- **Expected:** §17.3: a ×3 or a Partial scrolls at most about 100 px *at 740 px of height* and nothing at 844 and up. Build notes row 4: *the result fits a phone without scrolling in the usual cases*.
- **Actual:** at 390 × 844 and 740 up it is as designed (the developers' measurements agree). Under 700 px a ×3 scrolls 155 / 182 px and a plain Success 73 / 100 px, with the thin 6 px bar. The rule never says what a 667 px phone gets; the notes say "a phone".
- **Why it matters:** note #4 was about a scroll bar on a phone at level-up; on the two smallest listed phones there is still a scroll, now thin.
- **Fix idea:** a designer call: accept it for under 700 px (and say so in the notes), or cut the picture to 88 px and the title block's body to four lines under 700 px.
- **Test:** the numbers are logged by `#4 the result at every size` (*result middle overflow of a Success: …*); asserted: the modal never scrolls, the bar is 6 px (≤ 8), the buttons are on screen, and 0 px at 390 × 844 / 1440 / 1920.

#### m3. The Jobs card says *Needs LEVEL 3, AGI 10*; answers §5.2 says it already says *Agility 10*

- **Where:** `packages/ui/src/components/Sheets.tsx` l. 203–206 (`needsText`: `u.stat!.toUpperCase()`), `copy.jobNeeds`.
- **Steps:** Coalport, *Harbour Quays*, the Jobs card for the Driver.
- **Expected:** answers §5.2: *The Jobs card already prints needs Level 3 and Agility 10; it gains nothing*; GDD §1.5 and answers §3.1: the stat in full, never *STR* / *AGI*.
- **Actual:** *Needs Level 3, AGI 10* (the label is upper-cased by the card's style; the text is the abbreviation).
- **Fix:** print the stat's name (`copy` already has `Agility`, `Strength`, `Intelligence`).
- **Test:** `test.fail`, *#5 wording: the Driver card spells the stat out*.

#### m4. The Sentinel's prize deck reads *"Ottilie Brandt are named"* with one name

- **Where:** `packages/content/src/data/headlines.ts` l. 218 (`hl.v.unrest-pushed`: *"{top} are named by the district office for their part"*).
- **Steps:** a Vanguard member alone pushes Coalport (or Ashford) into Unrest; the next morning read the Sentinel.
- **Expected:** a sentence that reads for one name and for three.
- **Actual:** *Ottilie Brandt are named by the district office for their part.* With a handful of players, one name is the common case.
- **Note:** the build notes say *two* of the papers' decks read oddly; only this one does. The Clarion (*did the heaviest carrying*), the Gazette (*knocked the most doors*) and the Herald (*did most of the pushing*) read fine for one or three.
- **Fix idea:** *"{top}, named by the district office for their part."* or *"The district office names {top} for their part."*
- **Test:** `test.fail`, *#10 wording: the Sentinel deck with one name*.

#### m5. A run-in left unclosed makes every later run-in fail with `ACTION_CONFLICT` (found while stress-testing; slice 5 behaviour, not this round)

- **Where:** `apps/server/src/services/streetService.ts` l. 147 (`startRunInInTx`'s filter `runIn: null`); `notFree` treats only `state: 'pending'` as busy (`services/risk.ts`).
- **Steps (API):** on rival ground, take a run-in, answer it, **do not** call `encounter.close`; tap again until a second run-in would fire (or force one with `POST /api/test/street { runIn: 'next' }`).
- **Expected:** a free character is served, or refused with a reason the client words.
- **Actual:** the tap is refused after three attempts with `ACTION_CONFLICT`, nothing written, Energy untouched; every later tap that would bring a run-in does the same until the first is closed (13–17 of 60 taps in my loops, all of them taps that rolled a run-in; after a proper `encounter.close` a second forced run-in is served). Taps that bring no run-in are served as usual.
- **Reach:** the client's run-in gate asks for *Continue* before play resumes, so a UI player rarely meets it; a second tab or device, or a closed tab at the result, can. Low priority.
- **Fix idea:** `notFree` (or the act) closes a resolved run-in that is more than a few seconds old, or the run-in start filters on `runIn.state != 'pending'`.

### Nits

| # | Where | What |
|---|---|---|
| n1 | `packages/ui/src/components/RivalHeader.tsx` l. 137 (`plate-danger`) at 667 × 375 | Held sideways, the plate is a narrow side column and the danger line cuts mid-word at night: *Risk here: Danger…* (at 360 × 640 and above it reads *Risk here: Dangerous · patrols out…*). The build notes promise it cuts "after the risk word" |
| n2 | `apps/server/src/services/patrol.ts` l. 115 (`if (mode === 'never') return doc`) | Test-hook only: the hook's *Next* is spent by the stop's write, so a reader that loaded the character just before that write answers with the stale document and no card (7 of 20 readers saw it in one run). In `auto` mode (the game's) all eight readers agreed in every one of 150 buckets. Returning the fresh document there would make the hook match the game |
| n3 | docs | Stale after review 5: **GDD l. 1486** *(Driver 200)*; **`docs/economy.md` l. 107** *(the Driver (200, AGI 10))*; **`docs/tech/slice-4.md` l. 218** *(Driver … 200)* (a historical design table, noted elsewhere); **GDD §14.10's night-train row** (*departs 22:00–01:00, arrives 06:00*: the answers redefine it as *boards at dusk, arrives at dawn*, and the new windows end at 00:00); **`docs/design/slice-7-nation.md` l. 215** and **`docs/tech/slice-7.md` l. 170, 1226** (the Curfew's window *20:00–06:00 UTC* / *until 06:00*, though dated notes exist); the comments at `packages/ui/src/components/CityMap.tsx` l. 63 and `HallHeader.tsx` l. 53 (*Night art 20:00–06:00 UTC*); the GDD's treatment range *10–150* (Health 195 at Level 20 prices 194) |
| n4 | `packages/content/src/data/headlines.ts` l. 620, and the welcome decks | The Vanguard's first edition says *Papers in order, says the station office* beside a counter whose whole problem is a missing stamp. The decks say *Organiser Stahl* and the order's issuer is *District organiser, Duskwall*, while the counter says *Viktor Stahl · the Duskwall League's welfare desk* (review 4 asked for one name for him; still two) |
| n5 | build notes, *Dev panel shortcuts* | *Auto is the game's own chance (12 % a look…)*: it is 12 % per **ten-minute bucket** of reading, not per look (more looks in the bucket do not roll again) |
| n6 | content | *Books, from the camp library* and *four years … the camp* (answers §19.1: "the war, then a camp"): a designer's call whether *camp* needs a word (*the prisoners' camp*, *the transit camp*) so it can never be read as a worse one |
| n7 | one read | In my first run of the eight-readers-at-once test, one of 96 reads failed (the reason was not captured). About 1,100 further bursts (80 runs of the test of twelve buckets, 150 buckets by script, a burst across the day turn included) never failed. The test now prints the reasons if it ever does |

### Build notes against the build

The notes are true except in these places:

- **Row 4** ("fits a phone without scrolling in the usual cases"): true from 740 px of height; under 700 px it scrolls (m2).
- **Row 11** ("the plate's last line says Dusk in 40 min …"): not on a phone under 700 px tall (m1).
- **"Things to look at": two decks read oddly with one name**: one does (m4).
- *Dev panel shortcuts*: "12 % a look" (n5).
- Answers §5.2 (not the notes): the Jobs card prints *AGI*, not *Agility* (m3).

---

## 4. One row per user note

Verdicts: **yes** (fixed as asked), **partly**, **no**.

| # | Note | Fixed as asked? | Evidence |
|---|---|---|---|
| 1 | The opening is weak: who am I, why the station, what do the three want | **yes** (nits n4, n6) | *Coming home*, walked for **all three parties on all three phone sizes** (nine full walks: counter, kitbag, post, welcome edition, the HQ's sheet with the favour's ticket ringed, one tap, the result), and the counter at all six sizes with every row picked. Every text matches §19 and the favours match §19.5 word for word (API). The developers measured the three rows' portrait, name and first sentence above the confirm at 390 × 844 / 740 / 667; in my walks every row's first line can be scrolled clear of the confirm at all six sizes (360 × 640 needs the scroll); the rest of the ask shows once picked. No *father* in any screen or string. The Vanguard row is a welfare desk. A draft stopped after the counter resumes at the kitbag with its echo. By keyboard alone: Tab to a row, Space, Tab to the confirm, Enter. `scene.demob-office` shows no flag, insignia or uniform |
| 2 | The small clouds look odd | **yes** | By day 10 images (2 mist, 3 clouds, 3 shadows, 2 wisps), by night 8; every cloud and wisp ≥ 260 px at 1440 and 1920 (clouds 543–892 px at 1440); no *puff*. Counts and widths match §2. Whether it *reads* as better is for the user's eye |
| 3 | The level-up boxes are big black sharp-cornered boxes | **yes** (a playtest question) | Three paper cards (transparent fill, ink border, ≥ 56 px, 88–104 px measured) named *Strength 8 → 9* with their plain line; *Most used here* and *Your best* tags on the right card; one tap places and the card reads *Strength 9 · +1*; a double tap places **one** (2 → 1 pending); the heading goes *two points* → *one more*; the last point closes the picker. In the result: *Place it* opens the sheet; *Choose later · nothing is lost* leaves the point; after placing the line reads *Level 2 · Intelligence 12 → 13*. At all six sizes the Me tab's cards pass the audit. The corners are still square (the house style, answers §3.2): ask the user |
| 4 | An unstyled scroll bar on some missions when I level up | **partly** (m2) | Ordinary Success with a level-up: 0 px at 390 × 844, 1440, 1920; the dialog itself never scrolls at any size; where the middle scrolls the bar is 6 px (square, no arrows). At 375 × 667 and 360 × 640 it still scrolls 73–182 px. The Places list carries the same bar. Firefox's `scrollbar-width` branch only read |
| 5 | A job needing more pays less than the factory | **yes** (m3) | Driver 240 > the member's 216 in Coalport and Duskwall; the loader refuses 200 and 237 by name and accepts 238; the card prints *240 a day*. It prints *AGI 10* (m3). Stale 200s in three docs (n3) |
| 6 | Health should stay under Energy | **yes** | Under Energy in the same column at 390 × 844, 375 × 667, 360 × 640, 1440 and 1920, with Heat under Health; held sideways Health and Heat ride in the name line inside the 60–80 px bar. The group note opens on the label under the tap, the others after it |
| 7 | I could skip the train encounter | **yes** | Escape, a click on the map, back and forward, a reload and the Paper tab leave the card; the Map tab brings it back; no close button; the keyboard reaches its rows first. The arrival's *Continue* is absent until a row is tapped (a double tap on *Let it pass* counts once: Heat +10 once). The API's `travel.close` over an unanswered card is the put-aside row with its consequences, never a free skip. The ordinary deck's *Sleep through it* reads *Nothing happens.* and its outcome *You nod at the window…* |
| 8 | Heal at any infirmary for money | **yes** | S1–S4 above, plus the screen: card, *Needs 61 Iron* disabled, price falling with Health, *Get patched up · 61 Iron* (44 px), a double tap charges once, the modal (*Patched up*, *Health 64 → 125*, *−61 Iron · the ward*), *You're well · nothing to treat*; Duskwall's *matron*, St Agnes's *sister* |
| 9 | A list of a city's Issues and missions | **yes** | Four blocks at home (Level 8), on rival ground (the visitor's missions, *Your orders are in Coalport · 0 of 3 done*) and in each capital district (Station & Market lists the last tram, Eastside and Old Town say *None here*); a mission row opens its place with the ticket in view; the night mission keeps its row with *Opens at nightfall · dusk at 13:00*; at Level 1 the empty line is *None yet · the first opens at Level 6* and the view holds the counts of the locked ones (3 from Level 6, 1 from Level 8). The developers' fallback lines: §7 |
| 10 | Make the danger and the point of a rival city visible | **yes** (m4, n1) | Three lines at six sizes (the goal one short line under 640 px, the whole sentence from 640); at the cap *The town has had enough today · 2 of 2 · more from tomorrow 03:00*; at night *Risk here: Dangerous · patrols out* in the failure colour (6.8 : 1); the nation card's goal. The prize: S10 plus the screen: the desk line *Duskwall in Unrest · you pushed 3.6 points this week · +50 Party XP* and the Clarion's headline naming three players *Bruno Birch, Dora Dale and Clara Cedar* (four pushed; the fourth, at 0.6, is left out) |
| 11 | Should time pass in real time? | **partly** (m1) | The windows tile the day to the minute on the server's own clock; the plate says *Dusk in 11 min* → *in 2 min*, then *Night · dawn …*, and the map's night art flips both ways; at six sizes the plate's line and art agree with the rules — **except** that 375 × 667 and 360 × 640 show no line (m1). The real day still turns the wage, the orders and the paper at 00:00 UTC (no daily rule moved; the prize and the orders ran across whole days) |
| 12 | Night missions; patrols on rival ground | **yes** | S5–S9, S12; on the screen: every political ticket on rival ground at night says *Night · patrols out* (none by day, none at home); the lorry by day has the lock line and no button, a *Night rate · +25 % Iron* chip, and the briefing greys a night way; the card at six sizes (all four rows reachable and 44 px) holds against Escape, the dim, a reload (no second roll: the version is unchanged), the Paper tab; a double tap answers once; the nation map's refusal says *A patrol has stopped you · answer it on the map* with the link back |

**Ten of twelve read as fixed as asked. Two are partly fixed: #4 (m2) and #11 (m1).**

---

## 5. Tests added (not committed)

| File | Tests | What it covers |
|---|---|---|
| `apps/client/e2e/qa.review5.spec.ts` | **94**: 90 plain and **4 expected failures** (`test.fail`, shown with `QA_SHOW_BUGS=1`: m1 ×2, m3, m4) | **API (21):** treatment (price and floor, refusals, double tap and race, held / transit / run-in / rival ground); patrols (one write a bucket, twenty readers, Auto mode ×12 buckets, the quiet, the cap and the next night, held, run-in, transit, day and home, what a pending card holds, the same key twice, the papers' two branches); the Unrest prize (0.5, home, boundary twice, a second day, in/out/in, recovery before the turn, 3 and 8 days, the seven-day window); the night windows to the minute; night missions (the lock, the rate, no order points at one); jobs; the arrival over an unanswered card. **Screens (73):** *Coming home* (nine walks, the counter at six sizes, a resumed draft, keyboard only); clouds; the cards (six sizes, the result's sheet); the result at six sizes; the HUD at six sizes; the journey card; the Treatment card; *What's here* (home, rival, capital, Level 1); the rival plate at six sizes by day and night; the prize in the paper; the dusk line and the turn; night tags, the lorry, the patrol card at six sizes, the nation map's refusal; the dev panel's new buttons; the Jobs cards; six whole-screen audits |
| `apps/client/playwright.config.ts` | +1 project | `qa-review5` (Desktop Chrome, dependency `review5`, last) and its exclusion from `phone` |

The project sets and restores the server's night seam, advances the shared clock by weeks and runs on the shared server, so it is last. Every known-bug test was run once with `QA_SHOW_BUGS=1` and fails for its bug's reason: *Received … Ottilie Brandt are named*; *`plate-dusk` element(s) not found* (×2); *Expected /Agility 10/*.

Two flakes of mine, fixed in the test: the first run of the cap test crossed a six-hour block (a new night resets the cap, correctly) and, once guarded, my guard advanced the clock past the quiet after the train; the guard now runs before boarding (40 consecutive passes).

---

## 6. Command output (real runs)

| Command | Result |
|---|---|
| `E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e` (full suite, once) | **exit 0 · 263 passed (21.0 m) · 0 failed.** The `x` lines are `test.fail` expected failures: slice 3's and slice 4's five-names-above-the-CTA (older) and four of mine |
| The same, after I added a keyboard test and an accessible-name audit and fixed the cap test's guard: `E2E_WEB_PORT=4273 E2E_API_PORT=3301 npx playwright test --project=qa-review5 --no-deps` | **94 passed (3.6 m)**, 0 failed (four of them expected failures). The first run of this project (93 tests) had one failure, the cap test (above) |
| `tsc --noEmit` (client, includes `e2e`) and `eslint` of the spec and the config | clean (the spec carries one `eslint-disable` for `no-explicit-any` with its reason: it reads untyped tRPC JSON) |
| Vitest | **not run**, by the user's rule |
| Along the way | My own harness mistakes, not the build's: the question ids are `origin.platform` etc. (not the step ids); a release on rival ground is a deportation (a train home, the town barred a day: the dev panel's *Unbar*); `page.getByRole('dialog')` loses the result after a resize past 640 px (the developers' own note); a resolved run-in left open made my first stress loop look like a patrol bug (it was m5) |

**Not verified here:** a real phone, a screen reader, Firefox, human feel, the clouds' look.

---

## 7. Wording calls left for the designer

1. **The prize deck, one name** (m4): *"{top}, named by the district office for their part."* Keep *{top}* as *A, B and C* for three.
2. **The developer's *What's here* lines:**
   - ***No Issue this week***: fine; plain; matches *Issues this week*.
   - ***No order points here today***: acceptable, but it reads as if orders exist and none point here, which is exactly the capital district case (a resident looking at another district). **Suggest** *None of today's orders point here*; keep otherwise.
   - ***None here*** (missions, in a district with none): fine for the capital; at home with only Rank or Reputation locks the *n more from Rank 3* line shows instead, which is right.
3. **The phone forms of the goal line** (*The goal: Unrest · 5.0 points to go · your party has pushed 0.4 this week*; *Duskwall is in Unrest · hold it · 8.0 points above the floor*): read well, one line at 390 and 360. Keep.
4. ***Choose one of the three***: keep.
5. **The danger line's cut** (n1): when the column is narrow put the risk word first or shorten *Risk here:* to *Risk:* sideways.
6. **One name for Stahl** (n4): *Viktor Stahl* on the counter and *Organiser Stahl* / *District organiser* in the deck and the order. A welfare-desk clerk who is also the party's district organiser is two jobs; pick one for the opening and keep the other for later.
7. ***Papers in order, says the station office*** (the Vanguard's first edition) against a missing stamp: *Papers received, says the station office* keeps the line and the story.
8. ***camp*** (n6).

---

## 8. Playtest checklist (for the user's Design Review 3)

The round's question: **does each of the twelve notes read as answered, in play?**

### Before the playtest

- [ ] Decide **m1** (the dusk line on a short phone) and **m2** (how much the result may scroll under 700 px). Both are one-line design calls.
- [ ] Fix **m4** (one name, *"are named"*) and **m3** (*AGI* → *Agility*): both are text.
- [ ] Correct the three build-notes lines (§3, "Build notes against the build").
- [ ] Decide whether **m5** (an unclosed run-in) is for this round.
- [ ] Update the stale docs (n3) with the next designer pass.
- [ ] Start a **fresh account, one per party** if possible. The dev panel moves the clock (*To dusk*), gives Level 10 and Rank 3, sets Health, sends a patrol (*Patrol: Next*) and pushes a rival town into Unrest.

### Walk, note by note

- [ ] **#1** Sign up three times (one per party), on your own phone.
  - [ ] *Who am I? Why am I here?* Can you say it back after the counter?
  - [ ] Is the **welfare desk** the Vanguard you expect, or too soft?
  - [ ] Do the three people want something different and specific? Does the first thing in town follow from the counter (*Sign on at the Union Hall*, *Get the stamp at Beacon House*, *File the appeal at the Assembly Rooms*)?
  - [ ] Does *the camp* need a word?
- [ ] **#2** A city map by day on a wide screen: do the clouds read as clouds now?
- [ ] **#3** Level up: *Place it*, the cards, *Choose later*. Are paper cards with square corners what you meant, or do you want them softer?
- [ ] **#4** A level-up result on your phone: does it scroll? How far? Is the bar quiet enough?
- [ ] **#5** The Quays' *Driver* next to the Mill Gate's *Factory worker*. Does the ladder make sense? (It says *AGI* still.)
- [ ] **#6** The top bar: Energy, then Health, on the phone, sideways and on a desktop.
- [ ] **#7** Level 10, board a train, wait for the card. Try to get rid of it with everything but a row.
- [ ] **#8** Dev panel → Health: Half, then the Infirmary. Price, tap, modal. Too cheap? Too dear?
- [ ] **#9** *What's here* in a strange city. Did it save you a search? Is *None yet · the first opens at Level 6* helpful at Level 1?
- [ ] **#10** Level 10, Rank 3, *Take me to… Duskwall*. Read the three lines. Do you know **what to do there and why**? Then *Push it into Unrest*, *Next day*, the Paper: the prize line and the headline.
- [ ] **#11** Does a dusk four times a day feel like more day and night, or like noise? Check on a short phone that you can tell when dusk is (m1).
- [ ] **#12** *To dusk*, then the Customs House (Level 8): the lorry. On rival ground at night: tap, and *Patrol: Next*, then the Map tab. Is the patrol a nuisance or a story?

### From the report (`pnpm report:playtest`)

- [ ] Beat 1: whom players chose (an even split, or one party favoured?).
- [ ] Taps from sign-up to the first result (the answers say eight).
- [ ] Patrol cards answered, and which row (*Let it pass* every time means the other rows are not tempting).
- [ ] Treatment bought per run-in (the GDD lever: if bought after every run-in raise to 2 an Iron a point; if never, raise *Won at full strength*).
- [ ] Night missions started against the daily total (the four are at most 52 Energy a day).
- [ ] Unrest entries and prizes paid; any town that wobbled at the line.

### Questions afterwards

1. "Who were you, and why were you in that office?"
2. "Did you ever want to be somewhere else at night, or was a patrol a reason to stay out?"
3. "Where would you look first in a strange city now?"
4. "Which note still feels unanswered?"

---

## Fix round

Built by the developer on 10 Oct 2026, on `slice-0` (the commit *Review 5 QA fix round: …*). The four known-bug tests are plain tests now and pass; m5 has a new test of its own. QA's spec now holds **95 tests**, no `test.fail`. Details of each change: `docs/tech/review-5.md` §23, *QA fix round*.

| # | Finding | Status | What changed |
|---|---|---|---|
| m1 | The plate drops the dusk line under 700 px of height | **Fixed** | On a phone under 700 px tall the line sits **beside the town's name in two short lines** (*Night · dawn* over *at 15:00*, Courier 10); on a capital district's plate at the right of the *Who holds* row. The plate's height and the pins clear at rest are exactly as before (measured: Coalport, Duskwall, Ashford, 375 × 667 and 360 × 640, day and night). GDD §2.2 and the tech doc say so. Tests: QA's two dusk-line tests at 375 × 667 and 360 × 640 are plain and pass |
| m2 | The result scrolls on 375 × 667 and 360 × 640 | **Fixed** | Under 700 px tall: picture 88 px (stamp 70 %), body 14 / 20, the tags on the *Rewards* line, two knock-on lines and *n more*; under 800 px tall the three buttons share one row. Measured (px past the middle's box): **Success 0 / 0**, **Success with a level-up 0 / 0**, **×3 3 / 30–52** (52 with the *Three more needs …* hint line), **Partial 0 / 0** at 375 × 667 / 360 × 640; at 390 × 740 the ×3 went from 76 to 8–24 and nothing else scrolls. The rule (a ×1 Success never scrolls; ≤ ~100 px for a ×3, a reason line or a run-in) is now in GDD §13.1a and answers §17.3 for the short phones too. Tests: `review5.spec.ts` measures both short phones (0 / ≤ 100); QA's `#4 the result at every size` asserts 0 px for a Success at all five sizes but 667 × 375 |
| m3 | *Needs LEVEL 3, AGI 10* | **Fixed** | `Sheets.tsx` prints the stat's name (*Needs Level 3, Agility 10*); so do the `JOB_LOCKED` notice (`errors.ts`) and the paper's *Wearing* row (`Paper.tsx`, *Charisma 5*, was *CHA 5*). No other stat abbreviation reaches a player (searched content, UI, client, server strings). Test: plain; it now reads `textContent` (the card's caps style upper-cases `innerText`) |
| m4 | *Ottilie Brandt are named* | **Fixed** | The Sentinel's deck: *The district office names {top} for their part.* The other three papers' decks already read for one, two or three names. Test: plain, and it also asserts the new sentence |
| m5 | An unclosed resolved run-in blocks every later run-in (`ACTION_CONFLICT`) | **Fixed** | A new run-in starts over a resolved pointer: the open result moves to `character.runInUnseen` (oldest first) and the gate shows it after the new one, each until its *Continue* (`gateRunIn`; `encounter.close` clears either). Nothing is refused, written twice or lost. Test: new, *m5 a resolved run-in left open* (API, then the gate on the screen: newest result, Continue, the one left open, Continue, nothing) |
| n1 | *Risk here: Danger…* held sideways | **Fixed** | Sideways the danger line prints its head only, *Risk here: Dangerous · patrols out*, wrapping in the side column; the full line is its `title` and note |
| n2 | `ensurePatrol` `never` mode returns a stale doc after a forced stop | **Fixed** | After a forced stop is written, a `never`-mode reader re-reads the character (`patrolHooks.spent`) |
| n3 | Stale docs and comments | **Fixed** | GDD: the capital's Driver 240, the night-train row (*boards at dusk, arrives at dawn*), the treatment range (*10 to Health max − 1*); `economy.md` §5.1; `slice-7-nation.md` l. 215, 219 and `tech/slice-7.md` l. 170, 579, 1226, 1436, 1665 (the Curfew's window and *until {dawn}*); the `CityMap` and `HallHeader` comments. `tech/slice-4.md` l. 218 left as the historical table it is |
| n4 | Stahl's two names; *Papers in order* against the missing stamp | **For Design Review 3** | Below |
| n5 | *12 % a look* | **Fixed** | Build notes: *12 % for each ten minutes you are looking at the town, however often you look* |
| n6 | *camp* | **For Design Review 3** | Below |
| n7 | One failed read in one burst | Not reproduced | Nothing changed; the test prints the reasons if it ever fails again |
| Build notes | Rows 4 and 11, the "two decks" line | **Fixed** | Row 4: an ordinary result fits every phone, the small ones included; a ×3, a reason line or a run-in may scroll a little. Row 11: on a phone under 700 px tall the dusk line sits beside the name. *Things to look at*: every paper's deck reads right with one name or three. The danger line's sideways form is in *Words we chose* |

### For Design Review 3

Left for the user, unchanged:

1. **Stahl's name and *Papers in order*** (n4, §7 items 6 and 7): the counter says *Viktor Stahl · the Duskwall League's welfare desk*, the decks *Organiser Stahl* and the order *District organiser, Duskwall*; and the Vanguard's first edition says *Papers in order, says the station office* beside a counter whose problem is a missing stamp (QA's suggestion: *Papers received, says the station office*).
2. **Whether *camp* needs a word** (n6, §7 item 8): *Books, from the camp library*, *four years … the camp*.
3. **The level-up cards' square corners** (note #3): paper cards with the house style's square corners, or softer.

### Housekeeping

The two stale processes from 7 Oct on 3302 and 4274 were this project's leftover test servers (`tsx src/index.ts` with its in-memory MongoDB, and `vite --port 4274`); they were stopped. The user's `pnpm dev:mem` ports (3001, 5173, 27018) were not touched.

### Fix-round runs

| Command | Result |
|---|---|
| `pnpm art:check && pnpm turbo run lint typecheck build` (cached, no `--force`) | green: 79 assets; 14 of 14 tasks |
| `--project=qa-review5 --no-deps` (ports 4273 / 3301) | 94 passed, 1 failed (the Jobs test's `innerText` caps, fixed in the test); then the changed tests again: passed |
| `--project=review5 --project=rival --project=landscape --no-deps` | 16 passed |
| `E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e` (full, once) | **exit 0 · 265 passed (21.0 m) · 0 failed.** The two `x` lines are the older expected failures (slice 3's and slice 4's five names above the CTA); QA's project: 95 of 95 plain tests passed |
| Vitest | not run, by the user's rule |

Screenshots: the scratchpad's `review5-shots\fixround\` (the plate's dusk line at 375 × 667 and 360 × 640 by day and night, the rival plate at night including held sideways, the ×3 and the Success at both sizes, the Jobs card, the one-name prize headline).
