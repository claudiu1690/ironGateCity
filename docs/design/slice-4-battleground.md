# Slice 4 — "The battleground": travel, Irongate's districts, residence, the three-way count, Issues and the ledger

> **Revised 2 Oct 2026 for maps v3, the wage and plain words.** Three things changed since this was written on 29 Sep: (1) **the maps**: the capital is one painted picture (11,520 px) and each district is a *frame* on it; every pin is the survey pin in `packages/content/src/data/mapPins.ts`; the nation is a painted 9,216 px picture with the five cities at `mapPins.nation` (§2.1, §4.2, §4.3; `docs/design/maps-v3-integration.md`, incl. §11 Review 3: the map fills the screen, drag within a quarter, the Places list); (2) **the job is a wage** (review 1): the three shift actions, streaks and half pay are gone (§2.4, §4.4–4.6, §7.3); (3) **plain words and no odds maths** (review 2, GDD §1.5, §8.4): every string a player reads below is in everyday words (*close race*, *comeback*, *Party XP*, *Political Capital*, *the scoreboard*, *points*, *vote*, *the result*, *candidates*, *backers*, *council rule*, *rival ground*); a ticket or a card row shows an odds **word** and the stat, never a percentage or a check. Rule prose keeps the design's terms (battleground, momentum, the ledger, ballots) because those are the systems' names; percentages in rule prose are design maths. The screens are in `docs/design/slice-4-screens.md` (rewritten the same day).

Game designer, 29 Sep 2026; revised 2 Oct 2026. Companion to `docs/design/slice-4-screens.md` (the screen specs) and `docs/economy.md` §15. The architect writes the slice-4 tech design from these two documents; every rule and number here is also in the GDD (edits listed in §16).

**Playtest question:** do players choose to move to the capital, and does the three-way fight feel alive?

**Rules this design obeys:** one tap or one choice everywhere (pillar 7); a journey runs in the background and a player who closes the game arrives anyway; Issues resolve at a boundary, never at a clock time; being away costs opportunity, never assets (a journey, a move and a room never destroy anything a player owns); the check formula is untouched (§8.4: difficulty 10 in Irongate, +5 % in a battleground district); campaign vocabulary only (*battleground* and *groundswell* are campaign words; nothing here is a front, a war or an uprising); the Vanguard is a party with a committee and Garrison Hill is a place name, not a garrison (`docs/design/content-policy-review.md` §7); British English, 1946, noir, short: every outcome text is at most 240 characters and four sentences.

---

## 1. The design in one paragraph

At **Level 10** the Map tab gains a **nation map**: the painted republic, five cities on painted railways through the capital, each a pin with its journey time and fare and a card behind it. **Boarding is one tap and 20 Iron**; the train runs **12–25 real minutes in the background** and on about one trip in three a **journey card** offers one optional choice. **Irongate** is one painted picture and five **districts**, each a frame on it with its own opinion meter, five or six places, and a **Battleground** or **Groundswell** state computed at the day boundary; trams between districts are instant and free. A Rank 2 player standing in a district can **register as a resident** there for 500 Iron (seven days between moves): from then on they vote in that district's **three-way council race** (two seats per district, ten in the capital, seats split by a score that is half ballots and half opinion), read the *Irongate Herald*, and get the capital's Party orders. Every Monday each city draws **two Issues of the Week**; tagged actions swing opinion +50 % and add **momentum**; on Sunday night the leading faction **owns** the Issue: +3 opinion, a headline, 4 Political Capital each for its top five and a bounded city effect for the week. Every swing is written to an **influence ledger**, and at each Irongate count the top contributor in each district and level bracket is **District Hero**: a title, 25 Political Capital and their name in print.

---

## 2. Travel

### 2.1 The nation map (revised 2 Oct 2026 for the painted picture)

The Map tab has two levels from Level 10: **Nation** and **City**. Below Level 10 the nation map is visible but every city card reads *From Level 10*; the paper says when (`hl.*.train-open`).

**The picture.** `map.nation.day` / `map.nation.night`: `maps-v3/nation-day-9216.png` and `-night-`, **9,216 × 9,216**, tiled (`tiles.json` already carries both; the stills are catalogued in `art.ts` by this slice with a measured budget, ADR 0015; the alt texts are written there). The night picture shows 20:00–06:00 UTC as the city maps do. The whole republic is painted at once: **Ashford** top left (the college's green dome above a river bend), **Duskwall** top right in the mountains (walls on a crag under snow; its line comes in over a stone viaduct and out of a tunnel), **Irongate** in the centre (the Parliament dome, the station's glass roof, the river and its bridges), **Coalport** bottom left on the coast (chimneys, the harbour mole and its lighthouse), **Clearwater** bottom right on its lake (the domed casino, the pier, sailing boats). The railways are **painted**, with trains on them, halts, villages and church towers between the towns: no overlay line is drawn any more (the pen art needed one; this does not), and a locked destination is marked on its card, not by dashing a line.

**The cities** are the five survey pins of `mapPins.nation` (fractions of the picture, user-approved 2 Oct 2026); the content test keeps the game's copy equal to the survey:

| City | x, y | On the card (the line under the name) |
|---|---|---|
| Irongate | 0.52, 0.53 | *Capital · 5 districts · contested* |
| Ashford | 0.12, 0.17 | *Home city of the Alliance* |
| Duskwall | 0.88, 0.25 | *Home city of the Vanguard* |
| Coalport | 0.18, 0.80 | *Home city of the Collective* |
| Clearwater | 0.88, 0.85 | *Contested · no service yet* |

**What the player sees and does** (the review-3 rules of `maps-v3-integration.md` §11, applied to the nation):

- **The map fills the screen** (decided 2 Oct 2026, the user decided: the nation map behaves like the city maps on a phone; Appendix C #42 closed). The picture is never zoomed out past the point where it covers the map box (no bands). So on an upright phone the at-rest view shows about three-quarters of the republic's width; on a wide desktop about half its height. **At rest the view is centred so that your city and the capital are both on screen** (the farthest pair, Ashford–Irongate, spans 0.40 of the width and 0.36 of the height, which always fits); the other cities are **a drag away**. In transit the view centres on the line being travelled.
- **Drag, no free zoom.** The player can drag the map anywhere within the picture (its edge never shows); there is no pinch, wheel or double-tap zoom. The dragged view is kept while the screen is open.
- **A city is a pin:** an ink disc with the city's name beside it in Oswald caps (*Coalport · 12 min*; the capital *Irongate*; a locked city at 60 % opacity with its lock word, *rival ground* or *no service yet*). The city you are in is inverted (paper on ink) and carries *you are here*. Pins are far apart (0.43–0.54 of the picture between any city and the capital), so nothing ever overlaps.
- **Tap a city** (the pin, or a row in the **Cities** list): the map **zooms onto the town** with the same zoom a place gets in a city (2.5 × the view that shows every city, between 1.6 × and 3 ×, never past native), and the **city card** opens as the sheet (§2.4's *Board* button lives there). Closing the card returns to the view the player had dragged to. On desktop the card is the side sheet and the zoom is the same.
- **The Cities list** is the Places pattern (`maps-v3-integration.md` §11.3): a pill at the top right (above the tab bar on an upright phone), *Cities*, opening a list of the five in a fixed order (the capital, then your home city, then the other three), each row the name, its line and its time and fare (*12 min · 20 Iron*), locked rows with their lock word. A row does what the pin does. It exists so that a city a drag away is always one tap away.
- **Where you are** is said twice: the inverted pin, and the top bar's subtitle (*Coalport · home* / *Irongate · Station & Market* / *On the train to Irongate*).

Nothing on the nation map costs anything or moves any number; it is a picture with five doors in it.

### 2.2 Routes, times and fares (§14.10, pinned for slice 4)

| Leg | Third class | Fare |
|---|---|---|
| Irongate ↔ Ashford | 12 min | 20 Iron |
| Irongate ↔ Coalport | 12 min | 20 Iron |
| Irongate ↔ Duskwall | 15 min | 20 Iron |
| Irongate ↔ Clearwater | 25 min | 20 Iron (not in slice 4) |
| Outer city ↔ outer city | the two legs added (24–27 min) | one fare, 20 Iron |

- **Third class only** in slice 4. First class, the car and the night train are after the MVP (plan §4), and the GDD table stays as the roadmap.
- **A journey costs a ticket and time, never Energy.** Energy keeps refilling on the way; Rested banks as usual.
- **Fare modifiers** (each a bounded line on the ticket): the Tram Subsidy ordinance and the Tram Fare Hike Issue effect each halve tickets **from** the city they apply to; the fare never falls below **5 Iron**. Weather (snow +25 % time) and laws (Open Borders) arrive with their systems.
- **Journey times: 12 / 12 / 15 / 25, decided (2 Oct 2026, the user decided).** The planned times stay, not the painted distances; Appendix C #8 is closed. The playtest still measures journey-screen dwell (wait, or close and come back?) as a measurement, not as an open question.
- **Checked against the painted nation (2 Oct 2026).** Straight-line distances from the capital on the picture: Ashford **0.54** of the width, Clearwater **0.48**, Duskwall **0.46**, Coalport **0.43**; the painted lines are longer than the straight lines (the Ashford line loops out west, the Duskwall line climbs through a tunnel and over a viaduct, the Clearwater line bends round the lake), so the drawn journeys read as *Ashford ≥ Clearwater ≈ Duskwall > Coalport*. The table does not quite match: Clearwater's 25 is far longer than its drawn distance and Ashford's 12 is shorter than Duskwall's 15 for a longer line. **The table was kept (the user decided, 2 Oct 2026)**: Clearwater is not in play, dwell is measured first, and equal times for the three home cities are fairer to the three factions than times that follow the art (a Collective member's round trip home would otherwise be six minutes shorter than an Alliance member's). The art-following set (Coalport 12 · Ashford 15 · Duskwall 15 · Clearwater 20) is recorded here only for the record; the GDD table is the one place to change if it is ever wanted. The art also paints a **southern line between Coalport and Clearwater** that does not pass through the capital: in slice 4 it is scenery (every route runs through the capital, §14.10); slice 7 decides whether it carries a direct service. Recorded in GDD Appendix C #8.

### 2.3 Who can go where (slice 4)

| Destination | Slice 4 |
|---|---|
| **Irongate** | Open to everyone from Level 10 |
| **Your own home city** | Open (the way back) |
| A rival home city | On the map with its time, **locked**: *Rival ground · from a later edition* (slice 5 builds the +4 difficulty, the checkpoint deck and encounters; without them a rival could canvass Duskwall for free) |
| Clearwater | On the map, **locked**: *No service yet* (slice 7) |

A locked city's pin is tappable and its card shows the line, who holds it and the lock word; the Board button is absent, not disabled.

### 2.4 Boarding, the journey and arrival

- **Board** is one tap on the destination's card on the nation map (*Board · 20 Iron · 12 min*) or on the station pin's Trains card in the city (Central Station in Irongate: *Board the train to Coalport · 20 Iron · 12 min*). In slice 4 those are the only two doors: the home cities' station quarters (Coalport's Sidings first) are a later content addendum, not slice 4 (the user decided, 2 Oct 2026; §14.13), so at home a player boards from the nation map. The train **leaves when you tap**: there is no departure time to wait for and nothing to cancel. Not enough Iron: *Needs 20 Iron*, disabled, the slice-1 pattern.
- The character gets a **journey** `{ from, to, boardedAt, arrivesAt, event? }` and `currentCityId` becomes `null` (in transit) until arrival. Arrival is **lazy**: any read at or after `arrivesAt` settles the journey (sets `currentCityId`, clears the journey, records the arrival for the paper). No scheduled job is needed for a journey, because nothing happens at arrival that a player is not present for; the architect may add one for tidiness (§17 Q2).
- **You can close the game.** The journey screen says so in one line (mockup `MobileJourney.dc.html`): *You can close the game. You'll arrive either way, and Energy keeps refilling on the way.*
- **Where you can act.** Energy actions and training are available **only in the city you are in**; in transit none of them is. **Political acts** (the vote, backing, standing, withdrawing, putting forward a rule, the council's vote) belong to your residence and work from **anywhere**, in transit included, since they are cast from the paper and the Election card. The paper, the Me tab and the nation map are always readable. So a Coalport resident visiting Irongate still votes in Coalport from the Clarion, and a capital resident on the train home still votes in Eastside.
- **Your job while away:** a job is a wage (§9, review 1): the full daily pay lands at every boundary wherever you are, seniority keeps counting, and there is no shift to miss. Travel costs a ticket and nothing else.
- **Arrival** shows one modal (`ResultModal` kind `journey`): stamp **Arrived**, the destination's name, the journey card's outcome if one was answered, and **Continue** into the city: in Irongate, the **Station & Market** district view with the Central Station pin selected; in a home city, the city map.
- **A journey card** (§3) is drawn at boarding on the **first journey a character ever makes, always**, and afterwards on **one journey in three** (seeded per journey). It can be answered any time during the journey and on the arrival modal; the moment the player leaves the arrival modal unanswered, they *slept through it*: nothing happens, which the card says before any tap.

### 2.5 Presence and chat on the train

Slice 6. The mockup's *Fellow travellers* and carriage chat are left out; if a count of other characters on the same leg within the same ten minutes is cheap, the journey screen may show *You and 2 others on this train* with nothing tappable.

---

## 3. The seven journey events

Every card: one setup (≤ 240 characters), two or three choices, each with a detail line that names its rewards, one outcome text per result (≤ 240), and the ignore line. Checks use the §8.4 formula at **difficulty 10** with the stat named and the player's Standing in the *destination* city; a card **never fails**: Success or Partial, like tier 1. **What the row shows (review 2):** the client prefixes the detail line with the odds **word** from the server's chance (*Good odds · Agility · opinion +0.05 in Coalport · +5 Party XP*); no percentage, roll or check appears, and a Partial row gets the one-line reason of `review-2-answers.md` §2.4. The detail lines below are the content strings; the stat names are written in full. A card pays at most what a 10-Energy action pays (45 XP / 6 Party XP / 40 Iron / 0.05 opinion) and costs no Energy. Opinion from a card goes to the **destination**: the city meter for a home city, the **Station & Market** district for Irongate (the train comes in there). *The destination's first Issue* is the first of the two drawn there this week. Nothing here uses Heat, the Dossier, items or encounters; where the GDD's version does, the slice that builds it is named. Ids `jev.*`; a `journeyEvents[]` section in content.

### 3.1 A talkative passenger (`jev.passenger`) — the first journey always draws this one

*The man opposite has a Herald, a flask and no intention of reading. "Capital, is it? Five districts, three parties, and a tram that goes round in circles. Which are you?" He has already guessed.*

| Choice | Detail line | Outcome |
|---|---|---|
| **Talk politics with him** | Charisma and Intelligence · +6 Party XP · opinion +0.03 in {destination} | Success — *He'll think about it* — By the second tunnel he has your flyer folded in the Herald and is arguing your side with the woman by the door. "I'm not saying you're right," he says at the station. "I'm saying I'll think about it." · Partial (+3 Party XP, +0.015) — *He talks you into a corner* — He knows the tram fares to the halfpenny and the names of every councillor since the war. You hold your own for a stop and a half. He takes the flyer anyway, for the crossword on the back. |
| **Let him talk** | +14 XP | *Five districts, explained* — You let him run. Who holds the Hill, which paper the Quays read, why nothing ever passes in the Government Quarter. By the last bridge you know the capital better than most people who live in it. |
| *Ignore* | Nothing happens | *You nod at the window until he gives up. You arrive as you left.* |

### 3.2 Flyers on the seats (`jev.leaflets`)

*Somebody has been through the carriage before you: a rival's flyer on every seat, still warm from the press. Your own bag has forty in it and the conductor is two carriages away.*

| Choice | Detail line | Outcome |
|---|---|---|
| **Swap them for yours** | Agility · opinion +0.05 in {destination} · +5 Party XP | Success — *Forty seats, forty flyers* — You work the carriage between stations, theirs into your bag and yours onto the seat. Nobody looks up from a newspaper. The train pulls in with a different opinion on every seat. · Partial (+0.025, +2 Party XP) — *Half the carriage* — You get to the middle door before the conductor comes through and have to sit down with a lap full of somebody else's paper. Half the seats are yours. Half is half. |
| **Read theirs** | +14 XP | *Know the other side* — You read it twice. It's not bad: short sentences, one promise, a name at the bottom. You'll write a better one. You leave it on the seat for the next passenger to argue with. |
| *Ignore* | | *You leave them where they are. Paper is only paper.* |

### 3.3 The parcel (`jev.parcel`)

*The man in the grey coat folds his paper. "Someone will meet the train and ask for this. Fifty marks now, fifty when it's collected. Don't open it." The parcel is heavier than it looks.*

| Choice | Detail line | Outcome |
|---|---|---|
| **Carry it** | +50 Iron now · Agility at the barrier for 50 more | Success — *A boy in a cloth cap* — You walk it through the barrier under your coat. On the platform a boy asks for "Uncle Tomas's shoes" and hands you the other fifty. The parcel was heavier than shoes. You don't ask. · Partial (nothing more) — *The inspector has a good eye* — The station inspector at the barrier asks what's under your coat, and it's easier to give it up than to explain. Fifty marks for carrying a parcel to a barrier. The man in the grey coat is nowhere. |
| **Hand it to the guard** | +14 XP | *The guard writes something down* — The guard takes it without a word and writes in his book. You get a long look at the man in grey as he leaves at the next stop, hat down, not hurrying. You'll know him again. |
| **Open it when he steps out** | Intelligence · +5 points on {issue} for your party · +14 XP | Success — *Pamphlets* — Pamphlets, printed cheap, about {issue}, in a rival's name and worse than they'd ever put their name to. Somebody wants the argument to turn ugly. You take one for the branch and tie the string the way it was. · Partial (+7 XP) — *String* — The knot is a sailor's and the man is back before you're through it. You've seen the corner of a printed sheet and nothing else. He takes the parcel back with a look and gets off at the halt. |
| *Ignore* | | *You sleep through it. The parcel and the man leave at the halt.* |

Stubbed: in slice 5 the Partial on *Carry it* adds **+10 Heat** (the mockup's line); in slice 8 *Hand it to the guard* adds a Dossier entry on the man in grey. Neither exists yet and the card says neither.

### 3.4 The card school (`jev.cards`)

*Three commercial travellers and a folded newspaper for a table. "Fourth hand? Small stakes." The one dealing has done this before. So have you, once or twice.*

| Choice | Detail line | Outcome |
|---|---|---|
| **Sit in** | Stake 20 Iron · Intelligence · win 40 | Success — *A good hand at the right stop* — You lose the first two and remember the third. By the viaduct the dealer has stopped smiling and you are twenty marks up. You stand at the next stop, while it's still friendly. · Partial (the stake back) — *Honours even* — Two up, two down, and the dealer calls it at the viaduct before anybody's luck changes. You get your stake back and a card school's nod. Another day. |
| **Watch the game** | +7 XP | *How it's done* — You watch the dealer's hands instead of the cards. Nothing crooked, just fast, and a way of talking that keeps the other two from counting. Worth knowing. |
| *Ignore* | | *You keep your money in your pocket. The dealer wins, as dealers do.* |

*Sit in* needs 20 Iron (*Needs 20 Iron* otherwise). The stake is the only Iron a card can ever take, and it is returned on Partial: no card costs a player anything they did not put on the table.

### 3.5 The reporter (`jev.reporter`)

*The young woman with the satchel is from the Herald and out of copy. "You're a party person. Give me a line on {issue} and I'll give you a name in tomorrow's paper." Her pencil is already moving.*

| Choice | Detail line | Outcome |
|---|---|---|
| **Give her a line** | Charisma and Intelligence · +10 points on {issue} · your name in the Herald | Success — *Quoted* — You give her one sentence and she writes it down whole, which almost never happens. "Tomorrow's edition, page two, if the sub doesn't cut it." He doesn't. · Partial (+5 points, no line) — *Paraphrased* — You give her three sentences and she keeps the weakest half of one. It's roughly what you meant. The branch's name is spelled right, which is the main thing. |
| **Give her the flyer** | +3 Party XP | *For the file* — "No comment, but this says it better." She reads it on the spot and puts it in the satchel. Reporters keep everything. That one will turn up. |
| *Ignore* | | *You say you're not a party person. She doesn't believe you, and moves on.* |

The In Print line (Success only) is `hl.quoted` in the next edition: **{name} Quoted in the Herald on {issue}** · *"One sentence, printed whole," says the reporter. The branch has cut it out.* The reporter is the unassigned portrait `adler.png` reserved in slice 2; she is not a Dossier NPC yet.

### 3.6 The signal stop (`jev.signal`)

*The train stops at a halt outside the city and stays stopped. "Signal," says the guard, which means nobody knows. The waiting room is full of people going the same way as you.*

| Choice | Detail line | Outcome |
|---|---|---|
| **Work the waiting room** | Intelligence · opinion +0.05 in {destination} · +6 Party XP | Success — *A captive audience* — Thirty people, one stove and nowhere to go. You work the benches with the flyer and the timetable. By the time the signal drops, the waiting room has an opinion it didn't have before. · Partial (+0.025, +3 Party XP) — *The signal drops early* — You've done one bench when the guard shouts and the room empties for the train. A few flyers go into coat pockets. One woman says she'll read it if the train's slow, which it is. |
| **Doze** | +10 Rested | *A quarter of an hour* — You put your hat over your eyes and let the halt happen without you. The guard wakes you when the signal drops. Fifteen minutes you didn't know you needed. |
| *Ignore* | | *You stare at the signal until it changes. The train goes on.* |

The halt is fiction: the journey's `arrivesAt` never changes. Rested from a card banks to the same pool and cap as overflow Energy.

### 3.7 The boy without a ticket (`jev.boy`)

*The boy across the aisle has no ticket and the inspector is one carriage away. He isn't asking anyone. He's looking at the door and doing sums.*

| Choice | Detail line | Outcome |
|---|---|---|
| **Pay his fare** | 10 Iron · opinion +0.02 in {destination} · +3 Party XP | *His whole stair will hear* — Ten marks to the inspector and a name to the boy: your party's. He lives on a stair with twelve families and a mother who talks. By Sunday the whole stair knows which party paid. |
| **Show him the lavatory** | Agility · +14 XP | Success — *The oldest trick on the line* — You give him the nod and the timing, and he's behind the lavatory door as the inspector reaches your seat. Two stations on he's out, unseen, and off at the halt with a grin. · Partial (nothing) — *The inspector knows the trick* — The inspector tries the door on his way through, as inspectors do. The boy is put off at the halt with a warning and no fare. You keep your seat and your face straight. |
| *Ignore* | | *You read your paper. The inspector does his job.* |

*Pay his fare* needs 10 Iron. Every card above is on any third-class journey; the deck is drawn without replacement until all seven have been seen, then reshuffled, so a player meets every card before any repeats.

---

## 4. Irongate

| | |
|---|---|
| City | `irongate`, `role: 'battleground'`, no home faction. Five districts (§4.2), each with its own opinion meter; the city's opinion for the plate and, from slice 7, National Control is the **equal average of the five** (Appendix C #9 closed: equal weights for the MVP) |
| Character (§14.1) | The political heart: Parliament and the ministries on the hill, the old town under the basilica, the station and the market in the middle, the river with its cranes on the east bank, the citadel and the villas to the south-west; every faction's capital office is here |
| Map | **One painted picture** (maps v3, §14.13): `map.irongate.day` / `.night`, `maps-v3/irongate-day-11520.png`, **11,520 × 11,520**, tiled (in `tiles.json`; the stills catalogued by this slice, alt texts in `art.ts`). **The picture serves both levels**: the district overview is the whole picture zoomed out with five district pins and no place pins; a district view is the same picture through the district's **frame** (§4.2), with the district's place pins. Every pin is a fraction of the capital's picture, from `mapPins.irongate` (§4.3). The pen-and-ink `irongate-districts.png` and `irongate-closeup.png` are retired |
| Paper | ***The Irongate Herald*** · short name *Herald* · strapline *All the republic, every morning* · 6 marks (§3.3). The paper of every capital resident and of every visitor while in the city. Voice: the paper of record, dry, metropolitan, faintly amused by all three parties |
| Difficulty | **10** on every tier-1 check (§8.4), **+5 %** on political checks in a battleground district (§6.3) |
| Secretaries | The three faction secretaries (Holm, Stahl, Grey) set the capital rotation of Party orders (§12); there is no fourth NPC |
| Council | Ten seats, two per district, cycle offset 0 (§9) |
| Jobs | Three (§4.5): Porter at Central Station (180), Street vendor at Market Square (100), Driver at Riverside Quays (200). No faction pays a fifth more here: the +20 % is a home-city perk. A job is a wage (§9): there are no shift actions |

### 4.1 The districts and their baselines (§14.9, §14.11 pinned)

| Id | District | Character | Baseline V / C / A / N | At the start |
|---|---|---|---|---|
| `irongate.government-quarter` | Government Quarter | White stone and green copper: Parliament, the ministries, the court, the opera and the lawyers between them | 20 / 20 / 20 / 40 | **Battleground** (three within ten). Nobody holds it |
| `irongate.old-town` | Old Town | Cobbles, cafés, the basilica, the Herald and the Press Club; the Alliance's ground | 15 / 15 / 35 / 35 | Leans Alliance; not a battleground until a rival closes within ten |
| `irongate.station-market` | Station & Market | Every train in the republic ends here: crowds, trams, traders, hotels and the bombed blocks behind the market | 20 / 20 / 20 / 40 | **Battleground** |
| `irongate.eastside` | Eastside | The cranes, the works, the quays and the tenements on the far bank; the Collective's ground | 15 / 35 / 15 / 35 | Leans Collective |
| `irongate.garrison-hill` | Garrison Hill | The old citadel, now police headquarters, the esplanade below it and the villas behind their walls; the Vanguard's ground | 35 / 15 / 15 / 35 | Leans Vanguard |

**Control** (§14.3) is above 50 in a district; nobody has it at the start, and in slice 4 control changes only the plate's word (*Held by the Collective*) and the Groundswell rule: the police, prices and safehouses it governs arrive with Heat (slice 5). The **district borders and states are an overlay** on the neutral art; the map is never repainted.

### 4.2 District frames (revised 2 Oct 2026; replaces the crops measured on the retired image)

A district is a **frame** on the capital's picture, `{ x0, y0, x1, y1 }` in fractions, exactly as a home-city quarter is (`maps-v3-integration.md` §2; the `Quarter` schema). Each frame is **its pins' bounding box grown by 0.06 on every side and clamped to the picture**, the rule the three home quarters used, then checked against the art (`pins/irongate-pins.jpg`). The developer writes these values into content; the designer may tune them in the dev viewer, keeping every pin at least 0.02 inside its frame (the content test).

| District (id) | Pins' box (x, y) | **Frame x0, y0, x1, y1** | What the frame shows on the painting |
|---|---|---|---|
| Government Quarter (`irongate.government-quarter`) | 0.46–0.66, 0.24–0.37 | **0.40, 0.18, 0.72, 0.43** | The green dome of Parliament with the Forecourt on the river bank below it, the formal gardens and the three ministry blocks above, the red-roofed court, the Opera's colonnade at the right, the lawyers' streets between |
| Old Town (`irongate.old-town`) | 0.12–0.37, 0.13–0.32 | **0.06, 0.07, 0.43, 0.38** | The twin-spired church and the domed basilica, the lanes and cafés on the slope, the long roofs of Herald House by the river, St Agnes under its spire, Concord House at the top left |
| Station & Market (`irongate.station-market`) | 0.35–0.555, 0.555–0.68 | **0.29, 0.49, 0.62, 0.74** | The three glass arches of Central Station and its fan of track, the market's striped awnings, the Grand Hotel at the junction, the round garden where the trams cross, the gutted block behind the market (painted at about x 0.53–0.59, y 0.59–0.66; the pin moved onto it on 2 Oct, from 0.56, 0.645 to 0.555, 0.62, frame unchanged) |
| Eastside (`irongate.eastside`) | 0.56–0.92, 0.50–0.72 | **0.50, 0.44, 0.98, 0.78** | The Iron Bridge at the top, the quays' cranes and barges, the ironworks' chimneys, the tenements of Foundry Row, the Red Lantern at the water's edge at the far right |
| Garrison Hill (`irongate.garrison-hill`) | 0.78–0.91, 0.07–0.27 | **0.72, 0.01, 0.97, 0.33** | The wooded hill at the top right: the long citadel building (police headquarters) on its crag, the Esplanade below the walls, the villas among the trees, Vanguard House's quadrangle at the summit |

**How the frame behaves** (review 3): at rest the district view covers the map box (never a dark band), the player may **drag within the frame** (the frame plus 10 %, always inside the picture), there is no free zoom, a tap on a pin zooms into the place (2.5 × the fitted view, between 1.6 × and 3 ×), and the **Places** list names the district's places in pin order. On an upright phone the frame's height sets the scale, so a wide frame (Eastside 0.48 wide, Old Town 0.37) shows its middle at rest and its ends a drag or a Places tap away; that is the intended behaviour, not a defect.

**Crowding check (the station district).** Pins must stay **44 px apart** at the frame's scale on a **360 px-wide phone**. The scale at rest is at least `360 ÷ frame width` CSS px of picture, more when the box is taller than the frame's shape (every upright phone). Closest pairs per district, at that floor and on an upright 360 × 640 phone (map box about 480 px tall):

| District | Closest pins | Apart (fraction) | At the floor | Upright 360 px phone |
|---|---|---|---|---|
| Government Quarter | Parliament, the Forecourt | 0.051 | 57 px | 98 px |
| Old Town | Concord House, Lantern Lane | 0.076 | 74 px | 118 px |
| **Station & Market** | **Market Square, the Grand Hotel** (then the Station Buffet and Central Station at 0.058; the Bombed Blocks and Market Square at 0.070 after the move) | **0.047** | **51 px** | **92 px** |
| Eastside | the Quays, the Ironworks Gate | 0.12 | 90 px | 170 px |
| Garrison Hill | Vanguard House, the Villas | 0.078 | 112 px | 117 px |

So no district needs the Places list to separate its pins; it is there for pins a drag away. Two notes for the developer: **a district view draws only its own district's pins** (Union House, Eastside's HQ at 0.56, 0.66, is 0.04 of the picture, about 460 px on the master, from the Bombed Blocks at 0.555, 0.62 across the district line: 44 px apart only at a scale below any district view's floor; the overview draws no place pins, so they never meet on one screen); and Garrison Hill's frame touches the picture's top edge, so Vanguard House (y 0.07) relies on the phone's opaque plate band being an inset (`hideTop`), as Coalport's Foundry Row does.

**Room for later districts.** The survey leaves the **bottom band of the picture unassigned**: y 0.74–1.00 across the whole width (the southern town: a big spired church at about 0.47, 0.78, a domed hall at 0.30, 0.75, a glasshouse in a park at 0.80, 0.86), plus the west edge (x < 0.06) and the top-centre fields (x 0.45–0.75, y < 0.18). A sixth district, or a second frame for a district that outgrows six places (Appendix C #41), is painted already and needs only pins.

### 4.3 Locations (29), with pins checked on the art

Kinds are from the §13.5 list plus **one new kind, `theatre`** (the opera; no scene yet, the map crop stands in). HQ locations carry `factionId`: their tickets are **members only** (a rival sees the pin, the blurb and *Members only* on each ticket; the `faction-hq` scene shows for members). **Every pin below is its survey pin from `mapPins.irongate`** (fractions of the capital's painted picture, measured on `irongate-C-big.png`, user-approved; the preview is `art-direction/maps-v3/pins/irongate-pins.jpg`); the content test keeps a location's `map` equal to its survey pin, and `quarterId` is the district id. The pin numbers (1–29) are the location order below and are unchanged.

**Government Quarter**

| # | Id | Name | Kind | x, y | Blurb (≤ 200) |
|---|---|---|---|---|---|
| 1 | `irongate.parliament` | Parliament | `parliament` | 0.53, 0.32 | The dome the whole republic argues under. The public gallery opens at ten; the lobby clerks know more than the deputies. |
| 2 | `irongate.forecourt` | The Forecourt | `square` | 0.52, 0.37 | The paved square before Parliament, a statue in the middle and a pool nobody sits by. Every tram in the Quarter stops here at one. |
| 3 | `irongate.ministries` | The Ministries | `ministry` | 0.46, 0.24 | Three stone blocks of clerks, one under scaffolding since the war. They come out at five, in order of seniority. |
| 4 | `irongate.supreme-court` | The Supreme Court | `court` | 0.57, 0.25 | The republic's highest court in a red-roofed quadrangle. The petitioners' queue forms at eight and moves at the law's pace. |
| 5 | `irongate.opera` | The Opera | `theatre` | 0.66, 0.34 | Columns, a pediment and a foyer where ministers are seen. The season opens Saturday and the boxes are spoken for. |
| 6 | `irongate.chancery-row` | Chancery Row | `street` | 0.62, 0.29 | The lawyers' chambers between the ministries and the opera. Brass plates, railings, and lobbyists who bill by the quarter hour. |

**Old Town**

| # | Id | Name | Kind | x, y | Blurb |
|---|---|---|---|---|---|
| 7 | `irongate.herald-house` | Herald House | `press` | 0.28, 0.32 | The long grey offices of the Irongate Herald. The presses run at four and the republic reads the result by seven. |
| 8 | `irongate.concord-house` | Concord House | `faction-hq` (Alliance) | 0.12, 0.13 | The Alliance's capital office, a red-roofed hall behind the basilica. Committee on the first floor; the founders on the stairs. |
| 9 | `irongate.basilica-square` | Basilica Square | `square` | 0.24, 0.23 | The square under the dome. Mass ends at eleven and the whole Old Town comes down the steps arguing. |
| 10 | `irongate.st-agnes` | St Agnes Hospital | `hospital` | 0.37, 0.31 | The sisters' hospital under the spire, forty beds and a queue of visitors at two. The porters carry what the sisters can't. |
| 11 | `irongate.lantern-lane` | Lantern Lane | `street` | 0.15, 0.2 | Cafés, bookshops and a lamp at every door. The Old Town reads here, out loud, over coffee it can't afford. |
| 12 | `irongate.press-club` | The Press Club | `bar` | 0.2, 0.3 | Where the Herald's reporters drink and the Alliance's lawyers listen. The Thursday debate is open to anyone who can hold the floor. |

**Station & Market**

| # | Id | Name | Kind | x, y | Blurb |
|---|---|---|---|---|---|
| 13 | `irongate.market-square` | Market Square | `market` | 0.49, 0.595 | Striped awnings round a column, bread, fish, bootlaces, and the tram queue that has an opinion on everything. |
| 14 | `irongate.tram-junction` | Tram Junction | `square` | 0.43, 0.68 | Every line in the capital crosses here. Trams to all five districts, instant and free, and a shelter on every corner for posters. |
| 15 | `irongate.central-station` | Central Station | `station` | 0.35, 0.555 | Three glass arches and every train in the republic. Arrivals at the barrier, porters on the platforms, the boards changing overhead. |
| 16 | `irongate.grand-hotel` | The Grand Hotel | `hotel` | 0.45, 0.62 | The tall stone hotel at the junction, where deputies dine and lobbyists wait in the lobby with a paper they aren't reading. |
| 17 | `irongate.bombed-blocks` | The Bombed Blocks | `street` | 0.555, 0.62 | The block behind the market the war gutted: roofless shells, a street of sound houses beside them. Repair crews by day, families in the sound halves, boards round the rest. |
| 18 | `irongate.station-buffet` | The Station Buffet | `bar` | 0.4, 0.585 | The buffet under the east arch: coffee at dawn, beer at midnight, and the night shift from three districts at the same tables. |

**Eastside**

| # | Id | Name | Kind | x, y | Blurb |
|---|---|---|---|---|---|
| 19 | `irongate.union-house` | Union House | `faction-hq` (Collective) | 0.56, 0.66 | The Collective's capital office, a yellow terrace above the quays. Committee upstairs; the duplicator never stops. |
| 20 | `irongate.riverside-quays` | Riverside Quays | `docks` | 0.68, 0.58 | Cranes, bales and barges on the east bank. The dockers eat on the bollards at noon and the lorries queue to the bridge. |
| 21 | `irongate.ironworks-gate` | The Ironworks Gate | `factory-gate` | 0.8, 0.6 | The gate of the works under the chimneys. Three shifts a day, and the wall beside it takes a poster well. |
| 22 | `irongate.red-lantern` | The Red Lantern | `bar` | 0.92, 0.66 | The dockers' bar at the end of the quays. A lamp, a piano nobody plays, and every rumour from the river. |
| 23 | `irongate.foundry-row` | Foundry Row | `street` | 0.7, 0.72 | Tenements four floors round a yard, between the works and the river. Washing lines, children, and a landlord who never comes. |
| 24 | `irongate.iron-bridge` | The Iron Bridge | `square` | 0.62, 0.5 | The lattice bridge the tram crosses. At the shift change the whole east bank walks over it, and a speech at the bridge end carries both ways. |

**Garrison Hill**

| # | Id | Name | Kind | x, y | Blurb |
|---|---|---|---|---|---|
| 25 | `irongate.vanguard-house` | Vanguard House | `faction-hq` (Vanguard) | 0.88, 0.07 | The Vanguard's capital office and club, a red quadrangle round a formal garden. Committee in the long room; the gymnasium in the wing. |
| 26 | `irongate.police-hq` | Police Headquarters | `ministry` | 0.78, 0.215 | The old citadel, now the republic's police headquarters. Permits at the gatehouse, a queue by nine, and a gazette on the wall. |
| 27 | `irongate.esplanade` | The Esplanade | `square` | 0.91, 0.17 | The open ground below the citadel walls. The town walks here on Sundays, the band plays at three, and the tram terminus is at the gate. |
| 28 | `irongate.villas` | The Villas | `street` | 0.82, 0.12 | Officials' villas behind garden walls on the road up the Hill. Bells, maids, and a view of the town they administer. |
| 29 | `irongate.gate-tavern` | The Gate Tavern | `bar` | 0.86, 0.27 | The tavern by the Hill Gate where the tram turns. Clerks from headquarters, gardeners from the villas, and talk that stops when you sit down. |

**Content-policy note.** The GDD's "old barracks" and "parade ground" (§14.9) are gone from the location list: the compound on the art is the **old citadel, now police headquarters** (the state's, not the party's), the open ground is **the Esplanade** (a civic walk), and no action is set in a barracks. *Garrison Hill* stays as the district's name, which the review judged acceptable as a place name.

### 4.4 Tier-1 actions (59; was 62 before the job became a wage)

Rewards are Success / Partial at the §5.5 rates by type and Energy (the table in `slice-2-cities.md` §1.2 applies unchanged: canvass 10 E 45 / 23 XP · 6 / 3 Party XP · 20 / 10 Iron · 0.05 / 0.025 opinion; speech 12 E 54 / 27 · 7 / 4 · 24 / 12 · 0.06 / 0.03; propaganda 8 E 36 / 18 · 5 / 2 · 16 / 8 · 0.04 / 0.02; council 10 E 45 / 23 · 9 / 5 · 20 / 10 · no opinion; intelligence 3 E 14 / 7 · — · 6 / 3 and 4 E 18 / 9 · — · 8 / 4). Opinion goes to the **district's** meter. In a battleground district political actions carry **+25 % opinion, +25 % Party XP and +5 % chance** (§6.3); Issue-tagged actions **+50 % opinion and momentum** (§10.3); the two multiply on the opinion line and each shows as its own line. **Members only** marks actions at a faction's HQ.

| Id | Title | Type | Stat | E |
|---|---|---|---|---|
| **Government Quarter** | | | | |
| `irongate.parliament.gallery` | Watch from the public gallery | intelligence | INT | 4 |
| `irongate.parliament.lobby` | Talk to the lobby clerks | canvass | INT | 10 |
| `irongate.parliament.steps` | Speak from the Parliament steps | speech | CHA+INT | 12 |
| `irongate.forecourt.canvass` | Talk to the one o'clock crowd | canvass | CHA+INT | 10 |
| `irongate.forecourt.leaflets` | Hand out flyers at the tram stops on the Forecourt | propaganda | AGI | 8 |
| `irongate.forecourt.speech` | Speak beneath the statue | speech | CHA+INT | 12 |
| `irongate.ministries.clerks` | Talk to the clerks at five | canvass | INT | 10 |
| `irongate.ministries.notices` | Read the notice boards | intelligence | INT | 3 |
| `irongate.supreme-court.queue` | Talk to people in the petitioners' queue | canvass | INT | 10 |
| `irongate.supreme-court.law-library` | Study in the law library | training (INT) | — | 20 + 2×INT |
| `irongate.opera.foyer` | Talk to people in the foyer at the interval | canvass | CHA+INT | 10 |
| `irongate.opera.boxes` | Watch the boxes | intelligence | INT | 4 |
| `irongate.chancery-row.chambers` | Talk to the lawyers' clerks | canvass | INT | 10 |
| `irongate.chancery-row.bills` | Put up posters on the lawyers' railings | propaganda | STR | 8 |
| **Old Town** | | | | |
| `irongate.herald-house.print-room` | Talk to the printers coming off shift | canvass | INT | 10 |
| `irongate.herald-house.wires` | Read the news as it comes in | intelligence | INT | 3 |
| `irongate.concord-house.committee` | Go to the capital meeting · *members only* | council | INT | 10 |
| `irongate.concord-house.duplicator` | Print five hundred flyers · *members only* | propaganda | INT | 8 |
| `irongate.basilica-square.canvass` | Talk to people on the steps after Mass | canvass | CHA+INT | 10 |
| `irongate.basilica-square.speech` | Speak from the basilica steps | speech | CHA+INT | 12 |
| `irongate.st-agnes.visitors` | Talk to people in the visitors' queue | canvass | INT | 10 |
| `irongate.st-agnes.porters` | Carry for the porters | training (STR) | — | 20 + 2×STR |
| `irongate.lantern-lane.cafes` | Talk to people at the café tables | canvass | CHA+INT | 10 |
| `irongate.lantern-lane.bookshops` | Leave flyers in the bookshops | propaganda | AGI | 8 |
| `irongate.press-club.bar` | Listen at the club bar | intelligence | INT | 3 |
| `irongate.press-club.debate` | Speak at the Thursday debate | speech | CHA+INT | 12 |
| **Station & Market** | | | | |
| `irongate.market-square.tram-queue` | Talk to people in the tram queue | canvass | INT | 10 |
| `irongate.market-square.speech` | Speak from the market column | speech | CHA+INT | 12 |
| `irongate.market-square.leaflets` | Hand out flyers between the stalls | propaganda | AGI | 8 |
| `irongate.tram-junction.canvass` | Talk to people on the platforms | canvass | CHA+INT | 10 |
| `irongate.tram-junction.posters` | Put up posters on the tram shelters | propaganda | STR | 8 |
| `irongate.central-station.arrivals` | Talk to people in the arrivals hall | canvass | INT | 10 |
| `irongate.central-station.boards` | Watch the platforms | intelligence | INT | 4 |
| `irongate.central-station.platforms` | Run the platforms for the stationmaster | training (AGI) | — | 20 + 2×AGI |
| `irongate.grand-hotel.lobby` | Talk to people in the lobby | canvass | CHA+INT | 10 |
| `irongate.bombed-blocks.crews` | Talk to the repair crews | canvass | STR | 10 |
| `irongate.bombed-blocks.hoardings` | Chalk the boards round the ruins | propaganda | AGI | 8 |
| `irongate.station-buffet.counter` | Listen at the buffet counter | intelligence | INT | 3 |
| `irongate.station-buffet.tables` | Speak to the night-shift tables | speech | CHA+STR | 12 |
| **Eastside** | | | | |
| `irongate.union-house.committee` | Go to the capital meeting · *members only* | council | INT | 10 |
| `irongate.union-house.duplicator` | Print five hundred flyers · *members only* | propaganda | INT | 8 |
| `irongate.riverside-quays.dockers` | Talk to the dockers at the break | canvass | STR | 10 |
| `irongate.riverside-quays.bale` | Speak from a bale | speech | CHA+STR | 12 |
| `irongate.riverside-quays.manifests` | Note which barges carry what | intelligence | INT | 3 |
| `irongate.ironworks-gate.canvass` | Talk to the workers coming off shift | canvass | STR | 10 |
| `irongate.ironworks-gate.posters` | Put up posters on the works wall | propaganda | STR | 8 |
| `irongate.red-lantern.listen` | Listen at the bar | intelligence | INT | 3 |
| `irongate.foundry-row.canvass` | Knock on doors | canvass | CHA+INT | 10 |
| `irongate.foundry-row.run` | Run messages up and down the stairs | training (AGI) | — | 20 + 2×AGI |
| `irongate.iron-bridge.speech` | Speak from the bridge end | speech | CHA+INT | 12 |
| `irongate.iron-bridge.leaflets` | Hand out flyers on the bridge at the shift change | propaganda | AGI | 8 |
| **Garrison Hill** | | | | |
| `irongate.vanguard-house.committee` | Go to the capital meeting · *members only* | council | INT | 10 |
| `irongate.vanguard-house.gymnasium` | Train in the gymnasium · *members only* | training (STR) | — | 20 + 2×STR |
| `irongate.police-hq.permits` | Talk to people in the permits queue | canvass | INT | 10 |
| `irongate.police-hq.gazette` | Read the police notices | intelligence | INT | 4 |
| `irongate.esplanade.canvass` | Talk to the Sunday walkers | canvass | CHA+INT | 10 |
| `irongate.esplanade.bandstand` | Speak from the bandstand | speech | CHA+STR | 12 |
| `irongate.esplanade.leaflets` | Hand out flyers at the tram terminus | propaganda | AGI | 8 |
| `irongate.villas.canvass` | Knock on the villas' doors | canvass | CHA+INT | 10 |
| `irongate.villas.bills` | Put up posters on the garden walls | propaganda | STR | 8 |
| `irongate.gate-tavern.listen` | Listen at the tavern | intelligence | INT | 3 |
| `irongate.gate-tavern.speech` | Speak to the tavern | speech | CHA+STR | 12 |

**Count by type:** canvass 21 · speech 10 · propaganda 11 · intelligence 9 · council 3 · training 5 = **59** (the three shift actions, *Work the stall*, *Work a shift as a porter* and *Drive the quay lorry*, left with the shift, §9; the jobs stay on their Jobs cards, §4.5). Titles follow §1.5 (the type labels a player reads are *Talk to voters*, *Speech*, *Spread the word*, *Watch and listen*, *Party meeting*, *Training*). Checked actions: 54, of which CHA+INT 17, INT 22, STR 7, CHA+STR 4, AGI 4 (propaganda). Every faction's recruit has ground: INT at the ministries, the court, the Herald and the station; STR on the quays and at the works; CHA in the Old Town and on the Hill.

### 4.5 Jobs (§9)

A job is a wage (§9, review 1): taken with one tap on the **Jobs card** at its location, free; **full daily pay at every 00:00 UTC boundary wherever the player is**, seniority +2 % a day held to +20 %, reset only by switching. No shift, no Energy, no action.

| Job | Id | Jobs card at | Unlock | Daily pay | Blurb (≤ 160) |
|---|---|---|---|---|---|
| **Porter** | `irongate-porter` | Central Station | Level 1, STR 5 | **180** | Eight hours of trunks and hatboxes under the glass arches. The stationmaster pays by the day and asks nobody's party. |
| **Street vendor** | `irongate-street-vendor` | Market Square | Level 1 | **100** | Matches, bootlaces and this morning's Herald from a stall under the column. The market beadle has stopped asking. |
| **Driver** | `irongate-driver` | Riverside Quays | Level 3, AGI 10 | **200** | The quay lorry between the cranes and the works, a full load each way. Needs a quick hand on the setts by the bridge. |

The Porter is the capital's version of the day-1 job **without the faction's fifth**. Since a home job pays in full from anywhere, a member who keeps the Factory worker (216 plus seniority) loses nothing by living in the capital, and the Porter is for a player with no job (§9.2): a switch would give up 36 a day and start seniority again. Living in Irongate therefore has **no running cost** beyond the move (`docs/economy.md` §15.3).

### 4.6 Outcome texts

Rules as Coalport's: Success and Partial for checked actions, one text for training; ≤ 240 characters, ≤ 4 sentences (2–3 lines of copy, pillar 7). *Members only* actions are written in the faction's voice; everything else is the Herald's town.

#### Parliament

**Watch from the public gallery** (`irongate.parliament.gallery`)
- Success — *Who sat with whom* — Two hours in the gallery with a pencil. Who left before the division, who came back with whom, which minister read his notes and which read the Herald. Three names go in your notebook.
- Partial — *A dull sitting* — Estimates, a point of order, estimates again. You get one name worth writing down before the Speaker rises for lunch. Come back on a division day.

**Talk to the lobby clerks** (`irongate.parliament.lobby`)
- Success — *They know the numbers* — The lobby clerks come out at six with the day's division lists under their arms. They read for a living, so you don't waste words. One takes ten flyers for the messengers' room, where the real votes are counted.
- Partial — *Most of them have a tram to catch* — The clerks come down the steps in a body and most of it heads for the Forecourt. You press flyers on the slow ones. Two stop to correct your figures, which is a start.

**Speak from the Parliament steps** (`irongate.parliament.steps`)
- Success — *The Quarter stops to listen* — The top step at the lunch adjournment, with the whole Forecourt for a gallery. You keep it short and keep it about them: rents, the cuts, who decides. A deputy heckles and the crowd laughs on your side.
- Partial — *The bell cuts you off* — You get through the cuts before the division bell goes and the steps empty of everyone who matters. A few clerks stay to hear the end. One asks which party. You tell him.

#### The Forecourt

**Talk to the one o'clock crowd** (`irongate.forecourt.canvass`)
- Success — *A thousand lunches* — At one the Quarter comes out to eat on the Forecourt and has nowhere to go for an hour. You work the benches with the flyer and the case for your party. By two, half of them know what you'd do about the cuts.
- Partial — *It rains at a quarter past* — You've done two benches when the rain comes off the dome and the Forecourt empties under the arcades. A few flyers go into coat pockets. One old man reads his under the statue, in the wet.

**Hand out flyers at the tram stops on the Forecourt** (`irongate.forecourt.leaflets`)
- Success — *Six stops, empty bag* — Every tram in the Quarter stops here and every queue is bored. You work the six shelters at a trot, a flyer into every hand before the tram comes. The bag is empty in ten minutes.
- Partial — *The trams come early* — Three shelters done when four trams arrive together and take the queues with them. Half the bag is gone. The other half waits for the next tram, which is late.

**Speak beneath the statue** (`irongate.forecourt.speech`)
- Success — *A crowd round the statue* — The plinth is a step up and a hundred yards of stone for a voice. Rents, the cuts, the gala nobody was asked about. A policeman looks bored, which is permission. By the end there's a ring three deep.
- Partial — *The pool is a poor stage* — You take the plinth and the wind takes half of it. The ring is thin and the clerks at the back are eating. A woman with a pram stays to the end and says her husband's a clerk. That's something.

#### The Ministries

**Talk to the clerks at five** (`irongate.ministries.clerks`)
- Success — *In order of seniority* — At five the three blocks empty in order, juniors first. You catch the juniors, who have the least to lose and the most to say about the cuts. A whole room of the Board of Works takes flyers.
- Partial — *Seniors only* — You're late and the juniors have gone. The seniors come out slowly and take flyers the way they take memoranda, without reading. One asks you to send it through the proper channel.

**Read the notice boards** (`irongate.ministries.notices`)
- Success — *The board says more than the minister* — Postings, retirements, a room to let, a tender for scaffolding nobody asked for. Two names and a date go in your notebook. The porter watches you copy them and says nothing.
- Partial — *Mostly rooms to let* — Rooms, a bicycle, a lost umbrella. One posting worth writing down, to a ministry that shouldn't need it. The porter moves you on.

#### The Supreme Court

**Talk to people in the petitioners' queue** (`irongate.supreme-court.queue`)
- Success — *The queue can't leave* — Fifty petitioners, one door, and the law's own pace. You work the line with the flyer and the case list. Everyone here has a grievance already; by the door most of them have your party's answer to it.
- Partial — *The usher opens early* — The door opens at half past nine and the queue becomes a crush on the steps. A few flyers go into coat pockets. One woman says she'll read it while she waits, which will be all day.

**Study in the law library** (`irongate.supreme-court.law-library`, training INT)
- Trained — *An evening among the reports* — The library lets anyone in who is quiet and owns a collar. Statutes, the electoral acts, judgments nobody has read since they were given. You leave knowing the argument better than the man who'll make it against you.

#### The Opera

**Talk to people in the foyer at the interval** (`irongate.opera.foyer`)
- Success — *Twenty minutes and champagne* — The interval is twenty minutes and nobody in the foyer can leave it. You work the stairs with a coat that passes and a flyer that doesn't. A minister's wife takes one, for the joke, and reads it in the second act.
- Partial — *Wrong coat* — The doorman looks at your coat and then at the door. You get the foyer's edge and the pavement smokers. Two take a flyer. One says he'd vote for anyone who shortened the second act.

**Watch the boxes** (`irongate.opera.boxes`)
- Success — *Who sat in the second box* — From the gods you can see every box and who visits it at the interval. A minister, a man who isn't his secretary, a lawyer from Chancery Row. Three names and a time in the notebook.
- Partial — *The lights go down* — You get the minister's box and nothing else before the lights go and the boxes are shadows. One name. The music is good, which isn't what you came for.

#### Chancery Row

**Talk to the lawyers' clerks** (`irongate.chancery-row.chambers`)
- Success — *Brass plates, open doors* — The clerks of chambers take deliveries all day and a flyer is a delivery. You work the row plate by plate. A junior counsel comes down to argue and stays to agree.
- Partial — *Not without an appointment* — Half the doors want an appointment and the other half want the tradesmen's entrance. You get flyers to the clerks who'll take them. One says his principal already votes your way, in private.

**Put up posters on the lawyers' railings** (`irongate.chancery-row.bills`)
- Success — *A row of railings, a row of bills* — Bucket, brush and the Row's iron railings. You get twelve bills up straight, one to every set of chambers, before the first clerk arrives. The lawyers will read them on the way in, and bill someone for the time.
- Partial — *The paste won't hold on iron* — Wet railings and paste that runs. Five bills stay up; the rest slide into the area. Five is five, and one is on the Attorney's railings.

#### Herald House

**Talk to the printers coming off shift** (`irongate.herald-house.print-room`)
- Success — *Ink to the elbow* — The print-room shift comes off at four and reads for a living. Rents, the raids, the tram fare: you keep it short. A compositor takes ten flyers for the stone, where tomorrow's leader is set.
- Partial — *Most of them head for the tram* — The shift comes off in a hurry and most of it makes for the Junction. You press flyers on the ones who slow down. Two stop to argue the raids; one gives you his street.

**Read the news as it comes in** (`irongate.herald-house.wires`)
- Success — *The wire room at midnight* — The night editor lets you sit by the machine if you keep quiet. Coalport, Duskwall, the frontier: who's meeting whom, which bill is stuck. Two names go in your notebook.
- Partial — *A slow night* — The machine chatters about grain prices and a regatta. One thing worth writing down before the night editor wants his chair back. Come back on a sitting night.

#### Concord House (Alliance, members only)

**Go to the capital meeting** (`irongate.concord-house.committee`)
- Success — *Minutes taken, motion carried* — Tea, a district map on the piano, and a chairman who believes in procedure. The committee wants the Old Town returns redone by street and you say how. Your name goes in the minutes. In this house, that counts.
- Partial — *A long meeting* — Two hours on the returns and a point of order about the biscuits. You get one word in before the chairman moves on. Mr Grey's man marks you present, which is what matters this week.

**Print five hundred flyers** (`irongate.concord-house.duplicator`)
- Success — *Five hundred copies, still wet* — The stencil holds and the drum turns. Five hundred flyers in an hour, stacked for the morning runners to the Junction. Your hands are purple to the wrist.
- Partial — *The stencil tears* — The stencil tears at copy two hundred and the rest come out ghosted. Half a stack goes out; the other half goes in the grate. The agent shows you how to cut the next one.

#### Basilica Square

**Talk to people on the steps after Mass** (`irongate.basilica-square.canvass`)
- Success — *Eleven o'clock, the whole Old Town* — Mass ends at eleven and the square fills from the steps down. You work the families with the flyer folded small, Sunday manners and no shouting. By the fountain, half the Old Town has one in a pocket.
- Partial — *The canon watches* — The canon stands at the top of the steps and the families move faster past you than they would. A few flyers go into missals. One old woman says she'll pray about it, which is not a no.

**Speak from the basilica steps** (`irongate.basilica-square.speech`)
- Success — *The square listens* — The top step after Mass, the dome behind you for a sounding board. The raids, the fever, the rents in the lanes. The canon frowns, the square laughs, and by the end the laughs are on your side.
- Partial — *The bells take half of it* — You're through the raids when the bells go for noon and take the rest with them. A knot of students stays to argue. The canon says next time, not on his steps.

#### St Agnes Hospital

**Talk to people in the visitors' queue** (`irongate.st-agnes.visitors`)
- Success — *Two o'clock, forty visitors* — Visiting is at two and the queue at the gate is anxious, patient and can't leave. You work it gently: the fever, the beds, who pays. By the time the sister opens the gate most of it has your party's line and a flyer in a basket.
- Partial — *The sister opens early* — The gate opens at ten to two and the queue is gone up the steps. A few flyers go into baskets. One man says his wife is on the fever ward and takes two.

**Carry for the porters** (`irongate.st-agnes.porters`, training STR)
- Trained — *Stretchers up four flights* — The porters don't ask which party you're with; they ask if you can take the foot end up four flights without stopping. You can, by the end. Your back will tell you about it tomorrow.

#### Lantern Lane

**Talk to people at the café tables** (`irongate.lantern-lane.cafes`)
- Success — *A chair at every table* — The pavement tables are full by ten. You work them one by one, a chair borrowed at each. The raids, the fever, the tram fare. By the third café the waiters know your name and one has taken a flyer for the kitchen.
- Partial — *Nobody wants company* — It's a reading morning and the tables are hidden behind the Herald. You get a word at three of them and a flyer under the saucer at the rest. One man lowers his paper to argue. That's a start.

**Leave flyers in the bookshops** (`irongate.lantern-lane.bookshops`)
- Success — *Between the pages* — Six bookshops and nobody watches the back shelves. A flyer in every second-hand novel on the political shelf, and a stack by the till where the owner will find it and, being Old Town, leave it. Someone will read them for years.
- Partial — *The owner finds the stack* — Three shops done when a bookseller catches you at the political shelf and asks whose paper it is. You tell him. He keeps the stack, to sell.

#### The Press Club

**Listen at the club bar** (`irongate.press-club.bar`)
- Success — *Reporters talk* — You buy one drink and listen to four. Which minister is out, which raid was tipped off, who the Herald won't print and why. Two names and a rumour go in your notebook.
- Partial — *A quiet night* — Two reporters and a crossword. One thing worth writing down, about a raid that hasn't happened yet. Come back on press night.

**Speak at the Thursday debate** (`irongate.press-club.debate`)
- Success — *The house divides* — The Thursday debate takes anyone who can hold the floor for ten minutes against reporters. You hold it for twelve: the raids, the warrant, the right to print. The house divides and the motion carries. A leader-writer asks your name.
- Partial — *Points of order* — Six minutes in, the reporters start raising points of order for the sport of it and the chair enjoys them. The motion is lost by four. Two young ones ask for a flyer on the way out.

#### Market Square

**Talk to people in the tram queue** (`irongate.market-square.tram-queue`)
- Success — *The queue has time to talk* — Forty people and one tram every ten minutes. You work the line with the fare table in one hand and the flyer in the other. By the time the tram comes, half the queue knows what your party would do about the penny.
- Partial — *The tram comes early* — You're three people in when the tram pulls up and the queue becomes a scrum. A few flyers go into shopping bags. One old man folds his and says he'll read it on the tram, standing.

**Speak from the market column** (`irongate.market-square.speech`)
- Success — *A crowd at the column* — The column's plinth between the fish stall and the tram stop. The fare, the bread queue, who pays and who doesn't. The stallholders heckle, the crowd laughs, and by the end the laughs are on your side.
- Partial — *The tram takes half of them* — You've a decent crowd until the number 4 pulls in and takes most of it. You finish for the stallholders and a policeman who looks bored. The fishmonger gives you a nod.

**Hand out flyers between the stalls** (`irongate.market-square.leaflets`)
- Success — *Quick hands, empty bag* — You work the aisles at a trot, a flyer into every basket before its owner has noticed. The bag is empty in ten minutes and the market beadle never sees you.
- Partial — *The beadle sees you* — Half the bag is gone when the beadle plants himself in the aisle and asks about your permit. You leave by the fish stall, slower than you'd like. The flyers you handed out are still out there.

#### Tram Junction

**Talk to people on the platforms** (`irongate.tram-junction.canvass`)
- Success — *Five platforms, five districts* — Every line crosses here and every platform is a district waiting. You work them in turn, a different first sentence for the Hill and the Quays. By the last tram the flyers are in five districts and so is your name.
- Partial — *The trams keep coming* — You can't hold a platform for a minute before a tram takes it. Flyers go into hands and away. One conductor takes a bundle for the depot, which is more than you'd planned.

**Put up posters on the tram shelters** (`irongate.tram-junction.posters`)
- Success — *A shelter on every corner* — Bucket, brush and eight shelters. You get a poster up in each, high enough that nobody's tearing it down without a ladder. Every tram queue in the capital will read them by noon.
- Partial — *The paste won't hold* — Rain, and paste that runs off the glass. Three posters stay up; the rest go under the trams. Three is three, and one is on the Hill platform.

#### Central Station

**Talk to people in the arrivals hall** (`irongate.central-station.arrivals`)
- Success — *Every train in the republic* — The barrier at the arrivals hall, where the whole republic comes through with a case in each hand. You work the queue for the cabs: Coalport voices, Duskwall coats, Ashford collars. Everyone takes a flyer to read on the tram.
- Partial — *The porters move you on* — The stationmaster's man asks for your permit and you work the cab rank instead. A few flyers go into gloves. A woman from Ashford says she'd heard the capital was like this.

**Watch the platforms** (`irongate.central-station.boards`)
- Success — *Who came in on the 14:10* — A bench by the boards and a paper you don't read. Who met the Duskwall train, who got off the Coalport one with a parcel, which platform the police watched. Three names go in your notebook.
- Partial — *Nothing on the boards* — Two trains late and nobody worth meeting. One name, off the Ashford train and into a ministry car. Not nothing.

**Run the platforms for the stationmaster** (`irongate.central-station.platforms`, training AGI)
- Trained — *Twelve platforms, one hour* — The stationmaster wants messages run between the platforms faster than the trains, and pays in nothing. You learn the subways, the short cuts and the barriers you can vault. By the end you could do it in the dark.

#### The Grand Hotel

**Talk to people in the lobby** (`irongate.grand-hotel.lobby`)
- Success — *Waiting rooms vote too* — The lobby is full of people waiting for someone important and pretending not to. You work the armchairs with a coat that passes. A deputy's secretary takes a flyer for her employer, and one for herself.
- Partial — *The hall porter has a view* — The hall porter watches you cross the lobby and meets you at the third armchair. You get two flyers out on the way to the door. One lobbyist follows you out to argue, which he does for a living.

#### The Bombed Blocks

**Talk to the repair crews** (`irongate.bombed-blocks.crews`)
- Success — *They stop for one who can lift* — The crews knock off at four with dust to the knees. You've the shoulders for it, so they stop. Rents, the evictions, who's rebuilding what for whom. A ganger takes ten flyers for the yard hut.
- Partial — *The whistle goes early* — The crews are away to the buffet before you've said rent. You press flyers on the stragglers. One says his sister's on Foundry Row and takes two.

**Chalk the boards round the ruins** (`irongate.bombed-blocks.hoardings`)
- Success — *Letters a yard high* — The boards round the gutted shells are the biggest wall in the district. You get your party's name up in fair capitals and ROOFS BEFORE RENTS beneath it before the watchman comes round. Then you're away down the entry.
- Partial — *Half a board* — You get the name up before a window goes up and someone shouts about the noise. You finish small and leave by the yard. It reads, just about.

#### The Station Buffet

**Listen at the buffet counter** (`irongate.station-buffet.counter`)
- Success — *Three districts at one counter* — The night shift from the quays, the station and the Hill drink here at the same counter and talk across it. Which crane is stopped, which platform is watched, who's leaving the Hill. Two names in the notebook.
- Partial — *Coffee and the racing page* — A slow night and a counterman who says nothing to anyone. One thing worth writing down, from a porter who talks in his sleep. Come back at midnight.

**Speak to the night-shift tables** (`irongate.station-buffet.tables`)
- Success — *Midnight, and they put their cups down* — You stand on a chair at midnight and speak to twenty tables of men who've earned the right not to listen. You keep it to wages and the fare. They put their cups down. That's the compliment here.
- Partial — *The counterman objects* — You get through the fare before the counterman says chairs are for sitting. Half the tables heard you. One porter says come back tomorrow, same chair.

#### Union House (Collective, members only)

**Go to the capital meeting** (`irongate.union-house.committee`)
- Success — *Minutes taken, motion carried* — Tea, a wall map of the quays stuck with pins, and a chairman who likes short answers. The committee wants the Eastside lists redone by stair and you say how. Your name goes in the minutes. In this house, that counts.
- Partial — *A long meeting* — Two hours on the stair lists and the price of paper. You get one point in before the chairman moves on. Secretary Holm's man marks you present, which is what matters this week.

**Print five hundred flyers** (`irongate.union-house.duplicator`)
- Success — *Five hundred copies, still wet* — The stencil holds and the drum turns. Five hundred bulletins in an hour, stacked for the runners to the quays. Your hands are purple to the wrist and the room smells of spirit.
- Partial — *The stencil tears* — The stencil tears at copy two hundred and the rest come out ghosted. Half a stack goes out; the other half goes in the stove. Somebody shows you how to cut the next one.

#### Riverside Quays

**Talk to the dockers at the break** (`irongate.riverside-quays.dockers`)
- Success — *They make room on the bollard* — The dockers eat on the bollards with their backs to the river. You've the hands for the work and it shows, so they make room. By the whistle the gang has agreed to send two men to your party's office.
- Partial — *Bread and silence* — The gang eats and lets you talk. A couple of nods, one argument about the strike that goes nowhere. The ganger takes a flyer for later.

**Speak from a bale** (`irongate.riverside-quays.bale`)
- Success — *A bale for a platform* — A cotton bale, a crane for a backdrop and two hundred dockers at the break. The strike, the rates, who owns the cranes. Nobody heckles a voice that carries over a crane. The ganger nods when you climb down.
- Partial — *The crane starts up* — You get through the rates before the crane starts and takes the rest of it. A knot of lads at the back stays to argue. The ganger looks at his watch.

**Note which barges carry what** (`irongate.riverside-quays.manifests`)
- Success — *Barges, firms, times* — A bollard, a pencil and the checker's hut in view. Three barges for one firm, two sealed, one that unloads without a stamp. It goes in your notebook for later.
- Partial — *Nothing much moves* — An hour on the bollard and one barge, checked, stamped and moored. A firm and a time. Not nothing.

#### The Ironworks Gate

**Talk to the workers coming off shift** (`irongate.ironworks-gate.canvass`)
- Success — *The hooter goes, and they stop* — You're at the gate before the shift comes off. Soot, tired faces, no time for speeches. But the flyers go hand to hand, and a foreman says come back Thursday. That's how a district is won.
- Partial — *Most of them walk past* — The shift comes off in a hurry and most of it heads for the bridge. You press flyers on the ones who slow down. Two stop to argue; one gives you his stair.

**Put up posters on the works wall** (`irongate.ironworks-gate.posters`)
- Success — *A wall's length of paper* — Bucket, brush and a hundred yards of works wall. You get twelve posters up straight and high, one to every bay. Three shifts a day will read them, and the lorries from the quays.
- Partial — *The paste won't hold* — The wind off the river is against you and the paste won't take on the sooted brick. Five posters stay up; the rest go in the gutter. Five is five.

#### The Red Lantern

**Listen at the bar** (`irongate.red-lantern.listen`)
- Success — *The river talks* — You buy one drink and listen to the quays. Which barge came in sealed, which ganger is out, who's collecting for the strike and who's collecting for himself. Two names and a rumour in the notebook.
- Partial — *A quiet night* — Two dockers and the piano nobody plays. One thing worth writing down, about a crane that'll stop on Monday. Come back on pay night.

#### Foundry Row

**Knock on doors** (`irongate.foundry-row.canvass`)
- Success — *The kettle goes on* — Sixty doors up four flights. Most open a crack; a dozen open wide, and at three the kettle goes on. The notices, the rent, the landlord nobody has met. You leave with a list of names and a stair that will turn out.
- Partial — *Doors on the chain* — It's tea-time and the doors stay on the chain. You get the flyer through the gap and a word with the ones on the landing. One woman says her husband's on the quays already. Come back Sunday.

**Run messages up and down the stairs** (`irongate.foundry-row.run`, training AGI)
- Trained — *Every stair in the Row* — Six notes, four stairwells, one hour. You learn which landings connect and which end in a locked door, and you learn them at a run. By the end you could do it in the dark.

#### The Iron Bridge

**Speak from the bridge end** (`irongate.iron-bridge.speech`)
- Success — *Both banks hear it* — The bridge end at the shift change, the river for a sounding board and the whole east bank walking past. The strike, the evictions, the fare. Both banks slow down. A tram conductor rings his bell for you, twice.
- Partial — *The tram takes half of them* — You've a decent crowd until the tram comes over and takes most of it. You finish for the ones on foot and a policeman who looks bored. A docker gives you a nod.

**Hand out flyers on the bridge at the shift change** (`irongate.iron-bridge.leaflets`)
- Success — *A thousand across the river* — The shift comes over the bridge at four in a body and can't stop. You stand at the narrow end and put a flyer into every hand that passes. The bag is empty before the crowd is.
- Partial — *The wind off the river* — Half the bag goes into hands and half into the river when the wind gets up. The ones that stayed dry are still out there. One docker fishes his out of the water and reads it anyway.

#### Vanguard House (Vanguard, members only)

**Go to the capital meeting** (`irongate.vanguard-house.committee`)
- Success — *Minutes taken, motion carried* — Coffee, a district map stuck with pins, and a chairman who likes short answers. The committee wants the Hill lists redone by street and you say how. Your name goes in the minutes. In this house, that counts.
- Partial — *A long meeting* — Two hours on the Hill lists and the price of paper. You get one point in before the chairman moves on. Organiser Stahl's man marks you present, which is what matters this week.

**Train in the gymnasium** (`irongate.vanguard-house.gymnasium`, training STR)
- Trained — *An hour in the wing* — The club's gymnasium is ropes, bars and a man who counts out loud. He doesn't ask about the ward; he asks for ten more. You give him ten more. Your shoulders will tell you about it tomorrow.

#### Police Headquarters

**Talk to people in the permits queue** (`irongate.police-hq.permits`)
- Success — *A queue for everything* — Permits for stalls, for meetings, for a room to let: the queue at the gatehouse is the whole Hill by nine. You work it with the flyer and the case for fewer permits, or more, depending on the party. It listens; it has nothing else to do.
- Partial — *The desk sergeant has a view* — The desk sergeant looks at your flyers and then at the door. You work the end of the queue on the pavement. One clerk takes two, one for the office, and says nothing.

**Read the police notices** (`irongate.police-hq.gazette`)
- Success — *Names on the wall* — The gazette on the gatehouse wall lists the week's warrants, permits refused and rooms searched. Two names and an address go in your notebook while the sergeant is on the telephone.
- Partial — *Last week's sheet* — The gazette is last week's and the sergeant is watching. One name worth writing down, from the permits refused. Come back on Monday.

#### The Esplanade

**Talk to the Sunday walkers** (`irongate.esplanade.canvass`)
- Success — *The whole Hill takes the air* — On Sunday the Hill walks the Esplanade in its second-best coat and can't hurry. You work the benches and the bandstand rail: the curfew, the census, who runs the Hill. By three, half the Esplanade has a flyer in a pocket.
- Partial — *The band starts* — The band strikes up at three and takes the Esplanade's attention with it. A few flyers go into gloves. One retired clerk says he'll read it after the march, which is a tune.

**Speak from the bandstand** (`irongate.esplanade.bandstand`)
- Success — *Between the band's numbers* — The bandstand is empty between numbers and nobody has told you not to. The curfew, the census, the rents on the Hill road. The Hill listens the way it does everything, in order. The bandmaster lets you finish before he lifts his baton.
- Partial — *The band drowns the end of it* — You get through the curfew before the band decides it's time and plays you off. A knot of clerks at the rail stays to argue. The bandmaster looks at his watch.

**Hand out flyers at the tram terminus** (`irongate.esplanade.leaflets`)
- Success — *Every tram down the Hill* — The terminus at the gate, a tram every six minutes and a queue that can't leave. You work it at a trot, a flyer into every hand. The bag is empty in ten minutes and the inspector never sees you.
- Partial — *The inspector sees you* — Half the bag is gone when the tram inspector asks for your permit, on the Hill, where they mean it. You leave by the Esplanade, slower than you'd like. The flyers you handed out are still out there.

#### The Villas

**Knock on the villas' doors** (`irongate.villas.canvass`)
- Success — *The maids open the doors* — Twenty villas, twenty bells, twenty maids. You have a coat that passes and a flyer that argues, and at six of them the mistress comes to the door herself. The Hill decides things over tea. Today one of them is your party.
- Partial — *Tradesmen's entrance* — The maids take the flyer at the side door and close it. One mistress reads hers on the step and says the party has some sense, for once. That's the Hill's way of saying maybe.

**Put up posters on the garden walls** (`irongate.villas.bills`)
- Success — *A wall a villa* — Bucket, brush and the long garden walls of the Hill road. You get a bill on every wall, high and straight, before the first gardener is out. The Hill will read them from its carriages.
- Partial — *A gardener with a hose* — Five bills up when a gardener comes out with a hose and a view about walls. Five stay up, wet. The rest go home in the bucket.

#### The Gate Tavern

**Listen at the tavern** (`irongate.gate-tavern.listen`)
- Success — *Talk that stops, then starts again* — Clerks from headquarters and gardeners from the villas, and talk that stops when you sit down and starts again when you buy a round. Which permits are refused, which villa is empty, who's leaving the Hill. Two names in the notebook.
- Partial — *Only the gardeners* — The clerks aren't in and the gardeners talk about roses. One thing worth writing down, about a villa that's been let to a ministry. Come back on pay night.

**Speak to the tavern** (`irongate.gate-tavern.speech`)
- Success — *The back room fills* — The landlord gives you the back room and the front room follows. The curfew, the census, the fare down the Hill. Nobody heckles here; they wait, and then they ask questions in order. That's the compliment on the Hill.
- Partial — *The landlord calls time* — You get through the curfew before the landlord calls time on politics in his house. Half the room heard you. A clerk says he'll bring his brother next week.

---

## 5. Moving within Irongate

Trams between districts are **instant and free**: a tram bar on every district view lists the other four districts, one tap each (mockup `MobileCity.dc.html`: *Tram to Eastside · Between districts · instant, free*), and the district overview's district pins and Districts list do the same. Trams are navigation, not actions: no Energy, no modal, no log line. The player's `districtId` (where they are) changes; residence does not.

---

## 6. District opinion and the three-way race

### 6.1 The meter

Each district has its own `opinion { vanguard, collective, alliance, neutral }`, three decimals, summing to 100 (§14.2). Persuasion draws from **Neutral first**, then from the rivals **in proportion to their shares**; the only floor is **Neutral at 5**; there is no faction floor in a battleground (a faction share can fall as low as the proportional draw takes it, which is never zero). `applyPersuasion` from slice 1 already does this; the district is the target instead of the city.

### 6.2 Drift (Appendix C #16's other half, pinned)

At every City Day boundary each faction's share in a district moves **1 % of its distance to the district's baseline** toward it, with the balance taken from or returned to Neutral (Neutral's floor applies; if Neutral cannot give, the shortfall is left). Relative, like the home cities' 2 % of the distance to 70, and for the same reason: an absolute point a day would out-run a lone player. At scale the damping of Appendix C #13 is the lever, not the drift.

### 6.3 Battleground (§14.4, pinned)

- A district is a **battleground** for a City Day when, **at the boundary**, its top two faction shares are within **10 points** (Neutral is not a faction). Evaluated once a day so the paper can mark the day's battlegrounds and a ticket's tags don't change under a player mid-session.
- In a battleground district, **every political action** (canvass, speech, propaganda, council) gets **+25 % opinion swing** and **+25 % Party XP** (a bonus line on base Party XP, rounded per line), and every **political check +5 % chance** (§8.4's Battleground bonus; a bonus row in the breakdown). Intelligence and training get nothing. All factions get it equally.
- Ticket tag: *Close race · +25 % Party XP · better odds*. Plate word: *Close race*. The Herald marks the day's battlegrounds.
- At the baselines the Government Quarter and Station & Market are battlegrounds and the other three are not; a leaning district becomes one when a rival closes to within ten of the leader. That is the design: the bonus follows the fight.

### 6.4 Groundswell (§14.4, pinned)

- When a faction **loses control** of a district (its share was above 50 at one boundary and is 50 or below at the next), it gains a **Groundswell** there: **+5 % opinion swing per day, stacking to +30 %** (day 6 onward), on its own political actions in that district, until it retakes control (share above 50 at a boundary) or **14 boundaries** pass.
- Only the faction that lost. Multiplies with the Battleground and Issue lines, each shown as its own line. Ticket tag for members: *Comeback · +15 %*. The Herald prints *Comeback in Eastside* on the morning it starts.
- At the baselines nobody controls anything, so Groundswell cannot fire until a faction has first crossed 50; in a small playtest it may never appear, which is recorded (Appendix C #29). It is cheap and it is the GDD's own anti-snowball rule, so it is built now.

### 6.5 Multipliers on one line

`swing = base × (1 + battleground 0.25) × (1 + issue 0.50) × (1 + groundswell g) × (1 + ordinance)`; each factor is a named line in the modal's opinion breakdown (*Close race +25 %* · *Issue: Tram Fare Hike +50 %*), applied in full precision and rounded once at the end to three decimals. The Party XP line takes only the Battleground (+25 %), *Fired up* (home only) and ordinance factors, each its own rounded line; Rested and Directives never touch opinion (§14.2).

### 6.6 The city's opinion, and the boundary order

Irongate's city share (the plate on the nation map, National Control from slice 7) is the **equal average** of the five districts, computed on read, never stored. At each Irongate boundary, in one transaction: **drift** in every district → **Issue resolution** if it is the Monday boundary (§10) → **Battleground and Groundswell** evaluated per district → **the count** if it is cycle day 0 (§9) → the **District Hero** ranking if it is cycle day 0 (§11). Home cities keep their slice-3 order with the Issue step inserted after drift.

### 6.7 Clearwater

On the nation map, locked (*No service yet*), with its baseline shown on its card (V 20 / C 24 / A 24 / N 32, §14.11). No city document is needed beyond the card; slice 7 builds it as a single-meter battleground with the same rules as a district.

---

## 7. Residence

### 7.1 What residence is

`residence { cityId, districtId?, since }` is **where you vote and stand**, whose paper you read first, which Party orders you get and whose Issues lead your paper. It starts as the home city (slice 3's `homeCityId` keeps meaning *your faction's home*, for the Ambition and the *Fired up* rule, and never changes). In slice 4 residence can be the home city or an Irongate district.

### 7.2 Moving (§14.11, §18.3 pinned)

| Rule | Value |
|---|---|
| Who | **Rank 2** or above (the ballot is the first thing a resident does; Rank 3 is for standing, as everywhere). Level 10 is implied: you have to get there |
| Where | **Standing in the district** you register in (one tap on the district view's residence card: *Register in Eastside · 500 Iron*), or in your home city for the way back |
| Cost | **500 Iron**, both ways |
| Cooldown | **7 City Days** between moves (a council cycle is five; a residence lasts at least one full cycle, so nobody hops for a ballot). The card reads *Registered in Eastside · you can move again from {weekday}* |
| The tap | One tap opens a `BottomSheet` that lists exactly what changes (below) and one button, **Register · 500 Iron**; the result is a modal, stamp **Registered** (`slice-4-screens.md` §6) |

### 7.3 What changes, what you give up, what stays

| | Moving to a district |
|---|---|
| **Your vote** | In the district's two-seat race, from the first election whose **polls open after you registered** (resident at the boundary into cycle day 2). Registering during a poll means the next cycle; the Election card says *Registered in Eastside · you vote from {weekday}*. Your home ballot, if already cast this cycle, stands |
| **Standing for office** | In the district from the next nominations (Rank 3, *Known* in Irongate, two endorsements from Irongate members of your faction). A **candidacy filed at home is withdrawn** at the move (the deposit stays with the branch, as any withdrawal); a **home council seat is vacated** at the move and filled by the branch's next NPC (the term is *not* completed, so it is not a rung on the ladder). The sheet says both in plain words: a move while seated is a choice, not an absence |
| **Party orders** | The capital rotation (§12) from the next City Day; today's orders stay as set |
| **The paper** | The Herald, with Eastside's Election row and the capital's Issues first |
| **Your job** | Kept, with its rules: the full wage at every boundary from anywhere, seniority still counting (§9.1). A capital job is a switch (free; seniority to 0) and rarely worth one |
| **Local Standing** | Every city's Standing is kept for ever; Irongate's starts where it was (0 for a first visit) |
| **Everything else** | Iron, XP, Level, Party XP, Rank, Political Capital, items, the Ambition, endorsements given: untouched |

Moving back home is the same act in reverse (500 Iron, the cooldown, the home paper and orders, the home ballot from the next poll whose window opens after the move).

### 7.4 A room (the optional sink)

Residence has **no rent** (§18.1: no mandatory upkeep). A **room in Irongate** is optional lodging on the same card, for anyone in the city: **100 Iron for 7 City Days**, **Rested cap +50** while it runs (the pool keeps its value when it lapses, as Rest Day Order does), one room at a time, renewable any day (the seven days start from the tap; no stacking). It is prepaid, like a bodyguard contract: being away never costs it anything but the nights not slept in it. The Evictions Issue effect halves it for the week.

---

## 8. The Irongate council: seats, candidates and the count

### 8.1 Shape

- **Ten seats, two per district**, one council. Cycle **offset 0** (§15.3): days 0–1 nominations, 2–4 polls, the count at the boundary into day 0, the council divides on its ordinance at the boundary into day 2. Every district counts on the same night.
- **Who votes:** Rank 2+ residents of the district (resident when its polls opened, §7.3), **any faction, for any candidate on the district's ballot**. A citizen votes for a name; the count turns the name into a faction and a candidate.
- **Who stands:** Rank 3, resident of the district, *Known* in Irongate (30 Successes anywhere in the city), **two endorsements from Rank 2+ Irongate residents of the same faction** (any district; one per member per cycle in the city), not a sitting Irongate councillor; 10 Political Capital deposit, the slice-3 rules for striking, withdrawing and the branch's endorsement (the capital branch's secretary endorses a filed candidate who does the day's orders; the small-branch rule counts the faction's Irongate endorsers).

### 8.2 The count in a district (§15.3 pinned)

For each faction *f* in the district:

- `ballotShare_f` = its candidates' ballots ÷ all ballots in the district (0 if none were cast).
- `opinionShare_f` = its district share ÷ the three faction shares added (Neutral excluded).
- **Turnout weight** `w = 50 × min(1, ballots ÷ 10)`: the ballot half is worth its full 50 % from **ten ballots**; below that, five points per ballot, and the rest of the weight stays with opinion. So one player's ballot in a tied district decides a seat without wiping out the meter (Appendix C #2's low-population worry, answered).
- **`score_f = w × ballotShare_f + (100 − w) × opinionShare_f`**.
- **Two seats by D'Hondt**: the first to the highest score; the second to the highest of `score_f ÷ (seats_f + 1)`, so the leader takes both only with more than twice the runner-up's score.
- **Ties between factions:** more ballots, then higher opinion share, then a seeded draw for the cycle, printed as *on the returning officer's draw*.
- **Within a faction**, its seats go to its candidates in order of the slice-3 **total** (ward vote + 3 × endorsements + members' votes, with the same tie order); NPC candidates fill the rest of its list. A faction with no candidate in the district forfeits its seat to the next by D'Hondt.

Worked examples (no ballots unless stated): Eastside 15 / 35 / 15 → opinion shares 23.1 / 53.8 / 23.1 → the Collective takes both seats (53.8 ÷ 2 = 26.9 beats 23.1). Two Vanguard ballots and nobody else's: w = 10; V 10 + 20.8 = 30.8, C 48.5, A 20.8 → seat 1 Collective, seat 2 Vanguard (30.8 beats 24.2). The Government Quarter at 20 / 20 / 20 with one Alliance ballot: w = 5; A 5 + 31.7 = 36.7, the others 31.7 → seat 1 Alliance, seat 2 on the draw between the other two (36.7 ÷ 2 = 18.3 is less than 31.7).

### 8.3 NPC fill: the Irongate slates (§15.10 pinned)

Each faction has an Irongate slate of **ten named NPC candidates, two per district** (profile = ward vote before a ±2 seeded jitter per cycle). In a district a faction's list is filled to **two names** (`max(0, 2 − p_f)` NPCs, in profile order), so every district ballot has at least six names and every faction can take both seats. Profiles are set so that about five days' work in the capital (125 Successes → ward vote 25, two endorsements, a ballot: 32) beats the district's top NPC (28), and *Known* alone (6 + 6 + 1 = 13) does not: a seat in the capital is earned in the district, not carried in from home. Marking as in slice 3: the faction's small mark, the word *ward*, standing derived from `profile × 5` (28 → *Trusted*, 20 → *Trusted*).

| Id | Name | District | Profile | Line on the ballot |
|---|---|---|---|---|
| **Vanguard** | | | | |
| `npc.v.ig.brandt` | Hedwig Brandt | Government Quarter | 28 | Clerk, Board of Works. "The estimates on time, in order, every year." |
| `npc.v.ig.moser` | Anton Moser | Government Quarter | 20 | Court usher. "A queue that moves is a court that works." |
| `npc.v.ig.lechner` | Rosa Lechner | Old Town | 28 | Landlady, Lantern Lane. "Rents on Friday, lamps lit by six, no exceptions." |
| `npc.v.ig.prager` | Emil Prager | Old Town | 20 | Verger, the basilica. "Quiet on the square after the last Mass." |
| `npc.v.ig.steinhauser` | Kurt Steinhauser | Station & Market | 28 | Tram inspector. "Trams to time. Fares as printed. Queues in order." |
| `npc.v.ig.dietz` | Frieda Dietz | Station & Market | 20 | Stationmaster's clerk. "Every arrival counted, every barrier manned." |
| `npc.v.ig.hollmann` | Georg Hollmann | Eastside | 28 | Works timekeeper. "The hooter on time and the gate shut after it." |
| `npc.v.ig.wirth` | Elsa Wirth | Eastside | 20 | Tally clerk, the quays. "Count it twice. Then the cranes can turn." |
| `npc.v.ig.ritter` | Wilhelm Ritter | Garrison Hill | 28 | Retired permits officer. "A permit for everything, and everything permitted in order." |
| `npc.v.ig.sommer` | Greta Sommer | Garrison Hill | 20 | Schoolmistress, the Hill road. "The Esplanade quiet by ten. The children need it." |
| **Collective** | | | | |
| `npc.c.ig.horvath` | Mila Horvath | Government Quarter | 28 | Ministry cleaner, night shift. "Not one clerk out while a minister keeps a car." |
| `npc.c.ig.beran` | Jan Beran | Government Quarter | 20 | Messenger, Parliament. "The gallery open to the wards, not just the collars." |
| `npc.c.ig.kalina` | Vera Kalina | Old Town | 28 | Compositor, the Herald. "Print the raid. Print the warrant. Print who signed it." |
| `npc.c.ig.schwarz` | Otto Schwarz | Old Town | 20 | Porter, St Agnes. "Forty beds is thirty short. Say so." |
| `npc.c.ig.varga` | Judit Varga | Station & Market | 28 | Market stallholder. "Bread at a price a porter's wage can pay." |
| `npc.c.ig.pelikan` | Karel Pelikan | Station & Market | 20 | Porter, Central Station. "The fare stays. The company can find its penny elsewhere." |
| `npc.c.ig.novak` | Pavel Novak | Eastside | 28 | Crane driver, the quays. "The cranes turn when the men say, not the company." |
| `npc.c.ig.albers` | Rita Albers | Eastside | 20 | Tenants' committee, Foundry Row. "Nobody leaves the Row. Nobody." |
| `npc.c.ig.fuchs` | Leo Fuchs | Garrison Hill | 28 | Gardener, the villas. "Count the villas first. The tenements have been counted." |
| `npc.c.ig.marek` | Hana Marek | Garrison Hill | 20 | Tram driver, the Hill line. "A fare the Hill's maids can pay, not just the Hill." |
| **Alliance** | | | | |
| `npc.a.ig.keller` | Dr Anna Keller | Government Quarter | 28 | Barrister, Chancery Row. "Publish the estimates. Then vote on them." |
| `npc.a.ig.vogt` | Peter Vogt | Government Quarter | 20 | Librarian, the Supreme Court. "Read the bill before you vote on it. All of it." |
| `npc.a.ig.ober` | Franz Ober | Old Town | 28 | Leader-writer, the Herald. "The warrant before a judge, and the plates back by Friday." |
| `npc.a.ig.lind` | Sophie Lind | Old Town | 20 | Bookseller, Lantern Lane. "Open the reading rooms. Then open the debate." |
| `npc.a.ig.hartmann` | Julius Hartmann | Station & Market | 28 | Hotel manager, the Grand. "An inquiry into the tramway's books, in public." |
| `npc.a.ig.roth` | Clara Roth | Station & Market | 20 | Repair-crew clerk, the Bombed Blocks. "Roofs by winter. A tribunal for the rest." |
| `npc.a.ig.baumann` | Erich Baumann | Eastside | 28 | Solicitor, tenants' cases. "A rent tribunal that sits this month." |
| `npc.a.ig.tesar` | Ilona Tesar | Eastside | 20 | Nurse, the works clinic. "A mediator on the quays by Wednesday." |
| `npc.a.ig.gruber` | Max Gruber | Garrison Hill | 28 | Magistrate's clerk. "No curfew without a council vote." |
| `npc.a.ig.adler` | Lotte Adler | Garrison Hill | 20 | Bandmaster's daughter, the Esplanade. "Sundays on the Esplanade, at any hour." |

Names were checked against the slice-3 slates (no duplicates; the mockups' Keller, Ober, Varga, Novak and Albers are kept as the capital's) and against real party and state figures of the period; the Vanguard's ten are clerks, an usher, a landlady, a verger, an inspector, a timekeeper and a schoolmistress, asking for order, timetables and permits, written cold.

### 8.4 The order paper and the division in a contested council

- **Three branch motions.** Each faction **with at least one seat** puts its branch's motion on the order paper at no cost, as item 1–3 in order of seats (ties by the district count's tie rule): Vanguard *Rally Permits*, Collective *Long Service Order* (was *Shift Hours Order*; review 1), Alliance *Reading Room Grant*. Then up to **three proposals** (20 Political Capital, one per councillor per term, first come) from the **Irongate menu** (§8.5).
- **One vote each**, public in the chamber, final, during cycle days 0–1 (§15.3).
- **NPC councillors vote for the item with the most votes from player councillors of their own faction**; ties to their branch's motion, then the earliest moved; if none of their faction's players voted, their branch's motion. Never *Against all*; they abstain only under a home-city Unrest, which does not exist in the capital.
- **Passes with six or more of ten.** Otherwise *Irongate Council Rises Without a Motion* and the city goes without for the term.
- So a council of ten NPCs split 4 / 3 / 3 passes nothing, and a single player councillor of a three-seat bloc who votes for another bloc's motion carries their two NPC colleagues with them and passes it (3 + 4 = 7). The capital's ordinance is a coalition or nothing, and one person can be the coalition. That is the three-way fight the slice is testing.
- The ordinance applies to **the whole city**, every district, for five days, one at a time, replacing the last (§15.3).

### 8.5 The Irongate ordinance menu

The ten of §15.3 plus one that now has a system to touch:

| Id | Name | Line (≤ 120) | Effect in Irongate (5 days) | Bound |
|---|---|---|---|---|
| `ord.tram-subsidy` | Tram Subsidy | The council pays half of every fare out of the capital: trains from Irongate at half price. | **Tickets from Irongate −50 %** (never below 5 Iron; stacks with the Tram Fare Hike effect to the same floor) | −50 % |

The Tram Subsidy is available in the home-city menus too (tickets from those cities exist from slice 4); the slice-3 branch motions are unchanged.

### 8.6 What the count writes and prints

Per district: two `officeTerms`, the result table (every candidate's faction, ward vote, endorsements, ballots, total; every faction's ballot share, opinion share, `w` and score; the seat order), turnout (*voters of eligible*, eligible being Rank 2+ residents of the district active in the last seven days), and the District Hero lines (§11). The Herald's count page shows the five districts, the player's first (`slice-4-screens.md` §8). No opinion input from ballots or seats in a battleground: opinion there is moved by actions, Issues and drift only; the +0.5 / +2 / −3 of §14.11 are home-city morale rules.

---

## 9. Issues of the Week (§14.6, slice-4 form)

### 9.1 The draw

- At the **Monday 00:00 UTC boundary** every open city (the three home cities and Irongate) draws **two Issues** from the deck (§9.5), seeded from the week key: from the Issues eligible for that city, never last week's two, and in Irongate **two different districts**. The first drawn is *the city's first Issue* (journey cards use it).
- On deploy and for a city that was never settled, the draw runs at bootstrap so no city is ever without Issues.
- Weights are all 1 in slice 4; "the city's character" is expressed by which Issues list the city.

### 9.2 Tags

Each Issue has a `feeds` match in the shape of a Party-order match (`actionTypes`, `locationIds`, `locationKinds`, `cityId`, and in Irongate a `districtId`): an action that matches is **tagged** with the Issue while it is live. A tagged action's ticket reads *Issue: Tram Fare Hike · opinion +50 %*.

### 9.3 Momentum

- A tagged action on Success adds **its Energy** to the actor's faction's momentum on that Issue (a 10-Energy canvass: +10), **half on Partial** (+5), each row of a ×3 on its own; council actions add their Energy too (they are tagged where the HQ is in the feeds). Journey cards add what they say (+5, +10). Momentum is an integer per Issue per faction, and per contributor for the ranking.
- Tagged actions also get **+50 % on the opinion swing** (§14.2), a line of its own.
- **Momentum is public**: the paper's Issues section shows every faction's total (*Collective 120 · Vanguard 85 · Alliance 40*) and who leads. An Issue is an argument in public; unlike the ballot there is nothing to keep secret.

### 9.4 Resolution (Sunday night)

At the **Monday boundary**, before the new draw:

- The faction with the **most momentum owns** the Issue. Ties: the higher share in the city (district in Irongate); then nobody.
- If **no faction has any momentum**, the Issue **lapses**: no owner, no effect, the *Nobody Spoke for …* headline.
- The owner gets **+3 opinion** in the city (Irongate: in the Issue's **district**), drawn Neutral-first through `applyPersuasion`, attributed in the ledger to the Issue (not to a player); a **headline** in every paper; and its **top five contributors by momentum get 4 Political Capital each** ("20 Political Capital split", §6.5; fewer than five: 4 each, the rest is not redistributed).
- The Issue's **effect** applies to the city (all of Irongate) for **7 City Days**, Monday to Sunday, as a bounded modifier line like an ordinance (*Tram Fare Hike: −10 Iron* on the ticket, *Fever at St Agnes: Rested cap 250* on the desk). Ordinance and Issue effects stack as separate lines. The effect is the same whichever faction owns it: **the stance is flavour** (§14.6), printed as the resolution's deck.
- **No early resolution in slice 4** (Appendix C #28): the week's fight runs to Sunday whatever the lead, so nothing depends on a threshold and nothing resolves at a clock time.

### 9.5 The deck (19)

`short` is the phrase used inside sentences (*on the tram fares*). Effects use the ordinance DSL (ADR 0021) plus one new modifier, `ticketPct`, and one new location match, `locationKinds`. Every effect is a bounded modifier on a system that exists in slice 4.

| Id | Issue | short | Where | Feeds (tagged actions) | Effect for the week |
|---|---|---|---|---|---|
| `issue.tram-fares` | Tram Fare Hike | the tram fares | Irongate · Station & Market | canvass, speech, propaganda at `irongate.tram-junction`, `irongate.central-station`, `irongate.market-square` | Tickets from Irongate −50 % |
| `issue.press-raids` | Press Raids in Old Town | the press raids | Irongate · Old Town | propaganda anywhere in Old Town; canvass, speech at `irongate.herald-house`, `irongate.press-club` | Propaganda opinion swing +15 % in Irongate |
| `issue.evictions` | Eviction Notices in Eastside | the evictions | Irongate · Eastside | canvass at `irongate.foundry-row`, `irongate.riverside-quays`; speech at `irongate.iron-bridge`; propaganda anywhere in Eastside | Rooms in Irongate −50 % |
| `issue.ministry-cuts` | The Ministry Cuts | the cuts | Irongate · Government Quarter | canvass at `irongate.ministries`, `irongate.forecourt`; speech at `irongate.forecourt`, `irongate.parliament`; intelligence at `irongate.parliament` | Job pay +10 % in Irongate |
| `issue.hill-curfew` | Curfew on the Hill | the curfew | Irongate · Garrison Hill | canvass at `irongate.villas`, `irongate.esplanade`; speech at `irongate.esplanade`, `irongate.gate-tavern`; intelligence at `irongate.police-hq` | Speech actions −2 Energy in Irongate |
| `issue.bread-queues` | Bread Queues at the Market | the bread queues | Irongate · Station & Market | canvass, speech, propaganda at `irongate.market-square` | Iron from checked actions +15 % in Irongate |
| `issue.quays-strike` | Strike at the Quays | the quays strike | Irongate · Eastside | canvass at `irongate.riverside-quays`, `irongate.ironworks-gate`; speech at `irongate.iron-bridge`, `irongate.riverside-quays` | Party XP +25 % on actions in Irongate |
| `issue.opera-gala` | The Opera Gala | the gala | Irongate · Government Quarter | canvass at `irongate.opera`, `irongate.chancery-row`; speech at `irongate.parliament`; intelligence at `irongate.opera` | Canvass +4 % chance in Irongate |
| `issue.fever-st-agnes` | Fever at St Agnes | the fever | Irongate · Old Town | canvass at `irongate.st-agnes`, `irongate.lantern-lane`; speech, propaganda at `irongate.basilica-square` | Rested cap +50 in Irongate |
| `issue.census-hill` | The Census on the Hill | the census | Irongate · Garrison Hill | canvass at `irongate.villas`, `irongate.esplanade`; intelligence at `irongate.police-hq`, `irongate.gate-tavern` | Reputation: every win counts twice, in Irongate |
| `issue.mill-strike` | Strike at the Mill | the mill strike | Coalport | canvass, speech at `coalport.mill-gate`; council at `coalport.union-hall` | Seniority ×2 (the Long Service Order's effect; was *shifts −1 Energy*, retired with the shift) |
| `issue.harbour-rates` | Harbour Rates | the harbour rates | Coalport | canvass, speech, propaganda at `coalport.quays`; propaganda at `coalport.market-row` | Iron from checked actions +15 % |
| `issue.frontier-shut` | The Frontier Shut | the frontier | Duskwall | canvass, speech at `duskwall.garrison-gate`; canvass, intelligence at `duskwall.goods-yard` | Job pay +10 % |
| `issue.ration-books` | Ration Books | the ration | Duskwall | canvass, speech, propaganda at `duskwall.quartermaster-market`; intelligence at `duskwall.archives` | Reputation: every win counts twice |
| `issue.college-protests` | Protests at the College | the college protests | Ashford | canvass, speech at `ashford.university`; speech at `ashford.courts` | Training Energy −20 % |
| `issue.court-backlog` | The Court Backlog | the court queue | Ashford | canvass, speech, intelligence at `ashford.courts`; canvass at `ashford.bridge-street` | Canvass +4 % chance |
| `issue.labour-exchange` | Men at the Labour Exchange | the exchange | Coalport, Duskwall, Ashford; Irongate · Station & Market | any canvass in the city (Irongate: in Station & Market) | Job pay +10 % |
| `issue.price-of-coal` | The Price of Coal | the coal price | Coalport, Duskwall, Ashford; Irongate · Eastside | canvass at `street` locations; propaganda at `market` locations (Irongate: in Eastside) | Rested cap +50 |
| `issue.lights-out` | Lights Out | the street lamps | Coalport, Duskwall, Ashford; Irongate · Old Town | intelligence anywhere in the city; propaganda anywhere (Irongate: in Old Town) | Intelligence actions −1 Energy (never below 2) |

Each home city has five eligible Issues and Irongate has thirteen, so no city repeats a pair inside three weeks. The deck grows with live content (§22). **The effect column is the design's wording**; the player-facing effect line of each Issue is written in the pattern review 2 gave the council rules (`review-2-answers.md` §1.10): *Tickets from Irongate: half price* · *Posters and flyers: opinion +15 %* · *A room in Irongate: half price* · *Job pay +10 %* · *Speeches: −2 Energy* · *Iron from actions +15 %* · *Party XP +25 % on actions* · *Talking to voters: better odds* · *Rested cap +50* · *Reputation: every win counts twice* · *Seniority ×2* · *Training: −20 % Energy* · *Watching and listening: −1 Energy*; never a system term, never an odds number.

**Blurbs and stances** (blurb ≤ 160 for the paper's Issue row; stances ≤ 90, printed as the winner's deck: *The Collective owns the tram fares. "Nobody pays the new fare…" Tickets from Irongate half price for the week.*)

| Issue | Blurb | Vanguard | Collective | Alliance |
|---|---|---|---|---|
| Tram Fare Hike | The tramway company wants a penny on every fare from Monday. The queues at the Junction have views. | Trams to time and to the timetable, and no penny until they run to either. | Nobody pays the new fare. A boycott from the Junction to the Quays. | An inquiry into the company's books before a penny changes hands. |
| Press Raids in Old Town | Police took the plates from two Old Town print rooms on Tuesday, with a warrant nobody has seen. | Subversive sheets shut by warrant, in daylight, and the warrant printed. | A press in every cellar. Print regardless, and print the raid. | The warrant before a judge by Friday, and the plates back. |
| Eviction Notices in Eastside | Forty households on Foundry Row have a fortnight's notice and a landlord who never comes himself. | Rent paid on Friday and the stair swept, and no landlord above the law either. | A rent strike on Foundry Row: nobody pays, nobody leaves. | A rent tribunal that sits this month, and notices frozen until it does. |
| The Ministry Cuts | The estimates are late and the ministries are told to lose one clerk in ten. The clerks have noticed. | One clerk in ten? Ten in ten who cannot do the work. Order in the offices first. | Not one clerk out of a job while a minister keeps a car. | Publish the estimates. A cut nobody can read is a cut nobody voted for. |
| Curfew on the Hill | Police headquarters wants the Esplanade cleared by ten. The Hill likes its Sundays late. | Quiet streets by ten. The Hill sets the example for the town. | The Esplanade belongs to the people who walk on it, at any hour. | No curfew without a council vote, and the council has not voted. |
| Bread Queues at the Market | Flour is short, the Market Square queue starts at six, and the bakers say it is not their doing. | The speculators named and the queue in good order. Both by Monday. | Bread at a fixed price and the flour books opened. | A subsidy on the loaf until the harvest, paid from the ministries' cars. |
| Strike at the Quays | The cranes on the Quays have stood since Thursday. The barges are backing up to the lower bridge. | The cranes turn by Monday. The company and the men can argue afterwards. | The Quays hold. Every member on the picket line, in shifts. | A mediator on the Quays by Wednesday and both sides at his table. |
| The Opera Gala | The season opens Saturday and every minister has a box. The rest of the town has the pavement. | A gala for the town, with the boxes open to the wards that earned them. | Every box a workers' box for one night. The rest of the season can follow. | Half the boxes by ballot. The Opera takes public money and can say so. |
| Fever at St Agnes | St Agnes has forty fever cases and thirty beds. The sisters are asking the parties, since nobody else answers. | The wards quarantined and the tenements inspected, street by street. | Free clinics on every stair, staffed by the branch until the ministry wakes. | A public health board, sitting this week, with the sisters on it. |
| The Census on the Hill | Police headquarters is counting every household on the Hill, door by door. The Hill wants to know why. | Every household on the register. A town that is counted is a town in order. | Count the villas first. The tenements have been counted enough. | A census by the council, published, or no census at all. |
| Strike at the Mill | The rolling mill has been out since Monday over the foreman's book. The gate is quiet and the town is not. | The mill runs. The book can be argued in an office, after the shift. | The gate holds until the book is burned. Every member on the picket. | A mediator at the gate by Wednesday, and the book on his table. |
| Harbour Rates | The harbour board wants a shilling more on every ton across the quay. The barges say they'll go to Clearwater. | Rates fixed for a year and the board's accounts on the notice board. | Not a penny more until the board opens its books to the men who load the tons. | An inquiry into the board, in public, before any rate changes. |
| The Frontier Shut | The pass has been closed since Tuesday and the goods yard is empty. The town is counting what's left in the stores. | The frontier shut until the district is in order, and the stores rationed by the book. | Open the pass. A shut frontier feeds nobody but the customs. | Talks at the frontier post this week, and the pass open for food by Sunday. |
| Ration Books | The new issue of ration books is late and the Customs Market is selling coupons. Everybody knows who. | One book, one household, no exceptions, and the coupon sellers named. | Books for everyone by Friday or the market sets its own ration. | The books issued by the council, in public, from the Archives counter. |
| Protests at the College | The students have occupied the quad over the franchise. The dons are divided and the town is amused. | The quad cleared and the term resumed. Students are for lectures. | The branch joins the students. The franchise is the workers' too. | Open debate in the Union, and a vote on the motion, not on the students. |
| The Court Backlog | The county courts are six months behind and the public queue starts before dawn. The clerks blame the judge. | A second sitting every day and the queue in numbered order. | Rent cases first. A landlord can wait; a family cannot. | Two more clerks, paid for, and the list published every Monday. |
| Men at the Labour Exchange | The exchange queue is round the block and the board has no cards. The town counts them on the way to work. | Public works under discipline, and a card for every man who turns up on time. | Workers' co-operatives on the empty sites, and the exchange run by the union. | A retraining scheme at the college, and the exchange's books opened. |
| The Price of Coal | Coal is up a third since the frost and the merchants say it's the railway. The railway says otherwise. | The merchants' prices fixed and their yards inspected, this week. | Coal at the pithead price for every household with a ration book. | An inquiry into the merchants and the railway, and the findings printed. |
| Lights Out | Half the street lamps are dark and the gas company says the town owes it money. The town says the reverse. | The lamps lit by order and the company's books audited by the council. | The lamps lit, the company taken over, the bill sent to the shareholders. | The company's contract published, and the lamps lit while the lawyers read it. |

Content-policy check: the Vanguard's stances are permits, timetables, registers, fixed prices and quiet streets, written cold; no stance argues it is right; the Collective's are strikes, boycotts, co-operatives and fixed prices, in union words; nothing is a front, a war or an uprising; the college protest is an occupation of a quad, the strikes are pickets.

### 9.6 The Herald and the home papers: Issue lines

Headline templates (the three home papers get the same conditions with their own texts; their strings are in §13 with the Herald's):

| Id | Group · priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.ig.issues-drawn` | city 0 | Monday, new Issues | This Week in Irongate: {issue1} and {issue2} | {issue1Blurb} And in {district2}: {issue2Blurb} |
| `hl.ig.issue-leading` | city 2 | any other day, a faction leads an Issue | {faction} Leads on {issue1Short} | {faction} {m1} · {second} {m2} · {third} {m3}. Work on it in {district} moves opinion half again. |
| `hl.ig.issue-open` | city 2 | any other day, nobody has momentum | Nobody Has Spoken on {issue1Short} Yet | No party has moved on it. Work on it in {district} moves opinion half again. |
| `hl.ig.issue-resolved` | city 0 | Monday, an Issue resolved last night | {faction} Owns {issueShort} | {stance} {effectLine} for the week. |
| `hl.ig.issue-lapsed` | city 0 | Monday, an Issue lapsed | Nobody Spoke for {issueShort} | A week and not a word from any party. The Herald notes it. |
| `hl.ig.issue-pc` | personal 2 | the player was in the top five | Your Work on {issueShort} Counted | Among the five who moved it most for the {faction}. +4 Political Capital. |

The paper's **Issues section** itself (§3.3) is live at read: the resident's city first, then the capital, then the other cities folded (`slice-4-screens.md` §7).

---

## 10. Party orders for a capital resident (§13.7, §15.4)

A member's daily rotation is chosen from the templates matching their **residence**: `residence: 'home'` (the slice-1 and slice-2 sets, unchanged) or `residence: 'capital'` (below). Slot C is shared: the existing *Work your shift*, *Sharpen up* and *A full day* templates already match `cityId: 'home'`, which from slice 4 resolves to **the residence city**. Two new match fields: `districtId: 'home'` (the resident's district) and `issueTagged: true` (any action tagged with a live Issue in the residence city). The **Unrest crisis pair** (§14.11) replaces slots A and B **only for members resident in the home city**; a capital resident keeps the capital rotation. A capital resident's welcome set is unchanged (it is the first City Day, at home).

| Id | Faction · slot | Title | Matches | Target | Line |
|---|---|---|---|---|---|
| `dir.c.capital-canvass` | Collective · A | Talk to voters in the capital | any `canvass` in Irongate | 3 attempts | Five districts and the Clarion doesn't reach any of them. Three conversations, anywhere in the capital. |
| `dir.c.capital-district` | Collective · A | Knock on doors in your district | any `canvass` in the resident's district | 2 attempts | Your district first. Two doors, two stairs, and tell them which office to come to. |
| `dir.c.capital-issue` | Collective · B | Speak on this week's Issue | any Issue-tagged action in Irongate | 2 attempts | The Herald says the capital is arguing about {issue}. Argue back, twice. |
| `dir.c.capital-report` | Collective · B | Go to the meeting at Union House | `irongate.union-house.committee` | 1 attempt | Committee at Union House at six. Bring the stair lists, by district. |
| `dir.v.capital-canvass` | Vanguard · A | Talk to voters in the capital | any `canvass` in Irongate | 3 attempts | Three districts. Three reports on my desk by tonight, however far the tram. |
| `dir.v.capital-district` | Vanguard · A | Knock on doors in your district | any `canvass` in the resident's district | 2 attempts | Your own district, top to bottom, no gaps. Two doors will do to start. |
| `dir.v.capital-issue` | Vanguard · B | Speak on this week's Issue | any Issue-tagged action in Irongate | 2 attempts | The capital is arguing about {issue}. The committee has a position. State it, twice. |
| `dir.v.capital-report` | Vanguard · B | Go to the meeting at Vanguard House | `irongate.vanguard-house.committee` | 1 attempt | Committee at Vanguard House at six. Bring the district lists, in order. |
| `dir.a.capital-canvass` | Alliance · A | Talk to voters in the capital | any `canvass` in Irongate | 3 attempts | Five districts, three conversations. Off you go, and mind the trams. |
| `dir.a.capital-district` | Alliance · A | Knock on doors in your district | any `canvass` in the resident's district | 2 attempts | Your own district first. Two doors, and be polite; they vote there. |
| `dir.a.capital-issue` | Alliance · B | Speak on this week's Issue | any Issue-tagged action in Irongate | 2 attempts | The Herald's leader is about {issue}. We have a better one. Twice, please. |
| `dir.a.capital-report` | Alliance · B | Go to the meeting at Concord House | `irongate.concord-house.committee` | 1 attempt | Committee at Concord House at six. Bring the returns and a pencil. |

Rotation A[day mod 2], B[day mod 2] (two templates per slot), never the same pair two days running; `{issue}` is the residence city's first Issue's short phrase, resolved at settlement. Targets fit in about 60 Energy with slot C, as at home. Rewards unchanged: +25 % Party XP on the match, +20 Party XP per order, +5 Political Capital for all three.

---

## 11. The influence ledger and District Hero (§14.5, pinned)

### 11.1 The ledger

Every opinion change is a **ledger row**: `{ cityId, districtId?, factionId, characterId | source, dayKey, cycleKey, swing (thousandths, as applied after floors), kind: action | journey | issue | drift | ordinance… , ref }`. Actions, journey cards and Issue resolutions are attributed to a character where one caused them; drift and Issue awards to the system. The ledger is the **source of attribution**; whether the meter is written through in the action's transaction (ADR 0010) or folded from the ledger is the architect's call (§17 Q1). Either way the modal keeps showing the district's share after the action.

### 11.2 What the player sees

- **The district plate and the city plate:** a line, live at read: *This election you've moved Eastside +1.3 for the Collective (2nd of 7)*. The rank is among **all** contributors to that district this cycle, any faction; the cycle is the council cycle (count to count). A home city shows the same line for the city.
- **The Today tally** already carries *opinion moved*; it is the sum of the day's rows.
- **The Me tab:** *Scoreboard* (the player's word for the ledger, §1.5) with a line per city or district the player has moved this election, and *Heroes: Eastside ×1* once earned.

### 11.3 District Hero

- At every Irongate count (cycle day 0), per district and per **level bracket** (1–15, 16–30, 31+), the character with the largest positive sum this cycle is **District Hero** of that district, provided the sum is at least **+0.5 points** (a single canvass does not make a hero). Ties: the earlier to reach the total. Up to fifteen heroes per cycle in the capital; the same rule names a **City Hero** in each home city at its count.
- **Reward:** the title for the next cycle (*District Hero, Eastside* on the Me tab and beside the name on political lists until the next count), **25 Political Capital**, a line **In Print** in the Herald and the faction's home paper (`hl.ig.hero`: **{name} Named District Hero of {district}** · *Moved {district} {swing} for the {faction} this election, more than anyone at Level {bracket}. 25 Political Capital.*), and from slice 8 a Legacy entry and the profile medal. Being away costs nothing: the title and the Political Capital are given at the count, present or not.
- Every district's top three of the cycle are printed on the result page (the scoreboard table, *Who moved {district} · this election*, `slice-4-screens.md` §9), which is the "faction ledger" of §14.5 in its slice-4 form; the faction screen's version is slice 6.

---

## 12. The Herald: headline templates

Conditions are the slice-1 and slice-3 kinds; `{rank}` is the player's faction title; `{district}` the residence district. Battleground residents read the Herald; visitors read it while in Irongate. The slice-3 political set is transcribed for the Herald with the count per district (`{district}`, *two seats*), and the seat headline reads the faction.

| Id | Group · priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.ig.welcome-resident` | personal 0 | first edition after registering | {name} Takes Up Residence in {district} | The {faction}'s newest voter in the capital. {district} votes from {weekday}; the Herald will say when. Party orders now come from the capital branch. |
| `hl.ig.first-arrival` | personal 1 | first edition after a first arrival in Irongate | {name} Arrives in the Capital | Off the {origin} train into Station & Market. Five districts, two of them close races today. The tram is free. |
| `hl.ig.train-open` | personal 2 | level rose to 10 (every paper) | The Train Is Open to {name} | Level 10. The nation map is on the Map tab: Irongate in twelve minutes, third class, twenty marks. |
| `hl.ig.seat-won` | personal 0 | elected last night | {name} Takes a {district} Seat for the {faction} | Elected {ordinal} of two with {votes} support. The {faction} holds {seatsFaction} of ten on the council. The council sits from this morning. |
| `hl.ig.seat-top` | personal 0 | elected first in the district | {name} Tops the Poll in {district} | First of two with {votes} support. The {faction} holds {seatsFaction} of ten. |
| `hl.ig.seat-lost` | personal 1 | stood, not elected | {name} Misses a {district} Seat by {margin} | {last} took the second seat. Candidates can put their names in again today; the 10 Political Capital stays with the branch. |
| `hl.ig.seat-lost-bloc` | personal 1 | stood; the faction won no seat there | No {faction} Seat in {district} This Cycle | {name} led the {faction}'s list, but the party's score fell short: {winners} took the two seats. Candidates can put their names in again today. |
| `hl.ig.seat-lost-tie` | personal 1 | lost on a tie-break | {name} Loses the {district} Seat on the Tie-Break | Level with {last}. The rules gave them the seat; the Herald has checked them. Candidates can put their names in again today. |
| `hl.ig.filed` · `on-ballot` · `struck` · `voted-won` · `voted-lost` · `voted-lost-tie` · `moved` · `seat-ended` · `council-passed` · `council-failed` | personal 2 | as slice 3 | The Clarion's texts with *{district}*, *of two*, *the capital* and *Irongate Council* substituted | `hl.ig.council-failed` deck: *No rule reached six votes of ten. Three parties, no deal, and the capital goes without for five days.* |
| `hl.ig.count` | city 0 | the count was last night | Irongate Result: {seatsV} Vanguard, {seatsC} Collective, {seatsA} Alliance | {district} went {winners}. Turnout {turnout} in your district; {npcSeats} of ten seats to local candidates. |
| `hl.ig.polls-open` | city 0 | polls open today | Voting Open Across the Capital | Two seats a district, any name on the list, until {until}. Your vote is secret. |
| `hl.ig.nominations` | city 0 | nominations open today | Irongate Council: Candidates Wanted | {rank3}s who are Known in the capital can stand in their district from the Election card until {until}. |
| `hl.ig.ordinance-city` | city 0 | an ordinance took effect | {ordinance} in Force in the Capital | {ordinanceLine} Five days, every district, by order of a council that agreed on something. |
| `hl.ig.battleground` | city 1 | the resident's district is a battleground today | {district} Is a Close Race Today | Three parties within ten points. Party work here pays +25 % Party XP and moves opinion +25 %. |
| `hl.ig.battleground-new` | city 0 | a district became a battleground at the boundary | {district} Becomes a Close Race | {second} closed to within ten of the {leader}. The bonus follows the fight. |
| `hl.ig.battleground-over` | city 1 | a district stopped being one | {district} No Longer a Close Race | The {leader} has pulled more than ten clear. The bonus moves on. |
| `hl.ig.groundswell` | city 0 | a Groundswell began | Comeback in {district} | The {faction} lost the district last night and the district has noticed. Its members' work there gains +5 % a day, to +30 %. |
| `hl.ig.district-line` | city 2 | every day, no other city line | {district}: {leader} {leaderShare} %, {second} {secondShare} %, {third} {thirdShare} % | {state}. You've moved it {yourSwing} this election ({yourRank} of {contributors}). |
| `hl.ig.hero` | personal 0 (In Print) | named District Hero last night | {name} Named District Hero of {district} | Moved {district} {swing} for the {faction} this election, more than anyone at Level {bracket}. 25 Political Capital. |
| `hl.ig.quoted` | personal 2 (In Print) | quoted by the reporter yesterday | {name} Quoted in the Herald on {issueShort} | "One sentence, printed whole," says the reporter. The branch has cut it out. |
| `hl.ig.rank-up-2` / `-3` / `rank-up` / `level-up` / `level-up-quiet` / `standing` / `orders-done` / `seniority-5` / `-10` (the review-1 *Five Days In* and *Ten Days In, Full Rate*) / `away` / `away-no-job` / `idle` | as slice 1 (review 1 for the seniority pair) | as slice 1 | The Clarion's conditions; the Herald's voice: *{name} Made {rank} by the {faction}* · *A {standing} Face in the Capital* · *{faction} Commends Its Capital Branch* · *Quiet Day in {district}* | Decks as the Clarion's with *the capital* for *Coalport* and *the branch* for the party's office; `hl.ig.away-no-job` ends *The stationmaster is still hiring: the Jobs card is at Central Station.* |
| `hl.ig.ambient-0..9` | ambient | fewer than 3 | Herald Prints Twenty Thousand for the First Time · Tram Fares: Company and Council to Meet Thursday · Gala Season Opens Saturday at the Opera · Barges Queue at the Lower Bridge · Ministry Scaffolding to Come Down "This Year" · Band to Play Sunday on the Esplanade · Fever Ward at St Agnes Full, Say Sisters · Court List Six Months Behind, Says Clerk · Station Clock Right for the First Time Since the War · Market Column to Be Cleaned by Public Subscription | — |

The Issue templates are in §9.6. The home papers gain `hl.*.train-open`, `hl.*.issues-drawn`, `hl.*.issue-leading`, `hl.*.issue-open`, `hl.*.issue-resolved`, `hl.*.issue-lapsed`, `hl.*.issue-pc`, `hl.*.hero` (City Hero) and `hl.*.moved-away` (**{name} Takes Up Residence in the Capital** · *The branch keeps a chair for them. Orders now come from the capital; they vote in {district}.*), in their own voices; the Herald's texts stand in until they are written (the same rule as slice 3's Q9).

Every deck ≤ 200 characters with the longest tokens; `{until}` and `{weekday}` as slice 3 §17.3.

---

## 13. What the player sees and does

### 13.1 The first trip (about day 5, Level 10)

1. **The paper:** *The Train Is Open to {name}* (`hl.*.train-open`). The Map tab now has **Nation** beside **City**.
2. **The nation map:** the painted republic filling the screen, the home city and the capital both in view, the home pin inverted with *you are here*; a tap on Irongate zooms onto the capital and opens its card: *Capital · 5 districts · contested · 12 min · 20 Iron* → **Board · 20 Iron**.
3. **The journey screen:** *The 14:10 to Irongate · 12 min to go · arrives 14:22*, a progress line between the two names, the sentence *You can close the game…*, and the first journey card, **A talkative passenger** (always, on the first journey): one choice, the outcome inline. *While you ride:* the Paper.
4. **Arrival** (twelve minutes later, or whenever the game is next opened): the modal, stamp **Arrived**, *Irongate · Station & Market*, **Continue**.
5. **The district view:** the painting framed on the station district, six pins, the plate *Station & Market · Close race · Vanguard 20.0 · Collective 20.0 · Alliance 20.0*; the Central Station pin's sheet open with its tickets, *Close race · +25 % Party XP · better odds* on the political ones and *Issue: Tram Fare Hike · opinion +50 %* where it applies. The odds word may be a band lower than at home (difficulty 10, no reputation yet) and the Party XP a little higher.
6. **A canvass ×3** at the arrivals hall: the modal with the new lines (*Close race +25 %*, *Issue +50 %*), the district's share moving in the opinion tile, and the knock-on line *Tram Fare Hike: Collective +30 points (leads 30 to 0)*.
7. **The tram bar:** *Eastside · Old Town · Government Quarter · Garrison Hill*, one tap → another district, another plate (*Eastside · Collective 35.0 · leans Collective*), no bonus tag here: the bonus is where the fight is.
8. **The district overview** (the edge button *Irongate*): the whole capital zoomed out, five district pins and the Districts list, the two close races marked, *Irongate: Vanguard 21.0 · Collective 21.2 · Alliance 21.0*.
9. **Home:** Central Station → *Board the train to Coalport · 20 Iron · 12 min*, or the nation map. The next morning's Herald, if they are still in the capital; the Clarion, if home, with *Irongate: Station & Market* in its Issues section and the scoreboard line.

About fifteen taps and two minutes of play, twelve of them on the train, which is the point of measuring: does the player wait, or close and come back?

### 13.2 The first move (Rank 2, in a district, 500 Iron)

1. On any district view, the **residence card** under the plate: *You live in Coalport · Register in Eastside · 500 Iron · 7 days between moves*.
2. One tap → the sheet: *You will vote and stand in Eastside from the next poll that opens. Your Coalport seat or candidacy, if any, ends. Party orders come from the capital from tomorrow. Your job, reputation, Iron and rank are untouched. Moving again: from {weekday}.* → **Register · 500 Iron**.
3. The modal: stamp **Registered**, *Eastside has a new voter*, *The Herald is your paper from tomorrow. Eastside votes from {weekday}. Union House expects you at six.* **Continue**.
4. The next morning: the Herald, front and centre *{name} Takes Up Residence in Eastside*; the Election card *Registered in Eastside · you vote from {weekday}*; capital orders signed by the same secretary.
5. The first capital vote within five days: a list of six or more names across three parties, marks on every row, one tap; Sunday's result page with five districts and the player's first.

### 13.3 A capital week

Monday: the Herald's *This Week in Irongate: Tram Fare Hike and Eviction Notices in Eastside*; the tagged tickets; the leading line every morning. Any day: talk to voters in the close races, one party meeting; the wage lands at midnight wherever they are. Cycle day 0–1: stand (Rank 3) or back someone; the result every fifth morning with the scoreboard and, with luck, a hero line. Sunday night: the Issues resolve on their own; Monday's paper says who owns what and the week's effect is on every ticket. Nothing here needs the player at any time; every window is at least a City Day and every event is a boundary.

---

## 14. Session shape (pillar 7)

| Act | Taps | Time |
|---|---|---|
| Board a train | 2 (Nation, Board) | 5 s, then 12 minutes in the background |
| A journey card | 1 | 10 s |
| A tram | 1 | instant |
| Register a residence | 2 (card, Register) + Continue | 15 s |
| A capital vote | 2 (Election card, name) + the CTA | 20 s |
| Reading the Issues | 0 (the paper) | 10 s |

The heaviest new thing, the journey, is wholly in the background. The playtest's measurement: **journey-screen dwell time** (do players wait?) and **first-move day** (do they move, and how soon after Level 10?).

---

## 15. Economy

`docs/economy.md` §15: tickets (20 a trip; a visitor's round trip is 4 % of a reference day's income), the move (500, about half a day's income by day 5), the room (100 a week), the capital resident's day (the home wage kept in full from anywhere, so −3 to −5 % Iron from actions only; +13 % Party XP in a battleground district; Standing restarted), and the Issue and hero Political Capital. Verdict there: no §5.2 milestone moves by more than a day; the capital is a little richer in Party XP and a little poorer in Iron, which is the trade the GDD describes. **Nothing in the 2 Oct revision moves a number**: frames, pins and plain words change no rate, cost or odds.

---

## 16. GDD edits made in this change

| Section | Edit |
|---|---|
| §0 | "Added 29 Sep 2026 (slice-4 design)" change table |
| §3.3 | The Issues section pinned (live at read; own city, the capital, the rest folded); *In Print* gains District Hero and the reporter's quote; the Herald's masthead |
| §6.5 | District Hero 25 Political Capital and the Issue's 4 Political Capital each pinned as slice-4 income |
| §13.7 / §15.4 | Capital rotation of Party orders; `cityId: 'home'` resolves to the residence; the crisis pair for home residents only |
| §14.2 | Battleground drift pinned (1 % of the distance to the baseline, at the boundary); the ledger as the source of attribution |
| §14.4 | Battleground evaluated at the boundary, +25 % swing, +25 % Party XP, +5 % chance, political actions only; Groundswell pinned (control lost between boundaries, +5 %/day to +30 %, 14 days) |
| §14.5 | Ledger rows; the plate line; District and City Hero rules (bracket, +0.5 minimum, the title, 25 Political Capital, In Print) |
| §14.6 | Slice-4 form: the Monday draw, feeds, momentum = Energy (half on Partial), public totals, Sunday resolution only, +3 to the district, 4 Political Capital each, one effect per Issue, stances as flavour; the deck table replaced by the slice-4 deck |
| §14.9 | Locations pinned (the opera in the Government Quarter; police headquarters and the Esplanade for the old barracks and parade ground); council rules (three branch motions, six of ten, NPCs follow their own faction's players); one image, five crops (superseded 2 Oct by the frames, below); District Hero |
| §14.10 | Slice-4 scope: third class only, the destinations, boarding leaves at the tap, lazy arrival, political acts from anywhere, the first journey always carries a card then one in three, the seven cards; the roadmap table kept |
| §14.11 | Residence (Rank 2, 500 Iron, 7 days, what changes); battleground baselines pinned; ballots and seats do not move battleground opinion |
| §15.3 | Battleground seat allocation pinned: the turnout weight, the score, D'Hondt, the tie order, residency at polls-open, the Irongate order paper |
| §15.10 | The Irongate slates (ten per faction, two per district) |
| §18.3 | Tickets 20, the move 500 both ways, the room 100 a week; residence has no rent |
| Appendix C | #2 answered for the MVP (the turnout weight); #8 kept open with the slice-4 measurement named; #9 closed (equal weights); #13 noted; new #27 (Rank 2 to move), #28 (no early Issue resolution), #29 (Groundswell at low population), #30 (cross-faction ballots) |

Companion edit: `docs/economy.md` §15.

**Revision of 2 Oct 2026 (maps v3, the wage, plain words):**

| Section | Edit |
|---|---|
| §0 | "Added 2 Oct 2026 (slice 4 brought up to date)" change table |
| §1.5 | Slice-4 words added to the vocabulary: *journey event* → *on the way*, *the ledger* → *the scoreboard*, *this cycle* → *this election*, *District Hero* kept, *residence* → *where you live* / *registered in* |
| §14.9 | The "On the map" bullet carries the **five district frames** and the rule that a district view draws only its own pins; 59 actions (the three shift actions gone with §9); *Close race* and *Comeback* as the plate words |
| §14.10 | The nation map paragraph: the painted 9,216 px picture, the five survey positions, the cover-and-drag rules, the Cities list; the slice-4 paragraph drops the shift |
| §14.11 | Residence: "the job with its rules" now reads the wage |
| Appendix C | #8 extended with the art check (Ashford drawn farthest, Clearwater no farther than Duskwall; the southern Coalport–Clearwater line is scenery) and the fairness point; new **#42** (the nation map at rest shows your city and the capital, never all five on a phone: covered map by review 3) and **#43** (the Bombed Blocks' pin moved onto the painted gutted block; closed the same day) |

**Decided by the user, 2 Oct 2026** (the three questions this revision left open):

1. **Journey times:** keep the planned 12 / 12 / 15 / 25, not the painted distances (§2.2; Appendix C #8 closed).
2. **The nation map on a phone:** fill the screen like the city maps; your city and the capital in view at rest, the others a drag or a Cities-list tap away (§2.1; Appendix C #42 closed).
3. **Home-city station quarters:** later, not slice 4. Slice 4 boards from the nation map and Irongate's Central Station only; the station quarters (Coalport's Sidings first) become a later content addendum (§2.4; GDD §14.13; `city-quarters.md` §2.3).

---

## 17. Questions for the architect

1. **Ledger or write-through.** ADR 0010 and 0022 keep opinion written in the action transaction and name the ledger as the remedy if contention needs it. Slice 4 adds the ledger regardless (attribution, the plate line, District Hero). Suggested: **append the ledger row in the action transaction and keep the write-through** for the playtest (the modal needs the district's new share anyway), and fold from the ledger only if the playtest report's `txAttempts` says so. Districts spread the writes: five documents where there was one.
2. **Arrival without a job.** A journey is settled lazily on any read at or after `arrivesAt`. Nothing in slice 4 happens at arrival that the player is not present for, so no Agenda job is needed; add one only if you want `currentCityId` consistent for the playtest report's presence counts.
3. **The city document for Irongate.** Suggested: one `cities` document with `districts[]` embedded (opinion, battleground and groundswell state, the Issue tie, the two seats' terms), and the ordinance at the city level. Elections: one document per district per cycle, counted in one boundary transaction, or one Irongate election document with five district results. Your call; the count page reads them together.
4. **Residence in the character** (`residence { cityId, districtId, since }`, plan §5) and the resolution of `cityId: 'home'` in order matches and the paper. `homeCityId` stays as the faction's home.
5. **Content schema:** `City.districts[]` (id, name, blurb, baselineOpinion, **frame**) where a district satisfies `Quarter` (id, name, frame) so that `City.quarters` is the districts and every existing frame, containment and survey test applies to the capital unchanged; `Location.quarterId` is the district id; `Location.factionId` (members only); the `theatre` kind; `OrderMatch.districtId: 'home'`, `OrderMatch.issueTagged`, `OrderMatch.locationKinds`; `OrderTemplate.residence`; new sections `issues[]`, `journeyEvents[]`, `routes[]`, `ordinances` gains `ord.tram-subsidy`; `Npc` candidates gain `districtId`; `Effect` DSL gains `ticketPct`; headlines with `cityId: 'irongate'`.
6. **Journey cards** are three-way choices with a check: the same shape as an Ambition chapter's step 2 without Energy. Suggested: one `journey.choose` procedure, idempotent per journey, resolved with the seeded RNG of the journey; the outcome stored on the journey and shown on the arrival modal.
7. **The Monday draw and resolution** ride the existing per-city boundary transaction (ADR 0017): resolve (award, effect, Political Capital, ledger rows), then draw. The draw needs the deck and last week's ids; the resolution needs per-faction and per-contributor momentum, which can be a small `issues` collection (one document per city per week per Issue with `momentum { faction: n }` and `contributors { characterId: n }`), written in the action transaction with `$inc`.
8. **Battleground and Groundswell** are state on the district (`battleground: boolean`, `groundswell { factionId, fromDay } | null`, `controlledBy`) set at the boundary; actions read them in their snapshot, as morale is read today.
9. **Tickets** are a new Iron sink with modifiers (`ticketPct` from an ordinance and an Issue effect, floor 5): a `fare(cityId)` in rules with the breakdown for the plate.
10. **Testing time.** Journeys are minutes long; the e2e needs a test hook to shorten them (`E2E_TEST_HOOKS`: set `arrivesAt` to now) and the calendar hook from slice 3 to step to Monday for the Issue resolution.
11. **The count page** for Irongate (five districts) needs a projection like slice 3's count view per district plus the faction score table; the ledger table (top three per district) is the same projection with a different source.
12. **Playtest report:** add journey dwell (time between boarding and the next request that is not the journey screen), first-move day per character, ballots per district per cycle, `w` at each count, Issue momentum totals and who won them, and the number of Irongate ordinances that passed.
13. **The QA vocabulary test:** `garrison` in the war regex needs an allowance for the district name *Garrison Hill* (§18); *the war* in four texts is the historical war and should pass as *ex-soldiers* did. The review-2 regex (`review-2-answers.md` §1.13) applies to every slice-4 string; the rule names (*Rally Permits*, *Tram Subsidy*) and the Issue names are exempt as the ordinance names are.
14. **The nation map is `CityMap` with the nation picture** (added 2 Oct): the same component, `frame` = the five pins' box grown by 0.06 (x 0.06–0.94, y 0.11–0.91), the cover-and-drag rules of review 3, city pins in place of place pins (a name label, no number), the pin zoom onto a town, and the Places list renamed *Cities*. The at-rest centring rule (your city and the capital both in view, §2.1) is the one addition. The nation and Irongate stills need cataloguing in `art.ts` with the ADR 0015 budget (the tiles exist).
15. **The district overview and the district view** (added 2 Oct): the overview is `CityMap` on the capital with `frame` = the whole picture, five **district pins** (numbered 1–5 at the anchors in `slice-4-screens.md` §5.1) and a *Districts* list, no place pins; the district view is `CityMap` with the district's frame (§4.2) and **only that district's locations**. Which district view is open is client memory (§14.13), the station district on arrival.
16. **No `job` actions** (added 2 Oct): the three Irongate jobs are Jobs-card entries at their locations, as the home cities' are since review 1; nothing else about jobs is new in this slice.
17. **Journey card rows** (added 2 Oct): the server returns the chance per choice as it does for a ticket; the client prints the odds word and the stat, never the number (§3), and the Partial reason line uses the destination city's training place.

---

## 18. Content-policy check

Every string above was read against `docs/design/content-policy-review.md` §7. Garrison Hill is a place name; its locations are police headquarters (the state's), an esplanade, villas, a tavern and the party's club; no barracks, drill, muster, parade, patrol or uniform anywhere; the Vanguard's committee, gymnasium, clerks, inspector, timekeeper, landlady and schoolmistress ask for order, timetables, permits and quiet streets, and no line says they are right (the Villas' *"the party has some sense, for once"* is the Hill's condescension, not the paper's praise). The Collective's people are a cleaner, a compositor, a porter, a stallholder, a crane driver and a tenants' committee; its stances are strikes and boycotts in union words; no Soviet title. Combat, Heat and the Dossier are absent. The words *battleground* and *groundswell* are the GDD's campaign vocabulary; *front*, *war*, *enemy*, *uprising*, *troops* and *militia* do not appear except in this sentence. "The war" appears four times (the Bombed Blocks, the Ministries' scaffolding, the passenger's councillors, the station clock), always as the historical war of 1939–45 that is the setting, never as the game's contest; "the front room" (the Gate Tavern) and "the frontier" are rooms and borders, on the same footing as the reviewed *front row*. **For QA:** the recommended war regex (`content-policy-review.md` §8) bans `garrison`; the district name *Garrison Hill* was judged acceptable as a place name (§6 of the review) and needs an allowance in the test, as *ex-soldiers* once had.
