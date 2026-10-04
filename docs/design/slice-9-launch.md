# Slice 9 — "Launch readiness": telemetry, the balance pass, anti-abuse, moderation, onboarding polish, accessibility, performance, the betas, and the hosting checklist

Game designer, 4 Oct 2026. Companion to `docs/design/slice-9-screens.md` (the screens). The architect writes the slice-9 tech design from these; every rule and number here is also in the GDD (edits listed in §12). Builds on slices 5–8 as settled (`slice-5-risk.md` §23, `slice-6-together.md` §20, `slice-7-nation.md` §23, `slice-8-life.md` §21) and on the user's three reviews (`docs/review/`).

**Playtest question:** are the day-7 and day-30 retention targets within reach?

**The answer this slice gives:** the game cannot answer it locally, so the slice builds **the instruments** (telemetry that measures GDD §27 the same way in a local playtest and in a beta), **the guards** (anti-abuse and moderation, so a public beta cannot be spoiled by a handful of people), **the polish** (onboarding, accessibility, performance, every screen's *what do I do here?*), and **the plan** (a closed beta that reads day-7 to ±8 points, an open beta that reads day-30), with the gates that say *within reach* in numbers.

**Two halves, because the game stays local until the end of the project (the user's decision).** **Part A** (§2–§9) is built and tested locally, on `pnpm dev:mem` and the test clock. **Part B** (§10) is the hosting step: every item earlier tech designs and ADRs deferred with *deploy*, *production*, *R2*, *Vercel* or *sticky*, gathered into one checklist for the end.

**Rules this design obeys:** one tap or one choice; nothing owned is ever destroyed by absence, by a suspension or by a rule of this slice; a political battle, not a war; no real-world extremist symbol or slogan anywhere, the moderation lists included; the check formula (§8.4) and combat (§20) untouched; plain words, no dice maths, spelled-out labels; server-authoritative; content is data; faction names as they are. **No player screen ever accuses:** a flagged account sees nothing, a suspended one reads a reason in plain words and a date, and the only public sign of the audit is a count's aggregate line.

---

## 1. The design in one paragraph

The slice adds no rate and no political right. It adds **telemetry** as a first-party event stream in our own database, rolled up into the §27 metrics by a report that works on a local playtest and on a beta alike; a **balance pass** that runs the economy sheet's four profiles across days 1–30 through every system built, names every lever with its bounds, and lists the red flags the dashboards watch for; **anti-abuse** as a small set of pinned rules (linked accounts' ballots count once; a 24-hour audit on the national count that confirms itself if nobody acts; sign-up caps per network and device; bounded favours), none of which a player is ever told about by name; **moderation** as a four-reason report, a word filter that refuses or flags, a ladder from a note to closure, a rename flow, and a console with four pages for the two or three people who run the beta; **onboarding polish** as a purpose line on every screen, an empty state on every list, a help note on every label, and the *While You Were Away* digest the plan deferred since slice 3; **accessibility** to WCAG 2.2 AA with a five-line Settings sheet; **performance budgets** for the first view, the map and the bundle; and **two betas** with gates.

### 1.1 Plain words for slice 9 (GDD §1.5)

| System term | The player reads |
|---|---|
| Moderation · a moderator · the moderation team | **the moderators** (on Settings and the policy); a note is signed **the editor** (in the paper's voice) |
| Report · a report reason · a flag | **Report this** · the four reasons (§5.2) · never shown |
| Word filter · refused · flagged | ***That can't be said here.*** · never shown |
| Rate limit | ***Slow down a moment.*** |
| Timeout · mute (by a moderator) | **muted until {date}** |
| Suspension · ban · closure | **suspended until {date}** · **closed** |
| Warning | **a note from the editor** (a Letters row) |
| Appeal | **Reply to the moderators** |
| Multi-account · alt · linked accounts · set aside | never shown; the count's one aggregate line: ***{n} votes set aside after the audit*** |
| The 24-hour audit · provisional | **the audit** (kept; the Courier's *to be confirmed tomorrow* from slice 7) |
| Rename · forced rename · name reset | **Change your name** · ***Your name needs changing*** |
| Telemetry · analytics · session · cohort | never shown; the Settings sheet's one line: ***Usage figures help us balance the game. They never include what you write.*** |
| Accessibility · reduced motion · high contrast | **Settings**: **Motion** · **Text size** · **Map at night** · **Clouds** · **Chat** |
| Feedback form · survey | ***Tell us how it's going*** |
| Account deletion · erasure | **Close your account** |
| Maintenance · downtime | ***The presses are stopped. Back at {time}.*** |
| While You Were Away · the Welcome Back package | ***While you were away*** (the paper's row) · nothing is named; Rested is full and the row is longer |

Kept with a help note on the label: the audit, Settings' five labels.

---

## 2. Telemetry (GDD §27)

### 2.1 What is measured, and where it lives

**First-party, in our own database, no third party in the beta** (the plan's "events stored in a MongoDB collection"; PostHog is a later option). Sentry carries errors only. Nothing in telemetry is chat text, a name, an email, an IP or a ballot's choice; the audit's network data (§4.2) is a separate collection with its own retention.

| Collection | One document per | Kept | Who reads it |
|---|---|---|---|
| `telemetry` | event (§2.2): `{ kind, at, dayKey, userId, characterId, sessionId, props }` | 180 days (TTL) | `pnpm report:metrics`, the dev panel's Metrics page, the console's Metrics page |
| `playerDays` | character × City Day: `{ characterId, dayKey, sessions, firstAt, lastAt, requests, energySpent, taps, wins }` | for good (small: one row per player-day) | retention and sessions-per-day |
| `cohorts` | sign-up City Day × faction: `{ dayKey, factionId, signups, d1, d7, d30, d1Rolling, d7Rolling, d30Rolling }`, written by the day job | for good | the dashboard's first table |

**Definitions (pinned; GDD §27):**
- **A player-day** is a City Day (UTC, §2.2) with at least one authenticated request from the account.
- **A session** is a run of requests with no gap of 30 minutes or more; its length is last request minus first; a single request is a session of length 0.
- **Day-N retention (classic)** is, of the accounts created on City Day *d*, the share with a player-day on *d + N*. **Rolling** is the share with any player-day on or after *d + N*. The §27 targets (45 / 38 / 22) are **classic**; the rolling figure is printed beside it because small cohorts make classic noisy.
- **Active** (DAU) is accounts with a player-day today; **MAU** in the last 30 City Days.
- **A tester** flagged by the dev panel, a boosted account (the slice-3 boost script) and a moderator's character are left out of every figure.

### 2.2 The event list

Every event carries `at`, `dayKey`, the account, the character, the session and the client (`phone | desktop`, viewport width, reduced motion on or off, text size). `props` is per kind; nothing free-text.

| Kind | When | Props | Feeds |
|---|---|---|---|
| `signup.form` | the sign-up form is submitted | `ok`, `reason` (`name`, `email`, `password`, `filter`, `cap`) | the funnel |
| `origin.step` | each origin answer | `step`, `question`, `answer` | the funnel; build spread |
| `faction.joined` | the faction confirmed | `factionId`, `wishMatched` | faction balance |
| `paper.opened` | an edition is opened | `edition` (`welcome`, `daily`, `away`), `daysAway`, `rows` | sessions; the digest's use |
| `screen.view` | a route or sheet opens | `screen`, `from` | *what do I do here?*; dwell |
| `action.tap` | a tier-1 or training tap | `actionType`, `count` (1 or 3), `energy`, `outcome` tally, `oddsBand`, `rested` | Energy per day; odds bands; ×3 share |
| `mission.run` | a mission result | `missionId`, `type`, `way`, `outcome`, `remembered`, `runIn`, `caught` | risk; the remembered way |
| `encounter.choice` | a run-in answered | `choice`, `auto`, `won`, `opponentKind` | risk |
| `held.enter` / `held.leave` | the cells or the ward | `kind`, `minutes`, `how` (`waited`, `paid`, `bailed`, `deported`) | risk; favours |
| `order.done` / `orders.complete` | an order, all three | `slot`, `family` | Directives' share |
| `levelup`, `rankup` | thresholds crossed | `level` / `rank`, `dayInGame` | pacing against the model |
| `stat.placed` | a level point placed | `stat`, `waited` (minutes) | builds |
| `standing.level` | a Reputation rung | `cityId`, `level` | pacing |
| `job.taken`, `job.switched` | | `jobId` | income |
| `vote.cast` | any ballot | `electionKind`, `cityId`, `ownFaction` (bool), `npcChoice` (bool) | voted in the last 5 days; cross-faction ballots |
| `candidacy.filed` / `struck` / `seated` | | `office`, `cityId`, `dayInGame` | first seat median; offices held by players |
| `endorsement.given` | | `cityId` | small-branch rule |
| `council.vote`, `parliament.vote` | | `item` | engagement with office |
| `journey.boarded` / `arrived` | | `from`, `to`, `minutes`, `dwellSeconds` (time on the journey screen), `card` | Appendix C #8's dwell |
| `residence.moved` | | `from`, `to`, `dayInGame` | share living in a battleground |
| `event.called` / `signup` / `withdrawn` / `resolved` | | `eventId`, `role`, `hand`, `outcome`, `membersShare` | D7 joined an event; fill rate |
| `chat.post` (count only) | | `channel` | chat use; never the text |
| `chat.report`, `name.report` | | `reason` | moderation load |
| `favour.bail` / `visit` / `nudge` | | | favours |
| `dossier.entry` / `file` / `expose` / `sale` | | `source`, `outcome`, `angle` | the slice-8 question |
| `patron.request` / `gift` / `tier` | | `patronId`, `tier` | Favour's pace |
| `shop.bought` / `sold`, `outfit.changed` | | `itemId`, `price`, `beforeJourney` | sinks; recognition |
| `home.flat`, `home.rent` | | `weeks`, `lapsed` | sinks |
| `pc.spent` | | `sink`, `amount` | Political Capital budget |
| `help.opened` | a dotted label tapped | `label` | which notes are read |
| `settings.changed` | | `key`, `value` | accessibility use |
| `feedback.sent` | the form | `scores[]` (five 1–5), `week` | the beta's form |
| `energy.empty` | the Out of Energy card | `restedLeft` | session end |
| `error.client` (count) | an uncaught client error (Sentry has the detail) | `route` | crash-free sessions |

**Server-side events** (the day job): `day.rollover` with its duration and the count of characters settled; `election.counted` with turnout, NPC seats, player seats and set-asides; `issue.resolved`; `audit.ran` (§4.5).

### 2.3 The dashboards (`pnpm report:metrics`; the console's Metrics page)

Each table names its §27 row and the gate it feeds (§9.4).

| Dashboard | Rows | §27 metric |
|---|---|---|
| **Retention** | per sign-up-day cohort and in all: D1 / D7 / D30 classic and rolling, with the cohort size and a ±(1.96 √(p(1−p)/n)) band | Day-1 / 7 / 30 |
| **Sessions** | sessions per player-day (median, mean), session length, hours between sessions, Energy spent per player-day against the model's 200 / 300 / 400 / 600 profiles | Sessions per day |
| **The funnel** (§6.1) | the share of sign-ups reaching each step, the minutes to the first modal | — (the slice-2 question) |
| **Politics** | voted in the last 5 City Days ÷ DAU; turnout per election; offices held by players against locals, per term; median day of the first seat; share holding any office now; cross-faction ballots | ≥ 50 %; rising; day 14–30; 5–15 % |
| **Together** | the share of D7 players who joined an event; fill rate per role; events called by members against fixtures; the return rate the day after a sign-up against those without | ≥ 40 % |
| **Pacing** | the median day-in-game of Level 6, 10, 16, 31 and Rank 2, 3, 4, 5, per profile (sessions per day bucketed 1–2 / 3 / 4 / 5+), against the economy sheet's model row | Rank 5 within 30 days ≥ 30 % |
| **Factions** | share of active players per faction; share living in a battleground | ≤ 45 %; 30–50 % |
| **Risk** | marks per player-week; the record's levels by day 60; run-ins per day; cells and ward minutes; the loss rate on *Leave it to luck* | Notorious < 15 % |
| **Economy** | Iron held at days 7 / 14 / 30 (median) against the model; Iron in and out by source and sink; Political Capital held and at the cap; prices bought by day | — (§3) |
| **Moderation** | reports per 1,000 lines; the queue's median time to first action; actions by rung; filter refusals | — (§9.4 gate) |
| **Abuse** | linked sets found; ballots set aside per count; sign-ups refused by the caps | — |
| **Health** | crash-free sessions; API p95 by procedure; the day job's duration; the socket's reconnects | — (§8) |
| **Accessibility** | reduced motion, large text, daylight map and chat hidden: share of players | — |

### 2.4 What a local playtest can measure

Locally the clock can be stepped (the test clock) but people cannot: a handful of testers over a few real days gives **sessions, the funnel, pacing against the model, the politics rows and every risk and economy row**, all of which are the inputs the balance pass needs (§3). **It cannot give retention**: a classic D7 from eight testers is one person either way. So the local playtest answers *is the game ready to measure?* (every dashboard fills from real play; every event fires where the design says; the model row and the measured row agree within §3.4's bounds on the first three days), and the betas answer the slice's question (§9). The report prints the band beside every retention figure so nobody reads a small cohort as a result.

---

## 3. The balance pass (GDD §5.2, `docs/economy.md`)

### 3.1 The simulation plan

The economy sheet's model (a day-by-day script of four profiles) is extended to **days 1–30 across every system built in slices 1–8** and run as a matrix:

| Dimension | Values |
|---|---|
| Profile | casual (2 sessions), reference (3), regular (4), heavy (6) |
| Faction and start | Vanguard in Duskwall, Collective in Coalport, Alliance in Ashford (the reference answers of `slice-2-onboarding.md` §2.4) |
| Road | legal (tier 1, legal missions, events, the committee), illegal from Rank 3 (two a session), the specialist on rival ground from day 5 |
| Residence | home all month; a move to a capital battleground district on day 5–7; Clearwater on day 7 |
| Spending | buys everything at its Level (the §22.2 model); buys nothing |

Forty-eight runs; outputs per run per day: XP, Level, FXP, Rank, best stat, Iron in and out, Political Capital in and out, Heat at session ends, marks, record level, Favour, Legacy, worn Charisma, opinion moved. Each run is a row of the dashboard's **model row**, so the Pacing and Economy dashboards show *measured against modelled* for the matching profile bucket. The script stays in the designer's scratch space; its output tables go into `docs/economy.md` §23 when the pass runs.

Two population simulations beside the player ones:
- **Opinion at scale** (Appendix C #13): a city's meter with 5, 20, 100 and 500 active contributors a day at the §14.2 swings and the fixture's floor, with and without the damping factor of §3.3, against the 1 % drift. The question: does a meter move more than ten points a day under ordinary play at any population?
- **Elections at scale**: the count rules of §15.3 and §15.5 with 1, 5, 20 and 100 player ballots per district against the turnout weight (ten in the capital, thirty nationally): when do ballots outweigh opinion, and does a bloc of twenty decide every seat?

### 3.2 The levers and their bounds

Every lever is a GDD number; the bound is how far the pass may move it without a design change, and the trigger is the measurement that moves it. Levers marked **pillar** are not touched by the pass.

| Lever | Now | Bound | Trigger | GDD |
|---|---|---|---|---|
| Energy regen; the bar; Rested's cap and +50 % | 5 / 10 min; 100; 200; +50 % | **pillar** | — | §6.2, §6.3 |
| The 95 % clamp and the 50 + 4 × (stat − difficulty) formula | | **pillar** | — | §8.4 |
| Tier rates (XP / FXP / Iron per Energy) | T1 4.5 / 0.6 / 2 · T2 5 / 0.8 / 4 | ±20 % per line | the pacing row off the model by more than §3.4's band | §5.5 |
| The level table | §5.3 | each step ±25 %, never shrinking | Level 10 median outside day 3–8; Level 16 outside day 9–18 | §5.3 |
| Rank thresholds | 400 / 2,000 / 6,000 / 15,000 / 25,000 / 60,000 | ±25 % each; Rank 2 never above 500 | Rank 2 median after day 3; Rank 3 outside day 7–14; Rank 5 within 30 days under 20 % or over 45 % | §5.4 |
| The council FXP multiple | 1.5× | 1.25–1.5 | HQ-only players (Appendix C #32) | §13.3 |
| *Fired up* | +10 % FXP | 5–10 | rank pacing fast with every home city *Fired up* (#23) | §14.11 |
| Directives' completion bonus and match | +20 each; +25 % | fixed; the share of daily FXP from orders 25–35 % | the share outside the band | §13.7 |
| Difficulty ladder | 14 / 16 / 18 / 20 at Level 6 / 8 / 10 / 12; +2 capital; +4 rival | ±2 per rung | fresh content above 85 % at its Level for most builds (#15), or under 50 % | §8.4 |
| Tier-1 swing per Energy; tier-2; events' bases | 0.005; 0.01 (×2 illegal); 0.8–2.0 | ±25 %; events first at low population (#58) | a district moving more than 10 points a day; or a meter that never moves with five active members | §14.2 |
| The opinion damping factor (new, §3.3) | identity under 20 contributors; floor 0.25 | the 20 and the 0.25 | the scale simulation and the first week of open beta | §14.2 |
| The drifts | 1 % of the distance (battlegrounds); 2 % to 70 (home) | 0.5–2 %; 1–3 % | a battleground locked for a fortnight with active rivals | §14.2, §14.11 |
| The Battleground band and bonus | within 10 points; +25 % | 8–12; +15–25 % | every district a close race by week 2 (the +25 % permanent) | §14.4 |
| Turnout weights | 10 ballots (districts); 30 (the republic) | 5–20; 15–60 | a bloc of ten deciding every seat, or ballots never mattering | §15.3, §15.5, Appendix C #2 |
| The ward-vote weights and NPC profiles | Successes ÷ 5; 44…15 | ±1 on the divisor; profiles ±5 | lone players never top, or always by twenty (#22) | §15.3, §15.10 |
| NPC fill count | nine names | eight when fewer than two players stand (#44; the user's decision) | voting read as pointless in the playtest | §15.10 |
| Three starts a city a day; three sign-ups a member | | 2–5; 2–4 | the board always full; or events dominating a meter | §16.3 |
| Political Capital: events' rates and the halving; the President's 50 | 15 / 10 / 6 / 3, half after the first | two events a day instead of a lower first rate (#59); 30–50 | PC at the cap for more than 5 % of players by day 30 | §6.5 |
| Run-in bases | speech 5, watch 10, vandalism 15, disruption 30; rival tier-1 15 | ±5 points each | run-ins per illegal mission outside 0.2–0.4; branches living on rival ground (#53) | §13.3, §14.12 |
| The caught base and the record's fade | 8–20 %; 14 days | ±5; 7–21 | marks fewer than one a week or more than two for a daily illegal player (#56) | §11.2, §11.3 |
| Heat cooling | 5 an hour | 4–7 | *Hot* reached by most illegal players every session, or never | §6.4 |
| Bail | 100 + 50 a mark | base 50–150 | nobody pays, or everybody (#50) | §19.2 |
| Prices (the Wardrobe, the flat, the rent, gifts) | §22.2 of the sheet | ±30 % per item; the flat 2,000–3,500 | Iron held at day 30 over 3× or under 0.5× the model's | §18.3, §21 |
| Favour's gift and Request | +2; +6 | the gift 1–3 (#77) | Protégé in a fortnight, or Acquaintance in a week | §17.2 |
| The exposé's swing and burn | −1.0 / −0.5; 14 days | the burn 14–28; a daily cap per town (#76) | exposés dominating a town's meter | §10.4 |
| The season score's election bonus | 100 | 50–200 (#81) | the Champion always the party with the most Presidents | §22.1 |
| Journey times | 12 / 12 / 15 / 25 | **the user's** (#8) | dwell under a minute and trips rare | §14.10 |
| Quarter gates | Level 6 / 10 | 6–8 / 10–12 (#38) | the second quarter opening before the first is used | §14.13 |

### 3.3 One new rule: opinion damping at scale (Appendix C #13, closed)

A city's or district's swing from solo and event actions is multiplied by **`clamp(20 ÷ active, 0.25, 1)`**, where **active** is the seven-day mean of distinct characters with a ledger row there per City Day, written to the city by the day job. Under twenty active contributors the factor is 1 and nothing built so far changes; at a hundred it is 0.2 → 0.25 (the floor); at scale a city with five hundred contributors moves about as fast as one with twenty. Built now, so that the open beta needs no rule change when a city fills; the ledger records the swing as applied and the modal shows the applied figure as it does today. Drift, the Issue resolution's +3, the ballot and seat inputs to morale and the exposé's swing are **not** damped (they are fixed-size or already capped). The scale simulation of §3.1 checks the 20 and the floor before the open beta.

### 3.4 The comparison rule and the red flags

The dashboard's measured medians are compared with the model row of the matching profile bucket. **Inside ±25 % is in balance**; between 25 and 50 % is a flag for the pass; beyond 50 % the lever moves inside its bound before the open beta. Retention is never a lever's trigger on its own (it is the question, not a dial).

| Red flag | Threshold | First suspect | Lever |
|---|---|---|---|
| The first modal is slow | median over 5 minutes from sign-up, or under 70 % reach it | the origin's length, the sign-up form, the first view's bytes | §6, §8 |
| Day 1 ends early | median Energy spent on day 1 under 150 | the Out of Energy card's promise; nothing to do after the welcome set | §6.2 |
| ×3 unused | ×3 under 40 % of tier-1 taps after day 1 | the button's words; Energy per bar read as precious | copy |
| Levels run fast or slow | Level 10 median under day 3 or over day 8 | heavy-player share (#14); the first week's clamp | the level table |
| Rank 2 late | median after day 3 | the welcome set's FXP; the chapter unplayed | the welcome edition's FXP, never the per-order bonus |
| The vote missed | voted in the last 5 days under 50 % of DAU; or turnout under half of eligible | the Election card's visibility; the day-2–4 wait (#21) | a four-day poll (#21); the card |
| The move never happens | share living in a battleground under 20 % at day 30 | the 500 Iron; Reputation restarting; nothing to do there | the move's price; the capital's orders |
| The move always happens | over 60 % | home cities read as a tutorial | the capital's difficulty or the home's *Fired up* |
| A faction dominates | over 45 % of active players, or the republic held by one party for two terms | the origin's wish; the faction cards' order | the cards' order rotates; the Groundswell and the push |
| A meter runs away | a district moving more than 10 points in a day under ordinary play | events; no damping | §3.3's 20; the events' bases |
| Events empty | fill rate under 50 % of named roles; D7 joined under 25 % | the fixture's time; the hands' 5 Energy | the volunteers' strength (#62); the nudge's words |
| Risk punishes | the loss rate on *Leave it to luck* over 70 %; the return rate the day after being taken in under the ordinary rate by 15 points | the police's share (#54); bail (#50) | the police a third of the pool; bail's base |
| Risk is weightless | marks under one a fortnight for a daily illegal player; *Notorious* under 2 % at day 60 | the Success exemption's base rates (#56) | the base rates |
| Iron inflates | median Iron held at day 30 over 3× the model's | tier-2 Iron; Dossier sales; nothing to buy | prices up; the entry price halved |
| Iron starves | under 0.5× | pay-offs and bail; a dead job | the wage; bail |
| Political Capital at the cap | over 5 % of players at 1,000 by day 30 | event PC; stipends stacked (#65) | two events a day (#59); the President's 50 |
| Chat toxic | reports over 10 per 1,000 lines; the queue's median first action over 24 h | the branch's size; a moderator short | the ladder; a second moderator |
| The audit fires | ballots set aside over 5 % of ballots in any count | a real ring, or the link rule too eager (§4.3) | the link rule's interleaving count |

---

## 4. Anti-abuse (GDD §15.2, §26)

The GDD's promises: one account per person; accounts on the same network cannot vote in the same election or endorse each other; national results provisional for 24 hours while the audit runs; nothing political for sale; nothing transferable. Slice 9 pins how, in rules a player never reads by name.

### 4.1 One account per person

- **One character per account** (built since slice 0) and **one account per person** (the terms). Prevention at sign-up: the email is **normalised** (lower case; for `gmail.com` and `googlemail.com` the dots and any `+tag` in the local part are dropped; `+tags` dropped for every domain) and refused if the normalised form exists: *There's already an account for this email. Sign in instead.*
- **A device id**: a random 128-bit value in an HttpOnly cookie set on the first visit (one year), recorded on every sign-in. **At most two accounts may ever be created from one device** (a sibling's phone is real); the third is refused: *This phone already has accounts. Sign in instead.*
- **Sign-up caps per network**: **three accounts per IPv4 /24 (IPv6 /48) per City Day**; the fourth reads *Too many new accounts from here today. Try tomorrow.* The cap and the device rule are the only refusals anyone sees, and neither says why beyond the line.
- **Rate limits**: Better Auth's on sign-in and sign-up; **60 game mutations a minute per account and 600 a minute per IP**; chat as slice 6; reports and feedback as §5; a miss reads *Slow down a moment.* and the tap is not spent.

### 4.2 Network data (the audit's inputs)

On every authenticated request the server keeps, in `networkSightings`: the account, the City Day, the **salted hash of the full IP** (the salt rotated every 30 days, so hashes are comparable within a month and useless after), the /24 or /48 prefix, the device id, and the minute of first and last request in that session. **Kept 30 days** (TTL); never in telemetry; never shown to a moderator as an address (the console shows *same network* and *same device*, not the figures). The privacy note on Settings says this in one sentence.

### 4.3 Linked accounts (the audit's unit)

Two accounts are **linked** when any of:

- **L1** the same device id on both;
- **L2** the same hashed IP on **three or more City Days in the last fourteen**, and **interleaving** on at least three occasions (one account's session ends and the other's begins on that IP within ten minutes), with **no overlap** (no minute in which both were active) on any of those days;
- **L3** both created on the same device or /24 within 48 hours of each other **and** both voting the same candidate in their first three ballots (a weaker signal: L3 alone is *noted*, never set aside without a moderator).

**A household is not a link:** two accounts on one IP whose sessions **overlap** for ten minutes or more on three days are two people, and L2 never fires for them (L1 can, when they share a phone; then one of them keeps the ballot, which is the rule's price and the reason L1 refuses nothing at the tap). Links are computed **once a day by the day job** and at every count; a link expires when its evidence falls out of the 30-day window and nothing stronger replaced it; a moderator can **unlink** with a note.

A **linked set** is the connected component of links.

### 4.4 What a link does (never at the tap; never with a message)

| Act | The rule |
|---|---|
| **Ballots** (council, district, the Chair, the party's pick, the republic) | A linked set's ballots in one election **count once: the earliest cast stands, the rest are set aside** at the count. Every voter still sees *Your vote: {name}* and the count's aggregate line reads ***{n} votes set aside after the audit*** when n > 0 (never a name, never a voter) |
| **Backings** (endorsements, the Chair's and the list's) | A linked set's backings of one name count once; the Political Capital spent stays spent |
| **Petition signatures** | count once per set |
| **Hands at an event** | a linked set's hands count once in the members' share (Appendix C #57's lever, applied to links only); the XP is paid as usual |
| **Posting bail** | pays no Party XP when the payer and the prisoner are linked; otherwise **at most three bails a day pay Party XP** per payer (a cap for everyone) |
| **Visits** | a linked visitor's visit heals and pays nothing, and does not count among the three |
| **The Issue's top five, District Hero, the scoreboard** | a linked set's contributions are summed under the set's earliest account for the ranking; the ledger rows stay where they are |
| **Standing for office** | no rule: a link never bars a candidacy, and a seat won on a count that was later recounted follows the recount (§4.5) |

Nothing else changes: Energy, Iron, XP, orders, missions, Favour and the Dossier are per account, cannot be transferred, and are left alone. **No Iron moves between accounts anywhere in the MVP** (bail posted goes to the state; there is no trade), so there is no transfer guard to write beyond stating it; the pass watches `favour.bail` pairs for the day trading arrives (v1.2).

### 4.5 The 24-hour audit (GDD §15.2; the national count of term day 27 → day 0)

1. **At the count** the audit runs automatically: links are recomputed; linked sets' ballots are set aside; **bursts** are noted (five or more accounts created on one /24 within 48 hours that all voted one party), **backing rings** are noted (a set of accounts whose backings go only to each other), and new accounts under the 14-day tenure are already excluded by §15.2. The provisional result is printed (*to be confirmed tomorrow*, slice 7) **with the automatic set-asides already applied**.
2. **During the 24 hours** the console's Audit page (screens §9.3) shows the count, the set-asides and the notes. A moderator may **confirm now**, **set aside** a noted set (with a reason), **unlink** (with a reason), or **order a recount** of a council counted in the last 24 hours (the audit found a link after that count). Every action is logged.
3. **At day 0, if nobody acted, the count confirms itself** with the automatic set-asides (§15.1's rule: nothing an absent person must do blocks anyone). The paper's day-0 line: *The count is confirmed* / *The count is confirmed; {n} votes were set aside after the audit.*
4. **A recount** of a council is the same count with the set-asides applied; a seat that changes hands passes at once (the loser's term is not completed, the winner's begins and is marked *after a recount* in the count view); the ordinance already in force stands. Council results stay **final at the count** for everyone else (§15.2).

### 4.6 What a flagged account sees

| State | Visible to the player | Visible in the console |
|---|---|---|
| **Clear** | nothing | nothing |
| **Noted** (a link, a burst, a ring; a report received) | **nothing**: every screen is the same, every ballot shows its choice, every result pays | the account's page lists the notes; the Queue lists reports |
| **Reviewed** (a moderator looked, took no action) | nothing | a log line |
| **Muted** (§5.3) | *Muted until {date}* on the composer; reading allowed; everything else untouched | a log line; the rung |
| **Suspended** | the suspended screen (screens §6) with the reason in plain words, the date and *Reply to the moderators*; timers run; the wage lands; Rested banks; offices fall to their defaults | the rung; the reply |
| **Closed** | the closed screen; the reply once | the rung; erasure in 30 days (§5.5) |

A set-aside is **never** a state of the account and is never shown to it.

---

## 5. Moderation (GDD §16.2, §26; Appendix C #7, closed)

### 5.1 The policy (the terms the player accepts at sign-up, in plain words)

Not allowed in chat, in names or in a feedback note: harassment of a player; real-world hate (slurs, dehumanising language about any real group); **real-world political slogans, symbols, parties, leaders or events** used as identity or praise (the game's factions are the game's; `docs/design/content-policy-review.md` §7 is the list the filter and the moderators apply); doxxing; sexual content; spam and selling; **offering or asking anything for a vote, a backing or a signature**; impersonating a moderator, the editor or a name the game uses; evading a mute or a suspension with another account. The policy sits one tap from Settings and from the sign-up form; it is 20 lines.

### 5.2 Reports

- **From a chat line** (long press, or the row's **Report this**) and **from a profile** (the sheet's text button **Report this name**). One sheet: four reasons as rows (***Abuse or harassment*** · ***Real-world politics or hate*** · ***Spam or selling*** · ***Something else***, with a line of at most 200 characters for the last), one tap sends. The reporter reads ***Thanks. Someone will read it.*** A report writes `chatReports` (slice 6: the line and twenty lines around it, no TTL) or `nameReports`.
- **At most ten reports a day** per account; the eleventh reads *That's enough for today. Thank you.* An account whose reports are found baseless three times in a week goes to the bottom of the queue (no visible state).
- When a report leads to an action the reporter's next paper carries one Letters row: ***A line you reported was dealt with.*** Nothing more.

### 5.3 The ladder

| Rung | What it is | Who | How long |
|---|---|---|---|
| **A note from the editor** | a Letters row in the paper naming the rule, in the paper's voice (screens §7) | a moderator | — |
| **Muted** | cannot post in chat or send feedback; reading and everything political untouched | a moderator | 24 hours, then 7 days |
| **Suspended** | cannot sign in to play; nothing owned is touched (Energy fills, Rested banks, the wage lands, rent runs, a flat waits); an office's duties fall to the §15.1 defaults; a name on a ballot stays on it | a moderator | 3 days, then 14 |
| **Closed** | cannot sign in; the character is **retired**: offices vacated as by a move, candidacies withdrawn, chat lines kept for 7 days as any line, old editions unchanged; after 30 days the name becomes *A former member* on every list and the email is erased | an admin, or two moderators | for good |

The ladder is the ordinary path; **real-world hate or extremist content goes straight to 14 days, and a second time to closure**; vote-buying to 3 days; evading a suspension to closure. A rung's reason is one of the policy's lines, never free text to the player.

**Appeals:** one message of at most 500 characters per action (*Reply to the moderators*), read by an admin within seven days; the answer is a Letters row (*The moderators have read your reply. {upheld / lifted}*) or, for a closed account, an email.

### 5.4 Names

- **At sign-up and on every rename** the name is checked against the lists (§5.6) after folding: lower case, diacritics removed, leet folded (`0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s, |→l`), repeated letters collapsed, spaces and punctuation removed for the match. Refused with ***That name can't be used. Try another.*** The 2–40 rule (§7.3) stands.
- **Impersonation**: the names of every NPC in content (the secretaries, patrons, local candidates, deputies), *moderator*, *admin*, *editor*, the mastheads and the paper names are refused as a whole word or as the whole name.
- **Change your name** (the Me tab, screens §4): **once every 30 days**, free; the HUD, lists, the count and the ledger show the new name at once; **editions already printed keep the old one** (a newspaper is a record). A player who was renamed by a moderator may still use their own change.
- **A forced rename**: a moderator marks the account; the next sign-in shows the rename sheet before anything else with the reason (*It breaks the rule on real-world politics* / *It matches a name the game uses* / *It's abusive*); until it is done the name shows as *A Newcomer* (§7.3's fallback) everywhere. Accounts made before this slice are checked once by a migration and marked if they fail.

### 5.5 Closing an account (the player's own)

**Close your account** on Settings: a confirm sheet (*This closes your account for good. Your character and everything they own go with it. Type CLOSE to confirm.*), then signed out. The character is retired as under closure; **personal data (the name, the email, the device id, the sightings) is erased after 30 days** (a job), during which signing in again cancels it (*Welcome back. Your account is open again.*). Needed for any public beta; the privacy note says so.

### 5.6 The word filter

Two lists, **kept outside `packages/content`** (so the QA vocabulary guards never read them) in `packages/moderation/lists/`, reviewed by the user before the closed beta:

- **Refuse** (the line is not posted; ***That can't be said here.***; no echo of the word): slurs and dehumanising terms; the content-policy's real-world symbols, salutes, slogans and anthem lines (§7 of that review, in every spelling the folding catches); the names of real-world extremist parties and leaders.
- **Flag** (posted, and queued with a tag): patterns for vote-buying (*vote* / *back me* / *sign* within twelve words of *Iron* / *pay* / *bail* / *give*), any URL, a phone number, an email address, and a short list of harassment words that have innocent uses.

Names use the refuse list and the impersonation list. The filter is a pure function (`packages/moderation`, no I/O; tested against a fixture of allowed and refused strings, including the game's own vocabulary so that *strike*, *rally* and *gate* always pass).

### 5.7 The console (screens §9)

Route `/mod`, for users with `role: 'moderator' | 'admin'` (server-checked on every procedure; the role lives on the user, set by an admin in the console or by the seed for the first admin). Four pages: **Queue** (reports: *New · In review · Dealt with · No action*; the line, its context, the reporter's reason, the account's rung history; the ladder's buttons), **Audit** (§4.5), **Accounts** (search by name or email; the page: the character's public profile, the rung history, notes, links as *same device* / *same network*, the buttons: note, mute, suspend, close, rename, unlink, and *leave a note for other moderators*), **Log** (every action with who and why; exportable). Moderators may play; their characters are left out of every report and figure; **a moderator never acts on a report about their own faction's member alone**: such an item needs a second moderator or an admin (at two moderators this means the admin). The gate: **the queue's median time to first action under 24 hours** through the closed beta (§9.4).

---

## 6. Onboarding polish (GDD §7.5, §3.7; the reviews)

### 6.1 The first-session funnel and its targets

Measured from `signup.form` to `paper.opened` on day 2, per cohort; the targets are what the slice-2 question (*does a brand-new player understand what to do in the first ten minutes?*) looks like in numbers.

| Step | Target share of sign-ups | Target time |
|---|---|---|
| The sign-up form submitted without an error | ≥ 90 % of those who opened it | — |
| The origin's three steps done | ≥ 92 % | under 2 minutes |
| The faction joined | ≥ 90 % | — |
| The welcome edition closed (*To the city*) | ≥ 90 % | under 1 minute on the paper |
| **The first result modal** | **≥ 85 %** | **median under 5 minutes from sign-up** |
| The second action (*Once more* or *Three more*) | ≥ 80 % | — |
| The welcome set complete (the secretary's modal) | ≥ 65 % on day 1 | — |
| Chapter 1 opened from Letters | ≥ 60 % on day 1 | — |
| The Out of Energy card seen | ≥ 50 % on day 1 | — |
| A second session on day 1 | ≥ 45 % | — |
| **Day 1** | **45 %** (§27) | — |

A step more than ten points under its target is a slice-9 fix, in this order: the words on the screen, the screen's layout, then the rule.

### 6.2 The *what do I do here?* pass

Every screen gets a **purpose line**: one Courier line under its kicker that says the screen's verb, shown **until the player's first act on that screen** (stored per screen on the character), then gone. In the paper's voice, at most 90 characters, never a system term. The lines (the screens document §11 has the full table): the city map (*Tap a place to see what you can do there. Your orders mark three.*), a place's sheet (*Each ticket is one thing to do here. Good odds means it usually comes off.*), the paper (*What changed since you last looked. One tap on anything underlined says what it means.*), the Me tab (*You, your record and your kit. Points to place wait here.*), the Faction tab (*The branch. Today's orders, the event board, who's here, and the room.*), the nation map (*Tap a town for the train. Your home and the capital are always in view.*), the council (*Who sits, what rule they're voting on, and when the next vote is.*), Parliament, the Dossier, the Wardrobe, the journey screen, the cells, the ward, the event page, Settings.

### 6.3 Empty states (every list, every tab)

Every list that can be empty says what fills it and where, in one line; nothing is ever a blank panel. Slices 6–8 wrote most of theirs (`slice-6-screens.md`, `slice-8-screens.md` §13); the slice-9 audit lists every list in the client and asserts a line exists, and adds the missing ones: the paper's *In Print* (never shown empty: the section is omitted), the Events board with nothing on (*Nothing on today. The branch's fixture is at the HQ; from Rank 3 you can call one.*), Members in a branch of one (*Just you, for now. The branch's volunteers fill the rest.*), the Scoreboard (*Nobody has moved opinion this week yet. A canvass is +0.05.*), Chat (*Nobody's said anything yet. Say hello.*), Letters (*Nothing waiting. Chapters and patrons' letters land here.*), the Dossier (*Nothing on anyone yet. Watch and listen to begin.*), Legacy (*Nothing yet. Your first council term goes here.*), the law book (*No law in force. Parliament votes on {weekday}.*), the count between elections (*The next election opens on {weekday}.*), the nation map below Level 10 (*The train opens at Level 10.*), the journey screen with no card (*Nothing on the way. Arrives at {time}.*).

### 6.4 The help-note audit

Every dotted label has a two-line note (review 1 §5; slices 3–8 added theirs). A QA test enumerates every `HelpButton` label in the client and asserts a note in `copy.ts`; the designer reads every note once more against §1.5 (no system term) and against its rule (the number in it is the GDD's). New notes for this slice: **Settings**' five labels, **the audit** (*After a national count the moderators have a day to check the ballots. Votes cast twice by one person are set aside; the result is confirmed the next morning.*), **Change your name**, **Close your account**.

### 6.5 The tutorial audit

There is no tutorial screen and this slice adds none (§7.5). The audit plays the welcome day as each faction on a 360 px phone, a 390 px phone, a phone held sideways and a 1440 px desktop, and checks: eleven taps to the first modal; every order title says what and where; the first pin's sheet is open on landing; the ticket's three tags (the odds word and the stat, the order's progress, *First day*); the result's receipt; the secretary's modal; the Letters row's dot; the Out of Energy card's two promises; the day-2 paper's *Yesterday*, the wage and Rank 2; **nothing is explained before it is needed and nothing needed is unexplained** (the §8.3 list of `slice-2-onboarding.md` stands: Rested, Reputation, the boundary and the other cities explain themselves). Every string on that path is read once more for §1.5.

### 6.6 *While you were away* (GDD §3.3, §4.2; deferred since slice 3)

Built now. After **two or more City Days** away the paper opens with a **While you were away** row above the headlines: *{n} days. {The republic's one line}. {Your city's one line: an election counted, a rule in force, the morale word}. {Your branch's one line: events, a seat won}. {Yours: the wage banked ({iron} Iron), Rested {n}, letters waiting}.* Four lines at most, each from the existing paper templates; a tap opens the full digest (the editions missed, folded by day). After **30 or more days** Rested is **filled to the cap** at the first read (the §4.2 promise; the returning chapter stays post-MVP) and the row's first line reads *Welcome back.* Being away costs opportunity, never assets; the row shows what was banked, not what was missed.

### 6.7 Small fixes from the reviews that are still open

Checked against the review notes and the slice-4 QA report: the phone-landscape layout (review 2 #3, built in slice 2's fix round) is re-tested on every slice-5–8 screen; the map recentring (review 1 #7) is re-tested with free zoom; every Energy button says what it does and what it costs (review 3); every election screen has its hall; the *How elections work* note is one tap from every count. Anything found is a slice-9 fix, not a design change.

---

## 7. Accessibility (WCAG 2.2 AA)

Targets, with the criterion in brackets; the screens document §2 has the Settings sheet and §13 the per-screen notes.

| Target | Rule |
|---|---|
| **Contrast** (1.4.3, 1.4.11) | Ink on paper ≥ 7:1; paper-3 (the muted Courier lines) ≥ 4.5:1 on paper and paper-2; the failure colour ≥ 4.5:1; the faction colours as text ≥ 4.5:1 (the Alliance blue and the Collective red are checked against paper; the Vanguard's gold is never text, only a mark). Stamps and bars have an ink edge, so a bar's fill is never the only cue. **The night maps:** pins carry a paper plate behind the number so the target reads at night; **Map at night: as the clock says / always daylight** on Settings for anyone who finds the night art hard to read (cosmetic; night rules still apply) |
| **Colour alone** (1.4.1) | A faction is never colour alone: the small mark (square, circle, triangle) and the name go with the colour everywhere (the share bar's segments carry the mark; the scoreboard's rosette has a number). Success and failure are stamps with words. The three colours are **tested under deuteranopia, protanopia and tritanopia simulation** in the dev viewer: black-and-gold, red and blue stay apart under all three; the Issue momentum bars use the marks |
| **Text size** (1.4.4, 1.4.12) | Every screen works at **200 % browser zoom** and with **Text size: large** (+20 % on body and Courier; Playfair unchanged); nothing clips; the receipt and the ticket reflow |
| **Reduced motion** (2.3.3) | Already: the clouds stand still, the day–night fade is instant, sheets fade, stamps appear, the map zoom is a cut. Added: **Motion: as the device says / reduced** on Settings so a player can turn it on without a system setting; the journey's progress bar fills without easing; no animation anywhere runs longer than 350 ms with motion on |
| **Target size** (2.5.8; the plan's 44 px) | Every tap target **≥ 44 × 44 CSS px** (the AA minimum is 24; the game's rule is 44): pins (spread apart under 46 px, maps-v3 §11), tickets, rows, chips, the tram and quarter bars (44 px high), the four reasons, the ladder's buttons. A QA Playwright check measures every interactive element's box on the standard screen matrix |
| **Keyboard** (2.1.1, 2.4.7, 2.4.11) | Everything reachable by Tab in reading order; focus visible as a 2 px ink ring with a paper gap; a sticky bar never obscures the focused element; the map's keyboard route is the **Places list** (pins are buttons too, with names); sheets trap focus and close on Escape; the result modal's first focus is *Continue* |
| **Screen readers** (1.1.1, 1.3.1, 4.1.2, 4.1.3) | `lang="en-GB"`; every picture has its alt text (written per slice); the map's art is decorative (`aria-hidden`) and the pins are a named list; **gauges** (Energy, XP, Party XP, Health, the share bar, Issue momentum, the party's target) are `role="progressbar"` with a name and `aria-valuenow`/`-valuetext` in words (*Energy 70 of 100*); stamps read as text; the odds word and the stat are text; the receipt is a list; a modal's result is announced once (a live region on the stamp); the Today strip is a description list; tables (the count) are real tables with headers |
| **Forms** (3.3.1–3.3.3) | Sign-up errors under the field in words (built); the rename, the report and the feedback form the same; nothing times out |
| **Timing** (2.2.1) | No interaction is timed except the run-in's five-minute window, which **falls to luck, not to a loss** (a game rule, the essential exemption); journeys and elections resolve without the player |
| **Pointer** (2.5.1, 2.5.7) | Pinch-zoom and drag on the map have single-pointer equivalents (the zoom buttons, the Places list, a tap on a pin); long-press report has the row's button |
| **Language** (3.1.5 as a target, not a criterion) | British English, plain words (§1.5); period words live in nouns; the reading level of every player-facing string is checked once by the designer |
| **Consistent help** (3.2.6) | Settings, the policy and *Tell us how it's going* sit in the same place on every screen (the Me tab's foot) |

A CI job runs **axe** over every route and sheet on the matrix (360 × 640, 375 × 667, 390 × 844, landscape, 1440 × 900) and fails on any serious or critical issue; the designer's manual pass uses VoiceOver on a phone and NVDA on desktop once before the closed beta.

---

## 8. Performance budgets

Measured on a Pixel 7 profile at 4G (165 ms RTT, 8.1 Mbit/s) with a 4× CPU slowdown, and on a 1440 × 900 desktop, as ADR 0024 measured the maps; recorded by a `pnpm report:perf` run in CI (Lighthouse CI with budgets, plus the Playwright byte counters already in `arrival.spec`). Each budget has a floor the slice meets and a target for launch.

| Budget | Must (closed beta) | Target (launch) | How |
|---|---|---|---|
| **First view** (the paper for a returning player; the sign-up form for a new one): LCP at 4G | ≤ 3.0 s | ≤ 2.5 s | the SPA's first route; the paper's masthead is text; the welcome scene lazy |
| **Interaction** (a tap to its modal): INP; the API's p95 for an action | INP ≤ 200 ms; p95 ≤ 400 ms locally, ≤ 800 ms hosted | p95 ≤ 250 ms hosted | one conditional update per action; the modal renders from the response |
| **JS** gzipped: the first route; the whole app | ≤ 250 KB; ≤ 900 KB | ≤ 200 KB; ≤ 750 KB | route-level code splitting (the map, the chat's socket client, the console and the dev panel split off); no moment or lodash; Radix only where used |
| **Fonts** | ≤ 220 KB for the four families' first weights | ≤ 160 KB | subset to Latin-1 + the game's accents; `font-display: swap`; Playfair and Oswald variable, Source Serif variable, Courier Prime regular and bold only |
| **The first session's art** (sign-up to the first modal, `/art/` bytes; ADR 0015, the still path) | ≤ 1 MB (as guarded) | ≤ 800 KB | the welcome scene at 640 on phones; the still at 1024 before tiles |
| **A city's first view with tiles** (ADR 0024 R1) | ≤ 500 KB | ≤ 450 KB | the AVIF q55 pyramid (maps-v3 §9.2); the 150 ms detail settle; DPR capped at 2 |
| **A zoom to a place** | ≤ 1.1 MB | ≤ 900 KB | the same; the detail level fetched once |
| **Decoded images in memory** on a phone | ≤ 80 MB | ≤ 60 MB | one map mounted at a time; the night layer unmounted after its fade; scenes at 640 on phones |
| **The day job** at the boundary | ≤ 60 s for 1,000 characters and five cities; the paper of a settled character readable within 5 s of the boundary | ≤ 30 s | lazy settlement per character (ADR 0017) with the world job first |
| **The socket** | reconnect within 5 s; lines missed during a gap come from history | — | slice 6 as built |
| **Crash-free sessions** | ≥ 99 % | ≥ 99.5 % | Sentry's figure |

Anything over its *must* is a slice-9 fix; anything over its target is a launch note.

---

## 9. The beta plan

### 9.1 Shape

| | Closed beta | Open beta |
|---|---|---|
| **Who** | invited by code: **150–300 accounts** (60 is the floor at which the funnel and pacing read; 150 reads D7 to about ±8 points; 300 to ±5), in **three waves a week apart** so that cohorts land on different days of the council cycle; the three factions courted equally; a third on phones at least | anyone; sign-up open, the caps of §4.1 on |
| **How long** | **six weeks** (two terms): every wave's day-30 cohort completes inside it, and one national count runs the audit for real | **the rest of season 1** (to the Season Election and the rollover), then launch; at least 60 days |
| **The clock** | the real clock; no test hooks (`NODE_ENV=production` refuses them); the slice-3 boost script lifts **six testers (two a faction) to Rank 3 and *Known*** on day 1 so that seats are contested in week 1 and the office ladder gets a Governor by week 3; nothing else is seeded beyond the NPC fill | nothing boosted; the closed beta's characters stay |
| **Moderators** | the user as admin and at least one moderator; the lists reviewed before the first invite | two moderators at least; the queue gate |
| **Feedback** | the in-game form weekly (§9.3) and a channel outside the game (the user's choice: a Discord or email) | the form |
| **Hosting** | Part B done (§10); the socket on the API subdomain; tiles on R2; Sentry live | the same; Atlas above M0 if change streams or the day job need it |

### 9.2 The checklist: every slice's question in one list

Each line is read from the dashboards and the form; the closed beta's report answers all nine.

| Slice | Question | Read from |
|---|---|---|
| 0 | Does the pipe work, tap to database to modal? | crash-free sessions; the action's p95; no idempotency duplicates in the logs |
| 1 | Is spending a bar of Energy fun, and do players come back in three hours? | sessions per player-day ≥ 2.5 median; the hours between sessions (a mode near 3–6); Energy spent per player-day near the profile's bar count × 100; the form's Q1 |
| 2 | Does a new player understand what to do in the first ten minutes, without a tutorial? | the funnel (§6.1): the first modal ≥ 85 % under 5 minutes; the welcome set ≥ 65 %; `help.opened` on day 1 under three a player (fewer taps for meaning is better) |
| 3 | Does the first vote, and the first seat, feel like a big moment? | voted in the last 5 days ≥ 50 %; the first seat's median day 14–30; the form's Q2; the return rate the morning after a count against an ordinary morning |
| 4 | Do players choose to move to the capital, and does the three-way fight feel alive? | share living in a battleground 30–50 % at day 30; journey dwell; district meters moving every day; the Issues' momentum split across three parties |
| 5 | Is risk exciting rather than punishing? | the loss rate on *Leave it to luck* ≤ 60 %; the return rate the day after being taken in within 10 points of the ordinary rate; marks per illegal player-week 0.5–2; the form's Q3 |
| 6 | Do players feel part of a team, and do they come back for the group's events? | D7 joined an event ≥ 40 %; the return rate after a sign-up above the rate without by 10 points; fill rate ≥ 50 %; chat posted by ≥ 30 % of D7 |
| 7 | Does holding office feel powerful, and does losing it make players want to fight back? | offices held by players rising each term; the return rate the week after losing a seat within 10 points of the week before; petitions and removal votes opened; the form's Q4 |
| 8 | Do players have goals for the next month, not just the next session? | the share with an unfilled clock at day 14 against their day-21 return (slice 8's measure); flats bought; Favour tiers reached; the form's Q5 |
| **9** | **Are day-7 and day-30 within reach?** | **§9.4** |

### 9.3 The feedback form (*Tell us how it's going*; screens §8)

On the Me tab's foot at any time; the paper prompts it **once a week** (a Letters row on the player's seventh, fourteenth, twenty-first and twenty-eighth day) and once more on the day after a first seat. Five questions on a 1–5 row of stamps (*Not at all* … *Very much*) and one free line of at most 500 characters:

1. *Spending your Energy is fun.* (slice 1)
2. *You know what to do when you open the game.* (slice 2)
3. *Elections matter to you.* (slice 3)
4. *A run-in or the cells is exciting rather than annoying.* (slice 5)
5. *You've something you're working toward this month.* (slice 8)
6. *What would make you come back tomorrow?* (free)

The scores land in `telemetry` (`feedback.sent`); the free line in `feedback` (read in the console; 90-day TTL; the filter's refuse list applies). The report prints the mean per question per week against the slice's line in §9.2.

### 9.4 The gates

**Closed beta → open beta** (all must hold on the closed beta's last fortnight, testers out):

| Gate | Threshold |
|---|---|
| Day 1 (classic) | ≥ 40 % |
| **Day 7 (classic)** | **≥ 30 %** (the §27 target is 38; a closed beta of invited players with half the content polish reads a little under) |
| Day 30 (classic, the first two waves) | ≥ 15 % |
| Sessions per player-day | median ≥ 2.5 |
| Voted in the last 5 days | ≥ 50 % of DAU |
| The funnel's first modal | ≥ 85 % under 5 minutes |
| Crash-free sessions | ≥ 99 % |
| Open P1 bugs | none for seven days |
| The audit | ran on one national count; its page was used; no set-aside was disputed |
| The queue | median time to first action under 24 hours |
| Performance | every *must* of §8 met on the hosted build |
| The economy | every red flag of §3.4 either clear or moved inside its bound |

**Open beta → launch:** D7 ≥ 35 %, D30 ≥ 20 %, no faction over 45 %, one Season Election run with its rollover, the moderation queue under 24 hours through the season, and the user's say-so. **Within reach**, the slice's answer, is: D7 at or above 30 in the closed beta *and* rising wave on wave, with D1 at 40 or more; below 25 on the last wave the answer is no and the levers of §3 and §6 run again before the open beta.

---

## 10. Part B: the launch checklist for the hosting step

Everything earlier tech designs and ADRs deferred, in the order it is done. The owner is who acts; the source is where the item was recorded. Nothing here is built locally; the slice's local work must not depend on any of it.

| # | Item | Owner | Source |
|---|---|---|---|
| 1 | **GitHub remote** with Actions on; CI green on main (`lint`, `typecheck`, `test`, `e2e`, `art:check`, `report:perf`, axe) | user, developer | `docs/tech/slice-0.md` §18 |
| 2 | **A domain**: `play.<domain>` (client), `api.<domain>` (API, same site), `tiles.<domain>` (R2); this is ADR 0001's **option B**, now required because the chat socket cannot pass a Vercel rewrite | user | ADR 0001, ADR 0038, `slice-6.md` §8.5 |
| 3 | **MongoDB Atlas**: the cluster (M0 to start; **verify change streams on the tier**, or go to M10), a database user, the network allow list for the API's egress, backups on, `MONGODB_URI` with `retryWrites=true&w=majority`; the term epoch is a code constant and needs nothing (ADR 0043) | user, architect | `slice-0.md` §12, §18; ADR 0038; `slice-7.md` §21 #1 |
| 4 | **The API and the worker** on Railway or Fly: two services from `apps/server/Dockerfile` (`node dist/index.js` with `/healthz`; `node dist/worker.js`), env from `env.ts` (`NODE_ENV=production`, `DB_MODE=mongo`, `BETTER_AUTH_SECRET`, `PUBLIC_ORIGIN=https://play.<domain>`, `SENTRY_DSN`, the moderation salt, the first admin's email), `trustProxy`, the health check path; **the worker is a real second process** (quiet cities are only counted by it) | user, developer | `slice-0.md` §12, §18; `slice-3.md` §20 |
| 5 | **The client on Vercel**: root `apps/client`, Vite; `vercel.json` with the `/api` rewrite **removed** under option B (the client calls `api.<domain>` directly; Better Auth's cookie on `Domain=.<domain>`, `SameSite=Lax`, `Secure`); the SPA fallback; the `/art/` immutable cache header; preview deploys on branches with `trustedOrigins` for `*.vercel.app` or previews pointed at a staging API | user, developer | ADR 0001, ADR 0007, `slice-1.md` §12 |
| 6 | **The socket**: Socket.IO on the API origin, `transports: ['websocket']` (no sticky sessions); one change stream per API instance; tested from the hosted client | developer | ADR 0038 |
| 7 | **Tiles on R2**: the bucket, `tiles.<domain>` on Cloudflare, `pnpm art:publish` (S3 API, credentials from the environment), `VITE_TILES_ORIGIN` set, the stills as the fallback; the repaint rule (a repainted master gets a new asset id or file name) | user, developer | ADR 0024; `maps-v3-integration.md` §8 Q2, §9.2 |
| 8 | **Email**: a transactional provider (password reset, the appeal's answer, the closure notice); Better Auth's reset flow pointed at it; a sender address on the domain | user, developer | new (Better Auth's email/password needs it in production) |
| 9 | **Sentry**: two DSNs (server, client), release tagging from the git SHA, alerts on error rate and on the day job's lateness | user, developer | `slice-0.md` §12 |
| 10 | **Seed and bootstrap**: `pnpm seed` once against Atlas; the worker's start-up bootstraps every city's world and today's fixtures; the nation's term 0 government; **the first admin** from the environment; the moderation lists loaded | developer | ADR 0017; `slice-3.md` §20; `slice-6.md` §7.3; `slice-7.md` §21 #18 |
| 11 | **Test hooks off**: `E2E_TEST_HOOKS` refused outside memory mode (built); the dev panel not registered in production; the **boost script** runs as an admin script against Atlas for the six seeded testers | developer | `slice-3.md` §1181, §20; every slice's "Test hooks in production" row |
| 12 | **Rate limits and caps live** (§4.1) at the API; a CSP with `img-src` for `tiles.<domain>`; HTTPS only; HSTS | developer | ADR 0024 §91 note |
| 13 | **The policy, the terms and the privacy note** published at `/policy`, `/terms`, `/privacy` and linked from sign-up and Settings (the one essential cookie and the device id named; the 30-day network data; the 30-day erasure; **16+**, or the user's choice) | user (text), designer | §5.1, §5.5 |
| 14 | **The maintenance screen** wired to a deploy flag (*The presses are stopped. Back at {time}.*); a rollback plan (the previous image; migrations are idempotent and additive) | developer | screens §12 |
| 15 | **Smoke on the hosted build**: sign up on a phone, the first modal, a ballot, a journey, a chat line between two accounts over the socket, a report in the console, the day job at the first boundary, Sentry receiving, the perf report's *must* column | QA | §8, §9.4 |
| 16 | **The closed beta's invite codes** and the three waves' dates; the moderators' accounts and roles; the feedback channel outside the game | user | §9.1 |
| 17 | **Monitoring in the first week**: the day job's duration, the API's p95, the socket's reconnects, the audit's page on term day 27, the queue daily | user, developer | §2.3 Health |

Items 2, 3, 7, 8 and 9 need the user's accounts; nothing else needs anything that is not in the repository.

---

## 11. Session shape (pillar 7)

Nothing in this slice adds a tap to play. A report is two taps; a rename three (once a month); Settings is one tap per line and remembered; the feedback form is seven taps once a week, optional; the purpose line is read, not tapped, and leaves on its own; *While you were away* is one row and one optional tap. The audit, the links, the caps and the filter act on the server and ask nothing of anyone. A suspended player's timers run; a closed account's character is retired, never destroyed by the clock. Nothing requires being online at a set time.

---

## 12. GDD edits made in this change

| Section | Edit |
|---|---|
| §0 | A change row for the slice-9 design |
| §1.5 | The slice-9 plain-words row |
| §3.3, §4.2 | *While you were away* built in slice 9 after two days; Rested filled after 30; the returning chapter post-MVP |
| §7.3 | The name filter, impersonation, *Change your name* once every 30 days, the forced rename and *A Newcomer* |
| §14.2 | The opinion damping factor (Appendix C #13 closed) |
| §15.2 | Linked accounts (L1–L3, the household rule), ballots and backings counting once, the audit's three steps and self-confirmation, the council recount, the sign-up caps, the favours' guards |
| §16.2 | Moderation in slice 9: the four reasons, the filter, the ladder, the console, the queue's gate |
| §25 | A scope row: moderation, anti-abuse and telemetry at launch |
| §26 | The chat-moderation and multi-accounting rows name the slice-9 rules |
| §27 | The measurement definitions (a player-day, a session, classic and rolling), the beta gates, and the note that testers are left out |
| Appendix C | #7 closed (the moderation policy), #13 closed (damping); new #82–#88 |

---

## 13. Questions for the architect (each with a default)

1. **Telemetry storage.** Default: `telemetry` (TTL 180 days, indexed on `{ kind, dayKey }` and `{ characterId, at }`), written by a `track()` helper called inside the services after a transaction commits (fire-and-forget, never in the transaction, never blocking a response); `playerDays` upserted at most once per account per ten minutes (a per-process memo keyed by account and ten-minute slice) from the auth context; `cohorts` by the day job. The report: `pnpm report:metrics`, a pure builder in `packages/db/src/metrics.ts` with fixture tests, the same shape as `report:playtest`; the dev panel's Metrics page and the console's Metrics page render its output.
2. **Network data.** Default: `networkSightings` with a 30-day TTL, written by the auth context on the first request of each session slice; the salt a server secret rotated by the day job every 30 days (two salts live during the switch); the device cookie `igc_d` set by the API on `/healthz`'s sibling `/api/hello` or on sign-up, HttpOnly, `SameSite=Lax`, one year.
3. **Links.** Default: a daily `links` job in the worker (and the same function at every count) computing L1–L3 into `accountLinks { a, b, kinds[], evidence, since, until, unlinkedBy? }` and the sets as connected components at read; the count's set-aside filters ballots by set in the count function (`packages/rules` gets `collapseBySet(ballots, sets)` so it is tested).
4. **The audit.** Default: `audits { electionId, ranAt, setAside[], notes[], confirmedAt, confirmedBy: 'auto' | userId }`; the national count's job writes it with the provisional result; the day-0 job confirms it; a moderator's confirm, set-aside, unlink and recount are tRPC mutations on an `admin` router gated by role; the recount reuses the count function with the extra set-asides.
5. **Roles and the console.** Default: `users.role: 'player' | 'moderator' | 'admin'` (Better Auth's additional fields); the console is the same SPA at `/mod` with the routes split into their own chunk, every procedure under `admin.*` checking the role on the server; `moderationLog` as its own collection, append-only.
6. **Mutes, suspensions, closures.** Default: `users.moderation { rung, until, reason, history[] }`; the auth context refuses play procedures for a suspended or closed user with a typed error the client turns into the screen; a mute is checked by `chat.post` and `feedback.send` only; closure's retirement is one transaction (offices, candidacies, the `retired` flag) and the erasure a 30-day job.
7. **The filter.** Default: a new `packages/moderation` (pure; `check(text): 'ok' | 'refuse' | 'flag'`, `foldName(name)`, the lists as JSON outside content), used by `chat.post`, sign-up, rename, the report's free line and the feedback form; the QA vocabulary guards do not read its lists.
8. **Renames.** Default: `characters.name` updated with `renamedAtDay`; `paperEntries` are not rewritten (editions are a record); every live view reads the character's name; the forced rename is `users.moderation.renameRequired` checked by the client's root route.
9. **Damping.** Default: `cities.active7` (and per district) written by the day job from the ledger's distinct contributors over seven days; `swingFactor(active)` in `packages/rules`; applied in the opinion write of ADR 0022 and recorded on the ledger row as `damped`.
10. **The digest.** Default: `While you were away` is built at read from the missed editions' entries (`paperEntries` by day) and the live political rows, folded by the templates' priority; nothing stored; the 30-day Rested fill is a flag on the character's settlement (`awayFilledDay`).
11. **Settings.** Default: `characters.settings { motion, textSize, mapNight, clouds, chatHidden }` (chat's hidden flag moves here from `chat.hidden`), unversioned like mutes; applied by the client as data attributes on the root; the server reads none of them.
12. **Performance and accessibility in CI.** Default: Lighthouse CI on the paper, the city and the sign-up form with the §8 budgets; axe through Playwright on every route in the matrix; `report:perf` prints both; a budget over its *must* fails CI, over its target warns.
13. **Account closure.** Default: `auth.closeAccount` (typed `CLOSE`), `users.closingDay`; the erasure job after 30 days replaces the name on the character with `A former member`, drops the email and the sightings, keeps the character document (retired) for the world's integrity (ledger rows, old counts).
14. **The beta's seeded testers.** Default: the slice-3 admin boost script, run by hand against Atlas, flags the six as `boosted` so the report leaves them out of retention and pacing but keeps them in the political rows.

---

## 14. Content-policy check

- The moderation lists contain the very strings the content policy bans; they live **outside `packages/content`** and are never rendered, never echoed in a refusal, and never in telemetry. The QA vocabulary guards do not read them; a fixture test in `packages/moderation` asserts that every string in the game's own vocabulary (every title, order and headline from content) passes the filter, so a canvass at the Fortress Gate is never refused.
- No player-facing string in this slice uses *ban*, *cheat*, *alt*, *multi*, *flag*, *abuse* as a verb about a player, *troll* or *toxic*; the words are *muted*, *suspended*, *closed*, *set aside*, *a note from the editor*.
- The console's own words (a moderator's screen) may say *linked* and *set aside*; they never say *cheater*.
- Nothing in this slice adds a Vanguard string. The suspended and closed screens reuse `court.png` and `station.png`, which carry no symbol.

---

## 15. Art needed

**None new is required.** Reused as they are: `court.png` (the suspended screen), `station.png` (the closed screen and the maintenance screen: the last train, the presses stopped), `newsroom.png` (a note from the editor; the feedback form's header), `ministry.png` (the console's header, never seen by a player). The Settings sheet is paper and type.

Optional, if the user wants the audit to have a face: `scene.count-room` (a town-hall back room at night, a long table of ballot boxes under a lamp, a returning officer with a ledger, no faction colour), 2688 × 1520, noir lithograph as `mvp/scenes`; it would head the Audit page and the paper's day-0 *confirmed* line. Alt: *A returning officer in shirtsleeves at a long table of ballot boxes, a ledger open under a lamp, the town hall's back room dark around him.*

---

## 16. Points for the user (each with the default this document takes)

1. **Telemetry stays in our own database for the betas** (§2.1), no PostHog. Default: **ours**; the report and the console read it. The alternative adds a third party and a privacy line before the game has a single user.
2. **The closed beta is 150–300 invited accounts over six weeks in three waves** (§9.1); 60 is the floor. Default: **as written**. Smaller reads only the funnel and pacing, never day 7.
3. **Linked accounts' ballots count once, silently, and the only public sign is the count's aggregate line** (§4.4). Default: **yes**. The alternative refuses the second ballot at the tap, which tells a household it is suspected and tells a ring exactly where the line is.
4. **The audit confirms itself at day 0 if no moderator acted** (§4.5). Default: **yes**, so the republic is never without a confirmed government. The alternative holds the result until a human clicks, which at two moderators means a government seated late.
5. **The opinion damping factor is built now and is the identity below twenty contributors** (§3.3). Default: **built**. The alternative waits for the open beta to show a runaway meter and changes a rule mid-beta.
6. **A player may change their name once every 30 days, free; printed editions keep the old name** (§5.4). Default: **yes**.
7. **Moderators: the user as admin plus at least one moderator; moderators may play; a report about a moderator's own faction needs a second pair of eyes** (§5.7). Default: **as written**. Who the second person is, is the user's.
8. **Closing an account erases personal data after 30 days and retires the character** (§5.5). Default: **yes**; a public beta needs it.
9. **The policy's age line is 16+** (§10 #13). Default: **16+** with the chat; the alternative is 18+, which matches the fact sheet's audience and shrinks the beta.
10. **Settings has five lines** (§7): Motion, Text size, Map at night, Clouds, Chat. Default: **five**, no more; a high-contrast theme is a later option if the contrast pass finds a need.
11. **The gates** (§9.4): D7 ≥ 30 % in the closed beta to open; D7 ≥ 35 % and D30 ≥ 20 % to launch. Default: **as written**, a little under §27's 38 / 22 for an unpolished beta; the user may hold the line at 38 / 22.
12. **The optional count-room scene** (§15). Default: **not drawn**; the audit's pages use type and the court scene.
