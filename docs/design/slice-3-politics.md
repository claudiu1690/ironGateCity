# Slice 3 — "The first vote": home-city councils, the ballot, ordinances and morale

Game designer, 29 Sep 2026. Companion to `docs/design/slice-3-screens.md` (the screen specs) and `docs/economy.md` §14. The architect writes the slice-3 tech design from these two documents; every rule and number here is also in the GDD (edits listed in §14).

**Playtest question:** does the first vote, and the first seat, feel like a big moment?

**Rules this design obeys:** every political act is one tap or one choice (pillar 7); every phase resolves on its own at a City Day boundary, never at a clock time, and every window is at least one full City Day long; being away costs opportunity, never assets; the check formula is untouched (councils are counts, not rolls); campaign vocabulary only (nominations, the slate, the ballot, the count, the seat, the order paper, the motion); the Vanguard is a party with a committee, never a militia; British English, 1946, noir, short.

---

## 1. The design in one paragraph

Each home city runs a **five-day council cycle**: two days of **nominations** (declare, endorse), three days with the **polls open** (one tap), a **count** at the boundary, and a seven-seat council that sits for five days and passes **one ordinance** that really changes numbers in the city for everyone there. The race is inside the party (§14.11): players and named NPC candidates of the home faction compete for the seats by **ward vote** (the NPC electorate, which is your Local Standing), **endorsements** and **members' votes**. NPCs fill every seat and every ballot line players don't, and are marked as NPCs, so the game is the same shape with one player or a thousand. The result is printed in the city's paper; the winner's face is on the front page with a stamp. Morale (the home share) now has states with teeth: *Fired up* pays Faction XP, *Unrest* is a crisis the branch has to canvass its way out of.

---

## 2. The calendar

### 2.1 The cycle, per city

Everything is computed from the City Day key (ADR 0005): `cycleDay(city) = (dayKey − offset[city]) mod 5`. Offsets follow the GDD's order: **Irongate 0, Ashford 1, Coalport 2, Duskwall 3, Clearwater 4**. Slice 3 uses the three home cities; the two battlegrounds keep their offsets for slice 4.

| Cycle day | Phase | What is open | Closes |
|---|---|---|---|
| **0–1** | **Nominations** | *Declare* a candidacy (10 PC) · *withdraw* · *endorse* a filed candidate (10 PC) · the branch's endorsement (§6.3) | The boundary into day 2. Candidates without two endorsements are **struck** (deposit returned) |
| **2–4** | **Polls open** | *Cast your ballot*: one tap, one candidate, final | The boundary into day 0. **The count** happens there |
| **0** (next cycle) | **The council sits** | The new council is seated at the count. Ordinance **proposals** (20 PC) and the **ordinance vote** are open on cycle days 0–1 | The boundary into day 2: the council **divides**; the winning ordinance is **in force from day 2 for five City Days** (2, 3, 4, 0′, 1′), until the next council's ordinance replaces it |

So the phases per city, on any day: nominations for the next council run while the sitting council votes its ordinance (days 0–1); polls run while the ordinance is in force (days 2–4). Three of five days are polling days in every city; with the five-city stagger, polls are open somewhere every day and at least one city is counting or seating every day.

**No clock time exists in the calendar.** §15.3's "nominations close at 12:00 the day before" is replaced by boundaries. The count and the division are the only scheduled world events (an Agenda job at 00:00 UTC per ADR 0005 §5; §15 below); the *phase* is a pure function of the day key, so the client never depends on the job to know what is open.

### 2.2 The first vote and the first seat

| Milestone | When it lands | Why |
|---|---|---|
| **Rank 2** (400 FXP) | Day 2 for the reference recruit (`docs/economy.md` §13.3: ~475 FXP by the end of day 2) | Unchanged |
| **The first ballot** | **Day 2 to day 4**: the same day for 60 % of new players, within two days for the rest | The home city's polls are open three days in five. The paper's *Polling Day* line tells the player when, from the morning they make Rank 2 |
| **Rank 3** (2,000 FXP), *Known* (30 Successes) | Rank 3 about day 10 (regular day 8, casual day 14); *Known* by day 3 (§9 of the economy sheet) | Unchanged |
| **The first candidacy** | Day 10–14: the next nominations window after Rank 3 | Nominations open two days in five |
| **The first seat** | Day 13–17 | The count, three days after nominations close. "Week 2 at the earliest", as §15.1 promises |

GDD §5.2 now reads *Rank 2: the right to vote, day 2; the first ballot by day 4 at the latest*. The old line promised the ballot itself on day 2, which no staggered calendar can keep without polls that never close.

### 2.3 What a player who is away for a whole cycle loses

Opportunity only: the chance to declare, to endorse, to vote, and (if a councillor) to propose or vote on the ordinance. Nothing else. A seat held while away is kept to the end of its term and its stipend is paid at each boundary (§9.1); NPC councillors vote in the holder's absence by the §10.4 rule. A candidacy that was filed and endorsed before the absence still stands and can still win. Political Capital is never taken. A struck candidacy returns its deposit. §4.2's line stands: *a council term you held has ended normally.*

---

## 3. Who can do what

| Act | Needs | Cost | Limit |
|---|---|---|---|
| **Vote** in the home council election | Rank 2 · resident of the city (`homeCityId` in slice 3; residence from slice 4) · a member of the home faction (every resident is, until slice 4) | Free | One ballot per election; final |
| **Endorse** a filed candidate | Rank 2 · resident · not the candidate | **10 PC** | One endorsement per member per cycle in each city; irrevocable |
| **Declare** for the council | **Rank 3 · resident · *Known* Local Standing in the city (30 Successes) · not already holding a seat there** | **10 PC** deposit | One candidacy per cycle. **Two endorsements** by the close of nominations, or the candidacy is struck and the deposit returned |
| **Withdraw** | A filed candidate, before polls open | The deposit is kept by the branch | — |
| **Propose** an ordinance | A sitting councillor, cycle days 0–1 | **20 PC** | One proposal per councillor per term; at most **three** proposals on the order paper plus the branch's motion |
| **Vote** on the ordinance | A sitting councillor, cycle days 0–1 | Free | One vote, final |

**Tenure (§15.2, pinned).** The "7 days in the faction" rule applies **after a faction switch** (the Reset token, §23.4): a member who switched needs 7 days in the new faction before voting or endorsing and 14 before any candidacy. A new member votes the day they make Rank 2. Without this the §5.2 day-2 vote could never exist. The same-network rule and the 24-hour audit are slice 9; council results are **final at the count** in the MVP, and the audit, when it exists, can unseat, as a recount would.

**A sitting councillor cannot stand for the next council of the same city** while sitting: seats turn over every five days by design (§15.1, "power is never permanent"). They can stand again the cycle after. (A councillor whose term ends at the count can declare in the nominations that open the same day, since those nominations are for the council after next. Simpler statement for the screen: *you can declare again the day your term ends.*)

---

## 4. Seats and the race inside the party

### 4.1 Seats

Every home council has **seven seats**, all of the home faction (§15.3). The council sits for **five City Days**, from one count to the next.

### 4.2 How a candidate's total is counted

Each candidate's total is three numbers, all shown openly on the slate and in the count:

| Part | What it is | Player candidate | NPC candidate |
|---|---|---|---|
| **Ward vote** | The NPC electorate: how well the wards know you | **Local Standing Successes in the city ÷ 5**, rounded down (Known 30 → 6; Trusted 70 → 14; One of Us 150 → 30; a day-10 reference recruit with ~200 Successes → 40) | A fixed profile (§5.2) plus a seeded jitter of −2…+2 per cycle |
| **Endorsements** | +3 per endorsement, at most five counted (+15) | Yes; the two required are included | NPCs carry none; their profile is their standing |
| **Members' votes** | One per resident Rank 2+ member who cast a ballot for them | Yes | Yes: players can vote for NPC candidates |

**Total = ward vote + 3 × endorsements + members' votes.** Seats go to the seven highest totals. This is §15.10's "influence half" restated for a race inside one party: mission work (Standing) counts even when nobody votes, and members' votes grow with the population until they dominate, which is the point ("a growing player base can see itself taking over").

**Ties**, in order: more members' votes · more endorsements · more Local Standing Successes · earlier filing (NPCs after every player who filed before polls opened, then in profile order).

**Why these weights.** At population 1, a day-10 reference recruit (ward vote 40, two endorsements, their own ballot) totals 47 against an NPC slate whose strongest name is 44 (§5.2): they top the poll by a hair, which is the moment we want on a first seat won alone. A casual player at day 14 (~150 Successes → 30, +7) totals 37 and takes the **second** seat: a win, not the top. At population 20 with a dozen candidates, no NPC stands and members' votes decide.

### 4.3 The ballot

- **Single choice, one tap.** Not ranked: a ranked ballot is a form, not a tap (pillar 7), and seven seats by plurality inside one party need no transfer maths.
- **Secret.** Nobody, including the candidate, sees who voted for whom; **no running totals during polling**, which also removes the bandwagon and makes vote-stacking invisible until the audit. After the count every total is printed.
- **Final.** The ballot goes in the box; there is no changing it. The screen makes this plain before the tap (`slice-3-screens.md` §4).
- A candidate may vote for themselves. A voter may vote for an NPC candidate, and the paper tells them what became of that vote.
- The voter sees, per line: the name, whether player or NPC (§5.4), the rank title, the standing in the city, the endorsement count, and one line of platform.

### 4.4 The count and the result

At the boundary into cycle day 0 the city's election is counted (§15). Results are **final**. The morning paper of every resident carries the count (§8); the winners' papers carry the seat on the front page (§12.3). Council seats start at the count: the new councillors can propose and vote that same morning.

**What the count writes:** seven `officeTerms` (players and NPCs), the election's result table (every candidate's three numbers and rank), turnout (`voters / eligible` resident members), and the morale effects of §11.2.

---

## 5. NPC fill (§15.10)

### 5.1 The rule

Politics is the same shape at any population:

- **NPC candidates fill the slate to nine names.** If *p* players have filed and been endorsed when polls open, `max(0, 9 − p)` NPC candidates stand, taken from the top of the faction's slate in profile order. With nine or more player candidates, no NPC stands.
- **NPC councillors fill every seat a player doesn't win.**
- **NPC councillors vote on ordinances by rule** (§10.4).
- **The ward vote is the NPC electorate** (§4.2).
- **The ratio is shown openly**: the council screen reads *NPC seats: 6 / 7*, and every NPC line on a ballot or a slate carries the mark *ward* in place of a face (Appendix C #3, closed: NPCs are marked, never disguised).

Nine names for seven seats means at least two lose every cycle, so a ballot always decides something even when no player stands: the bottom of the NPC slate is close (19, 17, 15) and the seeded jitter of ±2 puts the last seat within a handful of members' votes.

### 5.2 The slates: nine NPC candidates per faction, in the faction's voice

Profiles are the ward vote before jitter. Each has a one-line platform (≤ 90 characters) that the ballot prints. No portraits (the ballot shows the *ward* mark); no real-world names or titles; no army in any of them. Ids `npc.c.*`, `npc.v.*`, `npc.a.*`; `people.ts` gains them with `kind: 'candidate'`.

**The Collective, Coalport** (the Clarion's town: mill, quays, union hall)

| Id | Name | Profile | Line on the ballot |
|---|---|---|---|
| `npc.c.weiss` | Anna Weiss | 44 | Shop steward, rolling mill. "Sort the canteen first, then the world." |
| `npc.c.baum` | Josef Baum | 38 | Docker, Harbour Quays. "Every crane on the quay knows my voice." |
| `npc.c.kolar` | Marta Kolar | 33 | Seamstress, Foundry Row. "Rent first. Everything else after." |
| `npc.c.hauser` | Emil Hauser | 29 | Crane driver. "Fewer speeches. More trams before six." |
| `npc.c.novak` | Lena Novak | 25 | Bakery, Market Row. "Bread at a price a mill wage can pay." |
| `npc.c.dressler` | Karl Dressler | 22 | Furnace man, twenty years. "The branch is the men who turn up." |
| `npc.c.pohl` | Ida Pohl | 19 | Nurse, the infirmary. "A clinic at the Mill Gate, open nights." |
| `npc.c.ruzicka` | Tomas Ruzicka | 17 | Tram driver. "The depot has a hall. Let's use it." |
| `npc.c.lenz` | Paul Lenz | 15 | Printer, the bulletin. "Print more, argue less." |

**The Vanguard, Duskwall** (the Sentinel's town: customs, archives, the committee). Written cold, as the content policy requires: clerks, storekeepers and a schoolmistress who want the town run in good order; nobody in a uniform.

| Id | Name | Profile | Line on the ballot |
|---|---|---|---|
| `npc.v.kessler` | Ernst Kessler | 44 | Retired customs inspector. "A queue in order is a town in order." |
| `npc.v.vogel` | Margarethe Vogel | 38 | Clerk, the ration office. "One book, one household, no exceptions." |
| `npc.v.reinhardt` | Otto Reinhardt | 33 | Storekeeper, Customs Market. "Fixed prices. Fixed hours. Fixed." |
| `npc.v.lang` | Friedrich Lang | 29 | Signalman, the goods yard. "Trains on time and the pass shut by dark." |
| `npc.v.steiner` | Klara Steiner | 25 | Schoolmistress, Rampart Row. "Quiet streets by ten. The children need them." |
| `npc.v.ehrlich` | Gustav Ehrlich | 22 | Clerk, the State Archives. "Everything on file, nothing in doubt." |
| `npc.v.weber` | Johann Weber | 19 | Checker, the goods yard. "Count it twice. Then the movement can trust it." |
| `npc.v.marquardt` | Ilse Marquardt | 17 | Landlady, Rampart Row. "Rents paid on Friday and the stairs swept." |
| `npc.v.fink` | Rudolf Fink | 15 | Market inspector's clerk. "Permits for everyone, or for no one." |

**The Alliance, Ashford** (the Gazette's town: the college, the courts, the Rooms)

| Id | Name | Profile | Line on the ballot |
|---|---|---|---|
| `npc.a.auer` | Dr Helene Auer | 44 | Lecturer in law, the college. "Read the bill before you vote on it." |
| `npc.a.kranz` | Samuel Kranz | 38 | Solicitor, the Courts. "Fair rents, and a court that hears them." |
| `npc.a.holl` | Beatrix Holl | 33 | Bookseller, Bridge Street. "Open the reading rooms. All of them." |
| `npc.a.mayr` | Rudolf Mayr | 29 | Café owner, Bridge Street. "Licences by rule, not by favour." |
| `npc.a.dorn` | Clara Dorn | 25 | Student, the Debating Union. "Votes at twenty, and the tram fare down." |
| `npc.a.frisch` | Wilhelm Frisch | 22 | Compositor, the Gazette. "Print what you find. Then stand by it." |
| `npc.a.tauber` | Agnes Tauber | 19 | Tenants' committee, Weavers' Row. "A fire escape on every stair. This year." |
| `npc.a.pichler` | Leo Pichler | 17 | Magistrate's clerk. "The queue at the Courts is a scandal. Fix it." |
| `npc.a.brenner` | Otto Brenner | 15 | Lock-keeper, the wharf. "Dredge the lock. The barges pay the rates too." |

The names were checked against real party and state figures of the period and against the content-policy checklist; Brandauer (the night foreman of *Clear His Name*) and Reinholt (the Vanguard's patron) are deliberately absent. The slates are content; a fourth or fifth name can be swapped without code.

### 5.3 NPC councillors

An NPC who wins a seat holds it like a player: named on the council screen, marked *ward*, stipend not paid (NPCs have no PC), voting by §10.4. NPCs never propose an ordinance; the **branch's motion** (§10.2) is how the party's default reaches the order paper.

### 5.4 Marking

On every list: a player line shows the avatar; an NPC line shows the small faction mark in the avatar's ring and the word **ward** where the rank title would be. The council screen's header counts *NPC seats: n / 7*. No NPC is ever presented as a player.

---

## 6. Standing for council

### 6.1 Requirements and the deposit

Rank 3, resident, *Known* in the city, not a sitting councillor there; **10 PC**, paid on declaring. The deposit is **kept** if the candidate withdraws or stands, and **returned** if the candidacy is struck at the close of nominations for want of endorsements. That is one rule: *the deposit is spent when your name is printed on the ballot.*

### 6.2 What declaring does

The candidate appears on the **slate** at once (name, rank, standing, *endorsements 0 / 2*, and a platform line they pick from three the faction offers, §6.4). The branch's paper prints *{name} Files for the Council* the next morning. The candidate can now be endorsed.

### 6.3 Endorsements

- **Two are needed** by the close of nominations; up to five count towards the total (+3 each, §4.2).
- **Members endorse** for 10 PC: Rank 2+, resident, one per cycle per city, not themselves, irrevocable. Endorsements are **public** (the slate shows *endorsed by …*, up to five names, then *and n more*): endorsing is a visible act of party politics, unlike the secret ballot.
- **The branch's endorsement.** The party secretary (Holm, Stahl, Grey) endorses any filed candidate who **completes all three Party orders on a day of the nominations window while filed** (once per candidacy). It counts as one endorsement. The Jobs-card-style line on the council card reads *All orders carried out · the branch endorses you*. This ties candidacy to the daily loop and gives a lone player a fair route to the ballot.
- **Small branches.** When **fewer than three other eligible endorsers** live in the city (resident Rank 2+ members active in the last seven days, counted at the close of nominations), the branch's endorsement **counts as two**. The slate says so openly: *Endorsements 1 / 2 · the branch will make up the number*. So one player, alone in the city, who does the day's orders, is on the ballot. With three or more colleagues, one of them must sign.

### 6.4 Platform lines

A candidate picks one of three lines the faction offers (content, per faction, ≤ 90 characters), printed beside their name. They carry no effect. Free text is deferred with chat moderation (Appendix C #7).

- **Collective:** "The mill and the quays, before the men who own them." · "Rent, bread and the tram. In that order." · "Every ward organised, every door knocked."
- **Vanguard:** "Order in the streets, bread at a fixed price." · "The frontier shut and the books balanced." · "Every ward in good order by the end of the term."
- **Alliance:** "Fair report, free comment, and a council that reads." · "Rents by rule, licences by rule, no favours." · "The franchise for everyone who pays the rates."

### 6.5 Withdrawal

One tap on the slate before polls open: *Withdraw*. The deposit stays with the branch; the endorsements given lapse (their PC is not returned: an endorsement is a gift, and the endorser knew the candidate could withdraw). After polls open the name is on the ballot and stays there.

---

## 7. The ballot, step by step

1. **The morning.** The paper's *Polling Day* section: *Coalport votes today · polls open until Saturday midnight* (the player's local clock, as every time in the game) with the CTA **Cast your ballot**; or, when the city is not polling, the phase line (*Nominations open · Coalport votes from Thursday*; *Polls closed · the count is in this morning's paper*).
2. **The ballot.** One screen: the nine-or-more names with their lines and marks, one tap selects a name, a sticky CTA **Cast your ballot for {name}** commits. The caption above the CTA reads *One ballot, final. The count is at 01:00 on Sunday.*
3. **The result modal** (one modal, as every result): stamp **Ballot cast**, headline *Your ballot is in the box*, text *One vote for {name}. The Clarion carries the count on Sunday morning.* Knock-on lines: *Turnout so far is not shown; the ballot is secret* (small, once) · *Coalport morale +0.5* (§11.2) · **Continue**. No Again.
4. **The count** arrives in the next paper (§8). The player's own vote is echoed there.

Nothing here needs the player at a set time, and the whole thing is three taps.

---

## 8. The count in the paper: headline templates

Conditions use the slice-1 pattern (a condition kind per template; the architect names the kinds). `{city}`, `{name}`, `{ordinal}` (first…seventh), `{votes}` (the total), `{margin}`, `{winner}` (who topped the poll), `{last}` (who took the seventh seat), `{voted}` (the name the player voted for), `{turnout}` = *n of m*, `{npcSeats}`, `{ordinance}`, `{weekday}`. Personal templates take priority 1 (a seat) or 2; city templates carry the count on the day of the count and the phase lines otherwise. Priority numbers sit inside the slice-1 scheme (personal ≤ 2 shown; a seat outranks a rank-up).

### 8.1 The Coalport Clarion

| Id | Group · priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.seat-won` | personal 0 | elected at last night's count | {name} Takes a Seat on Coalport Council | Elected {ordinal} of seven with {votes} votes. The council sits from this morning. Secretary Holm: "Now do something with it." |
| `hl.seat-top` | personal 0 | elected first | {name} Tops the Poll in Coalport | First of seven with {votes} votes. The Union Hall has a new name on the door. |
| `hl.seat-lost` | personal 1 | stood, not elected | {name} Misses the Last Seat by {margin} | {last} took the seventh seat. Nominations open again on {weekday}. The branch keeps the deposit. |
| `hl.filed` | personal 2 | declared yesterday | {name} Files for the Council | Endorsements {endorsements} / 2 by {weekday} midnight, or the name comes off the ballot. |
| `hl.voted-won` | personal 2 | the player's candidate won | Your Vote Counted: {voted} Takes a Seat | {voted} finished {ordinal} of seven. Turnout {turnout}. |
| `hl.voted-lost` | personal 2 | the player's candidate lost | Your Vote Counted: {voted} Falls Short | Short by {margin}. The seventh seat went to {last}. Turnout {turnout}. |
| `hl.seat-ended` | personal 2 | a term ended at the count | Councillor {name} Rises | Five days, one ordinance. The council thanks its member; nominations for the next but one open today. |
| `hl.council-passed` | personal 2 | councillor; the division passed a motion | Council Passes {ordinance} | In force from this morning for five days. {ordinanceLine} |
| `hl.council-failed` | personal 2 | councillor; no motion reached four | Council Rises Without a Motion | No ordinance reached four votes. Coalport goes without for five days. |
| `hl.count` | city 0 | the count was last night | Polls Close in Coalport: {winner} Tops the Poll | Seven seats filled, {npcSeats} of them by ward members. Turnout {turnout}. |
| `hl.polls-open` | city 0 | polls open today | Polls Open in Coalport | Vote from the paper or the Union Hall until {weekday} midnight. The ballot is secret. |
| `hl.nominations` | city 0 | nominations open today | Coalport Council: Nominations Open | Organisers who are Known in the wards may file at the Union Hall until {weekday} midnight. |
| `hl.ordinance-city` | city 0 | an ordinance took effect this morning | {ordinance} in Force | {ordinanceLine} Five days, by order of the council. |

`hl.morale-*` stays as it is (city 1); the *Unrest* deck already reads *Unrest in Coalport: dockers question the party.* New: `hl.stands-firm` (city 0, morale rose out of Unrest last night): **Coalport Stands Firm** · *Morale back above sixty. The branch thanks everyone who knocked a door.*

### 8.2 The Duskwall Sentinel (`hl.v.*`)

| Id | Headline | Deck |
|---|---|---|
| `hl.v.seat-won` | {name} Seated on Duskwall Council | Elected {ordinal} of seven with {votes} votes. Organiser Stahl: "The committee expects a full term." |
| `hl.v.seat-top` | {name} Heads the Poll in Duskwall | First of seven with {votes} votes. Beacon House notes it in the minutes. |
| `hl.v.seat-lost` | {name} Short of the Last Seat by {margin} | {last} took the seventh seat. Nominations reopen on {weekday}. The deposit stays with the district. |
| `hl.v.filed` | {name} Files for Duskwall Council | Endorsements {endorsements} / 2 by {weekday} midnight. The committee does not extend deadlines. |
| `hl.v.voted-won` | Your Vote Counted: {voted} Seated | {voted} finished {ordinal} of seven. Turnout {turnout}. |
| `hl.v.voted-lost` | Your Vote Counted: {voted} Falls Short | Short by {margin}. The seventh seat went to {last}. Turnout {turnout}. |
| `hl.v.seat-ended` | Councillor {name} Stands Down in Good Order | Five days, one ordinance, minutes filed. Nominations for the next but one open today. |
| `hl.v.council-passed` | Council Passes {ordinance} | In force from this morning for five days. {ordinanceLine} |
| `hl.v.council-failed` | Council Rises Without a Motion | No ordinance reached four votes. Beacon House will want to know why. |
| `hl.v.count` | Polls Close in Duskwall: {winner} Heads the Poll | Seven seats filled, {npcSeats} by ward members. Turnout {turnout}. |
| `hl.v.polls-open` | Polls Open in Duskwall | Vote from the paper or at Beacon House until {weekday} midnight. The ballot is secret. |
| `hl.v.nominations` | Duskwall Council: Nominations Open | Bailiffs Known in the wards may file at Beacon House until {weekday} midnight. |
| `hl.v.ordinance-city` | {ordinance} in Force | {ordinanceLine} Five days, by order of the council. |
| `hl.v.stands-firm` | Duskwall Stands Firm | Morale back above sixty. The committee records its thanks, briefly. |

### 8.3 The Ashford Gazette (`hl.a.*`)

| Id | Headline | Deck |
|---|---|---|
| `hl.a.seat-won` | {name} Elected to Ashford Council | {ordinal} of seven with {votes} votes. Mr Grey: "Good. Now read the standing orders." |
| `hl.a.seat-top` | {name} Tops the Poll in Ashford | First of seven with {votes} votes. The Rooms are, for once, unanimous. |
| `hl.a.seat-lost` | {name} Misses the Last Seat by {margin} | {last} took the seventh seat. Nominations reopen on {weekday}. Deposits are not returned; the Gazette has asked. |
| `hl.a.filed` | {name} Files for Ashford Council | Endorsements {endorsements} / 2 by {weekday} midnight, says the returning officer, who means it. |
| `hl.a.voted-won` | Your Vote Counted: {voted} Elected | {voted} finished {ordinal} of seven. Turnout {turnout}. |
| `hl.a.voted-lost` | Your Vote Counted: {voted} Falls Short | Short by {margin}. The seventh seat went to {last}. Turnout {turnout}. |
| `hl.a.seat-ended` | Councillor {name} Retires from the Chamber | Five days, one ordinance. Nominations for the next but one open today. |
| `hl.a.council-passed` | Council Passes {ordinance} | In force from this morning for five days. {ordinanceLine} |
| `hl.a.council-failed` | Council Rises Without a Motion | No ordinance reached four votes. The Gazette's leader column is not kind. |
| `hl.a.count` | Polls Close in Ashford: {winner} Tops the Poll | Seven seats filled, {npcSeats} by ward members. Turnout {turnout}. |
| `hl.a.polls-open` | Polls Open in Ashford | Vote from the paper or at the Rooms until {weekday} midnight. The ballot is secret. |
| `hl.a.nominations` | Ashford Council: Nominations Open | Agents Known in the wards may file at the Rooms until {weekday} midnight. |
| `hl.a.ordinance-city` | {ordinance} in Force | {ordinanceLine} Five days, by order of the council. |
| `hl.a.stands-firm` | Ashford Stands Firm | Morale back above sixty. The Rooms thank everyone who knocked a door. |

All decks ≤ 200 characters; "midnight" is the boundary rendered in the player's local clock by the same helper as the shift ticket (*until Saturday 01:00* for a UTC+1 player; the copy is `untilBoundary(weekday)`).

---

## 9. Councillors

### 9.1 The term

Five City Days from the count. **Stipend: 10 PC and 20 FXP at every boundary held** (§6.5 lists the PC; the FXP is new and is the "office stipend" share of §5.5's 25 %). Paid whether or not the holder logs in: earned pay, like the job's half salary; the PC cap of 1,000 is the only limit. A councillor keeps everything else they have (rank, job, orders). The Me tab and the HUD line read *Councillor, Coalport · term ends Thursday*; the party-card line is unchanged (rank, not office).

### 9.2 What a councillor does

One thing, in one window: **the ordinance vote** (§10). Everything else about being a councillor in slice 3 is standing: the front page, the seat on the council screen, the stipend, the line on the Me tab, and the ladder (a completed term is the rung for Governor in slice 7 and Chair in slice 7, §15.1). A term counts as **completed** if held to the count, whether or not the holder voted.

---

## 10. The ordinance

### 10.1 The menu (home cities, slice 3)

Ten ordinances, all with effects on systems that exist in slices 1–2, all within fixed bounds, all lasting **five City Days**, **one in force per city at a time**. The names are civic (a council speaks for the town, not the party); the branch's motion (§10.2) gives each faction its voice. Effects apply to **every player in the city** (in a home city, the home faction). Each is content: `ordinances[]` with `id, name, line, effects[], bound`.

| Id | Name | One line (≤ 120 chars) | Effect in the city | Bound |
|---|---|---|---|---|
| `ord.public-works` | Public Works Order | The council puts the town to work: every wage in the city goes up. | **Job pay +10 %** (the half pay at the boundary and the shift, streak bonus on top) | max +10 % |
| `ord.shift-hours` | Shift Hours Order | Shifts end an hour early, by order of the council, and count double towards the streak. | **Job shifts −1 Energy** (never below 2); **each shift adds two days to the work streak** (the +20 % cap is unchanged) | −1 · ×2 |
| `ord.street-permits` | Street Permits | Leaflets and posters go up without a permit for the week. | **Propaganda opinion swing +15 %** (0.040 → 0.046 per 8-Energy action) | max +15 % |
| `ord.rally-permits` | Rally Permits | Speeches licensed on every corner; no one moves you on. | **Speech actions −2 Energy** (12 → 10; rewards unchanged) | −2 |
| `ord.reading-room` | Reading Room Grant | The reading rooms open late and free. | **Training Energy −20 %** (rounded, halves up: INT 12 → 13 costs 35, not 44) | max −20 % |
| `ord.rest-day` | Rest Day Order | A day of rest by ordinance: the town sleeps in. | **Rested cap +50** (200 → 250) | +50 |
| `ord.open-doors` | Open Doors | The council asks every household to receive canvassers. | **Canvass actions +4 % success chance** (a bonus line in the breakdown; the 95 % clamp still applies) | +4 % |
| `ord.ward-register` | Ward Register | The wards keep a register: a name once known stays known. | **Local Standing: every Success counts two** | ×2 |
| `ord.ward-fund` | Ward Fund | A ward fund pays canvassers by the door, raised from the wage packet. | **Iron from checked actions +25 %; job pay −25 %** | +25 % / −25 % |
| `ord.public-meetings` | Public Meetings Order | A week of public meetings: the party's work counts for more. | **Faction XP +25 % on actions in the city** (a separate bonus line on base FXP, rounded per line; stacks with a Directive's +25 % as two lines) | max +25 % |

Notes for the rules: every effect is a bounded modifier on an existing number (`jobPayPct`, `shiftEnergyDelta`, `swingPct[type]`, `energyDelta[type]`, `trainingEnergyPct`, `restedCapDelta`, `chancePct[type]`, `standingMultiplier`, `ironPct`, `fxpPct`); bounds are the values in the table (the menu is closed, so the bound is the value). The bonus lines appear in the result modal like Rested and the Directive bonus, named after the ordinance (*Ward Fund: +5 Iron*). Ticket tags show a live cost change (*Rally Permits: 10 Energy*) and a bonus (*Open Doors: +4 %*). §15.3's table of ten ordinances is replaced by this list for the MVP; the battleground entries (Police Patrols, Tram Subsidy, Press Licensing, Curfew, Clinic Funding, Market Tax, Festival Permit) return in the slices that build the systems they touch.

**Ward Fund and Public Works are the trade-off pair:** the Fund pays the active member and costs the wage; Public Works pays the wage. `docs/economy.md` §14.4 has the figures (reference player: Ward Fund +123 Iron a day net; Public Works +22).

### 10.2 The order paper

- **The branch's motion** is always item 1 on the order paper, proposed by the party secretary at no cost: **Vanguard → Rally Permits** (the party of the Grand Rally), **Collective → Shift Hours Order** (the eight-hour day), **Alliance → Reading Room Grant** (the university town). It is the faction's legislative voice (§16.1) and the NPC default (§10.4).
- **Proposals:** a sitting councillor may put **one** more ordinance on the paper for **20 PC** during cycle days 0–1; at most **three** proposals join the branch's motion (first come). An ordinance already on the paper cannot be proposed again; the same ordinance as the one in force can (it renews). Proposals are irrevocable.
- The paper prints *Councillor {name} Moves {ordinance}* the next morning (personal, priority 2, `hl.moved`; deck *{ordinanceLine} The council divides at {weekday} midnight.*).

### 10.3 The vote

One tap: each councillor picks **one** item on the order paper (or *Against all*), during cycle days 0–1, final. Votes are **public** inside the council (a council is a public body; the chamber screen shows who voted for what once cast), unlike the election ballot.

### 10.4 How it passes

At the boundary into cycle day 2 the council **divides**:

1. **NPC councillors vote for the item with the most votes from player councillors.** Ties between items: the branch's motion if it is among them, else the earliest proposed. If no player councillor voted, NPCs vote for the branch's motion. This is §15.10's rule ("with the majority of their faction's player members; the Chair's whip if none; abstain if neither") applied to a council, with the branch's motion standing in for the whip until a Chair exists (slice 7). NPCs never vote *Against all*.
2. An item **passes with four or more of seven**. The item with the most votes passes if it has four; otherwise **no ordinance** that term (*Council Rises Without a Motion*), and the city goes without from cycle day 2 (the previous ordinance expires as usual).
3. A passed ordinance is **in force from that boundary for five City Days** and replaces whatever was in force. **The cap is one per city.** Expiry is by the calendar, never by a job on the ordinance itself: the city document stores `ordinance { id, fromDay, toDay }` and rules read it lazily.

With any NPC seats at all, something always passes (NPCs make the majority behind the leading player choice); with seven player councillors a three-way split can fail, which is what a council of real people risks. During **Unrest** (§11.3) NPC councillors **abstain**, so a motion needs four player votes: the slice-3 form of "NPC councillors may defect".

### 10.5 The councillor's screens, step by step

1. The morning after the count: the front page (§12.3) → **To the council**.
2. **The council** screen: seven seat tiles (faces and *ward* marks, *NPC seats: 6 / 7*), the term line, the order paper (the branch's motion and any proposals, each with its one-line effect), **Propose · 20 PC** (opens a sheet with the ten-line menu; one tap proposes), and the vote rows (one tap selects, a sticky **Vote for {ordinance}** commits).
3. **The result modal:** stamp **Voted**, headline *Your vote is recorded*, text *For {ordinance}. The council divides at 01:00 on Tuesday; the Clarion prints the result.* **Continue**.
4. The next paper: *Council Passes {ordinance}* and the plate line *Ordinance: {name} · 5 days left*.

---

## 11. Morale (§14.11)

### 11.1 Definition

Morale is the home faction's share of its home city's meter (§14.2), shown as the plate's percentage. Slice 3 gives it states with effects and the inputs that move it in both directions.

### 11.2 Inputs in slice 3

| Input | Effect on the home share | Where it comes from |
|---|---|---|
| Political actions at home | +0.005 per Energy on Success, half on Partial, drawn from Neutral first (§14.2) | Slice 1 |
| **Daily drift** (new in the build; Appendix C #16 closed) | **2 % of the distance to 70 a day** (95 → 94.5; 60 → 60.2), at the 00:00 UTC boundary (world level, §15); the points move between the home faction and Neutral | GDD §14.11 ("drifts toward 70 % at 2 % a day": pinned as 2 % of the gap. An absolute 2 points a day would out-run a lone recruit's +1.15 and keep every one-player city at *Steady* for ever) |
| A ballot cast (any resident member) | **+0.5** per ballot | New: turnout is morale |
| A player takes a seat | **+2** | New: the branch has a councillor |
| An election in which **no player voted** | **−3** at the count | New: the branch stayed home. The only negative input until rival action arrives (slice 5) |
| Street Permits in force | Propaganda swings +15 % | §10.1 |

Starting from the 70 baseline with nobody playing, morale sits at 70 (*Steady*) and falls 3 per unvoted election: the fourth in a row (20 days) tips a city into *Unrest*, and the drift back is a few tenths a day. One reference recruit alone takes a city from 70 to *Fired up* in about nine days (+1.15 a day against a drift that starts at 0 and reaches −0.2 at 80); a casual in about thirteen; five of them in two, and to the 95 cap in five. So the first week is *Steady*, the state flips during week 2 with a knock-on line in the modal, and a branch that stops canvassing slides back over a month. That is the intended shape: neglect, not absence, is what the state measures, and the cost is the faction's, never a player's asset (§4.3 rule 4).

### 11.3 The states

| Morale | State | Effects in slice 3 | Later slices |
|---|---|---|---|
| **80–100** | **Fired up** | **+10 % Faction XP on actions in the city** (a bonus line, base FXP × 0.10, rounded per line: a 6-FXP canvass shows *Fired up: +1*) | More NPC volunteers at events (6); the full 10 % national weight (7) |
| **60–79** | **Steady** | Nothing | — |
| **50–59** | **Unrest** | A **crisis**: the morale headline reads *Unrest in …*; the day's slot A and B Party orders are replaced by the fixed pair **Restore the base** (`dir.restore-canvass`: any canvass in the city, 3 attempts; `dir.restore-speech`: any speech, 1 attempt), each completion paying **+40 FXP** instead of +20; **NPC councillors abstain** on ordinances (§10.4); the plate reads *Unrest* in the failure colour | The 5 % national weight, rival spy pay, Legislature defections, the Chair's confidence vote (5–7); a Legacy entry for the way out (8) |

**Fired up is +10 %, not the GDD's +5 %.** Per-line rounding (halves up) turns 5 % of a 6-FXP canvass into nothing, so the state would be invisible at tier 1, against the pillar that every result shows its numbers. At 10 % every line shows +1 or more. The economy cost is about +6 % FXP a day for an active city (`docs/economy.md` §14.5), and *Fired up* is the normal state of any city with an active branch, so it is a small permanent acceleration rather than a bonus; Rank 3 moves from day 10 to about day 9.5. Accepted.

**The way out of Unrest:** morale back to 60 or above. The paper prints *{City} Stands Firm* (§8) and the orders return to the rotation. A city leaves Unrest at 60 and enters it below 60; no oscillation rule is needed because the drift near the thresholds is a few tenths a day against inputs of a point or more.

### 11.4 Where morale shows

- **The city plate:** *Coalport · Home city · Collective 84.0 % · Fired up* (the state word after the share; *Unrest* in the failure colour).
- **The paper:** the existing `hl.morale-*` line every morning; `hl.stands-firm` on the morning a city leaves Unrest.
- **The result modal:** the opinion tile as today; when an action crosses a threshold, a knock-on line: *Coalport: Fired up · +10 % Faction XP at home* / *Coalport: Steady*. The Fired-up bonus line sits with Rested and the Directive bonus.
- **The HUD:** nothing new; the HUD is the character's, the plate is the city's.

---

## 12. What the player sees and does

### 12.1 Day 2: the first ballot

1. The paper: *{name} Made Activist by the Branch* ("The vote follows."), and the **Polling Day** section: *Coalport votes today · polls open until Saturday midnight* → **Cast your ballot**.
2. The ballot: nine names. Every line has a mark, a rank or *ward*, a standing, and its line. The player taps one; **Cast your ballot for Anna Weiss**.
3. The modal: stamp *Ballot cast*. *One vote for Anna Weiss. The Clarion carries the count on Sunday morning.* **Continue**.
4. Sunday's paper: *Polls Close in Coalport: Weiss Tops the Poll* and *Your Vote Counted: Anna Weiss Takes a Seat*, with the count table.

Four taps over two sessions. When the city is not polling on the day the player makes Rank 2, step 1 reads *Nominations open · Coalport votes from Thursday* with the CTA **See who's standing** (the slate), and the ballot follows within two days.

### 12.2 Day 10–14: standing

1. The paper: *{name} Made Organiser by the Branch* ("An Organiser can stand for the council."). Polling Day: *Nominations open until Tuesday midnight* → **Stand for the council · 10 PC**.
2. The slate screen: requirements as three ticks (*Rank 3 · Known in Coalport · 2 endorsements: 0 so far*), the platform line picker (three), **Declare · 10 PC**.
3. The modal: stamp **Filed**, *Your name is on the slate.* *Two endorsements by Tuesday midnight. Do today's orders and the branch backs you.* **Continue**.
4. The day's orders done → the council card: *All orders carried out · the branch endorses you · 1 / 2*. A colleague endorses (or the small-branch rule makes up the number): *2 / 2 · on the ballot from Wednesday*.
5. Polls (days 2–4): the candidate votes like anyone (for themselves, if they like).

### 12.3 The seat: the big moment

The count runs at the boundary. The next time the winner opens the game, the paper is due (the day changed), and its **front page** is theirs:

- The masthead, then a **printed photograph**: the player's avatar in halftone with a caption in Courier (*{name}, Organiser, elected to Coalport Council*), and over its corner the rotated stamp **ELECTED** (the `Stamp` component, success tone, animated in on open).
- The headline in display black: **{name} Takes a Seat on Coalport Council** (or *Tops the Poll*), the deck in italic, and the count table beneath with the player's row marked.
- One sticky CTA: **To the council** (the council screen with the order paper open, the vote waiting).
- The Me tab and the HUD line gain *Councillor, Coalport · term ends Thursday*; the knock-on line of the player's next action carries nothing extra. The seat's stamp appears once; the Paper tab reopens the same edition without the animation.

That is one screen, one stamp, one portrait, and a headline with the player's name, inside the paper the game already uses as its front door. It is the same shape as *In Print* (§3.3) for every later honour.

### 12.4 Losing

The paper: *{name} Misses the Last Seat by 3* and the count table with the player's row marked. No stamp. The Polling Day section: *Nominations open again on Friday*. Nothing else changes; the deposit is gone and the screen said so before the tap.

---

## 13. Rank and PC

### 13.1 The ladder

Rank 3 stays at **2,000 FXP** (about day 10; §5.2 holds, `docs/economy.md` §7). Slice 3 needs nothing above Rank 3: Rank 4 (Chair) is slice 7. The stipend's 20 FXP a day and *Fired up*'s +10 % are the only new FXP.

### 13.2 PC sinks (the first)

| Sink | PC | Who, when |
|---|---|---|
| Declare for the council | 10 (deposit; returned if struck) | Rank 3, nominations |
| Endorse | 10 | Rank 2, nominations, one per cycle per city |
| Propose an ordinance | 20 | A councillor, term days 0–1 |

Income stays 5 a day from the orders, plus 10 a day for a councillor. `docs/economy.md` §14.2: a daily player has about 45 PC on day 10, enough to file, endorse a colleague and, once seated, propose. The cap of 1,000 is untouched.

---

## 14. GDD edits made in this change

| Section | Edit |
|---|---|
| §0 | "Added 29 Sep 2026 (slice-3 design)" change table |
| §2 | Council Cycle row: the phases (2 nominations, 3 polls, count at the boundary); "polls are open somewhere every day" |
| §3.3 | Polling Day and In Print pinned for slice 3; the front page with the stamp and the photograph |
| §3.6 | "the first vote (day 2, Rank 2)" → the right on day 2, the ballot by day 4 |
| §5.2 | Rank 2 row restated |
| §6.5 | Councillor stipend gains 20 FXP; endorsement limits; proposal cost confirmed; the sinks arrive in slice 3 |
| §14.2 | Drift for home cities built in slice 3 (was slice 4); ballots and seats as inputs |
| §14.11 | Morale inputs, *Fired up* +10 %, the slice-3 crisis effects, *Restore the base*, the drift pinned as 2 % of the distance to 70 a day |
| §15.1 | Councillor row: propose (20 PC) and vote; a sitting councillor cannot stand for the next council of the same city |
| §15.2 | Tenure applies after a switch; council results final at the count in the MVP |
| §15.3 | The calendar with phases and boundaries; the home-city count (ward vote, endorsements, members' votes, ties); the ballot (single, secret, final); the ordinance menu for the MVP; the order paper and the division |
| §15.10 | The slate of nine; NPC marking; NPC councillors' rule with the branch's motion as the whip; NPCs abstain during Unrest |
| §17.1 | Note: chapter 2 of *Finish His Work* keys off the first vote (unchanged text; scope note only) |
| Appendix C | #3 closed (NPCs are marked); #16 closed (drift built in slice 3); new #21 (the ballot lands day 2–4), #22 (the ward-vote weights), #23 (*Fired up* as the normal state), #24 (the small-branch endorsement rule), #25 (running totals during polls) |

Companion edit: `docs/economy.md` §14.

---

## 15. Questions for the architect

1. **The count as a world event.** The phase is pure (`cycleDay` from the day key), so no client waits on a job. The count and the division need one **Agenda job at 00:00 UTC** (`cityDay`) per ADR 0005 §5 that, per city: counts an election due, seats the council, divides the ordinance, applies the drift and the morale events, opens the next election document. Suggested: also allow a **lazy count on first touch** after the boundary (the first request that finds an election past its close counts it under a lock), with the job as the guarantee, so a player opening the paper at 00:00:30 sees the result and never a stale edition. Your call.
2. **The paper's political sections live at read.** The seat front page, Polling Day and the count must not be baked into an edition that was settled before the count ran. Suggested: render them from `elections` and `officeTerms` on `paper.today`, and mark the *Elected* stamp as seen on `paper.markRead` (`officeTerms.frontPageSeenAt`).
3. **Collections** (plan §5): `elections { cityId, cycle, nominationsFrom, pollsFrom, countDay, candidates[{ characterId | npcId, filedAt, platformId, endorsements[], wardVote, struck }], result, turnout, countedAt }`, `votes { electionId, voterId }` (unique), `officeTerms { cityId, holder, seat, fromDay, toDay, completed }`, `ordinances` as the order paper and the council's votes per term, and `city.ordinance { id, fromDay, toDay }` on the city document. Endorsements can live on the candidate (few) with a unique `(electionId, endorserId)` guard in `votes`-style rows if you prefer.
4. **Idempotency.** Vote, endorse, declare, withdraw, propose and the council vote are all set-once conditional updates to a target state (ADR 0008), keyed by the natural key (election + voter, etc.); none rolls, so no idempotency key is needed. PC is spent in the same transaction with an `pc ≥ cost` guard.
5. **Ordinance effects in rules.** A closed `OrdinanceEffect` DSL (like `OriginEffect`) validated by content, applied by `packages/rules` as bounded modifiers in the check breakdown, the rewards and the Energy cost, each as a named line. The client shows them on tickets as tags and in the modal as lines.
6. **Standing ×2 (Ward Register)** is applied at write: each Success adds 2 to `localStanding` while in force. No retroactive change.
7. **Rested cap +50** must not destroy Rested when the ordinance expires: the pool keeps its value and simply stops banking above 200 (being away never costs assets).
8. **Seeding.** On deploy, each city needs a sitting NPC council and the branch's motion in force, so no city is council-less on day 1. Existing characters need `offices: []`, `endorsementsGiven: []` and nothing else.
9. **Ambition chapter 2** (*Stand where he stood*, Rank 2) keys off the first vote and its requirement is met in this slice. Its script is not in scope here; say if you want it in slice 3, and I will write it as content in a day.
10. **PC in the HUD on phones** has been hidden since slice 1. With the first sinks it should show once PC > 0, or live on the council card and the Me tab if the bar is full. Your call; the screens doc assumes the bar.

---

## 16. Content-policy check

Every string above was read against `docs/design/content-policy-review.md` §7: no rank word the army uses, no salute, colour, symbol or slogan, no "front", "war", "enemy" or "uprising". The Vanguard's slate is clerks, storekeepers, a signalman, a schoolmistress and a landlady; its lines ask for order, fixed prices, permits and quiet streets, and no line argues that it is right. The Sentinel's decks are cold ("The committee does not extend deadlines"). The Collective's titles are unions' (shop steward, docker, furnace man). Chalking, torches and marks are absent. Vocabulary throughout is electoral: nominations, slate, ballot, poll, count, seat, order paper, motion, division.
