# QA report: slices 0 and 1

| | |
|---|---|
| **Build under test** | branch `slice-0`, HEAD `d6d33c4` ("Slice 1: the 5-minute session"), clean tree plus the QA test files listed in §5 |
| **Date** | 29 Sep 2026 (the machine's clock: Tuesday, day index 271 of the order rotation) |
| **Tester** | QA agent |
| **Sources of truth** | `docs/GDD.md` v3.1 · `docs/tech/slice-0.md` and `docs/tech/slice-1.md` (with Deviations) · ADRs 0001–0010 · `docs/design/slice-0-answers.md` · `docs/design/slice-1-content.md` (incl. §12 and §12.1) · `docs/economy.md` · `CLAUDE.md` · mockups in `docs/mockups/` |
| **Environments** | Vitest with the in-memory replica set (rules, content, db, ui, server) · the real app via `pnpm dev:mem` (API :3001, client :5173, mongod :27018), driven by a Playwright script at 375×812 and 1440×900 · the Playwright suite against the production build (`NODE_ENV=production`, `DB_MODE=memory`, `E2E_TEST_HOOKS=1`) |

---

## 1. Verdict

| Slice | Verdict | In one line |
|---|---|---|
| **0 — walking skeleton** | **Pass** | Sign-up, the auto-created reference recruit, the 66 % canvass, server-side rolls, atomic writes, health check and env validation all behave as designed. It shares bug M1 (the idempotency *response* under a concurrent retry), which lives in its ADR 0002 code. |
| **1 — the 5-minute session** | **Pass with issues: fix M2 before the playtest, M1 soon after** | Every number I checked matches the GDD and the design answers: checks, rewards, Rested, levels, rank, training, jobs, streak, sick days, the salary cap, opinion and orders. The content matches `slice-1-content.md` word for word, time is lazy and correct over missed days, and the result payload is complete. Two major issues: (M1) a concurrent retry with the same key gets a refusal instead of the stored result; (M2) on a phone, 3 of the 6 locations start off-screen with no cue, and on desktop The Anchor sits under the ticker. |

**Bug count:** blocker 0 · **major 2** · **minor 7** · **nit 12**. No data-corrupting or double-paying defect was found. No state is double-applied under any race I could produce.

---

## 2. Test plan followed

Legend: ✅ verified and correct · ⚠️ verified, bug filed · ➖ out of scope or not verifiable here.

### 2.1 Rules maths against the GDD (`packages/rules`)

| # | Check | Source | How | Result |
|---|---|---|---|---|
| R1 | `chance = clamp(50 + 4 × (stat − difficulty) + bonuses, 5, 95)`, whole numbers, bonuses before the clamp | §8.4 | Exhaustive: stat 0–60 × difficulty 8/10/14/22 × bonus −10…+12 | ✅ |
| R2 | Two-stat checks average the stats; every .5 average gives a whole chance (e.g. (3+12)/2 → 48 %) | §8.4, content §2.2 | All pairs 0–30 | ✅ |
| R3 | Roll ≤ chance = Success; ≤ chance + 20 = Partial; beyond: Partial at tier 1, Failure at tiers 2–3; 72 % wins exactly 72 / 100 | §8.4, slice-0 answer 5 | Every roll 1–100 × every chance 5–95 | ✅ |
| R4 | The Standing bonus is in the odds (Known +6 → 72 %, One of Us +12 → 78 %), labelled "Known in Coalport"; a ×3 crossing 10 Successes gives row 3 +3 % | §13.4, §8.4 | Rules test | ✅ |
| R5 | Rewards: half up per line, base and bonus apart, ≥ 1 on a Partial; the economy §1 table for 3/4/8/10/12 Energy; council ×1.5 → 9 / 5 | §5.5, economy §1 | Rules test, and every one of the 15 checked actions against the content table (§2.4 below) | ✅ |
| R6 | Rested is proportional (restedUsed 0–10 on a 10-Energy canvass; 3 of 10 → +7 XP / +3 Iron), never on FXP or opinion | §6.3, slice-0 answer 6 | Rules test | ✅ |
| R7 | Party-order bonus +25 % of the base FXP, own rounding (6 → +2, Partial 3 → +1, council Partial 4.5 → 5 / +1); only rows that advance an open order; nothing after the completing row | §15.4, answer Q3 | Rules and server tests | ✅ |
| R8 | Level table = GDD §5.3 for L1–51; each threshold exact; +600 per level beyond (51→52 = 21,300); 0 → 1,600 XP in one gain = L5 and 4 points | §5.3 | Rules test | ✅ |
| R9 | Rank 2 at 400 (399 → 1); 2,000 / 6,000 / 15,000 / 25,000 / 60,000; PC capped at 1,000 | §5.4, §6.5 | Rules test | ✅ |
| R10 | Training costs 20 + 2 × stat (15 → 50, 30 → 80, 60 → 140); ×3 at rising costs (138 for INT 12); XP 2.25/E (99 / 68 / 90) | §8.5, economy §1 | Rules test | ✅ (see m4: ×3 is unreachable at a 100 bar) |
| R11 | Opinion: Neutral drains first to exactly 5.000 (after 200 canvasses), then rivals 9 : 6; Collective stops at 95; a rival never takes the Collective below 50 in Coalport; sums stay 100.000 | §14.2 | Rules test (1,000 swings) | ✅ |
| R12 | Job pay 100 / 216 (180 non-Collective) / 200; half pay 50 / 108 / 100; streak bonus 2 % × min(streak, 10) for streaks 0–14 at every pay | §9.1, §9.2 | Rules test | ✅ |
| R13 | Sick days only while streak > 0; the Sunday is judged before the Monday refill (the third miss on a Sunday ends the streak even though Monday refills); one miss from a fresh week never breaks it; 14 half-pay cap; job never lost | §9.1, answers Q1 and Q9 | Rules tests, and the API with real dates (Mon 21 → Mon 28 Sep 2026) | ✅ |
| R14 | Lazy = eager: settling a gap in one go equals settling it day by day | ADR 0005 | Property test, 400 random schedules × 25 returns | ✅ |
| R15 | Energy +5 / 10 min, empty to full in 3 h 20; Rested to 200 in 10 h; projecting in many small steps = one projection | §6.2, §6.3 | Rules and server tests | ✅ |
| R16 | Majority rule for the narrative (×3: 2+; ×1: 1; ×5: 3+); "n of 3" stamp for 0 and 3 too | §13.1, answer Q5 | Rules test and live app | ✅ |
| R17 | Orders by City Day from 2026-01-01 (29 Sep = day 271: Be at the gate / Keep your ears open / Sharpen up); the "Take a job" variant frozen at settlement | §13.7, ADR 0009 | Rules and server tests | ✅ |
| R18 | Night 20:00–06:00 UTC; the day turns at 00:00 UTC; the dateline has no year | §2.2, §3.3 | Rules test and e2e | ✅ |

### 2.2 Atomicity and idempotency (server, in-memory replica set)

| # | Check | Result |
|---|---|---|
| A1 | Double tap ×1, same key, 4 concurrent: 1 log, 10 Energy, identical results | ✅ |
| A2 | 5 different-key ×3 at once from 100 Energy: exactly 3 commit, 2 × `NOT_ENOUGH_ENERGY`, Energy 10; Iron, XP and the tally equal the sum of the committed results; each run saw the Energy the previous one left (100 / 70 / 40); the Coalport meter moved by exactly the applied swings | ✅ |
| A3 | Mixed ×1 and ×3 with different keys at once: Energy never below 0 and equals 100 − the committed costs; logs = commits | ✅ |
| A4 | ×3 with too little Energy (20 of 30): the character, Rested, `version`, the meter and the logs are byte-identical afterwards; the same for training ×1 at 44 | ✅ |
| A5 | A key is bound to its action and count (×3 → ×1, another action, another kind) → `KEY_REUSED` | ✅ |
| A6 | `job.take`, 5 concurrent taps with one key: one request log, one job, no Energy | ✅ state · ⚠️ **M1**: 4 of 5 taps are refused `ALREADY_IN_JOB` instead of getting the stored result |
| A7 | Stat points: one key × 5 → one point; 5 keys with 2 pending → exactly 2 placed | ✅ state · ⚠️ **M1**: same-key retries get `NO_STAT_POINTS` |
| A8 | Two shifts at once with different keys: one pays 112, the other `SHIFT_ALREADY_WORKED` | ✅ |
| A9 | Same-key concurrent retry at the Energy limit / of a shift | ⚠️ **M1**: `NOT_ENOUGH_ENERGY` / `SHIFT_ALREADY_WORKED` instead of the stored result (state correct) |
| A10 | Job switches racing: each committed switch costs exactly 2 Energy, streak 0 | ✅ |
| A11 | The paper is generated exactly once per touched day, with `me` / `paper.today` / `city.get` racing, over hops of 1, 1, 3 days, 45 min and 1 day; no paper for untouched days | ✅ |
| A12 | One character cannot act on another's key or state | ✅ |

### 2.3 Lazy time, and "away costs opportunity, never assets"

| # | Check | Result |
|---|---|---|
| T1 | Energy and Rested projected on read; a same-day read writes nothing | ✅ |
| T2 | 30 days away: Iron + exactly 14 × 108; XP, level, FXP, PC, stats, pending points and Standing unchanged; job kept (streak 0); Energy 100, Rested 200; the paper says "14 days of half pay banked (1512 Iron)" | ✅ |
| T3 | Streak across a weekend through the API (Mon–Wed worked, Thu/Fri sick, Sat worked, Sun missed → Monday: streak 0, sick days 2, desk `broken: true`) | ✅ |
| T4 | Orders rotate by day number on Mon / Tue / Wed with no job | ✅ |
| T5 | No scheduled job exists: `worker.ts` has no job definitions; every daily rule settles on first touch | ✅ |
| T6 | 3 h after the last action the paper is due again: `/` opens it, and the map shows the banner and the tab dot (e2e with the test clock) | ✅ |
| T7 | Next day via the test clock: the paper is due, half pay is on the desk (existing `day.spec`) | ✅ |

### 2.4 The result modal payload (§13.1a)

Checked on a ×3 with Rested and an open order, and on a council ×1, through the API (`qa.server.test.ts`) and in the live app:

- **Art and stamp:** map crop centred on the location (0.36, 0.44) or the `scene.union-hq` scene at the Union Hall; stamp `batch` rendered "n of 3"; place, action and time. ✅
- **Narrative:** the success text only when more than half the rows succeed. ✅
- **Every attempt:** `roll`, the full `check` breakdown (base 50, difficulty 8, stats, bonuses) and the outcome. Every roll replays from the stored seed. ✅
- **Tiles:** the sum of the rows, each line `base + bonus = total`; the Rested tag reads "30 of 30 Energy, +50 % XP and Iron"; the party-order tag. ✅
- **Knock-on effects:** Energy and Rested before → after, opinion (`shareAfter = shareBefore + applied`), Standing, order progress with "+20 FXP" on completion, level-up with one-tap STR / INT, the FXP delta = tiles + 20, and today's tally. ✅
- **Buttons:** `again` costs, and Continue only after a shift. ✅
- **One modal per tap:** exactly one result modal after ×1 and after Again ×3. ✅ (m2: on a phone its buttons are below the fold.)

### 2.5 Content validation

| # | Check | Result |
|---|---|---|
| C1 | §1.1 locations: ids, names, kinds, x/y and blurbs, in pin order, against the design doc table | ✅ |
| C2 | §2.2: all 21 actions (id, title, type, stats, Energy); every checked action's Success / Partial XP, FXP, Iron and opinion recomputed by the rules and compared with the doc's table | ✅ |
| C3 | §2.3: every Success and Partial text (15 checked actions) and every Worked / Trained text, word for word against the doc | ✅ |
| C4 | §3 jobs, §6.3 the 12 order templates (slot, title, target, Holm's line), §7.4 the ambient pool in order | ✅ |
| C5 | The 19 location kinds of GDD §13.5 are exactly what the schema accepts; an unknown kind is refused | ✅ |
| C6 | The §12.1 UI copy strings; no "UTC" and no "!" in the copy | ✅ |
| C7 | Campaign vocabulary: no war framing in any content or copy ("front" only as "columns out front") | ✅ |
| C8 | No real-world extremist symbols, slogans or names; crests are square / circle / triangle | ✅ (n5 flags one client string for the designer) |
| C9 | Content is data: actions, text, orders, headlines, jobs and copy all come from `packages/content`; only the kind labels and "Join the struggle" live in client code | ✅ (nits n5, n10) |

### 2.6 Client and UX in the real app

Run against `pnpm dev:mem` with a Playwright script (screenshots and a DOM audit of every screen), then as the committed suite against the production build.

| # | Check | 375×812 | 1440×900 |
|---|---|---|---|
| U1 | Sign-up, keyboard only (Tab, type, Enter) → the paper | ✅ | ✅ |
| U2 | The paper: masthead, dateline "Tuesday · 29 September · Coalport", 3 headlines incl. "Welcome to Coalport", 3 orders signed "— P.H.", the desk; "To the city" | ✅ | ✅ |
| U3 | The map: 6 numbered hotspots, the city plate, orders and the Today strip; day art at 14:44 | ⚠️ **M2**: pins 3, 4 and 6 are off-screen | ⚠️ **M2**: pin 6 is under the ticker |
| U4 | Every location sheet (tickets, odds 66 / 58 / 46 / 42 / 38 %, order tags, jobs cards, "Needs Level 3, AGI 10") | ✅ (3 sheets only via keyboard) | ✅ side panel |
| U5 | ×1 and ×3, one modal each, "n of 3" stamp, Again ×3 from the modal | ✅ (m2: scroll to reach the buttons) | ✅ |
| U6 | Out of Energy: ×1 and ×3 disabled, "Needs 10 Energy · ready at hh:mm", "×3 needs 30 Energy", the out-of-Energy card, Again ×1 disabled with its hint | ✅ | ✅ |
| U7 | Take a job, the shift (+112 = 108 + 4, "Shift worked · next at hh:mm", Continue only); switch (−2 Energy, "Switched · streak reset…", one shift per day holds) | ✅ | ✅ |
| U8 | Training (+99 XP, INT 12 → 13, cost rises to 46), a level-up in the modal, a point from the modal and from the HUD badge | ✅ | ✅ |
| U9 | The Me tab (rank, level, stats, job, standing, today, orders, sign out); unchanged after a reload | ✅ | ✅ |
| U10 | Reload keeps state; `/` goes to the map after the paper was read; sign out → `/login` (and `/me` redirects); sign in → the same state | ✅ | ✅ |
| U11 | Accessible names: no unnamed interactive element on any screen | ✅ | ✅ |
| U12 | Keyboard: hotspots, tab bar and HUD in order with visible outlines; Enter opens a sheet; the modal traps focus; Escape closes it | ✅ (M2: focus on an off-screen pin stays off-screen) | ✅ |
| U13 | 44 px targets | ⚠️ m3: attempt rows 32 px, HUD badge 32 px | ⚠️ same |
| U14 | 4.5:1 contrast (disabled controls exempt; the stamp over art checked by eye) | ⚠️ m6: teal cost on Again ×3 is 4.38:1 | same |
| U15 | No horizontal page scroll; no console errors | ✅ | ✅ |
| U16 | Pillar 7: one tap → one modal; 2–3 sentence texts; nothing needs a set time | ✅ (n9: bodies wrap to 4–6 lines at 375 px) | ✅ |

### 2.7 Security basics

| # | Check | Result |
|---|---|---|
| S1 | Every character procedure (`character.me`, `placeStatPoint`, `city.get`, `action.perform`, `job.take`, `paper.today`, `paper.markRead`) refuses a signed-out caller with UNAUTHORIZED; only `health.ping` is public | ✅ |
| S2 | No client input can choose the seed, roll, outcome or rewards (extra fields are stripped; the stored seed replays the rolls); `times` accepts 1 and 3 only; keys must be UUIDs; stat points STR / INT only | ✅ |
| S3 | The test clock: 404 without `E2E_TEST_HOOKS` for every method; `E2E_TEST_HOOKS=1` is refused unless `DB_MODE=memory` in every `NODE_ENV`; only "1" turns it on; the auth rate limit is disabled only together with the hooks | ✅ |
| S4 | CORS: no `Access-Control-Allow-Origin` to a foreign origin (same origin via the proxy, ADR 0001) | ✅ |
| S5 | CSRF: in the production build, Better Auth refuses a cookie-carrying sign-in from a foreign Origin (403) and accepts its own; form and text/plain bodies are refused with 415 before auth and tRPC; mutations cannot be sent as GET | ✅ (Better Auth skips the origin check when `NODE_ENV=test`, so this is only observable in the production build) |
| S6 | Cookies: HttpOnly, SameSite=Lax, Path=/, host-only; a forged cookie → 401 | ✅ |
| S7 | Env validation: short secret refused, uri mode needs `MONGODB_URI` | ✅ · ⚠️ m5: `PUBLIC_ORIGIN` accepts any URL |
| S8 | Client IP for the auth rate limit behind proxies | ⚠️ m7 (a deployment risk, not verifiable here) |

---

## 3. Bugs, ordered by severity

### Major

#### M1. A concurrent retry with the same idempotency key gets a refusal instead of the stored result

- **Where:** `apps/server/src/services/actionService.ts:144-158` and `apps/server/src/services/requestKey.ts:48-62`. After a `VersionConflict` or a transient write conflict, the loser re-runs the rules against the winner's state. The rules refuse (`NOT_ENOUGH_ENERGY`, `SHIFT_ALREADY_WORKED`, `ALREADY_IN_JOB`, `NO_STAT_POINTS`), and that `GameError` is rethrown at `:157` / `:60` before anyone looks up the stored log. The E11000 path that returns the stored result is only reached when the re-run *succeeds*, which is why the existing "5 concurrent at 100 Energy" test passes.
- **Steps:**
  1. Character at 10 Energy.
  2. Send `action.perform` ×1 canvass three times at once with the same `idempotencyKey`.
  3. Alternatively, send `job.take` three times at once with one key, or `placeStatPoint` with one point pending, or a shift.
- **Expected:** every copy returns the identical stored result (ADR 0002: "a retried key returns the stored result byte for byte"; ADR 0008 for non-action mutations).
- **Actual:** one copy succeeds; the others get `PRECONDITION_FAILED NOT_ENOUGH_ENERGY`, `SHIFT_ALREADY_WORKED` or `NO_STAT_POINTS`, or `BAD_REQUEST ALREADY_IN_JOB`. The state is always correct: nothing is applied twice.
- **Impact:** when a connection drops mid-request and the client retries while the first request is still in its transaction (the client retries only on network errors, with the same key), the player sees "Not enough Energy" or "Shift already worked" for an action that went through, and never sees its result modal.
- **Fix idea (developer):** before rethrowing a `GameError`, and before each retry, check the stored log (`storedLog` / `stored()`); or read the log inside the transaction first.
- **Tests:** four `it.fails` in `apps/server/test/qa.server.test.ts` ("BUG: job.take / placeStatPoint / action.perform at the Energy limit / a shift…"). Remove `.fails` once fixed.

#### M2. The map hides half the locations at first view, and the keyboard can't reveal them

- **Where:** `packages/ui/src/components/CityMap.tsx:66-73`. The map image *covers* the box (`contentW = max(w, h × aspect)`) and centres on pin 1.
- **Steps:** sign up at 375×812 → "To the city".
- **Expected:** the player can see and tap every place. The `MobileCity` mockup places all pins inside the phone frame. Tech design §12.2 promises "numbered hotspots … 44 px targets". Pillar 7 asks for one tap.
- **Actual:**
  - **Phone:** Union Hall, Foundry Row and The Anchor are off-screen; the pin boxes sit at x = 474, 412 and −50 on a 375 px screen. There is no list, no arrow and no hint to pan.
  - **Desktop 1440×900:** The Anchor's pin (y 876–920) sits under the 30 px ticker line.
  - **Keyboard:** Tab focuses an off-screen pin without panning it into view (WCAG 2.4.11 Focus Not Obscured). Focusing it can also pan the map so that pin 1 leaves the screen.
- **Impact:** today's orders need exactly these places ("Keep your ears open" at The Anchor or the Quays; "Sharpen up" at the Union Hall, Foundry Row or the Quays). The Union Hall is the only INT training and council location. A tester who never pans will judge a 3-location game. The developer recorded this as a deviation ("some pins start off-screen until the map is panned"); I rate it major because the slice's question is asked on phones.
- **Fix ideas:** on narrow screens, fit the pins' bounding box as the initial view (contain, not cover), or add a small "Places" strip or list under the plate; pan to a hotspot on focus; keep the ticker off the map area on desktop, or inset the initial view by it.
- **Tests:** `test.fail` ×3 in `apps/client/e2e/qa.spec.ts` ("BUG: every location pin is on screen…", "BUG: focusing an off-screen pin…", "BUG: pin 6 (The Anchor) is visible…").

### Minor

#### m1. "While You Were Away" tells a jobless player "0 days of half pay banked (0 Iron)"

- **Where:** `packages/content/src/data/headlines.ts:82-90` (the `hl.away` deck); `{days}` and `{iron}` come from the salary at `apps/server/src/services/edition.ts:65-66`.
- **Steps:** sign up, take no job, come back 2+ days later.
- **Actual:** "0 days of half pay banked (0 Iron). Rested is full. The ward is where you left it."
- **Expected:** a line that makes sense without a job. Content §7.4 assumes a job; this is the most common first return.
- **Owner:** game designer (a no-job variant, or a condition), then developer.
- **Test:** `it.fails` "BUG: a player without a job, away 3 days…" in `qa.server.test.ts`.

#### m2. On a phone, the result modal's Again / Continue sit below the fold

- **Where:** `packages/ui/src/components/ResultModal.tsx:318-365`. The buttons end a scrolling column and are not sticky.
- **Measured (e2e):** the ×3 modal's content is 1,068 px on an 812 px screen, with Continue at y ≈ 1,008. It is longer still with the level-up panel.
- **Expected:** the `MobileMission` mockup keeps Again ×1 / Again ×3 / Continue on the first screen. Content §0 wants a bar spendable in 2–3 minutes; every Again ×3 now needs a scroll first.
- **Fix idea:** a sticky footer for the three buttons.

#### m3. Touch targets under 44 px

- The modal's attempt rows (tap for the breakdown) are 343×32: `ResultModal.tsx:372-380`.
- The HUD "n points to place" badge is 103×32 (`min-h-8`): `packages/ui/src/components/HudBar.tsx:102`.
- The "Sign in" / "Sign up" text links are 46×20. These are inline, so WCAG exempts them, but they are below the project's 44 px rule.
- **Test:** `test.fail` "BUG: touch targets are at least 44 px…".

#### m4. ×3 training can never be pressed on a 100-Energy bar

GDD §8.5 and content §2.4 define ×3 as three points at rising costs, disabled when Energy is short:

- INT 12 needs 138 and STR 10 needs 126, but the bar holds 100.
- AGI works only at AGI 5 (30 + 32 + 34 = 96) and never after.

The ticket permanently shows "×3 needs 138 Energy", a goal the player can never reach. The GDD and the code agree, so this is a **design issue for the game designer**: hide ×3 when its cost exceeds max Energy, or cap the batch at the affordable points.

#### m5. `PUBLIC_ORIGIN` accepts any URL

- **Where:** `apps/server/src/env.ts:20`. `z.url()` accepts `localhost:5173` (the scheme becomes "localhost:"), `ftp://x.test` and `http://localhost:5173/app`.
- **Impact:** a typo passes start-up, and then every cookie-carrying auth call fails the origin check.
- **Expected:** fail fast on an http(s) origin without a path.
- **Test:** `it.fails` in `apps/server/test/qa.http.test.ts`.

#### m6. Contrast 4.38:1 on the Again ×3 Energy cost

- **Where:** `ResultModal.tsx:341`. The teal `text-energy` (#6FB3B0) on the secondary button's `ink-2` (#3A4043) at 13 px.
- **Expected:** ≥ 4.5:1. The cost on Again ×1, on `ink`, passes.

#### m7. The auth rate limit may not see the real client IP once deployed

- **Where:** `apps/server/src/app.ts:36` (`trustProxy: true`) and `createAuth` (no `advanced.ipAddress` settings). Better Auth 1.7 reads `X-Forwarded-For`:
  - With **one** address and no `trustedProxies`, it trusts that address. Anyone who can reach the API origin directly can spoof it and bypass the per-IP limit.
  - With **more than one** address (Vercel → Railway may append a hop), it resolves no IP and falls back to **one shared bucket per path**. That would make the strict sign-in limit global for all players.
- **Status:** not verifiable before provisioning.
- **Fix idea:** set `advanced.ipAddress.trustedProxies` / `ipAddressHeaders` for the real topology, and check the "could not determine a client IP" warning at the first deploy.

### Nits

| # | Where | What |
|---|---|---|
| n1 | `headlines.ts:37-44` (`hl.level-up`) | After an absence the deck reads "…spent 0 Energy on the ward yesterday"; the headline says "Coalport Recruit" even at Rank 2+ (designer) |
| n2 | `headlines.ts:28-35` (`hl.rank-up`) | The deck hard-codes "Recruits become Activists", which is wrong under "Made Organiser" at Rank 3 (designer) |
| n3 | `apps/client/src/components/AppShell.tsx:53` | Banner reads "The morning paper is in"; tech design §10.1 says "The Clarion is in" (the paper's name is available from `paper.today`) |
| n4 | `apps/client/src/routes/me.tsx:136` | The Me tab's job card says "No job yet · take one below", but there is no Jobs card below on Me |
| n5 | `apps/client/src/routes/signup.tsx:33` | "Join the struggle" is hard-coded in the client and not in content; "struggle" is borderline for the no-war-framing rule. Designer to review |
| n6 | `apps/server/package.json:20` | `@fastify/cors` is a dependency but never registered (correct for ADR 0001); remove it to avoid a future accidental `origin: true` |
| n7 | `apps/client/e2e/session.spec.ts:32` | Asserted the shared Coalport meter starts with "70." — brittle once any earlier spec moves the meter (it failed after the QA spec ran first). **Fixed in test code** (format only) |
| n8 | `packages/ui/src/components/Ticket.tsx:149-155` | A disabled ×3's reason is in `title` only (not `aria-describedby`); the visible hint covers it when ×1 is enabled |
| n9 | content §2.3 texts | Pillar 7 / CLAUDE.md say "2–3 lines"; the bodies are 3–4 sentences and wrap to 4–6 lines at 375 px (designer's call) |
| n10 | HUD, tickets, modal | Caps labels at 8–10 px ("ENERGY" 8 px, "SOON" 8 px). They match the mockups; a readability watch item for the playtest |
| n11 | `apps/server/src/app.ts:46-54` | The test clock accepts negative offsets and has no auth. Acceptable for memory-mode-only tests; noted |
| n12 | `apps/server/src/env.ts` (`HOST` default `0.0.0.0`) | `pnpm dev:mem` serves the API on the LAN with the dev secret published in `package.json`. Consider `127.0.0.1` for dev |

---

## 4. GDD vs code: disagreements and which is right

| Topic | GDD / design says | Code does | My view |
|---|---|---|---|
| §4.3 rule 2 "One missed day can never break a streak" | vs §9.1: the third miss in a week ends it | Follows §9.1 | **§9.1 and the code are right** (the designer's worked example in answer Q1 agrees). §4.3 should say "a single missed day" (designer to reword; I did not change the GDD) |
| §8.5 ×3 training | "×3 trains three points … disabled when Energy is short" | Faithful | Both agree, but the rule makes ×3 unusable at max 100 Energy (m4). Design change needed, not code |
| Tech design §10.1 banner copy | "The Clarion is in" | "The morning paper is in" | Tech design (n3) |
| Content §2.5 "+5 max HP (stored)" | Tech §5.1: derived, not stored | Not stored | Tech design: GDD §5.3 only says +5 per level; storing would duplicate `level` |
| Content §7.4 `hl.away` deck | Assumes a job | Prints 0 without one | Neither covers it: a content gap (m1) |

Everything else I checked agrees with the GDD numbers.

---

## 5. Tests added (not committed)

| File | Tests | What it covers |
|---|---|---|
| `packages/rules/test/qa.gdd.test.ts` | **41** | §8.4 exhaustive formula / clamp / bands; two-stat averages; Standing in the odds (incl. a threshold crossed mid-×3); §5.5 table for every Energy cost; Rested 0–10; order bonus; §5.3 table and multi-level; Rank; PC cap; §8.5 training costs, XP and refusals; §14.2 Neutral-first drain to 95 and the home floor; §9 pay and streak tables; Sunday-before-Monday; 14-day cap; a lazy = eager property test (400 random schedules); lazy Energy and Rested; majority rule; orders rotation; night |
| `packages/content/test/qa.content.test.ts` (+ `raw.d.ts`) | **12** | Parses `docs/design/slice-1-content.md` and `docs/GDD.md` (Vite `?raw` imports) and compares: locations, all 21 actions and their reward columns, every Success / Partial / Worked / Trained text word for word, jobs, the 12 orders, the ambient pool, the 19 kinds, the §12.1 copy; text length; no war framing; no extremist references |
| `apps/server/test/qa.server.test.ts` | **24** (5 `it.fails`) | Permissions on every procedure; forged input; cross-character keys; concurrency (same key, different keys ×1 / ×3 / mixed, jobs, switches, stat points, shifts); refusals with nothing spent; `KEY_REUSED`; exactly one paper per touched day; 30 days away; Energy and Rested with no writes; order rotation; the weekend streak; the §13.1a payload of a ×3 and of a council action. Bug reproductions M1 ×4 and m1 |
| `apps/server/test/qa.http.test.ts` | **9** (1 `it.fails`) | No CORS; 415 for form and text bodies; cookie attributes; forged cookie; no GET mutations; test clock absent; env rules for hooks and secrets. Bug reproduction m5 |
| `apps/client/e2e/qa.spec.ts` | **13** (4 `test.fail`) | 375×812: the full loop with sign out and in; out of Energy; switch, train and place a point from the HUD; keyboard only; measured modal height. 1440×900: the loop with dock, ticker and side panel. The paper due again after 3 h (test clock). Production-only CSRF and CORS. Bug reproductions M2 ×3 and m3 |
| `apps/client/e2e/session.spec.ts` | 1 line changed | n7: the opinion assertion now checks the format, not "70." |

Bug reproductions use `it.fails` / `test.fail`, so the suite stays green while the bugs are open. When a bug is fixed its test turns red, as a reminder to drop the annotation.

---

## 6. Command output (real runs)

| Command | Result |
|---|---|
| Baseline before any QA change: `pnpm art:check && pnpm turbo lint typecheck test build` | exit 0, 20/20 tasks (all cached from the developer's run) |
| `pnpm art:check` | `art:check ok: 5 assets, 3.24 MB` |
| `pnpm turbo lint typecheck test build --force` (final, uncached) | **exit 0 · 20/20 tasks successful · 0 cached** · rules 14 files / **182 passed** · content 2 / **36 passed** · db 2 / **15 passed** · ui 2 / **20 passed** · server 8 files / **65 passed + 6 expected fail** |
| `pnpm e2e` (final) | **17 passed (35.0 s)**: the 4 existing specs plus 13 QA tests, 4 of them expected failures that did fail as expected |
| Along the way | My first two full runs failed on my own test typing (the content package has no Node types; a generic in a server test). Both were fixed in the tests before the final runs. The first e2e run also exposed the brittle `session.spec` assertion (n7) |
| Clean-up | `dev:mem` stopped. Ports 3001, 5173, 27018, 3101 and 4173 have no listeners. No `mongod`, `turbo` or QA-started `node` process is left (the remaining `node.exe` processes are WebStorm and another project, started before this session) |

**Not verified here:** CI on GitHub, the Vercel cache header in production, Docker, a real phone, a screen reader, the real deployed proxy chain (m7).

---

## 7. Playtest checklist for slice 1

**Question:** *Is spending a bar of Energy fun, and do players want to come back in 3 hours?*

### Before the playtest
- [ ] Fix **M2** (or at least add a visible "Places" list): otherwise testers on phones judge a 3-location city. Fix M1 if time allows.
- [ ] Decide m4 (dead ×3 training button) and m1 (the jobless "While You Were Away" copy); both are in the first two sessions of every tester.
- [ ] Deployed build; `pnpm report:playtest` runs against the playtest database; `txAttempts` is logged.
- [ ] 5–10 testers, ≥ 70 % on phones; half have never seen the game; each uses their own account (no shared devices).
- [ ] Tell testers only: "Play when you like, for as long as you like, over three days." Do not mention the 3-hour refill.
- [ ] Note each tester's time zone: the day turns at 00:00 UTC (01:00–02:00 in Central Europe, afternoon in the Americas).

### Session 1 (observe, ideally over a screen share; don't coach)
- [ ] Time from sign-up to the first tap on an action (target: under 60 s after "To the city").
- [ ] Do they read the paper, or tap "To the city" at once? Do they notice Holm's three orders?
- [ ] Do they find all six places without help (M2)? Do they pan the map?
- [ ] Time to spend the first full bar and the number of taps (content target: 2–3 minutes, about 10 taps or 4 ×3 runs).
- [ ] ×3 share of taps in session 1. Do they understand the "n of 3" stamp and the three rows?
- [ ] Do they scroll the result modal, or hit Continue without reading? Do they use Again ×1 / ×3 from the modal (m2)?
- [ ] Do they take a job and work the shift on day 1 (the order nudges it on some days only)?
- [ ] Level 2 arrives in session 1: do they place the stat point at once, choose "Later", or miss it?
- [ ] At empty Energy: do they read the out-of-Energy card ("full at hh:mm", "Rested banks once you're full")? What do they say they'll do next?

### Returns (from telemetry, `pnpm report:playtest`)
- [ ] **Share of returns within 2–4 h** of the previous session (the headline number). Suggested success bar for the designer: ≥ 40 % of day-1 returns fall in 2–4 h.
- [ ] Median time between sessions; sessions per day (the model: casual 2, reference 3, regular 4).
- [ ] Energy per session (a full bar is ≈ 100; well below it means the loop stops being fun before Energy runs out).
- [ ] Paper read rate on return; orders completed per day (target: all three on most days for a daily player); shifts per day.
- [ ] Levels at the end of days 1 / 2 / 3 against the economy sheet's reference (4 / 6 / 8).
- [ ] The share of action transactions with `txAttempts > 1` (ADR 0010: contention on the Coalport document).
- [ ] Any `ACTION_CONFLICT` or `KEY_REUSED` in the server logs (M1 shows as a refusal right after a network error).

### Questions after day 1 and day 3 (short, open)
1. "When you ran out of Energy, what did you want to do?" (hoping for: come back later, not quit)
2. "What made you come back?" (paper, orders, the shift, a level, Rested, a reminder of your own?)
3. "Which tap felt best? Which felt pointless?" (watch for the 38–46 % off-stat actions and intel's small rewards)
4. "Did ×3 feel like a shortcut or like skipping the fun?"
5. "Did you understand what the Coalport number and your Standing do?"
6. "Was anything too small to read or hard to tap?" (m3, n10)
7. "Anything that felt like homework, or that you felt you had to be online for?" (pillar 7 / rule 4)

### Answer the question
- **Fun:** most testers spend a full bar in one sitting without prompting, use ×3 willingly, and name at least one tap they liked.
- **Come back in 3 hours:** the 2–4 h return share and the day-2 / day-3 retention from the report, weighed against the interview answers about *why* they returned.
- Record any finding that points at the rules (odds, rewards, pacing) for the game designer, and any that points at the UI (M2, m2, m3) for the developer.

---

## 8. Fix round 1

Developer, 29 Sep 2026. Design answers applied from `docs/design/slice-1-content.md` §13. Every QA expected-failure marker is now a normal passing test; no QA assertion was weakened (the m4 training tests were rewritten to the new ×1-only rule).

| ID | Status | What changed / why |
|---|---|---|
| **M1** | Fixed | `actionService.ts` and `requestKey.ts`: after a version miss, a day change, E11000 or a game-rule refusal, the stored result for the key is looked up and returned before retrying or refusing (`mayHaveLostToSameKey` in `txn.ts`); also once more before `ACTION_CONFLICT`. Covers `action.perform` ×1 / ×3, training, shifts, `job.take` and stat points. The 4 `it.fails` pass; a training + ×3 same-key test was added. ADRs 0002 / 0006 / 0008 unchanged in substance |
| **M2** | Fixed | `CityMap.tsx`: the first view fits every pin (the mockup's approach: the image may be narrower or shorter than the box), clear of overlays marked `data-map-overlay` (the phone plate and orders panel); zooming out stops at that view. A pin focused by keyboard is panned into view instantly, and the browser's focus scroll of the clipped wrappers is undone. Desktop 1440×900: all pins inside the map, none under the ticker. Checked by hand at 375×812 and 1440×900 with `pnpm dev:mem`; new e2e for zoom-in + keyboard focus |
| **m1** | Fixed (design §13.1) | `hl.away` needs ≥ 1 half-pay credited; new `hl.away-no-job` for 0. New condition `halfPaysCredited` |
| **m2** | Fixed | Result modal buttons are a sticky bar at the bottom (Again ×1 · Again ×3 · Continue always on the first screen). Checked by hand at 375×812 |
| **m3** | Fixed | Attempt rows and the HUD "point to place" badge are 44 px tall; the "paper is in" banner too. The inline Sign in / Sign up text links are unchanged (inline, WCAG-exempt) |
| **m4** | Fixed (design §13.2) | Training is ×1 only: rules (`resolveTraining` has no `times`), server refuses `times: 3` with `TRAINING_IS_ONCE`, ticket shows one Train button, Trained modal offers Again ×1 · Continue, `again.cost3` / `energy3` are null for training |
| **m5** | Fixed | `PUBLIC_ORIGIN` must be an http(s) origin with no path, query, fragment or credentials; a trailing slash is normalised |
| **m6** | Fixed | New token `energy-light` (#80c0bd, 5.11:1 on ink-2) for the Again ×3 cost |
| **m7** | Fixed, deploy check pending | `TRUST_PROXY` (default 2 hops: Vercel rewrite → Railway/Fly edge, or a CIDR list) sets Fastify `trustProxy`; the auth bridge passes `request.ip` to Better Auth in its own header (`advanced.ipAddress.ipAddressHeaders`), replacing any client copy. Assumption documented in `env.ts` and `.env.example`; a hop count also trusts direct callers of the API origin. To verify at the first deploy |
| n1 | Fixed (design §13.5) | `{rank}` is the current rank title; `hl.level-up` (Energy yesterday ≥ 1) / `hl.level-up-quiet` (0). New condition `energyYesterday` |
| n2 | Fixed (design §13.5) | `hl.rank-up-2`, `hl.rank-up-3`, `hl.rank-up` (≥ 4); `rankRose` takes `values` / `min` |
| n3 | Fixed | Banner "The Clarion is in" from the new `paper.shortName` |
| n4 | Fixed (design §13.7) | Me tab: "No job yet · take one at Mill Gate, Market Row or Harbour Quays", built from the home city's places with a Jobs card |
| n5 | Fixed (design §13.4) | "Join the campaign" / "Sign in" in `copy.ts` (`signupTitle`, `loginTitle`) |
| n6 | Fixed | `@fastify/cors` removed (lockfile updated) |
| n7 | Fixed by QA | — |
| n8 | Fixed | The ×3 button is `aria-describedby` the hint |
| n9 | Fixed (design §13.7) | Content loader refuses an outcome text over 240 characters or 4 sentences; all current texts pass |
| n10 | Won't fix now | Designer: playtest watch item |
| n11 | Fixed | The test clock refuses negative offsets (still memory-mode only, no auth) |
| n12 | Fixed | `HOST` defaults to 127.0.0.1; the Dockerfile sets 0.0.0.0 |
| Also | Done | Job blurbs (design §13.6); streak headlines "…and Counting" |

**Final run:** `pnpm art:check` ok (5 assets, 3.24 MB) · `pnpm turbo lint typecheck test build --force` 20/20 tasks, 0 cached (rules 182, content 38, db 15, ui 24, server 77, no expected failures left) · `pnpm e2e` 19 passed.
