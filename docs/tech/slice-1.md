# Slice 1 — The 5-minute session: technical design

| | |
|---|---|
| **Goal** | Open the paper, see what is waiting, walk onto Coalport's map, spend a bar of Energy in two or three minutes with ×1 / ×3, watch Standing, Party orders, levels, the meter and the Today tally move, and leave with a reason to come back. |
| **Question** | **Is spending a bar of Energy fun, and do players want to come back in 3 hours?** |
| **Builds on** | Slice 0 as built (`docs/tech/slice-0.md` incl. its **Deviations**: Mongoose 9, Agenda 6 + `@agendajs/mongo-backend`, content-defined starting character, reference recruit 66 %) |
| **Content and numbers** | `docs/design/slice-1-content.md` (6 locations, 21 actions, 3 jobs, Standing, 12 order templates, Petra Holm, *The Coalport Clarion*, 11 headline templates) and `docs/economy.md` — final. GDD updated by the designer (§2.2, §3.3, §3.7, §5.4, §6.5, §8.5, §9, §13.1–13.7, §14.2, §15.4) |
| **Sources** | Plan §2, §4 (slice 1), §5 row 1 · GDD §2–§3.7, §4.2–4.3, §5.3–5.5, §6.2–6.5, §8.4–8.5, §9, §13.1–13.7, §14.2, §14.11, §15.4 · mockups `City`, `MobileCity`, `Mission`, `MobileMission`, `MobilePaper` (`docs/mockups/`) |
| **ADRs** | [0005 lazy City Day](../adr/0005-lazy-per-character-city-day.md) · [0006 ×3 as one request](../adr/0006-repeat-actions-one-request.md) · [0007 web art pipeline](../adr/0007-web-art-pipeline.md) · [0008 idempotency for non-action mutations](../adr/0008-idempotency-for-non-action-mutations.md) · [0009 Party orders computed, progress embedded](../adr/0009-party-orders-computed-progress-embedded.md) · [0010 opinion written in the action transaction](../adr/0010-opinion-written-in-action-transaction.md) |

Every number below is a GDD or content number. The few points the design leaves open have a stated default and are in §19.

---

## 1. Scope

**In**

- Coalport's **detailed map** (day art, night art 20:00–06:00 UTC) with **6 locations** as numbered hotspots; a **location
  sheet** with tickets (×1 / ×3), a Jobs card, Local Standing and order tags.
- **21 tier-1 actions** from content, in three kinds: **checked** actions (canvass, speech, propaganda, intelligence,
  council; one or two stats), **training** (no roll, +1 stat, cost 20 + 2 × stat), **job shifts** (no roll, pay).
  **×1 and ×3** (not for shifts). Lazy Energy and Rested, the Rested and Party-order bonuses, **Local Standing**
  (+3 % per level), council FXP ×1.5.
- **City opinion written** to the Coalport meter (persuasion rules of §14.2; no drift).
- **Levels** applied (multi-level), **stat points** placed with one tap (result modal, HUD badge, Me tab); **FXP → Rank**
  (Rank 2 at 400) with faction titles; **Political Capital** stored and shown.
- **Jobs:** take (free) and switch (2 Energy, streak to 0) at the job's location; half pay at every 00:00 UTC boundary;
  the shift once a day; streak bonus; 2 sick days refilled on Mondays — all lazy.
- **The City Day, lazily per character** (ADR 0005): salary, streak, the day's paper, the day's orders, the Today tally.
- **Morning Paper v1:** *The Coalport Clarion* — up to 3 headlines (≤ 2 personal, then city, then ambient), **Party
  orders**, **Your desk**.
- **Party orders** from Petra Holm: faction-wide, 3 slots rotated by day number, +25 % FXP on matching attempts, +20 FXP per
  order, +5 PC for all three (ADR 0009).
- **The Today tally** (§3.7) on the city screen and as *Yesterday* on the desk.
- **Client:** app shell (HUD v2, bottom tab bar: Map, Paper, Me live; Dossier and Faction shown disabled), map screen,
  location sheet, result modal v2, Paper tab, Me tab.
- **Art pipeline** (ADR 0007): two Coalport maps, Holm's portrait, two scenes.
- A read-only **playtest report** that answers the slice question with numbers.

**Out** (§17): opinion drift, ×5, weather, Issues, Health, other cities and travel, tier-2 missions, Heat, presence, the
Faction Chair, the welcome edition, bar buffs, lodging, Market trader, Remote Work, an analytics service.

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| What is "a day"? | `dayKey(now)` = whole days since 1970-01-01 UTC (GDD §2.2: 00:00 UTC). Weeks start Monday. The order rotation counts from 2026-01-01 on the same key | ADR 0005, §3 |
| Who rolls the day over? | Nobody on a schedule. **First touch of a new day settles it** in one transaction | ADR 0005, §7.3 |
| Missed salary | **Accrues** per boundary crossed (§9.1 "a week away banks seven half-pays"); credited at settlement, shown on the desk; no claim tap | ADR 0005 |
| ×3 | One request, one key, one transaction, **one seed stream**; rows resolved in order against evolving Energy, Rested, Standing, orders and (training) stat | ADR 0006 |
| ×3 short of Energy | **Disabled** in the client (cost from the view) and **refused** by the server; nothing spent | ADR 0006 |
| The "2 of 3" stamp | `stamp: 'mixed'` + `successes` of `times`; success text if ≥ 1 success. Shifts stamp *Shift worked*, training *Trained* | ADR 0006, §9 |
| Rested | Already lazy (slice 0). Spent per row, per Energy point; applies to XP and Iron of checked actions and to training XP; **not consumed by shifts or job switches** (nothing for it to boost) | §6 |
| Local Standing | Embedded array `localStanding: [{ cityId, successes }]`; +1 per **Success of a checked action**; thresholds 10 / 30 / 70 / 150; bonus in every check breakdown | §5.1, §6 |
| Level-ups | From cumulative XP after every write; `statPointsPending += levels gained`; one tap per point (STR or INT) | §6, §7.6 |
| FXP / Rank / PC | `rank` stored (derived, Rank 2 = 400 FXP), shown with the faction's title; `pc` stored, capped 1,000 | §5.1 |
| Party orders | **Computed** from content + day number (faction-wide); per-player progress **embedded** in `characters.orders`; no `directives` collection until the Chair (slice 7) | ADR 0009, §11 |
| City opinion | **Written** in the action transaction with `applyPersuasion` (Neutral first, floors 5 % / home 50 %, thousandths); no drift | ADR 0010 |
| Morning Paper | Generated at settlement into `paperEntries` (resolved text + a snapshot of level/rank/standing for "rose since last paper") | §10 |
| Today tally | Embedded `today` on the character, reset at settlement | §5.1 |
| Non-action mutations | `requestLogs` + idempotency key (take a job, place a stat point) | ADR 0008 |
| Art | `sharp` script → AVIF + WebP at fixed widths; generated files committed, sources not | ADR 0007, §13 |
| Scheduled jobs | **None** in slice 1 | §8 |

---

## 3. Time: the City Day

### 3.1 Day key and clock

- `packages/rules/src/day.ts`: `dayKey(now)`, `dayStart(day)`, `weekKey(day)` (Monday-based), `weekday(day)`,
  `cityDayIndex(day) = day − DIRECTIVES.epochDay` (days since 2026-01-01, for rotations), `isNight(now)` (20:00–06:00 UTC,
  §2.2; cosmetic).
- Every view carries `serverNow`; the client keeps `skew = serverNow − Date.now()` and uses `Date.now() + skew` for
  countdowns, `isNight` and "orders reset in …", so a wrong phone clock never shows the wrong day or night.

### 3.2 What settles, and when

`ensureSettled(characterId, now)` runs at the start of every character-scoped procedure (§7.3). If
`day.settled === dayKey(now)` it does nothing. Otherwise, in one transaction:

| Thing | Rule | GDD |
|---|---|---|
| **Salary** | Every 00:00 boundary since `day.settled` while a job is held pays `roundHalfUp(pay × 0.5)` (Factory worker, Collective: 108) | §9.1 |
| **Sick days** | The allowance is 2 per week, refilled at each Monday boundary crossed | §9.1 |
| **Streak** | Each ended day without a shift spends a sick day (streak unchanged); with none left the streak goes to 0 (default: only while a streak is running, §19 Q1). Early exit at 0 | §9.1 |
| **Tally** | `today` becomes "last played" (for the desk's *Yesterday* and the headlines); a fresh `today` starts | §3.7 |
| **Orders** | Today's three orders are computed (`ordersForDay`); progress starts at 0 with the variant frozen (no job → *Take a job*) | §13.7 |
| **Paper** | Today's edition is generated and stored | §3.3 |
| **Rested banked** | `projectEnergy(now).rested − stored rested`, reported on the desk (nothing written: Energy stays lazy) | §6.3 |

A brand-new character has `day.settled = null`: its first touch makes the first edition (`firstEdition: true`, the
`hl.first-day` headline) and pays nothing.

---

## 4. Content (`packages/content`)

Extends slice 0's schemas. Rules-owned **types** for the order-match and headline-condition DSLs are declared in
`packages/rules/src/types.ts`, and the Zod schemas are checked against them (`satisfies z.ZodType<…>`), as with `FACTION_IDS`.

### 4.1 Changed schemas

```ts
ActionType   = z.enum(['canvass','speech','propaganda','intelligence','council','training','job'])   // + council

// An action is one of three kinds (a union on `type`):
CheckedAction = { id, name, tier: z.literal(1), type: z.enum(['canvass','speech','propaganda','intelligence','council']),
                  stats: z.union([z.tuple([StatKey]), z.tuple([StatKey, StatKey])]),   // two-stat checks average (§8.4); replaces `stat`
                  energy: z.int().min(3).max(15),                                      // intelligence 3–4, speech 12 (§13.3)
                  givesFxp: z.boolean(), givesOpinion: z.boolean(),
                  requires: z.strictObject({ level: z.int().min(1).optional(), standing: z.int().min(0).max(4).optional() }).optional(),
                  text: { success: OutcomeText, partial: OutcomeText } }
TrainingAction = { id, name, tier: 1, type: z.literal('training'), trains: z.enum(['str','int','agi']),   // CHA is never trained
                   text: { success: OutcomeText } }                                     // cost is 20 + 2 × stat at runtime
ShiftAction    = { id, name, tier: 1, type: z.literal('job'), jobId: JobId, text: { success: OutcomeText } }   // Energy from the job

Location = { ...slice 0, map: z.strictObject({ x: Fraction, y: Fraction }) }    // fractions of the map image; pin number = index + 1
City     = { ...slice 0, map: z.strictObject({ day: AssetId, night: AssetId }),
             paper: z.strictObject({ name: z.string(), strapline: z.string(), price: z.string() }) }   // "The Coalport Clarion"
Faction  = { ...slice 0, rankTitles: z.array(z.string().min(1)).length(7),         // §5.4, index 0 = Rank 1
             secretary: z.strictObject({ npcId: NpcId, signature: z.string() }).optional() }   // Holm, "— P.H."
```

The slice-0 Mill Gate canvass moves from `stat: 'int'` to `stats: ['int']`.

### 4.2 New top-level sections

```ts
Asset        = { id: AssetId /* 'map.coalport.day' */, kind: z.enum(['map','scene','portrait']), source: z.string(),
                 width: int, height: int, widths: z.array(int).min(1), alt: z.string().max(160),
                 flatten: HexColour.optional(), crop: { left, top, width, height }.optional() }          // ADR 0007
SceneBinding = { locationKind: LocationKind, factionId: FactionId.optional(), assetId: AssetId }      // §13.5 rung 2

Npc          = { id: NpcId, name: string, title: string, factionId: FactionId.optional(), cityId: string.optional(), portrait: AssetId }
StandingLevels = z.array(z.strictObject({ name: z.string() })).length(5)       // Stranger … One of Us; thresholds live in rules

Job          = { id: JobId, name, locationId: LocationId, shiftActionId: ActionId,
                 unlock: { level: z.int().min(1), stats: z.partialRecord(StatKey, z.int()).optional() },   // "Level 3, AGI 10"
                 shiftEnergy: z.int().min(3).max(8), dailyPay: z.int().min(1),                              // pinned per job (§9.2)
                 factionPayBonus: z.partialRecord(FactionId, z.number().min(0).max(1)).optional(),          // { collective: 0.2 } → 216
                 blurb: z.string().max(160) }

OrderMatch   = z.strictObject({                                             // AND of the fields present; at least one field
                 actionTypes: ActionType[].optional(), actionIds: ActionId[].optional(), locationIds: LocationId[].optional(),
                 cityId: z.union([z.literal('home'), CityId]).optional(),
                 kinds: z.array(z.enum(['checked','training','shift','takeJob'])).optional() })
OrderTemplate = { id, factionId: FactionId, slot: z.enum(['A','B','C']),     // rotation order = order in the file, per slot
                  title: z.string().max(60), line: z.string().max(140),     // Holm's line
                  match: OrderMatch, target: z.int().min(1), counts: z.enum(['attempts','successes']),
                  noJob: z.strictObject({ title, line, match: OrderMatch, target: z.int().min(1) }).optional() }   // dir.work-shift

HeadlineCondition = z.discriminatedUnion('kind', [                           // AND; [] = always. Closed list, evaluated in rules
                 { kind: 'firstEdition' }, { kind: 'rankRose' }, { kind: 'levelRose' }, { kind: 'standingRose' },
                 { kind: 'ordersAllDoneYesterday' }, { kind: 'streakHitYesterday', values: z.array(z.int()).min(1) },
                 { kind: 'daysSinceLastPaper', min: z.int().min(1) }, { kind: 'idleYesterday' }, { kind: 'noPersonal' },
                 { kind: 'homeShare', min: z.number().optional(), max: z.number().optional() } ])
HeadlineTemplate = { id, cityId: CityId, group: z.enum(['personal','city','ambient']), priority: z.int().default(0),  // lower first
                 when: z.array(HeadlineCondition).default([]),
                 headline: z.string().max(80), deck: z.string().max(200).optional() }                                // 1–2 lines

Content = { ...slice 0, art: { assets: Asset[], scenes: SceneBinding[] }, npcs: Npc[], standingLevels, jobs: Job[],
            orderTemplates: OrderTemplate[], headlines: HeadlineTemplate[] }
```

**Text placeholders**, resolved on the server when the edition is generated (never in the client): `{name}` `{level}`
`{rank}` (title) `{energyYesterday}` `{standing}` (level name) `{bonus}` `{days}` `{iron}` `{share}` (one decimal) `{streak}`
`{ordersTitle}` `{ordersLine}` (today's slot-A order). The loader rejects any other `{…}`.

**Transcription notes** (content §6–§7 → this schema): `hl.streak` becomes two templates (`streakHitYesterday: [5]` and
`[10]`, "Five" / "Ten" in the text); `hl.morale` becomes three `city` templates with `homeShare` bands (≥ 80, 60–79.999,
< 60); `hl.orders-call` has `when: [{ kind: 'noPersonal' }]`; the ambient pool is ten `ambient` templates (headline only).
`dir.work-shift` has `match: { kinds: ['shift'] }` and `noJob: { title: 'Take a job', match: { kinds: ['takeJob'] }, target: 1 }`;
`dir.sharpen-up` is `{ kinds: ['training'] }`; `dir.full-day` is `{ kinds: ['checked'], cityId: 'home' }` counting successes.

### 4.3 Loader cross-checks (added to `parseContent`)

- Every `AssetId` referenced (city maps, NPC portraits, scene bindings) exists, with the right `kind`.
- City ids contain no `.`; `map.x/y` in 0..1; no two hotspots of a city closer than 0.03 (tap targets).
- A `ShiftAction`'s `jobId` names a job whose `locationId` is the action's location and whose `shiftActionId` is that
  action (both directions). `unlock.stats` keys are stats.
- A faction's `secretary.npcId` is an NPC of that faction. For each faction with a secretary: slots A, B and C each have
  ≥ 1 template of that faction. `OrderMatch` ids exist; a `cityId` other than `'home'` is loaded.
- For each city with a paper: ≥ 1 `ambient` headline (an edition always fills to 3). Placeholders are from the allowed list.
- `standingLevels` has 5 entries; `rankTitles` has 7.

### 4.4 Data

**T7 transcribes `docs/design/slice-1-content.md` into `packages/content`**: Coalport's 6 locations with x/y, the 21 actions
and their text, the 3 jobs, standing names, Petra Holm, the 12 order templates, the Clarion and its headlines, the rank
titles (§5.4) and the art catalogue. T6 only migrates the slice-0 data to the new schema, so every task stays green.

---

## 5. Data model (`packages/db`)

### 5.1 `characters` — new embedded fields

```ts
{
  ...slice 0,
  statPointsPending: number,          // §5.3: +1 per level; placed on STR or INT; never expires
  rank: number,                       // 1..7, denormalised from fxp (§5.4) — slice 3 queries "Rank 2+" on it
  pc: number,                         // Political Capital, 0..1000 (§6.5)
  localStanding: Array<{ cityId: string, successes: number }>,        // §13.4
  job: null | { id: string, since: DayKey, streak: number, lastShiftDay: DayKey | null },
  sickDays: { week: number /* weekKey */, left: number },              // per character: survives a job switch (§9.1 refill Monday)
  day: { settled: DayKey | null },                                     // ADR 0005
  orders: { day: DayKey, items: Array<{ templateId: string, variant: 'main' | 'noJob', target: number,
                                         progress: number, doneAt: Date | null }>, allDoneAt: Date | null },   // ADR 0009
  today: { day: DayKey, energy, attempts, successes, xp, fxp, iron, pc, opinion: number,
           ordersDone: number, shiftWorked: boolean, statTrained: number },                                  // §3.7
  lastActionAt: Date | null,          // drives "paper due after 3 h" (§10.1)
}
```

- **Differences from plan §5 row 1**, on purpose: `localStanding` is an array (ids are never field names; multikey-indexable
  later); `job` keeps `since` and moves sick days to `sickDays` (a weekly allowance, not a job property); orders are embedded
  instead of a `directives` collection (ADR 0009); `pc`, `statPointsPending`, `day`, `orders`, `today`, `lastActionAt` are
  added because slice 1's rules need them.
- **Max HP is not stored.** +5 per level is `maxHealth(level)` in rules when Health arrives (slice 5); storing it would
  duplicate `level`.
- `today`, `orders` and `localStanding` are written whole with `$set` under the version guard, so arrays are safe. No new
  index (reads are by `_id` / `userId`).
- **Migration** `packages/db/src/migrations/001-slice1-character-fields.ts`, run by `ensureIndexes()` at start-up:
  `updateMany({ statPointsPending: { $exists: false } }, { $set: defaults })`. Idempotent (`lean()` reads don't apply schema
  defaults, and dev databases have slice-0 characters).

### 5.2 `cities` — now written

`opinion` is `$set` by action transactions (ADR 0010). No new fields; no drift in slice 1.

### 5.3 `actionLogs` — fields added

`kind: 'checked' | 'training' | 'shift'`, `times: 1 | 3`, `txAttempts: number` (how many times the transaction callback ran;
the playtest report uses it to measure contention on the city document). `outcome` becomes the stamp (`success`, `partial`,
`mixed`, `worked`, `trained`). `seed` is generated for every kind (unused by training and shifts) so the schema stays uniform.
Indexes unchanged.

### 5.4 `paperEntries` — one edition per character per day (own collection: grows daily; history for later digests)

```ts
{
  _id, characterId, day: DayKey, cityId: string, firstEdition: boolean,
  headlines: Array<{ templateId, group: 'personal'|'city'|'ambient', headline: string, deck?: string }>,   // resolved text, ≤ 3
  desk: {                                                     // facts of the settlement, frozen; live rows are added at read (§10.3)
    salary: { jobId, jobName, days, perDay, total } | null,
    streak: { before, after, sickDaysUsed, broken: boolean } | null,
    restedBanked: number, daysSinceLastPaper: number | null,
    yesterday: TallySnapshot | null,                           // the last played day's tally, if it was yesterday
  },
  snapshot: { level: number, rank: number, standingLevel: number },   // for "rose since last paper" next time
  readAt: Date | null, createdAt
}
```
Index: `{ characterId: 1, day: 1 }` **unique** (the settlement's idempotency; the previous edition is read backwards on it).

### 5.5 `requestLogs` — idempotency for non-action mutations (ADR 0008)

`{ characterId, idempotencyKey, kind: 'job.take' | 'stat.place', inputHash, result: Mixed, createdAt }`.
Indexes: `{ characterId: 1, idempotencyKey: 1 }` unique; `{ createdAt: 1 }` TTL 7 days.

`ensureIndexes()` gains `PaperEntry` and `RequestLog`.

---

## 6. Rules (`packages/rules`) — pure, no I/O

### 6.1 Constants (additions and changes)

```ts
export const CITY_DAY   = { ms: 86_400_000, utcOffsetMs: 0 } as const;                     // §2.2: 00:00 UTC
export const DAY_NIGHT  = { dayFromHour: 6, nightFromHour: 20 } as const;                  // §2.2: night 20:00–06:00 UTC
export const STANDING   = { thresholds: [0, 10, 30, 70, 150], bonusPerLevel: 3 } as const; // §13.4, §8.4
export const RANK_FXP   = [0, 400, 2_000, 6_000, 15_000, 25_000, 60_000] as const;        // §5.4 (Rank 2 = 400)
export const LEVEL_UP   = { statPoints: 1 } as const;                                      // §5.3
export const PC         = { cap: 1_000 } as const;                                         // §6.5
export const FXP_TYPE_MULTIPLIER = { council: 1.5 } as const;                              // §13.3
export const TRAINING   = { baseCost: 20, costPerPoint: 2, xpRateShare: 0.5 } as const;   // §8.5: 20 + 2 × stat; 2.25 XP/E
export const JOBS       = { salaryShare: 0.5, streakPerDay: 0.02, streakCapDays: 10,
                            sickDaysPerWeek: 2, switchEnergy: 2 } as const;                // §9.1
export const DIRECTIVES = { matchFxpBonus: 0.25, orderDoneFxp: 20, allDonePc: 5,
                            epochDay: 20_454 /* dayKey(2026-01-01) */ } as const;          // §15.4, §13.7
export const OPINION_FLOORS = { neutral: 5, homeFaction: 50 } as const;                    // §14.2
export const PAPER      = { dueAfterAbsenceMs: 3 * 3_600_000, personalMax: 2, headlines: 3 } as const;   // §3.3
export const REPEAT     = { allowed: [1, 3, 5] } as const;                                 // §13.1 (the API allows 1 | 3)
```
(`epochDay` is asserted by a test against `dayKey(Date.UTC(2026, 0, 1))`.)

### 6.2 New and changed functions

```ts
// day.ts
export type DayKey = number;
export function dayKey(now: number): DayKey;   export function dayStart(day: DayKey): number;
export function weekKey(day: DayKey): number;  export function weekday(day: DayKey): Weekday;
export function cityDayIndex(day: DayKey): number;          // day − DIRECTIVES.epochDay
export function isNight(now: number): boolean;

// check.ts (changed): one or two stats
export function computeCheck(i: { stats: [StatKey] | [StatKey, StatKey]; values: Stats; difficulty: number;
                                  bonuses?: CheckBonus[] }): CheckBreakdown;
//   statValue = average of the stats (§8.4); CheckBreakdown gains `stats` and `statValues`, keeps `statValue`.
//   (2 + 12) / 2 = 7 → 46 %; a .5 average still gives a whole chance because 4 × 0.5 = 2.

// energy.ts (changed): works on a plain state so rows can chain spends
export function spendEnergy(s: EnergyState, cost: number, opts?: { useRested?: boolean /* default true */ }): SpendResult;

// standing.ts
export interface StandingView { level: 0|1|2|3|4; successes: number; floor: number; next: number | null; bonus: number }
export function standingView(successes: number): StandingView;
export function standingBonus(successes: number, label: string): CheckBonus | null;    // null at Stranger

// rank.ts / progress.ts
export function rankForFxp(fxp: number): number;
export interface Progress { xp; level; fxp; rank; pc; statPointsPending }
export function applyGains(p: Progress, g: { xp: number; fxp: number; pc: number }):
  { next: Progress; levelUp: { from; to; statPoints } | null; rankUp: { from; to } | null };   // pc capped; never down

// rewards.ts (changed)
export function computeRewards(i: { tier: 1; energy: number; outcome: Outcome; givesFxp: boolean; givesOpinion: boolean;
  restedUsed: number; fxpRateMultiplier?: number /* council 1.5 */; fxpBonusShare?: number /* order match 0.25 */ }): Rewards;
//   the order bonus is on the attempt's base FXP, rounded as its own `bonus` (§15.4: a 6-FXP canvass shows "+2 party order")

// opinion.ts
export function applyPersuasion(shares: OpinionShares, i: { factionId: FactionId; swing: number;
                                homeFactionId?: FactionId }): { shares: OpinionShares; applied: number };
//   integer thousandths; Neutral first down to 5; then rivals in proportion to their shares, never the home faction below 50
//   in its home city; the swing shrinks to what can be drawn; the sum stays 100.000 (§14.2)

// training.ts
export function trainingCost(statValue: number): number;                        // 20 + 2 × stat
export function resolveTraining(i: { trains: 'str'|'int'|'agi'; base: { str; int; agi }; energy: EnergyState; now: number;
                                     times: 1 | 3 | 5; orders: OrdersState; descriptor: ActionDescriptor }): TrainingResult;
//   rows at rising costs (INT 12: 44, 46, 48 → 138 for ×3); refuse if Energy < the total; XP = 2.25 × cost + Rested
//   bonus per Energy point; no Iron, FXP, opinion or Standing; each row +1 stat and one 'training' order match

// jobs.ts
export interface JobState { id: string; since: DayKey; streak: number; lastShiftDay: DayKey | null }
export interface SickDays { week: number; left: number }
export function jobPay(job: { dailyPay; factionPayBonus? }, factionId: FactionId): number;   // 180 → 216 for the Collective
export function shiftPay(pay: number, streakCountingToday: number): { half: number; bonus: number; pct: number; total: number };
//   half = roundHalfUp(pay × 0.5); pct = 0.02 × min(streak, 10); bonus = roundHalfUp(pay × pct)   (216 at streak 10: 108 + 43)
export function jobLock(unlock: { level; stats? }, c: { level: number; stats: Stats }): { reason: 'LEVEL'|'STAT'; stat?; need } | null;
export function settleDays(i: { settled: DayKey | null; today: DayKey; job: JobState | null; pay: number | null;
  sickDays: SickDays; tally: DailyTally; energy: EnergyState; now: number }): Settlement | null;      // null if nothing to do
export interface Settlement { day; firstEdition; daysSince: number | null;
  salary: { days; perDay; total } | null; job: JobState | null; sickDays: SickDays;
  streak: { before; after; sickDaysUsed; broken } | null; lastPlayed: DailyTally | null; today: DailyTally; restedBanked: number }
export function resolveShift(i: { job: JobState; today: DayKey; pay: number; shiftEnergy: number; energy: EnergyState;
                                  now: number; orders: OrdersState; descriptor: ActionDescriptor }): ShiftResult;
//   SHIFT_ALREADY_WORKED if lastShiftDay === today; NOT_ENOUGH_ENERGY; else streak + 1, lastShiftDay = today,
//   Energy spent without Rested, Iron = shiftPay(...).total, no XP/FXP/Standing; one 'shift' order match

// orders.ts (ADR 0009)
export type ActionKind = 'checked' | 'training' | 'shift' | 'takeJob';
export interface ActionDescriptor { kind: ActionKind; actionId?: string; type?: string; locationId?: string; cityId?: string }
export interface OrderItem { templateId: string; variant: 'main' | 'noJob'; target: number; progress: number; doneAt: number | null }
export interface OrdersState { day: DayKey; items: OrderItem[]; allDoneAt: number | null }
export function ordersForDay(templates: OrderTemplate[] /* one faction */, day: DayKey): [OrderTemplate, OrderTemplate, OrderTemplate];
//   A[i mod |A|], B[i mod |B|], C[i mod |C|] with i = cityDayIndex(day)
export function startOrders(templates, day: DayKey, hasJob: boolean): OrdersState;
export function orderMatches(m: OrderMatch, a: ActionDescriptor, homeCityId: string): boolean;
export function advanceOrders(o: OrdersState, templates, a: ActionDescriptor, outcome: Outcome, homeCityId, now): {
  orders: OrdersState; advanced: OrderItem | null; completed: OrderItem | null; allDone: boolean };
//   the first open item that matches advances by 1 (successes-only items only on Success); one row advances at most one item

// tally.ts
export interface DailyTally { day: DayKey | null; energy; attempts; successes; xp; fxp; iron; pc; opinion;
                              ordersDone: number; shiftWorked: boolean; statTrained: number }
export function currentTally(t: DailyTally, today: DayKey): DailyTally;       // zeros when t.day !== today
export function addToTally(t: DailyTally, today: DayKey, delta: Partial<DailyTally>): DailyTally;

// paper.ts
export interface PaperFacts { firstEdition; rankRose; levelRose; standingRose; ordersAllDoneYesterday;
  streakHitYesterday: number | null; daysSinceLastPaper: number | null; idleYesterday: boolean; homeShare: number }
export function selectHeadlines(templates: HeadlineTemplate[] /* one city */, facts: PaperFacts, day: DayKey): HeadlineTemplate[];
//   personal: eligible, by priority, ≤ 2 · then city: eligible ('noPersonal' true iff no personal picked), by priority,
//   while < 3 · then one ambient: ambient[cityDayIndex(day) mod n] while < 3. Deterministic; no RNG
export function fillTemplate(text: string, vars: Partial<Record<Placeholder, string>>): string;
export function isPaperDue(i: { editionReadAt: number | null; lastActionAt: number | null; now: number }): boolean;
//   unread today's edition, or now − max(readAt, lastActionAt) ≥ 3 h (§3.3)
```

### 6.3 `resolveTier1Action` v2 (checked actions, ×N, ADR 0006)

```ts
export interface Tier1ActionInput {
  action: { id; type; locationId; cityId; energy; stats: [StatKey] | [StatKey, StatKey]; givesFxp; givesOpinion };
  cityRole: CityRole; values: Stats; energy: EnergyState; now: number; times: 1 | 3 | 5;
  standing: { successes: number; names: readonly string[]; cityName: string };   // bonus label "Known in Coalport"
  orders: OrdersState; orderTemplates: OrderTemplate[]; homeCityId: string;
  bonuses?: CheckBonus[];                                                        // items, weather: later slices
}
export interface Tier1Attempt extends ActionAttempt { rewards: Rewards; restedUsed: number; orderId: string | null }
export interface Tier1Resolution {
  seed; times; attempts: Tier1Attempt[]; summary: { stamp: 'success'|'partial'|'mixed'; successes: number };
  energy: { before: EnergyProjection; after: EnergyState; cost: number; restedUsed: number };
  rewards: Rewards;                                                 // per-line sums of the rows (opinion: sum, 3 dp)
  standing: { before: number; after: number };                      // successes
  orders: { before: OrdersState; after: OrdersState; completed: string[]; allDone: boolean };
}
export type ResolveResult = { ok: true; resolution: Tier1Resolution }
  | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; shortBy: number; cost: number; energy: EnergyProjection };
```
Project once; refuse if `value < times × energy`; for each row: spend (Rested per row) → `computeCheck` with
`standingBonus(successes)` → `roll100()` → outcome → matching open order? → `computeRewards` (council multiplier, +25 % if the
row advances an open order) → Success: `successes += 1` → `advanceOrders`. Same seed and input ⇒ identical resolution.
The order completion FXP (+20 each) and the +5 PC are returned as `orders.completed` / `allDone` and added by the caller
through `applyGains`, so the FXP tile stays the sum of the rows.

### 6.4 Tests (Vitest, `packages/rules/test`)

- **day:** `dayKey` at 23:59:59.999 and 00:00 UTC; `weekKey` Sunday → Monday; `epochDay` = `dayKey(2026-01-01)`; `isNight` at
  05:59 / 06:00 / 19:59 / 20:00.
- **check:** single stat unchanged (66 %); CHA+INT 46 %, CHA+STR 42 % for the recruit (content §2.2); Known +6 → 72 %.
- **standing / rank / applyGains:** levels at 9/10/29/30/69/70/149/150; Rank 2 at 400; 149 XP + 1,000 → Level 4 and 3 points;
  PC cap.
- **rewards:** council 10 E → 9 / 5 FXP; order bonus on a 6-FXP canvass = 2 (1.5 → 2) and on a Partial 3 → 1; slice-0
  numbers unchanged (45/6/20, 23/3/10, 68/6/30 with full Rested).
- **opinion:** Coalport 9/70/6/15 + 0.05 → Collective 70.05, Neutral 14.95; Neutral at 5 draws from Vanguard and Alliance
  9:6; Collective capped at 95; a rival persuading in Coalport never takes the Collective below 50; sums exactly 100.
- **×3:** Energy 100 → 70; 25 Energy refused with `cost: 30`, nothing spent; Rested 15 → rows use 10/5/0 with XP bonus
  23/11/0 on Successes; Standing 9 → a Success on row 1 gives row 2 +3 %; an order at 1/2 gets the +25 % on the next matching
  row only; stamp `mixed`, `successes: 2`; seed replay reproduces the object.
- **training:** INT 12 ×1 = 44 E, 99 XP, INT 13; ×3 = 138 E, INT 15; 137 E refused; Rested on XP only.
- **jobs:** `shiftPay(216, 1)` = 108 + 4; `(216, 10)` = 108 + 43; `(216, 14)` = 108 + 43. `settleDays`: first touch pays
  nothing; one boundary with a shift yesterday; one without (1 sick day); 3rd missed day in a week breaks; a Monday refill
  between misses keeps the streak; 8 days away pays 8 × 108, streak 0, job kept; `restedBanked`.
- **orders:** `ordersForDay` rotation matches content §6.2 for three consecutive days and never repeats a set on consecutive
  days over 60 days; variant frozen; `takeJob` completes the `noJob` variant; `full-day` counts Successes only.
- **paper:** the three layouts (2 personal + city; 1 personal + city + ambient; 0 personal + morale + orders-call); each
  condition kind; placeholders; `isPaperDue` at 2 h 59 and 3 h.

---

## 7. API (`apps/server`)

### 7.1 Procedures

All `protectedProcedure`; every mutation input has `idempotencyKey: z.uuid()` except `paper.markRead`.

```ts
character.me             ()                                         → CharacterView (v2)
character.placeStatPoint ({ stat: z.enum(['str','int']), idempotencyKey })       → CharacterView
    // PRECONDITION_FAILED NO_STAT_POINTS · CONFLICT KEY_REUSED

city.get                 ({ cityId })                               → CityView (v2)

action.perform           ({ actionId, locationId, idempotencyKey, times: z.union([z.literal(1), z.literal(3)]) })  → ActionResult (v2)
    // checked, training and shift actions (a shift is ×1 only)
    // NOT_FOUND UNKNOWN_ACTION / UNKNOWN_LOCATION · BAD_REQUEST WRONG_CITY / SHIFT_IS_ONCE ·
    // PRECONDITION_FAILED NOT_ENOUGH_ENERGY { energy, cost, times, nextTickAt } / ACTION_LOCKED { reason, need } /
    //                     NOT_YOUR_JOB { jobId } / SHIFT_ALREADY_WORKED { nextAt } · CONFLICT ACTION_CONFLICT / KEY_REUSED

job.take                 ({ jobId, idempotencyKey })                → { character: CharacterView; job: JobView }
    // NOT_FOUND UNKNOWN_JOB · BAD_REQUEST WRONG_CITY / ALREADY_IN_JOB · PRECONDITION_FAILED JOB_LOCKED { reason, need } /
    // NOT_ENOUGH_ENERGY (switching) · CONFLICT KEY_REUSED

paper.today              ()                                         → PaperView
paper.markRead           ({ day: z.int() })                         → { readAt: number }     // no-op if already read
```

`GameErrorReason` gains `ACTION_LOCKED`, `KEY_REUSED`, `NO_STAT_POINTS`, `UNKNOWN_JOB`, `JOB_LOCKED`, `ALREADY_IN_JOB`,
`NOT_YOUR_JOB`, `SHIFT_ALREADY_WORKED`, `SHIFT_IS_ONCE`. `DAY_CHANGED` is internal and never leaves the server.

### 7.2 Views

```ts
interface CharacterView {                       // slice 0 fields unchanged, plus:
  serverNow: number; day: { key: DayKey; endsAt: number };
  rank: { value: number; title: string; fxpFloor: number; fxpNext: number | null };
  pc: number; statPointsPending: number;
  job: JobView | null; sickDaysLeft: number;
  standing: StandingView & { cityId: string; name: string };          // current city: "Familiar · 14 / 30 to Known"
  today: DailyTally;                                                  // currentTally(...)
  orders: OrdersView;
  paperDue: boolean;
}
interface JobView { id; name; locationId; dailyPay /* with faction bonus */; shiftEnergy; streak;
                    shiftWorkedToday: boolean; nextShiftAt: number | null }
interface OrdersView { day: DayKey; resetsAt: number;
  issuer: { name: string; title: string; signature: string; portrait: AssetView };
  items: Array<{ id: string; title: string; line: string; progress: number; target: number; done: boolean }>;
  allDone: boolean; rewards: { matchFxpBonusPct: 25; orderDoneFxp: 20; allDonePc: 5 } }
interface CityView {                            // slice 0 fields, plus:
  map: { day: AssetView; night: AssetView }; isNight: boolean;
  opinion: OpinionShares;                       // now live
  standing: StandingView & { name: string };
  locations: Array<LocationView & { n: number; map: { x: number; y: number };
    actions: Array<{ id; name; type; kind: 'checked' | 'training' | 'shift';
      energy: number;                           // ×1 cost (training: live 20 + 2 × stat; shift: the job's)
      energy3: number | null;                   // ×3 total (training: rising sum); null for shifts
      preview: CheckBreakdown | null;           // checked only, incl. the Standing bonus
      trains?: { stat; from: number; to: number };
      shift?: { jobId; held: boolean; workedToday: boolean };
      order: { id; title; progress; target } | null;                 // "Party order 1 / 3 · +25 % FXP"
      locked: { reason: 'LEVEL' | 'STANDING'; need: number } | null }>;
    jobs: Array<{ jobId; name; blurb; pay: number; shiftEnergy; held: boolean;             // the location's Jobs card
                  locked: { reason: 'LEVEL' | 'STAT'; stat?: StatKey; need: number } | null; switchCost: number }> }> }
interface AssetView { id: string; width: number; height: number; widths: number[]; alt: string }
interface PaperView { day: DayKey; paper: { name; strapline; price }; dateline: { weekday: string; date: string; city: string };
  headlines: Array<{ group; headline; deck? }>; orders: OrdersView; desk: DeskView; readAt: number | null; due: boolean }
```

### 7.3 `dayService.ensureSettled` (ADR 0005)

```
1  c = Character.findById (lean); today = dayKey(now); if c.day.settled === today → return c
2  for attempt 1..3: transaction {
3    c = findById.session; if c.day.settled === today → return c            // someone else settled first
4    s = settleDays({ settled, today, job, pay: job && jobPay(content job, factionId), sickDays, tally: c.today, energy, now })
5    prev = PaperEntry.findOne({ characterId, day: { $lt: today } }).sort({ day: -1 }).session  // snapshot for "rose since"
6    home = City.findById(homeCityId).session                                                   // morale share for the paper
7    facts = paperFacts(c, s, prev, home);  headlines = selectHeadlines(content.headlines of the home city, facts, today)
8    orders = startOrders(content order templates of the faction, today, hasJob: s.job !== null)
9    updated = Character.findOneAndUpdate({ _id, version, 'day.settled': c.day.settled },
                 { $set: { 'day.settled': today, job: s.job, sickDays: s.sickDays, today: s.today, orders },
                   $inc: { iron: s.salary?.total ?? 0, version: 1 } })           → null ⇒ VersionConflict
10   PaperEntry.create([{ characterId, day: today, cityId, firstEdition, headlines (filled), desk, snapshot }], { session })
11 } catch VersionConflict | E11000 → continue (step 3 then returns the winner's state)
12 after 3 misses → CONFLICT ACTION_CONFLICT
```
`loadCharacter(ctx)` = `getOrCreateCharacter` (new defaults, `day.settled: null`) + `ensureSettled`. Every procedure uses it.

### 7.4 `action.perform` v2

As slice 0 §6 (ADR 0002), dispatching on the action's kind:

```
0  locate action; times ∈ {1,3} (shift: 1 only → SHIFT_IS_ONCE); c0 = loadCharacter; WRONG_CITY; ACTION_LOCKED
1  fast path: log = ActionLog.findOne({ characterId, idempotencyKey })
     → log.actionId !== actionId || log.times !== times ⇒ CONFLICT KEY_REUSED; else return log.result
2  txn (count callback runs → txAttempts):
     c = findById.session; today = dayKey(now); c.day.settled !== today ⇒ throw DayChanged
     checked:  r = resolveTier1Action(...); city = City.findById(cityId).session;
               op = applyPersuasion(city.opinion, { factionId, swing: r.rewards.opinion, homeFactionId })
     training: r = resolveTraining(...)
     shift:    job held and job.id === action.jobId else NOT_YOUR_JOB; r = resolveShift(...)
     !r.ok ⇒ GameError (NOT_ENOUGH_ENERGY { energy, cost, times, nextTickAt } / SHIFT_ALREADY_WORKED)
     g = applyGains(progress(c), { xp, fxp: rows' FXP + 20 × completed orders, pc: allDone ? 5 : 0 })
     tally = addToTally(currentTally(c.today, today), today, { energy, attempts, successes, xp, fxp, iron, pc,
                                                               opinion: op.applied, ordersDone, shiftWorked, statTrained })
     updated = Character.findOneAndUpdate({ _id, version: c.version, 'day.settled': today },
         { $set: { energy, rested, xp, level, fxp, rank, pc, statPointsPending, localStanding, orders, today: tally,
                   lastActionAt: now, (training) stats.<stat>, (shift) job },
           $inc: { iron, version: 1 } })                                     → null ⇒ VersionConflict
     checked: City.updateOne({ _id: cityId }, { $set: { opinion: op.shares } }, { session })
     result = buildActionResult(...)                                         // §9
     ActionLog.create([{ kind, times, seed, outcome: stamp, txAttempts, result, … }], { session })
   catch VersionConflict → retry · DayChanged → ensureSettled(now), retry · E11000 → stored result · GameError → TRPCError
```

### 7.5 `job.take`

`withRequestKey` (ADR 0008): settle; `UNKNOWN_JOB`; `WRONG_CITY` unless the job's location is in the character's city;
`ALREADY_IN_JOB`; `jobLock` → `JOB_LOCKED` (requirements checked on taking only, §9.1). A **switch** (`c.job !== null`)
spends 2 Energy without Rested and resets the streak. New `job = { id, since: today, streak: 0, lastShiftDay: c.job?.lastShiftDay ?? null }`
— the last shift day carries over, so "one shift per City Day regardless of job changes" holds. The same transaction
advances a `takeJob` order (the *Take a job* variant) and pays its +20 FXP. Version-guarded write.

### 7.6 `character.placeStatPoint`

`withRequestKey`: settle; `findOneAndUpdate({ _id, version, statPointsPending: { $gte: 1 } }, { $inc: { 'stats.<stat>': 1,
statPointsPending: -1, version: 1 } })`; otherwise `NO_STAT_POINTS`. STR or INT only (§5.3).

### 7.7 Paper

- **`paper.today`**: `loadCharacter`; today's `PaperEntry` (exists after settlement) + live desk rows (§10.3) + `OrdersView`
  + `due`.
- **`paper.markRead`**: `updateOne({ characterId, day, readAt: null }, { $set: { readAt: now } })`. Idempotent; not game
  state, so no version bump.

### 7.8 Test-only clock (Playwright)

`E2E_TEST_HOOKS=1` registers `POST /api/test/clock { advanceMs }`, adding to a process-wide offset used by `ctx.now`.
`env.ts` refuses to start with it unless `DB_MODE=memory`. Production never has it.

---

## 8. Scheduled jobs (Agenda)

**None in slice 1.** Every daily rule is stated per boundary crossed and settled lazily per character (ADR 0005, GDD §2.2);
nothing in slice 1 is a world event with a fixed time. The worker stays the slice-0 stub. The "secretary issues defaults by
06:00" rule (§15.4) needs no job: with no Chair, the orders exist from 00:00 as a function of the day. Opinion drift, when
it comes, can use the same lazy pattern on the city document (ADR 0010).

---

## 9. The result modal breakdown (GDD §13.1a), v2

Built in one place (`services/actionResult.ts`), stored verbatim in `actionLogs.result`, returned unchanged on retry.
Slice-0 fields keep their meaning; additions:

```ts
interface ActionResult {
  ...slice 0 (logId, idempotencyKey, performedAt, seed, place, headline, body, rewards, bonusTags, character),
  kind: 'checked' | 'training' | 'shift';
  action: { id; name; type; tier: 1; times: 1 | 3 };
  stamp: 'success' | 'partial' | 'mixed' | 'worked' | 'trained';   // 'mixed' renders "2 of 3"
  successes: number;
  art: { rung: 'scene'; asset: AssetView } | { rung: 'map-crop'; asset: AssetView; x: number; y: number };
  attempts: Array<ActionAttempt & { rewards: Rewards; restedUsed: number; orderId: string | null }>;   // checked rows
  rows: Array<{ index; label: string; detail: string }>;            // training / shift rows: "INT 12 → 13 · 44 Energy", "no roll"
  effects: {
    ...slice 0 (energy, rested, xp, fxp, iron, level),
    opinion: { cityId; factionId; delta /* requested swing */; applied: number; shareBefore: number; shareAfter: number } | null;
    standing: { cityId; cityName; before: StandingView & { name }; after: StandingView & { name } } | null;
    levelUp: { from; to; statPoints } | null;
    rankUp: { from; to; title } | null;
    pc: { before; after } | null;
    orders: Array<{ id; title; before; after; target; done: boolean; fxp: number /* 20 when done now */ }>;
    ordersAllDone: { pc: 5 } | null;
    stat: { stat; before; after } | null;                                                       // training
    shift: { half: number; streakBonus: number; streakPct: number; streak: { before; after }; sickDaysLeft: number } | null;
  };
  today: DailyTally;                                                // after this tap: the city screen's strip
  again: { cost1: number; cost3: number } | null;                   // live costs (training rises); null for shifts
}
```

- **1. Art and stamp:** the §13.5 ladder without story art: a **scene** bound to the location kind (and faction for
  `faction-hq`) — `union-hq` at the Union Hall, `bar-anchor` at The Anchor — else a **map crop** of the day or night map (by
  `isNight(performedAt)`) centred on the location's `map.x/y`. Chosen by a pure `pickArt()` in `services/art.ts`. Place,
  action and time; the stamp: *Success*, *Partial*, *2 of 3*, *Shift worked*, *Trained*.
- **2. What happened:** kicker "Canvass the shift change · 3 times"; headline and body from content (success text if
  `successes ≥ 1`; the single text for shifts and training).
- **3. How it went:** checked: one row per attempt — that attempt's chance bar, the roll marker, the outcome and "+45 XP";
  tap a row for its `CheckBreakdown` (Standing appears there as a bonus; two-stat checks show both stats and the average).
  Training and shifts: one row per attempt, "no roll".
- **4. Rewards:** four tiles — Experience, Faction XP, Iron, and Coalport (the swing, three decimals trimmed) — with `base`
  and `bonus` notes. Tags: *Rested: 20 of 30 Energy, +33 % XP and Iron* · *Party order: +25 % FXP* · *Known in Coalport +6 %*.
  A shift's Iron tile shows half pay and the streak bonus.
- **5. Knock-on effects:** Coalport "Collective 70.0 → 70.1 %"; Local Standing "Familiar · 27 / 30" or "Familiar → Known ·
  now +6 % here"; each order moved "Be at the gate 1 → 2 / 2 ✓ · +20 FXP"; "All three orders done: +5 Political Capital";
  "Level 3 → 4 · place your point: **STR** / **INT** · later" (the buttons call `character.placeStatPoint` and read
  `statPointsPending` live, so the stored result stays immutable); "Rank 2: Activist"; streak and sick days for a shift;
  Energy and Rested before → after.
- **6. Buttons:** Again ×1 (cost) · Again ×3 (cost; disabled below it, tooltip "×3 needs 30 Energy") · Continue. A shift
  modal has Continue only.

---

## 10. Morning Paper v1 (GDD §3.3)

### 10.1 When it shows

- `/` opens `/paper` when `character.me.paperDue` (today's edition unread, or 3 h since the later of the last action and the
  last read); otherwise the map. On window focus the app does not yank the player mid-flow: the Paper tab gets a dot and a
  one-line banner "The Clarion is in".
- Opening the Paper tab calls `paper.markRead(today)`. One tap dismisses ("To the city").

### 10.2 Sections

Masthead (*The Coalport Clarion* · strapline · "Morning edition · Price 5 marks" · dateline *{Weekday} · {date} · Coalport*,
§19 Q6) → **headlines** (the first as the lead, larger) → **Party orders** (Holm's portrait and name, three lines with
progress and her line, "+25 % FXP on matching actions · +20 FXP per order · +5 Political Capital for all three", signed
"— P.H.", resets at midnight UTC) → **Your desk**. Issues, Polling Day, Letters, In Print and Weather are later slices.

### 10.3 Your desk (content §7.3)

Frozen at settlement: **Salary**, {job} (half pay) +{n} Iron, or "no job yet" · **Rested banked** since last visit +{n} ·
**Work streak** · sick days · **Yesterday** (the tally). Live at read: **Energy** {n} / 100 · full at {hh:mm} · **Level**
{L} · {xp} XP to Level {L+1} · {pending} point(s) to place · **Coalport standing** {name} · {n} to {next}.

### 10.4 Headline selection

`selectHeadlines(templates of the home city, facts, day)` (§6.2) at settlement, with facts from the settlement, the previous
edition's `snapshot`, yesterday's orders and the home-city share. Resolved text is stored.

---

## 11. Party orders (GDD §13.7, §15.4; ADR 0009)

- **Issuer:** the faction's secretary (Petra Holm for the Collective). No Chair until slice 7.
- **Choice:** `ordersForDay` — slot A `A[i mod 5]`, slot B `B[i mod 4]`, slot C `C[i mod 3]` with `i` = City Days since
  2026-01-01; faction-wide; frozen into `characters.orders` at settlement with the variant (no job → *Take a job*).
- **Progress:** every row (checked, training or shift) and every job take is described as an `ActionDescriptor`; the first
  open item that matches advances by 1 (`successes` items only on Success).
- **Rewards:** +25 % of the row's base FXP when the row advances an open order (Partial included; not after the order is
  done, which is what the economy sheet's "up to +15 FXP a day from the match bonus" assumes); **+20 FXP** the moment an
  order's target is reached; **+5 PC** when all three are done. All in the same version-guarded write as the action.
- **Missed orders** lapse at midnight: nothing is taken away (§4.2).

---

## 12. Client (`apps/client`) and UI (`packages/ui`)

### 12.1 Routes and shell

| Route | Screen | Mockup |
|---|---|---|
| `/` | `character.me` → `/paper` if `paperDue`, else `/city/$cityId` | — |
| `/city/$cityId?loc=<locationId>` | Map + location sheet (`loc` in the URL, so a closed tab reopens the same sheet) | `City`, `MobileCity`, `MobileMission` |
| `/paper` | The Coalport Clarion | `MobilePaper` |
| `/me` | Level and stat points, rank, PC, job, standing, today, orders, sign out | — (minimal) |

`AppShell` (layout route): `HudBar` v2 on top, `TabBar` at the bottom (Map · Paper · Dossier · Faction · Me; Dossier and
Faction `aria-disabled` with "Soon"; a dot on Me when stat points wait, on Paper when due). Desktop ≥ 1024 px: the dock and
a one-line ticker from `City.dc.html` (today's slot-A order and the lead headline).

### 12.2 Map screen

- `CityMap` (ui): `<picture>` of the day or night map (AVIF/WebP `srcset` from `AssetView`, crossfade when `isNight` flips)
  with numbered hotspots positioned by `map.x/y` (44 px targets), the selected one highlighted, name tags on desktop. On
  phones inside `react-zoom-pan-pinch` (in the plan's stack), max zoom 2.5, initial view on the selected or first location.
- City plate: "Coalport · Home city · Collective 70.1 %", Standing "Familiar · 14 / 30 to Known"; a compact 3-line **orders**
  list; the **Today strip** "Today: 60 Energy · 5 wins · +240 XP · +32 FXP · +0.21 opinion" (content §5).
- **Location sheet** (`LocationSheet`: Radix Dialog as a bottom sheet on phones, side panel on desktop): pin number, kind,
  name, blurb; bonus tags (Rested +50 % XP and Iron while Rested > 0); **tickets**; the location's **Jobs card**.
- **Ticket v2** (ui): Energy stub, name, the chance (tap → `CheckBreakdownList`) or "no roll", tags line (type · order
  "Party order 1 / 3 · +25 % FXP"), **×1** and **×3** (×3 disabled below `energy3`, `aria-label` "…, three times, 30
  Energy"). Training shows the live cost and "INT 12 → 13". A shift ticket shows "worked — next shift after 00:00 UTC" once
  done, or "Take the job first" when not held. Locked tickets show "Level 3".
- **Jobs card:** each job here with pay, shift Energy, requirements and *Take the job* (free) / *Switch · 2 Energy · streak
  resets*; locked jobs visible with the missing requirement (the Driver's AGI 10 is the recruit's first training goal).
- **Out of Energy card** when projected Energy is below the cheapest ticket here: "+5 every 10 min · full at 17:40",
  "Rested banks once you're full", and what is waiting (open orders, the shift). Text to the designer (§19 Q7).
- `usePerformAction(times)`: one `crypto.randomUUID()` per tap (unchanged). On success `setQueryData(character.me)` and
  invalidate `city.get` (opinion, costs, order tags).

### 12.3 Result modal v2, Paper, Me, HUD

- **ResultModal** renders §9 (art header via `Picture` or a CSS map crop, "2 of 3" stamp, rows, tiles and tags, knock-on
  rows incl. the stat-point buttons, Again ×3 with its cost). The slice-0 "counted from slice 1" note is removed.
- **Paper tab:** `Masthead`, headlines, `OrdersList`, `DeskList`, "To the city".
- **Me tab:** name, crest, rank title and FXP bar; level and XP bar; STR / INT / AGI / CHA with "N points to place" and
  **+1 STR / +1 INT** (each its own key; disabled while pending); job card (pay, streak, sick days left, shift status, "Go to
  the Mill Gate"); Local Standing; Today; orders; sign out.
- **HUD v2:** crest, name, "Recruit · Lv 3", Energy (ticking), XP bar, Rested, Iron, PC (once > 0, GDD §26), a badge when
  stat points wait (tap → a small popover with STR / INT).

### 12.4 `packages/ui` additions

`CityMap`, `Hotspot`, `LocationSheet`, `Ticket` v2, `JobsCard`, `Stamp` v2, `ResultModal` v2, `TabBar`, `Picture` (AssetView →
`<picture>`), `ProgressBar`, `TodayStrip`, `OrdersList`, `Masthead`, `DeskList`, `StatPointsPanel`, `OutOfEnergyCard`. Plain
props; no tRPC or router imports (slice-0 rule). `artUrl(id, width, format)` → `/art/<id>-<width>.<format>`.

---

## 13. Art pipeline (ADR 0007)

| Step | What |
|---|---|
| Catalogue | `packages/content/src/data/art.ts`: `map.coalport.day` (`maps-pen/coalport.png`, RGBA → flatten `#EFE6D2`), `map.coalport.night` (`maps-pen/coalport-night.png`), `portrait.holm` (`mvp/portraits/holm.png`, 4:5 head-and-shoulders crop), `scene.union-hq` (`mvp/scenes/union-hq.png` → `faction-hq` + `collective`), `scene.bar-anchor` (`mvp/scenes/bar-anchor.png` → `bar`) |
| Script | `scripts/art/build.ts` (`pnpm art:build`, `tsx`), root dev dependency `sharp`; sources from `IRONGATE_ART_SRC` (default `E:/Projects/ironGateCity Docs/art-direction`); Lanczos; AVIF (q 55) and WebP (q 72); widths: maps 1280 / 2560, scenes 640 / 1280, portraits 256 / 512 |
| Output | `apps/client/public/art/<id>-<w>.avif|webp` + `.build.json` (source hash and settings per output, to skip unchanged) — **committed** |
| Budgets | per file as ADR 0007; the slice-1 set ≤ 5 MB (measured: both maps at both widths and formats ≈ 2.6 MB) |
| Serving | `apps/client/vercel.json`: `/art/(.*)` → `Cache-Control: public, max-age=31536000, immutable`; a changed image gets a new id |
| Check | `pnpm art:check` in CI: every catalogue id has all its files, within budget, without needing the sources |

---

## 14. Testing

| Layer | What |
|---|---|
| Rules | §6.4 |
| Content | the real data validates (21 actions, 6 locations, 3 jobs, 12 order templates, headlines); each §4.3 cross-check has a failing fixture |
| DB | new indexes (unique `paperEntries`, `requestLogs` + TTL); the migration is idempotent |
| Server (Vitest + memory replica set, `testClock`) | **×3:** Energy 100 → 70, one log with `times: 3`, 3 rows, Coalport's Collective share up by the applied swing and the sum still 100; same key twice → identical result, one log; `Promise.all` of 5 with one key → one log, Energy 70; 25 Energy → `NOT_ENOUGH_ENERGY { cost: 30, times: 3 }`, nothing spent; the same key with `times: 1` → `KEY_REUSED`; seed replay. **Opinion:** 5 concurrent canvasses by 5 characters → all commit (retries allowed), share up by the sum. **Training:** ×1 and ×3 costs and the stat; ×3 short refused. **Day:** new character → first edition and orders on the first `character.me`; `clock.advance(1 day)` → settles once (second call writes nothing); `Promise.all` of `character.me`, `paper.today`, `city.get` on a new day → **one** paper and salary credited **once**; an action straddling midnight counts on the new day. **Jobs:** first take free; switch −2 Energy, Rested untouched, streak 0; `JOB_LOCKED` for the Driver at AGI 5; shift pays 108 + 4 and is refused the second time that day, also after switching jobs; next day's shift → streak 2 and 108 + 9; 2 missed days in a week keep the streak, a 3rd breaks it; 8 days away → 8 × 108, job kept. **Orders:** a matching ×3 advances progress, +25 % only while open, +20 FXP on completion, +5 PC when all three are done, once (a retried key doesn't pay twice); taking a job completes *Take a job*. **Levels:** crossing two thresholds → level +2, 2 points; `placeStatPoint` twice with one key → one point; with 0 → `NO_STAT_POINTS`. **Paper:** `markRead` idempotent; `paperDue` false after read, true 3 h after the last action |
| UI | `ResultModal` fixtures: Success ×1, mixed ×3 with Rested + order + level-up, training, shift; `Ticket` ×3 disabled; `CityMap` hotspot positions |
| E2E (Playwright, phone project) | **`session.spec.ts`**: sign up → lands on the **paper** (*The Coalport Clarion*, 3 headlines incl. "Welcome to Coalport", 3 orders at 0 signed "— P.H.", the desk) → "To the city" → map with 6 hotspots → Mill Gate → the canvass ticket shows 66 % and ×3 → **×3** → modal: stamp matches `/^(Success\|Partial\|[12] of 3)$/`, 3 attempt rows, Energy 100 → 70, a Coalport share line → Continue → the Today strip shows "30 Energy · 3 attempts" and the modal's XP → HUD 70 / 100 → reload → the map, not the paper → HUD 70. **`day.spec.ts`** (`E2E_TEST_HOOKS=1`): Mill Gate → *Take the job* (Factory worker) → *Work your shift* → modal *Shift worked*, Iron +112 → `POST /api/test/clock` +24 h → reload → the paper is due; desk "Salary, Factory worker (half pay) +108 Iron" and "Work streak 1 day · 2 left"; HUD Iron 220 |
| Playtest report | `pnpm report:playtest` (read-only, `packages/db/scripts/playtestReport.ts`): per player and overall — sessions per day (a 30-min gap starts a session), Energy per session, **median time between sessions and the share of returns within 2–4 h**, ×3 share, paper read rate, orders completed per day, shifts per day, levels by day 1/2/3, and the share of action transactions with `txAttempts > 1` (ADR 0010) |

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| The city document is written by every checked action (hot document) | Fine at playtest scale; `txAttempts` is logged and reported; the ledger remedy is designed in ADR 0010 for slice 4 |
| The first request of the day runs a transaction while the client fires 3 queries at once on focus | Settlement is idempotent and retried; losers re-read the winner's state (tested with `Promise.all`) |
| Without drift, Coalport's Collective share climbs to the 95 % cap in about five days of a long playtest (economy §8) | Accepted by the designer for slice 1; lazy drift is cheap to add once its rule is pinned (ADR 0010) |
| UTC midnight is 01:00–02:00 in Central Europe and afternoon in the Americas | Decided for the MVP (GDD §2.2); one constant; ADR 0005 records the migration caveat |
| The headline or order DSL needs a condition we didn't foresee during transcription | Closed DSL extended in rules (small, tested) during T7; never free-form expressions |
| `actionLogs.result` shape changes (v2) while slice-0 dev logs exist | Only retries read old results; dev databases can be dropped; no production data |
| A phone with a wrong clock shows the wrong night or countdowns | `serverNow` skew correction (§3.1) |
| Art in git grows with re-exports | Budgets in the script; new ids for changed images; revisit LFS if art churns (ADR 0007) |
| Stat growth overshoots §8.5 targets (economy flag #15) | Harmless in slice 1 (95 % clamp); the designer reconciles before slice 5 |

---

## 16. Idempotency and atomicity summary

- **Actions** (checked, training, shift): one tap = one UUID = at most one `actionLogs` row = one transaction (character with
  version guard and `day.settled: today`; the city's opinion for checked actions; the log). ×3 is the same single row (ADR 0006).
- **Job take, stat points:** one UUID = at most one `requestLogs` row (ADR 0008).
- **Day settlement:** natural key `{ characterId, day }` — the `day.settled` filter and the unique `paperEntries` index
  (ADR 0005). Salary can't be credited twice.
- **Party orders:** embedded, written only in the character's version-guarded update (ADR 0009); completion rewards can't
  be paid twice.
- **Paper read:** conditional `readAt: null → now`.
- Reads write **at most once per day per character** (settlement); Energy and Rested stay lazy.

---

## 17. Deliberately left out of slice 1

| Left out | Why / where |
|---|---|
| Opinion drift toward the baseline | GDD §14.2 build order: slice 4 (App. C #16). Lazy drift is cheap once its rule is pinned |
| ×5 | GDD §13.1: later. Rules support it; widen the input and add the button |
| Weather, Issues, Battleground bonus, items in checks | slices 4–8 (the `bonuses[]` input is ready) |
| Health and max HP | slice 5 (`maxHealth(level)` derived then) |
| Faction Chair, group targets, the `directives` collection | slices 6–7 (ADR 0009) |
| *Known* tier-2 unlocks, *One of Us* PC trickle | slice 5+ |
| Welcome edition, While You Were Away, Welcome Back package | slice 2 / later |
| Presence ("here now"), faction chat | slice 6 |
| Bar buffs, meals, lodging, Market trader, Remote Work | later slices (content §10) |
| Analytics service (PostHog) | the read-only report covers the playtest |

---

## 18. Task list (in order; each task leaves the repo green and is one commit)

**T1. Rules: time and checks.** `day.ts`, the constants of §6.1, two-stat `computeCheck`, `spendEnergy` on a plain state
with `useRested`; update slice-0 tests (`stat` → `stats`); tests.

**T2. Rules: progress.** `standing.ts`, `rank.ts`, `progress.ts` (`applyGains`), `tally.ts`, `opinion.ts`
(`applyPersuasion`); tests.

**T3. Rules: orders and ×N.** `orders.ts`; `computeRewards` with the council multiplier and the order bonus;
`resolveTier1Action` v2 (§6.3); `training.ts`; tests (slice-0 numbers unchanged for ×1).

**T4. Rules: jobs.** `jobs.ts` (`jobPay`, `shiftPay`, `jobLock`, `settleDays`, `resolveShift`); tests.

**T5. Rules: paper.** `paper.ts` (`selectHeadlines`, `fillTemplate`, `isPaperDue`), the DSL types in `types.ts`, the view and
result types of §7.2 and §9; tests.

**T6. Content: schemas.** §4.1–4.3, the art catalogue types, the slice-0 data migrated to the new schema (Mill Gate
canvass `stats: ['int']`, Coalport map ids and paper, rank titles, Holm and her portrait id, one order template per slot, one
ambient headline) so the loader passes; loader tests with failing fixtures.

**T7. Transcribe `docs/design/slice-1-content.md` into `packages/content`**: 6 locations with map x/y and blurbs, 21 actions
and their text, 3 jobs, standing names, Petra Holm, 12 order templates, the Clarion with its headline templates (split as in
§4.2's transcription notes) and the ambient pool; content tests assert the counts and the recruit's odds (66/58/46/42/38 %).
Can run in parallel with T8–T13 once T6 is in.

**T8. Art pipeline.** `scripts/art/build.ts`, `pnpm art:build` / `art:check`, `sharp`, generate and commit the slice-1
assets, the `vercel.json` cache header; CI runs `art:check`.

**T9. DB.** Character fields (§5.1) and the migration; `actionLogs` `kind` / `times` / `txAttempts`; `PaperEntry`,
`RequestLog`; `ensureIndexes`; tests.

**T10. Server: the day.** `dayService.ensureSettled`, `loadCharacter`, new character defaults, `character.me` v2 and its
views, `withRequestKey`, `character.placeStatPoint`; tests (day, stat points).

**T11. Server: actions v2.** `action.perform` for checked ×1/×3, training ×1/×3 and shifts (§7.4), opinion writes,
`buildActionResult` v2 with `pickArt` (§9), `city.get` v2; tests (×3, opinion, training, orders, levels).

**T12. Server: jobs.** `job.take` (§7.5) incl. the *Take a job* order; tests (jobs, streak, sick days, salary).

**T13. Server: paper and test clock.** `paper.today`, `paper.markRead`, the `E2E_TEST_HOOKS` clock route and its env guard;
tests.

**T14. UI package.** The components of §12.4 in the mockups' styles; smoke tests with fixtures.

**T15. Client: shell and map.** `AppShell`, `TabBar`, HUD v2 (stat-point badge), `/` redirect, map with day/night and zoom,
location sheet with ×1/×3, training and shift tickets, the Jobs card, orders list, Today strip, out-of-Energy card, modal v2
wiring (incl. the stat-point buttons), `serverNow` skew.

**T16. Client: paper and me.** `/paper` (mark read, "To the city"), `/me`, desktop ticker.

**T17. E2E.** `session.spec.ts` and `day.spec.ts` (§14); update the slice-0 specs (they now land on the paper first; Again ×3
is enabled). CI green.

**T18. Playtest report and docs.** `pnpm report:playtest`; README (art pipeline, test hooks); a **Deviations** section at the
end of this file for anything built differently.

---

## 19. Questions for the game designer

The design follows `docs/design/slice-1-content.md` and `docs/economy.md`; these are the few points they leave open. Each has
a default so the build doesn't wait.

1. **Sick days with no streak running.** §9.1: "a City Day without a shift spends one automatically". Default: a sick day is
   spent only **while a streak is running** (> 0), including the day a job is taken. Otherwise a player who takes a job on
   Monday and first works on Wednesday would start the week with no sick days left. OK?
2. **Rested and shifts.** Default: a shift (and a job switch) spends Energy **without using Rested**, since there is no XP or
   Iron bonus for it to give (§9.1 "Rested does not apply to pay"). Otherwise Rested would be burned for nothing. OK?
3. **The +25 % after an order is done.** Default: only rows that advance an **open** order get it (the completing row
   included), matching the economy sheet's "up to +15 FXP a day". OK?
4. **Take a job** (`dir.work-shift`'s no-job variant, "hold a job by day's end"): default completes the moment the job is
   taken (+20 FXP then). OK?
5. **Mixed ×3 narrative:** the success text when at least one of three succeeded (as the mockup). Or a third text per action?
6. **Dateline:** "{Weekday} · {date} · Coalport" — which date: the real one ("29 September"), with or without a year, or a
   1946 date? Default: weekday and day-month, no year.
7. **Short copy** for UI states the content doesn't cover: out of Energy (with "full at 17:40"), shift already worked, *Take
   the job* / *Switch · streak resets*, ×3 disabled tooltip, locked job ("needs AGI 10"), stat points waiting.
8. **Rank titles:** the Collective's Rank 5 title is "Vanguard" (§5.4), which reads as the rival faction's name. Keep while
   faction naming is parked?
9. **Salary after very long absences:** accrues without limit per boundary (§9.1). Fine for months away, or folded into the
   Welcome Back package later?

## 20. Needs the user

1. **Art in git** (ADR 0007): the generated AVIF/WebP files are committed (~3 MB per city, ~20–30 MB for the MVP) and the
   sources stay outside the repo. Say if you'd rather use Git LFS or an image host.
2. The art source folder, if not `E:\Projects\ironGateCity Docs\art-direction` on the machine that regenerates art.
3. Still open from slice 0: provisioning (GitHub remote, Atlas, Railway/Fly, Vercel, Sentry).

## Deviations (developer, slice 1 build)

Smallest working changes from this design, found while building T1–T18. The game designer's answers to §19
(`docs/design/slice-1-content.md` §12) are built in; where they changed a default, that is listed first.

**From the designer's answers (§19)**

- **Q5, ×N:** the stamp of a batch is always "n of N" (`3 of 3` and `0 of 3` included), so the result's `stamp` is
  `'batch'` rather than `'mixed'` (`actionLogs.outcome` enum: `success | partial | batch | worked | trained`). The text is
  the success text when `successes × 2 > times` (`usesSuccessText` in rules).
- **Q8:** the Collective's Rank 5 title is *Delegate*. **Q9:** `JOBS.salaryMaxDays = 14`; `hl.away`'s `{days}` is the
  credited count. **Q1–Q4, Q6:** defaults as designed, pinned as rules constants (`JOBS.sickDaysOnlyWhileStreak`,
  `JOBS.shiftUsesRested`, `DIRECTIVES.bonusOnlyWhileOpen`). **Q7:** the §12.1 copy table is data in
  `packages/content/src/data/copy.ts`, exported as `@irongate/content/copy` (plain strings and functions, no Zod), which
  `@irongate/ui` and the client import. All times on buttons, the modal and the paper are the player's local clock.

**Rules, types and API**

- `CheckBreakdown` drops `stat`; it carries `stats`, `statValues` and `statValue` (the average).
- `resolveTraining` and `resolveShift` also take `orderTemplates` and `homeCityId` (they advance orders). Added pure
  helpers: `energyReadyAt` ("ready at 14:20"), `trainingRunCost`, `sumRewards`, `flatLine`, `rankBounds`, `orderRewards`,
  `findAdvancingItem`, `itemSpec`, `jobLocks` (every unmet requirement, for "Needs Level 3, AGI 10"), `emptyTally`.
- `ActionView` gains `givesFxp` (the ticket shows "+25 % FXP" only where FXP is paid); `LocationJobView` gains `unmet`;
  `OrdersView.issuer` is nullable (factions without a secretary); `DeskView` has the live rows as named fields.
- `job.take` returns `outcome { switched, orderCompleted, fxp, firstPayAt }` beside `character` and `job`, for the Jobs
  card's one line.
- `GameError` carries its tRPC code, so a refusal thrown inside a transaction keeps its code (`NOT_FOUND`, `BAD_REQUEST`…).
- The result's `seed` is the log's seed for every kind (unused by training and shifts). The city opinion write is an
  upsert (a missing state document is created from the baseline).
- `ensureSettled`: after three lost races it returns the winner's state instead of failing, if the day is settled.
- The paper's share is rounded half up to one decimal (70.05 is stored as 70.0499…). The morale headlines use a no-break
  space before "%".

**Content**

- Job `blurb`s were not in the content document; the developer wrote three short factual ones from the shift texts
  (`packages/content/src/data/jobs.ts`). **For the game designer to review.**
- Rank titles for all three factions from §5.4. The portrait crop is 760 × 950 (4:5) from `holm.png`.
- Scene budgets at 640 px (60 KB AVIF / 80 KB WebP) and portraits at 256 px (20 / 25 KB) were added to ADR 0007's list.

**Server and tests**

- With `E2E_TEST_HOOKS=1` (memory mode only), Better Auth's rate limit is off: Playwright signs up four accounts from one
  address within seconds and the production limit refused the fourth.
- Playwright runs with `workers: 1`: `day.spec` moves the process-wide test clock that every spec shares.
- The UI package's tests pin `TZ=UTC` (times are local).

**Client and UI**

- The location sheet is a Radix Dialog on every width (bottom sheet on phones, a right-hand panel with a transparent
  overlay from 1024 px). The desktop dock sits above the ticker line.
- The map opens centred on the selected or first location, so on a phone some pins start off-screen until the map is
  panned (all six are in the page). Hotspots keep a 44 px target at every zoom (`KeepScale`).
- The HUD's second Energy line is "full at 17:40" / "Rested 60" (§12.1); the countdown to the next tick is in the gauge's
  accessible text.
- Location kind labels ("Factory gate", "Party hall") are a small map in the client, not content.

**Not verified here:** the CI run (no remote), the Vercel header in production, Docker.
