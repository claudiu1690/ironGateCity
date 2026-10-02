# City quarters: more city to play in, one quarter at a time

Game designer, 1 Oct 2026. The design for the user's "more city to play in": cities that grow with more places for later levels, and a greater sense of distance between them. The reliable way to do it with generated art is **quarters**: each city becomes an overview map plus a few quarter maps, each quarter a normal-size square image that today's generators handle. **Coalport is the test.** This document is the full design for Coalport and a plan for the other cities and the nation. The art brief that generates it is `docs/art/map-brief.md` (revised the same day; the prompts in §5 here are the same text as the brief's §4, and the brief is the copy to paste into the tool).

What it pins in the GDD: the map's structure and the quarter unlocks (**GDD §14.13**, new; §14.9's "on the map" bullet replaced; a §0 row; Appendix C #38–41). What it does not change: any number in the economy, any rule of play, any faction name, the travel times, or anything already built in Coalport's first six places.

---

## 0. The decisions in one place

| # | Decision | Where |
|---|---|---|
| 1 | **The chain is nation → city → quarter → place**, the model Irongate's five districts already use. Every city is an **overview** (quarter plates, no place pins) plus **quarter maps** (4–6 places each, the core-box rule per quarter) | GDD §14.13 |
| 2 | **A city opens into the quarter you are in**, so day 1 is unchanged: a new Collective recruit lands on The Mill with the Mill Gate's sheet open (§7.5). The overview is one tap away | GDD §14.13 |
| 3 | **Quarters open by Level, per character: 1 / 6 / 10.** The station's quarter is the Level-10 one, so it opens with the train. A quarter also opens the moment the game sends you to a place in it (the infirmary, the cells). Never by the clock; never closes again | GDD §14.13, §4.3 |
| 4 | **Quarters are map units, never political units.** A home city keeps one opinion meter and one council. In Irongate the districts *are* the quarters (one map each), and the political unit happens to coincide with the map unit | GDD §14.13, §14.9 |
| 5 | **Coalport: three quarters, fifteen places.** The Mill (today's six, Level 1) · The Harbour (five, Level 6, slice 5) · The Sidings (four, Level 10, slice 4 with the train) | §2–§3 |
| 6 | **Locked quarters are teasers**: drawn in full on the overview, the plate tappable, *Opens at Level 6* and one line; nothing inside reachable | §2.3 |
| 7 | **The seamless giant map stays an experiment**, judged on one seam in the Coalport test (§6). The shipped model is separate images | Appendix C #39 |
| 8 | **The nation map gets more distance**: smaller cities, three or four halts per line as scenery. Travel times stay 12 / 15 / 25 | §8.3 |

---

## 1. The rule (what §14.13 says, and why)

### 1.1 Structure

- **Overview.** One square image per city showing the whole town at small scale. It carries only the **quarter plates** (name, one line, the lock if any). No place pins, no pin zoom: a tap on a plate opens the quarter. The plates sit inside the central 60 % of the canvas (x and y 0.20–0.80) so they clear the HUD and the tab bar at the initial fit, the nation map's rule.
- **Quarter.** One square image per quarter, following every composition rule of a city map in the brief: 4–6 places in the core box (x 0.40–0.68, y 0.32–0.60), a rich ring, the neighbouring quarters' landmarks at the edges so the two maps agree. Pins are fractions of the quarter's image.
- **Place.** As today: a pin, a sheet, tickets.
- **Irongate.** The city overview is the capital overview (five district plates, brief §8.2); each district map is that district's quarter map. A district has no sub-quarters in the MVP; if a district ever needs more than six places it gets two quarter maps under one district meter (Appendix C #41).

### 1.2 Navigation

- **Landing.** Opening a city shows **the quarter you are in**: the last quarter viewed in that city; on arrival by train, the station's quarter with the station pin selected (the slice-4 pattern: Station & Market with Central Station selected); for a new character, the first quarter with the first pin's sheet open (§7.5, unchanged). A session starts on pins, never on an overview.
- **Up and down.** The map header reads *Coalport · The Mill*. Tapping the city's name opens the overview; tapping a plate on the overview opens that quarter with a zoom-and-cross-fade (§4.3). A quarter bar (the tram bar Irongate already has, §14.9) lists the city's quarters for a one-tap hop without the overview.
- **No rule effect.** Which quarter you are in is a client memory, not a server fact. Energy actions need only the city you are in; Party orders, Issues, Standing and the paper are per city (per district in the capital). Moving between quarters is instant and free. Slice 6's presence text may say *at the Harbour*; nothing else reads it.

### 1.3 Unlocks

| Quarter | Opens | Why there |
|---|---|---|
| First | Level 1 | Day 1 |
| Second | **Level 6** (reference player day 2; heavy day 1; casual day 3–4) | The level that opens bar services and tier-2 play (§5.3). Coalport's second quarter holds the places tier 2 needs: the shipyard, the customs house, the infirmary and the cells |
| Third | **Level 10** (reference day 5) | The train's level. The third quarter holds the station, so the train and the station open together, and the first journey begins at a pin, not only on the nation map |
| Any later quarter | Set when it is designed; Level only | |

- **Per character, Level only.** Not Rank (a visitor of another faction must see the same city), not story (Ambitions are per faction), not the clock (pillar 7: never online at a set time). Rank and story gate *tickets* inside a quarter, as they do today (members only, Rank 3 for illegal missions), never the quarter.
- **Services find you.** Being admitted to the infirmary or held in the cells (slice 5) opens the service view whatever your Level, and opens that quarter for the character from then on. In practice the gate is moot: Heat, encounters and overdoses all need Level 6.
- **Visitors.** Anyone who can take the train is Level 10, so a visitor sees every quarter of every city. Hostile-ground rules (§14.12) apply to actions, not to maps.
- **Never relocks; never costs.** Level never falls, so a quarter once open stays open (§4.3). Opening a quarter pays nothing and costs nothing: it is a reveal, not a reward, so it moves no number in `docs/economy.md`.
- **Not yet built.** Until a quarter's slice ships, its plate reads *Opens with a later edition* whatever the player's Level (Clearwater's *No service yet* pattern). The plate never promises a Level it cannot keep.

### 1.4 Growth

Each quarter is drawn with **one or two reserved spots** in its ring (a building the art already shows) so a place can be added later by content alone, without regenerating the art (CLAUDE.md: content is data). Past six places a quarter splits in two. The long-run count for a home city is 12–15 places in three quarters; for the capital 29 today in five districts, growing in the districts' reserved spots.

---

## 2. Coalport's three quarters

### 2.1 The Mill (Level 1; built: slices 0–3)

The mill and the men who work it, the market below the gate, the union hall, the terraces above and the quay at the bottom of the town. Brick, soot, the hooter three times a day. **Places (six, today's, unchanged):** Mill Gate, Market Row, Union Hall, Foundry Row, Harbour Quays, The Anchor. **Teaser line:** none; it is open.

### 2.2 The Harbour (Level 6; enters play in slice 5)

Where the basin opens to the sea: the slipway, the customs house at the mole, the infirmary, the police, and across the water by ferry the far bank with its fish market and its lower town that votes late. Slice 5's risk lives here: Heat, the cells, the hospital, the first tier-2 missions. **Places (five):** The Shipyard, Customs House, The Infirmary, Harbour Police, The Far Bank. **Teaser line (locked):** *Opens at Level 6 · The slipway, the customs house, and the far bank across the water.* **Reserved spot:** the Gasworks (top right of the quarter; a later `factory-gate` place for a gas strike or a sabotage mission).

### 2.3 The Sidings (Level 10; enters play in slice 4 with the train)

The way in and out of town: the station where the line comes in, the coal yards where the town's coal is weighed, the tram sheds, and, up in the old town, St Barbara's church by the canal (on the painted art it stands among the old town's roofs west of the canal, not above the station; pin 0.24, 0.27 of the city picture). **Places (four):** Coalport Station, Coal Yards, Tram Depot, St Barbara's. **Teaser line (locked):** *Opens at Level 10 · The station, the coal yards and the tram sheds.* **Reserved spots:** the Public Baths (a later `gym` place for STR training; Coalport has no boxing club) and the School.

**What a locked plate shows on the overview.** The quarter is drawn in full (the overview is faction-neutral art and the lock is an interface overlay, as district states are): the plate carries the name, the teaser line and *Opens at Level 6*; tapping it opens a short sheet with the quarter's three-line blurb and the same line; there is no Enter button (the slice-4 locked-plate pattern: the button is absent, not disabled). The plate is not dimmed and the art is not greyed: a teaser shows what you will get. Below the slice that builds it, the line reads *Opens with a later edition*.

---

## 3. The long-run place list (fifteen)

Kinds are from the §13.5 list; **no new kind is needed**. Blurbs are at most 200 characters and in plain words (§1.5): the period lives in the nouns. "Which slice" is when the place enters play; the quarter's Level gate applies on top.

| # | Id | Name | Kind | Quarter | Blurb | What it is for | Unlock |
|---|---|---|---|---|---|---|---|
| 1 | `coalport.mill-gate` | Mill Gate | `factory-gate` | The Mill | *(unchanged)* | Tier-1 canvass and speech (built) | Level 1 |
| 2 | `coalport.market-row` | Market Row | `market` | The Mill | *(unchanged)* | Tier-1 canvass, speech, flyers (built) | Level 1 |
| 3 | `coalport.union-hall` | Union Hall | `faction-hq` | The Mill | *(unchanged)* | Party meetings, printing, INT training (built); the HQ screen (slice 6) | Level 1 |
| 4 | `coalport.terraces` | Foundry Row | `street` | The Mill | *(unchanged)* | Tier-1 doors, chalking, AGI training (built); the rented room and the flat (slice 8, §17.4) | Level 1 |
| 5 | `coalport.quays` | Harbour Quays | `docks` | The Mill | *(unchanged)* | Tier-1 dockers, posters, STR training, the customs shed watch (built); a Campaign Event venue (slice 6) | Level 1 |
| 6 | `coalport.anchor` | The Anchor | `bar` | The Mill | *(unchanged)* | Tier-1 regulars, listening, singing (built); bar services at Level 6 (§19.3, slice 5) | Level 1 |
| 7 | `coalport.shipyard` | The Shipyard | `docks` | The Harbour | A hull on the stocks and two hundred men on the staging. When the yard stops, the town hears it. | Tier-2 missions (slice 5): the big-crowd speech at a launch, a strike picket, breaking up a rival meeting in the drawing office; a Campaign Event venue (slice 6); a Riveter job (later) | Level 6 · slice 5 |
| 8 | `coalport.customs-house` | Customs House | `ministry` | The Harbour | The republic's clock on the mole, and its inspectors in the sheds. Every crate in Coalport passes their stamp, or doesn't. | Tier-1 watch and listen; tier-2 extended surveillance with Heat (slice 5); the state's presence in a Collective town, where the Vanguard courts the inspectors; the *Customs Strike* Issue line | Level 6 · slice 5 |
| 9 | `coalport.infirmary` | The Infirmary | `hospital` | The Harbour | Glass roof, iron beds, a matron who has seen every kind of accident the mill makes. Visiting hour is two o'clock. | The hospital (§19.1, slice 5): admitted at 0 HP, the stay, visits from faction mates; a tier-1 canvass in the waiting room; the *Clinic Funding* effect's home | Level 6 · slice 5 |
| 10 | `coalport.harbour-police` | Harbour Police | `jail` | The Harbour | The harbour police station by the ferry stage: two cells, a stove, and a sergeant who writes everything down. | The jail (§19.2, slice 5): the cells, bail, a faction mate posting it; a tier-1 *read the notices* intelligence tap; the civic police of a Collective town (never a party's) | Level 6 · slice 5 |
| 11 | `coalport.far-bank` | The Far Bank | `market` | The Harbour | Across the water by ferry: the fish market under its iron roof, the bonded warehouses, and a lower town that makes up its mind late. | Tier-1 canvass, speech and flyers for the ferry crowd and the fish quay; tier-2 social missions with the merchants (slice 5/8); the *Ferry Fares* Issue line; the Alliance's thin foothold in Coalport | Level 6 · slice 5 |
| 12 | `coalport.station` | Coalport Station | `station` | The Sidings | One platform, one canopy, and every train to the capital. The porter knows who left town and who came back. | **Board the train** from a pin (slice 4, §14.10: *Board the train to Irongate · 20 Iron · 12 min*); the arrival pin for visitors; a Porter job; selling Dossier entries (§10.4, slice 8) | Level 10 · slice 4 |
| 13 | `coalport.coal-yards` | Coal Yards | `station` | The Sidings | Walled yards of coal and four sidings of wagons. The weighbridge decides what the town pays for its winter. | Tier-1 canvass at the weighbridge and flyers on the wagons (slice 4); tier-2 missions (slice 5): the weighbridge fiddle for an exposé, a picket; the *Coal Ration* Issue line; a Weighbridge clerk job (later) | Level 10 · slice 4 |
| 14 | `coalport.tram-depot` | Tram Depot | `station` | The Sidings | Three trams under an open roof and a fan of track. The crews' meeting is in the mess room at six. | Tier-1 canvass and a speech to the crews (slice 4); the *Tram Subsidy* ordinance and the *Tram Fare Hike* Issue get a place; a tier-2 mission (slice 5); a Conductor job (later) | Level 10 · slice 4 |
| 15 | `coalport.st-barbaras` | St Barbara's | `square` | The Sidings | The old town's church by the canal: a tall stone spire over the roofs, a railed close of lime trees, weddings on Saturday and the whole parish on Sunday. | Tier-1 speech at the church door after the service (slice 4); social missions with CHA (slice 8); the one place in Coalport where the Alliance's voice is heard without a heckle | Level 10 · slice 4 |

**Notes on the choices.**
- Three `station` kinds in one quarter (the station, the yards, the depot) is accepted: the kind is an art key, and the §13.5 scene for `station` (*rail stations, the tram junction*) fits a goods yard as it fits Duskwall's Goods Yard, which is `station` already. A separate `goods-yard` kind would add a scene to the art budget for no gain.
- `coalport.quays` already has *Watch the customs shed*; the Customs House is where that shed's inspectors live. Both stand: the quays action is the safe tap, the Customs House is where surveillance gets Heat.
- The Baths and the Gasworks are drawn, not pinned (§1.4). The Football Ground, the School and the Cemetery are scenery.
- Jobs are not pinned here; §9.2 is the catalogue and each slice's content note pins its jobs' pay.
- Tier-1 actions for places 12–15 (slice 4) and 7–11 (slice 5) are written when the slice is scheduled, in that slice's content note, against the §13.3 energy table. Each place gets two or three (`actions` is `min(1)` in the schema).

**Plain words and the content policy.** Every name is a plain noun (*Harbour Police*, not *the Watch House*; *Customs House*, not *the Harbour Mouth*; *The Infirmary*, not *the Seamen's Infirmary*), and the 1946 flavour is in the blurbs' nouns (the weighbridge, the mess room, the bonded warehouses). The police are the republic's civic police (policy §7.3); the church has a plain tower and no device on it (policy §7.2, "no crosses as devices"); nothing on the list is military. Checked line by line against `content-policy-review.md` §7.

---

## 4. Pins and plates

> **Superseded (2 Oct 2026, maps v3).** The maps were painted as **one picture per city** (`docs/design/maps-v3-integration.md`; a quarter is a frame on that picture, not an image of its own), so the overview, the quarter grids, the plates, the footprints and the pin targets in §4 and the prompts in §5 are the retired pen-and-ink plan, kept as the record of what was asked for. The pins that count are the survey of the painted art: `art-direction/maps-v3/pins/pins.json`, transcribed in `packages/content/src/data/mapPins.ts` (fractions of the city picture, with the quarter each place is painted in). Where the painted art and this plan disagree, the art wins; the places whose position changed are noted in their rows (St Barbara's, §4.4).

### 4.1 The overview (Coalport whole)

The town at small scale in a 10 × 10 grid (each cell 10 % of the canvas; column = x, row = y). The three plates are inside the central 60 %.

```
       0  1  2  3  4  5  6  7  8  9
   0   ^^ ^^ ^^ ^^ ^^ ^^ .. .. .. ..    slag heaps, allotments, the cemetery
   1   .. CH .. .. TT TT TT .. FG ..    St Barbara's on the hill · terraces · football ground
   2   == St .. MM MM TT .. .. GW ..    station · the mill and furnace · gasworks
   3   == CY .. MM MM mk UH .. GW ..    coal yards · Market Row · Union Hall
   4   .. CY CY .. .. QQ .. SY SY ..    the quays · the shipyard slipway
   5   .. .. TD An ~~ ~~ ~~ IN SY ~~    tram depot · The Anchor · the basin · the infirmary
   6   .. .. .. ~~ ~~ ~~ ~~ ~~ ~~ CU    the swing bridge · the basin · customs house
   7   .. .. .. FM FB FB HP ~~ ~~ ML    fish market · far bank · harbour police · the mole
   8   .. .. .. .. LT LT .. ~~ ~~ ~~    the lower town · the harbour mouth
   9   .. .. .. .. .. .. ~~ ~~ ~~ ~~    the sea, a collier standing off
```

`MM` the mill · `mk` Market Row · `UH` Union Hall · `QQ` the quays · `An` The Anchor · `St` station · `CY` coal yards · `TD` tram depot · `CH` church · `SY` shipyard · `IN` infirmary · `CU` customs house · `HP` harbour police · `FM` fish market · `FB` far bank · `LT` lower town · `ML` the mole and lighthouse · `GW` gasworks · `FG` football ground · `~~` water · `==` rail · `^^` heaps.

**Plates and footprints** (fractions of the overview; the footprint is the part of the overview the quarter map's central half, x and y 0.25–0.75, depicts; it is what the zoom-in frames):

| Quarter | Plate x, y | Footprint left, top, width, height | The plate sits on |
|---|---|---|---|
| The Mill | 0.48, 0.38 | 0.30, 0.20, 0.36, 0.36 | Market Row, between the gate and the hall |
| The Sidings | 0.22, 0.44 | 0.04, 0.26, 0.36, 0.36 | The station forecourt |
| The Harbour | 0.70, 0.66 | 0.52, 0.48, 0.36, 0.36 | The ferry on the basin |

Footprints overlap a little (the Mill's quays are the Harbour's left edge; the coal yards are the Mill's left edge): that is the "edges agree" rule, and it is what makes the cross-fade read as one town.

### 4.2 The Mill quarter (today's six)

The brief's §4 composition, unchanged in the core; the ring now shows the other two quarters at its edges. Target pins (fractions of the quarter image):

| # | Id | Pin x, y |
|---|---|---|
| 1 | `coalport.mill-gate` | 0.42, 0.44 |
| 2 | `coalport.market-row` | 0.53, 0.50 |
| 3 | `coalport.union-hall` | 0.65, 0.40 |
| 4 | `coalport.terraces` | 0.55, 0.34 |
| 5 | `coalport.quays` | 0.60, 0.58 |
| 6 | `coalport.anchor` | 0.43, 0.59 |

Edges: coal yards and the station at the left and top-left (the Sidings); the slipway and the gasworks at the right, the far bank at the bottom (the Harbour); heaps and St Barbara's tower at the top.

### 4.3 The Harbour quarter

```
       0  1  2  3  4  5  6  7  8  9
   0   TT TT .. .. .. .. .. GW GW ..    terraces' end · gasworks (reserved)
   1   UH .. .. .. .. .. .. GW GW ..    the union hall's roof at the top left
   2   QQ QQ .. .. .. .. .. .. .. ..    the quays' cranes at the left edge
   3   QQ .. .. ..[ 7  .  9  . ].. ..   The Shipyard · The Infirmary
   4   An ~~ ~~ ~~[ .  .  .  8 ]~~ ~~   The Anchor at the edge · the basin · Customs House at the mole's root
   5   ~~ ~~ ~~ ~~[ 11 .  10 . ]ML ~~   The Far Bank (fish market) · Harbour Police · the mole
   6   .. FB FB .. .. .. .. .. ~~ ~~    bonded warehouses · the ferry stage
   7   .. LT LT LT LT .. .. ~~ ~~ ~~    the lower town · the harbour mouth
   8   .. .. LT LT .. .. ~~ ~~ ~~ ~~    nets, a bathing place · the sea
   9   .. .. .. .. .. ~~ ~~ ~~ ~~ ~~    a collier standing off, a pilot boat
```

| # | Id | Pin x, y | What the generator must draw, and where the pin lands |
|---|---|---|---|
| 7 | `coalport.shipyard` | 0.43, 0.37 | **The Shipyard:** a hull on the stocks under a gantry, a drawing-office shed, a steam crane, workers on the staging, a slipway into the basin. Pin on the yard gate at the slipway's head. |
| 9 | `coalport.infirmary` | 0.60, 0.34 | **The Infirmary:** a brick hospital with a glass-roofed ward wing, a walled forecourt with a gate, an ambulance, visitors at two. Pin on the gate. |
| 8 | `coalport.customs-house` | 0.66, 0.47 | **Customs House:** a stone customs house with a clock at the root of the mole, a bonded shed, lorries and carts being checked, inspectors with clipboards. No flag on the mast. Pin on the door under the clock. |
| 11 | `coalport.far-bank` | 0.46, 0.59 | **The Far Bank:** the ferry stage and the fish market under an iron roof on the fish quay, boats, crates, a morning crowd, the lower town's narrow streets behind. Pin on the market's open front. |
| 10 | `coalport.harbour-police` | 0.60, 0.59 | **Harbour Police:** a small police station beside the ferry stage, a lamp over the door, a yard with black saloons and a bicycle rank, a sergeant at the door. Civic police, no uniforms as a crowd. Pin on the door. |

The basin crosses the core from the left edge (y about 0.45–0.52) and widens to the harbour mouth at the lower right; the ferry crosses between the slipway and the fish market, so the water inside the core box is busy (barges, the ferry, a tug), never empty.

### 4.4 The Sidings quarter

```
       0  1  2  3  4  5  6  7  8  9
   0   ^^ ^^ ^^ CM CM ^^ ^^ ^^ ^^ ^^    slag heaps · the cemetery and its chapel
   1   .. .. .. .. .. BA .. .. TT TT    public baths (reserved) · the terraces' end
   2   PH .. .. .. SC .. .. .. TT MM    pit-head far at the left · school · the mill's chimneys at the right edge
   3   == == == ==[ .  12 .  15]MM MM   Coalport Station · St Barbara's on the hill
   4   == == == ==[ 13 == == . ]MM MM   Coal Yards (sidings off the line)
   5   .. CY CY ..[ .  .  14 . ].. ..   Tram Depot
   6   .. .. .. .. .. .. .. .. SB ~~    railway cottages · the swing bridge at the lower right
   7   .. .. .. .. .. .. .. ~~ ~~ ~~    the basin's upper reach
   8   .. .. .. .. .. .. ~~ ~~ ~~ ~~
   9   .. .. .. .. .. .. .. ~~ ~~ ~~
```

| # | Id | Pin x, y | What the generator must draw, and where the pin lands |
|---|---|---|---|
| 12 | `coalport.station` | 0.50, 0.37 | **Coalport Station:** a small brick station with one platform canopy, a goods shed, a train with steam, a forecourt with a cab and a tram stop, a porter with a barrow. Pin on the forecourt door. |
| 13 | `coalport.coal-yards` | 0.43, 0.52 | **Coal Yards:** walled yards of coal heaps, loaded wagons on four sidings, a weighbridge hut at the gate, a shunting engine, carts queueing. Pin on the weighbridge gate. |
| 14 | `coalport.tram-depot` | 0.62, 0.56 | **Tram Depot:** an open-fronted shed with three trams, a fan of track, a mess room with a stove-pipe, crews at the door. Pin on the shed's open front. |
| 15 | `coalport.st-barbaras` | 0.65, 0.35 | **St Barbara's:** a church with a plain tower and a bell, a railed forecourt on the hill above the station, a wedding party on the steps. No device on the tower. Pin on the forecourt. |

*As painted (maps v3):* St Barbara's is not on the hill above the station. It is the old town's big Gothic church with a tall stone spire, west of the canal among trees, at **0.24, 0.27** of the city picture, well clear of the station (0.46, 0.62), the coal yards (0.44, 0.84) and the tram depot (0.29, 0.59). Its role is unchanged (the speech after the service, the CHA social missions, the Alliance's one unheckled pulpit in Coalport); its blurb in §3 now describes the drawn church.

Edges: the mill's furnace and chimneys at the right edge, the swing bridge and the basin at the lower right (the Mill); the line running off the left edge to the countryside with a pit-head winding tower far out (the nation map's coast line); the baths, the school, the cemetery and the heaps above.

---

## 5. Prompts (day), and the night method

These are the test prompts; the brief's §4 carries the same text and is the copy to paste. Every day prompt is 1,190–1,250 characters. **Reference images:** for the overview, the current `maps-pen/coalport.png` as the style reference (style only). For each quarter, **two** references where the tool allows: the approved overview's crop of the quarter's footprint (§4.1) as the **composition reference** at medium structure fidelity, so the water, the rail and the big structures land where the overview has them, plus the approved overview as the style reference. If the tool takes one reference, use the overview crop and let the prompt's first sentence carry the style.

### 5.1 Overview (day)

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. Coalport, 1946, a Central European steel and coal port, the whole town in one view. Centre, above the middle: a brick steel mill with a blast furnace, three chimneys and an arched clock gatehouse; a market street of striped awnings; a columned union hall; long brick terraces; a stone quay with two cranes and a corner pub. Left: a railway from the left edge into a small station, walled coal yards with sidings and wagons, an open tram depot, a church tower on the hill above. Right and below: a shipyard slipway with a hull on the stocks, a gasworks, the river basin widening to a harbour mouth with a stone mole, a lighthouse and a customs house, a collier at sea; across the water a far bank of warehouses, a fish market under an iron roof and a lower town, a ferry crossing. Slag heaps and allotments along the top. Smoke, trams and crowds. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 5.2 The Mill quarter (day) — generated first

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. The Mill quarter of Coalport, 1946, a Central European steel and coal port. Core, centre-right: a brick steel mill with a tall blast furnace and three chimneys, its arched clock gatehouse opening on a cobbled street of workers at shift change; below, a market street of striped awnings round a stone cross; to the right a columned union hall by a tram loop; above, long brick terraces with washing; below, a stone quay with two cranes, warehouses, a coal steamer and barges, and a corner pub at the quay's left end. Around it: walled coal yards with wagons and a small station at the left, a church tower on the hill at the top left, a shipyard slipway and a gasworks at the right, the river basin along the bottom with a swing bridge at the left and a fish market on the far bank, the harbour mouth far at the lower right. Smoke and crowds. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 5.3 The Harbour quarter (day) — the second quarter of the test

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. The Harbour quarter of Coalport, 1946, a Central European coal port. A river basin enters at the left edge, runs across the middle and widens into a harbour mouth with a stone mole and a lighthouse at the lower right; a collier at sea. Core, centre-right: on the near bank a shipyard slipway with a hull on the stocks under a gantry and a steam crane; a brick infirmary with a glass-roofed ward and an ambulance at its gate; at the mole's root a stone customs house with a clock; a steam ferry crossing to the far bank, with a fish market under an iron roof on a fish quay with boats, and beside the ferry stage a small police station with a lamp over its door and saloons in its yard. Around it: quay cranes and a corner pub at the left edge, a gasworks at the top right, a lower town of narrow houses, nets drying, a pilot boat, barges. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 5.4 The Sidings quarter (day) — after the test is approved

```prompt
Style of the reference: pen-and-ink bird's-eye city map, fine sepia lines, muted watercolour on cream paper, buildings with windows and chimneys, tiny figures, 1940s trams; high oblique 45° view, no sky, art to all edges, square. The Sidings quarter of Coalport, 1946, a Central European coal port. A railway enters at the left edge and runs across the core toward the right. Core, centre-right: a small brick station with one platform canopy, a goods shed and a train with steam; walled coal yards of coal heaps and loaded wagons on four sidings, a weighbridge hut and a shunting engine; an open-fronted tram depot with three trams and a fan of track; above the station on the hill a church with a plain tower and a forecourt with a wedding party. Around it: the steel mill's furnace and chimneys at the right edge, a swing bridge over the river basin at the lower right, railway cottages, coal carts, a public baths with a glass roof, a school with a yard, allotments, slag heaps and a cemetery along the top, a pit-head winding tower far at the left edge. Smoke and shift crowds. No text or signs; no flags, emblems or insignia; no soldiers, uniforms or military vehicles; no ruins; no modern vehicles, neon or aerials; no frame, vignette or blur.
```

### 5.5 Night: the method (unchanged from the brief §5) and the light lines

Each night image is generated from **its own approved day image** at the tool's highest structure fidelity, with the brief's §4.6 night prompt, the Coalport sentence replaced by the line below. The alignment check is the brief's §11 check 9 (every pin's building within 1 % of the width of its day position; the fallback is a graded day map). The overview's night is generated the same way from the approved overview.

| Image | The light line |
|---|---|
| Overview | The blast furnace glows orange and lights its smoke; dock floodlights on the quays; the station canopy lit; a lighthouse beam at the harbour mouth; lamps across the swing bridge; the far bank dim with a few lit windows. |
| The Mill | The blast furnace glows orange with sparks and lights the smoke above it; dock floodlights on the quay; the corner pub's windows bright; the terraces dim with a few lit windows; a lighthouse beam far at the lower right. |
| The Harbour | Floodlights on the slipway staging; the infirmary's ward windows warm; the customs house lit at its door; the ferry's lanterns and the lighthouse beam on the water; the police station's lamp; the far bank's lower town dim with a few lit windows. |
| The Sidings | Signal lamps along the sidings and a lit shunting engine; the station canopy and waiting room glowing; the tram depot bright inside with lit trams; the church dark but for a lamp at its door; the furnace glow at the right edge. |

Night shows 20:00–06:00 UTC on every level (§2.2); the overview and the quarters switch together.

---

## 6. The seamless-stitch experiment (optional)

The question: can two adjacent quarters be generated so that they join into one image, which would make a seamless giant map possible later? It is tried once, on the hardest seam, after the Mill and the Harbour have passed their checks. It never gates the test.

1. **Make the strip.** Take the approved Mill day image (4096). Build a 4096 × 4096 canvas whose **left 1,024 px (25 %) is the Mill's rightmost 1,024 px**, the rest blank. Use the tool's extend or outpaint mode ("continue the attached drawing to the right") with the Harbour prompt (§5.3), the Mill image as the style reference.
2. **What changes in the composition.** The Harbour's water must enter where the Mill's right edge shows it (the basin's right-hand reach, about y 0.55–0.75 of the Mill), so the Harbour's core box may slip from its §4.3 targets. That is accepted for the experiment: it tests the seam, not a production image.
3. **Judge the seam** on the 1,024-px overlap strip, Mill over Harbour, aligned:
   - **Lines continue:** roads, the water's edge, the rail, roof lines and quay walls coincide within **8 px at 4096**. Measured on ten crossings of the seam.
   - **Wash matches:** the mean colour of the paper, the water and the brick in the strip differs by **ΔE ≤ 5** between the two images.
   - **Scale matches:** a terrace house's width and a crane's height in the strip are within **10 %** of each other.
   - **No doubles:** no landmark drawn in both images at two places (two Anchors, two swing bridges).
   - **The join is invisible** at 100 %: a stranger shown the stitched strip cannot point to the seam.
4. **Verdict.** All five pass: the stitched model is viable, and Appendix C #39 records it as an option for v1.x (one 7168 × 4096 master for the pair; the client would treat quarters as viewports on one image, the old Irongate crop model with a bigger canvas). Any fail: quarters stay separate images, which is the shipped model either way, and the experiment is closed.

---

## 7. The test: sequence and acceptance

### 7.1 Sequence

| Step | Image | Gate |
|---|---|---|
| 1 | **Coalport overview, day** (§5.1) | Brief §11 checks 1, 2, 4, 5, 7, 8; the three footprints read as the three quarters; the user approves the overview's scale and composition |
| 2 | **The Mill, day** (§5.2), from the overview's Mill footprint | Checks 1–8 and 11; **T1 and T2** below; the user approves the quarter's style and richness. The six pins are measured and recorded |
| 3 | **The Harbour, day** (§5.3), from the overview's Harbour footprint | Checks 1–8 and 11; T1–T3; the five pins measured |
| 4 | **Night**: the overview, the Mill, the Harbour (§5.5) | Checks 9 and 10; T5; the user approves the night treatment |
| 5 | **The Sidings, day and night** (§5.4) | Checks as 3 and 4 |
| 6 | *(optional)* **The stitch experiment** (§6) | Its own verdict; never blocks |
| 7 | The user's decision: quarters for every city | Then the other cities follow the plan in §8 and the brief's order of work |

Eight images for Coalport (four maps, day and night). Masters go to `E:\Projects\ironGateCity Docs\art-direction\maps-pen-v2\coalport\` as `overview-day.png`, `overview-night.png`, `mill-day.png`, `mill-night.png`, `harbour-*.png`, `sidings-*.png`.

### 7.2 Acceptance checks for the test (on top of the brief's §11)

| # | Check | How |
|---|---|---|
| T1 | **Every place is recognisable at its pin** | The brief's check 3, per quarter: a 512 × 512 crop at 4096 centred on each target pin shows the building described in §4.2–4.4 with its distinguishing parts and the life around it. Record the measured pin |
| T2 | **The quarter is rich at zoom** | The brief's checks 6 and 11: at the phone's pin zoom (about 11 % of the width) the doorway, windows, cobbles and figures are drawn, not smeared; zooming the edge pins (the Anchor, Union Hall; the Shipyard, Harbour Police) shows city on every side, and the reserved spots (the Gasworks; the Baths and the School) are present |
| T3 | **Style holds between the overview and a quarter, and between two quarters** | Side by side at the same on-screen size: the same line weight, cream, wash, camera angle and light direction (upper-left); the overview's version of a structure (the furnace, the slipway, the mole) and the quarter's are the same building drawn at two scales. A stranger says one hand drew all three |
| T4 | **The transition reads as one town** | Crop the overview to each footprint (§4.1) and overlay the quarter's central half at 50 %: the water, the rail, the mill, the slipway and the mole fall within **5 % of the width** of each other, so the zoom-and-cross-fade shows the same place getting closer, not a cut to another drawing. Edges agree: the Mill's right edge shows what the Harbour's left edge shows |
| T5 | **Night aligns with day** | The brief's check 9 on every pair, plus: the overview's night and the quarters' nights show the same light (the furnace glow and the lighthouse beam in the same places) |
| T6 | **No text; content-policy clean** | The brief's checks 4 and 5 on all eight images, with the Coalport specifics: no flag on the customs house's mast, no device on the church tower, the police civic (saloons and a bicycle rank, no uniformed crowd), no soldiers anywhere near the coal yards or the station |
| T7 | **The teaser works** | On the overview at the phone fit, the two locked plates are readable and sit on their structures (the station forecourt, the ferry), inside the central 60 %; the drawing under them is not dimmed |

The designer signs the table in the PR that adds the art; the measured pins and footprints are written into `packages/content` and into this document's §4 afterwards.

---

## 8. The other cities and the nation (a plan, not a design)

The same gates everywhere (Level 1 / 6 / 10); the same teaser; the same "edges agree" rule. For the battlegrounds the gates are moot (nobody arrives below Level 10), so their quarters are purely spatial. Place lists per quarter are indicative and get their own content note when scheduled; the brief's reserved spots are the raw material.

### 8.1 Home cities

| City | First quarter (Level 1, today's six) | Second quarter (Level 6, slice 5) | Third quarter (Level 10, the station) |
|---|---|---|---|
| **Duskwall** | **The Fortress**: Fortress Gate, Customs Market, Beacon House, State Archives, Goods Yard, Rampart Row | **The Pass**: the frontier checkpoint (`ministry`), the mountain inn (`bar`), the sawmill and timber yards (`factory-gate`), the lock-up at the checkpoint (`jail`), the infirmary (`hospital`) — the road up, where the frontier is shut or opened | **The Town**: Duskwall station (`station`), the town square and church (`square`), the Signal Lamp (`bar`), the brewery (`factory-gate`) — the civilian town below the line |
| **Ashford** | **The College**: Gazette House, Assembly Rooms, University Quad, the Courts, Bridge Street, Weavers' Row | **The Wharf**: the wharf and boat club (`docks`), the brewery (`factory-gate`), the cattle market (`market`), the county infirmary (`hospital`), the police station by the lower bridge (`jail`) — the lower town across the river | **Station Road**: Ashford station (`station`), the town hall (`square`), the Corn Exchange (`market`), the theatre (`theatre`), the park and bandstand (`square`), the Press Club (`bar`) — the respectable town |

Duskwall's Pass is where slice 5's hostile-ground arrivals meet the checkpoint; its lock-up is the customs' cells, civic (policy §7.3). Both cities' second quarters carry the infirmary and the cells for the same reason Coalport's Harbour does.

### 8.2 Irongate: the districts are the quarters

The capital overview carries five district plates (brief §8.2); each district has one quarter map, which is the district map the brief already specifies (§8.4–8.8), with 5–6 places in its core box and reserved spots in its ring. **A district does not get sub-quarters in the MVP.** When a district outgrows six places (the Station's goods yards, Eastside's canal basin and gasworks, the Quarter's national bank are the likely first additions), it gets a second quarter map under the same district meter, council seats and Issues; the plate on the capital overview stays one per district and the district's own quarter bar lists two (Appendix C #41). Level gates do not apply inside the capital: a visitor is Level 10 by definition.

### 8.3 Clearwater (slice 7; provisional, with its six provisional places)

| Quarter | Places (provisional ids from the brief §9.3) |
|---|---|
| **The Front** | The Promenade, the Casino, the Lido (`square`), the pier hotel (`hotel`) — the society slope and the water |
| **The Depot** | Tram Depot, Back Lane Market, The Rows, St Martin's (`square`; survey id `clearwater.st-martins`), the sanatorium (`hospital`) — the working town |
| **The Harbour** | The Harbour, the cannery (`factory-gate`), Clearwater station (`station`), the harbour police (`jail`) |

Clearwater's first-quarter question (which quarter a visitor lands in) is the station's, as everywhere: The Harbour.

**St Martin's** (renamed 2 Oct 2026 from "the tin chapel": the painted church is stone, with a green copper spire, above the tram sheds at 0.55, 0.22 of the city picture). Blurb for its slice: *The working town's church: a stone nave and a green copper spire above the tram sheds. The bell goes at six for the early shift and at noon for the market.* Kind `square`; its role is the same as St Barbara's in Coalport: a speech at the church door after the service, CHA social missions, the one pulpit in the working town the Alliance can speak from.

### 8.4 The nation map: more distance

- **Smaller cities, longer lines.** Each city is drawn at about **6 % of the width** (250 px at 4096) instead of the current 10–12 %, so the gaps between them are three to four city-widths of countryside. The five pins keep the brief's §10.1 fractions; the route overlay follows the painted track as today.
- **Halts as scenery.** Three or four small halts on every line (a village with a church tower, a station building, a water tower, a level crossing), a junction outside the capital, farms in strips, a monastery, a quarry, a dam, forests, cliffs and a lighthouse on the coast. No pins, no names on the art.
- **Travel times stay** at 12 / 15 / 25 minutes (Appendix C #8 is unchanged). Optional, for a later slice and no rule: the journey screen's progress marker could name the halts it passes (*Passing Weir Halt*), from a per-line list of three or four invented names; nothing in slice 4 needs it.
- The revised nation prompt is in the brief's §10.2.

---

## 9. For the architect: the shape of the data (a proposal)

Content, not rules; the architect decides the final shape in the slice-4 tech design.

- `city.overview { day, night, size }` replaces `city.map`; `city.quarters[]`: `{ id, name, blurb, opensAt: { level }, plate: { x, y }, footprint: { left, top, width, height }, map: { day, night, size }, nightLine? }`; `location.quarterId`; `location.map { x, y }` becomes a fraction of the **quarter's** image. For Irongate, `district` carries the quarter fields (`plate`, `footprint`, `map`) alongside its political fields, as the brief's knock-on already says; `quarters` is absent.
- `character.quarterByCity` is **not** stored: the quarter you are in is a client memory (`localStorage`), defaulting to the station's quarter on arrival and the first quarter otherwise. Nothing on the server reads it.
- The lock is computed from `character.level` against `opensAt.level`, with the "services find you" override as a per-character set `openedQuarters` written when a service admits the character; a quarter whose slice has not shipped has `opensAt.edition` set and reads *Opens with a later edition*.
- Asset pipeline: the overview and the quarters are square 6144 masters with the brief's derivatives; a quarter's `size` is recorded as the city map's is today.

---

## 10. Edits made with this change

| Where | Edit |
|---|---|
| GDD §0 | A change row for city quarters (1 Oct 2026) |
| GDD §14.9 | The "On the map" bullet: the capital is an overview with five plates and five district maps; districts are the capital's quarters; `irongate-closeup.png` retired |
| GDD §14.13 (new) | Quarters: the chain, landing, the quarter bar, the Level gates 1 / 6 / 10, services find you, visitors, never relocks, growth and reserved spots, quarters are not political units |
| GDD §13.5 | A line: Coalport's long-run list uses existing kinds only |
| GDD Appendix C | #38 the quarter gates (6 / 10) · #39 the stitched giant map · #40 Clearwater's six provisional places · #41 districts beyond six places |
| `docs/art/map-brief.md` | §0 order of work, §1, §2, §4 (rewritten for the overview and three quarters), §5 (quarter light lines), §6–§9 (quarter-plan notes), §10 (the nation's scale and prompt), §11 (checks 13–16), §12 (knock-ons) |
| 2 Oct 2026 (maps v3) | §4 marked superseded by the painted art and `pins.json`; St Barbara's blurb and position rewritten for the drawn church (§2.3, §3, §4.4); Clearwater's tin chapel renamed St Martin's with a blurb (§8.3); the map alt texts redrafted in `packages/content/src/data/art.ts` (`mapAlt`) |

Nothing in `docs/economy.md` moves: a quarter opening pays nothing and costs nothing. The plain-words rule and the content policy were applied to every name and blurb in §3. Faction naming stays parked.
