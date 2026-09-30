# Review 2 — design and copy answers (30 Sep 2026)

Answers to the design items of `docs/review/2026-09-30-review-2.md`: **#1** plain words, **#4** hide the rolls, **#5** Political Capital, **#6** the council flow. The user's notes are direction. Every rule change is pinned in `docs/GDD.md` (§0, *Added 30 Sep 2026 (review 2)*); the screens are in `docs/design/slice-3-screens.md` (revised); the pacing check is `docs/economy.md` §17 (nothing moves). Items #2, #3, #7, #8, #9 are the developer's; #6's investigation is the developer's and §4.6 below lists what must be visible whatever it finds.

Nothing here adds a tap to a session. Two things are removed from every result (the roll and the maths) and one thing is added to the city screen (the Election card).

| # | Item | Decision | Where |
|---|---|---|---|
| 1 | Plain words | **A player-facing vocabulary** (§1.1): every title, order, headline, label, help note and result rewritten in everyday words. System terms (canvass, propaganda, ordinance, endorsement, Local Standing, FXP, battleground) stay in the GDD and the code and never reach a screen. Old → new tables by file in §1.4–§1.12 | GDD §1.5, §5.4, §13.3, §13.4, §13.7, §14.4, §15.3; Appendix A |
| 4 | Hide the rolls | **The odds are a word** on the ticket (*Good odds · Intelligence*); **a result row is Success or Partial and its rewards**; when it isn't a Success, **one plain reason** computed from the check. No percentage, roll, difficulty or bonus row anywhere a player reads. The server still returns the breakdown (dev panel, QA) | GDD §1.2, §7.5, §8.4, §13.1a |
| 5 | PC | **Political Capital**, in full, everywhere: the HUD, tiles, prices, headlines. Help note in §3 | GDD §6.5, §7.5 |
| 6 | The council flow | **An Election card on the city screen** (and the same row in the paper): the phase in plain words, what you can do now, a countdown, one button. **Every political act ends in a result and a next step.** The candidates and the last result are reachable every day of the cycle | GDD §3.3, §15.3; `slice-3-screens.md` |

---

## 1. #1 — Plain words

### 1.1 The rule

**A player reads everyday words; the design keeps its terms.** The GDD, the schemas, the ids and the rules go on saying *canvass*, *propaganda*, *ordinance*, *endorsement*, *Local Standing*, *FXP*, *battleground*: those are the names of systems and they are stable. What a player sees is the plain word for what they are doing: *talk to voters*, *knock on doors*, *put up posters*, *a council rule*, *back a candidate*, *reputation*, *Party XP*, *a close race*. The mapping is one table (GDD §1.5, below) and `copy.ts` is where it lives; a screen that prints a system term is a bug the QA vocabulary test can catch (§1.13).

**What "plain" means here:** a word a first-time player of any background knows without a note; concrete before abstract (*knock on doors* before *canvass*); the verb first in every title (*Talk to…*, *Put up…*, *Vote…*, *Stand…*); no metaphor in a title (the outcome texts keep the noir). The 1946 flavour lives in the nouns and the places (the shift, the queue, the ration, the duplicator, the tram), not in the verbs. Each secretary's voice is untouched: Stahl still wants reports in order, Holm still counts doors, Grey still counts words.

### 1.2 The vocabulary

| System term (GDD, code) | The player reads | Note |
|---|---|---|
| Canvassing (the action type) | **Talk to voters** (the type label); titles say who and where: *Talk to the workers coming off shift*, *Knock on doors*, *Win over the regulars* | The user's examples, kept |
| Propaganda | **Spread the word**; titles: *Hand out flyers…*, *Put up posters…*, *Chalk the slogan…*, *Print five hundred flyers* | |
| Leaflets, bills, the bulletin | **Flyers**, **posters**, **the party paper** | *Flyer* over *handbill*: plainest wins; the period sits in the rest of the sentence |
| Paste (posters, bills) | **Put up** | |
| Hoardings | **Fences** / **boards** | |
| Mimeograph / duplicator (in a title) | **Print five hundred flyers** | The machine stays in the body text |
| Intelligence (the type) | **Watch and listen**; titles: *Watch the customs shed*, *Listen at the bar*, *Look through the records*, *Note which wagons carry what*, *Read the news as it comes in* | *Registers*, *manifests*, *the wires* go |
| Council (the type; a committee session) | **Party meeting**; titles: *Go to the branch meeting*, *Go to the district meeting*, *Go to the meeting* | |
| Speech | **Speech** | Stays |
| Training | **Training** | Stays |
| Party orders / Directives | **Party orders** | Stays; *Directive* was never on a screen |
| Ward (in prose: ward lists, the ward) | **Street(s)** (*street lists*, *on the streets*) | The NPC marker *ward* → **local** (§1.10) |
| Local Standing | **Reputation** (*Reputation in Coalport · Known 34 / 70*) | The ladder's words (Stranger, Familiar, Known, Trusted, One of Us) stay |
| Successes (as a count) | **Wins** | The tally already said *wins* |
| FXP / Faction XP | **Party XP**, never abbreviated | XP stays |
| PC | **Political Capital**, never abbreviated | #5 |
| Rested | **Rested** | Stays, with its help note |
| Energy, Iron, XP, Level, Rank | unchanged | |
| Seniority | **Seniority** | Stays, with a help note (§1.9) |
| Ordinance | **Council rule** (*rule* in running text) | The rule names stay (*Public Works Order*, *Open Doors*); *Ward Register* → **Street Register**, *Ward Fund* → **Street Fund** |
| Order paper | **Up for a vote** | |
| Motion / the branch's motion | **Proposal** / **the party's proposal** | |
| To move (an ordinance) / to propose | **Put forward** | |
| The division / the council divides | **The council's vote** / **the council votes** | |
| *Against all* | **None of these** | |
| Council rose without a motion | **The council couldn't agree · no rule this term** | |
| Nominations (the phase) | **Candidates** (*candidates are putting their names in*) | |
| Polls open (the phase) | **Voting** (*voting is open*) | |
| The count | **The result** | |
| The ballot / cast your ballot | **Vote** / **Vote now** / **Vote cast** | *Ballot* never appears |
| On the ballot | **A candidate** / *You're a candidate* | |
| Struck | **Your name comes off** (*not enough backers*) | |
| The slate | **Who's standing** / **the candidates** | |
| To declare / a candidacy | **To stand** / **You're standing** | Stamp *Filed* → **You're standing** |
| Endorse / an endorsement | **Back** / **a backer** (*backers 1 of 2*) | Stamp *Endorsed* → **Backed** |
| The deposit | Not named: **Costs 10 Political Capital. You get it back only if you don't find two backers.** | |
| Withdraw | **Withdraw** | Stays |
| Ward candidate / ward vote | **Local candidate** (marker: *local*) / **local support** | |
| Members' votes | **Votes** | |
| Stipend | **Pay** (*a councillor's pay: 10 Political Capital and 20 Party XP a day*) | |
| The chamber / public in the chamber | **The council** / **the whole council sees it** | |
| Polling Day (the paper's row) | **Election** | The same card on the city screen (§4) |
| Battleground (the daily state) | **Close race** (*Close race today · +25 % Party XP · better odds*) | Slice 4 |
| Battleground city (the role) | **Contested city** (*Capital · 5 districts · contested*) | Slice 4 |
| Groundswell | **Comeback** (*Comeback · Vanguard +15 %*) | Slice 4 |
| The influence ledger | **The scoreboard** (*Who moved Eastside · this election*) | Slice 4 |
| Momentum (Issues) | **Points** (*Collective leads 120 to 85*) | Slice 4 |
| Swing (+50 % swing) | **Opinion** (*Issue: Tram Fare Hike · opinion +50 %*) | Slice 4 |
| Hostile ground | **Rival ground** | Slice 5 |
| Restore the base (the crisis orders) | **Win back {city}** | |
| Faction Reset token (origin note) | **You can't change party later** | |
| The Alliance's Rank 2 title *Canvasser* | **Campaigner** | GDD §5.4; the only rank title that was jargon |

**Kept with a help note (the small list):** Energy, Rested, XP, Party XP, Political Capital, Reputation, Morale (Fired up / Steady / Unrest), Seniority, Party orders, Election, Council rule, Backers, Local support, Issue. Every one is a dotted-underlined label that opens a two-line note (review 1 §5; the new and changed notes are in §1.9).

**Stat names:** in a sentence or on a ticket, the full word (*Intelligence*, *your best, Strength*). The three-letter codes stay only on the Me tab's stat table, beside the full name, and on the level-up buttons (*INT 12 → 13*), where the full-name line under each button explains them.

### 1.3 Proposed CLAUDE.md design rule 2

> 2. **A political battle, in plain words.** Player-facing text uses everyday words a first-time player understands: *talk to voters, knock on doors, put up posters, a speech, vote, stand for the council, back a candidate, a council rule, reputation, Party XP*. System terms (canvass, propaganda, ordinance, endorsement, Local Standing, FXP, battleground) stay in the GDD and the code and never reach a screen (GDD §1.5). Never war framing: no "front", "uprising", "enemy", "troops".

The user decides on the edit.

### 1.4 `cities/coalport.ts` — action names

| Id | Old | New |
|---|---|---|
| `coalport.mill-gate.canvass` | Canvass the shift change | **Talk to the workers coming off shift** |
| `coalport.mill-gate.speech` | Speak from the gate steps | (keep) |
| `coalport.market-row.canvass` | Canvass the bread queue | **Talk to people in the bread queue** |
| `coalport.market-row.speech` | Speak from the market cross | (keep) |
| `coalport.market-row.leaflets` | Hand out leaflets between the stalls | **Hand out flyers between the stalls** |
| `coalport.union-hall.committee` | Sit in on the branch committee | **Go to the branch meeting** |
| `coalport.union-hall.mimeograph` | Run the mimeograph | **Print five hundred flyers** |
| `coalport.union-hall.reading-room` | Study in the reading room | (keep) |
| `coalport.terraces.canvass` | Canvass door to door | **Knock on doors** |
| `coalport.terraces.chalk` | Chalk the slogans | **Chalk the slogan on the end wall** |
| `coalport.terraces.run` | Run messages for the street committee | **Run messages around the streets** |
| `coalport.quays.noon-break` | Talk to the dockers at the noon break | (keep) |
| `coalport.quays.posters` | Paste posters on the warehouse walls | **Put up posters on the warehouse walls** |
| `coalport.quays.haul` | Shift cargo with the dockers | **Lift cargo with the dockers** |
| `coalport.quays.customs` | Watch the customs shed | (keep) |
| `coalport.anchor.regulars` | Talk the regulars round | **Win over the regulars** |
| `coalport.anchor.listen` | Listen at the bar | (keep) |
| `coalport.anchor.songs` | Lead the singing | (keep) |

Body-text swaps in this file (the word table of §1.13 applied): *leaflet(s)* → *flyer(s)* (nine bodies), *bulletins* → *flyers* (the mimeograph success), *ward lists* → *street lists*, *That's how a ward is won* → *That's how a street is won*, *the branch committee sits in the back room* (blurb) stays.

### 1.5 `cities/duskwall.ts` — action names

| Id | Old | New |
|---|---|---|
| `duskwall.garrison-gate.canvass` | Canvass the customs shift | **Talk to the customs men coming off shift** |
| `duskwall.garrison-gate.speech` | Speak from the gate steps | (keep) |
| `duskwall.garrison-gate.drill` | Shift crates in the bonded store | **Lift crates in the customs store** |
| `duskwall.quartermaster-market.canvass` | Canvass the ration queue | **Talk to people in the ration queue** |
| `duskwall.quartermaster-market.leaflets` | Hand out leaflets between the tents | **Hand out flyers between the tents** |
| `duskwall.quartermaster-market.speech` | Speak from the lorry bed | (keep) |
| `duskwall.beacon-house.committee` | Sit in on the district committee | **Go to the district meeting** |
| `duskwall.beacon-house.duplicator` | Run the duplicator | **Print five hundred flyers** |
| `duskwall.beacon-house.muster` | Address the evening volunteers | **Speak to the evening volunteers** |
| `duskwall.archives.reading-room` | Study in the reading room | (keep) |
| `duskwall.archives.registers` | Search the registers | **Look through the records** |
| `duskwall.archives.clerks` | Canvass the clerks at closing time | **Talk to the clerks at closing time** |
| `duskwall.goods-yard.loaders` | Talk to the loaders at the break | (keep) |
| `duskwall.goods-yard.posters` | Paste posters on the wagons | **Put up posters on the wagons** |
| `duskwall.goods-yard.manifests` | Note the manifests | **Note which wagons carry what** |
| `duskwall.rampart-row.canvass` | Canvass door to door | **Knock on doors** |
| `duskwall.rampart-row.chalk` | Chalk the slogan on the gable end | **Chalk the slogan on the end wall** |
| `duskwall.rampart-row.run` | Run messages for the ward office | **Run messages around the streets** |

Body swaps: *leaflet(s)* → *flyer(s)*; *bulletins* → *flyers*; *ward lists* → *street lists*; the Archives blurb's *conviction* stays.

### 1.6 `cities/ashford.ts` — action names

| Id | Old | New |
|---|---|---|
| `ashford.gazette-house.print-room` | Canvass the print-room shift | **Talk to the printers coming off shift** |
| `ashford.gazette-house.evening-run` | Run the evening edition to the stands | **Slip flyers into the evening paper** |
| `ashford.gazette-house.wires` | Read the wires | **Read the news as it comes in** |
| `ashford.gazette-house.newsprint` | Hump the newsprint off the lorry | **Unload the paper lorry** |
| `ashford.assembly-rooms.committee` | Sit in on the ward committee | **Go to the meeting** |
| `ashford.assembly-rooms.duplicator` | Run the duplicator | **Print five hundred flyers** |
| `ashford.assembly-rooms.letters` | Write to the lapsed members | **Write to old members** |
| `ashford.university.students` | Canvass the students between lectures | **Talk to the students between lectures** |
| `ashford.university.union-debate` | Speak at the Union debate | **Speak in the student debate** |
| `ashford.university.reading-room` | Study in the college reading room | (keep) |
| `ashford.courts.gallery` | Sit in the public gallery | (keep) |
| `ashford.courts.queue` | Canvass the public queue | **Talk to people in the court queue** |
| `ashford.courts.steps` | Speak from the court steps | (keep) |
| `ashford.bridge-street.cafes` | Canvass the café tables | **Talk to people at the café tables** |
| `ashford.bridge-street.leaflets` | Hand out leaflets between the stalls | **Hand out flyers between the stalls** |
| `ashford.bridge-street.speech` | Speak from the bridge steps | (keep) |
| `ashford.weavers-row.canvass` | Canvass door to door | **Knock on doors** |
| `ashford.weavers-row.bills` | Paste bills on the yard hoardings | **Put up posters on the yard fences** |
| `ashford.weavers-row.run` | Run messages for the tenants' committee | **Run messages up and down the stairs** |

Body swaps: *leaflet(s)* → *flyer(s)*; *bills* (the posters) → *posters*; *hoardings* → *fences*; *canvass returns* → *street returns*; *the Debating Union takes anyone* stays (it is the club's name in the body; the title no longer says *Union*).

### 1.7 `orders.ts` — titles and lines

Titles keep the review-1 rule (*{Do} at/on/in {Place}*, ≤ 44 characters); the lines keep the voice. Only the rows that change are listed.

| Id | Old title | New title | Line (new where it changes) |
|---|---|---|---|
| `dir.canvass-coalport` | Canvass anywhere in Coalport | **Talk to voters anywhere in Coalport** | Three streets, three conversations. Go and have them. |
| `dir.shift-change` | Canvass the shift change at the Mill Gate | **Talk to the workers at the Mill Gate** | (keep) |
| `dir.foundry-row` | Canvass door to door on Foundry Row | **Knock on doors in Foundry Row** | (keep) |
| `dir.anchor` | Talk the regulars round at The Anchor | **Win over the regulars at The Anchor** | (keep) |
| `dir.paper-the-town` | Spread the bulletin anywhere in Coalport | **Spread the word anywhere in Coalport** | Flyers on Market Row, posters on the quays, chalk on Foundry Row or the printing room. Any three. |
| `dir.report` | Sit in on the committee at the Union Hall | **Go to the branch meeting at the Union Hall** | Meeting at six. Bring the street lists. |
| `dir.ears-open` | Gather intelligence anywhere in Coalport | **Watch and listen anywhere in Coalport** | (keep) |
| `dir.w.leaflets-market-row` | Hand out leaflets on Market Row | **Hand out flyers on Market Row** | (keep) |
| `dir.restore-canvass` | Restore the base: canvass anywhere in Coalport | **Win back Coalport: talk to voters anywhere** | The streets are asking what the branch is for. Answer them at the door: three conversations, today. |
| `dir.restore-speech` | Restore the base: a speech anywhere in Coalport | **Win back Coalport: a speech anywhere** | (keep) |
| `dir.v.canvass-duskwall` | Canvass anywhere in Duskwall | **Talk to voters anywhere in Duskwall** | Three streets. Three reports on my desk by tonight. |
| `dir.v.guard-change` | Canvass the customs shift at the Fortress Gate | **Talk to the customs men at the Fortress Gate** | (keep) |
| `dir.v.rampart-row` | Canvass door to door on Rampart Row | **Knock on doors in Rampart Row** | (keep) |
| `dir.v.clerks` | Canvass the clerks at the State Archives | **Talk to the clerks at the State Archives** | (keep) |
| `dir.v.paper-the-town` | Spread the bulletin anywhere in Duskwall | **Spread the word anywhere in Duskwall** | Flyers at the market, posters at the yard, chalk on the Row or the printing room. Three, in order. |
| `dir.v.report` | Sit in on the committee at Beacon House | **Go to the district meeting at Beacon House** | Meeting at six. Bring your street lists, in order. |
| `dir.v.eyes-open` | Gather intelligence anywhere in Duskwall | **Watch and listen anywhere in Duskwall** | The records at the Archives or the wagon lists at the yard. Watch, note, report. Names and times. |
| `dir.v.sharpen-up` | Train once, anywhere in Duskwall | (keep) | A soft organiser is no use to me. The customs store, the reading room, or the streets at a run. |
| `dir.v.w.ration-queue` | Canvass the ration queue at the Customs Market | **Talk to the queue at the Customs Market** | Sixty people in the sugar queue with nowhere to go. Twice through the line, price list in hand. |
| `dir.v.w.leaflets-market` | Hand out leaflets at the Customs Market | **Hand out flyers at the Customs Market** | (keep) |
| `dir.v.restore-canvass` | Restore the base: canvass anywhere in Duskwall | **Win back Duskwall: talk to voters anywhere** | Rampart Row has questions. Three streets, three answers, in order, on my desk tonight. |
| `dir.v.restore-speech` | Restore the base: a speech anywhere in Duskwall | **Win back Duskwall: a speech anywhere** | (keep) |
| `dir.a.canvass-ashford` | Canvass anywhere in Ashford | **Talk to voters anywhere in Ashford** | Three streets, three conversations. Off you go. |
| `dir.a.print-room` | Canvass the print-room shift at Gazette House | **Talk to the printers at Gazette House** | The print-room shift comes off at four. Be at Gazette House with the flyers. |
| `dir.a.weavers-row` | Canvass door to door on Weavers' Row | **Knock on doors in Weavers' Row** | (keep) |
| `dir.a.students` | Canvass the students at the University Quad | **Talk to the students at the University Quad** | (keep) |
| `dir.a.court-queue` | Canvass the public queue at the Courts | **Talk to the queue at the Courts** | (keep) |
| `dir.a.paper-the-town` | Spread the leaflets anywhere in Ashford | **Spread the word anywhere in Ashford** | The evening paper, the stalls on Bridge Street, the yard fences, the printing room or the letters. Any three. |
| `dir.a.report` | Sit in on the committee at the Assembly Rooms | **Go to the meeting at the Assembly Rooms** | Meeting at six. Bring the street returns and a pencil. |
| `dir.a.ears-open` | Gather intelligence anywhere in Ashford | **Watch and listen anywhere in Ashford** | The news wire at Gazette House, or the public gallery at the Courts. Write it down. |
| `dir.a.sharpen-up` | Train once, anywhere in Ashford | (keep) | A tired helper is a bad one. The college reading room, the paper lorry, or the stairs at a run. |
| `dir.a.w.bills` | Paste bills on Weavers' Row | **Put up posters on Weavers' Row** | The yard fences on Weavers' Row, bucket and brush. Two rounds, straight and high. |
| `dir.a.w.evening-run` | Run the evening edition from Gazette House | **Slip flyers into the paper at Gazette House** | The evening edition to the stands before the trams fill, a flyer in every copy. Two runs. |
| `dir.a.restore-canvass` | Restore the base: canvass anywhere in Ashford | **Win back Ashford: talk to voters anywhere** | Ashford is muttering. Three streets, three honest conversations, and listen more than you talk. |
| `dir.a.restore-speech` | Restore the base: a speech anywhere in Ashford | **Win back Ashford: a speech anywhere** | (keep) |

Unchanged: *Talk to the dockers at Harbour Quays*, *Talk to the loaders at the Goods Yard*, *Make a speech anywhere in …*, *Train once, anywhere in …*, *Six wins anywhere in …*, *Five attempts anywhere in …*, *Take a job at …*. The `hl.*.orders-call` headline prints `{ordersTitle}`, so it follows.

### 1.8 `headlines.ts`

| Id | Field | Old | New |
|---|---|---|---|
| `hl.rank-up-2` | deck | Recruits become Activists on the strength of their party work. The vote follows. | Recruits become Activists by doing party work. Activists vote: Coalport elects its council every five days, and the Election card says when. |
| `hl.v.rank-up-2` | deck | Initiates become Stewards on the strength of their work. The vote follows. | Initiates become Stewards on the strength of their work. Stewards vote: Duskwall elects its council every five days, and the Election card says when. |
| `hl.a.rank-up-2` | headline · deck | {name} Made Canvasser by the Alliance · Volunteers become Canvassers on the strength of their work. The vote follows. | **{name} Made Campaigner by the Alliance** · Volunteers become Campaigners on the strength of their work. Campaigners vote: Ashford elects its council every five days, and the Election card says when. |
| `hl.level-up` ×3, `hl.level-up-quiet` ×3 | deck | …on the ward… | …on the streets… |
| `hl.standing` ×3 | deck | {city} knows {name} now: {standing}. Actions here get +{bonus} %. | {city} knows {name} now: {standing}. Everything here goes a little better. |
| `hl.orders-done` | headline | Branch Praises Its Canvassers | **Branch Praises Its Helpers** |
| `hl.v.orders-done` | headline | Vanguard Commends Its Canvassers | **Vanguard Commends Its Volunteers** |
| `hl.away` ×3, `hl.away-no-job` ×3 | deck | The ward is where you left it. | The town is where you left it. |
| `hl.idle` ×3 | deck | No leaflets went out yesterday. Today's orders are below. | No flyers went out yesterday. Today's orders are below. |

The `TODO(game-designer)` on the three `hl.*.away` decks is closed: *{days} days of pay banked ({iron} Iron). Rested is full. The town is where you left it.* is the wording.

### 1.9 `copy.ts`

The odds strings (`copy.odds.*`) are replaced by §2.5 and the political strings by §4.5; those two sections are the tables for the developer. Everything else that changes:

| Key | New value |
|---|---|
| `hud.fxp` (new) | Party XP |
| `jobTakenOrder` | Taken · party order complete: +{fxp} Party XP |
| `orderTag` | Party order {p} / {t} · +{pct} % Party XP |
| `allOrdersDone` | All orders carried out · +{pc} Political Capital |
| `orderSigned.*` | *FXP* → *Party XP* in all six |
| `ordersComplete.fxpTile` | Party XP from orders today |
| `statChoice.int` | Intelligence. Queues, clerks, meetings, the records: {n} of {m} actions here. Later, espionage, exposés and the better-paid desks. |
| `statChoice.agi` | Agility. Flyers, chalk, the paper round: {n} of {m} actions here. Later, stealth work and getting away clean. |
| `standingUp` | {city}: {name} · everything here goes a little better |
| `standingCard.kicker` | Reputation |
| `standingCard.1` | Familiar in {city} · Faces nod. Everything you do in {city} goes a little better now. · Known at 30 wins: better again, and your name will do to stand for the council once you are a {rank3}. |
| `standingCard.2` | Known in {city} · Doors open a little faster, and the town knows your name well enough to stand for its council once you are a {rank3}. · Trusted at 70 wins: better again. |
| `standingCard.3` | Trusted in {city} · Doors open before you knock. Everything here goes better still. · One of Us at 150 wins: the best it gets, and 1 Political Capital a day. |
| `standingCard.4` | One of Us in {city} · The best reputation the town gives, and 1 Political Capital a day from it. · Nothing above this; it never fades. |
| `politicalCapital` | Political Capital {pc} (the HUD shows the same, never *PC*) |
| `signupTitle` | Join the campaign (keep) |
| `kindLabel` | unchanged |

**Help notes** (`copy.help.*`; kicker · note), new and changed:

| Key | Kicker | Note |
|---|---|---|
| `fxp` | Party XP | What the party thinks of you, earned by party work and orders. Ranks give rights: the vote at {rank2}, standing for the council at {rank3}. {n} more to {nextTitle}. |
| `pc` | Political Capital | Your pull in the party. You earn it by doing all three Party orders (+5 a day) and by holding a council seat. You spend it to stand for the council (10), to back a candidate (10) or to put a rule to the council (20). |
| `standing` (label *Reputation*) | Reputation | How well {city} knows your face. Every win here counts: Familiar at 10, Known at 30, Trusted at 70, One of Us at 150. Each step makes everything you do here go a little better; One of Us pays 1 Political Capital a day. |
| `share` | Who holds {city} | Each party's share of the town, and in grey the undecided. Everything you do to win voters draws from the undecided first. A home city never falls below half for its own party; the rest is the fight. |
| `morale` | Morale | The home party's share is its morale. Fired up, 80 and over: party work here pays +10 % Party XP. Steady: nothing special. Unrest, under 60: the branch is in trouble and the orders change. |
| `ordinance` (label *Council rule*) | Council rule | The council's rule for the town, in force for five days and for everyone here whatever their party. Passed by four councillors of seven. |
| `todayWins` | Wins | Successes today. Each one builds your reputation here. |
| `todayFxp` | Party XP today | Party XP earned today, the orders' bonuses included. |
| `todayOpinion` | Opinion moved | How far your work moved {city}'s meter today, in points of the town. One round of talking to voters is +0.05. |
| `seniority` (new) | Seniority | Every day you keep the same job adds 2 % to its pay, up to 20 % after ten days. Switching jobs starts it again from nothing. |
| `election` (new) | Election | {city} elects its council every five days: two days for candidates to put their names in, three days of voting, the result the next morning. {rank2}s vote; {rank3}s who are Known here can stand. |
| `rule` (new; the card's rule line) | Council rule | The seven councillors pick one rule for the town each term. It changes a real number for everyone in {city} for five days. |
| `backers` (new) | Backers | A candidate needs two backers to stay on the list. Backing costs 10 Political Capital, is public, and can't be taken back. Do all three Party orders while you're standing and the branch backs you. |
| `localSupport` (new) | Local support | The town's own vote for a candidate: your reputation here, counted as wins ÷ 5. Every round of talking to voters raises it. |
| `orders` (new; the Party orders label) | Party orders | Three jobs from the branch every day. Each one done pays +20 Party XP; all three pay +5 Political Capital. Actions that match an order pay +25 % Party XP while it is open. |

### 1.10 `politics.ts`, `ordinances.ts`, `factions.ts`, `candidates.ts`, `ambitions.ts`, `origin.ts`, `jobs.ts`

**`politics.ts`** (the six result modals; a `next` line is new, §4.4):

| Act | Stamp | Headline | Body | Next |
|---|---|---|---|---|
| `ballot` | Vote cast | Your vote is in | You voted for {name}. Nobody can see who you chose. The result is in {paper} on {countDay} morning, and on the Election card. | Next: the result, {countDay} morning. |
| `declare` | You're standing | Your name is on the list | You need two backers by {until} or your name comes off. Do today's Party orders and the branch backs you. | Next: find backers. Voting opens {pollsWeekday}. |
| `endorse` | Backed | {name} has your backing | Backing is public and final. {name} has {n} now; two by {until} keep the name on the list, and up to five count. | Next: voting opens {pollsWeekday}. |
| `withdraw` | Withdrawn | Your name comes off the list | The 10 Political Capital stays with the branch. Candidates can put their names in again on {weekday}. | Next: nothing until {weekday}. |
| `propose` | Put forward | {ordinance} is up for a vote | {ordinanceLine} The council votes at {at}. | Next: vote for a rule before {at}. |
| `councilVote` | Voted | Your vote is recorded | For {ordinance}. The whole council can see it, and it's final. The council votes at {at}; {paper} prints the result. | Next: the result, {resultWeekday} morning. |

**`ordinances.ts`:**

| Id | Field | New |
|---|---|---|
| `ord.street-permits` | line · effectLine | Flyers and posters go up without a permit for the week. · Posters and flyers: opinion +15 % |
| `ord.open-doors` | line · effectLine | The council asks every household to open the door to party callers. · Talking to voters: better odds |
| `ord.ward-register` → **`ord.street-register`** | name · line · effectLine | Street Register · Every street keeps a register: a name once known stays known. · Reputation: every win counts twice |
| `ord.ward-fund` → **`ord.street-fund`** | name · line · effectLine | Street Fund · A street fund pays party callers by the door, raised from the wage packet. · Iron from actions +25 % · job pay −25 % |
| `ord.public-meetings` | effectLine | Party XP +25 % on actions |

(The two renamed ids need a migration or an alias if any city document holds them; the developer's call.)

**`factions.ts`:** Alliance `rankTitles[1]` *Canvasser* → **Campaigner**; Collective platform `plat.c.wards` → *Every street organised, every door knocked.*; Vanguard `plat.v.wards` → *Every street in good order by the end of the term.*

**`candidates.ts`:** `npc.c.lenz` line → *Printer, the party paper. "Print more, argue less."* Nothing else.

**`ambitions.ts`:** *leaflet(s)* → *flyer(s)* in *His ward book* (the check narrative and the three results); the chapter title *His ward book* stays (it is his book). Nothing else.

**`origin.ts`:** `street.note` → *Permanent: you can't change party later.*

**`jobs.ts`:** nothing.

### 1.11 Hard-coded strings in `apps/client` and `packages/ui`

| File | Old | New |
|---|---|---|
| `Ticket.tsx` `TYPE_LABEL` | Canvassing · Speech · Propaganda · Intelligence · Council · Training | **Talk to voters** · Speech · **Spread the word** · **Watch and listen** · **Party meeting** · Training |
| `Ticket.tsx` locked reason | Standing {need} | Needs a {name} reputation here |
| `Ticket.tsx` training line | {STAT} 12 → 13 · no roll | Intelligence 12 → 13 · always works |
| `Ticket.tsx` odds line | {chance} % · STR 11 (tap: the ledger) | §2.2 |
| `HudBar.tsx` | Faction XP | Party XP |
| `Paper.tsx` | +{n} FXP · *{city} standing* · Standing row | +{n} Party XP · *Reputation in {city}* · Reputation row |
| `ResultModal.tsx` | {name}: {pct} FXP · {name}: Standing ×{v} · Local Standing · the *How it went* section | Party XP · Reputation ×{v} · Reputation · §2.3 |
| `OrdersComplete.tsx` | order FXP | order Party XP |
| `city.tsx` | Standing · What Local Standing means · Battleground | Reputation · What Reputation means · Close race |
| `me.tsx` | Local Standing · +{bonus} % here · Successes to {next} | Reputation · (dropped) · wins to {next} |
| `council.tsx` | 2 endorsements by … · Endorsements · Withdrawn · the deposit stayed with the branch · Struck at the close · the deposit is returned · Fetching the slate… · The slate · Nominations have closed. · {city} Council · Nominations · ordinance in force: | 2 backers by … · Backers · Withdrawn · the 10 Political Capital stayed with the branch · Not enough backers · your 10 Political Capital is returned · Fetching the candidates… · Who's standing · Voting is open; it's too late to stand this time. · {city} Council · Candidates · council rule: |
| `Politics.tsx` | Endorsements · endorsements {n} / {needed} · Endorsed by {names} · Propose an ordinance · 20 PC | Backers · backers {n} of {needed} · Backed by {names} · Put forward a rule · 20 Political Capital |
| `errors.ts` | Nominations are closed. · You have already moved an ordinance this term. · That ordinance is already on the order paper. · Needs Known standing here (30 Successes). | Too late to stand this time: names went in before voting opened. · You have already put forward a rule this term. · That rule is already up for a vote. · Needs a Known reputation here (30 wins). |
| Route `/council/slate` | | `/council/candidates` (not shown to players; the developer's call) |
| `DevPanel.tsx` | | unchanged (not player-facing) |

### 1.12 `politicalHeadlines.ts`

The Clarion's set in full; the Sentinel and the Gazette take the same word swaps with their own voice lines unchanged (*The committee does not extend deadlines*, *the Gazette has asked*). `{until}`, `{at}`, `{weekday}` as before.

| Id | Headline | Deck |
|---|---|---|
| `hl.seat-won` | {name} Takes a Seat on Coalport Council | Elected {ordinal} of seven with {votes} support. The council sits from this morning. Secretary Holm: "Now do something with it." |
| `hl.seat-top` | {name} Tops the Poll in Coalport | First of seven with {votes} support. The Union Hall has a new name on the door. |
| `hl.seat-lost` | {name} Misses the Last Seat by {margin} | {last} took the seventh seat. Candidates can put their names in again today. The branch keeps the 10 Political Capital. |
| `hl.seat-lost-tie` | {name} Loses the Last Seat on the Tie-Break | Level with {last} on {votes}. The seat went on votes, then backers, then reputation. Candidates can put their names in again today. |
| `hl.filed` | {name} Stands for the Council | Backers {endorsements} of 2 by {until}, or the name comes off the list. |
| `hl.on-ballot` | {name} Is a Candidate | On the list with {endorsements} backers. Voting is open today until {until}. A candidate may vote for themselves. |
| `hl.struck` | {name} Comes Off the List | Short of two backers at the close. The 10 Political Capital is returned; candidates can put their names in again on {weekday}. |
| `hl.voted-won` | Your Vote Counted: {voted} Takes a Seat | {voted} finished {ordinal} of seven. Turnout {turnout}. |
| `hl.voted-lost` | Your Vote Counted: {voted} Falls Short | Short by {margin}. The seventh seat went to {last}. Turnout {turnout}. |
| `hl.voted-lost-tie` | Your Vote Counted: {voted} Falls Short | {voted} finished level with {last} on {votes} and lost the tie-break. Turnout {turnout}. |
| `hl.moved` | Councillor {name} Puts Forward {ordinance} | {ordinanceLine} The council votes at {until}. |
| `hl.seat-ended` | Councillor {name} Steps Down | Five days, one rule. The council thanks its member; candidates for the council after next can put their names in today. |
| `hl.council-passed` | Council Passes {ordinance} | In force from this morning for five days. {ordinanceLine} |
| `hl.council-failed` | Council Can't Agree on a Rule | No rule reached four votes. Coalport goes without for five days. |
| `hl.count` | Coalport Result: {winner} Tops the Poll | Seven seats filled, {npcSeats} of them by local candidates. Turnout {turnout}. |
| `hl.stands-firm` | Coalport Stands Firm | Morale back above sixty. The branch thanks everyone who knocked a door. |
| `hl.ordinance-city` | {ordinance} in Force | {ordinanceLine} Five days, by order of the council. |
| `hl.polls-open` | Voting Open in Coalport | Vote from the paper or the Election card until {until}. Your vote is secret. |
| `hl.nominations` | Coalport Council: Candidates Wanted | Organisers who are Known in the town can stand from the Election card until {until}. |

Sentinel and Gazette deltas: *Seated* / *Elected* stay; *ward members* → *local candidates*; *Nominations reopen today* → *Candidates can put their names in again today*; *The deposit stays with the district* → *The 10 Political Capital stays with the district*; *Deposits are not returned; the Gazette has asked* → *The 10 Political Capital is not returned; the Gazette has asked*; *Bailiffs Known in the wards may file at Beacon House* → *Bailiffs who are Known in the town can stand from the Election card*; *Agents Known in the wards may file at the Rooms* → *Agents who are Known in the town can stand from the Election card*; *Council Rises Without a Motion* → *Council Can't Agree on a Rule*; *The council divides at* → *The council votes at*; *Moves {ordinance}* → *Puts Forward {ordinance}*; *Stands Down in Good Order* / *Retires from the Chamber* stay; *Polls Close in {city}* → *{city} Result*; *Polls Open in {city}* → *Voting Open in {city}*; *{city} Council: Nominations Open* → *{city} Council: Candidates Wanted*; *the ballot is secret* → *your vote is secret*; *{votes} votes* → *{votes} support* (the total is not a vote count).

### 1.13 The word table for prose, and the QA test

Apply to every body text, blurb, line and deck, in this order, ids excluded (a word preceded by `.`, `-` or `_` is an id):

| Old (regex, case kept) | New |
|---|---|
| `leaflets?` | flyer(s) |
| `bulletins?` (the printed sheet) | flyer(s) / the party paper |
| `ward lists` · `ward returns` · `canvass returns` | street lists · street returns · street returns |
| `the ward` (prose) · `on the ward` · `in the wards` | the streets · on the streets · in the town |
| `a ward is won` | a street is won |
| `canvassers?` (people) | helper(s) / party callers (ordinance lines) |
| `hoardings?` | fence(s) |
| `bills` (posters) | posters |
| `paste` (posters) | put up |
| `the count` (the event) | the result |
| `ballot` | vote |
| `endorse` · `endorsement(s)` · `endorsed by` | back · backer(s) · backed by |
| `nominations` | candidates (the phase) |
| `ordinance` | (council) rule |
| `order paper` · `motion` · `division` · `divides` | up for a vote · proposal · the council's vote · votes |
| `FXP` · `Faction XP` | Party XP |
| `\bPC\b` | Political Capital |
| `Local Standing` · `Standing` (the meter) | Reputation |
| `Successes` (a count) | wins |
| `Battleground` (tag, plate) · `Groundswell` | Close race · Comeback |

**The QA vocabulary test** (extends the content-policy regex): fail any player-facing string in `packages/content` or `packages/ui` that matches `canvass\w*|leaflet\w*|propaganda|ordinance\w*|endorse\w*|\bslate\b|order paper|\bdivision\b|\bdivides\b|\bmotion\b|nominations?|ballot\w*|\bFXP\b|\bPC\b|Local Standing|hoardings?|mimeograph|manifests?|groundswell`, excluding ids, comments and the rule names (*Public Works Order*, *Rally Permits*…). *Ward* is allowed only in the chapter title *His ward book*. *Standing* is allowed only in *Stand(ing) for the council*.

---

## 2. #4 — Hide the rolls (GDD §8.4, §13.1a)

### 2.1 The rule

**The player sees whether it came off and, if it didn't, why. Never the maths.** No percentage, no roll, no difficulty, no stat arithmetic, no bonus row, no ledger, anywhere a player reads: not on the ticket, not in the result, not behind a tap. The check formula is unchanged and the server still returns the full breakdown (CLAUDE.md engineering rule 6 stands for the API: the dev panel and QA read it); the client simply never renders it. The one number that stays is a stat's value where a stat is the subject (*Intelligence 12 → 13* on a training ticket; the Me tab).

### 2.2 The ticket, before the tap

`{Odds word} · {stat}`, where the odds word is a **band of the server's chance**:

| Chance | Word | The tap note (two lines, the review-1 help pattern) |
|---|---|---|
| 70 % and above | **Good odds** | GOOD ODDS · About three tries in four come off here. It uses your {Stat}. |
| 50–69 % | **Fair odds** | FAIR ODDS · About one try in two comes off here. It uses your {Stat}. |
| under 50 % | **Long shot** | LONG SHOT · Fewer than one try in two come off here. It uses your {Stat}; training it would help. |
| Training | **Always works** | — (the line reads *Intelligence 12 → 13 · always works*) |

The stat is the full word: *Good odds · Intelligence* · *Fair odds · Charisma and Intelligence* · *Good odds · your best, Strength*. Bonus and penalty tags name their source and say what they do in words, never a number: *First day in Duskwall · better odds*, *Open Doors · better odds*, *Close race · +25 % Party XP · better odds*, *Rain · worse odds*. Reward percentages (*+25 % Party XP*, *Rested +50 % XP and Iron*) stay: they are rewards, not odds.

**Recommendation: no percentage anywhere.** The user said the outcome is what matters; a word tells a first-time player whether to tap, the reason tells them what to do about it, and the band is honest (a 72 % and a 91 % are both *Good odds*, and both mostly succeed). The fallback, if the playtest shows players asking "how good?", is a bare percentage on the ticket only (`{chance} % · Intelligence`, no ledger); it is one line of `copy.ts` and is recorded as Appendix C #35. Three bands, not five: *Sure thing* would lie about the 95 % clamp, and *Very long shot* is a number in disguise.

### 2.3 The result, after the tap

The *How it went* section keeps one row per attempt and loses the bar, the marker, the sentence and the roll line:

```
1   Success   +45 XP
2   Partial   +23 XP
    Most of them were in a hurry. Your Intelligence is low for this. Train it at the Union Hall.
3   Success   +45 XP
```

- The row: the index, the outcome word (*Success* · *Partial* · tier 2–3 *Failure*) in its colour, the XP.
- Under a row that isn't a Success: **one reason line** (§2.4), body type, 12.5 px, the same slot the sentence had. Nothing opens on a tap.
- ×3 with two or three non-Success rows sharing a cause: the rows stay, the reason prints **once**, under the section: *2 of 3 didn't come off. Your Intelligence is low for this. Train it at the Union Hall.* Different causes print under their own rows.
- The narrative paragraph (headline and body) is unchanged and does its job: it already says *Most of them walk past*. The reason is the rule's voice, not the story's, so it never repeats the story; it starts after it.
- The rewards tiles, the knock-on lines and the buttons are unchanged.
- Journey cards, Ambition chapters and (later) tier-2 missions follow the same rule: the stamp and the reason, no maths.

### 2.4 Reason templates (computed from the check, no numbers shown)

Inputs the server already returns per attempt: `stats[]`, `statValues[]`, `statValue` (what the maths used: the value, the average or the best), `difficulty`, `statTerm`, `bonuses[{ id, label, value }]`, `chance`, `roll`, `outcome`, `best`. The reason is chosen by **the largest thing that went against the player**, in this order:

| Cause | When | Template |
|---|---|---|
| `statLow` | `statValue < difficulty` and `chance < 60` (single stat) | *Your {Stat} is low for this. Train it at {place}.* |
| `statLowCha` | the same, the stat is CHA | *Your Charisma is low for this. It comes from what you wear; a better coat helps.* |
| `statLowTwo` | the same, two stats: `{Weak}` is the lower of the two | *This needs {StatA} and {StatB}, and your {Weak} is the low one. Train it at {place}.* (CHA: *…the low one. It comes from what you wear.*) |
| `statLowBest` | the same, a best-stat check | *Even your best, {Stat}, is low for this. Training anything would help.* |
| `penalty:{id}` | a bonus with `value < 0` is larger in size than a negative `statTerm`, and `chance < 60` | one line per penalty id: weather *The rain was against you.* · inspector *The Branch Inspector was watching.* · rival-ground *This is rival ground; everything is harder here.* · a new id must ship with its line |
| `luckGood` | `chance ≥ 70` | *Bad luck. The odds were good; it just didn't come off. Try again.* |
| `luckFair` | otherwise (50–69, or a stat a point or two low lifted by bonuses) | *The odds were only fair. Every win here builds your reputation, and reputation lifts the odds.* |
| `failure` (tier 2–3) | `outcome === 'failure'` | *It went badly.* followed by the cause line above |

`{place}` is the residence city's training location for that stat (the `trains` action's location name, with its `ref` where it has one: *the Union Hall*, *the Fortress Gate*, *Harbour Quays*); when the city has none for that stat, the sentence ends at *…low for this.* `{Stat}` is the full word. The band's tap note (§2.2) uses the same `{Stat}`. **No template prints a number**; the QA test for §2 is that `attempt-reason` never matches `\d`.

### 2.5 Strings for `copy.ts` (replacing `copy.odds.*`)

```
odds.band:        (chance) => chance >= 70 ? 'Good odds' : chance >= 50 ? 'Fair odds' : 'Long shot'
odds.ticket:      (band, statLine) => `${band} · ${statLine}`          // "Good odds · Intelligence"
odds.statLine:    (names) => names.join(' and ')                         // "Charisma and Intelligence"
odds.statBest:    (name) => `your best, ${name}`
odds.alwaysWorks: 'always works'                                         // "Intelligence 12 → 13 · always works"
odds.note.good:   (stat) => ['Good odds', `About three tries in four come off here. It uses your ${stat}.`]
odds.note.fair:   (stat) => ['Fair odds', `About one try in two comes off here. It uses your ${stat}.`]
odds.note.long:   (stat) => ['Long shot', `Fewer than one try in two come off here. It uses your ${stat}; training it would help.`]
odds.betterOdds:  'better odds'                                          // tag suffix: "Open Doors · better odds"
odds.worseOdds:   'worse odds'
reason.statLow:     (stat, place) => `Your ${stat} is low for this.${place ? ` Train it at ${place}.` : ''}`
reason.statLowCha:  'Your Charisma is low for this. It comes from what you wear; a better coat helps.'
reason.statLowTwo:  (a, b, weak, place) => `This needs ${a} and ${b}, and your ${weak} is the low one.${weak === 'Charisma' ? ' It comes from what you wear.' : place ? ` Train it at ${place}.` : ''}`
reason.statLowBest: (stat) => `Even your best, ${stat}, is low for this. Training anything would help.`
reason.penalty:     { weather: 'The rain was against you.', inspector: 'The Branch Inspector was watching.', 'rival-ground': 'This is rival ground; everything is harder here.' }
reason.luckGood:    "Bad luck. The odds were good; it just didn't come off. Try again."
reason.luckFair:    'The odds were only fair. Every win here builds your reputation, and reputation lifts the odds.'
reason.failure:     (cause) => `It went badly. ${cause}`
reason.batch:       (n, of, cause) => `${n} of ${of} didn't come off. ${cause}`
stat.names:         { str: 'Strength', int: 'Intelligence', agi: 'Agility', cha: 'Charisma' }
```

Retired: `odds.above/below/equal/two/best/bonusOne/bonusMany/capped/rollSuccess/rollPartial/rollPartialNoFail/rollFailure/ledger*/ticketBest`, `packages/ui/src/odds.ts`'s `oddsSentence`, `rollLine`, `ledger`, and `CheckBreakdownList` from every player screen (the dev panel may keep it).

### 2.6 What this changes elsewhere

- **§7.5, the first landing:** the first ticket reads *Good odds · your best, Strength* with the tag *Party order 0 / 2 · +25 % Party XP* and *First day in Duskwall · better odds*.
- **Reputation card and headlines:** no percentages (*Everything you do in Duskwall goes a little better now.*); the ladder's thresholds (10 / 30 / 70 / 150 wins) stay, since they are goals, not odds.
- **The Open Doors rule** reads *Talking to voters: better odds*; the *Close race* tag reads *better odds*.
- **Appendix C #33** (the *First day* taper) is now unmeasurable from the screen, which is fine: the band hides a 10-point step for every build (76 → 81 stays *Good odds*; 60 → 65 stays *Fair odds*).
- **Economy:** nothing (`docs/economy.md` §17).

---

## 3. #5 — Political Capital

**The label is *Political Capital*, in full, on every screen size**: the HUD (*Political Capital 12*; on the narrowest phones the HUD may wrap it to two lines, never abbreviate), the tiles (*+5 Political Capital*), every price (*Stand for the council · 10 Political Capital*), every headline and knock-on line (*−10 Political Capital · 35 left*). *PC* appears nowhere a player reads, including `aria-label`s. GDD §6.5 and §7.5 say so.

The help note (tap the label): **POLITICAL CAPITAL** · *Your pull in the party. You earn it by doing all three Party orders (+5 a day) and by holding a council seat. You spend it to stand for the council (10), to back a candidate (10) or to put a rule to the council (20).*

---

## 4. #6 — The council flow, from the player's side (GDD §15.3; `slice-3-screens.md`)

### 4.1 What went wrong, as a player

They made Rank 2, saw a row in the paper, voted, saw a modal, and then: nothing on any screen said *you voted, the result comes Sunday*; nothing on the city screen mentioned an election at all; the names were on a screen reachable only from a row that had changed state; "registered for something" (standing, or backing) put a line on a card inside the HQ sheet and nowhere else; and the result, when it came, was a headline in a paper they may not have opened that morning. Every act was one tap, as designed, and every act **left no trace where the player looks next**. The rules are fine; the state was invisible.

### 4.2 The redesign in one paragraph

**One Election card**, on the city screen under the plate (folding with it on phones) and as the same row in the paper, is where the election lives. It always says **which phase it is in plain words, what you can do right now, how long is left, and one button**. Every political act ends in a modal that says **what happened and what comes next**, and the card changes the moment the modal closes. **The candidates are reachable every day** (*See who's standing*), and **the last result stays reachable all cycle** (*See the result*). The words are §1.2's: *candidates*, *voting*, *the result*, *backers*, *stand*, *council rule*.

### 4.3 The Election card (and the paper's Election row)

Kicker **ELECTION · COALPORT COUNCIL** (tap the label for the help note); line 1 in body; line 2 in Courier with the countdown; one primary button, at most one secondary. The server chooses the state:

| Phase · the player | Line 1 | Line 2 (countdown) | Button(s) |
|---|---|---|---|
| Candidates · below Rank 2 | Coalport elects its council on Sunday | Activists vote · 400 Party XP makes an Activist · you have {fxp} | See who's standing |
| Candidates · Rank 2, not standing | Candidates are putting their names in | Voting opens Wednesday · {n} days to stand or back someone | See who's standing · **Stand for the council · 10 Political Capital** (Rank 3 and Known only) |
| Candidates · standing | You're standing · backers {n} of 2 | Two backers by Tuesday midnight or your name comes off · do today's orders and the branch backs you | See the candidates |
| Candidates · backed someone | You're backing {name} | Voting opens Wednesday · {n} days | See who's standing |
| Voting · not voted | **Voting is open** | Closes Saturday midnight · {n} days left · your vote is secret | **Vote now** |
| Voting · voted | You voted for {name} | Result Sunday morning, here and in the Clarion | See the candidates |
| Voting · a candidate, not voted | You're a candidate · voting is open | Closes Saturday midnight · you can vote for yourself | **Vote now** |
| Result (days 0–1) · everyone | Result: {winner} topped the poll · {your line} | Seven seats · the new council sits until Thursday · next election: names in until Tuesday | **See the result** · Stand for the council · 10 Political Capital (if eligible) |
| Result · councillor, not voted on the rule | **You're on the council** · vote on the rule | The council votes Tuesday midnight · {n} days | **Vote on the rule** |
| Result · councillor, voted | You voted for {rule} | Result Wednesday morning | See the council |
| Any day, a rule in force | (a third Courier line) Council rule: {rule} · {n} days left | | |

`{your line}` on the result morning: *you: elected, 3rd of 7* · *you: missed the last seat by 3* · *your vote: {name} was elected* · *your vote: {name} fell short*; nothing for a player who neither stood nor voted. The countdown: *{n} days left* (days to the closing boundary, rounded up, in the player's clock), and *closes tonight at midnight* on the last day. The paper's row prints line 1 and line 2 and taps to the same place; the Paper tab's dot rule is unchanged (a vote not cast; a councillor's rule vote not cast).

**First appearance:** on the morning a player makes Rank 2 the card carries a one-line note above the kicker, once: *Coalport elects its council every five days. You can vote now; Organisers who are Known here can stand.* The `hl.*.rank-up-2` deck (§1.8) says the same in the paper.

### 4.4 Every act ends in a result and a next step

The six modals (§1.10) each gain a **Next** line in the knock-on block, in Courier: *Next: the result, Sunday morning.* · *Next: find backers. Voting opens Wednesday.* · *Next: voting opens Wednesday.* · *Next: vote for a rule before 01:00 on Tuesday.* · *Next: the result, Wednesday morning.* The *Continue* button returns to the screen the act was taken from, with the Election card already in its new state (the client refetches the card with the modal's close). No act ends on a screen that looks the same as before it.

### 4.5 The screens, in plain words

- **Who's standing** (was *the slate*): the candidates, players first, then *Local candidates*; every row: the name, *Organiser · Known in Coalport · 2 backers* (a local: *local · Trusted in Coalport*), the platform line, and **Back · 10 Political Capital** where allowed. One Courier line at the top says how it is decided: *Seven seats. The seven with most support win. Support = local support (your reputation) + 3 per backer + votes.* The **Stand** card sits above the list for the eligible, with three tick lines and the cost line *Costs 10 Political Capital. You get it back only if you don't find two backers.*
- **Vote** (was *the ballot*): the same rows with a ring; sticky **Vote for {name}**; caption *One vote, final. The result is at 01:00 on Sunday.* After voting: *You voted for {name}* on the chosen row, the rest dimmed, no totals.
- **The result** (was *the count*): *Sunday's result*; the table's columns **#** · **Name** · **Local support** · **Backers** · **Votes** · **Support**; the seven seats marked; *you* and *your vote* on the rows; one Courier line under it: *Support = local support + 3 per backer + votes. Ties: votes, backers, reputation, who stood first.* Reachable from the card on days 0–1 and from the council screen (*Last result*) on days 2–4.
- **The council**: the seven seats (*Local seats 6 / 7*), **Up for a vote** (was *the order paper*): the party's proposal and any put forward, each with its one-line effect; **None of these**; **Put forward a rule · 20 Political Capital**; sticky **Vote for {rule}**; caption *One vote, final; the whole council sees it. The council votes at 01:00 on Tuesday.*
- **The HQ sheet's council card** is the Election card, the same component: one truth, three places.

### 4.6 For the developer's investigation: what must be visible

Whatever the bug, these are the checks that the redesign needs to pass; each was invisible or absent in the play-through:

1. **After a vote**, the city screen's Election card reads *You voted for {name} · Result Sunday morning* within the same session, without a reload; the paper's row reads the same.
2. **After standing** (declaring), the card reads *You're standing · backers 0 of 2* on the city screen, not only inside the HQ sheet; doing the day's orders moves it to *1 of 2* with the branch's line, on the spot.
3. **After backing**, the card reads *You're backing {name}*.
4. **On the count morning**, the paper's Election row and the card show the result whether the count ran by the job or lazily on first touch; a dev time-skip that advances the day key must trigger the same count. If the count did not run, that is the bug.
5. **The candidates screen is reachable every day** from the card, in every phase.
6. **The result is reachable for the whole cycle**, not only from the count-morning row.
7. **The winner's front page** shows on the first edition opened during the term (§3.3), even if the player skipped the count morning.

### 4.7 Screens doc

`docs/design/slice-3-screens.md` is revised in place: §1a (the Election card) is new; §2 (the paper's row), §3 (who's standing), §4 (vote), §5 (the result), §6 (the council), §7 (the HQ card), §8 (tickets, the odds words), §9 (the modals with *Next*) and §11 (copy) are changed and marked *(changed, review 2)*; §10 is unchanged.

---

## 5. Content and code changes for the developer, by file

1. `packages/content/src/data/cities/*.ts`: the action names of §1.4–§1.6; the body-text swaps of §1.13.
2. `orders.ts`: §1.7. `headlines.ts`: §1.8. `politicalHeadlines.ts`: §1.12. `copy.ts`: §1.9, §2.5, §4.5 (the Election-card states as `copy.election.*`, replacing `pd.*` and `cc.*`). `politics.ts`, `ordinances.ts`, `factions.ts`, `candidates.ts`, `ambitions.ts`, `origin.ts`: §1.10.
3. `packages/ui`: `Ticket.tsx` (type labels, the odds word, the band note, no breakdown), `ResultModal.tsx` (the attempt row and the reason; no bar, sentence, roll or ledger), `HudBar.tsx`, `Paper.tsx`, `Politics.tsx`, `OrdersComplete.tsx`; `odds.ts` reduced to the band, the stat line and the reason selector. `apps/client`: `city.tsx` (the Election card under the plate; *Reputation*), `council.tsx`, `me.tsx`, `errors.ts`.
4. `packages/rules`: no formula change. The result payload gains nothing; the client needs `statValue`, `difficulty`, `statTerm`, `bonuses`, `chance`, `outcome`, `stats`, `statValues`, `best`, which it already has. A `trainingPlaceFor(cityId, stat)` helper (content lookup) for the reason line.
5. Tests: the QA vocabulary regex of §1.13; `attempt-reason` never contains a digit; the odds word matches the band; the Election card's state table (§4.3) as a table test; the six modals carry a *Next* line.
6. Migration: `ord.ward-register` → `ord.street-register`, `ord.ward-fund` → `ord.street-fund` wherever a city document or an election record holds the id (or alias the old ids in the loader).
