# Irongate City — Game Design Document v3.1

*A political, text-driven browser RPG*

| | |
|---|---|
| **Version** | 3.1 (draft) |
| **Supersedes** | v3.0 (`Irongate_City_GDD_v3.docx`, 13 Mar 2026) |
| **Last updated** | 29 Sep 2026 |
| **Status** | For internal development use |

---

## 0. What changed in 3.1

v3.0 described many systems but never the experience of playing them. v3.1 designs the session and the reasons to return, fixes the parts of the rules that punished players, and opens politics to every player instead of one per month.

| Problem in v3.0 | Change in 3.1 | Section |
|---|---|---|
| No session design: nothing said what a player does on login | Session Loop, the **Morning Paper**, and agendas | §3 |
| Most return hooks were punishments (hunger, fatigue, losing your job after 6 h away, bodyguards dismissed at midnight) | Rule: **absence costs opportunity, never assets.** Hunger and fatigue removed; replaced by **Well-Fed** and **Rested** bonuses. Jobs pay a salary; bodyguards are prepaid contracts | §4, §6, §9, §12 |
| Politics reached one player per month; nothing happened if no faction hit 55 % | A **political calendar**: city councils every 5 days, a Legislature that always sits, a Chancellor when there's no majority, and ministers. About 110 offices | §15 |
| A player's contribution was invisible | **Influence Ledger**, **City Hero** titles by level bracket, and your name in the Morning Paper | §14.5 |
| Dominant factions could steamroll | Controlling a city grants *access*, never reward multipliers. **Battleground** and **Groundswell** bonuses go to contested cities and to the side that just lost | §14.4 |
| FXP lagged far behind XP, and the pacing was never written down | FXP rates set per tier and explicit pacing targets. (A first draft moved candidacy to Rank 5 in week 4; the office ladder below replaces that.) | §5 |
| Missions paid less Iron than upkeep cost | No mandatory upkeep. Iron sinks are optional acceleration. Iron rates set per tier | §18 |
| Time units didn't add up (a 2-hour "in-game day"; four one-month seasons making a "3-month year") | **One City Day = one real day.** A 12-week **Political Season** is one in-game year, made of four 3-week weather seasons | §2 |
| The faction's +10 starting bonus made the origin story's +3 choices meaningless | Faction starting bonus cut to **+3** | §7 |
| No social layer until v1.1; Torn's experience says solo players quit | Faction chat, location presence, **Campaign Events** with roles, and **Party Directives** move into MVP | §16 |
| War vocabulary ("fronts", "uprisings") crept into the design | This is a political contest. The core verbs are campaign verbs: canvass, rally, speak, endorse, expose, strike, march | throughout |

**Added 28 Sep 2026:**

| Problem | Change | Section |
|---|---|---|
| The capital, worth 30 % of the nation, was a single opinion meter | Irongate is split into **five districts**, each with its own opinion, control and council seats | §14.9 |
| Travel was instant and cost Energy, so distance meant nothing | Cities are farther apart. **Travel takes real time** by train or car, costs a ticket instead of Energy, and has **journey events** along the way | §14.10 |
| Every mission risked becoming a multi-step scene, and needed art | **Three tiers**: one-tap actions (~80 %), one-choice missions (~15 %), multi-step stories (~5 %). **Local Standing** rewards repetition. Art comes from a reusable fallback ladder, never per mission | §13 |
| Every kind of play was unlocked by day 3, so the game felt finished in a week | Unlocks and power are spread over months: an **office ladder** where you must serve in the rung below before standing for the next; slower pacing; long collections (standing in 5 cities, patrons, homes) | §3.6, §5, §15.1, §17.4 |
| The odds shown on buttons had no defined maths, and combat had no numbers | **One check formula** for everything (50 % + 4 % × (stat − difficulty) + bonuses), stat growth targets, and combat as one choice with power, AGI, Wits and bribe values per enemy | §8.4, §8.5, §20 |
| All five cities were fought over in the same way, so the conflict was spread thin | **Home cities and battlegrounds**: each faction starts in, and permanently holds, its home city. Irongate and Clearwater are where power is won (70 % of the national weight). Enemy home cities are dangerous ground for spies | §7.4, §14.1, §14.8, §14.11, §14.12 |

**Added 29 Sep 2026 (slice-0 answers):**

| Problem | Change | Section |
|---|---|---|
| Level brackets existed but no per-level thresholds, so level-ups couldn't be built | A **per-level XP table** (levels 1–51, then a formula) inside the existing brackets | §5.3 |
| Half rewards, roll boundaries and part-Rested actions were left to interpretation | **Rounding** (nearest whole, halves up, per line) · a roll **at or below** the shown chance succeeds · Rested applies **per Energy point**, so a 3-Rested, 10-Energy action gets +15 % | §5.5, §6.3, §8.4 |
| Political actions "moved opinion" with no number and no source | **Opinion swing** per tier (tier 1: 0.005 points per Energy, so a 10-Energy canvass is +0.05), drawn from the Neutral pool first; floors and precision; city **baselines** | §14.2, §14.11 |
| No canonical new character for tuning | The **reference recruit** (Collective, STR 10 / INT 12 / AGI 5 / CHA 2) and a 10-Energy canvass as the reference action | §8.5, §13.3 |
| The art fallback ladder had no fixed list of place kinds | **Location kinds** (a closed list) as the art key | §13.5 |

**Added 29 Sep 2026 (slice-1 design):**

| Problem | Change | Section |
|---|---|---|
| The day boundary, the "Today" tally and day/night were undefined | **00:00 UTC** is the City Day for the MVP; a **Today tally** resets there; the map's night art shows 20:00–06:00 UTC and is cosmetic | §2, §2.2, §3.7 |
| Rank 2 (500 FXP) could not be reached by day 2 at the §5.5 rates | **Rank 2 lowered to 400 FXP** | §5.4 |
| Training, job shifts, ×3, Standing thresholds and Directive rewards had no exact rules | Training always succeeds and pays half-rate XP · shifts are not checks · streak and sick-day formulas · three jobs' pay pinned · ×3 rules · Standing at 10/30/70/150 · Directives +25 % FXP, +20 FXP per order, +5 PC for all three, refreshed at 00:00 UTC | §8.5, §9, §13.1, §13.3, §13.4, §13.7, §15.4 |
| No NPC party secretary or Morning Paper v1 spec | **Petra Holm** sets the Collective's Directives until a Chair exists; per-city mastheads (*The Coalport Clarion*) | §13.7, §3.3 |
| The economy was never written down | `docs/economy.md`, checked against §5.2 | §5.2 |

**Added 29 Sep 2026 (answers to the slice-1 tech design, `docs/design/slice-1-content.md` §12):**

| Problem | Change | Section |
|---|---|---|
| Half pay accrued without limit, so a season away paid a jackpot | A return credits **at most 14 half-pays**; the job is kept and pay resumes at the next boundary | §4.2, §9.1 |
| The Collective's Rank 5 title was "Vanguard", the rival faction's name | Rank 5 Collective title is **Delegate** (no faction renamed) | §5.4 |
| Batch text, sick days at streak 0, Rested on shifts, the +25 % after completion and the dateline were unspecified | Batch narrative by **majority**; sick days spent only while a streak runs; Rested untouched by shifts and switches; the +25 % only on open orders; *Take a job* completes on taking; dateline `{Weekday} · {D Month} · {City}`, no year | §3.3, §6.3, §9.1, §13.1, §13.7, §15.4 |

**New in 3.1:** Issues of the Week, Heat, Political Capital, Patronage, Legacy, Ambitions, Political Seasons, Jail, Home City, NPC fill, Capital Districts, Journeys, Mission tiers, Local Standing, the Office Ladder, Home cities and battlegrounds, Hostile ground, Homes.

---

## 1. Vision

### 1.1 Pitch

Irongate City is a persistent browser RPG about **winning power, not fights**. Three political movements compete for five cities through canvassing, rallies, propaganda, espionage and elections. Players who win office pass laws that **change the rules of the game for everyone**. Each player also has a personal story running through the public one. It begins at their father's deathbed and ends, if they're good enough, in the Legislative Chamber.

### 1.2 Design pillars

1. **Power, not strength.** Progress means being known, trusted, feared and elected. Stats matter, but reputation, office and influence are the real ladder.
2. **Politics changes the rules.** Ordinances and laws change real numbers, always within bounds set by the designers.
3. **The city has a mood.** Issues, weather, laws and headlines make every day play differently.
4. **Every player matters.** There are many offices, contribution is visible, and recognition is split by level bracket.
5. **Come back *for* something, never *because of* something.** Being away costs opportunity, never assets.
6. **A personal story inside a public one:** Origin, then Ambition, then Legacy.
7. **Built for short sessions.** This is a browser game played for a few minutes, several times a day. Every system follows these rules:
   - **One tap or one choice** by default. Flows with several steps are rare, at most 3 steps, and can be resumed after closing the tab.
   - **Never require being online at a set time.** Anything scheduled (Campaign Events, elections, journeys) resolves without the player, and the result waits in the Morning Paper.
   - **Short text.** Narrative is 2–3 lines; numbers are always visible.
   - **One result, one modal.** No long screens to scroll through.

### 1.3 What makes Irongate different

We share genre conventions with other persistent browser RPGs: an energy bar, jobs, a hospital, factions. Wherever a mechanic resembles another game's signature system, **we express it through politics rather than copy it.**

| Genre convention | Irongate's version |
|---|---|
| Get stronger, fight more | Get *known*: influence, office and legacy are the ladder |
| A second regenerating bar for crime | **Heat**, which works the other way: it rises with illegal actions and cools over time |
| NPC mission-givers | **Party Directives** set by your *elected* Faction Chair |
| Group crimes | **Campaign Events**: rallies, strikes and marches with roles |
| Achievements and merits | **Legacy**: your public political record |
| Long courses on real-time timers | **Patronage**: relationships with powerful NPCs that grow over real days |
| Territory wars | **Issues of the Week** and elections, fought for public opinion |

### 1.4 Fact sheet

| | |
|---|---|
| **Genre** | Text-based political browser RPG |
| **Platform** | Web browser, mobile-first responsive |
| **Audience** | 18–40; fans of incremental RPGs, political strategy, noir and crime drama, social simulation |
| **MVP scope** | 3 factions, 1 region (5 cities: 3 home cities and 2 battlegrounds), full political calendar, NPC-only combat, no PvP |
| **Session shape** | 3–5 sessions a day of 5–10 minutes each, plus optional longer evening sessions |
| **Monetisation** | Free-to-play; capped Energy Packs; Premium subscription ($9.99/mo); cosmetic season track |
| **Multiplayer** | Shared world from launch (elections, influence, co-op Campaign Events); PvP in v1.5 or later |

---

## 2. Time model

Every system uses the same clock.

| Unit | Length | What happens |
|---|---|---|
| **Tick** | 10 min | Energy regen, HP regen, Heat cooling |
| **City Day** | 1 real day, 00:00–24:00 server time (UTC) | Daily resets: weather, salary, Directives, shift availability, bar limits. **One city holds a council election every day.** |
| **Week** | 7 City Days, from Monday 00:00 | Issues of the Week rotate; patron Requests refresh |
| **Council Cycle** | 5 City Days | Every city elects its council once per cycle, staggered |
| **Term** | 28 City Days | National election, head of government, Legislature |
| **Political Season** | 84 City Days (12 weeks) = **one in-game year** | 3 national elections; the third is the **Season Election** |
| **Weather season** | 21 City Days | Spring (weeks 1–3), Summer (4–6), Autumn (7–9), Winter (10–12) |

### 2.1 A season at a glance

| Week | Weather | Politics |
|---|---|---|
| 1–3 | Spring | Term 1. The new government from last season's Season Election governs. |
| 4 | Summer | **National election, day 28** |
| 5–8 | Summer / Autumn | Term 2. **National election, day 56** |
| 9–11 | Autumn / Winter | Term 3, a campaign run under winter conditions |
| 12 | Winter | **Season Election, day 84**, then season awards and rollover (§22) |

Council elections, Issues, Directives and Campaign Events run continuously underneath.

### 2.2 Day and night (new)

- **The City Day boundary is 00:00 UTC for the MVP** (Appendix C #1, closed). Every daily rule (salary, shifts, sick days, Directives, the Today tally, the Morning Paper's "new day") is stated per boundary crossed, so it can be settled lazily on the next read; only true events need a scheduled job.
- **Night is 20:00–06:00 UTC**, the same for everyone. City maps show their night art then. In slice 1 it is **purely cosmetic**: no odds, costs, rewards or availability change. Later rules that mention night (the Curfew ordinance, the night train, CHA 30+ at night in rival cities) use this window, so the map always agrees with the rules.

---

## 3. The Session Loop

### 3.1 The core loop

```
 READ THE CITY ──► CHOOSE AN AGENDA ──► SPEND ENERGY ──► SEE YOUR IMPACT ──► LEAVE SOMETHING PENDING
  (Morning Paper)   (Directive, Issue,    (missions, events,   (ledger, headlines,   (event sign-up, vote,
                     Ambition, job, patron) canvassing, intel)   PC, FXP, favour)      patron request, course)
        ▲                                                                                   │
        └──────────────────── Energy refills (3h20) · the city changes ◄────────────────────┘
```

Over the long run, sessions add up to **influence**, which shifts **cities**. Cities swing **elections**, and elections put players in **office**. Office lets them write the **laws** that change what every session looks like.

### 3.2 A typical session (5–10 minutes)

1. **Open the Morning Paper** (about 30 s). See what changed since last time, today's Issues, which city votes today, and your desk: salary, Rested, Heat, letters.
2. **Take care of the quick things** (about 30 s). Collect anything waiting, vote if your city votes today, read a patron's letter. **None of this is mandatory upkeep.**
3. **Pick an agenda** (about 10 s). The paper suggests three: *"Party Directive: canvass Clearwater (0/3)"*, *"Issue: the bread lines in Coalport"*, *"Ambition: Chapter 4 is ready"*.
4. **Spend Energy** (1–5 min). Mostly one-tap actions at a location, repeated ×3 or ×5, with results inline. Maybe one tier-2 mission with a real choice. Sign up for an event role.
5. **See the result** (about 15 s). The ledger shows *"You moved Clearwater +0.8 % for the Red Collective today."* You earned FXP and Political Capital, and your Directive progress went up.
6. **Leave something pending.** A rally you signed up for starts at 19:00. The Ashford council vote closes tonight. A patron will reply tomorrow. Chapter 5 unlocks in 3 days.

### 3.3 The Morning Paper

The first screen after the City Day changes, and after any absence of 3 hours or more. It can be dismissed with one tap and reopened any time.

| Section | Contents |
|---|---|
| **Headline** | The biggest political event since your last visit: a law passed, a city changing hands, a scandal |
| **The Issues** | Each city's two Issues of the Week and which faction is leading on each |
| **Polling Day** | Which city votes today, and your ballot if it's your Home City |
| **Your Desk** | Salary paid, Rested banked, Heat level, Dossier entries going stale, work streak |
| **Party Orders** | Today's Directives from your Faction Chair |
| **Letters** | Patron replies and Requests, Ambition chapters ready |
| **In Print** | **Your name in the paper** when you top a ledger, become City Hero, win a seat or get caught |
| **Weather** | Today's weather in each city and its effect on missions |
| **While You Were Away** | Shown after 2+ days away: a digest of elections, laws and city changes |

**Mastheads.** Each home city has its own paper: *The Coalport Clarion* ("The voice of the mill and the quays"), and, provisionally, the *Ashford Gazette* and the *Duskwall Sentinel*. Battleground residents read the national *Irongate Herald* (Clearwater: the *Clearwater Courier*, provisional). The masthead is content.

**Dateline:** `{Weekday} · {D Month} · {City}` from the real UTC date, British form: *Tuesday · 29 September · Coalport*. **No year is printed anywhere in the paper.** The game is 1946 but the calendar is real (§2: one City Day = one real day, and the weekday drives the Monday sick-day refill), so the weekday must be the true one and a year would either break the fiction or contradict the weekday.

**Slice 1 (v1) scope:** headlines (2–3, at most two personal), **Party orders**, and **Your desk** with salary, Rested banked, Energy and when it is full, work streak and sick days, Level and XP to next, Local Standing, and *Yesterday* (the Today tally of the previous City Day, §3.7). Headline templates, their conditions and priorities are in `docs/design/slice-1-content.md` §7.

### 3.4 Agendas: what to spend Energy on

| Agenda | Source | Why it matters |
|---|---|---|
| **Party Directive** | Your elected Faction Chair (§15.4) | +25 % FXP on matching actions and a daily completion bonus |
| **Issue** | Issues of the Week (§14.6) | +50 % influence in that city; resolving the Issue gives your faction credit |
| **Ambition** | Your personal storyline (§17.1) | Unique rewards, patron introductions, Legacy |
| **Job shift** | Your job (§9) | Full day's pay plus streak bonus |
| **Patron Request** | Your patrons (§17.2) | Favour, which unlocks perks and endorsements |
| **Campaign Event** | Scheduled by faction members (§16.3) | Co-op influence swing, PC, a headline |
| **Election** | The calendar (§15) | Vote, campaign, stand for office |

### 3.5 Session archetypes

| Archetype | Length | Typical content |
|---|---|---|
| **Quick check** | 1–2 min | Paper, vote, collect, sign up for an evening event |
| **Regular** | 5–10 min, 3–4 a day | Spend a full Energy bar on an agenda |
| **Chained** (optional) | Several regular sessions back to back | A player who wants to play longer simply keeps going: Dossier work, an Ambition chapter, campaigning. Nothing requires it |
| **Polling day** | Varies | Candidates and faction mates push for votes in the city that's voting |

### 3.6 The first week, month and season (new)

The first days give a **taste** of everything: one-tap play, a vote, a group event, your name in the paper. **Power comes later**: it is climbed rung by rung (§15.1), contested, and never permanent. Each stage opens a new *kind* of play, not just bigger numbers.

| When | Where the player lives | What opens up |
|---|---|---|
| **Days 1–3: home** | Your faction's **home city** (a Collective recruit starts in Coalport, §14.11). Safe ground: no encounters, the police are on your side | The origin story and Ambition chapter 1 · the welcome edition of the Morning Paper and first Party Orders · one-tap actions, the first job and outfit · the first tier-2 mission · the first Campaign Event with faction mates · **the first vote** (day 2, Rank 2) in the home council race · your name in the paper |
| **Days 4–14: the district** | Home, with first trips out | **Level 10 opens the train** (about day 5) · the first visit to a battleground and the first journey event · **Rank 3** (about day 10): stand for your home council if you're *Known* locally and 2 faction members endorse you · illegal missions and Heat · safehouses |
| **Weeks 3–4: the move** | The big decision: **move to a battleground** (an Irongate district or Clearwater) to vote and stand where power is decided, or stay home and rise in the party | The first patron at Associate · the first Case File · a first council seat for the committed |
| **Months 2–3: the city** | Home or a battleground | **Governor or Mayor** after a council term · **Faction Chair** at Rank 4 · spy trips into enemy home cities (§14.12) · exposés · running your own events · a better home (§17.4) |
| **End of season 1: the nation** | | **Rank 5**: Legislature deputy (after being Governor or serving 3 council terms) and ministries · the Season Election, where only the most dedicated stand for head of government |
| **Season 2 and after: the republic** | | **President or Chancellor** · Speaker · Legacy perks · Tier V regalia · Protégé patrons · the second Ambition · the Hall of Fame · and every office has to be won again each term |

### 3.7 The "Today" tally (new)

A one-line running total of the current City Day (from 00:00 UTC, §2.2), on the city screen and as *Yesterday* in the Morning Paper: **Energy spent · attempts · Successes · XP · FXP · Iron earned (actions and pay) · opinion moved · Directives done (n / 3) · shift worked · stat points trained.** It resets at the boundary; nothing is lost, it becomes yesterday. It exists so that a five-minute session ends with a visible sum, not a scroll through a log.

---

## 4. Retention: why players come back

### 4.1 Hooks by timescale

All of these are **positive**: something to look forward to.

| Timescale | Hook |
|---|---|
| **Minutes** | Energy refills (100 in 3h20); a Campaign Event you joined is about to start |
| **Daily** | The Morning Paper; a council election somewhere; new Party Directives; a job shift; bar and social opportunities; new weather |
| **Every 5 days** | Your Home City's council election; councillor terms; the Influence Ledger and City Hero titles |
| **Weekly** | Issues of the Week resolve and new ones arrive; patron Requests; weekly social events (opera, lectures) |
| **Every 28 days** | National election; a new government and new laws; new Ambition chapters (live content) |
| **Every 12 weeks** | Season Election, season awards, a Season Twist that changes the rules, a new season track |
| **Long term** | Rank 7, Legacy perks, Tier V regalia, Protégé status with a patron, Hall of Fame |

### 4.2 What being away costs

| Away for | What happens |
|---|---|
| **3 hours** | Nothing is lost. Energy is full and overflow banks as **Rested** (§6.3). |
| **1 day** | Your job pays half salary automatically. Rested keeps banking up to its cap. A **sick day** protects your work streak. Today's Directives are missed: a missed opportunity, nothing taken away. |
| **1 week** | Your work streak ends: you lose the bonus, not the job. Dossier entries are flagged stale. A bodyguard contract may run out. A council term you held has ended normally. |
| **2 weeks or more** | Half pay stops accruing after **14 boundaries** (§9.1): you keep the job and pay resumes at the next boundary. Unearned pay is opportunity, not an asset. |
| **1 month or more** | **Welcome Back package**: Rested full, a "While You Were Away" digest, and a returning-operative Ambition chapter. |

### 4.3 Rules we don't break

1. **Being away never destroys what a player owns.** It costs opportunity only.
2. **One missed day can never break a streak.**
3. **Losses belong to competition.** Losing an election, an Issue or city control is fine: players had agency and it's part of the story.
4. **Collective decay is acceptable.** City influence drifting back toward equilibrium is a problem for the faction, and it gives newcomers something to do.
5. **Every timer is either a reward arriving or a choice to make.** None is a threat.

---

## 5. Progression

### 5.1 Progression tracks

| Track | Earned by | Unlocks | Survives a season? |
|---|---|---|---|
| **Level** (XP) | All missions | Content tiers, cities, equipment tiers | Yes |
| **Faction Rank** (FXP) | Faction missions, Directives, events, offices | Political rights: voting, standing, leading, legislating | Yes |
| **Stats** (STR, INT, AGI) | Level-ups, training, stealth missions | Mission success, jobs, milestones | Yes |
| **Wardrobe** (CHA) | Buying and earning clothing | Social access, high-society missions | Yes |
| **Political Capital** (PC) | Offices, events, Issues, Directives, City Hero | Political actions (§6.5) | Yes, capped at 1,000 |
| **Office** | Winning elections, appointment | Temporary power: ordinances, laws, ministries | No: offices have terms |
| **Patronage** (Favour) | Patron Requests, gifts, social missions | Introductions, favours, endorsements, unique items | Yes |
| **Legacy** | A permanent public record of achievements | Small permanent perks | Yes |
| **Ambition** | Chapter requirements | Story, unique items, Legacy | Yes |
| **Season Standing** | Seasonal activity | Season track rewards | No: resets each season |

### 5.2 Pacing targets

**Reference player:** 3 sessions a day about six hours apart, so **300 Energy a day, nearly all of it carrying the Rested bonus** (about 400–450 Energy-equivalents of XP and Iron), with about 60 % of Energy spent on actions that earn FXP (more in week 1, when there is little else to spend on). Reward rates (§5.5) are tuned to hit these targets and are checked against telemetry after launch. The working is in **`docs/economy.md`**, which also models a casual (2 sessions), a regular (4) and a heavy (6) player; the heavy player runs about 35 % ahead of the reference, by design.

| Milestone | Target | Why it matters |
|---|---|---|
| First job, first outfit, first Campaign Event | Day 1 | Every core system touched in the first sessions |
| Rank 2: **vote** | Day 2 | A taste of politics from day 2 |
| Level 10: **train travel** | ~Day 5 | The map opens once the home city is familiar |
| Rank 3: **stand for council**, lead events, illegal missions | ~Day 10 | The first real political step, in week 2 |
| Level 16: full map, Case Files | ~Week 2 | |
| Moving to a battleground | Weeks 3–4 | A player's own choice, not a gate |
| Rank 4: Faction Chair candidacy | ~Week 4 | |
| Level 31 | ~Week 6 | |
| **Rank 5: Legislature and ministries** | **~Week 8** | National politics for committed players in season 1 |
| Rank 6: **head-of-government candidacy** (also needs a term as deputy or minister) | ~Week 12 | The top prize is for the end of season 1 at the earliest |
| Level 51 | ~Week 20 | |
| Rank 7 | ~Week 24 | The top rank in season 2 |

### 5.3 Levels

Each level-up gives +5 max HP and +1 stat point to STR or INT. AGI grows through stealth missions and training; CHA comes from clothing.

| Levels | Cumulative XP | Unlocks |
|---|---|---|
| 1–5 | 0 – 2,499 | Home city missions, Tier I equipment, faction HQ, Jobs board, first surveillance |
| 6–15 | 2,500 – 19,999 | Bar services and social missions (with CHA) at Level 6; **train travel at Level 10**; Tier II equipment |
| 16–30 | 20,000 – 99,999 | Full 5-city map, Tier III equipment, expanded Dossier, Case Files |
| 31–50 | 100,000 – 399,999 | Cross-city operations, Tier IV equipment, senior job postings |
| 51+ | 400,000+ | Elite missions, Tier V Legendary quest chains, Hall of Fame |

**Per-level thresholds** (cumulative XP at which the level is reached; the XP needed for the next level never shrinks). Tuned so the reference player (§5.2) reaches Level 6 on day 2, Level 10 about day 5, Level 16 about day 13 and Level 31 about week 6–7.

| Level | XP | Level | XP | Level | XP | Level | XP | Level | XP |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 0 | 11 | 9,000 | 21 | 37,000 | 31 | 100,000 | 41 | 220,000 |
| 2 | 150 | 12 | 10,800 | 22 | 41,400 | 32 | 109,300 | 42 | 235,300 |
| 3 | 450 | 13 | 12,800 | 23 | 46,200 | 33 | 119,200 | 43 | 251,200 |
| 4 | 900 | 14 | 15,000 | 24 | 51,400 | 34 | 129,700 | 44 | 267,700 |
| 5 | 1,600 | 15 | 17,400 | 25 | 57,000 | 35 | 140,800 | 45 | 284,800 |
| 6 | 2,500 | 16 | 20,000 | 26 | 63,000 | 36 | 152,500 | 46 | 302,500 |
| 7 | 3,500 | 17 | 22,800 | 27 | 69,400 | 37 | 164,800 | 47 | 320,800 |
| 8 | 4,650 | 18 | 25,900 | 28 | 76,300 | 38 | 177,700 | 48 | 339,700 |
| 9 | 5,950 | 19 | 29,300 | 29 | 83,700 | 39 | 191,200 | 49 | 359,200 |
| 10 | 7,400 | 20 | 33,000 | 30 | 91,600 | 40 | 205,300 | 50 | 379,300 |

Level 51 is reached at **400,000**. From Level 31 the XP for the next level is 9,300 and grows by **600 per level** (Level 50 → 51 costs 20,700); above 51 the same +600 step continues, so Level 51 → 52 costs 21,300, and so on. There is no level cap.

- A player's level is the highest threshold their cumulative XP has reached. One action can cross several thresholds; each one grants its +5 max HP and +1 stat point.
- The stat point **waits** on the character screen until it is placed. It never expires, and nothing is lost by choosing later.

### 5.4 Faction Rank

Rank gives the **right** to stand. Each office also needs the rung below it on the **office ladder** (§15.1). The Rank 6 and 7 thresholds are retuned from v3.0 to fit the new pacing.

| Rank | FXP | Title (Vanguard / Collective / Alliance) | Unlocks |
|---|---|---|---|
| 1 | 0 | Initiate / Recruit / Volunteer | Faction HQ, faction chat, Tier I faction missions |
| 2 | **400** | Footsoldier / Activist / Canvasser | **Vote in all elections**, Campaign Event roles, Dossier missions, sign Recall Petitions |
| 3 | 2,000 | Sergeant / Organiser / Councillor | **Stand for City Council** (with the ladder conditions), **schedule Campaign Events**, illegal missions, safehouses, faction equipment, Jobs board Tier II |
| 4 | 6,000 | Lieutenant / Commissar / Senator | **Stand for Faction Chair** (after a council term), Political Protection perk (§11.4) |
| 5 | 15,000 | Captain / Delegate / Representative | **Stand for the Legislature** and **be appointed Minister** (after a term as Governor or 3 council terms), Operation missions |
| 6 | 25,000 | Commander / Comrade-General / Speaker | **Stand for President or Chancellor** (after a term as deputy or minister), eligible for Speaker, Tier V quest chains |
| 7 | 60,000 | Marshal / Chairman / Prime Minister | Honorific title, Legacy unlocks, faction Hall of Fame |

Rank 2 was 500 in the first 3.1 draft; at the §5.5 rates the reference player reached it on day 3, not day 2, so it is now 400 (`docs/economy.md` §7).

The Collective's Rank 5 title was *Vanguard* in the first 3.1 draft, which read as the rival faction's name. It is now **Delegate**: what a workers' party sends to its Congress (§15.5) and to the Legislature, which is exactly what Rank 5 unlocks. No faction is renamed (Appendix C #10 stays parked).

### 5.5 Reward rates per mission tier (starting values)

| Tier | Level | Energy per mission | XP per Energy | FXP per Energy (faction missions) | Iron per Energy |
|---|---|---|---|---|---|
| T1 | 1–5 | 5–15 | 4.5 | 0.6 | 2 |
| T2 | 6–15 | 10–20 | 5 | 0.8 | 4 |
| T3 | 16–30 | 15–25 | 7 | 1.0 | 7 |
| T4 | 31–50 | 20–30 | 7.5 | 1.2 | 12 |
| T5 | 51+ | 25–30 | 8 | 1.4 | 20 |

About 25 % of a player's FXP should come from outside missions: Directive bonuses, Campaign Events, Issue resolution and office stipends. These rates are lower than the first 3.1 draft, to fit the slower pacing in §5.2. The current seed data (about 6 XP and 1.2 FXP per Energy) is too generous and needs to come down.

**Reference action:** a 10-Energy tier-1 canvass pays **45 XP / 6 FXP / 20 Iron** on Success and **23 / 3 / 10** on Partial. Opinion swing is set separately, per tier, in §14.2.

**Rounding.** Every reward line (XP, FXP, Iron, opinion) is worked out in full precision and then **rounded to the nearest whole number, halves up** (22.5 → 23). Base and bonus are rounded separately, so the tiles on the result modal always add up. A line that pays on Success never pays less than 1 on Partial. Opinion is the exception: it keeps three decimals (§14.2).

---

## 6. Resources

### 6.1 Health

| | |
|---|---|
| **Max** | 100, +5 per level |
| **Regen** | 10 HP per 10 min (passive) |
| **Lost through** | Combat encounters, and only combat. Neglect no longer drains health (the v3.0 system is removed). |
| **At 0** | Hospitalised (§19.1) |

### 6.2 Energy

| | |
|---|---|
| **Max** | 100 (Premium: 120) |
| **Regen** | **5 per 10 min**, server-side. Full from empty in 3h20. |
| **Spent on** | Missions (5–30), job shifts (3–8), surveillance (3–5), Campaign Event roles (10–20), social missions (5–12), bar activities (2–6) |

Travel between cities costs time and a ticket, not Energy (§14.10). The slower regen (v3.0 was 5 per 5 min) fits 3–4 sessions a day without asking players to log in every 100 minutes. Rested absorbs the regen that would otherwise be wasted.

### 6.3 Rested (new)

While Energy is full, regen overflows into a **Rested** pool.

| | |
|---|---|
| **Cap** | 200 |
| **Effect** | Each Energy point spent **on an action Rested can boost** (checked actions and training) while Rested > 0 uses 1 Rested and gives **+50 % XP and +50 % Iron** on that action. Job shifts and job switches spend Energy without touching Rested: there is nothing for it to boost (§9.1). FXP and influence get no bonus, so absence can't be converted into political power. |
| **Other sources** | Lodging and hotels (§6.7), Welcome Back package |

A player who logs in once a day spends 100 Energy with a +50 % bonus on all of it. A player who logs in three times spends about 400. Neither gets punished; the frequent player simply does more.

**Rested is spent per Energy point, not per action.** If an action costs more Energy than the Rested left, only the covered points get the bonus: 3 Rested on a 10-Energy action uses all 3 and gives **+15 %** XP and Iron (50 % × 3⁄10). The result modal's Rested tag shows it as *"Rested: 3 of 10 Energy, +15 % XP and Iron"*. Nothing is held back or wasted, so a player never needs to plan around the last few points.

### 6.4 Heat (new)

Heat measures how much attention the authorities are paying you right now. It's the short-term counterpart to the long-term Criminal Record (§11).

| | |
|---|---|
| **Range** | 0–100 |
| **Rises with** | Illegal actions: Disruption +8, Sabotage +12, extended surveillance +5, vandalism +6, blackmail +10, Operations +15. **Doubled in an enemy home city** (§14.12) |
| **Cools** | 5 per hour (from 100 to 0 in about 20 h); faster in Safehouses |

| Heat | Status | Effect |
|---|---|---|
| 0–24 | **Cool** | No effect |
| 25–49 | **Noticed** | Police encounter chance +5 %; caught checks +5 % |
| 50–74 | **Hot** | Police encounter chance +15 %; caught checks +15 %; the press may name you in the Morning Paper |
| 75–100 | **Wanted** | Any failed illegal action means arrest (§19.2); barred from high-society venues |

### 6.5 Political Capital (new)

Political Capital (PC) is *earned* through political activity. It does not regenerate on a timer.

| Earned from | Amount |
|---|---|
| Completing today's Party Directives | 5 per day |
| Campaign Event participation | 3–15 by outcome |
| Resolving an Issue (top contributors) | 20 split |
| City Hero | 25 |
| Office stipends | Councillor 10/day, Governor 20/day, Deputy 5/day, Minister 25/day, Head of Government 50/day |
| Patron favours, Ambition chapters | Varies |

| Spent on | Cost |
|---|---|
| File candidacy: Council / Legislature / Chair / Head of Government | 10 / 25 / 25 / 100 |
| Endorse a candidate (+votes, §15.5) | 10 |
| Sign a Recall Petition | 10 |
| Propose an ordinance (councillor) or law (deputy) | 20 / 50 |
| Call in a patron favour | 15–40 |
| Clear 1 Criminal Record point through connections | 30 |

PC is capped at **1,000** and never decays. It can't be bought, traded or transferred. It is **stored and shown from slice 1** (the Directive completion bonus pays it) even though the first thing to spend it on arrives with the council elections in slice 3.

### 6.6 Iron Marks (IM)

The currency. It's earned from missions (§5.5), jobs, Dossier sales, events and Ambitions, and spent on optional acceleration (§18). **No mandatory daily upkeep exists.**

### 6.7 Buffs (replaces "Physical Neglect")

v3.0's hunger, fatigue and exposure mechanics are **removed**. Food, lodging and outerwear now give bonuses instead of preventing penalties.

| Buff | Source | Effect | Duration |
|---|---|---|---|
| **Well-Fed (Street)** | Street food, 50 IM | +5 % XP, +5 HP | 3 h |
| **Well-Fed (Bar)** | Bar meal, 100–150 IM | +10 % XP, +15 HP | 4 h |
| **Well-Fed (Fine)** | Restaurant, 300–600 IM, CHA 10+ | +10 % XP, +10 % Iron, +25 HP, intel chance | 6 h |
| **Well-Fed (Society)** | High-society dinner, 1,500 IM, CHA 25+ (Capital) | +15 % XP, +30 HP, one exclusive political mission | 8 h |
| **Lodged** | Basic lodging 100 IM / Hotel 500 IM / Safehouse free at Rank 3+ | +25 / +75 / +40 Rested; hotel also restores full HP; Safehouse adds a faction intel briefing and Heat −20 | Instant |
| **In Good Spirits** | Bar: Buy a Round | +10 % XP on the next 3 missions | 3 missions |
| **Weatherproof** | Seasonal outerwear | Ignore weather penalties on outdoor missions | While equipped |

Only one Well-Fed buff is active at a time; the strongest applies.

---

## 7. Character creation — the Origin Story

### 7.1 The deathbed scene

Unchanged from v3.0. The player's father lies dying in a small apartment in Irongate City while the city outside is in political turmoil. He asks the player to recall moments from their youth, and each answer quietly sets starting stats. The player never sees a number.

### 7.2 Dialogue

| Father's question | A | B | C | Effect |
|---|---|---|---|---|
| "Do you remember the summer you were ten? What did you do every day?" | Went fishing at the river with you | Helped at the factory after school | Spent hours at the library | A +3 AGI · B +3 STR · C +3 INT |
| "When the neighbourhood kids got into trouble, what did you do?" | Led the charge — someone had to | Talked them out of it | Watched from the corner, learning | A +2 STR · B +2 CHA (permanent base) · C +2 INT |
| "You always had a talent. What was it?" | I could outrun anyone on the block | I could fix anything with my hands | I could read people like a book | A +3 AGI · B +3 STR +1 INT · C +1 CHA (base) +3 INT |
| "What do you want, when all this is over?" | Order. Someone needs to hold the line. | Justice. The workers deserve better. | Truth. Let the people decide. | +50 FXP seed toward Vanguard / Collective / Alliance, applied if you join that faction |
| "Take my coat. It's all I have left." | (Accept solemnly) | (Refuse — you'll earn your own) | (Accept and promise to return it) | A Tier I coat · B +150 IM · C unique coat cosmetic, +1 CHA |
| **New:** "Promise me one thing…" | "…I'll clear your name." | "…I'll settle what you owed." | "…I'll finish what you started." | Chooses the player's **Ambition** (§17.1) |

### 7.3 After the prologue

The father dies. The player steps into the street, a newspaper headline announces the crisis, and the Faction Selection screen appears. The faction choice is free and permanent (changing needs a paid Faction Reset token, §23).

**Faction starting bonuses are cut to +3** (Vanguard +3 STR; Collective +2 STR +1 INT; Alliance +3 INT) so the origin choices keep their weight.

### 7.4 Home City (new)

**Your faction decides where you start.** Every new player begins in their faction's **home city** (§14.11): the Vanguard in Duskwall, the Collective in Coalport, the Alliance in Ashford. That is your Home City, where you vote and stand for council.

From **Rank 3** you can **move** your residence to a **battleground city** (Clearwater, or a district of Irongate, §14.9) to vote and stand where national power is decided. Moving is a career choice, not a tutorial step: at home you rise inside your party, and in a battleground you fight the other two.

- You can move once every 7 City Days, for 500 IM. Moving resets your council eligibility for one cycle.
- You can always move back home.
- You can't live in an enemy home city. You can visit, at your own risk (§14.12).

---

## 8. Stats

### 8.1 Attributes

| Stat | Governs | Grows through |
|---|---|---|
| **STR** | Melee damage; physical mission success (marches, strikes, security roles); less damage taken | Level-ups, training, missions |
| **INT** | Political and espionage success; propaganda quality; Dossier capacity; high-paying jobs; Speaker and Organiser roles | Level-ups, training, missions |
| **AGI** | Stealth success; caught chance; Energy discounts at milestones; flee chance | Stealth missions, training |
| **CHA** | Social missions, high-society access, speeches, candidacy appeal | **Worn**: the sum of equipped items' CHA plus a small origin base |

### 8.2 Charisma is worn

Unchanged from v3.0. Your CHA is the total of your equipped clothing and accessories, so players keep different outfits for different jobs.

| Item | CHA | Notes |
|---|---|---|
| Basic work clothes | 2 | Starting outfit |
| Standard coat (Tier I) | 5 | |
| Faction uniform (Tier II) | 12 | FXP bonus on faction missions |
| Officer's suit (Tier III) | 22 | Opera and university events |
| Press correspondent outfit (Alliance T III) | 25 | INT bonus on political missions |
| Ceremonial Vanguard uniform (T IV) | 35 | Risky in rival-held cities |
| Tailored three-piece suit (T IV, neutral) | 38 | |
| Full regalia (T V Legendary) | 50 | Senior leadership |

**CHA cuts both ways.** High CHA unlocks the opera, lectures, society dinners and diplomatic missions, and it helps in elections: every 10 CHA gives +1 % to your personal vote appeal. It also draws attention. With CHA 30+ in a rival-held city at night, encounter chance rises. Some stealth missions require *low* CHA, because a sharp suit makes you memorable.

### 8.3 Agility milestones

| AGI | Bonus |
|---|---|
| 30 | +2 s safe surveillance window; stealth missions −1 Energy |
| 50 | Run 2 missions from the same location at once |
| 75 | Stealth missions −20 % Energy |
| 100 | 3 at once; caught chance −15 % |
| 150+ | Elite operative missions |

### 8.4 Checks: from stats to odds (new)

Almost every tap in the game is a **check**: a stat against a difficulty. The formula is simple enough to show the odds on every button.

> **Chance = 50 % + 4 % × (your stat − difficulty) + bonuses**, kept between **5 %** and **95 %**.

- **Two-stat checks** (for example a Rally Speaker, CHA + INT) use the average of the two stats.
- **Charisma checks** use your *worn* CHA (§8.2).
- **Every button shows the final chance.** Tapping the percentage shows the breakdown: stat, difficulty, and each bonus.

**Difficulty:**

| Kind of check | Difficulty |
|---|---|
| Tier-1 action in your home city | 8 |
| Tier-1 action in a battleground | 10 |
| Tier-2 mission | 14–20, set per mission |
| Tier-3 story, Operation | 22–30 |
| Social mission | Its CHA requirement |
| **In an enemy home city** | **+4** on top |

Missions unlock by Level, so the odds on a player's own tier sit mostly between **60 % and 85 %**. Old content drifts up to 95 %; new content starts lower.

**Bonuses:**

| Source | Effect |
|---|---|
| Local Standing (§13.4) | +3 % per level, up to +12 % |
| The right item (§21) | +5 % to +10 % (forged papers on checkpoints, a propaganda kit on posters, a press pass on interviews) |
| Weather (§14.7) | −10 % to +10 % on outdoor checks |
| Battleground bonus (§14.4) | +5 % |
| The People's Commissar or similar enemy effects | −10 % |

Heat, Party Directives and Rested don't change the odds. Heat changes the separate **caught check** (§11.2); Directives and Rested change the rewards.

**Outcomes from one roll (a whole number from 1 to 100, each equally likely):**

| Roll | Tier 1 | Tier 2 and 3 |
|---|---|---|
| **At or below** the chance | **Success** | **Success** |
| Up to 20 points above | **Partial** (half rewards) | **Partial** (half rewards) |
| More than 20 points above | **Partial** (a tier-1 action never fails) | **Failure** (small XP only), and possibly an encounter |

A shown 72 % succeeds on rolls 1–72: exactly 72 times in 100. The clamp means a 95 % button still gives Partial on 96–100, and a 5 % button still succeeds on a 1–5. The chance is a whole number; bonuses are added before the clamp.

**Examples:**

| Check | Maths | Chance |
|---|---|---|
| Canvass in Coalport (home), INT 12, no Standing yet (the reference recruit, §8.5) | 50 + 4 × (12 − 8) | **66 %** |
| Canvass in Coalport (home), INT 12 | 50 + 4 × (12 − 8) + 6 (Standing *Known*) | **72 %** |
| Speech to the picket, INT 18, difficulty 12 | 50 + 4 × (18 − 12) | **74 %** |
| Sabotage in Duskwall (enemy home), AGI 17, difficulty 16 + 4 | 50 + 4 × (17 − 20) + 10 (forged papers) | **48 %** |

### 8.5 Stat growth (new)

| Stat | Grows through |
|---|---|
| **STR, INT** | +1 point of your choice per level-up, and training |
| **AGI** | Training, and every successful stealth action (a quarter of a training point) |
| **CHA** | Never trained: it is the sum of what you wear, plus up to +3 from the origin story |

**Starting stats:** 5 in each trained stat, plus the origin story (up to +5) and the faction bonus (+3). A new player's best stat is about **10–12**.

**The reference recruit.** All tuning, examples and tests use one canonical new character: a Collective recruit who answered the origin story with *the library*, *watched from the corner* and *fix anything* (§7.2), wearing basic work clothes.

| STR | INT | AGI | CHA (worn) | Where it comes from |
|---|---|---|---|---|
| 10 | 12 | 5 | 2 | 5 base each · origin +3 STR, +6 INT · Collective +2 STR +1 INT · work clothes CHA 2 |

The reference recruit's home canvass is a **66 %** check (§8.4). Until the origin story is built, every new character is created as the reference recruit.

**Training** is a tier-1 action (the gym, the library, the running track). The Energy needed for the next point rises slowly, so stats never run away:

> **Energy for the next point = 20 + 2 × current stat.** Point 15 costs 50 Energy, point 30 costs 80, point 60 costs 140.

**Training rules.** Training is **not a check**: it always succeeds, one tap gives +1 to the stat at once, and the modal shows one row ("no roll") and the stamp *Trained*. It pays **XP at half the tier rate** (2.25 per Energy at tier 1, so the reference recruit's first INT point is 44 Energy for 99 XP) and **no Iron, FXP or opinion**: the stat point is the reward. Rested applies to the XP. **×3** trains three points at the three rising costs and is disabled when Energy is short. Training does not count toward Local Standing. The button always shows the live cost.

**Targets for a regular player's best stat** (training about 15 % of their Energy, plus level-ups):

| When | Best stat |
|---|---|
| Day 1 | ~10–12 |
| Week 1 | ~15 |
| Month 1 | ~30 |
| Month 3 | ~60 |
| Season 2 | 80–100 |

---

## 9. Jobs

Jobs give a steady income that doesn't depend on faction activity, and they get players moving around the city.

### 9.1 Rules (reworked)

- A player holds **one job**. Taking a first job is free and one tap at the job's location (a *Jobs* card lists what is offered there, with pay and requirements; requirements are checked on taking, never again). **Switching** costs 2 Energy, takes effect immediately, **resets the streak to 0** and does not spend Rested (§6.3).
- **Daily salary:** at every 00:00 UTC boundary (§2.2) the job held at that moment pays **50 % of its daily pay** automatically, whether or not you worked. A week away banks seven half-pays. **Cap on return:** however long the absence, a return credits **at most 14 half-pays** (a fortnight's back pay); the job is kept and pay resumes at the next boundary. This never touches a player seen at least once a fortnight (§4.2; Appendix C #17).
- **Working a shift:** once per City Day, at any time, at the job location, for the listed Energy. You get the other 50 % plus the streak bonus. **A shift is not a check**: no roll, always paid, one outcome text, stamp *Shift worked*. Shifts pay no XP and no FXP; Rested is neither applied nor spent (§6.3). One shift per City Day regardless of job changes. The ticket shows the next shift time in the player's local clock.
- **Work streak:** consecutive City Days with a shift, counting today. **Bonus = 2 % × min(streak, 10) of daily pay**, paid with the shift: the first shift +2 %, the tenth and after +20 %.
- **Sick days:** 2, refilled to 2 at the Monday 00:00 UTC boundary. A sick day is spent only when an ended City Day had no shift **and a streak was running** (streak > 0); the streak survives (it neither grows nor breaks). At streak 0 (no job, a job just taken or switched, a streak already broken) nothing is spent. A missed day with no sick day left ends the streak, back to 0. At the Monday boundary the ended Sunday is judged first, then the sick days refill. So a streak only ends on the third missed day in a week (§4.3, rule 2).
- **You are never fired for being away.**
- Premium **Remote Work**: Tier I–II jobs can be worked from anywhere for +1 Energy.

### 9.2 Job catalogue

Unchanged from v3.0 apart from the pay rules.

| Job | Unlock | Shift Energy | Daily pay | Requirements | Notes |
|---|---|---|---|---|---|
| Street vendor | Level 1 | 3 | 80–120 | — | Any outdoor location |
| Factory worker | Level 1 | 4 | 150–200 | STR 5 | Coalport; Collective +20 % |
| Driver | Level 3 | 4 | 180–250 | AGI 10 | |
| Market trader | Level 3 | 5 | 200–300 | INT 8 | Buy-low/sell-high mini-game |
| Security guard | Level 6 | 5 | 300–400 | STR 12, CHA 10 | Opera, university, warehouses |
| Newspaper reporter | Level 6 | 6 | 350–500 | INT 15 | 10 % chance of a free Dossier entry per shift |
| Factory foreman | Level 10 | 5 | 500–700 | STR 15 | Collective: Rank 3 instead of Level 10 |
| Lawyer's clerk | Level 10 | 6 | 600–800 | INT 20 | Ashford; Alliance: Rank 2 |
| Professor | Level 16 | 7 | 900–1,200 | INT 30 | Ashford University; small INT gain per shift |
| Political aide | Level 20 | 8 | 1,500–2,500 | Rank 4 | Also gives FXP and 2 PC per shift |

**Pinned for slice 1 (Coalport):** Street vendor **100** a day at Market Row · Factory worker **180** (**216** for Collective members) at the Mill Gate · Driver **200** at the Harbour Quays. The other jobs keep their ranges until they are placed. The Market trader's mini-game is deferred with the job.

---

## 10. The Dossier

The Dossier is the player's private intelligence journal. In MVP it covers NPCs only; in v1.5 it extends to players.

### 10.1 Capacity

| INT | Slots |
|---|---|
| 1–10 | 10 |
| 11–20 | 15 |
| 21–35 | 25 |
| 36–50 | 40 |
| 51+ | 60 |

### 10.2 Gathering intelligence

| Method | Energy | Risk | Yields |
|---|---|---|---|
| Safe surveillance (within your AGI window) | 3 | None | Recent NPC actions; save 1–2 |
| Extended surveillance | 3 | +5 Heat; caught chance grows with overtime | More detail: affiliations, items |
| Overheard conversation | 0 | None | Random during visits; 1 free entry |
| Journalist contact (Alliance) | 4 | None | Verified entry on a named NPC |
| Underground network (Collective) | 4 | 5 % counter-surveillance | Union and factory intel |
| Secret police file (Vanguard) | 5 | None in Vanguard-held cities | Official records, the most detailed |
| Hospital or jail conversations | 0 | None | Storylet entries (§19) |

### 10.3 Categories

Political affiliation, criminal activity, location pattern, asset/wealth, and neutral, as in v3.0.

### 10.4 Case Files (new)

Collect **3 or more fresh entries on the same NPC** and they combine into a **Case File**. Case Files are keys that open storylets:

| Case File use | Needs | Outcome |
|---|---|---|
| **Exposé** | Criminal or political entries | Publish through the press: influence swing against the NPC's faction in that city, and a headline with your name |
| **Blackmail** | A criminal entry | Iron or a favour; +10 Heat |
| **Denounce** | Political entry; your faction controls the city | FXP; the NPC is removed from the city for a week |
| **Recruit Informant** | Location pattern + 30 Favour with a patron | A passive entry every 2 days |
| **Sell** | Any entry | 50–200 IM at tram stations |

### 10.5 Freshness

Entries older than 7 days are flagged **stale**. Stale entries still count toward Case Files at half weight, and they sell for half price. Being away makes intel less valuable; it never deletes it.

---

## 11. Heat & Criminal Record

### 11.1 Two layers

- **Heat** (§6.4): short-term attention, cools within a day.
- **Criminal Record:** long-term reputation that shows on your profile.

### 11.2 Getting caught

Every illegal action rolls a **caught check**: base chance by action type, **plus half your Heat**, minus AGI modifiers.

| Illegal action | Base caught chance | Record points if caught |
|---|---|---|
| Disrupting a public meeting | 10 % | 1 (minor) |
| Vandalism, tearing down posters | 8 % | 1 (minor) |
| Assault in an illegal context | Encounter loss | 2 (moderate) |
| Robbery or theft | 15 % | 2 (moderate) |
| Arson or sabotage | 20 % | 3 (serious) |
| Arrested twice within 7 days | — | Escalates to serious |

Being caught while **Hot or Wanted** means **arrest and jail** (§19.2).

### 11.3 Record levels

| Level | Points | Effect |
|---|---|---|
| Clean | 0 | None |
| Known | 1–2 | −10 % Iron from missions; some venues need +5 CHA |
| Repeat Offender | 3–5 | −20 % Iron; clothing +15 %; police encounters +5 % |
| Notorious | 6+ | −30 % Iron; barred from courts, universities and Alliance civic buildings; bail doubled; **−5 % personal vote appeal** |

### 11.4 Clearing a record

- **Time:** minor points expire after 14 days with no new offences.
- **Bribes:** 500 IM per point at Known, up to 2,000 IM per point at Notorious. Depends on who controls the city.
- **Connections:** 30 PC per point.
- **Political Protection (Rank 4+):** once a month, your faction expunges one moderate point.
- **Laws:** the Rehabilitation Act lowers every record by one level while it's in force.

---

## 12. Bodyguards

In MVP, bodyguards only protect. Eliminate mode is a v1.5 PvP feature.

### 12.1 Contracts (reworked)

Bodyguards are hired on **prepaid 7-day contracts** that you renew by hand or set to auto-renew. When a contract ends, the bodyguard leaves; nothing is taken from you. Being unable to pay at midnight no longer dismisses them.

| Tier | Hire fee | 7-day contract | Protection | Max active |
|---|---|---|---|---|
| Street thug | 500 | 350 | −10 % encounter damage; +5 % flee | 2 |
| Trained enforcer | 2,000 | 1,400 | −20 % damage; +10 % flee; 15 % chance to avoid hospital | 2 |
| Elite operative | 8,000 | 5,600 | −30 % damage; +15 % flee; 25 % hospital prevention; intercepts 1 ambush a day | 1 |

Hired at Vanguard Barracks, Safehouses, or the Black Market (any faction, +25 % cost).

---

## 13. Missions

### 13.1 Three tiers of play (new)

Most of the time, spending Energy should be **fast**. A full bar of 100 Energy should be spendable in two or three minutes if the player wants. Depth is saved for the moments that deserve it.

| Tier | Share of content | How it plays | Examples |
|---|---|---|---|
| **1. Actions** | ~80 % | **One tap.** Resolves straight into a result modal (§13.1a). Repeatable ×1 / ×3 / ×5. **Never triggers an encounter**, except in an enemy home city (§14.12); a failure just pays less. | Canvass, paste posters, a street speech, work a shift, train, safe surveillance, buy a round |
| **2. Missions** | ~15 % | **One choice.** A short briefing with 2–3 approaches, each showing its stat check and success chance, then the result. The game **remembers your approach**, so after the first time a Repeat button makes it one tap. | Anything illegal (disruption, sabotage, extended surveillance), exposés, social events, bigger faction missions |
| **3. Stories** | ~5 % | **2–3 short steps at most**: choices, an encounter, named NPCs, illustration. Always **resumable**: close the tab mid-story and it waits where you left it. | Ambition chapters, patron Requests, the origin story, encounters from tier 2 |

**Rules that keep tier 1 fast:**
- One tap resolves at once. **×3 and ×5** spend Energy in one go and show all the attempts in a single result. A batch rolls each attempt from one seed, shows one row per attempt and a "2 of 3" stamp, counts each row separately for Standing and Directives, and is **disabled when Energy is short** (no partial batch). ×3 ships in slice 1; ×5 later. **Batch text:** the stamp always reads *n of 3* (*3 of 3* and *0 of 3* included); the narrative is the action's **success text when more than half the rows succeeded** (×3: 2 or 3; ×5: 3 or more), otherwise its partial text. There is no third text: the rows carry the numbers.
- The result modal's **Again ×1 / Again ×3** buttons let the player chain actions without going back to the location card.
- Rested, Issue, weather and Directive bonuses are applied automatically and shown as small tags on the card.

**Rules that give tier 2 weight:**
- Every tier-2 mission shows its **odds and its risks before you commit**: Heat, encounter chance, record points if caught.
- Encounters (§20) only come from tier 2 and 3, and from tier 1 in enemy home cities (§14.12).

#### 13.1a The result modal

Every action and mission ends in a **result modal that covers the map**. It never appears as a line in a log. Top to bottom:

1. **Art and a stamp**: art from the fallback ladder (§13.5) with a large stamp (Success, Partial, "2 of 3", Encounter, Arrested), plus the place, the action and the in-game time.
2. **What happened**: a headline and a short narrative paragraph. Every action has its own success and partial text.
3. **How it went**: one row per attempt, with the success chance as a bar and a marker where the roll landed. The maths is never hidden.
4. **Rewards**: four large tiles (Experience, Faction XP, Iron, and opinion or Dossier), with notes on bonuses such as Rested or the Issue.
5. **Knock-on effects**: Local Standing progress, Issue momentum, Energy and Rested before and after, ledger rank, Heat, press coverage.
6. **Buttons**: Again ×1 · Again ×3 · Continue. When an encounter follows, a single button leads into it.

### 13.2 Mission anatomy

| | |
|---|---|
| **Energy** | 5–30 by tier and type |
| **Resolution** | Instant, ending in the result modal (§13.1a). Tier 1 in one tap; tier 2 after one choice; tier 3 over several steps |
| **Rewards** | XP and Iron always. FXP on faction missions. **Influence** on political missions. Sometimes items, Dossier entries or PC. |
| **Tags** | City, location, Issue (§14.6), legality (Heat), weather sensitivity, tier |
| **Outcomes** | Success, Partial Success, Failure; tier 2–3 can also produce an Encounter |
| **Gates** | Level, Rank, CHA (social), AGI or STR (stealth or physical), Dossier (intel), Case Files (exposés), Local Standing (§13.4) |

### 13.3 Mission types

| Type | Tier | Legal? | FXP | Influence | Encounter | Example |
|---|---|---|---|---|---|---|
| **Training** | 1 | Yes | No | No | — | Hit the gym, study at the library |
| **Canvassing** | 1 | Yes | Yes | Yes | — | Go door to door in the tram district |
| **Speech** | 1 (street) / 2 (big crowd) | Yes | Yes | Yes | — / 5 % | Speak at the market. A big crowd is a tier-2 mission with approaches |
| **Propaganda** | 1 | Yes | Yes | Yes | — | Paste posters at the docks |
| **Intelligence** | 1 (safe) / 2 (extended) | Mostly | No | No | — / 10 % | Safe surveillance is one tap; extended surveillance is a mission |
| **Social** | 2 | Yes | No | Small | 0 % | Opera, lecture, senator's dinner (CHA-gated) |
| **Disruption** | 2 | **No** | Yes | Yes (against rivals) | 30 % | Break up a rival meeting |
| **Sabotage** | 2 | **No** | Yes | Yes | 25 % | Wreck a rival printing press |
| **Operation** | 3 | Varies | Yes | Large | 40 % | Rank 5+; high risk, high reward |
| **Council** | 1 | Yes | Yes | No | — | Faction strategy session |
| **Job shift** | 1 | Yes | No* | No | — | See §9 (*Political aide gives FXP) |

Illegal missions pay better influence per Energy, at the cost of Heat and record risk. **You can play entirely legally.**

**Tier-1 Energy by type** (inside the 5–15 band of §5.5): **Canvassing 10** (the reference action), Propaganda 8, street Speech 12, safe Intelligence 3–5, Council session 10, Training and Job shifts as set in §8.5 and §9.2. Ten taps, or two ×5 runs, empty a bar; that keeps a full bar spendable in two or three minutes (§13.1).

**Type rules pinned for slice 1:**
- **Council** sessions pay **FXP at 1.5× the tier rate** (0.9 per Energy at tier 1: 45 XP / 9 FXP / 20 Iron for 10 Energy) and no opinion. They are party work, the pure-FXP choice against canvassing's opinion.
- **Safe Intelligence** pays XP and Iron only; its Dossier entry arrives with the Dossier (slice 8).
- **Any tier-1 action may check two stats** (the average, §8.4). A street speech is CHA+INT; door-knocking is CHA+INT; dock work is STR. Content mixes the stats so that INT is the most common check, not the only useful one (`docs/design/slice-1-content.md` §2).

### 13.4 Local Standing (new)

Repetition should feel like progress. Each player has a **Local Standing** in every city: how well the people there know your face.

| Standing | Earned by | Effect |
|---|---|---|
| **Stranger → Familiar → Known → Trusted → One of Us** (0–4) | Successful tier-1 and tier-2 actions in that city: **10, 30, 70 and 150 Successes** | +3 % success per level on actions there; at *Known*, some tier-2 missions in that city unlock; at *One of Us*, a small daily PC trickle |

**What counts:** one Success on any **checked** action in the city is one point; Partial, job shifts and training do not count; each row of a ×3 counts on its own. The reference player is *Known* about day 3 and *One of Us* about day 8 at home (`docs/economy.md` §9). Standing never decays. It gives grinding the Mill Gate a point: the tenth canvass in Coalport goes better than the first, and it ties players to their Home City.

### 13.5 Art for missions: the fallback ladder (new)

Missions **never get unique art**. The panel shows the most specific art that exists:

1. **Story art**: only key moments (origin story, Ambition climaxes, season finales). About 15–20 over the game's life.
2. **Location-type scenes**: one per kind of place (bar, hospital, jail, factory gate, docks, market, station, parliament, each faction HQ, street at night). About 25, reused in every city.
3. **Map crop**: a zoomed-in crop of the detailed city map around the location, day or night. Free, and available for every location.
4. **Mission-type cards**: one per type (speech, canvass, propaganda, sabotage, surveillance, social, intelligence, job). About 10.
5. **Portraits**: whenever a named NPC is involved.

Tier 1 needs no art at all. With a finite set of about 60 images, a new mission costs only writing: a setup, the approaches and the outcomes, tagged with a location and a type.

**Location kinds.** Every location has exactly one *kind*, from a closed list. The kind is the key for rung 2 of the ladder (one scene per kind), for the map-crop fallback and for presence text. The list is closed so that art stays finite; a new kind is a design change, not a content change.

| Kind | Where it appears | Kind | Where it appears |
|---|---|---|---|
| `factory-gate` | Mill Gate, pit-heads, the power plant | `hospital` | St. Agnes, city infirmaries |
| `docks` | Dockyard, riverside quays | `jail` | Police cells, the county jail |
| `market` | Market Row, Market Square, the military market | `court` | Courts district, the Supreme Court |
| `station` | Rail stations, the tram junction | `university` | Ashford University, lecture halls |
| `street` | Tenement streets, canvass wards, the street at night | `library` | Reading rooms, the state archives |
| `square` | Rally grounds, forecourts, the town square | `gym` | Boxing clubs, the running track |
| `bar` | The Anchor, workers' bars, society clubs | `barracks` | Vanguard Barracks, the old barracks |
| `hotel` | Lodging houses, the Grand Hotel | `parliament` | Parliament, the Legislative Chamber |
| `press` | Underground Press, the *Herald*, the Press Club | `ministry` | Ministries, police HQ, offices of state |
| `faction-hq` | Each faction's HQ and union hall; the scene is picked by the faction | | |

Nineteen kinds, which fits the "about 25" scenes budgeted above (`faction-hq` needs one per faction). **Final** as of the slice-1 Coalport list, which uses six of them: Mill Gate `factory-gate`, Market Row `market`, Union Hall `faction-hq`, Foundry Row `street`, Harbour Quays `docks`, The Anchor `bar`. Kinds can be added, never removed.

### 13.6 Social missions

| Mission | Requires | Energy | Rewards | Notes |
|---|---|---|---|---|
| Attend the opera | CHA 15 | 6 | +200 XP, INT XP, Dossier entry on a named figure | Weekly |
| University lecture | CHA 12 | 5 | +150 XP, INT XP, unlocks a mission chain | |
| Dinner with a senator | CHA 25, Rank 3 | 8 | +400 XP, +150 FXP, +500 IM, legislation intel, Favour | Weekly per senator |
| Black-tie fundraiser | CHA 30, Rank 4 | 10 | +600 XP, +300 FXP, 10 PC, chance of a unique item | Once per term |
| Diplomatic reception | CHA 35, Rank 5 | 12 | +1,000 XP, +500 FXP, cross-faction intel | Neutral ground |

Contextual dress checks still apply: meeting the threshold with accessories while wearing work clothes fails a formal event.

### 13.7 Party Directives (new)

See §15.4. Directives are the faction's *agenda for the day*, set by the elected Faction Chair. They tell a new player what to do and tie each person's session to the faction's collective plan.

**Directives v1 (slice 1, until a Chair exists).** The NPC party secretary sets them. For the Collective that is **Petra Holm**, Coalport branch secretary (portrait `holm`): brisk and warm, wastes no words, talks in shifts, wards and door counts, never in slogans; signs "— P.H." The other factions get their own secretary when their home cities are built (slice 2).

- Directives are **faction-wide**: every member gets the same three on the same City Day, chosen deterministically from the day number (slot A: a canvass order; slot B: party work such as propaganda, a speech, a committee session or intelligence; slot C: a habit such as the shift, training or "six Successes"), never the same set two days running. No scheduled job is needed.
- The three personal targets together fit in about **60 Energy**, so one session clears them.
- **Progress** counts attempts (Success or Partial) for count-type orders, Successes for the "full day" order, and each row of a ×3.
- The shift order's no-job variant, ***Take a job***, is frozen at the day boundary and **completes the moment a job is taken** (+20 FXP then, shown as one line on the Jobs card; taking a job is not an action and opens no modal). A later switch never undoes it.
- The twelve v1 templates are in `docs/design/slice-1-content.md` §6. When Issues (slice 4) and Campaign Events (slice 6) arrive, the secretary's menu grows to the full §15.4 list.

---

## 14. The City: map, influence and Issues

### 14.1 The five cities

| City | Role | Character | Train from the capital | Key locations |
|---|---|---|---|---|
| **Irongate** (capital) | **Battleground** · 5 districts (§14.9) | The political heart; every faction's HQ is here | — | Parliament, faction HQs, the *Irongate Herald* |
| **Clearwater** | **Battleground** · the swing city | Wealthy suburbs beside a restless working class | 25 min | Society district, tram hub, black market |
| **Ashford** | **Home city** of the Alliance | University town: media, courts, debate | 12 min | University, courts district, Press Club |
| **Coalport** | **Home city** of the Collective | Industrial heartland: factories, docks, workers' councils | 12 min | Steel Mill, dockyard, underground press |
| **Duskwall** | **Home city** of the Vanguard | Garrison city on the border: discipline and checkpoints | 15 min | Vanguard Barracks, state archives, military market |

The cities sit well apart, joined by rail lines through the capital, and the map shows the distance. See §14.10 for travel, §14.11 for home cities and battlegrounds, and §14.12 for visiting an enemy home city.

### 14.2 Influence

Each city has an **influence meter**: three faction shares plus a **Neutral** pool, totalling 100 %. Political missions, events, exposés and resolved Issues move it. Each faction's share drifts **1 % per day toward the city's baseline**, so no battleground is locked forever.

**Home cities are the exception.** The home faction's share can never fall below 50 %, so it always controls its home. There the meter is shown as the faction's **morale** (§14.11).

**How opinion moves.** Every political action has a **swing**: how many points of the city's meter it moves toward the actor's faction. The swing is set per Energy, like the other rewards (§5.5), and halved on Partial.

| Source | Swing | Example |
|---|---|---|
| Tier-1 political action (canvass, propaganda, street speech) | **0.005 points per Energy** | A 10-Energy canvass: **+0.05** on Success, **+0.025** on Partial |
| Tier-2 mission | 0.01 points per Energy; illegal missions ×2 | A 15-Energy exposé: +0.15; a 15-Energy Disruption: +0.3 |
| Tier-3 story, Operation | Set per story, 0.5–2 | |
| Campaign Event | 1–5 by size and outcome (§16.3) | |
| Resolving an Issue | +3 (§14.6) | |

Multipliers on the swing: Issue tag +50 % (§14.6), Battleground +25 % (§14.4), Groundswell up to +30 %, ordinances and laws (§15). Rested and Directives never touch opinion. Tier-2 and tier-3 figures are provisional until slice 4.

**Where the share comes from.**
- **Persuasion** (canvass, speech, propaganda, events, Issues) draws from the **Neutral pool first**. Once Neutral is at its floor, the rest comes from the rival factions **in proportion to their shares**.
- **Actions against a rival** (Disruption, Sabotage, exposés) take the swing from the **target faction**; half goes to the actor's faction and half to Neutral. Voters who leave a party don't all join yours.
- **Floors:** Neutral never falls below **5 %** (there are always undecided voters); a home faction never falls below **50 %** in its home city (§14.11). If nothing can be drawn, the swing shrinks to what can. Shares always sum to 100.
- **Precision:** shares are kept to **three decimals** (0.001 of a point) so that a Partial canvass counts; meters and the ledger show one decimal.
- Every swing is attributed to the player who caused it (the ledger, §14.5).

This puts the reference player (§5.2) at about **+0.8 to +1.2 points a day** from tier-1 play at home (the higher figure in week 1, when almost every tap is political), which is what the ledger line in §3.2 promises. The 1 % daily drift (2 % at home) balances a handful of active players per city; see Appendix C for what happens at scale.

**Build order:** the swing is **written to the city meter from slice 1** (the modal shows the delta to three decimals, trimmed, and the city's new share to one decimal); the drift arrives with the calendar in slice 4 (Appendix C #16).

### 14.3 Control grants access, not multipliers

| State | Condition | Effect |
|---|---|---|
| **Contested** | No faction above 50 % | Standard prices; all missions open; **Battleground bonus** can apply |
| **Control** | Above 50 % | The faction's buildings open (Barracks, Safehouse, Press Club), service prices shift (§19), it holds the council majority most of the time |
| **Dominance** | Above 70 % | Exclusive high-tier missions and cosmetic city dressing (posters, banners, uniforms in text) |

**No reward multiplier ever scales with control.** A faction that holds more cities gets more *places to go*, not more XP or FXP per action. EVE Online's faction warfare showed that multipliers tied to control make winners snowball.

### 14.4 Battleground and Groundswell

- **Battleground:** a city where the top two factions are within 10 points. All political missions there get **+25 % influence and +25 % FXP**, for every faction. The paper marks the week's battlegrounds.
- **Groundswell:** when a faction loses control of a city, it gets **+5 % influence gain per day there, stacking to +30 %**, until it retakes control or 14 days pass. In the fiction, public sympathy turns toward whoever was just pushed out.

### 14.5 The Influence Ledger and City Hero

- **Ledger:** every influence change is attributed to the player who caused it. Each player sees a line for every city: *"This cycle you moved Clearwater +2.3 % for the Red Collective (4th of 61)."*
- **City Hero:** at the end of each council cycle, the top contributor **in each level bracket** (1–15, 16–30, 31+) in each city becomes City Hero. That's 15 heroes per cycle. Rewards: a medal on your profile, 25 PC, Legacy, and a line in the Morning Paper.
- **Faction ledger:** the faction screen ranks members by contribution this cycle and this season, so contribution is visible without third-party tools.

### 14.6 Issues of the Week (new)

This is Irongate's signature mechanic. **Every city has two live public concerns each week.** They give each day a different shape and turn influence into an argument about something.

**How they work:**
1. Every Monday, each city draws 2 Issues from a deck. The draw is weighted by the city's character, the weather season, laws in force and last week's events.
2. Each faction has a **stance** on each Issue, which is flavour text for its missions.
3. Missions and events **tagged with an Issue** in that city give **+50 % influence** and add that faction's **Issue Momentum**.
4. **Resolution:** at week's end, or early if one faction reaches the momentum threshold, the leading faction **owns the Issue**. It gains +3 % influence in the city and a headline, its top 5 contributors split 20 PC, and a small **city effect** applies for the next week.

| Issue | Typical trigger | Vanguard stance | Collective stance | Alliance stance | Effect if resolved |
|---|---|---|---|---|---|
| Bread Prices | Winter, poor harvest | Arrest the speculators | Price controls, bread lines | Subsidy bill | Street food −25 % |
| Strike at the Mill | Coalport, labour laws | Break the strike | Support the strikers | Mediate | Factory job pay ±15 % |
| Crime Wave | High average Heat | Curfews and patrols | Jobs, not jails | Police reform | Police encounters ±10 % |
| Flu Outbreak | Autumn, winter | Quarantine the docks | Free clinics | Public health board | Hospital costs ±25 % |
| Housing Shortage | Clearwater, Coalport | Clear the slums | Rent strikes | Building programme | Lodging cost ±50 % |
| Press Censorship | Dress Code or Propaganda laws | Suppress "subversive" papers | Underground press | Free press campaign | Exposé strength ±25 % |
| Border Incident | Duskwall, random | Mobilise | Peace rallies | Diplomacy | Journeys to Duskwall ±25 % time |
| Tram Fare Hike | Clearwater, Irongate | Make the trams run on time | Fare boycott | Consumer inquiry | Tickets from the city ±50 % |
| Corruption Scandal | After a Blackmail or Exposé | Purge the traitors | Expose the elite | Independent inquiry | Bribe costs ±25 % |
| Unemployment | After a factory closure | Public works under discipline | Workers' co-ops | Retraining scheme | Job pay +10 % |
| University Protests | Ashford, spring | Close the campus | Join the students | Open debate | Lecture rewards +25 % |
| Heatwave Riots | Summer heatwave | Restore order | Water for the districts | Emergency relief | Encounter aggression ±10 % |

The deck grows with live content. Each Political Season adds new Issues (§22).

### 14.7 Weather

Weather is rolled **per city, per City Day**, using seasonal probabilities. It changes mission odds and flavour and never blocks an action.

| Season | Weather | Effects |
|---|---|---|
| Spring | Rain 40 %, clear 60 % | Rain: −10 % success outdoors without outerwear. Clear: +5 % propaganda success |
| Summer | Clear 80 %, heatwave 20 % | Heatwave: +10 % encounter aggression; outdoor rallies +15 % influence |
| Autumn | Rain 50 %, fog 30 %, clear 20 % | Fog: +10 % stealth success; Disruption harder to trace (−5 caught) |
| Winter | Snow 50 %, frost 30 %, clear 20 % | Snow: journeys +25 % time. Frost: −10 % success outdoors without a winter coat |

Weather has no HP penalties; the right outerwear gives **Weatherproof**, which removes the penalties.

### 14.8 National Control

| City | Weight | How it's decided |
|---|---|---|
| Irongate | **40 %** | Three-way battle, the average of its five districts |
| Clearwater | **30 %** | Three-way battle |
| Ashford | 10 % | The Alliance's home: its share is its morale (never below 50 %) |
| Coalport | 10 % | The Collective's home: its share is its morale (never below 50 %) |
| Duskwall | 10 % | The Vanguard's home: its share is its morale (never below 50 %) |

**National Control** is each faction's weighted average influence across the five cities. It feeds national elections (§15.5) and the size of each faction's bloc in the Legislature.

**About 70 % of national power is won in the two battlegrounds.** The equal 10 % home weights give each faction the same baseline, 5–10 % depending on morale, so no faction starts ahead.

### 14.9 Capital districts (new)

Irongate is the only city split into districts. It's worth 40 % of the nation and every faction's HQ is here, so it deserves more than one meter. Districts give the capital several battlegrounds at once, and give each faction home ground inside it.

| District | Character | Key locations | Leans |
|---|---|---|---|
| **Government Quarter** | Stone ministries, the forecourt, lawyers and lobbyists | Parliament, ministries, the Supreme Court | Neutral; the hardest to hold |
| **Old Town** | Cobbles, cafés, the press and the theatre | The *Irongate Herald*, the opera, the Press Club, Alliance HQ, St. Agnes Hospital | Alliance |
| **Station & Market** | Crowds, trams, traders and hotels | Central Station, Market Square, the tram junction, the Grand Hotel | Swing |
| **Eastside** | Tenements, workshops, the riverside warehouses | Collective HQ, workers' bars, the riverside quays | Collective |
| **Garrison Hill** | Police headquarters, old barracks, officers' villas | Vanguard House, police HQ, the old barracks | Vanguard |

**How districts work:**
- **Opinion:** each district has its own opinion meter. Irongate's city opinion is the **equal average of the five** and feeds National Control as before.
- **Control:** the same thresholds as cities (§14.3): above 50 % controls, above 70 % dominates. Control gives access, never multipliers: the faction's safehouse and prices in that district, its posters on the walls, and **police who answer to it**. Rivals of the controlling faction gain Heat 25 % faster there.
- **Battleground and Groundswell** apply per district.
- **Issues:** each of the capital's two weekly Issues is tied to a district, e.g. *Eviction Notices in Eastside* or *Press Raids in Old Town*.
- **Recognition:** the capital awards **District Hero** per district instead of one City Hero.
- **Council:** the Irongate council has **10 seats, 2 per district**, elected by that district's residents with the usual formula (50 % player votes + 50 % district opinion). The top-voted councillor of the largest bloc is **Mayor of Irongate** (the capital's Governor).
- **Moving around:** trams between districts are instant and free. Only journeys between cities take time.
- **On the map:** the capital gets a large map, about twice the area of the other close-ups, where each district's architecture is recognisable at a glance. District borders and control are drawn as an interface overlay on neutral art, so the map never needs repainting.

Other cities stay single-meter in MVP. Two or three districts for Coalport or Clearwater could come later if the capital works.

### 14.10 Travel and journeys (new)

The cities are far apart. **Travelling between them takes real time**, so where you are matters: your Home City, where the Campaign Event is tonight, which patron you're courting.

**Journey times (from Irongate):**

| To | Third-class train | Car |
|---|---|---|
| Ashford | 12 min | 7 min |
| Coalport | 12 min | 7 min |
| Duskwall | 15 min | 9 min |
| Clearwater | 25 min | 15 min |

Journeys between two outer cities run through the capital: the two legs added together.

**Ways to travel:**

| Mode | Cost | Notes |
|---|---|---|
| **Third class** | 20 IM | The standard. Uses the ordinary journey events |
| **First class** | 80 IM, CHA 15 dress check | Same time; the society event deck (patrons, officials); +20 Rested on arrival |
| **Car** | Hire 150 IM, or own one (5,000 IM, Level 16) | About 40 % faster; road events (checkpoints, breakdowns); slowed by snow |
| **Night train** | 60 IM; departs 22:00–01:00 | Arrives at 06:00 with +50 Rested. Made for players who log in once a day |

**Rules:**
- **Travel costs a ticket and time, never Energy.** Energy keeps refilling on the way.
- **The journey runs in the background.** You can close the game and you arrive anyway. On the way you can read the Paper, sort the Dossier, chat and vote, but not run missions or take part in events.
- You can cancel before departure, not once the train has left.
- Scheduled Campaign Events show a **"leave by"** time for players in other cities.
- Modifiers: snow +25 % time; the Open Borders law −25 %; the Tram Subsidy ordinance halves ticket prices from that city. Entering a Vanguard-controlled city adds a **checkpoint** on about half of journeys.
- **A journey into an enemy home city always triggers an event**, from the hostile-ground deck (§14.12).
- **No journey takes more than 30 minutes**, except the night train. The NPC default Directives favour the player's current city and the capital, so the daily loop never forces a trip.

**Journey events.** On about one trip in three, a card appears during the journey. It's always optional; ignore it and you "slept through it", with a neutral outcome.

| Event | Needs | Choice and outcome |
|---|---|---|
| **Papers, please** | Checkpoint | Show papers (Heat and Criminal Record checked), bluff (CHA), or use forged papers (utility item) |
| **A talkative passenger** | — | Listen: a free Dossier entry, sometimes on a named NPC |
| **The parcel** | Third class, car | Carry a stranger's parcel: Iron, at the cost of +10 Heat if it's searched |
| **First-class company** | First class | A patron or official in your compartment: Favour, or a legislation rumour |
| **Leaflets on the seats** | — | Swap them for your own: a small opinion gain in the destination city |
| **Breakdown** | Car, snow | Wait (+5 min), fix it (STR or INT), or hitch a ride (a new Dossier contact) |
| **The night train** | Night train | Sleeper-car storylets for your Ambition |

**Fellow travellers:** the journey screen lists other players on the same train ("On the 14:10 to Coalport: 2 Collective, 1 Vanguard") and opens a carriage chat for the trip.

### 14.11 Home cities and battlegrounds (new)

Each faction has a **home city** it can never lose. Power is won or lost in the two **battlegrounds**.

| | Home city | Battleground |
|---|---|---|
| **Which** | Duskwall (Vanguard), Coalport (Collective), Ashford (Alliance) | Irongate (5 districts), Clearwater |
| **Control** | Always the home faction's (never below 50 %) | Three-way contest (§14.3–14.4) |
| **Who lives there** | New players of that faction, and anyone who chooses to stay | Players of any faction who have moved there (Rank 3+) |
| **Council elections** | **Within the faction**: its own candidates and party wings compete for the seats | Three-way, the usual formula (§15.3) |
| **Safety** | Safe for its own faction; hostile ground for rivals (§14.12) | Normal: encounters from tier 2 and 3 only |
| **National weight** | 10 % each | Irongate 40 %, Clearwater 30 % |

**Why it works:**
- **A clear first week.** New players start among their own people, in their faction's own atmosphere, with the police on their side. Each faction's first week has its own tone.
- **Concentrated conflict.** Every rally, exposé and vote in the battlegrounds matters, and the three factions actually meet there.
- **A natural ladder:** home city, then a battleground, then the nation.
- **No faction can be wiped out.** Losing the capital hurts, but there is always a home to rebuild from.

**Home cities stay alive through two things:**
- **Morale.** The home faction's share in its home city is its **morale**. Rival spy actions (§14.12), unresolved Issues and neglect lower it. **Keeping your base fired up is a job.** Morale never falls below 50 %, so a faction never loses its home, but low morale has real consequences (see *Morale states* below).
- **Politics within the party.** Home council seats are contested between members of the same faction: rival candidates, party wings, endorsements. The primary is where a new player first competes.

**Why a home city is never lost.** New players start there, so an enemy-held home would make a terrible first day. Losing a home would also snowball (fewer new players, a weaker faction, more losses) and invite coordinated griefing. So the floor stays, and neglect is punished through morale states instead.

**Morale states:**

| Morale | State | Effects |
|---|---|---|
| **80–100 %** | **Fired up** | +5 % Faction XP on actions at home · more NPC volunteers at Campaign Events · the full 10 % national weight |
| **60–79 %** | **Steady** | Normal |
| **50–59 %** | **Unrest** | A **crisis** (below) |

**A crisis is an event, not a loss:**
- **Announced** in every Morning Paper: *"Unrest in Coalport: dockers question the party."*
- **The Chair's Directives switch** to *Restore the base*; players who help earn extra Faction XP and Legacy.
- **Consequences while it lasts:**
  - the home city counts for only 5 % of the faction's national weight
  - rival spy missions there pay more
  - NPC councillors from that city may **defect** in the next Legislature vote
  - the Faction Chair faces an automatic confidence vote among members
- **The way out:** get morale back above 60 %. A *"Coalport stands firm"* headline and a Legacy entry go to everyone who helped.

**Guardrails:**
- **Rival pressure is capped per day.** A raid squad can cause a crisis but can't keep one going forever.
- **Home morale recovers faster** than battleground opinion: it drifts toward 70 % at 2 % a day, against 1 % a day elsewhere.

**Baselines.** Each meter starts a season at its baseline and drifts back toward it (§14.2, §22.2). Home cities start at the 70 % drift target, with the rest split so that the undecided outnumber either rival. Coalport is pinned for slice 0; the others are provisional until slice 4.

| City or district | Vanguard | Collective | Alliance | Neutral |
|---|---|---|---|---|
| **Coalport** (Collective home) | 9 | **70** | 6 | 15 |
| Duskwall (Vanguard home) | **70** | 6 | 9 | 15 |
| Ashford (Alliance home) | 6 | 9 | **70** | 15 |
| Clearwater | 20 | 24 | 24 | 32 |
| Irongate: Government Quarter | 20 | 20 | 20 | 40 |
| Irongate: Old Town | 15 | 15 | 35 | 35 |
| Irongate: Station & Market | 20 | 20 | 20 | 40 |
| Irongate: Eastside | 15 | 35 | 15 | 35 |
| Irongate: Garrison Hill | 35 | 15 | 15 | 35 |

In Coalport the Vanguard sits above the Alliance because the Vanguard recruits in industrial towns (§16.1); Ashford is the mirror. The Alliance's home has the Collective as the stronger rival for the same reason.

**The one exception:** a rare **Season Twist**, *The Uprising* (§22.3), where for one season a home city really can be contested. It is announced a week ahead and applies equally to everyone.

### 14.12 Hostile ground: enemy home cities (new)

A player can travel to a rival faction's home city and act there. It is the most dangerous place in the game and pays the best.

**Danger by city:**

| Where | Journey | Tier-1 actions | Tier-2 missions | Heat gain |
|---|---|---|---|---|
| Your home city | Safe | No encounters | Normal | Normal |
| A battleground | Occasional event | No encounters | Normal encounter chance | Normal |
| **An enemy home city** | **Always an event** | **10–20 % encounter** | **Encounter chance ×2** | **×2** |

**Journey events on the way in** (the hostile-ground deck):

| Event | Choices |
|---|---|
| **Checkpoint** | Show papers (Heat and record checked) · bluff (CHA) · forged papers · pay |
| **Informer in the carriage** | Lose him (AGI) · feed him false information (INT, and you gain a Dossier entry) · ignore him and arrive *Watched* (+10 % encounters for the day) |
| **Your name is on a list** (high Heat only) | Get off a stop early and walk in · risk the station |
| **A friendly conductor** | He warns you which platform is watched, or passes you a local contact |

**Encounters in the city** interrupt a result as a popup. Most are not fights:

| Encounter | Choices |
|---|---|
| **Police stop** | Papers · bribe · bluff (CHA) · run (AGI) |
| **You've been recognised** | Walk away calmly · talk your way out · lose them in the crowd |
| **Local toughs** | Fight (STR) · flee (AGI) · pay them off |
| **A disillusioned local** (opportunity) | Recruit them for your faction (FXP) · turn them into an informant (a Dossier source) |
| **A leaked document** (opportunity) | Take it (+Heat, rare intel) · leave it |

**Fame is dangerous.** The chance of being *recognised* grows with your Legacy and any office you hold. A new player walks through Duskwall unnoticed; a sitting councillor is spotted at the station. That makes going undercover a late-game skill:
- **Plain clothes.** Low CHA is good here: swap the suit for work clothes and you blend in.
- **Forged papers** (a utility item).
- **Safehouses.** Your faction's underground cell in each enemy home city (Rank 3+): Heat cools there and your odds improve.
- **Bodyguards and night travel**: fewer checkpoints, but the risk of curfew.

**Rewards behind the lines:**
- **+50 % Faction XP** on all actions there.
- **Morale damage**: actions there lower the rival faction's home morale, and so its national score.
- **Missions you can only do there**, such as stealing a rival party's membership rolls, or photographing a minister meeting the wrong people. These feed exposés (§10.4).
- **Rare Dossier entries** on rival officials.

**If it goes wrong:**
- **Arrested**: jail in *their* city, with longer sentences and double bail.
- **Deported**: put on the next train home, with no travel to that city for 24 h.
- **Hospital** if you lose a fight, as anywhere.

You can't live or stand for office in an enemy home city.

---

## 15. The Political Engine

This is what the game is about. The rule of v3.1: **politics runs on a calendar, there's always a government, and every rank above 1 has something political to do.**

### 15.1 Offices

| Office | Seats | Term | Elected by | Who can stand (the ladder) | Powers |
|---|---|---|---|---|---|
| **City Councillor** | 7 per city, 10 in Irongate (2 per district): 38 | 5 days | Residents of that city or district (Rank 2+) | Rank 3 · resident · *Known* Local Standing there (§13.4) · endorsed by 2 faction members | Vote on the city ordinance |
| **Governor** (Mayor, in Irongate) | 1 per city (5) | 5 days | The top-voted councillor of the largest bloc | Must have **completed a council term** before | Chooses which ordinance goes to the vote; once per term, a **Governor's Address** (+Issue momentum) |
| **Faction Chair** | 1 per faction (3) | 28 days | Faction members, Rank 2+ | Rank 4 · a completed council term · 14 days in faction | Sets Party Directives; schedules faction-wide Campaign Events; NPC whip |
| **Deputy** (Legislature) | 60 | 28 days | National ballot (faction list) | Rank 5 · a term as **Governor or Mayor**, or **3 council terms** | Propose and vote on laws; no-confidence motions |
| **Minister** | 3–4 | Serves at the head's pleasure | Appointed | Rank 5 · a term as **deputy or Governor** | Adjusts one bounded setting in their ministry each week |
| **Speaker** | 1 | 28 days | Deputies | Rank 6 · a sitting deputy | Sets the order of votes; breaks ties |
| **President / Chancellor** | 1 | 28 days, max 2 in a row | National ballot | Rank 6 · a **full term as deputy or minister** · won their faction's primary | Laws, appointments, veto (President only) |

That's **about 111 offices every term**. With council terms of 5 days, **38 council seats turn over 5–6 times per term.**

**The ladder of office.** Like the Roman *cursus honorum*, **you can't skip a rung**: each office needs a completed term in the office below it. Rank gives the right to stand; the ladder gives the experience. The result:
- a player's **first seat comes in week 2 at the earliest**, and at scale it's a contest, not a certainty (a faction may have 20 players wanting 2 seats in a district);
- **Governor or Mayor** comes in month 2, the **Legislature** at the end of season 1, and the **head of government** from season 2 for most players;
- **every rung is a new kind of play**: voting on ordinances, then choosing them, then writing national law, then running the country;
- **power is never permanent**: terms end and seats must be won again, so the political game never "finishes".

### 15.2 Integrity rules

- One account per person. Accounts on the same network can't vote in the same election or endorse each other.
- Results stay **provisional for 24 h** while admins audit for multi-accounting.
- Voters need **7 days** in their faction. National candidates need **14 days**.
- Switching faction (paid token) vacates all offices, resets tenure, and halves your PC.
- Nothing political is for sale: no votes, PC, influence, offices or endorsements for money.

### 15.3 City Councils

- **Calendar:** each city votes once every 5 days, staggered, so **a council election happens somewhere every day**: Irongate, then Ashford, Coalport, Duskwall, Clearwater, and round again.
- **Nominations** close at 12:00 the day before. Polls are open for the whole City Day.
- **Seat allocation in battlegrounds:** each faction's score = **50 % player votes + 50 % city influence**. Seats are allocated proportionally (D'Hondt method). Within a faction, seats go to its candidates in order of personal votes. **Seats with no player candidate go to NPC councillors** (§15.10). In Irongate the same count runs separately in each district for its 2 seats, using district opinion.
- **Seat allocation in home cities** (§14.11): all 7 seats belong to the home faction. They go to its candidates in order of personal votes from resident faction members, so the race is between members of the same party. Rivals can't live or stand there.
- **Ordinance:** each council passes **one ordinance per term** from a fixed menu. Ordinances apply to **every** player in the city, regardless of faction.

| Ordinance | Effect in the city (for 5 days) |
|---|---|
| Street Permits | Propaganda influence ±15 % |
| Police Patrols | Heat gained ±25 %; police encounters ±10 % |
| Rent Control | Lodging −50 % |
| Market Tax | Food and clothing prices ±15 % |
| Public Works | Job pay +10 % |
| Clinic Funding | Hospital costs −25 % |
| Tram Subsidy | Train and car-hire tickets from the city −50 % |
| Press Freedom / Press Licensing | Exposé strength and Dossier sale value ±25 % |
| Festival Permit | Social mission CHA thresholds −3 |
| Curfew | Night encounter chance +50 %; Disruption caught chance +10 % |

### 15.4 Faction Chair and Party Directives

- The **Faction Chair** is elected every 28 days by the faction's Rank 2+ members.
- Every City Day, the Chair sets up to **3 Party Directives** from a menu: canvass [city], address [Issue] in [city], gather intel in [city], support [event], turn out the vote in [city], disrupt [rival] in [city]. Each has a group target and a personal target.
- Members get **+25 % FXP on matching actions while the order is open** (on the action's base FXP, rounded per line, Partial included; never XP, Iron or opinion), **+20 FXP** the moment a personal target is reached, and **+5 PC** when all three are complete. The completing row gets the +25 %; nothing after it does, including later rows of the same ×3. The ticket tag reads *Party order 2 / 3 · +25 % FXP* while open and *Order done* after. This keeps Directives at about 30 % of daily FXP (`docs/economy.md` §10) whatever the player's volume.
- Directives **refresh at the 00:00 UTC boundary** (§2.2). Unfinished orders are gone; nothing is taken away and there is no catch-up.
- If the faction has no Chair, or the Chair sets nothing by 06:00, an **NPC party secretary** (§13.7) issues sensible defaults based on battlegrounds and Issues.
- Directives do the tutorial's job: a new player always knows the most useful thing to do today.

### 15.5 National elections

- **Calendar:** days 28, 56 and 84 of each season. Day 84 is the **Season Election**.
- **Primaries** (days 25–26): each faction's Rank 2+ members pick **one candidate** from its declared candidates who qualify under the office ladder (§15.1). The Vanguard calls this *the Acclamation*, the Collective *the Congress*, the Alliance *the Convention*.
- **Campaign** (days 26–27): candidates publish a platform by pledging **2 laws** from the law menu. A pledge kept earns Legacy. Candidates, supporters and patrons can **endorse** (10 PC, +1 % score, up to +5 %).
- **Election day** (day 28): all Rank 2+ players vote.
- **Score:** **50 % popular vote share + 50 % National Control share**, plus endorsements and the candidate's CHA and Legacy appeal (up to +5 %). This link is how everyday missions win elections.
- **Outcome:**
  - The winner scores **55 % or more** → **President** (full powers).
  - The winner scores **less than 55 %** → **Chancellor** (limited powers; must form a coalition).
- **Legislature:** the 60 seats are split by the same scores. Each faction's seats go to its ladder-eligible list candidates in order of preference votes. The rest are **NPC deputies**.
- Takes office 24 h after polls close, once the audit is done.

| Power | President | Chancellor |
|---|---|---|
| Propose laws | 1 per week | 1 per 2 weeks |
| Veto | Yes (the Legislature can override with 2/3) | No |
| Ministers | 4, any faction | 3, **at least 1 from another faction** |
| Cultural Decree (a seasonal dress code for one term) | Once per term | No |
| Stipend | 50 PC/day | 40 PC/day |

### 15.6 The Legislature

- **Always sitting.** Seats are refreshed at every national election, whether or not anyone won a majority.
- **Proposals:** the head of government (see above); each Minister 1 per term within their ministry; any deputy 1 per term with 5 co-sponsors.
- **Voting:** a 24 h window. Laws pass by **simple majority**. **Factional laws**, whose effects differ by faction, need **60 %**.
- **Limit:** at most 5 national laws in force at once. A new law can replace an old one by explicit repeal.

### 15.7 Ministers

| Ministry | Setting (adjusted once per week, within bounds) |
|---|---|
| **Interior** | Police encounter chance ±10 %; Heat cooling rate ±20 % |
| **Labour** | Job pay ±10 %; work streak cap ±5 % |
| **Health** | Hospital costs ±25 %; HP regen ±20 % |
| **Culture & Press** | Social mission CHA thresholds ±3; propaganda influence ±10 % |
| *Treasury* (v1.2) | *Faction treasury and public spending* |

### 15.8 Laws

**Every law has fixed bounds.** Laws adjust settings; they can never break the game. Carried over from v3.0 with limits added:

| Category | Example | Effect (bounded) | Duration | Factional? |
|---|---|---|---|---|
| Energy | Emergency Conscription Act (Vanguard) | Missions +2 Energy for non-Vanguard players (max +2) | 14 days | Yes, needs 60 % |
| XP | People's Education Decree (Collective) | Mission XP +15 % for all (max +20 %) | 7 days | No |
| Economy | Free Market Charter (Alliance) | Iron earned +10 % for all (max +15 %) | 30 days | No |
| Order | Curfew Order (Vanguard) | Night encounter chance ×2 (max ×2) | 7 days | No |
| Health | Universal Care Act (Collective) | Hospital costs −50 % (max −50 %) | 21 days | No |
| Travel | Open Borders Policy (Alliance) | Journeys between cities −25 % time; no checkpoints (max −25 %) | 14 days | No |
| Influence | Propaganda Ban (Alliance) | Propaganda influence −25 % (max −25 %) | 7 days | No |
| Culture | Cultural Enrichment Act (Alliance) | Social XP +20 %; CHA thresholds −3 | 14 days | No |
| Justice | Rehabilitation Act (Alliance) | All records one level lower | 21 days | No |
| Dress | Dress Code Mandate (Vanguard) | CHA 10 minimum to enter venues in controlled cities | 7 days | Yes, needs 60 % |
| Labour | Eight-Hour Day (Collective) | Job shifts −1 Energy; salary +10 % | 14 days | No |
| Order | Special Powers Act (Vanguard) | Heat cools +50 % for Vanguard; Disruption against Vanguard +10 caught | 7 days | Yes, needs 60 % |

### 15.9 Recall, no-confidence and impeachment

- **Recall Petition (city):** if 10 residents (any faction, Rank 2+, 10 PC each) sign within 24 h, the city holds a **snap council election** the next day. One per city every 7 days. This is the political way to push back against a dominant faction.
- **General Strike or Mass Rally:** Campaign Events (§16.3) that can add Recall signatures and Groundswell.
- **No-confidence:** a motion by 20 deputies (50 PC each), or **automatic** if the head's faction falls below **35 % National Control**. It passes with **2/3** of the Legislature. The runner-up of the last election takes office for the rest of the term (Chancellor powers). 7-day cooldown; not allowed in the last 3 days of a term.

### 15.10 NPC fill: politics at any population

Politics has to work with 50 players or 50,000:
- **NPC candidates and office-holders** fill any seat no player wins. They're named characters: some of them are Dossier targets and patrons' allies.
- **NPC deputies and councillors** vote with the majority of their faction's player members, or follow the Faction Chair's whip if their faction has none. With no whip either, they abstain.
- **The influence half of every election score** plays the part of the NPC electorate, so mission work counts even when few players vote.
- The ratio of NPCs to players is shown openly ("NPC seats: 38 / 60"), so a growing player base can see itself taking over.

---

## 16. Factions and co-op

### 16.1 The three factions

**The Iron Vanguard (Fascists).** A paramilitary movement that believes strength, order and national purity are the only way forward. Its strongholds are the industrial outer cities, held through discipline and hierarchy.
- Starting bonus: +3 STR
- Legislation style: order, curfews, costs for the opposition
- Signature event: **Torchlight March**
- Exclusive location: **Vanguard Barracks** (faster STR/AGI training, cheaper bodyguards, military market)

**The Red Collective (Communists).** A grassroots movement that wants the working class to take Irongate's industries from a corrupt elite. It works through solidarity, underground networks and collective action.
- Starting bonus: +2 STR +1 INT
- Legislation style: cheaper Energy and more XP for everyone, labour protections, taxes on the rich
- Signature event: **General Strike**
- Exclusive location: **Underground Press** (propaganda at double speed, the union intelligence network)

**The Civic Alliance (Democrats).** A centrist coalition that believes lasting change comes through elections, institutions and public opinion. It works in the open, through the press, diplomacy and the courts.
- Starting bonus: +3 INT
- Legislation style: voting rights, cheaper healthcare, curbs on propaganda
- Signature event: **Headline Story** (needs a Case File)
- Exclusive location: **Press Club** (unlisted jobs, journalist intel)

The factions are fictional and stylised. They're game constructs, not endorsements (see §26).

### 16.2 Faction chat and presence (moved into MVP)

- **Faction chat** with channels: general, per city, and officers (Rank 4+).
- **Presence:** every location shows who's there, e.g. *"In the Anchor Bar: 3 Collective, 1 Alliance, 2 strangers."* Clicking a name opens their public profile.
- **Favours between players:** bail out a faction mate from jail, visit them in hospital, or give them a spot in your Campaign Event.

### 16.3 Campaign Events (new)

This is co-op politics: short, scheduled events that faction members fill together.

- **Scheduling:** Rank 3+ members schedule an event in a city, **1 to 12 hours ahead**. The Faction Chair can schedule them faction-wide. Limit: one per faction per city every 4 hours.
- **Roles:** 3–5 slots. Signing up commits the role's Energy (10–20). Each role rolls its own stat check, and **every role matters**.
- **Resolution:** at the start time the event resolves automatically. **Nobody needs to be online**: signing up is the commitment. Empty roles go to **NPC volunteers at half strength**, and the result waits for every participant as a result modal and in the next Morning Paper.
- **Outcomes:** Triumph, Success, Mixed or Fiasco. They decide the influence swing (scaled by event size and Issue match), FXP, PC (3–15), Issue momentum, and a headline.

| Event | Roles | Checks | Notes |
|---|---|---|---|
| **Rally** | Speaker, Organiser, Security, Press | CHA+INT, INT, STR, INT | All factions; strong on Issues |
| **Canvass Drive** | 3–5 Canvassers, a Coordinator | CHA, INT | Low risk, steady influence; good for new players |
| **Town Hall** | Moderator, 2 Speakers, Press | INT, CHA, INT | Adds Recall signatures in the city |
| **Torchlight March** (Vanguard) | Standard-bearer, Drummer, 2 Marshals, Lookout | CHA, STR, STR, AGI | Big swing; +Heat for participants in rival-held cities |
| **General Strike** (Collective) | Shop Steward, Picket Captain, Printer, Runner | CHA, STR, INT, AGI | Suspends factory jobs in the city for 1 day; strong Groundswell |
| **Headline Story** (Alliance) | Reporter, Editor, Source-handler, Lawyer | INT, INT, AGI, INT | Needs a Case File; biggest single swing against a rival |

- Each player can sign up for **3 events per City Day**.
- *v1.1:* **Counter-Demonstrations**, where a rival faction schedules into the same window to cut the swing.

---

## 17. The personal story: Ambitions, Patronage, Legacy

### 17.1 Ambitions (new)

The father's last request (§7.2) sets a **personal storyline that runs for months**, separate from the faction. It gives the player a reason to care about the city that isn't just numbers.

| Ambition | Premise | Main systems | Ending |
|---|---|---|---|
| **Clear His Name** | Your father went to prison for the Mill Fire of '19. He didn't set it. | Dossier, Case Files, exposés | Expose the real culprit, now a senator |
| **Settle His Debts** | He owed the Clearwater syndicate, and they've come for you. | Iron, Heat, the Black Market, patrons | Pay, betray or take over the syndicate |
| **Finish His Work** | He was a councillor who lost everything in one election. | Campaigning, offices, speeches | Win a seat in the Legislature under his name |

- **12 chapters** per Ambition. A chapter unlocks when its requirements are met (a level, an office, a Case File), **at most one every 7 days**.
- **Live content:** new chapters and side stories every term (28 days).
- Rewards: unique items and outfits, patron introductions, Legacy, and one-off influence events.
- Ambitions work for any faction; the storylines play out differently depending on which one you joined.

### 17.2 Patronage (new)

Each city has a powerful NPC patron who can be cultivated **over real days**. This is Irongate's slow timer: a relationship to tend rather than a course to wait out.

| Patron | City | Leans | Nature |
|---|---|---|---|
| **Edith Crane**, owner of the *Irongate Herald* | Irongate | Neutral | Media and headlines |
| **Senator Aurelia Voss** | Ashford | Alliance | Law, courts, respectability |
| **Mikhail "Misha" Draganov**, dockworkers' union boss | Coalport | Collective | Labour and crowds |
| **Colonel Anton Reinholt**, garrison commander | Duskwall | Vanguard | Order, the police, the archives |
| **Julius Marr**, banker | Clearwater | Neutral | Money, the underworld, society |

**Favour (0–100)** grows through patron **Requests** (1 every 2 days, hold up to 2), gifts (1 a day), social missions and Ambition chapters. **Favour never decays**; unanswered Requests simply expire. You can cultivate **2 active patrons** at a time and change them weekly.

| Tier | Favour | Perks |
|---|---|---|
| Acquaintance | 10 | Letters and gossip: Dossier hints in the Morning Paper |
| Associate | 30 | **Introductions**: unique mission chains; Recruit Informant |
| Confidant | 60 | **A favour once a week** (15–40 PC): Crane plants a headline; Voss expunges a record point; Draganov fills 2 event roles at full strength; Reinholt cuts your Heat by 30; Marr grants a loan or Black Market access |
| Protégé | 90 | **Endorsement**: +2 % to your council score or +1 % national; a unique outfit piece |

You can court a patron who leans toward a rival faction. It's slower (Favour gains halved), but it opens cross-faction intel and missions.

### 17.3 Legacy (new)

**Legacy** is your permanent public political record, shown on your profile. It replaces a generic achievement system.

| Entry | Legacy points |
|---|---|
| City Hero | 2 |
| Council term served | 3 |
| Issue resolved (top 5) | 2 |
| Pledged law passed (§15.5) | 10 |
| Term as Minister / Speaker / Chair | 10 |
| Term as Chancellor / President | 25 / 40 |
| Ambition completed | 30 |
| Survived a no-confidence vote | 10 |
| Season Champion faction (member) | 5 |

**Legacy perks** are bought with Legacy points. They're permanent and deliberately small:
- +5 % FXP
- +1 Dossier slot, twice
- Rested cap +50
- −1 Energy on Canvassing
- +1 % personal vote appeal, up to 3
- A second job shift once a week
- Patron Favour +10 %
- Heat cools +10 %

### 17.4 A home of your own (new)

Where you sleep is a long-term goal, a status symbol and an Iron sink. It gives no combat power.

| Home | Cost | Where | Gives |
|---|---|---|---|
| **A rented room** | Free (the starting home) | Any city you live in | Somewhere to sleep; +10 Rested a night |
| **A flat** | 2,500 IM + 150 IM a week | Any city | +25 Rested a night; a wardrobe for 3 outfits; +2 CHA at home events |
| **A townhouse** | 25,000 IM + 800 IM a week | Home or battleground city | +50 Rested; host small events (a Campaign Event venue); a patron can visit you (Favour +10 %) |
| **A villa** (Clearwater or Garrison Hill) | 150,000 IM + 3,000 IM a week | Clearwater, or Irongate's Garrison Hill | +75 Rested; host society dinners (social missions at home); shown on your public profile; Legacy |

- The weekly cost is prepaid, like bodyguard contracts (§12.1). If it runs out you drop back to a rented room; **nothing is taken away**, and your home waits for you to pay again.
- A home belongs to one city. Moving city means renting again, so moving is a real decision.
- The map shows your home as a small marker, so you can see where your faction mates live.

---

## 18. Economy

### 18.1 Principle

**Baseline income is higher than baseline cost.** A player who never spends anything still progresses. Iron sinks are **optional acceleration**, and the choice of how to spend Iron is part of the game.

### 18.2 Income (reference player, per City Day)

| Stage | Missions | Job | Other | Total |
|---|---|---|---|---|
| Week 1 (T1–T2) | ~800–1,600 | 80–300 | Dossier sales, events | **~1,000–2,000** |
| Month 1 (T3) | ~2,800 | 350–800 | | **~3,500** |
| Month 3 (T4) | ~4,800 | 900–2,500 | | **~6,000–7,500** |

### 18.3 Sinks

| Sink | Cost | Kind |
|---|---|---|
| Meals and lodging (buffs) | 50–1,500 | Acceleration |
| Clothing and wardrobe (CHA) | 200–50,000 | Access and status |
| Equipment and crafting | Varies by tier | Power |
| Bodyguard contracts | 350–5,600 per week | Safety |
| Bribes and bail | 500–2,000 per point | Recovery |
| Train and car tickets, a car of your own | 20–150 IM per journey; 5,000 IM for a car | Mobility |
| Home City moves | 500 IM | Mobility |
| A home (§17.4): flat, townhouse, villa | 2,500–150,000 IM, plus a weekly cost | Status and comfort |
| Patron gifts | 100–5,000 | Relationship |
| Faction store and Black Market | Varies | Power and access |

### 18.4 Later (v1.2)

Player-to-player trading, a **faction treasury** with spending caps and a public audit log (to prevent the treasury-looting seen in eRepublik), and market taxes.

---

## 19. City services

### 19.1 Hospital

You're admitted automatically at 0 HP: emergency treatment restores 30 HP, and the stay lasts **20 minutes** (shorter under Clinic Funding or Universal Care).

| Service | Energy | Iron | Effect |
|---|---|---|---|
| Full Recovery | 5 | 100 | Full HP; leave immediately |
| Early Discharge | 5 | 0 | Leave at 50 % HP |
| Antidote | 8 | 200 | Removes Poisoned |
| Recovery Boost | 10 | 0 | +5 STR or INT for 1 h; once per stay |

**The hospital is a place to play, not a waiting room.** While admitted you can talk to other patients (Dossier entries), read the paper, write to your patrons, and play a hospital storylet. **Faction mates can visit** you: +10 HP and 5 minutes off the stay, once per visitor per day.

Who controls the city changes the hospital: Vanguard +25 % cost but stronger boosts; Collective −50 % cost, no boosts; Alliance standard cost, antidote always in stock.

### 19.2 Jail (new)

You're arrested when caught while Hot or Wanted, or on an escalated record.

| | |
|---|---|
| **Sentence** | 10 min + Heat ÷ 2 min (maximum 60) |
| **Leaving early** | Pay bail (scales with record), or **a faction mate posts bail** for you. Alliance members get Legal Aid: bail at half price |
| **Inside** | Jail storylets: cellmates' intel (Dossier), a Heat reset, and recruiting prisoners for Collective and Vanguard missions |
| **Afterwards** | Heat reset to 25 |

### 19.3 Bars

| Activity | Energy | Effect | Limit |
|---|---|---|---|
| Buy a Round | 2 | In Good Spirits: +10 % XP on the next 3 missions | 3 a day |
| Bribe the Barman | 4 | City report: influence, battlegrounds, rival events scheduled | 1 a day |
| Black Market Contact | 6 | 1 random Tier II–III item | 1 a day |
| Faction Recruitment | 5 | Recruit an NPC to your faction (FXP, a tiny influence gain) | Rank 2+ |
| Overhear Conversation | 3 | Hints on the week's Issues; 10 % chance of a free Dossier entry | 1 a day |
| Stimulant | 0 | +10 HP. Taking 4+ in 24 h is an overdose: −20 % XP for 2 h. 6+ puts you in hospital | 3 safe a day |
| Bar meal | 2 | Well-Fed (Bar) | — |

---

## 20. Combat (NPC-only in MVP)

Combat is a **hazard**, not the core of the game. It triggers from encounters and is resolved in **one choice**, not round by round.

| | |
|---|---|
| **Flow** | The encounter appears with the opponent's portrait and your odds for each option. You pick **one**: **Fight** (STR), **Flee** (AGI), **Bluff** (CHA) or **Bribe** (Iron). The server simulates the whole fight at once and shows a single result modal, with the damage taken and the outcome. |
| **Auto-resolve** | One button picks the **free** option with the best odds (Fight, Flee or Bluff; it never spends Iron). Players who ignore the popup get auto-resolve when they next open the game |
| **Win** | The mission continues; bonus XP/FXP if you're at full HP |
| **Loss** | Hospital; the mission fails; no FXP; a small XP consolation |

### 20.1 The four options

| Option | Odds | If it works | If it fails |
|---|---|---|---|
| **Fight** | **50 % + 3 % × (your power − their power)**, 5–95 % | You win; you lose some Health (below) | Hospital |
| **Flee** | **(your AGI ÷ their AGI) × 60 %**, +5 % per bodyguard tier, up to 95 % | You escape; the mission fails; Heat as normal | Extra damage, then the fight goes ahead at −10 % |
| **Bluff** | The check formula (§8.4): **CHA against the enemy's Wits** | They let you go; the mission continues | They get angrier: the fight goes ahead at −10 % |
| **Bribe** | **90 %** if the enemy can be bribed | They look away; Heat stays; sometimes a Dossier entry | Iron lost; +10 Heat; the fight goes ahead |

**Combat power = STR × 1.5 + weapon + armour ÷ 2 + 5 per bodyguard tier.**

**Health lost when you win a fight:** their power × 0.8 (±20 %), less your armour value. **Losing** always means the hospital (§19.1).

### 20.2 Enemies

| Enemy | Side | Power | AGI | Wits | Bribe | Where |
|---|---|---|---|---|---|---|
| Street Enforcer | Vanguard | 22 | 10 | 10 | 60 Iron | Common in Vanguard-held areas |
| Militia Guard | Vanguard | 35 | 9 | 12 | 150 Iron | Duskwall, Operations |
| Red Guard | Collective | 25 | 12 | 11 | 80 Iron | Sabotage missions, Coalport |
| People's Commissar | Collective | 17 | 11 | 16 | Not bribable | Lowers your Fight odds by 10 % |
| Party Thug | Alliance | 19 | 10 | 10 | 50 Iron | Rare |
| City Police | Neutral | 30 | 12 | 14 | 300 Iron | Illegal missions; more common with Heat |
| Secret Police | Vanguard | 43 | 14 | 20 | Not bribable | Operations, Level 20+ |

**Scaling:** enemy power rises **+10 % per mission tier above tier 1**, and **+4 in an enemy home city**. Named NPCs (for example Inspector Kessler) have their own values.

### 20.3 Weapons and armour

| Tier | Weapon (power) | Armour (power ÷ 2, and damage reduction) | Example weapon |
|---|---|---|---|
| I | +4 | 4 | Truncheon |
| II | +8 | 8 | Revolver |
| III | +12 | 12 | Service pistol |
| IV | +16 | 16 | Rifle (hidden) |
| V | +20 | 20 | Legendary named weapon |

Armour is also clothing, so its CHA (§8.2) counts too. The best armour for a fight is rarely the best outfit for a dinner.

**Example:** a player with STR 14, a truncheon (+4) and a Tier I coat (armour 4) has power 21 + 4 + 2 = **27**. Against City Police (30) that's 50 − 9 = **41 %** to fight, or with AGI 17 against 12, **85 %** to flee. Auto-resolve would pick Flee.

---

## 21. Equipment

### 21.1 Slots

| Slot | Mechanical bonus | CHA |
|---|---|---|
| Weapon | STR or flat damage | 0–3 (concealed weapons are 0) |
| Armour / clothing | Damage reduction | 5–50 (the main CHA source) |
| Utility | Mission success | 0–8 |
| Accessory | FXP gain or Energy discount | 2–15 |
| Document | INT; special dialogue | 0–5 |

### 21.2 Tiers

| Tier | Name | Unlock | Armour CHA | Examples (Vanguard / Collective / Alliance) |
|---|---|---|---|---|
| I | Improvised | Level 1 | 2–5 | Work coat / factory apron / worn blazer |
| II | Standard | Level 6 | 8–15 | Field jacket / commissar coat / campaign suit |
| III | Quality | Level 16 | 18–28 | Officer's overcoat / Vanguard uniform / barrister's vest |
| IV | Elite | Level 31 | 30–40 | Dress uniform / Red Guard regalia / senator's suit |
| V | Legendary | Level 51, Rank 6 | 42–50 | Marshal's regalia / People's Hero attire / Prime Minister's frock coat |

### 21.3 Where equipment comes from

Mission drops, faction stores, clothing shops, the Black Market (with a record check), crafting (combine two items of the same type for a 40 % chance of the next tier), Ambition and patron rewards, and the Tier V quest chains.

---

## 22. Political Seasons (new)

A **Political Season** is one in-game year: 12 weeks, ending in the Season Election. Seasons give the game structure, let newcomers compete on fair terms, and set the pace for live content.

### 22.1 Season end

- **Season Champion:** the faction with the highest **Season Score** (daily National Control summed over the season, plus 10 per national election won). Members get a season cosmetic and Legacy.
- **Awards:** top ledger contributors per bracket, most City Hero titles, the best orator (event outcomes), the spymaster (Case Files used).
- **The Hall of Fame** records every President and Chancellor, Champion faction and major award.

### 22.2 Rollover (the first day of the new season)

| Resets | Stays |
|---|---|
| City influence moves **50 % of the way back to each city's starting baseline** | Level, Rank, stats, items, Iron |
| All laws and ordinances expire | PC, Favour, Legacy, Dossier |
| Heat drops to 0 | Criminal Record (minor points keep expiring on their own) |
| Season Standing and the season track | Ambition progress |
| The Issue deck is refreshed | Offices won at the Season Election (they take office normally) |

### 22.3 Season Twists

Each season adds **one rule change** to the setting, announced a week in advance:
- *The Long Winter*: winter lasts 6 weeks; Bread Prices and Flu come up more often.
- *Foreign Loan Crisis*: economic Issues dominate; Iron is scarcer.
- *Martial Law in Duskwall*: Duskwall's council is suspended and its Governor is appointed by the head of government.
- *Free Press Spring*: exposés +50 %; propaganda −25 %.
- *The Great Exhibition*: social missions and CHA matter twice as much; a new patron arrives.
- *The Uprising*: for this season only, one home city loses its 50 % floor and can genuinely be contested (§14.11). Rare, and never the same city twice in a row.

### 22.4 Season track

**Season Standing** points come from Directives, events, votes cast, Issues and offices held.
- **Free track** (30 tiers): Iron, outfits, patron introductions, Rested refills, a season title.
- **Premium track:** **cosmetic only** (outfit styles, profile frames, headline typefaces).

---

## 23. Monetisation

### 23.1 Energy Packs

| Pack | Energy | Price |
|---|---|---|
| Small | 25 | $0.99 |
| Medium | 60 | $1.99 |
| Large | 120 | $3.49 |

**New:** you can receive at most **120 purchased Energy per City Day**, and the Premium daily pack counts toward that cap. The v3.0 Weekly Bundle (300 Energy) is removed because it gets around the daily cap.

### 23.2 Premium ($9.99/month)

- Energy cap 120
- One free Large Pack per day (within the daily cap)
- Remote Work for Tier I–II jobs
- The season premium track (cosmetic)
- Profile cosmetics: badge frame, title suffix, colour theme
- Priority support and beta access

**Removed from v3.0:** the "Premium Mission" (+50 % XP, no Energy cost), which let players buy progress.

### 23.3 Never for sale

Votes, PC, influence, offices, endorsements, Favour, Legacy, stats, XP, FXP, Heat reduction, record clearance. eRepublik is widely said to have declined because money could buy power, and we won't repeat that.

### 23.4 Faction Reset token

Paid. Switching faction vacates your offices, resets your tenure, and halves your PC (§15.2).

---

## 24. The player's journey

See §3.6 for the timeline. In more detail:

**Phase 1 — The Recruit** (week 1; home city; Level 1–10; Rank 1–2)
- The origin story; an Ambition chosen; a faction, and so a home city.
- The Morning Paper's welcome edition and the Party Directives explain everything.
- First job, first outfit, first surveillance, first tier-2 mission.
- **Day 2: first vote**, in the home council race. First Campaign Event (a Canvass Drive).
- Name in print for the first time as City Hero (bracket 1–15).

**Phase 2 — The Organiser** (weeks 2–4; home city, first trips out; Level 10–20; Rank 3)
- Level 10 opens the train: the first trip to a battleground, the first journey event.
- Rank 3: stands for the home council (if *Known* locally and endorsed); schedules own Campaign Events.
- First illegal mission, first Heat, maybe a first night in jail and a faction mate posting bail.
- First Case File; Associate with a patron.
- **The move:** chooses whether to move to a battleground or stay home and rise in the party.

**Phase 3 — The Councillor** (months 2–3; home or a battleground; Level 20–40; Rank 3–5)
- Council terms won and lost; **Governor or Mayor** after a term; Faction Chair at Rank 4.
- Spy trips into enemy home cities; the first exposé that brings down an NPC official.
- A flat, then a townhouse; Confidant of a patron; the Ambition's middle chapters.
- The first Season Election as a campaigner.

**Phase 4 — The Deputy** (end of season 1 and season 2; Level 40–55; Rank 5–6)
- **Legislature deputy**, first law proposed; appointed Minister.
- Stands in the faction primary for head of government.
- The Ambition's climax; Protégé of a patron.

**Phase 5 — The Power Broker** (season 2 onward; Level 55+; Rank 6–7)
- President, Chancellor, Speaker, or kingmaker.
- Tier V regalia, a villa, Legacy perks, the Hall of Fame.
- Mentors the next generation through Directives and events, and has to win power again every term.

---

## 25. Scope and roadmap

| Feature | Launch (MVP) | Launch + 60 days | Later |
|---|---|---|---|
| Origin Story + Ambition choice | ✔ (1 Ambition fully built, 2 with 4 chapters) | All 3 complete | New Ambitions |
| Morning Paper, Directives, Issues | ✔ | | |
| Energy, Rested, Heat, PC, Well-Fed buffs | ✔ | | |
| Jobs (salary + streak) | ✔ | | |
| Dossier + Case Files | ✔ | | Player Dossiers (v1.5) |
| City Councils, Governors, ordinances | ✔ | | |
| Capital districts (5) | ✔ | | Districts in other cities |
| Home cities, battlegrounds, morale | ✔ | | |
| Hostile ground (enemy home cities) | ✔ (4 journey events, 3 encounters) | Full decks, missions only possible there | |
| The office ladder | ✔ | | |
| Mission tiers, Local Standing, result modal | ✔ | | |
| Homes | Rented room and flat | Townhouse, villa | |
| Timed travel + journey events | ✔ (train, night train; 5 events) | Car, first class, full event deck | |
| National elections, Legislature, Chancellor/President | ✔ | | |
| Ministers | | ✔ | Treasury (v1.2) |
| NPC fill | ✔ | | |
| Faction chat and presence | ✔ | | Forums (v1.1) |
| Campaign Events | ✔ (Rally, Canvass Drive, signature events) | Town Hall | Counter-Demonstrations (v1.1) |
| Patronage | ✔ (2 patrons) | All 5 | New patrons each season |
| Legacy | ✔ (record only) | Perks | |
| Hospital and jail storylets | ✔ | | |
| Political Seasons | Season 1 (free track) | Premium cosmetic track | Twists each season |
| Bodyguards (Protect) | ✔ | | Eliminate (v1.5) |
| Player trading, faction treasury | | | v1.2 |
| Second region | | | v1.3 |
| PvP (duels, player intel, bodyguard Eliminate) | | | v1.5 |

---

## 26. Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **Players bring real-world political hostility** | High | Fictional, stylised factions; strict terms of service; chat moderation; no real-world symbols; no player-written public articles before moderation tooling exists |
| **Presenting a fascist faction** | High | The Vanguard is written as a period antagonist faction, not an aspiration. Named-symbol blacklist; review of all Vanguard content |
| Elections with few players feel empty | High | NPC fill; the influence half of every score; NPC-to-player ratio shown openly |
| A dominant faction steamrolls | High | No control multipliers; Battleground and Groundswell; Recall Petitions; the Chancellor coalition rule; season rollover |
| Multi-accounting and vote-stacking | High | One account per person; network checks; 24 h audit; tenure requirements; nothing transferable for new accounts |
| Politics overwhelms new players | Medium | Directives as the tutorial; the Morning Paper; Canvass Drives; council candidacy guided in Phase 1 |
| Too many currencies and meters (Energy, Rested, Heat, PC, IM, Favour, Legacy, Season) | Medium | The Morning Paper "desk" shows them together; PC and Favour appear only after first use; Legacy lives on the profile |
| Directives from a bad Chair | Medium | Players can ignore Directives; NPC default at 06:00; a Chair is recallable by a 2/3 vote of Rank 3+ members |
| Laws that break the game | Medium | Fixed bounds; a 5-law cap; limits on factional laws; 60 % rule |
| Toxic Chairs or officials | Medium | Recall, no-confidence, term limits, moderation |
| Stale Issues | Low | The deck grows every season; Twists; Issues triggered by events |

---

## 27. Key metrics

| Metric | Target |
|---|---|
| Day-1 / Day-7 / Day-30 retention | 45 % / 38 % / 22 % |
| Sessions per day (active players) | 3–5 |
| Share of DAU who voted in the last 5 days | ≥ 50 % |
| Share of D7 players who've joined a Campaign Event | ≥ 40 % |
| Share of players reaching Rank 5 within 30 days | ≥ 30 % |
| Offices held by players (vs NPC) | Rising every term |
| Share of D30 players who've held any office | ≥ 25 % |
| Paying players, monthly | 8–12 % of MAU |
| Faction balance | No faction above 45 % of active players |
| Share of D30 players living in a battleground | 30–50 % (too low means the battlegrounds are empty; too high means home cities are dead) |
| Median day of a player's first council seat (at scale) | Day 14–30 |
| Share of players holding any office at a given time | 5–15 % |
| Notorious within 60 days | < 15 % of players |

---

## Appendix A — Glossary

| Term | Meaning |
|---|---|
| **City Day** | One real day (00:00–24:00 UTC) |
| **Council Cycle** | 5 City Days; every city votes once |
| **Term** | 28 City Days; the national election cycle |
| **Political Season** | 84 City Days; one in-game year |
| **XP / FXP** | Experience (drives Level) / Faction experience (drives Rank) |
| **IM** | Iron Marks, the currency |
| **PC** | Political Capital, earned through politics and spent on political actions |
| **Rested** | Banked overflow Energy that gives +50 % XP and Iron |
| **Heat** | Short-term police and press attention from illegal actions |
| **Criminal Record** | Long-term reputation for offences |
| **Influence** | A faction's share of a city's opinion |
| **National Control** | Weighted influence across all five cities |
| **District** | One of Irongate's five parts, each with its own opinion, control and 2 council seats |
| **Journey** | A timed trip between cities by train or car, with an optional event on the way |
| **Home city** | A faction's permanent base: Duskwall, Coalport or Ashford. New players start there |
| **Battleground** (city) | Irongate or Clearwater, where the three factions fight for control; 70 % of national weight |
| **Morale** | A faction's share of opinion in its own home city; never below 50 % |
| **Hostile ground** | A rival faction's home city: dangerous, double Heat, the best rewards |
| **Office ladder** | The rule that each office needs a completed term in the office below it |
| **Local Standing** | How well a city knows your face, from Stranger to One of Us |
| **Battleground** | A city or capital district with the top two factions within 10 points; +25 % influence and FXP |
| **Groundswell** | A growing influence bonus for a faction that just lost a city |
| **Issue** | A city's public concern of the week |
| **Directive** | The day's agenda set by the Faction Chair |
| **Campaign Event** | A scheduled co-op political action with roles |
| **Case File** | 3+ Dossier entries on one NPC; unlocks exposés and more |
| **Favour** | Your relationship level with a patron |
| **Legacy** | Your permanent public political record |
| **Ambition** | Your personal storyline, chosen at the father's deathbed |
| **NPC fill** | NPC candidates and office-holders who fill seats no player wins |

---

## Appendix B — Impact on the current codebase

The API (`apps/api`) was built against v3.0. Main changes:

| Area | Current | Change for 3.1 |
|---|---|---|
| `jobs/workers/energyTick.ts` | 5 Energy per 5 min | 5 per 10 min; overflow into Rested |
| `jobs/workers/healthNeglect.ts` | Hunger/fatigue HP drain | **Remove.** Buffs are timestamps on the character; no worker needed |
| `jobs/workers/jobAbsence.ts` | Fires after missed shifts | **Replace** with a daily payroll job (50 % salary, streak, sick days) |
| `jobs/workers/bodyguardUpkeep.ts` | Daily fee; dismiss if unpaid | **Replace** with contract expiry |
| `jobs/workers/electionCheck.ts`, `electionConclude.ts`, `presidentTerm.ts` | Election triggered at 55 % | **Replace** with a calendar scheduler: a daily council election, a national election every 28 days, season rollover |
| `jobs/workers/lawExpire.ts` | Law expiry | Keep; add ordinance expiry. Bounds checked in `services/ruleEngine.ts` |
| `jobs/workers/influenceDecay.ts` | 1 %/day decay | Keep; add Battleground and Groundswell calculation |
| `jobs/workers/criminalDecay.ts` | Minor-point expiry | Keep; Heat cooling can be calculated when read |
| `jobs/workers/weatherRotate.ts` | Weather rotation | Per city, per City Day; 21-day weather seasons |
| Mission checks (`services/missionService.ts`) | Success chance = a base value plus small STR, INT, CHA and equipment bonuses, capped at 95 %; outcome bands at 65 % and 30 % of that chance | Replace with the §8.4 formula (50 % + 4 % × (stat − difficulty) + bonuses, 5–95 %) and the Success / Partial / Failure bands; return the breakdown so the result modal can show it |
| Combat (`services/combatService.ts`) | Up to 10 rounds simulated, armour and bodyguard reduction | Keep the simulation on the server, but expose it as one choice: return the odds for Fight, Flee, Bluff and Bribe (§20.1) before the player picks, and one result after. Add enemy AGI, Wits and bribe values (§20.2) |
| Travel (`services/characterService.ts`, `routes/character.ts`) | Instant move, Energy cost | Timed journeys: a Journey record with departure, arrival, mode and event; arrival resolved by a `journeyArrive` job; no Energy cost |
| New workers | — | `journeyArrive`, `issueRotate` (weekly), `directiveReset` (daily), `campaignEventResolve`, `patronRequests`, `seasonRollover`, `morningPaper` digest |
| Schema (new) | — | District, DistrictInfluence, Journey, Office, OfficeTerm (for the ladder), CouncilSeat, Ordinance, Issue, IssueMomentum, InfluenceLedger, LocalStanding, CampaignEvent, EventRole, Directive, Patron, PatronFavour, LegacyEntry, AmbitionProgress, Home, Season; City gets `role` (home or battleground) and `homeFactionId`; new Character fields: `heat`, `politicalCapital`, `rested`, `homeCityId`, `homeDistrictId`, `workStreak`, `sickDaysLeft`, buff timestamps |
| Starting city (`services/authService.ts`) | Every new character starts in Irongate | Start in the faction's home city (§7.4); the seed data needs `role` and `homeFactionId` per city, and the national weights 40/30/10/10/10 |

---

## Appendix C — Open questions

1. **Day boundary:** ~~UTC midnight, or the main audience's region?~~ **Closed for the MVP (29 Sep 2026): 00:00 UTC** (§2.2). Every daily rule is written per boundary crossed, so moving it later is a constant, not a redesign. Revisit with telemetry if the audience clusters far from UTC; the night window (20:00–06:00) moves with it.
2. **Election weighting:** is 50 % popular vote / 50 % influence right? Low-population servers might need more weight on influence at first.
3. **NPC visibility:** should NPC office-holders be clearly marked, or blend in with players?
4. **Counter-Demonstrations:** they'd give the game its first faction-vs-faction contest. MVP or v1.1?
5. **Season length:** 12 weeks, or 8 to keep it punchier?
6. **Ambition at launch:** which of the three gets fully built first? "Finish His Work" teaches politics best.
7. **Vanguard presentation:** it needs a content and moderation policy before public testing.
8. **Journey times:** are 12–25 minutes right, or should the nearer cities be shorter (5–8 min) so a trip fits inside one session?
9. **District weights:** should the Government Quarter count for more than the other four districts in Irongate's average?
10. **Faction naming** (parked): plain names (Fascists, Communists, Democrats) everywhere, plain names first with party names as flavour, or keep the party names (Iron Vanguard, Red Collective, Civic Alliance) with the ideology stated.
11. **Who starts where at low population:** with few players, should new players start in a battleground instead so they meet rivals sooner?
12. **Origin story stacking:** §8.5 says the origin gives "up to +5", but the §7.2 answers can stack to +8 INT (library, watched, read people) or +8 STR. Either cap the stack at +5 or accept +8 and say so. Decide before slice 2; the reference recruit (§8.5) assumes the answers as written.
13. **Opinion swing at scale:** the §14.2 swing rates suit a few dozen active players per city. With hundreds, the meters would move tens of points a day against a 1 % drift. Options: a per-city damping factor (swing × 20 ⁄ active players there, floor ×0.25), a faster drift, or a per-faction daily cap per city. Decide once slice 4 has telemetry.
14. **Rested and heavy players:** a six-session player earns little Rested and still levels about 35 % faster than the reference player (`docs/economy.md` §6): Level 10 on day 3 and Level 16 on day 8. Intended, but if telemetry shows most players are heavy the level table will read fast. The lever is the §5.3 table, not the Rested bonus (§6.3 is a pillar).
15. **Level-up points vs the training targets:** +1 stat point per level alone gives the reference player +9 by day 5 and +19 by day 20, which meets the §8.5 "best stat" targets (week 1 ~15, month 1 ~30) without any training; training on top overshoots (INT ~30 by day 7). Harmless while tier-1 odds clamp at 95 %; reconcile before tier-2 difficulties (14–20) are set in slice 5. Options: keep the rule and raise the targets, or give the level point every other level.
16. **Opinion drift before slice 4:** slice 1 writes the swing but not the 2 %-a-day home drift, so a long playtest with a few testers pins Coalport near the 95 % cap. Acceptable for the slice-1 question; apply the drift lazily at the day boundary if it is cheap.
17. **Salary cap on return (14 half-pays, §9.1):** "a fortnight's back pay" is a judgement, not a measured number. Revisit when the Welcome Back package (§4.2, 1 month+) is designed; it may replace the cap with a deliberate returning bonus (Rested full, a fixed Iron sum) rather than an accidental one.

