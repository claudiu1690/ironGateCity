# Slice 6 — "Together": Campaign Events, the Faction HQ, chat and presence, favours

Game designer, 3 Oct 2026. Rules and numbers for slice 6, designed one slice ahead while slice 5 ("Risk") is built. Companion: `docs/design/slice-6-screens.md` (every screen and state). Economy: `docs/economy.md` §20. The GDD is the source of truth; every rule here is in it (§16.2, §16.3 and the sections listed in §15 below).

| | |
|---|---|
| **Builds on** | Slice 3 (the calendar, orders, morale), slice 4 (districts, the ledger, Issues, journeys), slice 5 (Heat, the cells, the infirmary, run-ins) |
| **The plan's slice 6** | Campaign Events (scheduling, roles, sign-up as commitment, automatic resolution, results in the modal and the paper) · faction chat and presence over WebSockets · the Faction HQ screen (Directives, members, the contribution ledger, the event board) · favours (posting bail, hospital visits) |
| **Question** | **Do players feel part of a team, and do they come back for the group's events?** |
| **Pillar 7 check** | One tap joins an event; calling one is three steps; **nothing requires being online at a set time**: an event resolves without its members and the result waits in a modal and in the paper; sign-up spends Energy like any action and the Energy always pays something. Chat is optional. Favours are one tap. |

---

## 1. The design in one paragraph

A **Campaign Event** is a ticket with several names on it. A Rank 3 member (or, every day, the branch secretary) calls one at a venue in the city they are standing in, one to twelve hours ahead, and takes the first role. Members sign up for the other roles from the board, the venue or the paper; **signing up is the commitment**: it spends the role's Energy there and then, and nothing after that is required of them. At the start time the server rolls every role on its holder's stats, fills the empty ones with the branch's volunteers at half strength, and turns the roles' results into one of four outcomes, **Triumph, Success, Mixed or Fiasco**, which decides the opinion swing, the Party XP, the Political Capital and the headline. Each member gets a result modal on their next read and a line in the paper. Around the events sits **the Faction HQ**: a tab with the day's orders, the event board, the members (who is here, who is in the cells, who needs visiting), the faction's scoreboard, and the branch's chat. **Favours** are the small things a branch does: post a mate's bail, visit the ward, ask someone to take a role. Nothing in the slice is a war: a rally, a canvass, a night of posters, a strike at a gate, a story in a paper.

---

## 2. Campaign Events: the rules

### 2.1 Shape (GDD §16.3)

| | |
|---|---|
| **What it is** | A scheduled, co-operative political action in one city (one district in the capital), of one of six **event types** (§3), at a **venue** that is an existing location, with **named roles** (3–5) and up to four **hands** |
| **Who sees it** | Members of the calling faction only. Rival events are invisible in slice 6 (the barman's report is slice 8; counter-demonstrations v1.1) |
| **When** | Called for a start **1 to 12 hours ahead**, resolved at that time by the server, present or not. The branch's own daily event resolves **at the City Day boundary** (§4) |
| **Where** | A venue in the city the caller stands in. Never on rival ground (§14.12: no events there in slice 6; a visitor sees none) |
| **One tap** | Joining is one tap on a role (two with the confirm on a sheet, §screens 3); calling is three steps |
| **Nobody waits** | The result arrives as a modal on the next read and in the Morning Paper; the board keeps the last ten results |

### 2.2 Who calls, where, when

- **Callers:** members of **Rank 3 and above** (the faction's title at run time: *Organisers and above*), standing in an open city (home or the capital), not held, not in transit. **The branch secretary** calls one fixture a day per faction in its home city and in the capital (§4). A Faction Chair's faction-wide events are slice 7.
- **Cost of calling:** none beyond taking the first role (the caller's sign-up is the call; §2.4). No Political Capital, no Iron.
- **The venue** is fixed per event type per city (per district in the capital) in content (§3.7): the caller chooses the event, not the place. In the capital **the call names its district** as a capital action does (GDD §14.13: which district you stand in is client memory): the sheet lists the open district's events, *go there to call it* means switching district on the map, and the server checks only that the caller is in Irongate and that the venue is in the named district. The venue's sheet carries the event as a ticket while it is open.
- **When:** the start is chosen from four chips, **in 1 hour · in 3 hours · in 6 hours · in 12 hours**, printed with the local clock (*at 19:40*). A start past the City Day boundary resolves on the next City Day and counts against that day's limits. No clock time is ever required of anyone: the chips are for the caller's convenience, and the result waits.
- **Limits per faction per city** (the scale lever; Appendix C #58): **one upcoming member-called event at a time**, **at most two member-called starts a City Day**, plus the branch's fixture: **three starts a day** at most. A fourth attempt reads *The branch has its hands full in Coalport today*. In the capital the limit is per district.
- **Limits per member:** at most **three open sign-ups** at once (the GDD's "3 events per City Day", re-expressed so that it needs no day counter: starts are 1–12 hours ahead).

### 2.3 Roles and hands

- **Named roles** are the event's own (§3): each has a **stat** (one, two averaged, or *best*, §8.4), an **Energy** (10 or 15) and a one-line hint. **Rank 2 and above** may take a named role (GDD §5.4). One role per member per event.
- **Hands** (new): up to **four** places on every event for **any Rank**, 5 Energy each, no roll. A hand's Energy counts toward the members' share of the event (§2.7) and a hand is paid like everyone else at their Energy. This is how a Rank 1 member joins the first Campaign Event on day 1 (GDD §5.2's target), and how a full roster gets a little more.
- **The branch's volunteers:** at the start, every empty named role is filled by a volunteer: *townspeople run by the game* (the local-candidate rule, §15.10), scoring **half** (0.5), or **three quarters** (0.75) when the event's city is the faction's home and *Fired up* (§14.11's "more NPC volunteers"). Volunteers take no reward and are listed as *Volunteer · townspeople run by the game*.

### 2.4 Sign-up is the commitment

| | |
|---|---|
| **Gates** | Rank 2 for a named role (any Rank for a hand); standing **in the event's city** at the tap (the capital: anywhere in Irongate; the district is the venue's); not held, not in transit, not on rival ground; Energy at or above the role's; not already on this event; fewer than three open sign-ups |
| **What it spends** | The role's **Energy, at the tap**, as any action: Rested is drawn per Energy point (§6.3) and its bonus applies to the role's XP at resolution (*Rested: 15 of 15 Energy, +50 % XP*). Nothing else is locked |
| **What it needs afterwards** | **Nothing.** Where the member is at the start, whether they are online, in the cells, on the ward, on a train, in another city or on rival ground, changes nothing: the role resolves on their stats as they stand at the start and pays them. The fiction is that they did their part before the start; the held screens say so (*You were in the cells when it started; the branch counted you anyway.*) |
| **Withdrawing** | One tap, **until an hour before the start**: the Energy (and Rested) is returned in full (above a full bar the regen's overflow rule applies: the excess banks as Rested, capped) and the role opens; an event order the sign-up completed **stays carried out** (orders never go backwards). **In the last hour the roster is committed** and the button is gone (*Committed from 18:40*). The branch's fixture: until an hour before the boundary |
| **The caller withdraws** | The event stands; it is the branch's now |
| **Nobody at the start** | An event with no member on it at the start is **called off**: no result, no volunteers, a line on the board and in the caller's paper. Nothing was spent by anyone, so nothing is lost. A fixture nobody joined is called off quietly: not under *Results*, no paper line (it has no caller) |
| **Orders** | A sign-up in the residence city counts for the slot-B order *Take part in the branch's event today* at the tap (§5), like *Take a job* |

Pillar 7, rule 4: Energy committed to an event is never lost. If the member stays, it pays on the outcome; if they withdraw in time, it comes back; the one case where it is spent for nothing (a Fiasco) still pays a fifth of the XP, a quarter of the Party XP and 3 Political Capital.

### 2.5 Before the start: what a member sees

The event's page (board, venue ticket, paper row, chat line all open it): the event's name and venue, the start in the local clock and a countdown, who called it, the blurb, the roles with who holds them (avatar, name, rank title; *open* with the member's odds word and stat for that role; *Volunteer* after the start), the hands, **what it can pay** (*opinion up to about +2.3 here · Party XP by the outcome · 3 to 15 Political Capital · a line in the paper*; the opinion figure is the ceiling at a full roster, base × 1.5 for a Triumph × the day's lines, one decimal, so a Rally reads +2.3 on a plain day; four hands can lift the real figure a little past it, which *about* covers), the Issue tag if the venue and type match a live Issue (*Issue: the tram fares · opinion +50 %*), *Close race · +25 %* when the district is one, and one Courier line: *Roles still empty at the start go to the branch's volunteers at half strength. You need not be here: the result waits for you.*

Odds on a role are the §8.4 words (*Good odds · Intelligence*), computed for the member at read; a role whose stat the member is weak in says so (*Long shot · Charisma and Intelligence*) and the hint says who it suits.

### 2.6 Resolution (`packages/rules`: `resolveCampaignEvent`)

**Inputs** (pure; the server gathers them in one transaction at the start):

```
type:          { id, roles[] { id, stats, energy }, baseSwing, difficulty: { home, capital }, actionType, special? }
venue:         { cityId, districtId? , factionId (the caller's), targetFactionId? (Headline Story) }
participants:  Array<{ characterId, roleId | 'hand', energy, stats { str, int, agi, cha }, standingLevel (in the city),
                       level, restedCovered, orderOpen (the event order), heatState }>
volunteerScore: 0.5 | 0.75          (0.75 only at home while Fired up)
factors:       { issuePct: 0 | 50, battleground: boolean, groundswellPct, ordinanceSwingPct (for actionType), firedUp: boolean }
seed:          a secret seed stored on the event (ADR 0036), one named stream per role
```

**Per named role held by a member:** one §8.4 check, `chance = 50 + 4 × (stat − difficulty) + 3 × standingLevel + (battleground ? 5 : 0)`, 5–95, difficulty **by the event type, +2 in the capital** (§3; the tier-1 pattern of 8 → 10). One roll per role from the seed: at or below the chance **Success (1)**, up to 20 above **Partial (0.5)**, more than 20 above **Failure (0)**. A role on *best* takes the holder's highest of STR, INT and AGI (the Doorstep Drive's door-knockers: the coordinator gives you the doors you are fit for). CHA roles use worn CHA.

**Per empty named role:** `volunteerScore`.

**Hands** do not roll.

**The score** `S = (sum of the named roles' scores) ÷ (number of named roles)`, 0–1.

| Score | Outcome | Multiplier (`m`) |
|---|---|---|
| **0.875 and over** | **Triumph** | 1.5 |
| 0.625 to 0.874 | **Success** | 1.0 |
| 0.375 to 0.624 | **Mixed** | 0.5 |
| under 0.375 | **Fiasco** | 0 (rewards at the Fiasco rates below) |

So a four-role event is a Triumph with three Successes and a Partial, a Success with two Successes and two volunteers, Mixed with a lone member's Partial and three volunteers (0.5), and a Fiasco only with Failures on the roster. **A lone member on the branch's fixture, succeeding, gets a Success** ((1 + 3 × 0.5) ÷ 4 = 0.625; at home *Fired up*, (1 + 3 × 0.75) ÷ 4 = 0.81, and a Partial still reads Success); a Triumph needs a roster.

**Members' share** `fill = min(1.25, (Energy of members' named roles + hands' Energy) ÷ (Energy of all named roles))`: a full roster is 1.0; a full roster and four hands 1.25; a lone member on a 40-Energy drive 0.25.

**The swing** `= baseSwing × m × fill × (1 + issuePct ⁄ 100) × (1 + battleground 0.25) × (1 + groundswellPct ⁄ 100) × (1 + ordinanceSwingPct ⁄ 100)`, full precision, rounded once to three decimals (the §14.4 line), drawn Neutral-first for persuasion events; **the Headline Story draws from the target faction** (half to the Alliance, half to Neutral, §14.2's rule for actions against a rival). At home it moves morale. **Attribution:** split equally among the member participants (roles and hands), one ledger row each, `kind: 'event'`; the rows are contributions (a hero can be made at a rally). A Fiasco moves nothing.

**Momentum:** when the venue and `actionType` match a live Issue's feeds (as an action of that type at that place would), each member participant adds **their committed Energy** to the faction's momentum on it (full on Triumph and Success, half on Mixed, none on Fiasco); the General Strike adds **double**.

### 2.7 Rewards per participant

| Line | Rule | Example (a 15-Energy role) |
|---|---|---|
| **XP** | **Tier-2 rate, 5 per Energy**, by the holder's **own roll**: Success in full, Partial half, Failure a fifth; Rested on top; a hand by the event's outcome (Triumph and Success full, Mixed half, Fiasco a fifth) | 75 / 38 / 15; a hand 25 / 25 / 13 / 5 |
| **Party XP** | **0.8 per Energy × the outcome**: Triumph ×1.5, Success ×1, Mixed ×0.5, Fiasco ×0.25; then the usual lines, each on the base: the order's +25 %, *close race* +25 %, *Fired up* +10 % at home | 18 / 12 / 6 / 3; a hand 6 / 4 / 2 / 1 |
| **Political Capital** | **Triumph 15 · Success 10 · Mixed 6 · Fiasco 3** (the GDD's 3–15), **in full for the first event resolved that City Day for the member, half (8 / 5 / 3 / 2) for the rest** (`docs/economy.md` §20.4: three events a day at full rate would pay 30–45 a day against 5 from the orders, and make the 1,000 cap a month away) | 10 |
| **Opinion** | The swing's share, on the receipt as the event's total and yours (*Opinion +1.20 for the Collective in Coalport · your share +0.30*) | |
| **Issue points** | The committed Energy (§2.6) | *+15 on the tram fares* |
| **Iron** | **None.** A rally pays no wages; the branch covers the paste. (GDD §18.2's "events" in *Other* is corrected: Iron from events is not in the MVP) | |
| **Reputation** | A named role's **Success is one win** in the event's city; hands and volunteers none | |
| **Heat** | **Grand Rally only: +5** for every member participant when the venue's district is **held (above 50) by a rival** (§16.1's "+Heat in rival-held cities"; only capital districts can be rival-held in slice 6) | |
| **Orders** | The event order at sign-up (§5); the roles' types match nothing else | |

Rounding as §5.5: each line to the nearest whole, halves up, base and bonus separately; a line that pays on Success never pays below 1 on Partial.

### 2.8 Where the result lands

1. **A result modal per participant** (`ResultModal kind="event"`, §screens 5), shown on their **next read** after the start (as the orders-complete modal waits), one per event, in the order resolved; it covers the map and says what happened, how every role went, the receipt and the knock-ons.
2. **The Morning Paper** (§10): *In Print* for every participant; a city line for the branch; the next fixture under *Events*.
3. **The board** keeps the last **ten** resolved events per faction per city with their outcome, roster and swing (§screens 2.2).
4. **The chat**: one system line in the city channel (*The branch's doorstep drive on Foundry Row: Success. Opinion +0.95.*).

### 2.9 Timers and the clock

Resolution is a **scheduled job** (`campaign-event-resolve` at `startsAt`; the plan names events as real events) **and** lazy: any read of the event at or after its start resolves it first, so correctness never depends on the worker (ADR 0025's pattern). Rolls are seeded per event by a **secret seed stored on it** (the id is public in the route and would let a member compute their roll before choosing a role; ADR 0036), one named stream per role, so the worker and the lazy path agree and filling another role never moves yours. Stats are read at resolution, which is "at the start" because a participant's read resolves their due events before any act of theirs. The branch's fixture is resolved by the city's boundary, before the drift, the count and Monday's Issues (ADR 0037); its result is in the same morning's paper with the orders. Event gains land in the tally of the City Day they are credited (the participant's next read); the headline is the event's day.

---

## 3. The six events

Every event: who may call it, the venue kinds, the roles (stat · Energy · hint), the base swing, the difficulty (home · capital), the `actionType` it matches Issues and council rules as, the special rule, the board blurb (≤ 200) and the four outcome texts (≤ 240, four sentences). Role hints ≤ 90. Energy totals are the named roles'; hands add 5 each.

### 3.1 Rally (every faction) · `event.rally`

Venue kinds `square`, `market`, `factory-gate`, `ministry` (a forecourt or steps) · **base swing 1.5** · difficulty **12 · 14** · `speech` · 45 Energy.

*A platform, a speaker, a crowd and someone to keep the edges tidy. The oldest thing a party does, and still the best way to be heard.*

| Role | Stat · Energy | Hint |
|---|---|---|
| Speaker | CHA+INT · 15 | On the crate. The crowd has to hear you and the heckler has to lose. |
| Organiser | INT · 10 | The flyers, the crate, the permit and the time. If it starts on time, that was you. |
| Security | STR · 10 | The edges of the crowd. A quiet word before it becomes a loud one. |
| Press | INT · 10 | Get the reporter there, get the name spelt right, get the photograph. |

- **Triumph** — *The square was ours* — The crowd filled the square before the speaker was on the crate and stayed after the police had gone home. Every question had an answer and every flyer found a hand. People went home saying the party's name as if they'd always known it.
- **Success** — *They stayed to the end* — A good crowd, a fair hearing and no trouble at the back. The speech ran long and nobody minded. The press took a name down correctly, which is rarer than it should be.
- **Mixed** — *Half the square* — The speaker was good and the sound was bad. Half the square listened; the other half bought chestnuts. The organiser says next time bring a cart to stand on.
- **Fiasco** — *Twenty people and a heckler* — Twenty people, a heckler who knew his business and a platform that gave at the first stamp. The press wrote it up, which was the worst of it. Nobody mentions it at the branch.

### 3.2 Doorstep Drive (every faction) · `event.canvass-drive`

Venue kinds `street` · **base swing 1.0** · difficulty **10 · 12** · `canvass` · 40 Energy. **The newcomer's event:** the door-knockers check the best stat, so every build has good odds on it from day 2, and it is the fixture most often (§4).

*Crews on a street with a list and a coordinator who knows which doors to knock. Low risk, steady work, and the best first event for a new member.*

| Role | Stat · Energy | Hint |
|---|---|---|
| Coordinator | INT · 10 | The list, the street and who takes which doors. |
| Door-knocker (×3) | best · 10 | A run of doors and a flyer for each that opens. You get the doors you're fit for. |

- **Triumph** — *Every door on the street* — Four crews, one street, every door knocked before the lamps came on. The coordinator's list came back with more ticks than crosses and three names for the branch. The street will remember who came.
- **Success** — *Most of the doors* — The crews worked the street in the light and finished in the dusk. Most doors opened; a few shut again, politely. The list is a good list.
- **Mixed** — *Half the street* — One crew got lost and one got talked at for an hour by a man with views on drains. Half the street was done. The other half can wait for Thursday.
- **Fiasco** — *Nobody in* — Wrong night: the street was at the pictures and the dogs were not. Two doors opened and one of them was the wrong party's. The crews went home early and the list is mostly blank.

### 3.3 Poster Night (every faction) · `event.poster-night`

Venue kinds `street`, `station`, `docks`, `press`, `ministry`, `university`, `square`, `bar` · **base swing 0.8** · difficulty **10 · 12** · `propaganda` · 30 Energy. Three roles: the event for a branch of three, and the first with **Agility** roles.

*A run of posters, two crews with paste and a printer who counts the sheets. The town reads it at breakfast and never sees who put it there.*

| Role | Stat · Energy | Hint |
|---|---|---|
| Printer | INT · 10 | The run: clean, dry and counted before the crews leave. |
| Paster | AGI · 10 | Up the fences, quick, before the lamps go out. |
| Paster | STR · 10 | The bucket, the brush and the high fences nobody else reaches. |

- **Triumph** — *The town woke up to us* — By dawn every fence from the yard to the market said the party's name in fresh paste. The run was clean, the crews were quick and nobody saw them because nobody came. The town read it with its breakfast.
- **Success** — *Up before dawn* — The posters went up in the dark and stayed up in the light. One crew ran out of paste and one ran out of fences. The rest of the town saw the party's name on its way to work.
- **Mixed** — *Paste and rain* — The paste was thin and the rain came at two. Half the posters held; the rest slid off the fences like wet bread. The printer blames the weather and the weather says nothing.
- **Fiasco** — *Torn down by six* — A rival crew followed yours with a bucket and a scraper. By six the fences were bare and the town read somebody else's posters instead. The printer counted the run twice and the crews once.

### 3.4 Grand Rally (Vanguard) · `event.grand-rally`

Venue kinds `square`, `market` (the main square) · **base swing 2.0** · difficulty **14 · 16** · `speech` · 55 Energy. **Special:** +5 Heat for every member participant when the district is held by a rival (§2.7). Written cold (content policy §7.4): the texts show the movement's manner and never say it is right.

*The movement fills the main square by the thousand: a stand, a speaker, ushers and a lookout. A show of numbers, and the biggest swing a rally gives.*

| Role | Stat · Energy | Hint |
|---|---|---|
| Speaker | CHA+INT · 15 | The square has to hear you to the far wall. |
| Stand-builder | STR · 10 | The stand goes up at noon and must hold until the end. |
| Usher (×2) | STR · 10 | The edges of the square, quiet and tidy. |
| Lookout | AGI · 10 | The side streets and the police. Know first. |

- **Triumph** — *The square, by the thousand* — The stand went up at noon and the square was full by seven, row on row in the lamplight, quiet until the speaker spoke. Nobody heckled; the ushers saw to that. The town will talk about the numbers for a week.
- **Success** — *A full square* — A full square, a stand that held and a speech that ended on time. The ushers kept the edges tidy and the lookout kept the police informed. The movement counts the crowd twice and prints the larger number.
- **Mixed** — *Half a crowd and a cold wind* — The stand went up late and the crowd came early and left in the same order. The speaker shouted into a wind that took every third word. The movement's paper calls it a success; the square knew better.
- **Fiasco** — *The stand came down* — A plank gave, the stand went over and the speaker went with it. The crowd laughed, which is the one thing a show of discipline cannot survive. The ushers blamed the stand-builder and the stand-builder blamed the wood.

### 3.5 General Strike (Collective) · `event.general-strike`

Venue kinds `factory-gate`, `docks` · **base swing 2.0** · difficulty **14 · 16** · `speech` · 50 Energy. **Special:** **double Issue momentum** on a matching Issue (§2.6). The GDD's "suspends factory jobs for a day" is retired with the shift (§9: a job is a wage, and the only factory-gate job is the Collective's own); its "strong Groundswell" is the momentum rule.

*The gate held shut from the first shift to the last, a bulletin on every bench and a runner between the branches. The town hears the quiet.*

| Role | Stat · Energy | Hint |
|---|---|---|
| Shop Steward | CHA+INT · 15 | Hold the gate with your voice. The shift has to believe you. |
| Picket Captain | STR · 15 | The gate itself, from six to six. |
| Printer | INT · 10 | The bulletin on every bench by noon. |
| Runner | AGI · 10 | Between the gate, the hall and the other branches, all day. |

- **Triumph** — *The gates stayed shut* — Not a wheel turned. The pickets held the gate from the first shift to the last, the bulletin was on every bench by noon and the runner kept the branches talking. The owners sent a man to ask what the men wanted.
- **Success** — *A day off the clock* — The gate held through the morning and most of the afternoon. The bulletin went round; a few went in at the back and were spoken to. The town noticed the quiet.
- **Mixed** — *Half out* — Half the shift came out and half went in, and the picket captain spent the day keeping them from arguing with each other. The bulletin was late. The owners noticed nothing they could not ignore.
- **Fiasco** — *Back by dinner* — The gate was open by nine and the picket was six people and a dog. The bulletin blamed the weather, the runner got lost and the owner's clerk counted everyone who went in. A bad day for the branch.

### 3.6 Headline Story (Alliance) · `event.headline-story`

Venue kinds `press` · **base swing 2.0 against the target** · difficulty **14 · 16** · `propaganda` · 45 Energy. **Target:** fixed at the call (the page says *against the {faction}* and that is what happens): in the capital the district's leader at the last boundary (the runner-up when that is the Alliance); in Ashford the rival with the larger share at the call. The swing is drawn from it, half to the Alliance and half to Neutral. **No Case File in slice 6** (Case Files are slice 8; from slice 8 a Case File on an NPC of the target faction adds +50 % to the swing and names them in the headline).

*A reporter, an editor, a source handled with care and a lawyer who reads every line. The story that moves a town against a rival in one morning.*

| Role | Stat · Energy | Hint |
|---|---|---|
| Reporter | INT · 15 | The facts, the names, the dates. Every one has to stand up. |
| Editor | INT · 10 | What runs, where it runs, and what gets cut. |
| Source-handler | AGI · 10 | Meet the source, keep the source, and keep the source a secret. |
| Lawyer | INT · 10 | Read every line as the rival's lawyer would. |

- **Triumph** — *Front page, above the fold* — The story ran on the front page under the paper's name and the rival's. Every fact stood up, the lawyer had read every line and the source stayed a source. By noon the whole town was reading it aloud to each other.
- **Success** — *Page three, and it held* — The story ran on page three with a photograph and nobody has denied it. The editor cut the best paragraph for space. The rival's branch sent a letter, which the paper printed under the story.
- **Mixed** — *A paragraph on page nine* — The lawyer struck two claims and the editor struck two more, and what was left was a paragraph on page nine. True, every word of it. Nobody read it.
- **Fiasco** — *Spiked* — The source dried up on the night and the lawyer would not pass a line of it. The editor spiked the story at eleven and ran the weather. The reporter's notebook is full and the paper is empty.

### 3.7 Content list: venues per city (existing locations only)

One venue per event per city; in the capital, one per district for the three common events and one district for each signature event: **30 rows** (12 in the home cities, 15 common in the capital's five districts, 3 signature in the capital; an earlier "27" was a miscount, corrected 15 Oct 2026). Ids are the content's. The developer checks each venue's kind against the event's list.

| City · district | Rally | Doorstep Drive | Poster Night | Signature |
|---|---|---|---|---|
| **Coalport** | `coalport.market-row` (the market cross) | `coalport.terraces` (Foundry Row) | `coalport.quays` (Harbour Quays) | General Strike: `coalport.mill-gate` |
| **Duskwall** | `duskwall.garrison-gate` (the Fortress Gate steps) | `duskwall.rampart-row` | `duskwall.goods-yard` | Grand Rally: `duskwall.quartermaster-market` (the Customs Market under the walls) |
| **Ashford** | `ashford.bridge-street` | `ashford.weavers-row` | `ashford.university` (the college boards) | Headline Story: `ashford.gazette-house` |
| **Irongate · Government Quarter** | `irongate.forecourt` | `irongate.chancery-row` | `irongate.ministries` | — |
| **Irongate · Old Town** | `irongate.basilica-square` | `irongate.lantern-lane` | `irongate.herald-house` | Headline Story: `irongate.herald-house` |
| **Irongate · Station & Market** | `irongate.market-square` | `irongate.bombed-blocks` | `irongate.tram-junction` | — |
| **Irongate · Eastside** | `irongate.ironworks-gate` | `irongate.foundry-row` | `irongate.riverside-quays` | General Strike: `irongate.ironworks-gate` |
| **Irongate · Garrison Hill** | `irongate.esplanade` | `irongate.villas` | `irongate.gate-tavern` | Grand Rally: `irongate.esplanade` |

The second quarters (slice 5) are not venues in slice 6 (an event's venue should be open to a Level 1 member: every venue above is in a first quarter or a district). Clearwater: slice 7.

---

## 4. The branch's fixture: the secretary's daily event

Until a Faction Chair exists (slice 7) and whenever no member has called one, **the secretary calls one event a day**, so that a branch of one has an event to join on day 1 and the board is never empty:

- **Where:** for each faction, **its home city** and **Irongate** (the capital branch; signed by the same secretary). Two fixtures a day per faction.
- **Which:** by the day key, `(dayKey + factionIndex) mod 3` over **Doorstep Drive · Rally · Poster Night** (the signature events are the members'); in the capital the district is `dayKey mod 5` over the five, at that district's venue; **all three factions' capital fixtures share the day's district** (meant: the three branches meet on the same ground, which is the fight; a faction offset is the lever if it reads as a stalemate).
- **When:** posted at the **City Day boundary** and **resolved at the next boundary** by the city-day job, so the fixture needs no clock time, is open all day, and its result is in the morning paper with the orders. Withdrawal until 23:00 UTC (an hour before).
- **Who calls:** the secretary (*called by Secretary Holm*); a member may still call their own events alongside it (§2.2's limits).
- **It is one of the day's three starts** in that city, and counts as its posting day's event: for *first event today* (§2.7) it is that day's **last**, since it starts at midnight; *first* is by start time among a member's committed sign-ups of the day.
- **The welcome day:** the Events row of the welcome edition points a new member at it (*Today: the branch's doorstep drive on Foundry Row · join as a hand · 5 Energy*), which is the §5.2 "first Campaign Event on day 1".

---

## 5. Party orders in slice 6 (GDD §13.7, §15.4)

The secretary still sets the three orders (the Chair is slice 7). **One template per faction joins slot B's rotation:**

| Id | Faction | Title | Match | Target | Line |
|---|---|---|---|---|---|
| `dir.event` | Collective | Take part in the branch's event today | an event sign-up in the residence city (`cityId: 'home'`, `kinds: ['event']`) | 1 | The branch is on the doorsteps tonight, and there's a list with your name on it. Take a role, or take a bucket. *(reworded 16 Oct 2026, D-S7I-1: the line prints on the front page and* canvass *is a system term, GDD §1.5)* |
| `dir.v.event` | Vanguard | Take part in the branch's event today | the same | 1 | The movement is in the square tonight. Take a role. Numbers are the point. |
| `dir.a.event` | Alliance | Take part in the branch's event today | the same | 1 | The Rooms have something on this evening. A role if you can, a pair of hands if you can't. |

Counts at the sign-up (any event of the faction in the residence city, the fixture or a member's), one attempt; +20 Party XP; the +25 % match bonus applies to the role's Party XP at resolution when the order was open at sign-up. `residence: 'any'` (a capital resident's title reads *…in Irongate* through `cityId: 'home'`). Enters the rotation from a character's **second City Day** (the welcome set is fixed). A new `OrderMatch` kind, `event`.

Tapping the order opens the fixture's page (or the board when a member's event is the only one).

---

## 6. The Faction HQ (the Faction tab)

The tab-bar stub *Faction* comes alive: one screen, five parts (screens §2). What each holds, as rules:

### 6.1 Orders

Today's three orders with progress and the secretary's portrait and line (the paper's Party-orders row, reused), the orders-complete state, and under them **today's fixture** as an event card.

### 6.2 Events (the board)

Upcoming events of the faction **in the city the member is in** first, then the faction's other cities folded (*Also today: Irongate · Eastside · a rally at 19:00*; joining needs being there); then *Your sign-ups* (every open one, any city); then *Results* (the last ten in this city). *Call an event* for Rank 3 and above.

### 6.3 Members

The faction's members. **Visible to members only.** Per member: avatar, name, rank title, Level, where they live (*Coalport* / *Eastside, Irongate*), **when last seen** as a band (*here now* when in the same city within ten minutes · *online* within ten minutes elsewhere · *today* · *this week* · *away*), **status** when it matters (*in the cells at Harbour Police · 24 min* · *in the infirmary · 12 min* · *on the train to Irongate* · *in Duskwall · rival ground*), heroes held, opinion moved this week. Sorted: here now, online, then by last seen; a name search; fifty a page. Tapping a member opens their **profile sheet** (§7.3). The favours live on the rows (§9).

### 6.4 Scoreboard (the faction's contribution ledger; GDD §14.5 "the faction screen's ranking by cycle and season is slice 6")

Two periods: **This week** (Monday to Monday, the Issues' week; council cycles differ by city, so a faction-wide ranking by cycle would be five rankings) and **All time** (*This season* from slice 8, when seasons exist and roll it over). Rows: name, Level bracket (1–15 / 16–30 / 31+), **Moved** (the sum of the member's positive ledger swings across every city, one decimal), **Events** (joined in the period), heroes in the period. The top ten of each bracket, the top three with the rosette; the member's own row is highlighted, and shown below the ten when outside them. A city filter (*All cities* · chips). Nothing here is secret: it is the §14.5 ledger, folded by faction.

### 6.5 Chat

§8. On a phone a tab; on desktop a column beside the rest.

---

## 7. Presence ("who's here"; GDD §16.2)

- **What is stored:** `presence { locationId | null, seenAt }` on the character (the character's `cityId` is the city): `seenAt` touched by the read path at most once a minute, never bumping the version, `locationId` on every action at a place and when a place's sheet is opened (one light mutation), cleared on boarding a train, set to the service's place when held.
- **Here now** = `seenAt` within **ten minutes**.
- **On a place's sheet** (under the blurb, one line): *Here now: you, {two own-faction names}{ and n more} · {k} from other parties*; when nobody: *Nobody else here just now.* Own-faction names are tappable (the profile sheet); other parties are **a count only**. The GDD's *strangers* are the other two factions summed: there are no neutral players.
- **Privacy on rival ground:** a visitor to a rival home city is **not counted and not named for anyone but their own faction** there (§14.12: a new player walks through Duskwall unnoticed; recognition by fame is later). A member on rival ground shows to their own faction's Members list as *in Duskwall · rival ground*.
- **The city plate:** *{n} of the {faction} in town now* (own faction only).
- **On the train:** *You and {n} others on this train* when the count over the same leg within the same ten minutes is cheap (slice 4's deferral); nothing tappable.
- **The chat header:** *{n} here* for the channel.

### 7.3 The profile sheet (public)

Avatar, name, faction and rank title, Level, where they live, member since, heroes (*District Hero, Eastside ×2*), Reputation in the city you are both in (*Known here*). **Not shown:** the record, Heat, Health, Iron, stats. Two buttons for a faction mate: *Message* (opens the chat with their name typed) and, when it applies, the favour (§9).

---

## 8. Faction chat (GDD §16.2)

| | |
|---|---|
| **Channels** | **Party** (faction-wide) and **{City} branch**, one for the faction's home city and one for the capital (*Coalport branch*, *Irongate branch*): **three channels per faction**; the member reads the branch of the city they stand in, or their residence city's elsewhere (rival ground), and may switch. Officers (Rank 4+) is slice 7 with the Chair |
| **Who** | Every member from **Rank 1** (GDD §5.4). Read and post |
| **A message** | Plain text, **at most 280 characters**, no links rendered (a URL is printed as text), no images, no formatting. Author: avatar, name, rank title; the time in the local clock |
| **History** | The last **200 messages or 7 days per channel**, whichever is less, kept; **50 loaded at a time**, older on scroll |
| **Rate limits** | One message every **3 seconds**; **30 in ten minutes**; an identical repeat within a minute is refused (*Said that already*) |
| **System lines** | In the branch channel of the place (the residence city's branch when the place has no branch of the faction, as on rival ground), from the server, in the paper's voice: an event called (*{name} has called a rally at Market Row for 19:40 · 1 of 4 roles*), the result (*The branch's doorstep drive on Foundry Row: Success · opinion +0.95*), a mate taken in (*{name} has been taken in at Harbour Police · bail 150 Iron* with **Post bail**), admitted (*{name} is in the infirmary · 18 minutes* with **Visit · 3 Energy**), a seat won, a hero named, a nudge (§9.3). System lines carry the buttons; nothing else in chat is tappable but names |
| **Transport** | WebSockets (the plan): live lines while the tab is open; otherwise the history on open. **Nothing depends on being connected** (a result lands in the modal and the paper whether or not the chat was open) |
| **Moderation now** | **Mute** a member (one tap on the profile sheet; stored on the character; hides their lines for you); **Report** a message (one tap; writes a `chatReports` document with the message and the twenty lines around it; nothing automatic); the sign-up name rule; the length and rate limits above. **Review 7 (§23.1):** the word filter, two tiers: slurs and real-world hate refused (*That can't be said here.*), swearing masked with the editor's dash (*b—*); names refused on either. The chat's one promise to the user is that it can be switched off: *Chat* can be hidden from the Me tab |
| **Slice 9** | Moderator roles and tools, timeouts and bans, word filters, the audit of reports, appeals, the chat-moderation policy itself (Appendix C #7, still open) |

The chat is **optional**: no rule, reward or event needs it. It exists so a branch can say *who's on the rally tonight*.

---

## 9. Favours (GDD §16.2)

### 9.1 Posting bail (GDD §19.2's "a faction mate posts bail")

| | |
|---|---|
| **From** | The Members list row of a mate in the cells, the system line in chat, the profile sheet |
| **Who** | Any member of the prisoner's faction with the Iron, from **anywhere** (the branch wires it; in transit, held or on rival ground included: it is Iron, not Energy) |
| **Cost** | **The prisoner's own bail figure** as the cells compute it (§19.2: 100 + 50 a mark, ×2 Notorious, ×2 rival ground, ×½ for an Alliance prisoner, the *Cells Are Full* Issue), paid by the payer; nothing transfers between players |
| **Effect** | The prisoner is **released at once** (Heat 25; at home they stand at the station's pin; on rival ground release is deportation as §14.12). The document records `bailPostedBy` |
| **Rewards** | The payer **+10 Party XP** (a favour is party work) and a line in their paper; the prisoner's release modal reads *bail posted by {name}* |
| **Limits and guards** | A prisoner's bail can be posted **once** (they are out); the prisoner must be of the payer's faction and in the cells at the tap (a stale row reads *Already out*); the payer cannot post their own bail from this path (the cells screen does that); **no limit per payer** beyond the Iron: nothing moves between accounts, so there is nothing to farm |

### 9.2 Visiting the infirmary (GDD §19.1's "faction mates can visit")

| | |
|---|---|
| **From** | The Members list row of a mate on the ward, the chat line, the profile sheet |
| **Who** | Any member of the patient's faction, **from anywhere but rival ground, while not held and not in transit** (3 Energy is an Energy action: the branch's runner takes the grapes) |
| **Cost** | **3 Energy**; no Rested drawn (a visit pays no XP), as *Walk out well* |
| **Effect** | The patient **+10 Health** and **five minutes off** the stay (lazily: `until` moves; a read at or after it discharges). **Once per visitor per stay; at most three visits count per stay** (a stay never falls below five minutes), later ones are grapes only |
| **Rewards** | The visitor **+10 Party XP**; the patient sees *Visited by {name}: Health +10, five minutes off* on the held screen and in the morning's paper |
| **Guards** | The patient must be on the ward at the tap (*Already out*); not for a rival |

### 9.3 The nudge (GDD §16.2's "give them a spot in your Campaign Event")

One tap on a member's row or profile while **you are signed up to an open event with a free place and the mate is not on it**: **Ask {name} to join {event}** posts a system line in the branch channel addressed to them, naming the first open named role they may take (*{caller} asks {name} to take the Press at the rally · 19:40*) or a pair of hands when only a hand's place suits them (*{caller} asks {name} for a pair of hands at the rally · 19:40*), with the event's button. No reservation, no state beyond *once per pair per event*. It is the cheapest social tap in the game and the one that fills rosters. **Review 7 (§23.2):** players read it as *the invite*; the button names the event (*Invite to the rally · 19:40*), is hidden when there is nothing to ask, picks the soonest event, and the line carries the venue.

---

## 10. The Morning Paper (GDD §3.3)

**A new section, Events**, under Party orders: the fixture and any open event of the faction in the residence city, one row each (*Today: the branch's doorstep drive on Foundry Row · settles at midnight · 2 of 4 roles · you're the Coordinator* / *· join*), a tap opening the event; live at read. **In Print** gains the event results, bail posted and visits. **Templates**, the Clarion in full; the Sentinel, Gazette and Herald with their own decks where the voice changes. New conditions: `eventOpenToday` (live), `eventResolvedYesterday { tookPart: boolean, outcome }`, `eventCalledOffYesterday`, `bailPostedForYesterday`, `bailPostedByYesterday`, `visitedYesterday`.

**The Coalport Clarion** (`hl.`):

| Id | Group · priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.event-today` | city 1 | an event of the faction open in the residence city today | Today: the Branch's {event} at {venue} | Called by {caller}, settles at {time}. {open} of {roles} roles still open; sign up at the Union Hall, at {venue}, or on the Faction tab. You need not be there when it starts. |
| `hl.event-triumph` | personal 0 (In Print) | took part; Triumph | {name} and the Branch Carry {venue} | A triumph: every role came off. Opinion in Coalport moved {swing} for the Collective; {pc} Political Capital each. Secretary Holm: "Again tomorrow." |
| `hl.event-success` | personal 0 (In Print) | took part; Success | The Branch's {event} Comes Off at {venue} | Opinion moved {swing} for the Collective. {members} members took a role; {pc} Political Capital each. The branch notes who was there. |
| `hl.event-mixed` | personal 1 (In Print) | took part; Mixed | Half a Crowd at {venue} | Half and half: some roles came off and some didn't. Opinion moved {swing}; {pc} Political Capital. More of the branch on it next time, says the secretary. |
| `hl.event-fiasco` | personal 1 (In Print) | took part; Fiasco | The Branch's {event} Falls Flat at {venue} | It didn't come off. Nothing moved; {pc} Political Capital for turning up. The Clarion prints it once and says no more. |
| `hl.event-city` | city 0 | the branch held an event yesterday in the residence city; the reader did not take part | The Branch's {event} at {venue}: {outcome} | {members} members took part and opinion moved {swing}. Today's event is below; a role or a pair of hands. |
| `hl.event-called-off` | personal 2 | the reader's event had no one on it at the start | Called Off: the {event} at {venue} | Nobody signed up by the start, so nothing happened and nothing was spent. Call it again when the branch is about; the chat is the place to ask. |
| `hl.bail-posted-for` | personal 0 (In Print) | bail posted for the reader yesterday | {payer} Posts Bail for {name} | Out of the cells at {place} on {payer}'s Iron ({iron}). The duty officer noted who paid. The branch remembers these things. |
| `hl.bail-posted-by` | personal 2 | the reader posted bail yesterday | {name} Stands Bail for {prisoner} | {iron} Iron at the desk of {place}, and {prisoner} out before the duty officer finished the page. +10 Party XP. |
| `hl.visited` | personal 2 | the reader was visited yesterday | Visitors for {name} on the Ward | {visitors} came by with grapes and the paper. Health up and five minutes off the stay for each of them. |

`{event}` is the event's name in lower case in running text (*doorstep drive*, *rally*, *poster night*, *general strike*, *grand rally*, *headline story*); `{outcome}` the stamp word; `{swing}` signed to two decimals; `{time}` the start in the player's clock (*midnight* for the fixture); `{visitors}` a list of names.

**The Duskwall Sentinel** (`hl.v.`), decks: *Called by {caller}, settles at {time}. {open} of {roles} roles open. Beacon House expects the square filled; the Faction tab has the list.* · *A triumph. Opinion in Duskwall moved {swing} for the Vanguard; {pc} Political Capital each. Organiser Stahl: "Noted. Again."* · *Opinion moved {swing} for the Vanguard. {members} members took a role; {pc} Political Capital each. The committee has the names.* · *Some roles came off and some did not. Opinion moved {swing}; {pc} Political Capital. The committee expects a fuller square.* · *It did not come off. Nothing moved; {pc} Political Capital for attendance. The Sentinel records it.* · *{members} members took part and opinion moved {swing}. Today's event is below. Attendance is expected.* · *Nobody signed up by the start. Nothing happened and nothing was spent. The committee suggests the chat.* · *Out of the cells at {place} on {payer}'s Iron ({iron}). The duty officer noted who paid. Beacon House has noted it too.* · *{iron} Iron at the desk of {place}. +10 Party XP. The movement looks after its own, in order.* · *{visitors} came by with the paper and something from the market. Health up, five minutes off each.* Headlines as the Clarion's with *the Movement* for *the Branch* and *Beacon House* for *the Union Hall*.

**The Ashford Gazette** (`hl.a.`), decks: *Called by {caller}, settles at {time}. {open} of {roles} roles open; the Rooms would be glad of a hand. You need not be there when it starts.* · *A triumph, the Gazette is pleased to report. Opinion in Ashford moved {swing} for the Alliance; {pc} Political Capital each. Mr Grey: "Good. Keep at it."* · *Opinion moved {swing} for the Alliance. {members} members took a role; {pc} Political Capital each. The Rooms are pleased.* · *Half and half. Opinion moved {swing}; {pc} Political Capital. Mr Grey counts the names and says nothing, which is his way of saying something.* · *It didn't come off. Nothing moved; {pc} Political Capital for turning up. The Gazette prints it once, more in sorrow than in anger.* · *{members} members took part and opinion moved {swing}. Today's event is below; the Rooms would welcome you.* · *Nobody signed up by the start; nothing happened and nothing was spent. The Rooms suggest asking in the chat first.* · *Out of the cells at {place} on {payer}'s Iron ({iron}). Legal Aid had halved it, which {payer} will want to know. The Rooms remember.* · *{iron} Iron at the desk of {place}. +10 Party XP. The Gazette approves.* · *{visitors} came by with grapes and a book. Health up and five minutes off for each.* Headlines as the Clarion's with *the Rooms* for *the Branch* and *the Union Hall*.

**The Irongate Herald** (`hl.ig.`), decks (the capital's branch; `{district}` where the Clarion says Coalport): *Called by {caller} in {district}, settles at {time}. {open} of {roles} roles open; the capital branch sits on the Faction tab. You need not be there when it starts.* · *A triumph in {district}: every role came off. Opinion moved {swing} for the {faction}; {pc} Political Capital each. The Herald prints the names.* · *Opinion in {district} moved {swing} for the {faction}. {members} members took a role; {pc} Political Capital each.* · *Half and half in {district}. Opinion moved {swing}; {pc} Political Capital.* · *It didn't come off in {district}. Nothing moved; {pc} Political Capital for turning up. The Herald prints it once.* · *{members} members of the {faction} took part in {district} and opinion moved {swing}. Today's event is below.* · *Nobody signed up by the start; nothing happened and nothing was spent.* · *Out of the cells at Police Headquarters on {payer}'s Iron ({iron}). The Herald prints who paid.* · *{iron} Iron at the desk of Police Headquarters. +10 Party XP.* · *{visitors} came by St Agnes with grapes. The sisters allowed it. Health up and five minutes off each.* Headlines as the Clarion's with *the {faction}* for *the Branch*.

---

## 11. The result modals

**The event result** (`ResultModal kind="event"`; screens §5), top to bottom: the event's art (§18; the ground sash says whose ground the venue is) with the stamp **Triumph** (the faction colour) / **Success** / **Mixed** / **Fiasco** (the failure colour), the kicker *CAMPAIGN EVENT · {VENUE} · {CITY}*; the event's headline and body for the outcome (§3); **How it went**: one row per named role (*Speaker · {name} · Success* / *Partial* / *Failure* / *Volunteer · townspeople run by the game*), your own row on paper-2 with *you*, and under your row when it is not a Success the one plain reason (§8.4); a row *Hands · {names}* when any; the receipt (XP with the Rested note, Party XP with its parts, Political Capital with *first event today* or *second event today · half*, Opinion as the event's total with *your share*, Issue points); knock-ons: Reputation (a win), the order (*Order carried out* was at sign-up; nothing here), Heat (the Grand Rally's +5 with the state), *Next: the branch's fixture, tonight · join on the Faction tab*; one button, **Continue**. On a Fiasco the reason row reads the roster's cause (*Three roles went to volunteers. More of the branch on it next time.* / *The speaker's Charisma was low for this.*; the player never reads *roster*, tech §12.5).

**Release, bail posted** (the slice-5 release modal with one line changed): stamp *Released*, headline *Out, on the branch's Iron*, body *{name} posted your bail at the desk. Heat is down to 25 and the duty officer has both your names. Say thank you in the chat.*, knock-on *Heat 58 → 25 · Noticed* · *Bail {iron} Iron · posted by {name}*.

**The payer's modal** (`kind="political"`): stamp *Bail posted*, headline *{name} is out*, body *The duty officer took the Iron, looked at you once and opened the door. The branch remembers these things.*, knock-on *−{iron} Iron · bail for {name}* · *+10 Party XP*; *Next: they're at the station's pin; the chat knows.*

**The visitor's modal** (`kind="political"`): stamp *Visited*, headline *Grapes and the paper*, body *Ten minutes on the ward, the matron pretending not to listen. {name} is sitting up. Five minutes off their stay and ten points of Health; the branch's runner took the parcel.*, knock-on *−3 Energy* · *+10 Party XP* · *{name}: Health +10, out five minutes sooner*.

**Called off** (the caller's next read): `kind="political"`, stamp *Called off*, headline *Nobody came*, body *No one signed up by the start, so the {event} at {venue} didn't happen. Nothing was spent. Ask in the chat before you call the next one.*, *Next: call another from the Faction tab.*

---

## 12. What the player sees and does

### 12.1 Day 1: a hand at the fixture (Rank 1)

1. **The welcome edition**'s Events row: *Today: the branch's doorstep drive on Foundry Row · join as a hand · 5 Energy*. Tap.
2. **The event page:** the blurb, four roles (*Coordinator · open · Campaigners and above* dimmed for a Recruit; three *Door-knocker* rows the same), *Hands · 0 of 4 · any Rank · 5 Energy*, the line *You need not be here: the result waits for you.* One tap: **Join as a hand · 5 Energy**. The order line: *Order carried out · +20 Party XP. Two remain. — P.H.* (if the event order is in the day's three; on the welcome day it is not).
3. **The next morning:** the result modal on the first read: *Most of the doors*, Success, the roster (three volunteers and the member's name under *Hands*), the receipt (XP +25, Party XP +4, Political Capital +10, Opinion +0.25 for the Collective in Coalport · your share +0.25, with volunteers scoring half the roster). Continue. The Clarion: *The Branch's doorstep drive Comes Off at Foundry Row*.

### 12.2 Day 2–3: a named role (Rank 2)

The Faction tab: *Events · Today: the branch's rally at Market Row · 1 of 4 roles*. The roles: *Speaker · open · Long shot · Charisma and Intelligence* (CHA 2), *Organiser · open · Good odds · Intelligence*, *Security · Fair odds · Strength*, *Press · Good odds · Intelligence*. One tap on Organiser: the sheet, **Organiser · 10 Energy**. The ticket on Market Row's sheet now reads *Campaign event · the rally · settles at midnight · you're the Organiser*.

### 12.3 Day 10: calling one (Rank 3)

*Call an event* on the board: (1) the list, *Rally · Market Row · 45 Energy of roles* / *Doorstep Drive · Foundry Row* / *Poster Night · Harbour Quays* / *General Strike · the Mill Gate*; tap *Rally*. (2) The sheet: four time chips (*in 1 hour · 15:40* …), the four role rows; tap *in 6 hours* and *Speaker*. (3) **Call it · Speaker · 15 Energy**. The chat gets the line; the Members tab's rows gain *Ask {name} to join the rally*; three taps nudge three mates. At 21:40 the server rolls it; the four modals wait; the Clarion prints *{name} and the Branch Carry Market Row* if it was a Triumph.

### 12.4 A mate in the cells

The chat: *Jan Sorel has been taken in at Harbour Police · bail 150 Iron · **Post bail***. One tap, a sheet (*Post bail for Jan Sorel · 150 Iron · they walk out now; you get +10 Party XP*), **Post bail · 150 Iron**. The modal; the chat line *{name} posted Jan Sorel's bail*; Jan's next read: *Released · Out, on the branch's Iron*.

---

## 13. Session shape (pillar 7)

| Act | Taps | Time |
|---|---|---|
| Join an event (a role or a hand) | 2 (the role, the confirm) | 10 s |
| Call an event | 3 | 20 s |
| Withdraw | 1 | 5 s |
| The result | 1 (Continue), on the next read | 15 s |
| Post bail · a visit · a nudge | 2 · 2 · 1 | 10 s |
| Chat | optional; a message is one tap and some typing | — |
| Read the board, the members, the scoreboard | 0–2 | 30 s |

**Nothing requires being online at a set time.** An event starts without its members; the fixture settles with the orders at the boundary; sign-ups are hours ahead and the Energy is spent at the tap, not held; withdrawal is one tap; the result waits in a modal and in the paper; chat lines wait in the history; a bail or a visit can be done from anywhere at any time and lands on the mate's next read. The one clock a member ever reads is a countdown that needs nothing from them.

---

## 14. Economy

`docs/economy.md` §20: a reference day with one, two and three events (XP +4 to +12 %, Party XP +7 to +20 %, Political Capital 10 to 20 a day against 5 from the orders), events' opinion per Energy against solo play (about 0.025 to 0.05 a point per Energy on a filled event, five to ten times a canvass, bounded by three starts a city a day and three sign-ups a member, so a team member about doubles their opinion for 15 % of their Energy), the branch-of-one case (the fixture pays a Success and +0.25 for 10 Energy), the fixture's floor on a city's daily opinion (two fixtures per faction a day), bail posted and visits as sinks (zero net: nothing new is created), and the halving of Political Capital after the first event. **Verdict:** no §5.2 milestone moves by more than a day; Political Capital is the number that moves, by design (the co-op reward), and the halving keeps it under 20 a day. Flags: §19.

---

## 15. GDD edits made in this change

| Section | Edit |
|---|---|
| §0 | "Added 3 Oct 2026 (slice-6 design)" change table |
| §1.5 | Slice-6 words: *a campaign event* (never *co-op*), *call an event*, *a role* / *a hand*, *the branch's volunteers: townspeople run by the game*, *Triumph · Success · Mixed · Fiasco*, *Here now*, *Post bail*, *Visit*, *the scoreboard* for the faction ledger, *Party* and *{City} branch* for the channels |
| §3.3 | The **Events** section; *In Print* gains the event results, bail posted and visits; the welcome edition's Events row |
| §5.2 | "First Campaign Event: day 1" is **a hand at the branch's fixture** |
| §5.4 | Rank 1 may take **a hand's place** at an event; Rank 2 **named roles**; Rank 3 calls events (as written) |
| §6.2 | Event roles cost 5 (a hand) to 15 Energy |
| §6.5 | Political Capital from events pinned: **Fiasco 3 · Mixed 6 · Success 10 · Triumph 15, the first event of the day in full, later ones half** |
| §13.7, §15.4 | The event order (slot B, from the second City Day); **the secretary's daily fixture** in the home city and the capital, resolved at the boundary |
| §14.2 | The Campaign Event swing pinned: base by event (0.8–2.0) × outcome (1.5 / 1 / 0.5 / 0) × the members' share of the roles' Energy (hands count; at most ×1.25) × the §14.4 lines; about 1–5 for a filled event; attributed equally to the member participants |
| §14.5 | The faction scoreboard: **this week** and **all time** (this season from slice 8), by bracket, Moved and Events |
| §14.6 | An event adds momentum like an action of its type at its venue; the General Strike double |
| §14.11 | *Fired up*'s "more NPC volunteers" pinned: **the branch's volunteers score 0.75 instead of 0.5** at home |
| §16.2 | Pinned for slice 6: the two channels, history, limits, system lines, mute and report; presence's ten minutes, names for own faction and counts for others, invisible on rival ground; favours (bail posted, visits, the nudge) |
| §16.3 | Rewritten: callers, the fixture, the venues, roles and hands, sign-up as the commitment, withdrawal, volunteers at 0.5 / 0.75, the score and the four bands, the rewards, the limits (three starts a city a day; three open sign-ups), no events on rival ground; **Poster Night** added; **Town Hall** to slice 7 (it adds Recall signatures); the **Headline Story without a Case File** in slice 6; the General Strike's effect is double momentum (the shift is gone) |
| §18.2, §18.3 | Events pay no Iron in the MVP; *Bail posted for a faction mate* as a sink (the prisoner's figure) |
| §19.1 | Visits pinned: 3 Energy, from anywhere but rival ground, +10 Health and five minutes off, once per visitor per stay, three count, +10 Party XP |
| §19.2 | Bail posted pinned: the prisoner's figure, from anywhere, once, +10 Party XP, release at once |
| §25 | Campaign Events at launch: Rally, Doorstep Drive, Poster Night and the three signature events; Town Hall at +60 days |
| Appendix C | New **#57** (hands at Rank 1), **#58** (three starts a city a day as the scale lever), **#59** (Political Capital halving after the first event), **#60** (the fixture at the boundary, not a clock time), **#89** (visits from anywhere; renumbered 4 Oct 2026 from a duplicate #61), **#62** (volunteers at half strength make a lone member's fixture a Success), **#63** (presence invisible on rival ground); **#7** stays open for the chat-moderation policy (slice 9) |

Companion edit: `docs/economy.md` §20.

---

## 16. Questions for the architect

Each with a default so the build does not wait.

1. **Events in content.** Suggested: `campaignEventTypes[]` (`{ id, name, factionId?, venueKinds[], roles[] { id, name, stats, energy, hint }, hands: 4, baseSwing, difficulty { home, capital }, actionType, special?: 'heatInRivalHeld' | 'doubleMomentum' | 'againstLeader', blurb, text { triumph, success, mixed, fiasco } }`) and `eventVenues[]` (`{ eventId, cityId, districtId?, locationId }`, §3.7), validated by the loader (venue kind in the type's list; one venue per event per city or district); rates, bands, the volunteer scores and the limits in `packages/rules` (`EVENTS`); `resolveCampaignEvent` pure, seeded per event by a secret seed stored on it (settled, §20).
2. **The collection** `campaignEvents` (`{ typeId, factionId, cityId, districtId, venueId, calledBy: characterId | 'secretary', startsAt, status: 'open' | 'resolved' | 'calledOff', roles[] { roleId, characterId | null, energy, restedCovered, signedAt }, hands[], result? }`); sign-up as one transaction (the character's Energy and Rested with guards, the role's slot with a guard that it is empty, the three-sign-up count, the sign-up counted for the order); withdrawal the reverse with the hour-before guard; the per-city per-day counters on the city document like `rivalPressure`.
3. **Resolution:** the Agenda job at `startsAt` plus the lazy path on any read of the event; one transaction writes the result, the ledger rows, the momentum, the rewards to every participant and a `pendingEventResults[]` entry on each character, shown by `loadCharacter` as the orders-complete modal is. The fixture is created and resolved by the city-day job.
4. **Presence:** `presence { locationId, seenAt }` on the character (settled: no `cityId`); `seenAt` touched by the auth middleware at most once a minute; `presence.at({ locationId })` as a light procedure the sheet calls; the place query counts and names from an index `{ 'presence.locationId': 1, 'presence.seenAt': -1 }`.
5. **Chat:** `chatMessages` (`{ channel: 'party:collective' | 'city:collective:coalport', characterId, text, at }`, TTL 7 days, a `$slice` or a count cap at 200 per channel on the tidy job), `chatReports`, `mutes[]` on the character; Socket.IO rooms per channel; the system lines are messages with `system: { kind, payload }`; ADR 0001's same-origin proxy and WebSockets to be tested.
6. **Favours:** `favours.postBail({ characterId })` and `favours.visit({ characterId })`, each one transaction across the two characters (ADR 0002's idempotency keys); the release path is the cells' own with `bailPostedBy`; the visit moves `held.until` by five minutes and `health` by 10, guarded by the visit list.
7. **The Faction tab:** views `factionHq.orders`, `factionHq.events`, `factionHq.members` (paged), `factionHq.scoreboard({ period, cityId? })` folding the ledger by character; the profile `characters.profile({ id })` with the public fields only.
8. **The paper:** the Events section live at read; the new conditions stored at resolution (`eventResolvedYesterday` per participant with the outcome) and at the favours.
9. **Playtest report:** events called and by whom (members vs the fixture), fill rate per role, sign-ups per member per day, withdrawals, outcomes' distribution, the share of D7 players who joined an event (GDD §27 target ≥ 40 %), chat messages per member per day and the share who never open it, bails posted and visits, and whether a member who joined an event came back the next day against one who did not. **The question is "do they come back for the group's events"**: the numbers to watch are the return rate after a sign-up and the fill rate of member-called events.
10. **Test hooks:** force an event's start to now, force rolls, create volunteers, put a character in the cells or the ward for the favours; the e2e needs call → sign-up by a second character → resolve → both modals → the paper, and the fixture at a forced boundary.
11. **The QA vocabulary test:** *rally*, *strike*, *picket*, *steward*, *security*, *lookout*, *stand* are allowed (content policy §6); *row on row* is not *rank on rank*; no string here uses *march*, *front*, *troops*, *army*, *militia* or a symbol; *the movement* in lower case stays allowed; *Triumph* is an outcome word, never a frame.

---

## 17. Content-policy check

Every string above was read against `content-policy-review.md` §7. The Grand Rally is a party's show of numbers written cold: a stand, ushers, a lookout, a paper that prints the larger number; nothing praises it and the Fiasco laughs at it. Its ushers (the roles were *Stewards* until that clashed with the Vanguard's Rank 2 title, §20) keep order at a meeting, a civic job; no uniform, drill, torch, salute, mark or slogan appears, and the one slogan in slice 6 is none. The General Strike is a picket, a bulletin and a runner; its people are shop stewards and pickets; no Soviet title. The Headline Story is a newsroom. *Security* is the reviewed all-faction role. The police in the texts are the republic's and appear as something a rally ends after or a lookout watches. No *march*, *front*, *uprising*, *enemy*, *troops* or *war*; rivals are rivals. The volunteers are *townspeople run by the game*, the local-candidate rule. The chat's system lines are in the paper's voice. **For QA:** the war regex's `front` matches *front page* in the Headline Story's Triumph (a newspaper's front page, like the reviewed *front door*) and needs the same allowance; *stand* (a platform) and *the Rooms* are existing words; *steward* is on the allowed list.

---

## 18. Art needed (noir lithograph, `mvp/` style; checked against the folder first)

**Already there and used by this slice:** `square.png` (the Rally: a speaker on a crate before a crowd; the result art and the board card), `street.png` (the Doorstep Drive: a canvasser at a terrace door), `news-strike.png` (the General Strike: a speaker at a factory gate with blank placards; 2,048 × 1,360, catalogued at its own size), `newsroom.png` (the Headline Story), `union-hq.png`, `vanguard-office.png`, `alliance-hq.png` (the Faction tab's header per faction), `jail-cell.png` and `hospital.png` (the favours' modals), the six avatars (chat and the members list), `holm.png`, `stahl.png`, `grey.png` (the fixture's caller), `sergeant.png` (catalogued as `portrait.duty-officer`, slice 5's word for the civic police's desk), `nurse.png`. Missing:

| # | Asset id | What it is | Format |
|---|---|---|---|
| 1 | `scene.event-poster-night` | A poster crew at night: two figures at a long fence with a bucket and a brush, a stack of fresh sheets under a street lamp, a printer's handcart, the town dark beyond; the posters' faces blank | scene 2688 × 1520 |
| 2 | `scene.event-grand-rally` | A main square filled by the thousand at dusk under strings of lamps, seen from the back of the crowd; a timber stand with one small figure speaking; plain bunting with no device, no flag, no symbol, no torches, no armbands; the fortress wall behind | scene 2688 × 1520 |

**Done 3 Oct 2026:** both are generated in the noir style and saved as `mvp/scenes/event-poster-night.png` and `mvp/scenes/event-grand-rally.png` (2688 × 1520). Checked: posters show only abstract shapes, bunting is plain stripes, no flag, symbol or text. Note that chat and the members list can use all 18 avatars now (12 new faces added on 3 Oct).

Nothing else: the Faction tab is paper and type; presence and chat use the avatars; the stamps are type; the ground sash is drawn by the client. Two pieces. The crest rule holds for both: no symbol anywhere, bunting plain, posters blank.

---

## 19. Points for the user (each with the default this document takes)

**Approved by the user, 15 Oct 2026: all seven defaults stand as written.** Nothing below moves; the build (phase A, from 15 Oct) follows them. GDD §0 (15 Oct 2026) and Appendix C #57, #59, #60 and #89 record it.

1. **A Rank 1 member may join an event as a hand** (5 Energy, no roll) while named roles stay at Rank 2 (§2.3). Default: **yes**; it is how the GDD's "first Campaign Event on day 1" is met. The alternative is Rank 2 for everything, which puts the first event on day 2. *Approved 15 Oct 2026.*
2. **The branch's daily fixture resolves at the City Day boundary** with the orders (§4), not at an evening clock time. Default: **the boundary**; no clock time for anyone, and one morning paper carries the orders and the event. The alternative, 20:00 UTC, would read as "tonight" to Europeans and as noon to the Pacific. *Approved 15 Oct 2026.*
3. **Events pay no Iron** (§2.7). Default: **none**; opinion, Party XP and Political Capital are the co-op prize and Iron already runs ahead of its sinks (`economy.md` §19.11). The alternative is the tier-2 Iron rate, which would make a rally the best-paid thing in the game. *Approved 15 Oct 2026.*
4. **Political Capital from events halves after the first event of the day** (§2.7). Default: **halve**; three full-rate events a day would pay 30–45 against the orders' 5 and reach the 1,000 cap in a month. The alternative is two events a day instead of three. *Approved 15 Oct 2026.*
5. **A visit is 3 Energy from anywhere but rival ground** (§9.2), not only from the same city. Default: **anywhere**; at low population a same-city rule would mean no visit ever happens. The alternative keeps the fiction stricter. *Approved 15 Oct 2026.*
6. **The Headline Story runs without a Case File in slice 6** and gains +50 % with one from slice 8 (§3.6). Default: **yes**; the Alliance needs its signature event in the slice that answers "do players feel part of a team". *Approved 15 Oct 2026.*
7. **Chat ships with mute and report only; the moderation policy and tools are slice 9** (§8). Default: **yes**, and chat can be hidden from the Me tab. The alternative is to hold chat to slice 9, which loses the slice's question. *Approved 15 Oct 2026.*

---

## 20. Settled for the build (3 Oct 2026; answers to `docs/tech/slice-6.md` §22.1 and §23)

The architect's defaults are accepted except two (Q6, Q17); Q13 is confirmed as written. Every change to this document's earlier sections was applied in the same change, so the content tests that read the tables stay in step. **Numbers that moved:** none; a Rested example was corrected (+38), a visit draws no Rested, and the Grand Rally's two *Steward* roles are **Ushers**.

### 20.1 The eighteen questions

| # | Decision | Where it now lives |
|---|---|---|
| 1 | **Poster Night's venue kinds gain `university`, `square` and `bar`** (the college boards, the tram shelters, the tavern wall): the venues of §3.7 were chosen per place and stand | §3.3 |
| 2 | **Rested on a 15-Energy role is +38** (37.5, halves up); the examples are corrected | screens §5, `economy.md` §20.1 |
| 3 | **An event order completed by a sign-up stays carried out after a withdrawal.** Orders never go backwards anywhere in the game; the report counts it | §2.4 |
| 4 | **Withdrawal above a full bar follows the regen's overflow rule**: Energy to the bar, the excess to Rested, Rested capped | §2.4 |
| 5 | **A fixture nobody joined is called off quietly**: not under *Results*, no paper line (it has no caller). A member-called event called off is listed and gets the caller's line | §2.8, §4, §10 |
| 6 | **Not the default. The capital's district is client memory** (GDD §14.13), as for every capital action: **the call names its district in the request**; the sheet lists the open district's events, and *go there to call it* means switching district on the map; the server checks only that the caller is in Irongate and that the venue is in the named district. Nothing stored holds a member to a district | §2.2 |
| 7 | **The Headline Story's target is fixed at the call**: in the capital the district's leader at the last boundary (the runner-up when that is the Alliance); in Ashford the rival with the larger share at the call. The page says *against the {faction}* and that is what happens | §3.6 |
| 8 | **Events take every line an action of the event's `actionType` at the venue would**: Standing, the close race, `chancePct`, `fxpPct`, `swingPct`, the comeback, the Issue. **Cost effects do not change a role's Energy** (the members' share is counted in it; *Rally Permits* leaves a Speaker at 15) | §2.6 |
| 9 | **Who may nudge:** any member **signed up to an open event with a free place** may ask a mate who is not on it, once per pair per event; the line names the first open named role the mate may take, or **a pair of hands** when only a hand's place suits them. New copy: *{caller} asks {name} for a pair of hands at the {event} · {time}* | §9.3, screens §2.3, §3.1 |
| 10 | **A visit draws no Rested** (it pays no XP), like *Walk out well* | §9.2 |
| 11 | **Three channels per faction:** *Party*, the home city's branch and the Irongate branch. A member reads the branch of the city they stand in; elsewhere (rival ground) their residence city's | §8 |
| 12 | **A system line from a place with no branch of the faction** (taken in on rival ground) goes to the **residence city's branch** | §8 |
| 13 | **Confirmed as written: all three factions' capital fixtures share the day's district** (`dayKey mod 5`). The three branches meet on the same ground, which is the three-way fight the fixture exists for; the paper can say so. The lever, if a shared district reads as a stalemate at low population, is a faction offset | §4 |
| 14 | **The fixture counts as its posting day's event** and, starting at midnight, is that day's **last** for *first event today*; *first* is by start time among a member's committed sign-ups of the day | §2.7, §4 |
| 15 | **The scoreboard shows the top ten of each bracket**, the rosette on three, the member's own row below the ten when outside them | §6.4, screens §2.4 |
| 16 | **Event gains land in the tally of the City Day they are credited** (the participant's next read), like a hero's Political Capital; the headline is the event's day | §2.8 |
| 17 | **Not the default. The Grand Rally's two *Steward* roles are renamed *Usher*** (ids `usher-1`, `usher-2`), so a row never reads *Steward · {name} · Steward* against the Vanguard's Rank 2 title. *Usher* is a civic word for the person who keeps order at a meeting and is in neither QA regex; the party's own description (*volunteers and stewards*, GDD §16.1) and the Collective's *Shop Steward* are unchanged | §3.4, §17, GDD §16.3 |
| 18 | **Modal order on a read:** a run-in, then the held release, then event results oldest first, then the orders-complete note | screens §12 |

**The seed.** Rolls are **seeded per event by a secret seed stored on it** (16 random bytes), one named stream per role, never sent before resolution; the event id is public in the route and would let a member compute their roll before choosing a role (ADR 0036). §2.6, §2.9, §16 Q1 and GDD §16.3 are reworded.

### 20.2 The sixteen notes (`docs/tech/slice-6.md` §23)

1. The seed: above. 2. Poster Night's kinds: #1. 3. Rested +38: #2. 4. **The swing's inputs** are every factor an action of the type at the venue gets (ADR 0030's named factors); §2.6's list is read as that. 5. **`presence.cityId` is dropped**: the character's `cityId` is the city (§7). 6. "Stats at the start" holds because a participant's read resolves their due events before any act of theirs. 7. **The fixture is resolved by the city's boundary**, before the drift, the count and Monday's Issues (ADR 0017, 0037), not by the character's settlement; its result is in the same morning's paper (§2.9, §4 reworded). 8. The nudge: #9. 9. Withdrawal and the order: #3. 10. Rewards and a long absence: #16. 11. The scoreboard's length: #15. 12. The Headline Story's target: #7. 13. **The data model**: the plan's slice-6 row becomes `campaignEvents` (roster embedded), `eventSignups`, `chatMessages`, `chatReports`, `chatLimits`, faction-scoped `contributions`, and on the character `presence { locationId, seenAt }`, `events`, `chat`, `mutes`, `nameWords` (ADR 0036–0042); the plan's table is the architect's to amend. 14. **Vocabulary:** *front page* needs the allowance; *sergeant* is settled by slice 5 (*the duty officer*, `portrait.duty-officer`; `slice-5-risk.md` §23.1 #22) and no slice-6 string uses it. 15. **GDD §19.1's first paragraph now says *once per visitor per stay***. 16. No SSE: Socket.IO carries chat only; everything else refetches on focus.

### 20.3 For QA

`front page` joins both guards' `front` allow-lists. *Usher* and *ushers* are in neither regex. No slice-6 string uses *sergeant*, *march*, *front* in a political sense, *torch* or *in front of*.

---

## 22. Slice 6 copy (15 Oct 2026; phase A's questions answered)

Written into `packages/content` while phase B (the server) was built in parallel. Decisions, each the GDD's or this document's rule restated for the build:

1. **The venues are 30 rows, not 27** (§3.7): 12 home, 15 common in the capital, 3 signature in the capital. `docs/tech/slice-6.md` §1, §4.4 and the T5 row still say 27 and should read 30 (the architect's document); the wiki's *Campaign Events* page carries the same note.
2. **"Opinion up to about +x" is the Triumph ceiling at a full roster**: `opinionUpTo = base × 1.5 × the day's lines`, one decimal (tech §6.2), so a Rally reads *+2.3*, a Doorstep Drive *+1.5*, a Poster Night *+1.2*, the three signature events *+3.0*. §2.5's example read *+1.5* because it quoted the base; corrected. The developer changes nothing. Four hands can lift the real swing past the figure (the ×1.25 fill cap), which *about* covers.
3. **The two scenes' alt texts** were checked against the pictures and corrected in `data/art.ts`: the poster crew's sheets are *rolled on a handcart* (not stacked under the lamp), the fence's posters show only abstract shapes, a man in a hat keeps watch under the lamp; the Grand Rally's crowd holds *blank placards* and the fortress sits on its hill above the square. Both within 160 characters. Content policy holds: no flag, symbol, torch, armband or text anywhere in either.
4. **Headlines** (§10): forty, in `data/headlines.ts` (the Clarion, the Sentinel, the Gazette) and `data/heraldHeadlines.ts` (the Herald), built from one table of conditions, groups and priorities (`eventPaper`). Two headlines changed for a title-case start: the city line is *The Branch's {event} at {venue}: {outcome}* (the Movement's / the Rooms' / the {faction}'s), and the called-off line *Called Off: the {event} at {venue}*. *Roster* left the Clarion's Mixed deck and the Gazette's (*More of the branch on it next time*; *counts the names*), as tech §12.5 asks. In Print, marked by id on the server: `event-triumph`, `-success`, `-mixed`, `-fiasco`, `bail-posted-for`, `visited`.
5. **Copy** is one block, `copy.together`, with these families: `tabs`, `header`, `fixtureKicker`, `ordersOffCells`, `band`, `board`, `card`, `event`, `modal` (string templates on the server's paths: `call`, `signUp`, `calledOff`, `bailPosted`, `visit` with `bodyGrapes` for a fourth visit, `releasedBail`, and `hand`), `knock`, `withdraw`, `call`, `result`, `hereNow`, `members`, `profile`, `scoreboard`, `chat` (with `limits` and Me's `me` switch), `system` (the chat lines, the nudge in both forms, the buttons), `favours`, `held`, `paper`, `errors`, `help`. A withdrawal has its own small modal (*Withdrawn · You're no longer the {role}*), which §2.4's one tap implied and nothing had written.
6. **Vocabulary:** *front page* joins both guards' `front` allow-lists; **Picket Captain** (the General Strike's role, a union picket's captain, no rank) joins the slice-2 guard's allow-list, since that guard bans *captains?* and §16 Q11 had not checked the word. No new string says *patrol* (the pending night stop reads *Answer the stop first*), *roster*, *resolve*, *schedule*, *presence* or *ledger*.
7. **The paper's row says *at***: *Today: the branch's doorstep drive at Foundry Row*, one preposition for every venue (§4, §10 and §12.1 wrote *on* for a street).
8. **For the developer:** the six event conditions and `EVENT_PLACEHOLDERS` are defined in `packages/content/src/slice6.ts` with the loader's checks (the papers' ten names, the placeholders, event conditions never mixed with others); the content schema accepts them as input while its output type stays the rules' `HeadlineCondition` through one documented cast, which becomes a no-op once `EventCondition` is added to the rules' `HeadlineCondition` (tech §4.1). `event-today` is live and must be selected at read (the rules' `isPoliticalTemplate` does not know it); `{time}` is a time token like `{until}`.

**Phase C rulings (15 Oct 2026; the developer's and the e2e sweeps' questions, tech *Phase C, lane A* Deviations):**

9. **The Doorstep Drive, with three Door-knockers** (was *Canvass Drive* · *Canvasser*). §1.5 bans *canvass* for players and review 2 already renamed the Alliance's Rank 2 *Canvasser* to *Campaigner* (GDD Appendix C #37); an event name is read more often than a rank title, so the exception is not made official. The running name is *doorstep drive* (*Today: the branch's doorstep drive at Foundry Row*); the Coordinator, the hint and the blurb are unchanged; the ids `event.canvass-drive` and `canvasser-1..3` stay (ids are never read). Changed in `data/events.ts`, GDD §16.3 and §0, this document and the slice-7 documents. **Developer:** no e2e asserts the old name (`events.spec` uses ids and the Rally); remove the *canvass drive · canvassers* allowance from `review4.spec.ts` and `qa.review4.spec.ts`'s sweeps so the guard is whole again. The tech spec's and QA screenshots' mentions are the architect's and QA's to tidy.
10. **A swing prints to two decimals, trailing zeros trimmed; a share to one.** The event result's *+0.83 for the Collective in Coalport · your share +0.42* is right: it is a swing, the same quantity the action modal prints to three decimals trimmed (GDD §14.2's build note) and the board's rows print with `formatSwing`. One decimal would make a hand's quarter of a point on a four-way split read *+0.1* or *+0.0*. Shares (*70.1 → 70.9 %*) stay at one decimal. GDD §14.2's precision line now says so. **Developer:** the paper's row (`togetherEdition.ts`'s `swingText`, `toFixed(2)` untrimmed) should trim like `formatSwing`, so *+1.00* reads *+1* and *+0.80* *+0.8*; one line. Nothing else changes.
11. **An event's swing does not write the morale record** (phase B default (a), **confirmed**). The meter moves at resolution; a threshold crossed is recorded by the day's drift or the next action in the city (ADR 0022), which is at most a day's delay on a record no screen prints yet. Revisit only if a playtest shows a missing headline.
12. **`event-city` prints only when the reader took part in no event yesterday** (phase B default (b), **confirmed**). A participant already gets their own In Print line (*event-triumph* … *-fiasco*); two event lines in one paper would read as padding. The paper's *Events* row still lists today's events for everyone.

---

## 21. Review 4 addendum (6 Oct 2026)

- **§9.1, posting bail:** a fourth place to post it: **the police station's *In the cells now* card** (slice 5's screen, review 4), on a faction mate's row (*Post bail · 150 Iron*, the same `FavourSheet`). The list shows every party's prisoners; the button only on one's own. The Members list's status reads *in the cells at Harbour Police · out in 24 min* (GDD §2.2's style).
- **§6.1, Orders:** when the member is in the cells the orders block reads *Orders off today · the branch heard about the cells* (GDD §13.7, §19.2).
- **§10, the paper:** the Events section lists the faction's events **in the city the member is in** first, which is also how the local edition reads (GDD §3.3); nothing else changes.
- **The sentence** on the held screens no longer invites closing the game; §12.4's walkthrough reads accordingly.

---

## 23. Review 7 rulings (15 Oct 2026; the user's Design Review 4 notes #2 and #3)

### 23.1 The word filter (note #2: "chat needs a profanity filter")

Slice 9's filter (GDD §16.2, `docs/design/slice-9-launch.md` §5.6) is brought forward in its simplest shape. Two tiers, one function, on the server, before a line is stored:

| | Slurs and real-world hate | Ordinary swearing |
|---|---|---|
| **In chat** | **Refused.** The line is not posted, nothing is stored, no report is written. The composer keeps the text and reads ***That can't be said here.*** under it (`together.chat.limits.refused`, error `CHAT_REFUSED`; the GDD's slice-9 string, no echo of the word). A refusal still counts toward the rate limits (one in three seconds, thirty in ten minutes), so a repeat attempt is bounded | **Masked and posted.** The word prints as its first letter and a dash, ***b—***, the way the period's papers printed swearing (`together.chat.mask`). The server stores the line masked; the author sees the same line everyone sees, which is the tell. No note, no modal: one tap, as before |
| **In names** (sign-up now; the slice-9 rename) | **Refused**, ***That name can't be used here. Try another.*** (`copy.nameNotAllowed`, under the field with the blank / short / long lines) | **Refused**, the same line. A name is read a thousand times; a swearing name is not masked, it is not a name |

Rules:

- **What it must pass:** the game's own vocabulary (*rally, strike, picket, canvass, exposé, chalking, gate, hands*), every content name, and ordinary words that contain a bad substring (the Scunthorpe problem): the content already has *Assembly Rooms*, *The Pass*, *Ashford*, *Mass* and *night*. A false refusal in a political game's chat is worse than a missed swear.
- **Leetspeak and symbol swaps** (*sh1t*, *s.h.i.t*, *$hit*, doubled letters) are caught; that is what the library is for.
- **Help:** *The editor* (`together.help.editor`) behind the composer's (i): *Swearing goes out with the editor's dash, b— and the like. Slurs and real-world hate don't go out at all; the line comes back to you and nobody sees it. The same goes for names.* The chat help note is unchanged.
- **Mild period words** (*bloody*, *damn*, *hell*, *sod*) are not swearing in a 1946 noir game and are **not** masked; the developer removes them from the library's dataset if it carries them.
- **The lists live outside `packages/content`**, as the GDD's §0 change table and slice 9's §5.6 already rule (`packages/moderation/lists/`, or the server's `moderation/` folder if the architect prefers no new package yet): QA's vocabulary guards sweep every content string and must never read a slur list; and the list is not in this document for the same reason.

**The library: `obscenity`** (npm, v0.4.6 of 18 Jan 2026, **MIT**, no dependencies, github.com/jo3-l/obscenity, releases through 2025–26). Why it and not a plain word list: its English dataset ships with transformers that resolve confusables, leetspeak, skipped symbols and doubled letters, and **with whitelisted terms** for the known false positives; its patterns carry word boundaries; `TextCensor` takes a custom strategy, so the dash mask is one line; each match names its `originalWord`, so a small set of those words marks the refuse tier. Paired with **a project list** of three parts: the **refuse** additions (the content-policy review's §7: real-world salutes, slogans, anthem lines, party names and leaders, in every spelling), the **tier** set (which of the dataset's words are slurs; everything else masks), and the **allow** additions (the game's vocabulary and every content name). The developer runs every content name through the matcher once and puts each hit on the allow list.

**What this does not add:** the flag queue, the ladder, the console, the reports' reasons, the impersonation list (slice 9). Mute and report stay as §8. Appendix C #7 stays closed as it is; GDD §16.2's "Moderation in slice 6" line gains *and the word filter's refuse and mask tiers (slice 6 design §23.1)*.

### 23.2 The invite (note #3: "Ask to join… ask to join what?")

The nudge (§9.3) is renamed **the invite** for players and the button names the event. The rule is unchanged (tech §22.1 Q9); the wording and the showing are:

- **The button:** ***Invite to the rally · 19:40*** (`together.members.invite(event, time)`; the event's running name and the card's time phrase). On a member's row in the Members tab and on the profile sheet.
- **When it shows:** only while **you are signed up to an open event that has a place this mate can take** (an open named role they may take, or a hand's place) and **they are not on it** and **you have not invited them to it**. Otherwise **hidden**, not greyed: a row with no invite is a row with nothing to ask. A mate in the cells or on the ward is not shown the button either (they cannot sign up today; their status line says why).
- **More than one event:** **the soonest** with a place for them; one button per row, never a choice. If the soonest has nothing for them, the next.
- **After the tap:** the row reads ***Invited to the rally*** as plain text (`members.invited`) until the event starts, and the toast reads ***Invited. Mira Hale will see it in the branch's chat.*** (`members.inviteDone`). No modal: this is the cheapest social tap in the game. Nothing is reserved.
- **The chat line the mate sees** (in their branch channel, marked *for you*, with **Join**): ***Jan Sorel invites Mira Hale to the rally at Market Row, 19:40 · the Press is open*** (`system.nudgeRole`), or ***… · a hand's place is open*** (`system.nudgeHands`). Both now carry the **venue**, which is what makes "which rally" obvious; the system line's payload gains `venue`.
- **Refusals** (unchanged codes): `NUDGE_NOT_ALLOWED` *They're on it already, or you've invited them.*; `NUDGE_NOTHING_OPEN` *No place open for them on your events.*
- **Help:** *Invite* (`together.help.invite`) behind the Members tab's (i): *Shows when you're on an event with a place this mate could take. One tap puts a line in the branch's chat with a Join button; once per mate per event. No place is held for them.*

Known gap, left for slice 7: a mate who has hidden chat from the Me tab never reads the invite; the paper's *Events* row (with **Join**) is their fallback today. If the playtest shows invites going unread, the invite becomes a desk row as well.

The ids (`events.nudge`, `nudge:{event}:{from}:{to}`, `SystemLineKind 'nudge'`) stay; ids are never read.
