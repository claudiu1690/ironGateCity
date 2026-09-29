# Slice 3 — The first vote: technical design

| | |
|---|---|
| **Goal** | Every home city runs the five-day council cycle on its own. A player votes from Rank 2 with one tap on the paper. From Rank 3 and *Known* a player declares, is endorsed by colleagues or the branch, and can win a seat. The morning after, the paper's front page carries their face and the ELECTED stamp. As a councillor they move and vote an ordinance that changes real numbers for everyone in the city for five days. Morale has states with effects. NPCs fill every seat and ballot line players don't, and are marked. |
| **Question** | **Does the first vote, and the first seat, feel like a big moment?** |
| **Builds on** | Slices 0–2 as built on branch `slice-0` (`docs/tech/slice-0.md`, `slice-1.md`, `slice-2.md`, each with its **Deviations**), QA `docs/qa/slices-0-1.md` (fix round 1) and `docs/qa/slice-2.md` (the fixes to land first, §18 T0), and the designer's QA answers (`docs/design/slice-2-onboarding.md` §14) |
| **Design inputs** | `docs/design/slice-3-politics.md` (the rules), `docs/design/slice-3-screens.md` (the screens; no mockups), `docs/economy.md` §14, GDD §2, §3.3, §3.6, §5.2, §6.5, §14.2, §14.11, §15.1–15.3, §15.10, §17.1, Appendix C #21–25 |
| **ADRs** | [0017 city day](../adr/0017-city-day-boundaries-lazy-first-job-primary.md) · [0018 political acts](../adr/0018-political-acts-set-once-with-request-keys.md) · [0019 secret ballot](../adr/0019-secret-ballot-numbered-box.md) · [0020 council records](../adr/0020-council-records-collections-and-projections.md) · [0021 ordinance effects](../adr/0021-ordinance-effects-closed-dsl-day-constant.md) · [0022 morale](../adr/0022-morale-home-share-state-and-contention.md) · [0023 the paper's political sections](../adr/0023-paper-political-sections-live.md) |

Every number below is a GDD or content number. Where the design leaves a point open, this document states a default and lists the question in §20.

---

## 1. Scope

**In**

- **The calendar.** `cycleDay = (dayKey − offset) mod 5` per city. Days 0–1 are nominations, days 2–4 have the polls open, and the count is at the boundary into day 0. The council votes on days 0–1 and divides into day 2. The ordinance is in force from day 2 for five days.
- **The city day** (ADR 0017): the count, the close, the division, the drift, the next election and order paper, and the bootstrap. It runs from an Agenda job at 00:01 UTC and, lazily, before any character in the city settles.
- **Standing for the council.** Declare for 10 PC with a platform line; withdraw; endorse for 10 PC; the branch's endorsement for a day's three orders; the small-branch rule; candidacies struck at the close with the deposit refunded.
- **The ballot.** Single, secret, final, one tap (ADR 0019).
- **The count.** Ward vote + 3 × endorsements + members' votes; seven seats; ties; NPC fill to nine names; turnout.
- **Councils.** Seven seats as `officeTerms`; the stipend (10 PC and 20 FXP per boundary held); the order paper with the branch's motion and up to three proposals (20 PC each); a public council vote; the division with the NPC rule; one ordinance per city.
- **Ten ordinances** as data (ADR 0021), applied to the Energy cost, the odds, the rewards, salary, shifts, training, Standing and the Rested cap.
- **Morale** (ADR 0022): the three states; *Fired up* +10 % FXP; *Unrest* brings the *Restore the base* orders (+40 FXP) and NPC abstention; the drift; ballots, seats and the unvoted-count penalty; *Stands Firm*.
- **The paper v3** (ADR 0023): the Polling Day row, the front page with the ELECTED stamp, and live political headlines for three papers.
- **Screens:** the slate, the ballot, the count, the chamber, the ordinance menu, the HQ council card, the plate lines, ticket tags, the `political` result modal, the Me tab's office line, and PC with its sinks.
- **Playtest report:** election and seat metrics (§14.1).

**Out** (§17): battleground councils and three-way seats (slice 4), residence and moving, the Governor and the Chair's whip (slice 7), tenure after a faction switch (no switching exists), the same-network rule and the 24-hour audit (slice 9), running totals, free-text platforms, rival morale pressure (slice 5), push notifications, *While You Were Away*, deployment provisioning.

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| The count: job or lazy? | **Both**, over one idempotent `settleCityDay`, one transaction per boundary guarded by `world.settledDay`. The Agenda job `city-day` runs at 00:01 UTC and at worker start (the primary). Every character settlement first ensures its city's day (the guarantee and the ordering invariant) | ADR 0017, §7 |
| Seeding on deploy | Lazy **bootstrap** of a city with no `world`: an NPC council, the branch's motion in force, the current election. Runs at worker start or on the first request | ADR 0017, §7.3 |
| Where the ballot lives | `votes {electionId, voterId, candidateKey}`, unique per voter. Secret at the API, linkable for the slice-9 audit | ADR 0019 |
| Endorsements | Public list on the candidacy; one-per-cycle guard in `characters.endorsementsGiven[]` in the same transaction as the PC spend | ADR 0018, 0020 |
| Idempotency of the six acts | Natural-key set-once guard **and** an ADR 0008 request key for replaying the modal. Each window-bound act writes the document its closing boundary writes | ADR 0018 |
| Stipend and refunds | Credited lazily by the character's settlement; the city day never writes a character | ADR 0020 |
| `offices[]` | A settlement projection of `officeTerms`; permissions re-read `officeTerms` in the transaction | ADR 0020 |
| Ordinance effects | Closed DSL in rules, bounds from the GDD, validated by content, applied as day-constant named modifiers; **cost ordinances change the cost only** | ADR 0021, §6.5 |
| Rested cap on expiry | Banking never shrinks the pool; the settlement re-bases Energy and Rested per day with that day's cap | ADR 0021 |
| Salary under an ordinance | Each ended day's half pay uses that day's ordinance (`ordinanceHistory` on the city) | ADR 0021 |
| Morale | The home share in `cities.opinion`; `morale {state, since, previous}`; the drift and count inputs at the boundary; the +0.5 in the ballot's transaction | ADR 0022 |
| The paper's politics | Live at read; political headlines merged into the stored edition by priority; `frontPageSeenAt` on the term | ADR 0023 |
| Local times in server text | `{until}` / `{at}` tokens with epoch ms, rendered by the client (*Tuesday midnight*, *01:00 on Sunday*) | §4.3 |
| NPC slates | A new content section `candidates[]` (they need no portrait, unlike `npcs`) | §4.1 |
| PC on phones | Already decided with the slice-2 fixes: the HUD shows PC on every width once above 0 (design §15 Q10, answered) | T0 |
| Ambition chapter 2 | Recommended **in** as content only, as the last task, not blocking | §19.2 |

---

## 3. The calendar, the keys and the flow

### 3.1 Keys and days (pure, `packages/rules/src/calendar.ts`)

For a city with `offset` (Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4):

- `cycle(d) = floor((d − offset) / 5)` · `cycleDay(d) = mod(d − offset, 5)` · `start(k) = 5k + offset`
- **Election k** (`electionKey = "coalport:4145"`): nominations `start(k)` … `start(k)+1`; polls `start(k)+2` … `start(k)+4`; counted at the boundary into `start(k+1)`.
- **Council k** (`councilKey = "coalport:4146"`, the cycle in which it *sits*) is elected by election k−1:
  - it sits from `fromDay = start(k)` to `toDay = start(k+1)` (exclusive), ending at that count;
  - it votes on `start(k)` … `start(k)+1` and divides at the boundary into `divideDay = start(k)+2`;
  - its ordinance is in force for `[start(k)+2, start(k+1)+2)`.
- On any day d with cycle k, the open election is k and the sitting council is k, and both keys share the number.

**Pinned example (Coalport, offset 2):**

| Date (2026) | Day key | Cycle day | What happens |
|---|---|---|---|
| Thu 1 Oct | 20727 | 0 | Election 4145's nominations open |
| Sat 3 Oct – Mon 5 Oct | | 2–4 | Its polls are open |
| Tue 6 Oct | 20732 | 0 | Election 4145 is counted at the boundary into this day. Council 4146 sits and votes Tue 6 – Wed 7 |
| Thu 8 Oct | 20734 | 2 | Council 4146 divides at the boundary into this day. Its ordinance is in force Thu 8 – Mon 12 (`toDay` 20739) |

(`dayKey(2026-01-01) = 20454`; 29 Sep is a Tuesday, as QA's clock confirmed.)

### 3.2 What each boundary does (one transaction per city per boundary, §7)

| Boundary into | Steps, in order |
|---|---|
| every day | **Drift** (2 % of the distance to 70; ADR 0022); record `moraleLog` |
| cycle day 0 | **Count** election k−1 · seat council k (seven `officeTerms`) · mark council k−1's terms `completed` · morale +2 per player seat, −3 if no player voted · **open** election k (`nominations`, NPC jitter drawn) · **open** order paper k with the branch's motion |
| cycle day 2 | **Close** election k's nominations (small branch, strike, deposits, freeze the ballot, `polling`) · **divide** council k (NPC rule, Unrest after the drift) · set `city.ordinance` or null · push `ordinanceHistory` |
| any | Morale state transition (`morale {state, since, previous}`); `world.settledDay = d` |

### 3.3 The flow, and what each step touches

| # | Screen (route) | Procedure | Writes |
|---|---|---|---|
| 0 | Any screen on a new day | first procedure → `ensureCityDay` → `ensureSettled` | city day (if the job hasn't run); the character's settlement: stipend, refunds, `offices`, the Energy re-base, orders (crisis or rotation), the edition |
| 1 | Paper: Polling Day row, front page (`/paper`) | `paper.today`, `paper.markRead` | `paperEntries.readAt`; `officeTerms.frontPageSeenAt` |
| 2 | The slate (`/council/slate`) | `council.election`, `council.declare`, `council.withdraw`, `council.endorse` | `candidacies`, `elections.filed`, the character (PC, `endorsementsGiven`), `requestLogs` |
| 3 | Actions completing all three orders | `action.perform` / `job.take` | + the branch's endorsement on the candidacy |
| 4 | The ballot (`/council/ballot`) | `council.election`, `council.vote` | `votes`, `elections.ballots`, `cities.opinion` (+0.5), `requestLogs` |
| 5 | The count (`/council/count`, front page) | `council.count` | — |
| 6 | The chamber (`/council`) | `council.chamber`, `council.propose`, `council.councilVote` | `ordinances` (the order paper), the character (PC), `requestLogs` |
| 7 | Map, tickets, HQ card, plate (`/city/$id`) | `city.get`, `action.perform` | as slice 1 + modifiers and morale |

---

## 4. Content (`packages/content`)

### 4.1 New and changed schemas

```ts
// Ordinances (ADR 0021). The effect types and bounds live in rules; content `satisfies` them.
OrdinanceId = Id                                                // 'ord.public-works'
OrdinanceEffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('jobPayPct'),          value: z.int() }),
  z.strictObject({ kind: z.literal('shiftEnergyDelta'),   value: z.int(), floor: z.int().min(1) }),
  z.strictObject({ kind: z.literal('shiftStreakDays'),    value: z.int() }),
  z.strictObject({ kind: z.literal('swingPct'),           actionType: ActionType, value: z.int() }),
  z.strictObject({ kind: z.literal('energyDelta'),        actionType: ActionType, value: z.int() }),
  z.strictObject({ kind: z.literal('trainingEnergyPct'),  value: z.int() }),
  z.strictObject({ kind: z.literal('restedCapDelta'),     value: z.int() }),
  z.strictObject({ kind: z.literal('chancePct'),          actionType: ActionType, value: z.int() }),
  z.strictObject({ kind: z.literal('standingMultiplier'), value: z.int() }),
  z.strictObject({ kind: z.literal('ironPct'),            scope: z.literal('checked'), value: z.int() }),
  z.strictObject({ kind: z.literal('fxpPct'),             scope: z.literal('actions'), value: z.int() }),
]).superRefine(withinOrdinanceBounds) satisfies z.ZodType<OrdinanceEffect>;   // ORDINANCE_BOUNDS from rules
Ordinance = z.strictObject({
  id: OrdinanceId, name: z.string().max(40),
  line: z.string().max(120),                                    // "The council puts the town to work: …"
  effectLine: z.string().max(60),                               // "Job pay +10 %" (the caps line; "· 5 days" added by the UI)
  effects: z.array(OrdinanceEffectSchema).min(1),               // at most one per kind (refine)
});

// NPC slates (§5.2 of the design): own section, since `npcs` require a portrait.
NpcCandidate = z.strictObject({
  id: NpcId /* 'npc.c.weiss' */, name: z.string(), factionId: FactionId, cityId: Id,
  profile: z.int().min(1).max(60),                              // the ward vote before jitter
  line: z.string().max(90),                                     // printed on the ballot
});

Faction += {
  branchMotion: OrdinanceId,                                    // Vanguard ord.rally-permits · Collective ord.shift-hours · Alliance ord.reading-room
  platforms: z.tuple([Platform, Platform, Platform]),           // Platform = { id: Id /* 'plat.c.mill' */, line: z.string().max(90) }
  restoreOrders: z.tuple([Id, Id]),                             // the Unrest pair, slots A and B (design §11.3)
};
City += { council: z.strictObject({ offset: z.int().min(0).max(4), seats: z.literal(7) }).optional() };
OrderTemplate += {
  use: z.enum(['rotation', 'crisis']).default('rotation'),      // crisis templates never enter the rotation
  doneFxp: z.int().min(1).optional(),                           // 40 for Restore the base; default DIRECTIVES.orderDoneFxp (20)
};
HeadlineCondition += PoliticalCondition;                        // §6.7; a template uses political kinds only, or none
PoliticalTexts = z.strictObject({                               // the six modals of screens §9
  results: z.strictObject(Object.fromEntries(POLITICAL_ACTS.map((a) => [a, z.strictObject({
    stamp: z.string().max(20), headline: z.string().max(60), body: StoryText }) ]))),
});
Content += { ordinances: z.array(Ordinance), candidates: z.array(NpcCandidate), politics: PoliticalTexts };
```

`GameContent` gains `ordinance(id)`, `ordinancesMenu()`, `slateOf(cityId)` (profile order), `councilCities()`, `platform(factionId, id)`, `politicalHeadlinesOf(cityId)` and `headlinesOf(cityId)`. The latter now excludes political templates.

### 4.2 Loader cross-checks (added)

- **Ordinances:**
  - ids unique;
  - every effect within `ORDINANCE_BOUNDS` (the refine names the kind and bound);
  - at most one effect per kind;
  - each `actionType` exists in `ActionType`;
  - the ten design ids present;
  - each faction's `branchMotion` resolves.
- **Candidates:**
  - exactly nine per council city, all of the city's home faction;
  - profiles strictly descending in file order (profile order = file order);
  - ids unique across `candidates` and `npcs`;
  - lines ≤ 90;
  - no candidate shares a name with a secretary.
- **Factions:**
  - three platforms with unique ids, lines ≤ 90;
  - `restoreOrders` name this faction's templates with `use: 'crisis'`, in slots A and B, with `doneFxp: 40`;
  - every `crisis` template is in some `restoreOrders`.
- **Cities:**
  - every home city has `council`;
  - offsets unique among loaded cities;
  - the three home offsets equal the GDD's (Ashford 1, Coalport 2, Duskwall 3; checked by a content test, not the schema).
- **Political headlines:**
  - use only political conditions;
  - use only `POLITICAL_PLACEHOLDERS` and the time tokens;
  - each home city's paper has one template for each of the design's ids (seat-won, seat-top, seat-lost, filed, voted-won, voted-lost, seat-ended, council-passed, council-failed, count, polls-open, nominations, ordinance-city, stands-firm, moved);
  - non-political templates use no political condition.
- **Political texts:** six acts present; bodies obey the 240-character, four-sentence rule; placeholders from the political list.

### 4.3 Placeholders and time tokens

| Where | Allowed | Resolved |
|---|---|---|
| Political headlines, result texts | `{name}` `{city}` `{paper}` `{ordinal}` `{votes}` `{margin}` `{winner}` `{last}` `{voted}` `{turnout}` `{npcSeats}` `{ordinance}` `{ordinanceLine}` `{endorsements}` `{n}` `{weekday}` `{countDay}` | On the server (`POLITICAL_PLACEHOLDERS` in rules). `{ordinal}` uses `ORDINALS` (*first* … *seventh*); `{turnout}` is *3 of 9*; `{weekday}` is the weekday of the next nominations day 0 on or after today |
| The same | `{until}` `{at}` | **On the client.** The view carries `until` / `at` (epoch ms of a boundary). `formatUntil(ms)` gives *Tuesday midnight* when the local time is 00:00, else *Wednesday 01:00*; `formatAt(ms)` gives *01:00 on Sunday* (`packages/ui/src/format.ts`) |

**Transcription rule:** the design's *{weekday} midnight* becomes `{until}`, and *at 01:00 on Tuesday* becomes `{at}`. The design's example *until Saturday 01:00 for a UTC+1 player* should read *Sunday 01:00*; `formatUntil` does the arithmetic (§20.1 Q8).

### 4.4 Data to transcribe

| File | Contents | Source |
|---|---|---|
| `data/ordinances.ts` | 10 ordinances: name, line, `effectLine`, effects | design §10.1 |
| `data/candidates.ts` | 27 NPC candidates with profiles and lines | design §5.2 |
| `data/factions.ts` | `branchMotion`, `platforms` ×3, `restoreOrders` | design §6.4, §10.2, §11.3 |
| `data/cities/*.ts` | `council.offset` (Coalport 2, Duskwall 3, Ashford 1) | GDD §2 |
| `data/orders.ts` | six crisis templates (`dir.restore-canvass`, `dir.restore-speech`, `dir.v.restore-*`, `dir.a.restore-*`): canvass in the city ×3 attempts, speech ×1, `doneFxp: 40`. **Titles and lines needed from the designer** (§20.1 Q10) | design §11.3 |
| `data/headlines.ts` | 15 political templates × 3 papers (`hl.moved` and `hl.stands-firm` included) | design §8.1–8.3, §10.2, §8 |
| `data/politics.ts` | the six result texts | screens §9 |
| `data/copy.ts` | screens §11 strings, the Polling Day lines (screens §2.1), `kindLabel` (slice-2 §14.3) | screens |

Content tests, as in slices 1 and 2, parse both design documents and compare every table word for word: ordinances, slates, platforms, headlines per paper and the result texts. They also pin the offsets and the §3.1 example dates.

---

## 5. Data model (`packages/db`)

### 5.1 `elections` — new (one per city per cycle; ADR 0020)

```ts
{
  _id: string,                         // electionKey 'coalport:4145'
  cityId, factionId, cycle: number,
  nominationsFrom: DayKey, pollsFrom: DayKey, countDay: DayKey,
  status: 'nominations' | 'polling' | 'counted',
  seed: string,                        // random at open; NPC jitter (stored for replay)
  npcSlate: Array<{ npcId, profile, jitter /* −2..2 */, wardVote }>,   // all nine, drawn at open
  filed: number,                       // $inc by declare (serialises with the close, ADR 0018)
  smallBranch: { endorsers: number } | null,                           // decided at the close
  ballot: Array<BallotLine> | null,    // frozen at the close: standing players in filing order, then NPCs
  ballots: number,                     // $inc by each vote; never in a view before the count (ADR 0019)
  result: { rows: CountRow[], turnout: { voters, eligible }, npcSeats, topKey, lastSeatKey } | null,
  closedAt: Date | null, countedAt: Date | null, createdAt, updatedAt
}
BallotLine = { key: 'p:<characterId>' | 'n:<npcId>', kind: 'player' | 'npc', characterId?, npcId?,
               candidacyId?, name, platform: string, order: number }
```

Index: `{ cityId: 1, cycle: -1 }` unique.

### 5.2 `candidacies` — new

```ts
{
  _id, electionId, cityId, cycle, characterId, name, platformId,
  filedAt: Date, filedDay: DayKey,
  status: 'filed' | 'withdrawn' | 'struck' | 'standing' | 'elected' | 'defeated',
  endorsements: Array<{ characterId, name, day, at }>,          // members; public
  branch: { day, at } | null,                                   // the secretary's, once
  effective: number | null,                                     // at the close: members + branch × (small ? 2 : 1)
  deposit: 'held' | 'kept' | 'spent' | 'due' | 'returned',
  place: number | null, createdAt, updatedAt
}
```

Indexes: `{ electionId: 1, characterId: 1 }` unique; `{ electionId: 1, filedAt: 1 }`; `{ characterId: 1, deposit: 1 }` partial on `deposit: 'due'`.

### 5.3 `votes` — new (ADR 0019)

`{ _id, electionId, voterId, candidateKey, day, createdAt }`. Indexes: `{ electionId: 1, voterId: 1 }` unique; `{ electionId: 1, candidateKey: 1 }`.

### 5.4 `officeTerms` — new (one per seat per term, NPCs included)

```ts
{
  _id, cityId, councilKey, electionId, seat: 1..7,
  fromDay: DayKey, toDay: DayKey,                               // sits fromDay..toDay−1; ends at the count at toDay
  holder: { kind: 'player', characterId, name } | { kind: 'npc', npcId, name },
  place: number, total: number,
  completed: boolean,                                           // set at the count at toDay
  frontPageSeenAt: Date | null,                                 // players (ADR 0023)
  createdAt
}
```

Indexes: `{ councilKey: 1, seat: 1 }` unique; `{ 'holder.characterId': 1, toDay: -1 }` partial on `holder.kind: 'player'`.

### 5.5 `ordinances` — new: the order paper, one per council term

```ts
{
  _id: string,                                                  // councilKey 'coalport:4146'
  cityId, cycle, fromDay, divideDay,
  status: 'open' | 'divided',
  items: Array<{ ordinanceId, movedBy: { kind: 'branch', npcId, name } | { kind: 'player', characterId, name },
                 at: Date, day: DayKey }>,                      // item 1 = the branch's motion; ≤ 4
  votes: Array<{ characterId, name, seat, choice: string /* ordinanceId | 'against' */, at }>,   // public
  division: { tallies: Array<{ choice, player: number, npc: number }>, npcChoice: string | null,
              npcAbstained: boolean, passed: string | null,
              inForce: { fromDay, toDay } | null } | null,
  createdAt, updatedAt
}
```

Index: `{ cityId: 1, divideDay: -1 }`.

### 5.6 `cities` — new fields

```ts
{
  ...slice 1,                                                   // opinion (morale = opinion[home], ADR 0022)
  world: { settledDay: DayKey, bootstrappedDay: DayKey },       // ADR 0017; absent until bootstrapped
  morale: { state: 'fired' | 'steady' | 'unrest', since: DayKey, previous: MoraleState | null },
  moraleLog: Array<{ day, share, state }>,                      // $push with $slice −60
  council: { key, fromDay, toDay, npcSeats } | null,            // the sitting council, for views
  ordinance: { id, fromDay, toDay, paperId: string | null } | null,
  ordinanceHistory: Array<{ id, fromDay, toDay }>,              // $push with $slice −4 (ADR 0021)
}
```

### 5.7 `characters` — new embedded fields

```ts
{
  ...slice 2,
  offices: Array<{ termId: ObjectId, cityId, councilKey, seat, fromDay, toDay }>,   // settlement projection (ADR 0020)
  endorsementsGiven: Array<{ electionId, candidacyId: ObjectId, name, day }>,       // ≤ 4, newest last (ADR 0018)
}
```

A new index serves the eligibility counts: `{ homeCityId: 1, rank: 1, lastActionAt: -1 }`.

### 5.8 Other collections

- **`paperEntries`:**
  - `headlines[].priority` is added (ADR 0023; older editions look it up by `templateId`);
  - `desk` gains `stipend: { boundaries, pc, fxp, cityName } | null`, `deposits: { count, pc } | null` and `salary.ordinance: { label, amount } | null`.
- **`requestLogs`:** `REQUEST_KINDS` gains `council.declare`, `council.withdraw`, `council.endorse`, `council.vote`, `council.propose` and `council.councilVote`.
- **`actionLogs`:** unchanged schema. The stored result gains optional `parts` and the new `effects` fields (§10.2).

### 5.9 Migration `003-slice3-politics.ts`

Run by `ensureIndexes()` after 002, idempotent: `Character.updateMany({ offices: { $exists: false } }, { $set: { offices: [], endorsementsGiven: [] } })`. Cities are not migrated; they bootstrap lazily (ADR 0017). `ensureIndexes` creates the five new collections, which transactions need to exist.

---

## 6. Rules (`packages/rules`) — pure, no I/O

### 6.1 Constants

```ts
export const COUNCIL = {
  cycleDays: 5, seats: 7, slateSize: 9, passVotes: 4, maxProposals: 3,
  endorsementsNeeded: 2, endorsementsCounted: 5, endorsementWeight: 3,
  wardDivisor: 5, npcJitter: 2, smallBranchBelow: 3, activeEndorserDays: 7,
  termDays: 5, ordinanceDays: 5, knownLevel: 2 /* STANDING level 'Known' */,
  standRank: 3, voteRank: 2,
  cost: { declare: 10, endorse: 10, propose: 20 },
  stipend: { pc: 10, fxp: 20 },
} as const;                                                     // GDD §15.1, §15.3, §6.5
export const MORALE = { firedFrom: 80, unrestBelow: 60, driftTarget: 70, driftShare: 0.02,
                        ballot: 0.5, seat: 2, noVoterPenalty: 3, firedFxpShare: 0.10 } as const;   // §14.11
export const ORDINANCE_BOUNDS = {
  jobPayPct: [-25, 10], shiftEnergyDelta: [-1, 0], shiftStreakDays: [1, 2], swingPct: [0, 15],
  energyDelta: [-2, 0], trainingEnergyPct: [-20, 0], restedCapDelta: [0, 50], chancePct: [0, 4],
  standingMultiplier: [1, 2], ironPct: [0, 25], fxpPct: [0, 25],
} as const;                                                     // §15.3: the bound is the value
export const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'] as const;
```

### 6.2 `calendar.ts`

```ts
export type CouncilPhase = 'nominations' | 'polling';
export function cycleOf(day: DayKey, offset: number): { cycle: number; cycleDay: 0|1|2|3|4; start: DayKey };
export function councilDay(day: DayKey, offset: number): {
  cycle: number; cycleDay: 0|1|2|3|4; phase: CouncilPhase;
  election: { cycle; nominationsFrom; pollsFrom; countDay };                   // election `cycle`
  council:  { cycle; fromDay; divideDay; toDay; voting: boolean };             // council `cycle`; voting on days 0–1
  ordinanceWindow: { fromDay; toDay };                                         // of council `cycle`
};
export const electionKey = (cityId: string, cycle: number) => `${cityId}:${cycle}`;
export const councilKey  = (cityId: string, cycle: number) => `${cityId}:${cycle}`;
export function boundaryWork(day: DayKey, offset: number): { count: boolean; close: boolean; divide: boolean };  // §3.2
```

### 6.3 `council.ts` — the race, the count, the division

```ts
export const wardVote = (successes: number) => Math.floor(successes / COUNCIL.wardDivisor);
export function drawNpcSlate(slate: ReadonlyArray<{ npcId; profile }>, rng: Rng):
  Array<{ npcId; profile; jitter; wardVote }>;                 // jitter rng.int(−2, 2) each, in profile order
export function npcsStanding(playersStanding: number): number; // max(0, 9 − p)
export function effectiveEndorsements(i: { members: number; branch: boolean; smallBranch: boolean }): number;
export function isSmallBranch(otherEligibleEndorsers: number): boolean;        // < 3
export function closeNominations(i: {
  candidacies: Array<{ id; characterId; filedAt: number; members: number; branch: boolean; otherEndorsers: number }>;
  npcSlate: Array<{ npcId; profile; jitter; wardVote }>;
}): { standing: string[]; struck: string[]; effective: Record<string, number>; ballotNpcs: string[] };
export interface CountLine { key: string; kind: 'player' | 'npc'; name: string; wardVote: number;
  successes: number /* NPC: profile × 5 (§20.1 Q5) */; endorsements: number; order: number }
export interface CountRow extends CountLine { endorsementsCounted: number; votes: number; total: number;
  place: number; seated: boolean }
export function countElection(lines: CountLine[], votes: Record<string, number>): {
  rows: CountRow[];                                             // finishing order
  seated: CountRow[]; npcSeats: number; topKey: string; lastSeatKey: string;
};
//  total = wardVote + 3 × min(endorsements, 5) + votes; sort by total ↓, votes ↓, endorsements ↓, successes ↓, order ↑
export function marginToSeat(row: CountRow, r: { rows: CountRow[] }): number;  // last seat's total − row.total (≥ 0)
export function divide(i: {
  items: Array<{ ordinanceId: string; branch: boolean; movedAt: number }>;
  playerVotes: Array<{ choice: string }>;                       // ordinance id or 'against'
  npcSeats: number; unrest: boolean;
}): { tallies: Array<{ choice; player; npc }>; npcChoice: string | null; npcAbstained: boolean; passed: string | null };
//  NPCs: the item with most player votes (items only; ties → the branch's motion if tied, else earliest moved);
//  no player vote for any item → the branch's motion; Unrest → abstain. Passes with ≥ 4 of 7, else null.
export function stipendBoundaries(terms: ReadonlyArray<{ fromDay; toDay }>, settled: DayKey, today: DayKey): number;
//  boundaries b in (settled, today] with fromDay < b ≤ toDay (5 per full term)
```

### 6.4 `morale.ts`

```ts
export type MoraleState = 'fired' | 'steady' | 'unrest';
export function moraleState(share: number): MoraleState;        // ≥ 80 fired · ≥ 60 steady · else unrest
export function applyDrift(shares: OpinionShares, home: FactionId): { shares: OpinionShares; delta: number };
//  delta = roundOpinion(0.02 × (70 − share)); up: Neutral → home (Neutral floor 5); down: home → Neutral
export function applyMoraleLoss(shares: OpinionShares, home: FactionId, amount: number): { shares; applied };
//  home → Neutral, home floor 50 (§14.2)
export function moraleTransition(prev: { state; since; previous }, share: number, day: DayKey): typeof prev | null;
//  a new record when the state changes; null otherwise
```

The ballot's +0.5 and the seat's +2 use `applyPersuasion` (it draws from Neutral first, as a swing does).

### 6.5 `ordinances.ts` — the DSL and the modifiers (ADR 0021)

```ts
export type OrdinanceEffect = /* the eleven kinds of §4.1 */;
export interface OrdinanceSpec { id: string; name: string; effects: OrdinanceEffect[] }
export interface CityModifiers {
  ordinance: OrdinanceSpec | null;
  firedUp: boolean;                                             // home city of the actor's faction, state 'fired'
}
export function cityModifiers(i: { ordinance: OrdinanceSpec | null; moraleState: MoraleState | null;
                                   actorIsHomeFaction: boolean }): CityModifiers;
export function effect<K extends OrdinanceEffect['kind']>(m: CityModifiers, kind: K, actionType?: string):
  Extract<OrdinanceEffect, { kind: K }> | null;
export function actionEnergy(base: number, type: string, m: CityModifiers): number;          // speech 12 → 10
export function trainingEnergy(baseCost: number, m: CityModifiers): number;                  // roundHalfUp(44 × 0.8) = 35
export function shiftEnergy(base: number, m: CityModifiers): number;                         // max(floor, 4 − 1) = 3
export function shiftStreakStep(m: CityModifiers): number;                                   // 1 or 2
export function jobPayWith(pay: number, m: CityModifiers): number;                           // roundHalfUp(216 × 1.10) = 238
export function ordinanceCheckBonuses(type: string, m: CityModifiers): CheckBonus[];         // { id: 'ord.open-doors', label: 'Open Doors', value: 4 }
export function swingMultiplier(type: string, m: CityModifiers): number;                     // 1.15 on propaganda
export function standingPerSuccess(m: CityModifiers): number;                                // 1 or 2
export function restedCapFor(m: CityModifiers): number;                                      // 200 or 250
export interface BonusShare { id: string; label: string; share: number }
export function rewardShares(i: { type: string; givesFxp: boolean; m: CityModifiers }):
  { fxp: BonusShare[]; iron: BonusShare[] };                    // Fired up 0.10 · Public Meetings 0.25 · Ward Fund 0.25
export function ordinanceTags(i: { kind: 'checked' | 'training' | 'shift'; type: string; base: number; m: CityModifiers }):
  OrdinanceTagView[];                                           // the ticket's tags (§8.3)
export function ordinanceOnDay(history: ReadonlyArray<{ id; fromDay; toDay }>, day: DayKey): string | null;
```

### 6.6 Changed functions

| Function | Change |
|---|---|
| `projectEnergy(state, now, max, restedCap = RESTED.cap)` | Banking never shrinks: `rested = state.rested ≥ cap ? state.rested : min(cap, state.rested + overflow)` (ADR 0021 §5) |
| `projectEnergyThrough(state, until, capOn: (day) => number)` **new** | Piecewise, one segment per City Day with that day's cap, ticks aligned as `projectEnergy` does. Used by the settlement |
| `computeRewards` | Takes `rewardEnergy` (content) and `costPaid`. The Rested share is `restedUsed / costPaid`. `fxpShares` and `ironShares` are `BonusShare[]`, and each part is rounded half up on its own. `RewardLine` gains `parts?: Array<{ id; label; amount }>` with `bonus = Σ parts`. The opinion swing is multiplied by `swingMultiplier` |
| `resolveTier1Action` | Takes `modifiers`. The cost is `actionEnergy`. Rewards use the content Energy. `bonuses` add `ordinanceCheckBonuses`. Each Success adds `standingPerSuccess` to Standing inside the loop. Order bonus, Fired up and Public Meetings go into `fxpShares`; Ward Fund into `ironShares` |
| `resolveTraining` | Takes `modifiers`. The cost is `trainingEnergy`. XP is on the unmodified cost (rule 3, §20.1 Q11) and the Rested share on the cost paid |
| `resolveShift` | Takes `modifiers`. Energy is `shiftEnergy`, the streak step `shiftStreakStep`. Iron: `base = halfPay(pay)`, parts `streak` (on the unmodified pay, economy §14.4) and `ord.<id>` = `halfPay(jobPayWith(pay)) − halfPay(pay)`, which may be negative |
| `settleDays` | `pay` becomes `payOn: (endedDay) => number | null` (`halfPay(jobPayWith(pay, modifiers of that day))`). The salary reports `ordinance: { label, amount } | null` (the sum of adjustments) |
| `startOrders(templates, day, hasJob, welcome?, crisis?)` | `crisis: [A, B]` replaces slots A and B. `welcome` wins over `crisis` on a first City Day. `ordersForDay` skips `use: 'crisis'` |
| `orderRewards(completed: OrderTemplate[], allDone)` | FXP = Σ `doneFxp ?? 20` |
| `chapterStatus` | Optional `requires.ballotCast` (only if the designer keys chapter 2 to the vote, §19.2) |

### 6.7 Political headlines (`paper.ts`)

```ts
export type PoliticalCondition =
  | { kind: 'seatWon'; top?: boolean } | { kind: 'seatLost' } | { kind: 'votedFor'; won: boolean }
  | { kind: 'filedYesterday' }          // and today is still nominations (filed on day 0)
  | { kind: 'termEnded' } | { kind: 'divided'; passed: boolean } | { kind: 'movedYesterday' }
  | { kind: 'countToday' } | { kind: 'phaseToday'; phase: CouncilPhase; cycleDay?: number }
  | { kind: 'ordinanceFromToday' } | { kind: 'leftUnrest' };
export interface PoliticalFacts { /* one field per condition, plus the placeholder values and the boundaries */ }
export function selectPoliticalHeadlines(t: readonly HeadlineTemplate[], f: PoliticalFacts):
  Array<{ templateId; group; priority; headline; deck?; until?: number; at?: number }>;
export function mergeHeadlines(stored: StoredHeadline[], live: LiveHeadline[]): LiveHeadline[];   // ADR 0023
export const POLITICAL_PLACEHOLDERS = [/* §4.3 */] as const;
```

### 6.8 Types (views, results, errors)

All in `types.ts` (§8.3, §10). `GameErrorReason` gains:

- `RANK_TOO_LOW`, `NOT_KNOWN`, `SITTING_COUNCILLOR`
- `NOT_NOMINATIONS`, `NOT_POLLING`
- `ALREADY_FILED`, `NOT_FILED`, `UNKNOWN_PLATFORM`
- `NOT_ENOUGH_PC`
- `UNKNOWN_CANDIDACY`, `CANDIDACY_CLOSED`, `CANNOT_ENDORSE_SELF`, `ALREADY_ENDORSED`
- `UNKNOWN_CANDIDATE`, `ALREADY_VOTED`
- `NOT_COUNCILLOR`, `COUNCIL_CLOSED`
- `UNKNOWN_ORDINANCE`, `ALREADY_ON_PAPER`, `ALREADY_PROPOSED`, `PAPER_FULL`, `NOT_ON_PAPER`, `ALREADY_COUNCIL_VOTED`
- `UNKNOWN_ELECTION`, `ELECTION_NOT_READY`

### 6.9 Tests (Vitest, `packages/rules/test`)

- **calendar:**
  - all offsets over 30 days: phases, keys, windows;
  - the §3.1 dates;
  - *polls are open somewhere every day* across the five offsets;
  - every window is ≥ 1 day;
  - `boundaryWork` fires count and close/divide exactly once per cycle.
- **council:**
  - `wardVote` (29 → 5, 30 → 6, 200 → 40);
  - jitter always in −2..2, deterministic per seed, every value reached over 1,000 seeds;
  - `npcsStanding` 0…12;
  - effective endorsements (1 member; branch; branch small = 2; branch + 1 member small = 3);
  - strike at 1, stand at 2.
- **count — the design's worked examples:**
  - a day-10 reference recruit alone (40 + 6 + 1 = 47) tops a slate whose best NPC is 44 + jitter ≤ 46, for every jitter;
  - a day-14 casual (30 + 6 + 1 = 37) takes a seat, not the top, for every jitter;
  - every tie-break in order (votes, endorsements, successes, filing, NPCs after players);
  - endorsements past five add nothing;
  - `npcSeats`, top, last seat and margins;
  - nine names means two lose.
- **divide:**
  - no player votes → the branch's motion passes 7–0 (or 6–0 with a silent councillor);
  - one player vote for X → X passes with the NPCs;
  - a tie between X and the branch → the branch;
  - a tie between X and Y (no branch) → the earliest moved;
  - seven players split 3/3/1 → nothing passes;
  - Unrest: the NPCs abstain, and 3 player votes fail;
  - all players vote *Against all* → the NPCs vote the branch (§20.1 Q15).
- **morale:**
  - state edges 59.999 / 60 / 79.999 / 80;
  - drift 95 → 94.5, 60 → 60.2, 70 → 70;
  - drift up with Neutral at 5 moves nothing;
  - loss with the home floor at 50;
  - the economy §14.5 paths, simulated day by day: a lone reference (+1.15/day) reaches 80 on day 9 ± 1; nobody: the fourth unvoted count enters Unrest on day 20.
- **ordinances — every effect at the design's numbers:**
  - speech 12 → 10 with rewards unchanged; with 10 Rested the full +50 %;
  - training 44 → 35, XP 99;
  - shift 4 → 3 and 2 → 2; streak +2 with the bonus cap unchanged;
  - job pay 216 → half 119 (+11) and 81 (−27) under Ward Fund; the streak bonus unchanged;
  - Open Doors 66 → 70, 93 → 95 at the clamp;
  - Street Permits 0.04 → 0.046;
  - Ward Register ×2 inside a ×3 run changes row 3's Standing bonus when crossing 30;
  - a 6-FXP canvass with an order, *Fired up* and Public Meetings → parts +2, +1, +2;
  - Ward Fund Iron +25 % with Rested as two parts.
- **Rested:**
  - banks to 250 under Rest Day;
  - keeps 250 after expiry and never banks above 200 again until spent below it;
  - the piecewise projection across a cap change equals day-by-day projection;
  - a stored 250 projected with cap 200 stays 250.
- **settle and orders:** half pay per ended day under different ordinances; the crisis pair and +40; welcome over crisis.
- **headlines:**
  - each political condition;
  - *seat-top* excludes *seat-won*;
  - the merge keeps ≤ 2 personal and 3 in all;
  - the seat headline is dropped when the front page shows;
  - placeholders resolved, `{until}` left for the client.
- **stipend:** 5 boundaries a term; 0 before the first boundary held; an away councillor gets 5 on return; a term that started today pays nothing today.

---

## 7. The city day (`apps/server/src/services/cityDay.ts`, ADR 0017)

### 7.1 `settleCityDay(content, cityId, now)`

```
today = dayKey(now)
loop (bounded by today − settledDay + 2):
  city = City.findById(cityId).lean()
  if !city.world → bootstrap(content, cityId, today) in a txn (conditional on world absent); continue
  if city.world.settledDay >= today → return city
  d = city.world.settledDay + 1
  try inTransaction(s => processBoundary(content, cityId, d, now, s))
  catch AlreadySettled | WriteConflict → continue            // another runner won; re-read
```

### 7.2 `processBoundary(content, cityId, d, now, session)`

```
city   = City.findById(cityId).session;  spec = content.city(cityId); home = spec.homeFactionId
work   = boundaryWork(d, spec.council.offset);  cal = councilDay(d, offset)
shares = applyDrift(city.opinion, home).shares

if work.count:                                     // election k−1 → council k
  e = Election.findById(electionKey(city, cal.cycle − 1)).session   // missing → an NPC-only election is created and counted
  votes = Vote.aggregate([{ $match: { electionId: e._id } }, { $group: { _id: '$candidateKey', n: { $sum: 1 } } }]).session
  players = Character.find({ _id: { $in: playerIds(e.ballot) } }, { localStanding, name }).session
  lines = e.ballot → CountLine (player wardVote from localStanding[city] now, effective endorsements from the candidacy;
                                NPC wardVote from npcSlate)
  r = countElection(lines, votes)
  eligible = Character.countDocuments({ homeCityId: cityId, rank: { $gte: 2 } }).session
  Election.updateOne({ _id: e._id, status: 'polling' }, { $set: { status: 'counted', result: {…, turnout: { voters: Σvotes, eligible } }, countedAt } })
      → matched 0 ⇒ AlreadySettled
  Candidacy.bulkWrite(standing → elected/defeated + place).session
  OfficeTerm.updateMany({ councilKey: councilKey(city, cal.cycle − 1) }, { $set: { completed: true } }).session
  OfficeTerm.insertMany(r.seated → seat 1..7, fromDay d, toDay d + 5).session
  shares = applyPersuasion(shares, { factionId: home, swing: 2 × playerSeats, homeFactionId: home }).shares
  if Σvotes === 0: shares = applyMoraleLoss(shares, home, 3).shares
  Election.create([{ _id: electionKey(city, cal.cycle), status: 'nominations', seed: random,
                     npcSlate: drawNpcSlate(content.slateOf(cityId), createRng(seed)), … }]).session
  Ordinances.create([{ _id: councilKey(city, cal.cycle), status: 'open',
                       items: [{ ordinanceId: faction.branchMotion, movedBy: { kind: 'branch', … } }] }]).session
  set.council = { key, fromDay: d, toDay: d + 5, npcSeats: r.npcSeats }

if work.close:                                     // election k
  e = Election.findById(electionKey(city, cal.cycle)).session (status 'nominations')
  cands = Candidacy.find({ electionId: e._id, status: 'filed' }).session
  others = Character.countDocuments({ homeCityId, factionId: home, rank ≥ 2,
                                      lastActionAt ≥ dayStart(d) − 7 days }).session       // minus each candidate if counted
  c = closeNominations(…)
  Candidacy.bulkWrite(standing: { status: 'standing', deposit: 'spent', effective } · struck: { status: 'struck', deposit: 'due' }).session
  Election.updateOne({ _id, status: 'nominations' }, { $set: { status: 'polling', smallBranch, ballot, closedAt } }) → 0 ⇒ AlreadySettled

if work.divide:                                    // council k
  p = Ordinances.findById(councilKey(city, cal.cycle)).session (status 'open')
  unrest = moraleState(shares[home]) === 'unrest'
  v = divide({ items, playerVotes: p.votes, npcSeats: city.council.npcSeats, unrest })
  Ordinances.updateOne({ _id, status: 'open' }, { $set: { status: 'divided', division: {…} } }) → 0 ⇒ AlreadySettled
  set.ordinance = v.passed ? { id: v.passed, fromDay: d, toDay: d + 5, paperId } : null
  push.ordinanceHistory = v.passed ? { id, fromDay: d, toDay: d + 5 } : none

m = moraleTransition(city.morale, shares[home], d)
City.updateOne({ _id: cityId, 'world.settledDay': d − 1 },
               { $set: { opinion: shares, ...set, ...(m ? { morale: m } : {}), 'world.settledDay': d },
                 $push: { moraleLog: { $each: [{ day: d, share, state }], $slice: −60 }, ...push } }).session
  → matched 0 ⇒ AlreadySettled
```

The bulk writes filter on the expected status, so an interleaved act (ADR 0018) turns into a write conflict, never a silent overwrite.

### 7.3 `bootstrap(content, cityId, today)`

For cycle k of today with day-0 `c0`:

1. Order the NPC slate by profile (no jitter). Seat the top seven as council k: `officeTerms` with `fromDay c0`, `toDay c0 + 5`, `completed: false`.
2. Create order paper k with the branch's motion. If `cycleDay ≥ 2`, mark it divided, with the branch passed 7–0, and set `ordinance = { branch, c0 + 2, c0 + 7 }`. Otherwise set `ordinance = { branch, c0 − 3, c0 + 2, paperId: null }` (the previous council's motion, synthetic).
3. Create election k. If today is a polling day, freeze its ballot with the nine NPCs, since no player could have filed.
4. Set `morale` from the share, `world = { settledDay: today, bootstrappedDay: today }` and `ordinanceHistory = [ordinance]`.

The whole bootstrap is one transaction, conditional on `world: { $exists: false }`.

### 7.4 `ensureCityDay(content, cityId, now)` and the ordering

- `ensureSettled` calls `ensureCityDay(homeCityId, now)` first and passes the returned city document on to `computeSettlement` and the views (`LoadedCharacter.city`).
- `arrival.join` calls it before its transaction.
- If it throws anything other than a conflict, the error goes to Sentry and the request continues with the last stored city (the degrade path, ADR 0017).
- `runCityDay(content, now)` loops over `content.councilCities()`. It is exported for the worker, the test hook and the tests.

---

## 8. API (`apps/server`)

### 8.1 Procedures

All are protected. The city is always the caller's home city: no input names a city or a character.

```ts
council.election   ()                                                         → ElectionView
council.count      ({ electionId: z.string().regex(/^[a-z]+:\d+$/).optional() }) → CountView | null
    // default: the home city's latest counted election · NOT_FOUND UNKNOWN_ELECTION · BAD_REQUEST WRONG_CITY
council.chamber    ()                                                         → CouncilView
council.declare    ({ platformId: z.string().min(1), idempotencyKey: z.uuid() })      → PoliticalResult
    // PRECONDITION_FAILED NOT_NOMINATIONS { opensAt } / RANK_TOO_LOW { need: 3 } / NOT_KNOWN { successes, need: 30 }
    //   / SITTING_COUNCILLOR { termEndsAt } / NOT_ENOUGH_PC { pc, cost } · BAD_REQUEST UNKNOWN_PLATFORM
    //   · CONFLICT ALREADY_FILED { status } / KEY_REUSED / ACTION_CONFLICT / ELECTION_NOT_READY
council.withdraw   ({ idempotencyKey: z.uuid() })                                      → PoliticalResult
    // PRECONDITION_FAILED NOT_NOMINATIONS / NOT_FILED { status | null }
council.endorse    ({ candidacyId: z.string().regex(/^[0-9a-f]{24}$/), idempotencyKey: z.uuid() }) → PoliticalResult
    // PRECONDITION_FAILED NOT_NOMINATIONS / RANK_TOO_LOW { need: 2 } / NOT_ENOUGH_PC / CANDIDACY_CLOSED { status }
    //   · BAD_REQUEST UNKNOWN_CANDIDACY / CANNOT_ENDORSE_SELF · CONFLICT ALREADY_ENDORSED { candidacyId, name }
council.vote       ({ candidateKey: z.string().regex(/^(p:[0-9a-f]{24}|n:[a-z0-9.-]+)$/), idempotencyKey: z.uuid() }) → PoliticalResult
    // PRECONDITION_FAILED NOT_POLLING { opensAt } / RANK_TOO_LOW { need: 2, fxpToGo } · BAD_REQUEST UNKNOWN_CANDIDATE
    //   · CONFLICT ALREADY_VOTED { candidateKey, name } / ELECTION_NOT_READY
council.propose    ({ ordinanceId: z.string().min(1), idempotencyKey: z.uuid() })      → PoliticalResult
    // PRECONDITION_FAILED NOT_COUNCILLOR / COUNCIL_CLOSED { divideAt | opensAt } / NOT_ENOUGH_PC { pc, cost: 20 } / PAPER_FULL
    //   · BAD_REQUEST UNKNOWN_ORDINANCE · CONFLICT ALREADY_ON_PAPER / ALREADY_PROPOSED { ordinanceId }
council.councilVote ({ choice: z.string().min(1) /* ordinance id or 'against' */, idempotencyKey: z.uuid() }) → PoliticalResult
    // PRECONDITION_FAILED NOT_COUNCILLOR / COUNCIL_CLOSED · BAD_REQUEST NOT_ON_PAPER · CONFLICT ALREADY_COUNCIL_VOTED { choice }

paper.today     → PaperView v3 (§11) · paper.markRead → also sets officeTerms.frontPageSeenAt (ADR 0023)
city.get        → CityView v3 (§8.3) · character.me → CharacterView v4 (§8.3) · action.perform, job.take: modifiers (§8.5)
```

### 8.2 Services (`councilService.ts`, each act through `withRequestKey`, ADR 0018)

Every `fn(session)` starts with:

```
c = Character.findById.session; c.day.settled !== today ⇒ DayChanged
d = councilDay(today, offset); e = Election.findById(electionKey(home, d.cycle)).session (missing ⇒ ELECTION_NOT_READY)
```

**declare**

1. Refuse outside nominations (`NOT_NOMINATIONS`); for an unknown platform (`UNKNOWN_PLATFORM`); below Rank 3 (`RANK_TOO_LOW`); below Known (`NOT_KNOWN`).
2. `OfficeTerm.exists({ cityId, 'holder.characterId': c._id, fromDay ≤ today, toDay > today })` ⇒ `SITTING_COUNCILLOR`.
3. `Candidacy.findOne({ electionId, characterId })` ⇒ `ALREADY_FILED { status }`. `pc < 10` ⇒ `NOT_ENOUGH_PC`.
4. `Election.updateOne({ _id, status: 'nominations' }, { $inc: { filed: 1 } })`; a miss ⇒ `NOT_NOMINATIONS`.
5. `Candidacy.create({ …, status: 'filed', deposit: 'held', branch: ordersAllDoneToday(c) ? { day, at } : null })` (§20.1 Q2).
6. `Character.findOneAndUpdate({ _id, version, 'day.settled': today, pc: { $gte: 10 } }, { $inc: { pc: −10, version: 1 } })`; null ⇒ `VersionConflict`.
7. Return `buildPoliticalResult('declare', …)`.

**withdraw**

1. Nominations only.
2. `Candidacy.findOneAndUpdate({ electionId, characterId, status: 'filed' }, { $set: { status: 'withdrawn', deposit: 'kept' } })`; null ⇒ `NOT_FILED { status }`.
3. Return the result. No PC moves, and no character write beyond the day check.

**endorse**

1. Nominations only; Rank 2 or above.
2. `cand = Candidacy.findById(id)`. Refuse if it is missing or belongs to another election (`UNKNOWN_CANDIDACY`), if it is the caller's own (`CANNOT_ENDORSE_SELF`), or if its status is not `filed` (`CANDIDACY_CLOSED`).
3. `c.endorsementsGiven` already holds this election ⇒ `ALREADY_ENDORSED`. `pc < 10` ⇒ `NOT_ENOUGH_PC`.
4. `Candidacy.updateOne({ _id, status: 'filed', 'endorsements.characterId': { $ne: c._id } }, { $push: { endorsements: { characterId, name, day, at } } })`; a miss ⇒ re-read and return the precise reason.
5. `Character.findOneAndUpdate({ _id, version, 'day.settled': today, pc: { $gte: 10 }, 'endorsementsGiven.electionId': { $ne: e._id } }, { $inc: { pc: −10, version: 1 }, $set: { endorsementsGiven: pruned + new } })`.

**vote**

1. Polls only; Rank 2 or above (the rank read in the transaction).
2. `e.status !== 'polling'` ⇒ `NOT_POLLING` (or `ELECTION_NOT_READY` on a polling day before the close ran).
3. `candidateKey` not in `e.ballot` ⇒ `UNKNOWN_CANDIDATE`.
4. `Vote.findOne({ electionId, voterId })` ⇒ `ALREADY_VOTED { candidateKey, name }`.
5. `Election.updateOne({ _id, status: 'polling' }, { $inc: { ballots: 1 } })`; a miss ⇒ `NOT_POLLING`.
6. `Vote.create({ electionId, voterId, candidateKey, day })`. On E11000, `withRequestKey` re-runs once and step 4 names the refusal.
7. `city = City.findById(home)`; `op = applyPersuasion(city.opinion, { factionId: home, swing: 0.5, homeFactionId: home })`; `City.updateOne({ _id }, { $set: { opinion, ...(transition ? { morale } : {}) } })`.
8. Return the result, with the knock-on *Coalport morale +0.5 → 84.5 %* and the state if it was crossed.

**propose**

1. `term = OfficeTerm.findOne({ councilKey(home, d.cycle), 'holder.characterId': c._id })` ⇒ `NOT_COUNCILLOR`.
2. Refuse unless `d.council.voting` (`COUNCIL_CLOSED`); for an unknown ordinance (`UNKNOWN_ORDINANCE`); on `pc < 20`.
3. `Ordinances.updateOne({ _id: councilKey, status: 'open', 'items.ordinanceId': { $ne: id }, 'items.movedBy.characterId': { $ne: c._id }, 'items.3': { $exists: false } }, { $push: { items: {…} } })`. On a miss, re-read and return `ALREADY_ON_PAPER`, `ALREADY_PROPOSED`, `PAPER_FULL` or `COUNCIL_CLOSED`.
4. Spend the PC as in declare, 20.

**councilVote**

1. The term and window checks as in propose.
2. `choice` must be an item on the paper or `'against'` ⇒ else `NOT_ON_PAPER`.
3. `Ordinances.updateOne({ _id, status: 'open', 'votes.characterId': { $ne: c._id } }, { $push: { votes: { characterId, name, seat, choice, at } } })`. On a miss, re-read and return `ALREADY_COUNCIL_VOTED` or `COUNCIL_CLOSED`.

**The branch's endorsement in play** (`branchEndorseIfFiled(session, c, today)`)

- Called from `actionService.resolveAndWrite` and `jobService.takeJob` when this write completes the third order (`allDone`) on a nominations day.
- It runs `Candidacy.updateOne({ electionId, characterId: c._id, status: 'filed', branch: null }, { $set: { branch: { day, at } } })` in the same session.
- It returns whether it wrote, and the result carries `effects.branchEndorsement` (§10.2).

`withRequestKey` gains one change: on E11000 with no stored result, retry (`continue`) instead of throwing, so the domain pre-check names the refusal (ADR 0018).

### 8.3 Views

```ts
interface PoliticsSummaryView {                  // the Polling Day row, the HQ council card, the Paper tab dot (one builder)
  cityId: string; cityName: string; cycleDay: number; phase: 'nominations' | 'polling';
  state: 'belowRank' | 'ballot' | 'councilSits' | 'filed' | 'stand' | 'count' | 'voted' | 'nominations';
  //   first match in that order (§20.1 Q6)
  closesAt: number;                              // the boundary ending today's window
  pollsOpenAt: number | null; countAt: number | null; divideAt: number | null;
  endorsements: { n: number; needed: 2; branchWillMakeUp: boolean } | null;    // 'filed'
  branchLine: boolean;                           // filed, and today's three orders are done
  votedFor: string | null;
  count: { winner: string; npcSeats: number; seats: 7; turnout: { voters: number; eligible: number } } | null;
  inForce: { ordinanceId: string; name: string; daysLeft: number } | null;
  rank2Title: string; fxpToRank2: number | null; standCost: 10;
  route: '/council/slate' | '/council/ballot' | '/council/count' | '/council' | null;
  dot: boolean;                                  // 'ballot' or 'councilSits'
}
interface CandidateView {
  key: string; candidacyId: string | null; kind: 'player' | 'npc'; name: string;
  avatar: AssetView | null; factionId: FactionId;             // NPC: null avatar (the ward mark)
  rankTitle: string | null;                                   // null = 'ward'
  standing: { name: string; cityName: string; successes: number };
  wardVote: number; platform: string;
  endorsements: { n: number; needed: 2; branch: boolean; branchCounts: 1 | 2; names: string[]; more: number } | null;
  you: boolean; endorsedByYou: boolean;
  canEndorse: { ok: true } | { ok: false; reason: 'SELF' | 'ALREADY' | 'RANK' | 'PC' | 'CLOSED' } | null;
}
interface ElectionView {
  electionId: string; cityId: string; cityName: string; phase: 'nominations' | 'polling';
  nominationsCloseAt: number; pollsOpenAt: number; countAt: number;
  candidates: CandidateView[];                   // players by filing, then NPCs by profile (provisional 9 − p in nominations)
  declare: { requirements: Array<{ id: 'rank' | 'known' | 'endorsements'; met: boolean; rankTitle?: string;
               fxpToGo?: number; successes?: number; need?: number }>;
             platforms: Array<{ id: string; line: string }>; cost: 10; canDeclare: boolean;
             reason: GameErrorReason | null } | null;                      // nominations, no candidacy yet
  candidacy: { candidacyId: string; status: 'filed' | 'withdrawn' | 'struck' | 'standing';
               endorsements: CandidateView['endorsements']; branchLine: boolean; canWithdraw: boolean } | null;
  ballot: { cast: { key: string; name: string } | null; canVote: boolean; reason: GameErrorReason | null } | null;
  pc: number;                                    // no totals and no ballot count, ever (ADR 0019)
}
interface CountView {
  electionId; cityId; cityName; countDay: DayKey;
  rows: Array<CountRow & { avatar: AssetView | null; you: boolean; yourVote: boolean }>;
  turnout: { voters: number; eligible: number }; seats: 7; npcSeats: number;
}
interface CouncilView {
  councilKey; cityId; cityName; termEndsAt: number; npcSeats: number;
  seats: Array<{ seat; kind; name; avatar: AssetView | null; rankTitle: string | null; standingName: string;
                 you: boolean; votedFor: string | null }>;               // players once cast; NPCs after the division
  window: { voting: boolean; divideAt: number; opensAt: number | null };
  paper: { status: 'open' | 'divided';
           items: Array<{ n; ordinanceId; name; line; effectLine; movedBy: { kind: 'branch' | 'player'; name; you: boolean };
                          votes: number | null; passed: boolean }>;
           against: number | null; rose: boolean };
  you: { councillor: boolean; voted: string | null; proposed: string | null;
         canPropose: boolean; proposeReason: GameErrorReason | null; pc: number };
  menu: Array<{ ordinanceId; name; line; effectLine; onPaper: boolean }> | null;   // councillors while voting
  inForce: { ordinanceId; name; line; daysLeft: number } | null;
}
interface FrontPageView { avatar: AssetView | null; caption: { name; rankTitle; cityName };
                          animate: boolean; headline: string; deck: string; count: CountView }
interface OrdinanceTagView { ordinanceId: string; name: string;
                             kind: 'energy' | 'chance' | 'iron' | 'fxp' | 'swing' | 'standing'; value: number }
CityView     += { morale: { factionId; share: number; state: MoraleState } | null;
                  ordinance: { ordinanceId; name; line; daysLeft: number } | null };
LocationView += { council: PoliticsSummaryView | null };            // on the home faction's HQ only
ActionView   += { tags: OrdinanceTagView[] };   // energy, energy3 and preview are live (costs and the Open Doors bonus)
CharacterView += { office: { cityId; cityName; seat: number; termEndsAt: number } | null;
                   politicsWaiting: 0 | 1; restedCap: number };
DeskView     += { stipend: {…} | null; deposits: {…} | null; salary.ordinance: {…} | null; rested.cap from the modifiers };
```

### 8.4 The settlement v3 (`computeSettlement`, ADR 0005, 0020, 0021)

Reads, in the settlement's transaction:

- the home city (already read; now with `ordinance`, `ordinanceHistory`, `morale`);
- `OfficeTerm.find({ 'holder.characterId': c._id, toDay: { $gt: c.day.settled } })`;
- `Candidacy.find({ characterId: c._id, deposit: 'due' })`.

It then computes, all through pure functions:

1. **Salary:** `settleDays` with `payOn(day)`, using the modifiers of `ordinanceOnDay(history, day)`.
2. **Stipend:** `stipendBoundaries(terms, settled, today)` × (10 PC, 20 FXP), then `applyGains`.
3. **Refunds:** +10 PC per candidacy due, then `Candidacy.updateMany({ _id: { $in }, deposit: 'due' }, { $set: { deposit: 'returned' } })`.
4. **Offices:** the terms with `fromDay ≤ today < toDay`.
5. **Energy re-base:** `projectEnergyThrough(state, dayStart(today), capOn)`. `restedBanked` is its Rested minus the stored Rested.
6. **Orders:** `startOrders(…, welcome, moraleState === 'unrest' ? faction.restoreOrders : undefined)`.
7. **Edition:** as slice 2, with the `priority` on each headline and the new desk rows.

The version guard and the unique edition index are unchanged.

### 8.5 Actions and jobs with modifiers

- `resolveAndWrite` reads the home city in its snapshot, since every action is in the home city in slice 3.
- It builds `cityModifiers` and passes them to `resolveTier1Action`, `resolveTraining` or `resolveShift`.
- When the action gives opinion, it applies the swing as today (ADR 0010) and sets `morale` on a threshold crossing.
- When `allDone`, it calls `branchEndorseIfFiled`.
- `job.take` also calls `branchEndorseIfFiled`. A switch's 2 Energy is unaffected.
- `city.get` builds the tickets from the same helpers: the live cost, the preview with the Open Doors bonus, and `tags`.

### 8.6 Test hooks (only with `E2E_TEST_HOOKS`, which requires `DB_MODE=memory`)

| Route | Body | Does |
|---|---|---|
| `POST /api/test/clock` (extended) | `{ advanceMs }` or `{ advanceTo: { cityId, cycleDay, hour = 9 } }` | Moves the offset clock forward only, to the next instant at `hour`:00 UTC on a day with that cycle day |
| `POST /api/test/city-day` | — | `runCityDay(content, now())`: what the worker does |
| `POST /api/test/character` | `{ fxp?, successes?, pc? }` | For the session user's character: `fxp`, `rank = rankForFxp`, `localStanding[home] = successes`, `pc`, `version + 1` |

---

## 9. Scheduled jobs (Agenda)

- **`city-day`** (`apps/server/src/jobs/cityDay.ts`), defined in `worker.ts` with `{ concurrency: 1, lockLifetime: 10 min }`.
- It is scheduled with `agenda.every('1 0 * * *', 'city-day', undefined, { timezone: 'UTC' })`, which is idempotent: one job document by name. It also runs `agenda.now('city-day')` at start.
- The handler is `runCityDay(loadContent(), Date.now())`. A failure in one city goes to Sentry, the other cities still run, and the job fails afterwards so Agenda records it.
- **Idempotency** comes from ADR 0017:
  - each boundary is a transaction guarded by `world.settledDay: d − 1`;
  - derived documents have unique natural keys;
  - a rerun, a concurrent API request or two workers settle each boundary once.
- **Worker down:** the next request in each city catches up boundary by boundary, and the worker catches up when it returns.
- **In development** (`pnpm dev:mem`) no worker runs; the lazy path is enough. `pnpm dev:worker` (tsx) is added for anyone who wants it.

---

## 10. The result modal: how the breakdown is produced

### 10.1 Political acts (`ResultModal kind: 'political'`, screens §9)

```ts
interface PoliticalResult {
  kind: 'political';
  act: 'ballot' | 'declare' | 'endorse' | 'withdraw' | 'propose' | 'councilVote';
  stamp: { label: string; tone: 'success' | 'partial' };      // 'Ballot cast' · 'Filed' · 'Endorsed' · 'Withdrawn' (partial) · 'Moved' · 'Voted'
  paper: { name: string; shortName: string };                  // the masthead strip in place of the art panel
  place: { cityId: string; cityName: string };
  headline: string; body: string;                              // content texts, resolved on the server
  until: number | null; at: number | null;                     // for the {until} / {at} tokens
  knockOns: {
    pc: { before: number; after: number } | null;              // "−10 PC · 35 left"
    morale: { cityName; factionId; before: number; after: number; stateBefore; stateAfter } | null;   // "+0.5 → 84.5 %"
    endorsements: { name: string; n: number; needed: 2 } | null;
  };
  performedAt: string; idempotencyKey: string;
  character: CharacterView;
  view: ElectionView | CouncilView;                            // the refreshed screen, so no second fetch is needed
}
```

- `buildPoliticalResult` (`services/politicalResult.ts`) fills the text from `content.politics.results[act]` with the placeholders of §4.3. The knock-on lines are numbers, formatted by the client's copy (as slice 1 does for effects).
- The whole object is stored in `requestLogs.result`, and a retry returns it unchanged (ADR 0018).
- The modal has no *How it went* and no reward tiles, and only one button: **Continue**.

### 10.2 Actions under ordinances and morale (`ActionResult`, GDD §13.1a)

| Where | What is added | Example (a Coalport canvass under Open Doors, *Fired up*, with a Party order) |
|---|---|---|
| `attempts[].check.bonuses` | `ordinanceCheckBonuses` | *Known in Coalport +6 %* · **Open Doors +4 %** → 76 % |
| `rewards.fxp.parts` | order, morale, Public Meetings | *Party order +2* · **Fired up +1** |
| `rewards.iron.parts` | Rested, Ward Fund | *Rested +5* · **Ward Fund +5** |
| `rewards.xp.parts` | Rested | unchanged meaning |
| `bonusTags` | one tag per ordinance or state that applied | `{ id: 'ord.open-doors', label: 'Open Doors', note: '+4 %' }`, `{ id: 'morale.fired', label: 'Fired up', note: '+10 % FXP' }` |
| `effects.morale` **new** | only when the action crossed a threshold | *Coalport: Fired up · +10 % Faction XP at home* |
| `effects.branchEndorsement` **new** | `{ endorsements: n, needed: 2, smallBranch }` | *All orders carried out · the branch endorses you* |
| `action` cost lines | the live cost with the ordinance named | *Rally Permits: 10 Energy* |

A shift's Iron line is `base` (the unmodified half pay) plus `parts`: *Streak +43*, *Public Works Order +11* (or *Ward Fund −27*). The tiles still add up.

### 10.3 The count, the division and the seat

These produce no modal (screens §9: the front page is the seat's moment).

- `CountView.rows` carries `wardVote`, `endorsementsCounted`, `votes` and `total` per row, so the table shows every number. The formula line under it is fixed copy.
- The division's tallies (player and NPC votes per item) are in `CouncilView.paper`.

---

## 11. The Morning Paper v3

| Section | Source | Notes |
|---|---|---|
| Front page | `FrontPageView`, live | Only on the morning of a count in which the caller took a seat (a term with `fromDay === today`). The headline is `hl.seat-top` or `hl.seat-won` of the city's paper. `animate` until `paper.markRead` sets `frontPageSeenAt` |
| Headlines | `mergeHeadlines(stored, live political)` | The seat headline is left out when the front page shows (§20.1 Q14) |
| Party orders | as slice 2 | The *Restore the base* pair during Unrest, signed by the secretary |
| **Polling Day** | `PoliticsSummaryView`, live | Between orders and Letters, every edition (the welcome edition included) |
| Letters | as slice 2 | Chapter 2 if it ships (§19.2) |
| Your desk | stored + live | + *Stipend*, *Deposit returned*, the salary's ordinance line; Rested shown against the day's cap |

`CharacterView.politicsWaiting` drives the Paper tab dot beside `lettersWaiting`: 1 while a ballot or a councillor's council vote is open and not cast; never for nominations. It costs one indexed read on polling days, and one for a councillor on days 0–1.

---

## 12. Client (`apps/client`) and UI (`packages/ui`)

### 12.1 Routes

| Route | Screen | Data |
|---|---|---|
| `/paper` | + the Polling Day row, and the front page with the sticky **To the council** | `paper.today` |
| `/council/slate` | Declare card or candidacy card, the slate | `council.election` |
| `/council/ballot` | The ballot, the sticky CTA | `council.election` |
| `/council/count` | Header and `CountTable` | `council.count` |
| `/council` | Seats, order paper, menu sheet, sticky vote CTA | `council.chamber` |
| `/city/$cityId` | + plate lines, ticket tags, the HQ `CouncilCard` | `city.get` |
| `/me` | + the office line; *Political Capital 45 · declare 10 · endorse 10 · propose 20* | `character.me` |

Each new route resets the scroll on entry (the QA slice 2 m4 lesson) and is guarded by `requireCharacter`. After a mutation the client renders the `view` from the result and invalidates `character.me`, `paper.today` and `city.get`.

### 12.2 `packages/ui` additions

The components have plain props and no tRPC:

- `PollingDayRow`
- `FrontPage` (a CSS halftone: `grayscale(1) contrast(1.15)` plus a dotted overlay at 30 %; the `Stamp` animates once with `animate`)
- `CandidateRow`, `Slate` (slate and ballot modes), `CountTable`
- `CouncilCard`, `SeatGrid`, `OrderPaper`, `OrdinanceRow`, `OrdinanceMenu` (a `BottomSheet`, at most 80 dvh)

Changed components:

- `ResultModal` gains kind `political` (the masthead strip, the stamp, the knock-ons, Continue).
- `Ticket` gains tags.
- `Plate` gains the morale word, with *Unrest* in the failure colour.
- `format.ts` gains `formatUntil` and `formatAt`.
- `copy.ts` gains the screens §11 strings.

**Double taps (QA slice 2 M1).** Rows are keyed by candidate key or ordinance id. Every political CTA stays disabled from the tap until the new view has rendered. The ordinance menu disables all rows after the first tap and closes on the modal.

### 12.3 Layout

Screens §10: full-width rows of at least 56 px; sticky CTAs padded for the safe area; no horizontal scroll at 360 px; the count table's six columns set in Oswald at 13 px; the front page's photograph, stamp, headline and deck above the fold on a 375 × 667 screen; desktop in the paper's 640 px column.

---

## 13. Security

| Threat | Guard |
|---|---|
| Voting or endorsing elsewhere, or as someone else | No input names a city or a character. The session's character and its `homeCityId` decide everything. `candidateKey` must be on *that* election's frozen ballot, and `candidacyId` must belong to it |
| Voting before Rank 2, standing without Rank 3 or Known, or while sitting | Checked in the transaction from the stored character and `officeTerms`, never from the client |
| Forged seats or council powers | Only the city day creates `officeTerms`. Propose and council votes re-read the term in the transaction. `offices[]` is for display only |
| Double votes, double endorsements or two candidacies | Unique indexes and conditional updates (ADR 0018), in the same transaction as the PC spend |
| Acting outside a window | The phase comes from `dayKey(ctx.now())`. Window-bound writes are serialised with the closing boundary (ADR 0018) |
| Learning others' ballots or live totals | ADR 0019: no view carries another voter's row, `elections.ballots` or totals before `counted`. Tested on the wire (§14) |
| Spending PC you don't have | `pc: { $gte: cost }` together with the version guard |
| Test hooks in production | Registered only with `E2E_TEST_HOOKS=1`, which `env.ts` refuses unless `DB_MODE=memory` |
| Names in public lists | Endorser and candidate names are the character names (2–40 characters, slice-2 §14.2). No free text: platforms are content |

---

## 14. Testing

| Layer | What |
|---|---|
| Rules | §6.9 |
| Content | The real data validates. Every §4.2 cross-check has a failing fixture (an effect over its bound, two effects of one kind, eight NPCs, profiles out of order, a crisis template in the rotation, a political headline with a slice-1 condition, a missing paper template). Design-document comparisons, word for word (§4.4). Offsets and the §3.1 dates |
| DB | Unique indexes on `elections`, `candidacies`, `votes`, `officeTerms`; migration 003 twice (no change the second time); a transaction touching all five new collections commits on the memory replica set |
| Server — city day | Bootstrap on each cycle day 0–4 (the council, the ordinance in force, the election phase). `runCityDay` ×3 concurrently plus a `paper.today` → one set of every derived document and morale moved once. **Worker down:** 12 days with no job, then one request → every boundary in order; the resulting city, elections, terms and papers deep-equal a run where the job ran every day (two database names, the same seeds injected). A throwing `processBoundary` (injected) → the request still answers (degrade), and the next run completes the boundary |
| Server — full cycle (test clock) | Bootstrap on Coalport day 0 → a seeded Rank 3 player at 200 Successes declares (−10 PC) → a colleague endorses and the branch endorses via the three orders → the close strikes a second, unendorsed candidate (deposit due, returned at that player's next settlement, shown on the desk) → the ballot has 1 player + 8 NPCs in order → three voters (+1.5 morale) → the count: the table, turnout 3 of *n*, seats, +2 morale → the front page (`animate` true, then false after `markRead`) and the political headlines of the Clarion, Sentinel and Gazette (the same cycle run for a Vanguard and an Alliance player) → propose Open Doors (−20 PC) and vote → the division passes it with the NPCs → the ticket preview +4 % and a canvass result with the *Open Doors +4 %* row → expiry after five days → the stipend: 50 PC and 100 FXP over the term, `completed: true` |
| Server — the count twice and races | The count run twice (sequentially and concurrently) → identical result. **Concurrent votes:** 10 voters with `Promise.all` → 10 rows, `ballots` 10, morale exactly +5.0. One voter ×5 with one key → one row and five identical results. One voter with two keys → one row and `ALREADY_VOTED { name }`. **Vote vs count:** a vote whose clock sits 1 ms before the boundary races `settleCityDay` at 1 ms after, 20 iterations → every stored vote is in the result, and every refused vote got `NOT_POLLING`. The same for declare vs close and council vote vs division |
| Server — away player | A councillor seated and then absent the whole term: the NPCs vote the branch's motion, and on return the desk shows *Stipend +50 PC +100 FXP*, the term is completed, and no PC or Iron was taken. A candidate who filed, was endorsed and left: still on the ballot, can win, and the front page is waiting when they return (days later: the count view is still available, and the front page shows only on the count morning, §20.1 Q14). A struck candidate away: the deposit returns on the next touch |
| Server — acts | Every refusal of §8.1 with nothing written (PC unchanged, no documents). `KEY_REUSED` across kinds. Endorsing yourself; the fourth proposal; proposing an item already on the paper; the in-force ordinance renewed; voting *Against all*; withdrawing, then declaring again in the same cycle → `ALREADY_FILED { status: 'withdrawn' }` |
| Server — settlement and modifiers | Salary across a Ward Fund week and back; Rested 250 kept after the Rest Day Order expires; crisis orders during Unrest paying 40; *Stands Firm* the morning after leaving Unrest; *Fired up* parts on a canvass and none on a shift; Ward Register ×2 writes 2 per Success |
| Server — secrecy | During the polls, JSON-serialise every procedure's output for a second player (`council.election`, `paper.today`, `city.get`, `character.me`, `council.count` → null for the open election) and assert that no other voter's choice, no `ballots` and no totals appear. After the count, the rows carry totals only |
| UI | Fixtures: `PollingDayRow` (every state), `FrontPage` (animate on/off), `Slate` (nominations and ballot), `CountTable` (the line, you, your vote, ward marks), `OrderPaper` (open and divided), `ResultModal` political (each stamp) |
| E2E (Playwright) | `council.spec.ts` (§14.2); existing specs unchanged |

### 14.1 Playtest report: elections and the first seat

`pnpm report:playtest` gains an **elections** section. It reads the domain collections (`elections`, `candidacies`, `votes` aggregated only, `officeTerms`, `ordinances`, `cities.moraleLog`), `characters`, `actionLogs` and `paperEntries`. It never reads `requestLogs`, whose 7-day TTL would lose data (QA slice 2 m2).

- **Per election** (city, cycle, dates):
  - players filed / withdrawn / struck / standing, and NPCs standing;
  - member and branch endorsements, and small-branch doubles;
  - turnout (voters / eligible) and the share of ballots cast for NPCs;
  - seats won by players;
  - the top total, the seventh total, and the closest player's margin;
  - morale at the count.
- **Per council term:**
  - player councillors;
  - proposals, and council votes cast / player seats;
  - passed ordinance or *rose without a motion*;
  - the ordinance's effect in play: actions and shifts taken in the city while it was in force.
- **First vote (the day-2 promise, App. C #21):**
  - per player: the day of Rank 2 → the day of the first ballot (target ≤ 2 days; the distribution 0 / 1 / 2 / more);
  - the ballot's position in the session: minutes from the first paper read on a polling day to the ballot (target under a minute);
  - voters on every polling window they were eligible for.
- **First seat (the slice question, in numbers):**
  - Rank 3 → first candidacy (days); first candidacy → first seat;
  - **front page seen** (`frontPageSeenAt − dayStart(countDay)`, hours) and the share seen on the count day;
  - **the act in the chamber the same session** (the time from `frontPageSeenAt` to the first propose or council vote; the share within 30 minutes);
  - council vote rate;
  - session length on the count day against the player's median;
  - **next-day return rate for winners, losers, voters and eligible non-voters**.
- **Morale:** the days in each state per city, threshold crossings, and the first *Fired up* day.
- **Contention:** `txAttempts` for actions around 00:00 UTC, and city-day transaction retries (logged by the service).

### 14.2 `council.spec.ts` (phone; the clock is shared, so it runs as one test)

1. `POST /api/test/clock { advanceTo: { cityId: 'coalport', cycleDay: 0 } }`, then sign up and arrive (the Collective, the slice-1 answers).
2. `POST /api/test/character { fxp: 2000, successes: 200, pc: 45 }`, then reload the paper. The Polling Day row reads *Stand for the council · 10 PC*.
3. Tap it → the slate with three ticks → **Declare · 10 PC** → the modal stamped *Filed* → Continue. The candidacy card reads *endorsements 0 / 2* and *The branch will make up the number*.
4. To the city: two canvasses at pin 1, the HQ committee, then *Take the job* at the Mill Gate. The third order's modal shows *All orders carried out · the branch endorses you*. The HQ council card reads *2 / 2*.
5. `advanceTo cycleDay 2` and `POST /api/test/city-day`, then `/`. The paper's Polling Day row reads *Cast your ballot* and the Paper tab has its dot. On the ballot (at 360 × 640, no horizontal scroll): nine rows, yours first, eight *ward* rows, and no totals. Select yourself → **Cast your ballot for Mara Lenk** → the modal *Ballot cast* with *Coalport morale +0.5 → …*.
6. `advanceTo cycleDay 0` with **no** city-day hook (the lazy path), then `/`. The front page shows: the halftone, **ELECTED** (animated), *Mara Lenk Tops the Poll in Coalport*, and the count table with *you* and *your vote* on one row. Reload: no animation. At 375 × 667, the stamp, headline and CTA are in view.
7. **To the council**: the seat grid (*NPC seats 6 / 7*) and the order paper with *Shift Hours Order · the branch's motion*. **Propose · 20 PC** → Open Doors → *Moved*. Select Open Doors → **Vote for Open Doors** → *Voted*.
8. `advanceTo cycleDay 2` → the city. The plate reads *Ordinance: Open Doors · 5 days left*. The pin-1 canvass ticket has the tag *Open Doors: +4 %* and odds of **82 %** (66 + 12 + 4). A ×1 → the modal's breakdown has an *Open Doors +4 %* row. The paper carries *Council Passes Open Doors*.

---

## 15. Risks

| Risk | Mitigation |
|---|---|
| A bug in the city day blocks a whole city | Degrade path (ADR 0017): Sentry, the request goes on, views are live, and acts return `ELECTION_NOT_READY` until the job succeeds. The catch-up and injected-failure tests |
| The settlement, the game's most-run write, grows (stipend, refunds, re-base, crisis orders, salary by day) | Every addition is a pure function with its own tests. Slice-1/2 settlement tests stay green, with only the stored-Energy assertions updated (ADR 0021) |
| Existing tests that cross a boundary now also see the city day (the drift moves Coalport's share; a bootstrap creates documents) | T7 updates any slice-1/2 assertion of an exact share after a day change to expect the drift, and `seedRecruit` needs no change (the first touch bootstraps the city at the test clock) |
| Races at the boundary lose a ballot or a declaration | ADR 0018's serialisation, and the race tests in §14 |
| The first seat needs 13–17 days of play, so a short playtest never sees one | §20.2 Q2: run the playtest ≥ 3 weeks, or seed selected testers with an admin script (not the test hook) |
| Transcribing ~45 headlines per paper ×3, 27 NPCs, 10 ordinances and 6 modals | Word-for-word comparison tests against the design documents |
| Double taps on one-tap political buttons (QA slice 2 M1) | §12.2: keyed rows, CTAs disabled until the new view renders, and server refusals that carry the settled state |
| Hot documents (the election during the polls, the city, a popular candidacy) | Low rates (one ballot per member per cycle); ADR 0022's reassessment; `txAttempts` in the report |
| Clock skew between the worker and the API | The job runs at 00:01; skew only moves which side of midnight a last-second act lands on (ADR 0017) |
| Agenda's real clock against the test clock | Tests never rely on Agenda: `runCityDay` directly or the hook |
| `ActionResult` stored before slice 3 has no `parts` | Optional field, and fixtures of old results in the UI tests |
| An NPC-dominated council looks like a rubber stamp | By design at low population (the ratio is shown). The report measures proposals and passed player motions |

---

## 16. Idempotency and atomicity summary

- **City day:** one transaction per city per boundary, guarded by `world.settledDay: d − 1`; derived documents have natural unique keys; the job and the request path share the function (ADR 0017).
- **Declare, withdraw, endorse, vote, propose, council vote:** an ADR 0008 request key for replay, plus a natural-key set-once guard in the same transaction as any PC spend, and a write to the document the closing boundary writes (ADR 0018).
- **The branch's endorsement:** a conditional `$set` (`branch: null`) inside the action or job transaction that completed the orders.
- **Stipend and refunds:** inside the version-guarded settlement; a refund flips `due → returned` in the same transaction (ADR 0020).
- **Front page seen:** a conditional `$set` where null (`paper.markRead`).
- **Everything from slices 0–2:** unchanged.

---

## 17. Deliberately left out of slice 3

| Left out | Why / where |
|---|---|
| Battleground councils, D'Hondt, Irongate districts, residence | Slice 4 (the calendar and keys already take any offset) |
| The Governor, the Chair's whip, NPC defections, the national weight | Slice 7 (the branch's motion stands in as the whip) |
| Tenure after a faction switch | No switching exists; the rule is recorded for §23.4 |
| The same-network rule, the 24 h audit, recounts | Slice 9 (ADR 0019 keeps the data it needs) |
| Running totals or a live turnout count | Appendix C #25; a view change later |
| Free-text platforms, candidate statements | Chat moderation (Appendix C #7) |
| Rival morale pressure, rival spy pay | Slice 5 |
| Legacy entries for *Stands Firm* | Slice 8 |
| Notifications when the count lands | Not needed: the paper is due on the new day; no push in the MVP |
| *While You Were Away* (a digest after 2+ days) | Not in slice 3's question; the count view covers the last election |
| Ordinances outside the ten (Curfew, Police Patrols, …) | Their systems arrive later (GDD §15.3) |
| A `directives` collection | ADR 0009 stands; crisis orders are templates |
| SSE or live updates on the slate | Refetch on focus and after each act is enough for short sessions |

---

## 18. Task list (in order; each task leaves the repo green and is one commit)

**T0. Prerequisite: the slice-2 QA fixes.** M1 (double tap), M2 (Ashford pins), m2 (the funnel's job takes), m3 (names, *A Newcomer*), m4 (scroll reset), PC in the HUD on phones (slice-2 §14.1), m1 (the faction text colours), and the copy nits of slice-2 §14.3. Slice 3's screens rely on M1's pattern and m4.

**T1. Rules: calendar and council maths.** `calendar.ts`, `council.ts` (`COUNCIL`, keys, `boundaryWork`, the slate, the close, the count, `divide`, `stipendBoundaries`); tests (§6.9 calendar, council, count, divide, stipend).

**T2. Rules: morale and political headlines.** `morale.ts`, `PoliticalCondition`, `selectPoliticalHeadlines`, `mergeHeadlines`, `POLITICAL_PLACEHOLDERS`, `ORDINALS`; tests.

**T3. Rules: ordinances and modifiers in play.**

- `ordinances.ts` and `ORDINANCE_BOUNDS`;
- `projectEnergy` without shrinking, and `projectEnergyThrough`;
- `computeRewards` with parts;
- the ordinance changes to `resolveTier1Action`, `resolveTraining`, `resolveShift` and `settleDays` (§6.6);
- `startOrders` crisis and `orderRewards` with `doneFxp`;
- the new view, result and error types;
- tests, including the unchanged slice-1/2 numbers with no modifiers.

**T4. Content: schemas and cross-checks.** §4.1–4.2, `GameContent` accessors, failing fixtures.

**T5. Content: data.** Ordinances, the 27 NPCs, platforms, branch motions, offsets, crisis templates (placeholder text until §20.1 Q10 is answered, marked `TODO(game-designer)`), political headlines for three papers, the result texts, copy; comparison tests against both design documents.

**T6. DB.** The five models, the new `cities` and `characters` fields, `paperEntries` and `requestLogs` changes, indexes, migration 003; tests.

**T7. Server: the city day.** `cityDay.ts` (`settleCityDay`, `processBoundary`, `bootstrap`, `ensureCityDay`, `runCityDay`); `loadCharacter`, `ensureSettled` and `arrival.join` ordering with `LoadedCharacter.city`; the degrade path; the `city-day` job in `worker.ts` and `pnpm dev:worker`; tests (bootstrap, twice, concurrent, catch-up, degrade).

**T8. Server: the settlement v3.** Stipend, refunds, `offices`, the Energy re-base, salary by day, crisis orders, desk rows; tests; the slice-1/2 settlement tests updated where they assert stored Energy.

**T9. Server: modifiers in play.** `action.perform`, `job.take` (the branch's endorsement, morale crossings, parts, tags); `city.get` v3 (tickets, plate, HQ card); tests.

**T10. Server: the race.** `council.election`, `declare`, `withdraw`, `endorse`, `vote`; the `withRequestKey` E11000 change; `buildPoliticalResult`; tests (acts, refusals, concurrency, secrecy).

**T11. Server: the chamber and the count.** `council.chamber`, `propose`, `councilVote`, `council.count`; tests.

**T12. Server: the paper v3 and the views.** `politicsService` (the summary, facts, the front page), `paper.today`, `paper.markRead` (`frontPageSeenAt`), `CharacterView` v4 (`office`, `politicsWaiting`, `restedCap`); tests.

**T13. Server: the integration suite.** The full cycle on the test clock for all three factions, the away player, worker down, the boundary races (§14).

**T14. UI package.** §12.2 components with fixtures and smoke tests; `formatUntil` and `formatAt`.

**T15. Client.** The paper (Polling Day, front page), `/council/*` routes, the HQ card, plate lines, ticket tags, the political modal, the Me tab; the §12.3 layout at 360, 375 and 1440.

**T16. E2E.** The test hooks (`advanceTo`, `city-day`, `character`); `council.spec.ts`; CI green.

**T17. Report.** The §14.1 elections section, with a pure builder and fixture tests, as `funnel.ts` does.

**T18. Docs.** README (the worker and `dev:worker`), a **Deviations** section at the end of this file, ADR statuses.

**T19 (optional, not blocking). Ambition chapter 2.** *Stand where he stood* as content once the designer delivers it (§19.2); a rules change only if it keys off the ballot (`requires.ballotCast`).

---

## 19. Answers to the design's questions

### 19.1 Politics doc §15

1. **The count as a world event.** Both runners, as the design suggests, over one idempotent function (ADR 0017).
   - The Agenda job runs at 00:01 UTC (a minute's margin for clock skew) and at worker start.
   - Every character settlement first ensures its city's day. That is stronger than a fallback: it guarantees that no resident acts on the new day before the count, which keeps the ward vote and morale exact.
   - A player opening the paper at 00:00:30 triggers the count themselves if the job hasn't run, and sees the result.
2. **The paper's political sections live at read.** Yes (ADR 0023). The Polling Day row, the front page and the count are views. Political headlines are live templates merged by priority into the stored edition. `frontPageSeenAt` is set on `paper.markRead`.
3. **Collections.** As suggested, with these refinements (ADR 0020, §5):
   - candidacies have their own collection;
   - endorsements are public entries on the candidacy, guarded by `endorsementsGiven[]` on the endorser;
   - `officeTerms` has one document per seat per term, NPCs included;
   - `ordinances` holds the order paper per council term, including the division;
   - the city keeps the ordinance in force and a short history.
4. **Idempotency.** The natural-key set-once guard is the exactly-once mechanism, as suggested. Each act *also* carries an ADR 0008 request key so a retry returns the identical modal (its knock-ons, such as *35 PC left*, can't be recomputed later). The new point is that each act writes the document its window's closing boundary writes, so no act commits after its window has closed (ADR 0018). PC is spent in the same transaction with `pc ≥ cost`.
5. **Ordinance effects in rules.** Yes: a closed DSL with GDD bounds, validated by content, applied as named check bonuses, reward parts and live costs (ADR 0021). One rule added: cost ordinances change the cost only (§20.1 Q11).
6. **Standing ×2 at write.** Yes, per Success inside the ×N loop, with nothing retroactive.
7. **The Rested cap.** Yes. Banking never shrinks the pool. The settlement re-bases Energy per day with each day's cap, so an absence that spans the order's expiry is also exact (ADR 0021).
8. **Seeding.** A lazy bootstrap when a city has no `world` field: the NPC council, the branch's motion in force, the current election. It runs at worker start after the deploy, or on the first request. Characters get `offices: []` and `endorsementsGiven: []` from migration 003, and nothing else.
9. **Ambition chapter 2:** §19.2.
10. **PC in the HUD on phones:** already answered with the slice-2 QA fixes (the bar, every width, once PC > 0). It lands in T0.

### 19.2 Ambition chapter 2 (*Stand where he stood*): recommendation

**Include it in slice 3 as content only, as the last task (T19), and don't let it gate the playtest.**

- **It lands inside the playtest window.** Seven days after chapter 1 and at Rank 2, it unlocks about day 8. That is after the first ballot (days 2–4) and before the first candidacy (days 10–14), which is exactly the gap where a player has voted but can't yet stand.
- **It raises the stakes of the moment the playtest is judging.** A chapter about standing where the father stood gives the first candidacy and the first seat a personal reason. The front page then answers a promise the player made at the deathbed.
- **It costs almost nothing in code.** The slice-2 engine (ADR 0013) plays any chapter of the same shape (a choice, a check with two approaches, a keepsake) from content. If the designer wants it to key off the ballot rather than Rank 2, that is one optional requirement (`requires.ballotCast`, read from `votes`), a small rules change in T19.
- **Keep it out if the designer's day is needed for the §20.1 answers first.** The slice question does not depend on it.

---

## 20. Questions

### 20.1 For the game designer (each has a default so the build doesn't wait)

1. **When is the ward vote read?**
   - Default: **at the count** (the Successes the candidate has at the boundary), so work during the polls counts.
   - Alternative: frozen when the polls open.
2. **The branch's endorsement when the day's orders were done *before* declaring.**
   - Default: the branch endorses at the moment of filing, the same day. The player did the work on a nominations day.
   - Strict reading: the orders must be completed while filed.
3. **An endorsement given to a candidate who then withdraws.** Default: the member's one endorsement for the cycle is spent (irrevocable, as the design says of the PC).
4. **The NPC standing label on the ballot** (*ward · Known in Coalport*).
   - Default: derived from `profile × 5` through the Standing thresholds, so most NPCs read *Trusted* or *One of Us*, consistent with their ward vote.
   - Alternative: a label per NPC in content.
5. **Ties by "Local Standing Successes" for NPCs.** Default: `profile × 5`. The end. column shows all endorsements, and the tie uses all of them; the total counts at most five.
6. **Polling Day when several states apply.**
   - Default order: below Rank 2 → *Cast your ballot* → *The council sits* (unvoted) → *On the slate* → *Stand for the council* → the count → *Ballot cast* → nominations.
   - The effect: on the count morning an eligible player sees *Stand* rather than *Polls closed* (the count is in the headlines).
7. **`hl.seat-lost`** says *Nominations open again on {weekday}*, but on the count morning the next nominations are already open. Default: `{weekday}` resolves to today's weekday. Consider rewording to *Nominations are open today*.
8. **Local times in headlines.**
   - Every *{weekday} midnight* is transcribed as `{until}`, rendered in the player's clock (*Tuesday midnight*, or *Wednesday 01:00* at UTC+1).
   - The design's example *until Saturday 01:00 for a UTC+1 player* should read *Sunday 01:00*.
   - Please confirm.
9. **`hl.moved` for the Sentinel and the Gazette** (`hl.v.moved`, `hl.a.moved`) is not written. Default until written: the Clarion's text.
10. **The *Restore the base* orders:** titles and secretary's lines for the six templates (two per faction) are needed. Default until written: *Restore the base: canvass* / *Restore the base: speak*, with the secretary's signature.
11. **Cost ordinances and rewards.**
    - Default: a cost ordinance changes the cost only, and rewards stay on the content Energy. So Reading Room training at INT 12 costs 35 and still pays 99 XP; Rally Permits is explicit.
    - Also: *Public Works* and *Ward Fund* change the two half pays, and the streak bonus stays on the unmodified pay. That is what makes economy §14.4's +22 and −54 hold; on the raised pay it would be +27.
    - And: *Shift Hours*' +2 streak steps skip odd values, so `hl.streak` at 5 can't fire during it.
12. **The salary credited at a boundary** uses the ordinance in force on the day that ended. Default: yes.
13. **`hl.polls-open` and `hl.nominations`.** Default: every day of their window (city 0).
14. **The front page and the headline block.**
    - Default: the front page sits on top; the remaining headlines follow below it, without the seat headline.
    - The front page shows only on the count morning. A winner who first opens the game a day later gets *In Print* only through the count view and the Me tab. Should it show on their first paper after the count instead?
15. **Every player councillor votes *Against all*.** By the rule, the NPCs then vote the branch's motion (the tie at zero), and it passes. Confirm, or should the NPCs follow the players against?
16. **Losing on a tie-break** gives `{margin}` = 0 (*Misses the Last Seat by 0*). A tie variant of `hl.seat-lost` is needed; default until written: *by a tie-break*.
17. **Turnout's *eligible*.** Default: every resident member at Rank 2+ at the count, active or not.
18. **`hl.filed`** is shown only when today is still in nominations (filed on day 0). A day-1 filing gets no *Files* headline, because the deck's deadline would already have passed. OK?
19. **The six result texts** (screens §9) are transcribed with `{paper}`, `{until}` and `{at}` in place of the Clarion's name and the times.
20. ***Unrest* ending mid-day** leaves the frozen crisis orders in place until the next City Day. Default: yes.
21. **Chapter 2** (§19.2): write it for T19 if the answers above come first. Should it key off the first ballot (`ballotCast`) or stay at Rank 2 as teased?

### 20.2 For the user

1. **Provisioning** (GitHub remote, Atlas, Railway/Fly, Vercel, Sentry) is still open. Slice 3 adds a hard need: the **worker is now a real second process** (`start:worker`) beside the API. The game stays correct without it (ADR 0017), but quiet cities are only counted when someone visits.
2. **The playtest needs time or seeding.** A natural first seat lands on day 13–17. Either:
   - run the slice-3 playtest for at least three weeks, which answers the first-vote half in week 1; or
   - allow an **admin script** (not the e2e hook) that lifts chosen testers to Rank 3 and *Known* on the deployed database, so seats happen in week 1.

   The second changes what the playtest measures, so it is your call.
3. **The secret ballot is secret from players, not from database operators** (ADR 0019). The choice is stored so the slice-9 audit can find vote-stacking, like a numbered ballot paper. Confirm this is acceptable, or ask for a box with no voter link, which gives up the audit of choices.
4. **Nothing new for content policy.** The designer's §16 check covers the slates and headlines; the Collective crest decision is still yours (slice-2 QA P4).
