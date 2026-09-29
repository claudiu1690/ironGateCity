# Slice 1 — "The 5-minute session": Coalport content and rules

Game designer, 29 Sep 2026. Companion to `docs/economy.md` (the numbers) and the architect's `docs/tech/slice-1.md`. Everything here is either already in the GDD or was pinned into it in this change (list at the end). The developer turns §2–§8 into `packages/content` data; the schema changes that needs are in §10.

**Playtest question:** is spending a bar of Energy fun, and do players want to come back in 3 hours?

**Design rules this content obeys:** one tap resolves to one modal; a full bar (100 Energy) is spendable in 2–3 minutes (ten taps, or four ×3 runs); tier 1 never fails; nothing needs the player online at a set time; being away costs opportunity, never assets; campaign vocabulary only; 1946, Central European, noir, British English, 2–3 lines of text per outcome.

---

## 1. Coalport at a glance

| | |
|---|---|
| City | `coalport`, home city of the Collective (§14.11). Baseline opinion Vanguard 9 / Collective 70 / Alliance 6 / Neutral 15 |
| Map | `maps-pen/coalport.png` (day) and `coalport-night.png`, both 5056 × 3392. Positions below are x/y fractions of the image |
| Day and night | The night image is shown **20:00–06:00 server time (UTC)**, day otherwise. Purely cosmetic in slice 1: nothing about odds, costs or rewards changes (§2.2 of the GDD, new) |
| Paper | *The Coalport Clarion* (§7) |
| Party secretary | Petra Holm, Coalport branch secretary of the Collective (§6) |
| Tier-1 difficulty | 8 (home city, §8.4). Reference recruit: INT 12 / STR 10 / AGI 5 / CHA 2 |

### 1.1 Locations (6)

Six locations, six different kinds, all from the closed list in §13.5. Positions were checked against the map at full size; each pin sits on its building. The mockup `docs/mockups/City.dc.html` numbers eight places; slice 1 builds six of them and reserves the other two (below).

| # | Id | Name | Kind | Map x, y | Blurb (one line) |
|---|---|---|---|---|---|
| 1 | `coalport.mill-gate` | Mill Gate | `factory-gate` | 0.36, 0.44 | The gates of the Coalport Steel Mill. Three shifts a day, and every one of them walks past here. |
| 2 | `coalport.market-row` | Market Row | `market` | 0.43, 0.50 | Striped awnings between the mill and the quay. Bread, fish, bootlaces, and every opinion in Coalport, out loud. |
| 3 | `coalport.union-hall` | Union Hall | `faction-hq` | 0.66, 0.30 | The Collective's hall: columns out front, smoke and a mimeograph inside. The branch committee sits in the back room. |
| 4 | `coalport.terraces` | Foundry Row | `street` | 0.60, 0.14 | Row on row of brick terraces above the mill. Washing lines, children, and doors that open for the right accent. |
| 5 | `coalport.quays` | Harbour Quays | `docks` | 0.50, 0.63 | Warehouses, cranes and the coal barges. The dockers eat on the quay with their backs to the wind. |
| 6 | `coalport.anchor` | The Anchor | `bar` | 0.15, 0.89 | Dockers' bar at the bottom of the town. The barman hears everything and sells about half of it. |

Where the pins land on the art: 1 on the arched front of the big rolling shed where the road meets the mill; 2 in the middle of the stalls; 3 on the columned civic building by the tram loop; 4 in the middle of the terrace block, on a street; 5 on the quay in front of the crane and the warehouse row; 6 on the row of houses at the bottom left of the quay.

**Reserved, not in slice 1:** the coal yards and sidings (0.10, 0.62) and the shipyard slipway (0.72, 0.52), both used by the mockup. They arrive with tier-2 content (slice 5) and need no new kind (`station` for the sidings, `docks` for the slipway).

**Presence line** (§16.2) is slice 6. Until then the location card shows the blurb only.

---

## 2. Tier-1 actions (21)

### 2.1 Rules that apply to every action here

- **One roll per attempt** (§8.4): Success at or below the shown chance, Partial otherwise. **Tier 1 never fails.**
- **Rewards** at §5.5 rates: 4.5 XP, 0.6 FXP, 2 Iron and 0.005 opinion points per Energy on Success; half on Partial; nearest whole, halves up, per line; a paying line never drops below 1 on Partial. Opinion keeps three decimals.
- **Two-stat checks** use the average of the two (§8.4). CHA is worn CHA (2 for the recruit).
- **×1 / ×3** (§13.1): ×3 spends three times the Energy in one go, rolls three times from one seed, and shows three rows and an *n of 3* stamp. The narrative is the success text when 2 or 3 rows succeeded, the partial text when 0 or 1 did (§12, Q5). The ×3 button is disabled when Energy is short (tooltip "×3 needs 30 Energy"); there is no partial batch. ×5 is deferred to a later slice. **Training and job shifts are ×1 only** (§13, item 2).
- **Rested** (§6.3): per Energy point, +50 % XP and Iron on the covered points. Never FXP or opinion.
- **Local Standing** (§13.4): +3 % per level on every checked action in Coalport. Every Success on a checked action counts one toward the next level (each row of a ×3 counts).
- **Party Directives** (§6): +25 % FXP on a matching attempt, shown as a bonus line in the FXP tile.
- **Opinion is written** from slice 1: the Coalport meter moves by the delta, drawn from Neutral first (§14.2). The knock-on section shows the city's new share to one decimal.
- **Job shifts and training are not checks.** They always succeed, show one row ("no roll"), and have one outcome text. See §3 and §2.4.
- **Intelligence** in slice 1 pays XP and Iron only; the Dossier entry it would yield arrives in slice 8. The success text already reads as note-taking so nothing needs rewriting later.

### 2.2 The list

Rewards are Success / Partial. "Std" = the stat(s) checked. E = Energy. Opinion in points of the Coalport meter.

| Id | Title | Type | Std | E | XP | FXP | Iron | Opinion |
|---|---|---|---|---|---|---|---|---|
| `coalport.mill-gate.canvass` | Canvass the shift change | canvass | INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `coalport.mill-gate.speech` | Speak from the gate steps | speech | CHA+INT | 12 | 54 / 27 | 7 / 4 | 24 / 12 | 0.06 / 0.03 |
| `coalport.mill-gate.shift` | Work your shift at the mill | job (Factory worker) | — | 4 | — | — | see §3 | — |
| `coalport.market-row.canvass` | Canvass the bread queue | canvass | INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `coalport.market-row.speech` | Speak from the market cross | speech | CHA+INT | 12 | 54 / 27 | 7 / 4 | 24 / 12 | 0.06 / 0.03 |
| `coalport.market-row.leaflets` | Hand out leaflets between the stalls | propaganda | AGI | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `coalport.market-row.stall` | Work the stall | job (Street vendor) | — | 3 | — | — | see §3 | — |
| `coalport.union-hall.committee` | Sit in on the branch committee | council | INT | 10 | 45 / 23 | **9 / 5** | 20 / 10 | — |
| `coalport.union-hall.mimeograph` | Run the mimeograph | propaganda | INT | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `coalport.union-hall.reading-room` | Study in the reading room | training (INT) | — | 20 + 2×INT | half rate | — | — | — |
| `coalport.terraces.canvass` | Canvass door to door | canvass | CHA+INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `coalport.terraces.chalk` | Chalk the slogans | propaganda | AGI | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `coalport.terraces.run` | Run messages for the street committee | training (AGI) | — | 20 + 2×AGI | half rate | — | — | — |
| `coalport.quays.noon-break` | Talk to the dockers at the noon break | canvass | STR | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `coalport.quays.posters` | Paste posters on the warehouse walls | propaganda | STR | 8 | 36 / 18 | 5 / 2 | 16 / 8 | 0.04 / 0.02 |
| `coalport.quays.haul` | Shift cargo with the dockers | training (STR) | — | 20 + 2×STR | half rate | — | — | — |
| `coalport.quays.customs` | Watch the customs shed | intelligence | INT | 4 | 18 / 9 | — | 8 / 4 | — |
| `coalport.quays.lorry` | Drive the dock lorry | job (Driver) | — | 4 | — | — | see §3 | — |
| `coalport.anchor.regulars` | Talk the regulars round | canvass | CHA+INT | 10 | 45 / 23 | 6 / 3 | 20 / 10 | 0.05 / 0.025 |
| `coalport.anchor.listen` | Listen at the bar | intelligence | INT | 3 | 14 / 7 | — | 6 / 3 | — |
| `coalport.anchor.songs` | Lead the singing | speech | CHA+STR | 12 | 54 / 27 | 7 / 4 | 24 / 12 | 0.06 / 0.03 |

**Council** (`union-hall.committee`) pays FXP at 1.5× the tier rate (0.9 per Energy) and no opinion: it is party work, not public work (§13.3, pinned). **Training** pays XP at half the tier rate (2.25 per Energy), nothing else, and +1 to the stat (§8.5, pinned).

**Count by type:** canvass 5 · speech 3 · propaganda 4 · training 3 · intelligence 2 · council 1 · job 3 = **21**.

**Count by stat** (15 checked actions): INT 6 · CHA+INT 4 · AGI 2 · STR 2 · CHA+STR 1. Training covers INT, AGI and STR. INT is the recruit's best stat, so it is the most common check, but nine of the fifteen checks reward something else, and AGI training is the cheapest in the game (30 Energy at AGI 5), so the AGI actions climb fastest.

**Odds for the reference recruit** (home, difficulty 8, no Standing): INT 66 % · STR 58 % · CHA+INT 46 % · CHA+STR 42 % · AGI 38 %. Because tier 1 pays half on Partial, the expected reward only ranges from 0.83× (INT) to 0.69× (AGI) of the Success figure; the low-odds actions are still worth tapping and the recruit sees a reason to train and, in slice 2, to buy a coat.

### 2.3 Outcome text

Two to three lines each: **at most 240 characters and four sentences** (GDD §1.2, pillar 7; the longest below is 231). The Mill Gate canvass is the slice-0 text, unchanged.

#### Mill Gate

**Canvass the shift change** (`coalport.mill-gate.canvass`)
- Success — *The whistle goes, and they stop* — You're at the gate before the shift comes off. Coal dust, tired faces, no time for speeches. But the leaflets go hand to hand, and a foreman says come back Thursday. That's how a ward is won.
- Partial — *Most of them walk past* — The shift comes off in a hurry and most of it heads straight for the tram. You press leaflets on the ones who slow down. Two stop to argue; one gives you his street. A start, not a win.

**Speak from the gate steps** (`coalport.mill-gate.speech`)
- Success — *Two hundred faces, and they listen* — You climb the gate steps as the hooters go. Wages, the coal ration, the foreman's book: you keep it short and you keep it theirs. When you come down, a woman from the rolling mill shakes your hand and asks when the next meeting is.
- Partial — *The hooter drowns the end of it* — You get through wages and the ration before the second hooter goes and the crowd breaks for the trams. A knot of lads at the back stays to argue, which is something. Next time, start earlier.

**Work your shift at the mill** (`coalport.mill-gate.shift`, Factory worker)
- Worked — *Eight hours on the rolling floor* — Clock in, clock out, and the pay clerk's stamp in your book. The floor is loud enough to think in. Half your wage came at midnight; here's the other half, with the streak on top.

#### Market Row

**Canvass the bread queue** (`coalport.market-row.canvass`)
- Success — *The queue has time to talk* — Forty people and one baker's window. You work the line with the price list in one hand and the leaflet in the other. By the time the shutters go up, half the queue knows what the Collective would do about the flour ration.
- Partial — *The loaves come out early* — You're three people in when the shutters go up and the queue becomes a scrum. A few leaflets go into shopping bags. One old man folds his carefully and says he'll read it after his tea.

**Speak from the market cross** (`coalport.market-row.speech`)
- Success — *A crowd at the cross* — You get up on the plinth between the fish stall and the tram stop. Prices, rents, who pays and who doesn't. The stallholders heckle, the crowd laughs, and by the end the laughs are on your side.
- Partial — *The tram takes half of them* — You've a decent crowd until the number 4 pulls in and takes most of it. You finish for the stallholders and a policeman who looks bored. The fishmonger gives you a nod. It's a start.

**Hand out leaflets between the stalls** (`coalport.market-row.leaflets`)
- Success — *Quick hands, empty bag* — You work the aisles at a trot, a leaflet into every basket before its owner has noticed. The bag is empty in ten minutes and the market inspector never sees you.
- Partial — *The inspector sees you* — Half the bag is gone when the market inspector plants himself in the aisle and asks about your permit. You leave by the fish stall, slower than you'd like. The leaflets you handed out are still out there.

**Work the stall** (`coalport.market-row.stall`, Street vendor)
- Worked — *A day's trade* — Matches, bootlaces, yesterday's paper. You know the regulars by their shoes now. The takings won't make anyone rich, but they come in every day, and nobody asks you for a permit.

#### Union Hall

**Sit in on the branch committee** (`coalport.union-hall.committee`)
- Success — *Minutes taken, motion carried* — Smoke, coffee, and a mimeograph that never stops. The committee wants the ward lists redone by district and you're the one who says how. Your name goes in the minutes. In this hall, that counts.
- Partial — *A long meeting* — Two hours on the ward lists and the price of paper. You get one point in before the chair moves on. The secretary marks you present, which is what matters this week.

**Run the mimeograph** (`coalport.union-hall.mimeograph`)
- Success — *Five hundred copies, still wet* — The stencil holds and the drum turns. Five hundred bulletins in an hour, stacked for the morning runners. Your hands are purple to the wrist and the hall smells of spirit.
- Partial — *The stencil tears* — The stencil tears at copy two hundred and the rest of the run comes out ghosted. Half a stack goes out; the other half goes in the stove. The secretary shows you how to cut the next one.

**Study in the reading room** (`coalport.union-hall.reading-room`, training INT)
- Trained — *An evening with the pamphlets* — The reading room is cold and the light is bad, but the shelves have everything from the factory acts to the price of coal in 1913. You leave knowing the argument better than the man who'll make it against you.

#### Foundry Row

**Canvass door to door** (`coalport.terraces.canvass`)
- Success — *The kettle goes on* — Sixty doors in the long terrace. Most open a crack; a dozen open wide, and at three of them the kettle goes on. You leave with a list of names and the name of the man who collects the rent.
- Partial — *Doors on the chain* — It's tea-time and the doors stay on the chain. You get the leaflet through the gap and a word with the ones who stand on the step. One woman says her husband's in the Union already. Come back after the shift.

**Chalk the slogans** (`coalport.terraces.chalk`)
- Success — *White letters on the gable end* — The gable end at the top of the terrace is the biggest wall in the district. You get the whole slogan up in fair capitals before the rent-man's boy comes round the corner, and you're away down the entry.
- Partial — *Half a slogan* — You get as far as BREAD AND before a window goes up and someone shouts about their wall. You finish the last word small and leave by the back entry. It reads, just about.

**Run messages for the street committee** (`coalport.terraces.run`, training AGI)
- Trained — *Every entry in the district* — Six notes, five streets, one hour. You learn which entries connect and which end in a wall, and you learn them at a run. By the end you could do it in the dark.

#### Harbour Quays

**Talk to the dockers at the noon break** (`coalport.quays.noon-break`)
- Success — *They make room on the bollard* — The dockers eat on the quay with their backs to the wind. You've the hands for the work and it shows, so they make room on the bollard. By the time the whistle goes, the gang has agreed to send two men to the hall.
- Partial — *Bread and silence* — The gang eats and lets you talk. A couple of nods, one argument about the coal ration that goes nowhere. The ganger takes a leaflet for later. Nobody gets up when the whistle goes, which is the dockers' way of saying maybe.

**Paste posters on the warehouse walls** (`coalport.quays.posters`)
- Success — *A hundred yards of brick* — Bucket, brush, and a long stretch of warehouse wall. You get twelve posters up straight and high enough that nobody's tearing them down without a ladder. Every barge coming up the river will read them.
- Partial — *The paste won't hold* — The wind off the river is against you and the paste won't hold on the wet brick. Five posters stay up; the rest go into the water. Five is five.

**Shift cargo with the dockers** (`coalport.quays.haul`, training STR)
- Trained — *A shift on the hooks* — You take a hook and a place on the gang and don't ask to be paid. Sacks, crates, a crate that needs four. Your shoulders will tell you about it tomorrow; that's the point.

**Watch the customs shed** (`coalport.quays.customs`)
- Success — *Lorries, times, names* — You sit on a bollard with a paper and a pencil and watch the customs shed. Three lorries, two of them with the same firm's name, one that leaves without stopping. It goes in your notebook for later.
- Partial — *Nothing much moves* — An hour on the bollard and one lorry, which stops, gets stamped and goes. Your notebook has a name and a time. Not nothing.

**Drive the dock lorry** (`coalport.quays.lorry`, Driver)
- Worked — *Six runs to the goods yard* — Six runs between the quay and the goods yard, a full load each way and a ganger who wants it faster. The lorry fights you on the cobbles. The pay clerk doesn't.

#### The Anchor

**Talk the regulars round** (`coalport.anchor.regulars`)
- Success — *A table by the stove* — The regulars have a table by the stove and, once you've listened for a while, a place at it. You talk rents and wages and let them talk longer. By closing time two of them have asked where the branch meets.
- Partial — *Talked over* — The table by the stove is louder than you are. You get a word in between the dominoes and a song. One docker wants a leaflet; another wants to argue about 1919. You leave the argument where you found it.

**Listen at the bar** (`coalport.anchor.listen`)
- Success — *The barman hears everything* — You nurse a half and let the bar talk. Who's hiring at the yard, whose rent went up, which foreman is taking a cut. The barman catches your eye and adds a name.
- Partial — *A quiet night* — Dominoes, the wireless, and two men arguing about a horse. You pick up one thing worth writing down. Come back on a Friday.

**Lead the singing** (`coalport.anchor.songs`)
- Success — *The whole bar joins in* — Somebody starts the old mill song and you take it up loud enough to carry. By the second verse the whole bar is in, dockers and all. Nobody remembers who started it, and everybody remembers the words.
- Partial — *Two verses* — You get two verses out before the domino table wins. A few voices come in on the chorus. The barman turns the wireless down, which from him is applause.

### 2.4 Training (pinned in §8.5)

- Cost = **20 + 2 × the stat's current value** (INT 12 → 44 Energy; AGI 5 → 30; STR 10 → 40). The button shows the live cost.
- **Always succeeds**, no roll: +1 to the stat at once. Stamp: *Trained*.
- Pays **XP at half the tier rate** (2.25 per Energy: 99 XP for the recruit's first INT point), no Iron, no FXP, no opinion. Rested applies to the XP.
- **No ×3.** Training is ×1 only: the ticket shows one button with the live cost, and the *Trained* modal offers *Again ×1 · Continue*. (Three points would cost 44 + 46 + 48 = 138 Energy for INT, more than the bar holds; see §13, item 2.)
- Training does not count toward Local Standing or Directive attempt counts, except the *Sharpen up* Directive (§6).
- CHA is never trained (§8.5).

### 2.5 Level-ups (§5.3, built in slice 1)

- Level = highest §5.3 threshold reached; one action can cross several.
- Each level: +5 max HP (derived from the level, not stored; Health is shown from slice 5) and **+1 stat point to STR or INT**, placed with **one tap** in the result modal's knock-on section (*Level 4 · place your point: STR / INT · later*) or from the HUD badge. Pending points never expire.
- The modal stamp stays Success/Partial; the level-up is a knock-on line, not a second modal.

---

## 3. Jobs in Coalport (§9, numbers pinned)

Three jobs are placed in slice 1. Daily pay is pinned to one figure each (the §9.2 ranges stay for the jobs not yet built).

| Job | Location and action | Unlock | Shift Energy | Daily pay | Notes |
|---|---|---|---|---|---|
| **Street vendor** | Market Row, *Work the stall* | Level 1 | 3 | **100** | The fallback job; no requirement |
| **Factory worker** | Mill Gate, *Work your shift at the mill* | Level 1, STR 5 | 4 | **180**, **216 for Collective members** (+20 %) | The job every Coalport recruit should take on day 1 |
| **Driver** | Harbour Quays, *Drive the dock lorry* | Level 3, AGI 10 | 4 | **200** | Visible and locked for the recruit (AGI 5): the first thing training AGI unlocks |

Market trader (Level 3, INT 8) has a mini-game and is deferred with it.

**Blurbs** (one line on the Jobs card, ≤ 160 characters; final text, §13 item 6):

- **Street vendor** — Matches, bootlaces and yesterday's paper from a stall on Market Row. Nobody asks for a permit.
- **Factory worker** — Eight hours on the rolling floor of the Coalport Steel Mill. Collective members draw a fifth more.
- **Driver** — The dock lorry between the quay and the goods yard, a full load each way. Needs a quick hand on the cobbles.

### 3.1 Rules (pinned in §9.1)

- **Taking a job:** at the job's location, a *Jobs* card lists the jobs there with pay and requirements. *Take the job* is free and one tap. **Switching** to another job costs 2 Energy, takes effect at once, and **resets the streak to 0**. Requirements are checked on taking, never again.
- **Half pay at the day boundary:** at every 00:00 UTC the job held at that moment pays **50 % of daily pay**, whether or not the player logs in. A player away for a week gets seven half-pays, banked. A return credits **at most 14 half-pays** (§12, Q9); the job is kept. (Implementation may be lazy at next read or an Agenda job; the rule is per boundary crossed.)
- **The shift:** once per City Day, at the job's location, for the listed Energy. It pays the **other 50 % plus the streak bonus**. Not a check: no roll, always paid, one outcome text. One shift per City Day regardless of job changes; a shift already worked today is not repeated for a new job.
- **Streak:** consecutive City Days with a shift worked, counting today. **Bonus = 2 % × min(streak, 10) of daily pay**, paid with the shift (first shift +2 %, tenth and after +20 %; Factory worker at +20 % = +43 Iron).
- **Sick days:** 2, refilled to 2 at the Monday 00:00 UTC boundary. A City Day without a shift **while a streak is running** spends one automatically and the streak survives (it neither grows nor breaks); at streak 0 nothing is spent (§12, Q1). A missed day with **no sick day left ends the streak** (back to 0); the job is never lost. In practice the streak only ends on the third missed day in a week, which is what §4.3 rule 2 now says ("a single missed day never breaks a streak"; §13, item 3).
- Shifts pay **no XP and no FXP** (§13.3). Rested is neither applied nor spent by a shift or a job switch (§12, Q2).
- **Remote Work** (Premium) is not in slice 1.

### 3.2 What the modal shows for a shift

Stamp *Shift worked* · one row, "no roll" · Iron tile with base (half pay) and bonus (streak) · knock-on: *Streak 4 days · 2 sick days left · next shift tomorrow after 00:00 UTC*.

---

## 4. Local Standing (§13.4, thresholds pinned)

| Level | Name | Successes in the city | Bonus on checks there |
|---|---|---|---|
| 0 | Stranger | 0–9 | — |
| 1 | Familiar | 10 | +3 % |
| 2 | Known | 30 | +6 % |
| 3 | Trusted | 70 | +9 % |
| 4 | One of Us | 150 | +12 % |

- One Success on any **checked** tier-1 (later tier-2) action in the city = one point. Partial, shifts and training do not count. Each row of a ×3 counts on its own.
- Never decays; per city; the recruit reaches *Known* about day 3 (economy sheet §6), in time for council candidacy at Rank 3 (~day 10).
- Shown on the city plate (*Coalport · Familiar · 14 / 30 to Known*) and in the modal's knock-on section. The bonus appears in the check breakdown as `{ id: 'standing', label: 'Known in Coalport', value: 6 }` (already plumbed in slice 0).
- *Known* unlocks and the *One of Us* PC trickle are later slices.

---

## 5. The "Today" tally and the day boundary

**Decision for slice 1: a City Day starts at 00:00 UTC** (GDD §2 and Appendix C #1, now closed for the MVP). Everything daily in slice 1 keys off it: the Today tally, half pay, "one shift per day", sick-day accounting, Directive refresh, the Morning Paper's "new day" trigger and the map's night window. Slice 3's calendar (council days, weeks) builds on the same boundary; nothing here needs a scheduled job, since every rule is stated per boundary crossed and can be settled lazily on the next read. Architect: a per-character `today { day: 'YYYY-MM-DD', … }` block reset when the key differs is enough.

**The tally counts, since 00:00 UTC:** Energy spent · attempts · Successes · XP · FXP · Iron earned (actions and pay) · opinion moved (sum of deltas, three decimals) · Directives done (n / 3) · shift worked (yes/no) · stat points trained.

**Where it shows:** a one-line strip on the city screen (*Today: 60 Energy · 5 wins · +240 XP · +32 FXP · +0.21 opinion*), and as *Yesterday* in the Morning Paper's desk. It resets at the boundary; nothing is lost, it just becomes yesterday.

---

## 6. Party Directives v1 (§13.7 / §15.4, pinned)

### 6.1 The NPC party secretary

**Petra Holm**, branch secretary of the Collective in Coalport. Portrait `mvp/portraits/holm.png` (the woman in overalls with the red scarf; the mockups already caption her "P. Holm"). Voice: brisk and warm, wastes no words, talks in shifts, wards and door counts, never in slogans. She signs orders "— P.H." Until a player is Faction Chair (slice 7), she sets the Collective's Directives every day. In later slices the other factions get their own secretary.

### 6.2 How a day's three orders are chosen

Directives are **faction-wide**: every Collective member in Coalport gets the same three on the same day, so the paper's "Party orders" reads as a plan, not a personal quest list. Chosen deterministically from the City Day, no job needed:

- Slot A (canvass, the reference verb): `A[day mod 5]`
- Slot B (party work): `B[day mod 4]`
- Slot C (habit): `C[day mod 3]`

where `day` is the number of City Days since a fixed epoch (2026-01-01), so the same set can never repeat two days running and the full cycle is 60 days. The three targets together fit inside about 60 Energy, so a casual player can clear them in one session.

### 6.3 Templates (12)

| Id | Slot | Order (title) | Matches | Personal target | Holm's line |
|---|---|---|---|---|---|
| `dir.canvass-coalport` | A | Canvass Coalport | any `canvass` in Coalport | 3 attempts | Three wards, three conversations. Go and have them. |
| `dir.shift-change` | A | Be at the gate | `coalport.mill-gate.canvass` | 2 attempts | The afternoon shift comes off at four. Be at the gate before it. |
| `dir.foundry-row` | A | Knock Foundry Row | `coalport.terraces.canvass` | 2 attempts | Sixty doors in Foundry Row. Start at the top and work down. |
| `dir.noon-break` | A | The quays at noon | `coalport.quays.noon-break` | 2 attempts | The dockers eat at noon. So do you, on the quay. |
| `dir.anchor` | A | The Anchor after the shift | `coalport.anchor.regulars` | 2 attempts | Sit with the regulars, not at the bar. Listen first. |
| `dir.paper-the-town` | B | Paper the town | any `propaganda` in Coalport | 3 attempts | The bulletin's printed. It's no use to anyone in the hall. |
| `dir.say-it` | B | Get up and say it | any `speech` in Coalport | 1 attempt | Somebody has to stand on the plinth today. It's you. |
| `dir.report` | B | Report to the hall | `coalport.union-hall.committee` | 1 attempt | Committee at six. Bring the ward lists. |
| `dir.ears-open` | B | Keep your ears open | any `intelligence` in Coalport | 2 attempts | Sit, watch, write it down. Names and times. |
| `dir.work-shift` | C | Work your shift | any job shift (if no job: *Take a job*, target = hold a job by day's end) | 1 | The party doesn't pay wages. The mill does. |
| `dir.sharpen-up` | C | Sharpen up | any `training` | 1 point | A tired organiser is a bad one. An hour in the reading room, or on the hooks. |
| `dir.full-day` | C | A full day | any checked action in Coalport | 6 Successes | Six wins before the paper goes to bed. |

### 6.4 Rewards and timing (pinned in §15.4)

- **+25 % FXP** on every matching attempt **while the order is open** (base FXP × 0.25, rounded per line; a 6-FXP canvass shows *+2 party order*). Applies on Partial too. Never touches XP, Iron or opinion. Nothing after the completing row (§12, Q3).
- **+20 FXP** the moment a Directive's personal target is reached (a bonus line in that action's modal: *Party order complete: +20 FXP*).
- **+5 Political Capital** when all three are complete. PC is **stored and shown from slice 1** (the HUD mockup already has it) and has no sink until slice 3; it is capped at 1,000 and never decays (§6.5).
- Progress counts **attempts** (Success or Partial) for count-type orders, Successes for *A full day*, and each row of a ×3.
- **Refresh at 00:00 UTC.** Unfinished orders are simply gone; nothing is taken away. There is no catch-up.
- Shown in the Morning Paper ("Party orders"), on the city screen as a compact 3-line list with progress, and as a tag on matching action tickets (*Party order 1 / 3 · +25 % FXP*).

---

## 7. Morning Paper v1 (§3.3)

### 7.1 Masthead

**The Coalport Clarion** · "Morning edition · Price 5 marks" · strapline *The voice of the mill and the quays* · dateline *{Weekday} · {D Month} · Coalport* from the real UTC date, no year (*Tuesday · 29 September · Coalport*; §12, Q6). Each home city gets its own paper; the national *Irongate Herald* of the mockup is what battleground residents read from slice 4. (Provisional names for later: *Ashford Gazette*, *Duskwall Sentinel*, *Clearwater Courier*.)

### 7.2 When it appears

First screen when the City Day has changed since the player last saw it, or after **3 hours or more** since their last action (§3.3). One tap dismisses; the Paper tab reopens it any time. Weather, Issues, Polling Day, Letters and In Print are later slices; v1 has three sections in this order: **headlines (2–3) · Party orders · Your desk**.

### 7.3 Your desk (slice 1 rows)

| Row | Value |
|---|---|
| Salary, {job} (half pay) | +{n} Iron (sum since the last paper; "no job yet" if none) |
| Rested, banked since last visit | +{n} · {pool} / 200 |
| Energy | {n} / 100 · full at {hh:mm} |
| Work streak · sick days | {n} days · {n} left |
| Level {L} | {xp to next} XP to Level {L+1} · {pending} point(s) to place |
| Coalport standing | {name} · {n} to {next} |
| Yesterday | the Today tally for the previous City Day |

### 7.4 Headline templates (15)

Up to three per day: **at most two personal** (highest priority first), then **one city or ambient**. Each has a headline and a one-to-two-line deck. `{name}` is the character's name; `{rank}` is the character's **current** faction rank title (Collective: Recruit / Activist / Organiser / Commissar / Delegate / Comrade-General / Chairman, §5.4), never a hard-coded word. Where a template has variants, exactly one of them can match on a given morning.

| Id | Priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.first-day` | 1 | First paper ever | Welcome to Coalport | Your branch secretary has three orders for you below. Spend your Energy; it refills, five points every ten minutes. |
| `hl.rank-up-2` | 2 | Rank rose since last paper, to Rank 2 | {name} Made Activist by the Branch | Recruits become Activists on the strength of their party work. The vote follows. |
| `hl.rank-up-3` | 2 | Rank rose since last paper, to Rank 3 | {name} Made Organiser by the Branch | An Organiser can stand for the council. Secretary Holm: "Now the real work starts." |
| `hl.rank-up` | 2 | Rank rose since last paper, to Rank 4 or higher | {name} Made {rank} by the Branch | Made {rank} on the strength of party work. The branch takes note. |
| `hl.level-up` | 3 | Level rose since last paper, and Energy was spent yesterday (≥ 1) | Coalport {rank} Rises to Level {level} | {name} of the Collective spent {energyYesterday} Energy on the ward yesterday. The branch has noticed. |
| `hl.level-up-quiet` | 3 | Level rose since last paper, and no Energy was spent yesterday | Coalport {rank} Rises to Level {level} | {name} of the Collective has been putting the hours in on the ward. The branch has noticed. |
| `hl.standing` | 4 | Standing level rose | A {Familiar / Known / Trusted} Face in Coalport | Coalport knows {name} now: {standing}. Actions here get +{bonus} %. |
| `hl.orders-done` | 5 | All three Directives done yesterday | Branch Praises Its Canvassers | Every order carried out yesterday. Secretary Holm: "That's how it's done." +5 Political Capital banked. |
| `hl.streak` | 6 | Streak reached 5 or 10 yesterday | {Five / Ten} Straight Shifts and Counting | {name} has not missed a shift in {n} days. Pay is up {bonus} %. |
| `hl.away` | 7 | 2 or more City Days since last paper, and at least one half-pay credited since then | While You Were Away | {days} days of half pay banked ({iron} Iron). Rested is full. The ward is where you left it. *({days} is the number credited, at most 14; §12, Q9)* |
| `hl.away-no-job` | 7 | 2 or more City Days since last paper, and no half-pay credited (no job) | While You Were Away | No job, so no half pay banked. Rested is full and the ward is where you left it. The mill is still hiring: the Jobs card is at Mill Gate. |
| `hl.idle` | 8 | Seen yesterday, no actions yesterday | Quiet Day in the Ward | No leaflets went out yesterday. Today's orders are below. |
| `hl.morale` | city | Always | Collective Holds Coalport at {share} % | Fired up (≥ 80): *The mill is singing.* · Steady (60–79): *"Steady," says the branch. Steady isn't enough.* · Unrest (< 60): *Unrest in Coalport: dockers question the party.* |
| `hl.orders-call` | city | Always (used when no personal headline qualifies) | Secretary Holm Calls for {slot-A title} | {Holm's line for slot A} |
| `hl.ambient` | filler | Fewer than 3 headlines | one of the pool below, by day seed | — |

**Ambient pool** (headline only, one per day, `day mod 10`): Bread Up Two Marks a Loaf · Night Shift Back to Full Time at the Mill · Freighter *Clearwater Star* Three Days Late · Tram Fares to Stay at Two Marks, Says Council · Dockers' Benevolent Fund Dance Saturday · Fog on the River: Barges Held at the Lock · Rent-Man Seen Off in Foundry Row · Coal Ration Unchanged for October · Rolling-Mill Hooter Silent for Repairs · Market Inspector Fines Three Stallholders.

The `hl.first-day` headline is a placeholder for slice 2's welcome edition, which replaces it.

---

## 8. Day and night (pinned as GDD §2.2)

The map shows its night art **20:00–06:00 server time (UTC)**, the same for everyone, because the City Day, the modal's timestamp and the later night rules (Curfew ordinance, the night train) all use the server clock and the map should agree with them. In slice 1 it changes nothing else: no odds, costs, rewards or availability. If the playtest says the switch feels wrong for the audience's time zone, the one-line alternative is the player's local clock; the rule would move with the day boundary (Appendix C #1).

---

## 9. What the modal adds in slice 1 (§13.1a)

On top of slice 0: the ×3 stamp and rows · bonus tags for *Rested*, *Party order* and *Known in Coalport* · knock-on lines for **Standing progress**, **Directive progress and completion**, **level-up with the one-tap stat point**, **the city's new share** (one decimal; the delta tile shows up to three decimals, trimmed: +0.05, +0.025, which answers the slice-0 developer's question) · shift and training variants (one row, "no roll"; stamps *Shift worked* / *Trained*). Buttons: **Again ×1 · Again ×3 · Continue**.

---

## 10. Notes for the architect and developer

**Content schema changes needed** (`packages/content/src/schemas.ts`):
- `ActionType` adds `'council'`.
- `Action.stat` becomes one or two stats (`stats: [StatKey] | [StatKey, StatKey]`); two-stat checks average them (§8.4).
- Training actions: `type: 'training'`, `trains: StatKey`, no fixed `energy` (cost = 20 + 2 × stat at runtime), one outcome text (`text.success` only), `givesFxp: false`, `givesOpinion: false`.
- Job shift actions: `type: 'job'`, `jobId`, no roll, one outcome text; `energy` from the job.
- `Location.map: { x: number, y: number }` (fractions of the map image).
- New data: `jobs[]` (id, name, locationId, shiftActionId, unlock `{ level, stats? }`, dailyPay, shiftEnergy, factionBonus), `npcs[]` (Petra Holm: id, name, role, portrait key, faction), `directiveTemplates[]` (§6.3), `headlineTemplates[]` (§7.4), city `paper { name, strapline }`, city map assets (day, night, size).
- `FxpMultiplier` per action type (council 1.5) and the training XP rate (0.5) live in `packages/rules` constants, not content.

**Character document additions** (plan §5, row 1): `fxp`, `rank`, `politicalCapital`, `pendingStatPoints`, `maxHp`, `job { id, streak, sickDays, lastShiftDay, lastPaidDay }`, `localStanding { [cityId]: successes }`, `directives { day, progress: { [templateId]: n }, completed: [...] , allDoneDay? }`, `today { day, … }`, `paper { lastSeenDay, lastSeenAt, lastLevel, lastRank, lastStanding }`.

**Not in slice 1, on purpose:** opinion drift (§14.2's 2 % a day at home; see economy sheet §8 for why the meter will pin near 95 during a long playtest and why that is acceptable), presence, weather, Issues, bar buffs (*Buy a round*, meals), lodging, ×5, Remote Work, the Market trader job.

---

## 11. GDD edits made in this change

| Section | Edit |
|---|---|
| §0 | "Added 29 Sep 2026 (slice-1 design)" change table |
| §2 | Day boundary confirmed 00:00 UTC for the MVP; new **§2.2 Day and night** (20:00–06:00 UTC, cosmetic) |
| §3.3 | Morning Paper: per-city mastheads (*The Coalport Clarion*), the v1 scope and the "Yesterday" desk row |
| §3.7 (new) | The "Today" tally: what it counts, when it resets |
| §5.2 | Reference player restated: 3 sessions, ~300 Energy, nearly all of it Rested-boosted (≈ 400 Energy-equivalents); economy sheet linked |
| §5.4 | **Rank 2 lowered from 500 to 400 FXP** so the reference player votes on day 2 |
| §6.5 | PC is stored and shown from slice 1; the Directive completion bonus is +5 PC and +20 FXP per order |
| §8.5 | Training: always succeeds, half-rate XP only, ×3 at rising costs, does not count for Standing |
| §9.1 | Streak formula, sick-day refill, switching resets the streak, half pay per boundary, shifts are not checks and pay no XP |
| §9.2 | Pinned daily pay: Street vendor 100 · Factory worker 180 (216 Collective) · Driver 200; Market trader deferred |
| §13.1 | ×3 rules (one seed, three rows, disabled when short, no partial batch); ×5 deferred |
| §13.3 | Council FXP ×1.5 and no opinion; intelligence pays XP and Iron in slice 1; two-stat tier-1 checks |
| §13.4 | Standing thresholds pinned at 10 / 30 / 70 / 150; what counts |
| §13.5 | Coalport's six locations listed against their kinds; the list is now final |
| §13.7 | Directives v1: the NPC secretary, faction-wide daily set, templates, progress rules |
| §15.4 | Directive rewards pinned (+25 % FXP, +20 FXP per order, +5 PC for all three); refresh 00:00 UTC |
| §14.2 | Opinion is written from slice 1; drift from slice 4 |
| Appendix C | #1 closed for the MVP (UTC); new #14 Rested pacing for heavy players, #15 level-up points vs the §8.5 training targets, #16 opinion drift before slice 4 |

---

## 12. Answers to the slice-1 tech design (§19)

Game designer, 29 Sep 2026, to `docs/tech/slice-1.md` §19. Each answer is "default stands" or the change. Every rule pinned here is in the GDD (the source of truth); this section records the decision and the reason. The developer builds from the GDD sections in the last column.

| # | Question | Answer | GDD |
|---|---|---|---|
| 1 | Sick days with no streak running | **Default stands.** A sick day is spent only when an ended City Day had no shift **and streak > 0**. At streak 0 (no job, job just taken, just switched, streak already broken) nothing is spent. Refill to 2 at every Monday boundary, unconditionally; the ended Sunday is judged before the refill | §9.1 |
| 2 | Rested and shifts | **Default stands.** Rested is consumed only by rows it can boost (checked actions, training). Shifts and job switches spend Energy without touching Rested | §6.3, §9.1 |
| 3 | +25 % FXP after an order is done | **Default stands.** Only rows that advance an **open** order get it, the completing row included. Nothing after, including later rows of the same ×3. Ticket tag: *Party order 2 / 3 · +25 % FXP* → *Order done* | §15.4 |
| 4 | *Take a job* completes at once | **Default stands.** Completes the moment the job is taken, +20 FXP then, shown as one line on the Jobs card (no modal: taking a job is not an action). A later switch never undoes it | §13.7, §15.4 |
| 5 | Mixed ×3 narrative | **Change: majority rule.** Success text when more than half the rows succeeded (×3: 2 or 3; ×1: 1; later ×5: 3+), otherwise the partial text. The batch stamp always reads *n of 3*, *3 of 3* and *0 of 3* included. No third text | §13.1 |
| 6 | Dateline | **Default stands, made exact.** `{Weekday} · {D Month} · Coalport` from the real UTC date, British form, no year: *Tuesday · 29 September · Coalport*. No year is printed anywhere in the paper | §3.3 |
| 7 | Short UI copy | See §12.1 below | — |
| 8 | Collective Rank 5 title | **Change: Delegate.** Recruit / Activist / Organiser / Commissar / **Delegate** / Comrade-General / Chairman. No faction renamed; Appendix C #10 stays parked | §5.4 |
| 9 | Salary in long absences | **Change: cap at 14 half-pays per return.** A settlement credits min(boundaries crossed, 14); the job is kept and pay resumes at the next boundary. Away 30 days as Factory worker: 1,512 Iron, not 3,240 | §4.2, §9.1, App. C #17 |

**Why, in one line each.**

1. Without the streak condition, taking a job on Monday and first working on Wednesday would burn both sick days for nothing. Worked example: job taken Monday, no shift Mon–Tue (streak 0, nothing spent); shift Wed (streak 1); miss Thu (sick day, 1 left, streak 1); shift Fri (streak 2); miss Sat (last sick day); miss Sun (streak → 0); Monday boundary refills to 2. Three missed days in a week end a streak, as §4.3 rule 2 promises.
2. §6.3 said "each Energy point spent while Rested > 0 uses 1 Rested"; a 4-Energy shift would have burned 4 Rested for no bonus. The GDD now says Rested is spent only on actions it boosts. The shift modal never shows a Rested tag.
3. The economy sheet's ~30 % Directive share of daily FXP assumes ~60 matching Energy. Open-ended matching would give a heavy player +25 % on 300+ Energy and push Directives past the "about 25 % from outside missions" ceiling in §5.5. A finished order should also read as finished.
4. The target is "hold a job by day's end"; the moment the player holds one it is met. Waiting for the boundary would give a bonus nobody sees. The variant is frozen at settlement: a player who already holds a job gets *Work your shift*; switching during the day changes nothing.
5. "1 of 3" under *Two hundred faces, and they listen* reads wrong; majority costs one comparison (`successes × 2 > times`) and stays right for ×5. A third text per action would be 15 more texts carrying no information the rows don't already carry.
6. The calendar is real (§2: one City Day = one real day; the Monday refill keys off the real weekday), so the weekday must be the true one. 29 September 1946 was a Sunday: printing a 1946 year would contradict the weekday, and printing 2026 would break the fiction. So: no year, ever.
7. Below.
8. "Delegate" is what a workers' party sends to its Congress (the Collective's primary is already *the Congress*, §15.5) and to the Legislature, which is exactly what Rank 5 unlocks. *Tribune* was considered (too Roman) and *Cadre* (a role, not a title).
9. Half pay not yet paid is income, not an asset, so a cap costs opportunity only and §4.3 rule 1 holds; §4.2 already treats a week away as a lost streak. Fourteen covers every §4.2 row up to "1 week" in full, plus a fortnight's holiday. Beyond that the return belongs to the Welcome Back package (1 month+), which should grant a deliberate bonus, not an accidental one. Uncapped, 90 days away would pay 9,720 Iron (about 10 reference days of income) for doing nothing, against §6.3's principle that "the frequent player simply does more". The `hl.away` deck prints the credited count.

### 12.1 Short UI copy (Q7)

British English, no exclamation marks, times in the **player's local clock** (the client converts from `serverNow`; "UTC" never appears on a button). `{hh:mm}` is 24-hour.

| Where | State | Copy |
|---|---|---|
| Action ticket, ×1 button | Not enough Energy for the cost | **Needs 10 Energy · ready at 14:20** ({hh:mm} = when Energy reaches the cost; the same string at 0 Energy) |
| HUD Energy | Below 100 | **37 / 100 · full at 17:40** (already the desk's row; at 100: **100 / 100 · Rested 60**) |
| Action ticket, ×3 button (tooltip / hint) | Energy short of three times the cost | **×3 needs 30 Energy** (training tickets have no ×3 button; §13, item 2) |
| Result modal, *Again ×3* | Same | Same tooltip; *Again ×1* shows **Needs 10 Energy · ready at 14:20** when short |
| Shift ticket | Shift worked today | **Shift worked · next at 01:00** ({hh:mm} = the next 00:00 UTC, local) |
| Shift ticket | Player holds a different job | **Not your job · see the Jobs card** (disabled) |
| Shift ticket | Player holds no job | **No job yet · take one below** (disabled) |
| Me tab, job card | Player holds no job | **No job yet · take one at Mill Gate, Market Row or Harbour Quays** (the places with a Jobs card in the home city, in pin order; §13, item 7) |
| App shell banner | The paper is due | **The Clarion is in** (the city paper's short name; §13, item 7) |
| Sign-up page | Heading | **Join the campaign** (button **Sign up**, link **Sign in**; §13, item 4) |
| Sign-in page | Heading | **Sign in** (button **Sign in**, link **Sign up**) |
| Jobs card, a job the player can take, no job held | Enabled | Button **Take the job** · subline **216 a day · half at midnight, half for the shift** |
| Jobs card, a job the player can take, another job held | Enabled | Button **Switch · 2 Energy · streak resets** (no confirm dialog; the button carries the warning) |
| Jobs card, the job the player holds | — | **Your job · streak 4 days · 2 sick days left** (no button) |
| Jobs card, locked job | Disabled | Button **Needs Level 3, AGI 10** (only the unmet requirements, in that order: **Needs AGI 10**, **Needs Level 3**, **Needs STR 5**) |
| Jobs card, just taken | One line under the job, until the next screen | **Taken · first half pay at 01:00**; if the *Take a job* order was open: **Taken · party order complete: +20 FXP** |
| Jobs card, just switched | Same | **Switched · streak reset · first half pay at 01:00** |
| Party order tag on a ticket | Order open / done | **Party order 1 / 3 · +25 % FXP** / **Order done** |
| City screen, orders list, all three done | — | **All orders carried out · +5 PC** |
| HUD badge (Me tab) | Stat points pending | **1 point to place** / **2 points to place** |
| Me tab, stats card | Stat points pending | **Level 4 · 1 stat point to place** · buttons **STR 10 → 11** · **INT 12 → 13** |
| Result modal, knock-on line | Level gained | **Level 4 · place your point: STR · INT · Later** (as §2.5); two levels at once: **Levels 4–5 · 2 points to place** with the same buttons, one point per tap |
| Result modal, knock-on line | Standing level gained | **Coalport: Familiar · actions here +3 %** |
| Result modal, bonus line | Order completed by this row | **Party order complete: +20 FXP** (as §6.4) |

### 12.2 GDD edits made in this change

| Section | Edit |
|---|---|
| §0 | "Added 29 Sep 2026 (answers to the slice-1 tech design)" change table |
| §3.3 | Dateline format, real UTC date, no year printed |
| §4.2 | New row: 2 weeks or more, half pay stops after 14 boundaries |
| §5.4 | Collective Rank 5 title *Vanguard* → **Delegate**, with the note |
| §6.3 | Rested is spent only on actions it boosts; shifts and switches don't touch it |
| §9.1 | Switch doesn't spend Rested · salary cap of 14 half-pays per return · shift neither applies nor spends Rested, next-shift time shown locally · sick days spent only while streak > 0, Sunday judged before the Monday refill |
| §13.1 | Batch stamp always *n of 3*; narrative by majority; no third text |
| §13.7 | *Take a job* variant frozen at the boundary, completes on taking, never undone |
| §15.4 | +25 % only while the order is open; ticket tag copy; the 30 % share rationale |
| Appendix C | New #17: the 14-half-pay cap, to revisit with the Welcome Back package |

Companion edits: `docs/economy.md` §11 (the windfall arithmetic); this document's §2.1, §3.1, §6.4, §7.1 and `hl.away` now point here.

---

## 13. QA fix round 1 — design answers

Game designer, 29 Sep 2026, to `docs/qa/slices-0-1.md` (m1, m4, n1–n5, n9, n10 and the §4 disagreements table). Every string below is final and already written into the section it belongs to (§2.4, §3, §7.4, §12.1); this section is the record of the decision. Placeholders in `{braces}` are filled by the server. British English, no exclamation marks.

| # | Item | Decision |
|---|---|---|
| 1 | m1: `hl.away` with no job | Two variants on one headline, chosen by whether any half-pay was credited. No headline is never right: the paper should always acknowledge an absence |
| 2 | m4: ×3 training | **Removed.** Training is ×1 only; cost per point unchanged. GDD §8.5, §13.1 |
| 3 | §4.3 rule 2 vs §9.1 | §9.1 and the code are right. §4.3 reworded |
| 4 | "Join the struggle" | **Join the campaign.** Sign-in heading stays **Sign in**. Both strings move to `copy.ts` |
| 5 | Headline nits n1, n2 | Real rank title in both headlines; per-rank decks for Ranks 2 and 3 with a fallback; a "quiet" level-up deck when no Energy was spent yesterday |
| 6 | Job blurbs | Accepted with one added sentence each; final text in §3 |
| 7 | n3, n4, n5, n9, n10, the `hl.streak` headline, "+5 max HP (stored)" | Answered below |

### 13.1 m1 — While You Were Away, with and without a job

The condition is **"at least one half-pay was credited since the last paper"**, not "holds a job": it is the credited count that the deck prints, and it stays correct if a later rule ever pays nothing for a held job. Both fire only after 2 or more City Days since the last paper; exactly one can match.

| Id | Condition | Headline | Deck |
|---|---|---|---|
| `hl.away` | 2+ City Days since last paper **and** half-pays credited ≥ 1 | While You Were Away | {days} days of half pay banked ({iron} Iron). Rested is full. The ward is where you left it. |
| `hl.away-no-job` | 2+ City Days since last paper **and** half-pays credited = 0 | While You Were Away | No job, so no half pay banked. Rested is full and the ward is where you left it. The mill is still hiring: the Jobs card is at Mill Gate. |

`{days}` is always ≥ 2 when `hl.away` fires (two boundaries with a job held), so the plural needs no guard. "The mill is still hiring" points at the Factory worker, the job every Coalport recruit should take (§3).

### 13.2 m4 — training is ×1 only

- **Rule (GDD §8.5, §13.1):** training and job shifts have no batch. The training ticket shows one button with the live cost (*44 Energy*); the *Trained* modal's buttons are **Again ×1 · Continue**. The `×3 needs 138 Energy` hint is gone with the button.
- **Why not a cheaper or smaller batch:** max Energy is 100 for good (Premium 120, §6.2), so any three-point batch is unreachable for INT and STR from the first point (126 and 138 Energy) and for AGI past 5 (96 at AGI 5, 102 at 6). A "partial batch" would contradict §13.1's "no partial batch" for every other ticket. Cutting the cost per point to fit three in a bar would triple the training rate and overshoot the §8.5 targets that Appendix C #15 already flags as generous. One point per tap, about one point a day for the reference player (`docs/economy.md` §4), is the cadence the economy sheet was built on; nothing there changes.
- **Same-day test reads:** the level-up point (§2.5) is still the fast way to grow a stat; training is the deliberate one.

### 13.3 §4.3 rule 2 — reworded

GDD §4.3 rule 2 now reads: *"A single missed day never breaks a streak. Two sick days a week cover the first two misses (§9.1); only a third miss in the same week ends the streak, and the job is never lost."* §9.1 is unchanged; §3.1 above now quotes the new wording.

### 13.4 n5 — the sign-up heading

"Struggle" is the Collective's own idiom ("the struggle") and it is conflict framing; the sign-up page is faction-neutral and the game's frame is a campaign. Final copy, to live in `packages/content/src/data/copy.ts` (`signupTitle`, `loginTitle`), not in the client:

| Page | Heading | Button | Link |
|---|---|---|---|
| Sign-up | **Join the campaign** | Sign up | Sign in |
| Sign-in | **Sign in** | Sign in | Sign up |

### 13.5 n1, n2 — level-up and rank-up headlines

`{rank}` is the character's current Collective rank title from §5.4 (Recruit / Activist / Organiser / Commissar / Delegate / Comrade-General / Chairman), passed by the server; no headline hard-codes a title. `{energyYesterday}` is the previous City Day's Energy from the Today tally (§5).

| Id | Priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.rank-up-2` | 2 | Rank rose since last paper, new rank = 2 | {name} Made Activist by the Branch | Recruits become Activists on the strength of their party work. The vote follows. |
| `hl.rank-up-3` | 2 | Rank rose since last paper, new rank = 3 | {name} Made Organiser by the Branch | An Organiser can stand for the council. Secretary Holm: "Now the real work starts." |
| `hl.rank-up` | 2 | Rank rose since last paper, new rank ≥ 4 | {name} Made {rank} by the Branch | Made {rank} on the strength of party work. The branch takes note. |
| `hl.level-up` | 3 | Level rose since last paper, Energy spent yesterday ≥ 1 | Coalport {rank} Rises to Level {level} | {name} of the Collective spent {energyYesterday} Energy on the ward yesterday. The branch has noticed. |
| `hl.level-up-quiet` | 3 | Level rose since last paper, Energy spent yesterday = 0 | Coalport {rank} Rises to Level {level} | {name} of the Collective has been putting the hours in on the ward. The branch has noticed. |

Only one rank-up and one level-up variant can match on a morning, so the two-personal-headline cap is unaffected. The quiet variant also covers the same-day paper (3 hours after the last action) on a player's first day, when there is no yesterday.

### 13.6 Job blurbs (final)

The developer's three lines were right in substance; each gets one short second sentence that tells the player why they might want the job. ≤ 160 characters each (schema).

| Job | Blurb |
|---|---|
| Street vendor | Matches, bootlaces and yesterday's paper from a stall on Market Row. Nobody asks for a permit. |
| Factory worker | Eight hours on the rolling floor of the Coalport Steel Mill. Collective members draw a fifth more. |
| Driver | The dock lorry between the quay and the goods yard, a full load each way. Needs a quick hand on the cobbles. |

### 13.7 Other nits

| Nit | Decision |
|---|---|
| **n3** banner copy | **The Clarion is in.** The city paper gets a `shortName` in content (`Clarion`; provisional `Gazette`, `Sentinel`, `Courier`, `Herald` for the others) and the banner is `The {shortName} is in`. Tech design §10.1 was right; content is data |
| **n4** Me tab job card | New copy key, not the shift ticket's string: **No job yet · take one at Mill Gate, Market Row or Harbour Quays**. The list is every location in the home city with a Jobs card, in pin order, joined with commas and a final "or", so it needs no code when a job moves |
| **n9** text length | Rule pinned in GDD §1.2: an outcome text is ≤ 240 characters and ≤ 4 sentences. All 36 slice-1 texts already comply (123–231 characters). No rewrite before the playtest; checklist question 3 ("do they scroll the modal or hit Continue without reading") decides whether to trim later |
| **n10** 8–10 px caps labels | No content change; a UI readability watch item for the playtest (checklist question 6). If testers say "too small", the developer raises the floor to 10 px |
| `hl.streak` headline (found in review) | "…at the Mill" was wrong for the Street vendor and the Driver. Headline now **Five Straight Shifts and Counting** / **Ten Straight Shifts and Counting**; the deck is unchanged and job-neutral |
| QA §4 "+5 max HP (stored)" | Tech design is right: derived from the level, not stored. §2.5 corrected |

### 13.8 GDD edits made in this change

| Section | Edit |
|---|---|
| §0 | "Added 29 Sep 2026 (QA fix round 1)" change table |
| §1.2 pillar 7 | "Short text" pinned: ≤ 240 characters and ≤ 4 sentences, about 45 words |
| §4.3 | Rule 2 reworded to agree with §9.1 |
| §8.5 | Training has no batch; the *Trained* modal offers Again ×1 · Continue |
| §13.1 | Repeatable ×1 / ×3 / ×5 applies to checked actions only; training and shifts ×1; the modal's buttons after a Trained or Shift result |

Companion edits: `docs/economy.md` §1 (training row); this document's §2.1, §2.3, §2.4, §2.5, §3, §3.1, §7.4 and §12.1.
