# Review 1 — design and copy answers (30 Sep 2026)

> **Vocabulary superseded (review 2, 30 Sep 2026).** Player-facing words follow `docs/design/review-2-answers.md` §1 and GDD §1.5: *canvass* → *talk to voters*, *flyers* → *flyers*, *ordinance* → *council rule*, *endorse* → *back*, *the slate* → *who's standing*, *nominations* → *candidates*, *the ballot* → *vote*, *the count* → *the result*, *Local Standing* → *Reputation*, *FXP* → *Party XP*, *PC* → *Political Capital*, *Battleground* (the state) → *close race*, *Groundswell* → *comeback*, *Polling Day* → *Election*. Action and order titles below were updated mechanically; rule prose keeps the design's terms. Odds and rolls are no longer shown to players (GDD §8.4): percentages quoted here are design maths, not screen text.

Answers to the design items of `docs/review/2026-09-30-review-1.md`. The user's notes are direction; every rule change here is pinned in `docs/GDD.md` (§0, *Added 30 Sep 2026 (review 1)*) and the pacing check is `docs/economy.md` §16. Pure-code items (#3, #4, #7, #10, #14's build) are the developer's; #14's design is confirmed below.

Nothing here adds a step to a session: every change is one tap, one modal, two or three lines.

| # | Item | Decision | GDD |
|---|---|---|---|
| 12 | The job | **A job is a wage.** Full daily pay at every boundary, automatically; no shift, no Energy, no ticket. The streak and sick days go; **seniority** (+2 % a day held, to +20 %; reset only by switching) replaces them. The 14-day cap on return stays | §9, §4.2, §4.3, §15.3 |
| 8 | Low odds on the first actions | **The first day is played on your best stat**: the welcome set routes to the player's best trained stat, committee sessions and a chapter-1 approach check the best stat, a **First day +10 %** bonus covers the flat builds, and every ticket names its stat before the tap | §7.5, §8.4, §13.7, §17.1 |
| 6 | "Be at the gate" | Every order title is **what to do and where** (*Talk to the customs men at the Fortress Gate*); the secretary's line keeps the voice. All 42 templates rewritten below. Tapping an order opens its pin with the ticket highlighted | §13.7 |
| 9 | The breakdown | Default is **one plain sentence** (*Your INT 5 is 3 below the 8 this needs: 38 %*) and a short roll line; the ledger stays behind a tap, reworded | §8.4 |
| 1, 2, 5 | Help and labels | **Tap the label**: every dotted-underlined label opens a two-line note in the paper's voice. No "i" icons. One first-time hint on the plate | §3.7, §7.5 |
| 11 | Orders complete | **A modal in the secretary's voice** when the third order is done, after the result modal is closed. A single order gets a signed line inside the result modal, no modal | §13.7, §15.4 |
| 13 | Stat points | **STR, INT or AGI** (AGI joins). The choice screen says what each stat does here, computed from the residence city's actions | §5.3, §8.5 |
| 14 | FXP in the HUD | Yes: a second thin bar under XP, in the faction colour, to the next Rank, labelled with the rank title (the number on narrow phones) | §5.4, §7.5 |
| 15 | Standing level-up | A **Standing card** inside the result modal (the level-up pattern): the new title, the bonus now, and what the next level brings. *One of Us* pays **1 PC a day** (pinned) | §13.4 |
| 10 | Council "Order done" | Rule answer, if needed: there is **no once-a-day rule** on a committee session; it is a tier-1 action like any other, repeatable while Energy lasts (10). If the ticket was locked, it is a bug | §13.3 |

---

## 1. #12 — The job is a wage (GDD §9, rewritten)

**What the user asked for:** no Energy, no shift action, pay per day credited automatically.

### 1.1 The rules

- **One job.** Taken with one tap on a Jobs card at the job's location; free; requirements (Level, a stat) checked on taking, never again. **Switching** is one tap, free, takes effect at once and **resets seniority to 0**. No Energy anywhere.
- **Pay:** at every 00:00 UTC boundary the job held at that moment pays its **full daily pay**, whether or not the player opened the game. The member's fifth (the faction's own job) is a line of its own on the base pay.
- **Seniority:** **+2 % of daily pay for every City Day the job has been held**, counting boundaries paid, **to +20 % after ten days**. Paid as its own line at the boundary (*Seniority 4 days: +17*). It never falls except by switching, and it goes on counting while the player is away (absence costs opportunity, never the rate). The seniority headlines fire the morning after it first reaches 5 and 10.
- **Away:** a return credits **at most 14 days' pay** (the fortnight cap, unchanged in spirit: Appendix C #17); the job is kept and pay resumes at the next boundary. A player seen at least once a fortnight never notices.
- **Streak and sick days are gone.** They measured shifts; with nothing to miss there is nothing to protect. (Why not a "days played" streak, which the user offered: it would tie the wage to logging in, which is the kind of hook §4 removed on purpose, and it needs a definition of "played". Seniority keeps the one thing the streak was for, a rising rate that a switch costs, and keeps it passive.)
- **Under an ordinance:** the seniority line and an ordinance's pay line are each a percentage of the unmodified daily pay, shown as separate lines that add up; the boundary uses the ordinance in force on the day that ended.
- **What a job is for now:** an income that costs no Energy, so the whole bar goes on politics. The choice is *which* job: the faction's own job pays members a fifth more (216 against 180); the Driver (200, AGI 10) is the first thing training unlocks; later jobs pay in other coin (the reporter's Dossier entry a day, the Political aide's FXP and 2 PC a day). Jobs are also what the labour ordinances fight over (Public Works against the Ward Fund). "Getting players moving around the city" now belongs to the orders alone, which is where it was working anyway.

### 1.2 What goes, what changes

| Was | Now |
|---|---|
| The shift ticket on the location sheet, *Work your shift…*, the `job`-type actions and their outcome texts | Gone. The Jobs card stays and grows one line: *Stores hand · 216 a day, paid at midnight · seniority 4 days · +8 %*. Content drops `shiftEnergy`, `shiftActionId` and the `job` action type; the job blurbs stay on the card |
| *Shift worked · next at hh:mm*; *half at midnight, half for the shift* | *Paid at midnight* (the boundary in the player's clock) |
| *Switch · 2 Energy · streak resets* | *Switch · seniority resets* |
| Orders `dir.work-shift` / `dir.v.work-shift` / `dir.a.work-shift` (slot C, with the `noJob` variant) | Removed from the rotation. ***Take a job*** becomes its own welcome-only template (§3 below). Slot C's third habit is ***Five attempts anywhere in {city}*** (5 attempts, checked actions at home) |
| Headlines *Five / Ten Straight Shifts and Counting* (`hl.streak-5/10`, `hl.v.*`, `hl.a.*`, condition `streakHitYesterday`) | ***Five Days In at the {job}*** — deck *{name} has held the {job} for five days. Pay is up 10 %.* — and ***Ten Days In, Full Rate*** — deck *{name} has been {job} for ten days. Pay is up 20 %, the most seniority pays.* Condition `seniorityHitYesterday: [5]` / `[10]`; fires on crossing |
| The desk row *work streak and sick days* | *Paid: 216 Iron · Stores hand · seniority 4 days (+8 %)*, or *No job yet · take one at the Fortress Gate, the Customs Market or the Goods Yard* |
| The Today tally's *shift worked* | Dropped. Pay is not in the tally (it lands at the boundary and shows on the desk); *Iron earned* is from actions only |
| **Shift Hours Order** (−1 Energy; streak ×2), the Collective's branch motion | ***Long Service Order*: seniority builds two days a day (the +20 % cap unchanged).** Line: *The council backs long service: every day at the job counts double towards the rate.* Effect line: *Seniority ×2*. Still the Collective's motion. Effect kind `shiftStreakDays` → `seniorityDays: 2`; `shiftEnergyDelta` is removed from the DSL |
| Public Works Order *(the half pay and the shift)* | Unchanged number: job pay +10 %, a line of its own on the unmodified pay, beside seniority's |
| Ward Fund | Unchanged |
| The result modal after a shift (*Continue* only), *stamp: worked*, `effects.shift` | Gone |
| Premium *Remote Work* (§23.2) | Retired: there is nothing to work remotely |
| §15.8 *Eight-Hour Day* (slice 7) | *Salary +10 %; seniority ×2* |
| §17.4 home perk *a second job shift once a week* | *An extra day's pay once a week* |

### 1.3 Pacing (`docs/economy.md` §16)

The reference player's Iron is unchanged within 3 % (216 full pay plus up to +43 seniority against the old 108 + ~121); the 4 Energy freed a day is one intelligence tap, about +20 XP, which moves no milestone. Day 1 loses the shift's ~112 Iron (nothing to buy). The cap on return is now 14 × 216 = 3,024 Iron, about three reference days. A capital resident keeps the home job at full pay from anywhere, so the Porter (180) is only for a player with no job.

---

## 2. #8 — The first day is played on your best stat (GDD §7.5, §8.4, §13.7, §17.1)

**What happened:** a Vanguard recruit with INT 5 (STR from the origin, +3 STR from the faction) was sent by the welcome set to an INT committee (38 %), given an INT Ambition chapter (38 %), and found INT on nine of Duskwall's fifteen checks. The reference recruits are INT-heavy, so the tuning never saw it.

**Why no single option fixes it.** Routing the welcome set to the best stat (a) leaves the flattest build (8 / 8 / 8) at 50 %. A newcomer difficulty (c) alone still sends a STR player to an INT committee at 46 % and hides which stat mattered. Showing the stat (d) changes no odds. So the pin is **one rule with four parts**, each a named line in the maths:

1. **The welcome set routes by best trained stat** (the highest of STR, INT, AGI; ties to the faction's bonus stat, then INT, then STR). Slot A names a political action that checks that stat; **the first landing opens that action's pin**; the welcome headline's *Spend it at {place} first* names the same place. Slot B (the committee) and slot C (*Take a job*) are unchanged.

   | City | STR | INT | AGI |
   |---|---|---|---|
   | Coalport | *Talk to the dockers at Harbour Quays* (`coalport.quays.noon-break`, existing `dir.noon-break`) | *Talk to the workers at the Mill Gate* (`coalport.mill-gate.canvass`, `dir.shift-change`; the reference recruit, unchanged) | *Hand out flyers on Market Row* (`coalport.market-row.leaflets`, new welcome template `dir.w.leaflets-market-row`, 2 attempts, 16 Energy) |
   | Duskwall | *Talk to the customs men at the Fortress Gate* (`duskwall.garrison-gate.canvass`, `dir.v.guard-change`) | *Talk to the queue at the Customs Market* (`duskwall.quartermaster-market.canvass`, new `dir.v.w.ration-queue`) | *Hand out flyers at the Customs Market* (`duskwall.quartermaster-market.leaflets`, new `dir.v.w.leaflets-market`) |
   | Ashford | *Put up posters on Weavers' Row* (`ashford.weavers-row.bills`, new `dir.a.w.bills`) | *Talk to the printers at Gazette House* (`ashford.gazette-house.print-room`, `dir.a.print-room`) | *Slip flyers into the paper at Gazette House* (`ashford.gazette-house.evening-run`, new `dir.a.w.evening-run`) |

   Welcome-only templates carry `use: 'welcome'` and never enter the rotation. Lines for the new ones are in §3.4.

2. **Best-stat checks.** A **council session** (the committee) checks the player's **best trained stat**: the committee gives you the work you are fit for. The ticket names it: *70 % · your best, STR 13*. And **every Ambition chapter 1 gets a third approach, *Legwork***, that checks the best stat (texts in §2.1). Rule in §8.4 beside two-stat checks.

3. **First day +10 %.** On the **welcome day** every checked action in the home city carries a bonus row *First day in {city} +10 %*. The welcome day is the City Day of creation, **and the next one when the character was created after 22:00 UTC** (this closes Appendix C #18: the welcome set extends the same way). The bonus ends at the boundary; by then the day's level points (three for the reference recruit) and *Familiar* (+3 %) have replaced it, so the odds on day 2 are never lower than on day 1.

4. **Every ticket names its stat before the tap**: *62 % · STR 11*; *44 % · CHA 2 + INT 11*; *70 % · your best, STR 13*. This is also the default line of #9.

**The band, checked** (home, difficulty 8, welcome day):

| Build | Best stat | Slot A on the welcome day | End of day 1 (3 level points, *Familiar*) |
|---|---|---|---|
| All-in (library, watched, read people, Alliance) | 16 | 82 + 10 = **92 %** | 95 % (clamp) |
| Reference recruit (Collective) | 12 | 66 + 10 = **76 %** | 81 % |
| The user's Vanguard (STR 13 or so, INT 5) | 13 | 70 + 10 = **80 %** on the gate canvass, the committee and *Legwork* | 85 % |
| Flattest (8 / 8 / 8) | 8 | 50 + 10 = **60 %** | 65 % |

Every build's first session sits in 60–85 % (the all-in build above it, which is fine), and nothing falls on day 2.

**Content follow-ups, not pinned** (a later content pass; ids given so nothing is lost): Duskwall is 9 INT / 4 STR / 2 AGI for the STR faction, and Ashford has one STR check in sixteen. Suggested: `duskwall.beacon-house.duplicator` STR (a crank is a crank), `ashford.gazette-house.print-room` STR in the Fortress Gate's mould (then the Ashford STR welcome moves there), and one AGI canvass per city. The mix rule in §13.3 stays: INT the most common check, never the only useful one.

### 2.1 The *Legwork* approaches (chapter 1, step 2; best-stat check, difficulty 8)

| Ambition | Approach text |
|---|---|
| Finish His Work — *Three names* | **Legwork.** *Walk his three streets yourself, book in hand, and knock until the names answer.* |
| Clear His Name — *The Mill Fire of '19* | **Legwork.** *Walk the mill road at the shift change and find who was on nights in '19.* |
| Settle His Debts — *The man in the good coat* | **Legwork.** *Walk the riverside road first and see whose house he goes back to.* |

The outcome texts are the step's existing ones; an approach chooses a check, not a story.

---

## 3. #6 — Orders that say what and where (GDD §13.7)

**The title rule:** `{Do} at/on/in {Place}`, plain, no metaphor; the UI adds the count (*Talk to the customs men at the Fortress Gate (0 / 2)*). City-wide orders say *anywhere in {city}* and the secretary's line lists the places. The secretary's line keeps the voice. Tapping an order opens its pin with the matching ticket highlighted; a city-wide order opens the first pin in pin order with a matching ticket, and every matching ticket wears the *Party order n / m* tag. Titles fit a phone list at 44 characters or fewer.

### 3.1 The Collective — Secretary Holm, Coalport

| Id | Slot | Title | Line | Match · target |
|---|---|---|---|---|
| `dir.canvass-coalport` | A | Talk to voters anywhere in Coalport | Three wards, three conversations. Go and have them. | canvass, coalport · 3 |
| `dir.shift-change` | A | Talk to the workers at the Mill Gate | The afternoon shift comes off at four. Be at the Mill Gate before it. | `coalport.mill-gate.canvass` · 2 |
| `dir.foundry-row` | A | Knock on doors in Foundry Row | Sixty doors in Foundry Row. Start at the top and work down. | `coalport.terraces.canvass` · 2 |
| `dir.noon-break` | A | Talk to the dockers at Harbour Quays | The dockers eat at noon. So do you, on the quay. | `coalport.quays.noon-break` · 2 |
| `dir.anchor` | A | Win over the regulars at The Anchor | Sit with the regulars, not at the bar. Listen first. | `coalport.anchor.regulars` · 2 |
| `dir.paper-the-town` | B | Spread the word anywhere in Coalport | Flyers on Market Row, posters on the quays, chalk on Foundry Row or the mimeograph. Any three. | propaganda, coalport · 3 |
| `dir.say-it` | B | Make a speech anywhere in Coalport | The market cross or the gate steps. Somebody has to stand up today. It's you. | speech, coalport · 1 |
| `dir.report` | B | Go to the branch meeting at the Union Hall | Committee at six. Bring the ward lists. | `coalport.union-hall.committee` · 1 |
| `dir.ears-open` | B | Watch and listen anywhere in Coalport | The customs shed on the quays, or the bar at the Anchor. Sit, watch, write it down. | intelligence, coalport · 2 |
| `dir.sharpen-up` | C | Train once, anywhere in Coalport | A tired organiser is a bad one. An hour in the reading room, on the hooks, or running for the street committee. | training · 1 |
| `dir.full-day` | C | Six wins anywhere in Coalport | Six wins before the paper goes to bed. | checked, home · 6 Successes |
| `dir.five-in-the-book` (new) | C | Five attempts anywhere in Coalport | Five entries in the day book, win or lose. Volume is the point. | checked, home · 5 attempts |
| `dir.take-a-job` (welcome only) | C | Take a job at the Mill Gate | The party doesn't pay wages. The mill does, and a fifth more to members. Paid at midnight, every day. | takeJob · 1 |
| `dir.w.leaflets-market-row` (welcome, AGI) | A | Hand out flyers on Market Row | Quick hands between the stalls. Two rounds, before the inspector wakes up. | `coalport.market-row.leaflets` · 2 |
| `dir.restore-canvass` | A (crisis) | Win back Coalport: talk to voters anywhere | The wards are asking what the branch is for. Answer them at the door: three conversations, today. | canvass, coalport · 3 · +40 |
| `dir.restore-speech` | B (crisis) | Win back Coalport: a speech anywhere | The Anchor says the party has gone quiet. Prove it wrong, out loud, from the plinth. | speech, coalport · 1 · +40 |

### 3.2 The Vanguard — Organiser Stahl, Duskwall

| Id | Slot | Title | Line | Match · target |
|---|---|---|---|---|
| `dir.v.canvass-duskwall` | A | Talk to voters anywhere in Duskwall | Three wards. Three reports on my desk by tonight. | canvass, duskwall · 3 |
| `dir.v.guard-change` | A | Talk to the customs men at the Fortress Gate | The customs shift changes at four. Be at the Fortress Gate before it. | `duskwall.garrison-gate.canvass` · 2 |
| `dir.v.rampart-row` | A | Knock on doors in Rampart Row | Every door on Rampart Row. Top to bottom, no gaps. | `duskwall.rampart-row.canvass` · 2 |
| `dir.v.loaders` | A | Talk to the loaders at the Goods Yard | The loaders stop at noon. So do you, beside them. | `duskwall.goods-yard.loaders` · 2 |
| `dir.v.clerks` | A | Talk to the clerks at the State Archives | The clerks leave at five. Catch them on the steps. | `duskwall.archives.clerks` · 2 |
| `dir.v.paper-the-town` | B | Spread the word anywhere in Duskwall | Flyers at the market, posters at the yard, chalk on the Row or the duplicator. Three, in order. | propaganda, duskwall · 3 |
| `dir.v.say-it` | B | Make a speech anywhere in Duskwall | The gate steps, the lorry bed or the yard at six. Somebody addresses the town today. You. | speech, duskwall · 1 |
| `dir.v.report` | B | Go to the district meeting at Beacon House | Committee at six. Bring your ward lists, in order. | `duskwall.beacon-house.committee` · 1 |
| `dir.v.eyes-open` | B | Watch and listen anywhere in Duskwall | The registers at the Archives or the manifests at the yard. Watch, note, report. Names and times. | intelligence, duskwall · 2 |
| `dir.v.sharpen-up` | C | Train once, anywhere in Duskwall | A soft organiser is no use to me. The bonded store, the reading room, or the ward office's messages. | training · 1 |
| `dir.v.full-day` | C | Six wins anywhere in Duskwall | Six wins before lights out. | checked, home · 6 Successes |
| `dir.v.five-in-the-book` (new) | C | Five attempts anywhere in Duskwall | Five entries in the day book. I read it every night. | checked, home · 5 attempts |
| `dir.v.take-a-job` (welcome only) | C | Take a job at the Fortress Gate | The movement does not pay wages. The customs stores do, and members draw a fifth more. Paid at midnight. | takeJob · 1 |
| `dir.v.w.ration-queue` (welcome, INT) | A | Talk to the queue at the Customs Market | Sixty people in the sugar queue with nowhere to go. Twice through the line, price list in hand. | `duskwall.quartermaster-market.canvass` · 2 |
| `dir.v.w.leaflets-market` (welcome, AGI) | A | Hand out flyers at the Customs Market | The tent rows, at a trot. Two rounds before the inspector notices. | `duskwall.quartermaster-market.leaflets` · 2 |
| `dir.v.restore-canvass` | A (crisis) | Win back Duskwall: talk to voters anywhere | Rampart Row has questions. Three wards, three answers, in order, on my desk tonight. | canvass, duskwall · 3 · +40 |
| `dir.v.restore-speech` | B (crisis) | Win back Duskwall: a speech anywhere | The town doubts the committee. Address the town today and leave no doubt. | speech, duskwall · 1 · +40 |

### 3.3 The Alliance — Mr Grey, Ashford

| Id | Slot | Title | Line | Match · target |
|---|---|---|---|---|
| `dir.a.canvass-ashford` | A | Talk to voters anywhere in Ashford | Three wards, three conversations. Off you go. | canvass, ashford · 3 |
| `dir.a.print-room` | A | Talk to the printers at Gazette House | The print-room shift comes off at four. Be at Gazette House with the flyers. | `ashford.gazette-house.print-room` · 2 |
| `dir.a.weavers-row` | A | Knock on doors in Weavers' Row | Sixty doors on Weavers' Row. Knock them all, and be polite. | `ashford.weavers-row.canvass` · 2 |
| `dir.a.students` | A | Talk to the students at the University Quad | The students come out at eleven. Catch them before the coffee house does. | `ashford.university.students` · 2 |
| `dir.a.court-queue` | A | Talk to the queue at the Courts | The public queue at the Courts is bored and can't leave. Perfect. | `ashford.courts.queue` · 2 |
| `dir.a.paper-the-town` | B | Spread the word anywhere in Ashford | The evening run, the stalls on Bridge Street, the yard hoardings, the duplicator or the letters. Any three. | propaganda, ashford · 3 |
| `dir.a.say-it` | B | Make a speech anywhere in Ashford | The Union debate, the court steps or the bridge. Somebody has to speak today. It's you. | speech, ashford · 1 |
| `dir.a.report` | B | Go to the meeting at the Assembly Rooms | Committee at six. Bring the ward returns and a pencil. | `ashford.assembly-rooms.committee` · 1 |
| `dir.a.ears-open` | B | Watch and listen anywhere in Ashford | The wires at Gazette House, or the public gallery at the Courts. Write it down. | intelligence, ashford · 2 |
| `dir.a.sharpen-up` | C | Train once, anywhere in Ashford | A tired canvasser is a bad one. The college reading room, the newsprint lorry, or the tenants' messages. | training · 1 |
| `dir.a.full-day` | C | Six wins anywhere in Ashford | Six wins before the Gazette goes to bed. | checked, home · 6 Successes |
| `dir.a.five-in-the-book` (new) | C | Five attempts anywhere in Ashford | Five lines in the day book, and I count the lines. | checked, home · 5 attempts |
| `dir.a.take-a-job` (welcome only) | C | Take a job at Gazette House | The Alliance doesn't pay wages. The Gazette does, and a fifth more to members. Paid at midnight. | takeJob · 1 |
| `dir.a.w.bills` (welcome, STR) | A | Put up posters on Weavers' Row | The yard hoardings on Weavers' Row, bucket and brush. Two rounds, straight and high. | `ashford.weavers-row.bills` · 2 |
| `dir.a.w.evening-run` (welcome, AGI) | A | Slip flyers into the paper at Gazette House | The evening edition to the stands before the trams fill. Two runs. Don't drop any. | `ashford.gazette-house.evening-run` · 2 |
| `dir.a.restore-canvass` | A (crisis) | Win back Ashford: talk to voters anywhere | Ashford is muttering. Three wards, three honest conversations, and listen more than you talk. | canvass, ashford · 3 · +40 |
| `dir.a.restore-speech` | B (crisis) | Win back Ashford: a speech anywhere | The Rooms have gone quiet and the town has noticed. Speak today, anywhere with a crowd. | speech, ashford · 1 · +40 |

### 3.4 Rotation after the change

Slot A rotates the five home canvass orders (day mod 5); slot B the four (day mod 4); slot C rotates *Train once* · *Six wins* · *Five attempts* (day mod 3). The welcome set is slot A by best stat (§2), *Sit in on the committee at {HQ}*, *Take a job at {place}*. `use: 'welcome'` templates and the `noJob` field: the former replaces the latter, since *Take a job* is now only ever the welcome order. The welcome headline deck's last sentence becomes *Spend it at {slot A's place} first.*

---

## 4. #9 — A breakdown a person can read (GDD §8.4)

The pillar stands (the maths is never hidden); the default just has to be a sentence.

**On the ticket, before the tap:** `{chance} % · {stat line}`, where the stat line is *STR 11*, *CHA 2 + INT 11* (two-stat) or *your best, STR 13* (best-stat). Tapping the percentage opens the ledger (below).

**In the result modal, under each row's bar:** two short lines.

1. The odds, one sentence:
   - above: *Your INT 12 is 4 above the 8 this needs: 66 %.*
   - below: *Your INT 5 is 3 below the 8 this needs: 38 %.*
   - equal: *Your INT 8 matches the 8 this needs: 50 %.*
   - two stats: *CHA 2 and INT 11 average 6, 2 below the 8 this needs: 42 %.* (the average is shown rounded down as the maths uses it; if the rule rounds otherwise, print what the rule used)
   - best-stat: *Your best, STR 13, is 5 above the 8 this needs: 70 %.*
   - with bonuses: the sentence ends *…: 66 %, and +6 % for being Known here: 72 %.* Several bonuses: *…: 66 %, and bonuses +16 %: 82 %.* (the ledger lists them)
   - clamped: *…: 98 %, capped at 95 %.*
2. The roll, one line: *Rolled 26: Success (38 or under).* · *Rolled 51: Partial (39 to 58).* · *Rolled 77: Partial (a canvass never fails).* For tier 2 and 3: *Rolled 77: Failure (more than 20 over).*

**Behind the tap (the ledger), reworded:**

| Line | Was | Now |
|---|---|---|
| Base | *Base 50 %* | *Even odds · 50 %* |
| Stat term | *INT 5 vs difficulty 8 (×4) −12 %* | *INT 5, 3 below the 8 needed, 4 % a point · −12 %* (above: *INT 12, 4 above the 8 needed, 4 % a point · +16 %*) |
| Two stats | *CHA 2 + INT 11 → 6 vs difficulty 8 (×4)* | *CHA 2 and INT 11, average 6: 2 below the 8 needed · −8 %* |
| Best stat | — | *Your best stat, STR 13: 5 above the 8 needed · +20 %* |
| Bonus rows | *Known in Coalport +6 %* | unchanged (they were readable) |
| First day | — | *First day in Duskwall · +10 %* |
| Total | *Chance 38 % (98 capped)* | *Chance · 38 %*; when clamped, *Chance · 95 % (98 before the cap)* |
| Footnote (one fixed line) | — | *Every check starts at even odds and moves 4 % for each point your stat is above or below what the job needs, plus bonuses; never under 5 % or over 95 %. A roll at or under the chance is a Success.* |

Strings for `copy.ts` (the developer wires them):

```
oddsAbove:   (stat, v, d, diff, pct) => `Your ${stat} ${v} is ${diff} above the ${d} this needs: ${pct} %.`
oddsBelow:   (stat, v, d, diff, pct) => `Your ${stat} ${v} is ${diff} below the ${d} this needs: ${pct} %.`
oddsEqual:   (stat, v, d, pct)       => `Your ${stat} ${v} matches the ${d} this needs: ${pct} %.`
oddsTwo:     (a, va, b, vb, avg, d, rel, pct) => `${a} ${va} and ${b} ${vb} average ${avg}, ${rel} the ${d} this needs: ${pct} %.`   // rel: "2 below" | "4 above" | "level with"
oddsBest:    (stat, v, d, rel, pct)  => `Your best, ${stat} ${v}, is ${rel} the ${d} this needs: ${pct} %.`
oddsBonusOne:(pct, label, b, total)  => `${pct} %, and +${b} % for ${label}: ${total} %.`   // label: "being Known here", "your first day in Duskwall", "Open Doors"
oddsBonusMany:(pct, b, total)        => `${pct} %, and bonuses ${b} %: ${total} %.`
oddsCapped:  (raw, cap)              => `${raw} %, capped at ${cap} %.`
rollSuccess: (roll, chance)          => `Rolled ${roll}: Success (${chance} or under).`
rollPartial: (roll, lo, hi)          => `Rolled ${roll}: Partial (${lo} to ${hi}).`
rollPartialNoFail: (roll, what)      => `Rolled ${roll}: Partial (a ${what} never fails).`   // what: the action type, lower case
rollFailure: (roll)                  => `Rolled ${roll}: Failure (more than 20 over).`
ledgerEven:  'Even odds'
ledgerStat:  (stat, v, rel, d)       => `${stat} ${v}, ${rel} the ${d} needed, 4 % a point`
ledgerTwo:   (a, va, b, vb, avg, rel, d) => `${a} ${va} and ${b} ${vb}, average ${avg}: ${rel} the ${d} needed`
ledgerBest:  (stat, v, rel, d)       => `Your best stat, ${stat} ${v}: ${rel} the ${d} needed`
ledgerChance:'Chance'
ledgerCapped:(raw)                   => `${raw} before the cap`
ledgerNote:  'Every check starts at even odds and moves 4 % for each point your stat is above or below what the job needs, plus bonuses; never under 5 % or over 95 %. A roll at or under the chance is a Success.'
ticketOdds:  (pct, statLine)         => `${pct} % · ${statLine}`   // statLine: "STR 11" | "CHA 2 + INT 11" | "your best, STR 13"
```

---

## 5. #1, #2, #5 — Help and labels

**One mechanism everywhere: tap the label.** Labels that carry help are set with a **dotted underline** (the printed-matter convention for a footnote); a tap opens a small note (Radix popover on desktop, a bottom sheet on phones) with a caps kicker, one or two lines, and *Close*. No "i" icons: the paper has none. **One first-time hint**, on the welcome day only, one line at the top of the city plate: *Anything underlined can be tapped for what it means.* It goes at the boundary.

The strings, in the paper's voice. `{n}` values come from the character; the developer fills them.

| Label (where) | Kicker | Note |
|---|---|---|
| **Energy** (HUD) | ENERGY | Every action costs Energy. It refills by itself, five points every ten minutes, up to 100. Nothing is lost by waiting: full at {time}. |
| **Rested** (HUD, desk) | RESTED | When Energy is full the refill banks here instead, up to 200. Each Rested point spent alongside an Energy point pays half again in XP and Iron. |
| **XP / Level** (HUD) | EXPERIENCE | Every action pays Experience. Levels open places, kit and the train, and each one gives a stat point. {n} more to Level {next}. |
| **Faction XP / Rank** (HUD, Me) | FACTION XP | Your standing in the party, earned by party work and orders. Ranks give rights: the vote at {rank2Title}, a council candidacy at {rank3Title}. {n} more to {nextTitle}. |
| **PC** (HUD, Me) | POLITICAL CAPITAL | Spent on politics: filing for the council (10), endorsing a name (10), moving an ordinance (20). Earned by carrying out all three orders (+5 a day) and by holding office. |
| **Standing** (plate) | LOCAL STANDING | How well {city} knows your face. Every Success here counts: Familiar at 10 gives +3 % on every check in the city, Known at 30 +6 %, Trusted at 70 +9 %, One of Us at 150 +12 % and 1 PC a day. |
| **The share bar** (plate; caption *Who holds {city}*) | WHO HOLDS {CITY} | Each party's share of the town, and in grey the undecided: Neutral is nobody's, and every canvass draws from it first. A home city never falls below half for its own party; the rest is the fight. |
| **Morale word** (plate, after the share) | MORALE | The home party's share is its morale. Fired up, 80 and over: party work here pays +10 % Faction XP. Steady: nothing special. Unrest, under 60: the branch is in trouble and the orders change. |
| **Ordinance line** (plate) | ORDINANCE | The council's standing order for the town, in force for five days and for everyone here whatever their party. Passed at the council by four votes of seven. |
| **Today** (the strip's label) | TODAY | What you have done since midnight. The day turns at {time}, and this becomes *Yesterday* in the morning paper. |
| Today: **Energy** | ENERGY SPENT | Energy spent today. A ×3 is three actions' worth. |
| Today: **attempts** | ATTEMPTS | Actions taken today, a ×3 counting three. |
| Today: **wins** | WINS | Successes today. Each one counts towards your standing here. |
| Today: **XP** | EXPERIENCE TODAY | Experience earned today, Rested included. |
| Today: **FXP** | FACTION XP TODAY | Faction XP earned today, the orders' bonuses included. |
| Today: **Iron** | IRON TODAY | Iron earned by actions today. Your wage lands at midnight and shows on the desk. |
| Today: **opinion** | OPINION MOVED | How far your work moved {city}'s meter today, in points of the town. A canvass is +0.05. |
| Today: **orders** | ORDERS | Party orders carried out today, of three. All three: +5 Political Capital. |
| Today: **trained** | TRAINED | Stat points trained today. |

Two label fixes go with these (the developer's #3, #4): the HUD reads *Energy* not *EN*, and the XP bar's value text reads *{xp} XP · {n} to Level {next}* by default, not only on hover.

---

## 6. #11 — The orders-complete moment (GDD §13.7, §15.4)

**All three orders done: one modal, in the secretary's voice, after the result modal is closed.** It keeps *one result, one modal* (the action's result is still its own modal) and gives the day's milestone its own beat: the secretary's portrait, a headline, three lines, two tiles (*+5 Political Capital* · *+60 Faction XP from orders today*; the second is the sum of the three completions, from the server), a line *Tomorrow's orders are in the morning paper*, and one button, *Carry on*. Shown once per day, on the next screen after the completing result; if the player closes the tab first, it waits and shows on the next open (resumable, like a story step).

| Faction | Headline | Body |
|---|---|---|
| Vanguard (Stahl) | Orders carried out | Three of three, {name}. Entered in the day book, in order. The committee will hear of it. — V.S. |
| Collective (Holm) | All three done | That's a day's work for the branch, {name}. Get some tea; the wards will still be there tomorrow. — P.H. |
| Alliance (Grey) | Three for three | Three for three, {name}. I've written it down, which around here is praise. — T.G. |

**A single order done: no modal.** The result modal's knock-on block gets a **signed line** in place of the plain *Order done*: the +20 FXP stays a visible number.

| Faction | One remains | Two remain |
|---|---|---|
| Vanguard | Order carried out · +20 FXP. One remains. — V.S. | Order carried out · +20 FXP. Two remain. — V.S. |
| Collective | Done, that one · +20 FXP. One to go. — P.H. | Done, that one · +20 FXP. Two to go. — P.H. |
| Alliance | Ticked · +20 FXP. One left. — T.G. | Ticked · +20 FXP. Two left. — T.G. |

When the third completes, the knock-on block reads *Order carried out · +20 FXP. That's all three: see the note.* and the modal follows. *Take a job* (no result modal) completes as a line on the Jobs card, as now, and can trigger the modal on the spot if it was the third.

---

## 7. #13 — Stat points: three stats and a reason (GDD §5.3, §8.5)

**Why it was STR or INT:** §8.5 had AGI growing "through stealth missions and training" so that the sneaking stat came from sneaking. Stealth missions arrive in slice 5; until then an AGI build (fished, outrun) has nothing but 30-Energy training to grow its best stat, which is a trap the origin story sets without warning.

**Change: the level-up point goes to STR, INT or AGI.** CHA stays worn (the wardrobe is the CHA economy, §8.2). AGI still grows a quarter-point per stealth Success later; the §8.3 milestones (30, 50, 75…) are reachable a little sooner for AGI-first players, which is the point of choosing it.

**The choice screen** (the level-up block in the result modal, and the Me tab): three buttons *STR 13 → 14* · *INT 5 → 6* · *AGI 8 → 9*, a lead line and one line per stat. The counts come from the residence city's checked actions: a single-stat action counts for its stat, a two-stat action for both, a best-stat action for none. The lead names the most common stat.

- Lead: *Most of the work in {city} uses {STAT}: {n} of {m} actions. Your best is {BEST} {v}.* (When the best is the most common: *…and it is your best, at {v}.*)
- STR: *Strength. Shift changes, loaders, posters, the gate steps: {n} of {m} actions here. Later, security work, marches and holding your own.*
- INT: *Intelligence. Queues, clerks, committees, the registers: {n} of {m} actions here. Later, espionage, exposés and the better-paid desks.*
- AGI: *Agility. Flyers, chalk, the evening run: {n} of {m} actions here. Later, stealth work and getting away clean.*
- Footer: *Charisma isn't trained. It's worn: your coat, your suit, your party outfit.*
- The waiting badge: *{n} points to place · nothing is lost by choosing later* (extends `pointsToPlace`).

For the three home cities today the counts are Coalport INT 9 / STR 3 / AGI 2 of 15, Duskwall INT 9 / STR 4 / AGI 2 of 15, Ashford INT 12 / STR 1 / AGI 2 of 16. INT leads everywhere, which is honest and useful to a STR player; the content follow-up in §2 would soften Duskwall and Ashford.

---

## 8. #14 — Faction XP in the HUD (confirmed)

Yes. The HUD carries **two thin bars**: XP to the next Level (ink) and **Faction XP to the next Rank (the faction's colour)**, the FXP bar directly under the XP bar. Labels: the XP bar *L3*; the FXP bar the **rank title** (*Steward*) where the HUD is 400 px or wider, *Rank 2* below that (titles like *Keeper of the Gate* do not fit a phone). Value text on tap (the help note of §5 carries *{n} more to {nextTitle}*). The Me tab keeps the full row (*Iron Vanguard · Steward · 212 / 2,000 to Bailiff*). Rank 7 shows a full bar and *Keeper of the Gate*, no number.

---

## 9. #15 — The Standing level-up (GDD §13.4)

**A Standing card inside the result modal**, the same block the level-up uses: kicker *LOCAL STANDING*, the new title as a stamp-style heading, two lines (what changed, what the next level brings), and the plate line updates behind it. No second modal: it is a knock-on effect of the action, and the level-up already proves the pattern. The plate's Standing label help (§5) says the whole ladder for anyone who wants it earlier.

| Crossing | Heading | Lines |
|---|---|---|
| 10 | Familiar in {city} | Faces nod. Every check in {city} is now +3 %. · Known at 30 Successes: +6 %, and your name will do for a council candidacy at {rank3Title}. |
| 30 | Known in {city} | +6 % on every check here, and the town knows your name well enough to stand for its council once you are a {rank3Title}. · Trusted at 70: +9 %. |
| 70 | Trusted in {city} | +9 % on every check here. Doors open before you knock. · One of Us at 150: +12 % and 1 Political Capital a day. |
| 150 | One of Us in {city} | +12 % on every check here, the most standing gives, and 1 Political Capital a day from the town. · Nothing above this; it never decays. |

Pinned with it: ***One of Us* pays 1 PC a day** at the boundary, per city where it is held (§13.4 said "a small daily trickle" with no number).

---

## 10. Content changes for the developer to apply (data only)

All in `packages/content/src/data`; no new schema kinds beyond those named.

1. `orders.ts`: the titles and lines of §3; remove the three `*.work-shift` templates and the `noJob` field; add `*.five-in-the-book`, `*.take-a-job` (`use: 'welcome'`, match `kinds: ['takeJob']`), and the welcome slot-A templates of §2 (`use: 'welcome'`). `OrderTemplate.use` gains `'welcome'`.
2. `jobs.ts` and `schemas.ts`: drop `shiftEnergy`, `shiftActionId` and the `job` action type; the cities lose their four `type: 'job'` actions each. Council actions: `stats: ['best']` (a new stat token resolved in rules to max(STR, INT, AGI)).
3. `ordinances.ts`: `ord.shift-hours` → `ord.long-service` with `{ kind: 'seniorityDays', value: 2 }`; `shiftEnergyDelta` and `shiftStreakDays` leave the DSL. Name, line and effect line in §1.2.
4. `headlines.ts`: the six streak headlines → seniority headlines (§1.2), condition `seniorityHitYesterday`. The three welcome decks end *Spend it at {place} first.* with the place from slot A.
5. `ambitions.ts`: the *Legwork* approach on each chapter 1, `stats: ['best']`.
6. `copy.ts`: §4's strings; `jobPayLine` → *{pay} a day · paid at midnight*; `switchJob` → *Switch · seniority resets*; `yourJob` → *Your job · seniority {n} days · +{pct} %*; `shiftWorked`, `shiftNotYourJob`, `shiftNoJob` retired; `orderDone` → the signed lines of §6; `allOrdersDone` → the modal of §6; `standingUp` → the card of §9; the help notes of §5; the stat-choice lines of §7.
7. Tests that assert the old strings (`slice2.content.test.ts`, the QA suites) follow.
