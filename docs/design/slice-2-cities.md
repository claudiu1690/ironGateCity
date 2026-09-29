# Slice 2 — "Arrival": Duskwall and Ashford content

Game designer, 29 Sep 2026; Duskwall revised the same day by the content-policy review (`docs/design/content-policy-review.md`: a customs town, not a garrison; ids unchanged). Companion to `docs/design/slice-2-onboarding.md` (the origin, the kit, the welcome edition and the day-1 order) and `docs/economy.md` §13. Follows the Coalport format (`docs/design/slice-1-content.md`) so the same content schema holds; everything Coalport has, each of these cities has: six locations with a kind and a map position, about twenty tier-1 actions with Success and Partial text, three jobs, a party secretary, twelve order templates and the paper's headline templates. The GDD edits are listed in the onboarding doc §12.

**The rules every action here obeys are Coalport's** (`slice-1-content.md` §2.1): one roll per attempt, tier 1 never fails, §5.5 rates by type and Energy, two-stat checks average, ×3 on checked actions only, Standing +3 % per level, Party orders +25 % FXP, opinion 0.005 points per Energy drawn from Neutral first. Outcome texts are ≤ 240 characters and ≤ 4 sentences (GDD §1.2); the longest below is 224.

**Difficulty:** 8 in both cities (home city, §8.4). Odds at difficulty 8 by the stat used: 8 → 50 % · 10 → 58 % · 12 → 66 % · 14 → 74 % · 16 → 82 %. What each faction's recruit actually has depends on the origin answers (onboarding doc §2); the reference recruit of each faction is in the onboarding doc §2.4.

---

## 1. Duskwall — home city of the Vanguard

| | |
|---|---|
| City | `duskwall`, home city of the Vanguard (§14.11). Baseline opinion **Vanguard 70 / Collective 6 / Alliance 9 / Neutral 15** (pinned in this change; was provisional) |
| Character (§14.1) | Frontier town in the mountains: the old fortress, now the customs house; the checkpoint on the road below it; the goods yard where the frontier freight comes in |
| Map | `maps-pen/duskwall.png` (day) and `duskwall-night.png`, both 5056 × 3392, RGB (no alpha, no flatten). Positions are x/y fractions of the image |
| Paper | *The Duskwall Sentinel* · short name *Sentinel* · strapline *For the city and the frontier* · 5 marks (§3.3) |
| Party secretary | **Viktor Stahl**, district organiser of the Vanguard in Duskwall (§1.3) |
| Faction HQ | Beacon House (`faction-hq`, scene `mvp/scenes/vanguard-office.png`) |
| The movement's idiom | "the movement", "the district", "the committee", "in good order", "order and bread at a fixed price". A party, not a militia: it has an organiser, a committee, volunteers and stewards; it courts the customs men and the police, it is not them. Never a real-world salute, uniform colour, symbol, title or slogan; see the onboarding doc §5.3 and `docs/design/content-policy-review.md` |

### 1.1 Locations (6)

| # | Id | Name | Kind | Map x, y | Blurb (one line, ≤ 200 chars) |
|---|---|---|---|---|---|
| 1 | `duskwall.garrison-gate` | Fortress Gate | `ministry` | 0.47, 0.44 | The gatehouse of the old fortress, now the frontier customs house. The shift changes at four, and the whole town sets its watch by it. |
| 2 | `duskwall.quartermaster-market` | Customs Market | `market` | 0.50, 0.65 | Tents and trestles under the walls, where the customs auctions what it seizes at the frontier and the town buys what it can't get elsewhere. |
| 3 | `duskwall.beacon-house` | Beacon House | `faction-hq` | 0.64, 0.78 | The movement's district office, named for the searchlight on its roof. The committee sits upstairs; the volunteers gather in the yard at six. |
| 4 | `duskwall.archives` | State Archives | `library` | 0.77, 0.36 | The republic's records, kept in a stone quadrangle the movement now holds the keys to. Every ration book, lease and conviction in the district is in here somewhere. |
| 5 | `duskwall.goods-yard` | Goods Yard | `station` | 0.18, 0.64 | The sidings below the fortress wall, where the frontier freight is broken down and the coal comes in. The loaders eat at noon with their backs to the wagons. |
| 6 | `duskwall.rampart-row` | Rampart Row | `street` | 0.14, 0.84 | Railwaymen's terraces along the line below the walls. Washing across the street, children on the steps, and doors that open for the right accent. |

Where the pins land on the art (checked on the full-size map): 1 on the arched gatehouse in the fortress's south wall, where the road enters the fortress square; 2 in the middle of the tent rows and stacked crates south of the wall; 3 on the tall building at the foot of the searchlight tower; 4 on the colonnaded front of the big square courtyard building east of the fortress; 5 on the goods shed beside the freight train in the sidings, bottom left; 6 in the middle of the terrace row along the railway, bottom left.

**Reserved, not in slice 2:** the frontier checkpoint on the road below the gate (0.50, 0.53; kind `ministry`, the hostile-ground journey events of slice 5) and a railwaymen's bar, *The Signal Lamp*, in the terraces east of the tower (0.85, 0.66; kind `bar`, bar services from slice 5). Neither needs a new kind.

### 1.2 Tier-1 actions (21)

Rewards are Success / Partial at the §5.5 rates. E = Energy. Opinion in points of the Duskwall meter.

| Id | Title | Type | Std | E | XP | FXP | Iron | Opinion |
|---|---|---|---|---|---|---|---|---|
| `duskwall.garrison-gate.canvass` | Canvass the customs shift | canvass | STR | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `duskwall.garrison-gate.speech` | Speak from the gate steps | speech | CHA+STR | 12 | 54 / 27 | 7 / 4 | 24 / 12 | 0.06 / 0.03 |
| `duskwall.garrison-gate.drill` | Shift crates in the bonded store | training (STR) | — | 20 + 2×STR | half rate | — | — | — |
| `duskwall.garrison-gate.stores` | Work your shift in the customs stores | job (Stores hand) | — | 4 | — | — | see §1.3 | — |
| `duskwall.quartermaster-market.canvass` | Canvass the ration queue | canvass | INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `duskwall.quartermaster-market.leaflets` | Hand out leaflets between the tents | propaganda | AGI | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `duskwall.quartermaster-market.speech` | Speak from the lorry bed | speech | CHA+INT | 12 | 54 / 27 | 7 / 4 | 24 / 12 | 0.06 / 0.03 |
| `duskwall.quartermaster-market.stall` | Work the market stall | job (Street vendor) | — | 3 | — | — | see §1.3 | — |
| `duskwall.beacon-house.committee` | Sit in on the district committee | council | INT | 10 | 45 / 23 | **9 / 5** | 20 / 10 | — |
| `duskwall.beacon-house.duplicator` | Run the duplicator | propaganda | INT | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `duskwall.beacon-house.muster` | Address the evening volunteers | speech | CHA+INT | 12 | 54 / 27 | 7 / 4 | 24 / 12 | 0.06 / 0.03 |
| `duskwall.archives.reading-room` | Study in the reading room | training (INT) | — | 20 + 2×INT | half rate | — | — | — |
| `duskwall.archives.registers` | Search the registers | intelligence | INT | 4 | 18 / 9 | — | 8 / 4 | — |
| `duskwall.archives.clerks` | Canvass the clerks at closing time | canvass | INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `duskwall.goods-yard.loaders` | Talk to the loaders at the break | canvass | STR | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `duskwall.goods-yard.posters` | Paste posters on the wagons | propaganda | STR | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `duskwall.goods-yard.manifests` | Note the manifests | intelligence | INT | 3 | 14 / 7 | — | 6 / 3 | — |
| `duskwall.goods-yard.lorry` | Drive the yard lorry | job (Driver) | — | 4 | — | — | see §1.3 | — |
| `duskwall.rampart-row.canvass` | Canvass door to door | canvass | CHA+INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `duskwall.rampart-row.chalk` | Chalk the slogan on the gable end | propaganda | AGI | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `duskwall.rampart-row.run` | Run messages for the ward office | training (AGI) | — | 20 + 2×AGI | half rate | — | — | — |

**Count by type:** canvass 5 · speech 3 · propaganda 4 · training 3 · intelligence 2 · council 1 · job 3 = **21**.

**Count by stat** (15 checked actions): STR 3 · CHA+STR 1 · INT 6 · CHA+INT 3 · AGI 2. The Vanguard recruit leans STR (+3 from the faction, §7.3), so the gate and the yard are its best ground; the Archives and the market reward INT. The mix is the mirror of Coalport's, where INT led.

### 1.3 Jobs (§9, pay pinned)

| Job | Id | Location and action | Unlock | Shift Energy | Daily pay | Notes |
|---|---|---|---|---|---|---|
| **Stores hand** | `duskwall-stores-hand` | Fortress Gate, *Work your shift in the customs stores* | Level 1, STR 5 | 4 | **180**, **216 for Vanguard members** (+20 %) | The Factory worker's mirror: the job every Duskwall recruit should take on day 1. New in §9.2 |
| **Street vendor** | `duskwall-street-vendor` | Customs Market, *Work the market stall* | Level 1 | 3 | **100** | The fallback; no requirement |
| **Driver** | `duskwall-driver` | Goods Yard, *Drive the yard lorry* | Level 3, AGI 10 | 4 | **200** | Visible and locked for most recruits (AGI 5): the first thing training AGI unlocks |

Blurbs (≤ 160 characters):

- **Stores hand** — Eight hours counting seized tobacco and bonded spirits in the customs stores. Vanguard members draw a fifth more.
- **Street vendor** — Bootlaces, tobacco and yesterday's Sentinel from a stall in the Customs Market. The inspector has stopped asking.
- **Driver** — The yard lorry between the sidings and the customs depot, a full load each way. Needs a quick hand on the frost.

Job ids are prefixed by city because a job belongs to one location and a player who moves (slice 4) keeps the job where it is. See §3, question 1, for Coalport's ids.

### 1.4 The party secretary

**Viktor Stahl**, district organiser of the Vanguard in Duskwall (`npcs`: id `stahl`, portrait `mvp/portraits/stahl.png`, the bald man in the heavy dark coat and yellow scarf; a 4:5 head-and-shoulders crop like Holm's). Voice: clipped and formal, talks in wards, lists and times, treats every order as already agreed, never raises his voice and never uses a slogan. Signs "— V.S." He is the movement's administrator, not its face: the face is Commissioner Reinholt, the frontier commissioner (§17.2), who arrives with patrons in slice 8. He sets the Vanguard's Party orders until a Chair exists (§13.7).

### 1.5 Order templates (12)

Same slots and rotation as Coalport (A[day mod 5], B[day mod 4], C[day mod 3]); the three targets fit in about 60 Energy. The first City Day uses the welcome set instead (onboarding doc §8.2).

| Id | Slot | Order (title) | Matches | Target | Stahl's line |
|---|---|---|---|---|---|
| `dir.v.canvass-duskwall` | A | Canvass Duskwall | any `canvass` in Duskwall | 3 attempts | Three wards. Three reports on my desk by tonight. |
| `dir.v.guard-change` | A | Be at the gate | `duskwall.garrison-gate.canvass` | 2 attempts | The customs shift changes at four. Be at the gate before it. |
| `dir.v.rampart-row` | A | Knock Rampart Row | `duskwall.rampart-row.canvass` | 2 attempts | Every door on Rampart Row. Top to bottom, no gaps. |
| `dir.v.loaders` | A | The yard at the break | `duskwall.goods-yard.loaders` | 2 attempts | The loaders stop at noon. So do you, beside them. |
| `dir.v.clerks` | A | The clerks at closing | `duskwall.archives.clerks` | 2 attempts | The clerks leave at five. Catch them on the steps. |
| `dir.v.paper-the-town` | B | Paper the town | any `propaganda` in Duskwall | 3 attempts | The bulletin is printed. It does no good in a stack. |
| `dir.v.say-it` | B | Get up and say it | any `speech` in Duskwall | 1 attempt | Somebody addresses the market today. You. |
| `dir.v.report` | B | Report to Beacon House | `duskwall.beacon-house.committee` | 1 attempt | Committee at six. Bring your ward lists, in order. |
| `dir.v.eyes-open` | B | Eyes open | any `intelligence` in Duskwall | 2 attempts | Watch, note, report. Names and times, nothing else. |
| `dir.v.work-shift` | C | Work your shift (no job: *Take a job*) | any job shift / take a job | 1 | The movement does not pay wages. The stores do. |
| `dir.v.sharpen-up` | C | Sharpen up | any `training` | 1 point | A soft organiser is no use to me. The bonded store, or the reading room. |
| `dir.v.full-day` | C | A full day | any checked action in Duskwall | 6 Successes | Six wins before lights out. |

### 1.6 The Duskwall Sentinel: headline templates

Same conditions, priorities and groups as the Clarion's (`slice-1-content.md` §7.4 and §13.5); `{rank}` is the Vanguard title (Initiate / Steward / Bailiff / Prefect / Intendant / Guardian / Keeper of the Gate, §5.4). Only the text differs. The first-edition templates (`hl.v.welcome`, `hl.v.arrival`) are in the onboarding doc §7.

| Id | Group · priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.v.rank-up-2` | personal 2 | rank rose to 2 | {name} Made Steward by the Vanguard | Initiates become Stewards on the strength of their work. The vote follows. |
| `hl.v.rank-up-3` | personal 2 | rank rose to 3 | {name} Made Bailiff by the Vanguard | A Bailiff can stand for the council. Organiser Stahl: "Now we shall see." |
| `hl.v.rank-up` | personal 2 | rank rose to 4+ | {name} Made {rank} by the Vanguard | Made {rank} on the strength of district work. Beacon House takes note. |
| `hl.v.level-up` | personal 3 | level rose, Energy yesterday ≥ 1 | Duskwall {rank} Rises to Level {level} | {name} of the Vanguard spent {energyYesterday} Energy on the ward yesterday. Beacon House has noticed. |
| `hl.v.level-up-quiet` | personal 3 | level rose, Energy yesterday = 0 | Duskwall {rank} Rises to Level {level} | {name} of the Vanguard has been putting the hours in on the ward. Beacon House has noticed. |
| `hl.v.standing` | personal 4 | standing rose | A {standing} Face in Duskwall | Duskwall knows {name} now: {standing}. Actions here get +{bonus} %. |
| `hl.v.orders-done` | personal 5 | all three orders done yesterday | Vanguard Commends Its Canvassers | Every order carried out yesterday. Organiser Stahl: "As it should be." +5 Political Capital banked. |
| `hl.v.streak-5` / `-10` | personal 6 | streak hit 5 / 10 | Five / Ten Straight Shifts and Counting | {name} has not missed a shift in {streak} days. Pay is up {bonus} %. |
| `hl.v.away` | personal 7 | 2+ days, half-pays ≥ 1 | While You Were Away | {days} days of half pay banked ({iron} Iron). Rested is full. The ward is where you left it. |
| `hl.v.away-no-job` | personal 7 | 2+ days, half-pays = 0 | While You Were Away | No job, so no half pay banked. Rested is full and the ward is where you left it. The customs stores are still hiring: the Jobs card is at the Fortress Gate. |
| `hl.v.idle` | personal 8 | idle yesterday | Quiet Day on the Ramparts | No leaflets went out yesterday. Today's orders are below. |
| `hl.v.morale-fired` | city 1 | share ≥ 80 | Vanguard Holds Duskwall at {share} % | The frontier town is of one mind. |
| `hl.v.morale-steady` | city 1 | 60–79 | Vanguard Holds Duskwall at {share} % | "Steady," says Beacon House. Steady is not enough. |
| `hl.v.morale-unrest` | city 1 | < 60 | Vanguard Holds Duskwall at {share} % | Unrest in Duskwall: the railwaymen question the movement. |
| `hl.v.orders-call` | city 2 | no personal headline | Organiser Stahl Calls for {ordersTitle} | {ordersLine} |
| `hl.v.ambient-0..9` | ambient | fewer than 3 | one of the pool below, `day mod 10` | — |

**Ambient pool** (headline only): Curfew Bell to Ring at Ten Until Further Notice · Mountain Pass Closed by Early Snow · Town Band to Play Sunday in the Fortress Square · Coal Train Held at the Frontier Checkpoint · Searchlight on Beacon House Repaired · Ration Books: New Issue at the Archives Counter · Three Fined for Chalking on the Ramparts · Timber Prices Up at the Mountain Mills · Station Clock Stopped Since Tuesday · Archives Open Late on Thursdays.

The morale headlines use a no-break space before "%", as the Clarion's do.

### 1.7 Outcome text

#### Fortress Gate

**Canvass the customs shift** (`duskwall.garrison-gate.canvass`)
- Success — *They stop for one of their own* — The customs men come off at four, boots loud on the cobbles. You've the shoulders for it, so they stop. Ration, rents, the checkpoint queues: you keep it short. A senior man takes ten leaflets for the office.
- Partial — *Most of them go past* — The night shift goes in and the day shift heads for the canteen without slowing. You press leaflets on the stragglers. One asks if the movement can do anything about the pay. You say you'll ask.

**Speak from the gate steps** (`duskwall.garrison-gate.speech`)
- Success — *The square goes quiet* — You take the top step under the arch and pitch it to the back of the square. Order on the streets, bread at a fixed price, the frontier shut. Nobody heckles here. When you finish, the chief of customs nods once.
- Partial — *The four o'clock bell cuts you off* — You get through prices and the checkpoint queues before the bell goes for the shift and the square empties at a trot. A few townsfolk stay to hear the end. The chief looks at his watch.

**Shift crates in the bonded store** (`duskwall.garrison-gate.drill`, training STR)
- Trained — *An hour in the bonded store* — The storeman doesn't ask which party you're with; he asks if you can get a crate of tinned beef onto the top rack. You can, by the end. Your shoulders will tell you about it tomorrow.

**Work your shift in the customs stores** (`duskwall.garrison-gate.stores`, Stores hand)
- Worked — *Eight hours among the crates* — Seized tobacco, bonded spirits, tinned beef, counted in and counted out under a storeman who trusts nobody. The paybook gets its stamp. Half came at midnight; here's the rest, with the streak on top.

#### Customs Market

**Canvass the ration queue** (`duskwall.quartermaster-market.canvass`)
- Success — *The queue has nowhere to go* — Sixty people and one tent with sugar in it. You work the line with the price list and the leaflet. By the time the clerk shouts next, half the queue knows what the movement would do about the ration.
- Partial — *The sugar runs out early* — Three people in, the clerk drops the flap and the queue turns into an argument. A few leaflets go into shopping bags. One woman folds hers small and says she'll read it when her husband's out.

**Hand out leaflets between the tents** (`duskwall.quartermaster-market.leaflets`)
- Success — *Quick hands, empty bag* — You work the tent rows at a trot, a leaflet into every basket before the owner looks up. The bag is empty in ten minutes and the market inspector never sees you.
- Partial — *The inspector sees you* — Half the bag is gone when the market inspector plants himself in the row and asks for your permit. You leave by the boot tent, slower than you'd like. The leaflets you handed out are still out there.

**Speak from the lorry bed** (`duskwall.quartermaster-market.speech`)
- Success — *A crowd between the tents* — You climb onto the tailboard of a parked lorry and give it to them. Prices, the ration, who queues and who doesn't. The stallholders heckle, the crowd laughs, and by the end the laughs are on your side.
- Partial — *The lorry has to leave* — You've a fair crowd until the driver climbs into the cab and you're speaking from a moving platform. You finish on the ground for the tea stall and an inspector who looks bored. The tea stall gives you a nod.

**Work the market stall** (`duskwall.quartermaster-market.stall`, Street vendor)
- Worked — *A day's trade* — Bootlaces, tobacco, yesterday's Sentinel. You know the regulars by their boots now. The takings won't make anyone rich, but they come in every day, and the inspector has stopped asking.

#### Beacon House

**Sit in on the district committee** (`duskwall.beacon-house.committee`)
- Success — *Minutes taken, motion carried* — Coffee, a wall map stuck with pins, and a chairman who likes short answers. The committee wants the ward lists redone by street and you say how. Your name goes in the minutes. In this house, that counts.
- Partial — *A long meeting* — Two hours on the ward lists and the price of paper. You get one point in before the chairman moves on. The organiser marks you present, which is what matters this week.

**Run the duplicator** (`duskwall.beacon-house.duplicator`)
- Success — *Five hundred copies, still wet* — The stencil holds and the drum turns. Five hundred bulletins in an hour, stacked for the morning runners. Your hands are purple to the wrist and the office smells of spirit.
- Partial — *The stencil tears* — The stencil tears at copy two hundred and the rest come out ghosted. Half a stack goes out; the other half goes in the stove. The organiser shows you how to cut the next one.

**Address the evening volunteers** (`duskwall.beacon-house.muster`)
- Success — *The yard listens* — Forty volunteers in the yard at six, caps off, waiting to be told. You tell them: which streets tonight, which doors, what to say at each. Nobody asks a question. That's the compliment here.
- Partial — *Half the yard is thinking about supper* — You get the street list out before the back rows start shuffling. The front row writes it down, which is something. The organiser says: shorter, next time.

#### State Archives

**Study in the reading room** (`duskwall.archives.reading-room`, training INT)
- Trained — *An evening with the registers* — The reading room is cold and the light is bad, but the shelves hold everything from the frontier acts to the grain returns of 1913. You leave knowing the argument better than the man who'll make it against you.

**Search the registers** (`duskwall.archives.registers`)
- Success — *Names, dates, addresses* — You sign for a ledger and read it like a paper. Who moved into the new terrace by the fortress last spring, who sold a lease in a hurry, who's drawing two ration books. It goes in your notebook for later.
- Partial — *The wrong volume* — The clerk brings the wrong year and takes an hour to find the right one. You get one address worth writing down before closing. Not nothing.

**Canvass the clerks at closing time** (`duskwall.archives.clerks`)
- Success — *The steps at five* — The clerks come down the steps at five in a body, ink on their cuffs. You know the wage scales better than they do, so they listen. One asks for three leaflets: for the office, he says.
- Partial — *Umbrellas up* — It's raining at five and the clerks go down the steps at a run. You get leaflets to the ones waiting for the tram. One says the office already reads the Sentinel. Come back when it's dry.

#### Goods Yard

**Talk to the loaders at the break** (`duskwall.goods-yard.loaders`)
- Success — *They make room on the buffer* — The loaders eat on the buffers with their backs to the wind. You've the hands for the work and it shows, so they make room. By the time the whistle goes, the gang has agreed to send two men to Beacon House.
- Partial — *Bread and silence* — The gang eats and lets you talk. A couple of nods, one argument about the coal ration that goes nowhere. The ganger takes a leaflet for later. Nobody gets up when the whistle goes, which is the loaders' way of saying maybe.

**Paste posters on the wagons** (`duskwall.goods-yard.posters`)
- Success — *A train's length of paper* — Bucket, brush, and a rake of empty wagons waiting for the morning. You get twelve posters up straight and high, one to a wagon. Every station between here and the capital will read them by noon.
- Partial — *The paste won't hold* — The wind off the mountains is against you and the paste won't take on the frosted boards. Five posters stay up; the rest go under the wheels. Five is five.

**Note the manifests** (`duskwall.goods-yard.manifests`)
- Success — *Wagons, firms, times* — You sit on a bollard with a paper and a pencil and watch the checker's hut. Three wagons for one firm, two of them sealed, one that leaves without a stamp. It goes in your notebook for later.
- Partial — *Nothing much moves* — An hour on the bollard and one wagon, which is checked, stamped and shunted. Your notebook has a firm and a time. Not nothing.

**Drive the yard lorry** (`duskwall.goods-yard.lorry`, Driver)
- Worked — *Six runs to the depot* — Six runs between the sidings and the customs depot, a full load each way and a checker who wants it faster. The lorry fights you on the frost. The pay clerk doesn't.

#### Rampart Row

**Canvass door to door** (`duskwall.rampart-row.canvass`)
- Success — *The kettle goes on* — Sixty doors below the wall. Most open a crack; a dozen open wide, and at three the kettle goes on. Railwaymen's wives talk about the curfew and the price of coal. You leave with a list of names.
- Partial — *Doors on the chain* — It's tea-time and the doors stay on the chain. You get the leaflet through the gap and a word with the ones on the step. One man says he's heard the movement's speeches from the wall already. Come back after the shift.

**Chalk the slogan on the gable end** (`duskwall.rampart-row.chalk`)
- Success — *White letters on the gable end* — The gable end at the bottom of the row is the biggest wall on the line. You get ORDER AND BREAD up in fair capitals, the movement's name beneath it, before the rent-man's boy comes round the corner. Then you're away down the entry.
- Partial — *Half a slogan* — You get as far as ORDER AND before a window goes up and someone shouts about their wall. You finish the last word small and leave by the back entry. It reads, just about.

**Run messages for the ward office** (`duskwall.rampart-row.run`, training AGI)
- Trained — *Every entry below the wall* — Six notes, five streets, one hour. You learn which entries connect and which end in a wall, and you learn them at a run. By the end you could do it in the dark, which is the point.

---

## 2. Ashford — home city of the Alliance

| | |
|---|---|
| City | `ashford`, home city of the Alliance (§14.11). Baseline opinion **Vanguard 6 / Collective 9 / Alliance 70 / Neutral 15** (pinned in this change; was provisional) |
| Character (§14.1) | University town on the river: the college under its dome, the county courts, the *Gazette*, cafés on the bridges, a station at the edge of the old town |
| Map | `maps-pen/ashford.png` (day) and `ashford-night.png`, both 5056 × 3392, RGB (no alpha) |
| Paper | *The Ashford Gazette* · short name *Gazette* · strapline *Fair report, free comment* · 6 marks (§3.3) |
| Party secretary | **Thomas Grey**, constituency agent of the Alliance in Ashford (§2.3) |
| Faction HQ | Assembly Rooms (`faction-hq`; no scene yet, so a map crop, §13.5 rung 3) |
| The Alliance's idiom | "the Rooms", "the ward", "the franchise", "fair report", "clause four of the licensing bill" (a running joke: nobody has read it). Lawyers, students, shopkeepers, the *Gazette* |

### 2.1 Locations (6)

| # | Id | Name | Kind | Map x, y | Blurb (one line, ≤ 200 chars) |
|---|---|---|---|---|---|
| 1 | `ashford.gazette-house` | Gazette House | `press` | 0.18, 0.16 | The Ashford Gazette's offices and print room, the biggest building in the old town. The presses run at four, and the evening edition is on the streets by six. |
| 2 | `ashford.assembly-rooms` | Assembly Rooms | `faction-hq` | 0.33, 0.11 | The Alliance's rooms above the old concert hall. Committee on the first floor, the duplicator on the landing, the founders of the republic on the stairs. |
| 3 | `ashford.university` | University Quad | `university` | 0.59, 0.30 | The college quadrangle under the dome. Lectures end at eleven and three, and the whole town's argument spills across the grass with the students. |
| 4 | `ashford.courts` | The Courts | `court` | 0.78, 0.20 | The county courts on the square. The public queue starts at eight, the gallery fills by ten, and a speech from the steps carries to the tram stop. |
| 5 | `ashford.bridge-street` | Bridge Street | `market` | 0.20, 0.45 | Stalls and cafés along the river between the two bridges. Bread, fish, secondhand books, and every opinion in Ashford, out loud and over coffee. |
| 6 | `ashford.weavers-row` | Weavers' Row | `street` | 0.69, 0.69 | The old weavers' tenements behind the station, four floors round a yard. Washing lines, children, and landlords who never come themselves. |

Where the pins land on the art: 1 on the lettered front of the big glass-roofed building, top left; 2 on the pedimented building beside it, top centre-left; 3 on the college front under the dome; 4 on the columned courthouse, top right; 5 among the striped awnings on the river bank by the upper bridge; 6 on the red-roofed tenement block with the inner yard, right of centre, below the college gardens.

**Reserved, not in slice 2:** Ashford Station (0.86, 0.85; kind `station`, the train in slice 4) and the wharf below the lower bridge (0.14, 0.78; kind `docks`, the boat club and later STR play). Neither needs a new kind.

### 2.2 Tier-1 actions (22)

| Id | Title | Type | Std | E | XP | FXP | Iron | Opinion |
|---|---|---|---|---|---|---|---|---|
| `ashford.gazette-house.print-room` | Canvass the print-room shift | canvass | INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `ashford.gazette-house.evening-run` | Run the evening edition to the stands | propaganda | AGI | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `ashford.gazette-house.wires` | Read the wires | intelligence | INT | 3 | 14 / 7 | — | 6 / 3 | — |
| `ashford.gazette-house.newsprint` | Hump the newsprint off the lorry | training (STR) | — | 20 + 2×STR | half rate | — | — | — |
| `ashford.gazette-house.copy-desk` | Work your shift on the copy desk | job (Copy clerk) | — | 4 | — | — | see §2.3 | — |
| `ashford.assembly-rooms.committee` | Sit in on the ward committee | council | INT | 10 | 45 / 23 | **9 / 5** | 20 / 10 | — |
| `ashford.assembly-rooms.duplicator` | Run the duplicator | propaganda | INT | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `ashford.assembly-rooms.letters` | Write to the lapsed members | canvass | INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `ashford.university.students` | Canvass the students between lectures | canvass | INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `ashford.university.union-debate` | Speak at the Union debate | speech | CHA+INT | 12 | 54 / 27 | 7 / 4 | 24 / 12 | 0.06 / 0.03 |
| `ashford.university.reading-room` | Study in the college reading room | training (INT) | — | 20 + 2×INT | half rate | — | — | — |
| `ashford.courts.gallery` | Sit in the public gallery | intelligence | INT | 4 | 18 / 9 | — | 8 / 4 | — |
| `ashford.courts.queue` | Canvass the public queue | canvass | CHA+INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `ashford.courts.steps` | Speak from the court steps | speech | CHA+INT | 12 | 54 / 27 | 7 / 4 | 24 / 12 | 0.06 / 0.03 |
| `ashford.bridge-street.cafes` | Canvass the café tables | canvass | CHA+INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `ashford.bridge-street.leaflets` | Hand out leaflets between the stalls | propaganda | AGI | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `ashford.bridge-street.speech` | Speak from the bridge steps | speech | CHA+INT | 12 | 54 / 27 | 7 / 4 | 24 / 12 | 0.06 / 0.03 |
| `ashford.bridge-street.news-stand` | Work the news-stand | job (Street vendor) | — | 3 | — | — | see §2.3 | — |
| `ashford.bridge-street.van` | Drive the market van | job (Driver) | — | 4 | — | — | see §2.3 | — |
| `ashford.weavers-row.canvass` | Canvass door to door | canvass | CHA+INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `ashford.weavers-row.bills` | Paste bills on the yard hoardings | propaganda | STR | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `ashford.weavers-row.run` | Run messages for the tenants' committee | training (AGI) | — | 20 + 2×AGI | half rate | — | — | — |

**Count by type:** canvass 6 · speech 3 · propaganda 4 · training 3 · intelligence 2 · council 1 · job 3 = **22**.

**Count by stat** (16 checked actions): INT 7 · CHA+INT 6 · AGI 2 · STR 1. Ashford is talk: six CHA+INT checks make the coat choice (onboarding doc §4) matter most here, and the Alliance recruit's +3 INT carries the rest. The one STR check (the hoardings) and the two AGI runs are the reasons to train.

### 2.3 Jobs (§9, pay pinned)

| Job | Id | Location and action | Unlock | Shift Energy | Daily pay | Notes |
|---|---|---|---|---|---|---|
| **Copy clerk** | `ashford-copy-clerk` | Gazette House, *Work your shift on the copy desk* | Level 1, INT 5 | 4 | **180**, **216 for Alliance members** (+20 %) | The Factory worker's mirror; the day-1 job. New in §9.2 |
| **Street vendor** | `ashford-street-vendor` | Bridge Street, *Work the news-stand* | Level 1 | 3 | **100** | The fallback |
| **Driver** | `ashford-driver` | Bridge Street, *Drive the market van* | Level 3, AGI 10 | 4 | **200** | Locked for most recruits until AGI is trained |

Blurbs (≤ 160 characters):

- **Copy clerk** — Eight hours on the Gazette's copy desk, checking other people's sentences. Alliance members draw a fifth more.
- **Street vendor** — The Gazette, the Herald and matches from a news-stand on Bridge Street. Nobody asks for a permit.
- **Driver** — The market van between Bridge Street and the station goods shed, a full load each way. Needs a quick hand on the wet setts.

The Lawyer's clerk (§9.2, Level 10, INT 20, Alliance Rank 2) and the Newspaper reporter (Level 6, INT 15) belong at the Courts and Gazette House respectively when their levels are in play (slice 5+).

### 2.4 The party secretary

**Thomas Grey**, constituency agent of the Alliance in Ashford (`npcs`: id `grey`, portrait `mvp/portraits/grey.png`, the man in the hat and grey coat with a newspaper under his arm; 4:5 crop). Voice: dry, quick, a former *Gazette* sub-editor who counts words; encourages with understatement ("that's the stuff"), talks in wards, returns and deadlines, never in speeches. Signs "— T.G." He sets the Alliance's Party orders until a Chair exists (§13.7). Senator Voss (§17.2) is the Alliance's grandee and arrives with patrons in slice 8.

The remaining unassigned portrait, `adler.png` (young woman with a satchel strap), is reserved for a *Gazette* reporter NPC in slice 8's Dossier content.

### 2.5 Order templates (12)

| Id | Slot | Order (title) | Matches | Target | Grey's line |
|---|---|---|---|---|---|
| `dir.a.canvass-ashford` | A | Canvass Ashford | any `canvass` in Ashford | 3 attempts | Three wards, three conversations. Off you go. |
| `dir.a.print-room` | A | Be at the loading bay | `ashford.gazette-house.print-room` | 2 attempts | The print-room shift comes off at four. Be there with the leaflets. |
| `dir.a.weavers-row` | A | Knock Weavers' Row | `ashford.weavers-row.canvass` | 2 attempts | Sixty doors on Weavers' Row. Knock them all, and be polite. |
| `dir.a.students` | A | The quad at eleven | `ashford.university.students` | 2 attempts | The students come out at eleven. Catch them before the coffee house does. |
| `dir.a.court-queue` | A | The court steps | `ashford.courts.queue` | 2 attempts | The public queue at the Courts is bored and can't leave. Perfect. |
| `dir.a.paper-the-town` | B | Paper the town | any `propaganda` in Ashford | 3 attempts | The leaflets are printed. They're no use to anyone in the Rooms. |
| `dir.a.say-it` | B | Get up and say it | any `speech` in Ashford | 1 attempt | Somebody has to speak today. It's you. |
| `dir.a.report` | B | Report to the Rooms | `ashford.assembly-rooms.committee` | 1 attempt | Committee at six. Bring the ward returns and a pencil. |
| `dir.a.ears-open` | B | Keep your ears open | any `intelligence` in Ashford | 2 attempts | The gallery, or the wire room. Write it down. |
| `dir.a.work-shift` | C | Work your shift (no job: *Take a job*) | any job shift / take a job | 1 | The Alliance doesn't pay wages. The Gazette does. |
| `dir.a.sharpen-up` | C | Sharpen up | any `training` | 1 point | A tired canvasser is a bad one. An hour in the reading room, or on the newsprint. |
| `dir.a.full-day` | C | A full day | any checked action in Ashford | 6 Successes | Six wins before the Gazette goes to bed. |

### 2.6 The Ashford Gazette: headline templates

`{rank}` is the Alliance title (Volunteer / Canvasser / Agent / Senator / Representative / Speaker / Prime Minister). Rank 3 was *Councillor*, which is also the office the rank lets you stand for; it is now **Agent** (GDD §5.4, this change; onboarding doc §12).

| Id | Group · priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.a.rank-up-2` | personal 2 | rank rose to 2 | {name} Made Canvasser by the Alliance | Volunteers become Canvassers on the strength of their work. The vote follows. |
| `hl.a.rank-up-3` | personal 2 | rank rose to 3 | {name} Made Agent by the Alliance | An Agent can stand for the council. Mr Grey: "Good. Now win something." |
| `hl.a.rank-up` | personal 2 | rank rose to 4+ | {name} Made {rank} by the Alliance | Made {rank} on the strength of constituency work. The Rooms take note. |
| `hl.a.level-up` | personal 3 | level rose, Energy yesterday ≥ 1 | Ashford {rank} Rises to Level {level} | {name} of the Alliance spent {energyYesterday} Energy on the ward yesterday. The Rooms have noticed. |
| `hl.a.level-up-quiet` | personal 3 | level rose, Energy yesterday = 0 | Ashford {rank} Rises to Level {level} | {name} of the Alliance has been putting the hours in on the ward. The Rooms have noticed. |
| `hl.a.standing` | personal 4 | standing rose | A {standing} Face in Ashford | Ashford knows {name} now: {standing}. Actions here get +{bonus} %. |
| `hl.a.orders-done` | personal 5 | all three orders done yesterday | Alliance Thanks Its Volunteers | Every order carried out yesterday. Mr Grey: "That's the stuff." +5 Political Capital banked. |
| `hl.a.streak-5` / `-10` | personal 6 | streak hit 5 / 10 | Five / Ten Straight Shifts and Counting | {name} has not missed a shift in {streak} days. Pay is up {bonus} %. |
| `hl.a.away` | personal 7 | 2+ days, half-pays ≥ 1 | While You Were Away | {days} days of half pay banked ({iron} Iron). Rested is full. The ward is where you left it. |
| `hl.a.away-no-job` | personal 7 | 2+ days, half-pays = 0 | While You Were Away | No job, so no half pay banked. Rested is full and the ward is where you left it. The Gazette is still hiring: the Jobs card is at Gazette House. |
| `hl.a.idle` | personal 8 | idle yesterday | Quiet Day in the Wards | No leaflets went out yesterday. Today's orders are below. |
| `hl.a.morale-fired` | city 1 | share ≥ 80 | Alliance Holds Ashford at {share} % | The whole town is reading the Gazette. |
| `hl.a.morale-steady` | city 1 | 60–79 | Alliance Holds Ashford at {share} % | "Steady," say the Rooms. Steady doesn't win elections. |
| `hl.a.morale-unrest` | city 1 | < 60 | Alliance Holds Ashford at {share} % | Unrest in Ashford: the market traders question the Alliance. |
| `hl.a.orders-call` | city 2 | no personal headline | Mr Grey Calls for {ordersTitle} | {ordersLine} |
| `hl.a.ambient-0..9` | ambient | fewer than 3 | one of the pool below, `day mod 10` | — |

**Ambient pool:** University Term Opens; Rooms Scarce · Gazette Prints Twenty Thousand for the First Time · Court Sits Late on the Brewery Case · Tram Fare Rise Refused by Council · Boat Club Regatta Saturday, Weather Permitting · Bridge Street Café Loses Its Licence · Bread Price Steady, Says the Corn Exchange · Public Lecture Tonight: The Republic's Constitution · Rain Stops Play at the College Ground · Barges Queue at the Lock After the Rains.

### 2.7 Outcome text

#### Gazette House

**Canvass the print-room shift** (`ashford.gazette-house.print-room`)
- Success — *The presses stop, and they listen* — The print-room shift comes off at four with ink to the elbow. They read for a living, so you don't waste words: rents, the tram fare, the licensing bill. A compositor takes ten leaflets for the stone.
- Partial — *Most of them head for the tram* — The shift comes off in a hurry and most of it makes for the tram. You press leaflets on the ones who slow down. Two stop to argue the licensing bill; one gives you his street. A start.

**Run the evening edition to the stands** (`ashford.gazette-house.evening-run`)
- Success — *Every stand by six* — A bundle under each arm and the Alliance leaflet folded inside every copy. Bridge Street, the station, the college gate, all before the church clock strikes six. Nobody asks whose leaflet it is.
- Partial — *The bundle splits* — The string goes on Bridge Street and half the edition ends up in the gutter. You save what you can and get it to two stands out of four. The leaflets inside the dry ones are still out there.

**Read the wires** (`ashford.gazette-house.wires`)
- Success — *The wire room at midnight* — The night editor lets you sit by the wire machine if you keep quiet. Irongate, Clearwater, the frontier: who's meeting whom, which bill is stuck in committee. Two names go in your notebook.
- Partial — *A slow night* — The machine chatters about grain prices and a regatta. You pick up one thing worth writing down before the night editor wants his chair back. Come back on a sitting night.

**Hump the newsprint off the lorry** (`ashford.gazette-house.newsprint`, training STR)
- Trained — *Twenty rolls, one lorry* — The newsprint comes on a lorry at dawn in rolls that need two men. You take one end and don't ask to be paid. Your back will tell you about it tomorrow; that's the point.

**Work your shift on the copy desk** (`ashford.gazette-house.copy-desk`, Copy clerk)
- Worked — *Eight hours of other people's sentences* — Court lists, tram times, the letters page, all checked twice. The chief sub initials your book. Half your wage came at midnight; here's the other half, with the streak on top.

#### Assembly Rooms

**Sit in on the ward committee** (`ashford.assembly-rooms.committee`)
- Success — *Minutes taken, motion carried* — Tea, a ward map on the piano, and a chairman who believes in procedure. The committee wants the canvass returns redone by street and you say how. Your name goes in the minutes. In these rooms, that counts.
- Partial — *A long meeting* — Two hours on the canvass returns and a point of order about the biscuits. You get one word in before the chairman moves on. The agent marks you present, which is what matters this week.

**Run the duplicator** (`ashford.assembly-rooms.duplicator`)
- Success — *Five hundred copies, still wet* — The stencil holds and the drum turns. Five hundred leaflets in an hour, stacked for the morning runners. Your hands are purple to the wrist and the landing smells of spirit.
- Partial — *The stencil tears* — The stencil tears at copy two hundred and the rest come out ghosted. Half a stack goes out; the other half goes in the grate. The agent shows you how to cut the next one.

**Write to the lapsed members** (`ashford.assembly-rooms.letters`)
- Success — *Forty letters, forty stamps* — The card index has three hundred names who paid a subscription once. You pick forty and write to each by hand: what the Alliance is doing about the thing they cared about. Two reply by return, with cheques.
- Partial — *The index is out of date* — Half the addresses come back marked gone away. You write to the rest and get one reply, from a woman who says her husband died but she'll come to the meeting herself.

#### University Quad

**Canvass the students between lectures** (`ashford.university.students`)
- Success — *They argue, then they listen* — The eleven o'clock crowd comes out arguing already. You give them something to argue about: the licensing bill, the franchise, rents in the old town. Half take a leaflet; a dozen take two. One asks where the Rooms are.
- Partial — *The coffee house wins* — The crowd is across the quad and into the coffee house before you've said franchise. You catch the ones who stop to light a pipe. A law student wants to argue clause four. You let him.

**Speak at the Union debate** (`ashford.university.union-debate`)
- Success — *The motion carries* — The Debating Union takes anyone who can hold the floor for ten minutes. You hold it for twelve: the republic, the courts, the right to be wrong in print. The house divides and the motion carries. A don asks your name.
- Partial — *Points of order* — You get six minutes in before the other side starts raising points of order and the chair enjoys them. The motion is lost by four votes. Two undergraduates ask for a leaflet on the way out.

**Study in the college reading room** (`ashford.university.reading-room`, training INT)
- Trained — *An evening under the dome* — The reading room stays open till ten and nobody asks for a college card after six. Blue books, the debates, the electoral acts. You leave knowing the argument better than the man who'll make it against you.

#### The Courts

**Sit in the public gallery** (`ashford.courts.gallery`)
- Success — *Names from the dock* — Two hours in the gallery with a pencil. A brewery foreman up for short measure, a landlord for a fire escape that wasn't, a clerk who won't say who paid him. Three names go in your notebook.
- Partial — *A dull list* — Debt, debt, a dog and a drunk. You pick up one name worth writing down before the court rises for lunch. Come back on a sessions day.

**Canvass the public queue** (`ashford.courts.queue`)
- Success — *A captive audience* — The queue for the gallery is bored, cold and can't leave. You work it with the leaflet and the case list. Half of them have a grievance with a landlord already; by the door, most have the Alliance's line on it too.
- Partial — *The doors open early* — The usher opens up at half past nine and the queue becomes a crowd on the stairs. A few leaflets go into coat pockets. One old man says he'll read it in the gallery, which is more than most.

**Speak from the court steps** (`ashford.courts.steps`)
- Success — *The square stops* — The top step at the lunch adjournment, with the tram stop for a gallery. Fair trials, fair rents, a press that prints what it finds. A barrister heckles and you quote his own case back at him. The square laughs on your side.
- Partial — *The tram takes half of them* — You've a decent crowd until the number 2 pulls in and takes most of it. You finish for the ushers and a constable who looks bored. The usher gives you a nod. It's a start.

#### Bridge Street

**Canvass the café tables** (`ashford.bridge-street.cafes`)
- Success — *A chair at every table* — The pavement tables are full by ten. You work them one by one, a chair borrowed at each. Rents, the tram fare, the licensing bill. By the third café the waiters know your name, and one has taken a leaflet for the kitchen.
- Partial — *Nobody wants company* — It's a reading morning and the tables are hidden behind the Gazette. You get a word at three of them and a leaflet under the saucer at the rest. One man lowers his paper to argue clause four. That's a start.

**Hand out leaflets between the stalls** (`ashford.bridge-street.leaflets`)
- Success — *Quick hands, empty bag* — You work the stalls at a trot, a leaflet into every basket before its owner has noticed. The bag is empty in ten minutes and the market beadle never sees you.
- Partial — *The beadle sees you* — Half the bag is gone when the market beadle plants himself in the aisle and asks about your permit. You leave by the bookstall, slower than you'd like. The leaflets you handed out are still out there.

**Speak from the bridge steps** (`ashford.bridge-street.speech`)
- Success — *A crowd on the bridge* — You take the steps at the bridge end with the river behind you. Prices, rents, who votes and who can't. The fishwives heckle, the crowd laughs, and by the end the laughs are on your side.
- Partial — *The rain takes half of them* — You've a decent crowd until the rain comes off the river and takes most of it under the awnings. You finish for the bookseller and a constable who looks bored. The bookseller gives you a nod.

**Work the news-stand** (`ashford.bridge-street.news-stand`, Street vendor)
- Worked — *A day's trade* — The Gazette, the Herald, matches, bootlaces. You know the regulars by their umbrellas now. The takings won't make anyone rich, but they come in every day, and nobody asks you for a permit.

**Drive the market van** (`ashford.bridge-street.van`, Driver)
- Worked — *Six runs to the goods shed* — Six runs between the stalls and the station goods shed, a full load each way and a stallholder who wants it faster. The van fights you on the wet setts. The pay clerk doesn't.

#### Weavers' Row

**Canvass door to door** (`ashford.weavers-row.canvass`)
- Success — *The kettle goes on* — Sixty doors up four flights. Most open a crack; a dozen open wide, and at three of them the kettle goes on. The fire escape, the rent, the landlord nobody has met. You leave with a list of names and a case for the Courts.
- Partial — *Doors on the chain* — It's tea-time and the doors stay on the chain. You get the leaflet through the gap and a word with the ones on the landing. One woman says her son's at the college already. Come back on Sunday.

**Paste bills on the yard hoardings** (`ashford.weavers-row.bills`)
- Success — *A yard's worth of paper* — Bucket, brush, and the hoardings round the builder's yard. You get twelve bills up straight and high enough that nobody's tearing them down without a ladder. Every window on four floors will read them.
- Partial — *The paste won't hold* — The rain is against you and the paste won't take on the wet boards. Five bills stay up; the rest go into the yard. Five is five.

**Run messages for the tenants' committee** (`ashford.weavers-row.run`, training AGI)
- Trained — *Every stair in the block* — Six notes, four stairwells, one hour. You learn which landings connect and which end in a locked door, and you learn them at a run. By the end you could do it in the dark.

---

## 3. Notes and questions for the architect

**Content that follows the slice-1 schema unchanged:** both cities are `City` documents (`role: 'home'`, `homeFactionId`, `baselineOpinion`, `map`, `paper`, `locations[]`); the actions use the existing `CheckedAction` / `TrainingAction` / `ShiftAction` shapes; jobs, NPCs, order templates and headline templates use the existing sections keyed by `factionId` or `cityId`. No new action type, kind or condition is needed. New art assets: `map.duskwall.day` / `.night`, `map.ashford.day` / `.night` (no flatten: both day maps are RGB), `portrait.stahl`, `portrait.grey`, `scene.vanguard-office` (bound to `faction-hq` + `vanguard`), `scene.newsroom` (bound to `press`). The kinds `ministry`, `library`, `station`, `street`, `market`, `university`, `court` have no scene yet and fall back to the map crop (§13.5 rung 3), which is by design; an Alliance HQ scene is an art request, not a blocker.

1. **Job ids.** Jobs here are prefixed by city (`duskwall-stores-hand`). Coalport's are not (`street-vendor`, `factory-worker`, `driver`). Recommend renaming Coalport's to `coalport-street-vendor`, `coalport-factory-worker`, `coalport-driver` in slice 2, while no production data exists, so that "the Driver job" in three cities is three jobs at three locations. Job *names* stay identical across cities ("Driver"); only ids differ.
2. **Factions without a secretary** were nullable in slice 1 (`OrdersView.issuer`). From slice 2 every faction has one (`holm`, `stahl`, `grey`), so `Faction.secretary` can become required.
3. **Headline template ids** are prefixed per city (`hl.v.*`, `hl.a.*`) to keep them unique in the flat `headlines[]` array; the Clarion's `hl.*` ids can stay as they are.
4. **Order template ids** are likewise `dir.v.*` and `dir.a.*`; the Coalport `dir.*` ids stay. The `cityId: 'home'` match on the *full day* orders already resolves to the member's home city.
5. **The `library` kind at the Archives** is the GDD's own mapping (§13.5: "reading rooms, the state archives"); the Archives are not a `ministry` even though the movement holds them. The kind decides art and presence text only.
6. **Reserved pins** (checkpoint, The Signal Lamp, Ashford Station, the wharf) are listed here so the mockups' extra pins have a home; nothing about them is data in slice 2.
7. **Ids after the content-policy review** (29 Sep 2026): the Duskwall ids `duskwall.garrison-gate` (and its four actions, including `.drill`), `duskwall.quartermaster-market` (and its four), `duskwall.beacon-house.muster`, `duskwall.rampart-row.chalk` and `dir.v.guard-change` keep their ids; only display text changed, and a character's job, order progress and logs reference them. Ids are never shown to players. Rename them, if wanted, with the next migration that touches Duskwall. The one data change that is not text is the Fortress Gate's kind: `barracks` → `ministry` (no scene either way; the map crop stands in).
