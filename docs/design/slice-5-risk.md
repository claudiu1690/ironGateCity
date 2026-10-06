# Slice 5 — "Risk": tier-2 missions, Heat, the record, the cells and the infirmary, encounters, rival ground

Game designer, 3 Oct 2026. Companion to `docs/design/slice-5-screens.md` (the screen specs) and `docs/economy.md` §19. The architect writes the slice-5 tech design from these two documents; every rule and number here is also in the GDD (edits listed in §18). Written while slice 4 is in QA, one slice ahead, as `slice-4-battleground.md` was.

**Playtest question:** is risk exciting rather than punishing?

**Rules this design obeys:** one tap or one choice everywhere (pillar 7): a mission is one choice, an encounter is one choice, and the two together are the only two-step flow in the slice, resumable and auto-resolved if the tab closes; nothing resolves at a clock time; **being away costs opportunity, never assets**: the cells and the infirmary are timers that stop no regen and take nothing, a record fades with time, and nothing a player owns is ever lost to Heat; the check formula is untouched (§8.4: tier-2 difficulties 14–20 on a ladder by Level, +4 on rival ground) and combat is the one-choice §20 table with its four formulas; the odds are words and the result gives a reason, never maths (review 2); every button that spends says what it costs (review 3); campaign vocabulary only (*a run-in*, *a rival crew*, *the cells*; nothing here is a front, a war or an uprising; the police are the republic's and the Vanguard's muscle is a party's, never a militia: `content-policy-review.md` §7); British English, 1946, noir, short: every outcome text is at most 240 characters and four sentences. Faction naming stays parked.

---

## 1. The design in one paragraph

At **Level 6** (the reference player's day 2) each home city opens its **second quarter**: a frame on the painted picture holding five places, among them the town's **infirmary** and its **cells**, which the game will send a player to before they ever walk in. The same Level opens **missions**: a short briefing with **two or three ways to do it**, each a stat and an odds word, one tap, and a result that can be **Success, Partial or Failure**; the game remembers the way you chose, so the second time is one tap. Legal missions (a speech to a big crowd, a night's watching) carry a little risk; from **Rank 3** the **illegal ones** (tear down their posters, break up their meeting, spike their press, lift their roll) move opinion four times as fast as a canvass and raise **Heat**, which cools at five an hour and, past 25, makes the police take an interest. Every illegal mission is followed by two rolls the player never sees as numbers: a **run-in** (an opponent at the door: **Fight, Run, Talk your way out, or Pay them off**, one choice, or leave it to luck), and the **caught check**, which puts **a mark on your record** or, if you are already **Hot**, lands you in **the cells** for ten to sixty minutes with bail on the door. Lose a fight and you wake in **the infirmary** for twenty minutes, or pay to walk out. At **Level 10** the train also runs to **rival ground**, the other two factions' home cities, where everything is harder, Heat doubles, every tap can bring a run-in, the card on the way in is a checkpoint or an informer, and party work pays **half again** in Party XP and moves the rival's own morale. Nothing here is required: a player can play entirely legally for ever, and the GDD's promise stands that a day away never costs a thing.

---

## 2. The second quarters (Level 6)

### 2.1 The rule, applied (GDD §14.13)

Quarters open **by Level, per character: 1 / 6 / 10**. Slice 5 builds the **second quarter of each home city**; the third (the station's) stays a teaser (*Opens with a later edition*) whatever the player's Level, since it is a later content addendum (the user decided, 2 Oct 2026). A quarter also opens the moment the game sends the character to a place in it (admitted to the infirmary, held in the cells), whatever their Level: a view rule with nothing stored, which cannot fire in slice 5 (missions need Level 6, rival ground Level 10) and is kept so a service never lands on a locked view (§23.6 #9).

**Opening is a reveal, not a reward.** On the morning after Level 6 the paper carries *The Harbour Opens to {name}* (§14) and the quarter bar gains a second chip. Nothing is paid, nothing is gated inside beyond the usual (Rank 3 for illegal missions, members only at an HQ). A quarter never closes again.

**The home-city overview and the quarter bar.** A home city now has two open quarters, so it needs what the capital has: an **overview** (the whole picture zoomed out) with its quarters drawn as **outlines with their names** (the user's district lock of 3 Oct 2026, applied to home cities: tapping an outline zooms smoothly in and holds the player there; back through *‹ Coalport* or the quarter bar), and a **quarter bar** (the tram bar's component, labelled with the quarters: *The Mill · The Harbour · The Sidings*). A locked quarter's outline is drawn in full with its name and the lock line (*Opens at Level 6* / *Opens with a later edition*); tapping it opens the teaser sheet (name, the three-line blurb, the lock line; no Enter button, the slice-4 locked-card pattern). The art is never dimmed for a lock. **Landing** is unchanged: the quarter last viewed in the city (client memory), the first quarter for a new character, and the service's quarter after the cells or the infirmary.

### 2.2 Frames, outlines and what each frame shows

A quarter is a **frame** on the city's picture: its pins' bounding box grown by 0.06 on every side and clamped to the picture, as every frame so far. Every pin is the survey pin from `packages/content/src/data/mapPins.ts`; the content test keeps a location's `map` equal to it. The developer writes the frames below; the designer may tune them in the dev viewer, keeping every pin at least 0.02 inside. **Outlines** (the overview's shapes, 6–24 points in fractions) are drawn by the developer in the dev viewer along the water, the main streets and the drawn blocks so that every pin of the quarter lies inside its own outline and no two outlines overlap; the notes below say what each should follow. The third quarters get outlines too (they are teasers, drawn in full), and the first quarters' outlines are drawn with them; frames of different quarters may overlap (they are zoom targets), outlines may not.

| Quarter (id) | Pins' box (x, y) | **Frame x0, y0, x1, y1** | What the frame shows on the painting · the outline follows |
|---|---|---|---|
| **Coalport · The Harbour** (`coalport.harbour`), Level 6 | 0.17–0.93, 0.46–0.83 | **0.11, 0.40, 0.99, 0.89** | The lower half of the town from the Infirmary's walled garden at the far left, past the glass station, to the basin: the shipyard's hull on the stocks and its gantry cranes at the right, the Customs House at the swing bridge's end, the harbour police station at the quay below the station, the Far Bank's fish quay across the water, the mole and the lighthouse. The outline: the river's west bank from the Infirmary down and round the basin to the mole, excluding the station and its fan of track (the Sidings) and the Mill's quays |
| **Coalport · The Sidings** (`coalport.sidings`), teaser | 0.24–0.46, 0.27–0.84 | 0.18, 0.21, 0.52, 0.90 | The glass station and its tracks, the tram depot, the coal yards on the viaduct side, St Barbara's spire in the old town above. The outline: the station, its approaches and the old town west of the canal |
| **Duskwall · The Pass** (`duskwall.pass`), Level 6 | 0.76–0.88, 0.04–0.68 | **0.70, 0.00, 0.94, 0.74** | The mountain road up the right-hand edge: the checkpoint's barrier and the lock-up beside it under the peaks, the Mountain Inn at the top, the infirmary under the church spire half way down, the sawmill and its timber stacks on the river bend at the bottom. A tall narrow frame: on a desktop the town shows either side, which is the rule (outside a frame is real art). The outline: the road and the river's east bank from the inn to the sawmill |
| **Duskwall · The Town** (`duskwall.town`), teaser | 0.10–0.48, 0.18–0.73 | 0.04, 0.12, 0.54, 0.79 | The brewery's chimneys at the top left, the Signal Lamp, the station's glass roof, the town square with its domed church. The outline: the civilian town between the goods yard and the market |
| **Ashford · The Wharf** (`ashford.wharf`), Level 6 | 0.20–0.92, 0.47–0.82 | **0.14, 0.41, 0.98, 0.88** | The lower town across the river: the County Infirmary in its garden at the left, the cattle pens and auction sheds below Weavers' Row, the police station on the embankment by the Corn Exchange, the wharf and its boat club below the bridge, the brewery's two chimneys at the far right. The outline: the lower town south of Bridge Street and the river's east bank from the police station to the brewery |
| **Ashford · Station Road** (`ashford.station-road`), teaser | 0.21–0.82, 0.08–0.57 | 0.15, 0.02, 0.88, 0.63 | The station's glass roof at the top right, the Town Hall's clock, the theatre, the Corn Exchange, the park and bandstand at the top left, the Press Club by the bridge. The outline: the respectable town north of the college and the river |

**Crowding check** (pins at least 44 px apart on a 360 px phone at the covering scale, slice 4's rule): the Harbour's closest pair is the Customs House and Harbour Police (0.197 apart, about 190 px at rest); the Wharf's is the Wharf and the Brewery (0.139, about 140 px); the Pass's is the Checkpoint and the Lock-up (0.05: 75 px at the frame's covering scale of 1,500 px of picture per screen width, since the frame is narrow). No quarter needs the Places list to separate its pins. **Edge pins:** the Mountain Inn (y 0.04) sits at the picture's top edge and relies on the phone's opaque plate band being an inset (`hideTop`), as Foundry Row and Vanguard House do; the Far Bank (x 0.93) and the Brewery (0.92, 0.82) are inside their frames with the 0.06 margin.

### 2.3 The fifteen places

Kinds from the closed §13.5 list; no new kind. Blurbs ≤ 200 characters, plain words, the period in the nouns. **The infirmary and the cells are ordinary places with ordinary tickets** when the player walks in; they become the service screen only when the game sends the player there (§8, §9). Coalport's blurbs are the ones pinned in `city-quarters.md` §3.

| # | Id | Name | Kind | x, y | Blurb |
|---|---|---|---|---|---|
| **Coalport · The Harbour** | | | | | |
| 7 | `coalport.shipyard` | The Shipyard | `docks` | 0.86, 0.46 | A hull on the stocks and two hundred men on the staging. When the yard stops, the town hears it. |
| 8 | `coalport.customs-house` | Customs House | `ministry` | 0.66, 0.66 | The republic's clock on the mole, and its inspectors in the sheds. Every crate in Coalport passes their stamp, or doesn't. |
| 9 | `coalport.infirmary` | The Infirmary | `hospital` | 0.17, 0.50 | Glass roof, iron beds, a matron who has seen every kind of accident the mill makes. Visiting hour is two o'clock. |
| 10 | `coalport.harbour-police` | Harbour Police | `jail` | 0.56, 0.83 | The harbour police station by the ferry stage: two cells, a stove, and a duty officer who writes everything down. |
| 11 | `coalport.far-bank` | The Far Bank | `market` | 0.93, 0.62 | Across the water by ferry: the fish market under its iron roof, the bonded warehouses, and a lower town that makes up its mind late. |
| **Duskwall · The Pass** | | | | | |
| 7 | `duskwall.checkpoint` | Frontier Checkpoint | `ministry` | 0.80, 0.10 | The barrier on the mountain road where the republic ends. Lorries queue from dawn; the customs men decide what crosses and what comes back down. |
| 8 | `duskwall.mountain-inn` | Mountain Inn | `bar` | 0.87, 0.04 | The last inn before the pass: a long table, a stove, carters and customs men on the same bench. Talk goes quiet when the door opens. |
| 9 | `duskwall.sawmill` | Sawmill | `factory-gate` | 0.88, 0.68 | The mill on the river bend where the mountain's timber comes down. The saws run two shifts and the yard is stacked to the roof. |
| 10 | `duskwall.lock-up` | Lock-up | `jail` | 0.76, 0.13 | The stone lock-up beside the checkpoint: three cells, a hatch, and a duty officer who has heard every story the road brings down. |
| 11 | `duskwall.infirmary` | Infirmary | `hospital` | 0.88, 0.40 | The town's infirmary under the church spire, run by sisters who ask no questions. Visiting is at two; the sawmill keeps the beds full. |
| **Ashford · The Wharf** | | | | | |
| 7 | `ashford.wharf` | The Wharf | `docks` | 0.79, 0.77 | The river wharf below the bridge: barges at the lock, the boat club's verandah, and the towpath where the lower town walks on Sundays. |
| 8 | `ashford.brewery` | Brewery | `factory-gate` | 0.92, 0.82 | The brick brewery with its two chimneys at the river's bend. Draymen at the gate from six, and the whole lower town smells of malt. |
| 9 | `ashford.cattle-market` | Cattle Market | `market` | 0.25, 0.77 | Pens and auction sheds on the edge of the lower town. Market day brings the county in, with money in its pockets and opinions to match. |
| 10 | `ashford.infirmary` | County Infirmary | `hospital` | 0.20, 0.47 | The county infirmary in its walled garden: long wards, a porter's lodge, and a queue of visitors at two with flowers from the market. |
| 11 | `ashford.police` | Police Station | `jail` | 0.72, 0.52 | The police station by the Corn Exchange: a lamp over the door, a duty officer at the desk, and a book in which the whole town's name eventually appears. |

The pin numbers continue each city's list (7–11), so the first quarter's numbers are unchanged. **Teaser lines** for the locked plates: Coalport *Opens at Level 6 · The slipway, the customs house, and the far bank across the water.* · Duskwall *Opens at Level 6 · The road up to the frontier: the checkpoint, the inn and the sawmill.* · Ashford *Opens at Level 6 · The lower town across the river: the wharf, the brewery and the cattle pens.* The third quarters: *Opens with a later edition · The station, the coal yards and the tram sheds.* · *Opens with a later edition · The station, the square and the brewery.* · *Opens with a later edition · The station, the town hall and the Corn Exchange.*

**Ref forms** (for sentences): *the Shipyard*, *the Customs House*, *the Infirmary*, *the harbour police station*, *the Far Bank*; *the checkpoint*, *the Mountain Inn*, *the sawmill*, *the lock-up*, *the infirmary*; *the Wharf*, *the brewery*, *the Cattle Market*, *the County Infirmary*, *the police station*.

### 2.4 Jobs and bar services in the new quarters

**None in slice 5.** The §9.2 jobs that belong here (Security guard at a customs house, Level 6, STR 12 and CHA 10; Newspaper reporter, INT 15) are gated by CHA and INT the Wardrobe and later training reach; placing them now would only invite a switch that resets seniority for a wage nobody qualifies for. The Mountain Inn is a `bar` with tier-1 tickets; the §19.3 bar services (buy a round, the barman's report, the black market) are buffs and items and arrive with slice 8. Recorded in §22.

---

## 3. Tier-1 actions in the new places (35)

Rewards at the §5.5 tier-1 rates by type and Energy (the `slice-2-cities.md` §1.2 table, unchanged); difficulty **8** at home, **+4 for a visitor of a rival faction** (§11). Titles in plain words (§1.5). Checked actions count for Standing; training counts for nothing but the stat. Every outcome text ≤ 240 characters, ≤ 4 sentences.

| Id | Title | Type | Stat | E |
|---|---|---|---|---|
| **Coalport · The Harbour** | | | | |
| `coalport.shipyard.riveters` | Talk to the riveters at the yard gate | canvass | STR | 10 |
| `coalport.shipyard.fence` | Put up posters on the slipway fence | propaganda | STR | 8 |
| `coalport.customs-house.permits` | Talk to people in the permits queue | canvass | INT | 10 |
| `coalport.customs-house.sheds` | Watch who comes out of the sheds | intelligence | INT | 4 |
| `coalport.infirmary.visitors` | Talk to people at visiting hour | canvass | CHA+INT | 10 |
| `coalport.infirmary.porters` | Carry for the porters | training (STR) · verb *Carry* | — | 20 + 2×STR |
| `coalport.harbour-police.notices` | Read the notices at the station door | intelligence | INT | 3 |
| `coalport.harbour-police.desk` | Talk to people waiting at the desk | canvass | INT | 10 |
| `coalport.far-bank.ferry` | Talk to people in the ferry queue | canvass | CHA+INT | 10 |
| `coalport.far-bank.speech` | Speak from the fish quay steps | speech | CHA+STR | 12 |
| `coalport.far-bank.leaflets` | Hand out flyers under the iron roof | propaganda | AGI | 8 |
| **Duskwall · The Pass** | | | | |
| `duskwall.checkpoint.drivers` | Talk to the lorry drivers in the queue | canvass | INT | 10 |
| `duskwall.checkpoint.turned-back` | Note which lorries are turned back | intelligence | INT | 4 |
| `duskwall.mountain-inn.listen` | Listen in the taproom | intelligence | INT | 3 |
| `duskwall.mountain-inn.carters` | Speak to the carters at the long table | speech | CHA+STR | 12 |
| `duskwall.mountain-inn.regulars` | Win over the inn's regulars | canvass | CHA+INT | 10 |
| `duskwall.sawmill.sawyers` | Talk to the sawyers coming off shift | canvass | STR | 10 |
| `duskwall.sawmill.stacks` | Put up posters on the timber stacks | propaganda | STR | 8 |
| `duskwall.sawmill.stack` | Stack timber in the yard | training (STR) · verb *Stack* | — | 20 + 2×STR |
| `duskwall.lock-up.notices` | Read the notices at the lock-up door | intelligence | INT | 3 |
| `duskwall.lock-up.hatch` | Talk to people waiting at the hatch | canvass | INT | 10 |
| `duskwall.infirmary.visitors` | Talk to people at visiting hour | canvass | CHA+INT | 10 |
| `duskwall.infirmary.errands` | Run errands for the sisters | training (AGI) · verb *Run* | — | 20 + 2×AGI |
| **Ashford · The Wharf** | | | | |
| `ashford.wharf.bargemen` | Talk to the bargemen at the lock | canvass | STR | 10 |
| `ashford.wharf.speech` | Speak from the boat club steps | speech | CHA+INT | 12 |
| `ashford.wharf.towpath` | Hand out flyers along the towpath | propaganda | AGI | 8 |
| `ashford.brewery.draymen` | Talk to the draymen at the gate | canvass | STR | 10 |
| `ashford.brewery.wall` | Put up posters on the brewery wall | propaganda | STR | 8 |
| `ashford.brewery.barrels` | Roll barrels in the yard | training (STR) · verb *Roll* | — | 20 + 2×STR |
| `ashford.cattle-market.pens` | Talk to the farmers at the pens | canvass | CHA+INT | 10 |
| `ashford.cattle-market.speech` | Speak from the auctioneer's box | speech | CHA+INT | 12 |
| `ashford.infirmary.visitors` | Talk to people at visiting hour | canvass | CHA+INT | 10 |
| `ashford.infirmary.ambulance` | Watch who the ambulance brings | intelligence | INT | 4 |
| `ashford.police.notices` | Read the notices at the station door | intelligence | INT | 3 |
| `ashford.police.desk` | Talk to people waiting at the desk | canvass | INT | 10 |

**Count:** canvass 15 · speech 5 · propaganda 6 · intelligence 7 · training 4 (STR ×3, AGI ×1) = 35 (Coalport 11, Duskwall 12, Ashford 12). Each home city gains a second STR training place (the Harbour's porters, the sawmill's yard, the brewery's barrels), which the STR builds have asked for since slice 2; Duskwall gains a second AGI one. The three infirmaries and the three police stations carry **the same two tickets each** by design: wherever the game sends a player, the place has something ordinary to do when they walk back in on their own feet.

### 3.1 Outcome texts

#### Coalport · The Shipyard

**Talk to the riveters at the yard gate** (`coalport.shipyard.riveters`)
- Success — *They stop for one who can swing a hammer* — The riveters come off the staging at five with their ears still ringing. You've the shoulders for it, so they stop. Rates, the launch, who owns the slipway. A chargehand takes ten flyers for the staging hut.
- Partial — *Most of them head for the ferry* — The shift comes off in a body and most of it makes for the ferry stage. You press flyers on the stragglers. Two stop to argue the rates; one says his brother's a member and takes two.

**Put up posters on the slipway fence** (`coalport.shipyard.fence`)
- Success — *A hundred yards of fence* — Bucket, brush and the long fence along the slipway. Twelve posters up straight and high, one to every gap in the boards. Two hundred men will read them at five, and the ferry queue after.
- Partial — *The paste won't take on wet boards* — Spray off the basin and paste that runs. Five posters stay up; the rest slide into the mud. Five is five, and one is on the yard gate.

#### Coalport · Customs House

**Talk to people in the permits queue** (`coalport.customs-house.permits`)
- Success — *A queue that can't leave* — Forty people, one hatch, and the republic's clock above them taking its time. You work the line with the flyer and the rates sheet. By the time the hatch opens, half the queue knows what your party would do about the shilling.
- Partial — *The hatch opens early* — You're three people in when the hatch goes up and the queue becomes a crush at the counter. A few flyers go into coat pockets. A carter folds his and says he'll read it on the mole, waiting.

**Watch who comes out of the sheds** (`coalport.customs-house.sheds`)
- Success — *The sheds keep hours of their own* — A bollard, a paper you don't read, and the shed doors in view. Who comes out with a stamp, who comes out without one, which lorry leaves by the back. Two names and a plate go in your notebook.
- Partial — *A quiet afternoon on the mole* — One lorry, stamped and gone. A clerk who smokes by the door and says nothing to anyone. One name worth writing down. Come back when a ship is in.

#### Coalport · The Infirmary

**Talk to people at visiting hour** (`coalport.infirmary.visitors`)
- Success — *Two o'clock, forty visitors* — Visiting is at two and the queue at the gate is anxious, patient and can't leave. You work it gently: the beds, the mill's accidents, who pays. By the time the porter opens the gate most of it has a flyer in a basket.
- Partial — *The porter opens early* — The gate opens at ten to two and the queue is gone up the steps. A few flyers go into baskets. One man says his wife's on the women's ward and takes two.

**Carry for the porters** (`coalport.infirmary.porters`, training STR)
- Trained — *Stretchers up three flights* — The porters don't ask which party you're with; they ask if you can take the foot end up three flights without stopping. You can, by the end. The matron watches you go up and says nothing, which is approval.

#### Coalport · Harbour Police

**Read the notices at the station door** (`coalport.harbour-police.notices`)
- Success — *Names on the board* — The board by the door lists the week's lost property, licences refused and the men wanted for questioning. Two names and a street go in your notebook while the duty officer is on the telephone.
- Partial — *Last week's sheet* — The board is last week's and the duty officer is watching through the glass. One name worth writing down, from the licences refused. Come back on Monday.

**Talk to people waiting at the desk** (`coalport.harbour-police.desk`)
- Success — *Everyone here has a grievance* — Lost bicycles, a licence, a son. The bench by the desk is the most patient audience in Coalport. You keep your voice down and your flyers folded small. By the time the duty officer calls next, half the bench has one.
- Partial — *The duty officer has a view* — The duty officer looks up from his book and then at the door. You get two flyers out on the way to it. One woman follows you onto the step to ask about the rent tribunal.

#### Coalport · The Far Bank

**Talk to people in the ferry queue** (`coalport.far-bank.ferry`)
- Success — *Ten minutes to the next boat* — The ferry queue has ten minutes and nowhere to go. You work the stage with the flyer and the fare table: the harbour rates, the ferry penny, who decides. By the time the boat comes, the queue has an opinion it didn't have.
- Partial — *The boat comes early* — You're four people in when the ferry noses in and the queue becomes a scrum for the gangway. A few flyers go into shopping bags. One old woman says she'll read it on the crossing, which is three minutes.

**Speak from the fish quay steps** (`coalport.far-bank.speech`)
- Success — *The fish quay stops gutting* — The quay steps at the morning sale, the iron roof for a sounding board. The rates, the ferry penny, who owns the ice. The fishwives heckle, the quay laughs, and by the end the laughs are on your side.
- Partial — *The auctioneer starts up* — You get through the rates before the auctioneer's bell goes and takes the quay with it. A knot of boys at the back stays to argue. A fishwife gives you a herring, which is not a no.

**Hand out flyers under the iron roof** (`coalport.far-bank.leaflets`)
- Success — *Quick hands, wet floor* — You work the fish market aisles at a trot, a flyer into every basket before its owner looks up from the scales. The bag is empty in ten minutes and the market beadle never sees you.
- Partial — *The beadle sees you* — Half the bag is gone when the beadle plants himself in the aisle and asks about your permit. You leave by the ice store, slower than you'd like. The flyers you handed out are still out there, damp.

#### Duskwall · Frontier Checkpoint

**Talk to the lorry drivers in the queue** (`duskwall.checkpoint.drivers`)
- Success — *Forty lorries and nowhere to go* — The queue at the barrier starts at dawn and moves when the customs say so. You work the cabs with the flyer and the rates: the frontier, the timber, who signs the chits. When the barrier lifts, half the drivers have one on the dashboard.
- Partial — *The barrier lifts early* — You've done six cabs when the barrier goes up and the queue moves off in a cloud. A few flyers go through windows. One driver says he'll read it at the sawmill, waiting to unload.

**Note which lorries are turned back** (`duskwall.checkpoint.turned-back`)
- Success — *Who comes back down* — A rock above the barrier and a flask. Three lorries go through stamped, two are turned back, one is waved through without a stamp by a man in a plain coat. Two plates and a name go in your notebook.
- Partial — *A slow morning on the road* — One lorry, checked, stamped and through. A customs man who smokes by the barrier and looks at the peaks. One plate worth writing down. Come back on market day.

#### Duskwall · Mountain Inn

**Listen in the taproom** (`duskwall.mountain-inn.listen`)
- Success — *The road talks* — You buy one drink and listen to the pass. Which lorry was turned back and why, which customs man takes a drink, who's leaving for the capital. Two names and a rumour go in your notebook.
- Partial — *A quiet night at the inn* — Two carters and a dog. One thing worth writing down, about a load that went up the pass at night. Come back when the frontier's shut.

**Speak to the carters at the long table** (`duskwall.mountain-inn.carters`)
- Success — *They put their mugs down* — The long table at supper, twenty carters who've earned the right not to listen. You keep it to the rates, the frontier and the timber price. They put their mugs down. That's the compliment on the pass.
- Partial — *The landlord objects* — You get through the rates before the landlord says the table's for eating. Half the bench heard you. One carter says come back tomorrow, same bench, and bring the flyer with the numbers.

**Win over the inn's regulars** (`duskwall.mountain-inn.regulars`)
- Success — *The stove end comes round* — The regulars by the stove have views on everything and nobody to tell them to. You buy one round and argue three: the frontier, the ration, who runs the checkpoint. By closing, the stove end is yours.
- Partial — *The stove end has heard it before* — They've heard every party's man and they tell you so. You get one of them nodding and another saying maybe. The landlord takes a flyer for the bar, which is more than he did last time.

#### Duskwall · Sawmill

**Talk to the sawyers coming off shift** (`duskwall.sawmill.sawyers`)
- Success — *The saws stop, and they stop* — You're at the yard gate when the second shift comes off, sawdust to the knees. You've the shoulders for it, so they stop. Rates, the timber price, who owns the river. A foreman takes ten flyers for the mess hut.
- Partial — *Most of them head for the inn* — The shift comes off and most of it makes for the inn without slowing. You press flyers on the stragglers. Two stop to argue the rates; one gives you his street.

**Put up posters on the timber stacks** (`duskwall.sawmill.stacks`)
- Success — *A poster on every stack* — Bucket, brush and a yard stacked to the roof. You get twelve posters up on the stacks' ends, high and straight, before the night watchman comes round. Two shifts a day will read them, and the lorries from the pass.
- Partial — *The resin won't take paste* — Fresh-cut pine and paste that beads and runs. Five posters stay up; the rest peel by morning. Five is five, and one is on the yard gate.

**Stack timber in the yard** (`duskwall.sawmill.stack`, training STR)
- Trained — *An hour on the stacks* — The yard foreman doesn't ask which party you're with; he asks if you can get a twelve-foot plank onto the top of the stack alone. You can, by the end. Your shoulders will tell you about it tomorrow.

#### Duskwall · Lock-up

**Read the notices at the lock-up door** (`duskwall.lock-up.notices`)
- Success — *Names on the board* — The board by the hatch lists the week's permits refused, loads seized and the men wanted at the checkpoint. Two names and a plate go in your notebook while the duty officer is at the stove.
- Partial — *Last week's sheet* — The board is last week's and the duty officer is watching through the hatch. One name worth writing down, from the loads seized. Come back on Monday.

**Talk to people waiting at the hatch** (`duskwall.lock-up.hatch`)
- Success — *A bench with time to talk* — A driver whose load is in the shed, a woman whose son is in the cells, a carter waiting for a chit. The bench has nothing to do but listen. You keep it low and the flyers folded. By the time the hatch opens, most of the bench has one.
- Partial — *The duty officer has a view* — The duty officer looks through the hatch and then at the door. You get two flyers out on the way to it. One driver follows you onto the road to ask about the timber rates.

#### Duskwall · Infirmary

**Talk to people at visiting hour** (`duskwall.infirmary.visitors`)
- Success — *Two o'clock under the spire* — Visiting is at two and the queue at the infirmary door is anxious, patient and can't leave. You work it gently: the beds, the sawmill's accidents, who pays. By the time the sister opens the door most of it has a flyer in a basket.
- Partial — *The sister opens early* — The door opens at ten to two and the queue is gone up the stairs. A few flyers go into baskets. One man says his brother lost two fingers at the mill and takes two.

**Run errands for the sisters** (`duskwall.infirmary.errands`, training AGI)
- Trained — *Every stair under the spire* — Six notes, four wards, one hour, and the sisters want them yesterday. You learn the back stairs, the short cut through the laundry and the door that sticks, and you learn them at a run. By the end you could do it in the dark.

#### Ashford · The Wharf

**Talk to the bargemen at the lock** (`ashford.wharf.bargemen`)
- Success — *They make room on the lock beam* — The bargemen wait on the lock beam while the water comes up and have nothing to do but talk. You've the hands for the ropes and it shows. By the time the gates open, the beam has agreed to send two men to the Rooms.
- Partial — *The lock fills faster than you'd like* — You get through the tolls before the gates open and the barges move off. A couple of nods, one argument about the brewery's wharf that goes nowhere. The lock-keeper takes a flyer for later.

**Speak from the boat club steps** (`ashford.wharf.speech`)
- Success — *The towpath stops to listen* — The club steps on a Sunday, the river for a sounding board and the lower town walking past. The tolls, the rents below the bridge, who sits on the wharf board. Both banks slow down. A barge rings its bell for you.
- Partial — *The rowing eight takes half of them* — You've a decent crowd until the college eight comes through the bridge and takes it to the rail. You finish for the ones who stayed and a policeman who looks bored. The lock-keeper gives you a nod.

**Hand out flyers along the towpath** (`ashford.wharf.towpath`)
- Success — *A mile of towpath, empty bag* — The whole lower town walks the towpath on a Sunday and can't hurry. You work it at a trot, a flyer into every hand from the lock to the brewery. The bag is empty before the brewery wall.
- Partial — *The wind off the river* — Half the bag goes into hands and half into the river when the wind gets up at the bend. The ones that stayed dry are still out there. A boy fishes one out with a net and reads it anyway.

#### Ashford · Brewery

**Talk to the draymen at the gate** (`ashford.brewery.draymen`)
- Success — *They stop for one who can lift a cask* — The draymen load at six and come off at two with the horses. You've the shoulders for it, so they stop. Rates, the tolls, who owns the wharf. A head drayman takes ten flyers for the stables.
- Partial — *Most of them go with the drays* — The drays go out in a line and most of the men go with them. You press flyers on the yard hands. Two stop to argue the tolls; one says his father's a member and takes two.

**Put up posters on the brewery wall** (`ashford.brewery.wall`)
- Success — *A wall's length of paper* — Bucket, brush and a hundred yards of brewery wall along the towpath. You get twelve posters up straight and high, one to every bay. The draymen will read them at six, and the whole lower town after.
- Partial — *The paste won't hold on sooted brick* — The wind off the river is against you and the paste won't take on the chimneys' soot. Five posters stay up; the rest go in the river. Five is five.

**Roll barrels in the yard** (`ashford.brewery.barrels`, training STR)
- Trained — *An hour on the casks* — The yard foreman doesn't ask which party you're with; he asks if you can get a full cask up the ramp onto the dray alone. You can, by the end. Your back will tell you about it tomorrow.

#### Ashford · Cattle Market

**Talk to the farmers at the pens** (`ashford.cattle-market.pens`)
- Success — *The county has time to talk* — Market day, the pens full, and a county that won't be hurried. You work the rails with the flyer and the tolls sheet, and you take your hat off at every pen. By the auction bell, half the county has one in a waistcoat pocket.
- Partial — *The auction starts early* — You've done three pens when the bell goes and the county goes to the sheds in a body. A few flyers go into waistcoats. One old farmer says he'll read it after the sale, if his beasts make a price.

**Speak from the auctioneer's box** (`ashford.cattle-market.speech`)
- Success — *The box is yours between lots* — The auctioneer's box between lots, the sheds for a sounding board and the county on the benches. The tolls, the railway rates, who sits on the market board. Nobody heckles a man in the box. The auctioneer lets you finish before the gavel.
- Partial — *The next lot comes in* — You get through the tolls before the next lot comes through the gate and takes the sheds' attention with it. A knot of young farmers at the rail stays to argue. The auctioneer looks at his watch.

#### Ashford · County Infirmary

**Talk to people at visiting hour** (`ashford.infirmary.visitors`)
- Success — *Two o'clock in the garden* — Visiting is at two and the queue at the lodge is anxious, patient and can't leave. You work it gently: the beds, the fever, who pays. By the time the porter opens the gate most of it has a flyer among the flowers.
- Partial — *The porter opens early* — The gate opens at ten to two and the queue is gone up the drive. A few flyers go into baskets. One woman says her husband's on the men's ward and takes two.

**Watch who the ambulance brings** (`ashford.infirmary.ambulance`)
- Success — *The ambulance keeps a list* — A bench by the lodge and a paper you don't read. Who comes in from the brewery, who from the cattle market, which case the porter signs for without a name. Two names and a time go in your notebook.
- Partial — *A quiet afternoon at the lodge* — One ambulance, one broken arm from the wharf. The porter smokes by the gate and says nothing. One name worth writing down. Come back on market day.

#### Ashford · Police Station

**Read the notices at the station door** (`ashford.police.notices`)
- Success — *Names on the board* — The board by the door lists the week's lost property, licences refused and the men wanted for questioning. Two names and a street go in your notebook while the duty officer is on the telephone.
- Partial — *Last week's sheet* — The board is last week's and the duty officer is watching through the glass. One name worth writing down, from the licences refused. Come back on Monday.

**Talk to people waiting at the desk** (`ashford.police.desk`)
- Success — *Everyone here has a grievance* — A lost dog, a licence, a son. The bench by the desk is the most patient audience in Ashford. You keep your voice down and your flyers folded small. By the time the duty officer calls next, half the bench has one.
- Partial — *The duty officer has a view* — The duty officer looks up from his book and then at the door. You get two flyers out on the way to it. One man follows you onto the step to ask about the court queue.

---
## 4. Missions (tier 2): the rules

### 4.1 Shape (GDD §13.1, §13.2)

A mission is a ticket like any other on a place's sheet, under its own kicker (*Missions*), and it plays in **one choice**: the ticket opens a **briefing** (two or three lines), under it **two or three ways to do it**, each a row with its stat and odds word and, where it differs, its own risk line; tapping a row is the choice and the tap (*{Way} · 15 Energy*). The server resolves the check, then the street's two rolls (§4.6), and shows **one result modal**. **The game remembers the way you chose**: from the second time the ticket carries a *Repeat* button (*Again, {way} · 15 Energy*, one tap, no briefing) and a text button *Choose another way* that opens the briefing. There is no ×3 on a mission: one choice, one attempt.

| | |
|---|---|
| **Level** | Tier 2 opens at **Level 6** (§5.3). Each mission names its own Level: 6, 8, 10 or 12 (the difficulty ladder, §4.3) |
| **Rank** | **Illegal missions need Rank 3** (§5.4), everywhere. Legal ones need none |
| **Standing** | Some home-city missions need *Known* there (§13.4); none on rival ground, where a visitor rarely is |
| **Audience** | A legal mission is for everyone (an HQ's *members only* covers its tier-1 tickets; §4.5). An illegal mission names a **target** faction and is for everyone **but** that faction. In the capital a target may be `leader`: the faction leading the district at the boundary, or the runner-up when that is the actor's own |
| **Energy** | 10–20 by type (§4.2); paid on the choice; refused short of Energy (*Needs 15 Energy*) |
| **Odds** | The §8.4 formula with the mission's difficulty; the approach's stat (one, two averaged, or *best*); Standing in the city +3 %/level; *close race* +5 % on speech missions in a close-race district (the political type; the illegal types get no close-race or comeback line, §23.1 #6); **rival ground +4 difficulty** |
| **Outcomes** | One roll: at or below the chance **Success**; up to 20 above **Partial** (half rewards, per line); more than 20 above **Failure**: XP ÷ 5, nothing else. The stamp reads *Success* / *Partial* / *Failure*; the reason line as review 2 (§2.4: *It went badly.* then the cause) |
| **Rewards** | T2 rates (§5.5): **5 XP · 0.8 Party XP · 4 Iron per Energy**; **opinion 0.01 per Energy, ×2 for illegal missions** (§14.2), drawn Neutral-first for persuasion (a speech), **from the target faction** for an action against a rival (half to the actor, half to Neutral); Rested, Issue tags (+50 % opinion, momentum = Energy, half on Partial, none on Failure), *close race* and *comeback* lines as tier 1; **a Success is a win** for Reputation |
| **Heat, run-ins, the caught check** | By type (§4.2), after the check (§4.6) |
| **Agility** | A **Success on an Agility approach adds a quarter of a point of Agility** (§8.5 "every successful stealth action"), shown as a knock-on line *Agility +¼ · 3 more for a point* |
| **Orders** | A speech mission counts for any order matching `speech`; a surveillance mission for `intelligence`; every mission counts for the new slot-B order *Take on a mission* (§12.2). Illegal types match nothing else |

### 4.2 Types (GDD §13.3, §6.4, §11.2, pinned for slice 5)

| Type | Player reads | Legal | Energy | Heat | Run-in | Caught (base) | Marks | Party XP | Opinion |
|---|---|---|---|---|---|---|---|---|---|
| `speech` (a big crowd) | *Mission · Speech* | yes | 15 | 0 | **5 %** | — | — | yes | 0.01/E, persuasion |
| `surveillance` (extended) | *Mission · Watch and listen* | mostly | 12 | **+5** | **10 %** | none | — | no | none |
| `vandalism` | *Mission · Against the {faction}* | **no** | 10 | **+6** | **15 %** | **8 %** | 1 | yes | 0.02/E, against |
| `disruption` | *Mission · Against the {faction}* | **no** | 15 | **+8** | **30 %** | **10 %** | 1 | yes | 0.02/E, against |
| `sabotage` | *Mission · Against the {faction}* | **no** | 20 | **+12** | **25 %** | **20 %** | 3 | yes | 0.02/E, against |
| `theft` | *Mission · Against the {faction}* | **no** | 15 | **+10** | **25 %** | **15 %** | 2 | yes | none; **Iron ×2** |

Pinned here (the GDD had no row): vandalism's run-in 15 %; theft's Heat +10 and run-in 25 %; **surveillance has no caught check and no mark** (it is "mostly legal": its cost is Heat and the chance of being noticed); **theft pays no opinion and double Iron** (the branch buys what you bring back; its Dossier hook is slice 8). Per Energy the illegal road pays the same XP and Party XP as the legal one and **four times a canvass's opinion**; Heat and the record are its price. **Heat is paid on every outcome** (the attempt is what draws attention), the run-in is rolled on every outcome, **the caught check on a Partial or a Failure only** (a clean job leaves no name: §7.1, a change to GDD §11.2's "every illegal action", made so that a daily illegal player is not Notorious inside a week; `docs/economy.md` §19.4), and Partial pays half the rewards, not half the risk.

Rewards per mission at these Energies (Success / Partial / Failure):

| Type · Energy | XP | Party XP | Iron | Opinion |
|---|---|---|---|---|
| Speech · 15 | 75 / 38 / 15 | 12 / 6 / 0 | 60 / 30 / 0 | 0.15 / 0.075 |
| Surveillance · 12 | 60 / 30 / 12 | — | 48 / 24 / 0 | — |
| Vandalism · 10 | 50 / 25 / 10 | 8 / 4 / 0 | 40 / 20 / 0 | 0.20 / 0.10 against |
| Disruption · 15 | 75 / 38 / 15 | 12 / 6 / 0 | 60 / 30 / 0 | 0.30 / 0.15 against |
| Sabotage · 20 | 100 / 50 / 20 | 16 / 8 / 0 | 80 / 40 / 0 | 0.40 / 0.20 against |
| Theft · 15 | 75 / 38 / 15 | 12 / 6 / 0 | **120 / 60 / 0** | — |

### 4.3 The difficulty ladder (GDD §8.4, Appendix C #15 closed)

Tier-2 difficulties are 14–20, **set by the mission's Level** against the modelled best stat of a player who arrives there on time, so that new content sits inside the 60–85 % band and old content drifts up to the clamp, as §8.4 intends:

| Mission Level | Difficulty | Reference player's best stat when they get there (`docs/economy.md` §19.2) | Odds then |
|---|---|---|---|
| 6 (day 2) | **14** | ~19 | 70 % (+3 Familiar: 73) |
| 8 (day 3) | **16** | ~22 | 74 % |
| 10 (day 5) | **18** | ~25 | 78 % |
| 12 (day 7) | **20** | ~28 | 82 % |
| Irongate | the ladder, **+2** (as tier 1's 10 against 8) | | |
| Rival ground | the ladder, **+4** on top (§14.12) | | |

**Appendix C #15 is closed by this.** The +1 stat point per level stays (it is what makes a level-up a moment); the §8.5 best-stat targets were written before it and are raised to what the rule produces (day 1 ~12, week 1 ~28, month 1 ~50, month 3 ~85, season 2 100+), and difficulties are set against those. A build that spreads its points sees *Fair odds* on new content and *Good odds* a few days later; a build that stacks sees *Good odds* at once and the clamp within the week, which is the §8.4 shape.

### 4.4 The briefing and the ways

- **The briefing** is one `StoryText` (≤ 380 characters, ≤ 4 sentences; §23.8): where you are, what the job is, what could go wrong. No numbers in the prose; the numbers are on the rows.
- **A way** is `{ id, title ≤ 60, stats, hint ≤ 90 }` and, where it differs from the mission's type, its own `heat` and `runIn` (a loud way draws more attention than a quiet one). Two or three ways; at most one may be *best* (the §8.4 best-stat check); content mixes the stats so that STR, INT and AGI builds each find a way on their stat somewhere in every city, and the CHA ways wait for the Wardrobe.
- **The row** shows: the title; under it the odds word and the stat (*Fair odds · Agility*); under that, when the way's risk differs from the mission's, its risk line (§4.7). The remembered way carries *Last time* and sits first.
- **One result text per outcome** for the mission, not per way: the ways are the stat and the hint; the texts are written to read true for any of them.

### 4.5 Where missions live

Missions are actions on a location, `tier: 2`, listed after the place's tier-1 tickets under *Missions*. An HQ (`faction-hq`) keeps its tier-1 tickets members only; **its missions against the HQ's faction are for visitors**, who see the place's blurb, the dimmed members-only tickets and the missions they may take. So a Collective member at Beacon House sees nothing they can do but the two things they shouldn't.

### 4.6 The order of play: the check, then the street

One tap, one server transaction, one result; the encounter is the only thing that can split it in two.

1. **The check** (§8.4) decides Success, Partial or Failure and the rewards, which are **held**.
2. **The run-in roll** (§10.1): the mission's chance (the type's, ×2 on rival ground, plus the Heat and record terms, plus a *Watched* or *Warned* day). If it fires, the result is **held** and the **encounter modal** opens: one choice (§10.3). The encounter decides whether the held result is paid: **Fight won, Talk or Pay** pays it as rolled; **Run** keeps only Failure's small XP ("you got away; you dropped it"); a **loss** keeps the small XP and sends you to the infirmary (to the cells against the police). Heat is paid whatever happens.
3. **The caught check** (§7.1; illegal missions only, **on a Partial or a Failure**, and not after a loss, which has already cost enough): base + half your Heat − Agility. Caught while *Cool* or *Noticed*: **your name is taken** (the type's marks). Caught while *Hot* or *Wanted*: **the cells** (§8). *Wanted* and a Failure: the cells without a roll (§6.4).
4. **The result modal** (§13.1a, the receipt), with the encounter's line, the Heat line (*Heat +8 → 32 · Noticed*), the record line if any, and the knock-on lines; when the player was sent to the cells or the infirmary, the modal's one button reads *To the cells* / *To the infirmary* and leads to the service screen (§8, §9).

An encounter left unanswered (the tab closed) is **auto-resolved** on the first read after five minutes, or at the day's end, with the best free odds (§10.4), and the result modal waits for the player as the orders-complete modal does. Nothing about a mission needs the player at a time.

### 4.7 What the ticket says before the tap (GDD §13.1: odds and risks before you commit)

The ticket's tags line, in words, no odds maths:

- the type label (*Mission · Against the Vanguard*);
- the odds word and the stat of the **remembered way**, or of the best way for the player's stats on the first time (*Fair odds · Agility*);
- **the risk line**: `Heat +8 · {risk word} · {marks}`, where the risk word is the run-in band (**Safe** 0 %, **A little risk** 1–10 %, **Risky** 11–24 %, **Dangerous** 25 % and over, computed from the mission's chance for this player, here, today, so rival ground and a Hot player read *Dangerous* on things that read *Risky* at home) and the marks line is *if caught, a mark on your record* / *two marks* / *three marks*, or nothing for a legal mission;
- the gates when locked: *From Level 8* · *Organisers and above* (the faction's Rank 3 title) · *Needs a Known reputation here* · *Not with your record* (§7.3);
- the usual tags (*Issue: Harbour Rates · opinion +50 %*, *Close race*, *Party order 1 / 1*, *Rival ground · +50 % Party XP · worse odds*).

Tapping the risk word opens its help note (`slice-5-screens.md` §2.3). Heat and marks are numbers because they are resources and costs, not odds (review 2: *+25 % Party XP* stays; *72 %* goes).

---

## 5. The mission catalogue (22)

Each mission: its row of numbers, the briefing, the ways and the three texts. `pool` is the opponents a run-in draws from (§10.2; the server drops any of the actor's own faction and adds the city police when Heat is *Noticed* or above). Energy, Heat, run-in, caught and marks are the type's (§4.2) unless a way says otherwise. Difficulty is the ladder's for the mission's Level (§4.3); Irongate's are +2, and every mission on rival ground is +4 for the visitor at play time, not in content. Rank 3 is written as the player's faction title at run time (*Organisers and above* / *Bailiffs and above* / *Agents and above*).

### 5.1 Coalport

**Speak at the launch** (`coalport.shipyard.launch`) · speech · 15 E · Level 6 · difficulty 14 · everyone · pool `strike-picket`, `street-enforcer`
*The yard launches a collier at noon and two thousand people will stand on the slipway bank to watch it go. There's a platform for the owner's wife and the bottle, a gantry over the staging, and a drawing office full of men who draw the thing and never get asked.*

| Way | Stat | Hint |
|---|---|---|
| From the platform, after the bottle | CHA+INT | The owner's party will not like it. The crowd will. |
| From the gantry, among the riveters | STR | Climb it, hold the rail, and shout over the band. |
| The drawing office first, then the bank | best | Find out what the yard wants before you tell it what you want. |

- Success — *The hull goes in to your name* — The bottle breaks, the hull slides, and in the silence before the splash you have two thousand people and nothing between you and them. Rates, the slipway, who owns the river. The cheer when she floats is half for the ship.
- Partial — *The band plays you off* — You get through the rates before the bandmaster decides the ship is more important and plays. Half the bank heard you. A chargehand says come back for the fitting-out, and brings three men to shake your hand.
- Failure — *A ship is a ship* — The hull sticks on the ways for a quarter of an hour and the crowd watches the yard, not you. By the time she goes in, you're one more voice in a cheer. The owner's wife looks at you once. You walk back along the bank with the flyers.

**Watch the sheds after dark** (`coalport.customs-house.watch`) · surveillance · 12 E · Level 6 · difficulty 14 · everyone · pool `city-police`
*The customs sheds close at six and open again, for some people, at ten. The mole has a bollard with a view of both doors and a lamp that goes out at eleven. Whoever comes and goes after that has a reason, and so will the harbour police if they find you there.*

| Way | Stat | Hint |
|---|---|---|
| From the mole, with a flask | INT | Sit still, count, write it down. The cold is the only thing against you. |
| Along the shed roofs | AGI | Closer, quieter, and a long way down if the slates go. |

- Success — *The ten o'clock door* — At ten a shed door opens that was locked at six. Two lorries in without a stamp, one man out with a case, and a plate you've seen on the quays. It all goes in the notebook, with the times.
- Partial — *A lamp goes out early* — The lamp dies at half past nine and the sheds become shapes. You get one lorry and one plate before the rest is guesswork. Something came in tonight; you'll need another night to say what.
- Failure — *A long cold nothing* — Four hours on the mole and the sheds stay shut. A harbour policeman walks past twice and looks at you the second time. You go home with a cold and an empty page, and the sheds have your face.

**Tear down the Vanguard's posters on the fish quay** (`coalport.far-bank.posters`) · vandalism · 10 E · Level 6 · difficulty 14 · Rank 3 · target `vanguard` · pool `street-enforcer`, `city-police`
*The Vanguard has papered the fish quay overnight: a poster on every pillar under the iron roof, ORDER AND BREAD above the gutting tables. The market opens at six and the beadle makes his round at seven. Whatever is on the pillars at eight is what the Far Bank reads today.*

| Way | Stat | Hint | Risk |
|---|---|---|---|
| Before the market, in the dark | AGI | Nobody about, nobody to see. One pillar at a time. | the mission's (15 %) |
| At the busiest, in plain sight | STR | Rip them down with the quay watching and let them see you do it. | run-in **25 %**, opinion the same |

- Success — *Bare pillars by eight* — Every pillar under the roof is bare by the time the beadle makes his round, and the gutting tables have a view of nothing but the ferry. The Vanguard's man comes at nine with a bucket and finds he's the news.
- Partial — *Half the roof* — You get the pillars on the ferry side before the beadle's lamp comes round the ice store and you leave by the fish quay steps. Half the roof is bare. The other half is talking about who did it.
- Failure — *The paste is good* — Wet night, good paste, and posters that come off in strips the size of your hand. You get two pillars done before the gutting tables arrive and you have to walk out past them with pink hands. The posters stay up.

**Break up the stair meeting on Foundry Row** (`coalport.terraces.stair-meeting`) · disruption · 15 E · Level 8 · difficulty 16 · Rank 3 · target `collective` · pool `branch-inspector`, `strike-picket`
*The Collective holds its stair meeting on Foundry Row at seven, forty people on the landings and a branch inspector at the top with the book. The fuse box is on the ground floor, the back entry is unlocked, and the one question the inspector can't answer is in your pocket.*

| Way | Stat | Hint |
|---|---|---|
| Shoulder through the door | STR | Up the stairs through forty people. They will notice. |
| Pull the fuse on the stair | AGI | Dark landings, a crowd that panics, and nobody to say who did it. |
| Ask the one question they can't answer | INT | Stand at the back and take the meeting off them with your mouth. |

- Success — *The meeting goes home early* — Forty people on four landings, and by half past seven thirty of them are on the pavement arguing with each other instead of listening. The inspector shuts his book. A woman on the second floor asks for your flyer, to be fair.
- Partial — *A landing and a half* — You take the second floor with you and the inspector holds the rest. It ends ragged, with the stair split and the book half full. Half a meeting is half a meeting.
- Failure — *They close ranks* — The inspector saw you on the pavement before you were on the stair. The meeting goes quiet, moves up a floor, and finishes with the door shut. You stand on the landing with your question and nobody to ask it.

**Spike the duplicator at the Union Hall** (`coalport.union-hall.spike`) · sabotage · 20 E · Level 10 · difficulty 18 · Rank 3 · target `collective` · pool `branch-inspector`, `city-police`
*The Collective's duplicator runs in the back room of the Union Hall at night, and five hundred flyers come out of it by morning. The yard wall is low, the caretaker's round is at eleven, and a tradesman with a box of parts walks in at the front door. One bent drum and the branch is quiet for a week.*

| Way | Stat | Hint |
|---|---|---|
| Over the yard wall at night | AGI | The back window, the dark room, the drum. In and out before the round. |
| Walk in as a tradesman | CHA+INT | A box, a cap, a grievance about the stencils. Nobody questions a man with a box. |
| Wait for the caretaker's round | INT | Learn the hall's hours first. Then the room is yours for twenty minutes. |

- Success — *The drum won't turn* — The drum is bent a hair, the ink's in the gearing, and the stencil clamp is in your pocket. It will print again in a week, when someone finds a clamp. Tomorrow's five hundred flyers are tonight's one ruined sheet.
- Partial — *Half a job* — You get the ink in the gearing before a light goes on in the yard and you leave by the wall. The machine will print tomorrow, badly, and ghosted. Half the stack goes out. Half is half.
- Failure — *The room is locked* — The caretaker changed his round. The back room is locked, the yard has a lamp you didn't know about, and you spend twenty minutes in a coal store listening to a man whistle. The duplicator runs at dawn.

**Lift the branch's membership roll** (`coalport.union-hall.roll`) · theft · 15 E · Level 10 · difficulty 18 · Rank 3 · target `collective` · pool `branch-inspector`, `city-police`
*Every Collective member in Coalport is a line in a ledger on the clerk's desk at the Union Hall: name, street, dues paid. The clerk takes his dinner at one and leaves the window open. Your branch would pay well for a copy, and the Collective would pay more to know who took it.*

| Way | Stat | Hint |
|---|---|---|
| The clerk's window at dinner time | AGI | Twelve minutes, a pencil, and the window he leaves open. |
| Charm the clerk into a copy | CHA+INT | He's bored and underpaid and nobody ever asks him anything. |

- Success — *Four hundred names* — Four hundred names, streets and dues, copied in twelve minutes in a hand you can read. The ledger goes back on the desk a quarter-inch from where it was. Your branch pays on sight and asks no questions.
- Partial — *Half the ledger* — You get to M before the clerk's step is on the stair and the window has to be the way out. Two hundred names is two hundred names. The branch pays half and asks about the rest.
- Failure — *Dinner is early today* — The clerk eats at his desk today. You stand in the corridor with a pencil and a story about dues until he asks which branch, and then it's time to leave. The ledger stays on the desk.

### 5.2 Duskwall

**Speak at the whistle** (`duskwall.sawmill.whistle`) · speech · 15 E · Level 6 · difficulty 14 · everyone · pool `street-enforcer`, `vanguard-doorman`
*The sawmill's two shifts cross at the yard gate at two, four hundred men going in and coming out, and the whistle holds them there for three minutes while the foremen count. There's a timber stack for a platform, the mill office's steps, and a foreman's hut where the counting is done.*

| Way | Stat | Hint |
|---|---|---|
| From the office steps, in the foremen's hearing | CHA+INT | The office will not like it. Four hundred men will. |
| From the top of the stack | STR | Climb it and shout over the saws. They stop for a voice that carries. |
| Ask the foreman's hut first | best | Find out what the yard is angry about before you tell it what you'd do. |

- Success — *The whistle goes, and they stay* — Four hundred men who were going home, and they stay past the whistle to hear the end. The timber price, the frontier, who owns the river. A foreman shouts for the count and nobody moves until you're done.
- Partial — *The second whistle* — You get through the rates before the second whistle goes and the gate empties in a body. A knot of sawyers at the stack stays to argue. One says come back Thursday, same stack.
- Failure — *Sawdust and silence* — The saws start up again before you've finished the first sentence and four hundred men can't hear you. You finish for the foreman's hut, which has its back to you. You climb down with the flyers still in your bag.

**Watch the checkpoint after dark** (`duskwall.checkpoint.watch`) · surveillance · 12 E · Level 6 · difficulty 14 · everyone · pool `city-police`, `street-enforcer`
*The barrier comes down at eight and the customs men go to the inn, all but two. Between eight and midnight the road is quiet, and what goes up it goes up without a stamp. There's a rock above the barrier with a view of the hut, and a lamp on the hut that goes out when it suits them.*

| Way | Stat | Hint |
|---|---|---|
| From the rock, with a flask | INT | Sit still, count the lorries, write down the plates. Only the cold is against you. |
| Along the ditch to the hut | AGI | Close enough to hear the chits read. Close enough to be heard. |

- Success — *What goes up at eleven* — At eleven the barrier lifts for a lorry with no lights and a man in the hut doesn't write anything down. Two plates, a name said twice, and the time. The notebook has a page the customs would pay for.
- Partial — *The lamp goes out* — The lamp on the hut dies at ten and the road becomes engine noise and shapes. One plate before the dark. Something went up tonight without a stamp; you'll need another night to say whose.
- Failure — *Nothing goes up* — Four hours on the rock and the barrier stays down. A customs man walks the ditch twice with a lamp and finds your flask the second time. You go home with a cold and an empty page, and the hut has your face.

**Tear down the Alliance's posters on the inn wall** (`duskwall.mountain-inn.posters`) · vandalism · 10 E · Level 6 · difficulty 14 · Rank 3 · target `alliance` · pool `party-thug`, `city-police`
*The Alliance has papered the inn's long wall overnight, where every carter on the pass reads while he waits for the barrier. The landlord doesn't care who papers his wall; the customs men on the bench do. Whatever's on the wall when the first lorry comes down is what the pass reads today.*

| Way | Stat | Hint | Risk |
|---|---|---|---|
| Before first light, from the yard | AGI | Nobody about but the dog. One sheet at a time. | the mission's (15 %) |
| At the long table's dinner, before the whole bench | STR | Rip them down with the bench watching and let them say so. | run-in **25 %**, opinion the same |

- Success — *A bare wall by the first lorry* — The long wall is bare by the time the first lorry comes down the pass and the carters have nothing to read but the price of beer. The Alliance's man comes at nine with a bucket and finds he's the morning's story.
- Partial — *The yard end* — You get the yard end before the dog starts and the landlord's lamp comes on upstairs. Half the wall is bare. The other half is being argued over at the long table.
- Failure — *Good paste, cold night* — Frost and paste that's set like glass. Two sheets come off in strips the size of your hand before the dog has the whole yard up. The posters stay, and so does the story of who tried.

**Break up the street meeting on Rampart Row** (`duskwall.rampart-row.street-meeting`) · disruption · 15 E · Level 8 · difficulty 16 · Rank 3 · target `vanguard` · pool `street-enforcer`, `vanguard-doorman`
*The Vanguard holds its street meeting on Rampart Row at seven: fifty people in the road, a steward at each end and the organiser's man on a chair with the lists. The corner lamp is the only light, the back entries are open, and the one question the man on the chair can't answer is about the ration.*

| Way | Stat | Hint |
|---|---|---|
| Shoulder through the stewards | STR | Two stewards, fifty people, and a chair to take. They will notice. |
| Put the corner lamp out | AGI | A dark street, a crowd that scatters, and nobody to say who did it. |
| Ask about the ration, loudly | INT | Stand at the back and take the meeting off him with one question. |

- Success — *The Row goes indoors* — Fifty people in the road, and by half past seven thirty of them are on their own steps arguing about the ration instead of listening. The man on the chair gets down. A woman at a window asks for your flyer, to be fair.
- Partial — *Half the street* — You take the lamp end with you and the stewards hold the rest. It ends ragged, with the Row split and the lists half read. Half a meeting is half a meeting.
- Failure — *The stewards close up* — A steward saw you on the corner before you were in the road. The meeting goes quiet, moves under the lamp, and finishes with the stewards facing out. You stand in the entry with your question and nobody to ask it.

**Spike the duplicator at Beacon House** (`duskwall.beacon-house.spike`) · sabotage · 20 E · Level 10 · difficulty 18 · Rank 3 · target `vanguard` · pool `vanguard-doorman`, `city-police`
*The Vanguard's duplicator runs in the basement of Beacon House every night, and five hundred sheets come out of it by morning. The yard wall is high, the doorman's round is at eleven, and a tradesman with a box of parts walks in at the side door. One bent drum and the district is quiet for a week.*

| Way | Stat | Hint |
|---|---|---|
| Over the yard wall at night | AGI | The coal chute, the dark basement, the drum. In and out before the round. |
| Walk in as a tradesman | CHA+INT | A box, a cap, a grievance about the stencils. Nobody questions a man with a box. |
| Learn the doorman's round first | INT | Know the house's hours. Then the basement is yours for twenty minutes. |

- Success — *The drum won't turn* — The drum is bent a hair, the ink's in the gearing, and the stencil clamp is in your pocket. It will print again in a week, when someone finds a clamp. Tomorrow's five hundred sheets are tonight's one ruined one.
- Partial — *Half a job* — You get the ink in the gearing before a light goes on in the yard and you leave by the chute. The machine will print tomorrow, badly, and ghosted. Half the stack goes out. Half is half.
- Failure — *The basement is locked* — The doorman changed his round. The basement is locked, the yard has a lamp you didn't know about, and you spend twenty minutes in a coal store listening to a man whistle. The duplicator runs at dawn.

**Lift the district roll** (`duskwall.beacon-house.roll`) · theft · 15 E · Level 10 · difficulty 18 · Rank 3 · target `vanguard` · pool `vanguard-doorman`, `city-police`
*Every Vanguard member in Duskwall is a line in a register on the clerk's desk at Beacon House: name, street, dues paid, in order. The clerk takes his dinner at one and leaves the window on the latch. Your branch would pay well for a copy, and Beacon House would pay more to know who took it.*

| Way | Stat | Hint |
|---|---|---|
| The clerk's window at dinner time | AGI | Twelve minutes, a pencil, and the window he leaves on the latch. |
| Charm the clerk into a copy | CHA+INT | He's bored and underpaid and nobody at Beacon House ever asks him anything. |

- Success — *Four hundred names, in order* — Four hundred names, streets and dues, copied in twelve minutes in a hand you can read. The register goes back on the desk a quarter-inch from where it was. Your branch pays on sight and asks no questions.
- Partial — *Half the register* — You get to M before the clerk's step is on the stair and the window has to be the way out. Two hundred names is two hundred names. The branch pays half and asks about the rest.
- Failure — *Dinner is early today* — The clerk eats at his desk today. You stand in the corridor with a pencil and a story about dues until he asks which branch, and then it's time to leave. The register stays on the desk.

### 5.3 Ashford

**Speak at the cattle auction** (`ashford.cattle-market.auction`) · speech · 15 E · Level 6 · difficulty 14 · everyone · pool `party-thug`, `strike-picket`
*Market day fills the auction shed with the whole county, five hundred farmers on the benches and nothing to do between lots but talk. There's the auctioneer's box, the top of the pens where the drovers stand, and the sale office where the tolls are argued before anyone speaks.*

| Way | Stat | Hint |
|---|---|---|
| From the auctioneer's box, between lots | CHA+INT | The market board will not like it. The benches will. |
| From the top rail of the pens | STR | Climb it, hold on, and shout over the beasts. |
| The sale office first, then the shed | best | Find out what the county is angry about before you tell it what you'd do. |

- Success — *The county stops bidding* — Five hundred farmers, and between lots they'd rather hear you than the auctioneer. The tolls, the railway rates, who sits on the market board. The auctioneer waits for you to finish, which has not happened before. A drover shakes your hand.
- Partial — *The next lot comes in* — You get through the tolls before the next lot comes through the gate and takes the shed with it. A knot of young farmers at the rail stays to argue. One says come back next market, same box.
- Failure — *A beast is a beast* — A bull gets loose between lots and five hundred farmers watch it, not you. By the time it's penned you're one more voice under the roof. The auctioneer looks at you once and lifts his gavel. You walk out past the pens with the flyers.

**Watch the wharf after dark** (`ashford.wharf.watch`) · surveillance · 12 E · Level 6 · difficulty 14 · everyone · pool `city-police`
*The wharf closes at six and the lock-keeper at eight. After that the barges below the bridge are nobody's business, and what comes off them goes up the towpath without a toll. There's the boat club verandah with a view of the lock, and the towpath, closer, with the police on it twice a night.*

| Way | Stat | Hint |
|---|---|---|
| From the boat club verandah | INT | Sit still, count the barges, write down the names. Only the cold is against you. |
| Along the towpath to the lock | AGI | Close enough to read the barge names. Close enough to be read. |

- Success — *The eleven o'clock barge* — At eleven a barge comes up through the lock with no lights and three men who don't tie up. Two names, a crate count and the time. The notebook has a page the wharf board would pay for.
- Partial — *Fog off the river* — The fog comes up at ten and the lock becomes lamplight and shapes. One barge name before the rest is guesswork. Something came up tonight without a toll; you'll need another night to say whose.
- Failure — *A long cold nothing* — Four hours on the verandah and the lock stays shut. A policeman walks the towpath twice and looks at you the second time. You go home with a cold and an empty page, and the lock has your face.

**Tear down the Collective's posters on the brewery wall** (`ashford.brewery.posters`) · vandalism · 10 E · Level 6 · difficulty 14 · Rank 3 · target `collective` · pool `strike-picket`, `city-police`
*The Collective has papered the brewery wall overnight, a hundred yards of towpath that the whole lower town walks on its way to the bridge. The draymen come out at six and the police walk the towpath at seven. Whatever's on the wall at eight is what the lower town reads today.*

| Way | Stat | Hint | Risk |
|---|---|---|---|
| Before the draymen, in the dark | AGI | Nobody about, nobody to see. One bay at a time. | the mission's (15 %) |
| At the gate, with the draymen watching | STR | Rip them down with the yard watching and let them say so. | run-in **25 %**, opinion the same |

- Success — *A hundred yards of bare brick* — The wall is bare from the gate to the bend by the time the draymen come out, and the towpath has nothing to read but the brewery's name. The Collective's man comes at nine with a bucket and finds he's the morning's story.
- Partial — *The gate end* — You get the gate end before the yard lamp comes on and you leave by the towpath. Half the wall is bare. The other half is being argued over at the lock.
- Failure — *The paste is good* — Wet night, good paste, and posters that come off in strips the size of your hand. You get two bays done before the draymen are at the gate and you have to walk out past them with red hands. The posters stay up.

**Break up the tenants' meeting on Weavers' Row** (`ashford.weavers-row.tenants-meeting`) · disruption · 15 E · Level 8 · difficulty 16 · Rank 3 · target `alliance` · pool `party-thug`, `city-police`
*The Alliance holds its tenants' meeting in the yard on Weavers' Row at seven: forty people on the steps, a solicitor's clerk with the rent cases and Mr Grey's man at the gate with the register. The yard has one lamp, two entries, and a landlord's question the clerk has been dreading all week.*

| Way | Stat | Hint |
|---|---|---|
| Shoulder through the gate | STR | Past Mr Grey's man and into the yard. They will notice. |
| Put the yard lamp out | AGI | A dark yard, a crowd that scatters, and nobody to say who did it. |
| Ask the landlord's question | INT | Stand at the back and take the meeting off the clerk with one question. |

- Success — *The yard empties* — Forty people on the steps, and by half past seven thirty of them are on the Row arguing with each other about the rent cases instead of listening. The clerk shuts his file. A woman at a window asks for your flyer, to be fair.
- Partial — *Half the yard* — You take the entry end with you and Mr Grey's man holds the rest. It ends ragged, with the yard split and the cases half read. Half a meeting is half a meeting.
- Failure — *The gate shuts* — Mr Grey's man saw you on the Row before you were at the gate. The meeting goes quiet, moves to the far steps, and finishes with the gate shut. You stand in the entry with your question and nobody to ask it.

**Spike the duplicator at the Rooms** (`ashford.assembly-rooms.spike`) · sabotage · 20 E · Level 10 · difficulty 18 · Rank 3 · target `alliance` · pool `party-thug`, `city-police`
*The Alliance's duplicator runs in the committee room at the Assembly Rooms at night, and five hundred sheets are out by morning. The railings are low, the porter's round is at eleven, and a tradesman with a box of parts walks in at the side door. One bent drum and the Rooms are quiet for a week.*

| Way | Stat | Hint |
|---|---|---|
| Over the area railings at night | AGI | The area window, the dark room, the drum. In and out before the round. |
| Walk in as a tradesman | CHA+INT | A box, a cap, a grievance about the stencils. Nobody questions a man with a box. |
| Learn the porter's round first | INT | Know the Rooms' hours. Then the committee room is yours for twenty minutes. |

- Success — *The drum won't turn* — The drum is bent a hair, the ink's in the gearing, and the stencil clamp is in your pocket. It will print again in a week, when someone finds a clamp. Tomorrow's five hundred sheets are tonight's one ruined one.
- Partial — *Half a job* — You get the ink in the gearing before a light goes on in the hall and you leave by the area. The machine will print tomorrow, badly, and ghosted. Half the stack goes out. Half is half.
- Failure — *The room is locked* — The porter changed his round. The committee room is locked, the area has a lamp you didn't know about, and you spend twenty minutes in a coal store listening to a man whistle. The duplicator runs at dawn.

**Lift the constituency roll** (`ashford.assembly-rooms.roll`) · theft · 15 E · Level 10 · difficulty 18 · Rank 3 · target `alliance` · pool `party-thug`, `city-police`
*Every Alliance member in Ashford is a line in a roll on the agent's desk at the Assembly Rooms: name, street, subscription paid. The agent's clerk takes his dinner at one and leaves the window open. Your branch would pay well for a copy, and the Rooms would pay more to know who took it.*

| Way | Stat | Hint |
|---|---|---|
| The clerk's window at dinner time | AGI | Twelve minutes, a pencil, and the window he leaves open. |
| Charm the clerk into a copy | CHA+INT | He's bored and underpaid and nobody at the Rooms ever asks him anything. |

- Success — *Four hundred names* — Four hundred names, streets and subscriptions, copied in twelve minutes in a hand you can read. The roll goes back on the desk a quarter-inch from where it was. Your branch pays on sight and asks no questions.
- Partial — *Half the roll* — You get to M before the clerk's step is on the stair and the window has to be the way out. Two hundred names is two hundred names. The branch pays half and asks about the rest.
- Failure — *Dinner is early today* — The clerk eats at his desk today. You stand in the corridor with a pencil and a story about subscriptions until he asks which street, and then it's time to leave. The roll stays on the desk.

### 5.4 Irongate

**Speak to the lunch-hour rally on the Forecourt** (`irongate.forecourt.rally`) · speech · 15 E · Level 10 · difficulty 20 (the ladder's 18 for Level 10, +2 in the capital, §4.3; every Irongate mission is 20) · everyone · pool `street-enforcer`, `strike-picket`, `party-thug`
*At one the whole Quarter eats on the Forecourt, and on Thursdays somebody always has the plinth. Today it's yours if you want it: a thousand clerks, the Parliament steps for a backdrop, a constable who looks bored, and a rival crew at the back who have come for the heckling.*

| Way | Stat | Hint |
|---|---|---|
| From the plinth, to the whole Forecourt | CHA+INT | The ministries will not like it. A thousand clerks will. |
| From the Parliament steps, over their heads | STR | Climb them, hold the rail, and shout over the trams. |
| The messengers' room first, then the plinth | best | Find out what the Quarter is angry about before you tell it what you'd do. |

- Success — *A thousand lunches, one voice* — The Forecourt stops eating. The cuts, the estimates, who decides. A deputy heckles from the steps and the crowd laughs on your side; the rival crew at the back go for a sandwich. By two, the Quarter has an opinion it didn't bring to lunch.
- Partial — *The bell cuts you off* — You get through the cuts before the bell for the vote goes and the steps empty of everyone who matters. A few hundred clerks stay to hear the end. One asks which party. You tell him.
- Failure — *Rain off the dome* — The rain comes off the dome at ten past one and the Forecourt goes under the arcades without you. You finish for the statue and the rival crew, who enjoy it. Same plinth next Thursday, if it's dry.

**Watch the Grand Hotel's lobby after midnight** (`irongate.grand-hotel.lobby-watch`) · surveillance · 12 E · Level 10 · difficulty 20 · everyone · pool `city-police`
*The Grand's lobby is where deputies dine and lobbyists wait, and after midnight it is where the ones who don't want to be seen together are seen together. There's an armchair behind the palms with a view of the lift, and a hall porter who knows every face in the capital.*

| Way | Stat | Hint |
|---|---|---|
| The armchair behind the palms | INT | A paper, a coffee you don't drink, and the lift in view. The hall porter is against you. |
| The service stairs | AGI | Closer, quieter, and no explanation if the night manager finds you there. |

- Success — *Who came down at one* — At one the lift brings down a minister, a man who isn't his secretary, and a lawyer from Chancery Row who leaves by the side door. Three names and a time go in the notebook. The hall porter never looks up.
- Partial — *The porter's eye* — The hall porter looks at your coat at half past twelve and keeps looking. You get one name off the lift before it's wiser to leave by the dining room. Something was arranged tonight; you'll need another night to say what.
- Failure — *A quiet night at the Grand* — Two hours behind the palms and the lift brings down nobody but a drunk deputy and his hat. The night manager asks if sir is a guest. Sir is not. You leave with an empty page and the porter's memory of your face.

**Tear down the rivals' posters on the tram shelters** (`irongate.tram-junction.shelters`) · vandalism · 10 E · Level 10 · difficulty 20 · Rank 3 · target `leader` · pool `street-enforcer`, `strike-picket`, `party-thug`, `city-police`
*Somebody papered every shelter at the Junction overnight and every tram queue in the capital is reading them. Eight shelters, a bucket and a brush are all it took them; a scraper and ten minutes is all it takes you. The inspectors' hut has a window on the platforms and the first tram is at five.*

| Way | Stat | Hint | Risk |
|---|---|---|---|
| Before the first tram, platform by platform | AGI | Nobody about, nobody to see. One shelter at a time. | the mission's (15 %) |
| In the morning rush, before the queues | STR | Rip them down with the queues watching and let them say so. | run-in **25 %**, opinion the same |

- Success — *Eight bare shelters* — Every shelter at the Junction is bare glass by the time the first tram comes through, and every queue in the capital reads the timetable instead. Their man comes at nine with a bucket and finds he's the morning's story.
- Partial — *Five platforms* — You get the five near platforms before the inspectors' hut lights up and you leave by the Market Square side. Five shelters are bare. The other three are being argued over in the queues.
- Failure — *The paste is good* — Wet night, good paste, and posters that come off the glass in strips the size of your hand. You get one shelter done before the inspector's lamp comes down the platform. The posters stay, and the Junction has your face.

**Break up the rival meeting at the Station Buffet** (`irongate.station-buffet.meeting`) · disruption · 15 E · Level 10 · difficulty 20 · Rank 3 · target `leader` · pool `street-enforcer`, `strike-picket`, `party-thug`, `city-police`
*The party leading this district holds its night meeting in the Buffet's back room at midnight: thirty porters and tram crews, a committee man on a chair with the lists. The fuse box is behind the counter, the yard door is on the latch, and the question the chair can't answer is about the fare.*

| Way | Stat | Hint |
|---|---|---|
| Shoulder through the back-room door | STR | Thirty men with their cups down. They will notice. |
| Pull the fuse behind the counter | AGI | A dark room, a crowd that scatters, and nobody to say who did it. |
| Ask about the fare, loudly | INT | Stand in the doorway and take the meeting off him with one question. |

- Success — *The back room empties* — Thirty men at the tables, and by half past twelve twenty of them are on the platforms arguing with each other about the fare instead of listening. The man on the chair gets down. A tram conductor asks for your flyer, to be fair.
- Partial — *Half the tables* — You take the door end with you and the committee man holds the rest. It ends ragged, with the room split and the lists half read. Half a meeting is half a meeting.
- Failure — *The counterman shuts the door* — The counterman saw you at the arch before you were at the door. The meeting goes quiet, moves to the far tables, and finishes with the door shut. You stand under the arch with your question and nobody to ask it.

**Count:** speech 4 · surveillance 4 · vandalism 4 · disruption 4 · sabotage 3 · theft 3 = **22** (Coalport 6, Duskwall 6, Ashford 6, Irongate 4). Every home city offers its own members two legal missions and one against its stronger rival, and offers a visitor three against the home faction; the capital's four are for everyone and point at whoever leads the district. The ways across the catalogue: STR 16, AGI 22, INT 14, CHA+INT 13, best 4: the Agility builds, who had two propaganda actions per city until now, have the most to do in this slice, and every mission has a way that is not Charisma.

---
## 6. Heat (GDD §6.4, pinned)

### 6.1 The numbers

| | |
|---|---|
| **Range** | 0–100, a whole number |
| **Rises with** | Missions by type (§4.2: surveillance +5, vandalism +6, disruption +8, theft +10, sabotage +12), on every outcome; **×2 on rival ground** (§11); the parcel card's Partial +10 (slice 4's stub, now live); a failed *Pay them off* +10 (§10.3); a checkpoint's *They write your name down* +10 (§11.4) |
| **Cools** | **5 an hour**, continuously, lazily (stored value and timestamp, computed on read); from 100 to 0 in 20 hours; never below 0. The *Customs Strike* Issue effect raises cooling by half (§12.1); the rate is the **residence city's**, wherever the player stands (the Rested cap's rule, §23.1 #8) |
| **Never** | Heat never costs Iron, XP, Party XP or an item; it is attention, not a debt. It never changes the odds of a check (§8.4): it changes the run-in chance and the caught check |

### 6.2 The four states and what they do

| Heat | State | Effect in slice 5 |
|---|---|---|
| 0–24 | **Cool** | Nothing |
| 25–49 | **Noticed** | Run-in chance **+5 %** on missions; caught check **+5 %** (on top of the half-Heat term); **the police join the opponent pool** (§10.2) |
| 50–74 | **Hot** | Run-in **+15 %**; caught **+15 %**; the police in the pool; **a caught check that lands means the cells** (§7.2); the paper may name you (§14: `hl.*.seen`) |
| 75–100 | **Wanted** | As Hot, and **a Failure on an illegal mission means the cells without a roll**; *high-society venues* are a later slice (nothing in slice 5 is barred by Heat) |

The state is evaluated at the moment of the roll, after the mission's own Heat is added: a *Cool* player at 20 who takes +8 is *Noticed* for that mission's caught check. That is the GDD's "plus half your Heat" read honestly: the attention you just drew counts.

### 6.3 Where the player sees it

- **The HUD** shows *Heat 32 · Noticed* **only when Heat is above 0** (as Political Capital shows only above 0): a quiet player never sees the word. Tap the label: the help note (`slice-5-screens.md` §2.3). The state word is in the failure colour from *Hot*.
- **The desk** in the paper carries a *Heat* row when above 0 at the edition: *Heat: Noticed (32), cooling · Cool by 20:40*.
- **The result modal** carries a knock-on line on every mission with Heat: *Heat +8 → 32 · Noticed · cools by 20:40*; the first time a player crosses into *Noticed*, *Hot* or *Wanted*, a one-line card in the modal says what it means (the Reputation card's slot): *NOTICED · The police have started to take an interest. Run-ins are likelier and a mark on your record is easier to earn. Heat cools five an hour.*
- **The Me tab** has a *Heat* row with the state, the number and the cooling time, and under it the record (§7.3).

---

## 7. The caught check and the record (GDD §11, pinned)

### 7.1 The caught check

Rolled once on every **illegal** mission (vandalism, disruption, sabotage, theft) **that did not come off clean: on a Partial or a Failure, never on a Success** (a clean job leaves no name; GDD §11.2 said every illegal action, and is changed here: with a check on every outcome the model's daily illegal player was Notorious in four days and could never fade, `docs/economy.md` §19.4), after the run-in (and not at all after a run-in lost: the infirmary or the cells has already cost enough):

> **Caught chance = base by type + Heat ÷ 2 + the state's bonus − Agility ÷ 2**, whole numbers rounded down, kept between **2 %** and **95 %**.

The base is §4.2's (vandalism 8, disruption 10, theft 15, sabotage 20); Heat is the value after the mission's own gain (and after a failed *Pay them off*'s +10, which came first: the attention you just drew counts); the state's bonus is *Noticed* +5 / *Hot* +15 / *Wanted* +15 (§6.2); the Agility term is the §11.2 "AGI modifiers", pinned as **one point per two Agility** (AGI 5: −2; AGI 20: −10; AGI 30: −15, which is the §8.3 milestone's figure arrived at by the same road). A *Repeat offender* adds **+5** (§11.3's "police encounters +5 %" applied here and to the run-in both). On rival ground the base is **doubled** with the Heat (§11.1).

The roll is never shown. The ticket's risk line says *if caught, a mark on your record*; the result says *Your name was taken* or nothing.

### 7.2 What being caught does

| State when caught | What happens | The player reads |
|---|---|---|
| **Cool** or **Noticed** | **Your name is taken:** the type's marks go on the record (vandalism 1, disruption 1, theft 2, sabotage 3). The mission's result stands | Stamp unchanged; a knock-on line *The police took your name · 1 mark on your record (On file)* and, on the first mark, a one-line card explaining the record |
| **Hot** or **Wanted** | **Arrest:** the marks go on, and the player is sent to **the cells** (§8). The mission's result stands (you did it; they came for you after) | Stamp **Taken in**; the modal's one button *To the cells* |
| **Wanted**, and the mission was a Failure | Arrest without a roll (§6.4) | the same |
| A run-in with the **police** lost | The cells, with the type's marks; no caught roll (§10.3) | Stamp **Taken in** |
| **A second arrest within seven City Days** | The second arrest's marks become **3** (serious) whatever the type (§11.2) | *Second time this week: three marks* |

### 7.3 The record

The player reads it as **your record**. Marks are points; the GDD's level names are kept except one: §11.3's **Known** becomes **On file**, because *Known* is the Reputation ladder's third rung and the two would sit on the same Me tab (`docs/GDD.md` §11.3, edited).

| Marks | The player reads | Effect in slice 5 |
|---|---|---|
| 0 | **Clean** | None |
| 1–2 | **On file** | **−10 % Iron from missions** (tier 2 and up; tier 1 untouched) |
| 3–5 | **Repeat offender** | **−20 % Iron from missions** · **+5 % on run-ins and the caught check** |
| 6+ | **Notorious** | **−30 % Iron from missions** · **bail doubled** (§8.2) · **barred** from `court` and `university` places and from the Alliance's HQs (every ticket there reads *Not with your record*) |

Deferred with their systems: *some venues need +5 CHA* and *clothing +15 %* (the Wardrobe, slice 8); *−5 % personal vote appeal* (slice 7's national vote). The Iron line is a receipt line like Rested's (*Iron +60 · −6 your record (On file)*).

**Clearing marks** (§11.4): **minor marks expire 14 City Days after the last offence** (a mark of 1; moderate and serious marks, from theft and sabotage, do not fade in slice 5: §11.4's bribes, which clear them for Iron, are a slice-8 Black Market service, and Political Protection is Rank 4's); **any mark can be struck off for 30 Political Capital** on the Me tab's record row (*Have a mark struck off · 30 Political Capital*, one tap, the oldest mark first; a modal with the stamp *Struck off*). The Rehabilitation Act is slice 7's.

**Where it shows:** the Me tab's *Your record* row (*Clean* / *On file · 2 marks · one fades on Thursday*), with the strike-off button; the paper's desk when above *Clean*; and the mission ticket's Iron tag when the penalty applies. Nowhere else: a record is private in the MVP (the Dossier makes it public knowledge in slice 8's fiction, not slice 5's).

---

## 8. The cells (GDD §19.2, pinned)

### 8.1 Getting there

A player is **taken in** by: a caught check that lands while *Hot* or *Wanted* (§7.2); a Failure while *Wanted*; a run-in with the police lost (§10.3). Never by a tier-1 action at home, never by a legal mission unless you lose a run-in with the police (a watch's pool is the police, and the police join every pool from *Noticed*; such an arrest carries the type's marks, none for a speech, a watch or a rival-ground tap, and an arrest with no marks never escalates a later one), never by anything a player did not choose to risk. A loss to the police sets Health to 30, as an admission does (§23.1 #3–#4).

The cells are **the police station of the city the player is in**: Harbour Police (Coalport), the Lock-up (Duskwall), the Police Station (Ashford), Police Headquarters (Irongate; its kind stays `ministry`, and the cells screen's art is the `jail` scene by screen, not by kind). The place's quarter opens for the character if it wasn't (§2.1).

### 8.2 The sentence and bail

| | |
|---|---|
| **Sentence** | **10 minutes + Heat ÷ 2 minutes**, with Heat as it stands at the arrest, **at most 60**; **×1.5 on rival ground**, still at most 60 (§14.12 "longer sentences"). A *Hot* player at 58: 39 minutes; on rival ground 58 |
| **Bail** | **100 Iron + 50 per mark on the record** (after the arrest's marks), **×2 for a Notorious record** (§11.3), **×2 on rival ground** (§14.12), **×½ for Alliance members anywhere** (Legal Aid, §19.2); rounded to the nearest 10. Clean, at home: 100; On file with 2 marks: 200; Notorious with 6 marks at home: 800; the same on rival ground as a Collective member: 1,600; as an Alliance member: 800 |
| **Leaving** | Pay bail (one tap, *Pay bail · 200 Iron*), or wait: at the end of the sentence the cell door simply opens (lazily: any read at or after `until` releases). **A faction mate posting bail** is slice 6 (`jail.bailPostedBy` exists in the document; the screen says nothing of it yet) |
| **Afterwards** | **Heat is set to 25** (§19.2) whatever it was, which reads as *Noticed* and cools from there; the player stands at the police station's pin with the sheet open; on rival ground they are **put on the train home** instead (§11.5) |
| **While inside** | No Energy actions, no training, no travel, no missions. **Political acts of the residence work** (the vote, backing, the council's vote: the paper and the Election card are readable). Energy regenerates and Rested banks as always; the wage lands; Heat cools. One thing to do in the cell: *Listen to the cells* (a tier-1 intelligence tap, 3 Energy, 14 / 7 XP, 6 / 3 Iron; a win for Reputation here like any other). Its Dossier entry and the recruiting of prisoners are slice 8 and later |

The cells never take anything a player owns, never stop a timer that pays, and never need the player present to end. A player who closes the app in the cells and comes back tomorrow is free, at Heat 25 or less, with the morning's paper reporting it (§14).

### 8.3 The cells' voice

The duty officer is a civic policeman of the republic, not a party's man (policy §7.3); he is bored, exact and not unkind. The screen's lines are in `slice-5-screens.md` §6.

---

## 9. The infirmary and Health (GDD §6.1, §19.1, pinned)

### 9.1 Health

| | |
|---|---|
| **Max** | 100 at Level 1 and +5 for every level gained, 100 + 5 × (Level − 1) (Level 6: 125; Level 10: 145) |
| **Regen** | **10 HP per 10 minutes**, lazy, from the moment it falls |
| **Lost through** | Winning a fight (§10.3: their power × 0.8 ± 20 %, less your armour), and nothing else in slice 5 |
| **At 0** | Admitted to the infirmary |
| **Where it shows** | **The HUD, only while below full** (the Political Capital rule: a player who never fights never sees a Health bar); the Me tab always (*Health 125 / 125*); the encounter modal (*Health 96 / 125*); the result modal's knock-on line after a fight (*Health 125 → 109 · full again by 14:40*) |

### 9.2 Admission

Losing a run-in to a party opponent (or any loss not to the police) sets Health to 0 and **admits** the player to **the infirmary of the city they are in**: the Infirmary (Coalport), the Infirmary (Duskwall), the County Infirmary (Ashford), St Agnes (Irongate). The quarter opens for the character if it wasn't. The mission's held result drops to Failure's small XP (§4.6).

| | |
|---|---|
| **On admission** | Emergency treatment: **Health to 30** at once |
| **The stay** | **20 minutes** (lazy: any read at or after `until` discharges the player at whatever Health the regen has reached, 30 + 20 = 50 at least) |
| **Full recovery** | *Walk out well · 5 Energy · 100 Iron*: Health to full, out at once |
| **Early discharge** | *Discharge yourself · 5 Energy*: out at once at **half of max Health** (or the current value if higher) |
| **While inside** | As the cells (§8.2): no Energy actions, training or travel; political acts and the paper work; regen, Rested, the wage and Heat's cooling run. One thing to do on the ward: *Talk to the ward* (a tier-1 intelligence tap, 3 Energy, 14 / 7 XP, 6 / 3 Iron) |
| **Later** | Visits from faction mates (+10 HP and 5 minutes off, slice 6: `hospital.visits[]` exists in the document); the Antidote and the Recovery Boost (buffs, slice 8); who controls the city changing the price (slice 7, with control's effects) |

The infirmary costs nothing unless the player chooses to pay to leave; the twenty minutes are opportunity. Nothing is lost by being there: the GDD's "the hospital is a place to play" is kept small (the paper, the vote, the ward) until slice 6 and 8 give it company.

### 9.3 The matron

The infirmary's voice is its matron (the portrait `nurse.png`, catalogued as `portrait.matron`; one person for all four infirmaries, since nobody meets two). Dry, brisk, unimpressed by politics. Her lines: `slice-5-screens.md` §7.

---

## 10. Encounters: a run-in (GDD §20, pinned)

### 10.1 When one happens

A **run-in** is rolled once after a mission's check (§4.6) and once per tap on rival ground's tier-1 actions (§11.2). Its chance:

> **run-in % = the type's base (§4.2), ×2 on rival ground for a mission (a tier-1 tap on rival ground is 15 flat, never doubled; §23.1 #2) + the Heat state's bonus (Noticed +5, Hot +15, Wanted +15) + 5 for a Repeat offender or worse + 10 if *Watched* today − 10 if *Warned* today**, kept between 0 and 90.

So a Cool player at home sees 5 % on a speech, 10 % on a watch, 15–30 % on the illegal types; the same player *Hot* on rival ground sees 75 % on a disruption. The ticket's risk word (§4.7) is this number's band.

### 10.2 Who it is

The mission names its **pool** (§5); the server **drops any opponent of the actor's own faction**, **adds the city police when Heat is *Noticed* or above** (and the police are then picked **half the time**, the pool the other half), and picks uniformly from what is left; an empty pool is the police. Opponents are content (`opponents[]`), with the §20.2 numbers:

| Id | The player reads | Side | Power | AGI | Wits | Pay them off | Portrait |
|---|---|---|---|---|---|---|---|
| `street-enforcer` | A Vanguard street enforcer | Vanguard | 22 | 10 | 10 | 60 Iron | new (§21) |
| `vanguard-doorman` | The doorman at Beacon House | Vanguard | 35 | 9 | 12 | 150 Iron | new |
| `strike-picket` | A Collective strike picket | Collective | 25 | 12 | 11 | 80 Iron | new |
| `branch-inspector` | A Collective branch inspector | Collective | 17 | 11 | 16 | won't be bought · **your Fight odds −10 %** | new |
| `party-thug` | An Alliance party heavy | Alliance | 19 | 10 | 10 | 50 Iron | new |
| `city-police` | A constable of the city police | the republic | 30 | 12 | 14 | 300 Iron | `kessler.png` (Inspector Kessler's face stands for the force; the named inspector with his own values is slice 8's) |

**Scaling** (§20.2): power **×1.1 on a tier-2 mission** (+10 % per tier above 1) and **+4 on rival ground**, applied to power only. The Secret Police (Level 20+, Vanguard-held cities) are not in slice 5.

### 10.3 The one choice

The encounter modal (`slice-5-screens.md` §5) shows the opponent's portrait, their name and one line, your Health, and four rows, each with its odds word and, where it costs, its price:

| Row | The player reads | Odds (§20.1) | If it works | If it fails |
|---|---|---|---|---|
| **Fight** | *Fight · Fair odds · Strength* | **50 % + 3 % × (your power − their power)**, 5–95. Your power = **STR × 1.5 + armour ÷ 2** (slice 5: every clothing item's armour is its tier's §20.3 value, Tier I = 4, so +2; weapons and bodyguards are later) | You win: the held result is paid; **+20 XP**; **if you were at full Health when the run-in began** (before any row; a failed Run's damage does not lose it), **+10 % on the mission's XP and Party XP** (*Won at full strength*); you lose **their power × 0.8 (±20 %) − 4** Health, at least 0, and never below 1 Health (a win never admits you, §23.1 #5) | **Loss**: Health 0, the infirmary (§9); **against the police, the cells** (§8), with the mission's marks |
| **Run** | *Run · Long shot · Agility* | **(your AGI ÷ their AGI) × 60 %**, at most 95 | You get away: **+10 XP**; the held result drops to Failure's small XP ("you dropped it"); Heat as normal; no caught check | **Extra damage** (half a win's loss) and the fight goes ahead at **−10 %**, resolved at once |
| **Talk your way out** | *Talk your way out · Long shot · Charisma* | The §8.4 formula: **50 % + 4 % × (worn CHA − their Wits)**, 5–95 | They let you go: **+10 XP**; the held result is paid | They get angrier: the fight goes ahead at **−10 %**, resolved at once |
| **Pay them off** | *Pay them off · 60 Iron · nearly always works* | **90 %** when they can be bought; the row reads *Won't be bought* and is disabled for the branch inspector | They look away: the held result is paid; **Heat unchanged**; the Iron is gone | The Iron is gone, **+10 Heat**, and the fight goes ahead at the full odds, resolved at once |

One tap is the whole encounter: a failed Run, Talk or Pay rolls the fight in the same transaction and the result modal tells the story in order (*You tried to run; he was faster. You fought. You lost.*). The §8.4 reason line follows under a row that did not come off (*Your Agility is low for this. Raise it at Harbour Quays.*; a new cause for a fight, `power`: *You were outmatched. Strength is what counts in a fight; a coat with some weight to it helps.*).

### 10.4 Leave it to luck (auto-resolve)

A fifth, text-only row, **Leave it to luck**, picks **the free row with the best odds** (Fight, Run or Talk; never Pay) and resolves it: the GDD's one button. **The same choice is made for a player who closes the tab**: an encounter is stored `pending` on the character; **the first read after five minutes, or the day's end if sooner**, resolves it with that rule as of that time, and the result modal waits (the orders-complete pattern); the player's own choice wins while it is pending (ADR 0032, §23.1 #17). So a run-in never holds a player hostage to a popup, and a player who prefers never to choose can always let it play.

### 10.5 On rival ground's tier-1 actions

The same modal, the same four rows. **Fight won, Talk or Pay: the row's result stands. Run or a loss: the row drops to Partial** (a tier-1 action never fails, §13.1); a loss still means the infirmary (or the cells). Rival-ground tier-1 is **×1 only** (§11.2), so a run-in is always about one tap. The opponent comes from the city's `runInPool` (Duskwall: the street enforcer and the doorman; Coalport: the strike picket and the branch inspector; Ashford: the party heavy), with the police rule on top; a loss to the police there is the cells with no marks. **Training and the held taps never roll a run-in** (§23.1 #10–#11).

### 10.6 The texts

Each opponent has six short lines in content (≤ 120 characters each), used by the encounter modal and the result modal:

| Opponent | appears | you won | you lost | you ran | you talked | you paid |
|---|---|---|---|---|---|---|
| Street enforcer | A man in a flat cap steps off the kerb and asks what party you're with. He knows. | He goes down on the setts and stays there, swearing. You walk on, not fast. | The setts come up to meet you. The last thing you see is his boots. | You're round the corner before he's off the kerb. He shouts your party's name after you. | "Wrong man," you say, and mean it, and he almost believes you. He lets you go, slowly. | He takes the notes without counting and steps back onto the kerb. "Didn't see you." |
| The doorman at Beacon House | The doorman fills the doorway. He has your face and he has all evening. | He sits down in the doorway, surprised, and lets you past. He'll remember. | He puts you down on the step without effort and goes back to his door. | You take the yard wall he's too big for. He doesn't bother to follow. | You say a name from the committee and he thinks about it long enough for you to leave. | He takes the notes and opens the door for you, which is worse than if he hadn't. |
| Strike picket | Three men come off the gate, one with a placard. "You're not from the branch." | The big one goes down and the other two decide the gate matters more. You walk. | They put you in the gutter by the gate and go back to their brazier. | You're through the gate and gone before the third one has his cap on. | "I'm from the capital," you say, with the right accent, and the picket lets you through. | The big one pockets it. "For the strike fund." They turn back to the brazier. |
| Branch inspector | A small man with a book steps out of a doorway. He's written your face down already. | The book goes in the gutter and so does he. He'll write that down too. | He doesn't hit hard, but he hits where it counts, and he had the book ready. | You leave him with his book open and the pencil still moving. | You give him a name from his own branch and watch him look for it. By the time he can't find it, you're gone. | *won't be bought* |
| Alliance party heavy | A big man with a party badge and a quiet voice asks you to step into the yard. | He goes down on the cobbles, surprised, and asks you to leave, which you do. | He's quiet about it, and thorough. You wake on the cobbles. | You're over the yard wall before he's finished his sentence. | "I'm looking for Mr Grey's man," you say, and he points you out of the yard. | He takes it with a nod and a word about not making a habit of it. |
| A constable | A constable steps under the lamp and asks for your name. He has a notebook and a whistle. | He goes down and the whistle goes with him. You've a minute before the rest come. | The whistle goes before you do, and so do you. The cells. | You're two streets away before the whistle. He has your coat, not your face. | "On my way home, constable," and the right accent, and he lets you go with a look. | The notebook closes. "Mind how you go." Three hundred Iron is the going rate. |

Content-policy check: the Vanguard's muscle is a man in a flat cap and a club's doorman; the Collective's are men at a gate with a placard and a man with a book; each opponent carries its pronoun in content (`pronoun: 'he' | 'they'`, the picket *they*) for the run-in's *did* line (`slice-5-fixes.md` §7.3); the Alliance's is a big man with a badge; the police are the republic's. No uniforms as a crowd, no militia, no ranks beyond *constable*, no weapon anywhere in the slice (the §20.3 weapon slot waits for slice 8, and the QA regex's ban on *weapon*, *gun* and *rifle* holds).

---

## 11. Rival ground (GDD §14.12, slice-5 form)

### 11.1 What opens

From **Level 10**, the nation map's rival home cities are **open**: the card reads *Rival ground · Home city of the Vanguard · 15 min · 20 Iron* with **Board · 20 Iron · 15 min**, and the lock word is gone. Nothing else gates the trip: the GDD's "spy trips" belong to months 2–3 for the ladder of play, not for the gate, and a day-5 player who takes the train to Duskwall finds out why it was locked.

### 11.2 What is different there (one table)

| | At home | Rival ground |
|---|---|---|
| **Difficulty** | 8 (tier 1), the ladder (tier 2) | **+4** on every check (§8.4). A ticket tag *Rival ground · worse odds*; the reason line *This is rival ground; everything is harder here.* |
| **Tier-1 run-ins** | none | **15 % per tap** (§14.12's 10–20, pinned at 15) |
| **×3** | yes | **no: ×1 only** (every tap is its own risk; the ticket shows one button and the stub, the `×3` absent) |
| **Mission run-ins** | the type's | **×2** |
| **Heat** | the type's | **×2** |
| **The caught check** | base + Heat ÷ 2 | **base ×2** + Heat ÷ 2 (§7.1) |
| **Party XP** | the base | **+50 % on every action and mission**, a line of its own (*Rival ground +6*); **+75 % while the city is in Unrest** (§14.11's "rival spy missions there pay more") |
| **Opinion** | persuasion from Neutral | **against the home faction** (§14.2: the swing comes from its share, half to you, half to Neutral), so your work lowers its morale; the floor at 50 holds; **capped at 2 points a day per city** across all rivals (§14.11's "rival pressure is capped per day"), after which actions pay their XP, Party XP and Iron and move nothing (the ticket reads *The town has had enough today · no opinion*). **A mission keeps its named target wherever it is played** (`slice-5-fixes.md` §10): a target that is the home faction draws from it under the cap; a target that is the third party there (an Alliance visitor tearing down the Vanguard's posters in Coalport) draws from that party, uncapped, the §14.2 floors holding |
| **Reputation** | your Standing there | the same ladder; a visitor usually stands at *Stranger* |
| **Orders** | the day's orders | the orders are home's or the capital's and cannot be done here; the orders panel says *Your orders are in Coalport today* |
| **Residence, standing for office, backing** | — | **never** (§14.12); the Election card shows the home residence's as from anywhere |
| **Jobs** | — | the Jobs cards are there; a visitor may take one (it pays no faction fifth and resets seniority; nothing stops it, nothing recommends it) |
| **The paper** | — | **your own home paper** (it is delivered wherever you are; a rival's paper in your hands would print its personal headlines in the wrong voice), with a desk row *On rival ground in Duskwall · Heat 16 · Cool* |
| **The cells** | the sentence | **×1.5**, bail **×2**, and release is **deportation** (§11.5) |
| **The infirmary** | the stay | the same; no deportation (the sisters ask no questions) |
| **The journey in** | one card in three | **always one card, from the hostile deck** (§11.4) |
| **Day flags** | — | *Watched* (+10 % run-ins today in that city) or *Warned* (−10 %) from the journey cards, until the boundary |

Being on rival ground is a choice taken by boarding a train that says *Rival ground* on it, and every rule above is a ticket tag before the tap. Nothing there takes anything a player owns.

### 11.3 Why it pays

A tier-2 disruption on rival ground pays **18 Party XP for 15 Energy** (1.2 per Energy, double a canvass at home) and moves the rival's morale **0.3 points**; it costs 16 Heat (three of them and the player is *Hot*), a 60 % run-in and a caught check that starts at 20 %. `docs/economy.md` §19.6 models the day: a rival-ground specialist earns about 30 % more Party XP than the reference day for real risk and about 150–250 Iron a day in bribes or infirmary time, and Heat's cooling (120 a day) caps the illegal work at a dozen missions a day. That is the GDD's "the most dangerous place in the game and pays the best", kept within the heavy player's envelope.

### 11.4 The hostile deck: four journey cards (GDD §14.12)

Drawn **at boarding for a rival home city, always one** (§14.10 "always an event"): the **Checkpoint** on a character's **first journey to rival ground**; *Your name is on a list* **whenever Heat is 50 or more** at boarding (it replaces the draw); otherwise one of the Checkpoint, the Informer and the Conductor without replacement until all three have been seen. The ordinary deck is not drawn on the way in; the way out is an ordinary journey (one card in three from the seven). Same shape as slice 4's cards (`JourneyEvent`), with **four new outcome effects**: `heat: ±n`, `flag: 'watched' | 'warned'`, `fxp`, `xp`; checks at the §8.4 formula at **difficulty 14** (the rival city's +4 on the slice-4 cards' 10) with the player's Standing in the destination; a card never fails (Success or Partial); nothing on a card costs Energy; Iron only where the row says. Rows show the odds word and the stat (review 2).

**Papers, please** (`jev.checkpoint`) — the first journey to rival ground always draws this one
*The train stops at the halt before the town and two customs men come down the carriage with a lamp. "Papers." The man opposite has his ready. Yours are a party card with the wrong crest on it.*

| Choice | Detail line | Outcome |
|---|---|---|
| **Show your papers** | *Your party card · it depends on your Heat and your record* (unchecked) | **Cool and Clean** — *Waved on* — He reads the card, reads your face, and hands it back. "Visiting?" You say visiting. He moves to the next seat. The crest meant nothing to him, or he's a good actor. · **Otherwise** (+10 Heat, *Watched*) — *They write your name down* — He reads the card twice and writes something in a book, slowly, so you can see him do it. "Enjoy the town." The carriage has heard. |
| **Talk your way through** | Charisma · +6 Party XP | Success — *A commercial traveller* — You're in bootlaces, and you've a sample case to prove it, which you don't open. He laughs and moves on. The man opposite says you're good. · Partial (*Watched*) — *He half believes you* — He takes the bootlaces and the case and the accent, and writes your name down anyway, to be safe. "Enjoy the town." |
| **Pay the lamp** | 30 Iron · unchecked | *The lamp moves on* — Thirty Iron folded under the card, and the card comes back without the Iron and without a word. The man opposite looks at the window. It is the oldest toll on the line. |
| *Ignore* (slept through) | | *You keep your eyes shut. They write your name down anyway.* (+10 Heat, *Watched*) |

**The informer** (`jev.informer`)
*The man who joins you at the halt talks about the weather for one stop and about parties for two. He knows which paper you're reading. He gets off where you get off, and he isn't in a hurry.*

| Choice | Detail line | Outcome |
|---|---|---|
| **Lose him at the barrier** | Agility · +14 XP | Success — *The luggage van* — You get off from the luggage van end and through the barrier in a crowd of carters. He's on the platform looking at the wrong door. · Partial (*Watched*) — *He's quicker than he looks* — You take the long way round the barrier and he takes the short one. He touches his hat at the gate. He has your face and your direction. |
| **Feed him a story** | Intelligence · +6 Party XP | Success — *A wild goose* — You give him a name, a street and a meeting at eight that doesn't exist. He gets off a stop early to be there. Somebody will wait a long time tonight. · Partial (*Watched*) — *He writes it down anyway* — He takes the story and writes it down, and writes you down beside it. He'll check. It will take him a day. |
| *Ignore* | | *You read your paper. He reads you. He gets off where you do.* (*Watched*) |

**Your name is on a list** (`jev.listed`) — only when Heat is 50 or more at boarding
*The guard comes through with a list and a pencil and stops at your seat a second too long. The next stop is the halt outside the town, a mile short of the station, where nobody checks anything.*

| Choice | Detail line | Outcome |
|---|---|---|
| **Get off at the halt and walk in** | Agility · Heat −10 · +14 XP | Success — *A mile in the dark* — Off the wrong side at the halt, over the fence and a mile of lane into the town by the back way. Nobody at the station is waiting for a man who walks. · Partial — *A long mile* — You're over the fence and into the lane before the guard has the door shut. The walk takes an hour and the lane has dogs. You arrive muddy and unlisted. (Heat −5) |
| **Brazen it out at the barrier** | Charisma · +6 Party XP | Success — *Not the man on the list* — You walk past the barrier with the carters, the right accent and no hurry, and the man with the list looks at the next passenger. · Partial (+10 Heat, *Watched*) — *They look twice* — The man at the barrier looks at the list and at you, and lets you through because he can't be sure. He's sure enough to follow. |
| *Ignore* | | *You stay in your seat. At the station a man with a list watches you off the train.* (*Watched*) |

**A friendly conductor** (`jev.conductor`)
*The conductor clips your ticket and says, quietly, that the platform by the barrier is watched on Thursdays and the one by the goods shed never is. He has a nephew in your party. He doesn't want anything. Probably.*

| Choice | Detail line | Outcome |
|---|---|---|
| **Take the warning** | unchecked · *Warned* today | *The goods shed platform* — You get off at the goods shed end with the parcels and walk into the town like a man collecting a crate. Nobody by the barrier sees a thing. A quiet day, if you keep it quiet. |
| **Buy him a drink** | 10 Iron · +6 Party XP · Heat −5 | *A nephew in the party* — Ten marks for his nephew's subscription, he says, and tells you which inn the customs men don't use. You'll know the conductor again. So will the branch. |
| *Ignore* | | *You nod and forget it. The platform by the barrier is watched.* |

### 11.5 Deportation

Released from the cells on rival ground, the player is **put on the train home**, to the residence city (Irongate for a capital resident, §23.1 #16): a journey starts (no fare, no card, the usual time) and the city is **barred to them for 24 hours** (the nation card: *Barred · until Thursday 14:20*, no Board button). The modal: stamp **Put on the train**, headline *Escorted to the station*, body in §13. Heat is 25 as after any release. Nothing else: the GDD's deportation is a door closing for a day, not a loss.

### 11.6 What is not in slice 5

Plain clothes (low CHA blending in), forged papers, safehouses (Rank 3, Heat cools there), bodyguards, night travel and recognition by fame and office (§14.12) arrive with the Wardrobe and the Dossier (slice 8) and bodyguards (after the MVP); the Secret Police with Level 20; the *disillusioned local* and *leaked document* opportunity encounters with the Dossier. Rival-ground missions that feed exposés (the rolls, the photographs) exist here as theft and surveillance and gain their Dossier payload in slice 8.

---
## 12. Issues and Party orders added

### 12.1 Five Issues (the deck grows to 24; GDD §14.6)

Two new bounded effect kinds for the DSL (ADR 0021): **`heatCoolPct`** (0…+100: Heat cools faster by that share) and **`bailPct`** (−50…0: bail in the city cheaper by that share). Both are slice-5 numbers an Issue can touch; a council rule may use them later. The slice-4 rules for two sources of one kind apply (percentages on a base each their own line; `bailPct` multiplies like `ticketPct`).

| Id | Issue | short | Where | Feeds (tagged actions and missions) | Effect for the week · the player reads |
|---|---|---|---|---|---|
| `issue.customs-strike` | Customs Strike | the customs strike | Coalport | canvass, speech at `coalport.customs-house`, `coalport.quays`; intelligence and surveillance at `coalport.customs-house` | `heatCoolPct +50` · *Heat cools half again as fast* |
| `issue.ferry-fares` | Ferry Fares | the ferry penny | Coalport | canvass, speech, propaganda at `coalport.far-bank`; canvass at `coalport.harbour-police` | `ticketPct −50` · *Train tickets from Coalport: half price* |
| `issue.timber-rates` | Timber Rates | the timber rates | Duskwall | canvass, speech at `duskwall.sawmill`, `duskwall.checkpoint`; intelligence at `duskwall.mountain-inn` | `ironPct checked +15` · *Iron from actions +15 %* |
| `issue.market-tolls` | Market Tolls | the market tolls | Ashford | canvass, speech at `ashford.cattle-market`, `ashford.wharf`; propaganda at `ashford.brewery` | `jobPayPct +10` · *Job pay +10 %* |
| `issue.cells-full` | The Cells Are Full | the cells | Irongate · Garrison Hill | canvass, intelligence at `irongate.police-hq`; speech at `irongate.gate-tavern`; canvass at `irongate.villas` | `bailPct −50` · *Bail in Irongate: half price* |

Feeds extended on existing Issues so the new places take part: `issue.harbour-rates` adds canvass and speech at `coalport.customs-house` and `coalport.far-bank`; `issue.frontier-shut` adds canvass and speech at `duskwall.checkpoint` and intelligence at `duskwall.mountain-inn`; `issue.court-backlog` adds canvass at `ashford.police`. A **mission** is tagged like an action by the same feeds (its type is matched as `speech` or `intelligence`; the illegal types match no Issue).

| Issue | Blurb (≤ 160) | Vanguard | Collective | Alliance |
|---|---|---|---|---|
| Customs Strike | The customs inspectors have downed stamps over their pay. Nothing crosses the mole, and the sheds are filling with other people's crates. | The inspectors back at the sheds by Monday, and the ringleaders named. | The inspectors' pay met. A stamp is work like any other. | An arbitrator on the mole by Wednesday, and both sides at his table. |
| Ferry Fares | The ferry company wants a penny on the crossing. The Far Bank crosses twice a day and has done its sums. | The ferry to time, to the timetable, and no penny until it runs to either. | Nobody pays the penny. A free crossing, or the men row themselves. | The company's books open at the Town Hall before any penny changes hands. |
| Timber Rates | The sawmill has cut the rate for a cord of mountain timber. The carters say they'll leave it on the hill. | The rate fixed by the district for the season, and the carters' loads in order. | Not a cord down the pass until the rate goes back up. The yard can wait. | A fair rate set by the council, published, with the mill's accounts beside it. |
| Market Tolls | The market board has doubled the toll on every beast through the gate. The county is talking about Clearwater. | Tolls fixed for a year and the board's accounts on the auction-shed wall. | No toll on a beast a family raised. The board can tax the dealers. | An inquiry into the board, in public, before any toll changes. |
| The Cells Are Full | Police headquarters has more people in the cells than cells, and the magistrate is away. The Hill has noticed the queue at the gate. | A second magistrate sitting daily, and the cells cleared in order. | Bail at a wage a porter can pay, or no bail at all. | Every case before a magistrate within a day, by law, and the Herald told the names. |

Content-policy check: the Vanguard's lines are order, timetables, registers and a magistrate; the Collective's are strikes and a free crossing; nothing is a front, a war or an uprising.

### 12.2 One Party order per faction: slot B gains the mission (GDD §13.7)

| Id | Faction · slot | Title | Matches | Target | Line |
|---|---|---|---|---|---|
| `dir.mission` | Collective · B | Take on a mission anywhere in {city} | any tier-2 mission in the residence city (`cityId: 'home'`, `kinds: ['mission']`) | 1 attempt | The branch has a job that wants more than a flyer. Any mission, anywhere in town; the rest is your business. |
| `dir.v.mission` | Vanguard · B | Take on a mission anywhere in {city} | the same | 1 attempt | Flyers are for Initiates. One mission today, any mission, and a report on my desk by tonight. |
| `dir.a.mission` | Alliance · B | Take on a mission anywhere in {city} | the same | 1 attempt | Something with a bit more to it today. Any mission in town; use your judgement, and mind the police. |

`residence: 'any'`; the title's `{city}` resolves at read to the residence city (the slice-4 fixes' m1 rule, `slice-4-fixes.md` §2), so a capital resident reads *…anywhere in Irongate*. It enters slot B's rotation from the day the character is **Level 6** (`minLevel: 6`: an order a player cannot do is worse than none; orders are faction-wide among members who can do them, GDD §13.7). The match is `kinds: ['mission']` (ADR 0031; no `tier` field). Counts attempts: any outcome.

---

## 13. Ambition chapter 2: *Settle His Debts* — *The riverside house* (GDD §17.1)

**Rules.** Requires **Level 6** (`requires: { level: 6 }`, as the slice-2 teaser says) and seven City Days since chapter 1: day 8 for the reference recruit, day 10–11 for a casual. Delivered as a Letter: the row reads **From the marker's other side** · *The riverside house* · *Chapter 2 is ready · 15 Energy*. Three steps, one check, never fails, no encounter (chapters set at home trigger none), no opinion, Rested applies; counts in *Today*, not as an attempt. **Difficulty 14, 15 Energy** (chapter 2's numbers, as *Stand where he stood*). Rewards Success **300 XP / 80 Party XP / 150 Iron**, Partial **150 / 40 / 75**, Failure **50 / 0 / 0**; keepsake `keep.ledger-page` (*A page of his ledger*, no slot, art `item.document-folder`) on every outcome. **The quiet way adds +6 Heat on any outcome** (the chapter's `heat` field on an approach): for most players the first Heat they ever see, in a story that explains it. Chapter 1's hook line becomes *Chapter 2, "The riverside house": from {date}, at Level 6*.

**Step 1** · kicker *Ambition · Settle His Debts · Chapter 2 of 12* · art: `home-hq`
The man in the good coat is at the door this time, with a figure on a card and no hurry. The marker has an address on its other side you never noticed: a house on the river road, in his hand, and three words. *What they want.*

| | Choice | Hint | Flag |
|---|---|---|---|
| A | Tell him you'll have it by Friday | A week bought with a lie. He'll be back on Friday, and so will you, with whatever's in that house. | `promised-friday` |
| B | Shut the door on him | He takes it well, which is worse. The street has seen him now. | `shut-the-door` |

**Step 2** · *The riverside house*
A boarded house on the river road, his name still on the bell. The yard gate is loose, the housekeeper next door has a key and a memory, and the whole street has seen the man in the good coat go by twice.

| Way | Check | Note |
|---|---|---|
| In by the yard, quietly | AGI vs 14 | **Heat +6**, whatever happens: *the quiet way is the police's business if anyone saw you* |
| Ask the housekeeper for the key | CHA+INT vs 14 | |
| The neighbours first, then the door | best vs 14 | |

CTA: **Open the house · 15 Energy**. For the reference recruit at day 8 (AGI 5, CHA 5 with the coat, INT about 30): 14 %, 44 % and 95 %; a casual at day 11 (INT ~18): 14 %, 36 % and 66 %. Every build has *Legwork*.

**Step 3** · the result
- Success — *A page of his ledger* — Under the floor of the back room, a biscuit tin: a ledger with the pages torn out but one, and on that one, in his hand, what he owed, to whom, and what he'd paid. More than they say. You put the tin back and the page in your coat.
- Partial — *A tin, and a page torn in half* — The tin is where the marker said, and empty but for half a page: the sum, no names. Somebody has been here first, or he tore it himself. Half a page is half an argument. You take it.
- Failure — *A boarded house is a boarded house* — The back room has been stripped to the boards and the boards to the joists. Whatever was here went before you came. You stand in the dust with the marker until the housekeeper's light goes on next door. You take the marker home.
- Knock-on lines: *Keepsake: A page of his ledger* · the Heat line on the quiet way (*Heat +6 → 6 · Cool · the first mark of attention: it cools five an hour*) · *Chapter 3, "The collector": from {date}, at Rank 3*

Every text is under 240 characters and four sentences. Chapter 3 (*The collector*: the man in the good coat comes for the page, and the first lesson in Heat and the cells) is written with the slice that follows; its requirement is Rank 3. *Clear His Name*'s chapter 2 (*The night foreman*) waits for the Dossier (slice 8), as the GDD says.

---

## 14. Headlines

The home papers gain **ten templates each**; the Herald **eight** (no `quarter-open`, since the capital has no second quarter, and no `rival-pressure`, since it has no home faction) for capital residents and visitors. The Clarion's set in full; the Sentinel's and the Gazette's with their own decks where the voice changes (the Sentinel clipped and orderly; the Gazette civic and dry); the Herald's metropolitan and dry. Ids `hl.`, `hl.v.`, `hl.a.`, `hl.ig.`. Every deck ≤ 200 characters with the longest tokens. New conditions: `levelCrossed 6` (stored), `missionFirstYesterday`, `heatState: hot | wanted` (live at the edition), `arrestedYesterday`, `releasedYesterday`, `admittedYesterday`, `recordRose`, `rivalGroundYesterday`, `deportedYesterday`, `moraleLostToRivalsYesterday ≥ 1`.

**The Coalport Clarion** (`hl.`):

| Id | Group · priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.quarter-open` | personal 2 | Level 6 reached | The Harbour Opens to {name} | Level 6. The slipway, the customs house and the Far Bank are on the map, and the first missions with them. The branch says mind the harbour police. |
| `hl.mission-first` | personal 3 | first mission yesterday | {name} Takes On the Harder Work | A first mission yesterday: {missionTitle}. The branch notes it. Missions remember how you did them; the second time is one tap. |
| `hl.seen` | personal 1 (In Print) | Heat is Hot or Wanted at the edition | {name} Seen Where They Shouldn't Be | The Clarion hears the harbour police have a name and a face. Heat cools five an hour; a quiet day would do it. |
| `hl.name-taken` | personal 2 | a mark yesterday | Police Take {name}'s Name | A mark on the record after {missionTitle}. One mark fades in a fortnight if there's no second; the branch can have it struck off for 30 Political Capital. |
| `hl.cells` | personal 0 (In Print) | arrested yesterday | {name} Spent {minutes} Minutes in the Cells | Taken in after {missionTitle}; {how} The duty officer wrote it down. Heat is back to 25; the branch says nothing. |
| `hl.infirmary` | personal 1 (In Print) | admitted yesterday | {name} Carried into the Infirmary | After a run-in with {opponent}. Twenty minutes on the ward, the matron's opinion of politics, and out. The branch sent grapes. |
| `hl.record-up` | personal 2 | the record's level rose | {name} Is {recordLevel} with the Harbour Police | {marksLine}. Iron from missions is down by {pct} % until they fade. The branch suggests a fortnight of flyers. |
| `hl.rival-trip` | personal 3 | on rival ground yesterday | {name} Spent Yesterday in {rivalCity} | Party work on rival ground pays half again, and the Clarion hears it was done. The Sentinel, naturally, hears nothing. |
| `hl.deported` | personal 1 (In Print) | deported yesterday | {name} Put on the Train Home from {rivalCity} | Released from the cells there and escorted to the station. {rivalCity} is barred for a day; Coalport is not. The branch has a chair. |
| `hl.rival-pressure` | city 1 | morale lost to rivals yesterday ≥ 1 | Rival Callers on Coalport's Streets | Morale down {lost} yesterday to visitors from the other parties. The streets answer the door to whoever knocks; knock first. |

`{how}` is one of *the police took the name while Hot.* / *a Failure while Wanted.* / *a run-in with the police lost.*, and when the stay has no act behind it (the dev panel's *Cells now*) **`{how}` is *no reason was given.* and `{missionTitle}` is *a word with the police***; `{recordLevel}` is ***On File*** / *a Repeat Offender* / *Notorious* (title case inside a title-case headline: *{name} Is On File with the Harbour Police*; **4 Oct 2026**, was *On file*); **`{marksLine}`** is ***One mark*** for a single mark and ***{n} marks*** otherwise (4 Oct 2026; was `{marks} marks`, which printed *1 marks*); `{opponent}` the opponent's label. **Three decks shortened 4 Oct 2026** (`hl.cells`, `hl.a.cells`, `hl.a.name-taken`) so that the longest mission title (48 characters, *Break up the rival meeting at the Station Buffet*) and the longest `{how}` keep them whole under 200: filled they are 173, 185 and 185.

**The Duskwall Sentinel** (`hl.v.`), decks: *Level 6. The checkpoint, the inn and the sawmill are on the map, and the first missions with them. Beacon House expects discipline at the lock-up.* · *A first mission yesterday: {missionTitle}. Noted. The second time is one tap.* · *The Sentinel hears the lock-up has a name. Heat cools five an hour. A quiet day is expected.* · *A mark on the record after {missionTitle}. It fades in a fortnight; the committee can have it struck off for 30 Political Capital. It would rather not.* · *Taken in after {missionTitle}; {how} Heat is back to 25. The committee has read this and will say so.* · *After a run-in with {opponent}. Twenty minutes under the spire and out. The committee sent nothing.* · *{marksLine}. Iron from missions down by {pct} % until they fade. The committee's view: a fortnight of flyers, in order.* · *Party work on rival ground pays half again. The Sentinel records that it was done, and expects a report.* · *Released from the cells there and put on the train. {rivalCity} is barred for a day. Report to Beacon House on arrival.* · *Morale down {lost} yesterday to callers from the other parties. The streets are to be in good order. Knock first.* Headlines as the Clarion's with *the Lock-up* for *the Harbour Police* and *Beacon House* for *the branch*.

**The Ashford Gazette** (`hl.a.`), decks: *Level 6. The wharf, the brewery and the cattle pens are on the map, and the first missions with them. Mr Grey suggests the legal ones.* · *A first mission yesterday: {missionTitle}. The Rooms are pleased. The second time is one tap.* · *The Gazette hears the police station has a name and a face. Heat cools five an hour; the Rooms recommend a quiet day and a book.* · *A mark on the record after {missionTitle}. It fades in a fortnight; the Rooms can strike it off for 30 Political Capital, and would rather not need to.* · *Taken in after {missionTitle}; {how} Legal Aid halved the bail; the Rooms would rather not mention it. Heat is back to 25.* · *After a run-in with {opponent}. Twenty minutes on the county's ward and out. The Rooms sent a book.* · *{marksLine}. Iron from missions down by {pct} % until they fade. Mr Grey: "Flyers. A fortnight of them."* · *Party work on rival ground pays half again. The Gazette notes it was done, and asks for an open mind on the way home.* · *Released from the cells there and put on the train. {rivalCity} is barred for a day. The Rooms have the kettle on.* · *Morale down {lost} yesterday to callers from the other parties. The Gazette suggests answering the door first.* Headlines as the Clarion's with *the Police Station* and *the Rooms*.

**The Irongate Herald** (`hl.ig.`), decks: the capital has no second quarter (no `quarter-open`); *A first mission yesterday in the capital: {missionTitle}. Missions remember how you did them.* · *The Herald hears police headquarters has a name and a face. Heat cools five an hour.* · *A mark on the record after {missionTitle}. One mark fades in a fortnight; 30 Political Capital strikes it off.* · *Taken in at police headquarters after {missionTitle}; {how} Heat is back to 25. The Herald prints names.* · *After a run-in with {opponent}. Twenty minutes at St Agnes and out. The sisters do not discuss politics.* · *{marksLine} with the capital's police. Iron from missions down by {pct} % until they fade.* · *Party work on rival ground pays half again, the Herald understands, and costs what it costs.* · *Released from the cells in {rivalCity} and put on the train. Barred there for a day.* · the Herald has no `rival-pressure` (the capital has no home faction). Headlines as the Clarion's with *Police Headquarters*.

The slice-4 `hl.*.train-open` decks gain nothing; the nation card itself says *Rival ground* with a Board button from Level 10.

---

## 15. What the player sees and does

### 15.1 The first mission (Level 6, day 2)

1. **The paper:** *The Harbour Opens to {name}*. The quarter bar has a second chip; the overview has a second outline with a name and no lock.
2. **The Shipyard's sheet:** two ordinary tickets, then *Missions* and one ticket: **Speak at the launch** · *Mission · Speech* · *Fair odds · your best, Intelligence* · *Heat +0 · A little risk*. Tap.
3. **The briefing:** three lines; three rows: *From the platform, after the bottle · Long shot · Charisma and Intelligence* · *From the gantry, among the riveters · Fair odds · Strength* · *The drawing office first, then the bank · Fair odds · your best, Intelligence*. One tap on a row: *The drawing office first · 15 Energy*.
4. **The result:** stamp *Success*, *The hull goes in to your name*, the receipt (XP +75, Party XP +12, Iron +60, opinion +0.15), the knock-on *Missions remember: next time, one tap*. Continue.
5. **The ticket now reads** *Again, the drawing office first · 15 Energy* with *Choose another way* under it.

About six taps and a minute; the first *Failure* stamp a player ever sees comes from here, with a reason line, and costs 15 Energy for 15 XP.

### 15.2 The first run-in (Rank 3, about day 10)

1. **The Far Bank:** *Tear down the Vanguard's posters on the fish quay* · *Mission · Against the Vanguard* · *Organisers and above* no longer greys it · *Fair odds · Agility* · *Heat +6 · Risky · if caught, a mark on your record*. The briefing; *Before the market, in the dark · 10 Energy*.
2. **The encounter modal** (one time in seven): a man in a good coat, *A Vanguard street enforcer*, *Health 125 / 125*, four rows with their odds words, *Pay them off · 60 Iron · nearly always works*, and *Leave it to luck* under them. One tap.
3. **The result:** stamp *Success* with the encounter's line first (*He takes the notes without counting…*), then *Bare pillars by eight*, the receipt (Iron +40 −60), *Heat +6 → 6 · Cool*. Or, on a loss, stamp *Taken to the infirmary*, the matron, twenty minutes, *Walk out well · 5 Energy · 100 Iron*.

### 15.3 Getting Hot, and the cells (whenever)

Three disruptions in a session: Heat 24. A fourth makes it 32, *Noticed* (the card in the modal says what it means); a fifth 40, a sixth 48, a seventh 56, *Hot*. The seventh comes off Partial and its caught check (10 + 28 + 15 − 2 = 51 %) lands: stamp **Taken in**, *To the cells*: the duty officer, *38 minutes · until 15:12*, *Pay bail · 150 Iron*, *Listen to the cells · 3 Energy*, the paper, the Election row. Pay, or close the app and come back. The morning's Clarion: *{name} Spent 38 Minutes in the Cells*.

### 15.4 Rival ground (Level 10, day 5 or later)

1. **The nation map:** Duskwall's pin is no longer muted: *Duskwall · rival ground · 15 min*. The card: *Rival ground · Home city of the Vanguard · everything is harder here; party work pays half again* → **Board · 20 Iron · 15 min**.
2. **The journey:** the card is always there: *Papers, please*. One tap.
3. **Arrival:** stamp *Arrived*, *Duskwall · The Fortress*, the knock-on *Rival ground: Heat doubles here, every tap can bring a run-in, and nothing you own is at risk.* The plate reads *DUSKWALL · RIVAL GROUND* with a Heat line; every ticket carries *Rival ground · +50 % Party XP · worse odds* and one button.
4. **A canvass at the Customs Market:** *Fair odds · Intelligence* (difficulty 12, no reputation); one tap; one time in seven a run-in; the receipt's Party XP line reads *+6 and rival ground +3*; the opinion line *Vanguard 70.0 → 69.98 % · morale*.
5. **Beacon House:** the members-only tickets dimmed, and under them *Missions*: *Spike the duplicator* · *Against the Vanguard* · *Heat +24 · Dangerous · three marks*; *Lift the district roll*. The way home: Duskwall's Goods Yard has no station pin yet; the nation map.

---

## 16. Session shape (pillar 7)

| Act | Taps | Time |
|---|---|---|
| A mission, first time | 3 (ticket, way, confirm) + Continue | 20 s |
| A mission, repeated | 1 + Continue | 5 s |
| A run-in | 1 (or 0: leave it to luck) | 10 s |
| The cells: pay bail | 1 | 5 s; or 10–60 minutes in the background |
| The infirmary: walk out | 1 | 5 s; or 20 minutes in the background |
| A rival-ground trip | 2 (Board, the card) + Continue | 15 minutes in the background |
| A mark struck off | 1 | 5 s |

The only two-step flow is mission → run-in, and its second step resolves itself if the player leaves. Nothing needs the player at a set time: every timer in the slice ends on its own and the paper reports it.

---

## 17. Economy

`docs/economy.md` §19: tier-2 rates against tier 1, the difficulty ladder against the modelled best stat (and Appendix C #15's closing), a reference day with missions, the Heat budget (how many illegal missions a session and a day allow before *Hot*), the expected cost of a run-in for each build, the caught check's rate of marks, the cells' and the infirmary's cost in time and Iron, the rival-ground day (+30 % Party XP for the specialist, within the heavy player's envelope), the record's Iron penalty, and the new Political Capital sink (30 a mark). **Verdict there:** no §5.2 milestone moves by more than a day for the reference player; the illegal road is faster in opinion and Party XP and slower in Iron once a record forms, which is the trade §13.3 describes; the levers are the run-in bases, the +50 % on rival ground and the daily cap, all flagged.

---

## 18. GDD edits made in this change

| Section | Edit |
|---|---|
| §0 | "Added 3 Oct 2026 (slice-5 design)" change table |
| §1.5 | Slice-5 words: *run-in*, *your record* (*Clean · On file · Repeat offender · Notorious*), *your name taken*, *the cells*, *the infirmary*, *Fight · Run · Talk your way out · Pay them off*, *Leave it to luck*, *way* for approach, *Mission · Against the {faction}* |
| §3.3 | The desk's Heat and record rows; *In Print* gains the cells, the infirmary and *seen*; a visitor on rival ground reads the home paper |
| §6.1 | Health: max, regen and loss pinned for slice 5; shown on the HUD only below full |
| §6.4 | Heat pinned: the sources' values incl. theft +10, the parcel and a failed bribe; cooling lazily at 5 an hour; the four states' slice-5 effects; the state evaluated after the mission's gain; shown only above 0 |
| §8.4 | The tier-2 difficulty ladder (14 / 16 / 18 / 20 by Level 6 / 8 / 10 / 12; Irongate +2; rival ground +4); Failure pays XP ÷ 5; the `power` reason line |
| §8.5 | Best-stat targets raised to what +1 per level and training produce (day 1 ~12, week 1 ~28, month 1 ~50, month 3 ~85, season 2 100+); a quarter point of Agility on a successful Agility way |
| §11.2 | The caught check pinned: base + Heat ÷ 2 + the state's bonus − Agility ÷ 2, 2–95 %; **on a Partial or a Failure only** (was "every illegal action"), after the run-in; surveillance has no caught check; what being caught does by state; the seven-day escalation |
| §11.3 | *Known* → **On file**; the Iron penalty is on missions (tier 2+); *Repeat offender* +5 % on run-ins and the caught check; what Notorious bars in slice 5 |
| §11.4 | Slice 5: minor marks fade in 14 days; 30 PC strikes any mark; bribes with the Black Market (slice 8) |
| §13.1 | The remembered way; no ×3 on a mission; the risk line in words; the order check → run-in → caught check → result; an unanswered run-in auto-resolves |
| §13.3 | The type table gains vandalism and theft rows and the pinned run-in, Heat, caught and mark values; surveillance no caught check; theft Iron ×2, no opinion; a mission's audience by target; `leader` in the capital |
| §14.6 | The five Issues; `heatCoolPct` and `bailPct` |
| §14.11 | Rival pressure capped at 2 points a day per home city; Unrest's "rival spy missions pay more" is +75 % |
| §14.12 | The slice-5 form: open at Level 10; the one table of differences; ×1 only; the home paper; the hostile deck's four cards; deportation as release; what waits for later slices |
| §14.13 | The second quarters' frames and places; the home-city overview with outlines and the quarter bar; the third quarters as teasers |
| §17.1 | *The riverside house* (Settle His Debts, chapter 2): Level 6, difficulty 14, 15 Energy, the rewards, the keepsake, Heat on the quiet way; chapter 3 *The collector* at Rank 3 |
| §19.1 | The infirmary pinned for slice 5: admission at 0, +30, 20 minutes, the two ways out, the ward tap; visits (slice 6), buffs and control (later) |
| §19.2 | The cells pinned: when; the sentence (×1.5 on rival ground, max 60); bail = 100 + 50 a mark, ×2 Notorious, ×2 rival ground, ×½ Alliance; Heat 25 after; the cell tap; deportation; a faction mate's bail (slice 6) |
| §20 | Pinned for slice 5: plain words; the order (the result held, the run-in decides it); a loss to the police is the cells; Run drops the result to Failure's XP; XP for a run-in; the full-Health bonus +10 %; Tier I armour 4; the pool and the police rule; *Leave it to luck* and auto-resolve on the next read |
| §21.4 | `keep.ledger-page` |
| Appendix C | **#15 closed** (the ladder and the raised targets); **#34** noted (the AGI milestones stay later; the caught check's Agility term is slice 5's); new **#47** (run-in before the result), **#48** (×1 on rival ground), **#49** (the record's Iron penalty on missions only), **#50** (bail's formula), **#51** (deportation as release), **#52** (the 2-point cap), **#53** (+50 % on rival ground), **#54** (the police half the pool from Noticed), **#55** (Known → On file), **#56** (the caught check on Partial and Failure only) |

Companion edit: `docs/economy.md` §19.

---

## 19. Questions for the architect

Each with a default so the build does not wait.

1. **Missions in content.** Suggested: a third member of the `Action` union, `Mission` (`tier: 2`, `type` from the six, `energy`, `difficulty`, `requires { level, rank, standing }`, `target?: FactionId | 'leader'`, `opponents[]`, `briefing`, `ways[] 2–3 { id, title, stats, hint, heat?, runIn? }`, `text { success, partial, failure }`, `card?: AssetId`), so a location's `actions` holds both tiers and the loader's existing checks apply; rates, Heat, run-in, caught and marks by type in `packages/rules` (`MISSION_TYPES`). A separate `opponents[]` section (§10.2 with the six lines each). Hostile cards join `journeyEvents[]` with a `deck: 'hostile'` field and the four new effects.
2. **The run-in as a pending step.** Suggested: the mission's transaction writes the held result and a `pendingEncounter { missionLogId, opponentId, seed, expiresNever }` on the character; `encounter.choose({ choiceId | 'luck', idempotencyKey })` resolves it in one transaction (the fight, Health, the infirmary or the cells, the caught check, the paid result, the final `ActionResult`); any read with a pending encounter and no choice applies *luck* first (`loadCharacter`). The client renders the mission's modal only after the encounter, from the final result, so there is one result modal per mission.
3. **Health, Heat, the cells and the infirmary as lazy timers**, as Energy: `health { value, at }`, `heat { value, at }`, `held { kind: 'cells' | 'infirmary', cityId, locationId, until, bail?, sentenceMinutes }`. Release and discharge on read at or after `until`; a tidy job is not needed (nothing happens at release the player is not there for), unlike arrival.
4. **Rival ground in `cityId`.** No new state: `cityId` is a rival home when `cities[cityId].homeFactionId` exists and differs from the character's; `placeModifiers` adds the +4, the ×2s and the +50 %. The daily cap is a counter on the city document (`rivalPressure { day, lost }`), `$inc`-guarded.
5. **Day flags** `watched` / `warned` as `{ cityId, day }` on the character; the barring after deportation as `barredFrom { cityId, until }` read by `destinationState`.
6. **The record** as `record { marks: Array<{ points, day, kind }>, arrests: Array<day> }`; the level computed on read; expiry of 1-point marks by day on read; 30 PC strike-off as a `record.strike` procedure.
7. **The overview for home cities.** `CityPage` already does outlines and the lock for the capital; a home city with two or more quarters uses the same path with `Quarter.outline` and `Quarter.opensAt { level } | { edition }`. The dev viewer draws the outlines.
8. **Odds words for the encounter rows** come from the same band function as tickets (review 2); the server returns the four chances; the client prints words. The `power` reason line is a new `cause` id.
9. **Ambition**: `Chapter.story.check.approaches[].heat?` for *The riverside house*; nothing else changes in the chapter engine.
10. **Playtest report:** missions per type per day, the share of players who took one, run-ins and their choices (and how many were *luck* by default), the loss rate, the cells and the infirmary (count and minutes waited vs paid), Heat's distribution at mission time, marks per player, rival-ground trips and their Party XP, and bail paid. The question is *exciting rather than punishing*: the numbers to watch are the loss rate on auto-resolve and how often a player who was taken in comes back the next day.
11. **Test hooks:** shorten the cells and the infirmary (`until` to now), set Heat and Health, force a run-in and its opponent, force the caught check; the e2e needs a run through mission → run-in → infirmary → discharge and mission → cells → bail, and a rival-ground arrival with the checkpoint card.
12. **The QA vocabulary test:** *Fight* and *Run* are allowed verbs; the regex's `weapon|gun|rifle` holds (no string here uses them); *constable* needs nothing (it is in neither regex) and *sergeant* is gone: the civic police's desk is *the duty officer*, slice 4's word (§23.1 #22); *enforcer*, *doorman*, *picket*, *inspector* and *heavy* are the opponent labels; *rival ground* and *run-in* are §1.5 words.

---

## 20. Content-policy check

Every string above was read against `content-policy-review.md` §7. The police everywhere are the republic's (a constable, the duty officer, the harbour police, police headquarters), never a party's; the Vanguard's muscle is a man in a flat cap and a club's doorman, its places a checkpoint the customs run, an inn and a sawmill; its stances are timetables, registers, fixed rates and a magistrate; no line says it is right (the Sentinel's *noted* and *in order* are its manner). The Collective's people are riveters, pickets with a placard and a man with a book; its stances strikes and a free crossing. *Fight* is a verb of the §20 hazard, used once per encounter and never as a frame for the contest; *run-in*, *a rival crew*, *the cells*, *rival ground* are the words. No weapon, uniform, rank, drill, patrol, mark or slogan appears; the one slogan in the slice is the Vanguard's reviewed *ORDER AND BREAD* on a poster being torn down. Nothing is a front, a war, an uprising or an enemy. The checkpoint card's customs men are the frontier's, and *Papers, please* is the republic's border, not a party's. **For QA:** the war regex's `front` matches *the front door* in the Union Hall sabotage briefing (§5.1), a door in its everyday sense like the reviewed *the front room*, and needs the same allowance; *Garrison Hill* appears once (the Issue's district) under its existing allowance; *constable* is a civic police word in neither regex and *the duty officer* carries no rank (§23.1 #22); *in front of* and *torch* are gone from every string (§23.6 #14); no other string in either document matches the war or the vocabulary regex.

---

## 21. Art needed (not generated here; the same noir lithograph style as `mvp/scenes`)

Already in the folder and used by this slice: `hospital.png` (the infirmary screen and the `hospital` kind), `jail-cell.png` (the cells screen and the `jail` kind), `news-strike.png` (the rung-4 card for the picket and the disruption missions), `ministry.png` (the customs house, the checkpoint, police headquarters), `factory-gate.png`, `docks.png`, `market.png`, `bar-anchor.png`; `kessler.png` (the constable) and `nurse.png` (the matron) from the portraits. Needed:

| # | Asset id | What it is | Format |
|---|---|---|---|
| 1 | `scene.mission-speech` | A big-crowd speech: a figure on a timber stack or a platform above a sea of caps at a yard gate, the band, the gantry | scene 2688 × 1520 |
| 2 | `scene.mission-watch` | A night's watching: a figure on a bollard on a mole, a flask, a shed door with a lamp, a lorry with no lights | scene |
| 3 | `scene.mission-posters` | Posters half torn from a pillar under an iron market roof, a scraper, strips on wet stone, dawn | scene |
| 4 | `scene.mission-sabotage` | A back room with a duplicator, ink on the floor, a bent drum, a yard window open to the night | scene |
| 5 | `scene.mission-theft` | A clerk's desk with a ledger open, a pencil, an open window with the river beyond; a coat sleeve at the edge | scene |
| 6 | `portrait.street-enforcer` | A man in a good overcoat and a soft hat, heavy-shouldered, a Vanguard badge the size of a coin, under a street lamp. No uniform, no symbol | portrait 4:5 |
| 7 | `portrait.vanguard-doorman` | A very large man in a club doorman's dark coat filling a doorway, hands folded; Beacon House's lamp behind. No uniform, no symbol | portrait |
| 8 | `portrait.strike-picket` | A docker in a cap with a plain armband and a brazier's glow, a yard gate behind. No hammer, no sickle, no star | portrait |
| 9 | `portrait.branch-inspector` | A small neat man in a mackintosh with a notebook and a pencil, spectacles, a doorway | portrait |
| 10 | `portrait.party-thug` | A big quiet man in a tweed jacket with a lapel badge, a yard wall behind, a hat in his hand | portrait |
| 11 | `portrait.duty-officer` (source `sergeant.png`) | The duty officer of the civic police: a ledger, a stove, a lamp, a 1940s Central European police tunic without insignia beyond a number | portrait |

**Done 3 Oct 2026:** all eleven are generated in the noir style and saved as `mvp/scenes/mission-{speech,watch,posters,sabotage,theft}.png` (2688 × 1520) and `mvp/portraits/{street-enforcer,vanguard-doorman,strike-picket,branch-inspector,party-thug,sergeant}.png` (880 × 1168). Checked: no symbol on any badge or armband (the duty officer's cap badge is a blank shield). Alt texts, written against the pictures: §23.5.

Nothing else: the hostile cards use the journey screen's text; the Heat and Health rows use no icon; the quarters are painted already; the keepsake uses `document-folder.jpg`. Eleven pieces, five of them the rung-4 mission cards that every later mission of the type will reuse. (The missing rung-4 card for `disruption` is `news-strike.png`, existing.) The crest rule holds for every portrait: no symbol on a badge or armband, a plain shape only.

---

## 22. Points for the user (each with the default this document takes)

1. **Rival ground opens at Level 10 with the train, with no further gate.** The GDD's ladder of play puts spy trips in months 2–3, but §14.12 gates nothing, and the slice's question needs rival ground reachable in the playtest. Default: **Level 10**; the alternative is Rank 3 (about day 10), which would hide rival ground from the first week's testers.
2. **No ×3 on rival ground** (§11.2). Default: **×1 only** (every tap is its own risk and the ticket says so). The alternative, one run-in roll per batch, favours the batch and reads as a loophole.
3. **A loss to the police is the cells, not the infirmary** (§10.3, a change to §20's "loss: hospital"). Default: **the cells** (the fiction and the slice's question both want it). The alternative is the GDD as written.
4. **The record's level name *Known* becomes *On file*** (§7.3). Default: **On file** (the clash with the Reputation ladder's *Known* is on one Me tab). The alternative is a note under the label.
5. **The second quarters open the home-city overview with the capital's outline pattern** (§2.1), which is new client work the plan did not list for slice 5. Default: **build it** (two open quarters and a teaser need a way between them that is not only the bar). The alternative is the quarter bar alone and no overview until the station quarters.
6. **The caught check fires only when a mission does not come off clean** (§7.1: on a Partial or a Failure, never on a Success), a change to GDD §11.2's "every illegal action". Default: **Partial and Failure only** (with a roll on every outcome the modelled daily illegal player was Notorious inside four days and, since marks fade only after fourteen quiet days, could never come back; with the softer rule it takes a fortnight of daily illegal work, and a week of flyers clears the minor marks). The alternative is the GDD as written, with the base rates halved to the same effect.

---

## 23. Settled for the build (3 Oct 2026; answers to `docs/tech/slice-5.md` §22.1 and §23)

The architect's defaults are accepted unless a line below says otherwise. Every change to this document's earlier sections was applied in the same change (the lines are named), so the content tests that read the tables stay in step. **Numbers that moved:** none in the economy; the Irongate missions' difficulty is 20 (a slip corrected), the run-in decide window is five minutes (new, recorded in the GDD), and a police loss on legal work is the cells (the accepted §22 point 3, now stated in §8.1).

### 23.1 The twenty-two questions

| # | Decision | Where it now lives |
|---|---|---|
| 1 | **Irongate's missions are difficulty 20**: the ladder's 18 for Level 10 plus the capital's +2 (GDD §8.4, §4.3). §5.4's "already in it" was a slip; the loader holds content to `missionDifficulty(level, role)`. At 20 the day-7 reference player (best stat ~28) sees 82 % and a day-5 one (~25) 70 %, inside the band | §5.4 (four rows) |
| 2 | **The tier-1 run-in on rival ground is 15 flat.** The ×2 is for missions. §10.1's formula is reworded | §10.1, §11.2, `economy.md` §19.6 |
| 3 | **A loss to the police is the cells on any mission and on a rival-ground tap**, with the type's marks (none for a speech, a watch or a tap). An arrest with no marks does **not** count toward the seven-day escalation. §8.1 reads *never by a legal mission, unless you lose a run-in with the police* | §8.1, §7.2 |
| 4 | **Health is 30 after a police loss**, as at an admission: nobody sits in a cell at 0 | §8.2, GDD §20 |
| 5 | **A won fight never takes Health below 1.** A win never admits you | §10.3, GDD §20 |
| 6 | **The close race and the comeback apply to speech missions only** (the political type); vandalism, disruption, sabotage and theft get neither line. §4.1's "political missions" means that | §4.1 |
| 7 | **An action against a rival counts the actor's leg** (half the swing) for heroes and the scoreboard; the ledger records both legs | §4.1, ADR 0034 |
| 8 | **Heat cools at the residence city's rate** wherever the player stands (`heatCoolPct` follows the Rested cap's rule: the timers follow where you live) | §6.1, GDD §6.4 |
| 9 | ***Cool by {time}*** is the time Heat drops under 25, shown only while *Noticed* or above; once *Cool* the line shows no time (*Heat 12 · Cool*). No *gone by* | §6.3, screens §12 |
| 10 | **A visitor's tier-1 run-in draws from the city's `runInPool`**, the police rule on top: Duskwall `street-enforcer`, `vanguard-doorman`; Coalport `strike-picket`, `branch-inspector`; Ashford `party-thug` | §10.5 |
| 11 | **Training and the held taps never roll a run-in**, on rival ground or anywhere | §10.5 |
| 12 | **The first trip to rival ground always draws *Papers, please***, Heat notwithstanding; *Your name is on a list* replaces the draw on later trips at Heat 50 or more and is outside the three-card rotation | §11.4 |
| 13 | **The hostile cards' Partial rewards** are written in §23.2 | §11.4 → §23.2 |
| 14 | **The missing texts** are written: the held taps (§23.3), the four quarter blurbs (§23.4), the thirteen alt texts (§23.5) | — |
| 15 | **Type-keyed council rules and Issue effects apply to missions by the type they are seen as**: *Rally Permits* takes a speech mission from 15 to 13 Energy (rewards on the content Energy, the slice-3 rule); *Open Doors* and *Street Permits* touch no mission | §4.1 |
| 16 | **Deportation's train goes to the residence city** (Irongate for a capital resident) | §11.5, GDD §14.12 |
| 17 | **The run-in decide window is five minutes.** Luck takes an unanswered run-in on the first read after five minutes, or at the day's end if sooner, as of that time; the player's own choice wins while it is pending. Recorded in GDD §13.1 and §20 | §4.6, §10.4, GDD §13.1, §20 |
| 18 | **Notorious bars every player from the Alliance's HQs, Alliance members included** (§11.3 as written) | §7.3 |
| 19 | **After a Run the stamp and text are the check's outcome**; the run-in block says you ran; the row reads *Success · dropped: you ran*; the receipt carries only the small XP. A loss stamps *Taken in* or *Taken to the infirmary* | §4.6, screens §4.3 |
| 20 | ***Six wins* and *Five attempts* do not count missions** (`kinds: ['checked']`); the mission order and the type-matching speech and intelligence orders do | §4.1, §12.2 |
| 21 | **The briefing keeps its confirm**: a row selects, the button spends, so a brush on a row costs nothing. A first mission is **three taps** (ticket, way, confirm); the second time two (*Again*, Continue) | §16 (table), screens §4.2 |
| 22 | **No rank for the civic police: *the duty officer*** replaces *sergeant* everywhere, as slice 4 did for Police Headquarters, so the QA guard keeps its one rule (*no rank is allowed*) and gains no allowance. *Constable* stays (not in either regex). **The asset is `portrait.duty-officer`** (source `mvp/portraits/sergeant.png`; the file keeps its name). Duskwall's watch Failure reads *with a lamp*. The four way hints and one way title that read *in front of* are reworded (*with the quay watching*, *with the bench watching*, *with the yard watching*, *with the queues watching*), so no allowance; ***front door*** (the Union Hall briefing) keeps `qa.content`'s existing allowance and joins `qa.slice2`'s list. The slice-6 texts (`slice-6-together.md`, `slice-6-screens.md`) take the same word in the same change | §2.3, §3.1, §5.1–§5.4, §8.3, §14, §19 Q12, §20, §21; screens §6, §11, §12 |

### 23.2 The hostile cards: every outcome's rewards (§22.1 Q13)

A Partial pays half the Success's XP and Party XP, rounded half up, plus the stated Heat or flag. Unchecked rows pay their one line. Nothing costs Energy; Iron only where the row says.

| Card · choice | Check | Success | Partial |
|---|---|---|---|
| Papers, please · Show your papers | unchecked, `gate: coolAndClean` | *Waved on*: nothing | *They write your name down*: Heat +10, *Watched* |
| Papers, please · Talk your way through | CHA, 14 | +6 Party XP | +3 Party XP, *Watched* |
| Papers, please · Pay the lamp | unchecked, 30 Iron | *The lamp moves on*: nothing more | — |
| Papers, please · slept through | — | — | `ignoreEffects`: Heat +10, *Watched* |
| The informer · Lose him at the barrier | AGI, 14 | +14 XP | +7 XP, *Watched* |
| The informer · Feed him a story | INT, 14 | +6 Party XP | +3 Party XP, *Watched* |
| The informer · slept through | — | — | `ignoreEffects`: *Watched* |
| Your name is on a list · Get off at the halt | AGI, 14 | Heat −10, +14 XP | Heat −5, +7 XP |
| Your name is on a list · Brazen it out | CHA, 14 | +6 Party XP | +3 Party XP, Heat +10, *Watched* |
| Your name is on a list · slept through | — | — | `ignoreEffects`: *Watched* |
| A friendly conductor · Take the warning | unchecked | *Warned* | — |
| A friendly conductor · Buy him a drink | unchecked, 10 Iron | +6 Party XP, Heat −5 | — |
| A friendly conductor · slept through | — | — | nothing (the line only) |

### 23.3 The held taps (§8.2, §9.2): texts

Both intelligence, 3 Energy, **Intelligence**, 14 / 7 XP, 6 / 3 Iron, a win for Reputation on a Success.

**Listen to the cells** (`held.cells`)
- Success — *Two cells, three stories* — The man in the next cell talks to the wall and the wall is you. A name, a yard, a night that went wrong. The duty officer's boots stop outside and the talking stops with them. You have enough.
- Partial — *The hatch stays open* — The hatch stays open and so does the duty officer's ear, so the next cell says nothing worth having. You get a street and a grudge. Tomorrow's paper may say the rest.

**Talk to the ward** (`held.ward`)
- Success — *The bed by the window* — The man in the bed by the window broke his arm at the mill and his patience with the foreman long before. Names, shifts, who signs what. The matron lets him talk; it keeps him still.
- Partial — *Visiting hour* — The ward fills at two and every bed is a family, so you get half a story from the bed opposite before his wife arrives. A name and a street. The matron's look ends it.

### 23.4 The four quarter blurbs (`Quarter.blurb`, ≤ 200; Coalport's are in `city-quarters.md` §2)

| Quarter | Blurb |
|---|---|
| Duskwall · The Pass | The road up to the frontier: the checkpoint's barrier under the peaks, the lock-up beside it, the last inn before the pass, the infirmary under the spire and the sawmill on the river bend below. |
| Duskwall · The Town | The town below the fortress, west of the market: the brewery's chimneys, the Signal Lamp, the station under its glass roof, and the square with the domed church where the town meets on Sundays. |
| Ashford · The Wharf | The lower town across the river: the County Infirmary in its garden, the cattle pens and auction sheds, the police station by the Corn Exchange, the wharf below the bridge and the brewery's chimneys. |
| Ashford · Station Road | The respectable town north of the river: the station's glass roof, the Town Hall clock, the theatre, the Corn Exchange, the park with its bandstand and the Press Club by the bridge. |

The teaser lines of §2.3 are unchanged.

### 23.5 Alt texts (≤ 160), written against the pictures (§21)

| Asset id | Alt text |
|---|---|
| `scene.mission-speech` | A speaker in shirtsleeves leans on a platform rail under a loudspeaker horn, pointing down at a shipyard crowd who wave caps and clap; a hull and cranes behind. |
| `scene.mission-watch` | A man in a hat at a café window with a newspaper, a coffee and a notebook, watching two men in coats at a lit hotel doorway across a wet street at dusk. |
| `scene.mission-posters` | A woman with a paste brush at a half-stripped poster on a brick wall at night, a man with rolled sheets looking back down the street; a bucket on the kerb. |
| `scene.mission-sabotage` | A man in a flat cap crouched at a printing press in a dark print room, a hand lamp in one hand and the other on the drive wheel; stacks of paper, the door open. |
| `scene.mission-theft` | A man in a dark overcoat lifting papers from an open filing cabinet in a dim office, eyes on a frosted door where a hatted shadow stands; a desk lamp, files. |
| `portrait.street-enforcer` | A Vanguard street enforcer: a heavy-shouldered man in a flat cap and a rough dark jacket over an open collar, stubble, a bruised cheekbone, fists clenched. |
| `portrait.vanguard-doorman` | The doorman at Beacon House: a big man in a dark double-breasted coat with the collar up, close-cropped hair, arms folded in leather gloves. |
| `portrait.strike-picket` | A Collective strike picket: a young man in a knitted cap and a red scarf over a work jacket, his breath in the cold, a gloved hand on a blank placard's pole. |
| `portrait.branch-inspector` | A Collective branch inspector: a neat man with round spectacles, a moustache and a pencil behind his ear, a grey suit and waistcoat, a notebook under his arm. |
| `portrait.party-thug` | An Alliance party heavy: a man with slicked dark hair, a scar through one eyebrow and a toothpick in his teeth, a dark leather coat over a maroon roll-neck. |
| `portrait.duty-officer` | The duty officer of the civic police: a grey-moustached man in a dark tunic and a peaked cap with a plain shield badge, a pen in his hand. |
| `portrait.matron` (`nurse.png`) | The matron: a woman in a white nurse's cap, dark hair pinned back, a dark cape over a white collar and apron, looking straight at you. |
| `portrait.kessler` (the constable) | A constable of the city police in plain clothes: a man in a fedora and a belted trench coat with the collar up, a grey moustache, a cigarette in his mouth. |

The posters scene shows a crew with paste and a brush and **no knife** (the brief's knife was never drawn); the tram-shelter briefing now says *a scraper and ten minutes*. (Slice 6's Poster Night has its own scene, `event-poster-night.png`, already drawn.)

### 23.6 The fourteen notes (`docs/tech/slice-5.md` §23)

1. **Irongate's difficulty**: 20 (§23.1 #1).
2. **The run-in formula**: 15 flat on tier 1 (§23.1 #2).
3. **A police loss on legal work**: the cells (§23.1 #3).
4. **Missions as `Location.missions[]`**, not a member of `Action` (ADR 0031): accepted. §19 Q1's suggestion is superseded; a mission is an `ActionDescriptor` of kind `mission`, seen as `speech` or `intelligence` by orders and Issues, or as its own illegal type.
5. **Order titles carry `{city}`**, resolved at read to the residence city (the slice-4 fixes' m1 rule, `slice-4-fixes.md` §2): the slot-B mission order's title is ***Take on a mission anywhere in {city}***; `{city}` is allowed on any template and `{verbs}` only on a training one. §12.2 is reworded.
6. **The Herald gets eight templates**, not ten: no `quarter-open` (no second quarter) and no `rival-pressure` (no home faction). §14 is reworded.
7. **No knife.** The tram-shelter briefing reads *a scraper and ten minutes is all it takes you*; the posters brief in §21 reads *a scraper*; the picture has neither.
8. **The mission order enters a member's rotation at Level 6** (`minLevel: 6`): orders are faction-wide *among members who can do them*. GDD §13.7 now says so.
9. **"A quarter opens when the game sends you there"** is a view rule with nothing stored, and cannot fire in slice 5 (missions need Level 6, rival ground Level 10). §2.1 says so.
10. **The data model**: the plan's slice-5 row (`encounters`; `jail` and `hospital` embedded) is built as the `encounters` and `stays` collections with pointers on the character (ADR 0032, 0033). Noted here; the plan's table is the architect's to amend.
11. **No caught check after a Run** (nor after a loss): confirmed. *Wanted* + a Failure + a successful Run is not an arrest: you got away, and dropped it.
12. **The unwritten content** is written (§23.2–§23.5).
13. **Three taps the first time** (§23.1 #21).
14. **Vocabulary** (§23.1 #22): *the duty officer*; *a lamp*; *in front of* reworded; *front door* allowed; the slice-6 texts brought into line.

### 23.7 For QA

The guards' allowances after this change: `qa.content`'s `front` list is unchanged (*front door* is already on it); `qa.slice2`'s list gains **front door** only. Nothing in slices 5 or 6 now uses *sergeant*, *torch* or *in front of*. Slice 6 will need **front page** (the Headline Story's Triumph) on both lists when it lands.

### 23.8 Text lengths (4 Oct 2026)

- **Outcome texts stay at ≤ 240 characters and ≤ 4 sentences** (GDD §1.2 pillar 7, the slice-1 rule n9), for actions and missions alike. Four of this document's texts were over and are trimmed in place, each by one clause, nothing else changed: `irongate.forecourt.rally` Success (§5.4, now 239), `duskwall.checkpoint.drivers` Success (§3.1, 237), `duskwall.lock-up.hatch` Success (§3.1, 234), `ashford.cattle-market.speech` Success (§3.1, 238).
- **A mission briefing is ≤ 380 characters and ≤ 4 sentences.** §4.4's "≤ 240" was wrong against its own catalogue (the 22 briefings run 259–362) and is corrected. The briefing is not an outcome text: it is read once, before a choice, and the Repeat button skips it from the second time (§4.1); it has to set the place, the job and the risk in one go, which 240 cannot do without dropping one of the three. The pillar-7 measure that matters for it is the screen one, which §10 already pins: title, briefing and the first two way rows above the sticky button on 375 × 667. The loader checks 380 and 4 sentences on `briefing`; the 240 check stays on every `text` body. The 22 briefings are unchanged. GDD §12's "a short briefing" needs no number; the cap lives here.
- **Quarter blurbs stay at ≤ 200** (§23.4). Coalport's Harbour blurb (`city-quarters.md` §2.2, quoted in `slice-5-screens.md` §3.3) was 204 and loses *at the mole* (now 192); the teaser line already names the customs house without it. The Mill (179) and the Sidings (191) fit as they are.
- ***Ward* in its hospital sense is allowed.** The vocabulary guard (`packages/content/test/vocabulary.ts`, review 2 §1.13) bans *ward(s)* as the retired electoral word; slice 4 allowed *fever ward*. Slice 5's infirmaries are built of wards and there is no other English word for the room, so the hospital phrases join the allowance: *the ward*, *on the ward*, *the men's ward*, *the women's ward*, *long wards*, *four wards*, *county's ward* (and *fever ward* as before). The electoral sense stays banned: the game's units are the district, the quarter, the street and the branch, never the ward. One use in this document was electoral and is reworded: `duskwall.beacon-house.roll` Failure now reads *until he asks which branch*, in line with Coalport's *which branch* and Ashford's *which street*.
- ***Uniform* stays banned** (war framing; `qa.content` and `qa.slice2`). The one player-facing use, `duskwall.checkpoint.turned-back` Success (§3.1), now reads *by a man in a plain coat* (198 characters, 3 sentences). The word's other appearances in this document are design notes and art briefs (§10, §11, §20, §21), not loaded content.

---

## 24. Review 4 addendum (6 Oct 2026)

- **§2.1–2.2, the second quarters on the map:** **withdrawn for home cities** (GDD §14.13, review 4). A home city is one map with every surveyed place a pin; the Harbour's, the Pass's and the Wharf's places are **greyed pins with a lock** until Level 6 (*Opens at Level 6* on the Places list, grouped by quarter, and on the pin's short sheet); the third quarters' places likewise with *Opens with a later edition*. Frames, outlines, anchors, the overview, the quarter bar and the teaser sheet go; `quarters[].level`, `name` and `blurb` stay. The fifteen places and 35 actions (§2.3, §3) stand.
- **§8.2, the cells:** the sentence is **20 minutes + Heat ÷ 2** (max 60; ×1.5 on rival ground); **the day's Party orders are off** from the arrest to the day's turn; **an arrest is at least one mark** (the type's, or one minor mark on legal work; §8.1's "none for a speech, a watch" is superseded, and so is the no-escalation sentence); every police station's sheet carries ***In the cells now***. `review-4-answers.md` §19–§20; the economy in `docs/economy.md` §24.3.
- **§12.2, the mission order:** offered only when **a mission in the residence city is open to the member** (its Rank, Level, Reputation and record gates pass); otherwise slot B's next template. GDD §13.7.
- **§14, the headlines:** `hl.cells` and its three sister decks gain the orders clause (the Clarion's: *Taken in after {missionTitle}; {how} The duty officer wrote it down. Heat is back to 25; today's orders are off.*). **A visitor on rival ground reads their own paper in the rival city's edition** (*The Coalport Clarion · Duskwall edition*; GDD §3.3), with the *Where you are* desk row; the sentence "the home paper is delivered" in §11.2 means this.
- **§11.2, the orders line away:** *Your orders are in {city} · n of 3 done*, one collapsed line, not tappable, everywhere away.
