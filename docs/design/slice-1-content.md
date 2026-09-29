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
- **×1 / ×3** (§13.1): ×3 spends three times the Energy in one go, rolls three times from one seed, and shows three rows and a "2 of 3" stamp. The ×3 button is disabled when Energy is short (tooltip "×3 needs 30 Energy"); there is no partial batch. ×5 is deferred to a later slice.
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

Two to three lines each. The Mill Gate canvass is the slice-0 text, unchanged.

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
- **×3** trains three points at the three rising costs (44 + 46 + 48 = 138 for INT) and is disabled when Energy is short.
- Training does not count toward Local Standing or Directive attempt counts, except the *Sharpen up* Directive (§6).
- CHA is never trained (§8.5).

### 2.5 Level-ups (§5.3, built in slice 1)

- Level = highest §5.3 threshold reached; one action can cross several.
- Each level: +5 max HP (stored; Health is shown from slice 5) and **+1 stat point to STR or INT**, placed with **one tap** in the result modal's knock-on section (*Level 4 · place your point: STR / INT · later*) or from the HUD badge. Pending points never expire.
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

### 3.1 Rules (pinned in §9.1)

- **Taking a job:** at the job's location, a *Jobs* card lists the jobs there with pay and requirements. *Take the job* is free and one tap. **Switching** to another job costs 2 Energy, takes effect at once, and **resets the streak to 0**. Requirements are checked on taking, never again.
- **Half pay at the day boundary:** at every 00:00 UTC the job held at that moment pays **50 % of daily pay**, whether or not the player logs in. A player away for a week gets seven half-pays, banked. (Implementation may be lazy at next read or an Agenda job; the rule is per boundary crossed.)
- **The shift:** once per City Day, at the job's location, for the listed Energy. It pays the **other 50 % plus the streak bonus**. Not a check: no roll, always paid, one outcome text. One shift per City Day regardless of job changes; a shift already worked today is not repeated for a new job.
- **Streak:** consecutive City Days with a shift worked, counting today. **Bonus = 2 % × min(streak, 10) of daily pay**, paid with the shift (first shift +2 %, tenth and after +20 %; Factory worker at +20 % = +43 Iron).
- **Sick days:** 2, refilled to 2 at the Monday 00:00 UTC boundary. A City Day without a shift spends one automatically and the streak survives (it neither grows nor breaks). A missed day with **no sick day left ends the streak** (back to 0); the job is never lost. In practice the streak only ends on the third missed day in a week, which keeps §4.3 rule 2 ("one missed day can never break a streak").
- Shifts pay **no XP and no FXP** (§13.3). Rested does not apply to pay.
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

- **+25 % FXP** on every matching attempt (base FXP × 0.25, rounded per line; a 6-FXP canvass shows *+2 party order*). Applies on Partial too. Never touches XP, Iron or opinion.
- **+20 FXP** the moment a Directive's personal target is reached (a bonus line in that action's modal: *Party order complete: +20 FXP*).
- **+5 Political Capital** when all three are complete. PC is **stored and shown from slice 1** (the HUD mockup already has it) and has no sink until slice 3; it is capped at 1,000 and never decays (§6.5).
- Progress counts **attempts** (Success or Partial) for count-type orders, Successes for *A full day*, and each row of a ×3.
- **Refresh at 00:00 UTC.** Unfinished orders are simply gone; nothing is taken away. There is no catch-up.
- Shown in the Morning Paper ("Party orders"), on the city screen as a compact 3-line list with progress, and as a tag on matching action tickets (*Party order 1 / 3 · +25 % FXP*).

---

## 7. Morning Paper v1 (§3.3)

### 7.1 Masthead

**The Coalport Clarion** · "Morning edition · Price 5 marks" · strapline *The voice of the mill and the quays* · dateline *{Weekday} · {date} · Coalport*. Each home city gets its own paper; the national *Irongate Herald* of the mockup is what battleground residents read from slice 4. (Provisional names for later: *Ashford Gazette*, *Duskwall Sentinel*, *Clearwater Courier*.)

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

### 7.4 Headline templates (11)

Up to three per day: **at most two personal** (highest priority first), then **one city or ambient**. Each has a headline and a one-to-two-line deck. `{name}` is the character's name; the Collective's Rank 2 title is *Activist* (§5.4).

| Id | Priority | Condition | Headline | Deck |
|---|---|---|---|---|
| `hl.first-day` | 1 | First paper ever | Welcome to Coalport | Your branch secretary has three orders for you below. Spend your Energy; it refills, five points every ten minutes. |
| `hl.rank-up` | 2 | Rank rose since last paper | {name} Made Activist by the Branch | Recruits become Activists on the strength of their party work. The vote follows. |
| `hl.level-up` | 3 | Level rose since last paper | Coalport Recruit Rises to Level {level} | {name} of the Collective spent {energy} Energy on the ward yesterday. The branch has noticed. |
| `hl.standing` | 4 | Standing level rose | A {Familiar / Known / Trusted} Face in Coalport | Coalport knows {name} now: {standing}. Actions here get +{bonus} %. |
| `hl.orders-done` | 5 | All three Directives done yesterday | Branch Praises Its Canvassers | Every order carried out yesterday. Secretary Holm: "That's how it's done." +5 Political Capital banked. |
| `hl.streak` | 6 | Streak reached 5 or 10 yesterday | {Five / Ten} Straight Shifts at the Mill | {name} has not missed a shift in {n} days. Pay is up {bonus} %. |
| `hl.away` | 7 | 2 or more City Days since last paper | While You Were Away | {days} days of half pay banked ({iron} Iron). Rested is full. The ward is where you left it. |
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
