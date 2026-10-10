# Irongate City — Economy sheet

| | |
|---|---|
| **Scope** | Slice 1 ("The 5-minute session"): tier-1 actions, jobs, Rested, Directives, levels, Standing. Slice 2 ("Arrival"): the origin's stats, the FXP seed, the coat, Ambition chapter 1 and the welcome set (§13). Slice 3 ("The first vote"): the election calendar against the day-2 target, the first PC sinks, councillors' FXP, the ordinance effects on income, and morale (§14). Slice 4 ("The battleground"): tickets, the move and the room as the first Iron sinks, the capital resident's day (difficulty 10, the Battleground bonus, Standing restarted, the job without its fifth), Issue and hero PC (§15). **Review 1** (30 Sep 2026): the job as a wage with seniority, the *First day* bonus, best-stat checks, the new slot-C order, *One of Us* PC (§16). **Slice 5** ("Risk"): tier-2 rates and the difficulty ladder, Heat's budget, run-ins by build, the caught check and the record, the cells and the infirmary, rival ground, the new PC sink (§19). **Slice 6** ("Together"): Campaign Event roles against the tier rates, the fixture's floor on a city's opinion, Political Capital from events, favours as sinks (§20). **Slice 7** ("The nation"): stipends, the top's Political Capital, the laws' worth, Clearwater (§21). **Slice 8** ("A life in the city"): the Wardrobe's prices against income, the Dossier's arithmetic, Favour's pace, the flat, Legacy, the season score (§22). **Slice 9** ("Launch readiness"): the balance pass (the 48-run matrix across days 1–30, the comparison rule, the opinion damping factor, the levers and their bounds; §23). Grows one slice ahead of the build |
| **Sources** | GDD §5.2–5.5, §6.2–6.3, §6.5, §7.2–7.5, §8.4–8.5, §9, §13.3–13.4, §13.7, §14.2, §14.11, §15.1–15.3, §15.4, §15.10, §17.1, §18, §21.4; content in `docs/design/slice-1-content.md`, `slice-2-onboarding.md`, `slice-2-cities.md`, `slice-3-politics.md` |
| **Method** | A day-by-day model of four player profiles (script in the game designer's scratch space; the tables below are its output, rounded). Re-run whenever a rate changes |
| **Updated** | 4 Oct 2026 (slice 9, §23 added: the balance pass, the damping factor, the levers); 4 Oct 2026 (slice 8, §22 added: the Wardrobe's prices against income, Dossier sales, Favour's pace, the flat, Legacy, the season score); 3 Oct 2026 (slice 6, §20 added: events, the fixture, favours); 3 Oct 2026 (slice 5, §19 added); 30 Sep 2026 (review 1, §16 added; §1, §4, §5.1, §11, §14.4 and §15.3 carry a note where the shift was) |

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
| Job (§9; review 1: a wage at the boundary, no shift) | — | — | pay, not a rate | — |

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
| ~~Job shift~~ | ~~4~~ | Gone (review 1, §16): the job pays at the boundary without Energy |
| Training | ~44 | One INT point (rises 2 Energy per point) |
| Intelligence | 12 | Three taps (was two: the shift's 4 Energy goes here) |
| Political (canvass, propaganda, speech, council) | ~244 | The rest; ~24 attempts |
| **Total** | **300** | |

Directives: about 60 of the political Energy matches an order (+25 % FXP on it); all three orders are completed (+20 FXP each, +5 PC).

---

## 5. Daily income

### 5.1 Iron

| Source | Casual (200 E) | Reference (300 E) | Regular (400 E) | Heavy (600 E) |
|---|---|---|---|---|
| Political and intel actions (with Rested) | ~490 | ~720 | ~930 | ~1,120 |
| Factory worker: the wage at 00:00 (review 1; was half pay 108 + a shift ~121) | 216 | 216 | 216 | 216 |
| Seniority (+2 % a day, +20 % from day 10) | ~43 | ~43 | ~43 | ~43 |
| **Iron per day (steady state)** | **~750** | **~980** | **~1,190** | **~1,380** |
| Day 1 (no Rested at start, no wage yet) | ~470 | ~650 | ~880 | ~1,290 |

Checks against §18.2 (week 1: ~1,000–2,000 a day): the reference player lands at the **low end**; the regular player is inside. Acceptable for slice 1, where there is nothing to buy. Revisit when Rested from lodging and the first sinks land (slice 2).

**Jobs are Iron for no Energy** (review 1): the Factory worker pays 216–259 a day at the boundary against 2 per Energy from a canvass, and costs nothing. That is the point of a job: steady income that doesn't depend on faction activity (§9). The Street vendor (100 a day) is the fallback; the Driver (240 since review 5, was 200; Level 3, Agility 10) is the recruit's first visible goal that training unlocks.

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
| Quick check | Paper · one ×3 canvass (the wage is already on the desk) | 2 | 1 |
| Regular | Paper · three ×3 runs · intel tap · one training | 6–7 | 2–3 |
| Chained | Regular, then keep going as Energy ticks in | — | as long as the player likes |

Nothing in slice 1 needs the player at a set time: Directives refresh at 00:00 UTC and are simply gone if missed; half pay arrives without a login; Rested banks the night.

**Long absences:** a return credits at most 14 days' pay (GDD §9.1; review 1), so the largest back-pay windfall is 14 × 259 = **3,626 Iron** for a Factory worker at full seniority, about 3.7 reference days of income. Uncapped, a 90-day absence would have paid 23,300 Iron (about 24 days of income) for doing nothing. The cap never touches anyone seen at least once a fortnight.

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
| Welcome set A: canvass ×2 at 76 % (66 + *First day* 10; review 1, §16.2) | 20 | 79 | 14 + 20 (order done) | 35 | +0.09 opinion |
| Welcome set C: *Take a job* | 0 | — | 20 | — | the first wage at the boundary (review 1: no shift) |
| Welcome set B: committee (best stat, INT 12) at 76 % | 10 | 40 | 11 + 20 (order done) | 18 | **+5 PC**, all orders done: the secretary's modal |
| Ambition chapter 1 (INT vs 8: 76 / 20 / 4 %) | 10 | 125 | 32 | 80 | a keepsake |
| Free play: six canvasses | 60 | 240 | 30 | 105 | +0.27 opinion |
| **First bar** | **100** | **~485** | **~200 (+50 seed = 250)** | **~240 (+150 refused coat = 390)** | Level 2 at 150 XP on the 3rd tap; **Level 3 (450) on the first bar**; the shift's 112 Iron is gone from day 1 and the wage (220) lands at the boundary |

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

From sign-up to the first result modal: eleven taps, about three minutes. The whole first bar, with the origin, the faction, the paper, the welcome set, the job and the chapter, is **about fifteen minutes**, and every screen in it is resumable. The second session of day 1 (three hours later, 100 Energy and no Rested yet) is the slice-1 regular session of §11.

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
| ~~Move an ordinance~~ | ~~20~~ | **Removed 10 Oct 2026 (voting simplified):** a councillor's rule on the city's ballot is free |

A daily player who never misses the orders has 50 PC on day 10 and **about 45 allowing a missed day**: enough to file (10), endorse a colleague in the same cycle (10) and, once seated, move an ordinance (20), with a few left. A casual player who completes the orders four days in five has ~40 by day 14, which still covers file + endorse; the proposal waits for the stipend, which pays 10 a day from the seat. A sitting councillor earns 15 a day against a maximum spend of 40 per five-day cycle, so PC accumulates from the first term at about 35 a cycle towards the 1,000 cap; the Chair candidacy (25), petitions (10) and patron favours (15–40) arrive in slices 7–8 to spend it. **Nothing political costs Iron**, so the Iron balance keeps growing as in §5.2.

**Voting simplified (10 Oct 2026; `docs/design/voting-simplified.md` §3.8, approved by the user).** Slice 3's sinks are now **two**: stand (10, spent, never returned) and back (10, optional). The 20 PC proposal is gone because putting a rule forward is the seat's power, not a purchase. A sitting councillor therefore banks 15 a day against at most 20 a cycle, and PC accumulates **about 55 a cycle from the first seat (was 35)** until slice 7's sinks (25 / 50 / 100, §21.2) arrive. Acceptable: the 1,000 cap is the limit by design (§23.3), income is unchanged and no §5.2 milestone moves. The old refund rule (the deposit returned if struck for want of endorsements) and the small-branch rule are superseded: there is no gate to be struck by.

### 14.3 FXP: the stipend and the morale bonus

| Source | Per day | Reference player's FXP/day (was 205) |
|---|---|---|
| Councillor's stipend | +20 FXP per boundary held (§6.5) | 225 while seated (+10 %) |
| *Fired up* (§14.11) | +10 % of base FXP on actions in the city; Directive bonuses are not actions | +14–15 on ~145 action FXP (+7 %) |
| Both | | ~240 (+17 %) |

Milestones (reference, city *Fired up* from about day 9, §14.5): Rank 3 moves from day 10 to about **day 9.5**; Rank 4 (6,000) from about day 33 to **about day 30** for a player seated half the time. The regular player reaches Rank 4 about day 22 (was 24). Directives stay near 30 % of daily FXP (the bonus lines are on actions, so the ratio is unchanged). *Fired up* was +5 % in the GDD; per-line rounding (halves up) turned 5 % of a 6-FXP canvass into 0, so the state showed nothing at tier 1; at 10 % every line shows +1 or more (Appendix C #23).

The public-meetings ordinance (below) adds a further +25 % on action FXP for five days: +36 a day for the reference player, about one extra day of FXP per term. Worth having, not worth planning a rank around.

### 14.4 Ordinances: what each is worth (reference player, per day, while in force)

All ten are bounded modifiers on numbers this sheet already models. Values below are for the reference player (300 Energy, Factory worker at 216, seniority at the +20 % cap, INT canvasses at the 95 % clamp by day 4) unless stated; the casual and heavy figures scale with their Energy.

| Ordinance | Effect | Worth per day | Who wants it |
|---|---|---|---|
| Public Works Order | Job pay +10 % | **+22 Iron** (216 → 238 at the boundary) | Everyone, a little. The seniority line and the ordinance line are each a percentage of the unmodified 216 (GDD §9.1), so the desk shows *Seniority +43 · Public Works Order +22* and the day is +22, not +27 |
| Long Service Order (was *Shift Hours Order*; review 1) | Seniority builds two days a day | A new job reaches +20 % in five days instead of ten: **+108 Iron over ten days**, about +11 a day; nothing for a job already at the cap | New members, job switchers; the Collective's motion. Small on purpose, like the other two defaults |
| Street Permits | Propaganda swing +15 % | Morale +0.02 a day for the reference mix (~100 propaganda Energy) | The branch, when morale is near a threshold |
| Rally Permits | Speeches 12 → 10 Energy, rewards unchanged | Speeches pay 5.4 XP / 0.7 FXP / 2.4 Iron per Energy instead of 4.5 / 0.6 / 2: **+20 % on speech Energy**; at a quarter of the political spend, **+5 % of the day's XP** | CHA-heavy builds (the coat, *talked them out*); the Vanguard's motion |
| Reading Room Grant | Training −20 % Energy | INT 12 → 13 costs 35, not 44: **9 Energy saved a day** (~40 XP), or a second point every fourth day | Trainers; the Alliance's motion |
| Rest Day Order | Rested cap 200 → 250 | Nothing for the three-session player (the pool never fills); **+50 boosted Energy** (~+110 XP-equivalents) for the once-a-day player and the returner | The weekend ordinance; small on purpose |
| Open Doors | Canvass +4 % chance | +0.02 on the expected factor: **+2–3 % of canvass rewards** off the clamp; nothing at 95 % | New members and off-stat canvassers; a council doing something for its newest |
| Ward Register | Standing: Successes count two | *Trusted* on day 4 and *One of Us* on day 6 instead of 5 and 8 (the +12 % cap two days early); nothing for a player already at the cap | New members; a good first ordinance for a new player's council |
| Ward Fund | Iron from checked actions +25 %; job pay −25 % | +180 − 54 = **+126 Iron** (+13 %); casual +122 − 54 = +68; heavy +280 − 54 | Active members, at the wage-earner's expense: the trade-off pair with Public Works |
| Public Meetings Order | FXP +25 % on actions | **+36 FXP** (+18 %) | Anyone chasing a rank |

No ordinance breaks a §5.2 milestone: the biggest XP lever (Rally Permits, all-in on speeches) is +20 % for five days on the slowest-odds actions; the biggest Iron lever (Ward Fund) is +13 %; the biggest FXP lever is +18 %. All of them expire by the calendar and only one is in force per city. The NPC defaults (Rally Permits, Long Service, Reading Room Grant) are three of the smaller ones in raw numbers, which is deliberate: a council of players should be able to do better than the branch.

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

On a polling day the morning adds two taps (the Polling Day row, the ballot) and one modal, about 20 seconds. Declaring is three taps once a cycle; endorsing one; the ordinance vote one tap plus one for a proposal. A councillor's whole political week is under a minute. **Voting simplified (10 Oct 2026):** a vote on the rule is three taps on a phone and two on desktop (the card is the ballot); standing is two; a councillor's rule is one tap; there is no council vote, so a councillor's political week is one tap and the pay. Nothing in slice 3 needs the player at a set time: every window is one to three full City Days and closes at the boundary, the count happens without anyone present, and the paper carries the result whenever the player next opens it.

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


---

## 15. Slice 4: travel, the capital and the Issues

Slice 4 adds no tier-1 rate. It adds the **first Iron sinks** (tickets, the move, the room), a second difficulty (10 in Irongate, with +5 % in a battleground district), the **Battleground** bonus on FXP and opinion, Issue momentum and two new PC sources. Rules: `docs/design/slice-4-battleground.md`; GDD §14.4–14.6, §14.9–14.11, §15.3, §18.3.

### 15.1 The sinks

| Sink | Iron | Against a reference day (~950) | Who pays it |
|---|---|---|---|
| A third-class ticket | 20 (10 under the Tram Subsidy or the Tram Fare Hike; floor 5) | 2 %; a round trip 4 % | The visitor: about three round trips a week in the model, **~120 a week** |
| Registering a residence | 500, both ways | About half a day's income; **11 % of the ~4,500 a reference player holds on day 5**, 4 % of the ~12,000 held on day 14 | Once; a second time if they go home |
| A room in Irongate | 100 for 7 days (50 under the Evictions effect); a renewal adds seven nights at the same price, at most fourteen paid ahead (QA m5) | 1.5 % of a week's income | Optional; the once-a-day player is the one it pays (below) |
| The card school's stake | 20, returned on Partial | — | Optional, on one journey in seven |

**Verdict:** the sinks are small next to income, on purpose (§18.1: Iron sinks are acceleration, and the balance has had nothing to buy for three slices). The move is the only one that is felt, and only on the day it is paid. The Iron balance keeps growing at about 90 % of its slice-3 rate; the wardrobe and the flat (slice 8) remain the sinks that matter. Nothing here is mandatory: a player who never travels pays nothing new.

### 15.2 Odds in the capital

Difficulty 10 costs **−8 %** on every check against home; the Battleground bonus gives **+5 %** back on political checks in a battleground district; Standing restarts at *Stranger* (the +12 % cap at home is gone until it is earned again: *Known* about a day and a half after arrival, *One of Us* about five days). For the reference player who first visits on day 5 (INT ~17 from levels and training):

| Check | At home (day 5, *Trusted*, +9 %) | Irongate, battleground district, no Standing | Irongate, leaning district |
|---|---|---|---|
| INT canvass | 95 % (clamp) | 50 + 4 × (17 − 10) + 5 = **83 %** | 78 % |
| CHA+INT speech (CHA 5) | 50 + 4 × (11 − 8) + 9 = 71 % | 50 + 4 × (11 − 10) + 5 = **59 %** | 54 % |
| INT intelligence | 95 % | 78 % | 78 % |

Expected reward factors: 0.92 at the clamp → 0.89 (INT) and 0.86 → 0.80 (CHA+INT) in a battleground district. **About −5 % on XP and Iron per Energy** for a fresh arrival, closing to −2 % once *Trusted* in Irongate (about day 3 in the capital) and to nothing at the clamp a few days later. The capital reads a little harder for the first week, which is the GDD's "new content starts lower" (§8.4) and what makes Standing worth restarting (§7.4).

### 15.3 A capital resident's day (reference player, 300 Energy, from day 7)

| | Home (slice-3 sheet) | Capital, battleground district | Capital, leaning district |
|---|---|---|---|
| XP / day | ~1,780 | ~1,700 (−5 % odds, closing) | ~1,650 |
| FXP from actions | ~145 | ~145 × 0.95 × **1.25** ≈ 172 | ~138 |
| FXP from orders (+25 % match, 3 × 20) | ~60 | ~60 | ~60 |
| *Fired up* (+10 %, home only) | ~14 | — | — |
| Councillor's stipend (if seated) | 20 | 20 | 20 |
| **FXP / day** | **~205 (225 seated)** | **~232 (+13 %)** | ~198 (−3 %) |
| Iron from actions (with Rested) | ~720 | ~690 | ~670 |
| Job: Factory worker kept (review 1: the full wage from anywhere) | 216 + 43 | 216 + 43 | 216 + 43 |
| Job: Porter after a switch (180, seniority from 0): never worth it with a home job | — | — | — |
| **Iron / day** | **~980** | **~950** | ~930 |
| Opinion moved / day | +1.15 (morale) | +1.15 × **1.25** ≈ +1.44 in the district (+2.2 in a week with a tagged Issue on half the Energy) | +1.15 |

**Milestones:** Rank 3 for a player who moves on day 5 arrives about **day 9** (was 9.5 at home with *Fired up*); Rank 4 about day 28 for a resident who lives in a battleground district (was ~30). The capital pays about **+13 % FXP** while the fight is on and **−7 to −15 % Iron**; in a leaning district it pays nothing extra and costs the same Iron. Level pacing is untouched within a day (Level 10 day 5, Level 16 day 12–13). **Verdict:** the capital is a little richer in FXP and a little poorer in Iron, which is the trade §14.11 describes ("a natural ladder: home, then a battleground"); no §5.2 milestone moves by more than a day. Flag: the bonus is district-shaped, so if the leaning districts empty out, that is the design working, not a bug; if *every* district is a battleground by week two (three factions within ten everywhere), the +25 % is a permanent +13 % and the lever is the ten-point band.

### 15.4 The first trip and the first move against the calendar

| Milestone | Reference | Casual | Heavy |
|---|---|---|---|
| Level 10 (the train) | day 5 | day 7 | day 3 |
| Rank 2 (may register) | day 2 | day 3 | day 2 |
| 500 Iron in hand after a ticket | from day 1 | from day 1 | from day 1 |
| **Earliest move** | **day 5** | **day 7** | **day 3** |
| First capital ballot (polls open after registering, offset 0) | day 6–10 | day 8–12 | day 4–8 |
| *Known* in Irongate (30 Successes) | ~1.5 days after arrival | ~2 days | ~1 day |
| First capital candidacy (Rank 3 + *Known* + nominations) | day 9–13 | day 15–18 | day 7–9 |
| First capital seat | day 12–16 | day 18–21 | day 10–12 |

So the playtest's question ("do players choose to move?") can be answered inside two weeks for every profile; the seat, as at home, is week 2–3.

### 15.5 Issues and heroes: the PC budget

| Source | PC | Per cycle or week for a daily player |
|---|---|---|
| All three orders (unchanged) | 5 / day | 25 a cycle |
| Councillor's stipend (unchanged) | 10 / day seated | 50 a term |
| **Issue top five** (new) | 4 per Issue owned | 0–8 a week (two Issues a city); at low population a daily player is in the top five of anything they touch |
| **District Hero** (new) | 25 per cycle | 0–25 a cycle; at low population, most cycles for the district's most active player |

A daily capital player earns about **35–60 PC a cycle** against a maximum political spend of 40 (file 10, endorse 10, propose 20), so PC accumulates a little faster than at home; the Chair candidacy (25), petitions (10) and favours (15–40) in slices 7–8 are the sinks. **Flag:** at low population District Hero is nearly automatic for whoever is most active in a district, and the +0.5 minimum is what keeps it from being free; at scale the brackets do the work. If the playtest shows one player collecting 25 PC every cycle with no contest, raise the minimum to +1.0 before touching the reward.

**Momentum sizes:** a reference player who spends half their political Energy on tagged actions adds ~120 momentum a day (Success ~85 %, Partial half); a week is ~700; five members of one faction on one Issue: ~3,500. Totals are printed as integers and mean "Energy spent on the argument", which the Issues section can say in one Courier line.

### 15.6 Journey cards

Seven cards, at most one per journey; the first journey always, then one in three. Expected value per card, all choices at the reference player's odds (INT 83 %, AGI 5 → 30 %, CHA+INT 59 %): about **+10 XP, +2 FXP, +8 Iron, +0.02 opinion**, or +10 Rested for the doze. Over a week of three round trips that is two cards and under **1 % of any daily total**. They are flavour with a number on them, as intended; nothing here is worth travelling for, which keeps the train a choice about *where* to play, not a reward loop.

### 15.7 Session shape (pillar 7)

Boarding is two taps and five seconds; the journey is twelve minutes in the background; a card is one tap; a tram is one tap; a move is two taps and a sheet read; a capital ballot is two taps. The Issues section adds ten seconds of reading to the paper. Nothing in slice 4 requires the player at a set time: journeys arrive whether or not the game is open, Issues resolve at the Monday boundary, the count at the Irongate boundary, and every window is at least a City Day.

### 15.8 Flags (GDD Appendix C)

| # | Flag | Risk | Lever |
|---|---|---|---|
| 8 | Journey times 12 / 12 / 15 / 25 (closed 2 Oct 2026: the user kept the planned times; dwell is still measured) | Players close the app rather than wait, and the train feels like a wall | Measure dwell; put the case to the user to shorten the near legs to 6–8 min only if dwell is under a minute and trips are rare |
| 27 | Rank 2 to move | Players move before they know their branch | A day count, not the rank |
| 28 | No early Issue resolution | Lopsided weeks feel dead by Wednesday | A *decided* state |
| 29 | Groundswell never fires at low population | The anti-snowball rule is untested | Seed one district above 50 for a week |
| 30 | Cross-faction ballots | Tactical griefing of a bloc | Own faction plus NPCs only |
| — | The capital's +13 % FXP is district-shaped | Leaning districts empty; or every district is a battleground and the bonus is permanent | The ten-point band |
| — | District Hero is nearly automatic at low population | 25 PC a cycle for turning up | The +0.5 minimum → +1.0 |
| 46 | The parcel pays 100 Iron (3 Oct 2026) | Players ride for parcels | The second fifty becomes half a stake; never the draw rate |

### 15.9 Settled with the architect, 3 Oct 2026 (`slice-4-battleground.md` §19)

Sixteen small rules were pinned and ten inconsistencies fixed. **One number moved:** the journey cards' Iron bound is **100 per outcome** (the parcel's 50 + 50; the "40" in the design was a slip for a 10-Energy action's 20), every other card still at most 40. Its weight: the parcel is one of seven cards drawn without replacement at one journey in three, so it comes about **once in 21 journeys** after the first; at the reference player's AGI odds (about 30 %) its expected value is **≈ 65 Iron**, against a 20 Iron ticket each way and a ~950 Iron day: under 1 % of a week's income, and §15.6's "a card is flavour with a number on it" stands. The §15.1 sinks table is unchanged.

**The Rested cap's city** (GDD §6.3): 200 + the residence city's rule and Issue effects + 50 for a room, wherever the player is. For the reference player this moves nothing: at home and in the capital the cap is 200 unless a Rest Day Order, *Fever at St Agnes*, *The Price of Coal* or a room says +50, and those add (at most 300 with a room under one of them). A visitor to Irongate gets no cap bonus from the capital's Issues, which keeps the once-a-day visitor's day the §15.3 day. Momentum rounding (half up on a Partial of odd Energy) adds at most one point per intelligence Partial and does not change the §15.5 sizes. Nothing else here is a number.

Rules: GDD §0 (*Added 30 Sep 2026, review 1*), §9, §8.4, §13.3, §13.7; answers in `docs/design/review-1-answers.md`. Nothing here adds a rate; two numbers move a little and one bar is spent differently.

### 16.1 The job (GDD §9)

| | Before (half pay + shift + streak) | After (the wage + seniority) |
|---|---|---|
| Energy a day on the job | 4 | **0** |
| Factory worker, reference (member, 216) at steady state | 108 + 108 × 1.20 = **238** | 216 × 1.20 = **259** (+21, +9 % on the job, +2 % on the day) |
| Day 1 | the shift's ~112, in hand at once | **nothing until the boundary**, then 216 × 1.02 = 220 |
| Days 1–10 of a job (rate climbing) | +2 % a shift | +2 % a boundary; the first boundary pays +2 %, the tenth +20 % |
| The 4 Energy freed | — | one more intelligence tap (~25 XP, ~11 Iron with Rested): no milestone moves |
| Iron a day, reference (§5.1) | ~950 | **~980** |
| Largest windfall on return (14-day cap) | 1,512 | 3,626 (about 3.7 reference days) |

Why the day-1 Iron dip does not matter: there is nothing to buy until slice 4's tickets (20), and the coat's 150 or the first wage covers those. Why the seniority cap is +20 %, unchanged: the streak was tuned so that a fortnight at one job is worth a fifth more than hopping, and the wage keeps that trade with none of the sick-day bookkeeping. Seniority counts absent days (Appendix C #31), which is bounded by the 14-day cap.

**Orders.** The shift order leaves slot C; *Five attempts anywhere in {city}* (5 attempts, ~50 Energy) joins *Train once* and *Six wins*. On its day the three orders total about 90 Energy rather than 60; the +20 FXP per completion is unchanged, so Directives stay at about 30 % of daily FXP (§10). *Take a job* is a welcome-day order only and still pays its +20 FXP on day 1.

**Capital residents (§15.3 above):** the home job now pays in full from anywhere, so the Porter (180) is only for a player with no job; a capital resident's Iron is ~950 rather than ~800–880, three per cent under home.

### 16.2 The first day (GDD §8.4, §13.7)

Three things change the welcome day's odds, none of them a rate:

| Build (best stat, home difficulty 8) | Old slot A | New slot A + *First day* +10 % | End of day 1 (three level points, *Familiar* +3 %) |
|---|---|---|---|
| All-in Alliance (INT 16) | 82 % | 92 % | 95 % (clamp) |
| Reference recruit (INT 12) | 66 % | **76 %** | 81 % |
| The user's Vanguard (STR 13, INT 5) | **38 %** on the committee and the chapter, 70 % on the gate | **80 %** on the gate, the committee (best-stat) and *Legwork* | 85 % |
| Flattest (8 / 8 / 8) | 50 % | **60 %** | 65 % |

Expected reward factors on the welcome day (`0.5 + 0.5 × chance`): reference 0.83 → **0.88**, flattest 0.75 → 0.80. That is about **+6 % XP and Iron on day-1 actions**: the reference recruit's first bar goes from ~430 XP to ~455 and the day from ~1,440 to ~1,520; Level 4 at the end of day 1 and Level 6 on day 2 are unchanged, Rank 2 during day 2 is unchanged (about +12 FXP on the day). The bonus ends at the boundary and every build's day-2 odds are at or above its day-1 odds (right-hand column), so nothing reads as a drop (Appendix C #33).

**Best-stat checks.** The committee is now a 70 %+ check for every build (it was 62–74 % for the reference recruits and 38 % for a STR Vanguard). It pays 0.9 FXP per Energy against a canvass's 0.6, so it was already the FXP choice; the odds make it the *best* choice for a rank-chaser in every home city. Modelled: a player who puts all political Energy into the committee earns ~300 FXP a day against the reference ~205 and moves no opinion; Rank 3 about day 7 instead of 10. Accepted for now (Appendix C #32); the lever is the 1.5× multiple.

**AGI level points** change no slice 0–4 number: no check in the home cities is AGI beyond two propaganda actions per city, and AGI training is the cheapest (30 Energy at AGI 5). An AGI-first reference-shaped player reaches AGI 30 about day 24 (Appendix C #34).

### 16.3 Small numbers pinned

| Number | Value | Effect |
|---|---|---|
| *One of Us* (150 Successes) | **1 PC a day** per such city | The reference player has it from day 8 at home: +6 PC by day 14 (the §14.2 budget of ~45 becomes ~50) |
| The welcome day | Creation day, plus the next when created after 22:00 UTC | Closes Appendix C #18; at most 2 % of sign-ups get the two-day version |
| Slot A for AGI builds | A propaganda action ×2 (16 Energy, not 20) | 4 Energy more for free play on day 1; +2 FXP less from the order's actions, the same +20 for completing it |

### 16.4 Session shape (pillar 7)

The wage removes a tap from every day (the shift) and a modal. The orders-complete modal adds one tap once a day, in place of the line it replaces. The help notes are a tap each and only when asked for. The Standing card and the signed order lines live inside modals that already exist. Nothing new is timed.

## 17. Review 2: plain words, hidden rolls, the Election card

Rules: GDD §0 (*Added 30 Sep 2026, review 2*), §1.5, §8.4, §13.1a, §15.3; answers in `docs/design/review-2-answers.md`. **No rate, cost, threshold or formula changes.** Three things to record:

- **Words are not numbers.** Renaming *canvass* to *talk to voters*, *Local Standing* to *Reputation*, *FXP* to *Party XP* and *PC* to *Political Capital* changes nothing in this sheet; every table above keeps the design's names, as the GDD does (§1.5).
- **The odds bands against the reference player.** *Good odds* is 70 % and above, *Fair odds* 50–69, *Long shot* under 50. The reference recruit's home canvass is 66 % on day 1 with no bonus (*Fair odds*), 76 % with the *First day* +10 % (*Good odds*), 81 % at the end of day 1 and *Good odds* from then on; the flattest build reads *Fair odds* (60 %) on day 1 and crosses to *Good odds* (72 %) about day 3 with three level points and *Familiar*; a STR 13 Vanguard reads *Good odds* on its gate canvass from the first tap. So the first session's ticket says *Good odds* for every build except the flattest, which says *Fair odds* and never *Long shot*: the band matches the §8.4 target that the first session sits inside 60–85 %. Nothing on a home ticket at difficulty 8 reads *Long shot* for a build's best stat; a *Long shot* appears only on a check against a low stat (the reference recruit's AGI 5 on a flyer action: 38 %), which is the reason line's cue to train it.
- **Hiding the percentages hides the day-2 step** (Appendix C #33): the *First day* bonus ending at the boundary moved a ticket from 76 % to 81 % in the review-1 model, which stayed inside *Good odds*; for the flattest build 60 → 65 stays inside *Fair odds*. The taper lever is no longer needed for legibility and stays parked.

Session shape (pillar 7): the Election card adds no tap (it replaces the HQ card's route and the paper's row as the place the state lives); the reason line replaces two lines of maths under a result row and opens nothing; the band note is a tap only when asked for. The count of taps per act in §14.6 is unchanged.

## 18. Review 3: the receipt, the buttons, the verb, the hall

Rules: GDD §0 (*Added 2 Oct 2026, review 3*), §8.5, §13.1, §13.1a, §14.13, §15.3, §15.10; answers in `docs/design/review-3-answers.md`. **No rate, cost, threshold or formula changes.** The reward receipt prints the same four numbers the tiles did (and hides a zero instead of printing it); the repeat buttons spend the same Energy with the cost written in words; a training action's button changes its word, not its price (20 + 2 × stat) or its half-rate XP; the council's hall is a backdrop. The one open lever is Appendix C #44 (the NPC fill at low population: nine names, or eight when fewer than two players stand), which changes no reward and waits for the user.

Session shape (pillar 7): no tap is added. The receipt is shorter than the tiles for every result but a full canvass, where it is about 30 px taller and still above the sticky buttons on a 667 px phone; the *How elections work* note is a tap only when asked for; free zoom is a gesture with no rule effect.

---

## 19. Slice 5: missions, Heat, run-ins, the record, the cells, the infirmary and rival ground

Rules: `docs/design/slice-5-risk.md`; GDD §6.1, §6.4, §8.4, §8.5, §11, §13.1, §13.3, §14.11, §14.12, §19, §20. Slice 5 adds the **tier-2 rates** to the model (they were in §5.5 and never spent), a **difficulty ladder** against the stat the model already grows, and the first things that take Iron because of risk: paying off a run-in, bail, the infirmary. **Two GDD numbers were changed in this slice** and both are here: the §8.5 best-stat targets (raised to the model, Appendix C #15) and the caught check's trigger (Partial and Failure only, Appendix C #56); everything else is a pin. **Settled with the architect (3 Oct 2026, `slice-5-risk.md` §23): no number in this section moves.** The Irongate missions are difficulty 20 (the +2 §19.2's ladder already assumed), a tier-1 tap on rival ground stays 15 % (§19.6's figure), and the five-minute decide window, a police loss on legal work being the cells and Health 30 in the cells change no rate.

### 19.1 The rates (tier 2)

| Per Energy | XP | FXP | Iron | Opinion |
|---|---|---|---|---|
| Tier 2 (§5.5, §14.2) | 5 | 0.8 (speech, vandalism, disruption, sabotage, theft; surveillance none) | 4 (theft **8**: no opinion, the branch buys the roll) | 0.01 (speech, from Neutral); **0.02** (the illegal types, from the target faction); none (surveillance, theft) |
| Partial | half, per line | | | half |
| Failure | **XP ÷ 5**, nothing else | | | |
| Against tier 1 | +11 % | +33 % | ×2 | ×2 / ×4 |

A Success on a mission is a win for Reputation; Rested applies to XP and Iron as on any checked action; the *close race*, Issue and *comeback* lines apply to the political types. Per mission at the §4.2 Energies: speech 15 E 75 / 12 / 60 / 0.15 · surveillance 12 E 60 / — / 48 / — · vandalism 10 E 50 / 8 / 40 / 0.20 · disruption 15 E 75 / 12 / 60 / 0.30 · sabotage 20 E 100 / 16 / 80 / 0.40 · theft 15 E 75 / 12 / 120 / —.

### 19.2 The ladder against the modelled stat (Appendix C #15 closed)

The model puts every level point and about one trained point a day into the best stat (§6): the reference recruit's INT is **12 + the level points + the trained points**.

| Day | Level | Best stat (model) | Mission Level · difficulty | Odds (no Standing) | Odds at *Trusted* (+9) |
|---|---|---|---|---|---|
| 2 | 6 | ~19 | 6 · 14 | 70 % | — |
| 3 | 8 | ~22 | 8 · 16 | 74 % | — |
| 5 | 10 | ~25 | 10 · 18 | 78 % | 87 % |
| 7 | 12 | ~28 | 12 · 20 | 82 % | 91 % |
| 13 | 16 | ~34 | (tier 3 from 22) | 95 % on any tier-2 | — |
| 30 | 23 | ~50 | | | |

**Verdict:** new content at its Level reads *Good odds* for the stacked build and *Fair odds* for a spread one (a Vanguard STR 11 at Level 6 has STR 16–17: 58–62 % on a 14), and the clamp arrives a few days after each rung, which is §8.4's shape. The old targets (15 / 30 / 60) are under the model by half; the GDD now states the model's numbers (12 / 28 / 50 / 85). Nothing in the rate tables changes; the difficulty ladder is the only new constant and it is a content number per mission.

### 19.3 A reference day with missions (from day 2)

The model spends **40 % of political Energy on legal missions** from Level 6 (a speech and a watch per session, about 100 Energy a day) and, from Rank 3 (day 9–10), **two illegal missions a session** on top (about 90 Energy of disruptions and vandalism a day).

| | Slice-4 sheet (day 7, home) | With legal missions (day 7) | With two illegal a session (day 10+) |
|---|---|---|---|
| XP / day | ~1,780 | ~1,860 (+4 %) | ~1,900 |
| FXP / day | ~205 | ~218 (+6 %: speeches at 0.8 on 60 E) | ~245 (+20 %: 6 × 12 at ~0.8 expected, minus the lost orders' Energy) |
| Iron from actions (with Rested) | ~720 | **~1,020** (+40 %: 100 E at 4 instead of 2, with Rested) | ~1,150, **less run-ins and the record** (§19.5, §19.7): net ~950–1,050 |
| Opinion / day | +1.15 | +1.45 (+0.30 from two speeches) | **+2.3** (six illegal missions at ~0.2 expected against a rival: half of each swing is the actor's) |
| Heat at the end of a session | 0 | 10 (two watches; Cool by the next session) | **~26–32** (*Noticed*; Cool again in six hours) |

**Milestones:** Level 10 stays day 5 (+4 % XP is hours), Level 16 day 12 (was 12–13), Rank 3 about **day 9** (was 9.5), Rank 4 about day 27 (was 30). Iron is the number that moves: tier 2 pays double per Energy, which the GDD set so that risk has a price a player can pay; §18.2's week-1 band (1,000–2,000 a day) now has the reference player in its middle rather than at its floor, and the sinks of §19.5 and §19.7 take some of it back. **No §5.2 milestone moves by more than a day.**

### 19.4 The Heat budget and the record

**Heat.** One session's illegal work: three disruptions = +24 (*Cool*; the fourth's check reads *Noticed*); six = +48; the first sabotage on top is *Hot*. Cooling is 5 an hour, **120 a day**: two or three illegal missions a session, three sessions a day, keeps a player under *Noticed*'s edge at every session's end and *Cool* at its start. **The budget is about nine illegal missions a day, or four or five in one sitting** before *Hot*; more is a choice to be *Hot*, which the HUD says.

**The caught check** (base + Heat ÷ 2 + the state − AGI ÷ 2, on a Partial or a Failure): for the reference recruit (AGI 5) at the start of a session a disruption is 10 + 0 − 2 = **8 %**, the third 10 + 8 − 2 = **16 %**, the sixth (Noticed) 10 + 20 + 5 − 2 = **33 %**. At 70–78 % odds about **30 % of missions** are not clean, so a mark comes every **15–25 illegal missions when Cool** and every **8–10 when Noticed**: a daily illegal player (nine a day) earns a mark every two or three days, is *On file* by day 3 of that life, a *Repeat offender* in about ten days if they never pause, and *Notorious* after a month. A week of legal play clears the minor marks (the 14-day fade from the last offence); theft's and sabotage's marks (2 and 3) do not fade in slice 5 and are the 30 PC sink's reason. **With the GDD's first rule (a check on every outcome)** the same player drew a mark every five missions and was *Notorious* on day 4 with no way back but 30 PC a mark, which is why §11.2 was changed (Appendix C #56).

**The record's cost:** *On file* is −10 % of mission Iron (about −40 a day for the model's mix), *Repeat offender* −20 % and +5 % on every run-in and caught check, *Notorious* −30 %, doubled bail and three kinds of place barred. Small against ~1,000 Iron a day; the +5 % on run-ins is the line that bites.

### 19.5 Run-ins by build

Run-in chances for the model's mix: speech 5 %, watch 10 %, vandalism 15 %, disruption 30 % at *Cool* (+5 at *Noticed*). About **1.5 run-ins a day** for the day-10 reference player; **0.3** for a player who stays legal.

| Build (day 10) | Fight | Run | Talk | Pay | What they do |
|---|---|---|---|---|---|
| Reference recruit (STR 10, AGI 5, CHA 5 with the coat): power 17 | vs enforcer 24 (×1.1): **29 %**; vs constable 33: 5 % | 30 % (enforcer) · 25 % (constable) | 30 % · 14 % | 90 % at 60 · 300 | Pays the enforcer; vs the police, pays or takes the cells one time in three |
| STR Vanguard (STR 20): power 32 | **74 %** vs enforcer · **47 %** vs constable | 30 % | 30 % | 90 % | Fights |
| AGI build (AGI 15 by day 10) | 29 % | **90 %** vs enforcer · 75 % constable | 30 % | 90 % | Runs (and forfeits the mission: Appendix C #47) |
| With a Tier II coat (slice 8, armour 8, CHA 15) | +2 power; **Talk 70 %** | | | | Talks |

**Expected cost of a disruption at *Cool*** (30 % run-in, enforcer): **the payer** loses 0.3 × 60 = **18 Iron** and keeps everything; **the fighter** (STR 20) loses 0.3 × 0.26 × (20 minutes and the mission's rewards) ≈ 5 minutes and ~5 Iron of rewards a mission; **the auto-resolver** (the reference recruit, Fight at 29 %) loses 0.3 × 0.71 × (20 minutes + ~55 Iron of rewards + 60 XP + 10 FXP) ≈ **4 minutes, 12 Iron, 13 XP and 2 FXP a mission**, plus the infirmary's 100 if they pay to leave. So the illegal road costs the new player about **10–20 % of its own rewards** in expectation, and the price of never paying is twenty minutes now and then. The constable is the sharp edge (300 to pay, 5 % to fight for a new player): at *Noticed* half of run-ins are constables, so a *Noticed* reference recruit expects ~0.15 × 300 = **45 Iron a disruption** to stay out of the cells, which is the number that makes Heat matter before *Hot* does.

### 19.6 Rival ground

A Collective reference player on day 5 (INT 25) in Duskwall: tier-1 difficulty 12 gives 95 % (the +4 does not bite the best stat yet; it bites the second stat: STR 10 at 12 is 42 %). **A tier-1-only day** (30 taps ×1): FXP 30 × 6 × 0.97 × 1.5 ≈ **263** against a home day's 205 + 60 (orders, which cannot be done there) = 265: **even**, with 4.5 run-ins a day (15 % × 30) costing ~270 Iron in pay-offs (60 each) or a few infirmary stays. **A mixed day with six rival-ground disruptions** (two a session; Heat +16 each, 96 a day, inside the 120 cooling): FXP 6 × 18 + 24 × 8.8 ≈ **320 (+45 %)**, run-ins 6 × 60 % + 24 × 15 % ≈ **7 a day** (~420 Iron in pay-offs, or two or three infirmary stays), marks 6 × 0.3 × 26 % ≈ 0.5 a day, opinion 6 × 0.3 × 0.75 + 24 × 0.05 ≈ **2.5 against the Vanguard**, capped at 2 (§14.11). Rank 3 for the specialist about **day 7–8** (reference 9), Rank 4 about **day 22** (reference 27): inside the heavy player's +35 % (§6), for real Iron and the cells. **The cells there:** a *Hot* visitor's sentence is 10 + 29 = 39 × 1.5 = 58 minutes, bail 200–300 × 2 = 400–600, then the train home and a day's bar. **Verdict:** "pays the best" holds for the specialist and costs what it costs; flagged (Appendix C #53).

### 19.7 The cells and the infirmary, in time and Iron

Twenty minutes is **10 Energy of regen**, worth about 45–68 XP and 20–30 Iron to the model; nothing else stops. **Bail** (100 at *Clean*, 200 at two marks) is two to six times the time's value, so the model waits and closes the app, as pillar 7 expects; a player mid-session pays. **The infirmary's** 100 Iron to walk out well is the same sum for the same twenty minutes plus full Health; discharge at half Health is free and leaves a player able to work (Health is only spent in fights). Expected spend for the day-10 reference player on the illegal road: **~50–100 Iron a day** across pay-offs, bail and the ward, against ~1,000 a day of income. **Nothing here is mandatory**, and a legal player spends nothing.

### 19.8 Political Capital: the new sink

**30 PC a mark**, the oldest first. A daily player earns 5 (orders) to 15 (a seat) PC a day, so a mark a week is affordable and a mark a day is not, which is the record's point: it is lived with, not bought off. The §14.2 and §15.5 budgets are unchanged; a player who never earns a mark never sees the button.

### 19.9 The Issues' new effects

*Customs Strike*'s `heatCoolPct +50` makes cooling 7.5 an hour (180 a day), which raises the Heat budget from nine illegal missions a day to about fourteen for a Coalport week: a real prize for the illegal road and nothing for the legal one, which is a good week for the branch to argue about. *The Cells Are Full*'s `bailPct −50` halves bail in the capital for a week. The other three are existing kinds at their existing sizes.

### 19.10 Session shape (pillar 7)

A mission is two taps the first time and one after; a run-in is one or none; the cells and the infirmary are one tap or a wait in the background; a rival-ground trip is the slice-4 journey with a card that is always there. Nothing needs the player at a set time.

### 19.11 Flags (GDD Appendix C)

| # | Flag | Risk | Lever |
|---|---|---|---|
| 47 | The run-in decides the held result | A Run reads as a trap | Let a Run keep Partial |
| 48 | ×1 only on rival ground | Ten taps a bar reads as tedious | A ×3 that stops at the first run-in |
| 49 | The record taxes missions only | Weightless for a tier-1 player | Extend to tier 1 at half the rate |
| 50 | Bail 100 + 50 a mark | Nobody pays, or everybody does | The base, or the sentence |
| 52 | The 2-point cap on rival pressure | Morale never moves at scale, or a branch of one cannot hold | 5, or 1, or per rival |
| 53 | +50 % FXP on rival ground | Branches living in rival towns | The run-in base, not the bonus |
| 54 | The police half the pool from *Noticed* | *Noticed* reads as a wall | A third from *Noticed*, half from *Hot* |
| 56 | The caught check on Partial and Failure only | Marks too rare | The base rates |
| — | Tier-2 Iron at ×2 lifts the reference day by ~40 % | Iron inflates before the Wardrobe (slice 8) has prices | Keep: it is the GDD's rate and the slice-5 sinks take 5–10 % back; price the Wardrobe against §19.3 |

---

## 20. Slice 6: Campaign Events, the fixture, favours and chat

Rules: `docs/design/slice-6-together.md`; GDD §16.3, §16.2, §14.2, §6.5, §14.11, §19.1, §19.2. Slice 6 adds **one new kind of spend** (an event role: Energy spent at sign-up, paid at the start on a group result), **one new Political Capital source** (events, 3–15), **no Iron** (events pay none; bail posted is the prisoner's figure moved to nobody) and **no new rate on solo play**. Chat and presence have no numbers. **One GDD number was pinned against its first draft:** Political Capital from events halves after the first of the day (§20.4). **Settled with the architect (3 Oct 2026, `slice-6-together.md` §20): no number moves**; a visit draws no Rested, the Rested part on a 15-Energy role is +38 (halves up), and a withdrawal above a full bar banks the excess as Rested.

### 20.1 What a role pays (per participant)

| Role · Energy | Own roll | XP | Party XP by the outcome (Triumph / Success / Mixed / Fiasco) | Political Capital (first of the day) |
|---|---|---|---|---|
| Named · 15 | Success | 75 (+38 Rested) | 18 / 12 / 6 / 3 | 15 / 10 / 6 / 3 |
| Named · 15 | Partial | 38 | the same (Party XP is the outcome's) | the same |
| Named · 15 | Failure | 15 | the same | the same |
| Named · 10 | Success | 50 | 12 / 8 / 4 / 2 | the same |
| Hand · 5 | — (by the outcome) | 25 / 25 / 13 / 5 | 6 / 4 / 2 / 1 | the same |

Per Energy a role pays the tier-2 XP rate (5) and, on a Success, the tier-2 Party XP rate (0.8); a Triumph lifts Party XP to 1.2 per Energy, the best rate in the game for 15 Energy, which is the co-op premium. A Fiasco still pays a fifth of the XP, a quarter of the Party XP and 3 Political Capital: committed Energy is never spent for nothing (§4.3).

### 20.2 A reference day with events (300 Energy, day 7, home)

| | Slice-5 sheet (§19.3) | One event a day (a 15-Energy role) | Three events a day (45 Energy of roles) |
|---|---|---|---|
| XP / day | ~1,860 | ~1,930 (**+4 %**) | ~2,080 (**+12 %**) |
| Party XP / day | ~218 | ~233 (**+7 %**; a Success at *Fired up* and with the order's +25 % on one) | ~262 (**+20 %**) |
| Political Capital / day | 5 (orders) + 1 (*One of Us*) | **+10** (16) | **+20** (26: 10 + 5 + 5) |
| Opinion attributed / day | +1.45 | +1.45 − 0.07 (15 Energy off solo) + **~0.4** (a Rally's 1.5 × Success ÷ 4) ≈ **+1.8** | ≈ **+2.4** |
| Iron / day | ~1,020 | ~990 (15 Energy off tier-1 Iron) | ~930 |

**Milestones:** Level 10 stays day 5, Level 16 day 12; Rank 3 about **day 8.5** (was 9) with one event a day, **day 8** with three; Rank 4 about day 25 (was 27). **No §5.2 milestone moves by more than a day.** Iron falls a little (Energy moved off tier-1 taps pays no Iron at a rally), which is the right direction (§19.11).

**Events against §5.5's "about 25 % of Party XP from outside missions":** orders ~30 % of the day (unchanged), events 6–17 % on top; the share from outside missions rises to 35–45 % for a member who joins an event a day. Accepted: the GDD's 25 % was written for a solo day, and the events' Party XP is what "come back for the group's events" is paid in. The lever, if rank pacing runs fast at scale, is the outcome multipliers (1.5 → 1.25 on Triumph), never the base.

### 20.3 Opinion: events against solo play, and the branch of one

| Case | Swing | Per member-Energy | Against a canvass (0.005 / E) |
|---|---|---|---|
| A lone member on the branch's canvass drive (10 Energy; Success with three volunteers) | 1.0 × 1 × 0.25 = **+0.25** | 0.025 | ×5 |
| A full Rally, Success (45 Energy, four members) | **+1.5** | 0.033 | ×6.7 |
| A full Rally, Triumph, in a close race on a tagged Issue | 1.5 × 1.5 × 1.25 × 1.5 = **+4.2** | 0.094 | ×19 |
| A full Grand Rally, Triumph, four hands, close race, Issue | 2.0 × 1.5 × 1.25 × 1.25 × 1.5 = **+7.0** | 0.093 (75 Energy) | ×19 |

So a co-op Energy point is worth five to twenty solo ones, and a member who joins three events a day about **doubles their opinion contribution for 15 % of their Energy** (§20.2). That is the intended shape (the group is where opinion is won; Torn's principle, not its system). It is bounded by **three starts a city a day** and **three open sign-ups a member**: a faction's event swing in one district is at most about 5 points a day under ordinary conditions and about 15 at the very best (three Triumphs with every bonus), against a 1 %-of-the-distance drift; rivals have the same tools. Flag (Appendix C #58): if events dominate at low population, lower the base swings; if the board is always full at scale, raise the starts.

**The fixture's floor.** Two fixtures a faction a day (home and the capital) give any faction with one active member about +0.25 a day in each place for 10 Energy, and a branch of four about +1.0 to +1.5. At home that is morale (pinned near the cap anyway, §14.5); in the capital it is the difference between a district that drifts and one that moves. The fixture is where the capital's three-way race gets its daily pulse at low population.

### 20.4 Political Capital

| Source | Before slice 6 | With one event a day | With three |
|---|---|---|---|
| Orders · *One of Us* · seat | 5 + 1 + (10 seated) | the same | the same |
| Events | — | **+10** (a Success) | **+20** (10 + 5 + 5) |
| **A day, unseated** | 6 | **16** | **26** |
| **A month** | ~180 | ~480 | ~780 |

At the GDD's first draft (3–15 per event, no halving) three Successes a day paid 30 and three Triumphs 45: a month of **900–1,350**, past the 1,000 cap, which would make Political Capital meaningless as a price. With the halving a heavy event-goer reaches ~780 a month against sinks that grow with the slices (the Chair candidacy 25, petitions 10, patron favours 15–40, striking a mark 30, a proposal 20). Accepted; flagged (Appendix C #59) with the lever (two events a day, not a lower first rate).

### 20.5 Favours

| Favour | Cost | What it buys | Net to the economy |
|---|---|---|---|
| Bail posted | the prisoner's figure (100–1,600), paid by a mate | the prisoner's remaining minutes (10–60) and the payer +10 Party XP | an Iron sink of the same size as self-paid bail; **nothing moves between accounts**, so no transfer economy and nothing to farm |
| A visit | 3 Energy | +10 Health and 5 minutes for the patient; +10 Party XP for the visitor | 3 Energy for 10 Party XP is **3.3 per Energy**, four times a canvass's 0.6; bounded by once per visitor per stay and three per stay, and by there being a patient. At low population a few a week; harmless at scale since every visit needs a stay |
| A nudge | nothing | a chat line | — |

### 20.6 Session shape (pillar 7)

Joining is two taps; calling three; a result one on the next read; a favour two; chat is optional. The fixture settles at the boundary with the orders; a member's event settles 1–12 hours after it was called, with nobody present; sign-ups spend the Energy at the tap and never hold it; withdrawal is one tap until the hour before. Nothing in slice 6 requires the player at a set time, and the one clock a member reads (a countdown) asks nothing of them.

### 20.7 Flags (GDD Appendix C)

| # | Flag | Risk | Lever |
|---|---|---|---|
| 57 | Hands at Rank 1 | Four alts on every event | Count hands at half Energy in the share |
| 58 | Three starts a city a day | Events dominate at low population, or the board is always full at scale | Base swings down, or starts up to five |
| 59 | Political Capital halves after the first event | The cap still floods | Two events a day |
| 60 | The fixture at the boundary | Members want an evening event | A second fixture at the Chair's hour (slice 7) |
| 89 (was a second #61) | Visits from anywhere | Reads as nothing | +5 from another city, +10 from the same |
| 62 | Volunteers at 0.5 give a lone member a Success | Reads as a participation prize | Volunteers 0.4 |
| — | Events' Party XP lifts the share from outside missions to 35–45 % | Rank pacing fast at scale | Triumph ×1.25 |

## 21. Slice 7: the offices above the council, Parliament and its laws, the national election, Clearwater

Rules: `docs/design/slice-7-nation.md`; GDD §2, §6.5, §13.7, §14.8, §14.11, §15.1, §15.4–§15.10, §16.3, §17.1. Slice 7 adds **no tier-1 or tier-2 rate**. It adds Clearwater (the capital's difficulty and sinks), **four office stipends**, **seven Political Capital sinks**, **thirteen bounded laws** and the Chair's push bonus. **Two GDD numbers were changed:** Clearwater's baseline (20 / 24 / 24 / 32 → 22 / 22 / 22 / 34) and the automatic removal's trigger (35 % of National Control → **25 % of the control share**, the party's National Control ÷ the three parties', settled 4 Oct 2026: raw National Control is 23.5 for everyone at the baselines); the rest are pins. Unrest halves a home city's weight for every party and Neutral (the shares sum to 95), which moves no rate. The 55 % Chancellor line is gone.

### 21.1 The stipends (per boundary held, present or not)

| Office | Political Capital | Party XP | Against the reference day (~240 FXP, 6 PC) |
|---|---|---|---|
| Councillor (slice 3) | 10 | 20 | +8 % FXP |
| Governor or Mayor (on top of the seat) | 20 | 30 | +21 % FXP with the seat; 36 PC a day |
| Chair | 20 | 40 | +17 % FXP; 26 PC a day |
| Deputy | 5 | 30 | +13 % FXP |
| President | 50 | 60 | +25 % FXP; 56 PC a day |

An office is a reward for an election won, not a rate: a Chair's +40 a day over a 28-day term is about 1,100 FXP, a fifth of the way from Rank 4 to Rank 5, which keeps Rank 5 (15,000) at about week 8 for a reference player who holds the Chair for a term; the milestone moves by about four days for a holder and not at all for anyone else. **No §5.2 milestone moves by more than a day for the reference player** (who holds a council seat half the time and nothing above it in season 1).

### 21.2 Political Capital: the budget at the top

| Sink | PC | Who, when |
|---|---|---|
| Stand for Chair (spent; no backers needed since 10 Oct 2026, voting simplified) | 25 | Rank 4, term days 9–10 |
| Stand for the party's list | 25 | Rank 5, term days 19–20 |
| Stand for President | 100 | Rank 6, term days 19–20 |
| Back (Chair, the party's candidate or the list) | 10 | one per Chair election; one per term nationally |
| Put a law to Parliament (a deputy or a Chair) | 50 | once a term |
| Open or sign a petition (the council, or on the Chair) | 10 | — |
| Table a vote to remove the President | 50 | once a term |

A reference player at day 30 has banked about 250 (5 a day from the orders, 1 from *One of Us*, 10 a day for the council seats held, 10–20 a day from events) and has spent 20–40 on standing and backing (the proposal sink went on 10 Oct 2026): the Chair's 25 is affordable the first time Rank 4 allows it. A Chair earns 20 a day and spends at most 85 a term (the deposit, a bill, a backing); a President 50 a day against the same: **office-holders reach the 1,000 cap in a season and the cap is the limit**, which is what §23.3 wants (Political Capital is a price for standing, never a store of power). Flag: if the cap reads as meaningless at the top, the lever is the President's 50 (to 30), never the sinks.

### 21.3 The laws: what each is worth (reference player, per day, while in force)

| Law | Effect | Worth a day | Envelope |
|---|---|---|---|
| People's Education Act | mission XP +15 % | ~+60 XP (+3 % of the day's XP on the model's 100 E of missions) | under the council rules' +5 % (Rally Permits) |
| Eight-Hour Day Act | pay +10 %, seniority ×2 | +22 Iron, plus +108 over ten days for a new job | the Public Works and Long Service Orders together |
| Universal Care Act | *Walk out well* −50 % | 50 Iron per admission; a few a week at most | a sink halved |
| Workers' Charter (factional) | pay +15 % for members | +32 Iron a day for Collective members | the largest pay lever; 36 of 60 |
| Free Market Charter | Iron from actions and missions +10 % | **+100 Iron** (+10 %) for 28 days | under the Street Fund's +25 % |
| Open Borders Act | journeys −25 % | 12 → 9 minutes, 25 → 19 | time only |
| Press Licensing Act | propaganda opinion −25 % | −0.05 a day on the model's ~100 propaganda Energy | the Street Permits' mirror |
| Rehabilitation Act | marks fade in 7 days; bail −25 % | a daily illegal player clears minor marks a week sooner; 25–400 Iron per bail | a sink softened |
| Civic Education Act (factional) | training −20 % for members | ~9 Energy a day for an Alliance trainer | the Reading Room Grant for one party |
| Emergency Permits Act (factional) | missions +2 Energy for non-members | **−10 % mission efficiency** for two parties (a 15-Energy speech costs 17, pays on 15) | the one law that costs a player anything; 36 of 60 |
| Curfew Order | run-ins ×2 at night | the model's 1.5 run-ins a day become ~2.2 for a night player | a risk doubled, not a reward touched |
| Special Powers Act (factional) | Heat cools +50 % for members; caught +10 against them | a Vanguard illegal player's budget rises from nine to about thirteen missions a day; a rival's caught check 8 → 18 % | 36 of 60, seven days |
| Public Assembly Act | speech −2 Energy | +20 % on speech Energy, about +5 % of the day's XP for a speech-heavy build | Rally Permits nationwide |

No law touches Party XP or the odds of a check, so **rank pacing and the §8.4 band are untouched by Parliament**. The largest stack of one kind across a law, a council rule and an Issue is pay +35 % (Eight-Hour Day + Public Works + *The Cannery Wage*) or Iron +50 % (Free Market + Street Fund + *The Casino's Licence*) for a few days at a time in one city: optional acceleration, never a milestone. With no player, the secretaries' lines pass People's Education, Universal Care, Rehabilitation and Public Assembly: a republic that is a little kinder and a little louder, which costs nothing and sets the stage.

### 21.4 The Chair's push and the party's target

The push changes no rate: the order's +25 % match and +20 completion are the rotation's. The party's target pays **+10 FXP to every contributor** when reached (25 / 50 / 100 faction-wide attempts): at low population a target of 25 is one member's ×3 day; at scale a hundred is a branch's morning. Worth at most +10 a day per member (+4 %): a bounded co-op nudge, not an income.

### 21.5 Clearwater

As the capital (§15.3 of this sheet): difficulty 10 (odds a point or two under home until Reputation rebuilds), the same Iron sinks (the move 500, a room 100, tickets 20 for a 25-minute ride), the Clearwater rotation of orders, +13 % Party XP in a close race, Reputation restarted. Three jobs for a player with none (100 / 180 / 200; no party's fifth, by design: the cannery pays everyone the same). Four missions at difficulty 20–22 for Level 10–12. A Clearwater resident's day is the capital resident's within a per cent.

### 21.6 Session shape (pillar 7)

Every national act is one or two taps; the Chair's whole term is five taps once and one tap per bill; a deputy's a tap a few times a week; a President's a tap a week. Every window is two to four full City Days and closes at a boundary; the count, the divisions and the party's target settle without anyone present; an absent holder's duties fall to defaults. Nothing in slice 7 needs the player at a set time.

### 21.7 Flags (GDD Appendix C #64–#73)

| # | Flag | Risk | Lever |
|---|---|---|---|
| 64 | One office at the top | A President with a tiny score reads as too strong | The veto needs a bloc of 20 |
| 65 | Several offices at once | One player holds four at scale | Forfeit the lower seat on taking a higher |
| 66 | The secretaries' bills | The book reads as the game's | Stop them once a player sits |
| 67 | The automatic removal at 25 % of the control share | Never fires | 20 % |
| 68 | A petition dissolves, no snap election | Never succeeds, or a weekly weapon | A fifth, or two days' notice |
| 69 | Standing orders repeat | A stale push | Drop the push after seven days |
| 70 | Clearwater's baseline evened | The lake wants a lean | Issues, never the meter |
| 72 | The list by backers | One name takes every backing | A second backing for the list |
| 73 | The push at Level 10 | Reads as a forced trip | Half the push's Party XP at home |


---

## 22. Slice 8: the Wardrobe, the Dossier, patrons, the flat, Legacy and the season

Rules: `docs/design/slice-8-life.md`; GDD §8.2, §10, §13.6, §14.12, §17.1–§17.4, §18.3, §20.3, §21, §22. Slice 8 adds **one tier-2 type** (the society call, at the tier-2 rate), **one tier-3 story** (the exposé) and the game's first **big Iron sinks**. **Two GDD numbers were changed** and both are here: the season score's election bonus (10 → **100**, Appendix C #81) and the social missions' v3.0 rewards (replaced by the tier-2 rate); everything else is a pin.

### 22.1 Income the sinks are priced against

From §19.3: the reference player earns about **1,000 Iron a day in week 1** (tier 1 with Rested, the job's 216, the first missions), **1,500–2,000 by week 3** (missions at ×2, seniority at +20 %, the capital's rooms and tickets taken off), and **2,500–3,500 in month 2** (the §18.2 band). Dossier sales add 100–300 a day for a player who sells (two entries a day at 50 and a file a week at 200) and nothing for one who exposes.

### 22.2 The Wardrobe's prices against the days

| Item | Price | Needs | Days of income at the time (reference player) | When bought in the model |
|---|---|---|---|---|
| A standard coat | 200 | — | 0.2 | day 1 for a coat-refuser (it is the father's coat's figure) |
| The party's coat (II) | 800 | Level 6 (day 2) | 0.8 | **day 6–7** (after the first week's sinks: the ticket, the room) |
| The party badge · paste and brush | 150 · 300 | members | 0.5 together | day 3–4 |
| A good hat | 400 | Level 6 | 0.4 | day 8 |
| The press pass · the camera | 500 · 1,200 | Level 6 | 1.5 together | **day 10** for a Dossier player |
| Forged papers · wire cutters | 600 · 400 | Rank 3 (day 9) | 1 | day 11 for the illegal road |
| The flat | 2,500 + 150 a week | Level 10 (day 5), a residence | 2 | **day 15** |
| The dress greatcoat · evening dress | 4,500 · 5,000 | Level 16 (day 12–13) | 3 | **day 20–22** (a week's Iron after the flat) |
| The wristwatch | 2,500 | Level 16 | 1.5 | day 25 |
| The correspondent's suit | 5,500 | Level 16, Alliance | 3 | day 22 (instead of the greatcoat) |
| The three-piece suit | 20,000 | Level 31 (week 6) | 7 | **month 2** (two weeks' surplus) |

**Worn Charisma by day** for the model (the mill coat's 2, CHA base 0): day 1 **2** (5 with the father's coat) · day 7 **12** (the party's coat) · day 8 **18** (+ the hat) · day 15 **20** (+ the flat's 2 at home) · day 22 **30** (the greatcoat + the hat + the flat) · day 25 **34** (the watch) · month 2 **50** (the three-piece suit, the watch, the flat). The society calls' doors (10 / 12 / 15 / 20) open in order: the Promenade at day 7, the Opera and the Pier Hotel at day 8, the Grand Hotel and the Casino at day 15; the clamp on a call's check (a 20 against Charisma 34) arrives about day 25, which is §8.4's shape for a stat that is bought rather than trained. **Recognition** (§14.12) turns on at Charisma 20 (day 15) and doubles at 30 (day 22): exactly when the model's player has begun visiting rival ground with an office, which is the trade-off the slice wants.

**The buy-back at a tenth** means a wardrobe is a sink, not a store: 10,000 Iron of coats sells for 1,000. No item pays Iron back; the two +5 % Party XP items are worth about +12 FXP a day each to the model (inside the heavy player's +35 % envelope; the pair together move Rank 4 by about a day).

### 22.3 A reference day with the slice (day 20, home, 300 Energy)

| | Slice-7 sheet (day 20) | With slice 8 |
|---|---|---|
| XP / day | ~1,900 | ~1,920 (+1 %: a society call a day at the tier-2 rate on 15 Energy of tier-1's) |
| FXP / day | ~245 | **~265** (+8 %: the party's coat and the badge on everything; a call pays none) |
| Iron from actions (with Rested) | ~1,050 | ~1,100 + **100–300 Dossier sales** (or 0 and an exposé's 100 once a week) |
| Opinion / day | +2.3 | +2.45 (a call's 0.15), **plus an exposé's −1.0 against a rival in one town about once a week** (three fresh entries at 10 % per intelligence tap is twenty taps, about a week of the model's intelligence Energy; the pass and the camera halve that) |
| Favour / day (both patrons, from the capital) | — | ~5 each for a devoted player; ~3 for the model, who does the Requests and the Monday call: **Associate about day 20, Confidant day 30, Protégé day 42** |
| Rested / day | 360 banked | 385 (the flat's 25 at the boundary); the cap 250 at home |
| Iron out, a week | tickets 60, a room 100, pay-offs ~100 | + **the flat's 150, a gift 200 × 7, a coat every fortnight or so** (about 1,500–2,500 a week of sinks against ~10,000 of income) |

**Milestones:** no §5.2 milestone moves by more than a day (the +8 % FXP is for a member who buys and wears the party's coat; Rank 4 day 27 → 26). **Iron is the number that moves**, by design: the week-1 surplus flagged in §19.11 now has prices, and a player who buys everything at its Level spends about **60 % of income in weeks 2–4** and keeps the rest for bail, pay-offs and gifts.

### 22.4 The Dossier's arithmetic

At 10 % per intelligence Success (the model's eight intelligence taps a day, mostly 3–4 Energy, at ~90 %): **0.7 entries a day**, 1.6 with the press pass and the camera, plus a surveillance mission's one. The names of a home city number 27 (nine a party) and the capital's 45 (nine a district), so entries land on the same name about one time in nine at home: **a Case File by chance is three weeks; a Case File by watching one name** (the surveillance missions' `dossier.subject`, the informer card, a patron's gossip on a chosen town) **is about a week**, which is what the clock card asks for. Capacity (10 at INT 1–10, 15 at 11–20, 25 at 21–35; the model's INT passes 20 on day 3 and 35 about day 12) is never the binding limit for a player who sells or binds; a hoarder fills 25 slots in a month and reads *went begging*, which is the rule working.

**The exposé** at 20 Energy for 150 XP and 100 Iron is the tier-2 rate on its Energy (7.5 XP and 5 Iron per Energy; the story's Partial and Failure halve or void it) plus the swing, −1.0 in one town, worth about **a day of the model's tier-1 opinion against a rival** or three disruptions: a week's Dossier work for a day's swing, once a week, is a prize and not an income. Difficulty 18 / 16 / 14 by the file's weight: the model's INT (34 at day 13) sees 95 % on any of them and the clamp is the design (a file is the hard part; the writing is the reward); a spread build at INT 20 sees 58 / 66 / 74 %, which is why the camera's +10 exists.

### 22.5 Favour's pace (Appendix C #77)

| Player | Request every 2 days (+6) | Gift a day (+2) | A call a day (+2) | A day | Acquaintance (10) | Associate (30) | Confidant (60) | Protégé (90) |
|---|---|---|---|---|---|---|---|---|
| Devoted (lives in the patron's town) | 3 | 2 | 2 | 7 | day 2 | day 5 | day 9 | day 13 |
| The model (visits twice a week, does the Requests) | 3 | 0.6 | 0.6 | ~4 | day 3 | day 8 | day 15 | day 23 |
| Casual (the Requests only) | 3 | 0 | 0 | 3 | day 4 | day 10 | day 20 | day 30 |

From the first visit (Level 10, day 5 for the model, and a ticket), so the model is Associate about **day 13–20** (the §3.6 "first patron at Associate in weeks 3–4" holds for a less devoted player), Confidant in month 1 and Protégé by day 30–45. The gift sink is **200 a day per patron** for the devoted, about a fifth of income: the price of the fastest road.

### 22.6 The flat and the room

The flat's 2,500 is two days' Iron at day 15 and the rent 150 a week is 1 % of weekly income: the flat is affordable to anyone who wants it and its value is Rested (**+25 a night is +175 a week, about 260 XP and 120 Iron of bonus**, so the rent pays for itself in Iron alone), the cap +50 (the capital room's figure without the room), the *Evening* outfit and +2 Charisma at home. The room (+10 a night) is a small reward arriving for everyone. A player who never buys a flat loses nothing but a comfort. **Settled 4 Oct 2026:** rent can be paid at most eight weeks ahead (1,200 Iron parked at most), which changes no sum here.

### 22.7 Legacy

The model's record at day 30: three council terms (9), one District Hero (2), two Issues in the top five (4) = **15**, about one perk. At day 84: six terms (18), a Governor's term (5), three heroes (6), six Issues (12), an exposé or two (4), Champion or an award (5) = **about 50**: three or four perks. The largest perk (+5 % FXP, 15) is worth about +12 FXP a day: a reward for a season, not a rate.

### 22.8 The season score (Appendix C #81)

A party's control share is ~33.3 a day in a level republic, so a season's daily sum is about **2,800 per party**. A four-point lead held for 84 days is +336; at the GDD's 10 per election three wins were +30 (a tenth of the lead), so the Champion was the daily sum alone. At **100 per election** three wins are +300, about the lead's worth: the Champion is the party that held the republic *and* won it, which is what a season's prize should say.

### 22.9 Session shape (pillar 7)

Dressing is one tap; a shop is one tap on a place the player is at; a Case File is one tap and an exposé three; a Request is read in the paper and done by ordinary play; the flat is two taps and the rent one; a perk one; the season asks nothing. Nothing in slice 8 needs the player at a set hour.

### 22.10 Flags (GDD Appendix C #74–#81)

| # | Flag | Risk | Lever |
|---|---|---|---|
| 74 | No weapons as items | Fight unreachable for non-STR builds | The armour values |
| 75 | Recognition +5/+10 (×2 at night), the office +5/10/15 | Office-holders stop visiting rival ground, or nobody changes clothes | Halve the office part; raise the Charisma part |
| 76 | The exposé's −1.0 / −0.5 | Exposés dominate a town at scale | The burn (28 days) or a daily cap per town |
| 77 | Favour's pace | Protégé in a fortnight, or Acquaintance in a week | The gift's +2 |
| 79 | The flat waits | Reads as free | A re-entry fee after a month unpaid |
| 80 | No track, no twist | The clocks are not enough | Build the free track |
| 81 | +100 per election | The Champion is always the party with the most Presidents | 50; or 200 if elections never move it |
| — | Dossier sales as income (100–300 a day) | Iron inflates for a seller who never exposes | Halve the entry price (25 / 12); never the file's |

---

## 23. Slice 9: the balance pass

Rules: `docs/design/slice-9-launch.md` §3; GDD §5.2, §14.2, §27. Slice 9 adds **no rate, no price and no political right**. It adds **one rule** to the economy, the opinion damping factor at scale, and **the method** by which every number in this sheet is checked against play: a model row beside every measured row, a comparison rule, and a lever table with bounds. The run itself happens when the local playtest and the closed beta have figures; its output tables are added below this section then.

### 23.1 The matrix

The §3–§22 model is run as **48 profiles** (casual · reference · regular · heavy × three factions and starts × legal / illegal-from-Rank-3 / rival-ground-specialist roads × home / a capital district from day 5–7 / Clearwater from day 7 × buys-everything / buys-nothing, pruned to the combinations that differ), each for days 1–30, each row the sheet's existing outputs: XP and Level, FXP and Rank, the best stat, Iron in and out, Political Capital in and out, Heat at session ends, marks and the record's level, Favour, Legacy, worn Charisma, opinion moved. The dashboards of the design's §2.3 print the matching profile's model row (by sessions per day: 1–2 casual, 3 reference, 4 regular, 5+ heavy) beside the measured median.

### 23.2 The comparison rule

**Inside ±25 % of the model is in balance; 25–50 % is a flag for the pass; beyond 50 % the lever moves inside its bound before the open beta.** Retention is never a lever's trigger on its own. The levers, their bounds and their triggers are the design's §3.2 table; the pillars (regen, the bar, Rested's +50 %, the §8.4 formula and the 95 clamp) are not levers.

### 23.3 The damping factor (GDD §14.2; Appendix C #13 closed)

Every swing from an action or an event in a city or district is multiplied by **`clamp(20 ÷ active, 0.25, 1)`**, *active* the seven-day mean of distinct daily contributors there. What it does to this sheet: **nothing**, at every population the sheet has modelled. A branch of one to twenty moves the meter as §8, §14.5, §15.3 and §20.3 say. At scale:

| Active contributors a day in one city | Factor | A reference day's +1.15 becomes | A full Rally's +1.5 becomes | The city's raw daily swing (all contributors, reference-shaped) | Damped |
|---|---|---|---|---|---|
| 5 | 1 | +1.15 | +1.5 | ~6 | ~6 |
| 20 | 1 | +1.15 | +1.5 | ~23 | ~23 |
| 50 | 0.4 | +0.46 | +0.6 | ~58 | ~23 |
| 100 | 0.25 (floor) | +0.29 | +0.38 | ~115 | ~29 |
| 500 | 0.25 (floor) | +0.29 | +0.38 | ~575 | ~144 |

The raw column is why the rule exists: at a hundred contributors a district would move a hundred points a day against a drift of 1 % of the distance. Damped, the factions' *net* movement is what matters (three parties pulling against each other and the three-starts-a-day bound on events), and the scale simulation of the design's §3.1 checks that a level three-way city of a hundred moves under ten points a day. The floor keeps a big branch's taps from becoming worthless (a tap is never below a quarter of its home value); if a city of a hundred still runs away, the floor goes to 0.15 before the 20 moves (Appendix C #13). An individual's ledger row records the applied swing, so District Hero and the scoreboard rank by what actually moved.

### 23.4 What the pass watches first (the red flags, by the number most likely to be off)

From the design's §3.4, in the order this sheet's own flags suggest: **Iron held at day 30** (tier-2 Iron at ×2 and Dossier sales are the two inflators this sheet has flagged twice, §19.11 and §22.10; the model's reference figure is about 26,000 held at day 30 with everything bought that is modelled, about 60,000 with nothing bought); **Level 10's median day** (the heavy-player share, Appendix C #14: the model says day 5 for three sessions, day 3 for six); **Rank 2's median day** (day 2 with the welcome edition's FXP); **Political Capital at the cap** (events and stacked stipends, §20.4 and §21.2); **the share of ×3 taps** (the sheet assumes most tier-1 Energy goes in threes); **marks per illegal player-week** (§19.4 says 0.5–2); **the loss rate on *Leave it to luck*** (§19.5: the reference recruit loses about 70 % of auto-resolved fights with an enforcer, which is the figure the design's §9.2 line tests against).

### 23.5 Session shape (pillar 7)

Nothing in slice 9 adds a tap to play or a number to a screen; the damping shows on the modal as the applied swing it already prints. The audit, the links and the caps are server rules; Settings is one tap per line and remembered.

### 23.6 Flags (GDD Appendix C #82–#88)

| # | Flag | Risk | Lever |
|---|---|---|---|
| 13 | The damping's 20 and 0.25 | A city of a hundred still runs away; or a big branch's taps feel worthless | The floor to 0.15 first; the 20 never below 10 |
| 82 | Linked ballots count once, silently | The link rule too eager (over 5 % set aside) | L2's interleaving count 3 → 5 |
| 84 | Two a device, three a network a day | An office or a school refused | The network cap 3 → 5; never the device cap |
| 86 | A suspension touches nothing owned | Reads as too soft for vote-buying | Closure on the first evasion; never assets |
| 87 | Classic retention on small cohorts | ±15 points on a cohort of forty | Read rolling for the trend, classic for the gate |
| 88 | The closed beta's D7 gate at 30 | Under §27's 38 | The user may hold 38 for both gates |

### 23.7 The model rows (`data/model.ts`; settled 4 Oct 2026, `slice-9-launch.md` §17.1 #22)

The dashboards' *modelled* row per profile bucket (sessions per day: 1–2 casual, 3 reference, 4 regular, 5+ heavy), transcribed from §5.1, §6 and §7 of this sheet (the tier-1 model with slice 2's day-1 one-offs; no sinks on the Iron line). The 48-run matrix (§23.1) replaces these rows when it runs; until then they are the reference the first local playtest is read against.

| Day | Casual XP (Level) · FXP (Rank) · Iron held | Reference | Regular | Heavy |
|---|---|---|---|---|
| 1 | 840 (3) · 150 · ~470 | 1,440 (4) · ~270 · ~985 | 1,840 (5) · 240 · ~880 | 2,840 (6) · 330 · ~1,290 |
| 2 | 1,970 (5) · 310 · ~1,220 | 3,040 (6) · ~475 (2) · ~1,970 | 4,080 (7) · 500 (2) · ~2,070 | 5,600 (8) · 700 (2) · ~2,670 |
| 3 | 3,140 (6) · 470 (2) · ~1,970 | 4,830 (8) · 600 · ~2,950 | 6,370 (9) · 770 · ~3,260 | 8,350 (10) · 1,070 · ~4,050 |
| 5 | 5,560 (8) · 800 · ~3,470 | 8,400 (10) · 1,020 · ~4,910 | 10,950 (12) · 1,300 · ~5,640 | 13,830 (13) · 1,810 · ~6,810 |
| 7 | 7,960 (10) · 1,120 · ~4,970 | 11,940 (12) · 1,430 · ~6,870 | 15,490 (14) · 1,830 · ~8,020 | 19,280 (15) · 2,540 (3) · ~9,570 |
| 10 | 11,540 (12) · 1,610 · ~7,220 | 17,210 (14) · 2,030 (3) · ~9,810 | 22,270 (16) · 2,610 (3) · ~11,590 | 27,400 (18) · 3,620 · ~13,710 |
| 14 | 16,270 (14) · 2,240 (3) · ~10,220 | 24,140 (17) · 2,820 · ~13,730 | 31,230 (19) · 3,640 · ~16,350 | 38,130 (21) · 5,030 · ~19,230 |
| 21 | 24,430 (17) · 3,330 · ~15,470 | 36,030 (20) · 4,170 · ~20,590 | 46,660 (23) · 5,390 · ~24,680 | 56,630 (24) · 7,440 (4) · ~28,890 |
| 30 | 34,680 (20) · 4,690 · ~22,220 | 50,850 (23) · 5,810 · ~29,410 | 66,080 (26) · 7,550 (4) · ~35,390 | 79,890 (28) · 10,410 · ~41,310 |

Milestone days the Pacing dashboard prints beside the measured medians: **Level 6 / 10 / 16** casual 3 / 7 / 18 · reference 2 / 5 / 12 · regular 2 / 4 / 10 · heavy 1 / 3 / 8; **Rank 2 / 3 / 4** casual 3 / 14 / after 30 · reference 2 / 10 / ~27 (with slices 5–6's FXP, §19.3, §20.2) · regular 2 / 8 / ~22 · heavy 2 / 7 / ~21. Iron held is day 1's figure plus the steady daily income of §5.1 (casual 750, reference 980, regular 1,190, heavy 1,380) with nothing bought; the Economy dashboard's red flag (§23.4) compares the measured median with this row ×3 and ×0.5. Opinion moved a day: casual ~0.8, reference 1.15, regular 1.6, heavy 2.5 (§8).

## 24. Review 4: the prologue, the cells' new costs, the Town Hall and lodgings

Rules: GDD §0 (*Added 6 Oct 2026, review 4*), §7.1, §8.5, §11.2, §13.7, §14.11, §15.3, §19.2; answers in `docs/design/review-4-answers.md`. **No rate, cost, threshold or reward table changes.** Four things touch numbers: the new recruit's stats, the favour that replaces the committee session, the cells' three costs, and the lodgings card's move. Nothing else here moves a figure.

### 24.1 The reference recruit after *The Last Train In*

| | Until review 4 | Now | What moves |
|---|---|---|---|
| Stats | STR 10 / INT 12 / AGI 5 / CHA 2 | **STR 8 / INT 12 / AGI 5 / CHA 5** | INT and every Intelligence figure in this sheet: nothing. STR −2: the second stat's home check 58 → 50 % (the STR actions, two or three of fifteen at home; home tier-1 difficulty 8, §8.4); the Fight power 17 → 15 (§19.5: 29 → 25 % against the enforcer; the recruit pays or takes luck either way). CHA +3: Talk 30 → 42 % against the enforcer, 14 → 22 % against the constable |
| Iron at start | 150 (coat refused) | 0 | The reference day's income is ~1,000; 150 is a seventh of day 1 and nothing after. Level 2 lands on the same tap |
| Party XP at start | 50 (the wish) | 0, and the favour pays 15 / 8 on Success / Partial at 1.5× council rate on 10 Energy (the committee session's own figures) | Rank 2 (400) moves from early day 2 to later on day 2 for the reference player: the day-1 FXP of §13.3 was ~190 with the seed and the committee; it is ~155 now, and day 2's ~205 crosses 400 either way. **The first ballot is still by day 4** (§14.1) |
| Taps to the first result | 11 | **8** | §11's session shape improves |

The tuning characters for Duskwall and Ashford move the same way (STR 14 / INT 6 / AGI 5 and STR 6 / INT 14 / AGI 5): the Vanguard's best-stat day-1 check rises from 62 to 74 % (STR 11 → 14 under the STR actions, at the home difficulty 8), the Alliance's is unchanged (INT 14). **The flattest build** is now *light* in any party (AGI 11): 62 % everywhere on the AGI actions and 50–54 % elsewhere on day 1 with the +10 % First day bonus on top; the first level-up point lands inside the first bar as before. §13.1's table is superseded by this one; §13.2–13.3's day-1 totals hold within 10 % (the committee session's Energy and rewards are the favour's).

*Corrected 7 Oct 2026 (review-4 QA fix round, n6): the chances in this section were first worked at difficulty 10. A home tier-1 check, the favour included, is at 8 (GDD §8.4), as the build has it; the figures above are at 8. Nothing else moves: the 60–85 % band for a best-stat day-1 check holds (the Vanguard's 74 % plus the First day's 10 is 84 %).*

### 24.2 The Town Hall's ticket

*Sit in the public gallery*: tier-1 intelligence at 6 Energy and the city's tier-1 difficulty (8 at home, 10 in Irongate; GDD §8.4) (14 / 7 XP, 12 / 6 Iron at the tier-1 rates with the intelligence Iron factor; no Party XP, no opinion), one per city. It is one more intelligence ticket in a city that has two or three; the model's intelligence share (about 15 % of Energy) is unchanged, so nothing in §4 moves. A wins-counting tap for Reputation like any other.

### 24.3 The cells: what the three costs are worth

For the day-10 reference player on the illegal road (§19.3–19.5; about one arrest a week while *Hot*):

| Cost | Worth | Note |
|---|---|---|
| The sentence's base 10 → 20 min | 5 Energy of regen, ~25 XP and ~10 Iron | Still a wait most players close the app for; §19.7's "bail is two to six times the time's value" becomes one and a half to four times, so a few more pay |
| The day's orders off | 0–60 Party XP and 0–5 Political Capital, by the hour of the arrest; **~30 Party XP and ~2 PC on average** | About a sixth of a day's Party XP, once a week: **2–3 % of the week's Party XP**. Rank 3 (day 9) and Rank 4 (day 27) move by less than half a day |
| An arrest is at least one mark | On legal work (a watch's police run-in lost): −10 % mission Iron for a fortnight, **~40 Iron a day**, where there was nothing | On illegal work the type's marks already applied; nothing changes there |
| Bail with the arrest's own mark | A watch's or a tap's police loss: **100 → 150 Iron** (50 → 80 with Legal Aid, 200 → 300 on rival ground); a second arrest within seven days is three serious marks on any work | The marks are counted after the arrest, as before (`bailFor`; `review4.cells.test.ts`, `slice5.street.test.ts`) |

**Verdict:** the cells now cost about **a hundred Iron, thirty Party XP and twenty minutes** per visit for the player who waits, and the record remembers it; nothing owned is taken, no rate is lowered for good. §19.7's sentence "the model waits and closes the app" stands; §19.11's #50 lever is reworded in the GDD (the base back to 10 before anything else). No §5.2 milestone moves.

### 24.4 Lodgings

The paid room is a *Lodgings* card at Tram Junction (the Rows in Clearwater): 100 Iron, seven nights, cap +50, renewable, half price under the two rents Issues. The sink is unchanged in size and timing (§15.1); only its place and words change. The free room's +10 and the flat (§22.6) are untouched; the cap takes the larger of a flat and lodgings.

### 24.5 Session shape (pillar 7)

The prologue is three taps shorter. The Town Hall is one pin; its sheet reads top to bottom with the ticket first. The journey on the map is the same wait with a better picture; the card fires once, at a point the player cannot predict, and is answered on return if missed. The clock and the countdown style are read, not tapped. The local edition changes which lines a paper prints, not how many. Nothing here needs the player at a set time.


## 25. Review 5: the job ladder, treatment, the Unrest prize and the night

Rules: GDD §0 (*Added 8 Oct 2026, review 5*), §9.2, §19.1, §14.11, §14.12, §13.1, §2.2; answers in `docs/design/review-5-answers.md`. **One pay figure moves (the Driver, 200 → 240) and one optional sink arrives (treatment).** The three proposals that wait on the user (the game day, the night, the Unrest prize) are costed below so that nothing is retuned twice. No §5.2 milestone moves.

### 25.1 The job ladder (GDD §9.2)

The rule: each rung pays at least a tenth over the best pay of the rung below, the member's fifth counted (216 × 1.1 = 238 → **240**; then 320, 500, 900, 1,500).

| Who | Job on day 10 | Wage a day (seniority +20 %) | Change |
|---|---|---|---|
| Reference recruit (Intelligence; keeps the factory job) | Factory worker, member | 216 × 1.2 = **259** | none; every figure in §5.1 stands |
| An Agility build (*light*, AGI 11; Level 3 inside the first bar) | Driver from day 1 | 240 × 1.2 = **288** | +29 a day over the member's job, +3 % on the day's Iron; the build's visible perk |
| A member who switches on day 6 (AGI 10 by level points) | Driver, seniority from 0 | day 6: 245 · day 10: 259 · day 16: 288 | overtakes the old job's seniority on the **fourth** day after the switch; +24 a day at the top |
| A capital resident with no job | Porter | 180 × 1.2 = 216 | none |

Training Agility to 10 for the Driver (30 + 32 + 34 + 36 + 38 = **170 Energy**) forgoes about 340 Iron of actions and pays back in about three weeks of +24: not worth it for the Iron alone, which is right (the Driver is a step a build takes on the way, not a target to train for). The Level-6 rung (320) is unplaced until the Wardrobe (slice 8) supplies the Charisma; when it lands, a Level-6 guard pays +80 over a member's day-1 job and +32 over the Driver, the same tenth-plus step.

### 25.2 Treatment (GDD §19.1)

One Iron a point, at least 10. The day-10 reference player on the illegal road loses Health about 1.5 times a day (§19.5) and comes out of a won fight 10–25 points down; a top-up is **10–25 Iron**, bought maybe twice a day by the impatient: **~40 Iron a day at most**, against ~1,000 of income and §19.7's ~50–100 of pay-offs, bail and the ward. A player who never fights never sees the card's button. The ward's *Walk out well* (100 for the stay's remaining Health plus the twenty minutes) is the same rate plus the time, so the two prices agree.

### 25.3 The Unrest prize (decided by the user 8 Oct 2026; GDD §14.11)

+50 Party XP once per entry per city, at most once in seven days per city, to members with ≥ 0.5 points moved there in seven days. **The cap is per city** (settled with the architect, 8 Oct 2026): a member has two rival home cities, so the most the prize can pay is **+100 a week**, and only when both towns enter Unrest in the same seven days, which takes about ten rival-ground days of two parties' Energy. A rival-ground specialist (§19.6: ~320 Party XP a day) earns at most +100 a week from it, in practice +50: **+2–4 % of the week**, inside the heavy player's +35 % envelope. The push bar and the goal line change no rate. A town goes from 70 to 60 in five days with both rivals at the cap (Appendix C #52), so the prize pays at most once a week per town and only when two parties' members have spent about ten days of rival-ground Energy between them.

### 25.4 The night (decided by the user 8 Oct 2026, the patrol made random; GDD §2.2, §13.1, §14.12)

**Night missions** at +25 % Iron: four at 10–15 Energy (52 in all: surveillance 12, theft 15, vandalism 10, speech 15; answers §18.2a), at most one of each a session, about **+60–70 Iron a day** of night rate for a player who plays every night window; the bonus carries no Party XP, and the types' own Party XP (about 32 a day from the three that give it) is inside the day's noise, so Rank pacing is untouched. **Patrols:** a thirty-tap rival-ground day spent wholly at night sees **7.5 run-ins instead of 4.5** (25 % against 15), about +180 Iron of pay-offs or one infirmary stay more. **The random stop** (12 % per ten-minute bucket on a city read, +5 / +10 by Heat state, +10 *Watched*, at most two a night per city): a Cool visitor reading through a whole two-hour night meets about **1.4 stops**, a five-minute look-in one roll at 12 %, a *Hot* and *Watched* visitor about two; a stop costs at most +10 Heat and *Watched* (worth about +10 points on the next act's run-in), so the full night's expected extra cost is **one more run-in's worth, ~60 Iron**; the +50 % Party XP is unchanged, so the night pays the same and costs more. A mixed day (a third of taps at night under option B) is +1 run-in. **The six-hour day** changes no rate: every daily figure in this sheet is per real City Day.

### 25.5 Session shape (pillar 7)

*What's here* is one tap to a list that was four pins. The treatment card is one optional tap. The picker is the same tap on a friendlier card; in a modal it is one more tap (*Place it*) in exchange for a result that never scrolls. The journey card already needed a tap; now it cannot be lost by one. The rival header and the clock's dusk line are read, not tapped. The night stop is one tap, once a night, only when the player is there. Nothing here needs the player at a set time; night content is an opportunity that comes round four times a day under option B and is never on the ladder.
