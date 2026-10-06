# Review 4 fix round — technical design

| | |
|---|---|
| **Goal** | Answer the user's twenty-five review-4 notes on the built slices 0–5. **The prologue** becomes *The Last Train In*: three beats; your party is whom you help; the favour is your first action. **The paper** is your own, printed as a local edition wherever you are. **The journey** runs on the nation map: a train at the clock's position, and a card at a moment drawn at boarding. **Irongate's five outlines** tile the whole picture. **Home cities** are one map with locked pins greyed. **Every city has a Town Hall** with the council's public sheet and a councillor's desk. **Residence** is one *Live here* action, and lodgings become a place card. **The cells** cost three things and take nothing. Also: a clock and one countdown style, Heat as a body line, the rank ladder, the paper on a desk, the "can be carried out" order test, and the help notes and copy |
| **Question** | **Does each of the twenty-five notes read as answered, in play?** §18.3 is the per-note checklist |
| **Builds on** | Slices 0–5 and their fix rounds as built on branch `slice-0` at `e714c8e`, **plus the in-hand work** (notes 5, 12's tooltip bug, 22, 24 and the new faces; uncommitted at the time of writing: `packages/rules/src/orders.ts` `offerable`, `apps/server/src/services/views.ts` `startableMissions`, `meView.ts`, the HUD and `Help` changes, `apps/server/test/review4.test.ts`) |
| **Design inputs** | `docs/design/review-4-answers.md` (cited *answers §n*; the fix list is §28) · the user's notes `docs/review/2026-10-06-review-4.md` · the dated review-4 addenda in `slice-2-onboarding.md` §15, `slice-3-screens.md` §13, `slice-4-battleground.md` §20, `slice-4-screens.md` (end), `slice-5-risk.md` §24, `slice-5-screens.md` §13, `slice-6-together.md` §21, `slice-6-screens.md` §13, `slice-7-nation.md` §24, `slice-8-life.md` §22, `slice-8-screens.md` §19 · GDD §0 (*Added 6 Oct 2026*), §2.2, §3.3, §5.4, §6.1, §6.4, §7, §8.5, §11.2, §13.4–§13.7, §14.6, §14.9–§14.13, §15.3, §17.1, §19.2 · `docs/economy.md` §24 |
| **ADRs** | [0073 the prologue](../adr/0073-the-last-train-in-faction-as-an-answer-and-a-welcome-only-favour.md) · [0074 local editions](../adr/0074-local-editions-one-stored-paper-local-parts-at-read.md) · [0075 the journey on the map](../adr/0075-journey-on-the-map-content-routes-and-card-at.md) · [0076 home cities one map, the capital tiles](../adr/0076-home-cities-one-map-capital-districts-tile-the-picture.md) (reverses [0035](../adr/0035-home-quarters-outlines-and-overview.md) for home cities) · [0077 the Town Hall](../adr/0077-the-town-hall-an-always-open-place-and-the-councils-public-view.md) · [0078 the cells' costs](../adr/0078-the-cells-costs-orders-off-an-arrest-always-marks-and-the-cells-list.md) |
| **Environment** | **Local only.** Everything is played in `pnpm dev:mem` with the dev panel. Migration 008 is written properly (idempotent, counted) even though only local databases exist |

Every number below is a GDD or answers number. Where the design leaves a point open, this document takes a default and lists the question in §23.

---

## 1. Scope

**In.** The fix list, answers §28, items 5–28 and the art list, grouped into nine features:

| # | Feature | Fix list items | Section |
|---|---|---|---|
| F1 | *The Last Train In* prologue, the favour, the reference recruit | 21 | §4 |
| F2 | Local editions of the paper | 27 | §5 |
| F3 | The journey on the nation map (`nation.routes`, `cardAt`) | 26 | §6 |
| F4 | Irongate's five outlines tile the picture; the drag limit | 25 | §7 |
| F5 | One map for each home city; locked pins; Places grouped | 22 | §8 |
| F6 | The `town-hall` place, its sheet, the desk, *What now*, the plate line | 12, 23, 24 | §9 |
| F7 | *Live here*; the Lodgings card | 18, 19 | §10 |
| F8 | The cells' three costs; *In the cells now* | 7, 20, 28 | §11 |
| F9 | The clock, one countdown style, Heat's line and note, the rank ladder, the paper on a desk, orders away, the order test's content check, help notes and copy | 5, 6, 8–11, 13–17 | §12 |

**In hand (not designed here, verified in phase 0):** fix list 1–4 (the level-up line, the HUD label pairing, the order test for the mission order, Health always shown) and the five faces.

**Out:** §21.

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| How the party is chosen | **Beat 1's answer carries `{ kind: 'faction', factionId, person }`**. `arrival.join` takes no input and derives the faction. The street and the faction cards go. Phases are `face → story → ready → arrived` | ADR 0073, §4 |
| The origin DSL | `faction`, `stat` (≤ 6), `wear`, `ambition`. **`chaBase`, `iron` and `wish` are removed.** CHA is worn only. Three steps of one question each | ADR 0073, §4.1 |
| The favour | A `CheckedAction` with **`use: 'welcome'`** at the HQ, offered only while its welcome-B order is open. `energy3: null`. `NOT_OFFERED` outside its order, checked inside the action's transaction | ADR 0073, §4.4 |
| The first landing | `welcomeLanding` returns the HQ and the favour's `actionId` (the ticket highlighted) | §4.4 |
| Which paper | **Always the residence's**, stored at settlement as now (`paperCityOf`). The **edition** (masthead line, dateline, local ambient, one local line, local Issues first, the local election line) is composed **at read** by a pure `composeHeadlines` | ADR 0074, §5 |
| The neutral local line in a home-city edition | The Herald's city lines name the capital, so they cannot serve. **Default: no local line in home-city editions** until the designer writes `{city}` forms; the Irongate edition uses the Herald's lines | §23 Q2 |
| Routes | `nation.routes[]`: four legs from the capital, 8–20 points, traced in a new **trace mode** of the dev map viewer. Rules `journeyLegs` and `trainAt` (time split by leg minutes, then by length within a leg) | ADR 0075, §6 |
| The card's moment | `journeys.card.at`, drawn at boarding from `seed:cardAt` in [0.20, 0.80]. The card's content is withheld until then. `travel.choose` refuses before it with **`CARD_NOT_YET`**. No job, no pointer change | ADR 0075, §6 |
| Irongate's outlines | The five polygons of answers §8.2. The loader **proves a tiling**: area 1, every inner edge shared in reverse, pins, anchors and labels inside | ADR 0076, §7 |
| The drag limit in a district | `CityMap.panLimit` = the outline's bounding box (still widened so every pin clears the blocks). Frames stay the zoom targets | ADR 0076, §7 |
| Home quarters | `frame`, `outline`, `label`, `district`: **capital only** (loader). `teaser` removed. `opens`, `name` and `blurb` stay. A home quarter is a group on the Places list | ADR 0076, §8 |
| Locked and later places | `CityView.lockedPins[]`: locked locations, plus survey pins with no location (`content.laterPins`, derived from `mapPins`, lock `edition`). No tickets leave the server | ADR 0076, §8 |
| Which places open | **`placeOpen(quarter, kind, level, heldHere)`**: `town-hall` is always open. Replaces `quarterOpenFor` at every place-level call, including the in-hand `startableMissions` and `firstPin` | ADR 0076–0077, §3.2 |
| The Town Hall | `LocationKind` gains `town-hall`. Four locations. **`council.hall = { locationId }`**. **`council.hall({ cityId })` → `TownHallView`** for any council city; `desk` only for a councillor of that council | ADR 0077, §9 |
| The plain rule line | **New `Ordinance.plainLine`** (≤ 60). The existing `effectLine` (caps, numbers) stays on the order paper and the menu | ADR 0077, §23 Q1 |
| *What now* | `officeTerms.whatNowSeenAt` + `council.whatNowSeen` (a conditional `$set`, no key). The front page's card rides on `frontPageSeenAt` | ADR 0077, §9 |
| Residence | One `ResidenceCardView.state` per answers §9.2 row. **The room leaves the card** | §10 |
| Lodgings | `Location.lodgings { line }` (Tram Junction). `LocationView.lodgings`. `residence.room` input gains `locationId` (`NO_LODGINGS`, `NOT_HERE`). Rules unchanged | §10 |
| The sentence | `CELLS.baseMinutes` **20** | ADR 0078, §11 |
| Orders off | **`orders.off { at, reason: 'cells' }` on the day's orders state.** It ends with the settlement's new orders. `advanceOrders` and `findAdvancingItem` advance nothing while it is set. The arresting act counts for nothing (§23 Q4) | ADR 0078, §11 |
| An arrest marks | `marksFor`: one minor mark when the type carries none. **Every arrest** is recorded for the seven-day escalation | ADR 0078, §11 |
| *In the cells now* | `held.inCells({ locationId })` over `characters` with a **partial index**; `until > now`; public fields only | ADR 0078, §11 |
| Times on screen | **`copy.when(at, now)`** (pure, `Intl`, the player's zone) renders every moment, including `{until}` tokens. The server sends epoch ms and day keys only (it already does) | §12.1 |
| The clock | Client only: `useNow` (server skew, dev clock included). The note's `{dayTurn}` and night window come from `CITY_DAY` and `DAY_NIGHT` in the player's zone | §12.1 |
| Paper on a desk | `PaperSheet` in `packages/ui` (CSS only) on every paper-ground page | §12.6 |
| The rank ladder | `CharacterView.ranks[]` (title, Party XP floor, opens key); `RankLadderSheet` | §12.4 |
| Reputation tag | `PlaceTag { kind: 'known' }` from the server on checked tickets at Familiar or better | §12.5 |
| Home orders away | `OrdersView.away { cityName, done, of }` in **any** city but the residence (it replaces `elsewhere`) | §12.3 |
| The order test | In hand for the mission order. **Plus a content test:** every other rotation template has a matching ticket open at Level 1 with no gate in its residence city | §12.7 |
| Shared files across lanes | Phase 1 adds a **place-card slot** to the place sheet, `copy.when`, `PaperSheet`, the error reasons and migration 008's skeleton (one function per feature) | §3, §22 |
| Jobs | **None new.** `cardAt`, orders off and *What now* are lazy or conditional | §15 |

---

## 3. Shared groundwork

### 3.1 The place sheet's card slot (`packages/ui`)

The place sheet (`LocationSheet`, `Places.tsx` / `Sheets.tsx`) gains `cards?: ReactNode[]`, rendered after the tickets and missions in a fixed order. Order: the Jobs card (moved in) · Lodgings · *In the cells now* · the Town Hall's blocks · (slice 8: shops). `apps/client/src/routes/city.tsx` builds the array from the `LocationView` flags. Each lane adds its card here and never edits another lane's lines.

### 3.2 `placeOpen` (`packages/rules/src/quarters.ts`)

```ts
export const ALWAYS_OPEN_KINDS = ['town-hall'] as const;
export function placeOpen(i: {
  quarter?: { opens?: QuarterOpens };
  kind: string;
  level: number;
  heldHere?: boolean;
}): { open: boolean; lock: QuarterLock | null };
```

`quarterOpen` stays (the capital's districts, the Places list's group headers). The server wraps it as `placeOpenFor(content, c, location)` and uses it in `cityView`, `firstPin`, `startableMissions` (in hand), `missionCtx`, the order pins, and **the action and mission refusals**.

**A gap found while designing this.** Today `actionService` and `missionService` never check the quarter. The city view hides a locked quarter's places, but a Level-1 player who posts `action.perform` for a Harbour ticket is served. From T11, both refuse a place `placeOpenFor` rejects:

- `ACTION_LOCKED { reason: 'QUARTER', need: level }`, or `{ reason: 'EDITION' }`;
- `MISSION_LOCKED { lock: 'QUARTER', need }`.

The check uses the existing reasons with a new `reason` value, runs before any write, and has a server test.

### 3.3 Error reasons (`GameErrorReason`, rules `types.ts`)

New: `NOT_OFFERED` (a welcome ticket outside its order) · `ONCE_ONLY` (×3 on a one-off ticket) · `CARD_NOT_YET { at }` · `NO_LODGINGS` · `NOT_HERE` (lodgings in another city) · `NO_COUNCIL` (a hall query for a city without one). Their words are in `copy.errors.*` (the vocabulary tests run over them).

### 3.4 Migration `008-review4.ts` (skeleton in phase 1)

One exported step per feature, each idempotent, each printing matched and modified counts; the runner calls them in order. Details in §14.

---

## 4. F1 — *The Last Train In* (answers §2; GDD §7, §8.5, §13.7, §17.1; ADR 0073)

### 4.1 Content (`packages/content`)

**Schemas.**

```ts
OriginEffect = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('faction'), factionId: FactionId, person: NpcId }),
  z.strictObject({ kind: z.literal('stat'), stat: z.enum(['str','int','agi']), value: z.number().int().min(1).max(6) }),
  z.strictObject({ kind: z.literal('wear'), itemId: ItemId }),
  z.strictObject({ kind: z.literal('ambition'), ambitionId: AmbitionId }),
]);
OriginAnswer = z.strictObject({
  id: Id,                                         // 'holm', 'tools', 'ward-book' (was one letter)
  text: z.string().min(1).max(140),               // beat 1's asks run to ~110
  lines: z.tuple([z.string().max(80), z.string().max(80)]).optional(), // beat 1's two Courier lines
  portrait: AssetId.optional(),                   // beat 1's rows (40 px)
  confirm: z.string().min(1).max(60).optional(),  // beat 1: "Help Holm · the six o'clock to Coalport"
  hint: z.string().min(1).max(80).optional(),     // beat 3 (63 characters today)
  echo: z.string().min(1).max(80).optional(),     // shown on the next step
  effects: z.array(OriginEffect).min(1),
});
OriginQuestion = z.strictObject({ id: Id, prompt: z.string().max(120).optional(), answers: z.array(OriginAnswer).length(3) });
OriginStep = z.strictObject({
  id: Id, kicker: z.string().max(80), title: z.string().max(40), narrative: StoryText, art: AssetId,
  portrait: z.union([AssetId, z.literal('helper')]).nullable(),   // beat 2: the person helped
  note: z.string().max(120).optional(),                            // beat 1: "Whoever you help, you go with…"
  questions: z.tuple([OriginQuestion]),
});
Origin = z.strictObject({ steps: z.tuple([OriginStep, OriginStep, OriginStep]), reference: z.tuple([Ref, Ref, Ref]) });
```

`Npc` gains `pronoun: z.enum(['she','he'])` (Holm *she*, Stahl and Grey *he*). `STORY_PLACEHOLDERS` gains `helper` (the surname: *Holm*) and `helperPronoun` (capitalised: *She*). The designer's `{Holm}` / `{She}` / `{City}` are transcribed as `{helper}` / `{helperPronoun}` / `{city}`.

`CheckedAction` gains `use: z.literal('welcome').optional()`.

**Loader checks (added).**

- Step 1: each answer has exactly one `faction` effect; the three factions are distinct; `person` is that faction's secretary; each answer has `portrait`, `lines` and `confirm`.
- Step 2: each answer's `stat` effects are one +6 and one +1 on different stats.
- Step 3: each answer has one `ambition` and one `wear: 'outfit.fathers-coat'`.
- `reference` = `holm · books · ward-book`.
- Every story text is ≤ 240 characters with ≤ 4 sentences (existing `checkStory`).
- A `use: 'welcome'` action is at a `faction-hq`, has `type: 'council'` and is matched by exactly one `use: 'welcome'` order template of that faction, which is that faction's `welcomeOrders.B`.

**Data.**

| File | Change |
|---|---|
| `data/origin.ts` | Rewritten: `origin.step-platform` (`scene.station`, no step portrait, the three rows of answers §2.3, the note), `origin.step-suitcase` (`scene.train-compartment`, `portrait: 'helper'`, answers §2.4), `origin.step-lining` (`scene.train-compartment`, no portrait, answers §2.5). Echo lines on beat 1's answers (shown on beat 2) and beat 2's (shown on beat 3, *You carry tools.*). `street` removed |
| `data/people.ts` | `pronoun` on the three secretaries |
| `data/cities/{coalport,duskwall,ashford}.ts` | A favour at each HQ: `coalport.union-hall.favour` (*Deliver the parcel*), `duskwall.beacon-house.favour` (*Hand out the bundle*), `ashford.assembly-rooms.favour` (*Witness the signature*). Type `council`, `stats: ['best']`, 10 Energy, `givesFxp: true`, `givesOpinion: false`, `use: 'welcome'`, texts of answers §2.6 (headlines: §23 Q3). **First in the HQ's action list**, so it is the first ticket on the sheet |
| `data/orders.ts` | `dir.welcome-b`, `dir.v.welcome-b`, `dir.a.welcome-b`: slot B, `use: 'welcome'`, match the favour's id, target 1, `attempts`, title and line of answers §2.6 |
| `data/factions.ts` | `welcomeOrders.B` → the three new ids |
| `data/headlines.ts` | The welcome headline's deck per answers §2.6 (*…Holm's parcel wants delivering at the Union Hall; start there.*), and the Sentinel's and the Gazette's equivalents |
| `data/ambitions.ts` | The three chapter-1 openers of answers §2.8 |
| `data/art.ts` | `scene.train-compartment` (source `mvp/scenes/train-compartment.png`, 2688 × 1520 crop, alt from the designer); `scene.origin-deathbed` and `scene.origin-street` stay catalogued, unbound |
| `data/copy.ts` | `copy.arrival.*` (*Help {helper}*, the progress line), with the street's and the faction cards' strings removed |

### 4.2 Rules (`packages/rules/src/origin.ts`)

```ts
export type OriginEffect =
  | { kind: 'faction'; factionId: FactionId; person: string }
  | { kind: 'stat'; stat: TrainableStat; value: number }
  | { kind: 'wear'; itemId: string }
  | { kind: 'ambition'; ambitionId: string };

/** The party beat 1 chose, or null before it is answered (the view's {city}, {helper}). */
export function originFaction(origin: OriginSpec, answers: readonly OriginAnswerRef[]): { factionId: FactionId; person: string } | null;

export interface OriginOutcome {
  factionId: FactionId;
  stats: { str: number; int: number; agi: number; chaBase: 0 };
  iron: number;            // STARTING.iron (0)
  fxp: 0;
  ambitionId: string;
  items: Array<{ itemId: string; equip: ItemSlot | null; source: 'kit' | 'origin' }>;
}
export function resolveOrigin(i: {
  origin: OriginSpec;
  answers: readonly OriginAnswerRef[];
  factions: readonly OriginFaction[];
}): { ok: true; outcome: OriginOutcome } | { ok: false; reason: 'ORIGIN_INCOMPLETE' | 'UNKNOWN_ANSWER' | 'NO_FACTION'; answered: number };
```

The stats are 5 each, plus beat 2's +6 and +1, plus the faction's `startingBonus`. The coat is worn, and the faction outfit is kept (unchanged code path). `buildNewCharacter` takes `factionId` from the outcome.

**Tests (`origin.test.ts`, rewritten):**

- *Collective, books, ward book* → STR 8, INT 12, AGI 5, `chaBase` 0, worn CHA 5 (`wornCha` with the coat), Ambition `finish-his-work`, FXP 0, Rank 1.
- *Vanguard, tools* → 14 / 6 / 5. *Alliance, books* → 6 / 14 / 5.
- *light* in any party → AGI 11.
- An unknown answer, two answers, and a beat 1 with no faction effect (fixture) are refused.

### 4.3 Data model

No schema change to `arrivals` (`factionId` is still written at the join). Migration 008's step `resetOldDrafts` (§14).

### 4.4 Server

**`arrivalService.ts`.**

- `questionsOf`: unchanged shape (3 × 1).
- `storyScreen(content, a)`:
  - The echo is the previous step's answer's `echo` (steps 2 and 3).
  - The step portrait `'helper'` resolves to the beat-1 person's portrait.
  - `vars = storyVars(content, { name, factionId, helper, helperPronoun })` from `originFaction`.
  - Each choice carries `portrait`, `lines`, `confirm`. The view gains `note`.
- `arrivalView`: `phase: 'face' | 'story' | 'ready' | 'arrived'`. `ready` means all three answers are in and the draft has no character. `street` is removed from `ArrivalView`.
- `answerArrival`: unchanged (set-once, in order, `answers: { $size: i }`).
- `joinArrival(content, user, now)`: no `factionId`. It resolves the faction from the draft's answers inside the transaction; the existing natural-key and `completedAt` guards are unchanged. `existing()` returns the winner's character. `ALREADY_ARRIVED` is now only "a character exists with another faction than the draft's", which cannot happen except through test hooks.

**The favour (`actionService.ts`, `cityService.ts`, `views.ts`).**

- `welcomeOffered(content, c, actionId, today)`: true iff `c.orders.day === today` and an item with `doneAt === null` has a template with `use: 'welcome'` whose `match.actionIds` includes the action.
- `action.perform`: for an action with `use: 'welcome'`, inside `runKeyedAction`'s transaction and on the character read there:
  - not offered → `NOT_OFFERED` (nothing written);
  - `times === 3` → a new `ONCE_ONLY` reason, the twin of `ONCE_ON_RIVAL_GROUND` (copy: *Once only*).
- `cityView`: the favour's `ActionView` is present only when offered, with `energy3: null` and its order tag. It is absent otherwise, so the HQ sheet shows the ordinary committee session.
- `welcomeLanding(content, doc)`: slot B's template → its first `actionIds` → `{ cityId, locationId, actionId }`. `Landing` gains `actionId?: string`.
- `buildEdition`: `{place}` names slot B's location (the HQ).

**Tests (`apps/server/test/review4.prologue.test.ts`):**

- Three answers then `join` → the character's faction, home city, stats and coat; the first day's orders are `[A by best stat, welcome-b, take-a-job]`; the welcome edition's deck names the HQ.
- Two concurrent joins → one character.
- `join` before three answers → `ORIGIN_INCOMPLETE`.
- A migrated draft (answers reset) starts at the platform.
- The favour:
  - shown on the welcome day while its order is open;
  - a tap pays the council rates with *First day* +10 % and completes slot B with the orders' signed line;
  - a second tap under a new key → `NOT_OFFERED`;
  - ×3 → `ONCE_ONLY`;
  - two concurrent taps under two keys → one result.
- The landing is the HQ with the favour's id.

### 4.5 Client and UI

- `packages/ui` `StoryScreen`:
  - rows mode: a 40 px portrait at the left, the title in body 600, two Courier lines;
  - select-then-confirm when the choices carry `confirm` (local state only; the button commits);
  - the `note` line under the rows;
  - the echo at the top.
- The street, `FactionCard` and the wish tag are deleted.
- `apps/client/src/routes/arrive.tsx`:
  - `story` → one `arrival.answer` per beat;
  - on `ready`, call `arrival.join({})` at once (also on mount, so a reload finishes the join);
  - then `/paper` (the welcome edition). Its *To the city* opens `/city/$cityId?loc=<hq>&act=<favour>`.
- `city.tsx` and the place sheet: `act` highlights that ticket (a 2 px ink ring) and scrolls it into view once.
- Sign-up: eighteen faces (check that the grid shows `content.avatars`, all eighteen).
- **`apps/client/e2e/helpers.ts`** (`signUpAndArrive`): `ANSWERS` become the three beats (`holm`/`stahl`/`grey` rows by party, `books`, `ward-book`), plus the confirm tap. It changes **in the same commit** as the server and client (every spec uses it).

### 4.6 The result modal

The favour's result is an ordinary `ActionResult` (`kind: 'action'`):

- **Check rows:** the best stat's row, *First day in Coalport* +10 % and Reputation.
- **Receipt:** XP, Iron, and Party XP with the `council` share line.
- **Order line:** the welcome-B order's completion, in the secretary's `orderSigned` voice.
- **Opinion:** none.

Nothing new in the breakdown.

### 4.7 Risks

- Every e2e spec signs up through the helper: one broken selector stops the suite. Land the helper with the screens and run the whole suite before the commit.
- Story texts over the old 80-character answer limit wrap on 360 px phones. The rows are designed for it (answers §2.3); `story.test.tsx` checks 360 × 640.

---

## 5. F2 — Local editions (answers §23; GDD §3.3; ADR 0074)

### 5.1 Content

Nothing new is written for the capital: the Herald's city lines already exist, and the ambient sets exist for all four cities. `copy.paper.edition(cityName)` → *· {City} edition*; `copy.paper.localElection(city, until)` → *{City} elects its council: voting until {when}*; `copy.help.edition`. **Neutral home-city local lines:** none until the designer writes them (§23 Q2). The content slot is reserved: headline templates with `group: 'city'` and a new `cityId: '*'` (any city), placeholders `{city}`, `{ordinance}`, `{winner}`. The loader and `composeHeadlines` accept an empty set.

### 5.2 Rules (`packages/rules/src/paper.ts`)

```ts
/** The ambient line the settlement would pick from these templates on this day (extracted from selectHeadlines). */
export function ambientFor(templates: readonly HeadlineTemplate[], day: DayKey): HeadlineTemplate | null;

export interface EditionParts {
  stored: LiveHeadline[];                 // today's stored edition (personal, city, ambient)
  residenceLive: LiveHeadline[];          // the residence's live political and capital lines
  local: { ambient: LiveHeadline | null; line: LiveHeadline | null } | null;  // null: at home
  storedFirst: boolean;                   // the welcome edition
}
/**
 * At home: mergeHeadlines(stored, residenceLive). Away: the stored ambient dropped; personal (stored
 * and live, by priority, at most PAPER.personalMax), then the local line, then the residence's city
 * lines, then the local ambient; at most PAPER.headlines.
 */
export function composeHeadlines(p: EditionParts): LiveHeadline[];
```

**Tests:** at home equals today's merge for every fixture in `paper.test.ts`; away with 0 / 1 / 2 / 3 personal lines; with and without a local line; the cap; the welcome edition (`storedFirst`) never composed away (a new character is at home).

### 5.3 Server (`paperService.ts`, `residence.ts`, `capitalPaper.ts`, `edition.ts`)

- `paperCityFor` → **`paperCityOf(c)`** = the residence city. `buildEdition` uses it. The capital resident's stored lines still come from the Herald's templates.
- `getPaper`:
  - `here = c.journey?.status === 'onTheWay' ? c.journey.to : c.cityId`.
  - `local = here !== entry.cityId ? here : null`. This is compared with the **stored** `entry.cityId`, so an edition printed before this change as a visitor's Herald renders as it was.
  - If `local === capital`: the slice-4 visitor block (`visitorFacts`, `selectPoliticalHeadlines` over `politicalHeadlinesOf(capital)`) produces the local line (its first). If `local` is a home city: the `cityId: '*'` templates with that city's political facts (empty today).
  - The local ambient: `ambientFor(content.headlinesOf(local), today)`.
- `PaperView` v6 (rules `types.ts`):

  ```ts
  paper: PaperMasthead;                         // entry.cityId's paper (unchanged source)
  edition: { cityId: string; cityName: string } | null;
  dateline: { weekday; date; city };            // city = here
  issues: Array<IssueRowView & { local: boolean }>;   // the local city's two first
  localElection: { cityName: string; phase: 'nominations' | 'polling'; until: number } | null;
  ```

- `paperIssues(content, c, today, { local })` returns the local city's live Issues first (`local: true`), then the residence's.
- `localElection` is built from `councilDay(today, localCity.council.offset)` when the local city has a council and is in nominations or polling.
- The visitor-specific code in `getPaper` (the `visitor` array) is removed. `travelService` drops `knockOns.heraldVisitor` (`JourneyView.arrival.knockOns`), and `ResultModal` drops its line (§23 Q5).

### 5.4 Client and UI

`Paper.tsx`:

- the masthead's edition line (Courier, under the name, dotted, opening `help.edition`);
- the dateline's city;
- the Issues block in the order sent, the local pair under the city's name;
- the local election Courier line under the residence's Election row.

The rival-ground *Where you are* desk row is unchanged.

### 5.5 Tests

- **Server** (`review4.editions.test.ts`):
  - A Coalport resident in Duskwall reads *The Coalport Clarion* with `edition: Duskwall`: Duskwall's dateline, ambient and Issues first; their own personal lines, orders and Letters.
  - The same resident in Irongate gets the Herald's city line as the local line.
  - On a train to Duskwall, the edition is Duskwall's.
  - A capital resident in Coalport reads *The Irongate Herald* with `edition: Coalport`.
  - At home there is no edition and the output is identical to today's.
  - A visitor's Herald stored before the change renders as the Herald.
- **UI:** the masthead with and without an edition at 360 px.

### 5.6 Risks

`getPaper` already reads 4–6 collections. The local city adds its city document (cached by `ensurePlaces` for `here`) and its Issues. Measured in the read-path test, with a budget of two more queries away from home and none at home.

---

## 6. F3 — The journey on the nation map (answers §7; GDD §14.10; ADR 0075)

### 6.1 Content

```ts
Nation.routes = z.array(z.strictObject({
  to: Id,                                                        // a nation city other than the capital
  points: z.array(z.tuple([Fraction, Fraction])).min(8).max(20), // from the capital's pin to the city's
})).length(4);
```

The loader checks:

- one leg per non-capital nation city;
- `points[0]` equals the capital's nation pin (`x, y`) and the last point equals the city's;
- no two consecutive points are equal;
- every point is inside the picture.

`routes` is **optional until phase 6's tracing task**, then required.

**The dev map viewer's trace mode** (`apps/client/src/features/dev/MapViewer.tsx`):

- a *Trace* toggle: each tap adds a point in fractions, drawn as a polyline;
- *Undo* and *Copy* (the JSON for `nation.ts`);
- it shows `nation.routes` and any city's outlines from content, so Irongate's shared points can be slid along the river with the shared points kept equal (answers §8.2).

Dev only, as the viewer is.

`copy.travel.*`: *arrives in {when} · {clock}*, *Follow the train*, the train's name (*The {hh:mm} to {City}*), *THIRD CLASS · CAR 4*, and the sentence of answers §7.3 (*You can close the game* removed).

### 6.2 Rules (`packages/rules/src/travel.ts`)

```ts
export type Pt = readonly [number, number];
export interface RouteLeg { points: Pt[]; minutes: number }
/** Legs from `from` to `to`: a capital leg as stored or reversed; outer to outer through the capital. */
export function journeyLegs(
  routes: ReadonlyArray<{ to: string; points: readonly Pt[] }>,
  from: string, to: string, capitalId: string, minutesOf: (cityId: string) => number,
): RouteLeg[];
/** The train at `progress` (0–1 of the journey's time): each leg takes its minutes' share of the time, and within a leg the train moves by length. */
export function trainAt(legs: readonly RouteLeg[], progress: number): { x: number; y: number; angle: number; leg: number };
export const CARD_AT = { from: 0.2, to: 0.8 } as const;
/** The card's moment, epoch ms (whole seconds), uniform in CARD_AT of [boardedAt, arrivesAt]. */
export function drawCardAt(rng: Rng, boardedAt: number, arrivesAt: number): number;
```

**Tests:**

- `trainAt(·, 0)` is the origin pin and `trainAt(·, 1)` the destination pin.
- The train moves monotonically along the arc.
- With two legs of 12 + 15 minutes the capital is reached at 12/27.
- A reversed leg is the same path.
- `drawCardAt`: over 10,000 seeds every value lies in [0.20, 0.80] of the window, the mean is 0.50 ± 0.01, and one seed always gives the same moment.

### 6.3 Data model

`JourneyDoc.card: { eventId; deck?; at?: Date } | null` (Mixed; absent `at` reads as `boardedAt`). There is no character pointer change. Migration 008's `cardAtForOpenJourneys` sets `card.at = boardedAt` on `onTheWay` journeys with a card and no `at`.

### 6.4 Server (`travelService.ts`)

- `board`: when a card is drawn, `card.at = new Date(drawCardAt(createRng(seed + ':cardAt'), now, arrivesAt))`, inside the existing keyed transaction (a re-run draws the same moment). Deportations: unchanged, with no card.
- `journeyView` (`JourneyView` v3):

  ```ts
  route: { legs: Array<{ points: Pt[]; fromT: number; toT: number }> };   // time fractions per leg
  map: { day: AssetView; night: AssetView };                               // the nation pictures (tiles)
  cardAt: number | null;                                                   // whenever a card was drawn
  card: JourneyCardView | null;                                            // only when now ≥ cardAt
  ```

- `choose`: inside the transaction, after loading the journey, `if (now < cardAtOf(j)) throw new GameError('CARD_NOT_YET', { at })`. Nothing is written, and the request key is not consumed. Every other check is unchanged.
- The arrival and the tidy job: unchanged. The arrival modal carries the card if unanswered (as now).

### 6.5 Client and UI

- `apps/client/src/routes/journey.tsx` becomes **`JourneyMap`**:
  - one `CityMap` on the nation picture (tiles, day or night), its frame fitted to the two cities' pins grown by 0.08;
  - the other cities muted (`muted` pins);
  - an SVG overlay: the legs as a 2 px ink polyline over a 4 px paper halo, drawn in fractions so it holds at any zoom;
  - **`TrainMark`** at `trainAt(legs, journeyProgress(boardedAt, arrivesAt, now))`, `useNow(1000)`, with the name under it in Courier;
  - after a user drag, a *Follow the train* chip recentres the view.
- **The plate** (top on a phone, a 480 px side sheet from 1024 px): kicker, title, *arrives in 7 min · 14:22* (`copy.when` + the clock), the 2 px track (`JourneyProgress`, kept), the sentence, and the two *while you ride* rows in its foot.
- **The card:** a timer at `cardAt` (+400 ms) refetches `travel.journey`. When `card` arrives, a `BottomSheet` opens with `JourneyCard`, and the train mark pulses once (`ease-card`; no pulse under reduced motion). On return with an answerable card the sheet is open.
- At `arrivesAt`: as today, the arrival modal over the destination.
- **The train mark art:** `vector.train-mark` (answers §28 art 2) when delivered. Until then, `TrainMark` draws a 28 px ink disc with a brass ring and the existing locomotive-free label, so nothing waits on art.

### 6.6 Tests

- **Server** (`review4.journey.test.ts`):
  - Boarding stores `card.at` within [0.2, 0.8] of the window.
  - The view hides the card before `at` and shows it after (dev clock).
  - `choose` before `at` → `CARD_NOT_YET` with no write, and the same key succeeds after `at`.
  - The hostile deck behaves the same.
  - An unanswered card is in the arrival modal.
  - A migrated journey with no `at` is answerable at once.
- **UI:** `TrainMark` positions for fixtures.
- **E2E:** `travel.spec.ts` updated: board, the plate's line, the dev clock jumped past `cardAt` → the sheet, answered, arrival.

### 6.7 Risks

- A 1 Hz re-render of a tiled map on a low-end phone. Only the overlay group moves (a `transform` on one SVG `<g>`); the tile layer does not re-render. The slice-9 performance check covers `/journey`.
- Hand-traced routes. The loader checks the endpoints, and the viewer shows the route over the painted rails.

---

## 7. F4 — Irongate's five outlines tile the picture (answers §8; GDD §14.9; ADR 0076)

### 7.1 Content

- `cities/irongate.ts`: the five `outline`s of answers §8.2, typed point for point, so shared points are equal.
- Each `label` is re-checked inside its outline (the viewer). The frames, anchors and `n` are unchanged.
- The new City Hall pin (§9) lies inside the Government Quarter.

**Loader (`geometry.ts` + `load.ts`):**

```ts
export function polygonArea(poly: readonly Pt[]): number;            // shoelace, absolute
export function tilingProblems(cityId: string, outlines: ReadonlyArray<{ id: string; poly: readonly Pt[] }>): string[];
```

`tilingProblems` returns a named problem when:

- the areas don't sum to 1 (± 1e-9): *a gap or an overlap*;
- an inner edge has no reversed twin: *an unshared point* (a T-junction);
- an edge is shared by more than two outlines.

The existing checks still apply: pins inside their own outline, no strict overlap. New: anchors and labels inside. A failing fixture is added for each.

### 7.2 Client and UI

`CityMap` gains `panLimit?: MapRect`.

- With it, `restPanLimits` and `panLimits` use `panLimit` instead of the frame grown by `REST_PAN_MARGIN` / `FRAME_PAN_MARGIN`.
- The existing widening, so that every pin can be brought clear of the blocks, is kept on top.
- The zoom-out limit is unchanged.
- `city.tsx` passes `bboxOf(district.outline)` in a district view.
- The overview draws the five outlines edge to edge (no change in drawing code; the shapes changed).

### 7.3 Tests

- **Content:** the tiling of the real data, and the three failing fixtures.
- **UI:** `maps.test.tsx` tests `restPanLimits` with a `panLimit` (the outline's corner reachable at rest and zoomed).
- **E2E:** `capital.spec.ts` drags to Station & Market's south-west corner (0.02, 0.98) inside the district.

### 7.4 Risks

Labels that sat in the old unassigned band may now overlap an edge. The viewer check is the remedy, and the label test (≥ 0.25 apart) stands.

---

## 8. F5 — One map for each home city (answers §21; GDD §14.13; ADR 0076)

### 8.1 Content

- **`Quarter`:**
  - `frame` becomes optional;
  - `outline`, `label` and `district` stay optional;
  - `teaser` is removed.
- **The loader:**
  - for a districted city, every quarter has `frame`, `outline`, `label` and `district`;
  - for any other city, none of them;
  - every location's `quarterId` exists;
  - the old "pin inside its quarter's frame" applies to districts only.
- **`cities/{coalport,duskwall,ashford}.ts`:** `frame`, `outline`, `label` and `teaser` are removed from every quarter. `opens`, `name` and `blurb` are kept.
- **`mapPins.ts`:**
  - add `coalport.town-hall` (0.525, 0.19, q1), `duskwall.town-hall` (0.555, 0.55, q1) and `irongate.city-hall` (0.57, 0.345, q1);
  - move `ashford.town-hall` to (0.805, 0.275);
  - the header comment changes (ADR 0076).

  The art folder's `pins.json` gets the same edits (the main session; outside the repo).
- **`content.laterPins(cityId)`** (in `load.ts`, at load), for a city with no districts: every survey pin with no location → `{ id, name, map, quarterId: quarters[pin.quarter − 1].id }`.
  - The loader checks that the quarter exists.
  - Today this yields Coalport 4 (the Sidings), Duskwall 4 (the Town) and Ashford 5 (Station Road less the Town Hall).

`copy.map.lockedPlace` (*Opens at Level {n}* / *Opens with a later edition*), `copy.map.lockedSheet` (*Level {n} opens it; you are Level {m}.*), `copy.places.group` (*{QUARTER} · opens at Level {n}*), `copy.plate.homeCity` (*{City} · Home city*).

### 8.2 Rules

`placeOpen` (§3.2). `quarterOpen` is unchanged.

**Tests:**

- `town-hall` is open at Level 1 in a later-edition quarter.
- Any other kind there is locked with `edition`.
- `heldHere` opens.
- Level 6 opens the second quarter.

### 8.3 Server (`cityService.ts`, `views.ts`, `travelService.ts`, `missionCtx.ts`, `actionService.ts`)

- `CityView` v6:

  ```ts
  quarters: QuarterView[];       // capital: as slice 5; home: { id, name, blurb, lock } only
  lockedPins: Array<{ id: string; name: string; quarterId: string; map: { x: number; y: number };
                      lock: QuarterLock }>;            // locked locations, then later pins, in pin order
  ```

  `locations` keeps open places only, now filtered by `placeOpenFor`. Ashford's Town Hall appears at Level 1.
- `placeOpenFor` replaces `quarterOpenFor` in: `firstPin` and `startableMissions` (both in hand), `missionCtx`'s offer, the order pins, and the out-of-Energy card's ticket set.
- **New refusals** (§3.2's gap): `action.perform` → `ACTION_LOCKED { reason: 'QUARTER' | 'EDITION' }`, and `mission.start` → `MISSION_LOCKED { lock: 'QUARTER' }`, for a place `placeOpenFor` rejects. Checked before the transaction's writes, on the character read in it.
- `travelService.landingOf(content, cityId)`: for a city with `council.hall`, **the hall's location** (answers §21.3). The capital keeps Central Station (Irongate is unchanged).
- The first landing for a new character is the HQ (§4.4).

### 8.4 Client and UI

`city.tsx`, home-city path:

- **Removed:** `homeQuarters`, `homeOverview`, `pickQuarter`, the quarter plate, `TramBar` quarters mode, `QuarterTeaserSheet`, `QuartersList`, and `sessionStorage['irongate.lastQuarter.*']`.
- `/city/$cityId/$quarterId` for a non-districted city redirects (`replace`) to `/city/$cityId`, keeping `?loc`.
- **The map:**
  - one `CityMap` with `frame` = the whole picture;
  - at rest the covering scale is centred on the selected pin: `?loc`, else the last pin viewed in that city (the existing memory), else the hall after a train, else the HQ landing;
  - pins: the open places, numbered as today (content `n`), then the locked pins;
  - a locked pin is the ink disc at 50 % with `LockMark` instead of the number, and no zoom on tap.
- **`LockedPinSheet`** (short sheet): kicker *{QUARTER} · OPENS AT LEVEL 6* (or *· A LATER EDITION*), the name, the quarter's blurb, and *Level 6 opens it; you are Level {n}.*
- **The Places list** is grouped by quarter in pin order. A group header carries the name, the lock line, and the blurb on tap. Locked rows are greyed with the Courier note.
- **The plate:** *Coalport · Home city*.
- The capital's path is unchanged.

`packages/ui`:

- `CityMap` pins gain `locked`;
- `PlacesList` takes `groups`;
- `LockedPinSheet` is new;
- `QuarterTeaserSheet`, `QuartersList` and `TramBar`'s quarters mode are deleted with their tests.

### 8.5 Tests

- **Server:**
  - Coalport at Level 1 → 7 open (6 + the hall), 5 locked (Level 6), 4 later.
  - At Level 6 → 12 open, 4 later.
  - Ashford at Level 1 → the hall open.
  - A locked place's ticket is refused (`ACTION_LOCKED { reason: 'QUARTER' }`) and a locked place's mission too (`MISSION_LOCKED`), whatever the client sends, with nothing written.
  - Arrival by train in Duskwall lands on the hall.
- **E2E:**
  - `quarters.spec.ts` is rewritten as **`homeMap.spec.ts`**: one map, the locked pins' sheet, the grouped list, the overview route redirect, 360–1440 px with no overlapping pins.
  - `travel.spec.ts`: the arrival selects the hall's pin.
  - The slice-5 e2e (`missions.spec.ts`, `qa.slice5.spec.ts`): their quarter steps are replaced by pins.

### 8.6 Risks

- `city.tsx` is 1,416 lines with the capital and home paths interleaved. Delete in one task, behind the capital's specs (`capital.spec.ts`, `qa.slice4.spec.ts`) staying green.
- **Pin numbers shift** where a hall is inserted (§9.1). Specs that address pins by number (`getByTestId('pin-7')`) are updated in the same task.

---

## 9. F6 — The Town Hall (answers §10–§11; GDD §15.3, §13.5, §14.9; ADR 0077)

### 9.1 Content

- **`LocationKind`** gains `'town-hall'`. There is no `SceneBinding` (the map crop stands in).
- **Four locations**, placed in each city's list where the designer put them:

  | Location | Placed |
  |---|---|
  | `coalport.town-hall` | after the Mill's six places (pin 7) |
  | `duskwall.town-hall` | after the Fortress's six places |
  | `ashford.town-hall` | after the Wharf's places, in `ashford.station-road` |
  | `irongate.city-hall` | after the Government Quarter's six places |

  Each has its name, `ref` (*the Town Hall* / *the City Hall*), blurb (answers §11.1) and pin (= survey).
- **One ticket** each: `{city}.town-hall.gallery` / `irongate.city-hall.gallery`.
  - *Sit in the public gallery*, type `intelligence`, `stats: ['int']`, 6 Energy.
  - `givesFxp: false`, `givesOpinion: false`.
  - The success and partial texts of answers §11.1 (headlines: §23 Q3).
- **`City.council.hall`** becomes `{ locationId: Id }`. The loader checks that the location is in the city, and that a council city has one.
- **`Ordinance.plainLine`** (≤ 60) on all eleven (answers §11.3). `copy.help.ordinance` gains its line.
- **Copy:**
  - `copy.council.whatNow.*` (kicker, the three lines with `{when}`, *six of ten* in the capital, the button);
  - `copy.council.deskNext.*`;
  - `copy.hall.*` (the block kickers, *Player · {rank}*, *Local candidate · townspeople run by the game*, *Term ends {weekday}*, *No rule in force · the council couldn't agree* / *· the council votes {when}*);
  - `copy.plate.rule` (*Council rule: {name} · {plainLine} · {n} days left*).

### 9.2 Rules (`packages/rules/src/council.ts`)

```ts
export type DeskNext =
  | { kind: 'votes'; at: number }                                          // days 0–1, no vote yet
  | { kind: 'voted'; ordinance: string }                                   // voted; the result is in tomorrow's paper
  | { kind: 'runs'; ordinance: string; untilDay: DayKey; nominationsFromDay: DayKey }  // days 2–4, passed
  | { kind: 'rose'; nominationsFromDay: DayKey };                          // days 2–4, nothing passed
export function deskNext(i: {
  cycleDay: CycleDay; voting: boolean; divideAt: number; voted: string | null;
  passed: { name: string; untilDay: DayKey } | null; nominationsFromDay: DayKey;
}): DeskNext;
```

**Tests:** one per branch, plus the capital's offset.

### 9.3 Data model

`OfficeTermDoc.whatNowSeenAt?: Date | null` (default null). No index: it is read through the term found by `councilKey` and the holder.

### 9.4 Server (`politicsService.ts`, `councilService.ts`, `cityService.ts`, the council router)

- `hallView(content, cityId)` reads the location: name, `ref` (default *the {name}*), x and y.
- **`councilViewFor(content, c, cityId, cityDoc, today, session?)`**: today's `councilView` with the city and the capital flag taken from `cityId` (`content.isDistricted`) instead of `residenceSpec`. `council.chamber` = `councilViewFor(residence city)` (behaviour unchanged; its test stays green).
- **`townHallView(content, c, cityId, now)` → `TownHallView`** (rules `types.ts`):

  ```ts
  export interface TownHallView {
    cityId: string; cityName: string; hall: HallView;
    seatCount: 7 | 10; passVotes: 4 | 6; termEndsAt: number;
    inForce: { ordinanceId: string; name: string; plainLine: string; daysLeft: number } | null;
    noRule: { why: 'divided' | 'beforeVote'; at: number | null } | null;
    seats: Array<{ seat: number; kind: 'player' | 'npc'; name: string; avatar: AssetView | null;
                   rankTitle: string | null; you: boolean; votedFor: string | null;
                   factionId?: FactionId; districtName?: string | null }>;
    paper: { status: 'open' | 'divided'; items: Array<{ n: number; ordinanceId: string; name: string;
             plainLine: string; effectLine: string; movedBy: { kind: 'branch' | 'player'; name: string; you: boolean };
             votes: number | null; passed: boolean }>; against: number | null; rose: boolean };
    nextVoteAt: number | null;
    issues: IssueRowView[];                 // the city's two, as city.get builds them
    election: ElectionCardView | null;      // the city's, as city.get builds it
    desk: (CouncilView & { next: DeskNext }) | null;     // only for a councillor of this council
    whatNow: { termId: string; seatCount: 7 | 10; passVotes: 4 | 6; divideAt: number } | null;
    serverNow: number;
  }
  ```

  It reads: the city document (the ordinance), the current council's terms (`councilKey`), the order paper, the city's Issues and the Election card's inputs.
- **Procedures:**
  - `council.hall({ cityId: z.string().min(1) })` (query). Errors: `NOT_FOUND` for an unknown city, `NO_COUNCIL`, `ELECTION_NOT_READY` (the city not bootstrapped).
  - `council.whatNowSeen({ termId: z.string().regex(/^[0-9a-f]{24}$/) })` (mutation): `OfficeTerm.updateOne({ _id, 'holder.characterId': me, whatNowSeenAt: null }, { $set: { whatNowSeenAt: now } })`, then read back. It returns `{ seenAt }`; a repeat returns the same value.
- `FrontPageView.whatNow` carries the same fields as `TownHallView.whatNow` (shown with the front page; once by `frontPageSeenAt`).
- `CityView.ordinance.plainLine`. `LocationView.hall: true` on `council.hall.locationId`.

### 9.5 Client and UI

- **`TownHallBlocks`** (`packages/ui/src/components/Politics.tsx`, plain props), in the order of answers §11.2:
  1. `YourDesk`: the existing `UpForAVote` and `RuleMenu`, and the Next line;
  2. `RuleInForce` (tap → `help.ordinance`);
  3. `CouncilRows` (rows, not `SeatGrid` tiles; the review-3 line under the locals);
  4. `UpForAVoteReadOnly`;
  5. `IssueRows`;
  6. `ElectionCard`.
- **`WhatNowCard`:** the Standing card's style, three numbered lines, *To your desk at the Town Hall* → `/city/$cityId?loc=<hall>`.
- **The hall's place sheet** (`city.tsx`): when `location.hall`, `useQuery(council.hall({ cityId }))` on open. Its blocks go in the card slot (§3.1), after the ticket. When `whatNow` is set, the card shows above the desk and `council.whatNowSeen` fires once after it is shown.
- **The front page** (`Paper.tsx`): `WhatNowCard` under the headline, above *To the council*.
- **`/council`** (`routes/council.tsx`) renders `TownHallBlocks` for the residence's city on the paper ground (`PaperSheet`). The slate, ballot and count screens are unchanged.
- **The plate:** `copy.plate.rule` from `CityView.ordinance`. Tap → `?loc=<hall>`.

### 9.6 The result modal

The gallery ticket is an ordinary tier-1 `ActionResult`: no Party XP and no opinion rows (the type's `gives*` flags). The desk's acts (`propose`, `councilVote`) keep their political modals.

### 9.7 Tests

- **Content:** four halls, kind, pin = survey, the ticket, `council.hall.locationId`, eleven `plainLine`s ≤ 60.
- **Server** (`review4.hall.test.ts`):
  - A Collective visitor reads Duskwall's hall: seven rows, the rule in force with `plainLine`, the paper read-only, no desk, no *What now*.
  - A Duskwall councillor gets `desk` with `menu` on voting days, and `next` per cycle day.
  - The capital: ten rows, `passVotes: 6`.
  - `whatNowSeen` is idempotent; concurrent calls → one timestamp; another character's term → no change.
  - `council.chamber` is unchanged.
- **UI:** fixtures for each block, the empty states, and *What now* at 360 px.
- **E2E:** `council.spec.ts` follows the desk from the hall (vote, propose), the plate's line opens the hall, and *What now* shows once.

### 9.8 Risks

- `councilView`'s generalisation touches slice 3–4's council reads. `chamber` is kept as the residence alias, with its tests run unchanged before the hall is added.
- Reading another city's council for a city not yet bootstrapped (no order paper): `ELECTION_NOT_READY`, and the sheet shows the ticket and the blurb only.

---

## 10. F7 — *Live here* and the Lodgings card (answers §9; GDD §14.11)

### 10.1 Content

- `Location.lodgings: z.strictObject({ line: z.string().min(1).max(60) }).optional()`, on `irongate.tram-junction` (*A bed on the tram line · 7 nights · 100 Iron*).
- The loader: at most one per city, and only in `ROOM.cityId` (slice 7 widens it to battleground cities).
- `copy.residence.*` follows the §9.2 table (*Live here · 500 Iron*, the stamp *Moved in*). The new `copy.lodgings.*`: the card, *Take a bed*, *Seven more nights*, *renew from {weekday}*, the stamp *Taken*, *A bed in Irongate*. Plus `help.residence` and `help.lodgings`.

### 10.2 Rules

Unchanged: `roomPrice`, `roomTap`, `restedCapFor`, `registerRefusal`. The slice-4 room tests are re-pointed at the new procedure input only.

### 10.3 Server (`residenceService.ts`, `cityService.ts`)

- **`ResidenceCardView` v2:**

  ```ts
  {
    state: 'move' | 'belowRank' | 'cooldown' | 'candidate' | 'short' | 'resident' | 'homeElsewhere' | 'rivalGround';
    livesIn: string; here: string; cost: 500;
    canMoveFromDay: DayKey | null; candidateUntilDay: DayKey | null;
    sinceDay: DayKey | null; votesFromDay: DayKey | null;
    rank2: { title: string; fxp: 400 } | null;
  }
  ```

  The `room` field is removed. One state per row of answers §9.2; `rivalGround` stays (slice 5).
- **`LocationView.lodgings`:**

  ```ts
  {
    line: string;
    price: { base: number; lines: PriceLine[]; total: number };
    running: { untilDay: DayKey } | null;
    tap: 'take' | 'renew' | 'notYet';
    renewFromDay: DayKey | null;
    cap: { now: number; with: number };
  } | null
  ```

  Built from today's `residence.room` view code.
- **`residence.room`:**
  - input `z.object({ locationId: z.string().min(1), idempotencyKey: z.uuid() })`;
  - in the `withRequestKey` transaction: the location has `lodgings` (`NO_LODGINGS`), the character stands in its city and is not on a train or held (`NOT_HERE`, and the existing `assertFree`);
  - the rest is today's `takeRoom`.

  The result's stamp is *Taken*. `register`'s stamp is *Moved in* (copy).

### 10.4 Client and UI

- `ResidenceCard` is rewritten to the table (copy only, from `state`). The register sheet's title is *Live in {place} · 500 Iron* and its button *Live here · 500 Iron*.
- **`LodgingsCard`** (the `JobsCard` pattern) goes in the place card slot.
- The desk's *room* row (`PaperView.desk.room`) stays: it is where the bed shows on the paper.

### 10.5 Tests

- **Server:** each card state; `residence.room` from Tram Junction (100, 7 nights, +50, renewal at ≤ 7, at most 14) unchanged; half price under *Eviction Notices*; `NOT_HERE` from Coalport; `NO_LODGINGS` from the Forecourt; a retry with one key returns one result.
- **E2E:** `qa.slice4.spec.ts`'s room step goes through the Junction.

---

## 11. F8 — The cells' costs and *In the cells now* (answers §17, §19–§20; GDD §19.2, §11.2, §13.7; ADR 0078)

### 11.1 Content

- `headlines.ts`: `hl.cells` and its three sister decks with the orders clause (≤ 200, `fitDeck`).
- `copy.held.*`:
  - the sentence lines of answers §16 and §20.3 (*You can close the game* removed);
  - *Legal Aid · the Alliance pays half your bail* and `help.legalAid`;
  - `help.cells`;
  - the release knock-ons;
  - `copy.orders.off` (*Orders off today · the branch heard about the cells*);
  - `copy.cellsNow.*` (kicker, the empty line, *you*).

### 11.2 Rules

- `constants.ts`: `CELLS.baseMinutes: 20`.
- **`record.ts` `marksFor`:**
  - when `arrested` and the type carries none (legal, or `type: null` on a rival tap) → `add: [{ day, kind: 'minor', logId }]`;
  - the escalation now considers every earlier arrest (`arrests` holds every arrest's day);
  - `finishMission` calls `recordArrest` whenever `arrested`.
- **`orders.ts`:**

  ```ts
  export interface OrdersState { day: DayKey; items: OrderItem[]; allDoneAt: number | null; off?: { at: number; reason: 'cells' } | null }
  export function closeOrders(o: OrdersState, at: number): OrdersState;   // off set once; idempotent
  ```

  `findAdvancingItem` returns −1 and `advanceOrders` returns no advance while `o.off` is set.
- **`missions.ts` `finishMission`** (and the rival tier-1 finish in `runIn.ts`): when the result sends to the cells, `orders = closeOrders(s.orders.before, at)`. The arresting act's progress is **not** counted (§23 Q4), and `MissionFinal.ordersOff = true`.

**Tests:**

- The sentence table: Heat 0 → 20, 58 → 49, 80 → 60, 58 on rival ground → 60.
- `marksFor` on a speech arrest → one minor mark.
- A legal arrest on day 3 then a vandalism arrest on day 8 → three serious marks.
- `advanceOrders` with `off` → no advance; `closeOrders` twice → the same state.
- `finishMission` arrested → `ordersOff`, the orders unchanged from `before`.
- `orderRewards` with nothing advanced → 0.

### 11.3 Data model

- `characters.orders.off`: `{ at: Date, reason: String }`, default null (absent = null).
- The index, declared on `characterSchema` (`syncIndexes` in `ensureIndexes` creates it):

  ```ts
  characterSchema.index(
    { 'held.locationId': 1, 'held.until': 1 },
    { partialFilterExpression: { 'held.state': 'in', 'held.kind': 'cells' }, name: 'held_cells_now' },
  );
  ```

### 11.4 Server

- **Every arrest path** writes `orders` from the rules' result:
  - `missionService` (no run-in);
  - the run-in resolution (choose and luck share `resolve`);
  - the rival tap's run-in in `actionService`;
  - `dev/risk.ts`'s *Send to the cells* hook (it calls `closeOrders` too).

  These writes are inside the existing keyed transactions; `assertKeyFree` still runs first.
- **`OrdersView`** gains `off: { reason: 'cells' } | null`. The panel and the paper print the line, and the order tags on tickets are absent while off.
- **`HeldView`** gains `ordersOff: boolean`. The release result's knock-ons:

  ```ts
  { heat: { before, after, state }, bail?: number,
    record: { added: number; marks: number; level: RecordLevel }, ordersOff: boolean }
  ```

  `record.added` is the stay's existing `marks` (the marks this arrest added); `marks` and `level` are the live record after it.
- **`held.inCells({ locationId: z.string().min(1) })`** (query):
  - the location must be a city's `services.cells`, else `NOT_FOUND`;
  - `Character.find({ 'held.state': 'in', 'held.kind': 'cells', 'held.locationId': id, 'held.until': { $gt: new Date(now) } }, { name, avatarId, factionId, 'held.until' }).sort({ 'held.until': 1 }).limit(50)`;
  - output `{ rows: Array<{ name; avatar: AssetView | null; factionId; until: number; you: boolean }>, serverNow }`.
- `LocationView.cellsHere: true` on `services.cells`.

### 11.5 Client and UI

- **The cells screen** (`Held.tsx`): the sentence, *The branch has taken today's orders off the board.*, the Legal Aid line with its note, and the header's *out in 38 min · or pay bail* (`copy.when`).
- **The release modal's lines.** **The orders panel's off line.**
- **`CellsNowCard`** in the place card slot: the rows (avatar, name, the party's small mark, *out in n min*, *you*) and the empty line. It refetches on open and every 60 s while open.

### 11.6 The result modal

- A mission or rival tap that ends in the cells keeps its `kind: 'mission'` result.
- Its knock-ons gain *Your record: taken in · 1 mark · On file* and *Orders off until the day turns*, from `MissionFinal` (`record.added`, `ordersOff`).
- The release modal is `kind: 'political'` with the knock-ons above.

### 11.7 Tests

- **Server** (`review4.cells.test.ts`):
  - a caught Partial when Hot → `held.until` = since + (20 + Heat ÷ 2) min, `orders.off` set, a minor mark on a watch;
  - an action after it advances nothing;
  - the all-three +5 PC is not paid;
  - the next City Day's orders are open;
  - police loss on a rival tap → the same;
  - luck's resolution → the same;
  - `inCells` lists a Vanguard prisoner to a Collective viewer, excludes a stay past `until` not yet released, marks *you*, and refuses a non-cells place.
- **Economy:** `packages/rules/test/qa.gdd.test.ts`'s cells figures and `docs/economy.md` §24.3's bail.
- **E2E:** `missions.spec.ts` checks the lines; a second context reads the station's list.

### 11.8 Risks

Four arrest paths. One rules function decides (`finishMission` and the rival finish), and the server writes the result's `orders` as it already writes the result's record. A test per path.

---

## 12. F9 — The clock, the countdown style, Heat, ranks, the paper on a desk, orders away, the order test, the notes and copy (answers §3–§6, §12–§18, §22, §24–§25)

### 12.1 `copy.when` and the clock

```ts
// packages/content/src/data/copy.ts (pure; Intl in the caller's zone unless given)
export function when(at: number, now: number, o?: { withTime?: boolean; timeZone?: string }): string;
//   < 60 min ahead          → "in {n} min"
//   same local day          → "at {hh:mm}"
//   next local day          → "tomorrow {hh:mm}"
//   two days or more        → "{Weekday}"  (+ " {hh:mm}" with withTime)
//   past (≤ 0)              → "now"
export function count(minutes: number): string;   // "38 minutes", for lengths that are not moments
```

- `formatUntil` and `formatAt` (`packages/ui/src/format.ts`) and `renderTimeTokens` render through `when` with `withTime: true`. The `{until}` tokens read *until tomorrow 01:00* / *until Saturday 01:00* (§23 Q6).
- Every countdown string moves to it: `held.*`, Heat's lines, `again.*Needs`, the journey, the Election card, the Jobs card's *paid at*, the residence's *from {weekday}*, and the Members status (slice 6).
- **The clock:**
  - `HudClock` in `HudBar`, Courier 12 px: at the right of the Energy line on phones, in the HUD's first line from 1024 px;
  - `useNow(1000)` rendered to the minute, so the dev clock shows;
  - the label is dotted and opens `help.clock`, whose `{dayTurn}` is `CITY_DAY`'s 00:00 UTC and whose `{nightFrom}`/`{nightTo}` are `DAY_NIGHT` (20:00, 06:00 UTC), all in the local zone.

**Tests:**

- The `when` table under a fixed `timeZone` (`Europe/Berlin`, `America/New_York`).
- A vocabulary test over `copy.ts`: no `by {` and no `minutes to go`, and *close the game* only in the encounter's warning.

### 12.2 Heat and Health on the HUD

- Heat is a body line under Energy (13 px, *Heat 60 · Hot*, the state word in the failure colour from Hot), shown from 1.
- `help.heat` is written by state (`{stateLine}`) with *Cool at {when}* from `riskView.heat.coolsAt`.
- The Me tab has the same line.
- The mission result's knock-on reads *Heat +8 → 32 · Noticed · Cool at 20:40*. Add `coolsAt` to the result's heat block if it is absent.
- Health is in hand. The HUD label pairing is in hand: check what landed in `HudBar.tsx` before starting.

### 12.3 Home orders away (answers §13)

`OrdersView.away: { cityName: string; done: number; of: number } | null`, set in any city but the residence and on a train. It replaces `elsewhere`; the rival-ground case is the same line. The panel shows one collapsed line, 36 px, not tappable, no chevron. The paper's list keeps the full orders.

### 12.4 The rank ladder (answers §25)

- `CharacterView.ranks: Array<{ rank: 1..7; title: string; fxp: number; opens: RankOpensKey }>` (titles from the faction's content, floors from `RANKS`).
- `copy.ranks.opens[key]` holds the seven lines, and `help.fxp` is shortened.
- `RankLadderSheet` opens from the Party XP label (HUD and Me). It marks the player's row *you* and the next one *next · {n} more*.
- The Me party line reads *{title} · {fxp} / {next} to {nextTitle}*.

### 12.5 Reputation, the Issue chip, Legal Aid, the signed line

- **`PlaceTag { kind: 'known' }`** on checked tickets where `standingView(successes).level ≥ 1`. The Ticket prints *Known here · better odds*. `help.standing` gains the figure and *{n} steps up*, and the Standing card gains its line.
- **The Issue chip** on the Places list and the place sheet reads *Issue · {name}* (it carries `issueIds` already) and opens `help.issue`.
- **`copy.orderSigned`:** the three `left === 0` lines of answers §6.
- **Legal Aid:** §11.5.

### 12.6 The paper on a desk (answers §3)

`PaperSheet` (`packages/ui`) wraps `/paper`, `/council` (and its slate, ballot and count), and `/held`.

- Under 960 px it is a pass-through.
- From 960 px:
  - the ground is ink-2 `#1c1a17` with a radial vignette;
  - the sheet is 720 px wide, centred, with a 1 px ink line, a 3 px paper-2 edge and `0 24px 48px rgba(0,0,0,.45)`.
- The HUD and the tab bar stay full width.

**Test:** at 1280 px the sheet is 720 px wide; at 959 px it is unchanged (`landscape.spec.ts`).

### 12.7 The order test (answers §22)

In hand: the mission order is offered only when `startableMissions` is not empty. **Added here:** a content test (`review4.orders.test.ts` in `packages/content/test`): for every rotation template other than `kinds: ['mission']`, at least one matching ticket exists in its residence city at an open Level-1 place with no `requires`, of the member's faction or none. That makes "at least one matching ticket can be taken today" hold for every template by construction. The welcome set and the crisis pair are exempt.

---

## 13. API summary (tRPC)

| Procedure | Input (Zod) | Output | New errors |
|---|---|---|---|
| `arrival.get` | — | `ArrivalView` v2 (`phase: 'face' \| 'story' \| 'ready' \| 'arrived'`, no `street`) | — |
| `arrival.answer` | `{ questionId: z.string().min(1), answerId: z.string().min(1) }` (unchanged) | `ArrivalView` | — |
| `arrival.join` | **`z.object({}).strict()`** (was `{ factionId }`) | `{ character, landing: { cityId, locationId, actionId? } }` | — (`ORIGIN_INCOMPLETE`, `NO_FACE`, `BAD_NAME` as before) |
| `action.perform` | unchanged | unchanged | `NOT_OFFERED`, `ONCE_ONLY`; `ACTION_LOCKED { reason: 'QUARTER' \| 'EDITION' }` (new `reason` values) |
| `mission.start` | unchanged | unchanged | `MISSION_LOCKED { lock: 'QUARTER' }` (new `lock` value) |
| `city.get` | unchanged | `CityView` v6: `lockedPins`, home `quarters` slimmed, `ordinance.plainLine`, `locations[].hall/cellsHere/lodgings`, `placeTags` + `known`, `residence` v2 | — |
| `council.hall` | `{ cityId: z.string().min(1) }` | `TownHallView` | `NO_COUNCIL`, `NOT_FOUND` |
| `council.whatNowSeen` | `{ termId: z.string().regex(/^[0-9a-f]{24}$/) }` | `{ seenAt: number \| null }` | — |
| `council.chamber` | unchanged | `CouncilView` (now `councilViewFor(residence)`) | — |
| `held.inCells` | `{ locationId: z.string().min(1) }` | `{ rows: CellsRow[]; serverNow }` | `NOT_FOUND` |
| `held.get` | unchanged | `HeldView` + `ordersOff`, release knock-ons | — |
| `residence.room` | **`{ locationId: z.string().min(1), idempotencyKey: z.uuid() }`** | `PoliticalResult` (stamp *Taken*) | `NO_LODGINGS`, `NOT_HERE` |
| `residence.register` | unchanged | `PoliticalResult` (stamp *Moved in*) | — |
| `travel.journey` | unchanged | `JourneyView` v3 (`route`, `map`, `cardAt`; `card` from `cardAt`; no `heraldVisitor`) | — |
| `travel.choose` | unchanged | unchanged | `CARD_NOT_YET { at }` |
| `paper.today` | unchanged | `PaperView` v6 (`edition`, `dateline.city`, `issues[].local`, `localElection`, `frontPage.whatNow`, orders `away`/`off`) | — |
| `character.me` | unchanged | + `ranks`, orders `away`/`off` | — |

---

## 14. Migration `008-review4.ts`

**`migrateReview4(content)`** is called by `ensureIndexes` (`packages/db/src/indexes.ts`) after `migrateSlice5Risk`, as 001–007 are, at every start-up and before tests. It is exported from `packages/db/src/index.ts`.

- Each step is idempotent: a second run matches nothing and modifies nothing, and the test runs the migration twice.
- Each step returns its `matched / modified` counts, which the dev server logs.
- **The new index is declared on the schema** (§11.3). `syncIndexes`, in the same `ensureIndexes`, creates it, so no migration step is needed for it.
- Migration 002 reads `content.origin.reference`. The new three-item `reference` has the same element shape, so 002 still compiles and stays a no-op on today's data.

| Step | Filter | Update | Why |
|---|---|---|---|
| `resetOldDrafts` | `arrivals`: `{ completedAt: null, 'answers.0': { $exists: true }, 'answers.questionId': { $nin: NEW_QUESTION_IDS } }` | `$set: { answers: [] }` | A draft mid-way through the old six questions starts at the platform; the face and name are kept |
| `cardAtForOpenJourneys` | `journeys`: `{ status: 'onTheWay', card: { $ne: null }, 'card.at': { $exists: false } }` | pipeline `$set: { 'card.at': '$boardedAt' }` | Answerable at once, as before the change (the read path defaults the same way) |
| *(schema)* `held_cells_now` | — | declared on `characterSchema`; created by `syncIndexes` | §11.3 |
| *(nothing)* `characters` | — | — | `orders.off` absent = null; sentences already running, today's orders and past arrests are **not** changed retroactively (ADR 0078) |
| *(nothing)* `officeTerms` | — | — | `whatNowSeenAt` absent = unseen: sitting councillors see *What now* once at their hall |
| *(nothing)* `cities` | — | — | The halls and lodgings are content (ADR 0003); no city document holds a place |

The test is `packages/db/test/review4.db.test.ts`: fixtures for each filter (and a non-matching neighbour); the counts after run 1; run 2 modifies 0; the index exists with its partial filter; a transaction over `characters`, `journeys`, `arrivals` and `officeTerms` commits.

---

## 15. Scheduled jobs (Agenda)

**None new, none changed.** `cardAt` is read lazily (the client's timer only asks; the server decides at `choose`). Orders off ends with the settlement's new orders. *What now* is a conditional write. The cells list reads `until > now`, and the release stays lazy (ADR 0033). The `journey-arrive` tidy job is unchanged.

---

## 16. Idempotency and atomicity summary

- **`arrival.answer`:** set-once in order (unchanged).
- **`arrival.join`:** the natural key (the user), the `completedAt: null` guard and one transaction (unchanged). With no input, a retry can never ask for a different faction.
- **The favour** (`action.perform`): the existing keyed transaction (`runKeyedAction` with `assertKeyFree`, the slice-5 fix round's guard), plus the welcome-order check **inside** it on the transaction's character read. The version guard makes two keys race to one winner, and the loser re-reads a done order and gets `NOT_OFFERED`.
- **`travel.board`:** as slice 5. `card.at` is drawn from the key's seed, so a re-run draws the same moment.
- **`travel.choose`:** as slice 4–5, plus `CARD_NOT_YET`, thrown before any write. The request key is not stored on a refusal, so the same key works after `cardAt`.
- **Arrests** (mission, run-in choose and luck, rival tap, hook): `orders.off`, the marks and `held` are written in the arrest's existing transaction. `closeOrders` is idempotent.
- **`residence.room`:** `withRequestKey` (unchanged), plus the place checks inside it.
- **`council.whatNowSeen`:** a conditional `$set` to a target state (ADR 0008). No key.
- **Reads** (`council.hall`, `held.inCells`, `paper.today` editions, `travel.journey`): no writes beyond the existing read path's catch-ups.
- **Everything from slices 0–5:** unchanged.

---

## 17. The result modal: how each breakdown is produced

| Result | Kind | What is new | Source |
|---|---|---|---|
| The favour | `action` | Nothing new: the best-stat row, *First day* +10 %, Reputation, the council's Party XP share, the welcome-B order's signed line | `resolveTier1Action` + `advanceOrders` (§4.6) |
| *Sit in the public gallery* | `action` | Nothing new (no Party XP, no opinion) | the type's flags (§9.6) |
| A mission or rival tap ending in the cells | `mission` | Knock-ons: *Your record: taken in · 1 mark · On file*, *Orders off until the day turns*; Heat's line with *Cool at* | `MissionFinal.record.added`, `.ordersOff`, the heat block's `coolsAt` (§11.6, §12.2) |
| Release from the cells | `political` | Heat before and after, bail, the record line, orders off | `HeldView` release knock-ons (§11.4) |
| *Live here* | `political` | Stamp *Moved in* (copy) | `register` (§10.3) |
| Lodgings | `political` | Stamp *Taken*, headline *A bed in Irongate* | `residence.room` (§10.3) |
| A journey card | `journeyCard` | Unchanged | — |
| Arrival | `journey` | `heraldVisitor` removed | §5.3 |

The level-up line after placing a point is in hand (§1).

---

## 18. Testing

### 18.1 Per layer

The rules, content, db, server and UI tests are listed under each feature (§4.2–§12.7). New server test files are `review4.<feature>.test.ts`, kept apart from the in-hand `review4.test.ts`.

### 18.2 E2E (Playwright)

| Spec | Change |
|---|---|
| `helpers.ts` | The three beats (§4.5), landed with the prologue |
| `arrival.spec.ts`, `qa.slice2.spec.ts`, `chapter.spec.ts` | The prologue's screens; eight taps to the favour's result; the chapter-1 openers |
| `quarters.spec.ts` → `homeMap.spec.ts` | Rewritten (§8.5) |
| `capital.spec.ts` | The tiling overview; the drag to the outline's corner |
| `travel.spec.ts`, `rival.spec.ts` | The journey map, the card at `cardAt` (dev clock), the arrival at the hall's pin; rival ground's edition masthead |
| `council.spec.ts`, `qa.slice3.spec.ts` | The desk at the hall, the plate's line, *What now* |
| `missions.spec.ts`, `qa.slice5.spec.ts` | The cells' lines, orders off, the station's list from a second context |
| `qa.slice4.spec.ts` | *Live here*; lodgings at Tram Junction |
| `landscape.spec.ts` | The paper on a desk at 1280 and 959 px |
| **`review4.spec.ts`** (new, last project) | A walk through every note: §18.3's checklist, one step each where a browser can check it |

### 18.3 The playtest checklist (the round's question, note by note)

- [ ] 2 A new account reaches the favour's result in eight taps; whom you helped is your party and their secretary signs your orders.
- [ ] 3 At 1440 px the paper lies on a desk.
- [ ] 4 The clock shows your time; the dev clock moves it; every countdown reads one way.
- [ ] 6 The third order's line says what follows.
- [ ] 7 The train moves on the map; the card arrives on the way.
- [ ] 8 No part of Irongate is outside a district.
- [ ] 9 One *Live here* button with its why; a bed at Tram Junction.
- [ ] 10 A new councillor sees *What now* and finds the desk.
- [ ] 11 Every city has a Town Hall pin; the rule in force says what it does, on the plate and at the hall.
- [ ] 12 Heat is readable and its note says what it does.
- [ ] 13 Away, the home orders are one quiet line.
- [ ] 14, 17, 18 The Issue chip, Legal Aid and Reputation explain themselves.
- [ ] 16 Nothing invites you to close the game.
- [ ] 19 A station lists who is in its cells.
- [ ] 20 The cells cost a longer sentence, the day's orders and a mark.
- [ ] 21 Home cities are one map with greyed locked pins.
- [ ] 23 Away, your paper prints a local edition.
- [ ] 25 The Party XP label opens the ladder.
- [ ] 1, 5, 22, 24 (in hand) as their *Done when*.

---

## 19. Risks

| Risk | Mitigation |
|---|---|
| **The e2e helper** changes for every spec | Land it with the prologue's server and client in one task; run the full suite before the commit |
| **`city.tsx`** (1,416 lines) is edited by three lanes | Phase 1's card slot; lane M owns the file's map and plate code; lanes C and R add cards only |
| **`copy.ts`** is edited by every lane | One `copy.<feature>` block per lane; append only; conflicts are mechanical |
| **Pin numbers shift** with the halls inserted | Every spec addressing pins by number is updated in T12; specs prefer `getByRole('button', { name })` from here on |
| Editions' headline composition | One pure function with cases; the at-home path is today's merge, proven equal on the existing fixtures |
| The council read generalised | `chamber` kept as the residence alias; its slice 3–4 tests run unchanged first |
| Four arrest paths for orders off | One rules decision (`finishMission`, the rival finish); a server test per path |
| A 1 Hz map on low-end phones | One SVG `<g>` transform; the tile layer untouched; slice 9's performance budget covers `/journey` |
| Hand-entered geometry (Irongate's outlines, routes) | The loader's tiling proof and endpoint checks; the viewer's trace mode shows both over the art |
| The in-hand work overlaps lane A (HUD, `Help`, `copy.ts`, `views.ts`) | Phase 0 commits it before phase 1 starts |
| Revealing `cardAt` before the card | Accepted (ADR 0075); §23 Q7 |

---

## 20. Knock-ons on the slice 6–9 tech docs (not built; record before each is built)

**Slice 6 (`docs/tech/slice-6.md`)**

- *Post bail* also sits on `CellsNowCard`'s own-party rows. It is the same `FavourSheet` and `favour.bail`, reading `held.inCells` (the same index).
- The Members status line uses `copy.when` (*in the cells at Harbour Police · out in 24 min*).
- The Faction tab's orders show `off`.
- Events and the HQ card go into the place card slot (§3.1), not new sheet code.

**Slice 7 (`docs/tech/slice-7.md`)**

- **Clearwater is a one-map city** (ADR 0076):
  - no frames, outlines or labels on its quarters;
  - no `CityView.landingQuarterId` (§1290 there): the arrival selects the Casino, the hall;
  - the "teaser landing" fixture and the loader rule go;
  - The Front's four places are later pins until slice 8.
- `council.hall` is `{ locationId: 'clearwater.casino' }` (kind `bar`). The Casino's sheet gets `TownHallBlocks`. The Governor's line joins `TownHallView`.
- `ROOM.cityId`'s removal: `Location.lodgings` on the Rows, and the loader allows lodgings in every battleground city. `residence.room` already takes `locationId`.
- **The Courier is the lake resident's paper**, and a visitor reads their own paper's Clearwater edition (ADR 0074). The "a visitor's while in Clearwater (the Herald's rule)" line is superseded.
- `Ordinance.plainLine` is required on any new ordinance. `BATTLEGROUND_COUNCILS` feeds `TownHallView.seatCount`/`passVotes`.
- The *From the capital* lines join `composeHeadlines` after the residence's city lines (a parameter, not a new rule).

**Slice 8 (`docs/tech/slice-8.md`)**

- Worn Charisma's "the origin's base" is 0 for every character from review 4 (old characters keep theirs). Every new character wears the coat. `outfit.fathers-coat-promised` is no longer granted (the keepsakes list and the content check).
- **The Front opens** by its places leaving `laterPins` (they become locations); no quarter view.
- Shops are place cards in the slot.
- The residence card's second line is *Where you sleep* only; lodgings are the place card.

**Slice 9 (`docs/tech/slice-9.md`)**

- `PURPOSE_SCREENS`: `cityQuarter` and `cityOverview` apply to the capital only. A home city is `city`.
- The funnel counts three `origin.step`s and eight taps to the first result.
- The performance and axe checks add `/journey` (the map) and the hall's sheet.
- *While you were away* uses `copy.when`.

---

## 21. Deliberately left out

| Left out | Why / where |
|---|---|
| `scene.town-hall`, the train mark's final SVG, the lock glyph's new pin variant | Art (answers §28): the map crop, a drawn placeholder and the existing `LockMark` stand in |
| A night variant of the station scene | Optional (answers §28) |
| *Post bail* on the station's list; the Members status | Slice 6 |
| A republic-wide cells list | Answers §19: not built |
| The neutral `{city}` local lines for home-city editions | The designer (§23 Q2); the slot exists |
| A drawn desk still behind the paper | Answers §3: optional, later |
| A sixth district; Clearwater's content | Appendix C #41; slice 7 |
| Retroactive sentences, marks or orders off for arrests before the deploy | ADR 0078 |
| Any hosting step | Local only |

---

## 22. Task list (phases, lanes, *Done when*)

Each task leaves `pnpm lint typecheck test` green and is one commit. **One developer per phase.** After phase 1, phases 2–8 run in five lanes in parallel. Phase 9 is last.

```
Phase 0 (in hand) ─► Phase 1 (groundwork + copy, lane A)
                        ├─► Lane C: Phase 2 (the cells) ─► Phase 5 (Live here, lodgings)
                        ├─► Lane M: Phase 3 (maps) ─► Phase 4 (the Town Hall's sheet)
                        ├─► Lane T: Phase 6 (the journey)
                        ├─► Lane P: Phase 7 (editions)
                        └─► Lane O: Phase 8 (the prologue)
                                         all ─► Phase 9 (integration)
```

### Phase 0 — In hand (the developer already on it)

**T0. Land the in-hand fixes.** Notes 5, 12 (the label bug), 22, 24 and the faces. *Done when:*

- answers §28 items 1–4's *Done when* pass;
- `apps/server/test/review4.test.ts` passes;
- the work is committed before T1 starts (T1 edits `HudBar.tsx`, `Help.tsx`, `copy.ts`, `views.ts`).

### Phase 1 — Groundwork and copy (lane A)

**T1. `copy.when`, the countdown sweep, the clock.** §12.1. *Done when:*

- the `when` table passes under two time zones;
- every countdown string uses it;
- the copy test finds no *by {time}*, no *minutes to go*, and *close the game* only in the encounter's warning;
- the HUD clock follows the dev panel's clock (`devpanel.spec.ts` step).

**T2. Shared UI and plumbing.** The place sheet's `cards` slot (§3.1, with the Jobs card moved into it), `PaperSheet` (§12.6) on every paper-ground page, the new `GameErrorReason`s and their words (§3.3), and the empty skeleton of migration 008 with its runner entry. *Done when:*

- every existing UI and e2e spec passes;
- at 1280 px the paper is a 720 px framed sheet on the desk ground, and at 959 px nothing has changed.

**T3. Copy and small server views.** §12.3–§12.5:

- `OrdersView.away`;
- `PlaceTag known`;
- `CharacterView.ranks` and `RankLadderSheet`;
- the Me party line;
- the Issue chip and `help.issue`;
- `help.standing`'s figure and the Standing card;
- the three `orderSigned` lines;
- `help.residence`, `help.lodgings`, `help.edition`, `help.cells`, `help.legalAid` text (their screens come later).

*Done when:*

- fix list items 5, 8, 9, 10 and 16 pass their *Done when*;
- a Familiar player's checked tickets carry *Known here · better odds*;
- the panel in another city is 36 px, not tappable, and reads *Your orders are in {city} · n of 3 done*.

**T4. Heat on the HUD and its note.** §12.2. *Done when:* the HUD shows *Heat 60 · Hot* at 13 px in the failure colour, the note prints the state's line and *Cool at {time}*, and the mission result's Heat knock-on carries *Cool at*.

**T5. The order test's content check.** §12.7. *Done when:* the test passes on the real content, and a fixture template with no Level-1 ticket fails it.

### Phase 2 — The cells (lane C)

**T6. Rules.** §11.2: the sentence, `marksFor`, `recordArrest` on every arrest, `OrdersState.off`, `closeOrders`, the advance guards, `finishMission`'s and the rival finish's `ordersOff`. *Done when:* §11.2's tests pass, and the slice-5 rules tests pass with only the sentence and legal-arrest expectations updated (citing GDD §19.2, §11.2).

**T7. DB and server.** `orders.off`, the `held_cells_now` index on the schema, every arrest path's writes, `OrdersView.off`, `HeldView.ordersOff`, the release knock-ons (from `stays.marks`), `held.inCells`, `LocationView.cellsHere`, the dev hook. *Done when:* `review4.cells.test.ts` passes (§11.7), including the four arrest paths and the list's visibility rules.

**T8. Client and content.** The cells screen's lines, Legal Aid, the release modal's lines, the orders-off line, `CellsNowCard`, the `hl.cells` decks, and the economy figures. *Done when:*

- fix list items 7, 20 and 28 pass their *Done when*;
- `missions.spec.ts` shows the lines, and a second context reads the station's list.

### Phase 3 — The maps (lane M)

**T9. Irongate tiles the picture.** §7: the outlines, `tilingProblems`, the failing fixtures, `CityMap.panLimit`, the district view's bounding box. *Done when:*

- fix list item 25 passes;
- the tiling fixtures fail by name;
- `capital.spec.ts` reaches Station & Market's far corner.

**T10. `placeOpen` and the home quarters' content.** §3.2, §8.1–§8.2:

- `placeOpen`;
- the `Quarter` schema and loader rules;
- home quarters stripped;
- `teaser` removed;
- the survey edits (the three new hall pins, Ashford's moved);
- `laterPins`;
- the `town-hall` kind;
- the four hall locations, each with its gallery ticket and blurb, inserted per §9.1 (`council.hall` keeps its old shape until T13).

*Done when:* the content and rules tests of §8.2 and §9.7 (the halls' part) pass, and the slice 1–5 content tests pass with pin-number expectations updated.

**T11. Server.** §8.3:

- `CityView` v6 (`lockedPins`, home `quarters`);
- `placeOpenFor` in every place-level call (the in-hand `startableMissions` and `firstPin` included);
- the new `ACTION_LOCKED` / `MISSION_LOCKED` refusals for a locked place (§3.2's gap);
- the arrival landing at the hall.

*Done when:*

- §8.5's server tests pass;
- a locked place's ticket is refused whatever the client sends;
- every slice 1–5 server test passes.

**T12. Client.** §8.4: the home path removed and rebuilt as one map, the locked pins and sheet, the grouped Places list, the redirect, the dead UI deleted; specs addressing pins by number updated. *Done when:* fix list item 22 passes, `homeMap.spec.ts` passes at five sizes, and `capital.spec.ts`, `qa.slice4.spec.ts` and every `/city/<home>` spec pass.

### Phase 4 — The Town Hall's sheet (lane M, after phase 3)

**T13. Content, rules, DB.** `council.hall = { locationId }` in all four cities; eleven `plainLine`s; `deskNext`; `officeTerms.whatNowSeenAt`; the hall and plate copy. *Done when:* the content and `deskNext` tests pass and `hallView` reads from the location (the election screens' header unchanged).

**T14. Server.** `councilViewFor` (with `chamber` as its residence alias, landed first and on its own), `townHallView`, `council.hall`, `council.whatNowSeen`, `FrontPageView.whatNow`, `CityView.ordinance.plainLine`, `LocationView.hall`. *Done when:* `review4.hall.test.ts` passes (§9.7) and the slice 3–4 council tests pass unchanged.

**T15. Client.** `TownHallBlocks`, `WhatNowCard`, the hall's sheet, the front page's card, `/council` on the same blocks, the plate's line. *Done when:*

- fix list items 12, 23 and 24 pass;
- `council.spec.ts` votes and proposes from the hall's desk;
- the plate's line opens the hall;
- *What now* shows once on the front page and once at the hall.

### Phase 5 — *Live here* and lodgings (lane C, after phase 2)

**T16. Content and server.** `Location.lodgings` and its loader rule, `ResidenceCardView` v2, `LocationView.lodgings`, `residence.room`'s `locationId`, the stamps. *Done when:* §10.5's server tests pass, with the room's rule unchanged.

**T17. Client.** `ResidenceCard` from `state`, the sheet's title and button, `LodgingsCard`. *Done when:* fix list items 18 and 19 pass, and `qa.slice4.spec.ts` takes a bed at the Junction.

### Phase 6 — The journey (lane T)

**T18. The viewer's trace mode and the routes.** §6.1: trace, undo and copy in `MapViewer`; the four legs traced along the painted rails; `Nation.routes` and its loader checks (required from here). *Done when:* the loader passes on the four legs, a fixture with a wrong endpoint fails, and the viewer shows the legs over the rails.

**T19. Rules, DB, server.** `journeyLegs`, `trainAt`, `drawCardAt`; `card.at` at boarding; `JourneyView` v3; `CARD_NOT_YET`; `heraldVisitor` removed (coordinated with T23); migration 008's `cardAtForOpenJourneys`. *Done when:* §6.2's and §6.6's rules and server tests pass, and every slice 4–5 travel test passes.

**T20. Client.** `JourneyMap`, `TrainMark`, the plate, the card sheet at `cardAt` and on return, *Follow the train*, the desktop side sheet. *Done when:* fix list item 26 passes and `travel.spec.ts` (with the dev clock) passes on the phone and desktop projects.

### Phase 7 — Local editions (lane P)

**T21. Rules.** `ambientFor` and `composeHeadlines`. *Done when:* §5.2's tests pass, and the at-home path equals `mergeHeadlines` on every existing paper fixture.

**T22. Server.** `paperCityOf`, the edition at read, local Issues, `localElection`, the Herald's lines as the Irongate edition's local line, the visitor block removed. *Done when:* `review4.editions.test.ts` passes (§5.5) and the slice 3–5 paper tests pass (their visitor-Herald expectations rewritten as the edition rule, citing GDD §3.3).

**T23. Client.** The masthead's edition line, the dateline, the Issues order, the local election line, the arrival modal's Herald line removed. *Done when:* fix list item 27 passes and `rival.spec.ts` reads *The Coalport Clarion · Duskwall edition*.

### Phase 8 — The prologue (lane O)

**T24. Rules and content schemas.** §4.1–§4.2: the DSL, `originFaction`, `resolveOrigin`, the schemas, `Npc.pronoun`, the story placeholders, `CheckedAction.use`, and the loader checks with failing fixtures. *Done when:* the origin tests (the reference recruit STR 8 / INT 12 / AGI 5 / CHA 5) and the fixtures pass. This task lands **with T25** (the content must match the schema).

**T25. Content.** `origin.ts`, the favours, the welcome-B templates, `welcomeOrders.B`, the welcome decks, the chapter-1 openers, `scene.train-compartment` (`pnpm art:build`, `art:check`). *Done when:* every text ≤ 240, the Vanguard strings pass the content-policy regex, and word-for-word comparisons against answers §2.3–§2.8 pass.

**T26. Server and DB.** §4.4: `arrivalService` v2, the favour's gate, `ONCE_ONLY`, `welcomeLanding` v2, the edition's `{place}`, migration 008's `resetOldDrafts`. *Done when:* `review4.prologue.test.ts` passes (§4.4) and the slice-2 server tests are rewritten for three beats.

**T27. Client and the e2e helper.** §4.5: `StoryScreen`'s rows and confirm, the `ready` join, the landing's highlight, `helpers.ts`. *Done when:* fix list item 21 passes, eight taps reach the favour's result in `arrival.spec.ts`, and **the whole e2e suite passes** with the new helper.

### Phase 9 — Integration (one developer, last)

**T28. E2E and vocabulary.** `review4.spec.ts` (§18.3, one step per note a browser can check), every spec green together, and both vocabulary guards over the new strings. *Done when:* the whole suite passes three times in a row locally.

**T29. Migration and report.** `migrateReview4` run twice through `ensureIndexes` against a dev database played through slices 0–5 (a draft mid-origin, a journey on the way with a card), logging its counts; `pnpm report:playtest`'s risk section reads orders off and the marks on legal arrests. *Done when:* the second run modifies 0 and the report prints.

**T30. Docs.**

- The README's dev-panel and walk-through steps: the prologue, a journey with a card, a night in the cells, the hall's desk.
- A **Deviations** section at the end of this file.
- ADRs 0073–0078 accepted, and ADR 0035 marked *superseded in part by 0076*.
- The §20 knock-ons copied into slices 6–9's tech docs as dated notes.
- `docs/IMPLEMENTATION_PLAN.md` §5's row for review 4 (the new fields).

*Done when:* the README's steps reproduce each walk-through from a fresh `pnpm dev:mem`.

---

## 23. Questions

### 23.1 For the game designer (each has a default so the build doesn't wait)

**All twelve settled by the game designer, 6 Oct 2026** (`docs/design/review-4-answers.md` §29). Per question: **1 settled, default** (`plainLine`; the plate and the hall both print it; the hall adds nothing; GDD §15.3 corrected) · **2 settled, written** (six neutral `hl.local.*` templates with `cityId: '*'`, answers §29.1; the Irongate edition keeps the Herald's lines) · **3 settled, written** (eight headlines, answers §29.2) · **4 settled, default** (the arresting act advances no order) · **5 settled, default** (the line goes) · **6 settled, default** (boundaries print the time; day-granular lines the weekday; GDD §2.2) · **7 settled, default** · **8 settled, default** (by minutes) · **9 settled** (*Activist · 1,212 / 2,000 to Organiser*; the rows read the floors) · **10 settled, changed: append each hall last**, listed at the end of the first open group of the Places list whatever quarter it is painted in (no renumbering; GDD §15.3) · **11 settled, default** · **12 settled, default** (personal → local line → the residence's city lines → local ambient, cap three). The §24 notes are taken (answers §29.3; the compartment's alt text is there).

1. **`effectLine` already exists.** Every ordinance has `effectLine`, the caps line with numbers on the order paper and the menu (*Job pay +10 %*). Answers §11.3 names the new plain words `effectLine` too.
   - **Default:** a new field, **`plainLine`**, on the plate and the hall's *rule in force*. `effectLine` stays where it is.
   - Also: the hall's example (*studying costs a fifth less Energy everywhere in Coalport*) is longer than the plate's (*studying costs a fifth less*). **Default:** both print `plainLine`; the hall adds nothing.
2. **The neutral local line in a home-city edition.** Answers §23.2 and the slice-4 addendum say *every city group template has a Herald form already*. But the Herald's city lines name the capital (*Irongate Council: Candidates Wanted*, *… in Force in the Capital*), and the home papers' lines are in each party's voice (*Duskwall Stands Firm*).
   - **Default:** the Irongate edition uses the Herald's lines (as visitors did). **A home-city edition prints no local line** until you write neutral forms (`cityId: '*'`, `{city}`): the count, voting open, candidates wanted, the rule in force. The ambient line fills the slot.
3. **Outcome headlines.** `OutcomeText` needs a headline (≤ 80) and a body. Answers §2.6 (the three favours) and §11.1 (the gallery) give bodies only.
   - **Default:** `TODO(game-designer)` stand-ins: the ticket's title as the Success headline, and *Not quite* as the Partial's.
4. **The arresting act and the orders.** *From the arrest*, the orders are off.
   - **Default:** the mission or tap that got you arrested does **not** advance an order (a Partial on a watch is not counted).
   - The alternative is to count it, then close.
5. **The arrival modal's *the Herald is yours while you're here* line** has no meaning under editions. **Default:** removed. The masthead says it on the next read.
6. **`{until}` in political lines.** Slice 3 printed *Tuesday midnight*. Under §4.2's style a boundary two days off is *{Weekday}* "with the time where it matters".
   - **Default:** boundaries always print the time: *until tomorrow 01:00*, *until Saturday 01:00*.
   - Day-granular lines (*from Thursday*, *move again from Monday*) print the weekday alone.
7. **The card's surprise.** The client receives `cardAt` (not the card) when the journey starts, so that it can open the sheet on time without polling. **Default: accepted.**
8. **Two-leg journeys.** **Default:** the train takes each leg's share of the time by its minutes (Ashford → Irongate 12, Irongate → Duskwall 15), not by drawn length.
9. **The rank ladder example.** *Activist · 212 / 2,000 to Organiser* cannot happen: Activist starts at 400. **Default:** the real figures.
10. **Pin numbers.** Inserting each hall where you placed it (*pin 7 of the Mill's places*) renumbers the places after it (Coalport's Harbour 7–11 → 8–12). **Default: as placed.** The alternative is appending each hall last (no renumbering, but the hall's number is high).
11. **Orders away on a train.** **Default:** the same collapsed line (*Your orders are in Coalport · n of 3 done*), wherever the panel shows.
12. **The residence's city lines away from home.** Answers §23.2's table has them following the player, but its last sentence orders *personal, then local, then ambient*. **Default:** personal (≤ 2) → the local line → the residence's city lines → the local ambient, capped at three.

### 23.2 For the user

None blocking. Two points for awareness:

1. A player part-way through the old origin starts again at the platform (local databases only).
2. Councillors already sitting see *What now* once, at their hall.

---

## 24. Notes on the design documents (for the designer)

1. **`effectLine`** (answers §11.3, fix list 12, GDD §15.3) names an existing field with a different meaning: §23 Q1. The GDD's "every ordinance carries `effectLine` ≤ 60" should read `plainLine`, if you agree.
2. **"Every city group template has a Herald form already"** (answers §23.2, `slice-4-battleground.md` §20) does not hold for home cities: §23 Q2.
3. **The favour's and the gallery's texts** lack headlines: §23 Q3.
4. **The schema limits** that the new texts exceed: answer texts over 80 characters, the beat-3 hint over 60, and the stat value of 6. They are raised in §4.1; nothing to change in the design.
5. **`{Holm}` / `{She}` / `{City}`** are written as placeholders in answers §2.4. They are transcribed as `{helper}` / `{helperPronoun}` / `{city}`. The people need a pronoun field (§4.1).
6. **The rank ladder example** (answers §25): §23 Q9.
7. **"Opens with a later edition" pins** come from the survey. When a survey pin moves (Ashford's Town Hall), `pins.json` in the art folder should move with `mapPins.ts`.
8. **The order test** (answers §22) is stated for every template. It is built for the mission order (in hand) and guaranteed for the rest by a content test (§12.7). A future template gated by Level, Rank or Reputation must be offered through the same `offerable` predicate.
