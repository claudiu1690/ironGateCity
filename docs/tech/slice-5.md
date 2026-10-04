# Slice 5 — Risk: technical design

| | |
|---|---|
| **Goal** | At **Level 6** each home city opens its **second quarter**. A home city now has the capital's overview: quarters drawn as outlines with names, a teaser for a locked quarter, and a quarter bar. Level 6 also opens **missions**: a briefing with two or three **ways**, one choice, and Success, Partial or Failure; the way is remembered, so the second time is one tap. Illegal missions (Rank 3) raise **Heat**, which cools lazily, roll a **run-in** (one choice: Fight, Run, Talk your way out, Pay them off, or *Leave it to luck*, which is also what an unanswered run-in gets), and on a Partial or a Failure roll the **caught check**: a mark on **your record**, or **the cells** when Hot. A fight lost is **the infirmary**. At **Level 10** the train runs to **rival ground**: everything is harder, every tap can bring a run-in, the card on the way in is from the hostile deck, party work pays half again and draws on the rival's morale, and release from the cells there is a train home. Nothing a player owns is ever lost |
| **Question** | **Is risk exciting rather than punishing?** |
| **Builds on** | Slices 0–4, reviews 1–3, maps v3 and the user's district lock, as built on branch `slice-0` at `a337c5c` (`docs/tech/slice-4.md` and its Deviations), **plus the slice-4 fix round** that follows QA's current pass (this design touches no code QA is testing until phase B) |
| **Design inputs** | `docs/design/slice-5-risk.md` (the rules; cited *design §n*) · `docs/design/slice-5-screens.md` (*screens §n*) · `docs/economy.md` §19 · `docs/design/city-quarters.md` §2 · `docs/design/art-wiring-oct.md` · GDD §3.3, §6.1, §6.4, §8.4, §8.5, §11, §13.1–§13.5, §14.2, §14.6, §14.11–§14.13, §17.1, §19.1–§19.2, §20, Appendix C #15, #47–#56 |
| **ADRs** | [0031 missions](../adr/0031-missions-their-own-list-one-resolver.md) · [0032 run-ins](../adr/0032-run-ins-pending-step-and-luck.md) · [0033 Heat, Health, record, held](../adr/0033-heat-health-record-held-lazy.md) · [0034 opinion against, rival ground](../adr/0034-opinion-against-and-rival-ground.md) · [0035 home quarters](../adr/0035-home-quarters-outlines-and-overview.md) |
| **Accepted defaults** (design §22, the main session, 3 Oct 2026) | Rival ground opens at **Level 10** with no other gate · **×1 only** on rival ground · **a loss to the police is the cells** · the record's first level is **On file** · **the home-city overview** with outlines and a quarter bar · **the caught check on Partial and Failure only** |
| **Environment** | **Local only** until the end of the project. Everything is played in `pnpm dev:mem` with the dev panel (§8.6) |

Every number below is a GDD or content number. Where the design leaves a point open, this document states a default and lists the question in §22.

---

## 1. Scope

**In**

- **Second quarters** (Level 6): Coalport's Harbour, Duskwall's Pass and Ashford's Wharf, with 15 places and 35 tier-1 actions. The third quarters are teasers (*Opens with a later edition*). Each home city gets the **overview** (outlines, names, lock lines, a teaser sheet), **quarter views** held inside their frames, the **quarter bar** and a *Quarters* list.
- **Missions** (tier 2): 22 of them, six per home city and four in the capital.
  - A briefing and 2–3 ways, with the remembered way.
  - Success, Partial or Failure at the tier-2 rates (§5.5). Failure pays XP ÷ 5.
  - The difficulty ladder: 14, 16, 18 or 20 by Level, +2 in the capital, +4 on rival ground.
  - Gates: Level, Rank 3 for illegal missions, Standing, the target faction, the record.
  - The ticket's risk line: *Heat +n · {risk word} · {marks}*.
  - *Agility +¼* for a Success on an Agility way.
  - The slot-B order *Take on a mission*.
- **Heat**: lazy, four states, cooling at the residence city's rate. **The caught check.** **The record**: marks, levels, the Iron penalty on missions, the 14-day fade, *strike off* for 30 Political Capital, the seven-day escalation, the Notorious bars.
- **Health** (lazy) and **run-ins**:
  - the opponent pool, with the police half the time from *Noticed*;
  - the four rows plus *Leave it to luck*, as one choice;
  - auto-resolve after a five-minute window or at the day's turn;
  - tier-1 run-ins on rival ground.
- **The cells**: the sentence, bail (Legal Aid, Notorious, rival ground, `bailPct`), release at Heat 25, the cell's one tap.
- **The infirmary**: admission at 30, the 20-minute stay, *Walk out well*, *Discharge yourself*, the ward's one tap.
- **Rival ground** (Level 10):
  - boarding, with a card from the hostile deck (four cards, the *Watched* and *Warned* day flags, Heat);
  - +4 on every check, ×1 only, 15 % tier-1 run-ins, ×2 Heat, run-ins and caught base;
  - Party XP +50 % (+75 % in Unrest);
  - opinion against the home faction, capped at 2 points a day;
  - no orders, and the home paper with a *Where you are* row;
  - deportation and a 24-hour bar.
- **Opinion against a faction** (GDD §14.2), with a ledger leg for each side.
- **Five Issues** and the extended feeds. Two effect kinds, `heatCoolPct` and `bailPct`.
- **Ambition chapter 2**, *The riverside house* (Heat on the quiet way), and chapter 3's teaser.
- **The paper**: ten new templates per home paper, eight for the Herald; the desk's Heat, record, held and *Where you are* rows; *In Print* for the cells, the infirmary and *seen*.
- **Art**: five mission scenes and six portraits (generated now); the hospital, jail-cell, news-strike and ministry scenes and the Kessler and nurse portraits catalogued; scene bindings; mission cards.
- **The dev panel and test hooks** for playtesting the slice (§8.5–§8.6), and the playtest report's **risk** section (§15.2).

**Out** (§19): plain clothes, forged papers, safehouses, bodyguards, night travel, recognition, the Secret Police and the opportunity encounters; faction mates' bail and visits (slice 6); the Antidote and the Recovery Boost; bribes for marks, Political Protection and the Rehabilitation Act; the Dossier payloads; jobs and bar services in the new quarters; the third quarters' places; Operations.

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| Missions in content | `Location.missions[]`, **not** a third member of `Action` (whose discriminator `type` would collide on `speech`, and whose ~40 readers assume tier 1). Rates, Heat, run-in, caught base and marks by type in rules (`MISSION_TYPES`) | ADR 0031, §4.1 (design §19 Q1) |
| Missions and orders | A mission is a descriptor of kind `mission`. Speech missions are seen as `speech`, surveillance as `intelligence`, the illegal types as themselves. The slot-B order matches `kinds: ['mission']`, so no `tier` match field is needed. The slot-C *Six wins* and *Five attempts* (`kinds: ['checked']`) do not count missions | ADR 0031, §6.11 |
| The remembered way | `characters.ways[] { missionId, wayId }`, set at the start | ADR 0031 |
| The run-in | An **`encounters`** document per run-in (pending → resolved) and a pointer `character.runIn`. The start writes Energy, Heat, the way and the pending step. The resolution writes the rest and the `actionLogs` row under the start's key | ADR 0032 (Q2) |
| Auto-resolve | By luck **on any read after a 5-minute decide window**, or at the day's turn, **as of** the decide time. The player's own choice wins while the run-in is still pending. A choice on a resolved run-in returns its result | ADR 0032, §7 |
| Heat, Health | Lazy on the character: `heat { value, at }` (the residence city's `heatCoolPct` per City Day) and `health { damage, at }`, so a level-up never shows a Health bar | ADR 0033 (Q3) |
| The record | `record { marks[] (one unit each, with kind and day), arrests[] }`. Level, fading and penalties computed on read. `record.strike` for 30 PC | ADR 0033 (Q6) |
| The cells, the infirmary | `character.held` pointer and a **`stays`** collection (history, the release modal, slice 6's mate bail and visits). **Release on read** as of `until`. **No scheduled job** | ADR 0033 (Q3) |
| The read order | city days → run-in luck → releases → the character's day → arrival | ADR 0033 §5, §7 |
| Rival ground | A **place state** (`PlaceState.rivalGround`), not character state. The +4 is a named check row of −16. Party XP is a share line. Heat, run-ins and the caught base are ×2 in the street's rules. ×1 is refused at the server | ADR 0034 (Q4) |
| Opinion against | `applyAgainst` in rules: half to the actor, half to Neutral, floors and cap. **Two ledger legs.** The contribution counts the actor's leg | ADR 0034 |
| The 2-point cap | `cities.rivalPressure { day, lost, prev }` on the home city, written with the opinion in the action's transaction | ADR 0034 |
| `leader` in the capital | `districts.state.leader`, set at the boundary like the close race | ADR 0034, §5.4 |
| Day flags, the bar | `character.flags[] { cityId, day, flag }` and `character.barred[] { cityId, until }`, read by the run-in chance and by `destinationState` | §5.1 (Q5) |
| The hostile deck | 4 cards in `journeyEvents` (`deck: 'hostile'`), with `heat`, `flag` and `gate` effects and `ignoreEffects`. Drawn at boarding to rival ground (first trip: the checkpoint; Heat ≥ 50: the list; else a draw without replacement) | §4.1, §6.9 |
| A card left unanswered on rival ground | Its ignore effects apply when the card's window ends: at `travel.close`, at a new boarding, or **at the first act in the destination**, which closes the arrival in its own transaction | §8.2 |
| Deportation | Release from the cells on rival ground starts a fareless, cardless `journeys` document (`kind: 'deported'`) to the residence city, from `until`. The city is barred for 24 h | ADR 0033, §8.2 |
| Home quarters | `Quarter.outline` (moved out of `district`), `label`, `opens`, `teaser`. `CityView.quarters` for every city. The overview and quarter views are the capital's `CityPage` path | ADR 0035 (Q7) |
| Routes | `/city/$cityId/$quarterId` a quarter, `/city/$cityId/overview` any city's overview, `/city/$cityId` unchanged (capital: overview; home: the landing quarter), `/held` the cells and the infirmary | ADR 0035, §12.1 |
| Odds and risk words | The server sends chances; the client words them (`oddsBand`, and a new `riskBand` in rules). No digit reaches the screen. The caught chance is never sent to the ticket | §8.3 (Q8) |
| Chapter 2 | `approaches[].heat` (the quiet way +6), written by `ambition.attempt` | §8.2 (Q9) |
| Jobs | **None new.** Releases, discharges and luck are lazy. A deportation journey reuses `journey-arrive` | §9 |
| Testing randomness | Memory-mode hooks force a run-in, the opponent, the check roll, the choice roll and the caught check for the caller's next act | §8.5 (Q11) |

---

## 3. The order of play, time, and the flow

### 3.1 A mission (design §4.6)

```
mission.start (one transaction, ADR 0002 + 0032)
  refusals (§7.2) · Energy ≥ cost (lazy) · the way exists · gates
  close an arrived journey in this city first (its unanswered card's ignore effects, §8.2)
  s = resolveMission(input, createRng(seed))                     // pure: Energy, the check (one roll), the held rewards
                                                                 //  (as rolled + the dropped twin), Heat +gain (×2 rival),
                                                                 //  the run-in chance (after the gain) and roll, the opponent
  if !s.runIn.fires:
      c = caughtCheck(…, createRng(seed + ':caught'))             // illegal, Partial or Failure only
      f = finishMission(s, { runIn: null, caught: c })            // record, cells, the final rewards
      write: character (Energy, Heat, rewards, Standing, orders, tally, way, record, held, firsts, agility)
             · opinion (persuade | against, cap) · ledger legs · contributions · Issue points
             · stays (if taken in) · actionLogs (kind 'mission')
      → ActionResult (kind 'mission')
  else:
      write: character (Energy, Heat, way, runIn: pending, decideBy = now + 5 min) · encounters (pending, held = s)
      → RunInPending

encounter.choose(choice) | luck (any read after decideBy, or at the day's turn)   (one transaction)
  o = resolveRunIn(choice, chances, createRng(seed + ':choice'))   // won | lost | ran | talked | paid; Health, Iron, Heat
  c = caughtCheck(…) unless o ∈ { lost, ran }
  f = finishMission(s, { runIn: o, caught: c })
  write: as the no-run-in branch + encounters (resolved) + actionLogs (under the start's key) + runIn: resolved
  → ActionResult (kind 'mission') with the run-in block
encounter.close → runIn = null                                    // the result modal's Continue / To the cells
```

A tier-1 tap on rival ground takes the same path through `action.perform`. The held start is the tier-1 resolution plus its Partial twin. Run or a loss drops the row to Partial (design §10.5).

### 3.2 Time and the lazy state

| State | Stored | Read | Ends |
|---|---|---|---|
| Heat | `heat { value, at }` | `projectHeat`, piecewise by City Day at the residence city's rate (5 an hour × the `heatCoolPct` sources) | at 0; set to 25 at a release |
| Health | `health { damage, at }` | `projectHealth`: −10 damage per whole 10 minutes. Max = 100 + 5 × Level | at full |
| The record | `record.marks[]` | `liveMarks`: minor marks gone 14 City Days after the last mark of any kind | by fading or striking |
| A pending run-in | `runIn` + `encounters` | luck on any read at or after `decideBy`, and before the day's settlement if it is from an earlier day | resolved as of `min(decideBy, its day's end)` |
| The cells, the infirmary | `held` + `stays` | `heldNow`: in while `now < until` | released or discharged as of `until`, on the first read after it |
| Day flags | `flags[]` | today's in that city | at the City Day boundary |
| The bar | `barred[]` | `until > now` | after 24 h |

### 3.3 The read order (`loadCharacter` v5, ADR 0033 §5)

1. `ensurePlaces`: the city days of the current, residence and job cities (ADR 0017).
2. **`ensureRunInSettled`**: a pending run-in from an earlier City Day, or past its `decideBy`, is resolved by luck as of its decide time (ADR 0032 §5). `encounter.choose` skips this step for the run-in it names, **unless the run-in is from an earlier day** (the day's turn wins).
3. **`ensureReleased`**: a `held` whose `until ≤ now` is released or discharged as of `until`, which may start a deportation journey.
4. `ensureSettled`: the character's day. The edition reads the stays, the Heat and the record after steps 2–3.
5. `ensureArrived`: a due journey, including a deportation's.

Each step reads only fields already on the loaded character. A step writes only when something is due, with conditional updates (`runIn.state: 'pending'`, `held.state: 'in'`, `stays.releasedAt: null`), so concurrent first requests resolve once.

### 3.4 The flow, and what each step touches

| # | Screen (route) | Procedure | Writes |
|---|---|---|---|
| 0 | any screen | the read path (§3.3) | city days; luck; releases; the settlement; arrival |
| 1 | Home overview (`/city/$cityId/overview`) | `city.get` | — |
| 2 | A quarter (`/city/$cityId/$quarterId`) | `city.get` | — |
| 3 | A mission (ticket → briefing → confirm) | `mission.start` | `characters`, `cities`/`districts` (opinion, `rivalPressure`), `influenceLedger`, `contributions`, `issues`, `actionLogs` or `encounters`, `stays` |
| 4 | The run-in modal | `encounter.current`, `encounter.choose` | as 3, with `encounters` resolved, `actionLogs`, `requestLogs` |
| 5 | The result's Continue / *To the cells* | `encounter.close` | `characters.runIn` |
| 6 | The cells or the infirmary (`/held`) | `held.get`, `held.act`, `held.bail`, `held.walkOut`, `held.discharge`, `held.close` | `characters`, `stays`, `actionLogs` (the tap), `journeys` (deportation), `requestLogs` |
| 7 | Me tab: *Have a mark struck off* | `record.strike` | `characters`, `requestLogs` |
| 8 | Nation map → rival ground | `travel.nation`, `travel.board`, `travel.choose`, `travel.close` | as slice 4, plus `characters` (Heat, flags, `hostileDeck`, `rivalTrips`) |
| 9 | A tap on rival ground | `action.perform` | as slice 4 (opinion against, cap, ledger legs), `encounters` on a run-in |
| 10 | Letters: *The riverside house* | `ambition.attempt` | as slice 2, plus `characters.heat` |
| 11 | Paper | `paper.today` | — (the risk headlines are stored at the settlement; desk rows live) |

---

## 4. Content (`packages/content`)

### 4.1 New and changed schemas

```ts
// Missions (ADR 0031; design §4–§5)
MissionType = z.enum(['speech', 'surveillance', 'vandalism', 'disruption', 'sabotage', 'theft']);
OpponentId = Id;
Way = z.strictObject({
  id: Id, title: z.string().min(1).max(60), stats: CheckStatsSchema, hint: z.string().min(1).max(90),
  heat: z.int().min(0).max(30).optional(),             // a way louder than its type (none in the catalogue)
  runIn: z.int().min(0).max(90).optional(),            // the loud way: 25
});
Mission = z.strictObject({
  id: Id, name: z.string().min(1).max(80), tier: z.literal(2), type: MissionType,
  energy: z.int(),                                     // = MISSION_TYPES[type].energy (loader)
  level: z.union([z.literal(6), z.literal(8), z.literal(10), z.literal(12)]),
  difficulty: z.int().min(14).max(22),                 // = missionDifficulty(level, city.role) (loader; §22.1 Q1)
  requires: z.strictObject({ rank: z.literal(3).optional(),
                             standing: z.int().min(0).max(4).optional() }).optional(),
  target: z.union([FactionId, z.literal('leader')]).optional(),
  pool: z.array(OpponentId).min(1).max(4),
  briefing: StoryText,
  ways: z.array(Way).min(2).max(3),
  text: z.strictObject({ success: OutcomeText, partial: OutcomeText, failure: OutcomeText }),
  card: AssetId.optional(),                            // overrides the type's mission card (§13.5 rung 4)
});
Location += { missions: z.array(Mission).optional() };

// Opponents (design §10.2, §10.6)
OpponentLine = z.string().min(1).max(120);
Opponent = z.strictObject({
  id: OpponentId, label: z.string().min(1).max(40),
  side: z.union([FactionId, z.literal('police')]),
  power: z.int().min(1), agi: z.int().min(1), wits: z.int().min(0),
  payOff: z.int().min(1).nullable(),                   // null: won't be bought
  fightPct: z.int().min(-20).max(0).optional(),        // the branch inspector: −10 on your Fight odds
  portrait: AssetId,
  lines: z.strictObject({ appears: OpponentLine, won: OpponentLine, lost: OpponentLine,
                          ran: OpponentLine, talked: OpponentLine, paid: OpponentLine.optional() }),
});

// Quarters (ADR 0035; design §2)
Quarter += {
  outline: z.array(z.tuple([Fraction, Fraction])).min(6).max(24).optional(),   // moved here from district.outline
  label: z.strictObject({ x: Fraction, y: Fraction }).optional(),               // where the name sits (screens §10)
  opens: z.union([z.strictObject({ level: z.union([z.literal(1), z.literal(6), z.literal(10)]) }),
                  z.strictObject({ edition: z.literal('later') })]).default({ level: 1 }),
  teaser: z.string().min(1).max(90).optional(),        // "The slipway, the customs house, and the far bank across the water."
};
Quarter.district −= { outline };

// Services and the visitor's run-in pool (design §8.1, §9.2, §10.5)
City += {
  services: z.strictObject({ cells: Id, infirmary: Id }).optional(),   // required on every council city (loader)
  runInPool: z.array(OpponentId).min(1).optional(),                    // a home city: whom a visitor's tier-1 tap meets (§22.1 Q10)
};

// The one tap in the cells and on the ward (design §8.2, §9.2)
HeldAction = z.strictObject({ id: z.enum(['held.cells', 'held.ward']), name: z.string().min(1),
  type: z.literal('intelligence'), stats: CheckStatsSchema, energy: z.literal(3),
  text: z.strictObject({ success: OutcomeText, partial: OutcomeText }) });

// Journey cards v2 (design §11.4)
JourneyRewards += { heat: z.int().min(-20).max(20).optional(), flag: z.enum(['watched', 'warned']).optional() };
JourneyChoice  += { gate: z.literal('coolAndClean').optional() };   // unchecked; `success` when it holds, `partial` otherwise
JourneyEvent   += {
  deck: z.enum(['ordinary', 'hostile']).default('ordinary'),
  heatAtLeast: z.int().min(1).max(100).optional(),     // jev.listed: 50 (replaces the hostile draw)
  ignoreEffects: z.strictObject({ heat: z.int().min(0).max(20).optional(),
                                  flag: z.enum(['watched', 'warned']).optional() }).optional(),
};                                                     // `first: true` means first in its own deck

// Effects (design §12.1; ADR 0021, 0030)
OrdinanceEffectSchema += [ { kind: 'heatCoolPct', value }, { kind: 'bailPct', value } ];

// Orders (design §12.2)
OrderMatch.kinds: ActionKind[] where ActionKind += 'mission';
OrderTemplate += { minLevel: z.int().min(1).optional() };           // the slot-B mission order: 6
// titles may carry `{city}`: the residence city's name, resolved at read (slice-4 Deviations' slot-C note too)

// Chapters (design §13)
Chapter.story.check.approaches[] += { heat: z.int().min(0).max(30).optional() };

// Mission cards (GDD §13.5 rung 4)
art += { missionCards: z.array(z.strictObject({ missionType: MissionType, assetId: AssetId })) };

HeadlineCondition += RiskCondition;                    // §11.2
Content += { opponents: z.array(Opponent).length(6), held: z.strictObject({ cells: HeldAction, infirmary: HeldAction }) };
Content.journeyEvents: .length(7) → .length(11)        // the loader counts each deck
```

`GameContent` gains:

- `mission(id)` → `{ city, location, mission }`, and `missionsAt(locationId)`;
- `opponent(id)`, `runInPoolOf(cityId)`;
- `servicesOf(cityId)` → `{ cells, infirmary }` as located places;
- `heldAction('cells' | 'infirmary')`;
- `quartersOf(cityId)`, `quarterOf(locationId)`;
- `journeyDeck()` (the ordinary ids only), `hostileRotation()` (checkpoint, informer, conductor), `hostileFirst()`, `listedCard()`;
- `missionCard(type)`.

`district(id).quarter.outline` replaces `district.outline` everywhere it is read (the capital's views, the loader).

### 4.2 Loader cross-checks (added)

- **Quarters.**
  - Each home city has three quarters in order: `opens: { level: 1 }`, `{ level: 6 }`, `{ edition: 'later' }`.
  - Every quarter of a city with two or more quarters has an `outline` and a `label`.
  - Every pin lies inside its own quarter's outline, and no two outlines of a city overlap: slice 4's grid-and-vertex test, now run on every city.
  - Every label lies inside its outline, and labels are at least 0.25 apart (screens §10).
  - The new frames equal design §2.2 to two decimals.
  - The capital's districts keep their outlines, read from `Quarter.outline`.
- **Places.**
  - 15 new places, each equal to its survey pin and at least 0.02 inside its frame.
  - Kinds come from the closed list.
  - `services.cells` names a `jail` place of the city (Irongate: `irongate.police-hq`, a `ministry`), and `services.infirmary` a `hospital`.
  - Every `jail` and `hospital` place has exactly its two ordinary tickets.
- **Actions.** 35 new: 15 canvass, 5 speech, 6 propaganda, 7 intelligence and 4 training (3 STR, 1 AGI). The slice-1 text rules apply (≤ 240 characters, ≤ 4 sentences, a `verb` on training).
- **Missions.**
  - 22, at 21 places. Ids are unique across actions and missions.
  - `energy` = the type's; `difficulty` = the ladder for `level`, +2 in a city whose role is `battleground`.
  - An illegal type has `requires.rank: 3` and a `target`; a legal one has neither.
  - `target: 'leader'` only in a districted city. A mission at a `faction-hq` targets that HQ's own faction.
  - `pool` ids exist, and a pool is not made only of the target's side.
  - 2–3 ways with unique ids, at most one `best`; `runIn` and `heat` within bounds.
  - Briefing ≤ 240; outcome texts ≤ 240 and ≤ 4 sentences; titles ≤ 80.
  - Every type has a mission card; a `card` override names a `scene`.
- **Opponents.** Six, the §10.2 numbers; `payOff: null` exactly when there is no `paid` line; every line ≤ 120; the portrait is a `portrait` asset; the police side is `police`.
- **Held taps.** Two, intelligence, 3 Energy, with texts.
- **Journey events.**
  - 7 ordinary, exactly one `first`.
  - 4 hostile: `jev.checkpoint` is `first`; `jev.listed` has `heatAtLeast: 50` and is outside the rotation.
  - `gate` only on an unchecked choice that has both `success` and `partial`.
  - Hostile checked choices carry `partial`.
  - `heat` and `flag` within bounds. A choice with a `cost.iron` and no `stats` has no `partial` unless it has a `gate`.
- **Issues.** 24. The new feeds name places of that Issue's own city. `heatCoolPct` 0…100, `bailPct` −50…0. Effect lines pass the review-2 word check.
- **Orders.** Each faction has exactly one `minLevel: 6`, slot-B, `residence: 'any'` template matching `kinds: ['mission'], cityId: 'home'`. `{city}` appears only in titles.
- **Chapters.** *Settle His Debts* chapter 2 is playable: Level 6, difficulty 14, 15 Energy, one approach with `heat: 6`, keepsake `keep.ledger-page`. Chapter 3 is a teaser with `requires: { rank: 3 }`.
- **Headlines.** Each home paper has the ten ids of design §14; the Herald has eight (no `quarter-open`, no `rival-pressure`). Placeholders come only from §4.3.
- **Vocabulary.** Both QA guards (`qa.content.test.ts`, `qa.slice2.test.ts`) run over every new string. They keep their slice-4 allowances (*Garrison Hill*, *the war*, *the front room*, *close race*) and gain these:
  - **No *sergeant* allowance** (settled, design §23.1 Q22): the civic police keep no rank; the desk voice is **the duty officer** everywhere, as slice 4 named it.
  - **front door** (the Union Hall briefing) keeps `qa.content`'s allowance and joins `qa.slice2`'s list. The four way hints no longer say *in front of* (reworded by the designer), so no allowance is needed for it.
  - *constable*, *Fight* and *Run* are not in either regex and need nothing.
  - **torch** (Duskwall's watch, Failure: *"walks the ditch twice with a torch"*) is banned by `qa.slice2`. Default: the text says *a lamp*, a content change for the designer (§22.1 Q22). It gets no allowance.
- **Art.** Every opponent's portrait and every mission card exists with the right kind. `hospital` and `jail` have scene bindings.

### 4.3 Placeholders

| Where | Added | Resolved |
|---|---|---|
| Risk headlines (design §14) | `{missionTitle}` `{minutes}` `{how}` `{opponent}` `{recordLevel}` `{marks}` `{pct}` `{rivalCity}` `{lost}` | server, from the settlement's facts (§11.2); `RISK_PLACEHOLDERS` in rules |
| Order titles | `{city}` | server, at read: the residence city's name |
| Copy | `{time}` `{weekday}` `{n}` `{way}` `{faction}` `{city}` `{place}` `{hp}` `{max}` `{iron}` `{level}` `{left}` | the client (times in the player's clock) |

### 4.4 Data to transcribe

| File | Contents | Source |
|---|---|---|
| `data/cities/coalport.ts`, `duskwall.ts`, `ashford.ts` | the second and third quarters (frames, `opens`, teasers, blurbs, outlines and labels drawn in the dev viewer); the outline and label of the first quarter; five places each with their tickets and texts; the missions at their places; `services`; `runInPool` | design §2–§5; city-quarters.md §2 (Coalport's blurbs) |
| `data/cities/irongate.ts` | outlines moved to `Quarter.outline`; four missions; `services` (Police Headquarters, St Agnes) | design §5.4 |
| `data/opponents.ts` | six opponents with their six lines | design §10.2, §10.6 |
| `data/held.ts` | *Listen to the cells*, *Talk to the ward* | design §8.2, §9.2 (texts: §22.1 Q14) |
| `data/journeyEvents.ts` | four hostile cards; `jev.parcel`'s `carry` Partial gains `heat: 10` | design §11.4, §6.1 |
| `data/issues.ts` | five Issues; feeds extended on three | design §12.1 |
| `data/orders.ts` | `dir.mission`, `dir.v.mission`, `dir.a.mission` (`{city}` in the titles) | design §12.2 |
| `data/ambitions.ts`, `data/items.ts` | chapter 2 and chapter 3's teaser; `keep.ledger-page`; chapter 1's hook line | design §13 |
| `data/headlines.ts`, `heraldHeadlines.ts` | ten per home paper, eight for the Herald | design §14 |
| `data/art.ts` | §13's assets, bindings and mission cards | design §21, art-wiring-oct.md |
| `data/copy.ts` | screens §11, the help notes of screens §2.3, the duty officer's and matron's lines (screens §6–§7), the *did* sentences of the run-in block | screens |

Content tests parse both slice-5 design documents and compare every table and text word for word, as slices 1–4 do: places, actions, texts, missions, ways, opponents and lines, cards, Issues, orders, chapter, headlines and copy.

---

## 5. Data model (`packages/db`)

Two new collections, each for a reason (plan rule 6: embed what is read together, reference what grows):

| Collection | Why its own | Growth |
|---|---|---|
| `encounters` | One per run-in. It holds the pending step across two requests, keeps `actionLogs` immutable, and is history for the report (choices, luck, losses) | per run-in |
| `stays` | One per stay in the cells or the infirmary. History for the paper, the report and slice 6 (a mate's bail, visits). It stores the release modal | per stay |

### 5.1 `characters` — new embedded fields

```ts
{
  ...slice 4,
  stats: { str, int, agi, chaBase, agiQuarters: number },   // 0–3 (design §4.1: a quarter point per Agility Success)
  heat: { value: number, at: Date },                        // 0–100 at `at`, whole points (ADR 0033)
  health: { damage: number, at: Date },                     // max − damage at `at`; max = 100 + 5 × level
  record: {
    marks: Array<{ day: DayKey, kind: 'minor' | 'moderate' | 'serious', logId: string | null }>,   // one unit each, oldest first
    arrests: DayKey[],                                      // the last three (the seven-day escalation)
  },
  held: { stayId: ObjectId, kind: 'cells' | 'infirmary', cityId, locationId, since: Date, until: Date,
          bail: { total: number, lines: PriceLine[] } | null, rivalGround: boolean,
          state: 'in' | 'out' } | null,                     // 'out': released, the release modal not yet closed
  runIn: { encounterId: ObjectId, state: 'pending' | 'resolved', day: DayKey, decideBy: Date,
           cityId: string } | null,                         // until the result modal is closed (ADR 0032)
  ways: Array<{ missionId: string, wayId: string }>,
  flags: Array<{ cityId: string, day: DayKey, flag: 'watched' | 'warned' }>,   // pruned to today at every write
  barred: Array<{ cityId: string, until: Date }>,           // pruned at every write
  hostileDeck: { seen: string[] },                          // the rotation's three; reset when all seen
  rivalTrips: number,
  journeyDeck: { seen: string[], firstDone: boolean },      // the passenger: the first journey that is not to rival ground
  firsts: { mission?: Date, noticed?: Date, hot?: Date, wanted?: Date, mark?: Date },   // one-time cards, hl.*.mission-first
  today: DailyTally & { missions: number, rivalCityId: string | null },
}
```

No new index on `characters`: every new read is of the session's own document.

### 5.2 `encounters` — new (ADR 0032)

```ts
{
  _id: ObjectId,
  characterId: ObjectId, idempotencyKey: string,            // the start's key
  kind: 'mission' | 'action', refId: string,                // the mission or the tier-1 action
  locationId: string, cityId: string, day: DayKey, rivalGround: boolean,
  seed: string,                                             // 32 hex; streams ':runIn', ':choice', ':damage', ':caught'
  opponent: { id: string, power: number, agi: number, wits: number,
              payOff: number | null, fightPct: number },    // scaled: power round(×1.1) on tier 2, +4 on rival ground
  you: { power: number, agi: number, cha: number, armour: number, health: number, healthMax: number },
  chances: { fight: number, run: number, talk: number, pay: number | null },
  held: MissionStart | Tier1Held,                           // the pure start (rules types, JSON)
  state: 'pending' | 'resolved', decideBy: Date,
  choice: 'fight' | 'run' | 'talk' | 'pay' | null, by: 'player' | 'luck' | 'auto' | null,
  outcome: 'won' | 'lost' | 'ran' | 'talked' | 'paid' | null,
  logId: ObjectId | null, resolvedAt: Date | null, resolvedAsOf: Date | null, createdAt
}
```

Indexes:

- `{ characterId: 1, idempotencyKey: 1 }` unique;
- `{ characterId: 1, createdAt: -1 }`;
- `{ state: 1, decideBy: 1 }` partial on `state: 'pending'` (the dev panel, the report).

`by: 'luck'` is the player's *Leave it to luck*. `by: 'auto'` is luck by the read path.

### 5.3 `stays` — new (ADR 0033)

```ts
{
  _id, characterId, kind: 'cells' | 'infirmary', cityId, locationId, rivalGround: boolean,
  reason: 'caught' | 'wanted' | 'policeLoss' | 'runInLost' | 'dev',
  logId: ObjectId | null, encounterId: ObjectId | null,
  since: Date, until: Date, minutes: number, heatAtArrest: number | null,
  marks: number,                                            // added by this arrest (0 for the infirmary)
  again: boolean,                                           // a second arrest in seven days / a second stay (the "You again" line)
  bail: { total: number, lines: PriceLine[] } | null,
  releasedAt: Date | null, how: 'served' | 'bail' | 'walkOut' | 'discharge' | null, ironPaid: number,
  heatAfter: number | null, healthAfter: number | null,
  deportJourneyId: ObjectId | null, barredUntil: Date | null,
  result: PoliticalResult | null,                           // the release modal, stored once
  closedAt: Date | null,
  bailPostedBy: null, visits: [],                           // slice 6
  createdAt
}
```

Indexes: `{ characterId: 1, since: -1 }` and `{ characterId: 1, releasedAt: -1 }` (the settlement's yesterday read).

### 5.4 Changed collections

- **`actionLogs`:** `kind` += `mission`; `outcome` += `takenIn`, `carriedOff`. New `encounterId?`. A mission's row holds the mission id in `actionId`. The held taps' rows have `actionId: 'held.cells' | 'held.ward'` and the held place.
- **`journeys`:** `kind: 'ticket' | 'deported'` (absent means ticket), `rivalGround: boolean`, `card.deck`, and `stayId` on a deportation. A deported journey has fare 0 and no card.
- **`cities`:** `rivalPressure: { day: DayKey, lost: number /* thousandths */, prev: { day, lost } | null } | null`, on home cities.
- **`districts`:** `state.leader: FactionId | null`, the leading faction at the boundary (ADR 0034 §5).
- **`requestLogs`:** `REQUEST_KINDS` += `encounter.choose`, `held.bail`, `held.walkOut`, `held.discharge`, `record.strike`.
- **`paperEntries`:** the stored headlines gain the risk set. The desk's new rows are live (§11).

### 5.5 Migration `007-slice5-risk.ts`

`ensureIndexes()` runs it after 006. It is idempotent: each update filters on the field's absence.

1. **Characters** (`heat` absent). An aggregation-pipeline update sets:
   - `heat: { value: 0, at: '$$NOW' }`, `health: { damage: 0, at: '$$NOW' }`;
   - `record: { marks: [], arrests: [] }`, `held: null`, `runIn: null`, `ways: []`;
   - `'stats.agiQuarters': 0`, `flags: []`, `barred: []`;
   - `hostileDeck: { seen: [] }`, `rivalTrips: 0`, `firsts: {}`;
   - `'journeyDeck.firstDone': { $gt: ['$journeysMade', 0] }`;
   - `'today.missions': 0`, `'today.rivalCityId': null`.
2. **Districts** (`state.leader` absent): `state.leader` from the current opinion (a code loop over the five, each a conditional update). The next boundary sets it properly.
3. `ensureIndexes` creates `encounters` and `stays` and syncs `actionLogs`' enum before the migrations. That is safe: no new unique index is on a field the migration adds.

Content's move of Irongate's outlines needs no migration: no stored document holds an outline.

---

## 6. Rules (`packages/rules`) — pure, no I/O

### 6.1 Constants

```ts
export const TIER2 = { rates: { xpPerEnergy: 5, fxpPerEnergy: 0.8, ironPerEnergy: 4 },
                       opinionPerEnergy: 0.01, failureXpShare: 0.2, fromLevel: 6 } as const;      // §5.5, §8.4, §14.2
export const MISSION_LADDER = { 6: 14, 8: 16, 10: 18, 12: 20, battlegroundStep: 2 } as const;     // §8.4 (slice 5)
export const MISSION_TYPES = {                                                                      // design §4.2
  speech:       { energy: 15, heat: 0,  runIn: 5,  caught: null, marks: 0, markKind: null,       givesFxp: true,  opinion: 'persuade', opinionMult: 1, ironMult: 1, seenAs: 'speech',       illegal: false },
  surveillance: { energy: 12, heat: 5,  runIn: 10, caught: null, marks: 0, markKind: null,       givesFxp: false, opinion: null,       opinionMult: 0, ironMult: 1, seenAs: 'intelligence', illegal: false },
  vandalism:    { energy: 10, heat: 6,  runIn: 15, caught: 8,    marks: 1, markKind: 'minor',    givesFxp: true,  opinion: 'against',  opinionMult: 2, ironMult: 1, seenAs: 'vandalism',    illegal: true },
  disruption:   { energy: 15, heat: 8,  runIn: 30, caught: 10,   marks: 1, markKind: 'minor',    givesFxp: true,  opinion: 'against',  opinionMult: 2, ironMult: 1, seenAs: 'disruption',   illegal: true },
  sabotage:     { energy: 20, heat: 12, runIn: 25, caught: 20,   marks: 3, markKind: 'serious',  givesFxp: true,  opinion: 'against',  opinionMult: 2, ironMult: 1, seenAs: 'sabotage',     illegal: true },
  theft:        { energy: 15, heat: 10, runIn: 25, caught: 15,   marks: 2, markKind: 'moderate', givesFxp: true,  opinion: null,       opinionMult: 0, ironMult: 2, seenAs: 'theft',        illegal: true },
} as const;
export const HEAT = { max: 100, coolPerHour: 5, states: { noticed: 25, hot: 50, wanted: 75 },
                      bonus: { cool: 0, noticed: 5, hot: 15, wanted: 15 }, afterRelease: 25,
                      failedPayOff: 10 } as const;                                                 // §6.4
export const CAUGHT = { min: 2, max: 95, agiDivisor: 2, heatDivisor: 2 } as const;                 // §11.2
export const RECORD = { levels: { onFile: 1, repeat: 3, notorious: 6 },
                        ironPct: { clean: 0, onFile: -10, repeat: -20, notorious: -30 },
                        repeatBonus: 5, minorFadeDays: 14, strikePc: 30,
                        escalateWithinDays: 7, escalatedMarks: 3,
                        notoriousBars: { kinds: ['court', 'university'], hqOf: 'alliance' } } as const;   // §11.3–§11.4
export const HEALTH = { base: 100, perLevel: 5, regen: 10, tickMs: 600_000, admitted: 30,
                        stayMinutes: 20, walkOut: { energy: 5, iron: 100 },
                        discharge: { energy: 5, share: 0.5 } } as const;                           // §6.1, §19.1
export const CELLS = { baseMinutes: 10, heatDivisor: 2, maxMinutes: 60, rivalFactor: 1.5,
                       bail: { base: 100, perMark: 50, notoriousPct: 100, rivalPct: 100,
                               legalAidPct: -50, roundTo: 10 } } as const;                         // §19.2
export const RUN_IN = { decideMs: 5 * 60_000, max: 90, watched: 10, warned: -10, repeatBonus: 5,
                        rivalTier1: 15, rivalFactor: 2, policeShare: 0.5,
                        tier2PowerFactor: 1.1, rivalPowerAdd: 4,
                        fight: { base: 50, perPower: 3 }, run: { factor: 60 },
                        talk: { base: 50, perPoint: 4 }, pay: { chance: 90 },
                        followUpPct: -10, xp: { won: 20, away: 10 }, fullStrengthShare: 0.1,
                        damage: { factor: 0.8, spreadPct: 20 }, clamp: [5, 95] } as const;          // §20 (slice 5)
export const ARMOUR_BY_TIER = [4, 8, 12, 16, 20] as const;                                         // §20.3
export const RIVAL_GROUND = { checkRow: -16 /* = +4 difficulty */, fxpShare: 0.5, fxpShareUnrest: 0.75,
                              heatFactor: 2, caughtFactor: 2, pressureCapPerDay: 2,
                              barredMs: 24 * 3_600_000, cardDifficulty: 14 } as const;             // §14.11–§14.12
export const QUARTERS = { levels: [1, 6, 10] } as const;                                           // §14.13
ORDINANCE_BOUNDS += { heatCoolPct: [0, 100], bailPct: [-50, 0] };
OPINION_PER_ENERGY[2] = 0.01;  TIER_RATES[2] = TIER2.rates;
```

### 6.2 `heat.ts`

```ts
export type HeatState = 'cool' | 'noticed' | 'hot' | 'wanted';
export const heatState = (h: number): HeatState;                      // 0–24, 25–49, 50–74, 75–100
export interface HeatTimer { value: number; at: number }
export function coolRate(pcts: readonly number[]): number;            // 5 × Π(1 + pct/100); Customs Strike: 7.5 an hour
export function projectHeat(t: HeatTimer, now: number, rateOn: (day: DayKey) => number): HeatTimer;
//  piecewise by City Day from `at`; value − floor(cooled); never below 0; the returned `at` keeps the
//  part-point already cooled (so a write loses nothing); at 0, `at = now`
export function addHeat(t: HeatTimer, now: number, rateOn, gain: number):
  { before: number; after: number; stateBefore: HeatState; stateAfter: HeatState; timer: HeatTimer };   // clamp 0..100
export function setHeat(value: number, at: number): HeatTimer;       // a release: 25 at `until`
export function heatEta(t: HeatTimer, now: number, rateOn, below: number): number | null;
//  when the value first drops under `below` (25 for "Cool by", 1 for "gone by"); null when already under
```

### 6.3 `health.ts`

```ts
export const healthMax = (level: number) => 100 + 5 * level;
export interface HealthTimer { damage: number; at: number }
export function projectHealth(t: HealthTimer, now: number): HealthTimer;   // −10 damage per whole 10 minutes; `at` by whole ticks
export const healthNow = (t: HealthTimer, now: number, level: number): number;   // max − damage, ≥ 0
export function healthAt(value: number, level: number, at: number): HealthTimer;  // admission (30), discharge (half, or full)
export function healthFullAt(t: HealthTimer, now: number): number | null;
```

### 6.4 `record.ts`

```ts
export type RecordLevel = 'clean' | 'onFile' | 'repeat' | 'notorious';
export interface Mark { day: DayKey; kind: 'minor' | 'moderate' | 'serious'; logId: string | null }
export function liveMarks(marks: readonly Mark[], today: DayKey): Mark[];
//  minor marks are gone once today ≥ (the latest mark's day, any kind) + 14; moderate and serious never fade in slice 5
export const recordLevel = (n: number): RecordLevel;                 // 0 / 1–2 / 3–5 / 6+
export function recordView(marks, today): { level; marks: number; fadesOn: DayKey | null; fading: number;
  ironPct: 0 | -10 | -20 | -30; repeatBonus: 0 | 5; bailNotorious: boolean; barred: boolean };
export function marksFor(i: { type: MissionType; arrested: boolean; arrests: readonly DayKey[];
  today: DayKey; logId: string }): { add: Mark[]; escalated: boolean };
//  the type's marks; an arrest that carries marks within 7 City Days of another becomes 3 serious (§22.1 Q3)
export function strikeOldest(marks: readonly Mark[], today: DayKey): { marks: Mark[]; struck: Mark } | null;
export function barredByRecord(level: RecordLevel, place: { kind: string; factionId?: FactionId }): boolean;
//  Notorious: `court`, `university`, and any `faction-hq` of the Alliance (§22.1 Q18)
```

### 6.5 `missions.ts` and tier-2 rewards

```ts
export function missionDifficulty(level: 6 | 8 | 10 | 12, role: CityRole): number;   // 14…20, +2 battleground
export function missionTarget(target: FactionId | 'leader' | undefined, actor: FactionId,
  district: { leader: FactionId | null; shares: OpinionShares } | null): FactionId | null;
//  'leader' → the boundary's leader, or the runner-up when that is the actor's own
export function missionGate(i: { level; rank; standingLevel; record: RecordLevel; mission; place }):
  { reason: 'LEVEL' | 'RANK' | 'STANDING' | 'RECORD'; need: number } | null;
export const offeredTo = (target: FactionId | null, actor: FactionId) => target !== actor;   // hidden from the target's members
export function wayCheck(i: { way: WaySpec; values: Stats; difficulty: number; bonuses: CheckBonus[];
  prefer?: TrainableStat }): CheckBreakdown;                         // §8.4; bonuses: Standing, close race (speech), rival row
export function suggestedWay(ways, checks): string;                  // best chance; ties in content order
export function missionRisk(i: { type: MissionType; way: WaySpec; rivalGround: boolean; heat: number;
  record: RecordLevel; flags: { watched: boolean; warned: boolean } }):
  { heat: number; runInChance: number; marks: 0 | 1 | 2 | 3 };      // heat = the gain; chance after the gain
export const riskBand = (chance: number): 'safe' | 'littleRisk' | 'risky' | 'dangerous';   // 0 / 1–10 / 11–24 / 25+
export function tier2Rewards(i: { type: MissionType; energy: number; outcome: Outcome; restedUsed: number;
  costPaid: number; fxpBonusShare: number; fxpShares: LineShare[]; ironShares: LineShare[];
  opinionFactors: SwingFactor[] }): Rewards;
//  §5.5 tier 2; Failure: XP × 0.2 only (Rested still on that XP); Iron × ironMult; opinion 0.01/E × opinionMult × factors;
//  the record's Iron penalty is an `ironShares` entry with a negative share ("your record −6")

export interface MissionStart {
  seed: string; missionId: string; wayId: string; tier: 2;
  energy: { before: EnergyProjection; after: EnergyState; cost: number; restedUsed: number };
  attempt: ActionAttempt;                                             // the check, the roll, the outcome
  rewards: { rolled: Rewards; dropped: Rewards };                     // dropped = Failure's XP only
  points: number;                                                     // Issue momentum as rolled (0 on Failure)
  descriptor: ActionDescriptor;                                       // kind 'mission', seenAs, place, Issue tags
  orders: { before: OrdersState; rolled: OrdersAdvance; dropped: OrdersAdvance };
  standing: { before: number; rolled: number; dropped: number };
  heat: ReturnType<typeof addHeat>;
  opinion: { mode: 'persuade' | 'against' | null; target: FactionId | null;
             swing: { rolled: number; dropped: 0 }; factors: SwingFactor[] };
  runIn: { chance: number; roll: number; fires: boolean; opponentId: string | null };
  agility: boolean;                                                   // a single-stat ['agi'] way
}
export function resolveMission(i: MissionInput, rng: Rng):
  { ok: true; start: MissionStart } | { ok: false; reason: 'NOT_ENOUGH_ENERGY'; cost: number; energy: EnergyProjection };
export function finishMission(i: { start: MissionStart; runIn: RunInOutcome | null; caught: CaughtResult | null;
  record: Mark[]; arrests: DayKey[]; agiQuarters: number; heatTimer: HeatTimer; health: HealthTimer;
  level: number; at: number; today: DayKey; rivalGround: boolean; bail: BailInput }): MissionFinal;
//  paid = rolled unless the run-in was 'ran' or 'lost' (→ dropped); + run-in XP, "won at full strength" +10 % parts,
//  "paid off" Iron part; marks (escalation); sentTo: cells (caught while Hot/Wanted, Wanted + Failure, a police loss)
//  or infirmary (any other loss); Agility +¼ on a paid Success of an Agility way
```

### 6.6 `runIn.ts` (and the caught check)

```ts
export function runInChance(i: { base: number; tier: 1 | 2; rivalGround: boolean; heatState: HeatState;
  record: RecordLevel; flags: { watched: boolean; warned: boolean } }): number;
//  tier 2: base × (rival ? 2 : 1); tier 1 on rival ground: 15 flat (§22.1 Q2); + state bonus + 5 (Repeat or worse)
//  + 10 Watched − 10 Warned; clamp 0..90
export function pickOpponent(i: { pool: readonly string[]; actor: FactionId; heatState: HeatState;
  sideOf: (id: string) => FactionId | 'police'; policeId: string; rng: Rng }): string;
//  drop the actor's own side; from Noticed the police half the time, else uniform over the rest
//  (police excluded); Cool: uniform over the pool as written; empty → the police
export const yourPower = (str: number, clothingTier: number | null): number;   // round(STR × 1.5 + armour / 2)
export function scaleOpponent(o: OpponentSpec, i: { tier: 1 | 2; rivalGround: boolean }): ScaledOpponent;
//  power round(power × (tier 2 ? 1.1 : 1)) + (rival ? 4 : 0); AGI and Wits unchanged
export function runInChances(you: { power; agi; cha }, them: ScaledOpponent):
  { fight: number; run: number; talk: number; pay: number | null };
//  fight 50 + 3 × (power − theirs) + fightPct; run round(agi / theirs × 60); talk 50 + 4 × (cha − wits);
//  pay 90 or null; each whole, clamp 5..95
export const luckChoice = (c): 'fight' | 'run' | 'talk';             // best free odds; ties fight > run > talk
export function resolveRunIn(i: { choice: 'fight' | 'run' | 'talk' | 'pay'; chances; you; them;
  iron: number; healthBefore: number; healthMax: number; armour: number; rng: Rng }): RunInOutcome;
//  RunInOutcome = { steps: Array<{ row; chance; roll; ok }>, outcome: 'won'|'lost'|'ran'|'talked'|'paid',
//    healthLoss, ironPaid, heatAdded, xp: 0|10|20, fullStrength: boolean, cause: 'power'|'agi'|'cha'|'luck'|null }
//  failed Run: half a win's damage, then the fight at −10; failed Talk: the fight at −10;
//  failed Pay: the Iron, +10 Heat, the fight at full odds; a win's damage max(0, round(power × 0.8 × U[0.8, 1.2]) − armour),
//  Health floors at 1 on a win (§22.1 Q5); a loss is Health 0 (the admission sets 30)
export function caughtChance(i: { base: number; rivalGround: boolean; heatAfter: number;
  record: RecordLevel; agi: number }): number;
//  base × (rival ? 2 : 1) + floor(heat / 2) + state bonus + 5 (Repeat or worse) − floor(agi / 2); clamp 2..95
export function caughtCheck(i: { type: MissionType; paidOutcome: Outcome; street: 'none' | RunInOutcome['outcome'];
  heatAfter: number; record: RecordLevel; agi: number; rivalGround: boolean; rng: Rng }): CaughtResult;
//  only illegal types; only on a Partial or a Failure; never after 'lost' or 'ran';
//  Wanted + Failure: caught without a roll; caught while Hot/Wanted → the cells, else the name taken
```

### 6.7 `held.ts`

```ts
export const sentenceMinutes = (heat: number, rivalGround: boolean): number;
//  min(60, floor((10 + floor(heat / 2)) × (rival ? 1.5 : 1)))
export function bailFor(i: { marks: number; notorious: boolean; rivalGround: boolean; alliance: boolean;
  sources: readonly PriceLine[] /* bailPct */ }): { base: number; lines: PriceLine[]; total: number };
//  (100 + 50 × marks) × Π(1 + pct/100) over Notorious +100, rival +100, Legal Aid −50, bailPct; to the nearest 10
export function arrest(i: { at: number; heat: number; rivalGround: boolean; bail }): HeldSpec;
export function admit(i: { at: number; level: number }): { held: HeldSpec; health: HealthTimer };   // 30, 20 minutes
export const heldNow = (h: { until: number; state: 'in' | 'out' }, now: number): 'in' | 'out';
export function release(i: { held; at: number; level: number; health: HealthTimer }):
  { heat: HeatTimer | null /* cells: 25 at `at` */; health: HealthTimer; deport: boolean };
export function walkOut(i: { energy: EnergyState; now: number; level: number; iron: number }):
  { ok: true; energy; health } | { ok: false; reason: 'NOT_ENOUGH_ENERGY' | 'NOT_ENOUGH_IRON' };   // 5 E (no Rested), 100 Iron, full
export function dischargeSelf(i: { energy; now; level; health }): ...;   // 5 E, max(half max, current)
export function deportation(i: { at: number; minutes: number }): { boardedAt; arrivesAt; barredUntil };   // +24 h
```

### 6.8 Opinion against and rival ground (`opinion.ts`, `rivalGround.ts`)

```ts
export function applyAgainst(shares: OpinionShares, i: { actor: FactionId; target: FactionId; swing: number;
  homeFactionId?: FactionId; cap?: number }): { shares: OpinionShares; taken: number; toActor: number; toNeutral: number };
//  integer thousandths; taken ≤ swing, ≤ target − floor (50 for a home faction at home), ≤ cap;
//  toActor = floor(taken / 2), toNeutral = the rest; the sum stays 100.000
export interface RivalGroundState { homeFactionId: FactionId; unrest: boolean; pressureLeft: number }
export function rivalGroundOf(i: { homeFactionId?: FactionId; actor: FactionId; morale: MoraleState | null;
  pressure: { day; lost; prev } | null; today: DayKey }): RivalGroundState | null;
export const RIVAL_ROW: CheckBonus = { id: 'rivalGround', label: 'Rival ground', value: -16 };
PlaceState += { rivalGround: RivalGroundState | null };             // ADR 0030's place
rewardShares(...)  // + { id: 'rivalGround', label: 'Rival ground', share: 0.5 | 0.75 } on the FXP line
placeCheckBonuses(...)  // + RIVAL_ROW on every checked action and mission on rival ground
```

### 6.9 `travel.ts` v3

```ts
export type DestinationState = 'here' | 'open' | 'rival' | 'barred' | 'later' | 'level';   // 'rival' is now boardable
destinationState(i + { barredUntil: number | null; now: number });
export function drawHostileCard(i: { firstRival: boolean; heat: number; seen: readonly string[];
  rotation: readonly string[]; firstId: string; listed: { id: string; heatAtLeast: number }; rng: Rng }):
  { eventId: string; seen: string[] };
//  the first trip to rival ground: the checkpoint (added to seen); else Heat ≥ 50: the list (seen unchanged);
//  else uniform without replacement, resetting when all three were seen (§22.1 Q12)
drawJourneyCard(i)       // `first` now means "the first journey that is neither to rival ground nor a deportation"
journeyChoiceCheck(i + { difficulty: 10 | 14 })   // 14 on the hostile deck
resolveJourneyChoice(i + { gateHolds?: boolean })  // a gated choice: 'chosen', the success rewards and text when it
                                                   //  holds, the partial ones otherwise (`branch: 'pass' | 'stopped'`)
JourneyRewardsSpec += { heat?: number; flag?: 'watched' | 'warned' };
```

### 6.10 `quarters.ts`

```ts
export function quarterOpen(q: { opens: { level: number } | { edition: 'later' } }, level: number,
  heldHere = false): { open: boolean; lock: { kind: 'level'; level: number } | { kind: 'edition' } | null };
```

### 6.11 Changed functions

| Function | Change |
|---|---|
| `computeRewards` | `tier: 1 \| 2`. Tier 2 uses `TIER2` rates and Failure's XP share; `ironMultiplier`; `line()` accepts negative shares (the record) and keeps a Partial's floor of 1 on the base |
| `rewardShares` | the rival-ground FXP share; `recordIronPct` for missions |
| `placeCheckBonuses` | the rival row; the close race's +5 also on speech missions (§22.1 Q6: not the illegal types) |
| `resolveTier1Action` | on rival ground: the rival row and the FXP share, and `opinion: { mode: 'against', target: home, cap }`; `times > 1` returns `ONCE_ON_RIVAL_GROUND`; a new option `forceOutcome: 'partial'` builds the dropped twin from the same seed |
| `orderMatches(m, a, ctx)` | `ctx.rivalGround` → false; `kinds` includes `mission` |
| `ordersForDay(templates, day, residence, level)` | skips templates whose `minLevel` is above the character's Level |
| `pointsFor(energy, outcome)` | Failure → 0 |
| `districtState` | returns `leader` (top faction share; a tie leaves the first in `FACTION_IDS` order) |
| `resolveChapterCheck` | returns the approach's `heat` (applied on any outcome) |
| `selectHeadlines` | the risk conditions (§11.2) |
| `ORDINANCE_BOUNDS`, `effects()` | `heatCoolPct` (sources multiply: ADR 0030's percentage rule), `bailPct` (multiplies, like `ticketPct`) |

`computeCheck`, Energy, Rested and the City Day are unchanged: rival ground is a check row (ADR 0034).

### 6.12 Types: views, results, errors

All are in `types.ts` (§8.3, §10).

`GameErrorReason` gains:

- `HELD { kind, until }`, `RUN_IN_PENDING { encounterId }`, `NO_RUN_IN`;
- `UNKNOWN_MISSION`, `UNKNOWN_WAY`, `MISSION_LOCKED { reason, need }`, `OWN_FACTION_TARGET`;
- `RECORD_BARRED`, `ONCE_ON_RIVAL_GROUND`, `BARRED { until }`;
- `NOT_HELD`, `NOT_IN_CELLS`, `NOT_IN_INFIRMARY`, `NO_MARKS`, `CANNOT_PAY`.

`ActionKind` += `mission`. `ResultStamp` += `takenIn`, `carriedOff`. `PoliticalAct` += `bail`, `released`, `deported`, `walkOut`, `discharged`, `strike`.

### 6.13 Tests (Vitest, `packages/rules/test`)

- **Heat:**
  - the four states at their edges (24 / 25, 49 / 50, 74 / 75);
  - 5 an hour (32 → 24 after 96 minutes, 100 → 0 in 20 h);
  - a Customs Strike day at 7.5, then a normal day, piecewise exact;
  - no loss of a part-point across 1,000 random writes;
  - the clamp at 100;
  - `heatEta`.
- **Health:** max at Levels 1, 6 and 10 (105, 125, 145); +10 per whole 10 minutes; a level-up at full stays full (damage 0); admission at 30; the 20-minute stay ends at 50.
- **Record:**
  - the levels at 0, 1, 2, 3, 5, 6;
  - minor marks fading 14 days after the last mark of any kind (a theft mark on day 10 keeps day-1 minor marks until day 24);
  - the escalation within seven City Days (day 0 and day 6 escalate, day 0 and day 7 do not);
  - the oldest struck first;
  - the Notorious bars.
- **Missions:**
  - the ladder: 14, 16, 18, 20; Irongate 20 for a Level-10 mission (§22.1 Q1);
  - design §4.2's reward table to the unit for each type at Success, Partial and Failure, with and without Rested;
  - theft's Iron ×2;
  - the record's −10 %, −20 % and −30 % as parts;
  - `leader` and the runner-up;
  - gates;
  - the risk word bands at 0, 1, 10, 11, 24, 25;
  - `suggestedWay` ties;
  - determinism per seed;
  - the dropped twin is exactly Failure's XP;
  - Agility +¼, four Successes make a point;
  - a speech mission in a close race carries the +5 and the factor; vandalism does not.
- **Run-ins:**
  - design §10.1's examples: a Cool speech 5, a watch 10, a Hot disruption on rival ground 75, a rival tier-1 tap 15;
  - the pool rules over 20,000 seeds (own side never; police 50 ± 1 % from Noticed; an empty pool is the police);
  - economy §19.5's table: the reference recruit's Fight 29 % against the enforcer and 5 % against the constable, Run 30 % and 25 %, Talk 30 % and 14 %; a STR-20 Vanguard 74 % and 47 %;
  - the branch inspector's −10 and *won't be bought*;
  - every failed-row path in one transaction (Run, then the fight at −10; Pay, then +10 Heat and the full fight);
  - damage bounds;
  - Health floors at 1 on a win;
  - luck's choice and its ties.
- **Caught:**
  - design §15.3's example (Heat 56, AGI 5: 10 + 28 + 15 − 2 = **51**);
  - economy §19.4's three (8, 16, 33);
  - the clamp at 2 and 95; rival ×2 on the base;
  - none on a Success, after a loss or a run, or on surveillance;
  - Wanted + Failure without a roll.
- **Held:**
  - sentences: 39 at Heat 58; 58 on rival ground; never over 60;
  - design §8.2's bail examples: 100, 200, 800, 1,600, 800, and *The Cells Are Full* halving;
  - release Heat 25; discharge at half or the current value; deportation times.
- **Opinion against:**
  - design §11.3 (0.3 against the Vanguard: Vanguard −0.3, actor +0.15, Neutral +0.15);
  - the floor at 50;
  - the cap's remainder (1.97 lost, a 0.05 swing takes 0.03);
  - the sum stays exactly 100.000 over 5,000 random calls.
- **Travel:**
  - every destination state for each faction at Levels 9 and 10, with and without a bar;
  - the hostile draw: first trip, the list at Heat 50 (not 49), all three before a repeat;
  - card difficulty 14;
  - the checkpoint's gate (Cool and Clean passes; Noticed, or one mark, is stopped).
- **Orders:** `minLevel`; `kinds: ['mission']`; no match on rival ground; *Six wins* does not count a mission.
- **Quarters:** open by Level; teaser by edition.

---

## 7. The read path and the guards (`apps/server`)

### 7.1 `loadCharacter(user, content, now, opts?)`

`opts.keepRunIn: encounterId` is set only by `encounter.choose`. The order is §3.3's. `LoadedCharacter` gains `rivalGround` (the place state of the city the character is in) and `heldNow`, so the services read them once.

`ensureRunInSettled(content, c, now, keep?)`:

- if `c.runIn?.state === 'pending'` and (`c.runIn.day < dayKey(now)`, or `now ≥ decideBy` and the run-in is not the kept one),
- then call `streetService.resolve(content, encounterId, { choice: luckChoice, by: 'auto', asOf: min(decideBy, dayStart(day + 1) − 1) })`.

The resolution runs on the encounter's day: it requires `c.day.settled === encounter.day`, which holds because the settlement comes after it. If a concurrent request has already settled the day, the resolution pays the held result **without order progress** and adds its tally to today. This edge case has its own test.

`ensureReleased(content, c, now)`:

- if `c.held?.state === 'in'` and `until ≤ now`, then call `heldService.release(content, c, { as: 'served', at: until })`.

### 7.2 The guards

| Procedure | Refuses |
|---|---|
| `action.perform` | `HELD` (the one tap allowed in the cells or on the ward is `held.act`), `RUN_IN_PENDING`, `IN_TRANSIT`, `RECORD_BARRED`, `ONCE_ON_RIVAL_GROUND`, `MEMBERS_ONLY` |
| `mission.start` | `HELD`, `RUN_IN_PENDING`, `IN_TRANSIT`, `WRONG_CITY`, `UNKNOWN_MISSION` / `UNKNOWN_WAY`, `OWN_FACTION_TARGET`, `MISSION_LOCKED { LEVEL \| RANK \| STANDING }`, `RECORD_BARRED`, `NOT_ENOUGH_ENERGY` |
| `travel.board` | `HELD`, `RUN_IN_PENDING`, `BARRED { until }` (plus slice 4's) |
| `residence.register`, `residence.room`, `ambition.attempt` | `HELD`, `RUN_IN_PENDING` |
| `held.*` | `NOT_HELD`, `NOT_IN_CELLS` / `NOT_IN_INFIRMARY`, `RUN_IN_PENDING` |
| `record.strike` | `NO_MARKS`, `NOT_ENOUGH_PC { pc, cost: 30 }` |
| political acts, `paper.*`, `job.take`, `stat.place` | nothing new (they work in the cells, on the ward and on rival ground; residence and standing on rival ground are already impossible) |

Every guard is checked twice: before the key, so the client gets a clean refusal, and inside the transaction against the session's read, as slice 4's `IN_TRANSIT` is.

---

## 8. API (`apps/server`)

### 8.1 Procedures

Every procedure is protected. No input names the caller's character.

```ts
mission.start ({ locationId: z.string().min(1), missionId: z.string().min(1), wayId: z.string().min(1),
                 idempotencyKey: z.uuid() })                       → ActionResult | RunInPending
    // the §7.2 refusals · CONFLICT KEY_REUSED / ACTION_CONFLICT
encounter.current ()                                               → { pending: RunInPending } | { result: ActionResult } | null
encounter.choose  ({ encounterId: z.string().regex(/^[0-9a-f]{24}$/),
                     choice: z.enum(['fight', 'run', 'talk', 'pay', 'luck']), idempotencyKey: z.uuid() })
                                                                   → ActionResult
    // NOT_FOUND NO_RUN_IN · PRECONDITION_FAILED CANNOT_PAY { reason: 'NOT_BRIBABLE' | 'NOT_ENOUGH_IRON' }
    // a resolved run-in returns its stored result (whatever the choice sent)
encounter.close   ({ encounterId: z.string().regex(/^[0-9a-f]{24}$/) })
                                                                   → { character: CharacterView; landing: Landing | null }
    // idempotent conditional $set (runIn.state 'resolved' → null); landing set when the result sent you somewhere
held.get      ()                                                   → HeldView | null
held.act      ({ idempotencyKey: z.uuid() })                       → ActionResult        // the cell's or the ward's one tap
held.bail     ({ idempotencyKey: z.uuid() })                       → PoliticalResult     // NOT_IN_CELLS · NOT_ENOUGH_IRON
held.walkOut  ({ idempotencyKey: z.uuid() })                       → PoliticalResult     // NOT_IN_INFIRMARY · NOT_ENOUGH_ENERGY / IRON
held.discharge({ idempotencyKey: z.uuid() })                       → PoliticalResult     // NOT_IN_INFIRMARY · NOT_ENOUGH_ENERGY
held.close    ({ stayId: z.string().regex(/^[0-9a-f]{24}$/) })     → { landing: Landing | { journey: true }; character: CharacterView }
record.strike ({ idempotencyKey: z.uuid() })                       → PoliticalResult     // NO_MARKS · NOT_ENOUGH_PC

action.perform  (unchanged input)                                  → ActionResult | RunInPending   // + §7.2
travel.nation / board / journey / choose / close                   // v3 (§8.2)
city.get        → CityView v5 · character.me → CharacterView v6 · paper.today → PaperView v5
ambition.attempt                                                   // + Heat on the approach
```

### 8.2 Services

**`missionService.start`** (ADR 0002 via `runKeyedAction`; `stored()` looks in `actionLogs`, then in `encounters` by key: a pending encounter returns its `RunInPending`, a resolved one its stored result):

1. `loadCharacter`, then the §7.2 refusals.
2. In the transaction:
   1. Re-read the character. Check `DayChanged`, `IN_TRANSIT`, held, run-in and city.
   2. **Close an arrived journey in this city** (slice-4 `close`, in this session): its unanswered card's `ignoreEffects` (Heat, a flag) apply before the street's rolls.
   3. Read the city document, and the district in the capital.
   4. Compute:
      - `placeModifiers` v2 (sources, morale, close race, comeback, Issues, **rival ground**);
      - Heat, `rateOn` the residence city;
      - the live record and today's flags.
   5. `resolveMission`, then either branch of §3.1.
3. Writes in the no-run-in branch:
   - **the character**, with the version guard and `'day.settled': today`: `$set` Energy, Rested, Heat, Health, progress, Standing, orders, tally, `ways`, `record`, `held`, `firsts`, `stats.agi` / `agiQuarters`, `flags` (pruned); `$inc` Iron and version;
   - **the place**: opinion by `applyPersuasion` or `applyAgainst` (cap from `rivalPressure`), and `rivalPressure`, on the city or the district;
   - **the ledger legs** (`kind: 'action'`, `ref = logId`) and the actor's contribution;
   - **Issue points** (`$inc` guarded by `status: 'live'`; a miss is `DayChanged`, as slice 4);
   - **the stay** if taken in or carried off;
   - **the `actionLogs` row**.
4. Writes in the run-in branch: the character (Energy, Rested, Heat, `ways`, `runIn`) and the `encounters` document (`pending`, `held` = the start, `decideBy = now + 5 min`, the scaled opponent, the chances).

**`streetService`**:

- **`resolve(content, encounterId, { choice, by, asOf, idempotencyKey? })`** is the one function behind `encounter.choose` (under `withRequestKey('encounter.choose')`) and the read path's luck (no key).
  - In one transaction, it reads the encounter (`state: 'pending'`) and the character (version, `runIn.encounterId`), then runs `resolveRunIn` → `caughtCheck` → `finishMission`, or for a tier-1 held start the tier-1 write with the rolled or dropped resolution.
  - It writes as the no-run-in branch, plus: `encounters` resolved (`state: 'pending'` guard), `actionLogs` (**the start's key**, `encounterId`), and `runIn.state = 'resolved'`.
  - `asOf` is the time of the stay's `since`, Health's `at` and the ledger's `at`. The tally and orders go to the encounter's day.
- **`current(c)`**: the pending `RunInPending` (rebuilt from the encounter and the character), or the resolved run-in's stored `ActionResult`.
- **`close(c, encounterId)`**: `Character.updateOne({ _id, 'runIn.encounterId': id, 'runIn.state': 'resolved' }, { runIn: null, $inc: version })`. It returns the landing when the result sent the player to the cells or the infirmary.

**`heldService`**:

- `arrestInTx(session, c, { reason, at, heat, rivalGround, marks, logId | encounterId })` and `admitInTx(…)` are called inside the action, mission or run-in transaction that caused them. They write the stay and return the `held` pointer and the Health. The place is `content.servicesOf(cityId)`.
- **`release(content, c, { as, at, ironPaid? })`**, in one transaction:
  1. `Stay.updateOne({ _id, releasedAt: null }, …)` sets `releasedAt`, `how`, `heatAfter` / `healthAfter` and the stored `result`.
  2. The character (`'held.state': 'in'` guard): Heat `setHeat(25, at)` or the discharge's Health; Iron for bail; `held.state = 'out'`.
  3. On rival ground: a `journeys` document (`kind: 'deported'`, `n = journeysMade + 1`, from `at`, to the residence city, fare 0, no card), the character's `journey` pointer, `journeysMade + 1`, and `barred += { cityId, until: at + 24 h }`.

  After the commit, a deportation journey whose `arrivesAt > now` is scheduled for `journey-arrive` (best effort, ADR 0025).
- **`bail` / `walkOut` / `discharge`** use `withRequestKey` and call `release` with `as: 'bail' | 'walkOut' | 'discharge'` and `at = now`. Their guards: `held.kind`, Iron ≥ the stored bail (or 100), Energy ≥ 5 lazily, with no Rested spent.
- **`act`** is the held tap. `actionService`'s tier-1 compute-and-write runs on a synthetic located action (the held place and `content.heldAction(kind)`), with no run-in, under `actionLogs`. It is refused when `held.state !== 'in'`.
- **`close(c, stayId)`**: `stays.closedAt` and `held = null`, conditional on `held.stayId` and `state: 'out'`. It returns the landing: the police station's or the infirmary's pin, or `{ journey: true }` after a deportation.

**`recordService.strike`** (`withRequestKey('record.strike')`): one conditional `findOneAndUpdate` on the character (version, `pc ≥ 30`, at least one live mark). It pops the oldest live mark and decrements PC by 30. It returns a `PoliticalResult` with the `record` view.

**`actionService`** (the biggest change to slice 1–4 code, landed as a no-change split first, in T13):

1. Split `resolveAndWrite` into `computeTier1(…)` (pure inputs: modifiers, place, resolution) and `writeTier1(session, …, resolution, street?)`.
2. On rival ground:
   - refuse ×3;
   - the place state adds the rival row and the FXP line;
   - the opinion is `applyAgainst` on the home faction with the cap;
   - orders don't match;
   - roll the tier-1 run-in (`createRng(seed + ':runIn')`). If it fires, write Energy and Rested, the `runIn` pointer and an encounter whose held start is `{ rolled, dropped: forceOutcome 'partial' }`, and return `RunInPending`.
3. Close an arrived journey in this city first (as `mission.start`).
4. Training and the held tap never roll a run-in (§22.1 Q11).
5. `today.rivalCityId` is set on any act on rival ground.

**`travelService` v3**:

- `nationView`: a rival card is open from Level 10 (`state: 'rival'`, `canBoard`), or `barred` with `until`.
- `trainsFrom` lists rival destinations.
- `board`:
  - `BARRED`;
  - a rival destination draws `drawHostileCard` (with `heat` the projected value at boarding) and increments `rivalTrips`;
  - an ordinary destination draws `drawJourneyCard` with `first = !journeyDeck.firstDone`;
  - `journeys.rivalGround`.
- `choose`:
  - difficulty 14 on the hostile deck;
  - `gate` (`coolAndClean` = Heat 0–24 and no live marks);
  - the new effects: Heat through `addHeat`, `flag` to `flags[]` with the destination and `dayKey(now)`;
  - no opinion or points on a hostile card.
- `close`, the closing inside `board`, and the closing inside an act all apply an unanswered card's `ignoreEffects` once (guarded by `journeys.status: 'arrived' → 'closed'`).
- The arrival view on rival ground: the place line *Duskwall · The Fortress · rival ground*, the warning knock-on once (when `rivalTrips` was 0 before this trip, else omitted), and the flag lines. The landing is the first quarter.

**`ambitionService.attempt`**: an approach with `heat` adds it (lazily, `addHeat`) on any outcome in the same transaction. The result's `effects.heat` carries it, with `first` when this is the first Heat ever (`firsts.noticed` is untouched below 25).

### 8.3 Views

```ts
interface CharacterView /* v6 */ {
  ...v5,
  heat: { value: number; state: HeatState; at: number; stepMs: number;        // the client projects between reads
          coolsAt: number | null;                                             // under 25 ("Cool by"); null when Cool
          zeroAt: number | null };
  health: { value: number; max: number; full: boolean; at: number; fullAt: number | null };
  record: { level: RecordLevel; marks: number; fadesOn: DayKey | null; fading: number;
            bailDoubled: boolean; ironPct: number; strike: { cost: 30; affordable: boolean } | null };
  held: { stayId: string; kind: 'cells' | 'infirmary'; state: 'in' | 'out'; until: number;
          placeName: string; cityId: string } | null;
  runIn: { encounterId: string; state: 'pending' | 'resolved'; decideBy: number } | null;
  agiQuarters: number;
  here: { rivalGround: boolean; flags: Array<'watched' | 'warned'> };
  barred: Array<{ cityId: string; cityName: string; until: number }>;
}
interface RunInPending {
  kind: 'runIn'; encounterId: string; decideBy: number; serverNow: number;
  place: { cityId: string; locationId: string; locationName: string };
  what: { kind: 'mission' | 'action'; id: string; name: string };
  opponent: { id: string; label: string; appears: string; portrait: AssetView; bribable: boolean; payOff: number | null };
  you: { health: number; healthMax: number; heat: number; heatState: HeatState };
  rows: { fight: { chance: number }; run: { chance: number }; talk: { chance: number };
          pay: { chance: number; price: number; affordable: boolean } | null };   // null: won't be bought
  luck: 'fight' | 'run' | 'talk';                                                  // the "best free odds" tag
  character: CharacterView;
}
interface MissionView {                                     // LocationView.missions[], after the tickets
  id; name; type: MissionType; label: 'speech' | 'watch' | 'against'; targetFactionId: FactionId | null;
  energy: number; briefing: string;
  ways: Array<{ id; title; hint; preview: CheckBreakdown; agility: boolean;
                risk: { heat: number; runInChance: number } | null }>;   // only when it differs from the ticket's
  remembered: string | null; suggested: string;
  risk: { heat: number; runInChance: number; marks: 0 | 1 | 2 | 3 };      // of the remembered (else suggested) way
  tags: OrdinanceTagView[]; placeTags: PlaceTagView[];
  order: { id; title; progress; target } | null;
  locked: { reason: 'LEVEL' | 'RANK' | 'STANDING' | 'RECORD'; need: number; rankTitle?: string } | null;
  art: ResultArt;
}
PlaceTagView += { kind: 'rivalGround'; fxpPct: 50 | 75 } | { kind: 'record'; ironPct: number }
              | { kind: 'pressureCapped' };                 // "The town has had enough today · no opinion"
ActionView += { locked.reason: + 'RECORD' }; energy3: null on rival ground
LocationView += { missions: MissionView[] };
interface QuarterView { id; name; frame; outline: [number, number][]; label: { x; y } | null;
  open: boolean; lock: { kind: 'level'; level: number } | { kind: 'edition' } | null;
  blurb: string | null; teaser: string | null; places: number }
CityView += {
  quarters: QuarterView[];                                   // replaces { id, name, frame }[]; districts keep DistrictView
  rivalGround: { homeFactionId: FactionId; unrest: boolean;
                 pressure: { lost: number; cap: 2; left: number } } | null;
};
ResidenceCardView.state += 'rivalGround';                   // "You can't live or stand here"
OrdersView += { elsewhere: { cityName: string } | null };   // "Your orders are in Coalport today"
interface HeldView {
  stayId; kind: 'cells' | 'infirmary'; state: 'in' | 'out'; cityId; cityName; locationId; placeName;
  since: number; until: number; serverNow: number; rivalGround: boolean; again: boolean;
  bail: { total: number; lines: PriceLineView[]; affordable: boolean; legalAid: boolean } | null;
  walkOut: { energy: 5; iron: 100; affordable: boolean } | null;
  discharge: { energy: 5; healthTo: number; affordable: boolean } | null;
  health: { value: number; max: number; fullAt: number | null };
  tap: ActionView;                                          // Listen to the cells / Talk to the ward
  release: PoliticalResult | null;                          // state 'out': the stored release modal
  election: PoliticsSummaryView | null; paperUnread: number;
}
NationCityView.state += 'barred'; lockWord: + 'barred'; barredUntil?: number;
NationCityView.rival?: { homeFactionId: FactionId };       // "Rival ground · Home city of the {faction}"
JourneyChoiceView += { gated: boolean };                    // no odds word, the detail line says what it depends on
JourneyView.arrival.knockOns += { rivalGround: boolean; flags: Array<'watched' | 'warned'>; heat?: { before; after } };
DeskView += {
  held: { kind; placeName; minutesLeft; bail: number | null } | null;    // the desk's first row
  heat: { value; state; coolsAt } | null;                                 // above 0
  record: { level; marks } | null;                                        // above Clean
  where: { rivalGround: { cityName: string } } | null;
};
```

### 8.4 The settlement v5 (`computeSettlement`)

1. **Reads added:** the stays that started or ended yesterday (`Stay.find({ characterId, $or: [{ since ≥ dayStart(yesterday) }, { releasedAt ≥ dayStart(yesterday) }] })`), and the projected Heat at the settlement.
2. **Orders:** `ordersForDay(…, level)` skips `minLevel`. `{city}` is resolved in the order view. On rival ground the view's `elsewhere` is set (the orders are unchanged; they cannot be done there).
3. **Stored headlines:** the risk facts (§11.2), with `levelCrossed 6`.
4. **Records prune:** marks that have faded are dropped from the stored array, as a `$set` in the settlement's update.

### 8.5 Test hooks (only with `E2E_TEST_HOOKS`, memory mode)

| Route | Body | Does |
|---|---|---|
| `POST /api/test/character` (extended) | `{ heat?, health?, marks?: Array<{ kind, daysAgo }>, agi?, str?, cha? (worn base), rank? }` | sets the lazy states at `now` (Heat 0–100; Health a value; marks replace the record); `rank` sets FXP to the rank's floor |
| `POST /api/test/street` | `{ runIn?: 'next' \| 'never', opponentId?, checkRoll?: 1..100, choiceRoll?: 1..100, caught?: 'always' \| 'never' }` | the caller's **next** act (mission or rival tap) uses these. A memory map, consumed once, read through a `streetHooks()` seam like `cityDayHooks` |
| `POST /api/test/held` | `{ send?: 'cells' \| 'infirmary' }` · `{ releaseNow?: true }` | puts the character in the cells or the infirmary of the city they are in now (the rules' sentence and bail; reason `dev`), or sets `held.until = now` |
| `POST /api/test/run-in` | `{ decideNow: true }` | the pending run-in's `decideBy = now` (the next read resolves it by luck) |
| `POST /api/test/clock` | unchanged | the 14-day fade is a server test, not an e2e |

### 8.6 The dev panel (README "Reviewing with the dev panel")

Each new button is a call to the hooks above, followed by the existing settle. The panel holds no game rule.

- **Heat**: 0 / 30 / 60 / 80
- **Health**: full / half / 10
- **Record**: clean / 2 marks / 4 / 7
- **Next run-in**: off / random / one of the six opponents
- **Next caught**: on
- **Cells now** / **Infirmary now**
- **Release now** (shown while held)
- **Decide now** (shown while a run-in is pending)
- **Level 6**, **Rank 3** (Level 10 exists)
- **Take me to…**: the two rival home cities (no ticket, no card)
- **Lift the bar**

`GET /api/test/dev/status` adds: Heat (value, state, cool by), Health, the record (level, marks, fade day), held (kind, minutes left, bail), the run-in (state, opponent, decides at), today's flags, barred cities, and the rival pressure of the city you are in.

---

## 9. Scheduled jobs (Agenda)

**No new job.** The decide window's luck, the release and the discharge are lazy, as of their own times (ADR 0032, 0033). Nothing another player or a count reads in slice 5 depends on them being written early.

- `city-day`: unchanged in schedule and idempotency. `districtState` now also stores `leader`, the Issues step draws from 24 Issues, and `rivalPressure` needs no boundary work: it is keyed by day.
- `journey-arrive`: a deportation journey created by a request (bail on rival ground, or a release read after `until` but before `arrivesAt`) is scheduled best effort after the commit, as at boarding. One created after its `arrivesAt` is settled at once by the same read path.

---

## 10. The result modal: how the breakdown is produced

### 10.1 A mission (`ActionResult` with `kind: 'mission'`, GDD §13.1a, screens §4.3)

| Where | What | Example (posters on the fish quay, a Collective organiser at Heat 0, the run-in fired, *Pay them off*, Success) |
|---|---|---|
| `art` | the mission card for the type (`missionCards`, or the mission's `card`), else the place's kind scene, else the map crop | `scene.mission-posters` |
| `stamp` | `success \| partial \| failure` (the check's outcome; §22.1 Q19 for a Run), `takenIn`, `carriedOff` | *Success* |
| `mission` | `{ id, type, label, targetFactionId, way { id, title, stats, agility }, firstTime }` | *Mission · Against the Vanguard* |
| `street.runIn` | `{ opponent { id, label, portrait }, choice, by, steps[] (chance, roll: dev and QA only), outcome, line, cause, health { before, after, max, fullAt } \| null, ironPaid, heatAdded, xp }` | *A Vanguard street enforcer* · *He takes the notes without counting and steps back onto the kerb. "Didn't see you."* |
| `headline`, `body` | the mission's text for the check's outcome | *Bare pillars by eight* |
| `attempts[0]` | the check (odds word only on screen), the roll, the outcome, `dropped: 'ran' \| 'lost'` | *Success* |
| `rewards.xp.parts` | Rested, *the run-in +20 / +10*, *won at full strength +n* | *+50* |
| `rewards.fxp.parts` | Party order, Close race (speech), Rival ground, won at full strength | *+8* |
| `rewards.iron.parts` | Rested, *your record −n*, *paid off −60* | *+40 · paid off −60* |
| `rewards.opinion`, `effects.opinion` | `mode: 'against'`, `targetFactionId`, the target's before and after, `applied` (the target's loss), `capped` | *Opinion against the Vanguard in Coalport · −0.20 · Vanguard 9.0 → 8.8 %* |
| `street.heat` | `{ before, gain, after, state, stateBefore, coolsAt, first }` | *Heat +6 → 6 · Cool* |
| `street.caught`, `street.record` | `{ caught, withoutRoll }` (+ chance and roll for dev); `{ added, escalated, before, after, marks, first }` | — (a Success: no roll) |
| `street.sentTo` | `{ kind, stayId, placeName, until, bail, landing }` | — |
| `street.agility` | `{ quarters, gained }` | *Agility +¼ · 3 more for a point* |
| `street.remembered` | true on the first time | *Missions remember: next time, one tap* |
| `effects.*` | slice 4's Energy, Standing, orders, Issues, scoreboard, morale | *Order carried out · +20 Party XP* |
| `again` | `{ cost1: energy, cost3: null, way: { id, title } }`; absent when sent to the cells or the infirmary | **Again · 10 Energy** · **Continue** |

The knock-on order follows screens §4.3. The client words the *did* line from `steps` (*You tried to run; he was faster. You fought. You lost.*) and the reason from `cause` (`power`: *You were outmatched…*).

### 10.2 A tier-1 tap on rival ground

`ActionResult` of kind `checked` with `street` (`runIn` when one fired; no Heat or caught for a tier-1 tap):

- the FXP part *Rival ground +n*;
- the check's bonus row *Rival ground* (−16), which the client shows only as the *worse odds* tag and the reason line *This is rival ground; everything is harder here.*;
- `effects.opinion` against the home faction, with the morale knock-on when a threshold is crossed;
- after a Run or a loss: stamp *Partial*, and the row reads *Success · dropped: you ran*.

### 10.3 The cells, the infirmary and the record (`ResultModal kind: 'political'`)

| Act | Stamp | Headline · body (copy) | Knock-ons | `view` |
|---|---|---|---|---|
| `bail` / `released` | *Released* | *Out, with the duty officer's regards* | `heat { before, after: 25 }`, `iron` (bail) | `{ kind: 'held', held: null, landing }` |
| `deported` | *Put on the train* | *Escorted to the station* | `heat`, `barred { cityName, until }` | `{ kind: 'held', landing: { journey: true } }` |
| `walkOut` / `discharged` | *Discharged* | *Out, well* / *Out, on your own feet* | `health { before, after, max }`, `iron`, `energy` | `{ kind: 'held' }` |
| `strike` | *Struck off* | *One mark fewer* | `pc { before, after }`, `record { before, after }` | `{ kind: 'record', record }` |

A release read lazily stores its result on the stay. The held screen shows it as the release modal once, and `held.close` ends it.

### 10.4 Journey cards on rival ground

`JourneyCardResult.rewards` += `{ id: 'heat', amount }`; a `flag` line (*Watched today: run-ins likelier in Duskwall until midnight*); `stamp: null` for a gated choice. The arrival modal's knock-ons carry the rival-ground warning (first trip) and the flag lines.

---

## 11. The paper v5

### 11.1 Which paper

The rule is unchanged: the Herald in Irongate or on a train to it; otherwise the residence city's paper. A visitor on rival ground reads the home paper.

### 11.2 New headline conditions (design §14)

| Condition | Kind | Facts from |
|---|---|---|
| `levelCrossed { level: 6 }` → `hl.*.quarter-open` | stored | the settlement's level crossing |
| `missionFirstYesterday` → `mission-first` (`{missionTitle}`) | stored | `firsts.mission` dated yesterday, with the mission's name |
| `heatState { min: 'hot' }` → `seen` (In Print) | stored | the projected Heat at the settlement |
| `markYesterday` → `name-taken` | stored | live marks dated yesterday |
| `arrestedYesterday` → `cells` (`{minutes}`, `{how}`, In Print) | stored | a cells stay with `since` yesterday (`how` from its reason) |
| `admittedYesterday` → `infirmary` (`{opponent}`, In Print) | stored | an infirmary stay with `since` yesterday (its encounter's opponent) |
| `recordRose` → `record-up` (`{recordLevel}`, `{marks}`, `{pct}`) | stored | the level at yesterday's start against at its end, from the marks |
| `rivalGroundYesterday` → `rival-trip` (`{rivalCity}`) | stored | `today.rivalCityId` of the closed tally |
| `deportedYesterday` → `deported` (In Print) | stored | a stay with `deportJourneyId` released yesterday |
| `moraleLostToRivals { min: 1 }` → `rival-pressure` (`{lost}`, city 1) | live | the home city's `rivalPressure` for yesterday (`day`, or `prev`) |

### 11.3 The desk

The rows are live at read, in screens §2.5's order:

1. the held line, first while held;
2. *Where you are* on rival ground;
3. after *Rested*: *Heat* (above 0), then *Your record* (above Clean).

*In Print* gains `seen`, `cells`, `infirmary` and `deported`.

---

## 12. Client (`apps/client`) and UI (`packages/ui`)

### 12.1 Routes

| Route | Screen | Data |
|---|---|---|
| `/city/$cityId/overview` | **the overview of any city**: quarters (or districts) as outlines and names, lock lines, the teaser sheet, the *Quarters* list | `city.get` |
| `/city/$cityId/$quarterId` | a quarter of a home city (frame, focus outline, `lockToFrame`, its pins 7–11, the quarter bar) or a capital district | `city.get` |
| `/city/$cityId` | unchanged: the capital's overview; a home city's **landing quarter** in place (the quarter of `?loc`, else the last viewed this session, else the first) | `city.get` |
| `/held` | the cells or the infirmary (`HeldScreen`), and the release modal | `held.get` (1 s client tick; refetch at `until`) |
| `/me`, `/paper`, `/nation`, `/journey` | the record and Heat rows; the desk; rival cards and bars; hostile cards | as slice 4 |

- **The index route**: `journey` → `/journey`; `held` (in or out) → `/held`; paper due → `/paper`; else the city as in slice 4. On a held character, the Map tab lands on `/held`.
- **The run-in gate** sits in `AppShell` (the `modalGate` pattern, above the orders-complete modal):
  - `character.runIn.state === 'pending'` → `encounter.current` → `EncounterModal`, which cannot be dismissed;
  - `'resolved'` → `encounter.current` → `ResultModal kind="mission"` → Continue or *To the cells* → `encounter.close` → the landing.
- After any mutation the client renders the returned view and invalidates `character.me`, `city.get`, `paper.today`, `held.get` and `encounter.current`.

### 12.2 `packages/ui` additions (plain props, no tRPC)

New components:

- `MissionTicket`: a `Ticket` with the risk line and *Choose a way* / *Again* + *Choose another way*.
- `MissionBriefing` (a `BottomSheet` with `WayRow`s and the sticky confirm), `WayRow`, `RiskLine`.
- `EncounterModal`, `EncounterRow`.
- `HeldScreen` (kind `cells | infirmary`, progress track).
- `RecordRow`, `HeatRow`, `HealthBar`, `QuarterTeaserSheet`.

Changed components:

- `HudBar`: the Heat line above 0; the Health bar below full.
- `ResultModal`: kind `mission` with the run-in block, the dropped note, the Heat, record and agility lines and their first-time cards; *To the cells* / *To the infirmary*.
- `TramBar`: locked chips that open the teaser.
- `PlacesList`: the *Quarters* mode with lock lines.
- `Ticket`: one *Once* button on rival ground, and the rival and record tags.
- `CityCard`: rival, barred.
- `JourneyCard`: gated rows.
- `Plate`: *RIVAL GROUND* kicker, pressure line, Heat line.
- `Paper` desk rows.

`riskBand` is imported from rules, and its words come from `copy.ts`.

### 12.3 The home overview and quarters (the capital's `CityPage` path)

`CityPage` keys on `c.quarters.length > 1`, not on `districts`.

- **The overview** passes every quarter's `outline` and `label` to `CityMap`'s `outlines`, with no place pins. A tap on an open outline navigates to the quarter. A tap on a locked one opens `QuarterTeaserSheet`, which has no Enter button. The art is never dimmed for a lock. `‹ Coalport` on a quarter's plate returns to `/city/coalport/overview`.
- **A quarter** passes `frame`, `focusOutline`, `lockToFrame` and its own pins, with `TramBar` as the quarter bar.

It is one mounted map: a frame change eases on the zoom's curve, as slice 4's Deviations built it. The landing quarter (`sessionStorage`, per city) is updated on every quarter view. After `held.close` the client lands on `?loc=` the service's place.

### 12.4 Layout checks (screens §10)

- The HUD with Heat and Health both showing is at most two lines taller on 360 px.
- The mission ticket fits four lines, and *Heat +24 · Dangerous · if caught, three marks on your record* does not wrap at 360 px.
- On 375 × 667:
  - the briefing's title, text and first two rows sit above the sticky button;
  - the encounter's portrait band, your line and four rows sit above *Leave it to luck*, with no scroll;
  - the held screen's header, voice line, sentence and primary button sit above the fold.
- Quarter labels are ≥ 0.25 apart and never overlap at any size.
- Desktop: the briefing and encounter are centred cards; the held screen is the 640 px column over the dimmed map.

Matrix: 360 × 640, 375 × 667, 390 × 844, landscape, 1440 × 900.

**Double taps:** *Choose a way*'s confirm, *Again*, an encounter row, *Leave it to luck*, *Pay bail*, *Walk out well*, *Discharge yourself*, *Have a mark struck off* and *Continue* on every new modal are disabled from the tap until the returned view renders.

### 12.5 Copy and vocabulary

Screens §11's strings, the help notes (screens §2.3), the duty officer's and matron's lines and the run-in *did* sentences go to `copy.ts`. The opponents' lines, the briefings, the ways and the hostile cards are content. Both QA vocabulary guards run on every new string with the allowance of §4.2 (*front door* only). *torch* is reworded, not allowed.

---

## 13. Art (ADR 0007, 0015)

| Asset id | Source (`art-direction/mvp/`) | Kind · widths | Used for |
|---|---|---|---|
| `scene.mission-speech` | `scenes/mission-speech.png` (new) | scene · 640, 1280 | mission card: speech |
| `scene.mission-watch` | `scenes/mission-watch.png` (new) | scene | mission card: surveillance |
| `scene.mission-posters` | `scenes/mission-posters.png` (new) | scene | mission card: vandalism |
| `scene.mission-sabotage` | `scenes/mission-sabotage.png` (new) | scene | mission card: sabotage |
| `scene.mission-theft` | `scenes/mission-theft.png` (new) | scene | mission card: theft |
| `scene.news-strike` | `scenes/news-strike.png` | scene | mission card: disruption |
| `scene.hospital` | `scenes/hospital.png` | scene | binding `hospital`; the infirmary screen |
| `scene.jail-cell` | `scenes/jail-cell.png` | scene | binding `jail`; the cells screen (Irongate's Police HQ too, by screen) |
| `scene.ministry` (+ the other 13 of art-wiring-oct.md §1, if the slice-4 fix round has not wired them) | `scenes/*.png` | scene | Customs House, the checkpoint, Police HQ; docks, market, factory gate, bar for the new places |
| `portrait.street-enforcer`, `portrait.vanguard-doorman`, `portrait.strike-picket`, `portrait.branch-inspector`, `portrait.party-thug`, `portrait.duty-officer` | `portraits/<name>.png` (new, 880 × 1168, generated 3 Oct; `portrait.duty-officer`'s source file is `sergeant.png`) | portrait · 256, 512 (the 4:5 crop `{ left: 60, top, width: 760, height: 950 }`, as the avatars) | opponents; the cells' voice |
| `portrait.kessler` | `portraits/kessler.png` | portrait | the constable (slice 8's named inspector reuses it) |
| `portrait.matron` | `portraits/nurse.png` | portrait | the infirmary's voice |

- **The eleven new pictures exist** (design §21, *Done 3 Oct 2026*): five mission scenes at 2688 × 1520 and six portraits at 880 × 1168. The main session has made the content-policy read: no symbol on any badge or armband, and the duty officer's cap badge is a blank shield.
- **Alt texts** (≤ 160 characters) are drafted from design §21's descriptions, and the game designer confirms them against the actual pictures. This is a "Done when" of T9.
- **Budget.** Up to 22 scenes and 8 portraits raise the committed set beyond ADR 0015's 13 MB cap (an estimate of +5–8 MB). Measure after `pnpm art:build` and raise the cap to the measured figure plus 0.5 MB, recorded in the Deviations. This is ADR 0015's per-slice rule, so no new ADR.
- **Maps:** none to cut. The second and third quarters are on the existing pictures. The outlines are drawn in the dev map viewer (`MapViewer` shows them over both stills) and committed as content.

---

## 14. Security

| Threat | Guard |
|---|---|
| Rerolling a mission, a run-in or the caught check | One seed per start, named streams. A retry returns the stored result or the stored pending view; a different choice on a resolved run-in returns the first result |
| Choosing after seeing the outcome | The modal carries the four chances only. The check's outcome, the caught chance and every roll stay in the encounter until the resolution |
| Dodging luck by never answering | Luck on any read after five minutes, and always before the day settles, as of the decide time |
| Escaping the cells or the infirmary | `held` is read in every act's transaction; `until` is the server's clock; release only at or after `until`, or through a keyed, paid act |
| Bail, walking out or striking twice | Request keys + `held.state: 'in'` / `stays.releasedAt: null` + `pc ≥ 30` and live marks, under the version guard |
| Picking a cheaper opponent, avoiding the police | The server picks from the content pool with the seed; the client never names an opponent |
| ×3 on rival ground | `ONCE_ON_RIVAL_GROUND` at the server |
| Dodging *Watched* by not closing the arrival | The first act in the destination closes the arrival and applies the ignore effects in its own transaction |
| Pushing a home faction past the cap | `rivalPressure` read and written in the act's transaction on the same document |
| Targeting your own faction | `OWN_FACTION_TARGET` (the view hides it; the server refuses it) |
| A Notorious player at a court | `RECORD_BARRED` at the server; the client only dims |
| Test hooks in production | Unchanged: `E2E_TEST_HOOKS` requires memory mode; the street hooks map does not exist otherwise |

---

## 15. Testing

| Layer | What |
|---|---|
| Rules | §6.13 |
| Content | The real data validates. A failing fixture for every §4.2 check: a pin outside its quarter's outline, two outlines overlapping, a mission with the wrong difficulty or Energy, an illegal mission without a target or Rank, a pool with an unknown opponent, a hostile card without a `partial`, a gate on a checked choice, an opponent with `payOff: null` and a `paid` line, a `bailPct` of −60. Word-for-word comparisons with both design documents |
| DB | the two collections' indexes; migration 007 twice (no change the second time); a transaction over `characters`, `encounters`, `stays`, `actionLogs`, `journeys`, `cities` commits on the memory replica set |
| Server — the read path | a pending run-in luck-resolved at `decideBy` and not one millisecond before; one from yesterday resolved before the settlement, its tally on its own day; a release at `until` with Heat 25 at `until`; a concurrent first read resolves each once (two requests in parallel, one encounter resolution, one stay release); the edition after a night in the cells carries `cells` and not `seen` |
| Server — missions | each type end to end (rewards to the unit, Heat, the caught check by state, marks, escalation, the Iron penalty); `leader` in a close-race district; the remembered way; Agility +¼; the slot-B order and a speech order advanced, *Six wins* not; Issue points for a tagged speech mission; refusals write nothing; concurrent starts with one key → one log or one encounter; with two keys → `RUN_IN_PENDING` |
| Server — run-ins | every choice and failed path with forced rolls; Pay's Iron; luck's choice; a police loss → cells with the type's marks (and 0 for a watch); a party loss → infirmary at 30; *won at full strength*; Run drops to Failure's XP with no caught check; `encounter.choose` against luck concurrently → one resolution; a choice after `decideBy` while still pending wins; the start's retry while pending, and after resolution |
| Server — held | sentence and bail by every case; Legal Aid; *The Cells Are Full*; bail, walk out, discharge (Energy without Rested; refusals); the held tap; deportation: a journey from `until`, the bar for 24 h, `BARRED`, arrival home; a bail race against the lazy release → one release |
| Server — rival ground | boarding open from Level 10, `BARRED`; the hostile draw sequence; the checkpoint's gate both ways; flags change the next run-in chance; an unanswered card's ignore effects applied once whether closed, re-boarded or acted; ×3 refused; the FXP line (+75 % in Unrest); opinion against with the cap reached mid-action (1.97 → 2.00, the tag next); the ledger's two legs and the actor's contribution; orders untouched |
| Server — quarters and views | `CityView.quarters` for all four cities at Levels 5, 6 and 10; missions hidden from their target's members; the record lock at a court; `city.get` on rival ground (plate, residence card, `energy3: null`) |
| Server — settlement and paper | each §11.2 headline from its facts; the desk rows; orders `minLevel` and `{city}`; the rival-ground orders line |
| Server — chapter | *The riverside house* with the quiet way: Heat +6 on all three outcomes; the hook line |
| Server — integration (T19) | a risky week on the test clock for one player per faction: missions to *Hot*, the cells and bail, a deportation, the infirmary, marks fading on day 14, a strike-off. Boundary races: a run-in started at 23:59:59 and answered at 00:00:01; a release at the boundary; a mission against the Monday Issue resolution. Run ten times in a row |
| UI | fixtures for every new component and state: ticket first and remembered and locked by each reason; briefing with three ways and a loud way; encounter with and without Pay and with *Needs 60 Iron*; held screen cells and infirmary, home and rival, *again*; release modals; record rows; the overview with a locked teaser |
| E2E | §15.1 |

### 15.1 E2E specs (each in its own Playwright project after `qa-capital`, in this order)

**`quarters.spec.ts`** (phone, then the four other sizes):

1. A fresh Collective at Level 5 (hook).
2. Coalport's plate, then the name to the overview: three outlines and names. The Harbour reads *Opens at Level 6*, the Sidings *Opens with a later edition*.
3. Tap the Harbour: the teaser sheet, with no button.
4. Level 6 (hook) and reload: the Harbour is open.
5. Tap it: the zoom, five pins numbered 7–11, the quarter bar with the Sidings locked, held to the frame.
6. The bar to the Mill.
7. `/city/coalport?loc=coalport.union-hall` still opens the Mill with the Union Hall sheet.

**`missions.spec.ts`** (phone):

1. Level 6, then the Shipyard: *MISSIONS* · *Speak at the launch* · *Mission · Speech* · an odds word · *Heat +0 · A little risk*.
2. *Choose a way*, then the briefing: three rows, no digit anywhere.
3. Select a row, then the confirm *… · 15 Energy* (hooks: no run-in, check roll 1).
4. The result: *Success*, the receipt, *Missions remember*. The ticket now reads *Again* with *Choose another way*. *Again*: a result.
5. Rank 3 (hook), then the Far Bank posters (hooks: run-in next, the enforcer, choice roll 1).
6. The run-in modal: four rows, *Pay them off · 60 Iron*, *Leave it to luck*. Choose *Pay*: the result opens with the run-in block, then *Heat +6 → 6 · Cool*.
7. Hooks: run-in, the enforcer, choice roll 100. *Fight*: *Taken to the infirmary*, then *To the infirmary* → `/held`: the matron, *20 minutes*. *Discharge yourself* → *Discharged* → Continue → the Infirmary's sheet.
8. Heat 60 (hook), a forced caught, a Partial: *Taken in* → `/held` cells. *Pay bail* → *Released* → the Harbour Police sheet.
9. A pending run-in, then `POST /api/test/run-in { decideNow }` and a reload: the result modal waits (by luck).
10. Me: the Heat row and *Your record · On file*. *Have a mark struck off · 30 Political Capital* (PC hook) → *Struck off*.

**`rival.spec.ts`** (phone):

1. A Collective at Level 10, then Nation: Duskwall's card *Rival ground · Home city of the Vanguard* with **Board · 20 Iron · 15 min**. Board.
2. The journey: *Papers, please*. *Show your papers* → *Waved on*. Arrive now (hook).
3. The arrival modal: *Duskwall · The Fortress · rival ground* and the warning. Continue.
4. The plate *DUSKWALL · RIVAL GROUND* with the pressure line; a ticket with only *Once* and *Rival ground · +50 % Party XP · worse odds*; the orders panel *Your orders are in Coalport today*.
5. *Once* (hooks: run-in, *Leave it to luck*): the receipt's *Rival ground* part and *Opinion against the Vanguard*.
6. Heat 60, then Beacon House: *Spike the duplicator* (forced caught) → *Taken in* → the cells, with *Bail is double on rival ground*.
7. Release now (hook): *Put on the train* → the journey screen with no card. Arrive now: Coalport.
8. Nation: Duskwall reads *Barred · until …* with no Board button.

### 15.2 Playtest report: risk (design §19 Q10)

`pnpm report:playtest` gains a **risk** section: a pure builder in `packages/db/src/risk.ts` with fixture tests, reading `actionLogs`, `encounters`, `stays`, `journeys` and `characters` only.

- **Missions:** attempts per type per day; the share of active players who took one (legal, illegal); Success, Partial and Failure rates by type; the share repeated with *Again*.
- **Run-ins:** per day and per player; the choices (`player` by row, `luck` chosen, `auto`); the win, loss and away rates overall, and **the loss rate on auto-resolve** (the design's number to watch); Iron paid off.
- **Heat:** its distribution at mission time; the time spent *Hot* or above.
- **The record:** marks per player, level transitions, strike-offs, fades.
- **The cells and the infirmary:** count, minutes waited against paid (bail, walk out, discharge), Iron spent, and **the share of players taken in who came back the next City Day**.
- **Rival ground:** trips, cards and their choices, flags, the Party XP earned there against home, the pressure on each home city per day (cap reached), deportations.

---

## 16. QA playtest checklist (the slice question, in play)

Run on `pnpm dev:mem` with the dev panel, with testers in different factions where possible.

- [ ] **Level 6** (panel): the paper says *The Harbour Opens*. The overview shows three outlines and their names, the Harbour open, the Sidings a teaser with no button. The bar hops quarters in one tap. A quarter holds you inside its frame.
- [ ] **The first mission**: the ticket says its type, odds word and risk line in words, with no digit. The briefing's rows have odds words. One select and one confirm. The result has a receipt; the second time is *Again*, one tap.
- [ ] **A Failure** reads as a fair result, with a reason line and small XP, not a punishment.
- [ ] **Heat**: it appears on the HUD only after the first Heat. It cools while you wait. Its first *Noticed* card explains it. *Cool by* reads right on the desk and the Me tab.
- [ ] **A run-in**: the modal shows a face, a line, four rows with odds words and prices, and *Leave it to luck*. One tap; the story reads in order in the result.
- [ ] **Close the game on a run-in** for over five minutes, then come back: the result waits, by luck. Under five minutes, the run-in is still there.
- [ ] **The infirmary**: the matron, 20 minutes, the two ways out with their costs. Close the game, come back after: you are out at about 50 Health.
- [ ] **The cells**: get *Hot* and caught. The duty officer, the minutes, bail with its price. Close the game; the next morning the paper reports it and Heat is 25.
- [ ] **The record**: *On file* after a mark, the Iron tag on mission tickets, *Have a mark struck off* for 30 Political Capital.
- [ ] **Rival ground**: the trip is two taps and a card. The plate, the tags, ×1, the orders line, *against the Vanguard* in the receipt. The cells there end with the train home and a bar of a day.
- [ ] **Being away costs nothing**: three days away after a night in the cells, a stay in the infirmary or a pending run-in gives a clean return. Nothing owned is lost; only the time passed.
- [ ] **Is risk exciting rather than punishing?** Ask:
  - Did you choose an illegal mission again after a bad run-in?
  - Did *Leave it to luck* feel fair?
  - Did the cells feel like a story or a penalty?
  - Would you go back to rival ground?

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| **The run-in's two-request flow** (two collections in one tap's idempotency, luck in the read path) | ADR 0032's one `resolve` function for every path. Concurrency tests (choose against luck, start retries, two first reads). The integration suite's midnight case |
| **`actionService` changes** (rival ground, run-ins on tier 1, closing arrivals) touch slice 1–4's most used path | T13 lands the compute/write split first with no behaviour change: every slice 1–4 server test and e2e stays green. Rival ground then adds behind its place state |
| **Reads that write** (luck, releases, before the settlement) | Each is a conditional catch-up that does nothing when nothing is due. Measured: the read path adds no query when the pointers are null |
| Heat across days with changing rates | A pure piecewise projection with exactness tests; the residence city's rate only (§22.1 Q8) |
| Contention on home city documents (opinion and `rivalPressure` from visitors) | The same document slice 3 writes; visitors are few; `txAttempts` in the report |
| Randomness in e2e | Every forced roll through the street hooks; no e2e depends on chance |
| Transcription volume: 35 actions, 22 missions (briefings, 59 ways, 66 texts), 36 opponent lines, 4 cards, 5 Issues, ~38 headlines with decks, copy | Word-for-word comparison tests against the design documents (the slices 1–4 method) |
| Outlines for nine home quarters, drawn by hand | The loader's containment and overlap tests and the dev viewer; labels ≥ 0.25 apart |
| The art set over its cap | Measured and recorded (§13); mission cards fall back to the kind scene or the map crop if a picture is late |
| Run-ins feel like a trap (Appendix C #47), or luck loses too often for a weak build | The report's auto-resolve loss rate; the levers are content numbers (economy §19.11) |
| Tier-2 Iron lifts the reference day by ~40 % before the Wardrobe has prices | Economy §19.11's flag; the report tracks Iron income against sinks |

---

## 18. Idempotency and atomicity summary

- **`mission.start`:** a request key (`actionLogs` or `encounters`, both unique on `{ characterId, idempotencyKey }`) + the version guard + `'day.settled': today` + `runIn: null` + not held. One transaction per branch.
- **Run-in resolution:** `encounters.state: 'pending'` → `resolved` + the character's `runIn.encounterId` and version, in one transaction with every write and the `actionLogs` row (the start's key). `encounter.choose` adds a request key. Luck uses the same guard without a key.
- **`encounter.close`, `held.close`:** conditional `$set`s to a target state; repeating them returns the same landing.
- **Release:** `stays.releasedAt: null` + `held.state: 'in'` + the version, in one transaction with the deportation journey (unique `{ characterId, n }`). Bail, walk out and discharge add request keys and their Iron and Energy guards.
- **`record.strike`:** a request key + version + `pc ≥ 30` + a live mark.
- **A rival tap:** as slice 4's actions, plus `rivalPressure` on the same city document; a run-in branch as a mission's.
- **Cards:** `travel.choose` as slice 4. Ignore effects are applied only by the `journeys.status: 'arrived' → 'closed'` transition that wins.
- **Everything from slices 0–4:** unchanged.

---

## 19. Deliberately left out of slice 5

| Left out | Why / where |
|---|---|
| Plain clothes, forged papers, recognition by fame and office, night travel | The Wardrobe and the Dossier (slice 8) |
| Safehouses, bodyguards, the Secret Police, Operations (tier 3) | Rank 3 safehouses with the Dossier; bodyguards after the MVP; Level 20+ |
| The opportunity encounters (the disillusioned local, the leaked document); Dossier entries from theft, surveillance and the informer | Slice 8 |
| A faction mate posting bail; visits (+10 HP, 5 minutes off) | Slice 6 (the stay's `bailPostedBy` and `visits` exist and stay empty) |
| The Antidote, the Recovery Boost, control changing the infirmary's price | Buffs (slice 8); control's effects (slice 7) |
| Bribes for marks, Political Protection, the Rehabilitation Act; the CHA venues, the clothing surcharge, the vote appeal | The Black Market (slice 8); Rank 4; slice 7 |
| Jobs and bar services in the new quarters; the Gasworks | Design §2.4 |
| The third quarters' places | A later content addendum (only their outlines and teasers here) |
| ×3 on missions; social missions; exposés | GDD §13.1; slice 8 |
| A tidy job for releases | ADR 0033 §4 (slice 6 decides) |
| Deployment, R2, Atlas | Local only |

---

## 20. Task list (in order; each task leaves `pnpm lint typecheck test` green and is one commit)

**Before T1:** the slice-4 fix round (`docs/design/slice-4-fixes.md`) has landed. The new art is already in `art-direction/mvp/`.

**Parallel lanes.**

- **Phase A:** T1 first. Then T2 and T5 in parallel. T3 needs T2; T4 needs T3. Content T6 needs T5 (and T1's constants). Then T7, T8 and T9 run in parallel. DB T10 needs T6 and runs alongside T7–T9.
- **Phase B:** T11 first. Then T12 and T17 in parallel. T13 needs T12; T14 needs T13. T15 and T16 run in parallel after T14. T18 needs T16. T20 (hooks) can start after T16, alongside T18. T19 is last.
- **Phase C:** UI T21 can start after T5, on fixtures, alongside phase B. T22 needs T12; T23 needs T14 and T15; T24 needs T16 and T18; T25 needs T13 and T17. Then T26 and T27.

### Phase A — rules, content, art, db

**T1. Rules: constants, Heat, Health, the record.** §6.1–§6.4: `heat.ts`, `health.ts`, `record.ts`, the constants and their types. *Done when:* the Heat, Health and record tests of §6.13 pass, including 1,000 random writes with no lost part-point and the 14-day fade after a theft mark.

**T2. Rules: tier-2 rewards, opinion against, rival ground as a place.** `computeRewards` tier 2 (Failure, Iron multiplier, negative shares), `applyAgainst`, `rivalGroundOf`, the rival row and FXP share in `placeCheckBonuses` and `rewardShares`, and `resolveTier1Action` on rival ground (`forceOutcome`, ×1). *Done when:*
- design §4.2's reward table passes to the unit;
- the opinion-against tests pass, with exactly 100.000 over 5,000 calls;
- every slice 1–4 rules test passes unchanged.

**T3. Rules: missions.** `missions.ts`: ladder, target, gates, `wayCheck`, `suggestedWay`, `missionRisk`, `riskBand`, `resolveMission`, plus the orders' `minLevel`, `kinds: ['mission']`, `ctx.rivalGround`, `pointsFor` Failure and `districtState.leader`. *Done when:* the mission and order tests pass, including determinism per seed and the dropped twin.

**T4. Rules: run-ins, the caught check, the cells and the infirmary.** `runIn.ts` (chances, pool, scaling, luck, `resolveRunIn`, `caughtCheck`), `held.ts`, and `finishMission`. *Done when:* economy §19.5's table, design §15.3's 51 % and §8.2's bail examples pass, along with every failed-row path and the pool's 50 ± 1 % over 20,000 seeds.

**T5. Rules: travel v3, quarters, headlines, types and errors.** The destination states, `drawHostileCard`, the card gate, difficulty and effects, `quarterOpen`, the risk headline conditions and placeholders, the view, result and error types of §6.12 and §8.3. *Done when:* the travel and quarter tests pass and `pnpm typecheck` is green across the repo with the new types.

**T6. Content: schemas, accessors, cross-checks.** §4.1–§4.2, the `GameContent` accessors, failing fixtures, and Irongate's outlines moved to `Quarter.outline` (the capital's views read the new place). *Done when:* every §4.2 check has a failing fixture, the existing content validates, and slice 4's capital tests pass on the moved outlines.

**T7. Content: the second quarters.** Frames, `opens`, teasers and blurbs (Coalport from city-quarters.md; the others `TODO(game-designer)` until §22.1 Q14), outlines and labels drawn in the dev viewer, the 15 places and 35 actions with texts, `services`, `runInPool`. *Done when:*
- the comparison tests against design §2–§3 pass;
- pins equal the survey and lie inside their outlines;
- outlines don't overlap, and labels are ≥ 0.25 apart.

**T8. Content: missions, opponents, cards, Issues, orders, the chapter, headlines, copy.** §4.4's remaining rows, and the parcel's Heat. *Done when:* every comparison test passes and the vocabulary test passes with §4.2's allowances.

**T9. Art.** §13's catalogue, bindings and mission cards, `pnpm art:build`, the budget measured and raised. *Done when:*
- `art:check` passes;
- the designer has confirmed the new alt texts and the content-policy read;
- the dev viewer shows every new picture.

**T10. DB.** The `encounters` and `stays` models, the changed fields and enums, the request kinds, migration 007. *Done when:* migration 007 run twice changes nothing the second time, and a transaction over every touched collection commits.

### Phase B — the server

**T11. Server: the read path and the guards (no behaviour change for a player with no state).** `loadCharacter` v5 (§3.3, §7.1, with stubs that never fire until T15 and T16), the lazy Heat, Health and record in `CharacterView` v6, and the §7.2 guards. *Done when:* every slice 1–4 server test and e2e spec passes unchanged, and the new fields read correctly for a migrated character.

**T12. Server: the city view v5 and place modifiers v2.** `CityView.quarters` for every city, `MissionView`s (locks, hidden from the target, risk), the rival plate and residence card, `districts.state.leader` at the boundary, `PlaceState.rivalGround`. *Done when:* the quarters-and-views tests of §15 pass at Levels 5, 6 and 10 for all four cities.

**T13. Server: rival ground for tier-1 actions.** The `resolveAndWrite` compute/write split (landed first, no change), then: ×1, the rival row and FXP line, opinion against with the cap and `rivalPressure`, the ledger legs and contribution, orders off, `today.rivalCityId`, closing an arrival on the first act. No run-ins yet. *Done when:* the rival-ground server tests (without run-ins) pass and every slice 1–4 action test still passes.

**T14. Server: missions without run-ins.** `mission.start` (§8.2): the check, Heat, the caught check, the record, arrest and admission writes with `stays`, the result of §10.1, ways, Agility, orders, Issues. *Done when:* the mission tests of §15 pass (each type end to end, refusals writing nothing, concurrent keys).

**T15. Server: run-ins.** `encounters`, the pending branch of `mission.start` and of rival taps, `encounter.choose`, `current` and `close`, and luck in the read path (window and day's turn, as of the decide time). *Done when:* the run-in and read-path tests pass, including choose against luck concurrently and the midnight case.

**T16. Server: the cells, the infirmary and the record's strike-off.** Lazy release and discharge, bail, walk out, discharge, `held.act`, `held.get` and `close`, deportation and the bar, `record.strike`. *Done when:* the held tests pass, including the bail-against-release race and a deportation's arrival.

**T17. Server: travel v3 and chapter 2.** Rival boarding, the hostile deck, card gate and effects, ignore effects at close, board and act, arrival knock-ons, the Trains card, the nation's barred state; the chapter's Heat. *Done when:* the rival-ground travel tests and the chapter test pass.

**T18. Server: the settlement and the paper v5.** The risk headline facts, the desk rows, orders `minLevel` and `{city}`, the orders' `elsewhere` line, the faded marks pruned. *Done when:* each §11.2 headline is produced from its facts in a test, and an absence across a night in the cells returns a clean edition.

**T19. Server: the integration suite.** §15's risky week and boundary races. *Done when:* the suite passes ten times in a row.

**T20. Server: dev panel and test hooks.** §8.5–§8.6. *Done when:* `devPanel.test.ts` covers each new button and status field, and the hooks are absent without `E2E_TEST_HOOKS`.

### Phase C — the client, e2e, report, docs

**T21. UI package.** §12.2's components and changes, with fixtures and smoke tests. *Done when:* each component's fixture test passes and the existing UI tests pass.

**T22. Client: the home overview and quarters.** Routes (§12.1), `CityPage` on `quarters`, the teaser sheet, the quarter bar, the *Quarters* list, landing memory. *Done when:* `quarters.spec.ts` passes at the five sizes and every existing `/city/<home>` spec still passes.

**T23. Client: missions and run-ins.** The ticket, briefing and confirm, the result kind `mission`, *Again*, the run-in gate in `AppShell` (pending and resolved-unseen), the encounter modal. *Done when:* `missions.spec.ts` passes up to the infirmary, and the §12.4 layout checks pass for the ticket, the briefing and the encounter.

**T24. Client: held screens, Me, HUD, desk.** `/held` (cells, infirmary, release modals, the tap), the Me tab's rows and strike-off, the HUD's Heat and Health, the paper's desk rows. *Done when:* `missions.spec.ts` passes end to end and the held screen's layout check passes.

**T25. Client: rival ground.** The nation card (open, barred), gated card rows, the arrival's knock-ons, the plate, ×1 tickets and tags, the orders line, the deportation's landing on the journey. *Done when:* `rival.spec.ts` passes.

**T26. E2E, vocabulary, report.** The three Playwright projects after `qa-capital`, the vocabulary test over slice-5 strings with its allowances, and §15.2's risk section with a pure builder. *Done when:* the whole e2e suite is green locally, and a report run after it prints every risk section.

**T27. Docs.** The README (new dev-panel buttons and hooks, a walk-through of a first mission, a night in the cells and a rival trip), the **Deviations** section at the end of this file, ADR statuses, and the GDD edits for any answered §22.1 question that changes a number. *Done when:* the README's steps reproduce each walk-through from a fresh `pnpm dev:mem`.

---

## 21. Answers to the design's questions (design §19)

1. **Missions in content.** As suggested, with one change: missions are **`Location.missions[]`**, not a third member of `Action`. The union is discriminated on `type`, so a speech mission would collide with tier-1 `speech`, and ~40 tier-1 readers would have to learn to skip missions (ADR 0031).
   - Rates, Heat, run-in, caught base and marks by type are in rules (`MISSION_TYPES`), and content's Energy and difficulty are held to them by the loader.
   - A separate `opponents[]` with the six lines each, as suggested.
   - The hostile cards join `journeyEvents[]` with `deck: 'hostile'` and the effects `heat` and `flag`, plus two you did not list: a `gate` (the checkpoint's *Show your papers*) and `ignoreEffects` (Heat and *Watched* when slept through).
   - Party XP and XP use the existing reward fields.
2. **The run-in as a pending step.** Yes, with three refinements (ADR 0032):
   - The pending step lives in an **`encounters`** collection (the plan's), with the pointer on the character, so `actionLogs` rows stay immutable and are written once, at the resolution, under the start's key.
   - **Luck on a read only after a 5-minute decide window**, and always before the day's settlement. The client refetches the character while the modal is open (invalidations and focus), so "the next read of any kind" would resolve the run-in the player is looking at. Luck counts **as of the decide time**, so a player back a day later has served any sentence it brought.
   - The player's own choice wins whenever the run-in is still pending.

   One result modal, rendered only after the run-in, as suggested.
3. **Lazy timers.** Yes:
   - `heat { value, at }`;
   - `health { damage, at }`. Damage rather than value, so a level-up never leaves a full player "below full" with a Health bar on the HUD;
   - `held { … }`, plus a **`stays`** collection for history (the paper, the report, slice 6).

   Release and discharge happen on read as of `until`. No tidy job, as suggested (ADR 0033 §4 says why it differs from journeys).
4. **Rival ground in `cityId`.** Yes: a place state computed from the city document (ADR 0034). The cap is `cities.rivalPressure { day, lost, prev }`, written with the opinion in the action's transaction (`prev` feeds *Rival Callers*). The +4 is a named check row of −16, so the tag and the reason line come free.
5. **Day flags and the bar.** As suggested, as arrays: `flags[] { cityId, day, flag }` and `barred[] { cityId, until }`, pruned at every write. Both a *Watched* and a *Warned* on the same day count.
6. **The record.** `record { marks: [{ day, kind, logId }], arrests: [day] }`. **A mark is one unit**, so a sabotage caught adds three serious marks and *strike off* removes one for 30 PC (GDD §6.5's "30 PC per point"). Level and fading are on read. `record.strike` as suggested.
7. **The overview for home cities.** Yes: the capital's `CityPage` path with `Quarter.outline` (moved up from `district.outline`), `label`, `opens: { level } | { edition: 'later' }` and `teaser`. Routes in ADR 0035. The dev viewer shows the outlines; they are typed into content as slice 4's were.
8. **Odds words for the encounter rows.** Yes. The server sends the four chances and the client prints words. The risk word's bands are a pure `riskBand` in rules, used by both. The `power` reason is a new `cause`.
9. **Ambition.** `approaches[].heat` as suggested; nothing else changes in the chapter engine.
10. **The playtest report.** §15.2, with the two numbers you named: the loss rate on auto-resolve, and the return rate the day after being taken in.
11. **Test hooks.** §8.5: set Heat, Health, marks and stats; send to the cells or the infirmary; release now; decide now; force the run-in, the opponent, the check roll, the choice roll and the caught check. The three e2e flows you asked for are §15.1.
12. **The vocabulary test.** Checked against the two QA guards as they stand (§4.2):
    - *Constable*, *Fight*, *Run*, the opponent labels, *rival ground* and *run-in* match neither regex and need nothing.
    - *Garrison Hill* is already allowed (slice 4).
    - **sergeant** needs an allowance, which reverses slice 4's removal of the *desk sergeant* (§22.1 Q22). **Settled: no allowance; *the duty officer* is used instead (design §23.1 Q22).**
    - *front door* and the way hints' *in front of* need to join the `front` allow-lists.
    - **torch**, in Duskwall's watch, is banned by the slice-2 guard and should be reworded.

---

## 22. Questions

### 22.1 For the game designer (each has a default so the build doesn't wait)

1. **Irongate's mission difficulty.** Design §5.4 gives the four capital missions difficulty 18 and says *"the capital's +2 is already in it"*. But the ladder for Level 10 is 18 (§4.3), and GDD §8.4 and §4.3 both say +2 in the capital, which gives 20. **Default: 20** (the rule; the loader holds content to it). If 18 is meant, the rule needs a different statement (for example, "the capital's missions are written one rung down").
2. **The tier-1 run-in on rival ground.** §10.1's formula reads *"the type's base (rival-ground tier 1: 15) × 2 on rival ground"*, which would make it 30. But §11.2's table, GDD §14.12 and economy §19.6 (15 % × 30 taps) say 15. **Default: 15 flat**; the ×2 applies to missions.
3. **A loss to the police on legal work.** §8.1 says *never by a legal mission*, but the watch's pool is the police only, and the police join every pool from *Noticed*.
   - **Default:** a police loss is the cells on any mission and on a rival tap (the accepted §22 point 3), with the type's marks (none for a speech or a watch).
   - Such an arrest escalates a later one (§7.2's seven days) **only when it carried marks**.
   - §8.1 should read *"never by a legal mission, unless you lose a run-in with the police"*.
4. **Health after a police loss.** Unstated. **Default: 30**, as at admission, so nobody sits in a cell at 0.
5. **A won fight's damage taking Health to 0.** **Default: Health floors at 1 on a win**: a win never sends you to the infirmary.
6. **The close race and the comeback on illegal missions.** §4.1 says *"close race +5 % on political missions"*; §14.4 lists canvass, speech, propaganda and council. **Default: speech missions only.** Vandalism, disruption and sabotage get no close race or comeback line.
7. **What an action *against* counts for heroes and the scoreboard.** The target loses x; the actor gains x/2. **Default: the actor's leg (x/2)** is the contribution, consistent with *"you moved Eastside +1.3 for the Collective"*. The ledger records both legs.
8. **Whose `heatCoolPct`.** *Customs Strike* is a Coalport Issue. **Default: Heat cools at the residence city's rate**, wherever the player is, the same rule as the Rested cap (*the timers follow where you live*). The alternative, the city you stand in, needs a location history Heat does not have.
9. **"Cool by 20:40".** **Default:** the time Heat drops under 25 (the *Cool* state) while above it. Once Cool, the line shows no time (or *gone by {time}* for 0, if you want it).
10. **Who meets a visitor's tier-1 tap on rival ground.** Not specified. **Default: per city `runInPool`**, with the police rule on top:
    - Duskwall: the street enforcer and the doorman;
    - Coalport: the strike picket and the branch inspector;
    - Ashford: the party heavy.
11. **Training and the held taps on rival ground.** **Default:** neither rolls a run-in. Training has no Partial to drop to, and a run-in inside the cells makes no sense.
12. **A first rival trip with Heat ≥ 50.** **Default:** the first trip always draws *Papers, please*; *Your name is on a list* replaces later draws and is not part of the three-card rotation.
13. **The hostile cards' Partial rewards.** Only the detail lines state rewards. **Default:** a Partial pays half the Success's XP and Party XP (rounded half up) plus the stated *Watched* or Heat, and the Success pays the detail line. Please write them into content (T8 marks them `TODO(game-designer)`).
14. **Missing texts.**
    - *Listen to the cells* and *Talk to the ward*: Success and Partial texts.
    - The quarter blurbs for Duskwall's Pass and Town and Ashford's Wharf and Station Road: Coalport's are in city-quarters.md §2.
    - The alt texts of the 13 new pictures.

    Default: `TODO(game-designer)` stand-ins (a blurb falls back to the teaser line).
15. **Ordinances on missions.** **Default:** type-keyed effects apply to missions by the type they are seen as, so *Rally Permits* takes a speech mission from 15 to 13 Energy, and *Open Doors* and *Street Permits* touch none.
16. **"The train home" after deportation.** **Default: the residence city** (Irongate for a capital resident).
17. **The run-in decide window.** Five minutes; GDD §20's *"on the next read"* becomes *"the next read after five minutes, or the day's end"* (ADR 0032). Please record the window in §20 (and §13.1).
18. **Notorious and the Alliance's HQs.** **Default:** every Notorious player is barred, Alliance members included (§11.3 as written).
19. **The stamp after a Run.** **Default:** the stamp and text are the check's outcome (the work was done), the run-in block says you ran, the row reads *Success · dropped: you ran*, and the receipt shows only the small XP. A loss stamps *Taken in* or *Taken to the infirmary*.
20. **Missions and the slot-C orders.** **Default:** *Six wins* and *Five attempts* (`kinds: ['checked']`) do not count missions. Only the mission order and the type-matching speech and intelligence orders do.
21. **The briefing's taps.** Screens §4.2 adds a confirm (select a row, then *{Way} · 15 Energy*), so a first mission is three taps, while design §4.1 and §16 count two. **Default: the screens' confirm** (a brush on a row spends nothing). §16's table needs the extra tap.
22. **Words the QA guards ban.**
    - **Settled (design §23.1 Q22): no allowance; *the duty officer* everywhere, asset `portrait.duty-officer`.** Original default was: allow *sergeant* (§4.2). It appears in three blurbs, the notices and desk texts, the cells' voice and `portrait.sergeant`. Slice 4 removed the *desk sergeant* so that *no rank is allowed*, so please confirm the reversal (or say *duty officer*, as slice 4 did).
    - Reword Duskwall's watch Failure *"with a torch"* to *"with a lamp"* (the slice-2 guard bans *torch*).

### 22.2 For the user

None blocking. Two points for awareness, no decision needed:

1. **The art set grows** past ADR 0015's 13 MB cap with the new scenes and portraits (+5–8 MB, measured in T9 and recorded). This is the per-slice rule, and the art stays local.
2. **A run-in waits five minutes** before luck takes it (ADR 0032), so a quick look away does not cost the player their choice. The designer records it in the GDD (§22.1 Q17).

---

## 23. Notes on the design documents (for the designer)

1. **Irongate's difficulty** (§5.4 against §4.3 and GDD §8.4): §22.1 Q1.
2. **The run-in formula's ×2** (§10.1 against §11.2 and economy §19.6): §22.1 Q2.
3. **"Never by a legal mission"** (§8.1) against a police loss being the cells (§10.3, the accepted default), with the watch's police-only pools: §22.1 Q3.
4. **Missions as a member of `Action`** (§19 Q1): the union's discriminator collides on `speech` (ADR 0031).
5. **Order titles "…anywhere in Irongate through `cityId: 'home'`"** (§12.2): titles are static strings, so the residence city's name needs a `{city}` placeholder. This also fixes slice 4's Deviations note on the slot-C titles.
6. **The Herald gets "the same ten"** (§14), but it has eight: no `quarter-open` (the capital has no second quarter) and no `rival-pressure`.
7. **A knife.** §20 and §10.6 say *no weapon anywhere in the slice*, but the tram-shelter briefing (§5.4: *"a knife and ten minutes is all it takes you"*) and the posters scene's brief (§21 #3) have one. A scraper or a putty knife reads as a tool; worth a word in both before the art is final.
8. **The slot-B order gated by Level 6** (§12.2) makes the rotation per character, while GDD §13.7 says orders are faction-wide. It is built as written; the GDD sentence could say *"faction-wide among members who can do them"*.
9. **"A quarter also opens the moment the game sends the character there"** (§2.1) cannot happen in slice 5: missions need Level 6 and rival ground Level 10. It is built as a view rule only.
10. **The plan's data model row for slice 5** (`encounters` collection; `jail` and `hospital` embedded) becomes `encounters` and `stays` collections with pointers on the character (ADR 0032, 0033).
11. **The caught check after a Run**: §4.6 step 3 says *not after a loss*, and §10.3 adds *no caught check* after a Run. Both are built, so *Wanted* + Failure + a successful Run is not an arrest.
12. **The hostile cards' Partial rewards, the held taps' texts and four quarters' blurbs** are not written (§22.1 Q13–Q14).
13. **The first-time taps** (screens §4.2's confirm against §16's count): §22.1 Q21.
14. **The vocabulary note** (§19 Q12, §20) says *constable* and *sergeant* need allowances, but only *sergeant* is banned, and slice 4 removed it on purpose (*no rank is allowed*). The note also misses *in front of* (four way hints) and *torch* (Duskwall's watch). See §22.1 Q22.

---

## Deviations (as built)

### Phase A (T1–T10)

The smallest working change in each case. No economy number changed.

**Rules (T1–T5)**

- **Health's maximum is 100 + 5 for every Level after the first** (Level 1: 100; Level 6: 125; Level 10: 145). The design (§9.1) and the GDD (§6.1) pin 125 at Level 6 and 145 at Level 10, which "100 + 5 × Level" (§6.3, §6.13's "105, 125, 145") does not give. The rules follow the pinned figures; the test reads 100, 125, 145.
- **`districtState` is unchanged.** The leader is `districtLeader(shares)` (with `districtRunnerUp`) in `district.ts`. Adding `leader` to `districtState`'s return broke a slice-4 test's `toEqual`, and every slice 1–4 rules test must pass unchanged. Migration 007 uses `districtLeader`; T12 calls it at the boundary.
- **Heat is counted in integer cooling units** (a point is 7.2 × 10⁹ units; 5 an hour is 10,000 a millisecond), so a write never loses a part-point. Where a point straddles a day with a different rate, the stored `at` is rounded down to the millisecond, so cooling is never lost (at worst it gains under a millisecond). The 1,000-random-writes test runs at a constant rate and at alternating rates.
- **`resolveTier1Action`'s `ONCE_ON_RIVAL_GROUND` refusal carries `cost` and `energy`** like `NOT_ENOUGH_ENERGY`, so the slice-4 server's `!r.ok` branch compiles unchanged until T13 switches on `reason`. It also gains `forceRoll` (the first row's roll), for the test hooks.
- **`resolveMission` takes `force: { checkRoll, runIn, opponentId }`** and `caughtCheck` takes `force: 'always' | 'never'`. These are the §8.5 hooks' seams, kept in rules so the resolver stays pure and testable.
- **Way ids are the way's stat** (`str`, `agi`, `int`, `cha-int`, `best`). The design names no way ids, and every mission's ways are on different stats.
- **The tier-2 results always name their reward parts** (Rested and the Party order included). There is no slice-1 shape to keep, and the run-in's parts (*the run-in +20*, *won at full strength*, *paid off −60*) are added to them.
- **`PoliticalAct` gains the six risk acts.** Their texts are copy, not `politics.results`, so the server's council result builder takes `CouncilAct` (`PoliticalAct` without them). This is a type-only change in `councilService.ts`.
- **`ordersForDay(…, level = 1)` and `startOrders(…, level = 1)`.** A caller that passes no Level keeps the slice-4 rotation, so the slot-B mission order reaches no one until T18 passes the Level.
- **The view types are additive and optional.** New fields on `CharacterView`, `CityView`, `LocationView`, `DeskView`, `OrdersView`, `NationCityView` and the journey views are optional until phase B fills them (the slice-4 pattern). `CityView.quarters` is `QuarterView[]`, whose slice-5 fields are optional.
- **Compile-only UI cases.** Three exhaustive switches in `packages/ui` meet the widened unions: the stamps *Taken in* and *Taken to the infirmary* (failure tone), the residence card's `rivalGround` (*You can't live or stand here*), and the place tags `rivalGround`, `pressureCapped` and `record`. **The record tag's words are not in the design**; it prints the receipt's form (*your record −10*) until phase C asks the designer. Each case renders only when the phase-B server sends the new value.

**Content (T6–T8)**

- **A briefing is held to 380 characters and four sentences.** The design's 22 briefings run 259–362 characters against §4.4's "≤ 240". The designer ruled (design §23.8, 4 Oct 2026) to raise the cap and keep the briefings. Outcome texts keep 240: the designer trimmed the four that were over (`duskwall.checkpoint.drivers`, `duskwall.lock-up.hatch`, `ashford.cattle-market.speech`, `irongate.forecourt.rally`) and Coalport's Harbour blurb (204 → 192, city-quarters.md §2.2).
- **`Quarter.opens` is optional, and absent means Level 1.** `quarterOpen` reads it that way. A Zod default would make every quarter in the typed data files state it.
- **Quarters have their own id space.** The design names Ashford's second quarter and its wharf both `ashford.wharf` (§2.2, §2.3). A quarter id is a route segment and a place id is a `?loc=`, so both ids are kept and the loader checks them in separate sets.
- **Dropped: "a pool is not made only of the target's side"** (§4.2). The catalogue's Foundry Row and Rampart Row meetings draw only from the target's own people, which is the fiction (the Collective's men at the Collective's meeting). The rules drop the actor's side and fall back to the police, so a pool can never empty.
- **Dropped: "`{city}` appears only in titles"** (§4.2). The slice-4 fix round's *Sharpen up* orders put `{city}` in their lines.
- **Labels.** The capital's districts are labelled at their anchors. The 0.25 rule applies to home cities (screens §10).
- **The outlines** were drawn from the survey pins and the frames' notes (design §2.2), not in the dev viewer. Every pin, including the teaser quarters' survey pins, lies inside its own outline; no two outlines overlap; the labels sit at screens §10's hearts (Coalport) or at each quarter's middle. The designer may reshape them in the viewer; the loader holds the rules.
- **Survey pins** are now checked for every city with two or more quarters (they were checked for the capital only). The first quarters' pins already matched.
- **Missions sit in `data/missions/<city>.ts`** and are attached to their places with `withMissions`, so the city files keep their slice-1 shape.
- **`city.get` lists only the places and quarters open to the character** (`quarterOpen` at their Level). This is T12's rule, brought forward. Without it the slice-4 client would draw the Harbour's five pins for a Level-1 player. T12 adds the locked quarters back, with their locks, teasers and outlines. Slot C's `{verbs}` likewise reads only the open quarters' training, so a Level-6 Coalport member reads *Study, lift or carry* (the porters' *Carry* comes before *Run*).
- **A few slice 1–4 server and UI tests now scope to what they cover:**
  - the Ashford CHA sweep reads the places `city.get` offers;
  - the map-fit tests use the first quarter's pins;
  - the training-verb sweep counts thirteen;
  - the 30-days-away test asserts that Political Capital never falls. The larger Issue deck can tag the Mill Gate canvass, and its top-five PC is a gain while away.
- **Text the designer settled during the build** (design §23.8, 4 Oct 2026). Four outcome texts over 240 were trimmed, and so was the Harbour blurb. Duskwall's roll Failure says *which branch*, not the electoral *which ward*. The checkpoint watch's man *isn't in uniform* became *in a plain coat*. The vocabulary guard now allows the infirmary's *ward* in its hospital sense (*the ward*, *on the ward*, *the men's / women's ward*, *county's ward*, *long wards*, *four wards*).
- **Two counts in the documents are off; the tables govern.** Design §3's count line says speech 5 and propaganda 6, which with the others sums to 37; its table has 4 and 5 (35). The 22 missions sit at 19 places, not tech §4.2's 21: the three HQs carry two each.
- **A chapter choice's hint is held to 100** (was 80): *The riverside house*'s first hint is 97 characters as written.
- **The slot-B mission order is the last home slot-B template of each faction.** The loader compares its match key by key.
- **The hostile cards' detail lines** drop the design table's *unchecked* notes (the client prints no odds word for an unchecked row): *Pay the lamp* reads *30 Iron*.
- **The risk headlines live in `headlines.ts`**, because the slice-4 tests pin the other headline files' id sets. Three decks run over 200 characters once filled with the longest mission title and `{how}`: `hl.cells` 215, `hl.a.name-taken` 203, `hl.a.cells` 205. The raw templates are within 200. This is for the designer; the server should check it when it fills them (T18).
- **The run-in's *did* sentences** (`copy.risk.did`) are the developer's drafts in the design's voice, for the designer. They use *they*, as *Pay them off* does.
- **Older tests now scope to what they cover.** The slice 1–4 content tests that swept every place, action, card, Issue or order now read their own (first quarters, the ordinary deck, the first nineteen Issues, templates without `minLevel`). They are unchanged otherwise.
- **The slice-7 design commit (`1f8172a`) changed two GDD rows that older tests read.** §21.4 lists a slice-7 keepsake, `keep.deposit-receipt`, so `qa.slice2` now ignores later-slice rows. §6.5's stipend row now reads *Councillor **10 and 20 FXP***, so `qa.slice3.rules` accepts both wordings. These are test-only changes.
- **The art lane:** see T9 below.

**Art (T9)**

- Five mission scenes, the hospital, jail-cell and news-strike scenes, and eight portraits are catalogued. `portrait.duty-officer` is built from `sergeant.png` (the file keeps its name). The `hospital` and `jail` kinds now have scenes, so the slice-4 map-crop test uses Parliament.
- **The set measures 18.77 MB; the cap is raised to 19.27 MB** (ADR 0015's per-slice rule: the measured figure plus 0.5 MB; `scripts/art/build.ts`).
- **`scene.news-strike` is a 2048 × 1360 print**, not 2688 × 1520. It is cropped to the scenes' ratio (2048 × 1158). Its 640 px WebP needs a quality floor of 56 (a one-asset `PRINT_FLOOR` in the build script); the byte budgets are unchanged.
- **Three alt texts are the developer's drafts** for the designer to confirm: `scene.news-strike`, `scene.hospital`, `scene.jail-cell`. The other thirteen are design §23.5's.
- **The two QA vocabulary guards allow the exact source path `mvp/portraits/sergeant.png`.** No string a player reads says *sergeant*.
- **No gallery in the dev viewer.** `/dev/maps` shows maps only, so "the dev viewer shows every new picture" is met by `art:check` and by viewing the built files. A gallery is client work for phase C if wanted.
- **Content policy, settled (4 Oct 2026, phase B):** `scene.mission-speech` was redrawn (same asset id): the speaker leans on the rail and points down, and the crowd waves caps and claps, with no fists and no outstretched arm. Its alt text (here and in design §23.5) now describes the new picture; the asset was rebuilt (`art:check`: 76 assets, 18.76 MB). `scene.news-strike` was checked and kept as it is.

**DB (T10)**

- **The new character fields are optional in `CharacterDoc`**, with Mongoose defaults and migration 007. The slice-4 server builds typed character documents without them. The same holds for `DistrictStateDoc.leader` and the journeys' `kind`, `rivalGround` and `stayId`. Readers use `?? default` until phase B's writers fill them.
- **Some slice-4 writes rewrite a whole sub-document** (the capital's district `state`, `stats`, `today`) and drop the new values until phase B replaces them: T11–T12 must write `state.leader`, `stats.agiQuarters` and `today.missions` / `today.rivalCityId`.
- `encounters` and `stays` carry `updatedAt` as well. `StoredMark`, `StoredBail` and `RivalPressureDoc` mirror the rules' `Mark`, `Bail` and `RivalPressure` field for field.

**Left for phase B**

- **In Print** is decided by id in `paperService.ts` (`/.(hero|quoted)$/`); T18 adds `seen|cells|infirmary|deported`.
- The server passes the Level to `startOrders` (the slot-B mission order), the residence city's `heatCoolPct` rate, and `RIVAL_ROW` by setting `PlaceState.rivalGround` (T11–T13, T18).
- The three exhaustive UI cases above get their designed form in phase C (T21).

### Phase B (T11–T20)

**T11 (the read path, the guards)**

- **The lazy state lives in `apps/server/src/services/risk.ts`**: every reader goes through `heatTimerOf`, `healthTimerOf`, `marksOf`, `recordLevelOf`, `flagsToday`, `barsLive`, so a character migrated without a field reads Cool, unhurt and clean. `riskView` fills the `CharacterView` v6 fields. Views built without the residence city (a few slice-1–4 callers of `toCharacterView`) project Heat at the base rate; `character.me` passes it.
- **`HELD` is any `held.state: 'in'`**, also past `until` inside a transaction (the read path releases it first; a race keeps the stricter answer). A stay whose modal is still open (`out`) refuses nothing. Only a **pending** run-in refuses (`RUN_IN_PENDING`); a resolved one waiting for its Continue does not.
- **A retry of the tap that led to the cells or a run-in still gets its stored answer**: `action.perform` and `mission.start` look the key up before the `HELD` / `RUN_IN_PENDING` refusal.
- **`PlaceState.rivalGround` is filled in `modifiersFor`** (it now knows the actor), so every reader of the place's modifiers sees rival ground, and `rivalGroundAt` lives in `modifiers.ts` (re-exported by `risk.ts`).
- **The settlement passes the Level to `startOrders`** (the gains' Level after the boundary). Two slice-4 tests that searched a day's rotation for a Level-10 traveller now pass Level 10 to `ordersForDay` (`slice4.fixes`, `qa.slice4.issues`); test-only.
- **`addToTally` keeps fields beyond `DailyTally`** (`...c` first), so a same-day write no longer drops `today.missions` and `today.rivalCityId`; a new day's tally starts without them (read as 0 / null). No rules test changed.
- **`districts.state.leader`** is written at the capital's creation (from the baseline) and at every boundary (from the new opinion), with `districtLeader`.

**T13 (rival ground for tier-1 actions)**

- **The split**: `readPlace` (`place.ts`) reads the city, the district, the modifiers, the residence city and the Rested cap once; `computeTier1` is the rules call; `writeTier1` is every write. `moveOpinion` and `placeWrites` (`place.ts`) are shared with missions and the run-in's resolution. `leaderOf` moved to `place.ts` (still exported by `actionService`).
- **The opinion effect line gained optional fields** (rules types, additive): `mode: 'against'`, `targetFactionId`, `toActor`, `capped`. For an `against`, `shareBefore` / `shareAfter` are the target's and `applied` its loss. `capped` is true when the day's cap, not the swing, bounded it.
- **The tally's `opinion` counts the actor's leg** for an `against` (design §23.1 #7).
- **The rival-ground bonus tag** in the result reads *+50 % Party XP · worse odds* (75 in Unrest; *worse odds* alone where no Party XP is paid), and `again.cost3` is null on rival ground.
- **`RECORD_BARRED` applies to every ticket at a barred place, training included** (T12's ticket rule); `MEMBERS_ONLY` is checked first.
- **`action.perform` now returns `ActionResult | RunInPending`.** The client's `usePerformAction` skips the result modal for a `runIn` answer (the run-in gate is phase C, T23). The server tests' `callerFor` types `action.perform` as the slice 1–4 `ActionResult` and adds `action.performAny` with the full answer (a typed proxy in `test/helpers.ts`; test-only).

**T14–T15 (missions, run-ins)**

- **`mission.start` reads its inputs through T12's `missionCtx` / `missionInput`**, so the preview and the start are one computation; the refusals (`missionRefusal`) repeat the gate in the transaction against the snapshot.
- **The result of a mission is built in `missionResult.ts`**; its bonus tags follow tier 1's (Rested, Party order, Standing, Rival ground, Issue, Close race, Comeback, sources, Fired up) plus *Your record* (the Iron line). The result's `attempts[0].dropped` is set after a Run or a loss; `effects.stat` reports an Agility point when four quarters make one.
- **`firsts`**: `mission` is set at the first mission; `noticed` / `hot` / `wanted` at the first crossing into each (the result's `street.heat.first`); `mark` at the first mark (`street.record.first`).
- **Error data that would collide with `reason`** (the `GameErrorData` key) uses another key: `MISSION_LOCKED { lock: 'LEVEL' | 'RANK' | 'STANDING', need }` and `CANNOT_PAY { why: 'NOT_BRIBABLE' | 'NOT_ENOUGH_IRON' }`. (Slice 4's `ACTION_LOCKED { reason }` has the same collision; unchanged.)
- **The test hooks' forced rolls** (`streetHooks.ts`, consumed before the transaction so a retry keeps them) are carried in the encounter's held start (`held.force`) for the later choice and caught rolls. With the hooks on, results show the dev rolls (`steps[].chance/roll`, `caught.chance/roll`); off, they never do.
- **A rival tap's run-in** rolls on the `:runIn` stream after the resolution; its Partial twin is `computeTier1` with `forceOutcome: 'partial'` and the same seed. Training, the held taps and taps at home never roll one.
- **A run-in resolved after its day was settled by a concurrent request** pays the held result into today's tally with no order progress (`frozenOrders`), and an Issue no longer live is skipped (`lenientIssues`) rather than retried.
- **Health after a tier-1 run-in** is written as a timer at the resolution time (a win's damage), or 30 at the admission or the arrest.
- **The street hooks are keyed by tap** (character + idempotency key): every concurrent or retried copy of one tap takes the same force. Before, the first copy consumed the hooks and its twin rolled freely, so under load a same-key pair could commit the twin's start (a pending run-in, no `logId`) and both copies returned that. With the hooks off the copies always agreed (both return the winner's stored answer); the race was the hooks' alone.
- **`encounter.close`** returns `landing: Landing | null` (the cells' or the infirmary's place when the result sent you there).

**T16 (the cells, the infirmary, the record)**

- **`PoliticalResult` gained** (rules types, additive) the knock-ons `heat`, `health`, `energy`, `barred`, `record` and the views `{ kind: 'held'; landing }` and `{ kind: 'record'; record }`. The release modal's texts are `copy.risk` (*Released*, *Put on the train*, *Discharged*, *Struck off*). A lazy release stores its modal with an empty `idempotencyKey`.
- **The held tap** runs through `computeTier1` / `writeTier1` on a synthetic located action (the held place and `content.heldAction(kind)`), ×1, no run-in, under `actionLogs`; `held.act` refuses `NOT_HELD` (and `RUN_IN_PENDING`).
- **`held.get`'s `paperUnread`** is 1 while today's edition is unread, else 0; `election` is null in slice 5.
- **`sendToHeld` and `releaseHeldNow`** (`heldService.ts`) are the `/api/test/held` hooks' seams and are used by the server tests.

**T19 (integration)**

- **Edition assertions** in the risky week: the morning after the cells prints *cells* and not *seen*; the next, *infirmary*; after the rival arrest and the train home, *deported*, *cells* or *rival-trip*. The suite (with `slice5.missions`) passed ten runs in a row.
- **The slice-4 e2e `travel.spec.ts` follows rival ground opening at Level 10**: Ashford is a destination on the nation map, no longer muted, and the Trains card lists the rival homes, so the spec boards the Coalport button by its text. Test-only.
- **`packages/content/vitest.config.ts`** (new) sets a 30 s test timeout: two design-document comparisons ran past Vitest's 5 s default under the full Turborepo gate.

- **The risky week** runs for one player per faction (`slice5.integration.test.ts`): posters to *Hot*, taken in and bailed, a party loss and the lazy discharge, rival ground with ×2 Heat, an escalated second arrest (three serious marks), the train home and the bar, a strike-off, two weeks on (the serious marks stay). The minor-mark fade has its own test (day 13 on file, day 14 clean).
- **The Monday race** is a mission straddling midnight into a new Issue week, which lands on the new day; it carries no Issue tag (wiring a tagged speech into a forced week was more than the race needs; the slice-4 action suite covers a tagged tap at a week's turn).

**T12**

- **One check computation in rules.** `missionCheck(i)` (additive, in `missions.ts`) builds a way's check with `resolveMission`'s rows in its order (the caller's *First day* row, Standing, the sources' `chancePct` and the place's rows by the seen-as type); `resolveMission` now calls it. The rules tests pass unchanged. The server's shared context is `apps/server/src/services/missionCtx.ts` (`missionCtx`, `wayPreview`, `wayRisk`, `rememberedWay`, `missionInput`), used by `city.get` and meant for `mission.start`.
- **Every ticket at a barred place reads `RECORD`**, training included (design §7.3: *every ticket there reads Not with your record*). `MEMBERS_ONLY` wins over it, and it wins over `LEVEL` and `STANDING` on a ticket. `action.perform`'s `RECORD_BARRED` should match (training at a university too). A mission's gates keep `missionGate`'s order (Level, Rank, Standing, record).
- **The rival-ground tag is on every checked ticket and every mission** (screens §8.3), with `fxpPct` 75 in Unrest; intelligence tickets carry it too (their *worse odds* holds). `pressureCapped` is on tickets that move opinion (`givesOpinion`) and on missions whose opinion draws from the home faction (a speech, or a target that is the home faction), once the day's 2 points are taken. The order tag is null on rival ground.
- **The record tag** is `{ kind: 'record', ironPct }` with the negative percentage (−10 / −20 / −30), on every mission while the record has an Iron penalty.
- **"A quarter opens when the game sends you there"** (design §2.1) is read from `character.held`: the quarter of the held place is open while the pointer exists (in or out, until `held.close`), so the landing after a stay never meets a locked view.
- **A Level-8 or Level-10 meeting at a home city is against its home party**, so its members never see it; only visitors see the `LEVEL` lock on them.
- **`action.test.ts`'s slice-1 quarters assertion** now reads the open quarters (every quarter comes back since T12). Test-only.

**T17**

- **The arrival's Heat knock-on** (`knockOns.heat`) is what the card moved when it was answered, stored as `journeys.choice.heat { before, after }` (the field is Mixed, so no schema change), or, while the card is still unanswered, what sleeping through will cost (its `ignoreEffects` projected now). Likewise `knockOns.flags` lists today's flags in the destination plus an unanswered card's ignore flag. The modal is shown before Continue, so it says what Continue will do.
- **The warning once** is read from the journeys (`rivalGround: true` and a lower `n`), not stored: `knockOns.rivalGround` is true only on the character's first journey to rival ground.
- **`JourneyCardResult.flag?: { flag, line }`** (additive, rules types) carries a hostile card's day flag with its line (*Watched today: run-ins likelier in Duskwall until midnight*). The Heat receipt row is the Heat actually moved (after − before), so *Heat −5* at Heat 3 reads *−3*, and at 0 it is omitted like any zero.
- **`ActionResult.effects.heat?`** (additive, rules types) has `StreetView['heat']`'s shape. **`first`** (the first Heat ever) has no stored marker, so it is read as: Heat 0 projected and stored, no rival trip, no mission, no mark and no `firsts.noticed`. A Heat set only by the dev panel would read as first once more.
- **`destinationOf`, `boardRefusal` and `trainsFrom` take an optional `now`**; without it the bar is not read. `cityService` (T12) calls `trainsFrom` without it, so a barred rival home shows *Board* on the capital's Trains card until it passes `now`; `travel.board` refuses `BARRED` either way. **For T12:** pass `now` as the fifth argument.
- **`BARRED { cityId, until }`**; `DESTINATION_LOCKED` now means Clearwater only (`lock: 'later'`).
- **The nation card** of a rival home carries `rival: { homeFactionId }` in every state (below Level 10 too); `lockWord` is null for an open rival home, `'barred'` with `barredUntil` when barred.
- **Closing an arrival in an act**: `closeArrivalInTx(content, session, c, now)` closes any arrived journey whose destination is the character's city, card or none, and clears the pointer (Continue's effect), so the act's own update must use the returned character's `version`. The board and Continue use the same inner function; Continue retries a version miss up to `MAX_ATTEMPTS`.
- **Three slice-4 tests now expect rival ground open** (test-only): `slice4.travel` (*every refusal*: a Level-10 traveller with 19 Iron is refused Duskwall for the fare), `slice4.actions` (the Trains card lists Ashford and Duskwall), and `qa.slice4.travel` (the timetable's rival homes are open with a fare and no lock word).

**T20 (the dev panel and the test hooks)**

- **The panel's buttons are dev actions, not calls to the e2e routes.** Each is `POST /api/test/dev/{heat,health,record,runIn,caught,cells,infirmary,release,decide,level6,rank3,goto,unbar}` with a `target` where it takes one (as *Live in…* does). Both the routes and the buttons call the same functions in `apps/server/src/dev/risk.ts` (`sendHeld`, `releaseNow`, `decideNow`, `setStreet`) and `applyCharacterSeed`. After *Cells now*, *Infirmary now*, *Release now* and *Decide now* the panel runs `loadCharacter`, which settles the release or the luck.
- **The routes' answers.** A bad body gets a 400 (Zod). No session gets a 401 and no character a 404, matching the character hook. A state refusal gets a 409: sending someone already held, or on a train; *Release now* while not held; *Decide now* with no run-in pending.
- **The character hook's `marks` replace the arrests too** (`record = { marks, arrests: [] }`, `logId: null`), so a clean record starts with no escalation. `health` is capped at the max for the Level after the seed. `heat` takes integers 0–100. **`rank` sets the Rank exactly** and puts FXP at its floor. It can lower both, unlike `fxp`, which never lowers the Rank. The panel's *Level 6* and *Rank 3* never lower anything (*Already Level 6*).
- **The *Record* buttons write today's minor marks**, so they fade together 14 days on and the status shows the fade day.
- ***Next run-in: Off* is `runIn: 'never'`**: the next act has no run-in. There is no "back to chance" button, because the force is used up by the next act anyway. *Next run-in* replaces only the run-in and the opponent; the rolls and *Next caught* stay set.
- **The status reports the stored character without settling it**, like the rest of the status. A run-in past its window shows *pending* until something reads it. Beyond §8.6's list, the risk block adds `level`, `street` (what the next act is forced to), `rivalHomes` and `opponents` (the panel's choices). `pressure` is the home faction's points lost to rivals today, out of the 2-point cap, in any home city, with `rivalGround` saying whether it is yours. It is null in the capital.
- ***Take me to…*** is the slice-4 *Take me to Irongate* write (`cityId`, with the journey dropped). It writes no `today.rivalCityId`, shows no arrival modal and gives no first-trip warning. It refuses a city that is not a rival home, and refuses while held.
- **`streetHooks.enabled` is a module flag.** `registerRiskHooks` sets it to true inside the `E2E_TEST_HOOKS` guard. `buildApp` never sets it back to false, because the slice-5 service tests set it by hand. So a test file that builds both apps must build the hooks-off one first (`devPanel.test.ts`, `slice5.hooks.test.ts`).
- **`POST /api/test/held { send }` while a release modal is still open** (`held.state: 'out'`) replaces the pointer, as `sendToHeld` does.

**T18 (the settlement and the paper v5)**

- **The risk facts are built by `riskEdition` in `edition.ts`** (pure) from the character before the boundary, the settlement's reads (`readRisk` in `dayService.ts`, in its session: the stays that started or ended yesterday, the action logs and encounters that name what each was for, the first mission's row) and the Heat projected at the settlement. `computeSettlement` takes them as `read.risk` (optional: the join's first-day settlement passes none).
- **Each risk headline has its own fills** (`varsByKind`, by its condition): `{missionTitle}` in *mission-first*, *name-taken* and *cells* can name three different missions on one morning, and `{rivalCity}` in *rival-trip* and *deported* two cities.
- **A headline whose fill cannot be named is not printed** (its fact reads false), so no edition carries an unfilled `{…}`. **Settled by the designer (design §14, 4 Oct 2026):** a stay with no act behind it (the test hooks' `dev` stays, the dev panel's *Cells now*) now prints *cells* with `{missionTitle}` *a word with the police* and `{how}` *no reason was given.* (`copy.risk.paper.noAct`). A dev stay in the infirmary still prints no *infirmary* (no opponent to name), and the hooks' marks (logId null) no *name-taken*; *record-up*, *seen* and *deported* need no title and print.
- **Held in the cells at the settlement** (arrested late, settled before the door opens), the edition reads the Heat the release sets (25, *Noticed*), so a night in the cells is *cells* and never *seen*, whichever side of `until` the morning read falls. Otherwise *seen* reads the Heat projected at the settlement (Hot or Wanted).
- **`{minutes}` is the minutes spent**: `releasedAt − since`, rounded, at least 1, once released (bail after 7 minutes reads *Spent 7 Minutes*); the sentence (`stay.minutes`) while still in.
- **`{how}` and the paper's `{recordLevel}` are content** (`copy.risk.paper`, additive): `caught` / `wanted` / `policeLoss` → design §14's three phrases; `{recordLevel}` *On file* / *a Repeat Offender* / *Notorious*. `{opponent}` is the opponent's label with its first letter lowered (*After a run-in with a Vanguard street enforcer.*). `{pct}` is the Iron penalty without its sign (10, 20, 30).
- **`recordRose`** compares the level from the marks dated before yesterday with the level from those dated through yesterday, both as live on yesterday; a strike-off is already gone from the stored array. **Settled (design §14, 4 Oct 2026):** *record-up*'s decks use `{marksLine}` (*One mark* / *{n} marks*, `copy.risk.paper.marksLine`, a new risk placeholder in rules), and `{recordLevel}` is title case in headlines (*On File*).
- **Risk decks are held to 200 once filled** (`fitDeck`, rules `paper.ts`, additive; applied only to templates with a risk condition, so slice 1–4 decks print exactly as before): whole sentences are dropped from the end, the first always kept; a first sentence still over is cut at a word with an ellipsis. **Settled (design §14, 4 Oct 2026):** the three decks that ran over (`hl.cells`, `hl.a.cells`, `hl.a.name-taken`) were shortened and now fit whole; `fitDeck` stays as a guard. The content test that listed them now expects none over.
- **`rival-pressure`** is live through the slice-4 capital facts: `capitalFacts` sets `moraleLostToRivals` from the residence city's `rivalPressure` (yesterday, by `day` or `prev`, in points) and `{lost}` to one decimal. Like every live city line it is merged by priority, so a morning with an ordinance or a polling line at priority ≤ 1 can outrank it; the test reads the live lines before the merge.
- **The desk's rows** (`deskRisk` in `paperService.ts`) are live at read and always present (null when they don't apply): `held` while in (minutes left rounded up; `bail` the stored total in the cells, null on the ward), `where` on rival ground, `heat` above 0 (`coolsAt` from `riskView`, null while Cool), `record` above Clean. The rows' order on the page is the client's (screens §2.5).
- **`OrdersView.elsewhere`** is set in `ordersView` whenever the character stands on rival ground, naming the residence city (which `{city}` names too). A visitor on rival ground reads the residence paper (§11.1, unchanged; tested).
- **The settlement's `today`** is written with `missions: 0` and `rivalCityId: null` (the rules' empty tally has neither), and **`record.marks`** is set to the live marks only when one has faded.
- **In Print** is matched by id with an escaped dot: `/\.(hero|quoted|seen|cells|infirmary|deported)$/`.

### Phase C (T21–T27)

The smallest working change in each case. No economy number changed; the GDD needs no edit.

**T21 (the UI package)**

- **The new components** are in `Missions.tsx` (`MissionTicket`, `RiskLine`, `WayRow`, `MissionBriefing`), `Street.tsx` (`EncounterModal`, `EncounterRow`, `RunInBlock`, `HeatRow`, `HealthBar`, `RiskRows`, and the client's lazy ticks `heatNow` / `healthNow`) and `Held.tsx` (`HeldScreen`); the quarters' `QuarterTeaserSheet`, `QuartersList` and `LockMark` are in `Capital.tsx`, and `TramBar` gains a `quarters` mode (every quarter, the current one inverted, a locked one's tap opens its teaser). The Me tab's three rows are one component, `RiskRows`, rather than separate `RecordRow` and `HeatRow` (§12.2).
- **Smooth motion everywhere** (the user's review-3 preference): `tokens.css` gains `ease-dim`, `ease-card` and `ease-sheet` (the place sheet's curve and 300 ms; a fade under reduced motion). The new modals and sheets use them, and so do the existing `BottomSheet` and `ResultModal`, which popped before.
- **No half-empty screens** (the user's review-3 preference): on a phone the run-in and the cells', the infirmary's and the record's release modals are cards at the bottom over the dimmed screen, not full-screen pages (screens §5 says "a `ResultModal`-sized card"). From 640 px they are centred cards as designed.
- **The risk line is its own row across the bottom of the mission ticket**, under the stub, the text and the button. Screens §10 says the longest line (*Heat +24 · Dangerous · if caught, three marks on your record*, 56 characters) never wraps at 360 px in 11 px Courier, but Courier's advance is 0.6 em, so it needs about 370 px. It is tracked in a little (−0.03 em) and wraps below about 390 px. **For the designer.**
- **Phase A's three placeholder UI cases:** the stamps print the design's *Taken in* and *Taken to the infirmary*; a stamp longer than twelve characters is set smaller so it stays on the picture. The residence card's `rivalGround` state prints *You can't live or stand here* (the wide layout's card; a phone drops the folded row on rival ground to keep the map's room). **The record tag's words are not in the design:** it reads ***Your record · −10 % Iron*** (`copy.risk.recordTag`), the house form of a ticket's Iron tag (*Street Fund · +25 % Iron*). **For the designer.**
- **A rival-ground ticket's *worse odds*** are its tag's words only: the check's `rivalGround` row no longer prints a second *Rival ground · worse odds* tag. A checked ticket with `energy3: null` (rival ground, the held taps) has one wider *Once* button. The ticket's `RECORD` lock reads *Not with your record*.
- **The rival reason line was never printed:** `RIVAL_ROW`'s id is `rivalGround`, but `copy.reason.penalty` had only `rival-ground`. Both keys now hold the line (*This is rival ground; everything is harder here.*).
- **Copy added to `copy.risk`** (all in the vocabulary tests' reach): `recordTag`, `toCells`, `toInfirmary`, `whileYouWait`, `heatMe`, `heatDesk`, `needsPc`, the political knock-ons (`heatKnock`, `healthKnock`, `energyKnock`, `recordKnock`), `quarterLocked`, `quartersIn`, `healthLine`, `heatReward`, `briefingKicker`, `payNone`, `rival.word` and `errors.*` (the refusals' words). The run-in's *did* sentences stay the developer's drafts.
- **Fixtures** for the UI tests are in `@irongate/rules/testing` (`slice5.ts`), read from a dev run; `packages/ui/test/slice5.test.tsx` covers every new component and state of §15's UI row and runs both vocabulary guards (with the screens' banned list and the war words) over what the slice-5 components print.

**T22 (the home overview and quarters)**

- **`/city/$cityId/overview` is any home city's overview** (a quarter route segment; no quarter has that id). The capital keeps `/city/irongate` as its overview. `/city/coalport` is the landing quarter in place: the quarter of `?loc`, else the last viewed this session (`sessionStorage`, `irongate.lastQuarter.<city>`, apart from the capital's district memory so the index route and the Map tab keep `/city/<home>`), else the first open one.
- **A quarter's plate** is the home plate with the capital's way back (*‹ Coalport*), the kicker *Coalport · The Harbour* (from 640 px; a phone keeps the plate short, since the way back and the heading say it) and the quarter's name as the heading (21 px, as a district's). The overview's plate is the home plate.
- **With one quarter open (Levels 1–5) a home city keeps slice 4's view**: no bar, no dim outside the quarter, no hold to its frame, the slice-4 plate, whose city name (*Coalport ›*) is the way to the overview and its teasers (quarters.spec step 2: "the name to the overview"). Screens §3.1 puts the bar on every quarter view, but with the bar and the lock the slice 1–4 layout specs failed (a Duskwall pin out of reach at 640 × 900 under the taller plate card; a Mill pin a hair past the viewport at 375 × 812), and every existing `/city/<home>` spec must pass unchanged (T22).
- **The quarter view proper (its plate with *‹ Coalport*, the quarter bar, the lock) starts when two quarters are open** (Level 6). In the bar a locked quarter's chip carries the lock mark and opens its teaser. On a phone under 700 px tall the orders fold to one line under the bar, as in the capital, so the pins keep their room.
- **The overview's names carry their lock lines:** `CityMap`'s `name` pins now set `sub` under the name (Courier 10 px), and the name placement counts its width, so the Sidings' *Opens with a later edition* no longer overlaps the Harbour at 360 px.
- **The Places list is titled *Places in Coalport · The Harbour*** in a quarter, and *Quarters of Coalport* lists the three on the overview.
- **The out-of-Energy card** is computed from the unlocked tickets and missions; with nothing open it does not show. Before, a place with only members-only tickets (a rival HQ, and slice 4's capital HQs of another party) took the minimum of nothing and showed *Out of Energy* at a full bar.

**T23 (missions and run-ins)**

- **The run-in gate** (`features/street/RunInGate.tsx`) sits in the shell above every screen. It shows the run-in modal while the run-in is pending, then the result (with its run-in block) until Continue or *To the cells* closes it (`encounter.close`). *Again* from that result closes the run-in first, then starts the same mission's remembered way (or the same tap on rival ground) under a new key, and shows its result in the gate. At `decideBy` + 1.5 s it reads again, so luck's result replaces the modal on a screen left open.
- **A `RunInPending` answer** (from `mission.start` or `action.perform`) seeds `encounter.current`'s cache, so the modal opens without a second request.
- **The briefing is at most 72 dvh** (screens §4.2: 70), with its rows' gaps and the sticky button (48 px) a little tighter, so the Far Bank's 360-character briefing keeps its first two ways above the button on 375 × 667 (screens §10).
- **A mission result's repeat** is one button, *Again · 15 Energy* (the remembered way); a result that sent you to the cells or the infirmary has only *To the cells* / *To the infirmary*.

**T24 (the held screens, Me, HUD, desk)**

- **`HeldView` gains optional `art` and `voice`** (rules types, additive; `getHeld` fills them: the held place's picture by the result's ladder, and `portrait.duty-officer` or `portrait.matron`). The client has no asset catalogue to build them from. This is the one server change in phase C.
- **On a desktop the held screen is the 640 px column over the held place's own picture, dimmed**, not over the dimmed city map (the map is not mounted on `/held`), which also meets the user's preference for scene art behind the important screens.
- **Being held** sends the index route and the Map tab to `/held`; the city screen goes there too once its result modal and any run-in are closed. `/held` with nothing held goes back to the city.
- **The Me tab's rows** sit in the *Wearing and papers* card, under the party card line. The strike-off is a political act (`usePoliticalAct`) with its modal.
- **The HUD's Heat line** (a 14 px line under a 44 px tap target) sits on its own line above the gauges, at the right under Political Capital; the Health bar spans the gauges' grid under Party XP. Both tick on the client (`heatNow`: a point every `stepMs`; `healthNow`: counted back from `fullAt`).
- **The desk's held row** is a button to the held screen; the *Where you are*, Heat and record rows follow *Rested*.

**T25 (rival ground)**

- **The nation card:** `state: 'rival'` is now an open rival home (Level 10): the line *Rival ground · Home city of the Vanguard*, the note, and *Board*. `barred` reads *Barred · until {weekday} {time}*, no button. The pin reads *Duskwall · rival ground · 27 min*. The slice-4 UI test that rendered `rival` as *Rival ground · from a later edition* now renders the no-service card (test-only).
- **The journey card:** a gated row prints its detail only (no odds word); a hostile card's Heat prints as *Heat +10* and its flag line under the outcome. The arrival modal's knock-ons add the warning (first trip), the Heat moved and the day's flags.
- **The plate on rival ground** shows the home party's crest and share (it printed the player's party label beside the home share), the pressure line with `left` to one decimal, and the Heat line.
- **The orders panel** on rival ground gives the compact list's place to *Your orders are in Coalport today*; the paper's list keeps both.

**T26 (e2e, vocabulary, report)**

- **The three Playwright projects** run after `qa-capital` in the order `quarters` → `missions` → `rival`. **`rival`'s match is anchored to the file name** (`/(^|[\\/])rival\.spec\.ts$/`): `/rival\.spec\.ts/` also matches `arrival.spec.ts`, and in the phone project's ignore list it would have dropped the arrival spec.
- **`quarters.spec.ts`** runs the walk-through on the phone and the overview and a quarter at 360 × 640, 375 × 667, 812 × 375 and 1440 × 900 (no overlapping names, 44 px chips, no sideways scroll). **`missions.spec.ts`** adds the 375 × 667 layout check (§12.4: the HUD at most two lines taller, the briefing's first two rows above its button, the run-in without a scroll, the cells above the fold). Step 8 forces a Failure (roll 99) rather than a Partial: the caught check runs on either.
- **The risk section** of `pnpm report:playtest` is `packages/db/src/risk.ts` (a pure builder, 11 fixture tests). From the five collections it cannot read **strike-offs** and **record levels going down** (both only in `requestLogs`): it prints *not recorded*. **Fades** are an estimate (the missions' marks faded with `liveMarks`, as if nothing was struck off), **time Hot** an approximation (5 an hour from each stored Heat reading), **flags** only from answered cards (a card slept through stores none), **pressure** rebuilt from the opinion lines, and **repeats with *Again*** inferred (the same mission and way started within 10 minutes of the last result). A run against a dev database after the walk-throughs printed every risk table.

**T27 (docs)**

- The README's test hooks, the report's risk section and three walk-throughs (*A first mission*, *A night in the cells*, *A rival trip*); ADRs 0031–0035 accepted.
