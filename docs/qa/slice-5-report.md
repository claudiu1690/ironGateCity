# QA report: slice 5, "Risk"

| | |
|---|---|
| **Build under test** | branch `slice-0` at `de4417d` ("Slice 5 phase C: the screens"), on top of phase A `b271ed4` and phase B `f6bb49e`, plus the QA test files in §5 (uncommitted) |
| **Date** | 5 Oct 2026 |
| **Tester** | QA agent (with a QA sub-agent for the client audit and the e2e spec) |
| **Sources of truth** | `docs/GDD.md` (§6.1, §6.4, §8.4, §11.2–§11.4, §13.1, §13.3, §14.11–§14.13, §19.1–§19.2, §20, Appendix C #47–#56) · `docs/design/slice-5-risk.md` incl. **§23 Settled** · `docs/design/slice-5-screens.md` incl. **§12** · `docs/tech/slice-5.md` incl. **Deviations, phases A–C** · ADRs 0031–0035 · `CLAUDE.md` |
| **Environments** | Vitest on the in-memory replica set (rules, content, db, server, ui) · a private copy of the app (built API on :3401 in memory mode with the test hooks, the Vite dev client on :5373), driven by scratch Playwright scripts at 1920×1080, 1440×900, 812×375, 667×375, 390×844, 375×667 and 360×640, plus a DOM audit (targets, side scroll, contrast, names, odds words, vocabulary), a keyboard walk, a reduced-motion pass and the dev panel's risk buttons · the Playwright suite against the production build (`E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e`) in a clean worktree. The user's `pnpm dev:mem` (3001 / 5173 / 27018) was left untouched |

---

## 1. Verdict

**Pass with issues. Nothing blocks the playtest, but fix M1 before it, and m1, m5 and m6 if the copy can be settled in time.**

The rules are right. I re-derived them from the GDD's own text and from independent reference models, over many random cases:

- **Heat** cools piecewise by City Day at 5 or 7.5 an hour. 3,000 random timers matched an exact integral of the day rates, and 1,000 random chains of writes lost or invented no part-point. *Cool by* is the first millisecond Heat reads 24.
- **Health** is 100 + 5 for every Level after the first (125 at 6, 145 at 10), +10 every whole ten minutes. It is composition-safe, and full at `healthFullAt` to the millisecond.
- **The record:**
  - minor marks fade 14 City Days after the last mark of any kind (2,000 random records);
  - an arrest that carries marks escalates to three serious marks at 0–6 days, not at 7;
  - the strike-off takes the oldest live mark.
- **The caught check:** 5,000 random inputs match base (×2 rival) + ⌊Heat ÷ 2⌋ + state + 5 Repeat − ⌊AGI ÷ 2⌋, kept 2–95. It runs only on a Partial or a Failure of an illegal type, never after a loss or a Run. *Wanted* and a Failure arrests without a roll. Over 40,000 rolls it lands at its chance ±1 %.
- **Tier-2 rewards** equal design §4.2's table, parsed from the document, to the unit. Rested gives +50 % on XP and Iron only, the record's −10 / −20 / −30 % applies to mission Iron, and Issue tags add +50 % opinion.
- **Rival ground:**
  - the +4 row equals four points of difficulty for every stat 1–60 and difficulty 8–22;
  - Heat and run-ins are ×2, the caught base ×2, the sentence ×1.5 (at most 60) and bail ×2;
  - opinion against: over 5,000 random calls the shares always add to 100.000, half goes to the actor rounded down, and the home floor holds;
  - a simulated day of visitors never takes more than 2.000 points.

The server holds up under load except in one place:

- **The ways out work from several taps at once:** five bails, one release; *Walk out* against *Discharge*, one of them; four strike-offs, exactly as many as PC and marks allow.
- **`encounter.choose` from four rows and two reads past the window at once** gives one resolution, one log and one answer.
- **Luck after three days away** resolves as of the decide time. The player is discharged lazily from the infirmary stay it caused, nothing owned is lost, and Pay is never chosen.
- **Heat cools at the residence city's rate** wherever the player stands.
- **A capital resident is deported to Irongate.** The bar ends at *until* + 24 h to the millisecond.
- **Six visitors tapping at once at 1.95 lost** take exactly 0.05 more.
- **Migration 007** fills every odd slice-4 shape. Two starts at once apply it once, and a second run changes nothing, byte for byte.

**The exception is M1.** The phase-B race fix covered only the test hooks. In production, two copies of one mission tap with the same key can each commit a start, one a final result and the other a pending run-in. Energy and Heat are then charged twice, and the mission can be paid twice. The client's network retry sends exactly such a copy.

The client follows the screens closely:

- every new control is at least 44 px except one;
- nothing scrolls sideways at any size;
- every modal eases in and fades under reduced motion;
- no odds maths is shown;
- the keyboard reaches everything;
- the art is clean (the speech scene is redrawn as agreed).

The rest are minor layout, copy and accessibility issues (m1–m9). The capital overview, the tram bar and the ballot from slice 4's fix round all hold.

**Bug count:** blocker 0 · **major 1** · minor 9 · nit 12.

---

## 2. Test plan followed

Legend: ✅ verified and correct · ⚠️ verified, bug filed · ➖ not verifiable here.

### 2.1 Rules maths (GDD §6.1, §6.4, §8.4, §11, §14.2, §14.11–§14.12, §19, §20)

| # | Check | Result |
|---|---|---|
| R1 | The slice-5 constants parsed from the GDD's own text: Heat by type, states, 5 an hour, ×2; caught bases and marks; the sentence and bail; the infirmary; Health 125 / 145; §20.1's four formulas and the scaling | ✅ |
| R2 | Heat piecewise by day (5 / 7.5) against an exact integral (3,000 cases); no lost part-point over 1,000 write chains; the clamps; state after the gain; `heatEta`; 100 → 0 in 20 h (13 h 20 under a strike) | ✅ |
| R3 | Health: +10 per whole ten minutes, composition, `healthFullAt`; a level-up at full stays full; max 100 + 5 × (Level − 1) for Levels 1–60 | ✅ (n10: the docs' wording) |
| R4 | The record: fading (2,000 random records), the level names, the Iron %, the Repeat +5, *fadesOn*; day 13 *On file*, day 14 clean; escalation at 0–6 days, not 7, for every illegal type; a name taken never escalates; strike-off oldest first (2,000 random) | ✅ |
| R5 | The caught check (5,000 random inputs against a reference); only Partial and Failure, never after a loss or a Run, never surveillance; *Wanted* + Failure without a roll; the rate over 40,000 rolls | ✅ |
| R6 | The run-in chance (5,000 random); the four odds for every opponent at tier 1 and 2, home and rival, over a stat grid; luck takes the best free row; the pool over 20,000 seeds per faction and state (own side never, police 50 ± 1.5 % from *Noticed*); 10,000 random `resolveRunIn`s (Health bounds, a win ≥ 1, a loss 0, Pay always takes the Iron, failed rows fight at −10 or full odds) | ✅ (n6) |
| R7 | Tier-2 rewards: design §4.2's table parsed; Rested; Issue +50 %; the record's Iron; the ladder 14 / 16 / 18 / 20, +2 in the capital | ✅ |
| R8 | Rival ground: the +4 row (every stat × difficulty); `missionRisk` ×2 and §11.3's 16 / 60 % / 20 %; sentence and bail for every Heat, mark count, rival and Alliance case, with *The Cells Are Full*; quarters by Level | ✅ |
| R9 | Opinion against: 5,000 random calls; a day of visitors (200 trials) never past 2.000 and resetting the next day; the 1.97 → 0.03 remainder; +50 % / +75 % | ✅ |
| R10 | A mission in rules: Heat and the run-in roll on every outcome; *Wanted* + Failure + a Run is no arrest, + a won fight is; a police loss on a watch is the cells with no marks and no escalation; Agility +¼ only on a paid Success | ✅ |

### 2.2 Run-ins (ADR 0032, design §4.6, §10, §23.1 #17)

| # | Check | Result |
|---|---|---|
| E1 | The pending step: Energy, Heat and the way written, the encounter pending, the modal state; other acts refused `RUN_IN_PENDING` (developer tests, re-run) | ✅ |
| E2 | **One key from many copies at once, hooks OFF (production)**: 24 players × 6 copies | ⚠️ **M1** |
| E3 | The same with a tier-1 tap on rival ground | ⚠️ **M1** |
| E4 | One key from 8 copies, hooks ON with a forced run-in (the phase-B fix): one encounter, one view for all | ✅ |
| E5 | Two keys at once: every start that succeeded paid once; the other refused `RUN_IN_PENDING` or `HELD` | ✅ |
| E6 | A key reused for another mission: `KEY_REUSED`, nothing written | ✅ |
| E7 | `encounter.choose` × 4 rows + `character.me` + `encounter.current` past the window, at once (6 runs): one resolution, one log, one answer, the Iron at most once, one `by` | ✅ |
| E8 | The same key five times: one request log, five identical answers | ✅ |
| E9 | Another player's encounter: `NOT_FOUND` for choose and close; theirs stays pending | ✅ |
| E10 | `encounter.close` on a pending run-in does not clear it | ✅ |
| E11 | Five-minute window: not a millisecond before, as of the decide time at it; a choice past the window while pending wins; midnight (developer tests, re-run) | ✅ |
| E12 | Three days away on a run-in: luck as of `decideBy`, the infirmary from then, discharged lazily in the same read, Iron never lower, items unchanged, Health full, the result waiting | ✅ |
| E13 | Luck never picks Pay; a player who never answers is never charged (12 run-ins) | ✅ |

### 2.3 The cells, the infirmary, the record (ADR 0033, design §7–§9, §11.5)

| # | Check | Result |
|---|---|---|
| H1 | Pay bail from five keys at once: one release, the bail once | ✅ |
| H2 | Pay bail with one key five times: identical answers, one request log | ✅ |
| H3 | *Walk out well* and *Discharge yourself* at once (6 runs): one of them, its cost once | ✅ |
| H4 | *Walk out* / *Discharge* never spend Rested (Energy 3 with Rested 100 → `NOT_ENOUGH_ENERGY`) | ✅ |
| H5 | Strike-off × 4 with PC for one: one; with PC for many and two marks: exactly two, the rest `NO_MARKS` | ✅ |
| H6 | In the cells: a mission `HELD`; the paper, the Me tab and the strike-off work; Energy 40 → 60 over a 40-minute sentence | ✅ |
| H7 | Heat 25 after any release, even from 0 (a police loss on a speech) | ✅ rule · ⚠️ copy **m6** |
| H8 | A release read two hours late: 25 at *until*, 15 at +2 h | ✅ |
| H9 | Heat cools at the residence city's rate: a capital resident in Coalport under its Customs Strike cools at 5; a Coalport resident in Irongate at 7.5 | ✅ |
| H10 | Deportation: a capital resident goes to Irongate; *Barred* on the nation card; `BARRED` at *until* + 24 h − 1 ms, boarding at + 24 h | ✅ |
| H11 | Deported and away three days: home, unbarred, Iron, items and equipment intact | ✅ |
| H12 | The infirmary on rival ground: discharged in Duskwall, no train, no bar | ✅ |
| H13 | Legal Aid, *The Cells Are Full*, the held tap, bail against the lazy release, the record's lock (developer tests, re-run) | ✅ |

### 2.4 Rival ground and travel v3 (ADR 0034, design §11)

| # | Check | Result |
|---|---|---|
| T1 | A disruption in Duskwall: Heat +16, the −16 row, Party XP 12 + 6, opinion against the Vanguard (−0.3), `rivalPressure` 300, the tally's rival city | ✅ |
| T2 | *Hot* and caught there: 57-minute sentence ((10 + 28) × 1.5), bail 300, then the train home and the bar, Heat 25 | ✅ |
| T3 | The cap reached by a mission (1.9 → 2.0, `capped: true`) | ✅ |
| T4 | Six visitors tapping at once at 1.95 lost: exactly 0.05 more, the sum 100.000, every tap still paid | ✅ |
| T5 | The first trip draws the checkpoint even at Heat 90; *Your name is on a list* reads the Heat **projected** at boarding (52 stored two hours ago → 42, no list; 50 now → the list) | ✅ |
| T6 | Level 9 refused, Level 10 open; the rotation; the gate both ways; ignore effects once; flags change the next run-in (developer tests, re-run) | ✅ |
| T7 | In the app: card, *Papers, please* (no odds word on the gated row), arrival line and warning, plate, *Once*-only tickets, the cap after 26 taps, *Visiting, were we.*, *Put on the train*, *Barred · until Tuesday 00:28* | ✅ (m7, n4) |

### 2.5 The paper, quarters, migration, hooks

| # | Check | Result |
|---|---|---|
| P1 | Every risk deck × every real mission title × every `{how}` × every opponent × every record fill stays ≤ 200 and leaves no `{…}` | ✅ |
| P2 | `{marksLine}` reads *One mark* and never *1 marks*; the record-up decks use it; *On File* in title case | ✅ |
| P3 | The fallback stay (*a word with the police*, *no reason was given.*), *cells* not *seen* after a night inside, the desk rows (developer tests, re-run) | ✅ |
| Q1 | Quarters at Levels 5 / 6 / 10 for every city; the teaser; the view rule (developer, re-run); the overview and a quarter at 7 sizes × 3 cities at L5 and L6 in the app: 3 outlines, names never overlapping or covered, each label inside its own outline, lock lines, the teaser with Close only, the bar with a locked Sidings | ✅ (n5) |
| Q2 | Slice 4's view at Levels 1–5 at all 7 sizes: the Mill only, no bar, the plate name to the overview | ✅ |
| D1 | Migration 007 over `today` null / missing, no `journeyDeck`, a never-006 character; the 006 → 007 chain; two starts at once; second run byte-for-byte; every migrated character validates | ✅ |
| K1 | Without `E2E_TEST_HOOKS`: every dev-panel risk action, the status and the clock 404; the street hooks stay off and take nothing | ✅ |
| K2 | The dev panel's risk buttons, each against `/api/test/dev/status` and the screen | ✅ (n2, n3) |

### 2.6 Screens, accessibility, content (screens §1–§12)

| # | Check | Result |
|---|---|---|
| A1 | Targets ≥ 44 px on every new screen at 360, 375, 390, 812×375, 1440 | ⚠️ **m9** (one) |
| A2 | No sideways scroll, every screen, every size | ✅ |
| A3 | Modals and sheets ease in (`place-sheet-in` / `place-rise-in` 300 ms); under reduced motion a 120 ms fade, no slide; `ease-dim/card/sheet` used | ✅ |
| A4 | No odds maths: no digits in the briefing or the run-in rows, no *chance / roll / difficulty*, every % a reward or opinion | ✅ |
| A5 | Vocabulary: no *encounter, bluff, bribe, flee, approach, criminal record, jail, hospital, surveillance, sabotage, hostile, sergeant, torch, uniform*; police are *a constable*, *the duty officer* | ⚠️ **m1**, n11 |
| A6 | Art at full size: six opponents, the duty officer (blank shield), the matron, Kessler, five mission scenes, `news-strike`, `jail-cell`, `hospital`: no symbols, no salute; the speech scene redrawn (speaker points down, caps waved, hands clapping) | ✅ (n8) |
| A7 | Keyboard: everything reachable; Escape closes the briefing spending nothing; Escape does not close the run-in; focus trapped; the result focused on Again | ✅ · ⚠️ **m8** (focus after Escape) |
| A8 | Accessible names on every button, link, dialog and progress bar; the HUD labels | ✅ |
| A9 | Contrast ≥ 4.5:1 on new text (risk line *Dangerous* 7.43, HUD *Wanted* 8.55 …); only disabled controls under | ✅ |
| A10 | Screens §10 on 375×667: run-in card and *Leave it to luck* without scroll; held screens above the fold; HUD +35 px with Heat and Health on 360 | ✅ |
| A11 | The briefing's first two rows above the button | ⚠️ **m2** |
| A12 | The mission ticket at most four lines | ⚠️ **m3**, n1 |
| A13 | Double taps (confirm, Again, Pay row, Walk out, Discharge, the cell tap, Pay bail, rival Once, strike-off): one spend each | ✅ |
| A14 | Short sessions: a first mission 3 taps + Continue, a repeat 1 + Continue, a run-in 1, bail / walk out / discharge / strike-off 1 + Continue; one result modal each | ✅ |
| A15 | Content: 22 missions (6/6/6/4), Energy and difficulty from the rules (Irongate's Level-10 ones 20), illegal ⇔ Rank 3 and a target, HQ targets, pools; STR, INT and AGI ways in every home city; briefings ≤ 380 / 4 sentences, texts ≤ 240 / 4, way titles ≤ 60, hints ≤ 90; 35 new tickets; blurbs ≤ 200; opponents against GDD §20.2 | ✅ |

### 2.7 Regressions (slices 1–4)

| # | Check | Result |
|---|---|---|
| G1 | Every existing Vitest suite (rules, content, db, ui, server) and the whole e2e suite, before and after the QA files | ✅ (§6) |
| G2 | The capital overview at rest at 1920, 1440, 812×375, 667×375, 390, 375, 360: five names, none covered or overlapping (slice-4 M1) | ✅ |
| G3 | Tram chips 44 px, no overflow, no name / standing overlap at 360, 812×375, 667×375 (M3) | ✅ |
| G4 | The capital ballot at 375×667 and 360×640: a whole name above the CTA (m6) | ✅ |
| G5 | The Me tab's residence row 44 px (m8); `landscape.spec` in the full suite | ✅ |

---

## 3. Bugs, ordered by severity

### Major

#### M1. One mission tap sent twice with the same key can start twice: Energy and Heat charged twice, the mission paid twice

- **Where:**
  - `apps/server/src/services/missionService.ts` `startMission` (l. 151–258): `stored()` is looked up only before the transaction, and the seed is drawn fresh inside it (`randomBytes`, l. 187).
  - `apps/server/src/services/txn.ts` `inTransaction`: the driver re-runs the callback on a `TransientTransactionError` (a write conflict with the copy that committed), and the re-run never looks the key up again.
  - The two branches write the key into **different collections**: the final result into `actionLogs`, a run-in into `encounters` (`streetService.startRunInInTx`). Each is unique on `{ characterId, idempotencyKey }`, but neither sees the other.
  - The same path exists for a tier-1 tap on rival ground (`actionService`, its run-in branch).
- **Steps** (`apps/server/test/qa.slice5.street.test.ts`, hooks off as in production):
  1. A Rank-3 Collective member at Heat 60 in Coalport.
  2. Six copies of `mission.start` for the Far Bank posters with **one** idempotency key, at once.
  3. Repeat for 24 players.
- **Expected:**
  - ADR 0002 and CLAUDE.md engineering rule 2: every game action is idempotent.
  - ADR 0032 *Consequences*: "a concurrent start whose two copies take different branches … still commits once, because both write the character under the version guard".
- **Actual:**
  - Typically one or two players in 24 end with **both** an `actionLogs` row (a finished Success) **and** a pending `encounters` row under the same key.
  - Energy is down 20, not 10, and Heat is 72, not 66.
  - One copy answered with the run-in modal, five with the result.
  - The stray run-in then blocks every act until it is answered, and its resolution pays the mission a second time.
  - Seen on the rival-ground tap too (24 visitors × 6 copies).
  - The version guard does not help: the losing copy's retry re-reads the new version and writes again.
- **How a player meets it:** `useMissionStart` and `usePerformAction` retry up to twice **with the same key** on a network error (`retry: failureCount < 2 && isNetworkError`). On a phone, a dropped connection while the first request is still running on the server sends exactly this concurrent copy. A double tap on the button cannot (the client blocks it).
- **Why the phase-B fix missed it:** with the hooks on, a forced run-in sends every copy down the pending branch, so the encounter's unique index catches the duplicate. Only free rolls can take different branches.
- **Fix idea:** inside the transaction, before any write, look the key up in **both** collections with the session and return the stored answer if present (or throw so `runKeyedAction`'s `stored()` answers). A seed derived from the key is not enough on its own: the re-read state (Heat +6) can change the run-in chance and flip the branch. An alternative is one key reservation row written by both branches.
- **Tests:** `bug(...)` ×2 in `apps/server/test/qa.slice5.street.test.ts` (expected fails; `QA_SHOW_BUGS=1` shows them failing on `expected 2 to be 1`).

### Minor

#### m1. The place sheet's kicker reads *HOSPITAL* and *JAIL*; Ashford's infirmary blurb says *hospital*

- **Where:**
  - `packages/content/src/data/copy.ts` l. 23–24 (`KIND_LABELS.hospital: 'Hospital'`, `jail: 'Jail'`), printed by `packages/ui/src/components/Sheets.tsx` l. 139.
  - The County Infirmary's blurb, `packages/content/src/data/cities/ashford.ts` l. 571: *The county hospital in its walled garden…* (design §2.3 #10's own text).
- **Steps:** open the Infirmary or Harbour Police sheet in any home city.
- **Expected:** screens §1 bans *hospital* and *jail*; the player reads *the infirmary* and *the cells*.
- **Actual:** *9 · HOSPITAL*, *10 · JAIL* at every size, in all three home cities. The developer's vocabulary sweep does not read `kindLabel` or the place blurbs.
- **Fix:** *Infirmary* and *Police* as the kind labels; the designer rewords the blurb (*The county infirmary in its walled garden*).
- **Tests:** `test.fail` in `apps/client/e2e/qa.slice5.spec.ts` (the kicker); `it.fails` in `packages/content/test/qa.slice5.test.ts` (the blurb).

#### m2. The longest briefings put the second way under the sticky button on 375 × 667

- **Where:** `packages/ui/src/components/Missions.tsx` l. 401 (`max-h-[72dvh]`).
- **Expected:** screens §10 and tech §12.4: the title, the text and the first two rows sit above the button on 375 × 667.
- **Actual** (row 2's bottom against the confirm's top):

  | Briefing | Characters | Size | Overlap |
  |---|---|---|---|
  | Ashford Wharf | 342 | 375 × 667 | 11 px |
  | Irongate Station Buffet | 362 | 375 × 667 | 18 px |
  | Far Bank posters | 272 | 360 × 640 | 16 px |
  | Ashford Wharf | 342 | 360 × 640 | 30 px |
  | Irongate shelters | — | 360 × 640 | 37 px |

  The T23 deviation says the fix covered "the Far Bank's 360-character briefing"; that briefing is 272 characters, and the 342–362 ones still fail.
- **Fix idea:** a 76–80 dvh sheet on short phones, or the hint folded to one line under 700 px tall.
- **Test:** `test.fail` in `qa.slice5.spec.ts` (Ashford Wharf).

#### m3. A mission ticket runs to five to seven lines

- **Where:** `Missions.tsx` l. 162–172 (one tags string, mono 10.5 px) and l. 268–272.
- **Expected:** screens §10: a mission ticket is at most four lines (title, tags, risk line).
- **Actual** (title + tags + risk line):

  | Ticket | 360 px | 1440 px |
  |---|---|---|
  | Customs House watch | 1 + 5 + 1 = 7 | 1 + 3 + 1 = 5 |
  | Far Bank posters | 2 + 3 + 2 = 7 | — |
  | Shipyard launch | 1 + 3 + 1 = 5 | — |

  The tags line carries the type, the odds word, *First day in Coalport · better odds*, the Issue tag and the record tag in one run. The spec's Oswald caps 10 px are mono 10.5 px in the build (a nit).
- **Fix idea:** the type label and the odds word on the tags line; the other tags as chips or under *Missions*; Oswald caps as specified.
- **Test:** `test.fail` in `qa.slice5.spec.ts`.

#### m4. The run-in result's reason line does not say where to train

- **Where:** `apps/client/src/features/street/RunInGate.tsx` l. 164: its `<ResultModal>` gets no `trainingPlaces` (`city.tsx` l. 506–509 builds them; the gate doesn't pass them).
- **Expected:** screens §4.3: *Your Agility is low for this. Raise it at Harbour Quays.*
- **Actual:** *Your Agility is low for this.* and nothing more after a failed Run. A mission's own reason line does name its place.
- **Test:** `test.fail` in `qa.slice5.spec.ts`.

#### m5. A first offence of three marks shows the *One mark* card

- **Where:** `packages/ui/src/components/ResultModal.tsx` l. 1204 (`if (rec.first)` always pushes `copy.risk.recordCard`); `copy.ts` l. 1087–1088.
- **Steps:** a Level-10 Collective member, Heat 60, in Duskwall → Beacon House, *Spike the duplicator*, caught.
- **Actual:** *The police took your name · 3 marks · Repeat offender*, then *ON FILE · One mark. It fades in a fortnight … Iron from missions is down a tenth*. Both statements are wrong for this player: the marks are serious and never fade in slice 5, and the ticket now reads −20 %.
- **Expected:** screens §11 has only the *On file* card. The card should match the level reached (or say what the record is), and not promise a fade to a moderate or serious mark.
- **Owner:** designer (the two missing cards) and developer.
- **Test:** `test.fail` in `qa.slice5.spec.ts`.

#### m6. The release modal says *Heat is down to 25* when Heat went **up**

- **Where:** `copy.ts` l. 1195 (`released.body`).
- **Steps:** Heat 0, a police run-in lost on the Shipyard speech → *To the cells* → *Pay bail*.
- **Actual:** knock-on *Heat 0 → 25 · Noticed* over the body *Heat is down to 25…*.
- **Why it matters:** this is ordinary play. A police loss sends a *Cool* player to the cells (design §23.1 #3), and the rule (GDD §19.2, "Heat is 25 whatever it was") then **raises** their Heat.
- **Options:** neutral copy (*Heat is 25 and the duty officer has your page*), or the rule min(Heat, 25), which is a GDD change.
- **Owner:** designer.
- **Test:** `test.fail` in `qa.slice5.spec.ts`; the server test pins the rule as built (`qa.slice5.held.test.ts`).

#### m7. On phones under 700 px tall, rival ground's pressure line and the *orders elsewhere* line are hidden

- **Where:** `apps/client/src/routes/city.tsx` l. 731 (`[@media(max-width:639px)_and_(max-height:700px)]:hidden`).
- **Expected:** screens §8.3 puts *Your work here draws from the Vanguard's morale · 1.3 of 2.0 points left today* on the plate. The design says every rival-ground rule is read before the tap.
- **Actual:** at 375 × 667 and 360 × 640, neither line is visible; at 390 × 844 and sideways they are. No Phase C deviation records it.
- **Test:** `test.fail` in `qa.slice5.spec.ts`.

#### m8. Escape on the briefing drops keyboard focus on the page

- **Where:** `Missions.tsx` l. 395 (the Radix dialog does not return focus to *Choose a way*).
- **Steps:** Tab to *Choose a way*, Enter, Escape.
- **Actual:** `document.activeElement` is `<body>`. The place sheet stays open, and nothing is spent (correct).
- **Test:** `test.fail` in `qa.slice5.spec.ts`.

#### m9. The Me tab's *Heat* label is a 31 × 44 px target

- **Where:** `packages/ui/src/components/Street.tsx` l. 170–176.
- **Notes:** the same pattern as slice-4 m8. Every other new control measured is at least 44 px (the HUD's Heat line is 112 × 44).
- **Test:** `test.fail` in `qa.slice5.spec.ts`.

### Nits

| # | Where | What |
|---|---|---|
| n1 | `Missions.tsx` l. 53, 269 | A wrapped risk line (360, 375) is 33 px high in a 29 px row: 1.5 px over the dotted rule, 2.5 px into the border |
| n2 | `apps/client/src/features/dev/DevPanel.tsx` | *Decide now* shows only while a run-in is pending, but the run-in modal covers the dev toggle then, so the button is never clickable. The route works. Dev tool |
| n3 | Dev panel *Take me to…* | The status moves to Duskwall; the screen stays on `/city/coalport` until you navigate. Dev tool |
| n4 | The rival-ground receipt | Opinion reads *−0.075 %* (a `%` after points); the Party XP part reads *+6 and Rival ground +3*. Screens §4.3: *rival ground +3*, *−0.20* |
| n5 | `CityMap` frame fitting | At rest one Harbour pin is under an overlay at every size: the Infirmary under the plate card on desktop; the Infirmary and Harbour Police sideways; the Far Bank on phones. On the Mill at L6 sideways, 3–4. All come clear with a drag (review 3 allows it) |
| n6 | `rules/runIn.ts` `resolveRunIn` | *Won at full strength* is judged before the run-in. After a failed Run (hurt before the fight) a win still gets +10 %. The design says "if you were at full Health" without saying when. Recorded in `qa.slice5.rules.test.ts` |
| n7 | Content | *marks* as money: the constable's *Three hundred marks is the going rate* and the checkpoint lamp's *Thirty marks*, on the same screens as *1 mark on your record*. The price shown is Iron |
| n8 | `opponents.ts`, art | The enforcer *steps off the kerb in a good coat*; his portrait is a flat cap and a rough work jacket (the alt text follows the picture). The picket's copy has armbands; the picture has none |
| n9 | `copy.risk.did` | Covered under §7's wording calls |
| n10 | GDD §6.1 (*100, +5 per level*), design §9.1 (*100 + 5 per Level (Level 6: 125…)*), tech §6.3, ADR 0033 (*100 + 5 × Level*) | The code's *+5 for every Level after the first* (the phase-A deviation) is the only reading that gives the pinned 125 / 145. The documents should say so |
| n11 | Content | Irongate's rally briefing has *a policeman* (the guard's rule is *the duty officer* or *a constable*); *Lift the district roll* uses *roll* in its register sense (fine in English; noting it for the guard) |
| n12 | Copy, the luck reason line | *Bad luck. The odds were good; it just didn't come off. Try again.* appears after a failed pay-off ("try again" a run-in?) and on a *Fair odds* cell tap ("good" against the *Fair* word). The cap line *The town has had enough today · no opinion* sits on the tags line beside *opinion +50 %*, not on its own line (screens §8.3) |

**Design deviations seen, not filed as bugs** (for the designer's list):

- An Energy-short mission keeps a disabled button with *Needs 10 Energy · ready at 12:22* under it (screens §4.1: no button, the reason in the odds slot).
- The record lock at a court shows greyed *Once* / ×3 buttons with *Not with your record* under each ticket (below the fold on 375).
- A later-edition teaser repeats its blurb in the content `teaser` line instead of *Level 6 opens it; you are Level {n}.* (which is right for an edition lock).
- Briefings run 260–362 characters, 6–8 lines on a phone (design §23.8 settled ≤ 380, so this is accepted).

---

## 4. GDD and the design against the code

| Topic | GDD / design says | Code does | My view |
|---|---|---|---|
| ADR 0032 *Consequences*: two copies of one start | "still commits once … under the version guard" | Can commit twice across the two collections (M1) | **The ADR's rule is right; the code doesn't meet it.** Also correct the ADR's reasoning (the driver re-runs the callback) |
| §6.1 Health max | *100, +5 per level* · design *100 + 5 per Level (125 at 6)* · tech/ADR *100 + 5 × Level* | 100 + 5 × (Level − 1) | **Code right** (matches the pinned 125 / 145); the documents' formula to be fixed (n10) |
| §19.2 Heat after a release | "Heat reset to 25", whatever it was | 25, also up from 0 | **Code follows the GDD**, but with a police loss on legal work a *Cool* player's Heat rises; the copy says "down" (m6). Designer to decide rule or copy |
| §11.2 the caught check's Heat after a failed *Pay them off* | "Heat as it stands after the mission's own gain" | Adds the failed pay's +10 too (`missionService` l. 336) | Defensible reading (the attention drawn counts, §6.2); worth a line in the design |
| §20 *Won at full strength* | "if you were at full Health" | Health before the run-in, even after a failed Run's damage | Ambiguous; designer (n6) |
| Screens §1 banned words | no *hospital*, *jail* | The kind labels and one blurb (m1) | **Screens right** |
| Screens §4.3 the reason line | names the place to train | Not in the run-in gate's modal (m4) | **Screens right** |
| Screens §8.3 the pressure line | on the plate | Hidden under 700 px tall (m7) | **Screens right**, or record it as a deviation |
| Screens §10 the ticket ≤ 4 lines; the briefing's two rows above the button | as written | 5–7 lines (m3); the longest briefings fail (m2) | **Screens right** |
| §14.12 rival ground's opinion with a named target that is not the home party | "against the home faction" | A mission keeps its own target (an Alliance visitor's Far Bank posters hit the Vanguard in Coalport, uncapped); a speech switches to the home party | Ambiguous for missions with named targets; one sentence in design §11.2 would settle it |

Everything else agrees, number for number:

- the Heat sources, states, cooling and the residence rate;
- the caught check, the marks, fading, escalation and the strike-off;
- the sentence, bail and its multipliers;
- the infirmary's 30 / 20 minutes / 5 + 100 / half;
- §20.1's four rows, the scaling and the pool (police half from *Noticed*);
- the tier-2 rates, the ladder (Irongate 20) and the record's Iron;
- rival ground's +4, ×2, ×1, +50 / +75 % and the 2-point cap;
- deportation and the 24-hour bar;
- the hostile deck's order and gate;
- quarters by Level;
- the five-minute decide window.

---

## 5. Tests added (not committed)

| File | Tests | What it covers |
|---|---|---|
| `packages/rules/test/qa.slice5.rules.test.ts` | **44** | GDD-parsed constants (§6.1, §6.4, §11.2, §19.1–§19.2, §20); Heat against an exact integral (3,000), write chains (1,000), `heatEta` across a strike day; Health (2,000); the record (2,000 + 2,000), escalation 0–12 days per type; the caught check (5,000 + 40,000 rolls); run-in chance (5,000), the odds grid for every opponent, the pool (20,000 × 12), `resolveRunIn` (10,000); design §4.2's table parsed; Rested, Issue, record Iron, the ladder; the rival row against +4 difficulty; sentence and bail for every case; opinion against (5,000) and a day of visitors (200); a mission end to end; n6 recorded |
| `packages/content/test/qa.slice5.test.ts` | **17** (1 `it.fails`) | Opponents against GDD §20.2; the 22 missions against the rules (Energy, ladder, target, audience, pools, a STR/INT/AGI way per city, lengths); the 35 new tickets and blurbs; every risk deck × every real fill ≤ 200; `{marksLine}`; vocabulary and content policy over missions, places, quarters and alt texts; m1's blurb (`it.fails`); n7 recorded |
| `packages/db/test/qa.slice5.db.test.ts` | **1** | Migration 007 over odd slice-4 shapes, the 006 → 007 chain, two starts at once, byte-for-byte second run, schema validation |
| `apps/server/test/qa.slice5.street.test.ts` | **12** (2 expected fails, `bug()`) | M1 ×2 (missions, rival tap); hooks-on copies; two keys; `KEY_REUSED`; choose under load; same key ×5; another player's encounter; close while pending; three days away; luck never pays; the window |
| `apps/server/test/qa.slice5.held.test.ts` | **12** | Bail ×5 keys and ×5 one key; walk out vs discharge; Rested never spent; strike-off races; while held; Heat 25 after release; a late read; the residence rate; deportation of a capital resident and the bar's edge; away three days after a deportation |
| `apps/server/test/qa.slice5.rival.test.ts` | **7** | A disruption in Duskwall; Hot and caught there; the cap by a mission; six visitors at once; the checkpoint at Heat 90; the list on projected Heat; the infirmary on rival ground |
| `apps/server/test/qa.slice5.hooks.test.ts` | **1** | Every dev-panel risk action, the status and the clock 404 without `E2E_TEST_HOOKS`; the street hooks inert |
| `apps/client/e2e/qa.slice5.spec.ts` | **19** (9 `test.fail`) | Targets and no side scroll at 360 × 640 and 812 × 375 on the quarter, sheet, briefing, run-in, result, cells and ward; the run-in at 375 × 667; double taps (confirm, Again, Pay, bail, strike-off); the run-in and the briefing by keyboard; no odds maths; the L6 overview names (Coalport, Ashford) at 360 × 640 and 667 × 375; the capital overview at 1440 × 900. Expected fails: m1 (kicker), m2, m3, m4, m5, m6, m7, m8, m9 |
| `apps/client/playwright.config.ts` | — | A `qa-risk` project (Pixel 7) after `rival`; `qa.slice5.spec.ts` ignored by `phone` |

Every expected fail was run once as a plain test and failed for its bug's reason:

- the server's `bug()` and the e2e `test.fail(!process.env.QA_SHOW_BUGS, …)` with `QA_SHOW_BUGS=1`;
- the content `it.fails` with its marker removed.

When a bug is fixed, its test turns red: that is the reminder to drop the marker.

The scratch scripts (`s1`–`s16`, `lib.cjs`, `reach.cjs`) and the screenshots (`shots/`) are in the session's scratchpad, outside the repo.

---

## 6. Command output (real runs)

| Command | Result |
|---|---|
| Baseline at `de4417d`, clean worktree, before QA files: `pnpm art:check && pnpm turbo lint typecheck test build --force` | exit 0 · `art:check ok: 76 assets, 18.76 MB` · **20 successful, 20 total** · rules 40 files / **467 passed** · content 18 / **251** · db 14 / **70 + 1 expected fail** · ui 14 / **319** · server 46 / **475 + 2 expected fail** |
| Baseline `E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e` | exit 0 · **105 passed (15.2 m)** |
| In the working tree with the QA files, per package (`vitest run`) | rules 41 / **511 passed** · content 19 / **267 + 1 expected fail** · db 15 / **71 + 1 expected fail** · server 50 / **505 + 4 expected fail** (2 of them M1); `qa.slice5.street` run three times in a row: 10 passed + 2 expected fail each time |
| The client sub-agent's run: `npx playwright test --project=qa-risk --no-deps` (own servers on 3501 / 4373) | **19 passed (2.6 m)**: 10 plain, 9 expected fails; with `QA_SHOW_BUGS=1` each of the 9 failed for its bug |
| **Final, clean worktree of `de4417d` plus the QA files:** `pnpm art:check && pnpm turbo lint typecheck test build --force && E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e` | **exit 0**. `art:check ok: 76 assets, 18.76 MB` · turbo **20 successful, 20 total**: rules 41 files / **511 passed** · content 19 / **267 passed + 1 expected fail** · ui 14 / **319 passed** · db 15 / **71 passed + 1 expected fail** (slice-3 m6) · server 50 / **505 passed + 4 expected fail** (2 of them M1) · `pnpm e2e` **124 passed (17.6 m)**, including the 19 `qa-risk` tests (9 failed as expected) and the two older expected fails (slice-3 m4, slice-4's five rows above the CTA). The first try of this run stopped at `lint`/`typecheck` on three errors in my own QA files (an `import type`, a union-typed card text, a possibly-undefined `opinion`); fixed in the tests and re-run |
| Along the way | My own first assertions that were wrong, fixed in the tests (not the code): a home faction already under 50 cannot lose to the floor; roll 60 at AGI 19 is a Success; a forced roll of 100 loses only if luck picks Fight (the test now makes the player strong); `HELD` is a legitimate answer to a second key after the first was taken in; the nation card's id field is `cityId` |
| Clean-up | My private API (3401) and client (5373) and the e2e servers stopped; no port of mine listening. The user's `pnpm dev:mem` untouched. The scratch worktree `E:\Projects\ironGateCity-qa5` removed. Nothing committed |

**Not verified here:**

- a real phone or iOS Safari;
- a screen reader;
- a real flaky network (M1 was reproduced by concurrent same-key calls, which is what the client's retry sends);
- Agenda across a real midnight with a deportation journey;
- human feel (that is the playtest).

---

## 7. Wording calls left for the designer

Judged as a player would, on screen.

1. **The record tag *Your record · −10 % Iron***: it doesn't read well.
   - In the tag run it follows *Long shot · Strength*, so *Your record* reads like another odds factor.
   - On a phone it splits across lines (*Your | record · −10 % Iron*).
   - **Suggest** the level word: *On file · −10 % Iron* (*Repeat offender · −20 % Iron*), or *Record: −10 % Iron*.
2. **The risk line wrapping below 390 px**: still clear, but the orphaned last word looks broken.
   - At 360 and 375, *Heat +24 · Dangerous · if caught, three marks on your* wraps to leave *record* alone on its line, and even *a mark* wraps.
   - **Suggest** breaking only at the *·* (the marks phrase kept whole), or a shorter phrase: *if caught: three marks*. Fix n1's overflow with it.
3. **The run-in *did* sentences** (`copy.risk.did`):
   - **These work:** *You ran.*, *You talked your way out.*, *You paid them off.*, each followed by the opponent's line. *You fought. You won.* is choppy but clear; *You fought and won.* reads better.
   - **These read wrong:**
     - *they* for one man. *You tried to run; they were faster. You fought. You lost. The setts come up to meet you… his boots.* Four of the five party opponents and the constable are one man, so *he* (or the opponent's own pronoun in content) is needed.
     - The same goes for *they weren't having it* and *they took it and came on anyway*. The latter is also unclear: did they take the money and fight anyway?
     - *You left it, so luck chose.* (the auto case) doesn't say what was left. **Suggest** *You didn't answer, so luck chose.*
     - Chained with a failed row, luck runs to four or five short sentences: *You left it to luck. You tried to run; he was faster. You fought. You lost.* **Suggest** merging: *Luck chose to run; he was faster, and you lost the fight.*

---

## 8. Playtest checklist (for the whole-game review)

The slice question: **is risk exciting rather than punishing?**

### Before the playtest

- [ ] Fix **M1** (a lost network reply on a phone can charge a mission twice).
- [ ] Fix **m1** (*Hospital* / *Jail* on every infirmary and police sheet).
- [ ] Settle **m5** and **m6** (the record card and *down to 25*): wrong statements in the slice's two key modals.
- [ ] Settle §7's three wording calls.
- [ ] Testers in **different factions**: rival ground needs a home party to press against, and the cap is per city across visitors.
- [ ] Use the dev panel: *Level 6*, *Rank 3*, *Level 10*, *Heat* 30 / 60 / 80, *Record* 2 / 4 / 7, *Next run-in* (each opponent), *Next caught*, *Cells now*, *Infirmary now*, *Release now*, *Take me to…*, *Lift the bar*. *Decide now* is reachable only through the API while a run-in is pending (n2); the five-minute wait works as well.

### Watch live

- [ ] **The second quarter:** do they notice *The Harbour Opens*, find the overview, the quarter bar, the teaser? Is the locked Sidings a pull or a puzzle?
- [ ] **The first mission:** do they read the briefing or tap straight through? Do they notice the odds word on each way, and the *Again* on the second time? On a short phone, do they see the second way (m2)?
- [ ] **The first Failure:** does it read as a fair result with a reason, or a punishment?
- [ ] **Heat:** do they notice it on the HUD after the first watch or posters? Do they read the *NOTICED* card? Do they plan around *Cool by*?
- [ ] **A run-in:** do they read the opponent's line? Which row do they choose, and why? Do they use *Leave it to luck*? Do they understand the story in the result's run-in block (§7.3)?
- [ ] **Closing on a run-in:** do they come back within five minutes to the same modal, or later to luck's result? Does that feel fair?
- [ ] **The infirmary and the cells:** do they pay or wait? Do they close the game? Do they come back the next day? Does the *Heat 0 → 25* after a police loss confuse them (m6)?
- [ ] **The record:** do they notice the Iron tag (§7.1)? Do they strike a mark off for 30 Political Capital, or wait for the fade?
- [ ] **Rival ground:** do they board *Rival ground* at Level 10? Do they understand *Papers, please*? On a short phone do they know about the cap without the pressure line (m7)? Do they come back after a deportation?

### From the report (`pnpm report:playtest`, the risk section)

- [ ] Missions per type per day and the share of players who took one, legal against illegal.
- [ ] Run-ins: choices (player, luck, auto) and **the loss rate on auto-resolve** (the design's number to watch).
- [ ] The cells and the infirmary: minutes waited against paid, and **the share of players taken in who came back the next City Day**.
- [ ] Rival-ground trips, Party XP there against home, the cap reached per home city, deportations.
- [ ] Look for duplicate starts: two `actionLogs` / `encounters` under one key would be M1 in the wild.

### Questions afterwards

1. "Did you choose an illegal mission again after a bad run-in?"
2. "Did *Leave it to luck* feel fair?"
3. "Did the cells feel like a story or a penalty?"
4. "Would you go back to rival ground?"
5. "Was anything you lost a surprise?" (The answer should be "nothing owned, only time".)

### Answer the question

- **Yes**, if:
  - most testers who reach Rank 3 try an illegal mission more than once;
  - most testers who are taken in come back the next day;
  - auto-resolve losses are not the majority of losses;
  - testers describe the run-in or the cells as a story.
- **No, and where:**
  - If testers stop after the first run-in, look at the run-in bases and luck's loss rate (economy §19.11's levers).
  - If they never risk anything, look at whether the tickets' risk lines read as warnings rather than odds (m3, §7.2).

---

## 9. Fix round (5 Oct 2026, developer)

The designer's decisions are in `docs/design/slice-5-fixes.md`. The designer also changed the GDD and the slice 5 design documents to match. The code side is recorded in the ADRs and in the *Fix round* part of the tech design's *Deviations*.

### 9.1 Each bug

| # | Status | What changed |
|---|---|---|
| **M1** | **Fixed** | **Cause:** after a write conflict (`TransientTransactionError`), the MongoDB driver runs the transaction callback again on a fresh snapshot. `runKeyedAction` looked the key up only before the transaction. The copy that lost re-read the new character version and passed the version guard. It drew a fresh seed and could take the other branch. Its row then went to the other collection (`actionLogs` or `encounters`), where neither unique index could see the first. **Fix:** every run of a keyed transaction calls `assertKeyFree` (`apps/server/src/services/keyGuard.ts`) before it writes anything. This check looks the key up in `actionLogs`, `encounters` and `requestLogs` within the session. On a hit it throws `KeyTaken`: the transaction aborts and the stored answer is returned. A key held by a different act is refused with `KEY_REUSED`. The check runs in both `runKeyedAction` and `withRequestKey`. **Seeds:** every keyed act that rolls now gets its seed from `keySeed(characterId, key)`, an HMAC with a secret drawn once per process. This covers missions, tier-1 actions and rival taps, `held.act`, the ambition check, and `travel.board`'s card. **Audit:** every keyed path goes through one of the two wrappers: actions, missions, rival taps, held taps, the ambition check, `encounter.choose`, travel (board, choose), residence, jobs, stats, council, bail, walk out, discharge and the strike-off. Only the two `runKeyedAction` paths with two branches (missions and rival taps) could charge twice. In the `withRequestKey` paths, every branch writes the same `requestLogs` row, so its unique index already caught a duplicate. **ADR 0032**'s claim is corrected. **Proof:** QA's two M1 tests are now plain `it`. `vitest run test/qa.slice5.street.test.ts -t M1` passed **20 times in a row** (2 passed each run). |
| m1 | Fixed | `KIND_LABELS` now reads *Infirmary* and *Police*. Ashford's blurb now reads *The county infirmary…*. The content vocabulary test also checks the kind labels. |
| m2 | Fixed | The schema caps briefings at 300 characters. The seven long briefings use the designer's new texts. The briefing sheet is 80 dvh on phones under 700 px tall. |
| m3 | Fixed | The tags line holds only the type and the odds: one line across the ticket, in Oswald caps 10 px. In the middle column it wrapped at 360 and 390 px. Every other tag is a chip on a line of its own, shown only when there is a chip. The cap line has its own row. Each segment of the risk line stays whole. QA's test now counts the chips line too, and allows five lines when the title takes two. The Customs House ticket is 4 lines at 360 px. |
| m4 | Fixed | `RunInGate` and the held screen's tap result now pass `trainingPlaces`, built by a shared `trainingPlacesOf`. |
| m5 | Fixed | A card shows on the first crossing into each level (`firsts.onFile`, `repeat`, `notorious`). An existing `firsts.mark` counts as *On file*. There are five cards; the fade clause shows only when every live mark is minor (`record.allMinor`). |
| m6 | Fixed | The release body now reads *Heat is 25 and the duty officer has your page…*. The rule itself is unchanged. |
| m7 | Fixed | The pressure line shows at every size. Under 700 px tall the plate folds the morale and Heat lines instead. |
| m8 | Fixed | The briefing remembers which control opened it and gives focus back to it on close. Radix returns focus only to a `Dialog.Trigger`. A second bug showed in the production build: the panel-layout place sheet's Escape layer sometimes sat above the briefing's, so Escape closed the sheet under the briefing. QA's test failed 8 times in 10 on this, against the build only. While the briefing is open, a close request to the sheet now closes the briefing instead. |
| m9 | Fixed | The Me tab's Health, Heat and record labels are `min-w-11`, so each target is 44 × 44. |

**Nits:**

| # | Status | What changed |
|---|---|---|
| n1 | Fixed | The risk row grows when its line wraps, and it breaks only at a dot. |
| n2 | Fixed | While a run-in is pending, the dev toggle and panel sit above the modal, so *Decide now* can be reached. |
| n3 | Fixed | *Take me to…* now navigates to the city. |
| n4 | Fixed | The opinion-against row shows points, with no `%`. Slice 5's receipt parts are lower case and joined with *·* (*+6 · rival ground +3*). |
| n5 | Open | Not in this round. Review 3 allows it (a drag clears it). |
| n6 | No change | The design now states the code's rule. |
| n7 | Fixed | The constable and the checkpoint lamp now say *Iron*. |
| n8 | Fixed | The enforcer's line now has the flat cap, and the picket's has the placard and *the picket*. |
| n9 | Fixed | See the *did* sentences below. |
| n10 | Fixed | The formula now reads 100 + 5 × (Level − 1) everywhere: the GDD and the design (by the designer), ADR 0033, and the tech design's §6.3 and §7 code. |
| n11 | Fixed | The rally briefing now says *a constable who looks bored*. |
| n12 | Fixed | A run-in's reason line now goes by the band of the row that failed. *Good odds* gives *Bad luck… didn't come off.*, *Fair odds* gives *The odds were only fair.*, and a *Long shot* names the stat. It never says *Try again*. The cap line has its own row. |

**§7's wording calls:**

- **The record tag:** *On file · −10 % Iron*, with the level word.
- **The risk line:** its segments don't break.
- **The *did* sentences:** the designer's full set, using `opponents[].pronoun`. The server sends the pronoun as `opponent.pronoun` and each step's `band`.

**The later-edition teaser** (§3's list of deviations): the teaser sheet now reads *Opens with a later edition · {teaser}*. The map pin and the Quarters list keep the short lock line.

### 9.2 Expected fails

- **Flipped to plain tests, all slice 5's:**
  - 2 `bug()` tests in the server;
  - 1 `it.fails` in content;
  - 9 `test.fail` in `qa.slice5.spec.ts` (the spec's `bugs` switch is removed).
- **Left, all older and not touched here:**
  - slice-3 m6 in db;
  - two slice-3 tests in `qa.slice3.server.test.ts`;
  - slice-3 m4 and slice-4's five rows in e2e.
- **QA's tests changed to the decided copy:**
  - the briefing bound is now 300;
  - the *did* lines: *You paid him off*, *Luck chose to …*, *You didn't answer, so luck chose to …*;
  - the receipt part: *rival ground +*;
  - the m3 count now includes the chips line.
- **Developer tests changed with them:**
  - `slice5.headlines` produces the new §11 strings;
  - `slice5.test.tsx` checks the chips and the *did* lines;
  - `slice5.views` checks the record tag's `level`;
  - the chapter test forces its roll through `keySeed`.

### 9.3 New tests

- **`apps/server/test/slice5.fixround.test.ts`, 6 tests:**
  - the per-key seed;
  - `KEY_REUSED` for a mission on a key a strike-off used, with nothing written;
  - the same key on a pending run-in;
  - three serious marks give the *Repeat offender* card;
  - *On file* shows only once, and an existing `firsts.mark` counts;
  - the picket's *they* and a step's band.
- **`packages/ui/test/slice5.fixround.test.tsx`, 13 tests:**
  - the record cards;
  - the reason line by band, and the training place;
  - the receipt;
  - the ticket's lines, chips, cap row and whole risk-line segments;
  - the later-edition line;
  - focus back on the opener.
- **`packages/content/test/slice5.headlines.test.ts`:** the *did* set and the record cards, word for word.

### 9.4 Runs

| Command | Result |
|---|---|
| `vitest run test/qa.slice5.street.test.ts -t M1` × 20 | 20 of 20 green (2 passed each) |
| `pnpm art:check && pnpm turbo lint typecheck test build --force` | exit 0. `art:check ok: 76 assets, 18.76 MB` · **20 successful, 20 total** · rules 41 files / **511 passed** · content 19 / **269 passed** · ui 15 / **332 passed** · db 15 / **71 passed + 1 expected fail** (slice-3 m6) · server 51 / **513 passed + 2 expected fail** (slice 3) |
| `E2E_WEB_PORT=4273 E2E_API_PORT=3301 pnpm e2e` | exit 0 · **124 passed (18.2 m)**, including the 19 `qa-risk` tests, all plain now, and the two older expected fails (slice-3 m4, slice-4's five rows). The first full run had 1 failure, m8's test, in the production build only (8 failures in 10 on repeats). Its cause and fix are in m8's row. |

**Screenshots** are in the session scratchpad's `slice5-fix-shots\`, at 390 × 844, 375 × 667 and 1440 × 900:

1. the mission ticket;
2. the Far Bank's tickets;
3. the briefing;
4. a run-in result after a failed Run;
5. a release from Heat 0;
6. the *Repeat offender* card;
7. the rival-ground plate;
8. the Me tab's rows;
9. the infirmary sheet.

**Left open:**

- **n5:** pins under overlays; review 3 allows it.
- **The risk line on 360 px:** it still wraps, at a dot, when it carries a marks phrase. §7.2 allows this. Screens §10's sentence "never wraps on 360 px" is the designer's to reword.
