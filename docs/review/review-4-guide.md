# Review 4: what we have, how to look at it, and what comes next

Prepared 4–5 Oct 2026. **Slice 5 is finished**: built (`b271ed4`, `f6bb49e`, `de4417d`), checked by QA (`docs/qa/slice-5-report.md`: no blockers, 1 major, 9 minor, 12 nits) and fixed (`a9e7390`). Every check is green: about 1,700 unit and integration tests and 124 browser tests. The work is stopped here until you have reviewed.

**Screenshots** (phone, 390 × 844), in `docs/review/review-4/`:
- `slice5-screens.jpg`: the home overview, a mission briefing, a mission result, a run-in, paying off an enforcer, the cells, a rival town's plate, put on the train home.
- `slice5-fix-round.jpg`: the same screens after QA's fixes (shorter tickets with tag chips, the shorter briefing, the run-in result in plain sentences, *Released*, the record cards, the rival plate on a short phone, the Me tab's Heat and record rows, the infirmary).
- `slice4-fix-round.jpg`: the capital overview with all five district names, the ballot, a district on a sideways phone, sign-up with 18 faces.

**What QA's fix round changed that you will notice**
- A tap sent twice (a network retry) can no longer start a mission twice; every keyed action now checks its key inside the transaction.
- *Infirmary* and *Police* replace *HOSPITAL* and *JAIL* on place sheets.
- Mission briefings are at most 300 characters; mission tickets keep to four lines, with extra tags as small chips underneath.
- The run-in result tells you what you did in one or two plain sentences (*You tried to run; they were faster. You fought and lost.*), and names a place to train.
- The record shows its level word (*On file · −10 % Iron*), and a card appears the first time you reach each level.

**Things I would look at closely** (my own notes from the screenshots)
- Tickets are dense: an action ticket can carry the Issue, the first-day bonus, the record and the odds. Is it still readable at a glance?
- After a run-in you lost, the mission's own row reads *Success · dropped: you lost*. Correct by the rules (the work went well, the run-in spoiled it), but it may read oddly.
- The Vanguard posters in the briefing text read *ORDER AND BREAD* (the party's fictional slogan). Check you are happy with the Vanguard's voice.

---

## 1. Starting the game

```
pnpm dev:mem
```

Open <http://localhost:5173>, sign up with any test email, pick a face and answer the arrival questions. Everything runs on your machine; nothing is hosted.

The **Dev** button (dashed amber border, right edge, half-way down) opens the test clock and shortcuts (section 4). The clock it moves is shared by everyone on the local server and only goes forward; restart `pnpm dev:mem` to start over.

---

## 2. What is in the game now (slices 0–5)

**Signing up and arriving (slices 0–2)**
- 18 faces to choose from, in the noir style; a short set of arrival questions puts you in a party (Iron Vanguard, Red Collective, Civic Alliance) and a home city (Duskwall, Coalport, Ashford).
- The first session: the home city on its painted map, places with pins and a Places list, one-tap actions (canvass, speeches, training, jobs), Energy, XP, Iron, Party XP and Rank.
- The result modal after every action, the party's daily orders, the *Finish His Work* story's first chapters, and the Morning Paper each day (each party has its own paper; the Herald is the neutral one).

**The first vote (slice 3)**
- Each home city has a council elected on a five-day cycle: nominations, polls, the count. Players stand and vote; local candidates (non-player stand-ins) fill the seats nobody stands for.
- The council passes one ordinance (a council rule) that changes the game in that city.

**The battleground (slice 4)**
- Trains between cities, with things that happen on the way (cards you answer on the train or on arrival).
- **Irongate, the capital:** five districts on one huge map. The overview shows only the district outlines and names; tapping a district zooms in and locks you to it, with its edges outlined and the rest dimmed.
- Living somewhere: register your residence, rent a room, move (not while your name is on a ballot).
- The capital's ten-seat council, counted three ways (turnout, seats by share, local candidates fill the rest), Issues of the Week, close races and comebacks, the influence ledger (who moved the capital).
- The ground sash: a diagonal band in the faction's colour across a place's picture, showing whose ground it is.
- Clouds and fog drifting over the city maps; day and night maps.

**Risk (slice 5)**
- A second quarter in each home city, opening at Level 6, with its own outline on a home-city overview.
- **Missions:** 22 harder jobs (speeches, watching, posters, sabotage, theft) with a briefing and a choice of way; the game remembers the way you used last time.
- **Heat** (how much attention you draw), **Health**, and a **record** (marks that fade if you keep quiet).
- **Street run-ins:** sometimes someone stops you (an enforcer, a picket, a party heavy, the police). One choice: Fight, Run, Talk your way out, or Pay them off. If you don't choose within five minutes, luck decides.
- **The cells and the infirmary:** lose to the police and you spend a short time in the cells (bail, or wait it out); lose a fight and you end up on the ward. Being away never costs you anything you own.
- **Rival ground:** from Level 10 you can take the train to a rival party's home town. Work there pushes against them, pays more Party XP, and is riskier; you can be sent home on the next train.

---

## 3. A review walk-through (about an hour)

Each step says what to look at. Note anything that feels wrong, slow, unclear or ugly, in your own words, the way you did for reviews 1–3.

1. **Sign up.** Faces: enough choice? Arrival questions: clear?
2. **The first ten minutes.** The home city map, Places list, a few actions, the result modal. Is it clear what to do next? Does the result screen read well (review 3's XP boxes and repeat buttons were redone)?
3. **The paper.** Open the Morning Paper. Is it worth reading?
4. **An election.** Dev panel → jump the clock to polls. Vote, then jump to the count. Does the election screen explain who is standing (players or local candidates) and how the vote works (review 3)?
5. **The capital.** Dev panel → Level 10, then take the train to Irongate. Overview (five names, no pins) → tap a district → locked view. Try on a phone-sized window too.
6. **Moving.** Register a residence in a capital district; rent a room; try to move while standing in an election (it should refuse, with a plain sentence).
7. **Missions** (slice 5). Dev panel → Level 6. Open the second quarter, pick a mission, read the briefing, choose a way. Look at the result.
8. **A run-in.** Dev panel → *Next run-in* → pick an opponent, then do a mission. Choose Fight, Run, Talk or Pay. Then try one where you wait: *Decide now* to let luck take it.
9. **The cells.** Dev panel → Heat 80 → *Next caught*, then a mission. Look at the cells screen, post bail or wait. Next morning (jump the clock): what does the paper say?
10. **Rival ground.** Dev panel → *Take me to a rival city*. Look at the warnings, the gated places, the plate. Work there and see the risk.
11. **Phone and desktop.** Repeat a couple of the above on a phone-sized window (390 × 844) and sideways.

---

## 4. Dev panel shortcuts

- **Clock:** next phase, polls, count, the next day, the next Monday (Issues), arrive now (trains).
- **You:** Level 6, Level 10, Rank 3, Energy, Iron, Party XP.
- **Risk (slice 5):** Heat 0/30/60/80 · Health full/half/10 · Record 0/2/4/7 marks · Next run-in (off, random, a chosen opponent) · Next caught · Cells now / Infirmary now · Release now · Decide now (let luck take a run-in) · Take me to a rival city · Lift the bar.

---

## 5. Decisions taken by default (for you to confirm or change)

These were taken so the work could keep moving. Each is easy to change now; harder once later slices build on them.

**Already in the game (slices 4–5)**
1. **No move while your name is on a ballot**; you can move after the result.
2. **Renewing a room adds seven nights** (up to 14 paid ahead).
3. **Rival ground opens at Level 10**, with the train (not at a Rank).
4. **No ×3 on rival ground**: every tap there is its own risk.
5. **A loss to the police is the cells**, not the infirmary.
6. **The record's middle level is called *On file*** (not *Known*, which the Reputation ladder already uses).
7. **The home-city overview** with district outlines was built for the second quarters.
8. **You only risk being caught when a mission doesn't go cleanly** (Partial or Failure), never on a clean Success.
9. **The civic police have no ranks**: the man at the desk is *the duty officer* (no *sergeant*).
10. **A run-in waits five minutes** for your choice, then luck decides.

**Coming in slices 6–9 (designed, not built)**: listed per slice in section 7. Nothing there blocks the build; flag any you want changed during this review and the designer updates the design before that slice is built.

---

## 6. Known open items (deliberately left)

- **Hosting** is deferred to the end of the project (your instruction): everything runs locally. Slice 9 holds the hosting checklist.
- **Tablets (1024 × 768):** one capital district name (Old Town) sits under the corner panel; the Districts list reaches it.
- **Phone first view** downloads more map data than the target; this is tuned at hosting time (map tiles on a CDN).
- **Art cap:** the game's committed pictures are 18.8 MB (fine locally); hosting serves them from a CDN.
- **QA leftovers:** map pins can sit under open overlays (allowed by review 3); on 360 px phones the risk line can wrap at a dot.
- **Faction names** are still parked (Iron Vanguard / Red Collective / Civic Alliance) until you decide.

---

## 7. The next slices

### Slice 6 · Together
*Question: do players feel part of a team, and do they come back for the group's events?*
- **Campaign Events:** Poster Night, Canvass Drive, Rally, Grand Rally, General Strike, Headline Story. A member (Rank 3+) calls one 1–12 hours ahead; others sign up for a role (or as a pair of hands) with one tap. Signing up is the commitment: the event happens automatically at its time, whether you are online or not. Each party's secretary also posts one event a day.
- **The Faction tab:** orders, the events board, members (with a favour button), the scoreboard, and chat.
- **Chat:** your party, your home branch and the capital branch; mute and report.
- **Who's here:** party members seen in the last ten minutes.
- **Favours:** post a mate's bail, visit them on the ward.
- *Defaults to check:* Rank 1 can join as a pair of hands; the daily event resolves at the day's turn; events pay no Iron; Political Capital from events halves after the first of the day; a visit costs 3 Energy from anywhere; chat ships with mute and report only.

### Slice 7 · The nation
*Question: does holding office feel powerful, and does losing it make players want to fight back?*
- **Terms of 28 days** with fixed windows for every vote (never a required online time; an absent office-holder's duties fall to a default).
- **Offices:** Governor/Mayor (the largest bloc's top councillor), the elected **Chair** of each party (sets real standing orders and the party line on bills), **60 deputies in Parliament**, and **the President** (one law a week, one veto, an Address).
- **Laws:** 13 laws, at most five in force, factional laws need 60 %. The law book; bills to propose and vote on in one tap.
- **Clearwater** becomes the second battleground (its own seven-seat council). **National Control** weights the cities (capital 40, Clearwater 30, each home 10).
- **Petitions** to dissolve a council; a vote to remove the President; a vote on a Chair.
- *Defaults to check:* the President only (no Chancellor); the party secretary always on the Chair's ballot; petitions dissolve rather than call a snap election; Clearwater's start evened between the parties; several offices at once allowed.

### Slice 8 · A life in the city
*Question: do players have goals for the next month, not just the next session?*
- **The Wardrobe** (from the inventory research): four plain slots (Coat · On you · Papers · Tools), item cards with one effect line and one button, outfits for situations (Town, Plain clothes, and Evening with a flat), shops as cards on existing places, keepsakes in their own drawer. No weapons as items.
- **The Dossier and Case Files:** intelligence work gathers entries on named people; three entries make a Case File; an **exposé** prints it (three steps) and hurts the name's party in their town.
- **Patrons:** Edith Crane (the press) and Julius Marr (the money): Favour, Requests, perks, a keepsake at the top.
- **The flat:** a home you pay rent for (if the rent runs out the flat simply waits; no debts).
- **Legacy:** a lasting record with perks to spend; *Finish His Work* chapters 4–12.
- **The Political Season:** 84 days (three terms), a season score, the Season Election, the Champion and awards.
- *Defaults to check:* no weapons; Crane and Marr as the two patrons; fixed outfit names; a failed exposé keeps its file; the flat is the only paid home; +100 season score per election won; Blackmail and Denounce held back.

### Slice 9 · Launch readiness
*Question: are the day-7 and day-30 retention targets within reach?*
- **Usage figures** (our own, first-party) and a dashboard per GDD §27 metric.
- **A balance pass:** a 48-run simulation of the first 30 days; one new rule (one party's crowd can't swamp a city's opinion).
- **Anti-abuse:** one account per person, linked accounts' votes counted once (quietly, at the count), a 24-hour election audit.
- **Moderation:** reports, a name filter, rename once every 30 days, mutes and suspensions (nothing a player owns is ever touched), a moderator console.
- **Polish:** *While you were away* summary, Settings (motion, text size, night map, clouds, chat), accessibility to WCAG 2.2 AA, performance budgets.
- **The beta plan:** a closed beta of 150–300 testers over six weeks, then open beta.
- **The hosting step** (only at the very end): a 17-item checklist (domain, database, servers, map tiles on a CDN, email for password resets, monitoring, policies).
