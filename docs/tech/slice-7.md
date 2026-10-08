# Slice 7 — The nation: technical design

| | |
|---|---|
| **Goal** | The ladder above the council, and a republic with a government on day one. **Governors and the Mayor** are chosen at the council count from councillors with a completed term; they set the rule voted on first and make one Address a term. **A Faction Chair** is elected every 28 days (the secretary is always on the ballot). The Chair sets **standing Party orders** with one **push** to a battleground and the party's target, **the party line** on every bill, **the party's rule** per council, tomorrow's fixtures and events in any open city. **Parliament** always sits: sixty seats, **local deputies** voting by a computed chain, bills on a three-day vote, **laws** as a third source of bounded effects (at most five in force), the veto and *vote it through anyway*. **The national election** runs every term: names in, the party's pick, the republic's vote, a score that is half ballots and half **who holds the republic** (National Control, 40 / 30 / 10 / 10 / 10), D'Hondt for sixty seats, the President. **Clearwater** opens as the second battleground (one meter, seven seats, three-way). **Petitions** dissolve a council; Parliament can **remove the President**; members can **remove the Chair**. Every act is one tap and settles at a boundary; nothing requires being online at a set time |
| **Question** | **Does holding office feel powerful, and does losing it make players want to fight back?** |
| **Builds on** | Slices 0–4 as built on branch `slice-0` at `5d27adb` (the slice-4 fix round), **slice 5 as designed** in `docs/tech/slice-5.md` (being built now) and **slice 6 as designed** in `docs/tech/slice-6.md` (built next). Where this document leans on a slice-5 or slice-6 name (`heat`, `held`, `addHeat`, `runInChance`, `caughtChance`, `bailFor`, `walkOut`, `liveMarks`, `missionTarget`, `campaignEvents`, `eventSignups`, `ensureFixtures`, `fixtureFor`, `chatMessages`, `channelsOf`, `contributions` faction scopes), it is that design's name. If either slice's Deviations rename something, T11 follows the rename |
| **Design inputs** | `docs/design/slice-7-nation.md` (*design §n*) · `docs/design/slice-7-screens.md` (*screens §n*) · `docs/economy.md` §21 · GDD §1.5, §2, §3.3, §6.5, §13.7, §14.1, §14.4, §14.6, §14.8–§14.11, §15.1–§15.10, §16.2, §16.3, §17.1, §17.3, §18.3, §21.4, Appendix C #2, #8, #26, #40, #64–#73 · `docs/IMPLEMENTATION_PLAN.md` · ADR 0002, 0008, 0009, 0017–0023, 0026–0030, 0033, 0036, 0037, 0042 |
| **ADRs** | [0043 the nation's day and the term](../adr/0043-nation-day-term-calendar-and-the-republic-document.md) · [0044 laws as a third source](../adr/0044-laws-a-third-modifier-source.md) · [0045 Parliament](../adr/0045-parliament-bills-slots-and-computed-local-deputies.md) · [0046 the faction document and the Chair's orders](../adr/0046-faction-document-chair-standing-orders-and-push.md) · [0047 elections above the council](../adr/0047-elections-above-the-council-reuse-the-box.md) · [0048 offices and the ladder](../adr/0048-offices-on-office-terms-and-the-ladder.md) · [0049 petitions and removals](../adr/0049-petitions-dissolution-and-removals.md) · [0050 Clearwater](../adr/0050-clearwater-single-meter-battleground.md) |
| **Defaults taken** (design §21, pending the user) | **One office at the top, the President**, no Chancellor · **the secretary on every Chair ballot and the party's own figure on every pick** · petitions **dissolve** the council (no snap election) · **the secretaries table bills** for parties with no player Chair or deputy · Clearwater's baseline **evened to 22 / 22 / 22 / 34** · **The Front a teaser** · **several offices at once** allowed |
| **Environment** | **Local only** until the end of the project. Everything is played in `pnpm dev:mem` with the dev panel (§8.7). A 28-day term is played on the test clock (`POST /api/test/term`, §8.6). No hosting work |

Every number below is a GDD, design or economy number. Where the design leaves a point open, this document states a default and lists the question in §22.

---

## 1. Scope

**In**

- **The term calendar** (design §2): `termDay = (dayKey − TERM.epochDay) mod 28`, a pure function; the Chair's windows (days 9–14) and the national windows (days 19–27, office at day 0); the bootstrap government.
- **The Governor and the Mayor** (design §3.1): chosen at the count (home, the capital, Clearwater), *Local* when nobody qualifies; **the Governor's rule** (days 0–1, at no cost) and **the Address** (+50 momentum, once a term); 20 PC and 30 FXP a boundary.
- **The Faction Chair** (design §4):
  - the election: names in, two backers (the secretary's backing as slice 3's), the vote with **the secretary on the ballot**, the count;
  - **standing orders** (three picks that repeat), **the push** to a battleground with **the party's target** (25 / 50 / 100) and its +10 Party XP;
  - **the party line** on every bill; **the party's rule** per council; **tomorrow's fixtures**; **calling events in any open city** without a role; **the Officers channel**;
  - **a vote on the Chair** (automatic on entering Unrest, or by petition); 20 PC and 40 FXP a boundary.
- **Parliament** (design §5): sixty seats, local deputies by the chain, the order paper (three bills plus the President's), tabling (deputy, Chair, President, the secretaries), the three-day vote, 31 / 36 / 40, the signature day, **the veto** and the override, striking out, the five-law cap and the replacement, the failed-bill week, the lapse at day 0.
- **Laws** (design §7): the catalogue of thirteen as content, a closed effect DSL with seven new kinds, `appliesTo`, the law book, *LAW* tags on tickets and lines in result modals.
- **The national election** (design §6): names in (President with two pledges, the party's list), the party's pick with **the party's own figure** on the ballot, the republic's vote, backing, the score with its turnout weight at thirty ballots, D'Hondt for sixty seats, the lists, the provisional day, office at day 0, two terms in a row.
- **National Control** (design §8): the weighted snapshot at every boundary, *leads the republic*, the nation map's bar; **control's Heat rule** (+25 % for rivals of the controlling party) in the capital's districts and Clearwater.
- **Clearwater** (design §9): the city (three quarters, The Front a teaser), nine places, 24 tier-1 actions, three jobs, a room, four missions, the council of seven (D'Hondt, four of seven, the Casino), nine local candidates, six Issues, *The Clearwater Courier*, the train open.
- **Petitions and removals** (design §10): a petition to dissolve a council; a vote to remove the President (a player's motion or the clerk's); a vote on the Chair; **the Town Hall** event (GDD §16.3's seventh) with its signatures.
- **The paper** (design §11): *FROM THE CAPITAL* / *THE REPUBLIC*, personal lines, the Courier, the front pages for every office.
- **Ambition chapter 3**, *The deposit*, and `keep.deposit-receipt` (design §13).
- **Art**: three portraits and three scenes (new), `scene.parliament` catalogued (§13).
- **The dev panel and test hooks** for a term on the test clock, and the playtest report's **nation** section.

**Out** (§19): ministers and the Speaker, the 24-hour audit (slice 9), Legacy and the Season rollover of laws (slice 8), The Front's places, the candidate's CHA and Legacy appeal on the national score (slice 8), faction switching, a second fixture at the Chair's hour, the coast line, deployment.

---

## 2. Decisions at a glance

| Question | Decision | Where |
|---|---|---|
| The term | `TERM = { days: 28, epochDay: 20_458 }` in rules (Monday 5 January 2026, `WEEK.mondayEpoch`), so term day 0 is always a Monday. Every national and Chair phase is a pure function of the day key. The epoch is code, not configuration; moving it is a migration | ADR 0043, §6.2 (Q1) |
| The nation's state | **One `nation` document** (`_id: 'republic'`): the calendar guard (`world.settledDay`), the sitting government, the day's National Control snapshot, the laws-in-force projection and its 60-day history, and the national lines of the last 14 boundaries. Read once per request (it carries the laws every act needs); written by the nation's day (and one guarded field by a removal's tabling) | ADR 0043, §5.1 |
| The nation's day | `settleNationDay` processes every boundary since `nation.world.settledDay`, one transaction per boundary, **after every city has settled that boundary** (it reads their drifted meters and morale). The `nation-day` Agenda job (00:02 UTC and at worker start) is primary; `ensureNationDay` on the read path is the guarantee. No per-bill or per-election job: every division, close and count is at a boundary | ADR 0043, §9 (Q3) |
| Bootstrap | The first `settleNationDay` installs the government of the current term: the seeded draw's party figure as President, sixty local deputies at 20 / 20 / 20, no player Chair, the three `factions` documents. **A window runs if it opens on or after the bootstrap day**; a window already open at the bootstrap is skipped and the acting holder continues | ADR 0043, §22.1 Q18 |
| Laws | A **third `ModifierSource` kind**, `law`, gathered with the ordinance and the Issue effects. A law effect carries `appliesTo: 'all' \| 'members' \| 'others'`, filtered per actor. `LAW_BOUNDS` in rules; the loader refuses `fxpPct`, `chancePct` and any kind not in `LAW_BOUNDS`. Day-constant, except the Curfew's night window, which is read at the act's time | ADR 0044, §6.6 (Q5) |
| The law book | **`laws`** collection (one row per law in force, with its end and why it ended) plus the projection on `nation.laws` that the read path uses. `lawsOnDay(projection, day)` is pure, so a wage day, a fade or a Heat day in the past takes that day's laws | ADR 0044, §5.6 |
| Bills | **`bills`** collection, **votes embedded** (at most sixty, public, read with the bill), the Chairs' lines embedded. **Slots by natural keys**: `slotKey` (three regular slots), `weekKey` (the President's week), `tablerKey` (once a term per member) and `lawId` (one bill per law on the paper), each a unique index partial on `status: 'voting'` where it must free up | ADR 0045, §5.5 (Q2) |
| Local deputies | **Never stored per deputy.** Each bloc's local vote is computed at the division: the majority of its player deputies who voted → the Chair's line → the secretary's line; abstain while the party's home city is in Unrest. The division stores each bloc's vote and the reason | ADR 0045, §6.5 (Q4) |
| The signature day | The division (boundary into `t + 4`) sets `awaitingSignature`; the next boundary enacts unless the President vetoed. The veto writes the bill filtered on `awaitingSignature`, so it serialises with the enactment | ADR 0045, §3.2 (Q12) |
| Faction state | **One `factions` document per faction**: the Chair's projection, the standing orders (`current` and `next`, each with `fromDay`), the party's rules per city, tomorrow's fixtures, the push results of the last 14 days, the secretary's bill pointer. Written by the Chair's acts and the nation's day | ADR 0046, §5.2 (Q2, Q8) |
| Standing orders | Picks are **order families** (a new `family` on rotation templates), resolved per member to their residence's template of that family, else the residence's rotation. The push replaces slot A or B with the faction's **push template** (`use: 'push'`) at the battleground for Level 10+, at the residence below. Frozen into the member's orders at their settlement (ADR 0009) | ADR 0046, §6.7 (Q8) |
| The party's target | Each matching attempt `$inc`s **the member's own** `contributions` row (`push\|{f}\|{day}`) in the action's transaction: no faction-wide hot document. The live bar is a `$group` over the scope; the nation's day stores the day's result; the member's settlement pays +10 Party XP | ADR 0046 (Q8) |
| Elections above the council | **Reuse `candidacies` and `votes`** (ADR 0019's numbered box) with new election keys (`chair:{f}:{term}`, `pick:{f}:{term}`, `nation:{term}`, `confidence:…`). New: **`factionElections`** (the Chair's ballot and the votes on the Chair) and **`nationalElections`** (one per term: the three picks, the frozen candidates, the count). Every vote `$inc`s its election's counter filtered on the open status (ADR 0018) | ADR 0047 (Q2) |
| Backing | Backers are public on the candidacy (`endorsements[]`); the one-per-election guard is a new `termBackings[]` on the character (separate from the council's `endorsementsGiven`, which is pruned too fast for a 28-day window) | ADR 0047 |
| The national count and office | Two transactions on two days: **the count** at the boundary into term day 27 (scores from that boundary's control snapshot, D'Hondt, lists, provisional), and **taking office** at day 0 (the President's and the player deputies' `officeTerms`, the old bills lapsed) | ADR 0047 (Q3) |
| Offices | `officeTerms.office` += `governor`, `chair`, `deputy`, `president` (absent = `council`), same `completed` and `vacatedDay`. **The ladder is a count of completed terms by office**; stipends generalise `stipendBoundaries` per office; the character's `offices[]` projection gains the kind | ADR 0048 (Q2) |
| The Governor | Chosen **in the count's transaction** (`governorOf`, pure); a `governor` term with the council's key; `cities.council.governor` projection. The Governor's rule is **added as item 1** (ahead of the party's item, §22.1 Q7); locals of the Governor's party with no player lead vote for it | ADR 0048, §6.8 (Q9) |
| The party's rule | `factions.rules[cityId]`, falling back to `faction.branchMotion`; written into **the next** order paper at its count (§22.1 Q8) | ADR 0046 (Q9) |
| Petitions | **`petitions`** collection (dissolve and Chair kinds), signatures embedded with a set-once guard; the opening is unique per open petition; **closed by the city's boundary before the division** (dissolve) or by the nation's day (the Chair's) | ADR 0049 (Q10) |
| Dissolution | The council's terms get `vacatedDay` (not completed), the order paper `dissolved` (no division), the rule in force struck (`toDay` cut), the Governor's chair to the bloc's top local; no new seats until the next count | ADR 0049 |
| Removal of the President | A bill of kind `removal` (40 of 60); the clerk's automatic motion when **the party's control share** is under 25 % (§22.1 Q11); passing replaces the President **at the division** with the runner-up | ADR 0045, 0049 |
| Clearwater | A **single-meter battleground on its `cities` document** (opinion, state, Groundswell, state log); the capital's count and division **generalised by parameters** (`countBattleground` with seats 7 and lists of three; `divideBlocs` with four of seven); `processBattlegroundBoundary` | ADR 0050 (Q7) |
| Control's Heat rule | A place factor (not a law): `heatGainPct` +25 for a rival of the party controlling the district or Clearwater, on missions and events at the place | ADR 0050 (Q7) |
| Town Hall | A seventh event type with `special: 'petitionSignatures'`; at resolution, the city's open dissolve petition gains 3 / 2 / 1 / 0 signatures in the same world transaction | §6.9 (Q11) |
| The paper | National lines are **facts written by the nation's day** to `nation.news`, selected live (two a day); personal lines are stored at the settlement from the member's facts, as slices 3–6 | §11 |
| Routes | `/parliament`, `/parliament/bill/$billId`, `/parliament/laws`, `/office/governor/$cityId`, `/office/president`, `/faction?tab=chair` (the desk; `/office/chair` redirects), `/faction/election…`, `/election/pick…`, `/election/national…`, `/council/petition` | §12.1 |
| Jobs | `nation-day` (new); `city-day` extended (Clearwater, the Governor, the petition close, the divide chain, the Chair's fixtures and rules) | §9 |

---

## 3. The order of play, time, and the flow

### 3.1 The term calendar (pure, `term.ts`)

`termOf(day) = { index: floor((day − 20_458) / 28), termDay: (day − 20_458) mod 28 }`. Term *n* runs `[20_458 + 28n, 20_458 + 28(n + 1))`. A *boundary into day d* is processed by the cities first, then the nation.

| Boundary into term day | The nation's day does (in this order) |
|---|---|
| **every** | (1) the National Control snapshot from the five cities as settled for *d*; (2) the push results of day *d − 1* per faction; (3) petitions on the Chair closing at *d*; votes on the Chair counting at *d*; the automatic vote on the Chair when the home city entered Unrest at *d*; (4) divisions due at *d*; enactments due at *d* (signature day passed); (5) the term-day work below; (6) on a Monday: the President's slot for a party figure, then one secretary's bill; (7) the clerk's motion to remove the President when its trigger holds; (8) `nation.news` for *d*; `world.settledDay = d` |
| **0** | **Take office**: the counted national election of term *n − 1* seats the President (`president` term) and the player deputies (`deputy` terms); the old President's and deputies' terms complete; open bills of term *n − 1* lapse; `nation.government` and `nation.term` move. With no counted election (bootstrap), the government carries over |
| **9** | Open the three Chair elections (`factionElections` `chair:{f}:{n}`, status `names`) |
| **11** | Close the Chair's names: candidacies without two counted backers are struck (deposit due back); the ballot is frozen (players + the secretary) → `voting`; no player standing → `void` |
| **14** | **The Chair's count**: the winner's `chair` term from day 14 to the next term's day 14; the previous Chair's term completes; `factions.chair` moves; a change of Chair clears the standing orders, rules and fixtures (§22.1 Q22) |
| **19** | Open the national election (`nationalElections` `nation:{n}`, status `names`) |
| **21** | Close names → open the three picks (each faction's ballot: its President candidates + its figure; no player candidate → the figure stands without a vote) |
| **23** | Count the picks; freeze the three candidates → `voting` (ballots and backing open) |
| **27** | **The national count** (provisional): scores, President and runner-up, D'Hondt for sixty, the lists, the seats; nothing changes in office until day 0 |

The council's five-day cycle is unchanged (Clearwater's offset 4). The city's boundary keeps its order (ADR 0017, 0027) with three additions: **the petition close before the division**, **the Governor at the count**, and the Chair's rule and fixtures read from `factions`.

### 3.2 A bill's life

```
parliament.table (one transaction; request key; ADR 0045)
  refusals (§7.2) · the tabler's office re-read from officeTerms in the session · term day ≤ 23
  insert bills { kind, lawId, needed, tabledDay t, divideDay t + 4, status 'voting',
                 slotKey 'r{1|2|3}:{n}' | weekKey 'president:{n}:{weekDay}' | 'override:{billId}' | 'clerk:{n}:{t}',
                 tablerKey '{characterId}:{n}' (players) }
        ← unique slotKey / weekKey / tablerKey (partial) and lawId (partial: a voting law bill) refuse a race;
          E11000 on slotKey retries the next free slot, then PAPER_FULL
  character: pc − 50 (a deputy or a Chair), version guard

days t … t + 3  parliament.vote   bills.updateOne({ _id, status: 'voting', 'votes.characterId': { $ne: me } }, $push votes)
                chair.setLine     bills.updateOne({ _id, status: 'voting' }, $set lines.{f})

boundary into t + 4 (the nation's day)
  divideBill (pure): each bloc's players as voted, its locals by the chain → For / Against / passed
  law      passed → 'awaitingSignature', inForceFrom t + 5      failed → 'failed' (the law waits seven days)
  strike   passed → the law's `toDay` becomes t + 5 ('struck')  failed → 'failed'
  removal  passed → the President replaced now by the runner-up  failed → 'survived'
  override passed → 'awaitingSignature' with no veto possible

day t + 4       parliament.veto (the President, once a term)
                bills.updateOne({ _id, status: 'awaitingSignature', vetoable: true }, 'vetoed') + insert the override bill
                (divideDay t + 8, needs 40) when it can divide by the boundary into term day 27, else the veto is final

boundary into t + 5
  'awaitingSignature' → 'inForce': laws insert { fromDay t + 5, toDay t + 5 + days }; the named (or, at the cap, the
  soonest-ending) law ends at t + 5; nation.laws projection; pledges kept; nl.law-in-force
```

Tabling is open on term days 0–23, so every bill divides by the boundary into day 27 and nothing is divided on day 27 (design §2). A bill divided into day 27 is signed or vetoed on day 27 by the outgoing President and comes into force at day 0.

### 3.3 The national election's life

```
day 19–20  nation.standPresident (100 PC, two pledges, a platform line) · nation.standList (25 PC)
           nation.withdrawPresident (refund 100, days 19–20 only)          → candidacies kind 'president' | 'list'
boundary into 21  status 'pick'; per faction a ballot: its President candidates by filing + the figure ('n:{figure}')
day 21–22  nation.pickVote (Rank 2+, own faction)                          → votes 'pick:{f}:{n}', $inc picks.{f}.ballots
boundary into 23  countPick per faction → the three candidates frozen; losers of a pick move to the list; status 'voting'
day 23–26  nation.vote (Rank 2+, any of the three)                         → votes 'nation:{n}', $inc ballots
           nation.back (10 PC, once a term: own candidate or a list name)  → candidacy.endorsements, termBackings
boundary into 27  countNation: scores (control from this boundary's snapshot), President, runner-up, D'Hondt, lists
                  → status 'counted' (to be confirmed tomorrow)
boundary into 0   take office (§3.1) → status 'seated'
```

### 3.4 The Chair's term

```
day 9–10   chair.stand (25 PC) · chair.back (10 PC) · the secretary's backing when the member's orders are done
boundary into 11  close: struck without two counted backers (deposit due back); ballot = players + the secretary
day 11–13  chair.vote (Rank 2+, from anywhere)                             → votes 'chair:{f}:{n}'
boundary into 14  countChair → the Chair from day 14; factions.chair; the desk opens
day 14 → next term's day 14
           chair.setOrders → factions.orders.next (fromDay tomorrow)      chair.setLine / setRule / setFixture
           chair.callEvent (any open city, no role)                         petition on the Chair (days 19 … 24 of the 28)
           Unrest at home → the automatic vote on the Chair (once per Chair per term)
```

### 3.5 Time and the lazy state

| State | Stored | Read | Ends |
|---|---|---|---|
| The term and its phases | — | `termOf(dayKey(now))` | pure |
| The laws in force | `nation.laws.inForce`, `history` (60 days) | `lawsOnDay(projection, day)` | at `toDay` (expiry by the calendar: no write), or a strike, a replacement, a renewal |
| The Chair's standing orders | `factions.orders.current`, `next` (each with `fromDay`) | `standingOn(faction, day)`: `next` once `day ≥ next.fromDay` | replaced by the Chair; cleared at a change of Chair |
| A member's orders for the day | `characters.orders` (ADR 0009), now with the push's place on an item | frozen at the member's settlement | the boundary |
| The party's target | `contributions` `push\|{f}\|{day}` (one row per member) | `$group` sum on read (the desk, the Orders panel) | the nation's day stores `met` on `factions.pushDays` |
| Office stipends | `officeTerms` (`fromDay`, `toDay`, `vacatedDay`) | the member's settlement, per boundary held | the term's end or `vacatedDay` |
| Minor marks under the Rehabilitation Act | `record.marks` (slice 5) | `liveMarks(marks, today, fadeDaysOn)`: gone once any day since the latest mark met that day's fade | monotone: once gone, gone |
| A journey under the Open Borders Act | `journeys.arrivesAt` | — | the minutes are fixed at boarding |
| The Curfew's night | — | `isNight(now)` at the act | 06:00 UTC |
| National Control | `nation.control`, `controlLog` (60) | the snapshot of the last boundary | the next boundary |
| Petition and backer counts | `petitions.count`, `candidacies.endorsements` | live (public) | the close |
| Ballots | `votes` (ADR 0019) | never before the count | the count |

### 3.6 The read order (`loadCharacter` v7)

1. `ensurePlaces` (slices 4–6), Clearwater included when it is the current, residence or job city.
2. **`ensureNationDay`**: one read of `nation` by `_id`. When `world.settledDay < today`, it settles **every** city for today first (five reads when they are settled), then the nation's boundaries. The document is passed on (`LoadedCharacter.nation`): the laws for the modifiers, the term, the government.
3. `ensureRunInSettled`, `ensureReleased`, `ensureEventsResolved` (slices 5–6).
4. `ensureSettled` v7: on a new day, **one read of the member's `factions` document** (the standing orders and the push for the day, the push results to pay); the stipends of every office; refunds of struck Chair deposits; the personal national facts (§11.2).
5. `ensureEventsCredited`, `ensureArrived`, `touchPresence` (slice 6).

With no new day, slice 7 adds **one indexed read** to every request (`nation`), which replaces nothing but carries the laws every act needs. The faction document is read once a day per member, and by the views that show orders.

### 3.7 The flow, and what each step touches

| # | Screen (route) | Procedure | Writes |
|---|---|---|---|
| 0 | any screen | the read path (§3.6) | city days, **the nation's day**, the settlement (stipends, the push bonus, refunds) |
| 1 | Nation map (`/map/nation`), the republic sheet | `nation.get` | — |
| 2 | Me · Offices and the ladder | `office.mine` | — |
| 3 | Governor / Mayor (`/office/governor/$cityId`) | `office.governor`, `governor.setRule`, `governor.address` | `ordinances` (order paper), `officeTerms`, `issues`, `contributions`, `characters`, `requestLogs` |
| 4 | Faction · Chair (`/faction?tab=chair`) | `chair.desk`, `chair.setOrders`, `chair.setLine`, `chair.setRule`, `chair.setFixture`, `chair.callEvent` | `factions`, `bills`, `campaignEvents`, `requestLogs`, `chatMessages` |
| 5 | Faction · the Chair's election (`/faction/election…`) | `chairElection.get`, `.stand`, `.back`, `.vote`, `.result` | `candidacies`, `votes`, `factionElections`, `characters` |
| 6 | A vote on the Chair | `confidence.get`, `confidence.openPetition`, `.sign`, `.vote` | `petitions`, `votes`, `factionElections`, `characters` |
| 7 | Parliament (`/parliament`), a bill, the catalogue, the law book | `parliament.chamber`, `.bill`, `.catalogue`, `.laws`, `.bloc`, `.table`, `.vote`, `.veto` | `bills`, `officeTerms` (the veto), `characters`, `requestLogs` |
| 8 | The party's pick, the republic's vote, the result (`/election/…`) | `nation.election`, `.standPresident`, `.withdrawPresident`, `.standList`, `.pickVote`, `.vote`, `.back`, `.result` | `candidacies`, `votes`, `nationalElections`, `characters` |
| 9 | The President (`/office/president`) | `office.president`, `president.address` | `issues`, `contributions`, `officeTerms` |
| 10 | A petition (`/council/petition`) | `petition.get`, `.open`, `.sign` | `petitions`, `characters` |
| 11 | Clearwater (`/city/clearwater…`) | `city.get`, `travel.*`, `residence.*`, `action.*`, `missions.*`, `council.*` | as slices 1–5 |
| 12 | Paper | `paper.today` | — (stored headlines at the settlement; national lines and windows live) |

---

## 4. Content (`packages/content`)

### 4.1 New and changed schemas

```ts
// The effect DSL (rules owns the kinds and bounds; ADR 0021, 0030, 0044)
EffectAppliesTo = z.enum(['all', 'members', 'others']);
LawEffect = OrdinanceEffect | XpPct | MissionEnergyDelta | JourneyTimePct | RunInPct | InfirmaryCostPct
          | MarkFadeDays | CaughtDelta, each `& { appliesTo?: EffectAppliesTo }`;
//  xpPct { scope: 'missions' | 'actions' } · missionEnergyDelta · journeyTimePct · runInPct { window?: 'night' }
//  · infirmaryCostPct · markFadeDays · caughtDelta { scope: 'againstFaction' }

Law = z.strictObject({
  id: Id,                                        // 'law.eight-hour-day'
  name: z.string().min(1).max(40),               // "Eight-Hour Day Act"
  factionId: FactionId,                          // the party whose law it is (Collective)
  line: z.string().min(1).max(120),              // the one-line text
  effectLine: z.string().min(1).max(60),         // "Job pay +10 % · seniority ×2" (the caps line and the tags)
  effects: z.array(LawEffect).min(1).max(2),
  days: z.union([z.literal(7), z.literal(14), z.literal(21), z.literal(28)]),
  secretaryLines: z.strictObject({ vanguard: LineVote, collective: LineVote, alliance: LineVote }),
});
LineVote = z.enum(['for', 'against', 'free']);

Faction += {
  nationalFigure: z.strictObject({ npcId: NpcId, name, who: z.string().max(90), line: z.string().max(90),
                                   portrait: AssetId }),            // design §6.5
  pickName: z.string().min(1).max(30),            // "the Congress"
  chairPlatforms: z.tuple([Platform, Platform, Platform]),          // design §4.6
  preferredLaws: z.array(Id).min(1),              // design §7.3, in order
  localDeputies: z.array(z.strictObject({ npcId: NpcId, name, who: z.string().max(60) })).length(8),
  house: z.strictObject({ name: z.string(), locationId: Id }),      // "Union House": the Chair's crop (screens §4.2)
};

City += {
  nationalWeight: z.number().positive().max(1),   // 0.40 · 0.30 · 0.10 (design §8)
  council.seats: 7 | 10 (unchanged), council.listSize?: z.int().min(2).max(3),   // three in Clearwater
};
Quarter.opens.edition 'later' may have no location (The Front)

OrderTemplate += {
  family: Id.optional(),                          // the Chair's menu entry this template serves (ADR 0046)
  use += 'push',                                  // the push template: one per faction for slots A and B
  residence: z.enum(['home', 'capital', 'clearwater', 'any']),
};
OrderMatchSchema.cityId += z.literal('push'); OrderMatchSchema.districtId += z.literal('push');

CampaignEventType.special += 'petitionSignatures';  campaignEventTypes: length(7)

HeadlineCondition += NationalCondition;           // §11.2's personal facts
Content += {
  laws: z.array(Law).length(13),
  nationalLines: z.array(NationalLine),           // design §11.1 (the same words in every paper)
  politicsResults += the slice-7 acts (design §12)
};
NationalLine = z.strictObject({ id: Id, priority: z.int().min(0).max(3), headline: z.string().max(80),
                                deck: z.string().max(200), scope: z.enum(['all', 'faction', 'contributors']) });
```

`GameContent` gains: `law(id)`, `laws()`, `lawsOf(factionId)`; `figure(factionId)`; `localDeputies(factionId)`; `nationalWeights()`; `pushTemplate(factionId, slot)`; `families(factionId, slot)` (the Chair's menu: each family's label is its home template's title); `templateFor(factionId, family, residence)`; `nationalLine(id)`.

### 4.2 Loader cross-checks (added)

- **Laws.** Thirteen, ids unique, each `factionId` names a party. Every effect is a kind in `LAW_BOUNDS` with its value inside the bound; **no `fxpPct`, no `chancePct`** (design §5.4). `appliesTo` only on laws (an ordinance or Issue effect with it is refused). A law is **factional** when any effect's `appliesTo` is not `all`, and the design's *Needs* column must agree (31 or 36: the loader computes it, the content test compares the design table). `caughtDelta` only with `appliesTo` absent or `others`. Effect lines ≤ 60, lines ≤ 120.
- **Factions.** `preferredLaws` names laws; eight local deputies each; the figure's portrait is a `portrait`; `house.locationId` is the faction's capital house (`faction-hq` in Irongate).
- **Cities.** The `nationalWeight`s sum to 1.00 (0.40 + 0.30 + 3 × 0.10); Clearwater is `battleground` with `council.offset` 4, `seats` 7, `listSize` 3; its baseline sums to 100 and is the design's 22 / 22 / 22 / 34; `nation.cities[clearwater]` is `service: 'open'` and carries no `baselineOpinion` of its own (the city has one).
- **Quarters.** A quarter with `opens.edition` may have no location; every other quarter has at least one; **the landing** (the quarter holding the arrival pin's station) is not a teaser (§21 #6).
- **Orders.** Every faction has exactly one `push` template for slots A and B, with `match.cityId: 'push'` (and `districtId: 'push'` where it counts doors in a district) and a `{place}` in its title; push templates are never in the rotation. A `family` is shared by at most one template per (faction, slot, residence). Each faction has the Clearwater rotation (`residence: 'clearwater'`): slot A one, slot B two (design §9.1).
- **Events.** Seven types; the Town Hall's roles, Energy (50 in all), base swing 1.2, difficulty 12 / 14, `special: 'petitionSignatures'`; venue rows for the Town Hall in each home city, each capital district and Clearwater, and for the three common events in Clearwater (§22.1 Q5).
- **Clearwater.** Nine places, kinds from the closed list, each pin equal to `mapPins.clearwater`; 24 tier-1 actions (canvass 9, speech 3, propaganda 4, intelligence 5, training 3); three jobs; four missions with the slice-5 shape and `runInPool`; nine local candidates, three per party, profiles 28 / 22 / 16.
- **Issues.** Thirty; six with a Clearwater `where`; `issue.tram-fares` gains its Clearwater entry.
- **Headlines.** The national lines of design §11.1; the personal lines of §11.2 in all five papers; the Courier's political set (§11.3.1) and the rest of its city set; placeholders only from §4.3.
- **Vocabulary.** Both QA guards over every new string. *Parliament, deputy, President, Chair, Governor, Mayor, law, veto, petition, term* pass; *whip, Directive, recall, Legislature, National Control, no-confidence, Chancellor* must not appear in a player string; **`The Front`** (Clearwater's quarter) joins the `front` allow-list beside *the front door* and *front page* (design §19).

### 4.3 Placeholders

| Where | Added | Resolved |
|---|---|---|
| National lines (design §11.1) | `{president}` `{party}` `{seatsV}` `{seatsC}` `{seatsA}` `{scoreP}` `{second}` `{scoreS}` `{successor}` `{month}` `{forVotes}` `{needed}` `{law}` `{lawLine}` `{days}` `{by}` `{until}` `{weekdayPick}` `{leader}` `{leaderShare}` `{secondShare}` `{third}` `{thirdShare}` `{cityMoved}` `{lawsCount}` `{faction}` `{signatures}` `{weekday}` `{name}` `{votes}` `{secretary}` `{secretaryVotes}` `{reason}` `{noVotes}` `{cast}` `{count}` `{target}` `{place}` `{city}` | the server, from `nation.news` facts (`NATIONAL_PLACEHOLDERS` in rules); times as epoch ms for the client |
| Personal lines (design §11.2) | `{city}` `{local}` `{issueShort}` `{hall}` `{backers}` `{winner}` `{yourVotes}` `{ordinal}` `{seats}` `{margin}` `{score}` `{yourScore}` `{pickName}` `{orderTitle}` | the settlement's facts |
| Modals (design §12) | `{until}` `{pollsWeekday}` `{countDay}` `{line}` `{at}` `{resultWeekday}` `{ordinance}` `{issueShort}` `{vote}` `{president}` `{needed}` `{signatures}` | the server (`PoliticalResult` texts) |

### 4.4 Data to transcribe

| File | Contents | Source |
|---|---|---|
| `data/cities/clearwater.ts` | the city, three quarters (frames, outlines, The Front's teaser line), nine places, 24 actions with 45 outcome texts, the Casino hall, the Courier, the council | design §9.1–§9.3 |
| `data/jobs.ts`, `data/missions.ts`, `data/candidates.ts` | three jobs; four missions (11 ways, 12 outcomes, `runInPool`); the nine Clearwater candidates | design §9.4–§9.5 |
| `data/issues.ts` | six new Issues; `issue.tram-fares`'s Clearwater entry | design §9.6 |
| `data/laws.ts` (new) | the thirteen laws (lines, effect lines, effects, days, secretaries' lines) | design §7.2 |
| `data/factions.ts` | figures, pick names, Chair platforms, preferred laws, local deputies, houses | design §4.6, §6.5, §7.3; §22.1 Q4 |
| `data/orders.ts` | `family` on rotation templates; two push templates per faction; the Clearwater rotation | §22.1 Q1–Q2 |
| `data/events.ts` | the Town Hall; the venue rows of §4.2 | design §10.4; §22.1 Q5 |
| `data/headlines.ts`, `heraldHeadlines.ts`, `courierHeadlines.ts` (new), `nationalLines.ts` (new) | national lines; personal lines in five voices; the Courier's set | design §11 |
| `data/ambitions.ts`, `data/items.ts` | chapter 3, *The deposit*; `keep.deposit-receipt` | design §13 |
| `data/nation.ts` | Clearwater `service: 'open'`, line, no own baseline | design §9.1 |
| `data/art.ts` | §13's seven entries; the Town Hall's `art` | design §20 |
| `data/copy.ts` | screens §15's strings, the thirteen help notes, the slice-7 modal texts | screens §12, §15; design §12 |

Content tests parse both slice-7 design documents and compare every table and text word for word, as slices 1–6 do.

---

## 5. Data model (`packages/db`)

Seven new collections, each for a reason (plan rule 6):

| Collection | Why its own | Growth |
|---|---|---|
| `nation` | The republic's shared state read on every request; one document | 1 |
| `factions` | What a Chair sets for the whole faction; read by members once a day and by the desk | 3 |
| `factionElections` | The Chair's election and the votes on the Chair: a faction-wide ballot with a window and a count | ≤ 3 a term per faction |
| `nationalElections` | One per term: the picks, the frozen candidates, the count | 1 a term |
| `bills` | Grows by term; the votes (≤ 60) and lines are bounded and read with the bill | a few a week |
| `laws` | The law book and its history (the report, the law book page, the paper) | ≤ 5 at once |
| `petitions` | Signatures grow with a city's residents; read on the Election card and the petition page | ≤ 1 open per city |

### 5.1 `nation` — new (ADR 0043)

```ts
{
  _id: 'republic',
  world: { settledDay: DayKey, bootstrappedDay: DayKey },
  term: { index: number, fromDay: DayKey, toDay: DayKey },              // toDay exclusive
  government: {
    president: { holder: SeatHolder & { factionId: FactionId }, termId: ObjectId | null,   // null: a party figure
                 since: DayKey, consecutive: 1 | 2, via: 'bootstrap' | 'election' | 'runnerUp' },
    runnerUp: { holder: SeatHolder & { factionId: FactionId }, termId: ObjectId | null } | null,
    parliament: { termIndex: number, seats: Record<FactionId, number>, players: Record<FactionId, number> },
    lastRemovalDay: DayKey | null, autoRemovalTerm: number | null,
  },
  control: { day: DayKey, shares: OpinionShares /* weighted; Neutral included */, controlShare: Record<FactionId, number>,
             leader: FactionId, cities: Array<{ cityId, weight, unrest: boolean, shares: OpinionShares }> },
  controlLog: Array<{ day, shares, leader }>,                           // 60, $slice
  laws: { inForce: LawProjection[] /* ≤ 5 */, history: LawProjection[] /* ended within 60 days */ },
  news: Array<{ day: DayKey, id: string, priority: number, factionId: FactionId | null,
                contributors?: ObjectId[] /* nl.target-met only */, facts: Record<string, unknown> }>,   // 14 boundaries
  createdAt, updatedAt
}
LawProjection = { docId: ObjectId, lawId: string, fromDay: DayKey, toDay: DayKey /* effective end, exclusive */ }
```

No index beyond `_id`. Written by the nation's day, and by one player act: tabling a removal sets `government.lastRemovalDay` under the seven-day guard (§8.2). Every other act writes its own record (the bill, the candidacy, the vote), never this document.

### 5.2 `factions` — new (ADR 0046)

```ts
{
  _id: FactionId,
  chair: { holder: { characterId: ObjectId, name: string }, termId: ObjectId, fromDay: DayKey, toDay: DayKey } | null,
  orders: { current: StandingOrders | null, next: StandingOrders | null },
  rules: Array<{ cityId: string, ordinanceId: string, setDay: DayKey }>,                   // ≤ 3
  fixtures: Array<{ cityId: string, day: DayKey, typeId: string, districtId: string | null }>,   // tomorrow's, ≤ 3
  pushDays: Array<{ day, slot: 'A' | 'B', cityId, districtId: string | null, target: 25 | 50 | 100,
                    count: number, met: boolean }>,                                           // 14
  secretaryBillIndex: number,                                                                 // design §7.3's pointer
  createdAt, updatedAt
}
StandingOrders = { fromDay: DayKey, picks: { A: string | null, B: string | null, C: string | null } /* family ids */,
                   push: { slot: 'A' | 'B', cityId: string, districtId: string | null, target: 25 | 50 | 100 } | null,
                   setBy: { characterId: ObjectId, name: string }, setAt: Date }
```

### 5.3 `factionElections` — new (ADR 0047)

```ts
{
  _id: string,                         // 'chair:collective:12' | 'confidence:collective:{chairTermId}:{trigger}'
  kind: 'chair' | 'confidence',
  factionId, termIndex,
  namesFrom: DayKey | null, votesFrom: DayKey, countDay: DayKey,
  status: 'names' | 'voting' | 'counted' | 'void',
  seed: string,                        // 32 hex; the draw (never needed by the Chair's ties, kept for replay)
  filed: number,                       // $inc by stand (ADR 0018)
  ballots: number,                     // $inc by vote; never in a view before the count (ADR 0019)
  smallFaction: { backers: number } | null,
  ballot: BallotLine[] | null,         // frozen at the close: players by filing, then 'n:secretary'
  chairTermId: ObjectId | null, trigger: 'unrest' | 'petition' | null,   // confidence only
  result: ChairCount | ConfidenceCount | null,
  createdAt, updatedAt
}
```

Indexes: `{ factionId: 1, termIndex: -1, kind: 1 }`; `{ status: 1, countDay: 1 }` (the nation's day's due counts).

### 5.4 `nationalElections` — new (ADR 0047)

```ts
{
  _id: string,                         // 'nation:12'
  termIndex, namesFrom, pickFrom, votesFrom, countDay, officeDay,
  status: 'names' | 'pick' | 'voting' | 'counted' | 'seated',
  seed: string, filed: number, ballots: number,
  backers: Record<FactionId, number>,  // $inc by backing the party's candidate (player or figure), status 'voting'
  picks: Record<FactionId, { ballots: number, ballot: BallotLine[] | null, voted: boolean /* false: the figure stood alone */,
                             result: { winnerKey: string, rows: PickRow[] } | null }>,
  candidates: Array<{ factionId, key: string, kind: 'player' | 'npc', characterId?: ObjectId, npcId?: string, name,
                      pledges: string[], platformId: string | null, candidacyId?: ObjectId }> | null,   // at day 23
  result: NationalCount | null,        // §6.4
  countedAt: Date | null, seatedAt: Date | null,
  createdAt, updatedAt
}
```

Index: `{ termIndex: -1 }`.

### 5.5 `bills` — new (ADR 0045)

```ts
{
  _id: ObjectId,
  termIndex: number,
  kind: 'law' | 'strike' | 'removal' | 'override',
  lawId: string | null,                // the law (law, override) or the law struck (strike)
  replacesLawId: string | null,        // named at tabling when five are in force
  overrideOf: ObjectId | null,
  slotKey: string,                     // 'r1:12' | 'r2:12' | 'r3:12' | 'president:12:{weekDay}' | 'override:{billId}' | 'clerk:12:{day}'
  tablerKey: string | null,            // '{characterId}:12:bill' | '{characterId}:12:removal' (players only; §22.1 Q16)
  tabledBy: { kind: 'player' | 'secretary' | 'figure' | 'clerk', as: 'deputy' | 'chair' | 'president' | null,
              characterId?: ObjectId, npcId?: string, name: string, factionId: FactionId | null },
  tabledAt: Date, tabledDay: DayKey, divideDay: DayKey,
  needed: 31 | 36 | 40, factional: boolean, vetoable: boolean,
  status: 'voting' | 'awaitingSignature' | 'inForce' | 'failed' | 'vetoed' | 'struck' | 'lapsed' | 'removed' | 'survived',
  votes: Array<{ characterId: ObjectId, name: string, factionId: FactionId, vote: 'for' | 'against', at: Date }>,   // ≤ 60
  lines: Partial<Record<FactionId, { line: 'for' | 'against' | 'free', at: Date, by: { characterId: ObjectId, name: string } }>>,
  division: BillDivision | null,       // §6.5
  signatureDay: DayKey | null, inForceFrom: DayKey | null, vetoedAt: Date | null, lawDocId: ObjectId | null,
  createdAt, updatedAt
}
```

Indexes:

- `{ slotKey: 1 }` **unique, partial** `{ status: 'voting' }`: three regular slots, one President's bill a week, one override per veto, one clerk's motion a day;
- `{ lawId: 1 }` **unique, partial** `{ status: 'voting', kind: { $in: ['law', 'override'] } }`: one bill per law on the paper;
- `{ tablerKey: 1 }` **unique, partial** `{ tablerKey: { $type: 'string' } }`: once a term per member per power;
- `{ termIndex: 1, status: 1, divideDay: 1 }`: the order paper, the divisions due;
- `{ status: 1, signatureDay: 1 }` partial `{ status: 'awaitingSignature' }`: the enactments due;
- `{ lawId: 1, divideDay: -1 }` partial `{ status: 'failed' }`: the seven-day rule;
- `{ 'tabledBy.characterId': 1, tabledDay: -1 }`: the paper's facts, the desk's line.

### 5.6 `laws` — new (ADR 0044)

```ts
{ _id: ObjectId, lawId: string, billId: ObjectId, termIndex: number,
  fromDay: DayKey, toDay: DayKey /* by duration */, endedDay: DayKey | null,
  endedBy: 'struck' | 'replaced' | 'renewed' | null,     // expiry by the calendar writes nothing
  tabledBy: Bills['tabledBy'], passed: { for: number, against: number, overridden: boolean }, createdAt }
```

Indexes: `{ fromDay: -1 }` (the law book's history, the report); `{ lawId: 1, fromDay: -1 }`.

### 5.7 `petitions` — new (ADR 0049)

```ts
{
  _id: string,                         // 'dissolve:coalport:20731' | 'chair:collective:{chairTermId}'
  kind: 'dissolve' | 'chair',
  cityId: string | null, councilKey: string | null,       // dissolve
  factionId: FactionId | null, chairTermId: ObjectId | null,   // chair
  openedBy: { characterId: ObjectId, name: string }, openedDay: DayKey, closesDay: DayKey,
  count: number,                       // signatures + townHall
  signatures: Array<{ characterId: ObjectId, name: string, factionId: FactionId, day: DayKey, at: Date }>,
  townHall: number,                    // townspeople's signatures from Town Hall events
  needed: number | null,               // at the close
  status: 'open' | 'succeeded' | 'failed',
  closedAt: Date | null, createdAt, updatedAt
}
```

Indexes: `{ cityId: 1 }` **unique, partial** `{ status: 'open', kind: 'dissolve' }` (one open per city); `{ cityId: 1, closesDay: -1 }` (the seven-day rule, the card); `{ status: 1, closesDay: 1 }` (the closes due); `{ 'signatures.characterId': 1, closesDay: -1 }` (the paper's facts). The Chair's petition's `_id` makes it one per Chair per term.

### 5.8 Changed collections

- **`officeTerms`**: `office: 'council' | 'governor' | 'chair' | 'deputy' | 'president'` (absent = council); `factionId` on every new kind; `councilKey` per office (`governor:{city}:{cycle}`, `chair:{f}:{term}`, `deputy:{term}`, `president:{term}`); `seat` = 1 (the governor, the Chair, the President) or the list place (a deputy); `powers: { address?: { day, cityId, issueDocId }, veto?: { billId, day }, rule?: { ordinanceId, day } }` (set-once guards); `pledges?: Array<{ lawId, keptDay: DayKey | null }>`; `via?: 'election' | 'runnerUp'`. Index added: `{ office: 1, councilKey: 1 }`. The unique `{ councilKey, seat, fromDay }` serves every office (a runner-up's term starts on its own day).
- **`candidacies`**: `kind: 'council' | 'chair' | 'president' | 'list'` (absent = council); `termIndex` (non-council); `cityId` and `cycle` optional for non-council kinds; `pledges: string[]`; `deposit` states as slice 3. The unique `{ electionId, characterId }` keeps a member to one national candidacy a term (President *or* the list).
- **`votes`**: new `electionId` namespaces (`chair:…`, `pick:…`, `nation:…`, `confidence:…`); `candidateKey` is `p:{id}`, `n:secretary`, `n:{figureId}`, a faction id (the republic's vote) or `confidence` / `noConfidence`. ADR 0019 unchanged.
- **`cities`**: Clearwater's `opinion`, `state` (a district's `DistrictStateDoc`), `groundswell`, `stateLog` (ADR 0050); every council city's `council.governor: { kind: 'player' | 'npc', characterId?, npcId?, name, factionId, termId: ObjectId | null, local: boolean } | null` and `council.dissolved: { day, petitionId } | null`.
- **`elections`**: `kind` += `'battleground'` (Clearwater: one election per cycle for the city's seven seats).
- **`ordinances`** (order papers): `items[].movedBy.kind` += `'governor' | 'chair'` (the party's rule set by a player Chair); `status` += `'dissolved'`.
- **`contributions`**: scope `push|{f}|{day}` (one row per member: the party's target).
- **`campaignEvents`**: `calledBy.kind` += `'chair'`; **`eventSignups`** unchanged.
- **`chatMessages`**: channel `officers:{f}`.
- **`requestLogs`**: `REQUEST_KINDS` += §18's request kinds.

### 5.9 `characters` — changed embedded fields

```ts
{
  ...slice 6,
  offices: Array<{ termId, office: 'council' | 'governor' | 'chair' | 'deputy' | 'president', key: string,
                   cityId: string | null, seat: number, fromDay, toDay }>,   // projection (ADR 0020, 0048)
  termBackings: Array<{ key: string /* 'chair:collective:12' | 'nation:12' */, candidacyId: ObjectId, name: string,
                        day: DayKey }>,                                       // ≤ 6: the current and previous term
  orders.items[].push?: { cityId: string, districtId: string | null, counts: boolean },   // the pushed place
  orders.setBy?: { characterId: ObjectId, name: string } | null,              // "Set by the Chair, {name}"
}
```

No new index on `characters`: the eligibility rolls use slice 3's `{ residence.cityId, residence.districtId, factionId, rank, lastActionAt }` and a new `{ factionId: 1, rank: 1, lastActionAt: -1 }` (the faction-wide rolls of the Chair's small-faction rule, the petition on the Chair and turnout).

### 5.10 Migration `009-slice7-nation.ts`

`ensureIndexes()` runs it after 008. Idempotent: each step filters on the field's absence.

1. `officeTerms` without `office`: `office: 'council'`. `candidacies` without `kind`: `kind: 'council'`.
2. Characters: `termBackings: []`; each `offices[]` entry gains `office: 'council'` and `key` from `councilKey`.
3. Nothing else: the `nation` and `factions` documents are made by the nation's bootstrap, Clearwater's city document by its city day's bootstrap (ADR 0017's pattern), both on the worker's start or the first request.

A test runs 009 twice (no change the second time).

---

## 6. Rules (`packages/rules`) — pure, no I/O

### 6.1 Constants

```ts
export const TERM = { days: 28, epochDay: 20_458 } as const;          // Monday 5 Jan 2026 = WEEK.mondayEpoch (ADR 0043)
export const TERM_DAYS = {
  chair: { namesFrom: 9, votesFrom: 11, countDay: 14 },
  nation: { namesFrom: 19, pickFrom: 21, votesFrom: 23, countDay: 27 },
  tableUntil: 23,                                                     // so every bill divides by the boundary into 27
  removalClosed: [[0, 4], [24, 27]],
} as const;                                                           // design §2, §5.2, §10.2
export const GOVERNOR = { stipend: { pc: 20, fxp: 30 }, address: 50, ruleCycleDays: [0, 1] } as const;
export const CHAIR = { rank: 4, tenureDays: 14, deposit: 25, backers: 2, backCost: 10, backersCounted: 5,
                       backerWeight: 3, voteRank: 2, maxConsecutive: 2, stipend: { pc: 20, fxp: 40 } } as const;
export const DEPUTY = { rank: 5, tenureDays: 14, deposit: 25, councilTerms: 3, billCost: 50,
                       stipend: { pc: 5, fxp: 30 } } as const;
export const PRESIDENT = { rank: 6, tenureDays: 14, deposit: 100, pledges: 2, maxConsecutive: 2, address: 100,
                           stipend: { pc: 50, fxp: 60 } } as const;
export const PARLIAMENT = { seats: 60, pass: 31, factional: 36, twoThirds: 40, regularSlots: 3, voteDays: 3,
                            failedWaitDays: 7, maxInForce: 5, namedLocals: 8,
                            removal: { cost: 50, autoBelowShare: 25, gapDays: 7 } } as const;
export const NATIONAL = { fullTurnout: 30, ballotWeightMax: 50, backersMax: 5, backCost: 10, voteRank: 2,
                          unrestFactor: 0.5 } as const;
export const PUSH = { targets: [25, 50, 100], fxp: 10, level: 10 } as const;
export const PETITION = { openRank: 3, signRank: 2, cost: 10, openCycleDays: [0, 1, 2], closeAfter: 2,
                          min: 3, share: 0.25, gapDays: 7 } as const;
export const CONFIDENCE = { petitionRank: 3, cost: 10, min: 3, share: 0.25, closeAfter: 2, notFirstDays: 5,
                            notLastDays: 3, voteDays: 2, removeShare: 2 / 3, minNoVotes: 3 } as const;
export const BATTLEGROUND_COUNCILS = {                                // ADR 0050: the capital's and Clearwater's
  capital: { seats: 10, perPlace: 2, passVotes: 6, listSize: 2, fullTurnout: 10 },
  clearwater: { seats: 7, perPlace: 7, passVotes: 4, listSize: 3, fullTurnout: 10 },
} as const;
export const CONTROL = { rivalHeatGainPct: 25 } as const;            // design §8
export const TOWN_HALL = { signatures: { triumph: 3, success: 2, mixed: 1, fiasco: 0 } } as const;
export const LAW_BOUNDS = {                                           // ADR 0044; the catalogue is closed
  jobPayPct: [0, 15], seniorityDays: [1, 2], swingPct: [-25, 0], energyDelta: [-2, 0],
  trainingEnergyPct: [-20, 0], ironPct: [0, 15], bailPct: [-25, 0], heatCoolPct: [0, 50],
  xpPct: [-20, 20], missionEnergyDelta: [-2, 2], journeyTimePct: [-25, 25], runInPct: [-50, 100],
  infirmaryCostPct: [-50, 25], markFadeDays: [7, 14], caughtDelta: [0, 10],
} as const;
```

`CAPITAL_COUNCIL` stays as an alias of `BATTLEGROUND_COUNCILS.capital` for slice-4 callers. `ROOM.cityId` goes: the room is offered in every `battleground` city (the content role; design §9.1).

### 6.2 `term.ts`

```ts
export interface TermDay { index: number; termDay: number; fromDay: DayKey; toDay: DayKey }
export function termOf(day: DayKey): TermDay;                         // floor((day − epoch) / 28), mod 28
export const termStart = (index: number): DayKey;
export type ChairPhase = 'none' | 'names' | 'voting';                  // 9–10 · 11–13
export type NationalPhase = 'none' | 'names' | 'pick' | 'voting' | 'result';   // 19–20 · 21–22 · 23–26 · 27
export const chairPhase = (day: DayKey): ChairPhase;
export const nationalPhase = (day: DayKey): NationalPhase;
export function nationWork(day: DayKey, bootstrappedDay: DayKey): {
  takeOffice: boolean; openChair: boolean; closeChairNames: boolean; countChair: boolean;
  openNation: boolean; openPick: boolean; countPick: boolean; countNation: boolean; monday: boolean };
//  each window's step only when the window opened on or after `bootstrappedDay` (ADR 0043)
export const canTableOn = (day: DayKey) => termOf(day).termDay <= TERM_DAYS.tableUntil;
export const removalOpen = (day: DayKey) => boolean;                  // not term days 0–4 or 24–27
export const isNight = (now: number) => boolean;                       // DAY_NIGHT: 20:00–06:00 UTC
export const nextDate = (day: DayKey, what: 'chairNames' | 'chairVotes' | 'chairCount' | 'nationNames' | 'pick'
  | 'votes' | 'count' | 'office') => DayKey;                           // every TermLine's and card's {weekday} / {date}
```

### 6.3 `ladder.ts`

```ts
export type Office = 'council' | 'governor' | 'chair' | 'deputy' | 'president';
export interface ServiceRecord {
  completed: Record<Office, number>;             // completed terms by office (officeTerms, ADR 0048)
  consecutive: { chair: number; president: number };   // ending with the current term
  tenureDays: number;                            // days in the faction (since joining: switching is not built)
  rank: number;
}
export function standGate(office: 'chair' | 'list' | 'president', r: ServiceRecord, pc: number):
  null | { reason: 'RANK' | 'LADDER' | 'TENURE' | 'TERM_LIMIT' | 'NOT_ENOUGH_PC'; need: number; rung?: Office };
//  chair: Rank 4 · council ≥ 1 · 14 days · not in a second consecutive term · 25 PC
//  list: Rank 5 · governor ≥ 1 or council ≥ 3 · 14 days · 25 PC
//  president: Rank 6 · deputy ≥ 1 · 14 days · not in a second consecutive term · 100 PC
export function ladderRows(r: ServiceRecord, nextDates): LadderRow[];  // the Me tab's five rows (screens §3)
export const termsWeight = (c: Record<Office, number>) => 2 * c.governor + c.council;   // the ties (design §4.1, §6.4)
export const stipendOf = (office: Office): { pc: number; fxp: number };   // 10/20 · 20/30 · 20/40 · 5/30 · 50/60
export function officeStipends(terms: ReadonlyArray<{ office: Office; fromDay: DayKey; toDay: DayKey;
  vacatedDay: DayKey | null; local?: boolean }>, settled: DayKey | null, today: DayKey):
  Array<{ office: Office; termId: string; boundaries: number; pc: number; fxp: number }>;
//  stipendBoundaries per office, ending at vacatedDay; a local's term pays nothing; offices add (design §3)
export function governorOf(i: { seated: ReadonlyArray<{ key: string; kind: 'player' | 'npc'; factionId: FactionId;
  total: number; order: number; completedCouncil: boolean }>; bloc: FactionId | null /* capital, Clearwater */ }):
  { key: string; local: boolean };
//  the bloc's (at home: the council's) seated players with a completed council term, by total and the count's ties;
//  none → the bloc's top local (`local: true`)
```

### 6.4 `national.ts`

```ts
export function nationalControl(i: { cities: ReadonlyArray<{ cityId: string; weight: number; shares: OpinionShares;
  unrest: boolean }> }): { shares: OpinionShares; controlShare: Record<FactionId, number>; leader: FactionId;
  cities: Array<{ cityId: string; weight: number /* applied */; unrest: boolean; shares: OpinionShares }> };
//  Σ weight × share per party and for Neutral, in thousandths; a home city in Unrest at weight × 0.5 (§22.1 Q12);
//  controlShare = NC ÷ Σ the three parties' NC, in percent; leader: the highest NC, ties in FACTION_IDS order
export const nationalTurnoutWeight = (ballots: number) => 50 * Math.min(1, Math.max(0, ballots) / 30);
export interface NationalScore { factionId: FactionId; ballots: number; ballotShare: number; controlShare: number;
  backers: number; score: number; seats: number }
export function nationalScores(i: { ballotsByFaction: Partial<Record<FactionId, number>>;
  controlShare: Record<FactionId, number>; backers: Partial<Record<FactionId, number>> }): NationalScore[];
//  score = w × ballotShare + (100 − w) × controlShare / 100 + min(5, backers); full precision; shown to one decimal
export function countNation(i: { scores: NationalScore[]; drawOrder: readonly FactionId[] }):
  { president: FactionId; runnerUp: FactionId; seats: Record<FactionId, number>; drawn: boolean };
//  the President: the highest score, ties ballots → controlShare → the draw; the runner-up the next;
//  sixty seats by slice 4's `dhondt` on the scores (ballots and controlShare as its tie-breaks)
export function partyList(i: { candidate: { key: string; kind: 'player' | 'npc' } | null; elected: boolean;
  list: ReadonlyArray<{ key: string; backers: number; termsWeight: number; reputationWins: number; filedAt: number }> }):
  string[];
//  (1) the candidate when a player and not elected; (2) the list by backers, termsWeight, Reputation wins, filing
export function seatList(order: readonly string[], seats: number):
  { seated: string[]; locals: number; places: Record<string, number> };
export function countPick(i: { ballot: ReadonlyArray<{ key: string; backers: number; termsWeight: number; order: number }>;
  votes: Readonly<Record<string, number>> }): { winnerKey: string; rows: PickRow[] };
//  most votes; ties backers, termsWeight, ballot order (players by filing, the figure last)
export function countChair(i: { lines: ReadonlyArray<{ key: string; kind: 'player' | 'secretary'; backers: number;
  termsWeight: number; order: number }>; votes: Readonly<Record<string, number>> }):
  { rows: ChairRow[]; winnerKey: string; secretaryKept: boolean; margin: number };
//  total = votes + 3 × min(5, backers) (the secretary: votes); ties votes, backers, termsWeight, filing
export const closeChairNames = closeNominations;                      // slice 3's, with the small rule faction-wide
export function confidenceResult(c: { confidence: number; noConfidence: number }): { removed: boolean };
//  removed when noConfidence ≥ 2/3 of the votes cast and noConfidence ≥ 3 (§22.1 Q29)
export const signaturesNeeded = (eligible: number, min = 3) => Math.max(min, Math.ceil(eligible / 4));
export function autoRemovalDue(i: { controlShare: number /* the President's party */; day: DayKey;
  lastRemovalDay: DayKey | null; usedThisTerm: boolean }): boolean;   // under 25 % (§22.1 Q11), removalOpen, 7 days
```

### 6.5 `parliament.ts`

```ts
export type BillKind = 'law' | 'strike' | 'removal' | 'override';
export type LineVote = 'for' | 'against' | 'free';
export const billNeeded = (kind: BillKind, factional: boolean): 31 | 36 | 40;
//  law 31 or 36 · strike 31 · removal and override 40
export function billDays(tabledDay: DayKey): { divideDay: DayKey; signatureDay: DayKey; inForceFrom: DayKey;
  strikeEndsDay: DayKey };                                            // t + 4, t + 4, t + 5, t + 5
export function tableGate(i: {
  as: 'deputy' | 'chair' | 'president'; kind: BillKind; day: DayKey; pc: number;
  usedPower: boolean;                            // this term (deputy, Chair, a removal) or this week (the President)
  lawId: string | null; replaces: string | null;
  inForce: readonly LawInForce[]; onPaper: readonly string[]; failedWithinWeek: readonly string[];
  regularOpen: number; lastRemovalDay: DayKey | null;
}): null | { reason: 'PARLIAMENT_RISEN' | 'ALREADY_TABLED' | 'LAW_IN_FORCE' | 'LAW_ON_PAPER' | 'LAW_FAILED_RECENTLY'
  | 'PAPER_FULL' | 'NAME_REPLACEMENT' | 'NOT_IN_FORCE' | 'REMOVAL_CLOSED' | 'REMOVAL_TOO_SOON' | 'NOT_ENOUGH_PC';
  need?: number };
//  a law in force may be tabled in its last seven days (a renewal); a strike names a law in force
export function localVote(i: { players: { for: number; against: number }; chairLine: LineVote | null;
  secretaryLine: LineVote; unrest: boolean }):
  { vote: 'for' | 'against' | 'abstain'; why: 'players' | 'chair' | 'secretary' | 'unrest' };
//  Unrest → abstain; the players' majority (a tie falls through); the Chair's line when set (free → abstain);
//  else the secretary's (free → abstain) (§22.1 Q9, Q10)
export interface BillDivision {
  byFaction: Record<FactionId, { seats: number; players: { for: number; against: number; abstain: number };
    locals: { n: number; vote: 'for' | 'against' | 'abstain'; why: 'players' | 'chair' | 'secretary' | 'unrest' } }>;
  for: number; against: number; abstain: number; needed: number; passed: boolean;
}
export function divideBill(i: { needed: number; seats: Record<FactionId, { players: number; locals: number }>;
  votes: ReadonlyArray<{ factionId: FactionId; vote: 'for' | 'against' }>;
  chairLines: Partial<Record<FactionId, LineVote>>; secretaryLines: Record<FactionId, LineVote>;
  unrest: Record<FactionId, boolean> }): BillDivision;
export const removalSecretaryLines = (presidentFaction: FactionId) => Record<FactionId, LineVote>;
//  Against for the President's party, free for the others
export interface LawInForce { lawId: string; fromDay: DayKey; toDay: DayKey }
export const lawsOnDay = (projection: readonly LawInForce[], day: DayKey) => LawInForce[];
export function enact(i: { inForce: readonly LawInForce[]; lawId: string; days: number; replaces: string | null;
  day: DayKey }): { start: LawInForce; ends: Array<{ lawId: string; why: 'renewed' | 'replaced' | 'cap' }> };
//  the same law renews (the old row ends today); the named one ends; at the cap with no live named law, the one
//  ending soonest (ties: the oldest) ends (§22.1 Q15)
export function secretaryBill(i: { blocs: ReadonlyArray<{ factionId: FactionId; seats: number; playerChair: boolean;
  playerDeputies: number; preferred: readonly string[]; pointer: number }>; regularOnPaper: number;
  inForce: readonly LawInForce[]; onPaper: readonly string[]; failedWithinWeek: readonly string[]; day: DayKey;
  tabledThisWeek: boolean; drawOrder: readonly FactionId[] }):
  { factionId: FactionId; lawId: string; pointer: number } | null;
//  at most one a week; fewer than two regular bills on the paper; parties with no player Chair and no player
//  deputy, the largest bloc first; its preferred list from the pointer, skipping laws in force, on the paper or
//  failed within the week; back to the top when spent
export function figureBill(i: { preferred: readonly string[]; pointer: number; inForce; onPaper; failedWithinWeek;
  day: DayKey }): { lawId: string; pointer: number } | null;           // a party figure as President, Mondays
export const vetoOpen = (b: { status: string; vetoable: boolean; signatureDay: DayKey | null }, today: DayKey,
  vetoUsed: boolean) => boolean;
export const overrideFits = (vetoDay: DayKey) => termOf(vetoDay).termDay <= TERM_DAYS.tableUntil;
```

### 6.6 `laws.ts`, and the function each new kind touches (ADR 0044)

```ts
export type EffectAppliesTo = 'all' | 'members' | 'others';
export type LawEffect = (OrdinanceEffect
  | { kind: 'xpPct'; scope: 'missions' | 'actions'; value: number }
  | { kind: 'missionEnergyDelta'; value: number }
  | { kind: 'journeyTimePct'; value: number }
  | { kind: 'runInPct'; window?: 'night'; value: number }
  | { kind: 'infirmaryCostPct'; value: number }
  | { kind: 'markFadeDays'; value: number }
  | { kind: 'caughtDelta'; scope: 'againstFaction'; value: number }) & { appliesTo?: EffectAppliesTo };
export function lawBoundProblem(e: LawEffect): string | null;          // LAW_BOUNDS; a kind absent there is refused
export const isFactional = (law: { effects: readonly LawEffect[] }) => boolean;
export function lawSource(law: LawSpec, actor: FactionId): ModifierSource | null;
//  kind 'law', the law's id and name; effects filtered by appliesTo (members: actor = law.factionId; others: ≠);
//  caughtDelta carries the law's factionId (the party a mission must target)
export function lawSourcesOn(projection: readonly LawInForce[], day: DayKey, actor: FactionId,
  catalogue: (id: string) => LawSpec): ModifierSource[];
ModifierSource.kind += 'law';                                          // order: the ordinance, the Issues, the laws
```

| Kind | The one function it touches | Rule |
|---|---|---|
| `xpPct` | `rewardShares` gains `xp: BonusShare[]` (scope `missions` on tier 2, `actions` on tier 1); `tier2Rewards` and `computeRewards` add each as a part on the XP base | a part on base, halves up (ADR 0030's rule for pay, Iron and Party XP) |
| `missionEnergyDelta` | `missionEnergy(base, seenAs, m) = max(1, base + Σ energyDelta(seenAs) + Σ missionEnergyDelta)` | rewards stay on the content Energy (ADR 0021 §3) |
| `journeyTimePct` | `journeyMinutes(legMinutes, m) = max(1, roundHalfUp(minutes × Π(1 + p/100)))`, at boarding | 12 → 9, 25 → 19, 37 → 28 |
| `runInPct` | `runInChance(… pcts)`: the chance × Π(1 + p/100), rounded half up, then the 0..90 clamp; `window: 'night'` only while `isNight(now)` | tier 2 and the rival-ground tier-1 15 (§22.1 Q21) |
| `infirmaryCostPct` | `walkOut(… price: priceWith(100, priceLines(m, 'infirmaryCostPct')))` | 100 → 50 |
| `markFadeDays` | `liveMarks(marks, today, fadeDaysOn: (day) => number)`: minor marks are gone once **any** day X with latest ≤ X ≤ today has X ≥ latest + fadeDaysOn(X) | monotone: a law that ends never brings a mark back; `fadeDaysOn` = the smallest `markFadeDays` in force on X, else 14 |
| `caughtDelta` | `caughtChance(… deltas)`: + Σ value where the mission's target faction is the law's party | before the 2..95 clamp |
| (a place factor) `heatGainPct` | `heatGainAt(gain, place, actor)`: × 1.25, rounded half up, for a rival of the party controlling the district or Clearwater | missions and events at the place (ADR 0050) |

The existing kinds a law uses (`jobPayPct`, `seniorityDays`, `swingPct`, `energyDelta`, `trainingEnergyPct`, `ironPct`, `bailPct`, `heatCoolPct`) combine by ADR 0030's table unchanged. A member-only `heatCoolPct` enters `rateOn(day)` for that member's Heat only. `ordinanceTags` gives a law its tag with `source: 'law'` and new tag kinds `xp`, `journey`, `runIn`, `price`.

### 6.7 `orders.ts` v3 (ADR 0046)

```ts
export type ResidenceKind = 'home' | 'capital' | 'clearwater';
export interface StandingPicks { A: string | null; B: string | null; C: string | null }   // family ids
export interface PushSpec { slot: 'A' | 'B'; cityId: string; districtId: string | null; target: 25 | 50 | 100 }
export function standingOn(o: { current: StandingSpec | null; next: StandingSpec | null }, day: DayKey):
  StandingSpec | null;                                                 // next once day ≥ next.fromDay
export function ordersForDay(templates, day, residence: ResidenceKind, level = 1,
  standing?: { picks: StandingPicks; push: PushSpec | null; pushTemplates: { A: OrderTemplate; B: OrderTemplate } }):
  Array<OrderTemplate & { push?: { cityId: string; districtId: string | null; counts: boolean } }>;
//  per slot: the pick's template for this residence (same family), else the rotation; the pushed slot: the push
//  template at the battleground for Level ≥ 10 (counts: true), at the residence below (counts: false)
export function startOrders(…, standing?): OrdersState;               // the crisis pair and the welcome set still win
export function orderMatches(m, a, ctx, push?: { cityId: string; districtId: string | null }): boolean;
//  'push' in a match resolves to the item's place
export const pushCounts = (item, a, ctx) => boolean;                   // the item's push counts and its match holds
export function pushTitle(t: OrderTemplate, place: { cityName: string; districtName: string | null }): string;
//  "Talk to voters in Eastside, Irongate"
export const pushMet = (count: number, target: number) => count >= target;
```

### 6.8 `council.ts` v3 and the battleground count (ADR 0048, 0050)

```ts
export interface DivisionItem { ordinanceId: string; role: 'governor' | 'party' | 'proposal';
                                factionId: FactionId | null; movedAt: number }
export function divide(i: { items: readonly DivisionItem[]; playerVotes: ReadonlyArray<{ choice: string }>;
  npcSeats: number; unrest: boolean }): Division;
//  locals: the item with most player votes (ties: the Governor's rule, the party's rule, the earliest);
//  no player vote for any item → the Governor's rule → the party's rule; they abstain in Unrest or when four or
//  more player councillors chose AGAINST_ALL (design §4.3); passes with 4
export function divideBlocs(i: { items: readonly DivisionItem[]; playerVotes: ReadonlyArray<{ choice; factionId }>;
  npcSeats: Partial<Record<FactionId, number>>; passVotes: number; governorFaction: FactionId | null }): CapitalDivision;
//  each bloc's locals: their players' lead → the Governor's rule (the Governor's bloc only) → their party's rule
export function countBattleground(i: { lines; votes; opinion; rng; seats: number; fullTurnout: number }): DistrictCount;
//  slice 4's countDistrict with parameters: the capital 2 seats a district, Clearwater 7
export function orderPaperItems(i: { governorRule: string | null; partyRules: ReadonlyArray<{ factionId; ordinanceId }>;
  proposals: readonly DivisionItem[] }): DivisionItem[];               // the Governor's, the parties' in seat order, proposals
export const partyRuleOf = (rules: ReadonlyArray<{ cityId: string; ordinanceId: string }>, cityId: string,
  branchMotion: string) => string;
```

### 6.9 Events, petitions and the paper

```ts
export const townHallSignatures = (band: EventBand) => TOWN_HALL.signatures[band];
export function chairCallGate(i: { chair: boolean; cityOpen: boolean; rivalHome: boolean; districtOk: boolean }):
  null | { reason: 'NOT_CHAIR' | 'WRONG_CITY' | 'WRONG_DISTRICT' };   // no Energy, no role, from anywhere
export function petitionGate(i: { rank: number; resident: boolean; votesFromOk: boolean; cycleDay: number;
  lastClosedDay: DayKey | null; today: DayKey; open: boolean; pc: number; councillor: boolean; signed: boolean;
  opening: boolean }): null | { reason: 'RANK' | 'NOT_RESIDENT' | 'TOO_SOON' | 'PETITION_CLOSED' | 'ALREADY_OPEN'
  | 'ALREADY_SIGNED' | 'COUNCILLOR' | 'NOT_ENOUGH_PC'; need?: number };
export function chairPetitionGate(i: { rank: number; chairDay: number /* 0–27 of the Chair's term */;
  usedThisTerm: boolean; playerChair: boolean; pc: number; signed: boolean }): null | { reason: string };
//  not in the Chair's first five or last three days; one per Chair per term
export function selectNationalLines(news: readonly NewsItem[], i: { day: DayKey; factionId: FactionId;
  characterId: string }): NewsItem[];
//  today's items for everyone, the reader's faction or (nl.target-met) its contributors; the two highest priority
//  (0 first); nl.leader-line only when nothing else
selectHeadlines += NationalCondition (§11.2)
```

### 6.10 Changed functions

| Function | Change |
|---|---|
| ADR 0030's modifier builder (server) | `sources` = the ordinance, the Issue effects and `lawSourcesOn(nation.laws, day, actor)` |
| `rewardShares` | `xp` shares from `xpPct`; nothing a law adds to Party XP (the loader refuses `fxpPct`) |
| slice 5's mission cost | `missionEnergy` with `missionEnergyDelta` |
| `legMinutes` callers | `journeyMinutes` at boarding |
| `runInChance`, `caughtChance`, `walkOut`, `liveMarks`, `bailFor` | §6.6 |
| `addHeat` callers at a place | `heatGainAt` (control's +25 % for rivals) |
| `ordersForDay`, `startOrders`, `orderMatches` | §6.7 |
| `divide`, `divideCapital` → `divideBlocs`, `countDistrict` → `countBattleground` | §6.8; slice-3 and slice-4 tests pin the old behaviour with no Governor, no Chair's rule and the capital's parameters |
| `destinationState` | Clearwater is `open` (its service is content) |
| `districtState` | run on Clearwater's city meter too (unchanged) |
| `fixtureFor` (slice 6) | a Chair's fixture for the day wins over the rotation; Clearwater posts all three factions' fixtures, no district |
| `channelsOf` (slice 6) | `officers:{f}` for Rank 4+; Clearwater's branch channel (§22.1 Q6) |
| `stipendBoundaries` | per office through `officeStipends` |
| `selectHeadlines`, `selectPoliticalHeadlines` | the national and personal conditions (§11) |

`computeCheck` is unchanged: no law and no office touches the odds of a check.

### 6.11 Types: views, results, errors

All in `types.ts` (§8.3, §10). `GameErrorReason` gains:

- the calendar: `NOT_NOW { phase, opensOn }`, `NATION_NOT_READY`;
- offices: `NOT_GOVERNOR`, `NOT_CHAIR`, `NOT_DEPUTY`, `NOT_PRESIDENT`, `LOCAL_HOLDS`, `RULE_WINDOW_CLOSED`, `ALREADY_ON_PAPER`, `ADDRESS_USED`, `VETO_USED`, `NOT_VETOABLE`, `NOT_AN_ISSUE`;
- standing: `LADDER { rung, need }`, `TENURE { need }`, `TERM_LIMIT`, `ALREADY_STANDING`, `NOT_STANDING`, `ALREADY_BACKED { name }`, `CANNOT_BACK_SELF`, `NOT_ON_BALLOT`, `PLEDGES { need: 2 }`, `WITHDRAW_CLOSED`;
- Parliament: §6.5's reasons, `BILL_NOT_FOUND`, `ALREADY_VOTED`, `BILL_CLOSED`;
- the Chair's desk: `UNKNOWN_FAMILY`, `PUSH_PLACE`, `PUSH_SLOT`, `UNKNOWN_FIXTURE`;
- petitions and votes on the Chair: §6.9's reasons, `NO_CHAIR`, `NO_VOTE_OPEN`.

`PoliticalAct` += `chairDeclare`, `chairBack`, `chairVote`, `chairOrders`, `partyLine`, `partyRule`, `fixture`, `chairCall`, `governorRule`, `address`, `presidentDeclare`, `presidentWithdraw`, `listDeclare`, `pickVote`, `nationalVote`, `nationalBack`, `listBack`, `tableBill`, `tableRemoval`, `billVote`, `veto`, `petitionOpen`, `petitionSign`, `chairPetitionOpen`, `chairPetitionSign`, `confidenceVote`. `PoliticalResult.view` += `office`, `desk`, `chairElection`, `pick`, `nationalElection`, `bill`, `petition`, `confidence`.

### 6.12 Tests (Vitest, `packages/rules/test`)

- **Term:** `termOf` across the epoch, at term days 0 / 27 / 28 and before the epoch; the phases at every term day; `nationWork` for a bootstrap on term days 0, 10, 20 and 27 (windows already open are skipped); term day 0 is a Monday for 200 terms.
- **Ladder:** every `standGate` refusal; `ladderRows` for design §14's four players; `termsWeight`; `officeStipends` for a full term, a vacated term, a local and two offices at once.
- **The Governor:** `governorOf` at home (a first-term top councillor is passed over for a second-termer), in the capital (the largest bloc; ties by ballots, opinion, the draw) and in Clearwater; a local when nobody qualifies.
- **National Control:** the baselines give **23.5** each and Neutral 29.5; Unrest halves a home's weight; `controlShare` sums to 100; the leader and its ties.
- **The national count:** design §6.3's worked examples to the decimal (33.3 each and 20 / 20 / 20 by the draw; one Collective ballot: 34.4 / 32.8 / 32.8; ten Vanguard and five Collective: 41.7 / 33.3 / 25.0 and **25 / 20 / 15**); backers capped at five; the President's ties; the runner-up; `partyList` and `seatList` (a losing player candidate first; backers; ties down to filing; locals fill).
- **The picks and the Chair:** `countPick` (the figure last on ties), `countChair` (votes + 3 × backers ≤ 5; the secretary's votes only; the four tie levels), `closeChairNames` with the faction-wide small rule, `confidenceResult` at two thirds exactly and with two No votes.
- **Parliament:** `billDays`; every `tableGate` refusal; a renewal in the last week; `localVote` for each link of the chain, the tie fall-through, an explicit *free* and Unrest; `divideBill` for design §7.2's *what passes by itself* (People's Education, Universal Care, Rehabilitation and Public Assembly with 40 For; the rest fail; a Vanguard Chair's For on the Eight-Hour Day makes 40); the edges 30 / 31, 35 / 36, 39 / 40; `removalSecretaryLines`; `enact` (a renewal, a replacement, the cap's soonest-ending rule, a named law that has expired); `secretaryBill` over eight Mondays (the pointer, the skips, one a week, the largest bloc first); `overrideFits`.
- **Laws:** every catalogue law against `LAW_BOUNDS` and the factional rule; `lawSource` for members, others and all; economy §21.3's numbers: Eight-Hour Day +22 Iron on 216; Free Market +10 % Iron; Open Borders 12 → 9 and 25 → 19; Universal Care 100 → 50; Emergency Permits 15 → 17 paying on 15; Public Assembly 12 → 10; Civic Education 44 → 35 for an Alliance member only; the Curfew ×2 at 20:00 and not at 19:59; Special Powers' caught 8 → 18 % against the Vanguard only, and Heat cooling 7.5 an hour for a Vanguard member only; `liveMarks` with a seven-day law that ends before and after the fade (monotone).
- **Orders:** `standingOn` across `next.fromDay`; a pick served by a capital twin and one falling back to the rotation; the push at Level 9 and 10; the crisis pair and the welcome set still win; `pushCounts` only at the battleground.
- **Councils:** `divide` with a Governor's rule and a Chair's rule through the chain; four *None of these* abstain and three do not; `divideBlocs` with four of seven; `countBattleground` reproduces every slice-4 district test with the capital's parameters, and a seven-seat Clearwater example (3 / 2 / 2 at level scores).
- **Events and petitions:** `townHallSignatures`; `chairCallGate`; `petitionGate`'s refusals at cycle days 2 and 3 and the seven-day rule; `signaturesNeeded` (3 for up to 12 eligible, 4 at 13); `chairPetitionGate` at the edges of five and three days.
- **The paper:** `selectNationalLines` picks two by priority, faction lines only for the faction, `nl.target-met` only for contributors, the leader line alone.

---

## 7. The read path and the guards (`apps/server`)

### 7.1 `loadCharacter(user, content, now, opts?)` v7

The order is §3.6's. `LoadedCharacter` gains `nation` (the document) and, on a settlement day, `faction` (the `factions` document).

- `ensureNationDay(content, now)`: `Nation.findById('republic')`; absent → `bootstrapNation`; `settledDay < today` → `ensureCityDay` for every council city, then `settleNationDay`. A throw goes to Sentry and the request goes on (ADR 0017 §5); national acts then refuse `NATION_NOT_READY`.
- ADR 0030's modifier builder adds `lawSourcesOn(nation.laws.inForce ∪ history, day, actor)`.
- `ensureSettled` v7: §8.4.

### 7.2 The guards

| Procedure | Refuses |
|---|---|
| `governor.setRule` | `NOT_GOVERNOR` (the `governor` term re-read in the transaction), `LOCAL_HOLDS`, `RULE_WINDOW_CLOSED` (cycle days 0–1, the order paper `open`), `ALREADY_ON_PAPER`, `UNKNOWN_ORDINANCE` |
| `governor.address`, `president.address` | `NOT_GOVERNOR` / `NOT_PRESIDENT`, `ADDRESS_USED`, `NOT_AN_ISSUE` (a live Issue of the Governor's city; of any open city for the President) |
| `chair.setOrders` | `NOT_CHAIR`, `UNKNOWN_FAMILY`, `PUSH_SLOT` (C), `PUSH_PLACE` (not a capital district or Clearwater), a target other than 25 / 50 / 100 |
| `chair.setLine` | `NOT_CHAIR`, `BILL_NOT_FOUND`, `BILL_CLOSED` |
| `chair.setRule` | `NOT_CHAIR`, `WRONG_CITY` (home, Irongate, Clearwater), `UNKNOWN_ORDINANCE` (the city's menu) |
| `chair.setFixture` | `NOT_CHAIR`, `WRONG_CITY`, `UNKNOWN_FIXTURE` (the three common types and the faction's signature event), `WRONG_DISTRICT` |
| `chair.callEvent` | `NOT_CHAIR`, slice 6's place limits (`ONE_AT_A_TIME`, `BRANCH_HANDS_FULL`), `WRONG_CITY`, `WRONG_DISTRICT`, `UNKNOWN_EVENT_TYPE` |
| `chairElection.stand` | `NOT_NOW`, `RANK`, `LADDER`, `TENURE`, `TERM_LIMIT`, `ALREADY_STANDING`, `NOT_ENOUGH_PC` |
| `chairElection.back`, `nation.back` | `NOT_NOW`, `RANK { need: 2 }`, `ALREADY_BACKED`, `CANNOT_BACK_SELF`, `NOT_ON_BALLOT` (another faction's candidate), `NOT_ENOUGH_PC` |
| `chairElection.vote`, `nation.pickVote`, `nation.vote`, `confidence.vote` | `NOT_NOW`, `RANK { need: 2 }`, `ALREADY_VOTED`, `NOT_ON_BALLOT` |
| `nation.standPresident`, `nation.standList` | `NOT_NOW`, `RANK`, `LADDER`, `TENURE`, `TERM_LIMIT`, `ALREADY_STANDING`, `PLEDGES`, `NOT_ENOUGH_PC` |
| `nation.withdrawPresident` | `NOT_STANDING`, `WITHDRAW_CLOSED` (after term day 20) |
| `parliament.table` | `NOT_DEPUTY` / `NOT_CHAIR` / `NOT_PRESIDENT`, §6.5's reasons |
| `parliament.vote` | `NOT_DEPUTY`, `BILL_NOT_FOUND`, `BILL_CLOSED`, `ALREADY_VOTED` |
| `parliament.veto` | `NOT_PRESIDENT`, `VETO_USED`, `NOT_VETOABLE` (not its signature day; a removal, an override, a strike) |
| `petition.open`, `petition.sign` | §6.9's reasons |
| `confidence.openPetition`, `.sign` | `NO_CHAIR` (the secretary acts), §6.9's reasons |

Every guard is checked twice: before the key, so the client gets a clean refusal, and inside the transaction against the session's read. Every office power re-reads `officeTerms` in its transaction (ADR 0020): the projections (`characters.offices`, `factions.chair`, `nation.government`) are for display only.

---

## 8. API (`apps/server`)

### 8.1 Procedures

Every procedure is protected. No input names the caller's character, faction or residence. `Oid = z.string().regex(/^[0-9a-f]{24}$/)`; `Key = z.uuid()`; `LawId = z.string().regex(/^law\.[a-z-]+$/)`; `FactionId = z.enum(['vanguard', 'collective', 'alliance'])`.

```ts
// The republic
nation.get          ()                                                    → NationView          // bar, chips, sheet rows, TermLine, acts
// Offices
office.mine         ()                                                    → { offices: OfficeCardView[]; ladder: LadderView }
office.governor     ({ cityId: z.string().min(1) })                       → GovernorPageView
office.president    ()                                                    → PresidentPageView
office.chair        ()                                                    → ChairPageView        // read-only for members
governor.setRule    ({ ordinanceId: z.string().min(1), idempotencyKey: Key })      → PoliticalResult (governorRule)
governor.address    ({ issueDocId: z.string().min(1), idempotencyKey: Key })       → PoliticalResult (address)
president.address   ({ issueDocId: z.string().min(1), idempotencyKey: Key })       → PoliticalResult (address)
// The Chair's desk
chair.desk          ()                                                    → ChairDeskView        // NOT_CHAIR for others
chair.setOrders     ({ picks: z.strictObject({ A: z.string().nullable(), B: z.string().nullable(), C: z.string().nullable() }),
                       push: z.strictObject({ slot: z.enum(['A', 'B']), cityId: z.string().min(1),
                         districtId: z.string().min(1).nullable(), target: z.union([z.literal(25), z.literal(50), z.literal(100)]) }).nullable(),
                       idempotencyKey: Key })                             → PoliticalResult (chairOrders)
chair.setLine       ({ billId: Oid, line: z.enum(['for', 'against', 'free']), idempotencyKey: Key }) → PoliticalResult (partyLine)
chair.setRule       ({ cityId: z.string().min(1), ordinanceId: z.string().min(1), idempotencyKey: Key }) → PoliticalResult (partyRule)
chair.setFixture    ({ cityId: z.string().min(1), typeId: z.string().min(1), districtId: z.string().min(1).nullable(),
                       idempotencyKey: Key })                             → PoliticalResult (fixture)
chair.callEvent     ({ cityId: z.string().min(1), districtId: z.string().min(1).nullable(), typeId: z.string().min(1),
                       hours: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]), idempotencyKey: Key })
                                                                          → PoliticalResult (chairCall, view: event)
// The Chair's election and the vote on the Chair
chairElection.get   ()                                                    → ChairElectionView    // the card, the list, the stand card
chairElection.stand ({ platformId: z.string().min(1), idempotencyKey: Key })       → PoliticalResult (chairDeclare)
chairElection.back  ({ candidacyId: Oid, idempotencyKey: Key })                    → PoliticalResult (chairBack)
chairElection.vote  ({ key: z.string().regex(/^(p:[0-9a-f]{24}|n:secretary)$/), idempotencyKey: Key }) → PoliticalResult (chairVote)
chairElection.result ({ termIndex: z.int().optional() })                  → ChairResultView
confidence.get      ()                                                    → ConfidenceView       // the petition and the vote
confidence.openPetition ({ idempotencyKey: Key })                         → PoliticalResult (chairPetitionOpen)
confidence.sign     ({ idempotencyKey: Key })                             → PoliticalResult (chairPetitionSign)
confidence.vote     ({ voteId: z.string().min(1), choice: z.enum(['confidence', 'noConfidence']), idempotencyKey: Key })
                                                                          → PoliticalResult (confidenceVote)
// Parliament
parliament.chamber  ()                                                    → ChamberView
parliament.bill     ({ billId: Oid })                                     → BillPageView         // BILL_NOT_FOUND
parliament.catalogue ()                                                   → CatalogueView        // with the party lines as they stand
parliament.laws     ()                                                    → LawBookView
parliament.bloc     ({ factionId: FactionId })                            → BlocListView
parliament.table    ({ kind: z.enum(['law', 'strike', 'removal']), lawId: LawId.nullable(), replacesLawId: LawId.nullable(),
                       idempotencyKey: Key })                             → PoliticalResult (tableBill | tableRemoval, view: bill)
parliament.vote     ({ billId: Oid, vote: z.enum(['for', 'against']), idempotencyKey: Key }) → PoliticalResult (billVote)
parliament.veto     ({ billId: Oid, idempotencyKey: Key })                → PoliticalResult (veto)
// The national election
nation.election     ()                                                    → NationalElectionView // the candidates, the list, stand cards
nation.standPresident ({ pledges: z.tuple([LawId, LawId]), platformId: z.string().min(1), idempotencyKey: Key })
                                                                          → PoliticalResult (presidentDeclare)
nation.withdrawPresident ({ idempotencyKey: Key })                        → PoliticalResult (presidentWithdraw)
nation.standList    ({ idempotencyKey: Key })                             → PoliticalResult (listDeclare)
nation.pick         ()                                                    → PickView
nation.pickVote     ({ key: z.string().regex(/^(p:[0-9a-f]{24}|n:[a-z.]+)$/), idempotencyKey: Key }) → PoliticalResult (pickVote)
nation.vote         ({ factionId: FactionId, idempotencyKey: Key })       → PoliticalResult (nationalVote)
nation.back         ({ target: z.union([z.strictObject({ kind: z.literal('president') }),
                                        z.strictObject({ kind: z.literal('list'), candidacyId: Oid })]),
                       idempotencyKey: Key })                             → PoliticalResult (nationalBack | listBack)
nation.result       ({ termIndex: z.int().optional() })                   → NationalResultView
// Petitions
petition.get        ({ cityId: z.string().min(1).optional() })            → PetitionView         // the residence city by default
petition.open       ({ idempotencyKey: Key })                             → PoliticalResult (petitionOpen)
petition.sign       ({ petitionId: z.string().min(1), idempotencyKey: Key }) → PoliticalResult (petitionSign)

// Changed
character.me → CharacterView v8 · city.get → CityView v7 · paper.today → PaperView v7 · travel.* (Clearwater open)
· residence.* (Clearwater; the room in any battleground) · council.* (the Governor's line; Clearwater) · chat.channels
(Officers, Clearwater's branch) · events.board (Clearwater; the Town Hall; *called by the Chair*)
```

The national vote names a party (`nation.vote({ factionId })`), not a candidate id: the three candidates are one per party and frozen, so the party is the ballot's unambiguous key and nothing about a figure's npc id leaks into the client's inputs. Refusals are `GameError`s with §7.2's reasons.

### 8.2 Services

**`nationDay.ts`** (ADR 0043):

- `bootstrapNation(content, now, session)`: insert `nation` (`_id` unique; E11000 is success): the current term, the President = the figure of `drawOrderOf(createRng(sha256('nation:' + today)))[0]` (`via: 'bootstrap'`), `parliament.seats` 20 / 20 / 20, `players` 0, the control snapshot, no laws, `world = { settledDay: today, bootstrappedDay: today }`; the three `factions` documents (`chair: null`, nothing set, `secretaryBillIndex: 0`).
- `settleNationDay(content, now)`: each boundary `d` in `(settledDay, today]` in its own transaction, oldest first, ending with `Nation.updateOne({ _id, 'world.settledDay': d − 1 }, { $set: { …, 'world.settledDay': d } })`; a miss aborts and re-reads (another runner did it).
- `processNationBoundary(content, d, now, session)`:

```
nation   = Nation.findById('republic') (settledDay === d − 1, else AlreadySettled)
cities   = City.find(council cities) · districts = District.find({ cityId: 'irongate' })   // all settled for d
factions = Faction.find()
// 1. National Control
ctl = nationalControl(five cities: weight from content; Irongate averageShares(districts), others opinion;
                      unrest = a home city with morale.state 'unrest')
// 2. the party's target of day d − 1
for f: s = standingOn(factions[f].orders, d − 1); if s?.push:
  count = Contribution.aggregate($match scope 'push|f|d−1', $sum amount); pushDays.push({ day d − 1, …, count, met })
  met → news nl.target-met with contributors = the scope's characterIds
// 3. the Chair's petitions closing at d → a confidence vote (votesFrom d, countDay d + 2) when count ≥ needed
//    confidence votes counting at d → removed (term vacatedDay d; factions.chair null; settings cleared) or survived
//    Unrest entered at d (morale.since === d) with a player Chair and no automatic vote this Chair term → open one
// 4. divisions: Bill.find({ status: 'voting', divideDay: d })
//      divideBill(seats from nation.government.parliament, the player deputies' votes, lines, secretary lines,
//                 unrest by home city at d) → bill.division and status (§3.2)
//      removal passed → removePresident(d) (below)
//    enactments: Bill.find({ status: 'awaitingSignature', inForceFrom: d }) → enact → Law.insert, Law.updateMany
//      ends; the projection; pledges kept on the President's term; status 'inForce'
//    expiries: projection rows with toDay === d move to history (news nl.law-expired; nothing written to `laws`)
// 5. nationWork(d, bootstrappedDay): take office (0) · open Chair (9) · close Chair names (11) · count Chair (14)
//    · open the nation (19) · open the picks (21) · count the picks (23) · count the nation (27)
// 6. Monday: a figure President's bill (figureBill) in the President's slot; then secretaryBill
// 7. autoRemovalDue(the President's party's controlShare) → the clerk's removal bill
// 8. news for d (from 1–7 and from petitions closed at d, counts and dissolutions in the cities' boundaries);
//    controlLog $push $slice −60; history pruned to 60 days; news to 14 boundaries; world.settledDay = d
```

- **Take office (term day 0)**: `nationalElections` of term *n − 1* with status `counted` → a player President's `officeTerms` row (`office: 'president'`, `councilKey: 'president:{n}'`, `fromDay: d`, `toDay: d + 28`, `pledges`) or a figure (no row); each seated player's `deputy` row (`seat` = list place); `OfficeTerm.updateMany({ councilKey: { $in: ['president:{n−1}', 'deputy:{n−1}'] }, vacatedDay: null }, { completed: true })`; `Bill.updateMany({ termIndex: n − 1, status: 'voting' }, 'lapsed')`; `government` (President, runner-up, `consecutive`, `parliament`); the election `seated`. With no counted election the government carries over (the bootstrap).
- **`removePresident(d)`**: the runner-up takes office from `d` (`via: 'runnerUp'`); a player runner-up's `deputy` term is vacated at `d` and the seat passes to the next unseated name on that party's list (a player's new `deputy` term from `d`, else a local); the removed player's `president` term is vacated (not completed); `lastRemovalDay = d`; news `nl.removed`.
- **The Chair's count (term day 14)**: `countChair` → the winner's `chair` term (`chair:{f}:{n}`, `fromDay: d`, `toDay: d + 28`); candidacies `elected` / `defeated`; the previous Chair's term completes unless vacated; `factions.chair`; **a change of holder clears** `orders`, `rules` and `fixtures`; news `nl.chair-elected` or `nl.chair-secretary`.
- **The picks (term day 23)**: per faction with a vote, `countPick`; the losing player candidates become `list` candidacies (their President deposit stays spent); the three candidates frozen; status `voting`.
- **The national count (term day 27)**: ballots by `$group` on `votes` (`nation:{n}`); backers per party (`nationalElections.backers`); `nationalScores` with `ctl.controlShare` → `countNation` → per party `partyList` and `seatList` → `result` (scores, w, ballots, turnout, President, runner-up, lists with places, `drawn`); candidacies `elected` (seated at day 0) / `defeated`; news `nl.result`.

**`cityDay.ts` v3** (ADR 0017, 0027, 0048–0050):

- `processHomeBoundary` and `processCapitalBoundary` gain, in this order: **the petition close** (before the division, §8.2 `petitionService.closeInTx`); at the count, **the Governor** (`governorOf`; a `governor` term for a player; `city.council.governor`) and the new order paper's items from `orderPaperItems` (the party's rule from `factions.rules` set on or before `d − 1`, else the branch's motion, `movedBy.kind: 'chair' | 'branch'`); the division with `divide` v3 or `divideBlocs`.
- `processBattlegroundBoundary(content, 'clearwater', d, now, session)` (ADR 0050): the drift on the city's meter → Issues (Monday) → `districtState` on the city → the petition close → the count (`countBattleground` with 7 seats, `listSize` 3; seven terms with `factionId`) → the Governor (the largest bloc) → heroes (*City Hero of Clearwater*) → the next election and order paper (each seated bloc's party rule in seat order) → the close (day 2) → the division (`divideBlocs`, four of seven). `bootstrapBattleground` mirrors `bootstrapCapital` on one meter.
- **The fixture** (slice 6's `ensureFixtures`): a Chair's `factions.fixtures` row for (city, day) wins; Clearwater posts one per faction.

**`governorService`**: `setRule`: in one transaction, the `governor` term (holder me, current, `powers.rule` absent), the order paper (`status: 'open'`, no `governor` item, the ordinance not on it) → `$push items { $each: [item], $position: 0 }`, `powers.rule`; request key. `address`: the term (`powers.address` absent), the Issue (`status: 'live'`, the Governor's city) → `$inc momentum.{f}: 50`, `addPoints` on `points|{docId}` for the Governor, `powers.address`; request key. `president.address` is the same with 100 and any open city.

**`chairService`**: every act re-reads the Chair's `officeTerms` row in its transaction and writes `factions` filtered on `chair.holder.characterId: me`.

- `setOrders`: `rollStanding` (the `next` that has started becomes `current`), then `orders.next = { fromDay: today + 1, picks, push, setBy, setAt }`.
- `setLine`: `bills.updateOne({ _id, status: 'voting' }, { $set: { 'lines.{f}': … } })`.
- `setRule`: `rules` for the city (`$pull` then `$push`), effective from the next order paper (§22.1 Q8); the modal names its weekday.
- `setFixture`: `fixtures` for (city, today + 1).
- `callEvent`: slice 6's `eventService.call` with `calledBy: { kind: 'chair', characterId, name }`, **no sign-up row** and no Energy; the place limits by natural keys; `withRequestKey('chair.call')` replays the modal; the resolve job scheduled after the commit.

**`chairElectionService`** (ADR 0047): `stand` inserts the candidacy (`kind: 'chair'`, `electionId: chair:{f}:{n}`, deposit `held`), `$inc filed` on `factionElections` filtered `status: 'names'`, `pc − 25`. `back`: `candidacies.updateOne({ _id, status: 'filed', 'endorsements.characterId': { $ne: me } }, $push)` and the character (`termBackings.key: { $ne }`, `pc ≥ 10`, version). **The secretary's backing** is slice 3's: when a member's three orders complete in a window where they have a filed Chair candidacy, the same transaction sets `candidacy.branch` (once). `vote`: `votes` insert (unique) and `$inc ballots` filtered `status: 'voting'`.

**`nationalElectionService`**: as the Chair's, with `standPresident` (Rank 6 gate; pledges two distinct catalogue laws; 100 PC; `kind: 'president'`), `withdrawPresident` (days 19–20; `status: 'filed' → 'withdrawn'`; 100 PC back, capped), `standList` (25 PC; `kind: 'list'`), `pickVote` (own faction's ballot, `$inc picks.{f}.ballots` filtered `status: 'pick'`), `vote` (`$inc ballots` filtered `status: 'voting'`), `back` (`president`: `$inc backers.{f}` filtered `status: 'voting'` and a player candidate's `endorsements`; `list`: a standing `list` candidacy of the member's faction).

**`parliamentService`** (ADR 0045):

- `table`: in one transaction, the tabler's office re-read (`deputy:{n}`, the current `chair:{f}:*`, `president:{n}`), `tableGate` with the paper read in the session, the slot (try `r1`…`r3`; E11000 → the next; none → `PAPER_FULL`; the President: `president:{n}:{weekDay}`), `bills.insert`, `pc − 50` for a deputy or a Chair. A removal also writes `nation.government.lastRemovalDay` filtered on the seven-day rule (the only player write to `nation`), so two removals cannot race.
- `vote`: the `deputy` term re-read; `bills.updateOne({ _id, status: 'voting', 'votes.characterId': { $ne: me } }, { $push: { votes } })`; a miss re-reads and names the refusal.
- `veto`: the `president` term (`powers.veto` absent) and the bill (`status: 'awaitingSignature'`, `vetoable: true`, `signatureDay: today`) → `vetoed`; the override bill (`slotKey: 'override:{billId}'`, needs 40, `vetoable: false`) when `overrideFits`; `powers.veto`.

**`petitionService`** (ADR 0049): `open`: the residence city, `petitionGate` (the last close read in the session), `petitions.insert({ _id: 'dissolve:{city}:{today}', count: 1, signatures: [me], closesDay: today + 2 })` (E11000 on the open index → `ALREADY_OPEN`), `pc − 10`. `sign`: `$push signatures` filtered `status: 'open'`, `'signatures.characterId': { $ne: me }`, `$inc count`; `pc − 10`. `closeInTx(cityId, d)` (the city day): `needed = signaturesNeeded(the turnout roll)`; succeeded → `dissolve` (ADR 0049); either way `status`, `needed`, `closedAt`. `confidence.*` mirror it for the Chair (`_id: 'chair:{f}:{chairTermId}'`, Rank 3+, active Rank 3+ members' roll; closed by the nation's day).

**`eventService.resolve`** (slice 6) gains the Town Hall: when the type's `special` is `petitionSignatures` and a dissolve petition of the city is `open`, `$inc count` and `townHall` by `townHallSignatures(band)` in the resolution's transaction.

**Action, mission, travel and held services**: the modifiers carry the laws (§7.1); a matching attempt on a pushed item `$inc`s the member's `push|{f}|{day}` contribution (an upsert on the member's own row) in the action's transaction; `heatGainAt` at a controlled place; `journeyMinutes` at boarding; Clearwater's room and residence as the capital's.

### 8.3 Views

```ts
interface NationView {
  bar: { shares: Record<FactionId, number> /* NC, one decimal */; leader: FactionId; day: DayKey };
  laws: Array<{ lawId; name; daysLeft: number }>;                     // the chips
  cities: Array<{ cityId; name; weight: number; unrest: boolean; shares: OpinionShares;
                  word: 'held' | 'contested' | 'closeRace' | MoraleWord; heldBy: FactionId | null }>;
  term: TermLineView;                                                  // the phase, its until, the next date
  act: { kind: 'vote' | 'candidates' | 'standList' | 'standPresident' | 'pick' } | null;
}
interface TermLineView { termIndex; termDay; phase: NationalPhase; until: number | null; next: { what; day: DayKey } }
interface OfficeCardView { office: Office; title: string /* "Governor of Coalport" */; until: DayKey; consecutive?: 1 | 2;
  pay: { pc: number; fxp: number }; route: string }
interface LadderView { rows: Array<{ office: Office; done: boolean; count?: number; need?: string; opensOn?: DayKey }> }
interface GovernorPageView {
  city: { id; name; hall: HallView; title: 'Governor' | 'Mayor' };
  holder: { kind: 'player' | 'npc'; name; avatarId: string | null; local: boolean; since: DayKey; until: DayKey } | null;
  you: boolean;
  rule: { set: { ordinanceId; name; at: number } | null; until: number | null; menu: RuleRowView[] | null;
          decided: { ordinanceId; passed: boolean; day: DayKey } | null };
  address: { used: { issueShort; day: DayKey } | null; issues: Array<{ docId; name; short; momentum: MomentumView }> };
  pay: { pc: 20; fxp: 30 };
}
interface ChairDeskView {
  orders: { slots: Array<{ slot: 'A' | 'B' | 'C'; current: FamilyView | null /* null: the rotation */;
                           menu: FamilyView[] }>;
            push: PushSpec | null; places: Array<{ cityId; districtId: string | null; name }>;
            fromDay: DayKey | null; today: OrdersView /* as members see them */; target: TargetBarView | null };
  lines: Array<{ billId; law: string; line: LineVote | null; at: number; players: number; localsFollow: 'you' | 'players' }>;
  rules: Array<{ cityId; cityName; ordinanceId; name; fromCouncil: DayKey; menu: RuleRowView[] }>;
  bill: { used: { lawName; day } | null; cost: 50 };
  fixtures: Array<{ cityId; cityName; districtId: string | null; typeId; rotation: boolean; menu: Array<{ typeId; name }> }>;
  events: EventBoardView['here'][];                                    // every open city (slice 6's board per city)
}
interface TargetBarView { count: number; target: 25 | 50 | 100; unit: string /* "doors" */; place: string; met: boolean }
interface ChamberView {
  seats: Record<FactionId, { seats: number; players: number }>; locals: number; president: { name; factionId; figure: boolean };
  term: TermLineView;
  bills: BillRowView[];                                                // the President's first
  decided: Array<{ billId; day; law; kind; outcome: 'passed' | 'failed' | 'vetoed' | 'struck' | 'removed' | 'survived';
                   for: number; against: number; days: number | null }>;   // the last ten
  table: { as: 'deputy' | 'chair' | 'president'; cost: 0 | 50; ok: boolean; why: string | null } | null;
}
interface BillRowView { billId; kind: BillKind; law: { id; name; line; effectLine } | null; strikes: string | null;
  tabledBy: { name; factionId: FactionId | null; kind }; until: number; needed: 31 | 36 | 40; factional: boolean;
  counts: { for: number; against: number }; localLines: Record<FactionId, 'for' | 'against' | 'free'>;
  you: { canVote: boolean; vote: 'for' | 'against' | null } }
interface BillPageView extends BillRowView {
  appliesTo: { kind: 'members' | 'others'; factionId: FactionId } | null; days: number | null;
  removal: { president: string; runnerUp: string; month: string } | null;
  table: BillDivision | LiveCount;                                     // live: players' votes, locals' current lines
  chairLine: { line: LineVote | null } | null;                        // for the Chair
  signature: { today: boolean; canVeto: boolean } | null;              // for the President
  state: 'voting' | 'awaitingSignature' | 'passed' | 'failed' | 'vetoed' | 'struck' | 'removed' | 'survived' | 'lapsed';
}
interface CatalogueView { cost: 0 | 50; affordable: boolean; atCap: boolean; inForce: LawRowView[];
  laws: Array<LawRowView & { lines: Record<FactionId, LineVote>; available: boolean; why: string | null }> }
interface LawBookView { inForce: Array<LawRowView & { daysLeft: number; by: string; passed: { for; against; day } }>;
  catalogue: LawRowView[]; strike: { cost: 50; ok: boolean } | null }
interface ChairElectionView { phase: ChairPhase | 'result' | 'none'; card: ElectionCardView;
  candidates: CandidateRowView[]; secretary: { name; portrait; votes?: number };
  stand: StandCardView | null; yourVote: { name } | null; result: ChairResultView | null }
interface NationalElectionView { phase: NationalPhase; candidates: Array<{ factionId; name; kind: 'player' | 'npc';
  avatarId | portrait; rankTitle?; level?; platform: string; pledges: string[]; canBack: boolean }> | null;
  list: Array<{ key; name; backers: number; place: number; you: boolean; canBack: boolean }>;
  stand: { list: StandCardView | null; president: StandCardView | null }; yourVote: { factionId } | null }
interface NationalResultView { termIndex; stamp: 'toBeConfirmed' | 'final'; scores: NationalScore[];
  w: number; ballots: number; turnout: { voters: number; eligible: number };
  president: { name; factionId; figure: boolean }; lists: Record<FactionId, Array<{ name; seated: boolean; kind }>> }
interface PetitionView { city: { id; name; hall }; open: { id; count; needed: number /* provisional */; until: number;
  signers: Array<{ name; factionId }>; townHall: number; you: 'open' | 'sign' | 'signed' | 'councillor' | 'no' } | null;
  canOpen: { ok: boolean; why: string | null }; last: { outcome: 'dissolved' | 'fellShort'; day } | null }
CharacterView v8 += { offices: Array<{ office; title }>; chairChip: boolean /* Rank 4+ */ }
CityView v7 += { governor: { title: 'Governor' | 'Mayor'; name; local: boolean } | null; word; heldBy: FactionId | null;
                 petition: { count; needed; until } | null; dissolved: { until: DayKey } | null }
OrdersView += { setBy: { name } | null; target: TargetBarView | null; items[].push?: { place: string } }
```

During a vote, no view carries another player's ballot or any count of a secret ballot (ADR 0019): `ChairElectionView`, `PickView`, `NationalElectionView` and `ConfidenceView` carry the caller's own choice only. Bill votes are public by design (the chamber is not a ballot).

### 8.4 The settlement v7 (`computeSettlement`)

1. **Reads added** (each by an index of §5): the member's `factions` document (on a new day); `officeTerms` of every office (the existing read by holder); the member's `push|{f}|{day}` rows for the ended days with a met push; struck Chair candidacies (`deposit: 'due'`, slice 3's read); the personal facts of §11.2.
2. **Stipends** per office per boundary held (`officeStipends`), each a desk line (*Stipend, Chair of the Collective · +20 PC · +40 FXP*), the PC cap applied once by `applyGains`.
3. **The party's target**: +10 Party XP for each ended day whose push was met and where the member contributed (*The party's target, Eastside · +10 Party XP*).
4. **Today's orders**: `startOrders` with `standingOn(faction.orders, today)`, the push templates, the residence kind and the Level; `orders.setBy` when a Chair set them.
5. **The `offices[]` projection** from every current term.
6. **Stored headlines**: §11.2's facts.

### 8.5 Realtime

Nothing new: the Officers channel is slice 6's socket with one more room (`officers:{f}`, joined at the handshake for Rank 4+; a rank change takes effect on the next connect). National results arrive at boundaries and are read on focus.

### 8.6 Test hooks (only with `E2E_TEST_HOOKS`, memory mode)

| Route | Body | Does |
|---|---|---|
| `POST /api/test/term` | `{ termDay: 0..27, next?: boolean }` | moves the test clock to the start of that term day (this term, or the next with `next`) and runs every city's and the nation's days up to it |
| `POST /api/test/nation` | `{ control: Record<FactionId, number> }` · `{ unrest: cityId }` · `{ secretaryBill: true }` | overrides the next control snapshot (consumed once); sets a home city's morale to Unrest at the next boundary; tables the secretary's bill now |
| `POST /api/test/office` | `{ seat: { characterId: Oid \| 'me', office: 'governor' \| 'chair' \| 'deputy' \| 'president', cityId? } }` · `{ record: { characterId: Oid \| 'me', council?: n, governor?: n, deputy?: n } }` | seats a character in an office for the current term (the term row and the projections, through the services' own writers); inserts completed past terms for the ladder |
| `POST /api/test/members` (slice 6, extended) | `+ { rank?: 1..7, deputies?: boolean }` | test members as voters, backers, signers and, with `deputies`, as player deputies of the current Parliament |
| `POST /api/test/parliament` | `{ votes: { billId: Oid, as: Oid[], vote: 'for' \| 'against' } }` | test members vote through `parliamentService.vote` |
| `POST /api/test/clock`, `/api/test/city-day` | unchanged | `city-day` also runs the nation's day |

### 8.7 The dev panel (README "Reviewing with the dev panel")

Each new button calls a hook above, then the existing settle. The panel holds no rule.

- **Term:** *Go to term day …* (0, 9, 11, 14, 19, 21, 23, 27), *Next boundary*.
- **Offices:** *Make me Governor here*, *Make me Chair*, *Make me a deputy*, *Make me President*, *Give me the ladder* (a council term, a Governor's term and a deputy's term completed).
- **Parliament:** *Table the secretary's bill now*, *Ten test deputies vote For / Against*.
- **The republic:** *Collective leads by ten*, *Coalport into Unrest*.
- **Petitions:** *Three test residents sign*.

`GET /api/test/dev/status` adds: the term and term day, the phase, the government (President, seats, players), laws in force, the open bills with counts, the faction's Chair and standing orders, today's push count, the open petition here.

---

## 9. Scheduled jobs (Agenda)

| Job | When | Does | Idempotency |
|---|---|---|---|
| `nation-day` (new) | `every('2 0 * * *', { timezone: 'UTC' })` and at worker start | `ensureCityDay` for every council city, then `settleNationDay` | `nation.world.settledDay` guard; every derived document has a natural key (`chair:{f}:{n}`, `nation:{n}`, `{councilKey, seat, fromDay}`, `slotKey`); the lazy path (`ensureNationDay`) is the guarantee |
| `city-day` (extended) | unchanged (00:01 and at start) | Clearwater; the petition close before the division; the Governor at the count; the order paper's party rules; the Chair's fixtures; it then calls `settleNationDay` too, so a worker that runs one job does both | `world.settledDay` guards |
| `campaign-event-resolve` (slice 6) | unchanged | the Town Hall's signatures in the same resolution | slice 6 |
| `journey-arrive`, `chat-trim` | unchanged | — | — |

**No job per bill, per election or per petition.** Every division, close, count and enactment happens at a City Day boundary (design §2: "no phase has a clock time"), so the daily tidy job and the lazy read path are enough (the slices 4–6 pattern). The President's veto, the Chair's sets and every vote are player acts; nothing else is scheduled.

---

## 10. The result modal: how the breakdown is produced

### 10.1 The political modals (`ResultModal kind: 'political'`, design §12)

Built by each service in its transaction, stored with the request key (`requestLogs`) or on the natural record (the candidacy, the bill), and returned unchanged on a retry. Texts are content (`politics.results`); numbers and names are filled by the server.

| Act | Stamp · headline | Knock-ons | `view` |
|---|---|---|---|
| `chairDeclare` | *You're standing* · *Your name is on the list for Chair* | `pc { before, after: −25 }`, backers 0 of 2 | `chairElection` |
| `chairBack` | *Backed* · *{name} has your backing* (§22.1 Q19) | `pc −10`, the candidate's backers *n of 2* | `chairElection` |
| `chairVote` | *Vote cast* · *Your vote is in* | the count's day | `chairElection` |
| `chairOrders` | *Set* · *The orders are yours* | the three titles, the push (*Eastside · target 50*), *from tomorrow* | `desk` |
| `partyLine` | *Line set* · *The party line is {line}* | the locals who follow (*17 local deputies*), Parliament votes at | `bill` |
| `partyRule` | *Set* · *{ordinance} is the party's rule in {city}* | from which council (*Thursday's council*) | `desk` |
| `fixture` | *Set* · *Tomorrow's event in {city}* (§22.1 Q19) | the type, the district | `desk` |
| `chairCall` | *Called* · slice 6's *call* text with *called by the Chair* | — (no Energy) | `event` |
| `governorRule` | *Set* · *{ordinance} goes to the vote first* | item 1, the council votes at | `office` |
| `address` | *Spoken* · *The Address: {issueShort}* | `issue { name, added: 50 \| 100, momentum: before → after by party }`, *in your name* | `office` |
| `presidentDeclare` | *You're standing* · *Your name is in for President* | `pc −100`, the two pledges | `nationalElection` |
| `presidentWithdraw` | *Withdrawn* (§22.1 Q19) | `pc +100` | `nationalElection` |
| `listDeclare` | *You're standing* · *Your name is on the {faction}'s list* | `pc −25`, your place now | `nationalElection` |
| `pickVote` · `nationalVote` · `confidenceVote` | *Vote cast* · *Your vote is in* | the result's day | `pick` · `nationalElection` · `confidence` |
| `nationalBack` · `listBack` | *Backed* · *{name} has your backing* | `pc −10`; the party's backers *n of 5* or the name's new place (*now 3rd on the list*) | `nationalElection` |
| `tableBill` · `tableRemoval` | *Put to Parliament* · *{law} is up for a vote* / *A vote to remove the President* | `pc −50` (not the President), `needed`, votes until | `bill` |
| `billVote` | *Voted* · *Your vote is recorded* | the live count after your vote (*For 4 · Against 1*: public) | `bill` |
| `veto` | *Vetoed* · *{law} stops at your desk* | `forVotes`, the override's divide day or *the veto is final* | `bill` |
| `petitionOpen` · `petitionSign` · `chairPetitionOpen` · `chairPetitionSign` | *Opened* / *Signed* | `pc −10`, `signatures { count, needed (provisional) }`, until | `petition` · `confidence` |

Every modal has its *Next* line (design §12). No modal shows a percentage for odds; every count is a real number.

### 10.2 Results that are pages, not modals

- **The national result** (`NationalResultView`, screens §7.4): per party ballots, the ballot share, the control share, backers, **score** (one decimal) and seats; `w` and turnout; the President and the runner-up; the lists with who took seats; the stamp *To be confirmed* on day 27, *Final* from day 0. Everything the count used is stored on `nationalElections.result`, so the page is the count, not a recomputation.
- **A bill's count** (`BillDivision`): per party the player deputies' For / Against / not voting and the locals' bloc vote with its reason (*17 locals For (the party line)*, *the player deputies' majority*, *the secretary's line*, *Unrest at home: abstained*), the total against `needed`.
- **The Chair's result** (`ChairResultView`): #, name, backers, votes, support (votes + 3 × backers), the secretary's row with votes only, turnout *n of m*, the tie rule in words.
- **The petition** (`PetitionView`): the signers by name, the townspeople's signatures from Town Halls, the count against `needed` (provisional until the close, final after).

### 10.3 Laws in the action and mission modals

A law is a named source (ADR 0030), so it appears wherever its effect lands, with the kicker *LAW* on its tag:

| Effect | Where it shows |
|---|---|
| `jobPayPct`, `seniorityDays` | the desk's wage line: *Law: Eight-Hour Day Act +22* |
| `ironPct`, `xpPct` | a part on the Iron or XP line: *Free Market Charter +6*, *People's Education Act +9* |
| `swingPct` | a factor on the opinion line: *Press Licensing Act −25 %* |
| `energyDelta`, `missionEnergyDelta`, `trainingEnergyPct` | the ticket's cost tag and the Energy line: *Emergency Permits Act: 17 Energy* |
| `journeyTimePct` | the train card and the journey modal: *Open Borders Act: 19 minutes* |
| `infirmaryCostPct`, `bailPct` | the price line on the held screen: *Universal Care Act −50* |
| `runInPct`, `caughtDelta`, `heatCoolPct` | the ticket's risk tag in words (*Curfew Order · run-ins ×2 until 06:00*) and the Heat line's cooling rate; never a digit of a chance |
| control's Heat rule | the Heat line: *Held by the Collective: Heat +25 %* |

---

## 11. The paper v7

### 11.1 Sections

- ***FROM THE CAPITAL*** (home papers and the Courier) / ***THE REPUBLIC*** (the Herald), under the headlines, **live at read**: `selectNationalLines(nation.news, today, faction, me)` (at most two) and one Courier line for an open window (*The republic votes until {until} · Vote now* / *Names in for Chair until {until}*), a tap opening the screen.
- ***Election***: up to two rows (the council's first; the Chair's or the republic's second).
- **The front page** for a Governor, a Chair, a deputy and the President: slice 3's, on the first edition the holder opens in the term (`officeTerms.frontPageSeenAt`, ADR 0023), the caption naming the office, the CTA *To the office* / *To Parliament*.
- ***Your desk***: a line per office stipend paid; *Law: {name} {effect}* beside the council rule's on the wage and Rested rows; the party's target bonus.
- ***Party orders***: *Set by the Chair, {name}*; the push's tag *the Chair's push · {place}* and the `TargetBar` (the live count).
- ***In Print***: the Address, a bill passed with the member's name, a pledge kept, the Chair, a seat in Parliament, the Governor's chair.
- **The Clearwater Courier**: the residents' paper, and a visitor's while in Clearwater (the Herald's rule).

### 11.2 New headline conditions (design §11.2)

| Condition | Kind | Facts from |
|---|---|---|
| `governorTookOffice` → `hl.*.governor` (front page) | stored | the member's `governor` term starting today |
| `governorLocal` → `hl.*.governor-local` | stored | the member seated today and `city.council.governor.local` |
| `addressGiven` → `hl.*.address` | stored | `powers.address.day = yesterday` on the member's term |
| `chairFiled` → `hl.*.chair-filed` | stored | the member's Chair candidacy filed yesterday |
| `chairElected` → `hl.*.chair-front` (front page) · `chairLost` → `hl.*.chair-lost` | stored | the Chair's count yesterday (the candidacy's status) |
| `chairVoteOpened` → `hl.*.chair-vote` | stored | a `confidence` election of the faction opened today |
| `deputySeated` → `hl.*.deputy-front` (front page) · `listMissed` → `hl.*.list-missed` | stored | day 0: the member's `deputy` term / the member's list candidacy not seated |
| `presidentSeated` → `hl.*.president-front` · `presidentLost` → `hl.*.president-lost` | stored | day 0 / day 27 |
| `pickWon` · `pickLost` → `hl.*.pick-won` · `hl.*.pick-lost` | stored | day 23 |
| `billTabled` · `billPassed` · `billFailed` → `hl.*.bill-*` | stored | the member's bills tabled or divided yesterday |
| `pledgeKept` → `hl.*.pledge-kept` | stored | the President's term's `pledges[].keptDay = today` |
| `petitionOpened` · `petitionFailed` → `hl.*.petition-*` | stored | petitions the member opened or signed yesterday; closed `failed` yesterday |
| `dissolvedCouncillor` → `hl.*.dissolved-councillor` | stored | the member's council term vacated today by a dissolution |
| `pushed` → `hl.*.pushed` | live | today's pushed item that `counts` |
| the Courier's `hl.cw.*` | stored / live | the Herald's conditions with Clearwater's facts (§11.3) |

National lines (design §11.1) are written to `nation.news` by the nation's day from that boundary's facts (counts, divisions, enactments, expiries, dissolutions read from `petitions`, Chair elections and removals, control changes and Clearwater's control from its state) and read live. *Yesterday* for a personal line is the boundary day, as slices 3–6.

---

## 12. Client (`apps/client`) and UI (`packages/ui`)

### 12.1 Routes

| Route | Screen (screens §) | Data |
|---|---|---|
| `/map/nation` (slice 4) | `NationBar`, `LawChips`, the pins' second line, Clearwater open, the republic sheet (§2) | `nation.get` |
| `/me` | `OfficeCard`s and the `LadderCard` (§3) | `office.mine` |
| `/office/governor/$cityId` | the Governor's or Mayor's page (§4.1) | `office.governor` |
| `/office/president` | the President's page (§4.3) | `office.president` |
| `/office/chair` | redirects to `/faction?tab=chair` (§22.1 Q24) | — |
| `/faction?tab=chair` | the Chair's desk for the Chair (Orders · Lines · Events · Members), the read-only Chair's page for Rank 4+ members (§4.2, §5) | `chair.desk` or `office.chair` |
| `/faction/election`, `/faction/election/vote`, `/faction/election/result` | the Chair's election (§7.1) | `chairElection.*` |
| `/faction/confidence` | the petition on the Chair and the vote (§9.3) | `confidence.*` |
| `/parliament`, `/parliament/bill/$billId`, `/parliament/laws` | the chamber, a bill, the law book (§6, §8); sheets: the catalogue, a bloc's list | `parliament.*` |
| `/election/pick`, `/election/pick/vote` | the party's pick (§7.2) | `nation.pick`, `nation.pickVote` |
| `/election/national`, `/election/national/vote`, `/election/national/result` | the candidates and the list, the vote, the result (§7.3–§7.4) | `nation.election`, `nation.vote`, `nation.back`, `nation.result` |
| `/council/petition` | the petition (§9.1) | `petition.*` |
| `/city/clearwater…` | Clearwater as the capital's pattern on one meter (§10) | as slices 1–5 |

- The **Faction tab** gains its sixth chip, **Chair**, for Rank 4+ (`character.chairChip`); the Chat panel gains **Officers** for Rank 4+.
- **Modal gate** unchanged: political acts return their modal directly; nothing national queues a modal (results are in the paper and on the pages).
- After any mutation the client renders the returned view and invalidates `character.me`, `nation.get`, `office.*`, `chair.*`, `parliament.*`, `nation.election`, `petition.get`, `city.get`, `paper.today`.
- **The city view's first quarter** comes from `CityView.landingQuarterId` (the station's quarter), not `quarters[0]` (`apps/client/src/routes/city.tsx:763` today), so Clearwater opens on The Harbour with The Front a teaser at index 0 (§21 #6).

### 12.2 `packages/ui` additions (plain props, no tRPC)

New (screens §1): `NationBar`, `LawChips`, `OfficeCard`, `OfficePage`, `LadderCard`, `ChairDesk`, `OrderPicker`, `PushRow`, `TargetBar`, `LineRow`, `FixturePicker`, `ChamberHeader`, `BlocBar`, `BillRow`, `BillPage`, `TableBillSheet`, `LawBook`, `LawRow`, `PledgeRow`, `NationalBallot`, `PickBallot`, `ListPanel`, `ScoreTable`, `PetitionCard`, `SignatureBar`, `ConfidenceBallot`, `TermLine`. Changed: `Ticket` (the *LAW* tag kind), `ResultModal` (law parts, the Heat line's control factor), `ElectionCard` (two rows; the Chair's states), `CityCard` and `Plate` (the Governor line, the plate word), `OrdersPanel` (*Set by the Chair*, the push tag, `TargetBar`), `Paper` (*From the capital*, two Election rows, the office front pages), `ResultTable` (the secretary's row).

### 12.3 Layout checks (screens §14)

On 375 × 667: the nation map's `NationBar` (44 px) and `LawChips` (36 px) over a map that still covers the rest; the office pages' header (150 px) and first power card above the fold; the desk's strip, kicker and two `OrderPicker` rows with the sticky **Set the orders**; Parliament's header, `BlocBar`, `TermLine` and the first `BillRow` (88 px; the For · Against pair 2 × 44 px never wraps); the catalogue's three `LawRow`s (96 px); the `ScoreTable`'s seven columns in Oswald 11 px, scrolling only below 360 px. Desktop (≥ 1024): two columns (640 + 360) for the office pages and Parliament; the desk as the Faction tab's left column with Chat at the right; centred cards at 640 px; side sheets at 480 px. Reduced motion: sheets fade, stamps appear, the `TargetBar` fills without easing. Matrix: 360 × 640, 375 × 667, 390 × 844, landscape, 1440 × 900.

**Double taps:** every vote, stand, back, table, veto, set, sign and *Speak* button is disabled from the tap until the returned view renders; every mutation's key is made once per tap.

### 12.4 Copy and vocabulary

Screens §15's strings, the thirteen help notes and design §12's modal texts go to `copy.ts`; laws, figures, deputies, Clearwater and the papers are content. The QA vocabulary guards run on every new string with the *The Front* allowance (§4.2). No player-facing string says *whip, Directive, recall, Legislature, National Control, no-confidence, Chancellor, NPC, stand-in, D'Hondt*, a percentage for odds, or a roll. Scores and counts are shown as real numbers (an election is a count: design §15).

---

## 13. Art (ADR 0007, 0015)

| Asset id | Source (`art-direction/mvp/`) | Kind · widths | Used for |
|---|---|---|---|
| `portrait.albrecht` | `portraits/albrecht.png` (880 × 1168, new) | portrait · 256, 512 (the `portrait()` helper, crop from the top as `kessler`) | the Vanguard's own figure: the pick's ballot, the national ballot, the President's page and the front page when the figure holds the office |
| `portrait.brod` | `portraits/brod.png` (880 × 1168, new) | portrait · 256, 512 | the Collective's own figure |
| `portrait.faber` | `portraits/faber.png` (880 × 1168, new) | portrait · 256, 512 | the Alliance's own figure |
| `scene.election-night` | `scenes/election-night.png` (2688 × 1520, new) | scene · 640, 1280 | the republic's result (screens §7.4) and the day-0 front page |
| `scene.event-town-hall` | `scenes/event-town-hall.png` (2688 × 1520, new) | scene · 640, 1280 | the Town Hall event type's `art`: the board card, the event page, the result |
| `scene.presidents-study` | `scenes/presidents-study.png` (2688 × 1520, new) | scene · 640, 1280 | the President's page header (replacing the `scene.ministry` fallback) |
| `scene.parliament` | `scenes/parliament.png` (2688 × 1520, in the folder, **not yet catalogued**) | scene · 640, 1280 | the chamber header, every bill's page, the law book, the bloc sheet. Not bound to the `parliament` location kind (that rung waits for an action in the chamber, art.ts's note) |
| `scene.ministry`, `court`, `square`, `hotel`, `theatre`, `station`, `docks`, `factory-gate`, `market`, `street`, `hospital`, `jail-cell`; `portrait.holm`, `.stahl`, `.grey`; the faction-HQ scenes; the city pictures | existing | — | the Governor's fallback, the Town Hall's venues, Clearwater's nine places by kind, the secretary on the Chair's ballot, the Chair's crop, the Casino's crop |

- **Wiring** (T9): seven catalogue entries in `data/art.ts` with `portrait(...)` and `scene(...)`; `factions[].nationalFigure.portrait` names the three portraits; `event.town-hall.art` names its scene; the views name `scene.election-night`, `scene.presidents-study` and `scene.parliament` by id from content (`content.art.nationScenes = { result, president, chamber }`, so no asset id is hard-coded in the client). Alt texts (≤ 160, drafts for the designer to confirm against the pictures, design §20):
  - `portrait.albrecht`: *Dr Konrad Albrecht: a lean man past sixty with a judge's severity, in a dark overcoat with a velvet collar, a wing collar and gloves.*
  - `portrait.brod`: *Hanna Brod: a woman of fifty with short grey hair, an old tram conductor's cap in her hand, a plain coat and a scarf.*
  - `portrait.faber`: *Professor Emil Faber: a round-faced man of sixty, spectacles pushed up, a bow tie, a gown over one arm and papers under the other.*
  - `scene.election-night`: *A square at night under a newspaper's windows: a man on a ladder chalks figures on a results board, a crowd in hats looks up, a tram waits.*
  - `scene.event-town-hall`: *A packed hall: three chairs and a water jug on a platform, a man on his feet with a question, a woman answering, a reporter at a side table.*
  - `scene.presidents-study`: *A study in the Ministries at dusk: a tall window over the forecourt, a desk with the day's bills and a pen, a wall map of five cities.*
  - `scene.parliament`: *The chamber under the dome: deputies on curved benches with their hands raised under the clock, the clerks' table below.*
- **Crops:** the portraits' head-and-shoulders top offset is chosen in the dev viewer (the slice-5 portraits use 20 or 40); the scenes keep the full frame with a `focus` where the subject is off-centre (the results board, the platform, the desk).
- **Content policy:** checked against design §19–§20 when the pictures are wired: no badge, armband, flag, star, hammer or symbol on any coat, cap, wall, board or drape; the results board shows figures only. The art build's review list records it.
- **Budget:** three portraits (~60 kB at two widths) and four scenes (~0.6 MB at two widths) on top of slice 6's measure; measured after `pnpm art:build` and recorded in the Deviations. No new ADR (ADR 0015's per-slice rule).
- **Maps:** none new. Clearwater's day and night pictures and tiles exist (`map.clearwater.day` / `.night`); the developer draws the three quarter outlines in the dev viewer along the lake shore, the tram lines and the blocks (design §9.1).

---

## 14. Security

| Threat | Guard |
|---|---|
| Acting as an office-holder one is not | Every power re-reads its `officeTerms` row in the transaction (current, not vacated, the holder is the session's character); the projections are display only (ADR 0020, 0048) |
| A vote in a closed window, or after the count read the box | Each vote `$inc`s its election's counter filtered on the open status, which the close or count writes (ADR 0018); a race is a write conflict and a retry that refuses |
| Seeing how anyone voted for Chair, the pick, President or on the Chair | ADR 0019: no view carries another's choice or a count before the count; `votes` rows are never returned; server tests assert it on the wire |
| Double votes, double backing, two candidacies, two bills | Unique `votes {electionId, voterId}`; `termBackings.key` under the version guard; unique `candidacies {electionId, characterId}`; the bills' unique slot, week, tabler and law keys |
| Tabling a sixth law or bypassing the cap | `enact` at the boundary decides the replacement; the paper's limits are unique indexes, not counters |
| A forged party line or rule for another faction | The faction is the session's; the write filters on `factions.chair.holder.characterId` and the term is re-read |
| Removing the President by spam | 50 PC, once a term per member, seven days between motions serialised on `nation.government.lastRemovalDay`, closed on days 0–4 and 24–27, 40 of 60 |
| Petition stacking by moving in | Opening and signing need `residence.votesFromDay ≤ today` (the ballot rule), Rank 2 or 3, 10 PC each, one each; the seven-day gap per city |
| Inflating the party's target | Only real attempts by members with a counting push item write their own contribution row; the sum is read, never written by a client |
| Probing the Curfew's night window or the caught check | Odds are words; the run-in and caught chances are never sent (dev and QA only, as slice 5) |
| A law changing a player's Party XP or odds | The loader refuses `fxpPct` and `chancePct` on laws; a rules test runs every catalogue law against `computeCheck` and the Party XP line |
| Test hooks in production | `E2E_TEST_HOOKS` requires memory mode; test members and seated offices are flagged and left out of the report |

---

## 15. Testing

| Layer | What |
|---|---|
| Rules | §6.12 |
| Content | The real data validates. A failing fixture for every §4.2 check: a law with `fxpPct`, a law outside its bound, a factional law marked 31, an ordinance with `appliesTo`, weights not summing to 1, a teaser landing, a push template in the rotation, two templates of one family for one residence, a Town Hall venue of the wrong kind, a Clearwater pin off its survey point. Word-for-word comparisons with both design documents (laws, figures, platforms, preferred laws, Clearwater's places, actions, texts, jobs, missions, slate, Issues, the national and personal lines, the Courier, the modals, the help notes, chapter 3). The vocabulary guards with *The Front* |
| DB | The seven collections' indexes; migration 009 twice; the partial unique indexes refuse a second open petition, a second voting bill for one law, a fourth regular slot; a transaction over `nation`, `factions`, `bills`, `laws`, `officeTerms`, `nationalElections`, `candidacies`, `votes`, `characters` commits |
| Server — the nation's day | bootstrap on term days 0, 10, 20 (windows already open skipped); one boundary at a time with every city first; four runners in parallel settle each boundary once; the worker down for three days, caught up by a read; control's snapshot equals the rules' figure from the stored meters |
| Server — the Governor | at a home count a second-termer beats a first-term top councillor; the capital's Mayor from the largest bloc; Clearwater's; a local; the rule as item 1 and the locals' chain at the division; four *None of these*; the Address once a term, attributed |
| Server — the Chair | stand, back, the secretary's backing on orders done, the small rule, struck and refunded, the vote, the count with the secretary winning, a player winning; the term from day 14; standing orders read by a member's next settlement (and not today's); the push at Level 9 and 10; the target met and the +10 Party XP once per member per day; settings cleared at a change; the call from another city with no sign-up; the Officers room |
| Server — Parliament | table in each power (the President's week, a deputy's term, a Chair's term), the slot race (four tablers at once → three bills and `PAPER_FULL`), the law race (two bills for one law → one); votes; lines; the division with the chain, Unrest and *free*; the signature day and the veto racing the enactment at the boundary (one wins, never both); the override at 40; a strike; the cap with and without a named law; a renewal; the failed week; the lapse at day 0; the secretary's and the figure's Monday bills |
| Server — the national election | names, withdraw with refund, the pick (with and without a vote), the vote (secret on the wire), backing, the count with the worked examples, lists and seats, provisional on day 27, office at day 0, two terms in a row, a figure President |
| Server — removals and petitions | a removal passing with test deputies: the runner-up from the division, their deputy seat passing down; the clerk's motion at a control share of 24 % and not at 26 %; a petition opened on cycle day 1 that dissolves the council at day 3 (the passed rule struck, terms vacated, the Governor's chair to a local, no stipend after); a Town Hall adding 2; a petition on the Chair and the vote removing at two thirds; the automatic vote on entering Unrest once per Chair term |
| Server — laws in play | each catalogue effect through the real services: a wage, a mission's cost and XP, a journey's minutes, a run-in at 20:00, a walk-out, a bail, a fade across a law's end, a caught check against the Vanguard, Heat cooling for a member; a factional law not touching non-members |
| Server — Clearwater | the bootstrap; the boundary (drift, states, Issues, the count with seven seats, the Governor, the division with four); travel, residence, the room, jobs, missions with the pool, the Heat rule under control; the Courier |
| Server — the settlement and the paper | stipends for every office (and two at once), a vacated term, a local; the push bonus over a three-day absence; each §11.2 headline from its facts; the national section's two lines and the window line |
| Server — integration (T22) | **a whole term on the test clock** with three players and test members: a Governor's week, a Chair's election and desk, a bill through the division and the signature day, the national names, pick, vote, count and day 0; a petition; a removal; with the worker off for a week in the middle. Run ten times in a row |
| UI | fixtures for every new component and state (screens §13's empty states included) |
| E2E | §15.1 |

### 15.1 E2E specs (each in its own Playwright project after slice 6's, in this order; all on the test clock)

**`governor.spec.ts`** (phone): a Collective councillor with a completed term (hook) at the Coalport count → the front page *ELECTED* · *elected Governor of Coalport*; the office page → **Choose the rule** → *Public Works Order* → *goes to the vote first*; the order paper shows it as item 1; **Speak on {issue}** → *Spoken*; the next boundary: *Council Passes Public Works Order*; the plate reads *Governor: {name}*.

**`chair.spec.ts`** (phone): term day 9 (hook); a Rank 4 member with a council term **Stand for Chair · 25 Political Capital**; a test member backs; the member's orders done → *the branch backs you*; day 11 → **Vote now** (the secretary's row present); day 14 → *Chairs the Collective*; the desk: three picks, the push *Eastside · target 25*, **Set the orders** → *The orders are yours*; next day a Level 10 test member's Orders panel reads *Set by the Chair, {name}* and *Talk to voters in Eastside, Irongate*; test members' actions there fill the `TargetBar`; the boundary → +10 Party XP on the desk; *Coalport into Unrest* (hook) → *A Vote on the Chair* in the paper → test members vote No → *{secretary} acts until the next election*.

**`nation.spec.ts`** (phone, then desktop): the ladder by hook; term day 19 → **Stand for Parliament** and (another context) **Stand for President** with two pledges; day 21 → the pick with the figure's row (*run by the game*) → **Choose**; day 23 → the three candidates, **Vote for {name}**, **Back · 10 Political Capital**; day 27 → the result *To be confirmed* with the `ScoreTable`; day 0 → *Final*, the front page, `/parliament` with the player deputy; **Put a law to Parliament** → *Eight-Hour Day Act* → *up for a vote*; the Chair sets the line *For*; three boundaries → *{name}'s Eight-Hour Day Act Passes*; the signature day; the next boundary → the law book shows it and the desk's wage line reads *Law: Eight-Hour Day Act +22*.

**`removal.spec.ts`** (phone): a player President (hook) and ten test deputies; a deputy tables **A vote to remove the President**; test deputies vote For to 40 → the next morning *Parliament Removes {president}* and the runner-up on the President's page. A second run: a vetoed bill's override falls short at 36 → *{president} Vetoes {law}* and the bill's stamp *Vetoed*.

**`petition.spec.ts`** (phone): Clearwater residents (test members); cycle day 1 → **Petition to dissolve the council · 10 Political Capital**; two sign; a Town Hall (hook: start now, forced Success) adds 2; the close → *Clearwater Council Dissolved by Petition*; a councillor's paper *Your seat ends today, the term uncompleted*; the plate *Dissolved: local candidates sit until {weekday}*.

**`clearwater.spec.ts`** (phone): a Level 10 player boards (**Board · 20 Iron · 25 min**); the arrival → The Harbour with the station pin; The Front's lock line; **Register in Clearwater · 500 Iron**; a canvass at the fish quay (difficulty 10, odds words); a mission at the Tram Depot; the Courier on the paper tab; the count (term clock) with seven seats in the `DistrictResultTable`'s shape and *Governor: …* under it.

### 15.2 Playtest report: the nation (design §18 Q14)

`pnpm report:playtest` gains a **nation** section beside slice 5's risk and slice 6's together sections: a pure builder in `packages/db/src/nation.ts` with fixture tests, reading `officeTerms`, `candidacies`, `factionElections`, `nationalElections`, `bills`, `laws`, `factions`, `petitions`, `contributions`, `characters` and `actionLogs` (test members and boosted testers left out).

- **Offices:** per term, seats held by players against locals for each office (councillors, Governors, Chairs, deputies, the President); several offices at once.
- **Parliament:** bills tabled by players vs secretaries and figures; pass rates by tabler and by needed (31 / 36 / 40); laws in force per day; party lines set per bill; vetoes and overrides.
- **The Chair:** election turnout (*n of m*), the secretary's wins, the push's target hit rate by target, standing orders' age (Appendix C #69's stale push).
- **The national election:** candidates per party, the pick's turnout, ballots and `w`, backers, the score split between ballots and control.
- **Clearwater:** residents, ballots per cycle, control and close-race days.
- **Petitions and removals:** opened, signatures, Town Hall additions, dissolutions; removal motions (player and clerk) and outcomes; votes on the Chair.
- **The question:** **the return rate of a player in the week after losing an office** (a seat lost at a count, a Chair or President removed, a council dissolved) **against one who kept it**, and how many losers stood again in the next window.

---

## 16. QA playtest checklist (the slice question, in play)

Run on `pnpm dev:mem` with the dev panel and the term hooks; testers in one faction where possible, test members for the rest.

- [ ] **A Governor's week:** the front page; one tap for the rule; the Address; the council passes it; the plate and the wage show it. Three taps in five days.
- [ ] **Standing for Chair:** the stand card's ticks; backers; the secretary's backing after the orders; the vote with the secretary on the ballot; the result.
- [ ] **The Chair's desk:** five taps set the orders and the push; the next morning every member reads *Set by the Chair*; away for a week, the orders still repeat; the target met pays everyone who knocked.
- [ ] **Parliament:** a deputy's bill in two taps; the party line in one; the count's reasons in words; the law on a ticket the morning it is in force; the veto on the signature day.
- [ ] **The national election:** stand, the pick, the vote, the result *to be confirmed tomorrow*, office at day 0; nothing asks anyone to be online at a time.
- [ ] **Losing it:** a seat lost, a Chair removed, a council dissolved, a President removed: every loss in the paper with the next thing to do.
- [ ] **Clearwater:** the train, The Harbour, The Front's lock line, registering, a room, a mission, the Courier, the seven-seat count.
- [ ] **Locals and figures:** every list says who is run by the game; the chamber shows *Local deputies: n of 60*.
- [ ] **Being away costs nothing:** a deputy, a Chair and a Governor away for a term keep their stipends and nothing is taken; their duties fall to the defaults.
- [ ] **Vocabulary:** no *whip, Directive, recall, Legislature, National Control, Chancellor* anywhere; *The Front* reads as a lake front.
- [ ] **Does holding office feel powerful, and does losing it make players want to fight back?** Ask:
  - Which office changed your game most, and how did you know it had?
  - Did you notice a law on your tickets before you looked for it?
  - When you lost an office, what did you do next?
  - Did the locals and the party's own figures feel like opponents or like furniture?

---

## 17. Risks

| Risk | Mitigation |
|---|---|
| **A 28-day term is hard to playtest locally** | The term hooks (§8.6) and the dev panel's *Go to term day …*; the integration suite plays a whole term; the e2e specs step the clock |
| **The nation's boundary transaction** (control, divisions, enactments, counts, office) grows | Each boundary does at most one count; the largest is day 0 (≤ 61 term rows) or 27 (three lists). Measured in T22's worker-down run; the fallback splits the steps into guarded transactions with a step marker on `nation.world` |
| **Ordering**: the nation must read every city after its boundary | `settleNationDay` calls `ensureCityDay` for every city first; the job runs at 00:02; a test settles cities in random order and checks the snapshot |
| **The read path grows** (one more read per request; the faction document once a day) | `nation` is one `_id` read replacing nothing; measured in T11 (the p95 of `character.me` stays within 10 % of slice 6) |
| **Two council paths diverge** (home, capital, Clearwater) | One generalised count (`countBattleground`) and division (`divideBlocs`) with parameters; slice 3 and 4 tests pin the old behaviour |
| **The local deputies' chain decides almost every bill at low population** | It is the design (§7.2 *what passes by itself*); the chamber says why each bloc voted; the report counts players vs locals |
| **A law in force changes many functions at once** | Each new kind touches exactly one function (§6.6) with a test against economy §21.3; the loader keeps laws off Party XP and odds |
| **Day-constant modifiers meet the Curfew's night window** | The window is an explicit flag read at the act's time (ADR 0044); the ticket shows *until 06:00* only at night |
| **The removal's trigger and Unrest's half weight read ambiguously** | Built on defaults (§22.1 Q11, Q12) with tests at the edges; one constant each to change |
| **Transcription volume**: Clearwater (9 places, 24 actions, 45 texts, 4 missions, 3 jobs, 9 candidates, 6 Issues, the Courier ~38 lines), 13 laws, 24 national and 22 × 5 personal lines, ~180 copy strings, 13 help notes, chapter 3 | Word-for-word tests against the design documents; the designer transcribes the personal lines' other voices (design §11.2) in the content change |
| **Missing content blocks the loader** (the 24 local deputies, the Town Hall's and Clearwater's event venues, the push and Clearwater order templates) | §22.1 Q1–Q5 with defaults the developer can build against; the content task's *Done when* names them |
| **Several offices at once concentrate power** at scale | Allowed by design (Appendix C #65); the report counts it; the lever is in the design |

---

## 18. Idempotency and atomicity summary

- **Votes (the Chair, the pick, the republic, the vote on the Chair):** unique `votes {electionId, voterId}` + the election's counter `$inc` filtered on its open status, in one transaction with the request key (ADR 0018, 0019).
- **Standing:** unique `candidacies {electionId, characterId}` + the election's `filed` counter filtered on `names` + `pc ≥ cost` and the version; withdraw: `filed → withdrawn` with the refund.
- **Backing:** the candidacy's `endorsements.characterId: { $ne }` and status + the character's `termBackings.key: { $ne }`, `pc ≥ 10`, the version.
- **Tabling:** the bill's unique `slotKey` / `lawId` / `tablerKey` partial indexes + `pc ≥ 50` and the version; a removal also the `lastRemovalDay` guard on `nation`.
- **Bill votes and lines:** `votes.characterId: { $ne }` and `status: 'voting'` on the bill; a line is a `$set` to a target state.
- **The veto:** the term's `powers.veto` absent + the bill's `status: 'awaitingSignature'`, `vetoable`, `signatureDay: today`; the override's `slotKey` unique.
- **The Governor's rule and the Addresses:** the term's `powers.rule` / `powers.address` absent; the order paper's `status: 'open'` and no `governor` item; the Issue's `status: 'live'`.
- **The Chair's sets:** `$set`s to a target state on `factions` filtered on the Chair; the request key replays the modal.
- **Petitions:** the open petition's unique partial index (dissolve) or natural `_id` (the Chair's) + `signatures.characterId: { $ne }`, `status: 'open'`, `pc ≥ 10`.
- **Boundaries:** `nation.world.settledDay: d − 1` → `d` (and the cities' as ADR 0017); every derived document has a natural key; a second runner aborts and re-reads.
- **Settlement credits:** the stipends and the push bonus inside the character's `day.settled` guard (ADR 0020): paid once whoever reads first.
- **Request kinds** added: `governor.rule`, `governor.address`, `president.address`, `chair.orders`, `chair.line`, `chair.rule`, `chair.fixture`, `chair.call`, `chairElection.stand`, `chairElection.back`, `chairElection.vote`, `confidence.openPetition`, `confidence.sign`, `confidence.vote`, `parliament.table`, `parliament.vote`, `parliament.veto`, `nation.standPresident`, `nation.withdrawPresident`, `nation.standList`, `nation.pickVote`, `nation.vote`, `nation.back`, `petition.open`, `petition.sign`.

---

## 19. Deliberately left out of slice 7

| Left out | Why / where |
|---|---|
| Ministers and the Speaker | GDD §15.7, §25: launch + 60 days |
| The 24-hour audit that can overturn a national result | Slice 9 (anti-abuse); slice 7 prints *to be confirmed tomorrow* and changes nothing on day 27 |
| Legacy (President 40, pledges 10, survived 10), the Season Score, laws expiring at the Season rollover | Slice 8 |
| The candidate's CHA and Legacy appeal (+5) on the national score | Slice 8 (the Wardrobe and Legacy) |
| The Front's places (the promenade, the casino, the lido, the pier hotel) | Slice 8, with the Wardrobe and the villa (design §9.1) |
| Faction switching (tenure resets, offices vacated, PC halved) | Not built in the MVP's slices so far; tenure counts from joining |
| A second fixture at the Chair's hour (Appendix C #60) | Design §4.4: a Chair who wants an evening event calls one |
| The direct coast line Coalport–Clearwater | Appendix C #8 closed: scenery |
| A snap election after a dissolution | Design §10.1 (Appendix C #68) |
| Free text by a Chair (orders, lines) | Design §4.2: the secretary writes the lines |
| Removing a Governor except by petition | GDD §15.9 |
| Hosting, Atlas and deploying the worker | Local only until the end |

---

## 20. Task list (in order; each task leaves `pnpm lint typecheck test` green and is one commit)

**Before T1:** slices 5 and 6 are built and their Deviations are read (the names this design leans on: `heat`, `held`, `addHeat`, `runInChance`, `caughtChance`, `bailFor`, `walkOut`, `liveMarks`, `missionTarget`, `missionEnergy`, `campaignEvents`, `eventService.call/resolve`, `ensureFixtures`, `fixtureFor`, `channelsOf`, the socket's rooms, `contributions`' faction scopes). The designer's answers to §22.1 Q1–Q5 are in, or the defaults are taken. The seven pictures are in `art-direction/mvp/` (they are).

**Parallel lanes.**

- **Phase A:** T1 first. T2, T3 and T4 need T1 and run in parallel. T5 needs T1 (alongside T2–T4). T6 needs T4's and T5's types. T7 and T8 need T6 and run in parallel. T9 runs alongside T6–T8. T10 needs T5's types and runs alongside T6–T9.
- **Phase B:** T11 first. T12 and T14 start after T11, in parallel. T13 needs T12. T15 needs T11. T16 needs T14 and T15. T17 needs T15. T18 needs T15 and T17. T19 needs T12, T13 and T14. T20 needs T13–T19. T21 starts with T11 and grows with each task. T22 last.
- **Phase C:** UI T23 can start after T5, on fixtures, alongside phase B. T24 needs T11 and T12; T25 needs T13 and T18; T26 needs T14, T16 and T19; T27 needs T15 and T18; T28 needs T17; T29 needs T19 and T20. Then T30 and T31.

### Phase A — rules, content, art, db

**T1. Rules: the term and the ladder.** §6.1's constants, `term.ts`, `ladder.ts` (`standGate`, `ladderRows`, `termsWeight`, `stipendOf`, `officeStipends`, `governorOf`). *Done when:* §6.12's term, ladder and Governor tests pass, and term day 0 is a Monday for 200 terms.

**T2. Rules: National Control and the counts.** `national.ts`: `nationalControl`, `nationalScores`, `countNation`, `partyList`, `seatList`, `countPick`, `countChair`, `closeChairNames`, `confidenceResult`, `signaturesNeeded`, `autoRemovalDue`. *Done when:*
- the baselines give 23.5 each;
- design §6.3's three worked examples pass to the decimal, including **25 / 20 / 15**;
- the Chair's and the pick's tie levels each have a test.

**T3. Rules: Parliament.** `parliament.ts`: `billNeeded`, `billDays`, `tableGate`, `localVote`, `divideBill`, `removalSecretaryLines`, `lawsOnDay`, `enact`, `secretaryBill`, `figureBill`, `vetoOpen`, `overrideFits`. *Done when:*
- design §7.2's *what passes by itself* reproduces (four laws at 40, the rest fail, the Vanguard Chair's 40);
- every `tableGate` refusal and every link of the chain have a test;
- `enact` covers a renewal, a replacement and the cap.

**T4. Rules: laws as effects.** `laws.ts` (the DSL, `LAW_BOUNDS`, `lawSource`, `lawSourcesOn`), `ModifierSource.kind: 'law'`, and the seven kinds in their functions (§6.6): `rewardShares.xp`, `missionEnergy`, `journeyMinutes`, `runInChance`, `walkOut`, `liveMarks(fadeDaysOn)`, `caughtChance`; the place factor `heatGainAt`; `ordinanceTags` for laws. *Done when:* every economy §21.3 number in §6.12 passes, the fade is monotone across a law's end, and every slice 3–5 rules test passes unchanged.

**T5. Rules: councils, orders, events, the paper; types.** `divide` v3, `divideBlocs`, `countBattleground`, `orderPaperItems`, `partyRuleOf`; `orders.ts` v3 (`standingOn`, families, the push, `pushCounts`, `pushTitle`); `townHallSignatures`, `chairCallGate`, `petitionGate`, `chairPetitionGate`; `selectNationalLines` and the national conditions; §6.11's and §8.3's types and errors. *Done when:* the councils', orders', events' and paper's tests of §6.12 pass, slice 3 and 4 council tests pass through the generalised functions, and `pnpm typecheck` is green across the repo.

**T6. Content: schemas, accessors, cross-checks.** §4.1–§4.2, the `GameContent` accessors, a failing fixture for each check. *Done when:* every §4.2 check has a failing fixture and the existing content validates (the new arrays empty or defaulted until T7–T8).

**T7. Content: Clearwater.** `data/cities/clearwater.ts` (three quarters with frames and The Front's teaser, nine places, 24 actions, 45 outcome texts, the Casino, the Courier), jobs, missions, the nine candidates, six Issues and `tram-fares`' entry, the Clearwater rotation of orders, `nation.ts` (open, line, no own baseline), the Courier's headlines (§11.3.1 and the rest of its set from the designer). *Done when:* the word-for-word tests against design §9 and §11.3 pass, every pin equals `mapPins.clearwater`, the baseline is 22 / 22 / 22 / 34 and the weights sum to 1.

**T8. Content: the nation.** `data/laws.ts`; the factions' figures, pick names, Chair platforms, preferred laws, local deputies and houses; `family` on the rotation templates and the push templates; the Town Hall and the venue rows (§22.1 Q5); national lines; personal lines in five papers; design §12's modals and §22.1 Q19's; screens §15's copy and the thirteen help notes; chapter 3 and `keep.deposit-receipt`; the *The Front* allowance. *Done when:* the word-for-word tests against both design documents pass, the loader computes 31 / 36 as the design's *Needs* column, and both vocabulary guards pass.

**T9. Art.** The seven catalogue entries of §13 (three portraits, three new scenes, `scene.parliament`), `nationalFigure.portrait`, the Town Hall's `art`, `content.art.nationScenes`, `pnpm art:build`, the budget measured and recorded. *Done when:* `art:check` passes, the dev viewer shows all seven with their crops, and the designer has confirmed the alt texts and the content-policy read (no symbol on any coat, wall, board or drape).

**T10. DB.** The seven models and their indexes (§5.1–§5.7), the changed fields and enums (`officeTerms`, `candidacies`, `cities`, `elections`, `ordinances`, `contributions`, `campaignEvents`, `chatMessages`, `requestLogs`, `characters`), migration 009. *Done when:* migration 009 run twice changes nothing the second time, each partial unique index refuses its duplicate in a DB test, and a transaction over every new collection commits on the memory replica set.

### Phase B — the server

**T11. Server: the nation's day.** `bootstrapNation`, `settleNationDay`, `processNationBoundary`'s skeleton (control, `news`, `controlLog`, the laws' projection and expiries), `ensureNationDay` in `loadCharacter`, laws as sources in ADR 0030's builder for every action, mission, wage, journey, held price and Heat day, the `nation-day` job, `nation.get`, `parliament.laws` (empty), `NATION_NOT_READY`. *Done when:*
- every slice 1–6 server test and e2e spec passes unchanged;
- a bootstrap on term days 0, 10 and 20 skips the windows already open;
- four runners settle a boundary once, and a three-day gap is caught up by one read;
- a law inserted by a test reaches a ticket, a result modal and a wage the next day.

**T12. Server: Clearwater.** `processBattlegroundBoundary`, `bootstrapBattleground`, `countBattleground` and `divideBlocs` in the city day (the capital switched to them), travel open, residence and the room, jobs, missions and the run-in pool, Issues, `heatGainAt` for districts and Clearwater, the Courier's paper, the fixtures and branch channel (§22.1 Q6). *Done when:* Clearwater's server tests of §15 pass, and the capital's slice-4 count tests pass through the generalised functions.

**T13. Server: the Governor and the councils v3.** `governorOf` in every count (home, capital, Clearwater), the `governor` term and `city.council.governor`, `governor.setRule`, `governor.address`, the order paper's items (`orderPaperItems` with the Chair's rules from `factions`), `divide` v3 and `divideBlocs` with the chain and four *None of these*, `office.governor`. *Done when:* the Governor's server tests of §15 pass, including a second-termer passed over a first-term top councillor and the locals voting the Governor's rule.

**T14. Server: the Chair's election.** `factionElections` opened, closed and counted by the nation's day; `chairElection.*`; the secretary's backing hook in the orders' completion; the small rule faction-wide; struck deposits; the `chair` term and `factions.chair`; settings cleared at a change. *Done when:* the Chair's election tests of §15 pass, including the secretary winning a tie of votes against a player with no backers counted, and the ballot's secrecy on the wire.

**T15. Server: Parliament and laws.** `parliament.*` (chamber, bill, catalogue, laws, bloc, table, vote), the divisions and enactments in the nation's day with the chain, Unrest and the lines read from the bills, strikes, the cap and renewals, the failed week, the lapse at day 0, the secretary's and the figure's Monday bills. *Done when:* Parliament's server tests of §15 pass, including four tablers racing for three slots and the law-in-play tests for all thirteen laws.

**T16. Server: the Chair's desk.** `chair.desk`, `setOrders` (with `rollStanding`), the push and the party's target (the member's contribution row in every action and mission transaction, the nation's day's result, the settlement's +10), `setLine`, `setRule`, `setFixture`, `callEvent` (no sign-up), `office.chair`, the Officers channel. *Done when:* the desk's tests of §15 pass, including a member's orders the next day, the target met once, and a Chair's call from another city.

**T17. Server: the national election.** `nationalElections` through names, the picks, the vote and the count in the nation's day; `nation.election`, `standPresident`, `withdrawPresident`, `standList`, `pick`, `pickVote`, `vote`, `back`, `result`; taking office at day 0 (terms, the projection, the lapse); a figure President; two terms in a row. *Done when:* the national election's tests of §15 pass, including design §6.3's examples end to end and the provisional day.

**T18. Server: the President's powers and removals.** `office.president`, `president.address`, `parliament.veto` and the override, pledges kept, removal bills (a player's and the clerk's), `removePresident` with the runner-up and the deputy seat passing down. *Done when:* the veto racing the enactment resolves one way in ten runs, a removal at 40 seats the runner-up at the division, and the clerk's motion fires at 24 % and not at 26 %.

**T19. Server: petitions, the Town Hall and the vote on the Chair.** `petition.*`, the close in the city day before the division and the dissolution, the Town Hall's signatures in `eventService.resolve`, `confidence.*`, the automatic vote on entering Unrest, the removal of a Chair. *Done when:* the petitions' and removals' tests of §15 pass, including a dissolution that strikes a passed rule and stops the councillors' stipends.

**T20. Server: the settlement and the paper v7.** `officeStipends`, the push bonus, the struck Chair deposit, the `offices[]` projection, today's orders with `setBy` and the push; the national section and the window line; personal lines; front pages for every office; the Courier; the desk's lines; *In Print*. *Done when:* each §11.2 headline is produced from its facts in a test, a member away three days gets three days' stipends and push bonuses once, and the national section shows at most two lines.

**T21. Server: test hooks and the dev panel.** §8.6–§8.7. *Done when:* `devPanel.test.ts` covers each new button and status field, and every hook is absent without `E2E_TEST_HOOKS`.

**T22. Server: the integration suite.** §15's whole term on the test clock with the worker off for a week in the middle. *Done when:* it passes ten times in a row and the largest boundary transaction's time is recorded in the Deviations.

### Phase C — the client, e2e, report, docs

**T23. UI package.** §12.2's components and changes with fixtures and smoke tests (screens §13's empty states included). *Done when:* each fixture test passes and the existing UI tests pass.

**T24. Client: the nation map and Clearwater.** `NationBar`, `LawChips`, the pins' second line, the republic sheet, the city card's Governor line and plate word; Clearwater's city (the landing quarter, The Front's lock, outlines, the quarter bar, the Election card, residence and room, the Courier). *Done when:* `clearwater.spec.ts` passes and the nation map's layout check at 375 × 667 passes.

**T25. Client: the Me tab and the office pages.** `OfficeCard`, `LadderCard`, `/office/governor/$cityId`, `/office/president` (pledges, the week's law, the veto card, the Address sheet). *Done when:* `governor.spec.ts` passes and the office pages' layout checks pass.

**T26. Client: the Chair.** The Faction tab's **Chair** chip and the desk (Orders, Lines, Events, Members), the read-only page, the Chair's election screens, the petition on the Chair and `ConfidenceBallot`, the Officers chip. *Done when:* `chair.spec.ts` passes and the desk's layout check (two pickers and the sticky button above the fold) passes.

**T27. Client: Parliament and laws.** `/parliament`, the bill's page with the count table and the veto card, the catalogue sheet, the bloc sheet, the law book, *LAW* tags on tickets and lines in modals. *Done when:* `removal.spec.ts` passes and `nation.spec.ts` passes from the tabling to the law on the wage line.

**T28. Client: the national election.** `/election/pick…`, `/election/national…` (candidates, list, stand cards with the pledge picker, the vote, backing), the result with `ScoreTable` and its two stamps. *Done when:* `nation.spec.ts` passes end to end, phone and desktop.

**T29. Client: the paper and petitions.** *From the capital* / *The republic*, two Election rows, the office front pages, the desk lines, the orders' *Set by the Chair* and `TargetBar`, `/council/petition` and the Election card's petition line. *Done when:* `petition.spec.ts` passes and the paper's fixtures for each new row pass.

**T30. E2E, vocabulary, report.** The six Playwright projects after slice 6's, the vocabulary test over slice-7 strings (*The Front* allowed; *whip, Directive, recall, Legislature, National Control, no-confidence, Chancellor* refused), §15.2's *nation* section with a pure builder. *Done when:* the whole e2e suite is green locally and a report run after it prints every *nation* line.

**T31. Docs.** The README (the term hooks, the new buttons; walk-throughs: a Governor's week, standing for and being Chair, a bill from tabling to a ticket, a national election in an afternoon on the test clock, a petition, Clearwater), the **Deviations** section at the end of this file, ADR statuses, the plan's §5 row for slice 7 (§23 #1), the GDD edits for any answered §22.1 question that changes a number. *Done when:* the README's steps reproduce each walk-through from a fresh `pnpm dev:mem`.

---

## 21. Answers to the design's questions (design §18)

1. **The term epoch.** `TERM.epochDay = 20_458` in `packages/rules` (Monday 5 January 2026, the Issues' Monday epoch), **a code constant, not a deploy-time setting**: rules has no configuration, the term number keys stored documents, and a deploy that picked another Monday would renumber every term (ADR 0043). `termOf(day)` is pure, like `cycleOf`. There is no separate `nationalTerm` document: the current term lives on the one `nation` document (`term`, `government`), and per-term records are keyed by the term number (`nationalElections` `nation:{n}`, `factionElections` `chair:{f}:{n}`, `bills.termIndex`, `officeTerms` `deputy:{n}` / `president:{n}`). The Season (slice 8) is three terms from the same epoch.
2. **Collections.** As suggested, with these changes:
   - `laws` as suggested (plus `endedDay` and `endedBy`), with a projection on `nation` for the read path;
   - `nationalElections`, one per term, with the three picks embedded; the ballots stay in slice 3's `votes` (the numbered box, ADR 0019); the candidacies in slice 3's `candidacies` with a `kind`;
   - **`petitions`** instead of `recallPetitions`: one collection for the dissolve petition and the petition on the Chair (the same set-once signatures and close);
   - **`bills`** as its own collection with the votes embedded (≤ 60, public, read with the bill), and the Chairs' lines embedded;
   - **`factionElections`** instead of `chairElections`: the Chair's election and the votes on the Chair (both a faction-wide secret ballot with a window and a count);
   - **`factions`** instead of `chairState`, with the push results and the secretary's bill pointer;
   - a new **`nation`** document for the calendar guard, the government, the control snapshot, the laws' projection and the national lines.
   `officeTerms` gains the four kinds with the same `completed` flag, and the character's `offices[]` projection gains the kind (ADR 0047, 0048).
3. **The national count** is one transaction at the boundary into day 27, and **taking office** a second one at day 0, as suggested. The national job (`nation-day`, 00:02 UTC) runs after every city: it calls `ensureCityDay` for each city first, and the lazy `ensureNationDay` does the same, so the order holds whoever runs first (ADR 0043).
4. **Local deputies' votes** are computed at the division from the chain and never stored per deputy, as suggested. The division stores each bloc's vote and its reason, so the bill's page can say *17 locals For (the party line)*; the chamber shows each bloc's current line while the vote is open (ADR 0045).
5. **The law layer** is the ordinance layer with a third source, as suggested, with four refinements (ADR 0044):
   - `appliesTo` is **per effect** (the Special Powers Act has one members-only effect and one that is about missions against its party);
   - the Curfew's night window is read at the act's time, the one exception to day-constant modifiers;
   - `markFadeDays` is monotone over the law's days, so a law that ends never brings a mark back;
   - control's +25 % Heat is a **place factor**, not a law kind.
   The other new kinds each touch one function (§6.6). `LAW_BOUNDS` is enforced by the loader, which also refuses `fxpPct` and `chancePct` on any law.
6. **Clearwater's quarter order.** Keep the survey order (The Front 1, The Depot 2, The Harbour 3) and allow a teaser at index 0. The content test already holds each place's pin, so nothing is renumbered. Two changes make it work:
   - the client opens a city on **its landing quarter** (the arrival station's), not `quarters[0]`; today `apps/client/src/routes/city.tsx:763` frames `c.quarters[0]`, and T24 replaces it with `CityView.landingQuarterId`;
   - the loader refuses a landing quarter that is a teaser.
   After the landing, the last-viewed rule applies as before.
7. **Clearwater's city document** has a district's shape at city level, as suggested: `opinion`, `state`, `groundswell` and `stateLog` on its `cities` document. The council is at the city, with seven seats. The count is slice 4's district count generalised by parameters (`countBattleground`: seven seats, lists of three, the turnout weight at ten), and the division is `divideBlocs` with four of seven. Control's Heat rule is a place factor read by the Heat gain, for the capital's districts too (ADR 0050).
8. **The Chair's standing orders** are read where the rotation is read, as suggested, with two changes (ADR 0046):
   - the picks are **order families**, so a home resident and a capital or Clearwater resident each read their own town's order (§22.1 Q1);
   - the party's target is **not a counter on the faction document**: each matching attempt upserts the member's own `contributions` row (`push|{f}|{day}`) in the action's transaction, so no faction-wide hot document joins every action. The live bar is a `$group`; the nation's day stores the day's result; the member's settlement pays the +10 Party XP (the world never writes a character, ADR 0020).
9. **The party's rule on councils** is `factions.rules[cityId]`, falling back to `faction.branchMotion`, as suggested. It is written into **the next** order paper at its count (§22.1 Q8). The Governor's rule is not a field on the election: it is an **item on the order paper** (`movedBy.kind: 'governor'`, at position 1), with a set-once `powers.rule` on the Governor's term (§22.1 Q7).
10. **Petitions** are set-once rows as suggested: ADR 0018's pattern, with a unique open petition per city. `needed` is computed at the close from the turnout roll. The city's boundary closes a petition before the division, so a dissolved council's rule never comes into force (ADR 0049).
11. **The Town Hall's signatures** are resolved into the open petition in the event's resolution transaction, as suggested. If the petition has closed, nothing happens. Slice 6's ordering resolves an earlier day's events before the boundary's close.
12. **The veto's day** is as suggested, with three mechanics (ADR 0045):
   - the bill is `awaitingSignature` from the division to the next boundary;
   - the veto is a set-once write on the President's term (`powers.veto`) and on the bill (filtered on `awaitingSignature`), so it serialises with the enactment;
   - the override is tabled in its own slot, when it can still divide by the boundary into day 27 (§22.1 Q14).
13. **Test hooks:** §8.6 covers each one you asked for: stepping the term day, forcing control, seating any office, the ladder's record, the secretary's bill, and test members as deputies. The e2e flows are §15.1's six specs (the whole national path, a dissolving petition, a removal that passes).
14. **The playtest report:** §15.2 covers every number you listed, with the question's measure: the return rate in the week after losing an office, against keeping it.
15. **The vocabulary test:** as you list it, plus *Chancellor* refused. *The Front* joins the `front` allow-list beside *the front door* and *front page*.

---

## 22. Questions

### 22.1 For the game designer (each has a default so the build does not wait)

> **Settled, 4 Oct 2026** (`docs/design/slice-7-nation.md` §23). Every item below is decided; the default stands unless the table at the end of this section says otherwise. The missing content (the families, the push and Clearwater templates, the twenty-four deputies, the venues, the five modals, the alt texts, the four voices) is written there.

**The Chair's orders**

1. **The Chair's menu and the residences.** Design §4.2 says each pick "resolves `{city}` to the member's residence". But the home rotation's templates name home places (*Talk to the workers at the Mill Gate*, `actionIds: ['coalport.mill-gate.canvass']`), and the capital has its own templates. **Default:** each rotation template gets a `family`. The Chair picks a family per slot; a member reads their residence's template of that family, else their residence's rotation for that slot. Please assign families (*canvass anywhere*, *speak anywhere*, *the Issue*, *the committee*, …) and the capital's and Clearwater's twins.
2. **The push's order.** **Default:** two push templates per faction (content, `use: 'push'`, written in the secretary's voice):
   - slot A: *Talk to voters in {place}* ×3, canvass;
   - slot B: *Spread the word in {place}* ×3, propaganda.
   The party's target counts **every matching attempt at the pushed place** by members whose pushed order counts (Level 10+), whether or not their own order is still open; a ×3 counts three. Please write the six lines and confirm what counts.
3. **Clearwater's rotation** (design §9.1). **Default:** per faction, slot A *Talk to voters in Clearwater* ×3 (canvass) and slot B *Speak to the Issue* ×2 and *Watch and listen in Clearwater* ×2, with the capital's lines transcribed for the lake. Please write them in each secretary's voice.

**Missing content**

4. **The twenty-four local deputies** (design §5.1, GDD §15.10: "eight named per party"). They are not listed anywhere. **Default:** none until you supply them; the chamber shows only *n Vanguard local deputies* until the names are in (T8's *Done when* waits on them).
5. **Event venues.** The Town Hall needs a venue in each home city, each capital district and Clearwater, of a kind in *square, university, court, theatre, hotel*. Clearwater needs venues for the Canvass Drive, Rally and Poster Night. **Default:** per place, the first location in content order whose kind is in the type's list (for Clearwater: the Town Hall and the Rally at St Martin's, the Canvass Drive at the Rows, Poster Night at Back Lane Market). Please confirm or replace.
6. **Clearwater as a branch.** Design §4.4 gives the Chair a Clearwater fixture. **Default:** Clearwater is a branch for all three factions, like the capital: a daily fixture each, and a *Clearwater branch* chat channel.

**Councils**

7. **The Governor's rule "in place of" the party's item.** Councillors vote during cycle days 0–1, the same days the Governor chooses. A councillor may have voted for the party's item before the Governor replaces it. **Default:** the Governor's rule is **added as item 1, ahead of** the party's item, which stays. Locals with no player lead vote for the Governor's rule, so the outcome is the design's and no cast vote disappears.
8. **When the Chair's rule for a city applies.** **Default:** from the next order paper (opened at the next count), never mid-paper, for the same reason as Q7. The modal names the council (*from Thursday's council*).

**Parliament**

9. **The Chair's *Free vote* and an unset line.** The chain reads "else the Chair's line, else the secretary's line", but the default is *free vote*. **Default:** an **unset** line falls to the secretary's line; an explicit *Free vote* from the Chair makes the locals abstain. The desk shows *the secretary's line: For* until the Chair sets one.
10. **A tie among a bloc's player deputies** (one For, one Against). **Default:** a tie is no majority: the chain falls to the Chair's line, then the secretary's.
11. **The automatic removal's trigger.** Design §10.2 says "below 25 % of National Control". At the baselines every party holds **23.5**, so the motion would fire in every term from day 5. **Default:** the trigger is the **control share** (the party's National Control ÷ the three parties'; 33.3 % at the baselines), below 25 %. Please confirm, or set another number.
12. **Unrest's half weight.** "A home city in Unrest counts half (0.05; the lost half goes to nobody)" and "the three parties and the weighted Neutral sum to 100" cannot both hold. **Default:** the city's weight halves **for every party and Neutral** (the shares then sum to 95), and the bar shows the three figures as they are. The alternative halves only the home party's term.
13. **The runner-up taking office.** **Default:**
   - a player runner-up's deputy seat passes to the next unseated name on their party's list (else a local), and their deputy term is vacated (not completed);
   - their presidency counts for *two in a row* when held to the term's end;
   - a second removal in a term seats the next-highest score that has not held the office this term.
14. **The vote's days and the term's end.** **Default:**
   - voting is open from the tabling, and the division is at the boundary into tabling day + 4 (the design's three full days, plus the rest of the tabling day);
   - tabling closes after term day 23, so no bill divides on day 27;
   - an override that cannot divide by day 27 is not tabled: the veto is final, and the modal says so.
15. **A bill passing at the cap with no live named law** (two bills tabled with four in force). **Default:** the law in force that ends soonest (ties: the oldest) ends when the new one starts. The paper says which.
16. **A deputy who is also Chair.** **Default:** one bill per member per term, whichever office tables it.
17. **The clerk's motion when the paper is full.** **Default:** it takes a slot of its own, like the override; a player's removal motion needs a regular slot.

**Elections and petitions**

18. **The bootstrap mid-term.** Design §2 says the first national election closes "the first full term". **Default:** every window that opens on or after the bootstrap day runs, so a deploy on term day 10 holds that term's national election. The windows already open are skipped (the acting holders continue).
19. **Modal texts the design does not give.** Backing a Chair candidate, setting a fixture, withdrawing a presidential candidacy, and opening or signing the petition on the Chair. **Default:**
   - backing: *Backed · {name} has your backing*;
   - the fixture: *Set · Tomorrow's event in {city}*;
   - withdrawing: *Withdrawn · Your name is off the list for President · 100 Political Capital returned*;
   - the petition: the council petition's texts with *the Chair* for *the council*.
   Please write them.
20. **The Governor's Address "once a term".** **Default:** once per Governor's term (the five-day council term); the President's once per national term.
21. **The Curfew.** **Default:** it doubles the final run-in chance, before the 90 cap, for missions and for the rival-ground tier-1 tap alike, while it is night (20:00–06:00 UTC) at the act.
22. **A change of Chair.** **Default:** the standing orders, party rules and fixtures are cleared whenever the holder changes (a new Chair, a removal, a term ending with the secretary), so a new Chair starts from the secretary's.
23. **The party's pick's ties "by backers received so far".** Backing opens on day 23, after the pick, so every candidate has none. **Default:** the ties go to completed terms, then filing. The alternative is to open national backing from day 19.
24. **The Chair's route.** Screens §5 names `/faction/chair`; slice 6's Faction tab uses `/faction?tab=…`. **Default:** `/faction?tab=chair`, with `/office/chair` redirecting to it.
25. **Councillors and petitions.** Screens §9.1 says *You're a councillor; councillors can't sign*; design §10.1 lets any resident sign. **Default:** the screens' rule (the council's own members cannot sign).
26. **A Governor who moves residence mid-term.** **Default:** the office passes to the bloc's top local for the rest of the term, and the Governor's term is vacated, as with a dissolution.
27. **Backing a party's own figure.** **Default:** a member may back the party's candidate whoever it is (+1 to the score), including the figure.
28. **A figure that loses the presidency.** **Default:** it takes no seat; the party's list starts with its players.
29. **"At least three votes" in the vote on the Chair.** **Default:** at least three *No confidence* votes, as well as two thirds of the votes cast.
30. **Smaller points:**
   - *a quarter* of the eligible rounds up: `max(3, ceil(n / 4))`;
   - a list candidacy cannot be withdrawn and its 25 PC is not returned;
   - pledges are any two distinct laws of the catalogue;
   - tenure counts from joining (switching is not built);
   - a city's plate word uses one rule: a party above 50 is *held by*, the top two within ten is *close race*, otherwise *contested*; the capital applies it to its averaged shares.

**Settled (4 Oct 2026; the designer's answers, `slice-7-nation.md` §23.1):**

| # | Decision |
|---|---|
| 1 | Default: families on every rotation template; the assignment and the twins in design §23.2 |
| 2 | Default: two push templates per faction, written in design §23.3; every matching attempt at the pushed place by any member counts, a ×3 three |
| 3 | Default: the Clearwater rotation, written in design §23.4 (`residence: 'clearwater'`) |
| 4 | The twenty-four local deputies: design §23.5 (ids `npc.{v,c,a}.dep.{surname}`) |
| 5 | **Changed:** the Town Hall's venue kinds gain `library` and `faction-hq`; venues set per place in design §23.6 (Clearwater: Town Hall at St Martin's, the Rally at the Cannery, the Canvass Drive at the Rows, Poster Night at the Tram Depot); **no signature event in Clearwater** in slice 7 |
| 6 | Default: Clearwater is a branch for every faction, with a fixture and a *Clearwater branch* channel |
| 7 | Default: the Governor's rule is added as item 1 ahead of the party's item, which stays |
| 8 | Default: the Chair's rule applies from the next order paper |
| 9 | Default: an unset line falls to the secretary's; an explicit *Free vote* abstains |
| 10 | Default: a tie among player deputies is no majority |
| 11 | Default: **25 % of the control share** (GDD §15.9, economy §21) |
| 12 | Default: Unrest halves the city's weight for every party and Neutral; the shares sum to 95 (GDD §14.8) |
| 13 | Default |
| 14 | Default: the division at tabling day + 4; tabling closes after day 23; an override that cannot divide by day 27 is not tabled and the veto is final |
| 15 | Default: the law ending soonest (ties: the oldest) |
| 16 | Default: one bill per member per term |
| 17 | Default: the clerk's motion in its own slot |
| 18 | Default |
| 19 | Written: design §23.7 (`chairBack`, `fixture`, `presidentWithdraw`, `chairPetitionOpen`, `chairPetitionSign`), plus the `partyRule` day and the veto-final *Next* |
| 20 | Default: once per Governor's term; the President's once per national term |
| 21 | Default |
| 22 | Default: a change of Chair clears the standing orders, rules and fixtures |
| 23 | Default (completed terms, then filing); the Chair's ballot keeps votes, backers, terms, filing |
| 24 | Default: `/faction?tab=chair`, `/office/chair` redirects |
| 25 | Default: councillors of that council cannot sign (GDD §15.9) |
| 26–28 | Default |
| 29 | Default: at least three *No confidence* votes |
| 30 | Default, all five |
| Art | Alt texts confirmed with four details corrected from the pictures: design §23.8 |
| §23 notes | Answered in design §23.10; #17's wording confirmed (the caught check is a risk roll, not a §8.4 check; GDD §15.8); #18's four voices written in design §23.9; the plan's row rewritten |

### 22.2 For the user

None blocks the build. Defaults taken:

1. **Design §21's seven points** (the President only, the secretary and the figures on the ballots, dissolving rather than snap elections, the secretaries' bills, Clearwater's evened baseline, The Front as a teaser, several offices at once): built on the design's defaults, listed in this document's header.
2. **The term's epoch** is a code constant: Monday 5 January 2026. Moving it before launch (so that season 1 starts on a chosen date) renumbers the terms, and needs a migration once data exists. Locally it does not matter.
3. **Two GDD numbers read ambiguously** and are built on defaults the designer is asked to confirm: the automatic removal at **25 % of the control share** (at 25 % of raw National Control it fires every term), and **Unrest's half weight**.
4. **No new dependency.**
5. **A real-time playtest of one term takes four weeks.** Locally, the test clock plays a term in an afternoon; the playtest question about losing office is best answered with the term hooks and a few testers.

---

## 23. Notes on the design documents (for the designer)

1. **The plan's data-model row for slice 7** (`laws`, `nationalElections`, `recallPetitions`; nothing embedded) becomes:
   - collections: `nation`, `factions`, `factionElections`, `nationalElections`, `bills`, `laws`, `petitions`;
   - changed collections: `officeTerms` (office kinds), `candidacies` (kinds), `votes` (new keys), `cities` (Clearwater's meter, the Governor, dissolved), `ordinances`, `contributions` (push scope);
   - embedded on `characters`: `termBackings[]`, the office kind on `offices[]`, and the push on order items.
   The plan's slice-7 build line still reads "President or Chancellor" and "factional laws at 60 %" (36 of 60 is 60 %, so that one is right).
2. **"`TERM_EPOCH` a constant set at deploy"** (design §2, §18 Q1): built as a code constant (§21 #1).
3. **The Chair's picks and `{city}`** (§4.2): the home templates are not city-generic (§22.1 Q1).
4. **The automatic removal at 25 %** (§10.2, GDD §15.9, economy §21.7 #67): at the baselines every party is at 23.5 (§22.1 Q11). Economy's flag "never fires" suggests the control share was meant.
5. **"The three parties and the weighted Neutral sum to 100"** (§8, GDD §14.8) against Unrest's lost half (§22.1 Q12).
6. **"In place of the party's rule"** (§3.1) and the votes already cast (§22.1 Q7); the same for the Chair's rule (§22.1 Q8).
7. **"Default *free vote*"** (§4.3) against the chain's *else the secretary's line* (§22.1 Q9).
8. **The party's pick's ties by backers** (§6.2, GDD §15.5): backing opens after the pick (§22.1 Q23).
9. **"From the boundary after tabling, three full City Days"** and "no bill … divided on day 27" (§2, §5.2): built as §22.1 Q14.
10. **The local deputies' names** (§5.1, §22, GDD §15.10) and **the Town Hall's and Clearwater's event venues** (§10.4, §9) are not in the documents (§22.1 Q4, Q5).
11. **Design §12's modals** lack backing a Chair candidate, the fixture, withdrawing for President, and the petition on the Chair (§22.1 Q19).
12. **Screens §5's route** `/faction/chair` (§22.1 Q24); **screens §9.1's** *councillors can't sign* (§22.1 Q25).
13. **`parliament.png`** (design §20, "already there and used by this slice"): the file is in the folder, but `art.ts` has not catalogued it ("held until an action is set in the chamber"). T9 catalogues `scene.parliament` without binding it to the `parliament` location kind.
14. **`data/nation.ts`** still carries Clearwater's provisional 20 / 24 / 24 / 32 and *Contested · no service yet*. T7 replaces both, and the city's own content carries the new baseline.
15. **Design §3's deputy row** omits *14 days in the faction*, which GDD §15.1 has: built with 14.
16. **GDD §15.1's ladder prose** still says *the Legislature* and *the head of government* (designer-facing, so not a vocabulary problem); *the President* would match §15.5.
17. **"Laws never touch … the odds of a check"** (§5.4) sits beside the Special Powers Act's `caughtDelta`. The caught check is a risk roll, not §8.4's check, so it is built as the design says. Please confirm the wording.
18. **The Courier and the other papers' personal lines** (§11.2–§11.3) are given in the Herald's wording only. T7 and T8 need the four other voices from you in the same content change, as slice 6's were.
19. **Design §9.1's quarter order** is kept as the survey's; the landing comes from the station (§21 #6).
20. **"Holding several offices at once"** pays every stipend: a Governor who is also Chair banks 20 + 20 + 10 PC a day. That is within economy §21.2's cap argument; the report counts it (Appendix C #65).

---

## Review 4 knock-ons (dated note, 7 Oct 2026)

Copied from `docs/tech/review-4.md` §20 when review 4 was built (ADRs 0073–0078). Read them before this slice is built; where they disagree with the sections above, they win.

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

## Review 5 knock-on: *Coming home* (dated note, 8 Oct 2026)

The opening is *Coming home* (GDD §7.1; `docs/design/review-5-answers.md` §19) and the Ambitions are re-anchored without the father (GDD §17.1). For this slice: **chapter 3 is *The deposit* of *The Names on the Stone*** (id `finish-his-work`, unchanged); its strings, Letters row (*From the families' tin*), choice hints and keepsake name (*Your deposit receipt*, `keep.deposit-receipt`) are re-strung in design §13; the flag ids are now `fund-marks` / `own-marks`. **No number moved**: Rank 3, seven days, difficulty 16, 15 Energy, 350 / 90 / 200 · 175 / 45 / 100 · 60 / 0 / 0, the keepsake on every outcome. The content test for *father* (`review5.opening.test.ts`) covers this chapter when it is built.

## Deviations (as built)

*Filled in by T31.*
