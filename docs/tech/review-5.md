# Review 5 fix round — technical design

| | |
|---|---|
| **Goal** | Answer the user's Design Review 2 (twelve notes, plus the modal note of answers §17) on the built slices 0–5:<br>• **the result modal fits** a phone without scrolling;<br>• **the level-up picker is three paper cards**;<br>• **the sky has fewer, larger clouds**;<br>• **a job that asks more pays more**;<br>• **any infirmary patches you up for Iron**;<br>• **the Places list becomes *What's here***;<br>• **rival ground gets a header with a goal and a prize**;<br>• **the town's day is six hours**, with **night windows on content**, a riskier night on rival ground and **a random patrol stop**;<br>• **the new opening** is planned and waits on the user's pick |
| **Question** | **Does each note read as answered, in play?** §16.3 is the per-note checklist |
| **Builds on** | Slices 0–5 and the review-4 round as built on branch `slice-0`, **plus this round's quick fixes at `6142de8`** (fix list 1–3): Health under Energy, the thin scroll bars, the result's middle as its only scrolling box, the level-up as one line and *Place it* opening a sheet, and the journey card that can't be skipped. HEAD `cba1833` adds only design documents |
| **Design inputs** | `docs/design/review-5-answers.md` (cited *answers §n*): §15 is the fix list, §16 holds the decisions and the openings, §17 the compact modal.<br>The user's notes: `docs/review/2026-10-08-review-5.md`.<br>GDD §0 (*Added 8 Oct 2026*), §2.2, §5.3, §9.2, §13.1, §13.1a, §14.10–§14.13, §18.3, §19.1, Appendix C #96–#104.<br>`docs/economy.md` §25.<br>The review-5 addenda in `slice-2-onboarding.md`, `slice-2-cities.md`, `slice-5-risk.md`, `slice-5-screens.md` and `slice-7-nation.md`.<br>`docs/tech/review-4.md` and ADRs 0073–0078 |
| **ADRs** | [0079 the six-hour game day](../adr/0079-the-six-hour-game-day-one-night-seam-and-a-night-block-in-the-views.md) · [0080 night windows and the night run-in](../adr/0080-night-windows-on-content-and-the-night-run-in-on-rival-ground.md) · [0081 the patrol stop](../adr/0081-the-patrol-stop-a-seeded-roll-per-bucket-on-the-city-read.md) · [0082 the push by party and the Unrest prize](../adr/0082-the-push-ring-on-the-city-and-the-unrest-prize-as-an-award.md) |
| **Environment** | **Local only**, played in `pnpm dev:mem` with the dev panel. **No migration is needed** (§11): every new field reads absent as its default. No new dependency |

Every number below is a GDD or answers number. Where the design leaves a point open, this document takes a default and lists the question in §21.

---

## 1. Scope

**In** (answers §15 items 4–8 and 10–12, §16.1, §16.7 and §17, grouped into nine features):

| # | Feature | Answers | Section | Phase |
|---|---|---|---|---|
| F1 | **The six-hour game day:** `GAME_DAY_HOURS`, `NIGHT_HOURS`, `isNight`, `nextDusk`, `nextDawn`, the server's night seam, the views' night block, the plate's dusk line, the clock's note. **The night on rival ground while acting:** run-in base 25 and +10 on missions, police half the pool, the *Night · patrols out* tag | §11, §12.2 rule 1, §16.1 | §3 | 1 |
| F2 | **The compact result modal:** the picture by height, *How it went* only when it says something, tags on one line, the receipt's *Details*, three knock-ons and *n more* | §17 (fix list 2, rewritten) | §4 | 2 |
| F3 | **The level-up picker as three paper cards** inside the built *Place it* sheet, and inline on the Me tab | §3 (fix list 4) | §5.1 | 3 |
| F3 | **Clouds:** three main clouds and two wisps by day, a config change | §2 (fix list 5) | §5.2 | 3 |
| F4 | **The job ladder:** Driver 240, the pinned table, the rung content test | §5 (fix list 7) | §6.1 | 4 |
| F4 | **Treatment:** *Get patched up · n Iron* at every infirmary | §8 (fix list 8) | §6.2 | 4 |
| F5 | **Night windows:** `window: 'night'` on twelve ways and four new night missions, and the night rate | §12.1 (fix list 12) | §7 | 5 |
| F6 | **The patrol stop:** a seeded roll per ten-minute bucket on the city read, the pending card, `patrol.answer` | §12.2 rule 2, §16.1 | §8 | 6 |
| F7 | ***What's here***: Issues, missions you can start and the *n more* line, your orders here, then the places | §9 (fix list 6) | §9 | 7 |
| F8 | **The rival header and the Unrest prize:** the push bar by party, the danger word, the goal, +50 Party XP, a headline, the Legacy hook | §10 (fix list 10) | §10 | 8 |
| F9 | **The opening**, version D, E or G: strings only, **after the user picks** | §16.2–§16.6 (fix list 9) | §12 | 10 |

**Already built at `6142de8`** (verified in phase 0, not designed here): fix list 1–3. That covers the journey card's put-aside row and *Continue* after a row, the 6 px scroll bars, the result's middle as the only scrolling box, the level-up line with *Place it*, and Health under Energy.

**Out:** §19.

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| Where night is computed | **`packages/rules`**: `GAME_DAY_HOURS = 6`, `NIGHT_HOURS = 2`, `isNight`, `nextDusk`, `nextDawn`, `nightKey`, aligned to the City Day so 00:00 UTC is a dawn. `DAY_NIGHT` is removed | ADR 0079, §3.1 |
| Who reads it on the server | **One seam**, `services/night.ts` `nightAt(now) → NightView`. A test-only override (`clock` / `day` / `night`): Playwright and the server's Vitest setup pin **day**; `dev:mem` follows the clock | ADR 0079, §3.2 |
| How the client turns at dusk | The views carry **`night: NightView`**. The client refetches the view at `changesAt` + 0–20 s jitter and **never calls `isNight` itself** | ADR 0079, §3.3 |
| The night while acting | `runInChance({ night })`: on rival ground, tier 1 is **25** and a mission is **×2 then +10**. `pickOpponent({ night })`: police half. Read at the act's time | ADR 0080, §3.4 |
| Night windows | `Mission.window` and `Way.window` (`'night'`). `windowLock` gives **`MISSION_LOCKED { lock: 'NIGHT', opensAt }`**, refused before the key. Night missions never make the mission order offerable | ADR 0080, §7 |
| The night rate | A mission whose own window is `night`: an Iron part `nightRate` (+25 % of base) and a tag. Never Party XP | ADR 0080, §7.2 |
| Patrol state | **Embedded** `characters.patrol { nights[], quietUntil, card }` | ADR 0081, §8 |
| When a patrol rolls | **Only in `city.get`**, for the city the player stands in, at night, on rival ground, free, outside the quiet and under the cap. **One seeded roll per bucket** (`characterId:cityId:bucket`). One version-guarded `findOneAndUpdate`; reads inside a rolled bucket write nothing | ADR 0081, §8.3 |
| The pending card | **Holds Energy acts and boarding** (`PATROL_PENDING` from `notFree`). It never resolves itself. `patrol.answer` is request-keyed and uses the journey card's rules at 14 | ADR 0081, §8.4; §21.1 Q8 |
| The quiet | `$max` on `patrol.quietUntil`: arrival + 10 min (the arrival settlement), run-in + 15 (`startRunInInTx`), stop + 15 | §8.3 |
| The push by party | `rivalPressure.byFaction` (today) and `week[]` (six days before), written by `moveOpinion`'s existing `$set` | ADR 0082, §10.1 |
| The Unrest prize | Decided in `processBoundary` by a pure `unrestEntry`. **Awards** `kind: 'unrest'`, `fxp: 50`, unique per entry and member, credited by the settlement. City `unrestPrize { entry, paidDay }` | ADR 0082, §10.3 |
| Treatment | Rules `treatmentPrice`, `treat`. **`character.treat({ locationId, idempotencyKey })`** with `withRequestKey`. The price is live on the client from the Health timer, and the server charges the price at the act | §6.2 |
| *What's here* | `CityView.whatsHere { missions[], more[] }` from the same gates as the tickets. Issues and orders come from existing views. `PlacesList` → `WhatsHere` | §9 |
| The compact modal | **Client only.** The server's breakdown is unchanged (rule 6). Pure helpers `howItWent`, `knockOnLines`, `fitTagCount` in `packages/ui` | §4 |
| Jobs and migrations | **No new job**: the prize rides the city-day boundary. **No migration** | §11, §14 |
| The opening | A separate last phase, **strings and one content test only**. Nothing depends on it | §12 |

---

## 3. F1 — The six-hour game day, and the night while acting (answers §11, §12.2 rule 1; GDD §2.2, §14.12; ADR 0079, 0080)

### 3.1 Rules (`packages/rules/src/constants.ts`, `day.ts`)

```ts
/** §2.2 (review 5, ADR 0079): the town's day is six hours; night is its last two. */
export const GAME_DAY_HOURS = 6;
export const NIGHT_HOURS = 2;

export function gameDayStart(now: number): number;   // the six-hour block holding `now`, aligned to CITY_DAY.utcOffsetMs
export function isNight(now: number): boolean;       // now − gameDayStart(now) ≥ (GAME_DAY_HOURS − NIGHT_HOURS) h
export function nextDusk(now: number): number;       // the first dusk strictly after `now`
export function nextDawn(now: number): number;       // gameDayStart(now) + 6 h (always strictly after `now`)
export function nightKey(now: number): number | null; // floor((now + offset) / 6 h) at night; null by day
```

- **The window's edges:** dusk is inclusive (04:00:00 is night) and dawn is exclusive (06:00:00 is day).
- `DAY_NIGHT` is deleted. Its two readers move: `isNight` here, and `HudBar`'s note in §3.3.

**Tests** (`packages/rules/test/review5.day.test.ts`; `day.test.ts`'s 20:00 / 06:00 table is rewritten):

- The table: 03:59 day · 04:00 night · 05:59 night · 06:00 day · 21:59 day · 22:00 night · 23:59 night · 00:00 day.
- `nextDusk` at 03:00 → 04:00, at 04:00 → 10:00, at 23:00 → 04:00 the next day.
- `nextDawn` at 05:00 → 06:00, at 01:00 → 06:00, at 22:30 → 00:00.
- **Over any real day the night totals 8 h in 4 windows**: a sweep at one-minute steps.
- **The City Day boundary is always a dawn:** `nextDawn` at 22:30 equals `dayStart(dayKey(now) + 1)`, and no other window crosses a `dayKey` change.
- Every slice 0–5 rules test with a day in it passes unchanged.

### 3.2 Server: the seam (`apps/server/src/services/night.ts`, new)

```ts
export interface NightView { night: boolean; nextDusk: number; nextDawn: number; changesAt: number | null }
export function nightAt(now: number): NightView;
/** Test only (ADR 0079): production never writes it. */
export const nightHooks: { mode: 'clock' | 'day' | 'night' };
```

- `changesAt` is `night ? nextDawn : nextDusk` on the clock, and `null` under `day` or `night`.
- **Every server reader moves to `nightAt`:**
  - `cityService` (`isNight`);
  - `travelService` (the nation view's `isNight`, the arrival's asset);
  - `art.ts`;
  - `ambitionService` (two scene assets);
  - the run-in and mission risk at the act (§3.4);
  - the patrol (§8).
- **The overrides:**
  - `E2E_NIGHT=clock|day|night` is read at start-up when `E2E_TEST_HOOKS` is set.
  - `POST /api/test/night { mode }` lives in `dev/riskRoutes.ts`, hooks only.
  - `playwright.config.ts`'s server env sets `E2E_NIGHT: 'day'`.
  - The server's Vitest setup file sets `nightHooks.mode = 'day'`. Review-5 night tests set `'clock'` with a seeded night time and restore it in `afterEach`.
- **The dev panel's status** (`dev/risk.ts`, `dev/types.ts`) shows `night`, `nextDusk` and the mode. The panel's clock jump gains *To dusk* (`nextDusk + 1 min`), as a pure helper in `dev/clock.ts`.

### 3.3 The views and the client

- **The `night: NightView` block:**
  - added to `CityView` (`isNight` stays for first paint), `NationView`, `JourneyView`, `TownHallView` and `HallView` (the hall header on the election and council screens, which today picks its art with `isNight(now)` in the browser);
  - the hall header and the journey map read it, not `isNight(now)` (`apps/client/src/routes/council.tsx:77`, `journey.tsx:364`).
- **`useNightTurn(night, queryKeys)`** (client hook): one `setTimeout` to `changesAt + random(0, 20 s)`, which invalidates the given queries. It is cleared on unmount and re-armed when the block changes. It is used by `city.tsx`, `nation.tsx`, `journey.tsx` and `council.tsx`.
- **The plate's line**, on every city plate (home, rival, capital overview and district):
  - `copy.night.plate(night, now)`, rendered through `copy.when`;
  - by day: *Dusk in 40 min* or *Dusk at 16:00*;
  - at night: *Night · dawn in 25 min* or *Night · dawn at 18:00*;
  - Courier 11, after the morale or ordinance line, ticking with `useNow(30_000)`;
  - its note is `help.clock`.
- **The clock's note:** `copy.help.clock(dayTurn)` takes one argument, with the answers §11.3 text. `HudBar` drops `DAY_NIGHT` (`HudBar.tsx:353`). The copy test at `review4.copy.test.ts:118` changes with it.
- **Clouds and art** need nothing: `CityMap` and `CloudLayer` already flip on `isNight`.

### 3.4 The night on rival ground while acting (ADR 0080)

**Rules** (`runIn.ts`, `missions.ts`, `constants.ts`):

```ts
RUN_IN.rivalTier1Night = 25;   // §14.12 (review 5)
RUN_IN.rivalNightAdd = 10;     // a mission's run-in at night on rival ground, after the ×2

runInChance(i: { …as today; night?: boolean }): number
//   tier 1, rival ground: night ? 25 : 15        tier 2, rival ground: base × 2 + (night ? 10 : 0)
//   then the Heat state, the record, Watched / Warned; clamp 0..90. At home or in a battleground `night` changes nothing.
pickOpponent(i: { …as today; night?: boolean; rivalGround?: boolean }): string
//   night on rival ground: the police half the time whatever the Heat state (as from Noticed)
missionRisk(i: { …as today; night?: boolean }): { heat; runInChance; marks }
```

**Server:**

- `actionService` (the rival tier-1 tap, `actionService.ts:358`), `missionService` / `missionCtx` (the way's risk and the pool) and the city view's tickets pass `nightAt(now).night`, with the act's or the read's `now`.
- **`PlaceTag { kind: 'night' }`** on rival ground at night:
  - its text is *Night · patrols out* and its note `help.patrols`;
  - every ticket there carries it;
  - the mission ticket's risk word follows from the new chance (*Dangerous* at night for any Heat).

**Tests:**

- Rules:
  - tier 1 on rival ground is 15 by day and 25 at night;
  - Hot at night is 25 + 15 = 40;
  - a mission at 20 on rival ground is 40 by day and 50 at night;
  - 50 Watched and Hot clamps to 90;
  - at home: 0 and the base unchanged;
  - `pickOpponent` at Cool on rival ground at night picks the police in about half of 2,000 seeded draws, and 0 % at home.
- Server (`review5.night.test.ts`, mode `clock`):
  - a Collective visitor's Duskwall view at 21:59 reads *Risky* with no `night` tag;
  - at 22:00 it reads *Dangerous* with the tag;
  - a rival tap at 22:30 with the run-in forced through the street hook draws its opponent from the night pool (the dev status shows the chance 25).

### 3.5 Shared groundwork in phase 1

- **Error reasons** (`GameErrorReason`, words in `copy.errors.*`):
  - `PATROL_PENDING { cityId }`;
  - `NO_PATROL`;
  - `FULL_HEALTH`;
  - the new `MISSION_LOCKED` lock value `'NIGHT'` with `{ opensAt, wayId? }`.
- **Copy blocks**, appended one per lane so conflicts stay mechanical: `copy.night.*`, `copy.patrol.*`, `copy.treatment.*`, `copy.whatsHere.*`, `copy.rival.*` (header), `copy.result.details` / `copy.result.more(n)`, `copy.statChoice.tags`. Each lane fills its own.
- **The place sheet's card slot** (review 4 §3.1) gains the Treatment card's position: Jobs · Lodgings · *In the cells now* · Treatment · the Town Hall's blocks.

---

## 4. F2 — The compact result modal (answers §17; GDD §13.1a)

**Client only.** The server already returns every figure (the attempts, the rows, the bonus tags, the reward lines with parts, the knock-ons). This feature decides which of them print by default and which wait behind a tap.

### 4.1 Pure helpers (`packages/ui/src/result.ts`, new, unit-tested)

```ts
export type HowItWent =
  | { kind: 'none' }                                   // ×1 Success: the stamp says it
  | { kind: 'reason'; text: string }                   // ×1 Partial / Failure: one italic line under the body
  | { kind: 'rows'; line: string; reason: string | null } // ×3: "1 · Success · +45 · 2 · Partial · +23 · 3 · Success · +45"
  | { kind: 'runIn' };                                 // the run-in's block as built (it is the thing that happened)
export function howItWent(r: ActionResult, reasons: BatchReasons): HowItWent;

/** How many whole tags fit in `available` px, leaving room for "· +n more" when any are cut. */
export function fitTagCount(widths: readonly number[], available: number, sep: number, more: (n: number) => number): number;

export type KnockOnKey =
  | 'placeIt' | 'card' | 'heat' | 'order' | 'issue' | 'ledger' | 'hook' | 'energy' | 'firstMission'
  | 'record' | 'morale' | 'trained' | 'pc' | 'standing' | 'branch' | 'item';
export interface KnockOnLine { key: KnockOnKey; height: 'line' | 'card' }
/** Every knock-on the result has, in the priority of answers §17.2 item 6 (+ §21.1 Q3 for the unranked ones). */
export function knockOnLines(r: ActionResult, o: { statPending: number }): KnockOnLine[];
export const KNOCK_ONS_SHOWN = 3;
```

**The priority.** The ranked part is answers §17.2 item 6; the rest is the default of §21.1 Q3:

1. a point to place (`placeIt`);
2. a rank-up, a Reputation step or the first-time Heat card (`card`);
3. Heat, with the record's line folded into it (`heat`, `record`);
4. the order's signed line or progress, and *all three done* (`order`);
5. Issue momentum (`issue`);
6. the election or ledger line (`ledger`);
7. the chapter hook (`hook`);
8. a trained stat (`trained`). Moved to first on a *Trained* result, where it is the result;
9. a morale crossing (`morale`) and the branch's endorsement (`branch`);
10. Political Capital (`pc`) and Reputation progress (`standing`);
11. Energy and Rested (`energy`);
12. *Missions remember* (`firstMission`).

An item or keepsake stays on the receipt (§21.1 Q2).

### 4.2 The layout (`ResultModal.tsx` `ResultBody`, `ArtHeader`, `Receipt`)

1. **The picture:**
   - `h-[112px]` by default, `[@media(min-height:800px)]:h-[136px]` and `[@media(min-height:900px)]:h-[150px]`;
   - the stamp is at 80 % under 800 px of height;
   - the caption band is unchanged.
2. **The title:**
   - Playfair 22 px under `sm`, 24 from `sm`;
   - the body 15 / 22 px.
3. ***How it went*** by `howItWent`:
   - no section for `none`;
   - one italic line for `reason`;
   - one Courier 12 line (and the reason) for `rows`;
   - `RunInBlock` as built for `runIn`;
   - the *How it went* kicker is dropped in every case.
4. **The tags on one line:**
   - `TagsLine`: Oswald caps 10 px, no boxes, joined with *·*;
   - a `ResizeObserver` measures the children's widths, and `fitTagCount` cuts the line at the last whole tag that fits, ending with *· +n more* (`copy.result.moreTags(n)`), whose tap opens *Details*;
   - a tag's words open its note, as the chips did;
   - the night rate's tag (§7.2) is one of them.
5. **The receipt:**
   - **at most four reward lines**: XP and Party XP keep their bar and one Courier note (the distance to the next Level or Rank only);
   - Iron and opinion are one line each, with no note;
   - a zero line is not printed;
   - ***Details ▾*** (`copy.result.details`) is a right-aligned Courier row at the receipt's foot that expands **in place**. It holds the parts notes of XP, Party XP and Iron (`partsNote`), the opinion's factors and meter line, the cut tags with their notes, and a ×3's per-row reasons. `aria-expanded` is set on it;
   - the middle may then scroll.
6. **The knock-ons:**
   - the first `KNOCK_ONS_SHOWN` of `knockOnLines`, each one line (Courier 12) unless it is a card;
   - the *Place it* line counts as one;
   - then ***n more ▾*** (`copy.result.more(n)`), a text row that expands in place. Nothing is dropped.
7. **The buttons:** as built.

**Under 800 px of height**, the *REWARDS* and *KNOCK-ON EFFECTS* kickers lose their 8 px top gap (answers §17.2's four pixels).

### 4.3 Tests

**UI** (`packages/ui/test/review5.result.test.tsx`):

- the `howItWent` table: ×1 Success, Partial, Failure, ×3 2 of 3, a run-in;
- `fitTagCount` with widths that fit, fit but one, and fit none;
- `knockOnLines` on a fixture with seven knock-ons gives three plus *4 more*, and a *Trained* result puts `trained` first;
- the receipt prints no note under Iron or opinion;
- *Details* reveals the parts and the meter and has `aria-expanded`;
- *n more* reveals the rest;
- no *How it went* heading on a ×1 Success.

**E2E** (`review5.spec.ts` #4, the measurements turned into assertions; the `overflow` helper is kept):

| Case | 390 × 740 | 390 × 844 | 1440 × 900 |
|---|---|---|---|
| ×1 Success (Mill Gate, `rolls: [1]`) | 0 | 0 | 0 |
| Mission with a level-up (Shipyard, `checkRoll: 1`, XP 3,499) | 0 | 0 | 0 |
| ×3 (Mill Gate, `rolls: [1, 99, 1]`) | ≤ 100 | 0 | 0 |
| ×1 Partial with its reason (`rolls: [99]`) | ≤ 100 | 0 | 0 |

The picture is measured at 112 / 136 / 150 px across the three heights.

**The street hook** (`StreetForce`) gains `rolls?: number[]`: each row's check roll for **any** action (home tier 1 included) while hooks are on, consumed once like the rest. Today `checkRoll` covers only missions and rival taps.

---

## 5. F3 — The picker cards and the clouds

### 5.1 The level-up picker as three paper cards (answers §3; GDD §5.3)

`StatPointsPanel` (`packages/ui/src/components/Shell.tsx`) is rewritten around a `StatCard`:

```ts
interface StatCardProps {
  stat: 'str' | 'int' | 'agi';
  value: number;                     // before
  line?: string;                     // copy.statChoice[stat](…), when the guide is known
  tags: Array<'mostUsed' | 'best'>;  // guide.lead === stat; guide.best.stat === stat
  state: 'ready' | 'placing' | 'dimmed' | 'placed';
  onPlace: () => void;
}
StatPointsPanelProps += { placed?: { stat: StatPointTarget; value: number } | null }  // the last point placed, for "Strength 9 · +1"
```

- **The card:**
  - a whole-card `<button>`, at least 56 px, with a 1.5 px ink border, no fill and square corners;
  - on the left, *Strength* in body 600 with the Courier line under it;
  - on the right, *8 → 9* in Playfair 20;
  - the tags (Oswald caps 10) at the top right;
  - it inverts on press;
  - `placing` sets `aria-busy` and the other two cards drop to 60 %;
  - `placed` reads *Strength 9* with a Courier *+1* in the success colour.
- **The heading:**
  - `copy.levelPointsToPlace(level, n)` is reworded to *Level 4 · one point to place* / *two points to place*;
  - with a second point waiting it reads *one more to place* and the cards are live again.
- **Then** the lead line, the footer and *Choose later · nothing is lost*.
- `copy.statButton` and the black blocks are removed.
- `tone: 'ink'` keeps paper cards on ink (the ticket-on-modal pattern).
- **Placement:** inline on the Me tab, and inside the built `BottomSheet` behind *Place it* in the result modal. The sheet closes after the last point, as built.
- **No server change.** The guide (`CharacterView.statGuide`) has `lead` and `best`. `placed` is client state from the last `stat.place` response.

**Tests:**

- UI:
  - three cards, each one button named *Strength 8 → 9* and so on;
  - the tags on the right cards, both on one card when they coincide;
  - `placed` shows *+1*;
  - no `bg-ink` button inside;
  - the heading's wording for one and two points.
- E2E: `review5.spec.ts` and `review4.spec.ts` move from `/^STR \d+ → \d+$/` to `getByRole('button', { name: /^Strength \d+ → \d+/ })`.

### 5.2 Clouds (answers §2)

**A config change** in `CLOUDS` (`packages/ui/src/clouds.ts`):

- **By day, the middle depth** draws from the pool `BIG` + `CLOUD` (five sprites):
  - a kind of count 2: size 0.48–0.62, `minPx` 420, `maxShare` 0.8, cross 140–190 s;
  - a kind of count 1: size 0.36–0.46, `minPx` 320, `maxShare` 0.6, cross 110–150 s;
  - both with shadow `{ opacity 0.22, dx 0.10, dy 0.18, blur 14 }`.
- **By day, the high depth:** wisps count 2, size 0.34–0.46, `minPx` 260, `maxShare` 0.6, opacity 0.5–0.7.
- **The puffs leave the day sky:** the high puff kind is deleted and `PUFF` is unused (delete the constant; the files may stay in `public/fx`).
- **By night:** the middle curls become count 2, size 0.26–0.36, `minPx` 220.
- `CloudLayer` needs nothing.

**Tests** (`clouds.test.tsx`):

- `spriteCount(CLOUDS.day) === 10` and `spriteCount(CLOUDS.night) === 8` (the `≥ 12` assertion at line 73 goes);
- no day kind other than the low mist has `size[0] < 0.34`;
- every day kind's `minPx` is at least 260.

The dev viewer at 1,440 px is the manual check (answers §15 item 5).

---

## 6. F4 — The job ladder and treatment

### 6.1 The job ladder (answers §5; GDD §9.2; economy §25.1)

- **Content** (`jobs.ts`): the four Drivers go to `dailyPay: 240`. A character already holding a Driver job is paid 240 from the next boundary (the wage reads content), so nothing is migrated.
- **The content test** (`packages/content/test/review5.jobs.test.ts`):
  - the pinned table: the twelve built job ids and their pay (vendors 100; the day-1 jobs 180 with `factionPayBonus` 0.2 except the Porter; Drivers 240);
  - **the rung rule**, per city:

    ```
    rung(job)     = [unlock.level, max(Object.values(unlock.stats ?? {}), 0)]   // compared lexicographically
    bestPay(job)  = max over factions of jobPay(job, f)                          // the member's fifth counted
    for jobs A, B in the same city with rung(B) > rung(A): B.dailyPay ≥ 1.1 × bestPay(A)
    ```

  - a fixture with a Driver at 200 fails it by name.
- **Tests that change with the number:** `load.test.ts:67`, `qa.content.test.ts:164`, `slice4.irongate.test.ts:385` and `qa.gdd.test.ts:423–477` (the rules' salary figures). `slice2.content.test.ts` reads the pay from `slice-2-cities.md`'s tables, which still print 200, so the test applies the dated addendum (Drivers 240, citing GDD §9.2). `docs/economy.md`'s figures are already updated.

### 6.2 Treatment (answers §8; GDD §19.1, §18.3)

**Rules** (`constants.ts`, `health.ts`):

```ts
export const TREATMENT = { perPoint: 1, minIron: 10 } as const;
export function treatmentPrice(missing: number): number;   // 0 when missing ≤ 0, else max(10, missing × 1)
export function treat(i: { health: HealthTimer; level: number; iron: number; now: number }):
  | { ok: true; price: number; before: number; after: number; health: HealthTimer }   // damage 0 at `now`
  | { ok: false; reason: 'FULL_HEALTH' | 'NOT_ENOUGH_IRON'; price: number };
```

The rules tests:

- 64 / 125 costs 61;
- 120 / 125 costs 10;
- 125 / 125 is `FULL_HEALTH`;
- 60 Iron for a 61 price is `NOT_ENOUGH_IRON`;
- the price is computed from the projection at `now`, so a regen tick lowers it.

**Content:**

- `Location.treatment?: { carer: 'matron' | 'sister' }`. The loader allows it only on `hospital` places and requires it on every one: Coalport's and Duskwall's Infirmaries and Ashford's County Infirmary get `matron`, St Agnes `sister`, and Clearwater's Sanatorium joins in slice 7.
- `copy.treatment.*` and `help.treatment` take answers §8.2's strings word for word: the kicker, the line, the Courier line, *Get patched up · n Iron*, *Needs n Iron*, *You're well · nothing to treat*, and the modal's stamp, headline and the two bodies.

**Server:**

- `LocationView.treatment: { carer } | null` on a hospital place, null while held there.
- **`character.treat`**:
  - input `{ locationId: z.string().min(1), idempotencyKey: z.uuid() }`;
  - `withRequestKey` with the new `RequestKind 'character.treat'`. Inside the transaction:
    1. the location must exist and be `hospital`, else `UNKNOWN_LOCATION`;
    2. it must be in `c.cityId`, else `NOT_HERE`;
    3. it must be open (`placeOpenFor`), else `ACTION_LOCKED { reason: 'QUARTER' }`;
    4. `notFree` gives `HELD`, `RUN_IN_PENDING` or `PATROL_PENDING`;
    5. a journey on the way gives `IN_TRANSIT`;
    6. then `treat`, giving `FULL_HEALTH` or `NOT_ENOUGH_IRON`;
    7. the write is `$set health`, `$inc { iron: −price, version: 1 }` under the version guard;
  - output: `PoliticalResult` with `act: 'treated'`, stamp *Patched up*, the headline and body by `carer`, and `knockOns.health { before, after, max }` and `knockOns.iron { before, after }`.

**Client:**

- `TreatmentCard` (`packages/ui`, the `JobsCard` shape) in the place card slot.
- **The live price** comes from the character view's Health timer (`healthNow`, `treatmentPrice`), recomputed with `useNow(60_000)`. The server charges its own figure, which can only be lower after a regen tick.
- The modal is `ResultModal kind="political"`. `'treated'` joins `CARD_ACTS`, so it rises as a card. *Continue* returns to the place's sheet.

**Tests:**

- Server (`review5.treatment.test.ts`):
  - a player at 64 / 125 pays 61 and is at 125;
  - the same key twice charges once and returns the same result;
  - two keys at once: one pays, the other gets `FULL_HEALTH`;
  - refused at full, held, in transit, with a pending run-in, short of Iron, at another city's infirmary, and at a non-hospital.
- E2E (`review5.spec.ts`, #8): the dev hook takes Health to 64, the card reads *Get patched up · 61 Iron*, the modal reads *Patched up* and the Health line, and the HUD reads 125.

---

## 7. F5 — Night windows and the night missions (answers §12.1; GDD §13.1; ADR 0080)

### 7.1 Content (`packages/content`)

- **Schemas:** `Way.window?: z.literal('night')` and `Mission.window?: z.literal('night')`. The loader enforces three rules:
  - a mission with a window has none on its ways;
  - a mission without one keeps at least one way without one;
  - (in `review5.night.content.test.ts`) at least one mission at each Level 6 / 8 / 10 / 12 has no window in each city where one exists today, so the ladder by day is complete.
- **The twelve night ways** (`window: 'night'`, strings unchanged): the `agi` way of
  - `coalport.far-bank.posters`, `duskwall.mountain-inn.posters`, `ashford.brewery.posters`;
  - `coalport.union-hall.spike`, `duskwall.beacon-house.spike`, `ashford.assembly-rooms.spike`;
  - `coalport.union-hall.roll`, `duskwall.beacon-house.roll`, `ashford.assembly-rooms.roll`;
  - `coalport.customs-house.watch`, `duskwall.checkpoint.watch`, `ashford.wharf.watch`.
- **The four night missions** (`window: 'night'`), from answers §12.1's table:
  - `coalport.customs-house.lorry`;
  - `duskwall.checkpoint.log`;
  - `ashford.brewery.dawn-shift`;
  - `irongate.tram-junction.last-tram`.

  Each takes its type, Energy (= the type's), Level, `requires.rank`, `target`, `pool`, its ways with their stats, and its briefing. **Outcome texts** (Success / Partial / Failure, ≤ 240) come from the designer (§21.1 Q6). Until then they are `TODO(game-designer)` stand-ins (the title as the Success headline, *Not quite* for the Partial), and the content test lists them as pending, not failing.
- **The ways' stats.** Answers §12.1 gives *Charisma + Intelligence* for the last tram's first way: `['cha', 'int']`, as `CheckStatsSchema` allows.

### 7.2 Rules (`missions.ts`)

```ts
export type ContentWindow = 'night';
export function windowLock(i: {
  mission: { window?: ContentWindow };
  way?: { window?: ContentWindow };
  night: { night: boolean; nextDusk: number };
}): { lock: 'NIGHT'; opensAt: number } | null;

export const NIGHT_RATE = { ironPct: 25 } as const;
export const NIGHT_RATE_PART = { id: 'nightRate', label: 'Night rate' } as const;
// finishMission / the mission's reward lines: `nightRate: boolean` (the mission's own window) adds
// `{ id: 'nightRate', amount: roundHalfUp(baseIron × 0.25) }` to the Iron line's parts, before the record's cut.
```

The tests:

- `windowLock` by day, at night and at 03:59 (with `opensAt` 04:00);
- a night mission's Iron at 100 base is 125 with the part;
- Party XP is unchanged;
- a night way in an ordinary mission has no part.

### 7.3 Server

- **The tickets** (`missionCtx`, the city view):
  - `MissionView.locked = { reason: 'NIGHT', opensAt }` for a closed night mission, after the existing gates. A Level or Rank lock wins: they are longer waits;
  - `WayView.night: { opensAt } | null`, and such a way is not tappable;
  - a remembered way that is night-locked loses its *Again* button. The ticket reads *Choose a way*.
- **`mission.start`:** `windowLock` runs before the key, with `MISSION_LOCKED { lock: 'NIGHT', opensAt, wayId? }`. A refusal is not stored, so the same key works at dusk.
- **Once started, a mission finishes as it started.** Its run-in, pending past dawn, keeps its rolled chance.
- **The night rate:** `missionService` passes `nightRate = mission.window === 'night'`, and the result's `bonusTags` gains `{ id: 'nightRate', label: 'Night rate', note: '+25 % Iron' }`.
- **The mission order:** `startableMissions(content, doc, cityId, today, { forOrders: true, night })` skips night missions and night-locked ways, so the mission order is offered only on day work (answers §12.1: *extra*). A night mission done at night still advances an open mission order.

### 7.4 Client

- `MissionTicket` shows the lock line *Opens at nightfall · dusk at 16:00* (`copy.night.opensAt(when)`), and the way row its own line.
- The briefing greys a night way by day with the same line.
- The *What's here* row (§9) reads the same lock.

### 7.5 Tests

- **Server** (`review5.night.test.ts`):
  - by day `mission.start` on the posters' `agi` way gives `MISSION_LOCKED NIGHT` with `opensAt`, and the `str` way plays;
  - at 22:30 (mode `clock`) the `agi` way plays;
  - the lorry by day is locked, and at night pays the night rate (with the receipt part and the tag) and no extra Party XP;
  - a key refused at 21:59 succeeds at 22:01;
  - `startableMissions({ forOrders })` at night does not count the lorry.
- **Existing server tests** that take the posters' `agi` way run under Vitest's pinned `day` (ADR 0079), so they would now be refused. **They move to `nightHooks.mode = 'night'` in their `beforeAll`**, keeping their meaning (the way, its odds and its run-in base unchanged): `qa.slice5.held`, `qa.slice5.street`, `review4.cells`, `slice5.fixround`, `slice5.hooks`, `slice5.integration`, `devPanel` (`:585`).
  - A night-mode file must not assert a rival-ground run-in chance. Where one does (grep `runInChance` / `chance:` in those files), the assertion moves to the night figure with a comment citing GDD §14.12.
- **E2E:** `missions.spec.ts`, `qa.slice5.spec.ts`, `qa.review4.spec.ts` and `rival.spec.ts` set `POST /api/test/night { mode: 'night' }` around the steps that take a night way, then restore `day`. A new step in `review5.spec.ts` reads the lock line by day.

---

## 8. F6 — The patrol stop (answers §12.2 rule 2, §16.1; GDD §14.12; ADR 0081)

### 8.1 Content

`JourneyEvent.deck` gains `'patrol'`. The event is `patrol.stop` (`journeyEvents.ts`), and it is never drawn on a train: the journey draws filter by `ordinary` and `hostile`.

- **title** *A patrol*; **setup** as answers §12.2.
- **The rows:**
  - `papers` *Show your papers*: unchecked, `gate: 'coolAndClean'`. `success` rewards `{}`; `partial` rewards `{ heat: 10, flag: 'watched' }`.
  - `talk` *Talk your way past*: `['cha']`. `success` `{}`; `partial` `{ heat: 5 }`.
  - `slip` *Slip down a side street*: `['agi']`. `success` `{}`; `partial` `{ heat: 5, flag: 'watched' }`.
  - `ignore` and `ignoreEffects { heat: 10, flag: 'watched' }`, for *Let it pass*.
- **The kicker** is *A PATROL · {PLACE}* (answers: *RAMPART ROW*). The default is the city's name until the designer gives a street per rival home city (§21.1 Q5).
- The rows' outcome texts come from the designer, with stand-ins as §7.1.
- `copy.patrol.*`; `help.patrols` (GDD §14.12, word for word).

### 8.2 Rules (`packages/rules/src/patrol.ts`, new)

```ts
export const PATROL = {
  bucketMs: 10 * 60_000, basePct: 12, noticed: 5, hotOrWanted: 10, watched: 10, warned: -10,
  curfewFactor: 2, min: 5, max: 40, stopsPerNight: 2,
  quietAfterStopMs: 15 * 60_000, quietAfterRunInMs: 15 * 60_000, quietAfterArrivalMs: 10 * 60_000,
} as const;

export interface PatrolNight { cityId: string; night: number; bucket: number; stops: number }
export interface PatrolCardState { id: string; cityId: string; night: number; bucket: number; at: number; seed: string }
export interface PatrolState { nights: PatrolNight[]; quietUntil: number | null; card: PatrolCardState | null }

export const patrolBucket = (now: number): number => Math.floor(now / PATROL.bucketMs);
export function patrolChance(i: { heatState: HeatState; flags: DayFlags; curfew: boolean }): number; // 12 (+5|+10) (+10|−10) ×2 → 5..40
export type PatrolSkip = 'day' | 'notRival' | 'held' | 'transit' | 'runIn' | 'pending' | 'rolled' | 'quiet' | 'cap';
export function patrolDecision(i: {
  state: PatrolState | null; cityId: string; now: number;
  night: number | null;            // nightKey(now) through the seam; null by day
  rivalGround: boolean; held: boolean; inTransit: boolean; runInPending: boolean;
  chance: number; roll: number;    // roll: 1..100 from the bucket's seed; `forced` hook passes 1
  cardId: () => string;
}): { skip: PatrolSkip } | { stop: boolean; next: PatrolState };
// Order: day → notRival → held / transit / runIn / pending → rolled (this city, night, bucket) → quiet → cap → roll.
// A skip never writes. A roll returns `next` with this night's entry for the city (bucket set; other nights
// pruned); a stop adds the card, stops + 1, quietUntil = now + 15 min.
```

**Tests:**

- `patrolChance`: Cool and clean 12; Noticed 17; Hot and Watched 32; Warned and Cool 5 (the floor); Wanted, Watched and the Curfew 40 (the cap).
- `patrolDecision`: each skip in the stated order; a second decision in the same bucket gives `rolled`; a third stop in a night gives `cap`; a new night resets the stops; quiet at arrival + 9 min and not at + 10; the night entry of another city is kept separately.
- **The expectation check** (economy §25.4): a Cool visitor reading every bucket of a two-hour night over 10,000 seeded nights averages 1.3–1.5 stops, and never more than 2.

### 8.3 Data model and server

**`characters.patrol`:**

```ts
patrol?: {
  nights: Array<{ cityId: string; night: number; bucket: number; stops: number }>;
  quietUntil: Date | null;
  card: { id: ObjectId; cityId: string; night: number; bucket: number; at: Date; seed: string } | null;
}
```

- The schema default is absent. An absent value reads as `{ nights: [], quietUntil: null, card: null }`. The filter `'patrol.card': null` matches a missing field.

**`ensurePatrol(content, loaded, cityId, now)`** (`services/patrol.ts`, new) is called **only by `city.get`**, after `loadCharacter`, when `cityId === doc.cityId`:

1. It reads the night through `nightAt(now)` (`nightKey` when night, else null), and rival ground through `isRivalGround`.
2. It takes the Heat state from the projected Heat, the flags from `flagsToday(c, cityId, today)`, and `curfew: false` until slice 7.
3. The roll is `createRng(\`patrol:${id}:${cityId}:${bucket}\`).roll100()`. With `patrolHooks` it is forced to 1 when the character's mode is `next`, and skipped when it is `never`.
4. `patrolDecision` runs. On a skip it returns the doc untouched.
5. Otherwise it writes `Character.findOneAndUpdate({ _id, version }, { $set: { patrol: next }, $inc: { version: 1 } }, { returnDocument: 'after' })`. A miss reloads and decides again once. A second miss returns the loaded doc, and the next read rolls.

It is **not** a transaction (one document) and writes no request log: the bucket record is the idempotency key, and the seed makes the outcome the same for every reader.

**The quiet writers:**

- `settleArrival` (`journeyArrival.ts`) adds `$max: { 'patrol.quietUntil': arrivesAt + 10 min }` to its existing character write;
- `startRunInInTx` adds `$max: { 'patrol.quietUntil': at + 15 min }`.

**`notFree`** (`risk.ts`) gains a third case: `patrol.card` gives `PATROL_PENDING { cityId }`. Every caller of `notFree` / `assertFree` refuses with it: actions, missions, chapters, boarding, residence acts and treatment. Votes, the paper and reads are untouched.

**The view:** `CityView.patrol: { card: JourneyCardView /* deck 'patrol', setAside row last */; kicker: string } | null`, set when the pending card's `cityId` is this city.

**`patrol.answer`** (new router `apps/server/src/trpc/routers/patrol.ts`):

- input `{ choiceId: z.string().min(1), idempotencyKey: z.uuid() }`;
- `withRequestKey`, `RequestKind 'patrol.answer'`. Inside the transaction:
  1. re-read the character; no card gives `NO_PATROL`;
  2. the choice must be the event's or `JOURNEY_SET_ASIDE`, else `UNKNOWN_CHOICE`;
  3. resolve: `resolveJourneyChoice({ difficulty: 14, gateHolds: coolAndClean(heatNow, liveMarks), rng: createRng(card.seed + ':choice') })`, or the set-aside's `ignoreEffects`;
  4. `addHeat` (no rival ×2; §21.1 Q7);
  5. add the *Watched* flag `{ cityId: card.cityId, day: today, flag: 'watched' }`;
  6. `$set { 'patrol.card': null, heat, flags }`, `$inc version`, under the version guard;
- output: **`PatrolCardResult`** (`kind: 'patrolCard'`, the `JourneyCardResult` fields less `journeyId`, `opinion` and `points`, plus `cityId`, `heat { before, after } | null` and `flags`).

**Test hooks:**

- `patrolHooks` (`services/patrolHooks.ts`, the `streetHooks` pattern), with `E2E_PATROL=never|auto` at start-up (Playwright: `never`; `dev:mem`: `auto`);
- `POST /api/test/patrol { mode: 'next' | 'never' | 'auto' }`;
- the dev status shows the chance, the buckets rolled tonight, the stops, `quietUntil` and the card.

### 8.4 Client

- **`PatrolCard`** (`packages/ui/src/components/Travel.tsx`, reusing `JourneyCard`'s rows, put-aside row and chosen state):
  - a `BottomSheet` over the city map with **no scrim-dismiss, close or swipe**, as the journey card since `6142de8`;
  - the tab bar still works, and the Map tab comes back to it;
  - after a row, the outcome prints in the card with *Continue*, which closes it and invalidates `city.get` and `character.me`.
- **`PATROL_PENDING`** anywhere gives the message *A patrol has stopped you · answer it on the map* (`copy.errors.PATROL_PENDING`), with a link to the city.
- **The plate's danger line** at night reads the patrol wording (§10.2).

### 8.5 Tests

**Server** (`review5.patrol.test.ts`, mode `clock`, a seeded clock at 22:05, a Collective visitor in Duskwall, `patrolHooks` `auto`):

- **one roll per bucket:** ten `city.get` calls in one bucket write once (counted by `version`), and the eleventh in the next bucket writes again;
- **no re-roll:** a seed known to hit gives a card, and a refetch returns the same card;
- a seed known to miss gives no card, and a refetch in the bucket still gives none;
- **never on an act:** `action.perform` and `mission.start` at night never create a card (`patrol` unchanged);
- **never while held** (dev hook), **in transit** (boarded), **with a run-in pending**, or **by day**;
- **at home or in the capital at night:** no write;
- **quiet:** a read at arrival + 9 min gives no roll and + 11 rolls; after a run-in starts, no roll for 15 min; after a stop, none for 15;
- **the cap:** with the hook on `next`, two stops, then `cap` for the night; the next night stops again;
- **no read, no roll:** a character that only acts and reads the paper through a night has no `patrol` written;
- **closing the app:** the clock at dusk and no reads until 23:59 gives one roll on return, not twelve;
- **the pending card holds:** `action.perform`, `mission.start` and `travel.board` refuse `PATROL_PENDING`, while `council.vote` and `paper.today` work;
- **the answer:**
  - a Cool, clean player's *Show your papers* passes with no Heat and no flag;
  - with a live mark it gives Heat +10 and *Watched*;
  - *Let it pass* gives the same as the stopped papers;
  - the same key twice answers once;
  - two keys: one wins, the other gets `NO_PATROL`;
- **concurrency:** two `city.get` calls in a fresh bucket at once give one stop and one version bump.

**E2E** (`review5.spec.ts`, #12): night set to `night`, patrol `next`; a visitor opens Duskwall, sees the card, taps the map behind it (still open), answers *Talk your way past* and reads the outcome. A ticket's tag reads *Night · patrols out*. Then night and patrol are restored.

---

## 9. F7 — *What's here* (answers §9; GDD §14.13)

### 9.1 Server

`CityView.whatsHere` (in every city; in the capital, scoped to the district the view is opened on, §21.1 Q13):

```ts
whatsHere: {
  /** Missions whose gates the player passes today, Energy aside (Level, Rank, Reputation, the record,
   *  members-only, the target rule, the place's quarter); a night mission or way by day carries its lock. */
  missions: Array<{ locationId: string; missionId: string; n: number; night: { opensAt: number } | null }>;
  /** The rest, counted by the first gate that fails: grouped by (gate, need), the two lowest needs. */
  more: Array<{ gate: 'level' | 'rank' | 'standing'; need: number; count: number }>;
}
```

- **Built by `missionsHere(content, doc, cityId, today, night)`** (`views.ts`), the sibling of `startableMissions` on the same `missionGate`, `placeOpenFor` and target rule:
  - a place locked by its quarter counts its missions under `level` at the quarter's Level;
  - members-only and own-target missions and a `RECORD` bar are not counted at all, so nothing is named;
  - the night lock is not a gate here: the row shows with its line.
- **The rows' title, way, odds word, risk word and Energy** come from the location's mission ticket already in the view. The client joins them by `missionId`, so no second computation leaves the server.
- **The Issues** are `CityView.issues` (existing), and the first tagged place is found through `LocationView.issueIds`.
- **The orders** are the `character.me` orders (`items[].pin`, `away`, `off`), as the panel prints them.

### 9.2 Client

- **`PlacesList` → `WhatsHere`** (`packages/ui/src/components/Places.tsx`), with props `issues[]`, `missions[]` (joined), `moreLine`, `orders` and the existing `groups` / `places`.
- **The four blocks** of answers §9.2, each a kicker on a double rule and each with its empty state:
  - *Issues this week*: tap → the place with the ticket highlighted (the order-pin pattern);
  - *Missions you can start*: tap → the sheet scrolled to the mission; then the *n more* line, `copy.whatsHere.more(groups)` (*2 more from Level 8 · 3 from Rank 3*), or empty *None yet · the first opens at Level 6*;
  - *Your orders here*, or the collapsed line, *All three done*, or *Orders off today*;
  - *Places*.
- The plate's button reads ***What's here***, and the sheet's title is *{City} · what's here*.
- The desktop side panel is unchanged.

### 9.3 Tests

- **Server** (`review5.whatshere.test.ts`):
  - a Level-6, Rank-1 Collective visitor in Duskwall gets the Level-6 everyone-missions;
  - `more` holds `{ level, 8, n }` and `{ rank, 3, n }`;
  - the Vanguard-only missions are absent from both;
  - a Notorious record removes the barred place's missions from both lists;
  - the lorry by day is in `missions` with `night.opensAt`.
- **UI:** the four blocks with fixtures and their empty states; the *more* line's wording.
- **E2E** (`review5.spec.ts`, #9): a Coalport resident (Level 10) in Duskwall opens *What's here* and reads the two Issues, the missions with the *more* line, the collapsed orders line and the places. Tapping a mission opens its place's sheet at the ticket.

---

## 10. F8 — The rival header and the Unrest prize (answers §10.2–§10.3; GDD §14.11–§14.12; ADR 0082)

### 10.1 Rules

`rivalGround.ts`:

```ts
export interface RivalPressure {
  day: DayKey; lost: number; prev: { day: DayKey; lost: number } | null;
  /** Review 5 (ADR 0082): today's thousandths by the party that took them; the six days before. */
  byFaction?: Partial<Record<FactionId, number>>;
  week?: Array<{ day: DayKey; byFaction: Partial<Record<FactionId, number>> }>;
}
export function addPressure(p, today, takenK, actor: FactionId): RivalPressure;     // actor is new and required
export function pressureByFaction(p, today): Partial<Record<FactionId, number>>;    // {} for a stored day without a split
export function pushedThisWeek(p, today, f: FactionId): number;                     // thousandths, today + the six days before
```

`morale.ts`:

```ts
export const UNREST_PRIZE = { fxp: 50, minPushedK: 500, windowDays: 7, everyDays: 7, legacy: 2 } as const;
export function unrestEntry(i: {
  morale: MoraleRecord | null;
  prize: { entry: DayKey | null; paidDay: DayKey | null } | null;
  day: DayKey;                                             // the boundary's day d
}): { consider: false } | { consider: true; entry: DayKey; pay: boolean };
export function prizeWinners(rows: ReadonlyArray<{ characterId: string; name: string; factionId: FactionId; pushedK: number }>,
  home: FactionId): { winners: typeof rows; topByFaction: Partial<Record<FactionId, string[]>> };
```

`missions.ts`: `riskBand` is reused for the plate's danger word.

**Tests:**

- `addPressure`: two parties on one day keep their split; a new day moves today into `week`; the eighth day drops the oldest.
- `pushedThisWeek` across seven days.
- `unrestEntry`:
  - a new entry with no payment pays;
  - an entry three days after a payment is considered and not paid;
  - the same entry seen twice is considered once;
  - an entry eight days after a payment pays;
  - `steady` is not considered.
- `prizeWinners`: 0.499 out, 0.5 in, the home party out, top three per party by `pushedK` then name.

### 10.2 The header (server and client)

**`CityView.rivalGround` v2:**

```ts
rivalGround: {
  homeFactionId; unrest;
  pressure: { lost: number; cap: 2; left: number; byFaction: Partial<Record<FactionId, number>> }; // points
  risk: RiskBand;          // the band of the player's tier-1 run-in chance here now (Heat, record, flags, night)
  night: boolean;
  goal: { share: number; toUnrest: number; aboveFloor: number; weekPushed: number }; // share − 60 (≥ 0), share − 50, the party's 7 days
} | null
```

- **`moveOpinion`** (`place.ts:167`) passes the actor to `addPressure`. Nothing else in the act changes.
- **The nation view's rival home cities** gain `goal: { toUnrest: number; unrest: boolean }` for the card's *The goal: Unrest · 11.4 points to go*.
- **The client** (`city.tsx` rival plate; `PushBar` and `RivalHeader` in `packages/ui`):
  - **the push bar** in two colours (the parties' `FACTION_STYLE`), with the full state in the failure colour;
  - **the danger line**, worded from `risk` and `night` (the patrol wording at night, answers §16.1);
  - **the goal line**, or the Unrest form *hold it*;
  - the three notes `help.push`, `help.rivalGround` (reworded) and `help.unrest`;
  - **under 700 px of height** the goal line folds into the push bar's note.
- **Strings:** answers §10.2 and §16.1 word for word (`copy.rival.*`).

### 10.3 The prize at the boundary

In **`processBoundary`** (`cityDay.ts`, home cities only), after the morale transition:

1. `rec = m ?? city.morale` and `step = unrestEntry({ morale: rec, prize: city.unrestPrize, day: d })`.
2. On `step.pay`, the pushers: one aggregate over `influenceLedger` in the session.
   - **The match:** `{ placeId: cityId, cycleKey: { $in: cycleKeysOf(d − 7 … d − 1) }, day: { $gte: d − 7, $lt: d }, factionId: home, kind: 'action', swing: { $lt: 0 }, 'source.kind': 'character' }`. It uses the existing `{ placeId, cycleKey }` index.
   - **The grouping:** `$group` by `source.characterId` with `pushedK = −Σ swing`.
   - Then `Character.find({ _id: { $in }, factionId: { $ne: home } }, { name, factionId })`, and then `prizeWinners`.
3. **The awards**, written with `Award.bulkWrite` upserts:
   - `{ kind: 'unrest', ref: 'unrest|{cityId}|{entry}', characterId }` with `$setOnInsert`;
   - the fields `{ cityId, placeId: cityId, pc: 0, fxp: 50, amount: pushedK, meta: { pushedK, top: topByFaction[f] }, day: d, creditedAt: null }`.
4. `set.unrestPrize = { entry: step.entry, paidDay: step.pay && winners.length > 0 ? d : prev.paidDay }`. This rides the boundary's guarded `City.updateOne({ 'world.settledDay': d − 1 })`.

**The award model** (`ledger.ts`): `kind` enum gains `'unrest'`, plus `fxp: { type: Number, default: 0 }` and `meta: Mixed`.

**The member's settlement** (`dayService.ts`):

- `awardsPc` stays, and **`awardsFxp`** is added to the settlement's FXP, so the rank follows as for the stipend;
- the award line `{ kind: 'unrest', cityName, pushed: pushedK / 1000, fxp }` prints in the paper's personal lines as *Duskwall in Unrest · you pushed 1.8 points this week · +50 Party XP* (`copy.unrestPrize`).

**The headline:**

- the paper's facts gain `unrestPushed: { cityName, homeName, partyName, top: string[] } | null`, from today's `unrest` award;
- the template is `hl.unrest-pushed`, three decks in each party's voice, with answers §10.3's line as the base, from the designer (§21.1 Q10);
- `paper.ts` gains the fact and `types.ts` the headline kind.

**Slice 8:** Legacy +2 from the same award ref (§18).

### 10.4 Tests

**Server** (`review5.unrest.test.ts`):

- **The header:**
  - two Collective and one Alliance visitors push Duskwall: the view's `byFaction` splits 0.7 / 0.5 / 0.2;
  - at the cap the bar reads full, and the next act moves nothing (as today);
  - `weekPushed` sums over days;
  - `risk` is *Risky* by day and *Dangerous* at night (mode `clock`).
- **The prize:**
  - three visitors push Duskwall from 60.8 to 59.9 over two days (one under 0.5);
  - the boundary pays the two qualifiers 50 FXP each through awards, and the third gets nothing;
  - their settlements credit it once, and the paper prints the line and the headline;
  - a home member gets nothing.
- **Not farmed:**
  - the boundary run twice (`AlreadySettled`) pays once;
  - **entering Unrest twice in a day** (59.9 → 60.1 by a home canvass → 59.9) pays once;
  - a second entry four days later is recorded and not paid;
  - one nine days later pays;
  - a concurrent second settler hits the unique index and is a no-op.

**E2E** (`review5.spec.ts`, #10): a visitor in Duskwall reads the three lines, and the danger word changes when night is set.

---

## 11. Data model, migration and indexes

| Collection | Change | Absent reads as |
|---|---|---|
| `characters` | `patrol { nights[], quietUntil, card }` (§8.3) | no state: `{ nights: [], quietUntil: null, card: null }` |
| `cities` | `rivalPressure.byFaction`, `rivalPressure.week` (Mixed, §10.1); `unrestPrize { entry, paidDay }` | no split for that day; an empty week; never paid |
| `awards` | `kind: 'unrest'`, `fxp` (default 0), `meta` | `fxp: 0` on hero and Issue awards |
| `requestLogs` | kinds `'character.treat'`, `'patrol.answer'` | — |
| content | `Way.window`, `Mission.window`, `Location.treatment`, `JourneyEvent.deck: 'patrol'` | — (content is data, ADR 0003) |

- **No migration.** Every field is optional with an absent-equals-default read, the Driver's pay is content, and pressure from before the round shows its day's total without the split (local databases only).
- **No new index.** The prize's aggregate uses `{ placeId, cycleKey }`. The patrol is on the character, read by `_id`.

## 12. F9 — The opening, version D, E or G (answers §16.2–§16.7; GDD §7.1, §17.1) — **after the user picks**

**Strings and one content test.** No rule, schema, id, reward, requirement or number moves, and no other phase depends on this one, so it slots in whenever the pick lands, before or after phase 9.

- **Content:**
  - `origin.ts`: three beats' narratives, kickers, the nine row strings, three confirms, three echoes, the beat-2 and beat-3 answers with hints. The ids (`holm`, `stahl`, `grey`, `ward-book`, `letter`, `marker`) are unchanged.
  - `orders.ts`: the three welcome-B templates.
  - `cities/*.ts`: the three favour actions' ticket, Success and Partial texts.
  - `headlines.ts`: the three welcome decks and three outcome headlines.
  - `items.ts`: `outfit.fathers-coat` and the three chapter-1 keepsakes' names and descriptions.
  - `ambitions.ts`: the three Ambitions' titles and premises, the five built chapters' scripts, and the Letters rows.
  - `people.ts`: version G's registry clerk only.
- **Tests:**
  - `review5.opening.test.ts` (content): no player-facing string in `origin`, `ambitions`, `items`, the welcome templates and decks contains `/\bfather\b|\bhis (coat|work|name|debts)\b/i`;
  - every narrative is ≤ 240 characters and four sentences;
  - every row title is ≤ 180;
  - the Vanguard strings pass the content-policy regex;
  - word-for-word comparison with the chosen §16.x;
  - the reference answers `holm · books · ward-book` still give STR 8 / INT 12 / AGI 5 / CHA 5 and the first Ambition (`origin.test.ts`).
- **E2E:** `helpers.ts`'s three-beat helper matches rows by their ids or test ids, not the old texts. `arrival.spec.ts`, `chapter.spec.ts` and `qa.slice2.spec.ts` update their text assertions. Eight taps to the favour's result still hold.
- **Docs:**
  - GDD §7.1 and §17.1 take the picked text (the designer);
  - the designed chapters in `slice-7-nation.md` §13 and `slice-8-life.md` §8 and §16 are re-strung (the designer);
  - the slice 7–8 tech docs get a dated note that the chapter strings changed and no number did.

---

## 13. API summary (tRPC)

| Procedure | Input (Zod) | Output | New errors |
|---|---|---|---|
| `city.get` | unchanged | `CityView` v7:<br>• `night`, `whatsHere`, `patrol`;<br>• `rivalGround` v2 (`pressure.byFaction`, `risk`, `night`, `goal`);<br>• `locations[].treatment`;<br>• mission `locked.reason 'NIGHT'`, `ways[].night`;<br>• `PlaceTag` `night`.<br>**May write** (the patrol bucket, §8.3) | — |
| `travel.nation` (the nation view) | unchanged | + `night`; rival home cities' `goal` | — |
| `travel.journey` | unchanged | + `night` | — |
| `council.hall`, and every view carrying `HallView` (`council.election`, `council.chamber`, the count) | unchanged | + `night` | — |
| `character.treat` | `{ locationId: z.string().min(1), idempotencyKey: z.uuid() }` | `PoliticalResult` (`act: 'treated'`) | `FULL_HEALTH`, `NOT_ENOUGH_IRON`, `NOT_HERE`, `UNKNOWN_LOCATION`, `ACTION_LOCKED`, `HELD`, `RUN_IN_PENDING`, `PATROL_PENDING`, `IN_TRANSIT` |
| `patrol.answer` | `{ choiceId: z.string().min(1), idempotencyKey: z.uuid() }` | `PatrolCardResult` | `NO_PATROL`, `UNKNOWN_CHOICE` |
| `mission.start` | unchanged | unchanged (+ the night rate's part and tag) | `MISSION_LOCKED { lock: 'NIGHT', opensAt, wayId? }`, `PATROL_PENDING` |
| `action.perform`, `travel.board`, `ambition.*` acts, `residence.*` | unchanged | unchanged | `PATROL_PENDING` |
| `paper.today` | unchanged | + the unrest award line and `hl.unrest-pushed` | — |
| Test only (`E2E_TEST_HOOKS`) | `POST /api/test/night { mode }`, `POST /api/test/patrol { mode }`, `POST /api/test/street` + `rolls` | — | — |

## 14. Scheduled jobs, idempotency and atomicity

**Jobs.** None new, none changed in schedule:

- the night is a clock read;
- the patrol rolls on reads;
- the card never expires;
- treatment is a keyed act;
- **the Unrest prize rides the existing city-day boundary** (lazy first, job primary, ADR 0017). It is written inside the boundary's guarded transaction, so a re-run throws `AlreadySettled`.

**Idempotency and atomicity:**

- **`city.get`'s patrol write:**
  - one `findOneAndUpdate` on the character with the version guard, keyed by the bucket recorded in `patrol.nights`;
  - the outcome is seeded by `characterId:cityId:bucket`, so any evaluation of the bucket agrees;
  - reads inside a rolled bucket, inside quiet or past the cap write nothing;
  - concurrent reads give one winner, and the loser reloads.
- **`patrol.answer`:** `withRequestKey` (`assertKeyFree` first in each transaction, the keyed-transaction guard of the slice-5 fix round). The character write, under the version guard, clears the card. A second key finds no card (`NO_PATROL`).
- **`character.treat`:** `withRequestKey`. The price, the Health and the Iron are written in one versioned update in the transaction with the request log. A retry returns the stored result and never charges twice.
- **Mission night locks:** refused before the key, so a refusal is not stored and the same key works at dusk.
- **The rival push:** `byFaction` and `week` ride `moveOpinion`'s existing `$set` on the city, in the act's transaction.
- **The prize:**
  - in the boundary's transaction;
  - awards upserted on the unique `{ kind, ref, characterId }`;
  - `unrestPrize.entry` set once per entry;
  - credited once by the member's settlement (`creditedAt`).
- **Everything from slices 0–5 and review 4:** unchanged.

## 15. The result modal: how each breakdown is produced

| Result | Kind | What is new | Source |
|---|---|---|---|
| Any action or mission | `action` / `mission` | Folded by the client (§4): the picture by height, *How it went* by `howItWent`, the tags line, *Details*, three knock-ons and *n more*. The server's breakdown is unchanged | `ActionResult` as today (GDD §13.1a) |
| A night mission | `mission` | The Iron part *Night rate +n* (in *Details*), the tag *Night rate · +25 % Iron* | `finishMission` `nightRate` (§7.2) |
| A rival act at night | `action` / `mission` | The tag *Night · patrols out* on the ticket; the run-in's chance from the night base (never shown as a figure) | `runInChance({ night })` (§3.4) |
| *Get patched up* | `political`, card | Stamp *Patched up*, headline *Whole again*, the carer's body, *Health 64 → 125*, *−61 Iron · the ward* | `treat` (§6.2) |
| The patrol card | `patrolCard` | Its outcome headline and body; Heat before → after; *Watched today* | `resolveJourneyChoice` at 14 (§8.3) |
| The Unrest prize | the paper | *Duskwall in Unrest · you pushed 1.8 points this week · +50 Party XP*, and the headline | the award, the settlement and the paper's facts (§10.3) |

---

## 16. Testing

### 16.1 How to run them

- **While working:** run the affected tests only, for example `pnpm --filter @irongate/rules test -- review5.day`, `pnpm --filter @irongate/server test -- review5.patrol`, `pnpm --filter @irongate/ui test -- review5.result`, or one Playwright file with `pnpm --filter @irongate/client e2e -- review5.spec.ts --project=review5`.
- **Once per phase, before the phase's commit:** the full gate `pnpm lint typecheck test`, then `pnpm e2e`. **Together they take about 35 minutes**, so run them once per phase, not per task. A phase is done when both are green.

### 16.2 Per layer and E2E

New test files:

- rules: `review5.day`, `review5.night`, `review5.patrol`, `review5.unrest`, `review5.treatment`;
- content: `review5.jobs`, `review5.night.content`, and later `review5.opening`;
- server: `review5.night`, `review5.treatment`, `review5.patrol`, `review5.whatshere`, `review5.unrest`;
- UI: `review5.result`, `review5.picker`, `review5.header`, `review5.whatshere`.

`review5.spec.ts` grows by one test per note (below). Existing specs change where §4.3, §5.1, §7.5 and §12 say.

### 16.3 The playtest checklist (the round's question, note by note)

- [ ] 1 *(after the pick)* The platform says who you are, why you're there and what each of the three wants from you, and no string mentions a father.
- [ ] 2 At 1,440 px the sky has three big clouds and two wisps, and no puff.
- [ ] 3 Levelling up shows three paper cards. One tap places the point, and the card says *+1*.
- [ ] 4, 17 A ×1 result and a mission with a level-up don't scroll on a 740 px phone or a desktop. *Details* and *n more* open on a tap.
- [ ] 5 The Driver pays 240, more than the day-1 job's 216.
- [ ] 6, 7 *(built)* Health is under Energy, and the journey card can't be lost by a tap.
- [ ] 8 At any infirmary, *Get patched up · n Iron* makes you whole for one Iron a point.
- [ ] 9 In a strange city, *What's here* lists its Issues, what you can start, how many more wait and on what, and your orders.
- [ ] 10 On rival ground the plate says how hard the town has been pushed today and by whom, how risky it is for you, and how far it is from Unrest. Pushing it there pays +50 Party XP once.
- [ ] 11 Dusk comes four times a day. The plate says when, and the map turns without a reload.
- [ ] 12 At night some ways and four missions open. Rival ground is riskier, and now and then a patrol stops you on the street, never while you're away.

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| **Night now changes rules, and a third of all times are night.** Server tests (clocks from 09:00) and e2e (a shared forward-only clock) would flip at random | ADR 0079's override: Vitest and Playwright pin `day`; night tests opt in. One server test per night rule runs on the real clock functions |
| **The posters' `agi` way is in seven server test files** and four specs | §7.5: those files set `night`, and their meaning is kept |
| **`city.get` writes.** A refetch storm or a race could roll twice | The seeded bucket, the version guard, and no write inside a rolled bucket. The concurrency test is in §8.5 |
| **A scripted client never reads the city view** and never meets a patrol | Accepted (ADR 0081). Its acts carry the night run-in. The stop is a presence feature |
| **The pending card blocks acts.** A player who misses it is stuck | The card is a non-dismissable sheet on the map. Every refusal names it and links to it. One tap clears it (§21.1 Q8) |
| **The prize double-pays or is farmed** | Three independent guards (§14), the seven-day rule and the four farming tests (§10.4) |
| **An award written after the member's settlement** is credited a day late | The hero award's existing behaviour, accepted (ADR 0082) |
| **The tags line measures in the browser.** jsdom can't | `fitTagCount` is pure and unit-tested. The cut is checked in Playwright at 390 px |
| **`city.tsx`** (about 1,400 lines) is edited by lanes A, N, W, G and H | Each lane adds its component in `packages/ui` and a few lines of wiring. Lane A lands the plate's slots for the dusk line and the rival header in phase 1 |
| **`copy.ts`** is edited by every lane | One `copy.<feature>` block per lane, append only |
| **Outcome texts** for the four night missions and the patrol rows are not written yet | `TODO(game-designer)` stand-ins, which the content test lists (§21.1 Q5, Q6). The designer delivers them during phase 5 |
| **Two cloud kinds share one pool** and may show one shape twice at once | Accepted as *rarely* (answers §2). Two more big sprites are the designer's lever |

---

## 18. Knock-ons on the slice 6–9 tech docs (not built; record before each is built)

**Slice 6 (`docs/tech/slice-6.md`):**

- *Visit · 3 Energy* and the event sign-ups are Energy acts, so `notFree` refuses them while a patrol card is pending. *Post bail* is Iron from anywhere and is not refused.
- The Members status shows nothing for a pending card.
- The Unrest prize's award line appears with the branch's *Restore the base* orders in the paper.

**Slice 7 (`docs/tech/slice-7.md`):**

- **The Curfew's night** (§170, §579, §735) reads `nightAt(now).night` at the act; `isNight`'s 20:00–06:00 comment goes.
  - The ticket's *until 06:00* (§1226) is *until {nextDawn}* through `copy.when`.
  - The tests' *×2 at 20:00 and not at 19:59* (§849, §1368) become **22:00 and 21:59**.
  - Q21's window (§1665) is the six-hour one.
- **The Curfew doubles the night run-in** after the night base: tier 1 25 → 50, before the 90 clamp. It also doubles **the patrol chance**: `patrolChance({ curfew: true })`, read from the same law source at the read.
- **Clearwater:**
  - is a battleground: no patrols, and no night run-in rule;
  - its Tram conductor is `dailyPay: 240` (the rung test covers it when it lands);
  - its Sanatorium (`hospital`) carries `treatment: { carer: 'sister' }` or `'matron'` (the designer).
- **Unrest's national weight** and the deputies' abstention are unchanged. The goal line's *its deputies go quiet* becomes literally true here.
- The designed chapter strings change with the opening (§12), and no number does.

**Slice 8 (`docs/tech/slice-8.md`):**

- **Recognition at night** reads `nightAt` at the act. Its test times *at 20:00 and 19:59* (§1356) become 22:00 and 21:59.
- **Legacy +2** for the Unrest prize: a legacy entry by the natural ref `unrest|{cityId}|{entry}` (ADR 0057), credited in the settlement that credits the award.
- **The Market trader**, when placed, is Level 3 · Intelligence 10 · 240. The Level-6 rung is 320 when the Wardrobe places it (the rung test covers each).
- The designed chapters are re-strung with the opening.

**Slice 9 (`docs/tech/slice-9.md`):**

- `settings.night: 'clock' | 'day'` (*Map at night*) applies to the art on top of the view's `night` block. It never changes a rule, a lock or a patrol.
- **Telemetry** gains `patrol.roll`, `patrol.stop`, `patrol.answer`, `treatment.bought` and `unrest.prize`.
- **The performance budget** for `city.get` counts the patrol write (at most one per ten minutes per player at night on rival ground).
- **The axe matrix** adds the patrol sheet, the Treatment card, *What's here* and the rival header.
- *While you were away* lists the Unrest prize line.

---

## 19. Deliberately left out

| Left out | Why / where |
|---|---|
| The opening's strings | Until the user picks D, E or G (phase 10) |
| Two more big day clouds, a patrol portrait, a night `scene.station` | Optional art (answers §15) |
| Patrols at home or in a battleground; a patrol on a timer, or with the app closed | GDD §14.12, §4.3 rules 1 and 5 |
| The night train | Post-MVP (*boards at dusk, arrives at dawn*) |
| Backfilling `byFaction` and the week ring from the ledger | Local databases only; the ring fills in a week |
| A weekly party target for rival ground | Not taken (answers §10.3) |
| Legacy +2 | Slice 8 (§18) |
| Any hosting step | Local only |

---

## 20. Task list (phases, lanes, *Done when*)

**One developer per phase.**

- **While working:** run the affected tests (§16.1).
- **At the end of each phase:** run the full gate `pnpm lint typecheck test` and `pnpm e2e` once (about 35 minutes together), then commit the phase (verify, then commit).

After phase 1, the lanes run in parallel. Phase 9 is last, and phase 10 waits on the user.

```
Phase 0 (baseline) ─► Phase 1 (lane A: the game day, the night run-in, shared plumbing)
                        ├─► Lane R: Phase 2 (compact result) ─► Phase 3 (picker cards, clouds)
                        ├─► Lane H: Phase 4 (job ladder, treatment)
                        ├─► Lane N: Phase 5 (night windows, night missions) ─► Phase 6 (patrols)
                        │                                     └─► Lane W: Phase 7 (What's here)
                        └─► Lane G: Phase 8 (rival header, Unrest prize)
                                         all ─► Phase 9 (integration)
Phase 10 (lane O, when the user picks D, E or G): the opening — depends on nothing, nothing depends on it
```

### Phase 0 — Baseline

**T0.** On a clean `slice-0` at `cba1833`, run the full gate and `pnpm e2e`. *Done when:*

- both are green;
- `review5.spec.ts`'s three built tests (#6, #4's structure, #7) pass;
- any red is fixed or recorded before T1.

### Phase 1 — The game day and shared plumbing (lane A)

**T1. Rules.** §3.1 and §3.4: the constants and functions, `DAY_NIGHT` removed, and `runInChance`, `pickOpponent` and `missionRisk` with `night`. *Done when:*

- `review5.day` and the night run-in tests pass;
- `day.test.ts` is rewritten for the new window;
- every other rules test passes unchanged.

**T2. Server.** §3.2–§3.5: the work list.

- `services/night.ts`, `nightHooks` and the env and endpoint;
- the Vitest setup pinning `day`, and `E2E_NIGHT: 'day'` in Playwright's env;
- every reader moved;
- the `night` blocks on the four views;
- the night at the act in actions and missions, and the `night` tag;
- the new error reasons and their words;
- `StreetForce.rolls`;
- the dev status and *To dusk*.

*Done when:*

- `review5.night.test.ts`'s view and act cases pass;
- every slice 0–5 and review-4 server test passes unchanged;
- `grep -rn "isNight(" apps/server/src` finds only `night.ts`.

**T3. Client.** §3.3: the work list.

- the views' block read everywhere;
- `useNightTurn`;
- the plate's dusk line on every plate;
- `help.clock`;
- `journey.tsx` and `council.tsx` off `isNight`;
- `tiles.spec.ts`'s night case moved to the override.

*Done when:*

- at 03:58 in `dev:mem` the map turns to night within 20 s of 04:00 without a reload;
- the plate reads *Dusk in 2 min*, then *Night · dawn at …*;
- `grep -rn "isNight" apps/client/src` finds no call;
- the gate and the e2e suite are green.

### Phase 2 — The compact result (lane R)

**T4. Helpers and layout.** §4.1–§4.2. *Done when:*

- `review5.result.test.tsx` passes;
- every existing `ResultModal` UI test passes, with the updates to *How it went* and the receipt's notes made where §4 changes them (each citing answers §17).

**T5. The measurements.** §4.3: the four cases as assertions. *Done when:*

- `review5.spec.ts` #4 asserts the table at all three sizes;
- the picture's three heights are measured;
- the whole e2e suite is green.

### Phase 3 — The picker cards and the clouds (lane R, after phase 2)

**T6. The cards.** §5.1. *Done when:*

- fix list 4's *Done when* passes;
- the picker's UI tests pass;
- the e2e selectors use the stat names;
- no `copy.statButton` remains.

**T7. The clouds.** §5.2. *Done when:*

- fix list 5's *Done when* passes;
- `clouds.test.tsx` asserts 10 and 8;
- the dev viewer at 1,440 px shows no cloud narrower than a third of the screen (a screenshot in the phase's notes).

### Phase 4 — The job ladder and treatment (lane H)

**T8. The job ladder.** §6.1. *Done when:*

- `review5.jobs.test.ts` passes on the content and fails on the 200 fixture;
- the four updated tests cite GDD §9.2.

**T9. Treatment: rules, content, server.** §6.2. *Done when:*

- the rules and `review5.treatment.test.ts` cases pass, including the race and the six refusals.

**T10. Treatment: client.** §6.2. *Done when:*

- fix list 8 passes;
- the card's price ticks down with Health;
- `review5.spec.ts` #8 passes.

### Phase 5 — Night windows and the night missions (lane N)

**T11. Schema, loader, rules.** §7.1–§7.2 (no new content yet). *Done when:*

- the loader's three rules fail on fixtures by name;
- `windowLock` and the night-rate tests pass.

**T12. Content.** §7.1: the twelve ways, the four missions, `copy.night.*`, and the designer's texts or the stand-ins. *Done when:*

- the content tests pass;
- `review5.night.content.test.ts` proves the day ladder complete;
- the pending-text list is printed.

**T13. Server.** §7.3: the tickets, the start refusal, the night rate and the tag, `startableMissions({ forOrders })`, and the seven server test files moved to `night`. *Done when:*

- `review5.night.test.ts`'s window cases pass;
- every slice-5 server test passes.

**T14. Client and specs.** §7.4–§7.5. *Done when:*

- fix list 12's lock-line part passes;
- the four specs set and restore `night`;
- the e2e suite is green.

### Phase 6 — The patrol stop (lane N, after phase 5)

**T15. Rules.** §8.2. *Done when:*

- `review5.patrol` (rules) passes, including the 10,000-night expectation (1.3–1.5, never above 2).

**T16. Content, DB, server.** §8.1, §8.3: the event, the `patrol` field, `ensurePatrol` in `city.get`, the quiet writers, `notFree`, the view, `patrol.answer`, the hooks and the dev status. *Done when:*

- every case of §8.5 (server) passes, including one write per bucket, no write on an act, absence, the cap, the quiet, the pending refusals and the concurrent reads.

**T17. Client.** §8.4. *Done when:*

- `review5.spec.ts` #12 passes;
- the card cannot be dismissed by a tap on the map;
- a refused act links to it.

### Phase 7 — *What's here* (lane W, after phase 5)

**T18. Server.** §9.1. *Done when:* `review5.whatshere.test.ts` passes.

**T19. Client.** §9.2. *Done when:*

- fix list 6 passes;
- `review5.spec.ts` #9 reads the four blocks in Duskwall as a Coalport resident;
- the places and the Issue chip specs pass with the renamed button.

### Phase 8 — The rival header and the Unrest prize (lane G)

**T20. Rules.** §10.1. *Done when:* the rules tests of §10.1 pass.

**T21. The header.** §10.2: `addPressure`'s actor, `CityView.rivalGround` v2, the nation card's goal, `PushBar`, `RivalHeader`, the copy. *Done when:*

- the header cases of `review5.unrest.test.ts` pass;
- `review5.spec.ts` #10 reads the three lines and the night wording.

**T22. The prize.** §10.3: the award model, the boundary step, the settlement's FXP and line, the paper's fact, and the `hl.unrest-pushed` decks (designer text, or stand-ins). *Done when:*

- every prize and *not farmed* case of §10.4 passes;
- the slice 3–5 city-day and settlement tests pass unchanged.

### Phase 9 — Integration (one developer, last)

**T23. The walk-through.** `review5.spec.ts` covers one step per note of §16.3 a browser can check. Both vocabulary guards and the content-policy regex run over the new strings. *Done when:* the whole suite passes three times in a row locally.

**T24. Docs.** *Done when:* the README's steps reproduce each walk-through from a fresh `pnpm dev:mem`. The docs to write:

- the README's dev-panel steps: *To dusk*, the night and patrol modes, a patrol stop, treatment, a town pushed into Unrest;
- a **Deviations** section at the end of this file;
- ADRs 0079–0082 accepted;
- the §18 knock-ons copied into slices 6–9's tech docs as dated notes;
- `docs/IMPLEMENTATION_PLAN.md` §5's row for review 5;
- the §22 notes passed to the designer.

### Phase 10 — The opening (lane O, when the user picks; independent)

**T25. Content.** §12, for the picked version. *Done when:*

- answers §16.7 item 9's *Done when* passes;
- `review5.opening.test.ts` finds no *father*;
- the reference recruit's test is unchanged.

**T26. Specs and docs.** The helper by ids, the three specs' texts, and the slice 7–8 tech notes. *Done when:*

- eight taps reach the favour's result in `arrival.spec.ts` on all three arrival projects;
- the full gate and e2e are green.

---

## 21. Questions

### 21.1 For the game designer (each has a default, so the build doesn't wait)

> **All fourteen settled by the game designer, 8 Oct 2026** (`docs/design/review-5-answers.md` §18): **1 default** (the tag, the part in *Details*) · **2 default** (the item line stays) · **3 default** (the §4.1 order; *all three done* with the order, the record with Heat, a trained stat first on *Trained*) · **4 default** · **5 text given** (streets per rival home city: Foundry Row / Rampart Row / Weavers' Row as `cities[].patrol.street`; the six outcome texts and the ignore line, §18.1) · **6 text given** (the twelve outcome texts, §18.2) · **7 default: no doubling** · **8 default: yes**, the refusal reads *A patrol has stopped you · answer it on the map* · **9 default: per city**, economy §25.3 corrected to at most 100 a week · **10 default**, the three decks written (§18.3) · **11 accepted** · **12 default** · **13 default** · **14 default**, the Sanatorium's carer is *nurse*. The §22 notes are fixed in place (§18.4 there).

1. **The night rate on the compact receipt.** *Settled: default.*
   - Answers §12.1 calls the night rate *a line on the receipt*, but §17.2 gives Iron one line with no note.
   - **Default:** the tag *Night rate · +25 % Iron* on the tags line, and the part in *Details*.
2. **The receipt's item or keepsake line.** *Settled: default.*
   - §17.2 says *four lines at most (XP, Party XP, Iron, opinion)*, while GDD §13.1a lists *an item or Dossier entry* as the fifth.
   - **Default:** the item line stays on the receipt when present. It only appears on chapter results, which are not among the measured cases.
3. *Settled: default (the §4.1 order).* **The knock-ons §17.2 doesn't rank:** the morale crossing, the branch's endorsement, *all three done*, a trained stat, PC, Reputation progress, the record line and the item.
   - **Default:** the order of §4.1. *All three done* goes with the order, the record with Heat, and a trained stat first on a *Trained* result.
4. ***n more from Level 8 · 3 from Rank 3*** when needs differ (Levels 8 and 10). *Settled: default.*
   - **Default:** group by gate and need, print the two lowest groups (*2 more from Level 8 · 1 from Level 10*), and print Reputation as *from Known here*.
   - Members-only, own-target and record bars are never counted.
5. **The patrol card:** *Settled: text given, answers §18.1 (`cities[].patrol.street`; the kicker A PATROL · FOUNDRY ROW / RAMPART ROW / WEAVERS' ROW; six outcome texts and the ignore line).*
   - **the kicker's street:** *RAMPART ROW* is one example. **Default:** *A PATROL · {CITY}* until you give one street per rival home city (or one per place);
   - **the rows' outcome texts** (Success and Partial for *Talk your way past* and *Slip down a side street*; pass and stopped for *Show your papers*) are needed. **Default:** stand-ins.
6. **The four night missions' outcome texts** (answers §12.1: written with the build). *Settled: text given, answers §18.2.* **Default:** stand-ins until delivered in phase 5.
7. **Does rival ground double the patrol card's Heat?** *Settled: no (default).*
   - **Default: no.** The card's +10 and +5 are final, as the checkpoint card's are (GDD §14.12 lists them as figures).
8. **A pending patrol card holds Energy acts and boarding until answered**, and never resolves itself. *Settled: yes (default); the refusal reads* A patrol has stopped you · answer it on the map.
   - **Default: yes**, the run-in's pattern without the luck timer, because a luck timer would punish absence.
   - Otherwise the card could be ignored by acting, and a scripted client could skip it.
9. **The prize across two rival cities.** Per city as written, a member can earn up to 100 Party XP a week (economy §25.3 says *at most +50 a week*). *Settled: per city (default); economy §25.3, GDD §14.11 and Appendix C #102 now say at most 100 a week across both rival towns.*
   - **Default:** per city, as the rule says. If it should be per member, the boundary checks the member's last `unrest` award.
10. **The prize headline.** *Settled: the reader's party's top three (default); the three decks and the neutral line written, answers §18.3.*
    - *{Top three}*: **Default:** the top three pushers **of the reader's party**.
    - **The three decks:** **Default:** stand-ins, with the answers' line in each party's name.
11. *Settled: accepted (default).* **Version-guard races on `city.get` vs a tap.** A tap in flight while a patrol bucket is written retries once and may then be refused `PATROL_PENDING` (the stop came first).
    - **Default: accepted.** The tap's sheet shows the refusal's message, and the card is on the map.
12. **Quiet after arrival.** *Settled: default.* **Default:** `arrivesAt + 10 min`, also when the arrival modal is still open. Deportation never lands on rival ground, so it needs no rule.
13. ***What's here* in the capital.** *Settled: default.* **Default:** the district the sheet is opened on: its places, its Issues and its missions. The plate is per district.
14. **The Treatment carer:** *Settled: default; the Sanatorium's carer is* nurse *(See the nurse).* **Default:** *matron* in the three home infirmaries and *sister* at St Agnes, from `Location.treatment.carer`. Clearwater's Sanatorium is yours to name in slice 7.

### 21.2 For the user

1. **The opening: D *The warrant*, E *After the count* (recommended) or G *The frontier train*** (answers §16.2–§16.6). It is the only thing waiting on you. Phase 10 builds whichever you pick, in any order relative to the other phases.
2. For awareness:
   - the automated tests run with the town held at **day** (night tests switch it on), while your local game follows the real clock;
   - nothing existing changes for a Driver except the wage, from the next morning.

---

## 22. Notes on the design documents (for the designer)

1. **GDD §2.2 still holds the old bullet**, *Night is 20:00–06:00 UTC*, above the new one, along with the clock note's *{nightFrom} to {nightTo}*. **§14.12's slice-8 paragraph** still says *doubled at night (20:00–06:00 UTC)*. All three are superseded by the six-hour bullet and should say so in place.
2. **Fix list item 12's *Done when*** (answers §15) still says *once per night per city on the first city read* and *the night a hostile journey card fired*. Answers §16.7 supersedes both (a bucket roll; ten minutes after arrival).
3. **The night rate's wording** (answers §12.1, GDD §13.1: *a receipt line*) against answers §17.2's fold: §21.1 Q1.
4. **The receipt's four lines** against GDD §13.1a's item line: §21.1 Q2.
5. **The unranked knock-ons:** §21.1 Q3. Answers §17.2 item 6's list could name them, with the order of §4.1 if you agree.
6. **`slice-2-cities.md`'s job tables** still print 200 for the Drivers in the rows the content test reads. The addendum is correct, but correcting the rows in place (with *was 200*) would let the old test stand.
7. **Economy §25.3's *at most +50 a week*** holds per city. A member has two rival home cities (§21.1 Q9).

---

## 23. Deviations

### Phase 1 (lane A), built 8 Oct 2026

1. **The Driver's 240 pulled forward from T8.** The designer's commit `352823a` corrected the job tables in place (*240 (was 200 until review 5)*), so `slice2.content.test.ts` and `slice4.irongate.test.ts` went red against the 200 in content. Phase 1 sets the four Drivers to `dailyPay: 240` and updates the tests that change with the number (`load.test.ts`, `qa.content.test.ts`, `slice4.irongate.test.ts`, which now reads the bold figure). `qa.gdd.test.ts:423–477` uses its own figures and passes unchanged. **Left for T8:** `review5.jobs.test.ts` (the pinned table and the rung rule, with the 200 fixture failing by name).
2. **The content-policy regex allows the republic's police patrol.** `qa.slice2.test.ts` bans *patrol* (a militia word for the Vanguard). The user's decided strings *Night · patrols out*, *A patrol has stopped you · answer it on the map* and *The patrol has moved on.* are the state's police (answers §12.2, §13, §16.1), so they are allowed by name; the Vanguard still has no patrol.
3. **`hallView` and the politics views take `now`.** For the hall header's `night` block, `hallView(content, cityId, now)`; `electionView`, `councilViewFor` and `councilView` take `now` instead of `today` (they derive the day); `countView`, `capitalCountView`, `getCount`, `getCapitalCount` and `frontPageView` gain `now`. `review3.test.ts`'s three `hallView` calls pass a time.
4. **`TownHallView.night`** is the same block as `hall.night` (both carried, as §3.3 lists both).
5. **The dev status's chance lives in the night block.** `DevStatus.night { night, nextDusk(+Utc), nextDawn(+Utc), mode, tapRunIn }`; `tapRunIn` (a tier-1 tap's run-in chance here and now, null off rival ground) comes from `tapRunInChance` in `dev/risk.ts`. Putting it in `DevRisk` would have changed `devPanel.test.ts`'s exact status shape. The panel shows a *Night* row and the *To dusk* button (`toDuskAt` in `dev/clock.ts`).
6. **`StreetForce.rolls` at home.** A checked tap at home takes only `rolls` (`streetHooks.takeRolls`), so a `runIn` or `opponentId` set for a later act on rival ground stays pending; on rival ground the whole force is taken as before. A mission reads `rolls[0]` as its check roll when `checkRoll` is absent. `POST /api/test/street` accepts `rolls` (1–3 rolls of 1..100).
7. **`POST /api/test/night` needs no sign-in** (like `/api/test/clock`): the night is the whole server's.
8. **A second rules test held the old window.** `qa.gdd.test.ts`'s *§2.2 day and night* table is rewritten with `day.test.ts`. The HUD clock's UI test (`review4.phase1.test.tsx`) and `review4.copy.test.ts` change with `help.clock(dayTurn)`; `review5.copy.test.ts` checks the new note word for word against answers §11.3, and `help.patrols` against answers §16.1 and GDD §14.12.
9. **The plate's line shares the rule's line.** §3.3 puts it after the morale or rule line as a line of its own; on a 375 × 812 phone that extra line pushed a pin under the plate (`canvass.spec.ts`, `map.spec.ts`). It now ends the rule's line (*Council rule: … · Dusk at 19:00*, the rule truncating first), alone on that line where no rule is in force, and folds with it on phones under 700 px tall. On the home and rival plate it is dotted text under the plate's one notes button, whose notes gain `help.clock` (and `help.patrols` on rival ground at night); on the district plate it is its own notes button on the rule's line, and on the capital's overview it sits beside the held legend (`DuskLine`).
10. **`useNightTurn` re-arms on a server-clock jump** (a dev-panel skip) and, if a refetch still answers the old block, looks again after 5 s.
11. **T3's dev:mem check is automated** as `review5.spec.ts` #11: the seam on the clock, the shared clock 30 s before a dusk, the map's night layer turning without a reload (a window marker survives), and the plate going from *Dusk in 1 min* to *Night · dawn …*. *Dusk in 2 min* at 03:58 is a copy unit test.
12. **`MISSION_LOCKED { lock: 'NIGHT' }` is worded on the client already** (`copy.night.opensAt`), ahead of phase 5 raising it.

### Phase 10 (lane O, *Coming home*), built 8 Oct 2026

1. **The strings beyond §19.1–§19.5 came from the designer.** §19.6 gave titles, keepsakes and one-line notes, not scripts, so the game designer wrote the five built chapters, the item notes, the coat picture's alt text and the welcome decks' first sentence as answers §19.10 (and re-strung GDD §7.1, §17.1, §21.4, `slice-7-nation.md` §13, `slice-8-life.md` §8 and §16, with dated notes in `docs/tech/slice-7.md` and `slice-8.md`). The build follows §19 and §19.10 word for word; `review5.opening.test.ts` reads both.
2. **The origin's caps are raised for the asks.** §19.2's asks are 199–221 characters (the schema's 140; §12's test said ≤ 180): `OriginAnswer.text` takes 240 (a story text), the note under the rows 160 (it is 137) and a beat-3 hint 100 (the ration page's is 86). On a 390 × 844 phone the three rows scroll under the sticky confirm; the designer's layout lever (the ask's first sentence as the title, the rest as a line) is not built.
3. **Beat 1's narrative may run to five sentences** (*The mill is sold. The stamp is missing. The flat is gone.*); the loader's limit is five for beat 1 only (`ORIGIN_COUNTER_MAX_SENTENCES`), four everywhere else; the designer agreed.
4. **The Vanguard's welcome deck is shortened** to *The League's letter waits at {place}; start there.*: with §19.10.7's first sentence §19.5's line made the template 202 characters against the deck's 200. The designer took it in §19.10.7.
5. **The counter's confirm before a choice** reads *Choose one of the three* (`copy.arrival.chooseSomeone`, was *Choose whom to help*): nobody is helped at the counter now. The developer's words, for the designer.
6. **No migration.** Neither §19 nor this plan asks for one, and every id is kept: a player part-way through *The Last Train In* keeps the beats answered (same effects) and meets the new texts from the next beat. Migration 008 is unchanged.
7. **The e2e helpers pick by content id.** Story rows and choices carry `data-choice={id}`; `ANSWERS` are ids (`books`, `ward-book`), `platformRow(page, faction)` selects a beat-1 row, and `answer()` takes an id or a text.
8. **Art:** `scene.demob-office` built (AVIF 1280/640, WebP 640; focus 0.42 / 0.45); the committed set is 19.35 MB, so the budget is 19.85 MB. The demob suit keeps the winter coat's picture (`item.winter-coat`, alt re-written); no suit art exists.
9. **The no-father test** scans every player string of the content and the copy. Two deliberate exceptions: Ashford's yard hand (*his father's a member*, slice 2) and the alt texts of the retired `portrait.father` and `scene.origin-deathbed`, which stay catalogued and are referenced by nothing (the test checks that too).
10. **Older word-for-word tests read through `test/review5.ts`** (the item names, the welcome decks, the riverside house's screen strings, and `expectChapterRestrung` for the five chapters), so the slice-2, slice-3, slice-5 and review-4 design documents stay the record; `review4.prologue.test.ts` (content) is replaced by `review5.opening.test.ts`.
11. **The playtest funnel's beat labels** read *the counter*, *the kitbag*, *the post* (`packages/db/src/funnel.ts`).
12. **The favour bodies' italics** (§19.5's *stamp*, *housing*) are plain words: outcome texts carry no markup.
