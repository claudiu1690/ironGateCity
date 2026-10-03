# Slice 4 — The battleground: technical design

| | |
|---|---|
| **Goal** | From Level 10 a player opens the painted nation map, boards a train with one tap (20 Iron), rides 12–15 real minutes in the background with an optional journey card, and arrives in **Irongate**: one painted picture, five districts as frames, each with its own opinion meter and a *close race* or *comeback* state set at the day boundary. Trams between districts are instant. A Rank 2 player standing in Irongate **registers** in a district (500 Iron, seven days between moves) and from then on votes in that district's **three-way two-seat race**, reads the *Herald* and gets the capital's Party orders. Every Monday each city draws **two Issues of the Week**; tagged work moves opinion half again and scores **points** for the party; on Sunday night the leader owns the Issue and its effect runs for a week. Every swing is written to the **influence ledger**; at each count the top contributor per district and level bracket is **District Hero**. |
| **Question** | **Do players choose to move to the capital, and does the three-way fight feel alive?** |
| **Builds on** | Slices 0–3, reviews 1–3, maps v3 and the clouds, as built on branch `slice-0` at `dbabf40` (`docs/tech/slice-3.md` and its three Deviations sections; `docs/design/maps-v3-integration.md` §9–§12) |
| **Design inputs** | `docs/design/slice-4-battleground.md` (the rules, revised 2 Oct, §16 user decisions), `docs/design/slice-4-screens.md` (the screens), `docs/design/review-3-answers.md` (free zoom, sheet motion, receipt, buttons, election screens), `docs/design/maps-v3-integration.md` §2, §11, §12, `packages/content/src/data/mapPins.ts`, GDD §3.3, §14.3–§14.6, §14.9–§14.13, §15.3, §15.10, §18.3, Appendix C #2, #8, #9, #27–#30, #41–#45, `docs/economy.md` §15 |
| **ADRs** | [0025 journeys](../adr/0025-journeys-lazy-arrival-and-a-tidy-job.md) · [0026 residence](../adr/0026-residence-the-political-home.md) · [0027 the capital](../adr/0027-capital-districts-and-the-three-way-count.md) · [0028 the ledger](../adr/0028-influence-ledger-contributions-and-awards.md) · [0029 Issues](../adr/0029-issues-of-the-week.md) · [0030 modifier sources](../adr/0030-modifier-sources-and-named-factors.md) |
| **Environment** | **Local only** until the end of the project (the user's decision): no deploy, no R2, no Atlas work. Everything is played in `pnpm dev:mem` with the dev panel (§8.7). |

Every number below is a GDD or content number. Where the design leaves a point open, this document states a default and lists the question in §22.

---

## 1. Scope

**In**

- **The nation map** (Map tab, *City | Nation*): the painted 9,216 px republic in `CityMap`, five city pins at the survey positions, a city card per pin, a *Cities* list, free zoom and drag within the review-3 limits, clouds.
- **Travel:** third class only, 20 Iron, the train leaves at the tap, 12 / 12 / 15 / 25 minutes (Clearwater locked), fares halved by the Tram Subsidy ordinance and the Tram Fare Hike Issue (floor 5); boarding from the nation map and Irongate's Central Station; lazy arrival plus a tidy Agenda job (ADR 0025); the journey screen; the arrival modal.
- **Seven journey cards**, drawn at boarding (the first journey always, then one in three, without replacement), answered during the journey or on the arrival modal.
- **Irongate:** 29 locations, 62 tier-1 actions at difficulty 10, three jobs as wages, members-only HQ tickets, five districts (frames, anchors, baselines), the district overview and the district view, the tram bar, clouds.
- **District opinion:** five meters in their own documents (ADR 0027); the 1 % drift to baseline; *close race* (Battleground) and *comeback* (Groundswell) set at the boundary; the city share as the equal average, computed on read.
- **Residence:** register in a district or at home (Rank 2, 500 Iron, seven days); the windows for voting and standing; a home seat vacated and a candidacy withdrawn at the move; the optional room (100 Iron, seven days, Rested cap +50).
- **The Irongate council:** elections per district per cycle (cycle offset 0), cross-faction ballots, NPC fill to two per faction, the turnout-weighted score, D'Hondt for two seats, ten `officeTerms`, the three-branch order paper, NPCs following their own faction's players, six of ten to pass, the Irongate menu with *Tram Subsidy*.
- **Issues of the Week:** the Monday draw per open city, feeds and tags, momentum, Sunday-night resolution (+3, 4 PC to the top five, the week's effect), 19 Issues, the Issues section of every paper.
- **The influence ledger and District / City Hero:** a row per opinion change, per-character contributions, the scoreboard line and table, heroes at each count (25 PC, a title, *In Print*).
- **Party orders for capital residents** (12 templates), the *Herald* (Irongate's paper) with its headline set, the home papers' new lines.
- **Modifier sources** (ADR 0030): ordinances and Issue effects as named lines; Battleground, Groundswell and Issue tags as named factors in the result's breakdown.
- **Dev panel and test hooks** for slice-4 playtesting: arrive now, next Monday, Level 10, live in a district, take me to Irongate.
- **Playtest report:** travel, residence, the capital's counts, Issues (§15.2).

**Out** (§19): first class, the car, the night train; rival home cities (locked) and the hostile-ground deck; Clearwater (locked); fellow travellers beyond a count, carriage chat; the home cities' station quarters; Heat, the Dossier and encounters on cards; the Mayor of Irongate; National Control; district control's effects (police, prices, safehouses); early Issue resolution; weather; the desktop Herald ticker; While You Were Away; deployment.

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| Where a journey lives | Its own `journeys` collection (one per trip, natural key `{characterId, n}`), and a small pointer `character.journey` for the one-read session | ADR 0025, §5.1 |
| Arrival | **Lazy is the guarantee:** any read at or after `arrivesAt` settles it. A tidy Agenda job `journey-arrive`, scheduled at boarding, settles it for players who never come back, so the database says where everyone is | ADR 0025, §9 (answers design §17 Q2) |
| In transit | `character.cityId` stays the city left until arrival; `character.journey.status = 'onTheWay'` is what "on the train" means. No nullable `cityId` | ADR 0025 |
| The card | Drawn at boarding from the journey's seed; resolved by `travel.choose` (natural key: one choice per journey, plus a request key); answerable until the arrival modal is closed (`travel.close`) | ADR 0025, §8 (answers Q6) |
| Residence | `character.residence { cityId, districtId, sinceDay, votesFromDay, standsFromDay, canMoveFromDay }`; one seam (`residenceOf`) replaces `homeCityId` wherever it meant *where I vote, read and take orders*; `homeCityId` keeps meaning the faction's home | ADR 0026 (answers Q4) |
| Which district you stand in | **Not a server fact** (GDD §14.13): the district view is client memory; registering names the district and needs only being in Irongate | ADR 0026 |
| District opinion | A `districts` collection, one document per district; the Irongate `cities` document keeps the city-wide state (the calendar, the council, the ordinance, the Issues) and **no** opinion; the city share is the average on read | ADR 0027 (answers Q3, Q8) |
| Battleground, Groundswell | Set at the boundary on each district document; actions read them in their snapshot | ADR 0027 |
| Elections in the capital | One `elections` document per district per cycle (`irongate.eastside:4146`); one council key per city (`irongate:4147`) for ten `officeTerms`; one order paper | ADR 0027 (answers Q3, Q11) |
| The ledger | Append a row in the transaction that changes opinion **and** keep the write-through (ADR 0010 stands); a per-character `contributions` total upserted in the same transaction serves the scoreboard and heroes | ADR 0028 (answers Q1) |
| Political Capital from the world | Hero and Issue PC are `awards` written by the city day and credited by the character's settlement (the city day never writes a character, ADR 0020) | ADR 0028 |
| Issues | One `issues` document per city per week per Issue (momentum by faction, `$inc` in the action's transaction); contributors in `contributions`; the draw and resolution in the Monday step of the city day; existing cities get their first draw lazily | ADR 0029 (answers Q7) |
| Ordinances and Issue effects together | One list of **modifier sources** per city and day; each source a named line; fixed combination rules per effect kind; two new kinds, `ticketPct` and `roomPct` | ADR 0030 (answers Q9) |
| The opinion breakdown | `rewards.opinionFactors[]`: *Close race +25 %*, *Issue: Tram Fare Hike +50 %*, *Comeback +15 %*, an ordinance's *+15 %*; the product applied in full precision, rounded once per row | ADR 0030, §10 |
| Party orders by residence | `OrderTemplate.residence: 'home' \| 'capital' \| 'any'`; `cityId: 'home'` resolves to the residence city; new match fields `districtId: 'home'`, `issueTagged`, `locationKinds` | §6.8 (answers Q4) |
| The Rested cap | Base + the **residence** city's sources of the day + the room while it runs; registering and taking a room re-base Energy at the tap | ADR 0030 §4, §22.1 Q1 |
| The wage | Each ended day's adjustment comes from **the job's city** (its ordinance and Issue effects), not the home city | §8.5 |
| The edition's paper | The Herald when the edition is printed in Irongate or on a train to it; else the residence city's paper. The Election row, the Issues and the political headlines are live and follow the residence | §11 |
| Routes | `/nation`, `/journey`, `/city/$cityId` (Irongate: the overview), `/city/$cityId/$quarterId` (a district); council routes keep their slice-3 paths | §12.1 |
| The maps | `CityMap` for all three pictures, with **free zoom and drag** per review 3 (the design's "no free zoom" lines are superseded, §23 #1); new props for label pins, district pins, at-rest focus pins and badges | §12.3 (answers Q14, Q15) |
| Testing time | E2E hooks to arrive now and to step to Monday; dev panel buttons for the same | §8.6–§8.7 (answers Q10) |

---

## 3. The calendar, the keys and the flow

### 3.1 Keys (pure, `packages/rules`)

- **City Day** and **council cycle**: unchanged (slice-3 §3.1). Irongate's offset is **0**.
- **Election keys** take a *place*: `electionKey(placeId, cycle)` where the place is a home city or a district: `coalport:4145`, `irongate.eastside:4146`. The council key stays per city: `councilKey('irongate', 4147)`.
- **Week key** (new, `week.ts`): the Monday that starts the week. `dayKey(2026-01-05) = 20458` is a Monday; `isMonday(d) ⇔ mod(d − 20458, 7) = 0`; `weekOf(d) = d − mod(d − 20458, 7)`. The existing `weekday(day)` agrees (tested).
- **Ledger cycle key** = the place's election key for the cycle of the day (`irongate.eastside:4146` for any day of cycle 4146). The scoreboard and heroes are "this election", count to count.
- **Issue document id**: `${cityId}:${weekDay}:${issueId}`, e.g. `irongate:20731:issue.tram-fares`.

**Pinned example (Irongate, offset 0; tested in rules):**

| Date (2026) | Day key | Cycle day | What happens at the boundary into this day |
|---|---|---|---|
| Sun 4 Oct | 20730 | 0 | Election 4145 counted in all five districts; council 4146 sits; elections `irongate.*:4146` open (nominations) |
| Mon 5 Oct | 20731 | 1 | **Monday:** the Issues of week 20724 resolve; week 20731 is drawn |
| Tue 6 Oct | 20732 | 2 | Nominations close (per district); polls open; council 4146 divides; its ordinance (if any) in force 20732…20736 |
| Fri 9 Oct | 20735 | 0 | Election 4146 counted; heroes of cycle 4146 named; council 4147 sits |
| Sun 11 Oct | 20737 | 2 | Council 4147 divides |
| Mon 12 Oct | 20738 | 3 | Week 20731's Issues resolve (effects in force 20738…20744, `toDay` 20745); week 20738 drawn |

### 3.2 What each boundary does

**Irongate** (one transaction per boundary, ADR 0017/0027), in the design's order (§6.6):

| Step | When | Writes |
|---|---|---|
| 1. Drift | every day | each district's shares 1 % of the distance to its baseline (`applyBaselineDrift`); ledger rows `drift` |
| 2. Issues | Monday | resolve last week's two (`resolveIssue`: +3 in the Issue's district, awards, effect), then draw this week's two (two districts) |
| 3. States | every day | per district: `battleground`, `controlledBy`, Groundswell start / end (`districtState`) |
| 4. Count | cycle day 0 | per district: count election k−1, ten `officeTerms` for council k, candidacies elected / defeated; council k−1 completed; open the five elections k (NPC jitter); order paper k with the branch motions of the seated blocs |
| 5. Heroes | cycle day 0 | per district and bracket from `contributions` of cycle k−1: `awards` (25 PC, title), the scoreboard snapshot on the election's result |
| 6. Close | cycle day 2 | per district: strike, NPC fill to two per faction, freeze the ballot |
| 7. Divide | cycle day 2 | `divideCapital`; `city.ordinance` and history |
| 8. Settle | every day | `world.settledDay = d` |

**Home cities** keep slice 3's steps, with two insertions: the **Issues** step after the drift (Monday), and **City Hero** after the count (cycle day 0).

### 3.3 The flow, and what each step touches

| # | Screen (route) | Procedure | Writes |
|---|---|---|---|
| 0 | any screen on a new day | first procedure → `ensurePlaces` (the city days of the current, residence and job cities) → `ensureSettled` → `ensureArrived` | city days; the settlement (awards credited, capital orders, the edition); a due arrival |
| 1 | Nation map (`/nation`) | `travel.nation` | — |
| 2 | Board (city card or the Trains card) | `travel.board` | `characters` (Iron, `journey`, `journeysMade`, `journeyDeck`), `journeys`, `requestLogs`; then the tidy job |
| 3 | Journey screen (`/journey`) | `travel.journey`, `travel.choose` | `journeys.choice`, `characters`, `districts`/`cities` opinion, `influenceLedger`, `contributions`, `issues`, `requestLogs` |
| 4 | Arrival modal | `travel.journey` (arrival), `travel.close` | `journeys.closedAt`; the character's arrival (lazy or the job) |
| 5 | Irongate overview / district (`/city/irongate[/…]`) | `city.get` | — |
| 6 | A capital action | `action.perform` | as slice 3 + the district document, ledger, contributions, the Issue's momentum |
| 7 | Register / room | `residence.register`, `residence.room` | `characters`; on a move also `candidacies`, `officeTerms`, the old city's `council.npcSeats` |
| 8 | Paper (`/paper`) | `paper.today` | — (the Issues section and political lines are live) |
| 9 | The capital's election (`/council/*`) | `council.*` (residence-aware) | as slice 3 |

---

## 4. Content (`packages/content`)

### 4.1 New and changed schemas

```ts
LocationKind += 'theatre';                                           // the Opera (no scene; map crop)

Quarter += {
  blurb: z.string().max(200).optional(),                             // a district's card text
  district: z.strictObject({                                         // present on every quarter of a city with districts
    n: z.int().min(1).max(9),                                        // the pin's number on the overview (1–5)
    baselineOpinion: Shares,                                         // §4.1 of the design
    anchor: z.strictObject({ x: Fraction, y: Fraction }),            // the overview pin (screens §5.1)
  }).optional(),
};
Location += { factionId: FactionId.optional() };                     // members only; required on every `faction-hq`
City.council = { offset, seats: z.union([z.literal(7), z.literal(10)]), hall };   // Irongate 10, offset 0, hall (§22.1 Q7)
City.paper   // Irongate: The Irongate Herald · Herald · "All the republic, every morning" · 6 marks

Nation = z.strictObject({                                            // new top-level section
  map: z.strictObject({ day: AssetId, night: AssetId }),
  capitalId: Id,                                                     // 'irongate'
  frame: Frame,                                                      // the five pins' box grown by 0.06: 0.06, 0.11, 0.94, 0.91
  clouds: z.boolean().optional(),
  cities: z.array(z.strictObject({
    cityId: Id, name: z.string(), x: Fraction, y: Fraction,          // equal to mapPins.nation (content test)
    minutes: z.int().min(0),                                         // third class from the capital; the capital 0
    service: z.enum(['open', 'later']),                              // Clearwater 'later' (No service yet)
    line: z.string().max(60),                                        // "Home city of the Alliance"; the capital's is live (§22.1 Q19)
    arrival: z.strictObject({ x: Fraction, y: Fraction }),           // the station point on the city picture (survey station pin)
    baselineOpinion: Shares.optional(),                              // only for a city with no content entry (Clearwater)
  })).length(5),
});

JourneyRewards = z.strictObject({ xp, fxp, iron, opinion, momentum, rested: optional non-negative numbers;
                                  quoted: z.literal(true).optional() });
JourneyChoice = z.strictObject({
  id: Id, title: z.string().max(40), detail: z.string().max(90),     // "{destination}", "{issue}" placeholders
  stats: CheckStatsSchema.optional(),                                // absent: unchecked (no odds word)
  cost: z.strictObject({ iron: z.int().min(1) }).optional(),         // Sit in 20, Pay his fare 10
  success: z.strictObject({ rewards: JourneyRewards, text: OutcomeText }),
  partial: z.strictObject({ rewards: JourneyRewards, text: OutcomeText }).optional(),   // required when `stats`
});
JourneyEvent = z.strictObject({ id: Id, title: z.string().max(40), setup: StoryText,
                                choices: z.array(JourneyChoice).min(2).max(3), ignore: StoryText,
                                first: z.literal(true).optional() });                 // jev.passenger

IssueMatch = OrderMatch fields { actionTypes, locationIds, locationKinds, districtId } (at least one);
Issue = z.strictObject({
  id: Id, name: z.string().max(40), short: z.string().max(30), blurb: z.string().max(160),
  where: z.array(z.strictObject({ cityId: Id, districtId: Id.optional(),
                                  feeds: z.array(IssueMatch).min(1) })).min(1),        // OR of the matches
  effects: z.array(OrdinanceEffectSchema).min(1), effectLine: z.string().max(60),      // "Tickets from Irongate: half price"
  stances: z.strictObject({ vanguard: Stance, collective: Stance, alliance: Stance }), // ≤ 90 each
});

OrdinanceEffectSchema += [
  z.strictObject({ kind: z.literal('ticketPct'), value: z.int() }),  // bound −50…0 (ADR 0030)
  z.strictObject({ kind: z.literal('roomPct'),   value: z.int() }),  // bound −50…0 (§23 #2)
];
OrderMatch += { districtId: z.union([z.literal('home'), Id]).optional(),
                issueTagged: z.literal(true).optional(),
                locationKinds: z.array(LocationKind).min(1).optional() };
OrderTemplate += { residence: z.enum(['home', 'capital', 'any']).default('home') };   // slot C templates: 'any'
NpcCandidate += { districtId: Id.optional() };                        // required for a city with districts
HeadlineCondition += CapitalCondition | IssueCondition | TravelCondition;            // §11.3
Content += { nation: Nation, journeyEvents: z.array(JourneyEvent).length(7), issues: z.array(Issue) };
```

`GameContent` gains `nation()`, `nationCity(id)`, `journeyEvent(id)`, `journeyDeck()` (ids, file order), `issue(id)`, `issuesFor(cityId)` (eligible, with the city's feeds), `district(id)`, `districtsOf(cityId)`, `isDistricted(cityId)`, `slateOf(placeId, factionId?)` (a district's two per faction, profile order), `irongateMenu()` (the ten plus Tram Subsidy), `capitalCity()`; `hqOf(factionId, cityId = the faction's home)`; `headlinesOf(cityId)` serves `irongate`. `councilCities()` now includes Irongate.

### 4.2 Loader cross-checks (added)

- **Districts:** a city with any `quarter.district` has it on every quarter; its `role` is `battleground`; `n` runs 1…k; every baseline sums to 100; the city's `baselineOpinion` equals the equal average of its districts (Irongate 21 / 21 / 21 / 37); anchors are inside their frames; the frames are the design's (§4.2) to two decimals.
- **Locations:** every `faction-hq` has `factionId`, and it is the faction whose HQ it is (one per faction per city at most); `quarterId` names a quarter of its city; every pin is at least 0.02 inside its frame (the existing test, now on five frames); every Irongate pin equals its survey pin.
- **Nation:** five cities, ids equal to `mapPins.nation` and positions equal to it; the capital's `minutes` is 0; `cityId` of every `service: 'open'` entry is a content city; `arrival` equals the city's survey station pin (`coalport.station` 0.46, 0.62 · `duskwall.station` 0.20, 0.73 · `ashford.station` 0.82, 0.08 · Irongate: Central Station 0.35, 0.555); the frame contains every pin with ≥ 0.06 margin.
- **Journey events:** seven; exactly one `first`; ids `jev.*`; a checked choice has `partial`, an unchecked one does not; `detail` placeholders only `{destination}` and `{issue}`; texts ≤ 240 characters and ≤ 4 sentences; per outcome `xp ≤ 45`, `fxp ≤ 6`, `opinion ≤ 0.05`, `momentum ≤ 10`, `rested ≤ 10` (the design's cap of a 10-Energy action; Iron is not capped until §22.1 Q2 is answered); a `cost.iron` choice's partial returns at most the stake.
- **Issues:** ids `issue.*` unique; nineteen; every `where.cityId` is a council city; in a districted city `districtId` is required and names a district; every `locationIds` entry exists **in that city** (and district); every effect within its bound; Irongate has ≥ 2 districts with eligible Issues (it has 5) and every city ≥ 4 eligible (so "never last week's two" can always draw); stances ≤ 90; effect lines free of system words (the review-2 regex).
- **Orders:** each faction has two `residence: 'capital'` templates in slot A and two in B; `{issue}` appears only in `issueTagged` templates; slot C templates are `'any'`.
- **Candidates:** for Irongate, exactly two per faction per district, each with `districtId`; profiles 28 then 20; no name shared with the slice-3 slates, the secretaries or each other.
- **Ordinances:** `ord.tram-subsidy` present (in the home menus as well, design §8.5); the Irongate menu is the ten plus it.
- **Headlines:** the Herald (`cityId: 'irongate'`) has one template for each design id of §12 and §9.6 and for every slice-1 kind (the stand-ins of design §12's last rows); every home paper has `train-open`, `issues-drawn`, `issue-leading`, `issue-open`, `issue-resolved`, `issue-lapsed`, `issue-pc`, `hero`, `moved-away` and `quoted` (stand-ins allowed, marked `TODO(game-designer)` as slice 3's Q9).

### 4.3 Placeholders

| Where | Added | Resolved |
|---|---|---|
| Journey card details and texts | `{destination}` (the city or, for Irongate, *Station & Market*), `{issue}` (the destination's first Issue's `short`) | server, at the journey view |
| Capital and Issue headlines | `{district}` `{districtShort}` `{winners}` `{seatsV}` `{seatsC}` `{seatsA}` `{seatsFaction}` `{leader}` `{second}` `{third}` `{leaderShare}` `{secondShare}` `{thirdShare}` `{state}` `{yourSwing}` `{yourRank}` `{contributors}` `{issue1}` `{issue2}` `{issue1Short}` `{issueShort}` `{issue1Blurb}` `{issue2Blurb}` `{district2}` `{faction}` `{m1}` `{m2}` `{m3}` `{stance}` `{effectLine}` `{swing}` `{bracket}` `{origin}` | server (`CAPITAL_PLACEHOLDERS` in rules) |
| Capital orders | `{issue}` | server, at read (the residence city's first Issue; constant for the day) |
| Times | `{until}` `{at}` `{weekday}` | as slice 3 §4.3 (the client renders local times) |

### 4.4 Data to transcribe

| File | Contents | Source |
|---|---|---|
| `data/cities/irongate.ts` | the city, five quarters with `district`, 29 locations (pins = survey), 62 actions with Success/Partial texts (training: one text and a `verb`), `clouds: true`, `council { offset 0, seats 10, hall }`, the Herald | design §4.1–§4.6 |
| `data/jobs.ts` | Porter (Central Station, STR 5, 180), Street vendor (Market Square, 100), Driver (Riverside Quays, Level 3 AGI 10, 200); no faction bonus | design §4.5 |
| `data/nation.ts` | the nation section | design §2.1–§2.3, mapPins |
| `data/journeyEvents.ts` | seven cards | design §3 |
| `data/issues.ts` | nineteen Issues with blurbs, stances, feeds, effects and effect lines | design §9.5 |
| `data/orders.ts` | twelve capital templates; `residence: 'any'` on slot C | design §10 |
| `data/candidates.ts` | thirty Irongate NPCs | design §8.3 |
| `data/ordinances.ts` | `ord.tram-subsidy` (`ticketPct −50`) | design §8.5 |
| `data/headlines.ts`, `politicalHeadlines.ts` | the Herald's set; the home papers' additions | design §9.6, §12 |
| `data/factions.ts` | nothing new (the capital HQs are locations with `factionId`) | — |
| `data/art.ts` | `map.irongate.*` and `map.nation.*` stills (§13) | — |
| `data/copy.ts` | screens §11 strings, the help notes, the Issue effect lines | screens §11 |

Content tests parse both slice-4 design documents and compare every table word for word (locations, actions, texts, frames, anchors, baselines, slates, Issues, cards, orders, headlines, copy), as slices 1–3 do. They also pin §3.1's dates.

---

## 5. Data model (`packages/db`)

The plan's rule: embed what is read together, reference what grows. Six new collections, each for a reason:

| Collection | Why its own | Growth |
|---|---|---|
| `journeys` | one per trip; the card, the choice and the arrival are its state; the report reads them | per trip |
| `districts` | five opinion meters written by every capital action; one document each spreads the writes (ADR 0027) | fixed (5) |
| `influenceLedger` | append-only, every opinion change | per action |
| `contributions` | per character per election per place (influence) and per Issue (points): the fast totals the plate line, the scoreboard, heroes and the top five read | per contributor per cycle |
| `issues` | one per city per week per Issue: momentum and the result | 8 a week |
| `awards` | hero and Issue PC due to a character, credited by the settlement; also the hero record (titles, *Heroes ×n*) | per award |

### 5.1 `journeys` — new (ADR 0025)

```ts
{
  _id: ObjectId,
  characterId: ObjectId, n: number,                    // the character's nth journey (1-based): natural key
  from: string, to: string,                            // city ids
  boardedAt: Date, arrivesAt: Date, minutes: number,
  fare: { base: number, lines: Array<{ id, label, pct }>, total: number },
  seed: string,                                        // 32 hex: the card draw and the card's roll
  card: { eventId: string } | null,
  choice: { choiceId: string, outcome: 'success' | 'partial' | 'chosen', at: Date,
            result: JourneyCardResult } | null,        // stored verbatim (the arrival modal's line)
  status: 'onTheWay' | 'arrived' | 'closed',
  arrivedAt: Date | null,                              // when the arrival was settled (lazily or by the job)
  closedAt: Date | null, sleptThrough: boolean,        // the arrival modal closed; a card left unanswered
  firstToCapital: boolean,                             // for hl.ig.first-arrival and the modal's headline
  createdAt, updatedAt
}
```

Indexes: `{ characterId: 1, n: 1 }` unique; `{ characterId: 1, boardedAt: -1 }`; `{ status: 1, arrivesAt: 1 }`; `{ to: 1, boardedAt: -1 }` (the *You and 2 others* count).

### 5.2 `districts` — new (ADR 0027)

```ts
{
  _id: string,                                         // 'irongate.eastside'
  cityId: string,
  opinion: OpinionShares,                              // written by actions (ADR 0010), cards, Issues, the drift
  state: { day: DayKey, battleground: boolean, controlledBy: FactionId | null,
           previous: { battleground: boolean, controlledBy: FactionId | null } },   // set at each boundary
  groundswell: { factionId: FactionId, fromDay: DayKey, untilDay: DayKey } | null,
  stateLog: Array<{ day, opinion, battleground, controlledBy }>,   // $push $slice −60 (the report)
  createdAt, updatedAt
}
```

Index: `{ cityId: 1 }`. Created by the Irongate bootstrap (§7.3).

### 5.3 `influenceLedger` — new (ADR 0028)

```ts
{
  _id, cityId, placeId,                                // the district, or the home city
  factionId, swing: number,                            // integer thousandths of a point, as applied after floors; signed (drift)
  kind: 'action' | 'journey' | 'issue' | 'drift' | 'ballot' | 'seat' | 'noVoter',
  source: { kind: 'character', characterId: ObjectId } | { kind: 'system' },
  ref: string,                                         // the actionLogs id, journey id, issue doc id, or the boundary 'd:20735'
  day: DayKey, cycleKey: string, at: Date
}
```

Indexes: `{ placeId: 1, cycleKey: 1 }`; `{ 'source.characterId': 1, day: -1 }` (partial on `source.kind: 'character'`). Only `action` and `journey` rows count towards contributions (§22.1 Q8).

### 5.4 `contributions` — new (ADR 0028)

```ts
{
  _id: string,                                         // `${scope}|${characterId}`: the upsert's natural key
  scope: string,                                       // 'influence|irongate.eastside:4146' · 'points|irongate:20731:issue.tram-fares'
  kind: 'influence' | 'points',
  cityId, placeId, ref: string,                        // the cycle key, or the issue doc id
  characterId: ObjectId, name: string, factionId: FactionId,
  level: number,                                       // at the last contribution (the bracket, §22.1 Q5)
  amount: number,                                      // influence: thousandths; points: integer momentum
  lastAt: Date                                         // the tie-break: earlier to reach the total
}
```

Indexes: `{ scope: 1, amount: -1, lastAt: 1 }`; `{ characterId: 1, kind: 1, ref: 1 }`. Written with `updateOne({ _id }, { $inc: { amount }, $set: { level, lastAt, name }, $setOnInsert: {…} }, { upsert: true })`.

### 5.5 `issues` — new (ADR 0029)

```ts
{
  _id: string,                                         // 'irongate:20731:issue.tram-fares'
  cityId, districtId: string | null, issueId, weekDay: DayKey, order: 1 | 2, seed: string,
  status: 'live' | 'owned' | 'lapsed',
  momentum: { vanguard: number, collective: number, alliance: number },   // public
  result: { ownerId: FactionId | null, by: 'points' | 'share' | null,
            opinion: { applied: number, before: number, after: number } | null,
            top: Array<{ characterId, name, points }>,  // the owner's top five
            effect: { fromDay, toDay } | null } | null,
  resolvedAt: Date | null, createdAt, updatedAt
}
```

Index: `{ cityId: 1, weekDay: -1 }`. Actions `$inc` momentum with the guard `status: 'live'` (ADR 0018's rule: the act writes the document its closing boundary writes).

### 5.6 `awards` — new (ADR 0028)

```ts
{
  _id, characterId, kind: 'hero' | 'issue',
  cityId, placeId, ref: string,                        // the cycle key, or the issue doc id
  pc: number,                                          // 25 or 4
  title: { label: string, fromDay: DayKey, untilDay: DayKey } | null,   // "District Hero, Eastside" until the next count
  amount: number | null,                               // the swing (heroes) or points (Issues), for In Print
  bracket: 1 | 2 | 3 | null, day: DayKey, creditedAt: Date | null, createdAt
}
```

Indexes: `{ kind: 1, ref: 1, characterId: 1 }` unique (a re-run cannot pay twice); `{ characterId: 1, creditedAt: 1 }` partial on `creditedAt: null`; `{ characterId: 1, kind: 1 }`.

### 5.7 `characters` — new embedded fields

```ts
{
  ...slice 3,
  cityId,                                              // unchanged meaning: where you stand; the city left while on a train
  residence: { cityId: string, districtId: string | null,
               sinceDay: DayKey, votesFromDay: DayKey, standsFromDay: DayKey, canMoveFromDay: DayKey },
  journey: { id: ObjectId, from, to, boardedAt: Date, arrivesAt: Date,
             status: 'onTheWay' | 'arrived' } | null,  // until the arrival modal is closed
  journeysMade: number,
  journeyDeck: { seen: string[] },                     // card ids drawn this round (reset after seven)
  room: { cityId: 'irongate', fromDay: DayKey, untilDay: DayKey } | null,
  firstCapitalArrivalAt: Date | null,
  lastQuoted: { day: DayKey, issueId: string } | null,  // hl.*.quoted in the next edition
  endorsementsGiven[].cityCycle: string,               // 'irongate:4146' (one per member per cycle in the city)
}
```

Index: `{ 'residence.cityId': 1, 'residence.districtId': 1, factionId: 1, rank: 1, lastActionAt: -1 }` replaces `{ homeCityId: 1, rank: 1, lastActionAt: -1 }` (eligibility, turnout, small branch now count residents).

### 5.8 Changed collections

- **`cities`:** `opinion` is optional at the type level (absent on a districted city; `HomeCityDoc` narrows it); new `issues: { weekDay, live: Array<{ docId, issueId, districtId, order }>, effects: Array<{ issueId, docId, ownerId, fromDay, toDay }> }` (`$slice −8`); `council.seats`.
- **`elections`:** `kind: 'home' | 'district'` (absent = home); `placeId` (the district or the city); `factionId` absent for a district; `npcSlate[].factionId`; `ballot[].factionId`; a district's `result` adds `{ factions: Array<{ factionId, ballots, ballotShare, opinionShare, score, seats }>, w, ballots, tie: 'draw' | null, scoreboard: Array<{ bracket, rows }> }`. The `{ cityId: 1, cycle: -1 }` index **stops being unique** (five district elections share Irongate's city and cycle); uniqueness is the `_id`, which is the election key of the place and cycle. (A unique index on the new `placeId` would fail on the old documents, since `ensureIndexes` syncs indexes before the migrations run.)
- **`candidacies`:** `factionId`, `placeId`.
- **`officeTerms`:** `factionId`, `districtId | null`, `vacatedDay: DayKey | null`. The unique index becomes `{ councilKey: 1, seat: 1, fromDay: 1 }` so a vacated seat can be re-filled from the move's day.
- **`ordinances`** (order papers): a branch item's `movedBy.factionId`; Irongate papers hold up to six items.
- **`paperEntries`:** `desk.awards: Array<{ kind, label, pc }> | null`; `cityId` is the edition's paper (§11).
- **`requestLogs`:** `REQUEST_KINDS` += `travel.board`, `travel.choose`, `residence.register`, `residence.room`.
- **`actionLogs`:** unchanged; the stored result gains optional fields (§10.1).

### 5.9 Migration `006-slice4-travel-residence.ts`

Run by `ensureIndexes()` after 005, idempotent (each update filters on the field's absence):

1. Characters: `residence = { cityId: homeCityId, districtId: null, sinceDay: 0, votesFromDay: 0, standsFromDay: 0, canMoveFromDay: 0 }`, `journey: null`, `journeysMade: 0`, `journeyDeck: { seen: [] }`, `room: null`, `firstCapitalArrivalAt: null`, `lastQuoted: null`; `endorsementsGiven[].cityCycle = electionId` (an aggregation-pipeline update).
2. Elections: `kind: 'home'`, `placeId: cityId`; ballot lines' `factionId` = the election's.
3. Candidacies: `factionId` and `placeId` from their election.
4. Office terms: `factionId` = the city's home faction, `districtId: null`, `vacatedDay: null`.
5. Order papers: branch items' `movedBy.factionId` = the city's home faction.
6. `ensureIndexes` creates the six collections and syncs the changed indexes before the migrations, as today. That is safe because no new index is unique on a field the migration adds: `officeTerms`' new unique key adds `fromDay`, which every term already has, and the elections index only loses its uniqueness.

Cities are not migrated: Irongate bootstraps lazily, and the home cities draw their first Issues lazily (§7.4).

---

## 6. Rules (`packages/rules`) — pure, no I/O

### 6.1 Constants

```ts
export const TRAVEL = { level: 10, fare: 20, fareFloor: 5, cardOneIn: 3 } as const;          // §14.10, §18.3
export const RESIDENCE = { rank: 2, cost: 500, cooldownDays: 7 } as const;                  // §14.11
export const ROOM = { cost: 100, days: 7, restedBonus: 50, cityId: 'irongate' } as const;   // §14.11
export const DISTRICT = { driftShare: 0.01, battlegroundWithin: 10, controlAbove: 50,
                          groundswellPerDay: 5, groundswellMax: 30, groundswellDays: 14 } as const;   // §14.2, §14.4
export const BATTLEGROUND = { swingPct: 25, fxpShare: 0.25, chancePct: 5,
                              types: ['canvass', 'speech', 'propaganda', 'council'] } as const;
export const ISSUES = { perCity: 2, swingPct: 50, ownerSwing: 3, topFive: 5, topPc: 4, effectDays: 7 } as const;  // §14.6
export const CAPITAL_COUNCIL = { seats: 10, perDistrict: 2, passVotes: 6, maxProposals: 3,
                                 fullTurnout: 10, ballotWeightMax: 50, npcPerFaction: 2 } as const;   // §15.3
export const HERO = { minSwing: 0.5, pc: 25, brackets: [[1, 15], [16, 30], [31, Infinity]] } as const;  // §14.5
export const WEEK = { mondayEpoch: 20_458 } as const;                                       // 2026-01-05
ORDINANCE_BOUNDS += { ticketPct: [-50, 0], roomPct: [-50, 0] };
```

### 6.2 `week.ts`

```ts
export const isMonday = (d: DayKey) => mod(d - WEEK.mondayEpoch, 7) === 0;
export const weekOf = (d: DayKey): DayKey => d - mod(d - WEEK.mondayEpoch, 7);
export const nextMonday = (d: DayKey): DayKey => weekOf(d) + 7;
```

### 6.3 `travel.ts`

```ts
export type DestinationState = 'here' | 'open' | 'rival' | 'later' | 'level';
export function legMinutes(fromId: string, toId: string, minutes: Record<string, number>, capitalId: string): number;
//  the capital ↔ X: minutes[X]; X ↔ Y (outer ↔ outer): minutes[X] + minutes[Y]
export function destinationState(i: { to: string; here: string; level: number; service: 'open' | 'later';
  factionHomeOf: (cityId: string) => FactionId | null; playerFaction: FactionId; capitalId: string }): DestinationState;
//  level < 10 → 'level'; to === here → 'here'; 'later' → 'later'; a rival home → 'rival'; the capital or your home → 'open'
export function fare(m: CityModifiers): { base: number; lines: Array<{ id; label; pct }>; total: number };
//  total = max(5, roundHalfUp(20 × Π(1 + pct/100))) over the origin city's ticketPct sources (ADR 0030): 20 → 10 → 5
export function drawJourneyCard(i: { first: boolean; seen: readonly string[]; deck: readonly string[];
  firstId: string; rng: Rng }): { eventId: string | null; seen: string[] };
//  first journey: firstId, seen [firstId]; else rng.int(1, 3) === 1 → uniform from deck − seen (reset to [] when empty)
export function journeyProgress(boardedAt: number, arrivesAt: number, now: number): number;   // 0…1, clamped
export function resolveJourneyChoice(i: { choice: JourneyChoiceSpec; values: Stats; standingBonus: CheckBonus | null;
  rng: Rng }): { outcome: 'success' | 'partial' | 'chosen'; check: CheckBreakdown | null; roll: number | null;
                 rewards: JourneyRewardsSpec; cost: number };
//  §8.4 at difficulty 10 (tier-1 bands: never a failure); unchecked → 'chosen' with the success rewards
```

### 6.4 `district.ts`

```ts
export function applyBaselineDrift(shares: OpinionShares, baseline: OpinionShares): { shares: OpinionShares;
  moves: Partial<Record<FactionId, number>> };
//  each faction moves roundOpinion(0.01 × (baseline_f − share_f)); the balance to or from Neutral, whose floor (5)
//  applies; a shortfall Neutral cannot give is left; integer thousandths, the sum stays 100.000
export function isBattleground(s: OpinionShares): boolean;          // top two faction shares within 10 (inclusive)
export function controller(s: OpinionShares): FactionId | null;     // the faction above 50, if any
export function districtState(prev: { controlledBy: FactionId | null; groundswell: Groundswell | null },
  shares: OpinionShares, day: DayKey): { battleground; controlledBy; groundswell: Groundswell | null;
  started: FactionId | null; ended: boolean };
//  lost control (above 50 → 50 or below) → { factionId, fromDay: day, untilDay: day + 14 }; retaken or day ≥ untilDay → null
export const groundswellPct = (g: Groundswell, day: DayKey) => 5 * Math.min(6, day - g.fromDay + 1);   // 5…30
export function averageShares(list: OpinionShares[]): OpinionShares;  // the city share, on read
```

### 6.5 `capitalCount.ts`

```ts
export const turnoutWeight = (ballots: number) => 50 * Math.min(1, ballots / 10);
export function districtScores(i: { ballotsByFaction: Record<FactionId, number>; opinion: OpinionShares }):
  Array<{ factionId; ballots; ballotShare; opinionShare; score }>;  // score = w × ballotShare + (100 − w) × opinionShare
export function dhondt(rows: ReturnType<typeof districtScores>, seats: 2, drawOrder: FactionId[],
  eligible: (f: FactionId) => boolean): FactionId[];
//  ties: more ballots, then higher opinion share, then drawOrder (seeded per cycle); a faction with no candidate
//  is skipped (it forfeits to the next)
export function npcFill(playersStanding: number): number;           // max(0, 2 − p)
export function countDistrict(i: { lines: Array<CountLine & { factionId }>; votes: Record<string, number>;
  opinion: OpinionShares; rng: Rng }): DistrictCount;
//  { factions[], w, ballots, seatsByFaction, seated: CountRow[] (faction seat order), rows: CountRow[], tie }
//  within a faction: the slice-3 total and tie order (countElection's sort), NPCs after players
export function divideCapital(i: { items: Array<{ ordinanceId; branchOf: FactionId | null; movedAt }>;
  playerVotes: Array<{ choice; factionId }>; npcSeats: Record<FactionId, number> }):
  { tallies; npcChoices: Record<FactionId, string>; passed: string | null };
//  each faction's NPCs: the item with most votes from that faction's player councillors (ties: their branch's motion,
//  then the earliest moved); none → their branch's motion; never Against all; passes with ≥ 6 of 10
export function councilOrder(seats: Record<FactionId, number>, ballots, opinion, drawOrder): FactionId[];
//  the branch motions' order on the paper (seats, then the district count's tie rule city-wide)
```

### 6.6 `issues.ts`

```ts
export function drawIssues(i: { eligible: Array<{ id; districtId: string | null }>; lastWeek: readonly string[];
  distinctDistricts: boolean; rng: Rng }): Array<{ id; districtId; order: 1 | 2 }>;
//  two, never last week's, two different districts in a districted city; all weights 1
export function issueTags(live: ReadonlyArray<{ docId; issueId; feeds: IssueMatch[] }>, a: ActionDescriptor):
  Array<{ docId; issueId }>;                                         // OR of each Issue's feeds
export const pointsFor = (energy: number, outcome: Outcome) =>
  outcome === 'success' ? energy : roundHalfUp(energy / 2);        // §22.1 Q9, Q10
export function resolveIssue(i: { momentum: Record<FactionId, number>; shares: OpinionShares }):
  { ownerId: FactionId | null; by: 'points' | 'share' | null; lapsed: boolean };
//  most points; tie → the higher share; still tied → nobody; all zero → lapsed
```

### 6.7 `ledger.ts`, `residence.ts`

```ts
export const levelBracket = (level: number): 1 | 2 | 3 => (level <= 15 ? 1 : level <= 30 ? 2 : 3);
export function scoreboardLine(mine: { amount; lastAt } | null, all: Array<{ amount; lastAt }>):
  { swing: number; rank: number; of: number } | null;              // rank among all contributors, any faction
export function heroes(rows: Array<{ characterId; amount; lastAt; level }>):
  Array<{ bracket; characterId; amount }>;                         // per bracket: the top, if amount ≥ 0.5 (500 thousandths)
export function topByBracket(rows, n = 3): Array<{ bracket; rows }>;   // the scoreboard table

export function moveWindows(today: DayKey, offset: number): { votesFromDay; standsFromDay; canMoveFromDay };
//  votesFromDay = nextPollsFrom(today + 1, offset) (polls opening after the registration);
//  standsFromDay = nextNominationsAfter(today, offset); canMoveFromDay = today + 7
export function registerRefusal(i: { rank; iron; cost; today; canMoveFromDay; here: string; target: { cityId; districtId };
  residence; homeCityId; inTransit: boolean }): GameErrorReason | null;
//  IN_TRANSIT · NOT_IN_CITY (not standing in the target city) · RANK_TOO_LOW · MOVE_COOLDOWN · ALREADY_RESIDENT ·
//  NOT_ENOUGH_IRON; a target city must be the capital or the player's own home
export function roomPrice(m: CityModifiers): { base: 100; lines; total };   // roomPct sources; Evictions → 50
```

### 6.8 Changed functions

| Function | Change |
|---|---|
| `CityModifiers` → `PlaceModifiers` | `{ sources: ModifierSource[]; firedUp; place: { battleground: boolean; groundswell: { factionId; pct } \| null; issues: Array<{ docId; issueId; name }> } }`; `ModifierSource = { id; name; kind: 'ordinance' \| 'issue'; effects }` (ADR 0030). `NO_MODIFIERS` keeps the slice-3 behaviour |
| `effect(m, kind)` → `effects(m, kind, actionType?)` | Every source's effect of the kind, with its name; the slice-3 helpers combine them by the rules of ADR 0030 §2 |
| `actionEnergy`, `trainingEnergy`, `jobPayWith`, `restedCapFor`, `standingPerSuccess`, `seniorityStep`, `rewardShares`, `ordinanceCheckBonuses`, `ordinanceTags` | Over all sources; every source its own line or tag. `restedCapFor(m, room)` adds the room |
| `swingMultiplier` → `swingFactors(type, actorFaction, m)` | `Array<{ id; label; pct }>`: *Close race* (political types, a battleground), *Issue: {name}* (tagged), *Comeback* (the actor's Groundswell, political types), each `swingPct` source; `computeRewards` multiplies `Π(1 + pct/100)` and rounds once per row |
| `computeRewards` | `swingFactors` in place of `swingMultiplier`; `rewards.opinionFactors` set when any applied |
| `resolveTier1Action` | Battleground FXP share (*Close race*, 0.25 of base FXP, political types) and chance bonus (+5, political types); the descriptor carries `districtId`, `locationKind`, `issueIds`; each attempt's `points` (`pointsFor`, tagged only) |
| `orderMatches(m, a, ctx)` | `ctx = { cityId, districtId }` (the residence) replaces `homeCityId`; `districtId: 'home'`, `issueTagged`, `locationKinds` |
| `ordersForDay(templates, day, residence: 'home' \| 'capital')` | Picks slots A and B from the templates of that residence, slot C from `'any'`; `startOrders` passes it through; crisis only for `'home'` |
| `councilDay`, `boundaryWork` | unchanged; `electionKey` takes a place id |
| `stipendBoundaries` | a vacated term ends at `vacatedDay` |
| `selectHeadlines`, `selectPoliticalHeadlines` | the new conditions (§11.3) |
| `projectEnergyThrough(state, until, capOn)` | `capOn` now includes the room and the residence city's Issue effects |

### 6.9 Types (views, results, errors)

All in `types.ts` (§8.3, §10). `GameErrorReason` gains: `LEVEL_TOO_LOW`, `IN_TRANSIT`, `ALREADY_THERE`, `DESTINATION_LOCKED`, `UNKNOWN_DESTINATION`, `NOT_ENOUGH_IRON`, `NO_JOURNEY`, `NO_CARD`, `CARD_CLOSED`, `ALREADY_CHOSEN`, `UNKNOWN_CHOICE`, `NOT_IN_CITY`, `MOVE_COOLDOWN`, `ALREADY_RESIDENT`, `UNKNOWN_DISTRICT`, `MEMBERS_ONLY`, `NOT_RESIDENT`, `NOT_YET_VOTER`, `NOT_YET_CANDIDATE`, `WRONG_FACTION`.

### 6.10 Tests (Vitest, `packages/rules/test`)

- **week:** `isMonday` against `weekday` over 800 days; §3.1's dates.
- **travel:** legs (12 / 12 / 15 / 25, outer ↔ outer the sum); every destination state for each faction at Levels 9 and 10; fares 20 → 10 (one halving) → 5 (two) and never below 5 with a third; the card: the first journey always the passenger, then one in three over 30,000 seeds (±1 %), all seven seen before a repeat, deterministic per seed; progress clamps; a checked choice never fails over 10,000 rolls; an unchecked choice has no roll.
- **district:** drift moves a share 1 % of its distance to the baseline (Collective 45 → 44.9 in Eastside, baseline 35; Vanguard 15 → 15.2 on Garrison Hill, baseline 35), the balance through Neutral; the sum stays 100.000 over 5,000 random shares; Neutral at 5 blocks an upward drift; battleground edges (10.000 within, 10.001 not); control edges (50.000 is not control); Groundswell starts the boundary after control is lost, reaches +30 on day 6, ends on retaking or at 14; averages.
- **capital count — the design's worked examples:** Eastside 15 / 35 / 15 with no ballots → the Collective both seats (26.9 beats 23.1); two Vanguard ballots → w 10, V 30.8, C 48.5, A 20.8 → Collective, Vanguard; Government Quarter 20 / 20 / 20 with one Alliance ballot → w 5, seat 1 Alliance, seat 2 on the draw; w at 0…12 ballots; every tie-break in order; a faction with no candidate forfeits; NPC fill keeps at least six names; within a faction the slice-3 order.
- **divideCapital:** ten NPCs 4 / 3 / 3 pass nothing; one player of a three-seat bloc voting another bloc's four-seat motion passes it 7–3; a tie inside a bloc goes to the branch; *Against all* by every player → each bloc's NPCs vote their branch.
- **issues:** never last week's two; two districts in Irongate over 10,000 seeds; feeds (types, ids, kinds, district) and the OR; points 10 / 5 / 2 (3-Energy partial); resolution ties (points, then share, then nobody) and lapse.
- **modifiers v2:** every slice-3 ordinance number unchanged with one source; ADR 0030's combination table with two sources; a canvass in a battleground district tagged with an Issue: opinion 0.05 × 1.25 × 1.5 = 0.094 (rounded once, three decimals), FXP 6 + *Close race* 2 (0.25 × 6 = 1.5 → 2); a Groundswell day-3 propaganda under Street Permits: 0.04 × 1.15 × 1.15 = 0.053; intelligence and training get no Close race lines.
- **ledger:** the scoreboard rank and *of n* with ties by `lastAt`; heroes per bracket only at ≥ 0.5; bracket edges 15/16, 30/31.
- **residence:** windows on each cycle day (registered day 0 or 1 votes this cycle; day 2–4 the next); every refusal; the room price under Evictions.
- **orders:** a capital resident's rotation (A[day mod 2], B[day mod 2], never the same pair two days running); `districtId: 'home'`; `issueTagged`; home residents unchanged; the crisis pair only at home.

---

## 7. The city day v2 (`apps/server/src/services/cityDay.ts`, ADR 0017, 0027, 0029)

### 7.1 Shape

`settleCityDay(content, cityId, now)` is unchanged in its loop. `processBoundary` dispatches on the city: `processHomeBoundary` (slice 3's, plus §7.4) or `processCapitalBoundary` (§7.2). Both call the shared `issuesStep` (§7.4) and `heroesStep` (§7.5). Every step's writes are guarded on the state they expect (`status: 'polling'`, `status: 'live'`, `world.settledDay: d − 1`), so an interleaved act or a second runner turns into a write conflict and a retry, never a silent overwrite.

### 7.2 `processCapitalBoundary(content, 'irongate', d, now, session)`

```
city = City.findById('irongate') (world.settledDay === d − 1, else AlreadySettled)
ds   = District.find({ cityId: 'irongate' })                      // five
for each district: shares = applyBaselineDrift(ds.opinion, baseline); ledger rows 'drift' (one per faction moved)
if isMonday(d): issuesStep(d, city, shares-by-place)              // may change one district's shares (+3)
for each district: st = districtState(prev, shares, d)            // battleground, control, Groundswell
if boundaryWork.count:
  for each district: e = Election(electionKey(district, k − 1)) (status 'polling')
    votes = tally(e); lines = countLines(e, 'irongate')           // ward vote from Irongate Standing now
    r = countDistrict({ lines, votes, opinion: shares, rng: createRng(e.seed + ':draw') })
    eligible = residents of the district at Rank 2+, active 7 days, ∪ voters
    Election.updateOne({ _id, status: 'polling' }, { status: 'counted', result }) → 0 ⇒ AlreadySettled
    Candidacy.bulkWrite (elected / defeated, place)
  OfficeTerm.updateMany({ councilKey: irongate:k−1, vacatedDay: null }, { completed: true })
  OfficeTerm.insertMany(10 terms: seat = 2 × (district.n − 1) + 1 | 2, factionId, districtId)
  heroesStep(d, k − 1, places = the five districts)
  Election.create(5 × { _id: electionKey(district, k), kind: 'district', status: 'nominations', seed, npcSlate:
                        2 per faction with jitter })
  OrderPaper.create({ _id: councilKey(irongate, k), items: councilOrder(...) branch motions of the seated blocs })
  set.council = { key, fromDay: d, toDay: d + 5, npcSeats, seats: 10 }
if boundaryWork.close:
  for each district: cands = filed; small = closeNominations per faction (Irongate endorsers of that faction);
    ballot = players by filing + npcFill per faction (profile order) ; Election.updateOne({ status: 'nominations' }, polling)
if boundaryWork.divide:
  p = OrderPaper(councilKey(irongate, k)) (status 'open'); npcSeats by faction from the terms
  v = divideCapital(...); OrderPaper.updateOne({ status: 'open' }, divided) → 0 ⇒ AlreadySettled
  set.ordinance / push.ordinanceHistory as slice 3
District.bulkWrite(5 × { opinion, state, groundswell, $push stateLog })
City.updateOne({ _id, 'world.settledDay': d − 1 }, { $set: { ...set, 'world.settledDay': d }, $push }) → 0 ⇒ AlreadySettled
```

Ballots and seats never move a district's opinion (design §8.6).

### 7.3 `bootstrapCapital(content, now, session)` — conditional on `world` absent

1. Five `districts` at their baselines, with `state` from `districtState` (Government Quarter and Station & Market are close races; nobody controls anything).
2. The sitting council k: `countDistrict` per district with no ballots, on the baselines, over each faction's two NPCs (no jitter), seeded per district → ten NPC terms.
3. Order paper k with the branch motions of the seated blocs. If `cycleDay ≥ 2`, divided with `divideCapital` over NPCs only (each bloc its own branch, so nothing reaches six) → **no ordinance in force** (this is the rule, not a gap).
4. Five elections k in the phase of the day; on a polling day each ballot is frozen with two NPCs per faction.
5. This week's two Issues (`drawIssues`, no resolution) and `issues` on the city.
6. `world = { settledDay: today, bootstrappedDay: today }`.

### 7.4 The Issues step (every open city)

```
issuesStep(d, city, sharesByPlace):
  // resolve
  for each live doc of week d − 7 (status 'live'):
    r = resolveIssue({ momentum, shares: sharesByPlace[doc.districtId ?? cityId] })
    if r.ownerId:
      op = applyPersuasion(shares, { factionId: owner, swing: 3, homeFactionId: city.homeFactionId })
      ledger row 'issue' (system, ref doc id); top = contributions(scope 'points|docId', factionId owner) top 5
      awards: 4 PC each (unique { kind 'issue', ref docId, characterId })
      effects += { issueId, docId, ownerId, fromDay: d, toDay: d + 7 }
    Issue.updateOne({ _id, status: 'live' }, { status: owned | lapsed, result, resolvedAt }) → 0 ⇒ AlreadySettled
  // draw
  picks = drawIssues({ eligible: content.issuesFor(cityId), lastWeek, distinctDistricts, rng: seed(cityId, d) })
  Issue.insertMany(2 docs, status 'live', momentum 0); city.issues = { weekDay: d, live, effects (pruned to toDay > d) }
```

**Existing cities** (bootstrapped in slice 3, no `issues`): `settleCityDay` runs `bootstrapIssues(cityId, today)` in its own transaction, conditional on `issues` absent, before processing any boundary (a draw for the current week, no resolution). On a new deploy the worker's start-up run does it; otherwise the first request.

The draw's seed is `sha256("${cityId}:${weekDay}")` (first 32 hex, computed on the server; `cityDayHooks.seed` overrides it in tests) and is stored on each doc.

### 7.5 The heroes step (cycle day 0)

For each place counted (five districts; or the home city): `rows = Contribution.find({ scope: 'influence|' + electionKey(place, k − 1) })`, `heroes(rows)` → `awards` (25 PC, `title { label: 'District Hero, Eastside' | 'City Hero, Coalport', fromDay: d, untilDay: d + 5 }`, unique by `{ kind, ref, characterId }`); `topByBracket(rows, 3)` → `result.scoreboard` on the counted election (the result page's table). The step reads `characters` only through `contributions` (name and level are on the row).

### 7.6 `ensurePlaces(content, c, now)` and the ordering

ADR 0017's invariant generalises: **no character acts on day d before every city their request depends on is settled for d.** `ensurePlaces` runs `ensureCityDay` (each a single read once settled) for the distinct set of: the city the character is in (or travelling to), the residence city, and the job's city. `loadCharacter` calls it before `ensureSettled`, then `ensureArrived` (§8.2) after it, and passes the documents on (`LoadedCharacter.places`). The degrade path is unchanged.

---

## 8. API (`apps/server`)

### 8.1 Procedures

All are protected. No input names the caller's character; a city or district in an input is a destination or a choice, checked against the character's state in the transaction.

```ts
travel.nation  ()                                                         → NationView
travel.board   ({ to: z.string().regex(/^[a-z]+$/), idempotencyKey: z.uuid() })   → BoardResult
    // PRECONDITION_FAILED LEVEL_TOO_LOW { need: 10 } / IN_TRANSIT { arrivesAt } / ALREADY_THERE
    //   / DESTINATION_LOCKED { lock: 'rival' | 'later' } / NOT_ENOUGH_IRON { iron, cost }
    // · BAD_REQUEST UNKNOWN_DESTINATION · CONFLICT KEY_REUSED / ACTION_CONFLICT
travel.journey ()                                                         → JourneyView | null
travel.choose  ({ journeyId: z.string().regex(/^[0-9a-f]{24}$/), choiceId: z.string().min(1),
                  idempotencyKey: z.uuid() })                             → JourneyCardResult
    // NOT_FOUND NO_JOURNEY · PRECONDITION_FAILED NO_CARD / CARD_CLOSED / NOT_ENOUGH_IRON { iron, cost }
    // · BAD_REQUEST UNKNOWN_CHOICE · CONFLICT ALREADY_CHOSEN { choiceId }
travel.close   ({ journeyId: z.string().regex(/^[0-9a-f]{24}$/) })        → { landing: Landing; character: CharacterView }
    // the arrival modal's Continue: idempotent conditional $set; PRECONDITION_FAILED IN_TRANSIT before arrivesAt

residence.register ({ cityId: z.string().min(1), districtId: z.string().min(1).nullable(),
                      idempotencyKey: z.uuid() })                         → PoliticalResult (act 'register')
    // PRECONDITION_FAILED IN_TRANSIT / NOT_IN_CITY / RANK_TOO_LOW { need: 2 } / MOVE_COOLDOWN { canMoveFromAt }
    //   / NOT_ENOUGH_IRON { iron, cost: 500 } · BAD_REQUEST UNKNOWN_DISTRICT / DESTINATION_LOCKED
    //   · CONFLICT ALREADY_RESIDENT
residence.room     ({ idempotencyKey: z.uuid() })                         → PoliticalResult (act 'room')
    // PRECONDITION_FAILED IN_TRANSIT / NOT_IN_CITY / NOT_ENOUGH_IRON { iron, cost }

city.get        ({ cityId })   → CityView v4   // IN_TRANSIT while on a train; WRONG_CITY elsewhere (as slice 2)
action.perform  (unchanged input) // + IN_TRANSIT, MEMBERS_ONLY { factionId }
council.election / count / chamber / declare / withdraw / endorse / vote / propose / councilVote
    // residence-aware (§8.4); council.count's electionId regex widens to /^[a-z]+(\.[a-z-]+)?:\d+$/
    // and the count of a capital cycle is addressed by its council key: { cycleKey?: 'irongate:4146' }
paper.today     → PaperView v4 (§11)
character.me    → CharacterView v5 (§8.3)
```

### 8.2 Services

**`travelService.board`** (ADR 0008 request key `travel.board`; natural guard: one open journey):

1. `loadCharacter` (settles the day and a due arrival). Refuse below Level 10, in transit, to the city you are in, to a locked destination (`destinationState`), with too little Iron for `fare(origin modifiers)`.
2. In one transaction: `Character.findOneAndUpdate({ _id, version, 'day.settled': today, iron: { $gte: fare }, $or: [{ journey: null }, { 'journey.status': 'arrived' }] }, { $inc: { iron: −fare, version: 1, journeysMade: 1 }, $set: { journey: {…, status: 'onTheWay'}, journeyDeck } })`; a previous arrived-but-unclosed journey is closed (`sleptThrough` if its card was unanswered) in the same transaction; `Journey.create({ n: journeysMade + 1, seed, card: drawJourneyCard(...), … })` (the unique `{characterId, n}` makes a second board impossible).
3. After commit, `scheduler.arriveAt(journeyId, arrivesAt)` (best effort, §9.2).
4. Return `BoardResult { journey: JourneyView; character: CharacterView }`.

**`travelService.settleArrival(journeyId, now)`** (the lazy path and the job share it): if `arrivesAt ≤ now` and `status: 'onTheWay'`, in one transaction `Journey.updateOne({ _id, status: 'onTheWay' }, { status: 'arrived', arrivedAt })` and `Character.updateOne({ _id, 'journey.id': id, 'journey.status': 'onTheWay' }, { $set: { cityId: to, 'journey.status': 'arrived', firstCapitalArrivalAt (first time) }, $inc: { version: 1 } })`. Both conditional, so it runs once. `ensureArrived(c)` calls it when `c.journey?.status === 'onTheWay' && arrivesAt ≤ now`.

**`travelService.choose`** (request key `travel.choose`; natural guard `choice: null`):

1. The journey is the caller's, has a card, `status ≠ 'closed'`, `choice: null`; the choice is on the card; a `cost.iron` choice needs the Iron.
2. `resolveJourneyChoice` with the worn stats, the Standing bonus in the **destination** city, `createRng(seed + ':card')`.
3. One transaction: `Journey.updateOne({ _id, choice: null, status: { $ne: 'closed' } }, { choice })`; the character (version guard; Iron `−cost + iron`, XP / FXP through `applyGains`, Rested banked to the cap, the tally, `lastQuoted`); the destination's opinion (Station & Market for the capital) by `applyPersuasion`, a ledger row `journey`, the influence contribution; points on the destination's first live Issue (`$inc` with `status: 'live'`) and the points contribution.
4. Return `JourneyCardResult` (§10.3), stored on the journey and in `requestLogs`.

**`travelService.close`**: `Journey.updateOne({ _id, characterId, status: 'arrived' }, { status: 'closed', closedAt, sleptThrough: choice === null && card !== null })` and `Character.updateOne({ _id, 'journey.id': id }, { journey: null, $inc: { version: 1 } })`. Returns the landing (`{ cityId, quarterId: 'irongate.station-market', locationId: 'irongate.central-station' }` for the capital; `{ cityId }` at home).

**`residenceService.register`** (request key `residence.register`):

1. Refusals from `registerRefusal` (in Irongate for a district, at home for the way back; Rank 2; cooldown; Iron; not already resident there).
2. One transaction: the character `$inc: { iron: −500, version: 1 }`, `$set: { residence: { cityId, districtId, sinceDay: today, ...moveWindows(today, target offset) }, energy re-base }` (guards: version, `iron ≥ 500`, `'residence.canMoveFromDay' ≤ today`); **then the old residence:** a candidacy `filed` in the old place's open election → `withdrawn`, deposit `kept`; a seat held in the old city's sitting council → `vacateSeat` (the term's `vacatedDay = today`; a new NPC term for the same seat `fromDay: today`, `toDay` unchanged, the holder the faction's highest-profile NPC of that place not seated; `council.npcSeats + 1`).
3. Return `PoliticalResult` with act `register` (§10.4) and the `residence` view.

**`residenceService.room`**: one conditional `findOneAndUpdate` on the character (version, `iron ≥ price`, in Irongate, not in transit): `room = { cityId: 'irongate', fromDay: today, untilDay: today + 7 }` (renewal restarts the seven days; no stacking), Energy re-based at the tap. Request key `residence.room`.

**Actions** (`actionService.resolveAndWrite`), in the order of slice 3 plus:

- refuse `IN_TRANSIT`; refuse `MEMBERS_ONLY` at a location with another `factionId`;
- read in the snapshot the city document (sources: ordinance, Issue effects, live Issues) and, for a districted city, the district document (opinion, battleground, Groundswell);
- `placeModifiers(content, cityDoc, districtDoc, c.factionId, day)` → `resolveTier1Action`;
- opinion: write-through to the district (or city) document as ADR 0010; a ledger row `action` with `ref = logId`; the influence contribution (`$inc` thousandths applied);
- for each tag: `Issue.updateOne({ _id: docId, status: 'live' }, { $inc: { 'momentum.<faction>': points } })` (a miss ⇒ `DayChanged`, the retry re-tags) and the points contribution;
- orders advance with `ctx = residence`, so capital orders count capital work.

**`jobService.take`**: the location's city, not the home city, for the modifiers; `IN_TRANSIT` and `WRONG_CITY` as actions.

### 8.3 Views

```ts
interface NationView {
  map: { day: AssetView; night: AssetView }; tiles: true; frame: Frame; clouds: boolean; isNight: boolean;
  here: { cityId: string } | { journey: { from; to } };
  trainOpen: boolean;                                         // Level ≥ 10
  cities: Array<{
    cityId; name; x; y; n: number;                            // fixed list order: the capital, your home, the other three
    line: string;                                             // "Capital · 5 districts · two close races today" (live) / content
    state: DestinationState; lockWord: 'rival ground' | 'no service yet' | null;
    minutes: number | null; fare: { base; lines; total } | null;
    whoHolds: OpinionShares;                                  // Irongate: the average; Clearwater: its baseline
    issues: Array<{ issueId; name }>;                         // this week's two (none for Clearwater)
    election: { line: 'votesIn' | 'votingOpen' | null; days?: number; until?: number } | null;
    canBoard: { ok: true } | { ok: false; reason: GameErrorReason };
    seeDistricts: boolean;                                    // in Irongate
  }>;
}
interface JourneyView {
  id; from: { cityId; name }; to: { cityId; name }; boardedAt; arrivesAt; serverNow;
  status: 'onTheWay' | 'arrived'; firstJourney: boolean;
  others: number;                                             // other journeys on this leg boarded within 10 minutes
  card: { eventId; title; setup; ignore;
          choices: Array<{ id; title; detail; stat: { stats: CheckStats } | null; chance: number | null;
                           cost: number | null; affordable: boolean }>;           // the client prints the odds word
          chosen: JourneyCardResult | null } | null;
  arrival: { stamp: 'Arrived'; place: string; headline: string; body: string; cardLine: string | null;
             knockOns: { ticket: number; heraldVisitor: boolean }; art: ResultArt; landing: Landing } | null;
  whileYouRide: { paperUnread: number; election: PoliticsSummaryView | null };
}
interface DistrictView {                                       // CityView.districts[]
  id; n; name; blurb; frame; anchor; opinion: OpinionShares;
  state: { battleground: boolean; controlledBy: FactionId | null;
           groundswell: { factionId; pct } | null; word: 'closeRace' | 'leans' | 'held' | 'contested'; leans: FactionId | null };
  issues: Array<{ issueId; name; leader: FactionId | null; momentum }>;
  seats: Array<{ name; factionId; local: boolean }>;
  scoreboard: { mine: { swing; rank; of } | null; table: Array<{ bracket; rows }> } ;
  residence: ResidenceCardView; you: { resident: boolean };
}
interface ResidenceCardView {                                  // screens §6.1, chosen on the server per district
  state: 'visitingMay' | 'belowRank' | 'cooldown' | 'noIron' | 'resident' | 'homeElsewhere' | 'atHome';
  livesIn: string; registeredDay?: DayKey; votesFromDay?: DayKey; canMoveFromDay?: DayKey;
  cost: 500; button: { enabled: boolean } | null; sheet: { lines: Array<{ text; warn: boolean }> } | null;
  room: { state: 'none' | 'running'; price: { total; lines }; untilDay?: DayKey; cap: number } | null;
}
CityView += {
  districts: DistrictView[] | null;                           // Irongate
  cityOpinion: OpinionShares;                                 // the average for Irongate
  scoreboard: { mine: { placeId; placeName; swing; factionId; rank; of } | null } | null;   // a home city's line
  issues: Array<{ issueId; name; districtId | null; leader; momentum; effectLine }>;
  effects: Array<{ sourceId; name; kind: 'ordinance' | 'issue'; effectLine; daysLeft }>;
  election: PoliticsSummaryView | null;                       // the residence's card, wherever you are (screens §7.2)
};
LocationView += { quarterId; factionId?: FactionId; issueIds: string[];
                  trains: { destinations: Array<{ cityId; name; minutes; fare; canBoard }> } | null };   // Central Station
ActionView += { placeTags: PlaceTagView[] };                  // order: cost change · Issue · Close race · Comeback · council rule
//  PlaceTagView = { kind: 'issue'; issueId; name; pct: 50 } | { kind: 'closeRace'; fxpPct: 25 }
//               | { kind: 'comeback'; factionId; pct } | { kind: 'membersOnly'; factionId }
//  `locked` gains { reason: 'MEMBERS_ONLY'; factionId }; the slice-3 `tags` carry `source: 'ordinance' | 'issue'`
CharacterView += {
  journey: { id; from; to; arrivesAt; status } | null;
  residence: { cityId; cityName; districtId; districtName; sinceDay; votesFromDay; standsFromDay; canMoveFromDay };
  room: { untilDay } | null; trainOpen: boolean;
  hero: { title: string; untilDay } | null; heroes: Array<{ placeName; n }>;
  scoreboard: Array<{ placeId; placeName; swing; factionId; rank; of }>;       // the Me tab, this election
};
PoliticsSummaryView += { placeId; placeName; seats: 7 | 2; card states 'registered' (registered, first vote not yet open) };
interface CapitalCountView { kind: 'capital'; councilKey; cycle; countDay; seatsByFaction; npcSeats;
  districts: Array<{ districtId; name; factions: DistrictCount['factions']; w; ballots; rows: CountRow & { factionId; local; avatar; you; yourVote }[];
                     seats: Array<{ factionId; name }>; turnout; scoreboard }>; }
CouncilView += { seats grouped by district; passVotes: 6 | 4; items ≤ 6 with branchOf };
```

### 8.4 Politics, residence-aware

`homeSpec(content, c)` becomes **`residenceSpec(content, c)`** → `{ city, offset, place: { id, name, kind: 'home' | 'district' }, homeFaction: FactionId | null }`. Every act and view reads the election `electionKey(place.id, cycle)`. Differences in the capital:

- **declare:** Rank 3, `standsFromDay ≤ today` (else `NOT_YET_CANDIDATE { standsFromAt }`), *Known* in Irongate, not a sitting Irongate councillor; the candidacy's `factionId` is the character's.
- **endorse:** the endorser is Rank 2+, an Irongate resident (any district), **of the candidate's faction** (`WRONG_FACTION`); the one-per-cycle guard is `endorsementsGiven.cityCycle: 'irongate:k'`; the branch's endorsement is the capital branch's (the three orders done); the small-branch count is the faction's active Irongate residents.
- **vote:** a resident of the district with `votesFromDay ≤ pollsFrom` (else `NOT_YET_VOTER { votesFromAt }`); any name on the district's ballot; **no opinion change** (and no morale).
- **propose / councilVote:** an Irongate councillor; the Irongate menu; up to six items.
- **home cities:** unchanged, except that eligibility, turnout and the small branch count *residents* (`residence.cityId`), and voting needs `votesFromDay ≤ pollsFrom` (migrated characters have 0).

### 8.5 The settlement v4 (`computeSettlement`)

Reads (in the settlement's transaction): the residence city (orders, crisis, paper, Rested cap), the job's city (each ended day's wage adjustment and seniority step, ADR 0030), the paper's city if different, office terms, deposits due, **awards due** (`creditedAt: null`).

1. **Wage:** `settleDays` with `wageOn(day)` from the job city's sources of that day.
2. **Stipend, refunds:** as slice 3 (a vacated term stops at `vacatedDay`).
3. **Awards:** `+pc` each, `Award.updateMany({ _id: { $in }, creditedAt: null }, { creditedAt })` in the same transaction; desk lines *District Hero · +25 Political Capital*, *Your work on the tram fares · +4 Political Capital*.
4. **Orders:** `startOrders(templates, today, hasJob, welcome, crisis, residenceKind)`; crisis only when the residence is the home city in Unrest.
5. **Energy re-base:** when a day since the last write had a cap other than the base (ADR 0021's rule, with `capOn` from the residence city and the room).
6. **Edition:** `paperCityFor(c, today)` (§11); headlines from that paper's templates with the facts of §11.3.

### 8.6 Test hooks (only with `E2E_TEST_HOOKS`, memory mode)

| Route | Body | Does |
|---|---|---|
| `POST /api/test/journey` | `{ arriveNow: true }` | the caller's open journey: `arrivesAt = now` on the journey and the character's pointer (nothing else) |
| `POST /api/test/clock` (extended) | `{ advanceTo: { weekday: 'monday', hour = 9 } }` | forward only, to the next Monday at `hour`:00 UTC |
| `POST /api/test/character` (extended) | `{ level?, xp?, cityId?, residence?: { cityId, districtId }, irongateSuccesses? }` | `level` sets XP to that level's threshold; `cityId` places the character (journey null); `residence` sets it with every window at 0 (votes and stands at once) |
| `POST /api/test/city-day` | — | unchanged (now also Irongate and the Issues) |

### 8.7 The dev panel (README "Reviewing with the dev panel")

New buttons, each a call to the hooks above followed by the existing settle (no game rule in the panel): **Arrive now** (shown on a train), **Next Monday** (the Issues resolve and redraw), **Level 10** (and Rank 2 if below), **Take me to Irongate** (no ticket, no card), **Live in…** (a five-district plus *home* menu). `GET /api/test/dev/status` adds: where the character is (a city or the train with minutes left), the residence and its windows, Irongate's five districts (shares, *close race*, *comeback*), and the residence city's two Issues with their points. The existing **Phase** button steps the residence city's council (Irongate's when resident there).

---

## 9. Scheduled jobs (Agenda)

### 9.1 `city-day` (extended)

Unchanged in schedule and idempotency (ADR 0017). `runCityDay` loops `content.councilCities()`, which now includes Irongate; each city's boundary runs its Issues step on Mondays and its heroes step at counts. Irongate is first in the loop (its count is the biggest transaction). Worker down: every request catches up boundary by boundary as before, Issues and heroes included.

### 9.2 `journey-arrive` (new, ADR 0025)

- **Defined** in `worker.ts`: handler `settleArrival(journeyId, Date.now())`; `{ concurrency: 5, lockLifetime: 60_000 }`.
- **Scheduled** by the API after the boarding transaction commits, through `apps/server/src/jobs/scheduler.ts`: a non-processing Agenda client on the same backend (no `start()`), `agenda.schedule(arrivesAt, 'journey-arrive', { journeyId })` with `unique({ 'data.journeyId': id })` where the installed Agenda supports it. A failure goes to Sentry and changes nothing: the lazy path is the guarantee.
- **Idempotent:** `settleArrival` is two conditional updates; a duplicate or a late run is a no-op; a run before `arrivesAt` (clock skew) does nothing and the lazy path catches it.
- Tests inject a recording scheduler; no test relies on Agenda.

---

## 10. The result modal: how the breakdown is produced

### 10.1 Actions in the capital (`ActionResult`, GDD §13.1a, review 3's receipt)

| Where | What is added | Example (a canvass at the arrivals hall, Station & Market a close race, *Tram Fare Hike* live) |
|---|---|---|
| `attempts[].check.bonuses` | `{ id: 'battleground', label: 'Close race', value: 5 }` (political types) | the client shows the odds word, never the number (review 2) |
| `rewards.opinion`, `rewards.opinionFactors` **new** | the factors, each `{ id, label, pct }` | *Close race +25 %* · *Issue: Tram Fare Hike +50 %* → 0.05 → **+0.094** |
| `rewards.fxp.parts` | *Close race* (0.25 of base), with *Party order*, *Fired up* (home), ordinances, Issue effects | *+6 · Close race +2 · Party order +2* |
| `rewards.iron.parts`, `xp.parts` | Rested, `ironPct` sources | unchanged meaning |
| `effects.opinion` | `placeId`, `placeName` (the district) | *Collective 20.0 → 20.1 % in Station & Market* (the receipt's note) |
| `effects.issues` **new** | `Array<{ issueId; name; factionId; added; totals; leader }>` | *Tram Fare Hike: Collective +30 points (leads 30 to 0)* |
| `bonusTags` | *Close race · +25 % Party XP · better odds*, *Issue: Tram Fare Hike · opinion +50 %*, *Comeback +15 %* | as the ticket's tags |
| `effects.scoreboard` **new** | `{ placeName; swing; rank; of }` after this action | *This election you've moved Station & Market +0.28 for the Collective (1st of 3)* |

The opinion row of the receipt (review 3 §3.2) reads *Opinion in Station & Market +0.094 %* with the note *Close race +25 % · Issue +50 % · Collective 20.0 → 20.1 %*. A state that would change at the next boundary is not mentioned (the paper says it).

### 10.2 Arrival (`ResultModal kind: 'journey'`)

Built by `travelService` from the journey: the art panel is a `map-crop` of the destination's 2048 px still at `nation.cities[].arrival` (Irongate: Central Station); stamp **Arrived**; place line *Irongate · Station & Market* or the city's name; headline *You're in the capital* (first time in Irongate) / *Irongate* / *Home*; body: the card's one line (*The passenger: +6 Party XP, opinion +0.03 in Station & Market*) or *The train was on time. Nothing happened, which is rare.*; knock-ons *−20 Iron · ticket* (the fare's total) and *The Herald is your paper while you're here* (a visitor); the unanswered card inside the modal (compact `JourneyCard`), answerable until **Continue** (`travel.close` → the landing).

### 10.3 The journey card (`JourneyCardResult`)

```ts
interface JourneyCardResult {
  kind: 'journeyCard'; journeyId; eventId; choiceId;
  stamp: 'success' | 'partial' | null;                        // null for an unchecked choice
  headline: string; body: string; reason: string | null;      // a Partial's one-line reason (review 2 §2.4), the destination's training place
  rewards: Array<{ id: 'xp' | 'fxp' | 'iron' | 'opinion' | 'points' | 'rested'; amount: number; note?: string }>;   // receipt rows, zeros omitted
  opinion: { placeName; factionId; before; after } | null;
  points: { issueName; added; totals; leader } | null;
  quoted: boolean;
  performedAt; idempotencyKey; character: CharacterView; journey: JourneyView;
}
```

The card's choice rows print the server's chance as an odds word with the stat in full (*Good odds · Agility · opinion +0.05 in Coalport · +5 Party XP*); no number reaches the screen.

### 10.4 Register and the room (`ResultModal kind: 'political'`)

`PoliticalResult.act` gains `register` and `room`; texts in `content.politics.results` (stamps *Registered*, *Taken*; headline *{district} has a new voter* / *A room in Irongate*; bodies of screens §6.3 with `{hq}` the faction's capital HQ name); knock-ons `iron { before, after }`, `seatGivenUp: { cityName } | null`, `candidacyWithdrawn: boolean`; `next` *Next: vote in {district} from {weekday}.*; `view: { kind: 'residence', residence: ResidenceCardView, election: PoliticsSummaryView }`, so the district view and the Election card change the moment the modal closes.

### 10.5 The count in the capital

No modal (as slice 3). `CapitalCountView.districts[]` carries every number the two tables print: per faction votes, opinion share, score (one decimal) and seats; per candidate local support, backers, votes, support; `w` and the ballots for the Courier line; the scoreboard snapshot. The formula is fixed copy in words (screens §8).

---

## 11. The Morning Paper v4

### 11.1 Which paper

`paperCityFor(c, today)`: **the Herald** when the edition is printed while the character is in Irongate or on a train to it; otherwise the residence city's paper. The edition's `cityId` records it. Its stored headlines come from that paper's templates; the live sections follow the residence.

### 11.2 Sections

| Section | Source | Notes |
|---|---|---|
| Front page | as slice 3, for a seat in the residence city | the capital's seat headline is `hl.ig.seat-won` / `seat-top` |
| Headlines | stored + live political (the residence's templates) + live capital and Issue lines | merged by priority (ADR 0023); capital city lines only in the Herald |
| **The Issues** (new, live) | `issues` docs of the current week for the four open cities | the residence city's two, then the capital's two, then the rest folded; *New this week* on Mondays; `settlesAt` = next Monday 00:00 |
| Party orders | the residence rotation | `{issue}` resolved at read |
| Election | `PoliticsSummaryView` of the residence | the capital states of screens §7.2 |
| Letters | as slice 3 | |
| In Print | *District Hero*, *City Hero*, *Quoted* (live from awards and `lastQuoted`) | the rosette mark |
| Your desk | + awards credited, the room | |

### 11.3 New headline conditions

- **Stored (settlement):** `levelCrossed { level: 10 }` (`hl.*.train-open`), `quotedYesterday`.
- **Live, personal:** `registeredYesterday` (`hl.ig.welcome-resident`, home `moved-away`), `firstCapitalArrivalYesterday`, `heroYesterday { kind: 'district' | 'city' }`, `issuePcYesterday`.
- **Live, city:** `issuesDrawnToday`, `issueLeading`, `issueOpen`, `issueResolvedToday { owned: boolean }`, `districtBattleground { residence: true }`, `districtBecameBattleground`, `districtLeftBattleground`, `groundswellStarted`, `districtLine` (fallback), and the slice-3 political ones with `{district}`.

Facts come from the city and district documents (`state.previous`, `groundswell.fromDay === today`), the week's issue docs, and `awards` — the same reads the views make, so no edition write is needed.

---

## 12. Client (`apps/client`) and UI (`packages/ui`)

### 12.1 Routes

| Route | Screen | Data |
|---|---|---|
| `/nation` | the nation map, city cards, the Cities list | `travel.nation` |
| `/journey` | the journey screen; the arrival modal when arrived | `travel.journey` (refetch on focus; a 1 s client tick for the progress line; a refetch at `arrivesAt`) |
| `/city/$cityId` | a home city as today; **Irongate: the district overview** | `city.get` |
| `/city/$cityId/$quarterId` | **a district view** (Irongate); later a home city's quarter | `city.get` |
| `/council/*` | the residence's election and council; `/council/count?d=` the district switcher | `council.*` |
| `/paper`, `/me` | + the Issues section, In Print, the scoreboard, residence and heroes | `paper.today`, `character.me` |

- **The index route** sends a character with `journey` set to `/journey`; else as today (the paper when due, else the city: Irongate opens on the **last district viewed** in this session, kept in `sessionStorage`, the station district after a journey).
- **The Map tab** carries a segmented *City | Nation* control in the top bar; *Nation* is always there (below Level 10 every card reads *From Level 10*). On a train the Map tab lands on `/journey`.
- Every new route resets the scroll and is guarded by `requireCharacter`. After a mutation the client renders the returned views and invalidates `character.me`, `paper.today`, `city.get`, `travel.nation`.

### 12.2 `packages/ui` additions (plain props, no tRPC)

`CityCard`, `CitiesList` (the `PlacesList` pattern), `JourneyScreen`, `JourneyProgress`, `JourneyCard` (the `StoryScreen` rows; compact variant for the modal), `DistrictPin` (via `CityMap`), `DistrictCard`, `DistrictsList`, `OpinionBars` (shares, and a points mode), `TramBar`, `TrainsCard` (the `JobsCard` pattern), `ResidenceCard` and `RegisterSheet`, `IssuesSection`, `IssueRow`, `ScoreboardLine`, `ScoreboardTable`, `DistrictResultTable`, `DistrictSwitcher`. Changed: `ResultModal` (kind `journey`; the opinion factors and the Issue knock-on in the receipt), `Ticket` (`placeTags` in the screens' order; *Members only* dims the ticket and removes its buttons), `Plate` (the district kicker, the state word, the scoreboard line), `ElectionCard` (capital states), `SeatGrid` (group captions), `CountTable` (faction grouping, *Local candidate*).

### 12.3 The maps (`CityMap`, review 3 rules everywhere)

One component for all three pictures, with **free zoom and drag** between the review-3 limits (never past the finest tile level, never out past covering the box), the pin zoom (2.5 × the view that shows every pin, 1.6–3 ×), the one-movement sheet, and clouds where the content turns them on. Additive props:

| Prop | For | Behaviour |
|---|---|---|
| `pinStyle: 'number' \| 'label' \| 'district'` per hotspot | nation (label: *Coalport · 12 min*), overview (district: number 1–5 and the name) | the 44 px target is kept; labels never overlap at rest (the pins are ≥ 0.29 apart) |
| `pinState: 'here' \| 'muted' \| 'residence' \| 'issue'` | the inverted *you are here*, 60 % locked cities, the house mark, the *Issue* dot | marks only, no rule |
| `restFocus: string[]` | nation: your city and the capital; on a train the two ends of the line | the at-rest view is the covering view centred on these pins' box; others are a drag or a list tap away |
| `zoomOnSelect: number` | district pins on the overview (1.6 ×: "zooms a little") | default 2.5 |
| `frame` | the five district frames; the overview `(0, 0, 1, 1)`; the nation `(0.06, 0.11, 0.94, 0.91)` | as built |
| `memoryKey` | `nation`, `irongate`, `irongate.<district>` | the dragged and zoomed view is kept for the session |

The overview and the district views share one `CityPage` and, where possible, one mounted `CityMap` whose `frame` and pins change (so a district opens as a zoom over the same tiles, no reload); if the frame change cannot animate cleanly, a 180 ms cross-fade is acceptable (ADR 0024's zoom-through is not required). A district view draws only its own pins; Garrison Hill relies on the phone's opaque plate band (`hideTop`), as Coalport's Foundry Row does.

### 12.4 Layout (screens §10)

The nation map covers the screen at rest with both focus pins clear of the HUD, the Cities pill and the tab bar on 360 × 640, 375 × 667, 390 × 844, landscape and 1440 × 900; the journey screen's header, progress line, sentence, the card's title and first row above the fold on 375 × 667; the district card ≤ 60 dvh; the tram bar always visible, 44 px; pins ≥ 44 px apart at rest on 360 px in every district (or a drag away, as review 3 allows); the Issues section shows at most four rows unexpanded; the result's tables at 13 px Oswald without horizontal scroll at 360 px; desktop: the maps full-bleed with the side sheet, the paper and the council in the 640 px column with the district switcher as tabs.

**Double taps** (QA slice 2 M1): *Board*, a card's row, *Register*, *Take a room* and *Continue* on the arrival modal are disabled from the tap until the returned view renders; a card collapses to the chosen row at once.

### 12.5 Copy

The screens §11 strings and the help notes go to `copy.ts`; the Issue effect lines and the card details are content. The QA vocabulary test runs on every new string with two allowances (design §17 Q13): *Garrison Hill* (a place name) and *the war* (the historical war, four texts); rule and Issue names are exempt as ordinance names are.

---

## 13. Art (ADR 0015, 0024)

- **Stills:** `map.irongate.day` / `.night` (`maps-v3/irongate-{day,night}-11520.png`, 11,520 × 11,520) and `map.nation.day` / `.night` (`nation-*-9216.png`, 9,216 × 9,216), at 1024 and 2048 px (AVIF; WebP 1024 only), with the alt texts already in `art.ts`. `cityMap(name, time)` gains the picture's size. `pnpm art:build`, then record the measured bytes against ADR 0015's budget in the Deviations (the first Irongate view is tiles; the stills are the first paint, the fallback and the result's map crops).
- **Tiles:** both pyramids exist in `tiles.json` (ADR 0024); nothing to cut.
- **Scenes:** none new. The Opera (`theatre`) and every other Irongate kind without a scene use the map crop (ADR 0015 rung 3); the capital HQs use the faction HQ scenes where they exist (Collective, Vanguard) and the map crop for the Alliance. The arrival panel is a map crop at the station point.
- **Clouds:** `clouds: true` on Irongate and on the nation (the same sprites and config; the dev viewer's frame recorder is run on both and recorded; if the nation drops frames on the 4 × CPU phone profile, it is switched off there, which is one content line).
- **Election header (review 3):** Irongate's `council.hall` point (§22.1 Q7).

---

## 14. Security

| Threat | Guard |
|---|---|
| Acting where you are not | `action.perform`, `job.take` and `residence.*` check `cityId` and `journey` in the transaction; `city.get` refuses other cities and the train |
| Free travel or two trains | the fare is spent with `iron ≥ fare` and the version guard; `{ characterId, n }` unique; `journey` must be null or arrived |
| Arriving early | arrival only when `arrivesAt ≤ now` on the server clock; the client only asks |
| Choosing twice or replaying a better roll | one choice per journey (`choice: null` guard), the roll from the journey's stored seed; the request key replays the stored result |
| Voting or standing where you do not live | `residence` read in the transaction; `votesFromDay` / `standsFromDay` windows; the ballot names must be on *that* district's frozen ballot |
| Hopping for a ballot | the seven-day cooldown and the polls-open rule |
| Endorsing across factions | `WRONG_FACTION` in the transaction |
| Rival HQ tickets | `MEMBERS_ONLY` on the server; the client only dims |
| Leaking ballots | ADR 0019 unchanged: no view carries `ballots`, totals or choices before the count; Issue points are public by design |
| Hero or Issue PC twice | `awards` unique key; credited once in the version-guarded settlement |
| Test hooks in production | unchanged: `E2E_TEST_HOOKS` requires memory mode |

---

## 15. Testing

| Layer | What |
|---|---|
| Rules | §6.10 |
| Content | the real data validates; a failing fixture for every §4.2 check (a pin outside its district frame, a district baseline not summing to 100, an Issue feeding a location in another city, a checked card without a partial, an `faction-hq` without `factionId`, three NPCs in a district for one faction, a capital template without `residence`); word-for-word comparisons with both design documents; §3.1's dates; the nation positions equal the survey |
| DB | the six collections' indexes; the changed unique indexes; migration 006 twice (no change the second time); a transaction touching every new collection commits on the memory replica set |
| Server — travel | board → the fare, the journey, the card (the first is the passenger); a double board with one key → one journey; two keys → `IN_TRANSIT`; arrival lazily at `arrivesAt` (and not 1 ms before); `settleArrival` by the job and a request concurrently → one arrival; choose during the journey and on the arrival modal; after `close` → `CARD_CLOSED`; slept through; the parcel's stake rules; *Sit in* without 20 Iron; points on the destination's first Issue; boarding while arrived-but-unclosed closes the old one; fares under Tram Subsidy and the Fare Hike (10, 5) |
| Server — the capital city day | bootstrap on each cycle day 0–4 (districts, ten NPC seats, no ordinance, elections in phase, Issues); twice and concurrently → one set; worker down 12 days → every boundary in order, deep-equal to the job-every-day run (two databases, seeds injected); Monday + count on the same boundary (Mon 19 Oct 2026: the Issue's +3 before the states and the count); drift sums; Groundswell start and end; the existing home cities draw their first Issues lazily, once |
| Server — the count | the design's worked examples end to end (seeded ballots in Eastside and the Government Quarter); cross-faction ballots; turnout; a vacated seat at a move; the order paper's three branch motions and a coalition passing 7–3 |
| Server — actions | a tagged canvass in a close race: the factors, the parts, the ledger row, the contribution, the Issue's momentum; *Members only*; `IN_TRANSIT`; concurrent actions in two districts do not conflict (`txAttempts` 1); concurrent actions in one district serialise and every row is in the ledger |
| Server — residence | register in each district; every refusal with nothing written; the windows on each cycle day; a home candidacy withdrawn and a home seat vacated (the NPC sits from the move's day; the stipend stops); moving back; the room and its renewal; the Rested cap with the room and Fever at St Agnes |
| Server — Issues and heroes | a week on the test clock: draw, tags, points, resolution (+3 in the district, awards for the top five, the effect for seven days on tickets and rooms), a lapse; a hero per bracket at ≥ 0.5 and none below; awards credited once at the next settlement, on the desk |
| Server — settlement | the wage from the job's city; capital orders from the next day after a move; the Herald for a visitor and a resident; the Issues section; the scoreboard |
| Server — secrecy | during the capital's polls, every procedure's JSON for another player has no ballots, totals or choices |
| UI | fixtures for every new component (each card and residence state, an Issue row open and folded, the arrival modal with and without a card, the journey card's three states, the district result) |
| E2E (Playwright) | §15.1; existing specs unchanged except where the residence seam touches them (none expected) |

### 15.1 E2E specs (each in its own Playwright project, after the existing ones: they move the shared clock)

**`travel.spec.ts`** (phone): sign up and arrive (Collective) → `POST /api/test/character { level: 10 }` → the paper's *The Train Is Open* → Map → *Nation*: the map covers the screen, Coalport (*you are here*) and Irongate both clear at rest → tap Irongate → the card with *Board · 20 Iron · 12 min* → Board → `/journey`: *The {time} to Irongate*, the sentence, *A talkative passenger* with odds words and no digits → *Talk politics with him* → the outcome inline → `POST /api/test/journey { arriveNow }` → the arrival modal *Arrived · You're in the capital* → Continue → the Station & Market district view, Central Station open, *Close race* and *Issue:* tags on the political tickets → *Once* on the arrivals hall → the receipt's opinion row with *Close race +25 %* and the points knock-on → the tram bar → Eastside (no close-race tag) → the overview (five district pins, the Districts list) → back → Central Station's Trains card → *Board the train to Coalport* → arrive → the Coalport map.

**`capital.spec.ts`** (phone): `advanceTo cycleDay 0` (Irongate) → a Rank 2 character in Irongate (hooks) → the residence card *Register in Eastside · 500 Iron* → the sheet's five lines → Register → *Registered*, the Election card *Registered in Eastside · you vote from {weekday}* → `advanceTo cycleDay 2` → *Vote now* → six or more names in three parties → vote → `advanceTo cycleDay 0` (lazy) → the result: five districts, the player's first, the parties' table and the candidates' table, no horizontal scroll at 360 px → `advanceTo { weekday: 'monday' }` → the paper's *{faction} Owns {issue}* and the effect on a ticket or the fare.

### 15.2 Playtest report: the battleground (design §17 Q12)

`pnpm report:playtest` gains a **battleground** section (pure builder with fixtures, reading domain collections only):

- **Travel:** journeys per character per day; legs; cards drawn, answered during the journey, answered on arrival, slept through; **dwell**: the share of journeys closed within 2 minutes of `arrivesAt` (waited, or came back on time) against later (closed the game), and the share answered before `arrivesAt`; first trip's day after Level 10.
- **Residence:** first-move day per character (and days after Level 10 and after Rank 2); moves back home; rooms taken; residents per district.
- **The capital's counts:** per district per cycle: ballots, `w`, turnout, the seat winners (player / local), ties drawn; ordinances passed in Irongate (and by which coalition).
- **States:** close-race days per district; Groundswell starts; control changes.
- **Issues:** per city per week: points by faction, owner or lapse, the top five's count, effects in force.
- **Ledger:** contributors per district per cycle, heroes named by bracket, share of capital opinion moved by actions vs cards vs Issues vs drift.
- **Contention:** `txAttempts` for capital actions (per district) and for home actions, before and after slice 4.

---

## 16. QA playtest checklist (the slice question, in play)

Run on `pnpm dev:mem` with the dev panel; two or three testers in different factions where possible.

- [ ] **The first trip** (Level 10 by the panel): the paper says the train is open; the nation map fills the phone, your city and the capital both in view, free zoom and drag work and never show a band; the Cities list reaches every city; locked cities say *rival ground* / *no service yet* with no button.
- [ ] **Boarding** is one tap; the Iron goes; the journey screen shows the time, the progress line moves, the sentence is there; the first journey has *A talkative passenger*.
- [ ] **Close the game mid-journey**, come back after `arrivesAt`: the arrival modal waits, the card is still answerable on it; Continue lands on Station & Market with Central Station open.
- [ ] **Do testers wait on the journey screen or close it?** (note it; the report measures it).
- [ ] **A canvass in a close race** shows the tag before and the *Close race* and *Issue* lines after; no percentage or roll anywhere.
- [ ] **The tram bar** hops districts in one tap; the overview shows five pins, never a place pin; Union House and the Bombed Blocks never share a screen.
- [ ] **Members only**: a rival HQ's tickets are dimmed with no button; your own HQ's work.
- [ ] **Register** (Rank 2): the sheet lists what changes before the tap; the modal; the next morning the Herald, the capital's orders, *Takes Up Residence*.
- [ ] **A home seat or candidacy** given up at the move says so in the sheet and the modal, and the home council shows a local in the seat.
- [ ] **The vote**: names of three parties, any of them selectable; *your vote is secret*; the result's two tables and the plain-words line; the scoreboard and, if earned, the hero line *In Print*.
- [ ] **A capital council** with a player councillor: three branch motions, the *six of ten* line; crossing the floor passes a motion.
- [ ] **Issues**: the paper's section on Monday (*New this week*), points rising after tagged work, *Where to act* marks the pins; next Monday the owner, the effect on a ticket or fare, the top-five PC on the desk.
- [ ] **Being away costs nothing**: a tester away three days returns to the wage, any hero PC and Issue PC on the desk, the residence and the room unchanged.
- [ ] **Does the three-way fight feel alive?** Ask: did you see another party move a district you worked? did you change where you worked because of a close race or an Issue? would you move to the capital (and did you)?

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| **The residence seam touches every slice 1–3 path** (`homeCityId` is read in ~40 places) | T12 lands it alone, as a no-behaviour-change refactor: every slice 1–3 test and e2e stays green with residents at home; a lint rule (`no-restricted-properties` on `homeCityId` outside an allow-list) keeps new code on `residenceOf` |
| The capital city day is the biggest transaction (5 districts × count, 10 terms, 5 elections, heroes, Issues) | One transaction per boundary as ADR 0017; measured in the worker-down test; `transactionLifetimeLimitSeconds` headroom checked; if it grows, split the count per district into its own guarded transaction (each still idempotent) |
| Hot documents in the capital | Districts spread the writes five ways (ADR 0027); the ledger is append-only; contributions are per character; Issue docs carry the same population as their district; `txAttempts` in the report |
| Monday and a count on the same boundary | The order is fixed (§3.2) and tested on such a day: **Mon 19 Oct 2026** (20745) is a Monday and Irongate's cycle day 0 |
| The design documents disagree on zoom and a few rules (§23) | This document takes a side for each, lists it for the designer, and the content tests hold the transcription to the design so a later change is one place |
| Transcription volume: 62 actions (124 texts), 30 NPCs, 19 Issues, 7 cards, ~60 Herald templates, 12 orders | Word-for-word comparison tests against the design documents (the slices 1–3 method) |
| Art bytes: the capital's 11,520 px stills at 2048 px | Tiles are the first view; the stills are budgeted and measured (ADR 0015); the result's map crops use the 2048 px still once cached |
| `CityMap` is 1,700 lines | Props are additive; the nation and the overview are new configurations of the same behaviour, each with its own e2e size matrix |
| Players never see Groundswell or a hero at playtest scale | Expected (Appendix C #29); the dev panel can stage it; the report records it |
| The API now writes Agenda jobs | Best effort after commit; the lazy path is the guarantee; tests inject a recorder |
| An NPC-only capital council never passes anything | By the rule (one player crossing the floor is the coalition); the report counts it |

---

## 18. Idempotency and atomicity summary

- **City day:** one transaction per city per boundary, guarded by `world.settledDay: d − 1`; per-step status guards (`polling`, `nominations`, `open`, `live`); natural unique keys for every derived document (elections by place and cycle, terms by council, seat and day, issues by city, week and Issue, awards by kind, ref and character).
- **Board:** a request key + `{ characterId, n }` unique + `journey` null-or-arrived + `iron ≥ fare` + the version guard, one transaction.
- **Arrival:** two conditional updates (`status: 'onTheWay'`, `journey.status: 'onTheWay'`), the same function for the request and the job.
- **Choose:** a request key + `choice: null` + the version guard, one transaction with the opinion, ledger, contribution and Issue writes.
- **Close:** conditional `$set` (`status: 'arrived'`); repeating it returns the same landing.
- **Register:** a request key + version + `canMoveFromDay ≤ today` + `iron ≥ 500`, one transaction with the withdrawal and the vacated seat (both conditional on their status).
- **Room:** a request key + version + `iron ≥ price`, one document.
- **Actions:** as slice 3 + the district write (ADR 0010), the ledger insert, the contribution upsert, and the Issue `$inc` guarded by `status: 'live'`.
- **Awards:** unique key at creation; credited once in the version-guarded settlement (`creditedAt: null` → set).
- **Everything from slices 0–3:** unchanged.

---

## 19. Deliberately left out of slice 4

| Left out | Why / where |
|---|---|
| First class, the car, the night train, cancel before departure | After the MVP (plan §4); the train leaves at the tap |
| Rival home cities (travel, the hostile deck, encounters, Heat on the parcel) | Slice 5 (locked, *rival ground*) |
| Clearwater | Slice 7 (locked, *no service yet*, baseline on its card from content) |
| Fellow travellers' list and carriage chat | Slice 6; only the count line |
| Home cities' station quarters | A later content addendum (the user's decision) |
| The Dossier entry on *Hand it to the guard* | Slice 8 |
| District control's effects (police, prices, safehouses), dominance | Slices 5 and 8; control changes only the plate's word and Groundswell |
| The Mayor of Irongate, National Control | Slice 7 |
| Early Issue resolution, weather, laws on travel | Appendix C #28; their slices |
| The desktop Herald ticker on the overview | Small and decorative; a later view change |
| While You Were Away, push notifications | As slice 3 |
| The faction ledger screen | Slice 6 |
| Legacy entries and the profile medal for heroes | Slice 8 |
| Deployment, R2, Atlas | Local only (the user's decision) |

---

## 20. Task list (in order; each task leaves `pnpm lint typecheck test` green and is one commit)

**Parallel lanes.** After T1, the rules tasks T2–T5 can run in parallel; T6 needs T3. Content T7 needs T6's types; then T8, T9 and T10 in parallel. DB T11 needs T7. Server T12 first (it changes the most shared code); then T13 and T15 in parallel; T14, T16 and T17 need T13; T18 needs T14; T19 and T20 last on the server. **UI T21 can start after T6** on fixtures and run alongside the server lane; client T22–T24 need their procedures (T15 for T22; T14/T16 for T23; T17/T18 for T24). T25–T27 close the slice.

**T1. Rules: week and travel.** `week.ts`, `travel.ts` (legs, destination states, fares, the card draw, progress, `resolveJourneyChoice`), constants. *Done when:* §6.10 week and travel tests pass, including 30,000 seeds for one in three and §3.1's Mondays.

**T2. Rules: districts.** `district.ts` (baseline drift, close race, control, Groundswell, averages). *Done when:* the district tests pass and the sum is exactly 100.000 over 5,000 random drifts.

**T3. Rules: modifier sources (ADR 0030).** `PlaceModifiers`, `effects()`, the combination rules, `ticketPct` / `roomPct`, the battleground FXP share and chance, `swingFactors`, `computeRewards` with `opinionFactors`, `resolveTier1Action` with points and the new descriptor. *Done when:* every slice 1–3 rules test passes unchanged with one source, and the §6.10 modifier examples (0.094; +2 *Close race*; 0.053) pass.

**T4. Rules: Issues.** `issues.ts` (draw, tags, points, resolution). *Done when:* the Issue tests pass, including 10,000 seeds for two different districts and never last week's two.

**T5. Rules: the capital count and division.** `capitalCount.ts`. *Done when:* the design's three worked examples, the tie order, the forfeit, NPC fill and the four division cases pass.

**T6. Rules: ledger, residence, orders, headlines, types.** `ledger.ts`, `residence.ts`, `orderMatches(ctx)`, `ordersForDay(…, residence)`, the new headline conditions and placeholders, the view, result and error types. *Done when:* the ledger, residence and orders tests pass and `pnpm typecheck` is green across the repo with the new types.

**T7. Content: schemas and cross-checks.** §4.1–§4.2, `GameContent` accessors, failing fixtures. *Done when:* every §4.2 check has a failing fixture and the existing content validates.

**T8. Content: Irongate.** The city, districts, 29 locations, 62 actions and texts, three jobs, clouds, the Herald masthead; comparison tests against design §4. *Done when:* the Irongate content tests (pins = survey, frames, ≥ 0.02 inside, 62 actions by type 21 / 10 / 12 / 11 / 3 / 5, texts word for word) pass.

**T9. Content: the nation, cards, Issues, orders, candidates, headlines, copy.** §4.4's remaining rows; `TODO(game-designer)` stand-ins where a home paper's text is not written. *Done when:* every comparison test passes and the vocabulary test passes with the two allowances.

**T10. Art: the capital and the nation.** Catalogue the four stills with sizes, `pnpm art:build`, measure against ADR 0015 and record. *Done when:* the art tests pass and the dev map viewer shows both pictures with stills and tiles.

**T11. DB.** The six models, the changed fields and indexes, `requestLogs` kinds, migration 006. *Done when:* migration 006 run twice changes nothing the second time, the changed unique indexes are in place, and a transaction over all new collections commits.

**T12. Server: the residence seam (no behaviour change).** `residenceOf`, `residenceSpec`, `ensurePlaces`, `LoadedCharacter.places`, the job city in the settlement and `job.take`, `activeMembersFilter` by residence, `hqOf(faction, city)`, `orderMatches` with the residence, `paperCityFor` (always the residence until T15), the lint guard on `homeCityId`. *Done when:* every slice 1–3 server test and e2e spec passes unchanged.

**T13. Server: the city day v2.** `processCapitalBoundary`, `bootstrapCapital`, the Issues step and lazy Issue bootstrap for existing cities, the heroes step (districts and home cities), Irongate in `runCityDay`. *Done when:* the capital city-day tests of §15 pass (bootstrap ×5 cycle days, twice, concurrent, worker down deep-equal, Monday on a count day).

**T14. Server: actions and the city view in the capital.** District write-through, place modifiers, tags and points, ledger and contributions, members only, `IN_TRANSIT`; `city.get` v4 (districts, place tags, scoreboard, effects, the Trains card, residence cards). *Done when:* the action tests of §15 pass (the factors, the parts, the ledger, the momentum, no cross-district conflicts) and the breakdown of §10.1 is produced for the e2e canvass.

**T15. Server: travel.** `travel.nation`, `board`, `journey`, `choose`, `close`, `settleArrival` and `ensureArrived`, the scheduler and the `journey-arrive` job, fares, the arrival view, `paperCityFor` with the Herald for visitors. *Done when:* the travel tests of §15 pass, including the concurrent job-and-request arrival and the card after close.

**T16. Server: residence and the room.** `residence.register` (windows, withdrawal, `vacateSeat`), `residence.room`, the Rested cap with the room. *Done when:* the residence tests pass, including a vacated home seat with the stipend stopping and every refusal writing nothing.

**T17. Server: the capital's politics.** Residence-aware `council.*`; per-district declare, endorse (faction and city-cycle guards), vote (windows, no opinion), close, count view (`CapitalCountView`), chamber (ten seats, six items, six of ten), the Election card's capital states. *Done when:* the count and secrecy tests pass and the slice-3 council tests still pass for home cities.

**T18. Server: settlement and paper v4.** Awards credited and on the desk, capital orders, the edition's paper, the Issues section, the new headline facts, In Print, the Me view (residence, heroes, scoreboard). *Done when:* the settlement and paper tests of §15 pass, including a three-day absence with awards waiting.

**T19. Server: the integration suite.** A capital week on the test clock for one player per faction: travel, register, vote, count, a coalition ordinance, an Issue owned and its effect, a hero; plus the boundary races (a vote at 23:59:59.999 against the count, a tagged action against the Monday resolution, a district action against the drift). *Done when:* the suite passes ten times in a row.

**T20. Server: dev panel and test hooks.** §8.6–§8.7. *Done when:* `devPanel.test.ts` covers each new button and the status fields, and the hooks are absent without `E2E_TEST_HOOKS`.

**T21. UI package.** `CityMap`'s new props; §12.2 components with fixtures and smoke tests; `ResultModal` kind `journey`, the opinion factors and the Issue knock-on; `Ticket` place tags. *Done when:* each component's fixture test passes and the existing UI tests pass.

**T22. Client: the nation, the journey and the arrival.** `/nation`, the Map tab's control, `/journey`, the arrival modal, the Trains card's board, the index redirect. *Done when:* `travel.spec.ts` passes up to the arrival and the §12.4 layout checks pass at the five sizes.

**T23. Client: the capital map.** The overview, district views, the tram bar, district cards, the residence card and sheet, the room, ticket tags, *Members only*, the Places and Districts lists, clouds. *Done when:* `travel.spec.ts` passes end to end and `map.spec`'s cover and pin checks pass on the five district frames and the overview.

**T24. Client: the paper, the election and the Me tab.** The Issues section and *Where to act*, In Print, the capital Election card states, the ballot, the result with the district switcher, the council with ten seats, the Me tab's residence, scoreboard and heroes. *Done when:* `capital.spec.ts` passes.

**T25. E2E and vocabulary.** The new hooks wired in the specs, the two Playwright projects after the existing ones, the vocabulary test over slice-4 strings with its allowances. *Done when:* the whole e2e suite is green locally.

**T26. Report.** §15.2 with a pure builder and fixture tests. *Done when:* the fixture tests pass and a local run after the e2e suite prints every section.

**T27. Docs.** README (the new dev-panel buttons, `journey-arrive`), the **Deviations** section at the end of this file, ADR statuses, GDD edits if a number changed (none expected). *Done when:* the README's steps reproduce a first trip and a move from a fresh `pnpm dev:mem`.

---

## 21. Answers to the design's questions (design §17)

1. **Ledger or write-through.** Both, as suggested: the write-through stays (the modal needs the new share, and ADR 0010's measured contention is low), and a ledger row is appended in the same transaction. A per-character `contributions` total is upserted alongside, so the plate line and heroes never aggregate the ledger. Folding the meter from the ledger stays the remedy if `txAttempts` says so (ADR 0028).
2. **Arrival without a job.** Lazy arrival is the guarantee; a tidy `journey-arrive` job is added anyway (the plan names journeys as a real event), so the database says where absent players are for the report and slice 6's presence. It is best effort and idempotent (ADR 0025).
3. **The city document for Irongate.** One `cities` document for the city-wide state (calendar, council, ordinance, Issues) and **five `districts` documents** for the meters and their states, rather than embedded districts: every capital action writes its district, and five documents spread those writes. Elections: **one per district per cycle**, all counted in the one boundary transaction; the count page reads the five together (ADR 0027).
4. **Residence.** In the character as `residence { cityId, districtId, sinceDay, votesFromDay, standsFromDay, canMoveFromDay }`; `cityId: 'home'` in order matches resolves to the residence city and `districtId: 'home'` to its district; the paper's live sections follow it; `homeCityId` stays the faction's home (ADR 0026).
5. **Content schema.** As suggested, with one change: a district is a `Quarter` with an optional `district` block (n, baseline, anchor) rather than a separate `City.districts[]`, so the capital's quarters *are* its districts and every frame and survey test applies unchanged (§4.1). The other items as listed, plus `roomPct` (§23 #2) and a `nation` section instead of `routes[]` (positions, minutes, service and arrival points in one place).
6. **Journey cards.** One `travel.choose`, idempotent per journey (natural key and request key), rolled from the journey's stored seed, the result stored on the journey and shown on the arrival modal (ADR 0025).
7. **The Monday draw and resolution.** In the city-day boundary transaction as suggested; momentum by faction on the `issues` document (`$inc` in the action's transaction, guarded by `status: 'live'`), contributors in `contributions` rather than an embedded map (it grows with players) (ADR 0029).
8. **Battleground and Groundswell.** State on each district document, set at the boundary, read in the action's snapshot (ADR 0027).
9. **Tickets.** `fare(modifiers)` in rules with its lines; the Tram Subsidy and the Fare Hike are `ticketPct` sources of the origin city (ADR 0030).
10. **Testing time.** `POST /api/test/journey { arriveNow }` and `advanceTo { weekday: 'monday' }`, plus dev-panel buttons (§8.6–§8.7).
11. **The count page.** `CapitalCountView` built from the five counted elections; the scoreboard table is the snapshot stored at the count (§10.5).
12. **Playtest report.** §15.2. Dwell is measured from the journey's own timestamps (closed within two minutes of arrival, a card answered before it) rather than from request telemetry, which the game does not keep.
13. **The QA vocabulary test.** Allowances for *Garrison Hill* and *the war*; rule and Issue names exempt (§12.5).
14. **The nation map is `CityMap`.** Yes, with the label pin style, the `restFocus` centring and the *Cities* list; free zoom as the city maps (§23 #1).
15. **The overview and the district view.** Yes: `CityMap` on the capital with the whole frame and five district pins; the district view with the district's frame and only its pins; the open district is client memory, the station district on arrival.
16. **No `job` actions.** Confirmed: three Jobs-card entries, the wage paid from anywhere.
17. **Journey card rows.** The server returns the chance per choice; the client prints the odds word and the stat; the Partial reason names the destination city's training place.

---

## 22. Questions

### 22.1 For the game designer (each has a default so the build doesn't wait)

1. **The Rested cap: whose?** Default: base + the **residence** city's ordinance and Issue effects + the room while it runs (wherever the player is). So *Fever at St Agnes* raises the cap for Irongate residents, not for visitors, and a room helps on any night it runs.
2. **The parcel pays 100 Iron** (50 + 50) while §3 says a card pays at most a 10-Energy action's worth, stated as *40 Iron* (a 10-Energy action pays 20). Default: build the parcel as written and do not enforce an Iron cap; please confirm the parcel or the cap.
3. **`roomPct`.** *Eviction Notices* halves the room, which needs a second new effect kind beside `ticketPct`. Default: add `roomPct` (bound −50…0).
4. **Two sources of one kind** (an ordinance and an Issue effect, or two Issues). Defaults (ADR 0030 §2): Energy deltas and chance bonuses add; percentage shares (pay, Iron, Party XP) are each their own line on the base; opinion, ticket and room percentages multiply (tickets never below 5 Iron); Rested cap deltas add; *every win counts twice* and seniority take the larger, never ×4.
5. **The hero's level bracket**: the level at the contributor's last contribution of the election. Default as stated (no read of characters at the count).
6. **The visitor's paper**: the Herald when the edition is printed in Irongate or on a train to it. Default as stated.
7. **Irongate's council hall** for the election screens' header (review 3 §6.1): which painted building, and its name? Default until answered: the Parliament dome (0.53, 0.30), *the Council Chamber*.
8. **Ballot +0.5 at home** is a ledger row but not a contribution (it does not make a City Hero). Default as stated.
9. **Points on a Partial** for an odd Energy (3 → 1.5): default rounded half up (2).
10. **Points use the content Energy**, not a reduced cost (Rally Permits' 10-Energy speech still adds 12). Default as stated, the same rule as rewards (ADR 0021).
11. **Cards and the capital's bonuses**: a card's opinion and points are fixed amounts, untouched by *close race*, Issue or Comeback factors. Default as stated.
12. **Moving between two districts** costs 500 Iron and the seven days like any move, and withdraws a candidacy filed in the old district. Default as stated.
13. **A hero who does not live there**: a visitor who moved Eastside most is its hero. Default: any contributor.
14. **The Irongate city card's line**: content says *Capital · 5 districts · contested*, the screens a live *two close races today*. Default: live.
15. **Groundswell in home cities**: not built (a home faction never loses control below its floor, and morale states cover neglect). Default: districts only.
16. **Herald stand-ins**: the Herald's slice-1 kinds not written out in §12 (welcome-resident aside) and the home papers' Issue, hero, quoted and moved-away texts use the stand-ins named in design §12, marked `TODO(game-designer)`.

### 22.2 For the user (short; defaults in bold)

1. **Free zoom on the nation map, the overview and the district views**, the same as the city maps (your direction; the slice-4 design and GDD §14.10 still say "no free zoom" and the designer will align them). **Yes.**
2. **Clouds on the nation map** as well as Irongate, if the frame check passes. **On.**
3. **Playtesting the capital locally** needs Level 10, Rank 2 and Rank 3 quickly: the dev panel's *Level 10*, *Boost me* and *Live in…* do it. **Use the panel; no change to the operator script.**

---

## 23. Notes on the design documents (for the designer)

1. **Zoom.** `slice-4-battleground.md` §2.1 (*Drag, no free zoom*), §4.2 (*there is no free zoom*), `slice-4-screens.md` §2.1 and GDD §14.10 (*cannot zoom freely*) predate review 3, which gave the city maps free zoom (GDD §14.13, `review-3-answers.md` §1) and was built in `dbabf40`. This design follows review 3 and the user's direction for all three pictures.
2. **`roomPct`.** Design §9.5 says the deck needs one new modifier (`ticketPct`), but *Eviction Notices* (*Rooms in Irongate −50 %*) needs a second.
3. **The card's Iron cap.** §3 says a card pays at most *40 Iron*, which is twice a 10-Energy action's Iron (20), and the parcel pays 100.
4. **Where you are inside Irongate.** Design §5 says the player's `districtId` changes with the tram; GDD §14.13 and design §17 Q15 say the district is client memory, not a server fact. This design takes §14.13: registering names the district and needs only being in the city.
5. **`currentCityId` becomes null in transit** (design §2.4) — implemented as the existing `cityId` plus `journey.status`, with the same meaning for the player.
6. **The Irongate table** in design §4 says *Council … cycle offset 0 (§9)*; the council is §8.
7. **The capital's council hall** for the review-3 election header is not designed (§22.1 Q7).
8. **Journey arrival as a job.** The plan (§2 rule 2) names journeys arriving as a scheduled event; design §2.4 says none is needed. Both are honoured (ADR 0025).
9. **The result route.** Screens §8 names `/council/result`; slice 3's Deviations kept `/council/count`. This design keeps `/council/count` with a district switcher.
10. **The Rested cap with a room** (§7.4) and **the cap's city** after travel are not stated (§22.1 Q1).


---

## Deviations (as built)

The smallest working change in each case; no GDD number changed. Phases A (T1–T12) and B (T13–T20) are summarised from their notes; phase C (T21–T27) in full.

**Running it**

- Playwright: `travel.spec.ts` and `capital.spec.ts` run in their own projects, `travel` and `capital`, after `dev-panel` (the capital moves the shared clock by cycles and to a Monday). `travel.spec.ts` holds the first trip, the user's district lock, the nation map at five sizes, the capital's maps (overview and five districts) at four sizes and the journey's fold on 375 × 667.
- The e2e does not read *The Train Is Open* (stored at the settlement that crosses Level 10, which a hook-set level does not cross) or *{faction} Owns {issue}* (it needs Issue points; the server's Issues tests cover it): `capital.spec.ts` checks Monday's Issues section with *New this week* instead.
- The dev panel's *Live in…* lists the districts the status sends (no district names in the client), plus *Home*. New README sections: the slice-4 hooks, the panel's buttons, a walk-through of the first trip and a move, and the battleground report.
- `pnpm report:playtest` gains the battleground section (`packages/db/src/battleground.ts`, a pure builder with fixture tests). Moves and rooms come from request logs (seven-day TTL: run it within a week); the first Level 10 and Rank 2 times from action logs; "before slice 4" for contention is the first journey's boarding.

**The user's district lock (3 Oct 2026; `slice-4-screens.md`, last section; GDD §14.9, §14.13 row added)**

- The capital's overview shows the five districts as **outlines with their names** and no place pins; a tap (outline, name or the *Districts* list) goes straight into the district. Screens §5.1's district pin with its card (*Go to … · tram · instant*) is gone from the overview; `DistrictCard` is built and tested but unused.
- Inside a district the outline is drawn, the picture outside it is dimmed (ink 50 %), only its pins show, and the view is held: no zooming out past the district's at-rest view (`CityMap lockToFrame`: the free zoom's minimum is the fitted scale) and a drag, at rest or zoomed into a place, stops at the frame plus `REST_PAN_MARGIN` (10 %).
- Content: `Quarter.district.outline` (11–19 points per district, read off the capital's survey image and the stills). The loader checks the anchor and every pin inside their district's outline and no two outlines overlapping (a 200 × 200 grid and every vertex); failing fixtures for both. The bottom band and the rail yards west of the station are outside all five.
- `CityMap` gains `outlines`, `onOutline`, `focusOutline`, `lockToFrame` and the pin style `name`; the SVG of outlines and mask sits in the art layer above the tiles (their z-index is their level).

**One mounted map, one movement**

- The overview and the districts are one mounted `CityPage` (the district route `/city/$cityId/$quarterId` is a child whose component renders nothing) and one `CityMap`. A frame change (in, out, or by tram) restates the view on show in the new frame's layer, then eases to the new view on the zoom's curve (`ZOOM_MS`), instead of the 180 ms cross-fade §12.3 allowed; reduced motion cuts. `memoryKey` changes with the district and each keeps its own memory; overlays that appear with a new frame are observed and measured again.

**The ground sash (slice-4 screens, 3 Oct 2026)**

- The place sheet had no header art, so the sash needed one: `LocationView.art` (the server's `pickArt`, the result's own ladder: a scene for the kind, else the map crop at the pin) and a 104 px (128 px from 640 px) art band at the top of `LocationSheet`, in every city, with the sheet's handle over it. The sheet's tickets start 104 px lower.
- `pickArt` now takes a headquarters' scene from the location's own party (`location.factionId`), so the capital's Union House and Vanguard House show their party's scene (§13); unchanged at home.
- The sash is client-drawn (`GroundSash`, `groundOf`): the leading party of the place's shares (the district's in the capital, the city's at home), *Contested* (grey, no crest) on a close race or a tie at the top, a headquarters always its own party. Ink text on the ochre and the grey, paper on the oxblood and the slate. It is on the place sheet, the result modal (the stamp moves left) and the arrival modal (the arrival's district, from a `city.get` of the destination once arrived).

**Screens**

- **City | Nation** floats on the map (a phone: bottom left above the orders, mirroring the Places pill; from 640 px: top right beside it) rather than in a top bar, so the map keeps its height; the nation map's "top bar subtitle" is a caption card, *Cities of the republic · Coalport · home* / *On the train to Irongate*.
- A label pin near the right edge carries its label on its left (Irongate on an upright phone); a district's name slides along the edge to stay on the map.
- **A phone's district plate** is one band: *‹ Irongate* · the district · *Where you live* in the corner (a tap opens the residence card in a sheet, whose Register opens the §6.2 sheet: one tap more than §6.1 on a phone). From 640 px the corner keeps Reputation and the card sits in the corner panel with the tram bar, the Election card and the orders. On a phone the district view drops the Today strip under the tram bar (it stays on the Me tab and from 640 px). The tram bar is in the corner panel on wide screens, not the side sheet's header.
- At home the residence card shows only when the player lives elsewhere (the way back); living at home there is nothing to do.
- The Places list's *Issue* mark is visual only: the rows' accessible names are unchanged (the slice-3 specs name them).
- The journey screen is the client route (`routes/journey.tsx`) from `JourneyProgress` and `JourneyCard`; on desktop it is the 640 px column on ink, without the dimmed nation map behind. A journey card's content `detail` already names the stat, so a row prints the odds word, then the detail (the stat only when the detail lacks it).
- The arrival modal is `ResultModal` kind `journey` with `onContinue` / `continuePending`; Escape is Continue. A card answered on the way is the modal's body line; answered in the modal, its outcome stays there. `travel.close` lands on `/city/irongate/irongate.station-market?loc=irongate.central-station`.
- Screens §5.2's plate in the capital and §8's grouped candidates are built in the client route and in `DistrictResultTable`; `Plate` and `CountTable` are unchanged.
- *Where to act* goes to the Issue's district (or city) with the Places list open when the player stands there, else to the nation map at that city's card (`/nation?city=`).
- The capital's result uses `council.capitalCount` (phase B's procedure) for a capital resident; `CapitalCountView.hall` was added for the City Hall header.

**Views and server (phase C)**

- New view fields: `CharacterView.factionNames` (every party's short name, from content: the three-way tables, the sash and the Issue lines), `LocationView.art`, `DistrictView.outline`, `IssueRowView.blurb` and `stances` (the opened row), `CouncilSeatView.districtName` (the seat grid's captions), `PaperView.headlines[].medal` (the hero's rosette), `ElectionCardView.result.district` (*Eastside went Collective, Vanguard* and the capital's ten by party, with the district's turnout), `CapitalCountView.hall`.
- **The Election card's *Registered* state** also covers a registration made before this cycle's polls open (today < `votesFromDay`), not only one whose first polls are next cycle's: the e2e found a day-0 registrant reading *Candidates are putting their names in*. Its second line takes the summary's `pollsFromWeekday` (this cycle's or the next's).
- **Monday's paper:** `issue-resolved` and `issue-lapsed` (city 0) outrank `issues-drawn` (now city 1) in the Herald and the home papers (the main session's decision); `slice-4-battleground.md` §9.6 records it and the content test reads it.
- The capital's branch proposals on the order paper read *the {faction}'s proposal · {secretary}*.
- *How elections work* in the capital is a note of its own (`copy.help.capitalElection`: ten seats, two a district, every party on every list, the score's mix in words, six of ten), restating design §8; text for the designer to confirm.
- The Me tab reads `character.me` fresh before it renders (an action's character view carries no hero, heroes or scoreboard, so the cached view lacked the scoreboard line until a reload; the slice-1 *reload shows the same Me* check caught it).
- The parties' table prints the opinion share among the three parties in points (the count stores it as a fraction).

**For the game designer**

- The slot C orders shared by both residences (`residence: 'any'`) name the home city in their titles (*Five attempts anywhere in Coalport*) while their match (`cityId: 'home'`) now means the residence city, so a capital resident reads Coalport for work counted in Irongate. A `{city}` placeholder (resolved at read like `{issue}`) or residence-neutral titles would fix it; not changed here (player text).

**Clouds**

- The nation and Irongate keep `clouds: true` (content had both on). Frame check (§13, the method of maps v3 §12: a Pixel 7 profile at 390 × 844, CPU 4 × slower, the 14 day sprites loaded): the nation map 60 fps at rest and 60 fps during a drag, Irongate's overview the same, no frame over 25 ms in either (241 / 181 and 240 / 180 frames). Both stay on.

**Phases A and B (from their notes)**

- Art: the capital's and the nation's stills raised the whole set's cap from 12 to 13 MB (ADR 0015's budget, recorded in phase A).
- Vocabulary: the allowances were cut to one, *fever ward* (St Agnes); the Hill's *ward*, Parliament's *division*, the committees' *motion* and the Opera's *by ballot* were reworded instead.
- `council.capitalCount` is its own procedure (§8.1 said `council.count` with a cycle key).
- A journey card's result (`JourneyCardResult.journey`) carries its journey with `card.chosen = null`; the client folds the result back in.
- Placeholders with digits and `{faction}` / `{district}` in stored Herald lines were fixed in phase B.
