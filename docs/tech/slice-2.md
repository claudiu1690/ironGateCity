# Slice 2 — Arrival: technical design

| | |
|---|---|
| **Goal** | A brand-new player signs up with a face, plays the three-step origin, picks a faction, reads the welcome edition of their home city's paper, lands on the first pin's open sheet and taps a real action within about three minutes; the welcome set of orders, the job, the HQ and Ambition chapter 1 then introduce themselves in the first ten minutes. Every screen so far works on a phone. |
| **Question** | **Does a brand-new player understand what to do in the first 10 minutes, without a tutorial screen?** |
| **Builds on** | Slices 0–1 as built on branch `slice-0` (`docs/tech/slice-0.md`, `docs/tech/slice-1.md`, both with their **Deviations**) and QA fix round 1 (`docs/qa/slices-0-1.md` §8) |
| **Design inputs** | `docs/design/slice-2-onboarding.md` (origin, street, Ambitions ch. 1, kit, avatars, welcome editions, timeline, art), `docs/design/slice-2-cities.md` (Duskwall, Ashford), `docs/economy.md` §13, GDD edits of 29 Sep 2026 (§3.3, §5.4, §7.2–7.5, §8.2, §8.5, §9.2, §13.5, §13.7, §14.11, §16.1, §17.1, §21.2, §21.4) |
| **Mockups** | `Story.dc.html` (tier-3 screens), `City`, `MobileCity`, `Mission`, `MobileMission`, `MobilePaper` in `docs/mockups/` |
| **ADRs** | [0011 arrival draft, character at join](../adr/0011-arrival-draft-and-character-at-join.md) · [0012 welcome set](../adr/0012-welcome-set-first-city-day-orders.md) · [0013 tier-3 stories](../adr/0013-tier-3-stories-shared-view-no-interpreter.md) · [0014 items](../adr/0014-items-catalogue-in-content-inventory-embedded.md) · [0015 art pipeline for slice 2](../adr/0015-art-pipeline-slice-2-kinds-and-budgets.md) · [0016 slice-0/1 characters migrate in place](../adr/0016-slice-0-1-characters-migrate-in-place.md) |

Every number below is a GDD or content number. Points the design leaves open have a default here and are in §20.

---

## 1. Scope

**In**

- **Sign-up with a face**: six portraits, required (§7.3). Stored on the arrival, then on the character; changeable
  on the Me tab.
- **The origin** (§7.2): three story steps, two questions each, set-once answers saved on tap, resumable at every
  question, no numbers shown. **The street** (§7.3): three faction cards, the *His wish* tag, one permanent choice.
- **Joining** creates the character from the answers in one transaction: stats, CHA base, Iron, the FXP seed, the
  Ambition, the kit, the home city, and the **first City Day** with the **welcome set** and the **welcome edition**.
- **Three home cities** in content: Coalport, **Duskwall** and **Ashford**, each with its map (day and night), six
  locations, 21–22 actions (64 in all), three jobs, its secretary (Holm, Stahl, Grey), twelve order templates, its
  paper and headlines. A player sees only their home city.
- **Welcome edition** (§3.3 v2): *Welcome to {city}*, the arrival notice, the morale line; the welcome set; the
  **Letters** row; the desk with **Wearing**. "To the city" opens the first pin's sheet.
- **Items** (§21.4): catalogue in content; inventory and equipment on the character; **worn CHA** in every check.
  Party card and keepsakes on the Me tab.
- **Ambition chapter 1** for all three Ambitions (§17.1): choose (no roll) → check (10 Energy, difficulty 8, two
  approaches) → result modal with the keepsake and the chapter-2 hook. Never fails as a chapter.
- **Order pins**: each order on the plate links to a pin.
- **Mobile layout for everything built so far**, with a checklist and Playwright projects at 360 px and 1440 px.
- **Art** for all of the above (ADR 0015) and a first-session art budget.
- **Migration** of slice-0/1 characters (ADR 0016) and of Coalport's job ids.
- The playtest report gains an **arrival funnel** that answers the slice question with numbers.

**Out** (§17): travel and other cities' maps (slice 4), politics (slice 3), the Wardrobe and changing clothes
(slice 8), chapter 2+ play, patron letters, the Faction Reset token, encounters, deployment provisioning.

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| Where the origin lives before the character exists | An **`arrivals`** draft per user; the character is **created at faction confirm** | ADR 0011, §5.1 |
| Idempotency of origin answers | **Set-once, in order, by question index** (`answers: { $size: i }` filter); a retry returns the view | ADR 0011, §7.2 |
| Idempotency of the join | Natural key = the user (unique `characters.userId`, `arrivals.completedAt: null` guard); a different faction afterwards → `ALREADY_ARRIVED` | ADR 0011 |
| Auto-create of characters | **Removed**; no character → `ARRIVAL_PENDING` → `/arrive` | ADR 0011 |
| Welcome set vs ADR 0009 | `Faction.welcomeOrders`; `startOrders(…, welcome)` when the settlement prints the first edition; that settlement runs **inside the join** | ADR 0012 |
| Story engine | **No interpreter.** One `StoryScreenView` + one `StoryScreen` component; `arrivalService` and `ambitionService` | ADR 0013 |
| Ambition state | Embedded `ambition { id, chapter, step, choiceId, flags, history[] }`; choose is set-once; the check is an action with a key and an `actionLogs` row (`kind: 'chapter'`) | ADR 0013, §5.2 |
| Items | Content catalogue; `inventory[{uid,…}]` + `equipment { clothing, document }` → uids; **worn CHA computed on read** | ADR 0014 |
| Avatar | Chosen at sign-up, stored on the arrival (`arrival.start`), copied at join; `character.setAvatar` later | §7 |
| Story placeholders | `{name}` `{secretary}` `{hq}` `{city}` resolved on the server; a separate allowed list for story text | §4.4 |
| Coalport job ids | **Prefixed now** (`coalport-factory-worker`, …), renamed on stored characters by migration 002 | ADR 0016 |
| `Faction.secretary` | **Required**; `OrdersView.issuer` no longer nullable | §4.1 |
| Other cities | `city.get` refuses a city the character is not in (`WRONG_CITY`) | §7.1 |
| Existing characters | **Migrated in place** as the reference recruit (no origin replay) | ADR 0016 |
| Art | New kinds `avatar`, `item`, `vector`; `focus`; set ≤ 12 MB; first session ≤ 1 MB on a phone | ADR 0015, §13 |
| Scheduled jobs | **None** | §8 |

---

## 3. The flow, and what each step touches

| # | Screen (route) | Procedure | Writes |
|---|---|---|---|
| 0 | Sign-up with face (`/signup`) | Better Auth `signUp.email` → `arrival.start({ avatarId })` | `user`; `arrivals` (upsert) |
| 1–6 | Origin steps 1–3 (`/arrive`) | `arrival.get`, `arrival.answer` ×6 | `arrivals.answers` (one `$push` each) |
| 7 | The street (`/arrive`) | `arrival.join({ factionId })` | `characters` insert, `paperEntries` insert, `arrivals.completedAt` — one transaction |
| 8 | Welcome edition (`/paper`) | `paper.today`, `paper.markRead` | `paperEntries.readAt` |
| 9 | First landing (`/city/$home?loc=<pin 1>`) | `city.get` | — |
| 10 | First canvass → modal | `action.perform` | as slice 1 |
| later | Letters → chapter (`/story/ambition`) | `ambition.get`, `ambition.choose`, `ambition.attempt` | `characters.ambition`; the attempt as an action |

A closed tab at any point resumes: `/` asks `character.me`; `ARRIVAL_PENDING` → `/arrive`, which renders
`arrival.get`'s phase (face, the next unanswered question with its echo, or the street).

---

## 4. Content (`packages/content`)

### 4.1 Changed schemas

```ts
Faction = { ...slice 1,
  secretary: z.strictObject({ npcId: NpcId, signature: z.string(), addressedAs: z.string() /* "Secretary Holm" */ }),  // now required
  hqRef: z.string(),                                   // "the Union Hall" / "Beacon House" / "the Rooms" → {hq}
  crestArt: AssetId,                                   // vector asset 'crest.vanguard'; `crest` (the shape) stays for small marks
  kit: z.strictObject({ outfit: ItemId, card: ItemId }),                          // §21.4
  welcomeOrders: z.tuple([Id, Id, Id]),                                            // §13.7, slots A, B, C (ADR 0012)
  card: z.strictObject({ blurb: z.string().max(240), signatureEvent: z.string().max(40) }),   // §7.3 street card
}
City = { ...slice 1 }                                  // unchanged shape; Duskwall and Ashford added
Asset = { ...slice 1, kind: z.enum(['map','scene','portrait','avatar','item','vector']),
          focus: z.strictObject({ x: Fraction, y: Fraction }).optional() }        // ADR 0015
```

The UI's `FactionCrest` keeps drawing `crest` (the shape) for small marks (HUD, plate); the street card and the party
card use `crestArt`. `startingBonus.cha` is refused by
the loader (CHA is worn). **`startingCharacter` is removed** (ADR 0011); `origin.reference` replaces it for tests
and the migration.

### 4.2 New sections

```ts
ItemSlot = z.enum(['clothing', 'document'])            // §21.1; weapon / utility / accessory come with the Wardrobe
Item = z.strictObject({ id: ItemId /* 'outfit.mill-coat' */, name: z.string(), slot: ItemSlot.nullable(),
         tier: z.int().min(1).max(5).nullable(), cha: z.int().min(0).max(50).default(0),
         keepsake: z.boolean(), art: z.union([AssetId, z.literal('faction-crest')]), note: z.string().max(120).optional() })

// The origin (§7.2). Effects are a closed DSL owned by rules (types in packages/rules, `satisfies`).
OriginEffect = z.discriminatedUnion('kind', [
  { kind: 'stat', stat: z.enum(['str','int','agi']), value: z.int().min(1).max(5) },
  { kind: 'chaBase', value: z.int().min(1).max(4) },
  { kind: 'iron', value: z.int().min(1) },
  { kind: 'wear', itemId: ItemId },                    // worn in place of the faction outfit; the outfit is kept
  { kind: 'ambition', ambitionId: AmbitionId },
  { kind: 'wish', factionId: FactionId, fxp: z.int().min(1) } ])
OriginAnswer   = { id: z.string() /* 'a'|'b'|'c' */, text: z.string().max(80), hint: z.string().max(60).optional(),
                   echo: z.string().max(80).optional(), effects: z.array(OriginEffect) }
OriginQuestion = { id: Id /* 'origin.summer' */, prompt: z.string().max(120), answers: z.array(OriginAnswer).length(3) }
OriginStep     = { id: Id, kicker: z.string().max(80), title: z.string().max(40), narrative: StoryText,
                   art: AssetId /* scene */, portrait: AssetId, questions: z.tuple([OriginQuestion, OriginQuestion]) }
Origin = { steps: z.tuple([OriginStep, OriginStep, OriginStep]),
           street: { kicker, title, narrative: StoryText, art: AssetId, note: z.string().max(80) /* "Permanent. A Faction Reset token…" */ },
           reference: z.array({ questionId, answerId }).length(6) }         // the reference recruit's answers (§8.5)

// Ambitions (§17.1). A chapter with `story` is playable; without it, it is the next chapter's teaser (title + requirement).
ChapterApproach = { id: z.string(), text: z.string().max(100), stats: CheckStatsSchema }
ChapterRewards  = { xp: z.int().min(0), fxp: z.int().min(0), iron: z.int().min(0) }
Chapter = { n: z.int().min(1).max(12), title: z.string().max(60),
            requires: z.strictObject({ rank: z.int().optional(), level: z.int().optional() }).optional(),
            story: z.strictObject({
              letterFrom: z.string().max(60),                                         // "From your father's things"
              choose: { title, narrative: StoryText, choices: z.array({ id, text, hint, flag: Id }).length(2) },
              check:  { title, narrative: StoryText, approaches: z.array(ChapterApproach).length(2),
                        cta: z.string().max(40), difficulty: z.int().min(1), energy: z.int().min(1).max(30) },
              result: { success: OutcomeText, partial: OutcomeText, failure: OutcomeText },
              rewards: { success: ChapterRewards, partial: ChapterRewards, failure: ChapterRewards },
              keepsake: ItemId,
              art: z.literal('home-hq') }).optional() }                               // map crop around the home HQ
Ambition = { id: AmbitionId /* 'finish-his-work' */, title: z.string(), chaptersPlanned: z.int() /* 12 */,
             chapters: z.array(Chapter).min(1) }                                      // n = 1, 2, … in order

StoryText = z.string().max(240)  // + the loader's 4-sentence rule, as for outcome texts (GDD §1.2)

Content = { ...slice 1 without startingCharacter, items: Item[], origin: Origin, ambitions: Ambition[],
            avatars: z.array(AssetId).length(6) }
```

### 4.3 Loader cross-checks (added)

- **Items:** ids unique; `slot: null` ⇒ `keepsake: true`; `art` is an `item` or `vector` asset or `'faction-crest'`;
  every item referenced by a kit, an origin `wear` effect or a chapter `keepsake` exists; `kit.outfit` is clothing,
  `kit.card` is a document; `wear` items are clothing.
- **Origin:** six questions, answer ids unique per question; step 3's promise question has exactly one `ambition`
  effect per answer and they name the three Ambitions; the wish question has one `wish` per answer covering the three
  factions; `reference` names existing questions and answers in order; `art` is a scene, `portrait` a portrait.
- **Factions:** `secretary` present and an NPC of the faction; `welcomeOrders` are templates of that faction in slots
  A, B and C, and C has a `noJob` variant; `crestArt` is a vector asset; the **home city is loaded** and points back (the
  slice-0 relaxation is removed now that all three exist); the home city has **exactly one** `faction-hq` location and
  a `paper`.
- **Ambitions:** chapters numbered 1…k with no gap; chapter 1 is playable and has no `requires`; each playable
  chapter's choice ids and approach ids are unique and its `keepsake` is a keepsake item.
- **Avatars:** six distinct `avatar` assets.
- **Text:** story texts (steps, street, chapter narratives and results) obey the 240-character, 4-sentence rule and
  may use only the story placeholders (§4.4); headline and order texts keep the slice-1 list.
- Every existing slice-1 check now runs over three cities (hotspot spacing, shift ↔ job, orders, headlines).

### 4.4 Placeholders

| Where | Allowed | Resolved from |
|---|---|---|
| Headlines, order lines (slice 1) | `{name}` `{level}` `{rank}` `{energyYesterday}` `{standing}` `{bonus}` `{days}` `{iron}` `{share}` `{streak}` `{ordersTitle}` `{ordersLine}` | unchanged |
| Story texts (new) | `{name}` `{secretary}` `{hq}` `{city}` | character name · `faction.secretary.addressedAs` · `faction.hqRef` · home city name |

`STORY_PLACEHOLDERS` sits beside `PLACEHOLDERS` in `packages/rules/src/types.ts`; `fillTemplate` resolves both; the
server resolves every story text before it leaves (never the client).

### 4.5 Data to transcribe

| File | Contents | Source |
|---|---|---|
| `data/origin.ts` | three steps, six questions with effects, hints and echoes, the street, `reference` | onboarding §2, §5; reference answers §2.4 |
| `data/ambitions.ts` | three Ambitions; chapter 1 of each; chapter 2 teasers (*Stand where he stood* at Rank 2; *The night foreman* at Level 6; *The riverside house* at Level 6) | onboarding §3, GDD §17.1 |
| `data/items.ts` | the nine items of §21.4 | onboarding §4.2 |
| `data/factions.ts` | secretaries (Holm, Stahl, Grey), `addressedAs`, `hqRef`, kits, welcome sets, cards, crest assets, Alliance Rank 3 **Agent** | onboarding §5, §7.3; cities §1.4, §2.4; GDD §5.4 |
| `data/cities/duskwall.ts`, `ashford.ts` | locations with x/y and blurbs, 21 + 22 actions with text | cities §1.1–1.2, §1.7, §2.1–2.2, §2.7 |
| `data/jobs.ts` | 9 jobs; Coalport's prefixed (`coalport-street-vendor`, `coalport-factory-worker`, `coalport-driver`) | cities §1.3, §2.3, §3 Q1 |
| `data/orders.ts` | + 24 templates (`dir.v.*`, `dir.a.*`) | cities §1.5, §2.5 |
| `data/headlines.ts` | `hl.first-day` → `hl.welcome`; `hl.arrival`; the Sentinel's and the Gazette's sets | onboarding §7.2; cities §1.6, §2.6 |
| `data/people.ts` | + Stahl, Grey | cities §1.4, §2.4 |
| `data/cities/*.ts` paper | the Sentinel and the Gazette mastheads | onboarding §7.1 |
| `data/art.ts` | §13 catalogue; scene bindings `faction-hq`+`vanguard` → `scene.vanguard-office`, `press` → `scene.newsroom` | onboarding §9 |
| `data/copy.ts` | new UI strings (§12.6) | — |

Content tests (as QA did for slice 1): parse both design docs and compare locations, actions and their reward
columns, every text word for word, jobs, orders and headlines; the reference recruits through `resolveOrigin`
(Collective 10/12/5/CHA 2, 150 Iron, 50 FXP; Vanguard 11/11/5/2; Alliance 8/14/5/2); the first-pin canvass odds
(Coalport 66 %, Duskwall 62 %, Ashford 74 %).

---

## 5. Data model (`packages/db`)

### 5.1 `arrivals` — new collection (ADR 0011)

```ts
{
  _id, userId: string /* Better Auth user id */, name: string, avatarId: string | null,
  answers: Array<{ questionId: string; answerId: string; at: Date }>,   // in order, ≤ 6, set-once
  completedAt: Date | null, characterId: ObjectId | null, factionId: FactionId | null,
  createdAt, updatedAt
}
```
Index: `{ userId: 1 }` **unique**. Own collection because it has a different lifecycle from a character and must not
make any `characters` field nullable. No TTL: a player may return weeks later to the same question (pillar 7).

### 5.2 `characters` — new embedded fields

```ts
{
  ...slice 1,
  avatarId: string | null,                                   // null only for migrated characters (ADR 0016)
  stats: { str, int, agi, chaBase },                         // chaBase is now the origin base 0–4 (was the slice-0 stand-in 2)
  origin: { answers: Array<{ questionId; answerId }>, arrivedAt: Date, migrated?: true },     // frozen; later chapters read it
  ambition: {
    id: string,                                              // 'finish-his-work'
    chapter: number,                                         // the chapter in progress or next (1-based)
    step: 'choose' | 'check',                                // where that chapter waits
    choiceId: string | null,                                 // step 1's answer for the current chapter
    flags: string[],                                         // accumulated across chapters (§17.1: read by later chapters)
    history: Array<{ chapter; day: DayKey; choiceId; approachId; outcome: 'success'|'partial'|'failure'; logId: ObjectId }>,  // ≤ 12
  },
  inventory: Array<{ uid: string; itemId: string; day: DayKey; source: 'kit' | 'origin' | 'chapter' | 'migration' }>,
  equipment: { clothing: string | null; document: string | null },      // inventory uids (ADR 0014)
}
```

- `ambition.history.at(-1).day` gives the seven-day spacing; no separate `completedDay` (the designer's suggestion)
  is needed.
- All four are written whole with `$set` inside the version-guarded update, like `orders` and `localStanding`.
- No new index: reads stay by `_id` / `userId`.

### 5.3 `actionLogs`

`kind` gains `'chapter'`; `outcome` gains `'failure'`. For a chapter: `actionId` = `'<ambitionId>.<n>'`
(`finish-his-work.1`), `locationId` = the home city's `faction-hq` location, `cityId` = the home city, `times: 1`,
`result` = the chapter's `ActionResult` (§9). The unique key index is unchanged.

### 5.4 Migration `002-slice2-arrival.ts` (ADR 0016)

Run by `ensureIndexes()` after 001. Idempotent:

1. `Character.updateMany({ 'job.id': old }, { $set: { 'job.id': new } })` for the three Coalport ids.
2. For each character with `ambition: { $exists: false }` (cursor + `bulkWrite`, each op filtered on the same
   condition): `avatarId: null`, `origin { answers: content.origin.reference, arrivedAt: createdAt, migrated: true }`,
   `stats.chaBase: 0`, `inventory` = mill work coat + party card (new uids, `source: 'migration'`), `equipment` wears
   both, `ambition` = Finish His Work chapter 1 `choose`. Stats, Iron and FXP untouched.

`packages/db` gets `content` passed in (as `seed` does) so the migration reads the reference answers and item ids.

### 5.5 Other collections

`paperEntries`: unchanged schema (Letters and Wearing are live rows at read, §10). `requestLogs`: unchanged (no new
keyed request kind; §7 explains). `cities`: the seed upserts Duskwall's and Ashford's state documents from their
baselines (V 70 / C 6 / A 9 / N 15; V 6 / C 9 / A 70 / N 15).

---

## 6. Rules (`packages/rules`) — pure, no I/O

### 6.1 Constants

```ts
export const STARTING = { baseStat: 5, iron: 0 } as const;             // §8.5: 5 in each trained stat; §21.4: 0 Iron
export const AMBITION = { daysBetweenChapters: 7, chaptersPlanned: 12 } as const;   // §17.1
export const CHAPTER  = { tier: 3 } as const;                          // outcome bands with Failure (§8.4)
```

### 6.2 New and changed functions

```ts
// items.ts (ADR 0014)
export type ItemSlot = 'clothing' | 'document';
export interface ItemSpec { id: string; slot: ItemSlot | null; cha: number; keepsake: boolean }
export interface InventoryEntry { uid: string; itemId: string; day: DayKey; source: 'kit'|'origin'|'chapter'|'migration' }
export interface Equipment { clothing: string | null; document: string | null }
export function equippedItems(inv: readonly InventoryEntry[], eq: Equipment, spec: (id: string) => ItemSpec): ItemSpec[];
export function wornCha(chaBase: number, equipped: readonly ItemSpec[]): number;      // chaBase + Σ cha
export function grantItem(inv: readonly InventoryEntry[], item: ItemSpec, entry: Omit<InventoryEntry,'itemId'>):
  { inventory: InventoryEntry[]; granted: boolean };                                  // a keepsake is never granted twice

// origin.ts
export type OriginEffect = …;                                                         // §4.2, validated by content
export interface OriginSpec { questions: Array<{ id: string; answers: Array<{ id: string; effects: OriginEffect[] }> }> }
export interface OriginOutcome {
  stats: { str: number; int: number; agi: number; chaBase: number };
  iron: number; fxp: number; ambitionId: string;
  items: Array<{ itemId: string; equip: ItemSlot | null; source: 'kit' | 'origin' }>;
}
export function resolveOrigin(i: { origin: OriginSpec; answers: Array<{ questionId; answerId }>;
  faction: { id: FactionId; startingBonus: Partial<Record<'str'|'int'|'agi', number>>; kit: { outfit: string; card: string } };
}): { ok: true; outcome: OriginOutcome } | { ok: false; reason: 'ORIGIN_INCOMPLETE' | 'UNKNOWN_ANSWER'; answered: number };
//   stats = 5 each + Σ stat effects + faction bonus; chaBase = Σ chaBase effects; iron = 0 + Σ iron; fxp = the wish's
//   fxp iff its factionId is the chosen faction; items: kit outfit, kit card, a `wear` item; clothing = wear ?? outfit
export function buildNewCharacter(i: { userId; name; avatarId; factionId; homeCityId; outcome: OriginOutcome;
  answers; now: number; uid: () => string }): NewCharacterState;
//   everything a fresh character stores except the first settlement (energy full, Rested 0, level 1, rank from the
//   seed FXP, inventory with uids, equipment, ambition chapter 1 'choose', day.settled null, version 0)

// ambition.ts (ADR 0013)
export interface AmbitionState { id; chapter; step: 'choose' | 'check'; choiceId: string | null; flags: string[];
  history: Array<{ chapter; day: DayKey; choiceId; approachId; outcome: Outcome; logId: string }> }
export interface ChapterRules { n; requires?: { rank?: number; level?: number }; playable: boolean;
  choices: Array<{ id; flag }>; approaches: Array<{ id; stats: CheckStats }>; difficulty; energy;
  rewards: Record<Outcome, { xp; fxp; iron }> }
export type ChapterStatus =
  | { kind: 'none' }                                            // no such chapter in content: Letters row absent
  | { kind: 'waiting'; readyFrom: DayKey; needs: { rank?: number; level?: number } | null }
  | { kind: 'ready' } | { kind: 'midway' };                     // step 'check': "waiting for you"
export function chapterStatus(s: AmbitionState, spec: ChapterRules | undefined, c: { rank: number; level: number }, today: DayKey): ChapterStatus;
//   ch. 1: ready; ch. n > 1: ready when today ≥ lastDay + 7 and the requirement holds; step 'check' ⇒ midway
export function chooseInChapter(s: AmbitionState, spec: ChapterRules, n: number, choiceId: string):
  { ok: true; state: AmbitionState; changed: boolean } | { ok: false; reason: 'CHAPTER_NOT_READY' | 'UNKNOWN_CHOICE' };
//   set-once: step 'choose' → 'check' with the choice's flag added; already 'check' for chapter n ⇒ ok, unchanged
export function chapterRewards(r: { xp; fxp; iron }, restedUsed: number, energy: number): Rewards;
//   fixed amounts; Rested +50 % on XP and Iron per Energy point covered (§6.3), halves up; no FXP bonus; opinion 0
export function resolveChapterCheck(i: { spec: ChapterRules; approachId: string; values: Stats; energy: EnergyState;
  now: number; bonuses?: CheckBonus[] }, rng: Rng):
  | { ok: true; resolution: { attempt: ActionAttempt; rewards: Rewards; outcome: Outcome;
        energy: { before: EnergyProjection; after: EnergyState; cost: number; restedUsed: number } } }
  | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; cost: number; energy: EnergyProjection } | { ok: false; reason: 'UNKNOWN_APPROACH' };
//   spendEnergy (Rested per point) → computeCheck({ stats, values, difficulty }) with no Standing bonus →
//   roll100 → outcomeForRoll(roll, chance, 3) → chapterRewards
export function completeChapter(s: AmbitionState, r: { approachId; outcome: Outcome; day: DayKey; logId: string }): AmbitionState;
//   history += the record; chapter + 1; step 'choose'; choiceId null (flags kept)

// orders.ts (changed, ADR 0012)
export function startOrders(templates, day, hasJob, welcome?: readonly [string, string, string]): OrdersState;

// types.ts: STORY_PLACEHOLDERS; ResultStamp += 'failure'; ActionResult kind += 'chapter' (§9); view types of §7.3
```

The chapter check is the §8.4 formula with worn CHA (`values` from `wornStats`), difficulty from content (8 for
chapter 1), no bonuses in slice 2 (items with check bonuses come with the Wardrobe). Chapter rewards never feed
Local Standing or Party orders (§17.1).

### 6.3 Tests (Vitest)

- **origin:** all 3⁶ answer sets × 3 factions: stats in 5..16, at most +8 on one stat from the origin, 8 or 9 origin
  points **including CHA base** (6–9 across STR/INT/AGI, §20.1 Q13), CHA base 0..4, worn CHA ∈ {2, …, 9}; the three
  reference recruits exactly; wish paid only to its faction; five answers → `ORIGIN_INCOMPLETE`.
- **items:** worn CHA 2 / 5 / 6 for refused / accepted / promised with CHA base 0; + the base answers up to 9; a
  keepsake granted twice stays one.
- **ambition:** status for ch. 1, midway, waiting (day +6 no, +7 yes; Rank 1 vs 2), none; choose set-once and
  idempotent; check at INT 12 = 66 %, CHA+INT (2, 12) = 46 %, (5, 12) = 52 %, (6, 12) = 54 %; rolls 66 / 67 / 86 / 87
  → Success / Partial / Partial / Failure; rewards 150/40/100, 75/20/50, 25/0/0; with 10 Rested → +75 XP / +50 Iron on
  a Success, +13 / 0 on a Failure; Energy 9 → refused; seed replay.
- **orders:** welcome set builds A/B/C from the given ids with `noJob` frozen; without `welcome` unchanged.

---

## 7. API (`apps/server`)

### 7.1 Procedures

```ts
arrival.faces     publicProcedure ()                                   → AssetView[]            // the six faces, for the sign-up form
arrival.get       ()                                                   → ArrivalView
arrival.start     ({ avatarId: z.string() })                           → ArrivalView
    // BAD_REQUEST UNKNOWN_AVATAR. Upsert: $setOnInsert { userId, name: session name, answers: [] }, $set { avatarId }
    // while completedAt is null. Arrived users get the 'arrived' view (no write).
arrival.answer    ({ questionId: z.string(), answerId: z.string() })   → ArrivalView
    // BAD_REQUEST UNKNOWN_ANSWER / OUT_OF_ORDER { next } · PRECONDITION_FAILED NO_FACE / ALREADY_ARRIVED
arrival.join      ({ factionId: z.enum(FACTION_IDS) })                 → { character: CharacterView; landing: { cityId: string; locationId: string } }
    // PRECONDITION_FAILED NO_FACE / ORIGIN_INCOMPLETE { answered } · CONFLICT ALREADY_ARRIVED { factionId }

character.me          unchanged + PRECONDITION_FAILED ARRIVAL_PENDING when the user has no character
character.setAvatar   ({ avatarId: z.string() })                       → CharacterView           // BAD_REQUEST UNKNOWN_AVATAR
city.get              ({ cityId })  + BAD_REQUEST WRONG_CITY unless cityId === character.cityId

ambition.get      ()                                                   → AmbitionView
ambition.choose   ({ chapter: z.int().min(1), choiceId: z.string() })   → AmbitionView
    // PRECONDITION_FAILED CHAPTER_NOT_READY { readyFrom, needs } · BAD_REQUEST UNKNOWN_CHOICE
ambition.attempt  ({ chapter: z.int().min(1), approachId: z.string(), idempotencyKey: z.uuid() })  → ActionResult (kind 'chapter')
    // PRECONDITION_FAILED CHAPTER_NOT_READY / CHOOSE_FIRST / NOT_ENOUGH_ENERGY { energy, cost, times: 1, nextTickAt } ·
    // BAD_REQUEST UNKNOWN_APPROACH · CONFLICT KEY_REUSED / ACTION_CONFLICT

paper.today       → PaperView v2 (§10)       action.perform, job.take, character.placeStatPoint, paper.markRead: unchanged
```

Every procedure but `arrival.faces` is protected. `GameErrorReason` gains `ARRIVAL_PENDING`, `ALREADY_ARRIVED`,
`NO_FACE`, `ORIGIN_INCOMPLETE`, `OUT_OF_ORDER`, `UNKNOWN_ANSWER`, `UNKNOWN_AVATAR`, `CHAPTER_NOT_READY`,
`CHOOSE_FIRST`, `UNKNOWN_CHOICE`, `UNKNOWN_APPROACH`. Once a character exists, `arrival.get` and `arrival.start`
return the `arrived` view without writing, and `arrival.answer` refuses with `ALREADY_ARRIVED`.

**Keys.** Only `ambition.attempt` takes an idempotency key: it spends Energy and rolls (ADR 0002). `arrival.answer`
and `ambition.choose` are set-once conditional updates keyed by the step; `arrival.join` is keyed by the user;
`arrival.start` and `character.setAvatar` set a cosmetic value (last write wins, the same value twice is a no-op).
ADR 0008 allows this for conditional updates to a target state; ADR 0011 and 0013 record it.

### 7.2 Services

**`arrivalService`**

```
answer(user, q, a):
  i = index of q in content order; spec check → UNKNOWN_ANSWER
  r = Arrival.findOneAndUpdate({ userId, completedAt: null, avatarId: { $ne: null }, answers: { $size: i } },
                               { $push: { answers: { questionId: q, answerId: a, at: now } } }, { returnDocument: 'after' })
  r ⇒ view(r)
  else read: no draft or no face → NO_FACE; completed → ALREADY_ARRIVED; answers[i] exists → view (idempotent);
       answers.length < i → OUT_OF_ORDER { next }

join(user, factionId):                                                  // ADR 0011
  1 c = Character.findOne({ userId }) → c ? (c.factionId === factionId ? result(c) : ALREADY_ARRIVED) : go on
  2 txn (≤ 3):
      a = Arrival.findOne({ userId }).session → !a or !a.avatarId ⇒ NO_FACE; a.completedAt ⇒ go to 1
      o = resolveOrigin(...) → !ok ⇒ ORIGIN_INCOMPLETE { answered }
      doc = buildNewCharacter({ ..., uid: () => new ObjectId().toHexString() }) with _id = new ObjectId()
      s = computeSettlement(content, doc, now, { previous: null, home: City.findById(home).session })   // first edition, welcome set
      Character.create([{ ...doc, ...s.set, iron: doc.iron + s.inc.iron }], { session })
      PaperEntry.create([s.edition], { session })
      Arrival.updateOne({ _id: a._id, completedAt: null }, { $set: { completedAt: now, characterId, factionId } }).session
        → matched 0 ⇒ VersionConflict
  3 catch E11000 | VersionConflict → go to 1 (the winner's character)
  → { character: toCharacterView(...), landing: { cityId: home, locationId: home.locations[0].id } }
```

**`dayService`** is refactored, not redesigned: `computeSettlement(content, c, now, { previous, home })` is the pure
middle of today's `ensureSettled` transaction (settleDays → orders → edition), returning `{ set, inc, edition }`.
`ensureSettled` keeps its transaction and retries and calls it; `startOrders` receives
`faction.welcomeOrders` when `s.firstEdition` (ADR 0012). `loadCharacter` stops calling `getOrCreateCharacter`
(deleted) and throws `ARRIVAL_PENDING` when no character exists.

**`ambitionService`**

```
choose(user, n, choiceId):
  c = loadCharacter; spec = content chapter n of c.ambition.id; status = chapterStatus(...)
  r = chooseInChapter(c.ambition, spec, n, choiceId) → !ok ⇒ error
  r.changed ⇒ Character.updateOne({ _id, version, 'ambition.chapter': n, 'ambition.step': 'choose' },
                                  { $set: { ambition: r.state }, $inc: { version: 1 } })
             miss ⇒ re-read and return the view (a concurrent tap chose first)
  → view

attempt(user, { chapter: n, approachId, key }):                        // ADR 0002 via the shared helper
  runKeyedAction({ characterId, key, sameInput: log.actionId === '<ambition>.<n>' && log.result.story.approachId === approachId,
    resolveAndWrite(session):
      c = findById.session; day check (DayChanged); c.ambition.chapter !== n or status ≠ midway ⇒ CHAPTER_NOT_READY /
      step 'choose' ⇒ CHOOSE_FIRST
      r = resolveChapterCheck({ spec, approachId, values: wornStats(c, content), energy, now }, createRng(seed))
      g = applyGains(progress(c), { xp: r.rewards.xp.total, fxp: r.rewards.fxp.total, pc: 0 })
      inv = grantItem(c.inventory, keepsake, { uid, day: today, source: 'chapter' })
      amb = completeChapter(c.ambition, { approachId, outcome, day: today, logId })
      tally = addToTally(currentTally(c.today, today), today, { energy, xp, fxp, iron })        // not attempts/successes (§20 Q3)
      Character.findOneAndUpdate({ _id, version, 'day.settled': today, 'ambition.chapter': n, 'ambition.step': 'check' },
        { $set: { energy, rested, xp, level, fxp, rank, statPointsPending, inventory, ambition: amb, today: tally,
                  lastActionAt: now }, $inc: { iron, version: 1 } })  → null ⇒ VersionConflict
      result = buildChapterResult(...)                                                             // §9
      ActionLog.create([{ kind: 'chapter', actionId: '<ambition>.<n>', locationId: hq, cityId: home, times: 1,
                          seed, outcome: result.stamp, result, … }], { session }) })
```

`runKeyedAction` is today's `performAction` retry loop (fast path, M1 stored-result lookup, `DayChanged` →
resettle, bounded retries, final lookup) extracted into `services/keyedAction.ts`; `performAction` becomes a caller.

### 7.3 Views

```ts
interface StoryScreenView {                             // ADR 0013: the origin steps, the street's header and chapter steps
  kicker: string; title: string; narrative: string;
  art: { kind: 'scene'; asset: AssetView; focus: { x: number; y: number } | null }
     | { kind: 'map-crop'; asset: AssetView; x: number; y: number };
  portrait: AssetView | null;                           // the father, beside the question
  echo: string | null;                                  // "You went fishing with him." after the first question of a step
  prompt: string | null;                                // the father's question
  choices: Array<{ id: string; text: string; hint: string | null }>;          // one tap commits
  approaches: Array<{ id: string; text: string; check: CheckBreakdown }>;     // chapter step 2: pick, then the CTA
  cta: { label: string; energy: number; readyAt: number | null } | null;      // readyAt null = affordable now
  progress: { step: number; of: number };
}
interface ArrivalView {
  phase: 'face' | 'story' | 'street' | 'arrived';
  name: string; avatar: AssetView | null;
  faces: AssetView[] | null;                            // phase 'face' only
  screen: StoryScreenView | null;                       // phase 'story' (question index = answers.length)
  street: { screen: StoryScreenView /* kicker, title, narrative, art; no choices */; note: string;
            cards: Array<{ factionId; name; crest: AssetView; blurb: string;
                           facts: [string, string, string];     // "+3 Strength" · "Starts in Duskwall" · "Their event: the Torchlight March"
                           wish: boolean;                        // "His wish · +50 Faction XP"
                           confirm: string }> } | null;          // "Join the Iron Vanguard · take the train to Duskwall"
  landing: { cityId: string; locationId: string } | null;       // phase 'arrived'
}
interface AmbitionView {
  id: string; title: string; chapter: number; of: number; chapterTitle: string;
  status: ChapterStatus['kind']; readyFrom: number | null /* epoch ms of the day start */; needs: { rank?; level? } | null;
  screen: StoryScreenView | null;                       // ready → the choose screen; midway → the check screen
  letterFrom: string | null;
}
CharacterView += {
  avatar: AssetView | null;
  chaBase: number;                                      // stats.cha stays the worn total
  wearing: { itemId: string; name: string; cha: number } | null;
  partyCard: { factionName: string; rankTitle: string; memberSince: number } | null;
  keepsakes: Array<{ itemId: string; name: string; art: AssetView }>;
  ambition: { id: string; title: string; chapter: number; status: ChapterStatus['kind']; readyFrom: number | null };
  lettersWaiting: number;                               // Paper tab dot (§20 Q8)
}
OrdersView.issuer  non-null;  OrderView += { pin: { locationId: string; n: number } | null }
```

**Order pins.** For each order item, the first location of the home city (pin order) where a tap would advance it:
an action whose descriptor `orderMatches` the item's frozen spec, or, for a `takeJob` match, the first Jobs card with
a job the character can take. `Take a job` → pin 1 in all three cities; *Report to the hall* → the HQ; *Canvass
Coalport* → pin 1.

**Worn stats.** `wornStats(doc, content)` = `{ str, int, agi, cha: wornCha(chaBase, equippedItems(...)) }`; every
caller (checks, city view, job locks, chapter) passes content.

---

## 8. Scheduled jobs (Agenda)

**None.** Nothing in slice 2 happens at a set time: the origin waits for the player; the chapter's seven-day spacing is
computed from `history.at(-1).day` on read (lazy, like the City Day); the welcome set is decided at the first
settlement. The worker stays the stub.

---

## 9. The result modal and the story payloads

### 9.1 Chapter result (GDD §13.1a, §17.1)

`buildChapterResult` returns an `ActionResult` so `ResultModal` renders it with small additions:

```ts
ActionResult (changes):
  kind: 'checked' | 'training' | 'shift' | 'chapter';
  action: { id: 'finish-his-work.1'; name: 'His ward book'; type: 'chapter'; tier: 1 | 3; times: 1 };
  stamp: 'success' | 'partial' | 'failure' | 'batch' | 'worked' | 'trained';
  story: { ambitionId; ambitionTitle; chapter: number; of: number; approachId; choiceText: string } | null;   // chapter only
  effects: { ...slice 1,
    item: { itemId: string; name: string; keepsake: boolean; art: AssetView } | null;   // "Keepsake: his ward book"
    hooks: string[] };                                  // "Chapter 2, "Stand where he stood": from Tuesday 6 October, at Rank 2"
```

| Modal section | Chapter content |
|---|---|
| 1. Art and stamp | Map crop of the home map (day or night by `isNight`) centred on the `faction-hq` location; stamp *Success*, *Partial* or *Failure*; place (the home city, the HQ), *Ambition · Finish His Work · Chapter 1 of 12*, the time |
| 2. What happened | The outcome's headline and text, placeholders resolved |
| 3. How it went | One row: the approach's stats, chance bar, roll marker, outcome; tap for the `CheckBreakdown` (worn CHA shown as the stat) |
| 4. Rewards | XP, Faction XP, Iron tiles (base + Rested bonus); the fourth tile is the **keepsake** (item art and name) instead of opinion; tag *Rested: 10 of 10 Energy, +50 % XP and Iron* |
| 5. Knock-on | Keepsake line; the next-chapter hook; level-up with the one-tap point; rank-up; Energy and Rested before → after. No Standing, no orders (§17.1) |
| 6. Buttons | **Continue** only (`again: null`) |

Failure pays 25 XP and the keepsake, and the chapter still completes. The stamp tone for Failure is new (`Stamp`
`tone: 'failure'`, the oxblood from the tokens); the copy never says "failed" outside the stamp (§20 Q10).

### 9.2 The story payloads

- **Origin step** (`ArrivalView.screen`): kicker, title, narrative, the deathbed scene with focus (0.30, 0.50), the
  father's portrait, the echo of the answer just given (second question of a step only), the prompt, three choices
  with hints (the coat and the promise have hints; no numbers anywhere), `cta: null`, progress *n of 3*.
- **Street** (`ArrivalView.street`): the street scene, kicker *Irongate · morning*, the narrative, three cards with
  the wish tag on the matching one, the note, and each card's confirm label. Selecting a card is client state; the
  confirm is the one mutation.
- **Chapter step 1** (`AmbitionView.screen`): kicker *Ambition · {title} · Chapter 1 of 12*, map crop around the HQ,
  narrative, two choices with hints.
- **Chapter step 2**: the check title and narrative, two approaches each with its `CheckBreakdown` (the odds on the
  button, the breakdown on tap), `cta { label: 'Walk his ward', energy: 10, readyAt }` → *Needs 10 Energy · ready at
  hh:mm* when short (existing copy).
- All text is resolved on the server (§4.4). The client never sees origin effects.

---

## 10. The Morning Paper v2 (§3.3)

- **Welcome edition** = the first edition, printed in the join transaction: headlines by the existing selection
  (personal ≤ 2, then city by priority, then ambient): `hl.welcome` (personal 1, `firstEdition`), `hl.arrival` (city 0,
  `firstEdition`), the morale line (city 1). No new condition kinds. `hl.first-day` is removed.
- **Party orders**: the welcome set, signed by the secretary.
- **Letters** (new, live at read): `letters: Array<{ kind: 'chapter'; from: string; title: string;
  status: 'ready' | 'midway'; energy: number }>` from `chapterStatus` — ready: *From your father's things · His ward
  book · Chapter 1 is ready · 10 Energy*; midway: *… waiting for you*; nothing when `none` or `waiting`.
- **Desk**: slice-1 rows + **`wearing: { name, cha }`** (*Wearing: Your father's coat · CHA 5*).
- **`landing: { cityId, locationId } | null`** on the first edition: *To the city* opens `/city/$home?loc=<pin 1>`.
- The banner and masthead use each city's paper (*The Sentinel is in*, *The Gazette is in*).

---

## 11. Party orders

Unchanged from slice 1 (ADR 0009) except the welcome set (ADR 0012) and the pins (§7.3). Chapter checks advance no
order. The welcome set fits 30 Energy + the job take; completing it pays +60 FXP and +5 PC as in slice 1.

---

## 12. Client (`apps/client`), UI (`packages/ui`) and the mobile layout

### 12.1 Routes

| Route | Screen | Guard |
|---|---|---|
| `/signup` | Name, **Your face** (six tiles, radio group, required), email, password → `signUp.email` → `arrival.start` → `/arrive` | signed out |
| `/arrive` | Full-screen story (no HUD, no tab bar): face → origin steps → street; *Sign out* in the corner | signed in, no character |
| `/` | `character.me` → `ARRIVAL_PENDING` ⇒ `/arrive`; `paperDue` ⇒ `/paper`; else the map | signed in |
| `/paper` | + Letters row, Wearing row; *To the city* → `?loc=` on the first edition | character |
| `/city/$cityId?loc=` | unchanged; orders on the plate link to their pins | character |
| `/story/ambition` | Chapter screens inside the shell (HUD visible: it spends Energy); the result modal over it; *Continue* → back to where the Letters row was opened | character |
| `/me` | + face (change in a sheet), *Wearing*, the party-card line (*Iron Vanguard · Initiate · member since 29 September*), keepsakes, the Ambition line | character |

The app-shell guard becomes `requireCharacter` (session + `character.me`; `ARRIVAL_PENDING` → `/arrive`). If
`arrival.start` fails after a successful sign-up, `/arrive` shows the face phase, so nothing is lost.

### 12.2 `packages/ui` additions

`AvatarPicker` (radio tiles, `Picture`), `StoryScreen` (renders `StoryScreenView`: art panel or top band, kicker,
title, narrative, echo in Courier, prompt beside the portrait, choices as full-width buttons with the hint line,
approaches as selectable tickets with odds, sticky CTA, the resume caption), `FactionCard` (crest, name, blurb, facts,
wish tag; collapsed and expanded), `LettersRow`, `ItemLine`, `Stamp` tone `failure`, `ResultModal` kind `chapter`
(keepsake tile, hook lines, Continue only), `HudBar` avatar circle (crest when null), `Picture` for `svg` assets.
Plain props, no tRPC or router imports (slice-0 rule).

### 12.3 The mobile layout: rules for every screen

Breakpoints: **phone < 640 px** (designed at 375, supported from **360**), tablet 640–1023, desktop ≥ 1024.

- **Viewport:** `viewport-fit=cover`; full-height screens use `min-h-dvh`; every sticky bar pads
  `env(safe-area-inset-bottom)`; no horizontal scroll at 360 px; tap targets ≥ 44 px (primary story buttons 56 px).
- **Story screens** (origin, chapter): art as a **top band**, full width, 16:9, at most 40 dvh, `object-position` from
  `focus`, kicker and title over its lower edge; narrative, echo, the portrait (48 px circle) beside the prompt, then
  the choices stacked; the CTA sticky at the bottom with the caption under it. At 375 × 667 the prompt and all three
  choices are visible without scrolling. Desktop: the Story mockup (420 px art panel left, text right).
- **Street:** the band, the narrative, three cards stacked (collapsed: crest, name, first line, wish tag; the
  selected card expands to blurb and facts); the confirm button sticky; the note in Courier above it.
- **Sign-up:** faces in a 3 × 2 grid (≥ 96 px tiles) on phones, 6 × 1 from 640 px; the form in one column.
- **Paper:** `MobilePaper` (one column; masthead; headlines; orders with the secretary's portrait; Letters row as a
  full-width 56 px button; desk); *To the city* sticky.
- **Map and sheet:** slice-1 fixes kept (all pins in the first view, focus pans a pin into view); the first-landing
  sheet opens as a bottom sheet at ≤ 60 dvh so the map and the pin stay visible above it; the orders list collapses to
  one line on phones.
- **Result modal:** sticky Again / Continue (fix round 1); the chapter modal's keepsake tile fits the 2 × 2 tile grid.
- **Me:** one column; face change in a bottom sheet with the `AvatarPicker`.
- **HUD:** the avatar circle replaces the crest at 32 px; nothing else moves.

Checked by Playwright on three projects (§14): `phone` (Pixel 7), `small-phone` (360 × 640, touch), `desktop`
(1440 × 900): no horizontal scroll, the story CTA and the three choices `toBeInViewport`, the sheet leaves pin 1
visible.

### 12.4 Copy (new strings in `copy.ts`)

*Your face* · *Close the game now and this waits for you* · *His wish · +50 Faction XP* · `joinFaction(name, city)`
*Join the {name} · take the train to {city}* · `statBonus(bonus)` *+2 Strength, +1 Intelligence* · `startsIn(city)` ·
`theirEvent(name)` · `letterReady(energy)` *Chapter 1 is ready · 10 Energy* · *waiting for you* · `wearing(name, cha)`
· `partyCard(faction, rank, date)` · `keepsakeLine(name)` · *Choose your face* · `chapterKicker(title, n, of)`. The
designer reviews them (§20 Q11).

---

## 13. Art pipeline (ADR 0015)

| Id | Kind | Source (`art-direction/`) | Widths | Notes |
|---|---|---|---|---|
| `map.duskwall.day` / `.night` | map | `maps-pen/duskwall.png`, `duskwall-night.png` (5056 × 3392, RGB) | 1280, 2560 | no flatten |
| `map.ashford.day` / `.night` | map | `maps-pen/ashford.png`, `ashford-night.png` | 1280, 2560 | no flatten |
| `scene.origin-deathbed` | scene | `mvp/scenes/origin-deathbed.png` (2688 × 1520) | 640, 1280 | focus 0.30, 0.50 |
| `scene.origin-street` | scene | `mvp/scenes/origin-street.png` | 640, 1280 | |
| `scene.vanguard-office` | scene | `mvp/scenes/vanguard-office.png` | 640, 1280 | bound to `faction-hq` + `vanguard` (reviewed: no symbol) |
| `scene.newsroom` | scene | `mvp/scenes/newsroom.png` | 640, 1280 | bound to `press` |
| `portrait.father`, `portrait.stahl`, `portrait.grey` | portrait | `mvp/portraits/*.png` (880 × 1168) | 256, 512 | 4:5 crop like Holm's (760 × 950) |
| `avatar.man-20s` … `avatar.woman-40s` (6) | avatar | `mvp/avatars/avatar-*.png` (880 × 1168) | 128, 256 | 4:5 crop; alt text per face |
| `item.work-jacket`, `item.mill-coat`, `item.worn-overcoat`, `item.winter-coat`, `item.document-folder` | item | `mvp/items/*.jpg` (512 × 512) | 128, 256 | |
| `crest.vanguard`, `crest.collective`, `crest.alliance` | vector | `crests/crest-*.svg` (~1 KB) | — | copied; SVG safety check |

**Budget for slice 2** (ADR 0015):

| | Estimate | Budget |
|---|---|---|
| Duskwall + Ashford maps (4 × 2 widths × 2 formats) | 5.4–6.4 MB (Coalport's pair is 2.7 MB) | per file as ADR 0007 |
| Four scenes | ≈ 1.25 MB | per file as ADR 0007 |
| Three portraits, six avatars, five items, three crests | ≈ 0.65 MB | per file as ADR 0015 |
| **Slice-2 additions** | **≈ 7.3–8.3 MB** | — |
| **Committed set after slice 2** | **≈ 10.6–11.6 MB** | **≤ 12 MB** (`art:check`) |
| **Art transferred in a new player's first session on a phone** (sign-up → first modal, AVIF) | ≈ 0.75 MB | **≤ 1 MB** (Playwright) |

Nothing is blocked on missing art: an Alliance HQ scene and scenes for `barracks`, `library`, `station`, `street`,
`market`, `university` and `court` fall back to the map crop.

---

## 14. Testing

| Layer | What |
|---|---|
| Rules | §6.3 |
| Content | the real data validates (3 cities, 64 actions, 9 jobs, 36 order templates, 3 papers, 9 items, the origin, 3 Ambitions, 6 avatars); every §4.3 cross-check has a failing fixture; the design-doc comparison tests (§4.5); reference recruits and first-pin odds |
| DB | `arrivals` unique index; migration 002 on a slice-1 fixture document: CHA stays 2, job id renamed, ambition ready, stats/Iron/FXP unchanged; run twice → no change |
| Server — arrival | **Resume mid-origin:** three answers, a new caller for the same user → `arrival.get` is step 2's second question with the talent echo. **Double submit:** `Promise.all` of five identical answers → one stored, five identical views; two different answers to one question at once → one stored, both calls return it. Out of order → `OUT_OF_ORDER`; no face → `NO_FACE`. **Join:** five concurrent joins → one character, one paper, `completedAt` set, identical results; a join after the join with another faction → `ALREADY_ARRIVED`; five answers → `ORIGIN_INCOMPLETE`. **Per faction:** home city, stats, worn CHA, Iron, FXP seed, kit worn, welcome set (titles and targets), the welcome edition's three headlines in order with the name filled, masthead name, Letters row ready, landing = pin 1. `character.me` before join → `ARRIVAL_PENDING` |
| Server — cities | `city.get` of another city → `WRONG_CITY`; a Vanguard recruit's first-pin canvass is 62 %, an Alliance recruit's 74 %; orders pins |
| Server — chapter | choose set-once (five at once, one write); attempt before choose → `CHOOSE_FIRST`; attempt ×5 with one key → one log, 10 Energy, one keepsake; Energy 9 → refused, nothing written; Failure completes the chapter and grants the keepsake; rewards with and without Rested; Today tally; chapter 1 `none`-status after completion (no chapter 2 content) and the hook line; the result replays from its seed |
| Server — slice 1 | Existing tests move to a helper `seedRecruit(user, overrides?)` that builds the reference recruit with `buildNewCharacter` and inserts it settled as of "yesterday", so slice-1 numbers (Iron 0, FXP 0, rotation orders on the test day) still hold; tests that need the real flow use `arrive(caller, { factionId, answers })` |
| UI | fixtures: `StoryScreen` (origin step with echo; chapter check with approaches and a disabled CTA), `FactionCard` (wish, selected), `ResultModal` chapter (Failure stamp, keepsake tile, hook) |
| E2E (Playwright) | **`arrival.spec.ts`**, once per faction (`test.describe.each`): sign up with a face → six answers (reference answers), **reload after the third** and land on the same question → street: the matching card shows *His wish* → confirm → the welcome edition: masthead (*Clarion / Sentinel / Gazette*), *Welcome to {city}*, *{name} Steps Off… / Arrives…*, three orders at 0 signed by the secretary, the Letters row, *Wearing* → *To the city* → pin 1's sheet is open with *66 / 62 / 74 %* and *Party order 0 / 2* → ×1 → the modal's stamp and *Be at the gate 1 / 2*; sums `/art/` bytes ≤ 1 MB. **`chapter.spec.ts`**: Letters → choose → pick an approach → CTA → modal with the keepsake and the hook → Continue → Me shows the keepsake → reload: the Letters row is gone. Existing specs use an `arrive(page)` helper. Projects: `phone` (all), `small-phone` and `desktop` (arrival and the paper) with the §12.3 checks |
| Playtest report | §14.1 |

### 14.1 Playtest report: the arrival funnel

`pnpm report:playtest` gains a section built from `arrivals`, `characters`, `actionLogs` and `paperEntries`
(read-only):

- Funnel: accounts → face → answers 1…6 → joined → first action → welcome orders 1 / 2 / 3 done on day 1 → job taken
  on day 1 → chapter 1 started / done on day 1. Where players stop is where the game failed to explain itself.
- Times (median, p75): sign-up → join; join → first action (target under 60 s); join → all three welcome orders
  (target ≤ 10 min); join → chapter done.
- **First-action match:** the share of players whose first action is the welcome order A's action (the open sheet
  worked) and whose second tap is *Again* from the modal.
- Resumes: arrivals with a gap of more than 10 minutes between two answers that still joined.
- Per faction, the same, so one city's first ten minutes can be compared with another's.

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| Sign-up succeeds but `arrival.start` fails, leaving an account with no face | `/arrive` shows the face phase; `arrival.answer` refuses without a face |
| Slice-1 tests break wholesale (no auto-create, the welcome set, 150 Iron, 50 FXP) | `seedRecruit` helper built from the same rules function; update the few that assert day-1 orders |
| Transcribing ~64 actions, 36 order templates and three papers | QA-style comparison tests against the design docs, as in slice 1 |
| The Vanguard content-policy questions (§20.3) are open while the faction card already shows *the Torchlight March* | Only display strings in content change when the user decides; flagged before the playtest |
| The open first sheet hides the map, so a new player never learns there is a map | Bottom sheet ≤ 60 dvh with pin 1 visible above; orders link to pins; measured in the funnel (taps on other pins in session 1) |
| Chapter 1's Failure reads as "I failed the tutorial" (App. C #20) | Written as a setback; the chapter completes; the funnel reports chapter outcomes; the designer's lever is a Partial floor |
| A player chooses the wrong faction on the permanent screen | The card says *Permanent*, the confirm button names the faction and the city; the Reset token is out of scope |
| Art weight and git growth | Per-file and set budgets, first-session budget in e2e (ADR 0015) |
| `wornStats` now needs content everywhere; a missed call site uses `chaBase` alone | `wornStats(doc, content)` is the only export; the old one-argument form is deleted so the compiler finds every call |
| Hot city documents | unchanged from slice 1 (ADR 0010); three cities spread the writes |

---

## 16. Idempotency and atomicity summary

- **Origin answers:** set-once `$push` filtered by `answers: { $size: i }`; a retry returns the view.
- **Join:** one transaction (character insert, first paper, arrival completed); natural key = the user (unique
  `characters.userId`, the `completedAt: null` guard, the unique paper index); a retry returns the winner.
- **Chapter choose:** set-once conditional update on `ambition.chapter` and `ambition.step: 'choose'`.
- **Chapter attempt:** a game action — one key, one `actionLogs` row, one version-guarded character update filtered on
  the chapter and step (ADR 0002, 0013); the keepsake is granted in the same write.
- **Face:** last write wins on a cosmetic field.
- Everything from slice 1 unchanged (actions, jobs, stat points, settlement, paper read).

---

## 17. Deliberately left out of slice 2

| Left out | Why / where |
|---|---|
| Changing clothes, a wardrobe, a shop, crafting | slice 8 (the plain clothes matter from slice 5) |
| Chapter 2+ play, patron letters | slice 3+ (the teaser and the hook are in) / slice 8 |
| A generic story interpreter | ADR 0013 |
| Going back to change an origin answer | set-once by design (§20 Q4) |
| The Faction Reset token, renaming a character | §23, later |
| Travel, other cities' maps, hostile ground | slices 4–5 (`WRONG_CITY`) |
| An `items` collection | ADR 0014 |
| Heat, Health, encounters in chapters | slice 5 (home-city chapters never trigger one) |
| An analytics service | the report covers the playtest |

---

## 18. Task list (in order; each task leaves the repo green and is one commit)

**T1. Rules: items and origin.** `items.ts`, `origin.ts` (`resolveOrigin`, `buildNewCharacter`), `STARTING`; tests
(exhaustive answer sets, reference recruits).

**T2. Rules: ambitions, welcome set, types.** `ambition.ts`, `chapterRewards`, `startOrders(…, welcome)`,
`STORY_PLACEHOLDERS`, `ResultStamp 'failure'`, `ActionResult` chapter fields, the §7.3 view types, the new
`GameErrorReason`s; tests.

**T3. Content: schemas and Coalport.** §4.1–4.3 schemas and cross-checks; Coalport and the Collective migrated
(prefixed job ids, `hl.welcome`/`hl.arrival`, secretary `addressedAs`, `hqRef`, kit, welcome set, card, crest asset);
`startingCharacter` removed; failing fixtures.

**T4. Content: the onboarding.** `origin.ts`, `ambitions.ts`, `items.ts`, `avatars`, faction cards and welcome
headlines for all three cities, copy strings; comparison tests against `slice-2-onboarding.md`; reference recruits.

**T5. Content: Duskwall and Ashford.** Cities, actions, jobs, Stahl and Grey, 24 order templates, the Sentinel and the
Gazette with their headlines; comparison tests against `slice-2-cities.md`; first-pin odds. (Parallel with T6–T11
once T3 is in.)

**T6. Art.** New kinds, `focus`, budgets, the 12 MB cap and the SVG check in `scripts/art/build.ts`; the §13
catalogue; generate and commit; `art:check` green.

**T7. DB.** `Arrival` model; character fields; `actionLogs` enums; migration 002 with `content`; `ensureIndexes`;
seed for three cities; tests.

**T8. Server: foundations.** `computeSettlement` refactor with the welcome set; `loadCharacter` without auto-create
(`ARRIVAL_PENDING`); `wornStats(doc, content)`; views v3 (avatar, wearing, party card, keepsakes, ambition line, order
pins); `city.get` `WRONG_CITY`; `keyedAction` extracted from `performAction`; test helpers `seedRecruit` and
`arrive`; slice-1 tests green again.

**T9. Server: arrival.** `arrival.faces/get/start/answer/join`; tests (resume, double submit, races, join per
faction).

**T10. Server: ambition.** `ambition.get/choose/attempt`, `buildChapterResult`; tests.

**T11. Server: paper v2 and the face.** Letters, Wearing, landing, banner names; `character.setAvatar`; tests.

**T12. UI package.** §12.2 components with fixtures and smoke tests.

**T13. Client: arrival.** Sign-up with faces; `/arrive` (face, steps, street); `requireCharacter`; the first landing
with `?loc=`.

**T14. Client: paper, chapter, Me.** Letters and Wearing rows; `/story/ambition` with the modal; Me tab additions;
order pins on the plate; the HUD avatar.

**T15. Client: the mobile pass.** §12.3 on every screen (sign-up, login, arrival, paper, map, sheet, modal, chapter,
Me, HUD) at 360 / 375 / 1440; safe areas, `dvh`, sticky bars.

**T16. E2E.** `arrival.spec.ts` ×3 factions, `chapter.spec.ts`, the `small-phone` and `desktop` projects, the art
transfer check; existing specs through `arrive(page)`; CI green.

**T17. Report and docs.** The arrival funnel in `pnpm report:playtest`; README; a **Deviations** section at the end of
this file.

---

## 19. Answers to the design's questions

**Onboarding doc §11**

1. **Where the origin lives:** in an `arrivals` draft, not in a character with null stats; the character is created
   at confirm, in one transaction with its first City Day and welcome edition (ADR 0011). Answers are idempotent per
   question index.
2. **The welcome set:** `Faction.welcomeOrders` and `startOrders(…, welcome)` at the settlement that prints the first
   edition, which the join performs, so no `createdDay` field (ADR 0012). *Take a job* is frozen as `noJob`: yes, a
   new character has no job at that settlement.
3. **Ambition state:** embedded `ambition { id, chapter, step, choiceId, flags, history }` (the last history day
   replaces `completedDay`). Step 1 is set-once (no key); the check has a key and an `actionLogs` row. The check is
   `computeCheck` at the chapter's difficulty, worn CHA, **no bonuses**: Rested changes the rewards (per Energy
   point), never the odds (§8.4). Flags are read by later chapters only.
4. **Items:** yes, with one change: equipment points at inventory **instances** (uids), not catalogue ids (ADR 0014).
5. **Avatar:** on the sign-up form, stored on the arrival by `arrival.start`, copied at join; `avatarId` on the
   character; six `avatar` assets.
6. **Placeholders:** resolved on the server; `{secretary}` needs a form of address per faction
   (`secretary.addressedAs`) and `{hq}` a short reference (`hqRef`), both new content fields.
7. **One home city:** yes, `city.get` refuses other cities with `WRONG_CITY`.
8. **Job ids:** prefixed now.

**Cities doc §3**

1. Coalport's job ids become `coalport-street-vendor`, `coalport-factory-worker`, `coalport-driver`; migration 002
   renames the stored ones (ADR 0016).
2. `Faction.secretary` is required; `OrdersView.issuer` is no longer nullable.
3. and 4. Prefixed headline and order ids are fine: the loader already enforces unique ids across the flat arrays.
5. `library` for the Archives: agreed (the kind decides art and presence text only).
6. Reserved pins: not data, nothing to build.

---

## 20. Questions

### 20.1 For the game designer (each has a default so the build doesn't wait)

1. **Echo lines.** The design shows one (*"You went fishing with him."*). The first question of each step needs an
   echo per answer: nine lines. Default until written: no echo line.
2. **The chapter-2 hook.** *"from day 8, at Rank 2"* is only right if chapter 1 is played on day 1; the rule is seven
   City Days after the chapter. Default: computed, *Chapter 2, "Stand where he stood": from Tuesday 6 October, at
   Rank 2*. OK?
3. **The Today tally and the chapter.** Default: the chapter's Energy, XP, FXP and Iron count in *Today*; it adds no
   attempt or win (it is not a tier-1 row). OK?
4. **No going back in the origin.** Default: an answer is final once tapped (set-once), so a double tap can't change
   it. OK, or should the player be able to change the last answer before the street?
5. **Numbers in §3.2 of the onboarding doc:** *"46 % (58 % with coat A)"* for CHA+INT. With CHA 5 and INT 12 the
   average is 8.5, so **52 %** (as `docs/economy.md` §13.1 says; coat C gives 54 %). Please correct the doc; the build
   uses the formula.
6. **Card crest vs the "plain square".** Onboarding §5.3 says the Vanguard crest is a plain square; the art the
   design puts on the cards (`crests/crest-vanguard.svg`) is an iron gate beneath a lantern inside a square frame.
   Default: the SVG crests on the street cards and the party card, the plain shapes for small marks. Please confirm
   the SVG passes the Vanguard review.
7. **Migrated characters** (ADR 0016) get *Finish His Work* chapter 1 in Letters and no face until they choose one.
   OK?
8. **The Paper tab dot for a Letter.** Default: shown while a chapter is `ready` and not yet opened; not for `midway`
   (the Letters row says *waiting for you*). OK?
9. **The first-landing sheet** opens on the first edition only. Default: yes; later mornings open the map. OK?
10. **Failure wording.** Default: the stamp reads *Failure*; nothing else in the chapter modal says "failed" (the texts
    are setbacks). OK?
11. **Copy to review:** §12.4, and six avatar alt texts (the developer drafts them, one line each).
12. **"Chapter 1 of 12"** is shown for *Clear His Name* and *Settle His Debts*, which will have four chapters at launch.
    Keep *of 12*?
13. **The origin arithmetic in GDD §7.2 / §8.5 doesn't hold for two answers.** *Talked them out* gives +2 CHA base
    instead of +2 to a trained stat, and *read people* gives +3 INT +1 CHA. So the origin adds **8 or 9 points
    including CHA base**, but only **6–9 across STR, INT and AGI**. And the best stat can be as low as **8**, not 10:
    a Vanguard recruit who fished, talked them out and read people has STR 8 / INT 8 / AGI 8 (worn CHA 5, or 8 with the
    coat). The build follows the answer table, which is unambiguous; please correct the sentences in §7.2, §8.5 and
    onboarding §2.4, or change an answer if a best stat of 8 (50 % at home) is not wanted on day 1.

### 20.2 For the user

1. **Art in git** grows to about 11–12 MB in this slice (ADR 0015), within ADR 0007's estimate. Say if you want LFS
   or an image host instead.
2. **Provisioning** (GitHub remote, Atlas, Railway/Fly, Vercel, Sentry) is still open; the slice-2 playtest needs a
   deployed URL.
3. If a slice-1 playtest runs on a deployed database before slice 2 ships, its characters are migrated as in ADR 0016
   (they keep everything; they skip the origin). Confirm that is acceptable.

### 20.3 Content-policy flags (for the user to decide; nothing is changed here)

CLAUDE.md design rules 2 (no war framing) and 6 (no real-world extremist symbols). Faction identity is parked, so
these are listed, not decided. Items 1–3 are player-facing in slice 2.

1. **Vanguard rank titles** (§5.4): Initiate, **Footsoldier, Sergeant, Lieutenant, Captain, Commander, Marshal**.
   Flagged by QA and the developer as military framing. From slice 2 they appear in the HUD and in the Sentinel's
   headlines (*"{name} Made Footsoldier by the Movement"*). The designer's review calls them "generic military" on
   purpose.
2. **The Torchlight March** (§16.1, §16.3), with the roles **Standard-bearer, Drummer, two Marshals, Lookout**, evokes
   real-world fascist torchlight marches. It is on the Vanguard's faction card in slice 2 (*"Their event: the
   Torchlight March"*), so it reaches players now unless the card's third fact changes. Appendix C #7 already asks for a
   Vanguard moderation policy.
3. **The Vanguard's description and Duskwall vocabulary:** *"A paramilitary movement"* and the *(Fascists)* label in
   §16.1; *"A movement of ex-soldiers and clerks"* on the card; the Duskwall actions *Drill with the recruits*,
   *Address the evening muster*, the volunteers who *muster in the yard*, and *Chalk the movement's mark* (the square
   with *HOLD THE LINE*: a symbol plus a slogan chalked on walls). The designer reviewed these as depicting the
   movement, not praising it.
4. **Other military or real-world echoes in the GDD** (not in slice 2 content; section numbers are the GDD's): the Collective's *Commissar* and
   *Comrade-General* (§5.4), *Red Guard regalia* (§21.2) and the *Red Guard* enemy (§20.2, a real-world name), the
   *People's Commissar* (§8.4, §20.2), *Ceremonial Vanguard uniform*, *Faction uniform* and *Marshal's regalia* (§8.2,
   §21.2), and the Season Twist ***The Uprising*** (§14.11, §22.3), a word CLAUDE.md rule 2 lists by name.

---

## Deviations (developer, slice 2 build)

Smallest working changes from this design, found while building T1–T17. The game designer's answers to §20.1
(`docs/design/slice-2-onboarding.md` §13) are built in: the nine echo lines, the computed chapter hook
(`Chapter 2, "Stand where he stood": from Tuesday 6 October, at Rank 2`), *Keepsake: His ward book*, the party-card
line, *Choose your face* / *No face yet*, the six avatar alt texts, *of 12* from `chaptersPlanned`, and the §2.4 / Q13
arithmetic (the rules test asserts 6–9 trained points, 8–9 with CHA base, the flattest build 8 / 8 / 8). No
`TODO(game-designer)` is left. The content-policy strings of §20.3 are transcribed as designed, live in content only,
and carry `TODO(content-policy)` comments (Vanguard rank titles, the card blurb, *the Torchlight March*, the Sentinel's
rank-up headlines, *Drill with the recruits*, *Address the evening muster*, *Chalk the movement's mark*).

**Views and API**

- `ArrivalView.questionId` (the id `arrival.answer` needs; the screen itself carries none), `FactionCardView.wishLabel`
  (the tag's words come from the server, *His wish · +50 Faction XP*), `LetterView.chapter` (*Chapter 1 is ready*), and
  `ActionResult.story` is `null` for tier-1 results. `AssetView` gains `focus` beside `format`.
- `city.get` refuses a *loaded* city other than the character's with `WRONG_CITY`; an unknown id stays
  `NOT_FOUND UNKNOWN_CITY`.
- `character.setAvatar` is a plain `$set` without a version bump (a cosmetic value, last write wins; a concurrent game
  write never touches `avatarId`).
- A joined character is inserted already settled, so it starts at `version: 0` (slice 1's auto-create reached 1 with its
  separate first settlement).
- `chapterStatus` is `none` for a chapter that exists only as a teaser (no `story`): after chapter 1 the Letters row goes
  and the Me tab reads *Chapter 1 done*; the hook line in the modal names the date and the requirement.
- `lettersWaiting` (the Paper tab's dot) is 1 while a chapter is `ready`; there is no "opened" state to clear it earlier
  (§20 Q8 said "ready and not yet opened").
- `ambition.history[].logId` is stored as the log's hex string, not an ObjectId.
- `ensureIndexes(content = getContent())`: the migration's content is a default parameter, so every caller keeps working.

**Content**

- Chapter flags are lower kebab-case (`showed-book`, `kept-book`, `read-name`, `told-branch`, `asked-name`,
  `said-nothing`) because content ids are; the design wrote them in camelCase. Rules never read them.
- The street's title is its first sentence, *He dies before the first tram.*, and the narrative the rest; origin step ids
  are `origin.step-room`, `-talent`, `-promise`, answer ids `a`–`c`.
- `Faction.startingBonus` no longer has a `cha` field, so a CHA bonus is refused by the schema itself.
- `Asset.widths` may be empty; the loader requires widths for every raster kind and none for a vector.
- Duskwall and Ashford (locations, actions, texts), their 24 order templates and the two papers' headlines were
  generated from the design document's tables and are checked word for word against it by
  `packages/content/test/slice2.content.test.ts`.
- Two QA vocabulary findings in the designed text (`qa.content.test.ts`): the Vanguard card's *ex-soldiers* is exempted
  by exact phrase with a `TODO(content-policy)` (it is §20.3 item 3, the user's to decide), and *the front row* (the
  Duskwall muster text) is added to the allowed uses of "front". Every other occurrence still fails.

**Art (ADR 0015)**

- Portrait crops as Holm's (760 × 950 from 60, 40), except Grey (from 60, 0: the hat) and the young man's face (from
  60, 20). Scene binding `press` → the newsroom applies to every city's press, as designed.
- The night map is fetched only once it is night (it was always loaded under the day map); without this the first
  session on a Pixel 7 would pass 1 MB.

**Client and UI**

- `Picture` renders `<picture class="contents">`, so size and flex classes apply to the `<img>` (round portraits in flex
  rows); its `<source>`s are hidden.
- The location sheet is at most 60 dvh on phones. `CityMap` takes `coverBottom`: under a phone's sheet the selected pin is
  panned (and zoomed in just enough, instantly) into the strip above it; when that sheet closes the map returns to the
  fitted first view (the transform remounts, so every pin is exactly on screen again, QA M2).
- Desktop: while a sheet is open the city plate folds to its header, so a pin in the map's top-left corner (Ashford's
  Gazette House) is not under it.
- The paper's orders header reads *from {issuer name}* (it said *from Secretary {name}*, wrong for Stahl and Grey), and
  the secretary's portrait ring is ink, not the Collective's red. *To the city* is sticky on phones.
- New `BottomSheet` (the Me tab's face change) in `packages/ui`, so the client needs no Radix dependency of its own.
- The chapter screen shows the chosen step-1 answer as its echo line at step 2.
- The HUD's face ring is 36 px with the small crest mark on it (the design said 32 px); PC stays hidden on phones as in
  slice 1.

**Tests**

- `seedRecruit(user, now, overrides)` zeroes Iron and FXP (slice-1 numbers), as §14 says; the e2e `signUp` helper
  arrives with the reference answers except that it *takes the coat*, so Iron starts at 0 and the slice-1 specs keep their
  numbers; `arrival.spec.ts` uses the reference answers. `toTheCity` closes the first-landing sheet.
- The playtest funnel cannot tell "chapter 1 started" (the choice writes no log), so it reports *chapter 1 done on day 1*;
  "the second tap is Again" is measured as the same action again within two minutes.

**Not verified here:** CI (no remote), Docker, deployment.
