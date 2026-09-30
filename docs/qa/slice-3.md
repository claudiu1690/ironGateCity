# QA report: slice 3, "The first vote"

| | |
|---|---|
| **Build under test** | branch `slice-0`, HEAD `f9aa0f0` ("Slice 3: the first vote"), plus the QA test files in §5 (uncommitted). Uncommitted dev-panel changes by someone else appeared during the final run (§6) |
| **Date** | 30 Sep 2026 (machine clock: Wednesday, UTC+3) |
| **Tester** | QA agent |
| **Sources of truth** | `docs/GDD.md` (§3.3, §5.2, §6.5, §14.11, §15.1–15.3, §15.10, §17.1) · `docs/tech/slice-3.md` with its **Deviations (as built)** · ADRs 0017–0023 · `docs/design/slice-3-politics.md` with §17 · `docs/design/slice-3-screens.md` · `docs/economy.md` §14 · `CLAUDE.md` · `README.md` |
| **Environments** | Vitest on the in-memory replica set (rules, content, db, server, ui) · two real Agenda instances on that replica set · the real app with `pnpm dev:mem` (API :3001, client :5173, mongod :27018, worker on), driven by a scratch Playwright script with four Coalport players on the shared test clock. Screenshots and a DOM audit (unnamed controls, targets under 44 px, contrast, side scroll) of 30 screens at **375×812, 360×640 and 1440×900**, plus 375×667 · the Playwright suite against the production build (`pnpm e2e`) |

---

## 1. Verdict

**Pass with issues. Nothing blocks the playtest. Fix m1 and m4 before it, and m6 before reading the report's first-seat numbers.**

The server is solid, and I tried hard to break it:

- **The count runs exactly once per city per cycle** whoever gets there first:
  - two jobs plus three residents' first touches at 00:00:30, across all three cities;
  - the job again at 00:01 and at 03:00;
  - two real Agenda workers started together;
  - a lazy catch-up after eight days of downtime across a live race (declare → endorse → the branch → a ballot → nothing for eight days). The ballot was counted, the away candidate topped the poll, and her first visit paid the five boundaries she held.
- **Every political act is set-once and exact on PC.** I checked six concurrent declares, two concurrent endorsements by one member, four councillors proposing at once, two proposals from one councillor, a double withdraw and a double council vote. Each time: one write, PC spent once, and every loser got a precise domain refusal. A retry with the winner's key replays its modal byte for byte.
- **Acts at the window boundary** (declare and endorse against the close, a council vote against the division, 6 races each): every stored act was in the result and every refused act left nothing behind. None was stored and then ignored.
- **The secret ballot holds on the wire.** A candidate with three votes can't see a tally, a choice, `ballots` or turnout from any procedure before the count.
- **The ordinances apply where the GDD says.** The ten ordinances, morale's three states, the crisis orders, the stipend, deposits, the ELECTED front page and chapter 2 match the GDD number for number.

In the real app the whole loop works from the paper with one tap per act and one modal each, keyboard included, with no console errors:

- a winner (declare, the branch's endorsement through the orders, ballot, **ELECTED**, propose, vote, Open Doors in play at 82 %);
- a loser (*Misses the Last Seat by 9*);
- two voters (*Your Vote Counted: …*);
- Unrest (the *Restore the base* pair, the red *UNREST* on the plate, the morale headline).

The issues are in what the paper prints on crowded mornings, in phone layout, in one operator safeguard and in the report's boosted/natural split.

**Bug count:** blocker 0 · major 0 · **minor 6** · **nit 10**.

---

## 2. Test plan followed

Legend: ✅ verified and correct · ⚠️ verified, bug filed · ➖ not verifiable here.

### 2.1 The calendar (GDD §15.3, tech §3.1, ADR 0017)

| # | Check | How | Result |
|---|---|---|---|
| K1 | Offsets Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4 | Parsed from GDD §15.3 text; content offsets (developer test) | ✅ |
| K2 | For every offset over 400 days: nominations on days 0–1, polls 2–4, counted at the next day 0; the term is 5 days, votes on 0–1 and divides into 2; **ordinance windows tile the timeline** (one in force, no gap, no overlap); `boundaryWork` fires count / close / divide once per cycle; `{weekday}` is the next day 0 **strictly after** today | Rules property test | ✅ |
| K3 | Polls are open in at least one of the three home cities every day | Rules | ✅ |
| K4 | Nothing requires being online at a set time: every window closes at a boundary; the count happened with nobody online (lazy and job); `{until}`/`{at}` rendered in the player's clock (*Saturday 03:00* at UTC+3; *03:00 on Thursday*) | Server + real app | ✅ |
| K5 | **Away for a whole cycle loses no seat, deposit or PC:** an idle member away 6 days keeps PC, Iron and items; a filed, endorsed candidate away still stands, wins, and gets the stipend on return; a struck deposit comes back on the next touch | Server | ✅ |

### 2.2 The count (GDD §15.3, §15.10)

| # | Check | Result |
|---|---|---|
| C1 | 2,000 random ballots: total = ward + 3 × min(end., 5) + votes; seven seats; order by total → votes → endorsements (all) → Successes → filing, NPCs after players; `npcSeats`, top, last seat | ✅ |
| C2 | Seven endorsements in the real flow: `effective` 7, 5 counted (+15), total 20 + 15 + 0 = 35 | ✅ |
| C3 | Small branch at the close: the branch counts **2** with two active colleagues, **1** with three (struck, deposit returned the same morning); a lapsed member (no action in 7 days) does not count | ✅ |
| C4 | NPC fill: for 0–12 players and 500 jitter seeds, the ballot has max(9, p) names, NPCs from the top of the slate, jitter within ±2, **at least two lose**; six real cycles with nobody standing: 9 names, 2 losers every time | ✅ |
| C5 | Tie-break loss prints *Loses the Last Seat on the Tie-Break*, never "by 0"; the voter whose candidate won the tie-break reads *Takes a Seat* | ✅ |
| C6 | Members' votes, including votes for NPCs and for oneself | ✅ |
| C7 | **Exactly once:** job + lazy first touch at once (three cities), twice in a row, 00:01 and 03:00 reruns (`countedAt` unchanged, the world deep-equal), two Agenda workers, eight days of downtime | ✅ (n2: two recurring job documents) |
| C8 | **Turnout's eligible includes voters** (a deviation) | ✅ Judged in §4: the deviation is right. The GDD should say so |

### 2.3 Political acts (ADR 0018)

| # | Check | Result |
|---|---|---|
| A1 | Declare: 6 taps with 6 keys at once → 1 candidacy, `filed` 1, −10 PC once, 5 × `ALREADY_FILED`; the winner's key → the same modal byte for byte; the same key on another act → `KEY_REUSED` | ✅ |
| A2 | Eligibility at the edges: 1,999 FXP → `RANK_TOO_LOW {fxpToGo: 1}`; 29 Successes → `NOT_KNOWN`; 30 files; a sitting councillor → `SITTING_COUNCILLOR {termEndsAt}`, and may declare the morning the term ends; nothing spent on a refusal | ✅ |
| A3 | Endorse: one member, two candidates at once → one endorsement, −10 PC once; Rank 1 refused; self refused; after the close `NOT_NOMINATIONS`; the same member endorses again next cycle | ✅ |
| A4 | Withdraw: a double withdraw → one; deposit `kept`, no refund at the next settlement; the endorser's one endorsement stays spent (`ALREADY_ENDORSED` for a second candidate); re-declare → `ALREADY_FILED {status: 'withdrawn'}` | ✅ |
| A5 | Struck: −10 then +10 **once**, with three first touches of the new day at once; desk *Deposit returned*; *Comes Off the Ballot* headline | ✅ |
| A6 | Propose: 4 councillors at once → 3 proposals + `PAPER_FULL` (its PC untouched); one councillor, two ordinances → one, −20 once; non-councillor → `NOT_COUNCILLOR` | ✅ |
| A7 | Council vote: two keys at once → one; `NOT_ON_PAPER`; `COUNCIL_CLOSED` on day 2 | ✅ |
| A8 | **Boundary races** (1 ms before vs 1 ms after, 6 iterations each): declare vs close, endorse vs close, council vote vs division, plus the developer's vote vs count. Stored ⇒ in the result; refused ⇒ nothing written | ✅ |
| A9 | In the app: a double tap on *Declare*, on *Endorse* and on a ballot row plus the CTA → one act, one modal, PC exact (45 → 35; 20 → 10) | ✅ |

### 2.4 Secret ballot (ADR 0019)

| # | Check | Result |
|---|---|---|
| S1 | During the polls a candidate with three votes: `council.election`, `council.count` (null), `paper.today`, `city.get`, `character.me` carry no voter id, no `ballots`, no non-zero `votes` or `voters`; the chamber (public by design) carries no voter | ✅ |
| S2 | `council.count` for the open election → null; another city → `WRONG_CITY` (developer test, re-run) | ✅ |
| S3 | The operator link (`votes.voterId`) exists for the audit: a user decision | ✅ accepted |
| S4 | Turnout during the polls leaks through the morale % (+0.5 a ballot) in a quiet city | n3 (design note) |

### 2.5 Ordinances (GDD §15.3, ADR 0021)

| # | Ordinance | Where it applies (server, real flow) | Result |
|---|---|---|---|
| O1 | Open Doors | Ticket tag *+4 %*, preview +4 (clamp 95), a named *Open Doors +4 %* row in the breakdown and a bonus tag; in the app 66 + 12 + 4 = **82 %** | ✅ |
| O2 | Rally Permits | Speech ticket 10 Energy, 10 spent, base rewards as for 12 | ✅ |
| O3 | Reading Room Grant | Training ticket and spend −20 %, halves up | ✅ |
| O4 | Street Permits | Swing tag +15; opinion delta ×1.15 | ✅ |
| O5 | Ward Register | Two Successes of Standing per Success | ✅ |
| O6 | Public Meetings, Ward Fund (Iron) | A part named after the ordinance on FXP / Iron | ✅ |
| O7 | Public Works, Ward Fund (pay) | The shift's Iron part = halfPay(pay ± %) − halfPay(pay) | ✅ |
| O8 | Shift Hours | Shift 4 → 3 Energy, streak +2 | ✅ |
| O9 | Rest Day | `restedCap` 250 while in force; a pool of 250 **stays 250** after expiry (server); 2,000 random projections across cap changes never return less Rested than stored (rules) | ✅ |
| O10 | One ordinance per city; the branch's motion in force at bootstrap in all three cities (Shift Hours, Rally Permits, Reading Room); the history windows never overlap | ✅ |
| O11 | Bounds = the GDD §15.3 table, parsed | ✅ |

### 2.6 Morale (GDD §14.11, ADR 0022)

| # | Check | Result |
|---|---|---|
| M1 | Drift 2 % of the distance to 70 for every share 50–95 (step 0.125), never past 70, shares sum to 100 | ✅ |
| M2 | Thresholds exact at 80 and 60 after a +0.5 ballot (no float miss) | ✅ |
| M3 | Unrest at the division: the NPCs abstain, the branch's motion fails, no ordinance | ✅ |
| M4 | Unrest orders: the *Restore the base* pair in slots A and B, the secretary's lines, +40; the plate reads **UNREST** in red; the morale headline carries *Unrest in Coalport…* on an ordinary day | ✅ |
| M5 | **Unrest on a crowded morning** (two personal lines + the count) | ⚠️ **m1** |
| M6 | *Fired up*: a named *Fired up* part = 10 % of base FXP, rounded half up | ✅ · n1: a Partial canvass (3 FXP) shows nothing |
| M7 | The count's inputs (+2 a player seat, −3 unvoted) and the ballot's +0.5 in its modal (*Coalport morale +0.5 → 67.8 %*) | ✅ (developer tests re-run; seen in the app) |

### 2.7 The paper (GDD §3.3, ADR 0023)

| # | Check | Result |
|---|---|---|
| P1 | ELECTED: on the first edition of the term even two days late; animated once; `markRead` twice is harmless; still shown without the animation that day; gone the next day and after the term; the seat headline not repeated below it | ✅ |
| P2 | Front page at 375×667: stamp, headline and *To the council* above the fold; desktop photograph beside the headline | ✅ |
| P3 | Count morning: *Polls Close in Coalport: Lenk Tops the Poll · 6 of them by ward members · Turnout 4 of 4*; loser *Misses the Last Seat by 9*; voters *Your Vote Counted: … Takes a Seat / Falls Short* | ✅ |
| P4 | Day 1 *Files for the Council*, `{until}` with its epoch; day 2 *Is on the Ballot* (until the count) and *Comes Off the Ballot*; no unresolved placeholder | ✅ |
| P5 | Tie-break headline | ✅ (C5) |
| P6 | *Council Passes Open Doors* and *Open Doors in Force* | ✅ (n7: both on the same morning) |
| P7 | A motion moved on cycle day 1 | ⚠️ **m2** |
| P8 | Unrest line pushed out when the slots are full | ⚠️ **m1**: a bug (judged in §3) |
| P9 | Every political deck ≤ 200 characters and every result body ≤ 240 characters and 4 sentences with the longest values | ✅ |

### 2.8 Ambition chapter 2 (GDD §17.1)

| # | Check | Result |
|---|---|---|
| H1 | Numbers from the GDD text: difficulty 14, 15 Energy, 300/80/150 · 150/40/75 · 50/0/0, *His election bill*, *From the back of the ward book*, `requires: { ballotCast }` | ✅ |
| H2 | A ballot on day 0 of the wait: still waiting on day 6, ready on day 7 (the developer covers "day 7, no ballot") | ✅ |
| H3 | Rewards and keepsake in play (developer test re-run) | ✅ |

### 2.9 Admin boost, hooks and memory mode

| # | Check | Result |
|---|---|---|
| B1 | `boostPlan` over 256 mixes around the thresholds: never lowers FXP, Rank, PC or Successes; idempotent (the plan of the result is empty) | ✅ |
| B2 | Three runs at once → boosted once, marked once with the values before (`version` +1) | ✅ |
| B3 | A natural Rank-3, Known tester with under 10 PC | ⚠️ **m6**: marked *boosted* |
| B4 | Not reachable through the API: no procedure named boost, admin, seed, report, playtest or test in `appRouter` | ✅ |
| B5 | `E2E_TEST_HOOKS=1` with `DB_MODE=uri` refused at start | ✅ |
| B6 | Memory mode ignores non-local URIs: `evil.example`, `mongodb+srv://localhost`, a mixed host list, `localhost@evil`, `127.0.0.1.nip.io`, `localhost.evil.example`, a leading space → all ignored. The driver rejects `evil?@127.0.0.1` / `evil#@127.0.0.1` itself | ✅ |
| B7 | `mongodb://127.0.0.1/…?proxyHost=db.evil.example` | ⚠️ **m3** |

### 2.10 The worker

| # | Check | Result |
|---|---|---|
| W1 | Two real Agenda instances start together, schedule and run at once: every city settled once (one morale log entry per day, 7 terms, 1 election) | ✅ |
| W2 | One recurring job document | ⚠️ n2: two workers starting together can leave **two** (harmless: each run is idempotent) |
| W3 | Worker down: the lazy path (C7, K5); the degrade path (developer test re-run) | ✅ |
| W4 | `dev:mem`: the worker ran the city day at start (`coalport@20726, …`); it uses the real clock while the API uses the test clock, which is harmless (the API is always ahead) | ✅ |

### 2.11 The real app (`pnpm dev:mem`)

Four Coalport players on the shared clock: Mara (winner), Otto (loser), Vera and Kasimir (voters), then Unrest set in the local test database. There were 30 screens, each shot at 375×812, 360×640 and 1440×900.

| # | Check | 375×812 | 360×640 | 1440×900 |
|---|---|---|---|---|
| R1 | The loop from the paper, one tap and one modal per act, visible numbers (*−10 PC · 35 left*, *endorsements 2 / 2*, *morale +0.5 → 67.8 %*) | ✅ | ✅ | ✅ |
| R2 | No side scroll on the slate, ballot, count, council and front page | ✅ | ✅ | ✅ |
| R3 | Keyboard: platform radio + *Declare* by Space/Enter; ballot row by Tab + Space, the CTA by Tab + Enter; focus lands on *Continue* in the modal | ✅ | | ✅ (n6: no arrow keys on the ballot radios) |
| R4 | Labels: no unnamed control on any screen | ✅ | ✅ | ✅ |
| R5 | 44 px targets | ⚠️ **m5** (the Me tab's office line is 18 px tall) | same | same |
| R6 | Contrast ≥ 4.5:1 | ✅ (the audit's hits were a disabled CTA, the stamp over the art, and orders on a light panel whose ancestor is dark; each checked by eye) | ✅ | ✅ |
| R7 | Ballot and slate on a short phone: header and ≥ 5 rows above the CTA (screens §10) | ⚠️ **m4**: 2 rows at 375×667 | ⚠️ | ✅ |
| R8 | Plate: *UNREST* in red, *Collective 55.3 %*; ordinance line | ⚠️ n4: *4 days le…* truncated | hidden (deviation) | ✅ |
| R9 | No console errors in any run | ✅ | ✅ | ✅ |

### 2.12 Content policy and regressions

| # | Check | Result |
|---|---|---|
| P1 | The slice-2 checklist sweep over all content and copy (re-run: includes the slates, headlines, platforms, results and chapter 2) | ✅ |
| P2 | Slice-3 sweep for war framing and real-world echoes (battle, fight, victory, defeat, enemy, crush, march, banner, traitor, loyal, purge, revolution, fatherland, soldiers, comrades…) over ordinances, slates, results, political headlines, platforms, chapter 2 and copy | ✅ none. *The frontier shut* (a Vanguard platform) echoes the Sentinel's GDD strapline; no change asked. *In the front row* (chapter 2) is inside the review's allowance |
| P3 | Slices 0–2: the whole existing suite passes, including the earlier QA files (`qa.gdd`, `qa.content`, `qa.server`, `qa.http`, `qa.spec`, the slice-2 QA files) | ✅ (§6) |

---

## 3. Bugs, ordered by severity

### Minor

#### m1. On a crowded morning the Unrest announcement drops out of the paper

- **Where:** `packages/rules/src/paper.ts` `mergeHeadlines`: up to two personal headlines, then city headlines to three. The stored morale line is city priority 1; the live count or phase line is city 0.
- **Steps:** Coalport in Unrest (share 52). A player who stood and lost and who voted opens the count-morning paper.
- **Expected:** GDD §14.11: a crisis is "Announced in **every** Morning Paper: *Unrest in Coalport: dockers question the party.*"
- **Actual:** *Misses the Last Seat by 5* · *Your Vote Counted: Anna Weiss Takes a Seat* · *Polls Close in Coalport…*. No Unrest line. On an ordinary Unrest morning it does show (the real app: *Collective Holds Coalport at 55.3 % — Unrest in Coalport…*).
- **Judgement:** a bug, not a design choice: the GDD makes the announcement unconditional, and the count-morning papers are the most-read editions. The plate still shows *UNREST* in red and the orders change, so the player is not left blind.
- **Fix idea:** in Unrest, reserve a city slot for the morale line (or give its Unrest band priority 0 above the phase line).
- **Test:** `it.fails` "BUG m1" in `apps/server/test/qa.slice3.server.test.ts`.

#### m2. A motion moved on cycle day 1 is printed after the division with a past deadline

- **Where:** `apps/server/src/services/politicsService.ts:783` (`movedYesterday`: `day === today − 1`, any cycle day) and `rules/paper.ts` `untilFor` (the divide boundary).
- **Steps:** a councillor proposes Open Doors on cycle day 1. Read the next morning's paper (cycle day 2).
- **Actual:** *Councillor Tardy Mover Moves Open Doors — … The council divides at {until}*, with `until` = today 00:00 (rendered *Tuesday midnight* on Wednesday), printed beside *Council Passes Shift Hours Order*.
- **Expected:** news, not a stale call to act. `hl.filed` has the same shape and is restricted to "nominations still open" (design §17 Q18). `hl.moved` needs the same rule (only while the council is still voting) or a deck without a deadline.
- **Owner:** designer (the rule) and then developer.
- **Test:** `it.fails` "BUG m2" in `qa.slice3.server.test.ts`.

#### m3. Memory mode's "loopback only" guard is bypassed by a proxy option

- **Where:** `apps/server/src/env.ts` `isLoopbackUri` checks the host list only.
- **Steps:** `DB_MODE=memory E2E_TEST_HOOKS=1 MONGODB_URI='mongodb://127.0.0.1:27017/irongate?proxyHost=db.evil.example&proxyPort=1080'`.
- **Actual:** `isLoopbackUri` returns true, and the driver connects through the SOCKS5 proxy on another machine. From there, 127.0.0.1 is that machine's database. The server then runs with the test hooks against it.
- **Expected:** (Deviations) "a server with the hooks can never reach a real database". Also by design loopback, and so also passing: an SSH tunnel or port-forward to a real database on localhost, and the persistent Docker database on 27017.
- **Fix idea:** refuse any URI query option other than a short allow-list (`directConnection`, `replicaSet`), and/or check a marker only the `db:mem` replica set has (its replica-set name, or a sentinel document written by `memMongo.ts`).
- **Severity:** minor (defense in depth; needs a deliberate operator mistake).
- **Test:** `it.fails` "BUG m3" in `qa.slice3.server.test.ts`.

#### m4. Short phones see two ballot rows above the CTA, not five

- **Where:** `apps/client/src/routes/council.tsx` (the plate header, 91 px rows, the sticky CTA with its caption).
- **Measured:** 375×667: 2 of 9 rows fully above the CTA. 360×640: 2 (screenshot `10-ballot-360x640`).
- **Expected:** screens §10: "on a 375 × 667 phone the header and at least five rows are visible above the CTA".
- **Impact:** a voter scrolls to see who is standing. The slate is the same shape. It is the ballot's main job on the device most testers use.
- **Test:** `test.fail` "m4" in `apps/client/e2e/qa.slice3.spec.ts`.

#### m5. The Me tab's office line is an 18 px tap target

- **Where:** `apps/client/src/routes/me.tsx` (`me-office`: *Councillor, Coalport · term ends Sunday*, a link to the council).
- **Measured:** 317×18 at 375, 302×18 at 360, 582×18 at 1440.
- **Expected:** 44 px targets (agent rules; screens §8 makes this line a route to the council).
- **No automated test:** it needs a seated councillor in e2e. It was seen in the DOM audit of the walk-through (`23-me-councillor-*`).

#### m6. `admin:boost` marks a natural tester as boosted when it only tops up PC

- **Where:** `packages/db/src/boost.ts` (`playtest.boosted` is set on any change).
- **Steps:** a tester reaches Rank 3 and Known by play but holds 4 PC. Run `pnpm admin:boost --email …`.
- **Actual:** `changes: ['PC 4 → 10 (the deposit)']` and `playtest.boosted: true`. The report's first-seat section then counts them among the boosted testers.
- **Expected:** Deviations: "a tester already at Rank 3 and Known counts as natural". Either don't mark a PC-only top-up, or mark it separately (`playtest.pcOnly`).
- **Why it matters:** the boosted/natural split is how the playtest question is answered in numbers.
- **Test:** `it.fails` "BUG n-boost" in `packages/db/test/qa.slice3.db.test.ts`.

### Nits

| # | Where | What |
|---|---|---|
| n1 | Rules / GDD §14.11 | *Fired up* +10 % "so every line shows +1 or more" is not true for Partials: a Partial canvass pays 3 FXP, and 0.3 rounds to 0, so there is no *Fired up* line (seen in the server). Propaganda Partials likewise. For the designer: accept, or round bonus parts up to 1 |
| n2 | `apps/server/src/jobs/cityDay.ts` | Two workers starting at the same moment each upsert the recurring `city-day` job (no unique index on the name): two documents, so the job runs twice a night. Harmless (idempotent), but it doubles midnight contention. A unique index on `{ name }` for `type: 'single'`, or `agenda.every(..., { unique })` |
| n3 | Design §4.3 / §11.2 | "No running totals during polling": the plate's morale % rises by exactly 0.5 per ballot, so in a quiet city it counts turnout live. It never reveals a choice. For the designer (Appendix C #25) |
| n4 | `city.tsx` plate at 375 px | *Ordinance: Open Doors · 4 days le…*: the key number is cut. At 360×640 the line is hidden (a recorded deviation); the tickets carry the tags |
| n5 | Ballot / slate NPC rows | The ward mark (a red dot in a ring) sits beside the radio ring and reads as a selected radio at a glance (`10-ballot-360x640`) |
| n6 | Ballot rows (`role="radio"`) | Tab and Space work; the arrow keys don't move the selection (the slice-2 n4 fix gave faction cards arrow keys; the ballot has none) |
| n7 | The paper | The winner's own paper says *Your Vote Counted: Mara Lenk Takes a Seat* under her front page. On the day of a division a councillor reads *Council Passes Open Doors* and *Open Doors in Force* in one block (two of three slots on one fact) |
| n8 | `cityDay.ts` `countLines` | The count reads Local Standing from the character without writing it, so a Success committing in the milliseconds after the count's snapshot (the action's attempt began before midnight) is not in the ward vote. Opinion is safe (it conflicts on the city). Theoretical |
| n9 | `modifiers.ts` `capOn` | A day older than `ordinanceHistory` (the last four, 20 days) uses the base Rested cap. A player away since before a Rest Day that ended 20+ days ago banks to 200 for it instead of 250. Not tested; noted from reading |
| n10 | Design §5.1 prose | "With any NPC seats at all, something always passes" is not true: six players split 2/2/2 plus one NPC leaves 3 votes. GDD §15.3 does not make the claim; the prose should drop it |

---

## 4. GDD vs code: disagreements and which is right

| Topic | GDD / design says | Code does | My view |
|---|---|---|---|
| §15.3 turnout's *eligible* | Active Rank 2+ members in the last seven days | That set **plus everyone who voted** (Deviations) | **The code is right.** A voter is by any reading an active member; without it the walk-through printed *Turnout 3 of 1*. The GDD should add "or who voted in this election". The small-branch roll (endorsers) still ignores members who only vote or endorse: tolerable, but worth one line in the GDD |
| §14.11 "announced in every paper" | Unconditional | Dropped when the slots are full (m1) | **GDD is right** |
| §14.11 "at 10 % every line shows" | Every *Fired up* line shows | Partials show nothing (n1) | **Code follows the rule**; the GDD's claim is wrong. Designer to choose |
| Design §10.2 `hl.moved` "the next morning" | Printed the morning after a proposal | Also after the division, with a past deadline (m2) | Designer to restrict the rule (like `hl.filed`); then the code follows |
| Screens §10 five rows above the CTA | Five | Two (m4) | **Screens are right** |
| Deviations: boost marking | Rank 3 + Known ⇒ natural | PC-only top-up ⇒ boosted (m6) | **The Deviations text is right** |
| Deviations: memory mode "never reaches a real database" | Never | The host check can be bypassed (m3) | **The Deviations text is the goal**; the guard needs hardening |
| §3.3 front page on the first edition of the term (design §17 Q14) | As built | As built | Agree |

Everything else agrees, number for number.

---

## 5. Tests added (not committed)

| File | Tests | What it covers |
|---|---|---|
| `packages/rules/test/qa.slice3.rules.test.ts` | **16** | The council, morale and ordinance constants and bounds **parsed from GDD §15.3, §6.5, §14.11**. The calendar for every offset over 400 days (phases, count / close / divide once, ordinance windows tile, `{weekday}` strictly after). Polls open in a home city every day. 2,000 random counts (formula, order, every tie-break). NPC fill ×500 seeds × 0–12 players (≥ 2 losers). The small-branch table. 5,000 random divisions. The drift over 50–95. Exact thresholds after a ballot. Stipend additivity over 1,000 settlement sequences. Rested never shrinks over 2,000 piecewise projections |
| `packages/content/test/qa.slice3.test.ts` | **6** | Political decks ≤ 200 and result bodies ≤ 240 characters and 4 sentences with the longest values. No unknown placeholder. NPC standing labels (One of Us ×3, Trusted ×6). Chapter 2 against the GDD text. The slice-3 war-framing sweep |
| `packages/db/test/qa.slice3.db.test.ts` | **3** (1 `it.fails`) | The boost never lowers anything and is idempotent over 256 mixes. Three parallel runs mark once. m6 (`it.fails`) |
| `apps/server/test/qa.slice3.server.test.ts` | **44** (3 `it.fails`) | City day exactly once across three cities (jobs + first touches + reruns). Eight days of downtime across a live race. Endorsements 7 → 5. Small branch. NPC fill in six real cycles. Tie-break headlines. Declare ×6 keys, replay, `KEY_REUSED`. Eligibility edges and the sitting councillor. Endorse races and limits. Withdraw. Struck refund once under concurrency. Propose races (paper full, one per councillor). Council-vote races. Three boundary races ×6. Secrecy for a candidate. Nine ordinance scenarios through `city.get` and real actions. Unrest at the division and in the orders and paper. m1. *Fired up*. ELECTED late and once. On-ballot / struck / `{until}`. m2. Away for a cycle. Env refusal and 9 URI cases. m3 |
| `apps/server/test/qa.slice3.worker.test.ts` | **3** | Two real Agenda workers at once. No admin surface in `appRouter`. Chapter 2 with the ballot before the seventh day |
| `apps/client/e2e/qa.slice3.spec.ts` | **4** (1 `test.fail`) | Double tap on a ballot row and the CTA at 360×640 → one ballot, one modal, no side scroll. The ballot by keyboard alone. m4 (`test.fail`). The count at 360 px |
| `apps/client/playwright.config.ts` | — | The `phone` project ignores `qa.slice3.spec.ts`; a new `qa-council` project runs it after `council` (it moves the shared clock) |

Every expected failure was run once as a plain test to check that it fails for the bug's reason. For m1 and m2 I also printed the paper's headlines. When a bug is fixed, its test turns red: that is the reminder to remove the marker.

Scratch scripts outside the repo (the walk-through with its DOM audit, the keyboard and row-count probe, the Agenda interval probe, the URI parser probe) and the 90 screenshots are in the session's scratchpad.

---

## 6. Command output (real runs)

| Command | Result |
|---|---|
| Baseline before QA changes: `pnpm art:check && pnpm turbo lint typecheck test build` | exit 0 · `art:check ok: 30 assets, 11.02 MB` · 20/20 tasks (all cached) · rules 269 · content 95 · ui 72 · db 33 · server 159 passed |
| QA files alone while writing them | rules 16 passed · content 6 passed · db 2 passed + 1 expected fail · server 41 passed + 3 expected fail · worker 3 passed |
| Final: `pnpm art:check && pnpm turbo lint typecheck test build --force && pnpm e2e` | **exit 0**. `art:check ok: 30 assets, 11.02 MB` · turbo **20 successful, 20 total, 0 cached**: rules 24 files / **285 passed** · content 6 / **101 passed** · db 7 / **35 passed + 1 expected fail** · ui 4 / **72 passed** · server 18 / **203 passed + 3 expected fail** · `pnpm e2e` **51 passed (5.3 m)**, including the 4 `qa-council` tests (m4 failed as expected) |
| Along the way | Five of my first assertions were wrong and were fixed in the tests: a replay sent a different platform, so its key was refused (`KEY_REUSED`, correct server behaviour); a close was read without anything settling the city; a struck deposit is returned in the same request that sees the close; the chamber's public division tallies matched my "no votes" regex; `markRead` takes `{ day }`. One Agenda probe used an interval string Agenda does not parse (`'200 milliseconds'`); with `'1 second'` both workers ran. The tie-break test pins Standing after the orders, whose canvasses add Successes |
| Working tree moved under me | While the final suite ran (about 11:06), someone else changed production code in the working tree: `apps/server/src/app.ts`, `apps/server/package.json` (a `./dev` export) and a new `apps/server/src/dev/` (`characterSeed.ts`, `clock.ts`, `panel.ts`, `types.ts`), which reworks the `/api/test/character` hook and adds a dev panel. I did not write or review them, and the e2e build may have included them. This report verifies `f9aa0f0`; those files need their own review (the memory-mode guard, m3, applies to any new hook) |
| Clean-up | `dev:mem` and its whole process tree stopped (by port). Ports 3001, 5173 and 27018 have no listener; no `node` process started in this session is left. Nothing committed |

**Not verified here:** a real phone or iOS Safari, a screen reader, a real network, CI, deployment, Agenda across a real midnight, and human feel (that is the playtest).

---

## 7. The playtest question: does the first vote, and the first seat, feel like a big moment?

My honest read, from walking it four times:

- **The seat, yes, mostly.** The front page is the best screen in the game so far. The halftone portrait, the stamp landing on it, *Mara Lenk Tops the Poll in Coalport* in display type, the count with *you · your vote* on the first row, and one button, *To the council*. It fits above the fold on a 375×667 phone, and it waits for a player who comes back two days late.
  - What undercuts it: at population 1 the result is close to certain. The branch doubles, and the day-10 recruit tops the poll by design. A player who notices that eight of nine names are *ward* may read it as a formality.
  - After the stamp, the council's power is small in feel: Open Doors is a +4 % tag. The front page oversells slightly what the chamber delivers.
- **The first vote, less so.** It is correctly one tap and secret, but the modal is quiet. *Coalport morale +0.5* is the only number, and the payoff is two days away in a headline that reads *Your Vote Counted: Anna Weiss Takes a Seat*, about an NPC.
  - On a short phone the ballot shows two names before the CTA (m4), so it feels like a form, not a choice.
  - Chapter 2's Letter a week later is what makes the ballot matter personally. That is good design, but it is late.
- **Losing** is plain and fair (*Misses the Last Seat by 9*, the deposit gone as the screen said). It needs no stamp.

### Before the playtest
- [ ] Fix **m1** (Unrest must print) and **m4** (ballot rows on short phones). Decide **m2** (designer) and fix it.
- [ ] Fix **m6** before reading the report's first-seat split; run `pnpm admin:boost --dry-run` on the list first.
- [ ] Decide whether testers are boosted (tech §20.2 Q2). A natural first seat is day 13–17.
- [ ] Deploy with the worker running (`node dist/worker.js`) and only **one** worker instance at start (n2).
- [ ] Note each tester's time zone: every boundary shows in local time (*Saturday 03:00* at UTC+3), which is correct but surprising if they expect midnight.

### Watch live
- [ ] **The first ballot:** do they find *Cast your ballot* on the paper unprompted? Do they scroll the ballot or tap the first name? Do they vote for an NPC, and do they know it is an NPC (the *ward* mark)?
- [ ] **The ballot modal:** do they read *Nobody sees who you voted for*? Do they ask when the result comes?
- [ ] **Declaring:** do they understand the deposit caption and *the branch will make up the number*? Do they do the orders because of it?
- [ ] **The count morning:** the time from opening the app to the front page. Do they react to the stamp? Do they tap *To the council* at once (the report's "act in the chamber the same session")?
- [ ] **In the chamber:** do they understand the order paper, the branch's motion and *NPC seats 6 / 7*? Do they propose, and what?
- [ ] **The next day:** do they notice their ordinance on a ticket (*Open Doors: +4 %*)?
- [ ] **Losers:** do they say they will stand again (*Stand for the council · 10 PC* on the same morning)?
- [ ] **Unrest,** if it happens: do they notice the red word and the changed orders?

### From the report (`pnpm report:playtest`, elections)
- [ ] Rank 2 → first ballot (target ≤ 2 days); minutes from the paper to the ballot (target under a minute).
- [ ] Candidacies, struck vs standing, small-branch doubles.
- [ ] Front page seen (hours after the count) and the chamber act within 30 minutes; council vote rate.
- [ ] Next-day return for winners, losers, voters and eligible non-voters.

### Questions afterwards
1. "When did you feel your vote mattered, if at all?"
2. "What did you think when you saw the front page?"
3. "Who were the *ward* candidates?"
4. "What did your council do, and did you notice it in the city?"
5. "Would you stand again after losing? Why?"
6. "Was anything hard to find or tap on the council screens?"

### Answer the question
- **Yes** if most winners react to the front page, take an act in the chamber in the same session and return the next day more often than eligible non-voters, and if voters can say what happened to their vote.
- **No, and where:** if winners skip the front page or never open the chamber, the moment is the stamp alone. Send that to the designer (the council's power, NPC density). If voters ignore the ballot, look at m4 and the quiet modal first.
