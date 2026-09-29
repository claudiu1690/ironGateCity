# Irongate City — Economy sheet

| | |
|---|---|
| **Scope** | Slice 1 ("The 5-minute session"): tier-1 actions, jobs, Rested, Directives, levels, Standing. Slice 2 ("Arrival"): the origin's stats, the FXP seed, the coat, Ambition chapter 1 and the welcome set (§13). Slice 3 ("The first vote"): the election calendar against the day-2 target, the first PC sinks, councillors' FXP, the ordinance effects on income, and morale (§14). Grows one slice ahead of the build |
| **Sources** | GDD §5.2–5.5, §6.2–6.3, §6.5, §7.2–7.5, §8.4–8.5, §9, §13.3–13.4, §13.7, §14.2, §14.11, §15.1–15.3, §15.4, §15.10, §17.1, §18, §21.4; content in `docs/design/slice-1-content.md`, `slice-2-onboarding.md`, `slice-2-cities.md`, `slice-3-politics.md` |
| **Method** | A day-by-day model of four player profiles (script in the game designer's scratch space; the tables below are its output, rounded). Re-run whenever a rate changes |
| **Updated** | 29 Sep 2026 (slice-3 §14 added) |

Every number the model uses is a GDD number. Where the GDD left a number open it was pinned in this change and is marked **pinned**.

---

## 1. The rates (tier 1)

| Per Energy | XP | FXP | Iron | Opinion |
|---|---|---|---|---|
| Tier 1 (§5.5, §14.2) | 4.5 | 0.6 (council ×1.5 = 0.9, **pinned**) | 2 | 0.005 pts |
| Partial | half, per line, nearest whole, halves up, never below 1 | | | half |
| Rested (§6.3) | +50 % on covered points | — | +50 % | — |
| Directive match (§15.4) | — | +25 % | — | — |
| Training (§8.5, **pinned**; ×1 only, no batch) | 2.25 (half rate) | — | — | — |
| Job shift (§9) | — | — | pay, not a rate | — |

**Per action** (Success / Partial):

| Energy | Actions | XP | FXP | Iron | Opinion |
|---|---|---|---|---|---|
| 3 | Listen at the bar | 14 / 7 | — | 6 / 3 | — |
| 4 | Watch the customs shed | 18 / 9 | — | 8 / 4 | — |
| 8 | Propaganda ×4 | 36 / 18 | 5 / 2 | 16 / 8 | 0.040 / 0.020 |
| 10 | Canvass ×5, council | 45 / 23 | 6 / 3 (council 9 / 5) | 20 / 10 | 0.050 / 0.025 (council —) |
| 12 | Speech ×3 | 54 / 27 | 7 / 4 | 24 / 12 | 0.060 / 0.030 |
| 44 / 30 / 40 | Training INT / AGI / STR (recruit) | 99 / 68 / 90 | — | — | — |

A 10-Energy canvass with full Rested pays 68 XP / 6 FXP / 30 Iron. The four-tile modal always adds up because base and bonus are rounded separately.

**Training has no ×3** (GDD §8.5, decided in the QA fix round, `slice-1-content.md` §13.2): three points would cost 126–138 Energy for the reference recruit against a 100-Energy bar. The model already assumed about one trained point a day (§4), so nothing below changes; the removal also takes a little pressure off Appendix C #15 (training overshooting the stat targets).

---

## 2. Odds and the expected reward factor

Tier 1 never fails, so the expected reward is `0.5 + 0.5 × chance`. For the reference recruit at home (difficulty 8):

| Check | Stat used | Chance | Expected factor | With *Known* (+6 %) |
|---|---|---|---|---|
| INT | 12 | 66 % | 0.83 | 72 % · 0.86 |
| STR | 10 | 58 % | 0.79 | 64 % · 0.82 |
| CHA+INT | (2+12)/2 = 7 | 46 % | 0.73 | 52 % · 0.76 |
| CHA+STR | (2+10)/2 = 6 | 42 % | 0.71 | 48 % · 0.74 |
| AGI | 5 | 38 % | 0.69 | 44 % · 0.72 |

The spread between the best and the worst stat is only 0.83 vs 0.69, so an off-stat action is a worse tap, not a wasted one. Odds climb fast: +1 stat point per level, +3 % per Standing level and training push the INT canvass to **95 % (the clamp) by day 3–4** for the reference player. That is by design (§8.4: "old content drifts up to 95 %"); tier 2 takes over from Level 6 in slice 5.

---

## 3. Energy and Rested per day

Regen is 5 per 10 minutes = 30 per hour = 720 a day; the bar holds 100 and the overflow banks as Rested up to 200 (§6.2–6.3). Every profile spends the bar to empty each session.

| Profile | Sessions | Session times | Energy spent / day | Rested earned / day | Energy carrying the Rested bonus |
|---|---|---|---|---|---|
| **Casual** | 2 | 12 h apart | 200 | 400 (capped: pool sits near 200) | 200 of 200 (100 %) |
| **Reference** (GDD §5.2) | 3 | 6 h, 6 h, 12 h gaps | 300 | 360 | 300 of 300 (100 %) |
| **Regular** | 4 | 5, 5, 6, 8 h gaps | 400 | 320 | 320 of 400 (80 %) |
| **Heavy** | 6 | every 3 h 20 while awake, 8 h sleep | 600 | 140 | 140 of 600 (23 %) |

**Day 1** is smaller for everyone: the bar starts full with no Rested, so a three-session first day is 300 Energy with 160 Rested.

Reading: the GDD's "about 400 Energy a day including Rested" for the reference player is 300 Energy of which all carries +50 % XP and Iron, about 450 Energy-equivalents of XP. §5.2 now says so.

**Time per bar:** 100 Energy = ten 10-Energy taps, or three ×3 canvasses (90) and one intel tap. At 3–5 seconds per modal that is 1–2 minutes; with reading, 2–3. Pillar 7 holds.

---

## 4. A reference day in slice 1

How the model spends a 300-Energy reference day (day 2 onward):

| Spend | Energy | Notes |
|---|---|---|
| Job shift | 4 | Factory worker, once |
| Training | ~44 | One INT point (rises 2 Energy per point) |
| Intelligence | 8 | Two taps |
| Political (canvass, propaganda, speech, council) | ~244 | The rest; ~24 attempts |
| **Total** | **300** | |

Directives: about 60 of the political Energy matches an order (+25 % FXP on it); all three orders are completed (+20 FXP each, +5 PC).

---

## 5. Daily income

### 5.1 Iron

| Source | Casual (200 E) | Reference (300 E) | Regular (400 E) | Heavy (600 E) |
|---|---|---|---|---|
| Political and intel actions (with Rested) | ~490 | ~720 | ~930 | ~1,120 |
| Factory worker: half pay at 00:00 | 108 | 108 | 108 | 108 |
| Factory worker: shift + streak (avg +12 %) | ~121 | ~121 | ~121 | ~121 |
| **Iron per day (steady state)** | **~720** | **~950** | **~1,160** | **~1,350** |
| Day 1 (no Rested at start, no salary yet) | ~580 | ~760 | ~990 | ~1,400 |

Checks against §18.2 (week 1: ~1,000–2,000 a day): the reference player lands at the **low end**; the regular player is inside. Acceptable for slice 1, where there is nothing to buy. Revisit when Rested from lodging and the first sinks land (slice 2).

**Jobs are the Iron engine per Energy:** a 4-Energy Factory shift pays 108–151 Iron (27–38 per Energy) against 2 per Energy from a canvass. That is the point of a job: steady income that doesn't depend on faction activity (§9). The Street vendor (100 a day) is the fallback; the Driver (200, AGI 10) is the recruit's first visible goal that training unlocks.

### 5.2 Iron sinks in slice 1

**There are none, and that is fine.** Slice 1 tests whether spending Energy is fun; Iron is a score until slice 2 adds the first outfit and lodging (§18.3), and slice 4 adds tickets. The balance will accumulate: a reference player has ~6,400 Iron by day 7 and ~26,000 by day 30, which slice 2's Tier I coat (hundreds) and slice 8's flat (2,500) can absorb. Nothing to fix now; noted so nobody adds an upkeep "to give Iron a purpose" (§18.1 forbids mandatory upkeep).

---

## 6. XP, levels and pacing

Model assumptions: odds start at 66 % and rise with level-up points and training (all into INT) and with Standing; Rested as in §3; training XP at half rate. Cumulative XP and the level reached at the end of each day:

| Day | Casual XP (L) | Reference XP (L) | Regular XP (L) | Heavy XP (L) |
|---|---|---|---|---|
| 1 | 840 (3) | 1,320 (4) | 1,840 (5) | 2,840 (6) |
| 2 | 1,970 (5) | 3,040 (**6**) | 4,080 (7) | 5,600 (8) |
| 3 | 3,140 (6) | 4,830 (8) | 6,370 (9) | 8,350 (10) |
| 4 | 4,350 (7) | 6,620 (9) | 8,660 (**10**) | 11,090 (12) |
| 5 | 5,560 (8) | 8,400 (**10**) | 10,950 (12) | 13,830 (13) |
| 7 | 7,960 (10) | 11,940 (12) | 15,490 (14) | 19,280 (15) |
| 10 | 11,540 (12) | 17,210 (14) | 22,270 (16) | 27,400 (18) |
| 14 | 16,270 (14) | 24,140 (17) | 31,230 (19) | 38,130 (21) |
| 21 | 24,430 (17) | 36,030 (20) | 46,660 (23) | 56,630 (24) |
| 30 | 34,680 (20) | 50,850 (23) | 66,080 (26) | 79,890 (28) |

XP per day at steady state: casual ~1,200 · reference ~1,780 · regular ~2,280 · heavy ~2,740.

**Against the §5.2 targets (reference player):**

| Milestone | Target | Model | Verdict |
|---|---|---|---|
| Level 6 (bar services, tier 2) | day 2 | day 2 | ✓ |
| **Level 10 (train travel)** | ~day 5 | **day 5** | ✓ |
| Level 16 (full map) | ~week 2 (day 13) | day 12 | ✓ |
| Level 31 | ~week 6 | beyond the 30-day model at tier-1 rates; tier 3 (7 XP/E) from Level 16 is what gets there. Re-check in the slice-5 sheet | — |

Casual reaches Level 10 on day 7 and Level 16 on day 18; heavy reaches them on day 3 and day 8. The heavy player runs about 35 % ahead of the reference: more Energy, less Rested. That is the intended shape ("the frequent player simply does more", §6.3). **Flag (Appendix C #14):** if telemetry shows most players are heavy rather than reference, the level table will read fast; the lever is the table, not the Rested bonus.

**Flag (Appendix C #15):** level-ups alone give the reference player +9 stat points by day 5 and +19 by day 20, which on their own meet the §8.5 "best stat" targets (week 1 ~15, month 1 ~30). Training on top of that overshoots the targets (INT ~30 by day 7 in the model). Harmless in slice 1 (the clamp is 95 %), but the §8.5 targets or the +1-per-level rule should be reconciled before tier-2 difficulties (14–20) are set in slice 5.

---

## 7. FXP and rank

FXP per day = political Energy × 0.6 × expected factor, +25 % on ~60 matching Energy, +60 for completing three Directives. Rank 2 is **400 FXP (pinned; was 500)**.

| Day | Casual FXP (R) | Reference FXP (R) | Regular FXP (R) | Heavy FXP (R) |
|---|---|---|---|---|
| 1 | 150 | 190 | 240 | 330 |
| 2 | 310 | 390 | 500 (**2**) | 700 (**2**) |
| 3 | 470 (**2**) | 600 (**2**) | 770 | 1,070 |
| 5 | 800 | 1,020 | 1,300 | 1,810 |
| 7 | 1,120 | 1,430 | 1,830 | 2,540 (**3**) |
| 10 | 1,610 | 2,030 (**3**) | 2,610 (**3**) | 3,620 |
| 14 | 2,240 (**3**) | 2,820 | 3,640 | 5,030 |
| 21 | 3,330 | 4,170 | 5,390 | 7,440 (**4**) |
| 30 | 4,690 | 5,810 | 7,550 (**4**) | 10,410 |

FXP per day at steady state: casual ~160 · reference ~205 · regular ~265 · heavy ~370. Directives supply about 30 % of it (the +25 % match and the 60 completion FXP), in line with §5.5's "about 25 % from outside missions".

**Against the targets:**

| Milestone | Target | Model | Verdict |
|---|---|---|---|
| **Rank 2: vote** | day 2 | reference: 390 at the end of day 2 on tier-1 play alone; with slice 2's +50 FXP seed and the 30 FXP of chapter 1 (§13) it is **about 475, during day 2** | ✓ from slice 2; at the old 500 threshold it was day 3 even with the seed, which is why Rank 2 was lowered |
| Rank 3: stand for council | ~day 10 | reference day 10, regular day 8 | ✓ |
| Rank 4: Faction Chair | ~week 4 | regular day 24; reference ~day 33 at tier-1 rates only | ✓ for the regular; the reference needs tier-2 FXP (0.8/E) and Campaign Events, both in by then |
| Rank 5 | ~week 8 | out of scope for tier-1 rates | — |

**Lever if day 2 still misses in the slice-2 playtest:** the welcome edition can grant FXP; do not raise the per-order bonus, which would tip Directives past 30 % of income.

---

## 8. Opinion

A reference player moves Coalport by about **+1.15 points a day** (regular +1.6, heavy +2.5), drawn from the Neutral pool (15 %). §14.2 promised +0.8 to +1.0 for tier-1 play; the difference is that slice 1 has almost nothing but political actions to spend on. Fine for now.

**Flag (Appendix C #16):** slice 1 writes opinion but the 2 %-a-day home drift is slice 4. With five testers the Collective share climbs from 70 to the 95 % cap in about five days and stays there. That is harmless for the playtest question (the meter still moves per tap and the *Fired up* headline shows), and morale states have no effect until slice 3. If the architect finds it cheap, apply the drift lazily at the day boundary; otherwise accept it.

---

## 9. Local Standing

Successes per day: reference ~24 on day 2, ~25 after.

| Level | Successes | Casual | Reference | Regular | Heavy |
|---|---|---|---|---|---|
| Familiar | 10 | day 1 | day 1 | day 1 | day 1 |
| **Known** (council candidacy, §15.1) | 30 | day 3 | **day 3** | day 3 | day 2 |
| Trusted | 70 | day 6 | day 5 | day 4 | day 3 |
| One of Us | 150 | day 11 | day 8 | day 6 | day 5 |

*Known* arrives a week before Rank 3 (~day 10) for everyone, so Standing never gates a candidacy that Rank allows. The +12 % cap is reached inside two weeks at home; in a battleground (difficulty 10, fresh Standing) the same ladder restarts, which is what makes moving a real choice (§7.4).

---

## 10. Directives

Three orders a day sized to ~60 Energy in total: a casual player clears them in one session, a heavy player in a quarter of one. Rewards per day: up to +15 FXP from the match bonus, +60 FXP from completions, +5 PC. PC accumulates with no sink until slice 3; the sinks and the budget are in §14.2.

---

## 11. Session shape check (pillar 7)

| Session | What happens | Taps | Minutes |
|---|---|---|---|
| Quick check | Paper · one ×3 canvass · shift | 3 | 1 |
| Regular | Paper · three ×3 runs · intel tap · one training | 6–7 | 2–3 |
| Chained | Regular, then keep going as Energy ticks in | — | as long as the player likes |

Nothing in slice 1 needs the player at a set time: Directives refresh at 00:00 UTC and are simply gone if missed; half pay arrives without a login; Rested banks the night.

**Long absences:** a return credits at most 14 half-pays (GDD §9.1), so the largest back-pay windfall is 14 × 108 = **1,512 Iron** for the Factory worker, about 1.6 reference days of income. Uncapped, a 90-day absence would have paid 9,720 Iron (about 10 days of income) for doing nothing. The cap never touches anyone seen at least once a fortnight.

---

## 12. Open flags (all tracked in GDD Appendix C)

| # | Flag | Risk | Proposed lever |
|---|---|---|---|
| 14 | Heavy players level ~35 % faster than the reference | Content tiers feel short for the most engaged | Level table, after slice-3 telemetry |
| 15 | Level-up stat points alone meet the §8.5 targets; training overshoots | Tier-2 difficulties set against inflated stats | Reconcile §8.5 before slice 5 |
| 16 | ~~No opinion drift in slice 1~~ closed: the home drift is built in slice 3 (§14.5) | Coalport still pins at 95 % with a few testers, by design | — |
| 18 | The welcome set belongs to the City Day of creation | A 23:50 UTC sign-up gets ten minutes of it | Extend to day 2 when day 1 was under two hours, if the playtest shows it |
| 20 | Chapter 1 can end in Failure on a player's first hour | Read as "I failed the tutorial" | Drop the Failure band for chapter 1, not the difficulty |
| — | Iron has no sink | None in slices 1–3 (the outfit is given, not sold; politics costs PC, never Iron) | Slice 4 (tickets), slice 8 (wardrobe, the flat) |
| 21–25 | The slice-3 flags: the day-2–4 ballot, the ward-vote weights, *Fired up* as the normal state, the small-branch endorsement rule, no running totals | See §14 | GDD Appendix C |

---

## 13. Slice 2: what the first day adds

Slice 2 adds no rate and no sink. It adds three one-off sums on day 1 and a choice that moves the CHA odds. The reference player of §3–§7 is unchanged; the figures below are the deltas.

### 13.1 Starting values by origin answer

| Answer | Reference recruit | Range across answers |
|---|---|---|
| Stats (§8.5) | STR 10 / INT 12 / AGI 5 | best stat 8–16 (the origin gives 6–9 trained points, at most +8 to one stat, plus the faction's +3); the other two 5–11 |
| Worn CHA | 2 (coat refused) | 2 (refused) · 5 (accepted) · 6 (promised: coat 5 + base 1); up to 9 with *talked them out* and *read people* on top |
| Iron | 150 (refused) | 0 or 150 |
| FXP | 50 (the wish matched the faction) | 0 or 50 |

**What the coat is worth.** The CHA+INT actions are a third of each home city's checks (Coalport 4 of 15, Duskwall 3 of 15, Ashford 6 of 16). For the reference recruit they sit at 46 %; coat A lifts them to 52 %, coat C to 54 %, which is +0.03 to +0.04 on the expected reward factor of those actions (0.73 → 0.76 / 0.77) and about **+3 % of a day's XP** for a player who spreads their Energy. Refusing the coat is 150 Iron, which is about a sixth of a reference day's income. The three answers are within a day's play of each other; none is a trap.

**The flattest build.** A Vanguard recruit who fished, talked them out and read people starts at STR 8 / INT 8 / AGI 8 with CHA base 3 (worn CHA 5 refused, 8 with coat A, 9 with coat C): every home check is 50 % (52 % on CHA+INT with coat C), an expected reward factor of 0.75 against the reference recruit's 0.83 on INT. Level 2 arrives on the fourth or fifth canvass instead of the third or fourth, and the first bar pays about 10 % less XP. From day 2 the level-up points close the gap: the build's best stat reaches the 95 % clamp about a day and a half after the reference recruit does (day 5 rather than day 3–4). The CHA base 3 is permanent and adds to every outfit bought later, which is the trade the answers describe. No pacing target in §5.2 moves.

### 13.2 Day 1, session 1 (the first bar, 100 Energy, no Rested)

Reference recruit in Coalport, INT approaches, expected values:

| Spend | Energy | XP | FXP | Iron | Other |
|---|---|---|---|---|---|
| Welcome set A: canvass ×2 at 66 % | 20 | 75 | 13 + 20 (order done) | 33 | +0.08 opinion |
| Welcome set C: *Take a job* | 0 | — | 20 | — | streak starts at the shift |
| The shift (Factory worker) | 4 | — | — | 112 (108 + 2 % streak) | |
| Welcome set B: committee at 66 % | 10 | 37 | 10 + 20 (order done) | 17 | **+5 PC**, all orders done |
| Ambition chapter 1 (INT vs 8: 66 / 20 / 14 %) | 10 | 118 | 30 | 76 | a keepsake |
| Free play: five canvasses and an intel tap | 56 | 200 | 25 | 90 | +0.2 opinion |
| **First bar** | **100** | **~430** | **~190 (+50 seed = 240)** | **~330 (+150 refused coat = 480)** | Level 2 at 150 XP on the 3rd–4th tap; **Level 3 (450) on the first bar if the chapter succeeds**, otherwise early in session 2 |

Chapter 1 pays about 12 XP per Energy against tier 1's 4.5, which is deliberate: it is one 10-Energy story a week at most, and on day 1 it is the biggest single number the player sees, which is what a story reward should be. Over a week it is under 3 % of XP.

### 13.3 Day 1 and day 2 totals (reference player, three sessions)

| | Slice 1 sheet | With slice 2 | Change |
|---|---|---|---|
| XP, end of day 1 | 1,320 (L4) | ~1,440 (L4) | +chapter |
| FXP, end of day 1 | 190 | ~270 | +50 seed, +30 chapter |
| FXP, end of day 2 | 390 | **~475 → Rank 2 during day 2** | the §5.2 target met |
| Iron, end of day 1 | ~760 | ~985 | +150 coat, +76 chapter |
| Level 6 / Level 10 | day 2 / day 5 | day 2 / day 5 | unchanged |

Casual, regular and heavy players get the same three one-offs; none of the milestones in §6, §7 or §9 moves by more than a few hours.

### 13.4 Duskwall and Ashford

Both cities pay the same rates at the same difficulty as Coalport, so §3–§9 apply unchanged to any faction. What differs is the odds mix of the *reference answers* in each faction (`slice-2-onboarding.md` §2.4): the Vanguard recruit (STR 11 / INT 11) sees 62 % on nine of Duskwall's fifteen checks and 44 % on the four CHA checks; the Alliance recruit (INT 14) sees 74 % on seven of Ashford's sixteen and 50 % on the six CHA+INT checks. Expected reward factors sit between 0.69 and 0.87 in every city, inside the slice-1 spread, so no city levels faster than another by more than a few percent. Ashford is where the coat matters most (six CHA+INT checks) and Duskwall where AGI training matters least (two AGI checks, both propaganda); both are flavour, not balance problems.

### 13.5 Session shape (pillar 7)

From sign-up to the first result modal: eleven taps, about three minutes. The whole first bar, with the origin, the faction, the paper, the welcome set, the job, the shift and the chapter, is **about fifteen minutes**, and every screen in it is resumable. The second session of day 1 (three hours later, 100 Energy and no Rested yet) is the slice-1 regular session of §11.

---

## 14. Slice 3: the first vote, the first sinks, ordinances and morale

Slice 3 adds no tier-1 rate. It adds a calendar (which decides *when* the day-2 target lands), the first Political Capital sinks, an office stipend, a morale bonus and ten ordinances that move existing numbers for five days at a time. Rules: `docs/design/slice-3-politics.md`; GDD §15.3, §14.11, §6.5.

### 14.1 The day-2 vote against the calendar

Rank 2 (400 FXP) is unchanged: the reference recruit has about 475 FXP at the end of day 2 (§13.3), and reaches it in the third session of day 2. The home city's polls are open on cycle days 2–4 of a five-day cycle (§15.3), so what the player gets on the day they make Rank 2 depends on where their day 2 falls in the city's cycle:

| Cycle day when Rank 2 arrives | Share of new players | First ballot |
|---|---|---|
| 2, 3 or 4 (polls open) | 60 % | The same day (day 2 for the reference recruit) |
| 1 (last day of nominations) | 20 % | The next day (day 3) |
| 0 | 20 % | Two days later (day 4) |

Mean wait after Rank 2: 0.6 days. Casual players (Rank 2 on day 3) vote on day 3–5; heavy players (day 2, second session) on day 2–4. **Verdict:** the §5.2 target is met as restated (*the right on day 2, the ballot by day 4*); the old wording (the ballot itself on day 2) could not be met by any staggered calendar and has been changed (Appendix C #21).

The first candidacy needs Rank 3 (2,000 FXP: reference day 10, regular day 8, casual day 14, heavy day 7) and *Known* (day 3 for all). Nominations are open two days in five, so the first candidacy is filed on day 10–14 and the first seat, three days after nominations close, lands on **day 13–17** for the reference player: "week 2 at the earliest" (§15.1) holds, and it is the *earliest*.

### 14.2 Political Capital: the first budget

Income is unchanged: **+5 PC a day** for completing all three Party orders (from day 1: the welcome set pays it in the first ten minutes). New income: **+10 PC per boundary held as a councillor** (50 a term).

| Sink | PC | Earliest use |
|---|---|---|
| Endorse a candidate | 10 | Day 2 (Rank 2), if both days' orders were done |
| Declare for the council (deposit) | 10 | Day 10–14 (Rank 3) |
| Move an ordinance | 20 | The first term (day 13–17) |

A daily player who never misses the orders has 50 PC on day 10 and **about 45 allowing a missed day**: enough to file (10), endorse a colleague in the same cycle (10) and, once seated, move an ordinance (20), with a few left. A casual player who completes the orders four days in five has ~40 by day 14, which still covers file + endorse; the proposal waits for the stipend, which pays 10 a day from the seat. A sitting councillor earns 15 a day against a maximum spend of 40 per five-day cycle, so PC accumulates from the first term at about 35 a cycle towards the 1,000 cap; the Chair candidacy (25), petitions (10) and patron favours (15–40) arrive in slices 7–8 to spend it. **Nothing political costs Iron**, so the Iron balance keeps growing as in §5.2.

The deposit is returned when a candidacy is struck for want of endorsements, so a player who files and is refused loses nothing; the small-branch rule (§15.3) means a lone player who does the day's orders is never struck.

### 14.3 FXP: the stipend and the morale bonus

| Source | Per day | Reference player's FXP/day (was 205) |
|---|---|---|
| Councillor's stipend | +20 FXP per boundary held (§6.5) | 225 while seated (+10 %) |
| *Fired up* (§14.11) | +10 % of base FXP on actions in the city; Directive bonuses are not actions | +14–15 on ~145 action FXP (+7 %) |
| Both | | ~240 (+17 %) |

Milestones (reference, city *Fired up* from about day 9, §14.5): Rank 3 moves from day 10 to about **day 9.5**; Rank 4 (6,000) from about day 33 to **about day 30** for a player seated half the time. The regular player reaches Rank 4 about day 22 (was 24). Directives stay near 30 % of daily FXP (the bonus lines are on actions, so the ratio is unchanged). *Fired up* was +5 % in the GDD; per-line rounding (halves up) turned 5 % of a 6-FXP canvass into 0, so the state showed nothing at tier 1; at 10 % every line shows +1 or more (Appendix C #23).

The public-meetings ordinance (below) adds a further +25 % on action FXP for five days: +36 a day for the reference player, about one extra day of FXP per term. Worth having, not worth planning a rank around.

### 14.4 Ordinances: what each is worth (reference player, per day, while in force)

All ten are bounded modifiers on numbers this sheet already models. Values below are for the reference player (300 Energy, Factory worker at 216, streak ≥ 10, INT canvasses at the 95 % clamp by day 4) unless stated; the casual and heavy figures scale with their Energy.

| Ordinance | Effect | Worth per day | Who wants it |
|---|---|---|---|
| Public Works Order | Job pay +10 % | **+22 Iron** (216 → 238; the half pay and the shift both rise) | Everyone, a little. The streak bonus and the ordinance line are each a percentage of the unmodified 216 (GDD §9.1), so the shift shows *Streak +43 · Public Works Order +11* and the day is +22, not +27 |
| Shift Hours Order | Shift −1 Energy; each shift adds two days of streak | +1 Energy (~5 XP); a new job's streak reaches +20 % in five shifts instead of ten: about **+10 Iron a day** over those days | Players with a young streak: new members, job switchers, returners; the Collective's motion |
| Street Permits | Propaganda swing +15 % | Morale +0.02 a day for the reference mix (~100 propaganda Energy) | The branch, when morale is near a threshold |
| Rally Permits | Speeches 12 → 10 Energy, rewards unchanged | Speeches pay 5.4 XP / 0.7 FXP / 2.4 Iron per Energy instead of 4.5 / 0.6 / 2: **+20 % on speech Energy**; at a quarter of the political spend, **+5 % of the day's XP** | CHA-heavy builds (the coat, *talked them out*); the Vanguard's motion |
| Reading Room Grant | Training −20 % Energy | INT 12 → 13 costs 35, not 44: **9 Energy saved a day** (~40 XP), or a second point every fourth day | Trainers; the Alliance's motion |
| Rest Day Order | Rested cap 200 → 250 | Nothing for the three-session player (the pool never fills); **+50 boosted Energy** (~+110 XP-equivalents) for the once-a-day player and the returner | The weekend ordinance; small on purpose |
| Open Doors | Canvass +4 % chance | +0.02 on the expected factor: **+2–3 % of canvass rewards** off the clamp; nothing at 95 % | New members and off-stat canvassers; a council doing something for its newest |
| Ward Register | Standing: Successes count two | *Trusted* on day 4 and *One of Us* on day 6 instead of 5 and 8 (the +12 % cap two days early); nothing for a player already at the cap | New members; a good first ordinance for a new player's council |
| Ward Fund | Iron from checked actions +25 %; job pay −25 % | +180 − 54 = **+126 Iron** (+13 %); casual +122 − 54 = +68; heavy +280 − 54 | Active members, at the wage-earner's expense: the trade-off pair with Public Works |
| Public Meetings Order | FXP +25 % on actions | **+36 FXP** (+18 %) | Anyone chasing a rank |

No ordinance breaks a §5.2 milestone: the biggest XP lever (Rally Permits, all-in on speeches) is +20 % for five days on the slowest-odds actions; the biggest Iron lever (Ward Fund) is +13 %; the biggest FXP lever is +18 %. All of them expire by the calendar and only one is in force per city. The NPC defaults (Rally Permits, Shift Hours, Reading Room Grant) are three of the smaller ones in raw numbers, which is deliberate: a council of players should be able to do better than the branch.

### 14.5 Morale

Inputs (§14.11): +0.005 per Energy from political actions (the reference player: **+1.15 a day**, §8), the drift of **2 % of the distance to 70 a day**, +0.5 per ballot, +2 per player seat, −3 per count with no player ballot.

| City | Path |
|---|---|
| One reference recruit, alone | 70 → 80 (*Fired up*) in **about 9 days**; 90 by about day 25; the 95 cap is never quite reached (the drift is −0.5 there) |
| One casual, alone | *Fired up* in about 13 days |
| Five active testers (+5.75 a day) | *Fired up* on **day 2**, the cap by day 5, and it stays there |
| Nobody | 70, *Steady*; −3 per unvoted count, so *Unrest* after the fourth in a row (day 20); the drift back from 58 is +0.24 a day, so a city that fell into Unrest needs a member's work to leave it (about five reference days) |

The old flag (#16) is closed: with the drift in, Coalport still pins near the cap with a few testers, which is *Fired up* working as designed; the scale problem (hundreds of players moving the meter tens of points a day) stays with Appendix C #13 and slice 4's telemetry.

### 14.6 Session shape (pillar 7)

On a polling day the morning adds two taps (the Polling Day row, the ballot) and one modal, about 20 seconds. Declaring is three taps once a cycle; endorsing one; the ordinance vote one tap plus one for a proposal. A councillor's whole political week is under a minute. Nothing in slice 3 needs the player at a set time: every window is one to three full City Days and closes at the boundary, the count happens without anyone present, and the paper carries the result whenever the player next opens it.

### 14.7 Flags (GDD Appendix C #21–25)

| # | Flag | Risk | Lever |
|---|---|---|---|
| 21 | The first ballot lands day 2–4, not day 2 | 40 % of new players wait a day or two | A four-day poll with a one-day nominations window, if the wait kills the moment |
| 22 | Ward-vote weights (Successes ÷ 5; NPC 44…15) | Lone players always top, or never | Retune from the count tables |
| 23 | *Fired up* is the normal state for an active branch | A permanent +7 % FXP rather than a reward | Lower the bonus before touching thresholds |
| 24 | The branch's endorsement counts double in small branches | Candidacy too easy for a lone player | Require the orders on both days of the window |
| 25 | No running totals during polling | Loses the "it's close" hook | A turnout count without candidate totals |

### 14.8 Ambition chapter 2 (*Stand where he stood*, slice 3)

Unlocks after the first ballot and seven days after chapter 1: **about day 8** for the reference recruit, day 9–12 for a casual. One play, ever, so it moves no daily rate; the check is whether its numbers are a modest beat rather than a milestone-mover.

| | Chapter 1 (day 1) | Chapter 2 (day ~8) | Reference day at that point |
|---|---|---|---|
| Difficulty · Energy | 8 · 10 | **14 · 15** | — |
| Success | 150 XP / 40 FXP / 100 Iron | **300 XP / 80 FXP / 150 Iron** | ~1,780 XP · ~205 FXP · ~720 Iron a day |
| Partial | 75 / 20 / 50 | 150 / 40 / 75 | |
| Failure | 25 / 0 / 0 | 50 / 0 / 0 | |

Odds for the reference recruit at day 8 (INT ~30 from levels and training, CHA 5 with the coat): the INT approach is at the 95 % clamp, the CHA+INT approach about 65 %; a casual at day 12 (INT ~18) sees about 66 % and 40 %. Success is a sixth of a day's XP, two fifths of a day's FXP and a fifth of a day's Iron: worth opening the Letter for, not worth planning around. **Rank 3 moves by about 0.4 day at most** (80 of the ~2,000 FXP), which keeps the first candidacy on day 10–14 (§14.1). Rested applies as for chapter 1. No opinion, no Standing, no Party-order credit.

